(() => {
  'use strict';
  /* Voci e fama regionale (Living World 2.0, incremento 5). Le imprese importanti del giocatore (aiuti, parola mancata, ordini
     dell'armeria, contratti di carico, richieste del mondo) diventano notizie che partono dal mercato del luogo e viaggiano
     lungo le rotte commerciali già esistenti (MarketFlows: giorni di viaggio delle carovane); arrivano in ogni continente dopo
     il percorso più breve. Nessuno sa una notizia prima che arrivi.
     Ogni continente le pesa con regole proprie e parametrizzate (che cosa vi è stimato o mal visto); la fama decade nel tempo.
     Quando una notizia nata altrove arriva a Vela, Tessa, Ivo o Nerea la ricordano «per sentito dire» (memoria del mondo,
     peso minore): un'impresa lontana cambia, dopo giorni, ciò che accade al borgo.
     Tutto si risolve al cambio di giorno (impulso a bassa frequenza), senza simulare NPC lontani. Dati in `s.renown`
     (schema 1); il ripristino scarta voci non valide e non rifiuta mai il salvataggio. */
  const SCHEMA=1,MAX_DEEDS=40,HALF_LIFE=20;
  // Regole regionali: peso di ogni tipo di impresa (positiva) e della parola mancata (negativa), per continente.
  const realms={
    vela:{continent:'Vaelthoria',culture:'Borghi della comunità',community:2,craft:1,commerce:1,broken:3,note:'Qui conta chi aiuta il borgo nei momenti di bisogno.'},
    filoni:{continent:'Nordharyn',culture:'Popolo dei filoni',community:1,craft:3,commerce:1,broken:2,note:'Qui si stima chi lavora bene il metallo.'},
    velaris:{continent:'Myrathen',culture:'Città delle botteghe',community:1,craft:1,commerce:2,broken:2,note:'Qui si stimano i commerci onesti fra le botteghe.'},
    namar:{continent:'Voryndhal',culture:'Savane dei granai',community:2,craft:1,commerce:1,broken:2,note:'Qui conta chi sostiene le comunità.'},
    calis:{continent:'Azheryon',culture:'Porti delle Sette Vele',community:1,craft:1,commerce:3,broken:3,note:'Qui conta la parola data nei carichi e nei contratti.'}
  };
  const kinds=['community','craft','commerce'];
  // Chi, al Borgo di Vela, si interessa a quale tipo di notizia lontana.
  const listeners={commerce:'merchant',craft:'smith',community:'elder'};
  const own=(o,k)=>!!o&&Object.hasOwn(o,k);
  const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
  const int=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
  const today=s=>Calendar.absoluteDays(s.calendar,s.time);

  function create(){return {schema:SCHEMA,seq:0,deeds:[]};}
  function restore(raw,s){
    const r=create();
    if(!object(raw)||raw.schema!==SCHEMA)return r;
    const now=s?.calendar?today(s):Infinity;
    if(int(raw.seq,0,1e9))r.seq=raw.seq;
    if(Array.isArray(raw.deeds))for(const d of raw.deeds.slice(-MAX_DEEDS)){
      if(object(d)&&int(d.id,0,r.seq)&&kinds.includes(d.kind)&&(d.sign===1||d.sign===-1)&&own(realms,d.market)&&int(d.day,0,now)&&
        typeof d.text==='string'&&d.text.length<=160&&typeof d.heard==='boolean'&&!r.deeds.some(x=>x.id===d.id))
        r.deeds.push({id:d.id,kind:d.kind,sign:d.sign,market:d.market,day:d.day,text:d.text,heard:d.heard||d.market==='vela'}); // rev-LW6-M6
    }
    return r;
  }
  const state=s=>s.renown||(s.renown=create());

  // Giorni di viaggio di una notizia fra due mercati: percorso più breve sulle rotte commerciali.
  let cache=null;
  function distances(){
    if(cache)return cache;
    const ids=Object.keys(realms),edges=MarketFlows.routesFor(Economy.profiles),out={};
    for(const from of ids){
      const dist=Object.fromEntries(ids.map(id=>[id,id===from?0:Infinity])),left=new Set(ids);
      while(left.size){
        let u=null;for(const id of left)if(u===null||dist[id]<dist[u])u=id;
        left.delete(u);
        for(const [a,b,days] of edges){const v=a===u?b:b===u?a:null;if(v&&dist[u]+days<dist[v])dist[v]=dist[u]+days;}
      }
      out[from]=dist;
    }
    return cache=out;
  }
  const arrival=(deed,market)=>deed.day+distances()[deed.market][market];

  // Registra un'impresa (dagli altri moduli). Una sola per tipo, segno e luogo nello stesso giorno.
  function deed(s,{kind,sign=1,market,text}){
    if(!kinds.includes(kind)||!own(realms,market)||typeof text!=='string')return null;
    const r=state(s),day=today(s);
    if(r.deeds.some(d=>d.kind===kind&&d.sign===sign&&d.market===market&&d.day===day))return null;
    const d={id:++r.seq,kind,sign,market,day,text:text.slice(0,160),heard:market==='vela'};
    r.deeds.push(d);
    if(r.deeds.length>MAX_DEEDS)r.deeds.splice(0,r.deeds.length-MAX_DEEDS);
    return d;
  }
  const weightOf=(realm,d)=>d.sign<0?-realm.broken:realm[d.kind];

  function view(s){
    const r=state(s),day=today(s);
    return Object.entries(realms).map(([market,realm])=>{
      let score=0;const known=[],coming=[];
      for(const d of r.deeds){
        const at=arrival(d,market);
        if(at<=day){score+=weightOf(realm,d)*Math.pow(.5,(day-at)/HALF_LIFE);known.push({text:d.text,day:at+1,origin:realms[d.market].continent,bad:d.sign<0});}
        else coming.push({text:d.text,day:at+1,origin:realms[d.market].continent});
      }
      score=Math.round(score*10)/10;
      const level=score<=-2?'Malvisto':score<1?'Sconosciuto':score<4?'Se ne parla':'Rinomato';
      return {market,continent:realm.continent,culture:realm.culture,note:realm.note,score,level,
        known:known.slice(-3).reverse(),coming:coming.sort((a,b)=>a.day-b.day).slice(0,3)};
    });
  }
  // Al cambio di giorno: le notizie nate lontano che sono arrivate a Vela diventano ricordi «per sentito dire».
  function tick(s){
    const r=s.renown,out=[];
    if(!r)return out;
    const day=today(s);
    for(const d of r.deeds){
      if(d.heard||arrival(d,'vela')>day)continue;
      d.heard=true;
      const npc=listeners[d.kind],kind=d.sign<0?'heard-blame':'heard-praise';
      if(window.WorldMemory?.note(s,npc,kind,{source:'rumor',day:arrival(d,'vela')}))
        out.push('A Vela arriva una voce da '+realms[d.market].continent+' · '+WorldMemory.people[npc].name+' ne ha sentito parlare');
    }
    return out;
  }

  window.Renown={create,restore,deed,view,tick,arrival,realms};
})();
