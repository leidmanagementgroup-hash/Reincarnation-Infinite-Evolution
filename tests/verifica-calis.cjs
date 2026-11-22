// Profilo portuale: confronto a parità di seme con Filoni e con il litorale originale.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function load(root){
  const fields={createImageData(width,height){return {data:new Uint8ClampedArray(width*height*4)};},getImageData(x,y,w,h){return this.createImageData(w,h);}};
  const context=new Proxy(fields,{get:(o,k)=>o[k]??(()=>{})});
  let canvases=0;
  const scope={console,atob,document:{createElement:()=>{canvases++;return {getContext:()=>context};}}};
  scope.window=scope;vm.createContext(scope);
  const modules=fs.readFileSync(path.join(root,'build.py'),'utf8').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
  for(const file of modules){
    vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),scope,{filename:file});
    if(file==='urban-world.js')break;
  }
  scope.Calendar={timestamp:calendar=>calendar.minute,minutesPerSecond:.8};
  return {...scope,context,canvases:()=>canvases};
}

const root=path.resolve(__dirname,'..'),id='city-calis',origin='dune-port';
const {World,UrbanDistricts:D,CityFamilies,context,canvases}=load(root);
const previous=process.argv[2]?load(path.resolve(process.argv[2])):null;
assert(World.regions[id],'Il Porto di Calis deve avere una regione visitabile');
const seeds=[0,1,555,19425,4294967295,...Array.from({length:50},(_,i)=>Math.imul(i+1,2654435761)>>>0)];
const shape=m=>JSON.stringify({lots:m.layout.buildings.map(b=>[b.id,b.box,b.door,b.room]),props:m.layout.props,sites:m.sites});
const intersect=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
let itineraries=0,samples=0,npcs=0;
const shapes=new Set();
for(const seed of seeds){
  World.setRegion(origin,seed);
  const gate=World.route(origin,id,2),back=World.route(id,origin,2);
  assert(gate?.to===id&&back?.to===origin&&World.canWalk(gate.x,gate.y,7)&&World.canWalk(back.arrival.x,back.arrival.y,7));
  assert(World.canWalk(455,409,6),'Il mercato storico deve restare accessibile');
  assert(!World.canWalk(1020,730,0),'La baia deve restare nel mondo originale');
  if(previous&&[0,555,19425].includes(seed)){
    previous.World.setRegion(origin,seed);
    for(let y=25;y<796;y+=13)for(let x=25;x<1273;x+=13){
      assert.equal(World.canWalk(x,y,6),previous.World.canWalk(x,y,6),'Collisione cambiata in dune-port');
      assert.equal(World.buildWater(x,y,0),previous.World.buildWater(x,y,0),'Acqua cambiata in dune-port');
    }
  }
  const map=D.create(id,seed),{buildings}=map.layout;
  assert(buildings.length>=9&&buildings.length<=15);
  assert.equal(map.sites.filter(s=>s.to).length,4);
  assert(map.sites.some(s=>s.id==='cargo-board'));
  assert(!map.canWalk(590,530,6),'La baia fuori dai pontili non è percorribile');
  assert(!map.canWalk(571,510,6),'Il bordo del pontile deve bloccare il passaggio in mare');
  assert(map.canWalk(552,522,6)&&map.canWalk(673,510,6),'I due pontili sono percorribili');
  const destinations=[...buildings.map(b=>b.door),map.layout.nodes.get('pierWest'),map.layout.nodes.get('pierEast'),back];
  for(const [i,b] of buildings.entries()){
    assert(!map.canWalk(b.x,b.y-7,6)&&map.canWalk(b.door.x,b.door.y,6),b.id);
    assert(buildings.slice(i+1).every(other=>!intersect(b.box,other.box)),b.id+' sovrapposto');
    if(!b.room)continue;
    const room=D.create(b.room,seed),entry=D.regions[b.room].spawn,exit=D.route(b.room,id,seed);
    assert(room.canWalk(entry.x,entry.y,6)&&room.sites.every(p=>room.canWalk(p.x,p.y,6)));
    assert.deepEqual({...exit.arrival},{...b.door},'Uscita dalla soglia persistente');
  }
  for(const {from,to} of map.layout.roads){
    const count=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)));
    for(let i=0;i<=count;i++){
      assert(map.canWalk(from.x+(to.x-from.x)*i/count,from.y+(to.y-from.y)*i/count,6),
        `Via interrotta al seme ${seed}, da ${from.x}/${from.y} a ${to.x}/${to.y}`);
    }
  }
  for(const destination of destinations){
    const course=map.path(World.regions[id].spawn,destination,6);
    assert(course.length>=2,`Soglia isolata al seme ${seed}: ${destination.x},${destination.y}`);
    itineraries++;
    for(let j=1;j<course.length;j++){
      const a=course[j-1],b=course[j],count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*2));
      for(let k=0;k<=count;k++){
        assert(map.canWalk(a.x+(b.x-a.x)*k/count,a.y+(b.y-a.y)*k/count,6),'Tratta in un ostacolo');
        samples++;
      }
    }
  }
  const fingerprint=shape(map);shapes.add(fingerprint);
  D.create(D.id,seed);
  if(previous)assert.equal(shape(D.create(D.id,seed)),shape(previous.UrbanDistricts.create(D.id,seed)));
  for(let n=0;n<6;n++)D.create(id,(seed+n+1)>>>0);
  assert.equal(shape(D.create(id,seed)),fingerprint);
  assert.equal(map.actors({calendar:{minute:0}},0).length,0);
  for(let minute=420;minute<1290;minute+=5){
    for(const actor of map.actors({calendar:{minute}},0)){
      assert(map.canWalk(actor.x,actor.y,6),`Residente in un ostacolo: ${seed}/${minute}`);
      npcs++;
    }
  }
}
assert(shapes.size>1);
const map=D.create(id,19425),view={x:0,y:0,w:World.regions[id].width,h:World.regions[id].height};
map.drawGround(context,view,0);
const hot=canvases();
map.drawGround(context,view,1);
assert.equal(canvases(),hot,'La cache deve conservare i settori visibili');
map.drawFront(context,view,0);
const lights=map.lights(view);
assert(lights.windows.length>=16&&lights.lights.length>=6);
for(const b of map.layout.buildings){
  assert(CityFamilies.render('azheryon',b.facade.sub,b.facade.kind,b.facade.spec)?.windows.length,b.id);
}
assert(World.setRegion(id,19425)&&World.buildWater(590,530,0)&&!World.buildWater(552,522,0));
console.log(`OK: ${seeds.length} semi, ${itineraries} percorsi, ${samples} campioni, ${npcs} posizioni NPC, ${lights.windows.length} finestre, ${lights.lights.length} lampioni. ${previous?'Filoni e costa esistente equivalenti al riferimento.':''}`);
