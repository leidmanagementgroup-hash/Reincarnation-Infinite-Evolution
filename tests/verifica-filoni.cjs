// Geometria del prototipo, senza Canvas reale. Uso: node tests/verifica-filoni.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const modules=fs.readFileSync(path.join(root,'build.py'),'utf8')
  .match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^\"]+\.js"/g).map(JSON.parse);
const pixels={
  createImageData(width,height){return {width,height,data:new Uint8ClampedArray(width*height*4)};},
  getImageData(x,y,w,h){return this.createImageData(w,h);},
  createLinearGradient(){return {addColorStop(){}};},
  createRadialGradient(){return {addColorStop(){}};}
};
const ctx=new Proxy(pixels,{get:(o,k)=>o[k]??(()=>{})});
let canvases=0;
const scope={document:{createElement:()=>{canvases++;return {getContext:()=>ctx};}},console,atob};
scope.window=scope;vm.createContext(scope);
for(const file of modules){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),scope,{filename:file});
  if(file==='urban-world.js')break;
}
const {UrbanDistricts:D,World}=scope;
assert(D,'Il registro dei quartieri procedurali deve essere caricato nella build');
const seeds=[0,1,555,19425,4294967295,...Array.from({length:50},(_,i)=>Math.imul(i+1,2654435761)>>>0)];
const overlap=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
let routes=0,steps=0,residents=0;
scope.Calendar={timestamp:calendar=>calendar.minute,minutesPerSecond:.8};
const fingerprint=m=>JSON.stringify(m.layout.buildings.map(b=>[b.id,b.sprite,b.box,b.door,b.room]));
let varied=false;
let previous;
for(const seed of seeds){
  const map=D.create(D.id,seed),before=fingerprint(map);
  if(previous&&before!==previous)varied=true;
  previous=before;
  const {buildings}=map.layout;
  const ids=buildings.map(b=>b.id).join(',');
  assert.equal(ids,D.create(D.id,19425).layout.buildings.map(b=>b.id).join(','),'chiavi dei lotti stabili');
  assert(buildings.length>=10&&buildings.length<=15);
  assert(new Set(buildings.map(b=>b.id)).size===buildings.length);
  for(const [i,b] of buildings.entries()){
    assert(!map.canWalk(b.x,b.y-8,6),`${seed}: edificio attraversabile ${b.id}`);
    assert(map.canWalk(b.door.x,b.door.y,6),`${seed}: soglia chiusa ${b.id}`);
    assert(buildings.slice(i+1).every(c=>!overlap(b.box,c.box)),`${seed}: lotti sovrapposti`);
    const route=map.path(D.regions[D.id].spawn,b.door,6);
    assert(route.length>=2,`${seed}: ingresso isolato ${b.id}`);
    routes++;
    for(let j=1;j<route.length;j++){
      const a=route[j-1],z=route[j],count=Math.ceil(Math.hypot(z.x-a.x,z.y-a.y)*2);
      for(let i=0;i<=count;i++){
        const t=count?i/count:0;
        assert(map.canWalk(a.x+(z.x-a.x)*t,a.y+(z.y-a.y)*t,6),'tratto attraverso un ostacolo');
        steps++;
      }
    }
    if(!b.room)continue;
    const room=D.create(b.room,seed),entry=D.regions[b.room].spawn;
    assert(room.canWalk(entry.x,entry.y,6),`${seed}: ingresso interno chiuso`);
    assert(room.sites.every(p=>room.canWalk(p.x,p.y,6)),`${seed}: servizio interno inaccessibile`);
  }
  D.create(D.id,(seed+1)>>>0);
  assert.equal(fingerprint(D.create(D.id,seed)),before,`${seed}: dipende dall’ordine di caricamento`);
  assert.equal(map.actors({calendar:{minute:0}},0).length,0,'turno di riposo');
  for(const minute of [475,510,735,790,855,1091,1140]){
    for(const actor of map.actors({calendar:{minute}},0)){
      assert(map.canWalk(actor.x,actor.y,6),`${seed}: NPC in un ostacolo al minuto ${minute}`);
      residents++;
    }
  }
}
assert(varied,'La planimetria deve variare con il seme');
assert(World.regions[D.origin].points.gates.some(g=>g.to===D.id),'Il Passo deve avere l’accesso al quartiere');
for(const seed of [0,555,19425,4294967295]){
  assert(World.setRegion(D.origin,seed));
  const entry=World.route(D.origin,D.id,0);
  assert(World.canWalk(entry.x,entry.y,6),'La soglia nel Passo deve essere raggiungibile');
}
assert(residents>0,'Il borgo deve essere abitato durante il giorno');
const wide=D.create(D.id,19425);
const camera={x:0,y:0,w:D.regions[D.id].width,h:D.regions[D.id].height};
wide.drawGround(ctx,camera);
const warmed=canvases;
wide.drawGround(ctx,camera);
assert.equal(canvases,warmed,'Il numero di settori visibili non deve svuotare la cache');
console.log(`OK: ${seeds.length} semi, ${routes} itinerari, ${steps} punti di collisione, ${residents} posizioni NPC, identità e rigenerazione dei lotti.`);
