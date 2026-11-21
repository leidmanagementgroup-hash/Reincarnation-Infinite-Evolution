/* Residents, settlement economy and family. Far-away progress runs on calendar intervals. */
(() => {
  'use strict';
  const rows=[
    ['ancient-valley','Edda','goblin','Carovaniera','Attenta agli accordi.','Mael','elf','Archivista','Raccoglie le iscrizioni degli Ardel.'],
    ['frost-pass','Heda','dwarf','Minatrice','Curiosa dei metalli nuovi.','Torv','orc','Guida','Conosce i sentieri del disgelo.'],
    ['winter-citadel','Sigrun','elf','Maestra d’armi','Onora ogni promessa.','Grann','kobold','Lapicida','Insegna il mestiere nella rocca.'],
    ['verdant-canopy','Iria','dryad','Alchimista','Lascia spazio agli esperimenti.','Nilo','slime','Bibliotecario','Salva i testi che nessuno legge.'],
    ['moon-grove','Veira','spirit','Cartografa','Osserva prima di giudicare.','Talen','elf','Ricercatore','Studia la luce delle gemme.'],
    ['golden-savanna','Safa','satyr','Allevatrice','Non lascia indietro nessuno.','Oren','goblin','Mercante','Cerca nuove rotte per il grano.'],
    ['root-sanctuary','Rava','naga','Erborista','Ascolta la foresta ogni mattina.','Temi','troll','Artigiano','Ripara i ponti del borgo.'],
    ['dune-port','Lysa','triton','Navigatrice','Prende appunti sulle maree.','Darun','human','Mercante','Rispetta chi mantiene la parola.'],
    ['sunken-dunes','Yara','vampire','Custode','Lavora meglio al crepuscolo.','Nares','golem','Scalpellino','Ricompone gli stemmi del canyon.']
  ];
  const residents={},regions=rows.map(r=>r[0]),bonds=['unknown','friend','partner','married'];
  const label={unknown:'Conoscenza',friend:'Amicizia',partner:'Corteggiamento',married:'Matrimonio'};
  for(const [id,a,ra,ja,pa,b,rb,jb,pb] of rows){
    for(const [i,[name,race,job,personality]] of [[a,ra,ja,pa],[b,rb,jb,pb]].entries())
      residents[id+'-'+i]={id:id+'-'+i,region:id,name,race,job,personality,index:i,adventurer:i===0};
  }
  const own=(o,k)=>Object.hasOwn(o,k),obj=o=>o&&typeof o==='object'&&!Array.isArray(o);
  const num=(x,max=1e8)=>Number.isFinite(x)&&x>=0&&x<=max;
  const int=(x,max=1e8)=>Number.isInteger(x)&&num(x,max);
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const group=(id)=>World.regions[id]?.continent;
  const mix=(x,n)=>(Math.imul(x^(n*7919),1597334677)>>>0);
  const day=s=>s.calendar?Calendar.ageDays(s.calendar,s.time):Math.floor(s.time/480);
  const childDays=(s,o)=>Math.max(0,Math.floor(s.calendar?(Calendar.timestamp(s.calendar,s.time)-o.bornMinute)/1440:(s.time-o.since)/480));
  const fail=text=>({ok:false,text});
  const done=(text,panel,extra={})=>({ok:true,changed:true,text,panel,...extra});
  function create(seed){
    return {
      people:Object.fromEntries(Object.values(residents).map((a,i)=>[a.id,{region:a.region,enrolled:a.adventurer,career:0,bond:'unknown',
        changedAt:0,memories:[],interest:mix(seed,i)%5!==0,training:0,transfer:false}])),
      towns:Object.fromEntries(regions.map(id=>[id,{level:1,stock:8,trade:0,accord:false}])),
      pulse:-1,partner:null,home:null,children:[]
    };
  }
  function childId(o){return o.id==='ward-1'||o.id==='ward-2';}
  function restore(raw,seed,s){
    if(raw===undefined)return create(seed);
    if(!obj(raw)||!obj(raw.people)||!obj(raw.towns)||!(raw.pulse===-1||int(raw.pulse,1e9))||
      !(raw.partner===null||own(residents,raw.partner))||!(raw.home===null||Build.home(s,raw.home))||
      !Array.isArray(raw.children)||raw.children.length>2||new Set(raw.children.map(o=>o?.id)).size!==raw.children.length||
      !raw.children.every(o=>obj(o)&&childId(o)&&typeof o.name==='string'&&o.name.length<=24&&
        num(o.since,1e10)&&o.since<=s.time&&int(o.aptitude,100)&&['erbe','minerali','magia','vie'].includes(o.path)&&
        typeof o.enrolled==='boolean'&&int(o.career)&&(s.version<5||num(o.bornMinute,Calendar.timestamp(s.calendar,s.time)))))return null;
    if(raw.children.some(o=>o.enrolled&&(s.version<5?Math.floor((s.time-o.since)/480):childDays(s,o))<3))return null;
    if(Object.keys(raw.people).length!==Object.keys(residents).length||Object.keys(raw.towns).length!==regions.length)return null;
    for(const [id,base] of Object.entries(residents)){
      const p=raw.people[id];
      if(!obj(p)||!regions.includes(p.region)||group(p.region)!==group(base.region)||!bonds.includes(p.bond)||
        !num(p.changedAt,1e10)||p.changedAt>s.time||typeof p.enrolled!=='boolean'||!int(p.career)||!int(p.training)||typeof p.transfer!=='boolean'||
        typeof p.interest!=='boolean'||!Array.isArray(p.memories)||p.memories.length>16||
        !p.memories.every(m=>obj(m)&&['chat','trade','gift'].includes(m.kind)&&num(m.at,1e10)&&m.at<=s.time&&
          (s.version<5||int(m.day,day(s)))))return null;
    }
    for(const id of regions){
      const t=raw.towns[id];
      if(!obj(t)||![1,2,3].includes(t.level)||!int(t.stock,28)||!int(t.trade)||typeof t.accord!=='boolean')return null;
    }
    if(raw.partner&&raw.people[raw.partner].bond!=='married'||raw.home!==null&&!raw.partner||raw.children.length&&!raw.home)return null;
    if(s.version<5&&s.calendar){
      for(const child of raw.children)child.bornMinute=480+child.since*3;
      for(const p of Object.values(raw.people))for(const m of p.memories)m.day=Math.floor(m.at/480);
    }
    return raw;
  }
  function memory(p,kind,s){
    p.memories.push({kind,at:s.time,day:day(s)});
    if(p.memories.length>16){
      const repeat=p.memories.findIndex((m,i,arr)=>arr.findLastIndex(x=>x.kind===m.kind)>i);
      p.memories.splice(Math.max(0,repeat),1);
    }
  }
  function recent(p,kind,s){return p.memories.some(m=>m.kind===kind&&day(s)===(m.day??Math.floor(m.at/480)));}
  function pointFor(s,a,p){
    const house=s.society.partner===a.id?Build.home(s,s.society.home):null;
    if(house&&s.society.home&&(s.calendar?Calendar.view(s.calendar,s.time,p.region).phase==='night':(Math.floor(s.time/50)%6)===4))return {region:house.region,x:house.x,y:house.y+10};
    const t=World.regions[p.region]?.settlement;
    if(!t)return null;
    const base=t.npcSpots[a.index];
    const phase=(s.time%150)/150,dx=Math.round(Math.sin(phase*Math.PI*2)*9);
    const x=base.x+dx,y=base.y+(p.transfer?12:0);
    return {region:p.region,x:x,y,moving:Math.abs(Math.cos(phase*Math.PI*2))>.25,dir:dx<0?'left':'right'};
  }
  function familyChild(s,o){
    const steps=childDays(s,o),age=Math.min(18,15+steps);
    const h=Build.home(s,s.society.home);
    return {...o,age,adult:age>=18,race:['goblin','human','elf','dwarf'][mix(s.seed,o.id.length+(o.id==='ward-1'?2:7))%4],profession:steps<1?'Apprendista':
      {erbe:'Erborista',minerali:'Minatore',magia:'Studioso',vie:'Esploratore'}[o.path],
      skills:steps>=2?[{erbe:'Cura delle sementi',minerali:'Lettura della roccia',magia:'Pratica del mana',vie:'Cartografia'}[o.path]]:[],
      location:h?{...h,x:h.x+12,y:h.y+8}:null};
  }
  function entry(s,id){
    if(!s?.society)return null;
    if(!own(residents,id)){
      const o=s.society.children.find(c=>c.id===id);
      if(!o)return null;
      const child=familyChild(s,o);
      return {...child,enrolled:o.enrolled,bond:'Famiglia',trust:4,personality:'Cresce seguendo la propria predisposizione.'};
    }
    const a=residents[id],p=s.society.people[id],age=23+mix(s.seed,id.length+a.index)%22;
    const path=a.index===0?0:1,form=Game.races.find(r=>r.id===a.race)?.forms[path],
      evolution=!form||p.training<16?0:p.training<28?path+1:path+3;
    return {...a,age,adult:true,location:pointFor(s,a,p),profession:p.training>=5?(p.region!==a.region?'Maestro itinerante':'Maestro di bottega'):a.job,
      enrolled:p.enrolled,career:p.career,bond:label[p.bond],trust:new Set(p.memories.map(m=>m.kind)).size+(p.bond!=='unknown'?2:0),
      memories:p.memories.map(m=>({...m})),transfer:p.transfer,evolution,
      formName:evolution>2?form.next.name:evolution?form.name:null,skills:p.training>=5?['Maestria di mestiere']:[]};
  }
  function activeEntries(s){
    if(!s.society)return [];
    const away=s.guild?.team||[];
    return Object.values(residents).filter(a=>!away.includes(a.id)&&
      (s.society.people[a.id].region===s.region||s.society.partner===a.id)).map(a=>entry(s,a.id))
      .concat(s.society.children.filter(c=>!away.includes(c.id)).map(o=>entry(s,o.id)))
      .filter(o=>o.location?.region===s.region);
  }
  function siteEntry(a){return {id:a.id,kind:'society',point:a.location,range:29,text:'Parla con '+a.name};}
  function sites(s){return activeEntries(s).filter(a=>!window.Conflicts||Conflicts.canInteract(s,a.id)&&!Conflicts.takesOver(s,a.id)).map(siteEntry);}
  function use(s,id){
    if(!sites(s).some(o=>o.id===id&&distance(o.point,s.player)<=o.range))return fail('Avvicinati al personaggio.');
    return {ok:true,panel:{id:'society',detail:id}};
  }
  function price(s,a){const town=s.society.towns[s.society.people[a.id].region];return town.accord?3:4;}
  function actions(s,id){
    const a=entry(s,id),p=s.society.people[id];
    if(!a||!p)return [];
    if(!sites(s).some(o=>o.id===id&&distance(o.point,s.player)<=o.range))return [];
    const town=s.society.towns[p.region],kinds=new Set(p.memories.map(x=>x.kind)),age=Growth.biology(Game.view({detailed:false}).race).ageDays;
    const mature=s.player.evolutionStage>=2||age>=6570;
    const closed=s.calendar&&!Calendar.view(s.calendar,s.time,s.region).shopOpen?'Il mercato apre dalle 07:00 alle 20:00.':'';
    const choice=(op,label,reason='')=>({op,label,allowed:!reason,reason});
    const options=[
      choice('chat','Conversa',recent(p,'chat',s)?'Avete già avuto una conversazione oggi.':''),
      choice('gift','Offri un’erba',recent(p,'gift',s)?'Hai già offerto un dono oggi.':s.player.inventory.herb<1?'Serve 1 erba.':''),
      choice('buy','Compra 1 trave · '+price(s,a)+' Scintille',closed||(town.stock<1?'Scorte esaurite.':s.player.gold<price(s,a)?'Scintille insufficienti.':'')),
      choice('sell','Vendi 1 minerale · 5 Scintille',closed||(s.player.inventory.ore<1?'Serve 1 minerale.':''))
    ];
    if(p.bond==='unknown')options.push(choice('friend','Proponi amicizia',!kinds.has('chat')||kinds.size<2?'Conoscetevi e condividete un dono o uno scambio.':''));
    if(p.bond==='friend'&&mature&&!s.society.partner&&p.interest)options.push(choice('court','Proponi un corteggiamento',
      kinds.size<3||s.time-p.changedAt<60?'Condividete esperienze diverse e lasciate passare del tempo insieme.':''));
    if(p.bond==='partner'&&!s.society.partner)options.push(choice('marry','Proponi il matrimonio',
      !Build.home(s)?'Costruisci prima una casa.':s.time-p.changedAt<100?'Lasciate passare ancora del tempo.':''));
    if(p.bond==='married'){
      if(!s.society.home)options.push(choice('live','Andate a vivere insieme',!Build.home(s)?'Serve una casa di proprietà.':''));
      if(s.society.children.length<2)options.push(choice('adopt','Accogli un figlio',!s.society.home?'Condividete prima una casa.':
        s.time-p.changedAt<150?'Condividete più tempo come famiglia.':s.player.gold<15?'Servono 15 Scintille per preparare la casa.':''));
    }
    return options;
  }
  function command(s,d){
    if(!obj(d))return fail('Interazione non valida.');
    const a=residents[d.id],p=s.society.people[d.id],available=actions(s,d.id).find(x=>x.op===d.op);
    if(!a||!p||!available||!available.allowed)return fail(available?.reason||'Qui l’interazione non è disponibile.');
    const town=s.society.towns[p.region],panel={id:'society',detail:d.id};
    if(d.op==='chat'){memory(p,'chat',s);return done(a.personality,panel);}
    if(d.op==='gift'){s.player.inventory.herb--;memory(p,'gift',s);return done(a.name+' accetta il dono.',panel);}
    if(d.op==='buy'||d.op==='sell'){
      if(d.op==='buy'){s.player.gold-=price(s,a);town.stock--;s.life.supplies.work++;}
      else{s.player.inventory.ore--;s.player.gold+=5;town.stock=Math.min(28,town.stock+1);}
      town.trade++;memory(p,'trade',s);
      return done('Scambio registrato al mercato.',panel,{event:{id:'trade',amount:1},xp:6});
    }
    if(d.op==='friend'||d.op==='court'||d.op==='marry'){
      p.bond={friend:'friend',court:'partner',marry:'married'}[d.op];p.changedAt=s.time;
      if(d.op==='marry')s.society.partner=a.id;
      return done(a.name+' accetta · '+label[p.bond]+'.',panel);
    }
    if(d.op==='live'){s.society.home=Build.home(s).id;return done('La famiglia si trasferisce nella casa che hai costruito.',panel);}
    const i=s.society.children.length,n=mix(s.seed,i+521);
    s.player.gold-=15;
    s.society.children.push({id:'ward-'+(i+1),name:i?'Telia':'Rin',since:s.time,bornMinute:s.calendar?Calendar.timestamp(s.calendar,s.time):480+s.time*3,
      aptitude:40+n%56,path:['erbe','minerali','magia','vie'][n%4],enrolled:false,career:0});
    p.changedAt=s.time;
    return done('Un nuovo membro è entrato nella famiglia.',panel);
  }
  function tick(s){
    const now=Math.floor(s.time/65),soc=s.society;
    if(now<=soc.pulse)return;
    const steps=Math.min(12,now-soc.pulse);soc.pulse=now;
    for(const [i,id] of regions.entries()){
      const town=soc.towns[id];
      town.stock=Math.min(28,town.stock+steps);
      const growth=now+town.trade*2;
      town.level=growth>=17?3:growth>=6?2:1;
      town.accord=town.level>=2&&regions.some(other=>other!==id&&group(id)===group(other)&&soc.towns[other].level>=2);
      const migrant=soc.people[id+'-1'];
      if(window.Conflicts&&!Conflicts.canInteract(s,id+'-1'))continue;
      migrant.training=Math.min(1e8,migrant.training+steps);
      if(now>8+i&&migrant.bond==='unknown'&&!migrant.transfer){
        const target=regions.find(other=>other!==id&&group(id)===group(other));
        if(target){migrant.region=target;migrant.transfer=true;}
      }
    }
  }
  function actors(s,t){
    const items=activeEntries(s).filter(a=>!window.Conflicts?.takesOver(s,a.id)).map(a=>({x:a.location.x,y:a.location.y,draw:c=>{
      if(a.adult)ActorArt.draw(c,a.race,a.location.x,a.location.y,{t,dir:a.location.dir||'down',moving:a.location.moving,evolution:a.evolution});
      else{c.save();c.translate(a.location.x,a.location.y);c.scale(.78,.78);ActorArt.draw(c,a.race,0,0,{t,dir:'down'});c.restore();}
      c.fillStyle='#e0c789';c.fillRect(a.location.x-1,a.location.y-27,3,3);
    }}));
    const town=s.society.towns[s.region],site=World.regions[s.region]?.settlement;
    if(town?.level>=2){
      items.push({x:site.x+23,y:site.y-3,draw:c=>{
        const x=site.x+23,y=site.y-3;c.fillStyle='#344e49';c.fillRect(x,y-21,2,21);
        c.fillStyle=town.accord?'#76ac9a':'#b48b68';c.fillRect(x+2,y-21,12,8);
        c.fillStyle='#f0d198';c.fillRect(x+4,y-18,town.level===3?8:4,2);
      }});
    }
    return items;
  }
  function view(s,id){
    const a=id&&entry(s,id);
    return {selected:a,actions:a?actions(s,id):[],local:activeEntries(s),
      towns:regions.map(id=>({region:id,name:World.regions[id].settlement.name,...s.society.towns[id]})),
      family:{partner:s.society.partner&&entry(s,s.society.partner),home:s.society.home&&Build.home(s,s.society.home),
        children:s.society.children.map(c=>entry(s,c.id))}};
  }
  function register(s,id){
    const a=entry(s,id),r=s.society.people[id]||s.society.children.find(o=>o.id===id);
    if(!a?.adult||!r||r.enrolled||a.trust<2||a.location?.region!==s.region||window.Conflicts&&!Conflicts.canFight(s,id))return false;
    r.enrolled=true;return true;
  }
  function train(s,id){const r=s.society.people[id]||s.society.children.find(o=>o.id===id);if(r?.enrolled)r.career++;}
  window.Society={create,restore,sites,use,command,view,tick,actors,entry,register,train};
})();

