/* Professioni, vita del borgo e punti di rinascita. Il modulo usa le mappe originali. */
(() => {
  'use strict';

  const home='valley',continents=World.continents;
  const statues=continents.map(c=>({...c.statue,continent:c.name,kind:'life',range:30,point:{x:c.statue.x,y:c.statue.y},
    description:'Iscrizione degli Ardel e punto di rinascita.',text:'Attiva '+c.statue.name}));
  const statueById=Object.fromEntries(statues.map(s=>[s.id,s]));
  const professions=Object.freeze({
    farmer:['Contadino','Cresce con semina, raccolta e cura delle piante.'],
    miner:['Minatore','Cresce estraendo minerale dal terreno.'],
    warrior:['Guerriero','Cresce affrontando creature e usando tecniche fisiche.'],
    mage:['Mago','Cresce con studio ed esercizio della magia.'],
    merchant:['Mercante','Cresce acquistando e vendendo beni.'],
    artisan:['Artigiano','Cresce lavorando erbe, minerali e altri materiali.'],
    herder:['Allevatore','Cresce nutrendo gli animali e raccogliendo i loro prodotti.'],
    explorer:['Esploratore','Cresce scoprendo luoghi e attraversando le regioni.'],
    builder:['Costruttore','Cresce riparando la lanterna e mantenendo le opere del borgo.'],
    fisher:['Pescatore','Migliora la presa della lenza e, ad alto livello, può portare a riva una seconda cattura.'],
    smith:['Fabbro','La pratica migliora il controllo del metallo al banco di Ivo.'],
    cook:['Cuoco','Migliora il controllo della cottura e arricchisce il ricettario.'],
    carpenter:['Falegname','Impara lavorando il legname e mantenendo opere di proprietà.'],
    tailor:['Sarto','Migliora lavorando la lana in modelli utili.'],
    alchemist:['Alchimista','Migliora con la distillazione delle pozioni.'],
    herbalist:['Erborista','Migliora raccogliendo erbe e osservando le colture.'],
    hunter:['Cacciatore','Migliora seguendo e sconfiggendo le creature selvagge.']
  });
  const hybridDefs=[
    ['verdant','Agrimagia','farmer','mage','Durante la semina puoi già usare la linfa per accelerare la crescita.'],
    ['masterwork','Forgia della vena','miner','artisan','Ottieni una pozione aggiuntiva quando distilli al banco.'],
    ['roadtrade','Commercio itinerante','explorer','merchant','Ricavi due monete in più con le vendite del raccolto.'],
    ['settler','Custodia del borgo','herder','builder','Raccogli prima i prodotti delle lanose dopo averle nutrite.']
  ];
  const landmarks=[
    {id:'field',name:'Orto di Vela',x:443,y:675,range:25,description:'Semina, coltiva e raccogli da due aiuole del borgo.'},
    {id:'pen',name:'Recinto delle lanose',x:352,y:666,range:25,description:'Nutri le lanose con cereali o con erbe e raccogli i prodotti.'},
    {id:'counter',name:'Banco delle sementi',x:422,y:569,range:18,description:'Scambia sementi e prodotti del raccolto.'},
    {id:'workbench',name:'Banco di Ivo',x:493,y:682,range:24,description:'Distilla pozioni e ripara la lanterna comunitaria vicino alla forgia.'},
    {id:'training',name:'Pesiera e leggio',x:382,y:544,range:22,description:'Solleva pesi o studia tecniche dal leggio.'}
  ].map(site=>Object.freeze({...site,region:home,kind:'life',text:site.name,point:Object.freeze({x:site.x,y:site.y})}));
  const stationById=Object.fromEntries(landmarks.map(site=>[site.id,site]));
  const npcProfiles={
    elder:{id:'elder',name:'Nerea',role:'Custode',personality:'Vigile e paziente.',goal:'Tenere accesa la lanterna di Vela.',schedule:['Riordina i voti del mattino.','Ascolta chi arriva al borgo.','Controlla le lanterne al vespro.'],direction:-1},
    merchant:{id:'merchant',name:'Tessa',role:'Mercante',personality:'Pratica e curiosa.',goal:'Tenere il banco provvisto anche fuori stagione.',schedule:['Conta le sementi della giornata.','Riceve i viaggiatori al mercato.','Controlla i carichi per la prossima carovana.'],direction:1},
    smith:{id:'smith',name:'Ivo',role:'Fabbro',personality:'Taciturno e minuzioso.',goal:'Restaurare la vecchia lanterna del borgo.',schedule:['Prepara i ferri.','Lavora alla forgia.','Registra il minerale rimasto.'],direction:1}
  };
  const villageEvents=[
    {id:'dew',title:'Rugiada lucente',text:'Le colture seminate in questo turno maturano prima.'},
    {id:'caravan',title:'Carovana dei ponti',text:'Il banco offre due monete in più per il grano.'},
    {id:'patrol',title:'Impronte nel bosco',text:'I lupi sono più attivi intorno alla Radura delle Lanterne.'},
    {id:'watch',title:'Turno della lanterna',text:'Il borgo ricompensa con più reputazione chi ripara la lanterna.'}
  ];
  const thresholds=[0,1,3,8,16,26,42,64,90,122,160];
  const townRadius=300;
  const timeMax=1e10+100;
  const own=(value,key)=>Object.hasOwn(value,key);
  const obj=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const count=(value,max=1e8)=>Number.isFinite(value)&&value>=0&&value<=max;
  const integer=(value,max=1e8)=>Number.isInteger(value)&&count(value,max);
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const hasHybrid=(xp,a,b)=>levelOf(xp[a])>=4&&levelOf(xp[b])>=4;
  const nearby=(s,site)=>s.region===site.region&&distance(s.player,site)<=site.range;
  const insideTown=s=>s.region===home&&distance(s.player,{x:420,y:610})<townRadius;
  const clockBlock=s=>Math.floor(s.time/68);
  const worldMinute=s=>s.calendar?Calendar.minuteAt(s.calendar,s.time):Math.floor(480+s.time*3)%1440;
  const day=s=>s.calendar?1+Calendar.absoluteDays(s.calendar,s.time):1+Math.floor((480+s.time*3)/1440);
  const timeLeft=(target,s)=>Math.max(0,Math.ceil(target-s.time));
  const maxXp=1e8;

  function create(seed,legacy) {
    const xp=Object.fromEntries(Object.keys(professions).map(key=>[key,0]));
    const p=legacy?.player;
    if(p){
      xp.warrior=Math.min(maxXp,2*(p.kills||0));
      xp.mage=Math.min(maxXp,(p.skills?.spark?.uses||0)+(p.skills?.mend?.uses||0));
      xp.miner=Math.min(maxXp,3*(p.inventory?.ore||0));
      xp.artisan=Math.min(maxXp,legacy?.sideQuest===2?8:0);
    }
    return {
      xp, supplies:{seeds:3,grain:0,work:2,wool:0},
      plots:[null,null], herd:{fedUntil:0,readyAt:0,nextFeedAt:0},
      project:{level:0,nextAt:0}, drill:{nextTrain:0,nextStudy:0}, visits:{},
      checkpoint:null, inscriptions:[], deathCaches:[], eventBlock:-1, news:[], nextPulse:0, nextHunt:0, hunts:0
    };
  }

  function restore(raw,seed,state) {
    if(raw===undefined)return create(seed,state);
    if(!obj(raw)||!obj(raw.xp)||!Object.keys(professions).every(id=>count(raw.xp[id]??(state.version<5?0:undefined),maxXp))||
      !obj(raw.supplies)||!['seeds','grain','work','wool'].every(id=>integer(raw.supplies[id],maxXp))||
      !Array.isArray(raw.plots)||raw.plots.length!==2||
      !raw.plots.every(v=>v===null||(obj(v)&&count(v.readyAt,timeMax)&&typeof v.blessed==='boolean'))||
      !obj(raw.herd)||!['fedUntil','readyAt','nextFeedAt'].every(id=>count(raw.herd[id],timeMax))||
      !obj(raw.project)||!integer(raw.project.level,3)||!count(raw.project.nextAt,timeMax)||
      !obj(raw.drill)||!['nextTrain','nextStudy'].every(id=>count(raw.drill[id],timeMax))||
      !obj(raw.visits)||Object.keys(raw.visits).length>260||
      !Object.entries(raw.visits).every(([id,v])=>{const [region,place,extra]=id.split(':');return extra===undefined&&own(World.regions,region)&&/^\d{1,3}$/.test(place)&&v===true;})||
      !(raw.checkpoint===null||own(statueById,raw.checkpoint))||!(raw.eventBlock===-1||integer(raw.eventBlock,timeMax))||
      !Array.isArray(raw.news)||raw.news.length>8||!raw.news.every(n=>obj(n)&&integer(n.block,timeMax)&&integer(n.day,timeMax)&&villageEvents.some(e=>e.id===n.id))||
      !count(raw.nextPulse,timeMax)||!count(raw.nextHunt,timeMax)||!integer(raw.hunts,maxXp))return null;
    const legacy=state.version<4;
    const inscriptions=raw.inscriptions??(legacy&&raw.checkpoint?[raw.checkpoint]:legacy?[]:null);
    const deathCaches=raw.deathCaches??(legacy?[]:null);
    if(!Array.isArray(inscriptions)||inscriptions.length>5||new Set(inscriptions).size!==inscriptions.length||
      !inscriptions.every(id=>own(statueById,id))||raw.checkpoint&&!inscriptions.includes(raw.checkpoint)||
      !Array.isArray(deathCaches)||deathCaches.length>Object.keys(World.regions).length||new Set(deathCaches.map(c=>c?.region)).size!==deathCaches.length||
      !deathCaches.every(c=>obj(c)&&own(World.regions,c.region)&&integer(c.gold,1e10)&&c.gold>0&&
        count(c.x,World.regions[c.region].width)&&count(c.y,World.regions[c.region].height)))return null;
    return {
      xp:Object.fromEntries(Object.keys(professions).map(id=>[id,raw.xp[id]??0])),supplies:{...raw.supplies},
      plots:raw.plots.map(v=>v?{readyAt:v.readyAt,blessed:v.blessed}:null),herd:{...raw.herd},
      project:{...raw.project},drill:{...raw.drill},visits:Object.fromEntries(Object.keys(raw.visits).map(id=>[id,true])),
      checkpoint:raw.checkpoint,inscriptions:[...inscriptions],deathCaches:deathCaches.map(({region,x,y,gold})=>({region,x,y,gold})),
      eventBlock:raw.eventBlock,news:raw.news.map(({id,block,day})=>({id,block,day})),
      nextPulse:raw.nextPulse,nextHunt:raw.nextHunt,hunts:raw.hunts
    };
  }

  function levelOf(xp) {
    let level=0;
    while(level<10&&xp>=thresholds[level+1])level++;
    return level;
  }

  const rank=level=>['Da scoprire','Apprendista','Apprendista','Praticante','Praticante','Esperto','Esperto','Maestro','Maestro','Maestro','Leggendario'][level];
  const gains={
    field:{farmer:4}, mine:{miner:8}, harvest:{farmer:2}, craft:{artisan:8,alchemist:7},
    trade:{merchant:7}, kill:{warrior:6,hunter:5}, physical:{warrior:.35}, boss:{warrior:12},
    magic:{mage:.65}, study:{mage:7}, livestock:{herder:6}, explore:{explorer:12}, build:{builder:9,carpenter:5}, train:{warrior:3},
    fish:{fisher:8},fishAttempt:{fisher:1},fishingAttempt:{fisher:1},forge:{smith:9,artisan:3},gearWork:{smith:2,artisan:1},smithingAttempt:{smith:1},
    sow:{farmer:5},reap:{farmer:8,herbalist:4},farmingAttempt:{farmer:1},care:{herder:7},ranch:{herder:9},husbandryAttempt:{herder:1},
    cook:{cook:8},cookingAttempt:{cook:1},sew:{tailor:8,artisan:2}
  };
  const unlockedHybrids=xp=>hybridDefs.filter(([, ,a,b])=>hasHybrid(xp,a,b));
  function record(s,event,amount=1,context={}) {
    const life=s.life;
    if(!life||!own(gains,event)||!Number.isFinite(amount)||amount<=0)return [];
    const before=new Set(unlockedHybrids(life.xp).map(([id])=>id));
    const messages=[];
    const rates=event==='harvest'?{...gains[event],...(context.kind==='herb'?{herbalist:5}:context.kind==='wood'?{carpenter:5}:{})}:gains[event];
    for(const [id,rate] of Object.entries(rates)){
      const prev=levelOf(life.xp[id]);
      life.xp[id]=Math.min(maxXp,life.xp[id]+rate*Math.min(amount,30));
      const now=levelOf(life.xp[id]);
      if(now>prev&&[4,7,10].includes(now))messages.push(professions[id][0]+' · '+rank(now));
    }
    for(const [id,name] of unlockedHybrids(life.xp))if(!before.has(id))messages.push('Pratica ibrida · '+name);
    return messages;
  }

  function currentEvent(s) {
    const seed=Number(s.seed)>>>0,offset=((Math.imul(seed^1447,1013904223)>>>0)%4);
    return villageEvents[(clockBlock(s)+offset)%villageEvents.length];
  }

  function patrol(s,event,life) {
    if(s.region!==home||s.time<life.nextHunt)return;
    life.nextHunt=s.time+(event.id==='patrol'?15:29);
    const ms=s.monsters||[];
    const wolf=ms.find(m=>m.type==='wolf'&&m.hp>0&&!m.engaged&&distance(m,s.player)>110);
    if(!wolf)return;
    const prey=ms.filter(m=>m.type==='moth'&&m.hp>0&&!m.engaged&&distance(m,s.player)>110)
      .sort((a,b)=>distance(a,wolf)-distance(b,wolf))[0];
    if(!prey||distance(wolf,prey)>125)return;
    prey.hp=Math.max(0,prey.hp-(event.id==='patrol'?14:9));
    if(prey.hp===0){prey.dead=s.time+32;prey.engaged=false;prey.wind=0;life.hunts++;}
  }

  function tick(s) {
    const life=s.life;
    if(!life||s.time<life.nextPulse)return [];
    life.nextPulse=s.time+1.15;
    const notices=[],event=currentEvent(s),block=clockBlock(s);
    if(life.eventBlock!==block){
      if(life.eventBlock>=0&&insideTown(s))notices.push(event.title+' · '+event.text);
      life.eventBlock=block;
      if(life.news.length>=8)life.news.shift();
      life.news.push({id:event.id,day:day(s),block});
    }
    const locations=window.World?.regions?.[s.region]?.landmarks||[];
    for(const [i,location] of locations.entries()){
      const key=s.region+':'+i;
      if(!own(life.visits,key)&&distance(s.player,location)<=49){
        life.visits[key]=true;
        notices.push(...record(s,'explore'));
        if(s.region!==home||i>0)notices.push('Luogo scoperto · '+location.name);
      }
    }
    patrol(s,event,life);
    return notices;
  }

  function agenda(s) {
    const minute=worldMinute(s);
    return minute<630?0:minute<1050?1:2;
  }
  function npcPoint(s,id,base) {
    if(!base||!own(npcProfiles,id)||s.region!==home)return base;
    const npc=npcProfiles[id],minute=worldMinute(s),block=agenda(s);
    const elapsed=minute-(block===0?0:block===1?630:1050);
    const smooth=Math.min(1,elapsed/10);
    const index=block===0?0:block===1?1:-1;
    const previous=block===0?-1:block===1?0:1;
    const dx=npc.direction*13*(previous+(index-previous)*smooth);
    const x=Math.round(base.x+dx), y=base.y;
    if(!window.World?.canWalk(x,y,5))return base;
    return {x,y,moving:smooth<1,dir:smooth<1?(dx>0?'right':'left'):'down'};
  }

  function sites(s) {
    if(!s?.life)return [];
    const list=s.region===home?[...landmarks]:[];
    const monument=World.regions[s.region]?.statue;
    if(monument){
      const site=statueById[monument.id];
      list.push(s.life.checkpoint===site.id?{...site,text:'Leggi il patto · '+site.name}:site);
    }
    const cache=s.life.deathCaches.find(c=>c.region===s.region);
    if(cache)list.push({...cache,id:'death-cache',point:cache,kind:'life',range:24,text:'Recupera il borsello · '+cache.gold+' Scintille'});
    return list;
  }

  function use(s,id) {
    const site=sites(s).find(x=>x.id===id);
    if(!site||!nearby(s,site))return {ok:false,text:'Avvicinati al luogo per interagire.'};
    if(id==='death-cache'){
      s.player.gold+=site.gold;
      s.life.deathCaches=s.life.deathCaches.filter(c=>c.region!==s.region);
      return {ok:true,changed:true,text:'Borsello recuperato · '+site.gold+' Scintille.'};
    }
    if(own(statueById,id)){
      const fresh=!s.life.inscriptions.includes(id);
      const changed=s.life.checkpoint!==id||fresh;
      if(fresh)s.life.inscriptions.push(id);
      s.life.checkpoint=id;
      return {ok:true,changed,inscription:id,panel:{id:'statue',detail:id},text:changed?'Statua attivata · '+site.name:undefined,
        event:fresh?{id:'event',amount:1,meta:{statue:id}}:undefined};
    }
    return {ok:true,panel:'activities'};
  }

  function progress(s) {
    const life=s.life;
    if(!life)return {professions:[],peak:0,legendary:[],hybrids:[],repaired:0,visits:0};
    const entries=Object.entries(professions).map(([id,[name]])=>({id,name,level:levelOf(life.xp[id])}));
    return {
      professions:entries,peak:Math.max(...entries.map(p=>p.level)),legendary:entries.filter(p=>p.level===10).map(p=>p.id),
      hybrids:unlockedHybrids(life.xp).map(([id])=>({id})),repaired:life.project.level,visits:Object.keys(life.visits).length
    };
  }

  function eligible(s,id) {
    const a=actions[id],where=stationById[a.station];
    if(a.station==='counter'&&s.calendar&&!Calendar.view(s.calendar,s.time,s.region).shopOpen)return 'Il banco è aperto dalle 07:00 alle 20:00.';
    return nearby(s,where)?a.reason(s):'Raggiungi '+where.name+' nella Valle.';
  }

  function success(text,event,amount=1,xp=0,essence=0,meta={}) {
    return {ok:true,changed:true,text,event:{id:event,amount,meta},xp,essence};
  }

  const actions={
    sow:{
      label:'Semina',station:'field',description:'Pianta un seme in un’aiuola libera.',
      reason:s=>!s.life.supplies.seeds?'Servono sementi.':s.life.plots.every(Boolean)?'Le due aiuole sono occupate.':'',
      act(s){
        const life=s.life,plot=life.plots.findIndex(v=>!v);
        const speed=currentEvent(s).id==='dew'?8:11;
        life.supplies.seeds--;life.plots[plot]={readyAt:s.time+speed,blessed:false};
        return success('Semente piantata. Torna all’orto tra '+speed+' secondi.','field',1,5,0,{stage:'plant'});
      }
    },
    reap:{
      label:'Raccogli',station:'field',description:'Ottieni grano, sementi, erba di rugiada ed essenza dalle piante mature.',
      reason(s){
        const active=s.life.plots.filter(Boolean);
        if(active.some(v=>v.readyAt<=s.time))return '';
        return active.length?'Raccolto pronto fra '+timeLeft(Math.min(...active.map(v=>v.readyAt)),s)+' s.':'Semina prima un’aiuola.';
      },
      act(s){
        const life=s.life,i=life.plots.findIndex(v=>v&&v.readyAt<=s.time),plot=life.plots[i];
        life.plots[i]=null;life.supplies.seeds++;life.supplies.grain+=plot.blessed?4:2;s.player.inventory.herb++;
        return success('Raccolto · '+(plot.blessed?'4':'2')+' grano, 1 semente, 1 erba e '+(plot.blessed?'2 essenze.':'1 essenza.'),'field',2,18,plot.blessed?2:1,{stage:'harvest'});
      }
    },
    infuse:{
      label:'Infondi linfa',station:'field',description:'Fa maturare subito una pianta e migliora il raccolto. Costa 5 mana.',
      reason(s){
        const life=s.life;
        if(levelOf(life.xp.farmer)<10&&!hasHybrid(life.xp,'farmer','mage'))return 'Serve Contadino leggendario o la pratica Agrimagia.';
        if(s.player.mp<5)return 'Servono 5 mana.';
        return life.plots.some(v=>v&&!v.blessed)?'':'Serve un’aiuola seminata.';
      },
      act(s){
        const plot=s.life.plots.find(v=>v&&!v.blessed);
        s.player.mp-=5;plot.readyAt=s.time;plot.blessed=true;
        return success('La magia della linfa fa germogliare il raccolto.','field',1.5,8,0,{stage:'infuse'});
      }
    },
    feed:{
      label:'Nutri le lanose',station:'pen',description:'Spendi 1 grano o 1 erba di rugiada per ottenere lana e linfa al prossimo raccolto.',
      reason(s){
        if(s.life.herd.readyAt)return 'Ritira i prodotti prima di nutrire di nuovo le lanose.';
        if(s.life.herd.nextFeedAt>s.time)return 'Attendi '+timeLeft(s.life.herd.nextFeedAt,s)+' s.';
        return s.life.supplies.grain||s.player.inventory.herb?'':'Serve 1 grano o 1 erba di rugiada.';
      },
      act(s){
        const life=s.life,care=hasHybrid(life.xp,'herder','builder')?7:10;
        if(life.supplies.grain)life.supplies.grain--;else s.player.inventory.herb--;
        life.herd.fedUntil=s.time+care+19;life.herd.readyAt=s.time+care;life.herd.nextFeedAt=s.time+care+2;
        return success('Lanose nutrite. I prodotti saranno pronti tra '+care+' secondi.','livestock',1,7,0,{stage:'feed'});
      }
    },
    shear:{
      label:'Ritira lana e linfa',station:'pen',description:'Raccogli lana da vendere e una pozione di linfa.',
      reason:s=>!s.life.herd.readyAt?'Nutri prima le lanose.':s.life.herd.readyAt>s.time?'Pronto fra '+timeLeft(s.life.herd.readyAt,s)+' s.':'',
      act(s){
        s.life.herd.readyAt=0;s.life.supplies.wool++;s.player.potions++;
        return success('Recinto · 1 lana e 1 pozione di linfa.','livestock',2,16,1,{stage:'collect'});
      }
    },
    buySeeds:{
      label:'Compra due sementi',station:'counter',description:'Spendi 3 Scintille e aggiungi 2 sementi.',
      reason:s=>s.player.gold>=3?'':'Servono 3 Scintille.',
      act(s){
        s.player.gold-=3;s.life.supplies.seeds+=2;
        return success('Sementi acquistate.','trade',1,4);
      }
    },
    sellGrain:{
      label:'Vendi due grani',station:'counter',description:'Scambia 2 grani con Scintille. Le carovane e il commercio itinerante aumentano il ricavo.',
      reason:s=>s.life.supplies.grain>=2?'':'Servono 2 grani.',
      act(s){
        const life=s.life,gold=8+(currentEvent(s).id==='caravan'?2:0)+(hasHybrid(life.xp,'explorer','merchant')?2:0);
        life.supplies.grain-=2;s.player.gold+=gold;
        return success('Grano venduto · +'+gold+' Scintille.','trade',1.5,11,1);
      }
    },
    sellWool:{
      label:'Vendi lana',station:'counter',description:'Scambia 1 lana con 9 Scintille.',
      reason:s=>s.life.supplies.wool?'':'Serve 1 lana.',
      act(s){
        s.life.supplies.wool--;s.player.gold+=9;
        return success('Lana venduta · +9 Scintille.','trade',1.5,11,1);
      }
    },
    distill:{
      label:'Distilla pozioni',station:'workbench',description:'Usa 2 erbe di rugiada e 1 minerale lucente per distillare pozioni.',
      reason:s=>s.player.inventory.herb>=2&&s.player.inventory.ore>=1?'':'Servono 2 erbe e 1 minerale.',
      act(s){
        const count=hasHybrid(s.life.xp,'miner','artisan')?3:2;
        s.player.inventory.herb-=2;s.player.inventory.ore--;s.player.potions+=count;
        return success('Banco di Ivo · '+count+' pozioni distillate.','craft',1.3,20,1);
      }
    },
    repair:{
      label:'Ripara la lanterna',station:'workbench',description:'Restauro in tre fasi. Consuma 1 trave donata oppure 1 minerale per intervento.',
      reason:s=>s.life.project.level===3?'La lanterna è restaurata.':s.life.supplies.work||s.player.inventory.ore?'':'Serve 1 minerale lucente.',
      act(s){
        const life=s.life;
        if(life.supplies.work)life.supplies.work--;else s.player.inventory.ore--;
        life.project.level++;s.player.rep+=currentEvent(s).id==='watch'?2:1;
        life.project.nextAt=s.time+3;
        return success(life.project.level===3?'La lanterna di Vela è tornata a splendere.':'Restauro della lanterna · '+life.project.level+'/3.','build',1.5,20,1,{stage:'repair'});
      }
    },
    upkeep:{
      label:'Mantieni la lanterna',station:'workbench',description:'Usa 1 minerale per mantenere l’opera terminata.',
      reason:s=>s.life.project.level<3?'Completa prima il restauro.':s.life.project.nextAt>s.time?'Attendi '+timeLeft(s.life.project.nextAt,s)+' s.':s.player.inventory.ore?'':'Serve 1 minerale lucente.',
      act(s){
        s.player.inventory.ore--;s.life.project.nextAt=s.time+14;s.player.rep++;
        return success('Lanterna mantenuta.','build',1.5,17,1,{stage:'maintain'});
      }
    },
    lift:{
      label:'Solleva i pesi',station:'training',description:'Allena la forza con i contrappesi del borgo.',
      reason:s=>s.life.drill.nextTrain>s.time?'Recupera per '+timeLeft(s.life.drill.nextTrain,s)+' s.':'',
      act(s){
        s.life.drill.nextTrain=s.time+6;
        return success('Allenamento di forza completato.','train',2,5,0,{stage:'weights'});
      }
    },
    study:{
      label:'Studia al leggio',station:'training',description:'Studia percorsi di mana e segni elementali.',
      reason:s=>s.life.drill.nextStudy>s.time?'Riposa per '+timeLeft(s.life.drill.nextStudy,s)+' s.':'',
      act(s){
        s.life.drill.nextStudy=s.time+8;
        return success('Studio completato.','study',1,7,0,{stage:'reading'});
      }
    }
  };

  function command(s,id) {
    if(!s?.life||!own(actions,id))return {ok:false,text:'Attività sconosciuta.'};
    const reason=eligible(s,id);
    return reason?{ok:false,text:reason}:actions[id].act(s);
  }

  function view(s) {
    if(!s?.life)return null;
    const life=s.life,xp=life.xp,current=agenda(s),event=currentEvent(s);
    const monuments=statues.map(site=>({...site,active:life.checkpoint===site.id,visited:life.inscriptions.includes(site.id)}));
    return {
      professions:Object.entries(professions).map(([id,[name,description]])=>{
        const level=levelOf(xp[id]);return {id,name,description,level,xp:Math.floor(xp[id]),next:thresholds[Math.min(10,level+1)],rank:rank(level)};
      }),
      hybrids:unlockedHybrids(xp).map(([id,name,,,description])=>({id,name,description})),
      stations:landmarks.concat(monuments),
      activities:Object.entries(actions).map(([id,action])=>{
        const reason=eligible(s,id);
        return {id,station:action.station,label:action.label,description:action.description,near:nearby(s,stationById[action.station]),allowed:!reason,reason};
      }),
      supplies:{...life.supplies}, plots:life.plots.map(plot=>plot?{readyIn:timeLeft(plot.readyAt,s),blessed:plot.blessed}:null),
      herd:{readyIn:life.herd.readyAt?timeLeft(life.herd.readyAt,s):null}, project:{level:life.project.level,total:3},
      world:{
        day:day(s),mood:life.project.level===3?'La lanterna restaurata segna le sere del borgo.':'La lanterna del borgo attende il restauro.',
        event,news:life.news.map(n=>({...villageEvents.find(e=>e.id===n.id),day:n.day,block:n.block})),
        npcs:Object.values(npcProfiles).map(({direction,...npc})=>({...npc,status:npc.schedule[current]})),
        continents,statues:monuments,statue:monuments.find(m=>m.active)||monuments[0],hunts:life.hunts,
        deathCaches:life.deathCaches.map(site=>({...site})),
        discoveries:(Object.keys(life.visits)).length
      }
    };
  }

  function respawn(s) {
    const shrine=statueById[s?.life?.checkpoint];
    return shrine?{region:shrine.region,...shrine.spawn}:null;
  }
  function drop(s,gold){
    if(gold<=0)return;
    const {x,y}=s.player,existing=s.life.deathCaches.find(c=>c.region===s.region);
    if(existing)existing.gold+=gold;
    else s.life.deathCaches.push({region:s.region,x,y,gold});
  }

  function drawSite(ctx,site,s,t) {
    const {x,y,id}=site,life=s.life;
    ctx.save();ctx.translate(x|0,y|0);
    const px=(color,dx,dy,w,h)=>{ctx.fillStyle=color;ctx.fillRect(dx,dy,w,h);};
    if(id==='death-cache'){
      px('#213132',-5,-3,10,4);px('#785c44',-4,-9,8,7);px('#dbb87b',-3,-7,6,4);px('#f2da8e',-1,-8,2,4);
    }else if(own(statueById,id)){
      if(life.checkpoint===id){px('#7abee1',-4,-15,8,1);
        if(Math.sin(t*4)>-.2){px('#e4ffe1',0,-37,1,6);px('#e4ffe1',-2,-35,5,1);}}
    }else if(id==='field'){
      for(let i=0;i<2;i++){
        const dx=i*13-13,plot=life.plots[i];
        px('#675043',dx,-3,11,4);px('#977358',dx+1,-2,9,1);
        if(plot){
          const ripe=plot.readyAt<=s.time;
          for(let j=0;j<2;j++){
            const blade=dx+2+j*5;
            px('#5b8450',blade,-5,2,4);px(ripe?'#ffdc83':'#94bb65',blade-1,ripe?-8:-6,3,2);
            if(plot.blessed&&Math.sin(t*4+j)>.2)px('#bdf6cc',blade-1,-9,1,1);
          }
        }
      }
    }else if(id==='pen'){
      const canCollect=life.herd.readyAt>0&&life.herd.readyAt<=s.time;
      px('#77604a',-7,-2,15,2);px('#ae9067',-7,-7,2,8);px('#ae9067',6,-7,2,8);
      px('#5c625b',-4,-4,7,5);px('#e4d7b7',-4,-8,7,5);px('#a6977e',2,-8,4,4);
      px(canCollect?'#ffdb70':'#5a4939',4,-7,1,1);px('#6a5443',-3,-1,2,2);px('#6a5443',1,-1,2,2);
      if(life.herd.fedUntil>s.time&&Math.sin(t*3)>.5)px('#eda774',-1,-11,2,2);
    }else if(id==='workbench'){
      px('#574035',-5,-7,10,7);px('#9c7e58',-6,-8,12,2);
      const built=life.project.level;
      px('#57463a',-2,-16,4,9);
      if(built>0)px('#a68b61',-3,-17,6,2);
      if(built>1)px('#9d7150',-3,-15,6,5);
      if(built===3){px('#f2bc69',-2,-14,4,3);if(Math.sin(t*5)>.18)px('#fff599',-1,-14,2,2);}
    }else{
      px('#7e6851',-3,-6,7,6);px('#c2a778',-6,-9,12,3);px('#e0c69c',-3,-10,7,1);
    }
    ctx.restore();
  }

  function actors(s,t=0) {return sites(s).map(site=>({x:site.x,y:site.y,draw:ctx=>drawSite(ctx,site,s,t)}));}

  window.Life={create,restore,view,progress,record,tick,sites,actors,use,command,respawn,drop,npcPoint,continents,level:(s,id)=>levelOf(s.life?.xp[id]||0)};
})();

