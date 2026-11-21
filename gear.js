/* Equipment and wear. Legacy relics and forged blades retain their original statistics. */
(() => {
  'use strict';

  const slotIds=['weapon','armor','accessory'];
  const rarities=[
    ['common','Comune','#c5d6c9'],['uncommon','Non comune','#8bd3a4'],['rare','Raro','#94d3ff'],
    ['epic','Epico','#d2aff9'],['legendary','Leggendario','#ffd37f'],
    ['mythic','Mitico','#ffb1c4'],['divine','Divino','#fff0c6']
  ].map(([id,name,color],index)=>Object.freeze({id,name,color,rank:index+1}));
  const rarityById=Object.fromEntries(rarities.map(r=>[r.id,r]));
  const qualities=['Scadente','Semplice','Buona','Ottima','Perfetta'];
  const masteryAt=[0,12,30,62,105,165];
  const emptyBonus=()=>({attack:0,defense:0,speed:0});
  const armorCraft=(ore,wool,essence=0)=>({ore,wool,...(essence?{essence}:{})});
  const recipe=(level,stage,gold,materials)=>({level,stage,gold,materials});
  const regular=[
    ['gear-cloth','Cappa usata','armor','common',78,0,1,0,'La stoffa di recupero protegge dagli urti più leggeri.',recipe(1,0,4,{wool:2})],
    ['gear-cudgel','Mazza di salice','weapon','common',92,2,0,0,'Un’impugnatura rustica che il fabbro può bilanciare.',recipe(1,0,6,{work:2,ore:1})],
    ['gear-hide','Corazza di cuoio rinforzato','armor','uncommon',122,0,3,0,'Strati di fibra riducono i colpi senza irrigidire la muta.',recipe(2,0,12,armorCraft(2,3))],
    ['gear-wakeband','Nodo del cammino','accessory','uncommon',132,0,1,3,'Le fibre intrecciate seguono il passo di chi lo porta.',recipe(2,0,14,{wool:2,essence:1})],
    ['gear-tideknife','Taglio delle Radici','weapon','rare',158,6,0,1,'Una lama equilibrata secondo il disegno riportato dal Cerchio.',recipe(3,1,27,{ore:4,work:1,essence:2})],
    ['gear-bastion','Corazza del Bastione','armor','epic',196,0,7,0,'La tecnica di Kharun piega il metallo come una seconda pelle.',recipe(5,2,45,armorCraft(7,3,3))],
    ['gear-spiral','Pendaglio delle Spire','accessory','epic',204,2,3,4,'I solchi del prisma trattengono energia al movimento.',recipe(5,3,52,{ore:4,wool:3,essence:5})],
    ['gear-dawnedge','Lama del Primo Sole','weapon','legendary',248,11,1,1,'Una lama a doppia tempra appresa dopo il passaggio della Serpe.',recipe(7,3,88,{ore:10,work:4,essence:7})],
    ['gear-varcoweave','Trama del Varco','armor','legendary',230,0,10,1,'La trama segue le aperture tra cristallo e luce.',recipe(7,4,95,armorCraft(8,8,8))],
    ['gear-moonring','Sigillo del Patto Lunare','accessory','mythic',292,5,5,5,'Un anello di materia leggera tenuto insieme dal sigillo del ritorno.',recipe(9,5,145,{ore:10,wool:5,essence:12})],
    ['divine-nadir','Filo di Nadir','weapon','divine',360,18,3,4,'Il filo dell’originale trattiene il silenzio del Nadir. Cimelio unico del guardiano.',null]
  ];
  const relics=[
    ['charm','Talismano di Vela','common',180,3,1,0],
    ['crown','Corona di Orveth','rare',205,5,3,0],
    ['gauntlet','Guanto di Kharun','epic',230,8,4,0],
    ['prism','Prisma di Syrava','legendary',256,10,5,0],
    ['heart','Cuore del Varco','mythic',280,13,7,0]
  ];
  const materialNames={ore:'Minerale lucente',work:'Trave di legno',wool:'Lana',essence:'Essenza','repair-kit':'Corredo da riparazione'};
  const enchantments={
    ember:{name:'Brace trattenuta',slot:'weapon',description:'Attacco +2',bonus:{attack:2}},
    reed:{name:'Sigillo della canna',slot:'armor',description:'Difesa +2',bonus:{defense:2}},
    breeze:{name:'Nodo di brezza',slot:'accessory',description:'Velocità +3',bonus:{speed:3}}
  };
  const enchantBySlot=Object.fromEntries(Object.entries(enchantments).map(([id,e])=>[e.slot,id]));
  const defs=Object.fromEntries(regular.map(([id,name,slot,rarity,durability,attack,defense,speed,description,craft])=>[
    id,{id,name,slot,rarity,durability,base:{attack,defense,speed},description,craft,legacy:false,bound:rarity==='divine',
      category:slot==='weapon'?'weapons':slot==='armor'?'armor':'magic',icon:slot==='weapon'?'core':slot==='armor'?'ward':'shard'}]));
  for(const [id,name,rarity,durability,attack,defense,speed] of relics)
    defs[id]={id,name,slot:'accessory',rarity,durability,base:{attack,defense,speed},
      description:'Cimelio della campagna. Può essere mantenuto e inciso alla forgia.',craft:null,legacy:'relic',category:'magic',icon:'shard'};
  for(const [i,quality] of ['scarso','buono','ottimo','perfetto'].entries()){
    const id='blade-'+i;
    defs[id]={id,name:'Lama della forgia · '+quality,slot:'weapon',rarity:i===3?'rare':i>=1?'uncommon':'common',
      durability:130+i*18,base:{attack:2+i*2,defense:0,speed:0},description:'Lama ottenuta dalla prova di forgiatura.',
      craft:null,legacy:'blade',category:'weapons',icon:'core',quality:[0,2,3,4][i]};
  }

  const idDivine='divine-nadir',kitId='repair-kit';
  const ownedDefinitions=Object.values(defs).filter(def=>!def.legacy);
  const boundMaterial={id:kitId,name:'Corredo da riparazione',category:'tools',icon:'ward',
    description:'Si consuma con minerale lucente per riparare a mano. Richiede Fabbro di livello 4.'};
  const has=(value,key)=>value!==null&&value!==undefined&&Object.hasOwn(value,key);
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const int=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
  const definition=id=>has(defs,id)?defs[id]:null;
  const okay=(text,extra={})=>({ok:true,changed:true,text,...extra});
  const fail=text=>({ok:false,text});
  const qty=(s,id,where='pack')=>window.Inventory?.quantity(s,id,where)||0n;
  const inBag=(s,id)=>qty(s,id)>0n;
  const ownedQty=(s,id)=>qty(s,id)+qty(s,id,'deposit');
  const owns=(s,id)=>!!definition(id)&&ownedQty(s,id)>0n;
  const isManaged=id=>!!definition(id);
  const level=s=>window.Life?.level?.(s,'smith')||0;
  const stage=s=>s.campaign?.stage||0;
  const openHours=s=>s.calendar&&window.Calendar?Calendar.view(s.calendar,s.time,s.region).shopOpen:true;

  function create(){return {schema:1,items:{},slots:{weapon:null,armor:null,accessory:null}};}

  function startingRecord(def,quality=def.quality??0){
    return {current:def.durability,quality,uses:0,ascension:0,enchant:null};
  }

  function add(s,def,quality){
    if(!s?.gear||has(s.gear.items,def.id)||ownedQty(s,def.id)>0n)return false;
    if(!Inventory.add(s,def.id,1))return false;
    s.gear.items[def.id]=startingRecord(def,quality);
    return true;
  }

  function install(s,starter=false){
    if(!s?.gear||!window.Inventory)return false;
    if(!Inventory.define(s,boundMaterial))return false;
    for(const def of ownedDefinitions){
      const {id,name,description,category,icon,bound}=def;
      if(!Inventory.define(s,{id,name,description,category,icon,rarity:rarityById[def.rarity].name,
        equippable:true,quest:bound, type:'equipaggiamento'}))return false;
    }
    if(starter&&!has(s.gear.items,'gear-cloth')&&!inBag(s,'gear-cloth'))
      return add(s,defs['gear-cloth'],0);
    return true;
  }

  function provenDivine(s){
    const t=s.legendary?.originalDefeatedAt;
    return Number.isFinite(t)&&t>=0&&t<=(Number.isFinite(s.time)?s.time:Infinity);
  }
  function awardDivine(s,id){
    if(id!==idDivine||s?.region!=='nadir-vault'||!provenDivine(s)||!s.gear)return false;
    if(has(s.gear.items,id))return inBag(s,id)&&s.gear.items[id].quality===4;
    return add(s,defs[id],4);
  }

  function restore(raw,s){
    if(raw===undefined){
      if(ownedDefinitions.some(d=>ownedQty(s,d.id)>0n))return null;
      return create();
    }
    if(!object(raw)||raw.schema!==1||!object(raw.items)||!object(raw.slots)||Object.keys(raw.slots).length!==slotIds.length)return null;
    const clean=create();
    for(const [id,state] of Object.entries(raw.items)){
      const def=definition(id);
      if(!def||!object(state)||!int(state.current,0,def.durability)||!int(state.quality,0,4)||
         !int(state.uses,0,1000000000)||!int(state.ascension,0,2)||
         !(state.enchant===null||state.enchant===enchantBySlot[def.slot]))return null;
      if(id===idDivine&&(!provenDivine(s)||s.legendary?.claimed!==true||qty(s,id)!==1n||qty(s,id,'deposit')!==0n||state.quality!==4))return null;
      clean.items[id]={current:state.current,quality:state.quality,uses:state.uses,ascension:state.ascension,enchant:state.enchant};
    }
    for(const def of ownedDefinitions){
      const count=ownedQty(s,def.id);
      if(count>1n||count>0n&&!has(clean.items,def.id))return null;
    }
    if(s.legendary?.claimed===true&&!has(clean.items,idDivine))return null;
    for(const slot of slotIds){
      const id=raw.slots[slot];
      if(id!==null&&(!definition(id)||defs[id].slot!==slot||defs[id].legacy||!inBag(s,id)))return null;
      clean.slots[slot]=id;
    }
    return clean;
  }

  function item(s,def,write=false){
    const present=s.gear?.items?.[def.id];
    if(present)return present;
    if(!def.legacy||!owns(s,def.id))return null;
    const state=startingRecord(def);
    if(write&&s.gear)s.gear.items[def.id]=state;
    return state;
  }
  const master=uses=>masteryAt.findLastIndex(n=>uses>=n);
  function classicId(s,slot){
    if(slot==='weapon')return definition(s.workshop?.weapon)?.legacy==='blade'?s.workshop.weapon:null;
    if(slot==='accessory')return definition(s.player?.equipped)?.legacy==='relic'?s.player.equipped:null;
    return null;
  }
  function selected(s,slot){return s.gear?.slots?.[slot]||classicId(s,slot);}
  const isEquipped=(s,id)=>!!definition(id)&&selected(s,defs[id].slot)===id;
  function active(s,slot){
    const id=selected(s,slot),def=definition(id),state=def&&inBag(s,id)&&item(s,def);
    return state&&state.current>0?{def,state}:null;
  }
  function activateLegacy(s,id){
    const def=definition(id);
    if(!def?.legacy||!s?.gear||!inBag(s,id))return false;
    s.gear.slots[def.slot]=null;
    return true;
  }

  function addTo(target,from){for(const id of ['attack','defense','speed'])target[id]+=from[id]||0;}
  function refinements(def,state){
    const changes=emptyBonus();
    const primary=def.slot==='weapon'?'attack':def.slot==='armor'?'defense':'speed';
    // Existing pieces keep the exact legacy base quality. Only a newly refined tier adds a bonus.
    const oldQuality=def.quality??0;
    changes[primary]=Math.max(0,state.quality-oldQuality)+state.ascension;
    if(!def.legacy)changes[primary]+=Math.floor(master(state.uses)/2);
    if(state.enchant)addTo(changes,enchantments[state.enchant].bonus);
    return changes;
  }
  function itemBonus(def,state,full=false){
    const extra=refinements(def,state);
    if(full||!def.legacy)addTo(extra,def.base);
    return extra;
  }
  function bonus(s){
    const values=emptyBonus();
    const activeSlots=Object.fromEntries(slotIds.map(slot=>[slot,active(s,slot)]));
    for(const link of Object.values(activeSlots)){
      if(link)addTo(values,itemBonus(link.def,link.state));
    }
    return {...values,
      weaponActive:!!activeSlots.weapon,armorActive:!!activeSlots.armor,accessoryActive:!!activeSlots.accessory,
      legacyWeaponActive:!s.gear?.slots?.weapon&&(!classicId(s,'weapon')||activeSlots.weapon?.def.legacy==='blade'),
      legacyRelicActive:!s.gear?.slots?.accessory&&(!classicId(s,'accessory')||activeSlots.accessory?.def.legacy==='relic')};
  }

  function wear(s,slot,wearCost,streak,notices){
    const link=active(s,slot);
    if(!link||!s.gear||wearCost<=0)return false;
    const state=item(s,link.def,true);
    const before=master(state.uses);
    state.current=Math.max(0,state.current-wearCost);
    state.uses=Math.min(1000000000,state.uses+streak);
    if(state.current===0)notices.push(link.def.name+' · È a zero durabilità. I bonus sono sospesi.');
    if(master(state.uses)>before)notices.push(link.def.name+' · Maestria '+master(state.uses)+'/5.');
    return true;
  }
  function strike(s,context={}){
    const notices=[];
    if(!s?.gear||context.hit===false)return {changed:false,notices};
    const streak=context.boss||context.combo===3?2:1;
    const changed=wear(s,'weapon',1,streak,notices);
    const talisman=active(s,'accessory');
    const relicWorn=talisman&&context.magical===true?wear(s,'accessory',1,1,notices):false;
    return {changed:!!(changed||relicWorn),notices};
  }
  function defend(s,context={}){
    const notices=[];
    const damage=Number(context.damage)||0;
    if(!s?.gear||context.hit===false||damage<=0)return {changed:false,notices};
    const cost=Math.max(1,Math.min(3,Math.ceil(damage/23)));
    const armor=wear(s,'armor',cost,damage>=20?2:1,notices);
    const relic=context.magical||!armor;
    const accessory=!!relic&&wear(s,'accessory',1,1,notices);
    return {changed:armor||accessory,notices};
  }

  const costs=(gold,materials)=>({gold,materials});
  const kitRecipe=costs(5,{ore:1,work:1});
  function affordable(s,fee){
    return (s.player.gold??0)>=fee.gold&&Object.entries(fee.materials).every(([id,n])=>qty(s,id)>=BigInt(n));
  }
  function pay(s,fee){
    if(!affordable(s,fee))return false;
    for(const [id,n] of Object.entries(fee.materials))Inventory.take(s,id,n);
    s.player.gold-=fee.gold;
    return true;
  }
  function bill(fee){
    const parts=Object.entries(fee.materials).map(([id,n])=>n+' '+materialNames[id]);
    if(fee.gold)parts.push(fee.gold+' Scintille');
    return parts.join(' · ');
  }
  function service(s){
    const home=window.World?.regions?.valley?.points?.smith;
    const place=home&&(window.Life?.npcPoint?.(s,'smith',home)||home);
    const near=!!place&&s.region==='valley'&&Math.hypot(s.player.x-place.x,s.player.y-place.y)<=44;
    const open=openHours(s);
    const present=!window.Conflicts||Conflicts.canInteract(s,'smith')&&!Conflicts.takesOver(s,'smith');
    return {near,open,npc:near&&open&&present,rank:level(s)};
  }
  const stages=['','Concludi la missione di Orveth.','Sconfiggi Kharun.','Sconfiggi Syrava.','Sconfiggi Asterion.','Concludi la campagna.'];
  const atForge=svc=>!svc.near?'Avvicinati alla forgia di Vela.':!svc.open?'La forgia riceve dalle 07:00 alle 20:00.':'';

  function acquireReason(s,def,svc){
    if(def.bound)return 'Si ottiene soltanto sconfiggendo il Custode originale di Nadir.';
    if(!def.craft)return 'Si ottiene dal combattimento, dall’emporio o con la prova di forgiatura.';
    if(has(s.gear.items,def.id))return 'Questo pezzo è già stato realizzato.';
    const r=def.craft;
    return (stage(s)<r.stage?stages[r.stage]:'')||atForge(svc)||
      (svc.rank<r.level?'Serve Fabbro al livello '+r.level+'.':'')||
      (!affordable(s,r)?'Materiali o Scintille insufficienti.':'');
  }
  function repairCost(def,state,mode){
    const rank=rarityById[def.rarity].rank;
    if(mode==='kit')return costs(0,{[kitId]:1,ore:1+Math.floor(rank/3)});
    const lost=def.durability-state.current;
    return costs(Math.ceil(lost/16)+rank*2,{ore:Math.max(1,Math.ceil(lost/78))});
  }
  function repairReason(s,def,state,mode,svc){
    if(state.current===def.durability)return 'La durabilità è già al massimo.';
    if(mode==='kit'&&svc.rank<4)return 'Serve Fabbro al livello 4.';
    return (mode==='npc'?atForge(svc)||(!svc.npc?'Ivo non può occuparsi della riparazione. Puoi usare un corredo.':''):'')||
      (!affordable(s,repairCost(def,state,mode))?'Non hai il costo di riparazione.':'');
  }
  function upgradeCost(def,state,op){
    const r=rarityById[def.rarity].rank;
    if(op==='temper')return costs(4+r+state.quality*5,{ore:2+state.quality,essence:state.quality+1});
    if(op==='ascend')return costs(12+r*3+8*state.ascension,{ore:3+state.ascension*2,essence:3+r+state.ascension});
    return costs(7+r*2,{ore:2,essence:2+Math.floor(r/2)});
  }
  function upgradeReason(s,def,state,op,svc){
    if(state.current===0)return 'Ripara prima l’oggetto.';
    const practiced=master(state.uses);
    if(op==='temper'){
      if(state.quality>=4)return 'Qualità massima raggiunta.';
      if(practiced<1)return 'Usa l’oggetto fino alla maestria 1.';
    }else if(op==='ascend'){
      if(state.ascension>=2)return 'Ascensione massima raggiunta.';
      const target=state.ascension===0?2:4;
      if(practiced<target)return 'Serve la maestria '+target+' di questo pezzo.';
    }else{
      if(state.enchant)return 'Sul pezzo è già presente un incantamento.';
      if(practiced<2)return 'Usa l’oggetto fino alla maestria 2.';
    }
    const rank=op==='temper'?3:op==='ascend'?4+state.ascension:5;
    return atForge(svc)||(svc.rank<rank?'Serve Fabbro al livello '+rank+'.':'')||
      (!affordable(s,upgradeCost(def,state,op))?'Materiali o Scintille insufficienti.':'');
  }
  function event(text,op,id){
    const blade=op==='craft'&&['gear-tideknife','gear-dawnedge'].includes(id);
    return okay(text,{event:{id:blade?'forge':'gearWork',amount:1,meta:{kind:op,item:id}}});
  }

  function command(s,data){
    if(!s?.gear||!object(data))return fail('Scegli un’operazione di equipaggiamento.');
    const op=data.op,def=definition(data.id),svc=service(s);
    if(op==='makeKit'){
      const missing=atForge(svc);
      if(missing)return fail(missing);
      if(!pay(s,kitRecipe))return fail('Servono '+bill(kitRecipe)+'.');
      Inventory.add(s,kitId,1);
      return event('Corredo da riparazione preparato.','kit',kitId);
    }
    if(!def)return fail('Oggetto di equipaggiamento sconosciuto.');
    if(op==='craft'){
      const reason=acquireReason(s,def,svc);
      if(reason)return fail(reason);
      if(!add(s,def,Math.min(4,1+Math.floor(svc.rank/3))))return fail('Non puoi creare un secondo esemplare.');
      pay(s,def.craft);
      return event(def.name+' forgiato.','craft',def.id);
    }
    if(!inBag(s,def.id))return fail('L’oggetto deve essere nello zaino.');
    const state=item(s,def,true);
    if(!state)return fail('Questo pezzo non risulta acquisito.');
    if(op==='equip'){
      if(isEquipped(s,def.id))return fail('Il pezzo è già nello slot.');
      if(state.current===0)return fail('Ripara il pezzo prima di equipaggiarlo.');
      if(def.legacy){
        activateLegacy(s,def.id);
        if(def.legacy==='blade')s.workshop.weapon=def.id;
        else s.player.equipped=def.id;
      }else s.gear.slots[def.slot]=def.id;
      return okay(def.name+' equipaggiato.');
    }
    if(op==='unequip'){
      if(!isEquipped(s,def.id))return fail('Il pezzo non è equipaggiato.');
      if(def.legacy==='blade')s.workshop.weapon=null;
      else if(def.legacy==='relic')s.player.equipped=null;
      else s.gear.slots[def.slot]=null;
      return okay(def.name+' riposto.');
    }
    if(op==='repair'){
      const mode=data.mode==='kit'?'kit':data.mode==='npc'?'npc':svc.npc?'npc':'kit';
      const reason=repairReason(s,def,state,mode,svc);
      if(reason||!pay(s,repairCost(def,state,mode)))return fail(reason||'Costo di riparazione insufficiente.');
      state.current=def.durability;
      return event(def.name+' riparato.','repair',def.id);
    }
    if(['temper','ascend','enchant'].includes(op)){
      const reason=upgradeReason(s,def,state,op,svc);
      if(reason||!pay(s,upgradeCost(def,state,op)))return fail(reason||'Materiali insufficienti.');
      if(op==='temper')state.quality++;
      else if(op==='ascend')state.ascension++;
      else state.enchant=enchantBySlot[def.slot];
      const result=op==='temper'?qualities[state.quality]:op==='ascend'?'Ascensione '+state.ascension+'/2':enchantments[state.enchant].name;
      return event(def.name+' · '+result,op,def.id);
    }
    return fail('Operazione di equipaggiamento sconosciuta.');
  }

  function bodySlots(race){
    const shapes={
      fluid:['Catalizzatore','Membrana','Nucleo'],quadruped:['Presa o finimento','Protezione del dorso','Collare o sigillo'],
      winged:['Artiglio o catalizzatore','Giubba alare','Sigillo da volo'],swimming:['Presa o catalizzatore','Briglia di scaglie','Sigillo di marea'],
      limbed:['Arma','Armatura','Accessorio']
    };
    const families={fluid:['slime','spirit','secret','djinn','sylph','mimic'],
      quadruped:['wolf','fox','hare','terrapin','spider','chimera','scarabkin','mantis'],
      winged:['harpy','raven','phoenix','drake','wyvern'],swimming:['naga','triton','leviathan','salamander']};
    const shape=Object.keys(families).find(id=>families[id].includes(race))||'limbed';
    return shapes[shape];
  }
  function readiness(reason,fee){return {allowed:!reason,reason,cost:bill(fee)};}
  function view(s){
    if(!s?.gear)return null;
    const svc=service(s),slotLabels=bodySlots(s.player.race);
    const rows=[];
    for(const def of Object.values(defs)){
      const {id,name,rarity,slot,description,legacy,bound,icon,craft,durability}=def;
      const state=item(s,def),pack=inBag(s,id),deposit=qty(s,id,'deposit')>0n,acquired=!!state;
      if(legacy&&!acquired)continue;
      const equipped=isEquipped(s,id);
      const row={id,name,rarity:rarityById[rarity],slot,icon,description,bound:!!bound,legacy:!!legacy,
        owned:pack||deposit,acquired,pack,deposit,equipped,active:equipped&&pack&&state?.current>0,
        craft:craft?readiness(acquireReason(s,def,svc),craft):null,
        source:bound?'Ricompensa dal Custode originale di Nadir':legacy?'Equipaggiamento precedente':craft?craft.level+' · Fabbro':null};
      if(state){
        row.quality=qualities[state.quality];row.current=state.current;row.max=durability;row.broken=state.current===0;
        row.mastery=master(state.uses);row.uses=state.uses;row.masteryNext=masteryAt[row.mastery+1]??null;
        row.ascension=state.ascension;row.enchant=state.enchant?enchantments[state.enchant]:null;
        row.stats=itemBonus(def,state,true);
        if(pack){
          row.repairNPC=readiness(repairReason(s,def,state,'npc',svc),repairCost(def,state,'npc'));
          row.repairKit=readiness(repairReason(s,def,state,'kit',svc),repairCost(def,state,'kit'));
          row.upgrades=Object.fromEntries(['temper','ascend','enchant'].map(op=>[op,readiness(upgradeReason(s,def,state,op,svc),upgradeCost(def,state,op))]));
        }
      }else row.stats={...def.base};
      rows.push(row);
    }
    const top=bonus(s);
    return {slots:slotIds.map((id,i)=>({id,label:slotLabels[i],selected:selected(s,id)})),items:rows,rarities,
      location:svc.near?(svc.open?'Forgia di Vela':'Forgia chiusa · 07:00–20:00'):'Fuori dalla forgia',
      smithRank:svc.rank,stats:top,kits:Inventory.format(qty(s,kitId)),makeKit:readiness(atForge(svc)||(!affordable(s,kitRecipe)?'Materiali o Scintille insufficienti.':''),kitRecipe)};
  }

  window.Gear=Object.freeze({create,restore,install,view,command,bonus,strike,defend,awardDivine,activateLegacy,isManaged,isEquipped,owns,definition});
})();

