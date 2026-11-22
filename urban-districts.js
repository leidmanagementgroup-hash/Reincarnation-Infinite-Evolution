/* Quartieri deterministici con collegamenti fra strade, lotti e settori. */
(() => {
  'use strict';
  const id='city-filoni',origin='frost-pass',continent='continent-2';
  const width=960,height=672,sectorSize=256;
  const at=(x,y)=>({x,y});
  const spawn=at(92,400),entry=at(529,398),exit=at(55,405);
  const plaza={...at(462,390),rx:99,ry:62,name:'Piazzale degli Argani'};
  const enter={id:'gate-filoni-argani',...entry,to:id,arrival:spawn,label:'Entra nel Piazzale degli Argani',minStage:0};
  const leave={id:'gate-filoni-pass',...exit,to:origin,arrival:entry,label:'Torna al Passo dei Larici',minStage:0};
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
  const blank={mobs:[],resources:[],bosses:[],gates:[]};
  const roomId=lot=>id+'-'+lot.id;
  const rooms=Object.fromEntries(profile.lots.filter(lot=>lot.room).map(lot=>[roomId(lot),lot]));
  const regions={
    [id]:{id,name:'Borgo dei Filoni · Piazzale degli Argani',description:'Quartiere minerario di Nordharyn tra larici, argani e case dalla falda ripida.',
      width,height,spawn,continent,palette:'pine',settlementType:'hamlet',landmarks,points:{...blank,gates:[leave]}}
  };
  for(const [key,lot] of Object.entries(rooms)){
    const template=UrbanInteriors.get(lot.room);
    regions[key]={...template,id:key,name:lot.name,description:'Interno · '+lot.name,continent,hidden:true,palette:'pine',points:{...blank}};
  }

  const art=window.FiloniSprites,family=window.CityFamilies;
  const terrain=art.terrain;
  const [familyId,familySub]=family.familyOf('pine');
  const materials=family.families[familyId].materials;
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function hash(x,y,seed){
    let n=Math.imul(x^0x4d4c7e29,0x45d9f3b)^Math.imul(y^seed,0x27d4eb2d);
    n=Math.imul(n^(n>>>16),0x45d9f3b);return (n^(n>>>16))>>>0;
  }
  function lotKey(key){
    let n=0;
    for(const ch of key)n=Math.imul(31,n)+ch.charCodeAt(0)|0;
    return n;
  }
  function segmentDistance(x,y,a,b){
    const dx=b.x-a.x,dy=b.y-a.y;
    const t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);
    return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);
  }
  const sectorKey=(x,y)=>x+'/'+y;
  function forSectors(box,callback){
    for(let y=Math.floor(box.y/sectorSize);y<=Math.floor((box.y+box.h)/sectorSize);y++)
      for(let x=Math.floor(box.x/sectorSize);x<=Math.floor((box.x+box.w)/sectorSize);x++)callback(x,y);
  }
  function nearPlaza(x,y){return ((x-plaza.x)/plaza.rx)**2+((y-plaza.y)/plaza.ry)**2;}
  function generate(seed){
    const sectors=new Map(),roads=[],nodes=new Map(),links=new Map(),buildings=[],props=[];
    const lotSalt=lotKey(id+'/layout/'+profile.revision);
    for(let y=0;y*sectorSize<height;y++)for(let x=0;x*sectorSize<width;x++){
      sectors.set(sectorKey(x,y),{x:x*sectorSize,y:y*sectorSize,buildings:[],props:[],solids:[],roads:[]});
    }
    for(const [key,value] of Object.entries(profile.street)){nodes.set(key,value);links.set(key,[]);}
    function link(a,b,roadWidth,main=false){
      links.get(a).push(b);links.get(b).push(a);
      const from=nodes.get(a),to=nodes.get(b),r=roadWidth/2+8;
      const road={from,to,width:roadWidth,main};roads.push(road);
      forSectors({x:Math.min(from.x,to.x)-r,y:Math.min(from.y,to.y)-r,w:Math.abs(from.x-to.x)+2*r,h:Math.abs(from.y-to.y)+2*r},
        (x,y)=>sectors.get(sectorKey(x,y))?.roads.push(road));
    }
    for(const trail of profile.trails)for(let i=1;i<trail.stops.length;i++)link(trail.stops[i-1],trail.stops[i],trail.width,trail.main);
    function solid(box){
      forSectors(box,(x,y)=>sectors.get(sectorKey(x,y))?.solids.push(box));
    }
    for(const lot of profile.lots){
      const n=hash(lotKey(lot.id),lotSalt,seed),variant=n%lot.widths.length,varied=lot.widths.length>1;
      const x=lot.x+(varied?(n>>>5)%15-7:0),y=lot.y+(varied?(n>>>11)%9-4:0);
      const w=lot.widths[variant],door=at(x,y+12);
      const box={x:x-Math.floor(w/2),y:y-lot.depth,w,h:lot.depth};
      const facade={sub:variant===lot.snow?'rocca':familySub,kind:lot.component,
        spec:{w,stories:lot.stories,variant:(n>>>14)%8,door:0}};
      const building={...lot,x,y,facade,box,door,room:lot.room?roomId(lot):null};
      buildings.push(building);solid(box);
      sectors.get(sectorKey(Math.floor(x/sectorSize),Math.floor(y/sectorSize))).buildings.push(building);
      nodes.set(lot.id,door);links.set(lot.id,[]);link(lot.node,lot.id,lot.room?15:11);
    }
    function prop(kind,x,y,r=0){
      const o={kind,x,y};props.push(o);
      sectors.get(sectorKey(Math.floor(x/sectorSize),Math.floor(y/sectorSize)))?.props.push(o);
      if(r)solid({x:x-r,y:y-r,w:2*r,h:2*r});
    }
    prop('winch',465,371,9);
    prop('stall0',402,366,6);prop('stall1',524,379,6);prop('well',557,455,8);
    prop('cart',754,394,8);prop('cart',574,470,7);prop('logs',300,500,7);prop('logs',663,439,7);
    for(const [x,y] of [[75,376],[176,365],[272,404],[371,389],[427,419],[495,412],[552,422],[632,403],
      [721,423],[798,420],[242,448],[361,533],[563,541],[280,252],[525,241],[672,237]])prop('lamp',x,y);
    for(let y=49;y<height-16;y+=33)for(let x=22;x<width-22;x+=30){
      const n=hash(x,y,seed^0x7632ab7),px=x+n%18,py=y+(n>>>8)%19;
      const border=py<145||py>584||px<132||px>833;
      if(n%100>=(border?69:11)||nearPlaza(px,py)<1.6)continue;
      if(roads.some(r=>segmentDistance(px,py,r.from,r.to)<r.width/2+17))continue;
      if(buildings.some(b=>Math.abs(px-b.x)<b.box.w/2+23&&py>b.box.y-21&&py<b.y+29))continue;
      if(props.some(o=>Math.abs(px-o.x)<18&&Math.abs(py-o.y)<18))continue;
      const kind=(n>>>19)%8;
      prop(kind<5?'pine'+kind%3:kind<7?'shrub':'rock',px,py,kind<5?5:3);
    }
    return {seed,sectors,buildings,props,roads,nodes,links};
  }
  function surface(layout){
    const boxes=box=>{
      const result=new Set();
      forSectors(box,(x,y)=>{
        const sector=layout.sectors.get(sectorKey(x,y));
        if(sector)for(const solid of sector.solids)result.add(solid);
      });
      return result;
    };
    function canWalk(x,y,r=6){
      if(!Number.isFinite(x)||!Number.isFinite(y)||x<r+14||y<r+15||x>width-r-14||y>height-r-16)return false;
      for(let cy=Math.floor((y-r)/sectorSize);cy<=Math.floor((y+r)/sectorSize);cy++){
        for(let cx=Math.floor((x-r)/sectorSize);cx<=Math.floor((x+r)/sectorSize);cx++){
          const sector=layout.sectors.get(sectorKey(cx,cy));
          if(!sector)continue;
          for(const b of sector.solids)if(x+r>=b.x&&x-r<=b.x+b.w&&y+r>=b.y&&y-r<=b.y+b.h)return false;
        }
      }
      return true;
    }
    function segmentClear(a,b,r){
      if(!canWalk(a.x,a.y,r)||!canWalk(b.x,b.y,r))return false;
      const dx=b.x-a.x,dy=b.y-a.y;
      for(const o of boxes({x:Math.min(a.x,b.x)-r,y:Math.min(a.y,b.y)-r,w:Math.abs(dx)+2*r,h:Math.abs(dy)+2*r})){
        // Intersezione del segmento con la sagoma estesa per il raggio del corpo.
        let enter=0,leave=1;
        for(const [p,v,low,high] of [[a.x,dx,o.x-r,o.x+o.w+r],[a.y,dy,o.y-r,o.y+o.h+r]]){
          if(!v){if(p<low||p>high){leave=-1;break;}continue;}
          const u=(low-p)/v,t=(high-p)/v;
          enter=Math.max(enter,Math.min(u,t));leave=Math.min(leave,Math.max(u,t));
        }
        if(enter<=leave)return false;
      }
      return true;
    }
    function path(a,b,r=6){
      if(segmentClear(a,b,r))return [a,b];
      const {nodes,links}=layout;
      const starts=[...nodes].filter(([,p])=>segmentClear(a,p,r)).sort(([,p],[,q])=>dist(a,p)-dist(a,q));
      const queue=starts.map(([key])=>key),parents=new Map(queue.map(key=>[key,null]));
      for(let i=0;i<queue.length;i++){
        const key=queue[i],p=nodes.get(key);
        if(segmentClear(p,b,r)){
          const route=[b];let current=key;
          while(current){route.push(nodes.get(current));current=parents.get(current);}
          route.push(a);return route.reverse();
        }
        for(const next of links.get(key))if(!parents.has(next)&&segmentClear(p,nodes.get(next),r)){
          parents.set(next,key);queue.push(next);
        }
      }
      return [];
    }
    return {canWalk,path};
  }

  function canvas(w,h){const image=document.createElement('canvas');image.width=w;image.height=h;return image;}
  function box(c,color,x,y,w,h){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function atlas(c,name,x,y){
    const a=art.assets[name];
    c.drawImage(art.get(name),x+a.x,y+a.y);
  }
  const rgb=color=>Number.parseInt(color.slice(1),16);
  const joint=rgb(terrain.joint),pebbles=terrain.pebble.map(rgb),tufts=terrain.tuft.map(rgb),flowers=terrain.flowers.map(rgb);
  function drawTerrain(sector,seed){
    const w=Math.min(sectorSize,width-sector.x),h=Math.min(sectorSize,height-sector.y);
    const image=canvas(w,h),g=image.getContext('2d');
    const bitmap=g.createImageData(w,h),data=bitmap.data,cols=Math.ceil(w/2);
    const distances=new Float32Array(cols*Math.ceil(h/2));distances.fill(Infinity);
    const mainRoad=new Uint8Array(distances.length);
    // Rasterizza ogni strada solo nel suo ingombro, usando coordinate assolute ai confini dei settori.
    for(const road of sector.roads){
      const {from,to}=road,r=road.width/2+8;
      const x0=Math.max(0,Math.floor((Math.min(from.x,to.x)-r-sector.x)/2));
      const y0=Math.max(0,Math.floor((Math.min(from.y,to.y)-r-sector.y)/2));
      const x1=Math.min(cols,Math.ceil((Math.max(from.x,to.x)+r-sector.x)/2));
      const y1=Math.min(Math.ceil(h/2),Math.ceil((Math.max(from.y,to.y)+r-sector.y)/2));
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
        const d=segmentDistance(sector.x+x*2,sector.y+y*2,from,to)-road.width/2,i=y*cols+x;
        if(d<distances[i]){distances[i]=d;mainRoad[i]=road.main?1:0;}
      }
    }
    const gx0=Math.floor(sector.x/72),gy0=Math.floor(sector.y/72);
    const noise=Array.from({length:6},(_,y)=>Array.from({length:6},(_,x)=>(hash(gx0+x,gy0+y,seed)&255)/255));
    function pixel(x,y,color){
      if(x<0||x>=w||y<0||y>=h)return;
      const i=(x+y*w)*4;
      data[i]=color>>>16;data[i+1]=(color>>>8)&255;data[i+2]=color&255;data[i+3]=255;
    }
    for(let oy=0;oy<h;oy+=2)for(let ox=0;ox<w;ox+=2){
      const x=sector.x+ox,y=sector.y+oy,n=hash(x,y,seed),i=(oy/2)*cols+ox/2;
      const gx=Math.floor(x/72),gy=Math.floor(y/72),u=x/72-gx,v=y/72-gy,xx=gx-gx0,yy=gy-gy0;
      const b=(noise[yy][xx]*(1-u)+noise[yy][xx+1]*u)*(1-v)+(noise[yy+1][xx]*(1-u)+noise[yy+1][xx+1]*u)*v;
      let ground=terrain.soilRgb[clamp(Math.floor(b*6)+(n%4===0?1:0),0,6)];
      if(b>.71&&y<227)ground=terrain.dryRgb[(n>>>8)%4];
      const near=distances[i];
      const square=nearPlaza(x,y),rough=(n%8-3)*.65;
      if(near<rough)ground=terrain.trackRgb[1+mainRoad[i]+(n>>>5)%3];
      else if(near<rough+5)ground=terrain.vergeRgb[(n>>>6)%3];
      if(square<1.04){
        const row=Math.floor(y/8),s=(x+(row%2)*6)%12;
        ground=square>.91||y%8<2||s<2?joint:terrain.pavingRgb[1+hash(Math.floor((x+(row%2)*6)/12),row,seed)%3];
      }
      for(let y=oy;y<oy+2;y++)for(let x=ox;x<ox+2;x++)pixel(x,y,ground);
      if(n%42===0&&square>1.05){
        const fleck=near<0?pebbles[(n>>>9)%2]:tufts[(n>>>8)%3];
        pixel(ox,oy,fleck);pixel(ox+1,oy,fleck);
        if(n%5===0&&near>4)pixel(ox+1,oy+1,flowers[(n>>>12)%3]);
      }
    }
    g.putImageData(bitmap,0,0);
    return image;
  }
  const timber=materials.wood[0];
  const furnitureKind={winch:['headframe',.64],stall0:['stall',1],stall1:['stall',1,'rocca'],well:['well',1],cart:['orecart',1.65],lamp:['lamp',1]};
  function paintFamily(c,sprite,x,y,sx=1,sy=sx){
    c.drawImage(sprite.image,Math.round(x-sprite.ax*sx),Math.round(y-sprite.ay*sy),
      Math.round(sprite.image.width*sx),Math.round(sprite.image.height*sy));
  }
  function furniture(c,o,frame){
    const {x,y,kind}=o;
    if(art.assets[kind]){
      atlas(c,kind,x,y);
      return;
    }
    const style=furnitureKind[kind];
    if(style){
      const f=frame(o);
      paintFamily(c,f,x,y,style[1]);
      if(f.flame){const [dx,dy,w,h]=f.flame;box(c,materials.glass,x+dx,y+dy,w,h);box(c,'#ffe4a5',x+dx+1,y+dy,1,2);}
      return;
    }
    const fill=(color,dx,dy,w,h)=>box(c,color,x+dx,y+dy,w,h);
    for(const [dx,dy] of [[-10,-5],[-3,-5],[4,-5],[-6,-10],[1,-10]]){
      fill(timber,dx,dy,13,5);fill(materials.wood[3],dx+1,dy,10,2);fill(materials.cloth[1],dx+9,dy+1,4,3);
    }
  }
  const symbols={bed:['11100','10000','11111','10001'],pick:['01110','00101','01100','11000'],crate:['11111','11011','10101','11111'],
    anvil:['11111','01110','00100','01110'],wood:['11010','10101','11010','00000'],wool:['01110','11011','10101','01110'],saw:['11111','10101','01010','00000']};
  function renderBuilding(c,b,frame){
    const {sprite,x,y,sx}=frame(b);
    paintFamily(c,sprite,x,y,sx,1);
    if(!b.sign)return;
    const sxSign=x+Math.round(b.box.w*.29),sySign=y-15;
    box(c,timber,sxSign-7,sySign-5,16,12);box(c,materials.wood[2],sxSign-6,sySign-4,14,10);
    box(c,materials.cloth[1],sxSign-5,sySign-3,12,1);
    symbols[b.sign].forEach((row,dy)=>{for(let i=0;i<row.length;i++)if(row[i]==='1')box(c,materials.bloom[1],sxSign-4+i*2,sySign-1+dy,2,1);});
  }
  function visitVisible(layout,cam,pad,callback){
    forSectors({x:cam.x-pad,y:cam.y-pad,w:cam.w+2*pad,h:cam.h+2*pad},(x,y)=>{
      const sector=layout.sectors.get(sectorKey(x,y));if(sector)callback(sector,sectorKey(x,y));
    });
  }
  function streetMap(layout){
    const chart=canvas(320,224),c=chart.getContext('2d');
    box(c,terrain.soil[1],0,0,320,224);c.save();c.scale(1/3,1/3);
    box(c,terrain.paving[1],plaza.x-plaza.rx+14,plaza.y-plaza.ry+12,2*plaza.rx-28,2*plaza.ry-24);
    for(const r of layout.roads){
      c.beginPath();c.moveTo(r.from.x,r.from.y);c.lineTo(r.to.x,r.to.y);
      c.strokeStyle=r.main?terrain.track[4]:terrain.track[2];c.lineWidth=r.width;c.stroke();
    }
    for(const b of layout.buildings){box(c,b.room?'#b89a69':'#34464a',b.box.x,b.box.y,b.box.w,b.box.h);}
    c.restore();return chart;
  }
  const workers=[
    {skin:'dwarf',tempo:48,agenda:[[0,'ridge-house'],[420,'miners-hall'],[728,'hallW'],[808,'miners-hall'],[1080,'squareW'],[1215,'ridge-house']]},
    {skin:'goblin',tempo:53,agenda:[[0,'larch-cottage'],[471,'wool-shop'],[750,'squareE'],[850,'wool-shop'],[1130,'lowerIn'],[1290,'larch-cottage']]},
    {skin:'human',tempo:51,agenda:[[0,'scree-house'],[505,'carpenter-shop'],[785,'shops'],[850,'carpenter-shop'],[1090,'lowerMid'],[1240,'scree-house']]}
  ];
  function residentActors(layout,collision){
    const routes=new Map();
    return (s,t)=>{
      if(!window.Calendar)return [];
      const minute=((Calendar.timestamp(s.calendar,s.time)%1440)+1440)%1440;
      const list=[];
      for(const [i,worker] of workers.entries()){
        const agenda=worker.agenda,step=agenda.findLastIndex(([time])=>time<=minute),[time,key]=agenda[step];
        // Di notte gli abitanti riposano. In esterno i tragitti usano la stessa collisione del giocatore.
        if(step===0||step===agenda.length-1&&minute>=time+27)continue;
        const previous=agenda[step-1][1],from=layout.nodes.get(previous),target=layout.nodes.get(key),cacheKey=previous+'/'+key;
        if(!routes.has(cacheKey))routes.set(cacheKey,collision.path(from,target,6));
        const course=routes.get(cacheKey);
        let progress=(minute-time)*worker.tempo/Calendar.minutesPerSecond,p=course.length?target:from,dir='down',moving=false;
        for(let n=1;n<course.length;n++){
          const a=course[n-1],b=course[n],d=dist(a,b);
          if(progress<d){
            const ratio=progress/d;
            p=at(a.x+(b.x-a.x)*ratio,a.y+(b.y-a.y)*ratio);
            dir=Math.abs(b.x-a.x)>Math.abs(b.y-a.y)?b.x>a.x?'right':'left':b.y>a.y?'down':'up';moving=true;break;
          }
          progress-=d;
        }
        list.push({...p,draw:c=>ActorArt.draw(c,worker.skin,p.x,p.y,{dir,moving,t:t+i*.27})});
      }
      return list;
    };
  }
  function exterior(layout){
    const ground=new Map(),collision=surface(layout),buildingFrames=new Map(),furnitureFrames=new Map();
    let chart=null;
    const sites=layout.buildings.filter(b=>b.room).map(b=>({id:'door-'+b.id,...b.door,range:24,name:b.name,text:'Entra · '+b.name,to:b.room}));
    function buildingFrame(b){
      if(buildingFrames.has(b.id))return buildingFrames.get(b.id);
      const {sub,kind,spec}=b.facade,sprite=family.render(familyId,sub,kind,spec),sx=b.box.w/sprite.footprint.w;
      // Allinea la soglia disegnata alla porta persistente, conservando i 12 px di avvicinamento della revisione 1.
      const x=b.door.x-sprite.door.x*sx,y=b.door.y-12-sprite.door.y;
      const frame={sprite,x,y,sx};buildingFrames.set(b.id,frame);return frame;
    }
    function furnitureFrame(o){
      if(furnitureFrames.has(o.kind))return furnitureFrames.get(o.kind);
      const [kind,,sub=familySub]=furnitureKind[o.kind];
      const sprite=family.render(familyId,sub,kind);
      furnitureFrames.set(o.kind,sprite);return sprite;
    }
    function drawGround(c,cam){
      c.imageSmoothingEnabled=false;
      let visible=0;
      visitVisible(layout,cam,0,(s,key)=>{
        visible++;
        let image=ground.get(key);
        if(!image)image=drawTerrain(s,layout.seed);
        else ground.delete(key);
        ground.set(key,image);c.drawImage(image,s.x,s.y);
      });
      // Mai espellere un settore ancora inquadrato, anche quando lo zoom ne mostra più di otto.
      const budget=Math.max(8,visible+2);
      while(ground.size>budget)ground.delete(ground.keys().next().value);
    }
    function drawFront(c,cam,t,actors=[]){
      const objects=[...actors],player=actors[0];
      visitVisible(layout,cam,100,sector=>objects.push(...sector.buildings,...sector.props));
      const nearby=o=>o.x>=cam.x-94&&o.x<=cam.x+cam.w+94&&o.y>=cam.y-34&&o.y<=cam.y+cam.h+105;
      for(const o of objects.filter(nearby).sort((a,b)=>a.y-b.y)){
        if(o.draw){o.draw(c);continue;}
        const fade=player&&o.kind?.startsWith('pine')&&Math.abs(player.x-o.x)<22&&player.y<o.y&&player.y>o.y-47;
        if(fade){c.save();c.globalAlpha=.52;}
        if(o.facade)renderBuilding(c,o,buildingFrame);else furniture(c,o,furnitureFrame);
        if(fade)c.restore();
      }
    }
    function drawMap(c,w,h,p){
      if(!chart)chart=streetMap(layout);
      c.drawImage(chart,0,0,w,h);
      if(p){box(c,'#322b25',p.x/width*w-3,p.y/height*h-3,6,6);box(c,'#ffedb5',p.x/width*w-2,p.y/height*h-2,4,4);}
    }
    function lights(cam){
      const lights=[],windows=[];
      const near=(x,y)=>x>=cam.x-55&&x<=cam.x+cam.w+55&&y>=cam.y-45&&y<=cam.y+cam.h+55;
      visitVisible(layout,cam,60,s=>{
        for(const b of s.buildings)if(near(b.x,b.y)){
          const {sprite,x,y,sx}=buildingFrame(b);
          for(const [i,w] of sprite.windows.entries()){
            windows.push({x:Math.round(x+w.x*sx),y:Math.round(y+w.y),w:Math.max(1,Math.round(w.w*sx)),h:w.h,seed:hash(b.x,b.y,i)%100});
          }
        }
        for(const o of s.props)if(o.kind==='lamp'&&near(o.x,o.y)){
          const [dx,dy,w,h]=furnitureFrame(o).flame;
          lights.push({x:o.x+dx+1,y:o.y,kind:'lamp',lift:14-dy,core:[o.x+dx,o.y+dy,w,h,'#ffdf94']});
        }
      });
      return {lights,windows};
    }
    return {...collision,layout,sites,drawGround,drawFront,drawMap,lights,actors:residentActors(layout,collision)};
  }

  let current=null;
  const maps=new Map();
  const roomKind=key=>rooms[key]?.room||null;
  const owns=key=>Object.hasOwn(regions,key);
  function create(region,seed){
    if(!owns(region))return null;
    const key=(seed>>>0)+'/'+region;
    if(maps.has(key)){
      const map=maps.get(key);maps.delete(key);maps.set(key,map);return map;
    }
    const room=rooms[region];
    let map;
    if(room){
      const original=UrbanInteriors.create(room.room,hash(lotKey(room.id),profile.revision,seed));
      map={...original,region:regions[region],sites:original.sites.map(site=>({...site,name:room.name}))};
    }else map=exterior(generate(seed>>>0));
    if(maps.size===5)maps.delete(maps.keys().next().value);
    maps.set(key,map);return map;
  }
  function route(from,to,seed){
    if(from===id){
      if(rooms[to]){
        const door=create(id,seed).sites.find(s=>s.to===to);
        return {...door,arrival:regions[to].spawn,label:'Entra · '+door.name};
      }
      return leave;
    }
    if(rooms[from]){
      const target=create(id,seed).sites.find(s=>s.to===from);
      const door=create(from,seed).sites.find(s=>s.id==='exit');
      return {...door,to:id,arrival:at(target.x,target.y),label:'Torna al piazzale'};
    }
    return null;
  }
  function use(s,site){
    if(site.to)return {ok:true,transition:{region:site.to,...regions[site.to].spawn}};
    if(site.id==='exit'){
      const dest=route(s.region,id,s.seed);
      return {ok:true,transition:{region:id,...dest.arrival}};
    }
    if(site.id==='shop')return {ok:true,panel:'economy'};
    if(site.id==='forge')return {ok:true,panel:'gear'};
    if(site.id==='inn-kitchen')return {ok:true,panel:{id:'workshop',detail:'cooking'}};
    if(['inn-bed','house-bed','inn-water','inn-breakfast'].includes(site.id))return {ok:true,panel:'living'};
    return {ok:true,text:'Un cassone del borgo, robusto e asciutto.'};
  }
  function guide(c){
    const {x,y}=entry;
    box(c,'#24343167',x-13,y+2,30,4);
    box(c,materials.wood[0],x-1,y-21,3,24);box(c,materials.wood[1],x-13,y-25,26,10);
    box(c,materials.wood[3],x-12,y-24,24,8);box(c,materials.cloth[1],x-11,y-23,21,1);
    box(c,'#ebd5a7',x-5,y-20,10,2);box(c,'#ebd5a7',x+3,y-22,2,6);box(c,'#ebd5a7',x+5,y-21,2,4);
  }
  function actors(s,t){
    if(!owns(s.region))return [];
    if(s.region===id)return create(id,s.seed).actors(s,t);
    const map=create(s.region,s.seed),kind=roomKind(s.region);
    if(kind==='house'||kind==='shop'&&window.Calendar&&!Calendar.view(s.calendar,s.time,s.region).shopOpen)return [];
    return map.npcLocations.map((o,i)=>({x:o.x,y:o.y,draw:c=>ActorArt.draw(c,o.race,o.x,o.y,{dir:'down',t:t+i*.2})}));
  }
  window.WorldLight?.provide(key=>key===id&&!!current,cam=>current.lights(cam),()=> 'pine',()=> 'pine');
  window.UrbanDistricts={id,origin,enter,regions,owns,roomKind,create,route,use,actors,guide,
    active(map){current=map?.layout?map:null;}};
})();
