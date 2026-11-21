/* Velaris: persistent residents, street routines and commissions; no global NPC loop. */
(() => {
  'use strict';

  const cityId='city-velaris';
  const culture=['Scrupolosa','Riservata','Lungimirante','Cordiale','Metodica','Intraprendente','Paziente','Irrequieta','Pragmatica','Curiosa'];
  const given=['Ader','Bela','Ceyla','Darel','Erim','Faela','Gelin','Heral','Idra','Juna','Kerin','Lodar','Marei','Nolia','Orda','Perin',
    'Quen','Ravia','Sarela','Tovin','Una','Valer','Wen','Yorin','Zena','Ambra','Lume','Mira','Elian','Sena','Tao','Vesna','Vargo','Linai','Videl'];
  const surnames=['del Ponte','Lunargento','delle Rive','di Selvar','Brumaclara','Caldariva','Terralume','del Quadrivio',
    'delle Volte','Vetracupa','Cordeferro','al Tiglio','dei Mulini','della Torre','Semechiaro','Ferronodo'];
  const staff=[
    ['inn','Viola Brumachiara','human','Locandiera','Ricorda i viaggiatori che tornano alla sua tavola.'],
    ['shop','Ramel dei Mulini','goblin','Mercante','Registra ogni carico senza perdere il conto delle merci.'],
    ['forge','Velek Cordeferro','dwarf','Fabbro','Preferisce un buon acciaio a una grande promessa.'],
    ['guild','Kaia del Ponte','elf','Cancelliera della gilda','Accetta consegne per i magazzini della città.'],
    ['archive','Innel delle Volte','spirit','Archivista','Ordina testimonianze e itinerari nell’archivio.'],
    ['academy','Merio Semechiaro','dryad','Docente','Conosce sia il valore della teoria sia quello della pratica.']
  ];
  const tracks=[
    ['Portatore','market','plaza'],['Maniscalco','forge','plaza'],['Notaia','archive','market'],
    ['Cuoca','inn','market'],['Apprendista','academy','plaza'],['Scriba','archive','market'],
    ['Corriere','guild','market'],['Guardia civica','plaza','gate'],['Orticoltrice','market','plaza'],
    ['Carpentiere','forge','market'],['Mercante di stoffe','shop','plaza'],['Copista','academy','archive'],
    ['Carovaniera','gate','market'],['Cartografo','guild','archive'],['Tessitrice','market','inn'],
    ['Birraio','inn','market'],['Maestra d’acqua','plaza','inn'],['Erborista','market','academy'],
    ['Artigiana di cuoio','shop','market'],['Mediatore','plaza','guild']
  ];
  const fallbackRaces=[
    'human','goblin','elf','spirit','dryad','dwarf','orc','wolf','slime','vampire','kobold','triton','drake','skeleton','troll','golem'
  ];
  const resources={
    work:{name:'Trave di legno',base:4,rate:3,pay:7},
    ore:{name:'Minerale lucente',base:5,rate:4,pay:8},
    herb:{name:'Erba di rugiada',base:8,rate:5,pay:6},
    grain:{name:'Grano',base:7,rate:5,pay:6}
  };
  const amounts=Object.keys(resources);
  const charter='velaris-staff-guild';
  const profilesBySeed=new Map();
  const cached=new WeakMap();
  const own=(o,k)=>o!=null&&Object.hasOwn(o,k);
  const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const finite=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
  const integer=(n,a,b)=>Number.isInteger(n)&&finite(n,a,b);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const distance=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y);
  const present=region=>region===cityId||!!interiorKind(region);
  const minutePerSecond=()=>window.Calendar?.minutesPerSecond||.8;
  const clock=s=>window.Calendar?Calendar.timestamp(s.calendar,s.time):480+s.time*.8;
  const day=s=>Math.floor(clock(s)/1440);
  const minute=s=>((clock(s)%1440)+1440)%1440;
  const clockLabel=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(Math.floor(m%60)).padStart(2,'0');
  const limit=1e9;
  const close=260;
  const areaRadius=480;

  function hash(seed,tag){
    let h=(Number(seed)>>>0)^0x8f2f3b81;
    for(const ch of String(tag))h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;
    h=Math.imul(h^(h>>>16),0x45d9f3b);
    return (h^(h>>>16))>>>0;
  }

  function raceRows(){
    const real=window.Game?.races;
    return real?.length?real.map(r=>[r.id,r.name]):fallbackRaces.map(id=>[id,id]);
  }

  function profiles(seed){
    const race=raceRows(),signature=race.map(a=>a[0]).join(',');
    const key=(seed>>>0)+':'+signature;
    if(profilesBySeed.has(key))return profilesBySeed.get(key);
    const raceLabels=Object.fromEntries(race);
    const skins={wisp:'spirit'};
    const adults=race.flatMap(([id,label])=>[0,1].map(i=>{
      const key='velaris-'+id+'-'+i,n=hash(seed,key),spec=tracks[hash(seed,key+'job')%tracks.length];
      const first=given[n%given.length],surname=surnames[Math.floor(n/given.length)%surnames.length];
      return {id:key,name:first+' '+surname,race:id,raceName:label,skin:skins[id]||id,profession:spec[0],
        personality:culture[Math.floor(n/37)%culture.length]+'.',workKind:spec[1],pauseKind:spec[2],
        homeKey:hash(seed,key+'home'),timetable:hash(seed,key+'when'),tempo:42+Math.floor(n/117)%17,
        planBias:n,age:21+Math.floor(n/701)%36,staff:false};
    }));
    for(const [kind,name,race,profession,personality] of staff){
      const id='velaris-staff-'+kind,n=hash(seed,id);
      adults.push({id,name,race,raceName:raceLabels[race]||race,skin:own(raceLabels,race)?race:'human',
        profession,personality,workKind:kind,pauseKind:'plaza',homeKey:hash(seed,id+'home'),
        timetable:hash(seed,id+'when'),tempo:53,planBias:n,age:25+n%25,staff:true});
    }
    // Broad pastures and modern quarters use many repeated syllables. Resolve collisions in display name only.
    const seen=new Set();
    for(const p of adults){
      let base=p.name,i=2;
      while(seen.has(p.name))p.name=base+' '+(i++);
      seen.add(p.name);
    }
    const result={list:adults,lookup:Object.fromEntries(adults.map(p=>[p.id,p])),races:race};
    profilesBySeed.set(key,result);
    if(profilesBySeed.size>4)profilesBySeed.delete(profilesBySeed.keys().next().value);
    return result;
  }

  function quantities(key){return Object.fromEntries(amounts.map(id=>[id,key==='stock'?resources[id].base:0]));}
  function create(seed){
    return {schema:1,seed:Number(seed)>>>0,people:{},city:{lastDay:-1,stock:quantities('stock'),produced:quantities(),trade:0},
      mission:{active:null,claimed:-1,completed:0},pulse:0};
  }

  function restore(raw,s){
    if(raw===undefined)return create(s.seed);
    if(!object(raw)||raw.schema!==1||raw.seed!==(s.seed>>>0)||!object(raw.people)||!object(raw.city)||!object(raw.mission)||
      !integer(raw.city.lastDay,-1,day(s))||!integer(raw.city.trade,0,limit)||!finite(raw.pulse,0,1e10+100)||
      !integer(raw.mission.claimed,-1,day(s))||!integer(raw.mission.completed,0,limit))return null;
    const state=create(s.seed);
    for(const [id,items] of Object.entries(raw.people)){
      if(!own(profiles(s.seed).lookup,id)||!Array.isArray(items)||items.length>8)return null;
      if(!items.every(v=>object(v)&&['chat','gift'].includes(v.kind)&&integer(v.day,0,day(s))))return null;
      state.people[id]=items.map(({kind,day})=>({kind,day}));
    }
    for(const id of amounts){
      if(!integer(raw.city.stock?.[id],0,180)||!integer(raw.city.produced?.[id],0,limit))return null;
      state.city.stock[id]=raw.city.stock[id];state.city.produced[id]=raw.city.produced[id];
    }
    state.city.lastDay=raw.city.lastDay;state.city.trade=raw.city.trade;
    const active=raw.mission.active;
    if(active!==null){
      if(!object(active)||!integer(active.day,0,day(s))||active.day<=raw.mission.claimed)return null;
      state.mission.active={day:active.day};
    }
    state.mission.claimed=raw.mission.claimed;state.mission.completed=raw.mission.completed;state.pulse=raw.pulse;
    return state;
  }

  function interiorKind(region){
    return window.UrbanWorld?.kind?.(region)||(/^city-velaris-(inn|shop|forge|guild|archive|academy|house)$/.exec(region||'')?.[1]||null);
  }
  function exterior(s){
    return window.UrbanWorld?.exterior?.(s.seed)||window.UrbanExterior?.create?.(s.seed)||null;
  }
  function interior(s,kind){
    return window.UrbanWorld?.interior?.(kind,s.seed)||null;
  }
  function useRuntime(s){
    const key=s.urban,ext=exterior(s);
    if(!ext)return null;
    const old=cached.get(key);
    if(old?.ext===ext)return old;
    const data={ext,routes:new Map(),places:null,near:null};
    cached.set(key,data);
    return data;
  }
  function rawPoint(data){
    const q=data?.point||data;
    return q&&Number.isFinite(q.x)&&Number.isFinite(q.y)?{x:q.x,y:q.y}:null;
  }
  function stop(raw,name,kind,id){
    const p=rawPoint(raw);
    return p?{...p,name:raw.name||name,kind,id:id||raw.id||kind}:null;
  }
  function checkPathPoint(runtime,q){
    if(runtime.ext.canWalk&&!runtime.ext.canWalk(q.x,q.y,5))return false;
    if(window.World?.region===cityId&&World.canWalk)return World.canWalk(q.x,q.y,5);
    return true;
  }
  function sidestep(runtime,q,key,spread=12){
    const lead=[[-15,5],[15,5],[-14,10],[14,10],[0,18],[-8,-10],[8,-10],[0,0]];
    for(let k=0;k<lead.length;k++){
      const [x,y]=lead[(key+k)%lead.length],p={...q,x:q.x+Math.round(x*spread/12),y:q.y+Math.round(y*spread/12)};
      if(checkPathPoint(runtime,p))return p;
    }
    return q;
  }
  function allPlaces(runtime){
    if(runtime.places)return runtime.places;
    const ext=runtime.ext,services={},fallback={x:914,y:726,name:'Piazza di Velaris',id:'plaza',kind:'plaza'};
    for(const service of Object.values(ext.services||{})){
      const q=stop(service,service.name,service.kind,service.id);
      if(!q)continue;
      services[service.kind]=q;
    }
    const points=Object.values(ext.waypoints||{}).map((p,i)=>stop(p,'Via '+(i+1),'street',p.id||'street-'+i))
      .filter(Boolean).filter(q=>checkPathPoint(runtime,q));
    const squares=points.filter(p=>/plaz|piazz|mercat|market|quay|canal/i.test(p.id+' '+p.name));
    const plaza=squares[0]||points.find(p=>distance(p,fallback)<95)||fallback;
    const graphHomes=Object.values(ext.residences||{}).map((p,i)=>stop(p,'Corte '+(i+1),'home',p.id||'home-'+i)).filter(Boolean);
    const residential=graphHomes.length?graphHomes:points.filter(p=>!Object.values(services).some(q=>distance(p,q)<60));
    const market=squares.find(p=>/mercat|market/i.test(p.id+' '+p.name))||services.shop||plaza;
    const gate=points.find(p=>/gate|ingress|arriv/i.test(p.id+' '+p.name))||points[0]||plaza;
    const inn=services.inn||plaza;
    const homes=residential.length?residential:points.length?points:[plaza];
    runtime.places={homes,squares:squares.length?squares:[plaza,market],anchors:{...services,plaza,market,gate,inn}};
    return runtime.places;
  }

  function basePlan(s,p,runtime){
    const {homes,squares,anchors}=allPlaces(runtime);
    const standard=p.timetable,d=day(s),market=anchors.market;
    const homeBase=homes[p.homeKey%homes.length];
    const home=sidestep(runtime,{...homeBase,name:'Casa presso '+homeBase.name},p.planBias%8,9);
    const duty=anchors[p.workKind]||market;
    const work=p.staff?sidestep(runtime,duty,p.planBias%8,12):sidestep(runtime,duty,p.planBias%8,17);
    const rest=sidestep(runtime,anchors[p.pauseKind]||anchors.plaza,(p.planBias+3)%8,14);
    const errands=squares[(p.planBias+d)%squares.length]||rest;
    const evening=sidestep(runtime,(standard%6===0?anchors.inn:anchors.plaza),standard%8,16);
    const wake=p.staff?391:(342+standard%158);
    const lunch=p.staff?777+standard%17:687+standard%179;
    const shiftEnd=p.staff?1200:1032+standard%136;
    const night=p.staff?1336:Math.max(shiftEnd+92,1196+standard%143);
    const schedule=[
      {at:0,point:home,label:'Riposo in casa',inside:'house'},
      {at:wake,point:work,label:'Inizio del turno',inside:p.staff?p.workKind:null},
      {at:lunch,point:p.staff?work:rest,label:p.staff?'Turno al banco':'Pausa di metà giornata',inside:p.staff?p.workKind:null},
      {at:lunch+48,point:work,label:'Riprende il lavoro',inside:p.staff?p.workKind:null},
      {at:shiftEnd,point:errands,label:'Commissioni di fine turno',inside:null},
      {at:shiftEnd+75,point:evening,label:'Passeggiata serale',inside:null},
      {at:night,point:home,label:'Rientro a casa',inside:'house'}
    ].sort((a,b)=>a.at-b.at);
    return {home,work,schedule};
  }
  // Distanza minima desiderata fra due residenti fermi nello stesso momento.
  const gap=15;
  function ring(bias){
    const out=[{x:0,y:0}];
    for(const [r,n] of [[15,8],[26,12],[38,16],[50,20],[62,24],[75,28],[88,32]])
      for(let i=0;i<n;i++){const a=((i+bias%n)%n)/n*Math.PI*2;out.push({x:Math.round(Math.cos(a)*r),y:Math.round(Math.sin(a)*r*.8)});}
    return out;
  }
  // Piano giornaliero di tutti i residenti, con le soste distribuite: in uno stesso intervallo
  // nessuno occupa il posto di un altro. Deterministico (ordine dei profili), calcolato una volta al giorno.
  function spread(s,runtime){
    const d=day(s);
    if(runtime.plans&&runtime.plansDay===d)return runtime.plans;
    const plans=new Map(),placed=[];
    for(const p of profiles(s.seed).list){
      const plan=basePlan(s,p,runtime),list=plan.schedule;
      const schedule=list.map((entry,i)=>{
        const from=entry.at,to=i+1<list.length?list[i+1].at:1440,base=entry.point;
        const busy=placed.filter(o=>o.from<to&&from<o.to&&distance(o.point,base)<gap+95);
        let pick=base;
        if(busy.some(o=>distance(o.point,base)<gap)){
          // Primo posto libero a distanza ≥ gap; se la zona è satura, il più lontano dagli altri.
          let best=-1;pick=base;
          for(const o of ring(p.planBias)){
            const q={...base,x:base.x+o.x,y:base.y+o.y};
            const room=busy.reduce((m,b)=>Math.min(m,distance(b.point,q)),1e9);
            if(room<=best)continue;
            if(o.x||o.y){if(!checkPathPoint(runtime,q)||!straight(runtime,base,q))continue;}
            best=room;pick=q;
            if(room>=gap)break;
          }
          if(best<gap){
            // Zona stretta o satura: prova i nodi stradali vicini, raggiungibili dal percorso.
            for(const w of Object.values(runtime.ext.waypoints||{})){
              const q=rawPoint(w);
              if(!q||distance(q,base)>130||!checkPathPoint(runtime,q))continue;
              const room=busy.reduce((m,b)=>Math.min(m,distance(b.point,q)),1e9);
              if(room<=best||!route(runtime,base,q))continue;
              best=room;pick={...base,x:q.x,y:q.y};
              if(room>=gap)break;
            }
          }
        }
        placed.push({from,to,point:pick});
        return pick===base?entry:{...entry,point:pick};
      });
      plans.set(p.id,{home:schedule[0].point,work:plan.work,schedule});
    }
    runtime.plans=plans;runtime.plansDay=d;
    return plans;
  }
  function dailyPlan(s,p,runtime){
    return spread(s,runtime).get(p.id)||basePlan(s,p,runtime);
  }
  function samplePlan(plan,now){
    const list=plan.schedule;
    const idx=list.findLastIndex(x=>x.at<=now);
    const here=list[idx];
    return {time:now,now:here,previous:idx>0?list[idx-1]:here};
  }
  function coarse(part,tempo){
    const a=part.previous.point,b=part.now.point,gap=distance(a,b);
    const progress=gap<1?1:clamp((part.time-part.now.at)/minutePerSecond()*tempo/Math.max(1,gap*1.38),0,1);
    return {x:a.x+(b.x-a.x)*progress,y:a.y+(b.y-a.y)*progress,progress};
  }
  function straight(runtime,a,b){
    const d=distance(a,b),steps=Math.max(1,Math.ceil(d/3));
    for(let i=0;i<=steps;i++)if(!checkPathPoint(runtime,{x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps}))return false;
    return true;
  }
  function route(runtime,a,b){
    if(distance(a,b)<1)return {points:[a],sum:0,lengths:[0]};
    const key=[a.x,a.y,b.x,b.y].join('/');
    if(runtime.routes.has(key))return runtime.routes.get(key);
    const out=runtime.ext.path?.(a,b,5);
    const given=Array.isArray(out)?out:out?.points;
    let points=given?.map(rawPoint).filter(Boolean)||[];
    if(!points.length&&straight(runtime,a,b))points=[a,b];
    if(points.length){
      if(distance(points[0],a)>1)points.unshift(a);
      if(distance(points.at(-1),b)>1)points.push(b);
      if(!points.slice(1).every((v,i)=>straight(runtime,points[i],v)))points=[];
    }
    const lengths=[0];
    for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+distance(points[i-1],points[i]));
    const result=points.length?{points,lengths,sum:lengths.at(-1)}:null;
    runtime.routes.set(key,result);
    if(runtime.routes.size>380)runtime.routes.delete(runtime.routes.keys().next().value);
    return result;
  }

  function direction(a,b){
    return Math.abs(b.x-a.x)>Math.abs(b.y-a.y)?b.x>a.x?'right':'left':b.y>a.y?'down':'up';
  }
  function sampleStreet(s,p,plan,runtime){
    const part=samplePlan(plan,minute(s)),a=part.previous.point,b=part.now.point;
    const progress=Math.max(0,(part.time-part.now.at)/minutePerSecond())*p.tempo;
    if(distance(a,b)<1)
      return {point:b,activity:part.now.label,moving:false,inside:part.now.inside,dir:'down'};
    const road=route(runtime,a,b);
    if(!road)
      return {point:a,activity:part.previous.label,moving:false,inside:part.previous.inside,dir:'down'};
    if(progress>=road.sum)
      return {point:b,activity:part.now.label,moving:false,inside:part.now.inside,dir:'down'};
    const index=Math.max(1,road.lengths.findIndex(q=>q>=progress));
    const lo=road.points[index-1],hi=road.points[index];
    const t=(progress-road.lengths[index-1])/Math.max(1e-9,road.lengths[index]-road.lengths[index-1]);
    return {point:{x:lo.x+(hi.x-lo.x)*t,y:lo.y+(hi.y-lo.y)*t,name:b.name},activity:'In cammino · '+b.name,
      moving:true,inside:null,dir:direction(lo,hi)};
  }
  function interiorPoint(s,p,kind){
    const room=interior(s,kind);
    const all=room?.npcLocations||room?.region?.npcLocations;
    const q=Array.isArray(all)?(all.find(v=>v.id===kind)||all[0]):all?.[kind]||all;
    const point=rawPoint(q);
    if(point&&(!World.canWalk||World.canWalk(point.x,point.y,5)))return point;
    const backup={inn:{x:521,y:272},shop:{x:384,y:180},forge:{x:361,y:234},guild:{x:429,y:211},archive:{x:434,y:218},academy:{x:421,y:246}}[kind];
    return backup&&(!World.canWalk||World.canWalk(backup.x,backup.y,5))?backup:null;
  }

  function localActors(s){
    if(!s?.urban||!present(s.region))return [];
    const runtime=useRuntime(s);
    if(!runtime)return [];
    const region=s.region,kind=interiorKind(region),now=clock(s),near=runtime.near;
    const tag=kind||cityId;
    if(!near||near.tag!==tag||Math.abs(near.at-now)>.6||distance(near,s.player)>98){
      const possible=[];
      for(const p of profiles(s.seed).list){
        if(kind&&(!p.staff||p.workKind!==kind))continue;
        const plan=dailyPlan(s,p,runtime),phase=samplePlan(plan,minute(s));
        if(kind||distance(coarse(phase,p.tempo),s.player)<areaRadius+170)possible.push({p,plan});
      }
      runtime.near={tag,at:now,x:s.player.x,y:s.player.y,possible};
    }
    const out=[];
    for(const {p,plan} of runtime.near.possible){
      const status=sampleStreet(s,p,plan,runtime);
      let point=status.point;
      if(kind){
        if(status.inside!==kind||status.moving)continue;
        point=interiorPoint(s,p,kind);
      }else if(status.inside&&(status.inside!=='house'||p.planBias%4!==0)){
        // A minority of residents remain at their own threshold in the evening.
        continue;
      }
      if(!point||!kind&&distance(point,s.player)>areaRadius)continue;
      out.push({p,plan,status,point});
    }
    return out;
  }

  function memories(s,id){
    const entries=s.urban.people[id]||[];
    return entries.map(({kind,day})=>({kind,day:day+1,text:kind==='chat'?'Una conversazione a Velaris':'Un dono di erba di rugiada'}));
  }
  function memorise(s,id,kind){
    const values=s.urban.people[id]||[],d=day(s);
    if(values.some(v=>v.kind===kind&&v.day===d))return false;
    values.push({kind,day:d});
    s.urban.people[id]=values.slice(-8);
    return true;
  }
  function expose(s,o){
    const {p,plan,status,point}=o;
    const recall=memories(s,p.id);
    return {id:p.id,name:p.name,age:p.age,race:p.race,raceName:p.raceName,profession:p.profession,personality:p.personality,
      activity:status.activity,home:plan?.home.name||'Velaris',work:plan?.work.name||p.profession,
      schedule:plan?.schedule.map(x=>({at:clockLabel(x.at),label:x.label,where:x.point.name}))||[],
      memories:recall,trust:recall.reduce((sum,m)=>sum+(m.kind==='gift'?2:1),0),
      region:point?s.region:null,point,moving:!!status.moving};
  }
  function selectedView(s,id,local){
    const existing=local.find(x=>x.p.id===id);
    if(existing)return expose(s,existing);
    if(!own(profiles(s.seed).lookup,id))return null;
    const p=profiles(s.seed).lookup[id],runtime=present(s.region)?useRuntime(s):null;
    const plan=runtime?dailyPlan(s,p,runtime):null;
    const phase=plan?samplePlan(plan,minute(s)).now:null;
    return expose(s,{p,plan,status:{activity:phase?.label||'A Velaris',moving:false},point:null});
  }
  function nearby(s,id){
    return localActors(s).find(c=>c.p.id===id&&distance(c.point,s.player)<=25)||null;
  }

  function offer(s){
    const q=s.urban.mission,d=q.active?.day??day(s);
    if(q.claimed>=d)return null;
    const n=hash(s.seed,'commission-'+d),item=amounts[n%amounts.length],record=resources[item];
    return {id:'velaris-care-'+d,name:'Materiali per il quartiere',item,itemName:record.name,amount:2+(n>>>12)%3,
      reward:record.pay*(2+(n>>>12)%3)+7,day:d+1,accepted:!!q.active,claimed:false};
  }

  function stockMarket(s,id,received){
    const stock=s.urban.city.stock;
    const surplus=Math.max(0,stock[id]-resources[id].base);
    const delivered=window.Economy?.supplyVelarisMarket(s,id,BigInt(Math.min(surplus,received)))??0n;
    stock[id]-=Number(delivered);
  }

  function tick(s,delta,worldAccess){
    if(!s?.urban||s.urban.pulse>s.time)return [];
    const state=s.urban,city=state.city,now=day(s);
    state.pulse=s.time+3;
    if(city.lastDay<0){city.lastDay=now;return [];}
    if(now===city.lastDay)return [];
    const passed=Math.max(0,now-city.lastDay);
    city.lastDay=now;
    if(!passed)return [];
    const bonuses=now%7===0?1:0;
    for(const id of amounts){
      const output=passed*resources[id].rate+bonuses;
      city.produced[id]=Math.min(limit,city.produced[id]+output);
      city.stock[id]=Math.min(180,city.stock[id]+output);
      stockMarket(s,id,output);
    }
    return present(s.region)?['I mestieri di Velaris rinnovano le scorte all’alba.']:[];
  }

  function sites(s){
    return localActors(s).filter(a=>distance(a.point,s.player)<close)
      .map(({p,point})=>({id:p.id,kind:'urban-resident',point:{x:point.x,y:point.y},range:24,text:'Parla con '+p.name}));
  }
  function actors(s,t=0){
    return localActors(s).map(({p,point,status})=>{
      return {x:point.x,y:point.y,draw:ctx=>ActorArt.draw(ctx,p.skin,point.x,point.y,
        {t:t+(p.planBias%15)*.13,dir:status.dir||'down',moving:status.moving})};
    });
  }
  function use(s,id){
    return nearby(s,id)?{ok:true,panel:{id:'urban',detail:id}}:{ok:false,text:'Avvicinati all’abitante.'};
  }
  function available(s,info){
    if(!info?.point||distance(info.point,s.player)>25)return [];
    const prior=s.urban.people[info.id]||[],now=day(s),quest=info.id===charter?offer(s):null;
    const mark=(op,label,reason='',extra={})=>({op,id:info.id,label,allowed:!reason,reason,...extra});
    const has=kind=>prior.some(m=>m.kind===kind&&m.day===now);
    const choices=[
      mark('chat','Conversa',has('chat')?'Avete già parlato oggi.':''),
      mark('gift','Offri un’erba',has('gift')?'Hai già portato un dono oggi.':Inventory.quantity(s,'herb')<1n?'Serve 1 erba.':'')
    ];
    if(quest){
      if(!quest.accepted)choices.push(mark('accept','Accetta la commissione'));
      else choices.push(mark('deliver','Consegna '+quest.amount+' · '+quest.itemName,
        Inventory.quantity(s,quest.item)<BigInt(quest.amount)?'Merci insufficienti nello zaino.':''));
    }
    return choices;
  }
  const failure=text=>({ok:false,text});
  function command(s,data){
    if(!s?.urban||!object(data)||typeof data.id!=='string')return failure('Interazione sconosciuta.');
    const there=nearby(s,data.id);
    if(!there)return failure('Raggiungi l’abitante a Velaris.');
    const npc=expose(s,there),option=available(s,npc).find(a=>a.op===data.op);
    if(!option?.allowed)return failure(option?.reason||'Interazione non disponibile qui.');
    const panel={id:'urban',detail:data.id};
    if(data.op==='chat'){
      memorise(s,data.id,'chat');
      return {ok:true,changed:true,text:npc.name+' parla del lavoro di oggi.',panel};
    }
    if(data.op==='gift'){
      if(!Inventory.take(s,'herb',1))return failure('Serve 1 erba di rugiada.');
      memorise(s,data.id,'gift');
      return {ok:true,changed:true,text:npc.name+' ricorderà il dono.',panel};
    }
    const m=s.urban.mission,q=offer(s);
    if(data.id!==charter||!q)return failure('La commissione non è disponibile.');
    if(data.op==='accept'){
      m.active={day:q.day-1};
      return {ok:true,changed:true,text:'Commissione di Velaris accettata.',panel};
    }
    if(data.op==='deliver'){
      if(!m.active||s.player.gold+q.reward>1e10||!Inventory.take(s,q.item,q.amount))return failure('La consegna non è riuscita.');
      const city=s.urban.city;
      city.stock[q.item]=Math.min(180,city.stock[q.item]+q.amount);
      stockMarket(s,q.item,q.amount);
      city.trade=Math.min(limit,city.trade+q.amount);
      s.player.gold+=q.reward;
      m.active=null;m.claimed=day(s);m.completed=Math.min(limit,m.completed+1);
      return {ok:true,changed:true,text:'Consegna registrata · '+q.reward+' Scintille.',panel,
        event:{id:'trade',amount:1,meta:{market:'city-velaris',commission:true,item:q.item,region:cityId}}};
    }
    return failure('Azione sconosciuta.');
  }

  function view(s,id){
    if(!s?.urban)return null;
    const all=profiles(s.seed),local=localActors(s),selected=id?selectedView(s,id,local):null;
    const labels=Object.fromEntries(all.races);
    const count={};
    for(const p of all.list)count[p.race]=(count[p.race]||0)+1;
    const city={population:all.list.length,visible:local.length,day:day(s)+1,commissions:s.urban.mission.completed,
      species:Object.entries(count).map(([id,count])=>({id,name:labels[id]||id,count})),
      production:amounts.map(id=>({id,name:resources[id].name,count:s.urban.city.produced[id]})),
      stock:amounts.map(id=>({id,name:resources[id].name,count:s.urban.city.stock[id]}))};
    return {selected,local:local.filter(o=>distance(o.point,s.player)<=close).map(o=>expose(s,o)),city,
      actions:selected?available(s,selected):[],commission:offer(s)};
  }

  function serviceAvailable(s,kind){
    if(!s?.urban)return false;
    if(!staff.some(spec=>spec[0]===kind))return true;
    if(interiorKind(s.region)!==kind)return false;
    return localActors(s).some(a=>a.p.staff&&a.p.workKind===kind);
  }
  function supply(s){
    const stock=s?.urban?.city.stock;
    return Object.fromEntries(amounts.map(id=>[id,stock?clamp(stock[id]-resources[id].base,-8,40):0]));
  }
  window.UrbanLife={create,restore,tick,sites,use,actors,view,command,serviceAvailable,supply};
})();
