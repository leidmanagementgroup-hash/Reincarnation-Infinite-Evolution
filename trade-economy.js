/* Mercati regionali e banca comune. I prezzi sono espressi in Scintille. */
(() => {
  'use strict';

  const denominations=[
    {id:'astral',name:'Astrali',factor:1000000n},
    {id:'solar',name:'Solari',factor:10000n},
    {id:'lunar',name:'Lunari',factor:100n},
    {id:'spark',name:'Scintille',factor:1n}
  ];
  const denominationById=Object.fromEntries(denominations.map(item=>[item.id,item.factor]));
  const moneyLimit=1000000000n;
  const normalHours='07:00–20:00';
  const profiles=[
    ['vela','Mercato di Vela','valley',445,627,{
      herb:[12,3],ore:[6,6],seeds:[10,3],grain:[8,4],work:[8,5],wool:[5,7],potion:[6,8]
    }],
    ['filoni','Mercato dei Filoni','frost-pass',455,409,{
      herb:[5,6],ore:[16,3],seeds:[4,5],grain:[4,7],work:[13,4],wool:[10,5],potion:[5,10]
    }],
    ['velaris','Banchi di Velaris','verdant-canopy',455,409,{
      herb:[14,3],ore:[4,8],essence:[7,9],seeds:[6,4],grain:[5,6],work:[5,7],potion:[10,7]
    }],
    ['namar','Mercato di Namar','golden-savanna',455,409,{
      herb:[9,4],ore:[4,7],seeds:[13,2],grain:[16,3],work:[8,5],wool:[12,5],potion:[5,10]
    }],
    ['calis','Scalo di Calis','dune-port',455,409,{
      herb:[5,6],ore:[9,5],essence:[4,14],seeds:[5,5],grain:[8,5],work:[11,4],wool:[5,8],potion:[7,8]
    }]
  ].map(([id,name,region,x,y,goods],index)=>({id,name,region,x,y,goods,continent:'continent-'+(index+1),range:24}));
  for(const profile of profiles)Object.assign(profile.goods,{bread:[7,5],water:[8,3]});
  const marketBook=Object.fromEntries(profiles.map(profile=>[profile.id,profile]));
  const coreIds=new Set(profiles.map(profile=>profile.id));      // i cinque mercati storici: sempre presenti nei salvataggi
  const own=(value,id)=>value!==null&&value!==undefined&&Object.hasOwn(value,id);
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const canonical=value=>typeof value==='string'&&/^(0|[1-9][0-9]*)$/.test(value);
  const amountOf=value=>typeof value==='bigint'?(value>=0n?value:null):
    Number.isSafeInteger(value)&&value>=0?BigInt(value):canonical(value)?BigInt(value):null;
  const format=new Intl.NumberFormat('it-IT');
  const fail=text=>({ok:false,text});
  const done=(text,extra={})=>({ok:true,changed:true,text,...extra});
  const minBig=(a,b)=>a<b?a:b;
  const shopNear=(s,p)=>s.region===p.region&&Math.hypot(s.player.x-p.x,s.player.y-p.y)<=p.range||
    p.id==='velaris'&&!!window.UrbanWorld?.kind(s.region)&&!!UrbanWorld.access(s,'shop')||
    p.id===window.UrbanDistricts?.profileFor(s.region)?.market&&!!window.UrbanWorld?.access(s,'shop');
  const clock=s=>window.Calendar?.view(s.calendar,s.time,s.region)||
    {day:1+Math.floor((480+s.time*3)/1440),shopOpen:Math.floor(480+s.time*3)%1440>=420&&Math.floor(480+s.time*3)%1440<1200,seasonIndex:0};

  function wallet(gold){
    const count=amountOf(gold)??0n;
    let change=count;
    const coins=denominations.map(({id,name,factor})=>{
      const units=change/factor;
      change%=factor;
      return {id,name,quantity:String(units),formatted:format.format(units)};
    });
    const visible=coins.filter(coin=>coin.quantity!=='0');
    const label=visible.length?visible.map(coin=>coin.formatted+' '+coin.name).join(' · '):'0 Scintille';
    return {total:String(count),totalFormatted:format.format(count),label,coins};
  }
  function initialMarket(profile,seed){
    const offset=(Math.imul(Number(seed)>>>0,125269)>>>0)%3;
    return {day:1,stock:Object.fromEntries(Object.entries(profile.goods).map(([id,[target]])=>[id,String(Math.max(1,target-2+offset))]))};
  }
  /* Flussi economici (market-flows.js): produzione, consumo, rotte e ricchezza. Sono facoltativi: senza il modulo
     o in un salvataggio che non li contiene si ricreano al giorno corrente, senza recuperi retroattivi. */
  function startFlows(seed,day,markets){
    return window.MarketFlows?MarketFlows.create(seed,day,profiles,markets):undefined;
  }
  function create(seed=0){
    const markets=Object.fromEntries(profiles.map(profile=>[profile.id,initialMarket(profile,seed)]));
    return {schema:1,balance:'0',markets,flows:startFlows(seed,1,markets)};
  }
  function restore(raw,seed,s){
    if(raw===undefined)return create(seed);
    if(!object(raw)||raw.schema!==1||!canonical(raw.balance)||!object(raw.markets)||[...coreIds].some(id=>!own(raw.markets,id)))return null;
    const markets={};
    for(const profile of profiles){
      // ECO-002: un mercato registrato dopo il salvataggio (nuova città) nasce con le sue scorte iniziali
      if(!own(raw.markets,profile.id)&&!coreIds.has(profile.id)){markets[profile.id]=initialMarket(profile,seed);continue;}
      const where=raw.markets[profile.id];
      if(!object(where)||!Number.isSafeInteger(where.day)||where.day<1||where.day>1e9||!object(where.stock))return null;
      const stock=Object.create(null);
      for(const [id,count] of Object.entries(where.stock)){
        if(!/^[a-z][a-z0-9._:-]{0,95}$/i.test(id)||['constructor','prototype','__proto__'].includes(id)||!canonical(count))return null;
        const item=s?Inventory.definition(s,id):Inventory.catalog[id];
        if(s&&item?.id!==id||item?.quest&&count!=='0')return null;
        if(count!=='0')stock[id]=count;
      }
      markets[profile.id]={day:where.day,stock};
    }
    const day=s?clock(s).day:1;
    let flows=window.MarketFlows?(MarketFlows.restore(raw.flows,seed,day,profiles,markets)||startFlows(seed,day,markets)):undefined;
    if(flows&&MarketFlows.audit(flows,profiles,markets).length)MarketFlows.rebase(flows,profiles,markets);
    // mercati salvati ma non (ancora) registrati: restano da parte e si riattivano con `register`
    const dormant={};
    for(const source of [raw.markets,raw.dormant])if(object(source))for(const [id,value] of Object.entries(source)){
      if(!own(marketBook,id)&&/^[a-z][a-z0-9-]{0,31}$/.test(id)&&object(value)&&Number.isSafeInteger(value.day)&&object(value.stock)&&Object.keys(dormant).length<200)dormant[id]=value;
    }
    const result={schema:1,balance:raw.balance,markets,flows};
    if(Object.keys(dormant).length)result.dormant=dormant;
    return result;
  }
  /* LW-ECO-03 (Living World 2.0): i manufatti che non fanno parte del profilo del mercato (lame, piatti, attrezzi venduti dal
     giocatore) trovano compratori fra gli abitanti, una unità al giorno per merce. Le merci del profilo seguono le loro regole. */
  function consumeCrafted(stock,profile,elapsed){
    if(elapsed<=0n)return;
    for(const id of Object.keys(stock)){
      if(own(profile.goods,id))continue;
      const count=BigInt(stock[id]),left=count-minBig(count,elapsed);
      if(left>0n)stock[id]=String(left);else delete stock[id];
    }
  }
  function restocked(market,profile,day){
    if(day<=market.day)return market;
    const elapsed=BigInt(day-market.day),stock={...market.stock};
    consumeCrafted(stock,profile,elapsed);
    for(const [id,[goal]] of Object.entries(profile.goods)){
      const count=BigInt(stock[id]||'0'),target=BigInt(goal);
      if(count<target)stock[id]=String(count+minBig(target-count,elapsed*2n));
      else if(count>target)stock[id]=String(count-minBig(count-target,elapsed));
    }
    return {day,stock};
  }
  /* Con i flussi attivi le scorte cambiano solo per produzione, consumo, rotte e scambi: il vecchio
     riassortimento verso l'obiettivo fisso non si applica più. */
  function sync(s,day=clock(s).day){
    const flows=s.economy?.flows;
    if(!flows||!window.MarketFlows||day<=flows.day)return;
    const elapsed=BigInt(day-flows.day);
    MarketFlows.advance(flows,profiles,s.economy.markets,day);
    for(const profile of profiles)consumeCrafted(s.economy.markets[profile.id].stock,profile,elapsed);
    for(const profile of profiles)s.economy.markets[profile.id].day=Math.max(s.economy.markets[profile.id].day,day);
  }
  /* ECO-002: registra un nuovo mercato (città generata) a partire da una descrizione per `MarketFlows.settlementProfile`:
     {id,name,region,continent,x,y,size,focus,seed,world?}. Va chiamato a ogni avvio con le stesse descrizioni, per esempio
     dal generatore urbano, prima o dopo il caricamento. Con `s` il mercato entra subito nella partita aperta. */
  function register(spec,s){
    if(!window.MarketFlows||!object(spec)||typeof spec.id!=='string'||!/^[a-z][a-z0-9-]{0,31}$/.test(spec.id)||own(marketBook,spec.id))return null;
    let profile;
    try{profile=MarketFlows.settlementProfile(spec);}catch(error){return null;}
    if(!profile||typeof spec.region!=='string')return null;
    profile.region=spec.region;profile.continent=spec.continent||null;profile.x=Number(spec.x)||0;profile.y=Number(spec.y)||0;
    profile.range=Number(spec.range)||24;
    for(const [id,value] of Object.entries({bread:[7,5],water:[8,3]}))if(!own(profile.goods,id))profile.goods[id]=value;
    profiles.push(profile);marketBook[profile.id]=profile;
    if(s?.economy)adopt(s,profile);
    return profile;
  }
  function adopt(s,profile){
    const economy=s.economy;
    if(!own(economy.markets,profile.id)){
      const saved=economy.dormant&&own(economy.dormant,profile.id)?economy.dormant[profile.id]:null;
      if(saved){
        economy.markets[profile.id]={day:Math.max(1,saved.day|0),stock:Object.fromEntries(Object.entries(saved.stock).filter(([id,n])=>canonical(n)&&n!=='0'))};
        delete economy.dormant[profile.id];if(!Object.keys(economy.dormant).length)delete economy.dormant;
      }else economy.markets[profile.id]=initialMarket(profile,s.seed);
    }
    if(economy.flows&&window.MarketFlows){
      const raw=JSON.parse(JSON.stringify(economy.flows));
      economy.flows=MarketFlows.restore(raw,raw.seed,raw.day,profiles,economy.markets)||economy.flows;
      if(MarketFlows.audit(economy.flows,profiles,economy.markets).length)MarketFlows.rebase(economy.flows,profiles,economy.markets);
    }
  }
  function fresh(s,market,profile,day){
    if(!s.economy.flows)return restocked(market,profile,day);
    sync(s,day);
    return s.economy.markets[profile.id];
  }
  function tick(s){
    if(!s?.economy)return;
    const day=clock(s).day;
    if(s.economy.flows){sync(s,day);return;}
    for(const profile of profiles){
      const old=s.economy.markets[profile.id];
      if(day>old.day)s.economy.markets[profile.id]=restocked(old,profile,day);
    }
  }

  function actualMarket(s){
    const continent=window.World?.regions?.[s.region]?.continent;
    return profiles.find(profile=>profile.continent===continent)||profiles[0];
  }
  function info(s,profile,c=clock(s)){
    return {id:profile.id,name:profile.name,region:profile.region,
      regionName:window.World?.regions?.[profile.region]?.name||profile.region,
      continent:profile.continent,x:profile.x,y:profile.y,hours:normalHours,
      near:shopNear(s,profile),open:c.shopOpen,available:c.shopOpen&&shopNear(s,profile),day:c.day};
  }
  function stockAt(where,id){return own(where.stock,id)?BigInt(where.stock[id]):0n;}
  function shortage(s,marketId,id){
    const profile=marketBook[marketId],goal=profile?.goods[id]?.[0],market=s.economy?.markets[marketId];
    if(!goal||!market)return 0;
    const supplied=stockAt(fresh(s,market,profile,clock(s).day),id);
    return supplied<BigInt(goal)?1-Number(supplied)/goal:0;
  }
  function updateStock(where,id,qty){
    if(qty===0n)delete where.stock[id];
    else where.stock[id]=String(qty);
  }
  function supplyVelarisMarket(s,id,quantity){
    const profile=marketBook.velaris,market=s.economy?.markets[profile.id];
    if(!market||quantity<=0n||!own(profile.goods,id))return 0n;
    const where=fresh(s,market,profile,clock(s).day),stock=stockAt(where,id);
    const capacity=BigInt(profile.goods[id][0]+2);
    if(stock>=capacity)return 0n;
    const delivered=minBig(quantity,capacity-stock);
    updateStock(where,id,stock+delivered);
    s.economy.markets[profile.id]=where;
    if(s.economy.flows)MarketFlows.external(s.economy.flows,profile.id,id,delivered);
    return delivered;
  }
  function tradeAllowed(s,item){
    return !!item&&!item.quest&&!window.Gear?.isEquipped(s,item.id)&&s.player.equipped!==item.id&&s.player.tool!==item.id&&
      s.player.equippedTool!==item.id&&s.trades?.tool!==item.id&&s.workshop?.weapon!==item.id&&s.workshop?.weapon?.id!==item.id;
  }
  function price(s,profile,where,item,c){
    const prices={weapons:20,armor:18,materials:6,food:7,ingredients:4,tools:14,magic:11,quests:0};
    const [target,native]=profile.goods[item.id]||[6,prices[item.category]||5];
    const stock=stockAt(where,item.id);
    const flows=s.economy?.flows&&window.MarketFlows?s.economy.flows:null;
    // Con i flussi attivi la scarsità e la ricchezza del mercato scalano il prezzo di base; altrimenti vale la fascia di ±1.
    const scaled=flows?Math.max(1,Math.round(native*MarketFlows.multiplier(flows,profile,item.id,stock)/1000)):native;
    const scarcity=flows?0:stock<=BigInt(Math.floor(target/3))?1:stock>=BigInt(target)?-1:0;
    const quality=item.quality===null?0:typeof item.quality==='number'?Math.max(0,Math.min(6,item.quality|0)):
      /eccellente|pregiat|magistr|legend/i.test(item.quality||'')?2:
      /perfett/i.test(item.quality||'')?3:/ottim/i.test(item.quality||'')?2:/buon/i.test(item.quality||'')?1:0; // Living World 2.0 (LW-ECO-04)
    const winter=c.seasonId==='winter'||c.seasonIndex===3;
    const season=winter&&['food','ingredients','materials'].includes(item.category)?1:0;
    const favor=window.Reputation?.discount(s,profile.region)||0;
    const mourning=window.Conflicts?.faction(s,profile.region).mourning?1:0;
    const buy=Math.max(2,scaled+scarcity+quality+season-favor+mourning);
    return {buy,sell:Math.max(1,Math.min(buy-1,Math.floor((scaled+quality+season)*.72)+scarcity))};
  }
  function listings(s,profile,c,where){
    const ids=new Set([...Object.keys(profile.goods),...Object.keys(where.stock),
      ...Object.keys(Inventory.catalog),...Object.keys(s.bag?.definitions||{})]);
    const rows=[];
    for(const id of ids){
      const item=Inventory.definition(s,id);
      if(!item||item.quest)continue;
      const stock=stockAt(where,id),owned=Inventory.quantity(s,id);
      if(!stock&&!owned&&!own(profile.goods,id))continue;
      const {buy,sell}=price(s,profile,where,item,c);
      rows.push({...item,stock:String(stock),formattedStock:format.format(stock),
        owned:String(owned),formattedOwned:format.format(owned),buy,sell,sellable:owned>0n&&tradeAllowed(s,item)});
    }
    return rows.sort((a,b)=>a.name.localeCompare(b.name,'it-IT'));
  }
  function view(s){
    if(!s?.economy)return null;
    const c=clock(s),profile=actualMarket(s),here=info(s,profile,c);
    const where=fresh(s,s.economy.markets[profile.id],profile,c.day);
    const money=wallet(s.economy.balance);
    return {
      wallet:wallet(s.player.gold),
      bank:{balance:money.total,formatted:money.totalFormatted,wallet:money,available:here.available,
        items:Inventory.view(s,{location:'deposit'})},
      market:{...here,rows:listings(s,profile,c,where)},
      markets:profiles.map(entry=>info(s,entry,c))
    };
  }
  function sites(s){
    if(!s?.economy)return [];
    const profile=profiles.find(market=>market.region===s.region);
    if(!profile)return [];
    return [{id:profile.id,kind:'economy',point:{x:profile.x,y:profile.y},range:profile.range,
      text:profile.name+' · Mercato e banca'}];
  }
  function use(s,id){
    const market=own(marketBook,id)?marketBook[id]:null;
    if(!market||!shopNear(s,market))return fail('Avvicinati al mercato.');
    if(clock(s).shopOpen)window.Careers?.note(s,market.id);
    return {ok:true,panel:'economy'};
  }
  function bank(s,data){
    if(data.currency!==undefined&&!own(denominationById,data.currency))return fail('Seleziona una moneta valida.');
    const quantity=amountOf(data.amount??1);
    if(quantity===null||quantity===0n)return fail('Inserisci una quantità intera positiva.');
    const count=quantity*(denominationById[data.currency||'spark']||1n);
    const carried=amountOf(s.player.gold),balance=BigInt(s.economy.balance);
    if(carried===null)return fail('Il borsello richiede un valore intero valido.');
    if(data.op==='bankDeposit'){
      if(count>carried)return fail('Fondi insufficienti nel borsello.');
      s.player.gold=Number(carried-count);
      s.economy.balance=String(balance+count);
      return done('Versato · '+wallet(count).label);
    }
    if(count>balance)return fail('Fondi insufficienti in banca.');
    if(carried+count>moneyLimit)return fail('Preleva una somma minore. Puoi conservare il resto in banca.');
    s.player.gold=Number(carried+count);
    s.economy.balance=String(balance-count);
    return done('Prelevato · '+wallet(count).label);
  }
  /* LW-ECO-01 (Living World 2.0): ogni unità di un lotto costa o rende il prezzo della scorta in quel momento, come se si
     scambiasse una unità alla volta. Prima l'intero lotto usava il prezzo della scorta di partenza, e vendere un lotto per
     ricomprarlo subito rendeva Scintille a ogni ciclo. Oltre il doppio della scorta obiettivo il prezzo non cambia più
     (indice di scarsità al minimo): quel tratto si calcola in un solo passo, così anche quantità enormi costano O(obiettivo). */
  function lotPrice(s,profile,where,item,c,stock,quantity,buying){
    const key=buying?'buy':'sell',target=BigInt(own(profile.goods,item.id)?profile.goods[item.id][0]:6),flat=target*2n+1n;
    const at=n=>price(s,profile,{day:where.day,stock:{[item.id]:String(n)}},item,c)[key];
    let total=0n,left=quantity,level=stock,first=null,last=null;
    while(left>0n){
      // Ogni unità si paga alla scorta prima dello scambio; nel tratto piatto il prezzo è lo stesso per tutte.
      const run=buying?(level>flat?minBig(left,level-flat):0n):(level>=flat?left:0n);
      const n=run>0n?run:1n,unit=at(level);
      total+=BigInt(unit)*n;first??=unit;last=unit;
      left-=n;level=buying?level-n:level+n;
    }
    return {total,first,last};
  }
  function trade(s,profile,c,data){
    const id=data.id==='potions'?'potion':data.id;
    const quantity=amountOf(data.amount??1),item=Inventory.definition(s,id),carried=amountOf(s.player.gold);
    if(!item||item.quest)return fail('Oggetto non commerciabile.');
    if(quantity===null||quantity===0n||carried===null)return fail('Inserisci una quantità intera positiva.');
    const where=fresh(s,s.economy.markets[profile.id],profile,c.day),stock=stockAt(where,id);
    const buying=data.op==='buy';
    if(!buying){
      // LW-ECO-02: come Economy.deliver, il mercato accoglie merce solo fino alla capacità del magazzino.
      const room=capacityFor(profile,id,s.economy.flows)-stock;
      if(quantity>room)return fail(room>0n?'Il mercato può accogliere ancora '+format.format(room)+' unità di '+item.name+'.':'Il magazzino del mercato è pieno per '+item.name+'.');
    }
    if(buying&&stock<quantity)return fail('Scorte insufficienti.');
    const lot=lotPrice(s,profile,where,item,c,stock,quantity,buying),priceTotal=lot.total;
    if(buying){
      if(carried<priceTotal)return fail('Fondi insufficienti nel borsello.');
      if(!Inventory.add(s,id,quantity))return fail('Non è stato possibile aggiungere l’oggetto.');
      s.player.gold=Number(carried-priceTotal);
      updateStock(where,id,stock-quantity);
    }else{
      if(!tradeAllowed(s,item))return fail('Gli oggetti equipaggiati devono prima essere rimossi.');
      if(carried+priceTotal>moneyLimit)return fail('Versa parte del borsello in banca prima di questa vendita.');
      if(!Inventory.take(s,id,quantity))return fail('Quantità posseduta insufficiente.');
      s.player.gold=Number(carried+priceTotal);
      updateStock(where,id,stock+quantity);
    }
    s.economy.markets[profile.id]=where;
    if(s.economy.flows)MarketFlows.external(s.economy.flows,profile.id,id,buying?-quantity:quantity);
    window.Careers?.note(s,profile.id);
    return done(item.name+' ×'+format.format(quantity)+' · '+(buying?'Pagato ':'Ricevuto ')+wallet(priceTotal).label+
      (lot.first!==lot.last?' (da '+lot.first+' a '+lot.last+' per unità)':''),
      {event:{id:'trade',amount:1,meta:{market:profile.id,item:id,direction:data.op,quantity:String(quantity)}}});
  }
  function command(s,data){
    if(!s?.economy||!object(data))return fail('Operazione non disponibile.');
    const profile=actualMarket(s);
    if(!shopNear(s,profile))return fail('Raggiungi '+profile.name+' per completare l’operazione.');
    const c=clock(s);
    if(!c.shopOpen)return fail(profile.name+' è chiuso. Orario '+normalHours+'.');
    switch(data.op){
      case 'buy':case 'sell':return trade(s,profile,c,data);
      case 'armoryOrder':case 'cargoContract':return window.Careers?Careers.command(s,profile.id,data):fail('Operazione non disponibile.');
      case 'bankDeposit':case 'bankWithdraw':return bank(s,data);
      case 'itemDeposit':case 'itemWithdraw':
        return Inventory.command(s,{...data,op:data.op==='itemDeposit'?'deposit':'withdraw'});
      default:return fail('Operazione sconosciuta.');
    }
  }
  function actors(s){
    return sites(s).map(({point})=>({x:point.x,y:point.y,draw(ctx){
      const x=point.x,y=point.y;
      ctx.save();
      ctx.fillStyle='#222f2d';ctx.fillRect(x-10,y-3,20,4);
      ctx.fillStyle='#533c32';ctx.fillRect(x-7,y-10,14,9);ctx.fillRect(x-9,y-23,2,18);ctx.fillRect(x+7,y-23,2,18);
      ctx.fillStyle='#b88754';ctx.fillRect(x-9,y-10,18,3);
      ctx.fillStyle='#8a413e';ctx.fillRect(x-10,y-24,20,5);
      ctx.fillStyle='#d69266';ctx.fillRect(x-9,y-24,3,5);ctx.fillRect(x-1,y-24,3,5);ctx.fillRect(x+6,y-24,3,5);
      ctx.fillStyle='#e1bd74';ctx.fillRect(x-2,y-6,4,3);ctx.fillRect(x-1,y-7,2,5);
      ctx.restore();
    }}));
  }

  /* Rapporto di sola lettura sui flussi: prezzi, ricchezza, merci in viaggio e lavoratori per mercato. */
  function flowReport(s){
    const flows=s?.economy?.flows;
    if(!flows||!window.MarketFlows)return null;
    sync(s);
    return {day:flows.day,markets:MarketFlows.report(flows,profiles,s.economy.markets),transit:MarketFlows.inTransit(flows),
      work:Object.fromEntries(profiles.map(p=>[p.id,MarketFlows.activity(p,s.economy.markets[p.id].stock)])),
      outlook:Object.fromEntries(profiles.map(p=>[p.id,MarketFlows.outlook(p,s.economy.markets[p.id].stock,flows.wealth[p.id])])),
      routes:MarketFlows.routesFor(profiles),
      audit:MarketFlows.audit(flows,profiles,s.economy.markets)};
  }

  /* ---- API per sistemi futuri (negozi e attività del giocatore, NPC mercanti): nessuna interfaccia, nessun effetto
     sul denaro. Tutte le merci che entrano o escono dai mercati passano dal registro dei flussi come flussi esterni. ---- */
  const goodId=id=>id==='potions'?'potion':id;
  const capacityFor=(profile,id,flows)=>BigInt(flows&&window.MarketFlows?MarketFlows.capacity(profile,id):(own(profile.goods,id)?profile.goods[id][0]:6)+2);
  /* Quotazione di una merce in un mercato (anche lontano dal giocatore). `stock` facoltativo: ipotizza una scorta diversa. */
  function quote(s,marketId,id,stock){
    const profile=own(marketBook,marketId)?marketBook[marketId]:null,key=goodId(id);
    const item=profile&&s?.economy&&Inventory.definition(s,key);
    if(!item||item.quest)return null;
    const c=clock(s),have=stock===undefined?stockAt(fresh(s,s.economy.markets[profile.id],profile,c.day),item.id):amountOf(stock);
    if(have===null)return null;
    const {buy,sell}=price(s,profile,{day:c.day,stock:{[item.id]:String(have)}},item,c);
    const target=own(profile.goods,item.id)?profile.goods[item.id][0]:6;
    const flows=s.economy.flows&&window.MarketFlows?s.economy.flows:null;
    return {market:profile.id,id:item.id,stock:String(have),target,buy,sell,
      index:flows?MarketFlows.multiplier(flows,profile,item.id,have):1000,listed:own(profile.goods,item.id),
      capacity:String(capacityFor(profile,item.id,flows))};
  }
  /* Un negozio, un mercante o un residente porta merci al mercato. Restituisce la quantità accettata (BigInt),
     limitata dalla capacità del magazzino: nulla viene creato oltre quanto dichiarato. */
  function deliver(s,marketId,id,quantity){
    const profile=own(marketBook,marketId)?marketBook[marketId]:null,key=goodId(id),qty=amountOf(quantity);
    const item=profile&&s?.economy&&Inventory.definition(s,key);
    if(!item||item.quest||qty===null||qty===0n)return 0n;
    const c=clock(s),where=fresh(s,s.economy.markets[profile.id],profile,c.day),stock=stockAt(where,item.id);
    const room=capacityFor(profile,item.id,s.economy.flows)-stock;
    if(room<=0n)return 0n;
    const moved=minBig(qty,room);
    updateStock(where,item.id,stock+moved);
    s.economy.markets[profile.id]=where;
    if(s.economy.flows)MarketFlows.external(s.economy.flows,profile.id,item.id,moved);
    return moved;
  }
  /* Un negozio o un mercante preleva merci dal mercato. Restituisce la quantità effettivamente prelevata (BigInt). */
  function procure(s,marketId,id,quantity){
    const profile=own(marketBook,marketId)?marketBook[marketId]:null,key=goodId(id),qty=amountOf(quantity);
    const item=profile&&s?.economy&&Inventory.definition(s,key);
    if(!item||item.quest||qty===null||qty===0n)return 0n;
    const c=clock(s),where=fresh(s,s.economy.markets[profile.id],profile,c.day),stock=stockAt(where,item.id);
    const moved=minBig(qty,stock);
    if(moved===0n)return 0n;
    updateStock(where,item.id,stock-moved);
    s.economy.markets[profile.id]=where;
    if(s.economy.flows)MarketFlows.external(s.economy.flows,profile.id,item.id,-moved);
    return moved;
  }

  window.Economy={register,create,restore,wallet,view,command,tick,sites,use,actors,shortage,supplyVelarisMarket,flowReport,profiles,quote,deliver,procure,tradeAllowed};
})();

