/* Estensione urbana della Selva degli Alambicchi, disegnata in pixel alla scala del mondo esistente. */
(() => {
  'use strict';

  const id='city-velaris',width=2144,height=1496;
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
      roofs:[['#465d55','#64836c','#91a283','#b6be9e'],['#3f5d62','#53878a','#79a6a2','#a7c0b0'],['#565768','#75798e','#9295a9','#b4b2bf']],wall:['#6c7264','#abb295','#c0c4a4']}
  ].map(Object.freeze);

  const services=[
    {id:'inn',kind:'inn',name:'Locanda della Lanterna Salmastra',x:1382,y:673,district:'wind',size:[116,59],style:'inn'},
    {id:'shop',kind:'shop',name:'Bottega dei Vetri Viaggianti',x:1591,y:458,district:'wind',size:[133,56],style:'shop'},
    {id:'forge',kind:'forge',name:'Forgia della Brace Chiara',x:493,y:1108,district:'kilns',size:[173,70],style:'forge'},
    {id:'guild',kind:'guild',name:'Gilda del Compasso',x:752,y:469,district:'lenses',size:[134,54],style:'guild'},
    {id:'archive',kind:'archive',name:'Archivio delle Maree Astrali',x:462,y:221,district:'lenses',size:[105,47],style:'archive'},
    {id:'academy',kind:'academy',name:'Accademia di Velaris',x:488,y:450,district:'lenses',size:[174,101],style:'academy'},
    {id:'house',kind:'house',name:'Casa del custode del canale',x:1782,y:1360,district:'lamps',size:[95,57],style:'house'}
  ].map(x=>Object.freeze({...x,region:id,point:Object.freeze({x:x.x,y:x.y}),range:24}));

  const west=[[61,182],[220,366],[402,581],[616,809],[846,977]];
  const east=[[1126,1287],[1321,1476],[1512,1674],[1711,1871],[1908,2083]];
  const bands=[[127,226],[292,450],[519,682],[767,926],[997,1178],[1250,1390]];
  const streetsY=[101,256,489,726,964,1218,1422];
  const streetsX=[45,200,385,598,828,1108,1304,1494,1693,1888,2104];
  const bridges=[256,726,1218], canal={left:994,right:1090};

  const parks=[
    {id:'atrium',x:409,y:300,w:176,h:150,tone:'lenses'},
    {id:'work-yard',x:622,y:787,w:185,h:125,tone:'kilns'},
    {id:'market-yard',x:1509,y:776,w:166,h:132,tone:'wind'},
    {id:'lamp-garden',x:1708,y:995,w:367,h:188,tone:'lamps'}
  ];

  const plazaRect={x:847,y:660,w:135,h:138};
  const landmarkRows=[
    {name:'Porta dei Maestri',x:156,y:726},
    {...plaza},
    {name:'Ponte delle Lenti',x:1042,y:726},
    {name:'Corte delle Fornaci',x:717,y:954},
    {name:'Giardino delle Tre Vasche',x:1888,y:1016},
    ...services.map(({id,name,x,y})=>({id,name,x,y}))
  ];
  const region={id,name:'Accademia di Velaris',description:'La città dei vetrai e degli astronomi, distesa fra corsi d’acqua e giardini.',
    width,height,continent:'continent-3',spawn,points:{gates:[],mobs:[],resources:[],bosses:[]},landmarks:landmarkRows};
  const waypointList=[
    {id:'entry',name:'Porta dei Maestri',...spawn}, {id:'exit',name:'Ritorno agli Alambicchi',...exit}, {...plaza},
    ...services.map(({id,name,x,y,district})=>({id,name,x,y,district})),
    ...districts.map(({id,name,x,y})=>({id:'district-'+id,name,x,y,district:id})),
    ...streetsX.slice(1,-1).flatMap((x,col)=>streetsY.slice(1,-1).map((y,row)=>({id:'street-'+col+'-'+row,x,y})))
  ].map(Object.freeze);

  const districtAt=(x,y)=>districts[x<canal.left?(y<759?0:1):(y<759?2:3)];
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
  function diamond(c,color,x,y,r=4){poly(c,color,[[x,y-r],[x+r,y],[x,y+r],[x-r,y]]);}
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
    for(const entry of services){
      const [w,h]=entry.size;
      addBuilding({name:entry.name,kind:entry.kind,x:entry.x,y:entry.y-19-h,w,h,door:entry.point,
        district:entry.district,style:entry.style,service:entry.id});
    }
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
      function clear(p,q){
        const n=Math.max(1,Math.ceil(Math.hypot(q.x-p.x,q.y-p.y)/4));
        for(let i=0;i<=n;i++)if(!canWalk(p.x+(q.x-p.x)*i/n,p.y+(q.y-p.y)*i/n,r))return false;
        return true;
      }
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
      const costs=new Int32Array(size),queue=new Int32Array(size);
      costs.fill(-2);costs[start]=-1;queue[0]=start;
      let used=1;
      for(let i=0;i<used;i++){
        const cur=queue[i];
        if(cur===end)break;
        const x=cur%nx,y=Math.floor(cur/nx);
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
          const px=x+dx,py=y+dy,n=at(px,py);
          if(px<0||py<0||px>=nx||py>=ny||costs[n]!==-2||!canWalk(px*step,py*step,r)||
            !canWalk((x+dx*.5)*step,(y+dy*.5)*step,r))continue;
          costs[n]=cur;queue[used++]=n;
        }
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

    let ground=null,chart=null;
    function drawGround(c,cam,time=0){
      if(!ground){const pair=paintTerrain(seed,buildings);ground=pair.ground;chart=pair.chart;}
      const x=Math.max(0,Math.floor(cam.x)),y=Math.max(0,Math.floor(cam.y));
      const cw=Math.min(width-x,Math.ceil(cam.w)+1),ch=Math.min(height-y,Math.ceil(cam.h)+1);
      if(cw>0&&ch>0)c.drawImage(ground,x,y,cw,ch,x,y,cw,ch);
      if(x+cw<canal.left||x>canal.right)return;
      const u=Math.floor(time*4);
      for(let py=Math.floor(y/11)*11;py<y+ch;py+=11){
        if(!hasWater(1042,py,0))continue;
        const dx=canal.left+9+((py*13+u*3)%57);
        rect(c,'rgba(142,180,171,.25)',dx,py,5+(py+u)%9,1);
      }
    }
    function drawFront(c,cam,t,actors=[]){
      const visible=(x,y,rx=64,ry=76)=>x>=cam.x-rx&&x<=cam.x+cam.w+rx&&y>=cam.y-20&&y<=cam.y+cam.h+ry;
      const p=actors[0],entries=[];
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
    }
    function drawMap(c,w,h,p){
      if(!chart){const pair=paintTerrain(seed,buildings);ground=pair.ground;chart=pair.chart;}
      c.save();c.imageSmoothingEnabled=false;c.drawImage(chart,0,0,w,h);
      for(const place of services){
        const x=place.x/width*w,y=place.y/height*h;
        rect(c,'#2f4148',x-2,y-2,5,5);rect(c,'#d6c69e',x-1,y-1,3,3);
      }
      if(p)diamond(c,'#fff3bb',p.x/width*w,p.y/height*h,3);
      c.restore();
    }
    return {region,buildings,districts,services,residences,waypoints,plaza,drawGround,drawFront,drawMap,canWalk,path,districtAt};
  }

  function paintTerrain(seed,buildings){
    const ground=canvas(width,height),c=ground.getContext('2d'),rnd=random(seed^0x476cf112);
    rect(c,'#38434a',0,0,width,height);
    for(const dto of districts){
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
    for(const dto of districts){
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
    const pr=plazaRect;
    rect(c,'#716b62',pr.x-2,pr.y-2,pr.w+4,pr.h+4);
    rect(c,'#afad94',pr.x,pr.y,pr.w,pr.h);
    for(let y=pr.y+6;y<pr.y+pr.h-5;y+=7){
      for(let x=pr.x+4+((y&1)?7:0);x<pr.x+pr.w-7;x+=15){
        rect(c,rnd()<.52?'#aca48a':'#bbb195',x,y,10,4);
        if(rnd()>.55)rect(c,'#969077',x+1,y+4,9);
      }
    }
    poly(c,'#6b8177',[[plaza.x-34,plaza.y],[plaza.x,plaza.y-31],[plaza.x+34,plaza.y],[plaza.x,plaza.y+31]]);
    poly(c,'#a4a996',[[plaza.x-29,plaza.y],[plaza.x,plaza.y-26],[plaza.x+29,plaza.y],[plaza.x,plaza.y+26]]);
    diamond(c,'#698c89',plaza.x,plaza.y,12);
    diamond(c,'#a6c4b4',plaza.x,plaza.y,8);
    for(const [dx,dy] of [[0,-17],[-19,0],[0,17],[19,0]])diamond(c,'#bdb8a0',plaza.x+dx,plaza.y+dy,3);

    const waterW=canal.right-canal.left;
    rect(c,'#3a5155',canal.left-6,22,waterW+13,height-40);
    rect(c,'#827c6b',canal.left-5,22,4,height-42);rect(c,'#81796b',canal.right+1,22,4,height-42);
    rect(c,'#2a4858',canal.left,22,waterW,height-43);
    for(let j=0;j<2350;j++){
      const x=canal.left+2+rnd()*(waterW-4),y=25+rnd()*(height-51);
      rect(c,['#345568','#406477','#365b68','#294b5a'][integer(rnd,0,3)],x,y,integer(rnd,2,11),integer(rnd,1,2));
    }
    for(const y of bridges){
      const left=canal.left-18,right=canal.right+18;
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
      const {x,y,w,h}=b.box,d=districts.find(z=>z.id===b.district);
      rect(map,b.service?'#e4d5a9':d.roofs[b.color][1],x/width*270,y/height*188,Math.max(3,w/width*270),Math.max(2,h/height*188));
    }
    return {ground,chart};
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
    const q=b.box,d=districts.find(w=>w.id===b.district),colors=d.roofs[b.color],rnd=random(b.skin);
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
    function windowAt(x0,y0,w0=9,h0=8){
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
      const awning=style==='inn'?'#935957':style==='shop'?'#657b75':'#84778a';
      for(const dx of [-w*.28,w*.20]){
        const left=midX+dx-5,top=y-front+4,awningWidth=Math.max(11,w*.2);
        rect(g,awning,left-2,top,awningWidth+4,6);
        for(let i=0;i<awningWidth;i+=5)rect(g,'rgba(217,201,155,.42)',left+i,top,2,7);
        rect(g,'#675b51',left,top+7,awningWidth,2);
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
    return {image,x:q.x-offset,y:q.y-raise};
  }

  function paintProp(c,o,time){
    const {x,y,name}=o,glow=(Math.floor(time*4+x/12)%4);
    if(name==='tree'){
      disk(c,'rgba(36,53,56,.52)',x,y+3,14,5);
      rect(c,'#62564a',x-2,y-19,4,19);rect(c,'#927759',x-1,y-16,1,16);
      disk(c,'#3c574f',x,y-19,14,13);disk(c,'#59745b',x-3,y-22,12,11);
      disk(c,'#738962',x-4,y-26,9,6);disk(c,'#939b6d',x-5,y-29,5,3);
      for(let i=0;i<10;i++)rect(c,i%2?'#9fa67b':'#416353',x-12+(i*7)%23,y-25+(i*11)%15,1+(i%3),1);
    }else if(name==='lamp'){
      rect(c,'#45464a',x-3,y,7,2);rect(c,'#675f51',x-1,y-19,2,19);
      rect(c,'#504945',x-4,y-22,8,8);rect(c,glow===0?'#f3d392':'#dbad72',x-2,y-21,4,6);
      rect(c,'#9a8e6d',x-5,y-23,10,2);
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
