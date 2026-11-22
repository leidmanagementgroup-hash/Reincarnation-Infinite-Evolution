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
  // Una finitura per spazio: pietra salmastra, passerelle, archivio, chiostro e sala regale.
  const surfaces=[
    ['#2c4244','#374e4f','#4b6160','#213537'],
    ['#293d45','#374e54','#52696a','#1e313a'],
    ['#353d48','#444d58','#656971','#282f3d'],
    ['#293d45','#374e54','#52696a','#1e313a'],
    ['#2c4549','#395357','#59746f','#1d343d'],
    ['#293d45','#374e54','#52696a','#1e313a'],
    ['#333d50','#444d62','#68778a','#263040']
  ];
  const lights=[
    {x:81,y:476,kind:'crystal'},{x:266,y:476,kind:'crystal'},
    {x:475,y:422,kind:'fire'},{x:631,y:422,kind:'fire'},
    {x:472,y:109,kind:'crystal'},{x:661,y:109,kind:'crystal'},
    {x:874,y:80,kind:'spirit'},{x:1018,y:80,kind:'spirit'}
  ];
  window.WorldLight?.provide(key=>key===id,()=>({lights}),()=> 'under',()=> 'under');

  function paintBasin(c,rnd){
    rect(c,'#121f2b',0,0,width,height);
    // Denti di roccia tra calette: il bacino circonda l'unione dei pavimenti.
    const banks=[
      [[0,0],[480,0],[434,44],[317,62],[284,111],[174,129],[123,198],[0,240]],
      [[0,292],[110,305],[221,364],[247,400],[209,435],[89,436],[0,466]],
      [[0,640],[141,633],[239,652],[321,618],[355,628],[382,668],[0,668]],
      [[638,668],[695,612],[770,588],[805,520],[881,495],[981,499],[1015,441],[1120,421],[1120,668]],
      [[694,0],[1120,0],[1120,209],[1091,161],[1081,78],[1044,43],[875,34],[825,14]]
    ];
    for(const bank of banks){
      for(const [dy,tint] of [[9,'#223644'],[4,'#2c3d4b'],[0,'#1b2835']]){
        poly(c,tint,bank.map(([x,y])=>[x,y+dy]));
      }
    }
    for(let i=0;i<1400;i++){
      const x=rnd()*width,y=rnd()*height,span=2+rnd()*15;
      rect(c,i%13===0?'#304755':i%3===0?'#223644':'#1a2a38',x,y,span);
      if(i%18===0)rect(c,'#263d4b',x+span+2,y,3);
    }
    for(const [x,y] of [[339,481],[347,597],[405,329],[665,370],[750,294],[939,386]]){
      for(let row=0;row<5;row++){
        const dx=(row%2)*9,py=y+row*5,reach=26-2*Math.abs(2-row);
        rect(c,'#223a47',x-reach+dx,py,reach*2);
        rect(c,'#3b5966',x+dx-9,py,15-row,1);
        rect(c,'#2f4c56',x+dx+12,py,7+row,1);
      }
    }
  }

  function paintMasonry(c,rnd){
    for(const [x,y,w,h] of chambers){
      // Le teste luminose e il lato in ombra definiscono la quota sul pelo dell'acqua.
      rect(c,'#142330',x-15,y-17,w+31,h+34);
      rect(c,'#294651',x-12,y-13,w+25,h+28);
      rect(c,'#395663',x-8,y-12,w+17,h+20);
      rect(c,'#546775',x-8,y-12,w+17,3);
      rect(c,'#253742',x-8,y-5,w+17,h+16);
      rect(c,'#475b64',x-4,y+h+1,w+9,3);
      rect(c,'#283c48',x-4,y+h+4,w+9,8);
      for(let dx=0;dx<w;dx+=22){
        rect(c,'#263947',x+dx,y-9,1,7);
        rect(c,'#1c2e3a',x+dx+8,y+h+4,1,6);
        if(rnd()<.48)rect(c,'#718087',x+dx+2,y-11,5+rnd()*8);
      }
    }
    // In ordine: nelle giunzioni il pavimento copre i parapetti e mantiene aperti i passaggi.
    for(const [i,[x,y,w,h]] of chambers.entries())rect(c,surfaces[i][0],x,y,w+1,h+1);
    for(const [i,[left,top,w,h]] of chambers.entries()){
      const [,stone,edge,shade]=surfaces[i],tile=i===4||i===6?24:20;
      for(let y=top+3,row=0;y<top+h-11;y+=13,row++){
        for(let x=left+2+(row%2)*Math.floor(tile/2);x<left+w-tile;x+=tile){
          rect(c,stone,x,y,tile-2,11);
          rect(c,edge,x+1,y,tile-4);
          rect(c,shade,x+1,y+10,tile-3);
          const mark=rnd();
          if(mark<.3){rect(c,shade,x+3,y+6,4);rect(c,shade,x+7,y+7,2);}
          if(mark>.82){rect(c,edge,x+tile-7,y+2,4);rect(c,edge,x+tile-6,y+3,2);}
        }
      }
    }
  }

  function paintLantern(c,light){
    const {x,y,kind}=light;
    const rim=kind==='fire'?'#a88062':kind==='spirit'?'#77759c':'#538b8d';
    const lamp=kind==='fire'?'#efbf88':kind==='spirit'?'#c5bde4':'#9fdbcb';
    ellipse(c,'rgba(16,28,37,.5)',x,y+5,11,3);
    rect(c,'#1d2836',x-6,y-11,13,17);
    rect(c,rim,x-5,y-10,11,2);
    rect(c,'#354352',x-4,y-8,9,10);
    poly(c,lamp,[[x,y-7],[x+3,y-4],[x+3,y],[x,y+2],[x-3,y],[x-3,y-4]]);
    rect(c,'#e2ebdb',x-1,y-5,2,3);
    rect(c,rim,x-6,y+3,13,2);
  }

  function paintRooms(c){
    // La rosa delle correnti identifica la soglia e orienta verso il corridoio.
    const x=182,y=542;
    poly(c,'#547174',octagon(x,y,36,24));
    poly(c,'#263d46',octagon(x,y,33,21));
    poly(c,'#49787b',[[x,y-17],[x+5,y-5],[x+25,y],[x+5,y+4],[x,y+17],[x-5,y+4],[x-25,y],[x-5,y-5]]);
    glyph(c,x,y,'#83b4ad');
    for(const [px,py] of [[167,486],[234,486],[167,606],[234,606]]){
      rect(c,'#28464a',px-17,py-4,34,8);rect(c,'#5d8380',px-15,py-3,30,1);
      for(let i=-13;i<14;i+=4)rect(c,'#68817e',px+i,py-2,1,4);
    }

    // Nel deposito i binari dismessi e le griglie sono a livello del lastricato.
    for(const py of [481,567]){
      rect(c,'#2d3440',458,py,188,10);
      rect(c,'#656068',458,py+2,188);
      rect(c,'#52505a',458,py+7,188);
      for(let x=463;x<643;x+=11)rect(c,'#797071',x,py+2,2,6);
    }
    for(const px of [481,616]){
      rect(c,'#637078',px-14,519,29,17);
      rect(c,'#27343e',px-12,521,25,13);
      for(let x=px-10;x<px+12;x+=4)rect(c,'#465158',x,522,2,11);
      rect(c,'#7b7979',px-12,524,25);
    }

    // Un mosaico di correnti nel chiostro, con segni a tessere anziché ostacoli.
    for(const [px,py] of [[555,181],[586,227],[556,271]]){
      poly(c,'#527270',octagon(px,py,49,26));
      poly(c,'#2e484d',octagon(px,py,46,23));
      for(const dy of [-8,0,8]){
        for(let j=-32;j<32;j+=4){
          const wy=py+dy+Math.round(Math.sin(j*.14)*3);
          rect(c,(j+32)%12===0?'#77a39a':'#537d78',px+j,wy,4,2);
        }
      }
      glyph(c,px,py,'#a1c9b3');
    }
  }

  function paintThroneCourt(c){
    const {x,y}=dais;
    poly(c,'#202c3e',octagon(x,y,105,121));
    poly(c,'#708095',octagon(x,y-2,101,118));
    poly(c,'#43546b',octagon(x,y-2,98,114));
    poly(c,'#263444',octagon(x,y-1,93,108));
    poly(c,'#71908d',octagon(x,y,76,88));
    poly(c,'#3b5662',octagon(x,y,73,84));
    poly(c,'#344958',octagon(x,y,68,79));
    for(let row=0;row<9;row++){
      for(let col=-3;col<=3;col++){
        const tx=x+col*17+(row%2)*4,ty=y-60+row*13;
        if(Math.abs(col*.3)+Math.abs(ty-y)/79>1.45)continue;
        rect(c,'#405567',tx-7,ty,14,11);
        rect(c,'#526978',tx-6,ty,12);
      }
    }
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;
      glyph(c,x+Math.cos(a)*85,y+Math.sin(a)*98,i%3===0?'#b2b6c7':'#729991');
    }
    for(const span of [24,37]){
      for(const dir of [-1,1]){
        const inner=span-9;
        poly(c,'#64817f',[[x,y+dir*span],[x+span,y],[x+inner,y],[x,y+dir*inner]]);
        poly(c,'#64817f',[[x,y+dir*span],[x-span,y],[x-inner,y],[x,y+dir*inner]]);
      }
    }
    glyph(c,x,y,'#8eb5a9');

    // Spalliera incassata dietro il trono interattivo; i gradini fanno parte del lastricato.
    const tx=throne.x,ty=throne.y;
    ellipse(c,'rgba(17,24,37,.46)',tx,ty+8,31,9);
    poly(c,'#5a687f',[[tx-24,ty-4],[tx-17,ty-14],[tx+17,ty-14],[tx+24,ty-4],[tx+24,ty+8],[tx-24,ty+8]]);
    rect(c,'#303e51',tx-24,ty+3,49,5);rect(c,'#8493a5',tx-22,ty+3,45,1);
    rect(c,'#798299',tx-18,ty-1,37,1);
    for(const dir of [-1,1]){
      const sx=tx+dir*20;
      rect(c,'#253246',sx-4,ty-48,9,37);
      rect(c,'#77859b',sx-4,ty-48,7,3);
      rect(c,'#50617a',sx-3,ty-45,6,31);
      rect(c,'#6c8492',sx-2,ty-43,2,22);
      rect(c,'#77859b',sx-5,ty-15,11,3);
    }
    for(const [span,height,colour] of [[23,65,'#222c3f'],[20,61,'#788499'],[17,59,'#4c5c74'],[12,52,'#283d50']]){
      poly(c,colour,[[tx-span,ty-40],[tx-span,ty-height+11],[tx-span*.45,ty-height+2],
        [tx,ty-height],[tx+span*.45,ty-height+2],[tx+span,ty-height+11],[tx+span,ty-40]]);
    }
    glyph(c,tx,ty-47,'#9ebec5');
    rect(c,'#465f74',tx-14,ty-36,29,6);
    rect(c,'#667c90',tx-13,ty-36,27,1);
  }

  function columnSprite([edge,face,shade]){
    const image=make(28,43),c=image.getContext('2d');
    ellipse(c,'rgba(13,24,36,.62)',15,37,12,4);
    poly(c,'#23313e',[[3,35],[6,29],[21,29],[23,35],[23,38],[3,38]]);
    rect(c,edge,5,33,17,2);
    rect(c,face,5,35,17,2);
    rect(c,shade,7,8,14,25);
    rect(c,face,8,7,9,25);
    rect(c,edge,9,11,2,19);
    rect(c,'#263544',18,12,1,18);
    rect(c,edge,7,5,14,2);
    rect(c,face,5,7,18,3);
    glyph(c,14,18,edge);
    return image;
  }

  function buildMap(seed){
    const map=make(width,height),ctx=map.getContext('2d');
    paintBasin(ctx,seeded(seed^0x75b3ac1));
    paintMasonry(ctx,seeded(seed^0x43d2a9b));
    paintRooms(ctx);
    paintThroneCourt(ctx);
    for(const light of lights)paintLantern(ctx,light);
    const thumb=make(224,134),thumbCtx=thumb.getContext('2d');
    thumbCtx.imageSmoothingEnabled=false;thumbCtx.drawImage(map,0,0,thumb.width,thumb.height);
    const images=[['#9c9083','#695f60','#4a4653'],['#9ab1a8','#587782','#344f5f'],
      ['#9da7bb','#576d86','#394961']].map(columnSprite);
    const props=columns.map(([x,y],i)=>({x,y,draw:g=>g.drawImage(images[i<4?0:i<8?1:2],x-13,y-36)}));
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
      if(player&&map.props.includes(o)&&Math.abs(player.x-o.x)<13&&player.y<o.y&&player.y>o.y-32){
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

