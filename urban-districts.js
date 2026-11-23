/* Quartieri deterministici con collegamenti fra strade, lotti e settori. */
(() => {
  'use strict';
  const at=(x,y)=>({x,y}),sectorSize=256;
  const family=window.CityFamilies;
  const rgb=color=>Number.parseInt(color.slice(1),16);

  function district(profile){
    const {id,origin,market,palette,width,height,spawn,entry,exit,plaza,landmarks,art,furniture: furnitureKind,workers,coast}=profile;
    const continent=World.regions[origin].continent;
    const enter={id:profile.entrance.id,...entry,to:id,arrival:spawn,label:profile.entrance.label,minStage:0};
    const leave={id:profile.departure.id,...exit,to:origin,arrival:entry,label:profile.departure.label,minStage:0};
    const blank={mobs:[],resources:[],bosses:[],gates:[]};
    const roomId=lot=>id+'-'+lot.id;
    const rooms=Object.fromEntries(profile.lots.filter(lot=>lot.room).map(lot=>[roomId(lot),lot]));
    const regions={
      [id]:{id,name:profile.name,description:profile.description,width,height,spawn,continent,palette,
        settlementType:profile.neighborhoods?'town':'hamlet',...(profile.hidden?{hidden:true}:{}),landmarks,points:{...blank,gates:[leave]}}
    };
    for(const [key,lot] of Object.entries(rooms)){
      const template=UrbanInteriors.get(lot.room==='store'?'shop':lot.room);
      regions[key]={...template,id:key,name:lot.name,description:'Interno · '+lot.name,continent,hidden:true,palette,points:{...blank}};
    }

    const terrain={...art.terrain};
    for(const key of ['soil','dry','track','verge','paving'])terrain[key+'Rgb']??=terrain[key].map(rgb);
    const [familyId,familySub]=family.familyOf(palette);
    const materials=family.families[familyId].materials;
    const ellipses=coast?ContinentalCoast(origin).map(([x,y,rx,ry])=>[x-coast.offset.x,y-coast.offset.y,rx,ry]):[];
    const decks=coast?.decks||[];
    const sea=(x,y,r=0)=>ellipses.some(([cx,cy,rx,ry])=>((x-cx)/(rx+r))**2+((y-cy)/(ry+r))**2<=1);
    const deck=(x,y,r=0)=>decks.find(b=>x-r>=b.x&&x+r<=b.x+b.w&&y-r>=b.y&&y+r<=b.y+b.h);
    const flooded=(x,y,r=0)=>sea(x,y,r)&&!deck(x,y,r);
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
    function nearPlaza(x,y,place=plaza){return ((x-place.x)/place.rx)**(place.power||2)+((y-place.y)/place.ry)**(place.power||2);}
    const lotSalt=lotKey(id+'/layout/'+profile.revision);
    function placeLot(lot,seed){
        const n=hash(lotKey(lot.id),lotSalt,seed),variant=n%lot.widths.length,varied=lot.widths.length>1;
        const x=lot.x+(varied?(n>>>5)%15-7:0),y=lot.y+(varied?(n>>>11)%9-4:0);
        const w=lot.widths[variant],door=at(x,y+12);
        const box={x:x-Math.floor(w/2),y:y-lot.depth,w,h:lot.depth};
        const facade={sub:lot.sub||(variant===lot.snow?'rocca':(lot.palette?family.familyOf(lot.palette)[1]:familySub)),kind:lot.component,
          spec:{w,stories:lot.stories,variant:(n>>>14)%8,door:0}};
        return {...lot,x,y,facade,box,door,room:lot.room?roomId(lot):null};
    }
    function generate(seed){
      const sectors=new Map(),roads=[],nodes=new Map(),links=new Map(),buildings=[],props=[];
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
        const building=placeLot(lot,seed),{x,y,box,door}=building;
        buildings.push(building);solid(box);
        sectors.get(sectorKey(Math.floor(x/sectorSize),Math.floor(y/sectorSize))).buildings.push(building);
        nodes.set(lot.id,door);links.set(lot.id,[]);link(lot.node,lot.id,lot.room?15:11);
      }
      function prop(kind,x,y,r=0){
        const o={kind,x,y};props.push(o);
        sectors.get(sectorKey(Math.floor(x/sectorSize),Math.floor(y/sectorSize)))?.props.push(o);
        if(r)solid({x:x-r,y:y-r,w:2*r,h:2*r});
      }
      for(const options of profile.props)prop(...options);
      const {stepX,stepY,border:[west,north,east,south],edgeChance,innerChance,species,radius,top}=profile.vegetation;
      for(let y=top;y<height-16;y+=stepY)for(let x=22;x<width-22;x+=stepX){
        const n=hash(x,y,seed^0x7632ab7),px=x+n%18,py=y+(n>>>8)%19;
        const border=py<north||py>south||px<west||px>east;
        if(n%100>=(border?edgeChance:innerChance)||nearPlaza(px,py)<1.6||sea(px,py,14))continue;
        if(roads.some(r=>segmentDistance(px,py,r.from,r.to)<r.width/2+17))continue;
        if(buildings.some(b=>Math.abs(px-b.x)<b.box.w/2+23&&py>b.box.y-21&&py<b.y+29))continue;
        if(props.some(o=>Math.abs(px-o.x)<18&&Math.abs(py-o.y)<18))continue;
        const kind=(n>>>19)%8;
        prop(species[kind],px,py,radius[kind]);
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
        if(!Number.isFinite(x)||!Number.isFinite(y)||x<r+14||y<r+15||x>width-r-14||y>height-r-16||flooded(x,y,r)||layout.contains&&!layout.contains(x,y,r))return false;
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
        const crossesShore=ellipses.some(([x,y,rx,ry])=>Math.min(a.x,b.x)<=x+rx+r&&Math.max(a.x,b.x)>=x-rx-r&&
          Math.min(a.y,b.y)<=y+ry+r&&Math.max(a.y,b.y)>=y-ry-r);
        if(crossesShore){
          const count=Math.ceil(Math.hypot(dx,dy)*2);
          for(let step=1;step<count;step++)if(flooded(a.x+dx*step/count,a.y+dy*step/count,r))return false;
        }
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
        if(layout.path)return layout.path(a,b,r,segmentClear);
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
      return {canWalk,path,buildWater:flooded};
    }

    function canvas(w,h){const image=document.createElement('canvas');image.width=w;image.height=h;return image;}
    function box(c,color,x,y,w,h){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
    function atlas(c,name,x,y){
      const a=art.assets[name];
      c.drawImage(art.get(name),x+a.x,y+a.y);
    }
    const joint=rgb(terrain.joint),pebbles=terrain.pebble.map(rgb),tufts=terrain.tuft.map(rgb),flowers=terrain.flowers.map(rgb);
    const water=coast?.water.map(rgb),foam=coast?.foam.map(rgb),board=materials.wood.map(rgb);
    function shoreColor(x,y,n,land){
      const ramp=deck(x,y);
      if(ramp){
        const edge=Math.min(x-ramp.x,ramp.x+ramp.w-x);
        if(edge<3||ramp.y+ramp.h-y<3)return board[0];
        if((y-ramp.y)%6<2)return board[1];
        return board[(n>>>7)%5===0?2:3];
      }
      if(!sea(x,y)){
        const quay=coast.quay;
        if(quay&&x>=quay.west&&y>=quay.north&&sea(x,y,quay.reach)){
          const row=Math.floor(y/8),jointAt=(x+(row%2)*9)%18;
          if(sea(x,y,3))return terrain.pavingRgb[0];
          return y%8<2||jointAt<2?joint:terrain.pavingRgb[1+(hash(Math.floor((x+(row%2)*9)/18),row,78)%3)];
        }
        return sea(x,y,6)?terrain.dryRgb[0]:land;
      }
      if(!sea(x,y,-4))return foam[(n>>>8)%5===0?1:0];
      if(!sea(x,y,-13))return water[3];
      const band=Math.floor(y/10),xPhase=(x+band*19)%59;
      if(y%10<2&&xPhase>7&&xPhase<26)return water[2];
      return water[Math.floor(y/28)%3===0?0:1];
    }
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
        if(b>.71&&y<profile.dryAbove)ground=terrain.dryRgb[(n>>>8)%4];
        const near=distances[i];
        const square=nearPlaza(x,y,sector.plaza),rough=(n%8-3)*.65;
        if(near<rough)ground=terrain.trackRgb[1+mainRoad[i]+(n>>>5)%3];
        else if(near<rough+5)ground=terrain.vergeRgb[(n>>>6)%3];
        if(square<1.04){
          const row=Math.floor(y/8),s=(x+(row%2)*6)%12;
          ground=square>.91||y%8<2||s<2?joint:terrain.pavingRgb[1+(hash(Math.floor((x+(row%2)*6)/12),row,seed)+(sector.plaza?.tone||0))%3];
        }
        if(coast)ground=shoreColor(x,y,n,ground);
        for(let y=oy;y<oy+2;y++)for(let x=ox;x<ox+2;x++)pixel(x,y,ground);
        if(n%42===0&&square>1.05&&!sea(x,y,9)&&!deck(x,y)){
          const fleck=near<0?pebbles[(n>>>9)%2]:tufts[(n>>>8)%3];
          pixel(ox,oy,fleck);pixel(ox+1,oy,fleck);
          if(n%5===0&&near>4)pixel(ox+1,oy+1,flowers[(n>>>12)%3]);
        }
      }
      g.putImageData(bitmap,0,0);
      return image;
    }
    const timber=materials.wood[0];
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
      if(!profile.woodpile){paintCoastalProp(c,o,fill);return;}
      for(const [dx,dy] of [[-10,-5],[-3,-5],[4,-5],[-6,-10],[1,-10]]){
        fill(timber,dx,dy,13,5);fill(materials.wood[3],dx+1,dy,10,2);fill(materials.cloth[1],dx+9,dy+1,4,3);
      }
    }
    function paintCoastalProp(c,{kind,x,y},fill){
      const stone=materials.stone,wood=materials.wood,cloth=materials.cloth;
      if(kind==='palm'){
        fill('#485c4350',-13,-1,29,4);fill(wood[0],-3,-27,6,27);fill(wood[2],-2,-27,3,25);
        for(let j=-24;j<0;j+=5)fill(wood[1],-2,j,4,1);
        for(const side of [-1,1])for(let i=0;i<5;i++){
          const px=side*(3+i*3),py=-29+i*2;
          fill('#355842',px-4,py,9,4);fill('#748b50',px-4,py,8,2);
          fill('#9ba461',px-3,py-1,4,1);
        }
        fill('#375a3c',-9,-34,18,6);fill('#718f4d',-8,-36,17,4);fill('#adc06b',-3,-36,8,1);
        fill(wood[1],-5,-27,4,3);fill(wood[3],1,-26,3,3);
      }else if(kind==='crate'||kind==='cargo'){
        fill('#4e433b60',-13,0,28,3);
        const pieces=kind==='cargo'?[[-12,-10,11],[0,-8,13],[-4,-17,11]]:[[-9,-10,17]];
        for(const [a,b,w] of pieces){
          fill(wood[0],a-1,b-1,w+2,11);fill(wood[2],a,b,w,9);fill(wood[3],a,b,w,2);
          for(let i=3;i<w-1;i+=4)fill(wood[1],a+i,b+2,1,6);
          fill(wood[0],a,b+8,w,1);
        }
      }else if(kind==='boat'){
        fill('#a6cbc178',-26,0,48,2);fill('#86b8b389',-20,5,47,1);
        for(const [dx,dy,w,h,color] of [[-27,-8,54,3,wood[0]],[-23,-5,46,7,wood[0]],[-20,2,40,2,wood[1]],
          [-25,-8,49,4,wood[3]],[-19,-6,37,3,wood[1]],[-6,-5,16,3,wood[2]],[-2,-29,2,23,wood[1]]])fill(color,dx,dy,w,h);
        c.fillStyle=x%2?cloth[2]:cloth[0];c.beginPath();c.moveTo(x,y-29);c.lineTo(x+20,y-9);c.lineTo(x,y-11);c.fill();
        fill(cloth[1],0,-13,14,2);fill(cloth[3],0,-25,5,1);fill(wood[3],-1,-30,2,1);
      }else if(kind==='board'){
        fill('#51423455',-10,0,22,4);fill(wood[0],-8,-22,3,24);fill(wood[0],7,-22,3,24);
        fill(wood[1],-12,-27,24,14);fill(wood[3],-11,-26,22,2);
        fill('#f2d8a6',-8,-23,15,9);fill(wood[2],-6,-21,10,1);fill(wood[2],-6,-18,8,1);
      }else if(kind==='rock'){
        fill(stone[0],-7,-4,13,4);fill(stone[1],-5,-7,10,5);fill(stone[2],-4,-7,6,2);
      }else{
        fill('#908b57',-5,-3,11,3);fill('#bdaf6b',-3,-7,2,5);fill('#8a9259',2,-5,2,4);
      }
    }
    const symbols={cargo:['10001','11111','10101','01110'],anchor:['00100','01110','10101','01110'],bed:['11100','10000','11111','10001'],pick:['01110','00101','01100','11000'],crate:['11111','11011','10101','11111'],
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
      box(c,terrain.soil[1],0,0,320,224);c.save();c.scale(320/width,224/height);
      if(coast){
        for(let y=0;y<height;y+=6)for(let x=0;x<width;x+=6){
          if(sea(x,y)&&!deck(x,y))box(c,coast.water[1],x,y,6,6);
          if(deck(x,y))box(c,materials.wood[2],x,y,6,6);
        }
      }
      for(const p of layout.plazas||[plaza])box(c,terrain.paving[1],p.x-p.rx+14,p.y-p.ry+12,2*p.rx-28,2*p.ry-24);
      for(const r of layout.roads){
        c.beginPath();c.moveTo(r.from.x,r.from.y);c.lineTo(r.to.x,r.to.y);
        c.strokeStyle=r.main?terrain.track[4]:terrain.track[2];c.lineWidth=r.width;c.stroke();
      }
      for(const b of layout.buildings){box(c,b.room?'#b89a69':'#34464a',b.box.x,b.box.y,b.box.w,b.box.h);}
      c.restore();return chart;
    }
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
      sites.push(...(profile.sites||[]));
      function buildingFrame(b){
        if(buildingFrames.has(b.id)){
          const hit=buildingFrames.get(b.id);
          if(profile.neighborhoods){buildingFrames.delete(b.id);buildingFrames.set(b.id,hit);}
          return hit;
        }
        const fid=b.palette?family.familyOf(b.palette)[0]:familyId,{sub,kind,spec}=b.facade;
        const sprite=family.render(fid,sub,kind,spec),sx=b.box.w/sprite.footprint.w;
        // Allinea la soglia disegnata alla porta persistente, conservando i 12 px di avvicinamento della revisione 1.
        const x=b.door.x-sprite.door.x*sx,y=b.door.y-12-sprite.door.y;
        const frame={sprite,x,y,sx};buildingFrames.set(b.id,frame);
        if(profile.neighborhoods&&buildingFrames.size>56)buildingFrames.delete(buildingFrames.keys().next().value);
        return frame;
      }
      function furnitureFrame(o){
        const key=o.palette?o.palette+'/'+o.kind:o.kind;
        if(furnitureFrames.has(key))return furnitureFrames.get(key);
        const [fid,variant]=o.palette?family.familyOf(o.palette):[familyId,familySub];
        const [kind,,sub=variant,spec]=furnitureKind[o.kind];
        const sprite=family.render(fid,sub,kind,spec);
        furnitureFrames.set(key,sprite);return sprite;
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
      return {...collision,layout,sites,drawGround,drawFront,drawMap,lights,actors:residentActors(layout,collision),
        cacheStats(){return {sectors:ground.size,terrainBytes:[...ground.values()].reduce((n,image)=>n+4*image.width*image.height,0),
          facades:buildingFrames.size,facadeBytes:[...buildingFrames.values()].reduce((n,f)=>n+4*f.sprite.image.width*f.sprite.image.height,0),
          ...(layout.cacheStats?.()||{})};}};
    }

    const roomKind=key=>rooms[key]?.room||null;
    function buildMap(region,seed){
      const room=rooms[region];
      if(!room){
        const layout=profile.neighborhoods?UrbanSectorLayout.create(profile,seed,lot=>placeLot(lot,seed),sectorSize):generate(seed);
        return exterior(layout);
      }
      const original=UrbanInteriors.create(room.room==='store'?'shop':room.room,hash(lotKey(room.id),profile.revision,seed));
      const sites=room.room==='store'?original.sites.map(site=>site.id==='shop'?
        {...site,id:'freight-ledger',text:'Leggi il giornale di magazzino'}:site):original.sites;
      return {...original,region:regions[region],sites:sites.map(site=>({...site,name:room.name}))};
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
        return {...door,to:id,arrival:at(target.x,target.y),label:profile.roomExit};
      }
      return null;
    }
    function use(s,site){
      if(site.to)return {ok:true,transition:{region:site.to,...regions[site.to].spawn}};
      if(site.id==='exit'){
        const dest=route(s.region,id,s.seed);
        return {ok:true,transition:{region:id,...dest.arrival}};
      }
      if(site.panel)return {ok:true,panel:site.panel};
      if(profile.hidden&&roomKind(s.region)==='archive')return {ok:true,text:'L’archivio custodisce le piante dei rioni di Confluenza.'};
      if(site.id==='freight-ledger')return {ok:true,text:'Il giornale elenca cordame, legna e merci in attesa della prossima marea.'};
      if(site.id==='shop')return {ok:true,panel:'economy'};
      if(site.id==='forge')return {ok:true,panel:'gear'};
      if(site.id==='inn-kitchen')return {ok:true,panel:{id:'workshop',detail:'cooking'}};
      if(['inn-bed','house-bed','inn-water','inn-breakfast'].includes(site.id))return {ok:true,panel:'living'};
      return {ok:true,text:profile.roomText||'Un cassone del borgo, robusto e asciutto.'};
    }
    function guide(c){
      const {x,y}=entry;
      box(c,'#24343167',x-13,y+2,30,4);
      box(c,materials.wood[0],x-1,y-21,3,24);box(c,materials.wood[1],x-13,y-25,26,10);
      box(c,materials.wood[3],x-12,y-24,24,8);box(c,materials.cloth[1],x-11,y-23,21,1);
      box(c,'#ebd5a7',x-5,y-20,10,2);box(c,'#ebd5a7',x+3,y-22,2,6);box(c,'#ebd5a7',x+5,y-21,2,4);
    }
    function actors(s,t){
      if(s.region===id)return create(id,s.seed).actors(s,t);
      const map=create(s.region,s.seed),kind=roomKind(s.region);
      if(kind==='house'||kind==='store'||kind==='shop'&&window.Calendar&&!Calendar.view(s.calendar,s.time,s.region).shopOpen)return [];
      return map.npcLocations.map((o,i)=>({x:o.x,y:o.y,draw:c=>ActorArt.draw(c,o.race,o.x,o.y,{dir:'down',t:t+i*.2})}));
    }
    return {id,origin,market,palette,enter,regions,roomKind,route,use,actors,guide,buildMap,mark:profile.entrance.mark};
  }

  const profiles=UrbanProfiles.map(district),origins=new Map(profiles.map(profile=>[profile.origin,profile]));
  const owners=new Map(profiles.flatMap(profile=>Object.keys(profile.regions).map(id=>[id,profile])));
  const regions=Object.assign({},...profiles.map(profile=>profile.regions));
  const filoni=profiles[0],maps=new Map();
  let current=null;
  function create(region,seed){
    const owner=owners.get(region);
    if(!owner)return null;
    const key=(seed>>>0)+'/'+region,existing=maps.get(key);
    if(existing)maps.delete(key);
    const map=existing||owner.buildMap(region,seed>>>0);
    maps.set(key,map);
    if(maps.size>5)maps.delete(maps.keys().next().value);
    return map;
  }
  window.WorldLight?.provide(key=>current?.profile.id===key,cam=>current.map.lights(cam),
    ()=>current?.profile.palette,()=>current?.profile.palette);
  window.UrbanDistricts={
    id:filoni.id,origin:filoni.origin,enter:filoni.enter,regions,origins,owns:key=>owners.has(key),
    profileFor:key=>owners.get(key),roomKind:key=>owners.get(key)?.roomKind(key)||null,create,
    route:(from,to,seed)=>owners.get(from)?.route(from,to,seed),
    use:(s,site)=>owners.get(s.region)?.use(s,site),
    actors:(s,t)=>owners.get(s.region)?.actors(s,t)||[],
    active(region,map){
      const profile=owners.get(region);
      current=profile?.id===region&&map?.layout?{profile,map}:null;
    }
  };
})();
