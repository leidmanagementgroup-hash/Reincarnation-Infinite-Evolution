/* Original pixel sprites for the expanded campaign. World coords mark the feet. */
(() => {
  'use strict';
  const original = window.ActorArt;
  const ink = '#222233', ivory = '#fff5d3';
  const palettes = {
    kobold:['#503b42','#875749','#bc8866','#ffe5a5'],
    orc:['#3c4a40','#6b8d60','#a7be77','#ead7a0'],
    gnome:['#4a384d','#9d556a','#c98d74','#ffe098'],
    satyr:['#482f3f','#a76652','#d79869','#f8dc9e'],
    hare:['#413c63','#a2a4c1','#e8dfed','#ffe5ad'],
    fungus:['#503441','#ab635b','#da8776','#ffddb2'],
    fox:['#483b45','#a66653','#e6a269','#ffe9bd'],
    terrapin:['#314c46','#658854','#9cad67','#d9db9a'],
    dryad:['#3d4d42','#627e56','#a4b969','#f4de94'],
    triton:['#2d4762','#487f9b','#72c2c0','#c8f5db'],
    raven:['#292f4c','#4b5569','#879994','#f3cb80'],
    salamander:['#5d3651','#b35963','#e9896c','#ffd994'],
    scarabkin:['#45374e','#936946','#d6a956','#ffe2a0'],
    spider:['#2c3f5f','#596286','#8799ca','#bde9e4'],
    mimic:['#423044','#a26750','#c79461','#f7cb7c'],
    troll:['#363d3e','#667452','#94a264','#d9d19d'],
    harpy:['#4b3d55','#997095','#c5a6c0','#ffe6bf'],
    golem:['#483945','#a06a5f','#d0957a','#f4cc9a'],
    frostkin:['#354760','#6089a4','#abd5d7','#e0f7ed'],
    sylph:['#38405b','#756995','#9fb9c7','#defad8'],
    naga:['#294751','#517e6a','#90c38c','#e7efb6'],
    mantis:['#46494b','#7c8c65','#b6bf8a','#f5e9ba'],
    minotaur:['#443641','#815648','#bf8861','#ffdf9a'],
    djinn:['#633d56','#a66488','#e299ad','#ffe0a6'],
    chimera:['#3d4e4e','#637b64','#afaa69','#edd994'],
    phoenix:['#67394d','#bb645d','#f4a460','#ffeeac'],
    leviathan:['#333b67','#4a71a8','#79b8c5','#dfffe5'],
    goblin:['#394c3c','#75874e','#9fbe79','#f3e2a6'],
    ember:['#522e3d','#995256','#e98560','#ffd892'],
    scarab:['#493948','#956449','#cc9564','#f9d57d'],
    crawler:['#4c3e44','#996848','#ca9564','#ffe3b6'],
    sentinel:['#474453','#776777','#ab938e','#f2c38b'],
    shardling:['#35365f','#6760aa','#aa89d2','#efd7fd'],
    shade:['#352b51','#624e80','#9e7eab','#e7bae0'],
    wisp:['#353d63','#626db3','#a59ada','#fbe8f6'],
    crystalguard:['#38355b','#6b64a1','#a8a5d8','#ffe3f4'],
    kharun:['#4d3849','#976257','#c79068','#ffd38a'],
    syrava:['#363354','#666096','#aa88c1','#ffe4e6'],
    asterion:['#303359','#51598c','#7da4be','#fff6cd']
  };
  const palette = (kind,form,phase) => {
    const p=palettes[kind];
    if (phase===2 && kind==='kharun') return ['#583748','#aa5454','#ef865a','#ffe493'];
    if (phase===2 && kind==='syrava') return ['#4d3454','#96669f','#df99be','#ffe4ed'];
    if (phase===2 && kind==='asterion') return ['#4c356a','#7963a5','#d391cb','#fff0a8'];
    if (form===3) return [p[0],p[1],p[2],'#ffde95'];
    if (form===4) return [p[0],p[1],p[2],'#a8f6e7'];
    return p;
  };
  function box(c,col,x,y,w=1,h=1) {
    c.fillStyle=col;
    c.fillRect(Math.round(x),Math.round(y),w,h);
  }

  function stroke(c,col,pts,w=1){
    for(let i=2;i<pts.length;i+=2) {
      const x=pts[i-2],y=pts[i-1],dx=pts[i]-x,dy=pts[i+1]-y;
      const length=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))));
      for(let j=0;j<=length;j++)box(c,col,x+dx*j/length,y+dy*j/length,w,w);
    }
  }
  function polygon(c,col,pts){
    let bottom=-Infinity,top=Infinity;
    for(let i=1;i<pts.length;i+=2){top=Math.min(pts[i],top);bottom=Math.max(pts[i],bottom);}
    for(let y=Math.ceil(top);y<=bottom;y++){
      const xs=[];
      for(let i=0,j=pts.length-2;i<pts.length;j=i,i+=2){
        const a=pts[j+1],b=pts[i+1];
        if((a>y+.01)!==(b>y+.01))xs.push(pts[j]+(y+.01-a)*(pts[i]-pts[j])/(b-a));
      }
      xs.sort((a,b)=>a-b);
      for(let i=0;i+1<xs.length;i+=2)box(c,col,Math.ceil(xs[i]),y,Math.max(1,Math.floor(xs[i+1])-Math.ceil(xs[i])+1));
    }
    stroke(c,col,[...pts,pts[0],pts[1]]);
  }
  function oval(c,col,x,y,rx,ry){
    for(let j=-ry;j<=ry;j++){
      const w=Math.floor(rx*Math.sqrt(Math.max(0,1-(j/(ry+.4))**2)));
      box(c,col,x-w,y+j,2*w+1);
    }
  }
  function gem(c,x,y,col,r=3,centre=ivory){
    polygon(c,col,[x,y-r,x+r,y,x,y+r,x-r,y]);
    box(c,centre,x,y-1,1,2);
  }
  function spark(c,col,x,y,r=2){
    box(c,col,x-r,y,2*r+1);box(c,col,x,y-r,1,2*r+1);box(c,ivory,x,y);
  }
  function scaleSpots(c,p,arr){
    for(const [x,y] of arr){
      box(c,p[0],x,y,3);box(c,p[3],x,y-1,2);
    }
  }
  function eyes(c,dir,x,y,gap,p){
    if(dir==='up')return;
    const offsets=dir==='right'?[x+gap+1]:[x-gap,x+gap];
    for(const a of offsets){box(c,ink,a,y,2,3);box(c,p[3],a,y,1);}
  }
  function rim(c,col,pts){
    stroke(c,ink,pts,3);
    stroke(c,col,pts);
  }
  function crystal(c,x,y,p,h=10,w=4){
    polygon(c,p[0],[x-w,y-1,x-w,y-h+4,x-1,y-h,x+w,y-h+4,x+w,y,x-1,y+2]);
    polygon(c,p[2],[x-w+1,y-1,x-w+1,y-h+4,x-1,y-h+1,x-1,y]);
    polygon(c,p[1],[x,y-h+1,x+w-1,y-h+5,x+w-1,y-1,x,y+1]);
    stroke(c,p[3],[x-w+1,y-h+4,x-1,y-h+1,x-1,y-4]);
  }
  function crest(c,p,x,y,form,size=6){
    if(!form)return;
    if(form%2===1) {
      polygon(c,p[0],[x-size,y+1,x-size,y-3,x-3,y-1,x,y-size,x+3,y-1,x+size,y-3,x+size,y+1]);
      stroke(c,p[3],[x-size,y-2,x-3,y,x,y-size+1,x+3,y,x+size,y-2]);
      gem(c,x,y,p[2],2);
    } else {
      oval(c,p[0],x,y-2,size,3);
      stroke(c,p[3],[x-size,y-2,x-3,y-4,x+3,y-4,x+size,y-2]);
      gem(c,x,y-2,p[2],2);
    }
  }
  function blade(c,p,x,y,staff=false){
    if(staff){
      rim(c,p[2],[x,y+10,x+1,y-8]);
      gem(c,x+1,y-9,p[3],3);
      return;
    }
    rim(c,p[3],[x-1,y+5,x+2,y+1,x+5,y-8]);
    polygon(c,p[2],[x+2,y-1,x+5,y-8,x+8,y-10,x+7,y-4,x+3,y+2]);
    stroke(c,ivory,[x+4,y-5,x+7,y-9]);
    stroke(c,p[1],[x,y,x+5,y+2],2);
  }
  function humanoid(c,k,p,d,step,ev,attack){
    const heavy=['troll','golem','frostkin','minotaur','orc','sentinel','crystalguard'].includes(k);
    const small=k==='gnome';
    const side=d==='right',back=d==='up',f=side?2:0,wide=heavy?8:6;
    const h=small?17:heavy?24:21,head=h+2+(ev>2?2:0);
    const paces=[step===1?-1:0,step===1?1:0];
    if(k==='kobold'){
      stroke(c,p[0],[-3,-5,-8,-6,-12,-10,-14,-10],3);
      stroke(c,p[2],[-7,-6,-12,-9,-14,-9]);
    }
    if(ev>0){
      const cape=ev>2?11:8;
      polygon(c,p[0],[-6,-17,5,-18,cape,-8,cape+1,-4,4,-2,-2,-5,-cape,-3,-cape-1,-7]);
      polygon(c,p[1],[-3,-16,4,-16,cape-1,-8,cape,-5,3,-5,-2,-7,-cape+1,-5]);
      stroke(c,p[3],[-cape+1,-5,-2,-7,3,-5,cape,-5]);
    }
    for(let i=0;i<2;i++){
      const x=i?3:-5,y=paces[i];
      box(c,p[0],x,-8+y,4,7);box(c,p[1],x+1,-7+y,2,4);
      box(c,ink,x-1,-2+y,5,3);box(c,p[2],x,-2+y,2);
    }
    polygon(c,p[0],[-wide,-16,-5,-20,5,-20,wide,-15,wide-2,-6,1,-5,-wide+1,-6]);
    polygon(c,p[1],[-wide+1,-15,-4,-19,4,-18,wide-1,-15,4,-8,-3,-8,-wide+2,-9]);
    stroke(c,p[2],[-5,-18,-2,-14,1,-12,4,-11],2);
    box(c,p[0],-wide+2,-9,wide*2-4,4);
    box(c,p[3],side?2:-1,-8,3,2);
    box(c,p[0],-wide-2,-16,4,9);box(c,p[1],-wide-1,-15,2,6);box(c,p[2],-wide,-8,2,3);
    box(c,p[0],wide-1,-16,4,9);box(c,p[1],wide,-15,2,5);box(c,p[2],wide,-9,3,3);
    oval(c,p[0],f,-head,heavy?7:6,6);
    oval(c,p[2],f,-head-1,heavy?6:5,5);
    stroke(c,p[1],[f-4,-head-4,f,-head-5,f+4,-head-4],2);
    if(back){box(c,p[1],f-4,-head,9,4);stroke(c,p[3],[f-2,-head-3,f+2,-head-3]);}
    else{
      eyes(c,d,f,-head,3,p);box(c,p[1],f-2,-head+3,5,1);box(c,p[3],f+1,-head+1);
    }
    switch(k){
      case 'kobold':
        polygon(c,p[1],[-8,-head+1,-7,-head-5,-4,-head-3,-4,-head+1]);
        polygon(c,p[2],[5,-head+1,8,-head-5,8,-head-1,6,-head+2]);
        if(!back)polygon(c,p[0],[f-5,-head+2,f+6,-head+1,f+7,-head+4,f+3,-head+6,f-3,-head+5]);
        break;
      case 'orc':
        if(!back){stroke(c,ivory,[f-4,-head+3,f-4,-head+1]);stroke(c,ivory,[f+4,-head+3,f+4,-head+1]);}
        box(c,p[0],f-5,-head-5,8,2);
        break;
      case 'gnome':
        polygon(c,p[0],[f-7,-head-2,f-3,-head-5,f,-head-11,f+5,-head-8,f+6,-head-2]);
        polygon(c,p[1],[f-5,-head-3,f-1,-head-6,f,-head-10,f+4,-head-8,f+4,-head-3]);
        stroke(c,p[3],[f-5,-head-3,f+5,-head-3]);
        if(!back){box(c,p[0],f-5,-head,11,2);box(c,'#9bdddc',f-4,-head,2);box(c,'#a6e1de',f+3,-head,2);}
        break;
      case 'satyr':case 'minotaur':
        for(const s of [-1,1]){
          const r=k==='minotaur'?10:8;
          stroke(c,p[0],[f+s*4,-head-3,f+s*r,-head-6,f+s*r,-head-10],3);
          stroke(c,p[3],[f+s*4,-head-3,f+s*r,-head-6,f+s*r,-head-10]);
        }
        if(k==='minotaur'&&!back){box(c,p[0],f-5,-head+1,11,6);box(c,p[1],f-4,-head+2,9,4);box(c,p[3],f-1,-head+4,3);}
        break;
      case 'dryad':
        for(const s of [-1,1]){
          stroke(c,p[0],[s*3,-head-2,s*8,-head-7,s*8,-head-11],3);
          polygon(c,p[2],[s*4,-head-4,s*9,-head-11,s*11,-head-7,s*7,-head-4]);
          box(c,p[3],s*8,-head-8,2);
        }
        gem(c,0,-head-5,p[3],2);
        break;
      case 'triton':
        for(const s of [-1,1])polygon(c,s===-1?p[1]:p[3],[s*4,-head-3,s*10,-head-7,s*9,-head,s*4,-head+3]);
        stroke(c,p[0],[-5,-13,-2,-11,2,-11,5,-13]);
        break;
      case 'frostkin':
        for(const s of [-1,1]) {
          for(let y=-head-4;y<-12;y+=4)polygon(c,p[3],[s*5,y,s*8,y+1,s*7,y+4,s*5,y+3]);
        }
        stroke(c,ivory,[-5,-head-3,-2,-head-6,3,-head-6,6,-head-3],2);
        break;
      case 'golem':case 'sentinel':case 'crystalguard':
        stroke(c,p[0],[-5,-head-1,-2,-head-2,-2,-head+1,1,-head+1,2,-head+4]);
        gem(c,1,-13,p[3],3);
        if(k==='crystalguard'){crystal(c,-8,-12,p,10,3);crystal(c,8,-12,p,11,3);}
        break;
      case 'troll':
        oval(c,p[3],-8,-18,4,2);box(c,p[1],-9,-17,2,4);
        oval(c,p[2],7,-19,5,2);box(c,p[3],5,-20,2);
        break;
      case 'goblin':
        polygon(c,p[1],[-6,-head+2,-11,-head-4,-7,-head-3,-4,-head]);
        polygon(c,p[2],[5,-head+2,11,-head-4,7,-head-3,4,-head]);
        box(c,p[3],f-5,-head-3,9);
        if(ev>2){box(c,p[0],-12,-21,1,22);polygon(c,'#a16060',[-20,-23,-11,-23,-11,-15,-19,-15,-17,-19]);stroke(c,p[3],[-20,-23,-11,-23]);}
        break;
    }
    if(ev>0||attack){
      const arm=attack?wide+4:wide+1;
      blade(c,p,arm,-12,ev%2===0&&ev>0);
      crest(c,p,f,-head-5,ev,ev>2?7:5);
      if(ev>2)gem(c,1,-15,p[3],3);
    }
  }
  function beast(c,k,p,d,step,ev){
    const side=d==='right',back=d==='up';
    const f=side?4:0;
    const longTail=k==='fox'||k==='salamander'||k==='chimera';
    if(longTail){
      const lift=step;
      polygon(c,p[0],[-4,-7,-10,-10,-14,-16+lift,-19,-15+lift,-19,-10+lift,-13,-6,-6,-4]);
      polygon(c,p[1],[-6,-7,-12,-11,-16,-15+lift,-18,-14+lift,-16,-10,-10,-7]);
      stroke(c,p[3],[-18,-14+lift,-17,-12+lift,-14,-12+lift],2);
    } else{
      oval(c,p[3],-7,-9,3,3);
    }
    if(k==='salamander'){
      for(let i=-1;i<=1;i++){box(c,p[0],i*5-2,-4+(step&&i!==0?1:0),4,3);box(c,p[2],i*5-1,-3,2);}
      oval(c,p[1],-2,-6,9,5);oval(c,p[2],f+2,-9,7,4);scaleSpots(c,p,[[-6,-8],[-3,-7],[2,-9],[5,-11]]);
      eyes(c,d,f+2,-10,3,p);
      if(ev){for(let i=0;i<(ev>2?5:3);i++)crystal(c,-7+i*4,-10,p,6+(i%2)*2,2);}
      return;
    }
    oval(c,p[0],-2,-7,9,7);oval(c,p[1],-3,-9,8,5);oval(c,p[2],-1,-10,5,4);
    for(let i=0;i<2;i++){const x=i?5:-6,y=i===step?-1:0;box(c,p[0],x,-4+y,4,4);box(c,p[3],x+1,-2+y,2,1);}
    if(k==='hare'){
      for(const s of [-1,1]){
        polygon(c,p[1],[f+s*3,-14,f+s*6,-26+step,f+s*8,-25+step,f+s*8,-20,f+s*5,-14]);
        stroke(c,'#eccce2',[f+s*5,-16,f+s*7,-24+step],2);
      }
    } else {
      for(const s of [-1,1])polygon(c,p[1],[f+s*2,-14,f+s*7,-22,f+s*9,-14,f+s*5,-11]);
      if(k==='chimera'){oval(c,p[0],-9,-15,5,5);oval(c,p[2],-9,-16,4,3);if(!back)eyes(c,d,-9,-16,1,p);}
    }
    oval(c,p[0],f,-10,7,6);oval(c,p[2],f,-12,6,4);
    if(!back){oval(c,p[3],f+1,-8,5,3);eyes(c,d,f,-13,3,p);box(c,p[0],f+1,-9,2);box(c,p[1],f-1,-6,3);}
    if(ev){
      crest(c,p,f,-15,ev,k==='hare'?4:6);
      if(ev===2||ev===4)for(const s of [-1,1])stroke(c,p[3],[s*4,-6,s*7,-5,s*9,-3]);
      if(ev>2){
        for(const s of [-1,1])polygon(c,p[1],[s*4,-10,s*9,-17,s*14,-18,s*11,-9,s*7,-6]);
        spark(c,p[3],-12,-18,2);spark(c,p[3],12,-19,2);
      }
    }
  }
  function shell(c,k,p,d,step,ev){
    const side=d==='right', f=side?6:0;
    for(let i=-1;i<=1;i++){
      const x=i*6;box(c,p[0],x-3,-5+(i&&step?1:0),4,4);box(c,p[2],x-3,-3+(i&&step?1:0),2,1);
    }
    oval(c,p[0],-2,-8,10,7);
    polygon(c,p[1],[-11,-9,-7,-14,0,-15,6,-13,8,-8,6,-4,-7,-3]);
    polygon(c,p[2],[-8,-10,-5,-13,0,-14,4,-12,4,-8,-7,-7]);
    stroke(c,p[0],[-9,-8,-5,-11,-1,-10,3,-12,6,-11]);
    stroke(c,p[0],[-5,-12,-5,-8,-7,-5]);stroke(c,p[0],[-1,-10,0,-7,4,-5]);
    if(k==='scarabkin'||k==='scarab'||k==='crawler'){
      stroke(c,p[3],[-1,-13,0,-10,0,-7,-1,-5]);
      stroke(c,p[0],[-4,-9,-10,-6,-12,-4],2);stroke(c,p[0],[4,-9,10,-6,12,-4],2);
      const horn=k==='scarabkin'?5:3;
      stroke(c,p[3],[f+2,-9,f+5,-12,f+horn,-15],2);
    }
    if(d!=='up'){oval(c,p[0],f+2,-6,5,4);oval(c,p[2],f+3,-7,4,2);eyes(c,d,f+3,-7,2,p);}
    if(ev){
      if(ev%2===0){stroke(c,p[3],[-9,-8,-5,-13,1,-14,6,-11],2);}
      else {crystal(c,-3,-12,p,5,2);crystal(c,3,-12,p,7,2);}
      if(ev>2){crystal(c,-8,-10,p,10,3);crystal(c,8,-10,p,9,3);gem(c,0,-9,p[3],4);}
    }
  }
  function stalk(c,k,p,d,step,ev){
    if(k==='fungus'){
      oval(c,p[0],0,-7,7,7);oval(c,p[2],0,-8,5,5);
      box(c,p[3],-4,-11,7,4);eyes(c,d,d==='right'?2:0,-9,2,p);
      for(const s of [-1,1])box(c,p[1],s*5-1,-4+step,3,3);
      polygon(c,p[0],[-12,-13,-10,-18,-6,-22,3,-23,9,-19,12,-14,8,-11,-7,-11]);
      polygon(c,p[1],[-10,-14,-8,-18,-5,-21,3,-21,8,-18,10,-14]);
      polygon(c,p[2],[-8,-16,-6,-19,-3,-21,3,-21,6,-18,6,-16]);
      scaleSpots(c,p,[[-7,-16],[-3,-19],[2,-17],[6,-15]]);
      if(ev){crest(c,p,0,-23,ev,5);if(ev>2){oval(c,p[2],-11,-15,4,3);oval(c,p[1],11,-12,4,3);}}
      return;
    }
    // Living cedar chest.
    const jaw=step===1?2:0;
    box(c,p[0],-9,-10,19,11);box(c,p[1],-8,-9,17,8);box(c,p[2],-7,-6,15,2);
    polygon(c,p[0],[-10,-9-jaw,-10,-13-jaw,-7,-17-jaw,6,-17-jaw,10,-13-jaw,10,-9-jaw]);
    polygon(c,p[2],[-9,-11-jaw,-7,-15-jaw,6,-15-jaw,9,-12-jaw,9,-10-jaw]);
    stroke(c,p[3],[-7,-16-jaw,-7,-12-jaw,-7,-3]);stroke(c,p[3],[6,-16-jaw,6,-11-jaw,6,-3]);
    if(d!=='up'){box(c,ink,-7,-11-jaw,15,3+jaw);for(let x=-6;x<=6;x+=3)box(c,p[3],x,-11-jaw,1,2);gem(c,0,-8,p[3],2);}
    for(const s of [-1,1])box(c,p[0],s*7-1,-3,3,3);
    if(ev){crest(c,p,0,-18-jaw,ev,6);if(ev>2){crystal(c,-8,-15,p,9,3);crystal(c,8,-15,p,9,3);}}
  }
  function insect(c,k,p,d,step,ev){
    const f=d==='right'?2:0;
    if(k==='mantis'){
      for(const s of [-1,1]){
        stroke(c,p[0],[s*2,-8,s*6,-6,s*8,-2+step],2);
        stroke(c,p[2],[s*4,-15,s*8,-17,s*10,-22,s*7,-24],2);
        polygon(c,p[3],[s*8,-15,s*12,-22,s*8,-26,s*9,-21,s*6,-18]);
      }
      polygon(c,p[1],[-4,-5,-4,-14,-2,-19,2,-19,4,-14,4,-5,0,-2]);
      stroke(c,p[2],[-1,-17,-1,-7,1,-4],2);
      polygon(c,p[2],[f-6,-23,f-4,-20,f+4,-20,f+6,-23,f+3,-26,f-3,-26]);
      eyes(c,d,f,-24,3,p);
      if(ev){crest(c,p,f,-26,ev,5);if(ev>2){blade(c,p,-11,-14);blade(c,p,10,-14);}}
      return;
    }
    for(const s of [-1,1])for(let i=0;i<4;i++){
      const x=s*(6+i%2), y=-13+i*2;
      const end=s*(11+i%2);
      stroke(c,p[0],[s*3,y,x,y-4,end,y+step+i%2],2);
      stroke(c,p[2],[x,y-3,end,y+step+i%2]);
    }
    oval(c,p[0],-1,-11,7,8);oval(c,p[1],-1,-12,6,6);gem(c,-1,-13,p[3],3);
    oval(c,p[0],f,-6,5,5);oval(c,p[2],f,-7,4,3);eyes(c,d,f,-7,2,p);
    if(ev){crest(c,p,-1,-18,ev,ev>2?6:4);if(ev>2){crystal(c,-6,-10,p,9,3);crystal(c,5,-9,p,8,3);}}
  }
  function bird(c,k,p,d,step,ev){
    const f=d==='right'?3:0, flap=step?3:0,extend=ev>2?5:0;
    const fire=k==='phoenix';
    for(const s of [-1,1]){
      polygon(c,p[0],[s*3,-17,s*(9+extend),-20-flap,s*(16+extend),-22-flap,s*(14+extend),-15-flap,s*(10+extend),-12,s*7,-8,s*3,-12]);
      polygon(c,p[1],[s*4,-16,s*(11+extend),-21-flap,s*(15+extend),-21-flap,s*(12+extend),-16,s*8,-11,s*5,-11]);
      stroke(c,p[2],[s*7,-18-flap,s*(11+extend),-20-flap,s*(14+extend),-21-flap],2);
      if(fire||ev>2){
        stroke(c,p[3],[s*(8+extend),-14,s*(11+extend),-15,s*(15+extend),-19-flap]);
        spark(c,p[2],s*(17+extend),-17-flap,1);
      }
    }
    polygon(c,p[0],[-5,-12,5,-12,5,-6,3,-2,0,-4,-3,-1,-4,-6]);
    polygon(c,p[1],[-2,-11,3,-11,3,-6,0,-3,-2,-6]);
    if(fire){stroke(c,p[3],[-2,-10,-1,-6,-3,-3]);stroke(c,p[3],[1,-10,3,-7,3,-4]);}
    oval(c,p[0],f,-12,6,7);oval(c,p[2],f,-13,4,5);
    oval(c,p[0],f,-20,6,5);oval(c,k==='harpy'?p[3]:p[1],f,-20,5,4);
    if(d!=='up'){
      eyes(c,d,f,-21,2,p);
      if(k!=='harpy')polygon(c,p[3],[f-2,-18,f+5,-19,f+7,-17,f+1,-15]);
      else{box(c,p[0],f-5,-22,2,4);box(c,p[0],f+4,-22,2,4);box(c,p[1],f,-17,2);}
    }
    if(fire)stroke(c,p[3],[f-2,-23,f,-28,f+2,-24],2);
    if(ev)crest(c,p,f,-24,ev,ev>2?6:4);
  }
  function vapor(c,k,p,d,step,ev){
    const f=d==='right'?3:0,bob=step?1:0,fire=k==='ember';
    const wide=k==='djinn'?10:k==='shardling'?6:8;
    const crystalForm=k==='shardling';
    if(crystalForm){
      crystal(c,-2,-5,p,23,7);crystal(c,6,-8,p,13,4);crystal(c,-8,-7,p,9,3);
      eyes(c,d,f-2,-15,2,p);return;
    }
    polygon(c,p[0],[-wide,-15,-wide,-22,-4,-26-bob,-1,-30-bob,2,-26-bob,6,-25,wide,-20,wide,-14,3,-8,6,-6,1,-2,-4,-3,-1,-6,-5,-8]);
    polygon(c,p[1],[-wide+2,-16,-wide+2,-21,-3,-25-bob,0,-28-bob,3,-25,7,-21,7,-16,3,-10,4,-7,1,-4,-1,-5,0,-7,-4,-10]);
    polygon(c,p[2],[-5,-18,-4,-22,0,-23,4,-22,5,-19,4,-15,0,-13,-4,-15]);
    if(k==='djinn'){oval(c,p[0],0,-23,8,3);stroke(c,p[2],[-7,-23,-3,-25,3,-25,7,-22],2);gem(c,0,-24,p[3],2);}
    if(fire){stroke(c,p[3],[-3,-24,0,-28,2,-24],2);spark(c,p[2],8,-13,2);}
    eyes(c,d,f,-19,2,p);
    if(ev){crest(c,p,f,-26,ev,ev>2?7:5);for(const a of [-1,1])gem(c,a*(ev>2?14:11),-17+(step?a:0),p[3],ev>2?3:2);}
  }
  function serpent(c,k,p,d,step,ev){
    const side=d==='right',f=side?3:0;
    const tail=[-9,-4,-12,-7,-8,-10,-1,-9,6,-5,10,-6,12,-10-step];
    stroke(c,p[0],tail,6);
    stroke(c,p[1],[-9,-3,-10,-7,-7,-8,-1,-8,7,-4,11,-7,12,-10-step],4);
    stroke(c,p[2],[-11,-5,-8,-9,-3,-8,6,-5,9,-6]);
    oval(c,p[0],f,-11,6,8);oval(c,p[1],f,-12,5,6);
    stroke(c,p[3],[f-2,-18,f-1,-14,f,-10,f+1,-8],2);
    oval(c,p[0],f,-20,7,6);oval(c,p[2],f,-21,6,5);
    if(k==='leviathan'){
      polygon(c,p[1],[f-8,-20,f-10,-26,f-4,-23,f,-29,f+3,-24,f+9,-26,f+8,-20]);
      stroke(c,p[3],[f-9,-25,f-4,-22,f,-27,f+3,-23,f+8,-25]);
      scaleSpots(c,p,[[-9,-5],[2,-8],[7,-5]]);
    } else {
      polygon(c,p[1],[f-8,-19,f-5,-24,f,-27,f+5,-24,f+8,-19]);
      gem(c,f,-24,p[3],2);
      if(d!=='up')stroke(c,p[0],[f-5,-17,f-3,-15,f+3,-15,f+5,-17]);
    }
    eyes(c,d,f,-20,2,p);
    if(ev){crest(c,p,f,-25,ev,6);blade(c,p,9,-13,ev%2===0);}
    if(ev>2){crystal(c,-9,-13,p,7,3);crystal(c,13,-10,p,9,3);}
  }


  function kharun(c,p,d,step,phase,attack){
    const f=d==='right'?5:0;
    const lift=step;
    // Chisel-cut shins, shoulders and the one-handed foundry hammer.
    for(const s of [-1,1]){
      const y=s===1?lift:1-lift;
      polygon(c,p[0],[s*4,-19,s*15,-21,s*17,-13,s*16,-5+y,s*20,-3+y,s*20,y,s*5,y,s*4,-6+y]);
      polygon(c,p[1],[s*6,-18,s*14,-18,s*15,-12,s*13,-7,s*8,-5,s*6,-7]);
      polygon(c,p[2],[s*8,-17,s*12,-17,s*14,-13,s*12,-11,s*8,-12]);
      stroke(c,p[3],[s*8,-16,s*10,-15,s*10,-12]);
    }
    polygon(c,p[0],[-17,-43,-11,-48,10,-48,18,-41,19,-26,12,-18,-10,-17,-18,-24]);
    polygon(c,p[1],[-14,-41,-9,-46,10,-46,16,-41,15,-26,9,-19,-10,-19,-15,-26]);
    polygon(c,p[2],[-12,-40,-8,-44,8,-43,14,-39,12,-31,6,-30,-6,-33,-11,-31]);
    stroke(c,p[0],[-11,-31,-5,-34,-1,-30,4,-30,9,-26,12,-28],2);
    stroke(c,p[3],[-2,-33,2,-29,6,-29,8,-24,10,-24]);
    gem(c,0,-29,p[3],phase===2?7:5);
    for(const s of [-1,1]){
      polygon(c,p[0],[s*13,-42,s*22,-45,s*28,-38,s*28,-30,s*22,-26,s*14,-30]);
      polygon(c,p[1],[s*16,-39,s*22,-42,s*26,-37,s*25,-31,s*22,-28,s*15,-33]);
      stroke(c,p[2],[s*16,-38,s*22,-42,s*26,-36],3);
    }
    polygon(c,p[0],[-28,-32,-23,-30,-21,-22,-18,-17,-19,-10,-26,-10,-29,-15,-31,-24]);
    polygon(c,p[2],[-29,-25,-27,-29,-24,-27,-22,-21,-23,-14,-26,-14]);
    polygon(c,p[0],[19,-28,25,-32,29,-27,30,-18,27,-12,20,-13,19,-20]);
    polygon(c,p[1],[21,-27,25,-28,27,-23,27,-17,22,-16]);
    const hy=attack?-44:-23;
    rim(c,p[1],[23,-11,31,hy+5,34,hy],);
    stroke(c,p[3],[25,-11,32,hy+4]);
    polygon(c,p[0],[26,hy-7,31,hy-12,46,hy-12,49,hy-7,49,hy+1,46,hy+5,33,hy+5,28,hy+2]);
    polygon(c,p[1],[29,hy-6,33,hy-10,44,hy-10,47,hy-6,47,hy+1,44,hy+3,33,hy+3]);
    polygon(c,p[2],[30,hy-6,33,hy-9,45,hy-9,46,hy-5,43,hy-2,31,hy-2]);
    stroke(c,p[3],[34,hy-7,43,hy-7,42,hy-3]);
    stroke(c,p[0],[38,hy-9,38,hy-5,35,hy-3,35,hy+2]);
    // Visor and the chimney that reignites in phase II.
    polygon(c,p[0],[f-12,-46,f-11,-55,f-6,-61,f+7,-61,f+12,-56,f+12,-46,f+7,-42,f-6,-42]);
    polygon(c,p[1],[f-9,-47,f-9,-54,f-5,-58,f+6,-58,f+10,-54,f+10,-48,f+5,-45,f-6,-45]);
    stroke(c,p[2],[f-7,-53,f-6,-56,f+5,-57,f+9,-54],2);
    if(d!=='up'){
      box(c,p[0],f-8,-53,17,7);box(c,ink,f-7,-52,15,3);
      box(c,p[3],f-6,-52,5,1);box(c,p[3],f+2,-52,5,1);
      for(let x=-5;x<=5;x+=3)box(c,p[2],f+x,-47,1,2);
    }
    box(c,p[0],f-6,-63,12,4);box(c,p[2],f-4,-64,8,2);
    if(phase===2){
      polygon(c,'#ad4c5b',[f-5,-63,f-7,-68,f-3,-71,f-2,-77-lift,f+1,-71,f+4,-74,f+6,-66,f+4,-63]);
      polygon(c,p[3],[f-3,-63,f-2,-68,f,-71,f+1,-67,f+3,-66,f+2,-63]);
      for(const [x,y] of [[-26,-44],[-17,-49],[14,-47],[27,-48],[46,hy-17]])spark(c,p[3],x,y-lift,2);
    }
  }
  function syrava(c,p,d,step,phase,attack){
    const f=d==='right'?9:0, fan=phase===2?8:0, lift=step, tilt=attack?4:0;
    const tail=[-30,-11,-25,-13,-23,-18,-19,-21,-10,-22,0,-18,10,-13,20,-12,28,-17,29,-24,25,-30,17,-33,8,-34,4,-40];
    stroke(c,p[0],tail,12);
    stroke(c,p[1],[-31,-8,-26,-12,-24,-18,-19,-21,-10,-22,0,-18,10,-13,20,-12,28,-17,29,-24,25,-30,17,-33,8,-34,4,-40],9);
    stroke(c,p[2],[-31,-8,-28,-11,-26,-17,-20,-22,-12,-23,-2,-19,12,-14,21,-12,25,-16,28,-22,24,-29,16,-33,7,-34,2,-40],4);
    for(const [x,y] of [[-22,-17],[-16,-20],[-10,-21],[-3,-19],[6,-16],[13,-13],[22,-13],[27,-19],[25,-26],[20,-29],[14,-31],[8,-33]]){
      stroke(c,p[0],[x,y-1,x+1,y+1,x+1,y+3]);box(c,p[3],x-2,y,2);
    }
    for(const s of [-1,1]){
      polygon(c,p[0],[f+s*5,-38,f+s*11,-52+lift,f+s*(19+fan),-59+lift,f+s*(24+fan),-64+lift,f+s*(27+fan),-51,f+s*(24+fan),-45,f+s*(27+fan),-39,f+s*15,-42,f+s*8,-34]);
      polygon(c,p[1],[f+s*7,-39,f+s*12,-51+lift,f+s*(20+fan),-57+lift,f+s*(24+fan),-61+lift,f+s*(24+fan),-51,f+s*(21+fan),-45,f+s*(23+fan),-41,f+s*15,-44,f+s*9,-36]);
      for(let i=0;i<3;i++)stroke(c,p[2],[f+s*7,-39+i,f+s*13,-45-i*2,f+s*(21+fan),-45-i*5+lift],phase===2?2:1);
      if(phase===2)spark(c,p[3],f+s*(25+fan),-56+lift,2);
    }
    // Long prismatic face and crest.
    polygon(c,p[0],[f-13,-47,f-11,-57,f-7,-62,f+7,-62,f+13,-57,f+14,-47,f+9,-39+tilt,f+4,-36+tilt,f-5,-38+tilt,f-11,-41+tilt]);
    polygon(c,p[1],[f-11,-47,f-10,-55,f-7,-60,f+7,-60,f+11,-55,f+12,-47,f+7,-41+tilt,f+3,-38+tilt,f-5,-40+tilt,f-10,-43+tilt]);
    polygon(c,p[2],[f-10,-52,f-8,-57,f-3,-57,f,-55,f+3,-57,f+8,-57,f+11,-52,f+8,-47,f+3,-49,f,-47,f-3,-49,f-8,-47]);
    for(const s of [-1,1]){
      stroke(c,p[0],[f+s*7,-57,f+s*10,-63,f+s*14,-66,f+s*16,-69-lift],3);
      stroke(c,p[3],[f+s*7,-57,f+s*10,-63,f+s*14,-66,f+s*16,-69-lift]);
    }
    gem(c,f,-57,p[3],phase===2?4:3);
    if(d!=='up'){
      for(const x of d==='right'?[f+5]:[f-6,f+4]){box(c,p[0],x,-52,4,3);box(c,p[3],x+1,-52,2,2);}
      stroke(c,p[0],[f-8,-44+tilt,f-4,-42+tilt,f+5,-42+tilt,f+9,-44+tilt],2);
      stroke(c,p[3],[f-7,-44+tilt,f-6,-40+tilt]);stroke(c,p[3],[f+7,-44+tilt,f+6,-40+tilt]);
    }
  }
  function asterion(c,p,d,step,phase,attack){
    const lift=step,b=phase>=2, f=d==='right'?5:0;
    const spread=b?6:0;
    // A split astronomical halo with star points that escape in the final phase.
    const halo=[-25,-48,-24,-57,-20,-65,-13,-71,-4,-74,5,-74,14,-70,22,-63,26,-54,25,-48];
    stroke(c,p[0],halo,4);stroke(c,p[2],halo,2);
    stroke(c,p[3],[-22,-54,-19,-63,-12,-69,-4,-72,4,-72,13,-68,21,-60,23,-55]);
    for(const x of [-26,-16,0,15,26]){
      const y=-57-Math.round(18*(1-Math.abs(x)/26));
      gem(c,x,y-(b?lift+2:0),p[3],b?4:3);
    }
    for(const s of [-1,1]){
      polygon(c,p[0],[s*7,-52,s*(17+spread),-52,s*(25+spread),-44,s*(24+spread),-33,s*(22+spread),-22,s*(24+spread),-18,s*(20+spread),-12,s*(13+spread),-15,s*12,-29]);
      polygon(c,p[1],[s*12,-48,s*(18+spread),-49,s*(23+spread),-43,s*(22+spread),-34,s*(19+spread),-24,s*(21+spread),-18,s*(18+spread),-16,s*(15+spread),-18,s*14,-31]);
      polygon(c,p[2],[s*12,-48,s*(18+spread),-49,s*(23+spread),-43,s*(20+spread),-39,s*16,-43]);
      stroke(c,p[3],[s*14,-47,s*(18+spread),-48,s*(22+spread),-44]);
      gem(c,s*(20+spread),-22+(attack?-8:0)-lift,p[3],b?5:3);
      if(b){gem(c,s*39,-30-lift,p[2],4);spark(c,p[3],s*38,-44-lift,2);}
    }
    polygon(c,p[0],[-16,-47,-7,-55,7,-55,16,-47,15,-34,10,-29,14,-17,9,-10,9,-3,3,-9,0,-2,-6,-8,-11,-5,-11,-16,-15,-26]);
    polygon(c,p[1],[-13,-46,-5,-52,5,-52,13,-46,12,-35,8,-28,11,-17,7,-11,4,-12,1,-7,-5,-11,-8,-9,-8,-17,-13,-25]);
    polygon(c,p[2],[-11,-43,-6,-47,7,-47,12,-42,9,-35,4,-31,-5,-33,-9,-36]);
    stroke(c,p[2],[-11,-26,-6,-22,-7,-13]);stroke(c,p[2],[11,-25,6,-21,8,-14]);
    gem(c,0,-38,p[0],8);
    gem(c,0,-38,p[3],b?6:4);
    if(b){stroke(c,p[3],[-8,-41,-4,-36,-1,-35,-3,-28,0,-25,4,-22,4,-15]);spark(c,p[3],0,-38,8);}
    polygon(c,p[0],[f-11,-52,f-11,-60,f-6,-65,f+6,-65,f+11,-60,f+11,-52,f+6,-45,f-6,-45]);
    polygon(c,p[2],[f-8,-53,f-8,-59,f-4,-62,f+4,-62,f+8,-59,f+8,-53,f+4,-48,f-4,-48]);
    if(d!=='up'){
      polygon(c,p[0],[f-7,-57,f-2,-55,f+2,-55,f+7,-57,f+6,-52,f+2,-49,f-2,-49,f-6,-52]);
      stroke(c,p[3],[f-5,-55,f-2,-53,f+2,-53,f+5,-55]);gem(c,f,-59,p[3],2);
    }
  }
  const paintByKind={
    kobold:humanoid,orc:humanoid,gnome:humanoid,satyr:humanoid,dryad:humanoid,triton:humanoid,
    troll:humanoid,golem:humanoid,frostkin:humanoid,minotaur:humanoid,goblin:humanoid,
    sentinel:humanoid,crystalguard:humanoid,
    hare:beast,fox:beast,salamander:beast,chimera:beast,
    terrapin:shell,scarabkin:shell,scarab:shell,crawler:shell,
    fungus:stalk,mimic:stalk,spider:insect,mantis:insect,
    raven:bird,harpy:bird,phoenix:bird,
    sylph:vapor,djinn:vapor,ember:vapor,wisp:vapor,shade:vapor,shardling:vapor,
    naga:serpent,leviathan:serpent
  };
  const bossPaint={kharun,syrava,asterion};
  const floating=new Set(['raven','harpy','phoenix','sylph','djinn','ember','wisp','shade','shardling','asterion']);
  const legacy=new Set(['slime','wolf','elf','demon','drake','spirit','vampire','secret']);
  const frames=new Map(), size=114, anchorX=57, anchorY=104;
  function advancedLegacy(c,kind,dir,step,form,attack){
    const p=form===3?['#473a50','#ba7f59','#e3af8d','#ffde91']:['#394254','#587e92','#a2d6ce','#e4f8d2'];
    const float=['spirit','secret','slime'].includes(kind);
    const y=float?-19:['wolf','drake'].includes(kind)?-24:-32;
    const w=kind==='drake'?14:kind==='wolf'?12:10;
    for(const s of [-1,1]){
      if(form===3)polygon(c,p[0],[s*3,-12,s*w,-21,s*(w+3),-24-step,s*(w+2),-18,s*(w+1),-13,s*5,-8]);
      else stroke(c,p[1],[s*5,-11,s*w,-18,s*(w+3),-17,s*(w+4),-13,s*(w+2),-9],2);
    }
    original.draw(c,kind,0,0,{dir,moving:!!step,t:step*.19,evolution:form===3?1:2,attack});
    crest(c,p,0,y,form,kind==='slime'?4:6);
    for(const s of [-1,1]){
      if(form===3)spark(c,p[3],s*(w+2),y+12-step,2);
      else gem(c,s*(w+2),y+14-step,p[2],3);
    }
  }
  function frame(kind,dir,form,phase,step,hit,attack){
    const key=[kind,dir,form,phase,step,hit,attack].join('/');
    if(frames.has(key))return frames.get(key);
    const cv=document.createElement('canvas');
    cv.width=cv.height=size;
    const c=cv.getContext('2d',{willReadFrequently:true});
    c.save();c.translate(anchorX,anchorY);
    if(dir==='left')c.scale(-1,1);
    const orientation=dir==='left'?'right':dir, p=palettes[kind]&&palette(kind,form,phase);
    if(bossPaint[kind])bossPaint[kind](c,p,orientation,step,phase,attack);
    else if(legacy.has(kind))advancedLegacy(c,kind,orientation,step,form,attack);
    else paintByKind[kind](c,kind,p,orientation,step,form,attack);
    c.restore();
    const pixels=c.getImageData(0,0,size,size);
    outline(pixels.data,hit);
    c.putImageData(pixels,0,0);
    let left=size,right=0,top=size,bottom=0;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(pixels.data[(y*size+x)*4+3]>32){
      left=Math.min(x,left);right=Math.max(x,right);top=Math.min(y,top);bottom=Math.max(y,bottom);
    }
    const result={cv,x:left,y:top,w:right-left+1,h:bottom-top+1};
    frames.set(key,result);
    return result;
  }
  function outline(data,hit){
    const opaque=new Uint8Array(size*size);
    for(let i=0;i<opaque.length;i++)opaque[i]=data[i*4+3]>128?1:0;
    for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++) {
      const i=y*size+x,k=i*4;
      if(opaque[i]){
        if(hit){data[k]=Math.min(255,data[k]+130);data[k+1]=(data[k+1]+232)>>1;data[k+2]=(data[k+2]+216)>>1;}
      }else if(opaque[i-1]||opaque[i+1]||opaque[i-size]||opaque[i+size]){
        data[k]=31;data[k+1]=31;data[k+2]=47;data[k+3]=255;
      }
    }
  }
  function supported(kind,form){
    if(kind==='goblin')return form>0;
    return !!bossPaint[kind]||!!paintByKind[kind]||(legacy.has(kind)&&form>2);
  }
  function draw(c,kind,x,y,opts={}){
    const form=Number(opts.evolution)||0;
    if(!supported(kind,form))return original.draw(c,kind,x,y,opts);
    const hover=floating.has(kind);
    const step=opts.moving||hover?Math.floor((opts.t||0)*(opts.moving?7:3.6))%2:0;
    const phase=Number(opts.phase)||1, sprite=frame(kind,opts.dir||'down',form,phase,step,!!opts.hit,!!opts.attack);
    const lift=hover?2+step:opts.moving?step:0;
    c.save();c.imageSmoothingEnabled=false;
    const r=bossPaint[kind]?kind==='syrava'?27:21:8;
    oval(c,'rgba(20,18,35,.27)',Math.round(x),Math.round(y)-1,r,r>8?4:2);
    c.drawImage(sprite.cv,sprite.x,sprite.y,sprite.w,sprite.h,
      Math.round(x)-anchorX+sprite.x,Math.round(y)-anchorY+sprite.y-lift,sprite.w,sprite.h);
    c.restore();
  }
  function portrait(c,kind,x,y,sz,opts={}){
    const form=Number(opts.evolution)||0;
    if(!supported(kind,form))return original.portrait(c,kind,x,y,sz,opts);
    const sprite=frame(kind,'down',form,opts.phase||1,0,false,false);
    const zoom=sz*.91/Math.max(sprite.w,sprite.h);
    const sw=Math.max(1,Math.round(sprite.w*zoom)),sh=Math.max(1,Math.round(sprite.h*zoom));
    c.save();c.imageSmoothingEnabled=false;
    c.drawImage(sprite.cv,sprite.x,sprite.y,sprite.w,sprite.h,
      Math.round(x+(sz-sw)/2),Math.round(y+(sz-sh)/2),sw,sh);
    c.restore();
  }
  window.ActorArt={...original,draw,portrait};
})();
