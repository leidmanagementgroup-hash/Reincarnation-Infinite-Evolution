/* Additional territories. The original Lùmora renderer remains the owner of its three maps. */
(() => {
  'use strict';
  const original=window.World;
  const regions=Object.fromEntries(Object.entries(original.regions).map(([id,r])=>[id,{...r,continent:'continent-1'}]));
  const advanced={};
  const continents=[
    ['Vaelthoria','Il Cuore del Mondo','Centro',50,50,'La Custode delle Origini','Valle degli Antichi','ancient-valley',624,383,'La Custode ricorda il primo patto. Gli Ardel separavano la memoria dal corpo, ma rimettevano ogni anima nel suo stesso cammino.'],
    ['Nordharyn','Le Terre dei Re Antichi','Nord',50,12,'La Sentinella Eterna','Altopiano dei Re Perduti','winter-citadel',877,272,'La spada è rivolta verso il basso. L’iscrizione parla di un custode che scelse di vegliare sulle vite, non sulle corone.'],
    ['Myrathen','Le Terre degli Arcani','Est',83,50,'L’Oracolo del Velo','Conca delle Stelle Silenziose','moon-grove',877,272,'Tra i cristalli compare una mappa incompleta. I cinque monumenti formano una frase: ogni ritorno appartiene alla stessa anima.'],
    ['Voryndhal','La Culla Primordiale','Sud',50,88,'La Madre delle Radici','Santuario del Primo Germoglio','root-sanctuary',877,272,'Sotto le radici è custodita un’urna vuota. Gli Ardel lasciarono che ogni anima riprendesse la propria forma, anche dopo la caduta delle loro città.'],
    ['Azheryon','Le Terre delle Mille Corone','Ovest',17,50,'Il Giudice delle Ere','Gola delle Mille Corone','sunken-dunes',877,272,'L’ultima riga del patto chiede ai custodi di non trattenere il potere dei morti. Il cammino sopravvive grazie a ciò che ciascuno è diventato.']
  ].map(([name,subtitle,direction,x,y,title,landmark,region,sx,sy,lore],i)=>({
    id:'continent-'+(i+1),name,subtitle,direction,position:{x,y},regions:[],
    statue:{id:'rebirth-'+(i+1),name:title,landmark,region,x:sx,y:sy,spawn:{x:sx-28,y:sy+28},lore,implemented:true,design:i}
  }));
  const formats={
    ruin:{grounds:['#6f8558','#778e60','#819866','#829273'],edge:'#546c55',track:'#b6a680',stone:['#4a5e5b','#71837a','#a4ad96'],plant:['#294e47','#527450','#6f9259'],water:'#4b8290',roof:'#6d8a87',kind:'leaf'},
    pine:{grounds:['#69817e','#76928c','#97aca8','#b2c3bc'],edge:'#496360',track:'#aab1a4',stone:['#506568','#809899','#c8dcda'],plant:['#294a4d','#466b66','#739b8b'],water:'#5f8596',roof:'#445b72',kind:'pine'},
    snow:{grounds:['#aabebf','#bbccc8','#cad8d2','#a1b5b7'],edge:'#748889',track:'#b0b2a3',stone:['#5c6f7d','#8294a4','#dce5e3'],plant:['#426065','#698e87','#b6d3cc'],water:'#7999ab',roof:'#50586f',kind:'pine'},
    fae:{grounds:['#557369','#608374','#6d8e7b','#67768a'],edge:'#405f62',track:'#a7a08f',stone:['#394b5c','#6b7f8b','#a5bcc3'],plant:['#284b52','#466d68','#75a793'],water:'#537596',roof:'#56678a',kind:'leaf'},
    star:{grounds:['#62647e','#73748c','#7c8198','#667d87'],edge:'#484e6a',track:'#aaa9af',stone:['#454862','#767891','#c9bdd8'],plant:['#414968','#63688d','#a89ccc'],water:'#526d99',roof:'#6b678b',kind:'crystal'},
    grass:{grounds:['#87814f','#9b965b','#a3a268','#8c9866'],edge:'#6c704d',track:'#c4ad75',stone:['#706855','#9a8b69','#c1b48e'],plant:['#455b40','#67804b','#94a45b'],water:'#4d8080',roof:'#8a624c',kind:'umbrella'},
    root:{grounds:['#466d53','#527d5c','#658c66','#63845f'],edge:'#395d4b',track:'#aa9775',stone:['#465d55','#718479','#a3ac8e'],plant:['#244c43','#3c6e51','#608f57'],water:'#407d77',roof:'#726753',kind:'leaf'},
    shore:{grounds:['#a99563','#bda773','#cbb880','#acaa79'],edge:'#827b58',track:'#d3bc88',stone:['#6d6652','#9b906e','#d1c399'],plant:['#3f624f','#6b8559','#9eab64'],water:'#508491',roof:'#9c685a',kind:'palm'},
    canyon:{grounds:['#936f58','#ae825d','#bd9468','#aa8c63'],edge:'#735e4f',track:'#d2ae80',stone:['#6c544b','#a2765f','#d9ac82'],plant:['#4b6551','#788c62','#9da36c'],water:'#4e8588',roof:'#8e574b',kind:'rock'}
  };
  const at=(x,y)=>({x,y}), w=1296,h=816;
  const link=(id,point,to,arrival,label)=>({id,...point,to,arrival,label,minStage:0});
  const descriptions=[
    ['ancient-valley','Valle degli Antichi','Rovine d’erba, pianure e colline boschive. Le vecchie strade degli Ardel si diramano dai resti di un acquedotto.','ruin',0,'Arco di Serralba',['Rovine Ardel','Piana delle Acque','Colline dei Travertini'],['moth','thorn','wolf','sentinel']],
    ['frost-pass','Passo dei Larici','Una via mineraria unisce boschi di conifere, gole e prati di disgelo.','pine',1,'Borgo dei Filoni',['Foresta dei Larici','Gola del Disgelo','Prati di Brina'],['moth','wolf','scarab','sentinel']],
    ['winter-citadel','Altopiano dei Re Perduti','Campi innevati sopra le mura di una cittadella, tra scarpate e ghiaioni.','snow',1,'Rocca di Hadrin',['Spalto Gelato','Vetta dei Voti','Bosco Ghiacciato'],['wolf','thorn','sentinel','crystalguard']],
    ['verdant-canopy','Selva degli Alambicchi','Sentieri forestali costeggiano le pozze arcane e il quartiere dei maestri del vetro.','fae',2,'Accademia di Velaris',['Pozze dei Riflessi','Querceto Incantato','Ruderi di Vetro'],['moth','thorn','shardling','shade']],
    ['moon-grove','Conca delle Stelle Silenziose','Cristalli tra boschi notturni e radure dove l’erba risponde al cielo.','star',2,'Corte di Siderea',['Campo delle Gemme','Bosco del Velo','Terrazza delle Comete'],['moth','shardling','shade','crystalguard']],
    ['golden-savanna','Savana dei Giganti','Pianure dorate, alberi a ombrello, scarpate e rive di marea.','grass',3,'Terrazze di Namar',['Radure d’Ocra','Piana dei Mandriani','Riva dei Giganti'],['moth','scarab','thorn','ember']],
    ['root-sanctuary','Santuario del Primo Germoglio','Sentieri in ombra fra radici monumentali, ruscelli e resti di una città antica.','root',3,'Borgo delle Fronde',['Acque di Rame','Radura dei Fusti','Terrazza del Primo Seme'],['moth','thorn','wolf','crystalguard']],
    ['dune-port','Costa delle Sette Vele','Banchi commerciali sulla costa, dune basse e praterie salmastre.','shore',4,'Porto di Calis',['Dune del Sale','Prateria del Vento','Baia del Carico'],['moth','scarab','wolf','ember']],
    ['sunken-dunes','Gola delle Mille Corone','Un canyon scolpito sopra altipiani secchi, oasi e strade carovaniere.','canyon',4,'Oasi di Damar',['Altipiano del Rame','Pozza dei Sigilli','Via delle Carovane'],['moth','scarab','sentinel','crystalguard']]
  ];
  const anchor=at(454,384), entry=at(138,413), exit=at(1145,443), end=at(113,413), far=at(1174,443);
  for(const [i,row] of descriptions.entries()){
    const [id,name,description,palette,continent,town,places,fauna]=row;
    const fort=continents[continent].statue.region===id?continents[continent].statue:null;
    const points={
      gates:[], bosses:[],
      mobs:[[260,286],[329,537],[568,229],[626,523],[717,183],[751,556],[1038,202],[1050,552],[951,659],[1123,660],[473,563],[271,653]].map(([x,y],n)=>({x,y,type:fauna[(n+i)%fauna.length]})),
      resources:[[178,363],[296,447],[325,350],[510,273],[584,503],[670,240],[788,445],[826,528],[962,387],[1010,545],[1120,586],[455,494],[310,569],[536,592],[735,684]].map(([x,y],n)=>({x,y,type:n%4===1?'wood':n%3===0||n%5===0?'ore':'herb'}))
    };
    const zone={x:336,y:625,w:288,h:116};
    const settlement={id:'settlement-'+id,name:town,...anchor,radius:78,npcSpots:[at(428,402),at(485,398)]};
    const marks=[{name:town,...anchor},{name:places[0],x:280,y:292},{name:places[1],x:753,y:185},{name:places[2],x:1025,y:562}];
    if(fort)marks.push({name:fort===continents[0].statue?'Rovine della Custode':fort.landmark,x:fort.x,y:fort.y});
    const guard=[settlement,entry,exit,...points.mobs,...points.resources];
    if(fort)guard.push({...fort,x:fort.x,y:fort.y,protect:97},{...fort.spawn,protect:45});
    const region={id,name,description,width:w,height:h,spawn:entry,continent:continents[continent].id,palette,places,biomes:places,landmarks:marks,points,settlement,buildZone:zone,statue:fort,guard};
    advanced[id]=regions[id]=region;
  }
  for(const id of ['valley','quarry','rift'])continents[0].regions.push(id);
  for(const reg of Object.values(advanced))continents.find(c=>c.id===reg.continent).regions.push(reg.id);
  const hub=advanced['ancient-valley'], ValleyTrail=at(1220,626);
  const crypt={
    id:'ardel-crypt',name:'Cripta delle Soglie',description:'Tre sale sotterranee degli Ardel custodiscono archi e tracce del patto.',
    width:w,height:h,spawn:at(154,542),continent:continents[0].id,palette:'star',statue:null,guard:[],
    landmarks:[{name:'Anticamera',x:154,y:542},{name:'Sala delle Chiavi',x:694,y:491},{name:'Camera dei Nomi',x:675,y:222},{name:'Ultima Soglia',x:1110,y:248}],
    rooms:[[88,458,208,166],[277,517,255,57],[508,414,234,214],[600,300,53,142],[538,147,253,181],[760,197,249,48],[966,110,221,239]],
    points:{bosses:[],gates:[link('crypt-return',at(116,542),hub.id,at(417,203),'Torna alla Valle degli Antichi')],
      mobs:[[333,544,'thorn'],[539,510,'moth'],[663,557,'shade'],[614,193,'shardling'],[737,275,'crystalguard'],[930,220,'moth'],[1085,188,'sentinel'],[1070,291,'shade']].map(([x,y,type])=>({x,y,type})),
      resources:[[203,497,'ore'],[690,590,'ore'],[582,177,'herb'],[1153,151,'ore']].map(([x,y,type])=>({x,y,type}))},
    marks:[{x:694,y:491},{x:675,y:222},{x:1110,y:248}]
  };
  advanced[crypt.id]=regions[crypt.id]=crypt;
  const valley=regions.valley;
  valley.points={...valley.points,gates:[...valley.points.gates,link('road-ardel',ValleyTrail,hub.id,entry,'Segui la via per la Valle degli Antichi')]};
  valley.landmarks=[...valley.landmarks,{name:'Via degli Antichi',...ValleyTrail}];
  hub.points.gates.push(link('return-lumora',end,'valley',at(1201,641),'Rientra nella Valle di Lùmora'));
  hub.points.gates.push(link('crypt-door',at(430,177),crypt.id,crypt.spawn,'Scendi nella Cripta delle Soglie'));
  const hubExits=[at(704,101),at(1174,409),at(704,709),at(105,651)];
  const lines=[['frost-pass','winter-citadel'],['verdant-canopy','moon-grove'],['golden-savanna','root-sanctuary'],['dune-port','sunken-dunes']];
  for(const [i,[from,to]] of lines.entries()){
    const a=advanced[from],b=advanced[to],e=hubExits[i];
    const hubArrival=at(e.x+(i===1?-26:i===3?26:0),e.y+(i===0?26:i===2?-26:0));
    hub.points.gates.push(link('route-'+from,e,from,entry,'Parti verso '+continents[i+1].name));
    a.points.gates.push(link('from-'+from,end,hub.id,hubArrival,'Torna a Vaelthoria'));
    a.points.gates.push(link('route-'+to,far,to,entry,'Raggiungi '+b.name));
    b.points.gates.push(link('from-'+to,end,from,exit,'Ritorna a '+a.name));
  }
  for(const r of Object.values(advanced)){
    r.points.mobs=r.points.mobs.filter(m=>!r.statue||Math.hypot(m.x-r.statue.spawn.x,m.y-r.statue.spawn.y)>155);
    r.guard.push(...r.points.gates.flatMap(g=>[{x:g.x,y:g.y,protect:35}]));
    r.landmarks.push(...r.points.gates.map(g=>({name:regions[g.to].name,x:g.x,y:g.y})));
  }
  for(const reg of Object.values(regions))for(const g of reg.points.gates){
    advanced[g.to]?.guard.push({...g.arrival,protect:41});
  }
  const coastLines={
    shore:[[303,145,295,92],[1020,730,276,58]],grass:[[1005,717,266,62]],pine:[[736,676,102,62]],
    fae:[[848,700,107,69]],root:[[931,683,165,68]],snow:[[1004,157,150,68]],star:[[463,164,110,55]],
    ruin:[[1010,711,135,67]],canyon:[[445,157,122,54]]
  };
  const radius=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const inZone=(x,y,z,gap=0)=>x>=z.x-gap&&x<=z.x+z.w+gap&&y>=z.y-gap&&y<=z.y+z.h+gap;
  function makeCanvas(width,height){const img=document.createElement('canvas');img.width=width;img.height=height;return img;}
  function tile(c,color,x,y,w=1,h=1){c.fillStyle=color;c.fillRect(x|0,y|0,w|0,h|0);}
  function poly(c,color,points){
    c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();
  }
  function disc(c,color,x,y,rx,ry){
    for(let j=-ry;j<=ry;j++){const d=Math.floor(rx*Math.sqrt(Math.max(0,1-j*j/(ry*ry))));tile(c,color,x-d,y+j,2*d+1);}
  }
  function random(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
  function hash(x,y,a){let d=Math.imul(x+13,83492791)^Math.imul(y+179,2971215073)^a;return (Math.imul(d^(d>>>16),1597334677)>>>0)/4294967296;}
  function shoreHit(reg,x,y,margin=0){
    if(inZone(x,y,reg.buildZone,6))return false;
    return coastLines[reg.palette].some(([a,b,rx,ry])=>((x-a)/(rx+margin))**2+((y-b)/(ry+margin))**2<=1);
  }
  for(const r of Object.values(advanced)){
    if(r.rooms)continue;
    for(const marker of [...r.points.resources,...r.points.mobs]){
      if(!shoreHit(r,marker.x,marker.y,10))continue;
      const options=[];
      for(let d=16;d<=128;d+=16)for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]])
        options.push({x:marker.x+d*dx,y:marker.y+d*dy});
      const dry=options.find(p=>p.x>32&&p.y>32&&p.x<w-32&&p.y<h-32&&!shoreHit(r,p.x,p.y,12)&&
        !inZone(p.x,p.y,r.buildZone,9)&&(!r.statue||radius(p,r.statue.spawn)>150)&&
        radius(p,anchor)>86&&r.points.gates.every(g=>radius(g,p)>43));
      if(dry)Object.assign(marker,dry);
    }
  }
  function pathPoints(reg){
    const nodes=[[end.x,end.y],[222,436],[336,398],[454,384],[511,381],[624,383],[724,438],[918,430],[far.x,far.y]];
    const roads=[nodes,[[511,381],[516,507],[500,604],[470,627]],[[724,438],[742,349],[811,304],[877,304]]];
    if(reg===hub){
      roads.push([[624,383],[670,253],[705,100]],[[918,430],[1174,409]],[[724,438],[710,573],[704,709]],[[222,436],[154,565],[105,651]]);
    }
    return roads;
  }
  function segDistance(x,y,a,b){
    const u=b[0]-a[0],v=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*u+(y-a[1])*v)/(u*u+v*v)));
    return Math.hypot(x-a[0]-t*u,y-a[1]-t*v);
  }
  function paintRoad(c,r,palette,roads){
    c.lineJoin='round';c.lineCap='round';
    for(const [i,ls] of roads.entries()){
      for(const [size,col] of [[i===0?31:20,palette.edge],[i===0?26:16,palette.track]]){
        c.beginPath();c.lineWidth=size;c.strokeStyle=col;
        ls.forEach(([x,y],k)=>k?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
      }
    }
  }
  function groundNoise(x,y,size,seed){
    const ix=Math.floor(x/size),iy=Math.floor(y/size),u=x/size-ix,v=y/size-iy;
    const a=hash(ix,iy,seed)*(1-u)+hash(ix+1,iy,seed)*u;
    const b=hash(ix,iy+1,seed)*(1-u)+hash(ix+1,iy+1,seed)*u;
    return a*(1-v)+b*v;
  }
  function paintSelvaGround(c,r,roads,seed){
    const half=makeCanvas(w/2,h/2),g=half.getContext('2d',{willReadFrequently:true}),mw=half.width,mh=half.height;
    g.lineJoin='round';g.lineCap='round';g.strokeStyle='#fff';
    for(const [i,road] of roads.entries()){
      g.lineWidth=i===0?13:7.5;g.beginPath();
      road.forEach(([x,y],n)=>n?g.lineTo(x/2,y/2):g.moveTo(x/2,y/2));g.stroke();
    }
    const mask=g.getImageData(0,0,mw,mh).data,pixels=g.createImageData(mw,mh);
    const palettes=[
      [0x436255,0x4c6f5d,0x577b65,0x61846b,0x6e8d6d,0x7a9776],
      [0x506c65,0x59796f,0x638479,0x6d8c81,0x789583,0x849e89],
      [0x73775c,0x7d8063,0x87886a,0x929273,0x9e9d7d,0xaca788],
      [0x8e8667,0x9a906e,0xa79a75,0xb2a37d,0xbdae86,0xc6b78e],
      [0x888e82,0x92978a,0x9d9f8d,0xa9a894,0xb2b09a,0xc2bda4]
    ];
    const roadAt=(i,j)=>mask[(Math.max(0,Math.min(mw-1,i))+Math.max(0,Math.min(mh-1,j))*mw)*4+3];
    for(let j=0;j<mh;j++)for(let i=0;i<mw;i++){
      const x=i*2,y=j*2,q=hash(i,j,seed);
      const broad=groundNoise(x,y,91,seed+29),fine=groundNoise(x,y,17,seed+423);
      const n=broad*.58+fine*.31+q*.11;
      const shift=Math.floor((groundNoise(x,y,10,seed+83)-.5)*4);
      const u=i+shift,v=j+Math.floor(shift/2),path=roadAt(u,v)>120;
      const edge=path||roadAt(u-2,v)>120||roadAt(u+2,v)>120||roadAt(u,v-2)>120||roadAt(u,v+2)>120;
      const forecourt=((x-450)/82)**2+((y-390)/23)**2<1;
      const damp=((x-852)/158)**2+((y-699)/123)**2<1.05+broad*.5;
      const palette=path?(forecourt?4:3):edge?2:damp?1:0;
      const tone=Math.max(0,Math.min(5,Math.floor(n*8)-1));
      const color=palettes[palette][tone],k=(i+j*mw)*4;
      pixels.data[k]=color>>16;pixels.data[k+1]=(color>>8)&255;pixels.data[k+2]=color&255;pixels.data[k+3]=255;
    }
    g.putImageData(pixels,0,0);c.imageSmoothingEnabled=false;c.drawImage(half,0,0,w,h);
    const rnd=random(seed^0x2cf971d5);
    for(let i=0;i<2650;i++){
      const x=Math.floor(rnd()*w),y=Math.floor(rnd()*h),q=rnd();
      if(shoreHit(r,x,y,9)||inZone(x,y,r.buildZone,3))continue;
      const road=roadAt(x>>1,y>>1)>120;
      if(road){
        tile(c,q<.24?'#736d563b':'#e8d8a94d',x,y,2+Math.floor(rnd()*5),1);
      }else{
        const patch=groundNoise(x,y,36,seed+192);
        if(patch<.43)continue;
        tile(c,patch>.63?'#afbb7c68':'#d4d09638',x,y,2+Math.floor(rnd()*5),1);
        if(q>.88){
          tile(c,'#2b605764',x-2,y+1,5,2);
          tile(c,'#6a9a73',x,y-3,1,4);
          tile(c,patch>.63?'#d1b8ba':'#c4c88d',x-1,y-3,3,1);
          if(q>.95)tile(c,'#e2dabb',x,y-4);
        }
      }
    }
  }
  // Terreno per bioma (World Art Overhaul): tavolozze a rampe per suolo, prato umido, zona secca, margine, sentiero e
  // lastricato; dettagli con un seme proprio, così la sequenza casuale degli oggetti solidi resta quella pubblicata.
  const hex=s=>parseInt(s.slice(1),16);
  const groundArt={
    ruin:{soil:['#4a6b45','#557747','#61834b','#6e8e50','#7b9a56','#89a55e','#98b068'],lush:['#466c45','#507749','#5b834e','#678e54'],
      dry:['#7d8c55','#8b975c','#9aa365','#a9ae70'],verge:['#6a7a50','#788553','#87905b'],track:['#94825e','#a28f67','#b09c71','#bda97c','#c9b588'],
      paving:['#9c9480','#b0a891','#c3bba3','#d3cbb4'],joint:'#7f7865',
      tuft:['#3f6640','#5e8a4f','#8fae62'],flowers:['#e8d296','#d99f86','#f2e9c8','#b8b5d8','#e6b0b5'],pebble:['#8d8670','#c2b99c'],coast:'#7d9677'},
    pine:{soil:['#3c5850','#456258','#4f6d60','#5a7868','#668271','#738c7a','#819784'],lush:['#38574a','#41624f','#4b6d56'],
      dry:['#6c7a62','#79866a','#879173','#95997c'],verge:['#59695f','#667467','#737f70'],track:['#7a807c','#888e88','#979c94','#a6aaa0','#b4b6ab'],
      paving:['#646f73','#768185','#899397','#9da5a7'],joint:'#4d585c',
      tuft:['#2f4c42','#4f6f5c','#7f977a'],flowers:['#cfd8e8','#9fb3d6','#e8e2c8'],pebble:['#6b7472','#a9b1ab'],litter:'#6d5a45',coast:'#6e8a86'},
    snow:{soil:['#9eb1bc','#adbec7','#bccad1','#cad6da','#d7e1e3','#e4ebeb','#f0f4f1'],lush:['#7e8e8c','#8c9b97','#9caaa4'],
      dry:['#dfe7ea','#e9eff0','#f3f6f4'],verge:['#8e9fa9','#9fafb6','#b0bec3'],track:['#8a9494','#98a19f','#a6aeaa','#b4bab4','#c2c6bf'],
      paving:['#6d7a86','#7e8b96','#919ea7','#a5b0b8'],joint:'#556270',
      tuft:['#6b7f7c','#8fa19c','#ffffff'],flowers:['#ffffff','#dfe9f2'],pebble:['#5c6f7d','#8294a4'],coast:'#8fa5b2'},
    star:{soil:['#434a68','#4d5473','#575e7e','#626889','#6e7393','#7a7e9d','#888ba7'],lush:['#3c5a68','#446671','#4e737c','#59807f'],
      dry:['#676385','#736e90','#807a9c','#8d86a7'],verge:['#575b77','#646782','#71738d'],track:['#88879a','#9694a6','#a4a1b2','#b2aebd','#c0bcc8'],
      paving:['#666986','#787a97','#8b8ca8','#a09fba'],joint:'#4b4d68',
      tuft:['#3d5a6c','#5f86a0','#9fd0e0'],flowers:['#bfe9ff','#e3c8ff','#9ff0dd','#f5e6ff'],pebble:['#5b5d78','#a9a3c8'],coast:'#5d7398'},
    grass:{soil:['#887f48','#958a4e','#a29555','#ae9f5d','#baa966','#c5b371','#cfbd7d'],lush:['#6b7744','#77844a','#849051','#919b59'],
      dry:['#9f7d51','#ab8858','#b79461','#c29f6b'],verge:['#958359','#a28e60','#ae9a69'],track:['#a47a53','#b0855a','#bc9162','#c79d6b','#d1a876'],
      paving:['#a38c6a','#b59d78','#c6ae86','#d3bb93'],joint:'#7e6a50',
      tuft:['#7d6e3c','#c2aa62','#e2cd88'],flowers:['#e6c86a','#d47e55','#f1e2b0'],pebble:['#8f7a5c','#cdb28a'],coast:'#8c8c5c'},
    root:{soil:['#2e4a3a','#355440','#3d5e46','#45694c','#4e7353','#587d5a','#638862'],lush:['#3a6846','#43744d','#4e8054','#5a8c5c'],
      dry:['#585a3c','#646443','#706e4b','#7c7954'],verge:['#4a5a3f','#566547','#62704f'],track:['#6b5f47','#786b4f','#857757','#928360','#9e8f6a'],
      paving:['#5d695a','#6c7867','#7d8875','#8e9884'],joint:'#44503f',
      tuft:['#2f5a3a','#5d9a5e','#8cc07a'],flowers:['#e9e2c0','#b5523c','#d9a7c9','#a07a45'],pebble:['#5b6655','#8e9a85'],litter:'#9a7442',coast:'#4f7a6e'},
    shore:{soil:['#b29e6d','#bda876','#c7b280','#d1bc8b','#dac696','#e2d0a3','#e9dab1'],lush:['#8a9262','#969e69','#a3aa72','#b0b57c'],
      dry:['#d6c99e','#e0d4ac','#e9dfba','#f1e8c7'],verge:['#a4976b','#b1a375','#bdae7f'],track:['#a38b61','#af9669','#bba272','#c6ad7c','#d0b786'],
      paving:['#b7b2a2','#c7c2b2','#d6d1c1','#e3decf'],joint:'#968f7d',
      tuft:['#6f8250','#a5b06e','#d0cf95'],flowers:['#f2e6d0','#e9c8b8','#c6d7d0'],pebble:['#a99777','#f3ead6'],coast:'#c9b98c'},
    canyon:{soil:['#8b624f','#986c55','#a5775c','#b18263','#bc8d6b','#c69873','#cfa37d'],lush:['#6d784d','#7a8454','#878f5c','#949a65'],
      dry:['#c1a07a','#ccab85','#d6b791','#dfc29d'],verge:['#9a785b','#a68362','#b18e6a'],track:['#ad8763','#b8926b','#c39d74','#cda87e','#d6b389'],
      paving:['#a68265','#b59172','#c4a080','#d0ad8d'],joint:'#80614b',
      tuft:['#6f6a40','#9a9a5c','#c8c07d'],flowers:['#e3b07a','#d9d08a','#f0dcc0'],pebble:['#7c5544','#d9b088'],coast:'#a3946a'}
  };
  for(const art of Object.values(groundArt))for(const key of ['soil','lush','dry','verge','track','paving'])art[key+'Rgb']=art[key].map(hex);
  function coastDepth(r,x,y){
    let best=9;
    for(const [a,b,rx,ry] of coastLines[r.palette]){const d=((x-a)/rx)**2+((y-b)/ry)**2;if(d<best)best=d;}
    return best;
  }
  function paintRegionGround(c,r,roads,seed,art){
    const half=makeCanvas(w/2,h/2),g=half.getContext('2d',{willReadFrequently:true}),mw=half.width,mh=half.height;
    g.lineJoin='round';g.lineCap='round';g.strokeStyle='#fff';
    for(const [i,road] of roads.entries()){
      g.lineWidth=i===0?14:8;g.beginPath();
      road.forEach(([x,y],n)=>n?g.lineTo(x/2,y/2):g.moveTo(x/2,y/2));g.stroke();
    }
    const mask=g.getImageData(0,0,mw,mh).data,pixels=g.createImageData(mw,mh);
    const roadAt=(i,j)=>mask[(Math.max(0,Math.min(mw-1,i))+Math.max(0,Math.min(mh-1,j))*mw)*4+3]>120;
    const pick=(ramp,v)=>ramp[Math.max(0,Math.min(ramp.length-1,Math.floor(v*ramp.length)))];
    const arid=r.palette==='shore'||r.palette==='canyon',snowy=r.palette==='snow';
    const lushAt=arid?-1:snowy?.22:r.palette==='grass'?.3:.37;
    for(let j=0;j<mh;j++)for(let i=0;i<mw;i++){
      const x=i*2,y=j*2,grain=hash(i,j,seed+5);
      const broad=groundNoise(x,y,118,seed+31),mid=groundNoise(x,y,37,seed+97),fine=groundNoise(x,y,13,seed+211);
      const shift=Math.floor((groundNoise(x,y,9,seed+83)-.5)*5),u=i+shift,v=j+(shift>>1);
      const road=roadAt(u,v),verge=!road&&(roadAt(u-2,v)||roadAt(u+2,v)||roadAt(u,v-2)||roadAt(u,v+2));
      const worn=road&&roadAt(u-3,v)&&roadAt(u+3,v)&&roadAt(u,v-3)&&roadAt(u,v+3);
      let tone=mid*.5+fine*.32+grain*.18,ramp;
      if(road){
        ramp=art.trackRgb;tone=tone*.85+(worn?.22:0)-(fine>.62&&!worn?.1:0);
      }else if(verge)ramp=art.vergeRgb;
      else{
        // Retino ai confini fra zone: la scelta oscilla col granello in una fascia stretta, senza linee nette.
        const wet=coastDepth(r,x,y),zone=broad+(fine-.5)*.16+(wet<1.9&&!arid?-.28*(1.9-wet):0),blur=(grain-.5)*.07;
        ramp=zone+blur<lushAt?art.lushRgb:zone+blur>.66?art.dryRgb:art.soilRgb;
        if(arid&&wet<1.5+blur*4)ramp=r.palette==='shore'?art.dryRgb:art.lushRgb;
        if(snowy)tone+=(broad-.5)*.3;
        // Bande di duna sui suoli aridi (idea recuperata dal lavoro non committato di Codex).
        if(arid)tone+=Math.sin(y*.115+x*.037+broad*5)*.035;
      }
      const color=pick(ramp,tone),k=(i+j*mw)*4;
      pixels.data[k]=color>>16;pixels.data[k+1]=(color>>8)&255;pixels.data[k+2]=color&255;pixels.data[k+3]=255;
    }
    g.putImageData(pixels,0,0);c.imageSmoothingEnabled=false;c.drawImage(half,0,0,w,h);
    return roadAt;
  }
  // Dettagli del suolo per bioma: ciuffi, fiori, ciottoli, aghi, cumuli di neve, increspature e crepe.
  function paintGroundDetails(c,r,seed,art,roadAt){
    const rnd=random(seed^0x5bd1e995),pal=r.palette,[shadow,mid,light]=art.tuft;
    const count=pal==='snow'?3200:pal==='canyon'||pal==='shore'?3000:4200;
    for(let i=0;i<count;i++){
      const x=Math.floor(rnd()*w),y=Math.floor(rnd()*h),q=rnd(),q2=rnd();
      if(shoreHit(r,x,y,4)||inZone(x,y,r.buildZone,3))continue;
      if(roadAt(x>>1,y>>1)){
        if(q<.5)tile(c,art.pebble[q<.2?0:1]+(q<.2?'aa':'cc'),x,y,1+Math.floor(q2*3),1);
        else if(q>.93){tile(c,art.pebble[0],x,y+1,3,1);tile(c,art.pebble[1],x,y,3,1);}
        continue;
      }
      const patch=groundNoise(x,y,41,seed+192);
      if(pal==='snow'){
        if(q<.55){tile(c,'#8ea4b855',x,y+1,4+Math.floor(q2*6),1);tile(c,'#ffffffaa',x+1,y,3+Math.floor(q2*5),1);}
        else if(q<.7&&patch>.55){tile(c,shadow,x,y,1,3);tile(c,mid,x+1,y-1,1,4);tile(c,'#ffffff',x,y-1,1,1);}
        else if(q>.985)tile(c,'#ffffff',x,y,1,1);
        continue;
      }
      if(pal==='shore'||pal==='canyon'){
        if(q<.42){const len=4+Math.floor(q2*9);tile(c,art.verge[0]+'70',x,y+1,len,1);tile(c,art.dry[2]+'90',x+1,y,len-2,1);}
        else if(q<.62&&pal==='canyon'){tile(c,art.pebble[0]+'90',x,y,1,2);tile(c,art.pebble[0]+'90',x+1,y+2,2,1);tile(c,art.pebble[0]+'90',x+3,y+3,1,2);}
        else if(q<.78&&patch>.52){tile(c,shadow,x,y,1,3);tile(c,mid,x+1,y-1,1,4);tile(c,mid,x-1,y,1,2);tile(c,light,x+1,y-2,1,1);}
        else if(q>.975){tile(c,art.flowers[0],x,y,2,1);tile(c,art.flowers[1],x+1,y-1,1,1);}
        else if(q>.9)tile(c,art.pebble[1],x,y,2,1);
        continue;
      }
      if(pal==='grass'&&q<.5){
        // Erba alta della savana: steli chiari con la base in ombra.
        for(let b=0;b<3;b++){const h=3+Math.floor(hash(x+b,y,7)*4);tile(c,shadow,x+b*2,y-h+2,1,h);tile(c,light,x+b*2,y-h+1,1,1);}
        continue;
      }
      if(patch<.4&&q<.6)continue;
      if(q<.55){
        tile(c,shadow+'b0',x-1,y+1,5,1);tile(c,mid,x,y-1,1,2);tile(c,mid,x+2,y-2,1,3);tile(c,light,x+2,y-2,1,1);
        if(q2>.5)tile(c,mid,x-1,y,1,1);
      }else if(q<.68&&art.litter){tile(c,art.litter+'99',x,y,2,1);tile(c,art.litter+'66',x+1,y+1,1,1);}
      else if(q<.86&&patch>.5){
        const flower=art.flowers[Math.floor(q2*art.flowers.length)];
        for(let b=0;b<2+Math.floor(q2*3);b++){const xx=x+Math.floor(hash(x,b,3)*9),yy=y+Math.floor(hash(b,y,5)*4);tile(c,shadow,xx,yy,1,2);tile(c,flower,xx-1,yy-1,2,1);}
      }else if(q>.97)tile(c,art.pebble[1],x,y,2,1);
    }
  }
  // Rive a strati: sabbia o erba umida, schiuma, fondale più scuro al centro, riflessi.
  function paintCoast(c,r,art,palette,x,y,rx,ry){
    const water=palette.water;
    disc(c,art.coast,x,y,rx+9,ry+8);disc(c,palette.edge,x,y,rx+5,ry+4);
    disc(c,'#e6efe6',x,y,rx+2,ry+1);disc(c,water,x,y,rx,ry);
    disc(c,'#ffffff1c',x,y-1,rx-3,ry-3);disc(c,water,x,y+1,rx-6,ry-5);
    disc(c,'#16304a33',x+2,y+3,Math.max(4,rx-18),Math.max(3,ry-14));disc(c,'#0d243e2a',x+3,y+5,Math.max(3,rx-34),Math.max(2,ry-24));
  }
  // Piazza lastricata del borgo e pavimento radiale del monumento.
  function paintPlaza(c,art,seed){
    // Lastre di larghezza variabile; verso il bordo si diradano e lasciano vedere la terra battuta.
    const cx=452,cy=401,rx=76,ry=25;
    for(let row=-7;row<=7;row++){
      let x=cx-rx-6+Math.floor(hash(row,3,seed+71)*5);
      while(x<cx+rx+6){
        const y=cy+row*4,size=4+Math.floor(hash(x,row,seed+73)*4),d=((x+size/2-cx)/rx)**2+((y+1-cy)/ry)**2,q=hash(x,y,seed+79);
        if(d<1&&!(d>.62&&q<(d-.62)*1.9)){
          const tone=d>.8?Math.floor(q*2):Math.floor(q*3)+(q>.82?1:0);
          tile(c,art.joint+'cc',x-1,y-1,size+1,4);
          tile(c,art.paving[Math.min(3,tone)],x,y,size-1,3);
          tile(c,art.paving[3]+'80',x,y,size-2,1);
          if(q>.93)tile(c,art.tuft[1]+'aa',x+1,y+2,2,1);
        }
        x+=size;
      }
    }
    disc(c,art.joint,cx,cy,9,4);disc(c,art.paving[2],cx,cy,8,3);
    for(let k=0;k<8;k++){const a=k*Math.PI/4;tile(c,art.joint,cx+Math.cos(a)*5,cy+Math.sin(a)*2,1,1);}
    disc(c,art.paving[3],cx,cy,3,1);
  }
  function paintStatueFloor(c,art,palette,s,seed){
    const cx=s.x,cy=s.y+7;
    disc(c,art.joint,cx,cy,52,34);disc(c,art.paving[0],cx,cy,50,32);
    for(let ring=0;ring<4;ring++){
      const rr=48-ring*9,count=28-ring*5;
      for(let k=0;k<count;k++){
        const a=(k+ring*.5)/count*Math.PI*2,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr*.64,q=hash(k,ring,seed+19);
        tile(c,art.joint,x-3,y-2,7,4);tile(c,art.paving[1+Math.floor(q*3)],x-2,y-2,5,3);tile(c,art.paving[3]+'99',x-2,y-2,4,1);
      }
    }
    disc(c,palette.stone[0],cx,cy,14,9);disc(c,palette.stone[1],cx,cy-1,12,7);
  }
  function insideCrypt(r,x,y,margin){
    return r.rooms.some(([a,b,rw,rh])=>x>=a+margin&&x<=a+rw-margin&&y>=b+margin&&y<=b+rh-margin);
  }
  // Cripta delle Soglie (World Art Overhaul, fase 4): arenaria calda, basalto, intarsi d'oro e rune viola-ambra,
  // distinta dal Santuario della Marea Muta (freddo e acquatico). Le sale, gli oggetti e i punti non cambiano:
  // la percorribilità resta «dentro una sala» (insideCrypt) e gli arredi stanno sulle pareti o a filo del pavimento.
  const cryptRoomStyle=['ante','corridor','keys','corridor','names','corridor','threshold'];
  function makeCrypt(r,seed){
    const image=makeCanvas(w,h),c=image.getContext('2d'),objects=[],palette=formats.star;
    const glow=makeCanvas(w,h),gl=glow.getContext('2d');
    const floor=(x,y)=>insideCrypt(r,x,y,0);
    const rnd=random(seed^0x51ac2d7);
    // 1. Roccia viva: basalto bruno con venature calde.
    tile(c,'#130f13',0,0,w,h);
    const rock=random(seed^0x6c8e9cf5);
    for(let i=0;i<6000;i++){const x=Math.floor(rock()*w),y=Math.floor(rock()*h),q=rock();tile(c,q<.5?'#1c161a':'#0c090c',x,y,1+Math.floor(q*3),1);}
    for(let i=0;i<220;i++){const x=Math.floor(rock()*w),y=Math.floor(rock()*h);for(let k=0;k<10;k++)tile(c,'#2a1f1c',x+k,y+Math.round(Math.sin(k*.7+x)*2),1,1);}
    // 2. Bordi e pareti: arenaria in blocchi, pareti alte 20 px sopra ogni sala, lati e soglia anteriore.
    for(const [x,y,rw,rh] of r.rooms){tile(c,'#1d1619',x-7,y-23,rw+14,rh+31);tile(c,'#2c2224',x-5,y-21,rw+10,rh+27);}
    for(const [x,y,rw,rh] of r.rooms)tile(c,'#6d6052',x,y,rw,rh);
    for(const [i,[x,y,rw,rh]] of r.rooms.entries()){
      for(let yy=y-20;yy<y;yy++)for(let xx=x-5;xx<x+rw+5;xx++){
        if(floor(xx,yy))continue;
        const row=yy-(y-20),course=Math.floor(row/4),off=(course%2)*5,brick=Math.floor((xx+off)/10);
        const joint=row%4===3||(xx+off)%10===0;
        const q=hash(brick,course+y,seed+11);
        let col=joint?'#3b2e2a':q<.33?'#7d6a57':q<.66?'#88745f':'#927e67';
        if(row===0)col='#a8957a';if(row===19)col='#3a2c28';
        tile(c,col,xx,yy);
      }
      // Nicchie con urne, iscrizioni e (nell'Ultima Soglia) la porta sigillata in rilievo.
      const style=cryptRoomStyle[i];
      if(style!=='corridor'){
        for(let xx=x+14;xx<x+rw-18;xx+=34){
          const q=hash(xx,y,seed+23);
          if(q<.5){
            tile(c,'#1f1716',xx,y-17,9,13);tile(c,'#2b201d',xx+1,y-16,7,12);tile(c,'#a8957a',xx-1,y-18,11,1);
            tile(c,'#8a6f4d',xx+2,y-9,5,5);tile(c,'#b8946a',xx+3,y-10,3,1);tile(c,'#5d4a36',xx+2,y-5,5,1);
          }else{
            tile(c,'#5e4e40',xx-1,y-16,13,10);tile(c,'#b2a184',xx,y-15,11,8);
            for(let k=0;k<3;k++){const len=3+Math.floor(hash(xx,k,seed)*6);tile(c,'#5e4e40',xx+1,y-13+k*2,len,1);tile(c,'#5e4e40',xx+len+2,y-13+k*2,7-len,1);}
          }
        }
      }
      if(style==='threshold'){
        const cx=x+rw/2|0;
        tile(c,'#2a1f1c',cx-17,y-20,34,20);tile(c,'#8e7a62',cx-15,y-19,30,19);
        tile(c,'#1a1214',cx-10,y-16,20,16);tile(c,'#3a2a3a',cx-9,y-15,18,15);
        for(let k=0;k<5;k++){tile(c,'#d9b45c',cx-1,y-14+k*3,2,1);tile(gl,'#b48a3a',cx-1,y-14+k*3,2,1);}
        tile(c,'#c9a55a',cx-12,y-20,24,2);tile(gl,'#7a5a2a',cx-12,y-20,24,2);
        for(const d of [-1,1]){tile(c,'#a68a6a',cx+d*14-1,y-19,3,19);}
      }
      // Ombra di contatto della parete sul pavimento.
      for(let xx=x;xx<x+rw;xx++)if(floor(xx,y+1)&&!floor(xx,y-1)){tile(c,'#1a121233',xx,y,1,5);tile(c,'#1a121222',xx,y+5,1,3);}
    }
    // 3. Pavimenti per sala.
    const cellIn=(px,py,m)=>insideCrypt(r,px,py,m);
    // Prima i corridoi, poi le sale: gli ingressi restano delle sale; ogni pavimento è ritagliato sul proprio perimetro.
    const order=[...r.rooms.keys()].sort((a,b)=>(cryptRoomStyle[a]==='corridor'?0:1)-(cryptRoomStyle[b]==='corridor'?0:1));
    for(const i of order){
      const [rx,ry,rw,rh]=r.rooms[i],style=cryptRoomStyle[i];
      c.save();c.beginPath();c.rect(rx,ry,rw,rh);c.clip();
      paintCryptFloor(style,rx,ry,rw,rh);
      c.restore();
    }
    function paintCryptFloor(style,rx,ry,rw,rh){
      if(style==='corridor'){
        // Mattoni a spina di pesce con una passatoia di lastre al centro.
        for(let y=ry;y<ry+rh;y+=4)for(let x=rx;x<rx+rw;x+=8){
          const q=hash(x,y,seed+31),hz=((x/8|0)+(y/4|0))%2;
          tile(c,q<.5?'#5d4740':'#68514a',x,y,hz?8:4,hz?4:8);tile(c,'#3c2c28',x,y+(hz?3:7),hz?8:4,1);
        }
        const vertical=rh>rw;
        if(vertical){const cx=rx+rw/2|0;for(let y=ry;y<ry+rh;y+=10){tile(c,'#3a2d28',cx-9,y,18,10);tile(c,'#8f7c66',cx-8,y,16,9);tile(c,'#a28d74',cx-8,y,16,1);}}
        else{const cy=ry+rh/2|0;for(let x=rx;x<rx+rw;x+=12){tile(c,'#3a2d28',x,cy-8,12,16);tile(c,'#8f7c66',x,cy-7,11,14);tile(c,'#a28d74',x,cy-7,11,1);}}
        return;
      }
      if(style==='ante'){
        for(let y=ry;y<ry+rh;y+=13)for(let x=rx-((y/13|0)%2)*10;x<rx+rw;x+=20){
          const q=hash(x,y,seed+41);
          tile(c,'#4a3e33',x,y,20,13);tile(c,q<.3?'#75675a':q<.7?'#7f705f':'#8a7a67',x+1,y+1,18,11);tile(c,'#9a8a74',x+1,y+1,18,1);
          if(q>.9){tile(c,'#4a3e33',x+6,y+4,1,4);tile(c,'#4a3e33',x+7,y+7,3,1);}
        }
        // Sentiero consumato dal varco verso il corridoio.
        for(let x=rx;x<rx+rw;x+=2)for(let k=-9;k<=9;k+=2)if(hash(x,k,seed+43)<.35)tile(c,'#9b8b73',x,ry+84+k,2,1);
        return;
      }
      if(style==='keys'){
        for(let y=ry;y<ry+rh;y+=12)for(let x=rx;x<rx+rw;x+=12){
          const dark=((x-rx)/12+(y-ry)/12)%2===0,q=hash(x,y,seed+47);
          // Contrasto contenuto: mostri ed effetti restano leggibili sopra la scacchiera.
          tile(c,dark?'#4a4147':'#7f7466',x,y,12,12);tile(c,dark?'#554b52':'#8d8273',x+1,y+1,10,1);
          if(!dark&&q>.85)tile(c,'#8a7f6b',x+3,y+6,5,1);
        }
        return;
      }
      if(style==='names'){
        for(let y=ry;y<ry+rh;y+=11)for(let x=rx-((y/11|0)%2)*8;x<rx+rw;x+=16){
          const q=hash(x,y,seed+53);
          tile(c,'#3a3a40',x,y,16,11);tile(c,q<.5?'#5b5c63':'#64656c',x+1,y+1,14,9);tile(c,'#74757b',x+1,y+1,14,1);
          // Ogni lastra porta un nome inciso: brevi tratti scuri.
          const parts=1+Math.floor(q*3);let px=x+3;for(let k=0;k<parts&&px<x+13;k++){const len=1+Math.floor(hash(x,k,seed)*4);tile(c,'#3e3f46',px,y+5,len,1);px+=len+1;}
        }
        return;
      }
      // Ultima Soglia: basalto levigato con riflessi.
      for(let y=ry;y<ry+rh;y+=14)for(let x=rx-((y/14|0)%2)*12;x<rx+rw;x+=24){
        const q=hash(x,y,seed+59);
        tile(c,'#2a2230',x,y,24,14);tile(c,q<.5?'#3a3042':'#41354a',x+1,y+1,22,12);tile(c,'#5a4a62',x+1,y+1,22,1);
        if(q>.7)tile(c,'#6a5a72',x+4,y+3,5,1);
      }
      // Anelli d'oro intarsiati che conducono lo sguardo verso il cerchio della Soglia.
      const last=r.marks[2];
      for(const [rad,n] of [[62,44],[90,60]])for(let k=0;k<n;k++){const a=k*Math.PI*2/n,px=last.x+Math.cos(a)*rad,py=last.y+Math.sin(a)*rad*.68;if(k%2===0){tile(c,'#9a7a3a',px,py,3,1);tile(gl,'#5a3a1a',px,py,3,1);}}
      for(let k=0;k<8;k++){const a=k*Math.PI/4+Math.PI/8;for(let t=50;t<96;t+=3)tile(c,'#7a5f34',last.x+Math.cos(a)*t,last.y+Math.sin(a)*t*.68,1,1);}
    }
    // 4. Pezzi centrali delle tre sale (i vecchi segni), mosaico del patto e candele.
    const ring=(cx,cy,rx,ry,n,col,gcol,size=2)=>{for(let k=0;k<n;k++){const a=k*Math.PI*2/n;const px=cx+Math.cos(a)*rx,py=cy+Math.sin(a)*ry;tile(c,col,px-1,py-1,size,size);if(gcol)tile(gl,gcol,px-1,py-1,size,size);}};
    const [keys,names,last]=r.marks;
    // Sala delle Chiavi: rosa di otto chiavi d'oro attorno a una serratura.
    disc(c,'#2a2228',keys.x,keys.y+1,34,24);disc(c,'#c9a55a',keys.x,keys.y,32,22);disc(c,'#3a3238',keys.x,keys.y,29,20);disc(c,'#4a4048',keys.x,keys.y,24,16);
    for(let k=0;k<8;k++){
      const a=k*Math.PI/4,ux=Math.cos(a),uy=Math.sin(a)*.68;
      for(let t=8;t<22;t++)tile(c,'#d9b45c',keys.x+ux*t,keys.y+uy*t,1,1);
      tile(c,'#d9b45c',keys.x+ux*22-2,keys.y+uy*22-2,4,4);tile(c,'#3a3238',keys.x+ux*22-1,keys.y+uy*22-1,2,2);
      tile(c,'#d9b45c',keys.x+ux*12+uy*3,keys.y+uy*12-ux*2,2,1);
      tile(gl,'#7a5a2a',keys.x+ux*22-2,keys.y+uy*22-2,4,4);
    }
    disc(c,'#c9a55a',keys.x,keys.y,6,4);tile(c,'#2a2228',keys.x-1,keys.y-2,2,3);tile(c,'#2a2228',keys.x-2,keys.y+1,4,1);disc(gl,'#8a6a32',keys.x,keys.y,6,4);
    // Camera dei Nomi: altare ad anello con il libro dei nomi e candele.
    disc(c,'#2c2c32',names.x,names.y+1,34,24);disc(c,'#7c7d84',names.x,names.y,32,22);disc(c,'#4a4b52',names.x,names.y,28,19);
    ring(names.x,names.y,30,20,24,'#a08ad0','#6a5aa0');
    tile(c,'#2a2a30',names.x-12,names.y-6,24,12);tile(c,'#c8b896',names.x-11,names.y-5,10,10);tile(c,'#d8caa8',names.x+1,names.y-5,10,10);tile(c,'#5a4a3a',names.x,names.y-5,1,10);
    for(let k=0;k<4;k++){tile(c,'#7a6a52',names.x-9,names.y-3+k*2,7,1);tile(c,'#7a6a52',names.x+3,names.y-3+k*2,7,1);}
    for(let k=0;k<8;k++){const a=k*Math.PI/4+Math.PI/8,px=names.x+Math.cos(a)*24,py=names.y+Math.sin(a)*16;tile(c,'#e8dcc0',px,py-3,2,3);tile(c,'#ffd27a',px,py-5,2,2);tile(gl,'#c8902a',px,py-5,2,2);}
    // Ultima Soglia: cerchio della soglia con due archi che si cercano (il patto) e rune viola e oro.
    disc(c,'#160f16',last.x,last.y+2,46,32);disc(c,'#c9a55a',last.x,last.y,44,30);disc(c,'#241b26',last.x,last.y,41,28);
    ring(last.x,last.y,37,25,32,'#b48ad8','#7a4aa8');disc(c,'#c9a55a',last.x,last.y,30,20);disc(c,'#2d2232',last.x,last.y,28,18);
    for(const d of [-1,1])for(let t=-12;t<=12;t++){const px=last.x+d*(12-Math.abs(t)*.5)*1.2,py=last.y+t*.9;tile(c,'#d9b45c',px,py,2,1);tile(gl,'#9a7a3a',px,py,2,1);}
    disc(c,'#e3c8ff',last.x,last.y,4,3);disc(gl,'#9a6ad0',last.x,last.y,5,4);
    for(let k=0;k<6;k++){const a=k*Math.PI/3;tile(c,'#d9b45c',last.x+Math.cos(a)*48-1,last.y+Math.sin(a)*33-1,3,3);}
    // Anticamera: mosaico del patto, due mani tese verso un'anima, sul pavimento davanti all'ingresso.
    const mx=226,my=578;
    disc(c,'#3a2e26',mx,my,34,15);disc(c,'#8a7a62',mx,my,32,13);disc(c,'#6a5a48',mx,my,29,11);
    for(const d of [-1,1]){for(let k=0;k<12;k++)tile(c,'#c9a55a',mx+d*(26-k),my+Math.round(Math.sin(k*.3)*2),2,2);tile(c,'#c9a55a',mx+d*13,my-3,2,6);tile(c,'#c9a55a',mx+d*11,my-4,2,7);}
    disc(c,'#e8dcc0',mx,my-1,4,3);disc(c,'#ffffff',mx,my-2,2,1);disc(gl,'#b49a6a',mx,my-1,4,3);
    // 5. Oggetti invariati: pilastri accanto ai segni, lampade, varchi.
    for(const pt of r.marks)objects.push({x:pt.x-30,y:pt.y+5,type:'pillar',variant:0,radius:0},{x:pt.x+30,y:pt.y+5,type:'pillar',variant:0,radius:0});
    for(const [x,y] of [[192,485],[509,539],[722,464],[594,303],[789,219],[990,201],[1137,310]])objects.push({x,y,type:'lamp',variant:0,radius:0});
    for(const g of r.points.gates)objects.push({...g,type:'gate',variant:0,radius:0});
    const chart=makeCanvas(324,204);chart.getContext('2d').drawImage(image,0,0,324,204);
    return {r,palette,image,objects,cells:new Map(),chart,glow,crypt:true};
  }
  // Braciere della Cripta: treppiede di bronzo con coppa (sprite 24x30, base a y=26); la fiamma è animata a parte.
  let cryptBrazier=null;
  function paintCryptLamp(c,o,t){
    if(!cryptBrazier){
      cryptBrazier=makeCanvas(24,30);const g=cryptBrazier.getContext('2d');
      disc(g,'#0c080a88',12,27,7,2);
      for(const [x0,x1] of [[6,10],[18,14],[12,12]])for(let y=26;y>14;y--){const k=(26-y)/12;tile(g,'#5a3f28',Math.round(x0+(x1-x0)*k),y,1,1);}
      tile(g,'#2a1c14',5,13,14,4);tile(g,'#a07a45',6,12,12,3);tile(g,'#d0a868',6,12,12,1);tile(g,'#3a2a20',7,15,10,1);
    }
    c.drawImage(cryptBrazier,o.x-12,o.y-26);
    const lit=Math.sin(t*5+o.x)>-.4;
    tile(c,'#c85a28',o.x-3,o.y-17,6,3);tile(c,'#f2a046',o.x-2,o.y-19,4,3);if(lit)tile(c,'#ffe3a0',o.x-1,o.y-20,2,2);
  }
  function makeArea(r,seed){
    if(r.rooms)return makeCrypt(r,seed);
    const palette=formats[r.palette],rnd=random(seed+Array.from(r.id).reduce((n,ch)=>n+ch.charCodeAt(0)*137,0));
    const image=makeCanvas(w,h),c=image.getContext('2d'),objects=[],roads=pathPoints(r),selva=r.id==='verdant-canopy';
    const art=!selva&&groundArt[r.palette];
    let roadAt=null;
    if(selva)paintSelvaGround(c,r,roads,seed);
    else if(art)roadAt=paintRegionGround(c,r,roads,seed,art);
    else for(let y=0;y<h;y+=4)for(let x=0;x<w;x+=4){
      const a=Math.floor(x/76),b=Math.floor(y/76),u=x/76-a,v=y/76-b;
      const h1=hash(a,b,seed)*(1-u)*(1-v)+hash(a+1,b,seed)*u*(1-v)+hash(a,b+1,seed)*(1-u)*v+hash(a+1,b+1,seed)*u*v;
      const h2=hash(x/4,y/4,seed);
      tile(c,palette.grounds[Math.floor((h1*.72+h2*.28)*4)],x,y,4,4);
    }
    for(const [x,y,rx,ry] of coastLines[r.palette]){
      if(art)paintCoast(c,r,art,palette,x,y,rx,ry);
      else{disc(c,palette.edge,x,y,rx+7,ry+6);disc(c,palette.water,x,y,rx,ry);}
      for(let i=0;i<160;i++){
        const a=x+(rnd()*2-1)*rx,b=y+(rnd()*2-1)*ry;
        if(shoreHit(r,a,b,-3))tile(c,i%4?'#91b5ad55':'#cfddd475',a,b,2+rnd()*10,1);
      }
    }
    if(!selva&&!art)paintRoad(c,r,palette,roads);
    if(art){paintGroundDetails(c,r,seed,art,roadAt);paintPlaza(c,art,seed);if(r.statue)paintStatueFloor(c,art,palette,r.statue,seed);}
    const z=r.buildZone;
    if(art){tile(c,art.joint,z.x+133,z.y,22,z.h);tile(c,art.paving[1],z.x+134,z.y,20,z.h);tile(c,art.paving[3],z.x+134,z.y,2,z.h);tile(c,art.paving[3],z.x+152,z.y,2,z.h);}
    tile(c,palette.edge,z.x+135,z.y,18,z.h);
    tile(c,palette.water,z.x+138,z.y,12,z.h);
    if(art)tile(c,'#0d243e33',z.x+138,z.y,12,3);
    for(let y=z.y+4;y<z.y+z.h;y+=11)tile(c,'#a8c6ba70',z.x+140,y,6,1);
    for(let i=0;i<21000;i++){
      const x=rnd()*w,y=rnd()*h;if(shoreHit(r,x,y))continue;
      const a=rnd(),bw=1+rnd()*4,bh=1+(rnd()<.13?1:0);
      // La decorazione può cambiare senza spostare la sequenza degli oggetti solidi.
      if(selva||art)continue;
      tile(c,a>.94?'#e4dfba91':a>.48?'#f1e4af25':'#253f3f26',x,y,bw,bh);
      if(a>.985&&!inZone(x,y,r.buildZone))tile(c,palette.plant[1],x-1,y+1,2,2);
    }
    const add=(type,x,y,variant=0,radius=0)=>objects.push({type,x,y,variant,radius});
    for(const [x,y,t,n] of [[385,362,'house',0],[447,348,'hall',1],[523,368,'house',2],[391,424,'stall',1],[537,419,'stall',0],[459,430,'well',0]]){
      add(t,x,y,n,t==='well'?7:t==='stall'?8:17);
    }
    for(const [x,y] of [[368,405],[507,402],[548,380],[345,390],[479,449]])add('lamp',x,y);
    for(const [x,y] of [[280,292],[754,185],[1026,563]]){
      add(r.palette==='star'||r.palette==='fae'?'crystal':'ruin',x-21,y-17,1,11);
      add('ruin',x+20,y+4,2,9);add('lamp',x+10,y+12);
    }
    for(const g of r.points.gates)add('gate',g.x,g.y,0);
    if(r.statue){
      const s=r.statue;
      if(!art){disc(c,palette.edge,s.x,s.y+7,51,33);disc(c,palette.stone[1],s.x,s.y+7,46,28);disc(c,palette.stone[0],s.x,s.y+7,39,23);}
      for(let k=0;k<8;k++){
        const t=Math.PI*k/4,x=s.x+Math.cos(t)*46,y=s.y+7+Math.sin(t)*29;
        add(k%2&&s.design===2?'crystal':'pillar',x,y,k,0);
      }
      add('monument',s.x,s.y,s.design,0);
    }
    for(let gy=24;gy<h-20;gy+=26)for(let gx=24;gx<w-20;gx+=26){
      const x=Math.round(gx+rnd()*20),y=Math.round(gy+rnd()*18),check={x,y};
      if(shoreHit(r,x,y,10)||inZone(x,y,r.buildZone,17)||radius(check,anchor)<123||
         r.guard.some(o=>radius(check,o)<(o.protect||27))||
         roads.some(path=>path.slice(1).some((end,i)=>segDistance(x,y,path[i],end)<28))||
         rnd()>(x<330||y<242||x>960?.68:.34))continue;
      const z=rnd(),v=Math.floor(rnd()*6);
      const kind=z<.16?'stone':z<.36?'shrub':z<.49&&r.palette==='star'?'leaf':palette.kind;
      add(kind,x,y,v,kind==='stone'||kind==='shrub'?5:8);
    }
    objects.sort((a,b)=>a.y-b.y);
    const cells=new Map();
    for(const o of objects){
      if(!o.radius)continue;
      const ix=Math.floor(o.x/32),iy=Math.floor(o.y/32),id=ix+iy*64;
      if(!cells.has(id))cells.set(id,[]);
      cells.get(id).push(o);
    }
    const area={r,palette,image,objects,cells,chart:null,selvaSprites:selva?new Map():null,sprites:new Map()};
    const mini=makeCanvas(324,204),m=mini.getContext('2d');
    m.drawImage(image,0,0,324,204);
    m.save();m.scale(.25,.25);
    for(const o of objects)paint(m,area,o,0);
    m.restore();area.chart=mini;
    return area;
  }
  function selvaCanopy(c,x,y,v,size,shrub){
    const rnd=random(511+v*31+size*211),scale=shrub?.43:[.72,.84,1][size];
    const colors=v%2?['#273f39','#325745','#427259','#54866b','#689b77','#85ae86','#a2bd8a']:
      ['#2a4645','#345d55','#437667','#558d79','#6ca08a','#86b09a','#a9c5a1'];
    const ellipse=(dx,dy,rx,ry,color)=>disc(c,color,x+Math.round(dx*scale),y+Math.round(dy*scale),
      Math.max(1,Math.round(rx*scale)),Math.max(1,Math.round(ry*scale)));
    const box=(col,dx,dy,bw,bh)=>tile(c,col,x+Math.round(dx*scale),y+Math.round(dy*scale),
      Math.max(1,Math.round(bw*scale)),Math.max(1,Math.round(bh*scale)));
    ellipse(4,1,19,5,'#203a3d66');ellipse(0,0,8,3,'#263c3281');
    if(!shrub){
      box('#4c4b40',-4,-24,8,23);box('#79664b',-3,-22,4,19);box('#9a805a',-2,-12,2,9);
      box('#5f5745',-7,-2,5,2);box('#615745',2,-2,4,2);box('#a48a57',-1,-18,2,3);
    }
    const lobes=[[-13,-23,12,8],[13,-23,11,8],[-17,-31,10,9],[16,-33,10,9],[-1,-26,17,10],
      [-12,-38,13,9],[11,-40,12,9],[-2,-37,15,10],[-4,-47,11,7],[6,-47,9,6]];
    if(size===0){lobes.pop();lobes[8][1]+=4;}
    if(size===2){lobes[3][2]+=3;lobes[7][2]+=3;lobes[9][1]-=3;}
    const crowns=lobes.map(([a,b,p,q])=>[a+rnd()*5-2.5,b+rnd()*4-2,p+rnd()*3-1.5,q]);
    for(const [dx,dy,rw,rh] of crowns)ellipse(dx,dy+2,rw+2,rh+1,colors[0]);
    for(const [dx,dy,rw,rh] of crowns){
      ellipse(dx,dy+1,rw,rh,colors[1]);ellipse(dx-1.5,dy-1,rw-1,rh-1,colors[2]);
      ellipse(dx-2,dy-3,rw-3,Math.max(2,rh-4),colors[3]);
      for(let i=0;i<14;i++){
        const angle=rnd()*6.283,t=Math.sqrt(rnd());
        const px=Math.cos(angle)*(rw-2)*t,py=Math.sin(angle)*(rh-2)*t;
        const tone=2+(px<0?1:0)+(py<0?1:0)+(rnd()<.35?1:0);
        box(colors[tone],dx+px,dy+py,1+rnd()*4,1+rnd()*2);
        if(tone>=4&&rnd()<.43)box(colors[tone+1],dx+px,dy+py-1,2,1);
      }
    }
    if(v===1||v===4)for(const [dx,dy] of [[-12,-33],[6,-48],[11,-28]]){
      box('#a3c6aa',dx,dy-1,1,3);box('#b2cfb2',dx-1,dy,3,1);
    }
  }
  function selvaBuilding(c,x,y,type,v){
    const box=(col,dx,dy,bw,bh)=>tile(c,col,x+dx,y+dy,bw,bh);
    const shape=(col,pts)=>poly(c,col,pts.map(([dx,dy])=>[x+dx,y+dy]));
    const ink='#293b42',wood='#594e48',brass='#c5a173';
    const shade=rw=>disc(c,'#263f3c63',x+3,y,rw,5);
    const pane=(dx,dy,bw,bh,cold=false)=>{
      box(ink,dx-2,dy-2,bw+4,bh+4);
      box(cold?'#699a9a':'#e3bb79',dx,dy,bw,bh);
      box(cold?'#abcebd':'#efd298',dx,dy,bw,2);
      box(cold?'#476772':'#986e51',dx+Math.floor(bw/2),dy,1,bh);
      box('#c5ac83',dx-2,dy+bh+1,bw+4,1);
    };
    if(type==='stall'){
      const a=v===1,roof=a?['#487775','#689991','#bcd0ab']:['#655a82','#82749f','#c8b4bd'];
      shade(19);box(ink,-17,-25,33,25);box(wood,-16,-20,3,20);box(wood,13,-20,3,20);
      shape(ink,[[-20,-16],[-17,-29],[15,-32],[20,-17]]);
      shape(roof[0],[[-18,-18],[-15,-28],[14,-30],[18,-18]]);
      for(let k=-13;k<13;k+=8){
        shape(roof[2],[[k,-28],[k+4,-29],[k+4,-18],[k-2,-18]]);
        box(roof[1],k-2,-18,6,3);box(roof[2],k-1,-18,4,1);
      }
      box('#81674d',-15,-11,30,8);box('#bd9566',-16,-12,32,3);
      for(const [dx,dy,col] of [[-11,-16,'#6da69b'],[-6,-14,'#c4a171'],[0,-17,'#967fa8'],[8,-15,'#82b3ab']]){
        box(ink,dx-1,dy+1,5,-10-dy);box(col,dx,dy,3,-10-dy);
        box('#e3d4a4',dx+1,dy-2,1,4);box(col,dx,dy-1,3,2);
      }
      return;
    }
    const hall=type==='hall',chimney=!hall&&v===2,k=hall?25:20;
    const roof=hall?['#325d5d','#497872','#609288','#86ab96']:
      chimney?['#4e495f','#6f637e','#877a97','#a497ac']:['#395756','#51736b','#6e8d7a','#97a58b'];
    shade(k+2);box(ink,-k,-25,k*2,25);box(hall?'#b2ab87':'#bda77f',-k+2,-24,k*2-4,22);
    box('#857760',-k+2,-5,k*2-4,3);box(wood,-k+3,-23,3,19);box(wood,k-7,-23,3,19);
    for(let i=hall?7:5;i<18;i+=6)box('#88765b65',-k+7,-i-5,k*2-14,1);
    const eave=-24,peak=hall?-50:chimney?-49:-43;
    const start=hall?-k+8:chimney?-k+13:-k+5,end=hall?k-8:k-9;
    const outline=[[-k-4,eave],[start,peak],[end,peak],[k+4,eave]];
    shape(ink,outline);shape(roof[1],[[-k-1,eave-2],[start+1,peak+1],[end-1,peak+1],[k+1,eave-2]]);
    shape(roof[2],[[start+1,peak+2],[end-1,peak+2],[end+6,peak+10],[start-5,peak+10]]);
    shape(roof[0],[[end-4,peak+1],[end-1,peak+1],[k+1,eave-2],[k-4,eave-2]]);
    for(let yy=peak+6;yy<eave-2;yy+=5){
      const t=(yy-peak)/(eave-peak),left=Math.round(start+(-k-start)*t),right=Math.round(end+(k-end)*t);
      box(roof[0],left,yy,right-left,1);
      for(let xx=left+2+(yy%2?4:0);xx<right-3;xx+=7){box(roof[3],xx,yy-1,3,1);box(roof[0],xx+3,yy+1,1,2);}
    }
    box(brass,start,peak,end-start,2);box(roof[0],-k-3,eave,k*2+7,2);
    if(hall){
      shape('#465d60',[[-14,-29],[-8,-46],[8,-46],[14,-29]]);
      shape('#78a69c',[[-11,-31],[-6,-44],[6,-44],[11,-31]]);
      box('#a9cabc',-5,-42,3,9);box('#4f757c',-1,-45,2,14);
      box(brass,-12,-31,24,2);pane(-18,-19,8,11,true);pane(10,-19,8,11,true);
      shape(ink,[[-7,-1],[-7,-16],[-4,-20],[4,-20],[7,-16],[7,-1]]);
      box('#496d72',-5,-15,10,13);box('#93aeb0',-3,-15,2,11);box(brass,2,-7,2,2);
    }else{
      box(ink,-5,-16,11,15);box('#827053',-3,-14,7,12);
      box(brass,2,-7,1,2);pane(-15,-17,6,8,chimney);pane(8,-17,7,8,chimney);
      if(chimney){box('#534e54',8,-53,6,17);box('#a18c83',8,-53,2,11);box('#b8a295',7,-55,8,2);}
      else{box('#566d62',-16,-10,6,3);box('#7b9f79',-15,-12,3,2);}
    }
    box('#9d9783',-6,-1,13,2);box('#a8a18d',-7,1,14,1);
  }
  function paintSelvaSprite(c,a,o){
    const tree=o.type==='leaf'||o.type==='shrub';
    if(!a.selvaSprites||!tree&&!['house','hall','stall'].includes(o.type))return false;
    const size=tree?Math.floor(hash(o.x,o.y,7259)*3):0;
    const key=o.type+'/'+o.variant+'/'+size;
    let image=a.selvaSprites.get(key);
    if(!image){
      image=makeCanvas(68,64);const g=image.getContext('2d');
      if(tree)selvaCanopy(g,34,58,o.variant,size,o.type==='shrub');
      else selvaBuilding(g,34,58,o.type,o.variant);
      a.selvaSprites.set(key,image);
    }
    c.drawImage(image,o.x-34,o.y-58);
    return true;
  }
  // Arte dei biomi (World Art Overhaul): vegetazione, rocce, edifici, banchi, pozzi, lampioni e rovine per continente,
  // disegnati una volta come sprite e riusati. Le basi coincidono con i punti d'appoggio e gli ingombri esistenti.
  const flora={
    ruin:{tree:'oak',leaves:['#2c4636','#36553d','#436745','#52794c','#638b55','#7a9e60','#97b36f'],trunk:['#3f362d','#62513f','#86704f'],
      shrub:['#2f4a35','#456c44','#5f8a50','#87a862'],bloom:['#e8d296','#e6b0b5','#f2e9c8'],stone:['#5d655c','#878f80','#b3b6a2','#dcdac4'],moss:'#6f8f4f'},
    pine:{tree:'larch',leaves:['#1f362d','#2a4637','#365741','#46694d','#5a7d5b','#769473'],gold:['#4a4628','#625c30','#7f763b','#a09148','#bba85d'],trunk:['#3b2f28','#5c4635','#7d6046'],
      shrub:['#243c33','#345244','#496a55','#6a8b6c'],bloom:['#cfd8e8','#9fb3d6'],stone:['#4d585c','#6f7c7e','#97a3a2','#c4cdca'],moss:'#5d7a5a'},
    snow:{tree:'fir',leaves:['#1b3036','#243f44','#2f4f52','#3d6162','#517675','#6c8e8a'],snow:['#7f98ad','#b9cad6','#e6eef2','#ffffff'],trunk:['#3a3332','#574a45','#776358'],
      shrub:['#2a4245','#3d5859','#57746f','#eef4f6'],stone:['#4f5d6b','#71808d','#9aa8b2','#eef4f6'],moss:'#f3f7f8'},
    star:{tree:'veil',leaves:['#2a2b4b','#373d63','#47507a','#5a6692','#7180ab','#8f9cc4','#b4bfe0'],glow:['#bfe9ff','#e3c8ff','#9ff0dd'],trunk:['#36354d','#58577a','#8b89a9'],
      shrub:['#2c3c58','#3b5574','#5a7fa0','#9fd0e0'],stone:['#3d405e','#5d6082','#8a8aa9','#c2bedb'],moss:'#7fd8d0',crystal:[['#2f4f6a','#4f8aa0','#86c6cf','#c9f3ee'],['#3f3567','#6a5a9e','#a08ad0','#e2d0f4']]},
    grass:{tree:'acacia',leaves:['#2e3d22','#3b4f29','#4b6331','#5d793a','#748f45','#91a655'],trunk:['#463727','#685037','#8c6d48'],
      shrub:['#57552f','#74713b','#97904a','#c2b466'],stone:['#6c5f4a','#8f7f60','#b4a27c','#d4c39b'],moss:'#a39343'},
    root:{tree:'banyan',leaves:['#152c27','#1c392f','#254735','#2f563d','#3b6646','#4c7850','#638e5f'],trunk:['#382e25','#574835','#786449','#978262'],
      shrub:['#1c3a2b','#2d583a','#457a4b','#76a767'],stone:['#45503f','#5f6b57','#828d76','#aab39a'],moss:'#5d9a5e'},
    shore:{tree:'palm',leaves:['#26442f','#355b3a','#477244','#5d8954','#7ca366'],trunk:['#55412d','#7a5e41','#9d7f57','#c0a477'],
      shrub:['#5f7046','#7f8f5a','#a5b06e','#cfcf95'],stone:['#857761','#a5947a','#c4b496','#e7dcc0'],moss:'#a5b06e'},
    fae:{tree:'oak',leaves:['#2a4645','#345d55','#437667','#558d79','#6ca08a','#86b09a','#a9c5a1'],trunk:['#4c4b40','#79664b','#9a805a'],
      shrub:['#2b4a47','#3f6a5e','#5f8f77','#8fb79a'],bloom:['#d1b8ba','#c4c88d'],stone:['#394b5c','#6b7f8b','#a5bcc3','#d5e2e2'],moss:'#6a9a73'},
    canyon:{tree:'hoodoo',rock:['#55372d','#744839','#935d46','#b27555','#cb9067','#e1ae84'],
      shrub:['#3d5839','#53734a','#74935c','#e3b07a'],stone:['#6b4638','#91604a','#b98463','#ddb38a'],moss:'#8a8a55'}
  };
  const masonry={
    ruin:{wall:['#6f6756','#a99f86','#cbc1a6','#e2d9bf'],roof:['#4f2a23','#7a3b2c','#9c5038','#bb6745','#d6875b'],timber:'#5e4a37',door:['#3d3027','#6f523a'],glass:'#f1c879',style:'tiles'},
    pine:{wall:['#382a21','#58402f','#77583f','#977650'],roof:['#212d36','#2e3e49','#3c4f5c','#506572','#738995'],timber:'#2b211b',door:['#2b221b','#56402f'],glass:'#f0c070',style:'logs'},
    snow:{wall:['#454e57','#69747d','#8a959d','#b0b9bf'],roof:['#272b38','#363c4d','#475064','#5f687e','#7d8799'],timber:'#30353e',door:['#2a282c','#584739'],glass:'#ffcf7d',style:'keep'},
    star:{wall:['#55567a','#86849f','#aeabc6','#d1cde1'],roof:['#272852','#373a6a','#4a4f84','#6268a0','#9199c9'],timber:'#3d3d66',door:['#272741','#555483'],glass:'#9ff0ff',style:'dome'},
    grass:{wall:['#6f5134','#9a7449','#bb905d','#d6ad77'],roof:['#5e4b25','#806a33','#a38a42','#c4a855','#dfc678'],timber:'#4f3a26',door:['#3a2a1c','#66472c'],glass:'#f4c46c',style:'round'},
    root:{wall:['#3a3024','#5a4834','#7a6446','#98825d'],roof:['#1f3a28','#2b4e33','#3a643f','#4e784c','#6b915c'],timber:'#2b241b',door:['#29221a','#574530'],glass:'#f2cf86',style:'stilts'},
    shore:{wall:['#9d9483','#d3ccbb','#e9e3d4','#f8f4ea'],roof:['#2a5468','#386a80','#4b8297','#669bad','#93c0cb'],timber:'#76644e',door:['#3a505e','#6b8995'],glass:'#f5d38a',style:'flat'},
    fae:{wall:['#5c5a4c','#9c9478','#bda77f','#d7c7a0'],roof:['#2e4f4f','#3f6863','#558279','#73a091','#9fc1ae'],timber:'#594e48',door:['#293b42','#827053'],glass:'#e3bb79',style:'tiles'},
    canyon:{wall:['#7f553c','#a87452','#c38e62','#d9aa7b'],roof:['#6d452f','#8f5c3f','#ae734e','#c88d62','#e1ac80'],timber:'#57392a',door:['#45301f','#755034'],glass:'#f4c27a',style:'adobe'}
  };
  const awnings={fae:['#487775','#bcd0ab'],ruin:['#b9553b','#efe2c2'],pine:['#3f5b49','#c9b58a'],snow:['#5f6b7d','#d9e1e6'],star:['#4a4a8a','#d8ccf2'],
    grass:['#a65a33','#e6c27a'],root:['#3c6a43','#c9b27a'],shore:['#2f6f8e','#f4efe2'],canyon:['#a9472f','#eab36d']};
  function spriteKit(g,ox,oy){
    const box=(col,x,y,bw,bh)=>{if(bw>0&&bh>0)tile(g,col,ox+x,oy+y,bw,bh);};
    const blob=(col,x,y,rx,ry)=>disc(g,col,ox+Math.round(x),oy+Math.round(y),Math.max(0,Math.round(rx)),Math.max(1,Math.round(ry)));
    const shape=(col,pts)=>poly(g,col,pts.map(([x,y])=>[ox+x,oy+y]));
    const stroke=(col,x,y,x2,y2,size=1)=>{const n=Math.max(1,Math.ceil(Math.max(Math.abs(x2-x),Math.abs(y2-y))));for(let i=0;i<=n;i++)box(col,Math.round(x+(x2-x)*i/n),Math.round(y+(y2-y)*i/n),size,size);};
    return {box,blob,shape,stroke};
  }
  // Chioma a lobi sovrapposti (stesso metodo della Valle di Vela) con tavolozza e sagoma per bioma.
  function canopy(k,rnd,lobes,shades,light=2){
    for(const [x,y,rw,rh] of lobes)k.blob(shades[0],x,y+2,rw+1,rh+1);
    for(const [x,y,rw,rh] of lobes){
      k.blob(shades[1],x,y,rw,rh);k.blob(shades[2],x-1,y-2,rw-1,rh-2);k.blob(shades[3],x-3,y-3,rw-3,Math.max(2,rh-4));
      for(let i=0;i<16;i++){
        const q=rnd()*6.283,b=Math.sqrt(rnd()),xx=x+Math.cos(q)*(rw-2)*b,yy=y+Math.sin(q)*(rh-2)*b;
        const tone=Math.min(shades.length-1,light+(yy<y?1:0)+(xx<x?1:0)+Math.floor(rnd()*2));
        k.box(shades[tone],Math.round(xx),Math.round(yy),2+Math.floor(rnd()*3),1+Math.floor(rnd()*2));
        if(rnd()<.4)k.box(shades[Math.min(shades.length-1,tone+1)],Math.round(xx)+1,Math.round(yy)-1,2,1);
      }
    }
  }
  function drawTree(g,pal,type,v,size){
    const F=flora[pal],k=spriteKit(g,40,78),rnd=random(9157+v*131+size*977+pal.length*31),s=[.84,.95,1.07][size];
    const S=n=>Math.round(n*s);
    const lob=list=>list.map(([x,y,rw,rh])=>[S(x+(rnd()-.5)*4),S(y+(rnd()-.5)*3),S(rw+(rnd()-.5)*3),S(rh)]);
    if(type==='shrub'){
      const sh=F.shrub;k.blob('#1a2a2a55',2,0,11,3);
      if(pal==='canyon'&&v%2===0){
        // Cactus a candelabro della gola.
        k.box(sh[0],-2,-17,5,17);k.box(sh[1],-1,-17,3,16);k.box(sh[2],-1,-16,1,13);
        k.box(sh[0],-8,-12,4,7);k.box(sh[1],-7,-12,2,6);k.box(sh[0],-6,-7,4,3);
        k.box(sh[0],4,-14,4,8);k.box(sh[1],5,-14,2,7);k.box(sh[0],2,-8,4,3);
        if(v%4===0){k.box(sh[3],0,-19,2,2);k.box(sh[3],-7,-14,2,2);}
        return;
      }
      const lobes=lob([[-5,-5,6,4],[5,-5,6,4],[0,-8,7,5],[-2,-11,4,3]]);
      canopy(k,rnd,lobes,[sh[0],sh[0],sh[1],sh[2],sh[3],sh[3]],2);
      if(pal==='snow')for(const [x,y,rw] of lobes)k.box(sh[3],x-rw+2,y-4,rw*2-4,2);
      if(F.bloom&&v%2===0)for(let i=0;i<6;i++)k.box(F.bloom[i%F.bloom.length],Math.round((rnd()-.5)*16),Math.round(-3-rnd()*9),1,1);
      if(pal==='star')for(let i=0;i<4;i++)k.box(F.glow[i%3],Math.round((rnd()-.5)*14),Math.round(-4-rnd()*8),1,1);
      if(pal==='root')for(let i=0;i<3;i++){const x=Math.round((rnd()-.5)*12);k.stroke(sh[3],x,-2,x+(x<0?-4:4),-9);}
      return;
    }
    if(type==='stone'){
      const st=F.stone,tall=4+v%4;k.blob('#18242a55',2,1,11,3);
      k.shape(st[0],[[-10,1],[-8,-tall],[-3,-tall-4],[5,-tall-3],[10,-2],[7,2]]);
      k.shape(st[1],[[-8,-1],[-7,-tall],[-3,-tall-3],[3,-tall-2],[6,-3],[0,0]]);
      k.shape(st[2],[[-6,-tall],[-3,-tall-3],[2,-tall-2],[-2,-tall+1]]);k.box(st[3],-3,-tall-2,3,1);
      if(pal==='snow')k.blob(st[3],-1,-tall-2,6,2);
      else if(pal==='star'&&v%2===0){k.shape(F.crystal[v%4>1?1:0][2],[[3,-tall-1],[5,-tall-7],[7,-tall-1]]);k.box(F.crystal[0][3],5,-tall-5,1,2);}
      else if(F.moss&&pal!=='canyon'&&pal!=='shore'){k.box(F.moss,-7,-tall+1,4,1);k.box(F.moss,-5,-tall,2,1);}
      return;
    }
    k.blob('#14222655',3,1,S(15),4);
    const leaves=F.leaves;
    if(F.tree==='oak'){
      k.shape(F.trunk[0],[[-6,1],[-4,-4],[-4,-S(22)],[4,-S(23)],[3,-5],[7,1],[2,0]]);
      k.box(F.trunk[1],-3,-S(22),5,S(20));k.box(F.trunk[2],-2,-S(14),1,S(11));
      k.stroke(F.trunk[0],-2,-S(12),-S(10),-S(22),2);k.stroke(F.trunk[0],1,-S(11),S(11),-S(24),2);
      const lobes=lob([[-11,-22,12,8],[10,-23,12,8],[-17,-30,10,8],[17,-31,9,8],[-2,-25,17,10],[-14,-38,11,9],[12,-39,12,9],[-3,-37,16,10],[-4,-47,11,7],[7,-46,9,6]]);
      canopy(k,rnd,lobes,leaves,2);
      if(v%3===1)for(let i=0;i<9;i++)k.box(F.bloom[i%3],S((rnd()-.5)*34),S(-20-rnd()*28),1,1);
      return;
    }
    if(F.tree==='larch'||F.tree==='fir'){
      const fir=F.tree==='fir',gold=!fir&&v%3===2,tones=gold?F.gold:leaves,h=S(fir?50:58)+v%3*2,tiers=fir?4:5;
      k.box(F.trunk[0],-2,-S(14),5,S(14));k.box(F.trunk[1],-1,-S(14),2,S(13));
      for(let t=0;t<tiers;t++){
        const base=-S(8)-t*h/(tiers+.6),tip=base-h*(fir?.46:.4),wd=S(fir?17:13)-t*(fir?3:2);
        for(let y=Math.round(tip);y<=Math.round(base);y++){
          const u=(y-tip)/(base-tip),br=Math.max(1,Math.round(wd*u)),teeth=Math.floor(hash(y,v+t*7,size)*3);
          k.box(tones[0],-br-teeth,y,br*2+teeth+1,1);k.box(tones[1],-br+1,y,br*2-1,1);
          k.box(tones[2],-br+1,y,Math.max(1,Math.round(br*.9)),1);k.box(tones[3],-br+2,y,Math.max(1,Math.round(br*.45)),1);
        }
        for(let n=0;n<10;n++){const u=rnd(),x=Math.round((rnd()-.6)*wd*u*1.6),y=Math.round(tip+(base-tip)*u);k.box(tones[x<0?4:2],x,y,2,1);}
        if(fir){
          // Neve sui palchi: cresta chiara e ombra azzurra sotto.
          for(let x=-wd+1;x<wd-1;x++){const y=Math.round(base-1-Math.abs(x)*.25);if(hash(x,t,v)<.75){k.box(F.snow[2],x,y-1,1,1);k.box(F.snow[0],x,y,1,1);}}
          k.box(F.snow[3],-1,Math.round(tip),2,2);
        }
      }
      if(fir)k.blob(F.snow[2],0,-1,S(9),2);
      return;
    }
    if(F.tree==='veil'){
      k.stroke(F.trunk[0],0,0,-2,-S(26),3);k.stroke(F.trunk[1],1,-1,-1,-S(25),1);k.stroke(F.trunk[2],-1,-S(10),-1,-S(22),1);
      const lobes=lob([[-8,-28,10,8],[8,-30,10,8],[-1,-36,13,9],[-6,-43,8,6],[6,-44,7,5]]);
      canopy(k,rnd,lobes,leaves,3);
      // Gocce di luce appese ai rami: il tratto distintivo della Conca.
      for(const x of [-14,-6,5,13]){const top=S(-24+Math.abs(x)*.2),len=3+Math.floor(hash(x,v,size)*5);k.box(leaves[2],S(x),top,1,len);k.box(F.glow[(x+20)%3],S(x),top+len,1,2);k.box(F.glow[(x+20)%3]+'55',S(x)-1,top+len,3,2);}
      for(let i=0;i<12;i++){const x=S((rnd()-.5)*30),y=S(-26-rnd()*22);k.box(F.glow[i%3],x,y,1,1);if(i%3===0)k.box(F.glow[i%3]+'66',x-1,y,3,1);}
      return;
    }
    if(F.tree==='acacia'){
      k.stroke(F.trunk[0],0,0,1,-S(16),3);k.stroke(F.trunk[0],0,-S(14),-S(9),-S(27),2);k.stroke(F.trunk[0],1,-S(15),S(10),-S(28),2);
      k.stroke(F.trunk[1],1,-1,1,-S(15),1);k.stroke(F.trunk[2],-1,-S(16),-S(8),-S(26),1);
      for(const [x,y,rw,rh] of [[-S(7),-S(30),S(15),4],[S(8),-S(31),S(14),4],[0,-S(34),S(19),5]]){
        k.blob(leaves[0],x,y+2,rw+1,rh);k.blob(leaves[1],x,y,rw,rh);k.blob(leaves[2],x-1,y-1,rw-2,rh-1);k.blob(leaves[3],x-2,y-2,rw-5,Math.max(1,rh-3));
        for(let i=0;i<14;i++)k.box(leaves[3+Math.floor(rnd()*3)],Math.round(x+(rnd()-.5)*rw*1.7),Math.round(y-1-rnd()*rh),2,1);
      }
      return;
    }
    if(F.tree==='banyan'){
      k.shape(F.trunk[0],[[-12,1],[-6,-3],[-5,-S(24)],[5,-S(24)],[6,-3],[13,1],[4,-1],[0,1],[-4,-1]]);
      k.box(F.trunk[1],-4,-S(24),8,S(22));k.box(F.trunk[2],-3,-S(20),2,S(17));k.box(F.trunk[3],-3,-S(12),1,7);
      for(const x of [-10,9])k.stroke(F.trunk[1],x,1,x*.4,-6,2);
      const lobes=lob([[-15,-26,13,8],[14,-27,13,8],[0,-30,19,10],[-11,-40,13,9],[11,-41,13,9],[0,-47,13,8]]);
      canopy(k,rnd,lobes,leaves,2);
      // Radici aeree che scendono dalla chioma.
      for(const x of [-18,-11,12,19]){const top=-S(24),len=S(10+hash(x,v,size)*10);k.box(F.trunk[1],S(x),top,1,len);k.box(F.trunk[0],S(x)+1,top+2,1,len-3);}
      for(let i=0;i<5;i++)k.box(F.moss,S((rnd()-.5)*36),S(-26-rnd()*22),2,1);
      return;
    }
    if(F.tree==='palm'){
      const lean=v%2?1:-1,top=-S(36);
      for(let y=0;y>top;y-=3){const x=Math.round(lean*((-y)/(-top))**2*S(8));k.box(F.trunk[0],x-2,y-3,5,3);k.box(F.trunk[1+(y/3&1)],x-1,y-3,3,2);k.box(F.trunk[3],x-1,y-3,1,1);}
      const hx=lean*S(8),hy=top-1;
      for(let f=0;f<7;f++){
        const a=-Math.PI*(.08+f*.14)+(f>3?.1:0),len=S(17+(f%3)*3),ex=hx+Math.cos(a)*len,ey=hy+Math.sin(a)*len*.55+(f===0||f===6?6:0);
        k.stroke(leaves[0],hx,hy,ex,ey+1,2);k.stroke(leaves[2],hx,hy-1,ex,ey,1);
        for(let i=2;i<8;i++){const px=hx+(ex-hx)*i/8,py=hy+(ey-hy)*i/8;k.box(leaves[1+(i&1)],Math.round(px),Math.round(py)+1,1,2+(i>5?0:1));k.box(leaves[3],Math.round(px),Math.round(py)-1,1,1);}
      }
      k.blob(leaves[4],hx,hy-1,3,2);k.box('#6b4a2c',hx-2,hy+1,2,2);k.box('#6b4a2c',hx+1,hy+2,2,2);k.box('#8d6a42',hx,hy+1,1,1);
      return;
    }
    if(F.tree==='hoodoo'){
      const R=F.rock,form=v%3;
      if(form===0){
        const top=-S(30);
        k.shape(R[0],[[-8,1],[-7,top+8],[-5,top+4],[5,top+4],[7,top+8],[9,1]]);
        k.shape(R[2],[[-6,0],[-6,top+8],[-4,top+5],[2,top+5],[1,0]]);
        for(let y=top+9;y<0;y+=4)k.box(y%8?R[3]:R[1],-6,y,13,1);
        k.blob(R[1],0,top+3,10,3);k.blob(R[4],-1,top+2,8,2);k.box(R[5],-5,top+1,6,1);
      }else if(form===1){
        // Piccola mesa a gradoni con il cappello più chiaro e le falde di detriti.
        const top=-S(18);
        k.shape(R[0],[[-16,1],[-14,-5],[-11,-6],[-10,top+4],[-6,top],[7,top-1],[10,top+5],[12,-7],[15,-5],[16,1]]);
        k.shape(R[2],[[-14,0],[-12,-5],[-9,-6],[-8,top+4],[-5,top+1],[1,top+1],[-1,0]]);
        for(let y=top+4;y<-6;y+=3)k.box(y%6?R[3]:R[1],-9,y,18,1);
        k.box(R[4],-6,top,13,2);k.box(R[5],-5,top,6,1);k.box(R[1],-14,-5,4,1);k.box(R[1],11,-6,4,1);
      }else{
        for(const [x,y,rw,rh] of [[-6,-5,7,6],[6,-4,6,5],[0,-11,6,5]]){k.blob(R[0],x,y+1,rw+1,rh);k.blob(R[2],x-1,y,rw,rh-1);k.blob(R[3],x-2,y-2,rw-3,rh-3);k.box(R[5],x-3,y-rh+1,3,1);}
      }
      return;
    }
  }
  function drawCrystal(g,pal,v){
    const k=spriteKit(g,40,78),F=flora[pal]||flora.star,tones=F.crystal?F.crystal[v%2]:flora.star.crystal[v%2],rnd=random(3301+v*71);
    k.blob('#14182655',2,1,12,3);k.blob(F.stone[0],0,-1,9,3);k.blob(F.stone[1],-1,-2,7,2);
    const grow=[.75,1,1.25,.9][v%4],prisms=[[-6,0,4,10+v%3*2],[5,-1,4,12+v%2*3],[0,0,5,17+v%4*2],[-2,1,3,7]].map(([x,y,pw,h])=>[x,y,pw,Math.round(h*grow)]);
    if(v%4===3)prisms.splice(1,1);
    for(const [x,y,pw,h] of prisms){
      k.shape(tones[0],[[x-pw,y-2],[x-pw,y-h+3],[x,y-h-1],[x+pw,y-h+3],[x+pw,y-2],[x,y]]);
      k.shape(tones[1],[[x-pw+1,y-2],[x-pw+1,y-h+3],[x,y-h],[x,y-1]]);
      k.shape(tones[2],[[x,y-h],[x+pw-1,y-h+3],[x,y-h+5],[x-pw+1,y-h+3]]);
      k.box(tones[3],x-1,y-h+2,1,Math.max(2,Math.round(h*.45)));
    }
    if(rnd()<.6)k.box(tones[3],-4,-3,1,1);
  }
  // Edifici per continente: stessa pianta (base su y=0, mezza larghezza 20 o 25) e stessa porta al centro.
  function drawBuilding(g,pal,type,v,wins=[]){
    const M=masonry[pal],k=spriteKit(g,40,78),rnd=random(7717+v*53+type.length*11+pal.length*97),W=M.wall,R=M.roof;
    const hall=type==='hall',hw=hall?25:20,H=hall?25:21,ink='#1d232a';
    const windowAt=(x,y,ww=5,wh=6,round=false)=>{
      wins.push({x,y,w:ww,h:wh});
      k.box(ink,x-1,y-1,ww+2,wh+2);k.box(M.glass,x,y,ww,wh);k.box('#ffffff55',x,y,ww,1);k.box(M.timber,x+Math.floor(ww/2),y,1,wh);
      if(round){k.box(ink,x,y-2,ww,1);k.box(M.glass,x+1,y-1,ww-2,1);}
      k.box(W[0],x-1,y+wh+1,ww+2,1);
    };
    const doorAt=(dw,dh,arch=false)=>{
      k.box(ink,-Math.ceil(dw/2)-1,-dh-1,dw+2,dh+1);k.box(M.door[0],-Math.ceil(dw/2),-dh,dw,dh);
      k.box(M.door[1],-Math.ceil(dw/2)+1,-dh+1,dw-2,dh-1);k.box('#e3c27a',Math.floor(dw/2)-2,-Math.round(dh/2),1,1);
      if(arch){k.box(ink,-Math.ceil(dw/2)+1,-dh-2,dw-2,1);k.box(M.door[0],-Math.ceil(dw/2)+2,-dh-1,dw-4,1);}
      k.box(W[0],-Math.ceil(dw/2)-2,0,dw+4,1);
    };
    const gable=(peak,overhang,tones,rows=4)=>{
      k.shape(ink,[[-hw-overhang-1,-H+1],[0,-H-peak-1],[hw+overhang+1,-H+1]]);
      k.shape(tones[1],[[-hw-overhang,-H],[0,-H-peak],[hw+overhang,-H]]);
      k.shape(tones[2],[[-hw-overhang+2,-H-1],[0,-H-peak+1],[-2,-H-1]]);
      for(let y=-H-peak+rows;y<-H;y+=rows){const t=(y+H+peak)/peak,half=Math.round((hw+overhang)*t);k.box(tones[0],-half+1,y,half*2-2,1);
        for(let x=-half+2+(y&2?3:0);x<half-2;x+=6)k.box(tones[3],x,y-1,2,1);}
      k.box(tones[4],-2,-H-peak,4,2);k.box(tones[0],-hw-overhang,-H,hw*2+overhang*2,2);
    };
    if(type==='stall'){
      const [a,b]=awnings[pal];
      k.blob('#14222655',2,1,19,4);
      k.box(ink,-17,-24,3,24);k.box(ink,14,-24,3,24);k.box(M.timber,-16,-23,1,23);k.box(M.timber,15,-23,1,23);
      k.box(ink,-18,-10,36,7);k.box('#7a5f45',-17,-10,34,6);k.box('#a8845c',-17,-10,34,2);
      const goods=pal==='snow'?['#d9d3c8','#8a7a6a','#bcb0a0']:pal==='star'?['#9ff0dd','#c9b6f0','#7fb8d8']:pal==='shore'?['#9cc4d0','#e7d8b4','#c7866a']:
        pal==='canyon'?['#d9a24e','#a84b3a','#e7c88a']:pal==='grass'?['#c9a24e','#a35a35','#e0c98a']:['#a9c36b','#d9a04e','#c96a5a'];
      for(let i=0;i<6;i++){const x=-15+i*5+(v&1);k.box(ink,x,-14,4,4);k.box(goods[(i+v)%3],x,-14,3,3);k.box('#ffffff66',x,-14,1,1);}
      if(pal==='grass'||pal==='root'){
        k.shape(ink,[[-22,-20],[0,-33],[22,-20]]);k.shape(a,[[-20,-21],[0,-32],[20,-21]]);
        for(let x=-18;x<18;x+=3)k.stroke(b+'88',x,-21,x*.3,-30);
      }else{
        k.shape(ink,[[-21,-20],[-18,-30],[18,-30],[21,-20]]);
        for(let x=-19;x<19;x+=6){k.shape((x/6&1)?b:a,[[x,-21],[x+1,-29],[x+7,-29],[x+6,-21]]);}
        for(let x=-20;x<20;x+=6){k.box((x/6&1)?b:a,x,-21,6,3);k.box(ink+'88',x+5,-21,1,3);}
        if(pal==='snow')k.box(flora.snow.snow[2],-17,-31,34,2);
      }
      return;
    }
    if(type==='well'){
      const st=flora[pal].stone;
      k.blob('#14222655',2,1,12,4);k.blob(st[0],0,-3,10,6);k.box(st[1],-10,-8,21,5);k.blob(st[2],0,-8,10,4);k.blob('#24384a',0,-9,7,3);
      for(let x=-9;x<10;x+=4)k.box(st[0],x,-7,1,4);
      if(pal==='canyon'||pal==='shore'||pal==='grass'){k.box(M.timber,-9,-22,2,15);k.box(M.timber,8,-22,2,15);k.box(M.timber,-10,-23,21,2);k.box('#cbb07a',0,-21,1,11);k.box('#7a5a3a',-2,-12,4,3);}
      else{k.box(M.timber,-9,-20,3,14);k.box(M.timber,7,-20,3,14);k.shape(R[1],[[-13,-19],[-6,-26],[7,-26],[14,-19]]);k.box(R[0],-13,-19,27,2);k.box('#cbaa77',-1,-18,1,9);
        if(pal==='snow')k.shape(flora.snow.snow[2],[[-12,-20],[-6,-26],[7,-26],[13,-20]]);}
      return;
    }
    // Case e sale
    k.blob('#14222660',3,1,hw+5,5);
    if(M.style==='round'){
      k.blob(ink,0,-8,hw+1,11);k.blob(W[1],0,-8,hw,10);k.box(W[1],-hw,-H+2,hw*2,H-8);
      k.box(W[2],-hw+2,-H+2,hw*2-10,H-8);k.box(R[0],-hw,-11,hw*2,2);k.box('#b8553a',-hw+1,-14,hw*2-2,1);
      for(let x=-hw+3;x<hw-3;x+=5)k.box('#e8d6a8',x,-15,2,1);
      doorAt(8,13,true);windowAt(-hw+5,-H+5,4,4);windowAt(hw-9,-H+5,4,4);
      const peak=hall?26:22;
      k.shape(ink,[[-hw-5,-H+4],[0,-H-peak],[hw+5,-H+4]]);k.shape(R[1],[[-hw-4,-H+3],[0,-H-peak+1],[hw+4,-H+3]]);
      k.shape(R[2],[[-hw-2,-H+2],[0,-H-peak+3],[-3,-H+2]]);
      for(let x=-hw-2;x<hw+3;x+=2){const yb=-H+3-(x&2?0:1);k.stroke(x<0?R[3]:R[0],x,yb,x*.15,-H-peak+6);}
      for(let x=-hw-4;x<hw+5;x+=3)k.box(R[x&1?0:4],x,-H+3,2,2);
      k.box(R[4],-1,-H-peak-2,3,3);k.box(M.timber,0,-H-peak-5,1,4);
      if(hall)for(const x of [-hw-7,hw+6]){k.box(M.timber,x,-16,2,16);k.box(R[3],x-1,-18,4,2);}
      return;
    }
    if(M.style==='stilts'){
      const lift=7;
      for(const x of [-hw+2,-7,6,hw-4]){k.box(ink,x,-lift-1,3,lift+1);k.box(M.timber,x,-lift,2,lift);}
      k.box(ink,-hw-2,-lift-3,hw*2+4,3);k.box(W[3],-hw-1,-lift-3,hw*2+2,1);
      k.box(ink,-hw,-H-lift,hw*2,H-2);k.box(W[1],-hw+1,-H-lift+1,hw*2-2,H-4);
      for(let y=-H-lift+3;y<-lift-3;y+=3)k.box(W[0],-hw+1,y,hw*2-2,1);
      for(const x of [-hw+1,hw-3])k.box(W[2],x,-H-lift+1,2,H-4);
      k.box(ink,-4,-lift-15,9,12);k.box(M.door[1],-3,-lift-14,7,11);
      for(let y=-lift+1;y<0;y+=2)k.box(W[3],-3,y,7,1);k.box(W[0],-4,-lift,1,lift);k.box(W[0],4,-lift,1,lift);
      windowAt(-hw+4,-H-lift+5,5,5);windowAt(hw-9,-H-lift+5,5,5);
      const peak=hall?17:14,top=-H-lift+2;
      k.shape(ink,[[-hw-6,top+1],[0,top-peak-1],[hw+6,top+1]]);
      for(let layer=0;layer<3;layer++){const yb=top-layer*5,half=hw+5-layer*6;
        k.shape(R[1+layer],[[-half,yb],[0,top-peak],[half,yb]]);
        for(let x=-half;x<half;x+=3)k.box(R[layer],x,yb-1+(x&1),2,2);}
      k.box(R[4],-2,top-peak,4,2);
      if(hall){k.box('#d6a64e',-hw-2,-H-lift+8,2,3);k.box('#d6a64e',hw,-H-lift+8,2,3);}
      return;
    }
    // Pareti di base per gli altri stili
    k.box(ink,-hw-1,-H,hw*2+2,H);k.box(W[1],-hw,-H+1,hw*2,H-1);k.box(W[2],-hw+1,-H+1,hw*2-8,H-3);
    if(M.style==='tiles'){
      for(let y=-7;y<-1;y+=3)for(let x=-hw+(y&2?0:3);x<hw;x+=6){k.box(W[0],x,y,1,3);k.box(W[3],x+1,y,4,1);}
      k.box(W[0],-hw,-8,hw*2,1);
      for(const x of [-hw,hw-3])k.box(M.timber,x,-H+1,3,H-9);k.box(M.timber,-hw,-H+1,hw*2,2);
      if(v===2||hall){k.blob('#4e7446',-hw+3,-6,4,6);k.blob('#6e9458',-hw+2,-8,3,4);}
    }else if(M.style==='logs'){
      for(let y=-H+2;y<0;y+=3){k.box(W[0],-hw,y+2,hw*2,1);k.box(W[3],-hw+1,y,hw*2-10,1);}
      for(let y=-H+2;y<0;y+=3){k.blob(W[3],-hw-1,y+1,1,1);k.blob(W[3],hw,y+1,1,1);}
    }else if(M.style==='keep'){
      for(let y=-H+3;y<0;y+=4)for(let x=-hw+(y&4?0:4);x<hw;x+=8){k.box(W[0],x,y,1,4);k.box(W[0],x,y+3,7,1);k.box(W[3],x+1,y,5,1);}
    }else if(M.style==='dome'){
      for(let y=-H+5;y<0;y+=5)k.box(W[0],-hw,y,hw*2,1);k.box(M.timber,-hw,-H+1,hw*2,2);
    }else if(M.style==='flat'){
      k.box(W[3],-hw+1,-H+1,hw*2-2,2);k.box(W[0],-hw,-2,hw*2,2);
      for(let i=0;i<5;i++)k.box(W[0]+'88',Math.round(-hw+2+rnd()*(hw*2-6)),Math.round(-H+5+rnd()*12),2,1);
    }else if(M.style==='adobe'){
      k.box(W[3],-hw+1,-H+1,hw*2-4,1);k.box(W[0],-hw,-2,hw*2,2);
      for(let i=0;i<6;i++)k.box(W[0]+'99',Math.round(-hw+2+rnd()*(hw*2-6)),Math.round(-H+4+rnd()*14),1+Math.floor(rnd()*3),1);
    }
    const arch=M.style==='tiles'||M.style==='dome'||M.style==='adobe'||M.style==='keep';
    doorAt(hall?9:7,hall?15:13,arch);
    const wy=-H+6;
    if(M.style==='keep'){windowAt(-hw+5,wy,3,6);windowAt(hw-8,wy,3,6);}
    else if(M.style==='dome'){windowAt(-hw+5,wy,5,6,true);windowAt(hw-10,wy,5,6,true);}
    else{windowAt(-hw+5,wy,6,6);windowAt(hw-11,wy,6,6);if(hall){windowAt(-hw+14,wy,4,6);windowAt(hw-17,wy,4,6);}}
    if(M.style==='flat'){
      for(const x of [-hw+4,hw-11]){k.box(M.door[1],x-2,wy-1,2,8);k.box(M.door[1],x+7,wy-1,2,8);}
      k.box(ink,-hw-2,-H-3,hw*2+4,4);k.box(W[3],-hw-1,-H-3,hw*2+2,2);k.box(W[2],-hw-1,-H-1,hw*2+2,1);
      for(let x=-hw;x<hw;x+=5)k.box(W[1],x,-H-5,3,2);
      if(hall||v===2){k.blob(ink,hall?0:-8,-H-4,hall?11:7,hall?9:6);k.blob(R[2],hall?0:-8,-H-5,hall?10:6,hall?8:5);k.blob(R[3],hall?-3:-10,-H-7,hall?5:3,hall?4:2);k.box(R[4],(hall?0:-8)-1,-H-(hall?14:11),2,3);}
      if(v===0){k.box(awnings.shore[0],hw-14,wy-3,10,2);k.box(awnings.shore[1],hw-13,wy-3,2,2);k.box(awnings.shore[1],hw-9,wy-3,2,2);}
      return;
    }
    if(M.style==='adobe'){
      k.box(ink,-hw-1,-H-2,hw*2+2,3);k.box(W[3],-hw,-H-2,hw*2,2);
      for(let x=-hw+3;x<hw-2;x+=6){k.box(M.timber,x,-H+1,2,2);k.box('#2b1d14',x,-H+3,2,1);}
      if(hall||v===2){const cx=hall?0:7,r=hall?11:7;k.blob(ink,cx,-H-2,r+1,r);k.blob(R[2],cx,-H-3,r,r-1);k.blob(R[3],cx-2,-H-5,Math.max(2,r-4),Math.max(2,r-5));k.box(R[4],cx-1,-H-r-4,2,3);}
      if(hall)for(const x of [-hw+2,hw-6]){k.box(ink,x-1,-12,6,12);k.box(W[3],x,-11,4,11);}
      return;
    }
    if(M.style==='dome'){
      const r=hall?18:14;k.blob(ink,0,-H,r+2,r-2);k.blob(R[1],0,-H-1,r+1,r-3);k.blob(R[2],-2,-H-3,r-3,r-6);k.blob(R[3],-5,-H-6,Math.max(2,r-9),Math.max(2,r-10));
      for(const x of [-Math.round(r*.55),0,Math.round(r*.55)])k.stroke(R[0],x,-H-1,x*.4,-H-r+3);
      k.box(ink,-hw-1,-H-1,hw*2+2,2);k.box(R[4],-hw,-H-1,hw*2,1);
      const tone=flora.star.crystal[v%2];
      k.shape(tone[1],[[-2,-H-r+2],[0,-H-r-7],[2,-H-r+2]]);k.box(tone[3],0,-H-r-5,1,4);
      if(hall){k.box(ink,-3,-H-r+3,6,7);k.box('#9ff0ff',-2,-H-r+4,4,5);}
      return;
    }
    if(M.style==='keep'){
      const peak=hall?18:20;
      if(hall){
        k.box(ink,-hw-1,-H-14,hw*2+2,15);k.box(W[1],-hw,-H-13,hw*2,13);for(let y=-H-10;y<-H;y+=4)k.box(W[0],-hw,y,hw*2,1);
        for(let x=-hw;x<hw;x+=7){k.box(ink,x,-H-18,5,5);k.box(W[2],x+1,-H-17,3,4);k.box(flora.snow.snow[2],x,-H-18,5,1);}
        k.box(ink,-2,-H-30,1,13);k.box('#9a3a33',-1,-H-30,7,5);k.box('#c95a44',-1,-H-30,6,2);
        windowAt(-4,-H-10,3,5);windowAt(3,-H-10,3,5);
        k.box(flora.snow.snow[2],-hw,-H-14,hw*2,2);
        return;
      }
      gable(peak,3,R,4);
      k.shape(flora.snow.snow[2],[[-hw-3,-H-1],[0,-H-peak],[hw+3,-H-1],[hw-3,-H-2],[0,-H-peak+4],[-hw+3,-H-2]]);
      k.shape(flora.snow.snow[3],[[-hw+2,-H-4],[0,-H-peak+1],[-4,-H-6]]);
      for(let x=-hw;x<hw;x+=5)k.box(flora.snow.snow[1],x,-H+1,1,2+(x&2?1:0));
      k.box(ink,hw-9,-H-peak+3,6,12);k.box(W[2],hw-8,-H-peak+3,4,11);k.box(flora.snow.snow[2],hw-9,-H-peak+2,6,2);
      return;
    }
    if(M.style==='logs'){
      const peak=hall?27:24;gable(peak,4,R,3);
      k.box(ink,-hw+4,-H-peak+9,7,15);k.box('#76726c',-hw+5,-H-peak+9,5,14);k.box('#a19b92',-hw+5,-H-peak+9,2,14);k.box('#5d5954',-hw+4,-H-peak+8,7,2);
      if(hall){k.box(ink,-3,-H-11,7,8);k.box('#f0c070',-2,-H-10,5,6);k.box(M.timber,0,-H-10,1,6);}
      if(v===2)for(let y=-6;y<0;y+=2)for(let x=hw+2;x<hw+9;x+=3){k.blob('#6a4c33',x,y,1,1);k.box('#b08a5e',x,y,1,1);}
      return;
    }
    // tiles (Vaelthoria): tetto di coppi con colmo, frontone a colonne per la sala.
    if(hall){
      for(const x of [-hw+1,-9,6,hw-5]){k.box(ink,x-1,-H-1,6,H+1);k.box(W[3],x,-H,4,H);k.box(W[1],x+3,-H,1,H);}
      k.box(ink,-hw-3,-H-4,hw*2+6,4);k.box(W[3],-hw-2,-H-4,hw*2+4,2);
      k.shape(ink,[[-hw-3,-H-4],[0,-H-18],[hw+3,-H-4]]);k.shape(R[2],[[-hw-1,-H-5],[0,-H-17],[hw+1,-H-5]]);
      k.shape(W[2],[[-hw+6,-H-6],[0,-H-13],[hw-6,-H-6]]);k.box(R[4],-1,-H-18,3,2);k.box('#d6b66a',-1,-H-10,2,2);
      return;
    }
    gable(hall?20:18,4,R,3);
    if(v!==1){k.box(ink,hw-11,-H-15,6,11);k.box(W[2],hw-10,-H-15,4,10);k.box(W[0],hw-11,-H-16,6,2);}
  }
  function drawLampSprite(g,pal){
    const k=spriteKit(g,40,78),M=masonry[pal],ink='#1d232a';
    k.blob('#14222655',1,1,5,2);
    if(pal==='grass'||pal==='root'){
      k.box(ink,-1,-20,3,20);k.box(M.timber,0,-20,1,20);k.box(ink,-3,-23,7,4);k.box('#6b4a2c',-2,-22,5,2);
      k.box(ink,-2,-2,5,2);
      return;
    }
    if(pal==='star'||pal==='fae'){
      const t=flora.star.crystal[1];
      k.box(ink,-1,-17,3,17);k.box('#8b89a9',0,-17,1,17);k.box(ink,-3,-2,7,2);
      k.shape(t[0],[[-3,-18],[0,-26],[3,-18],[0,-16]]);k.shape(t[2],[[-2,-18],[0,-24],[0,-17]]);
      return;
    }
    if(pal==='ruin'){
      k.box(ink,-4,-3,9,3);k.box('#a99f86',-3,-3,7,2);k.box(ink,-2,-15,5,13);k.box('#cbc1a6',-1,-15,3,12);
      k.box(ink,-4,-21,9,7);k.box('#6b5a46',-3,-20,7,5);k.box(ink,-5,-23,11,2);k.box('#a99f86',-4,-23,9,1);
      return;
    }
    // Lanterna su palo di ferro (nord) o d'ottone (costa e deserto).
    const metal=pal==='shore'||pal==='canyon'?['#5a4630','#a07a45']:['#2b3036','#59626b'];
    k.box(ink,-1,-22,3,22);k.box(metal[1],0,-22,1,21);k.box(ink,-1,-23,9,2);k.box(metal[1],0,-23,7,1);
    k.box(ink,3,-20,6,8);k.box(metal[0],4,-19,4,6);k.box(ink,2,-21,8,2);k.box(ink,-3,-1,7,2);
    if(pal==='snow')k.box(flora.snow.snow[2],2,-22,8,1);
  }
  function drawRuinSprite(g,pal,v){
    const k=spriteKit(g,40,78),st=flora[pal].stone,tall=13+v*3,ink='#1d232a';
    k.blob('#14222655',2,1,10,3);k.box(st[0],-9,-4,19,5);k.box(st[1],-7,-6,15,3);
    k.box(ink,-6,-tall-1,12,tall-5);k.box(st[1],-5,-tall,10,tall-6);k.box(st[2],-4,-tall,5,tall-7);k.box(st[3],-3,-tall,2,tall-9);
    for(let y=-tall+4;y<-6;y+=4)k.box(st[0],-5,y,10,1);
    k.shape(st[2],[[-6,-tall],[-6,-tall-3],[-2,-tall-2],[1,-tall-5],[6,-tall-4],[6,-tall]]);
    if(v===2){k.box(st[1],7,-3,6,3);k.box(st[2],8,-4,4,1);}
    if(flora[pal].moss&&pal!=='canyon'&&pal!=='shore'){k.box(flora[pal].moss,-5,-8,4,2);k.box(flora[pal].moss,2,-tall+2,2,3);}
    if(pal==='snow')k.box(flora.snow.snow[2],-6,-tall-3,12,2);
  }
  // Monumenti della rinascita, pilastri e varchi per continente (World Art Overhaul): stessi punti, nessun ingombro.
  // Ogni custode ha sagoma e materiali propri: Custode delle Origini (travertino), Sentinella Eterna (granito e neve),
  // Oracolo del Velo (cristallo), Madre delle Radici (legno e radici), Giudice delle Ere (arenaria).
  function drawMonument(g,design){
    const k=spriteKit(g,40,78),ink='#1a2128';
    k.blob('#14202866',3,2,34,7);
    if(design===0){
      // Custode delle Origini: figura velata in travertino che regge una lanterna, su basamento a gradini con alloro.
      const S=['#5f584a','#9d947c','#c8bea2','#e8e0c6'];
      k.box(ink,-27,-9,54,10);k.box(S[1],-26,-9,52,8);k.box(S[3],-26,-9,52,1);k.box(S[0],-26,-2,52,2);
      k.box(ink,-21,-15,42,7);k.box(S[2],-20,-15,40,6);k.box(S[3],-20,-15,40,1);
      for(let x=-18;x<18;x+=6){k.box('#5f7b4a',x,-14,3,2);k.box('#86a35f',x+1,-15,2,1);}
      k.shape(ink,[[-12,-15],[-10,-44],[-6,-52],[6,-52],[10,-44],[12,-15]]);
      k.shape(S[2],[[-11,-16],[-9,-43],[-5,-50],[5,-50],[9,-43],[11,-16]]);
      k.shape(S[1],[[3,-16],[6,-42],[9,-43],[11,-16]]);
      for(let y=-40;y<-17;y+=4)k.box(S[1],-8+((y/4)&1),y,2,3);
      k.blob(ink,0,-57,7,7);k.blob(S[2],0,-57,6,6);k.blob(S[3],-2,-59,3,3);k.shape(S[1],[[-6,-58],[0,-65],[6,-58],[4,-54],[-4,-54]]);
      k.stroke(S[1],8,-40,15,-46,2);k.box(ink,13,-54,7,9);k.box('#c99a52',14,-53,5,7);k.box('#ffe1a0',15,-51,3,3);k.box(S[2],13,-55,7,1);
      return;
    }
    if(design===1){
      // Sentinella Eterna: cavaliere in granito con la spada rivolta verso il basso, neve su spalle ed elmo.
      const S=['#2d343e','#56616e','#848f9a','#b8c1c8'],N='#eef4f6';
      k.box(ink,-24,-10,48,11);k.box(S[1],-23,-10,46,9);k.box(S[2],-23,-10,46,1);
      for(let x=-21;x<21;x+=7)k.box(S[0],x,-7,1,5);
      k.shape(ink,[[-15,-10],[-17,-40],[-11,-50],[11,-50],[17,-40],[15,-10]]);
      k.shape(S[1],[[-14,-11],[-16,-40],[-10,-48],[10,-48],[16,-40],[14,-11]]);
      k.shape(S[2],[[-14,-11],[-16,-40],[-10,-48],[-6,-48],[-9,-40],[-8,-11]]);
      for(let y=-38;y<-12;y+=6)k.box(S[0],-13,y,26,1);
      k.box(ink,-9,-62,18,13);k.box(S[2],-8,-61,16,12);k.box(S[0],-6,-56,12,2);k.box(S[3],-8,-61,16,2);
      k.box(N,-17,-50,9,3);k.box(N,8,-50,9,3);k.box(N,-8,-64,16,3);
      k.box(ink,-2,-46,4,40);k.box('#c8d0d6',-1,-45,2,38);k.box(ink,-9,-48,18,3);k.box('#9aa5ad',-8,-47,16,1);
      k.box('#a33d34',-3,-52,6,4);
      return;
    }
    if(design===2){
      // Oracolo del Velo: figura velata in pietra viola con una sfera di cristallo e schegge sospese.
      const S=['#2a2846','#4d4a74','#7a76a3','#b7b1d6'],C=['#3f8aa0','#86c6cf','#d8fbff'];
      k.blob(ink,0,-6,24,7);k.blob(S[1],0,-7,23,6);k.blob(S[2],0,-8,19,4);
      k.shape(ink,[[-13,-8],[-9,-46],[-4,-56],[4,-56],[9,-46],[13,-8]]);
      k.shape(S[1],[[-12,-9],[-8,-45],[-3,-54],[3,-54],[8,-45],[12,-9]]);
      for(let x=-9;x<10;x+=4)k.stroke(S[2],x,-12,x*.5,-48);
      k.shape(S[3],[[-8,-45],[-3,-54],[3,-54],[8,-45],[0,-40]]);
      k.blob(ink,0,-30,7,7);k.blob(C[0],0,-30,6,6);k.blob(C[1],-1,-31,4,4);k.box(C[2],-2,-33,2,2);
      for(const [x,y,h] of [[-22,-40,10],[21,-46,12],[-17,-62,7],[16,-66,8]]){k.shape(C[0],[[x-2,y],[x,y-h],[x+2,y]]);k.box(C[2],x,y-h+2,1,3);}
      return;
    }
    if(design===3){
      // Madre delle Radici: tronco a forma di donna che avvolge un'urna, radici aperte sul suolo e muschio.
      const W=['#2f2419','#5a4632','#83684a','#a88c66'],M=['#3c6a43','#5d9a5e','#8cc07a'];
      for(const [x,dx] of [[-6,-30],[6,30],[-3,-18],[3,20]]){k.stroke(W[0],x,-4,dx,2,3);k.stroke(W[2],x,-5,dx,1,1);}
      k.shape(W[0],[[-12,-2],[-10,-30],[-16,-44],[-9,-58],[0,-54],[9,-58],[16,-44],[10,-30],[12,-2]]);
      k.shape(W[1],[[-10,-3],[-8,-30],[-13,-43],[-8,-55],[0,-51],[8,-55],[13,-43],[8,-30],[10,-3]]);
      k.shape(W[2],[[-10,-3],[-8,-30],[-13,-43],[-8,-55],[-5,-53],[-9,-42],[-5,-30],[-6,-3]]);
      k.blob(W[0],0,-62,6,6);k.blob(W[2],-1,-62,5,5);k.box(W[3],-2,-64,2,2);
      k.blob(ink,0,-17,7,6);k.blob('#7a6b5a',0,-18,6,5);k.box('#a89880',-3,-21,5,2);k.box('#2a2420',-2,-23,4,2);
      for(const [x,y] of [[-12,-40],[11,-36],[-6,-50],[7,-24],[-9,-12]]){k.box(M[1],x,y,3,2);k.box(M[2],x,y-1,2,1);}
      for(let i=0;i<5;i++)k.stroke(M[0],-14+i*7,-56+(i&1)*6,-15+i*7,-44+(i&1)*6);
      return;
    }
    // Giudice delle Ere: colosso seduto in arenaria con corona e bilancia, fra due pilastri del tempio.
    const S=['#5a3a2c','#8f6248','#bf8f68','#e2b98d'];
    k.box(ink,-36,-12,72,13);k.box(S[1],-35,-12,70,11);k.box(S[3],-35,-12,70,1);
    for(let x=-33;x<34;x+=8){k.box(S[0],x,-9,1,7);k.box(S[2],x+3,-6,3,1);}
    for(const x of [-31,23]){k.box(ink,x,-62,9,51);k.box(S[2],x+1,-61,7,49);k.box(S[3],x+1,-61,2,49);k.box(S[1],x-1,-64,11,4);for(let y=-55;y<-14;y+=8)k.box(S[0],x+2,y,5,1);}
    k.box(ink,-35,-70,70,7);k.box(S[2],-34,-69,68,5);k.box(S[3],-34,-69,68,1);
    k.shape(ink,[[-16,-12],[-16,-34],[-10,-38],[10,-38],[16,-34],[16,-12]]);k.shape(S[1],[[-15,-13],[-15,-33],[-9,-37],[9,-37],[15,-33],[15,-13]]);
    k.box(S[2],-15,-24,30,2);
    k.box(ink,-9,-54,18,17);k.box(S[2],-8,-53,16,15);k.box(S[0],-5,-47,3,2);k.box(S[0],2,-47,3,2);
    k.shape('#d9a24e',[[-9,-54],[-7,-60],[-3,-56],[0,-62],[3,-56],[7,-60],[9,-54]]);
    k.box(S[0],-1,-36,2,10);k.box(S[0],-12,-27,24,1);k.box('#d9a24e',-13,-26,5,2);k.box('#d9a24e',8,-26,5,2);
  }
  function drawPillar(g,design,k2){
    const k=spriteKit(g,40,78),ink='#1a2128';
    k.blob('#14202855',2,1,8,3);
    if(design===0){k.box(ink,-5,-26,10,26);k.box('#c8bea2',-4,-25,8,24);for(let x=-3;x<4;x+=2)k.box('#9d947c',x,-24,1,22);k.box('#e8e0c6',-6,-28,12,3);if(k2)k.shape('#e8e0c6',[[-5,-28],[-2,-32],[1,-29],[5,-31],[5,-28]]);k.box('#86a35f',-4,-6,3,2);return;}
    if(design===1){k.shape(ink,[[-6,0],[-5,-24],[0,-30],[5,-24],[6,0]]);k.shape('#56616e',[[-5,-1],[-4,-23],[0,-28],[4,-23],[5,-1]]);k.shape('#848f9a',[[-5,-1],[-4,-23],[0,-28],[-1,-1]]);for(let y=-20;y<-4;y+=6)k.box('#9fd3e0',-1,y,2,3);k.box('#eef4f6',-4,-26,8,3);return;}
    if(design===3){k.shape(ink,[[-6,0],[-6,-22],[-2,-27],[4,-25],[6,0]]);k.shape('#6f7a62',[[-5,-1],[-5,-21],[-2,-25],[3,-24],[5,-1]]);for(let y=-22;y<-2;y+=5)k.stroke('#5a4632',-6,y,6,y+3,2);k.box('#5d9a5e',-5,-26,4,2);k.box('#8cc07a',2,-15,3,2);return;}
    if(design===4){k.shape(ink,[[-6,0],[-5,-28],[0,-34],[5,-28],[6,0]]);k.shape('#bf8f68',[[-5,-1],[-4,-27],[0,-32],[4,-27],[5,-1]]);k.shape('#e2b98d',[[-5,-1],[-4,-27],[0,-32],[-1,-1]]);for(let y=-24;y<-4;y+=5){k.box('#8f6248',-2,y,4,1);k.box('#8f6248',-1,y+2,2,1);}return;}
    // design 2 (Oracolo): obelischi viola; i cristalli dispari restano i cristalli della Conca.
    k.shape(ink,[[-5,0],[-4,-26],[0,-32],[4,-26],[5,0]]);k.shape('#4d4a74',[[-4,-1],[-3,-25],[0,-30],[3,-25],[4,-1]]);k.shape('#7a76a3',[[-4,-1],[-3,-25],[0,-30],[-1,-1]]);k.box('#86c6cf',-1,-18,2,4);
  }
  function drawGateSprite(g,pal){
    const k=spriteKit(g,40,78),ink='#1a2128',M=masonry[pal]||masonry.ruin,F=flora[pal]||flora.ruin,st=F.stone;
    k.blob('#14202860',2,1,22,5);
    // Passaggio scuro dentro l'arco: segnala il cambio di regione come il varco precedente.
    const deep=pal==='snow'?'#1c2530':pal==='star'?'#1d1a3a':pal==='root'?'#122219':'#1e2a32';
    k.shape(deep,[[-12,0],[-12,-20],[-8,-26],[8,-26],[12,-20],[12,0]]);k.box('#00000033',-12,-26,24,6);
    k.box('#8a9a9466',-11,-2,22,2);k.box('#c8d4c844',-9,-1,18,1);
    const posts=(col,top,w=5)=>{for(const x of [-18,13]){k.box(ink,x-1,top-1,w+2,-top+1);k.box(col[1],x,top,w,-top);k.box(col[2],x,top,2,-top);}};
    const lamp=(x,y,c)=>{k.box(ink,x-2,y-1,5,6);k.box(c,x-1,y,3,4);};
    if(pal==='ruin'||pal==='fae'){
      // Arco degli Ardel: colonne scanalate, architrave con chiave; nella Selva rame e vetro.
      const C=pal==='fae'?['#2e4f4f','#73a091','#9fc1ae']:['#5f584a','#c8bea2','#e8e0c6'];
      posts(C,-30,6);for(const x of [-17,14])for(let y=-28;y<-2;y+=3)k.box(C[0],x+1,y,1,2);
      k.shape(ink,[[-22,-30],[-12,-41],[12,-41],[22,-30]]);k.shape(C[1],[[-20,-31],[-11,-39],[11,-39],[20,-31]]);k.box(C[2],-20,-31,40,2);
      k.shape(pal==='fae'?'#86c6cf':'#d6b66a',[[-3,-40],[0,-45],[3,-40],[0,-36]]);
      if(pal==='ruin'){k.blob('#4e7446',-17,-22,3,6);k.blob('#6e9458',-16,-25,2,3);}
      lamp(-16,-16,pal==='fae'?'#9ff0ff':'#f3ce8e');lamp(15,-16,pal==='fae'?'#9ff0ff':'#f3ce8e');return;
    }
    if(pal==='pine'){
      // Portale minerario: montanti di larice, trave doppia, insegna e lanterne.
      const C=['#3b2f28','#77583f','#977650'];posts(C,-32,6);
      k.box(ink,-22,-37,44,6);k.box(C[1],-21,-36,42,4);k.box(C[2],-21,-36,42,1);k.box(ink,-18,-31,36,3);k.box(C[1],-17,-30,34,1);
      k.box(ink,-7,-29,14,7);k.box('#c9b58a',-6,-28,12,5);k.box('#5c4635',-4,-26,8,1);
      k.stroke(C[0],-14,-28,-18,-20,2);k.stroke(C[0],14,-28,18,-20,2);lamp(-15,-14,'#f0c070');lamp(16,-14,'#f0c070');return;
    }
    if(pal==='snow'){
      // Porta fortificata: torrette merlate, grata abbassata a metà e neve sui merli.
      for(const x of [-21,13]){k.box(ink,x-1,-36,10,36);k.box('#69747d',x,-35,8,35);k.box('#8a959d',x,-35,3,35);for(let y=-30;y<-2;y+=5)k.box('#454e57',x,y,8,1);for(let m=0;m<8;m+=3){k.box(ink,x+m,-39,2,3);k.box('#eef4f6',x+m,-40,2,1);}}
      k.box(ink,-13,-33,26,5);k.box('#69747d',-12,-32,24,3);k.box('#eef4f6',-13,-34,26,2);
      for(let x=-11;x<12;x+=4)k.box('#2b3036',x,-28,1,12);k.box('#2b3036',-12,-22,24,1);k.box('#2b3036',-12,-17,24,1);
      lamp(-17,-20,'#ffcf7d');lamp(17,-20,'#ffcf7d');return;
    }
    if(pal==='star'){
      // Arco di cristallo: due guglie che si piegano l'una verso l'altra e una stella sospesa.
      const C=flora.star.crystal;
      for(const d of [-1,1]){k.shape(ink,[[d*20,0],[d*22,-24],[d*14,-38],[d*6,-42],[d*12,-30],[d*14,0]]);k.shape(C[d<0?0:1][1],[[d*19,-1],[d*21,-24],[d*14,-36],[d*8,-39],[d*13,-29],[d*15,-1]]);k.shape(C[d<0?0:1][2],[[d*19,-1],[d*21,-24],[d*18,-27],[d*17,-1]]);}
      k.shape('#f5e6ff',[[0,-50],[2,-46],[6,-45],[2,-43],[0,-39],[-2,-43],[-6,-45],[-2,-46]]);return;
    }
    if(pal==='grass'){
      // Porta di Namar: pali dipinti, tettoia di paglia e stendardi.
      const C=['#4f3a26','#a57c4f','#d6ad77'];posts(C,-30,5);
      for(const x of [-18,13])for(let y=-26;y<-2;y+=6)k.box('#b8553a',x,y,5,2);
      k.shape(ink,[[-25,-28],[0,-42],[25,-28]]);k.shape('#a38a42',[[-23,-29],[0,-41],[23,-29]]);
      for(let x=-21;x<22;x+=3)k.stroke('#c4a855',x,-29,x*.4,-38);
      for(const x of [-10,7]){k.box(ink,x,-28,4,11);k.box('#b8553a',x+1,-27,2,9);k.box('#e6c27a',x+1,-22,2,1);}return;
    }
    if(pal==='root'){
      // Arco vivo: due tronchi che intrecciano i rami, radici a terra e lanterne appese.
      const W=flora.root.trunk,L=flora.root.leaves;
      for(const d of [-1,1]){k.stroke(W[0],d*18,0,d*14,-30,5);k.stroke(W[1],d*18,-1,d*14,-30,3);k.stroke(W[0],d*14,-30,-d*4,-40,3);k.stroke(W[0],d*19,0,d*26,3,2);}
      for(const [x,y,rw,rh] of [[-12,-40,10,5],[10,-41,10,5],[0,-45,11,5]]){k.blob(L[1],x,y,rw,rh);k.blob(L[3],x-2,y-2,rw-4,rh-2);}
      for(const x of [-8,7]){k.box(W[0],x,-36,1,8);k.box(ink,x-2,-29,5,5);k.box('#f2cf86',x-1,-28,3,3);}return;
    }
    if(pal==='shore'){
      // Arco del porto: pali di legno salmastro, cima tesa, reti e lanterne.
      const C=['#55412d','#9d7f57','#c0a477'];posts(C,-32,5);
      k.box(ink,-23,-36,46,5);k.box(C[1],-22,-35,44,3);k.box(C[2],-22,-35,44,1);
      k.stroke('#d8c79c',-17,-30,0,-25);k.stroke('#d8c79c',0,-25,17,-30);
      for(let x=-12;x<13;x+=4)k.stroke('#a99777',x,-27+Math.abs(x)*.15,x,-20);
      k.box('#2f6f8e',-24,-40,6,4);k.box('#f4efe2',-23,-39,4,1);lamp(-15,-16,'#f5d38a');lamp(16,-16,'#f5d38a');return;
    }
    // canyon: pilone d'arenaria a fasce, architrave pesante con disco solare inciso.
    const C=['#5a3a2c','#bf8f68','#e2b98d'];
    for(const x of [-21,12]){k.shape(ink,[[x-1,0],[x,-34],[x+9,-34],[x+10,0]]);k.shape(C[1],[[x,-1],[x+1,-33],[x+8,-33],[x+9,-1]]);k.box(C[2],x+1,-33,3,32);for(let y=-28;y<-2;y+=6)k.box('#8f6248',x+1,y,8,1);}
    k.box(ink,-24,-41,48,8);k.box(C[1],-23,-40,46,6);k.box(C[2],-23,-40,46,1);k.blob('#d9a24e',0,-37,4,2);k.box('#8f6248',-6,-37,12,1);
    lamp(-16,-20,'#f4c27a');lamp(16,-20,'#f4c27a');
  }
  // --- Da Codex (codex/world-art-interni-santuario 043b76c): statue della rinascita, pilastri e varco reliquiario.
  // Nell'integrazione si usano per la Sentinella Eterna (Nordharyn), il Giudice delle Ere (Azheryon) e per pilastri
  // e varco della Cripta delle Soglie; il resto resta agli sprite per bioma di Claude.
  const gateStyles={
    ruin:['arch','#b2a16c'], pine:['gable','#d8bd81'], snow:['keep','#d8c298'],
    fae:['gable','#8bc4c4'], star:['arch','#9cdeea'], grass:['arch','#dbb975'],
    root:['gable','#b7c580'], shore:['arch','#8abec6'], canyon:['keep','#e5b47c'],
    crypt:['arch','#82afb1']
  };
  function drawGate(g,pal){
    const {box,blob,shape,stroke}=spriteKit(g,40,78);
    const [silhouette,accent]=gateStyles[pal];
    const [dark,mid,face,light]=pal==='crypt'?['#323942','#535761','#767b83','#9ba1a1']:masonry[pal].wall;
    const ink='#242c33';
    blob('#18232972',3,2,24,6);
    box(dark,-23,-5,46,7);box(mid,-22,-6,44,4);box(face,-21,-6,42,1);
    if(silhouette==='gable'){
      shape(ink,[[-24,-27],[0,-47],[24,-27],[21,-24],[-21,-24]]);
      const roof=masonry[pal].roof;
      shape(roof[2],[[-21,-27],[0,-45],[20,-27]]);
      stroke(roof[4],-21,-27,0,-45);stroke(roof[0],0,-45,20,-27,2);
      for(const shift of [-14,-7,0,7,14])stroke(roof[1],shift,-29,Math.floor(shift*.55),-36);
    }else if(silhouette==='keep'){
      box(ink,-22,-38,44,15);
      for(const x of [-22,-7,8]){
        box(dark,x,-42,14,10);box(mid,x,-41,12,7);box(light,x,-42,12,2);
      }
    }else{
      shape(ink,[[-22,-23],[-22,-29],[-14,-37],[14,-37],[22,-29],[22,-23]]);
      shape(mid,[[-21,-25],[-21,-29],[-13,-36],[13,-36],[21,-29],[21,-25]]);
      stroke(light,-20,-29,-13,-35);box(light,-13,-36,20,1);
      for(const x of [-10,8])box(dark,x,-35,2,5);
    }
    box(dark,-20,-29,40,25);box(mid,-19,-28,38,23);
    box(light,-21,-30,42,1);box(dark,-21,-28,42,2);
    for(const x of [-19,12]){
      box(face,x,-25,7,18);box(light,x,-24,1,16);
      for(let y=-23;y<-8;y+=5){box(dark,x,y,7,1);box(mid,x+(y%2===0?2:4),y+1,1,3);}
      box(mid,x-1,-9,9,4);box(light,x-1,-9,9,1);
    }
    shape(ink,[[-12,-4],[-12,-19],[-9,-24],[-5,-26],[5,-26],[9,-24],[12,-19],[12,-4]]);
    shape('#37434b',[[-10,-4],[-10,-18],[-7,-23],[-4,-24],[4,-24],[7,-23],[10,-18],[10,-4]]);
    box('#232e37',-8,-16,16,9);box(dark,-10,-6,20,2);
    box(dark,-3,-32,6,6);box(accent,-1,-31,2,4);box(accent,-2,-30,4,2);
    for(const x of [-16,15]){box(dark,x-1,-22,3,8);box(accent,x,-21,1,4);}
    box(light,-8,-3,16,1);box(mid,-11,0,23,1);
  }
  function drawRebirthMonument(g,pal,design){
    const {box,blob,shape,stroke}=spriteKit(g,40,78);
    const [dark,mid,light]=formats[pal].stone;
    const accent=gateStyles[pal][1], outline='#243437';
    blob('#16252965',3,2,33,7);
    box(outline,-28,-8,56,9);box(dark,-28,-7,56,6);box(mid,-26,-10,52,4);box(light,-24,-10,48,1);
    box(dark,-22,-16,44,7);box(mid,-21,-16,42,4);box(light,-20,-16,40,1);
    for(const x of [-19,-12,12,19])box(dark,x,-14,1,3);
    if(design===4){
      // Relief in the canyon wall, with strata wrapping around the carved niche.
      shape(outline,[[-38,-12],[-33,-47],[-24,-64],[12,-63],[25,-68],[36,-53],[38,-14]]);
      shape(mid,[[-36,-14],[-31,-46],[-23,-62],[10,-61],[25,-66],[34,-53],[36,-15]]);
      shape(light,[[-34,-28],[-30,-48],[-23,-62],[10,-61],[25,-66],[29,-60],[3,-54],[-22,-56]]);
      shape(dark,[[20,-59],[28,-59],[34,-53],[36,-15],[21,-16],[23,-38]]);
      for(const [x,y,n] of [[-30,-42,10],[-34,-31,12],[-36,-22,13],[17,-49,13],[23,-34,10],[22,-24,14]]){
        box(dark,x,y,n,2);box(light,x,y+2,n-2,1);
      }
      shape(dark,[[-19,-16],[-17,-49],[-10,-57],[9,-57],[16,-49],[19,-16]]);
      shape(light,[[-15,-17],[-11,-43],[-6,-47],[-7,-53],[7,-53],[9,-43],[14,-38],[15,-17]]);
      shape(mid,[[1,-51],[7,-51],[7,-43],[14,-38],[15,-17],[5,-17],[4,-37],[-1,-41]]);
      box(dark,-7,-49,12,2);box(dark,-4,-41,9,2);box(accent,-5,-31,11,2);box(dark,-1,-32,3,8);
      return;
    }
    if(design===2){
      blob(dark,0,-45,16,18);blob(mid,-1,-46,14,17);blob(accent,-1,-46,12,15);blob('#4d506d',0,-46,10,13);
      for(const [x,y,s] of [[-26,-18,1],[-16,-16,.65],[25,-18,.9],[17,-15,.58]]){
        const tip=y-Math.round(31*s), side=Math.round(6*s);
        shape('#4f547e',[[x-side-2,y],[x-side,y-13],[x,tip],[x+side,y-14],[x+side+2,y]]);
        shape('#8b84b7',[[x-side,y-2],[x-side+1,y-13],[x,tip+2],[x+side,y-14],[x+side,y-2]]);
        shape('#c4e1dd',[[x,tip+2],[x+side,y-14],[x,y-10],[x-side+1,y-13]]);box('#c4e1dd',x-1,y-11,2,8);
      }
    }
    const hem=design===1?19:16;
    shape(outline,[[-hem,-16],[-13,-38],[-7,-46],[7,-46],[14,-39],[hem,-16]]);
    shape(dark,[[-hem+1,-17],[-12,-37],[-6,-45],[6,-45],[13,-38],[hem-1,-17]]);
    shape(mid,[[-hem+2,-17],[-11,-36],[-5,-43],[5,-43],[10,-36],[9,-17]]);
    shape(light,[[-11,-18],[-7,-38],[-3,-41],[2,-38],[-2,-27],[-2,-18]]);
    stroke(dark,4,-32,3,-18,2);stroke(dark,-7,-31,-10,-20);
    box(dark,-7,-54,14,13);box(mid,-6,-55,12,12);box(light,-5,-54,8,9);
    if(design!==2){box(dark,-4,-49,8,1);box(mid,-1,-47,4,2);}
    shape(accent,[[-4,-34],[0,-38],[4,-34],[0,-30]]);box(light,-1,-35,2,2);
    if(design===0){
      shape(light,[[-7,-54],[-8,-60],[-4,-58],[0,-63],[4,-58],[7,-60],[7,-54]]);
      box(accent,-6,-56,12,2);box(dark,-1,-59,2,2);
      shape(dark,[[-18,-35],[-15,-43],[-8,-39],[-8,-30],[-16,-29]]);
      shape(light,[[-17,-35],[-14,-41],[-9,-38],[-9,-31],[-16,-31]]);box(accent,-13,-37,2,5);
    }else if(design===1){
      shape(mid,[[-8,-51],[-7,-56],[5,-56],[8,-52],[6,-48],[-8,-48]]);box(light,-7,-53,12,2);
      for(const x of [-15,8]){box(dark,x,-39,8,7);box(light,x,-40,7,2);}
      box(outline,-11,-39,23,5);box(accent,-10,-39,21,2);box(dark,-2,-49,5,11);box(light,-2,-49,2,6);
      shape(outline,[[-5,-35],[6,-35],[5,-19],[0,-10],[-4,-19]]);
      shape('#ebefea',[[-3,-34],[4,-34],[3,-19],[0,-14],[-2,-19]]);box(mid,1,-33,2,14);
      box('#c4dad8',-25,-10,14,2);box('#c4dad8',10,-16,10,2);
    }else if(design===3){
      for(const side of [-1,1]){
        const points=[[side*28,-11],[side*19,-16],[side*17,-23],[side*10,-27],[side*13,-43],[side*9,-53]];
        for(let i=1;i<points.length;i++)stroke('#423626',...points[i-1],...points[i],5);
        for(let i=1;i<points.length;i++)stroke('#806646',...points[i-1],...points[i],2);
        blob('#385a43',side*14,-24,5,3);blob('#72956b',side*14-1,-25,4,2);
      }
      box('#44694d',-6,-57,12,3);box('#86a976',-4,-59,7,2);
      blob(dark,0,-31,6,3);box(accent,-1,-36,3,5);box(light,-2,-36,2,2);
    }
  }
  function drawRelicPillar(g,pal){
    const {box,blob,shape}=spriteKit(g,40,78);
    const crypt=pal==='crypt';
    const [trim,dark,mid,light]=crypt?['#272d36','#343b49','#565d6c','#8f98a1']:
      [masonry[pal].wall[0],...formats[pal].stone];
    blob('#14222660',2,1,9,4);
    box(trim,-8,-5,16,6);box(dark,-8,-5,16,1);box(mid,-7,-7,14,3);
    box(dark,-5,-28,10,22);box(mid,-4,-27,7,20);box(light,-3,-26,2,18);
    for(let y=-22;y<-8;y+=5)box(dark,-4,y,8,1);
    box(dark,-7,-29,14,4);box(light,-7,-30,14,1);
    const accent=gateStyles[pal][1];
    if(crypt||pal==='star'){
      shape(mid,[[-4,-30],[0,-36],[4,-30]]);box(accent,0,-33,1,3);
    }else if(pal==='root'||pal==='ruin'){
      box(mid,-5,-32,10,2);box(formats[pal].plant[1],-6,-33,9,2);box(formats[pal].plant[2],-5,-34,4,1);
    }else{
      box(mid,-5,-33,10,3);box(light,-5,-33,10,1);box(accent,-2,-32,4,2);
    }
  }
  const relicSprites=new Map();
  function paintRelic(c,a,o){
    const pal=a.r?.rooms?'crypt':a.r?.palette||'ruin',key=[pal,o.type,o.variant||0].join('/');
    let sprite=relicSprites.get(key);
    if(!sprite){
      sprite=makeCanvas(80,88);const g=sprite.getContext('2d');
      if(o.type==='gate')drawGate(g,pal);
      else if(o.type==='monument')drawRebirthMonument(g,pal,o.variant);
      else drawRelicPillar(g,pal);
      relicSprites.set(key,sprite);
    }
    c.drawImage(sprite,o.x-40,o.y-78);
  }
  // Posizione della fiamma rispetto alla base del lampione: [dx, dy, larghezza, altezza].
  function lampFlame(pal){
    const fam=familySprite(pal,'lamp',0);
    if(fam?.flame)return fam.flame;
    if(pal==='grass'||pal==='root')return [-1,-27,3,4];
    if(pal==='star'||pal==='fae')return [-1,-22,3,3];
    if(pal==='ruin')return [-1,-19,3,3];
    return [4,-18,3,3];
  }
  // Vetri degli edifici del pilota della Selva (sprite di Codex), per le finestre accese di notte.
  const selvaWindows=type=>type==='hall'?[{x:-18,y:-19,w:8,h:11},{x:10,y:-19,w:8,h:11}]:[{x:-15,y:-17,w:6,h:8},{x:8,y:-17,w:7,h:8}];
  function lightSources(){
    const a=current,lights=[],windows=[];
    if(!a)return null;
    if(a.r.rooms){
      // Bracieri, pezzi centrali delle tre sale e mosaico del patto; rune e intarsi come strato emissivo.
      for(const o of a.objects)if(o.type==='lamp')lights.push({x:o.x,y:o.y,kind:'fire',lift:32,core:[o.x-1,o.y-20,2,2,'#ffe3a0']});
      const [keys,names,last]=a.r.marks;
      lights.push({x:keys.x,y:keys.y,kind:'fire',lift:33,p:1},{x:names.x,y:names.y,kind:'spirit',lift:33,p:1},
        {x:last.x,y:last.y,kind:'spirit',lift:33},{x:226,y:578,kind:'lamp',lift:33,p:1});
      return {lights,windows,emissive:a.glow?{image:a.glow,alpha:.9}:null};
    }
    const pal=a.r.palette,glowKind=pal==='star'||pal==='fae'?'crystal':pal==='grass'||pal==='root'?'fire':'lamp',[dx,dy,fw,fh]=lampFlame(pal);
    for(const o of a.objects){
      if(o.type==='lamp')lights.push({x:o.x+dx+1,y:o.y,kind:glowKind,lift:14-dy,core:[o.x+dx,o.y+dy,fw,fh,glowKind==='crystal'?'#d8fbff':'#ffdf94']});
      else if(o.type==='crystal')lights.push({x:o.x,y:o.y,kind:'crystal',lift:24,p:2});
      else if(o.type==='monument')lights.push({x:o.x,y:o.y,kind:'spirit',lift:44,p:1});
      else if(o.type==='gate'&&pal!=='grass')lights.push({x:o.x,y:o.y,kind:pal==='star'||pal==='fae'?'crystal':'lamp',lift:pal==='star'?58:32,p:1});
      else if(o.type==='house'||o.type==='hall'){
        const list=a.selvaSprites?selvaWindows(o.type):a.sprites.get(o.type+'/'+o.variant)?.windows||[];
        list.forEach((q,i)=>windows.push({x:o.x+q.x,y:o.y+q.y,w:q.w,h:q.h,seed:Math.floor(hash(o.x+i*7,o.y,13)*100)}));
      }
    }
    // Portale del Santuario della Marea Muta in superficie, solo dopo la scoperta.
    const l=window.Game?.s?.legendary,e=l?.entrance;
    if(e&&l.discoveredAt!==null&&e.region===a.r.id)lights.push({x:e.x,y:e.y,kind:'spirit',lift:29});
    return {lights,windows};
  }
  const biomeOf=rid=>advanced[rid]?.rooms?'crypt':advanced[rid]?.palette;
  window.WorldLight?.provide(rid=>!!advanced[rid]&&current?.r.id===rid,lightSources,biomeOf,biomeOf);
  // Famiglie architettoniche per continente (city-families.js, fase 4 D): casa, bottega (seconda casa), sala, banchi,
  // pozzo e lampioni dei borghi con le impronte di sempre; senza il modulo resta il disegno precedente.
  // La Selva degli Alambicchi (tavolozza `fae`) resta il pilota di Codex con i suoi sprite, lampioni e pozzo compresi.
  const familySpec=(type,v)=>type==='hall'?{w:50,variant:v}:type==='house'?{w:40,stories:v===2?1:2,variant:v}:{variant:v};
  function familySprite(pal,type,v){
    const fam=pal!=='fae'&&['house','hall','stall','well','lamp'].includes(type)&&window.CityFamilies?.familyOf(pal);
    return fam?CityFamilies.render(fam[0],fam[1],type==='house'&&v===2?'workshop':type,familySpec(type,v)):null;
  }
  function paintBiomeSprite(c,a,o,t){
    const pal=a.r.palette,type=o.type;
    let key=null,draw=null;
    const fam=familySprite(pal,type,o.variant);
    if(fam){
      a.sprites.set(type==='lamp'?'lamp':type+'/'+o.variant,fam.image);
      c.drawImage(fam.image,o.x-fam.ax,o.y-fam.ay);
      if(type==='lamp'){
        const lit=Math.sin(t*4+o.x)>-.6,[dx,dy,fw,fh]=lampFlame(pal);
        const col=pal==='star'||pal==='fae'?['#9ff0ff','#e6ffff']:['#f2a046','#ffe3a0'];
        tile(c,col[0],o.x+dx,o.y+dy,fw,fh);if(lit)tile(c,col[1],o.x+dx+1,o.y+dy+(fh>3?1:0),1,2);
      }
      return true;
    }
    if(['leaf','pine','umbrella','palm','rock','shrub','stone'].includes(type)){
      const size=Math.floor(hash(o.x,o.y,7259)*3),v=o.variant%6;
      const kind=type==='shrub'||type==='stone'?type:pal==='star'&&type==='leaf'?'tree':'tree';
      key=type+'/'+v+'/'+size;draw=g=>drawTree(g,pal,kind,v,size);
    }else if(type==='crystal'){key='crystal/'+o.variant%4;draw=g=>drawCrystal(g,pal,o.variant%4);}
    else if(type==='house'||type==='hall'||type==='stall'||type==='well'){key=type+'/'+o.variant;draw=(g,wins)=>drawBuilding(g,pal,type,o.variant,wins);}
    else if(type==='lamp'){key='lamp';draw=g=>drawLampSprite(g,pal);}
    else if(type==='ruin'){key='ruin/'+o.variant;draw=g=>drawRuinSprite(g,pal,o.variant);}
    else if(type==='monument'){key='monument/'+o.variant;draw=g=>drawMonument(g,o.variant);}
    else if(type==='pillar'&&a.r.statue){const d=a.r.statue.design;key='pillar/'+d+'/'+(o.variant%2);draw=g=>drawPillar(g,d,o.variant%2);}
    else if(type==='gate'){key='gate';draw=g=>drawGateSprite(g,pal);}
    else return false;
    let image=a.sprites.get(key);
    if(!image){image=makeCanvas(80,88);image.windows=[];draw(image.getContext('2d'),image.windows);a.sprites.set(key,image);}
    c.drawImage(image,o.x-40,o.y-78);
    if(type==='lamp'){
      // Fiammella animata sopra lo sprite (ferma con effetti ridotti: t costante).
      const lit=Math.sin(t*4+o.x)>-.6,[dx,dy,fw,fh]=lampFlame(pal);
      const col=pal==='star'||pal==='fae'?['#9ff0ff','#e6ffff']:['#f2a046','#ffe3a0'];
      tile(c,col[0],o.x+dx,o.y+dy,fw,fh);if(lit)tile(c,col[1],o.x+dx+1,o.y+dy+(fh>3?1:0),1,2);
    }else if(type==='monument'&&o.variant===2&&Math.sin(t*3)>.05){tile(c,'#f5f0cf',o.x+15,o.y-68,1,4);tile(c,'#f5f0cf',o.x+13,o.y-67,5,1);
    }else if(type==='crystal'&&Math.sin(t*2+o.x)>.93){tile(c,'#ededd5',o.x+6,o.y-18,3,1);tile(c,'#ededd5',o.x+7,o.y-19,1,3);}
    return true;
  }
  function paint(c,a,o,t){
    // Integrazione: Cripta (pilastri e varco) e statue di Nordharyn e Azheryon da Codex; il resto da Claude.
    if(a.r?.rooms&&(o.type==='gate'||o.type==='pillar')){paintRelic(c,a,o);return;}
    if(a.r?.rooms&&o.type==='lamp'){paintCryptLamp(c,o,t);return;}
    if(o.type==='monument'&&(o.variant===1||o.variant===4)){paintRelic(c,a,o);return;}
    if(a.selvaSprites&&paintSelvaSprite(c,a,o))return;
    if(a.sprites&&paintBiomeSprite(c,a,o,t))return;
    const {x,y,variant:v,type}=o,p=a.palette,top=p.plant,stone=p.stone;
    const box=(col,dx,dy,bw,bh)=>tile(c,col,x+dx,y+dy,bw,bh);
    const shape=(col,pts)=>poly(c,col,pts.map(([dx,dy])=>[x+dx,y+dy]));
    const shade=(rw,rh)=>disc(c,'#182d3057',x+2,y,rw,rh);
    if(['house','hall','stall'].includes(type)){
      const k=type==='hall'?25:type==='stall'?18:20,yd=type==='stall'?15:25;
      shade(k,5);box(stone[0],-k,-yd,k*2,yd);box(p.track,-k+2,-yd+3,k*2-4,yd-5);
      box('#453d3c',-k+4,-yd+3,3,yd-5);box('#453d3c',k-8,-yd+3,3,yd-5);
      const roof=v===2?'#956758':p.roof;
      if(type==='stall'){
        shape(roof,[[-k-3,-19],[-k,-29],[k,-29],[k+3,-19]]);
        for(let j=-k;j<k;j+=8)box('#e4ce9c',j,-27,4,8);
        box('#765743',-k,-10,k*2,5);box('#d4a46c',-k+2,-10,k*2-4,2);
      }else{
        shape(stone[0],[[-k-4,-yd],[-k+5,-yd-21],[k-5,-yd-21],[k+4,-yd]]);
        shape(roof,[[-k-2,-yd-2],[-k+7,-yd-19],[k-7,-yd-19],[k+2,-yd-2]]);
        for(let j=4;j<20;j+=4){box('#2e414a65',-k+Math.ceil(j*.42),-yd-j,k*2-Math.ceil(j*.84),1);}
        box('#493f3d',-4,-14,8,14);box('#ad8b65',-3,-12,5,10);
        for(const xx of [-k+9,k-15]){box('#4a4e49',xx,-17,7,8);box('#f3c47f',xx+1,-16,4,6);}
      }
      return;
    }
    if(type==='lamp'||type==='well'||type==='ruin'){
      const tall=type==='ruin'?13+v*2:type==='lamp'?16:6;
      shade(type==='well'?11:5,3);box(stone[0],-5,-tall,10,tall);box(stone[1],-4,-tall,6,tall-1);box(stone[2],-6,-tall-3,12,3);
      if(type==='lamp'){box('#d9ae6a',-3,-12,6,5);if(Math.sin(t*4+x)>.2)box('#ffe5a1',-1,-11,3,3);}
      if(type==='well')box(p.water,-4,-5,8,3);
      return;
    }
    if(type==='crystal'){
      const tall=14+v*3,w=5+v%4,left=v%2===0;
      const hues=left?['#435f74','#729fa8','#bbe2d0']:['#524d7a','#9287ba','#d9bcdf'];
      shade(w+5,3);
      shape(hues[0],[[-w,0],[-w,-tall+9],[1,-tall-3],[w,-tall+7],[w,0]]);
      shape(hues[1],[[-w+2,-1],[-w+2,-tall+9],[0,-tall],[1,-1]]);
      shape(hues[2],[[0,-tall],[w-1,-tall+7],[0,-tall+11],[-w+2,-tall+9]]);
      if(v%3===1){box(hues[2],-1,-tall+7,1,9);}
      if(Math.sin(t*2+x)>.93){box('#ededd5',w+1,-tall,3,1);box('#ededd5',w+2,-tall-1,1,3);}
      return;
    }
    if(type==='stone'||type==='rock'){
      const tall=type==='crystal'?16+2*v:type==='rock'?12+v:6+v;
      shade(10+v,4);
      shape(stone[0],[[-11,0],[-8,-tall+5],[-3,-tall],[4,-tall+2],[10,-3],[7,1]]);
      shape(stone[1],[[-8,-3],[-7,-tall+4],[-3,-tall],[2,-tall+2],[6,-5],[0,-2]]);
      shape(stone[2],[[-7,-tall+4],[-3,-tall],[2,-tall+2],[-3,-tall+5]]);
      return;
    }
    const rx=type==='shrub'?8:13+v,ry=type==='shrub'?5:10+Math.floor(v/2),base=type==='shrub'?-5:-18-v;
    shade(11,4);box('#5a5144',-3,base+4,7,-base-4);box('#927959',-2,base+4,2,-base-4);
    if(type==='pine'){
      for(let i=0;i<3;i++){
        const by=-6-i*9,ex=rx-i*3;
        shape(top[0],[[-ex,by],[0,by-20],[ex,by],[5,by+4],[-8,by+3]]);
        shape(top[1],[[-ex+3,by-2],[0,by-18],[ex-3,by-1],[0,by+1]]);
        shape(top[2],[[-3,by-9],[0,by-15],[4,by-8],[1,by-6]]);
      }
    }else if(type==='palm'){
      for(let i=0;i<5;i++){
        const dx=(i-2)*8;
        shape(top[0],[[0,base],[dx,base-8],[dx+(i<2?-7:7),base-4],[dx,base],[0,base+3]]);
        shape(top[2],[[0,base-1],[dx,base-7],[dx+2,base-4],[0,base]]);
      }
    }else{
      disc(c,top[0],x,y+base,rx+2,ry+1);
      disc(c,top[1],x-2,y+base-3,rx,ry-1);
      disc(c,top[1],x+5,y+base+1,Math.max(4,rx-4),Math.max(3,ry-4));
      disc(c,top[2],x-5,y+base-5,Math.max(3,rx-7),Math.max(2,ry-5));
      for(let i=0;i<9;i++){const px=(i*17+v*7)%(rx*2)-rx,py=(i*7+v)%ry-ry/2;
        if(Math.abs(px)<rx-2)box(i%3?top[2]:top[0],px,base+py,1+i%3,1);}
    }
  }
  const valleyGateSprites=new Map();
  let id='valley',worldSeed=19425,current=null;
  const rendered=new Map();
  function setRegion(next,seed=worldSeed){
    if(!Object.hasOwn(regions,next))return false;
    const key=Number(seed)>>>0;
    if(key!==worldSeed){worldSeed=key;rendered.clear();}
    if(!advanced[next]){
      if(!original.setRegion(next,key))return false;
      id=next;current=null;return api;
    }
    if(!rendered.has(next)){
      rendered.set(next,makeArea(advanced[next],key));
      if(rendered.size>2)rendered.delete(rendered.keys().next().value);
    }else{
      const existing=rendered.get(next);rendered.delete(next);rendered.set(next,existing);
    }
    id=next;current=rendered.get(next);return api;
  }
  function canWalk(x,y,r=6){
    if(!current)return original.canWalk(x,y,r);
    if(current.r.rooms)return insideCrypt(current.r,x,y,r);
    if(x<r+8||y<r+8||x>w-r-8||y>h-r-8||shoreHit(current.r,x,y,r)||buildWater(x,y,r))return false;
    if(inZone(x,y,current.r.buildZone))return true;
    const cx=Math.floor(x/32),cy=Math.floor(y/32);
    for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){
      const row=current.cells.get(cx+i+(cy+j)*64);
      if(row?.some(o=>((x-o.x)/(r+o.radius))**2+((y-o.y+4)/(r+o.radius*.58))**2<1))return false;
    }
    return true;
  }
  function buildWater(x,y,r=6){
    const z=current?.r.buildZone;
    return !!z&&y+r>z.y&&y-r<z.y+z.h&&Math.abs(x-z.x-144)<6+r;
  }
  function drawGround(c,cam,t){
    if(!current)return original.drawGround(c,cam,t);
    const x=Math.floor(cam.x),y=Math.floor(cam.y),cw=Math.min(w-x,cam.w+1),ch=Math.min(h-y,cam.h+1);
    if(cw>0&&ch>0)c.drawImage(current.image,x,y,cw,ch,x,y,cw,ch);
  }
  function drawFront(c,cam,t,actors=[]){
    if(!current){
      if(id!=='valley')return original.drawFront(c,cam,t,actors);
      const a={palette:formats.ruin,r:{palette:'ruin'},sprites:valleyGateSprites};
      const gate={...ValleyTrail,type:'gate'};
      return original.drawFront(c,cam,t,actors.concat({x:gate.x,y:gate.y,draw:g=>paint(g,a,gate,t)}));
    }
    const p=actors[0];
    const near=o=>o.x>=cam.x-90&&o.x<=cam.x+cam.w+90&&o.y>=cam.y-25&&o.y<=cam.y+cam.h+90;
    for(const o of current.objects.concat(actors).filter(near).sort((a,b)=>a.y-b.y)){
      if(o.draw){o.draw(c);continue;}
      const canopy=!!current.sprites&&(o.type==='leaf'||o.type==='pine'||o.type==='umbrella'||o.type==='palm');
      const fade=o.radius&&p&&Math.abs(p.x-o.x)<o.radius+(canopy?18:9)&&p.y<o.y&&p.y>o.y-(canopy?55:40);
      if(fade){c.save();c.globalAlpha=.52;}
      paint(c,current,o,t);
      if(fade)c.restore();
    }
  }
  function drawMap(c,width,height,p){
    if(!current)return original.drawMap(c,width,height,p);
    c.drawImage(current.chart,0,0,width,height);
    if(p){const x=p.x/w*width,y=p.y/h*height;poly(c,'#f9edca',[[x,y-3],[x+3,y],[x,y+3],[x-3,y]]);}
  }
  const travelRoutes=new Map();
  function route(from,to,stage=5){
    if(from===to||!regions[from]||!regions[to])return null;
    const key=[from,to,stage].join('/');
    if(travelRoutes.has(key))return travelRoutes.get(key);
    const queue=[[from,null]],seen=new Set([from]);
    for(let i=0;i<queue.length;i++){
      const [region,first]=queue[i];
      for(const g of regions[region].points.gates||[]){
        if(seen.has(g.to)||(g.minStage||0)>stage)continue;
        if(g.to===to){const result=first||g;travelRoutes.set(key,result);return result;}
        seen.add(g.to);queue.push([g.to,first||g]);
      }
    }
    travelRoutes.set(key,null);return null;
  }
  const api={regions,continents,route,init(seed=19425){return setRegion('valley',seed);},setRegion,canWalk,buildWater,drawGround,drawFront,drawMap,
    get region(){return id;},get width(){return regions[id].width;},get height(){return regions[id].height;},
    get points(){return regions[id].points;},get landmarks(){return regions[id].landmarks;},get spawn(){return regions[id].spawn;}
  };
  window.World=api;
})();

