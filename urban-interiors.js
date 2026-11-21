/* Walkable pixel-art interiors. The town router owns entrances, saving and service actions. */
(() => {
  'use strict';

  const cell=24, columns=32, rows=23;
  const width=columns*cell, height=rows*cell;
  const center={x:384,y:468}, exit={id:'exit',x:384,y:493,text:'Esci in città',range:26};

  const plans={
    inn:{
      name:'Locanda del Focolare', floor:'wood', colors:['#30282f','#7c5848','#987054','#a87d58','#bd9268','#724d42','#e9bf88','#9c6267'],
      rooms:[[2,2,7,4],[10,2,5,4],[17,2,5,4],[24,2,6,4],[5,6,2,2],[11,6,2,2],[18,6,2,2],[26,6,2,2],[2,7,28,2],[2,9,28,12]],
      furniture:[
        ['window',128,52],['window',296,52],['window',466,52],['window',641,52],
        ['bed',97,110,0],['bed',269,111,1],['bed',430,114,2],['bed',596,113,3],
        ['chest',196,103],['plant',222,189],['wardrobe',338,107],['plant',502,112],['chest',680,110],
        ['lamp',302,184],['lamp',479,184],['lamp',682,186],['hearth',117,301],['lamp',98,323],
        ['table',245,354,0],['table',293,427,1],['table',527,349,2],['bench',491,424],
        ['stove',659,280],['shelf',707,251,1],['fountain',668,361],['crate',701,438]
      ],
      carpets:[[77,116,111,21,1],[267,116,72,21,2],[434,118,70,19,3],[583,120,100,17,0],[354,218,60,130,1],[354,438,60,59,0],[191,324,110,58,3],[473,317,106,62,2]],
      services:[
        ['inn-bed',139,121,'Riposati nella camera del focolare'],
        ['inn-kitchen',626,326,'Prepara un pasto in cucina'],
        ['inn-water',668,389,'Riempi la borraccia alla fonte'],
        ['inn-breakfast',535,310,'Chiedi la colazione'],
        ['inn-cache',194,121,'Esamina il forziere della camera']
      ],
      npcs:[['keeper','Locandiera','elf',521,272]],
      marks:[['Stanze degli ospiti',139,121],['Corridoio delle camere',382,194],['Sala del focolare',130,340],['Cucina',626,326],['Fonte',668,389],['Uscita',384,493]]
    },
    shop:{
      name:'Emporio di Velaris',floor:'wood',colors:['#2e2833','#6f4f59','#856061','#9e706e','#b98376','#604451','#eab5a1','#60869a'],
      rooms:[[2,2,6,3],[23,2,7,3],[2,5,28,11],[4,4,3,2],[24,4,3,2],[10,16,12,5]],
      furniture:[
        ['window',119,52],['window',646,52],['shelf',99,85,1],['crate',155,100],['shelf',652,89,1],['crate',697,97],
        ['lamp',222,139],['lamp',524,137],['shelf',121,178,0],['shelf',651,178,1],['shelf',607,176,0],
        ['counter',384,215],['display',165,277,0],['display',600,271,1],
        ['plant',92,319],['crate',659,337],['bench',177,358],['bench',592,355]
      ],
      carpets:[[337,246,93,108,2],[263,360,241,63,1],[343,443,82,54,2]],
      services:[['shop',384,253,'Commercia al banco dell’emporio']],
      npcs:[['merchant','Mercante','goblin',384,180]],
      marks:[['Banco dell’emporio',384,253],['Magazzino delle provviste',112,108],['Scaffali del mercato',649,205],['Uscita',384,493]]
    },
    forge:{
      name:'Forgia delle Due Braci',floor:'stone',colors:['#24252b','#584746','#675453','#74615e','#8a7063','#553e3e','#dca47b','#a1684d'],
      rooms:[[2,3,28,14],[10,17,12,4]],
      furniture:[
        ['window',167,79],['window',313,79],['furnace',616,177],['lamp',658,213],['barrel',704,189],
        ['shelf',96,170,1],['workbench',152,216],['crate',118,265],['bellows',536,200],
        ['anvil',416,249],['anvil',558,276],['tray',672,289],['lamp',260,170],
        ['barrel',108,333],['ore',151,351],['display',597,355,1],['bench',537,393]
      ],
      carpets:[[333,313,131,90,0],[353,441,62,57,2]],
      services:[['forge',416,288,'Forgia, ripara e lavora al banco']],
      npcs:[['smith','Fabbra','orc',361,234]],
      marks:[['Incudine di servizio',416,288],['Fornace',616,206],['Banco dei materiali',156,250],['Uscita',384,493]]
    },
    guild:{
      name:'Sede della Gilda di Velaris',floor:'stone', colors:['#272c3c','#565867','#686877','#777788','#9091a3','#535469','#e2d3ac','#5e8592'],
      rooms:[[3,3,7,3],[12,2,8,5],[22,3,7,3],[6,6,2,2],[24,6,2,2],[2,7,28,10],[11,17,10,4]],
      furniture:[
        ['window',177,79],['window',384,55],['window',613,79],
        ['shelf',107,115,0],['chest',205,115],['crest',384,134],['bench',593,120],
        ['board',384,214],['lamp',457,208],['lamp',310,210],
        ['target',115,241],['dummy',157,276],['target',204,241],['rack',78,312],
        ['table',585,288,2],['table',629,367,0],['bench',547,350],
        ['shelf',693,244,0],['plant',674,402],['lamp',277,405],['lamp',489,402]
      ],
      carpets:[[317,201,134,231,2],[90,213,142,143,1],[544,249,89,84,3],[355,438,58,56,2]],
      services:[['guild',384,248,'Consulta la bacheca della gilda'],['guild-training',134,319,'Allenati nella sala della gilda'],['guild-lounge',599,321,'Raggiungi il salone degli avventurieri']],
      npcs:[['clerk','Maestra di gilda','elf',429,211]],
      marks:[['Bacheca pubblica',384,248],['Sala d’allenamento',134,319],['Salone',599,321],['Uscita',384,493]]
    },
    archive:{
      name:'Archivio di Velaris',floor:'wood',colors:['#242536','#665067','#806376','#957681','#ae888c','#5c4563','#e8c7b8','#7e7bb5'],
      rooms:[[2,2,28,15],[11,17,10,4]],
      furniture:[
        ['window',101,53],['window',230,53],['window',384,53],['window',530,53],['window',665,53],
        ['shelf',99,118,0],['shelf',188,118,0],['shelf',279,118,0],['shelf',491,118,0],['shelf',576,118,0],['shelf',663,118,0],
        ['shelf',104,214,0],['shelf',192,214,0],['shelf',283,259,0],['shelf',486,257,0],['shelf',579,214,0],['shelf',662,214,0],
        ['lectern',384,182],['lamp',338,175],['lamp',437,175],['table',237,342,1],['table',541,341,1],
        ['plant',125,338],['plant',642,340],['lamp',306,373],['lamp',463,373]
      ],
      carpets:[[335,153,99,232,3],[355,434,59,60,1],[171,310,120,66,2],[481,309,118,66,0]],
      services:[['archive',384,215,'Studia il registro delle arti e delle stirpi'],['archive-reading',541,371,'Consulta il tavolo di lettura']],
      npcs:[['archivist','Archivista','elf',420,194]],
      marks:[['Leggio dell’archivio',384,215],['Ala dei codici',197,167],['Tavoli di lettura',541,371],['Uscita',384,493]]
    },
    academy:{
      name:'Accademia delle Quattro Arti',floor:'tile',colors:['#262739','#54516d','#6d6785','#807991','#9990a6','#5b526e','#e9dcbb','#6d9cb2'],
      rooms:[[2,2,28,15],[11,17,10,4]],
      furniture:[
        ['window',102,53],['window',237,53],['window',384,53],['window',536,53],['window',665,53],
        ['shelf',111,126,0],['shelf',232,126,0],['lectern',384,206],['lamp',335,198],['lamp',433,198],
        ['bench',239,234],['bench',239,282],['bench',239,330],['bench',534,232],['bench',535,280],['bench',535,329],
        ['rune',666,241],['rune',665,320],['chest',113,326],['plant',106,234],['lamp',463,391],['lamp',305,391]
      ],
      carpets:[[331,181,107,230,2],[355,429,58,65,1],[605,207,93,146,0]],
      services:[['academy',384,250,'Consulta il maestro dell’accademia'],['academy-study',650,356,'Osserva i glifi di esercitazione']],
      npcs:[['professor','Maestra','elf',420,225]],
      marks:[['Aula delle arti',384,250],['Grimori',201,147],['Glifi di esercitazione',650,356],['Uscita',384,493]]
    },
    house:{
      name:'Casa di Velaris',floor:'wood',colors:['#272d2d','#596056','#777466','#8f8269','#a59376','#626752','#ddc293','#758987'],
      rooms:[[5,3,7,4],[18,3,9,4],[6,7,3,4],[21,7,3,4],[4,10,24,9],[10,18,12,3]],
      furniture:[
        ['window',185,79],['window',533,78],['bed',176,132,1],['wardrobe',263,128],['chest',592,135],
        ['table',525,149,1],['plant',625,133],['lamp',217,149],
        ['hearth',559,295],['table',295,333,0],['shelf',156,289,0],['bench',458,354],
        ['lamp',110,379],['chest',635,401],['plant',122,427],['lamp',509,405]
      ],
      carpets:[[126,148,144,18,2],[252,297,89,76,1],[448,329,115,45,3],[353,429,63,68,2]],
      services:[['house-bed',150,148,'Riposa nella stanza privata'],['house-cache',607,405,'Esamina il cassone']],
      npcs:[],
      marks:[['Camera da letto',150,148],['Sala privata',529,166],['Soggiorno',342,380],['Uscita',384,493]]
    },
    greenhouse:{
      name:'Serra delle Talee',floor:'stone',colors:['#233538','#435f52','#5c7560','#65836b','#84947a','#49635e','#d6d0a3','#94b8a9'],
      rooms:[[3,3,10,6],[19,3,10,6],[11,5,10,6],[4,9,24,9],[11,17,10,4]],
      furniture:[
        ['glasswall',147,76],['glasswall',250,76],['glasswall',517,76],['glasswall',620,76],
        ['plant',110,135],['nursery',182,151,1],['plant',249,162],['nursery',523,147,2],['plant',603,142],
        ['fountain',384,165],['lamp',332,172],['lamp',436,172],
        ['nursery',159,276,2],['nursery',239,276,1],['shelf',114,352],['plant',280,322],
        ['nursery',384,295],['barrel',476,297],['table',569,255,2],
        ['nursery',586,344,2],['plant',654,339],['bench',530,406],['crate',622,406],
        ['lamp',280,398],['lamp',488,398]
      ],
      carpets:[[126,254,146,54,3],[533,318,121,66,3]],
      services:[['greenhouse-bed',384,326,'Coltiva l’aiuola comune']],
      npcs:[['gardener','Custode della serra','dryad',465,241]],
      marks:[['Vasche delle talee',198,205],['Cisterna',384,195],['Aiuola comune',384,326],['Uscita',384,493]]
    }
  };
  const point=(x,y)=>({x,y});
  const sitesFor=spec=>[...spec.services.map(([id,x,y,text])=>({id,x,y,text,range:28})),exit]
    .map(site=>({...site,kind:'urban-interior',point:point(site.x,site.y)}));
  const byKind=Object.fromEntries(Object.entries(plans).map(([kind,spec])=>{
    const sites=sitesFor(spec);
    const npcLocations=spec.npcs.map(([id,name,race,x,y])=>({id,name,race,x,y,point:point(x,y),dir:'down'}));
    return [kind,{id:'city-velaris-'+kind,kind,name:spec.name,description:'Interno di '+spec.name,continent:'continent-3',
      width,height,indoor:true,ambience:{inn:'hearth',shop:'market',forge:'forge',guild:'hall',archive:'quiet',academy:'runes',house:'hearth',greenhouse:'quiet'}[kind],
      spawn:{...center},points:{gates:[],mobs:[],resources:[],bosses:[]},
      sites,npcLocations,landmarks:spec.marks.map(([name,x,y])=>({name,x,y}))}];
  }));
  const cache=new Map();
  const asKind=id=>typeof id==='string'?id.replace(/^city-velaris-/,''):'';
  const get=kind=>Object.hasOwn(byKind,asKind(kind))?byKind[asKind(kind)]:null;

  const feet={
    bed:[34,18],chest:[25,13],wardrobe:[28,16],table:[63,34],bench:[49,12],
    shelf:[55,14],hearth:[56,19],stove:[48,19],fountain:[35,22],counter:[120,20],
    display:[41,22],crate:[20,14],barrel:[19,17],furnace:[70,26],workbench:[63,19],
    anvil:[39,17],bellows:[22,16],ore:[36,15],target:[20,14],
    dummy:[19,13],rack:[43,12],lectern:[34,16],board:[63,12],plant:[14,13],tray:[36,16],nursery:[57,17]
  };
  const lightTypes=new Set(['lamp','hearth','furnace','stove','window','rune']);
  const trim=['#e8a882','#b6a5d0','#edcca7','#a5d4d2'];
  const fabric=['#a45f64','#547f89','#74648c','#88704d'];
  const ink='#312931',shade='#221c2b64';
  const decorPalette=['#b1b6be','#bb8c70','#7a9a9a','#a9a373','#cca577','#a489a7'];
  const sparklePalette=['#fff2bc','#dce8e5','#f4b47e'];
  const own=(o,k)=>Object.hasOwn(o,k);
  const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function rectangle(c,col,x,y,w,h){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function poly(c,color,path){
    c.fillStyle=color;c.beginPath();
    path.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
    c.closePath();c.fill();
  }
  function disc(c,color,x,y,rx,ry){
    for(let dy=-ry;dy<=ry;dy++){
      const dx=Math.floor(rx*Math.sqrt(Math.max(0,1-(dy/ry)**2)));
      rectangle(c,color,x-dx,y+dy,2*dx+1,1);
    }
  }
  function noise(x,y,salt){
    let h=Math.imul((x+842313)^salt,0x85ebca6b)^Math.imul(y+133583,0xc2b2ae35);
    h=Math.imul(h^(h>>>15),0x5e50a535);
    return ((h^(h>>>16))>>>0)/4294967296;
  }
  function floorMask(spec){
    const floor=new Uint8Array(columns*rows);
    for(const [x,y,w,h] of spec.rooms){
      for(let j=y;j<y+h;j++)floor.fill(1,j*columns+x,j*columns+x+w);
    }
    return floor;
  }
  function cellAt(floor,x,y){return x>=0&&x<columns&&y>=0&&y<rows&&floor[x+y*columns]===1;}
  function drawFloorCell(c,spec,seed,gx,gy){
    const [,wall,deep,floor,lit,,,extra]=spec.colors;
    const x=gx*cell,y=gy*cell;
    if(spec.floor==='wood'){
      for(let i=0;i<3;i++){
        const k=i+3*gy,q=noise(gx,k,seed),t=y+i*8;
        rectangle(c,q>.69?lit:q<.23?deep:floor,x,t,cell,8);
        rectangle(c,'#51374239',x,t+7,cell,1);
        const seam=(16+(k%3)*7+gx*11)%cell;
        rectangle(c,'#4a353955',x+seam,t+1,1,6);
        rectangle(c,'#efd3a050',x+((seam+7)%15),t+2,6+q*2,1);
        if(q>.48)rectangle(c,'#533d4558',x+((seam+11)%20),t+5,3,1);
      }
    }else{
      for(let i=0;i<2;i++)for(let j=0;j<2;j++){
        const q=noise(gx*2+i,gy*2+j,seed),ax=x+i*12,ay=y+j*12;
        rectangle(c,q>.75?lit:q<.18?deep:floor,ax,ay,12,12);
        rectangle(c,wall,ax,ay+11,12,1);rectangle(c,wall,ax+11,ay,1,11);
        if(q>.45)rectangle(c,'#f5edda35',ax+2,ay+3,4,1);
        if(q<.34)rectangle(c,'#3d374346',ax+5,ay+8,4,1);
        if(spec.floor==='tile'&&(gx+gy+i+j)%4===0){
          rectangle(c,extra,ax+3,ay+5,5,1);rectangle(c,extra,ax+5,ay+3,1,5);
        }
      }
    }
  }
  function rise(c,spec,floor,gx,gy){
    const [voidCol,wall,deep,,,edge,lit,accent]=spec.colors;
    const x=gx*cell,y=gy*cell;
    if(!cellAt(floor,gx,gy-1)){
      rectangle(c,ink,x-2,y-20,cell+4,21);
      rectangle(c,wall,x,y-18,cell,19);
      rectangle(c,deep,x,y-15,cell,11);
      rectangle(c,edge,x,y-18,cell,3);
      rectangle(c,lit,x,y-20,cell,2);
      rectangle(c,ink,x,y-4,cell,2);
      rectangle(c,edge,x,y-2,cell,3);
      rectangle(c,'#2a212f3c',x,y+1,cell,4);
      rectangle(c,'#f8d4ad33',x+3,y-14,13,1);
      if(gx%3===1)rectangle(c,accent,x+19,y-14,3,9);
    }
    if(!cellAt(floor,gx-1,gy)){
      rectangle(c,voidCol,x-11,y-1,13,cell+2);
      rectangle(c,edge,x-10,y,10,cell);
      rectangle(c,deep,x-7,y,5,cell);
      rectangle(c,'#38303d4a',x,y,3,cell);
      rectangle(c,lit,x-11,y,2,cell);
    }
    if(!cellAt(floor,gx+1,gy)){
      rectangle(c,voidCol,x+cell-1,y-1,13,cell+2);
      rectangle(c,edge,x+cell,y,10,cell);
      rectangle(c,deep,x+cell+2,y,5,cell);
      rectangle(c,'#38303d4a',x+cell-3,y,3,cell);
      rectangle(c,lit,x+cell+9,y,2,cell);
    }
    if(!cellAt(floor,gx,gy+1)){
      rectangle(c,ink,x-1,y+cell,cell+2,9);
      rectangle(c,deep,x,y+cell,cell,3);
      rectangle(c,edge,x,y+cell+3,cell,4);
      rectangle(c,'#c0a58670',x,y+cell,cell,1);
    }
  }
  function rug(c,x,y,w,h,index,floor){
    if(!cellAt(floor,Math.floor((x+w/2)/cell),Math.floor((y+h/2)/cell)))return;
    const body=fabric[index%fabric.length],grit=trim[index%trim.length];
    rectangle(c,shade,x-2,y-1,w+4,h+5);
    rectangle(c,ink,x,y,w,h);rectangle(c,body,x+2,y+2,w-4,h-4);
    rectangle(c,grit,x+5,y+4,w-10,1);rectangle(c,grit,x+5,y+h-5,w-10,1);
    for(let px=8;px<w-6;px+=10){
      rectangle(c,grit,x+px,y+6,2,2);rectangle(c,grit,x+px,y+h-8,2,2);
    }
    if(h>=36&&w>=43){
      const cx=Math.floor(x+w/2),cy=Math.floor(y+h/2);
      poly(c,grit,[[cx-15,cy],[cx,cy-8],[cx+15,cy],[cx,cy+8]]);
      poly(c,body,[[cx-10,cy],[cx,cy-5],[cx+10,cy],[cx,cy+5]]);
      rectangle(c,grit,cx-3,cy-1,7,3);
    }
  }
  function groundOf(spec,floor,seed){
    const tile=canvas(width,height),g=tile.getContext('2d');
    rectangle(g,spec.colors[0],0,0,width,height);
    for(let y=0;y<height;y+=4)for(let x=0;x<width;x+=4){
      if(noise(x,y,seed)>.89&&noise(x-2,y+1,seed)>.45)rectangle(g,'#12162228',x,y,2,2);
    }
    for(let y=0;y<rows;y++)for(let x=0;x<columns;x++)if(cellAt(floor,x,y))drawFloorCell(g,spec,seed,x,y);
    for(let y=0;y<rows;y++)for(let x=0;x<columns;x++)if(cellAt(floor,x,y))rise(g,spec,floor,x,y);
    for(const [x,y,w,h,i] of spec.carpets)rug(g,x,y,w,h,i,floor);
    rectangle(g,ink,363,500,42,9);rectangle(g,spec.colors[5],364,501,40,5);
    for(let x=365;x<404;x+=4)rectangle(g,spec.colors[6],x,502,2,1);
    return tile;
  }
  function drawObject(c,type,colors,variant,seed){
    const [,wall,stone,wood,woodLight,dark,bright,accent]=colors;
    const i=variant||0;
    const box=(col,x,y,w,h)=>rectangle(c,col,x,y,w,h);
    if(type==='glasswall'){
      box(ink,-48,-38,96,39);box('#567979',-46,-36,92,34);
      for(let x=-44;x<45;x+=15){
        box('#96bbb0',x,-34,12,29);box('#c3d4ba',x+2,-30,3,13);
        box('#678d87',x+7,-13,4,7);box('#86795b',x+12,-36,2,35);
      }
      box('#546961',-46,-20,92,2);box('#b4a471',-48,-3,96,3);
      return;
    }
    if(type==='nursery'){
      box(ink,-30,-13,60,17);box('#997958',-28,-12,56,13);box('#4a4439',-25,-10,50,7);
      for(let x=-21;x<=21;x+=7){
        box('#796950',x,-7,4,1);
        if(i){box('#3b6851',x,-14,2,9);box('#89aa69',x-3,-13,4,3);box('#618766',x+2,-16,3,3);}
        if(i===2)box('#dca880',x,-17,3,2);
      }
      box('#bf9d72',-28,-2,56,2);return;
    }
    const shadow=(rx,ry=5)=>disc(c,shade,1,2,rx,ry);

    if(type==='window'){
      box(ink,-13,-20,26,23);box(dark,-12,-20,24,23);
      box('#98babb',-9,-17,18,16);box('#587589',-9,-16,18,11);
      box('#cde2d5',-8,-16,6,4);box(accent,1,-13,7,5);
      box(bright,-1,-18,2,20);box(bright,-10,-8,20,2);box(bright,-14,2,28,3);
      return;
    }
    if(type==='lamp'){
      shadow(6,3);box(ink,-2,-16,4,18);box(dark,-5,-2,10,3);
      box(accent,-4,-29,8,13);box('#e8bf72',-3,-27,6,8);
      box('#f8e4a3',-1,-26,2,5);box(bright,-5,-30,10,2);
      box(dark,0,-28,1,11);return;
    }
    if(type==='bed'){
      shadow(22,6);box(ink,-18,-47,37,49);box(dark,-17,-47,35,47);
      box(woodLight,-15,-47,31,5);box(wall,-16,-2,32,4);
      box('#d2c5b1',-15,-41,31,35);box('#f4e1c2',-13,-40,27,9);
      box('#bbaa9e',-14,-31,29,2);box(fabric[i%4],-14,-27,29,21);
      box(trim[i%4],-14,-15,29,2);box(trim[i%4],-14,-10,29,1);
      for(let j=0;j<4;j++)box('#f7e0ad70',-12+j*8,-24,1,7);
      box(bright,-17,-47,2,47);return;
    }
    if(type==='hearth'||type==='stove'||type==='furnace'){
      const big=type==='furnace',r=big?33:type==='hearth'?27:23,top=big?53:40;
      shadow(r+5,7);box(ink,-r-2,-top,r*2+5,top+4);
      box(stone,-r,-top,r*2+1,top);box(wall,-r,-top,r*2+1,4);
      for(let y=-top+8;y<-7;y+=7){
        box(dark,-r,y,r*2+1,1);
        for(let x=-r+(y%2===0?6:12);x<r;x+=13)box(dark,x,y,1,6);
      }
      const lip=big?16:13,mouth=big?28:21;
      poly(c,ink,[[-lip-3,0],[-lip-3,-mouth+7],[-lip+2,-mouth],[lip-2,-mouth],[lip+3,-mouth+7],[lip+3,0]]);
      box('#65424a',-lip-3,-2,lip*2+7,3);box('#a96353',-lip,-5,lip*2+1,3);
      box('#df8757',-lip+2,-5,lip*2-3,1);
      box(bright,-r+2,-top+1,15,1);box(ink,-r+6,1,r*2-12,3);
      if(big){box(woodLight,-10,-62,20,9);box(dark,-7,-61,14,5);}
      if(type==='stove'){box(accent,-r+3,-top-2,2*r-6,3);box(ink,6,-top-5,6,5);}
      return;
    }
    if(type==='table'||type==='display'||type==='counter'||type==='workbench'){
      const hw=type==='counter'?60:type==='display'?20:type==='workbench'?32:30;
      const ty=type==='counter'?-19:-16;
      shadow(hw+3,8);
      box(ink,-hw-1,ty-5,hw*2+3,28);
      box(dark,-hw,ty+5,hw*2+1,14);
      if(type!=='counter'){box(ink,-hw+3,7,5,7);box(ink,hw-7,7,5,7);}
      box(wood,-hw,ty-5,hw*2+1,16);box(woodLight,-hw+1,ty-4,hw*2-1,4);
      box(bright,-hw+4,ty-4,hw*2-8,1);box('#f0dbb35c',-hw+2,ty+8,hw*2-3,1);
      for(let x=-hw+3;x<hw-2;x+=13)box(dark,x,ty+10,1,8);
      if(type==='counter'){
        for(const [x,t] of [[-48,0],[-31,1],[29,4],[45,2]]){
          box(ink,x,ty-8,10,7);box(decorPalette[t],x+1,ty-10,8,5);box(bright,x+2,ty-9,3,1);
        }
        box(ink,-7,ty-10,14,9);box('#d9c4a1',-6,ty-11,12,7);box(dark,0,ty-9,1,4);
      }else if(type==='table'){
        for(const j of [-1,1]){
          box(dark,j*17-5,13,10,5);box(woodLight,j*17-4,12,8,2);
        }
        if(i===1){
          box(ink,-12,ty-5,24,9);box('#d7c9a7',-11,ty-6,22,7);box('#7d6767',0,ty-5,1,6);
        }else{
          disc(c,'#d9c7a5',-9,ty+2,5,2);disc(c,'#d3b966',7,ty+2,5,2);
          box(accent,-1,ty-8,4,8);box(bright,0,ty-7,1,4);
        }
      }else{
        for(const [idx,j] of [-1,0,1].entries()){
          box(decorPalette[(i+idx*2)%6],j*12-4,ty-7,8,6);box(bright,j*12-4,ty-7,3,1);
        }
      }
      return;
    }
    if(type==='shelf'||type==='wardrobe'||type==='rack'){
      const hw=type==='wardrobe'?15:type==='rack'?23:28;
      const h=type==='rack'?25:type==='wardrobe'?35:39;
      shadow(hw+3,5);box(ink,-hw-1,-h-1,hw*2+3,h+3);
      box(dark,-hw,-h,hw*2+1,h);box(woodLight,-hw,-h,hw*2+1,3);
      box(wood,-hw+2,-h+4,3,h-6);box(wood,hw-4,-h+4,3,h-6);
      if(type==='wardrobe'){
        box(wood,-hw+6,-h+5,hw-7,h-9);box(wood,-1,-h+5,hw-5,h-9);
        box(bright,-5,-19,2,4);box(bright,2,-19,2,4);
      }else{
        for(let t=0;t<(type==='rack'?2:3);t++){
          const ay=-4-t*11;box(woodLight,-hw+4,ay,hw*2-8,2);
          for(let x=-hw+5;x<hw-6;x+=5){
            const q=noise(x,t,seed+i+36),th=5+Math.floor(q*4);
            if(q<.19)continue;
            box(decorPalette[Math.floor(q*6)],x,ay-th,4,th);box('#f6e7c54c',x+1,ay-th+1,1,th-1);
          }
        }
      }
      return;
    }
    if(type==='bench'||type==='chest'||type==='barrel'||type==='crate'||type==='tray'){
      const rw=type==='bench'?24:type==='tray'?17:type==='chest'?13:10;
      const h=type==='barrel'?21:type==='bench'?12:type==='crate'?14:15;
      shadow(rw+3);box(ink,-rw-1,-h-2,rw*2+3,h+4);
      box(dark,-rw,-h,rw*2+1,h);
      box(wood,-rw+2,-h+2,rw*2-3,h-4);
      box(woodLight,-rw,-h,rw*2+1,4);box(bright,-rw+2,-h+1,rw*2-3,1);
      if(type==='chest'||type==='barrel'){
        box(ink,-rw,-h+5,2*rw+1,3);box(accent,-rw+1,-h+5,2*rw-1,1);
        box(bright,-2,-h+6,5,6);box(ink,0,-h+8,1,2);
      }else{
        for(let x=-rw+3;x<rw-1;x+=7)box('#492e3d52',x,-h+4,1,h-6);
      }
      return;
    }
    if(type==='anvil'||type==='bellows'||type==='ore'){
      const r=type==='anvil'?21:18;
      shadow(r+3);
      if(type==='anvil'){
        box(ink,-19,-4,38,6);box(wood,-12,-20,24,16);box(ink,-16,-23,32,9);
        poly(c,'#676a76',[[-22,-24],[19,-24],[20,-22],[13,-16],[-20,-16]]);
        box('#b9c0c0',-19,-24,35,2);box('#373747',-10,-14,20,4);
        box(woodLight,-8,-12,16,5);
      }else if(type==='ore'){
        for(const [x,y,w] of [[-13,-3,10],[0,-7,12],[11,-2,8]]){
          poly(c,ink,[[x-w,y],[x-2,y-10],[x+5,y-12],[x+w,y]]);
          poly(c,stone,[[x-w+2,y-1],[x-2,y-9],[x+5,y-10],[x+w-2,y-1]]);
          box(bright,x-1,y-8,6,1);
        }
      }else{
        poly(c,dark,[[-17,0],[-10,-18],[7,-13],[17,-6],[15,1]]);box(woodLight,3,-11,14,3);
        box(ink,-3,-17,5,15);box(accent,-6,-13,3,8);
      }
      return;
    }
    if(type==='fountain'){
      shadow(21,5);disc(c,ink,0,-2,20,9);disc(c,stone,0,-4,19,8);
      disc(c,'#517c92',0,-5,16,6);box('#9dc5ca',-10,-6,21,1);
      box(ink,-4,-25,8,22);box(stone,-3,-24,6,18);
      box(bright,-2,-23,2,16);box(wall,1,-21,9,4);box('#d9e6db',-6,-26,13,3);
      return;
    }
    if(type==='board'||type==='crest'||type==='lectern'){
      const hw=type==='board'?32:type==='crest'?20:15;
      const h=type==='board'?32:type==='crest'?32:23;
      shadow(hw+3);
      box(ink,-hw-1,-h,hw*2+3,h+3);box(dark,-hw,-h,hw*2+1,h);
      box(woodLight,-hw+1,-h+1,hw*2-1,2);box(wood,-hw+4,-h+4,hw*2-7,h-8);
      if(type==='crest'){
        poly(c,accent,[[-15,-30],[15,-30],[15,-10],[0,-2],[-15,-10]]);
        box(bright,-9,-18,19,2);box(trim[2],-1,-26,2,20);
      }else{
        const marks=type==='board'?[-22,-7,11]:[-8,3];
        for(const [j,x] of marks.entries()){
          box('#b59676',x,-h+6+j%2*5,9,13);box('#e4d2b0',x,-h+6+j%2*5,8,10);
          box('#9b7969',x+2,-h+9+j%2*5,5,1);box('#9b7969',x+2,-h+12+j%2*5,5,1);
        }
      }
      return;
    }
    if(type==='target'||type==='dummy'){
      shadow(12,5);box(dark,-2,-30,4,32);box(woodLight,-1,-29,1,27);
      if(type==='target'){
        disc(c,ink,0,-25,13,13);disc(c,woodLight,0,-25,11,11);
        disc(c,accent,0,-25,8,8);disc(c,bright,0,-25,5,5);disc(c,'#ae6266',0,-25,2,2);
      }else{
        box(ink,-13,-22,26,5);box(wood,-12,-22,24,3);
        box('#ab8e65',-6,-27,13,17);box(decorPalette[3],-5,-25,11,7);
        box(accent,-6,-17,13,3);disc(c,woodLight,0,-30,6,6);box(dark,-3,-36,7,2);
      }
      return;
    }
    if(type==='plant'){
      shadow(10,4);box(ink,-7,-13,15,15);box(wall,-5,-11,11,11);box(bright,-7,-13,15,3);
      for(const [x,y,rx,ry,col] of [[-6,-17,5,4,'#658b74'],[1,-23,7,5,'#728f7a'],[5,-16,7,4,'#8ea687']])
        disc(c,col,x,y,rx,ry);
      return;
    }
    if(type==='rune'){
      disc(c,'#514866',0,-6,22,11);disc(c,accent,0,-7,19,9);
      disc(c,'#6b678c',0,-7,17,8);box('#d8ece7',-11,-8,23,1);box('#d8ece7',-1,-16,2,17);
      return;
    }
    shadow(8,4);
  }
  function sprites(spec,seed) {
    const found=new Map(), result=[];
    for(const [type,x,y,variant=0] of spec.furniture){
      const id=type+'/'+variant;
      if(!found.has(id)){
        const bitmap=canvas(152,86),c=bitmap.getContext('2d');
        c.translate(76,68);drawObject(c,type,spec.colors,variant,seed);
        found.set(id,bitmap);
      }
      const size=feet[type],solid=size?{x:x-size[0]/2,y:y-size[1]*.72,w:size[0],h:size[1]}:null;
      result.push({x,y,type,sprite:found.get(id),solid});
    }
    return result.sort((a,b)=>a.y-b.y);
  }
  function midpointBlocked(box,x,y,r){
    const cx=clamp(x,box.x,box.x+box.w),cy=clamp(y,box.y,box.y+box.h);
    return (x-cx)**2+(y-cy)**2<=r*r;
  }
  function canWalkWithin(floor,furniture,x,y,r=6){
    if(!Number.isFinite(x+y+r)||r<0||x<r||y<r||x>=width-r||y>=height-r)return false;
    const x0=Math.floor((x-r)/cell),x1=Math.floor((x+r)/cell);
    const y0=Math.floor((y-r)/cell),y1=Math.floor((y+r)/cell);
    for(let j=y0;j<=y1;j++)for(let i=x0;i<=x1;i++)if(!cellAt(floor,i,j))return false;
    return !furniture.some(o=>o.solid&&midpointBlocked(o.solid,x,y,r));
  }
  const inShot=(o,cam)=>o.x>=cam.x-82&&o.x<=cam.x+cam.w+82&&o.y>=cam.y-24&&o.y<=cam.y+cam.h+70;
  function animate(c,o,t,seed){
    const {x,y,type}=o,shif=t*2.3+x*.009;
    if(['hearth','furnace','stove'].includes(type)){
      for(let i=0;i<5;i++){
        const a=(Math.sin(shif*1.8+i*1.7)+1)*.5;
        boxStack(x-9+i*4,y-5,Math.ceil(3+a*7),a);
      }
    }else if(type==='fountain'){
      for(let i=0;i<3;i++){
        const phase=(t*1.7+i*.28)%1;
        rectangle(c,sparklePalette[i%2],x+8,y-18+phase*13,1,1+i%2);
      }
      rectangle(c,'#d0e8deba',x-12+(t*6%22),y-6,4,1);
    }else if(type==='rune'||type==='lamp'){
      const n=Math.floor(t*5+seed)%6;
      if(type==='rune')rectangle(c,'#edf1daae',x-9+n*3,y-11+(n%3)*4,2,2);
      else rectangle(c,'#fff5ce',x-1,y-25,2,2+n%3);
    }
    function boxStack(xx,yy,height,noise){
      rectangle(c,'#df7857',xx,yy-height,4,height+2);
      rectangle(c,'#f7bd78',xx+1,yy-height+2,2,height);
      rectangle(c,'#ffedac',xx+1,yy-3-noise,2,3);
    }
  }
  function glow(c,o,t){
    if(!lightTypes.has(o.type))return;
    const ember=o.type!=='window'&&o.type!=='rune';
    const still=window.UI?.effects===false||!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const f=ember?.83+(still?0:Math.sin(t*3+o.x)*.10):.74;
    c.save();c.globalAlpha=f;
    disc(c,ember?'#ffce8220':'#bfe2d619',o.x,o.y+5,36,22);
    disc(c,ember?'#f3cc8220':'#cbe8de1a',o.x,o.y+5,26,16);
    c.restore();
  }
  function marker(c,site,t){
    const {x,y}=site,rise=Math.round(Math.sin(t*2.6+x)*1.4);
    const color=site.id==='exit'?'#ffe1a6':'#dda078';
    disc(c,'#3e293478',x,y+3,5,2);
    poly(c,color,[[x,y-9+rise],[x+4,y-5+rise],[x,y-1+rise],[x-4,y-5+rise]]);
    rectangle(c,'#5d4748',x-1,y-6+rise,3,3);
  }
  function normalizeSeed(seed){
    if(Number.isFinite(seed))return seed>>>0;
    return 0;
  }
  function create(kind,seed=0){
    const region=get(kind);
    if(!region)return null;
    seed=normalizeSeed(seed);
    const key=region.id+'/'+seed;
    if(cache.has(key)){
      const old=cache.get(key);cache.delete(key);cache.set(key,old);return old;
    }
    const spec=plans[region.kind],floor=floorMask(spec),ground=groundOf(spec,floor,seed),furniture=sprites(spec,seed);
    const chart=canvas(width/2,height/2),g=chart.getContext('2d');
    g.imageSmoothingEnabled=false;g.drawImage(ground,0,0,chart.width,chart.height);
    g.save();g.scale(.5,.5);
    for(const o of furniture)g.drawImage(o.sprite,o.x-76,o.y-68);
    for(const site of region.sites)marker(g,site,0);
    g.restore();

    function drawGround(c,cam,t=0){
      const x=Math.max(0,Math.floor(cam.x)),y=Math.max(0,Math.floor(cam.y));
      const wide=Math.min(width-x,Math.ceil(cam.w)+1),high=Math.min(height-y,Math.ceil(cam.h)+1);
      if(wide<=0||high<=0)return;
      c.drawImage(ground,x,y,wide,high,x,y,wide,high);
      for(const obj of furniture)if(inShot(obj,cam))glow(c,obj,t);
    }
    function drawFront(c,cam,t=0,actors=[]){
      // Doors and services stay legible on top of the floor; figures share the furnishings' depth order.
      for(const site of region.sites)if(inShot(site,cam))marker(c,site,t);
      const p=actors[0];
      const visible=actors.concat(furniture).filter(o=>inShot(o,cam)).sort((a,b)=>a.y-b.y);
      for(const obj of visible){
        if(typeof obj.draw==='function'){obj.draw(c);continue;}
        const fade=p&&obj.solid&&p.y<obj.y&&p.y>obj.y-48&&
          Math.abs(p.x-obj.x)<Math.min(34,obj.solid.w/2+6);
        if(fade){c.save();c.globalAlpha=.58;}
        c.drawImage(obj.sprite,obj.x-76,obj.y-68);
        animate(c,obj,t,seed);
        if(fade)c.restore();
      }
    }
    function drawMap(c,w,h,p){
      if(!(w>0&&h>0))return;
      c.save();c.imageSmoothingEnabled=false;c.drawImage(chart,0,0,w,h);
      if(p){
        const x=Math.round(p.x/width*w),y=Math.round(p.y/height*h);
        poly(c,'#fff1c1',[[x,y-3],[x+3,y],[x,y+3],[x-3,y]]);
        rectangle(c,'#92624d',x-1,y-1,2,2);
      }
      c.restore();
    }
    const instance={region,drawGround,drawFront,drawMap,
      canWalk:(x,y,r=6)=>canWalkWithin(floor,furniture,x,y,r),sites:region.sites,npcLocations:region.npcLocations};
    cache.set(key,instance);
    if(cache.size>2)cache.delete(cache.keys().next().value);
    return instance;
  }
  window.UrbanInteriors=Object.freeze({get,create,kinds:Object.freeze(Object.keys(plans))});
})();
