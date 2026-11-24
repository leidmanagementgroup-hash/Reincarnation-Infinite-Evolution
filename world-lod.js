(() => {
  'use strict';
  /* Livelli di dettaglio dei luoghi (PERF-005, in ombra: non è nella build né collegato al motore).
     Ogni luogo del mondo ha un livello rispetto al luogo in cui si trova il giocatore:
       1 completo     il luogo corrente (al suo interno le entità vicine passano fra dettaglio pieno e semplificato con
                      un'isteresi: entityLevel);
       2 semplificato i luoghi collegati da un varco e, per le stanze, la città madre e le stanze sorelle: è l'anello che si
                      prepara in anticipo (caricamento progressivo) perché il giocatore può entrarci al prossimo passo;
       3 aggregato    gli altri luoghi dello stesso continente;
       4 strategico   i luoghi dei continenti confinanti;
       5 globale      i luoghi dei continenti più lontani.
     I livelli sono una funzione pura di (luoghi, luogo corrente): non si salvano. Un viaggio produce esattamente le transizioni
     dei luoghi che cambiano livello, prima le promozioni e poi i declassamenti; se c'è almeno una promozione, prima si risolve il
     tempo mancante (hooks.resolve, per esempio WorldSim.resolveAll), così ciò che viene promosso è già al minuto corrente.
     Il livello decide il dettaglio e le precedenze, mai l'esito: i sistemi del mondo hanno passi canonici uguali a ogni livello. */
  const DUNGEONS=new Set(['ardel-crypt','nadir-vault']); // Cripta delle Soglie e Volta del Nadir
  const ENTER=480,LEAVE=560;                            // isteresi delle entità vicine, in pixel
  const now_=()=>typeof performance!=='undefined'?performance.now():Date.now();

  // Luoghi dal mondo del gioco: tipo, continente, città madre delle stanze, collegamenti simmetrici dai varchi.
  function places(world){
    const regions=world?.regions||{},ids=Object.keys(regions).sort(),out=new Map();
    const parentOf=id=>{
      if(!regions[id].kind)return null;
      let best=null;
      for(const other of ids)if(other!==id&&!regions[other].kind&&id.startsWith(other+'-')&&(!best||other.length>best.length))best=other;
      return best;
    };
    for(const id of ids){
      const r=regions[id],parent=parentOf(id);
      const kind=r.kind?'interior':DUNGEONS.has(id)?'dungeon':id.startsWith('city-')?'city':r.settlement?'town':'wild';
      out.set(id,{id,continent:String(r.continent||''),kind,parent,links:new Set()});
    }
    const link=(a,b)=>{if(a!==b&&out.has(a)&&out.has(b)){out.get(a).links.add(b);out.get(b).links.add(a);}};
    for(const id of ids){
      for(const gate of regions[id].points?.gates||[])link(id,gate?.to);
      const parent=out.get(id).parent;if(parent)link(id,parent);
    }
    return ids.map(id=>{const p=out.get(id);return {...p,links:[...p.links].sort()};});
  }
  // Distanza fra continenti (in salti) a partire da quello indicato, dai collegamenti fra luoghi di continenti diversi.
  function continentHops(list,from){
    const adj=new Map(),byId=new Map(list.map(p=>[p.id,p]));
    for(const p of list)for(const q of p.links||[]){
      const other=byId.get(q);if(!other||other.continent===p.continent)continue;
      if(!adj.has(p.continent))adj.set(p.continent,new Set());
      adj.get(p.continent).add(other.continent);
    }
    const hops=new Map([[from,0]]),queue=[from];
    while(queue.length){const c=queue.shift();for(const n of adj.get(c)||[])if(!hops.has(n)){hops.set(n,hops.get(c)+1);queue.push(n);}}
    return hops;
  }
  function levels(list,current){
    const byId=new Map(list.map(p=>[p.id,p])),here=byId.get(current),out={};
    if(!here){for(const p of list)out[p.id]=5;return out;}
    const near=new Set(here.links||[]);
    if(here.parent)for(const p of list)if(p.parent===here.parent||p.id===here.parent)near.add(p.id);
    const hops=continentHops(list,here.continent);
    for(const p of list){
      if(p.id===current)out[p.id]=1;
      else if(near.has(p.id))out[p.id]=2;
      else if(p.continent===here.continent)out[p.id]=3;
      else out[p.id]=hops.get(p.continent)===1?4:5;
    }
    return out;
  }
  const create=(list,current)=>({schema:1,current,levels:levels(list,current)});
  // Viaggio verso «to»: aggiorna lo stato, poi chiama i gestori (ognuno isolato: un errore non ferma gli altri né il viaggio).
  function travel(state,list,to,hooks={}){
    const before=state.levels||{},after=levels(list,to),promotions=[],demotions=[],errors=[];
    for(const p of list){
      const from=before[p.id]??5,next=after[p.id];
      if(next<from)promotions.push({id:p.id,from,to:next});else if(next>from)demotions.push({id:p.id,from,to:next});
    }
    promotions.sort((a,b)=>a.to-b.to||(a.id<b.id?-1:a.id>b.id?1:0));
    demotions.sort((a,b)=>b.to-a.to||(a.id<b.id?-1:a.id>b.id?1:0));
    state.current=to;state.levels=after;
    const run=(fn,...args)=>{if(typeof fn!=='function')return;try{fn(...args);}catch(e){errors.push(String(e?.message||e));}};
    if(/*RISOLVI*/promotions.length)run(hooks.resolve);
    for(const t of promotions)run(hooks.promote,t.id,t.from,t.to);
    for(const t of demotions)run(hooks.demote,t.id,t.from,t.to);
    return {promotions,demotions,errors};
  }
  // Livello di un'entità nel luogo corrente (1 dettaglio pieno, 2 semplificato) con isteresi: niente oscillazioni sul bordo.
  function entityLevel(prev,distance){
    if(!Number.isFinite(distance))return 2;
    return prev===1?(distance>LEAVE?2:1):(distance<=ENTER?1:2);
  }
  // Caricamento progressivo: i luoghi che stanno per servire si preparano a quote nei fotogrammi; all'ingresso, se un luogo
  // non è ancora pronto, si prepara subito (ripiego sincrono, contato) così non compare nulla all'improvviso.
  const loader=()=>({queue:[],done:new Set(),errors:[],sync:0});
  function prepare(ld,ids){for(const id of ids)if(!ld.done.has(id)&&!ld.queue.includes(id))ld.queue.push(id);}
  function work(ld,fn,budgetMs=2,clock=now_){
    const begin=clock();let n=0;
    while(ld.queue.length){
      const id=ld.queue.shift();
      if(!ld.done.has(id)){try{fn(id);}catch(e){ld.errors.push({id,message:String(e?.message||e)});}ld.done.add(id);n++;}
      if(clock()-begin>=budgetMs)break;
    }
    return n;
  }
  function ensure(ld,id,fn){
    if(ld.done.has(id))return false;
    const i=ld.queue.indexOf(id);if(i>=0)ld.queue.splice(i,1);
    try{fn(id);}catch(e){ld.errors.push({id,message:String(e?.message||e)});}
    ld.done.add(id);ld.sync++;
    return true;
  }
  window.WorldLod={places,levels,create,travel,entityLevel,loader,prepare,work,ensure,thresholds:{enter:ENTER,leave:LEAVE},dungeons:[...DUNGEONS]};
})();
