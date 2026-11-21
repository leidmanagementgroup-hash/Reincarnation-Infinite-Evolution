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
  function insideCrypt(r,x,y,margin){
    return r.rooms.some(([a,b,rw,rh])=>x>=a+margin&&x<=a+rw-margin&&y>=b+margin&&y<=b+rh-margin);
  }
  function makeCrypt(r,seed){
    const image=makeCanvas(w,h),c=image.getContext('2d'),objects=[],palette=formats.star;
    tile(c,'#142329',0,0,w,h);
    for(const [x,y,rw,rh] of r.rooms){tile(c,'#333c43',x-4,y-7,rw+8,rh+13);tile(c,'#575f62',x,y,rw,rh);}
    for(let y=104;y<638;y+=12)for(let x=84;x<1192;x+=16){
      if(!insideCrypt(r,x+8,y+6,8))continue;
      const q=hash(x,y,seed);
      tile(c,q<.13?'#606963':q<.56?'#6c7470':'#758079',x,y,15,11);
      tile(c,'#8a8e7e77',x+1,y,7+q*7,1);
      if(q>.96)tile(c,'#b0a98b',x+4,y+4,2,2);
    }
    for(const pt of r.marks){
      disc(c,'#515d5c',pt.x,pt.y,29,21);disc(c,'#798780',pt.x,pt.y,25,18);
      for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
        tile(c,'#bfaa7b',pt.x+Math.cos(angle)*16-2,pt.y+Math.sin(angle)*11-2,4,4);
      }
      objects.push({x:pt.x-30,y:pt.y+5,type:'pillar',variant:0,radius:0},{x:pt.x+30,y:pt.y+5,type:'pillar',variant:0,radius:0});
    }
    for(const [x,y] of [[192,485],[509,539],[722,464],[594,303],[789,219],[990,201],[1137,310]])objects.push({x,y,type:'lamp',variant:0,radius:0});
    for(const g of r.points.gates)objects.push({...g,type:'gate',variant:0,radius:0});
    const chart=makeCanvas(324,204);chart.getContext('2d').drawImage(image,0,0,324,204);
    return {r,palette,image,objects,cells:new Map(),chart};
  }
  function makeArea(r,seed){
    if(r.rooms)return makeCrypt(r,seed);
    const palette=formats[r.palette],rnd=random(seed+Array.from(r.id).reduce((n,ch)=>n+ch.charCodeAt(0)*137,0));
    const image=makeCanvas(w,h),c=image.getContext('2d'),objects=[],roads=pathPoints(r);
    for(let y=0;y<h;y+=4)for(let x=0;x<w;x+=4){
      const a=Math.floor(x/76),b=Math.floor(y/76),u=x/76-a,v=y/76-b;
      const h1=hash(a,b,seed)*(1-u)*(1-v)+hash(a+1,b,seed)*u*(1-v)+hash(a,b+1,seed)*(1-u)*v+hash(a+1,b+1,seed)*u*v;
      const h2=hash(x/4,y/4,seed);
      tile(c,palette.grounds[Math.floor((h1*.72+h2*.28)*4)],x,y,4,4);
    }
    for(const [x,y,rx,ry] of coastLines[r.palette]){
      disc(c,palette.edge,x,y,rx+7,ry+6);disc(c,palette.water,x,y,rx,ry);
      for(let i=0;i<160;i++){
        const a=x+(rnd()*2-1)*rx,b=y+(rnd()*2-1)*ry;
        if(shoreHit(r,a,b,-3))tile(c,i%4?'#91b5ad55':'#cfddd475',a,b,2+rnd()*10,1);
      }
    }
    paintRoad(c,r,palette,roads);
    const z=r.buildZone;
    tile(c,palette.edge,z.x+135,z.y,18,z.h);
    tile(c,palette.water,z.x+138,z.y,12,z.h);
    for(let y=z.y+4;y<z.y+z.h;y+=11)tile(c,'#a8c6ba70',z.x+140,y,6,1);
    for(let i=0;i<21000;i++){
      const x=rnd()*w,y=rnd()*h;if(shoreHit(r,x,y))continue;
      const a=rnd();
      tile(c,a>.94?'#e4dfba91':a>.48?'#f1e4af25':'#253f3f26',x,y,1+rnd()*4,1+(rnd()<.13?1:0));
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
      disc(c,palette.edge,s.x,s.y+7,51,33);disc(c,palette.stone[1],s.x,s.y+7,46,28);disc(c,palette.stone[0],s.x,s.y+7,39,23);
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
    const area={r,palette,image,objects,cells,chart:null},mini=makeCanvas(324,204),m=mini.getContext('2d');
    m.drawImage(image,0,0,324,204);
    m.save();m.scale(.25,.25);
    for(const o of objects)paint(m,area,o,0);
    m.restore();area.chart=mini;
    return area;
  }
  function paint(c,a,o,t){
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
    if(type==='gate'){
      shade(18,6);box(stone[0],-17,-23,34,24);box(stone[1],-15,-25,30,24);box(stone[2],-11,-28,22,4);
      box('#22333e',-10,-14,20,14);box('#22333e',-7,-18,14,4);box('#f3ce8e',-14,-14,2,4);box('#f3ce8e',12,-14,2,4);
      return;
    }
    if(type==='monument'){
      shade(28,7);box(stone[0],-26,-9,52,10);box(stone[1],-24,-12,48,5);box(stone[2],-21,-13,42,2);
      if(v===4){
        shape(stone[0],[[-37,-12],[-27,-58],[27,-58],[39,-12]]);
        shape(stone[1],[[-33,-15],[-24,-55],[23,-55],[34,-15]]);
        for(let j=0;j<7;j++)box(stone[0],-27+j*7,-48+(j%2)*13,9,2);
      }
      shape(stone[1],[[-13,-14],[-7,-42],[7,-42],[14,-14]]);box(stone[2],-6,-43,12,8);box(stone[2],-5,-51,10,9);
      box(stone[0],-2,-50,9,9);
      if(v===1){box(stone[0],13,-60,4,44);box(stone[2],14,-60,2,41);box(stone[2],8,-40,14,3);}
      if(v===2){
        box(stone[2],-5,-51,10,9);
        shape('#477c87',[[-19,-20],[-24,-43],[-29,-29],[-25,-15]]);
        shape('#b7ebe0',[[-24,-42],[-24,-24],[-28,-28]]);
        shape('#8c81bb',[[17,-17],[23,-48],[29,-31],[24,-14]]);
        shape('#d5b8e3',[[23,-47],[24,-29],[28,-32]]);
        box('#c4e5d7',-1,-33,3,8);
        if(Math.sin(t*3)>.05){box('#f5f0cf',-19,-51,1,4);box('#f5f0cf',-21,-50,5,1);}
      }
      if(v===3)for(const n of [-1,1])shape(top[1],[[n*26,-11],[n*19,-27],[n*14,-22],[n*11,-42],[n*8,-21],[n*14,-15]]);
      box(v===4?'#e8ae74':'#9dc6b5',-1,-30,3,4);return;
    }
    if(type==='lamp'||type==='pillar'||type==='well'||type==='ruin'){
      const tall=type==='pillar'?22:type==='ruin'?13+v*2:type==='lamp'?16:6;
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
      const a={palette:formats.ruin};
      const gate={...ValleyTrail,type:'gate'};
      return original.drawFront(c,cam,t,actors.concat({x:gate.x,y:gate.y,draw:g=>paint(g,a,gate,t)}));
    }
    const p=actors[0];
    const near=o=>o.x>=cam.x-90&&o.x<=cam.x+cam.w+90&&o.y>=cam.y-25&&o.y<=cam.y+cam.h+90;
    for(const o of current.objects.concat(actors).filter(near).sort((a,b)=>a.y-b.y)){
      if(o.draw){o.draw(c);continue;}
      const fade=o.radius&&p&&Math.abs(p.x-o.x)<o.radius+9&&p.y<o.y&&p.y>o.y-40;
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

