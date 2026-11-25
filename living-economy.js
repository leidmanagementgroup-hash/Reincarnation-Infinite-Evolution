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
     settimana con gli importi APPLICATI restituiti, segnali in millesimi con signals(eco, placeId), compreso labor per mestiere.
     La settimana è divisibile (un luogo o una banca per parte) con lo stesso risultato a qualunque budget: vedi system e weekParts.
     Tutti i parametri sono tabelle esportate e PROVVISORI, da approvare: nessun effetto sul bilanciamento del gioco esistente. */
  const DAY=1440,WEEK=10080,SCHEMA=1,DAYS_PER_SEASON=12;
  const GOODS=['grain','seeds','herb','ore','work','wool','essence','water','bread','potion'];
  const TYPES=['farm','herbary','mine','workshop','pasture','sanctum','well','bakery','apothecary','smithy','trade','inn'];
  const NG=GOODS.length,NT=TYPES.length,TRADE=TYPES.indexOf('trade'),INN=TYPES.indexOf('inn');
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
      farm:{name:'Fattorie',job:'farmer',slots:8,rural:true,makes:{grain:20000,seeds:3000},season:[1100,1300,1000,500]},
      herbary:{name:'Erboristerie',job:'herbalist',slots:5,rural:true,makes:{herb:12000},season:[1200,1200,900,600]},
      mine:{name:'Miniere',job:'miner',slots:10,makes:{ore:10500}},
      workshop:{name:'Falegnamerie',job:'carpenter',slots:4,makes:{work:10500}},
      pasture:{name:'Pascoli',job:'shepherd',slots:5,rural:true,makes:{wool:13000},season:[1100,1100,1000,800]},
      sanctum:{name:'Santuari dell’essenza',job:'mystic',slots:3,makes:{essence:8000}},
      well:{name:'Pozzi',job:'wellkeeper',slots:4,makes:{water:42000},season:[1000,950,1000,1050]},
      bakery:{name:'Forni',job:'baker',slots:4,makes:{bread:17500},uses:{grain:500}},
      apothecary:{name:'Speziali',job:'alchemist',slots:3,makes:{potion:9000},uses:{herb:500}},
      smithy:{name:'Fucine',job:'smith',slots:3,makes:{work:13000},uses:{ore:150}},
      trade:{name:'Case mercantili',job:'merchant',slots:5,makes:{}},
      // Servizio senza scorte: pasti e alloggi per locandiere a settimana (millesimi), fabbisogno per abitante, prezzo legato ai salari.
      inn:{name:'Locande',job:'innkeeper',slots:3,makes:{},service:{price:2,rate:30000,need:1200}}
    },
    // Salario di base per lavoratore a settimana, in Scintille (scalato dall'indice dei salari del luogo).
    wages:{farmer:35,herbalist:33,miner:35,carpenter:33,shepherd:30,mystic:38,wellkeeper:28,baker:30,alchemist:35,smith:33,
      merchant:40,innkeeper:33,guard:35,scholar:38,healer:38,laborer:25},
    // Quote attese di lavoratori per professione, in millesimi degli abitanti (circa l'80% degli adulti): servono a fondare le
    // attività iniziali; poi è la popolazione a dire chi lavora davvero (summary.workers).
    workforce:{farmer:45,herbalist:32,miner:18,carpenter:10,shepherd:18,mystic:12,wellkeeper:27,baker:57,alchemist:23,smith:6,
      merchant:50,innkeeper:40,guard:30,scholar:16,healer:20,laborer:40},
    // Posti pagati dalla tesoreria per 1000 abitanti (in guerra le guardie raddoppiano e sono pagate una volta e mezza).
    publicJobs:{guard:34,scholar:18,healer:22,laborer:40},
    // Imposte in millesimi (licenza in Scintille per attività a settimana). L'aliquota sul reddito cala da `incomeMax` a zero mentre
    // la cassa sale da zero al doppio di `reserveWeeks` settimane di salari pubblici; oltre, l'eccedenza torna in sussidi e opere.
    tax:{income:100,incomeMax:150,profit:150,license:1,tariff:100,treasuryPerCapita:14,reserveWeeks:4,reliefShare:125,
      levy:6,levyBand:150},      // perequazione: millesimi a settimana dello scarto oltre la fascia (millesimi) attorno alla media del regno
    // Moneta: le distruzioni registrate (saccheggi, calamità, carovane) si riconiano in `reissueWeeks`; le emissioni in eccesso si
    // ritirano dalle tesorerie sopra la riserva. La moneta torna così al suo livello.
    coin:{reissueWeeks:26,retireShare:125},
    bank:{capitalPerCapita:5,loanRate:6,depositRate:2,reserveRatio:200,capitalTarget:100,dividendShare:125,creditWeeks:3,
      startupWeeks:2,crisisWeeks:6,depositCapWeeks:1,recapWeeks:26,recapShare:250,seriousLoss:30},
    business:{bufferWeeks:1,startCashWeeks:2,dividendShare:800,depositShare:250,closeAfter:12,maxOpen:3,openPrice:1100,openProfit:100,
      openMargin:100,spendableBuffer:500,idlePay:60},
    // Case mercantili: vendita al dettaglio (millesimi dell'incasso dei produttori) e clienti serviti da un mercante.
    retail:{fee:120,perMerchant:20},
    // Case senza mercato: acqua attinta per adulto a settimana (millesimi) e grano per 1000 millesimi di pane di casa;
    // rival: quota della domanda che le famiglie potrebbero fare da sé e che limita il prezzo del mercato.
    home:{water:1500,breadGrain:600,rival:200,rivalWater:700},
    // Prezzi: copertura = scorte / domanda settimanale, relativa alla copertura obiettivo della merce (1000 = all'obiettivo);
    // indice in millesimi del prezzo di base. Lo sforzo dei produttori cala oltre `effortFull` e si ferma a `effortZero`.
    prices:{riseSlope:1000,fallSlope:200,floor:600,ceil:2500,inertia:2,effortFull:1500,effortZero:3000,
      necessity:250,luxury:500,wealthLuxury:500,wealthNeed:100,habitWeeks:256,priority:['water','bread','grain','herb','wool','work','ore','seeds','potion','essence']},
    // Eventi: probabilità in millesimi per settimana.
    events:{warStart:5,warMin:4,warSpan:12,warProduction:700,calamity:3,caravanLoss:3,caravanLossOcean:10,caravanLossWar:80,
      caravanLossDisaster:20,raidShare:333,plunderCash:30,plunderStock:80,plunderBank:25,mintCapPerCapita:2,harvestSpread:100},
    calamities:{
      fire:{name:'Incendio',weight:3,weeks:2,stock:150,cash:50,production:{all:850}},
      flood:{name:'Alluvione',weight:2,weeks:3,stockGoods:{grain:500,seeds:500,bread:500},production:{farm:400,pasture:600}},
      drought:{name:'Siccità',weight:2,weeks:8,production:{farm:120,herbary:300,pasture:500,well:400}},
      plague:{name:'Epidemia',weight:2,weeks:4,production:{all:600},demand:{potion:2000}},
      quake:{name:'Terremoto',weight:1,weeks:3,stock:150,cash:20,production:{mine:500,workshop:700}}
    },
    // Carovane: capacità per mercante a settimana (millesimi); coperture relative all'obiettivo della merce (millesimi).
    caravans:{perMerchant:120000,margin:100,costPerWeek:40,keepCover:1250,fillCover:1000,buyCover:1500,landWeeks:1,oceanMin:2,oceanSpan:2},
    crisis:{food:300,unemployment:250,jump:150,closures:2500},
    labor:{min:100,max:3000,inertia:4},
    prosperity:{income:500,wealth:250,basket:250,incomeWeeks:8},
    limits:{events:240,tx:256}
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
      return {id,name:d.name,job:d.job,slots:d.slots,makes,uses,season:d.season||null,main:makes.length?makes[0][0]:-1,service:d.service||null,rural:!!d.rural,
        yield:d.season?Math.floor(d.season.reduce((a,b)=>a+b,0)/4):1000};
    });
    return {P,types,base:g.map(x=>x.base),need:g.map(x=>x.need),spoil:g.map(x=>x.spoil||0),cover:g.map(x=>x.cover||2000),trade:g.map(x=>!!x.trade),food:g.map(x=>!!x.food),
      luxury:g.map(x=>!!x.luxury),gseason:g.map(x=>x.season||null),priority:P.prices.priority.map(id=>GI[id]),
      calKinds:Object.keys(P.calamities)};
  }
  const jobsOf=K=>[...new Set([...K.types.map(d=>d.job),...Object.keys(K.P.publicJobs)])];
  const seasonOfDay=d=>Math.floor(d/DAYS_PER_SEASON)%4;
  function seasonCounts(week){const c=[0,0,0,0];for(let d=0;d<7;d++)c[seasonOfDay(week*7+d)]++;return c;}
  const mix=(arr,c)=>arr?Math.floor((arr[0]*c[0]+arr[1]*c[1]+arr[2]*c[2]+arr[3]*c[3])/7):1000;
  const wageOf=(K,job,index)=>BigInt(Math.floor((K.P.wages[job]||0)*index/1000));

  /* ---------- topologia (non salvata: si ricostruisce dai luoghi passati a create/restore) ---------- */
  const topos=new WeakMap(),lastWeek=new WeakMap(),running=new WeakMap();
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
    const byCont=new Map(continents.map(c=>[c,list.filter(p=>p.c===c).map(p=>p.id)])),byRealm=new Map(realms.map(r=>[r,list.filter(p=>p.r===r).map(p=>p.id)]));
    return {order:list.map(p=>p.id),by,continents,realms,byCont,byRealm,
      contRealms:new Map(continents.map(c=>[c,[...new Set(list.filter(p=>p.c===c).map(p=>p.r))].sort()]))};
  }
  function travel(topo,a,b){
    const C=params.caravans,pa=topo.by.get(a),pb=topo.by.get(b);
    if(pa.c===pb.c)return C.landWeeks;
    return C.oceanMin+roll(0,'rotta',a<b?a+'|'+b:b+'|'+a)%(C.oceanSpan+1);
  }

  /* ---------- stato ---------- */
  const zerosB=()=>new Array(NG).fill(0n);
  function newLedger(){return {open:0n,mint:{},burn:{},toHH:0n,fromHH:0n,extIn:{},extOut:{},gOpen:zerosB(),gProd:zerosB(),gEat:zerosB(),gUsed:zerosB(),gSpoil:zerosB(),gLost:{},gAdd:{}};}
  function newTotals(){return {shipped:0,delivered:0,returned:0,lostCargo:0,arrivals:0,pausedWeeks:0,loansIssued:0n,deposited:0n,
    loanInterestPaid:0n,depositInterest:0n,capitalized:0n,writtenOff:0n,haircut:0n,rounding:0n,removedClaims:0n,recapitalized:0n,relief:0n,services:0n};}
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
  const neutral=Object.freeze({foodScarcity:0,priceIndex:1000,wageIndex:1000,unemployment:0,prosperity:1000,crisis:0,war:0,disaster:0,season:0});
  const SIG=Object.keys(neutral);
  const neutralArray=()=>SIG.map(k=>neutral[k]);
  // `a` abitanti all'ultima settimana, `wr` ricchezza abituale a testa (millesimi di Scintilla), `ur` disoccupazione abituale,
  // `inc` reddito medio a testa (millesimi), `f` attività già fondate sui lavoratori veri, `lab` segnale del lavoro per mestiere.
  function newPlace(K,info){
    const d=demandEstimate(K,info.pop),pl={w:1000,i:new Array(NG).fill(1000),d,b:[],dis:null,g:neutralArray(),cl:0,cr:0,c:info.c,r:info.r,
      a:info.pop,wr:-1,ur:-1,inc:-1,f:0,lab:{}};
    for(const t of K.types){
      const bz=newBiz(),workers=Math.floor(info.pop*(K.P.workforce[t.job]||0)/1000);
      bz.n=workers>0?Math.ceil(workers/t.slots):0;
      bz.cash=BigInt(workers)*wageOf(K,t.job,1000)*BigInt(K.P.business.startCashWeeks);
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
  /* Alla prima settimana le attività si adeguano ai lavoratori che esistono davvero (create conosce solo gli abitanti): la cassa
     iniziale si ripartisce, senza crearne. */
  function found(K,pl,sum){
    pl.f=1;
    if(pl.b.some(b=>b.debt>0n||b.dep>0n))return;
    let cash=0n;for(const b of pl.b){cash+=b.cash;b.cash=0n;}
    const demand=demandEstimate(K,sum.alive),able=new Array(NG).fill(0),have=K.types.map(d=>sum.workers[d.job]||0);
    K.types.forEach((d,t)=>{if(d.main>=0)able[d.main]+=have[t]*capacityPer(K,t);});
    const weights=K.types.map((d,t)=>{
      // Posti per il fabbisogno con un quarto di margine (campagne: il triplo, a meno ore); chi avanza è in cerca di lavoro.
      const room=d.main>=0?(able[d.main]>0?have[t]*demand[d.main]*(1000+K.spoil[d.main])/1000/able[d.main]:0):t===TRADE?sum.alive/K.P.retail.perMerchant:d.service?sum.alive*d.service.need/d.service.rate:0;
      const w=Math.min(have[t],Math.ceil(room*(d.rural?3:1.25)));
      pl.b[t].n=w>0?Math.ceil(w/d.slots):0;return BigInt(w)*wageOf(K,d.job,1000);
    });
    if(!weights.some(w=>w>0n)){pl.b[TRADE].cash=cash;return;}
    splitBig(cash,weights).forEach((v,t)=>{pl.b[t].cash=v;});
  }
  const aliveIn=(eco,ids)=>{let n=0;for(const id of ids)n+=eco.places[id]?eco.places[id].a:0;return n;};
  function bankCapital(K,topo,c){let pop=0;for(const id of topo.byCont.get(c))pop+=topo.by.get(id).pop;return BigInt(pop)*BigInt(K.P.bank.capitalPerCapita);}
  function treasuryStart(K,topo,r){let pop=0;for(const id of topo.byRealm.get(r))pop+=topo.by.get(id).pop;return BigInt(pop)*BigInt(K.P.tax.treasuryPerCapita);}
  const newBank=k=>({r:k,dep:0n,loans:0n,k,cr:-1,cs:-1});

  function moneyOf(eco){
    let m=0n;
    for(const id in eco.places)for(const b of eco.places[id].b)m+=b.cash;
    for(const c in eco.banks)m+=eco.banks[c].r;
    for(const r in eco.treasuries)m+=eco.treasuries[r];
    for(const v of eco.caravans)m+=v.m;
    return m;
  }
  const sumOf=o=>{let m=0n;for(const k in o)m+=o[k];return m;};
  const expectedMoney=L=>L.open+sumOf(L.mint)-sumOf(L.burn)+L.fromHH-L.toHH+sumOf(L.extIn)-sumOf(L.extOut);
  function goodsOf(eco){
    const stock=new Array(NG).fill(0n),transit=new Array(NG).fill(0n);
    for(const id in eco.places)for(const b of eco.places[id].b)for(let g=0;g<NG;g++)stock[g]+=BigInt(b.s[g]);
    for(const v of eco.caravans)for(let g=0;g<NG;g++)transit[g]+=BigInt(v.c[g]);
    return {stock,transit};
  }
  function create(seed,places,now){
    const K=tables(),topo=topoBuild(places);
    const eco={schema:SCHEMA,seed:seedOf(seed),week:Number.isFinite(now)&&now>=0?Math.ceil(now/WEEK):0,seq:0,places:{},banks:{},treasuries:{},
      continents:{},caravans:[],ledger:newLedger(),events:[],counts:{},totals:newTotals(),tx:[]};
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
  const tally=()=>({gp:new Array(NG).fill(0),ge:new Array(NG).fill(0),gu:new Array(NG).fill(0),gs:new Array(NG).fill(0)});
  function newWeek(){
    return {wages:0n,spend:0n,tax:0n,publicWages:0n,businessTax:0n,licenses:0n,bankToTreasury:0n,tariffs:0n,liquidations:0n,minted:0n,burned:0n,
      services:0n,reissued:0n,retired:0n,recapitalized:0n,shipped:0,...tally()};
  }
  // Registro delle merci di un luogo: si versa a ogni parte, così i conti sono in pari anche a metà settimana.
  function commit(eco,wk,pw){
    const L=eco.ledger;
    for(let g=0;g<NG;g++){
      if(pw.gp[g]){L.gProd[g]+=BigInt(pw.gp[g]);wk.gp[g]+=pw.gp[g];}
      if(pw.ge[g]){L.gEat[g]+=BigInt(pw.ge[g]);wk.ge[g]+=pw.ge[g];}
      if(pw.gu[g]){L.gUsed[g]+=BigInt(pw.gu[g]);wk.gu[g]+=pw.gu[g];}
      if(pw.gs[g]){L.gSpoil[g]+=BigInt(pw.gs[g]);wk.gs[g]+=pw.gs[g];}
    }
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
  // Paga i detentori in proporzione alle quantità prelevate: è il loro ricavo. `fee` (millesimi) va alla casa mercantile che vende.
  function payHolders(B,takes,pay,fee=0n){
    if(pay<=0n||!takes.length)return pay;
    const parts=takes.length===1?[pay]:splitBig(pay,takes.map(x=>x[1]));
    for(let i=0;i<takes.length;i++){
      const b=B[takes[i][0]],cut=fee>0n&&takes[i][0]!==TRADE?parts[i]*fee/1000n:0n;
      b.cash+=parts[i]-cut;b.wp+=parts[i]-cut;
      if(cut>0n){B[TRADE].cash+=cut;B[TRADE].wp+=cut;}
    }
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
  /* Lavoratori (millesimi) che servono per la domanda della merce g, con la copertura attuale: guida il segnale labor e le aperture. */
  function needFor(K,pl,g){
    const c=cover(K,pl,g,total(pl.b,g)),adj=clamp(1000+Math.trunc((1000-Math.min(c,5000))*300/1000),500,1600);
    return pl.d[g]*(1000+K.spoil[g]*K.cover[g]/1000)/1000*adj/1000;       // millesimi di merce a settimana
  }
  const capacityPer=(K,t)=>K.types[t].makes[0][1]*K.types[t].yield/1000;
  // Margine atteso di un lavoratore a settimana (Scintille, Number): ricavo a pieno regime − materie prime − salario.
  function margin(K,pl,t){
    const def=K.types[t],wage=Number(wageOf(K,def.job,pl.w));
    let rev=0;
    if(def.service)rev=def.service.rate/1000*def.service.price*pl.w/1000;
    for(const [g,rate] of def.makes)rev+=rate/1000*def.yield/1000*unit(K,pl,g)/1000;
    for(const [g,per] of def.uses)rev-=def.makes[0][1]/1000*def.yield/1000*per/1000*unit(K,pl,g)/1000;
    return rev-wage;
  }
  // Banca: prelievo dai depositi, prestito entro la quota settimanale del luogo, i limiti di credito e la riserva obbligatoria.
  function withdraw(bz,bank,amount){
    const w=minB(minB(bz.dep,amount),bank.r);
    if(w>0n){bz.dep-=w;bank.dep-=w;bank.r-=w;bz.cash+=w;}
    return w;
  }
  function offset(bz,bank){const x=minB(bz.dep,bz.debt);if(x>0n){bz.dep-=x;bank.dep-=x;bz.debt-=x;bank.loans-=x;}}
  function repay(bz,bank,amount){const x=minB(minB(bz.debt,bz.cash),amount);if(x>0n){bz.cash-=x;bank.r+=x;bz.debt-=x;bank.loans-=x;}}
  function lendable(K,bank){return maxB(0n,bank.r-/*M:riserva*/bank.dep*BigInt(K.P.bank.reserveRatio)/1000n);}
  function borrow(eco,K,ctx,id,bz,bank,amount,limit,week){
    if(/*M:stretta*/bank.cr>=week)return 0n;           // stretta del credito dopo un'insolvenza
    const a=minB(minB(minB(amount,limit-bz.debt),lendable(K,bank)),ctx.quota[id]);
    if(a<=0n)return 0n;
    bank.r-=a;bank.loans+=a;bz.debt+=a;bz.cash+=a;ctx.quota[id]-=a;eco.totals.loansIssued+=a;
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
    const topo=topos.get(eco),ids=topo.byCont.get(c).filter(id=>eco.places[id].a>0);
    if(!ids.length)return;
    const id=ids[roll(eco.seed,'saccheggio',c,week)%ids.length],pl=eco.places[id];
    let gone=0n;
    for(const b of pl.b){
      const cash=b.cash*BigInt(E.plunderCash)/1000n;b.cash-=cash;gone+=cash;
      for(let g=0;g<NG;g++){const q=Math.floor(b.s[g]*E.plunderStock/1000);if(q){b.s[g]-=q;lose(eco,'saccheggio',g,q);}}
    }
    const bank=eco.banks[c],raid=bank.r*BigInt(E.plunderBank)/1000n;
    bank.r-=raid;burn(eco,'saccheggio',gone+raid);
  }
  function calamityStep(eco,id,week,hooks,K){
    const pl=eco.places[id];
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
    else if(pl.a>0&&roll(eco.seed,'calamita',id,week)<K.P.events.calamity*1000)kind=pick();
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
        burn(eco,'carovana',cv.m);
        eco.totals.lostCargo+=q;
        const home=eco.places[cv.f].b[TRADE];home.wp-=cv.k;
        event(eco,week,'caravanLost',cv.f,`Carovana ${cv.f} → ${cv.t} perduta (${cause}): ${units(q)} unità di merci`+(cv.m>0n?` e ${wallet(cv.m).label}`:''),q);
        continue;
      }
      if(r<Math.min(1000,2*p)*1000){
        let taken=0;
        for(let g=0;g<NG;g++){const x=Math.floor(cv.c[g]*E.raidShare/1000);if(x){cv.c[g]-=x;lose(eco,'carovana',g,x);taken+=x;}}
        const m=cv.m*BigInt(E.raidShare)/1000n;cv.m-=m;burn(eco,'carovana',m);
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
    for(const cv of eco.caravans)if(!cv.b){const p=ctx.transit[cv.t]||(ctx.transit[cv.t]=new Array(NG).fill(0));for(let g=0;g<NG;g++)p[g]+=cv.c[g];}
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
  // Cassa di esercizio: una settimana di salari di chi lavora e delle materie prime che trasforma.
  function bufferOf(K,bz,t,index){
    if(!bz.n)return 0n;
    const def=K.types[t],e=Math.max(1,bz.e);
    let b=BigInt(e)*wageOf(K,def.job,index);
    for(const [g,per] of def.uses)b+=BigInt(Math.ceil(e*def.makes[0][1]/1000*per/1000*K.base[g]));
    return b*BigInt(K.P.business.bufferWeeks);
  }

  /* Conti pubblici della settimana, per regno: riconio o ritiro della moneta, salari pubblici ripartiti fra i luoghi in proporzione
     al dovuto (nessun ordine fra i luoghi), aliquota sul reddito secondo la cassa, eccedenze restituite in sussidi e opere. */
  function fiscalStep(eco,topo,week,K,wk,ctx){
    const P=K.P,L=eco.ledger,of=(o,ks)=>ks.reduce((s,k)=>s+(o[k]||0n),0n);
    const excess=of(L.mint,['zecca','riconio'])-of(L.burn,['saccheggio','calamita','carovana','ritiro']);
    const alive=topo.realms.map(r=>aliveIn(eco,topo.byRealm.get(r)));
    if(excess<0n&&alive.some(a=>a>0)){
      const back=minB(-excess,maxB(1n,-excess/BigInt(P.coin.reissueWeeks)));
      splitBig(back,alive).forEach((v,k)=>{eco.treasuries[topo.realms[k]]+=v;});
      mint(eco,'riconio',back);wk.reissued+=back;wk.minted+=back;
    }
    ctx.public={};ctx.relief={};ctx.rate={};ctx.target={};
    for(const r of topo.realms){
      let normal=0n;const rows=[];
      for(const id of topo.byRealm.get(r)){
        const sum=ctx.sum[id],pl=eco.places[id],atWar=eco.continents[topo.by.get(id).c].war>=week,jobs=[];
        let bill=0n;
        for(const [job,share] of Object.entries(P.publicJobs)){
          const posts=Math.floor(sum.alive*share/1000),have=sum.workers[job]||0;
          normal+=BigInt(Math.min(posts,have))*wageOf(K,job,1000);
          const e=Math.min(have,posts*(job==='guard'&&atWar?/*M:guardie*/2:1));
          if(!e)continue;
          let wage=wageOf(K,job,pl.w);if(job==='guard'&&atWar)wage=wage*3n/2n;
          const b=BigInt(e)*wage;jobs.push([job,b,e]);bill+=b;
        }
        rows.push([id,bill,jobs]);
      }
      const target=normal*BigInt(P.tax.reserveWeeks);
      ctx.target[r]=target;
      if(excess>0n&&eco.treasuries[r]>target)(ctx.spare||(ctx.spare=[])).push([r,(eco.treasuries[r]-target)*BigInt(P.coin.retireShare)/1000n]);
      ctx.rate[r]=target>0n?BigInt(clamp(Number(BigInt(P.tax.income)*(2n*target-eco.treasuries[r])/target),excess>0n?P.tax.income:0,P.tax.incomeMax)):BigInt(P.tax.income);
      rows.forEach(([id,,jobs])=>{ctx.public[id]={jobs,funds:0n};});
      const owed=rows.reduce((s,x)=>s+x[1],0n),spare=eco.treasuries[r]-owed-2n*target;
      splitBig(minB(eco.treasuries[r],owed),rows.map(x=>x[1])).forEach((v,k)=>{ctx.public[rows[k][0]].funds=v;});
      if(excess<=0n&&spare>0n){
        const give=spare*BigInt(P.tax.reliefShare)/1000n;
        splitBig(give,rows.map(x=>ctx.sum[x[0]].alive)).forEach((v,k)=>{ctx.relief[rows[k][0]]=v;});
      }
    }
    if(ctx.spare){
      // Ritiro delle emissioni in eccesso, in proporzione alle eccedenze delle tesorerie.
      const pool=ctx.spare.reduce((s,x)=>s+x[1],0n),take=minB(excess,pool);
      splitBig(take,ctx.spare.map(x=>x[1])).forEach((v,k)=>{eco.treasuries[ctx.spare[k][0]]-=v;});
      burn(eco,'ritiro',take);wk.retired+=take;
      for(const r of topo.realms){
        // Dopo il ritiro i fondi assegnati non superano la cassa (l'eccedenza ritirata è sempre sopra la riserva).
        const ids=topo.byRealm.get(r),owed=ids.reduce((s,id)=>s+ctx.public[id].funds,0n);
        if(owed>eco.treasuries[r])splitBig(eco.treasuries[r],ids.map(id=>ctx.public[id].funds)).forEach((v,k)=>{ctx.public[ids[k]].funds=v;});
      }
    }
    // Perequazione dentro il regno: un piccolo tributo sul patrimonio dei luoghi oltre la fascia media passa a quelli sotto la fascia
    // (anticipato dalla tesoreria, entro la cassa libera): il commercio non prosciuga per sempre le città che importano.
    ctx.levy={};
    for(const r of topo.realms){
      const ids=topo.byRealm.get(r).filter(id=>ctx.sum[id].alive>0);
      let wealth=0n,heads=0n,funds=0n;
      for(const id of ids){wealth+=ctx.sum[id].wealth;heads+=BigInt(ctx.sum[id].alive);funds+=ctx.public[id].funds+(ctx.relief[id]||0n);}
      if(heads<=0n||ids.length<2)continue;
      const band=k=>ids.map(id=>wealth*BigInt(ctx.sum[id].alive)*BigInt(1000+k*P.tax.levyBand)/heads/1000n),high=band(1),low=band(-1);
      const over=ids.map((id,k)=>maxB(0n,ctx.sum[id].wealth-high[k])),under=ids.map((id,k)=>maxB(0n,low[k]-ctx.sum[id].wealth)),add=v=>v.reduce((a,b)=>a+b,0n);
      const move=minB(minB(add(over),add(under))*BigInt(P.tax.levy)/1000n,maxB(0n,eco.treasuries[r]-funds));
      if(move<=0n)continue;
      splitBig(move,over).forEach((v,k)=>{ctx.levy[ids[k]]=v;});
      splitBig(move,under).forEach((v,k)=>{ctx.relief[ids[k]]=(ctx.relief[ids[k]]||0n)+v;});
    }
    // Quote di credito: ogni luogo può usare una parte del prestabile della sua banca, secondo gli abitanti.
    ctx.quota={};
    for(const c of topo.continents){
      const ids=topo.byCont.get(c);
      splitBig(lendable(K,eco.banks[c]),ids.map(id=>eco.places[id].a)).forEach((v,k)=>{ctx.quota[ids[k]]=v;});
      for(const id of ids)if(ctx.quota[id]===undefined)ctx.quota[id]=0n;
    }
  }

  function placeStep(eco,topo,id,week,pop,K,wk,pw,ctx,counts){
    const pl=eco.places[id],info=topo.by.get(id),bank=eco.banks[info.c],realm=info.r,P=K.P;
    // Banchi delle carovane arrivate: vendono come gli altri detentori; merci e borsa restano della carovana (in viaggio).
    const stalls=(ctx.stalls[id]||[]).map(cv=>({cv,s:cv.c,cash:cv.m,wp:0n,n:0,e:0,start:cv.c.slice(),before:cv.c.reduce((x,y)=>x+y,0)}));
    const B=stalls.length?pl.b.concat(stalls):pl.b;
    const sum=ctx.sum[id],alive=sum.alive,atWar=eco.continents[info.c].war>=week;
    const dis=pl.dis&&pl.dis[1]>=week?P.calamities[pl.dis[0]]:null;
    const U=GOODS.map((_,g)=>unit(K,pl,g));          // prezzi della settimana: fissi dall'inizio alla fine del luogo
    // a. Occupazione: ogni attività impiega i lavoratori della sua professione fino ai posti disponibili.
    const emp=new Array(NT),eff=new Array(NT).fill(1000);
    let employed=0,workers=0;
    const idle={};
    for(const job of K.jobs){const n=sum.workers[job]||0;workers+=n;idle[job]=n;}
    for(let t=0;t<NT;t++){
      const def=K.types[t],e=Math.min(idle[def.job],B[t].n*def.slots);
      emp[t]=e;B[t].e=e;idle[def.job]-=e;employed+=e;
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
      eff[t]=effort(K,pl,def.main);
      for(const [g,rate] of def.makes){
        const q=Math.floor(Math.floor(emp[t]*rate*f/1000)*effort(K,pl,g)/1000);
        if(q){B[t].s[g]+=q;pw.gp[g]+=q;}
      }
    }
    // c. Trasformazione: le materie prime si comprano dagli altri detentori del luogo, al prezzo corrente.
    const inNeed=new Array(NG).fill(0);
    for(let t=0;t<NT;t++){
      const def=K.types[t];
      if(!emp[t]||!def.uses.length)continue;
      const [g,rate]=def.makes[0],[inp,per]=def.uses[0],bz=B[t];
      eff[t]=effort(K,pl,g);
      const cap=Math.floor(Math.floor(emp[t]*rate*factorOf(t)/1000)*eff[t]/1000);
      const need=Math.ceil(cap*per/1000);
      inNeed[inp]+=need;
      let buy=Math.min(need-Math.min(need,bz.s[inp]),total(B,inp)-bz.s[inp]);
      if(buy>0){
        const want=ceilCost(buy,U[inp]);
        if(bz.cash<want)withdraw(bz,bank,want-bz.cash);
        buy=afford(bz.cash,U[inp],buy);
        if(buy>0){
          const pay=ceilCost(buy,U[inp]),takes=takeFrom(B,inp,buy,t);
          bz.cash-=pay;bz.wp-=pay;bz.s[inp]+=buy;payHolders(B,takes,pay);
        }
      }
      const out=Math.min(cap,Math.floor(bz.s[inp]*1000/per)),used=Math.ceil(out*per/1000);
      if(out>0){bz.s[inp]-=used;pw.gu[inp]+=used;bz.s[g]+=out;pw.gp[g]+=out;}
    }
    if(emp[INN]>0&&K.types[INN].service)eff[INN]=clamp(Math.floor(alive*K.types[INN].service.need*1000/(emp[INN]*K.types[INN].service.rate)),0,1000);
    // d. Salari (a ore: con i magazzini pieni si lavora e si paga meno) e dividendi, mai con debiti o in perdita; salari pubblici.
    const req={},payers=[];
    const ask=(src,job,amt)=>{if(amt>0n){req[job]=(req[job]||0n)+amt;payers.push([src,amt]);}};
    for(let t=0;t<NT;t++){
      const def=K.types[t],bz=B[t],have=sum.workers[def.job]||0;
      if(!bz.n&&bz.cash===0n)continue;
      const wage=wageOf(K,def.job,pl.w),bill=BigInt(emp[t])*wage*BigInt(Math.max(eff[t],P.business.idlePay))/1000n;
      if(bz.cash<bill){
        withdraw(bz,bank,bill-bz.cash);
        if(bz.cash<bill&&bz.n>0&&bz.loss*2<P.business.closeAfter)borrow(eco,K,ctx,id,bz,bank,bill-bz.cash,BigInt(emp[t])*wage*BigInt(P.bank.creditWeeks),week);
      }
      const pay=minB(bz.cash,bill),free=bz.cash-pay-bufferOf(K,bz,t,pl.w);
      const div=free>0n&&/*M:dividendi*/bz.debt===0n&&(bz.pr>=0n||!bz.n)&&have>0?free*BigInt(P.business.dividendShare)/1000n:0n;
      bz.wp-=pay;
      ask(t,def.job,pay+div);
    }
    const pub=ctx.public[id],pubIdle={...idle};let pubBill=0n;
    for(const [job,bill,e] of pub.jobs){pubBill+=bill;pubIdle[job]=Math.max(0,pubIdle[job]-e);employed+=e;}
    if(pubBill>0n){
      if(atWar&&pub.funds<pubBill){
        const m=minB(pubBill-pub.funds,BigInt(alive)*BigInt(P.events.mintCapPerCapita));
        eco.treasuries[realm]+=m;pub.funds+=m;/*M:zecca*/mint(eco,'zecca',m);wk.minted+=m;
      }
      const avail=minB(pub.funds,pubBill);
      const parts=avail===pubBill?pub.jobs.map(x=>x[1]):splitBig(avail,pub.jobs.map(x=>x[1]));
      for(let i=0;i<pub.jobs.length;i++)ask(-1,pub.jobs[i][0],parts[i]);
    }
    // Sussidi e opere pubbliche con l'eccedenza della tesoreria: prima a chi non ha lavoro.
    const relief=ctx.relief[id]||0n;
    if(relief>0n){
      let who=K.jobs.filter(j=>pubIdle[j]>0).map(j=>[j,pubIdle[j]]);
      if(!who.length)who=K.jobs.filter(j=>sum.workers[j]>0).map(j=>[j,sum.workers[j]]);
      if(who.length){splitBig(relief,who.map(x=>x[1])).forEach((v,k)=>ask(-1,who[k][0],v));eco.totals.relief+=relief;}
    }
    // e. Paniere delle famiglie: domanda elastica al prezzo e alla ricchezza abituale, stagioni, epidemie; pane di casa e servizi.
    const perHead=alive>0?Number(minB(sum.wealth*1000n/BigInt(alive),9000000000000n)):0;
    if(pl.wr<0&&alive>0)pl.wr=perHead;
    const rel=pl.wr>0?clamp(Math.floor(perHead*1000/pl.wr),0,4000):1000;
    let full=0;for(let g=0;g<NG;g++)full+=K.need[g]*U[g]/1000;       // millesimi di Scintilla a testa per il paniere intero
    const weeks=full>0?perHead*1000/full:0;
    const richLux=Math.min(clamp(1000+Math.trunc((rel-1000)*P.prices.wealthLuxury/1000),400,1400),weeks<2000?Math.floor(400+weeks*300/1000):1400);
    const richNeed=clamp(1000+Math.trunc((rel-1000)*P.prices.wealthNeed/1000),900,1050);
    const want=new Array(NG).fill(0),qty=new Array(NG).fill(0),cost=new Array(NG).fill(0n);
    let spendReq=0n,homeGrain=0,shortBread=0;
    for(const g of K.priority){
      const idx=pl.i[g],lux=K.luxury[g];
      const el=lux?clamp(1000-Math.trunc((idx-1000)*P.prices.luxury/1000),300,1300):clamp(1000-Math.trunc((idx-1000)*P.prices.necessity/1000),700,1100);
      let w=Math.floor(Math.floor(alive*K.need[g]*mix(K.gseason[g],counts)/1000)*el/1000);
      w=Math.floor(w*(lux?richLux:K.food[g]?1000:richNeed)/1000);
      if(dis&&dis.demand&&own(dis.demand,GOODS[g]))w=Math.floor(w*dis.demand[GOODS[g]]/1000);
      want[g]=w;
      const ask2=g===GI.grain?w+homeGrain:w,q=Math.min(ask2,total(B,g));
      qty[g]=q;cost[g]=q>0?ceilCost(q,U[g]):0n;spendReq+=cost[g];
      if(g===GI.bread){shortBread=w-q;homeGrain=Math.ceil(shortBread*P.home.breadGrain/1000);}
    }
    const sv=K.types[INN].service,svUnit=sv?sv.price*pl.w:0;
    const svWant=sv?Math.floor(alive*sv.need*richLux/1000):0,svCap=sv?Math.floor(emp[INN]*sv.rate*factorOf(INN)/1000):0,svQty=Math.min(svWant,svCap);
    const svCost=svQty>0?ceilCost(svQty,svUnit):0n;
    spendReq+=svCost;
    let wagesReq=0n;for(const job in req)wagesReq+=req[job];
    const taxReq=wagesReq*ctx.rate[realm]/1000n+(ctx.levy[id]||0n);
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
    eco.ledger.toHH+=wagesA;eco.ledger.fromHH+=spendA+taxA;eco.treasuries[realm]+=taxA;
    wk.wages+=wagesA;wk.spend+=spendA;wk.tax+=taxA;
    const th=B[TRADE],fee=emp[TRADE]>0&&alive>0?BigInt(Math.floor(P.retail.fee*Math.min(1000,Math.floor(emp[TRADE]*P.retail.perMerchant*1000/alive))/1000)):0n;
    const got=new Array(NG).fill(0);
    let rem=spendA,marketBread=0;
    for(const g of K.priority){
      if(rem<=0n)break;
      if(!qty[g])continue;
      let q=qty[g],pay=cost[g];
      if(rem<pay){q=afford(rem,U[g],q);pay=rem;}
      if(q<=0)break;
      rem-=pay;
      payHolders(B,takeFrom(B,g,q,-1),pay,fee);
      if(g===GI.grain&&homeGrain>0){
        const home=Math.floor(q*homeGrain/(want[g]+homeGrain)),loaves=Math.min(shortBread,Math.floor(home*1000/P.home.breadGrain)),b=GI.bread;
        got[g]=q-home;pw.ge[g]+=q-home;pw.gu[g]+=home;
        pw.gp[b]+=loaves;pw.ge[b]+=loaves;got[b]+=loaves;
      }else{got[g]=q;pw.ge[g]+=q;if(g===GI.bread)marketBread=q;}
    }
    let svGot=0;
    if(svQty>0&&rem>0n){
      const pay=minB(rem,svCost);rem-=pay;svGot=pay===svCost?svQty:afford(pay,svUnit,svQty);
      B[INN].cash+=pay;B[INN].wp+=pay;wk.services+=pay;eco.totals.services+=pay;
    }
    if(rem>0n){th.cash+=rem;th.wp+=rem;eco.totals.rounding+=rem;}
    // Acqua attinta dalle famiglie per ciò che i pozzi non danno (fiumi e cisterne: calano con siccità, guerra e stagione).
    const well=TYPES.indexOf('well'),short=want[GI.water]-got[GI.water];
    const homeMade=ctx.home[id]=new Array(NG).fill(0);
    // L'alternativa di casa limita il prezzo: conta ciò che le famiglie potrebbero fare da sé (pane dal grano che resta, acqua).
    const water=Math.floor(sum.adults*P.home.water*factorOf(well)/1000);
    // (mai l'intera produzione di casa: altrimenti, chiusi i forni, il pane costerebbe così poco che nessuno li riaprirebbe).
    homeMade[GI.bread]=Math.min(Math.floor(want[GI.bread]*P.home.rival/1000),got[GI.bread]-marketBread+Math.floor(total(B,GI.grain)*1000/P.home.breadGrain));
    homeMade[GI.water]=Math.floor(water*P.home.rivalWater/1000);
    if(short>0){const q=Math.min(short,water);if(q>0){pw.gp[GI.water]+=q;pw.ge[GI.water]+=q;got[GI.water]+=q;}}
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
      const fade=bz.pr>0n?(bz.pr+3n)/4n:-((3n-bz.pr)/4n);          // si spegne fino a zero, senza resti fermi
      bz.pr=bz.pr-fade+bz.wp/4n;
      bz.loss=bz.n>0&&(bz.pr<0n||!emp[t])?bz.loss+1:Math.max(0,bz.loss-1);       // isteresi: dopo una chiusura si attende prima di riaprire
      bz.wp=0n;
      const buffer=bufferOf(K,bz,t,pl.w);
      if(bz.n===0){
        if(bz.dep>0n)withdraw(bz,bank,bz.dep);
        // Attività chiusa senza nessuno della professione nel luogo: la cassa residua passa alla tesoreria (beni vacanti).
        if(bz.cash>0n&&bz.debt===0n&&!(sum.workers[def.job]>0)){eco.treasuries[realm]+=bz.cash;wk.liquidations+=bz.cash;bz.cash=0n;}
        continue;
      }
      if(bz.debt>0n&&bz.cash>buffer)repay(bz,bank,bz.cash-buffer);
      if(bz.debt===0n&&bz.cash>buffer){const d=(bz.cash-buffer)*BigInt(P.business.depositShare)/1000n;if(d>0n){bz.cash-=d;bank.r+=d;bz.dep+=d;bank.dep+=d;eco.totals.deposited+=d;}}
      const capDep=buffer*BigInt(P.bank.depositCapWeeks)/BigInt(P.business.bufferWeeks);
      if(bz.dep>capDep)withdraw(bz,bank,bz.dep-capDep);
      if(bz.dep>0n&&depRate>0n){const i=bz.dep*depRate/1000000n;bz.dep+=i;bank.dep+=i;eco.totals.depositInterest+=i;}
    }
    // h. Deperimento delle scorte.
    for(let t=0;t<NT;t++)for(let g=0;g<NG;g++){
      const s=B[t].s[g];
      if(s&&K.spoil[g]){const q=Math.floor(s*K.spoil[g]/1000);if(q){B[t].s[g]-=q;pw.gs[g]+=q;}}
    }
    if(stalls.length){
      const sup=ctx.supplied[id]=new Array(NG).fill(0);
      for(const st of stalls)for(let g=0;g<NG;g++)sup[g]+=st.start[g]-st.s[g];
      const done=new Set();
      for(const st of stalls)if(!closeStall(eco,topo,K,wk,st,week))done.add(st.cv);
      if(done.size)eco.caravans=eco.caravans.filter(v=>!done.has(v));
    }
    ctx.stats[id]={want,got,inNeed,idle:workers-employed,workers,unemployed:sum.unemployed,wealth:sum.wealth,alive,perHead,rel,income:wagesA,
      basket:full,svWant,svGot,emp:emp.slice()};
    // i. Carovane in partenza verso i luoghi collegati dove la merce vale di più.
    dispatch(eco,topo,id,week,K,wk,ctx);
    // j. Chiusure dopo perdite prolungate o senza lavoratori; aperture dove c'è domanda e margine (con un prestito d'avvio).
    for(let t=0;t<NT;t++){
      const def=K.types[t],bz=B[t],have=sum.workers[def.job]||0;
      if(bz.n>0&&bz.loss>=P.business.closeAfter){
        const gone=have===0?bz.n:1;
        bz.n-=gone;bz.loss=Math.floor(P.business.closeAfter/2);pl.cl+=1000*gone;
        event(eco,week,'closure',id,`A ${id} chiude ${gone===1?'un’attività':gone+' attività'} (${def.name}) dopo ${P.business.closeAfter} settimane in perdita; ne restano ${bz.n}`);
        if(bz.n===0){
          offset(bz,bank);
          if(bz.dep>0n)withdraw(bz,bank,bz.dep);
          repay(bz,bank,bz.debt);
          if(bz.debt>0n){
            const lost=bz.debt;bank.loans-=lost;bz.debt=0n;eco.totals.writtenOff+=lost;
            event(eco,week,'bankrupt',id,`Fallimento a ${id} (${def.name}): debito non rimborsato di ${wallet(lost).label}`,lost);
          }
          if(bz.cash>0n&&!have){eco.treasuries[realm]+=bz.cash;wk.liquidations+=bz.cash;bz.cash=0n;}
        }
        continue;
      }
      const idleT=have-bz.n*def.slots;
      if(idleT<(bz.n?Math.ceil(def.slots/2):1)||bz.loss>0)continue;
      const wage=wageOf(K,def.job,pl.w),crew=Math.min(def.slots,idleT);
      let inputs=0n;for(const [g,per] of def.uses)inputs+=ceilCost(Math.ceil(crew*def.makes[0][1]*per/1000),U[g]);
      const bill=BigInt(crew)*wage,startup=(bill+inputs)*BigInt(P.bank.startupWeeks);
      if(t===TRADE){
        // Una casa mercantile apre se restano clienti non serviti o un carico che ripaga i salari.
        const served=bz.n*def.slots*P.retail.perMerchant,shop=alive>served&&Number(spendA)/Math.max(1,alive)*P.retail.perMerchant*P.retail.fee/1000>Number(wage)*(1000+P.business.openMargin)/1000;
        if(!shop&&opportunity(eco,topo,id,K)<=bill)continue;
      }else if(def.service){
        if(svWant<=svCap||margin(K,pl,t)<Number(wage)*P.business.openMargin/1000)continue;
      }else{
        const net=margin(K,pl,t);
        // Il mestiere assente rientra con una sola bottega anche a mercato fornito, se a ore ridotte guadagna ancora.
        const first=bz.n===0&&net*effort(K,pl,def.main)/1000>=1;
        if(net<Number(wage)*P.business.openMargin/1000)continue;
        const scarce=pl.i[def.main]>=P.business.openPrice;
        const profitable=bz.n>0&&bz.pr*1000n>bill*BigInt(bz.n)*BigInt(P.business.openProfit)&&cover(K,pl,def.main,total(pl.b,def.main))<=1000;
        if(!scarce&&!profitable&&!first)continue;
      }
      const opens=bz.n===0&&!(def.main>=0&&pl.i[def.main]>=P.business.openPrice)?1:Math.min(P.business.maxOpen,Math.max(1,Math.floor(idleT/def.slots)));
      for(let k=0;k<opens;k++){
        if(bank.cr>=week||ctx.quota[id]<startup||/*M:aperture*/lendable(K,bank)<startup)break;
        bank.r-=startup;bank.loans+=startup;bz.debt+=startup;bz.cash+=startup;ctx.quota[id]-=startup;eco.totals.loansIssued+=startup;bz.n++;
        event(eco,week,'opening',id,`A ${id} apre un’attività (${def.name}); ora sono ${bz.n}`);
      }
    }
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
  /* Partenze: si caricano prima le merci e le destinazioni col margine più alto per settimana di viaggio (a parità, un ordine con
     seme che cambia ogni settimana: nessun luogo è favorito dal nome). */
  function dispatch(eco,topo,id,week,K,wk,ctx){
    const pl=eco.places[id],th=pl.b[TRADE],C=K.P.caravans,B=pl.b;
    ctx.exported[id]=new Array(NG).fill(0);
    if(!th.n||!th.e)return;
    let capLeft=/*M:capacita*/th.e*C.perMerchant;
    const cand=[];
    for(const to of topo.by.get(id).links){
      const dest=eco.places[to],weeks=travel(topo,id,to);
      for(let g=0;g<NG;g++){
        if(!K.trade[g])continue;
        const up=unit(K,pl,g),gain=unit(K,dest,g)*1000-up*(1000+C.margin+C.costPerWeek*weeks);
        if(gain>0)cand.push({to,g,up,weeks,score:gain/(2*weeks+1),tie:roll(eco.seed,'merce',to,g,week)});
      }
    }
    cand.sort((a,b)=>b.score-a.score||a.tie-b.tie||(a.to<b.to?-1:a.to>b.to?1:a.g-b.g));
    const loads=new Map();
    for(const {to,g,up,weeks} of cand){
      if(capLeft<=0)break;
      const dest=eco.places[to],pend=ctx.transit[to]||(ctx.transit[to]=new Array(NG).fill(0));
      const have=total(B,g),others=have-th.s[g];
      const surplus=Math.min(others,have-Math.floor(pl.d[g]*K.cover[g]/1000*C.keepCover/1000));
      const room=Math.floor(dest.d[g]*K.cover[g]/1000*C.fillCover/1000)-total(dest.b,g)-pend[g];
      const want=Math.min(surplus,room,capLeft);
      if(want<=0)continue;
      // Credito commerciale: se la cassa non basta, la banca anticipa il carico entro il limite di credito della casa.
      const reserve=bufferOf(K,th,TRADE,pl.w)*BigInt(K.P.business.spendableBuffer)/1000n,needCash=ceilCost(want,up)+reserve;
      if(th.cash<needCash&&th.loss===0)
        borrow(eco,K,ctx,id,th,eco.banks[topo.by.get(id).c],needCash-th.cash,BigInt(th.e)*wageOf(K,'merchant',pl.w)*BigInt(K.P.bank.creditWeeks),week);
      const q=afford(maxB(0n,th.cash-reserve),up,want);
      if(q<=0)continue;
      const pay=ceilCost(q,up);
      th.cash-=pay;payHolders(B,takeFrom(B,g,q,TRADE),pay);
      let load=loads.get(to);if(!load)loads.set(to,load={c:new Array(NG).fill(0),k:0n,weeks,q:0});
      load.c[g]+=q;load.k+=pay;load.q+=q;capLeft-=q;pend[g]+=q;ctx.exported[id][g]+=q;
    }
    for(const to of [...loads.keys()].sort()){
      const l=loads.get(to);
      eco.caravans.push({id:++eco.seq,f:id,t:to,c:l.c,m:0n,k:l.k,d:week+l.weeks,b:0,s:week});
      eco.totals.shipped+=l.q;wk.shipped+=l.q;
    }
  }
  /* Fondi pubblici per la banca del continente: solo dalle tesorerie sopra la riserva, in proporzione all'eccedenza. */
  function publicFunds(eco,topo,c,ctx,amount,share){
    const rs=topo.contRealms.get(c),spare=rs.map(r=>maxB(0n,eco.treasuries[r]-ctx.target[r])*BigInt(share)/1000n);
    const give=minB(amount,spare.reduce((a,b)=>a+b,0n));
    if(give<=0n)return 0n;
    splitBig(give,spare).forEach((v,k)=>{eco.treasuries[rs[k]]-=v;});
    eco.banks[c].r+=give;eco.totals.recapitalized+=give;
    return give;
  }
  function bankStep(eco,topo,c,week,K,wk,ctx){
    const bank=eco.banks[c],P=K.P.bank;
    bank.k=BigInt(aliveIn(eco,topo.byCont.get(c)))*BigInt(P.capitalPerCapita);
    let equity=bank.r+bank.loans-bank.dep;
    if(equity<0n){
      // Insolvenza: prima il soccorso pubblico (metà dell'eccedenza delle tesorerie), poi i depositi si riducono in proporzione;
      // il credito si ferma per alcune settimane e, se la perdita è grave, il continente è in crisi.
      const help=publicFunds(eco,topo,c,ctx,-equity,500);wk.recapitalized+=help;equity+=help;
      const before=bank.dep,cut=equity<0n?minB(-equity,bank.dep):0n;
      if(cut>0n){
        const list=[];
        for(const id of topo.byCont.get(c))for(const b of eco.places[id].b)if(b.dep>0n)list.push(b);
        const parts=splitBig(cut,list.map(b=>b.dep));
        for(let i=0;i<list.length;i++)list[i].dep-=parts[i];
        bank.dep-=cut;eco.totals.haircut+=cut;
      }
      bank.cr=week+P.crisisWeeks;
      if(cut>0n&&cut*1000n>=before*BigInt(P.seriousLoss))bank.cs=week+P.crisisWeeks;
      event(eco,week,'insolvency',c,`La banca del continente ${c} è insolvente: `+(cut>0n?`depositi ridotti di ${wallet(cut).label}`:`soccorso pubblico di ${wallet(help).label}`),cut);
      return;
    }
    // Ricapitalizzazione regolata: sotto il capitale richiesto la colmano un poco per settimana le tesorerie in eccedenza.
    if(equity<bank.k){wk.recapitalized+=publicFunds(eco,topo,c,ctx,maxB(1n,(bank.k-equity)/BigInt(P.recapWeeks)),P.recapShare);return;}
    // Utili della banca oltre il capitale richiesto: alle tesorerie del continente, in proporzione agli abitanti.
    const target=bank.dep*BigInt(P.capitalTarget)/1000n+bank.k;
    if(equity>target){
      const div=minB(lendable(K,bank),(equity-target)*BigInt(P.dividendShare)/1000n),realms=topo.contRealms.get(c);
      if(div>0n&&realms.length){
        const ids=topo.byCont.get(c),w=realms.map(r=>aliveIn(eco,ids.filter(id=>topo.by.get(id).r===r)));
        const parts=w.some(x=>x>0)?splitBig(div,w):[div,...new Array(realms.length-1).fill(0n)];
        for(let i=0;i<realms.length;i++)eco.treasuries[realms[i]]+=parts[i];
        bank.r-=div;wk.bankToTreasury+=div;
      }
    }
  }
  /* Segnale del lavoro per mestiere (1000 = equilibrio): lavoratori che servono alla domanda del luogo (scorte, esportazioni e
     materie prime comprese) su lavoratori presenti; chi produce in perdita non chiama altri. */
  function laborStep(eco,id,K,ctx,ps){
    const pl=eco.places[id],P=K.P,have=ctx.sum[id].workers,raw={};
    let needed=0,present=0;
    const put=(job,need,n)=>{
      needed+=need;present+=n;
      raw[job]=n>0?need*1000/n:need>=0.5?P.labor.max:1000;
    };
    for(let g=0;g<NG;g++){
      const makers=[];for(let t=0;t<NT;t++)if(K.types[t].main===g)makers.push(t);
      if(!makers.length)continue;
      const se=K.gseason[g],need=needFor(K,pl,g)*(se?(se[0]+se[1]+se[2]+se[3])/4/Math.max(1,mix(se,ctx.counts)):1),cap=makers.map(t=>capacityPer(K,t)),n=makers.map(t=>have[K.types[t].job]||0),all=makers.reduce((s,t,k)=>s+n[k]*cap[k],0);
      makers.forEach((t,k)=>{
        // Più mestieri per la stessa merce: la domanda si divide secondo chi c'è (in parti uguali se non c'è nessuno).
        let w=(all>0?n[k]*cap[k]/all:1/makers.length)*need/cap[k];
        const poor=margin(K,pl,t)<0;
        if(poor)w=Math.min(w,n[k]*0.8);
        put(K.types[t].job,w,n[k]);
        if(all>0&&!n[k])raw[K.types[t].job]=poor?800:need*1000/all;
      });
    }
    put(K.types[TRADE].job,ps.alive/P.retail.perMerchant+(pl.b[TRADE].n?ctx.exported[id].reduce((a,b)=>a+b,0)/P.caravans.perMerchant:0),have[K.types[TRADE].job]||0);
    put(K.types[INN].job,ps.svWant/K.types[INN].service.rate,have[K.types[INN].job]||0);
    for(const [job,share] of Object.entries(P.publicJobs))put(job,Math.floor(ps.alive*share/1000),have[job]||0);
    for(const job of K.jobs){
      const v=clamp(Math.round(raw[job]??1000),P.labor.min,P.labor.max),old=pl.lab[job];
      pl.lab[job]=old===undefined?v:old+Math.trunc((v-old)/P.labor.inertia);
    }
    return present>0?clamp(Math.floor(needed*1000/present),500,1500):1000;
  }
  function priceStep(eco,topo,id,week,K,ctx){
    const pl=eco.places[id],st=topo.by.get(id),ps=ctx.stats[id],P=K.P;
    if(!ps)return;
    let wsum=0,isum=0,wantV=0,gotV=0;
    for(let g=0;g<NG;g++){
      pl.d[g]=ps.want[g]+ps.inNeed[g]+ctx.exported[id][g];          // domanda locale, materie prime ed esportazioni
      const target=targetIndex(K,cover(K,pl,g,total(pl.b,g)+ctx.home[id][g]+(ctx.supplied[id]?ctx.supplied[id][g]:0)));   // banchi e produzione di casa contano come offerta
      pl.i[g]+=Math.trunc((target-pl.i[g])/P.prices.inertia);
      const weight=K.need[g]*K.base[g];wsum+=weight;isum+=weight*pl.i[g];
      wantV+=ps.want[g]*K.base[g];gotV+=ps.got[g]*K.base[g];
    }
    const priceIndex=Math.round(isum/wsum),hiring=laborStep(eco,id,K,ctx,ps);
    const wt=clamp(1000+Math.trunc((hiring-1000)*400/1000)+Math.trunc((priceIndex-1000)/2),500,3000);
    pl.w+=/*M:salari*/Math.trunc((wt-pl.w)/4);
    // Scarsità: la peggiore fra la sete e la fame (pane e grano in equivalente di grano).
    const lack=(w,g)=>w>0?Math.floor((w-g)*1000/w):0,eq=v=>v[GI.bread]/2+v[GI.grain];
    const food=clamp(Math.max(lack(ps.want[GI.water],ps.got[GI.water]),lack(eq(ps.want),eq(ps.got))),0,1000);
    const force=ps.workers+ps.unemployed,unemployment=force>0?clamp(Math.floor((ps.unemployed+ps.idle)*1000/force),0,1000):0;
    let prosperity=1000;
    if(ps.alive>0){
      const inc=Number(minB(ps.income*1000n/BigInt(ps.alive),9000000000000n)),Q=P.prosperity;
      pl.inc=pl.inc<0?inc:pl.inc+Math.trunc((inc-pl.inc)/Q.incomeWeeks);
      const cost=ps.basket+P.types.inn.service.need*P.types.inn.service.price*pl.w/1000,ri=cost>0?clamp(Math.floor(pl.inc*1000/cost),0,3000):1000;
      const sat=wantV>0?Math.floor(gotV*1000/wantV):1000;
      prosperity=clamp(Math.floor((ri*Q.income+Math.min(ps.rel,3000)*Q.wealth+sat*Q.basket)/1000),0,3000);
      const gap=ps.perHead-pl.wr;
      pl.wr+=Math.abs(gap)<P.prices.habitWeeks?Math.sign(gap):Math.trunc(gap/P.prices.habitWeeks);
    }else{pl.wr=-1;pl.inc=-1;}
    const atWar=eco.continents[st.c].war>=week?1:0,dis=pl.dis&&pl.dis[1]>=week?1:0;
    const bankCrisis=eco.banks[st.c].cs>=week;
    if(pl.ur<0)pl.ur=unemployment;
    const jobless=unemployment>=P.crisis.unemployment&&unemployment>=pl.ur+P.crisis.jump;
    pl.ur+=Math.trunc((unemployment-pl.ur)/16)||Math.sign(unemployment-pl.ur);
    let open=0;for(const b of pl.b)open+=b.n;
    const cond=ps.alive>0&&(food>=P.crisis.food||bankCrisis||jobless||pl.cl>=P.crisis.closures*Math.max(1,Math.ceil(open/20)));
    if(cond&&!pl.cr){pl.cr=1;event(eco,week,'crisis',id,`Crisi economica a ${id}`+(food>=P.crisis.food?': manca il cibo':bankCrisis?': banca insolvente':jobless?': disoccupazione':': chiusure'));}
    else if(!cond&&pl.cr){/*M:ripresa*/pl.cr=0;event(eco,week,'recovery',id,`Fine della crisi a ${id}`);}
    pl.cl=Math.floor(pl.cl*3/4);
    pl.g=[food,priceIndex,pl.w,unemployment,prosperity,pl.cr,atWar,dis,seasonOfDay(week*7+3)];
  }
  /* Una settimana in parti: a ogni `yield` i conti sono in pari e il lavoro può fermarsi. L'ordine dei luoghi cambia ogni settimana
     (con seme): contano solo il credito della settimana e il posto libero a destinazione, e nessun nome è favorito. */
  function* weekParts(eco,topo,week,env){
    const K=tables();K.jobs=jobsOf(K);
    const pop=env&&env.population,hooks=env&&env.world,wk=newWeek(),counts=seasonCounts(week),burnedBefore=sumOf(eco.ledger.burn);
    const ctx={sum:{},transit:{},stats:{},stalls:{},exported:{},supplied:{},home:{},counts};
    for(const id of topo.order){
      const pl=eco.places[id],sum=ctx.sum[id]=readSummary(pop,id);
      pl.a=sum.alive;if(!pl.f&&sum.alive>0)found(K,pl,sum);
      yield;
    }
    for(const c of topo.continents){warStep(eco,c,week,hooks,K);yield;}
    for(const id of topo.order){calamityStep(eco,id,week,hooks,K);yield;}
    fiscalStep(eco,topo,week,K,wk,ctx);yield;
    caravanStep(eco,topo,week,K,wk,ctx);yield;
    const turn=topo.order.map(id=>[roll(eco.seed,'turno',week,id),id]).sort((a,b)=>a[0]-b[0]||(a[1]<b[1]?-1:1));
    for(const [,id] of turn){
      const pw=tally();
      try{placeStep(eco,topo,id,week,pop,K,wk,pw,ctx,counts);}finally{commit(eco,wk,pw);}
      yield;
    }
    for(const c of topo.continents){bankStep(eco,topo,c,week,K,wk,ctx);yield;}
    for(const id of topo.order){priceStep(eco,topo,id,week,K,ctx);yield;}
    wk.places=ctx.stats;
    wk.burned=sumOf(eco.ledger.burn)-burnedBefore;
    eco.week=week+1;
    lastWeek.set(eco,wk);
  }
  // Avanza la settimana corrente; con `due` si ferma quando il tempo è finito (almeno una parte per chiamata). Vero se è conclusa.
  function advance(eco,env,due){
    const topo=topos.get(eco);
    let job=running.get(eco);
    if(!job)running.set(eco,job={week:eco.week,parts:weekParts(eco,topo,eco.week,env)});
    try{
      for(;;){
        if(job.parts.next().done){running.delete(eco);return true;}
        if(due&&due())return false;
      }
    }catch(e){
      // Guasto: la settimana si chiude dov'è arrivata (i conti sono in pari) e non si ripaga da capo.
      running.delete(eco);eco.week=job.week+1;
      throw e;
    }
  }
  // Risolve fino alla settimana indicata compresa (completa prima quella eventualmente a metà). Falso se è già passata.
  function step(eco,week,env){
    if(!eco||!topos.has(eco)||!Number.isSafeInteger(week)||week<eco.week)return false;
    while(eco.week<=week)advance(eco,env,null);
    return true;
  }
  /* Specifica per WorldSim.register. Nessuna pausa e nessuna compressione: anche un'assenza lunghissima si risolve settimana per
     settimana, alternata alla popolazione (che deve usare lo stesso maxChunks). Restituisce false se la settimana è a metà. */
  function system(get,envOf,options={}){
    const maxChunks=Number.isInteger(options&&options.maxChunks)&&options.maxChunks>0?options.maxChunks:1000000;
    return {level:3,step:WEEK,maxChunks,resolve(s,from,to,info){
      const eco=get(s);
      if(!eco||!topos.has(eco))return undefined;
      const last=Math.floor(to/WEEK),due=info&&typeof info.due==='function'?info.due:null;
      while(eco.week<last){
        if(!advance(eco,typeof envOf==='function'?envOf(s,eco.week):envOf,due))return false;
        if(due&&due()&&eco.week<last)return false;
      }
      return undefined;
    }};
  }
  const partial=eco=>!!eco&&running.has(eco);

  /* ---------- scambi con l'esterno (giocatore, mercati di trade-economy): NON ancora collegati al gioco ----------
     q in millesimi di merce: positivo entra nel mercato del luogo, negativo esce. money in Scintille: positivo entra nei conti del
     luogo, negativo esce. Tutto o niente; ogni importo ha una causa nel registro (extIn/extOut per il denaro, gAdd/gLost per le merci).
     Idempotente: lo stesso idTransazione con lo stesso contenuto non si applica due volte (si ricordano le ultime `limits.tx`). */
  function exchange(eco,placeId,good,q,money,cause,txId){
    const no=reason=>({ok:false,reason});
    if(!eco||!topos.has(eco))return no('economia assente');
    if(running.has(eco))return no('settimana a metà: completarla prima (WorldSim.settle)');
    if(typeof placeId!=='string'||!own(eco.places,placeId))return no('luogo sconosciuto');
    const g=own(GI,good)?GI[good]:-1;
    if(g<0)return no('merce sconosciuta');
    const qty=typeof q==='bigint'?Number(q):q;
    if(!Number.isSafeInteger(qty)||qty===0||Math.abs(qty)>1e12)return no('quantità non valida');
    const m=typeof money==='bigint'?money:Number.isSafeInteger(money)?BigInt(money):typeof money==='string'?signedOf(money):null;
    if(m===null)return no('importo non valido');
    if(typeof cause!=='string'||!safeId(cause))return no('causa non valida');
    if(typeof txId!=='string'||!/^[a-z0-9][a-z0-9._:-]{0,63}$/i.test(txId))return no('idTransazione non valido');
    const row=[txId,placeId,g,qty,String(m),cause],seen=eco.tx.find(x=>x[0]===txId);
    if(seen)return JSON.stringify(seen)===JSON.stringify(row)?{ok:true,duplicate:true,quantity:qty,money:m}:no('idTransazione già usato con un altro contenuto');
    const pl=eco.places[placeId],th=pl.b[TRADE],L=eco.ledger;
    if(qty<0&&total(pl.b,g)<-qty)return no('scorte insufficienti');
    if(m<0n&&th.cash<-m)return no('la casa mercantile non può pagare');
    if(qty>0&&th.s[g]+qty>1e15)return no('magazzino pieno');
    if(m<0n){th.cash+=m;th.wp+=m;L.extOut[cause]=(L.extOut[cause]||0n)-m;}
    if(qty>0){
      th.s[g]+=qty;addGoods(eco,cause,g,qty);
      if(m>0n){th.cash+=m;th.wp+=m;}
    }else{
      const takes=takeFrom(pl.b,g,-qty,-1);
      lose(eco,cause,g,-qty);
      if(m>0n)payHolders(pl.b,takes,m);
    }
    if(m>0n)L.extIn[cause]=(L.extIn[cause]||0n)+m;
    eco.tx.push(row);
    if(eco.tx.length>params.limits.tx)eco.tx.splice(0,eco.tx.length-params.limits.tx);
    return {ok:true,duplicate:false,quantity:qty,money:m};
  }

  /* ---------- lettura ---------- */
  function signals(eco,placeId){
    const pl=eco&&typeof placeId==='string'&&own(eco.places,placeId)?eco.places[placeId]:null;
    if(!pl)return {...neutral,labor:{}};
    return {...Object.fromEntries(SIG.map((k,i)=>[k,pl.g[i]])),labor:{...pl.lab}};
  }
  function audit(eco){
    if(!eco||!eco.ledger)return {ok:false,problems:['economia assente'],money:null,goods:null,claims:null};
    const L=eco.ledger,problems=[],sumO=o=>Object.values(o).reduce((a,b)=>a+b,0n);
    const accounts=moneyOf(eco),minted=sumO(L.mint),burned=sumO(L.burn);
    const expected=expectedMoney(L);
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
      money:{accounts,expected,opening:L.open,minted,burned,toHouseholds:L.toHH,fromHouseholds:L.fromHH,mintedBy:{...L.mint},burnedBy:{...L.burn},externalIn:{...L.extIn},externalOut:{...L.extOut}}};
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
      money:{accounts:S(moneyOf(eco)),minted:S(sumO(L.mint)),burned:S(sumO(L.burn)),externalIn:S(sumO(L.extIn)),externalOut:S(sumO(L.extOut)),toHouseholds:S(L.toHH),fromHouseholds:S(L.fromHH)},
      treasuries:Object.fromEntries(Object.entries(eco.treasuries).map(([k,v])=>[k,S(v)])),
      banks:Object.fromEntries(Object.entries(eco.banks).map(([k,b])=>[k,{reserve:S(b.r),deposits:S(b.dep),loans:S(b.loans),crisisUntil:b.cr}])),
      lastWeek:{wages:S(wk.wages),spend:S(wk.spend),tax:S(wk.tax),publicWages:S(wk.publicWages),businessTax:S(wk.businessTax),licenses:S(wk.licenses),
        bankToTreasury:S(wk.bankToTreasury),tariffs:S(wk.tariffs),liquidations:S(wk.liquidations),minted:S(wk.minted),burned:S(wk.burned),services:S(wk.services),reissued:S(wk.reissued),retired:S(wk.retired),
        recapitalized:S(wk.recapitalized),shipped:wk.shipped,
        produced:perGood(wk.gp),eaten:perGood(wk.ge),used:perGood(wk.gu),spoiled:perGood(wk.gs)},
      bytes:running.has(eco)?null:serialize(eco).length};
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
    // A metà settimana una parte del denaro è già passata alle famiglie e il resto no: salvare ora perderebbe il lavoro in corso.
    if(running.has(eco))throw new Error('LivingEconomy: settimana a metà, completarla prima di salvare (WorldSim.settle)');
    const places={},jobs=jobsOf(tables());
    for(const id of Object.keys(eco.places).sort()){
      const p=eco.places[id];
      places[id]=[p.w,p.i,p.d,p.b.map(b=>[b.n,S(b.cash),S(b.debt),S(b.dep),b.loss,S(b.pr),b.e,trim(b.s),S(b.wp)]),p.dis?[p.dis[0],p.dis[1]]:0,p.g,p.cl,p.cr,p.c,p.r,
        [p.a,p.wr,p.ur,p.inc,p.f,jobs.map(j=>p.lab[j]??0)]];
    }
    const L=eco.ledger,mapS=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,S(v)])),rows=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,v.map(S)]));
    return JSON.stringify({schema:SCHEMA,seed:eco.seed,week:eco.week,seq:eco.seq,places,
      banks:Object.fromEntries(Object.entries(eco.banks).map(([c,b])=>[c,[S(b.r),S(b.dep),S(b.loans),S(b.k),b.cr,b.cs]])),
      treasuries:mapS(eco.treasuries),continents:Object.fromEntries(Object.entries(eco.continents).map(([c,x])=>[c,[x.war,x.at]])),
      caravans:eco.caravans.map(v=>[v.id,v.f,v.t,trim(v.c),S(v.m),S(v.k),v.d,v.b,v.s]),
      ledger:{open:S(L.open),mint:mapS(L.mint),burn:mapS(L.burn),toHH:S(L.toHH),fromHH:S(L.fromHH),extIn:mapS(L.extIn),extOut:mapS(L.extOut),
        goods:GOODS.map((g,i)=>[S(L.gOpen[i]),S(L.gProd[i]),S(L.gEat[i]),S(L.gUsed[i]),S(L.gSpoil[i])]),lost:rows(L.gLost),added:rows(L.gAdd)},
      events:eco.events,counts:eco.counts,totals:Object.fromEntries(Object.entries(eco.totals).map(([k,v])=>[k,typeof v==='bigint'?S(v):v])),tx:eco.tx});
  }
  const CAUSE={'nuovo luogo':'nuovo_luogo','luogo scomparso':'luogo_scomparso'};       // cause scritte dalle prime versioni
  const keysOf=o=>object(o)?Object.keys(o):[];
  /* Lettura tollerante: un dato non valido si sostituisce da solo (valore neutro, o quello ricavabile dai conti) e si conta in
     `fixes`; tutto il resto del mondo resta com'è. Solo un testo illeggibile o di un altro schema fa nascere un'economia nuova. */
  function parse(raw,places,now){
    const data=typeof raw==='string'?JSON.parse(raw):raw;
    if(!object(data)||data.schema!==SCHEMA)throw new Error('schema');
    if(!object(data.places)&&!object(data.banks)&&!object(data.ledger))throw new Error('nessun dato');
    const K=tables(),topo=topoBuild(places);K.jobs=jobsOf(K);
    let fixes=0;
    const lostMoney=[],lostDep=[],lostDebt=[];                     // importi illeggibili: se è uno solo, si ricava dai conti
    const int=(v,a,b,d)=>{if(isInt(v,a,b))return v;fixes++;return d;};
    const big=(v,d=0n)=>{const b=bigOf(v);if(b!==null)return b;fixes++;return d;};
    const signed=v=>{const b=signedOf(v);if(b!==null)return b;fixes++;return 0n;};
    const money=(v,list,set)=>{const b=bigOf(v);if(b!==null){set(b);return;}fixes++;set(0n);list.push(set);};
    const arr=(v,n,a,b,d)=>{if(!Array.isArray(v)||v.length!==n){fixes++;v=[];}return Array.from({length:n},(_,k)=>isInt(v[k],a,b)?v[k]:(v.length?fixes++:0,typeof d==='function'?d(k):d));};
    const stock=v=>{
      if(!Array.isArray(v)||v.length>NG){fixes++;v=[];}
      return Array.from({length:NG},(_,g)=>g>=v.length?0:int(v[g],0,1e15,0));
    };
    const eco={schema:SCHEMA,seed:0,week:0,seq:0,places:{},banks:{},treasuries:{},continents:{},caravans:[],ledger:newLedger(),events:[],counts:{},totals:newTotals(),tx:[]};
    eco.seed=int(data.seed,0,4294967295,0);
    eco.week=int(data.week,0,1e9,Number.isFinite(now)&&now>=0?Math.ceil(now/WEEK):0);
    eco.seq=int(data.seq,0,1e12,0);
    if(!object(data.places))fixes++;
    for(const id of keysOf(data.places)){
      const p=data.places[id],info=topo.by.get(id);
      if(!safeId(id)||!Array.isArray(p)||p.length<10){fixes++;continue;}
      const fresh=newPlace(K,info||{pop:0,c:'ignoto',r:'ignoto'}),pl={w:int(p[0],300,5000,1000),i:arr(p[1],NG,100,10000,1000),d:arr(p[2],NG,0,1e15,g=>fresh.d[g])};
      const raw=Array.isArray(p[3])?p[3]:(fixes++,[]);
      pl.b=K.types.map((_,t)=>{
        const x=raw[t],b=newBiz();
        if(!Array.isArray(x)){if(t<raw.length||t<11)fixes++;return b;}           // i salvataggi più vecchi non hanno le locande
        b.n=int(x[0],0,1e7,0);money(x[1],lostMoney,v=>{b.cash=v;});money(x[2],lostDebt,v=>{b.debt=v;});money(x[3],lostDep,v=>{b.dep=v;});
        b.loss=int(x[4],0,1e7,0);b.pr=signed(x[5]);b.e=int(x[6],0,1e10,0);b.s=stock(x[7]);
        // Incassi e costi della settimana arrivati dopo il regolamento (es. partenze delle carovane): passano alla settimana seguente.
        b.wp=x.length>8?signed(x[8]):0n;
        return b;
      });
      pl.dis=null;
      if(p[4]!==0){if(Array.isArray(p[4])&&own(K.P.calamities,p[4][0])&&isInt(p[4][1],0,1e9))pl.dis=[p[4][0],p[4][1]];else fixes++;}
      pl.g=arr(p[5],SIG.length,0,100000,k=>neutral[SIG[k]]);
      pl.cl=int(p[6],0,1e9,0);pl.cr=int(p[7],0,1,0);
      pl.c=safeId(p[8])?p[8]:(fixes++,info?info.c:'ignoto');pl.r=safeId(p[9])?p[9]:(fixes++,info?info.r:pl.c);
      if(info&&pl.c!==info.c&&!own(data.banks,pl.c)){fixes++;pl.c=info.c;}         // continente senza banca nel salvataggio: nome rovinato
      const x=Array.isArray(p[10])?p[10]:null;
      if(!x&&p.length>10)fixes++;
      pl.a=x?int(x[0],0,1e9,fresh.a):fresh.a;pl.wr=x?int(x[1],-1,9e15,-1):-1;pl.ur=x?int(x[2],-1,1000,-1):-1;pl.inc=x?int(x[3],-1,9e15,-1):-1;pl.f=x?int(x[4],0,1,1):1;
      pl.lab={};
      // Zero = mestiere mai misurato (assente).
      const lab=x?Array.isArray(x[5])?x[5]:(fixes++,[]):[];
      K.jobs.forEach((job,k)=>{if(k<lab.length&&lab[k]!==0){if(isInt(lab[k],1,100000))pl.lab[job]=lab[k];else fixes++;}});
      eco.places[id]=pl;
    }
    if(!object(data.banks))fixes++;
    for(const c of keysOf(data.banks)){
      const b=data.banks[c];
      if(!safeId(c)||!Array.isArray(b)||b.length<5){fixes++;continue;}
      const bank=eco.banks[c]=newBank(0n),pub=v=>Number.isSafeInteger(v)&&v>=-1&&v<=1e9?v:(fixes++,-1);
      money(b[0],lostMoney,v=>{bank.r=v;});bank.dep=big(b[1]);bank.loans=big(b[2]);bank.k=big(b[3]);bank.cr=pub(b[4]);bank.cs=b.length>5?pub(b[5]):-1;
    }
    if(!object(data.treasuries))fixes++;
    for(const r of keysOf(data.treasuries)){if(!safeId(r)){fixes++;continue;}money(data.treasuries[r],lostMoney,v=>{eco.treasuries[r]=v;});}
    if(!object(data.continents))fixes++;
    for(const c of keysOf(data.continents)){
      const x=data.continents[c];
      if(!safeId(c)||!Array.isArray(x)){fixes++;continue;}
      eco.continents[c]={war:Number.isSafeInteger(x[0])&&x[0]>=-1&&x[0]<=1e9?x[0]:(fixes++,-1),at:int(x[1],0,1,0)};
    }
    if(!Array.isArray(data.caravans))fixes++;
    const ids=new Set();
    for(const v of Array.isArray(data.caravans)?data.caravans.slice(0,1e6):[]){
      // Origine o destinazione illeggibili: la carovana è perduta; ogni altro campo si ripara.
      if(!Array.isArray(v)||v.length!==9||!own(eco.places,v[1])||!own(eco.places,v[2])||v[1]===v[2]){fixes++;continue;}
      const cv={id:int(v[0],1,1e12,0),f:v[1],t:v[2],c:stock(v[3]),m:0n,k:big(v[5]),d:int(v[6],0,1e9,eco.week+1),b:int(v[7],0,1,1),s:int(v[8],0,1e9,eco.week)};
      money(v[4],lostMoney,x=>{cv.m=x;});
      if(!cv.id||ids.has(cv.id))cv.id=0;else ids.add(cv.id);
      eco.caravans.push(cv);
    }
    for(const cv of eco.caravans)eco.seq=Math.max(eco.seq,cv.id);
    for(const cv of eco.caravans)if(!cv.id)cv.id=++eco.seq;
    const L=object(data.ledger)?data.ledger:(fixes++,{}),E=eco.ledger;
    let solid=true;                                                  // registro del denaro leggibile per intero
    const led=v=>{const b=bigOf(v);if(b!==null)return b;fixes++;solid=false;return 0n;};
    E.open=signedOf(L.open)??(fixes++,solid=false,0n);E.toHH=led(L.toHH);E.fromHH=led(L.fromHH);
    for(const f of ['mint','burn','extIn','extOut']){
      if(L[f]===undefined&&f.startsWith('ext'))continue;             // salvataggi precedenti agli scambi con l'esterno
      if(!object(L[f])){fixes++;solid=false;}
      for(const k of keysOf(L[f])){const key=CAUSE[k]||k;if(!safeId(key)){fixes++;solid=false;continue;}E[f][key]=(E[f][key]||0n)+led(L[f][k]);}
    }
    const G=Array.isArray(L.goods)?L.goods:(fixes++,[]),cols=['gOpen','gProd','gEat','gUsed','gSpoil'];
    for(let g=0;g<NG;g++){const row=Array.isArray(G[g])?G[g]:(fixes++,[]);cols.forEach((f,k)=>{E[f][g]=k===0?signedOf(row[k])??(fixes++,0n):big(row[k]);});}
    for(const [f,target] of [['lost','gLost'],['added','gAdd']]){
      if(!object(L[f]))fixes++;
      for(const k of keysOf(L[f])){
        const key=CAUSE[k]||k,row=L[f][k];
        if(!safeId(key)||!Array.isArray(row)){fixes++;continue;}
        E[target][key]=Array.from({length:NG},(_,g)=>big(row[g]));
      }
    }
    if(!Array.isArray(data.events))fixes++;
    for(const e of Array.isArray(data.events)?data.events.slice(-10000):[]){
      if(Array.isArray(e)&&e.length===5&&isInt(e[0],0,1e9)&&e.slice(1).every(x=>typeof x==='string')&&e[3].length<=500)eco.events.push(e.slice());else fixes++;
    }
    if(!object(data.counts))fixes++;
    for(const k of keysOf(data.counts)){if(safeId(k)&&isInt(data.counts[k],0,1e12))eco.counts[k]=data.counts[k];else fixes++;}
    if(!object(data.totals))fixes++;
    for(const k of Object.keys(eco.totals)){
      if(!own(data.totals,k)){if(!['recapitalized','relief','services'].includes(k))fixes++;continue;}
      eco.totals[k]=typeof eco.totals[k]==='bigint'?big(data.totals[k]):int(data.totals[k],0,Number.MAX_SAFE_INTEGER,0);
    }
    if(data.tx!==undefined&&!Array.isArray(data.tx))fixes++;
    for(const x of Array.isArray(data.tx)?data.tx.slice(-params.limits.tx):[]){
      if(Array.isArray(x)&&x.length===6&&typeof x[0]==='string'&&typeof x[1]==='string'&&isInt(x[2],0,NG-1)&&Number.isSafeInteger(x[3])&&typeof x[4]==='string'&&signedOf(x[4])!==null&&typeof x[5]==='string')eco.tx.push(x.slice());
      else fixes++;
    }
    // Un solo importo illeggibile si ricava esattamente dal registro (denaro) o dai totali della banca (crediti).
    if(lostMoney.length===1&&solid){const gap=expectedMoney(E)-moneyOf(eco);if(gap>0n)lostMoney[0](gap);}
    for(const [list,field,f] of [[lostDep,'dep','dep'],[lostDebt,'loans','debt']])if(list.length===1){
      let gap=0n;
      for(const c in eco.banks){let s=0n;for(const id in eco.places)if(eco.places[id].c===c)for(const b of eco.places[id].b)s+=b[f];gap+=eco.banks[c][field]-s;}
      if(gap>0n)list[0](gap);
    }
    reconcile(eco,K,topo);
    topos.set(eco,topo);
    return {eco,fixes};
  }
  /* Riallinea un salvataggio ai luoghi attuali: luoghi e continenti nuovi nascono con denaro emesso («nuovo_luogo»), quelli
     scomparsi distruggono denaro e merci («luogo_scomparso»), le carovane verso luoghi scomparsi sono perdute. Un luogo che cambia
     continente porta i suoi crediti alla nuova banca insieme alle riserve che li coprono. */
  function reconcile(eco,K,topo){
    const cur=new Set(topo.order);
    for(const v of eco.caravans.slice())if(!cur.has(v.f)||!cur.has(v.t)){
      for(let g=0;g<NG;g++)lose(eco,'luogo_scomparso',g,v.c[g]);
      burn(eco,'luogo_scomparso',v.m);
      eco.caravans.splice(eco.caravans.indexOf(v),1);
    }
    for(const c of topo.continents){
      if(!own(eco.banks,c)){const k=bankCapital(K,topo,c);eco.banks[c]=newBank(k);mint(eco,'nuovo_luogo',k);}
      if(!own(eco.continents,c))eco.continents[c]={war:-1,at:0};
    }
    for(const id of Object.keys(eco.places)){
      const pl=eco.places[id],info=topo.by.get(id),bank=eco.banks[pl.c];
      if(info&&info.c===pl.c){pl.r=info.r;continue;}
      let dep=0n,debt=0n;
      for(const b of pl.b){dep+=b.dep;debt+=b.debt;}
      if(bank){bank.dep-=minB(bank.dep,dep);bank.loans-=minB(bank.loans,debt);}
      if(info){
        const next=eco.banks[info.c];
        next.dep+=dep;next.loans+=debt;
        // La differenza fra depositi e prestiti passa in riserve, così nessuna delle due banche ci perde.
        if(bank){const x=dep>=debt?minB(bank.r,dep-debt):-minB(next.r,debt-dep);bank.r-=x;next.r+=x;}
        pl.c=info.c;pl.r=info.r;continue;
      }
      for(const b of pl.b){
        burn(eco,'luogo_scomparso',b.cash);
        for(let g=0;g<NG;g++)lose(eco,'luogo_scomparso',g,b.s[g]);
        eco.totals.removedClaims+=b.dep+b.debt;
      }
      delete eco.places[id];
    }
    for(const id of topo.order)if(!own(eco.places,id)){
      const pl=newPlace(K,topo.by.get(id));
      eco.places[id]=pl;
      for(const b of pl.b){mint(eco,'nuovo_luogo',b.cash);for(let g=0;g<NG;g++)addGoods(eco,'nuovo_luogo',g,b.s[g]);}
    }
    for(const c of Object.keys(eco.banks))if(!topo.byCont.has(c)){burn(eco,'luogo_scomparso',eco.banks[c].r);delete eco.banks[c];}
    for(const c of Object.keys(eco.continents))if(!topo.byCont.has(c))delete eco.continents[c];
    for(const r of Object.keys(eco.treasuries))if(!topo.realms.includes(r)){burn(eco,'luogo_scomparso',eco.treasuries[r]);delete eco.treasuries[r];}
    for(const r of topo.realms)if(!own(eco.treasuries,r)){const v=treasuryStart(K,topo,r);eco.treasuries[r]=v;mint(eco,'nuovo_luogo',v);}
    // Ordine stabile delle chiavi (come in create), così il salvataggio non dipende dalla storia dei riallineamenti.
    const sorted=o=>Object.fromEntries(Object.keys(o).sort().map(k=>[k,o[k]]));
    eco.places=sorted(eco.places);eco.banks=sorted(eco.banks);eco.treasuries=sorted(eco.treasuries);eco.continents=sorted(eco.continents);
  }
  /* Registro incoerente (dati manomessi ma ben formati): si riparte dai conti attuali, con un evento. */
  function rebase(eco){
    const L=eco.ledger;
    for(const c of Object.keys(eco.banks)){let d=0n,l=0n;for(const id in eco.places)if(eco.places[id].c===c)for(const b of eco.places[id].b){d+=b.dep;l+=b.debt;}eco.banks[c].dep=d;eco.banks[c].loans=l;}
    L.open+=moneyOf(eco)-expectedMoney(L);
    const {stock,transit}=goodsOf(eco);
    for(let g=0;g<NG;g++){
      let lost=0n,added=0n;for(const k in L.gLost)lost+=L.gLost[k][g];for(const k in L.gAdd)added+=L.gAdd[k][g];
      L.gOpen[g]=stock[g]+transit[g]-L.gProd[g]-added+L.gEat[g]+L.gUsed[g]+L.gSpoil[g]+lost;
    }
  }
  function restore(raw,places,now){
    let eco=null,fixes=0;
    try{({eco,fixes}=parse(raw,places,now));}catch{eco=null;}
    if(eco){
      try{
        let moved=false;
        if(!audit(eco).ok){rebase(eco);moved=true;}
        if(!audit(eco).ok)eco=null;
        else if(moved||fixes)event(eco,eco.week,'repair','',`Registro economico riallineato al caricamento: ${fixes} dati riparati`,fixes);
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
    create,restore,serialize,step,system,partial,exchange,signals,audit,report,events,stats,caravans,wallet};
})();
