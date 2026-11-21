/* Estensione urbana della Selva degli Alambicchi, disegnata in pixel alla scala del mondo esistente. */
(() => {
  'use strict';

  const id='city-velaris',oldWidth=2144,annexStart=2114,width=2864,height=1496;
  const spawn={x:156,y:726},exit={x:94,y:726};
  const plaza=Object.freeze({id:'plaza',x:914,y:726,name:'Piazza delle Quattro Lenti',radius:35});
  const districts=[
    {id:'lenses',name:'Terrazze delle Lenti',x:488,y:450,minX:25,maxX:989,minY:25,maxY:758,
      description:'Scuole, archivi e aule con tetti di rame azzurro.',ground:['#515852','#59615a','#63695a','#58605c'],road:['#a6a08a','#827f73','#b5ae97'],
      roofs:[['#405864','#56838a','#709e9f','#9eb1a5'],['#414f6c','#64739a','#7e8daf','#a6a6bb'],['#4a6262','#578681','#88a197','#b4bdb0']],wall:['#776f59','#b8ac85','#d0c49c']},
    {id:'kilns',name:'Corte delle Fornaci',x:717,y:954,minX:25,maxX:989,minY:759,maxY:1472,
      description:'Fucine, laboratori e magazzini. Le lanterne seguono il ritmo dei mantici.',ground:['#60534a','#66584b','#695a4a','#705e50'],road:['#ad9378','#88786a','#bda584'],
      roofs:[['#524d50','#71645d','#9d7d65','#c39b79'],['#544348','#875950','#a87257','#c59367'],['#47484e','#63626a','#83848b','#9b9894']],wall:['#6d5b52','#ab8b74','#c39c7e']},
    {id:'wind',name:'Mercato dei Venti',x:1486,y:719,minX:1099,maxX:2120,minY:25,maxY:758,
      description:'Locande, banchi e corridoi di tela tra l’approdo e la via principale.',ground:['#5c5749','#655c4b','#6a604e','#6f6450'],road:['#b3a188','#8d8170','#c3ac8c'],
      roofs:[['#644f4b','#8c6656','#b58b62','#d4ac83'],['#4d5e56','#6c8872','#9a9f7d','#c0b791'],['#514f63','#6b6883','#92839a','#ad98a8']],wall:['#755f56','#bea381','#dbc097']},
    {id:'lamps',name:'Giardini delle Lanterne',x:1888,y:1000,minX:1099,maxX:2120,minY:759,maxY:1472,
      description:'Passeggiate, abitazioni e tre vasche del quartiere sud orientale.',ground:['#4e6250','#576e56','#607158','#64745d'],road:['#a7a489','#828876','#c4b99d'],
      roofs:[['#465d55','#64836c','#91a283','#b6be9e'],['#3f5d62','#53878a','#79a6a2','#a7c0b0'],['#565768','#75798e','#9295a9','#b4b2bf']],wall:['#6c7264','#abb295','#c0c4a4']},
    {id:'arcades',name:'Portici del Vetro',x:2460,y:489,minX:annexStart,maxX:2838,minY:25,maxY:758,
      description:'Logge dei soffiatori, lucernari di rame e vetro e corti dei mercanti.',
      ground:['#656367','#736c70','#7d7574','#696568'],road:['#bdaf9a','#867e74','#d7c7aa'],
      roofs:[['#435661','#678d90','#93b6ab','#d5c69e'],['#5d596c','#84778b','#ae9b9f','#d6c6a7'],['#4e6463','#758b7b','#adb296','#d9c991']],wall:['#716959','#bea98a','#e1cf9f']},
    {id:'orchards',name:'Orti dell’Alambicco',x:2516,y:1218,minX:annexStart,maxX:2838,minY:759,maxY:1472,
      description:'Frutteti, essiccatoi di erbe e colture sotto vetro lungo la vecchia strada rurale.',
      ground:['#54674d','#5d7455','#6b7d57','#72845e'],road:['#ab9b78','#807957','#c1b28b'],
      roofs:[['#655443','#9a7854','#b89567','#d7b87d'],['#4e665d','#648d77','#92b19a','#c9c797'],['#514f59','#767578','#989a8a','#c0bc9a']],wall:['#695a47','#ab9170','#d2bc91']}
  ].map(Object.freeze);

  const services=[
    {id:'inn',kind:'inn',name:'Locanda della Lanterna Salmastra',x:1382,y:673,district:'wind',size:[116,59],style:'inn'},
    {id:'shop',kind:'shop',name:'Bottega dei Vetri Viaggianti',x:1591,y:458,district:'wind',size:[133,56],style:'shop'},
    {id:'forge',kind:'forge',name:'Forgia della Brace Chiara',x:493,y:1108,district:'kilns',size:[173,70],style:'forge'},
    {id:'guild',kind:'guild',name:'Gilda del Compasso',x:752,y:469,district:'lenses',size:[134,54],style:'guild'},
    {id:'archive',kind:'archive',name:'Archivio delle Maree Astrali',x:462,y:221,district:'lenses',size:[105,47],style:'archive'},
    {id:'academy',kind:'academy',name:'Accademia di Velaris',x:488,y:450,district:'lenses',size:[174,101],style:'academy'},
    {id:'house',kind:'house',name:'Casa del custode del canale',x:1782,y:1360,district:'lamps',size:[95,57],style:'house'},
    {id:'greenhouse',kind:'greenhouse',name:'Serra delle Talee',x:2570,y:1112,district:'orchards',size:[140,74],style:'conservatory'}
  ].map(x=>Object.freeze({...x,region:id,point:Object.freeze({x:x.x,y:x.y}),range:24}));

  const west=[[61,182],[220,366],[402,581],[616,809],[846,977]];
  const east=[[1126,1287],[1321,1476],[1512,1674],[1711,1871],[1908,2083]];
  const bands=[[127,226],[292,450],[519,682],[767,926],[997,1178],[1250,1390]];
  const streetsY=[101,256,489,726,964,1218,1422];
  const streetsX=[45,200,385,598,828,1108,1304,1494,1693,1888,2104];
  const mainBridge=plaza.y,bridges=[256,mainBridge,1218],canal={left:994,right:1090};
  const bridgeLamps=[{x:1001,y:mainBridge-30},{x:1083,y:mainBridge-30},
    {x:1001,y:mainBridge+31},{x:1083,y:mainBridge+31}];

  const CRYSTALS=[[935,690],[907,690],[886,790],[1900,1091],[1876,1091],[1820,1044],[1850,1044],[1000,690],[1084,690]];
  const parks=[
    {id:'atrium',x:409,y:300,w:176,h:150,tone:'lenses'},
    {id:'work-yard',x:622,y:787,w:185,h:125,tone:'kilns'},
    {id:'market-yard',x:1509,y:776,w:166,h:132,tone:'wind'},
    {id:'lamp-garden',x:1708,y:995,w:367,h:188,tone:'lamps'}
  ];

  const plazaRect={x:847,y:660,w:135,h:138};
  const annexStops=[
    {id:'arcades-court',x:2460,y:489,name:'Corte dei Soffiatori',district:'arcades'},
    {id:'arcades-work',x:2350,y:475,name:'Banco delle ampolle',district:'arcades'},
    {id:'arcades-loggia',x:2642,y:256,name:'Loggia delle Vetrerie',district:'arcades'},
    {id:'arcades-lane',x:2718,y:489,name:'Passaggio delle Vetrate',district:'arcades'},
    {id:'arcades-crossing',x:2516,y:726,name:'Crocevia dei Carrettieri',district:'arcades'},
    {id:'orchards-court',x:2516,y:1218,name:'Piazzetta delle Radici',district:'orchards'},
    {id:'orchards-work',x:2624,y:1160,name:'Orto delle spezie',district:'orchards'}
  ];
  const landmarkRows=[
    {name:'Porta dei Maestri',x:156,y:726},
    {...plaza},
    {name:'Ponte delle Lenti',x:1042,y:726},
    {name:'Corte delle Fornaci',x:717,y:954},
    {name:'Giardino delle Tre Vasche',x:1888,y:1016},
    ...services.map(({id,name,x,y})=>({id,name,x,y})),...annexStops
  ];
  const region={id,name:'Accademia di Velaris',description:'La città dei vetrai e degli astronomi, distesa fra corsi d’acqua e giardini.',
    width,height,continent:'continent-3',spawn,points:{gates:[],mobs:[],resources:[],bosses:[]},landmarks:landmarkRows};
  const waypointList=[
    {id:'entry',name:'Porta dei Maestri',...spawn}, {id:'exit',name:'Ritorno agli Alambicchi',...exit}, {...plaza},
    ...services.map(({id,name,x,y,district})=>({id,name,x,y,district})),
    ...districts.map(({id,name,x,y})=>({id:'district-'+id,name,x,y,district:id})),
    ...streetsX.slice(1,-1).flatMap((x,col)=>streetsY.slice(1,-1).map((y,row)=>({id:'street-'+col+'-'+row,x,y}))),...annexStops
  ].map(Object.freeze);

  const districtAt=(x,y)=>districts[x>=annexStart?(y<759?4:5):x<canal.left?(y<759?0:1):(y<759?2:3)];
  const contains=(box,x,y,margin=0)=>x>=box.x-margin&&x<=box.x+box.w+margin&&y>=box.y-margin&&y<=box.y+box.h+margin;
  const touches=(a,b,pad=0)=>a.x<b.x+b.w+pad&&a.x+a.w+pad>b.x&&a.y<b.y+b.h+pad&&a.y+a.h+pad>b.y;
  function random(seed){
    let state=(Number(seed)>>>0)^0x0c35d86d;
    return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  }
  function integer(next,lo,hi){return lo+Math.floor(next()*(hi-lo+1));}
  function asPoint(value,waypoints){
    if(typeof value==='string')return waypoints.get(value)||null;
    if(!value||!Number.isFinite(value.x)||!Number.isFinite(value.y))return null;
    return value;
  }
  function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function rect(c,color,x,y,w=1,h=1){c.fillStyle=color;c.fillRect(x|0,y|0,w|0,h|0);}
  function poly(c,color,row){
    c.fillStyle=color;c.beginPath();
    for(const [i,[x,y]] of row.entries())if(i)c.lineTo(x|0,y|0);else c.moveTo(x|0,y|0);
    c.closePath();c.fill();
  }
  function disk(c,color,x,y,rx,ry){
    c.fillStyle=color;
    for(let v=-ry;v<=ry;v++){
      const d=Math.floor(rx*Math.sqrt(Math.max(0,1-(v/ry)**2)));
      c.fillRect((x|0)-d,(y|0)+v,2*d+1,1);
    }
  }
  // Sprite precalcolati per alberi e cristalli: stesso disegno, un solo drawImage al posto di decine di rettangoli.
  const propSprites=new Map();
  function propSprite(key,paint){
    let image=propSprites.get(key);
    if(!image){
      image=canvas(48,48);
      paint(image.getContext('2d'),24,38);
      propSprites.set(key,image);
    }
    return image;
  }
  function paintTreeBody(g,x,y,s1,s2){
    rect(g,'#62564a',x-2,y-19,4,19);rect(g,'#927759',x-1,y-16,1,16);
    disk(g,'#3c574f',x+s1,y-19,14,13);disk(g,'#59745b',x-3+s1,y-22,12,11);
    disk(g,'#738962',x-4+s2,y-26,9,6);disk(g,'#939b6d',x-5+s2,y-29,5,3);
    for(let i=0;i<10;i++)rect(g,i%2?'#9fa67b':'#416353',x-12+(i*7)%23+s1,y-25+(i*11)%15,1+(i%3),1);
  }
  function paintCrystalBody(g,x,y,bright){
    poly(g,'#356f78',[[x-5,y],[x-3,y-9],[x-1,y-12],[x+1,y-4],[x,y]]);
    poly(g,bright?'#8ff0e4':'#6fd5d1',[[x-2,y],[x,y-15],[x+2,y-17],[x+4,y-8],[x+4,y]]);
    poly(g,'#b8fff4',[[x,y-4],[x+1,y-15],[x+2,y-16],[x+2,y-5]]);
    poly(g,'#46969b',[[x+3,y],[x+5,y-7],[x+8,y-9],[x+8,y]]);
  }
  function diamond(c,color,x,y,r=4){poly(c,color,[[x,y-r],[x+r,y],[x,y+r],[x-r,y]]);}
  function makeLampGlow(){
    const image=canvas(88,62),g=image.getContext('2d');
    g.save();
    g.translate(44,33);g.scale(1,.49);
    const pool=g.createRadialGradient(0,0,0,0,0,43);
    pool.addColorStop(0,'rgba(255,182,86,.42)');
    pool.addColorStop(.36,'rgba(248,160,69,.25)');
    pool.addColorStop(1,'rgba(212,101,43,0)');
    rect(g,pool,-44,-44,88,88);
    g.restore();
    const lantern=g.createRadialGradient(44,14,0,44,14,14);
    lantern.addColorStop(0,'rgba(255,196,98,.49)');
    lantern.addColorStop(.3,'rgba(255,166,73,.20)');
    lantern.addColorStop(1,'rgba(255,138,53,0)');
    rect(g,lantern,30,0,28,28);
    return image;
  }
  // Sprite di luce precalcolati, uno per tipo: la luce non usa gradienti a ogni fotogramma.
  const glowTones={
    crystal:{pool:['rgba(126,238,226,.34)','rgba(96,206,214,.18)','rgba(70,160,205,0)'],core:['rgba(190,255,245,.55)','rgba(120,230,230,.22)','rgba(90,190,230,0)']},
    forge:{pool:['rgba(255,150,70,.40)','rgba(236,104,48,.22)','rgba(190,60,30,0)'],core:['rgba(255,190,110,.50)','rgba(245,130,60,.20)','rgba(220,90,40,0)']}
  };
  function makeToneGlow(tone){
    const image=canvas(88,62),g=image.getContext('2d');
    g.save();g.translate(44,33);g.scale(1,.49);
    const pool=g.createRadialGradient(0,0,0,0,0,43);
    pool.addColorStop(0,tone.pool[0]);pool.addColorStop(.36,tone.pool[1]);pool.addColorStop(1,tone.pool[2]);
    rect(g,pool,-44,-44,88,88);g.restore();
    const core=g.createRadialGradient(44,14,0,44,14,14);
    core.addColorStop(0,tone.core[0]);core.addColorStop(.3,tone.core[1]);core.addColorStop(1,tone.core[2]);
    rect(g,core,30,0,28,28);
    return image;
  }
  // Movimento ridotto: opzione effetti del gioco oppure preferenza di sistema.
  let motionQuery;
  function calm(){
    if(window.UI?.effects===false)return true;
    try{if(motionQuery===undefined)motionQuery=window.matchMedia?.('(prefers-reduced-motion: reduce)')||null;}catch{motionQuery=null;}
    return !!motionQuery?.matches;
  }
  // Stato della luce derivato dal calendario, letto una volta per fotogramma.
  let scene={calm:false,known:false,day:1,night:0,twilight:0,sunDx:0,minutes:720};
  function readScene(regionId){
    const state=window.Game?.s,still=calm();
    if(!state?.calendar||!window.Calendar){scene={calm:still,known:false,day:1,night:0,twilight:0,sunDx:0,minutes:720};return scene;}
    const {minutes,sunriseMinutes,sunsetMinutes}=window.Calendar.view(state.calendar,state.time,regionId);
    const daytime=minutes>=sunriseMinutes&&minutes<=sunsetMinutes,length=sunsetMinutes-sunriseMinutes;
    const light=daytime?Math.sin((minutes-sunriseMinutes)*Math.PI/length):
      -Math.sin(((minutes-sunsetMinutes+1440)%1440)*Math.PI/(1440-length));
    const progress=daytime?(minutes-sunriseMinutes)/length:.5;
    scene={calm:still,known:true,day:Math.max(0,light),night:Math.max(0,-light),twilight:Math.max(0,1-Math.abs(light)*4),
      sunDx:daytime?Math.round((progress-.5)*20):0,minutes};
    return scene;
  }
  function hasWater(x,y,r=0){
    if(x+r<canal.left||x-r>canal.right)return false;
    return !bridges.some(at=>y-r>=at-28&&y+r<=at+28);
  }

  function create(seed=19425){
    const next=random(seed),cell=96,cells=new Map(),buildings=[],props=[],routes=new Map();
    const indexed=(x,y)=>Math.floor(x/cell)+Math.floor(y/cell)*64;
    function solid(box){
      const minX=Math.floor((box.x-12)/cell),maxX=Math.floor((box.x+box.w+12)/cell);
      const minY=Math.floor((box.y-12)/cell),maxY=Math.floor((box.y+box.h+12)/cell);
      for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
        const key=x+y*64;
        if(!cells.has(key))cells.set(key,[]);
        cells.get(key).push(box);
      }
    }
    function addBuilding({name,kind,x,y,w,h,door,district,style,service=null}){
      const box={x:Math.round(x-w/2),y:Math.round(y),w,h};
      const color=integer(next,0,2),skin=integer(next,0,0xffff);
      const entry={id:service||'velaris-building-'+String(buildings.length+1).padStart(3,'0'),
        name,kind,style,district,box,door,front:box.y+box.h,color,skin,service};
      buildings.push(entry);
      solid(box);
      return entry;
    }
    function addVenue(entry){
      const [w,h]=entry.size;
      addBuilding({name:entry.name,kind:entry.kind,x:entry.x,y:entry.y-19-h,w,h,door:entry.point,
        district:entry.district,style:entry.style,service:entry.id});
    }
    for(const entry of services)if(entry.x<annexStart)addVenue(entry);
    const obstruction=[...buildings.map(b=>({x:b.box.x-9,y:b.box.y-14,w:b.box.w+18,h:b.box.h+41})),
      ...parks,plazaRect];
    const surnames=['Aster','Laguna','Vetro','Brezza','Caligo','Mica','Ambra','Faro','Selce','Argento','Smeraldo','Nube','Tiglio'];
    for(const [row,[top,bottom]] of bands.entries()){
      for(const [col,[left,right]] of [...west,...east].entries()){
        const blockWidth=right-left;
        for(let slot=0;slot<2;slot++){
          const subWidth=blockWidth/2;
          const dimW=integer(next,Math.floor(subWidth*.56),Math.floor(subWidth*.83));
          const h=integer(next,32,62);
          const x=Math.round(left+subWidth*(slot+.5))+integer(next,-4,4);
          const maxY=bottom-h-16;
          const y=integer(next,top+3,Math.max(maxY,top+3));
          const box={x:x-dimW/2,y,w:dimW,h};
          if(obstruction.some(o=>touches(o,box,8)))continue;
          if(next()<.035)continue;
          const dto=districtAt(x,y);
          const byDistrict={
            lenses:['estate','house','tower','house','gallery'],
            kilns:['shed','house','workroom','shed','house'],
            wind:['shop','house','inn','warehouse','gallery'],
            lamps:['house','villa','house','tower','villa']
          };
          const choices=byDistrict[dto.id];
          const style=choices[integer(next,0,choices.length-1)];
          const base=style==='shed'||style==='workroom'?'Officina':style==='shop'?'Bottega':style==='warehouse'?'Magazzino':style==='tower'?'Torre':style==='inn'?'Osteria':style==='gallery'?'Galleria':'Casa';
          const e=addBuilding({name:base+' '+surnames[(row*19+col*5+slot*8+integer(next,0,4))%surnames.length],
            kind:style==='house'||style==='estate'||style==='villa'?'residence':style,x,y,w:dimW,h,
            door:{x,y:y+h+12},district:dto.id,style});
          obstruction.push({...e.box,w:e.box.w,h:e.box.h});
        }
      }
    }
    addVenue(services.find(site=>site.id==='greenhouse'));
    // These plots face the next street to the south. Empty plots reserve courtyards, beds and the glasshouse.
    const rows=[
      [256,[2192,2296,2397,2515,2638,2780]], [489,[2208,2324,2495,2614,2768]],
      [726,[2198,2318,2425,2548,2673,2788]], [964,[2215,2322,2514,2638,2778]],
      [1218,[2212,2315,2773]], [1422,[2198,2322,2469,2589,2701,2787]]
    ];
    const styles={arcades:['loggia','bellhouse','atelier','gallery'],orchards:['longhouse','herb-loft','cottage']};
    const names={loggia:'Loggia',bellhouse:'Torre',atelier:'Vetreria',gallery:'Galleria',longhouse:'Fattoria','herb-loft':'Essiccatoio',cottage:'Casa'};
    for(const [rowIndex,[street,plots]] of rows.entries())for(const [col,center] of plots.entries()){
      const district=street<759?'arcades':'orchards',family=styles[district];
      const style=family[(rowIndex+col)%family.length],w=integer(next,style==='bellhouse'?40:65,style==='bellhouse'?60:84);
      const h=integer(next,39,69),x=center+integer(next,-5,5),doorY=street-integer(next,68,103);
      addBuilding({name:names[style]+' '+surnames[(rowIndex*5+col)%surnames.length],kind:['bellhouse','cottage','longhouse','gallery'].includes(style)?'residence':'workshop',
        x,y:doorY-h-12,w,h,door:{x,y:doorY},district,style});
    }
    const add=(name,x,y,opt={})=>{
      const prop={name,x,y,...opt};
      props.push(prop);
      if(opt.solid){const r=opt.solid;solid({x:x-r,y:y-r*.7,w:r*2,h:r*1.4});}
    };
    for(const sy of streetsY.slice(1,-1)){
      for(const sx of streetsX.slice(1,-1)){
        const ground=districtAt(sx,sy);
        if(sx===828&&sy===726)continue;
        add('lamp',sx+11,sy-9,{district:ground.id});
      }
    }
    for(const packet of [
      ['atelier',704,869,'kilns'],['market',1593,850,'wind'],
      ['bridge',1067,726,'wind'],['gate',94,726,'lenses']
    ])add('banner',packet[1],packet[2],{label:packet[0],district:packet[3]});
    for(const [x,y] of [[1834,1034],[1950,1034],[1878,1122]])add('pond',x,y,{solid:19,district:'lamps'});
    for(const [x,y] of [[1739,1031],[1774,1135],[1771,1083],[2014,1020],[2046,1118],
      [1951,1132],[1945,1090],[2020,1161],[1739,1157],[1780,1017],[908,668],[958,668],
      [924,799],[444,317],[573,323],[631,866],[788,818],[1526,837],[1667,884]])add('tree',x,y,{solid:6,district:districtAt(x,y).id});
    for(const [x,y] of [[921,683],[898,783],[1888,1083]])add('fountain',x,y,{solid:9,district:districtAt(x,y).id});
    for(const [x,y] of [[674,824],[737,844],[778,889],[1529,879],[1644,824],[1573,788],[1791,1125],[1962,1162],
      [830,775],[1458,687],[1105,779]])add('crate',x,y,{district:districtAt(x,y).id});
    for(const [x,y] of [[1557,814],[1638,853],[1577,887]])add('stall',x,y,{district:'wind',solid:9});
    for(const [x,y] of [[662,807],[767,864]])add('anvil',x,y,{district:'kilns',solid:7});
    for(const {x,y} of bridgeLamps)add('prismLamp',x,y);
    // Cristalli luminosi: solo decorazione, senza collisione.
    for(const [x,y] of CRYSTALS)add('crystal',x,y,{district:districtAt(x,y).id});
    for(const [x,y] of [[2398,454],[2514,454],[2398,534],[2514,534]])add('prismLamp',x,y);
    for(const [x,y] of [[2158,265],[2430,266],[2642,267],[2718,500],[2158,741],[2499,742],
      [2157,974],[2457,975],[2678,975],[2540,1130],[2599,1130],[2450,1230],[2535,1231],
      [2642,1230],[2770,1231],[2158,1433],[2445,1433],[2688,1433]])add('lamp',x,y);
    for(const [x,y] of [[2332,451],[2535,468],[2535,510]])add('stall',x,y,{solid:9,district:'arcades'});
    add('lensSpire',2460,458,{solid:10,district:'arcades'});
    for(const [x,y] of [[2394,1026],[2426,1026],[2394,1071],[2426,1071],[2394,1116],[2426,1116],[2664,1150],[2700,1150]])
      add('fruitTree',x,y,{solid:6,district:'orchards'});
    add('fountain',2516,1185,{solid:9,district:'orchards'});
    add('prismLamp',863,675);
    add('prismLamp',965,780);
    for(const entry of services)add('sign',entry.x+12,entry.y-5,{district:entry.district,label:entry.id});
    for(const b of buildings){
      if(b.service||b.skin%4>1)continue;
      const x=b.door.x+(b.skin&1?1:-1)*Math.min(20,Math.floor(b.box.w/3));
      const y=b.door.y-5;
      add(b.district==='kilns'?'crate':'planter',x,y,{district:b.district});
    }

    function canWalk(x,y,r=6){
      if(!Number.isFinite(x)||!Number.isFinite(y)||x-r<29||y-r<31||x+r>width-28||y+r>height-30||hasWater(x,y,r))return false;
      const local=cells.get(indexed(x,y));
      return !local?.some(box=>{
        const px=Math.min(box.x+box.w,Math.max(box.x,x)),py=Math.min(box.y+box.h,Math.max(box.y,y));
        return (x-px)**2+(y-py)**2<=r*r;
      });
    }

    // Verifica esatta di un tratto rettilineo per un corpo di raggio r: stesso criterio di canWalk
    // (limiti, canale fuori dai ponti, edifici e oggetti solidi), ma su tutto il segmento e non a campioni.
    // Un tratto che la supera non sfiora mai un ostacolo, qualunque sia la densità del controllo successivo.
    // PERF-001: stesse operazioni e stesso ordine di prima, senza array e funzioni temporanee a ogni chiamata.
    const outside=(s,r)=>!Number.isFinite(s.x)||!Number.isFinite(s.y)||s.x-r<29||s.y-r<31||s.x+r>width-28||s.y+r>height-30;
    function segmentClear(p,q,r){
      const margin=1e-3;
      if(outside(p,r)||outside(q,r))return false;
      const dx=q.x-p.x,dy=q.y-p.y;
      // Canale: dove il corpo tocca la fascia d'acqua, l'intero tratto deve restare dentro uno stesso ponte.
      const lo=canal.left-r-margin,hi=canal.right+r+margin;
      let t0=0,t1=1;
      if(dx===0){if(p.x<lo||p.x>hi)t0=2;}
      else{const a=(lo-p.x)/dx,b=(hi-p.x)/dx;t0=Math.max(0,Math.min(a,b));t1=Math.min(1,Math.max(a,b));}
      if(t0<=t1){
        const ya=p.y+dy*t0,yb=p.y+dy*t1,top=Math.min(ya,yb),bottom=Math.max(ya,yb);
        let onBridge=false;
        for(let k=0;k<bridges.length;k++){const at=bridges[k];if(top-r>=at-28+margin&&bottom+r<=at+28-margin){onBridge=true;break;}}
        if(!onBridge)return false;
      }
      // Edifici e oggetti solidi registrati nelle celle attraversate dal tratto.
      const minX=Math.floor((Math.min(p.x,q.x)-r)/cell),maxX=Math.floor((Math.max(p.x,q.x)+r)/cell);
      const minY=Math.floor((Math.min(p.y,q.y)-r)/cell),maxY=Math.floor((Math.max(p.y,q.y)+r)/cell);
      const limit=(r+margin)**2;
      for(let cy=minY;cy<=maxY;cy++)for(let cx=minX;cx<=maxX;cx++){
        const list=cells.get(cx+cy*64);
        if(list)for(let k=0;k<list.length;k++)if(segmentBoxDistance2(p,q,list[k])<=limit)return false;
      }
      return true;
    }
    // Memoria dei passi della griglia (12 px) già verificati, per raggio: la ricerca resta esatta ma non ripete i controlli.
    const gridMemo=new Map();
    function gridStep(nx,size,r,from,to){
      let memo=gridMemo.get(r);
      if(!memo){memo={east:new Uint8Array(size),south:new Uint8Array(size)};gridMemo.set(r,memo);}
      const low=Math.min(from,to),horizontal=Math.abs(to-from)===1,table=horizontal?memo.east:memo.south;
      if(!table[low]){
        const a={x:(low%nx)*12,y:Math.floor(low/nx)*12},b=horizontal?{x:a.x+12,y:a.y}:{x:a.x,y:a.y+12};
        table[low]=segmentClear(a,b,r)?1:2;
      }
      return table[low]===1;
    }
    // PERF-001: buffer della ricerca (riusati a ogni chiamata) e memoria dei nodi percorribili per raggio.
    let searchCosts=null,searchQueue=null;
    const walkMemo=new Map();
    function searchBuffers(size,r){
      if(!searchCosts||searchCosts.length!==size){searchCosts=new Int32Array(size);searchQueue=new Int32Array(size);}
      let walk=walkMemo.get(r);
      if(!walk){walk=new Uint8Array(size);walkMemo.set(r,walk);}
      let memo=gridMemo.get(r);
      if(!memo){memo={east:new Uint8Array(size),south:new Uint8Array(size)};gridMemo.set(r,memo);}
      return {costs:searchCosts,queue:searchQueue,walk,memo};
    }
    // Distanza al quadrato fra un punto e un rettangolo, e fra un punto e il segmento p→p+(dx,dy): stesse formule di prima.
    const boxGap2=(x,y,x0,y0,x1,y1)=>{const px=Math.min(x1,Math.max(x0,x)),py=Math.min(y1,Math.max(y0,y));return (x-px)**2+(y-py)**2;};
    const lineGap2=(x,y,p,dx,dy,len2)=>{const t=len2?Math.max(0,Math.min(1,((x-p.x)*dx+(y-p.y)*dy)/len2)):0;return (x-p.x-dx*t)**2+(y-p.y-dy*t)**2;};
    function segmentBoxDistance2(p,q,box){
      const x0=box.x,y0=box.y,x1=box.x+box.w,y1=box.y+box.h,dx=q.x-p.x,dy=q.y-p.y;
      // Intersezione segmento-rettangolo (Liang-Barsky): distanza nulla. Le quattro coppie (den, num) nello stesso ordine.
      let a=0,b=1,hit=true;
      for(let k=0;k<4&&hit;k++){
        const den=k===0?-dx:k===1?dx:k===2?-dy:dy,num=k===0?p.x-x0:k===1?x1-p.x:k===2?p.y-y0:y1-p.y;
        if(den===0){if(num<0)hit=false;continue;}
        const t=num/den;
        if(den<0){if(t>b)hit=false;else if(t>a)a=t;}else{if(t<a)hit=false;else if(t<b)b=t;}
      }
      if(hit&&a<=b)return 0;
      const len2=dx*dx+dy*dy;
      return Math.min(boxGap2(p.x,p.y,x0,y0,x1,y1),boxGap2(q.x,q.y,x0,y0,x1,y1),lineGap2(x0,y0,p,dx,dy,len2),
        lineGap2(x1,y0,p,dx,dy,len2),lineGap2(x0,y1,p,dx,dy,len2),lineGap2(x1,y1,p,dx,dy,len2));
    }

    const waypoints=waypointList.filter(w=>canWalk(w.x,w.y)).map(w=>({...w,district:w.district||districtAt(w.x,w.y).id}));
    const wayBook=new Map(waypoints.map(w=>[w.id,w]));
    const residences=buildings.filter(b=>b.kind==='residence'&&canWalk(b.door.x,b.door.y)).map(b=>(
      {id:b.id,building:b.id,name:b.name,district:b.district,kind:b.kind,region:id,...b.door,point:{...b.door}}
    ));

    function path(from,to,r=6){
      const a=asPoint(from,wayBook),b=asPoint(to,wayBook);
      if(!a||!b||!canWalk(a.x,a.y,r)||!canWalk(b.x,b.y,r))return [];
      const key=[Math.round(a.x),Math.round(a.y),Math.round(b.x),Math.round(b.y),r].join(':');
      if(routes.has(key))return routes.get(key);
      // Prima i campioni a 4 px scartavano i tratti che sfioravano spigoli e ponti fra un campione e l'altro (BUG-011).
      const clear=(p,q)=>segmentClear(p,q,r);
      if(clear(a,b))return [{x:a.x,y:a.y},{x:b.x,y:b.y}];
      const step=12,nx=Math.ceil(width/step),ny=Math.ceil(height/step),size=nx*ny;
      const at=(x,y)=>y*nx+x,xy=index=>({x:(index%nx)*step,y:Math.floor(index/nx)*step});
      function closest(pt){
        const cx=Math.round(pt.x/step),cy=Math.round(pt.y/step);
        let result=-1,min=Infinity;
        for(let j=-3;j<=3;j++)for(let i=-3;i<=3;i++){
          if(cx+i<0||cx+i>=nx||cy+j<0||cy+j>=ny)continue;
          const nd=at(cx+i,cy+j),q=xy(nd),d=Math.hypot(q.x-pt.x,q.y-pt.y);
          if(nd>=0&&nd<size&&d<min&&clear(pt,q)){min=d;result=nd;}
        }
        return result;
      }
      const start=closest(a),end=closest(b);
      if(start<0||end<0)return [];
      // PERF-001: la ricerca in ampiezza è la stessa di prima (stessi nodi, stesso ordine dei vicini est, ovest, sud, nord,
      // stessi padri), quindi restituisce gli stessi percorsi. Cambia solo il costo: la percorribilità dei nodi è calcolata
      // una volta per raggio (la mappa non cambia dopo la creazione), i buffer si riusano e il ciclo non alloca memoria.
      const {costs,queue,walk,memo}=searchBuffers(size,r);
      costs.fill(-2);costs[start]=-1;queue[0]=start;
      let used=1;
      const open=n=>{
        let w=walk[n];
        if(!w)w=walk[n]=canWalk((n%nx)*step,Math.floor(n/nx)*step,r)?1:2;
        return w===1;
      };
      const passable=(cur,n)=>{
        const low=cur<n?cur:n,table=n-cur===1||cur-n===1?memo.east:memo.south;
        if(!table[low])return gridStep(nx,size,r,cur,n);
        return table[low]===1;
      };
      for(let i=0;i<used;i++){
        const cur=queue[i];
        if(cur===end)break;
        const x=cur%nx,y=Math.floor(cur/nx);
        let n=cur+1;
        if(x+1<nx&&costs[n]===-2&&open(n)&&passable(cur,n)){costs[n]=cur;queue[used++]=n;}
        n=cur-1;
        if(x>0&&costs[n]===-2&&open(n)&&passable(cur,n)){costs[n]=cur;queue[used++]=n;}
        n=cur+nx;
        if(y+1<ny&&costs[n]===-2&&open(n)&&passable(cur,n)){costs[n]=cur;queue[used++]=n;}
        n=cur-nx;
        if(y>0&&costs[n]===-2&&open(n)&&passable(cur,n)){costs[n]=cur;queue[used++]=n;}
      }
      if(costs[end]===-2)return [];
      const temp=[{x:b.x,y:b.y}];
      for(let i=end;i>=0;i=costs[i])temp.push(xy(i));
      temp.push({x:a.x,y:a.y});temp.reverse();
      const result=[temp[0]];
      for(let i=0;i<temp.length-1;){
        let next=Math.min(temp.length-1,i+20);
        while(next>i+1&&!clear(temp[i],temp[next]))next--;
        result.push(temp[next]);i=next;
      }
      if(routes.size>200)routes.delete(routes.keys().next().value);
      routes.set(key,result);
      return result;
    }

    let ground=null,chart=null,annexGround=null,annexChart=null;
    const lights=props.filter(o=>o.name==='lamp'||o.name==='prismLamp'||o.name==='crystal'||o.name==='anvil');
    const budget=8,glows={};
    const kindOf=o=>o.name==='crystal'?'crystal':o.name==='anvil'?'forge':'lamp';
    const glowOf=kind=>glows[kind]||(glows[kind]=kind==='lamp'?makeLampGlow():makeToneGlow(glowTones[kind]));
    const lift={lamp:34,crystal:22,forge:26};
    function drawLight(c,cam,time,e){
      if(!e.known)return [];
      if(e.twilight>.015)rect(c,`rgba(195,112,73,${.14*e.twilight})`,cam.x,cam.y,cam.w,cam.h);
      if(e.night>.015)rect(c,`rgba(15,28,61,${.55*e.night})`,cam.x,cam.y,cam.w,cam.h);
      const strength=Math.min(1,e.night*1.8+e.twilight*.26);
      const centerX=cam.x+cam.w/2,centerY=cam.y+cam.h/2;
      const near=lights.filter(o=>o.x+44>=cam.x&&o.x-44<=cam.x+cam.w&&o.y+28>=cam.y&&o.y-34<=cam.y+cam.h);
      near.sort((a,b)=>(a.x-centerX)**2+(a.y-centerY)**2-((b.x-centerX)**2+(b.y-centerY)**2));
      const active=[];
      c.save();c.globalCompositeOperation='screen';
      for(const o of near){
        const kind=kindOf(o);
        if(active.length>=budget){
          // Oltre le otto luci attive la lanterna mostra solo il filamento, senza alone.
          if(kind==='lamp'&&strength>.1){c.globalAlpha=Math.min(1,strength);rect(c,'#ffdf94',o.x-1,o.y-(o.name==='prismLamp'?21:19),2,3);}
          continue;
        }
        // Di giorno cristalli e fucine non disegnano l'alone (solo scintille nel sprite): niente costo extra a luce piena.
        const base=kind==='lamp'?strength*(o.name==='prismLamp'?1:.72):strength>.08?.3+.7*strength:0;
        if(base<.025)continue;
        const pulse=e.calm?1:kind==='crystal'?.82+.18*Math.sin(time*1.7+o.x*.37):kind==='forge'?.88+.12*Math.sin(time*5+o.x):.97+.03*Math.sin(time*2+o.x);
        const alpha=Math.min(1,base*pulse);
        c.globalAlpha=alpha;
        c.drawImage(glowOf(kind),o.x-44,o.y-lift[kind]);
        if(kind==='lamp')rect(c,'#ffdf94',o.x-1,o.y-(o.name==='prismLamp'?21:19),2,3);
        active.push({o,kind,alpha});
      }
      // Finestre accese: decalcomanie emissive, senza gradienti; non contano come luci.
      const wStrength=Math.min(1,e.night*2+e.twilight*.7);
      if(wStrength>.05){
        const m=e.minutes,fraction=m>=1000&&m<1400?.85:(m>=1400||m<300)?.3:.55;
        for(const b of buildings){
          const q=b.box;
          if(q.x>cam.x+cam.w+30||q.x+q.w<cam.x-30||q.y>cam.y+cam.h+30||q.y+q.h<cam.y-70||!b.sprite?.windows)continue;
          // Un solo disegno per edificio: lo strato delle finestre accese è precalcolato per fascia oraria.
          const lit=b.sprite.lit||(b.sprite.lit={});
          if(!lit[fraction]){
            const layer=canvas(b.sprite.image.width,b.sprite.image.height),g=layer.getContext('2d');
            b.sprite.windows.forEach((w,i)=>{
              if(((b.skin*31+i*17)%100)/100>=fraction)return;
              g.globalAlpha=.1;rect(g,'#ffaa55',w.x-2,w.y-2,w.w+4,w.h+5);
              g.globalAlpha=.6;rect(g,'#ffd882',w.x+1,w.y+1,w.w-2,w.h-1);
            });
            lit[fraction]=layer;
          }
          c.globalAlpha=wStrength;c.drawImage(lit[fraction],b.sprite.x,b.sprite.y);
        }
      }
      c.restore();
      return active;
    }
    // Riflessi sul canale: colonne spezzate sotto le luci vicine, ferme con movimento ridotto.
    function drawReflections(c,cam,e,active,time){
      if(!e.known||(e.night<.08&&e.twilight<.2))return;
      const tint={lamp:'255,205,120',crystal:'150,245,235',forge:'255,160,90'};
      for(const {o,kind,alpha} of active){
        if(o.x<canal.left-26||o.x>canal.right+26)continue;
        const x=Math.max(canal.left+6,Math.min(canal.right-6,o.x));
        for(let k=0;k<5;k++){
          const sway=e.calm?0:Math.round(Math.sin(time*1.6+k*.9+o.x*.1)*2);
          rect(c,`rgba(${tint[kind]},${(alpha*.6*(1-k*.15)).toFixed(3)})`,x-4+k%2+sway,o.y+5+k*5,8-(k>>1),1);
        }
      }
    }
    // Colori e particelle seguono i materiali e la vegetazione dei quartieri orientali.
    const [,,wind,lampsD,arcades,orchards]=districts;
    const moods=[
      {box:{minX:canal.right+4,maxX:annexStart-4,minY:wind.minY,maxY:wind.maxY},tint:'224,150,70',tintNight:'255,150,70',a:.055,moteColor:'#ecc88c',n:70},
      {box:{minX:canal.right+4,maxX:annexStart-4,minY:lampsD.minY,maxY:lampsD.maxY},tint:'70,150,100',tintNight:'40,170,160',a:.065,moteColor:'#faf6c4',firefly:'#d8f58a',n:90},
      {box:arcades,tint:'102,180,190',tintNight:'84,165,198',a:.09,moteColor:'#bce4d7',n:52},
      {box:orchards,tint:'159,184,100',tintNight:'123,168,96',a:.1,moteColor:'#e3d29f',firefly:'#f4d578',n:58}
    ];
    function band(c,cam,d,rgb,a){
      for(let k=0;k<2;k++){
        const x0=Math.max(cam.x,d.minX+k*20),y0=Math.max(cam.y,d.minY+k*20);
        const x1=Math.min(cam.x+cam.w,d.maxX-k*20),y1=Math.min(cam.y+cam.h,d.maxY-k*20);
        if(x1>x0&&y1>y0)rect(c,`rgba(${rgb},${a/2})`,x0,y0,x1-x0,y1-y0);
      }
    }
    function drawMood(c,cam,e){
      for(const m of moods){
        const d=m.box;
        if(d.maxX<cam.x||d.minX>cam.x+cam.w||d.maxY<cam.y||d.minY>cam.y+cam.h)continue;
        band(c,cam,d,e.night>.4?m.tintNight:m.tint,m.a*(.5+.5*Math.max(e.day,e.twilight)+.4*e.night));
      }
    }
    function drawMotes(c,cam,e,time){
      if(!e.known)return;
      for(const m of moods){
        const d=m.box,w=d.maxX-d.minX,h=d.maxY-d.minY;
        if(d.minX>cam.x+cam.w||d.maxX<cam.x||d.minY>cam.y+cam.h||d.maxY<cam.y)continue;
        const garden=!!m.firefly,glowing=garden&&(e.night>.1||e.twilight>.25);
        c.save();
        if(glowing)c.globalCompositeOperation='screen';
        for(let i=0;i<m.n;i++){
          const wx=d.minX+((i*197+(e.calm?0:time*(garden?2:6)))%w);
          const wy=d.minY+((i*89)%h)+(e.calm?0:Math.sin(time*(garden?.9:.7)+i)*4);
          if(wx<cam.x||wx>cam.x+cam.w||wy<cam.y||wy>cam.y+cam.h)continue;
          if(glowing){
            const pulse=e.calm?.55:Math.max(0,Math.sin(time*1.3+i*1.7));
            if(pulse<.08)continue;
            c.globalAlpha=.7*pulse;rect(c,m.firefly,wx,wy,2,2);
            c.globalAlpha=.16*pulse;rect(c,m.firefly,wx-1,wy-1,4,4);
          }else{c.globalAlpha=garden?.38:.3;rect(c,m.moteColor,wx,wy,1,1);}
        }
        c.restore();
      }
    }
    // Ombre a terra degli edifici: direzione e lunghezza seguono l'ora del calendario.
    function drawShadows(c,cam,e){
      const alpha=e.known?.1+.17*e.day:.2;
      const dx=e.sunDx;
      c.fillStyle=`rgba(22,31,40,${alpha})`;
      c.beginPath();
      for(const b of buildings){
        const q=b.box;
        if(q.x>cam.x+cam.w+40||q.x+q.w<cam.x-40||b.front<cam.y-10||b.front>cam.y+cam.h+30)continue;
        const reach=Math.round(dx*(.8+q.h/90)),y0=b.front-3;
        c.moveTo(q.x,y0);c.lineTo(q.x+q.w,y0);c.lineTo(q.x+q.w+reach,y0+7);c.lineTo(q.x+reach,y0+7);c.closePath();
      }
      c.fill();
    }
    function drawGround(c,cam,time=0){
      const x=Math.max(0,Math.floor(cam.x)),y=Math.max(0,Math.floor(cam.y));
      const cw=Math.min(width-x,Math.ceil(cam.w)+1),ch=Math.min(height-y,Math.ceil(cam.h)+1);
      if(cw<=0||ch<=0)return;
      if(x<annexStart){
        if(!ground){const pair=paintTerrain(seed,buildings);ground=pair.ground;chart=pair.chart;}
        const visibleWidth=Math.min(cw,annexStart-x);
        c.drawImage(ground,x,y,visibleWidth,ch,x,y,visibleWidth,ch);
      }
      if(x+cw>annexStart){
        if(!annexGround)annexGround=paintAnnex(seed,buildings,false);
        const left=Math.max(x,annexStart),visibleWidth=x+cw-left;
        c.drawImage(annexGround,left-annexStart,y,visibleWidth,ch,left,y,visibleWidth,ch);
      }
      if(x+cw<canal.left||x>canal.right)return;
      const e=readScene(id),u=e.calm?0:Math.floor(time*4);
      const glintA=e.night>.35?'rgba(140,176,235,.30)':e.twilight>.3?'rgba(240,170,120,.30)':'rgba(121,199,185,.28)';
      const glintB=e.night>.35?'rgba(170,200,240,.14)':e.twilight>.3?'rgba(250,196,140,.15)':'rgba(142,214,185,.14)';
      for(let py=Math.floor(y/11)*11;py<y+ch;py+=11){
        if(bridges.some(at=>Math.abs(at-py)<=36))continue;
        const dx=canal.left+9+((py*13+u*3)%57);
        const extent=5+(py+u)%9;
        rect(c,glintA,dx,py,extent);
        rect(c,glintB,dx+2,py+1,extent-3);
        if(Math.abs(mainBridge-py)<82){
          const glintX=canal.left+11+(py+u)%7;
          rect(c,'rgba(188,193,151,.25)',glintX,py+2,4);
          rect(c,'rgba(188,193,151,.21)',canal.right-16+(py+u)%5,py+2,5);
        }
      }
    }
    function drawFront(c,cam,t,actors=[]){
      const visible=(x,y,rx=64,ry=76)=>x>=cam.x-rx&&x<=cam.x+cam.w+rx&&y>=cam.y-20&&y<=cam.y+cam.h+ry;
      const e=readScene(id),p=actors[0],entries=[];
      e.treeShadow=`rgba(36,53,56,${e.known?(.2+.32*e.day).toFixed(2):.52})`;
      drawShadows(c,cam,e);
      for(const b of buildings){
        const q=b.box,anchor=q.x+q.w/2;
        if(visible(anchor,b.front,q.w/2+14,q.h+68))entries.push({y:b.front,draw(g){
          if(!b.sprite)b.sprite=makeBuilding(b);
          const hidden=p&&p.y<b.front&&p.y>q.y-22&&p.x>q.x-2&&p.x<q.x+q.w+2;
          if(hidden){g.save();g.globalAlpha=.46;}
          g.drawImage(b.sprite.image,b.sprite.x,b.sprite.y);
          if(hidden)g.restore();
        }});
      }
      for(const o of props)if(visible(o.x,o.y,42,50))entries.push({y:o.y,draw:g=>paintProp(g,o,t)});
      for(const actor of actors)if(visible(actor.x,actor.y,45,63))entries.push(actor);
      entries.sort((a,b)=>a.y-b.y);
      for(const entry of entries)entry.draw(c);
      drawMood(c,cam,e);
      const active=drawLight(c,cam,t,e);
      drawReflections(c,cam,e,active,t);
      drawMotes(c,cam,e,t);
    }
    function drawMap(c,w,h,p){
      if(!chart){const pair=paintTerrain(seed,buildings);ground=pair.ground;chart=pair.chart;}
      if(!annexChart)annexChart=paintAnnex(seed,buildings,true);
      c.save();c.imageSmoothingEnabled=false;
      c.drawImage(chart,0,0,w*oldWidth/width,h);
      c.drawImage(annexChart,w*annexStart/width,0,w*(width-annexStart)/width,h);
      for(const place of services){
        const x=place.x/width*w,y=place.y/height*h;
        rect(c,'#2f4148',x-2,y-2,5,5);rect(c,'#d6c69e',x-1,y-1,3,3);
      }
      if(p)diamond(c,'#fff3bb',p.x/width*w,p.y/height*h,3);
      c.restore();
    }
    return {region,buildings,districts,services,residences,waypoints,plaza,drawGround,drawFront,drawMap,canWalk,path,districtAt};
  }

  function paintPlaza(c,rnd){
    const {x,y,w,h}=plazaRect,cx=plaza.x,cy=plaza.y;
    const cut=[[x-2,y+12],[x+10,y-2],[x+w-11,y-2],[x+w+2,y+12],
      [x+w+2,y+h-13],[x+w-11,y+h+2],[x+10,y+h+2],[x-2,y+h-13]];
    poly(c,'#4f5554',cut);
    c.save();c.beginPath();
    c.moveTo(...cut[0]);
    for(const corner of cut.slice(1))c.lineTo(...corner);
    c.closePath();c.clip();
    rect(c,'#7a786c',x,y,w,h);
    const stones=['#a79e87','#bdb095','#aaa48d','#a39e91','#b0a993'];
    for(let row=0;row<18;row++){
      for(let col=0;col<10;col++){
        const p=x-9+(row%2)*7+col*15,q=y+3+row*8;
        const shade=integer(rnd,0,4);
        rect(c,stones[shade],p,q,14,7);
        if(shade<3)rect(c,'#c7bd9e',p+1,q,11);
        if(shade===1||shade===4)rect(c,'#8d8777',p+3,q+5,5);
      }
    }
    for(const edge of [x+5,x+w-9]){
      rect(c,'#77817b',edge,y+13,4,h-26);
      rect(c,'#c3ab78',edge+1,y+14,1,h-28);
      for(let p=y+18;p<y+h-18;p+=15)diamond(c,'#d0c09c',edge+1,p,2);
    }
    for(const edge of [y+6,y+h-8]){
      rect(c,'#71807a',x+13,edge,w-26,3);
      rect(c,'#c3ab78',x+14,edge+1,w-28);
    }
    rect(c,'#c2af82',cx-1,cy-51,3,104);
    rect(c,'#c2af82',cx-59,cy-1,118,3);
    const medallion=(color,rx,ry,corner)=>poly(c,color,[[cx-rx,cy-ry+corner],[cx-rx+corner,cy-ry],
      [cx+rx-corner,cy-ry],[cx+rx,cy-ry+corner],[cx+rx,cy+ry-corner],
      [cx+rx-corner,cy+ry],[cx-rx+corner,cy+ry],[cx-rx,cy+ry-corner]]);
    medallion('#4c5d5a',39,33,15);
    medallion('#beaa77',37,31,14);
    medallion('#607e76',35,29,13);
    medallion('#89978e',32,26,12);
    diamond(c,'#4e6f6b',cx,cy,18);
    diamond(c,'#d5bc80',cx,cy,14);
    diamond(c,'#639c92',cx,cy,12);
    diamond(c,'#9bc7ae',cx,cy-1,8);
    rect(c,'#e2dfb8',cx-2,cy-4,5);
    for(const [dx,dy] of [[0,-22],[-25,0],[0,22],[25,0]]){
      diamond(c,'#42706e',cx+dx,cy+dy,5);
      diamond(c,'#adccae',cx+dx,cy+dy,3);
    }
    c.restore();
  }

  function paintMainBridge(c,left,right,y){
    rect(c,'#223940',left-2,y-35,right-left+4,71);
    rect(c,'#7b8176',left,y-31,right-left,62);
    rect(c,'#b6ad92',left+2,y-27,right-left-4,54);
    const pavers=['#c0b498','#ada88f','#b9af98','#a39f8b'];
    for(let py=y-22,row=0;py<y+22;py+=8,row++){
      for(let px=left+3+(row%2)*2,col=0;px<right-7;px+=12,col++){
        rect(c,pavers[(row*3+col)%pavers.length],px,py,10,7);
        rect(c,'#909282',px,py+6,10);
      }
    }
    for(const edge of [y-31,y+26]){
      rect(c,'#355d5a',left,edge,right-left,5);
      rect(c,'#628b80',left+2,edge,right-left-4);
      for(let px=left+4;px<right-4;px+=11){
        rect(c,'#9b9e83',px,edge-2,3,7);
        rect(c,'#d3b884',px-1,edge-2,5,2);
      }
      rect(c,'#bca477',left+2,edge+5,right-left-4,2);
    }
  }

  function paintMarketApproach(c){
    const end=1490,first=canal.right+18,y=mainBridge;
    for(const edge of [y-23,y+20]){
      rect(c,'#796c5e',first,edge,end-first,5);
      rect(c,'#d8bc8b',first,edge+1,end-first);
      for(let x=first+6;x<end-8;x+=16){
        rect(c,'#a08c70',x,edge+2,12,2);
        if(x%3===0)rect(c,'#cfb591',x+1,edge+2,5);
      }
    }
    for(const x of [1138,1261,1367,1466]){
      diamond(c,'#a79073',x,y,10);
      diamond(c,'#bfab8a',x,y,7);
      diamond(c,'#6b8b80',x,y,4);
    }
  }

  function paintTerrain(seed,buildings){
    const width=oldWidth;
    const ground=canvas(width,height),c=ground.getContext('2d'),rnd=random(seed^0x476cf112);
    rect(c,'#38434a',0,0,width,height);
    for(const dto of districts.slice(0,4)){
      const w=dto.maxX-dto.minX,h=dto.maxY-dto.minY;
      rect(c,dto.ground[0],dto.minX,dto.minY,w,h);
      for(let y=dto.minY+1;y<dto.maxY;y+=8){
        for(let x=dto.minX+1;x<dto.maxX;x+=11){
          const tone=integer(rnd,0,3);
          if(tone===0)continue;
          rect(c,dto.ground[tone],x,y,8+(tone%2),6);
          if(rnd()>.83)rect(c,'rgba(213,202,164,.17)',x+2,y+1,2);
        }
      }
    }
    for(const dto of districts.slice(0,4)){
      const [road,shadow,shine]=dto.road;
      const horizontal=(a,b,y,w)=>{
        if(b<=a)return;
        rect(c,shadow,a,y-w/2,b-a,w);
        rect(c,road,a,y-w/2+3,b-a,w-6);
        rect(c,shine,a,y+w/2-4,b-a,1);
        for(let py=y-w/2+7;py<y+w/2-5;py+=7){
          for(let px=a+4+((py&1)?5:0);px<b-4;px+=14){
            if(rnd()<.3)rect(c,shine,px,py,9,3);
            rect(c,'rgba(50,48,49,.17)',px,py+3,9,1);rect(c,'rgba(50,48,49,.14)',px+10,py,1,3);
          }
        }
      };
      const vertical=(a,b,x,w)=>{
        if(b<=a)return;
        rect(c,shadow,x-w/2,a,w,b-a);rect(c,road,x-w/2+3,a,w-6,b-a);
        rect(c,shine,x+w/2-4,a,1,b-a);
        for(let px=x-w/2+7;px<x+w/2-4;px+=7){
          for(let py=a+4+((px&1)?5:0);py<b-4;py+=15){
            if(rnd()<.24)rect(c,shine,px,py,3,9);
            rect(c,'rgba(50,48,49,.17)',px+3,py,1,10);rect(c,'rgba(50,48,49,.14)',px,py+10,3,1);
          }
        }
      };
      for(const x of streetsX){if(x>=dto.minX&&x<=dto.maxX+7)vertical(dto.minY,dto.maxY,x,x===385||x===1494?37:28);}
      for(const y of streetsY){if(y>=dto.minY&&y<=dto.maxY+4)horizontal(dto.minX,dto.maxX,y,y===726?53:35);}
    }

    for(const b of buildings){
      if(b.door.x>=annexStart)continue;
      const {x,y}=b.door;
      const nextY=streetsY.find(road=>road>y+3);
      if(!nextY||nextY-y>148)continue;
      const [road]=districts.find(d=>d.id===b.district).road;
      rect(c,'rgba(48,43,45,.29)',x-7,y-13,14,nextY-y+14);
      rect(c,road,x-5,y-13,10,nextY-y+14);
      for(let py=y-9;py<nextY;py+=9)rect(c,'rgba(51,51,53,.27)',x-4,py,8);
    }
    for(const park of parks){
      const green=park.tone==='lamps'||park.tone==='lenses',floor=green?'#667f60':park.tone==='kilns'?'#866c54':'#a38b69';
      rect(c,'#4d5650',park.x-3,park.y-3,park.w+6,park.h+6);
      rect(c,floor,park.x,park.y,park.w,park.h);
      rect(c,green?'#98a077':'#b19c75',park.x+2,park.y+2,park.w-4,2);
      for(let v=0;v<park.w*park.h/58;v++){
        const x=park.x+4+rnd()*(park.w-8),y=park.y+4+rnd()*(park.h-8);
        rect(c,green?rnd()>.85?'#9bae77':'#748b65':rnd()>.65?'#a98d69':'#907957',x,y,1+integer(rnd,0,2),1);
      }
      if(park.id==='lamp-garden'){
        for(const px of [1826,1888,1960]){
          rect(c,'#8d9780',px-8,park.y,16,park.h);
          rect(c,'#b2af8b',px-5,park.y,10,park.h);
        }
        for(const py of [1028,1086,1151]){
          rect(c,'#849178',park.x,py-7,park.w,14);
          rect(c,'#b5af8f',park.x,py-4,park.w,8);
        }
      }
    }
    paintPlaza(c,rnd);

    const waterW=canal.right-canal.left;
    rect(c,'#3b5959',canal.left-6,22,waterW+13,height-40);
    rect(c,'#9f9780',canal.left-5,22,4,height-42);rect(c,'#8c8f7a',canal.right+1,22,4,height-42);
    rect(c,'#285560',canal.left,22,waterW,height-43);
    rect(c,'#254554',canal.left,22,9,height-43);
    rect(c,'#3a6a6d',canal.right-14,22,14,height-43);
    for(let y=28;y<height-31;y+=11){
      rect(c,'#b9ac8f',canal.left-5,y,3,6);
      rect(c,'#5f746d',canal.left+1,y,2,9);
      rect(c,'#a7a689',canal.right+2,y+4,3,5);
      rect(c,'#4d817d',canal.right-4,y+5,3);
    }
    for(let j=0;j<2350;j++){
      const x=canal.left+2+rnd()*(waterW-4),y=25+rnd()*(height-51);
      rect(c,['#32616a','#437677','#3a7071','#2d535e'][integer(rnd,0,3)],x,y,integer(rnd,2,11),integer(rnd,1,2));
    }
    for(const y of bridges){
      const left=canal.left-18,right=canal.right+18;
      if(y===mainBridge){paintMainBridge(c,left,right,y);continue;}
      rect(c,'#263e47',left-2,y-36,right-left+4,73);
      rect(c,'#7c796c',left,y-35,right-left,70);
      rect(c,'#a6a18a',left+2,y-29,right-left-4,58);
      for(let x=left+4;x<right-3;x+=13){
        for(let py=y-24;py<y+24;py+=9){
          rect(c,integer(rnd,0,2)===0?'#b6ab91':'#9e9b86',x,py,10,6);
          rect(c,'#84836f',x,py+6,10);
        }
        rect(c,'#c0b49a',x,y-35,10,4);rect(c,'#c0b49a',x,y+31,10,4);
      }
    }
    paintMarketApproach(c);
    for(let x=21;x<width-25;x+=31){
      rect(c,'#4a5454',x,24,27,8);rect(c,'#65716c',x,24,27,2);
      rect(c,'#4b5857',x,height-31,27,8);rect(c,'#6e7770',x,height-30,27,2);
    }
    for(let y=28;y<height-31;y+=23){
      rect(c,'#515f61',22,y,8,20);rect(c,'#6b7773',24,y,2,19);
      rect(c,'#515f61',width-29,y,8,20);rect(c,'#6b7773',width-28,y,2,19);
    }
    const chart=canvas(270,188),map=chart.getContext('2d');
    map.imageSmoothingEnabled=false;map.drawImage(ground,0,0,270,188);
    for(const b of buildings){
      if(b.door.x>=annexStart)continue;
      const {x,y,w,h}=b.box,d=districts.find(z=>z.id===b.district);
      rect(map,b.service?'#e4d5a9':d.roofs[b.color][1],x/width*270,y/height*188,Math.max(3,w/width*270),Math.max(2,h/height*188));
    }
    return {ground,chart};
  }

  function paintAnnex(seed,buildings,mapOnly){
    const span=width-annexStart,scale=mapOnly ? .125 : 1;
    const image=canvas(Math.ceil(span*scale),Math.ceil(height*scale)),c=image.getContext('2d');
    c.scale(image.width/span,image.height/height);c.translate(-annexStart,0);
    const rnd=random(seed^0x8a99177),outer=width-28;
    rect(c,'#394949',annexStart,0,span,height);
    for(const d of districts.slice(4)){
      rect(c,d.ground[0],annexStart,d.minY,outer-annexStart,d.maxY-d.minY+1);
      if(!mapOnly)for(let y=d.minY+5;y<d.maxY-3;y+=6)for(let x=annexStart+2;x<outer-4;x+=10){
        const variant=integer(rnd,0,3);
        rect(c,d.ground[variant],x+integer(rnd,0,4),y,integer(rnd,2,6),d.id==='arcades'?3:1);
      }
    }
    function path(points,w,palette){
      c.lineJoin='round';c.lineCap='butt';c.beginPath();
      points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
      c.strokeStyle=palette[1];c.lineWidth=w;c.stroke();
      c.strokeStyle=palette[0];c.lineWidth=w-4;c.stroke();
    }
    // Each row has a clear north/south passage through its plots. Their offsets create staggered junctions.
    const cross=[101,256,489,726,964,1218,1422],spine=[2457,2416,2485,2445,2465,2395];
    for(let i=0;i<cross.length;i++){
      const y=cross[i],d=districtAt(2500,y);
      path([[annexStart,y],[outer,y]],y===726?53:30,d.road);
      if(i<spine.length)path([[spine[i],y],[spine[i],cross[i+1]]],32,d.road);
    }
    path([[2145,33],[2145,1455]],22,districts[5].road);
    for(const b of buildings){
      if(b.door.x<annexStart)continue;
      const d=districtAt(b.door.x,b.door.y),{x,y}=b.door;
      const street=cross.find(s=>s>y);
      if(street)path([[x,y-15],[x,street]],b.service?18:12,d.road);
    }
    for(const [x,y,d] of [[2460,489,districts[4]],[2516,1218,districts[5]]]){
      const w=d.id==='arcades'?70:48;
      poly(c,d.road[1],[[x-w,y-23],[x-w+19,y-48],[x+w-19,y-48],[x+w,y-23],[x+w,y+24],[x+w-21,y+46],[x-w+21,y+46],[x-w,y+24]]);
      poly(c,d.road[0],[[x-w+3,y-21],[x-w+21,y-44],[x+w-21,y-44],[x+w-4,y-21],[x+w-4,y+23],[x+w-22,y+42],[x-w+22,y+42],[x-w+3,y+23]]);
      diamond(c,d.road[2],x,y,19);diamond(c,d.id==='arcades'?'#6b9795':'#758660',x,y,14);
    }
    for(const [x,y] of [[2380,1012],[2380,1057],[2380,1102],[2600,1124],[2666,1124]]){
      const w=x<2500?65:56;
      rect(c,'#827456',x,y,w,29);rect(c,'#64563e',x+3,y+3,w-6,23);
      if(!mapOnly)for(let col=5;col<w-4;col+=7)for(let row=6;row<26;row+=8){
        rect(c,'#405e45',x+col-1,y+row,5,3);rect(c,'#93ad64',x+col,y+row-1,3,2);
        if((row+col)%3===0)rect(c,'#c3a574',x+col+2,y+row-2,2,1);
      }
    }
    if(mapOnly)for(const b of buildings.filter(b=>b.door.x>=annexStart)){
      const d=districtAt(b.door.x,b.door.y),q=b.box;
      rect(c,b.service?'#dfd2a0':d.roofs[b.color][1],q.x,q.y,q.w,q.h);
    }
    return image;
  }

  function emblem(c,kind,x,y,color){
    if(kind==='forge'){
      rect(c,color,x-5,y-4,10,3);rect(c,color,x-1,y-1,2,7);
    }else if(kind==='shop'){
      rect(c,color,x-5,y-3,10,6);rect(c,'#4f5552',x-3,y-2,6,3);rect(c,color,x+4,y-1,3,2);
    }else if(kind==='guild'||kind==='academy'){
      diamond(c,color,x,y,6);diamond(c,'#42505a',x,y,3);rect(c,color,x,y-7,1,15);
    }else if(kind==='archive'){
      rect(c,color,x-5,y-4,9,8);rect(c,'#566063',x-1,y-3,1,7);rect(c,color,x+5,y-3,1,6);
    }else if(kind==='inn'){
      rect(c,color,x-4,y-4,7,8);rect(c,color,x+3,y-3,3,4);rect(c,'#69544b',x-2,y-2,4,2);
    }else diamond(c,color,x,y,4);
  }
  function makeBuilding(b){
    if(b.door.x>=annexStart)return makeAnnexBuilding(b);
    const q=b.box,d=districts.find(w=>w.id===b.district),rnd=random(b.skin);
    const copper=b.service==='inn';
    const colors=copper?['#395450','#587c70','#7c9d86','#a1ac87']:d.roofs[b.color];
    const offset=14,raise=70,w=q.w,h=q.h;
    const image=canvas(w+offset*2,h+raise+9),g=image.getContext('2d'),x=offset,y=raise+h;
    const [shadow,mid,highlight,trim]=colors,[border,stucco,cream]=d.wall;
    const style=b.style,large=b.service!==null,front=Math.min(37,22+(large?10:0)+Math.floor(h/9));
    const eave=y-front,rise=style==='tower'?46:style==='shed'||style==='warehouse'?17:large?26:20;
    const high=Math.max(5,raise-14-rise*.48);
    rect(g,'rgba(22,31,36,.37)',x-4,y-8,w+14,14);
    rect(g,border,x,y-front,w,front);
    rect(g,stucco,x+3,y-front+4,w-6,front-7);
    rect(g,cream,x+3,y-front+4,2,front-7);
    rect(g,'#5b5549',x+1,y-4,w-2,3);
    for(let v=eave+6;v<y-4;v+=7){
      for(let u=x+5+((v&1)?5:0);u<x+w-3;u+=13){
        if(rnd()>.36)rect(g,'rgba(106,85,74,.35)',u,v,8,1);
        if(rnd()>.83)rect(g,'rgba(228,213,164,.35)',u+1,v+3,4,1);
      }
    }
    const roofPoly=[[x-5,eave+1],[x-2,high+13],[x+Math.max(9,w*.14),high],
      [x+w-Math.max(9,w*.14),high],[x+w+2,high+13],[x+w+5,eave+1]];
    poly(g,'#293946',roofPoly);
    g.save();g.beginPath();
    for(const [i,[px,py]] of roofPoly.entries())if(i)g.lineTo(px,py);else g.moveTo(px,py);
    g.closePath();g.clip();
    rect(g,mid,x-5,high,w+11,eave-high);
    const ridge=high+Math.max(6,Math.floor((eave-high)*.27));
    poly(g,highlight,[[x-7,high+14],[x+w*.16,high],[x+w*.84,high],[x+w+8,high+13],[x+w+5,ridge],[x-7,ridge]]);
    poly(g,shadow,[[x+w*.82,high],[x+w+9,high+13],[x+w+9,eave],[x+w*.93,eave],[x+w*.89,ridge]]);
    const split=Math.max(ridge+4,high+14);
    for(let py=split;py<eave;py+=6){
      rect(g,'rgba(37,48,62,.4)',x-5,py,w+11);
      for(let px=x-6+((py>>1)&7);px<x+w+6;px+=10){
        if(rnd()>.32)rect(g,'rgba(214,213,184,.24)',px,py-2,7);
        if(rnd()>.2)rect(g,'rgba(27,38,53,.37)',px+9,py,1,5);
      }
    }
    if(copper){
      for(let px=x;px<x+w+3;px+=13){
        rect(g,'#3f655c',px,high,2,eave-high);
        rect(g,'#859f80',px+2,high,1,eave-high);
      }
    }
    rect(g,trim,x+7,ridge,w-14,2);rect(g,shadow,x-5,eave-4,w+12,5);
    g.restore();
    rect(g,trim,x-4,eave+1,w+9,2);rect(g,'#514a4b',x-3,eave+4,w+7,2);

    const midX=x+Math.round(w/2),doorHeight=large?22:16,doorWidth=large?18:10;
    rect(g,'#4f4c4f',midX-doorWidth/2-2,y-doorHeight-2,doorWidth+4,doorHeight+2);
    rect(g,'#634e43',midX-doorWidth/2,y-doorHeight,doorWidth,doorHeight-2);
    rect(g,'#8d7151',midX-doorWidth/2+1,y-doorHeight+1,2,doorHeight-4);
    rect(g,'#d6b270',midX+2,y-8,2);
    rect(g,cream,midX-doorWidth/2-3,y-2,doorWidth+6,2);
    rect(g,border,midX-doorWidth/2-4,y,doorWidth+8,2);
    const windows=[];
    function windowAt(x0,y0,w0=9,h0=8){
      windows.push({x:x0,y:y0,w:w0,h:h0});
      rect(g,'#525151',x0-1,y0-2,w0+2,h0+5);rect(g,'#b08c62',x0,y0,w0,h0);
      rect(g,'#e5c884',x0+1,y0+1,w0-2,h0-1);rect(g,'#8b7357',x0+w0/2,y0+1,1,h0);
      rect(g,'#8b7357',x0+1,y0+h0/2,w0-2,1);rect(g,cream,x0-2,y0+h0+2,w0+3,1);
    }
    for(let u=x+7;u<x+w-8;u+=16)if(Math.abs(u+4-midX)>doorWidth/2+8)windowAt(u,y-front+8,large?10:8,8);
    if(style==='tower'||style==='academy'||style==='archive'){
      const top=high-5,towerW=style==='academy'?w*.30:Math.min(w*.6,33),tX=midX-towerW/2,baseY=high+29;
      rect(g,'#3d4856',tX-2,top,towerW+4,baseY-top);
      rect(g,stucco,tX,top+2,towerW-3,baseY-top-3);
      for(let v=top+7;v<baseY-2;v+=6)rect(g,'rgba(72,72,65,.39)',tX+2,v,towerW-6,1);
      poly(g,shadow,[[tX-5,top+1],[midX,top-23],[tX+towerW+5,top+1]]);
      poly(g,highlight,[[tX-3,top],[midX,top-21],[midX+5,top]]);
      rect(g,trim,midX-1,top-23,2,9);windowAt(midX-4,top+14,8,7);
      if(style==='academy'){
        for(const side of [-1,1]){
          const tx=midX+side*w*.36;
          rect(g,border,tx-10,top+11,20,35);rect(g,cream,tx-9,top+14,14,29);
          poly(g,mid,[[tx-13,top+12],[tx,top-10],[tx+13,top+12]]);rect(g,trim,tx-11,top+12,23,2);
          windowAt(tx-3,top+26,6,6);
        }
        diamond(g,'#c5d3be',midX,top+7,3);
      }
    }else if(style==='inn'||style==='shop'||style==='gallery'){
      const awning=copper?'#a7564c':style==='inn'?'#935957':style==='shop'?'#657b75':'#84778a';
      for(const dx of [-w*.28,w*.20]){
        const left=midX+dx-5,top=y-front+4,awningWidth=Math.max(11,w*.2);
        rect(g,awning,left-2,top,awningWidth+4,6);
        for(let i=0;i<awningWidth;i+=5)rect(g,'rgba(217,201,155,.42)',left+i,top,2,7);
        rect(g,'#675b51',left,top+7,awningWidth,2);
        if(copper){
          rect(g,'#d0ab79',left-2,top+6,awningWidth+4,1);
          rect(g,'#704d4a',left-1,top+8,2,15);
          rect(g,'#704d4a',left+awningWidth,top+8,2,15);
          rect(g,'#8c7863',left+1,top+22,awningWidth-1,3);
          rect(g,'#b1936c',left+1,top+21,awningWidth-1,1);
          for(let i=3;i<awningWidth-2;i+=4)rect(g,'#967a5d',left+i,top+22,1,2);
        }
      }
    }else if(style==='forge'||style==='workroom'||style==='shed'||style==='warehouse'){
      const stackX=x+w*.18;
      rect(g,'#615d60',stackX,high-12,13,23);
      rect(g,'#8b7b6b',stackX+1,high-12,11,3);rect(g,'#ad9879',stackX+1,high-8,2,17);
      for(let vy=high-4;vy<high+7;vy+=5)rect(g,'#4c494e',stackX+2,vy,10,1);
      if(style==='forge'){
        rect(g,'#4d474a',x+w*.66,y-front+10,w*.2,18);
        rect(g,'#ad5b40',x+w*.66+2,y-front+20,w*.2-4,7);
        rect(g,'#eb9e5d',x+w*.67,y-front+24,w*.17,2);
      }
    }
    if(b.service){
      rect(g,'#514c51',midX-10,y-doorHeight-15,20,12);
      rect(g,'#9a8f73',midX-9,y-doorHeight-15,18,2);
      emblem(g,b.service,midX,y-doorHeight-9,'#e0c790');
    }
    return {image,x:q.x-offset,y:q.y-raise,windows};
  }

  function makeAnnexBuilding(b){
    const q=b.box,d=districtAt(b.door.x,b.door.y),w=q.w,h=q.h;
    const pad=14,lift=55,image=canvas(w+2*pad,h+lift+12),g=image.getContext('2d');
    const x=pad,y=lift+h,ridge=lift-8,front=y-(b.style==='bellhouse'?35:25),cx=x+Math.floor(w/2);
    const [shade,roof,light,trim]=d.roofs[b.color],[frame,wall,chalk]=d.wall;
    const ink='#374342',sill='#8c7455',sun='#e8cca0';
    // Registra i vetri come le finestre dei quartieri storici: di notte si accendono con lo strato già precalcolato.
    const windows=[];
    function pane(px,py,pw,ph){
      windows.push({x:px+1,y:py,w:pw-2,h:ph-2});
      rect(g,ink,px,py,pw,ph);rect(g,'#718b8c',px+2,py+1,pw-4,ph-3);
      rect(g,'#c1c7a4',px+2,py+1,pw-5,2);rect(g,sill,px+pw/2,py+1,1,ph-2);
      rect(g,chalk,px-1,py+ph,pw+2,2);
    }
    function gable(px,top,wide,eave){
      poly(g,ink,[[px-4,eave+2],[px+wide*.42,top-2],[px+wide+4,eave+2]]);
      poly(g,light,[[px-2,eave],[px+wide*.42,top],[px+wide+2,eave]]);
      poly(g,roof,[[px+wide*.42,top],[px+wide+2,eave],[px+wide*.57,eave]]);
      rect(g,trim,px-3,eave,wide+6,2);
    }
    rect(g,'rgba(26,37,38,.37)',x-3,y-8,w+13,15);
    rect(g,frame,x,front-3,w,y-front+3);rect(g,wall,x+2,front,w-4,y-front-3);
    rect(g,chalk,x+3,front,2,y-front-4);
    if(b.style==='conservatory'){
      const glass='#759e95',shine='#b7cbb1',brace='#4d7168',step=14;
      const profile=[[x-4,front],[x-2,ridge+22],[x+14,ridge+6],[x+30,ridge],
        [x+w-30,ridge],[x+w-14,ridge+6],[x+w+2,ridge+22],[x+w+4,front]];
      poly(g,brace,profile);g.save();g.beginPath();
      profile.forEach(([px,py],i)=>i?g.lineTo(px,py):g.moveTo(px,py));g.closePath();g.clip();
      rect(g,glass,x-4,ridge,w+10,front-ridge);
      for(let i=0;i<w+12;i+=step){
        rect(g,brace,x+i,ridge,2,front-ridge);rect(g,shine,x+i+2,ridge,1,front-ridge);
        rect(g,'#98b5a4',x+i+4,ridge+11,6,13);
        rect(g,'#91b39d',x+i+5,front-17,5,8);
      }
      for(let py=ridge+4;py<front;py+=14){rect(g,brace,x-4,py,w+11,2);rect(g,shine,x-4,py+2,w+11);}
      g.restore();
      for(let i=8;i<w-9;i+=17)pane(x+i,front+4,13,14);
      gable(cx-16,front-16,32,front+1);
    }else if(b.style==='loggia'||b.style==='gallery'){
      const top=front-19;
      poly(g,shade,[[x-6,top],[x+8,ridge+3],[x+w-14,ridge-3],[x+w+6,top]]);
      poly(g,light,[[x-3,top-2],[x+9,ridge+4],[x+w-15,ridge],[x+w-4,top-2]]);
      rect(g,chalk,x-5,top,w+10,3);rect(g,wall,x,top+3,w,19);
      for(let i=8;i<w-8;i+=16)pane(x+i,top+6,9,7);
      rect(g,shade,x-4,front-1,w+8,4);
      for(let i=2;i<w-13;i+=18){
        poly(g,ink,[[x+i+2,y-3],[x+i+2,front+10],[x+i+6,front+5],[x+i+12,front+5],[x+i+16,front+10],[x+i+16,y-3]]);
        rect(g,chalk,x+i,front+8,3,y-front-9);rect(g,trim,x+i-1,y-4,5,3);
      }
    }else if(b.style==='bellhouse'){
      gable(x,ridge+10,w,front);
      const tw=Math.floor(w*.55),tx=x+5,top=ridge-20;
      rect(g,frame,tx-1,top,tw+2,front-top+4);rect(g,wall,tx+1,top+2,tw-2,front-top+1);
      rect(g,chalk,tx+2,top+2,2,front-top);
      gable(tx-1,top-18,tw+2,top);
      rect(g,'#d2ac76',tx+tw*.42,top-27,1,10);
      pane(tx+5,top+7,tw-10,12);diamond(g,'#e0bc7e',tx+tw/2,top+25,4);
      pane(x+w-15,front+5,9,10);
    }else if(b.style==='atelier'){
      const part=Math.floor(w/3);
      for(let i=0;i<3;i++){
        const left=x+i*part;
        poly(g,shade,[[left-2,front],[left+1,ridge-4],[left+part+4,ridge+12],[left+part+4,front]]);
        poly(g,light,[[left+2,ridge],[left+part+1,ridge+14],[left+part+1,front-4],[left+4,front-10]]);
        rect(g,'#b3c7ad',left+4,ridge+7,3,front-ridge-17);
      }
      rect(g,trim,x-4,front,w+8,3);
      for(let i=7;i<w-13;i+=21)pane(x+i,front+6,14,12);
    }else{
      const tall=b.style==='herb-loft',thatched=b.style==='longhouse';
      const top=ridge+(tall?-12:8),shoulder=x+w*(thatched?.18:.31);
      poly(g,ink,[[x-6,front+2],[shoulder-1,top-2],[x+w*.76,top-2],[x+w+7,front+2]]);
      poly(g,roof,[[x-4,front],[shoulder,top],[x+w*.76,top],[x+w+5,front]]);
      poly(g,light,[[x-3,front-3],[shoulder,top],[x+w*.74,top],[x+w*.86,front-3]]);
      for(let py=top+8;py<front-4;py+=6){
        const t=(front-py)/(front-top);
        for(let px=x+(shoulder-x)*t+2;px<x+w-w*.25*t-5;px+=8)rect(g,shade,px,py,thatched?2:5,thatched?4:1);
      }
      rect(g,trim,x-5,front,w+10,2);
      if(tall){
        gable(cx-12,top-5,24,top+16);pane(cx-4,top+8,9,9);
        for(let i=4;i<w-6;i+=12)rect(g,frame,x+i,front+3,2,19);
      }else if(!thatched){
        rect(g,frame,x+w*.77,top-9,8,15);rect(g,chalk,x+w*.77-1,top-10,10,3);
      }
      pane(x+8,front+7,10,10);pane(x+w-19,front+7,10,10);
    }
    rect(g,ink,cx-7,y-18,14,18);rect(g,'#815f47',cx-5,y-15,10,14);
    rect(g,'#9f8060',cx-4,y-15,2,13);rect(g,sun,cx+2,y-7,2,1);
    rect(g,trim,cx-9,y,18,2);rect(g,sill,cx-10,y+2,20,2);
    return {image,x:q.x-pad,y:q.y-lift,windows};
  }

  function paintProp(c,o,time){
    const {x,y,name}=o,still=scene.calm,glow=still?0:(Math.floor(time*4+x/12)%4);
    if(name==='lensSpire'){
      disk(c,'#554e50',x+4,y+2,19,6);disk(c,'#a79e8c',x,y,17,5);disk(c,'#cfbf9d',x,y-3,13,4);
      rect(c,'#837d68',x-4,y-17,8,13);rect(c,'#c3ad78',x-3,y-18,3,13);
      disk(c,'#645c52',x,y-29,14,14);disk(c,'#c5a872',x,y-30,13,13);
      disk(c,'#536e70',x,y-30,10,10);disk(c,'#719b97',x-2,y-32,6,6);
      poly(c,'#cfb47c',[[x-17,y-22],[x+12,y-43],[x+15,y-41],[x-13,y-21]]);
      diamond(c,'#d3d0a8',x-3,y-34,2);
    }else if(name==='tree'||name==='fruitTree'){
      const sway=still?0:Math.sin(time*.8+x*.11),s1=Math.round(sway),s2=Math.round(sway*1.6);
      const reach=scene.known?Math.abs(scene.sunDx):0;
      disk(c,scene.treeShadow||'rgba(36,53,56,.52)',x+scene.sunDx,y+3,14+reach*.6,5);
      c.drawImage(propSprite('tree'+s1+'/'+s2,(g,ax,ay)=>paintTreeBody(g,ax,ay,s1,s2)),(x|0)-24,(y|0)-38);
      if(name==='fruitTree')for(let i=0;i<8;i++){
        const px=x-9+(i*7)%20+s1,py=y-27+(i*5)%14;
        rect(c,'#b97651',px,py,3,3);rect(c,'#d8a568',px,py,2,1);
      }
      if(!still){
        for(let i=0;i<2;i++){
          const phase=(time*.3+i*.5+x*.013)%1;
          rect(c,i?'#c8b36c':'#8fa15e',x-9+i*12+Math.round(Math.sin(phase*6.3+i)*4),y-20+Math.round(phase*24),1,1);
        }
      }
    }else if(name==='crystal'){
      const pulse=still?1:Math.sin(time*1.7+x*.37),bright=pulse>.4;
      disk(c,'rgba(26,42,50,.4)',x+scene.sunDx*.4,y+2,7,3);
      c.drawImage(propSprite(bright?'crystal-b':'crystal-d',(g,ax,ay)=>paintCrystalBody(g,ax,ay,bright)),(x|0)-24,(y|0)-38);
      if(!still&&Math.sin(time*2.3+x)>.86)rect(c,'#ffffff',x+3,y-13,1,1);
    }else if(name==='lamp'){
      rect(c,'#45464a',x-3,y,7,2);rect(c,'#675f51',x-1,y-19,2,19);
      rect(c,'#504945',x-4,y-22,8,8);rect(c,glow===0?'#f3d392':'#dbad72',x-2,y-21,4,6);
      rect(c,'#9a8e6d',x-5,y-23,10,2);
    }else if(name==='prismLamp'){
      disk(c,'rgba(34,42,38,.35)',x+3,y+2,7,3);
      rect(c,'#3c5350',x-4,y-1,9,3);rect(c,'#9da98d',x-3,y-2,7,1);
      rect(c,'#374d49',x-2,y-20,4,18);rect(c,'#6f8b70',x-1,y-17,1,15);
      rect(c,'#4d6252',x-5,y-23,11,9);rect(c,'#b48854',x-3,y-23,7,7);
      rect(c,glow<2?'#f6d58f':'#eec785',x-2,y-22,5,5);
      rect(c,'#8a7253',x,y-22,1,5);rect(c,'#90a180',x-5,y-16,11,2);
      poly(c,'#446e65',[[x-6,y-23],[x-2,y-28],[x+3,y-28],[x+6,y-23]]);
      rect(c,'#b3a475',x-2,y-28,5,1);rect(c,'#a1ae8c',x,y-31,1,3);
    }else if(name==='pond'||name==='fountain'){
      const wide=name==='pond',rx=wide?25:12,ry=wide?17:8;
      disk(c,'#516358',x,y,rx,ry);disk(c,'#b0ad92',x,y-1,rx-1,ry-2);
      disk(c,'#456c73',x,y-1,rx-3,ry-4);
      for(let i=0;i<7;i++)rect(c,i%3?'#779792':'#a4b8a8',x-rx+4+(i*7+glow)%Math.max(5,rx*2-7),y-ry+5+(i*3)%Math.max(2,ry),2+i%2,1);
      if(!wide){
        rect(c,'#a9b09f',x-1,y-12,3,9);rect(c,'#819d9d',x-4,y-13,9,4);
        rect(c,'#d4d3af',x-3,y-14,6,2);rect(c,'#b3d2bb',x+2,y-8+glow,1,2);
      }
    }else if(name==='banner'){
      rect(c,'#51474a',x-1,y-28,3,28);rect(c,'#b7a77e',x-4,y-27,18,2);
      const warm=o.label==='atelier'||o.label==='market';
      rect(c,warm?'#966649':'#748d86',x+2,y-25,13,12);
      rect(c,warm?'#c19266':'#a3b79b',x+3,y-24,11,2);emblem(c,'academy',x+8,y-19,'#e4d4a2');
      if(!still){const f=Math.sin(time*2.4+x*.2);rect(c,warm?'#966649':'#748d86',x+15,y-24+(f>0?1:0),1+(f>.5?1:0),8);}
    }else if(name==='sign'){
      rect(c,'#5c5248',x,y-15,2,17);rect(c,'#6a6658',x-7,y-20,16,12);
      rect(c,'#bba583',x-6,y-19,14,2);emblem(c,o.label,x,y-14,'#e5c995');
    }else if(name==='planter'){
      rect(c,'#626357',x-5,y-2,11,3);rect(c,'#9d8168',x-5,y-7,10,5);
      for(let i=0;i<5;i++){
        const q=x-4+i*2,top=y-9-i%3;
        rect(c,'#5b805e',q,top,1,4);
        rect(c,i%2?'#c6b97e':'#b6a2a6',q-1,top-1,2,2);
      }
    }else if(name==='stall'){
      const cloth=(x%3===0?'#927467':x%3===1?'#a47c62':'#6f8c84');
      rect(c,'#51484a',x-11,y-9,22,11);rect(c,'#877462',x-10,y-11,20,9);
      rect(c,'#c2ab82',x-8,y-12,16,2);rect(c,'#4f4b49',x-10,y-21,2,13);rect(c,'#4f4b49',x+8,y-21,2,13);
      poly(c,cloth,[[x-13,y-20],[x-9,y-27],[x+9,y-27],[x+13,y-20],[x+13,y-18],[x-13,y-18]]);
      for(let v=-10;v<=10;v+=5)rect(c,'rgba(220,205,165,.53)',x+v,y-24,2,6);
      rect(c,'#74866a',x-6,y-11,4,3);rect(c,'#a37d69',x+2,y-11,5,4);
    }else if(name==='anvil'){
      rect(c,'#574b49',x-6,y-3,12,4);rect(c,'#706256',x-5,y-10,10,8);
      rect(c,'#46555d',x-6,y-14,12,5);rect(c,'#84918c',x-7,y-16,14,2);
      poly(c,'#687476',[[x+5,y-16],[x+12,y-14],[x+6,y-11]]);
    }else{
      rect(c,'#403c43',x-6,y-1,13,3);rect(c,'#8a6d50',x-6,y-9,12,8);
      rect(c,'#b29166',x-6,y-9,12,2);rect(c,'#6f5849',x-4,y-6,8);
      rect(c,'#5e514a',x-4,y-8,1,7);rect(c,'#ba9c6b',x+4,y-8,1,7);
    }
  }

  window.UrbanExterior={region,create,districts,services,waypoints:waypointList,plaza,exit};
})();
