(() => {
  'use strict';
  /* Economia viva (PERF-005, livelli 3–5, IN OMBRA: non è nella build né collegata al motore).
     Simulazione aggregata per luogo con un passo canonico settimanale identico a ogni livello di dettaglio: attività commerciali
     per tipo (conti, scorte, debiti, depositi), prezzi dinamici dalla copertura delle scorte, salari, banche per continente,
     tesorerie per regno (o continente), carovane fra luoghi collegati (anche intercontinentali, per settimane), guerre, stagioni
     e calamità da un generatore deterministico con seme (seme, tipo, luogo/continente, settimana).
     Conti esatti: il denaro è BigInt di Scintille e si muove solo fra conti (famiglie tramite env.population.transfer, attività,
     banche, tesorerie, borse delle carovane) oppure entra/esce da sorgenti e pozzi registrati con causa (mint/burn). Le merci sono
     millesimi di unità interi: prodotte + aggiunte − consumate − usate − deperite − perdute = scorte + merci in viaggio.
     Interfaccia con la popolazione (contratto PERF-005): summary(placeId) all'inizio della settimana, un solo transfer per luogo e
     settimana con gli importi APPLICATI restituiti, segnali in millesimi con signals(eco, placeId).
     Tutti i parametri sono tabelle esportate e PROVVISORI, da approvare: nessun effetto sul bilanciamento del gioco esistente. */
  const DAY=1440,WEEK=10080,SCHEMA=1,DAYS_PER_SEASON=12;
  const GOODS=['grain','seeds','herb','ore','work','wool','essence','water','bread','potion'];
  const TYPES=['farm','herbary','mine','workshop','pasture','sanctum','well','bakery','apothecary','smithy','trade'];
  const NG=GOODS.length,NT=TYPES.length,TRADE=TYPES.indexOf('trade');
  const GI=Object.fromEntries(GOODS.map((g,i)=>[g,i]));
  const SEASONS=['Primavera','Estate','Autunno','Inverno'];
  const denominations=[
    {id:'astral',name:'Astrali',factor:1000000n},
    {id:'solar',name:'Solari',factor:10000n},
    {id:'lunar',name:'Lunari',factor:100n},
    {id:'spark',name:'Scintille',factor:1n}
  ];

  /* ---------- parametri (PROVVISORI, da approvare) ---------- */
  const params={
    provisional:true,
    // Merci: prezzo di base in Scintille per unità (come referencePrice di market-flows), fabbisogno per abitante a settimana e
    // deperimento settimanale in millesimi; `cover` = scorta obiettivo in millesimi di settimane di domanda (piccola per le merci
    // deperibili); `trade` = trasportabile dalle carovane; `season` = moltiplicatore stagionale della domanda.
    goods:{
      grain:{name:'Grano',base:5,need:280,spoil:40,cover:2000,trade:true,food:true},
      seeds:{name:'Sementi',base:5,need:105,spoil:70,cover:2000,trade:true},
      herb:{name:'Erbe',base:9,need:210,spoil:200,cover:800,trade:false},
      ore:{name:'Minerale',base:6,need:175,spoil:0,cover:2000,trade:true},
      work:{name:'Manufatti',base:6,need:175,spoil:0,cover:2000,trade:true},
      wool:{name:'Lana',base:7,need:245,spoil:35,cover:2000,trade:true,luxury:true,season:[800,600,1100,1600]},
      essence:{name:'Essenza',base:12,need:84,spoil:14,cover:2000,trade:true,luxury:true},
      water:{name:'Acqua',base:3,need:1050,spoil:0,cover:1000,trade:false,food:true,season:[1000,1150,1000,950]},
      bread:{name:'Pane',base:6,need:840,spoil:500,cover:300,trade:false,food:true},
      potion:{name:'Pozioni',base:11,need:175,spoil:70,cover:1500,trade:true,luxury:true}
    },
    // Attività per tipo: professione, posti per attività, produzione per lavoratore a settimana (millesimi), materie prime per
    // 1000 millesimi di prodotto, effetto delle stagioni (primavera, estate, autunno, inverno) in millesimi.
    types:{
      farm:{name:'Fattorie',job:'farmer',slots:8,makes:{grain:14000,seeds:2100},season:[1100,1300,1000,500]},
      herbary:{name:'Erboristerie',job:'herbalist',slots:5,makes:{herb:7000},season:[1200,1200,900,600]},
      mine:{name:'Miniere',job:'miner',slots:10,makes:{ore:10500}},
      workshop:{name:'Falegnamerie',job:'carpenter',slots:4,makes:{work:10500}},
      pasture:{name:'Pascoli',job:'shepherd',slots:5,makes:{wool:9000},season:[1100,1100,1000,800]},
      sanctum:{name:'Santuari dell’essenza',job:'mystic',slots:3,makes:{essence:5250}},
      well:{name:'Pozzi',job:'wellkeeper',slots:4,makes:{water:21000},season:[1000,950,1000,1050]},
      bakery:{name:'Forni',job:'baker',slots:4,makes:{bread:14000},uses:{grain:500}},
      apothecary:{name:'Speziali',job:'alchemist',slots:3,makes:{potion:7000},uses:{herb:500}},
      smithy:{name:'Fucine',job:'smith',slots:3,makes:{work:10500},uses:{ore:300}},
      trade:{name:'Case mercantili',job:'merchant',slots:5,makes:{}}
    },
    // Salario di base per lavoratore a settimana, in Scintille (scalato dall'indice dei salari del luogo).
    wages:{farmer:35,herbalist:33,miner:35,carpenter:33,shepherd:30,mystic:38,wellkeeper:28,baker:30,alchemist:35,smith:33,
      merchant:40,guard:35,scholar:38,healer:38,laborer:25},
    // Quote attese di lavoratori per professione, in millesimi degli abitanti (circa l'80% degli adulti): servono a fondare le
    // attività iniziali; poi è la popolazione a dire chi lavora davvero (summary.workers).
    workforce:{farmer:68,herbalist:60,miner:24,carpenter:10,shepherd:32,mystic:18,wellkeeper:60,baker:72,alchemist:30,smith:12,
      merchant:10,guard:20,scholar:8,healer:8,laborer:40},
    // Posti pagati dalla tesoreria per 1000 abitanti (in guerra le guardie raddoppiano e sono pagate una volta e mezza).
    publicJobs:{guard:20,scholar:8,healer:8,laborer:40},
    // Imposte in millesimi (licenza in Scintille per attività a settimana); oltre `reserveWeeks` settimane di salari pubblici in
    // cassa la tesoreria non riscuote l'imposta sul reddito della settimana.
    tax:{income:100,profit:150,license:2,tariff:50,treasuryPerCapita:8,reserveWeeks:8},
    bank:{capitalPerCapita:5,loanRate:6,depositRate:2,reserveRatio:200,capitalTarget:100,dividendShare:125,creditWeeks:8,
      startupWeeks:4,crisisWeeks:6,depositCapWeeks:2},
    business:{bufferWeeks:1,startCashWeeks:2,dividendShare:800,depositShare:250,closeAfter:12,maxOpen:3,openPrice:1100,openProfit:100,
      spendableBuffer:500},
    // Prezzi: copertura = scorte / domanda settimanale, relativa alla copertura obiettivo della merce (1000 = all'obiettivo);
    // indice in millesimi del prezzo di base. Lo sforzo dei produttori cala oltre `effortFull` e si ferma a `effortZero`.
    prices:{riseSlope:1500,fallSlope:200,floor:600,ceil:2500,inertia:2,effortFull:1500,effortZero:3000,
      necessity:250,luxury:500,priority:['water','bread','grain','herb','wool','work','ore','seeds','potion','essence']},
    // Eventi: probabilità in millesimi per settimana.
    events:{warStart:5,warMin:4,warSpan:12,warProduction:800,calamity:3,caravanLoss:3,caravanLossOcean:10,caravanLossWar:80,
      caravanLossDisaster:20,raidShare:333,plunderCash:30,plunderStock:50,mintCapPerCapita:2,harvestSpread:100},
    calamities:{
      fire:{name:'Incendio',weight:3,weeks:2,stock:150,cash:50,production:{all:850}},
      flood:{name:'Alluvione',weight:2,weeks:3,stockGoods:{grain:300,seeds:300,bread:300},production:{farm:600,pasture:700}},
      drought:{name:'Siccità',weight:2,weeks:4,production:{farm:500,herbary:500,pasture:600,well:600}},
      plague:{name:'Epidemia',weight:2,weeks:3,production:{all:850},demand:{potion:2000}},
      quake:{name:'Terremoto',weight:1,weeks:3,stock:150,cash:20,production:{mine:500,workshop:700}}
    },
    // Carovane: capacità per mercante a settimana (millesimi); coperture relative all'obiettivo della merce (millesimi).
    caravans:{perMerchant:50000,margin:100,costPerWeek:40,keepCover:1250,fillCover:1000,buyCover:1500,landWeeks:1,oceanMin:2,oceanSpan:2},
    crisis:{food:300,unemployment:350,closures:2500},
    prosperityRef:60,
    limits:{events:240}
  };

  /* ---------- utilità ---------- */
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const own=(o,k)=>object(o)&&Object.hasOwn(o,k);
  const safeId=id=>typeof id==='string'&&/^[a-z][a-z0-9._:-]{0,95}$/i.test(id)&&!['constructor','prototype','__proto__'].includes(id);
  const minB=(a,b)=>(a<b?a:b),maxB=(a,b)=>(a>b?a:b);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const isInt=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
  const bigOf=v=>typeof v==='string'&&/^(0|[1-9][0-9]{0,30})$/.test(v)?BigInt(v):null;
  const signedOf=v=>typeof v==='string'&&/^(0|-?[1-9][0-9]{0,30})$/.test(v)?BigInt(v):null;
  const amountOf=v=>typeof v==='bigint'?(v>=0n?v:null):Number.isSafeInteger(v)&&v>=0?BigInt(v):bigOf(v);
  const format=new Intl.NumberFormat('it-IT');
  function roll(seed,...parts){
    let h=(2166136261^seed)>>>0;
    for(const p of parts){const s=String(p);for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;h=Math.imul(h^124,16777619)>>>0;}
    h^=h>>>16;h=Math.imul(h,0x85ebca6b)>>>0;h^=h>>>13;h=Math.imul(h,0xc2b2ae35)>>>0;h^=h>>>16;
    return (h>>>0)%1000000;
  }
  const seedOf=seed=>Number.isFinite(seed)?(Math.floor(Math.abs(seed))%4294967296)>>>0:roll(0,String(seed));
  // Ripartisce un totale (BigInt) in parti proporzionali ai pesi, con il metodo dei resti maggiori (a parità, l'indice minore).
  function splitBig(total,weights){
    const n=weights.length,out=new Array(n).fill(0n);
    let sum=0n;for(const w of weights)sum+=BigInt(w);
    if(total<=0n||sum<=0n)return out;
    let given=0n;const rem=new Array(n);
    for(let i=0;i<n;i++){const num=total*BigInt(weights[i]);out[i]=num/sum;given+=out[i];rem[i]=[num%sum,i];}
    rem.sort((a,b)=>(a[0]<b[0]?1:a[0]>b[0]?-1:a[1]-b[1]));
    for(let k=0,left=total-given;left>0n;k++,left--)out[rem[k][1]]++;
    return out;
  }
  const splitNum=(total,weights)=>splitBig(BigInt(total),weights).map(Number);
  const ceilCost=(q,u)=>(BigInt(q)*BigInt(u)+999999n)/1000000n;       // costo in Scintille di q millesimi al prezzo u
  const afford=(cash,u,q)=>{const a=cash>0n?cash*1000000n/BigInt(u):0n;return a<BigInt(q)?Number(a):q;};
  function wallet(v){
    const count=amountOf(v)??0n;
    let change=count;
    const coins=denominations.map(({id,name,factor})=>{const units=change/factor;change%=factor;return {id,name,quantity:String(units),formatted:format.format(units)};});
    const visible=coins.filter(c=>c.quantity!=='0');
    return {total:String(count),totalFormatted:format.format(count),label:visible.length?visible.map(c=>c.formatted+' '+c.name).join(' · '):'0 Scintille',coins};
  }
  const units=q=>format.format(Math.round(q/1000));
  const safeCall=(fn,...args)=>{try{return fn(...args);}catch{return undefined;}};

  /* Tabelle lette a ogni passo dai parametri esportati (così i valori approvati si cambiano in un solo punto). */
  function tables(){
    const P=params,g=GOODS.map(id=>P.goods[id]);
    const types=TYPES.map(id=>{
      const d=P.types[id],makes=Object.entries(d.makes||{}).map(([k,r])=>[GI[k],r]),uses=Object.entries(d.uses||{}).map(([k,r])=>[GI[k],r]);
      return {id,name:d.name,job:d.job,slots:d.slots,makes,uses,season:d.season||null,main:makes.length?makes[0][0]:-1};
    });
    return {P,types,base:g.map(x=>x.base),need:g.map(x=>x.need),spoil:g.map(x=>x.spoil||0),cover:g.map(x=>x.cover||2000),trade:g.map(x=>!!x.trade),food:g.map(x=>!!x.food),
      luxury:g.map(x=>!!x.luxury),gseason:g.map(x=>x.season||null),priority:P.prices.priority.map(id=>GI[id]),
      calKinds:Object.keys(P.calamities)};
  }
  const seasonOfDay=d=>Math.floor(d/DAYS_PER_SEASON)%4;
  function seasonCounts(week){const c=[0,0,0,0];for(let d=0;d<7;d++)c[seasonOfDay(week*7+d)]++;return c;}
  const mix=(arr,c)=>arr?Math.floor((arr[0]*c[0]+arr[1]*c[1]+arr[2]*c[2]+arr[3]*c[3])/7):1000;
  const wageOf=(K,job,index)=>BigInt(Math.floor((K.P.wages[job]||0)*index/1000));

  /* ---------- topologia (non salvata: si ricostruisce dai luoghi passati a create/restore) ---------- */
  const topos=new WeakMap(),lastWeek=new WeakMap();
  function topoBuild(places){
    const list=[],seen=new Set();
    if(Array.isArray(places))for(const p of places){
      if(!object(p)||!safeId(p.id)||seen.has(p.id))continue;
      const c=safeId(p.continent)?p.continent:'ignoto',r=safeId(p.realm)?p.realm:c;
      seen.add(p.id);
      list.push({id:p.id,c,r,kind:typeof p.kind==='string'?p.kind:'town',pop:isInt(p.population,0,1e8)?p.population:0,raw:Array.isArray(p.links)?p.links:[],links:[]});
    }
    list.sort((a,b)=>(a.id<b.id?-1:a.id>b.id?1:0));
    const by=new Map(list.map(p=>[p.id,p])),links=new Map(list.map(p=>[p.id,new Set()]));
    for(const p of list)for(const l of p.raw)if(typeof l==='string'&&l!==p.id&&by.has(l)){links.get(p.id).add(l);links.get(l).add(p.id);}
    for(const p of list){p.links=[...links.get(p.id)].sort();delete p.raw;}
    const continents=[...new Set(list.map(p=>p.c))].sort(),realms=[...new Set(list.map(p=>p.r))].sort();
    const byCont=new Map(continents.map(c=>[c,list.filter(p=>p.c===c).map(p=>p.id)]));
    const contRealms=new Map(continents.map(c=>{
      const w=new Map();for(const p of list)if(p.c===c)w.set(p.r,(w.get(p.r)||0)+p.pop);
      return [c,[...w.entries()].sort((a,b)=>(a[0]<b[0]?-1:1))];
    }));
    return {order:list.map(p=>p.id),by,continents,realms,byCont,contRealms};
  }
  function travel(topo,a,b){
    const C=params.caravans,pa=topo.by.get(a),pb=topo.by.get(b);
    if(pa.c===pb.c)return C.landWeeks;
    return C.oceanMin+roll(0,'rotta',a<b?a+'|'+b:b+'|'+a)%(C.oceanSpan+1);
  }

  /* ---------- stato ---------- */
  const zerosB=()=>new Array(NG).fill(0n);
  function newLedger(){return {open:0n,mint:{},burn:{},toHH:0n,fromHH:0n,gOpen:zerosB(),gProd:zerosB(),gEat:zerosB(),gUsed:zerosB(),gSpoil:zerosB(),gLost:{},gAdd:{}};}
  function newTotals(){return {shipped:0,delivered:0,returned:0,lostCargo:0,arrivals:0,pausedWeeks:0,loansIssued:0n,deposited:0n,
    loanInterestPaid:0n,depositInterest:0n,capitalized:0n,writtenOff:0n,haircut:0n,rounding:0n,removedClaims:0n};}
  function newBiz(){return {n:0,cash:0n,debt:0n,dep:0n,loss:0,pr:0n,e:0,s:new Array(NG).fill(0),wp:0n};}
  function demandEstimate(K,pop){
    const d=K.need.map(n=>pop*n);
    for(const t of K.types){
      if(!t.uses.length)continue;
      const workers=Math.floor(pop*(K.P.workforce[t.job]||0)/1000),out=workers*t.makes[0][1];
      for(const [g,per] of t.uses)d[g]+=Math.floor(out*per/1000);
    }
    return d;
  }
  function newPlace(K,info){
    const d=demandEstimate(K,info.pop),pl={w:1000,i:new Array(NG).fill(1000),d,b:[],dis:null,g:neutralArray(),cl:0,cr:0,c:info.c,r:info.r};
    for(const t of K.types){
      const bz=newBiz(),workers=Math.floor(info.pop*(K.P.workforce[t.job]||0)/1000);
      bz.n=workers>0?Math.ceil(workers/t.slots):0;
      bz.cash=BigInt(bz.n*t.slots)*wageOf(K,t.job,1000)*BigInt(K.P.business.startCashWeeks);
      pl.b.push(bz);
    }
    for(let g=0;g<NG;g++){
      const q=Math.floor(d[g]*K.cover[g]/1000);
      if(!q)continue;
      let holder=-1;
      for(let t=0;t<NT;t++)if(K.types[t].makes.some(m=>m[0]===g)&&(holder<0||pl.b[holder].n===0&&pl.b[t].n>0))holder=t;
      pl.b[holder<0?TRADE:holder].s[g]+=q;
    }
    return pl;
  }
  const neutral=Object.freeze({foodScarcity:0,priceIndex:1000,wageIndex:1000,unemployment:0,prosperity:1000,crisis:0,war:0,disaster:0,season:0});
  const SIG=Object.keys(neutral);
  const neutralArray=()=>SIG.map(k=>neutral[k]);
  function bankCapital(K,topo,c){let pop=0;for(const id of topo.byCont.get(c))pop+=topo.by.get(id).pop;return BigInt(pop)*BigInt(K.P.bank.capitalPerCapita);}
  function treasuryStart(K,topo,r){let pop=0;for(const id of topo.order)if(topo.by.get(id).r===r)pop+=topo.by.get(id).pop;return BigInt(pop)*BigInt(K.P.tax.treasuryPerCapita);}
  const newBank=k=>({r:k,dep:0n,loans:0n,k,cr:-1});

  function moneyOf(eco){
    let m=0n;
    for(const id in eco.places)for(const b of eco.places[id].b)m+=b.cash;
    for(const c in eco.banks)m+=eco.banks[c].r;
    for(const r in eco.treasuries)m+=eco.treasuries[r];
    for(const v of eco.caravans)m+=v.m;
    return m;
  }
  function goodsOf(eco){
    const stock=new Array(NG).fill(0n),transit=new Array(NG).fill(0n);
    for(const id in eco.places)for(const b of eco.places[id].b)for(let g=0;g<NG;g++)stock[g]+=BigInt(b.s[g]);
    for(const v of eco.caravans)for(let g=0;g<NG;g++)transit[g]+=BigInt(v.c[g]);
    return {stock,transit};
  }
  function create(seed,places,now){
    const K=tables(),topo=topoBuild(places);
    const eco={schema:SCHEMA,seed:seedOf(seed),week:Number.isFinite(now)&&now>=0?Math.ceil(now/WEEK):0,seq:0,places:{},banks:{},treasuries:{},
      continents:{},caravans:[],ledger:newLedger(),events:[],counts:{},totals:newTotals()};
    for(const id of topo.order)eco.places[id]=newPlace(K,topo.by.get(id));
    for(const c of topo.continents){eco.banks[c]=newBank(bankCapital(K,topo,c));eco.continents[c]={war:-1,at:0};}
    for(const r of topo.realms)eco.treasuries[r]=treasuryStart(K,topo,r);
    eco.ledger.open=moneyOf(eco);
    eco.ledger.gOpen=goodsOf(eco).stock;
    topos.set(eco,topo);
    return eco;
  }

  /* ---------- registro ---------- */
  function event(eco,week,kind,place,text,quantity){
    eco.counts[kind]=(eco.counts[kind]||0)+1;
    eco.events.push([week,kind,place,text,quantity===undefined?'':String(quantity)]);
    const cap=params.limits.events;
    if(eco.events.length>cap)eco.events.splice(0,eco.events.length-cap);
  }
  const mint=(eco,cause,a)=>{if(a>0n)eco.ledger.mint[cause]=(eco.ledger.mint[cause]||0n)+a;};
  const burn=(eco,cause,a)=>{if(a>0n)eco.ledger.burn[cause]=(eco.ledger.burn[cause]||0n)+a;};
  function lose(eco,cause,g,q){
    if(q<=0)return;
    const row=eco.ledger.gLost[cause]||(eco.ledger.gLost[cause]=zerosB());
    row[g]+=BigInt(q);
  }
  function addGoods(eco,cause,g,q){
    if(q<=0)return;
    const row=eco.ledger.gAdd[cause]||(eco.ledger.gAdd[cause]=zerosB());
    row[g]+=BigInt(q);
  }
  function newWeek(){
    return {wages:0n,spend:0n,tax:0n,publicWages:0n,businessTax:0n,licenses:0n,bankToTreasury:0n,tariffs:0n,liquidations:0n,minted:0n,burned:0n,shipped:0,
      gp:new Array(NG).fill(0),ge:new Array(NG).fill(0),gu:new Array(NG).fill(0),gs:new Array(NG).fill(0)};
  }

  /* ---------- scorte e scambi ---------- */
  function total(B,g){let s=0;for(let t=0;t<B.length;t++)s+=B[t].s[g];return s;}
  // Preleva q millesimi della merce g dai detentori (escluso `ex`) in proporzione alle loro scorte.
  function takeFrom(B,g,q,ex){
    const ts=[],ws=[];
    for(let t=0;t<B.length;t++)if(t!==ex&&B[t].s[g]>0){ts.push(t);ws.push(B[t].s[g]);}
    if(!ts.length||q<=0)return [];
    if(ts.length===1){const take=Math.min(q,ws[0]);B[ts[0]].s[g]-=take;return [[ts[0],take]];}
    const parts=splitNum(q,ws),out=[];
    for(let i=0;i<ts.length;i++)if(parts[i]>0){B[ts[i]].s[g]-=parts[i];out.push([ts[i],parts[i]]);}
    return out;
  }
  // Paga i detentori in proporzione alle quantità prelevate: è il loro ricavo.
  function payHolders(B,takes,pay){
    if(pay<=0n||!takes.length)return pay;
    const parts=takes.length===1?[pay]:splitBig(pay,takes.map(x=>x[1]));
    for(let i=0;i<takes.length;i++){const b=B[takes[i][0]];b.cash+=parts[i];b.wp+=parts[i];}
    return 0n;
  }
  const unit=(K,pl,g)=>K.base[g]*pl.i[g];          // millesimi di Scintilla per unità
  // Copertura relativa: scorte / domanda settimanale, in millesimi della copertura obiettivo della merce (1000 = all'obiettivo).
  function cover(K,pl,g,have){const d=pl.d[g]*K.cover[g]/1000;return d>0?Math.floor(have*1000/d):have>0?1e9:1000;}
  function effort(K,pl,g){
    const c=cover(K,pl,g,total(pl.b,g)),P=K.P.prices;
    if(c<=P.effortFull)return 1000;
    if(c>=P.effortZero)return 0;
    return Math.floor(1000-(c-P.effortFull)*1000/(P.effortZero-P.effortFull));
  }
  function targetIndex(K,c){
    const P=K.P.prices,gap=/*M:scarsita*/(1000-Math.min(c,10000));
    return clamp(gap>0?1000+Math.floor(gap*P.riseSlope/1000):1000+Math.trunc(gap*P.fallSlope/1000),P.floor,P.ceil);
  }
  // Banca: prelievo dai depositi, prestito con limiti di credito e riserva obbligatoria.
  function withdraw(bz,bank,amount){
    const w=minB(minB(bz.dep,amount),bank.r);
    if(w>0n){bz.dep-=w;bank.dep-=w;bank.r-=w;bz.cash+=w;}
    return w;
  }
  function lendable(K,bank){return maxB(0n,bank.r-bank.dep*BigInt(K.P.bank.reserveRatio)/1000n);}
  function borrow(eco,K,bz,bank,amount,limit,week){
    if(bank.cr>=week)return 0n;                        // stretta del credito dopo un'insolvenza
    const a=minB(minB(amount,limit-bz.debt),lendable(K,bank));
    if(a<=0n)return 0n;
    bank.r-=a;bank.loans+=a;bz.debt+=a;bz.cash+=a;eco.totals.loansIssued+=a;
    return a;
  }

  /* ---------- passo settimanale ---------- */
  function readSummary(pop,id){
    const s=pop&&typeof pop.summary==='function'?safeCall(pop.summary,id):null;
    const n=v=>Number.isFinite(v)&&v>0?Math.min(Math.floor(v),1e9):0;
    const out={alive:0,adults:0,households:0,unemployed:0,workers:{},wealth:0n};
    if(!object(s))return out;
    out.alive=n(s.alive);out.adults=n(s.adults);out.households=n(s.households);out.unemployed=n(s.unemployed);
    if(object(s.workers))for(const k of Object.keys(s.workers))if(safeId(k))out.workers[k]=n(s.workers[k]);
    out.wealth=amountOf(typeof s.wealth==='bigint'?s.wealth:String(s.wealth))??0n;
    return out;
  }
  const clampApplied=(v,max)=>{const a=typeof v==='bigint'?v:amountOf(v);return a===null||a<0n?0n:minB(a,max);};

  function warStep(eco,c,week,hooks,K){
    const st=eco.continents[c],E=K.P.events;
    const forced=!!(hooks&&typeof hooks.war==='function'&&safeCall(hooks.war,c,week));
    if(st.war<week){
      if(forced)st.war=week;
      else if(roll(eco.seed,'guerra',c,week)<E.warStart*1000)st.war=week+E.warMin-1+roll(eco.seed,'durata',c,week)%(E.warSpan+1);
    }else if(forced)st.war=Math.max(st.war,week);
    const at=st.war>=week?1:0;
    if(at&&!st.at)event(eco,week,'war',c,`Scoppia la guerra nel continente ${c}`);
    if(!at&&st.at)event(eco,week,'peace',c,`Torna la pace nel continente ${c}`);
    st.at=at;
    if(!at)return;
    // Saccheggio: un luogo abitato del continente perde parte del denaro e delle scorte delle sue attività.
    const topo=topos.get(eco),ids=topo.byCont.get(c).filter(id=>topo.by.get(id).pop>0);
    if(!ids.length)return;
    const id=ids[roll(eco.seed,'saccheggio',c,week)%ids.length],pl=eco.places[id];
    let gone=0n;
    for(const b of pl.b){
      const cash=b.cash*BigInt(E.plunderCash)/1000n;b.cash-=cash;gone+=cash;
      for(let g=0;g<NG;g++){const q=Math.floor(b.s[g]*E.plunderStock/1000);if(q){b.s[g]-=q;lose(eco,'saccheggio',g,q);}}
    }
    burn(eco,'saccheggio',gone);
  }
  function calamityStep(eco,id,week,hooks,K){
    const pl=eco.places[id],info=topos.get(eco).by.get(id);
    if(pl.dis&&pl.dis[1]<week)pl.dis=null;
    if(pl.dis)return 0n;
    const forced=hooks&&typeof hooks.disaster==='function'?safeCall(hooks.disaster,id,week):null;
    let kind=null;
    const pick=()=>{
      const w=K.calKinds.map(k=>K.P.calamities[k].weight),sum=w.reduce((a,b)=>a+b,0);
      let r=roll(eco.seed,'tipo',id,week)%sum;
      for(let i=0;i<w.length;i++){if(r<w[i])return K.calKinds[i];r-=w[i];}
      return K.calKinds[0];
    };
    if(typeof forced==='string'&&own(K.P.calamities,forced))kind=forced;
    else if(forced)kind=pick();
    else if(info.pop>0&&roll(eco.seed,'calamita',id,week)<K.P.events.calamity*1000)kind=pick();
    if(!kind)return 0n;
    const def=K.P.calamities[kind];
    pl.dis=[kind,week+def.weeks-1];
    let lost=0,gone=0n;
    for(const b of pl.b){
      for(let g=0;g<NG;g++){
        const rate=own(def.stockGoods,GOODS[g])?def.stockGoods[GOODS[g]]:def.stock||0,q=Math.floor(b.s[g]*rate/1000);
        if(q){b.s[g]-=q;lose(eco,'calamita',g,q);lost+=q;}
      }
      if(def.cash){const c=b.cash*BigInt(def.cash)/1000n;b.cash-=c;gone+=c;}
    }
    burn(eco,'calamita',gone);
    event(eco,week,'calamity',id,`${def.name} a ${id}: perdute ${units(lost)} unità di merci`+(gone>0n?` e ${wallet(gone).label}`:''),lost);
    return gone;
  }
  function caravanStep(eco,topo,week,K,wk,ctx){
    const E=K.P.events,keep=[];
    for(const cv of eco.caravans){
      const from=topo.by.get(cv.f),to=topo.by.get(cv.t);
      let p=from.c!==to.c?E.caravanLossOcean:E.caravanLoss;
      if(eco.continents[from.c].war>=week||eco.continents[to.c].war>=week)p+=E.caravanLossWar;
      const pf=eco.places[cv.f].dis,pt=eco.places[cv.t].dis;
      if(pf&&pf[1]>=week||pt&&pt[1]>=week)p+=E.caravanLossDisaster;
      p=Math.min(p,1000);
      const r=roll(eco.seed,'carovana',cv.id,week),q=cv.c.reduce((a,b)=>a+b,0);
      const cause=eco.continents[from.c].war>=week||eco.continents[to.c].war>=week?'guerra':pf&&pf[1]>=week||pt&&pt[1]>=week?'calamità':'briganti';
      if(r<p*1000){
        for(let g=0;g<NG;g++)if(cv.c[g]){/*M:perdita*/lose(eco,'carovana',g,cv.c[g]);}
        burn(eco,'carovana',cv.m);wk.burned+=cv.m;
        eco.totals.lostCargo+=q;
        const home=eco.places[cv.f].b[TRADE];home.wp-=cv.k;
        event(eco,week,'caravanLost',cv.f,`Carovana ${cv.f} → ${cv.t} perduta (${cause}): ${units(q)} unità di merci`+(cv.m>0n?` e ${wallet(cv.m).label}`:''),q);
        continue;
      }
      if(r<Math.min(1000,2*p)*1000){
        let taken=0;
        for(let g=0;g<NG;g++){const x=Math.floor(cv.c[g]*E.raidShare/1000);if(x){cv.c[g]-=x;lose(eco,'carovana',g,x);taken+=x;}}
        const m=cv.m*BigInt(E.raidShare)/1000n;cv.m-=m;burn(eco,'carovana',m);wk.burned+=m;
        eco.totals.lostCargo+=taken;
        if(taken||m>0n)event(eco,week,'caravanRaided',cv.f,`Carovana ${cv.f} → ${cv.t} razziata (${cause}): perdute ${units(taken)} unità di merci`,taken);
      }
      if(cv.d>week){keep.push(cv);continue;}
      eco.totals.arrivals++;
      if(!cv.b){
        // Arrivo a destinazione: per questa settimana la carovana apre un banco nel mercato del luogo (vedi placeStep).
        (ctx.stalls[cv.t]||(ctx.stalls[cv.t]=[])).push(cv);
        keep.push(cv);
      }else{
        // Ritorno: merci invendute e ricavato rientrano nella casa mercantile d'origine.
        const th=eco.places[cv.f].b[TRADE];
        for(let g=0;g<NG;g++){th.s[g]+=cv.c[g];eco.totals.returned+=cv.c[g];}
        th.cash+=cv.m;th.wp+=cv.m-cv.k;
      }
    }
    eco.caravans=keep;
  }
  /* Chiusura del banco: l'invenduto si offre alla casa mercantile del luogo (fino a ciò che può pagare e rivendere), il dazio
     sul ricavato va alla tesoreria del luogo se la carovana viene da un altro regno, poi la carovana riparte verso casa. */
  function closeStall(eco,topo,K,wk,stall,week){
    const cv=stall.cv,dest=eco.places[cv.t],th=dest.b[TRADE],from=topo.by.get(cv.f),to=topo.by.get(cv.t);
    let sold=stall.cash-cv.m;
    eco.totals.delivered+=stall.before-cv.c.reduce((a,b)=>a+b,0);
    for(let g=0;g<NG;g++){
      if(!cv.c[g])continue;
      const u=unit(K,dest,g),room=Math.max(0,Math.floor(dest.d[g]*K.cover[g]/1000*K.P.caravans.buyCover/1000)-total(dest.b,g));
      const spare=maxB(0n,th.cash-bufferOf(K,th,TRADE,dest.w)*BigInt(K.P.business.spendableBuffer)/1000n);
      const take=afford(spare,u,Math.min(cv.c[g],room));
      if(take<=0)continue;
      const pay=ceilCost(take,u);
      th.cash-=pay;th.wp-=pay;th.s[g]+=take;cv.c[g]-=take;sold+=pay;stall.cash+=pay;eco.totals.delivered+=take;
    }
    if(sold>0n&&from.r!==to.r){
      const duty=sold*BigInt(K.P.tax.tariff)/1000n;
      eco.treasuries[to.r]+=duty;wk.tariffs+=duty;stall.cash-=duty;
    }
    cv.m=stall.cash;
    if(cv.m===0n&&!cv.c.some(x=>x)){eco.places[cv.f].b[TRADE].wp-=cv.k;return false;}
    cv.b=1;cv.s=week;cv.d=week+travel(topo,cv.f,cv.t);
    return true;
  }
  const bufferOf=(K,bz,t,index)=>BigInt(bz.n*K.types[t].slots)*wageOf(K,K.types[t].job,index)*BigInt(K.P.business.bufferWeeks);

  function placeStep(eco,topo,id,week,pop,K,wk,ctx,counts){
    const pl=eco.places[id],info=topo.by.get(id),bank=eco.banks[info.c],realm=info.r,P=K.P;
    // Banchi delle carovane arrivate: vendono come gli altri detentori; merci e borsa restano della carovana (in viaggio).
    const stalls=(ctx.stalls[id]||[]).map(cv=>({cv,s:cv.c,cash:cv.m,wp:0n,n:0,e:0,start:cv.c.slice(),before:cv.c.reduce((x,y)=>x+y,0)}));
    const B=stalls.length?pl.b.concat(stalls):pl.b;
    const sum=readSummary(pop,id),alive=sum.alive,atWar=eco.continents[info.c].war>=week;
    const dis=pl.dis&&pl.dis[1]>=week?P.calamities[pl.dis[0]]:null;
    // a. Occupazione: ogni attività impiega i lavoratori della sua professione fino ai posti disponibili.
    const emp=new Array(NT);
    let idle=0,vac=0,wtot=0;
    for(let t=0;t<NT;t++){
      const def=K.types[t],have=sum.workers[def.job]||0,e=Math.min(have,B[t].n*def.slots);
      emp[t]=e;B[t].e=e;idle+=have-e;vac+=B[t].n*def.slots-e;wtot+=have;
    }
    const factorOf=t=>{
      const def=K.types[t];
      let f=mix(def.season,counts);
      if(atWar)f=Math.floor(f*P.events.warProduction/1000);
      if(dis&&dis.production)f=Math.floor(f*(own(dis.production,def.id)?dis.production[def.id]:dis.production.all??1000)/1000);
      return f;
    };
    // b. Produzione primaria, con raccolto variabile ma deterministico.
    for(let t=0;t<NT;t++){
      const def=K.types[t];
      if(!emp[t]||def.uses.length||!def.makes.length)continue;
      const spread=P.events.harvestSpread;
      const f=Math.floor(factorOf(t)*(1000-spread+roll(eco.seed,'raccolto',id,t,/*M:settimana*/week)%(2*spread+1))/1000);
      for(const [g,rate] of def.makes){
        const q=Math.floor(Math.floor(emp[t]*rate*f/1000)*effort(K,pl,g)/1000);
        if(q){B[t].s[g]+=q;wk.gp[g]+=q;}
      }
    }
    // c. Trasformazione: le materie prime si comprano dagli altri detentori del luogo, al prezzo corrente.
    const inNeed=new Array(NG).fill(0);
    for(let t=0;t<NT;t++){
      const def=K.types[t];
      if(!emp[t]||!def.uses.length)continue;
      const [g,rate]=def.makes[0],[inp,per]=def.uses[0],bz=B[t];
      const cap=Math.floor(Math.floor(emp[t]*rate*factorOf(t)/1000)*effort(K,pl,g)/1000);
      const need=Math.ceil(cap*per/1000);
      inNeed[inp]+=need;
      let buy=Math.min(need-Math.min(need,bz.s[inp]),total(B,inp)-bz.s[inp]);
      if(buy>0){
        const u=unit(K,pl,inp);
        buy=afford(bz.cash,u,buy);
        if(buy>0){
          const pay=ceilCost(buy,u),takes=takeFrom(B,inp,buy,t);
          bz.cash-=pay;bz.wp-=pay;bz.s[inp]+=buy;payHolders(B,takes,pay);
        }
      }
      const out=Math.min(cap,Math.floor(bz.s[inp]*1000/per)),used=Math.ceil(out*per/1000);
      if(out>0){bz.s[inp]-=used;wk.gu[inp]+=used;bz.s[g]+=out;wk.gp[g]+=out;}
    }
    // d. Salari e dividendi delle attività (richiesti), salari pubblici della tesoreria.
    const req={},payers=[];
    const ask=(src,job,amt)=>{if(amt>0n){req[job]=(req[job]||0n)+amt;payers.push([src,amt]);}};
    for(let t=0;t<NT;t++){
      const def=K.types[t],bz=B[t],workers=sum.workers[def.job]||0;
      if(!bz.n&&bz.cash===0n)continue;
      const wage=wageOf(K,def.job,pl.w),bill=BigInt(emp[t])*wage;
      if(bz.cash<bill){
        withdraw(bz,bank,bill-bz.cash);
        if(bz.cash<bill&&bz.n>0&&bz.loss<P.business.closeAfter)
          borrow(eco,K,bz,bank,bill-bz.cash,BigInt(bz.n*def.slots)*wage*BigInt(P.bank.creditWeeks),week);
      }
      const pay=minB(bz.cash,bill),free=bz.cash-pay-bufferOf(K,bz,t,pl.w);
      const div=free>0n&&workers>0?free*BigInt(P.business.dividendShare)/1000n:0n;
      bz.wp-=pay;
      ask(t,def.job,pay+div);
    }
    let pubBill=0n;const pub=[];
    for(const [job,share] of Object.entries(P.publicJobs)){
      const posts=Math.floor(alive*share/1000)*(job==='guard'&&atWar?2:1),e=Math.min(sum.workers[job]||0,posts);
      if(!e)continue;
      let wage=wageOf(K,job,pl.w);if(job==='guard'&&atWar)wage=wage*3n/2n;
      const bill=BigInt(e)*wage;pub.push([job,bill]);pubBill+=bill;
    }
    if(pubBill>0n){
      if(atWar&&eco.treasuries[realm]<pubBill){
        const m=minB(pubBill-eco.treasuries[realm],BigInt(alive)*BigInt(P.events.mintCapPerCapita));
        eco.treasuries[realm]+=m;mint(eco,'zecca',m);wk.minted+=m;
      }
      const avail=minB(eco.treasuries[realm],pubBill);
      const parts=avail===pubBill?pub.map(x=>x[1]):splitBig(avail,pub.map(x=>x[1]));
      for(let i=0;i<pub.length;i++)ask(-1,pub[i][0],parts[i]);
    }
    // e. Paniere delle famiglie (domanda elastica al prezzo, stagioni, epidemie) e tasse sul reddito.
    const want=new Array(NG).fill(0),qty=new Array(NG).fill(0),cost=new Array(NG).fill(0n);
    let spendReq=0n;
    for(const g of K.priority){
      const idx=pl.i[g],lux=K.luxury[g];
      const el=lux?clamp(1000-Math.trunc((idx-1000)*P.prices.luxury/1000),300,1300):clamp(1000-Math.trunc((idx-1000)*P.prices.necessity/1000),700,1100);
      let w=Math.floor(Math.floor(alive*K.need[g]*mix(K.gseason[g],counts)/1000)*el/1000);
      if(dis&&dis.demand&&own(dis.demand,GOODS[g]))w=Math.floor(w*dis.demand[GOODS[g]]/1000);
      want[g]=w;
      const q=Math.min(w,total(B,g));
      qty[g]=q;cost[g]=q>0?ceilCost(q,unit(K,pl,g)):0n;spendReq+=cost[g];
    }
    let wagesReq=0n;for(const job in req)wagesReq+=req[job];
    const taxReq=ctx.flush[realm]?0n:wagesReq*BigInt(P.tax.income)/1000n;
    let applied=null;
    if(pop&&typeof pop.transfer==='function'&&(wagesReq>0n||spendReq>0n||taxReq>0n))applied=safeCall(pop.transfer,id,{wages:{...req},spend:spendReq,tax:taxReq});
    if(!object(applied))applied={wages:0n,spend:0n,tax:0n};
    const wagesA=clampApplied(applied.wages,wagesReq),spendA=/*M:applicati*/clampApplied(applied.spend,spendReq),taxA=clampApplied(applied.tax,taxReq);
    // f. Regolamento: salari applicati ripartiti fra i pagatori, vendite ai detentori, tasse alla tesoreria.
    const shares=wagesA===wagesReq?payers.map(x=>x[1]):splitBig(wagesA,payers.map(x=>x[1]));
    for(let i=0;i<payers.length;i++){
      const src=payers[i][0];
      if(src>=0)B[src].cash-=shares[i];else{eco.treasuries[realm]-=shares[i];wk.publicWages+=shares[i];}
    }
    eco.ledger.toHH+=wagesA;wk.wages+=wagesA;
    const got=new Array(NG).fill(0);
    let rem=spendA;
    for(const g of K.priority){
      if(rem<=0n)break;
      if(!qty[g])continue;
      let q=qty[g],pay=cost[g];
      if(rem<pay){q=afford(rem,unit(K,pl,g),q);pay=rem;}
      if(q<=0)break;
      rem-=pay;got[g]=q;wk.ge[g]+=q;
      payHolders(B,takeFrom(B,g,q,-1),pay);
    }
    if(rem>0n){B[TRADE].cash+=rem;B[TRADE].wp+=rem;eco.totals.rounding+=rem;}
    eco.treasuries[realm]+=taxA;eco.ledger.fromHH+=spendA+taxA;wk.spend+=spendA;wk.tax+=taxA;
    // g. Interessi, licenze, tasse sugli utili, redditività, rimborsi e depositi.
    const depRate=bank.dep>0n?BigInt(P.bank.depositRate)*minB(1000n,bank.loans*1000n/bank.dep):0n;   // millesimi × 1000
    for(let t=0;t<NT;t++){
      const def=K.types[t],bz=B[t];
      if(bz.debt>0n){
        const due=bz.debt*BigInt(P.bank.loanRate)/1000n,paid=minB(bz.cash,due);
        bz.cash-=paid;/*M:interesse*/(bank.r+=paid);
        bz.debt+=due-paid;bank.loans+=due-paid;bz.wp-=due;
        eco.totals.loanInterestPaid+=paid;eco.totals.capitalized+=due-paid;
      }
      if(bz.n>0){const lic=minB(bz.cash,BigInt(bz.n*P.tax.license));bz.cash-=lic;eco.treasuries[realm]+=lic;wk.licenses+=lic;bz.wp-=lic;}
      if(bz.wp>0n){const tx=minB(bz.cash,bz.wp*BigInt(P.tax.profit)/1000n);bz.cash-=tx;eco.treasuries[realm]+=tx;wk.businessTax+=tx;bz.wp-=tx;}
      bz.pr=bz.pr-bz.pr/4n+bz.wp/4n;
      bz.loss=bz.n>0&&bz.pr<0n?bz.loss+1:Math.max(0,bz.loss-1);       // isteresi: dopo una chiusura si attende prima di riaprire
      bz.wp=0n;
      const buffer=bufferOf(K,bz,t,pl.w);
      if(bz.n===0){
        if(bz.dep>0n)withdraw(bz,bank,bz.dep);
        // Attività chiusa senza nessuno della professione nel luogo: la cassa residua passa alla tesoreria (beni vacanti).
        if(bz.cash>0n&&bz.debt===0n&&!(sum.workers[def.job]>0)){eco.treasuries[realm]+=bz.cash;wk.liquidations+=bz.cash;bz.cash=0n;}
        continue;
      }
      if(bz.debt>0n&&bz.cash>buffer){const rep=minB(bz.debt,(bz.cash-buffer)/2n);bz.cash-=rep;bank.r+=rep;bz.debt-=rep;bank.loans-=rep;}
      if(bz.cash>buffer){const d=(bz.cash-buffer)*BigInt(P.business.depositShare)/1000n;if(d>0n){bz.cash-=d;bank.r+=d;bz.dep+=d;bank.dep+=d;eco.totals.deposited+=d;}}
      const capDep=buffer*BigInt(P.bank.depositCapWeeks)/BigInt(P.business.bufferWeeks);
      if(bz.dep>capDep)withdraw(bz,bank,bz.dep-capDep);
      if(bz.dep>0n&&depRate>0n){const i=bz.dep*depRate/1000000n;bz.dep+=i;bank.dep+=i;eco.totals.depositInterest+=i;}
    }
    // h. Deperimento delle scorte.
    for(let t=0;t<NT;t++)for(let g=0;g<NG;g++){
      const s=B[t].s[g];
      if(s&&K.spoil[g]){const q=Math.floor(s*K.spoil[g]/1000);if(q){B[t].s[g]-=q;wk.gs[g]+=q;}}
    }
    if(stalls.length){
      const sup=ctx.supplied[id]=new Array(NG).fill(0);
      for(const st of stalls)for(let g=0;g<NG;g++)sup[g]+=st.start[g]-st.s[g];
      const done=new Set();
      for(const st of stalls)if(!closeStall(eco,topo,K,wk,st,week))done.add(st.cv);
      if(done.size)eco.caravans=eco.caravans.filter(v=>!done.has(v));
    }
    // i. Carovane in partenza verso i luoghi collegati dove la merce vale di più.
    dispatch(eco,topo,id,week,K,wk,ctx);
    // j. Chiusure dopo perdite prolungate, aperture dove c'è domanda (finanziate da un prestito d'avvio).
    for(let t=0;t<NT;t++){
      const def=K.types[t],bz=B[t];
      if(bz.n>0&&bz.loss>=P.business.closeAfter){
        bz.n--;bz.loss=Math.floor(P.business.closeAfter/2);pl.cl+=1000;
        event(eco,week,'closure',id,`A ${id} chiude un’attività (${def.name}) dopo ${P.business.closeAfter} settimane in perdita; ne restano ${bz.n}`);
        if(bz.n===0&&bz.debt>0n){
          const rep=minB(bz.cash,bz.debt);bz.cash-=rep;bank.r+=rep;bz.debt-=rep;bank.loans-=rep;
          if(bz.debt>0n){
            const lost=bz.debt;bank.loans-=lost;bz.debt=0n;eco.totals.writtenOff+=lost;
            event(eco,week,'bankrupt',id,`Fallimento a ${id} (${def.name}): debito non rimborsato di ${wallet(lost).label}`,lost);
          }
        }
        continue;
      }
      const workers=sum.workers[def.job]||0,idleT=workers-bz.n*def.slots;
      if(idleT<Math.ceil(def.slots/2)||bz.loss>0)continue;
      const wage=wageOf(K,def.job,pl.w),bill=BigInt(def.slots)*wage,startup=bill*BigInt(P.bank.startupWeeks);
      const scarce=def.main>=0&&pl.i[def.main]>=P.business.openPrice;
      const profitable=bz.n>0&&bz.pr*1000n>bill*BigInt(bz.n)*BigInt(P.business.openProfit)&&(def.main<0||cover(K,pl,def.main,total(pl.b,def.main))<=1000);
      const tradeStart=t===TRADE&&opportunity(eco,topo,id,K)>bill;
      if(t===TRADE?!tradeStart||!(bz.n===0||profitable):!scarce&&!profitable)continue;
      const opens=Math.min(P.business.maxOpen,Math.max(1,Math.floor(idleT/def.slots)));
      for(let k=0;k<opens;k++){
        if(bank.cr>=week||lendable(K,bank)<startup)break;
        bank.r-=startup;bank.loans+=startup;bz.debt+=startup;bz.cash+=startup;eco.totals.loansIssued+=startup;bz.n++;
        event(eco,week,'opening',id,`A ${id} apre un’attività (${def.name}); ora sono ${bz.n}`);
      }
    }
    ctx.stats[id]={want,got,inNeed,idle,vac,wtot,adults:sum.adults,unemployed:sum.unemployed,wealth:sum.wealth,alive};
  }
  /* Occasione di commercio: margine stimato in Scintille per settimana di una casa mercantile (capacità di una casa, merce e
     collegamento migliori, al netto del margine richiesto e del costo del viaggio, diviso per le settimane di andata e ritorno). */
  function opportunity(eco,topo,id,K){
    const pl=eco.places[id],C=K.P.caravans,cap=K.types[TRADE].slots*C.perMerchant;
    let best=0n;
    for(const to of topo.by.get(id).links){
      const dest=eco.places[to],weeks=travel(topo,id,to);
      for(let g=0;g<NG;g++){
        if(!K.trade[g])continue;
        const up=unit(K,pl,g),gain=Math.floor(unit(K,dest,g)*1000/(1000+C.margin+C.costPerWeek*weeks))-up;
        if(gain<=0)continue;
        const surplus=total(pl.b,g)-Math.floor(pl.d[g]*K.cover[g]/1000*C.keepCover/1000);
        const room=Math.floor(dest.d[g]*K.cover[g]/1000*C.fillCover/1000)-total(dest.b,g);
        const q=Math.min(cap,surplus,room);
        if(q>0){const v=BigInt(q)*BigInt(gain)/1000000n/BigInt(2*weeks+1);if(v>best)best=v;}     // per settimana di andata, banco e ritorno
      }
    }
    return best;
  }
  function dispatch(eco,topo,id,week,K,wk,ctx){
    const pl=eco.places[id],th=pl.b[TRADE],C=K.P.caravans,B=pl.b;
    ctx.exported[id]=new Array(NG).fill(0);
    if(!th.n||!th.e)return;
    let capLeft=th.e*C.perMerchant;
    for(const to of topo.by.get(id).links){
      if(capLeft<=0)break;
      const dest=eco.places[to],weeks=travel(topo,id,to),cargo=new Array(NG).fill(0),pend=ctx.transit[to]||(ctx.transit[to]=new Array(NG).fill(0));
      let cost=0n,any=0;
      for(let g=0;g<NG&&capLeft>0;g++){
        if(!K.trade[g])continue;
        const up=unit(K,pl,g),uq=unit(K,dest,g);
        if(uq*1000<=up*(1000+C.margin+C.costPerWeek*weeks))continue;
        const have=total(B,g),others=have-th.s[g];
        const surplus=Math.min(others,have-Math.floor(pl.d[g]*K.cover[g]/1000*C.keepCover/1000));
        const room=Math.floor(dest.d[g]*K.cover[g]/1000*C.fillCover/1000)-total(dest.b,g)-pend[g];
        const want=Math.min(surplus,room,capLeft);
        if(want<=0)continue;
        // Credito commerciale: se la cassa non basta, la banca anticipa il carico entro il limite di credito della casa.
        const reserve=bufferOf(K,th,TRADE,pl.w)*BigInt(K.P.business.spendableBuffer)/1000n,needCash=ceilCost(want,up)+reserve;
        if(th.cash<needCash&&th.loss<K.P.business.closeAfter)
          borrow(eco,K,th,eco.banks[topo.by.get(id).c],needCash-th.cash,BigInt(th.n*K.types[TRADE].slots)*wageOf(K,'merchant',pl.w)*BigInt(K.P.bank.creditWeeks),week);
        const q=afford(maxB(0n,th.cash-reserve),up,want);
        if(q<=0)continue;
        const pay=ceilCost(q,up);
        th.cash-=pay;payHolders(B,takeFrom(B,g,q,TRADE),pay);
        cargo[g]+=q;cost+=pay;capLeft-=q;any+=q;pend[g]+=q;ctx.exported[id][g]+=q;
      }
      if(any){
        eco.caravans.push({id:++eco.seq,f:id,t:to,c:cargo,m:0n,k:cost,d:week+weeks,b:0,s:week});
        eco.totals.shipped+=any;wk.shipped+=any;
      }
    }
  }
  function bankStep(eco,topo,c,week,K,wk){
    const bank=eco.banks[c],P=K.P.bank;
    const equity=bank.r+bank.loans-bank.dep;
    if(equity<0n){
      // Insolvenza: i depositi si riducono della perdita, in proporzione; il credito si ferma per alcune settimane.
      const list=[];
      for(const id of topo.byCont.get(c))for(const b of eco.places[id].b)if(b.dep>0n)list.push(b);
      const cut=minB(-equity,bank.dep),parts=splitBig(cut,list.map(b=>b.dep));
      for(let i=0;i<list.length;i++)list[i].dep-=parts[i];
      bank.dep-=cut;eco.totals.haircut+=cut;bank.cr=week+P.crisisWeeks;
      event(eco,week,'insolvency',c,`La banca del continente ${c} è insolvente: depositi ridotti di ${wallet(cut).label}`,cut);
      return;
    }
    // Utili della banca oltre il capitale richiesto: alle tesorerie del continente, in proporzione agli abitanti.
    const target=bank.dep*BigInt(P.capitalTarget)/1000n+bank.k;
    if(equity>target){
      const div=minB(lendable(K,bank),(equity-target)*BigInt(P.dividendShare)/1000n);
      const realms=topo.contRealms.get(c);
      if(div>0n&&realms.length){
        const parts=realms.some(x=>x[1]>0)?splitBig(div,realms.map(x=>x[1])):[div,...new Array(realms.length-1).fill(0n)];
        for(let i=0;i<realms.length;i++)eco.treasuries[realms[i][0]]+=parts[i];
        bank.r-=div;wk.bankToTreasury+=div;
      }
    }
  }
  function priceStep(eco,topo,id,week,K,ctx){
    const pl=eco.places[id],st=topo.by.get(id),ps=ctx.stats[id],P=K.P;
    if(!ps)return;
    let wsum=0,isum=0,foodWant=0,foodGot=0;
    for(let g=0;g<NG;g++){
      pl.d[g]=ps.want[g]+ps.inNeed[g]+ctx.exported[id][g];          // domanda locale, materie prime ed esportazioni
      const target=targetIndex(K,cover(K,pl,g,total(pl.b,g)+(ctx.supplied[id]?ctx.supplied[id][g]:0)));   // le merci dei banchi contano come offerta
      pl.i[g]+=Math.trunc((target-pl.i[g])/P.prices.inertia);
      const weight=K.need[g]*K.base[g];wsum+=weight;isum+=weight*pl.i[g];
      if(K.food[g]){foodWant+=ps.want[g];foodGot+=ps.got[g];}
    }
    const priceIndex=Math.round(isum/wsum);
    const wt=clamp(1000+Math.trunc((ps.vac-ps.idle)*500/Math.max(1,ps.wtot))+Math.trunc((priceIndex-1000)/2),500,3000);
    pl.w+=Math.trunc((wt-pl.w)/4);
    const food=foodWant>0?Math.floor((foodWant-foodGot)*1000/foodWant):0;
    const unemployment=ps.adults>0?clamp(Math.floor((ps.unemployed+ps.idle)*1000/ps.adults),0,1000):0;
    const prosperity=ps.alive>0?Number(minB(3000n,ps.wealth*1000n/(BigInt(ps.alive)*BigInt(P.prosperityRef)))):1000;
    const atWar=eco.continents[st.c].war>=week?1:0,dis=pl.dis&&pl.dis[1]>=week?1:0;
    const bankCrisis=eco.banks[st.c].cr>=week;
    let open=0;for(const b of pl.b)open+=b.n;
    const cond=ps.alive>0&&(food>=P.crisis.food||bankCrisis||unemployment>=P.crisis.unemployment||pl.cl>=P.crisis.closures*Math.max(1,Math.ceil(open/20)));
    if(cond&&!pl.cr){pl.cr=1;event(eco,week,'crisis',id,`Crisi economica a ${id}`+(food>=P.crisis.food?': manca il cibo':bankCrisis?': banca insolvente':unemployment>=P.crisis.unemployment?': disoccupazione':': chiusure'));}
    else if(!cond&&pl.cr){pl.cr=0;event(eco,week,'recovery',id,`Fine della crisi a ${id}`);}
    pl.cl=Math.floor(pl.cl*3/4);
    pl.g=[food,priceIndex,pl.w,unemployment,prosperity,pl.cr,atWar,dis,seasonOfDay(week*7+3)];
  }
  function commit(eco,wk){
    const L=eco.ledger;
    for(let g=0;g<NG;g++){
      if(wk.gp[g])L.gProd[g]+=BigInt(wk.gp[g]);
      if(wk.ge[g])L.gEat[g]+=BigInt(wk.ge[g]);
      if(wk.gu[g])L.gUsed[g]+=BigInt(wk.gu[g]);
      if(wk.gs[g])L.gSpoil[g]+=BigInt(wk.gs[g]);
    }
  }
  function step(eco,week,env){
    const topo=eco&&topos.get(eco);
    if(!topo||!Number.isSafeInteger(week)||week<eco.week)return false;
    if(week>eco.week){eco.totals.pausedWeeks+=week-eco.week;eco.week=week;}     // intervallo non simulato (pausa dichiarata)
    const K=tables(),pop=env&&env.population,hooks=env&&env.world,wk=newWeek(),counts=seasonCounts(week);
    const burnedBefore=Object.values(eco.ledger.burn).reduce((a,b)=>a+b,0n);
    for(const c of topo.continents)warStep(eco,c,week,hooks,K);
    for(const id of topo.order)calamityStep(eco,id,week,hooks,K);
    const ctx={transit:{},stats:{},stalls:{},flush:{},exported:{},supplied:{}};
    // Regola fiscale uguale per tutto il regno, decisa a inizio settimana: tesoreria oltre `reserveWeeks` settimane di salari
    // pubblici attesi (posti per abitanti ai salari di base) → nessuna imposta sul reddito questa settimana.
    for(const r of topo.realms){
      let bill=0n;
      for(const id of topo.order){const info=topo.by.get(id);if(info.r!==r)continue;for(const [job,share] of Object.entries(K.P.publicJobs))bill+=BigInt(Math.floor(info.pop*share/1000))*wageOf(K,job,1000);}
      ctx.flush[r]=bill>0n&&eco.treasuries[r]>bill*BigInt(K.P.tax.reserveWeeks);
    }
    caravanStep(eco,topo,week,K,wk,ctx);
    for(const cv of eco.caravans)if(!cv.b){const p=ctx.transit[cv.t]||(ctx.transit[cv.t]=new Array(NG).fill(0));for(let g=0;g<NG;g++)p[g]+=cv.c[g];}
    for(const id of topo.order)placeStep(eco,topo,id,week,pop,K,wk,ctx,counts);
    for(const c of topo.continents)bankStep(eco,topo,c,week,K,wk);
    for(const id of topo.order)priceStep(eco,topo,id,week,K,ctx);
    wk.places=ctx.stats;
    commit(eco,wk);
    wk.burned=Object.values(eco.ledger.burn).reduce((a,b)=>a+b,0n)-burnedBefore;
    eco.week=week+1;
    lastWeek.set(eco,wk);
    return true;
  }
  // Intervallo compresso di WorldSim (oltre maxChunks): il mondo economico resta fermo, senza storia retroattiva.
  function pause(eco,toWeek){if(eco&&Number.isSafeInteger(toWeek)&&toWeek>eco.week){eco.totals.pausedWeeks+=toWeek-eco.week;eco.week=toWeek;}}
  function system(get,envOf,options={}){
    const maxChunks=Number.isInteger(options&&options.maxChunks)&&options.maxChunks>0?options.maxChunks:520;
    return {level:3,step:WEEK,maxChunks,resolve(s,from,to,info){
      const eco=get(s);
      if(!eco)return;
      const a=Math.floor(from/WEEK),b=Math.floor(to/WEEK);
      if(info&&info.compressed){pause(eco,b);return;}
      for(let w=a;w<b;w++)step(eco,w,typeof envOf==='function'?envOf(s,w):envOf);
    }};
  }

  /* ---------- lettura ---------- */
  function signals(eco,placeId){
    const pl=eco&&typeof placeId==='string'&&own(eco.places,placeId)?eco.places[placeId]:null;
    if(!pl)return {...neutral};
    return Object.fromEntries(SIG.map((k,i)=>[k,pl.g[i]]));
  }
  function audit(eco){
    if(!eco||!eco.ledger)return {ok:false,problems:['economia assente'],money:null,goods:null,claims:null};
    const L=eco.ledger,problems=[],sumO=o=>Object.values(o).reduce((a,b)=>a+b,0n);
    const accounts=moneyOf(eco),minted=sumO(L.mint),burned=sumO(L.burn);
    const expected=L.open+minted-burned+L.fromHH-L.toHH;
    if(accounts!==expected)problems.push(`denaro: conti ${accounts} contro atteso ${expected}`);
    const neg=(v,label)=>{if(typeof v==='bigint'?v<0n:!(Number.isSafeInteger(v)&&v>=0))problems.push('saldo negativo o non valido: '+label);};
    const claims={},topo=topos.get(eco);
    for(const c of Object.keys(eco.banks)){
      const b=eco.banks[c];neg(b.r,'riserve '+c);neg(b.dep,'depositi '+c);neg(b.loans,'prestiti '+c);
      claims[c]={deposits:b.dep,sumDeposits:0n,loans:b.loans,sumLoans:0n};
    }
    for(const id of Object.keys(eco.places)){
      const pl=eco.places[id],c=claims[pl.c];
      for(let t=0;t<pl.b.length;t++){
        const b=pl.b[t];neg(b.cash,`cassa ${id}/${TYPES[t]}`);neg(b.debt,`debito ${id}/${TYPES[t]}`);neg(b.dep,`deposito ${id}/${TYPES[t]}`);
        for(let g=0;g<NG;g++)neg(b.s[g],`scorta ${id}/${TYPES[t]}/${GOODS[g]}`);
        if(c){c.sumDeposits+=b.dep;c.sumLoans+=b.debt;}else if(b.dep>0n||b.debt>0n)problems.push('crediti senza banca: '+id);
      }
    }
    for(const c of Object.keys(claims)){
      if(claims[c].deposits!==claims[c].sumDeposits)problems.push(`depositi della banca ${c}: ${claims[c].deposits} contro ${claims[c].sumDeposits}`);
      if(claims[c].loans!==claims[c].sumLoans)problems.push(`prestiti della banca ${c}: ${claims[c].loans} contro ${claims[c].sumLoans}`);
    }
    for(const r of Object.keys(eco.treasuries))neg(eco.treasuries[r],'tesoreria '+r);
    for(const v of eco.caravans){neg(v.m,'borsa della carovana '+v.id);for(let g=0;g<NG;g++)neg(v.c[g],'carico della carovana '+v.id);}
    const {stock,transit}=goodsOf(eco),goods={};
    for(let g=0;g<NG;g++){
      const lostBy={},addBy={};let lost=0n,added=0n;
      for(const k of Object.keys(L.gLost)){lostBy[k]=L.gLost[k][g];lost+=L.gLost[k][g];}
      for(const k of Object.keys(L.gAdd)){addBy[k]=L.gAdd[k][g];added+=L.gAdd[k][g];}
      const exp=L.gOpen[g]+L.gProd[g]+added-L.gEat[g]-L.gUsed[g]-L.gSpoil[g]-lost;
      if(exp!==stock[g]+transit[g])problems.push(`merce ${GOODS[g]}: scorte + viaggio ${stock[g]+transit[g]} contro atteso ${exp}`);
      goods[GOODS[g]]={stock:stock[g],transit:transit[g],opening:L.gOpen[g],produced:L.gProd[g],added,addedBy:addBy,eaten:L.gEat[g],
        used:L.gUsed[g],spoiled:L.gSpoil[g],lost,lostBy};
    }
    if(!topo)problems.push('topologia assente: usare create o restore');
    return {ok:problems.length===0,problems,claims,goods,
      money:{accounts,expected,opening:L.open,minted,burned,toHouseholds:L.toHH,fromHouseholds:L.fromHH,mintedBy:{...L.mint},burnedBy:{...L.burn}}};
  }
  function events(eco){
    if(!eco||!Array.isArray(eco.events))return [];
    return eco.events.map(([week,kind,place,text,quantity])=>({week,kind,place,text,quantity}));
  }
  function caravans(eco){
    if(!eco||!Array.isArray(eco.caravans))return [];
    return eco.caravans.map(v=>({id:v.id,from:v.f,to:v.t,cargo:Object.fromEntries(GOODS.map((g,i)=>[g,v.c[i]]).filter(x=>x[1])),
      purse:String(v.m),cost:String(v.k),departed:v.s,due:v.d,back:!!v.b,weeks:v.d-v.s}));
  }
  const S=v=>String(v);
  function stats(eco){
    if(!eco||!eco.places)return null;
    const wk=lastWeek.get(eco)||newWeek(),transit={};
    for(const v of eco.caravans)for(let g=0;g<NG;g++)if(v.c[g])transit[GOODS[g]]=(transit[GOODS[g]]||0)+v.c[g];
    let businesses=0;for(const id in eco.places)for(const b of eco.places[id].b)businesses+=b.n;
    const totals={};for(const [k,v] of Object.entries(eco.totals))totals[k]=typeof v==='bigint'?S(v):v;
    const L=eco.ledger,sumO=o=>Object.values(o).reduce((a,b)=>a+b,0n),perGood=a=>Object.fromEntries(GOODS.map((g,i)=>[g,a[i]]));
    return {week:eco.week,places:Object.keys(eco.places).length,businesses,caravans:eco.caravans.length,transit,counts:{...eco.counts},totals,
      money:{accounts:S(moneyOf(eco)),minted:S(sumO(L.mint)),burned:S(sumO(L.burn)),toHouseholds:S(L.toHH),fromHouseholds:S(L.fromHH)},
      treasuries:Object.fromEntries(Object.entries(eco.treasuries).map(([k,v])=>[k,S(v)])),
      banks:Object.fromEntries(Object.entries(eco.banks).map(([k,b])=>[k,{reserve:S(b.r),deposits:S(b.dep),loans:S(b.loans),crisisUntil:b.cr}])),
      lastWeek:{wages:S(wk.wages),spend:S(wk.spend),tax:S(wk.tax),publicWages:S(wk.publicWages),businessTax:S(wk.businessTax),licenses:S(wk.licenses),
        bankToTreasury:S(wk.bankToTreasury),tariffs:S(wk.tariffs),liquidations:S(wk.liquidations),minted:S(wk.minted),burned:S(wk.burned),shipped:wk.shipped,
        produced:perGood(wk.gp),eaten:perGood(wk.ge),used:perGood(wk.gu),spoiled:perGood(wk.gs)},
      bytes:serialize(eco).length};
  }
  function report(eco,placeId){
    const pl=eco&&typeof placeId==='string'&&own(eco.places,placeId)?eco.places[placeId]:null;
    if(!pl)return null;
    const K=tables(),sig=signals(eco,placeId),bank=eco.banks[pl.c];
    const seen=(lastWeek.get(eco)||{}).places?.[placeId];      // ultima settimana risolta in questa sessione (non salvata)
    const prices=GOODS.map((g,i)=>({id:g,name:K.P.goods[g].name,index:pl.i[i],price:K.base[i]*pl.i[i]/1000,stock:total(pl.b,i),demand:pl.d[i],
      wanted:seen?seen.want[i]:0,consumed:seen?seen.got[i]:0}));
    const businesses=TYPES.map((t,i)=>({id:t,name:K.types[i].name,open:pl.b[i].n,employed:pl.b[i].e,cash:S(pl.b[i].cash),debt:S(pl.b[i].debt),deposit:S(pl.b[i].dep)}));
    const pct=v=>format.format(Math.round(v/10))+'%',fmtPrice=p=>format.format(Math.round(p*10)/10)+' Scintille';
    const incoming=eco.caravans.filter(v=>!v.b&&v.t===placeId).length,outgoing=eco.caravans.filter(v=>v.f===placeId).length;
    const show=['bread','water','grain','ore','potion'].map(g=>prices[GI[g]]);
    const lines=[
      `Settimana ${eco.week} · ${SEASONS[sig.season]} · ${sig.war?'in guerra':'in pace'}`+(sig.disaster&&pl.dis?` · ${K.P.calamities[pl.dis[0]].name}`:'')+(sig.crisis?' · crisi in corso':''),
      'Prezzi: '+show.map(p=>`${p.name.toLowerCase()} ${fmtPrice(p.price)} (${pct(p.index)})`).join(', '),
      `Scarsità di cibo ${pct(sig.foodScarcity)} · disoccupazione ${pct(sig.unemployment)} · salari al ${pct(sig.wageIndex)} · prosperità ${pct(sig.prosperity)}`,
      'Attività aperte: '+(businesses.filter(b=>b.open).map(b=>`${b.open} ${b.name}`).join(', ')||'nessuna'),
      `Banca del continente ${pl.c}: riserve ${wallet(bank.r).label}, depositi ${wallet(bank.dep).label}, prestiti ${wallet(bank.loans).label}`+(bank.cr>=eco.week-1?' · insolvente di recente':''),
      `Tesoreria di ${pl.r}: ${wallet(eco.treasuries[pl.r]).label}`,
      `Carovane: ${incoming} in arrivo, ${outgoing} partite da qui`
    ];
    return {id:placeId,week:eco.week,title:`Economia di ${placeId}`,signals:sig,prices,businesses,lines,
      bank:{continent:pl.c,reserve:S(bank.r),deposits:S(bank.dep),loans:S(bank.loans)},treasury:{realm:pl.r,funds:S(eco.treasuries[pl.r])}};
  }

  /* ---------- salvataggio e ripristino ---------- */
  const trim=a=>{let n=a.length;while(n>0&&!a[n-1])n--;return a.slice(0,n);};
  function serialize(eco){
    if(!eco||!eco.places)return 'null';
    const places={};
    for(const id of Object.keys(eco.places).sort()){
      const p=eco.places[id];
      places[id]=[p.w,p.i,p.d,p.b.map(b=>[b.n,S(b.cash),S(b.debt),S(b.dep),b.loss,S(b.pr),b.e,trim(b.s)]),p.dis?[p.dis[0],p.dis[1]]:0,p.g,p.cl,p.cr,p.c,p.r];
    }
    const L=eco.ledger,mapS=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,S(v)])),rows=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,v.map(S)]));
    return JSON.stringify({schema:SCHEMA,seed:eco.seed,week:eco.week,seq:eco.seq,places,
      banks:Object.fromEntries(Object.entries(eco.banks).map(([c,b])=>[c,[S(b.r),S(b.dep),S(b.loans),S(b.k),b.cr]])),
      treasuries:mapS(eco.treasuries),continents:Object.fromEntries(Object.entries(eco.continents).map(([c,x])=>[c,[x.war,x.at]])),
      caravans:eco.caravans.map(v=>[v.id,v.f,v.t,trim(v.c),S(v.m),S(v.k),v.d,v.b,v.s]),
      ledger:{open:S(L.open),mint:mapS(L.mint),burn:mapS(L.burn),toHH:S(L.toHH),fromHH:S(L.fromHH),
        goods:GOODS.map((g,i)=>[S(L.gOpen[i]),S(L.gProd[i]),S(L.gEat[i]),S(L.gUsed[i]),S(L.gSpoil[i])]),lost:rows(L.gLost),added:rows(L.gAdd)},
      events:eco.events,counts:eco.counts,totals:Object.fromEntries(Object.entries(eco.totals).map(([k,v])=>[k,typeof v==='bigint'?S(v):v]))});
  }
  const bad=what=>{throw new Error('dato non valido: '+what);};
  const need=(ok,what)=>{if(!ok)bad(what);};
  const big=(v,what)=>{const b=bigOf(v);need(b!==null,what);return b;};
  const keys=(o,what)=>{need(object(o),what);const k=Object.keys(o);for(const x of k)need(safeId(x),what+' (chiave)');return k;};
  function stockArray(a,what){
    need(Array.isArray(a)&&a.length<=NG,what);
    const out=new Array(NG).fill(0);
    for(let i=0;i<a.length;i++){need(isInt(a[i],0,1e15),what);out[i]=a[i];}
    return out;
  }
  function parse(raw,places,now){
    const data=typeof raw==='string'?JSON.parse(raw):raw;
    need(object(data)&&data.schema===SCHEMA,'schema');
    need(isInt(data.seed,0,4294967295)&&isInt(data.week,0,1e9)&&isInt(data.seq,0,1e12),'intestazione');
    const K=tables(),topo=topoBuild(places);
    const eco={schema:SCHEMA,seed:data.seed,week:data.week,seq:data.seq,places:{},banks:{},treasuries:{},continents:{},caravans:[],
      ledger:newLedger(),events:[],counts:{},totals:newTotals()};
    for(const id of keys(data.places,'luoghi')){
      const p=data.places[id];
      need(Array.isArray(p)&&p.length===10,'luogo '+id);
      need(isInt(p[0],300,5000),'salari '+id);
      need(Array.isArray(p[1])&&p[1].length===NG&&p[1].every(v=>isInt(v,100,10000)),'prezzi '+id);
      need(Array.isArray(p[2])&&p[2].length===NG&&p[2].every(v=>isInt(v,0,1e15)),'domanda '+id);
      need(Array.isArray(p[3])&&p[3].length===NT,'attività '+id);
      const b=p[3].map((x,t)=>{
        need(Array.isArray(x)&&x.length===8&&isInt(x[0],0,1e7)&&isInt(x[4],0,1e7)&&isInt(x[6],0,1e10),`attività ${id}/${t}`);
        const pr=signedOf(x[5]);need(pr!==null,`utile ${id}/${t}`);
        return {n:x[0],cash:big(x[1],'cassa'),debt:big(x[2],'debito'),dep:big(x[3],'deposito'),loss:x[4],pr,e:x[6],s:stockArray(x[7],'scorte'),wp:0n};
      });
      const dis=p[4]===0?null:(need(Array.isArray(p[4])&&own(K.P.calamities,p[4][0])&&isInt(p[4][1],0,1e9),'calamità '+id),[p[4][0],p[4][1]]);
      need(Array.isArray(p[5])&&p[5].length===SIG.length&&p[5].every(v=>isInt(v,0,100000)),'segnali '+id);
      need(isInt(p[6],0,1e9)&&(p[7]===0||p[7]===1)&&safeId(p[8])&&safeId(p[9]),'stato '+id);
      eco.places[id]={w:p[0],i:p[1].slice(),d:p[2].slice(),b,dis,g:p[5].slice(),cl:p[6],cr:p[7],c:p[8],r:p[9]};
    }
    for(const c of keys(data.banks,'banche')){
      const b=data.banks[c];
      need(Array.isArray(b)&&b.length===5&&Number.isSafeInteger(b[4])&&b[4]>=-1,'banca '+c);
      eco.banks[c]={r:big(b[0],'riserve'),dep:big(b[1],'depositi'),loans:big(b[2],'prestiti'),k:big(b[3],'capitale'),cr:b[4]};
    }
    for(const r of keys(data.treasuries,'tesorerie'))eco.treasuries[r]=big(data.treasuries[r],'tesoreria '+r);
    for(const c of keys(data.continents,'continenti')){
      const x=data.continents[c];
      need(Array.isArray(x)&&Number.isSafeInteger(x[0])&&x[0]>=-1&&(x[1]===0||x[1]===1),'continente '+c);
      eco.continents[c]={war:x[0],at:x[1]};
    }
    need(Array.isArray(data.caravans)&&data.caravans.length<=1e6,'carovane');
    for(const v of data.caravans){
      need(Array.isArray(v)&&v.length===9&&isInt(v[0],1,1e12)&&safeId(v[1])&&safeId(v[2])&&v[1]!==v[2]&&isInt(v[6],0,1e9)&&(v[7]===0||v[7]===1)&&isInt(v[8],0,1e9),'carovana');
      need(own(eco.places,v[1])&&own(eco.places,v[2]),'carovana fra luoghi sconosciuti');
      eco.caravans.push({id:v[0],f:v[1],t:v[2],c:stockArray(v[3],'carico'),m:big(v[4],'borsa'),k:big(v[5],'costo'),d:v[6],b:v[7],s:v[8]});
    }
    const L=data.ledger;
    need(object(L),'registro');
    eco.ledger.open=big(L.open,'apertura');eco.ledger.toHH=big(L.toHH,'famiglie');eco.ledger.fromHH=big(L.fromHH,'famiglie');
    for(const k of keys(L.mint,'emissioni'))eco.ledger.mint[k]=big(L.mint[k],'emissione');
    for(const k of keys(L.burn,'distruzioni'))eco.ledger.burn[k]=big(L.burn[k],'distruzione');
    need(Array.isArray(L.goods)&&L.goods.length===NG,'registro merci');
    L.goods.forEach((row,g)=>{
      need(Array.isArray(row)&&row.length===5,'registro merci');
      eco.ledger.gOpen[g]=big(row[0],'merci');eco.ledger.gProd[g]=big(row[1],'merci');eco.ledger.gEat[g]=big(row[2],'merci');
      eco.ledger.gUsed[g]=big(row[3],'merci');eco.ledger.gSpoil[g]=big(row[4],'merci');
    });
    for(const [field,target] of [['lost','gLost'],['added','gAdd']])for(const k of keys(L[field],field)){
      need(Array.isArray(L[field][k])&&L[field][k].length===NG,field);eco.ledger[target][k]=L[field][k].map(v=>big(v,field));
    }
    need(Array.isArray(data.events)&&data.events.length<=10000,'eventi');
    for(const e of data.events){
      need(Array.isArray(e)&&e.length===5&&isInt(e[0],0,1e9)&&typeof e[1]==='string'&&typeof e[2]==='string'&&typeof e[3]==='string'&&typeof e[4]==='string'&&e[3].length<=500,'evento');
      eco.events.push(e.slice());
    }
    for(const k of keys(data.counts,'contatori')){need(isInt(data.counts[k],0,1e12),'contatore');eco.counts[k]=data.counts[k];}
    need(object(data.totals),'totali');
    for(const k of Object.keys(eco.totals)){
      const v=data.totals[k];
      if(typeof eco.totals[k]==='bigint')eco.totals[k]=big(v,'totale '+k);else{need(isInt(v,0,1e18),'totale '+k);eco.totals[k]=v;}
    }
    reconcile(eco,K,topo);
    topos.set(eco,topo);
    return eco;
  }
  /* Riallinea un salvataggio ai luoghi attuali: luoghi e continenti nuovi nascono con denaro emesso («nuovo luogo»), quelli
     scomparsi distruggono denaro e merci («luogo scomparso»), le carovane verso luoghi scomparsi sono perdute. */
  function reconcile(eco,K,topo){
    const cur=new Set(topo.order);
    for(const v of eco.caravans.slice())if(!cur.has(v.f)||!cur.has(v.t)){
      for(let g=0;g<NG;g++)lose(eco,'luogo scomparso',g,v.c[g]);
      burn(eco,'luogo scomparso',v.m);
      eco.caravans.splice(eco.caravans.indexOf(v),1);
    }
    for(const id of Object.keys(eco.places)){
      const pl=eco.places[id],info=topo.by.get(id),bank=eco.banks[pl.c];
      if(info&&info.c===pl.c){pl.r=info.r;continue;}
      for(const b of pl.b){
        if(bank){bank.dep-=minB(bank.dep,b.dep);bank.loans-=minB(bank.loans,b.debt);}
        if(info&&eco.banks[info.c]){eco.banks[info.c].dep+=b.dep;eco.banks[info.c].loans+=b.debt;}
      }
      if(info){pl.c=info.c;pl.r=info.r;continue;}
      for(const b of pl.b){
        burn(eco,'luogo scomparso',b.cash);
        for(let g=0;g<NG;g++)lose(eco,'luogo scomparso',g,b.s[g]);
        eco.totals.removedClaims+=b.dep+b.debt;
      }
      delete eco.places[id];
    }
    for(const id of topo.order)if(!own(eco.places,id)){
      const pl=newPlace(K,topo.by.get(id));
      eco.places[id]=pl;
      for(const b of pl.b){mint(eco,'nuovo luogo',b.cash);for(let g=0;g<NG;g++)addGoods(eco,'nuovo luogo',g,b.s[g]);}
    }
    for(const c of Object.keys(eco.banks))if(!topo.byCont.has(c)){burn(eco,'luogo scomparso',eco.banks[c].r);delete eco.banks[c];}
    for(const c of topo.continents){
      if(!own(eco.banks,c)){const k=bankCapital(K,topo,c);eco.banks[c]=newBank(k);mint(eco,'nuovo luogo',k);}
      if(!own(eco.continents,c))eco.continents[c]={war:-1,at:0};
    }
    for(const c of Object.keys(eco.continents))if(!topo.byCont.has(c))delete eco.continents[c];
    for(const r of Object.keys(eco.treasuries))if(!topo.realms.includes(r)){burn(eco,'luogo scomparso',eco.treasuries[r]);delete eco.treasuries[r];}
    for(const r of topo.realms)if(!own(eco.treasuries,r)){const v=treasuryStart(K,topo,r);eco.treasuries[r]=v;mint(eco,'nuovo luogo',v);}
    // Ordine stabile delle chiavi (come in create), così il salvataggio non dipende dalla storia dei riallineamenti.
    const sorted=o=>Object.fromEntries(Object.keys(o).sort().map(k=>[k,o[k]]));
    eco.places=sorted(eco.places);eco.banks=sorted(eco.banks);eco.treasuries=sorted(eco.treasuries);eco.continents=sorted(eco.continents);
  }
  /* Registro incoerente (dati manomessi ma ben formati): si riparte dai conti attuali, con un evento. */
  function rebase(eco){
    const L=eco.ledger,sumO=o=>Object.values(o).reduce((a,b)=>a+b,0n);
    for(const c of Object.keys(eco.banks)){let d=0n,l=0n;for(const id in eco.places)if(eco.places[id].c===c)for(const b of eco.places[id].b){d+=b.dep;l+=b.debt;}eco.banks[c].dep=d;eco.banks[c].loans=l;}
    L.open=moneyOf(eco)-sumO(L.mint)+sumO(L.burn)-L.fromHH+L.toHH;
    const {stock,transit}=goodsOf(eco);
    for(let g=0;g<NG;g++){
      let lost=0n,added=0n;for(const k in L.gLost)lost+=L.gLost[k][g];for(const k in L.gAdd)added+=L.gAdd[k][g];
      L.gOpen[g]=stock[g]+transit[g]-L.gProd[g]-added+L.gEat[g]+L.gUsed[g]+L.gSpoil[g]+lost;
    }
  }
  function restore(raw,places,now){
    let eco=null;
    try{eco=parse(raw,places,now);}catch{eco=null;}
    if(eco){
      try{
        const a=audit(eco);
        if(!a.ok){
          const negative=a.problems.some(p=>/negativo/.test(p));
          if(negative)eco=null;else{rebase(eco);if(audit(eco).ok)event(eco,eco.week,'repair','',`Registro economico riallineato al caricamento`);else eco=null;}
        }
      }catch{eco=null;}
    }
    if(eco)return eco;
    let seed=0;
    try{const d=typeof raw==='string'?JSON.parse(raw):raw;if(object(d)&&isInt(d.seed,0,4294967295))seed=d.seed;}catch{seed=0;}
    try{eco=create(seed,places,now);}catch{eco=create(0,[],0);}
    event(eco,eco.week,'repair','',`Registro economico ricreato: salvataggio mancante o danneggiato`);
    return eco;
  }

  window.LivingEconomy={WEEK,DAY,SCHEMA,GOODS:GOODS.slice(),TYPES:TYPES.slice(),params,denominations,neutral,
    create,restore,serialize,step,system,signals,audit,report,events,stats,caravans,wallet};
})();
