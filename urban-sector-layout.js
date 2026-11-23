/* Planimetria gerarchica: descrittori stabili, geometria di quartiere su richiesta. */
(() => {
  'use strict';
  const key=(x,y)=>x+'/'+y;
  const neighbors=[[1,0],[0,1],[-1,0],[0,-1]];

  function create(profile,seed,placeLot,tileSize){
    const span=profile.neighborhoodSize,half=span/2,tiles=span/tileSize;
    const blocks=new Map(),nodes=new Map(),buildings=[],roads=[],plazas=[];
    const cache=new Map(),limit=8;
    const occupied=new Set(profile.neighborhoods.map(n=>key(n.column,n.row)));
    let generated=0,evicted=0;
    const area=(x,y)=>blocks.get(key(Math.floor(x/span),Math.floor(y/span)));
    for(const spec of profile.neighborhoods){
      const x=spec.column*span,y=spec.row*span,center={x:x+half,y:y+half};
      const place=(dx,dy)=>({x:x+dx,y:y+dy});
      const plaza={x:center.x+(spec.plaza[3]||0),y:center.y+(spec.plaza[4]||0),
        rx:spec.plaza[0],ry:spec.plaza[1],power:spec.plaza[2],name:spec.name,tone:spec.tone};
      const localNodes=[center,place(67,189),place(256,189),place(444,189),place(67,421),place(256,421),place(444,421)];
      const street=[];
      function road(from,to,width,main=false){const line={from,to,width,main};street.push(line);roads.push(line);}
      for(const [dx,dy] of neighbors){
        if(occupied.has(key(spec.column+dx,spec.row+dy)))road(center,place(half+dx*half,half+dy*half),spec.roadWidth,true);
      }
      if(!spec.column&&!spec.row)road(profile.exit,center,spec.roadWidth,true);
      for(const i of [1,4]){
        road(localNodes[i],localNodes[i+1],17);road(localNodes[i+1],localNodes[i+2],17);
        road(center,localNodes[i+1],16);
      }
      nodes.set(spec.id+'-plaza',center);
      const lots=spec.lots.map(lot=>{
        const entry=placeLot(lot);
        buildings.push(entry);nodes.set(entry.id,entry.door);
        localNodes.push(entry.door);
        const south=entry.door.y>center.y;
        const via={x:entry.door.x,y:y+(south?421:189)};
        localNodes.push(via);
        road(entry.door,via,11);
        return entry;
      });
      const block={spec,x,y,center,plaza,localNodes,lots,street};
      blocks.set(key(spec.column,spec.row),block);plazas.push(plaza);
    }

    function materialize(block){
      if(cache.has(block)){
        const hit=cache.get(block);cache.delete(block);cache.set(block,hit);return hit;
      }
      const cells=new Map(),{x,y,spec,street,plaza,lots}=block;
      for(let row=0;row<tiles;row++)for(let col=0;col<tiles;col++){
        const cx=x+col*tileSize,cy=y+row*tileSize;
        cells.set(key(cx/tileSize,cy/tileSize),{x:cx,y:cy,plaza,roads:[],buildings:[],props:[],solids:[]});
      }
      function across(b,visit){
        for(let j=Math.floor(b.y/tileSize);j<=Math.floor((b.y+b.h)/tileSize);j++)
          for(let i=Math.floor(b.x/tileSize);i<=Math.floor((b.x+b.w)/tileSize);i++){
            const cell=cells.get(key(i,j));if(cell)visit(cell);
          }
      }
      const at=(px,py)=>cells.get(key(Math.floor(px/tileSize),Math.floor(py/tileSize)));
      for(const r of street){
        const pad=r.width/2+8;
        across({x:Math.min(r.from.x,r.to.x)-pad,y:Math.min(r.from.y,r.to.y)-pad,
          w:Math.abs(r.from.x-r.to.x)+pad*2,h:Math.abs(r.from.y-r.to.y)+pad*2},cell=>cell.roads.push(r));
      }
      for(const b of lots){
        at(b.x,b.y).buildings.push(b);
        across(b.box,cell=>cell.solids.push(b.box));
      }
      const props=[];
      function addProp(kind,px,py,r=0){
        const prop={kind,x:px,y:py,palette:spec.palette};
        props.push(prop);at(px,py).props.push(prop);
        if(r){const box={x:px-r,y:py-r,w:r*2,h:r*2};across(box,cell=>cell.solids.push(box));}
      }
      for(const [kind,dx,dy,r] of spec.props)addProp(kind,x+dx,y+dy,r);
      const plants=spec.scenery;
      for(let dy=42;plants?.length&&dy<span-40;dy+=51)for(let dx=43;dx<span-41;dx+=57){
        let n=Math.imul(x+dx+5,83492791)^Math.imul(y+dy+11,19349663)^seed;
        n=Math.imul(n^(n>>>17),1597334677)>>>0;
        const px=x+dx+n%13,py=y+dy+(n>>>8)%13;
        if(n%100>=61||Math.hypot((px-plaza.x)/plaza.rx,(py-plaza.y)/plaza.ry)<1.25)continue;
        if(street.some(({from,to,width})=>{
          const u=to.x-from.x,v=to.y-from.y;
          const t=Math.max(0,Math.min(1,((px-from.x)*u+(py-from.y)*v)/(u*u+v*v||1)));
          return Math.hypot(px-from.x-t*u,py-from.y-t*v)<width/2+13;
        }))continue;
        if(lots.some(b=>px>b.box.x-20&&px<b.box.x+b.box.w+20&&py>b.box.y-20&&py<b.y+35)
          ||props.some(p=>Math.abs(p.x-px)<24&&Math.abs(p.y-py)<22))continue;
        const [kind,r]=(plants[(n>>>17)%plants.length]);
        addProp(kind,px,py,r);
      }
      cache.set(block,cells);generated++;
      if(cache.size>limit){cache.delete(cache.keys().next().value);evicted++;}
      return cells;
    }

    function localPath(from,to,block,r,clear){
      if(clear(from,to,r))return [from,to];
      const points=[from,...block.localNodes,to],last=points.length-1,queue=[0],parent=new Map([[0,-1]]);
      for(let at=0;at<queue.length;at++){
        const current=queue[at];
        for(let next=1;next<=last;next++){
          if(parent.has(next)||!clear(points[current],points[next],r))continue;
          parent.set(next,current);
          if(next===last){
            const result=[];
            for(let node=last;node>=0;node=parent.get(node))result.push(points[node]);
            return result.reverse();
          }
          queue.push(next);
        }
      }
      return [];
    }

    function path(from,to,r,clear){
      const start=area(from.x,from.y),end=area(to.x,to.y);
      if(!start||!end)return [];
      if(start===end)return localPath(from,to,start,r,clear);
      const approach=localPath(from,start.center,start,r,clear),finish=localPath(end.center,to,end,r,clear);
      if(!approach.length||!finish.length)return [];
      const queue=[start],parent=new Map([[start,null]]);
      for(let i=0;i<queue.length;i++){
        const block=queue[i];
        if(block===end){
          const middle=[];
          for(let visit=parent.get(end);visit!==start;visit=parent.get(visit))middle.push(visit.center);
          return approach.concat(middle.reverse(),finish);
        }
        for(const [dx,dy] of neighbors){
          const adjacent=blocks.get(key(block.spec.column+dx,block.spec.row+dy));
          if(!adjacent||parent.has(adjacent))continue;
          parent.set(adjacent,block);queue.push(adjacent);
        }
      }
      return [];
    }

    return {seed,nodes,roads,buildings,plazas,path,
      contains:(x,y,r)=>!!(area(x-r,y-r)&&area(x+r,y-r)&&area(x-r,y+r)&&area(x+r,y+r)),
      sectors:{get(id){
        const [x,y]=id.split('/').map(Number),block=blocks.get(key(Math.floor(x/tiles),Math.floor(y/tiles)));
        return block?materialize(block).get(id):undefined;
      }},
      cacheStats:()=>({resident:cache.size,limit,generated,evicted})};
  }
  window.UrbanSectorLayout={create};
})();
