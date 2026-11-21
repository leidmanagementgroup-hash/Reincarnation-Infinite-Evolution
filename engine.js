(() => {
  'use strict';
  const Growth=window.Growth, Life=window.Life;
  const rules = {
    potionPrice:8, potionCost:8, charmPrice:22, charmCost:22, craftHerb:2, craftOre:1,
    evolutionLevel:2, evolutionEssence:3, assimilationEchoes:2, assimilationEssence:1, traitCap:2,
    ascensionLevel:5, ascensionEssence:6,
    sideHerb:3, sideGold:20, fuseLevel:2, fuseEssence:4,
    fusionText:'Porta Scintilla e Linfa viva alla maestria 2, poi spendi 4 essenze per apprendere Aurora intrecciata.',
    assimilationText:'Spendi 2 echi della stessa creatura e 1 essenza per ottenere un tratto permanente. Puoi assimilarne due.',
    evolutionText:'Al livello 2 la pratica e tre essenze innescano la metamorfosi.',
    craftText:'2 erbe di rugiada e 1 minerale lucente per distillare 2 pozioni di linfa.'
  };
  const skills = {};
  function skill(id,name,description,category,style,cost,cooldown,power,color,icon) {
    skills[id]={id,name,description,category,style,cost,cooldown,power,color,icon};
    return id;
  }
  skill('spark','Scintilla','Una scintilla cerca la creatura più vicina nel tuo campo visivo.','Magia elementale','bolt',5,1.7,1.45,'#9decff','skill');
  skill('mend','Linfa viva','La linfa ripristina la tua vitalità.','Rigenerazione','heal',8,5.5,1.7,'#8df3b7','heal');
  skill('aurora','Aurora intrecciata','Un anello ferisce i nemici vicini e ricuce le tue ferite.','Magia unica','bloom',12,6.5,2.6,'#a6ffc5','heal');
  skill('weave-storm','Spira di tempesta','Una corona di scintille ferisce e rallenta le creature.','Magia combinata','snare',13,6,2.05,'#a1ceff','skill');
  skill('weave-guard','Egida di linfa','La linfa ripara le ferite e forma uno scudo intorno a te.','Magia combinata','ward',12,7.5,1.95,'#b7e7a5','ward');
  skill('weave-fracture','Schegge del varco','Tre dardi divergenti raggiungono più bersagli.','Magia combinata','fan',10,4.3,1.55,'#deb9ff','skill');
  const weaves=[
    {id:'aurora',base:'spark',other:'mend',level:2,essence:4},
    {id:'weave-storm',base:'spark',other:'aurora',level:2,essence:5,
      evolved:{name:'Spira della folgore',cost:11,reach:85,power:2.35,slow:4.5,description:'L’anello amplia il proprio raggio e rallenta per 4,5 secondi.'}},
    {id:'weave-guard',base:'mend',style:'ward',level:2,essence:5,
      evolved:{name:'Egida del germoglio',cost:10,power:2.3,ward:9,description:'Scudo di nove secondi e cura più intensa.'}},
    {id:'weave-fracture',base:'spark',style:'fan',level:2,essence:5,
      evolved:{name:'Ventaglio astrale',cost:11,power:1.55,bolts:5,description:'Cinque dardi divergenti coprono un arco più ampio.'}}
  ];
  const weaveById=Object.fromEntries(weaves.map(outcome=>[outcome.id,outcome]));
  const rarityColors={Comune:'#b5d1c0',Rara:'#82cde9',Epica:'#c8a1ee',Leggendaria:'#eec477',Mitica:'#efa9ae'};
  const techniqueStyles={
    bolt:['Un dardo guidato colpisce una creatura da lontano.','skill',5,2,1.65],
    burst:['Un cerchio di energia investe tutte le creature vicine.','skill',7,3.4,1.75],
    ward:['Una barriera assorbe i prossimi danni per sette secondi.','ward',6,6,1.8],
    leech:['Colpisce una creatura a distanza e ne assorbe la vitalità.','heal',7,3.8,1.55],
    fan:['Lancia tre schegge su traiettorie divergenti.','skill',7,3.1,1.15],
    cleave:['Sferra una lunga spazzata davanti a te.','attack',5,2.4,2.15],
    snare:['Un sigillo ferisce e rallenta le creature circostanti.','ward',7,4,1.55],
    familiar:['Evoca un lume che bersaglia i nemici per dieci secondi.','skill',9,11,1.0],
    bloom:['Un alone ferisce i nemici vicini e ripristina vitalità.','heal',10,6,2.1]
  };
  const races=[];
  function lineage(id,name,rarity,weight,stats,trait,description,gift,branches,upgrades,passive) {
    const color=rarityColors[rarity];
    function technique(suffix,data,category,scale) {
      const [label,style]=data, [desc,icon,cost,cooldown,power]=techniqueStyles[style];
      return skill(id+suffix,label,desc,category,style,cost,cooldown,power*scale,color,icon);
    }
    const start=technique('_gift',gift,'Tecnica razziale',1);
    const forms=branches.map(([formName,label,style],i)=>{
      const bonus=i===0?{hp:8,mp:6,atk:5,def:1,speed:5}:{hp:20,mp:14,atk:2,def:3,speed:0};
      const ability=technique('_form'+i,[label,style],style==='familiar'?'Evocazione':i?'Arte difensiva':'Arte offensiva',1.22);
      const description=i===0?'Ramo d’assalto. +5 attacco, +1 difesa, +8 vitalità, +6 mana e +5 velocità.':'Ramo custode. +2 attacco, +3 difesa, +20 vitalità e +14 mana.';
      const [nextName,nextSkill,nextStyle]=(upgrades || window.EvolutionContent?.upgrades[id])?.[i]
        || ['Ascensione · '+formName,label+' suprema',style];
      const nextBonus=i===0?{hp:23,mp:17,atk:11,def:3,speed:10}:{hp:45,mp:32,atk:6,def:7,speed:3};
      const nextDesc=i===0?'Bonus totali di forma · +11 attacco, +3 difesa, +23 vitalità, +17 mana e +10 velocità.':'Bonus totali di forma · +6 attacco, +7 difesa, +45 vitalità, +32 mana e +3 velocità.';
      const next={name:nextName,skill:technique('_asc'+i,[nextSkill,nextStyle],'Arte suprema',1.46),bonus:nextBonus,description:nextDesc};
      return {name:formName,skill:ability,bonus,description,next};
    });
    races.push({id,name,rarity,color,weight,trait,description,forms,start,passive,secret:id==='secret',
      hp:stats[0],mp:stats[1],atk:stats[2],def:stats[3],speed:stats[4]});
  }
  lineage('slime','Slime di rugiada','Comune',30,[88,37,9,3,80],'Corpo poroso. La linfa delle pozioni ti cura più a fondo.','Custodisce un seme di luce dentro una goccia trasparente.',['Bolla di rugiada','bolt'],[['Slime delle maree','Cresta di marea','fan'],['Slime di quarzo','Pelle cristallina','ward']]);
  lineage('goblin','Goblin dei rovi','Comune',25,[82,32,11,3,86],'Mani svelte. Ogni creatura vinta lascia una Scintilla aggiuntivo.','Gli abitanti delle siepi intrecciano spine persino nei lacci degli stivali.',['Falcetto ricurvo','cleave'],[['Hobgoblin','Falce a mezzaluna','cleave'],['Goblin Sciamano','Nodo di spine','snare']]);
  lineage('wolf','Lupo runico','Rara',16,[84,33,12,2,95],'Passo di vento. La tua schivata si ricarica più in fretta.','Una runa appare sul suo manto ogni volta che riconosce una nuova stella.',['Artiglio di bora','cleave'],[['Lupo della tramontana','Zanne di tramontana','fan'],['Lupo polare','Luna del branco','familiar']]);
  lineage('elf','Elfo del salice','Rara',14,[76,47,10,3,88],'Radici interiori. Rigeneri più mana nel tempo.','Le sue foglie argentate vibrano quando una promessa viene mantenuta.',['Sigillo di salice','snare'],[['Arciere del plenilunio','Pioggia lunare','fan'],['Custode di linfa','Risveglio del salice','bloom']]);
  lineage('spirit','Spirito di lume','Epica',6,[68,58,11,2,93],'Velo incorporeo. Ogni schivata protegge più a lungo.','Una luce dispersa ritrova un corpo seguendo le campane del borgo.',['Lanterna errante','familiar'],[['Fuoco delle comete','Coda di cometa','burst'],['Lanterna ancestrale','Stella compagna','familiar']]);
  lineage('vampire','Vampiro del vespro','Epica',4.7,[84,42,12,3,87],'Linfa notturna. Recuperi vitalità a ogni creatura vinta.','Riconosce il sangue degli alberi dal suono che fa sotto la corteccia.',['Sorso del vespro','leech'],[['Ala di granato','Strali di rubino','fan'],['Principe del crepuscolo','Patto crepuscolare','leech']]);
  lineage('demon','Demone di brace','Leggendaria',2.5,[89,44,14,3,83],'Brace perenne. I tuoi colpi base infliggono più danni ai nemici feriti.','Ha una piccola fornace al posto del cuore e ne divide il calore con chi incontra.',['Cerchio di braci','burst'],[['Araldo di cenere','Marea di cenere','burst'],['Sentinella cremisi','Sigillo di cenere','ward']]);
  lineage('drake','Draconide d’ambra','Leggendaria',1.7,[99,37,13,5,77],'Scaglia antica. Riduce il danno delle magie nemiche.','Cresce una scaglia color miele per ogni viaggio portato a termine.',['Soffio d’ambra','fan'],[['Drago della fornace','Fauci solari','cleave'],['Drago di geode','Mantello di geode','ward']]);
  lineage('secret','Eclisse nascente','Mitica',0.1,[86,62,14,4,91],'Doppia orbita. Ogni creatura vinta risveglia una scintilla di mana.','Due ombre si incontrano nello stesso corpo soltanto quando tacciono le stelle.',['Orbita gemella','leech'],[['Astrale del vuoto','Lama di eclisse','fan'],['Seme dell’eternità','Orbita perpetua','bloom']]);
  const additional=window.EvolutionContent?.lineages || [];
  if(additional.length){
    const newWeight=additional.reduce((sum,line)=>sum+line[3],0);
    for(const r of races)if(!r.secret)r.weight*=48/99.9;
    for(const [id,name,rarity,weight,stats,trait,desc,gift,forms,upgrades,passive] of additional){
      lineage(id,name,rarity,weight*51.9/newWeight,stats,trait,desc,gift,forms,upgrades,passive);
    }
  }
  const raceBook=Object.fromEntries(races.map(r=>[r.id,r]));
  const equipment={
    charm:{name:'Talismano di Vela',atk:3,def:1,icon:'ward'},
    crown:{name:'Corona di Orveth',atk:5,def:3,icon:'core'},
    gauntlet:{name:'Guanto di Kharun',atk:8,def:4,icon:'ward'},
    prism:{name:'Prisma di Syrava',atk:10,def:5,icon:'shard'},
    heart:{name:'Cuore del Varco',atk:13,def:7,icon:'core'}
  };
  const talents={
    impact:{id:'impact',name:'Impatto',description:'+2 attacco per punto.'},
    sap:{id:'sap',name:'Linfa',description:'+8 vitalità massima per punto.'},
    flow:{id:'flow',name:'Flusso',description:'+5 mana massimo per punto.'}
  };
  const freshTalents=()=>({impact:0,sap:0,flow:0});
  const talentPoints=p=>Math.floor(p.level/2)-Object.values(p.talents).reduce((a,b)=>a+b,0);
  const traits={
    moth:{id:'moth',name:'Polvere di lume',description:'Le scaglie delle falene aumentano il tuo mana massimo di 12.'},
    thorn:{id:'thorn',name:'Corteccia viva',description:'Una fibra di rovo cresce sotto la pelle. +2 difesa.'},
    wolf:{id:'wolf',name:'Falcata ferina',description:'Le zampe del lupo ti prestano la loro cadenza. +9 velocità.'},
    boss:{id:'boss',name:'Midollo di Orveth',description:'Il cuore del Cervo Cavo rafforza la tua vitalità massima di 20.'},
    ember:{id:'ember',name:'Sangue di brace',description:'+8 mana massimo.'},
    sentinel:{id:'sentinel',name:'Guardia di basalto',description:'+3 difesa.'},
    scarab:{id:'scarab',name:'Mandibola di rame',description:'+3 attacco.'},
    shardling:{id:'shardling',name:'Marea cristallina',description:'+14 mana massimo.'},
    shade:{id:'shade',name:'Passo d’ombra',description:'+11 velocità.'},
    crystalguard:{id:'crystalguard',name:'Carapace di prisma',description:'+4 difesa.'},
    kharun:{id:'kharun',name:'Fuoco della forgia',description:'+5 attacco.'},
    syrava:{id:'syrava',name:'Luce delle spire',description:'+20 mana massimo.'},
    asterion:{id:'asterion',name:'Battito stellare',description:'+32 vitalità massima.'}
  };
  const codex={
    moth:{name:'Falena di lume',habitat:'Radura delle Lanterne',description:'Vola in cerchio e scaglia polvere di luce da lontano.',trait:'moth',hp:28,damage:8,speed:28,xp:18,gold:3,level:1},
    thorn:{name:'Germoglio spinoso',habitat:'Bosco di Vetro',description:'Si radica per un istante prima di percuotere il terreno.',trait:'thorn',hp:38,damage:10,speed:35,xp:24,gold:4,level:2},
    wolf:{name:'Lupo delle fronde',habitat:'Sentieri di Lùmora',description:'Avvisa con un ringhio, poi scatta lungo una linea retta.',trait:'wolf',hp:48,damage:12,speed:54,xp:32,gold:5,level:3},
    boss:{name:'Orveth, il Cervo Cavo',habitat:'Cerchio delle Radici',description:'Custode del seme antico. Le sue corna ramificano quando il cuore si apre.',trait:'boss',hp:228,damage:18,speed:40,xp:100,gold:30,level:4,boss:true,stage:0},
    ember:{name:'Lume di Scoria',habitat:'Cava delle Braci',description:'Scaglia una scia di brace e arretra quando ti avvicini.',trait:'ember',hp:56,damage:14,speed:35,xp:30,gold:6,level:4,behavior:'caster'},
    sentinel:{name:'Sentinella di Basalto',habitat:'Cava delle Braci',description:'La fenditura sul petto brilla prima di ogni onda d’urto.',trait:'sentinel',hp:78,damage:17,speed:31,xp:39,gold:8,level:5,behavior:'guard'},
    scarab:{name:'Scarabeo di Rame',habitat:'Cava delle Braci',description:'Si appiattisce e scatta lungo il suolo prima di voltarsi.',trait:'scarab',hp:68,damage:16,speed:56,xp:35,gold:7,level:5,behavior:'charger'},
    shardling:{name:'Scheggia Vivente',habitat:'Fenditura Astrale',description:'Scompone la luce del varco in una raffica di schegge.',trait:'shardling',hp:78,damage:20,speed:44,xp:45,gold:10,level:6,behavior:'caster'},
    shade:{name:'Ombra della Faglia',habitat:'Fenditura Astrale',description:'Aggira chi incontra, poi fende l’aria con una carica.',trait:'shade',hp:88,damage:23,speed:67,xp:52,gold:11,level:7,behavior:'charger'},
    crystalguard:{name:'Armigero di Cristallo',habitat:'Fenditura Astrale',description:'Un battito nel suo torace annuncia una percussione più ampia.',trait:'crystalguard',hp:108,damage:22,speed:43,xp:58,gold:12,level:7,behavior:'guard'},
    kharun:{name:'Kharun, Fabbro Sepolto',habitat:'Forgia Sepolta',description:'Fa tremare le pietre e marchia il terreno con la brace. In fase II incendia la forgia.',trait:'kharun',hp:610,damage:23,speed:34,xp:180,gold:55,level:6,boss:true,stage:1,item:'gauntlet',color:'#ffc27d'},
    syrava:{name:'Syrava, la Serpe di Vetro',habitat:'Conca di Vetro',description:'Carica lungo il tracciato, poi spezza le sue spire in schegge di cristallo.',trait:'syrava',hp:830,damage:27,speed:55,xp:235,gold:72,level:8,boss:true,stage:2,item:'prism',color:'#98f3ea'},
    asterion:{name:'Asterion, Cuore del Varco',habitat:'Cuore del Varco',description:'Il sigillo vivente alterna segni esplosivi, costellazioni e anelli con una zona sicura. Ha tre fasi.',trait:'asterion',hp:1240,damage:32,speed:42,xp:330,gold:100,level:10,boss:true,stage:3,item:'heart',color:'#ddbcff'},
    ...Legendary.monsters
  };
  const key='reincarnation.lumora.save.v7', version=7, saveMaxBytes=12000000;
  const saveKeys=[key,'reincarnation.lumora.save.v6','reincarnation.lumora.save.v5','reincarnation.lumora.save.v4','reincarnation.lumora.save.v3','reincarnation.lumora.save.v2','reincarnation.lumora.save.v1'];
  const dirVectors={down:[0,1],up:[0,-1],left:[-1,0],right:[1,0]};
  const chapterNames=['Le radici di Lùmora','La forgia sotto la cenere','La Serpe di Vetro','Il Cuore del Varco','La via di casa','La valle ritrovata'];
  const campaignSteps=[
    {title:'Le radici di Lùmora',region:'valley',boss:'boss',description:'Ascolta Nerea e affronta il Cervo Cavo.'},
    {title:'La forgia sotto la cenere',region:'quarry',boss:'kharun',description:'Raggiungi la Forgia Sepolta e affronta Kharun.'},
    {title:'La Serpe di Vetro',region:'rift',boss:'syrava',description:'Raggiungi la Conca di Vetro e sconfiggi Syrava.'},
    {title:'Il Cuore del Varco',region:'rift',boss:'asterion',description:'Attraversa la faglia e spezza il sigillo di Asterion.'},
    {title:'La via di casa',region:'valley',description:'Riporta a Nerea i tre frammenti del varco.'}
  ];
  const monsterBehavior={moth:'caster',thorn:'guard',wolf:'charger'};
  const traitStats={
    boss:{hp:20},moth:{mp:12},thorn:{def:2},wolf:{speed:9},
    ember:{mp:8},sentinel:{def:3},scarab:{atk:3},shardling:{mp:14},shade:{speed:11},crystalguard:{def:4},
    kharun:{atk:5},syrava:{mp:20},asterion:{hp:32}
  };
  let s=null, effects=[],shots=[],hazards=[],autosave=0,combat=0,ally=null;
  let practiceSession=null;
  let combo=0,comboUntil=0,tickGrowth=0,movingTime=0,worldEpoch=0,evadePending=false,wardPractice=null;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const heading=(dx,dy)=>Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
  const emit=(type,data)=>Game.onEvent?.(type,data);
  const refuse=message=>{emit('toast',message);return false;};
  const normalize=(x,y)=>{const n=Math.hypot(x,y)||1;return [x/n,y/n];};
  function announce(messages){if(messages?.length)emit('toast',messages.join(' · '));}
  function record(event,amount=1,info={},practice=amount){
    const context={region:s.region,...info};
    const growthEvent={fish:'harvest',forge:'craft',sow:'field',reap:'field',care:'livestock',ranch:'livestock',cook:'craft',sew:'craft'}[event]||event;
    announce([...Growth.record(s.player.growth,growthEvent,practice,context),...Life.record(s,event,amount,context),...Daily.log(s,event,amount,context)]);
    announce(Reputation.record(s,event,context));
    const notice=Guild.record(s,event,amount,context);
    if(notice)emit('toast',notice);
  }
  const learn=(p,id)=>{if(!p.skills[id])p.skills[id]={uses:0,level:1};};
  const emptyCampaign=()=>({stage:0,completed:false});
  function randomRace() {
    let n=Math.random()*100;
    for(const race of races){n-=race.weight;if(n<0)return race;}
    return races[races.length-1];
  }
  function monster(point,index){
    const type=point.type, def=codex[type];
    return {id:index,type,x:point.x,y:point.y,homeX:point.x,homeY:point.y,hp:def.hp,maxHp:def.hp,
      dir:'down',moving:false,cd:1,wind:0,pattern:'',phase:1,cycle:0,hit:0,slow:0,dead:0,
      aimX:0,aimY:1,targetX:point.x,targetY:point.y,dash:0,grace:0,engaged:false};
  }
  function spawns(points){
    const original=points.boss?[{...points.boss,type:'boss'}]:[];
    return [...points.mobs,...original,...(points.bosses||[])];
  }
  const freshRegion=points=>({monsters:spawns(points).map(monster),resourceTimes:points.resources.map(()=>0)});
  function regionInfo(id){
    if(World.regions)return Object.hasOwn(World.regions,id)?World.regions[id]:null;
    return id==='valley'?World:null;
  }
  function setWorld(id,seed){
    if(World.setRegion)return World.setRegion(id,seed);
    return id==='valley'&&World.init(seed);
  }
  function formFor(p){
    const form=raceBook[p.race].forms[p.form];
    return p.evolutionStage===2?form?.next:form;
  }
  function spriteForm(p){
    return p.form===null?0:(p.evolutionStage-1)*2+p.form+1;
  }
  function resetTransient(){
    effects=[];shots=[];hazards=[];ally=null;autosave=0;combat=0;practiceSession=null;
    combo=0;comboUntil=0;tickGrowth=0;movingTime=0;evadePending=false;wardPractice=null;worldEpoch++;
  }
  function newGame(){
    const seed=(Math.random()*4294967296)>>>0, r=randomRace();
    setWorld('valley',seed);
    const p={x:World.spawn.x,y:World.spawn.y,dir:'down',race:r.id,form:null,evolutionStage:0,level:1,xp:0,hp:r.hp,mp:r.mp,
      gold:12,kills:0,potions:3,rep:0,talents:freshTalents(),inventory:{herb:0,ore:0,essence:0,charm:0,crown:0},equipped:null,
      skills:{},slots:[r.start,'spark','mend'],traits:[],echoes:{},cooldowns:{},dash:0,dashX:0,dashY:1,
      invul:0,hit:0,swing:0,ward:0,wardTime:0,moving:false};
    for(const id of Object.keys(equipment))p.inventory[id]=0;
    p.slots.forEach(id=>learn(p,id));
    p.growth=Growth.create(r,seed);
    s={version,seed,time:0,player:p,quest:0,sideQuest:0,bossDefeated:false,lanternFound:false,
      region:'valley',regions:{},campaign:emptyCampaign(),...freshRegion(World.points),seen:{},defeated:{}};
    s.life=Life.create(seed);
    s.build=Build.create();
    s.society=Society.create(seed);
    s.guild=Guild.create();
    s.calendar=Calendar.create(seed);
    s.bag=Inventory.create();
    s.workshop=Tradecraft.create(s);
    s.daily=Daily.create(s);
    s.economy=Economy.create(seed);
    Tradecraft.install(s,true);
    s.legendary=Legendary.create(seed);
    s.gear=Gear.create(s);Gear.install(s,true);
    s.adaptive=Adaptive.create();
    s.conflicts=Conflicts.create(s);
    s.reputation=Reputation.restore(undefined,s);
    s.urban=UrbanLife.create(seed);
    s.cityWorks=UrbanServices.create();
    p.hp=stats().hpMax;p.mp=stats().mpMax;
    resetTransient();save();return true;
  }
  function stats(){
    const p=s.player,r=raceBook[p.race],form=formFor(p)?.bonus || {};
    const wear=Gear.bonus(s);
    const lv=p.level-1, equip=wear.legacyRelicActive!==false?equipment[p.equipped]:null,personal=Growth.bonuses(p.growth,p),needs=Daily.modifiers(s);
    const blade=wear.legacyWeaponActive!==false?Tradecraft.attack(s):0;
    function bonus(key){
      const racial=r.passive?.[0]===key?r.passive[1]:0;
      return (form[key] || 0)+racial+(personal[key]||0)+p.traits.reduce((sum,id)=>sum+(traitStats[id]?.[key] || 0),0);
    }
    return {
      hpMax:r.hp+lv*9+bonus('hp')+p.talents.sap*8,
      mpMax:r.mp+lv*5+bonus('mp')+p.talents.flow*5,
      attack:Math.max(1,r.atk+lv*2+bonus('atk')+(equip?.atk||0)+p.talents.impact*2+blade+needs.attack+wear.attack),
      defense:Math.max(0,r.def+lv+bonus('def')+(equip?.def||0)+needs.defense+wear.defense),
      speed:r.speed+bonus('speed')+needs.speed+wear.speed,
      xpNext:48+lv*25
    };
  }
  function evolution(){
    return Growth.evolution(s,raceBook[s.player.race],Life.progress(s));
  }
  function tryEvolution(){
    const p=s.player;
    if(p.evolutionStage>=2||s.monsters.some(m=>m.hp>0&&m.engaged&&codex[m.type].boss))return false;
    const plan=evolution();
    if(!plan.ready)return false;
    const previous=formFor(p)?.skill||raceBook[p.race].start;
    p.form=plan.branch;p.evolutionStage++;p.inventory.essence-=plan.essence;
    const form=formFor(p),notes=Growth.transform(p.growth,plan);
    learn(p,form.skill);
    const equippedSlot=p.slots.indexOf(previous);
    if(equippedSlot>=0&&!p.slots.includes(form.skill))p.slots[equippedSlot]=form.skill;
    p.hp=stats().hpMax;p.mp=stats().mpMax;
    ring(p.x,p.y,60,'#eec482');spark(p.x,p.y,'#ffd5e8',32);
    emit('sound','evolve');announce(['Evoluzione · '+form.name,...(notes||[])]);
    return true;
  }
  function npcPoint(id){
    const home=World.points[id];
    return home&&Conflicts.point(s,id,Life.npcPoint(s,id,home));
  }
  const fallen=id=>Conflicts.condition(s,id)?.status==='dead';
  const elderRecord=()=>fallen('elder')&&s.region==='valley';
  function nearNpc(id){const npc=npcPoint(id);return !!npc&&distance(s.player,npc)<=48;}
  function useGate(gate){
    if(s.campaign.stage<(gate.minStage||0))return refuse(gate.minStage===1?'Riporta a Nerea il seme di Orveth per aprire il passo.':'Sconfiggi Kharun per riattivare il montacarichi.');
    if(s.monsters.some(m=>m.hp>0&&m.engaged&&codex[m.type].boss))return refuse('Allontanati dall’arena prima di partire.');
    return arrive(gate.to,gate.arrival);
  }
  function arrive(to,pos){
    if(!changeRegion(to))return refuse('Questo passaggio non è ancora disponibile.');
    const p=s.player;
    Object.assign(p,pos&&World.canWalk(pos.x,pos.y,6)?pos:World.spawn);
    p.moving=false;p.dash=0;p.hit=0;p.invul=.8;
    resetTransient();record('visit',1);keep();emit('region',s.region);
    return true;
  }
  function changeRegion(id){
    if(id===s.region)return true;
    const previous=s.region,old={monsters:s.monsters,resourceTimes:s.resourceTimes};
    if(!setWorld(id,s.seed))return false;
    s.regions[previous]=old;
    const state=s.regions[id]||freshRegion(World.points);
    delete s.regions[id];
    Object.assign(s,{region:id,...state});
    return true;
  }
  function focus(){
    const p=s.player;
    const choices=[];
    for(const [id,name] of [['elder','Nerea'],['merchant','Tessa'],['smith','Ivo']]){
      const memorial=id==='elder'&&elderRecord();
      const point=memorial?World.points.elder:npcPoint(id);
      if(point&&(memorial||!Conflicts.takesOver(s,id)))choices.push({kind:memorial?'elder-record':id,point,range:40,text:memorial?'Consulta il registro di Nerea':'Parla con '+name});
    }
    World.points.resources.forEach((point,i)=>{
      if(s.resourceTimes[i]<=s.time)choices.push({kind:'resource',i,point,range:25,text:{herb:'Raccogli erba di rugiada',ore:'Estrai minerale lucente',wood:'Raccogli legname'}[point.type]});
    });
    for(const gate of World.points.gates||[]){
      choices.push({kind:'gate',point:gate,range:38,text:gate.label+(s.campaign.stage<(gate.minStage||0)?' · Sigillato':'')});
    }
    const lantern=s.region==='valley'?window.Lantern?.focus(s):null;
    if(lantern)choices.push(lantern);
    choices.push(...Life.sites(s));
    choices.push(...Society.sites(s));
    choices.push(...Guild.sites(s));
    choices.push(...Tradecraft.sites(s),...Daily.sites(s),...Economy.sites(s));
    choices.push(...Conflicts.sites(s),...Legendary.sites(s));
    choices.push(...UrbanWorld.sites(s),...UrbanLife.sites(s));
    let best=null,range=Infinity;
    for(const item of choices){
      const d=distance(p,item.point);
      if(d<range && d<=item.range){range=d;best=item;}
    }
    return best;
  }
  function valleyQuest(){
    const p=s.player,e=elderRecord()?World.points.elder:npcPoint('elder'),b=World.points.boss;
    const nearest=s.monsters.reduce((best,m)=>m.hp>0&&!codex[m.type].boss&&(!best||distance(p,m)<distance(p,best))?m:best,null);
    const steps=[
      ['Tre colpi di campana',elderRecord()?'Consulta il registro di Nerea al Borgo di Vela.':'Parla con Nerea al Borgo di Vela.',0,1,e],
      ['Gli echi del sentiero','Sconfiggi tre creature della valle ('+Math.min(3,p.kills)+'/3).',Math.min(3,p.kills),3,nearest||World.points.mobs[0]],
      ['Il Cervo Cavo','Raggiungi il Cerchio delle Radici e sconfiggi Orveth.',0,1,b],
      ['Il seme ritrovato',elderRecord()?'Porta il seme al registro di Vela.':'Riporta a Nerea la memoria del Cervo Cavo.',0,1,e],
      ['Le radici di Lùmora','Il seme è tornato al borgo.',1,1,null]];
    const [title,text,current,total,target]=steps[s.quest];return {title,text,current,total,target};
  }
  function objective(){
    const stage=s.campaign.stage;
    if(stage===0){
      if(s.region==='valley')return valleyQuest();
      const target=World.route(s.region,'valley',stage);
      return {title:'Le radici di Lùmora',text:'Per riprendere la campagna raggiungi '+(regionInfo(target?.to)?.name||'la Valle di Lùmora')+'. Premi E al passaggio.',current:0,total:4,target};
    }
    if(stage===5)return {title:'La valle ritrovata',text:'Hai chiuso il Varco e riportato la luce a Lùmora. Puoi continuare a esplorare.',current:4,total:4,target:null};
    const chapter=campaignSteps[stage], {title}=chapter;
    let text=chapter.description,target=null;
    if(s.region!==chapter.region){
      target=World.route(s.region,chapter.region,stage);
      if(target)text='Segui il segnale verso '+(regionInfo(target.to)?.name||target.to)+'. Premi E al passaggio.';
    }else if(chapter.boss){
      target=s.monsters.find(m=>m.type===chapter.boss&&m.hp>0)||null;
    }else{
      target=(elderRecord()?World.points.elder:npcPoint('elder'))||null;
      if(elderRecord())text='Porta i tre frammenti al registro di Vela.';
    }
    return {title,text,current:Math.min(4,stage),total:4,target};
  }
  function view({detailed=true}={}){
    if(!s)return null;
    const p=s.player,r=raceBook[p.race],m=s.monsters.find(m=>m.hp>0&&m.engaged&&codex[m.type].boss);
    const location=UrbanWorld.location(s)||(World.landmarks?.length?World.landmarks.reduce((a,b)=>distance(a,p)<distance(b,p)?a:b).name:'Borgo di Vela');
    const calendar=Calendar.view(s.calendar,s.time,s.region);
    const next=detailed?evolution():null, campaignStage=s.campaign.stage;
    return {...stats(),race:r,formName:formFor(p)?.name||r.name,objective:objective(),
      region:s.region,regionName:regionInfo(s.region)?.name||'Valle di Lùmora',campaignTitle:chapterNames[campaignStage],campaignStage,
      evolution:next, growth:detailed?Growth.view(p.growth,r,calendar.ageDays*480):{innate:Growth.innate(p.growth)},
      life:detailed?Life.view(s):undefined,build:detailed?Build.view(s):undefined,society:detailed?Society.view(s):undefined,
      guild:detailed?Guild.view(s):undefined,
      interact:focus()?.text||null,location,calendar,weather:calendar.weather,clock:calendar.clock,
      boss:m?{id:m.type,name:codex[m.type].name,hp:m.hp,maxHp:m.maxHp,phase:m.phase,pattern:m.pattern,maxPhase:phaseCount(m.type)}:null,
      evolveReady:next?.ready||false,sideQuest:s.sideQuest<2&&fallen('smith')?'Ivo è morto. La commissione della forgia resterà incompiuta.':['Ivo cerca erbe di rugiada per la forgia. Trovalo al borgo.',
        'Porta tre erbe di rugiada a Ivo ('+Math.min(3,p.inventory.herb)+'/3).','Ivo ha riacceso la forgia con le tue erbe.'][s.sideQuest],
      elderLost:fallen('elder')};
  }
  function spark(x,y,color,n=10){
    for(let i=0;i<n;i++){
      const a=Math.random()*Math.PI*2,v=12+Math.random()*47;
      effects.push({kind:'dust',x,y:y-7,vx:Math.cos(a)*v,vy:Math.sin(a)*v-12,ttl:.25+Math.random()*.25,color});
    }
  }
  function label(x,y,text,color){effects.push({kind:'label',x,y:y-13,text,color,ttl:.85,vy:-17,vx:0});}
  function ring(x,y,r,color){effects.push({kind:'ring',x,y,r,color,ttl:.45,duration:.45});}
  function gainXp(amount){
    const p=s.player;p.xp+=amount;
    while(p.xp>=stats().xpNext){
      p.xp-=stats().xpNext;p.level++;p.hp=stats().hpMax;p.mp=stats().mpMax;
      emit('sound','level');emit('toast','Livello '+p.level+' · Vitalità e mana ripristinati.');
      ring(p.x,p.y,32,'#ffdf82');
    }
  }
  function keep(){save();emit('change');}
  function advance(){
    if(s.quest===1 && s.player.kills>=3)s.quest=s.bossDefeated?3:2;
    if(s.quest===2 && s.bossDefeated)s.quest=3;
  }
  function kill(m){
    const p=s.player,def=codex[m.type];m.hp=0;m.engaged=false;m.wind=0;m.dash=0;m.dead=s.time+35;
    Adaptive.clearGuard(s,m);
    s.defeated[m.type]=(s.defeated[m.type]||0)+1;s.seen[m.type]=true;
    p.kills++;p.gold+=def.gold+(p.race==='goblin'?1:0);
    p.inventory.essence+=def.boss?(m.type==='boss'?4:6):1;
    if(Object.hasOwn(traits,m.type))p.echoes[m.type]=(p.echoes[m.type]||0)+(def.boss?2:1);
    if(p.race==='vampire')p.hp=Math.min(stats().hpMax,p.hp+5);
    if(p.race==='secret')p.mp=Math.min(stats().mpMax,p.mp+4);
    if(m.type==='boss'){s.bossDefeated=true;p.inventory.crown=1;shots=shots.filter(b=>!b.hostile);}
    if(def.item){
      p.inventory[def.item]=1;
      if(s.campaign.stage===def.stage)s.campaign.stage++;
      p.potions+=2;shots=shots.filter(b=>!b.hostile);hazards=[];
      p.hp=stats().hpMax;p.mp=stats().mpMax;p.invul=2;
    }
    record('kill',1,{species:m.type,enemyLevel:def.level});
    if(def.boss)record('boss',1,{species:m.type,enemyLevel:def.level});
    announce(Legendary.recordKill(s,m.type));
    if(m.type==='nadir')announce(Reputation.record(s,'legendary-kill'));
    gainXp(def.xp);advance();
    label(m.x,m.y-6,'+'+def.xp+' PE','#f8dd90');spark(m.x,m.y,'#e7bc6b',16);
    emit('sound',def.boss?'victory':'loot');
    if(s.quest===2 && p.kills===3)emit('toast','Il Cerchio delle Radici è aperto.');
    if(m.type==='boss')emit('toast','Corona di Orveth ottenuta. '+(elderRecord()?'Torna al registro di Vela.':'Nerea ti aspetta al borgo.'));
    if(def.item){
      const end=fallen('elder')?'Torna al registro di Vela.':'Torna da Nerea.';
      emit('toast',equipment[def.item].name+' ottenuto · '+(m.type==='asterion'?end:m.type==='kharun'?'Raggiungi il montacarichi.':'Raggiungi il Cuore del Varco.'));
    }
    keep();
  }
  const phaseCount=type=>codex[type].phases||(type==='asterion'||type==='nadir'?3:2);
  function hurtMonster(m,damage,color,channel='companion'){
    if(!m||m.hp<=0||m.grace>0)return 0;
    const def=codex[m.type];
    const phases=phaseCount(m.type);
    const floor=def.boss?(m.phase===1?Math.round(m.maxHp*(phases===3?.64:.5)):m.phase===2&&phases===3?Math.round(m.maxHp*.28):0):0;
    if(!m.engaged)Adaptive.encounter(s,m);
    const hp=Math.max(floor,m.hp-Math.max(1,Math.round(damage*Adaptive.damageFactor(s,m,channel)))),dealt=m.hp-hp;
    Adaptive.seeHit(s,m,channel);
    m.hp=hp;m.hit=.15;m.engaged=true;s.seen[m.type]=true;combat=5;
    label(m.x,m.y,dealt,color||'#fff0c4');spark(m.x,m.y,color||'#fada8a',5);
    if(m.hp<=0){kill(m);return dealt;}
    if(floor&&m.hp===floor){
      Adaptive.clearGuard(s,m);
      m.phase++;m.wind=0;m.pattern='';m.cd=.6;m.grace=.55;m.dash=0;m.cycle=0;
      ring(m.x,m.y,54,def.color||'#e792be');emit('toast',(m.type==='boss'?'Orveth apre il cuore':def.name)+' · '+(m.phase===3?'Fase III':'Fase II'));emit('sound','boss');
    }
    return dealt;
  }
  function npcImpact(m,damage,color){
    if(!targetable(m)||codex[m.type].boss||m.grace>0)return 0;
    const hit=Math.min(m.hp,Math.max(1,Math.round(damage)));
    m.hp-=hit;m.hit=.16;
    spark(m.x,m.y,color||'#ddba8e',4);
    if(m.hp<=0){m.engaged=false;m.wind=0;m.dash=0;m.dead=s.time+55;}
    return hit;
  }
  function recover(){
    const p=s.player,previous=s.region,anchor=Life.respawn(s),lost=Math.min(p.gold,3);
    record('death');Life.drop(s,lost);
    for(const m of s.monsters){if(m.hp<=0)continue;Object.assign(m,monster({x:m.homeX,y:m.homeY,type:m.type},m.id));}
    const atStatue=anchor&&changeRegion(anchor.region);
    if(!atStatue)changeRegion('valley');
    const pos=atStatue&&World.canWalk(anchor.x,anchor.y,6)?anchor:World.spawn;
    for(const m of s.monsters){
      if(m.hp>0&&distance(pos,m)<105)Object.assign(m,monster({x:m.homeX,y:m.homeY,type:m.type},m.id));
    }
    Object.assign(p,{x:pos.x,y:pos.y,hp:stats().hpMax,mp:stats().mpMax,invul:atStatue?4:2,hit:0,dash:0,ward:0,wardTime:0,moving:false});
    p.gold-=lost;Daily.recover(s);resetTransient();
    emit('toast',(atStatue?'Rinasci presso l’ultima statua attivata.':Conflicts.canInteract(s,'elder')?'Nerea ti risveglia al borgo.':'Riapri gli occhi al Borgo di Vela.')+(lost?' Puoi recuperare '+lost+' Scintille dal borsello.':''));
    if(previous!==s.region)emit('region',s.region);
    emit('sound','heal');keep();
  }
  function hurtPlayer(amount,magical=false){
    const p=s.player;
    if(p.invul>0){
      if(evadePending){evadePending=false;record('dodge',1,{magical});label(p.x,p.y,'Schivata','#a6eced');}
      return;
    }
    const d=Math.max(2,Math.round(amount-stats().defense*.62-(magical&&p.race==='drake'?3:0)));
    const absorbed=Math.min(p.ward,d);p.ward-=absorbed;p.hp-=d-absorbed;p.hit=.22;p.invul=.55;combat=5;
    if(d>absorbed)announce(Gear.defend(s,{hit:true,damage:d-absorbed,magical})?.notices);
    if(absorbed&&wardPractice){recordImpact(wardPractice);wardPractice=null;}
    if(d>absorbed&&p.hp>0)record('damage',1,{magical,damage:d-absorbed});
    label(p.x,p.y,d===absorbed?'Scudo':'−'+(d-absorbed),d===absorbed?'#91dbff':'#ffaaa4');
    emit('sound','hit');if(p.hp<=0)recover();
  }
  function move(a,dx,dy,r=5){
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/3));let moved=false;
    for(let i=0;i<steps;i++){
      const xx=a.x+dx/steps,yy=a.y+dy/steps;
      if(dx && canWalk(xx,a.y,r)){a.x=xx;moved=true;}
      if(dy && canWalk(a.x,yy,r)){a.y=yy;moved=true;}
    }
    return moved;
  }
  function canWalk(x,y,r){
    return !Build.blocked(s,x,y,r)&&(World.canWalk(x,y,r)||Build.bridgeAt(s,x,y,r));
  }
  function unlocked(m){
    if(!Legendary.allows(s,m.type))return false;
    const def=codex[m.type];
    return !def.boss||def.stage===undefined||(m.type==='boss'?s.quest>=2:s.campaign.stage>=def.stage);
  }
  function targetable(m){return m.hp>0 && unlocked(m);}
  function nearest(from,range){
    let best=null,min=range;
    for(const m of s.monsters){if(!targetable(m))continue;const d=distance(from,m);if(d<min){min=d;best=m;}}
    return best;
  }
  function arc(damage,reach,color,width=-.20,stage){
    const p=s.player, near=nearest(p,reach),current=dirVectors[p.dir];
    if(near && (distance(p,near)<21 || (near.x-p.x)*current[0]+(near.y-p.y)*current[1]>-4))p.dir=heading(near.x-p.x,near.y-p.y);
    const [vx,vy]=dirVectors[p.dir],angle=Math.atan2(vy,vx);
    effects.push({kind:'arc',x:p.x,y:p.y-7,angle,r:reach*.86,ttl:.21,duration:.21,color});
    let hits=0,boss=false;
    for(const m of s.monsters){
      if(!targetable(m)||distance(p,m)>reach+(codex[m.type].boss?9:0))continue;
      const [dx,dy]=normalize(m.x-p.x,m.y-p.y);
      if((distance(p,m)<15||dx*vx+dy*vy>width)&&hurtMonster(m,damage*(p.race==='demon'&&m.hp<m.maxHp/2?1.2:1),color,'melee')){
        hits++;
        boss=boss||!!codex[m.type].boss;
      }
    }
    if(hits)announce(Gear.strike(s,{hit:true,boss,combo:stage}).notices);
    return hits;
  }
  function launch(x,y,dir,style,damage,color,hostile=false,speed=hostile?88:190){
    shots.push({x,y,vx:dir[0]*speed,vy:dir[1]*speed,style,damage,color,hostile,ttl:hostile?2.1:1.05});
  }
  function heal(amount){
    const p=s.player,max=stats().hpMax,delta=Math.min(max-p.hp,Math.round(amount));
    p.hp+=delta;if(delta>0)label(p.x,p.y,'+'+Math.ceil(delta),'#9bf7ba');ring(p.x,p.y,23,'#97eab6');
  }
  function recordImpact(practice){
    if(!practice||practice.used)return;
    practice.used=true;
    if(practice.stage)registerStrike(practice.style,practice.stage);
    else record(practice.event,1,{style:practice.style});
    if(practice.innate)record('innate',1,{style:practice.style,context:'combat'});
  }
  function cast(id){
    const p=s.player,innate=id==='innate',def=innate?Growth.innate(p.growth):activeSkill(p,id),entry=innate?def:p.skills[id];
    if(!def||!entry||p.cooldowns[id]>0)return false;
    if(p.mp<def.cost)return refuse('Mana insufficiente.');
    const patients=def.style==='heal'||def.style==='bloom'?Conflicts.wounded(s):[];
    if(def.style==='heal'&&p.hp>=stats().hpMax&&!patients.length)return refuse('La vitalità è già al massimo.');
    const target=nearest(p,174);
    if(['leech','bolt','fan'].includes(def.style)&&target)p.dir=heading(target.x-p.x,target.y-p.y);
    const dir=target?normalize(target.x-p.x,target.y-p.y):dirVectors[p.dir];
    const power=stats().attack*def.power*(innate?1:1+.16*(entry.level-1)),color=def.color;
    p.mp-=def.cost;p.cooldowns[id]=def.cooldown;p.swing=.2;
    if(!innate){
      entry.uses++;
      const next=Math.min(5,1+Math.floor(entry.uses/5));
      if(next>entry.level){
        entry.level=next;
        emit('toast',next===4&&weaveById[id]?.evolved?'Tecnica evoluta · '+weaveById[id].evolved.name:def.name+' · Maestria '+next);
      }
    }
    const spellPractice={event:def.style==='cleave'?'physical':'magic',style:def.style,innate,used:false};
    switch(def.style){
      case 'bolt':case 'leech':
        launch(p.x,p.y,dir,def.style,power,color);
        shots.at(-1).practice=spellPractice;
        break;
      case 'fan':{
        const angle=Math.atan2(dir[1],dir[0]);
        for(const offset of def.bolts===5?[-.50,-.25,0,.25,.50]:[-.27,0,.27]){
          launch(p.x,p.y,[Math.cos(angle+offset),Math.sin(angle+offset)],'fan',power,color);
          shots.at(-1).practice=spellPractice;
        }
        break;}
      case 'burst':case 'snare':case 'bloom':{
        ring(p.x,p.y,def.reach||60,color);spark(p.x,p.y,color,16);
        let touched=def.style==='bloom'&&p.hp<stats().hpMax;
        for(const m of s.monsters)if(targetable(m)&&distance(p,m)<=(def.reach||64)){if(def.style==='snare')m.slow=def.slow||3;touched=!!hurtMonster(m,power,color,'field')||touched;}
        if(def.style==='bloom')heal(power*.53);
        if(touched){
          recordImpact(spellPractice);
          announce(Gear.strike(s,{hit:true,magical:true}).notices);
        }
        break;}
      case 'heal':heal(power);recordImpact(spellPractice);break;
      case 'ward':
        p.ward=Math.round(power);p.wardTime=def.ward||7;wardPractice=spellPractice;ring(p.x,p.y,23,color);
        if(id==='weave-guard'&&p.hp<stats().hpMax){heal(power*.32);recordImpact(spellPractice);}
        break;
      case 'cleave':if(arc(power,46,color))recordImpact(spellPractice);break;
      case 'familiar':
        ally={x:p.x,y:p.y,life:10,cd:.2,power,color,practice:spellPractice};spark(p.x,p.y,color);
        break;
    }
    let rescued=false;
    for(const npc of patients){
      const saved=Conflicts.mend(s,npc);
      if(!saved)continue;
      rescued=true;
      announce([...saved.notices,saved.name+' è salvo grazie a '+def.name+'.']);
      record('npcRescue',1,{npc,critical:saved.critical,region:saved.region});
    }
    if(rescued)keep();
    emit('sound',def.style==='heal'?'heal':'skill');return true;
  }
  function activeSkill(p,id){
    const def=skills[id],evolved=weaveById[id]?.evolved;
    return p.skills[id]?.level>=4&&evolved?{...def,...evolved}:def;
  }
  function weave(p,value){
    if(!value||!Object.hasOwn(p.skills,value.a)||!Object.hasOwn(p.skills,value.b)||value.a===value.b)
      return refuse('Scegli due tecniche apprese e diverse.');
    const choices=[value.a,value.b];
    const result=weaves.find(w=>{
      const other=choices.find(id=>id!==w.base);
      return choices.includes(w.base)&&(w.other?other===w.other:!Object.hasOwn(weaveById,other)&&skills[other].style===w.style);
    });
    if(!result)return refuse('Le due tecniche non risuonano insieme.');
    if(p.skills[result.id])return refuse('Conosci già '+skills[result.id].name+'.');
    if(!choices.every(id=>p.skills[id].level>=result.level)||!Inventory.take(s,'essence',result.essence))
      return refuse('Servono maestria '+result.level+' su entrambe le tecniche e '+result.essence+' essenze.');
    learn(p,result.id);
    return applyLife({ok:true,text:'Nuova tecnica · '+skills[result.id].name,changed:true});
  }
  function registerStrike(style,stage){
    combo=stage===3?0:stage;comboUntil=s.time+1.25;
    record('physical',1,{style,combo:stage});
    if(stage===3){
      label(s.player.x,s.player.y,'Combo ×3','#ffd88d');
      spark(s.player.x,s.player.y,'#ffe9b1',8);
    }
  }
  function basicAttack(){
    const p=s.player;
    if(p.cooldowns.attack>0)return false;
    const {style,reach,damage,color}=Growth.strike(p.growth,raceBook[p.race],p);
    const stage=s.time<=comboUntil?combo+1:1;
    const finisher=stage===3,impact=stats().attack*damage*(finisher?1.25:1);
    p.cooldowns.attack=style==='claw'?.34:style==='slam'?.47:.4;
    p.swing=.2;
    if(style==='spit'){
      const target=nearest(p,reach),facing=dirVectors[p.dir];
      const inFront=target&&(target.x-p.x)*facing[0]+(target.y-p.y)*facing[1]>-4;
      const dir=inFront?normalize(target.x-p.x,target.y-p.y):facing;
      const breath=p.race==='drake'&&p.evolutionStage>0,angle=Math.atan2(dir[1],dir[0]);
      const practice={event:'physical',style,stage,used:false};
      for(const spread of breath?[-.28,0,.28]:[0]){
        launch(p.x,p.y,[Math.cos(angle+spread),Math.sin(angle+spread)],'spit',impact*(breath?.58:1),color,false,150);
        Object.assign(shots.at(-1),{ttl:reach/150,practice});
      }
    }else{
      if(style==='slam'&&finisher)ring(p.x,p.y,reach,color);
      const width=style==='claw'||style==='lunge'?.1:style==='slam'&&finisher?-1.01:style==='sweep'?-.34:-.20;
      if(arc(impact,reach+(finisher?5:0),color,width,stage))registerStrike(style,stage);
      else combo=0;
    }
    emit('sound','attack');return true;
  }
  function action(name){
    if(!s)return false;const p=s.player;
    if(/^skill[1-3]$/.test(name))return cast(p.slots[Number(name.slice(-1))-1]);
    switch(name){
      case 'attack':return basicAttack();
      case 'innate':return cast('innate');
      case 'dash':{
        if(p.cooldowns.dash>0)return false;const [x,y]=dirVectors[p.dir];p.dashX=x;p.dashY=y;
        p.dash=.18;p.invul=p.race==='spirit'?.55:.34;p.cooldowns.dash=p.race==='wolf'?.95:1.5;evadePending=true;
        spark(p.x,p.y,'#a6eced',6);emit('sound','dash');return true;}
      case 'potion':
        Inventory.sync(s);
        if(p.cooldowns.potion>0)return false;
        if(!p.potions)return refuse('Hai esaurito le pozioni.');
        if(p.hp>=stats().hpMax)return refuse('La vitalità è già al massimo.');
        p.potions--;p.cooldowns.potion=1;heal(stats().hpMax*(p.race==='slime'?.67:.48));
        emit('sound','heal');keep();return true;
      case 'interact':{
        const active=focus();if(!active)return false;
        if(active.kind==='gate')return useGate(active.point);
        if(active.kind==='life')return applyLife(Life.use(s,active.id));
        if(active.kind==='society')return applyLife(Society.use(s,active.id));
        if(active.kind==='guild')return applyLife(Guild.use(s,active.id));
        if(active.kind==='economy')return applyLife(Economy.use(s,active.id));
        if(active.kind==='conflict')return applyLife(Conflicts.use(s,active.id));
        if(active.kind==='urban-resident')return applyLife(UrbanLife.use(s,active.id));
        if(active.kind==='urban-site'){
          const result=UrbanWorld.use(s,active.id);
          return result.transition?arrive(result.transition.region,result.transition):applyLife(result);
        }
        if(active.kind==='legendary'){
          const result=Legendary.use(s,active.id);
          if(!result.transition)return applyLife(result);
          if(!arrive(result.transition.region,result.transition))return false;
          emit('sound','interact');
          emit('toast',s.region===LegendaryLand.id?'Entri nel '+LegendaryLand.region.name+'.':'Ritorni in superficie.');
          return true;
        }
        if(active.kind==='workshop')return applyLife({ok:true,panel:{id:'workshop',detail:active.id}});
        if(active.kind==='daily')return applyLife({ok:true,panel:'living'});
        if(active.kind==='lantern'){
          const text=window.Lantern.collect(s);
          record('event',1,{kind:'lantern'});emit('toast',text);emit('sound','loot');keep();
        }else if(active.kind==='resource'){
          const kind=active.point.type;
          if(kind==='wood')s.life.supplies.work++;else p.inventory[kind]++;
          s.resourceTimes[active.i]=s.time+65;
          record(kind==='ore'?'mine':'harvest',1,{kind});
          emit('toast',{herb:'Erba di rugiada raccolta.',ore:'Minerale lucente estratto.',wood:'Trave di legno raccolta.'}[kind]);emit('sound','loot');spark(active.point.x,active.point.y,'#c8dda8',6);keep();
        }else{emit('sound','interact');emit('panel',active.kind);}
        return true;}
      default:return false;
    }
  }
  function applyLife(result){
    if(!result?.ok)return result?.text?refuse(result.text):false;
    if(result.text)emit('toast',result.text);
    if(result.event)record(result.event.id,result.event.amount,result.event.meta,1);
    const inscription=result.inscription&&Guild.record(s,'inscription',1,{statue:result.inscription});
    if(inscription)emit('toast',inscription);
    if(result.essence)s.player.inventory.essence+=result.essence;
    if(result.xp)gainXp(result.xp);
    if(result.changed||result.event||result.xp||result.essence||inscription){tryEvolution();keep();}
    emit('sound',result.changed?'loot':'interact');
    if(result.panel)emit('panel',result.panel);
    return true;
  }
  function safeRest(){
    return combat<=0&&!hazards.some(h=>distance(s.player,h)<105)&&
      !s.monsters.some(m=>m.hp>0&&unlocked(m)&&distance(s.player,m)<(m.engaged?158:88));
  }
  function sleep(){
    if(!Daily.restPlace(s))return refuse('Raggiungi un letto o un luogo adatto all’accampamento.');
    if(!safeRest())return refuse('Riposa lontano dal combattimento e dalle creature ostili.');
    const rest=Calendar.sleep(s.calendar,s.time);
    if(!rest.ok)return refuse(rest.message);
    const p=s.player;
    s.time+=rest.seconds;
    Daily.tick(s,{sleep:true});Life.tick(s);Society.tick(s);Build.tick(s);Economy.tick(s);
    announce(Conflicts.tick(s,0,{walk:canWalk})||[]);
    announce(Legendary.tick(s));
    announce(UrbanLife.tick(s,0,{walk:canWalk}));
    for(const id of Object.keys(p.cooldowns))p.cooldowns[id]=Math.max(0,p.cooldowns[id]-rest.seconds);
    resetTransient();
    const st=stats();
    p.hp=Math.min(st.hpMax,p.hp+st.hpMax*.55);p.mp=st.mpMax;p.invul=1;p.moving=false;p.dash=0;p.wardTime=0;p.ward=0;
    keep();
    return applyLife({ok:true,text:'Ti risvegli alle 06:00. Energia ripristinata.',panel:'living'});
  }
  function practice(delta,input){
    if(!practiceSession)return null;
    const {session,context}=practiceSession;
    const outcome=GamePractice.step(session,delta,input);
    if(outcome)applyLife(Tradecraft.finish(s,context,outcome));
    return GamePractice.view(session);
  }
  function command(name,value){
    if(!s)return false;
    Inventory.sync(s);
    const p=s.player,inv=p.inventory;
    const location={accept:'elder',reward:'elder',finish:'elder',buyPotion:'merchant',buyCharm:'merchant',craft:'smith',sideAccept:'smith',sideReward:'smith'}[name];
    const archive=location==='elder'&&elderRecord();
    if(location){
      const nearby=nearNpc(location)||archive&&distance(p,World.points.elder)<=48;
      if(!nearby)return refuse('Avvicinati al personaggio o al luogo indicato.');
      if(!archive&&Conflicts.takesOver(s,location))
        return refuse(fallen(location)?'Non c’è più nessuno a cui rivolgersi qui.':'Il personaggio non può parlarti in questo momento.');
    }
    let text, sound='ui', panel;
    switch(name){
      case 'accept':
        if(s.quest!==0)return false;
        s.quest=1;advance();text='Missione ricevuta · Gli echi del sentiero';break;
      case 'reward':
        if(s.quest!==3)return refuse(objective().text);
        s.quest=4;s.campaign.stage=1;p.gold+=archive?10:25;p.rep+=3;gainXp(45);
        announce(Reputation.record(s,'campaign-vela'));
        text=archive?'Deponi il seme nel luogo della memoria di Nerea. Il borgo ti affida la sua eredità. Il passo a est è aperto.':'Vela ti riconosce come alleato. Il passo a est è aperto.';sound='victory';panel='victory';break;
      case 'finish':
        if(s.campaign.stage!==4)return refuse(objective().text);
        s.campaign.stage=5;s.campaign.completed=true;p.gold+=archive?50:80;p.rep+=5;gainXp(150);
        announce(Reputation.record(s,'campaign-rift'));
        text=archive?'Il Varco è chiuso. Lùmora ricorda il tuo nome, e quello di Nerea.':'Il Varco è chiuso. Lùmora ricorda il tuo nome.';sound='victory';panel='ending';break;
      case 'buyPotion':case 'buyCharm':{
        if(!Calendar.view(s.calendar,s.time,s.region).shopOpen)return refuse('L’emporio apre dalle 07:00 alle 20:00.');
        const potion=name==='buyPotion',cost=potion?rules.potionPrice:rules.charmPrice;
        if(!potion&&inv.charm)return refuse('Possiedi già il talismano.');
        if(p.gold<cost)return refuse('Scintille insufficienti.');
        p.gold-=cost;if(potion)p.potions++;else inv.charm=1;
        record('trade',1,{kind:name});
        text=potion?'Pozione acquistata.':'Talismano acquistato. Puoi equipaggiarlo dall’inventario.';sound='coin';break;}
      case 'craft':
        if(inv.herb<rules.craftHerb||inv.ore<rules.craftOre)return refuse(rules.craftText);
        inv.herb-=rules.craftHerb;inv.ore-=rules.craftOre;p.potions+=2;record('craft',1,{kind:'potion'});text='Ivo ti consegna due pozioni di linfa.';sound='loot';break;
      case 'equip':
        if(!Object.hasOwn(equipment,value)||!inv[value])return false;
        return applyLife(Gear.command(s,{op:'equip',id:value}));
      case 'life':return applyLife(Life.command(s,value));
      case 'build':return applyLife(Build.command(s,value));
      case 'society':return applyLife(Society.command(s,value));
      case 'guild':{
        const result=Guild.command(s,value);
        if(result?.ok&&['claim','found','branch'].includes(value?.op))announce(Reputation.record(s,'guild-'+value.op));
        return applyLife(result);
      }
      case 'workshop':{
        if(value?.op==='equip'&&Gear.isManaged(value.id)){
          const op=Gear.isEquipped(s,value.id)?'unequip':'equip';
          return applyLife(Gear.command(s,{op,id:value.id}));
        }
        const result=Tradecraft.command(s,value);
        return applyLife(result);
      }
      case 'daily':{
        const result=Daily.command(s,value);
        if(result?.ok&&value?.op==='claim')announce(Reputation.record(s,'quest-claim'));
        return applyLife(result);
      }
      case 'economy':return applyLife(Economy.command(s,value));
      case 'weave':return weave(p,value);
      case 'gear':return applyLife(Gear.command(s,value));
      case 'conflict':return applyLife(Conflicts.command(s,value));
      case 'urban':return applyLife(UrbanLife.command(s,value));
      case 'city-service':return applyLife(UrbanServices.command(s,value));
      case 'legendary':{
        const result=Legendary.command(s,value);
        if(result?.ok&&value?.op==='claim')announce(Reputation.record(s,'sovereign'));
        return applyLife(result);
      }
      case 'sleep':return sleep();
      case 'practice':{
        if(!safeRest())return refuse('Inizia l’attività lontano dalle creature ostili.');
        const started=Tradecraft.start(s,value);
        if(!started.ok)return refuse(started.text);
        practiceSession=started;
        emit('panel','practice');return true;
      }
      case 'assimilate':
        if(!Object.hasOwn(traits,value)||p.traits.includes(value))return false;
        if(p.traits.length>=rules.traitCap)return refuse('Hai già legato due tratti alla tua anima.');
        if((p.echoes[value]||0)<rules.assimilationEchoes||inv.essence<rules.assimilationEssence)return refuse(rules.assimilationText);
        p.echoes[value]-=rules.assimilationEchoes;inv.essence-=rules.assimilationEssence;p.traits.push(value);
        text='Tratto assimilato · '+traits[value].name;sound='evolve';break;
      case 'slot':{
        if(!value||!Number.isInteger(value.slot)||value.slot<0||value.slot>2||!Object.hasOwn(p.skills,value.id))return false;
        const prev=p.slots.indexOf(value.id);
        if(prev===value.slot)return true;
        if(prev>=0)p.slots[prev]=p.slots[value.slot];p.slots[value.slot]=value.id;
        text=skills[value.id].name+' assegnata al tasto '+(value.slot+1)+'.';break;}
      case 'sideAccept':
        if(s.sideQuest)return refuse(view().sideQuest);
        s.sideQuest=1;text='Commissione accettata · Tre erbe per la forgia.';break;
      case 'sideReward':
        if(s.sideQuest!==1)return refuse(view().sideQuest);
        if(inv.herb<rules.sideHerb)return refuse('Ivo attende tre erbe di rugiada.');
        inv.herb-=rules.sideHerb;s.sideQuest=2;p.gold+=rules.sideGold;p.rep+=1;record('craft',1,{kind:'commission'});gainXp(16);
        text='Commissione compiuta · +20 Scintille e +1 reputazione.';sound='loot';break;
      case 'fuse':
        if(p.skills.aurora)return refuse('Conosci già Aurora intrecciata.');
        if(p.skills.spark.level<rules.fuseLevel||p.skills.mend.level<rules.fuseLevel||inv.essence<rules.fuseEssence)return refuse(rules.fusionText);
        inv.essence-=rules.fuseEssence;learn(p,'aurora');text='Fusione riuscita · Aurora intrecciata';sound='evolve';break;
      case 'drink':return action('potion');
      default:return false;
    }
    keep();emit('sound',sound);if(text)emit('toast',text);if(panel)emit('panel',panel);return true;
  }
  function beginWind(m,pattern,duration,dx,dy){
    m.pattern=pattern;m.wind=duration;m.windDuration=duration;m.aimX=dx;m.aimY=dy;
    m.targetX=s.player.x;m.targetY=s.player.y;
    m.dir=heading(dx,dy);m.moving=false;
  }
  const bossPatterns={
    boss:[['stomp','dash','roots'],['dash','stomp','roots']],
    kharun:[['hammer','slag','hammer'],['forge','slag','hammer']],
    syrava:[['dash','shards','shatter'],['shatter','dash','shards']],
    asterion:[['nova','sigil','constellation'],['sigil','constellation','nova'],['constellation','nova','sigil','constellation']],
    nadir:[['nadir-prism','shards','dash'],['nadir-prism','sigil','shatter'],['nadir-prism','nova','constellation']],
    'dungeon-heir':[['heir-spore','dash','stomp'],['heir-spore','roots','dash']]
  };
  const patternDistance={stomp:45,hammer:53,nova:83,'nadir-prism':118,'heir-spore':104};
  const patternWind={dash:.65,hammer:.88,slag:.84,forge:.78,shards:.65,shatter:.79,nova:1.1,sigil:.91,constellation:.93,'nadir-prism':1.18,'heir-spore':.86};
  const reactionLines={counter:'Prepara un contrattacco',sidestep:'Cerca spazio per schivare','break-line':'Cambia posizione'};
  const phaseCooldown=(m,def)=>def.boss?(m.phase===3?.84:m.phase===2?.99:1.44):(def.behavior==='caster'||m.type==='moth'?2:1.25);
  function fanEnemy(m,count,spread,speed,color,damage,start=0){
    const angle=Math.atan2(m.aimY,m.aimX)+start;
    for(let i=0;i<count;i++){
      const a=angle+(i/(count-1)-.5)*spread;
      launch(m.x,m.y,[Math.cos(a),Math.sin(a)],'spark',damage,color,true,speed);
    }
  }
  function spreadEnemy(m,count,speed,color,damage,offset=0){
    for(let i=0;i<count;i++){
      const a=Math.PI*2*i/count+Math.atan2(m.aimY,m.aimX)+offset;
      launch(m.x,m.y,[Math.cos(a),Math.sin(a)],'root',damage,color,true,speed);
    }
  }
  function hazard(x,y,r,duration,damage,color){
    hazards.push({x,y,r,ttl:duration,damage,color});
  }
  function hasCover(from,to){
    const steps=Math.ceil(distance(from,to)/8);
    for(let i=1;i<steps;i++){
      const fraction=i/steps;
      if(!canWalk(from.x+(to.x-from.x)*fraction,from.y+(to.y-from.y)*fraction,2))return true;
    }
    return false;
  }
  function burstEnemy(m){
    const p=s.player,def=codex[m.type],color=def.color||(def.boss?'#f79faa':'#c6ef8c');
    const damage=def.damage;
    switch(m.pattern){
      case 'shot':
        if(m.type==='shardling')fanEnemy(m,3,.5,106,'#9cf3ff',damage);
        else launch(m.x,m.y,[m.aimX,m.aimY],'dust',damage,m.type==='ember'?'#ffbd7c':color,true);
        break;
      case 'dash':m.dash=def.boss?.42:.32;break;
      case 'roots':{
        spreadEnemy(m,m.phase===2?11:7,88,color,damage);
        ring(m.x,m.y,42,color);break;}
      case 'stomp':{
        const radius=def.boss?(m.phase===2?55:44):m.type==='crystalguard'?36:25;
        ring(m.x,m.y,radius,color);if(distance(m,p)<radius+5)hurtPlayer(damage);
        break;}
      case 'hammer':{
        const r=m.phase===2?63:51;
        ring(m.x,m.y,r,color);spark(m.x,m.y,color,21);
        if(distance(m,p)<r+4)hurtPlayer(damage+6);
        break;}
      case 'slag':{
        hazard(m.targetX,m.targetY,24,3.2,damage,color);
        if(m.phase===2){
          hazard(m.targetX+m.aimY*27,m.targetY-m.aimX*27,13,2.25,damage-3,color);
          hazard(m.targetX-m.aimY*27,m.targetY+m.aimX*27,13,2.25,damage-3,color);
        }
        break;}
      case 'forge':
        fanEnemy(m,7,Math.PI*.81,109,'#ffd376',damage);
        ring(m.x,m.y,42,color);break;
      case 'shards':
        fanEnemy(m,m.phase===2?7:5,1.22,145,color,damage);
        spark(m.x,m.y,color,18);break;
      case 'shatter':
        spreadEnemy(m,m.phase===2?14:9,110,color,damage);
        ring(m.x,m.y,45,color);break;
      case 'nova':{
        const inner=m.phase===3?25:32,outer=m.phase===3?94:82;
        ring(m.x,m.y,outer,color);ring(m.x,m.y,inner,'#f5d9ff');
        const d=distance(m,p);if(d>inner&&d<outer)hurtPlayer(damage+7,true);
        break;}
      case 'sigil':{
        const dx=Math.abs(m.targetX-p.x),dy=Math.abs(m.targetY-p.y);
        const len=m.phase===3?88:68,width=m.phase===3?12:9;
        if((dx<len&&dy<width)||(dy<len&&dx<width))hurtPlayer(damage+4,true);
        for(let i=-len;i<=len;i+=11){
          spark(m.targetX+i,m.targetY,color,3);spark(m.targetX,m.targetY+i,color,3);
        }
        break;}
      case 'constellation':
        spreadEnemy(m,m.phase===3?17:12,106,color,damage,.17);
        if(m.phase>1)fanEnemy(m,5,1.1,160,'#fff4e0',damage-4,.04);
        ring(m.x,m.y,58,color);break;
      case 'nadir-prism':{
        const [x,y]=[m.aimX,m.aimY];
        for(const side of [-1,1]){
          const pivot={x:m.targetX+side*y*28,y:m.targetY-side*x*28};
          if(World.canWalk(pivot.x,pivot.y,5))hazard(pivot.x,pivot.y,m.phase===3?22:17,2.4,damage,color);
        }
        fanEnemy(m,m.phase===3?7:5,1.22,128,color,damage);
        break;
      }
      case 'heir-spore':
        for(let i=0;i<3;i++){
          const x=m.targetX+m.aimX*(i-1)*28,y=m.targetY+m.aimY*(i-1)*28;
          if(World.canWalk(x,y,5))hazard(x,y,19,2.5+m.phase,damage-4,color);
        }
        break;
      case 'counter':
        Adaptive.guard(s,m,1.9);
        ring(m.x,m.y,39,color);
        if(distance(m,p)<43)hurtPlayer(def.boss?damage:damage-3);
        break;
      case 'sidestep':
      case 'break-line':{
        const side=m.id%2===0?1:-1,reach=def.boss?34:19;
        const a=m.aimX,b=m.aimY;
        const offsets=m.pattern==='sidestep'?[[b*side,-a*side],[-b*side,a*side]]:[
          [-a,-b],[-a*.7+b*.7,-b*.7-a*.7],[-a*.7-b*.7,-b*.7+a*.7]];
        const choices=offsets.map(([x,y])=>{
          const point={x:m.x+x*reach,y:m.y+y*reach};
          return {x,y,cover:m.pattern==='break-line'&&canWalk(point.x,point.y,7)&&!hasCover(m,point)&&hasCover(p,point)};
        }).sort((a,b)=>Number(b.cover)-Number(a.cover));
        for(const {x,y} of choices){
          if(move(m,x*reach,y*reach,7)){m.dir=heading(x,y);break;}
        }
        spark(m.x,m.y,color,9);break;
      }
    }
    m.cd=phaseCooldown(m,def);m.pattern='';
  }
  function updateMonster(m,dt){
    const def=codex[m.type],boss=!!def.boss, behavior=def.behavior||monsterBehavior[m.type];
    if(m.hp<=0){
      if(!boss&&s.time>=m.dead&&Math.hypot(s.player.x-m.homeX,s.player.y-m.homeY)>135)
        Object.assign(m,monster({x:m.homeX,y:m.homeY,type:m.type},m.id));
      return;
    }
    const p=s.player, d=distance(m,p);
    m.hit=Math.max(0,m.hit-dt);m.slow=Math.max(0,m.slow-dt);m.cd=Math.max(0,m.cd-dt);m.grace=Math.max(0,m.grace-dt);
    if(d<135)s.seen[m.type]=true;
    m.moving=false;
    if(!unlocked(m))return;
    const homeDist=Math.hypot(p.x-m.homeX,p.y-m.homeY),leash=boss?183:150;
    if(m.engaged && homeDist>leash+48){m.engaged=false;m.wind=0;m.dash=0;Adaptive.clearGuard(s,m);if(boss){m.hp=m.maxHp;m.phase=1;m.cycle=0;m.grace=0;}}
    if(!m.engaged && d<(boss?112:80) && homeDist<leash){m.engaged=true;Adaptive.encounter(s,m);if(boss){emit('sound','boss');emit('toast',def.name);}}
    if(m.dash>0){
      const dashSpeed=m.type==='syrava'?231:m.type==='shade'?211:172;
      m.dash=Math.max(0,m.dash-dt);m.moving=move(m,m.aimX*dashSpeed*dt,m.aimY*dashSpeed*dt,boss?7:5);
      if(distance(m,p)<(boss?22:15))hurtPlayer(def.damage+2);
      return;
    }
    if(m.wind>0){m.wind=Math.max(0,m.wind-dt);if(!m.wind)burstEnemy(m);return;}
    if(!m.engaged){
      if(d>250)return;
      const phase=s.time*.67+m.id*2.4,roam=boss?0:7;
      const dx=m.homeX+Math.cos(phase)*roam-m.x,dy=m.homeY+Math.sin(phase*.7)*roam-m.y;
      if(Math.hypot(dx,dy)>2){const dir=normalize(dx,dy);m.moving=move(m,dir[0]*17*dt,dir[1]*17*dt);m.dir=heading(...dir);}
      return;
    }
    const [x,y]=normalize(p.x-m.x,p.y-m.y);
    const speed=def.speed*(m.slow>0?.44:1);
    m.dir=heading(x,y);
    if(m.cd<=0){
      const response=Adaptive.response(s,m,d);
      if(response){beginWind(m,response,response==='counter'?.66:.5,x,y);label(m.x,m.y,reactionLines[response],def.color||'#f4cca0');return;}
    }
    if(boss){
      const patterns=bossPatterns[m.type][m.phase-1], next=patterns[m.cycle%patterns.length];
      if(m.cd<=0 && d<(patternDistance[next]||138)){
        const time=(patternWind[next]||.72)*(m.phase===3?.73:m.phase===2?.83:1);
        m.cycle++;beginWind(m,next,time,x,y);return;
      }
    }else if(m.cd<=0){
      if(behavior==='caster'&&d<102){beginWind(m,'shot',.65,x,y);return;}
      if(behavior==='charger'&&d<55){beginWind(m,'dash',.52,x,y);return;}
      if(behavior==='guard'&&d<(m.type==='crystalguard'?32:22)){beginWind(m,'stomp',.6,x,y);return;}
    }
    const hold=behavior==='caster'?53:boss?19:11;
    if(d>hold)m.moving=move(m,x*speed*dt,y*speed*dt,boss?7:5);
    else if(behavior==='caster'&&d<32)m.moving=move(m,-x*speed*.64*dt,-y*speed*.64*dt);
  }
  function updateShots(dt){
    const p=s.player, pending=shots,epoch=worldEpoch;shots=[];
    for(const b of pending){
      b.ttl-=dt;if(b.ttl<=0)continue;
      b.x+=b.vx*dt;b.y+=b.vy*dt;
      if(!World.canWalk(b.x,b.y,1))continue;
      if(b.hostile && distance(b,p)<9){hurtPlayer(b.damage,true);if(worldEpoch!==epoch)return;continue;}
      if(!b.hostile){
        const m=nearest(b,13);
        if(m){
          const dealt=hurtMonster(m,b.damage,b.color,'projectile');
          if(b.style==='leech'&&dealt)heal(dealt*.33);
          if(dealt){
            if(!b.practice?.used)announce(Gear.strike(s,{hit:true,magical:b.practice?.event==='magic',boss:!!codex[m.type].boss,combo:b.practice?.stage}).notices);
            recordImpact(b.practice);
          }
          continue;
        }
      }
      shots.push(b);
    }
  }
  function step(delta,input={},elapsed=delta){
    if(!s || !Number.isFinite(delta)||delta<=0)return;
    const dt=Math.min(.1,delta),p=s.player,epoch=worldEpoch;
    s.time+=dt;Calendar.advance(s.calendar,elapsed-dt);combat=Math.max(0,combat-dt);autosave+=dt;
    for(const id of Object.keys(p.cooldowns))p.cooldowns[id]=Math.max(0,p.cooldowns[id]-dt);
    for(const f of ['invul','hit','swing','wardTime'])p[f]=Math.max(0,p[f]-dt);
    if(!p.invul)evadePending=false;
    if(!p.wardTime){p.ward=0;wardPractice=null;}
    const st=stats();p.mp=Math.min(st.mpMax,p.mp+dt*(p.race==='elf'?2.5:1.65));
    if(combat===0&&s.daily.critical<180)p.hp=Math.min(st.hpMax,p.hp+dt*.76);
    p.moving=false;
    if(p.dash>0){p.dash=Math.max(0,p.dash-dt);p.moving=move(p,p.dashX*dt*285,p.dashY*dt*285,6);}
    else if(input.x||input.y){
      const [x,y]=normalize(input.x||0,input.y||0);p.dir=heading(x,y);p.moving=move(p,x*st.speed*dt,y*st.speed*dt,6);
      if(p.moving){movingTime+=dt;if(movingTime>=1){record('run',movingTime);movingTime=0;}}
    }
    if(input.attack)action('attack');
    for(const m of s.monsters){updateMonster(m,dt);if(worldEpoch!==epoch)return;}
    if(ally){
      ally.life-=dt;ally.cd-=dt;ally.x=p.x+Math.cos(s.time*2)*16;ally.y=p.y+Math.sin(s.time*2)*7;
      const m=nearest(ally,123);
      if(m&&ally.cd<=0){
        launch(ally.x,ally.y,normalize(m.x-ally.x,m.y-ally.y),'orb',ally.power,ally.color);
        shots.at(-1).practice=ally.practice;ally.cd=1.35;
      }
      if(ally.life<=0)ally=null;
    }
    updateShots(dt);
    if(worldEpoch!==epoch)return;
    for(const h of hazards){
      h.ttl-=dt;
      if(h.ttl>0&&distance(h,p)<h.r)hurtPlayer(h.damage,true);
      if(worldEpoch!==epoch)return;
    }
    hazards=hazards.filter(h=>h.ttl>0);
    effects=effects.filter(f=>{
      f.ttl-=dt;if(f.vx!==undefined){f.x+=f.vx*dt;f.y+=f.vy*dt;if(f.kind==='dust')f.vy+=60*dt;}
      return f.ttl>0;
    });
    if(s.life.nextPulse<=s.time){
      const before=Object.keys(s.life.visits).length;
      announce(Life.tick(s,dt));
      Society.tick(s);
      Build.tick(s);
      Economy.tick(s);
      const legendaryNews=Legendary.tick(s);
      if(legendaryNews.length){announce(legendaryNews);keep();}
      if(Daily.tick(s,{moving:p.moving,combat:combat>0})){
        p.hp-=st.hpMax*.014;
        if(p.hp<=0){recover();return;}
      }
      const found=Object.keys(s.life.visits).length-before;
      if(found)announce(Growth.record(p.growth,'explore',found,{region:s.region}));
    }
    const societyNews=Conflicts.tick(s,dt,{hitMob:npcImpact,walk:canWalk,notify:event=>{
      if(event?.id)announce(Reputation.record(s,event.id,event));
    }});
    if(societyNews?.length){announce(societyNews);keep();}
    const urbanNews=UrbanLife.tick(s,dt,{walk:canWalk});
    if(urbanNews?.length){announce(urbanNews);keep();}
    if(s.guild.team.length||s.guild.active?.type==='escort'){
      const notice=Guild.tick(s,dt,{target:(x,y,r)=>nearest({x,y},r),hit:hurtMonster,walk:canWalk,notify:announce});
      if(notice){emit('toast',notice);keep();}
    }
    tickGrowth+=dt;
    if(tickGrowth>=.35){tickGrowth=0;if(tryEvolution())keep();}
    if(autosave>=12){save();autosave=0;}
  }
  function diamond(ctx,x,y,color){
    ctx.fillStyle='#202d32';ctx.fillRect(x-2,y-3,5,7);ctx.fillRect(x-3,y-1,7,3);
    ctx.fillStyle=color;ctx.fillRect(x-1,y-2,3,5);ctx.fillRect(x-2,y-1,5,3);ctx.fillStyle='#ffeed2';ctx.fillRect(x,y-1,1,2);
  }
  function actors(t=0){
    if(!s)return [];
    const p=s.player,items=[];
    function sprite(kind,entity,opts={},extras){
      const {x,y}=entity;
      items.push({x,y,draw(ctx){
        ActorArt.draw(ctx,kind,x,y,{t,dir:entity.dir||'down',moving:entity.moving||false,hit:entity.hit>0,attack:entity.swing>0,...opts});
        if(extras)extras(ctx,x,y);
      }});
    }
    sprite(p.race,p,{evolution:spriteForm(p)},(ctx,x,y)=>{
      if(p.ward>0){ctx.save();ctx.strokeStyle='#a3dfff';ctx.globalAlpha=.45+.2*Math.sin(t*4);ctx.beginPath();ctx.ellipse(x,y-10,12,15,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
    });
    for(const id of ['elder','merchant','smith']){
      if(Conflicts.takesOver(s,id))continue;
      const point=npcPoint(id);
      if(!point)continue;
      sprite(id,point,{},(ctx,x,y)=>{
        if(id==='elder'&&(s.quest===0||s.quest===3||s.campaign.stage===4)||id==='smith'&&(s.sideQuest===0||s.sideQuest===1&&p.inventory.herb>=3))
          diamond(ctx,Math.round(x),Math.round(y-30+Math.sin(t*2)),id==='elder'?'#edbd65':'#b7e4cf');
      });
    }
    for(const m of s.monsters){
      if(m.hp<=0||m.type!=='boss'&&!unlocked(m))continue;
      sprite(codex[m.type].art||(m.type==='wolf'?'feral':m.type),m,{phase:m.phase,attack:m.wind>0||m.dash>0||Conflicts.fighting(s,m.id)},(ctx,x,y)=>{
        if(m.engaged&&!codex[m.type].boss&&m.hp<m.maxHp){
          x=Math.round(x)-8;y=Math.round(y)-27;ctx.fillStyle='#292b32';ctx.fillRect(x-1,y-1,18,4);
          ctx.fillStyle='#d98f7c';ctx.fillRect(x,y,Math.max(1,Math.round(16*m.hp/m.maxHp)),2);
        }
      });
    }
    World.points.resources.forEach((q,i)=>{
      if(s.resourceTimes[i]>s.time)return;
      items.push({x:q.x,y:q.y,draw(ctx){
        if(q.type==='wood'){
          ctx.fillStyle='#4f4337';ctx.fillRect(q.x-7,q.y-6,13,5);
          ctx.fillStyle='#bd9461';ctx.fillRect(q.x-6,q.y-6,10,2);
          ctx.fillStyle='#d9b77c';ctx.fillRect(q.x+4,q.y-5,2,3);
        }else ActorArt.icon(ctx,q.type,q.x-6,q.y-10,12);
        if(Math.sin(t*1.8+i)>.7){ctx.fillStyle='#fff3b2';ctx.fillRect(q.x+5,q.y-11,1,3);ctx.fillRect(q.x+4,q.y-10,3,1);}
      }});
    });
    const lantern=s.region==='valley'?window.Lantern?.actor(s,t):null;
    if(lantern)items.push(lantern);
    items.push(...Life.actors(s,t));
    items.push(...Build.actors(s,t));
    items.push(...Society.actors(s,t));
    items.push(...Guild.actors(s,t));
    items.push(...Conflicts.actors(s,t),...Legendary.actors(s,t));
    items.push(...UrbanWorld.actors(s,t),...UrbanLife.actors(s,t));
    return items;
  }
  function circle(ctx,x,y,r,color){
    ctx.strokeStyle=color;ctx.beginPath();ctx.ellipse(x,y,r,r*.70,0,0,Math.PI*2);ctx.stroke();
  }
  function groundCircle(ctx,x,y,r,color,filled){
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
    if(filled){ctx.fillStyle=color;ctx.fill();}
    else{ctx.strokeStyle=color;ctx.stroke();}
  }
  function warnCircle(ctx,x,y,r,color,progress){
    ctx.globalAlpha=.10+.15*progress;groundCircle(ctx,x,y,r,color,true);
    ctx.globalAlpha=.8;groundCircle(ctx,x,y,r,color,false);
    if(progress>.025)groundCircle(ctx,x,y,r*progress,color,false);
  }
  function drawFX(ctx){
    if(!s)return;
    ctx.save();ctx.lineWidth=1;
    for(const m of s.monsters){
      if(m.hp<=0||!m.wind)continue;
      const pattern=m.pattern,progress=1-m.wind/m.windDuration,color=codex[m.type].color||(m.phase===2?'#ff9db9':'#ffbf75');
      if(pattern==='slag'){
        warnCircle(ctx,m.targetX,m.targetY,24,color,progress);
        if(m.phase===2){
          warnCircle(ctx,m.targetX+m.aimY*27,m.targetY-m.aimX*27,13,color,progress);
          warnCircle(ctx,m.targetX-m.aimY*27,m.targetY+m.aimX*27,13,color,progress);
        }
        continue;
      }
      if(pattern==='hammer'){warnCircle(ctx,m.x,m.y,m.phase===2?63:51,color,progress);continue;}
      if(pattern==='counter'){warnCircle(ctx,m.x,m.y,40,color,progress);continue;}
      if(pattern==='nadir-prism'){
        for(const side of [-1,1])warnCircle(ctx,m.targetX+side*m.aimY*28,m.targetY-side*m.aimX*28,m.phase===3?22:17,color,progress);
        continue;
      }
      if(pattern==='heir-spore'){
        for(let i=0;i<3;i++)warnCircle(ctx,m.targetX+m.aimX*(i-1)*28,m.targetY+m.aimY*(i-1)*28,19,color,progress);
        continue;
      }
      if(pattern==='nova'){
        const inner=m.phase===3?25:32,outer=m.phase===3?94:82;
        ctx.globalAlpha=.12+.20*progress;ctx.fillStyle=color;
        ctx.beginPath();ctx.arc(m.x,m.y,outer,0,Math.PI*2);ctx.arc(m.x,m.y,inner,0,Math.PI*2,true);ctx.fill('evenodd');
        ctx.globalAlpha=.9;groundCircle(ctx,m.x,m.y,outer,color,false);groundCircle(ctx,m.x,m.y,inner,'#fff2c0',false);
        continue;
      }
      if(pattern==='sigil'){
        const len=m.phase===3?88:68,width=m.phase===3?12:9;
        ctx.globalAlpha=.15+.28*progress;ctx.fillStyle=color;
        ctx.fillRect(m.targetX-len,m.targetY-width,len*2,width*2);
        ctx.fillRect(m.targetX-width,m.targetY-len,width*2,len*2);
        ctx.globalAlpha=.9;ctx.strokeStyle=color;
        ctx.strokeRect(m.targetX-len,m.targetY-width,len*2,width*2);
        ctx.strokeRect(m.targetX-width,m.targetY-len,width*2,len*2);
        continue;
      }
      const r=pattern==='stomp'?(m.type==='boss'?(m.phase===2?55:44):m.type==='crystalguard'?36:25):12;
      ctx.globalAlpha=.55;circle(ctx,m.x,m.y,r,color);
      if(pattern==='shot'||pattern==='dash'||pattern==='shards'||pattern==='forge'){
        const length=m.type==='syrava'?105:55;
        ctx.setLineDash([3,3]);ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(m.x,m.y-4);
        ctx.lineTo(m.x+m.aimX*length,m.y-4+m.aimY*length);ctx.stroke();ctx.setLineDash([]);
      }
      ctx.globalAlpha=1;circle(ctx,m.x,m.y,r*progress,color);
    }
    for(const h of hazards){
      ctx.globalAlpha=.22+.12*Math.sin(h.ttl*7);groundCircle(ctx,h.x,h.y,h.r,h.color,true);
      ctx.globalAlpha=.78;groundCircle(ctx,h.x,h.y,h.r,h.color,false);
    }
    for(const b of shots){
      const x=Math.round(b.x),y=Math.round(b.y-7);ctx.fillStyle=b.color;
      ctx.globalAlpha=.4;ctx.fillRect(Math.round(x-b.vx*.025)-2,Math.round(y-b.vy*.025)-1,4,3);
      ctx.globalAlpha=1;ctx.fillRect(x-3,y-1,7,3);ctx.fillRect(x-1,y-3,3,7);ctx.fillStyle='#fff8dc';ctx.fillRect(x-1,y-1,3,3);
    }
    if(ally)diamond(ctx,Math.round(ally.x),Math.round(ally.y-13),ally.color);
    for(const f of effects){
      const x=Math.round(f.x),y=Math.round(f.y);ctx.globalAlpha=Math.min(1,f.ttl*5);
      switch(f.kind){
        case 'label':
          ctx.textAlign='center';ctx.font='bold 8px monospace';ctx.fillStyle='#29323c';ctx.fillText(f.text,x+1,y+1);
          ctx.fillStyle=f.color;ctx.fillText(f.text,x,y);break;
        case 'ring':circle(ctx,x,y,Math.max(.2,f.r*(1-f.ttl/f.duration)),f.color);break;
        case 'arc':{
          const k=1-f.ttl/f.duration;ctx.strokeStyle=f.color;ctx.lineWidth=2.5;
          ctx.beginPath();ctx.arc(x,y,f.r*(.77+.23*k),f.angle-1.1+k*.7,f.angle+.8+k*.45);
          ctx.stroke();ctx.lineWidth=1;break;}
        case 'dust':ctx.fillStyle=f.color;ctx.fillRect(x,y,2,2);break;
      }
    }
    const p=s.player,boss=s.monsters.find(m=>m.hp>0&&m.engaged&&codex[m.type].boss);
    if(boss&&p.y<boss.y&&p.y>boss.y-55&&Math.abs(p.x-boss.x)<27){
      ctx.globalAlpha=1;
      diamond(ctx,Math.round(p.x),Math.round(p.y-29),'#a5f8e1');
    }
    ctx.restore();
  }
  function exportSave(){if(!s)return '';Inventory.sync(s);return JSON.stringify(s);}
  function save(){
    if(!s)return false;
    try{localStorage.setItem(key,exportSave());return true;}catch{return false;}
  }
  const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const num=(x,min,max)=>Number.isFinite(x)&&x>=min&&x<=max;
  const int=(x,min,max)=>Number.isInteger(x)&&num(x,min,max);
  function validateRegionState(state,region){
    const {points,width,height}=region;
    const entries=spawns(points);
    if(!Array.isArray(state.monsters)||state.monsters.length!==entries.length||
      !Array.isArray(state.resourceTimes)||state.resourceTimes.length!==points.resources.length||
      !state.resourceTimes.every(n=>num(n,0,1e10+1000)))return false;
    for(const [i,m] of state.monsters.entries()){
      const q=entries[i],def=codex[q.type];
      if(!obj(m)||m.id!==i||m.type!==q.type||m.homeX!==q.x||m.homeY!==q.y||
        !num(m.x,0,width)||!num(m.y,0,height)||!num(m.hp,0,def.hp)||m.maxHp!==def.hp||
        !int(m.phase,1,def.boss?phaseCount(m.type):1)||!Object.hasOwn(dirVectors,m.dir)||
        !['','roots','dash','shot','stomp','hammer','slag','forge','shards','shatter','nova','sigil','constellation','counter','sidestep','break-line','nadir-prism','heir-spore'].includes(m.pattern)||
        !['wind','cd','cycle','dead','hit','slow','dash','grace'].every(k=>num(m[k],0,1e10+1000))||
        (m.wind>0&&!num(m.windDuration,m.wind,10))||!num(m.aimX,-1,1)||!num(m.aimY,-1,1)||
        !num(m.targetX,0,width)||!num(m.targetY,0,height)||typeof m.engaged!=='boolean'||typeof m.moving!=='boolean')return false;
    }
    return true;
  }
  function parseSave(raw){
    if(typeof raw!=='string'||!raw.length||raw.length>saveMaxBytes)return null;
    const d=JSON.parse(raw);
    if(!obj(d)||![1,2,3,4,5,6,version].includes(d.version)||!int(d.seed,0,4294967295)||!num(d.time,0,1e10)||
      !int(d.quest,0,4)||!int(d.sideQuest,0,2)||typeof d.bossDefeated!=='boolean')return null;
    const previousVersion=d.version,legacy=previousVersion<3;
    if(!Object.hasOwn(d,'lanternFound'))d.lanternFound=false;
    if(typeof d.lanternFound!=='boolean')return null;
    const p=d.player;
    if(!obj(p)||!obj(p.inventory))return null;
    if(previousVersion===1){
      d.region='valley';d.regions={};d.campaign={stage:d.quest===4?1:0,completed:false};
      p.evolutionStage=p.form===null?0:1;
      for(const id of ['gauntlet','prism','heart'])p.inventory[id]=0;
      if(Array.isArray(d.monsters))for(const m of d.monsters)if(obj(m)){m.targetX=m.x;m.targetY=m.y;m.grace=0;}
    }
    const active=regionInfo(d.region);
    if(!active||!obj(d.regions)||Object.hasOwn(d.regions,d.region)||!obj(d.campaign)||!int(d.campaign.stage,0,5)||
      d.campaign.completed!==(d.campaign.stage===5)||((d.quest===4)!==(d.campaign.stage>0)))return null;
    if(d.region==='quarry'&&d.campaign.stage<1||d.region==='rift'&&d.campaign.stage<2)return null;
    if(!obj(p)||!Object.hasOwn(raceBook,p.race)||!Object.hasOwn(dirVectors,p.dir)||![null,0,1].includes(p.form)||
      !int(p.evolutionStage,0,2)||(p.form===null)!==(p.evolutionStage===0)||
      !num(p.x,0,active.width)||!num(p.y,0,active.height)||!int(p.level,1,1e6)||
      !num(p.hp,0,1e10)||!num(p.mp,0,1e10)||!num(p.xp,0,1e10))return null;
    if(legacy&&!Object.hasOwn(p,'talents'))p.talents=freshTalents();
    if(!obj(p.talents)||Object.keys(p.talents).length!==Object.keys(talents).length||
      !Object.keys(talents).every(id=>int(p.talents[id],0,3))||talentPoints(p)<0)return null;
    if(!['kills','gold','potions','rep'].every(id=>int(p[id],0,1e10))||
      !['herb','ore','essence',...Object.keys(equipment)].every(id=>int(p.inventory[id],0,1e10))||
      p.equipped!==null&&(!Object.hasOwn(equipment,p.equipped)||!p.inventory[p.equipped]))return null;
    if(!obj(p.skills)||!p.skills.spark||!p.skills.mend||!Object.entries(p.skills).every(([id,v])=>
      Object.hasOwn(skills,id)&&obj(v)&&int(v.uses,0,1e10)&&int(v.level,1,5)))return null;
    if(!Array.isArray(p.slots)||p.slots.length!==3||!p.slots.every(id=>Object.hasOwn(p.skills,id))||
      new Set(p.slots).size!==3||!Array.isArray(p.traits)||p.traits.length>rules.traitCap||
      !p.traits.every(id=>Object.hasOwn(traits,id))||new Set(p.traits).size!==p.traits.length)return null;
    const book=(v,ids,match)=>obj(v)&&Object.entries(v).every(([id,entry])=>Object.hasOwn(ids,id)&&match(entry));
    if(!book(p.echoes,traits,n=>int(n,0,1e10))||!book(d.defeated,codex,n=>int(n,0,1e10))||
      !book(d.seen,codex,n=>typeof n==='boolean')||!book(p.cooldowns,{...skills,attack:1,dash:1,potion:1,innate:1},n=>num(n,0,120)))return null;
    if(!['dash','invul','hit','swing','ward','wardTime'].every(id=>num(p[id],0,1e8))||
      !num(p.dashX,-1,1)||!num(p.dashY,-1,1)||typeof p.moving!=='boolean')return null;
    if(!validateRegionState(d,active))return null;
    for(const [id,state] of Object.entries(d.regions)){
      const region=regionInfo(id);
      if(!region||!obj(state)||!validateRegionState(state,region))return null;
    }
    const valley=d.region==='valley'?d:d.regions.valley;
    const originalBoss=valley?.monsters.find(m=>m.type==='boss');
    if(!originalBoss||d.bossDefeated!==(originalBoss.hp===0)||d.quest>=3&&!d.bossDefeated)return null;
    for(const [id,def] of Object.entries(codex)){
      if(!def.item)continue;
      const defeated=d.campaign.stage>def.stage;
      const regional=campaignSteps[def.stage].region;
      const ms=(d.region===regional?d:d.regions[regional])?.monsters;
      const boss=ms?.find(m=>m.type===id);
      if(defeated!==!!d.defeated[id]||defeated&&!p.inventory[def.item]||boss&&defeated!==(boss.hp===0)||defeated&&!boss)return null;
    }
    if(!legacy&&(!Object.hasOwn(p,'growth')||!Object.hasOwn(d,'life')))return null;
    p.growth=Growth.restore(legacy?undefined:p.growth,raceBook[p.race],d.seed,p);
    if(!p.growth)return null;
    d.life=Life.restore(legacy?undefined:d.life,d.seed,d);
    if(!d.life)return null;
    d.build=Build.restore(d.build);
    if(!d.build)return null;
    const preLife=previousVersion<5;
    if(!preLife&&!['calendar','bag','workshop','daily','economy'].every(id=>Object.hasOwn(d,id)))return null;
    d.calendar=Calendar.restore(d.calendar,d.seed,preLife?d.time:0);
    if(!d.calendar)return null;
    d.bag=Inventory.restore(d.bag,d.seed,d);
    if(!d.bag)return null;
    d.workshop=Tradecraft.restore(d.workshop,d);
    if(!d.workshop)return null;
    Tradecraft.install(d,preLife&&d.workshop.round===0);
    d.daily=Daily.restore(d.daily,d);
    if(!d.daily)return null;
    d.economy=Economy.restore(d.economy,d.seed,d);
    if(!d.economy)return null;
    d.society=Society.restore(d.society,d.seed,d);
    if(!d.society)return null;
    d.guild=Guild.restore(d.guild,d);
    if(!d.guild)return null;
    const latest=['gear','adaptive','conflicts','legendary','reputation'];
    if(previousVersion>=6&&!latest.every(id=>Object.hasOwn(d,id)))return null;
    d.legendary=Legendary.restore(d.legendary,d);
    if(!d.legendary)return null;
    const freshGear=d.gear===undefined;
    d.gear=Gear.restore(d.gear,d);
    if(!d.gear)return null;
    if(!Gear.install(d,freshGear))return null;
    d.adaptive=Adaptive.restore(d.adaptive);
    d.conflicts=Conflicts.restore(d.conflicts,d);
    d.reputation=Reputation.restore(d.reputation,d);
    if(!d.adaptive||!d.conflicts||!d.reputation)return null;
    if(!Legendary.validateRegions(d))console.warn('Santuario della Marea Muta: stato incoerente nel salvataggio.');
    if(previousVersion===version&&!['urban','cityWorks'].every(id=>Object.hasOwn(d,id)))return null;
    d.urban=UrbanLife.restore(d.urban,d);
    d.cityWorks=UrbanServices.restore(d.cityWorks,d);
    if(!d.urban||!d.cityWorks)return null;
    d.version=version;
    return d;
  }
  function activate(candidate){
    if(!setWorld(candidate.region,candidate.seed))return false;s=candidate;
    if(!canWalk(s.player.x,s.player.y,6)){s.player.x=World.spawn.x;s.player.y=World.spawn.y;}
    s.player.hp=clamp(s.player.hp,1,stats().hpMax);s.player.mp=clamp(s.player.mp,0,stats().mpMax);
    resetTransient();return true;
  }
  function savedCandidate(){
    for(const storageKey of saveKeys){
      try{const candidate=parseSave(localStorage.getItem(storageKey));if(candidate)return candidate;}catch{}
    }
    return null;
  }
  function load(){
    try{const candidate=savedCandidate();return candidate?activate(candidate):false;}catch{return false;}
  }
  function importSave(raw){
    try{
      const candidate=parseSave(raw);if(!candidate)return false;
      localStorage.setItem(key,JSON.stringify(candidate));
      return activate(candidate);
    }catch{return false;}
  }
  function hasSave(){
    try{return !!savedCandidate();}catch{return false;}
  }
  const Game={get s(){return s;},onEvent:null,rules,races,skills,traits,talents,codex,equipment,campaignSteps,saveMaxBytes,newGame,load,save,exportSave,importSave,hasSave,
    view,step,action,command,actors,drawFX,activeSkill,practice,practiceView:()=>practiceSession&&GamePractice.view(practiceSession.session),cancelPractice:()=>{practiceSession=null;}};
  window.Game=Game;
})();
