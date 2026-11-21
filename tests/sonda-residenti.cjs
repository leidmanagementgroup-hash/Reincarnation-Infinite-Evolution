// Sonda: misura le sovrapposizioni dei residenti fermi di Velaris su più semi e orari.
// Uso: node tests/sonda-residenti.cjs [semi separati da virgola] [soglia in pixel]
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const modules=fs.readFileSync(path.join(root,'build.py'),'utf8').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
function surface(){const px={createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),getImageData(_x,_y,w,h){return px.createImageData(w,h)},createLinearGradient(){return{addColorStop(){}}},createRadialGradient(){return{addColorStop(){}}}};const c=new Proxy(px,{get:(t,k)=>k in t?t[k]:()=>undefined});return{width:1,height:1,getContext:()=>c}}
const store=new Map(),scope={console:{warn(){}},document:{createElement:surface},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)}};
scope.window=scope;vm.createContext(scope);
for(const f of modules){if(f==='audio.js')break;vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),scope,{filename:f})}
const {Game,UrbanWorld,UrbanLife,Calendar}=scope;
const seeds=(process.argv[2]||'19425,1,77,4242,90001').split(',').map(Number);
const thresh=+process.argv[3]||10;
const hours=[[12,'mezzogiorno'],[19.5,'sera'],[23,'notte']];
const pairs=new Set(),perSlot={};let samples=0,maxVisible=0,slowest=0;
for(const seed of seeds){
  vm.runInContext(`Math.random=(()=>{let n=0;return()=>n++===0?${seed}/4294967296:.24})()`,scope);
  if(!Game.newGame())throw new Error('newGame');
  const s=Game.s;s.region='city-velaris';
  const ext=UrbanWorld.exterior(s.seed);
  for(const [h,label] of hours){
    const cur=((Calendar.timestamp(s.calendar,s.time)%1440)+1440)%1440;
    s.time+=((h*60-cur+1440)%1440)/(Calendar.minutesPerSecond||.8);
    for(const spot of Object.values(ext.waypoints)){
      Object.assign(s.player,{x:spot.x,y:spot.y});
      const t0=process.hrtime.bigint();
      const a=UrbanLife.actors(s,0);
      slowest=Math.max(slowest,Number(process.hrtime.bigint()-t0)/1e6);
      maxVisible=Math.max(maxVisible,a.length);samples++;
      a.forEach(q=>{scope.ActorArt.draw=(c,k,x,y,o)=>{q.moving=!!o.moving};q.draw(null);});
      for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){
        if(a[i].moving||a[j].moving||Math.hypot(a[i].x-a[j].x,a[i].y-a[j].y)>=thresh)continue;
        const k=[seed,label,a[i].x,a[i].y,a[j].x,a[j].y].join('|');
        if(!pairs.has(k)){if(process.env.V)console.log(k);pairs.add(k);perSlot[seed+' '+label]=(perSlot[seed+' '+label]||0)+1;}
      }
    }
  }
}
console.log({semi:seeds.length,campioni:samples,visibiliMax:maxVisible,coppieFermeSovrapposte:pairs.size,sogliaPx:thresh,piuLentoMs:+slowest.toFixed(2)});
if(pairs.size)console.log(perSlot);
process.exitCode=pairs.size?1:0;
