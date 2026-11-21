/* Una nuova area usa il router originale e la stessa risoluzione Canvas. */
(() => {
  'use strict';
  const base=window.World, art=window.ActorArt;
  const id='nadir-vault', width=1120,height=668;
  const spawn={x:143,y:554}, exit={x:104,y:554};
  const dais={x:927,y:215}, throne={x:982,y:140};
  const chambers=[
    [66,466,215,154],[253,514,206,61],[427,412,252,212],
    [500,284,84,154],[415,99,306,217],[694,177,137,73],[799,66,256,296]
  ];
  const columns=[[445,452],[653,449],[447,596],[652,594],[441,128],[699,127],[460,298],[694,286],
    [821,117],[1035,118],[820,330],[1034,329],[907,281],[961,151]];
  const points={
    resources:[{x:194,y:579,type:'ore'},{x:463,y:562,type:'ore'},{x:633,y:546,type:'herb'},{x:583,y:144,type:'ore'}],
    mobs:[
      {x:514,y:456,type:'nadir-echo'},{x:606,y:488,type:'shardling'},{x:534,y:582,type:'nadir-echo'},
      {x:525,y:233,type:'nadir-echo'},{x:636,y:143,type:'shade'},{x:657,y:257,type:'nadir-echo'},
      {x:620,y:577,type:'dungeon-retainer'},{x:472,y:505,type:'dungeon-retainer'},
      {x:642,y:208,type:'dungeon-retainer'},{x:865,y:293,type:'dungeon-retainer'},{x:1009,y:266,type:'dungeon-retainer'}
    ],
    bosses:[{...dais,id:'nadir',type:'nadir'},{...dais,id:'dungeon-heir',type:'dungeon-heir'}],gates:[]
  };
  const region={
    id,name:'Santuario della Marea Muta',description:'Un archivio sotterraneo scolpito intorno a un bacino che ha dimenticato il suono delle onde.',
    hidden:true,legendary:true,width,height,spawn,points,palette:'nadir',statue:null,
    landmarks:[
      {name:'Soglia sommersa',...spawn},{name:'Deposito degli echi',x:547,y:525},
      {name:'Chiostro dei flutti',x:561,y:216},{name:'Trono della Marea Muta',...dais}
    ],
    get continent(){return base.regions[window.Game?.s?.legendary?.entrance?.region]?.continent||'continent-1';}
  };
  const floor=(x,y)=>chambers.some(([l,t,w,h])=>x>=l&&x<=l+w&&y>=t&&y<=t+h);
  const offsetGrid=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,0],[0,1],[1,-1],[1,0],[1,1]];
  function canWalk(x,y,r=6){
    return Number.isFinite(x)&&Number.isFinite(y)&&offsetGrid.every(([dx,dy])=>floor(x+dx*r,y+dy*r))&&
      !columns.some(([px,py])=>((x-px)/(9+r))**2+((y-py)/(6+r))**2<1);
  }
  const make=(w,h)=>{const a=document.createElement('canvas');a.width=w;a.height=h;return a;};
  function rect(ctx,colour,x,y,w=1,h=1){ctx.fillStyle=colour;ctx.fillRect(x|0,y|0,w|0,h|0);}
  function poly(ctx,colour,points){
    ctx.fillStyle=colour;ctx.beginPath();
    for(const [i,[x,y]] of points.entries())if(i)ctx.lineTo(x|0,y|0);else ctx.moveTo(x|0,y|0);
    ctx.closePath();ctx.fill();
  }
  function ellipse(ctx,colour,x,y,rx,ry){
    ctx.fillStyle=colour;
    for(let i=-ry;i<=ry;i++){const k=Math.floor(rx*Math.sqrt(Math.max(0,1-(i/ry)**2)));ctx.fillRect(Math.floor(x)-k,Math.floor(y)+i,k*2+1,1);}
  }
  function octagon(x,y,rx,ry){
    return [[x-rx,y-ry*.55],[x-rx*.64,y-ry],[x+rx*.64,y-ry],[x+rx,y-ry*.55],
      [x+rx,y+ry*.55],[x+rx*.64,y+ry],[x-rx*.64,y+ry],[x-rx,y+ry*.55]];
  }
  function seeded(seed){
    let n=seed>>>0;
    return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
  }
  const glyph=(ctx,x,y,color)=>{
    poly(ctx,color,[[x,y-5],[x+4,y-1],[x,y+4],[x-4,y-1]]);
    rect(ctx,'#263345',x-1,y-2,3,3);
    rect(ctx,color,x-1,y+5,3);
  };
  function buildMap(seed){
    const map=make(width,height),ctx=map.getContext('2d'),rnd=seeded(seed^0x75b3ac1);
    rect(ctx,'#101923',0,0,width,height);
    for(let j=0;j<2600;j++){
      const x=rnd()*width,y=rnd()*height;
      rect(ctx,rnd()>.9?'#274356':'#16252d',x,y,1+rnd()*4,1);
    }
    for(const [x,y,w,h] of chambers){
      rect(ctx,'#1f3039',x-11,y-14,w+22,h+26);
      rect(ctx,'#354959',x-7,y-11,w+14,h+17);
      rect(ctx,'#56667a',x-4,y-10,w+8,3);
      rect(ctx,'#4a5f70',x-4,y+h,w+8,4);
      rect(ctx,'#243644',x-4,y+h+4,w+8,8);
    }
    for(const [x,y,w,h] of chambers)rect(ctx,'#2e404d',x,y,w+1,h+1);
    const tints=['#30414f','#314554','#354758','#344854','#394b57','#34444f'];
    for(let y=69;y<625;y+=13){
      for(let x=66+(Math.floor(y/13)%2)*8;x<1060;x+=19){
        if(!floor(x+3,y+2)||!floor(x+14,y+9))continue;
        rect(ctx,tints[Math.floor(rnd()*tints.length)],x+2,y+2,14,9);
        rect(ctx,'#4c5b65',x+3,y+2,12,1);
        rect(ctx,'#233646',x+4,y+10,11,1);
        if(rnd()>.92)rect(ctx,'#69807e',x+8,y+5,2);
      }
    }
    for(const [x,y] of [[167,555],[547,529],[556,215]]){
      poly(ctx,'#54646f',octagon(x,y,44,29));
      poly(ctx,'#394452',octagon(x,y,41,26));
      poly(ctx,'#425b63',octagon(x,y,32,21));
      glyph(ctx,x,y,'#8cb6b0');
    }
    poly(ctx,'#9aacb1',octagon(dais.x,dais.y,100,117));
    poly(ctx,'#576e80',octagon(dais.x,dais.y,98,114));
    poly(ctx,'#253441',octagon(dais.x,dais.y,94,109));
    poly(ctx,'#456472',octagon(dais.x,dais.y,79,89));
    poly(ctx,'#314751',octagon(dais.x,dais.y,75,83));
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      glyph(ctx,dais.x+Math.cos(a)*88,dais.y+Math.sin(a)*100,'#9ab7b1');
    }
    for(let y=154;y<=271;y+=13){
      for(let x=870;x<984;x+=14){
        if(Math.hypot((x-dais.x)/.9,y-dais.y)>61)continue;
        rect(ctx,'#395059',x,y,11,9);rect(ctx,'#556d6f',x,y,10);
      }
    }
    const thumb=make(224,134),thumbCtx=thumb.getContext('2d');
    thumbCtx.imageSmoothingEnabled=false;thumbCtx.drawImage(map,0,0,thumb.width,thumb.height);
    const props=columns.map(([x,y],i)=>({x,y,draw:g=>{
      const palette=i%2?['#8fa2ab','#596b80','#364858']:['#a2bebc','#698993','#405869'];
      ellipse(g,'#24333e',x,y+1,11,4);
      rect(g,palette[2],x-7,y-27,14,27);rect(g,palette[1],x-6,y-25,9,21);
      rect(g,palette[0],x-7,y-28,14,3);rect(g,palette[0],x-5,y-24,2,16);
      rect(g,'#2e3c49',x-7,y-12,14);
      rect(g,palette[1],x-8,y-4,15,3);rect(g,palette[0],x-8,y-5,15,1);
      glyph(g,x,y-16,palette[0]);
    }}));
    return {map,thumb,props};
  }
  function portal(c,x,y,t,inside=false){
    ellipse(c,'rgba(15,33,45,.6)',x,y,17,6);
    poly(c,'#263b4d',[[x-15,y],[x-16,y-20],[x-10,y-33],[x+11,y-33],[x+16,y-20],[x+15,y]]);
    poly(c,'#547186',[[x-13,y],[x-14,y-19],[x-8,y-31],[x+9,y-31],[x+14,y-19],[x+13,y]]);
    poly(c,'#162738',[[x-8,y-4],[x-9,y-19],[x-5,y-25],[x+6,y-25],[x+9,y-19],[x+8,y-4]]);
    const flicker=Math.floor(t*5)%4;
    for(let k=0;k<10;k++){
      const height=2+(k*7+flicker*3)%9,dark=(k+flicker)%3===0;
      rect(c,dark?'#456c80':inside?'#afd8cc':'#9c99dc',x-7+(k*3)%14,y-8-(k*5)%13,1,height);
    }
    rect(c,'#97b0b9',x-13,y-1,26,2);
  }
  let active=false,worldSeed=19425,map=null, mapSeed=null;
  const regions={...base.regions,[id]:region};
  function setRegion(next,seed=worldSeed){
    if(next===id){
      const selected=Number(seed)>>>0;
      if(mapSeed!==selected||!map){map=buildMap(selected);mapSeed=selected;}
      active=true;worldSeed=selected;return api;
    }
    if(!base.setRegion(next,seed))return false;
    active=false;worldSeed=Number(seed)>>>0;return api;
  }
  function drawGround(c,cam,t){
    if(!active)return base.drawGround(c,cam,t);
    const x=Math.max(0,Math.floor(cam.x)),y=Math.max(0,Math.floor(cam.y));
    const cw=Math.min(width-x,cam.w+1),ch=Math.min(height-y,cam.h+1);
    if(cw>0&&ch>0)c.drawImage(map.map,x,y,cw,ch,x,y,cw,ch);
  }
  function drawFront(c,cam,t,actors=[]){
    if(!active)return base.drawFront(c,cam,t,actors);
    const player=actors[0];
    const visible=o=>o.x>=cam.x-60&&o.x<=cam.x+cam.w+60&&o.y>=cam.y-15&&o.y<=cam.y+cam.h+75;
    for(const o of map.props.concat(actors).filter(visible).sort((a,b)=>a.y-b.y)){
      if(player&&map.props.includes(o)&&Math.abs(player.x-o.x)<13&&player.y<o.y&&player.y>o.y-28){
        c.save();c.globalAlpha=.45;o.draw(c);c.restore();
      }else o.draw(c);
    }
  }
  function drawMap(c,w,h,p){
    if(!active)base.drawMap(c,w,h,p);
    else {
      c.drawImage(map.thumb,0,0,w,h);
      if(p){const x=p.x/width*w,y=p.y/height*h;poly(c,'#f4edbf',[[x,y-3],[x+3,y],[x,y+3],[x-3,y]]);}
    }
    const s=window.Game?.s;
    if(s&&s.legendary?.discoveredAt!==null&&s.legendary?.entrance&&s.region===s.legendary.entrance.region){
      const e=s.legendary.entrance,x=e.x/api.width*w,y=e.y/api.height*h;
      poly(c,'#df96da',[[x,y-4],[x+4,y],[x,y+4],[x-4,y]]);rect(c,'#323343',x-1,y-1,2,2);
    }
  }
  function route(from,to,stage){
    if(from!==id&&to!==id)return base.route(from,to,stage);
    const l=window.Game?.s?.legendary,e=l?.entrance;
    if(from===to||!e||l.discoveredAt===null)return null;
    if(from===id)return {id:'legendary-exit',...exit,to:e.region,arrival:{x:e.x,y:e.y},label:'Ritorna in superficie',minStage:0};
    if(from!==e.region)return base.route(from,e.region,stage);
    return {id:'legendary-entry',x:e.x,y:e.y,to:id,arrival:spawn,label:'Entra nel Santuario della Marea Muta',minStage:0};
  }
  const api={
    regions,continents:base.continents,setRegion,drawGround,drawFront,drawMap,route,
    init(seed=19425){return setRegion('valley',seed);},
    canWalk(x,y,r){return active?canWalk(x,y,r):base.canWalk(x,y,r);},
    buildWater(x,y,r){return !active&&base.buildWater(x,y,r);},
    get region(){return active?id:base.region;},
    get width(){return active?width:base.width;},get height(){return active?height:base.height;},
    get points(){return active?points:base.points;},get spawn(){return active?spawn:base.spawn;},
    get landmarks(){return active?region.landmarks:base.landmarks;}
  };
  window.World=api;

  const palettes={
    nadir:['#18202f','#423954','#566685','#8dbdc3','#c4e9d9'],
    'dungeon-heir':['#29272d','#594345','#82644c','#c49859','#fbe4a9'],
    'nadir-echo':['#252837','#49556e','#6c7fa8','#abacdf','#dce6f4'],
    'dungeon-retainer':['#29262f','#514a56','#806052','#b58a60','#f5d98c']
  };
  function paintCreature(c,kind,x,y,opts={}){
    const p=palettes[kind],major=kind==='nadir'||kind==='dungeon-heir';
    const step=opts.moving?Math.floor((opts.t||0)*7)%2:0,bob=Math.floor((opts.t||0)*4)%2;
    ellipse(c,'rgba(10,14,24,.44)',x,y+1,major?21:9,major?5:3);
    c.save();c.translate(Math.round(x),Math.round(y-bob));
    if(opts.dir==='left')c.scale(-1,1);
    const colour=opts.hit?'#ffded7':p[4];
    if(kind==='nadir'){
      const rank=opts.phase||1,reach=rank>1?5:0;
      for(const d of [-1,1]){
        poly(c,p[0],[[d*5,-48],[d*18,-52],[d*(31+reach),-37],[d*(26+reach),-7],[d*16,-14],[d*9,-20]]);
        poly(c,p[2],[[d*10,-48],[d*18,-48],[d*(27+reach),-35],[d*(25+reach),-11],[d*18,-19],[d*15,-31]]);
        rect(c,p[3],d*(19+reach)-2,-38,5,3);
        rect(c,p[3],d*(23+reach)-2,-19,4,4);
      }
      poly(c,p[0],[[-10,-39],[9,-39],[17,-24],[13,-11],[11,-3],[-11,-3],[-17,-12],[-17,-23]]);
      poly(c,p[2],[[-8,-38],[8,-38],[12,-27],[11,-14],[7,-7],[-7,-7],[-11,-16],[-13,-26]]);
      glyph(c,0,-22,colour);
      poly(c,p[0],[[-12,-53],[-6,-61],[6,-61],[12,-54],[10,-42],[-9,-42]]);
      poly(c,p[3],[[-10,-52],[-4,-58],[5,-58],[10,-53],[8,-44],[-8,-44]]);
      rect(c,p[0],-7,-52,14,4);rect(c,colour,-5,-51,3,2);rect(c,colour,2,-51,3,2);
      if(rank>1){
        rect(c,colour,-2,-65,4,5);rect(c,p[3],-11,-63,3,4);rect(c,p[3],8,-63,3,4);
      }
      if(rank>2){glyph(c,-25,-53,colour);glyph(c,25,-53,colour);}
      if(opts.attack){rect(c,p[2],15,-22,23,3);rect(c,colour,32,-26,8,3);rect(c,colour,34,-17,7,2);}
    }else if(kind==='dungeon-heir'){
      for(const d of [-1,1]){
        poly(c,p[0],[[d*9,-46],[d*23,-51],[d*30,-39],[d*24,-15],[d*16,-13],[d*9,-23]]);
        poly(c,p[2],[[d*12,-44],[d*22,-47],[d*26,-39],[d*20,-20],[d*16,-18],[d*12,-29]]);
        for(let a=0;a<4;a++)rect(c,p[3],d*(16+a*2)-2,-39+a*4,6,2);
      }
      poly(c,p[0],[[-11,-43],[8,-43],[15,-24],[20,-6],[-20,-6],[-14,-24]]);
      poly(c,p[1],[[-8,-40],[7,-40],[11,-29],[16,-8],[-15,-8],[-11,-29]]);
      rect(c,p[3],-7,-34,14,3);glyph(c,0,-24,colour);
      poly(c,p[3],[[-13,-57],[-8,-61],[-4,-54],[0,-64],[5,-56],[10,-60],[13,-57],[8,-45],[-8,-45]]);
      rect(c,p[0],-8,-52,16,5);rect(c,colour,-6,-51,4,2);rect(c,colour,2,-51,4,2);
      if(opts.phase>=2){glyph(c,-28,-54,colour);glyph(c,28,-54,colour);}
      if(opts.attack)poly(c,colour,[[14,-24],[39,-29],[43,-25],[37,-21],[14,-19]]);
    }else if(kind==='nadir-echo'){
      poly(c,p[0],[[-10,-9],[-12,-17],[-6,-26],[2,-29],[10,-21],[9,-13],[5,-8],[-3,-11]]);
      poly(c,p[2],[[-8,-15],[-7,-23],[1,-27],[8,-20],[6,-13],[1,-15],[-3,-10]]);
      rect(c,colour,-5,-19,3);rect(c,colour,1,-20,3);rect(c,p[3],-8+bob,-11,3,5);rect(c,p[2],4-bob,-9,3,5);
    }else{
      poly(c,p[0],[[-10,-23],[5,-25],[10,-14],[9,-2],[3,-2],[2,-4],[-3,-4],[-4,-1],[-9,-1]]);
      poly(c,p[2],[[-9,-16],[6,-17],[8,-6],[-7,-6]]);rect(c,p[3],-6,-14,11,2);
      poly(c,p[1],[[-8,-20],[-6,-28],[5,-29],[9,-22],[7,-17],[-7,-17]]);
      rect(c,p[3],-4,-24,9,2);rect(c,colour,-3,-22,6);rect(c,p[1],-6,-5+step,4,5);rect(c,p[1],4,-4-step,4,4);
      if(opts.attack)rect(c,colour,8,-13,9);else{rect(c,p[3],10,-17,2,11);rect(c,p[2],9,-9,4,2);}
    }
    c.restore();
  }
  if(art){
    const rendered=new Map();
    window.ActorArt={...art,
      draw(c,kind,x,y,opts){
        if(!Object.hasOwn(palettes,kind))return art.draw(c,kind,x,y,opts);
        return paintCreature(c,kind,x,y,opts);
      },
      portrait(c,kind,x,y,size,opts={}){
        if(!Object.hasOwn(palettes,kind))return art.portrait(c,kind,x,y,size,opts);
        const key=kind+':'+(opts.phase||1);
        if(!rendered.has(key)){
          const large=kind==='nadir'||kind==='dungeon-heir';
          const square=make(large?84:36,large?84:36),g=square.getContext('2d');
          paintCreature(g,kind,square.width/2,large?75:33,opts);rendered.set(key,square);
        }
        c.save();c.imageSmoothingEnabled=false;c.drawImage(rendered.get(key),x,y,size,size);c.restore();
      }
    };
  }
  window.LegendaryLand={id,region,spawn,exit,dais,throne,portal,glyph};
})();

