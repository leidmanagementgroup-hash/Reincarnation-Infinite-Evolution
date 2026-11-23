(() => {
  'use strict';
  const quests=[
    {id:'nets',category:'Pesca',name:'Le reti di Vela',from:'Locandiera del Focolare',event:'fish',target:3,reward:30,need:'Pesca tre esemplari.'},
    {id:'forge',category:'Forgia',name:'Ferri per chi parte',from:'Ivo',event:'forge',target:2,reward:38,need:'Forgia due lame.'},
    {id:'field',category:'Agricoltura',name:'La tavola delle stagioni',from:'Orto di Vela',event:'reap',target:2,reward:28,need:'Raccogli due aiuole stagionali.'},
    {id:'herd',category:'Allevamento',name:'Un gregge in salute',from:'Allevatori di Vela',event:'care',target:3,reward:28,need:'Accudisci una lanosa per tre volte.'},
    {id:'kitchen',category:'Cucina',name:'Il quaderno del Focolare',from:'Locandiera del Focolare',event:'cook',target:3,reward:42,need:'Scopri tre ricette differenti.',match:meta=>meta.discovered},
    {id:'routes',category:'Esplorazione',name:'Strade tra i continenti',from:'Cartografi di Vela',event:'visit',target:3,reward:36,need:'Attraversa per la prima volta tre destinazioni diverse.',unique:true},
    {id:'calis-freight',category:'Commercio',name:'Cime per la prossima marea',from:'Registro dei Carichi di Calis',
      need:'Vendi almeno tre unità di legno insieme all’Emporio delle Sette Vele. Poi torna al Registro dei Carichi.',
      event:'trade',target:1,reward:16,site:'cargo-board',
      match:meta=>meta.market==='calis'&&meta.region==='city-calis-tide-market'&&meta.direction==='sell'&&meta.item==='work'&&BigInt(meta.quantity||0)>=3n},
    {id:'moon',category:'Segreta',name:'Una rete per la luna',from:'Una nota sul ricettario',event:'fish',target:1,reward:60,need:'Pesca una carpa lunare.',secret:true,match:meta=>meta.kind==='mooncarp'}
  ];
  const offers=[
    {id:'patrol',category:'Evento',name:'Impronte vicino a Vela',from:'Guardia del borgo',event:'kill',target:2,reward:18,need:'Sconfiggi due lupi nella Valle di Lùmora.',match:meta=>meta.region==='valley'&&meta.species==='wolf'},
    {id:'herbs',category:'Evento',name:'Scorte di rugiada',from:'Mercanti del borgo',event:'harvest',target:3,reward:17,need:'Raccogli tre erbe di rugiada.',match:meta=>meta.kind==='herb'},
    {id:'stone',category:'Evento',name:'Minerale per il banco',from:'Apprendisti di Ivo',event:'mine',target:2,reward:20,need:'Estrai due minerali lucenti.'},
    {id:'catch',category:'Evento',name:'Un pescato per cena',from:'Locandiera del Focolare',event:'fish',target:2,reward:24,need:'Pesca due esemplari.'}
  ];
  const all=[...quests,...offers],lookup=Object.fromEntries(all.map(q=>[q.id,q]));
  const sites={camp:{region:'valley',point:{x:580,y:691},name:'Accampamento del sentiero'}};
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const own=(o,key)=>Object.hasOwn(o,key);
  const stamp=s=>Calendar.timestamp(s.calendar,s.time);
  const valid=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
  const int=(n,min,max)=>Number.isInteger(n)&&valid(n,min,max);
  const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
  const nearby=(s,region,p,radius=34)=>s.region===region&&Math.hypot(p.x-s.player.x,p.y-s.player.y)<=radius;

  function create(s){
    return {schema:1,hunger:100,thirst:100,energy:100,temperature:0,critical:0,buff:null,quests:{},offerClaimed:{},last:stamp(s)};
  }
  function restore(r,s){
    if(r===undefined)return create(s);
    if(!object(r)||r.schema!==1||!['hunger','thirst','energy'].every(k=>valid(r[k],0,100))||!valid(r.temperature,-60,60)||
      !valid(r.critical,0,10000)||!valid(r.last,0,stamp(s)+1e-4)||!object(r.quests)||!object(r.offerClaimed)||
      !(r.buff===null||object(r.buff)&&['attack','defense','speed'].includes(r.buff.kind)&&int(r.buff.power,1,3)&&valid(r.buff.until,0,1e14))||
      !Object.entries(r.quests).every(([id,q])=>own(lookup,id)&&object(q)&&int(q.progress,0,lookup[id].target)&&typeof q.claimed==='boolean'&&
        Array.isArray(q.regions)&&q.regions.length<=lookup[id].target&&new Set(q.regions).size===q.regions.length&&q.regions.every(region=>own(World.regions,region))&&
        (q.day===null||int(q.day,1,1e12)))||
      !Object.entries(r.offerClaimed).every(([id,day])=>offers.some(q=>q.id===id)&&int(day,1,1e12)))return null;
    return r;
  }
  function racial(r){
    if(r==='slime')return {hunger:.46,thirst:1.24,energy:.71,cold:1.13,heat:1.15};
    if(/drake|dragon|wyvern|phoenix|viverna|drago|fenice/.test(r))return {hunger:1.18,thirst:.83,energy:.93,cold:1.24,heat:.30};
    if(/spirit|ghost|specter|skeleton|elemental|wisp|golem|spettro|scheletro/.test(r))return {hunger:.35,thirst:.48,energy:.68,cold:.62,heat:.68};
    if(/wolf|bear|gryphon|griffin|were/.test(r))return {hunger:1.13,thirst:1,energy:.81,cold:.66,heat:1.22};
    return {hunger:1,thirst:1,energy:1,cold:1,heat:1};
  }
  function targetTemperature(s,time){
    const climate={alpine:-28,volcanic:32,astral:-8,underground:-9,forest:1,temperate:0,savanna:20,coast:6,desert:26};
    const weather={snow:-12,storm:-6,rain:-4,heat:13,sand:6,wind:-3};
    const race=racial(s.player.race);
    const t=(climate[time.climate]||0)+(weather[time.weatherKind]||0)+(time.seasonId==='summer'?7:time.seasonId==='winter'?-9:0)-
      (time.phase==='night'?8:0);
    const insulated=t<0&&Inventory.quantity(s,'woolcloak')>0n;
    return clamp(t*(t<0?race.cold:race.heat)*(insulated?.7:1),-60,60);
  }
  function tick(s,{sleep=false,moving=false,combat=false}={}){
    const d=s.daily,time=Calendar.view(s.calendar,s.time,s.region);
    const elapsed=Math.max(0,time.timestamp-d.last)/Calendar.minutesPerSecond;
    d.last=time.timestamp;
    if(!elapsed)return false;
    const race=racial(s.player.race);
    if(d.buff?.until<=d.last)d.buff=null;
    const target=sleep?0:targetTemperature(s,time);
    d.temperature+=(target-d.temperature)*(1-Math.exp(-elapsed/65));
    const exposure=Math.max(0,Math.abs(d.temperature)-28)/36;
    const weight=sleep?.22:1;
    d.hunger=clamp(d.hunger-elapsed*.022*race.hunger*weight,0,100);
    d.thirst=clamp(d.thirst-elapsed*.032*race.thirst*weight*(1+exposure*.55),0,100);
    d.energy=sleep?100:clamp(d.energy-elapsed*.017*race.energy*(combat?2:moving?1.3:.75),0,100);
    const critical=d.hunger<=1||d.thirst<=1||d.energy<=1&&Math.abs(d.temperature)>46;
    d.critical=critical?Math.min(10000,d.critical+(sleep?0:elapsed)):Math.max(0,d.critical-elapsed*3);
    return d.critical>=180;
  }
  function modifiers(s){
    const d=s.daily,penalty=n=>clamp((32-n)/32,0,1),buff=d.buff?.until>stamp(s)?d.buff:null;
    const tired=penalty(d.energy),dry=penalty(d.thirst),hungry=penalty(d.hunger),temp=clamp((Math.abs(d.temperature)-28)/32,0,1);
    return {attack:(buff?.kind==='attack'?buff.power:0)-Math.ceil(hungry*3),
      defense:(buff?.kind==='defense'?buff.power:0)-Math.ceil(temp*2),
      speed:(buff?.kind==='speed'?buff.power*2:0)-Math.ceil(tired*7+dry*5+temp*5)};
  }
  function recover(s){
    const d=s.daily;
    d.hunger=Math.max(36,d.hunger);d.thirst=Math.max(40,d.thirst);d.energy=Math.max(45,d.energy);
    d.temperature=0;d.critical=0;d.buff=null;
  }
  function restPlace(s){
    if(window.UrbanWorld?.access(s,'inn-bed'))return UrbanWorld.site(s,'inn-bed').name||'Locanda di Velaris';
    if(window.UrbanWorld?.access(s,'house-bed'))return UrbanWorld.site(s,'house-bed').name||'Casa dell’Ospitalità';
    if(window.UrbanWorld?.inCity(s.region))return null;
    if(nearby(s,Tradecraft.inn.region,Tradecraft.inn,38))return Tradecraft.inn.name;
    if(s.build?.structures?.some(o=>o.plan==='house'&&nearby(s,o.region,{x:o.x+24,y:o.y+24},36)))return 'Casa di proprietà';
    if(Inventory.quantity(s,'camp')>0n&&World.canWalk(s.player.x,s.player.y,10)&&!['rift','ardel-crypt','quarry','nadir-vault'].includes(s.region))return 'Accampamento da campo';
    return null;
  }
  function eat(s,id){
    const e=typeof id==='string'&&Tradecraft.nutrition(s,id);
    if(!e||!Inventory.take(s,id,1))return {ok:false,text:'Provviste non disponibili.'};
    const d=s.daily;
    d.hunger=clamp(d.hunger+e.hunger,0,100);d.thirst=clamp(d.thirst+e.thirst,0,100);d.energy=clamp(d.energy+e.energy,0,100);
    if(e.buff)d.buff={kind:e.buff.kind,power:e.buff.power,until:stamp(s)+e.buff.duration};
    if(d.hunger>1&&d.thirst>1)d.critical=0;
    return {ok:true,changed:true,text:'Consumata 1 unità · '+Inventory.definition(s,id).name};
  }
  function dailyOffer(s){
    const time=Calendar.view(s.calendar,s.time,'valley'),day=time.day,
      localMonsters=(s.region==='valley'?s:s.regions.valley)?.monsters||[];
    const pressure={
      patrol:localMonsters.some(m=>m.type==='wolf'&&m.hp>0&&m.engaged)?.4:0,
      herbs:Economy.shortage(s,'vela','herb'),
      stone:Economy.shortage(s,'vela','ore'),
      catch:['rain','storm'].includes(time.weatherKind)?.34:0
    };
    const ordered=offers.map((q,i)=>({q,score:pressure[q.id]+.08*((s.seed+day+i)%offers.length)}));
    const choice=ordered.reduce((best,current)=>current.score>best.score?current:best).q;
    return {...choice,day};
  }
  function unlocked(s,q){
    if(q.secret)return own(s.daily.quests,q.id);
    if(q.site)return own(s.daily.quests,q.id)||!!window.UrbanWorld?.access(s,q.site);
    if(q.id==='herd')return Calendar.absoluteDays(s.calendar,s.time)>0||Life.level(s,'herder')>0;
    return true;
  }
  function log(s,event,amount,meta){
    const d=s.daily,notice=[];
    if(event==='fish'&&meta.kind==='mooncarp'&&!d.quests.moon){
      d.quests.moon={progress:0,claimed:false,regions:[],day:null};notice.push('Missione segreta scoperta · Una rete per la luna');
    }
    for(const [id,state] of Object.entries(d.quests)){
      const q=lookup[id];
      if(state.claimed||state.progress>=q.target||q.event!==event||q.match&&!q.match(meta))continue;
      if(q.unique){
        if(state.regions.includes(meta.region))continue;
        state.regions.push(meta.region);
      }
      state.progress=Math.min(q.target,state.progress+(q.unique?1:Math.min(12,Math.max(1,Math.floor(amount)))));
      if(state.progress===q.target)notice.push('Obiettivo completato · '+q.name);
    }
    return notice;
  }
  function command(s,d){
    if(!object(d))return {ok:false,text:'Scegli un’azione.'};
    const state=s.daily;
    if(d.op==='eat')return eat(s,d.id);
    if(d.op==='water'){
      if(!nearby(s,Tradecraft.inn.region,Tradecraft.inn,36)&&!window.UrbanWorld?.access(s,'inn-water'))return {ok:false,text:'Riempi la borraccia alla fonte della locanda.'};
      state.thirst=100;
      const bottle=Inventory.quantity(s,'water')<3n;
      if(bottle)Inventory.add(s,'water',1);
      return {ok:true,changed:true,text:bottle?'Bevi alla fonte e riempi una borraccia.':'Bevi alla fonte. Hai provviste d’acqua da portare.'};
    }
    if(d.op==='accept'){
      const offer=dailyOffer(s),q=quests.find(q=>q.id===d.id)||(
        offer.id===d.id&&state.offerClaimed[offer.id]!==offer.day?offer:null);
      if(!q||!unlocked(s,q)||state.quests[q.id]&&!(q.day&&state.quests[q.id].claimed))return {ok:false,text:'Questo incarico non è disponibile.'};
      state.quests[q.id]={progress:0,claimed:false,regions:[],day:q.day||null};
      return {ok:true,changed:true,text:'Incarico accettato · '+q.name};
    }
    if(d.op==='claim'){
      const q=own(lookup,d.id)&&lookup[d.id],progress=state.quests[d.id];
      if(!q||!progress||progress.claimed||progress.progress<q.target)return {ok:false,text:'Completa prima l’incarico.'};
      if(s.player.gold+q.reward>1e10)return {ok:false,text:'Deposita prima parte delle monete.'};
      if(q.site&&!window.UrbanWorld?.access(s,q.site))return {ok:false,text:'Torna al Registro dei Carichi per riscuotere.'};
      progress.claimed=true;s.player.gold+=q.reward;
      if(progress.day)state.offerClaimed[q.id]=progress.day;
      return {ok:true,changed:true,text:'Ricompensa · '+q.reward+' Scintille.'};
    }
    return {ok:false,text:'Azione sconosciuta.'};
  }
  function view(s){
    const state=s.daily,offer=dailyOffer(s),entries=[];
    for(const q of [...quests,offer,...offers.filter(o=>o.id!==offer.id&&state.quests[o.id]&&!state.quests[o.id].claimed)]){
      if(!unlocked(s,q))continue;
      const saved=state.quests[q.id],same=saved&&(!q.day||saved.day===q.day||!saved.claimed);
      const entry=same?saved:null;
      entries.push({...q,progress:entry?.progress||0,accepted:!!entry,claimed:!!entry?.claimed,
        ready:!!entry&&!entry.claimed&&entry.progress>=q.target,atSite:!q.site||!!window.UrbanWorld?.access(s,q.site)});
    }
    return {hunger:Math.round(state.hunger),thirst:Math.round(state.thirst),energy:Math.round(state.energy),
      temperature:Math.round(state.temperature),critical:Math.floor(state.critical),modifiers:modifiers(s),
      buff:state.buff&&state.buff.until>stamp(s)?{...state.buff,remaining:Math.ceil(state.buff.until-stamp(s))}:null,
      restPlace:restPlace(s),nearWater:nearby(s,Tradecraft.inn.region,Tradecraft.inn,36)||!!window.UrbanWorld?.access(s,'inn-water'),quests:entries};
  }
  function worldSites(s){
    return Object.entries(sites).filter(([,site])=>site.region===s.region).map(([id,site])=>({...site,id,kind:'daily',range:24,text:site.name+' · Riposo'}));
  }
  window.Daily={create,restore,tick,modifiers,recover,restPlace,log,command,view,sites:worldSites,racial}; // racial: profili dei bisogni per stirpe (sola lettura, Living World 2.0)
})();
