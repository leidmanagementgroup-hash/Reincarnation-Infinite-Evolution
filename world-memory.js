(() => {
  'use strict';
  /* Memoria del mondo (Living World 2.0, incremento 1).
     Gli NPC ricordano episodi concreti {npc, tipo, giorno, fonte}: «diretta» se vi hanno preso parte, «testimone» se erano
     presenti (vivi, al loro posto, entro il raggio d'ascolto). Nessuno sa ciò che non ha potuto vedere: il resto del mondo
     ne sente parlare solo attraverso la reputazione pubblica già esistente (Reputation).
     L'opinione non è salvata: si ricava dagli episodi con un peso per tipo, un decadimento nel tempo (metà ogni 10 giorni),
     al massimo un episodio per tipo e giorno e al massimo i tre più recenti per tipo. Così ripetere la stessa azione non fa
     salire l'opinione senza fine, e un torto si può recuperare con azioni coerenti nel tempo.
     Dati in `s.memory` (schema 1). Il ripristino scarta le voci non valide e non rifiuta mai il salvataggio (LW-SAV-01).
     Prototipo: Tessa, mercante del Borgo di Vela, e la carenza reale di erbe di rugiada del mercato di Vela. */
  const SCHEMA=1,MAX_EPISODES=60,HEARING=100,HALF_LIFE=10,PER_KIND=3,PROMISE_NEED=3,GIVE_MAX=3;
  const TRUST=1.5,DISTRUST=-1.5;
  const people={
    merchant:{name:'Tessa',region:'valley'},
    smith:{name:'Ivo',region:'valley'},
    elder:{name:'Nerea',region:'valley'}
  };
  const kinds={
    'shortage-help':{weight:2,text:'hai portato erbe di rugiada all’emporio durante la carenza'},
    'promise-kept':{weight:3,text:'hai mantenuto la parola: le erbe promesse sono arrivate in tempo'},
    'promise-broken':{weight:-5,text:'avevi promesso erbe di rugiada e non sono mai arrivate'},
    'saw-help':{weight:1,text:'ti ha visto portare erbe a Tessa durante la carenza'}
  };
  const own=(o,k)=>!!o&&Object.hasOwn(o,k);
  const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
  const int=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
  const today=s=>Calendar.absoluteDays(s.calendar,s.time);

  function create(){return {schema:SCHEMA,episodes:[],promise:null,reserveDay:-1};}
  function restore(raw,s){
    const m=create();
    if(!object(raw)||raw.schema!==SCHEMA)return m;
    const now=s?.calendar?today(s):Infinity;
    if(Array.isArray(raw.episodes)){
      for(const e of raw.episodes.slice(-MAX_EPISODES)){
        if(object(e)&&own(people,e.npc)&&own(kinds,e.kind)&&int(e.day,0,now)&&(e.source==='self'||e.source==='witness')&&
          !m.episodes.some(x=>x.npc===e.npc&&x.kind===e.kind&&x.day===e.day))m.episodes.push({npc:e.npc,kind:e.kind,day:e.day,source:e.source});
      }
    }
    const p=raw.promise;
    if(object(p)&&p.npc==='merchant'&&p.item==='herb'&&int(p.need,1,PROMISE_NEED)&&int(p.given,0,p.need)&&int(p.day,0,now)&&int(p.due,p.day,p.day+1))
      m.promise={npc:p.npc,item:p.item,need:p.need,given:p.given,day:p.day,due:p.due};
    if(int(raw.reserveDay,-1,now))m.reserveDay=raw.reserveDay;
    return m;
  }
  const state=s=>s.memory||(s.memory=create());

  // Un NPC può sapere di un episodio solo se è vivo, al suo posto (non in pattuglia, non critico) e nella regione.
  function placeOf(s,id){
    const who=people[id];
    if(!who||s.region!==who.region||!window.World?.points?.[id])return null;
    if(Conflicts.takesOver(s,id))return null;
    return Conflicts.point(s,id,Life.npcPoint(s,id,World.points[id]));
  }
  const alive=(s,id)=>Conflicts.condition(s,id)?.status!=='dead';
  function remember(s,npc,kind,source,day=today(s)){
    const m=state(s);
    if(m.episodes.some(e=>e.npc===npc&&e.kind===kind&&e.day===day))return false;
    m.episodes.push({npc,kind,day,source});
    if(m.episodes.length>MAX_EPISODES)m.episodes.splice(0,m.episodes.length-MAX_EPISODES);
    return true;
  }
  // Testimoni: gli altri NPC conosciuti presenti entro il raggio d'ascolto dal luogo dell'episodio.
  function witnesses(s,where,except){
    return Object.keys(people).filter(id=>{
      if(id===except)return false;
      const at=placeOf(s,id);
      return !!at&&Math.hypot(at.x-where.x,at.y-where.y)<=HEARING;
    });
  }

  function opinion(s,id,day=today(s)){
    const groups={};
    for(const e of state(s).episodes)if(e.npc===id)(groups[e.kind]||(groups[e.kind]=[])).push(e);
    let total=0;
    for(const [kind,list] of Object.entries(groups)){
      list.sort((a,b)=>b.day-a.day);
      for(const e of list.slice(0,PER_KIND))total+=kinds[kind].weight*Math.pow(.5,Math.max(0,day-e.day)/HALF_LIFE);
    }
    return Math.round(total*10)/10;
  }
  const level=v=>v<=DISTRUST?'Diffida di te':v<TRUST?'Ti conosce appena':v<4?'Ti stima':'Si fida di te';

  function herbsOwned(s){return Inventory.quantity(s,'herb');}
  function marketShort(s){return Economy.shortage(s,'vela','herb');}
  // Quante erbe si possono consegnare ora e quanto le paga l'emporio (prezzo di vendita del mercato, unità per unità).
  function offerFor(s){
    const q=Economy.quote(s,'vela','herb');
    if(!q)return null;
    const stock=BigInt(q.stock),room=BigInt(q.capacity)-stock,owned=herbsOwned(s);
    let count=BigInt(GIVE_MAX);
    if(owned<count)count=owned;
    if(room<count)count=room;
    if(count<=0n)return {count:0,pay:0,stock:q.stock,target:q.target};
    let pay=0;
    for(let i=0n;i<count;i++)pay+=Economy.quote(s,'vela','herb',stock+i).sell;
    return {count:Number(count),pay,stock:q.stock,target:q.target};
  }

  function merchantView(s){
    const m=state(s),day=today(s),short=marketShort(s),value=opinion(s,'merchant',day),offer=offerFor(s);
    const promise=m.promise?{...m.promise,dueLabel:'entro la sera del giorno '+(m.promise.due+1)}:null;
    const living=alive(s,'merchant');
    const give=!living?{ok:false,why:'Non c’è più nessuno a cui portarle.'}:
      !(short>0||promise)?{ok:false,why:'Per ora l’emporio ha erbe di rugiada a sufficienza.'}:
      !offer||offer.count<1?{ok:false,why:herbsOwned(s)<1n?'Non hai erbe di rugiada con te.':'Il magazzino dell’emporio è pieno.'}:
      {ok:true,count:offer.count,pay:offer.pay};
    const canPromise=living&&!promise&&short>0&&value>DISTRUST;
    const shopOpen=Calendar.view(s.calendar,s.time,'valley').shopOpen;
    const reserve={open:living&&value>=TRUST,used:m.reserveDay===day,shopOpen};
    const recent=m.episodes.filter(e=>e.npc==='merchant').slice(-3).reverse().map(e=>({day:e.day+1,text:kinds[e.kind].text,bad:kinds[e.kind].weight<0}));
    return {short,stock:offer?.stock??'0',target:offer?.target??0,opinion:value,level:level(value),give,promise,canPromise,
      distrust:value<=DISTRUST,reserve,recent};
  }
  function view(s){
    const day=today(s);
    return Object.entries(people).map(([id,who])=>{
      const list=state(s).episodes.filter(e=>e.npc===id);
      const value=opinion(s,id,day);
      return {id,name:who.name,alive:alive(s,id),opinion:value,level:level(value),
        episodes:list.slice(-3).reverse().map(e=>({day:e.day+1,text:kinds[e.kind].text,source:e.source,bad:kinds[e.kind].weight<0}))};
    });
  }

  // Comandi del dialogo con Tessa. Il motore ha già controllato vicinanza e presenza di Tessa.
  function command(s,op){
    const m=state(s),day=today(s),v=merchantView(s);
    if(op==='give'){
      if(!v.give.ok)return {ok:false,text:v.give.why};
      const count=BigInt(v.give.count);
      if(BigInt(Math.round(s.player.gold))+BigInt(v.give.pay)>1000000000n)return {ok:false,text:'Versa parte del borsello in banca prima di questa consegna.'};
      if(!Inventory.take(s,'herb',count))return {ok:false,text:'Non hai erbe di rugiada con te.'};
      const moved=Economy.deliver(s,'vela','herb',count);
      if(moved!==count){if(count>moved)Inventory.add(s,'herb',count-moved);if(moved===0n)return {ok:false,text:'Il magazzino dell’emporio è pieno.'};}
      const pay=moved===count?v.give.pay:Math.round(v.give.pay*Number(moved)/Number(count));
      s.player.gold+=pay;
      const notes=[];
      // Aiuto vero solo durante una carenza reale; altrimenti è una consegna promessa.
      if(v.short>0&&remember(s,'merchant','shortage-help','self',day)){
        const seen=witnesses(s,placeOf(s,'merchant')||World.points.merchant,'merchant').filter(id=>remember(s,id,'saw-help','witness',day));
        notes.push('Tessa ricorderà il tuo aiuto'+(seen.length?' · l’hanno visto '+seen.map(id=>people[id].name).join(' e '):''));
      }
      if(m.promise){
        m.promise.given=Math.min(m.promise.need,m.promise.given+Number(moved));
        if(m.promise.given>=m.promise.need){remember(s,'merchant','promise-kept','self',day);m.promise=null;notes.push('Promessa mantenuta');}
      }
      return {ok:true,changed:true,sound:'coin',text:'Consegnate '+moved+' erbe di rugiada a Tessa · +'+pay+' Scintille'+(notes.length?' · '+notes.join(' · '):''),
        trade:{quantity:moved,info:{kind:'tessa-herbs',market:'vela',item:'herb',direction:'sell',quantity:String(moved)}}};
    }
    if(op==='promise'){
      if(!v.canPromise)return {ok:false,text:v.distrust?'Tessa: «Dopo l’ultima volta preferisco non contarci.»':m.promise?'Hai già dato la tua parola a Tessa.':'Ora l’emporio non ha bisogno di erbe.'};
      m.promise={npc:'merchant',item:'herb',need:PROMISE_NEED,given:0,day,due:day+1};
      return {ok:true,changed:true,text:'Hai promesso a Tessa '+PROMISE_NEED+' erbe di rugiada entro la sera del giorno '+(day+2)+'.'};
    }
    return {ok:false,text:'Azione sconosciuta.'};
  }
  // Riserva: con la fiducia di Tessa, a emporio chiuso, una pozione messa da parte al giorno (stesso prezzo).
  function reserve(s){
    const v=merchantView(s);
    if(!v.reserve.open)return {ok:false,text:'Tessa non ti conosce ancora abbastanza per mettere da parte qualcosa.'};
    if(v.reserve.shopOpen)return {ok:false,text:'L’emporio è aperto: acquista al banco.'};
    if(v.reserve.used)return {ok:false,text:'Hai già ritirato la pozione messa da parte oggi.'};
    return {ok:true};
  }
  function useReserve(s){state(s).reserveDay=today(s);}

  // Impulso a bassa frequenza: solo scadenze delle promesse.
  function tick(s){
    const m=state(s),p=m.promise;
    if(!p)return [];
    if(!alive(s,p.npc)){m.promise=null;return ['La promessa a '+people[p.npc].name+' non ha più nessuno ad attenderla.'];}
    const day=today(s);
    if(day<=p.due)return [];
    m.promise=null;
    remember(s,p.npc,'promise-broken','self',p.due+1);
    return [people[p.npc].name+' ha atteso invano le erbe promesse: se ne ricorderà.'];
  }

  window.WorldMemory={create,restore,opinion,level,view,merchantView,command,reserve,useReserve,tick,people,kinds,
    rules:{HEARING,HALF_LIFE,PER_KIND,TRUST,DISTRUST,PROMISE_NEED,GIVE_MAX}};
})();
