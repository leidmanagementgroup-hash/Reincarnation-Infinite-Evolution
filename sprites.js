/* Drawn on an integer grid. Coordinates in each study are relative to the feet. */
window.ActorArt = (() => {
  "use strict";
  const ink = "#242438";
  const white = "#fff5d4";
  const catalogue = {
    slime: ["#254576","#287ab0","#45c2d1","#c2fff1"],
    goblin: ["#374e3e","#648653","#90b870","#d5df90"],
    wolf: ["#3a4b6c","#5577a6","#89b6d1","#e0ecdc"],
    elf: ["#273e49","#3d6970","#69a296","#d1ddb3"],
    demon: ["#492945","#82405d","#c4677b","#f9aa91"],
    drake: ["#453d42","#997145","#cfaa62","#ffe4aa"],
    spirit: ["#355174","#557cb5","#7fd8d3","#edffe8"],
    vampire: ["#392b48","#654768","#a9798a","#ead2c1"],
    secret: ["#393463","#705a9e","#a590dc","#fbdeab"],
    elder: ["#3d4750","#576b74","#8c9b91","#e5d7b5"],
    merchant: ["#653548","#965069","#cf7977","#f5bc82"],
    smith: ["#553b36","#84533e","#c28758","#e7ba86"],
    moth: ["#493551","#805688","#bd82b2","#ffde9c"],
    thorn: ["#3d493b","#667146","#9ca05c","#dcc880"],
    feral: ["#443844","#675064","#a5787e","#dcb998"],
    boss: ["#3e333a","#624747","#956a57","#c69a6e"]
  };
  const frames = new Map();
  const icons = new Map();
  const formColors = {
    slime:["#52c6cd","#c4afe3"],goblin:["#a49d65","#8aaf70"],elf:["#8cbdaf","#92bc79"],
    wolf:["#8ec6d3","#d1d8d5"],drake:["#df925f","#cabbc0"],spirit:["#accfba","#abcdb8"],
    vampire:["#c47285","#af84ad"],demon:["#d68b73","#bd737d"],secret:["#aa8bdd","#cbb3d0"]
  };
  const round = Math.round;
  function rect(c,color,x,y,w=1,h=1) {
    c.fillStyle = color;
    c.fillRect(round(x),round(y),w,h);
  }
  function oval(c,color,x,y,rx,ry) {
    for (let j=-ry;j<=ry;j++) {
      const dx=Math.floor(rx*Math.sqrt(Math.max(0,1-(j/(ry+.38))**2)));
      rect(c,color,x-dx,y+j,dx*2+1,1);
    }
  }
  function line(c,color,points,thick=1) {
    for(let k=2;k<points.length;k+=2) {
      const x0=points[k-2], y0=points[k-1], dx=points[k]-x0, dy=points[k+1]-y0;
      const length=Math.max(Math.abs(dx),Math.abs(dy),1);
      for(let n=0;n<=length;n++) rect(c,color,x0+dx*n/length,y0+dy*n/length,thick,thick);
    }
  }
  function shape(c,color,pts) {
    let minY=Infinity,maxY=-Infinity;
    for(let i=1;i<pts.length;i+=2){minY=Math.min(minY,pts[i]);maxY=Math.max(maxY,pts[i]);}
    for(let y=Math.ceil(minY);y<=maxY;y++){
      const xs=[];
      for(let i=0,j=pts.length-2;i<pts.length;j=i,i+=2){
        const ay=pts[j+1], by=pts[i+1];
        if ((ay>y+.01)!==(by>y+.01)) xs.push(pts[j]+(y+.01-ay)*(pts[i]-pts[j])/(by-ay));
      }
      xs.sort((a,b)=>a-b);
      for(let i=0;i+1<xs.length;i+=2) rect(c,color,Math.ceil(xs[i]),y,Math.max(1,Math.floor(xs[i+1])-Math.ceil(xs[i])+1));
    }
    line(c,color,[...pts,pts[0],pts[1]]);
  }
  function star(c,color,x,y,r=2) {
    rect(c,color,x-r,y,r*2+1,1);rect(c,color,x,y-r,1,r*2+1);rect(c,white,x,y);
  }
  function humanoid(c,kind,p,dir,step,ev,attack){
    const back=dir==="up", side=dir==="right", face=side?2:0, stroll=step%2;
    const skin=kind==="goblin"?["#648653","#9ac17c","#d0d991"]:kind==="demon"?["#a85265","#dc8291","#f6adaa"]:kind==="vampire"?["#ac8297","#dbc5ca","#f3ddd0"]:["#ad7063","#dfaa8d","#f4caa2"];
    const hair={goblin:["#3b423d","#59664a","#87915f"],elf:["#845b46","#c79d67","#ffdda0"],demon:["#352a46","#5a3b62","#96567d"],vampire:["#302a42","#54445e","#897793"],elder:["#6b6268","#aaa59c","#f1e4ca"],merchant:["#4e3241","#704151","#975963"],smith:["#5e3d36","#996343","#cf8a50"]}[kind];
    // Rear footwear, long coats and sleeves share a direction.
    rect(c,ink,-5,-4-stroll,4,4);rect(c,"#5d5055",-5,-3-stroll,3,2);
    rect(c,ink,2,-4+stroll,4,4);rect(c,"#71605a",2,-2+stroll,4,1);
    shape(c,p[0],[-4,-15,4,-15,7,-12,7,-7,5,-7,6,-3,1,-3,0,-4,-4,-3,-6,-4,-5,-7,-7,-7,-7,-11]);
    shape(c,p[1],[-4,-14,3,-14,5,-12,4,-9,5,-5,1,-5,-1,-7,-4,-5,-5,-7,-4,-11]);
    rect(c,p[2],-3,-12,2,5);rect(c,p[2],3,-12,2,3);
    if(!back){
      shape(c,kind==="smith"?"#6b453b":"#59414a",[-4,-13,-2,-13,3,-8,4,-7,2,-7,-3,-11]);
      rect(c,"#644d45",-4,-7,9,2);rect(c,"#e1bb74",1,-7,2,1);
    } else line(c,p[2],[-2,-12,0,-9,-1,-6]);
    rect(c,skin[1],-7,-8-stroll,2,3);rect(c,skin[1],5,-8+(attack?-3:stroll),2,3);
    if(kind==="elder"){
      line(c,"#695344",[8,-2,8,-15,10,-17,8,-19],2);
      rect(c,"#c0a877",8,-16,2,3);rect(c,"#94ded0",9,-19,2,2);
    }
    if(kind==="smith"){
      rect(c,"#664d42",7,-12,2,7);rect(c,"#484654",5,-15,7,4);rect(c,"#b6bbc0",5,-15,5,1);
    }
    if(kind==="elf"||kind==="goblin"||kind==="vampire"){
      shape(c,skin[0],[-4,-22,-10,-22,-7,-18,-4,-17,4,-17,8,-20,9,-23,3,-21]);
      if(!side)rect(c,skin[2],-8,-21,3,1);
    }
    oval(c,skin[0],face,-19,6,5);
    oval(c,skin[1],face,-20,5,4);
    rect(c,skin[2],face-3,-21,4,1);
    if(!back){
      if(!side){rect(c,ink,-3,-20,2,2);rect(c,white,-3,-20);rect(c,skin[0],-4,-17,2,1);}
      rect(c,ink,side?4:2,-20,2,2);rect(c,white,side?5:2,-20);
      rect(c,skin[0],face,-16,2,1);
    }
    if(back) {
      oval(c,hair[0],0,-20,6,6);oval(c,hair[1],-1,-21,5,4);
      line(c,hair[2],[-4,-22,-2,-24,1,-24]);rect(c,hair[0],-3,-16,2,3);
    } else {
      shape(c,hair[0],[-6,-17,-7,-22,-5,-25,-2,-26,3,-26,6,-23,7,-20,5,-21,3,-23,0,-20,0,-23,-3,-20,-4,-18]);
      shape(c,hair[1],[-6,-21,-5,-24,-2,-25,2,-25,4,-24,1,-24,-2,-22,-3,-21,-3,-23]);
      rect(c,hair[2],-3,-24,3,1);rect(c,hair[2],1,-25,2,1);
    }
    if(kind==="goblin"){rect(c,"#f8e1ac",face-3,-16,1,2);rect(c,"#f8e1ac",face+3,-17,1,2);rect(c,"#dbb06a",-8,-19,2,2);}
    if(kind==="elf"){line(c,"#587e65",[-5,-23,0,-24,4,-23]);rect(c,"#a3eae0",0,-24,2,2);rect(c,"#e6ce78",-7,-18,1,3);}
    if(kind==="demon"){
      shape(c,"#b7a897",[-6,-22,-8,-26,-7,-30,-5,-26,-3,-25]);shape(c,"#d0bdb0",[4,-24,6,-26,7,-29,8,-25,7,-22]);
      rect(c,white,-7,-28);rect(c,white,7,-27);
    }
    if(kind==="vampire"){shape(c,"#af5363",[-7,-16,-2,-14,0,-11,4,-14,7,-17,6,-13,0,-9,-5,-13]);if(!back)rect(c,white,face+2,-16,1,2);}
    if(kind==="elder"&&!back){
      shape(c,hair[1],[-5,-17,-2,-16,0,-17,2,-16,5,-17,4,-13,1,-11,-1,-12,-3,-12]);
      rect(c,hair[2],-3,-15,3,2);rect(c,hair[2],1,-14,2,1);
    }
    if(kind==="merchant"){
      shape(c,p[1],[-7,-23,-5,-26,-1,-27,2,-27,5,-25,6,-23,8,-22,7,-21,-7,-22]);
      rect(c,"#f6c775",-6,-23,12,1);rect(c,"#e4a77a",-3,-26,4,1);
    }
    if(kind==="smith"){rect(c,"#9c5345",-6,-23,12,2);rect(c,"#eaaa74",-5,-23,7,1);rect(c,"#d8a776",-3,-12,6,4);}
    if(ev) formDetails(c,kind,ev);
  }
  function regalia(c,ev,x,y){
    if(ev===1){
      shape(c,"#b78850",[x-6,y,x-7,y-4,x-3,y-2,x,y-5,x+2,y-2,x+6,y-4,x+5,y+1,x-5,y+1]);
      line(c,"#f5d68b",[x-5,y,x+4,y]);rect(c,"#a3fff0",x,y-2,2,2);
    } else {
      line(c,"#8d76bb",[x-5,y+1,x-8,y-2,x-9,y-5]);line(c,"#b697de",[x+5,y+1,x+8,y-2,x+9,y-5]);
      star(c,"#f4b9e5",x+4,y-5,1);rect(c,"#d1baff",x-9,y-5);
    }
  }
  function formDetails(c,kind,ev){
    const assault=ev===1;
    if(kind==="slime"){
      if(assault){
        shape(c,"#3688a1",[-8,-11,-7,-17,-3,-21,2,-22,4,-21,2,-19,1,-18,4,-17,6,-15,2,-15,-1,-16,-4,-15]);
        line(c,"#a2f1de",[-6,-16,-3,-19,0,-20,3,-20]);rect(c,white,-2,-19,2,1);
      }else{
        for(const [x,y,h] of [[-8,-7,6],[-4,-14,8],[3,-14,5],[8,-7,5]]){
          shape(c,"#8c78b0",[x-2,y,x-2,y-h+3,x,y-h,x+2,y-h+2,x+2,y-1]);
          line(c,"#e8d6f6",[x,y-h+1,x,y-2]);
        }
      }
    }else if(kind==="goblin"){
      if(assault){
        line(c,"#9e7756",[6,-7,11,-18],2);
        shape(c,"#8daf90",[9,-17,10,-21,14,-23,17,-22,15,-22,12,-19,12,-16]);
        line(c,"#e3d7a6",[11,-20,13,-22,16,-22]);rect(c,"#c89454",-5,-25,8,2);
      }else{
        shape(c,"#466249",[-14,-16,-10,-17,-8,-15,-6,-15,-7,-8,-11,-4,-14,-8]);
        line(c,"#9db573",[-12,-14,-10,-12,-10,-7]);line(c,"#c1ba77",[-10,-11,-8,-13]);
        line(c,"#a6be75",[-5,-24,-6,-27,-4,-26,-2,-24,0,-26,3,-25,5,-27]);
      }
    }else if(kind==="elf"){
      if(assault){
        line(c,"#ccaa6b",[7,-23,11,-20,13,-15,13,-11,10,-6,6,-3],2);
        line(c,"#e1ddc3",[7,-22,6,-4]);
        rect(c,"#a2daca",-5,-25,7,1);star(c,"#d9f5dc",2,-25,1);
      }else{
        line(c,"#947d58",[-9,-2,-8,-12,-10,-21],2);
        shape(c,"#7eac80",[-9,-19,-14,-23,-14,-26,-10,-24,-9,-21,-7,-25,-4,-26,-5,-22]);
        rect(c,"#cdeb9e",-12,-24,2,1);rect(c,"#a1d1a3",-1,-12,3,2);
      }
    }else if(kind==="vampire"||kind==="demon"){
      if(kind==="vampire"&&!assault){regalia(c,1,0,-26);return;}
      if(kind==="demon"&&!assault){
        shape(c,"#a25059",[-14,-16,-9,-18,-5,-15,-6,-7,-10,-3,-14,-8]);
        line(c,"#ecc088",[-13,-15,-9,-16,-7,-15,-8,-9,-10,-6]);
        rect(c,"#efb882",-11,-12,3,1);rect(c,"#efb882",-10,-13,1,4);return;
      }
      for(const sign of [-1,1]){
        c.save();c.scale(sign,1);
        shape(c,kind==="vampire"?"#73364e":"#8d4553",[6,-11,7,-17,11,-22,15,-23,14,-21,15,-15,12,-17,11,-13,9,-14,8,-10]);
        line(c,kind==="vampire"?"#d98792":"#f08e68",[7,-14,9,-18,13,-21]);c.restore();
      }
    }else if(kind==="wolf"||kind==="drake"){
      if(kind==="drake"&&assault){
        for(const sign of [-1,1]){
          c.save();c.scale(sign,1);
          shape(c,"#805347",[5,-12,8,-18,14,-24,16,-24,14,-19,15,-13,12,-15,11,-11,9,-12,7,-9]);
          line(c,"#edb46c",[6,-13,10,-19,14,-22]);c.restore();
        }
      }else if(kind==="drake"){
        for(const [x,y,h] of [[-10,-10,6],[-8,-15,8],[0,-20,5],[7,-15,7]]){
          shape(c,"#998ba3",[x-2,y,x-2,y-h+2,x,y-h,x+2,y-h+2,x+1,y]);
          rect(c,"#f3e1c0",x-1,y-h+2,1,h-2);
        }
      }else{
        for(const sign of [-1,1]){
          c.save();c.scale(sign,1);
          shape(c,assault?"#77aabf":"#bfccd7",[3,-10,6,-13,9,-14,8,-11,11,-11,8,-8,8,-6,5,-7,4,-5]);
          line(c,assault?"#bdf6e4":"#f5f0df",[5,-9,8,-12]);c.restore();
        }
        if(!assault)star(c,"#dfebd6",1,-17,1);
      }
    }else if(kind==="spirit"){
      if(assault){
        shape(c,"#e8af72",[-5,-20,-4,-25,-2,-24,2,-32,3,-29,6,-31,5,-26,2,-22,1,-24,-2,-20]);
        line(c,"#ffe7a8",[-1,-24,2,-28]);star(c,"#efc681",8,-19,1);
      }else{
        line(c,"#d0a86d",[-6,-20,-7,-12,-5,-8,-1,-6,4,-8,7,-12,6,-20]);
        line(c,"#efcd93",[-6,-19,-3,-22,0,-23,3,-22,6,-19]);
        rect(c,"#c19a67",-2,-7,4,2);rect(c,"#edd49b",0,-5,1,4);
      }
    }else if(kind==="secret"){
      if(assault){
        shape(c,"#ad8ed2",[-10,-18,-9,-23,-5,-27,-2,-28,-5,-22,-5,-18,-3,-15,-7,-16]);star(c,"#f2c79d",9,-16,2);
      } else {
        line(c,"#d7b882",[-10,-12,-7,-17,2,-22,8,-22,10,-20,7,-15,0,-10,-7,-8,-10,-9,-10,-12]);
        star(c,"#f0d9ac",7,-21,2);rect(c,"#ddcaf1",-8,-10,2,1);
      }
    }
  }
  function slime(c,p,dir,step,ev) {
    const h=step%2,side=dir==="right"?2:0;
    shape(c,p[0],[-10,-3,-10,-7,-7,-12,-4,-14+h,-2,-15+h,-1,-18+h,1,-15+h,4,-14+h,8,-11,10,-7,10,-4,8,-2,3,-1,0,-2,-4,-1,-8,-2]);
    oval(c,p[1],0,-7,9,5);oval(c,p[2],-1,-8,7,5);
    rect(c,p[3],-5,-11,4,1);rect(c,white,-5,-10,2,2);rect(c,p[3],-7,-8,2,1);
    line(c,p[1],[-5,-3,-2,-3,0,-4,3,-3,5,-4]);rect(c,p[3],6,-6,2,1);
    if(dir!=="up"){
      rect(c,ink,-2+side,-8,2,3);rect(c,ink,4+side,-8,2,3);rect(c,white,-2+side,-8);rect(c,white,4+side,-8);
      rect(c,"#36616f",1+side,-5,2,1);
    }
    if(ev)formDetails(c,"slime",ev);
  }
  function beast(c,kind,p,dir,step,ev){
    const back=dir==="up",side=dir==="right", s=step%2;
    const tail=kind==="drake"?[-6,-6,-11,-6,-15,-11,-15,-15,-13,-12,-11,-10,-6,-11]:[-5,-6,-11,-7,-15,-12,-16,-17,-13,-14,-12,-16,-10,-12,-6,-12];
    shape(c,p[0],tail);line(c,p[2],[-14,-14,-12,-10,-8,-9],2);
    const hx=side?3:0;
    oval(c,p[0],-2,-7,7,5);oval(c,p[1],-2,-8,6,4);
    for(let i=0;i<2;i++){const x=i*7-5;rect(c,p[0],x,-5,3,5-(i===s?1:0));rect(c,p[3],x,-2,3,1);}
    c.save();c.translate(hx,0);
    if(kind==="drake"){
      shape(c,p[0],[-4,-11,-10,-13,-12,-20,-9,-18,-8,-19,-7,-15,-3,-14]);
      shape(c,p[2],[-5,-13,-10,-15,-11,-18,-8,-16]);
      shape(c,p[0],[3,-11,8,-13,10,-19,8,-17,7,-18,5,-15]);
      line(c,"#edce8e",[-6,-19,-7,-23,-5,-21],2);line(c,"#edce8e",[4,-20,6,-23,5,-20],2);
    } else {
      shape(c,p[0],[-7,-15,-7,-24,-5,-23,-1,-19,3,-19,7,-24,7,-16]);
      shape(c,p[2],[-6,-17,-6,-22,-2,-18]);shape(c,"#bf8c94",[4,-18,6,-22,6,-18]);
    }
    shape(c,p[0],[-7,-17,-4,-19,1,-20,5,-19,7,-16,7,-14,9,-12,6,-12,6,-10,2,-8,-2,-8,-6,-10,-8,-10,-7,-13,-9,-13]);
    shape(c,p[1],[-7,-15,-4,-18,1,-19,5,-18,6,-15,5,-12,3,-10,-2,-10,-5,-11,-4,-13,-7,-12]);
    line(c,p[2],[-5,-16,-2,-18,0,-17,3,-18],2);
    if(!back){
      const q=side?2:0;
      shape(c,p[3],[-5+q,-13,-2+q,-12,q,-13,2+q,-12,4+q,-13,4+q,-11,1+q,-9,-1+q,-9]);
      rect(c,ink,-4+q,-15,2,2);rect(c,white,-4+q,-15);rect(c,ink,3+q,-15,2,2);rect(c,white,3+q,-15);
      rect(c,ink,q,-12,2,1);
    }
    if(kind==="drake") {rect(c,"#eaca7b",-1,-21,3,3);rect(c,"#f4e8aa",0,-21,2,1);}
    if(ev) formDetails(c,kind,ev);
    c.restore();
  }
  function wisp(c,kind,p,dir,step,ev){
    const twist=step%2?1:-1, q=dir==="right"?2:0;
    shape(c,p[0],[-6,-18,-3,-24,-2,-29,1,-25,4,-26,4,-22,7,-19,9,-13,8,-8,4,-5,2,-2,-2,-1,0,-4,-3,-5,-7,-8,-8,-13]);
    shape(c,p[1],[-6,-17,-2,-22,-1,-26,1,-22,3,-23,5,-19,7,-15,7,-10,2,-6,0,-4,0,-7,-4,-8,-6,-12]);
    shape(c,p[2],[-5,-16,-2,-20,0,-24,1,-20,3,-21,5,-17,5,-13,3,-10,0,-9,-3,-10,-5,-13]);
    if(dir!=="up"){
      oval(c,p[3],q,-15,4,4);rect(c,p[0],q-2,-16,1,3);rect(c,p[0],q+2,-16,1,3);
    }
    if(kind==="secret"){
      shape(c,"#e6bd7e",[-8,-17,-5,-20,-1,-21,1,-20,5,-21,7,-18,4,-19,2,-18,0,-19,-3,-18,-6,-17]);
      star(c,"#e9cda1",-9,-9+twist,1);star(c,"#e9cda1",8,-22-twist,1);
    } else {
      rect(c,p[2],-9,-9+twist,2,2);rect(c,p[3],8,-20-twist,1,2);
    }
    if(ev)formDetails(c,kind,ev);
  }
  function moth(c,p,dir,step){
    const d=step%2*2;
    for(const side of [-1,1]){
      c.save();c.scale(side,1);
      shape(c,p[0],[0,-12,4,-18,12,-20+d,13,-18+d,12,-13,9,-10,10,-8,8,-4,5,-5,1,-9]);
      shape(c,p[2],[2,-13,6,-17,11,-18+d,10,-14,6,-11,3,-11]);
      rect(c,p[3],8,-16+d,2,2);rect(c,p[1],5,-13,3,2);rect(c,p[2],5,-9,3,2);c.restore();
    }
    oval(c,"#52394f",0,-11,2,5);rect(c,"#d6a678",-1,-14,3,4);
    line(c,p[3],[-1,-15,-3,-18,-4,-18]);line(c,p[3],[1,-15,3,-18,4,-18]);
  }
  function thorn(c,p,dir,step){
    const k=step%2;
    line(c,"#675044",[-4,-8,-7,-3,-8,-2+k],2);line(c,"#805942",[3,-7,5,-4,7,-2-k],2);
    for(const [x,y] of [[-7,-11],[-5,-16],[0,-18],[4,-16],[7,-12]]){
      shape(c,p[0],[x-3,y+2,x-4,y-3,x-2,y-1,x,y-5,x+2,y+1,x+2,y+4]);
      rect(c,p[2],x-1,y-1,2,2);
    }
    oval(c,p[0],0,-10,7,5);oval(c,p[1],-1,-11,5,4);rect(c,p[2],-4,-13,4,2);
    if(dir!=="up"){rect(c,"#ffdd91",-4,-10,2,2);rect(c,"#ffdd91",2,-10,2,2);rect(c,ink,-1,-7,2,1);}
    rect(c,"#db9272",1,-16,2,2);rect(c,"#eeb595",3,-15,2,2);
  }
  function stag(c,p,dir,step,phase){
    const shift=step%2, glow=phase===2?"#ff9d75":"#85dfc6",light=phase===2?"#ffdf96":"#dcffe0";
    // Silhouette is a broad pair of bare branches over a narrow, hollow chest.
    for(const side of [-1,1]){
      c.save();c.scale(side,1);
      line(c,p[0],[8,-25,12,-19,10,-12,13,-5,12,-1],3);
      line(c,p[1],[9,-24,12,-19,10,-12],2);rect(c,"#d7ad78",12,-2,3,1);
      c.restore();
    }
    oval(c,p[0],0,-27,12,13);oval(c,p[1],-2,-28,10,11);
    shape(c,p[2],[-9,-35,-4,-39,3,-39,8,-35,6,-33,5,-34,0,-31,-3,-32,-6,-29,-6,-32,-10,-31]);
    for(const side of [-1,1]){
      c.save();c.scale(side,1);
      const lift=(side===1?shift:0);
      shape(c,p[0],[4,-25,9,-24,9,-17,7,-10,6,-4-lift,8,-2-lift,8,-1-lift,4,-1-lift,3,-7,4,-15,2,-19]);
      line(c,p[2],[7,-22,6,-16,5,-11,5,-5]);rect(c,p[3],5,-3-lift,2,2);
      line(c,p[2],[9,-29,7,-27,5,-27]);line(c,p[3],[8,-29,7,-28]);
      c.restore();
    }
    shape(c,ink,[-3,-31,0,-34,3,-31,3,-25,0,-22,-3,-24]);
    line(c,glow,[-2,-28,0,-31,1,-29,0,-27,1,-25,-1,-24]);rect(c,light,-1,-28,2,2);
    for(const side of [-1,1]){
      c.save();c.scale(side,1);
      const branch=(pts,w=2)=>{line(c,p[0],pts,w+2);line(c,p[2],pts,w);};
      branch([3,-45,8,-50,14,-52,18,-56,22,-61,23,-64],2);
      branch([13,-52,12,-57,14,-62,14,-65],1);
      branch([17,-56,21,-56,25,-58,29,-63],1);
      branch([21,-60,19,-64,20,-68],1);
      branch([8,-49,7,-53,8,-57],1);
      line(c,p[3],[5,-47,9,-50,14,-52,17,-55]);
      line(c,glow,[10,-51,13,-52,14,-54]);rect(c,light,14,-54);
      shape(c,p[0],[4,-42,9,-47,14,-47,13,-43,9,-40,5,-40]);
      line(c,p[2],[7,-42,10,-45,12,-45],2);
      const f=(x,y)=>{shape(c,glow,[x-2,y,x-2,y-3,x+1,y-7-shift,x,y-3,x+2,y-4,x+2,y-1,x,y+1]);rect(c,light,x-1,y-2,2,2);};
      f(20,-66);if(phase===2)f(13,-63);
      c.restore();
    }
    shape(c,p[0],[-6,-46,-2,-48,3,-48,7,-45,7,-42,5,-40,3,-35,1,-32,-1,-32,-4,-36,-5,-40,-8,-42]);
    shape(c,"#ad987e",[-5,-45,-2,-46,3,-46,5,-44,5,-42,2,-39,1,-34,-1,-34,-3,-39,-5,-41]);
    shape(c,"#d9c7a4",[-4,-44,-2,-46,0,-45,2,-46,4,-44,2,-43,0,-42,-2,-43]);
    rect(c,ink,-5,-42,3,2);rect(c,ink,2,-42,3,2);rect(c,glow,-4,-42,2,1);rect(c,glow,2,-42,2,1);
    rect(c,ink,-1,-36,3,2);line(c,glow,[0,-45,-1,-43,0,-41]);rect(c,light,0,-45);
  }
  function frame(kind,dir,step,ev,phase,hit,attack){
    const key=[kind,dir,step,ev,phase,hit,attack].join("/");
    if(frames.has(key))return frames.get(key);
    const cv=document.createElement("canvas");cv.width=88;cv.height=84;
    const c=cv.getContext("2d");c.translate(44,78);
    const flip=dir==="left", ori=flip?"right":dir;
    if(flip)c.scale(-1,1);
    let p=catalogue[kind]||catalogue.spirit;
    if(ev&&formColors[kind])p=[p[0],p[1],formColors[kind][ev-1]||p[2],ev===1?"#ffe3a0":"#f1e9da"];
    if(kind==="slime")slime(c,p,ori,step,ev);
    else if(["wolf","drake","feral"].includes(kind))beast(c,kind,p,ori,step,ev);
    else if(["spirit","secret"].includes(kind))wisp(c,kind,p,ori,step,ev);
    else if(kind==="moth")moth(c,p,ori,step);
    else if(kind==="thorn")thorn(c,p,ori,step);
    else if(kind==="boss")stag(c,p,ori,step,phase);
    else if(catalogue[kind])humanoid(c,kind,p,ori,step,ev,attack);
    else wisp(c,"spirit",p,ori,step,ev);
    // A single-pixel contour remains crisp at any camera zoom.
    const pixels=c.getImageData(0,0,88,84), original=new Uint8ClampedArray(pixels.data);
    const data=pixels.data;
    let minX=88,minY=84,maxX=0,maxY=0;
    for(let y=1;y<83;y++)for(let x=1;x<87;x++){
      const i=(y*88+x)*4;
      if(original[i+3]){
        if(hit){data[i]=255;data[i+1]=(data[i+1]+235)>>1;data[i+2]=(data[i+2]+225)>>1;}
      } else if(original[i-4+3]||original[i+4+3]||original[i-352+3]||original[i+352+3]){
        data[i]=30;data[i+1]=32;data[i+2]=46;data[i+3]=255;
      }
      if(data[i+3]){minX=Math.min(x,minX);maxX=Math.max(x,maxX);minY=Math.min(y,minY);maxY=Math.max(y,maxY);}
    }
    c.putImageData(pixels,0,0);
    const sprite={cv,x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1};
    frames.set(key,sprite);return sprite;
  }
  function draw(c,kind,x,y,opts={}){
    const t=opts.t||0,active=opts.moving||["moth","spirit","secret","slime"].includes(kind);
    const step=active?Math.floor(t*(opts.moving?7:3.7))%2:0;
    const lift=["moth","spirit","secret"].includes(kind)?2+step:(opts.moving?step:0);
    const f=frame(kind,opts.dir||"down",step,Number(opts.evolution)||0,opts.phase||1,!!opts.hit,!!opts.attack);
    c.save();c.imageSmoothingEnabled=false;
    const rx=kind==="boss"?15:kind==="moth"?6:7;
    oval(c,"rgba(26,27,38,0.25)",round(x),round(y)-1,rx,kind==="boss"?4:2);
    c.drawImage(f.cv,f.x,f.y,f.w,f.h,round(x)-44+f.x,round(y)-78+f.y-lift,f.w,f.h);
    c.restore();
  }
  function portrait(c,kind,x,y,size,opts={}){
    const f=frame(kind,"down",0,Number(opts.evolution)||0,opts.phase||1,false,false);
    const human=["goblin","elf","demon","vampire","elder","merchant","smith"].includes(kind);
    let sx=f.x,sy=f.y,sw=f.w,sh=f.h;
    if(human){sw=26;sh=26;sx=44-13;sy=f.y-1;}
    if(kind==="boss"){sx=20;sy=11;sw=49;sh=49;}
    const scale=size*.92/Math.max(sw,sh);
    c.save();c.imageSmoothingEnabled=false;
    c.drawImage(f.cv,sx,sy,sw,sh,round(x+(size-sw*scale)/2),round(y+(size-sh*scale)/2),round(sw*scale),round(sh*scale));
    c.restore();
  }
  function paintIcon(c,kind){
    const gold="#e9c784",teal="#82d6c5",violet="#c6a3e5";
    if(kind==="attack"||kind==="blade"){
      shape(c,"#577388",[6,16,16,5,21,2,20,8,10,18]);
      shape(c,"#cde1dd",[7,16,17,5,20,4,18,8,9,17]);
      line(c,white,[8,16,18,6]);line(c,gold,[5,13,11,19],2);line(c,"#a67553",[7,17,3,21],2);rect(c,gold,2,21,3,2);
    } else if(kind==="herb"){
      shape(c,"#4c8c76",[11,16,7,15,4,12,3,7,8,8,12,12]);
      shape(c,teal,[12,13,13,8,17,4,22,3,21,8,17,12]);
      line(c,"#d1e8a3",[5,21,12,15,18,7]);line(c,"#8fc896",[6,10,10,14]);
    } else if(kind==="potion"){
      shape(c,"#8daeb7",[9,3,15,3,15,8,18,11,20,14,20,18,17,21,7,21,4,18,4,14,6,11,9,8]);
      shape(c,"#a04f70",[7,13,10,12,14,13,17,12,18,14,18,17,16,19,8,19,6,17,6,14]);
      rect(c,"#e98697",7,14,3,3);rect(c,"#d4eaed",7,10,2,2);rect(c,"#ad8256",9,2,7,3);rect(c,gold,9,2,5,1);
    } else if(kind==="coin"){
      oval(c,"#875e47",12,13,8,8);oval(c,gold,11,11,7,8);oval(c,"#bb894c",11,11,5,6);
      line(c,"#ffe0a0",[11,6,14,11,11,16,8,11,11,6]);rect(c,white,7,6,2,1);
    } else if(kind==="ore"||kind==="shard"){
      shape(c,kind==="ore"?"#657789":"#746094",[3,15,6,9,10,8,13,4,19,6,21,14,16,19,8,20]);
      shape(c,kind==="ore"?"#c4c8b6":violet,[4,15,7,10,10,10,8,17]);shape(c,kind==="ore"?"#9db5b4":"#e7d9f5",[12,9,14,5,18,6,16,12]);
      line(c,"#d9dde1",[9,19,13,12,15,12]);rect(c,white,14,6,2,1);
    } else if(kind==="ward"){
      shape(c,"#437485",[4,5,8,5,12,2,16,5,20,5,19,14,16,18,12,21,8,18,5,14]);
      line(c,teal,[5,6,8,6,12,4,16,6,19,6,18,13,16,17,12,20,8,17,6,13,5,6]);star(c,white,12,11,3);
    } else if(kind==="dodge"){
      line(c,"#478693",[3,13,7,13,11,8]);line(c,teal,[2,17,6,17,10,13],2);
      shape(c,"#d4eddf",[7,20,14,10,11,10,20,3,17,12,15,12]);rect(c,white,19,4);
    } else if(kind==="heal"){
      star(c,"#4e947c",12,12,8);star(c,"#a0e0aa",12,12,5);
      rect(c,white,11,11,3,3);star(c,teal,5,6,2);star(c,gold,19,18,1);
    } else if(kind==="cloak"){
      shape(c,"#755a8a",[9,3,15,3,17,7,16,10,21,20,18,19,15,21,12,20,8,21,3,20,7,10,7,7]);
      shape(c,violet,[8,7,10,4,14,4,16,7,13,6,10,6,8,8]);shape(c,"#393a54",[9,8,11,6,14,7,15,9,12,11]);line(c,"#ab8abb",[10,11,7,18]);rect(c,gold,12,10,2,2);
    } else if(kind==="core"){
      shape(c,"#a87e4e",[12,2,15,7,19,8,21,12,17,17,12,22,8,18,3,12,6,7,9,7]);
      shape(c,"#536e70",[12,5,16,10,17,13,12,19,7,13,8,10]);star(c,teal,12,12,4);
    } else {
      shape(c,"#796499",[3,19,8,11,10,7,12,9,17,4,22,2,18,10,16,12,17,13,9,17]);
      line(c,violet,[5,17,13,11,19,5],2);star(c,white,15,9,3);rect(c,teal,4,9,2,2);rect(c,gold,14,18,2,2);
    }
  }
  function icon(c,kind,x,y,size){
    if(!icons.has(kind)){
      const image=document.createElement("canvas");
      image.width=24;image.height=24;
      paintIcon(image.getContext("2d"),kind);icons.set(kind,image);
    }
    c.save();c.imageSmoothingEnabled=false;
    c.drawImage(icons.get(kind),round(x),round(y),round(size),round(size));c.restore();
  }
  return {draw,portrait,icon};
})();
