/* Persistent growth and observed evolution for the original Reincarnation campaign. */
(() => {
  'use strict';

  const attributes = ['strength','endurance','intelligence','magic','dexterity','vitality','agriculture'];
  const names = {
    strength:'Forza',endurance:'Resistenza',intelligence:'Intelligenza',magic:'Magia',
    dexterity:'Destrezza',vitality:'Vitalità',agriculture:'Agricoltura'
  };
  const regions = {valley:'Valle di Lùmora',quarry:'Cava delle Braci',rift:'Fenditura Astrale'};
  // Birth stage, age in days, favoured territory, individual bias, physiology, strength, weakness, basic attack.
  const biologyRows = {
    slime:['Appena nato',3,'valley','vitality','Gel che trattiene l’acqua.','Rigenera facilmente il corpo.','La forza fisica iniziale è modesta.','lunge','Balzo gelatinoso'],
    goblin:['Giovane',1095,'valley','dexterity','Orecchie sottili e mani prensili.','Rapido con attrezzi e armi leggere.','Soffre i colpi frontali prolungati.','sweep','Fendente dei rovi'],
    wolf:['Cucciolo',160,'valley','endurance','Zampe leggere e olfatto runico.','Ottima resistenza negli spostamenti.','Riserva di mana contenuta.','claw','Morso runico'],
    elf:['Giovane',5475,'valley','magic','Sensi acuti e metabolismo lento.','Recupera rapidamente il mana.','Vitalità fisica iniziale contenuta.','sweep','Taglio del salice'],
    spirit:['Scintilla nuova',10,'rift','magic','Corpo di luce legato alle campane.','Sensibile ai flussi astrali.','Poca vitalità quando viene materializzato.','spit','Impulso di lume'],
    vampire:['Giovane',4380,'rift','intelligence','Pelle fredda e linfa notturna.','Sente il battito di creature e piante.','La concentrazione fisica costa più di un attacco breve.','claw','Graffio del vespro'],
    demon:['Giovane',730,'quarry','strength','Una fornace minuta gli scalda il torace.','Affine alle braci e all’assalto.','Meno agile di molte bestie.','slam','Percossa di brace'],
    drake:['Cucciolo appena schiuso',12,'quarry','vitality','Scaglie ancora tenere, ghiandola del soffio immatura.','Il corpo sopporta bene le cadute.','Il soffio del cucciolo ha potenza limitata.','spit','Soffio d’ambra del cucciolo'],
    secret:['Ombra nascente',1,'rift','magic','Due ombre attorno a una sola anima.','Accoglie con facilità l’energia astrale.','Il contatto diretto disperde la sua forma.','spit','Scaglia d’eclisse'],
    kobold:['Giovane',912,'quarry','dexterity','Scaglie vibranti che ascoltano gli urti.','Si orienta bene nelle cavità.','Ha una riserva di mana piccola.','sweep','Taglio di selce'],
    orc:['Giovane',4015,'quarry','strength','Ossa grandi e cartilagini robuste.','Ottimo nel trasporto di carichi.','Poca rapidità e poco mana iniziale.','slam',' Spallata della gola'],
    gnome:['Apprendista',3650,'valley','intelligence','Occhi capaci di leggere incisioni minuscole.','Impara volentieri strumenti e tecniche.','Scarsa forza bruta.','spit','Ago di bussola'],
    satyr:['Giovane',3285,'valley','endurance','Tendini elastici e zoccoli divisi.','Mantiene a lungo il ritmo di marcia.','Ha poca protezione naturale.','lunge','Calcio di sambuco'],
    hare:['Cucciolo',56,'valley','dexterity','Orecchie notturne e potenti zampe posteriori.','Scatta e cambia direzione con facilità.','La vitalità iniziale è bassa.','lunge','Calcio lunare'],
    fungus:['Germoglio',9,'valley','agriculture','I filamenti raccolgono umidità e calore.','Asseconda le colture e conserva l’acqua.','Si muove lentamente.','slam','Urto del micelio'],
    fox:['Cucciolo',90,'quarry','dexterity','Cuscinetti isolanti e pelo di cenere.','Agile sulle pietre tiepide.','Poca difesa se viene raggiunta.','claw','Zampata di cenere'],
    terrapin:['Cucciola',25,'valley','vitality','Carapace ancora in crescita.','Ottima protezione naturale.','Passo corto e lento.','slam','Urto di carapace'],
    dryad:['Germoglio',110,'valley','agriculture','Legno vivo sotto una corteccia tenera.','Percepisce la crescita dei semi.','Vitalità iniziale inferiore alle stirpi di pietra.','spit','Seme di resina'],
    triton:['Giovane',1825,'valley','endurance','Branchie e polmoni in un solo corpo.','Sopporta bene lavoro prolungato vicino all’acqua.','Lo scatto su terreno asciutto è breve.','sweep','Fiocina natante'],
    raven:['Nidiaceo',49,'rift','intelligence','Remiganti sottili come bronzo battuto.','Impara presto percorsi e segnali.','Corpo leggero e fragile.','spit','Penna di bronzo'],
    salamander:['Cucciola',33,'quarry','vitality','Ghiandole che custodiscono calore.','Portata per la cava e le fornaci.','Il corpo è meno rapido lontano da fonti calde.','spit','Goccia rovente'],
    scarabkin:['Giovane',48,'quarry','strength','Elitre e zampe a leva.','Solleva carichi superiori al suo peso.','Difficile cambiare direzione a piena corsa.','slam','Carica d’ocra'],
    spider:['Ragno giovane',28,'valley','dexterity','Otto zampe sensibili alle vibrazioni.','Preciso nei lavori di tessitura e raccolta.','Assorbe male gli urti pesanti.','claw','Morso della filatrice'],
    mimic:['Risvegliato',19,'quarry','intelligence','Cerniere e denti sono organi mobili.','Capacità di apprendere dai materiali.','La legna appesantisce i movimenti.','lunge','Scatto del chiavistello'],
    troll:['Giovane',2190,'valley','vitality','Ossa di torba e muschio simbiotico.','Corpo forte e ricco di riserve.','Lento nell’inseguimento.','slam','Pugno muschioso'],
    harpy:['Implume',75,'rift','dexterity','Artigli prensili e ali ancora corte.','Rapida nelle raffiche e nei salti.','Pochissima armatura naturale.','claw','Artiglio delle creste'],
    golem:['Risvegliato',4,'quarry','strength','Terracotta cotta attorno a giunti elastici.','Corazza robusta e colpi potenti.','Movimenti lenti e poca riserva arcana.','slam','Maglio d’argilla'],
    frostkin:['Cucciolo',550,'rift','vitality','Pelliccia capace di trattenere aria fredda.','Resiste bene alle escursioni faticose.','Lo scatto è più breve di quello delle bestie snelle.','slam','Zolla di neve'],
    sylph:['Soffio giovane',14,'rift','magic','La sua anima galleggia in un anello d’aria.','Mana e mobilità naturali notevoli.','Corpo delicato nei colpi ravvicinati.','spit','Filamento radente'],
    naga:['Giovane',150,'rift','intelligence','Squame mobili guidano la spira.','Memoria precisa di sigilli e tracciati.','La spira si volta più lentamente delle zampe.','sweep','Spira di malachite'],
    mantis:['Ninfa',17,'valley','dexterity','Le zampe anteriori chiudono come tenaglie.','Forte e precisa nel primo scatto.','Fianco delicato dopo la schivata.','claw','Falci vive'],
    minotaur:['Giovane',2555,'quarry','endurance','Zoccoli larghi e muscoli del collo robusti.','Adatto a salite e lunghe corse.','Stretta riserva di energia arcana.','slam','Testata di soglia'],
    djinn:['Soffio giovane',31,'rift','magic','Incenso condensato attorno a un nome.','Ottima affinità con studio e incanti.','Fragile se intrappolato nel corpo.','spit','Sbaffo d’incenso'],
    chimera:['Cucciola',96,'valley','vitality','Due apparati cooperano intorno a un seme.','Recupera bene dagli sforzi alternati.','La coordinazione richiede pratica.','lunge','Balzo bifronte'],
    phoenix:['Pulcino',7,'quarry','magic','Piume ancora soffici, braci sotto la pelle.','Calore innato e ampia riserva di mana.','Le penne immature difendono poco.','spit','Brace di zafferano'],
    leviathan:['Avannotto',27,'rift','endurance','Cuore acquatico in un corpo minuto.','Forte nel lavoro di durata.','Il corpo piccolo non ha ancora tutta la potenza del mare.','spit','Getto di marea'],
    human:['Giovane',5840,'valley','intelligence','Corpo adattabile e mani precise.','Ampio potenziale individuale.','Nessuna armatura naturale.','sweep','Colpo del viandante'],
    skeleton:['Risvegliato',5,'rift','endurance','Ossa tenute insieme da una runa.','Resiste alla fatica dei lavori ripetitivi.','Articolazioni esposte.','sweep','Colpo d’osso']
  };
  const defaultBiology = ['Giovane',365,'valley','intelligence','Si adatta gradualmente alle condizioni della regione.','Versatile nelle attività.','La specializzazione richiede pratica.','sweep','Colpo naturale'];
  const biologyRow = id => Object.hasOwn(biologyRows,id) ? biologyRows[id] : window.ContinentalBiology?.[id]||defaultBiology;

  // Axis of progression after a cast: corpo, arcano, adattamento.
  const talents = {
    stride:{name:'Fiato di scorta',require:'Corri per 28 secondi e schiva almeno 4 volte.',axis:'endurance',bonus:{speed:4},evidence:e=>e.run>=28&&e.dodge>=4},
    hand:{name:'Mano ferma',require:'Forgia, raccogli o alleva in almeno 3 occasioni diverse.',axis:'dexterity',bonus:{atk:1,def:1},evidence:e=>e.craft>=1&&e.harvest>=1&&e.livestock>=1},
    root:{name:'Pollice di linfa',require:'Coltiva almeno 5 volte e raccogli almeno 2 risorse.',axis:'agriculture',bonus:{hp:5},evidence:e=>e.field>=5&&e.harvest>=2},
    ore:{name:'Ossa di minerale',require:'Estrai 5 pietre e solleva pesi almeno 3 volte.',axis:'strength',bonus:{def:2},evidence:e=>e.mine>=5&&e.train>=3},
    glyph:{name:'Memoria dei glifi',require:'Studia 4 volte e usa almeno 5 magie.',axis:'intelligence',bonus:{mp:6},evidence:e=>e.study>=4&&e.magic>=5},
    shimmer:{name:'Senso del varco',require:'Visita la Fenditura Astrale e usa l’innata almeno 5 volte.',axis:'magic',bonus:{mp:7},evidence:(e,g)=>g.exposure.rift>=1&&e.innate>=5},
    survivor:{name:'Nervo d’ambra',require:'Subisci almeno 5 colpi e schiva almeno 4 volte.',axis:'vitality',bonus:{hp:6,def:1},evidence:e=>e.damage>=5&&e.dodge>=4},
    crafter:{name:'Baratto artigiano',require:'Fabbrica 4 volte e commercia 4 volte.',axis:'dexterity',bonus:{mp:3,atk:1},evidence:e=>e.craft>=4&&e.trade>=4},
    ward:{name:'Ospite delle campane',require:'Incontra un evento del mondo e costruisci 3 volte.',axis:'agriculture',bonus:{hp:3,def:1},evidence:e=>e.event>=1&&e.build>=3},
    hunter:{name:'Occhio del pugile',require:'Usa 12 attacchi fisici a segno e vinci 5 incontri.',axis:'strength',bonus:{atk:2},evidence:e=>e.physical>=12&&e.kill>=5},
    shaper:{name:'Intreccio elementale',require:'Usa l’innata 6 volte fra combattimento e studio.',axis:'magic',bonus:{mp:4,atk:1},evidence:e=>e.innate>=6&&(e.magic>=8||e.study>=4)},
    tracks:{name:'Lettura delle orme',require:'Esplora 4 volte e lavora in più di un territorio.',axis:'intelligence',bonus:{speed:3,mp:3},
      evidence:(e,g)=>e.explore>=4&&Object.values(g.exposure).filter(n=>n>=1).length>=2}
  };

  const innateRows = {
    absorb:{
      name:'Assorbimento',rarity:'Rara',axis:'vitality',color:'#b6eca8',style:'leech',icon:'heal',cost:8,cooldown:6.2,power:1.12,
      description:'Un dardo trae vitalità dalla prima creatura che raggiunge.',
      branches:[
        ['body','Assorbimento biologico','leech','Prosciuga un avversario e ricuce le ferite.'],
        ['arcane','Assorbimento magico','ward','Condensa il flusso arcano in una barriera.'],
        ['adaptive','Assorbimento elementale','burst','Diffonde l’energia assorbita in un anello elementale.']
      ]
    },
    renewal:{
      name:'Rigenerazione',rarity:'Comune',axis:'agriculture',color:'#a5f6c6',style:'heal',icon:'heal',cost:9,cooldown:7,power:1.4,
      description:'Rimargina una parte delle ferite.',
      branches:[
        ['body','Midollo rigenerante','heal','Cura un ammontare maggiore di vitalità.'],
        ['arcane','Risanaura','bloom','Ferisce intorno all’incantatore e sana le sue ferite.'],
        ['adaptive','Rigenerazione della linfa','ward','Srotola una corteccia rigenerata che assorbe i danni.']
      ]
    },
    element:{
      name:'Manipolazione elementale',rarity:'Comune',axis:'magic',color:'#a6e3ff',style:'bolt',icon:'skill',cost:8,cooldown:5.3,power:1.35,
      description:'Convoglia un elemento in un dardo diretto al bersaglio.',
      branches:[
        ['body','Percussione elementale','burst','Scarica pressione elementale attorno al corpo.'],
        ['arcane','Ventaglio degli elementi','fan','Divide un elemento in tre proiettili.'],
        ['adaptive','Vincolo elementale','snare','Rallenta i bersagli nei pressi del sigillo.']
      ]
    },
    insight:{
      name:'Percezione magica',rarity:'Comune',axis:'intelligence',color:'#e8d49a',style:'snare',icon:'ward',cost:8,cooldown:6.3,power:1.05,
      description:'Fa emergere i fili di mana del luogo e ostacola le creature vicine.',
      branches:[
        ['body','Occhio delle traiettorie','cleave','Fende le linee di mana davanti al corpo.'],
        ['arcane','Occhio dei glifi','familiar','Evoca un lume che individua e bersaglia creature vicine.'],
        ['adaptive','Occhio dei sentieri','snare','Rallenta le creature nei nodi di mana più stabili.']
      ]
    },
    adaptation:{
      name:'Adattamento',rarity:'Rara',axis:'endurance',color:'#e2c895',style:'ward',icon:'ward',cost:8,cooldown:6.9,power:1.45,
      description:'Ispessisce la difesa per assorbire i prossimi colpi.',
      branches:[
        ['body','Adattamento d’urto','ward','Rinforza il corpo finché dura la barriera.'],
        ['arcane','Adattamento arcano','snare','Rivolge la pressione magica contro chi si avvicina.'],
        ['adaptive','Adattamento simbiotico','bloom','Scambia il calore del luogo con energia curativa.']
      ]
    },
    shade:{
      name:'Controllo delle ombre',rarity:'Epica',axis:'dexterity',color:'#d4a7fb',style:'fan',icon:'skill',cost:10,cooldown:6.4,power:.93,
      description:'Proietta tre ombre divergenti. Ogni ombra può ferire un bersaglio.',
      branches:[
        ['body','Lame d’ombra','cleave','Dà consistenza a una lama che taglia frontalmente.'],
        ['arcane','Coro delle ombre','fan','Proietta tre ombre più dense e affilate.'],
        ['adaptive','Ombra simbiotica','familiar','Un doppio scuro ti segue e colpisce i nemici.']
      ]
    }
  };
  const mutations = {
    forge:{id:'forge',name:'Nucleo di scoria',description:'La pratica della forgia durante la metamorfosi consolida il corpo. +2 difesa.',bonus:{def:2}},
    grove:{id:'grove',name:'Linfa intrecciata',description:'Una coltura esperta e un talento risvegliato lasciano vita nelle vene. +8 HP.',bonus:{hp:8}},
    orbit:{id:'orbit',name:'Vena astrale',description:'L’innata sviluppata e i coruschi del Varco lasciano un filo di mana. +6 MP.',bonus:{mp:6}},
    pilgrim:{id:'pilgrim',name:'Passo di campana',description:'Una vita d’esplorazione e una presenza misteriosa lasciano un ritmo diverso al passo. +5 velocità.',bonus:{speed:5}}
  };
  const activities = {
    run:{endurance:1.2,dexterity:.25},train:{strength:3.4,vitality:.8},physical:{strength:1.55,dexterity:.45},
    magic:{magic:1.8,intelligence:.85},damage:{vitality:1.9,endurance:.48},dodge:{dexterity:1.6,endurance:.8},
    kill:{strength:1,vitality:1.25},boss:{strength:2.4,vitality:2.1},visit:{intelligence:.45,endurance:.6},
    field:{agriculture:3.2,endurance:.5},mine:{strength:1.95,vitality:1.35},harvest:{agriculture:1.4,dexterity:1},
    craft:{dexterity:2.4,intelligence:1},trade:{intelligence:2.3,dexterity:.6},livestock:{agriculture:1.8,vitality:1.5},
    explore:{endurance:1.9,intelligence:1.35},build:{strength:1.6,dexterity:1.15},study:{intelligence:2.8,magic:2.1},
    innate:{magic:.85,intelligence:.4},death:{},event:{intelligence:1.1,vitality:.7},
    profession:{intelligence:.45,dexterity:.4}
  };
  const peaceful = ['train','field','mine','harvest','craft','trade','livestock','explore','build','study'];
  const colours = {sweep:'#ffe9b1',claw:'#ffe0be',slam:'#eabd80',lunge:'#b8ecb8',spit:'#a9ddf2'};
  const attacks = {sweep:[1,34],claw:[1.08,27],slam:[1.19,30],lunge:[.94,37],spit:[.76,65]};
  const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
  const has = (table,key) => Object.hasOwn(table,key);
  const finite = (value,min,max) => Number.isFinite(value)&&value>=min&&value<=max;
  const object = value => value && typeof value==='object'&&!Array.isArray(value);
  const numberMap = (keys,value=0) => Object.fromEntries(keys.map(key=>[key,value]));
  const practiceMap = () => numberMap(Object.keys(activities));
  const axisMap = () => ({body:0,arcane:0,adaptive:0});

  function randomSource(seed,species){
    let x=seed>>>0;
    for(const c of species)x=Math.imul(x^c.charCodeAt(0),16777619)>>>0;
    x=x||876891;
    return () => {
      x^=x<<13;x^=x>>>17;x^=x<<5;
      return (x>>>0)/4294967296;
    };
  }
  function pickWeighted(items,random){
    let mark=random()*items.reduce((sum,item)=>sum+item[1],0);
    for(const [id,weight] of items){mark-=weight;if(mark<0)return id;}
    return items[items.length-1][0];
  }
  function create(race,seed,p){
    const species=race.id,[,,terrain,bias]=biologyRow(species),random=randomSource(seed,species);
    const aptitudes=Object.fromEntries(attributes.map(key=>{
      const biased=key===bias?13:0;
      const apt=Math.round(18+random()*52+random()*15+biased);
      const outstanding=random()<.055?13:0;
      return [key,clamp(apt+outstanding,10,99)];
    }));
    const birthInnate=pickWeighted(Object.entries(innateRows).map(([id,entry])=>{
      const base=entry.rarity==='Epica'?2:entry.rarity==='Rara'?7:13;
      const affinity=1+(aptitudes[entry.axis]-50)/175+(entry.axis===bias?.2:0);
      return [id,base*affinity];
    }),random);
    const hidden=Object.keys(talents);
    const chooseTalent=()=>pickWeighted(hidden.map(id=>[id,1+aptitudes[talents[id].axis]/120+(talents[id].axis===bias?.5:0)]),random);
    const first=chooseTalent();hidden.splice(hidden.indexOf(first),1);
    const stage=clamp(p?.evolutionStage || 0,0,2);
    const acts=practiceMap();
    if(p?.kills>0)acts.kill=clamp(p.kills,0,10000000);
    const mutable={
      schema:1,species,aptitudes,practice:numberMap(attributes),acts,exposure:numberMap(Object.keys(regions)),
      trainedTerrain:terrain,hidden:[{id:first,unlocked:false},{id:chooseTalent(),unlocked:false}],
      innate:{id:birthInnate,uses:0,branch:null,resonance:false,axis:axisMap(),terrain:numberMap(Object.keys(regions))},
      stage, history:[]
    };
    return mutable;
  }
  function restore(raw,race,seed,p){
    if(raw===undefined)return create(race,seed,p);
    if(!object(raw)||raw.schema!==1||raw.species!==race.id||!Number.isInteger(raw.stage)||raw.stage!==(p.evolutionStage||0))return null;
    const checkMap=(value,keys,min,max,integer=false)=>object(value)&&Object.keys(value).length===keys.length&&keys.every(key=>finite(value[key],min,max)&&(!integer||Number.isInteger(value[key])));
    const regionKeys=Object.keys(regions);
    if(!checkMap(raw.aptitudes,attributes,10,99,true)||!checkMap(raw.practice,attributes,0,1e7)||
       !checkMap(raw.acts,Object.keys(activities),0,1e7)||!checkMap(raw.exposure,regionKeys,0,1e7)||!has(regions,raw.trainedTerrain))return null;
    const a=raw.innate;
    if(!object(a)||!has(innateRows,a.id)||!Number.isInteger(a.uses)||!finite(a.uses,0,1e7)||
       ![null,'body','arcane','adaptive'].includes(a.branch)||typeof a.resonance!=='boolean'||
       (a.branch!==null&&a.uses<5)||(a.resonance&&(a.branch===null||a.uses<15))||
       !checkMap(a.axis,['body','arcane','adaptive'],0,1e7)||!checkMap(a.terrain,regionKeys,0,1e7))return null;
    if(!Array.isArray(raw.hidden)||raw.hidden.length!==2||
       !raw.hidden.every(t=>object(t)&&has(talents,t.id)&&typeof t.unlocked==='boolean')||raw.hidden[0].id===raw.hidden[1].id)return null;
    let last=0;
    if(!Array.isArray(raw.history)||raw.history.length>2)return null;
    for(const item of raw.history){
      if(!object(item)||!Number.isInteger(item.stage)||item.stage<=last||item.stage>raw.stage||item.branch!==p.form||
         typeof item.reason!=='string'||item.reason.length>350||!(item.mutation===null||has(mutations,item.mutation)))return null;
      last=item.stage;
    }
    return raw;
  }

  function countGrowth(points,apt){
    return Math.min(22,Math.floor((2.8+apt*.019)*Math.log2(1+points/7)));
  }
  function statsAt(g,race){
    const basic={
      strength:race.atk,vitality:Math.round(race.hp/8),magic:Math.round(race.mp/4),dexterity:Math.round(race.speed/8),
      endurance:Math.round(race.hp/9)+race.def,intelligence:7,agriculture:5
    };
    return Object.fromEntries(attributes.map(key=>{
      const bias=Math.round((g.aptitudes[key]-51)/14);
      return [key,Math.max(1,basic[key]+bias+countGrowth(g.practice[key],g.aptitudes[key]))];
    }));
  }
  function bonuses(g,p){
    const trained=key=>countGrowth(g.practice[key],g.aptitudes[key]);
    const aptitude=key=>Math.round((g.aptitudes[key]-50)/25);
    const value={
      hp:trained('vitality')*2+trained('endurance')+aptitude('vitality')*2,
      mp:trained('magic')+trained('intelligence')+aptitude('magic')*2,
      atk:Math.floor(trained('strength')*.43)+Math.max(-1,aptitude('strength')),
      def:Math.floor((trained('vitality')+trained('endurance'))*.12),
      speed:Math.floor(trained('dexterity')*.55)+aptitude('dexterity')
    };
    for(const slot of g.hidden){
      if(slot.unlocked)for(const [k,n] of Object.entries(talents[slot.id].bonus))value[k]+=n;
    }
    const unique=new Set(g.history.map(x=>x.mutation).filter(Boolean));
    for(const id of unique)for(const [k,n] of Object.entries(mutations[id].bonus))value[k]+=n;
    if(g.species==='drake'&&(p?.evolutionStage??g.stage)===0)value.atk-=2;
    return value;
  }
  const toBranch = row => ({id:row[0],name:row[1],style:row[2],description:row[3]});
  const branchHints={
    body:'Favorita da attacchi fisici, ferite e lavori di forza.',
    arcane:'Favorita da magie, studio e affinità arcana.',
    adaptive:'Favorita da mestieri, movimento e cambi di ambiente.'
  };
  const innateLevel = uses => Math.min(5,1+Math.floor(uses/4));
  function innate(g){
    const state=g.innate,def=innateRows[state.id],level=innateLevel(state.uses);
    const slot=def.branches.find(entry=>entry[0]===state.branch);
    const branches=def.branches.map(row=>({...toBranch(row),hint:branchHints[row[0]]}));
    const style=slot?.[2]||def.style;
    // Projectiles that may hit a single target multiple times use a lighter coefficient.
    const styleFactor=style==='fan'?.78:style==='bloom'?.94:1;
    const power=(def.power+.08*(level-1)+(slot?.length ? .13 : 0)+(state.resonance ? .12 : 0))*styleFactor;
    const icon=style==='heal'||style==='leech'||style==='bloom'?'heal':style==='ward'||style==='snare'?'ward':def.icon;
    return {id:state.id,name:(slot?.[1]||def.name)+(state.resonance?' · Risonante':''),birthName:def.name,
      description:slot?.[3]||def.description,rarity:def.rarity,level,uses:state.uses,
      branch:state.branch,branchName:slot?.[1]||null,branches,resonance:state.resonance,
      cost:def.cost+(slot&&style!=='heal'?1:0),cooldown:Math.round((def.cooldown-(level-1)*.23)*10)/10,
      power,color:def.color,style,icon};
  }

  function bump(map,key,amount){
    map[key]=Math.min(1e7,map[key]+amount);
  }
  function innateBranch(g){
    const e=g.acts,a=g.innate.axis,apt=g.aptitudes;
    const score=[
      ['body',a.body*1.3+e.physical*.35+e.damage*.27+e.train*.57+e.mine*.24+apt.strength*.034],
      ['arcane',a.arcane*1.3+e.magic*.37+e.study*.86+e.boss*.75+apt.magic*.045],
      ['adaptive',a.adaptive*1.3+e.run*.05+(e.field+e.livestock+e.build+e.explore+e.visit)*.43+apt.dexterity*.038]
    ];
    score.sort((x,y)=>y[1]-x[1]);
    return score[0][0];
  }
  function record(g,event,amount=1,meta={}){
    if(!g||!has(activities,event)||!finite(amount,0,1e5)||amount===0)return [];
    bump(g.acts,event,amount);
    for(const [key,rate] of Object.entries(activities[event]))bump(g.practice,key,rate*amount);
    const place=meta.region||meta.biome,palette=window.World?.regions?.[place]?.palette;
    const region=has(regions,place)?place:palette&&(['star','fae'].includes(palette)?'rift':['pine','snow','canyon'].includes(palette)?'quarry':'valley');
    if(event!=='death'&&has(regions,region)){
      const presence=event==='run'?amount/9:(event==='visit'||event==='explore'?amount:amount*.12);
      bump(g.exposure,region,presence);
    }

    const messages=[];
    // Only meaningful uses enter the innate log. Casting with no effect is discarded by the engine.
    if(event==='innate'){
      const state=g.innate,previous=innateLevel(state.uses);
      state.uses=Math.min(1e7,state.uses+Math.max(1,Math.floor(amount)));
      const kind=meta.context==='combat'&&['leech','cleave','burst'].includes(meta.style)?'body':
        meta.context==='profession'||meta.context==='exploration'||['ward','snare','heal'].includes(meta.style)?'adaptive':'arcane';
      bump(state.axis,kind,amount);
      if(has(regions,region))bump(state.terrain,region,amount);
      if(!state.branch&&state.uses>=5){
        state.branch=innateBranch(g);
        messages.push('L’innata è mutata · '+innate(g).branchName);
      }else if(innateLevel(state.uses)>previous)messages.push(innateRows[state.id].name+' · Maestria '+innateLevel(state.uses));
    }
    for(const slot of g.hidden){
      const def=talents[slot.id];
      if(!slot.unlocked&&def.evidence(g.acts,g)){
        slot.unlocked=true;messages.push('Talento risvegliato · '+def.name);
      }
    }
    const a=g.innate;
    const harmony=g.hidden.filter(t=>t.unlocked).length;
    const attunedPlaces=Object.values(a.terrain).filter(n=>n>=2).length;
    if(!a.resonance&&a.branch&&a.uses>=15&&((harmony>=1&&attunedPlaces>=2)||harmony>=2)){
      a.resonance=true;messages.push('Innato e talento sono entrati in risonanza.');
    }
    return messages;
  }

  function maturity(g){
    if(g.stage>=2)return 'Forma matura';
    if(g.stage===1)return 'In crescita';
    return biologyRow(g.species)[0];
  }
  function labelAge(days){
    const years=Math.floor(days/365),rest=days%365;
    if(years>0)return years+' '+(years===1?'anno':'anni')+(rest>=30?' e '+Math.floor(rest/30)+' '+(rest<60?'mese':'mesi'):'');
    return days+' '+(days===1?'giorno':'giorni');
  }
  function aptitudeGrade(n){
    if(n>=90)return 'Eccezionale';
    if(n>=76)return 'Notevole';
    if(n>=61)return 'Spiccata';
    if(n>=44)return 'Equilibrata';
    return 'Bassa';
  }
  function biology(race){
    const [origin,days,terrain,bias,body,strength,weakness,style,natural]=biologyRow(typeof race==='string'?race:race.id);
    return {origin,age:labelAge(days),ageDays:days,body,strength,weakness,affinity:regions[terrain],aptitude:names[bias],natural:natural.trim(),style};
  }
  function view(g,race,worldTime=0){
    const bio=biology(race);
    const ageDays=bio.ageDays+Math.floor(Math.max(0,worldTime)/480);
    const found=g.history.map(x=>x.mutation).filter(Boolean);
    const mutation=found.length?mutations[found[found.length-1]]:null;
    return {
      age:labelAge(ageDays),ageDays,origin:bio.origin,maturity:maturity(g),bio,
      aptitudes:attributes.map(key=>({id:key,name:names[key],value:g.aptitudes[key],grade:aptitudeGrade(g.aptitudes[key])})),
      attributes:statsAt(g,race),latent:g.hidden.map(state=>({id:state.id,name:state.unlocked?talents[state.id].name:'Talento sconosciuto',
        condition:talents[state.id].require,unlocked:state.unlocked})),
      innate:innate(g),mutation,mutations:[...new Set(found)].map(id=>mutations[id]),
      history:g.history.map(item=>({...item,mutation:item.mutation?mutations[item.mutation]:null}))
    };
  }
  function findMutation(g){
    const e=g.acts,a=g.innate,t=g.hidden.some(x=>x.unlocked);
    const current=new Set(g.history.map(x=>x.mutation));
    const eligible=[
      ['orbit',g.exposure.rift>=5&&a.uses>=9&&a.branch==='arcane'],
      ['forge',g.exposure.quarry>=4&&e.mine>=5&&e.craft>=2],
      ['grove',e.field>=7&&e.harvest>=3&&t],
      ['pilgrim',e.explore>=5&&e.event>=1&&g.exposure.valley>=2]
    ];
    const match=eligible.find(([id,ready])=>ready&&!current.has(id));
    return match?mutations[match[0]]:null;
  }
  function evolution(s,race,life){
    const p=s.player,g=p.growth,stage=p.evolutionStage||0,e=g.acts;
    const level=stage?5:2,essence=stage?6:3;
    const levelReady=p.level>=level,essenceReady=p.inventory.essence>=essence;
    const work=peaceful.reduce((sum,id)=>sum+e[id],0);
    const fights=Math.max(e.kill,p.kills||0);
    const experience=fights>=3||work>=5||(fights+work*.65>=3&&p.level>2);
    const profession=life?.professions?.find(row=>row.level>=4);
    const story=(s.campaign?.stage||0)>=2;
    const capstone=story||!!profession||work>=32;
    const conditionReady=stage===0?experience:capstone;
    const condition=stage===0?'Fai esperienza in almeno tre scontri, cinque attività di mestiere o alterna le due vie.':
      'Sconfiggi Kharun, raggiungi il grado 4 in un mestiere oppure accumula 32 pratiche di lavoro.';
    const [, ,native,bias]=biologyRow(race.id);
    const habits=[
      {side:0,label:'Assalto',detail:'scontri vinti e attacchi fisici',score:fights*1.38+e.physical*.2+e.boss*.9+e.train*.18},
      {side:0,label:'Studio arcano',detail:'magie, studio e predisposizione mentale',score:e.magic*.56+e.study*.72+g.aptitudes.magic*.032+g.aptitudes.intelligence*.024+g.exposure.rift*.18},
      {side:1,label:'Mestiere',detail:'lavoro, raccolta e pratica di bottega',score:work*.95+g.aptitudes.agriculture*.025+(profession?2.5:0)},
      {side:1,label:'Custodia',detail:'schivate, resistenza e tempo nel territorio',score:e.damage*.35+e.dodge*.44+e.run*.052+g.exposure[native]*.26+g.aptitudes.vitality*.029},
      {side:['strength','dexterity','magic'].includes(bias)?0:1,label:'Predisposizione',detail:'attitudine individuale e affinità di nascita',score:g.aptitudes[bias]*.04+e.visit*.35}
    ];
    const ranking=habits.slice().sort((a,b)=>b.score-a.score);
    const weights=[0,0];
    for(const h of habits)weights[h.side]+=h.score;
    const branch=p.form===0||p.form===1?p.form:weights[1]>weights[0]?1:0;
    const influence=ranking.find(x=>x.side===branch)?.detail||'la sua esperienza';
    const vocation=profession?.name||profession?.id||'un mestiere';
    const second=stage===1&&capstone?(story?' e la vittoria su Kharun':profession?' e l’esperienza di '+vocation.toLocaleLowerCase('it'):' e la pratica prolungata'):'';
    const reason=stage>=2?'I due stadi della stirpe sono completi.':'Finora pesano soprattutto '+influence+second+'.';
    const memory='Hanno inciso soprattutto '+influence+second+'.';
    return {stage,level,essence,condition,ready:stage<2&&levelReady&&essenceReady&&conditionReady,
      levelReady,essenceReady,conditionReady,branch,reason,memory,mutation:findMutation(g),
      influences:ranking.slice(0,3).map(h=>({name:h.label,description:h.detail})),
      progress:{fights,work,profession:profession?vocation:null}};
  }
  function transform(g,plan){
    const next=plan.stage+1;
    if(!plan.ready||next!==g.stage+1||next>2)return [];
    g.stage=next;
    g.history.push({stage:next,branch:plan.branch,reason:plan.memory,mutation:plan.mutation?.id||null});
    return plan.mutation?['Mutazione rara · '+plan.mutation.name]:[];
  }
  function strike(g,race,p){
    const bio=biologyRow(race.id),style=bio[7],name=bio[8].trim();
    const [factor,reach]=attacks[style];
    const grown=p?.evolutionStage??g.stage;
    if(race.id==='drake'&&grown>=1)return {name:grown===2?'Soffio del drago adulto':'Soffio del draco giovane',style,damage:grown===2?.96:.85,reach:grown===2?78:69,color:colours[style]};
    return {name,style,damage:factor,reach,color:colours[style]};
  }

  window.Growth={create,restore,record,view,bonuses,evolution,transform,strike,innate,biology};
})();

