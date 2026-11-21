/* Magazzino esatto. Le quantità sono decimali in JSON e interi BigInt nei calcoli. */
(() => {
  'use strict';

  const categories=Object.freeze([
    {id:'weapons',name:'Armi'}, {id:'armor',name:'Armature'}, {id:'materials',name:'Materiali'},
    {id:'food',name:'Cibo'}, {id:'ingredients',name:'Ingredienti'}, {id:'tools',name:'Strumenti'},
    {id:'magic',name:'Oggetti magici'}, {id:'quests',name:'Oggetti di missione'}
  ].map(Object.freeze));
  const categoryIds=new Set(categories.map(item=>item.id));
  const categoryNames=Object.fromEntries(categories.map(({id,name})=>[id,name]));

  const items=[
    {id:'herb',name:'Erba di rugiada',category:'ingredients',icon:'herb',description:'Erba usata per distillare pozioni e completare la commissione di Ivo.'},
    {id:'ore',name:'Minerale lucente',category:'materials',icon:'ore',description:'Minerale utile per la bottega e le costruzioni.'},
    {id:'essence',name:'Essenza',category:'magic',icon:'shard',description:'Alimenta evoluzioni e fusioni.'},
    {id:'charm',name:'Talismano di Vela',category:'armor',icon:'ward',description:'Attacco +3, difesa +1.',equippable:true},
    {id:'crown',name:'Corona di Orveth',category:'armor',icon:'core',description:'Attacco +5, difesa +3.',equippable:true,quest:true},
    {id:'gauntlet',name:'Guanto di Kharun',category:'weapons',icon:'ward',description:'Attacco +8, difesa +4.',equippable:true,quest:true},
    {id:'prism',name:'Prisma di Syrava',category:'magic',icon:'shard',description:'Attacco +10, difesa +5.',equippable:true,quest:true},
    {id:'heart',name:'Cuore del Varco',category:'quests',icon:'core',description:'Attacco +13, difesa +7.',equippable:true,quest:true},
    {id:'potion',name:'Pozione di linfa',category:'magic',icon:'potion',description:'Recupera vitalità. Premi Q durante l’esplorazione.'},
    {id:'seeds',name:'Sementi',category:'ingredients',icon:'herb',description:'Da piantare nell’orto e nelle fattorie.'},
    {id:'grain',name:'Grano',category:'ingredients',icon:'herb',description:'Per le lanose, la cucina o il commercio.'},
    {id:'work',name:'Trave di legno',category:'materials',icon:'ore',description:'Materiale per costruire e riparare.'},
    {id:'wool',name:'Lana',category:'materials',icon:'ore',description:'Fibra raccolta nel recinto delle lanose.'}
  ];
  const catalog=Object.freeze(Object.fromEntries(items.map(item=>[item.id,Object.freeze(item)])));

  // La proiezione numerica alimenta i comandi preesistenti. L'eccedenza rimane
  // esatta nel magazzino, senza doppio conteggio e senza limitare la quantità.
  const projectionMax=50000000n;
  const projectionLimit=Number(projectionMax);
  const legacy={
    ...Object.fromEntries(['herb','ore','essence','charm','crown','gauntlet','prism','heart'].map(id=>[id,['player','inventory',id]])),
    potion:['player','potions'],
    ...Object.fromEntries(['seeds','grain','work','wool'].map(id=>[id,['life','supplies',id]]))
  };
  const own=(object,key)=>object!==undefined&&object!==null&&Object.hasOwn(object,key);
  const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const dict=()=>Object.create(null);
  const ids=/^[a-z][a-z0-9._:-]{0,95}$/i;
  const forbidden=new Set(['constructor','prototype','__proto__']);
  const representable=id=>typeof id==='string'&&ids.test(id)&&!forbidden.has(id);
  const decimal=text=>typeof text==='string'&&/^(0|[1-9][0-9]*)$/.test(text);
  const decode=value=>typeof value==='bigint' ? (value>=0n?value:null) :
    Number.isSafeInteger(value)&&value>=0 ? BigInt(value) : decimal(value) ? BigInt(value) : null;
  const locationOf=location=>['deposit','storage','stash'].includes(location)?'deposit':'pack';
  const keyOf=id=>id==='potions'?'potion':id;
  const textValue=(value,size)=>typeof value==='string'&&value.trim().length>0&&value.length<=size;
  const formatNumber=new Intl.NumberFormat('it-IT',{useGrouping:true});
  const collator=new Intl.Collator('it-IT',{sensitivity:'base',numeric:true});

  function create(){
    return {schema:1,stock:dict(),deposit:dict(),definitions:dict()};
  }
  function ensure(s){
    if(!s.bag)s.bag=create();
    return s.bag;
  }
  function definition(s,id){
    id=keyOf(id);
    if(own(catalog,id))return catalog[id];
    if(own(s.bag?.definitions,id))return s.bag.definitions[id];
    return null;
  }
  function projection(s,id){
    if(!own(legacy,id))return null;
    const path=legacy[id],key=path.at(-1);
    const owner=path.slice(0,-1).reduce((value,name)=>value?.[name],s);
    return owner&&typeof owner==='object'?{owner,key}:null;
  }
  function projected(s,id){
    const entry=projection(s,id);
    if(!entry)return 0n;
    const value=entry.owner[entry.key];
    return Number.isSafeInteger(value)&&value>=0?BigInt(value):0n;
  }
  function stored(s,id,location){
    const target=locationOf(location)==='deposit'?s.bag?.deposit:s.bag?.stock;
    return own(target,id)?BigInt(target[id]):0n;
  }
  function quantity(s,id,location='pack'){
    if(!s)return 0n;
    id=keyOf(id);
    if(!definition(s,id))return 0n;
    const amount=stored(s,id,location);
    return locationOf(location)==='deposit'?amount:amount+projected(s,id);
  }
  function setStack(target,id,value){
    if(value>0n)target[id]=String(value);
    else delete target[id];
  }
  function setAmount(s,id,value,location){
    const bag=ensure(s);
    if(locationOf(location)==='deposit'){
      setStack(bag.deposit,id,value);
      return;
    }
    const entry=projection(s,id);
    if(!entry){
      setStack(bag.stock,id,value);
      return;
    }
    const visible=value<projectionMax?value:projectionMax;
    entry.owner[entry.key]=Number(visible);
    setStack(bag.stock,id,value-visible);
  }
  function sync(s){
    if(!s)return null;
    const bag=ensure(s);
    for(const id of Object.keys(legacy)){
      const entry=projection(s,id);
      if(!entry)continue;
      const count=entry.owner[entry.key];
      if(count===projectionLimit||!own(bag.stock,id)&&count<=projectionLimit)continue;
      setAmount(s,id,quantity(s,id),'pack');
    }
    return bag;
  }
  function add(s,id,amount,location='pack'){
    id=keyOf(id);
    const count=decode(amount);
    if(!s||!definition(s,id)||count===null)return false;
    if(count)setAmount(s,id,quantity(s,id,location)+count,location);
    return true;
  }
  function take(s,id,amount,location='pack'){
    id=keyOf(id);
    const count=decode(amount);
    if(!s||!definition(s,id)||count===null)return false;
    const have=quantity(s,id,location);
    if(count>have)return false;
    if(count)setAmount(s,id,have-count,location);
    return true;
  }

  function scalar(value){
    return typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)||
      typeof value==='string'&&value.length<=300;
  }
  function copyEffects(value){
    if(value===undefined||value===null)return {};
    if(scalar(value))return value;
    if(Array.isArray(value)){
      if(value.length>24)return null;
      const result=value.map(copyEffectsObject);
      return result.includes(null)?null:result;
    }
    return copyEffectsObject(value);
  }
  function copyEffectsObject(value){
    if(!plain(value))return null;
    const inputs=Object.entries(value);
    if(inputs.length>24||inputs.some(([key,data])=>!representable(key)||!scalar(data)))return null;
    return Object.fromEntries(inputs);
  }
  function copyDefinition(item){
    if(!plain(item)||!representable(item.id)||!textValue(item.name,90)||!categoryIds.has(item.category))return null;
    const result={id:item.id,name:item.name.trim(),category:item.category};
    for(const [key,size] of [['description',400],['icon',32],['rarity',32],['tool',32],['type',32],['region',60],['recipe',90]]){
      if(item[key]===undefined)continue;
      if(typeof item[key]!=='string'||item[key].length>size)return null;
      result[key]=item[key];
    }
    if(item.quality!==undefined){
      if(!((typeof item.quality==='number'&&Number.isFinite(item.quality))||textValue(item.quality,32)))return null;
      result.quality=item.quality;
    }
    for(const key of ['equippable','quest','edible']){
      if(item[key]===undefined)continue;
      if(typeof item[key]!=='boolean')return null;
      result[key]=item[key];
    }
    const effects=copyEffects(item.effects??item.effect);
    if(effects===null)return null;
    result.effects=effects;
    return result;
  }
  function equivalent(a,b){
    if(a===b)return true;
    if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
    return Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(id=>own(b,id)&&equivalent(a[id],b[id]));
  }
  function define(s,item){
    if(!s)return false;
    const entry=copyDefinition(item);
    if(!entry||own(catalog,keyOf(entry.id))||entry.id==='potions')return false;
    const bag=ensure(s),old=bag.definitions[entry.id];
    if(old)return equivalent(old,entry);
    bag.definitions[entry.id]=entry;
    return true;
  }
  function restore(raw,seed,s){
    if(raw===undefined)return create();
    if(!plain(raw)||raw.schema!==1||!plain(raw.stock)||!plain(raw.deposit)||!plain(raw.definitions))return null;
    const restored=create();
    for(const [id,meta] of Object.entries(raw.definitions)){
      const item=copyDefinition(meta);
      if(!item||id!==item.id||own(catalog,keyOf(id)))return null;
      restored.definitions[id]=item;
    }
    for(const field of ['stock','deposit']){
      for(const [id,amount] of Object.entries(raw[field])){
        const item=own(catalog,id)?catalog[id]:restored.definitions[id];
        if(!item||!decimal(amount)||field==='deposit'&&item.quest)return null;
        if(amount!=='0')restored[field][id]=amount;
      }
    }
    return restored;
  }

  function canDeposit(s,item){
    return !item.quest&&s.player?.equipped!==item.id&&s.player?.tool!==item.id&&s.workshop?.weapon!==item.id&&s.workshop?.weapon?.id!==item.id&&
      !Object.values(s.gear?.slots||{}).includes(item.id);
  }
  function command(s,data){
    if(!s||!plain(data)||!['deposit','withdraw'].includes(data.op))return {ok:false,text:'Operazione del deposito sconosciuta.'};
    const id=keyOf(data.id),item=definition(s,id),amount=decode(data.amount??1);
    if(!item||amount===null||amount===0n)return {ok:false,text:'Scegli un oggetto e una quantità intera positiva.'};
    const from=data.op==='deposit'?'pack':'deposit',to=from==='pack'?'deposit':'pack';
    if(from==='pack'&&!canDeposit(s,item))return {ok:false,text:'Questo oggetto di missione o equipaggiato resta con te.'};
    const current=quantity(s,id,from);
    if(current<amount)return {ok:false,text:'Quantità insufficiente.'};
    const destination=quantity(s,id,to);
    setAmount(s,id,current-amount,from);
    setAmount(s,id,destination+amount,to);
    return {ok:true,changed:true,text:item.name+' ×'+format(amount)+(to==='deposit'?' · Depositato.':' · Prelevato.')};
  }
  function format(value){
    const qty=decode(value);
    return qty===null?'0':formatNumber.format(qty);
  }

  const rarityOrder=new Map(['comune','non comune','raro rara','epico epica','leggendario leggendaria','mitico mitica']
    .flatMap((names,index)=>(index===1?[names]:names.split(' ')).map(name=>[name,index+1])));
  const qualityOrder=new Map(['Scadente','Semplice','Comune','Normale','Buona','Ottima','Eccellente','Pregiata','Magistrale','Leggendaria'].map((name,index)=>[name.toLowerCase(),index+1]));
  for(const [quality,rank] of Object.entries({scarso:1,buono:5,ottimo:6,perfetto:10}))qualityOrder.set(quality,rank);
  const grade=(value,ordering)=>typeof value==='number'?value:ordering.get(String(value).toLowerCase())||0;
  const search=value=>String(value??'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('it-IT').trim();

  function view(s,{query='',category='',sort='name',location='pack'}={}){
    const at=locationOf(location),filter=categoryIds.has(category)?category:'',term=search(query);
    let total=0n,shownTotal=0n,distinct=0;
    const rows=[],counts=dict();
    if(s){
      for(const id of [...Object.keys(catalog),...Object.keys(s.bag?.definitions||{})]){
        const item=definition(s,id),amount=quantity(s,id,at);
        if(amount===0n)continue;
        total+=amount;
        distinct++;
        counts[item.category]=(counts[item.category]||0)+1;
        if(filter&&item.category!==filter)continue;
        if(term&&!search([item.name,item.description,item.id].join(' ')).includes(term))continue;
        shownTotal+=amount;
        rows.push({item,amount});
      }
    }
    const byName=(a,b)=>collator.compare(a.item.name,b.item.name)||collator.compare(a.item.id,b.item.id);
    const byQuantity=(a,b)=>a.amount===b.amount?byName(a,b):a.amount>b.amount?-1:1;
    const comparators={
      name:byName,'name-desc':(a,b)=>byName(b,a),quantity:byQuantity,amount:byQuantity,
      'quantity-asc':(a,b)=>a.amount===b.amount?byName(a,b):a.amount<b.amount?-1:1,
      category:(a,b)=>collator.compare(categoryNames[a.item.category],categoryNames[b.item.category])||byName(a,b),
      quality:(a,b)=>grade(b.item.quality,qualityOrder)-grade(a.item.quality,qualityOrder)||byName(a,b),
      rarity:(a,b)=>grade(b.item.rarity,rarityOrder)-grade(a.item.rarity,rarityOrder)||byName(a,b)
    };
    rows.sort(own(comparators,sort)?comparators[sort]:byName);
    const visible=rows.map(({item,amount})=>({
      ...item,description:item.description||'',icon:item.icon||'shard',quality:item.quality??null,
      rarity:item.rarity||'Comune',effects:item.effects??{},quantity:String(amount),formatted:format(amount),
      depositable:at==='pack'&&canDeposit(s,item)
    }));
    return {items:visible,categories:categories.map(item=>({...item,count:counts[item.id]||0})),
      total:String(total),totalFormatted:format(total),shownTotal:String(shownTotal),distinct,shown:visible.length,
      query:String(query??''),category:filter,sort,location:at};
  }

  window.Inventory={create,restore,sync,view,quantity,add,take,define,definition,command,format,categories,catalog};
})();

