(() => {
  'use strict';
  /* Richieste del mondo (Living World 2.0, incremento 3). Un sistema leggero di eventi contestuali che affianca, senza
     sostituirli, campagna, incarichi giornalieri, commissioni e gilda. Ogni modello ha: condizioni verificabili sulle API
     esistenti (scorte e carenze dei mercati, stagione, mestieri, gilda, presenza dell'NPC), una fonte plausibile, un obiettivo
     chiaro, una durata, una ricompensa entro le fasce già in uso (15–40 Scintille, niente essenze né echi), conseguenze reali
     (merci consegnate al mercato con Economy.deliver, reputazione, memoria dell'NPC), protezione dal doppio pagamento e una
     pausa prima di potersi ripresentare.
     L'offerta del giorno resta valida per tutta la giornata una volta comparsa (diversamente dall'offerta di Daily, che può
     cambiare nello stesso giorno). Dati in `s.requests` (schema 1); il ripristino scarta voci non valide e non rifiuta mai il
     salvataggio. Le condizioni si valutano solo quando si apre il diario o un dialogo e nell'impulso a bassa frequenza. */
  const SCHEMA=1;
  const own=(o,k)=>!!o&&Object.hasOwn(o,k);
  const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
  const int=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
  const today=s=>Calendar.absoluteDays(s.calendar,s.time);
  const clampPay=n=>Math.max(15,Math.min(40,Math.round(n)));
  const sell=(s,market,id)=>Economy.quote(s,market,id)?.sell||0;

  function npcHere(s,id,range=48){
    if(s.region!=='valley'||!World.points?.[id]||Conflicts.takesOver(s,id))return false;
    const at=Conflicts.point(s,id,Life.npcPoint(s,id,World.points[id]));
    return !!at&&Math.hypot(s.player.x-at.x,s.player.y-at.y)<=range;
  }
  const npcAlive=(s,id)=>Conflicts.condition(s,id)?.status!=='dead';

  const templates=[
    {id:'wool-cloaks',name:'Lana per le mantelle d’inverno',from:'Ivo · bottega del Borgo di Vela',where:'Borgo di Vela, da Ivo',
      need:'Porta a Ivo 2 unità di lana: le cucirà in mantelle per chi parte al freddo.',days:2,cooldown:6,
      // Freddo in arrivo (autunno o inverno) oppure lana davvero scarsa al mercato di Vela; Ivo vivo.
      when:s=>{
        if(!npcAlive(s,'smith'))return 'Ivo non c’è più.';
        const season=Calendar.view(s.calendar,s.time,'valley').seasonId,short=Economy.shortage(s,'vela','wool');
        return season==='autumn'||season==='winter'||short>=.4?'':'Per ora la bottega ha lana a sufficienza.';
      },
      goal:{kind:'deliver',item:'wool',amount:2},
      atSource:s=>npcHere(s,'smith'),sourceHint:'Avvicinati a Ivo nel Borgo di Vela.',
      reward:s=>clampPay(2*sell(s,'vela','wool')+6),
      // Conseguenze: la lana torna al mercato di Vela (registro esatto) e Ivo ricorda l'aiuto, con i testimoni presenti.
      complete:(s,notes)=>{
        const moved=Economy.deliver(s,'vela','wool',2);
        const seen=window.WorldMemory?.note(s,'smith','request-kept',{witnesses:true})||[];
        notes.push('Ivo ricorderà il tuo aiuto'+(seen.length?' · l’hanno visto '+seen.join(' e '):'')+(moved>0n?' · la lana torna al mercato di Vela':''));
      },
      fail:(s,notes)=>{if(window.WorldMemory?.note(s,'smith','request-failed'))notes.push('Ivo ha atteso invano la lana: se ne ricorderà.');}},
    {id:'guild-tools',name:'Gli attrezzi della squadra',from:'Registro degli avventurieri',where:'qualunque Registro degli avventurieri',
      need:'Ripara o tempra due volte l’equipaggiamento a una forgia, poi torna al Registro.',days:3,cooldown:5,
      // Solo per chi è iscritto alla gilda e conosce la forgia (Praticante); una squadra ha sempre attrezzi da sistemare.
      when:s=>!s.guild?.joined?'Serve l’iscrizione alla gilda.':Life.level(s,'smith')<4?'La gilda cerca un fabbro almeno Praticante.':'',
      goal:{kind:'event',event:'gearWork',target:2,match:meta=>['repair','temper','ascend','enchant'].includes(meta.kind)},
      atSource:s=>!!Guild.view?.(s)?.board,sourceHint:'Torna a un Registro degli avventurieri.',
      reward:()=>24,
      complete:(s,notes)=>notes.push('La squadra parte con gli attrezzi sistemati.'),fail:()=>{}},
    {id:'galley-herbs',name:'Erbe per la cambusa',from:'Registro dei Carichi di Calis',where:'Porto di Calis, Registro dei Carichi',
      need:'Vendi almeno 3 erbe di rugiada insieme all’Emporio delle Sette Vele, poi torna al Registro dei Carichi.',days:2,cooldown:4,
      // Solo con una vera carenza di erbe al mercato di Calis.
      when:s=>Economy.shortage(s,'calis','herb')>=.4?'':'Alla cambusa di Calis le erbe non mancano.',
      goal:{kind:'event',event:'trade',target:1,match:meta=>meta.market==='calis'&&meta.item==='herb'&&meta.direction==='sell'&&BigInt(meta.quantity||0)>=3n},
      atSource:s=>!!window.UrbanWorld?.access(s,'cargo-board'),sourceHint:'Torna al Registro dei Carichi di Calis.',
      reward:()=>16,
      complete:(s,notes)=>notes.push('Le navi partono con la cambusa piena.'),fail:()=>{}}
  ];
  const lookup=Object.fromEntries(templates.map(t=>[t.id,t]));

  function create(){return {schema:SCHEMA,offered:{},active:{},claimed:{},done:{}};}
  function restore(raw,s){
    const r=create();
    if(!object(raw)||raw.schema!==SCHEMA)return r;
    const now=s?.calendar?today(s):Infinity;
    for(const key of ['offered','claimed'])if(object(raw[key]))for(const [id,day] of Object.entries(raw[key]))if(own(lookup,id)&&int(day,0,now))r[key][id]=day;
    if(object(raw.done))for(const [id,n] of Object.entries(raw.done))if(own(lookup,id)&&int(n,0,1e6))r.done[id]=n;
    if(object(raw.active))for(const [id,a] of Object.entries(raw.active)){
      const t=lookup[id];
      if(!t||!object(a)||!int(a.day,0,now)||!int(a.until,a.day,a.day+t.days)||!int(a.progress,0,t.goal.target||1))continue;
      r.active[id]={day:a.day,until:a.until,progress:a.progress};
    }
    return r;
  }
  const state=s=>s.requests||(s.requests=create());

  // Stato di un modello oggi: in corso, pronto, disponibile (offerta congelata per la giornata) o non disponibile con il motivo.
  function status(s,t,day=today(s)){
    const r=state(s),a=r.active[t.id];
    if(a){
      const ready=t.goal.kind==='deliver'?Inventory.quantity(s,t.goal.item)>=BigInt(t.goal.amount):a.progress>=t.goal.target;
      return {state:ready?'ready':'active',until:a.until,progress:a.progress};
    }
    if(own(r.claimed,t.id)&&day-r.claimed[t.id]<t.cooldown)return {state:'rest',why:'Già completata: si ripresenterà fra qualche giorno.'};
    if(r.offered[t.id]===day)return {state:'open'};
    const why=t.when(s);
    return why?{state:'closed',why}:{state:'open',fresh:true};
  }
  function view(s){
    if(!s?.requests&&!s?.calendar)return [];
    const day=today(s),r=state(s);
    return templates.map(t=>{
      const st=status(s,t,day);
      if(st.fresh)r.offered[t.id]=day; // da qui l'offerta resta valida per tutto il giorno
      const goal=t.goal.kind==='deliver'?'Consegna '+t.goal.amount+' '+(Inventory.definition(s,t.goal.item)?.name||t.goal.item)+' (ne hai '+Inventory.quantity(s,t.goal.item)+')':
        'Avanzamento '+(st.progress||0)+'/'+t.goal.target;
      return {id:t.id,name:t.name,from:t.from,where:t.where,need:t.need,goal,days:t.days,reward:t.reward(s),done:r.done[t.id]||0,
        state:st.state,why:st.why||'',left:st.until!==undefined?st.until-day:null,atSource:!!t.atSource(s),sourceHint:t.sourceHint};
    });
  }

  function command(s,data){
    const t=object(data)&&own(lookup,data.id)?lookup[data.id]:null,fail=text=>({ok:false,text});
    if(!t)return fail('Richiesta sconosciuta.');
    const r=state(s),day=today(s),st=status(s,t,day);
    if(data.op==='accept'){
      if(st.state!=='open')return fail(st.why||'Questa richiesta non è disponibile.');
      if(!t.atSource(s))return fail(t.sourceHint);
      r.offered[t.id]=day;r.active[t.id]={day,until:day+t.days,progress:0};
      return {ok:true,changed:true,text:'Richiesta accettata · '+t.name+' · entro il giorno '+(day+t.days+1)};
    }
    if(data.op==='claim'){
      if(st.state!=='ready')return fail(st.state==='active'?'Completa prima la richiesta.':'Non c’è nulla da riscuotere.');
      if(!t.atSource(s))return fail(t.sourceHint);
      const pay=t.reward(s);
      if(s.player.gold+pay>1e9)return fail('Versa parte del borsello in banca prima di riscuotere.');
      if(t.goal.kind==='deliver'&&!Inventory.take(s,t.goal.item,BigInt(t.goal.amount)))return fail('Ti manca ancora qualcosa da consegnare.');
      // Prima si chiude la richiesta, poi si paga: nessun doppio pagamento possibile.
      delete r.active[t.id];r.claimed[t.id]=day;r.done[t.id]=(r.done[t.id]||0)+1;
      const notes=[];t.complete(s,notes);
      s.player.gold+=pay;
      return {ok:true,changed:true,text:'Richiesta completata · '+t.name+' · +'+pay+' Scintille'+(notes.length?' · '+notes.join(' · '):''),xp:12};
    }
    return fail('Azione sconosciuta.');
  }
  // Avanzamento degli obiettivi a evento, dalla stessa chiamata che aggiorna gli incarichi giornalieri.
  function log(s,event,amount,meta){
    const r=s.requests,out=[];
    if(!r)return out;
    for(const [id,a] of Object.entries(r.active)){
      const t=lookup[id];
      if(t.goal.kind!=='event'||t.goal.event!==event||a.progress>=t.goal.target||t.goal.match&&!t.goal.match(meta||{}))continue;
      a.progress=Math.min(t.goal.target,a.progress+1);
      if(a.progress===t.goal.target)out.push('Richiesta pronta · '+t.name+' · '+t.sourceHint.replace(/\.$/,''));
    }
    return out;
  }
  // Impulso a bassa frequenza: solo le scadenze.
  function tick(s){
    const r=s.requests,out=[];
    if(!r)return out;
    const day=today(s);
    for(const [id,a] of Object.entries(r.active)){
      if(day<=a.until)continue;
      const t=lookup[id];delete r.active[id];r.claimed[id]=day; // scaduta: pausa come dopo un completamento, senza compenso
      const notes=[];t.fail(s,notes);
      out.push('Richiesta scaduta · '+t.name+(notes.length?' · '+notes.join(' · '):''));
    }
    return out;
  }

  window.Requests={create,restore,view,command,log,tick,templates:templates.map(t=>t.id)};
})();
