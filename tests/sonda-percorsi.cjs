// Sonda BUG-011: conta i residenti di Velaris fermi nel punto di partenza perché la tratta non ha un percorso valido.
// Uso: node tests/sonda-percorsi.cjs [semi separati da virgola]   (codice di uscita 1 se trova tratte senza percorso)
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function load(root){
  const modules=fs.readFileSync(path.join(root,'build.py'),'utf8').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
  function surface(){const px={createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),getImageData(_x,_y,w,h){return px.createImageData(w,h)},createLinearGradient(){return{addColorStop(){}}},createRadialGradient(){return{addColorStop(){}}}};const c=new Proxy(px,{get:(t,k)=>k in t?t[k]:()=>undefined});return{width:1,height:1,getContext:()=>c}}
  const store=new Map(),scope={console:{warn(){}},document:{createElement:surface},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)}};
  scope.window=scope;vm.createContext(scope);
  for(const f of modules){
    if(f==='audio.js')break;
    let src=fs.readFileSync(path.join(root,f),'utf8');
    if(f==='urban-life.js'){
      const tail='window.UrbanLife={';
      if(!src.includes(tail))throw new Error('export non trovato');
      src=src.replace(tail,'window.__UL={useRuntime,profiles,dailyPlan,samplePlan,sampleStreet,route,straight,checkPathPoint,minute:s=>minute(s),allPlaces};'+tail);
    }
    vm.runInContext(src,scope,{filename:f});
  }
  scope.newGame=seed=>{vm.runInContext(`Math.random=(()=>{let n=0;return()=>n++===0?${seed}/4294967296:.24})()`,scope);if(!scope.Game.newGame())throw new Error('newGame');const s=scope.Game.s;s.region='city-velaris';return s;};
  scope.setMinute=(s,m)=>{const C=scope.Calendar;const cur=((C.timestamp(s.calendar,s.time)%1440)+1440)%1440;s.time+=((m-cur+1440)%1440)/(C.minutesPerSecond||.8);};
  return scope;
};

// Conta i campioni "fermi nel punto di partenza" (criterio originale) e le tratte senza percorso.
const root=path.resolve(__dirname,'..'),seeds=(process.argv[2]||'555,1,77,3,2024').split(',').map(Number);
const W=load(root),UL=W.__UL;
let samples=0,stuck=0;const failed=new Map();
for(const seed of seeds){
  const s=W.newGame(seed),rt=UL.useRuntime(s);
  for(let m=0;m<1440;m+=20){
    W.setMinute(s,m);
    for(const p of UL.profiles(s.seed).list){
      samples++;
      const plan=UL.dailyPlan(s,p,rt),ph=UL.samplePlan(plan,UL.minute(s)),st=UL.sampleStreet(s,p,plan,rt);
      const a=ph.previous.point,b=ph.now.point,q=st.point;
      const moved=Math.hypot(a.x-b.x,a.y-b.y)>=1;
      if(!st.moving&&moved&&Math.hypot(q.x-b.x,q.y-b.y)>1&&Math.hypot(q.x-a.x,q.y-a.y)<1)stuck++;
      if(moved&&!UL.route(rt,a,b)){const k=seed+'|'+[a.x,a.y,b.x,b.y].join(',');failed.set(k,{seed,a:{x:a.x,y:a.y,id:a.id},b:{x:b.x,y:b.y,id:b.id}});}
    }
  }
}
console.log(JSON.stringify({seeds,samples,stuck,pct:+(100*stuck/samples).toFixed(2),distinctFailedLegs:failed.size}));
if(failed.size)console.log(JSON.stringify([...failed.values()].slice(0,10)));
process.exitCode=stuck||failed.size?1:0;
