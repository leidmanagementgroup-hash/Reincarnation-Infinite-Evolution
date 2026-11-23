// Uso: node tests/verifica-scala-urbana.cjs [25,50,100,250]
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),counts=(process.argv[2]||'25,50,100,250').split(',').map(Number);
function load(count){
  const fields={createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},getImageData(x,y,w,h){return this.createImageData(w,h);}};
  const context=new Proxy(fields,{get:(o,k)=>o[k]??(()=>{})});
  const scope={console,atob,UrbanLabSize:count,document:{createElement:()=>({getContext:()=>context})}};
  scope.window=scope;vm.createContext(scope);
  const modules=fs.readFileSync(path.join(root,'build.py'),'utf8').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
  for(const file of modules){
    const candidates=file==='urban-districts.js'&&fs.existsSync(path.join(root,'urban-lab.js'))?['urban-lab.js',file]:[file];
    for(const input of candidates)vm.runInContext(fs.readFileSync(path.join(root,input),'utf8'),scope,{filename:input});
    if(file==='urban-world.js')break;
  }
  scope.Calendar={timestamp:c=>c.minute,minutesPerSecond:.8};
  return {...scope,context};
}
const samples=[0,19425,555,2024,4294967295];
const knownBySeed=new Map();
for(const size of counts){
  const {UrbanDistricts:D,UrbanProfiles,World,context}=load(size),id='city-urban-lab';
  assert(World.regions[id],'Il laboratorio deve essere una regione giocabile');
  let routes=0,points=0,residents=0;
  const profile=UrbanProfiles.find(p=>p.id===id);
  assert.equal(new Set(profile.neighborhoods.map(n=>n.palette)).size,5);
  for(const seed of samples){
    const map=D.create(id,seed),data=map.layout,home=World.regions[id].spawn;
    assert.equal(data.buildings.length,size);
    assert.equal(new Set(data.buildings.map(b=>b.id)).size,size);
    assert.equal(data.cacheStats().resident,0,'L’ingresso carica il grafo, la geometria resta pigra');
    const lots=data.buildings.map(b=>[b.id,b.box,b.door,b.room]),fingerprint=JSON.stringify(lots);
    const known=knownBySeed.get(seed)||new Map();
    for(const [id,box,door,room] of lots){
      const value=JSON.stringify([box,door,room]);
      if(known.has(id))assert.equal(value,known.get(id),'Un lotto cambia se la città si amplia');
      known.set(id,value);
    }
    knownBySeed.set(seed,known);
    const original=JSON.stringify(data.sectors.get('0/0').props);
    for(const worker of profile.workers)for(let i=1;i<worker.agenda.length;i++){
      const a=data.nodes.get(worker.agenda[i-1][1]),b=data.nodes.get(worker.agenda[i][1]);
      assert(map.path(a,b,6).length>=2,'Turno del residente privo di percorso');
    }
    for(const {from,to} of data.roads.filter(r=>r.main)){
      const count=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/6));
      for(let i=0;i<=count;i++)assert(map.canWalk(from.x+(to.x-from.x)*i/count,from.y+(to.y-from.y)*i/count,6),'Stacco di collisione fra rioni');
    }
    for(const [i,b] of data.buildings.entries()){
      assert(!map.canWalk(b.x,b.y-8,6),b.id);
      assert(map.canWalk(b.door.x,b.door.y,6),b.id);
      assert(data.buildings.slice(i+1).every(({box:q})=>b.box.x>=q.x+q.w||q.x>=b.box.x+b.box.w||b.box.y>=q.y+q.h||q.y>=b.box.y+b.box.h));
      const route=map.path(home,b.door,6);
      assert(route.length>=2,`Ingresso isolato ${size}/${seed}/${b.id}`);
      for(let t=1;t<route.length;t++){
        const a=route[t-1],z=route[t],n=Math.max(1,Math.ceil(Math.hypot(z.x-a.x,z.y-a.y)/3));
        for(let q=0;q<=n;q++){
          assert(map.canWalk(a.x+(z.x-a.x)*q/n,a.y+(z.y-a.y)*q/n,6),b.id);
          points++;
        }
      }
      routes++;
      if(b.room){
        const room=D.create(b.room,seed),spawn=World.regions[b.room].spawn,exit=D.route(b.room,id,seed);
        assert(room.canWalk(spawn.x,spawn.y,6)&&room.sites.every(p=>room.canWalk(p.x,p.y,6)),b.room);
        assert(exit.arrival.x===b.door.x&&exit.arrival.y===b.door.y,b.room);
      }
    }
    for(const minute of [425,455,480,510,550,740,865,1110,1250]){
      for(const npc of map.actors({calendar:{minute}},0)){
        assert(map.canWalk(npc.x,npc.y,6),'NPC fuori dalla strada');
        residents++;
      }
    }
    const paint=p=>{const cam={x:p.x-130,y:p.y-100,w:512,h:384};map.drawGround(context,cam);map.drawFront(context,cam,0);};
    // La stessa mappa resta interrogabile dopo il passaggio attraverso più settori del budget.
    for(const building of data.buildings.filter((_,n)=>n%5===0))paint(building.door);
    assert(data.cacheStats().resident<=8);
    if(size>=50)assert(data.cacheStats().evicted>0);
    assert.equal(JSON.stringify(data.sectors.get('0/0').props),original);
    assert(map.cacheStats().terrainBytes<=12*256*256*4);
    for(let i=1;i<=6;i++)D.create(id,(seed+i)>>>0);
    const second=D.create(id,seed);
    assert.equal(JSON.stringify(second.layout.buildings.map(b=>[b.id,b.box,b.door,b.room])),fingerprint);
    paint(home);
  }
  assert(residents>0);
  console.log(`OK ${size}: ${samples.length} semi, ${routes} percorsi, ${points} campioni, ${residents} posizioni residenti.`);
}
