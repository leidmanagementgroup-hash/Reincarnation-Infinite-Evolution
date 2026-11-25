/* Early-world patrols, wounds and human-readable consequences for living NPCs. */
(() => {
  'use strict';

  const common={
    elder:{name:'Nerea',role:'Custode',race:'elder',hp:68,attack:9},
    merchant:{name:'Tessa',role:'Mercante',race:'merchant',hp:72,attack:9},
    smith:{name:'Ivo',role:'Fabbro',race:'smith',hp:99,attack:15},
    'guard-valley':{name:'Mira',role:'Soldato',race:'human',hp:94,attack:12},
    'hound-valley':{name:'Selce',role:'Cane da guardia',race:'wolf',hp:64,attack:12}
  };
  const basePoints={
    'guard-valley':{region:'valley',x:716,y:606},
    'hound-valley':{region:'valley',x:742,y:594}
  };
  const label={healthy:'In salute',injured:'Ferito',critical:'Critico',dead:'Defunto'};
  const harm={wolf:18,moth:12,thorn:14,ember:19,scarab:18,sentinel:20,shardling:21,shade:20,crystalguard:24};
  const own=(o,k)=>o!=null&&Object.hasOwn(o,k);
  const obj=val=>val&&typeof val==='object'&&!Array.isArray(val);
  const valid=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
  const int=(n,min,max)=>Number.isInteger(n)&&valid(n,min,max);
  const bounds=1e10+1e4;
  const cap=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const dx=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const conditionKey=k=>own(label,k);
  /* PERF-005 fase 2: gli impulsi dei conflitti stanno su una griglia assoluta (multipli di 1,05 s di s.time) e durante un
     salto di tempo (sonno, aggiornamento senza fotogrammi) si risolvono tutti, ciascuno al proprio istante: una notte vissuta e
     una notte dormita producono gli stessi conflitti nelle regioni lontane. Durante un impulso s.time vale l'istante
     dell'impulso (posizioni, orari e scadenze sono quelli di quel momento) e torna al valore reale subito dopo. */
  const PULSE=1.05,MAX_PULSES=2400; // 2 400 impulsi = 42 minuti di s.time: più di un giorno intero di sonno (1 800 s)
  const RESCUE=105; // secondi di soccorso per chi è in stato critico
  /* RISK-013: regole dei conflitti ordinari (provvisorie e configurabili). Tempi in secondi di s.time (1 800 = un giorno). */
  const RULES={
    rest:300,                       // riposo fra uno scontro e il successivo della stessa persona
    shelter:.75,                    // un civile senza difensori si mette al riparo invece di affrontare la creatura
    baseWin:.55,winStep:.012,       // probabilità di respingere la creatura per turno; peso del divario fra forza e minaccia
    baseEscape:.76,escapeStep:.008, // probabilità di ritirarsi senza altri colpi
    glance:.8,                      // un colpo in ritirata è di striscio
    healMin:240,healSpan:2600,      // guarigione: poche ore per un graffio, oltre un giorno per una ferita grave
    aidBase:.42,aidHelper:.07,aidMax:.86,aidDanger:.012,aidHeal:3600, // soccorso dei vicini e convalescenza di due giorni
    graveShare:.5                   // colpo devastante: oltre metà dei PV massimi sotto zero, solo il giocatore può intervenire
  };
  // Si configura solo con valori finiti, non negativi e di regole esistenti: un NaN finirebbe nelle scadenze e il salvataggio
  // non si ricaricherebbe più. Dall'esterno si legge una copia congelata.
  function configure(patch){
    if(!obj(patch)||!Object.entries(patch).every(([k,v])=>own(RULES,k)&&Number.isFinite(v)&&v>=0&&v<=1e6))return false;
    Object.assign(RULES,patch);
    return true;
  }
  const TEAM_HEAL=170; // i compagni di gilda guariscono come prima (decisione del 2026-11-21 sui compagni in combattimento)
  let fights_=0;       // scontri davvero iniziati nella regione del giocatore (per il riassunto del risveglio; non salvato)
  const gear={Soldato:5,Fabbro:4,Avventuriero:4,'Cane da guardia':2,'Maestro itinerante':2,'Maestro di bottega':2};
  const agility={wolf:.08,elf:.06,goblin:.05,fairy:.08,dwarf:-.04,orc:-.02,elder:-.08};
  const fights=new Set(['Soldato','Cane da guardia','Avventuriero']);
  const elderly=n=>n.race==='elder'||(n.provider?.age||0)>=60;
  const stamp=s=>s.time;
  const livingStatus=(record)=>record?.status!=='critical'&&record?.status!=='dead';
  const validNames=()=>Object.keys(World.regions).filter(id=>id==='valley'||World.regions[id].settlement);
  const issue=(title,region,id,at)=>({title,region,id,at});
  function roll(seed,...tokens){
    let x=(seed|0)^0x51e8d925;
    for(const token of tokens)for(const ch of String(token))x=Math.imul(x^ch.codePointAt(0),16777619)>>>0;
    x=Math.imul(x^(x>>>15),0x45d9f3b);return ((x^(x>>>13))>>>0)/4294967296;
  }
  function create(s){
    const t=stamp(s);
    return {
      schema:1,people:{},regions:Object.fromEntries(validNames().map(id=>[id,{round:0,active:null,
        next:t+(id==='valley'?24:95+Math.floor(roll(s.seed,id)*170))}])),
      events:[],pulse:t,ritualUsed:false,mourning:{}
    };
  }
  function known(s,id){
    return typeof id==='string'&&(own(common,id)||own(s.society?.people,id)||
      s.society?.children?.some(child=>child.id===id)||
      id.startsWith('guard:')&&!!World.regions[id.slice(6)]?.settlement);
  }
  function identity(s,id){
    if(own(common,id))return common[id];
    if(id?.startsWith('guard:')){
      const site=World.regions[id.slice(6)]?.settlement;if(!site)return null;
      return {name:'Guardia di '+site.name,role:'Soldato',race:'orc',hp:87,attack:13};
    }
    const person=known(s,id)?Society.entry(s,id):null;
    if(!person)return null;
    const adventure=person.enrolled||person.adventurer;
    return {name:person.name,role:adventure?'Avventuriero':person.profession||'Residente',
      race:person.race,hp:adventure?86:78,attack:adventure?13:8,
      evolution:person.evolution||0,adult:person.adult,provider:person};
  }
  function atHome(s,id,knownIdentity){
    if(own(basePoints,id))return basePoints[id];
    if(own(common,id)){
      const info=World.regions.valley?.points?.[id];
      if(!info)return null;
      const base=s.region==='valley'?Life.npcPoint(s,id,info):info;
      return {region:'valley',x:base.x,y:base.y};
    }
    if(id?.startsWith('guard:')){
      const region=id.slice(6),site=World.regions[region]?.settlement;
      if(!site)return null;
      return {region,x:site.x-8,y:site.y+30};
    }
    return (knownIdentity||identity(s,id))?.provider?.location||null;
  }
  function pointValid(p){
    const reg=obj(p)&&own(World.regions,p.region)?World.regions[p.region]:null;
    return !!reg&&valid(p.x,0,reg.width)&&valid(p.y,0,reg.height);
  }
  function record(n,site){
    return {status:'healthy',hp:n.hp,maxHp:n.hp,experience:0,point:site,
      deadline:0,cause:'',last:0,kills:0,nearDeath:0,raised:false,witnessed:false};
  }
  const rec=(s,id)=>own(s.conflicts?.people,id)?s.conflicts.people[id]:null;
  // Probabilità individuali contro una creatura: forza, età, esperienza, equipaggiamento del mestiere, specie e pericolosità.
  function odds(n,p,type){
    const power=n.attack+Math.floor(n.hp/8)+(gear[n.role]||0)+(n.evolution||0)+Math.min(8,Math.floor((p?.experience||0)/6))-(elderly(n)?4:0);
    const threat=(harm[type]||19)+Math.round((window.Game?.codex?.[type]?.level||2)*1.5),gap=power-threat;
    return {power,threat,win:cap(RULES.baseWin+gap*RULES.winStep,.25,.85),
      escape:cap(RULES.baseEscape+gap*RULES.escapeStep+(agility[n.race]||0)-(elderly(n)?.04:0),.45,.97)};
  }
  const healTime=p=>RULES.healMin+Math.round(RULES.healSpan*(1-p.hp/p.maxHp)**1.5);
  // Soccorso dei vicini allo scadere dello stato critico: dipende da quanti sono in salute nel luogo e dal pericolo. I compagni di
  // gilda e chi ha subito un colpo devastante dipendono solo dal giocatore; esito deterministico (seme, persona, caduta).
  function aided(s,id,p){
    if(p.grave||s.guild?.team?.includes(id))return false;
    const region=p.point.region,node=s.conflicts.regions[region];
    if(!node)return false;
    // Anche un vicino ferito può chiamare aiuto (peso 0,5); chi è critico, morto o in viaggio col giocatore no.
    const helpers=roster(s,region).reduce((n,other)=>n+(other===id?0:canFight(s,other)?1:livingStatus(rec(s,other))?.5:0),0);
    if(!helpers)return false;
    const danger=harm[World.regions[region]?.points?.mobs?.[0]?.type]||19;
    return roll(s.seed,id,'aid',p.nearDeath)<cap(RULES.aidBase+RULES.aidHelper*helpers-(danger-14)*RULES.aidDanger,.15,RULES.aidMax);
  }
  function get(s,id,site,meta){
    if(!s.conflicts||!known(s,id))return null;
    const existing=rec(s,id);
    if(existing)return existing;
    const n=meta||identity(s,id);
    if(!n)return null;
    const pos=pointValid(site)?{region:site.region,x:site.x,y:site.y}:atHome(s,id,n);
    if(!pointValid(pos))return null;
    return s.conflicts.people[id]=record(n,{region:pos.region,x:pos.x,y:pos.y});
  }
  function restore(raw,s){
    if(raw===undefined)return create(s);
    if(!obj(raw)||raw.schema!==1||!obj(raw.people)||!obj(raw.regions)||!obj(raw.mourning)||
      !Array.isArray(raw.events)||raw.events.length>32||!valid(raw.pulse,0,bounds)||typeof raw.ritualUsed!=='boolean')return null;
    if(raw.ritualUsed&&(!window.Legendary?.ritualEarned?.(s)||Inventory.quantity(s,'echo-renewal')!==0n))return null;
    const base=create(s),people={},regions={},mourning={};
    let raised=0;
    for(const [id,p] of Object.entries(raw.people)){
      if(!known(s,id)||!obj(p)||!conditionKey(p.status)||!valid(p.maxHp,35,180)||!valid(p.hp,0,p.maxHp)||
        (livingStatus(p)?p.hp<=0:p.hp!==0)||!int(p.experience,0,1e8)||!int(p.kills,0,1e8)||!int(p.nearDeath,0,1e8)||
        typeof p.raised!=='boolean'||typeof p.witnessed!=='boolean'||!pointValid(p.point)||!valid(p.deadline,0,bounds)||
        typeof p.cause!=='string'||p.cause.length>90||!valid(p.last,0,stamp(s)+1e-4))return null;
      if(p.raised&&(!raw.ritualUsed||++raised>1))return null;
      people[id]={status:p.status,hp:p.hp,maxHp:p.maxHp,experience:p.experience,kills:p.kills,nearDeath:p.nearDeath,
        raised:p.raised,witnessed:p.witnessed,point:{region:p.point.region,x:p.point.x,y:p.point.y},deadline:p.deadline,cause:p.cause,last:p.last,
        ...(p.grave===true&&p.status==='critical'?{grave:true}:{})};
    }
    for(const [region,node] of Object.entries(raw.regions)){
      if(!own(base.regions,region)||!obj(node)||!int(node.round,0,1e8)||!valid(node.next,0,bounds))return null;
      const a=node.active;
      if(a!==null&&(!obj(a)||!known(s,a.id)||!people[a.id]||!pointValid(a.point)||a.point.region!==region||
        !int(a.mob,0,4096)||!valid(a.until,0,bounds)||!valid(a.enemyHp,0,400)||!valid(a.cd,0,15)||
        !valid(a.wind,0,4)||!valid(a.windLock,0,4)||!valid(a.off,0,bounds)||!valid(a.swing,0,2)||
        !['down','up','left','right'].includes(a.dir)||typeof a.moving!=='boolean'||
        typeof a.type!=='string'||!/^[a-z0-9-]{1,40}$/.test(a.type)))return null;
      const aCopy=a&&{id:a.id,mob:a.mob,until:a.until,enemyHp:a.enemyHp,cd:a.cd,wind:a.wind,windLock:a.windLock,off:a.off,swing:a.swing,
        dir:a.dir,moving:a.moving,type:a.type,point:{region,x:a.point.x,y:a.point.y}};
      regions[region]={round:node.round,next:node.next,active:aCopy};
    }
    for(const [id,v] of Object.entries(raw.mourning)){
      if(!own(World.regions,id)||!obj(v)||!int(v.deaths,1,1e8)||!valid(v.until,0,bounds))return null;
      mourning[id]={deaths:v.deaths,until:v.until};
    }
    if(!raw.events.every(e=>obj(e)&&own(World.regions,e.region)&&known(s,e.id)&&valid(e.at,0,stamp(s)+1e-4)&&
      typeof e.title==='string'&&e.title.length<=170))return null;
    // Un impulso oltre il prossimo confine della griglia (salvataggio alterato) congelerebbe i conflitti: si riporta al confine.
    const limit=stamp(s)+PULSE,pulse=Number.isFinite(limit)&&raw.pulse>limit+1e-6?limit:raw.pulse;
    return {schema:1,people,regions:{...base.regions,...regions},events:raw.events.map(e=>issue(e.title,e.region,e.id,e.at)),
      pulse,ritualUsed:raw.ritualUsed,mourning};
  }

  function condition(s,id){
    const p=rec(s,id);
    if(!p)return null;
    return {...p,label:label[p.status],canFight:p.status==='healthy',canInteract:livingStatus(p)};
  }
  function canInteract(s,id){return livingStatus(rec(s,id));}
  function canFight(s,id){const p=rec(s,id);return !p||p.status==='healthy';}
  function activeOf(s,id){
    if(!s.conflicts)return null;
    const active=s.conflicts.regions[s.region]?.active;
    return active?.id===id?active:null;
  }
  function takesOver(s,id){return !!activeOf(s,id)||!canInteract(s,id);}
  function point(s,id,home){
    const p=rec(s,id);
    if(!livingStatus(p))return p.point.region===s.region?p.point:null;
    return activeOf(s,id)?.point||home;
  }
  function fighting(s,monsterId){
    const a=s.conflicts?.regions[s.region]?.active;
    return !!a&&a.mob===monsterId&&(a.wind>0||a.swing>.1);
  }
  function monitor(s,id,title,point,events=[]){
    const state=s.conflicts,entry=issue(title,point.region,id,stamp(s));
    state.events.push(entry);
    if(state.events.length>32)state.events.shift();
    if(point.region===s.region&&dx(point,s.player)<440)events.push(title);
    return entry;
  }
  function down(s,id,p,events){
    const n=identity(s,id);
    p.status='dead';p.deadline=0;p.last=stamp(s);delete p.grave;
    const reg=p.point.region,state=s.conflicts;
    const prev=state.mourning[reg]||{deaths:0,until:0};
    state.mourning[reg]={deaths:Math.min(1e8,prev.deaths+1),until:stamp(s)+2*(window.Calendar?.secondsPerDay||1800)};
    monitor(s,id,(n?.name||'L’abitante')+' è morto. Resta un memoriale sul luogo.',p.point,events);
  }
  function damageNpc(s,id,amount,meta={}){
    const n=identity(s,id),site=meta.point&&{...meta.point,region:meta.point.region||s.region};
    if(!n||n.adult===false||!Number.isFinite(amount)||amount<=0)return {status:rec(s,id)?.status||'healthy',notices:[],hp:rec(s,id)?.hp||0};
    const p=get(s,id,site,n),out=[];
    if(!p||!livingStatus(p))return {status:p?.status||'healthy',notices:out,hp:p?.hp||0};
    const blow=cap(amount,1,180),excess=blow-p.hp;
    p.hp=Math.max(0,p.hp-blow);
    if(pointValid(site))p.point={region:site.region,x:site.x,y:site.y};
    p.last=stamp(s);
    p.cause=String(meta.cause||'Scontro con la fauna').slice(0,90);
    if(!p.hp){
      p.status='critical';p.deadline=stamp(s)+RESCUE;p.nearDeath++;
      if(excess>=p.maxHp*RULES.graveShare)p.grave=true;else delete p.grave; // nel salvataggio solo quando serve
      p.witnessed=p.point.region===s.region&&dx(p.point,s.player)<185;
      monitor(s,id,n.name+' è in stato critico. Portagli una pozione o due erbe.',p.point,out);
    }else if(p.hp<=p.maxHp*.42&&p.status==='healthy'){
      p.status='injured';p.deadline=stamp(s)+(s.guild?.team?.includes(id)?TEAM_HEAL:healTime(p));
      monitor(s,id,n.name+' è ferito e si ritira dal combattimento.',p.point,out);
    }
    return {status:p.status,notices:out,hp:p.hp};
  }
  function recover(s,id,p,op,notices=[]){
    const n=identity(s,id);
    p.hp=p.maxHp;p.status='healthy';p.deadline=0;p.cause='';p.last=stamp(s);p.witnessed=false;delete p.grave;
    monitor(s,id,(n?.name||'L’abitante')+(op==='ritual'?' è tornato in vita dopo il rito.':' ha ricevuto le cure e sta meglio.'),p.point,notices);
  }

  function siteFor(s,id,at,status,n){
    return {id,kind:'conflict',name:n.name,point:{x:at.x,y:at.y},x:at.x,y:at.y,range:27,
      text:status==='dead'?'Visita il memoriale di '+n.name:status==='critical'?'Soccorsi · '+n.name:status==='injured'?'Cura '+n.name:'Parla con '+n.name};
  }
  function sites(s){
    if(!s.conflicts)return [];
    const out=[];
    const guard=s.region==='valley'?'guard-valley':'guard:'+s.region;
    const extra=s.region==='valley'?[guard,'hound-valley']:[guard];
    for(const id of extra){
      const meta=identity(s,id),at=meta&&point(s,id,atHome(s,id,meta));
      if(at&&at.region===s.region&&livingStatus(rec(s,id)))out.push(siteFor(s,id,at,rec(s,id)?.status||'healthy',meta));
    }
    for(const [id,p] of Object.entries(s.conflicts.people)){
      if(p.status==='healthy'||p.point.region!==s.region||extra.includes(id)&&livingStatus(p))continue;
      const n=identity(s,id);
      const at=p.status==='injured'&&!s.guild?.team?.includes(id)?point(s,id,atHome(s,id,n))||p.point:p.point;
      if(n&&at.region===s.region)out.push(siteFor(s,id,at,p.status,n));
    }
    return out;
  }
  function local(s,id){
    return sites(s).find(o=>o.id===id&&dx(o.point,s.player)<=o.range)||null;
  }
  const fail=text=>({ok:false,text});
  function use(s,id){
    if(!local(s,id))return fail('Avvicinati per intervenire.');
    return {ok:true,panel:{id:'conflicts',detail:id}};
  }
  function ritualAvailable(s){
    return !s.conflicts.ritualUsed&&window.Legendary?.ritualEarned?.(s)&&Inventory.quantity(s,'echo-renewal')>=1n;
  }
  function command(s,d){
    if(!s?.conflicts||!obj(d)||!local(s,d.id))return fail('Raggiungi l’abitante o il suo memoriale.');
    const p=rec(s,d.id);
    if(!p)return fail('Quest’abitante è in salute.');
    if(d.op==='ritual'){
      if(p.status!=='dead'||!ritualAvailable(s))return fail('Il rito richiede l’Eco della Rinascita ancora integro.');
      if(!Inventory.take(s,'echo-renewal',1))return fail('Manca l’Eco della Rinascita.');
      s.conflicts.ritualUsed=true;
      const success=roll(s.seed,'rite',d.id)<.62;
      if(success){p.raised=true;recover(s,d.id,p,'ritual');}
      else monitor(s,d.id,'L’Eco s’è dissolto. Il memoriale rimane intatto.',p.point);
      return {ok:true,changed:true,text:success?'Il rito ha riportato in vita l’abitante.':'Il rito non è riuscito. L’Eco è stato consumato.',
        panel:{id:'conflicts',detail:d.id},event:{id:'npcRitual',amount:1,meta:{npc:d.id,success,region:p.point.region}}};
    }
    if(p.status!=='injured'&&p.status!=='critical'||p.status==='critical'&&p.deadline<=stamp(s))return fail('Quest’abitante non può ricevere cure ordinarie.');
    const id=d.op==='potion'?'potion':d.op==='herbs'?'herb':null;
    const taken=id==='herb'?2:1;
    if(!id||!Inventory.take(s,id,taken))return fail(id==='herb'?'Servono due erbe di rugiada.':'Serve una pozione di linfa.');
    const critical=p.status==='critical';
    recover(s,d.id,p,d.op);
    return {ok:true,changed:true,text:(identity(s,d.id)?.name||'L’abitante')+' torna in salute.',
      panel:{id:'conflicts',detail:d.id},event:{id:'npcRescue',amount:1,meta:{npc:d.id,critical,region:p.point.region}}};
  }
  // A healing technique cast beside a wounded inhabitant counts as timely care.
  function mend(s,id){
    const p=rec(s,id);
    if(!p||!['injured','critical'].includes(p.status)||p.status==='critical'&&p.deadline<=stamp(s))return null;
    if(p.point.region!==s.region||dx(p.point,s.player)>48)return null;
    const critical=p.status==='critical',notices=[];
    recover(s,id,p,'skill',notices);
    return {critical,region:p.point.region,name:identity(s,id)?.name||'L’abitante',notices};
  }
  function wounded(s){
    if(!s?.conflicts)return [];
    return Object.entries(s.conflicts.people).filter(([,p])=>(p.status==='injured'||p.status==='critical'&&p.deadline>stamp(s))&&
      p.point.region===s.region&&dx(p.point,s.player)<=48).map(([id])=>id);
  }
  function faction(s,region){
    const v=s.conflicts?.mourning[region];
    return v?{deaths:v.deaths,mourning:v.until>stamp(s),until:v.until}:{deaths:0,mourning:false,until:0};
  }

  function view(s,id){
    if(!s?.conflicts)return {entries:[],active:null,events:[],faction:{deaths:0,mourning:false},actions:[]};
    const selected=id&&describe(s,id),entries=Object.keys(s.conflicts.people).map(key=>describe(s,key)).filter(Boolean);
    const details=[];
    const able=!!selected&&!!local(s,id);
    if(able&&['injured','critical'].includes(selected.status)){
      const potion=Inventory.quantity(s,'potion')>=1n,herbs=Inventory.quantity(s,'herb')>=2n;
      details.push({op:'potion',label:'Usa 1 pozione di linfa',allowed:potion,reason:potion?'':'Serve una pozione.'});
      details.push({op:'herbs',label:'Usa 2 erbe di rugiada',allowed:herbs,reason:herbs?'':'Servono due erbe.'});
    }
    if(able&&selected.status==='dead'){
      details.push({op:'ritual',label:'Tenta il rito dell’Eco',allowed:!!ritualAvailable(s),
        reason:'Serve l’Eco del primo sovrano leggendario. Il rito può fallire.'});
    }
    const a=s.conflicts.regions[s.region]?.active;
    const active=a?{npc:describe(s,a.id),opponent:window.Game?.codex?.[a.type]?.name||a.type,point:a.point}:null;
    return {selected,entries,active,actions:details,events:s.conflicts.events.slice().reverse(),faction:faction(s,s.region),
      family:s.society?.partner&&rec(s,s.society.partner)?.status==='dead'?'La famiglia ha perso il proprio coniuge.':null};
  }
  function describe(s,id){
    const n=identity(s,id);if(!n)return null;
    const p=rec(s,id),at=p?.point||atHome(s,id,n);
    return {id,name:n.name,role:n.role,race:n.race,status:p?.status||'healthy',label:label[p?.status||'healthy'],
      hp:p?.hp??n.hp,maxHp:p?.maxHp??n.hp,experience:p?.experience||0,kills:p?.kills||0,cause:p?.cause||'',point:at,
      deadline:p?.status==='critical'?Math.max(0,Math.ceil(p.deadline-stamp(s))):null,raised:!!p?.raised};
  }

  function roster(s,region){
    const list=region==='valley'?['guard-valley','hound-valley','elder','merchant','smith']:['guard:'+region];
    if(region!=='valley')for(const [id,p] of Object.entries(s.society?.people||{})){
      if(p.region===region&&!s.guild?.team?.includes(id))list.push(id);
    }
    return list;
  }
  function candidates(s,region,node){
    const list=roster(s,region);
    if(!node.round&&region==='valley'&&canFight(s,list[0]))return [list[0]];
    if(node.round===1&&region==='valley'&&canFight(s,list[1]))return [list[1]];
    return list.filter(id=>canFight(s,id)&&!s.guild?.team?.includes(id));
  }
  function wild(s,region,site){
    const remote=region!==s.region;
    const current=remote?s.regions?.[region]?.monsters:s.monsters;
    const available=current||World.regions[region]?.points?.mobs?.map((m,i)=>({...m,id:i,hp:65,maxHp:65}))||[];
    const hostile=available.filter(m=>m.hp>0&&m.dead!==Infinity&&!(window.Game?.codex?.[m.type]?.boss)&&
      !['boss','kharun','syrava','asterion'].includes(m.type)&&dx(site,m)<480);
    return hostile.sort((a,b)=>{
      const score=m=>dx(m,site)-(m.type==='wolf'?70:0)-(m.type==='scarab'?20:0);
      return score(a)-score(b);
    })[0]||null;
  }
  function newConflict(s,region,node,out){
    const available=candidates(s,region,node);
    node.next=stamp(s)+90+Math.floor(roll(s.seed,region,node.round,'cool')*125);
    if(!available.length)return;
    // Chi ha combattuto da poco riposa; prima i difensori di mestiere, poi i civili (che di solito si mettono al riparo).
    const rested=available.filter(who=>{const p=rec(s,who);return !p||!p.last||stamp(s)-p.last>=RULES.rest;});
    const defenders=rested.filter(who=>fights.has(identity(s,who)?.role)),pool=defenders.length?defenders:rested;
    if(!pool.length)return;
    const id=pool[Math.floor(roll(s.seed,region,node.round,'who')*pool.length)];
    const n=identity(s,id),home=atHome(s,id,n);
    if(!n||!home||home.region!==region)return;
    if(!defenders.length&&roll(s.seed,region,node.round,'shelter')<RULES.shelter){node.round++;return;}
    const target=wild(s,region,home);
    if(!target)return;
    const p=get(s,id,home,n);
    if(!p||!canFight(s,id))return;
    node.active={id,mob:target.id,type:target.type,point:{region,x:home.x,y:home.y},until:stamp(s)+95,
      off:stamp(s)+9,enemyHp:target.hp,cd:.2,wind:0,windLock:1.2,swing:0,dir:'down',moving:false};
    node.round++;if(region===s.region)fights_++;
    monitor(s,id,n.name+' è di pattuglia ai margini della zona abitata.',home,out);
  }
  function endure(s,region,node,foeOut,out){
    const a=node.active;
    if(!a)return;
    const p=rec(s,a.id),n=identity(s,a.id);
    if(p&&canFight(s,a.id)&&n){
      if(foeOut){
        p.kills++;p.experience=Math.min(1e8,p.experience+4);
        if(n.provider?.enrolled)Society.train(s,a.id);
        monitor(s,a.id,n.name+' ha respinto la creatura e acquisito esperienza.',a.point,out);
      }
      p.last=stamp(s);
      if(p.hp<p.maxHp&&p.status==='healthy'){
        p.status='injured';p.deadline=stamp(s)+healTime(p);
      }
    }
    node.active=null;
    node.next=Math.max(node.next,stamp(s)+50+Math.floor(roll(s.seed,region,node.round,'rest')*80));
  }
  function remotePulse(s,region,node,out){
    const a=node.active;
    if(!a||a.off>stamp(s))return;
    const p=rec(s,a.id),n=identity(s,a.id);
    if(!p||!n||!livingStatus(p)){endure(s,region,node,false,out);return;}
    const sequence=Math.max(0,Math.floor((a.until-stamp(s))/9));
    const variance=roll(s.seed,region,node.round,sequence);
    const o=odds(n,p,a.type),strength=Math.max(6,(harm[a.type]||19)+Math.round(variance*15)-(gear[n.role]||0));
    if(p.status==='injured'){
      // Ritirata: chi è agile, forte o esperto si sgancia; altrimenti un colpo di striscio, non uno a piena forza.
      const full=/*RITIRATA*/false;
      if(full?variance>.84:variance>o.escape)out.push(...damageNpc(s,a.id,full?strength:Math.max(4,Math.round(strength*RULES.glance)),{point:a.point,cause:'Ritirata da uno scontro lontano'}).notices);
      endure(s,region,node,false,out);return;
    }
    if(variance<o.win||a.enemyHp<=8){
      p.experience=Math.min(1e8,p.experience+2);endure(s,region,node,true,out);return;
    }
    a.enemyHp=Math.max(1,a.enemyHp-n.attack-4);
    a.off=stamp(s)+12;
    const hit=damageNpc(s,a.id,strength,{point:a.point,cause:'Scontro lontano con la fauna'});
    out.push(...hit.notices);
    // Un civile colpito fugge subito; un difensore resiste finché può.
    const flees=!fights.has(n.role)&&p.hp<p.maxHp;
    if(!livingStatus(rec(s,a.id))||flees||stamp(s)>=a.until)endure(s,region,node,false,out);
  }
  function walkToward(a,goal,dt,walk,speed=51){
    const base=a.point,angle=Math.atan2(goal.y-base.y,goal.x-base.x);
    const step=Math.min(speed*dt,dx(base,goal));
    a.moving=false;
    if(step<.19)return;
    for(const variation of [0,.58,-.58,1.07,-1.07,1.55,-1.55]){
      const v=angle+variation,x=base.x+Math.cos(v)*step,y=base.y+Math.sin(v)*step;
      if(!walk(x,y,5))continue;
      a.dir=Math.abs(x-base.x)>Math.abs(y-base.y)?(x<base.x?'left':'right'):(y<base.y?'up':'down');
      base.x=x;base.y=y;a.moving=true;return;
    }
  }
  function localTick(s,node,dt,h,out){
    const active=node.active;
    if(!active)return;
    const m=s.monsters.find(enemy=>enemy.id===active.mob&&enemy.type===active.type);
    const p=rec(s,active.id),n=identity(s,active.id),region=s.region;
    if(!p||!n||!livingStatus(p)){endure(s,region,node,false,out);return;}
    if(!m||m.hp<=0){endure(s,region,node,true,out);return;}
    if(stamp(s)>=active.until){endure(s,region,node,false,out);return;}
    const walk=h.walk||World.canWalk;
    const distance=dx(active.point,m);
    active.cd=Math.max(0,active.cd-dt);active.windLock=Math.max(0,active.windLock-dt);
    active.swing=Math.max(0,active.swing-dt);
    const wildReach=m.type==='wolf'||m.type==='shade'?45:32;
    if(active.wind>0){
      active.wind=Math.max(0,active.wind-dt);
      if(active.wind<=0&&distance<=wildReach+10){
        const damage=(harm[m.type]||18)+Math.round(roll(s.seed,active.id,node.round,Math.floor(active.cd*10))*11);
        out.push(...damageNpc(s,active.id,damage,{point:active.point,cause:Game.codex?.[m.type]?.name||'Creatura selvatica'}).notices);
        if(!livingStatus(p)){endure(s,region,node,false,out);return;}
      }
    }
    if(p.status==='injured'){
      if(distance>wildReach+10||stamp(s)-p.last>5.5){endure(s,region,node,false,out);return;}
      if(distance<=wildReach&&active.wind===0&&active.windLock===0){active.wind=.38;active.windLock=1.16;}
      const from=active.point,home=atHome(s,active.id,n),back=home&&dx(from,home)>13&&dx(home,m)>distance?
        home:{x:from.x+(from.x-m.x||-1)*3,y:from.y+(from.y-m.y)*3};
      walkToward(active,back,dt,walk,26);
      return;
    }
    if(distance>19){
      const bridge=region==='valley'&&active.point.x<720&&m.x>700;
      const next=bridge?{x:active.point.x<609?609:active.point.x<698?699:722,y:608}:m;
      walkToward(active,next,dt,walk);
    }else active.moving=false;
    if(distance<=27&&active.cd<=0&&h.hitMob){
      active.cd=1.07;active.swing=.32;
      const support=Math.min(8,Math.floor(p.experience/6));
      const hit=h.hitMob(m,n.attack+support,active.id==='hound-valley'?'#d2dec0':'#efc582',active.id);
      if(hit!==false)p.experience=Math.min(1e8,p.experience+1);
      if(m.hp<=0){endure(s,region,node,true,out);return;}
    }
    if(distance<=24&&active.wind===0&&active.windLock===0){
      active.wind=.47;active.windLock=1.11;
    }
    p.point={...active.point};
  }
  function tick(s,delta,helpers={}){
    if(!s?.conflicts)return [];
    const dt=cap(delta||0,0,.12),state=s.conflicts;
    let notices=[];
    const now=s.time;
    if(now>=state.pulse){
      // Senza fotogrammi (dt nullo: sonno) anche lo scontro vicino al giocatore si risolve in forma astratta.
      const sleep=dt?null:sleepStart(s,state);
      let k=Math.ceil(state.pulse/PULSE-1e-9),count=0;
      try{
        for(;k*PULSE<=now&&count<MAX_PULSES;k++,count++){
          state.pulse=(k+1)*PULSE; // registrato prima: un errore a metà non fa ripetere un impulso già applicato
          s.time=k*PULSE;
          pulse(s,state,sleep,helpers,notices);
        }
      }finally{s.time=now;}
      if(k*PULSE<=now)state.pulse=(Math.floor(now/PULSE)+1)*PULSE; // oltre il tetto: il resto dell'intervallo non si recupera
      if(sleep)notices=wake(s,state,sleep,notices);
    }
    const current=state.regions[s.region];
    if(dt&&current?.active&&dx(current.active.point,s.player)<=410)localTick(s,current,dt,helpers,notices);
    return notices;
  }
  // Inizio di un sonno: chi è già in stato critico, lo stato di ognuno e i turni della regione del giocatore.
  function sleepStart(s,state){
    const status=new Map(Object.entries(state.people).map(([id,p])=>[id,p.status]));
    return {region:s.region,status,fights:fights_};
  }
  // Regola prudente (PERF-005 fase 2): nella regione del giocatore chi diventa critico mentre dorme non muore durante il sonno
  // e al risveglio ha di nuovo il tempo pieno per il soccorso; nelle regioni lontane vale l'equivalenza con il tempo vissuto.
  const spared=(sleep,id,p)=>!!sleep&&p.point.region===sleep.region&&sleep.status.get(id)!=='critical';
  // Fine del sonno: scadenze di soccorso dei risparmiati e un riassunto breve al posto di un avviso per ogni impulso.
  function wake(s,state,sleep,raw){
    const here=Object.entries(state.people).filter(([,p])=>p.point.region===sleep.region);
    for(const [id,p] of here)if(p.status==='critical'&&spared(sleep,id,p))p.deadline=Math.max(p.deadline,s.time+RESCUE);
    if(!raw.length)return raw;
    const names=ids=>{
      const list=ids.map(id=>identity(s,id)?.name||'L’abitante');
      return list.length>3?list.slice(0,3).join(', ')+' e altri '+(list.length-3):list.join(', ');
    };
    const changed=(status)=>here.filter(([id,p])=>p.status===status&&sleep.status.get(id)!==status).map(([id])=>id);
    const rounds=fights_-sleep.fights,fallen=changed('dead'),injured=changed('injured');
    const critical=here.filter(([,p])=>p.status==='critical'&&p.deadline>s.time).map(([id])=>id),out=[];
    if(rounds>0)out.push('Mentre riposavi: '+rounds+(rounds===1?' scontro':' scontri')+' ai margini della zona abitata.');
    if(fallen.length)out.push('Morti durante il riposo: '+names(fallen)+(fallen.length===1?'. Resta un memoriale sul luogo.':'. Restano i memoriali.'));
    if(critical.length)out.push('In stato critico: '+names(critical)+(critical.length===1?'. Portagli':'. Porta a ciascuno')+' una pozione o due erbe.');
    if(injured.length)out.push('Feriti: '+names(injured)+'.');
    return out.length?out:raw.slice(-1);
  }
  // Un impulso dei conflitti all'istante s.time: scadenze dello stato critico e delle ferite, nuovi scontri, scontri lontani.
  // sleep: stato d'inizio del sonno (null durante il gioco); nel sonno anche lo scontro vicino si risolve in forma astratta.
  function pulse(s,state,sleep,helpers,notices){
    const now=stamp(s);
    {
      for(const [id,p] of Object.entries(state.people)){
        if(p.status==='critical'){
          if(p.point.region===s.region&&dx(p.point,s.player)<185)p.witnessed=true;
          if(p.deadline<=now&&/*SOCCORSO*/aided(s,id,p)){
            p.status='injured';p.hp=Math.max(1,Math.round(p.maxHp*.2));p.deadline=now+RULES.aidHeal;p.last=now;p.witnessed=false;delete p.grave;
            monitor(s,id,(identity(s,id)?.name||'L’abitante')+' è stato soccorso dai vicini e ora è convalescente.',p.point,notices);
          }else if(p.deadline<=now&&!spared(sleep,id,p)){
            down(s,id,p,notices);
            if(p.witnessed)helpers.notify?.({id:'npc-neglect',npc:id,region:p.point.region});
          }
        }
        else if(p.status==='injured'&&p.deadline<=now){
          p.hp=p.maxHp;p.status='healthy';p.deadline=0;p.last=now;
        }
      }
      for(const [region,node] of Object.entries(state.regions)){
        if(!node.active&&node.next<=now)newConflict(s,region,node,notices);
        const a=node.active;
        if(a&&(sleep||region!==s.region||dx(a.point,s.player)>410))remotePulse(s,region,node,notices);
      }
    }
  }

  function marker(ctx,x,y,left,p){
    ctx.fillStyle='#1b292f';ctx.fillRect(x-8,y-left,16,4);
    ctx.fillStyle=p.status==='critical'?'#c46564':p.status==='injured'?'#e2bc7e':'#92c2a7';
    ctx.fillRect(x-7,y-left+1,Math.max(1,Math.round(14*p.hp/p.maxHp)),2);
  }
  function standing(ctx,n,at,t,active,p){
    ActorArt.draw(ctx,n.race,at.x,at.y,{t,dir:active?.dir||'down',moving:active?.moving||false,attack:active?.swing>.07,evolution:n.evolution||0});
    if(p)marker(ctx,at.x,at.y,30,p);
  }
  function actors(s,t=0){
    if(!s.conflicts)return [];
    const entries=[];
    const extra=s.region==='valley'?['guard-valley','hound-valley']:['guard:'+s.region];
    for(const id of extra){
      const n=identity(s,id),base=n&&atHome(s,id,n),p=rec(s,id);
      if(!base||!livingStatus(p)||activeOf(s,id))continue;
      entries.push({x:base.x,y:base.y,draw:c=>standing(c,n,base,t,null,p)});
    }
    const active=s.conflicts.regions[s.region]?.active;
    if(active){
      const a=active.point,n=identity(s,active.id),p=rec(s,active.id);
      if(n&&livingStatus(p))entries.push({x:a.x,y:a.y,draw:c=>{
        if(active.wind>0){
          c.save();c.strokeStyle='#ed9c6a';c.globalAlpha=.4+(.47-active.wind);
          c.beginPath();c.ellipse(a.x,a.y-1,17,8,0,0,Math.PI*2);c.stroke();c.restore();
        }
        standing(c,n,a,t,active,p);
      }});
    }
    for(const [id,p] of Object.entries(s.conflicts.people)){
      if(livingStatus(p)||p.point.region!==s.region)continue;
      const {x,y}=p.point;
      entries.push({x,y,draw:c=>{
        c.save();
        c.fillStyle='#273531';c.fillRect(x-9,y-5,18,7);
        c.fillStyle=p.status==='dead'?'#929891':'#c99770';c.fillRect(x-7,y-7,14,6);
        c.fillStyle=p.status==='dead'?'#3e5751':'#eeaa91';c.fillRect(x-2,y-13,4,5);
        if(p.status==='critical'){c.fillRect(x-1,y-24,3,9);c.fillRect(x-4,y-21,9,3);}
        else{c.fillStyle='#cdd3a9';c.fillRect(x-1,y-15,3,4);}
        c.restore();
      }});
    }
    return entries;
  }
  window.Conflicts={get rules(){return Object.freeze({...RULES});},configure,odds,create,restore,condition,canInteract,canFight,point,takesOver,fighting,damageNpc,sites,use,command,faction,view,tick,actors,mend,wounded};
})();

