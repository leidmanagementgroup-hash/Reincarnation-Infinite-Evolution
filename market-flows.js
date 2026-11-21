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
  const big=v=>BigInt(v);
  const has=(o,k)=>o[k]!==undefined;           // solo per mappe interne con chiavi già validate (merci e mercati)
  const minBig=(a,b)=>a<b?a:b;
  const hash=(...parts)=>{
    let h=2166136261;
    for(const ch of parts.join('|'))h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;
    return h>>>0;
  };
  const safeId=id=>typeof id==='string'&&/^[a-z][a-z0-9._:-]{0,95}$/i.test(id)&&!['constructor','prototype','__proto__'].includes(id);

  const maxCatchUp=120;      // giorni simulati al massimo dopo una lunga assenza: oltre, l'equilibrio è già raggiunto
  /* Spedizioni in viaggio al massimo: cresce con i mercati. Raggiunto il limite non partono nuove spedizioni; quelle
     già partite non vengono mai scartate, perché la merce andrebbe perduta. */
  const shipmentLimit=count=>Math.max(300,count*12);
  const fields=['produced','used','eaten','unmet','spoiled','lost','external','imported','exported'];

  /* Professioni. `rate` è la produzione di un lavoratore al giorno in millesimi di unità. Le professioni con
     `uses` trasformano: consumano `uses` unità di materia prima per ogni unità prodotta. */
  const professions={
    farmer:{name:'Contadini',makes:{grain:1000,seeds:100}},
    herbalist:{name:'Erbaiuoli',makes:{herb:1000}},
    miner:{name:'Minatori',makes:{ore:500}},
    carpenter:{name:'Falegnami',makes:{work:300}},
    shepherd:{name:'Pastori',makes:{wool:600}},
    mystic:{name:'Cercatori di essenza',makes:{essence:250}},
    wellkeeper:{name:'Pozzaioli',makes:{water:2000}},
    baker:{name:'Fornai',makes:{bread:1000},uses:{grain:1}},
    alchemist:{name:'Alchimisti',makes:{potion:500},uses:{herb:2}}
  };
  /* Consumo giornaliero per abitante, in millesimi di unità. */
  const needs={water:150,bread:120,grain:40,herb:30,potion:25,ore:25,work:25,seeds:15,wool:35,essence:12};
  const luxury=new Set(['potion','essence','wool']);
  /* Deperimento giornaliero in millesimi della scorta. */
  const spoilage={bread:120,herb:50,grain:20,seeds:10,potion:10,wool:5,essence:2,water:0,ore:0,work:0};
  /* Identità economica di ogni mercato: abitanti, ricchezza di base (1000 = media) e lavoratori per professione. */
  const traits={
    vela:{people:10,wealth:1000,jobs:{farmer:4,herbalist:2,carpenter:1,baker:2,wellkeeper:1,shepherd:1,alchemist:1}},
    filoni:{people:8,wealth:950,jobs:{miner:3,carpenter:2,farmer:1,baker:2,herbalist:1,wellkeeper:1,shepherd:1}},
    velaris:{people:14,wealth:1150,jobs:{herbalist:4,alchemist:3,mystic:2,farmer:1,baker:2,carpenter:1,wellkeeper:1}},
    namar:{people:10,wealth:950,jobs:{farmer:6,shepherd:2,baker:2,herbalist:1,wellkeeper:1,carpenter:1}},
    calis:{people:16,wealth:1250,jobs:{mystic:2,carpenter:2,miner:1,wellkeeper:1,baker:2,farmer:1}}
  };
  const fallbackTraits={people:8,wealth:1000,jobs:{}};
  /* Rotte: [da, a, giorni di viaggio, unità massime al giorno per merce]. Vela è il centro del mondo. */
  const routes=[
    ['vela','filoni',2,4],['vela','velaris',3,4],['vela','namar',2,4],['vela','calis',3,4],
    ['velaris','namar',5,3],['namar','calis',5,3],['calis','filoni',5,3],['filoni','velaris',5,3]
  ];
  const traitsOf=profile=>profile.traits||traits[profile.id]||fallbackTraits;

  const targetOf=(profile,id)=>has(profile.goods,id)?profile.goods[id][0]:6;
  const nativeOf=(profile,id)=>has(profile.goods,id)?profile.goods[id][1]:5;
  const ratio=(stock,target)=>Math.min(1e6,Number(stock)*1000/target);       // permille della scorta obiettivo
  /* I produttori accelerano se manca la merce (fino a +70%) e si fermano del tutto quando la scorta raggiunge il doppio dell'obiettivo. */
  const supplyFactor=r=>r<=1000?clamp(Math.round(1700-r*.7),1000,1700):clamp(Math.round(1000-(r-1000)*1.0),0,1000);
  const demandFactor=r=>clamp(Math.round(400+r*.6),400,1200);                // la domanda cala quando la merce scarseggia
  const scarcityIndex=r=>clamp(Math.round(1000+(1000-Math.min(r,2000))*.6),400,1600);
  const wealthFactor=(wealth,id)=>luxury.has(id)?wealth:Math.round(1000+(wealth-1000)/2);
  const capacityOf=target=>Math.max(target*3,target+6);

  /* Previsione giornaliera per merce, in unità al giorno: domanda degli abitanti, produzione dei lavoratori e materie
     prime dei trasformatori. `stock` può contenere BigInt o stringhe. Il deficit strutturale (domanda − produzione) è
     quello a regime, senza le reazioni momentanee ai livelli di scorta: i trasformatori seguono invece il ritmo attuale
     perché la loro richiesta di materie prime dipende dalla scorta del prodotto finito. */
  function outlookOf(profile,stock,wealth){
    const t=traitsOf(profile),out={};
    for(const g of Object.keys(profile.goods))out[g]={demand:0,output:0};
    for(const g of Object.keys(profile.goods)){
      if(!has(needs,g))continue;
      out[g].demand+=t.people*needs[g]/1000*(luxury.has(g)?wealth/1000:1);
    }
    for(const [job,workers] of Object.entries(t.jobs)){
      const def=professions[job];
      if(!def||workers<=0)continue;
      for(const [g,rate] of Object.entries(def.makes)){
        if(!has(profile.goods,g))continue;
        const capacity=workers*rate/1000;
        out[g].output+=capacity;
        if(def.uses){
          const effort=supplyFactor(ratio(has(stock,g)?stock[g]:0,targetOf(profile,g)))/1000;
          for(const [input,per] of Object.entries(def.uses))if(has(profile.goods,input))out[input].demand+=capacity*effort*per;
        }
      }
    }
    return out;
  }

  /* Rotte fra mercati. Valgono le rotte della tabella e quelle dichiarate dal profilo (`routes:[[a,giorni,capacità]]`);
     i mercati con meno di due collegamenti vengono uniti ai più vicini (`world:{x,y}`, in unità della mappa dei
     continenti) e il grafo viene sempre reso connesso. Il risultato è deterministico e rimane in memoria finché la
     lista dei mercati non cambia: nuovi insediamenti non richiedono condizioni speciali. */
  const routeCache=new WeakMap();
  function placeOf(profile){
    if(profile.world&&Number.isFinite(profile.world.x)&&Number.isFinite(profile.world.y))return profile.world;
    return {x:hash('x',profile.id)%100,y:hash('y',profile.id)%100};
  }
  function routesFor(profiles){
    if(!profiles.length)return [];
    const hit=routeCache.get(profiles);
    if(hit&&hit.size===profiles.length&&hit.first===profiles[0]&&hit.last===profiles[profiles.length-1])return hit.list;
    const ids=new Set(profiles.map(p=>p.id)),list=[],seen=new Set(),degree={};
    const add=(a,b,days,capacity)=>{
      const key=a<b?a+'|'+b:b+'|'+a;
      if(a===b||seen.has(key)||!ids.has(a)||!ids.has(b))return false;
      seen.add(key);degree[a]=(degree[a]||0)+1;degree[b]=(degree[b]||0)+1;
      list.push([a,b,clamp(Math.round(days),1,12),clamp(Math.round(capacity),1,12)]);
      return true;
    };
    const explicit=new Set();      // mercati con rotte dichiarate: non vengono ricollegati automaticamente
    for(const [a,b,days,capacity] of routes)if(add(a,b,days,capacity)){explicit.add(a);explicit.add(b);}
    for(const p of profiles)for(const link of p.routes||[])if(Array.isArray(link)&&add(p.id,link[0],link[1],link[2])){explicit.add(p.id);explicit.add(link[0]);}
    const where=new Map(profiles.map(p=>[p,placeOf(p)]));
    const dist=(p,q)=>{const a=where.get(p),b=where.get(q);return Math.hypot(a.x-b.x,a.y-b.y);};
    const link=(p,q)=>add(p.id,q.id,Math.max(2,Math.ceil(dist(p,q)/10)),Math.min(traitsOf(p).people,traitsOf(q).people)/3);
    for(const p of profiles){
      if(explicit.has(p.id)||(degree[p.id]||0)>=2)continue;
      const near=profiles.filter(q=>q!==p).sort((x,y)=>dist(p,x)-dist(p,y)||(x.id<y.id?-1:1));
      for(const q of near){if((degree[p.id]||0)>=2)break;link(p,q);}
    }
    // grandi centri (almeno 16 abitanti): ogni mercato si lega al più vicino e i grandi centri fra loro, come vie maestre
    const hubs=profiles.filter(p=>traitsOf(p).people>=16);
    if(hubs.length>1||(hubs.length===1&&profiles.length>1)){
      for(const p of profiles){
        if(explicit.has(p.id))continue;
        const near=hubs.filter(h=>h!==p).sort((x,y)=>dist(p,x)-dist(p,y)||(x.id<y.id?-1:1));
        let linked=traitsOf(p).people>=16?0:1;
        for(const h of near){if(linked>=(traitsOf(p).people>=16?2:1))break;if(link(p,h)||seen.has(p.id<h.id?p.id+'|'+h.id:h.id+'|'+p.id))linked++;}
      }
    }
    // connessione: ogni componente isolata si lega alla più vicina del resto
    const parent=Object.fromEntries(profiles.map(p=>[p.id,p.id]));
    const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};
    for(const [a,b] of list)parent[find(a)]=find(b);
    for(const p of profiles){
      if(find(p.id)===find(profiles[0].id))continue;
      let best=null;
      for(const q of profiles)if(find(q.id)!==find(p.id)){const d=dist(p,q);if(!best||d<best.d||(d===best.d&&q.id<best.q.id))best={q,d};}
      if(best){link(p,best.q);parent[find(p.id)]=find(best.q.id);}
    }
    routeCache.set(profiles,{size:profiles.length,first:profiles[0],last:profiles[profiles.length-1],list});
    return list;
  }

  /* Dati statici di un profilo, calcolati una sola volta: merci in ordine alfabetico e riserva minima di partenza
     (obiettivo × 0,6 arrotondato per eccesso: sotto questa scorta una merce non parte mai). */
  const staticCache=new WeakMap();
  function staticOf(profile){
    let hit=staticCache.get(profile);
    if(!hit){
      const goods=Object.keys(profile.goods).sort();
      hit={goods,floor:Object.fromEntries(goods.map(g=>[g,BigInt(Math.ceil(targetOf(profile,g)*.6))]))};
      staticCache.set(profile,hit);
    }
    return hit;
  }
  const sortedGoods=profile=>staticOf(profile).goods;
  const reserveFloor=(profile,g)=>staticOf(profile).floor[g];

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
    if(raw.shipments.length>shipmentLimit(profiles.length))return null;
    const ids=new Set(profiles.map(p=>p.id));
    const state=create(raw.seed,raw.day,profiles,markets);
    for(const profile of profiles){
      const goods=Object.keys(profile.goods),id=profile.id;
      // un mercato nato dopo il salvataggio (nuova città) parte dalle sue scorte attuali, senza perdere gli altri
      if(!own(raw.opening,id)&&!own(raw.ledger,id)&&!own(raw.wealth,id))continue;
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
  const harvestPrefix=new WeakMap();       // base del raccolto per mercato e merce, per stato (non fa parte del salvataggio)
  function stepDay(state,profiles,markets,day){
    const prefix=harvestPrefix.get(state)||(harvestPrefix.set(state,{}),harvestPrefix.get(state));
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
          if(!has(profile.goods,g))continue;
          const harvest=900+(Math.imul((prefix[m+'|'+g]??(prefix[m+'|'+g]=hash(state.seed,m,g)))^Math.imul(day,2654435761),2246822519)>>>0)%201;
          const made=turn('produce',g,Math.floor(workers*rate*share(g)*harvest/1e6));
          if(made){put(m,g,made);addLedger(state,m,g,'produced',made);}
        }
      }
      // 2b. Trasformazione: limitata dalla materia prima disponibile.
      for(const [job,workers] of Object.entries(t.jobs)){
        const def=professions[job];
        if(!def||!def.uses||workers<=0)continue;
        const [g,rate]=Object.entries(def.makes)[0],[input,per]=Object.entries(def.uses)[0];
        if(!has(profile.goods,g)||!has(profile.goods,input))continue;
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
        if(!has(needs,g))continue;
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

    // 5. Rotte commerciali. Una merce parte solo se: la partenza conserva una riserva (obiettivo ridotto più due giorni
    //    di deficit locale), la destinazione ha un deficit previsto (obiettivo + deficit × giorni di viaggio, compresi i
    //    trasformatori) e, dopo la spedizione, il prezzo all'arrivo copre ancora prezzo di partenza, deperimento e costo del
    //    trasporto. Si spedisce al più la quantità che mantiene il margine: il commercio si spegne da solo quando i prezzi
    //    si avvicinano e non può girare in tondo.
    const pending={};
    const lanes=new Set();       // corsie in uso: una merce non viaggia in entrambi i sensi sulla stessa rotta
    for(const ship of state.shipments){
      pending[ship.to+'|'+ship.id]=(pending[ship.to+'|'+ship.id]||0)+ship.qty;
      lanes.add(ship.from+'>'+ship.to+'|'+ship.id);
    }
    const outlook={};       // previsioni calcolate solo per i mercati che servono davvero
    const deficit=(m,g)=>{
      const view=outlook[m]||(outlook[m]=outlookOf(book[m],stock[m],state.wealth[m]));
      return Math.max(0,view[g].demand-view[g].output);
    };
    const priceOf=(p,g,units)=>nativeOf(p,g)*multiplier(state,p,g,units)/1000;
    const limit=shipmentLimit(profiles.length);
    for(const [a,b,days,capacity] of routesFor(profiles)){
      if(!own(book,a)||!own(book,b))continue;
      for(const [from,to] of [[a,b],[b,a]]){
        for(const g of sortedGoods(book[from])){
          if(state.shipments.length>=limit)continue;
          const have=stock[from][g];
          if(have<=reserveFloor(book[from],g))continue;                    // controllo economico prima di quelli costosi
          // niente corsie opposte: una merce non torna indietro lungo la rotta da cui sta partendo
          if(!has(book[to].goods,g)||lanes.has(to+'>'+from+'|'+g))continue;
          const keep=BigInt(Math.ceil(targetOf(book[from],g)*.6+2*deficit(from,g)));
          const spare=have-keep;
          if(spare<=0n)continue;
          const coming=pending[to+'|'+g]||0;
          const need=Math.ceil(targetOf(book[to],g)+deficit(to,g)*(days+1))-Number(stock[to][g])-coming;
          if(need<=0)continue;
          const top=Number(minBig(spare,BigInt(Math.min(need,capacity))));
          const spoil=spoilage[g]||0,lossOf=q=>Math.min(q-1,Math.floor(q*spoil*days/1000));
          // scorta prevista all'arrivo: quella attuale più le merci in viaggio, meno il deficit consumato durante il viaggio
          const burn=BigInt(Math.floor(deficit(to,g)*days));
          let qty=0;
          for(let q=1;q<=top;q++){
            const arrive=q-lossOf(q);
            const origin=priceOf(book[from],g,have-BigInt(q));
            const there=stock[to][g]+BigInt(coming+arrive)-burn;
            const arrival=priceOf(book[to],g,there>0n?there:0n)*arrive/q;
            if(arrival<origin*(1.05+.04*days)+.1*days)break;
            qty=q;
          }
          if(qty<1)continue;
          const loss=lossOf(qty),arrive=qty-loss;
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
  /* Quanti giorni al massimo si recuperano dopo una lunga assenza: dipende solo dal numero di mercati (non dal tempo
     reale), così il risultato resta deterministico. Con cinque mercati sono 120; con 100 mercati 30; con 300 mercati 10
     (circa 3000 giorni-mercato, intorno al terzo di secondo). */
  const catchUpFor=count=>clamp(Math.floor(3000/Math.max(1,count)),10,maxCatchUp);
  /* Porta lo stato al giorno indicato. Restituisce quanti giorni sono stati simulati. */
  function advance(state,profiles,markets,day){
    if(!state||!(day>state.day)||!profiles.length)return 0;
    const first=Math.max(state.day+1,day-catchUpFor(profiles.length)+1);
    state.day=first-1;
    let steps=0;
    for(let d=first;d<=day;d++){stepDay(state,profiles,markets,d);state.day=d;steps++;}
    state.day=day;
    return steps;
  }

  /* ---------- profili per nuovi insediamenti ---------- */
  /* Genera un profilo di mercato completo e deterministico a partire da una descrizione dell'insediamento, così le
     nuove città non richiedono tabelle né condizioni speciali: abitanti dalla dimensione, mestieri dalla vocazione
     (con i servizi essenziali sempre coperti), obiettivi di scorta dalla domanda e prezzi più bassi per le merci in cui
     l'insediamento è specializzato. spec: {id,name,size,focus,seed,world:{x,y},region,continent,x,y}. */
  const referencePrice={water:3,bread:6,grain:5,herb:9,potion:11,ore:6,work:6,seeds:5,wool:7,essence:12};
  const sizes={village:{people:7,wealth:900},town:{people:12,wealth:1000},city:{people:20,wealth:1100},capital:{people:32,wealth:1250}};
  const focuses={
    farming:{jobs:{farmer:5,shepherd:1.5,herbalist:1,carpenter:1},wealth:-30},
    pastoral:{jobs:{shepherd:4,farmer:2,herbalist:1,carpenter:1},wealth:-30},
    mining:{jobs:{miner:4,carpenter:2,farmer:1,herbalist:.5,shepherd:.5},wealth:0},
    crafts:{jobs:{carpenter:3,miner:1.5,farmer:1,shepherd:1,herbalist:1},wealth:40},
    alchemy:{jobs:{herbalist:4,alchemist:3,mystic:1.5,farmer:1,carpenter:.5},wealth:100},
    port:{jobs:{mystic:2,carpenter:2,miner:1,farmer:1,herbalist:.5},wealth:150},
    capital:{jobs:{farmer:2,carpenter:1.5,miner:1,herbalist:1.5,alchemist:1.5,mystic:1,shepherd:1},wealth:150}
  };
  function settlementProfile(spec){
    const size=sizes[spec.size]||sizes.town,focus=focuses[spec.focus]||focuses.crafts,id=String(spec.id);
    if(!safeId(id))throw new Error('identificatore di mercato non valido');
    const mix=n=>hash(spec.seed??0,id,n);
    const people=Math.max(4,Math.round(size.people*(.85+mix('people')%31/100)));
    const wealth=clamp(Math.round(size.wealth+focus.wealth+(mix('wealth')%61-30)),700,1500);
    const jobs={};
    // servizi essenziali: acqua e pane per tutti
    jobs.wellkeeper=Math.max(1,Math.ceil(people*needs.water/1000/(professions.wellkeeper.makes.water/1000)));
    jobs.baker=Math.max(1,Math.ceil(people*needs.bread/1000/(professions.baker.makes.bread/1000)));
    const essential=jobs.wellkeeper+jobs.baker,total=Math.max(essential+2,Math.round(people*1.15)),left=total-essential;
    // resto dei lavoratori in proporzione alla vocazione (resti maggiori, a parità in ordine alfabetico)
    const names=Object.keys(focus.jobs).sort(),sum=names.reduce((n,k)=>n+focus.jobs[k],0);
    const shares=names.map(k=>({k,v:left*focus.jobs[k]/sum}));
    let given=0;
    for(const s of shares){const n=Math.floor(s.v);jobs[s.k]=(jobs[s.k]||0)+n;given+=n;s.r=s.v-n;}
    shares.sort((x,y)=>y.r-x.r||(x.k<y.k?-1:1));
    for(let i=0;given<left;i++,given++)jobs[shares[i%shares.length].k]=(jobs[shares[i%shares.length].k]||0)+1;
    // il pane richiede grano: i granai si adeguano al fabbisogno anche negli insediamenti che non coltivano
    const grainNeed=people*needs.grain/1000+jobs.baker;
    if((jobs.farmer||0)<Math.ceil(grainNeed*.9))jobs.farmer=Math.ceil(grainNeed*.9);
    // medicina di base: ogni città (non i villaggi) cura da sé una parte del fabbisogno di pozioni
    if(spec.size!=='village'){
      const healers=Math.ceil(people*needs.potion/1000/(professions.alchemist.makes.potion/1000)*.6);
      if((jobs.alchemist||0)<healers)jobs.alchemist=healers;
      if((jobs.herbalist||0)<jobs.alchemist)jobs.herbalist=jobs.alchemist;
    }
    const hasEssence=['alchemy','port','capital'].includes(spec.focus)||spec.size==='capital';
    const profile={id,name:spec.name||id,region:spec.region||id,continent:spec.continent||null,x:spec.x||0,y:spec.y||0,range:24,
      world:spec.world||null,goods:{},traits:{people,wealth,jobs}};
    const draft={id,goods:Object.fromEntries(Object.keys(referencePrice).filter(g=>g!=='essence'||hasEssence).map(g=>[g,[6,5]])),traits:profile.traits};
    const view=outlookOf(draft,Object.fromEntries(Object.keys(draft.goods).map(g=>[g,6])),wealth);     // scorte al livello obiettivo
    // specialità: merci che il luogo produce molto più di quanto ne consuma (e che quindi vende a poco)
    const special=new Set(Object.keys(view).filter(g=>view[g].output>=.3&&view[g].output>=1.6*view[g].demand));
    for(const g of Object.keys(draft.goods)){
      const flow=Math.max(view[g].demand,view[g].output);
      const target=clamp(Math.round(4+3.5*flow),4,28);
      const price=referencePrice[g]*(special.has(g)?.6+mix('p'+g)%15/100:view[g].demand>view[g].output?1.1+mix('p'+g)%25/100:.9+mix('p'+g)%20/100);
      profile.goods[g]=[target,Math.max(2,Math.round(price))];
    }
    return profile;
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

  window.MarketFlows={create,restore,advance,multiplier,external,audit,rebase,inTransit,activity,report,outlook:outlookOf,
    settlementProfile,routesFor,catchUpFor,capacity:(profile,id)=>capacityOf(targetOf(profile,id)),
    professions,needs,traits,routes,maxCatchUp,sizes,focuses};
})();
