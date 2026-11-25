(() => {
  'use strict';
  /* Residenti autonomi del mondo (PERF-005, IN OMBRA: non è nella build né collegato al motore).
     Due strati della stessa popolazione:
     - STRATO AGGREGATO, sempre presente e sempre calcolato allo stesso modo, per ogni luogo: per stirpe un istogramma d'età `h` e
       otto classi `c` (adulto/anziano × celibe, sposato con un adulto, sposato con un anziano, vedovo); per luogo i mestieri
       degli adulti `jobs` e la ricchezza totale `wealth` (BigInt). Tutte le regole (quanti nascono, muoiono, si sposano,
       migrano, cambiano mestiere…) leggono e scrivono SOLO questo strato.
     - RECORD individuali, dove il giocatore è passato: un raffinamento. A ogni evento aggregato scelgono CHI agisce fra tutti
       quelli della stessa classe (stirpe, stadio, stato civile): mestiere, ricchezza, personalità, legami ed età restano
       individuali. I mestieri si riallineano una volta a settimana ai posti del luogo (chi subentra lo decide l'utilità).
     Equivalenza per costruzione: lo strato aggregato non legge mai i record, quindi materializzare un luogo prima, dopo o mai
     produce gli stessi margini e la stessa ricchezza. `audit` verifica che i record proiettino esattamente i margini.
     Anno di calendario = 48 giorni. Passo canonico settimanale identico a ogni livello e divisibile in parti.
     Niente Math.random né Date nella logica. */
  const SCHEMA=2,WEEK=10080,YW=48/7,M=1000000,NP=18,NONE=0,ADV=17,MAXW=(1n<<63n)-1n,BASE=4294967296,NOID=-1;
  const LIMITS=Object.freeze({events:300,memories:8,relations:6,commonMemories:2,commonRelations:3,tombs:2000,bond:60});
  const PROFS=['none','farmer','herbalist','miner','carpenter','shepherd','mystic','wellkeeper','baker','alchemist',
    'smith','merchant','innkeeper','guard','scholar','healer','laborer','adventurer'];
  const PROF_NAMES=['senza lavoro','contadino','erbaiolo','minatore','falegname','pastore','cercatore di essenza','pozzaiolo',
    'fornaio','alchimista','fabbro','mercante','locandiere','guardia','studioso','guaritore','manovale','avventuriero'];
  const KINDS=['village','town','city','capital','dungeon','wild','interior'],SETTLE=new Set(['village','town','city','capital']);
  const HABITABLE=new Set(['village','town','city','capital','wild']);
  const TRAITS=['bravery','ambition','sociability','wanderlust','diligence'],NEEDS=['food','safety','wealth','belonging'];
  const GOALS_L=['','family','mastery','fortune','glory','journey'],GOALS_S=['rest','eat','safety','heal','work','earn','company'];
  const GOAL_TEXT={family:'fondare una famiglia',mastery:'diventare maestro nel mestiere',fortune:'fare fortuna',glory:'la gloria delle spedizioni',journey:'vedere il mondo'};
  const CAUSES=['','vecchiaia','malattia','spedizione','calamità','guerra','fame'];
  const STAGES=['bambino','adulto','anziano'];

  /* ——— BIOLOGIA (tabella unica, configurabile con configureBiology; PROVVISORIA, da approvare dall'utente) ———
     Anni di calendario (48 giorni): età adulta, età anziana, durata tipica; figli per coppia in tutta la vita (senza
     affollamento), quota di piccoli che arriva all'età adulta, modo di venire al mondo.
     Modi: nascita e schiusa vogliono una coppia; scissione e germinazione un solo genitore; risveglio, manifestazione,
     forgiatura e rinascita nessuno (per queste i «figli per coppia» sono le venute al mondo per ogni due adulti). */
  const TABLE={
    slime:[1,12,16,5,.8,'scissione'],goblin:[8,32,42,6,.7,'nascita'],wolf:[2,13,17,6.5,.65,'nascita'],elf:[45,280,360,4,.97,'nascita'],
    spirit:[3,150,200,3.8,.95,'manifestazione'],vampire:[30,320,420,4,.96,'nascita'],demon:[12,120,160,4.6,.9,'nascita'],
    drake:[20,160,220,5,.85,'schiusa'],secret:[1,60,80,3.8,.95,'manifestazione'],kobold:[7,30,40,6,.72,'schiusa'],
    orc:[14,45,58,5.6,.78,'nascita'],gnome:[22,110,145,4.4,.93,'nascita'],satyr:[13,60,80,4.8,.88,'nascita'],hare:[1,6,9,9,.5,'nascita'],
    fungus:[.5,18,24,5,.75,'germinazione'],fox:[1.5,9,12,7,.62,'nascita'],terrapin:[9,110,150,5,.82,'schiusa'],dryad:[25,300,420,4,.95,'germinazione'],
    triton:[14,70,92,5,.84,'schiusa'],raven:[2,22,30,5.6,.74,'schiusa'],salamander:[2,24,32,6,.7,'schiusa'],scarabkin:[1.2,8,11,8,.55,'schiusa'],
    spider:[1,7,10,9,.48,'schiusa'],mimic:[2,90,130,3.9,.92,'risveglio'],troll:[16,95,130,4.6,.9,'nascita'],harpy:[6,38,50,5.4,.8,'schiusa'],
    golem:[.5,140,200,3.6,.98,'forgiatura'],frostkin:[11,55,72,5,.86,'nascita'],sylph:[2,80,110,3.9,.93,'manifestazione'],
    naga:[12,85,115,5,.86,'schiusa'],mantis:[.8,5,7,9.5,.46,'schiusa'],minotaur:[12,50,66,5,.86,'nascita'],djinn:[5,220,300,3.7,.97,'manifestazione'],
    chimera:[5,40,54,5.2,.82,'nascita'],phoenix:[2,100,140,3.7,.96,'rinascita'],leviathan:[30,260,360,4.6,.9,'nascita'],
    human:[18,60,76,4.8,.9,'nascita'],dwarf:[28,180,235,4.4,.94,'nascita'],skeleton:[.5,110,150,3.7,.96,'risveglio'],bear:[4,22,29,5.8,.75,'nascita'],
    fairy:[8,90,120,4.6,.9,'nascita'],elemental:[1,85,120,3.8,.94,'manifestazione'],wyvern:[12,60,80,5,.84,'schiusa'],griffin:[7,48,64,5,.84,'schiusa']
  };
  const NAMES={slime:'slime',goblin:'goblin',wolf:'lupo',elf:'elfo',spirit:'spirito',vampire:'vampiro',demon:'demone',drake:'draconide',secret:'eclisse',
    kobold:'coboldo',orc:'orco',gnome:'gnomo',satyr:'fauno',hare:'leporide',fungus:'micoide',fox:'volpe',terrapin:'testuggine',dryad:'driade',triton:'tritone',
    raven:'corvide',salamander:'salamandra',scarabkin:'scarabide',spider:'aracnide',mimic:'mimico',troll:'troll',harpy:'arpia',golem:'golem',frostkin:'yeti',
    sylph:'silfide',naga:'naga',mantis:'mantide',minotaur:'minotauro',djinn:'genio',chimera:'chimera',phoenix:'fenice',leviathan:'leviatano',human:'umano',
    dwarf:'nano',skeleton:'scheletro',bear:'orso',fairy:'fata',elemental:'elementale',wyvern:'viverna',griffin:'grifone'};
  const TILT={human:[0,5,0,0,0],dwarf:[5,0,0,-5,12],skeleton:[0,0,-10,0,8],bear:[10,0,0,-5,0],fairy:[0,0,12,8,0],elemental:[0,8,0,0,0],wyvern:[10,0,0,12,0],griffin:[6,0,0,12,0]};
  const ORIGINS={nascita:2,schiusa:2,scissione:1,germinazione:1,risveglio:0,manifestazione:0,forgiatura:0,rinascita:0};
  const DEFAULT_ROW=[16,55,70,4.8,.88,'nascita'];
  // Stirpi base del miscuglio predefinito (quelle dei cinque continenti); i luoghi possono dichiararne altre con `lineages`.
  const COMMON=['human','dwarf','skeleton','bear','fairy','elemental','wyvern','griffin'];

  const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const clamp=(x,a,b)=>x<a?a:x>b?b:x;
  const intIn=(x,a,b)=>Number.isInteger(x)&&x>=a&&x<=b;
  const canonical=v=>typeof v==='string'&&v.length<=100000&&/^(0|[1-9][0-9]*)$/.test(v);
  const safeId=id=>typeof id==='string'&&/^[a-z][a-z0-9._-]{0,63}$/i.test(id)&&!['__proto__','constructor','prototype'].includes(id);
  const linId=id=>typeof id==='string'&&/^[a-z][a-z0-9_-]{0,31}$/i.test(id)&&!['__proto__','constructor','prototype'].includes(id);
  function mix(h){h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return h>>>0;}
  function hash(a,b,c,d,e){let h=mix((a|0)^0x9e3779b9);h=mix(h^(b|0));h=mix(h^(c|0));h=mix(h^(d|0));return mix(h^(e|0));}
  const u01=h=>h/4294967296;
  function fnv(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;}
  function amount(v){ // importo valido ≥ 0 (BigInt, intero sicuro o stringa decimale), altrimenti 0
    if(typeof v==='bigint')return v>0n?v:0n;
    if(Number.isSafeInteger(v))return v>0?BigInt(v):0n;
    return canonical(v)?BigInt(v):0n;
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

  /* Geometria delle fasce d'età (settimane). Infanzia: secchi di Lk settimane su una griglia assoluta (w % Lk), uguali ovunque:
     la fascia di un bambino è funzione esatta della sua nascita e nessuno diventa adulto prima del tempo. Adulti e anziani:
     secchi più larghi, sfalsati per stirpe; l'ultimo secchio degli anziani non ha uscita (solo la morte). */
  function geometry(b,id){
    const cw=Math.max(1,Math.ceil(b.adult*YW-1e-9)),Lk=Math.max(1,Math.ceil((cw-1)/21)),nK=Math.ceil((cw-1)/Lk)+1;
    const aW=Math.max(2,(b.elder-b.adult)*YW),La=Math.max(1,Math.ceil(aW/19)),nA=Math.ceil(aW/La)+1;
    const eW=Math.max(1,(b.life-b.elder)*YW),Le=Math.max(1,Math.ceil(eW/4)),nE=7;
    const h=fnv(id),g={Lk,nK,La,nA,Le,nE,oA:h%La,oE:(h>>>8)%Le,n:nK+nA+nE,a0:nK*Lk,e0:nK*Lk+nA*La,adultW:aW,
      kidRisk:Math.round(-Math.log(b.childSurvival)/(nK*Lk)*M),adultRisk:Math.round(.1/aW*M),marry:4.5/aW*M,mourn:Math.max(4,b.life*YW*.025)};
    g.elderRisk=[.05,.1,.25,.55,1.1,1.8,3].map(x=>Math.min(900000,Math.round(x/Le*M)));
    g.fertile=[];for(let j=0;j<nA;j++){const x=(j+.5)/nA;g.fertile.push(x<.6?1:x<.8?.5:.05);}
    g.parents=ORIGINS[b.origin];
    // Nascite a settimana: per coppia adulta (con peso d'età) oppure per adulto (stirpi senza coppia).
    g.birth=g.parents===2?b.fertility/(aW*BIRTH_SPAN)*M:b.fertility/2/aW*M;
    g.sig=[Lk,nK,La,nA,Le,nE].join();
    return g;
  }
  const BIRTH_SPAN=.46;
  const biology=Object.create(null),LIN=[],LINIX=new Map();
  function setRow(id,row){
    const [adult,elder,life,fertility,childSurvival,origin]=row,h=fnv(id);
    biology[id]=Object.freeze({adult,elder,life,fertility,childSurvival,origin,parents:ORIGINS[origin],provisional:true});
    const g=geometry(biology[id],id),tilt=TILT[id]||[0,1,2,3,4].map(t=>(mix(h+t)%21)-10);
    if(LINIX.has(id)){const L=LIN[LINIX.get(id)];L.g=g;L.b=biology[id];return;}
    LINIX.set(id,LIN.length);LIN.push({id,h,g,b:biology[id],tilt,name:NAMES[id]||id});
  }
  for(const id of Object.keys(TABLE))setRow(id,TABLE[id]);
  // Stirpe sconosciuta: biologia predefinita, registrata al primo uso (al massimo 255 stirpi in tutto).
  function linOf(id){
    if(!LINIX.has(id)){if(LIN.length>=255)return LINIX.get('human');setRow(id,DEFAULT_ROW);delete biology[id];}
    return LINIX.get(id);
  }
  // Nuova tabella (tutta o in parte): da chiamare prima di create/restore. Restituisce quante righe sono state accettate.
  function configureBiology(table){
    let n=0;
    if(object(table))for(const [id,r] of Object.entries(table)){
      if(!linId(id)||!object(r))continue;
      const base=biology[id]||{};
      const row=['adult','elder','life','fertility','childSurvival','origin'].map(k=>own(r,k)?r[k]:k==='origin'?base.origin||'nascita':base[k]);
      const [a,e,l,f,c,o]=row;
      if(![a,e,l,f,c].every(Number.isFinite)||!(a>0&&e>a&&l>e&&l<=10000&&f>0&&f<=100&&c>0&&c<=1)||!own(ORIGINS,o)||!LINIX.has(id)&&LIN.length>=255)continue;
      setRow(id,row);n++;
    }
    return n;
  }
  const byLin=(a,b)=>LIN[a].id<LIN[b].id?-1:1;

  // Codici dei meccanismi per i generatori con seme.
  const C={AGE:1,DEATH:2,DEPART:3,OUTCOME:4,CAREER:5,MARRY:6,BIRTH:7,MIGRATE:8,DEST:9,SPLIT:10,SOCIAL:11,MINT:12,PICK:13,
    PHASE:14,TRAIT:15,GOAL:16,PLACE:17,NAME:18,PARENT:19,FOUND:20,FAMILY:21,MOURN:22,JOB:23};
  const SHARES={village:[0,300,80,40,60,110,10,40,60,10,30,30,20,40,10,20,90],town:[0,150,60,50,80,50,20,40,80,30,60,90,50,60,30,40,110],
    city:[0,60,50,30,90,20,30,40,90,50,80,140,70,90,60,50,50]};
  const sharesOf=kind=>SHARES[kind==='capital'?'city':SHARES[kind]?kind:'village'];
  const PER_CAPITA={village:800,town:1500,city:2500,capital:4000,dungeon:300,wild:300,interior:300};
  const ROOM={village:120,town:200,city:300,capital:400,wild:60,dungeon:0,interior:0}; // capienza dei luoghi nati disabitati
  // Classi: 0–3 adulti (celibe, sposato con un adulto, sposato con un anziano, vedovo), 4–7 anziani (idem).
  const A0=0,AA=1,AE=2,AW=3,E0=4,EA=5,EE=6,EW=7;

  // ——— Record individuali in colonne ———
  const COLS=[['place',Uint16Array,1],['origin',Uint16Array,1],['serial',Uint32Array,1],['hid',Uint32Array,1],['lin',Uint8Array,1],['stage',Uint8Array,1],
    ['cls',Uint8Array,1],['prof',Uint8Array,1],['flags',Uint8Array,1],['wounds',Uint8Array,1],['goalL',Uint8Array,1],['moves',Uint8Array,1],['proj',Uint8Array,1],
    ['kids',Uint8Array,1],['alive',Uint8Array,1],['born',Int32Array,1],['since',Int32Array,1],['xp',Uint32Array,1],['spouse',Float64Array,1],['pa',Float64Array,1],
    ['pb',Float64Array,1],['traits',Uint8Array,5],['needs',Uint8Array,4],['wealth',BigInt64Array,1],['gpos',Uint32Array,1],
    ['relN',Uint8Array,1],['relU',Float64Array,6],['relS',Int8Array,6],['memN',Uint8Array,1],['memK',Uint8Array,8],['memW',Int32Array,8],['memA',Float64Array,8]];
  const NOTABLE=1,KNOWN=2,SWAYED=4; // bandierine: notabile, conosciuto dal giocatore, influenzato
  function makeRecords(cap=64){const R={n:0,cap};for(const [k,T,m] of COLS)R[k]=new T(cap*m);return R;}
  function grow(R){const cap=R.cap*2;for(const [k,T,m] of COLS){const a=new T(cap*m);a.set(R[k]);R[k]=a;}R.cap=cap;}
  const T=(R,i,t)=>R.traits[i*5+t],N=(R,i,t)=>R.needs[i*4+t];
  const uidOf=(R,i)=>R.origin[i]*BASE+R.serial[i];
  const rowOf=(pop,uid)=>{if(uid<0)return -1;const i=pop.idMap.get(uid);return i===undefined?-1:i;};
  const idOfUid=(pop,uid)=>{const o=Math.floor(uid/BASE);return (pop.places[o]?pop.places[o].id:'?')+':'+(uid-o*BASE);};
  const idOf=(pop,i)=>idOfUid(pop,uidOf(pop.R,i));
  function uidFrom(pop,id){
    if(typeof id!=='string')return NOID;
    const m=/^(.*):(\d{1,10})$/.exec(id);
    return m&&pop.index.has(m[1])&&Number(m[2])<BASE?pop.index.get(m[1])*BASE+Number(m[2]):NOID;
  }
  const hidOf=(pop,uid)=>{const o=Math.floor(uid/BASE);return hash(pop.seed,pop.places[o].h,C.MINT,uid-o*BASE,0);};
  const SYL=[['Ar','Bel','Cor','Dal','El','Fen','Gar','Il','Lor','Mar','Ner','Or','Per','Ral','Sel','Tor','Ul','Val','Zer','Ast','Bri','Cal','Dor','Eri'],
    ['a','e','i','o','ia','eo','ai','u'],['n','l','r','s','th','nd','ra','na','lo','ric','mir','vel','dor','sa','te','no']];
  const nameFrom=hid=>{const h=mix(hid^C.NAME);return SYL[0][h%24]+SYL[1][(h>>>5)%8]+SYL[2][(h>>>9)%16];};
  const nameOf=(pop,i)=>nameFrom(pop.R.hid[i]);
  // Il nome di chi è morto o lontano si ricava dalla sua identità: non serve conservarne il record.
  const nameOfUid=(pop,uid)=>uid>=0&&pop.places[Math.floor(uid/BASE)]?nameFrom(hidOf(pop,uid)):'qualcuno';
  // Ordine canonico delle persone: mai l'ordine di creazione o di visita.
  const before=(R,i,j)=>R.hid[i]!==R.hid[j]?R.hid[i]<R.hid[j]:uidOf(R,i)<uidOf(R,j);

  // Elenco del luogo (ordinato in modo canonico) e gruppi per classe (stirpe × stadio × stato civile).
  const gkey=(l,stage,cls)=>l*16+(stage===0?0:stage===1?1+cls:5+cls);
  const EMPTY=[];
  const group=(P,l,stage,cls)=>P.grp.get(gkey(l,stage,cls))||EMPTY;
  function seat(P,R,i){let a=0,b=P.list.length;while(a<b){const m=(a+b)>>1;if(before(R,P.list[m],i))a=m+1;else b=m;}return a;}
  function joinGroup(P,R,i){const k=gkey(R.lin[i],R.stage[i],R.cls[i]);let a=P.grp.get(k);if(!a)P.grp.set(k,a=[]);R.gpos[i]=a.length;a.push(i);}
  function leaveGroup(P,R,i){const k=gkey(R.lin[i],R.stage[i],R.cls[i]),a=P.grp.get(k),last=a.pop();if(last!==i){const p=R.gpos[i];a[p]=last;R.gpos[last]=p;}if(!a.length)P.grp.delete(k);}
  function enter(P,R,i){P.list.splice(seat(P,R,i),0,i);joinGroup(P,R,i);P.recW+=R.wealth[i];}
  function leave(P,R,i){P.list.splice(seat(P,R,i),1);leaveGroup(P,R,i);P.recW-=R.wealth[i];}
  function setClass(pop,i,stage,cls){const R=pop.R,P=pop.places[R.place[i]];leaveGroup(P,R,i);R.stage[i]=stage;R.cls[i]=cls;joinGroup(P,R,i);}
  // Ricchezza individuale: la cassa del luogo è derivata (wealth − somma dei record), quindi nessuna Scintilla si crea o si perde.
  function setWealth(pop,i,v){const R=pop.R;if(v>MAXW)v=MAXW;if(v<0n)v=0n;pop.places[R.place[i]].recW+=v-R.wealth[i];R.wealth[i]=v;}
  const give=(pop,i,v)=>{if(v>0n)setWealth(pop,i,pop.R.wealth[i]+v);};
  function remember(pop,i,kind,a,w){
    const R=pop.R,cap=R.flags[i]&(KNOWN|SWAYED)?LIMITS.memories:R.flags[i]?4:LIMITS.commonMemories,o=i*8;
    if(R.memN[i]>=cap){const drop=R.memN[i]-cap+1;for(let k=0;k+drop<R.memN[i];k++){R.memK[o+k]=R.memK[o+k+drop];R.memW[o+k]=R.memW[o+k+drop];R.memA[o+k]=R.memA[o+k+drop];}R.memN[i]-=drop;}
    const k=o+R.memN[i]++;R.memK[k]=kind;R.memW[k]=w;R.memA[k]=a;
  }
  function relAt(R,i,u){const o=i*6;for(let k=0;k<R.relN[i];k++)if(R.relU[o+k]===u)return k;return -1;}
  const bond=(pop,i,j)=>{const R=pop.R,k=relAt(R,i,uidOf(R,j));return k<0?0:R.relS[i*6+k];};
  function dropRel(R,i,k){const o=i*6;for(let q=k;q+1<R.relN[i];q++){R.relU[o+q]=R.relU[o+q+1];R.relS[o+q]=R.relS[o+q+1];}R.relN[i]--;}
  function addRel(pop,i,j,g){ // legame con segno: amicizia/corteggiamento > 0, rivalità < 0
    const R=pop.R,u=uidOf(R,j),o=i*6,cap=R.flags[i]&(KNOWN|SWAYED)?LIMITS.relations:R.flags[i]?4:LIMITS.commonRelations;
    let k=relAt(R,i,u);
    if(k>=0){const s=clamp(R.relS[o+k]+g,-LIMITS.bond,LIMITS.bond);if(s)R.relS[o+k]=s;else dropRel(R,i,k);return;}
    if(R.relN[i]>=cap){
      let weak=-1,ws=Infinity;
      for(let q=0;q<R.relN[i];q++){const v=Math.abs(R.relS[o+q])+(R.relU[o+q]===R.spouse[i]?100:0);if(v<ws){ws=v;weak=q;}}
      if(ws>=Math.abs(g)+6)return; // i legami forti restano, le conoscenze deboli lasciano spazio
      dropRel(R,i,weak);
    }
    k=R.relN[i]++;R.relU[o+k]=u;R.relS[o+k]=clamp(g,-LIMITS.bond,LIMITS.bond);
  }
  function tie(pop,i,j,g){addRel(pop,i,j,g);addRel(pop,j,i,g);}
  // Consanguinei: fratelli (anche per un solo genitore) e genitore-figlio.
  function kin(R,i,j){
    const ui=uidOf(R,i),uj=uidOf(R,j),a=R.pa[i],b=R.pb[i];
    if(a===uj||b===uj||R.pa[j]===ui||R.pb[j]===ui)return true;
    return /*PARENTI*/a>=0&&(a===R.pa[j]||a===R.pb[j])||b>=0&&(b===R.pa[j]||b===R.pb[j]);
  }
  function log(pop,w,kind,P,text){
    pop.log.push({week:w,kind,place:P.id,text});
    if(pop.log.length>LIMITS.events)pop.log.splice(0,pop.log.length-LIMITS.events);
  }
  function money(v){
    if(v<=0n)return '0 Scintille';
    const parts=[];
    for(const [f,n] of [[1000000n,'Astrali'],[10000n,'Solari'],[100n,'Lunari'],[1n,'Scintille']]){const q=v/f;if(q>0n){parts.push(q+' '+n);v-=q*f;}}
    return parts.slice(0,2).join(' e ');
  }

  // ——— Strato aggregato: accesso ———
  const kidsOf=(G,g)=>{let n=0;for(let j=0;j<g.nK;j++)n+=G.h[j];return n;};
  const adultsOf=G=>G.c[A0]+G.c[AA]+G.c[AE]+G.c[AW];
  const eldersOf=G=>G.c[E0]+G.c[EA]+G.c[EE]+G.c[EW];
  function linIn(P,l,niche){ // gruppo della stirpe nel luogo (creato se manca)
    let G=P.lin.get(l);
    if(!G){const g=LIN[l].g;G={h:new Int32Array(g.n),c:new Int32Array(8),n:0,niche:niche||Math.max(8,Math.ceil(P.capacity*.15))};P.lin.set(l,G);P.order.push(l);P.order.sort(byLin);}
    return G;
  }
  function dropLin(P,l){const G=P.lin.get(l);if(G&&G.n===0){P.lin.delete(l);P.order.splice(P.order.indexOf(l),1);}}
  const crowdOf=(P,G)=>P.capacity<=0?9:.5*P.alive/P.capacity+.5*G.n/G.niche;
  function recount(P){P.alive=0;for(const [l,G] of P.lin){G.n=kidsOf(G,LIN[l].g)+adultsOf(G)+eldersOf(G);P.alive+=G.n;}}

  // Generatori con seme: uno per le decisioni aggregate, uno separato per la scelta fra anonimi e record.
  const ar=(pop,P,code)=>hash(pop.seed,P.h,code,pop.w,P.aq++);
  const rr=(pop,P,code)=>hash(pop.seed,P.h,code+100,pop.w,P.rq++);
  function drawIx(h,weights,n=weights.length){
    let W=0;for(let t=0;t<n;t++)W+=weights[t];
    if(W<=0)return -1;
    let r=Math.floor(u01(h)*W);
    for(let t=0;t<n;t++){if(r<weights[t])return t;r-=weights[t];}
    return n-1;
  }
  function drawSpan(h,arr,from,to){ // indice estratto in proporzione ai conteggi arr[from..to)
    let W=0;for(let t=from;t<to;t++)W+=arr[t];
    if(W<=0)return -1;
    let r=Math.floor(u01(h)*W);
    for(let t=from;t<to;t++){if(r<arr[t])return t;r-=arr[t];}
    return to-1;
  }
  // Quanto intero di un meccanismo, con riporto salvato e fase iniziale con seme (i luoghi non scattano tutti insieme).
  function quantum(pop,P,key,code,X,cap){
    const c0=own(P.carry,key)?P.carry[key]:hash(pop.seed,P.h,C.PHASE,code,fnv(key))%M,tot=Math.round(X)+c0,K=Math.floor(tot/M);
    P.carry[key]=tot-K*M;
    return K>cap?cap:K;
  }
  // Chi agisce: utilità individuale decrescente, spareggio con hash; `kind` conta le scelte forzate (candidati ≤ posti).
  function tally(pop,kind,forced,k){const x=pop.choices[kind]||(pop.choices[kind]={forced:0,free:0});if(forced)x.forced+=k;else x.free+=k;}
  function choose(pop,cand,k,util,code,kind){
    if(k<=0||!cand.length)return [];
    const R=pop.R,w=pop.w;
    if(kind)tally(pop,kind,cand.length<=k,Math.min(k,cand.length));
    if(k===1){
      let best=-1,bu=-Infinity,bh=0;
      for(const i of cand){
        const u=util(i);
        if(u<bu)continue;
        const h=hash(pop.seed,R.hid[i],code,w,0);
        if(best<0||u>bu||h>bh||h===bh&&before(R,i,best)){best=i;bu=u;bh=h;}
      }
      return best<0?[]:[best];
    }
    const items=cand.map(i=>[i,util(i),hash(pop.seed,R.hid[i],code,w,0)]);
    items.sort((x,y)=>y[1]-x[1]||y[2]-x[2]||(before(R,x[0],y[0])?-1:1));
    return items.slice(0,k).map(x=>x[0]);
  }
  // In un luogo non materializzato con residenti noti: l'evento tocca a un record o a un anonimo?
  function isRecord(pop,P,recN,total,code){
    if(!recN)return false;
    if(P.materialized||recN>=total)return true;
    return Math.floor(u01(rr(pop,P,code))*total)<recN;
  }

  // ——— Creazione ———
  function trait(h,t,l){const a=mix(h+t*0x9e3779b1);return clamp(Math.round(((a&255)+((a>>>8)&255))*100/510)+LIN[l].tilt[t],0,100);}
  function bucketOf(l,born,cur){const Lk=LIN[l].g.Lk;return Math.floor(cur/Lk)-Math.floor(born/Lk);}
  function bornFor(l,slot,h,cur){ // data di nascita coerente con la fascia (esatta per i bambini)
    const g=LIN[l].g;
    if(slot<g.nK)return Math.min(cur,(Math.floor(cur/g.Lk)-slot)*g.Lk+h%g.Lk);
    if(slot<g.nK+g.nA)return cur-g.a0-(slot-g.nK)*g.La-h%g.La;
    return cur-g.e0-(slot-g.nK-g.nA)*g.Le-h%g.Le;
  }
  function pickGoal(pop,i,w,not){
    const R=pop.R,score=[0,T(R,i,2),T(R,i,4),T(R,i,1),T(R,i,0),T(R,i,3)];
    let best=1,bs=-1;
    for(let g=1;g<=5;g++){if(g===not)continue;const s=score[g]+hash(pop.seed,R.hid[i],C.GOAL,w,g)%16;if(s>bs){bs=s;best=g;}}
    return best;
  }
  function newRow(pop){const R=pop.R;if(pop.free.length)return pop.free.pop();if(R.n>=R.cap)grow(R);return R.n++;}
  function derive(pop,i){const R=pop.R,h=hidOf(pop,uidOf(R,i));R.hid[i]=h;for(let t=0;t<5;t++)R.traits[i*5+t]=trait(h,t,R.lin[i]);}
  // Nuovo record nel luogo P, nato nel luogo di origine O (identità «O:n»), fascia d'età `slot`.
  function mint(pop,P,O,l,stage,cls,prof,slot,cur){
    const i=newRow(pop),R=pop.R;
    R.place[i]=P.ix;R.origin[i]=O.ix;R.serial[i]=O.minted++;R.lin[i]=l;R.stage[i]=stage;R.cls[i]=cls;R.prof[i]=prof;
    for(const k of ['flags','wounds','goalL','moves','proj','kids','xp','relN','memN'])R[k][i]=0;
    R.alive[i]=1;R.since[i]=0;R.spouse[i]=NOID;R.pa[i]=NOID;R.pb[i]=NOID;R.wealth[i]=0n;
    derive(pop,i);
    R.born[i]=bornFor(l,slot,R.hid[i],cur);
    R.goalL[i]=stage>0?pickGoal(pop,i,0,0):0;
    pop.idMap.set(uidOf(R,i),i);
    if(!pop.bulk){enter(P,R,i);needsOf(pop,P,i);} // in blocco (materializzazione) l'ingresso è alla fine
    return i;
  }
  function lineageWeights(P,desc){
    if(object(desc.lineages)){
      const rows=Object.entries(desc.lineages).filter(([id,v])=>linId(id)&&Number.isFinite(v)&&v>0).sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:1)).slice(0,12);
      if(rows.length)return rows.map(([id,v])=>[linOf(id),v]);
    }
    const h=(fnv(String(desc.continent||''))^P.h)>>>0,ws=COMMON.map(()=>0); // senza segno: ogni quota va a una stirpe vera
    ws[0]=40;ws[1+h%7]+=30;ws[1+(h>>>4)%7]+=15;ws[1+(h>>>8)%7]+=8;
    return COMMON.map((id,t)=>[linOf(id),ws[t]]).filter(x=>x[1]>0);
  }
  // Classi coerenti con i totali di adulti e anziani (coppie intere; chi è sposato con un anziano ha un coniuge anziano).
  function classes(G,A,E){
    const ae=Math.min(Math.floor(A*.05),Math.floor(E*.25)),aa=Math.floor((A-ae)*.32),aw=Math.floor(A*.03),ee=Math.floor((E-ae)*.28),ew=Math.floor((E-ae)*.3);
    G.c.set([A-ae-2*aa-aw,2*aa,ae,aw,E-ae-2*ee-ew,ae,2*ee,ew]);
  }
  function populate(pop,P,desc){
    const n=intIn(desc.population,0,1e7)?desc.population:0,tie=P.h,want=intIn(desc.capacity,1,1e9)?desc.capacity:0;
    P.capacity=Math.max(want,n?Math.max(40,n):ROOM[P.kind]);
    const rows=lineageWeights(P,desc),per=apportion(n,rows.map(x=>x[1]),tie);
    let A=0;
    rows.forEach(([l],t)=>{
      if(!per[t])return;
      const g=LIN[l].g,G=linIn(P,l,Math.max(8,Math.ceil(P.capacity*per[t]/n))),lh=LIN[l].h;
      // Piramide d'età stazionaria della stirpe: sopravvivenza × ampiezza della fascia.
      const ws=[];let s=1;
      for(let j=0;j<g.nK;j++){ws.push(s*g.Lk);s*=Math.exp(-g.kidRisk*g.Lk/M);}
      for(let j=0;j<g.nA;j++){ws.push(s*g.La);s*=Math.exp(-g.adultRisk*g.La/M);}
      for(let j=0;j<g.nE;j++){ws.push(s*g.Le*(j<g.nE-1?1:.35));s*=Math.exp(-g.elderRisk[j]*g.Le/M);}
      apportion(per[t],ws,(tie+lh)|0).forEach((c,j)=>{G.h[j]=c;});
      let a=0,e=0;
      for(let j=g.nK;j<g.n;j++)if(j<g.nK+g.nA)a+=G.h[j];else e+=G.h[j];
      classes(G,a,e);A+=a;
    });
    recount(P);
    apportion(A,[30,...sharesOf(P.kind).slice(1),40],tie+5).forEach((c,p)=>{P.jobs[p]=c;});
    P.wealth=BigInt(n)*BigInt(Math.floor((PER_CAPITA[P.kind]||800)*(900+hash(pop.seed,P.h,C.PLACE,0,0)%200)/1000));
    P.avg=n?P.wealth/BigInt(n):0n;
  }
  const NEUTRAL={foodScarcity:0,wageIndex:1000,unemployment:0,prosperity:1000,crisis:0,war:0,disaster:0,labor:null};
  function newPlace(desc,ix){
    const kind=KINDS.includes(desc.kind)?desc.kind:'village';
    return {id:desc.id,ix,kind,continent:typeof desc.continent==='string'?desc.continent.slice(0,64):'',links:[],linkIds:[],h:fnv(desc.id),
      lin:new Map(),order:[],jobs:new Int32Array(NP),wealth:0n,avg:0n,due:{w:new Map(),out:0n},carry:{},minted:0,materialized:false,capacity:40,alive:0,
      sig:NEUTRAL,list:[],grp:new Map(),recW:0n,aq:0,rq:0};
  }
  const placeIx=(pop,id)=>typeof id==='string'&&pop.index.has(id)?pop.index.get(id):-1;
  function linkUp(pop,descs){
    const byId=new Map(descs.map(d=>[d.id,d]));
    for(const P of pop.places){
      const d=byId.get(P.id),ids=d&&Array.isArray(d.links)?d.links:P.linkIds,seen=new Set();
      P.links=[];P.linkIds=[];
      for(const id of ids||[]){const j=placeIx(pop,id);if(j>=0&&j!==P.ix&&!seen.has(j)){seen.add(j);P.links.push(j);P.linkIds.push(id);}}
    }
  }
  function validDescs(places){
    const out=[],seen=new Set();
    for(const d of Array.isArray(places)?places:[])if(object(d)&&safeId(d.id)&&!seen.has(d.id)&&out.length<65535){seen.add(d.id);out.push(d);}
    return out;
  }
  const TOTALS=['births','deaths','marriages','mourned','migrations','arrivals','families','foundings','careers','departures','expeditionDeaths','matured','retired'];
  const BIGS=['loot','upkeep','wages','spend','tax'];
  const RTOTALS=['marriages','bondMarriages','births','adopted','parted','left','slid','successions'];
  function blank(seed,week){
    const t={};for(const k of TOTALS)t[k]=0;for(const k of BIGS)t[k]=0n;
    return {schema:SCHEMA,seed:seed>>>0,week,w:week,note:'',places:[],index:new Map(),R:makeRecords(),free:[],idMap:new Map(),tombs:new Map(),log:[],
      flagged:new Set(),bulk:false,dec:emptyDecisions(week),choices:{},gen:null,totals:t,rtotals:Object.fromEntries(RTOTALS.map(k=>[k,0]))};
  }
  function emptyDecisions(w){return {week:w,births:[],deaths:[],widowed:[],marriages:[],migrations:[],foundings:[],departures:[],careers:[],matured:[],retired:[],actions:[]};}
  const weekOf=now=>Number.isFinite(now)&&now>=0?Math.ceil(now/WEEK):0;
  function create(seed,places,now){
    const pop=blank(Number.isFinite(seed)?Math.floor(Math.abs(seed)):0,weekOf(now)),descs=validDescs(places);
    for(const d of descs){const P=newPlace(d,pop.places.length);pop.places.push(P);pop.index.set(P.id,P.ix);}
    linkUp(pop,descs);
    for(const d of descs)populate(pop,pop.places[pop.index.get(d.id)],d);
    return pop;
  }

  // ——— Segnali dell'economia ———
  function signalsOf(env,id){
    let raw=null;
    try{raw=env&&env.economy&&typeof env.economy.signals==='function'?env.economy.signals(id):null;}catch(e){raw=null;}
    const s={...NEUTRAL};
    if(!object(raw))return s;
    const n=(k,a,b)=>{if(Number.isFinite(raw[k]))s[k]=clamp(Math.round(raw[k]),a,b);};
    n('foodScarcity',0,1000);n('wageIndex',0,10000);n('unemployment',0,1000);n('prosperity',0,10000);
    for(const k of ['crisis','war','disaster'])s[k]=raw[k]===1||raw[k]===true?1:0;
    if(object(raw.labor)){
      const t=new Array(NP).fill(1000);let any=false;
      for(let p=1;p<ADV;p++)if(own(raw.labor,PROFS[p])&&Number.isFinite(raw.labor[PROFS[p]])){t[p]=clamp(Math.round(raw.labor[PROFS[p]]),0,4000);if(t[p]!==1000)any=true;}
      if(any)s.labor=t;
    }
    return s;
  }
  const hunger=s=>{const f=clamp((s.foodScarcity-200)/800,0,1);return f*f;};
  const attract=s=>s.prosperity+s.wageIndex-s.foodScarcity-s.war*1500-s.disaster*1200-s.crisis*400;

  // ——— Morti ed eredità (record) ———
  function entomb(pop,i,w,cause){
    const R=pop.R,u=uidOf(R,i),flagged=j=>j>=0&&!!(R.flags[j]&(KNOWN|SWAYED));
    let pinned=!!(R.flags[i]&(KNOWN|SWAYED))||flagged(rowOf(pop,R.spouse[i]))||flagged(rowOf(pop,R.pa[i]))||flagged(rowOf(pop,R.pb[i]));
    for(let k=0;k<R.relN[i]&&!pinned;k++)pinned=flagged(rowOf(pop,R.relU[i*6+k]));
    if(!pinned)for(const f of pop.flagged){const j=rowOf(pop,f);if(j>=0&&(R.pa[j]===u||R.pb[j]===u||relAt(R,j,u)>=0||R.spouse[j]===u)){pinned=true;break;}}
    for(const t of pop.tombs.values())if(!pinned&&t.f&&(t.s===u))pinned=true; // coniuge di un conosciuto già morto
    if(!pinned&&!R.flags[i])return;
    pop.tombs.set(u,{l:R.lin[i],b:R.born[i],d:w,c:cause,p:R.prof[i],s:R.spouse[i],k:R.kids[i],f:pinned?1:0});
    if(pop.tombs.size>LIMITS.tombs){
      let drop=-1;
      for(const [k,t] of pop.tombs)if(!t.f){drop=k;break;}
      pop.tombs.delete(drop<0?pop.tombs.keys().next().value:drop);
    }
  }
  function kill(pop,P,i,cause,w){
    const R=pop.R,u=uidOf(R,i),id=idOf(pop,i),amt=R.wealth[i],heirs=[],s=R.cls[i]===1||R.cls[i]===2?rowOf(pop,R.spouse[i]):-1;
    setWealth(pop,i,0n);
    if(s>=0){
      setClass(pop,s,R.stage[s],3);R.since[s]=w;remember(pop,s,5,u,w);pop.dec.widowed.push(idOf(pop,s));
      if(amt>0n){give(pop,s,amt);remember(pop,s,10,u,w);heirs.push({id:idOf(pop,s),as:'coniuge',amount:String(amt)});}
    }else if(amt>0n&&R.kids[i]){
      const kids=P.list.filter(j=>j!==i&&(R.pa[j]===u||R.pb[j]===u));
      if(kids.length){
        const each=amt/BigInt(kids.length);
        let rest=amt-each*BigInt(kids.length);
        for(const j of kids){const v=each+(rest>0n?1n:0n);if(rest>0n)rest--;give(pop,j,v);remember(pop,j,10,u,w);heirs.push({id:idOf(pop,j),as:'figlio',amount:String(v)});}
      }
    } // altrimenti resta nella cassa del luogo
    entomb(pop,i,w,cause);
    for(let k=0;k<R.relN[i];k++){
      const j=rowOf(pop,R.relU[i*6+k]);
      if(j<0||R.flags[j]&(KNOWN|SWAYED))continue;
      const q=relAt(R,j,u);if(q>=0)dropRel(R,j,q);
    }
    pop.dec.deaths.push({id,cause:CAUSES[cause],place:P.id,heirs});
    log(pop,w,cause===3?'expedition':'death',P,cause===3?`${nameOf(pop,i)} non torna dalla spedizione.`:`Muore ${nameOf(pop,i)} (${LIN[R.lin[i]].name}, ${Math.floor((w-R.born[i])/YW)} anni) a ${P.id}: ${CAUSES[cause]}.`);
    leave(P,R,i);R.alive[i]=0;pop.idMap.delete(u);pop.flagged.delete(u);pop.free.push(i);
  }
  // Morte di una persona della stirpe l: stage 0 bambino (fascia esatta slot), 1 adulto, 2 anziano (classe estratta).
  function death(pop,P,l,stage,slot,cause,w,job){
    const G=P.lin.get(l),g=LIN[l].g,R=pop.R;
    let cls=-1,recs=EMPTY,total=0;
    if(stage===0){total=G.h[slot];recs=group(P,l,0,0);if(recs.length)recs=recs.filter(i=>bucketOf(l,R.born[i],w)===slot);}
    else{cls=drawSpan(ar(pop,P,C.DEATH),G.c,stage===1?0:4,stage===1?4:8);total=G.c[cls];recs=group(P,l,stage,cls%4);}
    const rec=isRecord(pop,P,recs.length,total,C.DEATH);
    G.h[slot]--;G.n--;P.alive--;pop.totals.deaths++;
    if(stage===1){if(job>=0)P.jobs[job]--;else{const p=drawIx(ar(pop,P,C.JOB),P.jobs);if(p>=0)P.jobs[p]--;}}
    const c=G.c;
    switch(cls){
      case A0:case AW:case E0:case EW:c[cls]--;break;
      case AA:c[AA]-=2;c[AW]++;break;
      case AE:c[AE]--;c[EA]--;c[EW]++;break;
      case EA:c[EA]--;c[AE]--;c[AW]++;break;
      case EE:c[EE]-=2;c[EW]++;break;
    }
    if(!rec)return;
    const last=slot===g.n-1,mid=stage===1?g.a0+(slot-g.nK+.5)*g.La:g.e0+(slot-g.nK-g.nA+.5)*g.Le,old=LIN[l].b.life*YW*1.2; // chi ha superato di un quinto la durata tipica viene prima
    const [i]=choose(pop,recs,1,i=>{
      const age=w-R.born[i];
      if(stage===0)return N(R,i,0);
      return (last||age>old?age:-Math.abs(age-mid))+(age>old?1e6:0)+R.wounds[i]+(cause===3?(R.prof[i]===ADV?1e5:0)+T(R,i,0)*9:cause===5&&R.prof[i]===13?40:0);
    },C.DEATH)/*MORTE*/;
    kill(pop,P,i,cause,w);
    return i;
  }

  // ——— Fasi della settimana per luogo (strato aggregato e, dove ci sono, record) ———
  function retireRecords(pop,P,l,cls,k,w){ // k adulti della classe diventano anziani: i più vecchi (mai entrambi i coniugi insieme)
    const R=pop.R,all=group(P,l,1,cls);
    if(!k||!all.length)return;
    const items=choose(pop,all.slice(),all.length,i=>-R.born[i],C.AGE);
    let left=k;
    for(const i of items){
      if(!left)break;
      if(R.stage[i]!==1||R.cls[i]!==cls)continue; // il coniuge è appena diventato anziano: ora è in un'altra classe
      left--;
      const s=cls===1||cls===2?rowOf(pop,R.spouse[i]):-1;
      R.prof[i]=NONE;remember(pop,i,12,0,w);pop.dec.retired.push(idOf(pop,i));
      setClass(pop,i,2,cls);
      if(s>=0)setClass(pop,s,R.stage[s],2);
    }
  }
  function* phaseShift(pop,P,w){
    for(const l of P.order.slice()){
      const G=P.lin.get(l),g=LIN[l].g,h=G.h,oA=g.nK,oE=g.nK+g.nA;
      if((w+g.oE)%g.Le===0){h[oE+g.nE-1]+=h[oE+g.nE-2];for(let j=g.nE-2;j>0;j--)h[oE+j]=h[oE+j-1];h[oE]=0;}
      if((w+g.oA)%g.La===0){
        const n=h[oE-1],k=[0,0,0,0],kr=[0,0,0,0],before=[0,1,2,3].map(q=>[group(P,l,1,q).length,G.c[q]]);
        for(let j=oE-1;j>oA;j--)h[j]=h[j-1];
        h[oA]=0;h[oE]+=n;
        for(let t=0;t<n;t++){
          const c=G.c,q=drawIx(ar(pop,P,C.AGE),[c[A0]*.2,c[AA],c[AE]*2,c[AW]*3]);
          if(q===0){c[A0]--;c[E0]++;}else if(q===3){c[AW]--;c[EW]++;}
          else if(q===1){c[AA]-=2;c[AE]++;c[EA]++;}else{c[AE]--;c[EA]--;c[EE]+=2;}
          k[q]++;
          const p=drawIx(ar(pop,P,C.JOB),P.jobs);if(p>=0)P.jobs[p]--;
          if(before[q][0]){ // la classe 2 può crescere durante il ciclo: conta anche chi vi è appena entrato
            if(P.materialized)kr[q]++;else{const [r,tot]=before[q];if(Math.floor(u01(rr(pop,P,C.AGE))*Math.max(1,tot))<r)kr[q]++;}
          }else if(q===2&&kr[1]&&P.materialized)kr[q]++;
        }
        pop.totals.retired+=n;
        if(n&&P.list.length){
          if(P.materialized)for(const q of [1,2,0,3]){retireRecords(pop,P,l,q,k[q],w);yield;}
          else for(const q of [1,2,0,3]){ // misto: mai più record di quanti gli anonimi possano compensare
            const c0=q===0?G.c[A0]:q===1?G.c[AA]:q===2?G.c[AE]:G.c[AW],r=group(P,l,1,q).length,must=Math.max(0,q===1?Math.ceil((r-c0)/2):r-c0);
            retireRecords(pop,P,l,q,Math.max(must,Math.min(kr[q],k[q])),w);
          }
        }
      }
      if(w%g.Lk===0){
        const n=h[g.nK-1];
        for(let j=g.nK-1;j>0;j--)h[j]=h[j-1];
        h[0]=0;h[oA]+=n;G.c[A0]+=n;P.jobs[NONE]+=n;pop.totals.matured+=n;
        const kids=group(P,l,0,0);
        if(kids.length)for(const i of kids.slice()){
          const R=pop.R;
          if(bucketOf(l,R.born[i],w)<g.nK)continue;
          R.prof[i]=NONE;setClass(pop,i,1,0);R.goalL[i]=pickGoal(pop,i,w,0);pop.dec.matured.push(idOf(pop,i));
        }
      }
      if(P.list.length)yield;
    }
  }
  const wish=(R,i)=>T(R,i,2)*2+N(R,i,3)*2+(R.goalL[i]===1?150:0);
  function marryRecords(pop,P,l,kr,w){ // kr partecipanti fra i celibi noti (se dispari, l'ultimo sposa un anonimo che diventa noto)
    const R=pop.R,g=LIN[l].g;
    if(kr%2){
      // Il coniuge anonimo prende un volto: un posto di lavoro fra quelli degli anonimi, un'età fra quelle del luogo.
      const free=Array.from(P.jobs);for(const j of P.list)if(R.stage[j]===1&&free[R.prof[j]]>0)free[R.prof[j]]--;
      const slot=drawSpan(rr(pop,P,C.MARRY),P.lin.get(l).h,g.nK,g.nK+g.nA),p=drawIx(rr(pop,P,C.MARRY),free);
      const mate=mint(pop,P,P,l,1,0,p<0?NONE:p,slot<0?g.nK:slot,w);
      R.needs[mate*4+3]=100;kr++;
    }
    const S=group(P,l,1,0).slice().sort((a,b)=>before(R,a,b)?-1:1),W=new Map(S.map(i=>[i,wish(R,i)])),free=new Set(S);
    tally(pop,'matrimonio',S.length<=kr,kr);
    for(let m=kr>>1;m>0;m--){
      let a=-1,as=-Infinity,b=-1,adopted=false;
      for(const i of free){
        let bb=0;
        for(let k=0;k<R.relN[i];k++){const j=rowOf(pop,R.relU[i*6+k]);if(j>=0&&free.has(j)&&R.relS[i*6+k]>bb&&!kin(R,i,j))bb=R.relS[i*6+k];}
        const s=W.get(i)+bb*4;
        if(s>as){
          // serve almeno un partner possibile (non consanguineo, non rivale)
          let ok=false;for(const j of free)if(j!==i&&!kin(R,i,j)&&bond(pop,i,j)>=0&&bond(pop,j,i)>=0){ok=true;break;}
          if(ok){a=i;as=s;}
        }
      }
      if(a>=0){
        let bs=-Infinity;
        for(const j of free){
          if(j===a||kin(R,a,j))continue;
          const x=bond(pop,a,j),y=bond(pop,j,a);
          if(x<0||y<0)continue;
          const s=(x+y)*4+W.get(j)-Math.abs(R.born[a]-R.born[j])*300/g.adultW;
          if(s>bs){bs=s;b=j;}
        }
      }else{ // nessuna coppia possibile: prima si riconciliano due rivali, altrimenti uno scopre di essere stato adottato
        const f=[...free];
        out:for(const i of f)for(const j of f)if(i!==j&&!kin(R,i,j)){a=i;b=j;break out;}
        if(a<0){[a,b]=f;adopted=true;R.pa[a]=R.pb[a]=NOID;if(kin(R,a,b))R.pa[b]=R.pb[b]=NOID;remember(pop,a,16,0,w);pop.rtotals.adopted++;}
        for(const [x,y] of [[a,b],[b,a]]){const k=relAt(R,x,uidOf(R,y));if(k>=0&&R.relS[x*6+k]<0)dropRel(R,x,k);}
      }
      const tieNow=bond(pop,a,b)+bond(pop,b,a);
      free.delete(a);free.delete(b);
      pop.rtotals.marriages++;if(tieNow>0)pop.rtotals.bondMarriages++;
      for(const [x,y] of [[a,b],[b,a]]){setClass(pop,x,1,1);R.spouse[x]=uidOf(R,y);remember(pop,x,3,uidOf(R,y),w);addRel(pop,x,y,40);}
      pop.dec.marriages.push({a:idOf(pop,a),b:idOf(pop,b),place:P.id,bond:tieNow,adopted});
      log(pop,w,'marriage',P,`${nameOf(pop,a)} e ${nameOf(pop,b)} si sposano a ${P.id}.`);
    }
  }
  function* phaseMarriage(pop,P,s,w){
    const mod=clamp(s.prosperity/1000,.4,1.5)*(1-s.crisis*.3)*(1-s.war*.3);
    for(const l of P.order){
      const G=P.lin.get(l),g=LIN[l].g,n=G.c[A0];
      if(!n)continue;
      const K=quantum(pop,P,'marry:'+LIN[l].id,C.MARRY,n*g.marry*mod/2,n>>1);
      if(!K)continue;
      let kr=0,rec=group(P,l,1,0).length,tot=n;
      if(rec)for(let t=0;t<2*K;t++){if(isRecord(pop,P,rec,tot,C.MARRY)){kr++;rec--;}tot--;}
      G.c[A0]-=2*K;G.c[AA]+=2*K;pop.totals.marriages+=K;
      if(kr){marryRecords(pop,P,l,kr,w);yield;}
    }
  }
  function phaseMourning(pop,P,w){
    const R=pop.R;
    for(const l of P.order){
      const G=P.lin.get(l),n=G.c[AW];
      if(!n)continue;
      const K=quantum(pop,P,'mourn:'+LIN[l].id,C.MOURN,n*M/LIN[l].g.mourn,n);
      if(!K)continue;
      G.c[AW]-=K;G.c[A0]+=K;pop.totals.mourned+=K;
      let rec=group(P,l,1,3).length,kr=0,tot=n;
      if(rec)for(let t=0;t<K;t++){if(isRecord(pop,P,rec,tot,C.MOURN)){kr++;rec--;}tot--;}
      for(const i of choose(pop,group(P,l,1,3).slice(),kr,i=>(w-R.since[i])*4+wish(R,i)/10,C.MOURN)){setClass(pop,i,1,0);remember(pop,i,17,R.spouse[i],w);}
    }
  }
  function risksOf(g,s){
    const fam=25000*hunger(s),war=s.war,dis=s.disaster*12000;
    return {fam,war:war*7000,dis,kid:Math.round(g.kidRisk+fam*1.3+war*3500+dis*1.4),adult:Math.round(g.adultRisk+fam+war*7000+dis),
      elder:g.elderRisk.map(x=>Math.min(950000,Math.round(x+fam*1.5+war*3500+dis*1.8)))};
  }
  function causeOf(stage,base,r){
    const top=Math.max(r.fam,r.war,r.dis);
    if(top<=base)return stage===2?1:2;
    return top===r.dis?4:top===r.fam?6:5;
  }
  function* phaseDeath(pop,P,s,w){
    let X=0;
    const rows=P.order.map(l=>{
      const G=P.lin.get(l),g=LIN[l].g,r=risksOf(g,s);
      let x=kidsOf(G,g)*r.kid+adultsOf(G)*r.adult;
      for(let j=0;j<g.nE;j++)x+=G.h[g.nK+g.nA+j]*r.elder[j];
      X+=x;
      return {l,G,g,r,x};
    });
    const K=quantum(pop,P,'death',C.DEATH,X,P.alive);
    for(let t=0;t<K;t++){
      let W=0;for(const q of rows)W+=q.x;
      if(W<=0)break;
      let r=Math.floor(u01(ar(pop,P,C.DEATH))*W);
      for(const q of rows){
        if(r>=q.x){r-=q.x;continue;}
        const {l,G,g}=q;
        let stage=-1,slot=-1,risk=0;
        const k=kidsOf(G,g)*q.r.kid;
        if(r<k){stage=0;slot=drawSpan(ar(pop,P,C.DEATH),G.h,0,g.nK);risk=q.r.kid;}
        else{
          r-=k;const a=adultsOf(G)*q.r.adult;
          if(r<a){stage=1;slot=drawSpan(ar(pop,P,C.DEATH),G.h,g.nK,g.nK+g.nA);risk=q.r.adult;}
          else{r-=a;stage=2;for(let j=0;j<g.nE;j++){const x=G.h[g.nK+g.nA+j]*q.r.elder[j];if(r<x||j===g.nE-1&&G.h[g.nK+g.nA+j]){slot=g.nK+g.nA+j;risk=q.r.elder[j];break;}r-=x;}}
        }
        if(slot<0)break;
        q.x-=risk;
        death(pop,P,l,stage,slot,causeOf(stage,stage===0?g.kidRisk:stage===1?g.adultRisk:g.elderRisk[slot-g.nK-g.nA],q.r),w,-1);
        break;
      }
      if(P.list.length&&t%4===3)yield;
    }
  }
  const RANK={success:3,empty:2,wounded:1,death:0};
  function* phaseExpeditions(pop,P,s,w){
    const n=P.jobs[ADV],R=pop.R;
    if(!n)return;
    const K=quantum(pop,P,'depart',C.DEPART,n*40000*(1000+s.crisis*500+Math.max(0,1000-s.prosperity)/2)/1000,n);
    if(!K)return;
    const wilds=P.links.filter(j=>!SETTLE.has(pop.places[j].kind)&&pop.places[j].kind!=='interior'),outcomes=[];
    pop.totals.departures+=K;
    for(let j=0;j<K;j++){
      const h=ar(pop,P,C.OUTCOME),di=wilds.length?wilds[ar(pop,P,C.DEST)%wilds.length]:-1,D=di>=0?pop.places[di]:null;
      const d=D?1+D.h%4+(D.kind==='dungeon'?1:0):2,r=u01(h),h2=mix(h^0x5bd1e995);
      let o='empty',loot=0n,xp=2,wound=0;
      if(r<.012*d)o='death';
      else if(r<.072*d){o='wounded';loot=BigInt(d*(h2%300));xp=5*d;wound=20+h2%40;}
      else if(r<.072*d+.5){o='success';loot=BigInt(d*(400+h2%1600));xp=10*d;}
      // Viveri ed equipaggiamento consumati: in media quanto il bottino atteso (600 d + 9 d²), mai più della ricchezza del luogo.
      let cost=BigInt(Math.round(d*(400+(h2>>>12)%401)+d*d*9));
      if(cost>P.wealth)cost=P.wealth;
      P.wealth+=loot-cost;pop.totals.loot+=loot;pop.totals.upkeep+=cost;
      outcomes.push({o,loot,cost,xp,wound,to:D?D.id:'terre selvagge'});
    }
    // Chi non torna: stirpe e classe dalla regola di luogo; fra i record della classe, prima gli avventurieri.
    for(const e of outcomes)if(e.o==='death'){
      const l=P.order[drawIx(ar(pop,P,C.DEATH),P.order.map(l=>adultsOf(P.lin.get(l))))],g=LIN[l].g,slot=drawSpan(ar(pop,P,C.DEATH),P.lin.get(l).h,g.nK,g.nK+g.nA);
      pop.totals.expeditionDeaths++;
      const n0=pop.dec.deaths.length;
      death(pop,P,l,1,slot,3,w,P.jobs[ADV]>0?ADV:-1);
      if(pop.dec.deaths.length>n0)pop.dec.departures.push({id:pop.dec.deaths[n0].id,from:P.id,to:e.to,outcome:'death',loot:'0',skill:0});
    }
    const alive=outcomes.filter(e=>e.o!=='death');
    if(!P.list.length||!alive.length)return;
    let cand=P.list.filter(i=>R.stage[i]===1&&R.prof[i]===ADV),kr=0,rec=cand.length,tot=n;
    for(let j=0;j<alive.length;j++){if(isRecord(pop,P,rec,tot,C.DEPART)){kr++;rec--;}tot--;}
    if(P.materialized)kr=alive.length;
    if(cand.length<kr){ // meno avventurieri noti che partenze: si uniscono volontari
      const extra=choose(pop,P.list.filter(i=>R.stage[i]===1&&R.prof[i]!==ADV),kr-cand.length,i=>T(R,i,0)*3+T(R,i,1)-R.wounds[i]*4,C.PICK);
      cand=cand.concat(extra);
    }
    yield;
    const who=choose(pop,cand,kr,i=>{
      let mates=0;
      for(let k=0;k<R.relN[i];k++){const j=rowOf(pop,R.relU[i*6+k]);if(j>=0&&R.prof[j]===ADV)mates+=R.relS[i*6+k];}
      return T(R,i,0)*3+T(R,i,1)*2+N(R,i,2)*2-R.wounds[i]*4+(R.goalL[i]===4?80:0)+(R.goalL[i]===3?40:0)+(goalNow(R,i)===5?30:0)+mates/2;
    },C.DEPART,'spedizione');
    const mine=alive.slice(0,who.length).sort((a,b)=>RANK[b.o]-RANK[a.o]||(b.loot>a.loot?1:b.loot<a.loot?-1:0));
    const skill=i=>R.xp[i]-R.wounds[i]*2;
    who.sort((a,b)=>/*ESITI*/skill(b)-skill(a)||(before(R,a,b)?-1:1)).forEach((i,j)=>{
      const e=mine[j],name=nameOf(pop,i);
      pop.dec.departures.push({id:idOf(pop,i),from:P.id,to:e.to,outcome:e.o,loot:String(e.loot),skill:skill(i)});
      setWealth(pop,i,R.wealth[i]+e.loot-e.cost);
      R.xp[i]=Math.min(4e9,R.xp[i]+e.xp);R.wounds[i]=Math.min(100,R.wounds[i]+e.wound);
      remember(pop,i,8,RANK[e.o],w);
      log(pop,w,'expedition',P,e.o==='success'?`${name} torna da ${e.to} con ${money(e.loot)}.`:e.o==='wounded'?`${name} torna ferito dalla spedizione a ${e.to}.`:`${name} torna a mani vuote da ${e.to}.`);
    });
  }
  function targets(P,s,A){
    const sh=sharesOf(P.kind),lab=s.labor,we=sh.map((x,p)=>lab?x*clamp(500+lab[p]/2,250,2000)/1000:x),S=we.reduce((a,b)=>a+b,0),t=new Array(NP).fill(0);
    const noneT=20+s.crisis*60+s.disaster*40+clamp(Math.floor((1000-s.wageIndex)/8),0,100);
    const advT=35+s.crisis*30+s.war*20+(s.prosperity<800?20:0),rest=1000-noneT-advT;
    for(let p=1;p<ADV;p++)t[p]=Math.floor(A*we[p]*rest/(S*1000));
    t[NONE]=Math.floor(A*noneT/1000);t[ADV]=Math.floor(A*advT/1000);
    return t;
  }
  // Cambi di mestiere: lo strato aggregato sposta i posti, gradualmente, verso le quote del luogo e i posti vacanti.
  function phaseCareers(pop,P,s){
    let A=0;for(let p=0;p<NP;p++)A+=P.jobs[p];
    if(!A)return;
    const t=targets(P,s,A),sur=Array.from(P.jobs,(n,p)=>Math.max(0,n-t[p])),def=Array.from(P.jobs,(n,p)=>Math.max(0,t[p]-n));
    const mis=def.reduce((a,b)=>a+b,0),K=quantum(pop,P,'career',C.CAREER,mis*40000,Math.min(mis,sur.reduce((a,b)=>a+b,0)));
    for(let j=0;j<K;j++){
      const src=drawIx(ar(pop,P,C.CAREER),sur),dst=drawIx(ar(pop,P,C.CAREER),def);
      if(src<0||dst<0)break;
      sur[src]--;def[dst]--;P.jobs[src]--;P.jobs[dst]++;pop.totals.careers++;
    }
  }
  function careerUtil(pop,i,src,dst){
    const R=pop.R;
    let u=N(R,i,2)*2+T(R,i,1)+(src===NONE?120:0)+(goalNow(R,i)===4?100:0);
    u-=R.goalL[i]===2&&src!==NONE?150+T(R,i,4):T(R,i,4)/2;
    u-=Math.min(60,R.proj[i]/2);
    if(dst===ADV)u+=T(R,i,0)*2+(R.goalL[i]===4?150:0)-R.wounds[i]*2;
    else if(src===ADV)u+=R.wounds[i]*2-T(R,i,0);
    if(dst===11&&R.goalL[i]===3)u+=60;
    if(dst===NONE)u+=R.wounds[i]*2-R.xp[i]/10;
    return u;
  }
  // I record si riallineano ai posti del luogo: chi subentra in un posto vacante lo decide l'utilità fra TUTTI quelli dei mestieri in eccesso.
  function* reconcile(pop,P,w){
    const R=pop.R,hist=new Array(NP).fill(0),adults=[];
    for(const i of P.list)if(R.stage[i]===1){adults.push(i);hist[R.prof[i]]++;}
    const over=hist.map((n,p)=>Math.max(0,n-P.jobs[p])),room=hist.map((n,p)=>Math.max(0,P.jobs[p]-n)),moves=over.reduce((a,b)=>a+b,0);
    if(!moves)return;
    yield;
    const need=new Array(NP).fill(0);
    if(P.materialized)for(let p=0;p<NP;p++)need[p]=room[p];
    else for(let j=0;j<moves;j++){const p=drawIx(rr(pop,P,C.CAREER),room);room[p]--;need[p]++;}
    for(let dst=NP-1;dst>=0;dst--){
      if(!need[dst])continue;
      const cand=adults.filter(i=>over[R.prof[i]]>0&&R.prof[i]!==dst);
      tally(pop,'mestiere',cand.length<=need[dst],need[dst]);
      const picks=choose(pop,cand,cand.length<=1?1:cand.length,i=>careerUtil(pop,i,R.prof[i],dst),C.CAREER);
      for(const i of picks){
        if(!need[dst])break;
        const src=R.prof[i];
        if(!over[src])continue;
        over[src]--;need[dst]--;R.prof[i]=dst;pop.rtotals.successions++;
        remember(pop,i,6,dst,w);
        pop.dec.careers.push({id:idOf(pop,i),from:PROFS[src],to:PROFS[dst]});
        log(pop,w,'career',P,dst===NONE?`${nameOf(pop,i)} resta senza lavoro a ${P.id}.`:`${nameOf(pop,i)} diventa ${PROF_NAMES[dst]} a ${P.id}.`);
      }
      yield;
    }
  }
  function* phaseBirths(pop,P,s,w){
    const R=pop.R,mod0=clamp(.6+.4*s.prosperity/1000,.5,1.2)*(1-hunger(s)*.5-Math.min(1,s.foodScarcity/1000)*.45)*(1-s.war*.3)*(1-s.disaster*.5);
    for(const l of P.order.slice()){
      const G=P.lin.get(l),g=LIN[l].g,A=adultsOf(G),crowd=/*CAPIENZA*/clamp((1.25-crowdOf(P,G))/.5,0,1);
      if(!A)continue;
      let X;
      if(g.parents===2){
        let f=0;for(let j=0;j<g.nA;j++)f+=G.h[g.nK+j]*g.fertile[j];
        X=(G.c[AA]/2*(f/A)+G.c[AE]*.05)*g.birth;
      }else X=A*g.birth;
      const K=quantum(pop,P,'birth:'+LIN[l].id,C.BIRTH,X*crowd*Math.max(0,mod0),1e9);
      if(!K)continue;
      G.h[0]+=K;G.n+=K;P.alive+=K;pop.totals.births+=K;
      if(!P.list.length)continue;
      const couples=g.parents===2?group(P,l,1,1).filter(i=>uidOf(R,i)<R.spouse[i]).concat(group(P,l,1,2)):null;
      const adults=g.parents===1?[].concat(...[0,1,2,3].map(q=>group(P,l,1,q))):null;
      const total=g.parents===2?G.c[AA]/2+G.c[AE]:A,recN=couples?couples.length:adults?adults.length:0;
      let kr=0;
      for(let t=0;t<K;t++)if(g.parents===0?P.materialized:isRecord(pop,P,recN,total,C.BIRTH))kr++;
      if(!kr)continue;
      yield;
      const util=i=>{
        const j=couples?rowOf(pop,R.spouse[i]):i,x=(w-Math.min(R.born[i],R.born[j])-g.a0)/(g.e0-g.a0);
        return (R.goalL[i]===1?60:0)+(R.goalL[j]===1?60:0)+(T(R,i,2)+T(R,j,2)+N(R,i,3)+N(R,j,3))/2-22*(R.kids[i]+R.kids[j])-(x>.6?300*(x-.6):0);
      };
      const cand=couples||adults;
      let picks=cand?choose(pop,cand,Math.min(kr,cand.length),util,C.PARENT,'genitori'):[];
      for(let t=0;t<kr;t++){
        const a=picks.length?picks[t%picks.length]:-1,b=a>=0&&couples?rowOf(pop,R.spouse[a]):-1,i=mint(pop,P,P,l,0,0,NONE,0,w);
        R.born[i]=w;
        if(a>=0){R.pa[i]=uidOf(R,a);R.kids[a]=Math.min(255,R.kids[a]+1);remember(pop,a,4,uidOf(R,i),w);}
        if(b>=0){R.pb[i]=uidOf(R,b);R.kids[b]=Math.min(255,R.kids[b]+1);remember(pop,b,4,uidOf(R,i),w);}
        pop.rtotals.births++;
        pop.dec.births.push({id:idOf(pop,i),place:P.id,parents:[a,b].filter(x=>x>=0).map(x=>idOf(pop,x))});
        log(pop,w,'birth',P,`Nasce ${nameOf(pop,i)} (${LIN[l].name})${a<0?'':' da '+nameOf(pop,a)+(b>=0?' e '+nameOf(pop,b):'')} a ${P.id}.`);
      }
    }
  }

  // ——— Migrazioni, famiglie, fondazioni ———
  function kidPicks(pop,P,G,g){ // quanti figli porta una famiglia e di quali fasce (regola aggregata)
    const C0=kidsOf(G,g);
    if(g.parents!==2||!C0||G.c[AA]<40)return []; // nelle comunità piccole partono solo coppie senza figli al seguito
    const u=u01(ar(pop,P,C.FAMILY)),n=Math.min(C0,u<.5?0:u<.85?1:2),out=[],h=G.h.slice(0,g.nK);
    for(let t=0;t<n;t++){ // il secondo figlio è vicino d'età al primo, come fra fratelli
      const j=drawSpan(ar(pop,P,C.FAMILY),h,t?Math.max(0,out[0]-4):0,t?Math.min(g.nK,out[0]+5):g.nK);
      if(j<0)break;
      h[j]--;out.push(j);
    }
    return out;
  }
  function takeRow(pop,P,i){leave(P,pop.R,i);pop.R.wealth[i]=0n;}
  /* Una famiglia parte coi propri figli anche se hanno fasce d'età diverse da quelle decise dalla regola di luogo: perché i margini
     restino esatti, lungo la strada fra le due fasce un bambino per fascia si sposta di una sola fascia (data di nascita corretta di
     Lk settimane: meno di un anno per gli umani). Mai i conosciuti o influenzati, mai un genitore troppo giovane, mai un adulto:
     l'età dei bambini non conosciuti è quindi approssimata, quella adulta resta sempre esatta. */
  function slide(pop,P,l,from,to,skip,w){
    const R=pop.R,g=LIN[l].g,dir=to>from?1:-1,moves=[],used=new Set(skip),at=new Map();
    for(const k of group(P,l,0,0)){const b=bucketOf(l,R.born[k],w);if(b<Math.min(from,to)||b>Math.max(from,to)||R.flags[k]&(KNOWN|SWAYED))continue;let a=at.get(b);if(!a)at.set(b,a=[]);a.push(k);}
    for(let x=from;x!==to;x+=dir){
      let best=-1,bb=0;
      for(const k of at.get(x)||EMPTY){
        if(used.has(k)||best>=0&&before(R,best,k))continue;
        const born=Math.min(w,R.born[k]-dir*g.Lk);
        if([R.pa[k],R.pb[k]].every(u=>{const p=rowOf(pop,u);return p<0||born-R.born[p]>=g.a0;})){best=k;bb=born;}
      }
      if(best<0)return false;
      used.add(best);moves.push([best,bb]);
    }
    for(const [k,born] of moves)R.born[k]=born;
    pop.rtotals.slid+=moves.length;
    return true;
  }
  const minorsOf=(pop,P,l,a,b)=>{const R=pop.R,ua=uidOf(R,a),ub=uidOf(R,b);return group(P,l,0,0).filter(k=>R.pa[k]===ua||R.pb[k]===ua||R.pa[k]===ub||R.pb[k]===ub);};
  // Bambini che partono con una coppia: i propri figli; se la coppia non ne ha altrettanti, orfani o (affido) altri della stessa fascia.
  function kidsFor(pop,P,l,slots,a,b,w){
    const R=pop.R,out=[],bucket=k=>bucketOf(l,R.born[k],w),by=(x,y)=>bucket(x)-bucket(y)||(before(R,x,y)?-1:1);
    const anonAt=slot=>{let n=P.lin.get(l).h[slot];for(const k of group(P,l,0,0))if(bucket(k)===slot)n--;for(const x of out)if(x.row<0&&x.slot===slot)n--;return n;};
    const mine=a>=0?minorsOf(pop,P,l,a,b).sort(by):EMPTY,sorted=slots.slice().sort((x,y)=>x-y);
    if(mine.length===sorted.length){
      const skip=new Set(mine);
      let ok=true;
      mine.forEach((k,t)=>{if(ok&&bucket(k)!==sorted[t]&&!(P.materialized?slide(pop,P,l,sorted[t],bucket(k),skip,w):anonAt(sorted[t])>0))ok=false;else if(ok)out.push({row:k,slot:sorted[t],parted:false});});
      if(ok)return out;
    }
    for(const slot of sorted.slice(out.length)){
      const taken=new Set(out.map(x=>x.row)),recs=group(P,l,0,0).filter(k=>bucket(k)===slot&&!taken.has(k)&&(!mine.includes(k)||mine.length>sorted.length));
      const pool0=recs.length?recs:group(P,l,0,0).filter(k=>bucket(k)===slot&&!taken.has(k)),orphans=pool0.filter(j=>[R.pa[j],R.pb[j]].every(u=>{const p=rowOf(pop,u);return p<0||R.place[p]!==P.ix;}));
      const own=pool0.filter(k=>mine.includes(k));
      let row=-1;
      if(own.length)row=own.sort(by)[0];
      else if(anonAt(slot)<=0&&pool0.length)row=(orphans.length?orphans:pool0).sort(by)[0];
      out.push({row,slot,parted:row>=0&&!own.length&&!orphans.length});
    }
    return out;
  }
  function planSingle(pop,P,l,cls,to,share,plan,w,forced){
    const G=P.lin.get(l),g=LIN[l].g,R=pop.R,recs=group(P,l,1,cls),rec=isRecord(pop,P,recs.length,G.c[cls],C.MIGRATE);
    const slot=drawSpan(ar(pop,P,C.MIGRATE),G.h,g.nK,g.nK+g.nA),job=drawIx(ar(pop,P,C.JOB),P.jobs);
    G.c[cls]--;G.h[slot]--;G.n--;P.alive--;if(job>=0)P.jobs[job]--;
    P.wealth-=share;pop.totals.migrations++;
    let row=-1;
    if(rec){
      [row]=choose(pop,recs,1,i=>{
        let ties=0;
        for(let k=0;k<R.relN[i];k++){const j=rowOf(pop,R.relU[i*6+k]),s=R.relS[i*6+k];if(j>=0&&R.place[j]===P.ix)ties+=s>0?s:s*1.5;}
        return T(R,i,3)*3+N(R,i,2)+N(R,i,1)*2+N(R,i,0)+(R.goalL[i]===5?120:0)+(R.goalL[i]===3?40:0)-clamp(ties,-60,100)-R.proj[i]/4;
      },C.MIGRATE,'migrazione');
      takeRow(pop,P,row);
    }
    plan.push({from:P.ix,to,l,kind:0,cls,adults:[{slot,job,row}],kids:[],purse:share,found:!!forced});
  }
  function planFamily(pop,P,l,to,share,plan,w,forced){
    const G=P.lin.get(l),g=LIN[l].g,R=pop.R,couples=group(P,l,1,1).filter(i=>uidOf(R,i)<R.spouse[i]),total=G.c[AA]/2;
    const slots=kidPicks(pop,P,G,g),rec=isRecord(pop,P,couples.length,total,C.FAMILY);
    let a=-1,b=-1;
    const s1=drawSpan(ar(pop,P,C.FAMILY),G.h,g.nK,g.nK+g.nA);G.h[s1]--;
    const s2=drawSpan(ar(pop,P,C.FAMILY),G.h,g.nK,g.nK+g.nA);G.h[s2]--;
    const j1=drawIx(ar(pop,P,C.JOB),P.jobs);if(j1>=0)P.jobs[j1]--;
    const j2=drawIx(ar(pop,P,C.JOB),P.jobs);if(j2>=0)P.jobs[j2]--;
    let kids=slots.map(slot=>({row:-1,slot,parted:false}));
    if(rec){
      const index=new Map();
      for(const k of group(P,l,0,0))for(const u of [R.pa[k],R.pb[k]])if(u>=0){let x=index.get(u);if(!x)index.set(u,x=[]);x.push(bucketOf(l,R.born[k],w));}
      const want=slots.slice().sort((x,y)=>x-y),kidsAt=i=>(index.get(uidOf(R,i))||index.get(R.spouse[i])||EMPTY).slice().sort((x,y)=>x-y);
      [a]=choose(pop,couples,1,i=>{
        const j=rowOf(pop,R.spouse[i]),own=kidsAt(i);
        let miss=Math.abs(own.length-want.length)*2; // la famiglia parte intera: stessi figli, fasce uguali o vicine
        if(own.length===want.length)for(let k=0;k<own.length;k++){const d=Math.abs(own[k]-want[k]);miss+=d*.02;}
        return T(R,i,3)+T(R,j,3)+(N(R,i,1)+N(R,j,1))*2+N(R,i,2)+N(R,j,2)+(R.goalL[i]===5?60:0)+(R.goalL[j]===5?60:0)-miss*2000;
      },C.FAMILY,'famiglia');
      b=rowOf(pop,R.spouse[a]);
    }
    if(P.list.length&&slots.length)kids=kidsFor(pop,P,l,slots,a,b,w);
    for(const q of slots)G.h[q]--;
    G.c[AA]-=2;const n=2+slots.length;G.n-=n;P.alive-=n;
    const purse=share*BigInt(n);
    P.wealth-=purse;pop.totals.migrations+=n;pop.totals.families++;
    if(a>=0){
      const ua=uidOf(R,a),ub=uidOf(R,b);
      takeRow(pop,P,a);takeRow(pop,P,b);
      for(const k of kids)if(k.row>=0)takeRow(pop,P,k.row);
      for(const k of group(P,l,0,0))if(R.pa[k]===ua||R.pb[k]===ua||R.pa[k]===ub||R.pb[k]===ub)pop.rtotals.left++;
    }else for(const k of kids)if(k.row>=0)takeRow(pop,P,k.row);
    for(const k of kids)if(k.parted)pop.rtotals.parted++;
    plan.push({from:P.ix,to,l,kind:1,cls:1,adults:[{slot:s1,job:j1,row:a},{slot:s2,job:j2,row:b}],kids,purse,found:!!forced});
  }
  function* phaseMigration(pop,P,s,w,n0,plan){
    const dests=P.links.filter(j=>HABITABLE.has(pop.places[j].kind)&&n0[j]>0&&pop.places[j].capacity>0);
    if(!dests.length||!P.alive)return;
    const att=/*DESTINAZIONI*/dests.map(j=>{const D=pop.places[j];return Math.max(40,attract(D.sig)-1000+Math.round(600*clamp(1.1-n0[j]/D.capacity,-1.5,1)));});
    const own=attract(s),best=Math.max(...dests.map(j=>attract(pop.places[j].sig)));
    const rate=600+s.foodScarcity*4+s.crisis*2000+s.war*6000+s.disaster*3000+Math.max(0,s.unemployment-100)*3+Math.max(0,best-own)*1.5+(P.alive>P.capacity*1.1?3000:0);
    const share=P.wealth/BigInt(P.alive);
    for(const l of P.order.slice()){
      const G=P.lin.get(l),id=LIN[l].id,n=G.c[A0]+G.c[AW];
      const K=quantum(pop,P,'migrate:'+id,C.MIGRATE,n*rate,n);
      for(let t=0;t<K;t++){
        const cls=drawIx(ar(pop,P,C.MIGRATE),[G.c[A0],0,0,G.c[AW]]);
        if(cls<0)break;
        planSingle(pop,P,l,cls,dests[drawIx(ar(pop,P,C.DEST),att)],share,plan,w,false);
        if(P.list.length&&t%4===3)yield;
      }
      const F=quantum(pop,P,'family:'+id,C.FAMILY,G.c[AA]/2*rate*.5,G.c[AA]>>1);
      for(let t=0;t<F;t++){planFamily(pop,P,l,dests[drawIx(ar(pop,P,C.DEST),att)],share,plan,w,false);if(P.list.length)yield;}
    }
  }
  // Nuovi insediamenti: un luogo adatto, disabitato o quasi, senza crisi in corso, viene fondato da un gruppo della stessa stirpe
  // (famiglie e singoli) partito da un luogo collegato abbastanza popoloso. Regola del solo strato aggregato.
  function phaseFounding(pop,D,w,n0,plan){
    if(!HABITABLE.has(D.kind)||D.capacity<20||n0[D.ix]>=12)return;
    const s=D.sig;
    if(s.war||s.disaster||s.crisis||s.foodScarcity>600)return;
    const src=D.links.filter(j=>HABITABLE.has(pop.places[j].kind)&&pop.places[j].alive>=80);
    if(!src.length)return;
    const press=src.map(j=>{const P=pop.places[j];return 100+Math.round(900*clamp(P.alive/Math.max(1,P.capacity)-.6,0,1));});
    if(!quantum(pop,D,'found',C.FOUND,Math.max(...press)*40,1))return;
    const P=pop.places[src[drawIx(ar(pop,D,C.FOUND),press)]],fit=P.order.filter(l=>{const G=P.lin.get(l);return G.c[A0]>=8&&(LIN[l].g.parents===2?G.c[AA]>=12:adultsOf(G)>=20);});
    if(!fit.length)return;
    const l=fit[drawIx(ar(pop,D,C.FOUND),fit.map(q=>adultsOf(P.lin.get(q))))],share=P.wealth/BigInt(P.alive),g=LIN[l].g;
    const fam=Math.min(g.parents===2?5:3,P.lin.get(l).c[AA]>>2),from=plan.length;
    for(let t=0;t<fam;t++)planFamily(pop,P,l,D.ix,share,plan,w,true);
    for(let t=0;t<6&&P.lin.get(l).c[A0]>2;t++)planSingle(pop,P,l,A0,D.ix,share,plan,w,true);
    const G=linIn(D,l);G.niche=Math.max(G.niche,Math.ceil(D.capacity*.7));
    let n=0;for(const m of plan.slice(from))n+=m.adults.length+m.kids.length;
    pop.totals.foundings++;
    pop.dec.foundings.push({place:D.id,from:P.id,people:n,lineage:LIN[l].id});
    log(pop,w,'founding',D,`${n} ${LIN[l].name==='umano'?'coloni':'coloni ('+LIN[l].name+')'} partono da ${P.id} ${n0[D.ix]?'e ripopolano':'e fondano un insediamento a'} ${D.id}.`);
  }
  function arrive(pop,m,w,tag){
    const R=pop.R,D=pop.places[m.to],F=pop.places[m.from],G=linIn(D,m.l),g=LIN[m.l].g,n=m.adults.length+m.kids.length;
    for(const a of m.adults){G.h[a.slot]++;D.jobs[a.job<0?NONE:a.job]++;}
    for(const k of m.kids)G.h[k.slot]++;
    if(m.kind)G.c[AA]+=2;else G.c[m.cls]++;
    G.n+=n;D.alive+=n;D.wealth+=m.purse;pop.totals.arrivals+=n;
    const rows=[],each=m.purse/BigInt(m.adults.length);
    for(const a of m.adults){
      let i=a.row;
      if(i>=0){R.place[i]=D.ix;R.wealth[i]=each>MAXW?MAXW:each;enter(D,R,i);}
      else if(D.materialized){i=mint(pop,D,F,m.l,1,m.kind?1:m.cls,a.job<0?NONE:a.job,a.slot,w);setWealth(pop,i,each);if(!m.kind&&m.cls===3)R.since[i]=w;}
      if(i<0)continue;
      rows.push(i);R.moves[i]=Math.min(3,R.moves[i]+1);remember(pop,i,7,D.ix,w);
      pop.dec.migrations.push({id:idOf(pop,i),from:F.id,to:D.id,family:m.kind?tag:null,parted:false});
    }
    if(m.kind&&rows.length===2&&R.spouse[rows[0]]!==uidOf(R,rows[1])){R.spouse[rows[0]]=uidOf(R,rows[1]);R.spouse[rows[1]]=uidOf(R,rows[0]);tie(pop,rows[0],rows[1],40);}
    for(const k of m.kids){
      let i=k.row;
      if(i>=0){
        R.place[i]=D.ix;enter(D,R,i);
        // All'arrivo il margine è quello della regola: si corregge con gli altri bambini del luogo (o, in mancanza, la sua data di nascita).
        const b=bucketOf(m.l,R.born[i],w);
        let recs=0;for(const q of group(D,m.l,0,0))if(bucketOf(m.l,R.born[q],w)===b)recs++;
        if(b!==k.slot&&(D.materialized||recs>G.h[b])&&!slide(pop,D,m.l,b,k.slot,[i],w)&&!slide(pop,D,m.l,b,k.slot,[],w)){R.born[i]=bornFor(m.l,k.slot,R.hid[i],w);pop.rtotals.slid++;}
      }else if(D.materialized){
        i=mint(pop,D,F,m.l,0,0,NONE,k.slot,w);
        if(rows.length===2&&rows.every(p=>R.born[i]-R.born[p]>=g.a0)){R.pa[i]=uidOf(R,rows[0]);R.pb[i]=uidOf(R,rows[1]);for(const p of rows)R.kids[p]=Math.min(255,R.kids[p]+1);}
      }
      if(i<0)continue;
      R.moves[i]=Math.min(3,R.moves[i]+1);
      pop.dec.migrations.push({id:idOf(pop,i),from:F.id,to:D.id,family:tag,parted:k.parted});
    }
    if(rows.length)log(pop,w,'migration',F,m.kind?`La famiglia di ${nameOf(pop,rows[0])} lascia ${F.id} per ${D.id}.`:`${nameOf(pop,rows[0])} lascia ${F.id} per ${D.id}.`);
  }

  // ——— Vita dei record ———
  // Salari, spese e tasse della settimana arrivano ai record all'inizio del passo (in proporzione; lo strato aggregato li ha già contati).
  function* distribute(pop,P){
    const due=P.due;
    P.due={w:new Map(),out:0n};
    if(!P.list.length||!due.w.size&&due.out===0n)return;
    const R=pop.R,per=new Map();
    let sum=0n;
    for(const [p,amt] of due.w)if(P.jobs[p]>0)per.set(p,amt/BigInt(P.jobs[p]));
    for(const i of P.list)if(R.stage[i]===1&&per.has(R.prof[i]))sum+=per.get(R.prof[i]);
    yield;
    let base=P.wealth+due.out;
    if(P.recW+sum>base)base=P.recW+sum;
    const W=P.wealth,cut=due.out>0n||P.recW+sum>W;
    for(let t=0;t<P.list.length;t++){
      const i=P.list[t];
      let v=R.wealth[i];
      if(R.stage[i]===1){const add=per.get(R.prof[i]);if(add)v+=add;}
      if(cut)v=v*W/base;
      if(v!==R.wealth[i])setWealth(pop,i,v);
      if(t%96===95)yield;
    }
  }
  const goalNow=(R,i)=>{ // bisogno più urgente (puro: si ricava, non si salva)
    const adult=R.stage[i]===1,nd=[N(R,i,0),N(R,i,1),R.wounds[i]>=30?80:0,adult&&R.prof[i]===NONE?75:0,N(R,i,2),N(R,i,3)];
    let gs=0,gv=59;
    for(let k=0;k<nd.length;k++)if(nd[k]>gv){gv=nd[k];gs=k+1;}
    return R.stage[i]>0?gs:0;
  };
  // Bisogni: funzione pura dello stato a fine settimana (al caricamento si ricalcolano identici).
  function needsOf(pop,P,i){
    const R=pop.R,s=P.sig,avg=P.avg+1n,rp=R.wealth[i]>avg*100n?10000:Number(R.wealth[i]*100n/avg);
    let nrel=0;
    for(let k=0;k<R.relN[i];k++)if(R.relS[i*6+k]>0&&pop.idMap.has(R.relU[i*6+k]))nrel++;
    const wed=R.cls[i]===1||R.cls[i]===2,o=i*4;
    R.needs[o]=clamp(Math.floor(s.foodScarcity/8)-(rp>=200?20:0)+10,0,100);
    R.needs[o+1]=clamp(s.war*60+s.disaster*50+s.crisis*20+(R.wounds[i]>>1),0,100);
    R.needs[o+2]=clamp(100-(rp>>1),0,100);
    R.needs[o+3]=clamp(90-14*nrel-(wed?40:0)-5*R.kids[i],0,100);
  }
  function achieved(R,i){
    const g=R.goalL[i],wed=R.cls[i]===1||R.cls[i]===2;
    if(g===1)return wed&&R.kids[i]>0;
    if(g===2)return R.xp[i]>=150&&R.prof[i]!==NONE&&R.prof[i]!==ADV;
    if(g===3)return R.wealth[i]>=50000n;
    if(g===4)return R.xp[i]>=120&&R.prof[i]===ADV;
    return g===5&&R.moves[i]>=2;
  }
  // Azione personale della settimana: non cambia nessun margine, ma legami, rivalità, aiuti e progetti contano nelle decisioni.
  function act(pop,P,i,w,X){
    const R=pop.R,h=hash(pop.seed,R.hid[i],C.SOCIAL,w,0),soc=T(R,i,2),r=(h>>>8)%100,o=i*6,here=u=>{const j=rowOf(pop,u);return j>=0&&R.place[j]===P.ix?j:-1;};
    const did=(kind,j)=>{if(pop.dec.actions.length<20000)pop.dec.actions.push({kind,a:idOf(pop,i),b:j>=0?idOf(pop,j):null});};
    if(h%100>=20+soc*.5)return;
    if(r<35){
      for(let k=0;k<R.relN[i];k++)if(R.relS[o+k]<0){
        const j=here(R.relU[o+k]);
        if(j<0)continue;
        if(soc+(h>>>16)%60>=70){const end=R.relS[o+k]>=-8;tie(pop,i,j,end?10:6);if(end){remember(pop,i,15,uidOf(R,j),w);remember(pop,j,15,uidOf(R,i),w);}did('riconciliazione',j);}
        else{tie(pop,i,j,-3);did('rivalità',j);}
        return;
      }
    }
    if(R.stage[i]===1&&R.cls[i]===0&&r<60){
      const S=X.singles.get(R.lin[i])||EMPTY;
      let j=-1,bs=0;
      if((h>>>16)%3)for(let k=0;k<R.relN[i];k++)if(R.relS[o+k]>bs){const q=here(R.relU[o+k]);if(q>=0&&R.stage[q]===1&&R.cls[q]===0&&R.lin[q]===R.lin[i]&&!kin(R,i,q)){j=q;bs=R.relS[o+k];}}
      if(j<0&&S.length>1)j=S[(h>>>12)%S.length];
      if(j>=0&&j!==i&&!kin(R,i,j)&&bond(pop,i,j)>=0&&bond(pop,j,i)>=0){tie(pop,i,j,4+(h>>>20)%5);did('corteggiamento',j);return;}
    }
    if(R.stage[i]===1&&T(R,i,1)>=60&&r>=60&&r<72&&R.prof[i]!==NONE){
      const S=X.jobs[R.prof[i]],j=S[(h>>>12)%S.length];
      if(j!==i&&R.spouse[i]!==uidOf(R,j)&&bond(pop,i,j)<=10){
        const b0=bond(pop,i,j);tie(pop,i,j,-6-(T(R,i,1)>80?4:0));
        if(b0>-10&&bond(pop,i,j)<=-10)remember(pop,i,14,uidOf(R,j),w);
        did('rivalità',j);return;
      }
    }
    if(r>=72&&r<88&&R.wealth[i]>P.avg*2n){
      let j=-1;
      for(let k=0;k<R.relN[i];k++)if(R.relS[o+k]>0){const q=here(R.relU[o+k]);if(q>=0&&R.wealth[q]*2n<P.avg&&(j<0||R.wealth[q]<R.wealth[j]))j=q;}
      if(j>=0){const v=R.wealth[i]/20n;setWealth(pop,i,R.wealth[i]-v);give(pop,j,v);tie(pop,i,j,8);remember(pop,j,18,uidOf(R,i),w);did('aiuto',j);return;}
    }
    const j=X.grown[(h>>>12)%X.grown.length];
    if(j===i||bond(pop,i,j)<0)return;
    tie(pop,i,j,2+(h>>>20)%4+(R.prof[i]===R.prof[j]?2:0));did('amicizia',j);
  }
  function* life(pop,P,w){
    const R=pop.R;
    P.avg=P.alive?P.wealth/BigInt(P.alive):0n;
    if(!P.list.length)return;
    if(P.recW>P.wealth){ // borse e viveri oltre la cassa: si ripartiscono in proporzione
      const W=P.wealth,base=P.recW;
      for(let t=0;t<P.list.length;t++){const i=P.list[t];setWealth(pop,i,R.wealth[i]*W/base);if(t%96===95)yield;}
    }
    const X={grown:[],singles:new Map(),jobs:Array.from({length:NP},()=>[])};
    for(const i of P.list){
      if(!R.stage[i])continue;
      X.grown.push(i);
      if(R.stage[i]!==1)continue;
      X.jobs[R.prof[i]].push(i);
      if(R.cls[i]===0){let a=X.singles.get(R.lin[i]);if(!a)X.singles.set(R.lin[i],a=[]);a.push(i);}
    }
    yield;
    // Cassa comune (solo senza anonimi): oltre il 4 % della ricchezza si ridistribuisce agli adulti e agli anziani.
    let each=0n;
    if(P.materialized&&X.grown.length){const keep=P.wealth/50n,pool=P.wealth-P.recW;if(pool>keep*2n)each=(pool-keep)/BigInt(X.grown.length);}
    for(let t=0;t<P.list.length;t++){
      const i=P.list[t];
      if(R.wounds[i])R.wounds[i]=Math.max(0,R.wounds[i]-3);
      if(R.stage[i]){
        if(each>0n)give(pop,i,each);
        if(R.stage[i]===1&&R.prof[i]!==NONE&&R.prof[i]!==ADV)R.xp[i]=Math.min(4e9,R.xp[i]+1);
        if(R.goalL[i]&&achieved(R,i)){
          const old=R.goalL[i];
          remember(pop,i,11,old,w);
          log(pop,w,'goal',P,`${nameOf(pop,i)} realizza il proprio sogno: ${GOAL_TEXT[GOALS_L[old]]}.`);
          R.goalL[i]=pickGoal(pop,i,w,old);
        }
        if(R.stage[i]===1){ // progetto personale: avanza con l'operosità, dà esperienza e trattiene nel luogo e nel mestiere
          R.proj[i]+=1+(T(R,i,4)>60?1:0);
          if(R.proj[i]>=100){R.proj[i]=0;R.xp[i]=Math.min(4e9,R.xp[i]+30);remember(pop,i,13,R.goalL[i],w);pop.dec.actions.push({kind:'progetto',a:idOf(pop,i),b:null});}
        }
        if(!(R.flags[i]&NOTABLE)&&(R.xp[i]>=600||R.wealth[i]>=5000000n))R.flags[i]|=NOTABLE;
        if(X.grown.length>1)act(pop,P,i,w,X);
      }
      if(t%32===31)yield;
    }
    for(let t=0;t<P.list.length;t++){
      const i=P.list[t];
      if(!(R.flags[i]&(KNOWN|SWAYED)))for(let k=R.relN[i]-1;k>=0;k--)if(!pop.idMap.has(R.relU[i*6+k]))dropRel(R,i,k);
      needsOf(pop,P,i);
      if(t%96===95)yield;
    }
  }

  // ——— La settimana, come sequenza di parti interrompibili ———
  function* week(pop,w,env){
    pop.w=w;pop.dec=emptyDecisions(w);
    for(const P of pop.places){P.sig=signalsOf(env,P.id);P.aq=0;P.rq=0;if(P.ix%64===63)yield;}
    yield;
    for(const P of pop.places){if(P.list.length||P.due.w.size||P.due.out)yield* distribute(pop,P);}
    for(const P of pop.places){
      if(!P.alive)continue;
      const s=P.sig;
      yield* phaseShift(pop,P,w);
      yield* phaseMarriage(pop,P,s,w);
      phaseMourning(pop,P,w);
      yield;
      yield* phaseDeath(pop,P,s,w);
      yield* phaseExpeditions(pop,P,s,w);
      phaseCareers(pop,P,s);
      yield* phaseBirths(pop,P,s,w);
      yield;
    }
    // Migrazioni in due fasi: prima le decisioni di tutti i luoghi, poi gli arrivi.
    const plan=[],n0=pop.places.map(P=>P.alive);
    for(const P of pop.places){if(!P.alive)continue;yield* phaseMigration(pop,P,P.sig,w,n0,plan);yield;}
    for(const P of pop.places){if(n0[P.ix]>=12)continue;phaseFounding(pop,P,w,n0,plan);yield;}
    for(let t=0;t<plan.length;t++){arrive(pop,plan[t],w,t+1);if(t%8===7)yield;}
    for(const P of pop.places){
      for(const l of P.order.slice())if(P.lin.get(l).n===0)dropLin(P,l);
      if(P.list.length)yield* reconcile(pop,P,w);
    }
    for(const P of pop.places){yield* life(pop,P,w);if(P.list.length||P.ix%16===15)yield;}
    pop.week=w+1;
  }
  const open=(pop,w,env)=>{pop.gen=week(pop,w,env);};
  // Esegue una parte; restituisce true quando la settimana è finita.
  function advance(pop){
    let r;
    try{r=pop.gen.next();}catch(e){pop.gen=null;throw e;}
    if(r.done)pop.gen=null;
    return r.done;
  }
  const partial=pop=>!!(pop&&pop.gen);
  function settle(pop){if(!partial(pop))return 0;while(!advance(pop));return 1;}
  function step(pop,weekTo,env){
    if(!pop||!Number.isInteger(weekTo)||weekTo<pop.week)return 0;
    let done=settle(pop);
    // Le settimane arretrate non ricevono i segnali di oggi: neutre, a meno che env sia una funzione della settimana.
    for(let w=pop.week;w<=weekTo;w++){open(pop,w,typeof env==='function'?env(w):w===weekTo?env:null);settle(pop);done++;}
    return done;
  }
  // Specifica per WorldSim: livello 3, passo settimanale, intervallo divisibile (info.due) e risolto sempre settimana per settimana.
  // maxChunks come l'economia viva: mai compresso, altrimenti in un'assenza lunga i due moduli non si alternerebbero ogni settimana.
  function system(get,envOf){
    return {level:3,step:WEEK,maxChunks:1000000,resolve(s,from,to,info){
      const pop=get(s);
      if(!pop)return;
      const a=Math.floor(from/WEEK),b=Math.floor(to/WEEK),due=info&&typeof info.due==='function'?info.due:null;
      for(;;){
        if(!partial(pop)){
          if(pop.week>=b)return;
          const w=pop.week;
          open(pop,w,w>=a&&typeof envOf==='function'?envOf(s,w):null);
        }
        while(!advance(pop))if(due&&due())return false;
        if(due&&due()&&pop.week<b)return false;
      }
    }};
  }

  // ——— Materializzazione: dai margini ai record (idempotente, definitiva) ———
  function materialize(pop,placeId){
    const ix=placeIx(pop,placeId);
    if(ix<0)return 0;
    settle(pop);
    const P=pop.places[ix],R=pop.R,cur=pop.week-1;
    if(P.materialized)return 0;
    P.materialized=true;
    const free=Array.from(P.jobs),jobs=[],fresh=[];
    for(const i of P.list)if(R.stage[i]===1)free[R.prof[i]]--;
    free.forEach((n,p)=>{for(let t=0;t<n;t++)jobs.push(p);});
    const shuffle=(a,salt)=>a.map((x,t)=>[x,hash(pop.seed,P.h,C.MINT,salt,t),t]).sort((x,y)=>x[1]-y[1]||x[2]-y[2]).map(x=>x[0]);
    const work=shuffle(jobs,7);
    let at=0;
    pop.bulk=true;
    const make=(l,stage,cls,slot)=>{const i=mint(pop,P,P,l,stage,cls,stage===1?work[at++]:NONE,slot,cur);fresh.push(i);return i;};
    for(const l of P.order){
      const G=P.lin.get(l),g=LIN[l].g,rest=(stage,q)=>G.c[stage===1?q:4+q]-group(P,l,stage,q).length,kidN=new Array(g.nK).fill(0);
      for(const i of group(P,l,0,0))kidN[bucketOf(l,R.born[i],cur)]++;
      // Età degli anonimi: un campione dell'istogramma; celibi fra i più giovani, vedovi e sposati con anziani fra i più vecchi.
      const ages=(from,to,n,salt)=>{
        const a=[];for(let j=from;j<to;j++)for(let t=0;t<G.h[j];t++)a.push(j);
        return shuffle(a,salt).slice(0,n).map((s,t)=>[s,s*4+hash(pop.seed,P.h,C.MINT,salt+1,t)%14]).sort((x,y)=>x[1]-y[1]||x[0]-y[0]).map(x=>x[0]);
      };
      const n=[0,1,2,3].map(q=>rest(1,q)),e=[0,1,2,3].map(q=>rest(2,q)),A=ages(g.nK,g.nK+g.nA,n[0]+n[1]+n[2]+n[3],31+l),E=ages(g.nK+g.nA,g.n,e[0]+e[1]+e[2]+e[3],61+l);
      const take=(list,k)=>list.splice(0,k),couple=(a,b)=>{R.spouse[a]=uidOf(R,b);R.spouse[b]=uidOf(R,a);addRel(pop,a,b,40);addRel(pop,b,a,40);};
      for(const s of take(A,n[0]))make(l,1,0,s);
      const couples=[],wed=take(A,n[1]);
      for(let t=0;t+1<wed.length;t+=2){const a=make(l,1,1,wed[t]),b=make(l,1,1,wed[t+1]);couple(a,b);couples.push([a,b]);}
      const ae=take(A,n[2]),ea=take(E,e[1]);
      ae.forEach((s,t)=>{const a=make(l,1,2,s),b=make(l,2,1,ea[t]);couple(a,b);couples.push([a,b]);});
      for(const s of A){const i=make(l,1,3,s);R.since[i]=cur;}
      const old=take(E,e[2]);
      for(let t=0;t+1<old.length;t+=2)couple(make(l,2,2,old[t]),make(l,2,2,old[t+1]));
      take(E,e[3]).forEach(s=>make(l,2,3,s));
      for(const s of E)make(l,2,0,s);
      // Bambini: genitori abbastanza più vecchi e ancora in età, con pochi figli; altrimenti nessun genitore noto.
      const units=g.parents===2?couples:g.parents===1?fresh.filter(i=>R.lin[i]===l&&R.stage[i]===1).map(i=>[i]):[];
      for(let j=0;j<g.nK;j++)for(let t=kidN[j];t<G.h[j];t++){
        const i=make(l,0,0,j),ok=units.filter(u=>u.every(p=>{const d=R.born[i]-R.born[p];return d>=g.a0&&d<=g.e0;})&&R.kids[u[0]]<6);
        if(!ok.length)continue;
        let best=null;
        for(let q=0;q<3;q++){const u=ok[hash(pop.seed,R.hid[i],C.PARENT,q,0)%ok.length];if(!best||R.kids[u[0]]<R.kids[best[0]])best=u;}
        R.pa[i]=uidOf(R,best[0]);if(best.length>1)R.pb[i]=uidOf(R,best[1]);
        for(const p of best)R.kids[p]++;
      }
    }
    pop.bulk=false;
    if(!fresh.length)return 0;
    for(const i of fresh)joinGroup(P,R,i);
    P.list=P.list.concat(fresh).sort((a,b)=>before(R,a,b)?-1:1);
    // Conoscenze iniziali (solo fra i nuovi), qualche corteggiamento, notabili.
    const grown=fresh.filter(i=>R.stage[i]).sort((a,b)=>before(R,a,b)?-1:1),single=new Map();
    for(const i of grown)if(R.stage[i]===1&&R.cls[i]===0){let a=single.get(R.lin[i]);if(!a)single.set(R.lin[i],a=[]);a.push(i);}
    for(const i of grown){
      const h=hash(pop.seed,R.hid[i],C.SOCIAL,0,1),j=grown[h%grown.length];
      if(j!==i)tie(pop,i,j,3+(h>>>16)%12);
      const sl=R.stage[i]===1&&R.cls[i]===0?single.get(R.lin[i]):null;
      if(sl&&sl.length>1){const h2=hash(pop.seed,R.hid[i],C.SOCIAL,1,0),o=sl[h2%sl.length];if(o!==i&&!kin(R,i,o))tie(pop,i,o,6+(h2>>>16)%20);}
      if(hash(pop.seed,R.hid[i],C.MINT,1,0)%100<2)R.flags[i]|=NOTABLE;
    }
    if(grown.length&&!grown.some(i=>R.flags[i]&NOTABLE))R.flags[grown[grown.length-1]]|=NOTABLE;
    // La cassa del luogo (senza i salari in sospeso) si divide fra adulti e anziani secondo l'operosità; il resto resta cassa.
    let pool=P.wealth-P.recW;for(const v of P.due.w.values())pool-=v;
    const weight=i=>BigInt(R.stage[i]===2?150:100+T(R,i,1)+T(R,i,4));
    let total=0n;for(const i of grown)total+=weight(i);
    if(total>0n&&pool>0n)for(const i of grown)give(pop,i,pool*weight(i)/total);
    for(const i of fresh)needsOf(pop,P,i);
    return fresh.length;
  }

  // ——— Interfaccia con l'economia ———
  function summary(pop,placeId){
    const out={alive:0,children:0,adults:0,elders:0,households:0,workers:{},unemployed:0,adventurers:0,wealth:'0'},ix=placeIx(pop,placeId);
    if(ix<0)return out;
    const P=pop.places[ix];
    for(const [l,G] of P.lin){
      const c=G.c;
      out.children+=kidsOf(G,LIN[l].g);out.adults+=adultsOf(G);out.elders+=eldersOf(G);
      out.households+=c[A0]+c[AW]+c[E0]+c[EW]+(c[AA]+c[EE])/2+c[AE];
    }
    out.alive=out.children+out.adults+out.elders;
    out.unemployed=P.jobs[NONE];out.adventurers=P.jobs[ADV];
    for(let p=1;p<ADV;p++)if(P.jobs[p])out.workers[PROFS[p]]=P.jobs[p];
    out.wealth=String(P.wealth);
    return out;
  }
  // Salari, spesa e tasse: esatti e immediati nello strato aggregato; ai record arrivano all'inizio della settimana seguente.
  function transfer(pop,placeId,flows){
    const got={wages:0n,spend:0n,tax:0n},ix=placeIx(pop,placeId);
    if(ix<0||!object(flows))return got;
    settle(pop);
    const P=pop.places[ix];
    if(object(flows.wages))for(let p=1;p<NP;p++){
      if(!own(flows.wages,PROFS[p])||!P.jobs[p])continue;
      const amt=amount(flows.wages[PROFS[p]]);
      if(amt<=0n)continue;
      P.wealth+=amt;got.wages+=amt;
      if(P.list.length)P.due.w.set(p,(P.due.w.get(p)||0n)+amt);
    }
    for(const k of ['spend','tax']){const v=amount(flows[k]),a=v<P.wealth?v:P.wealth;P.wealth-=a;got[k]=a;if(P.list.length)P.due.out+=a;}
    pop.totals.wages+=got.wages;pop.totals.spend+=got.spend;pop.totals.tax+=got.tax;
    return got;
  }

  // ——— Viste ———
  function view(pop,i,full){
    const R=pop.R,w=pop.week,wed=R.cls[i]===1||R.cls[i]===2,sp=R.spouse[i];
    const v={id:idOf(pop,i),name:nameOf(pop,i),place:pop.places[R.place[i]].id,origin:pop.places[R.origin[i]].id,lineage:LIN[R.lin[i]].id,
      stage:STAGES[R.stage[i]],ageYears:Math.floor((w-R.born[i])/YW*10)/10,profession:PROFS[R.prof[i]],professionName:PROF_NAMES[R.prof[i]],
      married:R.stage[i]===0||R.cls[i]===0?'single':wed?'married':'widowed',spouse:wed?idOfUid(pop,sp):null,formerSpouse:!wed&&sp>=0?idOfUid(pop,sp):null,
      parents:[R.pa[i],R.pb[i]].filter(x=>x>=0).map(x=>idOfUid(pop,x)),kids:R.kids[i],
      traits:Object.fromEntries(TRAITS.map((t,k)=>[t,T(R,i,k)])),needs:Object.fromEntries(NEEDS.map((t,k)=>[t,N(R,i,k)])),
      goals:{short:GOALS_S[goalNow(R,i)],long:GOALS_L[R.goalL[i]]||null},project:R.proj[i],wealth:String(R.wealth[i]),xp:R.xp[i],wounds:R.wounds[i],
      notable:!!(R.flags[i]&NOTABLE),known:!!(R.flags[i]&KNOWN),influenced:!!(R.flags[i]&SWAYED),alive:true,died:null,cause:null};
    if(full){
      v.memories=[];for(let k=0;k<R.memN[i];k++)v.memories.push({week:R.memW[i*8+k],kind:R.memK[i*8+k],text:memoryText(pop,R.memK[i*8+k],R.memA[i*8+k])});
      v.relations=[];for(let k=0;k<R.relN[i];k++){const u=R.relU[i*6+k];v.relations.push({id:idOfUid(pop,u),name:nameOfUid(pop,u),strength:R.relS[i*6+k],alive:pop.idMap.has(u)});}
      v.children=[];const u=uidOf(R,i);
      if(R.kids[i])for(const j of pop.idMap.values())if(R.pa[j]===u||R.pb[j]===u)v.children.push(idOf(pop,j));
      v.children.sort();
    }
    return v;
  }
  function memoryText(pop,kind,a){
    const who=nameOfUid(pop,a),where=a>=0&&a<pop.places.length?pop.places[a].id:'un altro luogo';
    switch(kind){
      case 3:return 'Sposa '+who+'.';
      case 4:return 'Nasce '+who+'.';
      case 5:return 'Perde '+who+'.';
      case 6:return a===NONE?'Resta senza lavoro.':'Diventa '+(PROF_NAMES[a]||'altro')+'.';
      case 7:return 'Si trasferisce: '+where+'.';
      case 8:return ['Spedizione fatale.','Torna ferito da una spedizione.','Spedizione a mani vuote.','Spedizione riuscita.'][a]||'Spedizione.';
      case 10:return 'Eredita da '+who+'.';
      case 11:return 'Realizza il proprio sogno: '+(GOAL_TEXT[GOALS_L[a]]||'vivere bene')+'.';
      case 12:return 'Lascia il lavoro per l’età.';
      case 13:return 'Porta a termine un progetto personale ('+(GOAL_TEXT[GOALS_L[a]]||'vivere bene')+').';
      case 14:return 'Entra in rivalità con '+who+'.';
      case 15:return 'Si riconcilia con '+who+'.';
      case 16:return 'Scopre di essere stato adottato.';
      case 17:return 'Finisce il lutto per '+who+'.';
      case 18:return 'Riceve aiuto da '+who+'.';
      default:return 'Un ricordo lontano.';
    }
  }
  function residents(pop,placeId){const ix=placeIx(pop,placeId);return ix<0?[]:pop.places[ix].list.map(i=>view(pop,i,false));}
  function person(pop,id){
    const u=uidFrom(pop,id);
    if(u<0)return null;
    const i=rowOf(pop,u);
    if(i>=0)return view(pop,i,true);
    const t=pop.tombs.get(u);
    if(!t)return null;
    return {id,name:nameOfUid(pop,u),lineage:LIN[t.l].id,alive:false,born:t.b,died:t.d,ageYears:Math.floor((t.d-t.b)/YW*10)/10,cause:CAUSES[t.c],
      profession:PROFS[t.p],professionName:PROF_NAMES[t.p],formerSpouse:t.s>=0?idOfUid(pop,t.s):null,spouse:null,parents:[],kids:t.k,xp:0,memories:[],relations:[]};
  }
  // Margini del luogo: stirpe × stadio × stato civile (col tipo di coniuge), mestieri, età. Sono lo stato sufficiente delle regole.
  function cells(pop,placeId){
    const ix=placeIx(pop,placeId),out={};
    if(ix<0)return out;
    const P=pop.places[ix],names=['adulto/single','adulto/married-adulto','adulto/married-anziano','adulto/widowed','anziano/single','anziano/married-adulto','anziano/married-anziano','anziano/widowed'];
    for(const l of P.order){
      const G=P.lin.get(l),id=LIN[l].id,k=kidsOf(G,LIN[l].g);
      if(k)out[id+'/bambini']=k;
      names.forEach((n,q)=>{if(G.c[q])out[id+'/'+n]=G.c[q];});
    }
    P.jobs.forEach((n,p)=>{if(n)out['mestiere/'+PROFS[p]]=n;});
    for(const l of P.order)P.lin.get(l).h.forEach((n,j)=>{if(n)out['eta/'+LIN[l].id+'/'+j]=n;});
    return out;
  }
  const events=pop=>pop.log.map(e=>({...e}));
  const decisions=pop=>JSON.parse(JSON.stringify(pop.dec));
  function flag(pop,id,f){
    const i=rowOf(pop,uidFrom(pop,id));
    if(i<0)return -1;
    settle(pop);
    const j=rowOf(pop,uidFrom(pop,id));
    if(j>=0){pop.R.flags[j]|=f;pop.flagged.add(uidOf(pop.R,j));}
    return j;
  }
  // Conosciuto dal giocatore: più memoria e legami, e la sua storia (e quella dei suoi) sopravvive alla morte.
  const know=(pop,id)=>flag(pop,id,KNOWN)>=0;
  function influence(pop,id,patch){
    if(!object(patch))return false;
    const i=flag(pop,id,KNOWN|SWAYED),R=pop.R;
    if(i<0)return false;
    if(object(patch.traits))TRAITS.forEach((t,k)=>{const v=patch.traits[t];if(Number.isFinite(v))R.traits[i*5+k]=clamp(Math.round(v),0,100);});
    if(object(patch.needs))NEEDS.forEach((t,k)=>{const v=patch.needs[t];if(Number.isFinite(v))R.needs[i*4+k]=clamp(Math.round(v),0,100);});
    if(object(patch.goals)){const l=GOALS_L.indexOf(patch.goals.long);if(l>0&&R.stage[i]>0)R.goalL[i]=l;}
    return true;
  }
  function stats(pop){
    const R=pop.R,places={},t=pop.totals;
    let anon=0,cellsN=0,alive=0;
    for(const P of pop.places){
      let n=0;for(const G of P.lin.values()){for(const x of G.h)if(x)n++;for(const x of G.c)if(x)n++;}
      const a=P.alive-P.list.length;
      anon+=a;alive+=P.alive;cellsN+=n;
      places[P.id]={anonymous:a,records:P.list.length,materialized:P.materialized,cells:n,capacity:P.capacity};
    }
    let bytes=0;for(const [k] of COLS)bytes+=R[k].byteLength;
    bytes+=pop.idMap.size*64+cellsN*4+pop.places.length*600+pop.log.length*160+pop.tombs.size*120;
    const totals={alive};
    for(const k of TOTALS)totals[k]=t[k];
    for(const k of BIGS)totals[k]=String(t[k]);
    return {week:pop.week,places,totals,records:{total:pop.idMap.size,alive:pop.idMap.size,dead:0,tombs:pop.tombs.size,...pop.rtotals},
      choices:JSON.parse(JSON.stringify(pop.choices)),cohorts:{cells:cellsN,anonymous:anon},memoryBytes:bytes};
  }
  // Verifica interna: margini coerenti e record che li proiettano esattamente (lista di problemi, vuota se tutto torna).
  function audit(pop){
    const R=pop.R,cur=pop.week-1,bad=[];
    let rows=0;
    for(const P of pop.places){
      const say=m=>bad.push(P.id+': '+m);
      let jobs=0,adults=0,alive=0,recW=0n;
      for(const n of P.jobs){jobs+=n;if(n<0)say('mestieri negativi');}
      for(const [l,G] of P.lin){
        const g=LIN[l].g,id=LIN[l].id;
        let a=0,e=0;
        for(let j=0;j<g.n;j++){if(G.h[j]<0)say(id+' età negativa');if(j>=g.nK&&j<g.nK+g.nA)a+=G.h[j];else if(j>=g.nK)e+=G.h[j];}
        for(const x of G.c)if(x<0)say(id+' classe negativa');
        if(a!==adultsOf(G)||e!==eldersOf(G))say(id+' classi ≠ età');
        if(G.c[AA]%2||G.c[EE]%2||G.c[AE]!==G.c[EA])say(id+' coppie spaiate');
        if(G.n!==kidsOf(G,g)+a+e)say(id+' totale');
        adults+=a;alive+=G.n;
        const kid=new Array(g.nK).fill(0),cls=new Array(8).fill(0);
        for(const i of P.list){
          if(R.lin[i]!==l)continue;
          if(R.stage[i]===0){const b=bucketOf(l,R.born[i],cur);if(b<0||b>=g.nK)say('bambino fuori fascia '+idOf(pop,i));else kid[b]++;}
          else cls[(R.stage[i]-1)*4+R.cls[i]]++;
        }
        kid.forEach((n,j)=>{if(P.materialized?n!==G.h[j]:n>G.h[j])say(`${id} bambini ${j}: ${n}/${G.h[j]}`);});
        cls.forEach((n,q)=>{if(P.materialized?n!==G.c[q]:n>G.c[q])say(`${id} classe ${q}: ${n}/${G.c[q]}`);});
      }
      if(jobs!==adults)say(`mestieri ${jobs} ≠ adulti ${adults}`);
      if(alive!==P.alive)say('vivi');
      const hist=new Array(NP).fill(0);
      P.list.forEach((i,t)=>{
        rows++;recW+=R.wealth[i];
        if(R.place[i]!==P.ix||!R.alive[i]||pop.idMap.get(uidOf(R,i))!==i)say('record fuori posto');
        if(t&&!before(R,P.list[t-1],i))say('elenco non ordinato');
        if(!P.lin.has(R.lin[i]))say('record di stirpe assente');
        if(R.stage[i]===1)hist[R.prof[i]]++;else if(R.prof[i])say('mestiere a un non adulto');
        if(R.stage[i]&&(R.cls[i]===1||R.cls[i]===2)){
          const s=rowOf(pop,R.spouse[i]);
          if(s<0||R.place[s]!==P.ix||R.spouse[s]!==uidOf(R,i)||R.stage[s]!==R.cls[i])say('coniuge incoerente '+idOf(pop,i));
        }
      });
      hist.forEach((n,p)=>{if(P.materialized?n!==P.jobs[p]:n>P.jobs[p])say(`mestiere ${PROFS[p]}: ${n}/${P.jobs[p]}`);});
      if(recW!==P.recW)say('somma delle ricchezze');
      if(P.recW>P.wealth+P.due.out)say('record più ricchi del luogo');
      if(P.wealth<0n)say('ricchezza negativa');
    }
    if(rows!==pop.idMap.size)bad.push('record senza luogo');
    return bad.slice(0,20);
  }

  // ——— Salvataggio ———
  const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',B64IX=new Map([...B64].map((ch,k)=>[ch,k]));
  function toText(a){
    const out=[];
    for(let i=0;i<a.length;i+=3){const x=a[i]<<16|(a[i+1]||0)<<8|(a[i+2]||0);out.push(B64[x>>>18]+B64[x>>>12&63]+(i+1<a.length?B64[x>>>6&63]:'')+(i+2<a.length?B64[x&63]:''));}
    return out.join('');
  }
  function fromText(t){
    if(typeof t!=='string'||t.length%4===1)throw new Error('testo non valido');
    const out=[];
    for(let i=0;i<t.length;i+=4){
      const k=[0,1,2,3].map(q=>i+q<t.length?B64IX.get(t[i+q]):0);
      if(k.includes(undefined))throw new Error('carattere non valido');
      const x=k[0]<<18|k[1]<<12|k[2]<<6|k[3];
      out.push(x>>>16&255);if(i+2<t.length)out.push(x>>>8&255);if(i+3<t.length)out.push(x&255);
    }
    return out;
  }
  const check=(a,n)=>{let h=2166136261;for(let i=0;i<n;i++)h=Math.imul(h^a[i],16777619);return mix(h);};
  const MATE=-2;
  const UIDKIND=new Set([3,4,5,10,14,15,17,18]);
  // Record di un luogo in forma compatta (un testo per luogo, con controllo): un guasto riguarda solo quel luogo.
  function encodeRecs(pop,P){
    if(!P.list.length)return '';
    const R=pop.R,cur=pop.week,rows=P.list.slice().sort((a,b)=>R.origin[a]-R.origin[b]||R.serial[a]-R.serial[b]),at=new Map(rows.map((i,t)=>[uidOf(R,i),t])),out=[];
    const v=n=>{while(n>127){out.push(n%128+128);n=Math.floor(n/128);}out.push(n);},z=n=>v(n<0?-n*2-1:n*2);
    const big=x=>{if(x<9007199254740000n)v(Number(x)+1);else{v(0);const s=String(x);v(s.length);for(const ch of s)out.push(ch.charCodeAt(0));}};
    const ref=(u,i)=>{if(u<0){v(0);return;}const o=Math.floor(u/BASE),s=u-o*BASE;if(o===R.origin[i]){const d=s-R.serial[i];v(3+2*(d<0?-d*2-1:d*2));}else{v(2+2*o);v(s);}};
    const tieRef=(u,i)=>{if(u>=0&&u===R.spouse[i])v(1);else ref(u,i);}; // il coniuge costa un solo byte
    const together=i=>{const p=R.pa[i]<0?-1:rowOf(pop,R.pa[i]);return p>=0&&R.place[p]===P.ix&&R.stage[p]>0&&(R.cls[p]===1||R.cls[p]===2)&&R.pb[i]===R.spouse[p];};
    let o=-1,s=-1;
    v(rows.length);
    rows.forEach((i,t)=>{
      if(R.origin[i]!==o){o=R.origin[i];s=-1;v(0);v(o);}
      v(R.serial[i]-s);s=R.serial[i];
      out.push(R.stage[i]|R.cls[i]<<2|R.flags[i]<<4|(R.wounds[i]?128:0),R.prof[i]|R.goalL[i]<<5);
      v(P.order.indexOf(R.lin[i])*4+R.moves[i]);v(cur-R.born[i]);big(R.wealth[i]);
      if(R.wounds[i])v(R.wounds[i]);
      if(R.stage[i]){
        v(R.xp[i]);v(R.kids[i]);v(R.proj[i]);
        if(R.cls[i]===1||R.cls[i]===2){const q=at.get(R.spouse[i]);if(q>t)v(q-t);}else ref(R.spouse[i],i);
        if(R.cls[i]===3)v(cur-R.since[i]);
      }
      const pair=together(i);
      out.push(R.relN[i]|R.memN[i]<<3|(pair?128:0)); // bit 7: l'altro genitore è il coniuge del primo
      ref(R.pa[i],i);if(!pair)ref(R.pb[i],i);
      for(let k=0;k<R.relN[i];k++){tieRef(R.relU[i*6+k],i);z(R.relS[i*6+k]);}
      for(let k=0;k<R.memN[i];k++){const kind=R.memK[i*8+k],a=R.memA[i*8+k];v((cur-R.memW[i*8+k])*32+kind);if(UIDKIND.has(kind))tieRef(a,i);else v(a+1);}
      if(R.flags[i]&SWAYED){for(let k=0;k<5;k++)out.push(R.traits[i*5+k]);for(let k=0;k<4;k++)out.push(R.needs[i*4+k]);}
    });
    const h=check(out,out.length);
    out.push(h>>>24,h>>>16&255,h>>>8&255,h&255);
    return toText(out);
  }
  function need(ok,msg){if(!ok)throw new Error(msg);}
  function decodeRecs(pop,P,text){
    const a=fromText(text),n=a.length-4,R=pop.R,cur=pop.week;
    need(n>0&&check(a,n)===((a[n]<<24|a[n+1]<<16|a[n+2]<<8|a[n+3])>>>0),'controllo non valido');
    let p=0;
    const b=()=>{need(p<n,'record incompleti');return a[p++];};
    const v=()=>{let x=0,m=1;for(;;){const q=b();x+=(q&127)*m;if(q<128)break;m*=128;need(m<2**56,'numero troppo grande');}return x;};
    const z=()=>{const x=v();return x%2?-(x+1)/2:x/2;};
    const big=()=>{const x=v();if(x)return BigInt(x-1);const len=v();need(len<=20,'ricchezza non valida');let s='';for(let k=0;k<len;k++)s+=String.fromCharCode(b());need(canonical(s)&&BigInt(s)<=MAXW,'ricchezza non valida');return BigInt(s);};
    const rows=[],count=v();
    need(count<=n,'troppi record');
    let o=-1,s=-1;
    const ref=i=>{
      const x=v();
      if(!x)return NOID;
      if(x===1)return MATE;
      if(x%2){const d=(x-3)/2,u=R.serial[i]+(d%2?-(d+1)/2:d/2);need(u>=0&&u<BASE,'riferimento non valido');return R.origin[i]*BASE+u;}
      const or=(x-2)/2,u=v();
      need(or<pop.places.length&&u<BASE,'riferimento non valido');
      return or*BASE+u;
    };
    const pair=new Map(),joint=[];
    for(let t=0;t<count;t++){
      const i=newRow(pop);
      rows.push(i);R.alive[i]=0;
      let d=v();
      if(!d){o=v();need(o<pop.places.length,'origine non valida');s=-1;d=v();need(d>0,'serie non valida');}
      s+=d;need(o>=0&&s<BASE,'serie non valida');
      const b0=b(),b1=b(),lm=v(),li=Math.floor(lm/4);
      need(li<P.order.length,'stirpe non valida');
      R.place[i]=P.ix;R.origin[i]=o;R.serial[i]=s;R.lin[i]=P.order[li];R.moves[i]=lm%4;
      R.stage[i]=b0&3;R.cls[i]=b0>>2&3;R.flags[i]=b0>>4&7;R.prof[i]=b1&31;R.goalL[i]=b1>>5;
      need(R.stage[i]<=2&&R.prof[i]<NP&&R.goalL[i]<GOALS_L.length&&(R.stage[i]>0||R.cls[i]===0)&&(R.stage[i]===1||R.prof[i]===0),'record non valido');
      R.born[i]=cur-v();R.wealth[i]=big();R.wounds[i]=b0&128?v():0;
      R.xp[i]=0;R.kids[i]=0;R.proj[i]=0;R.spouse[i]=NOID;R.since[i]=0;
      if(R.stage[i]){
        R.xp[i]=Math.min(4e9,v());R.kids[i]=Math.min(255,v());R.proj[i]=Math.min(100,v());
        if(R.cls[i]===1||R.cls[i]===2){if(pair.has(t)){const q=pair.get(t);R.spouse[i]=uidOf(R,q);R.spouse[q]=uidOf(R,i);pair.delete(t);}else{const q=t+v();need(q>t&&q<count&&!pair.has(q),'coppia non valida');pair.set(q,i);}}
        else R.spouse[i]=ref(i);
        if(R.cls[i]===3)R.since[i]=cur-v();
      }
      const m=b();
      R.pa[i]=ref(i);R.pb[i]=NOID;
      if(m&128)joint.push(i);else R.pb[i]=ref(i);
      need(R.pa[i]!==MATE&&R.pb[i]!==MATE&&R.spouse[i]!==MATE,'genitore non valido');
      R.relN[i]=m&7;R.memN[i]=m>>3&15;
      need(R.relN[i]<=6&&R.memN[i]<=8,'legami non validi');
      for(let k=0;k<R.relN[i];k++){R.relU[i*6+k]=ref(i);const q=z();need(q!==0&&Math.abs(q)<=LIMITS.bond&&R.relU[i*6+k]!==NOID,'legame non valido');R.relS[i*6+k]=q;}
      for(let k=0;k<R.memN[i];k++){const x=v();R.memK[i*8+k]=x%32;R.memW[i*8+k]=cur-Math.floor(x/32);R.memA[i*8+k]=UIDKIND.has(x%32)?ref(i):v()-1;}
      derive(pop,i);
      if(R.flags[i]&SWAYED){for(let k=0;k<5;k++)R.traits[i*5+k]=Math.min(100,b());for(let k=0;k<4;k++)R.needs[i*4+k]=Math.min(100,b());}
      need(!pop.idMap.has(uidOf(R,i)),'identità duplicata');
      pop.idMap.set(uidOf(R,i),i);R.alive[i]=1;
    }
    need(p===n&&!pair.size,'record in eccesso');
    for(const i of rows){
      for(let k=0;k<R.relN[i];k++)if(R.relU[i*6+k]===MATE){R.relU[i*6+k]=R.spouse[i];need(R.spouse[i]>=0,'legame non valido');}
      for(let k=0;k<R.memN[i];k++)if(R.memA[i*8+k]===MATE)R.memA[i*8+k]=R.spouse[i];
    }
    for(const i of joint){const p=rowOf(pop,R.pa[i]);need(p>=0&&R.spouse[p]>=0,'genitori non validi');R.pb[i]=R.spouse[p];}
    for(const i of rows)if(R.stage[i]&&(R.cls[i]===1||R.cls[i]===2)){const q=pop.idMap.get(R.spouse[i]);need(R.stage[q]===R.cls[i]&&R.cls[q]===R.stage[i]&&R.lin[q]===R.lin[i],'coniugi incoerenti');}
    return rows;
  }
  const dueOf=P=>P.due.w.size||P.due.out?{w:Object.fromEntries([...P.due.w].sort((x,y)=>x[0]-y[0]).map(([p,v])=>[PROFS[p],String(v)])),out:String(P.due.out)}:null;
  function serialize(pop){
    settle(pop); // una settimana a metà si completa: non si perde nulla
    const geo={};
    for(const P of pop.places)for(const l of P.order)geo[LIN[l].id]=LIN[l].g.sig;
    return {schema:SCHEMA,seed:pop.seed,week:pop.week,geo:Object.fromEntries(Object.entries(geo).sort((a,b)=>a[0]<b[0]?-1:1)),
      places:pop.places.map(P=>{
        const o={id:P.id,kind:P.kind,continent:P.continent,links:P.linkIds.slice(),capacity:P.capacity,
          lin:Object.fromEntries(P.order.map(l=>{const G=P.lin.get(l);return [LIN[l].id,{h:Array.from(G.h),c:Array.from(G.c),n:G.niche}];})),
          jobs:Array.from(P.jobs),wealth:String(P.wealth),avg:String(P.avg),carry:Object.fromEntries(Object.entries(P.carry).sort((a,b)=>a[0]<b[0]?-1:1)),/*RIPORTO*/
          minted:P.minted,materialized:P.materialized,sig:[P.sig.foodScarcity,P.sig.war,P.sig.disaster,P.sig.crisis]};
        const due=dueOf(P),recs=encodeRecs(pop,P);
        if(due)o.due=due;
        if(recs)o.recs=recs;
        return o;
      }),
      tombs:[...pop.tombs].map(([u,t])=>[Math.floor(u/BASE),u%BASE,LIN[t.l].id,t.b,t.d,t.c,t.p,t.s<0?-1:Math.floor(t.s/BASE),t.s<0?0:t.s%BASE,t.k,t.f]),
      log:pop.log.map(e=>({...e})),
      totals:Object.fromEntries(Object.entries(pop.totals).map(([k,x])=>[k,typeof x==='bigint'?String(x):x])),rtotals:{...pop.rtotals}};
  }
  const CARRY=/^(death|depart|career|found|(marry|mourn|birth|migrate|family):[a-z][a-z0-9_-]{0,31})$/i;
  const plain=o=>object(o)&&!own(o,'__proto__')&&!own(o,'constructor')&&!own(o,'prototype');
  // Istogramma salvato con un'altra tabella biologica: ogni stadio si ripartisce sulle nuove fasce nella stessa posizione relativa.
  function rebucket(old,sig,g){
    const [,nK,,nA,,nE]=sig.split(',').map(Number),h=new Int32Array(g.n);
    const move=(from,n,to,m)=>{for(let j=0;j<n;j++)h[to+Math.min(m-1,Math.floor((j+.5)/n*m))]+=old[from+j];};
    move(0,nK,0,g.nK);move(nK,nA,g.nK,g.nA);move(nK+nA,nE,g.nK+g.nA,g.nE);
    return h;
  }
  function readPlace(pop,P,d,raw,note){
    const ints=(a,n)=>Array.isArray(a)&&a.length===n;
    let fixed=false;
    const int=(x,hi=1e9)=>{if(intIn(x,0,hi))return x;fixed=true;return Number.isFinite(x)?clamp(Math.floor(x),0,hi):0;};
    P.capacity=intIn(d.capacity,0,1e9)?d.capacity:(fixed=true,ROOM[P.kind]);
    P.minted=intIn(d.minted,0,4294967295)?d.minted:(fixed=true,0);
    P.materialized=d.materialized===true;
    if(!plain(d.lin)){if(d.lin!==undefined)fixed=true;}
    else for(const [id,x] of Object.entries(d.lin)){
      if(!linId(id)||!object(x)||!Array.isArray(x.h)||!ints(x.c,8)){fixed=true;continue;}
      const l=linOf(id),g=LIN[l].g,sig=object(raw.geo)&&typeof raw.geo[id]==='string'&&/^\d+(,\d+){5}$/.test(raw.geo[id])?raw.geo[id]:g.sig,q=sig.split(',').map(Number);
      if(x.h.length!==q[1]+q[3]+q[5]||x.h.length>400){fixed=true;continue;}
      const h=x.h.map(n=>int(n)),c=x.c.map(n=>int(n)),G=linIn(P,l,intIn(x.n,1,1e9)?x.n:0);
      if(sig===g.sig)G.h.set(h);else{G.h.set(rebucket(h,sig,g));P.rebucket=P.rebucket||new Map();P.rebucket.set(l,{h,q});}
      let A=0,E=0;
      for(let j=g.nK;j<g.n;j++)if(j<g.nK+g.nA)A+=G.h[j];else E+=G.h[j];
      const ae=Math.min(c[AE],c[EA]);
      G.c.set([c[A0],c[AA]-c[AA]%2,ae,c[AW],c[E0],ae,c[EE]-c[EE]%2,c[EW]]);
      const da=A-adultsOf(G),de=E-eldersOf(G);
      if(da||de||c[AE]!==c[EA]||c[AA]%2||c[EE]%2)fixed=true;
      if(G.c[A0]+da>=0&&G.c[E0]+de>=0){G.c[A0]+=da;G.c[E0]+=de;}else classes(G,A,E);
    }
    recount(P);
    for(const l of P.order.slice())if(P.lin.get(l).n===0){if(d.lin&&own(d.lin,LIN[l].id))fixed=true;dropLin(P,l);}
    let adults=0;for(const G of P.lin.values())adults+=adultsOf(G);
    if(ints(d.jobs,NP)){d.jobs.forEach((n,p)=>{P.jobs[p]=int(n);});}else fixed=true;
    let diff=adults;for(const n of P.jobs)diff-=n;
    if(diff){fixed=true;if(diff>0)P.jobs[NONE]+=diff;else for(let p=0;p<NP&&diff<0;p++){const t=Math.min(P.jobs[p],-diff);P.jobs[p]-=t;diff+=t;}}
    P.wealth=canonical(d.wealth)?BigInt(d.wealth):(fixed=true,-1n);
    P.avg=canonical(d.avg)?BigInt(d.avg):(fixed=true,P.alive&&P.wealth>0n?P.wealth/BigInt(P.alive):0n);
    if(ints(d.sig,4)&&d.sig.every(x=>intIn(x,0,1000)))P.sig={...NEUTRAL,foodScarcity:d.sig[0],war:d.sig[1]?1:0,disaster:d.sig[2]?1:0,crisis:d.sig[3]?1:0};else fixed=true;
    if(plain(d.carry))for(const [k,x] of Object.entries(d.carry)){if(CARRY.test(k)&&intIn(x,0,M-1))P.carry[k]=x;else fixed=true;}else fixed=true;
    if(d.due!==undefined){
      if(plain(d.due)&&plain(d.due.w)&&canonical(d.due.out)){
        P.due.out=BigInt(d.due.out);
        for(const [k,x] of Object.entries(d.due.w)){const p=PROFS.indexOf(k);if(p>0&&canonical(x))P.due.w.set(p,BigInt(x));else fixed=true;}
      }else fixed=true;
    }
    if(fixed)note(`${P.id}: dati riparati`);
  }
  // Record del luogo: se non sono leggibili o non proiettano i margini, il luogo torna aggregato (nessuna persona si perde).
  function readRecs(pop,P,d,note){
    if(d.recs===undefined||d.recs===''){if(P.materialized&&P.alive){P.materialized=false;note(`${P.id}: residenti noti mancanti`);}return;}
    const R=pop.R,n0=pop.idMap.size;
    let rows=[];
    try{
      rows=decodeRecs(pop,P,d.recs);
      const cur=pop.week-1;
      if(P.rebucket)for(const [l,old] of P.rebucket){ // tabella cambiata: i bambini noti decidono le proprie fasce
        const g=LIN[l].g,[Lk,nK]=old.q,oldN=old.h.slice(0,nK),mine=rows.filter(i=>R.lin[i]===l),G=P.lin.get(l);
        for(const i of mine)if(R.stage[i]===0){const b=Math.floor(cur/Lk)-Math.floor(R.born[i]/Lk);need(b>=0&&b<nK&&oldN[b]>0,'fascia');oldN[b]--;}
        const h=rebucket(oldN.concat(old.h.slice(nK)),old.q.join(),g);
        for(const i of mine){
          if(R.stage[i]===0){let b=bucketOf(l,R.born[i],cur);if(b>=g.nK){R.born[i]=(Math.floor(cur/g.Lk)-g.nK+1)*g.Lk;b=g.nK-1;}h[b]++;}
          else R.born[i]=Math.min(R.born[i],cur-(R.stage[i]===1?g.a0:g.e0));
        }
        G.h.set(h);
      }
      const kid=new Map(),cls=new Map(),hist=new Array(NP).fill(0);
      for(const i of rows){
        const l=R.lin[i];
        if(R.stage[i]===0){const b=bucketOf(l,R.born[i],cur);need(b>=0&&b<LIN[l].g.nK,'bambino fuori fascia');kid.set(l*1000+b,(kid.get(l*1000+b)||0)+1);}
        else{const q=l*8+(R.stage[i]-1)*4+R.cls[i];cls.set(q,(cls.get(q)||0)+1);if(R.stage[i]===1)hist[R.prof[i]]++;}
      }
      for(const [l,G] of P.lin){
        const g=LIN[l].g;
        for(let j=0;j<g.nK;j++){const n=kid.get(l*1000+j)||0;need(P.materialized?n===G.h[j]:n<=G.h[j],'bambini ≠ margini');}
        for(let q=0;q<8;q++){const n=cls.get(l*8+q)||0;need(P.materialized?n===G.c[q]:n<=G.c[q],'classi ≠ margini');}
      }
      let moved=false;
      for(const i of rows){ // mestieri riparati: chi è di troppo passa a un posto libero
        if(R.stage[i]!==1||hist[R.prof[i]]<=P.jobs[R.prof[i]])continue;
        let p=0;while(p<NP&&hist[p]>=P.jobs[p])p++;
        need(p<NP,'mestieri');
        hist[R.prof[i]]--;R.prof[i]=p;hist[p]++;moved=true;
      }
      if(moved)note(`${P.id}: mestieri riallineati`);
    }catch(e){
      for(const i of pop.idMap.size>n0||rows.length?[...pop.idMap].filter(([,i])=>R.place[i]===P.ix).map(x=>x[1]):[]){pop.idMap.delete(uidOf(R,i));R.alive[i]=0;pop.free.push(i);}
      P.materialized=false;P.due.w.clear();P.due.out=0n;
      note(`${P.id}: residenti noti illeggibili, il luogo torna aggregato (${String(e&&e.message||e).slice(0,40)})`);
      return;
    }
    let sum=0n;
    for(const i of rows){joinGroup(P,R,i);sum+=R.wealth[i];if(R.flags[i]&(KNOWN|SWAYED))pop.flagged.add(uidOf(R,i));const O=pop.places[R.origin[i]];if(R.serial[i]>=O.minted)O.minted=R.serial[i]+1;}
    P.list=rows.sort((x,y)=>before(R,x,y)?-1:1);P.recW=sum;
    if(P.wealth<0n)P.wealth=sum;
  }
  function build(raw,places,now){
    need(plain(raw)&&raw.schema===SCHEMA,'schema sconosciuto');
    need(intIn(raw.seed,0,4294967295),'seme non valido');
    need(intIn(raw.week,0,2e8),'settimana non valida');
    need(Array.isArray(raw.places)&&raw.places.length<=65535,'luoghi non validi');
    const pop=blank(raw.seed,raw.week),descs=validDescs(places),byId=new Map(descs.map(d=>[d.id,d])),notes=[],note=m=>{if(!notes.includes(m))notes.push(m);};
    const ok=raw.places.map((d,j)=>plain(d)&&safeId(d.id)&&raw.places.findIndex(x=>object(x)&&x.id===d.id)===j),have=new Set(raw.places.filter((d,j)=>ok[j]).map(d=>d.id)),missing=descs.filter(d=>!have.has(d.id));
    const fresh=[];
    raw.places.forEach((d,j)=>{
      let desc=ok[j]?d:missing.shift();
      if(!ok[j]){note(`luogo ${j} illeggibile: ${desc?desc.id+' ripopolato dal seme':'perduto'}`);if(!desc)desc={id:'perduto-'+j,kind:'interior',links:[],population:0};fresh.push(j);}
      const kind=ok[j]&&!KINDS.includes(d.kind)?(note(`${d.id}: tipo sconosciuto`),byId.get(d.id)?.kind):desc.kind,P=newPlace({...desc,kind},pop.places.length);
      P.linkIds=Array.isArray(desc.links)?desc.links.filter(safeId):[];
      pop.places.push(P);pop.index.set(P.id,P.ix);
    });
    pop.places.forEach((P,j)=>{if(ok[j])readPlace(pop,P,raw.places[j],raw,note);});
    pop.places.forEach((P,j)=>{if(ok[j])readRecs(pop,P,raw.places[j],note);});
    for(const P of pop.places){delete P.rebucket;if(P.wealth<0n)P.wealth=BigInt(P.alive)*BigInt(PER_CAPITA[P.kind]||800);}
    for(const j of fresh)populate(pop,pop.places[j],byId.get(pop.places[j].id)||{population:0});
    for(const P of pop.places)for(const i of P.list)if(!(pop.R.flags[i]&SWAYED))needsOf(pop,P,i);
    // Lapidi, registro e totali: ciò che non è valido si scarta.
    if(Array.isArray(raw.tombs))for(const t of raw.tombs){
      if(Array.isArray(t)&&t.length===11&&intIn(t[0],0,pop.places.length-1)&&intIn(t[1],0,4294967295)&&linId(t[2])&&intIn(t[3],-2e9,raw.week)&&intIn(t[4],0,raw.week)&&intIn(t[5],0,CAUSES.length-1)
        &&intIn(t[6],0,NP-1)&&intIn(t[7],-1,pop.places.length-1)&&intIn(t[8],0,4294967295)&&intIn(t[9],0,255)&&intIn(t[10],0,1)&&pop.tombs.size<LIMITS.tombs)
        pop.tombs.set(t[0]*BASE+t[1],{l:linOf(t[2]),b:t[3],d:t[4],c:t[5],p:t[6],s:t[7]<0?NOID:t[7]*BASE+t[8],k:t[9],f:t[10]});
      else note('lapidi non valide scartate');
    }else note('lapidi mancanti');
    if(Array.isArray(raw.log))for(const e of raw.log.slice(-LIMITS.events)){
      if(plain(e)&&intIn(e.week,0,2e8)&&typeof e.kind==='string'&&e.kind.length<=16&&typeof e.place==='string'&&typeof e.text==='string'&&e.text.length<=400)pop.log.push({week:e.week,kind:e.kind,place:e.place,text:e.text});
      else note('voci di registro non valide scartate');
    }else note('registro mancante');
    const tot=plain(raw.totals)?raw.totals:(note('totali mancanti'),{}),rt=plain(raw.rtotals)?raw.rtotals:(note('totali mancanti'),{});
    for(const k of Object.keys(pop.totals)){
      if(typeof pop.totals[k]==='bigint'){if(canonical(tot[k]))pop.totals[k]=BigInt(tot[k]);else note('totali riparati');}
      else if(intIn(tot[k],0,Number.MAX_SAFE_INTEGER))pop.totals[k]=tot[k];else note('totali riparati');
    }
    for(const k of RTOTALS)if(intIn(rt[k],0,Number.MAX_SAFE_INTEGER))pop.rtotals[k]=rt[k];else note('totali riparati');
    // Luoghi nuovi nel mondo: dal seme; quelli esistenti aggiornano tipo e collegamenti.
    const added=[];
    for(const d of descs){
      if(pop.index.has(d.id)){const P=pop.places[pop.index.get(d.id)];if(KINDS.includes(d.kind))P.kind=d.kind;continue;}
      if(pop.places.length>=65535)break;
      const P=newPlace(d,pop.places.length);pop.places.push(P);pop.index.set(P.id,P.ix);added.push([P,d]);
    }
    linkUp(pop,descs);
    for(const [P,d] of added)populate(pop,P,d);
    pop.note=notes.slice(0,8).join('; ').slice(0,600);
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

  window.WorldPopulation={WEEK,yearWeeks:YW,create,restore,serialize,step,system,settle,partial,summary,transfer,materialize,residents,person,events,stats,cells,
    decisions,influence,know,audit,biology,configureBiology,limits:LIMITS,professions:PROFS.slice(),lineages:Object.keys(TABLE)};
})();
