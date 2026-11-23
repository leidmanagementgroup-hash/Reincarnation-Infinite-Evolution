(() => {
  'use strict';
  /* Mestieri con un futuro (Living World 2.0, incremento 2). Due percorsi verticali costruiti sui sistemi esistenti:
     - Fabbro: pratica e qualità della forgia (Tradecraft, Life) → la qualità conta nel prezzo (Economy) → ordini dell'Armeria
       del Passo al mercato dei Filoni quando le lame mancano davvero dal banco → fama di fornitore che alza le richieste e la paga.
     - Mercante: acquisti e vendite (Economy) → taccuino dei prezzi visti di persona nei mercati visitati (nessun prezzo lontano
       conosciuto senza esserci stati) → contratti del Registro dei Carichi di Calis sulla merce che manca → contratti più grandi.
     Tutte le merci passano da Economy.deliver (registro esatto, tetto del magazzino): nulla nasce dal nulla. Una sola
     consegna al giorno per percorso. Dati in `s.careers` (schema 1); il ripristino non rifiuta mai il salvataggio. */
  const SCHEMA=1,BLADES=['blade-0','blade-1','blade-2','blade-3'],QUALITY=['scarsa','buona','ottima','perfetta'];
  const ARMORY={market:'filoni',name:'Armeria del Passo',minLevel:4,want:2,trusted:3,pay:[1.25,1.4]};
  const CARGO={market:'calis',name:'Registro dei Carichi',minLevel:4,size:[3,6],partner:3,pay:1.2};
  const own=(o,k)=>!!o&&Object.hasOwn(o,k);
  const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
  const int=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
  const today=s=>Calendar.absoluteDays(s.calendar,s.time);
  const marketIds=()=>(window.Economy?.profiles||[]).map(p=>p.id);

  function create(){return {schema:SCHEMA,smith:{orders:0,lastDay:-1},merchant:{contracts:0,lastDay:-1},seen:{}};}
  function restore(raw,s){
    const c=create();
    if(!object(raw)||raw.schema!==SCHEMA)return c;
    const now=s?.calendar?today(s):Infinity;
    for(const [key,count] of [['smith','orders'],['merchant','contracts']]){
      const r=raw[key];
      if(object(r)&&int(r[count],0,1e6)&&int(r.lastDay,-1,now))c[key]={[count]:r[count],lastDay:r.lastDay};
    }
    if(object(raw.seen))for(const id of marketIds()){
      const m=raw.seen[id];
      if(!object(m)||!int(m.day,0,now)||!object(m.prices))continue;
      const prices={};
      for(const [good,pair] of Object.entries(m.prices).slice(0,40))
        if(typeof good==='string'&&good.length<=40&&Array.isArray(pair)&&pair.length===2&&pair.every(n=>int(n,0,1e9)))prices[good]=[pair[0],pair[1]];
      c.seen[id]={day:m.day,prices};
    }
    return c;
  }
  const state=s=>s.careers||(s.careers=create());
  const stockOf=(s,market,id)=>{const q=Economy.quote(s,market,id);return q?BigInt(q.stock):0n;};

  // ------------------------------------------------------------------ fabbro: ordini dell'Armeria del Passo (Filoni)
  function armoryView(s){
    const st=state(s).smith,level=Life.level(s,'smith'),day=today(s);
    const tier=st.orders>=ARMORY.trusted?2:1;
    const onBench=BLADES.reduce((n,id)=>n+stockOf(s,ARMORY.market,id),0n);
    const blade=BLADES.slice(tier).find(id=>Inventory.quantity(s,id)>0n)||null;
    const quote=blade&&Economy.quote(s,ARMORY.market,blade);
    // Il compenso non supera mai il prezzo d'acquisto della stessa lama meno 1: comprarla al banco per consegnarla non rende.
    const pay=quote?Math.max(1,Math.min(Math.round(quote.sell*ARMORY.pay[tier-1]),quote.buy-1)):0;
    const why=level<ARMORY.minLevel?'L’armeria ordina solo a fabbri almeno Praticanti (forgia ancora qualche lama).':
      st.lastDay===day?'Hai già consegnato l’ordine di oggi.':
      onBench>=BigInt(ARMORY.want)?'Il banco ha lame a sufficienza ('+onBench+'): l’armeria non ordina.':
      !blade?'Serve una lama di qualità almeno '+QUALITY[tier]+'.':'';
    return {name:ARMORY.name,market:ARMORY.market,level,orders:st.orders,tier,minQuality:QUALITY[tier],onBench:String(onBench),want:ARMORY.want,
      blade,bladeName:blade?Inventory.definition(s,blade)?.name:null,pay,available:!why,why,
      standing:st.orders>=ARMORY.trusted?'Fornitore di fiducia dell’armeria':st.orders?'Fabbro conosciuto ai Filoni':'Sconosciuto all’armeria',
      next:st.orders<ARMORY.trusted?'Da '+ARMORY.trusted+' ordini l’armeria chiede lame ottime e paga ×'+ARMORY.pay[1]+' invece di ×'+ARMORY.pay[0]+'.':''};
  }
  // ------------------------------------------------------------------ mercante: contratti del Registro dei Carichi (Calis)
  function cargoView(s){
    const st=state(s).merchant,level=Life.level(s,'merchant'),day=today(s);
    const profile=Economy.profiles.find(p=>p.id===CARGO.market);
    let good=null,gap=0;
    for(const id of Object.keys(profile?.goods||{})){const g=Economy.shortage(s,CARGO.market,id);if(g>gap){gap=g;good=id;}}
    const size=st.contracts>=CARGO.partner?CARGO.size[1]:CARGO.size[0];
    const owned=good?Inventory.quantity(s,good):0n;
    let pay=0;
    // Ogni unità è pagata al prezzo di vendita a quella scorta ×1,2, mai oltre il suo prezzo d'acquisto meno 1.
    if(good){const stock=stockOf(s,CARGO.market,good);for(let i=0n;i<BigInt(size);i++){const q=Economy.quote(s,CARGO.market,good,stock+i);pay+=Math.max(1,Math.min(Math.round(q.sell*CARGO.pay),q.buy-1));}}
    const why=level<CARGO.minLevel?'Il Registro affida contratti solo a mercanti almeno Praticanti.':
      st.lastDay===day?'Hai già consegnato il contratto di oggi.':
      !good?'A Calis non manca nessuna merce: oggi nessun contratto.':
      owned<BigInt(size)?'Porta '+size+' unità di '+Inventory.definition(s,good).name+' (ne hai '+owned+').':'';
    return {name:CARGO.name,market:CARGO.market,level,contracts:st.contracts,good,goodName:good?Inventory.definition(s,good)?.name:null,
      gap:Math.round(gap*100),size,pay,available:!why,why,
      standing:st.contracts>=CARGO.partner?'Socio del Registro':st.contracts?'Mercante conosciuto al porto':'Sconosciuto al Registro',
      next:st.contracts<CARGO.partner?'Da '+CARGO.partner+' contratti il Registro affida carichi da '+CARGO.size[1]+' unità.':''};
  }
  // ------------------------------------------------------------------ taccuino dei prezzi visti di persona
  function note(s,marketId){
    const profile=Economy.profiles.find(p=>p.id===marketId);
    if(!profile||!s.economy)return;
    const prices={};
    for(const id of Object.keys(profile.goods)){const q=Economy.quote(s,marketId,id);if(q)prices[id]=[q.buy,q.sell];}
    state(s).seen[marketId]={day:today(s),prices};
  }
  // Per le merci del mercato corrente: il miglior prezzo di vendita annotato altrove (solo mercati già visitati).
  function notebook(s,marketId){
    const seen=state(s).seen,here=seen[marketId],rows=[];
    if(!here)return rows;
    for(const [good,[buy]] of Object.entries(here.prices)){
      let best=null;
      for(const [other,entry] of Object.entries(seen)){
        if(other===marketId||!entry.prices[good])continue;
        const sell=entry.prices[good][1];
        if(!best||sell>best.sell)best={market:other,sell,day:entry.day};
      }
      if(best&&best.sell>buy){
        const name=Economy.profiles.find(p=>p.id===best.market)?.name||best.market;
        rows.push({good,name:Inventory.definition(s,good)?.name||good,buy,sell:best.sell,market:name,day:best.day+1,margin:best.sell-buy});
      }
    }
    return rows.sort((a,b)=>b.margin-a.margin).slice(0,4);
  }
  function view(s,marketId){
    if(!s?.economy)return null;
    return {armory:marketId===ARMORY.market?armoryView(s):null,cargo:marketId===CARGO.market?cargoView(s):null,
      notebook:notebook(s,marketId),visited:Object.keys(state(s).seen).length,smith:state(s).smith,merchant:state(s).merchant};
  }

  // Comandi dal banco del mercato (Economy.command ha già controllato vicinanza e orario).
  function command(s,marketId,data){
    const st=state(s),day=today(s),fail=text=>({ok:false,text});
    if(data.op==='armoryOrder'){
      if(marketId!==ARMORY.market)return fail('L’armeria ordina solo al mercato dei Filoni.');
      const v=armoryView(s);
      if(!v.available)return fail(v.why);
      if(s.player.gold+v.pay>1e9)return fail('Versa parte del borsello in banca prima di questa consegna.');
      if(!Inventory.take(s,v.blade,1))return fail('Serve una lama di qualità almeno '+v.minQuality+'.');
      if(Economy.deliver(s,ARMORY.market,v.blade,1)!==1n){Inventory.add(s,v.blade,1);return fail('Il banco non può accogliere altre lame.');}
      s.player.gold+=v.pay;st.smith.orders++;st.smith.lastDay=day;
      window.Renown?.deed(s,{kind:'craft',market:ARMORY.market,text:'Ha rifornito l’Armeria del Passo con una lama '+QUALITY[BLADES.indexOf(v.blade)]});
      const promoted=st.smith.orders===ARMORY.trusted;
      return {ok:true,changed:true,text:'Ordine dell’armeria consegnato · '+v.bladeName+' · +'+v.pay+' Scintille'+(promoted?' · ora sei fornitore di fiducia: l’armeria chiederà lame ottime e pagherà di più':''),
        event:{id:'trade',amount:1,meta:{market:ARMORY.market,item:v.blade,direction:'sell',quantity:'1',kind:'armory-order'}}};
    }
    if(data.op==='cargoContract'){
      if(marketId!==CARGO.market)return fail('I contratti si firmano al Registro dei Carichi di Calis.');
      const v=cargoView(s);
      if(!v.available)return fail(v.why);
      if(s.player.gold+v.pay>1e9)return fail('Versa parte del borsello in banca prima di questa consegna.');
      const n=BigInt(v.size);
      if(!Inventory.take(s,v.good,n))return fail(v.why||'Merce insufficiente.');
      const moved=Economy.deliver(s,CARGO.market,v.good,n);
      if(moved!==n){Inventory.add(s,v.good,n-moved);if(moved>0n)Economy.procure(s,CARGO.market,v.good,moved);return fail('Il magazzino del porto non può accogliere l’intero carico.');}
      s.player.gold+=v.pay;st.merchant.contracts++;st.merchant.lastDay=day;
      window.Renown?.deed(s,{kind:'commerce',market:CARGO.market,text:'Ha consegnato un carico di '+v.goodName+' al Registro di Calis'});
      const promoted=st.merchant.contracts===CARGO.partner;
      return {ok:true,changed:true,text:'Contratto consegnato · '+v.size+' '+v.goodName+' · +'+v.pay+' Scintille'+(promoted?' · ora sei socio del Registro: i carichi saranno più grandi':''),
        event:{id:'trade',amount:1,meta:{market:CARGO.market,item:v.good,direction:'sell',quantity:String(v.size),kind:'cargo-contract'}}};
    }
    return fail('Operazione non disponibile.');
  }

  window.Careers={create,restore,view,note,command,rules:{ARMORY,CARGO}};
})();
