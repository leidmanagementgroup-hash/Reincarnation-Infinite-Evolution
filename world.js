/* Valle di Vela. All artwork is drawn to a logical-pixel canvas at runtime. */
(() => {
  'use strict';
  const width=1600, height=1080;
  const spawn={x:420,y:610};
  const landmarks=[['Borgo di Vela',420,610],['Radura delle Lanterne',800,560],['Bosco di Vetro',1040,340],['Cerchio delle Radici',1320,300]].map(([name,x,y])=>({name,x,y}));
  const points={
    elder:{x:389,y:589}, merchant:{x:467,y:585}, smith:{x:519,y:661},
    resources:[
      [550,552,'herb'],[602,671,'herb'],[735,597,'herb'],[780,655,'herb'],[868,523,'herb'],[850,622,'ore'],
      [1018,394,'ore'],[1130,405,'ore'],[1080,288,'herb'],[1222,344,'ore'],[1445,327,'herb'],[533,731,'ore'],
      [249,697,'herb'],[924,695,'herb'],[966,514,'ore'],[1168,659,'herb']
    ].map(([x,y,type])=>({x,y,type})),
    mobs:[
      [745,561,'moth'],[810,616,'thorn'],[846,534,'moth'],[904,601,'wolf'],[910,482,'thorn'],
      [982,412,'moth'],[1050,380,'wolf'],[1080,348,'thorn'],[1137,310,'wolf'],[1162,379,'moth'],
      [1210,282,'wolf'],[873,718,'thorn'],[1002,663,'wolf'],[1150,710,'thorn'],[1230,580,'moth']
    ].map(([x,y,type])=>({x,y,type})),
    boss:{x:1320,y:300}
  };
  const paths=[
    [39,[[100,787],[206,747],[306,676],[375,630],[420,610],[487,608],[572,600],[617,610],[708,610],[768,579],[802,562],[886,547],[928,496],[962,441],[1010,390],[1040,340],[1100,321],[1160,337],[1200,324],[1256,305],[1320,300]]],
    [26,[[420,610],[400,566],[406,515],[450,475],[530,465]]],
    [25,[[401,610],[344,598],[315,561],[280,537],[237,517]]],
    [28,[[422,614],[445,653],[450,687],[407,734],[350,762],[320,836]]],
    [24,[[446,654],[485,659],[520,665],[577,688],[598,728]]],
    [21,[[860,551],[875,615],[918,669],[1018,680],[1094,715],[1173,698],[1220,626]]],
    [19,[[986,410],[985,329],[952,274],[902,236],[867,177]]],
    [18,[[1320,300],[1372,336],[1420,365],[1484,381]]]
  ];
  const buildings=[
    [329,563,'guild'],[432,515,'tower'],[516,530,'red'],[244,605,'red'],[270,681,'blue'],
    [364,732,'red'],[491,731,'blue'],[530,648,'smith'],[462,570,'market'],[409,554,'stall'],[179,713,'blue']
  ];
  const arrays = {objects:[],waves:[],smoke:[],glows:[]};
  let ground, chart, index=new Map(), seed=19425, rand, spriteBank=new Map();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function prng(value){let n=value>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
  function hash(x,y,s=0){let z=Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(s,69069);z=Math.imul(z^(z>>>13),1274126177);return ((z^(z>>>16))>>>0)/4294967295;}
  function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function rect(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function ellipse(c,x,y,rx,ry,col){c.fillStyle=col;for(let j=-Math.round(ry);j<=ry;j++){const d=Math.floor(rx*Math.sqrt(Math.max(0,1-j*j/(ry*ry))));c.fillRect(Math.round(x)-d,Math.round(y)+j,2*d+1,1);}}
  function poly(c,pts,col){c.fillStyle=col;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
  function line(c,x,y,x2,y2,col,size=1){const n=Math.max(1,Math.ceil(Math.max(Math.abs(x2-x),Math.abs(y2-y))));for(let i=0;i<=n;i++)rect(c,x+(x2-x)*i/n,y+(y2-y)*i/n,size,size,col);}
  function road(c,scale=1){
    c.lineCap='round';c.lineJoin='round';
    for(const [w,pts] of paths){c.beginPath();c.lineWidth=w*scale;pts.forEach(([x,y],i)=>i?c.lineTo(x*scale,y*scale):c.moveTo(x*scale,y*scale));c.stroke();}
  }
  function roadDistance(x,y){
    let best=Infinity;
    for(const [w,pts] of paths)for(let i=1;i<pts.length;i++){
      const [a,b]=pts[i-1],[u,v]=pts[i],dx=u-a,dy=v-b,k=clamp(((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy),0,1);
      best=Math.min(best,Math.hypot(x-a-k*dx,y-b-k*dy)-w/2);
    }
    return best;
  }
  function river(y){return 659+Math.sin((y-605)/131)*39+Math.sin((y-605)/65)*13;}
  function halfRiver(y){return 24+8*(1+Math.sin((y-360)/95));}
  function arena(x,y){return Math.hypot((x-1320)/1.22,y-300);}
  function scenery(x,y,kind,v=0,box=null){
    const o={x,y,kind,v,box};arrays.objects.push(o);
    if(!box)return;
    for(let j=Math.floor((y+box[1])/64);j<=Math.floor((y+box[1]+box[3])/64);j++)for(let i=Math.floor((x+box[0])/64);i<=Math.floor((x+box[0]+box[2])/64);i++){
      const id=i+j*32;if(!index.has(id))index.set(id,[]);index.get(id).push(o);
    }
  }
  function canWalk(x,y,r=6){
    if(!Number.isFinite(x+y)||x<12+r||y<12+r||x>width-12-r||y>height-12-r)return false;
    if(Math.abs(x-river(y))<halfRiver(y)+r && !(y>=589+r&&y<=631-r))return false;
    for(let j=Math.floor((y-r)/64);j<=Math.floor((y+r)/64);j++)for(let i=Math.floor((x-r)/64);i<=Math.floor((x+r)/64);i++){
      const nearby=index.get(i+j*32);if(!nearby)continue;
      for(const o of nearby){const [a,b,w,h]=o.box;const dx=x-clamp(x,o.x+a,o.x+a+w),dy=y-clamp(y,o.y+b,o.y+b+h);if(dx*dx+dy*dy<r*r||(dx===0&&dy===0))return false;}
    }
    return true;
  }
  function woodland(x,y){return (x>885&&x<1220&&y<498)||y<293||x<172||y>846||x>1485;}
  function init(value=19425){
    seed=typeof value==='number'?value>>>0:[...String(value)].reduce((a,c)=>Math.imul(a,31)+c.charCodeAt(0),0)>>>0;
    rand=prng(seed);index=new Map();spriteBank=new Map();
    Object.values(arrays).forEach(a=>a.length=0);
    for(const [x,y,kind] of buildings){
      const w={guild:86,tower:45,market:58,stall:37,smith:62}[kind]||59;
      scenery(x,y,kind,0,[-w/2,-24,w,25]);
    }
    const fixed=[
      [359,584,'lamp'],[485,596,'lamp'],[385,670,'lamp'],[558,577,'sign'],[297,614,'barrel'],[302,620,'crate'],[491,576,'crate'],[499,576,'barrel'],
      [360,567,'barrel'],[354,571,'crate'],[497,644,'anvil'],[312,705,'cart'],[363,624,'well'],[391,534,'flowers'],[450,531,'flowers'],
      [795,527,'obelisk'],[823,582,'obelisk'],[780,585,'lamp'],[850,530,'lamp'],[1011,335,'crystal'],[1031,309,'crystal'],[1067,371,'crystal'],
      [1096,300,'crystal'],[1145,346,'crystal'],[987,363,'crystal'],[1004,280,'crystal'],[1246,268,'ruin'],[1278,229,'ruin'],[1340,224,'ruin'],
      [318,644,'bloomTree'],[1320,211,'rootThrone'],[383,579,'bunting'],[802,545,'lanternTree'],[441,652,'flowers'],
      [1386,262,'ruin'],[1398,318,'ruin'],[1360,368,'ruin'],[1293,371,'ruin'],[1253,350,'ruin']
    ];
    for(const [x,y,k] of fixed)scenery(x,y,k,Math.floor(rand()*7),['ruin','obelisk','well','cart','crystal','bloomTree','rootThrone','lanternTree'].includes(k)?[-5,-3,10,6]:null);
    for(const [x,y,n] of [[202,548,3],[271,528,2],[205,688,3],[281,739,4],[538,530,3],[366,777,3],[508,704,3]]){
      for(let i=0;i<n;i++)scenery(x+i*14,y,'fence',0,[-1,-1,14,2]);
    }
    const reserved=[spawn,...landmarks,points.elder,points.merchant,points.smith,...points.resources,...points.mobs,points.boss];
    const inTown=(x,y)=>((x-391)/221)**2+((y-615)/163)**2<1;
    for(let y=15;y<height;y+=24)for(let x=12;x<width;x+=23){
      const a=Math.round(x+rand()*15),b=Math.round(y+rand()*15),deep=woodland(a,b),p=rand();
      if(inTown(a,b)||p>(deep?.79:.23)||Math.abs(a-river(b))<halfRiver(b)+11||roadDistance(a,b)<19||arena(a,b)<97||reserved.some(q=>Math.hypot(q.x-a,q.y-b)<32))continue;
      if((a-800)**2+(b-560)**2<7000&&p>.06)continue;
      const r=rand(),k=r<.07?'rock':r<.19?'shrub':(a>916&&a<1188&&b<454&&r<.67)?'glassTree':(b<245||a<168||b>820)&&r<.65?'pine':'tree';
      scenery(a,b,k,Math.floor(rand()*10),k==='shrub'?null:[-4,-3,8,6]);
    }
    for(const [x,y,k] of [[220,553,'tree'],[272,512,'tree'],[365,490,'tree'],[450,466,'pine'],[550,509,'tree'],[566,680,'tree'],[264,737,'tree'],[321,735,'shrub'],[393,783,'tree'],[219,651,'tree'],[328,645,'flowers'],[539,598,'flowers']])scenery(x,y,k,Math.floor(rand()*7),k==='tree'||k==='pine'?[-4,-3,8,6]:null);
    arrays.objects.sort((a,b)=>a.y-b.y);
    ground=makeGround();chart=makeChart();
    return window.World;
  }
  function noise(x,y,size,s) {
    const a=Math.floor(x/size),b=Math.floor(y/size);
    let u=x/size-a,v=y/size-b;u=u*u*(3-2*u);v=v*v*(3-2*v);
    const low=hash(a,b,s)*(1-u)+hash(a+1,b,s)*u;
    return low*(1-v)+(hash(a,b+1,s)*(1-u)+hash(a+1,b+1,s)*u)*v;
  }
  function makeGround(){
    const c=canvas(width,height),g=c.getContext('2d');
    const half=canvas(width/2,height/2),mg=half.getContext('2d',{willReadFrequently:true}),mw=half.width,mh=half.height;
    mg.strokeStyle='white';road(mg,.5);
    ellipse(mg,210,305,35,15,'white');
    ellipse(mg,410,278,19,15,'white');
    mg.fillStyle='white';for(const [x,y,kind] of buildings)ellipse(mg,x/2,(y-10)/2,kind==='guild'?27:20,12,'white');
    const mask=mg.getImageData(0,0,mw,mh).data;
    const tile=mg.createImageData(mw,mh);
    const colors=['#416b51','#54794e','#62864f','#719553','#7fa05b','#8caa62','#9bb66f',
      '#3f645d','#48726a','#538174','#638c7c','#719986',
      '#8d845b','#a49063','#b29b6a','#c3a874','#cdb382','#d4bc91',
      '#756f70','#828080','#8a8b86','#96968c',
      '#4f684d','#66794e','#919069','#b1ac83','#85b5a7','#58a89e','#398d8c','#327e86','#337483','#2b697b'];
    const palette=colors.map(s=>[parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16)]);
    for(let j=0;j<mh;j++){
      const y=j*2,mid=river(y),bank=halfRiver(y);
      for(let i=0;i<mw;i++){
        const x=i*2,n=noise(x,y,38,seed)*.42+noise(x,y,13,seed)*.22+noise(x,y,95,seed+71)*.36;
        const grain=hash(i,j,seed),value=n+.14*(grain-.5);
        const jitter=Math.floor((noise(x,y,8,857)-.5)*4);
        const roadPixel=mask[(clamp(i+jitter,0,mw-1)+clamp(j+(jitter>>1),0,mh-1)*mw)*4+3];
        const ar=arena(x,y),edge=Math.abs(x-mid)-bank;
        let id=clamp(Math.floor(value*8)-1,0,6);
        const glassDistance=Math.hypot((x-1070)*.88,(y-345)*.85);
        if(glassDistance<152+45*(n-.5))id=7+clamp(Math.floor(value*6),0,4);
        if(roadPixel>120)id=12+clamp(Math.floor(value*6.7),0,5);
        if(ar+n*4<72)id=18+clamp(Math.floor(value*4.5),0,3);
        if(edge<7&&edge>-2)id=22+clamp(Math.floor((7-edge)/2.4),0,3);
        if(edge<=-2)id=26+clamp(Math.floor((-edge-2+3*(value-.5))/3.2),0,5);
        const col=palette[id],k=(j*mw+i)*4;tile.data[k]=col[0];tile.data[k+1]=col[1];tile.data[k+2]=col[2];tile.data[k+3]=255;
      }
    }
    mg.putImageData(tile,0,0);g.imageSmoothingEnabled=false;g.drawImage(half,0,0,width,height);
    const r=prng(seed+1211),pick=a=>a[Math.floor(r()*a.length)];
    for(let i=0;i<32000;i++){
      const x=Math.floor(r()*width),y=Math.floor(r()*height);
      const edge=Math.abs(x-river(y))-halfRiver(y),inGlass=Math.hypot(x-1060,y-346)<150;
      if(edge<1){
        if(i%8===0){const w=2+Math.floor(r()*7);rect(g,x,y,w,1,pick(['#479494','#4c9d99','#39828c']));if(i%7===0)arrays.waves.push({x,y,w,phase:r()*7});}
        continue;
      }
      if(arena(x,y)<73)continue;
      if(mask[((x>>1)+(y>>1)*mw)*4+3]>128){
        if(i%2===0)rect(g,x,y,1+r()*3,1,pick(['#d7bd90','#ac936a','#c1a371']));
        if(i%5===0 && x<610){
          const w=3+Math.floor(r()*5),h=2+Math.floor(r()*2);
          rect(g,x,y+1,w,h,'#968461');rect(g,x,y,w-1,h,pick(['#b5a582','#c6b795','#cfc19f']));
          rect(g,x+1,y,w-2,1,'#d3c5a3');
        }
      }else{
        const col=pick(inGlass?['#4d756a','#689884','#88a28b']:['#65864e','#91ac63','#a3b775','#749552','#567d4a']);
        rect(g,x,y,2,1,col);
        if(i%4===0){rect(g,x-2,y-1,2,1,col);rect(g,x+1,y-2,1,2,col);}
        if(i%19===0 && edge>8){
          const flower=pick(inGlass?['#a8d6bd','#a5b7dc']:['#e7d095','#d7be70','#e9dfac','#d99f86','#b6b6d5']);
          for(let b=0;b<2+r()*3;b++){const xx=x+r()*11,yy=y+r()*5;rect(g,xx,yy,1,3,'#597a48');rect(g,xx-1,yy,3,1,flower);rect(g,xx,yy-1,1,1,'#f0d7a1');}
        }
        if(edge<7 && i%6===0){
          for(let k=0;k<4;k++){const xx=x+k*2,yy=y+Math.round(r()*3);line(g,xx,yy,xx-2,yy-3-r()*5,'#657a45');}
        }
      }
    }
    // La piazza conserva la rosa dei venti dei primi traghettatori.
    const paving=['#bfae89','#d4c49f','#c7b793','#d1bf96'];
    for(let row=-5;row<=5;row++)for(let col=-7;col<=7;col++){
      const x=418+col*8+(row%2)*4,y=610+row*4;
      if(((x-418)/54)**2+((y-610)/18)**2>1)continue;
      rect(g,x,y,7,3,pick(paving));rect(g,x+1,y,5,1,'#ded1ae');
    }
    for(let i=0;i<8;i++){const a=Math.PI*i/4;line(g,418+Math.cos(a)*5,610+Math.sin(a)*3,418+Math.cos(a)*14,610+Math.sin(a)*8,'#9b8f71');}
    ellipse(g,418,610,5,3,'#a89871');ellipse(g,418,610,3,2,'#d9cfac');
    // Terraced saffron beds, drawn in rows beside the southern cottages.
    for(const [fx,fy] of [[192,672],[552,519],[291,755]]){
      rect(g,fx,fy,40,20,'#806d4b');
      for(let j=0;j<4;j++){rect(g,fx+1,fy+2+j*5,38,2,'#9b7950');for(let k=0;k<10;k++){const x=fx+2+k*4,y=fy+j*5;rect(g,x,y,2,3,'#788c4c');rect(g,x+1,y-1,1,2,'#bbb26b');}}
    }
    // Broad boardwalk, its upper and lower rails flank the traversable deck.
    rect(g,594,590,134,43,'#544c40');
    for(let x=594;x<728;x+=5){const col=pick(['#a47f51','#b18b59','#98764d','#b18a5c']);rect(g,x,591,4,39,col);rect(g,x,592,1,37,'#c29a69');rect(g,x+2,600+r()*13,1,8,'#967448');}
    for(const y of [591,631]){rect(g,592,y-3,137,4,'#624b39');rect(g,592,y-4,137,2,'#b38e61');for(let x=592;x<=729;x+=17){rect(g,x,y-9,4,11,'#634c39');rect(g,x,y-9,3,8,'#94714c');rect(g,x-1,y-10,5,2,'#c9ac80');}}
    // Weathered radial paving at Orveth's stone circle.
    for(let ring=1;ring<=5;ring++){
      const count=ring*8;
      for(let i=0;i<count;i++){const a=(i+.3*ring)/count*2*Math.PI;
        const x=1320+Math.cos(a)*ring*16,y=300+Math.sin(a)*ring*12;
        rect(g,x,y,4+r()*4,2,'#6e7775');rect(g,x+1,y-1,4,1,'#a4a496');
      }
    }
    for(let i=0;i<8;i++){const a=i*Math.PI/4;line(g,1320+Math.cos(a)*6,300+Math.sin(a)*4,1320+Math.cos(a)*42,300+Math.sin(a)*32,'#748880',2);}
    ellipse(g,1320,300,12,9,'#697b77');ellipse(g,1320,300,9,6,'#a9aaa0');ellipse(g,1320,300,4,3,'#81958a');
    // Object shadows stay on the ground when the player walks behind a tree.
    for(const o of arrays.objects){
      const building=buildings.some(b=>b[2]===o.kind);
      if(!building&&!['tree','pine','glassTree','bloomTree','lanternTree','rock','ruin','well','cart','crystal','rootThrone'].includes(o.kind))continue;
      ellipse(g,o.x+(building?10:6),o.y+1,building?(o.kind==='guild'?47:32):o.kind==='ruin'?9:13,building?7:4,'rgba(26,49,48,.24)');
    }
    return c;
  }
  const roofPalette={
    blue:['#344c55','#486470','#557881','#628992','#79989a','#92a7a2'],
    red:['#644243','#8a5149','#a8604c','#b96e54','#c27e5d','#d9946c'],
    guild:['#304a52','#3e6469','#477574','#528985','#6c9b91','#8aae9a'],
    smith:['#484852','#5c5762','#6d6571','#827780','#94868a','#ab9690']
  };
  function timber(c,x,y,w,h){
    rect(c,x,y,w,h,'#54453e');rect(c,x+1,y,w-2,h,'#815f46');
    if(w>h)rect(c,x+1,y,w-2,1,'#aa805a');else rect(c,x+1,y,1,h,'#ad8863');
  }
  function windowBox(c,x,y){
    rect(c,x-1,y-2,11,14,'#f0d1a0');rect(c,x,y,9,11,'#544b44');
    rect(c,x+1,y+1,3,4,'#edbc72');rect(c,x+5,y+1,3,4,'#ffe2a0');
    rect(c,x+1,y+6,3,4,'#bf8856');rect(c,x+5,y+6,3,4,'#dfae68');
    rect(c,x-3,y+1,2,10,'#86674d');rect(c,x+10,y+1,2,10,'#86674d');timber(c,x-2,y+11,13,3);
  }
  function chimney(c,x,y){
    rect(c,x,y,9,20,'#6d6865');rect(c,x+1,y,6,20,'#b7aaa0');
    for(let j=2;j<18;j+=4){rect(c,x+1,y+j,7,1,'#89817a');rect(c,x+2+(j%3),y+j+1,1,3,'#958a7d');}
    rect(c,x-1,y-3,11,5,'#655e58');rect(c,x-1,y-3,10,2,'#b6a99a');rect(c,x+2,y-2,5,1,'#534f4d');
  }
  function gable(c,x,y,w,h,cols,r){
    for(let j=0;j<=h;j++){
      const pad=Math.ceil((1-j/h)*w*.18),left=x+pad,right=x+w-pad;
      rect(c,left-2,y+j,right-left+4,1,cols[0]);rect(c,left,y+j,right-left,1,cols[2]);
    }
    for(let j=1;j<h-1;j+=4){
      const pad=Math.ceil((1-j/h)*w*.18),left=x+pad,right=x+w-pad;
      for(let k=left-6+(j%3)*2;k<right;k+=7){
        const a=Math.max(k,left),b=Math.min(k+6,right);
        if(b<=a)continue;
        const col=cols[2+Math.floor(r()*3)];
        rect(c,a,y+j,b-a,3,col);rect(c,a,y+j+3,b-a,1,cols[1]);rect(c,a,y+j,Math.min(3,b-a),1,cols[5]);rect(c,b-1,y+j+1,1,2,cols[1]);
      }
    }
    rect(c,x+Math.ceil(w*.18)-1,y-1,w-2*Math.ceil(w*.18)+2,3,cols[0]);
    rect(c,x+Math.ceil(w*.18),y-2,w-2*Math.ceil(w*.18),2,cols[5]);
    rect(c,x-2,y+h,w+4,4,cols[0]);rect(c,x-2,y+h,w+4,1,cols[4]);
    for(let k=x+4;k<x+w;k+=9)rect(c,k,y+h+4,3,2,'#654d40');
  }
  function dormer(c,x,y,size,cols){
    poly(c,[[x-size,y],[x,y-size-3],[x+size,y]],'#4e4540');
    poly(c,[[x-size+2,y],[x,y-size],[x+size-2,y]],'#e6c79c');
    line(c,x-size,y,x,y-size-3,cols[4],2);line(c,x,y-size-3,x+size,y,cols[0],2);
    rect(c,x-3,y-4,7,7,'#5c5146');rect(c,x-2,y-3,2,4,'#e8b570');rect(c,x+1,y-3,2,4,'#f7d99a');
    rect(c,x-size+1,y+3,size*2-2,2,cols[0]);
  }
  function house(c,k,r){
    const w=k==='guild'?87:k==='smith'?62:59,h=k==='guild'?35:29,rh=k==='guild'?37:29;
    const x=-Math.floor(w/2),wall=-h,cols=roofPalette[k]||roofPalette.blue;
    rect(c,x-1,wall,w+2,h+1,'#544b43');rect(c,x,wall,w,h-4,'#ccad85');rect(c,x+1,wall,w-12,h-6,'#e4c69d');
    rect(c,x,wall,w,5,'#a99074');rect(c,x+2,-5,w-4,5,'#99877a');
    for(let a=x+2;a<x+w-3;a+=7){rect(c,a,-3,5,2,'#bca999');rect(c,a+3,-6,4,2,'#a49385');}
    for(let i=0;i<30;i++){const a=x+2+r()*(w-5),b=wall+5+r()*(h-12);rect(c,a,b,1+r()*3,1,'#cfaf88');}
    for(const a of [x,x+Math.floor(w*.32),x+Math.floor(w*.69),x+w-4])timber(c,a,wall,4,h-4);
    timber(c,x,wall+7,w,3);timber(c,x,-7,w,3);
    line(c,x+5,wall+10,x+16,-9,'#ab8460',2);line(c,x+w-7,wall+10,x+w-17,-9,'#a8805c',2);
    windowBox(c,x+7,-22);windowBox(c,x+w-20,-22);
    rect(c,-7,-18,15,18,'#7c644f');rect(c,-5,-21,11,20,'#705441');rect(c,-4,-19,9,18,'#986c48');
    for(let j=-3;j<4;j+=3)rect(c,j,-17,1,16,'#815c40');
    rect(c,-3,-17,6,5,'#584d43');rect(c,2,-9,2,2,'#e4bd6f');rect(c,-8,-1,17,2,'#b3a38a');rect(c,-10,1,21,2,'#d0ba98');
    chimney(c,x+w-16,wall-rh-8);
    gable(c,x-5,wall-rh-1,w+10,rh,cols,r);
    dormer(c,k==='guild'?-15:-2,wall-9,k==='guild'?12:8,cols);
    if(k==='guild'){
      dormer(c,20,wall-10,8,cols);rect(c,-4,-30,9,8,'#3e6b64');rect(c,-1,-28,3,3,'#e5c17b');
      for(const dx of [-13,12]){
        rect(c,dx-1,-30,9,2,'#a78655');rect(c,dx,-28,7,14,'#356466');rect(c,dx+1,-27,1,11,'#739184');
        poly(c,[[dx,-14],[dx+7,-14],[dx+3,-10]],'#457675');poly(c,[[dx+3,-25],[dx+5,-21],[dx+3,-18],[dx+2,-21]],'#ebcc89');
      }
    }
    if(k==='smith'){rect(c,x+w+1,-15,11,15,'#5f5550');rect(c,x+w+2,-13,8,10,'#a57a52');rect(c,x+w+4,-11,5,7,'#f1a45d');rect(c,x+w+5,-8,3,4,'#ffe39b');}
    if(k==='red'){for(let j=0;j<4;j++){rect(c,x+7+j*3,-8,2,2,'#6b874d');rect(c,x+8+j*3,-9,2,1,j%2?'#d78675':'#dec28a');}}
  }
  function tower(c,r){
    rect(c,-19,-48,38,49,'#68615b');rect(c,-17,-47,32,44,'#c5b69b');rect(c,10,-47,7,44,'#a69b88');
    for(let j=-45;j<-3;j+=5)for(let x=-16+(j%3);x<14;x+=8){rect(c,x,j,5,2,r()>.5?'#b4a690':'#d8c7a9');}
    timber(c,-19,-3,37,4);rect(c,-5,-17,11,17,'#736759');rect(c,-3,-15,7,15,'#8b7258');
    gable(c,-24,-57,48,13,roofPalette.blue,r);
    rect(c,-13,-75,26,19,'#e0c59a');rect(c,-9,-71,18,14,'#534d48');timber(c,-13,-75,3,19);timber(c,10,-75,3,19);
    poly(c,[[-6,-59],[-4,-61],[-3,-66],[0,-68],[3,-66],[4,-62],[7,-59]],'#c5a361');rect(c,-1,-59,3,3,'#e1bf78');
    for(let j=0;j<25;j++){const d=Math.max(1,Math.floor(j*.77));rect(c,-d,-99+j,d*2+1,1,'#3b5962');rect(c,-d+1,-99+j,d,1,j%4?'#5e8690':'#80a09b');}
    rect(c,-20,-75,40,3,'#4c6063');rect(c,-1,-105,2,7,'#a89468');poly(c,[[1,-106],[13,-104],[8,-102],[1,-101]],'#dbac68');
  }
  function booth(c,k,r){
    const wide=k==='market',w=wide?58:36,x=-w/2;
    for(const dx of [x+1,-x-4])timber(c,dx,-31,3,31);
    rect(c,x+3,-21,w-6,13,'#655341');
    for(let i=0;i<w-8;i+=6)rect(c,x+4+i,-19,5,6,['#a98b63','#c6a97a','#888872','#ab6a51'][Math.floor(r()*4)]);
    rect(c,x,-9,w,9,'#745741');rect(c,x-1,-10,w+2,3,'#b39666');
    for(let i=1;i<w-3;i+=7){rect(c,x+i,-7,5,5,'#97774f');rect(c,x+i,-12,5,2,['#c29e57','#d68b63','#80945a','#b78776'][Math.floor(r()*4)]);}
    for(let j=0;j<15;j++){
      const pad=(15-j)>>2;
      for(let i=pad;i<w-pad;i++){
        const stripe=Math.floor((i+((15-j)>>2))/7)%2;
        const pal=wide?['#6b8292','#c3c5b4','#7892a0','#e0d9bc']:['#a76955','#cfb992','#bf8068','#ead2a5'];
        rect(c,x+i,-35+j,1,1,pal[stripe+(j<10?2:0)]);
      }
    }
    for(let i=0;i<w;i+=7){const n=Math.min(7,w-i);rect(c,x+i,-21,n,4,i%14?(wide?'#b7b9a7':'#ceb48c'):(wide?'#667b8b':'#9c6853'));rect(c,x+i+1,-17,n-2,1,'#796957');}
    timber(c,x+2,-36,w-4,2);
  }
  function leafTree(c,kind,v,r){
    const shrub=kind==='shrub',glass=kind==='glassTree',bloom=kind==='bloomTree',lantern=kind==='lanternTree',s=shrub?.5:bloom?1.14:lantern?1.05:(.87+v*.032);
    const shades=bloom?['#755359','#8e6569','#ae797b','#c98a87','#df9c92','#efb2a2','#f6cdac']:
      lantern?['#4c5348','#666c48','#878748','#9b964e','#b2a755','#cbb96a','#dfc77f']:
      glass?['#324f59','#3c6668','#4c7979','#5c9189','#73a99a','#96c4aa','#c0d5b8']:
      v%3===0?['#344e42','#3e634a','#4e774d','#648951','#7c9e5b','#96ac64','#afb976']:
      ['#344f44','#3c6049','#49704e','#598453','#6c9557','#87a55e','#a4b46b'];
    const p=(x,y,w,h,col)=>rect(c,x*s,y*s,w*s,h*s,col);
    const e=(x,y,a,b,col)=>ellipse(c,x*s,y*s,Math.max(1,a*s),Math.max(1,b*s),col);
    poly(c,[[-7*s,0],[-4*s,-5*s],[-4*s,-22*s],[4*s,-24*s],[3*s,-6*s],[8*s,0],[3*s,-1*s],[1*s,1*s],[-2*s,-1*s]],'#594f3c');
    p(-2,-25,4,22,'#8c6f4d');p(-2,-10,1,9,'#ac8757');
    line(c,-2*s,-10*s,-11*s,-22*s,'#61523d',Math.max(1,3*s));line(c,1*s,-9*s,13*s,-25*s,'#62543f',Math.max(1,3*s));
    const lobes=[[-11,-21,12,8],[9,-22,12,8],[-17,-29,11,9],[17,-30,10,9],[-2,-24,18,11],
      [-15,-38,12,9],[12,-39,13,10],[-4,-36,17,10],[-5,-47,12,8],[7,-45,10,7],[0,-51,8,5]]
      .map(([x,y,w,h])=>[x+(r()-.5)*5,y+(r()-.5)*4,w+(r()-.5)*3,h+(r()-.5)*2]);
    for(const [x,y,w,h] of lobes)e(x,y+2,w+1,h+1,shades[0]);
    for(const [x,y,w,h] of lobes){
      e(x,y,w,h,shades[1]);e(x-1,y-2,w-1,h-2,shades[2]);e(x-3,y-3,w-3,Math.max(2,h-4),shades[3]);
      for(let i=0;i<18;i++){
        const q=r()*6.28,b=Math.sqrt(r()),xx=x+Math.cos(q)*(w-2)*b,yy=y+Math.sin(q)*(h-2)*b;
        const light=(yy<y?1:0)+(xx<x?1:0),t=clamp(2+light+Math.floor(r()*2),1,6);
        p(xx,yy,2+r()*3,1+r()*2,shades[t]);
        if(r()<.42)p(xx+1,yy-1,2,1,shades[Math.min(6,t+1)]);
      }
    }
    if(glass)for(let i=0;i<6;i++){const x=(r()-.5)*26,y=-21-r()*22;p(x,y,1,3,'#bcdebc');p(x-1,y+1,3,1,'#a9ccae');}
    if(lantern)for(const [x,y] of [[-17,-23],[-7,-17],[10,-24],[16,-31]]){
      p(x,y,1,5,'#727355');p(x-2,y+5,5,4,'#c29355');p(x-1,y+5,3,3,'#f6d992');
    }
  }
  function pineTree(c,v,r){
    const h=47+(v%5)*4;timber(c,-3,-17,6,17);
    for(let tier=0;tier<4;tier++){
      const base=-7-tier*(h*.16),tip=base-h*(.54-tier*.045),w=18-tier*3;
      for(let y=Math.round(tip);y<=base;y++){
        const u=(y-tip)/(base-tip),br=Math.max(1,Math.round(w*u)),teeth=Math.floor(hash(y,v,tier)*3);
        rect(c,-br-teeth,y,br*2+teeth,1,'#355447');rect(c,-br+1,y,br+1,1,'#527457');
        rect(c,-br+2,y,Math.max(1,br*.65),1,'#6e8b60');
      }
      for(let n=0;n<16;n++){const u=r(),x=(r()-.5)*w*u*1.65,y=tip+(base-tip)*u;rect(c,x,y,2,1,x<0?'#86a170':'#567558');}
    }
  }
  function item(c,k,v,r){
    if(k==='bunting'){
      for(const x of [-22,21]){timber(c,x,-25,2,26);rect(c,x-1,-26,4,2,'#ae8e62');}
      for(let i=0;i<45;i++){const j=Math.round(-25+4*Math.sin(Math.PI*i/44));rect(c,i-22,j,1,1,'#6e6951');
        if(i%7===3&&i<41)poly(c,[[i-22,j+1],[i-18,j+1],[i-20,j+6]],['#c88666','#e1be7b','#689a91','#8699a4'][(i/7|0)%4]);
      }return;
    }
    if(k==='rootThrone'){
      const branches=[[-25,0,-8,-15],[-13,-6,-7,-26],[-5,-16,-6,-42],[-5,-32,-19,-50],[-13,-42,-27,-47],
        [-17,-47,-19,-58],[-6,-35,1,-58],[0,-51,13,-63],[5,-13,13,-27],[12,-24,23,-39],[21,-34,31,-38],[20,-34,20,-49],
        [2,-12,23,0],[-4,-9,3,-23],[2,-21,3,-37]];
      for(const [x,y,xx,yy] of branches){const size=Math.max(2,Math.round(7+Math.max(y,yy)*.10));line(c,x,y,xx,yy,'#545b50',size+1);line(c,x,y,xx,yy,'#897a60',size);line(c,x,y,xx,yy,'#a99a73',2);}
      for(let j=0;j<22;j++){const x=(r()-.5)*46,y=-11-r()*42;rect(c,x,y,1,3,'#8ebca1');}
      return;
    }
    if(k==='rock'){
      poly(c,[[-9,-2],[-7,-7],[-3,-11],[4,-11],[9,-6],[10,-1],[6,1],[-6,1]],'#596660');
      poly(c,[[-7,-3],[-5,-7],[-1,-10],[4,-10],[7,-6],[4,-4]],'#a0a391');rect(c,-3,-7,4,2,'#b6b59d');rect(c,-7,-1,5,1,'#79905f');return;
    }
    if(k==='crystal'||k==='obelisk'){
      const large=k==='obelisk';
      if(large){
        rect(c,-8,-4,17,5,'#647575');rect(c,-6,-7,13,4,'#9da79b');poly(c,[[-5,-7],[-4,-25],[0,-30],[5,-25],[6,-7]],'#768784');
        line(c,-3,-24,-4,-9,'#b2bcab',2);line(c,0,-20,3,-17,'#b5e4c6');line(c,3,-17,0,-13,'#b5e4c6');line(c,0,-13,-2,-17,'#b5e4c6');line(c,-2,-17,0,-20,'#b5e4c6');return;
      }
      for(const [x,y,w,h] of [[-6,0,4,10],[4,-1,5,13],[0,0,6,20]]){
        poly(c,[[x-w/2,y-3],[x-w/2,y-h+3],[x+1,y-h],[x+w/2+1,y-h+4],[x+w/2,y-2],[x,y]],'#548e99');
        poly(c,[[x-w/2,y-3],[x-w/2,y-h+3],[x+1,y-h],[x,y-2]],'#9dd4c4');rect(c,x,y-h+3,1,h*.6,'#d4ecce');
      }return;
    }
    if(k==='ruin'){
      rect(c,-9,-4,19,5,'#687778');rect(c,-7,-7,15,4,'#9ba39b');rect(c,-5,-27,11,20,'#738482');
      rect(c,-4,-27,6,21,'#a8aea1');rect(c,-2,-25,2,14,'#c6c4ac');rect(c,3,-23,1,9,'#596a6d');
      poly(c,[[-6,-26],[-6,-30],[-2,-29],[1,-33],[6,-32],[6,-26]],'#a3aa9b');rect(c,-5,-27,10,1,'#c4c6ad');
      line(c,1,-22,3,-18,'#667775');line(c,3,-18,1,-13,'#667775');for(let i=0;i<9;i++) rect(c,-6+r()*12,-7+r()*4,2,2,'#789267');return;
    }
    if(k==='fence'){timber(c,-1,-8,15,2);timber(c,-1,-4,15,2);timber(c,-1,-11,3,12);rect(c,-1,-12,3,2,'#cab083');return;}
    if(k==='lamp'){
      rect(c,-3,-2,6,3,'#6d6859');timber(c,-1,-22,3,22);timber(c,-1,-23,10,2);rect(c,5,-21,1,3,'#474e48');rect(c,3,-18,6,7,'#4c5752');
      rect(c,4,-17,4,4,'#f7cd7d');rect(c,5,-17,2,3,'#ffe5a1');rect(c,2,-19,8,2,'#5b5e54');return;
    }
    if(k==='barrel'){
      rect(c,-5,-10,11,9,'#614e3f');rect(c,-4,-12,9,12,'#8d6846');rect(c,-3,-12,6,2,'#bc996c');rect(c,-3,-8,2,6,'#ae8155');
      rect(c,-5,-9,11,2,'#62655d');rect(c,-5,-4,11,2,'#62655d');return;
    }
    if(k==='crate'){rect(c,-6,-10,12,11,'#665543');rect(c,-5,-9,10,9,'#a78053');line(c,-5,-2,3,-9,'#c19f72',2);rect(c,-6,-1,12,2,'#806444');return;}
    if(k==='cart'){
      for(const x of [-11,6]){ellipse(c,x,-2,4,4,'#524e42');ellipse(c,x,-2,2,2,'#bc9b69');}
      rect(c,-14,-12,28,10,'#805c41');rect(c,-13,-11,26,4,'#b48a58');rect(c,-14,-14,28,3,'#c39e6c');line(c,12,-5,21,-2,'#75593e',2);
      for(let i=0;i<5;i++)ellipse(c,-10+i*5,-14,3,3,i%2?'#a9a354':'#cac16f');return;
    }
    if(k==='anvil'){rect(c,-7,-6,14,7,'#765c46');poly(c,[[-10,-12],[11,-12],[9,-8],[3,-7],[1,-4],[-4,-4],[-4,-8],[-8,-9]],'#556168');rect(c,-9,-13,19,2,'#a9b1a5');return;}
    if(k==='well'){
      ellipse(c,0,-4,10,6,'#706e62');rect(c,-10,-8,21,5,'#888b79');ellipse(c,0,-8,10,5,'#c0b9a0');ellipse(c,0,-9,7,3,'#475e63');
      for(const x of [-9,7])timber(c,x,-20,3,16);
      poly(c,[[-13,-19],[-6,-26],[8,-26],[14,-19]],'#597b7b');rect(c,-13,-19,27,2,'#4c6262');rect(c,-1,-18,1,9,'#cbaa77');return;
    }
    if(k==='sign'){timber(c,-2,-14,3,15);poly(c,[[-9,-17],[6,-17],[11,-14],[6,-11],[-9,-11]],'#715944');rect(c,-8,-16,13,3,'#bd9865');rect(c,-5,-15,7,1,'#8d6d4c');return;}
    for(let i=0;i<16;i++){const x=r()*18-9,y=r()*5-4;rect(c,x,y-4,1,5,'#56754a');rect(c,x-1,y-5,3,2,i%2?'#db9e82':'#e5bb99');}
  }
  function renderObject(c,o){
    const {x,y,kind,v}=o,variation=buildings.some(b=>b[2]===kind)?Math.floor(x)%4:v;
    const key=kind+'-'+variation;
    let img=spriteBank.get(key);
    if(!img){
      img=canvas(128,122);const s=img.getContext('2d');s.translate(64,113);s.imageSmoothingEnabled=false;
      const r=prng(41271+variation*53+kind.charCodeAt(0)*157);
      if(roofPalette[kind])house(s,kind,r);
      else if(kind==='tower')tower(s,r);
      else if(kind==='market'||kind==='stall')booth(s,kind,r);
      else if(kind==='pine')pineTree(s,v,r);
      else if(['tree','glassTree','bloomTree','lanternTree','shrub'].includes(kind))leafTree(s,kind,v,r);
      else item(s,kind,v,r);
      spriteBank.set(key,img);
    }
    c.drawImage(img,Math.round(x)-64,Math.round(y)-113);
  }
  function drawGround(c,cam,t){
    if(!ground)init();const x=Math.max(0,Math.floor(cam.x)),y=Math.max(0,Math.floor(cam.y));
    c.drawImage(ground,x,y,Math.ceil(cam.w)+1,Math.ceil(cam.h)+1,x,y,Math.ceil(cam.w)+1,Math.ceil(cam.h)+1);
    for(const wave of arrays.waves){
      if(wave.x<cam.x-8||wave.x>cam.x+cam.w||wave.y<cam.y-4||wave.y>cam.y+cam.h||wave.y>587&&wave.y<635)continue;
      const light=Math.sin(t*.9+wave.phase);if(light>.10)rect(c,wave.x+light*3,wave.y,1+wave.w*light,1,light>.79?'#96c9b5':'#66b4aa');
    }
  }
  function drawFront(c,cam,t,actors=[]){
    const visible=arrays.objects.filter(o=>o.x>cam.x-95&&o.x<cam.x+cam.w+95&&o.y>cam.y-16&&o.y<cam.y+cam.h+118);
    const sorted=visible.concat(actors).sort((a,b)=>a.y-b.y);
    const player=actors[0];
    for(const o of sorted){
      if(typeof o.draw==='function'){o.draw(c);continue;}
      const canopy=['tree','pine','glassTree','bloomTree','lanternTree'].includes(o.kind),building=buildings.some(b=>b[2]===o.kind);
      const hidden=player&&(canopy||building)&&Math.abs(player.x-o.x)<(building?31:19)&&o.y>player.y&&o.y-player.y<(building?52:39);
      if(hidden){c.save();c.globalAlpha=.55;}
      renderObject(c,o,t);
      if(hidden)c.restore();
      if(o.kind==='smith'||o.kind==='guild'||o.kind==='red'){
        const top=o.kind==='guild'?81:o.kind==='red'?67:67,dx=o.kind==='guild'?28:17;
        for(let i=0;i<3;i++){const life=(t*.24+i/3+o.x*.001)%1,swirl=Math.sin(life*5+o.x)*3,xx=o.x+dx+life*9+swirl,yy=o.y-top-life*17;
          rect(c,xx,yy,2+life*4,2+life*2,'rgba(223,216,189,'+(.34*(1-life))+')');}
      }
      if(o.kind==='bloomTree')for(let i=0;i<5;i++){
        const phase=(t*.1+i*.22)%1,px=o.x+(i-2)*7+phase*25+Math.sin(phase*7+i)*2,py=o.y-38+phase*39;
        rect(c,px,py,2,1,'#f2c3ad');
      }
      if(o.kind==='crystal'||o.kind==='obelisk'){
        const glow=Math.sin(t*1.5+o.x*.07);if(glow>.60){rect(c,o.x-1,o.y-18,3,1,'#e5f5cf');rect(c,o.x,o.y-19,1,3,'#e5f5cf');}
      }
    }
  }
  function makeChart(){const c=canvas(400,270),g=c.getContext('2d');g.drawImage(ground,0,0,400,270);g.scale(.25,.25);for(const o of arrays.objects)renderObject(g,o,0);return c;}
  function drawMap(c,w,h,p){
    if(!chart)init();c.save();c.imageSmoothingEnabled=false;c.drawImage(chart,0,0,w,h);
    if(p){const x=p.x/width*w,y=p.y/height*h,s=w>250?4:2.5;poly(c,[[x,y-s-2],[x+s+1,y],[x,y+s+2],[x-s-1,y]],'#202e35');poly(c,[[x,y-s],[x+s,y],[x,y+s],[x-s,y]],'#f3ffe0');}
    c.restore();
  }
  window.World={width,height,spawn,landmarks,points,init,canWalk,drawGround,drawFront,drawMap};
})();
