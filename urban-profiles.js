/* Profili urbani. Le coordinate pubblicate dei Filoni fanno parte della revisione 1. */
(() => {
  'use strict';
  const at=(x,y)=>({x,y});

  function filoni(){
    const spawn=at(92,400),entry=at(529,398),exit=at(55,405);
    const plaza={...at(462,390),rx:99,ry:62,name:'Piazzale degli Argani'};
    const street={
      gate:exit,west:at(161,387),fork:at(223,389),inn:at(290,401),squareW:at(369,410),square:at(462,410),
      squareE:at(549,406),shops:at(605,403),smith:at(705,418),east:at(842,443),hallW:at(381,339),hallFront:at(463,343),
      upperW:at(225,244),upperIn:at(300,227),upperMid:at(419,228),upperE:at(571,245),upperEnd:at(749,262),eastBend:at(792,390),
      lowerW:at(188,521),lowerIn:at(260,534),lowerMid:at(365,549),lowerE:at(510,552),lowerEnd:at(641,531),lowerLink:at(697,508)
    };
    const profile={
      revision:1,street,
      trails:[
        {width:34,main:true,stops:['gate','west','fork','inn','squareW','square','squareE','shops','smith','east']},
        {width:16,stops:['squareW','hallW','hallFront']},
        {width:23,stops:['fork','upperW','upperIn','upperMid','upperE','upperEnd','eastBend','smith']},
        {width:21,stops:['west','lowerW','lowerIn','lowerMid','lowerE','lowerEnd','lowerLink','smith']}
      ],
      lots:[
        // Larghezze fisiche della revisione 1 pubblicata, nello stesso ordine delle varianti di seme.
        {id:'larch-inn',name:'Locanda del Larice Rosso',x:290,y:365,node:'inn',widths:[83],depth:36,component:'house',stories:3,room:'inn',sign:'bed'},
        {id:'miners-hall',name:'Cooperativa della Vena Chiara',x:462,y:326,node:'hallFront',widths:[90],depth:36,component:'hall',snow:0,sign:'pick'},
        {id:'ore-shop',name:'Emporio della Vena Chiara',x:593,y:366,node:'shops',widths:[67],depth:32,component:'workshop',room:'shop',sign:'crate'},
        {id:'coal-forge',name:'Forgia del Carbone Blu',x:707,y:376,node:'smith',widths:[74],depth:34,component:'workshop',room:'forge',sign:'anvil'},
        {id:'larch-cottage',name:'Casa sotto il Larice',x:166,y:194,node:'upperW',widths:[47,48],depth:25,component:'house',stories:1},
        {id:'ridge-house',name:'Casa della Cresta',x:304,y:190,node:'upperIn',widths:[53,54],depth:26,component:'house',stories:2,snow:0,room:'house'},
        {id:'twin-lodge',name:'Dimora dei Due Comignoli',x:411,y:190,node:'upperMid',widths:[63,61],depth:28,component:'house',stories:3,snow:1,sign:'wood'},
        {id:'scree-house',name:'Casa della Pietra Fredda',x:575,y:199,node:'upperE',widths:[57,59],depth:27,component:'house',stories:2,snow:0},
        {id:'hunter-cabin',name:'Rifugio dei Battipista',x:742,y:219,node:'upperEnd',widths:[40,41],depth:23,component:'house',stories:1},
        {id:'wool-shop',name:'Bottega delle Lane',x:259,y:483,node:'lowerIn',widths:[66,69],depth:31,component:'house',stories:2,snow:0,room:'shop',sign:'wool'},
        {id:'carpenter-shop',name:'Segheria del Disgelo',x:365,y:490,node:'lowerMid',widths:[71,70],depth:28,component:'house',stories:1,sign:'saw'},
        {id:'storehouse',name:'Magazzino degli Argani',x:505,y:501,node:'lowerE',widths:[62],depth:26,component:'house',stories:1,sign:'crate'},
        {id:'way-house',name:'Casa dei Turni',x:631,y:483,node:'lowerEnd',widths:[48,47],depth:29,component:'house',stories:2,snow:1}
      ]
    };
    const landmarks=[plaza,{...at(380,229),name:'Corte dei larici'},{...at(435,549),name:'Cortile delle botteghe'},
      ...profile.lots.filter(lot=>lot.room).map(lot=>({x:lot.x,y:lot.y+12,name:lot.name}))];
    const workers=[
      {skin:'dwarf',tempo:48,agenda:[[0,'ridge-house'],[420,'miners-hall'],[728,'hallW'],[808,'miners-hall'],[1080,'squareW'],[1215,'ridge-house']]},
      {skin:'goblin',tempo:53,agenda:[[0,'larch-cottage'],[471,'wool-shop'],[750,'squareE'],[850,'wool-shop'],[1130,'lowerIn'],[1290,'larch-cottage']]},
      {skin:'human',tempo:51,agenda:[[0,'scree-house'],[505,'carpenter-shop'],[785,'shops'],[850,'carpenter-shop'],[1090,'lowerMid'],[1240,'scree-house']]}
    ];
    const props=[['winch',465,371,9],
    ['stall0',402,366,6],['stall1',524,379,6],['well',557,455,8],
    ['cart',754,394,8],['cart',574,470,7],['logs',300,500,7],['logs',663,439,7],
    ];
    for(const [x,y] of [[75,376],[176,365],[272,404],[371,389],[427,419],[495,412],[552,422],[632,403],
      [721,423],[798,420],[242,448],[361,533],[563,541],[280,252],[525,241],[672,237]])props.push(['lamp',x,y]);

    return {...profile,id:'city-filoni',origin:'frost-pass',market:'filoni',palette:'pine',
      name:'Borgo dei Filoni · Piazzale degli Argani',
      description:'Quartiere minerario di Nordharyn tra larici, argani e case dalla falda ripida.',
      width:960,height:672,spawn,entry,exit,plaza,landmarks,workers,props,
      entrance:{id:'gate-filoni-argani',label:'Entra nel Piazzale degli Argani',mark:'Via per il Piazzale degli Argani'},
      departure:{id:'gate-filoni-pass',label:'Torna al Passo dei Larici'},roomExit:'Torna al piazzale',
      art:FiloniSprites,dryAbove:227,
      furniture:{winch:['headframe',.64],stall0:['stall',1],stall1:['stall',1,'rocca'],well:['well',1],cart:['orecart',1.65],lamp:['lamp',1]},
      vegetation:{stepX:30,stepY:33,border:[132,145,833,584],edgeChance:69,innerChance:11,
        species:['pine0','pine1','pine2','pine0','pine1','shrub','shrub','rock'],
        radius:[5,5,5,5,5,3,3,3],top:49},
      woodpile:true};
  }

  function calis(){
    const entry=at(542,382),exit=at(112,182);
    const plaza={...at(416,372),rx:104,ry:44,power:4,name:'Mercato delle Sette Vele'};
    const street={
      gate:exit,ramp:at(175,210),rampWest:at(158,271),terrace:at(286,219),upperArc:at(427,218),upEast:at(613,244),
      highEnd:at(756,268),laneEast:at(655,287),cistern:at(224,295),stairs:at(238,350),marketWest:at(308,355),market:at(416,381),
      marketEast:at(520,374),lane:at(610,333),eastJunction:at(650,375),eastEnd:at(758,395),
      quayWest:at(258,441),loading:at(418,445),jettyA:at(552,445),jettyB:at(673,446),
      quayEast:at(759,440),pierWest:at(552,548),pierEast:at(673,522)
    };
    const lots=[
      {id:'saffron-inn',name:'Locanda della Vela di Zafferano',x:297,y:325,node:'marketWest',widths:[89],depth:39,component:'hall',sub:'deserto',room:'inn',sign:'bed'},
      {id:'tide-market',name:'Emporio delle Sette Vele',x:452,y:327,node:'market',widths:[81],depth:33,component:'workshop',room:'shop',sign:'cargo'},
      {id:'warehouse-west',name:'Magazzino del Maestrale',x:338,y:421,node:'loading',widths:[72],depth:31,component:'workshop',sub:'deserto',sign:'crate'},
      {id:'warehouse-east',name:'Deposito delle Cime',x:600,y:419,node:'jettyA',widths:[72],depth:32,component:'workshop',room:'store',sign:'crate'},
      {id:'custom-house',name:'Loggia della Capitaneria',x:735,y:355,node:'eastEnd',widths:[83],depth:35,component:'hall',sign:'anchor'},
      {id:'cistern-home',name:'Casa della Cisterna',x:213,y:266,node:'cistern',widths:[47,51],depth:25,component:'house',stories:1},
      {id:'courier-home',name:'Casa dei Dispacci',x:194,y:175,node:'ramp',widths:[48,50],depth:25,component:'house',stories:2},
      {id:'potter-home',name:'Casa delle Anfore',x:302,y:180,node:'terrace',widths:[48,54],depth:30,component:'house',sub:'deserto',stories:2},
      {id:'captain-home',name:'Casa delle Carte',x:415,y:176,node:'upperArc',widths:[61,65],depth:32,component:'house',stories:3,room:'house'},
      {id:'netmaker-home',name:'Terrazza dei Retai',x:562,y:207,node:'upEast',widths:[54,58],depth:29,component:'house',stories:1},
      {id:'lantern-home',name:'Casa della Lampada Blu',x:701,y:220,node:'highEnd',widths:[44,52],depth:28,component:'house',stories:2}
    ];
    const terrain={
      soil:['#a69766','#bcaa75','#c7b482','#cfbc8b','#d8c494','#e1cda0','#e9d6a9'],
      dry:['#b3a26e','#c6b47d','#d6c08c','#deca98'],
      track:['#ad9a71','#c3ab79','#d1bb89','#ddca9b','#e7d6af','#ebdaba'],
      verge:['#b5a572','#c4b37f','#cbb484'],paving:['#b18a60','#d0ab7e','#debb8d','#e9cba0'],
      joint:'#ab9068',pebble:['#ae996f','#ead6aa'],tuft:['#a19e6c','#9d9566','#ded19c'],flowers:['#d7bb90','#c7ae7a','#f0dfb6']
    };
    return {id:'city-calis',origin:'dune-port',market:'calis',palette:'shore',revision:1,
      name:'Porto di Calis · Baia del Carico',
      description:'Portici di calce, cupole turchesi e magazzini affacciati sulle acque della Costa delle Sette Vele.',
      width:864,height:600,spawn:at(144,182),entry,exit,plaza,street,lots,
      entrance:{id:'gate-calis-quay',label:'Entra nel Porto di Calis',mark:'Via per la Baia del Carico'},
      departure:{id:'gate-calis-coast',label:'Torna alla Costa delle Sette Vele'},roomExit:'Torna alle vie del porto',
      trails:[
        {width:28,main:true,stops:['gate','ramp','rampWest','cistern','stairs','marketWest','market','marketEast','eastJunction','eastEnd','quayEast']},
        {width:18,stops:['ramp','terrace','upperArc','upEast','highEnd','laneEast','eastJunction']},
        {width:15,stops:['upperArc','lane','marketEast']},
        {width:34,main:true,stops:['cistern','quayWest','loading','jettyA','jettyB','quayEast']},
        {width:17,stops:['market','loading']},
        {width:20,stops:['jettyA','pierWest']},{width:18,stops:['jettyB','pierEast']}
      ],
      landmarks:[plaza,{...at(433,195),name:'Terrazze delle Carte'},{...at(605,447),name:'Banchina dei Carichi'},
        ...lots.filter(lot=>lot.room).map(lot=>({x:lot.x,y:lot.y+12,name:lot.name}))],
      sites:[
        {id:'cargo-board',...at(423,448),range:24,name:'Registro dei Carichi',text:'Consulta la commissione del molo',panel:'journal'}
      ],
      workers:[
        {skin:'human',tempo:48,agenda:[[0,'courier-home'],[405,'loading'],[555,'pierWest'],[719,'marketWest'],[815,'loading'],[1105,'pierWest'],[1220,'courier-home']]},
        {skin:'goblin',tempo:46,agenda:[[0,'potter-home'],[435,'tide-market'],[635,'marketEast'],[753,'cistern'],[828,'tide-market'],[1190,'potter-home']]},
        {skin:'elf',tempo:50,agenda:[[0,'captain-home'],[469,'custom-house'],[640,'pierEast'],[770,'eastJunction'],[886,'warehouse-east'],[1130,'pierEast'],[1215,'captain-home']]},
        {skin:'dwarf',tempo:43,agenda:[[0,'netmaker-home'],[489,'warehouse-west'],[717,'quayWest'],[844,'loading'],[960,'jettyB'],[1158,'netmaker-home']]}
      ],
      art:{terrain,assets:{}},dryAbove:228,
      coast:{offset:at(430,200),decks:[{x:533,y:448,w:38,h:116},{x:657,y:449,w:33,h:88}],
        water:['#245e70','#286d7a','#31808a','#4a9292'],foam:['#82b0a6','#afc7af'],quay:{west:360,north:413,reach:26}},
      furniture:{stall0:['stall',1],stall1:['stall',1,'deserto'],well:['well',1],arcade:['portico',1,'costa',{w:68}],
        pierHead:['pier',.72,'costa',{w:38}],lamp:['lamp',1]},
      props:[
        ['well',141,337,10],['arcade',477,272,8],['stall0',356,393,9],['stall1',476,394,9],
        ['stall0',380,407,9],['stall1',524,414,8],['crate',365,459,8],['cargo',397,465,10],['board',423,440],
        ['crate',602,467,9],['cargo',700,425,8],['crate',748,462,8],
        ['boat',603,540],['boat',631,552],['boat',706,526],['pierHead',552,563],['pierHead',673,537],
        ['palm',132,254,6],['palm',555,275,6],['palm',308,273,6],['palm',772,295,6],
        ['palm',213,387,6],['palm',782,378,6],
        ['lamp',219,214],['lamp',329,230],['lamp',501,237],['lamp',668,267],['lamp',230,313],['lamp',310,382],
        ['lamp',402,359],['lamp',515,384],['lamp',640,360],['lamp',762,405],['lamp',273,450],['lamp',444,454],
        ['lamp',519,453],['lamp',567,545],['lamp',685,522],['lamp',728,425]
      ],
      vegetation:{top:62,stepX:45,stepY:49,border:[162,145,793,450],edgeChance:45,innerChance:9,
        species:['palm','palm','grass','grass','grass','rock','grass','grass'],radius:[6,6,2,2,2,3,2,2]}
    };
  }

  window.UrbanProfiles=[filoni(),calis()];
})();
