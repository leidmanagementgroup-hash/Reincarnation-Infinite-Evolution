/* Scoperta, bottino irripetibile e successione del Santuario della Marea Muta. */
(() => {
  'use strict';
  const Land=window.LegendaryLand;
  const probability=128, discoveryRange=29, entryRange=22, throneRange=27;
  const yearsUntilHeir=7, entranceSalt=0xa9bac62b;
  const locations=[
    ['ancient-valley',716,434],['frost-pass',877,304],['verdant-canopy',773,329],
    ['golden-savanna',863,432],['dune-port',794,435],['winter-citadel',276,418],
    ['moon-grove',546,382],['root-sanctuary',813,303],['sunken-dunes',661,405]
  ];
  const monsters=Object.freeze({
    nadir:Object.freeze({name:'Nadir, il Vegliante Sommerso',habitat:Land.region.name,
      description:'Custode originario della Marea Muta. I suoi inni chiudono le vie di fuga e si spezzano in fendenti.',
      boss:true,legendary:true,phases:3,hp:1450,damage:34,speed:44,xp:390,gold:135,level:13,color:'#bddbd6'}),
    'dungeon-heir':Object.freeze({name:'Nerav, il Re delle Colonne',habitat:Land.region.name,
      description:'Un nuovo sovrano ha reclutato guerrieri e piegato il trono alla risonanza della pietra.',
      boss:true,legendary:true,phases:2,hp:1660,damage:37,speed:48,xp:445,gold:152,level:14,color:'#f1c778'}),
    'nadir-echo':Object.freeze({name:'Eco delle Onde',habitat:Land.region.name,
      description:'Un frammento vivente del canto sepolto. Si tiene a distanza e scaglia vibrazioni.',
      legendary:true,behavior:'caster',hp:98,damage:22,speed:46,xp:53,gold:11,level:8,color:'#b3bcf1'}),
    'dungeon-retainer':Object.freeze({name:'Lancia di Nerav',habitat:Land.region.name,
      description:'Una sentinella reclutata dal nuovo sovrano. Si getta verso il bersaglio quando trova un varco.',
      legendary:true,behavior:'charger',hp:138,damage:26,speed:61,xp:66,gold:15,level:10,color:'#e7b679'})
  });
  const lore=[
    {id:'threshold-lore',x:190,y:531,title:'Iscrizione della Soglia Sommersa',
      text:'Al ritorno le campane tacquero. Gli Ardel consegnarono il suono al vegliante e sigillarono il bacino affinché il mare non lo reclamasse.'},
    {id:'cloister-lore',x:560,y:207,title:'Tavola dei flutti',
      text:'Sulle tavolette l’acqua è dipinta senza nome. Il custode custodisce il battito del mare. Solo chi lo interrompe può ereditare il trono.'}
  ];
  const catalyst=Object.freeze({
    id:'echo-renewal',name:'Eco della Rinascita',category:'magic',quest:true,icon:'shard',
    description:'Unico residuo per un rito raro. Non garantisce il risveglio.'
  });
  const own=(obj,key)=>Object.hasOwn(obj,key);
  const obj=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const atTime=(value,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=max;
  const count=(value,max)=>Number.isSafeInteger(value)&&value>=0&&value<=max;
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const fail=text=>({ok:false,text});
  const day=s=>window.Calendar?.absoluteDays(s.calendar,s.time)??Math.floor(s.time/480);
  const yearLength=()=>4*(window.Calendar?.daysPerSeason||12);
  const originalFell=s=>typeof s.legendary?.originalDefeatedAt==='number';
  function mix(n){
    n=Math.imul(n^(n>>>16),0x85ebca6b);
    n=Math.imul(n^(n>>>13),0xc2b2ae35);
    return (n^(n>>>16))>>>0;
  }
  function location(seed){
    const roll=mix((Number(seed)>>>0)^entranceSalt);
    if(roll%probability!==0)return null;
    const [region,x,y]=locations[mix(roll^0xfa912fb5)%locations.length];
    return {region,x,y};
  }
  function create(seed){
    return {
      schema:1,entrance:location(seed),discoveredAt:null,visits:0,read:[],
      originalDefeatedAt:null,originalDay:null,claimed:false,successorAt:null,
      heirDefeatedAt:null,domain:null,claimLog:[]
    };
  }
  function restore(raw,s){
    if(raw===undefined)return create(s.seed);
    const expected=location(s.seed);
    if(!obj(raw)||raw.schema!==1||!count(raw.visits,1e8)||typeof raw.claimed!=='boolean'||
      !Array.isArray(raw.read)||raw.read.length>lore.length||new Set(raw.read).size!==raw.read.length||
      raw.read.some(id=>!lore.some(l=>l.id===id))||
      !Array.isArray(raw.claimLog)||raw.claimLog.length>2)return null;
    const e=raw.entrance;
    if(expected?!(obj(e)&&e.region===expected.region&&e.x===expected.x&&e.y===expected.y):e!==null)return null;
    const visited=raw.discoveredAt!==null,defeated=raw.originalDefeatedAt!==null;
    const successor=raw.successorAt!==null,heirDefeated=raw.heirDefeatedAt!==null;
    if(visited&&(!expected||!atTime(raw.discoveredAt,s.time))||
      !visited&&(raw.visits!==0||raw.read.length||defeated||successor||raw.domain!==null||raw.claimLog.length)||
      defeated&&(!visited||raw.visits===0||!atTime(raw.originalDefeatedAt,s.time)||raw.originalDefeatedAt<raw.discoveredAt||
        !count(raw.originalDay,1e10)||raw.originalDay>day(s))||
      !defeated&&(raw.originalDay!==null||raw.claimed||successor||raw.domain!==null||raw.claimLog.length)||
      successor&&(!atTime(raw.successorAt,s.time)||raw.successorAt<raw.originalDefeatedAt||day(s)<raw.originalDay+yearsUntilHeir*yearLength())||
      heirDefeated&&(!successor||!atTime(raw.heirDefeatedAt,s.time)||raw.heirDefeatedAt<raw.successorAt))return null;
    const claims=[];
    let previous=0;
    for(const claim of raw.claimLog){
      if(!obj(claim)||claim.race!==s.player.race||!atTime(claim.at,s.time))return null;
      const current=claim.victory==='original'?1:claim.victory==='heir'?2:0;
      const victoryAt=current===1?raw.originalDefeatedAt:raw.heirDefeatedAt;
      if(current<=previous||victoryAt===null||victoryAt>claim.at)return null;
      previous=current;
      claims.push({race:claim.race,at:claim.at,victory:claim.victory});
    }
    const last=claims.at(-1),domain=raw.domain;
    if(domain!==null&&(!obj(domain)||!last||domain.race!==last.race||domain.at!==last.at||
      domain.victory!==last.victory||successor&&!heirDefeated))return null;
    return {schema:1,entrance:expected,discoveredAt:raw.discoveredAt,visits:raw.visits,read:[...raw.read],
      originalDefeatedAt:raw.originalDefeatedAt,originalDay:raw.originalDay,claimed:raw.claimed,successorAt:raw.successorAt,
      heirDefeatedAt:raw.heirDefeatedAt,domain:domain?{...last}:null,claimLog:claims};
  }
  function ritualEarned(s){return originalFell(s)&&s.legendary.claimed;}
  function validateRegions(s){
    const l=s?.legendary;
    if(!l)return false;
    const storage=s.region===Land.id?s:s.regions?.[Land.id],entered=l.visits>0,defeated=l.originalDefeatedAt!==null;
    const heirDead=l.heirDefeatedAt!==null;
    if(entered!==Boolean(storage)||entered&&!l.entrance||defeated!==l.claimed)return false;
    if(entered){
      const original=storage.monsters.find(m=>m.type==='nadir'),heir=storage.monsters.find(m=>m.type==='dungeon-heir');
      if(!original||!heir||defeated!==(original.hp===0)||heirDead!==(heir.hp===0))return false;
      if(l.successorAt===null&&(heir.hp!==heir.maxHp||heir.engaged||heir.phase!==1))return false;
    }
    const kills=s.defeated||{};
    if((kills.nadir||0)!==(defeated?1:0)||(kills['dungeon-heir']||0)!==(heirDead?1:0))return false;
    if(window.Inventory){
      const sword=window.Inventory.quantity(s,'divine-nadir'),echo=window.Inventory.quantity(s,catalyst.id);
      if(sword!==(defeated?1n:0n)||echo>(defeated?1n:0n)||window.Inventory.quantity(s,'divine-nadir','deposit')>0n||
        window.Inventory.quantity(s,catalyst.id,'deposit')>0n)return false;
    }
    return !defeated||!window.Gear?.owns||window.Gear.owns(s,'divine-nadir');
  }
  function allows(s,type){
    if(!own(monsters,type))return true;
    const l=s?.legendary;
    if(s.region!==Land.id||!l||l.visits===0)return false;
    if(type==='nadir')return l.originalDefeatedAt===null;
    if(type==='dungeon-heir')return l.successorAt!==null&&l.heirDefeatedAt===null;
    if(type==='dungeon-retainer')return l.successorAt!==null&&l.heirDefeatedAt===null&&!l.domain;
    return !l.domain&&l.successorAt===null;
  }
  function discover(s){
    const l=s.legendary;
    if(l.discoveredAt!==null)return false;
    l.discoveredAt=s.time;
    return true;
  }
  function grant(s){
    const l=s.legendary;
    if(l.claimed||!originalFell(s)||s.region!==Land.id)return false;
    if(!window.Inventory?.define(s,catalyst)||!window.Gear?.awardDivine(s,'divine-nadir'))return false;
    if(window.Inventory.quantity(s,catalyst.id)===0n)window.Inventory.add(s,catalyst.id,1n);
    l.claimed=true;
    return true;
  }
  function recordKill(s,type){
    const l=s?.legendary;
    if(!l||s.region!==Land.id||l.visits===0)return [];
    if(type==='nadir'&&l.originalDefeatedAt===null){
      l.originalDefeatedAt=s.time;l.originalDay=day(s);
      const reward=grant(s);
      return ['Nadir è caduto per sempre.',...(reward?['Hai ottenuto l’Arma Divina e l’Eco della Rinascita.']:[])];
    }
    if(type==='dungeon-heir'&&l.successorAt!==null&&l.heirDefeatedAt===null){
      l.heirDefeatedAt=s.time;
      return ['Nerav è caduto. Le sue lance hanno lasciato il santuario.'];
    }
    return [];
  }
  function tick(s){
    const l=s?.legendary;
    if(!l?.entrance)return [];
    const notes=[],e=l.entrance;
    if(l.discoveredAt===null&&s.region===e.region&&dist(s.player,e)<=discoveryRange&&discover(s)){
      notes.push('Hai scoperto '+Land.region.name+'.');
    }
    if(originalFell(s)&&!l.claimed&&s.region===Land.id&&grant(s))notes.push('L’Arma Divina e l’Eco della Rinascita ti attendono.');
    if(originalFell(s)&&l.successorAt===null&&day(s)>=l.originalDay+yearsUntilHeir*yearLength()){
      l.successorAt=s.time;l.domain=null;
      notes.push('Il trono della Marea Muta ha un nuovo sovrano.');
    }
    return notes;
  }
  const site=(id,x,y,range,text)=>({id,kind:'legendary',point:{x,y},range,text});
  function sites(s){
    const l=s?.legendary;
    if(!l?.entrance)return [];
    const e=l.entrance;
    if(s.region===e.region&&(l.discoveredAt!==null||dist(s.player,e)<=discoveryRange)){
      return [site('legendary-entry',e.x,e.y,entryRange,'Entra nel Santuario della Marea Muta')];
    }
    if(s.region!==Land.id||l.visits===0)return [];
    const rows=[
      site('legendary-exit',Land.exit.x,Land.exit.y,22,'Ritorna in superficie'),
      ...lore.map(({id,x,y,title})=>site(id,x,y,23,title))
    ];
    if(l.originalDefeatedAt!==null)rows.push(site('legendary-throne',Land.throne.x,Land.throne.y,throneRange,'Esamina il trono'));
    return rows;
  }
  function use(s,id){
    const local=sites(s).find(x=>x.id===id);
    if(!local||dist(s.player,local.point)>local.range)return fail('Avvicinati al luogo.');
    const l=s.legendary;
    if(id==='legendary-entry'){
      discover(s);l.visits++;
      return {ok:true,changed:true,transition:{region:Land.id,...Land.spawn}};
    }
    if(id==='legendary-exit')return {ok:true,transition:{...l.entrance}};
    if(id==='legendary-throne')return {ok:true,panel:'legendary'};
    const first=!l.read.includes(id);
    if(first)l.read.push(id);
    return {ok:true,changed:first,panel:'legendary',detail:id};
  }
  function command(s,data){
    const l=s?.legendary;
    if(!l||!obj(data)||data.op!=='claim')return fail('Operazione sconosciuta.');
    if(s.region!==Land.id||dist(s.player,Land.throne)>throneRange)return fail('Raggiungi il trono del santuario.');
    if(!originalFell(s)||l.successorAt!==null&&l.heirDefeatedAt===null)return fail('Il sovrano difende ancora il trono.');
    if(l.domain)return fail('Hai già assunto il dominio del santuario.');
    const victory=l.heirDefeatedAt===null?'original':'heir';
    const claim={race:s.player.race,at:s.time,victory};
    l.domain=claim;l.claimLog.push({...claim});
    return {ok:true,changed:true,text:'Ora governi il Santuario della Marea Muta. Gli echi si sono quietati.'};
  }
  function view(s){
    const l=s?.legendary;
    if(!l?.entrance||l.discoveredAt===null)return {discovered:false};
    const heir=l.successorAt!==null&&l.heirDefeatedAt===null;
    const ruler=heir?monsters['dungeon-heir'].name:l.originalDefeatedAt===null?monsters.nadir.name:
      l.domain?'Tu, sovrano del santuario':'Il trono è vacante';
    const ecology=heir?'Le Lance di Nerav occupano gli antichi chiostri. Gli echi sono scomparsi.':
      l.domain?'Il canto degli echi tace sotto il tuo dominio.':
      'Gli echi delle onde risuonano ancora nelle camere.';
    const heirInDays=l.originalDay!==null&&l.successorAt===null?
      Math.max(0,l.originalDay+yearsUntilHeir*yearLength()-day(s)):null;
    return {discovered:true,id:Land.id,name:Land.region.name,description:Land.region.description,
      entrance:{...l.entrance},regionName:window.World.regions[l.entrance.region]?.name,
      ruler,ecology,visits:l.visits,defeated:l.originalDefeatedAt!==null,claimed:l.claimed,
      successor:l.successorAt!==null,heirInDays,heirDefeated:l.heirDefeatedAt!==null,governed:!!l.domain,
      lore:lore.filter(row=>l.read.includes(row.id)).map(({id,title,text})=>({id,title,text})),
      canClaim:s.region===Land.id&&dist(s.player,Land.throne)<=throneRange&&
        l.originalDefeatedAt!==null&&!heir&&!l.domain
    };
  }
  function actors(s,t=0){
    const l=s?.legendary;
    if(!l?.entrance||l.discoveredAt===null)return [];
    const e=l.entrance;
    if(s.region===e.region)return [{x:e.x,y:e.y,draw:c=>Land.portal(c,e.x,e.y,t)}];
    if(s.region!==Land.id)return [];
    const exit=Land.exit, rows=[{x:exit.x,y:exit.y,draw:c=>Land.portal(c,exit.x,exit.y,t,true)}];
    for(const entry of lore){
      const {x,y,id}=entry;
      rows.push({x,y,draw(c){
        // Lapide della marea: tavola incisa a onde su un basamento; il glifo resta il segnale letto/non letto.
        const box=(col,dx,dy,w,h)=>{c.fillStyle=col;c.fillRect(x+dx,y+dy,w,h);};
        box('rgba(8,16,24,.5)',-9,-1,19,3);
        box('#1f2b37',-9,-4,18,4);box('#4f6573',-8,-4,16,1);
        box('#24303d',-7,-21,14,18);box('#647c8a',-6,-21,12,2);box('#56707e',-6,-19,11,15);box('#7f97a2',-6,-19,1,15);
        for(let k=0;k<3;k++){box('#3e5664',-5,-9+k*3,10,1);box('#89a7ad',-4+k,-10+k*3,2,1);}
        box('#9fb6be',-2,-23,4,2);
        Land.glyph(c,x,y-14,l.read.includes(id)?'#a2b7af':'#d8bbe7');
      }});
    }
    const {x,y}=Land.throne,bronze=l.successorAt!==null&&l.heirDefeatedAt===null;
    rows.push({x,y,draw(c){
      // Trono della Marea Muta: schienale a conchiglia a raggi, braccioli e gradino; colori di bronzo con l'erede.
      const P=bronze?['#3a2a22','#7d573f','#bd8757','#e6be86']:['#1f2c38','#4b6371','#8daaba','#cfe2e4'];
      const box=(col,dx,dy,w,h)=>{c.fillStyle=col;c.fillRect(x+dx,y+dy,w,h);};
      box('rgba(8,16,24,.5)',-18,-1,37,3);box(P[0],-17,-6,34,6);box(P[2],-16,-6,32,1);
      for(let k=0;k<7;k++){const dx=-15+k*5,top=-40+Math.abs(3-k)*3;box(P[0],dx-1,top,5,30-top-14);box(P[1],dx,top+1,3,28-top-14);box(P[3],dx,top+1,1,2);}
      box(P[0],-14,-24,28,18);box(P[1],-13,-24,26,17);
      box(P[2],-13,-26,26,4);box(P[2],-16,-8,32,3);
      box(P[0],-19,-16,6,10);box(P[1],-18,-15,4,8);box(P[0],13,-16,6,10);box(P[1],14,-15,4,8);
      if(l.domain)Land.glyph(c,x,y-17,'#d6e4ae');
    }});
    return rows;
  }

  window.Legendary={create,restore,install:()=>Land.region,monsters,allows,sites,use,recordKill,tick,
    view,command,actors,validateRegions,ritualEarned};
})();

