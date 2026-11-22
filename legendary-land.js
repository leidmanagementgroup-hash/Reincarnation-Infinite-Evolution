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
  // Santuario della Marea Muta (World Art Overhaul): le sale sono piattaforme di pietra su un bacino d'acqua immobile.
  // Sale e colonne (le uniche collisioni) non cambiano; acqua, alghe e rovine sommerse stanno fuori dal calpestabile.
  function mix(x,y,s){let h=Math.imul(x+7919,374761393)+Math.imul(y+104729,668265263)+Math.imul(s,69069);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
  function vnoise(x,y,size,s){
    const a=Math.floor(x/size),b=Math.floor(y/size);let u=x/size-a,v=y/size-b;u=u*u*(3-2*u);v=v*v*(3-2*v);
    return (mix(a,b,s)*(1-u)+mix(a+1,b,s)*u)*(1-v)+(mix(a,b+1,s)*(1-u)+mix(a+1,b+1,s)*u)*v;
  }
  const inRim=(x,y,pad)=>chambers.some(([l,t,w,h])=>x>=l-pad&&x<=l+w+pad&&y>=t-pad-4&&y<=t+h+pad+12);
  function paintColumn(g,v){
    // Colonna scanalata con capitello a conchiglia, fascia di glifi e corallo alla base (sprite 40x46, base a y=40).
    const P=v?['#2d3c4a','#5b6f86','#8ea2ae','#c4d6d8']:['#2c3f47','#5f828a','#9fbdba','#d2e6dc'];
    const rune=v?'#a9b6f0':'#9fe6d7';
    ellipse(g,'rgba(8,16,24,.55)',21,41,13,4);
    rect(g,P[0],11,34,20,6);rect(g,P[1],12,34,18,2);rect(g,P[2],12,34,18,1);rect(g,P[0],13,30,16,5);rect(g,P[2],13,30,16,1);
    rect(g,P[0],13,8,15,23);rect(g,P[1],14,8,13,22);
    for(let x=15;x<27;x+=3){rect(g,P[2],x,9,1,20);rect(g,P[0],x+1,9,1,20);}
    rect(g,P[3],15,9,1,20);
    rect(g,'#1c2a36',13,17,15,4);rect(g,rune,15,18,2,2);rect(g,rune,19,18,2,2);rect(g,rune,23,18,2,2);
    poly(g,P[0],[[9,8],[12,2],[20,0],[29,2],[32,8]]);poly(g,P[2],[[11,7],[13,3],[20,1],[28,3],[30,7]]);
    for(let x=13;x<30;x+=4)rect(g,P[1],x,3,1,5);
    rect(g,P[3],16,2,8,1);
    rect(g,'#7a5b78',10,37,3,3);rect(g,'#a07a92',11,35,2,2);rect(g,'#5d8a7a',28,36,2,4);rect(g,'#7fb39a',29,34,1,3);
  }
  function buildMap(seed){
    const map=make(width,height),ctx=map.getContext('2d'),rnd=seeded(seed^0x75b3ac1);
    const glow=make(width,height),gl=glow.getContext('2d');
    // 1. Bacino: acqua scura e immobile a mezza risoluzione, con fasce lente e riflessi chiari sotto le pareti.
    const hw=width>>1,hh=height>>1,half=make(hw,hh),hc=half.getContext('2d'),img=hc.createImageData(hw,hh);
    for(let j=0;j<hh;j++)for(let i=0;i<hw;i++){
      const x=i*2,y=j*2,n=vnoise(x,y,90,seed+3)*.7+vnoise(x,y,23,seed+9)*.3;
      const band=Math.sin(y*.11+n*5.5)*.5+.5,spark=mix(i,j,seed+17);
      let r=10+n*10+band*4,g=26+n*16+band*7,b=36+n*18+band*9;
      for(const [l,t,w,h] of chambers){
        const below=y-(t+h+12);
        if(x>=l-6&&x<=l+w+6&&below>=0&&below<30){const k=1-below/30;r+=12*k;g+=18*k;b+=20*k;if(below%6<2)r+=3*k;}
      }
      if(spark>.9985){r+=60;g+=90;b+=95;}
      const k=(i+j*hw)*4;img.data[k]=r;img.data[k+1]=g;img.data[k+2]=b;img.data[k+3]=255;
    }
    hc.putImageData(img,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(half,0,0,width,height);
    // 2. Vita sommersa e rovine nel bacino, lontano dalle piattaforme.
    for(let n=0;n<420;n++){
      const x=Math.floor(rnd()*width),y=Math.floor(rnd()*height),q=rnd();
      if(inRim(x,y,18)||x<6||y<10||x>width-8||y>height-6)continue;
      if(q<.5){const h=6+Math.floor(q*24);for(let k=0;k<h;k++){const sway=Math.round(Math.sin(k*.5+x)*1.5);rect(ctx,k%3?'#1d4a48':'#2b6158',x+sway,y-k,1,1);}}
      else if(q<.62){rect(ctx,'#5a4566',x,y,3,2);rect(ctx,'#7d5f86',x+1,y-1,1,1);rect(ctx,'#4b6f74',x+3,y,2,1);}
      else if(q<.67){rect(ctx,'#2c3b45',x-4,y-3,9,4);rect(ctx,'#40525d',x-3,y-3,7,1);rect(ctx,'#1a2a33',x-5,y+1,11,1);}
      else if(q>.985){rect(gl,'#4fb4b0',x,y,1,1);rect(ctx,'#3f8f8e',x,y,1,1);}
    }
    // 3. Piattaforme: ombra nell'acqua, bordo, parapetto e parete frontale che scende nel bacino.
    for(const [x,y,w,h] of chambers)rect(ctx,'rgba(4,10,16,.45)',x-14,y-16,w+28,h+34);
    for(const [x,y,w,h] of chambers){
      rect(ctx,'#1c2c37',x-9,y-13,w+18,h+26);rect(ctx,'#3a4e5d',x-7,y-11,w+14,h+17);
      rect(ctx,'#60748a',x-7,y-11,w+14,2);rect(ctx,'#4b6072',x-7,y-9,2,h+15);rect(ctx,'#2c3e4b',x+w+5,y-9,2,h+15);
      for(let k=x-5;k<x+w+5;k+=9){rect(ctx,'#6f8597',k,y-10,5,1);rect(ctx,'#2d3e4a',k+5,y-10,1,2);}
      const fy=y+h+1;
      rect(ctx,'#1b2b36',x-7,fy,w+14,12);
      for(let row=0;row<3;row++)for(let k=x-7+(row%2)*5;k<x+w+7;k+=10)rect(ctx,row?'#2a3d4c':'#33485a',k,fy+1+row*3,9,2);
      rect(ctx,'#5a7388',x-7,fy,w+14,1);rect(ctx,'#0e1b24',x-7,fy+11,w+14,1);
      for(let k=x-6;k<x+w+6;k+=3)if(mix(k,y,seed)>.55)rect(ctx,'#5f8c96',k,fy+12,2,1);
    }
    // 4. Pavimento: lastre smussate, macchie di umidità e fasce a mosaico di onde «senza nome».
    for(const [x,y,w,h] of chambers)rect(ctx,'#2e404d',x,y,w+1,h+1);
    const tints=['#30414f','#324555','#364859','#344a56','#3a4c58','#34454f'];
    for(let y=69;y<625;y+=13){
      for(let x=66+(Math.floor(y/13)%2)*8;x<1060;x+=19){
        if(!floor(x+3,y+2)||!floor(x+14,y+9))continue;
        const damp=vnoise(x,y,60,seed+5),t=tints[Math.floor(rnd()*tints.length)];
        rect(ctx,t,x+2,y+2,14,9);
        rect(ctx,'#506270',x+2,y+2,14,1);rect(ctx,'#475866',x+2,y+2,1,8);
        rect(ctx,'#23343f',x+3,y+10,13,1);rect(ctx,'#273946',x+15,y+3,1,8);
        if(damp>.66)rect(ctx,'rgba(20,46,52,.35)',x+2,y+2,14,9);
        const q=rnd();
        if(q>.94)rect(ctx,'#69807e',x+8,y+5,2,1);
        else if(q<.04){rect(ctx,'#24363f',x+5,y+4,1,3);rect(ctx,'#24363f',x+6,y+7,2,1);}
      }
    }
    // Fasce a onde solo al centro delle sale, lontano dai bordi e dai cerchi di rune.
    for(const [l,t,w,h] of chambers){
      if(w<120||h<120)continue;
      for(let y=t+30;y<t+h-24;y+=48)for(let x=l+24;x<l+w-24;x+=6){
        if([[167,555],[547,529],[556,215],[dais.x,dais.y]].some(([cx,cy])=>Math.abs(x-cx)<(cx===dais.x?108:52)&&Math.abs(y-cy)<(cx===dais.x?124:36)))continue;
        const up=Math.round(Math.sin(x*.26)*2);
        rect(ctx,'#4a6870',x,y+up,4,1);rect(ctx,'#22343d',x,y+up+1,4,1);
      }
    }
    // 5. Cerchi di rune dei luoghi di lettura: inserti turchesi che di notte restano accesi.
    const runeRing=(x,y,rx,ry,color,count)=>{for(let i=0;i<count;i++){const a=i*Math.PI*2/count,px=x+Math.cos(a)*rx,py=y+Math.sin(a)*ry;rect(ctx,color,px-1,py-1,3,2);rect(gl,color,px-1,py-1,3,2);}};
    for(const [x,y] of [[167,555],[547,529],[556,215]]){
      poly(ctx,'#1f2e39',octagon(x,y+2,46,31));
      poly(ctx,'#5d6f7b',octagon(x,y,44,29));poly(ctx,'#394452',octagon(x,y,41,26));
      poly(ctx,'#2e4650',octagon(x,y,35,23));poly(ctx,'#425b63',octagon(x,y,32,21));
      runeRing(x,y,38,25,'#6fc3b6',16);
      glyph(ctx,x,y,'#8cb6b0');glyph(gl,x,y,'#5fb0a6');
    }
    // 6. Arena del Trono: anelli concentrici, solco inciso a onde e bordo chiaro per leggere il combattimento.
    poly(ctx,'#16222c',octagon(dais.x,dais.y+3,103,120));
    poly(ctx,'#a8bcc0',octagon(dais.x,dais.y,100,117));
    poly(ctx,'#5d778a',octagon(dais.x,dais.y,98,114));
    poly(ctx,'#1d2c38',octagon(dais.x,dais.y,94,109));
    for(let i=0;i<64;i++){const a=i*Math.PI/32,px=dais.x+Math.cos(a)*86,py=dais.y+Math.sin(a)*100;rect(ctx,i%2?'#2e5562':'#3c6a76',px-2,py+Math.round(Math.sin(i*1.2)),4,1);}
    poly(ctx,'#7d97a2',octagon(dais.x,dais.y,80,90));
    poly(ctx,'#456472',octagon(dais.x,dais.y,79,89));
    poly(ctx,'#314751',octagon(dais.x,dais.y,75,83));
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,gx=dais.x+Math.cos(a)*88,gy=dais.y+Math.sin(a)*100;
      glyph(ctx,gx,gy,'#9ab7b1');glyph(gl,gx,gy,'#6fc3b6');
    }
    for(let y=154;y<=271;y+=13){
      for(let x=870;x<984;x+=14){
        if(Math.hypot((x-dais.x)/.9,y-dais.y)>61)continue;
        rect(ctx,'#395059',x,y,11,9);rect(ctx,'#556d6f',x,y,10);rect(ctx,'#2c414a',x,y+8,11,1);
      }
    }
    for(let i=0;i<8;i++){const a=i*Math.PI/4+Math.PI/8;for(let r=20;r<60;r+=4)rect(ctx,'#4f6f78',dais.x+Math.cos(a)*r*.9,dais.y+Math.sin(a)*r,2,1);}
    ellipse(ctx,'#2c414a',dais.x,dais.y,15,12);ellipse(ctx,'#4e7078',dais.x,dais.y,12,9);ellipse(ctx,'#7fb0ac',dais.x,dais.y,4,3);ellipse(gl,'#5fb0a6',dais.x,dais.y,4,3);
    const thumb=make(224,134),thumbCtx=thumb.getContext('2d');
    thumbCtx.imageSmoothingEnabled=false;thumbCtx.drawImage(map,0,0,thumb.width,thumb.height);
    const sprites=[0,1].map(v=>{const c=make(40,46),g=c.getContext('2d');paintColumn(g,v);return c;});
    const props=columns.map(([x,y],i)=>({x,y,draw:g=>g.drawImage(sprites[i%2],x-21,y-40)}));
    return {map,thumb,props,glow};
  }
  // Portale: arco di pietra marina con conchiglia in chiave e un velo d'acqua sospeso che scorre (stessa impronta).
  function portal(c,x,y,t,inside=false){
    ellipse(c,'rgba(10,24,34,.6)',x+1,y+1,18,6);
    poly(c,'#1a2836',[[x-17,y+1],[x-18,y-21],[x-12,y-36],[x+12,y-36],[x+18,y-21],[x+17,y+1]]);
    poly(c,'#4f6b80',[[x-15,y],[x-16,y-20],[x-10,y-34],[x+10,y-34],[x+16,y-20],[x+15,y]]);
    poly(c,'#7f9cad',[[x-15,y],[x-16,y-20],[x-10,y-34],[x-7,y-34],[x-12,y-20],[x-11,y]]);
    for(let k=-30;k<-2;k+=7){rect(c,'#36495a',x-15,y+k,4,1);rect(c,'#36495a',x+11,y+k,4,1);}
    poly(c,'#0f2233',[[x-9,y-2],[x-10,y-19],[x-6,y-27],[x+6,y-27],[x+10,y-19],[x+9,y-2]]);
    const flicker=Math.floor(t*5)%4,veil=inside?['#afd8cc','#6fb7ad']:['#b4b1ee','#7f7cc8'];
    for(let k=0;k<12;k++){
      const height=2+(k*7+flicker*3)%9,dark=(k+flicker)%3===0;
      rect(c,dark?'#2f5770':veil[k%2],x-8+(k*3)%16,y-6-(k*5)%17,1,height);
    }
    rect(c,veil[0]+'66',x-8,y-24+((flicker*4)%20),16,1);
    poly(c,'#9fb6be',[[x-4,y-34],[x,y-39],[x+4,y-34],[x,y-32]]);rect(c,'#d7e7e2',x-1,y-37,2,2);
    rect(c,'#97b0b9',x-14,y-1,28,2);rect(c,'#5f7a88',x-16,y+1,32,1);
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
  // Luce del Santuario per WorldLight: penombra costante, glifi delle colonne, cerchi di rune, arena, portale e trono.
  function lightSources(){
    if(!active||!map)return null;
    const lights=[{x:exit.x,y:exit.y,kind:'crystal',lift:29},{x:dais.x,y:dais.y,kind:'spirit',lift:33},{x:throne.x,y:throne.y,kind:'spirit',lift:31,p:1}];
    for(const [x,y] of [[167,555],[547,529],[556,215]])lights.push({x,y,kind:'crystal',lift:33,p:1});
    for(const [x,y] of columns)lights.push({x,y,kind:'crystal',lift:36,p:2});
    return {lights,windows:[],emissive:{image:map.glow,alpha:1}};
  }
  window.WorldLight?.provide(rid=>rid===id&&active,lightSources,()=>'tide',()=>'tide');

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

