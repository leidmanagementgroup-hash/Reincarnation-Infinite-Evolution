/* Hand-authored regional geography with seeded scenery. World coordinates are logical pixels. */
(() => {
  'use strict';
  const valley = window.World;
  const at = (x, y) => ({x, y});
  const list = (points) => points.map(([x, y, type]) => ({x, y, type}));
  const landmarks = (points) => points.map(([name, x, y]) => ({name, x, y}));
  const gate = (id, x, y, label, to, ax, ay, minStage = 0) => ({id, x, y, label, to, arrival: at(ax, ay), minStage});
  const quarry = {
    id:'quarry', name:'Cava delle Braci',
    description:'Gallerie d’estrazione, laghi di scorie e una forgia abbandonata.',
    width:1160, height:818, spawn:at(145,606),
    landmarks:landmarks([
      ['Ingresso delle Braci',145,606],['Galleria delle Carrucole',352,511],['Ponte delle Scorie',558,526],
      ['Forgia Sepolta',824,364],['Montacarichi di Vetro',1044,256]
    ]),
    points:{
      gates:[gate('valley-return',104,615,'Torna alla Valle di Lùmora','valley',1437,367),
             gate('glass-lift',1044,256,'Sali alla Fenditura Astrale','rift',145,615,2)],
      bosses:[{id:'kharun',type:'kharun',x:824,y:364}],
      resources:list([[215,610,'herb'],[265,489,'ore'],[361,572,'ore'],[448,603,'herb'],[484,477,'ore'],[666,489,'ore'],
        [746,549,'ore'],[920,457,'herb'],[996,396,'ore'],[1068,335,'ore'],[1034,539,'ore'],[465,692,'ore']]),
      mobs:list([[238,555,'scarab'],[304,518,'ember'],[374,499,'sentinel'],[435,590,'scarab'],[475,500,'ember'],
        [655,523,'scarab'],[704,460,'ember'],[713,510,'sentinel'],[952,413,'scarab'],[986,344,'sentinel'],
        [1067,312,'ember'],[1004,479,'scarab'],[798,526,'ember'],[469,656,'sentinel']])
    },
    roads:[
      [48,[[92,616],[155,605],[226,574],[312,535],[361,522],[442,525],[485,530],[630,527],[689,498],[733,458],[782,409],[824,364],[914,315],[1006,279],[1044,256]]],
      [27,[[312,537],[350,587],[406,614],[469,656],[489,688]]],
      [30,[[681,506],[758,526],[847,534],[940,506],[1004,479],[1050,438],[1068,375],[1048,304]]],
      [27,[[782,407],[737,367],[695,329],[669,269]]]
    ],
    arenas:[{x:824,y:364,rx:111,ry:81}]
  };
  const rift = {
    id:'rift', name:'Fenditura Astrale',
    description:'Isole sospese, rovine lunari e un varco che pulsa tra i cristalli.',
    width:1300, height:834, spawn:at(145,615),
    landmarks:landmarks([
      ['Soglia Astrale',145,615],['Osservatorio Lunare',425,526],['Conca di Vetro',731,455],
      ['Giardino delle Schegge',955,555],['Cuore del Varco',1068,228]
    ]),
    points:{
      gates:[gate('quarry-return',100,634,'Scendi alla Cava delle Braci','quarry',1006,279)],
      bosses:[{id:'syrava',type:'syrava',x:731,y:455},{id:'asterion',type:'asterion',x:1068,y:228}],
      resources:list([[190,658,'herb'],[224,532,'ore'],[370,561,'herb'],[476,463,'ore'],[542,535,'ore'],[643,523,'herb'],
        [812,515,'ore'],[894,534,'herb'],[1004,544,'ore'],[1112,539,'ore'],[975,308,'herb'],[1154,330,'ore']]),
      mobs:list([[205,583,'shade'],[283,580,'shardling'],[377,532,'crystalguard'],[474,513,'shardling'],[513,564,'shade'],
        [578,508,'crystalguard'],[835,509,'shardling'],[904,576,'shade'],[977,565,'crystalguard'],[1050,560,'shardling'],
        [1110,507,'shade'],[938,360,'crystalguard'],[986,329,'shardling'],[1188,315,'crystalguard'],[1176,235,'shade']])
    },
    roads:[
      [45,[[94,635],[154,611],[233,582],[305,566],[370,543],[425,526],[494,532],[577,514],[641,474],[731,455],[810,434],[872,398],[923,351],[969,297],[1020,256],[1068,228]]],
      [31,[[812,454],[838,528],[904,565],[955,555],[1050,562],[1110,507],[1130,477]]],
      [25,[[1068,228],[1147,217],[1190,248],[1188,315],[1154,330]]],
      [25,[[425,527],[472,579],[474,631],[435,682],[376,691]]],
      [25,[[700,511],[702,558],[697,641],[725,685],[803,685],[851,653],[904,576]]]
    ],
    islands:[[165,602,143,150],[410,537,141,137],[484,610,87,77],[728,452,165,139],[1068,229,180,143],
      [960,329,121,99],[992,542,161,121],[742,676,126,91],[376,674,69,56]],
    arenas:[{x:731,y:455,rx:112,ry:79},{x:1068,y:228,rx:126,ry:85}]
  };
  const valleyRegion = {
    id:'valley', name:'Valle di Lùmora',description:'Un borgo, un bosco incantato e la strada oltre le radici.',
    width:valley.width,height:valley.height,spawn:valley.spawn,
    landmarks:valley.landmarks.concat(landmarks([['Varco delle Braci',1465,374]])),
    points:{...valley.points,bosses:[],gates:[gate('east-pass',1465,374,'Entra nella Cava delle Braci','quarry',145,606,1)]}
  };

  const regions={valley:valleyRegion,quarry,rift};
  const cache=new Map();
  let active=valleyRegion, seed=19425, builtValley=null, area=null;
  const clamp = (v,min,max) => Math.min(max,Math.max(min,v));
  function rng(value) {
    let n=value>>>0;
    return () => (n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296;
  }
  function hash(x,y,s=0){
    let h=Math.imul(x+1904,374761393)+Math.imul(y+327,668265263)+Math.imul(s,69069);
    h=Math.imul(h^(h>>>13),1274126177);
    return (h^(h>>>16))>>>0;
  }
  function noise(x,y,size,s){
    const a=Math.floor(x/size),b=Math.floor(y/size);
    let u=x/size-a,v=y/size-b;
    u=u*u*(3-2*u);v=v*v*(3-2*v);
    const q=(i,j)=>hash(i,j,s)/4294967295;
    const top=q(a,b)*(1-u)+q(a+1,b)*u, bottom=q(a,b+1)*(1-u)+q(a+1,b+1)*u;
    return top*(1-v)+bottom*v;
  }
  function canvas(w,h){
    const c=document.createElement('canvas');
    c.width=w;c.height=h;
    return c;
  }
  function rect(c,x,y,w,h,color){
    c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));
  }
  function poly(c,pts,color){
    c.fillStyle=color;c.beginPath();
    for (const [i,[x,y]] of pts.entries()){if(i)c.lineTo(x,y);else c.moveTo(x,y);}
    c.closePath();c.fill();
  }
  function oval(c,x,y,rx,ry,color){
    c.fillStyle=color;
    for(let j=-Math.round(ry);j<=ry;j++){
      const d=Math.round(rx*Math.sqrt(Math.max(0,1-j*j/(ry*ry))));
      c.fillRect(Math.round(x)-d,Math.round(y+j),d*2+1,1);
    }
  }
  function pixLine(c,x,y,tx,ty,color,w=1){
    const count=Math.max(1,Math.ceil(Math.max(Math.abs(tx-x),Math.abs(ty-y))));
    c.fillStyle=color;
    for(let i=0;i<=count;i++)c.fillRect(Math.round(x+(tx-x)*i/count),Math.round(y+(ty-y)*i/count),w,w);
  }
  function track(c,pts,w,color){
    c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.beginPath();
    for (const [i,[x,y]] of pts.entries()){if(i)c.lineTo(x,y);else c.moveTo(x,y);}
    c.stroke();
  }
  function near(p,x,y,r){return (p.x-x)**2+(p.y-y)**2<r*r;}
  function roadDistance(roads,x,y){
    let d=Infinity;
    for(const [width,points] of roads)for(let i=1;i<points.length;i++){
      const [a,b]=points[i-1],[xx,yy]=points[i],dx=xx-a,dy=yy-b;
      const u=clamp(((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy),0,1);
      d=Math.min(d,(x-a-dx*u)**2+(y-b-dy*u)**2-(width*.36)**2);
    }
    return d;
  }
  function quarryHazard(x,y){
    const n=6*Math.sin(x*.046+y*.037)+4*Math.sin(y*.093);
    const a=Math.hypot((x-278+n)/213,(y-225+n)/114);
    const b=Math.hypot((x-828+n)/265,(y-736+n)/108);
    // The central channel is bridged at the main track and has a second ford.
    const center=550+Math.sin(y*.008)*37+Math.cos(y*.015)*13;
    const channel=Math.abs(x-center)<36+9*Math.sin(y*.035) && y<739 && !(y>491&&y<562) && !(y>632&&y<667);
    return a<1||b<1||channel;
  }
  function riftGround(x,y,baseRoads){
    const n=7*Math.sin(x*.041+y*.032)+4*Math.cos(y*.069);
    for(const [a,b,rx,ry] of rift.islands){
      if(((x-a+n)/rx)**2+((y-b+n)/ry)**2<1)return true;
    }
    return baseRoads;
  }
  function solidAt(map,x,y){
    const mx=Math.floor(x/2),my=Math.floor(y/2);
    return mx>=0&&my>=0&&mx<map.maskW&&my<map.maskH&&map.mask[my*map.maskW+mx]===1;
  }
  const groundColors={
    quarry:[[72,57,61],[88,64,62],[102,72,64],[115,80,66],[131,92,71]],
    rift:[[45,46,74],[55,54,87],[62,61,100],[65,70,109],[78,79,123]]
  };
  const strata={
    quarry:[[104,615,138,94,.52],[552,525,146,91,.61],[824,341,192,128,1],[1044,256,130,94,.37]],
    rift:[[425,502,154,112,.63],[731,455,174,124,.56],[1058,219,196,138,1],[955,555,154,104,.55]]
  };
  function terrainLight(name,x,y){
    let light=0;
    for(const [cx,cy,rx,ry,level] of strata[name]){
      const falloff=1-((x-cx)/rx)**2-((y-cy)/ry)**2;
      if(falloff>0)light=Math.max(light,falloff*falloff*level);
    }
    return light;
  }
  function vertexColor(map,x,y,ground,edge,face,road){
    const stir=hash(x,y,map.seed), isRift=map.reg.id==='rift';
    if(ground){
      const table=groundColors[map.reg.id];
      const broad=noise(x,y,83,map.seed),fine=noise(x,y,18,map.seed+71);
      const v=broad*.73+fine*.27;
      const choice=clamp(Math.floor(v*5),0,4);
      const rgb=edge?(isRift?[109,108,140]:[132,96,76]):road?(isRift?[84,87,116]:[111,87,70]):table[choice];
      const grit=stir%7-3, light=terrainLight(map.reg.id,x,y);
      const ledge=(y+Math.floor(broad*14))%15<2&&!road&&!edge?4:0;
      return [rgb[0]+grit+(isRift?11:37)*light+ledge,rgb[1]+grit+(isRift?22:19)*light+ledge,rgb[2]+grit+(isRift?31:3)*light+ledge];
    }
    if(face){
      const seam=(y+(stir>>>27)%4)%14, shimmer=(seam>9?11:seam===0?-4:0)+stir%5;
      const base=solidAt(map,x,y-6)?6:0;
      return isRift?[41+shimmer,39+shimmer+base,70+shimmer+base]:[65+shimmer+base,44+shimmer,51+shimmer];
    }
    if(isRift){
      const fog=noise(x,y,128,map.seed)*.81+noise(x,y,44,map.seed+6)*.19, d=stir%4;
      const cloud=Math.max(0, fog-.48)*2;
      return [12+fog*24+d,13+fog*16+cloud*10+d,34+fog*38+cloud*13+d];
    }
    const ripple=.5+.5*Math.sin(y*.056+Math.sin(x*.019)*2.8), ember=noise(x,y,31,map.seed+31);
    if(x<29||y<31||x>map.reg.width-26||y>map.reg.height-27)return [31+stir%10,26+stir%7,34+stir%9];
    const current=Math.max(0,ripple*ember-.24)*1.4;
    return [108+ember*53+current*54,36+ember*30+current*48,35+stir%8+current*8];
  }
  function prepareTerrain(reg,worldSeed){
    const map={reg,seed:worldSeed,maskW:Math.ceil(reg.width/2),maskH:Math.ceil(reg.height/2),scenery:[],signals:[],
      index:new Map(), sprites:new Map(), image:canvas(reg.width,reg.height), chart:null};
    const {maskW,maskH}=map, isRift=reg.id==='rift';
    map.mask=new Uint8Array(maskW*maskH);
    const roads=new Uint8Array(maskW*maskH);
    // Paint every route to a coarse surface once; query the result during generation.
    const routeCanvas=canvas(maskW,maskH),rc=routeCanvas.getContext('2d');
    for(const [w,points] of reg.roads)track(rc,points.map(([x,y])=>[x/2,y/2]),w*.52,'#fff');
    const routePixels=rc.getImageData(0,0,maskW,maskH).data;
    for(let j=0;j<maskH;j++)for(let i=0;i<maskW;i++){
      const x=i*2,y=j*2,index=j*maskW+i,road=routePixels[index*4+3]>170;
      roads[index]=road;
      const boundary=30+5*Math.sin((x+y)*.032);
      map.mask[index]=Number(x>boundary&&y>boundary&&x<reg.width-boundary&&y<reg.height-boundary&&
        (isRift?riftGround(x,y,road):!quarryHazard(x,y)));
    }
    const coarse=canvas(maskW,maskH),surface=coarse.getContext('2d'),data=surface.createImageData(maskW,maskH);
    for(let j=0;j<maskH;j++)for(let i=0;i<maskW;i++){
      const index=j*maskW+i,x=i*2,y=j*2,ground=map.mask[index]===1;
      const edge=ground&&(!solidAt(map,x-4,y)||!solidAt(map,x+4,y)||!solidAt(map,x,y+4)||!solidAt(map,x,y-4));
      const face=!ground&&(solidAt(map,x,y-14)||solidAt(map,x,y-6));
      const rgb=vertexColor(map,x,y,ground,edge,face,roads[index]===1);
      const c=index*4;data.data[c]=rgb[0];data.data[c+1]=rgb[1];data.data[c+2]=rgb[2];data.data[c+3]=255;
    }
    surface.putImageData(data,0,0);
    map.ctx=map.image.getContext('2d');
    map.ctx.imageSmoothingEnabled=false;
    map.ctx.drawImage(coarse,0,0,reg.width,reg.height);
    return map;
  }
  function addObject(map,type,x,y,v=0,r=0){
    const item={type,x,y,v,r};
    map.scenery.push(item);
    if(r<=0)return;
    for(let j=Math.floor((y-r)/48);j<=Math.floor((y+r)/48);j++)for(let i=Math.floor((x-r)/48);i<=Math.floor((x+r)/48);i++){
      const id=j*64+i;
      if(!map.index.has(id))map.index.set(id,[]);
      map.index.get(id).push(item);
    }
  }
  function collision(map,x,y,r=6){
    if(!Number.isFinite(x+y)||!solidAt(map,x,y)||!solidAt(map,x-r,y)||!solidAt(map,x+r,y)||!solidAt(map,x,y-r)||!solidAt(map,x,y+r))return false;
    const d=r*.7;
    if(!solidAt(map,x+d,y+d)||!solidAt(map,x+d,y-d)||!solidAt(map,x-d,y+d)||!solidAt(map,x-d,y-d))return false;
    for(let j=Math.floor((y-r)/48);j<=Math.floor((y+r)/48);j++)for(let i=Math.floor((x-r)/48);i<=Math.floor((x+r)/48);i++){
      const nearby=map.index.get(j*64+i);
      if(nearby&&nearby.some(o=>(x-o.x)**2+(y-o.y)**2<(o.r+r)**2))return false;
    }
    return true;
  }

  function paintStones(map,random){
    const c=map.ctx,{width,height}=map.reg,rift=map.reg.id==='rift';
    const colors=rift?['#464973','#68668f','#9697b0','#5b5c81']:['#523c46','#946d5e','#b2876c','#765650'];
    for(let i=0;i<15000;i++){
      const x=Math.floor(random()*width),y=Math.floor(random()*height);
      if(solidAt(map,x,y)){
        const mark=random(),col=colors[Math.floor(random()*colors.length)];
        if(mark<.86)rect(c,x,y,mark>.75?3:2,mark>.51?1:2,col);
        else if(solidAt(map,x-8,y+2)&&solidAt(map,x+8,y-3)){
          const n=2+Math.floor(random()*8);
          pixLine(c,x-n,y,x+1,y-2,col);
          pixLine(c,x+1,y-2,x+n,y-1,col);
          rect(c,x+2,y-2,2,1,colors[rift?2:1]);
        }
      }else if(rift && random()<.074){
        const tone=random();
        rect(c,x,y,tone>.97?2:1,tone>.92?2:1,tone>.88?'#ada6ce':tone>.50?'#6a5a96':'#474273');
      }else if(!rift&&random()<.17&&quarryHazard(x,y)){
        const w=4+Math.floor(random()*Math.floor(5+random()*16));
        if(solidAt(map,x+w,y)||solidAt(map,x-4,y))continue;
        pixLine(c,x-3,y-1,x,y,'#e06549');
        rect(c,x,y,w,1,random()>.35?'#b8513e':'#d27754');
        if(random()>.9)map.signals.push({x,y,size:w,kind:'ember',phase:random()*6.3});
      }
    }
    for(let i=0;i<850;i++){
      const x=(random()*width)|0,y=(random()*height)|0;
      if(!solidAt(map,x,y)||solidAt(map,x,y+6))continue;
      pixLine(c,x,y+1,x-1,y+5,rift?'#b49fad':'#ae755a');
      pixLine(c,x+1,y+2,x,y+10,rift?'#302642':'#593d46');
      if(rift&&random()>.50)map.signals.push({x,y:y+2,size:2,kind:'splash',phase:random()*6.3});
    }
  }
  function paintTerrainRelief(map){
    const {ctx:c,reg}=map,rift=reg.id==='rift';
    for(let y=36;y<reg.height-28;y+=6)for(let x=36;x<reg.width-35;x+=6){
      const h=hash(x,y,map.seed+177),px=x+h%4,py=y+(h>>>5)%4;
      const land=solidAt(map,px,py);
      if(land&&h%23===0&&solidAt(map,px+10,py)&&roadDistance(reg.roads,px,py)>4){
        const len=4+(h>>>9)%8;
        pixLine(c,px,py,px+len,py+1,rift?'#464365':'#59434c');
        rect(c,px+1,py-1,len-2,1,rift?'#8384a1':'#9d7562');
        if(h%3===0)rect(c,px+len-3,py-2,2,1,rift?'#b2a8bb':'#bb8a68');
      }
      if(!land&&h%8===0&&solidAt(map,px,py-8)){
        const len=4+(h>>>12)%6;
        rect(c,px,py+1,len,1,rift?'#4d526f':'#ae5f48');
        rect(c,px+1,py+2,len-2,1,rift?'#2d303f':'#703d42');
      }
      if(!land&&!solidAt(map,px,py-14)&&!solidAt(map,px+14,py)&&h%37===0){
        const len=3+(h>>>11)%12;
        rect(c,px,py,len,1,rift?'#897faa21':'#ec865448');
        if(h%3===0)rect(c,px+1,py+2,len*.64,1,rift?'#aac2d625':'#ffc37b68');
      }
    }
  }
  function paintArena(c,a,isRift,rank){
    const {x,y,rx,ry}=a;
    const stones=isRift?['#342e54','#77708f','#aa9faf','#59546e','#686081','#9aadd1']:['#48343d','#86654e','#cf9e72','#75534f','#8b6355','#d8a680'];
    oval(c,x,y+6,rx+6,ry+5,stones[0]);
    oval(c,x,y,rx+2,ry+2,stones[1]);
    oval(c,x,y-1,rx,ry,stones[2]);
    oval(c,x,y+1,rx-4,ry-4,stones[3]);
    oval(c,x,y,rx-9,ry-8,stones[4]);
    for(let j=-ry+12;j<=ry-10;j+=12){
      const dx=Math.round((rx-9)*Math.sqrt(Math.max(0,1-(j/(ry-8))**2)));
      pixLine(c,x-dx,y+j,x+dx,y+j,stones[3]);
      for(let i=-dx+9+((j+216)%24);i<dx-6;i+=21){
        rect(c,x+i,y+j,1,10,stones[3]);
        rect(c,x+i+2,y+j+2,8,1,stones[2]);
        rect(c,x+i+5,y+j+1,4,1,stones[1]);
      }
    }
    const n=rank===2?16:12;
    const vertices=[];
    for(let i=0;i<n;i++){
      const ang=Math.PI*2*i/n;
      const px=x+Math.cos(ang)*rx*.65,py=y+Math.sin(ang)*ry*.65;
      vertices.push([px,py]);
      rect(c,px-2,py,4,1,stones[5]);
      rect(c,px-1,py-2,2,5,stones[5]);
      const tx=x+Math.cos(ang)*rx*.92,ty=y+Math.sin(ang)*ry*.87;
      pixLine(c,px,py,tx,ty,stones[1],2);
      pixLine(c,tx-3,ty,tx+3,ty,stones[2]);
    }
    for(let i=0;i<n;i++){
      const [xa,ya]=vertices[i],[xb,yb]=vertices[(i+1)%n];
      pixLine(c,xa,ya,xb,yb,stones[1],2);
    }
    const motif=rank===2?25:18;
    poly(c,[[x,y-motif],[x+motif*1.34,y],[x,y+motif],[x-motif*1.34,y]],stones[3]);
    poly(c,[[x,y-motif+5],[x+motif,y],[x,y+motif-5],[x-motif,y]],stones[1]);
    poly(c,[[x,y-motif+8],[x+motif*.60,y],[x,y+motif-8],[x-motif*.60,y]],stones[4]);
    if(isRift){
      pixLine(c,x,y-motif/2,x,y+motif/2,stones[5]);
      pixLine(c,x-motif*.6,y,x+motif*.6,y,stones[5]);
    }else{
      pixLine(c,x-18,y-1,x+19,y-1,'#dab082',3);
      pixLine(c,x+6,y-6,x+6,y+9,'#dab082',3);
    }
  }
  function railSection(c,points){
    for(let i=1;i<points.length;i++){
      const [x,y]=points[i-1],[a,b]=points[i],len=Math.hypot(a-x,b-y),vx=(a-x)/len,vy=(b-y)/len;
      for(let j=0;j<len;j+=7){
        const xx=x+j*vx,yy=y+j*vy;
        pixLine(c,xx+vy*8,yy-vx*8,xx-vy*8,yy+vx*8,'#4d363b',2);
        pixLine(c,xx+vy*7,yy-vx*7-1,xx-vy*7,yy+vx*7-1,'#8a634e');
      }
      for(const d of [-4,4]){
        pixLine(c,x+vy*d,y-vx*d+1,a+vy*d,b-vx*d+1,'#40333b',3);
        pixLine(c,x+vy*d,y-vx*d,a+vy*d,b-vx*d,'#b89a79');
      }
    }
  }
  function paintQuarryInfra(map){
    const c=map.ctx;
    for(let x=494;x<622;x+=5){
      rect(c,x,503,5,47,x%2?'#634740':'#725143');
      rect(c,x,507,1,39,'#987452');
      rect(c,x,544,5,2,'#4b383b');
    }
    for(const y of [504,549]){
      rect(c,489,y,135,2,'#43363a');
      rect(c,493,y-2,131,2,'#a9825c');
      for(let x=497;x<631;x+=19){
        rect(c,x,y-7,3,9,'#533d3a');rect(c,x-1,y-7,5,2,'#9b7551');
      }
    }
    railSection(c,[[175,594],[236,568],[306,542],[356,529],[414,527],[485,529],[631,526],[687,501],[731,462],[780,414],[841,387],[916,328],[980,300],[1044,276]]);
    railSection(c,[[340,534],[353,581],[400,611],[451,642],[477,681]]);
    for(const [x,y] of [[193,566],[257,529],[410,554],[462,496],[649,563],[719,542],[941,389],[992,311],[1018,240]]){
      rect(c,x-6,y+4,12,3,'#493438');
      addObject(map,'lamp',x,y,Math.floor(x/17)%3,2);
    }
    for(const [x,y,type,v,r] of [
      [220,542,'hoist',0,16],[329,471,'hoist',1,18],[417,484,'pipeworks',1,14],
      [388,568,'mineCart',2,9],[265,583,'mineCart',0,10],[451,641,'mineCart',1,6],
      [402,477,'crates',0,8],[362,460,'crates',1,8],[597,478,'oreSpire',1,8],[685,551,'crates',2,8],
      [824,282,'forge',1,19],[738,321,'chimney',1,10],[903,315,'chimney',2,10],[795,284,'pipeworks',2,8],
      [775,430,'lamp',1,2],[876,420,'lamp',2,2],[921,358,'mineCart',1,9],[1003,325,'mineCart',2,8],
      [1104,261,'oreSpire',2,9],[967,243,'oreSpire',0,9]
    ])addObject(map,type,x,y,v,r);
  }
  function paintRiftInfra(map){
    const c=map.ctx;
    for(const [route,w] of [
      [[[276,574],[303,566],[330,561],[351,552]],19],
      [[[499,525],[529,524],[555,518],[590,507],[619,491]],20],
      [[[835,421],[854,411],[874,394],[896,375],[921,357]],20],
      [[[809,508],[832,529],[860,550],[897,568]],15]
    ]){
      track(c,route,w,'#514564');track(c,route,w-4,'#8f86a2');track(c,route,w-9,'#b0a3b5');
      for(let i=1;i<route.length;i++){
        const [x,y]=route[i-1],[a,b]=route[i],len=Math.hypot(a-x,b-y),vx=(a-x)/len,vy=(b-y)/len;
        for(let j=0;j<len;j+=6){
          const xx=x+j*vx,yy=y+j*vy;
          pixLine(c,xx+vy*(w*.4),yy-vx*(w*.4),xx-vy*(w*.4),yy+vx*(w*.4),'#665971');
        }
      }
    }
    for(const [x,y,type,v,r] of [
      [151,555,'spire',1,10],[175,678,'spire',3,10],[234,511,'obelisk',0,8],
      [271,572,'lamp',2,2],[349,553,'lamp',1,2],[452,482,'observatory',1,16],[417,460,'obelisk',1,6],
      [391,490,'spire',2,10],[467,593,'crates',0,8],[535,485,'arch',1,9],[580,554,'spire',3,8],
      [613,457,'obelisk',2,9],[671,393,'ruin',0,6],[767,380,'ruin',1,8],[799,421,'ruin',2,8],[670,512,'ruin',3,8],
      [855,572,'obelisk',1,8],[939,591,'spire',1,11],[1027,501,'spire',0,9],[1087,596,'arch',1,10],
      [926,313,'obelisk',0,6],[991,286,'ruin',0,8],[1156,259,'ruin',1,7],[1027,163,'ruin',2,8],[1143,175,'ruin',3,7],
      [1070,153,'astralCore',1,15],[1001,213,'lamp',2,3],[1136,211,'lamp',2,3]
    ])addObject(map,type,x,y,v,r);
  }
  function bulkScenery(map,random){
    const reg=map.reg,rift=reg.id==='rift';
    const reserved=[reg.spawn,...reg.landmarks,...reg.points.gates,...reg.points.resources,...reg.points.mobs,...reg.points.bosses];
    for(let y=43;y<reg.height-36;y+=29)for(let x=42;x<reg.width-38;x+=29){
      const xx=Math.round(x+random()*17),yy=Math.round(y+random()*15);
      if(!solidAt(map,xx,yy)||!solidAt(map,xx+9,yy)||!solidAt(map,xx-9,yy)||!solidAt(map,xx,yy+7))continue;
      if(reserved.some(p=>near(p,xx,yy,19)))continue;
      if(reg.arenas.some(a=>((xx-a.x)/(a.rx+13))**2+((yy-a.y)/(a.ry+12))**2<1))continue;
      if(roadDistance(reg.roads,xx,yy)<10||map.scenery.some(p=>near(p,xx,yy,18)))continue;
      const n=random(),v=(random()*9)|0;
      if(n>.63){
        addObject(map,rift?'spire':'oreSpire',xx,yy,v,Math.min(7,3+v));
        map.signals.push({x:xx,y:yy-14,size:2,kind:rift?'splash':'camp',phase:random()*6.3});
      }else if(n>.36)addObject(map,'stone',xx,yy,v,v%3===0?5:0);
      else if(n>.15)addObject(map,rift?'fanPlant':'ashPlant',xx,yy,v,0);
    }
  }
  function drawSignals(c,map,cam,t){
    for(const s of map.signals){
      if(s.x<cam.x-12||s.x>cam.x+cam.w+10||s.y<cam.y-12||s.y>cam.y+cam.h+12)continue;
      const beat=Math.sin(t*1.35+s.phase);if(beat<.48)continue;
      const x=s.x+(beat-.5)*4,y=s.y-(s.kind==='ember'?0:beat*4);
      const warm=s.kind==='ember'||s.kind==='camp';
      rect(c,x,y,warm?s.size*beat:2,1,warm?'#f09058':'#c6b4e5');
      if(beat>.87)rect(c,x+1,y-1,1,3,warm?'#ffda92':'#b7eced');
    }
  }
  function rockColumn(c,x,y,w,h,col){
    const [dark,base,light,glint]=col;
    poly(c,[[x-w,y],[x-w,y-h+7],[x-w*.55,y-h],[x+w*.5,y-h-2],[x+w,y-h+8],[x+w,y],[x+w*.4,y+3]],dark);
    poly(c,[[x-w+1,y-2],[x-w+1,y-h+7],[x-w*.54,y-h+1],[x+w*.46,y-h-2],[x+w*.63,y-h+8],[x+w*.4,y]],base);
    poly(c,[[x-w+1,y-h+7],[x-w*.54,y-h+1],[x+w*.46,y-h-2],[x+w,y-h+8],[x,y-h+10]],light);
    rect(c,x-w+2,y-h+10,2,h-10,light);
    rect(c,x-w*.40,y-h+3,w*.62,1,glint);
    for(let j=-h+13;j<-2;j+=7){
      rect(c,x-w+1,y+j,w+1,1,dark);
      rect(c,x+w*.1,y+j+1,w*.4,1,light);
    }
  }
  function cluster(c,v,isRift,random){
    const cols=isRift?[
      ['#272840','#555479','#76649d','#a494bc','#d4c1e2'],['#242640','#374a73','#4b8b9d','#6db7be','#cef1da'],
      ['#393150','#564271','#946eaa','#be92bd','#ead4ea']
    ]:[
      ['#53373a','#795048','#b97954','#dba373','#f6cc91'],['#493441','#664554','#ae725e','#c59873','#f1cd9a'],
      ['#442e36','#72464a','#96524c','#d88b65','#f5b77d']
    ];
    const p=cols[v%cols.length],height=14+v%4*4;
    oval(c,0,1,11+v%3,4,p[0]);
    for(const [x,y,w,h] of [[-7,0,4,height*.62],[6,1,4,height*.78],[-1,0,6,height+3],[8,2,3,height*.51]]){
      const a=Math.round(x+w*.5),top=y-Math.round(h);
      poly(c,[[x-w,y-2],[x-w,y-h*.68],[a,top],[x+w+2,y-h*.55],[x+w,y-4],[x+1,y+1]],p[1]);
      poly(c,[[x-w,y-2],[x-w,y-h*.68],[a,top],[x+1,y+1]],p[2]);
      poly(c,[[x-w,y-h*.68],[a,top],[x+1,y-h*.42]],p[3]);
      pixLine(c,a,top+2,x+1,y-h*.44,p[4]);
      rect(c,x-w+2,y-h*.49,1,h*.17,p[4]);
    }
    for(let i=0;i<13;i++){const x=random()*29-14,y=random()*6;rect(c,x,y,1+random()*2,1,p[1+(i%3)]);}
  }
  function beam(c,x,y,w,h){
    rect(c,x,y,w,h,'#3f3037');rect(c,x+1,y,w-2,h-1,'#745049');
    rect(c,x+1,y+1,1,h-2,'#a6795c');rect(c,x+1,y+1,w-2,1,'#b0825d');
  }
  function metal(c,x,y,w,h){
    rect(c,x,y,w,h,'#353443');rect(c,x+1,y+1,w-2,h-2,'#665762');
    rect(c,x+1,y+1,w-2,1,'#a48b7b');
    rect(c,x+1,y+1,1,h-2,'#998074');
  }
  function bigProp(g,type){
    if(type==='hoist'){
      for(const x of [-37,31]){
        rockColumn(g,x,-1,6,12,['#43353b','#6b5652','#927964','#ba9d84']);
        beam(g,x-3,-62,7,61);
        beam(g,x-5,-57,11,8);
        pixLine(g,x,-44,x+(x<0?19:-19),-62,'#986f4e',3);
      }
      beam(g,-42,-67,80,8);beam(g,-40,-61,75,4);
      for(let x=-39;x<41;x+=9)metal(g,x,-66,3,7);
      oval(g,-5,-61,9,8,'#422f34');oval(g,-5,-61,6,5,'#9c7253');oval(g,-5,-61,2,2,'#5f4945');
      pixLine(g,-8,-54,-8,-18,'#584749',2);pixLine(g,2,-55,3,-23,'#a58066');
      for(let y=-54;y<-17;y+=4)rect(g,-8,y,2,1,'#c09b75');
      beam(g,-24,-14,42,13);metal(g,-24,-15,42,4);
      for(let x=-20;x<18;x+=6)rect(g,x,-11,2,8,'#ae7954');
      return;
    }
    if(type==='forge'){
      oval(g,0,2,55,12,'#513d43');metal(g,-53,-8,105,10);
      rockColumn(g,-38,-7,13,56,['#48373f','#6c5356','#9b7570','#b08b80']);
      rockColumn(g,37,-7,13,56,['#48373f','#6c5356','#9b7570','#b08b80']);
      poly(g,[[-32,-7],[-33,-63],[-25,-87],[-16,-95],[17,-95],[27,-85],[34,-61],[32,-7]],'#332b38');
      poly(g,[[-30,-10],[-29,-62],[-21,-81],[-12,-88],[12,-88],[24,-79],[30,-62],[28,-10]],'#735454');
      poly(g,[[-30,-52],[-29,-63],[-20,-81],[-11,-86],[11,-86],[22,-78],[29,-60],[28,-52]],'#936d60');
      metal(g,-14,-111,30,25);metal(g,-17,-113,36,6);metal(g,-15,-124,31,10);
      for(let i=-3;i>=-62;i-=7)rect(g,-30,i,59,1,'#4f3e47');
      poly(g,[[-20,-9],[-20,-33],[-16,-46],[-8,-52],[8,-52],[16,-47],[21,-32],[20,-9]],'#412e39');
      poly(g,[[-16,-11],[-16,-30],[-12,-40],[-6,-46],[7,-46],[13,-42],[17,-28],[17,-11]],'#ac5447');
      poly(g,[[-14,-13],[-14,-28],[-10,-35],[-6,-40],[7,-40],[13,-34],[15,-25],[15,-13]],'#f38a54');
      poly(g,[[-9,-14],[-12,-27],[-8,-24],[-3,-33],[3,-21],[8,-29],[14,-17],[14,-12]],'#ffcf80');
      for(let x=-17;x<=17;x+=6)metal(g,x,-39,2,28);
      for(const x of [-32,29]){
        metal(g,x,-36,6,18);rect(g,x+1,-33,3,7,'#eea567');rect(g,x+1,-33,3,2,'#ffe69e');
      }
      metal(g,-26,-13,53,5);metal(g,-26,-8,52,4);
      return;
    }
    if(type==='observatory'){
      oval(g,0,5,51,13,'#443d58');
      for(let k=0;k<3;k++){
        oval(g,0,-k*4,46-k*4,14-k*2,'#58506d');
        oval(g,0,-2-k*4,45-k*4,13-k*2,'#83788f');
        oval(g,0,-3-k*4,41-k*4,9-k*2,'#998aa4');
      }
      for(const x of [-30,30])rockColumn(g,x,-8,7,39,['#3f3859','#6b608d','#a28cae','#d6bfd0']);
      for(let i=0;i<16;i++){
        const a=i*Math.PI/8,b=(i+1)*Math.PI/8;
        pixLine(g,Math.cos(a)*25,-40+Math.sin(a)*28,Math.cos(b)*25,-40+Math.sin(b)*28,'#665f93',3);
        pixLine(g,Math.cos(a)*23,-41+Math.sin(a)*27,Math.cos(b)*23,-41+Math.sin(b)*27,'#c2abc8');
        pixLine(g,Math.cos(a)*34,-41+Math.sin(a)*12,Math.cos(b)*34,-41+Math.sin(b)*12,'#9a8db5',2);
      }
      poly(g,[[0,-58],[13,-40],[0,-20],[-13,-40]],'#3d507c');
      poly(g,[[0,-58],[0,-40],[-13,-40]],'#a7d4d7');
      poly(g,[[0,-58],[13,-40],[0,-40]],'#738eae');
      poly(g,[[0,-20],[13,-40],[0,-40]],'#586186');
      pixLine(g,-9,-40,8,-40,'#d4f0df');
      rect(g,-1,-45,2,12,'#d4f0df');
      return;
    }
    if(type==='astralCore'){
      const p=['#332e53','#645279','#8778a8','#c5b3d8'];
      for(const x of [-38,-28,28,38])rockColumn(g,x,0,5,70-Math.abs(x),p);
      oval(g,0,3,44,8,'#39334d');oval(g,0,-1,37,6,'#6a5e86');oval(g,0,-3,31,5,'#b4a0c2');
      for(const x of [-27,27])pixLine(g,x,-10,x*.5,-65,'#988aba',3);
      for(const x of [-20,20]){
        pixLine(g,x,-32,x*.66,-57,'#6157a0',3);pixLine(g,x*.66,-57,0,-69,'#a08cc9',3);
      }
      poly(g,[[0,-71],[14,-55],[16,-40],[0,-21],[-14,-41],[-13,-56]],'#37346b');
      poly(g,[[0,-71],[0,-42],[-14,-41],[-13,-56]],'#9badd8');
      poly(g,[[0,-71],[14,-55],[0,-42]],'#656ac0');
      poly(g,[[0,-42],[16,-40],[0,-21]],'#675a98');
      pixLine(g,0,-66,0,-43,'#f0d6e5',2);pixLine(g,-6,-52,6,-52,'#e5d2f5');
      return;
    }
    if(type==='arch'){
      for(const x of [-24,24])rockColumn(g,x,0,7,42,['#38364d','#675d7b','#9f92ad','#c9b7c7']);
      const left=[[-29,-41],[-25,-52],[-17,-60],[-6,-61]];
      const right=[[29,-41],[25,-52],[19,-58],[11,-59]];
      for(const path of [left,right])for(let i=1;i<path.length;i++){
        const [x,y]=path[i-1],[xx,yy]=path[i];pixLine(g,x,y,xx,yy,'#605874',7);pixLine(g,x+1,y,xx+1,yy,'#a08fac',3);
      }
      return;
    }
    if(type==='chimney'){
      rockColumn(g,0,0,11,62,['#40353f','#694e52','#977163','#c48e76']);
      for(let y=-60;y<0;y+=12)metal(g,-12,y,24,3);
      metal(g,-13,-66,26,7);
      return;
    }
    if(type==='pipeworks'){
      beam(g,-26,-11,52,11);
      for(const y of [-17,-28,-37]){
        for(const x of [-20,14])metal(g,x,y,8,-y-5);
        metal(g,-17,y,36,5);
        for(let x=-13;x<16;x+=13)metal(g,x,y-1,3,7);
      }
      return;
    }
  }
  function smallProp(c,type,v,rift,random){
    if(type==='spire'||type==='oreSpire'){cluster(c,v,rift,random);return;}
    if(type==='obelisk'||type==='ruin'){
      const h=type==='ruin'?18+v%4*4:30+v%3*5;
      const colors=['#3e3a59','#6b6484','#a494a9','#c7b6c4'];
      oval(c,0,1,11,4,'#433b55');
      rockColumn(c,0,-2,5+v%3,h,colors);
      if(type==='obelisk'){
        poly(c,[[0,-h+10],[3,-h+15],[0,-h+21],[-3,-h+15]],'#799bb7');
        pixLine(c,-1,-h+13,-1,-h+17,'#dddcdf');
      }else{
        pixLine(c,1,-h+6,-2,-h+10,'#49425f',2);
        pixLine(c,-2,-h+10,1,-h+14,'#49425f');
      }
      return;
    }
    if(type==='lamp'){
      const metalColor=rift?'#7f769c':'#ac8b65';
      rect(c,-5,0,11,2,'#433541');
      metal(c,-2,-18,5,19);metal(c,-3,-19,6,2);rect(c,2,-18,5,1,metalColor);
      metal(c,4,-16,7,9);
      rect(c,5,-15,4,5,rift?'#a19ac9':'#d98657');
      rect(c,6,-15,2,4,rift?'#d7faf0':'#ffe09a');
      return;
    }
    if(type==='crates'||type==='mineCart'){
      if(type==='crates'){
        for(const [x,y] of [[-11,0],[0,1],[-7,-7]]){
          beam(c,x,y-9,11,9);
          pixLine(c,x+1,y-2,x+8,y-7,'#ac775c',2);
          rect(c,x+1,y-7,8,1,'#b08963');
        }
      }else{
        for(const x of [-9,8]){oval(c,x,-3,4,4,'#423840');oval(c,x,-3,2,2,'#9b7a68');}
        poly(c,[[-15,-16],[14,-16],[11,-5],[-12,-5]],'#5b4044');
        poly(c,[[-14,-15],[12,-15],[10,-7],[-10,-6]],'#976547');
        metal(c,-16,-16,31,3);metal(c,-11,-7,21,2);
        for(let i=0;i<16;i++)rect(c,random()*22-12,-18-random()*4,3,2,i%2?'#c38963':'#ad6c59');
      }return;
    }
    if(type==='stone'){
      const p=rift?['#413e5e','#696986','#9a8caa']:['#49383b','#856354','#b0846f'];
      const h=4+(v%6),w=5+(v%4)*2;
      poly(c,[[-w,0],[-w+2,-h+2],[-3,-h-1],[2,-h-2],[w-2,-h+2],[w,0],[4,2]],p[0]);
      poly(c,[[-w+1,-1],[-w+2,-h+2],[-3,-h-1],[2,-h-2],[w-2,-h+2],[2,-h+4]],p[1]);
      rect(c,-4,-h,5,1,p[2]);return;
    }
    const colors=rift?['#584369','#7d6997','#b290ae']:['#694342','#9b5e4f','#d58761'];
    for(let i=0;i<7;i++){
      const x=(random()-.5)*16,y=Math.round(random()*4);
      pixLine(c,x,y,x*.7-2,y-4-random()*4,colors[i%3]);rect(c,x*.7-2,y-5,2,1,colors[(i+1)%3]);
    }
  }
  function drawGate(c,o,t,style){
    const {x,y}=o,rift=style==='rift',isLift=o.id==='glass-lift'||o.id==='quarry-return';
    const p=rift?['#34344d','#676184','#ac96b1','#dac6d6']:['#453940','#7e6061','#a48075','#d5b593'];
    c.save();c.translate(x,y);
    oval(c,0,2,27,7,p[0]);oval(c,0,1,23,4,p[1]);
    if(isLift){
      metal(c,-24,-6,48,8);
      for(let i=-20;i<=20;i+=5){rect(c,i,-7,3,5,p[2]);rect(c,i,-4,3,2,p[1]);}
      for(const dx of [-22,20]){
        rockColumn(c,dx,-1,4,36,p);
        metal(c,dx-2,-36,4,8);
        for(let y=-35;y<-6;y+=3)rect(c,dx,y,2,1,p[3]);
      }
      metal(c,-27,-44,54,7);
      for(let i=-21;i<=20;i+=8)rect(c,i,-43,3,2,p[3]);
    }else{
      for(const dx of [-17,17])rockColumn(c,dx,0,7,37,p);
      poly(c,[[-22,-34],[-20,-41],[-12,-47],[-2,-50],[9,-48],[19,-43],[23,-34],[14,-34],[7,-39],[-6,-40],[-15,-34]],p[1]);
      pixLine(c,-20,-41,-12,-47,p[3],2);pixLine(c,-12,-47,-2,-50,p[3],2);
      pixLine(c,-2,-50,9,-48,p[2],2);pixLine(c,9,-48,19,-43,p[2],2);
      poly(c,[[-12,-2],[-12,-34],[-5,-38],[7,-38],[13,-32],[13,-2]],rift?'#43315a':'#44323a');
    }
    const glow=rift?'#c1b6e2':isLift?'#b3d5cd':'#e6ac72';
    for(const dx of [-18,18]){
      rect(c,dx-2,-26,5,8,p[0]);rect(c,dx-1,-24,3,4,glow);
      if(Math.sin(t*2.2+dx)>.55)rect(c,dx,-25,1,5,'#fff0c5');
    }
    for(let i=0;i<4;i++){
      const wave=((t*.72+i*.29)%1),px=Math.round(Math.sin(i*7+t*1.1)*8),py=Math.round(-5-26*wave);
      if(wave<.72)rect(c,px,py,2,1,glow);
    }
    c.restore();
  }
  function paintObject(c,map,o,t){
    if(o.type==='gate'){drawGate(c,o,t,map.reg.id);return;}
    const key=o.type+':'+o.v;
    let sprite=map.sprites.get(key);
    if(!sprite){
      sprite=canvas(152,146);
      const g=sprite.getContext('2d');g.translate(76,134);
      const random=rng(o.v*4219+o.type.charCodeAt(0)*193);
      if(['hoist','forge','observatory','astralCore','arch','chimney','pipeworks'].includes(o.type))bigProp(g,o.type);
      else smallProp(g,o.type,o.v,map.reg.id==='rift',random);
      map.sprites.set(key,sprite);
    }
    c.drawImage(sprite,Math.round(o.x)-76,Math.round(o.y)-134);
    if(o.type==='forge'||o.type==='chimney'){
      for(let i=0;i<6;i++){
        const time=(t*.35+i*.16)%1, y=o.y-(o.type==='forge'?117:64)-time*36,x=o.x+Math.sin(time*6+i)*5+time*10;
        rect(c,x,y,2+time*4,2+time*2,'rgba(190,125,112,'+(.40*(1-time))+')');
      }
    }
    if(o.type==='astralCore'||o.type==='observatory'){
      for(let i=0;i<7;i++){
        const a=t*.69+i*6.28/7;
        const dx=Math.cos(a)*29,dy=Math.sin(a)*16-(o.type==='astralCore'?50:39);
        if(Math.sin(a)<-.5)continue;
        rect(c,o.x+dx,o.y+dy,2,1,i%2?'#eddbf2':'#b6f0e5');
      }
    }
    if(o.type==='lamp'&&Math.sin(t*2.2+o.x)>.50){
      rect(c,o.x+6,o.y-16,1,6,'#fff1bc');rect(c,o.x+4,o.y-14,5,1,'#fff1bc');
    }
  }
  function build(reg,worldSeed){
    const map=prepareTerrain(reg,worldSeed);
    const random=rng(worldSeed+(reg.id==='quarry'?25773:77189)),rift=reg.id==='rift';
    paintStones(map,random);
    paintTerrainRelief(map);
    for(const [i,a] of reg.arenas.entries())paintArena(map.ctx,a,rift,i+1);
    if(rift)paintRiftInfra(map);else paintQuarryInfra(map);
    bulkScenery(map,random);
    for(const g of reg.points.gates)map.scenery.push({...g,type:'gate',r:0});
    map.scenery.sort((a,b)=>a.y-b.y);
    map.chart=canvas(390,Math.round(390*reg.height/reg.width));
    const m=map.chart.getContext('2d');m.imageSmoothingEnabled=false;
    m.drawImage(map.image,0,0,map.chart.width,map.chart.height);
    const scale=map.chart.width/reg.width;
    m.save();m.scale(scale,scale);
    for(const o of map.scenery)paintObject(m,map,o,0);
    m.restore();
    return map;
  }


  function setRegion(region, worldSeed=seed){
    if(!Object.hasOwn(regions,region))return false;
    const normalized=Number(worldSeed)>>>0;
    if(normalized!==seed){seed=normalized;cache.clear();}
    active=regions[region];
    if(region==='valley'){
      if(builtValley!==seed){valley.init(seed);builtValley=seed;}
      area=null;
    }else{
      if(!cache.has(region))cache.set(region, build(active,seed));
      area=cache.get(region);
    }
    return router;
  }
  function canWalk(x,y,r=6){return area?collision(area,x,y,r):valley.canWalk(x,y,r);}
  function drawGround(c,cam,t){
    if(!area){valley.drawGround(c,cam,t);return;}
    const x=Math.max(0,Math.floor(cam.x)),y=Math.max(0,Math.floor(cam.y));
    const w=Math.min(active.width-x,Math.ceil(cam.w)+1),h=Math.min(active.height-y,Math.ceil(cam.h)+1);
    if(w>0&&h>0)c.drawImage(area.image,x,y,w,h,x,y,w,h);
    drawSignals(c,area,cam,t);
  }
  function drawFront(c,cam,t,actors=[]){
    if(!area){
      const gates=active.points.gates.map(g=>({x:g.x,y:g.y,draw:ctx=>drawGate(ctx,g,t,'ruin')}));
      valley.drawFront(c,cam,t,actors.concat(gates));
      return;
    }
    const render=area.scenery.filter(o=>o.x>cam.x-124&&o.x<cam.x+cam.w+124&&o.y>cam.y-14&&o.y<cam.y+cam.h+130);
    const player=actors[0];
    for(const o of render.concat(actors).sort((a,b)=>a.y-b.y)){
      if(typeof o.draw==='function'){o.draw(c);continue;}
      const fade=player&&o.r>0&&Math.abs(player.x-o.x)<o.r+10&&player.y<o.y&&player.y>o.y-43;
      if(fade){c.save();c.globalAlpha=.48;}
      paintObject(c,area,o,t);
      if(fade)c.restore();
    }
  }
  function drawMap(c,w,h,p){
    if(!area){valley.drawMap(c,w,h,p);return;}
    c.save();c.imageSmoothingEnabled=false;c.drawImage(area.chart,0,0,w,h);
    if(p){
      const x=p.x/active.width*w,y=p.y/active.height*h;
      poly(c,[[x,y-4],[x+4,y],[x,y+4],[x-4,y]],'#24273e');
      poly(c,[[x,y-3],[x+2,y],[x,y+3],[x-2,y]],'#faf2ce');
    }
    c.restore();
  }
  const router={
    regions,
    get region(){return active.id;},
    get width(){return active.width;},get height(){return active.height;},
    get points(){return active.points;},get landmarks(){return active.landmarks;},get spawn(){return active.spawn;},
    init(value=19425){return setRegion('valley',value);},setRegion,canWalk,drawGround,drawFront,drawMap
  };
  window.World=router;
})();

