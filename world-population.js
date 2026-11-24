(() => {
  'use strict';
  /* Residenti autonomi del mondo (PERF-005, fondamenta, IN OMBRA: non è nella build né collegato al motore).
     Due rappresentazioni della stessa popolazione:
     - coorti per i luoghi non materializzati: conteggi interi per cella (luogo, stirpe, fascia d'età, professione, coniugato)
       e una cassa del luogo in BigInt di Scintille;
     - record individuali (colonne compatte in typed array, ricchezza in BigInt64Array) per i luoghi materializzati, con
       memoria e relazioni sparse e con tetto. Identità stabili «idLuogo:n» derivate dal seme.
     Regola d'oro (equivalenza): i QUANTI di ogni settimana (invecchiamento, morti, spedizioni, mestieri, matrimoni, nascite,
     migrazioni) si decidono a livello di cella con conteggi, riporto intero e seme per settimana; i record scelgono soltanto
     CHI agisce, ordinando per utilità individuale (personalità, bisogni, obiettivi, ricchezza, relazioni) con spareggio a
     hash. Le Scintille si muovono fra luoghi solo per importi decisi dalle regole di luogo. Così materializzare un luogo
     alla settimana 0, alla 30 o mai produce gli stessi conteggi per cella e la stessa ricchezza per luogo.
     Passo canonico settimanale identico a ogni livello; niente Math.random né Date nella logica. */
  const SCHEMA=1,WEEK=10080,M=1000000,MAXB=15,NL=8,NP=18,NONE=0,ADV=17,MAXW=(1n<<63n)-1n,YEAR=52.1775;
  const LIMITS=Object.freeze({events:300,memories:8,relations:6});
  const LINEAGES=['human','dwarf','skeleton','bear','fairy','elemental','wyvern','griffin'];
  const LIN_NAMES=['umano','nano','scheletro','orso','fata','elementale','viverna','grifone'];
  const PROFS=['none','farmer','herbalist','miner','carpenter','shepherd','mystic','wellkeeper','baker','alchemist',
    'smith','merchant','innkeeper','guard','scholar','healer','laborer','adventurer'];
  const PROF_NAMES=['senza lavoro','contadino','erbaiolo','minatore','falegname','pastore','cercatore di essenza','pozzaiolo',
    'fornaio','alchimista','fabbro','mercante','locandiere','guardia','studioso','guaritore','manovale','avventuriero'];
  const KINDS=['village','town','city','capital','dungeon','wild'],SETTLE=new Set(['village','town','city','capital']);
  const TRAITS=['bravery','ambition','sociability','wanderlust','diligence'],NEEDS=['food','safety','wealth','belonging'];
  const GOALS_L=['','family','mastery','fortune','glory','journey'],GOALS_S=['rest','eat','safety','heal','work','earn','company'];
  const GOAL_TEXT={family:'fondare una famiglia',mastery:'diventare maestro nel mestiere',fortune:'fare fortuna',glory:'la gloria delle spedizioni',journey:'vedere il mondo'};
  const CAUSES=['','vecchiaia','malattia','spedizione','calamità','guerra','fame'];
  /* PARAMETRI BIOLOGICI. adultDays viene dal gioco (ContinentalBiology; per gli umani coincide con la regola dei 6570 giorni di
     society.js). Durata della vita adulta e della vecchiaia (anni) e fertilità (nascite per coppia all'anno) sono PROVVISORIE:
     da approvare dall'utente. */
  const FALLBACK_ADULT={human:6570,dwarf:8400,skeleton:3,bear:280,fairy:820,elemental:10,wyvern:350,griffin:390};
  const PROVISIONAL={human:[42,16,.12],dwarf:[100,40,.035],skeleton:[60,20,.02],bear:[18,6,.35],fairy:[50,20,.06],
    elemental:[80,20,.02],wyvern:[40,15,.1],griffin:[40,15,.1]};
  const biology={};
  for(const id of LINEAGES){
    const row=window.ContinentalBiology&&window.ContinentalBiology[id];
    const game=Array.isArray(row)&&Number.isFinite(row[1])&&row[1]>=0&&row[1]<=1e6;
    const [adultYears,elderYears,fertility]=PROVISIONAL[id];
    biology[id]=Object.freeze({adultDays:game?row[1]:FALLBACK_ADULT[id],adultYears,elderYears,fertility,provisional:true,
      source:game?'ContinentalBiology':'valore di riserva (uguale a ContinentalBiology)'});
  }
  Object.freeze(biology);
  /* Fasce d'età per stirpe: l'infanzia è divisa in B ≤ 10 secchi di Lb settimane che avanzano tutti insieme su una griglia
     assoluta (età esatta a ±Lb); età adulta in tre fasce (A1–A3) e vecchiaia in due (E1–E2) con transizioni a riporto. */
  const GEO=LINEAGES.map(id=>{
    const b=biology[id],cw=b.adultDays/7,Lb=Math.max(1,Math.ceil(cw/10)),B=Math.min(10,Math.max(1,Math.round(cw/Lb)));
    return {Lb,B,adultW:Math.max(3,b.adultYears*YEAR),elderW:Math.max(2,b.elderYears*YEAR),fert:b.fertility};
  });
  const KEYS=NL*MAXB*NP*2;
  const KEY=(l,b,p,w)=>((l*MAXB+b)*NP+p)*2+w;
  const kLin=new Uint8Array(KEYS),kBand=new Uint8Array(KEYS),kProf=new Uint8Array(KEYS),kWed=new Uint8Array(KEYS),kStage=new Int8Array(KEYS);
  for(let k=0;k<KEYS;k++){
    const w=k%2,p=((k-w)/2)%NP,b=(((k-w)/2-p)/NP)%MAXB,l=Math.floor(k/(2*NP*MAXB)),g=GEO[l];
    kLin[k]=l;kBand[k]=b;kProf[k]=p;kWed[k]=w;
    const st=b<g.B?0:b<g.B+3?1:b<g.B+5?2:-1;
    // celle valide: bambini senza professione né coniuge, anziani senza professione
    kStage[k]=st<0||st===0&&(p||w)||st===2&&p?-1:st;
  }
  const bandName=(l,b)=>{const B=GEO[l].B;return b<B?'c'+b:['A1','A2','A3','E1','E2'][b-B];};
  const keyName=k=>LINEAGES[kLin[k]]+'/'+bandName(kLin[k],kBand[k])+'/'+PROFS[kProf[k]]+'/'+kWed[k];
  // Codici dei meccanismi per i generatori con seme.
  const C={AGE:1,DEATH:2,DEPART:3,OUTCOME:4,CAREER:5,MARRY:6,BIRTH:7,MIGRATE:8,DEST:9,SPLIT:10,SOCIAL:11,MINT:12,PICK:13,
    PHASE:14,TRAIT:15,GOAL:16,PLACE:17,NAME:18,PARENT:19,LIN:20};
  /* Professioni attese per tipo di luogo (millesimi, professioni 1–16); disoccupati e avventurieri dipendono dai segnali. */
  const SHARES={village:[0,300,80,40,60,110,10,40,60,10,30,30,20,40,10,20,90],town:[0,150,60,50,80,50,20,40,80,30,60,90,50,60,30,40,110],
    city:[0,60,50,30,90,20,30,40,90,50,80,140,70,90,60,50,50]};
  const sharesOf=kind=>SHARES[kind==='capital'?'city':SHARES[kind]?kind:'village'];
  const PER_CAPITA={village:800,town:1500,city:2500,capital:4000,dungeon:300,wild:300};
  const TILT={human:[0,5,0,0,0],dwarf:[5,0,0,-5,12],skeleton:[0,0,-10,0,8],bear:[10,0,0,-5,0],fairy:[0,0,12,8,0],
    elemental:[0,8,0,0,0],wyvern:[10,0,0,12,0],griffin:[6,0,0,12,0]};

  const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const clamp=(x,a,b)=>x<a?a:x>b?b:x;
  const intIn=(x,a,b)=>Number.isInteger(x)&&x>=a&&x<=b;
  const canonical=v=>typeof v==='string'&&v.length<=40&&/^(0|[1-9][0-9]*)$/.test(v);
  const safeId=id=>typeof id==='string'&&/^[a-z][a-z0-9._-]{0,63}$/i.test(id)&&!['__proto__','constructor','prototype'].includes(id);
  function mix(h){h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return h>>>0;}
  function hash(a,b,c,d,e){let h=mix((a|0)^0x9e3779b9);h=mix(h^(b|0));h=mix(h^(c|0));h=mix(h^(d|0));return mix(h^(e|0));}
  const u01=h=>h/4294967296;
  function fnv(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;}
  const big=x=>typeof x==='bigint'?x:0n;
  function amount(v){ // importo valido ≥ 0 (BigInt, intero sicuro o stringa decimale), altrimenti 0
    if(typeof v==='bigint')return v>0n?v:0n;
    if(Number.isSafeInteger(v))return v>0?BigInt(v):0n;
    if(canonical(v))return BigInt(v);
    return 0n;
  }
  function apportion(total,weights,tie){ // ripartizione esatta a resti maggiori, spareggi con seme
    const S=weights.reduce((a,b)=>a+b,0),out=weights.map(()=>0);
    if(total<=0||S<=0)return out;
    const raw=weights.map(x=>total*x/S);
    let left=total;
    for(let i=0;i<raw.length;i++){out[i]=Math.floor(raw[i]);left-=out[i];}
    const order=raw.map((x,i)=>[x-Math.floor(x),mix(tie+i),i]).sort((a,b)=>b[0]-a[0]||b[1]-a[1]);
    for(let k=0;k<left;k++)out[order[k%order.length][2]]++;
    return out;
  }

  // ——— Record individuali in colonne ———
  const COLS=[['place',Uint16Array,1],['origin',Uint16Array,1],['serial',Uint32Array,1],['hid',Uint32Array,1],['lin',Uint8Array,1],
    ['band',Uint8Array,1],['prof',Uint8Array,1],['wed',Uint8Array,1],['alive',Uint8Array,1],['notable',Uint8Array,1],['cause',Uint8Array,1],
    ['wounds',Uint8Array,1],['goalS',Uint8Array,1],['goalL',Uint8Array,1],['moves',Uint8Array,1],['born',Int32Array,1],['died',Int32Array,1],
    ['spouse',Int32Array,1],['pa',Int32Array,1],['pb',Int32Array,1],['xp',Uint32Array,1],['kids',Uint16Array,1],
    ['traits',Uint8Array,5],['needs',Uint8Array,4],['wealth',BigInt64Array,1]];
  function makeRecords(cap=64){const R={n:0,cap};for(const [k,T,m] of COLS)R[k]=new T(cap*m);return R;}
  function grow(R,need=R.cap*2){const cap=Math.max(need,R.cap*2);for(const [k,T,m] of COLS){const a=new T(cap*m);a.set(R[k]);R[k]=a;}R.cap=cap;}
  const keyOf=(R,i)=>KEY(R.lin[i],R.band[i],R.prof[i],R.wed[i]?1:0);
  const idOf=(pop,i)=>pop.places[pop.R.origin[i]].id+':'+pop.R.serial[i];
  const T=(R,i,t)=>R.traits[i*5+t],N=(R,i,t)=>R.needs[i*4+t];
  const SYL=[['Ar','Bel','Cor','Dal','El','Fen','Gar','Il','Lor','Mar','Ner','Or','Per','Ral','Sel','Tor','Ul','Val','Zer','Ast','Bri','Cal','Dor','Eri'],
    ['a','e','i','o','ia','eo','ai','u'],['n','l','r','s','th','nd','ra','na','lo','ric','mir','vel','dor','sa','te','no']];
  const nameOf=(pop,i)=>{const h=mix(pop.R.hid[i]^C.NAME);return SYL[0][h%24]+SYL[1][(h>>>5)%8]+SYL[2][(h>>>9)%16];};
  const ageYears=(pop,i,w)=>Math.floor(((w-pop.R.born[i])*7/365)*10)/10;

  function placeIx(pop,id){return typeof id==='string'&&pop.index.has(id)?pop.index.get(id):-1;}
  function addAnon(P,k,d){const v=(P.anon.get(k)||0)+d;if(v)P.anon.set(k,v);else P.anon.delete(k);}
  function anonTotal(P){let n=0;for(const v of P.anon.values())n+=v;return n;}
  // Ricchezza individuale con saturazione: oltre 2^63−1 l'eccedenza resta nella cassa comune del luogo (nessuna perdita).
  function give(pop,i,amt){
    if(amt<=0n)return;
    const R=pop.R,room=MAXW-R.wealth[i];
    if(amt<=room)R.wealth[i]+=amt;
    else{R.wealth[i]=MAXW;pop.places[R.place[i]].pool+=amt-room;}
  }
  function remember(pop,i,kind,a,w){
    let m=pop.mem.get(i);
    if(!m)pop.mem.set(i,m=[]);
    m.push([w,kind,a]);
    if(m.length>LIMITS.memories)m.shift();
  }
  function addRel(pop,i,j,g){
    const R=pop.R;
    let m=pop.rel.get(i);
    if(!m)pop.rel.set(i,m=new Map());
    if(m.has(j)){m.set(j,Math.min(1000,m.get(j)+g));return;}
    if(m.size>=LIMITS.relations){
      let weak=-1,ws=Infinity;
      for(const [o,s] of m){const v=R.alive[o]?s:-1;if(v<ws){ws=v;weak=o;}}
      if(ws>=g+10)return; // le conoscenze deboli lasciano spazio a quelle nuove; i legami forti restano
      m.delete(weak);
    }
    m.set(j,g);
  }
  const bond=(pop,i,j)=>{const m=pop.rel.get(i);return m&&m.has(j)?m.get(j):0;};
  function log(pop,w,kind,P,text){
    pop.log.push({week:w,kind,place:P.id,text});
    if(pop.log.length>LIMITS.events)pop.log.splice(0,pop.log.length-LIMITS.events);
  }
  function money(v){
    v=big(v);
    if(v===0n)return '0 Scintille';
    const parts=[];
    for(const [f,n] of [[1000000n,'Astrali'],[10000n,'Solari'],[100n,'Lunari'],[1n,'Scintille']]){const q=v/f;if(q>0n){parts.push(q+' '+n);v-=q*f;}}
    return parts.slice(0,2).join(' e ');
  }

  // ——— Creazione ———
  function trait(h,t,l){const a=mix(h+t*0x9e3779b1);return clamp(Math.round(((a&255)+((a>>>8)&255))*100/510)+TILT[LINEAGES[l]][t],0,100);}
  function ageFor(l,b,h,w){
    const g=GEO[l],u=(h%1000)/1000,cw=g.B*g.Lb;
    if(b<g.B)return b*g.Lb+(h%g.Lb);
    if(b<g.B+3)return cw+Math.floor((b-g.B+u)*g.adultW/3);
    return cw+Math.floor(g.adultW+(b-g.B-3+u)*g.elderW/2);
  }
  function pickGoal(pop,i,w,not){
    const R=pop.R,score=[0,T(R,i,2),T(R,i,4),T(R,i,1),T(R,i,0),T(R,i,3)];
    let best=1,bs=-1;
    for(let g=1;g<=5;g++){if(g===not)continue;const s=score[g]+hash(pop.seed,R.hid[i],C.GOAL,w,g)%16;if(s>bs){bs=s;best=g;}}
    return best;
  }
  function mint(pop,P,key,w,age){
    const R=pop.R;
    if(R.n>=R.cap)grow(R);
    const i=R.n++,serial=P.minted++,h=hash(pop.seed,P.h,C.MINT,serial,0),l=kLin[key];
    R.place[i]=P.ix;R.origin[i]=P.ix;R.serial[i]=serial;R.hid[i]=h;R.lin[i]=l;R.band[i]=kBand[key];R.prof[i]=kProf[key];
    R.wed[i]=kWed[key];R.alive[i]=1;R.notable[i]=0;R.cause[i]=0;R.wounds[i]=0;R.goalS[i]=0;R.moves[i]=0;R.xp[i]=0;R.kids[i]=0;
    R.born[i]=w-(age===undefined?ageFor(l,kBand[key],h,w):age);R.died[i]=-1;R.spouse[i]=-1;R.pa[i]=-1;R.pb[i]=-1;R.wealth[i]=0n;
    for(let t=0;t<5;t++)R.traits[i*5+t]=trait(h,t,l);
    for(let t=0;t<4;t++)R.needs[i*4+t]=30;
    R.goalL[i]=kStage[key]>=1?pickGoal(pop,i,w,0):0;
    pop.idMap.set(P.id+':'+serial,i);
    return i;
  }
  function lineageWeights(P,desc){
    if(object(desc.lineages)){
      const ws=LINEAGES.map(id=>{const v=desc.lineages[id];return Number.isFinite(v)&&v>0?v:0;});
      if(ws.some(x=>x>0))return ws;
    }
    const h=fnv(String(desc.continent||''))^P.h,ws=LINEAGES.map(()=>0);
    ws[0]=40;ws[1+(h%7)]+=30;ws[1+((h>>>4)%7)]+=15;ws[1+((h>>>8)%7)]+=8;
    return ws;
  }
  function populate(pop,P,desc){
    const n=intIn(desc.population,0,1e7)?desc.population:0,tie=P.h;
    P.capacity=Math.max(40,n);
    const perLin=apportion(n,lineageWeights(P,desc),tie);
    const share=sharesOf(P.kind);
    for(let l=0;l<NL;l++){
      if(!perLin[l])continue;
      const g=GEO[l],[kids,adults,elders]=apportion(perLin[l],[24,60,16],tie+l*31);
      apportion(kids,new Array(g.B).fill(1),tie+l*37).forEach((c,b)=>{if(c)addAnon(P,KEY(l,b,0,0),c);});
      const bands=apportion(adults,[40,35,25],tie+l*41);
      for(let a=0;a<3;a++){
        const jobs=apportion(bands[a],[30,...share.slice(1),40],tie+l*43+a);
        jobs.forEach((c,p)=>{
          if(!c)return;
          const wed=Math.round(c*[30,60,60][a]/100);
          if(c-wed)addAnon(P,KEY(l,g.B+a,p,0),c-wed);
          if(wed)addAnon(P,KEY(l,g.B+a,p,1),wed);
        });
      }
      apportion(elders,[60,40],tie+l*47).forEach((c,e)=>{
        const wed=Math.round(c*[60,45][e]/100);
        if(c-wed)addAnon(P,KEY(l,g.B+3+e,0,0),c-wed);
        if(wed)addAnon(P,KEY(l,g.B+3+e,0,1),wed);
      });
    }
    const pc=PER_CAPITA[P.kind]||800;
    P.pool=BigInt(n)*BigInt(Math.floor(pc*(900+hash(pop.seed,P.h,C.PLACE,0,0)%200)/1000));
  }
  function newPlace(pop,desc,ix){
    const kind=KINDS.includes(desc.kind)?desc.kind:'village';
    return {id:desc.id,ix,kind,continent:typeof desc.continent==='string'?desc.continent.slice(0,64):'',links:[],linkIds:[],h:fnv(desc.id),
      anon:new Map(),pool:0n,carry:{},minted:0,materialized:false,capacity:40};
  }
  function linkUp(pop,descs){
    const byId=new Map(descs.map(d=>[d.id,d]));
    for(const P of pop.places){
      const d=byId.get(P.id),ids=d&&Array.isArray(d.links)?d.links:P.linkIds;
      const seen=new Set();
      P.links=[];P.linkIds=[];
      for(const id of ids||[]){const j=placeIx(pop,id);if(j>=0&&j!==P.ix&&!seen.has(j)){seen.add(j);P.links.push(j);P.linkIds.push(id);}}
    }
  }
  function validDescs(places){
    const out=[],seen=new Set();
    for(const d of Array.isArray(places)?places:[])if(object(d)&&safeId(d.id)&&!seen.has(d.id)&&out.length<65535){seen.add(d.id);out.push(d);}
    return out;
  }
  function blank(seed,week){
    return {schema:SCHEMA,seed:seed>>>0,week,note:'',places:[],index:new Map(),R:makeRecords(),idMap:new Map(),mem:new Map(),rel:new Map(),
      log:[],dec:emptyDecisions(week),_ci:null,
      totals:{births:0,deaths:0,marriages:0,migrations:0,arrivals:0,careers:0,departures:0,expeditionDeaths:0,matured:0,loot:0n,wages:0n,spend:0n,tax:0n},
      rtotals:{marriages:0,bondMarriages:0,births:0}};
  }
  function emptyDecisions(w){return {week:w,births:[],deaths:[],marriages:[],migrations:[],departures:[],careers:[],matured:[]};}
  const weekOf=now=>Number.isFinite(now)&&now>=0?Math.ceil(now/WEEK):0;
  function create(seed,places,now){
    const pop=blank(Number.isFinite(seed)?Math.floor(Math.abs(seed)):0,weekOf(now)),descs=validDescs(places);
    for(const d of descs){const P=newPlace(pop,d,pop.places.length);pop.places.push(P);pop.index.set(P.id,P.ix);}
    linkUp(pop,descs);
    for(const d of descs)populate(pop,pop.places[pop.index.get(d.id)],d);
    return pop;
  }

  // ——— Censimento dei record per luogo e cella ———
  function census(pop){
    const R=pop.R,out=pop.places.map(()=>({cells:new Map(),list:[]}));
    for(let i=0;i<R.n;i++){
      if(!R.alive[i])continue;
      const c=out[R.place[i]],k=keyOf(R,i);
      c.list.push(i);
      let a=c.cells.get(k);
      if(!a)c.cells.set(k,a=[]);
      a.push(i);
    }
    return out;
  }
  const getCensus=pop=>pop._ci||(pop._ci=census(pop));
  // Celle non vuote del luogo (anonimi + record), in ordine di chiave: l'ordine è identico in ogni rappresentazione.
  function cellList(P,c,filter){
    const keys=new Set();
    for(const [k,n] of P.anon)if(n>0&&filter(k))keys.add(k);
    for(const k of c.cells.keys())if(filter(k))keys.add(k);
    return [...keys].sort((a,b)=>a-b).map(k=>({key:k,anon:P.anon.get(k)||0,recs:c.cells.get(k)||[]}));
  }
  // Quanti con riporto intero per luogo e meccanismo, distribuiti fra le celle (parte intera, poi estrazioni con seme).
  function allot(pop,P,mech,code,w,cells){
    let X=0,cap=0;
    for(const c of cells){X+=c.w;cap+=c.cap;}
    const c0=own(P.carry,mech)?P.carry[mech]:hash(pop.seed,P.h,C.PHASE,code,0)%M,tot=X+c0;
    let K=Math.floor(tot/M);
    P.carry[mech]=tot-K*M;
    if(K>cap)K=cap;
    const out=cells.map(()=>0);
    let left=K;
    for(let t=0;t<cells.length&&left>0;t++){const f=Math.min(Math.floor(cells[t].w/M),cells[t].cap,left);out[t]=f;left-=f;}
    for(let j=0;left>0;j++){
      let W=0;
      for(let t=0;t<cells.length;t++)if(out[t]<cells[t].cap)W+=cells[t].w%M;
      const byCap=W===0;
      if(byCap)for(let t=0;t<cells.length;t++)W+=cells[t].cap-out[t];
      if(W<=0)break;
      let r=Math.floor(u01(hash(pop.seed,P.h,code,w,j))*W);
      for(let t=0;t<cells.length;t++){
        const wt=out[t]<cells[t].cap?(byCap?cells[t].cap-out[t]:cells[t].w%M):0;
        if(r<wt){out[t]++;left--;break;}
        r-=wt;
      }
    }
    return out;
  }
  function draw(pop,P,code,w,j,weights){
    let W=0;
    for(const x of weights)W+=x;
    if(W<=0)return -1;
    let r=Math.floor(u01(hash(pop.seed,P.h,code,w,j))*W);
    for(let t=0;t<weights.length;t++){if(r<weights[t])return t;r-=weights[t];}
    return weights.length-1;
  }
  // Quanti fra anonimi e record di una cella mista (luogo non materializzato con immigrati noti).
  function split(pop,P,code,w,key,k,anonN,recN){
    if(k<=0)return 0;
    if(!anonN)return Math.min(k,recN);
    if(!recN)return 0;
    const n=anonN+recN,kr=Math.floor((k*recN+Math.floor(u01(hash(pop.seed,P.h,C.SPLIT,w,key*64+code))*n))/n);
    return clamp(kr,Math.max(0,k-anonN),Math.min(k,recN));
  }
  // Chi agisce: utilità individuale decrescente, spareggio con hash (mai l'ordine di creazione).
  function choose(pop,cand,k,util,code,w){
    if(k<=0||!cand.length)return [];
    const R=pop.R,items=cand.map(i=>[i,util(i),hash(pop.seed,R.hid[i],code,w,0)]);
    items.sort((x,y)=>{const a=x[0],b=y[0];/*SCELTA*/return y[1]-x[1]||y[2]-x[2]||a-b;});
    return items.slice(0,k).map(x=>x[0]);
  }

  // ——— Segnali dell'economia ———
  const NEUTRAL={foodScarcity:0,priceIndex:1000,wageIndex:1000,unemployment:0,prosperity:1000,crisis:0,war:0,disaster:0,season:0};
  function signalsOf(env,id){
    let raw=null;
    try{raw=env&&env.economy&&typeof env.economy.signals==='function'?env.economy.signals(id):null;}catch(e){raw=null;}
    const s={...NEUTRAL};
    if(!object(raw))return s;
    const n=(k,a,b)=>{if(Number.isFinite(raw[k]))s[k]=clamp(Math.round(raw[k]),a,b);};
    n('foodScarcity',0,1000);n('priceIndex',0,10000);n('wageIndex',0,10000);n('unemployment',0,1000);n('prosperity',0,10000);
    for(const k of ['crisis','war','disaster'])s[k]=raw[k]===1||raw[k]===true?1:0;
    n('season',0,3);
    return s;
  }
  const attract=s=>s.prosperity+s.wageIndex-s.foodScarcity-s.war*1000-s.disaster*800-s.crisis*400;

  // ——— Fasi della settimana ———
  function adulthood(pop,i,w){
    const R=pop.R;
    R.goalL[i]=pickGoal(pop,i,w,0);
    remember(pop,i,2,0,w);
    pop.dec.matured.push(idOf(pop,i));
  }
  function phaseShift(pop,w,ci){
    const R=pop.R;
    for(const P of pop.places){
      const c=ci[P.ix];
      for(let l=0;l<NL;l++){
        const g=GEO[l];
        if(w%g.Lb!==0)continue;
        for(let b=g.B-1;b>=0;b--){
          const from=KEY(l,b,0,0),to=KEY(l,b+1,0,0),n=P.anon.get(from)||0,rs=c.cells.get(from);
          if(n){addAnon(P,from,-n);addAnon(P,to,n);}
          if(rs)for(const i of rs){R.band[i]=b+1;if(b+1===g.B)adulthood(pop,i,w);}
          if(b+1===g.B)pop.totals.matured+=n+(rs?rs.length:0);
        }
      }
    }
  }
  function phaseBands(pop,w,ci){
    const R=pop.R;
    for(const P of pop.places){
      const c=ci[P.ix];
      const cells=cellList(P,c,k=>{const g=GEO[kLin[k]],b=kBand[k];return kStage[k]>=1&&b<g.B+4;});
      if(!cells.length)continue;
      const spec=cells.map(x=>{
        const g=GEO[kLin[x.key]],b=kBand[x.key],n=x.anon+x.recs.length;
        return {w:Math.round(n*(b<g.B+3?3e6/g.adultW:2e6/g.elderW)),cap:n};
      });
      const out=allot(pop,P,'age',C.AGE,w,spec);
      cells.forEach((x,t)=>{
        const k=out[t];if(!k)return;
        const l=kLin[x.key],g=GEO[l],b=kBand[x.key],retire=b===g.B+2,to=KEY(l,b+1,retire?0:kProf[x.key],kWed[x.key]);
        const kr=split(pop,P,C.AGE,w,x.key,k,x.anon,x.recs.length);
        if(k-kr){addAnon(P,x.key,kr-k);addAnon(P,to,k-kr);}
        for(const i of choose(pop,x.recs,kr,i=>-R.born[i],C.AGE,w)){
          R.band[i]=b+1;
          if(retire){R.prof[i]=0;remember(pop,i,12,0,w);}
        }
      });
    }
  }
  function hazard(k,s){
    const l=kLin[k],g=GEO[l],b=kBand[k],st=kStage[k];
    let h;
    if(st===0)h=25;else if(b===g.B)h=30;else if(b===g.B+1)h=50;else if(b===g.B+2)h=120;
    else if(b===g.B+3)h=0.5e6/g.elderW;else h=2e6/g.elderW;
    return h*(1000+s.foodScarcity*0.8+s.disaster*1500+(st===1?s.war*800:0))/1000;
  }
  function kill(pop,i,w,cause,list,P){
    const R=pop.R;
    R.alive[i]=0;R.died[i]=w;R.cause[i]=cause;
    let amt=R.wealth[i];R.wealth[i]=0n;
    const sp=R.spouse[i];
    if(R.wed[i]===1&&sp>=0&&R.alive[sp]){
      R.wed[sp]=2;remember(pop,sp,5,i,w);
      if(R.place[sp]===R.place[i]&&amt>0n){give(pop,sp,amt);remember(pop,sp,10,i,w);amt=0n;}
    }
    if(amt>0n&&R.kids[i]){
      const heirs=list.filter(j=>R.alive[j]&&(R.pa[j]===i||R.pb[j]===i));
      if(heirs.length){
        const each=amt/BigInt(heirs.length);
        let rest=amt-each*BigInt(heirs.length);
        for(const j of heirs){give(pop,j,each+(rest>0n?1n:0n));if(rest>0n)rest--;remember(pop,j,10,i,w);}
        amt=0n;
      }
    }
    if(amt>0n)P.pool+=amt;
    const id=idOf(pop,i);
    pop.dec.deaths.push({id,cause:CAUSES[cause]});
  }
  function phaseDeath(pop,w,sig,ci){
    const R=pop.R;
    for(const P of pop.places){
      const c=ci[P.ix],s=sig[P.ix],cells=cellList(P,c,k=>kStage[k]>=0);
      if(!cells.length)continue;
      const out=allot(pop,P,'death',C.DEATH,w,cells.map(x=>{const n=x.anon+x.recs.length;return {w:Math.round(n*hazard(x.key,s)),cap:n};}));
      cells.forEach((x,t)=>{
        const k=out[t];if(!k)return;
        const kr=split(pop,P,C.DEATH,w,x.key,k,x.anon,x.recs.length);
        if(k-kr)addAnon(P,x.key,kr-k);
        pop.totals.deaths+=k;
        const cand=x.recs/*MORTE*/;
        for(const i of choose(pop,cand,kr,i=>(w-R.born[i])+R.wounds[i]*20+N(R,i,0)*2,C.DEATH,w)){
          const st=kStage[x.key],cause=st===2?1:s.disaster?4:s.war&&st===1?5:s.foodScarcity>500?6:2;
          kill(pop,i,w,cause,c.list,P);
          log(pop,w,'death',P,`Muore ${nameOf(pop,i)} (${LIN_NAMES[R.lin[i]]}, ${Math.floor(ageYears(pop,i,w))} anni) a ${P.id}: ${CAUSES[cause]}.`);
        }
      });
    }
  }
  function placeWealth(pop,P,list){let W=P.pool;for(const i of list)if(pop.R.alive[i])W+=pop.R.wealth[i];return W;}
  function phaseExpeditions(pop,w,sig,ci){
    const R=pop.R;
    for(const P of pop.places){
      const c=ci[P.ix],s=sig[P.ix],cells=cellList(P,c,k=>kStage[k]===1&&kProf[k]===ADV);
      if(!cells.length)continue;
      const rate=40000*(1000+s.crisis*500+Math.max(0,1000-s.prosperity)/2)/1000;
      const out=allot(pop,P,'depart',C.DEPART,w,cells.map(x=>{const n=x.anon+x.recs.length;return {w:Math.round(n*rate),cap:n};}));
      const wilds=P.links.filter(j=>!SETTLE.has(pop.places[j].kind));
      cells.forEach((x,t)=>{
        const k=out[t];if(!k)return;
        pop.totals.departures+=k;
        const outcomes=[];
        for(let j=0;j<k;j++){
          const h=hash(pop.seed,P.h,C.OUTCOME,w,x.key*1024+j),di=wilds.length?wilds[hash(pop.seed,P.h,C.DEST,w,x.key*1024+j)%wilds.length]:-1;
          const D=di>=0?pop.places[di]:null,d=D?1+D.h%4+(D.kind==='dungeon'?1:0):2,r=u01(h),h2=mix(h^0x5bd1e995);
          let o,loot=0n,xp=2,wound=0;
          if(r<0.012*d)o='death';
          else if(r<0.072*d){o='wounded';loot=BigInt(d*(h2%300));xp=5*d;wound=20+h2%40;}
          else if(r<0.072*d+0.5){o='success';loot=BigInt(d*(400+h2%1600));xp=10*d;}
          else o='empty';
          outcomes.push({o,loot,xp,wound,to:D?D.id:'terre selvagge',rank:o==='success'?3:o==='empty'?2:o==='wounded'?1:0});
        }
        const kr=split(pop,P,C.DEPART,w,x.key,k,x.anon,x.recs.length);
        // Anonimi: esiti dalla coda della lista.
        let lost=0,lostTo='';
        for(const e of outcomes.slice(kr)){
          pop.totals.loot+=e.loot;P.pool+=e.loot;
          if(e.o==='death'){addAnon(P,x.key,-1);lost++;lostTo=e.to;pop.totals.deaths++;pop.totals.expeditionDeaths++;}
        }
        if(lost)log(pop,w,'expedition',P,`${lost===1?'Un avventuriero':lost+' avventurieri'} di ${P.id} non ${lost===1?'torna':'tornano'} dalla spedizione a ${lostTo}.`);
        // Record: i più motivati partono; gli esiti migliori vanno ai più esperti.
        const who=choose(pop,x.recs,kr,i=>T(R,i,0)*3+T(R,i,1)*2+N(R,i,2)*2-R.wounds[i]*4+(R.goalL[i]===4?80:0)+(R.goalL[i]===3?40:0)+(R.goalS[i]===5?30:0),C.DEPART,w);
        const mine=outcomes.slice(0,kr).sort((a,b)=>b.rank-a.rank||(b.loot>a.loot?1:b.loot<a.loot?-1:0));
        const skill=who.slice().sort((a,b)=>(R.xp[b]-R.wounds[b]*2)-(R.xp[a]-R.wounds[a]*2)||R.hid[a]-R.hid[b]);
        skill.forEach((i,j)=>{
          const e=mine[j],id=idOf(pop,i),name=nameOf(pop,i);
          pop.dec.departures.push({id,to:e.to,outcome:e.o,loot:String(e.loot)});
          pop.totals.loot+=e.loot;
          if(e.o==='death'){
            pop.totals.deaths++;pop.totals.expeditionDeaths++;
            kill(pop,i,w,3,c.list,P);
            log(pop,w,'expedition',P,`${name} non torna dalla spedizione a ${e.to}.`);
            return;
          }
          give(pop,i,e.loot);R.xp[i]=Math.min(4e9,R.xp[i]+e.xp);R.wounds[i]=Math.min(100,R.wounds[i]+e.wound);
          remember(pop,i,8,e.rank,w);
          log(pop,w,'expedition',P,e.o==='success'?`${name} torna da ${e.to} con ${money(e.loot)}.`:e.o==='wounded'?`${name} torna ferito dalla spedizione a ${e.to}.`:`${name} torna a mani vuote da ${e.to}.`);
        });
      });
    }
  }
  function targets(P,s,A){
    const sh=sharesOf(P.kind),S=sh.reduce((a,b)=>a+b,0),t=new Array(NP).fill(0);
    const noneT=20+s.crisis*60+s.disaster*40+clamp(Math.floor((1000-s.wageIndex)/8),0,100);
    const advT=35+s.crisis*30+s.war*20+(s.prosperity<800?20:0),rest=1000-noneT-advT;
    for(let p=1;p<ADV;p++)t[p]=Math.floor(A*sh[p]*rest/(S*1000));
    t[NONE]=Math.floor(A*noneT/1000);t[ADV]=Math.floor(A*advT/1000);
    return t;
  }
  function careerUtil(R,i,src,dst){
    let u=N(R,i,2)*2+T(R,i,1)+(src===NONE?300:0)+(R.goalS[i]===4?100:0);
    u-=R.goalL[i]===2&&src!==NONE?150+T(R,i,4):T(R,i,4)/2;
    if(dst===ADV)u+=T(R,i,0)*2+(R.goalL[i]===4?150:0)-R.wounds[i]*2;
    if(dst===11&&R.goalL[i]===3)u+=60;
    return u;
  }
  function phaseCareers(pop,w,sig,ci){
    const R=pop.R;
    for(const P of pop.places){
      const c=ci[P.ix],s=sig[P.ix],cells=cellList(P,c,k=>kStage[k]===1);
      if(!cells.length)continue;
      const live=cells.map(x=>({key:x.key,anon:x.anon,recs:x.recs.slice()})),cur=new Array(NP).fill(0);
      let A=0;
      for(const x of live){const n=x.anon+x.recs.length;cur[kProf[x.key]]+=n;A+=n;}
      const t=targets(P,s,A),sur=cur.map((n,p)=>Math.max(0,n-t[p])),def=cur.map((n,p)=>Math.max(0,t[p]-n));
      const mis=def.reduce((a,b)=>a+b,0);
      const K=allot(pop,P,'career',C.CAREER,w,[{w:mis*25000,cap:Math.min(mis,sur.reduce((a,b)=>a+b,0))}])[0];
      for(let j=0;j<K;j++){
        const src=draw(pop,P,C.CAREER,w,j*4+1,sur),dst=draw(pop,P,C.CAREER,w,j*4+2,def);
        if(src<0||dst<0)break;
        const pool=live.map(x=>kProf[x.key]===src?x.anon+x.recs.length:0),ti=draw(pop,P,C.CAREER,w,j*4+3,pool);
        if(ti<0)break;
        const x=live[ti],to=KEY(kLin[x.key],kBand[x.key],dst,kWed[x.key]);
        sur[src]--;def[dst]--;pop.totals.careers++;
        if(split(pop,P,C.CAREER,w,x.key*64+j%64,1,x.anon,x.recs.length)===0){x.anon--;addAnon(P,x.key,-1);addAnon(P,to,1);continue;}
        const [i]=choose(pop,x.recs,1,i=>careerUtil(R,i,src,dst),C.CAREER,w*64+j%64);
        x.recs.splice(x.recs.indexOf(i),1);
        R.prof[i]=dst;remember(pop,i,6,dst,w);
        const id=idOf(pop,i);
        pop.dec.careers.push({id,from:PROFS[src],to:PROFS[dst]});
        log(pop,w,'career',P,`${nameOf(pop,i)} diventa ${PROF_NAMES[dst]} a ${P.id}.`);
      }
    }
  }
  const MARRY=[3500,2500,800];
  function bestBond(pop,i,singles){
    const m=pop.rel.get(i);
    if(!m)return 0;
    let b=0;
    for(const [j,s] of m)if(s>b&&singles.has(j))b=s;
    return b;
  }
  function phaseMarriage(pop,w,sig,ci){
    const R=pop.R;
    for(const P of pop.places){
      const c=ci[P.ix],s=sig[P.ix];
      const mod=Math.max(0,s.prosperity)*(1000-s.crisis*300)*(1000-s.war*300)/1e9;
      const adults=cellList(P,c,k=>kWed[k]===0&&kStage[k]===1); // una sola volta per luogo, poi per stirpe (ordine per chiave)
      if(!adults.length)continue;
      for(let l=0;l<NL;l++){
        const g=GEO[l],cells=adults.filter(x=>kLin[x.key]===l);
        if(!cells.length)continue;
        let S=0,X=0;
        const ws=cells.map(x=>{const n=x.anon+x.recs.length;S+=n;const v=Math.round(n*MARRY[kBand[x.key]-g.B]*mod);X+=v;return v;});
        const m=allot(pop,P,'marry:'+l,C.MARRY*8+l,w,[{w:Math.floor(X/2),cap:Math.floor(S/2)}])[0];
        if(!m)continue;
        pop.totals.marriages+=m;
        // Persone per cella: per ogni coppia si estrae una cella; metà delle volte il partner viene dalla stessa cella
        // (omogamia: stesso mestiere e fascia d'età), altrimenti da un'altra estrazione. Regola di cella, uguale ovunque.
        const take=cells.map(()=>0),avail=cells.map(x=>x.anon+x.recs.length),wt=()=>cells.map((x,t)=>avail[t]-take[t]>0?Math.max(1,ws[t]):0);
        for(let j=0;j<m;j++){
          const a=draw(pop,P,C.MARRY*8+l,w,1000+2*j,wt());
          if(a<0)break;
          take[a]++;
          const b=avail[a]-take[a]>0&&hash(pop.seed,P.h,C.MARRY*8+l,w,5000+j)%2===0?a:draw(pop,P,C.MARRY*8+l,w,1001+2*j,wt());
          if(b<0){take[a]--;break;}
          take[b]++;
        }
        const singles=new Set();
        for(const x of cells)for(const i of x.recs)singles.add(i);
        const quota=cells.map((x,t)=>{
          const k=take[t];if(!k)return 0;
          const kr=split(pop,P,C.MARRY,w,x.key,k,x.anon,x.recs.length);
          if(k-kr){addAnon(P,x.key,kr-k);addAnon(P,x.key+1,k-kr);}
          return kr;
        });
        const cellOf=new Map();
        cells.forEach((x,t)=>{if(quota[t])for(const i of x.recs)cellOf.set(i,t);});
        const wish=i=>T(R,i,2)*2+N(R,i,3)*2+(R.goalL[i]===1?150:0);
        // Prima le coppie già legate (corteggiamento, amicizia) entro le quote di cella decise dalla regola: chi si conosce si sposa.
        const pairs=[],seenPair=new Set();
        for(const [i] of cellOf){
          const m2=pop.rel.get(i);
          if(m2)for(const j of m2.keys()){
            if(!cellOf.has(j))continue;
            const a=Math.min(i,j),b=Math.max(i,j),pk=a*4294967296+b;
            if(seenPair.has(pk))continue;
            seenPair.add(pk);
            pairs.push([(bond(pop,a,b)+bond(pop,b,a))*3+wish(a)+wish(b),hash(pop.seed,R.hid[a]^R.hid[b],C.MARRY,w,2),a,b]);
          }
        }
        pairs.sort((a,b)=>b[0]-a[0]||b[1]-a[1]||a[2]-b[2]||a[3]-b[3]);
        const chosen=[],picked=new Set(),left=quota.slice();
        for(const [,,i,j] of pairs){
          if(picked.has(i)||picked.has(j))continue;
          const ti=cellOf.get(i),tj=cellOf.get(j);
          if(ti===tj?left[ti]<2:left[ti]<1||left[tj]<1)continue;
          left[ti]--;left[tj]--;picked.add(i);picked.add(j);chosen.push(i,j);
        }
        // Poi il resto delle quote, per desiderio di famiglia e bisogno di compagnia.
        cells.forEach((x,t)=>{
          if(!left[t])return;
          for(const i of choose(pop,x.recs.filter(i=>!picked.has(i)),left[t],i=>wish(i)+bestBond(pop,i,singles)*3,C.MARRY,w)){chosen.push(i);picked.add(i);}
        });
        // Coppie: prima chi ha già un legame (il più forte), poi per spareggio con hash.
        const free=chosen.slice();
        while(free.length>=2){
          let ba=0,bb=1,bs=-1,bh=0;
          for(let a=0;a<free.length;a++)for(let b=a+1;b<free.length;b++){
            const sv=bond(pop,free[a],free[b])+bond(pop,free[b],free[a]),hv=hash(pop.seed,R.hid[free[a]]^R.hid[free[b]],C.MARRY,w,1);
            if(sv>bs||sv===bs&&hv>bh){bs=sv;bh=hv;ba=a;bb=b;}
          }
          const i=free[ba],j=free[bb];
          free.splice(bb,1);free.splice(ba,1);
          pop.rtotals.marriages++;
          if(bs>0)pop.rtotals.bondMarriages++;
          for(const [x,y] of [[i,j],[j,i]]){R.wed[x]=1;R.spouse[x]=y;remember(pop,x,3,y,w);addRel(pop,x,y,50);}
          pop.dec.marriages.push({a:idOf(pop,i),b:idOf(pop,j)});
          log(pop,w,'marriage',P,`${nameOf(pop,i)} e ${nameOf(pop,j)} si sposano a ${P.id}.`);
        }
        for(const i of free){R.wed[i]=1;R.spouse[i]=-1;remember(pop,i,3,-1,w);}
      }
    }
  }
  const FERT=[1,.8,.25];
  function phaseBirths(pop,w,sig,ci){
    const R=pop.R;
    for(const P of pop.places){
      const c=ci[P.ix],s=sig[P.ix];
      const alive=anonTotal(P)+c.list.length;
      if(!alive)continue;
      const crowd=alive<=P.capacity?1:Math.max(0,1-(alive-P.capacity)/(P.capacity/2));
      const mod=crowd*Math.min(2,s.prosperity/1000)*(1-s.foodScarcity/1500)*(1-s.war*.3)*(1-s.disaster*.5);
      const couples=cellList(P,c,k=>kWed[k]===1&&kStage[k]===1);
      for(let l=0;l<NL;l++){
        const g=GEO[l],cells=couples.filter(x=>kLin[x.key]===l);
        if(!cells.length)continue;
        let X=0;
        for(const x of cells)X+=(x.anon+x.recs.length)*FERT[kBand[x.key]-g.B];
        const K=allot(pop,P,'birth:'+l,C.BIRTH*8+l,w,[{w:Math.round(X*g.fert/YEAR/2*M*Math.max(0,mod)),cap:1e9}])[0];
        if(!K)continue;
        pop.totals.births+=K;
        const key=KEY(l,0,0,0);
        if(!P.materialized){addAnon(P,key,K);continue;}
        const parents=[];
        for(const x of cells)for(const i of x.recs)parents.push(i);
        for(let j=0;j<K;j++){
          const pairs=parents.filter(i=>R.wed[i]===1&&R.spouse[i]>=0&&R.alive[R.spouse[i]]&&R.place[R.spouse[i]]===P.ix&&(R.spouse[i]>i||!parents.includes(R.spouse[i])));
          const pool=pairs.length?pairs:parents;
          const [a]=choose(pop,pool,1,i=>(R.goalL[i]===1?100:0)+T(R,i,2)+N(R,i,3)-30*R.kids[i],C.PARENT,w*64+j%64);
          const b=a===undefined?-1:R.spouse[a];
          const i=mint(pop,P,key,w,0);
          R.goalL[i]=0;
          if(a!==undefined){R.pa[i]=a;R.kids[a]=Math.min(65535,R.kids[a]+1);remember(pop,a,4,i,w);}
          if(b>=0){R.pb[i]=b;R.kids[b]=Math.min(65535,R.kids[b]+1);if(R.alive[b])remember(pop,b,4,i,w);}
          remember(pop,i,1,a===undefined?-1:a,w);
          pop.rtotals.births++;
          const id=idOf(pop,i);
          pop.dec.births.push({id,parents:[a,b].filter(x=>x!==undefined&&x>=0).map(x=>idOf(pop,x))});
          log(pop,w,'birth',P,`Nasce ${nameOf(pop,i)} (${LIN_NAMES[l]})${a===undefined?'':' da '+nameOf(pop,a)+(b>=0?' e '+nameOf(pop,b):'')} a ${P.id}.`);
        }
      }
    }
  }
  function withdraw(pop,P,list,need){
    const R=pop.R,a=P.pool<need?P.pool:need;
    P.pool-=a;need-=a;
    if(need>0n){
      const rich=list.filter(i=>R.alive[i]&&R.wealth[i]>0n).sort((x,y)=>R.wealth[y]>R.wealth[x]?1:R.wealth[y]<R.wealth[x]?-1:x-y);
      for(const i of rich){const t=R.wealth[i]<need?R.wealth[i]:need;R.wealth[i]-=t;need-=t;if(need===0n)break;}
    }
    return need;
  }
  function phaseMigration(pop,w,sig,ci){
    const R=pop.R,plan=[];
    for(const P of pop.places){
      const c=ci[P.ix],s=sig[P.ix],dests=P.links.filter(j=>SETTLE.has(pop.places[j].kind));
      if(!dests.length)continue;
      const cells=cellList(P,c,k=>kStage[k]===1&&kWed[k]===0);
      if(!cells.length)continue;
      const alive=anonTotal(P)+c.list.length,own=attract(s),att=dests.map(j=>Math.max(50,attract(sig[j])+1000));
      const best=Math.max(...dests.map(j=>attract(sig[j])));
      const rate=500+s.foodScarcity*3+s.crisis*4000+s.war*8000+s.disaster*6000+Math.max(0,s.unemployment-100)*2+Math.max(0,best-own)*2+(alive>P.capacity*1.2?2000:0);
      const out=allot(pop,P,'migrate',C.MIGRATE,w,cells.map(x=>{const n=x.anon+x.recs.length;return {w:Math.round(n*rate),cap:n};}));
      const share=alive?placeWealth(pop,P,c.list)/BigInt(alive):0n;
      cells.forEach((x,t)=>{
        const k=out[t];if(!k)return;
        const kr=split(pop,P,C.MIGRATE,w,x.key,k,x.anon,x.recs.length);
        const who=choose(pop,x.recs,kr,i=>{
          let ties=0;const m=pop.rel.get(i);
          if(m)for(const [j,sv] of m)if(R.alive[j]&&R.place[j]===P.ix)ties+=sv;
          return T(R,i,3)*3+N(R,i,2)+N(R,i,1)*2+N(R,i,0)+(R.goalL[i]===5?120:0)+(R.goalL[i]===3?40:0)-Math.min(300,ties);
        },C.MIGRATE,w);
        for(let j=0;j<k;j++){
          const D=dests[draw(pop,P,C.DEST,w,x.key*1024+j,att)];
          pop.totals.migrations++;
          if(j<kr){
            const i=who[j];
            let purse=share;/*BORSA*/
            const mine=R.wealth[i];
            R.wealth[i]=0n;
            if(mine>=purse)P.pool+=mine-purse;else withdraw(pop,P,c.list,purse-mine);
            plan.push({from:P.ix,to:D,key:x.key,i,purse});
          }else{
            addAnon(P,x.key,-1);
            withdraw(pop,P,c.list,share);
            plan.push({from:P.ix,to:D,key:x.key,i:-1,purse:share});
          }
        }
      });
    }
    for(const m of plan){
      const D=pop.places[m.to],F=pop.places[m.from];
      pop.totals.arrivals++;
      if(m.i<0){
        if(D.materialized){const i=mint(pop,D,m.key,w);R.moves[i]=1;give(pop,i,m.purse);remember(pop,i,7,F.ix,w);}
        else{addAnon(D,m.key,1);D.pool+=m.purse;}
        continue;
      }
      const i=m.i;
      R.place[i]=D.ix;R.moves[i]=Math.min(255,R.moves[i]+1);give(pop,i,m.purse);remember(pop,i,7,D.ix,w);
      pop.dec.migrations.push({id:idOf(pop,i),from:F.id,to:D.id});
      log(pop,w,'migration',F,`${nameOf(pop,i)} lascia ${F.id} per ${D.id}.`);
    }
  }
  function achieved(pop,i){
    const R=pop.R,g=R.goalL[i];
    if(g===1)return R.wed[i]===1&&R.kids[i]>0;
    if(g===2)return R.xp[i]>=150&&R.prof[i]!==NONE&&R.prof[i]!==ADV;
    if(g===3)return R.wealth[i]>=50000n;
    if(g===4)return R.xp[i]>=120&&R.prof[i]===ADV;
    if(g===5)return R.moves[i]>=2;
    return false;
  }
  function phaseRecords(pop,w,sig,ci){
    const R=pop.R;
    for(const P of pop.places){
      const c=ci[P.ix],list=c.list.filter(i=>R.alive[i]);
      if(!list.length)continue;
      const s=sig[P.ix],grown=list.filter(i=>kStage[keyOf(R,i)]>=1);
      // Cassa comune: senza anonimi nel luogo si ridistribuisce agli adulti (il totale del luogo non cambia).
      if(P.pool>0n&&grown.length&&anonTotal(P)===0){
        const each=P.pool/BigInt(grown.length);
        if(each>0n){P.pool-=each*BigInt(grown.length);for(const i of grown)give(pop,i,each);}
      }
      const avg=placeWealth(pop,P,list)/BigInt(anonTotal(P)+list.length);
      for(const i of list){
        const rp=Number((R.wealth[i]*100n)/(avg+1n)),st=kStage[keyOf(R,i)];
        let nrel=0;const m=pop.rel.get(i);if(m)for(const j of m.keys())if(R.alive[j])nrel++;
        R.wounds[i]=Math.max(0,R.wounds[i]-3);
        R.needs[i*4]=clamp(Math.floor(s.foodScarcity/8)-(rp>=200?20:0)+10,0,100);
        R.needs[i*4+1]=clamp(s.war*60+s.disaster*50+s.crisis*20+(R.wounds[i]>>1),0,100);
        R.needs[i*4+2]=clamp(100-(rp>>1),0,100);
        R.needs[i*4+3]=clamp(90-12*nrel-(R.wed[i]===1?40:0)-5*R.kids[i],0,100);
        if(st===1&&R.prof[i]!==NONE&&R.prof[i]!==ADV)R.xp[i]=Math.min(4e9,R.xp[i]+1);
        const nd=[R.needs[i*4],R.needs[i*4+1],R.wounds[i]>=30?80:0,st===1&&R.prof[i]===NONE?75:0,R.needs[i*4+2],R.needs[i*4+3]];
        let gs=0,gv=59;
        for(let k=0;k<nd.length;k++)if(nd[k]>gv){gv=nd[k];gs=k+1;}
        R.goalS[i]=st>=1?gs:0;
        if(st>=1&&R.goalL[i]&&achieved(pop,i)){
          const old=R.goalL[i];
          remember(pop,i,11,old,w);
          log(pop,w,'goal',P,`${nameOf(pop,i)} realizza il proprio sogno: ${GOAL_TEXT[GOALS_L[old]]}.`);
          R.goalL[i]=pickGoal(pop,i,w,old);
        }
        if(!R.notable[i]&&(R.xp[i]>=300||R.wealth[i]>=1000000n))R.notable[i]=1;
      }
      // Relazioni: incontri settimanali secondo la socievolezza; i single cercano spesso compagnia della stessa stirpe.
      if(grown.length<2)continue;
      const singles=new Map();
      for(const i of grown)if(R.wed[i]===0&&kStage[keyOf(R,i)]===1){let a=singles.get(R.lin[i]);if(!a)singles.set(R.lin[i],a=[]);a.push(i);}
      for(const i of grown){
        const h=hash(pop.seed,R.hid[i],C.SOCIAL,w,0);
        if(h%100>=T(R,i,2))continue;
        const sl=singles.get(R.lin[i]),mates=sl&&R.wed[i]===0?sl.filter(o=>R.prof[o]===R.prof[i]&&R.band[o]===R.band[i]):null,r3=(h>>>8)%3;
        const pool=mates&&mates.length>1&&r3===0?mates:R.wed[i]===0&&sl&&sl.length>1&&r3===1?sl:grown;
        const j=pool[(h>>>12)%pool.length];
        if(j===i)continue;
        const gain=3+(h>>>20)%5+(R.prof[i]===R.prof[j]?3:0)+(pool!==grown?4:0);
        addRel(pop,i,j,gain);addRel(pop,j,i,gain);
      }
    }
  }
  function stepWeek(pop,w,env){
    pop.dec=emptyDecisions(w);
    const sig=pop.places.map(P=>signalsOf(env,P.id));
    phaseShift(pop,w,census(pop));
    phaseBands(pop,w,census(pop));
    phaseDeath(pop,w,sig,census(pop));
    phaseExpeditions(pop,w,sig,census(pop));
    phaseCareers(pop,w,sig,census(pop));
    phaseMarriage(pop,w,sig,census(pop));
    phaseBirths(pop,w,sig,census(pop));
    phaseMigration(pop,w,sig,census(pop));
    phaseRecords(pop,w,sig,census(pop));
    pop.week=w+1;pop._ci=null;
  }
  function step(pop,week,env){
    if(!pop||!Number.isInteger(week)||week<pop.week)return 0;
    let done=0;
    for(let w=pop.week;w<=week;w++){stepWeek(pop,w,env);done++;}
    return done;
  }
  // Specifica per WorldSim.register: livello 3, passo settimanale; anche l'intervallo compresso si risolve settimana per settimana.
  function system(get,envOf){
    return {level:3,step:WEEK,maxChunks:520,resolve(s,from,to){
      const pop=get(s);
      if(!pop)return;
      const a=Math.floor(from/WEEK),b=Math.floor(to/WEEK);
      for(let w=Math.max(a,pop.week);w<b;w++)step(pop,w,typeof envOf==='function'?envOf(s,w):null);
    }};
  }

  // ——— Materializzazione: dalle coorti ai record (idempotente, definitiva) ———
  function materialize(pop,placeId){
    const ix=placeIx(pop,placeId);
    if(ix<0)return 0;
    const P=pop.places[ix],R=pop.R,w=pop.week;
    if(P.materialized)return 0;
    P.materialized=true;
    const fresh=[];
    for(const k of [...P.anon.keys()].sort((a,b)=>a-b)){
      const n=P.anon.get(k);
      for(let j=0;j<n;j++)fresh.push(mint(pop,P,k,w));
    }
    P.anon=new Map();
    pop._ci=null;
    if(!fresh.length)return 0;
    // Coppie fra i coniugati della stessa stirpe; chi resta senza coppia è vedovo.
    for(let l=0;l<NL;l++){
      const wed=fresh.filter(i=>R.lin[i]===l&&R.wed[i]).sort((a,b)=>R.hid[a]-R.hid[b]||a-b);
      for(let t=0;t+1<wed.length;t+=2){const a=wed[t],b=wed[t+1];R.spouse[a]=b;R.spouse[b]=a;addRel(pop,a,b,60);addRel(pop,b,a,60);}
      if(wed.length%2)R.wed[wed[wed.length-1]]=2;
      const couples=wed.filter(i=>R.wed[i]===1&&R.spouse[i]>i&&kStage[keyOf(R,i)]===1);
      for(const i of fresh)if(R.lin[i]===l&&kStage[keyOf(R,i)]===0&&couples.length){
        const a=couples[hash(pop.seed,R.hid[i],C.PARENT,0,0)%couples.length],b=R.spouse[a];
        R.pa[i]=a;R.pb[i]=b;R.kids[a]++;R.kids[b]++;
      }
    }
    // Conoscenze iniziali e notabili.
    const grown=fresh.filter(i=>kStage[keyOf(R,i)]>=1),single=new Map();
    for(const i of grown)if(R.wed[i]===0&&kStage[keyOf(R,i)]===1){let a=single.get(R.lin[i]);if(!a)single.set(R.lin[i],a=[]);a.push(i);}
    for(const i of grown){
      const h=hash(pop.seed,R.hid[i],C.SOCIAL,0,1),j=grown[h%grown.length];
      if(j!==i){const g=5+(h>>>16)%20;addRel(pop,i,j,g);addRel(pop,j,i,g);}
      // Chi vive già nel luogo ha qualche legame con altri single della propria stirpe (amicizie, corteggiamenti).
      const sl=R.wed[i]===0?single.get(R.lin[i]):null;
      if(sl&&sl.length>1)for(let t=0;t<2;t++){
        const h2=hash(pop.seed,R.hid[i],C.SOCIAL,1,t),o=sl[h2%sl.length];
        if(o!==i){const g=10+(h2>>>16)%30;addRel(pop,i,o,g);addRel(pop,o,i,g);}
      }
      if(hash(pop.seed,R.hid[i],C.MINT,1,0)%100<3)R.notable[i]=1;
    }
    if(grown.length&&!grown.some(i=>R.notable[i]))R.notable[grown.reduce((a,b)=>R.hid[b]>R.hid[a]?b:a)]=1;
    // La cassa del luogo si divide fra adulti e anziani secondo l'operosità (somma esatta).
    const weight=i=>BigInt(kStage[keyOf(R,i)]===2?150:100+T(R,i,1)+T(R,i,4));
    let total=0n;for(const i of grown)total+=weight(i);
    if(total>0n&&P.pool>0n){
      let given=0n;
      const shares=grown.map(i=>{const v=P.pool*weight(i)/total;given+=v;return v;});
      let rest=P.pool-given;/*RESTO*/
      grown.forEach((i,t)=>{let v=shares[t];if(rest>0n){v++;rest--;}give(pop,i,v);});
      P.pool=0n;
    }
    return fresh.length;
  }

  // ——— Interfaccia con l'economia ———
  function summary(pop,placeId){
    const out={alive:0,children:0,adults:0,elders:0,households:0,workers:{},unemployed:0,adventurers:0,wealth:'0'};
    const ix=placeIx(pop,placeId);
    if(ix<0)return out;
    const P=pop.places[ix],c=getCensus(pop)[ix];
    let wedN=0,single=0;
    const add=(k,n)=>{
      out.alive+=n;
      const st=kStage[k];
      if(st===0)out.children+=n;else if(st===1)out.adults+=n;else out.elders+=n;
      if(st>=1){if(kWed[k])wedN+=n;else single+=n;}
      if(st===1){const p=kProf[k];if(p===NONE)out.unemployed+=n;else if(p===ADV)out.adventurers+=n;else out.workers[PROFS[p]]=(out.workers[PROFS[p]]||0)+n;}
    };
    for(const [k,n] of P.anon)add(k,n);
    for(const [k,rs] of c.cells)add(k,rs.length);
    out.households=single+Math.ceil(wedN/2);
    const sorted={};
    for(const p of PROFS)if(out.workers[p])sorted[p]=out.workers[p];
    out.workers=sorted;
    out.wealth=String(placeWealth(pop,P,c.list));
    return out;
  }
  // Prelievo esatto proporzionale alla ricchezza (cassa e record), mai sotto zero.
  function levy(pop,P,list,want){
    const R=pop.R,holders=list.filter(i=>R.alive[i]&&R.wealth[i]>0n);
    let W=P.pool;for(const i of holders)W+=R.wealth[i];
    const amt=want<W?want:W;
    if(amt<=0n)return 0n;
    const shares=holders.map(i=>R.wealth[i]*amt/W),fromPool=P.pool*amt/W;
    let taken=fromPool;P.pool-=fromPool;
    holders.forEach((i,t)=>{R.wealth[i]-=shares[t];taken+=shares[t];});
    let rest=amt-taken;
    if(rest>0n){const t=P.pool<rest?P.pool:rest;P.pool-=t;rest-=t;}
    for(const i of holders){if(rest===0n)break;const t=R.wealth[i]<rest?R.wealth[i]:rest;R.wealth[i]-=t;rest-=t;}
    return amt-rest;
  }
  function transfer(pop,placeId,flows){
    const got={wages:0n,spend:0n,tax:0n},ix=placeIx(pop,placeId);
    if(ix<0||!object(flows))return got;
    const P=pop.places[ix],R=pop.R,c=getCensus(pop)[ix];
    if(object(flows.wages))for(let p=1;p<NP;p++){
      if(!own(flows.wages,PROFS[p]))continue;
      const amt=amount(flows.wages[PROFS[p]]);
      if(amt<=0n)continue;
      const recs=[];let anonN=0;
      for(const [k,n] of P.anon)if(kStage[k]===1&&kProf[k]===p)anonN+=n;
      for(const [k,rs] of c.cells)if(kStage[k]===1&&kProf[k]===p)for(const i of rs)recs.push(i);
      const n=anonN+recs.length;
      if(!n)continue;
      recs.sort((a,b)=>a-b);
      const base=amt/BigInt(n);
      let rem=amt-base*BigInt(n);
      for(const i of recs){let v=base;if(rem>0n){v++;rem--;}give(pop,i,v);}
      P.pool+=base*BigInt(anonN)+rem;
      got.wages+=amt;
    }
    got.spend=levy(pop,P,c.list,amount(flows.spend));
    got.tax=levy(pop,P,c.list,amount(flows.tax));
    pop.totals.wages+=got.wages;pop.totals.spend+=got.spend;pop.totals.tax+=got.tax;
    return got;
  }

  // ——— Viste ———
  function view(pop,i,full){
    const R=pop.R,k=keyOf(R,i),w=pop.week,st=kStage[k],sp=R.spouse[i];
    const v={id:idOf(pop,i),name:nameOf(pop,i),place:pop.places[R.place[i]].id,origin:pop.places[R.origin[i]].id,lineage:LINEAGES[R.lin[i]],
      stage:['bambino','adulto','anziano'][st]||'adulto',band:bandName(R.lin[i],R.band[i]),ageYears:ageYears(pop,i,R.alive[i]?w:R.died[i]),
      profession:PROFS[R.prof[i]],professionName:PROF_NAMES[R.prof[i]],married:['single','married','widowed'][R.wed[i]],
      spouse:R.wed[i]===1&&sp>=0?idOf(pop,sp):null,formerSpouse:R.wed[i]===2&&sp>=0?idOf(pop,sp):null,
      parents:[R.pa[i],R.pb[i]].filter(x=>x>=0).map(x=>idOf(pop,x)),kids:R.kids[i],
      traits:Object.fromEntries(TRAITS.map((t,k2)=>[t,T(R,i,k2)])),needs:Object.fromEntries(NEEDS.map((t,k2)=>[t,N(R,i,k2)])),
      goals:{short:GOALS_S[R.goalS[i]]||'rest',long:GOALS_L[R.goalL[i]]||null},wealth:String(R.wealth[i]),xp:R.xp[i],wounds:R.wounds[i],
      notable:!!R.notable[i],alive:!!R.alive[i],died:R.alive[i]?null:R.died[i],cause:R.alive[i]?null:CAUSES[R.cause[i]]};
    if(full){
      v.memories=(pop.mem.get(i)||[]).map(([mw,kind,a])=>({week:mw,kind,text:memoryText(pop,kind,a)}));
      v.relations=[...(pop.rel.get(i)||new Map())].map(([j,s])=>({id:idOf(pop,j),name:nameOf(pop,j),strength:s,alive:!!R.alive[j]}));
      v.children=[];
      for(let j=0;j<R.n;j++)if(R.pa[j]===i||R.pb[j]===i)v.children.push(idOf(pop,j));
    }
    return v;
  }
  function memoryText(pop,kind,a){
    const who=a>=0&&a<pop.R.n?nameOf(pop,a):'qualcuno',where=a>=0&&a<pop.places.length?pop.places[a].id:'?';
    switch(kind){
      case 1:return a>=0?'Nasce in famiglia, da '+who+'.':'Nasce.';
      case 2:return 'Diventa adulto.';
      case 3:return a>=0?'Sposa '+who+'.':'Si sposa.';
      case 4:return 'Nasce '+who+'.';
      case 5:return 'Perde '+who+'.';
      case 6:return 'Diventa '+(PROF_NAMES[a]||'altro')+'.';
      case 7:return 'Si trasferisce: '+where+'.';
      case 8:return ['Spedizione fatale.','Torna ferito da una spedizione.','Spedizione a mani vuote.','Spedizione riuscita.'][a]||'Spedizione.';
      case 10:return 'Eredita da '+who+'.';
      case 11:return 'Realizza il proprio sogno: '+(GOAL_TEXT[GOALS_L[a]]||'')+'.';
      case 12:return 'Lascia il lavoro per l’età.';
      default:return 'Ricordo.';
    }
  }
  function residents(pop,placeId){
    const ix=placeIx(pop,placeId);
    if(ix<0)return [];
    return getCensus(pop)[ix].list.map(i=>view(pop,i,false));
  }
  function person(pop,id){
    if(typeof id!=='string'||!pop.idMap.has(id))return null;
    return view(pop,pop.idMap.get(id),true);
  }
  function cells(pop,placeId){
    const ix=placeIx(pop,placeId),out={};
    if(ix<0)return out;
    const P=pop.places[ix],c=getCensus(pop)[ix],n=new Map();
    for(const [k,v] of P.anon)n.set(k,(n.get(k)||0)+v);
    for(const [k,rs] of c.cells)n.set(k,(n.get(k)||0)+rs.length);
    for(const k of [...n.keys()].sort((a,b)=>a-b))if(n.get(k))out[keyName(k)]=n.get(k);
    return out;
  }
  const events=pop=>pop.log.map(e=>({...e}));
  const decisions=pop=>JSON.parse(JSON.stringify(pop.dec));
  function influence(pop,id,patch){
    if(typeof id!=='string'||!pop.idMap.has(id)||!object(patch))return false;
    const R=pop.R,i=pop.idMap.get(id);
    if(!R.alive[i])return false;
    if(object(patch.traits))TRAITS.forEach((t,k)=>{const v=patch.traits[t];if(Number.isFinite(v))R.traits[i*5+k]=clamp(Math.round(v),0,100);});
    if(object(patch.needs))NEEDS.forEach((t,k)=>{const v=patch.needs[t];if(Number.isFinite(v))R.needs[i*4+k]=clamp(Math.round(v),0,100);});
    if(object(patch.goals)){
      const l=GOALS_L.indexOf(patch.goals.long),s=GOALS_S.indexOf(patch.goals.short);
      if(l>0&&kStage[keyOf(R,i)]>=1)R.goalL[i]=l;
      if(s>=0)R.goalS[i]=s;
    }
    return true;
  }
  function stats(pop){
    const ci=getCensus(pop),R=pop.R,places={};
    let anon=0,cellsN=0,alive=0;
    pop.places.forEach((P,ix)=>{
      const a=anonTotal(P);anon+=a;
      const keys=new Set([...P.anon.keys(),...ci[ix].cells.keys()]);cellsN+=keys.size;
      alive+=a+ci[ix].list.length;
      places[P.id]={anonymous:a,records:ci[ix].list.length,materialized:P.materialized,cells:keys.size};
    });
    let living=0;for(let i=0;i<R.n;i++)if(R.alive[i])living++;
    let relN=0;for(const m of pop.rel.values())relN+=m.size;
    let memN=0;for(const m of pop.mem.values())memN+=m.length;
    let bytes=0;for(const [k] of COLS)bytes+=R[k].byteLength;
    bytes+=relN*48+pop.rel.size*80+memN*56+pop.mem.size*48+R.n*64+cellsN*40+pop.log.length*160;
    const t=pop.totals;
    return {week:pop.week,places,
      totals:{alive,births:t.births,deaths:t.deaths,marriages:t.marriages,migrations:t.migrations,arrivals:t.arrivals,careers:t.careers,
        departures:t.departures,expeditionDeaths:t.expeditionDeaths,matured:t.matured,loot:String(t.loot),wages:String(t.wages),spend:String(t.spend),tax:String(t.tax)},
      records:{total:R.n,alive:living,dead:R.n-living,marriages:pop.rtotals.marriages,bondMarriages:pop.rtotals.bondMarriages,births:pop.rtotals.births},
      cohorts:{cells:cellsN,anonymous:anon},memoryBytes:bytes};
  }

  // ——— Salvataggio ———
  const SKIP=new Set(['hid']);
  function serialize(pop){
    const R=pop.R,rec={n:R.n};
    for(const [k,,m] of COLS){
      if(SKIP.has(k))continue;
      const a=R[k].subarray(0,R.n*m);
      rec[k]=k==='wealth'?Array.from(a,String):Array.from(a);
    }
    const sortObj=o=>Object.fromEntries(Object.keys(o).sort().map(k=>[k,o[k]]));
    return {schema:SCHEMA,seed:pop.seed,week:pop.week,
      places:pop.places.map(P=>{
        const anon=[];
        for(const k of [...P.anon.keys()].sort((a,b)=>a-b))anon.push(k,P.anon.get(k));
        return {id:P.id,kind:P.kind,continent:P.continent,links:P.linkIds.slice(),capacity:P.capacity,anon,pool:String(P.pool),
          carry:sortObj(P.carry),/*RIPORTO*/minted:P.minted,materialized:P.materialized};
      }),
      records:rec,
      mem:[...pop.mem.keys()].sort((a,b)=>a-b).map(i=>[i,pop.mem.get(i).map(x=>x.slice())]),
      rel:[...pop.rel.keys()].sort((a,b)=>a-b).map(i=>[i,[...pop.rel.get(i)]]),
      log:pop.log.map(e=>({...e})),
      totals:Object.fromEntries(Object.entries(pop.totals).map(([k,v])=>[k,typeof v==='bigint'?String(v):v])),
      rtotals:{...pop.rtotals}};
  }
  const CARRY=/^(age|death|depart|career|migrate|marry:[0-7]|birth:[0-7])$/;
  function need(ok,msg){if(!ok)throw new Error(msg);}
  function plain(o){need(object(o)&&!own(o,'__proto__')&&!own(o,'constructor')&&!own(o,'prototype'),'oggetto non valido');return o;}
  function build(raw,places,now){
    plain(raw);
    need(raw.schema===SCHEMA,'schema sconosciuto');
    need(intIn(raw.seed,0,4294967295),'seme non valido');
    need(intIn(raw.week,0,2e8),'settimana non valida');
    const pop=blank(raw.seed,raw.week);
    need(Array.isArray(raw.places)&&raw.places.length<=65535,'luoghi non validi');
    for(const d of raw.places){
      plain(d);
      need(safeId(d.id)&&!pop.index.has(d.id),'luogo non valido');
      need(KINDS.includes(d.kind)&&typeof d.continent==='string'&&Array.isArray(d.links)&&d.links.every(safeId),'descrizione del luogo non valida');
      const P=newPlace(pop,d,pop.places.length);
      need(intIn(d.capacity,1,1e9)&&canonical(d.pool)&&intIn(d.minted,0,4294967295)&&typeof d.materialized==='boolean','campi del luogo non validi');
      P.capacity=d.capacity;P.pool=BigInt(d.pool);P.minted=d.minted;P.materialized=d.materialized;P.linkIds=d.links.slice();
      need(Array.isArray(d.anon)&&d.anon.length%2===0,'coorti non valide');
      for(let t=0;t<d.anon.length;t+=2){
        const k=d.anon[t],n=d.anon[t+1];
        need(intIn(k,0,KEYS-1)&&kStage[k]>=0&&intIn(n,1,1e9)&&!P.anon.has(k),'cella non valida');
        P.anon.set(k,n);
      }
      need(!P.materialized||P.anon.size===0,'anonimi in un luogo materializzato');
      plain(d.carry);
      for(const [k,v] of Object.entries(d.carry)){need(CARRY.test(k)&&intIn(v,0,M-1),'riporto non valido');P.carry[k]=v;}
      pop.places.push(P);pop.index.set(P.id,P.ix);
    }
    const r=plain(raw.records),n=r.n;
    need(intIn(n,0,5e6),'numero di record non valido');
    const R=pop.R;
    if(n>R.cap)grow(R,n);
    const range={place:[0,pop.places.length-1],origin:[0,pop.places.length-1],serial:[0,4294967295],lin:[0,NL-1],band:[0,MAXB-1],prof:[0,NP-1],
      wed:[0,2],alive:[0,1],notable:[0,1],cause:[0,CAUSES.length-1],wounds:[0,100],goalS:[0,GOALS_S.length-1],goalL:[0,GOALS_L.length-1],
      moves:[0,255],born:[-2e9,raw.week],died:[-1,raw.week],spouse:[-1,n-1],pa:[-1,n-1],pb:[-1,n-1],xp:[0,4e9],kids:[0,65535],traits:[0,100],needs:[0,100]};
    for(const [k,,m] of COLS){
      if(SKIP.has(k))continue;
      const a=r[k];
      need(Array.isArray(a)&&a.length===n*m,'colonna non valida: '+k);
      if(k==='wealth'){for(let i=0;i<n;i++){need(canonical(a[i])&&BigInt(a[i])<=MAXW,'ricchezza non valida');R.wealth[i]=BigInt(a[i]);}continue;}
      const [lo,hi]=range[k];
      for(let i=0;i<a.length;i++){need(intIn(a[i],lo,hi),'valore non valido: '+k);R[k][i]=a[i];}
    }
    R.n=n;
    for(let i=0;i<n;i++){
      const k=keyOf(R,i),P=pop.places[R.origin[i]];
      need(kStage[k]>=0,'cella del record non valida');
      need(R.alive[i]?R.died[i]===-1:R.died[i]>=0,'stato vitale incoerente');
      need(R.spouse[i]!==i&&R.pa[i]!==i&&R.pb[i]!==i,'riferimento a sé stesso');
      need(R.serial[i]<P.minted,'identità fuori serie');
      const id=P.id+':'+R.serial[i];
      need(!pop.idMap.has(id),'identità duplicata');
      pop.idMap.set(id,i);
      R.hid[i]=hash(pop.seed,P.h,C.MINT,R.serial[i],0);
    }
    need(Array.isArray(raw.mem),'memoria non valida');
    for(const e of raw.mem){
      need(Array.isArray(e)&&e.length===2&&intIn(e[0],0,n-1)&&!pop.mem.has(e[0])&&Array.isArray(e[1])&&e[1].length<=LIMITS.memories,'memoria non valida');
      need(e[1].every(x=>Array.isArray(x)&&x.length===3&&intIn(x[0],-2e9,raw.week)&&intIn(x[1],1,15)&&intIn(x[2],-1,Math.max(n,pop.places.length))),'ricordo non valido');
      pop.mem.set(e[0],e[1].map(x=>x.slice()));
    }
    need(Array.isArray(raw.rel),'relazioni non valide');
    for(const e of raw.rel){
      need(Array.isArray(e)&&e.length===2&&intIn(e[0],0,n-1)&&!pop.rel.has(e[0])&&Array.isArray(e[1])&&e[1].length<=LIMITS.relations,'relazioni non valide');
      const m=new Map();
      for(const x of e[1]){need(Array.isArray(x)&&x.length===2&&intIn(x[0],0,n-1)&&x[0]!==e[0]&&!m.has(x[0])&&intIn(x[1],1,1000),'relazione non valida');m.set(x[0],x[1]);}
      pop.rel.set(e[0],m);
    }
    need(Array.isArray(raw.log)&&raw.log.length<=LIMITS.events,'registro non valido');
    for(const e of raw.log){plain(e);need(intIn(e.week,0,2e8)&&typeof e.kind==='string'&&e.kind.length<=16&&typeof e.place==='string'&&typeof e.text==='string'&&e.text.length<=300,'voce non valida');}
    pop.log=raw.log.map(e=>({week:e.week,kind:e.kind,place:e.place,text:e.text}));
    plain(raw.totals);plain(raw.rtotals);
    for(const k of Object.keys(pop.totals)){
      const v=raw.totals[k];
      if(typeof pop.totals[k]==='bigint'){need(canonical(v),'totale non valido');pop.totals[k]=BigInt(v);}
      else{need(intIn(v,0,Number.MAX_SAFE_INTEGER),'totale non valido');pop.totals[k]=v;}
    }
    for(const k of Object.keys(pop.rtotals)){need(intIn(raw.rtotals[k],0,Number.MAX_SAFE_INTEGER),'totale non valido');pop.rtotals[k]=raw.rtotals[k];}
    // Luoghi nuovi nel mondo: si aggiungono dal seme; quelli esistenti aggiornano tipo e collegamenti.
    const descs=validDescs(places),added=[];
    for(const d of descs){
      if(pop.index.has(d.id)){const P=pop.places[pop.index.get(d.id)];if(KINDS.includes(d.kind))P.kind=d.kind;continue;}
      const P=newPlace(pop,d,pop.places.length);pop.places.push(P);pop.index.set(P.id,P.ix);added.push([P,d]);
    }
    linkUp(pop,descs);
    for(const [P,d] of added)populate(pop,P,d);
    return pop;
  }
  function restore(raw,places,now){
    try{return build(raw,places,now);}
    catch(e){
      let seed=0,pop;
      try{seed=object(raw)&&intIn(raw.seed,0,4294967295)?raw.seed:0;}catch(e2){seed=0;}
      try{pop=create(seed,places,now);}catch(e3){pop=create(seed,[],now);}
      pop.note='Popolazione ricreata dal seme: '+String(e&&e.message||e).slice(0,120);
      return pop;
    }
  }

  window.WorldPopulation={WEEK,create,restore,serialize,step,system,summary,transfer,materialize,residents,person,events,stats,cells,
    decisions,influence,biology,limits:LIMITS,professions:PROFS.slice(),lineages:LINEAGES.slice()};
})();
