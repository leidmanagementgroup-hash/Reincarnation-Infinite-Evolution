// Uso: node tests/prova-browser-scala-urbana.cjs <cartella delle build> [25,50,100,250]
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {chromium}=require(process.env.PW_CORE||'playwright-core');
const {open,picture}=require('./prova-browser-filoni.cjs');
const [out,counts='25,50,100,250']=process.argv.slice(2);
assert(out&&fs.existsSync(out),'Serve la cartella delle build offline');
const sizes=counts.split(',').map(Number),seeds=[19425,555,2024],samples=155,errors=[];
const id='city-urban-lab';

function stats(data){
  const sorted=data.slice().sort((a,b)=>a-b),q=p=>+sorted[Math.ceil(p*sorted.length)-1].toFixed(3);
  return {median:q(.5),p95:q(.95),max:q(1),over33:sorted.filter(t=>t>33.33).length};
}
async function heap(page){
  const client=await page.context().newCDPSession(page);
  try{
    await client.send('HeapProfiler.collectGarbage');
    const {usedSize,backingStorageSize}=await client.send('Runtime.getHeapUsage');
    return {usedSize,backingStorageSize};
  }finally{await client.detach();}
}
async function benchmark(browser,size,seed){
  const fixture=await open(browser,path.join(out,`CONFLUENZA-${size}.html`),seed,errors),{page}=fixture;
  try{
    const preparation=await page.evaluate(({id,size,seed})=>{
      if(Game.s.region!==id||Game.s.seed!==seed)throw Error('Nuova incarnazione non entrata nel laboratorio');
      const storage=Object.keys(localStorage).filter(key=>key.includes('.save.'));
      if(!storage.includes('reincarnation.urban-lab.'+size+'.save.v7')||storage.some(key=>key.startsWith('reincarnation.lumora.save.')))
        throw Error('Chiavi di salvataggio non isolate');
      const calculate=performance.now();
      const first=UrbanDistricts.create(id,(seed+1283810)>>>0);
      const generationMs=performance.now()-calculate;
      if(first.layout.buildings.length!==size||first.layout.cacheStats().resident!==0)throw Error('Generazione a richiesta assente');
      // Esce e rientra attraverso i due varchi reali. Le altre chiavi espellono la mappa del seme corrente.
      const exit=World.route(id,'valley',Game.s.campaign.stage);
      Object.assign(Game.s.player,{x:exit.x,y:exit.y});
      if(!Game.action('interact')||World.region!=='valley')throw Error('Uscita assente');
      for(let i=1;i<=6;i++)UrbanDistricts.create(id,(seed+i)>>>0);
      const cold=performance.now();
      if(!Game.action('interact')||World.region!==id)throw Error('Varco del laboratorio chiuso');
      __filoniFrame();
      const entryMs=performance.now()-cold;
      const row=seed===2024?World.height-512:0;
      Object.assign(Game.s.player,{x:456,y:row+256});
      __filoniTime(540);
      __filoniFrame(30);
      return {generationMs,entryMs,row,sectors:UrbanDistricts.create(id,seed).cacheStats()};
    },{id,size,seed});
    const memoryBefore=await heap(page);
    await page.keyboard.down('d');
    let measured;
    try{
      measured=await page.evaluate(async ({id,samples})=>{
        const times=[],world=Game.s;
        const x0=world.player.x,y0=world.player.y,startTime=world.time;
        let frame,steps=0,wasBeyond=false,maxTileBytes=0,maxFacades=0,maxLoaded=0,maxResidents=0;
        const undo=[];
        function watch(owner,key,metric,onDone){
          const original=owner[key];
          owner[key]=function(...args){
            const now=performance.now();
            try{const value=original.apply(this,args);onDone?.(value);return value;}
            finally{if(frame)frame[metric]+=performance.now()-now;}
          };
          undo.push(()=>{owner[key]=original;});
        }
        watch(Game,'step','simulation',()=>steps++);
        watch(Game,'actors','actors',actors=>{maxResidents=Math.max(maxResidents,actors.length-1);});
        watch(World,'drawGround','render');
        watch(World,'drawFront','render');
        watch(WorldLight,'draw','render');
        watch(WorldLight,'ambient','render');
        watch(Game,'drawFX','render');
        let previous=null;
        try{
          for(let i=0;i<samples;i++){
            const callback=await new Promise(resolve=>__filoniRAF(resolve));
            frame={total:0,simulation:0,actors:0,render:0,interval:previous===null?null:callback-previous};
            const start=performance.now();
            __filoniFrame();
            frame.total=performance.now()-start;
            times.push(frame);frame=null;previous=callback;
            if(Game.s.region!==id||!World.canWalk(world.player.x,world.player.y,6))throw Error('Collisione dopo cambio settore');
            if(world.player.x>512)wasBeyond=true;
            const {resident,facades,terrainBytes}=UrbanDistricts.create(id,world.seed).cacheStats();
            maxTileBytes=Math.max(maxTileBytes,terrainBytes);
            maxFacades=Math.max(maxFacades,facades);
            maxLoaded=Math.max(maxLoaded,resident);
          }
          if(!wasBeyond||steps!==samples||world.time-startTime<samples/60-.01||Math.abs(world.player.y-y0)>.1)
            throw Error('Passi, calendario o attraversamento assenti');
          return {steps,seconds:world.time-startTime,distance:world.player.x-x0,maxTileBytes,maxFacades,maxLoaded,maxResidents,times};
        }finally{for(const restore of undo.reverse())restore();}
      },{id,samples});
    }finally{await page.keyboard.up('d');}
    const memoryAfter=await heap(page);
    const metrics=Object.fromEntries(['total','simulation','actors','render','interval'].map(k=>[k,stats(measured.times.map(t=>t[k]).filter(v=>v!==null))]));
    return {size,seed,sha256:fixture.sha256,...preparation,memoryBefore,memoryAfter,...measured,metrics};
  }finally{await fixture.context.close();}
}

async function explore(browser,size){
  const fixture=await open(browser,path.join(out,`CONFLUENZA-${size}.html`),19425,errors),{page}=fixture;
  const labels=['logge','officine','vetro','radici','corone'];
  try{
    const visits=[];
    for(let i=0;i<labels.length;i++){
      const visit=await page.evaluate(({i,id})=>{
        const s=Game.s,lot='door-rione-'+i+'-0-lotto-1',portal=UrbanWorld.site(s,lot);
        const started=performance.now(),approach=__filoniWalk(portal),walkMs=performance.now()-started;
        if(!Game.action('interact')||Game.s.region!==portal.to)throw Error('Ingresso non raggiunto');
        const room=Game.s.region,kind=UrbanDistricts.roomKind(room);
        const map=UrbanDistricts.create(room,s.seed),service=map.sites.find(q=>q.id!=='exit');
        const walkInside=__filoniWalk(service);
        if(!Game.action('interact'))throw Error('Servizio non raggiunto');
        if(UI.panel)UI.close();
        const x=Game.s.player.x,y=Game.s.player.y,exported=Game.exportSave();
        if(!Game.save()||!Game.load()||Game.s.region!==room||Game.s.player.x!==x||Game.s.player.y!==y||!Game.importSave(exported))
          throw Error('Salvataggio interno non ripristinato');
        __filoniWalk(UrbanWorld.site(Game.s,'exit'));
        if(!Game.action('interact')||Game.s.region!==id||Math.hypot(Game.s.player.x-portal.x,Game.s.player.y-portal.y)>1)
          throw Error('Uscita diversa dalla soglia persistente');
        return {room,kind,approach,walkInside,walkMs};
      },{i,id});
      await picture(page,size+'-rione-'+labels[i],{x:256+512*i,y:202},735,out);
      visits.push(visit);
    }
    await picture(page,size+'-rione-corone-notte',{x:256+512*4,y:202},1320,out);
    return {size,visits,sha256:fixture.sha256};
  }finally{await fixture.context.close();}
}

(async()=>{
  const browser=await chromium.launch({channel:'msedge'});
  const result={browser:browser.version(),machine:os.cpus()[0]?.model,viewport:[1280,720],
    methodology:'Edge offline headless. Game.step e Canvas reali, 155 aggiornamenti a 1/60 s per misura, movimento con D tra due settori, callback rAF cronometrati. Heap JavaScript in CDP dopo garbage collection.',
    benchmarks:[],exploration:null};
  try{
    for(const n of sizes){
      for(const seed of seeds){
        const e=await benchmark(browser,n,seed);result.benchmarks.push(e);
        console.log(`${n}/${seed}: generazione ${e.generationMs.toFixed(1)} ms, ingresso ${e.entryMs.toFixed(1)} ms, CPU p95 ${e.metrics.total.p95} ms, rAF p95 ${e.metrics.interval.p95} ms, heap ${Math.round(e.memoryAfter.usedSize/1024)} KiB.`);
      }
    }
    // Esegue una visita dei cinque tipi di interni sul taglio principale richiesto.
    result.exploration=await explore(browser,sizes.includes(100)?100:sizes[0]);
    assert.equal(result.exploration.visits.length,5);
    assert.deepEqual(errors,[],errors.join(' | '));
    fs.writeFileSync(path.join(out,'benchmark-urbano-'+sizes.join('-')+'.json'),JSON.stringify(result,null,2)+'\n');
    console.log('OK: attraversamenti con simulazione, cinque interni, soglie e salvataggi offline.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
