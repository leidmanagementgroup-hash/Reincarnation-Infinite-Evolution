/* Flussi economici dei mercati (Mega City Overhaul, Fase 3).
   Simulazione aggregata e deterministica, a passi di un giorno di calendario: nessuna transazione individuale
   lontana dal giocatore. Le professioni producono e trasformano merci, la popolazione le consuma, le rotte
   commerciali spostano le eccedenze verso i mercati in carenza e i prezzi nascono da scarsità e ricchezza.
   Le scorte restano nei mercati di `trade-economy.js` (fonte unica): questo modulo le modifica soltanto e tiene
   un registro esatto (BigInt in stringhe decimali) per verificare che nessuna merce nasca o sparisca. */
(() => {
  'use strict';

  const own=(o,k)=>o!==null&&o!==undefined&&Object.hasOwn(o,k);
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const canonical=v=>typeof v==='string'&&/^(0|[1-9][0-9]*)$/.test(v);
  const big=v=>BigInt(String(v));
  const minBig=(a,b)=>a<b?a:b;
  const hash=(...parts)=>{
    let h=2166136261;
    for(const ch of parts.join('|'))h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;
    return h>>>0;
  };
  const safeId=id=>typeof id==='string'&&/^[a-z][a-z0-9._:-]{0,95}$/i.test(id)&&!['constructor','prototype','__proto__'].includes(id);

  const maxCatchUp=120;      // giorni simulati al massimo dopo una lunga assenza: oltre, l'equilibrio è già raggiunto
  const maxShipments=300;
  const fields=['produced','used','eaten','unmet','spoiled','lost','external','imported','exported'];

  /* Professioni. `rate` è la produzione di un lavoratore al giorno in millesimi di unità. Le professioni con
     `uses` trasformano: consumano `uses` unità di materia prima per ogni unità prodotta. */
  const professions={
    farmer:{name:'Contadini',makes:{grain:1000,seeds:200}},
    herbalist:{name:'Erbaiuoli',makes:{herb:1000}},
    miner:{name:'Minatori',makes:{ore:700}},
    carpenter:{name:'Falegnami',makes:{work:500}},
    shepherd:{name:'Pastori',makes:{wool:900}},
    mystic:{name:'Cercatori di essenza',makes:{essence:250}},
    wellkeeper:{name:'Pozzaioli',makes:{water:2000}},
    baker:{name:'Fornai',makes:{bread:1000},uses:{grain:1}},
    alchemist:{name:'Alchimisti',makes:{potion:500},uses:{herb:2}}
  };
  /* Consumo giornaliero per abitante, in millesimi di unità. */
  const needs={water:150,bread:120,grain:40,herb:30,potion:25,ore:25,work:25,seeds:15,wool:25,essence:8};
  const luxury=new Set(['potion','essence','wool']);
  /* Deperimento giornaliero in millesimi della scorta. */
  const spoilage={bread:120,herb:50,grain:20,seeds:10,potion:10,wool:5,essence:2,water:0,ore:0,work:0};
  /* Identità economica di ogni mercato: abitanti, ricchezza di base (1000 = media) e lavoratori per professione. */
  const traits={
    vela:{people:10,wealth:1000,jobs:{farmer:4,herbalist:2,carpenter:1,baker:2,wellkeeper:1,shepherd:1,alchemist:1}},
    filoni:{people:8,wealth:950,jobs:{miner:3,carpenter:2,farmer:1,baker:1,herbalist:1,wellkeeper:1,shepherd:1}},
    velaris:{people:14,wealth:1150,jobs:{herbalist:4,alchemist:3,mystic:2,farmer:1,baker:2,carpenter:1,wellkeeper:1}},
    namar:{people:10,wealth:950,jobs:{farmer:5,shepherd:2,baker:2,herbalist:1,wellkeeper:1,carpenter:1}},
    calis:{people:16,wealth:1250,jobs:{mystic:2,carpenter:2,miner:1,wellkeeper:1,baker:2,farmer:1}}
  };
  const fallbackTraits={people:8,wealth:1000,jobs:{}};
  /* Rotte: [da, a, giorni di viaggio, unità massime al giorno per merce]. Vela è il centro del mondo. */
  const routes=[
    ['vela','filoni',2,4],['vela','velaris',3,4],['vela','namar',2,4],['vela','calis',3,4],
    ['velaris','namar',5,3],['namar','calis',5,3],['calis','filoni',5,3],['filoni','velaris',5,3]
  ];
  const traitsOf=profile=>profile.traits||traits[profile.id]||fallbackTraits;

  const targetOf=(profile,id)=>own(profile.goods,id)?profile.goods[id][0]:6;
  const nativeOf=(profile,id)=>own(profile.goods,id)?profile.goods[id][1]:5;
  const ratio=(stock,target)=>Math.min(1e6,Number(stock)*1000/target);       // permille della scorta obiettivo
  const supplyFactor=r=>clamp(Math.round(1700-r*.7),250,1700);               // i produttori accelerano se manca la merce
  const demandFactor=r=>clamp(Math.round(400+r*.6),400,1200);                // la domanda cala quando la merce scarseggia
  const scarcityIndex=r=>clamp(Math.round(1000+(1000-Math.min(r,2000))*.6),400,1600);
  const wealthFactor=(wealth,id)=>luxury.has(id)?wealth:Math.round(1000+(wealth-1000)/2);
  const capacityOf=target=>Math.max(target*3,target+6);

  /* ---------- stato ---------- */
  function ledgerFor(profile){
    const out={};
    for(const id of Object.keys(profile.goods))out[id]=Object.fromEntries(fields.map(f=>[f,'0']));
    return out;
  }
  function create(seed,day,profiles,markets){
    const state={schema:1,seed:Number(seed)>>>0,day:Math.max(1,day|0),opening:{},wealth:{},
      carry:{produce:{},eat:{},spoil:{}},shipments:[],ledger:{}};
    for(const profile of profiles){
      const stock=markets[profile.id]?.stock||{};
      state.opening[profile.id]=Object.fromEntries(Object.keys(profile.goods).map(id=>[id,own(stock,id)?String(stock[id]):'0']));
      state.wealth[profile.id]=traitsOf(profile).wealth;
      for(const kind of Object.keys(state.carry))state.carry[kind][profile.id]={};
      state.ledger[profile.id]=ledgerFor(profile);
    }
    return state;
  }
  function restore(raw,seed,day,profiles,markets){
    if(!object(raw)||raw.schema!==1||!Number.isSafeInteger(raw.day)||raw.day<1||raw.day>1e9)return null;
    if(!Number.isSafeInteger(raw.seed)||raw.seed<0||raw.seed>4294967295)return null;
    if(!object(raw.opening)||!object(raw.wealth)||!object(raw.carry)||!object(raw.ledger)||!Array.isArray(raw.shipments))return null;
    if(raw.shipments.length>maxShipments)return null;
    const ids=new Set(profiles.map(p=>p.id));
    const state=create(raw.seed,raw.day,profiles,{});
    for(const profile of profiles){
      const goods=Object.keys(profile.goods),id=profile.id;
      if(!object(raw.opening[id])||!object(raw.ledger[id])||!Number.isFinite(raw.wealth[id])||raw.wealth[id]<500||raw.wealth[id]>2000)return null;
      state.wealth[id]=Math.round(raw.wealth[id]);
      for(const g of goods){
        if(!canonical(raw.opening[id][g])||!object(raw.ledger[id][g]))return null;
        state.opening[id][g]=raw.opening[id][g];
        for(const f of fields){
          const value=raw.ledger[id][g][f];       // solo i flussi esterni (acquisti del giocatore) possono essere negativi
          if(!(f==='external'?/^-?(0|[1-9][0-9]*)$/.test(String(value)):canonical(value)))return null;
          state.ledger[id][g][f]=raw.ledger[id][g][f];
        }
      }
      for(const kind of Object.keys(state.carry)){
        const source=raw.carry[kind]?.[id];
        if(!object(source))return null;
        for(const [g,n] of Object.entries(source)){
          if(!own(profile.goods,g)||!Number.isSafeInteger(n)||n<0||n>1e12)return null;
          state.carry[kind][id][g]=n;
        }
      }
    }
    for(const ship of raw.shipments){
      if(!object(ship)||!ids.has(ship.from)||!ids.has(ship.to)||ship.from===ship.to||!safeId(ship.id))return null;
      if(!Number.isSafeInteger(ship.qty)||ship.qty<1||ship.qty>1e12||!Number.isSafeInteger(ship.due)||ship.due<1||ship.due>1e9)return null;
      state.shipments.push({from:ship.from,to:ship.to,id:ship.id,qty:ship.qty,due:ship.due});
    }
    state.day=Math.max(raw.day,0)||1;
    return state;
  }

  /* ---------- prezzi ---------- */
  function multiplier(state,profile,id,stock){
    const r=ratio(stock,targetOf(profile,id));
    const wealth=state?.wealth?.[profile.id]??traitsOf(profile).wealth;
    return Math.round(scarcityIndex(r)*wealthFactor(wealth,id)/1000);
  }

  /* ---------- un giorno ---------- */
  function addLedger(state,market,id,field,amount){
    const row=state.ledger[market]?.[id];
    if(row&&amount)row[field]=String(big(row[field])+big(amount));
  }
  function external(state,market,id,delta){
    if(!state||delta===0n||delta===0)return;
    addLedger(state,market,id,'external',BigInt(delta));
  }
  function stepDay(state,profiles,markets,day){
    const book=Object.fromEntries(profiles.map(p=>[p.id,p]));
    const stock=Object.fromEntries(profiles.map(p=>[p.id,Object.fromEntries(Object.keys(p.goods).map(g=>[g,big(markets[p.id].stock[g]??0)]))]));
    const net=Object.fromEntries(profiles.map(p=>[p.id,0]));
    const put=(m,g,n)=>{stock[m][g]+=BigInt(n);};

    // 1. Arrivo delle spedizioni.
    const waiting=[];
    for(const ship of state.shipments){
      if(ship.due>day||!own(stock,ship.to)||!own(stock[ship.to],ship.id)){waiting.push(ship);continue;}
      put(ship.to,ship.id,ship.qty);
      addLedger(state,ship.to,ship.id,'imported',ship.qty);
      net[ship.to]-=ship.qty*nativeOf(book[ship.from]||book[ship.to],ship.id);
    }
    state.shipments=waiting;

    for(const profile of profiles){
      const m=profile.id,t=traitsOf(profile),goods=Object.keys(profile.goods);
      const carry=state.carry;
      const turn=(kind,g,permille)=>{
        const sum=(carry[kind][m][g]||0)+permille,units=Math.floor(sum/1000);
        carry[kind][m][g]=sum-units*1000;
        return units;
      };
      const share=g=>supplyFactor(ratio(stock[m][g],targetOf(profile,g)));
      // 2a. Produzione primaria, con raccolto variabile (±10%) ma deterministico.
      for(const [job,workers] of Object.entries(t.jobs)){
        const def=professions[job];
        if(!def||def.uses||workers<=0)continue;
        for(const [g,rate] of Object.entries(def.makes)){
          if(!own(profile.goods,g))continue;
          const harvest=900+hash(state.seed,day,m,g)%201;
          const made=turn('produce',g,Math.floor(workers*rate*share(g)*harvest/1e6));
          if(made){put(m,g,made);addLedger(state,m,g,'produced',made);}
        }
      }
      // 2b. Trasformazione: limitata dalla materia prima disponibile.
      for(const [job,workers] of Object.entries(t.jobs)){
        const def=professions[job];
        if(!def||!def.uses||workers<=0)continue;
        const [g,rate]=Object.entries(def.makes)[0],[input,per]=Object.entries(def.uses)[0];
        if(!own(profile.goods,g)||!own(profile.goods,input))continue;
        const capacity=Math.floor(workers*rate*share(g)/1000);
        const wanted=Math.floor(((carry.produce[m][g]||0)+capacity)/1000);
        const possible=Number(minBig(BigInt(wanted),stock[m][input]/BigInt(per)));
        carry.produce[m][g]=((carry.produce[m][g]||0)+capacity)-wanted*1000;   // la capacità inutilizzata va perduta
        if(possible>0){
          put(m,input,-possible*per);put(m,g,possible);
          addLedger(state,m,input,'used',possible*per);addLedger(state,m,g,'produced',possible);
        }
      }
      // 3. Consumo degli abitanti (limitato dalla scorta; il resto è fabbisogno insoddisfatto).
      for(const g of goods){
        if(!own(needs,g))continue;
        const r=ratio(stock[m][g],targetOf(profile,g));
        const permille=Math.floor(t.people*needs[g]*demandFactor(r)/1000*(luxury.has(g)?state.wealth[m]/1000:1));
        const wanted=turn('eat',g,permille),eaten=Number(minBig(BigInt(wanted),stock[m][g]));
        if(eaten){put(m,g,-eaten);addLedger(state,m,g,'eaten',eaten);}
        if(wanted>eaten)addLedger(state,m,g,'unmet',wanted-eaten);
      }
      // 4. Deperimento e smaltimento delle scorte oltre la capacità del magazzino.
      for(const g of goods){
        const rate=spoilage[g]||0,have=stock[m][g];
        let gone=0n;
        if(rate&&have>0n){
          const sum=(carry.spoil[m][g]||0)+Math.floor(Number(have)*rate);
          gone=minBig(have,BigInt(Math.floor(sum/1000)));
          carry.spoil[m][g]=sum-Number(gone)*1000;
        }
        const cap=BigInt(capacityOf(targetOf(profile,g))),left=have-gone;
        if(left>cap)gone+=left-cap;
        if(gone>0n){put(m,g,-gone);addLedger(state,m,g,'spoiled',gone);}
      }
    }

    // 5. Rotte commerciali: le eccedenze vanno dove il prezzo è più alto, con un margine che copre il viaggio.
    const pending={};
    const lanes=new Set();       // corsie in uso: una merce non viaggia in entrambi i sensi sulla stessa rotta
    for(const ship of state.shipments){
      pending[ship.to+'|'+ship.id]=(pending[ship.to+'|'+ship.id]||0)+ship.qty;
      lanes.add(ship.from+'>'+ship.to+'|'+ship.id);
    }
    for(const [a,b,days,capacity] of routes){
      if(!own(book,a)||!own(book,b))continue;
      for(const [from,to] of [[a,b],[b,a]]){
        for(const g of Object.keys(book[from].goods).sort()){
          if(!own(book[to].goods,g)||lanes.has(to+'>'+from+'|'+g))continue;
          const have=stock[from][g],keep=BigInt(Math.ceil(targetOf(book[from],g)*.6));
          const spare=have-keep;
          if(spare<=0n)continue;
          const coming=pending[to+'|'+g]||0;
          // La scorta di destinazione deve coprire anche il consumo stimato durante il viaggio.
          const drain=Math.ceil(traitsOf(book[to]).people*(needs[g]||0)*days/1000);
          const need=targetOf(book[to],g)+drain-Number(stock[to][g])-coming;
          if(need<=0)continue;
          const gap=multiplier(state,book[to],g,stock[to][g]+BigInt(coming))-multiplier(state,book[from],g,have);
          if(gap<40+15*days)continue;
          const qty=Number(minBig(spare,BigInt(Math.min(need,capacity))));
          if(qty<1)continue;
          const loss=Math.min(qty-1,Math.floor(qty*(spoilage[g]||0)*days/1000)),arrive=qty-loss;
          put(from,g,-qty);
          addLedger(state,from,g,'exported',qty);addLedger(state,from,g,'lost',loss);
          net[from]+=qty*nativeOf(book[from],g);
          state.shipments.push({from,to,id:g,qty:arrive,due:day+days});
          pending[to+'|'+g]=coming+arrive;
          lanes.add(from+'>'+to+'|'+g);
        }
      }
    }
    state.shipments.sort((x,y)=>x.due-y.due||x.from.localeCompare(y.from)||x.to.localeCompare(y.to)||x.id.localeCompare(y.id));
    if(state.shipments.length>maxShipments)state.shipments.length=maxShipments;

    // 6. Ricchezza: chi esporta valore si arricchisce, chi importa si impoverisce; torna lentamente alla base.
    for(const profile of profiles){
      const m=profile.id,t=traitsOf(profile),w=state.wealth[m];
      const moved=w+net[m]/t.people-(w-t.wealth)*.03;
      state.wealth[m]=Math.round(clamp(moved,t.wealth*.8,t.wealth*1.4));
    }

    // Scrittura delle scorte nei mercati.
    for(const profile of profiles){
      const out=markets[profile.id].stock;
      for(const g of Object.keys(profile.goods)){
        if(stock[profile.id][g]===0n)delete out[g];else out[g]=String(stock[profile.id][g]);
      }
    }
  }
  /* Porta lo stato al giorno indicato. Restituisce quanti giorni sono stati simulati. */
  function advance(state,profiles,markets,day){
    if(!state||!(day>state.day))return 0;
    const first=Math.max(state.day+1,day-maxCatchUp+1);
    state.day=first-1;
    let steps=0;
    for(let d=first;d<=day;d++){stepDay(state,profiles,markets,d);state.day=d;steps++;}
    state.day=day;
    return steps;
  }

  /* ---------- verifiche e rapporti ---------- */
  /* Controlla che ogni scorta sia pari all'apertura più il registro dei flussi. Restituisce l'elenco degli squilibri. */
  function audit(state,profiles,markets){
    const problems=[];
    for(const profile of profiles){
      for(const g of Object.keys(profile.goods)){
        const l=state.ledger[profile.id][g],opening=big(state.opening[profile.id][g]);
        const expected=opening+big(l.produced)-big(l.used)-big(l.eaten)-big(l.spoiled)+big(l.external)+big(l.imported)-big(l.exported);
        const actual=big(markets[profile.id].stock[g]??0);
        if(expected!==actual)problems.push({market:profile.id,good:g,expected:String(expected),actual:String(actual)});
      }
    }
    return problems;
  }
  /* Riparte dalle scorte attuali (apertura = scorte, registro azzerato) conservando ricchezza, rotte in corso e riporti.
     Serve quando le scorte sono state modificate fuori dal registro, per esempio in un salvataggio importato. */
  function rebase(state,profiles,markets){
    for(const profile of profiles){
      const stock=markets[profile.id]?.stock||{};
      state.opening[profile.id]=Object.fromEntries(Object.keys(profile.goods).map(id=>[id,own(stock,id)?String(stock[id]):'0']));
      state.ledger[profile.id]=ledgerFor(profile);
    }
    return state;
  }
  /* Merci in viaggio per mercato di destinazione. */
  function inTransit(state){
    const out={};
    for(const ship of state.shipments){
      out[ship.to]=out[ship.to]||{};
      out[ship.to][ship.id]=(out[ship.to][ship.id]||0)+ship.qty;
    }
    return out;
  }
  /* Attività economica aggregata dei lavoratori di un mercato (per routine e interfacce future). */
  function activity(profile,stock){
    const t=traitsOf(profile),rows=[];
    for(const [job,workers] of Object.entries(t.jobs)){
      const def=professions[job];
      if(!def||workers<=0)continue;
      const goods=Object.keys(def.makes).filter(g=>own(profile.goods,g));
      if(!goods.length)continue;
      const level=Math.round(goods.reduce((sum,g)=>sum+supplyFactor(ratio(own(stock,g)?stock[g]:0,targetOf(profile,g))),0)/goods.length);
      rows.push({job,name:def.name,workers,makes:goods,effort:level});
    }
    return rows;
  }
  function report(state,profiles,markets){
    return profiles.map(profile=>({id:profile.id,wealth:state.wealth[profile.id],
      goods:Object.keys(profile.goods).map(g=>{
        const stock=markets[profile.id].stock[g]??'0';
        return {id:g,stock,target:targetOf(profile,g),price:multiplier(state,profile,g,big(stock))};
      })}));
  }

  window.MarketFlows={create,restore,advance,multiplier,external,audit,rebase,inTransit,activity,report,
    professions,needs,traits,routes,maxCatchUp};
})();
