(() => {
  'use strict';
  const items=[
    ['rod','Canna da pesca','tools','Per lanciare e recuperare la lenza.'],
    ['hammer','Martello da forgia','tools','Per lavorare il metallo caldo.'],
    ['hoe','Zappa','tools','Per preparare le aiuole.'],
    ['watering','Annaffiatoio','tools','Per irrigare le colture.'],
    ['brush','Spazzola da stalla','tools','Per accudire le lanose.'],
    ['pan','Pentola da campo','tools','Per cucinare alla locanda.'],
    ['camp','Corredo da campo','tools','Per dormire in un luogo sicuro.'],
    ['water','Acqua di fonte','food','Disseta.'],
    ['bread','Pane del viandante','food','Un pasto semplice e conservabile.'],
    ['springroot','Rapa di Vela','ingredients','Radice di primavera.'],
    ['summerberry','Bacca del sole','ingredients','Frutto estivo.'],
    ['autumnsquash','Zucca ramata','ingredients','Ortaggio autunnale.'],
    ['winterleaf','Foglia d’inverno','ingredients','Cresce anche al gelo.'],
    ['milk','Latte di lanosa','ingredients','Fresco dal recinto.'],
    ['woolcloak','Mantella di lana','armor','Riduce la perdita di calore finché è nello zaino.'],
    ['roach','Scardola ramata','ingredients','Pesce anche delle acque calme.'],
    ['trout','Trota delle radici','ingredients','Pesce che cambia spesso direzione.'],
    ['perch','Persico di quarzo','ingredients','Si ancora vicino al fondo.'],
    ['mooncarp','Carpa lunare','ingredients','Si trova in acque particolari o al buio.'],
    ...['scarso','buono','ottimo','perfetto'].map((quality,i)=>['blade-'+i,'Lama della forgia · '+quality,'weapons','Attacco +'+(2+i*2)+'.',quality])
  ];
  const crops={spring:'springroot',summer:'summerberry',autumn:'autumnsquash',winter:'winterleaf'};
  const food={
    herb:[6,2,1,'verde'],grain:[13,1,2,'amido'],bread:[24,4,4,'amido'],
    springroot:[16,10,2,'verde'],summerberry:[14,14,5,'verde'],autumnsquash:[23,4,3,'amido'],winterleaf:[12,5,6,'verde'],
    roach:[17,4,3,'pesce'],trout:[20,5,4,'pesce'],perch:[22,2,4,'pesce'],mooncarp:[18,5,7,'pesce'],milk:[15,22,4,'latte']
  };
  const methods={
    stufato:{name:'Stufato',minutes:9,hunger:7,water:11,energy:2},
    piastra:{name:'Piastra',minutes:7,hunger:13,water:0,energy:3},
    vapore:{name:'Vapore',minutes:8,hunger:4,water:7,energy:8}
  };
  const shore={
    valley:[584,553,'Riva del Ponte di Rame'], 'frost-pass':[795,743,'Stagno dei larici'],
    'verdant-canopy':[734,674,'Acque del Velo'], 'golden-savanna':[733,690,'Riva dei Giganti'],
    'dune-port':[749,701,'Molo delle Vele']
  };
  const stations={
    smithing:{region:'valley',x:493,y:682,name:'Banco di Ivo',tool:'hammer',job:'smith'},
    farming:{region:'valley',x:443,y:675,name:'Orto di Vela',tool:'hoe',job:'farmer'},
    husbandry:{region:'valley',x:352,y:666,name:'Recinto delle lanose',tool:'brush',job:'herder'},
    cooking:{region:'valley',x:486,y:750,name:'Locanda del Focolare',tool:'pan',job:'cook'}
  };
  const labels={fishing:'Pesca',smithing:'Forgia',farming:'Agricoltura',husbandry:'Allevamento',cooking:'Cucina'};
  const own=(obj,key)=>Object.hasOwn(obj,key);
  const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
  const valid=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
  const int=(n,min,max)=>Number.isInteger(n)&&valid(n,min,max);
  const has=(s,id,qty=1)=>Inventory.quantity(s,id)>=BigInt(qty);
  const stamp=s=>Calendar.timestamp(s.calendar,s.time);
  const animal=(id,born)=>({id,born,trust:0,feedAt:0,goodsAt:0});
  const craftResult=(text,id,amount=1,meta={})=>({ok:true,changed:true,text,event:{id,amount,meta}});
  const blocked=text=>({ok:false,text});
  const qualityIndex={scarso:0,buono:1,ottimo:2,perfetto:3};
  const recipeId=(a,b,method)=>[method,...[a,b].sort()].join('-');

  function create(s){
    const t=stamp(s);
    return {schema:1,plots:[null,null],animals:[animal(1,t-4300),animal(2,t-4300)],nextAnimal:3,breedAt:0,round:0,recipes:{},weapon:null};
  }

  function recipeDefinition(id,recipe){
    const {a,b,method,quality}=recipe;
    const name=methods[method].name+' · '+[a,b].map(key=>foodName(key)).join(' e ');
    return {id:'dish-'+id,name,category:'food',icon:'herb',quality,
      description:'Piatto preparato con '+methods[method].name.toLowerCase()+'.'};
  }
  function foodName(id){
    return items.find(row=>row[0]===id)?.[1]||Inventory.definition({},id)?.name||id;
  }
  function install(s,starter=false){
    for(const [id,name,category,description,quality] of items){
      if(!Inventory.definition(s,id))Inventory.define(s,{id,name,category,description,icon:category==='tools'?'ward':category==='weapons'?'core':'herb',quality});
    }
    if(starter){
      for(const id of ['rod','hammer','hoe','watering','brush','pan','camp'])Inventory.add(s,id,1);
      Inventory.add(s,'water',3);Inventory.add(s,'bread',2);
    }
  }
  function restore(raw,s){
    if(raw===undefined)return create(s);
    if(!plain(raw)||raw.schema!==1||!Array.isArray(raw.plots)||raw.plots.length!==2||
      !raw.plots.every(p=>p===null||plain(p)&&Object.values(crops).includes(p.crop)&&valid(p.ready,0,1e14)&&int(p.quality,0,3))||
      !Array.isArray(raw.animals)||raw.animals.length<2||raw.animals.length>8||!int(raw.nextAnimal,3,1e9)||
      new Set(raw.animals.map(a=>a?.id)).size!==raw.animals.length||
      !raw.animals.every(a=>plain(a)&&int(a.id,1,raw.nextAnimal-1)&&valid(a.born,-4320,1e14)&&valid(a.trust,0,100)&&valid(a.feedAt,0,1e14)&&valid(a.goodsAt,0,1e14))||
      !valid(raw.breedAt,0,1e14)||!int(raw.round,0,1e9)||!plain(raw.recipes)||
      !Object.entries(raw.recipes).every(([id,r])=>plain(r)&&own(food,r.a)&&own(food,r.b)&&own(methods,r.method)&&own(qualityIndex,r.quality)&&
        id===recipeId(r.a,r.b,r.method)&&int(r.times,1,1e9))||
      !(raw.weapon===null||/^blade-[0-3]$/.test(raw.weapon)&&has(s,raw.weapon)))return null;
    return raw;
  }
  function station(s,kind){
    if(kind!=='fishing'){
      const raw=stations[kind],id={smithing:'forge',cooking:'inn-kitchen'}[kind],
        urban=id&&window.UrbanWorld?.site(s,id);
      return urban?{...raw,...urban.point,region:s.region,name:urban.name||(id==='forge'?'Incudine di Velaris':'Cucina di Velaris')}:raw;
    }
    const point=shore[s.region];
    return point&&{region:s.region,x:point[0],y:point[1],name:point[2],tool:'rod',job:'fisher'};
  }
  const isNear=(s,site)=>!!site&&s.region===site.region&&Math.hypot(s.player.x-site.x,s.player.y-site.y)<=35;
  const rn=(s,job)=>Life.level(s,job);
  function ingredients(s,a,b){
    return own(food,a)&&own(food,b)&&has(s,a,a===b?2:1)&&(a===b||has(s,b));
  }
  function startRule(s,d){
    const {kind}=d,site=station(s,kind),w=s.workshop,t=stamp(s);
    if(!site)return 'Questa regione non ha ancora un punto di pesca segnalato.';
    if(!isNear(s,site))return 'Avvicinati a '+site.name+'.';
    if(!has(s,site.tool))return 'Serve '+foodName(site.tool)+'.';
    if(kind==='smithing'&&!has(s,'ore',2))return 'Servono 2 pezzi di minerale lucente.';
    if(kind==='farming'){
      if(w.plots.every(Boolean))return 'Raccogli prima da un’aiuola.';
      if(!has(s,'seeds')||!has(s,'watering'))return 'Servono sementi e annaffiatoio.';
    }
    if(kind==='husbandry'){
      const a=w.animals.find(a=>a.id===d.animal);
      if(!a)return 'Scegli una lanosa.';
      if(t<a.feedAt)return 'Questa lanosa ha già ricevuto cure da poco.';
      if(!has(s,'grain')&&!has(s,'herb'))return 'Occorrono grano o erba di rugiada.';
    }
    if(kind==='cooking'&&(!own(methods,d.method)||!ingredients(s,d.a,d.b)))return 'Scegli una tecnica e due ingredienti disponibili.';
    return '';
  }
  function start(s,d){
    if(!plain(d)||!own(labels,d.kind))return blocked('Mestiere sconosciuto.');
    const reason=startRule(s,d);
    if(reason)return blocked(reason);
    const time=Calendar.view(s.calendar,s.time,s.region),site=station(s,d.kind);
    const fishBySeason={spring:['roach','trout'],summer:['roach','perch'],autumn:['trout','perch'],winter:['perch','trout']};
    const fish=s.region==='dune-port'?(time.seasonId==='winter'?['roach']:['roach','perch']):s.region==='frost-pass'&&time.seasonId==='winter'?['perch']:[...fishBySeason[time.seasonId]];
    if(time.phase==='night'||s.region==='verdant-canopy')fish.push('mooncarp');
    const q=d.kind==='cooking'?methods[d.method]:null;
    const options={fish,difficulty:1-rn(s,site.job)*.024,recipe:q&&{id:d.method,name:q.name,minutes:q.minutes}};
    const seed=(s.seed^Math.imul(s.workshop.round+1,298409269)^Math.floor(stamp(s)))>>>0;
    const context={...d,season:time.seasonId,weather:time.weatherKind,region:s.region};
    return {ok:true,session:GamePractice.create(d.kind,seed,options),context};
  }
  function finish(s,d,result){
    const rule=startRule(s,d);
    if(rule)return blocked(rule);
    const w=s.workshop,t=stamp(s),tier=qualityIndex[result.quality]??0;
    w.round=Math.min(1e9,w.round+1);
    if(!result.success)return craftResult('Tentativo concluso. Gli strumenti e i materiali sono ancora con te.',d.kind+'Attempt');
    switch(d.kind){
      case 'fishing':{
        const catchId=result.catchId;
        if(!own(food,catchId))return blocked('Il pesce è sfuggito.');
        const n=1+(tier===3&&rn(s,'fisher')>=7?1:0);
        Inventory.add(s,catchId,n);
        return craftResult(foodName(catchId)+' · '+result.quality,'fish',n,{kind:catchId,quality:tier});
      }
      case 'smithing':
        Inventory.take(s,'ore',2);Inventory.add(s,'blade-'+tier,1);
        if(rn(s,'smith')>=7&&tier>=2)Inventory.add(s,'ore',1);
        return craftResult('Lama forgiata · '+result.quality,'forge',1,{quality:tier});
      case 'farming':{
        Inventory.take(s,'seeds',1);
        const crop=crops[d.season],wait=80-tier*8-(d.weather==='rain'||d.weather==='storm'?14:0);
        w.plots[w.plots.indexOf(null)]={crop,ready:t+wait,quality:tier};
        return craftResult(foodName(crop)+' seminata · Raccolta fra '+wait+' minuti di gioco.','sow');
      }
      case 'husbandry':{
        Inventory.take(s,has(s,'grain')?'grain':'herb',1);
        const a=w.animals.find(a=>a.id===d.animal);
        a.trust=Math.min(100,a.trust+16+tier*8);
        a.feedAt=t+120;
        if(t-a.born>=4320&&!a.goodsAt)a.goodsAt=t+100-tier*15;
        return craftResult('Lanosa accudita · Fiducia '+a.trust+'/100.','care',1,{quality:tier});
      }
      case 'cooking':{
        const {a,b,method}=d;
        Inventory.take(s,a,1);Inventory.take(s,b,1);
        const id=recipeId(a,b,method),old=w.recipes[id],fresh=!old;
        const recipe=w.recipes[id]={a,b,method,quality:old&&qualityIndex[old.quality]>tier?old.quality:result.quality,times:Math.min(1e9,(old?.times||0)+1)};
        const dish=recipeDefinition(id+'-'+tier,{...recipe,quality:result.quality});
        Inventory.define(s,dish);Inventory.add(s,dish.id,rn(s,'cook')>=7&&tier>=2?2:1);
        return craftResult((fresh?'Nuova ricetta · ':'')+dish.name+' · '+result.quality,'cook',1,{discovered:fresh,quality:tier});
      }
    }
  }
  function command(s,d){
    if(!plain(d))return blocked('Scegli un’attività.');
    const w=s.workshop,t=stamp(s);
    if(d.op==='sew'){
      if(!isNear(s,station(s,'smithing'))||!has(s,'wool',2))return blocked('Servono una postazione di lavoro e 2 unità di lana.');
      Inventory.take(s,'wool',2);Inventory.add(s,'woolcloak',1);
      return craftResult('Hai cucito una mantella da viaggio.','sew');
    }
    if(d.op==='equip'){
      if(!/^blade-[0-3]$/.test(d.id)||!has(s,d.id))return blocked('La lama non è nello zaino.');
      w.weapon=w.weapon===d.id?null:d.id;
      return {ok:true,changed:true,text:w.weapon?'Lama equipaggiata.':'Lama riposta.'};
    }
    if(d.op==='harvest'){
      if(!isNear(s,stations.farming))return blocked('Avvicinati all’Orto di Vela.');
      const plot=w.plots[d.plot];
      if(!plot||plot.ready>t||!int(d.plot,0,1))return blocked('L’aiuola non è pronta.');
      w.plots[d.plot]=null;
      const n=2+plot.quality+(rn(s,'farmer')>=7?1:0);
      Inventory.add(s,plot.crop,n);Inventory.add(s,'seeds',1);
      return craftResult('Raccolto · '+foodName(plot.crop)+' ×'+n,'reap',1,{kind:plot.crop});
    }
    if(d.op==='products'||d.op==='breed'){
      if(!isNear(s,stations.husbandry))return blocked('Avvicinati al recinto delle lanose.');
      if(d.op==='products'){
        const a=w.animals.find(a=>a.id===d.animal);
        if(!a?.goodsAt||a.goodsAt>t)return blocked('Non ci sono ancora prodotti da raccogliere.');
        a.goodsAt=0;Inventory.add(s,'milk',1);Inventory.add(s,'wool',1+(rn(s,'herder')>=7?1:0));
        return craftResult('Latte e lana raccolti.','ranch');
      }
      if(w.animals.length>=8||w.breedAt>t||w.animals.filter(a=>t-a.born>=4320&&a.trust>=45).length<2||!has(s,'grain',2))
        return blocked('Servono due adulti con fiducia 45, 2 grani e spazio nel recinto.');
      Inventory.take(s,'grain',2);w.animals.push(animal(w.nextAnimal++,t));w.breedAt=t+2880;
      return craftResult('È nata una lanosa. Diventerà adulta dopo tre giorni.','ranch');
    }
    return blocked('Attività sconosciuta.');
  }
  function nutrition(s,id){
    if(id==='water')return {hunger:0,thirst:36,energy:0};
    if(id==='bread')return {hunger:24,thirst:3,energy:5};
    if(id==='milk')return {hunger:14,thirst:20,energy:4};
    const match=/^dish-(stufato|piastra|vapore)-([a-z]+)-([a-z]+)-([0-3])$/.exec(id);
    if(!match)return null;
    const [,name,a,b,tier]=match,recipe=s.workshop.recipes[recipeId(a,b,name)];
    if(!recipe)return null;
    const q=Number(tier),ma=food[a],mb=food[b],method=methods[name];
    return {hunger:Math.min(48,(ma[0]+mb[0])/2+method.hunger+q*3),
      thirst:Math.min(30,(ma[1]+mb[1])/2+method.water+q*2),energy:Math.min(25,(ma[2]+mb[2])/2+method.energy+q*2),
      buff:q>=1?{kind:ma[3]==='pesce'||mb[3]==='pesce'?'attack':ma[3]==='verde'||mb[3]==='verde'?'speed':'defense',power:q,duration:120+q*25}:null};
  }
  function sites(s){
    return ['fishing','cooking'].map(kind=>{
      const site=station(s,kind);
      return site?.region===s.region&&!window.UrbanWorld?.kind(s.region)&&!window.UrbanDistricts?.roomKind(s.region)
        ?{...site,id:kind,kind:'workshop',range:25,point:{x:site.x,y:site.y},text:site.name+' · '+labels[kind]}:null;
    }).filter(Boolean);
  }
  function view(s){
    const w=s.workshop,t=stamp(s);
    return {activities:Object.keys(labels).map(kind=>{
      const site=station(s,kind);
      return {kind,name:labels[kind],site,near:isNear(s,site),reason:startRule(s,{kind})};
    }), plots:w.plots.map((p,i)=>p?{slot:i,name:foodName(p.crop),wait:Math.max(0,Math.ceil(p.ready-t))}:{slot:i}),
      animals:w.animals.map(a=>({...a,adult:t-a.born>=4320,days:Math.max(0,Math.floor((t-a.born)/1440)),canFeed:t>=a.feedAt,
        product:a.goodsAt>0?Math.max(0,Math.ceil(a.goodsAt-t)):null})),
      ingredients:Object.keys(food).filter(id=>has(s,id)).map(id=>({id,name:foodName(id),quantity:Inventory.format(Inventory.quantity(s,id))})),
      methods:Object.entries(methods).map(([id,o])=>({id,name:o.name})),
      recipes:Object.entries(w.recipes).map(([id,r])=>({...recipeDefinition(id,r),times:r.times})),weapon:w.weapon};
  }
  window.Tradecraft={create,restore,install,start,finish,command,nutrition,sites,view,attack:s=>s.workshop?.weapon&&has(s,s.workshop.weapon)?2+Number(s.workshop.weapon.at(-1))*2:0,
    inn:stations.cooking};
})();
