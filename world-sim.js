(() => {
  'use strict';
  /* Orchestratore della simulazione del mondo a livelli (PERF-005, fase 1). Ogni sistema del mondo si registra con un livello
     (1 completo, 2 semplificato, 3 aggregato, 4 strategico, 5 globale), un passo in minuti di calendario, un tetto al recupero
     (maxChunks) e una funzione resolve(s, da, a) che risolve l'intervallo [da, a) in forma chiusa.
     - Intervalli allineati a una griglia assoluta (multipli del passo): una notte vissuta a piccoli passi e la stessa notte
       saltata dormendo producono gli stessi intervalli, quindi lo stesso mondo.
     - Ordine globale nel tempo: si risolve sempre l'intervallo che finisce prima fra tutti i sistemi (a parità, il livello più
       alto e poi l'ordine di registrazione); il risultato non dipende dal budget per fotogramma.
     - tick: aggiornamento per fotogramma con budget, senza mai comprimere. resolveAll: risoluzione completa (sonno,
       caricamento); solo qui, oltre maxChunks passi di ritardo, un intervallo «compresso» copre l'eccesso. È un'eccezione al
       contratto: equivale ai passi singoli solo se resolve è esatta in forma chiusa (i sistemi approssimati lo dichiarano).
     - Nessuna storia retroattiva: i sistemi noti alla creazione o al caricamento partono dal primo confine dopo quell'origine;
       se l'orologio non è valido l'origine si fissa al primo aggiornamento.
     - Un sistema la cui resolve lancia un errore viene isolato nella partita in cui è avvenuto (gli altri sistemi continuano,
       e una nuova partita o un altro salvataggio ripartono puliti); l'errore resta in failures(s).
     Stato in `s.world` (schema 1): origine e ultimo minuto risolto per sistema; il ripristino non rifiuta mai.
     In ombra: il modulo non è ancora nella build né collegato al motore (attende l'integrazione di Confluenza). */
  const SCHEMA=1;
  const systems=[],byId=new Map(),failed=new WeakMap(),due=new WeakMap();
  let busy=false;
  const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
  const validNow=n=>Number.isFinite(n)&&n>=0;
  const now_=()=>typeof performance!=='undefined'?performance.now():Date.now();
  // Sistemi isolati per guasto, per partita (chiave: lo stato s.world).
  const brokenOf=w=>{let m=failed.get(w);if(!m)failed.set(w,m=new Map());return m;};

  function register(id,spec){
    if(typeof id!=='string'||!id||id==='__proto__'||byId.has(id))throw new Error('WorldSim: identificatore non valido o già registrato: '+id);
    const {level,step,resolve,maxChunks}=object(spec)?spec:{};
    if(!Number.isInteger(level)||level<1||level>5)throw new Error('WorldSim: livello non valido per '+id);
    if(!Number.isInteger(step)||step<1)throw new Error('WorldSim: passo non valido per '+id);
    if(typeof resolve!=='function')throw new Error('WorldSim: manca resolve per '+id);
    if(!Number.isInteger(maxChunks)||maxChunks<1)throw new Error('WorldSim: tetto al recupero (maxChunks) obbligatorio per '+id);
    const sys={id,level,step,resolve,maxChunks,order:systems.length};
    systems.push(sys);byId.set(id,sys);
  }
  // Punto di partenza dei sistemi noti che non ne hanno ancora uno: primo confine dopo l'origine.
  function seed(w){
    if(w.origin===null)return;
    for(const sys of systems)if(!Object.hasOwn(w.resolved,sys.id))w.resolved[sys.id]=Math.ceil(w.origin/sys.step)*sys.step;
  }
  function create(now){
    const w={schema:SCHEMA,origin:validNow(now)?Math.floor(now):null,resolved:{}};
    seed(w);return w;
  }
  function restore(raw,now){
    const ok=validNow(now),w={schema:SCHEMA,origin:ok?Math.floor(now):null,resolved:{}};
    if(object(raw)&&raw.schema===SCHEMA&&object(raw.resolved))
      for(const [id,minute] of Object.entries(raw.resolved))
        if(id!=='__proto__'&&Number.isInteger(minute)&&minute>=0&&(!ok||minute<=now))w.resolved[id]=minute;
    seed(w);return w;
  }
  const next=(from,step)=>(Math.floor(from/step)+1)*step;
  // Prossimo intervallo di un sistema entro «now» (compresso solo se richiesto), oppure null.
  function chunk(w,sys,now,compress){
    const from=w.resolved[sys.id],last=Math.floor(now/sys.step)*sys.step;
    if(last<=from)return null;
    if(compress&&(last-from)/sys.step>sys.maxChunks)return {from,to:last-sys.maxChunks*sys.step,compressed:true};
    return {from,to:/*ALLINEA*/next(from,sys.step),compressed:false};
  }
  const before=(a,ca,b,cb)=>ca.to<cb.to||ca.to===cb.to&&(a.level>b.level||a.level===b.level&&a.order<b.order);
  function tick(s,now,options={}){
    if(busy)throw new Error('WorldSim: chiamata rientrante rifiutata');
    if(!validNow(now))return 0;
    const w=s.world;
    if(w.origin===null)w.origin=Math.floor(now);
    const known=due.get(w);
    if(known&&known.count===systems.length&&now<known.at)return 0; // nulla da risolvere: uscita immediata
    seed(w);
    const raw=options.budgetMs,budget=raw===Infinity||Number.isFinite(raw)?raw:2;
    const compress=options.compress===true,clock=options.clock||now_,begin=clock();
    const broken=brokenOf(w),active=systems.filter(sys=>!broken.has(sys.id)),pending=active.map(sys=>chunk(w,sys,now,compress));
    let done=0;
    busy=true;
    try{
      for(;;){
        let i=-1;
        for(let k=0;k<active.length;k++)if(pending[k]&&(i<0||before(active[k],pending[k],active[i],pending[i])))i=k;
        if(i<0)break;
        const sys=active[i],c=pending[i];
        try{sys.resolve(s,c.from,c.to,c.compressed?{compressed:true}:undefined);}
        catch(e){broken.set(sys.id,{id:sys.id,message:String(e?.message||e),at:c.from});pending[i]=null;continue;}
        w.resolved[sys.id]=c.to;done++;
        pending[i]=chunk(w,sys,now,compress);
        if(clock()-begin>=budget)break;
      }
    }finally{busy=false;}
    // Prossima scadenza: prima di allora i fotogrammi escono subito.
    let at=Infinity;
    for(const sys of active)if(!broken.has(sys.id))at=Math.min(at,next(w.resolved[sys.id],sys.step));
    due.set(w,{count:systems.length,at});
    return done;
  }
  const resolveAll=(s,now)=>tick(s,now,{budgetMs:Infinity,compress:true});
  // Minuti ancora da risolvere (il massimo fra i sistemi attivi).
  function lag(s,now){
    const w=s.world,origin=w.origin??Math.floor(now),broken=brokenOf(w);
    let most=0;
    for(const sys of systems){
      if(broken.has(sys.id))continue;
      const from=Object.hasOwn(w.resolved,sys.id)?w.resolved[sys.id]:Math.ceil(origin/sys.step)*sys.step;
      most=Math.max(most,Math.floor(now/sys.step)*sys.step-from);
    }
    return most;
  }
  const failures=s=>s?.world&&typeof s.world==='object'?[...brokenOf(s.world).values()].map(f=>({...f})):[];
  window.WorldSim={register,create,restore,tick,resolveAll,lag,failures,levels:{near:1,area:2,city:3,region:4,world:5}};
})();
