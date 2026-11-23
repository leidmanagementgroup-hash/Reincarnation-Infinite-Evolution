/* Velaris grows outward from its original settlement. The original World remains the owner of every existing map. */
(() => {
  'use strict';
  const base=window.World,district=window.UrbanDistricts;
  const cityId='city-velaris',originId='verdant-canopy';
  const settlementTypes={
    hamlet:{label:'Borgo',minBuildings:5,maxBuildings:15},
    village:{label:'Villaggio',minBuildings:20,maxBuildings:50},
    town:{label:'Cittadina',minBuildings:60,maxBuildings:150},
    city:{label:'Grande città',minBuildings:200,maxBuildings:500},
    capital:{label:'Capitale',minBuildings:500,maxBuildings:null}
  };
  const entry={x:575,y:382};
  const returnToWood={x:594,y:382};
  const exit={x:94,y:726};
  const gate=(id,at,to,arrival,label)=>({id,...at,to,arrival,label,minStage:0});
  const intoCity=gate('gate-velaris',entry,cityId,UrbanExterior.region.spawn,'Entra a Velaris');
  const outOfCity=gate('gate-selva',exit,originId,returnToWood,'Torna alla Selva degli Alambicchi');
  const forest=base.regions[originId];
  const kinds=new Map(UrbanInteriors.kinds.map(kind=>[UrbanInteriors.get(kind).id,kind]));
  const forestRegion={...forest,points:{...forest.points,gates:[...forest.points.gates,intoCity]}};
  const districtEntrances=Object.fromEntries([...district.origins].map(([origin,profile])=>{
    const map=base.regions[origin],gate=profile.enter;
    return [origin,{...map,points:{...map.points,gates:[...map.points.gates,gate]},
      landmarks:[...map.landmarks,{name:profile.mark,x:gate.x,y:gate.y}]}];
  }));
  const cityRegion={...UrbanExterior.region,settlementType:'town',points:{...UrbanExterior.region.points,gates:[outOfCity]}};
  const regions={...base.regions,[originId]:forestRegion,...districtEntrances,[cityId]:cityRegion,...district.regions,
    ...Object.fromEntries([...kinds].map(([id,kind])=>[id,{...UrbanInteriors.get(kind),hidden:true}]))};
  const continents=base.continents.map(continent=>{
    const extra=[cityRegion,...[...district.origins.values()].map(profile=>district.regions[profile.id])].filter(region=>!region.hidden&&region.continent===continent.id).map(region=>region.id);
    return extra.length?{...continent,regions:[...continent.regions,...extra]}:continent;
  });
  const own=(row,key)=>Object.hasOwn(row,key);
  let cacheSeed=null,current=null,overworldSeed=19425,exteriorCache=null;
  const interiorCache=new Map();

  function resetCaches(seed){
    if(cacheSeed===seed)return;
    exteriorCache=null;interiorCache.clear();cacheSeed=seed;
  }
  function exterior(seed){
    resetCaches(seed>>>0);
    if(!exteriorCache)exteriorCache=UrbanExterior.create(cacheSeed);
    return exteriorCache;
  }
  function interior(kind,seed){
    resetCaches(seed>>>0);
    if(!interiorCache.has(kind)){
      const map=UrbanInteriors.create(kind,cacheSeed);
      if(!map)return null;
      interiorCache.set(kind,map);
      if(interiorCache.size>3)interiorCache.delete(interiorCache.keys().next().value);
    }else{
      const map=interiorCache.get(kind);
      interiorCache.delete(kind);interiorCache.set(kind,map);
    }
    return interiorCache.get(kind);
  }
  const kind=id=>kinds.get(id)||null;
  const inCity=id=>id===cityId||kinds.has(id);
  const localRegion=id=>inCity(id)?originId:district.profileFor(id)?.origin||id;
  const venueMap=s=>district.owns(s.region)?district.create(s.region,s.seed):interior(kind(s.region),s.seed);
  const pointOf=site=>site.point||site;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const near=(s,site)=>!!site&&distance(s.player,pointOf(site))<=(site.range||24);

  function route(from,to,stage){
    if(from===to)return null;
    if(district.owns(from))return district.route(from,to,overworldSeed);
    if(kinds.has(from)){
      const map=interior(kind(from),overworldSeed);
      const door=exterior(overworldSeed).services.find(site=>site.id===kind(from));
      const exitSite=map.sites.find(site=>site.id==='exit');
      return gate('room-to-street',pointOf(exitSite),cityId,pointOf(door),'Torna in città');
    }
    if(from===cityId){
      if(kinds.has(to)){
        const door=exterior(overworldSeed).services.find(site=>site.id===kind(to));
        return door?gate('door-'+door.id,pointOf(door),to,regions[to].spawn,door.name):null;
      }
      return outOfCity;
    }
    if(inCity(to))return from===originId?intoCity:base.route(from,originId,stage);
    const destination=district.profileFor(to);
    if(destination)return from===destination.origin?destination.enter:base.route(from,destination.origin,stage);
    return base.route(from,to,stage);
  }
  function setRegion(id,seed=overworldSeed){
    if(!own(regions,id))return false;
    const key=seed>>>0;
    if(district.owns(id)){
      const map=district.create(id,key);
      if(!map)return false;
      current={id,map};
    }else if(inCity(id)){
      const map=id===cityId?exterior(key):interior(kind(id),key);
      if(!map)return false;
      current={id,map};
    }else{
      if(!base.setRegion(id,key))return false;
      current=null;
    }
    district.active(current?.id,current?.map);
    overworldSeed=key;
    return api;
  }
  function marker(ctx,x,y,t,type){
    const block=(c,ox,oy,w,h)=>{ctx.fillStyle=c;ctx.fillRect((x+ox)|0,(y+oy)|0,w,h);};
    const pulse=Math.sin(t*2)>.4;
    if(type==='gate'){
      block('#252c36',-14,-23,3,24);block('#252c36',11,-23,3,24);
      block('#576b81',-13,-23,26,3);block('#899cac',-11,-21,22,2);
      block('#b5bda1',-9,-17,18,5);block('#496077',-9,-12,18,3);
      block('#d7c9a0',-4,-16,8,1);block('#c1b791',-7,-15,14,1);
      block(pulse?'#e8d499':'#c9bb8c',-11,-6,2,3);block('#b5bda1',11,-6,2,3);
    }else{
      block('#363f4a',-8,-15,16,12);block('#5b7884',-7,-14,14,9);
      block('#8fb4b7',-5,-13,10,1);block('#768891',-8,-3,16,3);
      if(type==='restored'){
        block('#b5e2db',-1,-21,3,7);block('#84c7bc',-5,-17,11,2);
        if(pulse){block('#e2efcf',-4,-25,2,2);block('#e2efcf',4,-22,1,2);}
      }else block('#bba272',-2,-10,5,2);
    }
  }
  const api={
    regions,continents,route,setRegion,init(seed=19425){return setRegion('valley',seed);},
    canWalk(x,y,r){return current?current.map.canWalk(x,y,r):base.canWalk(x,y,r);},
    buildWater(x,y,r){return current?(current.map.buildWater?.(x,y,r)||false):base.buildWater(x,y,r);},
    drawGround(ctx,cam,t){return current?current.map.drawGround(ctx,cam,t):base.drawGround(ctx,cam,t);},
    drawFront(ctx,cam,t,actors=[]){
      if(current)return current.map.drawFront(ctx,cam,t,actors);
      const access=district.origins.get(base.region);
      if(access)return base.drawFront(ctx,cam,t,actors.concat({x:access.enter.x,y:access.enter.y,draw:access.guide}));
      if(base.region!==originId)return base.drawFront(ctx,cam,t,actors);
      const sign={x:entry.x+14,y:entry.y-16,draw:g=>marker(g,entry.x+14,entry.y-16,t,'gate')};
      return base.drawFront(ctx,cam,t,actors.concat(sign));
    },
    drawMap(ctx,w,h,p){return current?current.map.drawMap(ctx,w,h,p):base.drawMap(ctx,w,h,p);},
    get region(){return current?.id||base.region;},
    get width(){return current?regions[current.id].width:base.width;},
    get height(){return current?regions[current.id].height:base.height;},
    get points(){return this.region===originId?forestRegion.points:districtEntrances[this.region]?.points||(current?regions[current.id].points:base.points);},
    get spawn(){return current?regions[current.id].spawn:base.spawn;},
    get landmarks(){return districtEntrances[this.region]?.landmarks||(current?regions[current.id].landmarks:base.landmarks);}
  };

  function site(s,id){
    if(!s||!kind(s.region)&&!district.owns(s.region))return null;
    const raw=venueMap(s)?.sites.find(site=>site.id===id);
    return raw?{...raw,region:s.region,point:pointOf(raw)}:null;
  }
  const access=(s,id)=>near(s,site(s,id));
  function interaction(raw,extra={}){
    return {...raw,...extra,kind:'urban-site',range:raw.range||24,point:pointOf(raw)};
  }
  function sites(s){
    if(district.owns(s.region))return venueMap(s).sites.map(raw=>interaction(raw));
    if(s.region===cityId){
      const layout=exterior(s.seed);
      return [...layout.services.map(door=>interaction(door,{id:'door-'+door.id,text:'Entra · '+door.name})),
        interaction(layout.plaza,{id:'civic-fountain',text:'Esamina la fonte delle Lenti',range:25})];
    }
    const venue=kind(s.region);
    if(!venue)return [];
    return interior(venue,s.seed).sites.filter(raw=>raw.id!=='guild').map(raw=>interaction(raw));
  }
  function use(s,id){
    const currentSite=sites(s).find(raw=>raw.id===id);
    if(!near(s,currentSite))return {ok:false,text:'Avvicinati al luogo.'};
    if(district.owns(s.region))return district.use(s,currentSite);
    if(id.startsWith('door-')){
      const venue=id.slice(5),room=UrbanInteriors.get(venue);
      if(!room)return {ok:false,text:'L’ingresso è chiuso.'};
      return {ok:true,transition:{region:room.id,...room.spawn}};
    }
    if(id==='exit'){
      const door=exterior(s.seed).services.find(door=>door.id===kind(s.region));
      if(!door)return {ok:false,text:'L’uscita è chiusa.'};
      return {ok:true,transition:{region:cityId,...pointOf(door)}};
    }
    if(id==='shop')return {ok:true,panel:'economy'};
    if(id==='forge')return {ok:true,panel:'gear'};
    if(id==='guild-lounge')return {ok:true,panel:'urban'};
    if(id==='inn-kitchen')return {ok:true,panel:{id:'workshop',detail:'cooking'}};
    if(id==='inn-bed'||id==='house-bed'||id==='inn-water')return {ok:true,panel:'living'};
    return {ok:true,panel:{id:'city-site',detail:id}};
  }
  function location(s){
    if(district.profileFor(s.region)?.id===s.region){
      const marks=district.regions[s.region].landmarks;
      return marks.reduce((a,b)=>distance(a,s.player)<distance(b,s.player)?a:b).name;
    }
    if(s.region!==cityId)return null;
    const city=exterior(s.seed);
    if(city.districtAt)return city.districtAt(s.player.x,s.player.y)?.name||null;
    const districts=city.districts;
    const closest=city.region.landmarks?.reduce((a,b)=>distance(a,s.player)<distance(b,s.player)?a:b);
    const hit=closest?.district&&districts.find(d=>d.id===closest.district);
    return hit?.name||closest?.name||null;
  }
  function actors(s,t){
    if(district.owns(s.region))return district.actors(s,t);
    if(kind(s.region)==='greenhouse'&&s.cityWorks.seedbedAt!==-1){
      const ready=s.cityWorks.seedbedAt,mature=ready>0&&Calendar.timestamp(s.calendar,s.time)>=ready;
      return [{x:384,y:296,draw(ctx){
        for(let x=363;x<=405;x+=7){
          if(ready===0){ctx.fillStyle='#c7a866';ctx.fillRect(x,288,2,1);continue;}
          ctx.fillStyle='#3a7454';ctx.fillRect(x,282,2,7);
          ctx.fillStyle=mature?'#a6c882':'#789e67';ctx.fillRect(x-3,283,4,2);
          if(mature){ctx.fillRect(x+1,280,3,3);ctx.fillStyle='#cee2bf';ctx.fillRect(x+2,279,2,2);}
        }
      }}];
    }
    if(s.region!==cityId)return [];
    const {x,y}=exterior(s.seed).plaza;
    return [{x,y:y-13,draw:ctx=>marker(ctx,x,y-13,t,s.cityWorks?.restored?'restored':'inert')}];
  }

  window.World=api;
  window.UrbanWorld={cityId,originId,settlementTypes,exterior,interior,kind,inCity,localRegion,location,site,access,sites,use,actors};
})();
