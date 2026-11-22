// Edge offline. Uso: node tests/prova-browser-calis.cjs <dopo.html> <prima.html> <risultati>
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PW_CORE||'playwright-core');
const {open,picture,measure}=require('./prova-browser-filoni.cjs');

const [candidate,baseline,out]=process.argv.slice(2);
assert(candidate&&baseline&&out);
fs.mkdirSync(out,{recursive:true});
const seeds=[19425,555,2024];
const errors=[];
const results={visits:[],commissions:[],legacy:[]};
function coarseView(page){
  return page.evaluate(()=>({region:Game.s.region,seed:Game.s.seed,palette:World.regions[Game.s.region].palette}));
}
async function heap(page){
  const cdp=await page.context().newCDPSession(page);
  try {
    await cdp.send('HeapProfiler.collectGarbage');
    const value=await cdp.send('Runtime.getHeapUsage');
    return {jsUsedBytes:value.usedSize,backingStorageBytes:value.backingStorageSize};
  } finally { await cdp.detach(); }
}

(async()=>{
  const edge=await chromium.launch({channel:'msedge'});
  try{
    results.browser=edge.version();
    const old=await open(edge,baseline,seeds[0],errors);
    let legacy;
    try {
      results.before={file:old.file,sha256:old.sha256};
      await old.page.evaluate(()=>__filoniRoute('dune-port'));
      await picture(old.page,'prima-borgo',{x:454,y:407},735,out);
      await picture(old.page,'prima-bahia',{x:945,y:605},735,out);
      results.before.bayFrame=await measure(old.page);
      results.before.heap=await heap(old.page);
      await picture(old.page,'prima-notte',{x:945,y:605},1300,out);
      legacy=await old.page.evaluate(()=>{
        Object.assign(Game.s.player,{x:455,y:409});
        Inventory.add(Game.s,'work',9007199254740993n);
        const coast=Game.exportSave();
        __filoniRoute('city-filoni-larch-inn');
        return {coast,filoni:Game.exportSave(),room:Game.s.region};
      });
    }finally{await old.context.close();}

    for(const seed of seeds){
      const run=await open(edge,candidate,seed,errors),page=run.page;
      try{
        if(seed===seeds[0]){
          results.after={file:run.file,sha256:run.sha256};
          results.legacy=await page.evaluate(({coast,filoni,room})=>{
            const verified=[];
            for(const [save,id] of [[filoni,room],[coast,'dune-port']]){
              if(!Game.importSave(save)||Game.s.region!==id||Inventory.quantity(Game.s,'work')<9007199254740993n)
                throw Error('Salvataggio di main non leggibile: '+id);
              verified.push(id);
            }
            if(Game.s.player.x!==455||Game.s.player.y!==409)throw Error('Coordinate storiche cambiate');
            return verified;
          },legacy);
          const before=await coarseView(page);
          assert.equal(before.region,'dune-port');
          await picture(page,'dopo-borgo',{x:454,y:407},735,out);
        }else await page.evaluate(()=>__filoniRoute('dune-port'));
        const entry=await page.evaluate(()=>{
          const gate=World.route('dune-port','city-calis',Game.s.campaign.stage);
          const approach=__filoniWalk(gate);
          const start=performance.now();
          if(!Game.action('interact')||Game.s.region!=='city-calis')throw Error('Ingresso in città fallito');
          __filoniFrame();
          return {approach,coldMs:performance.now()-start};
        });
        assert(entry.approach.pixels>0);
        if(seed===seeds[0]){
          results.after.coldEntryMs=entry.coldMs;
          await picture(page,'dopo-bahia',{x:515,y:405},735,out);
          results.after.bayFrame=await measure(page);
          await picture(page,'dopo-notte',{x:515,y:405},1300,out);
          await picture(page,'dopo-terrazze',{x:424,y:218},735,out);
          results.after.heap=await heap(page);
          results.after.cache=await page.evaluate(()=>UrbanDistricts.create('city-calis',Game.s.seed).cacheStats());
        }

        const starts=await page.evaluate(()=>{
          const s=Game.s, map=UrbanDistricts.create(s.region,s.seed);
          const pierWalks=['pierWest','pierEast'].map(key=>__filoniWalk(map.layout.nodes.get(key)));
          const desk=UrbanWorld.site(s,'cargo-board');
          if(!__filoniWalk(desk).pixels||!Game.action('interact')||UI.panel!=='journal')throw Error('Il registro non apre il diario');
          if(!Game.command('daily',{op:'accept',id:'calis-freight'}))throw Error('Commissione non accettata');
          UI.close();
          if(!Game.save()||!Game.load()||!Game.s.daily.quests['calis-freight'])throw Error('Registro non persistente');
          return {pierWalks,doors:UrbanWorld.sites(Game.s).filter(p=>p.to).map(p=>p.id)};
        });
        assert(starts.pierWalks.every(w=>w.pixels>0)&&starts.doors.length===4);
        for(const id of starts.doors){
          const visit=await page.evaluate(door=>{
            const s=Game.s,entry=UrbanWorld.site(s,door);
            __filoniWalk(entry);
            if(!Game.action('interact')||Game.s.region!==entry.to)throw Error('Soglia '+door);
            const room=Game.s.region,kind=UrbanDistricts.roomKind(room),serviceId={inn:'inn-bed',shop:'shop',store:'freight-ledger',house:'house-bed'}[kind];
            const walking=__filoniWalk(UrbanWorld.site(s,serviceId));
            if(!Game.action('interact'))throw Error('Servizio irraggiungibile');
            let service;
            if(kind==='shop'){
              __filoniTime(1300);
              Inventory.add(s,'work',6);
              if(Game.command('economy',{op:'sell',id:'work',amount:'3'}))throw Error('Mercato aperto fuori orario');
              __filoniTime(725);
              s.player.gold=200;
              const stock=id=>BigInt(s.economy.markets.calis.stock[id]||'0');
              Economy.tick(s);
              const before=stock('work');
              if(!Game.command('economy',{op:'sell',id:'work',amount:'2'})||s.daily.quests['calis-freight'].progress)
                throw Error('Vendita breve conteggiata come commissione');
              if(!Game.command('economy',{op:'sell',id:'work',amount:'3'})||s.daily.quests['calis-freight'].progress!==1||stock('work')!==before+5n)
                throw Error('La merce non è arrivata al mercato di Calis');
              if(!Game.command('economy',{op:'buy',id:'work',amount:'1'})||stock('work')!==before+4n)
                throw Error('Acquisto dalla stessa scorta non riuscito');
              if(Game.command('daily',{op:'claim',id:'calis-freight'}))throw Error('Ricompensa ritirata fuori dal molo');
              service='Mercato chiuso di notte, vendita, acquisto e commissione';
            }else if(kind==='inn'||kind==='house'){
              __filoniTime(1320);
              if(!Game.command('sleep')||Calendar.view(s.calendar,s.time,s.region).minutes!==360)throw Error('Riposo fallito');
              service='Riposo fino alle 06:00';
            }else{service='Giornale del deposito';}
            if(UI.panel)UI.close();
            const x=s.player.x,y=s.player.y;
            if(!Game.save()||!Game.load()||Game.s.region!==room||Game.s.player.x!==x||Game.s.player.y!==y)
              throw Error('Salvataggio interno non ripristinato');
            return {room,kind,service,walking};
          },id);
          if(seed===seeds[0])await picture(page,'interno-'+visit.kind,null,735,out);
          await page.evaluate(door=>{
            __filoniWalk(UrbanWorld.site(Game.s,'exit'));
            if(!Game.action('interact')||Game.s.region!=='city-calis')throw Error('Ritorno al porto fallito');
            const gate=UrbanWorld.site(Game.s,door),p=Game.s.player;
            if(Math.hypot(p.x-gate.x,p.y-gate.y)>1)throw Error('Uscita diversa dalla soglia');
          },id);
          results.visits.push({seed,door:id,...visit});
        }
        results.commissions.push(await page.evaluate(()=>{
          let s=Game.s;
          const desk=UrbanWorld.site(s,'cargo-board');
          __filoniWalk(desk);
          const gold=s.player.gold;
          if(!Game.command('daily',{op:'claim',id:'calis-freight'})||s.player.gold!==gold+16)
            throw Error('La consegna non è stata pagata al registro');
          if(!Game.load()||Game.command('daily',{op:'claim',id:'calis-freight'})||Game.s.player.gold!==gold+16)
            throw Error('Ricompensa ripetibile dopo il caricamento');
          s=Game.s;
          const exit=World.route(s.region,'dune-port',s.campaign.stage);
          __filoniWalk(exit);
          if(!Game.action('interact')||Game.s.region!=='dune-port')throw Error('Ritorno alla costa fallito');
          const warm=performance.now();
          if(!Game.action('interact')||Game.s.region!=='city-calis')throw Error('Rientro al porto fallito');
          __filoniFrame();
          const warmEntryMs=performance.now()-warm;
          __filoniRoute('city-filoni');
          if(Game.s.region!=='city-filoni'||UrbanWorld.sites(Game.s).length!==5)throw Error('Filoni assenti dalla stessa build');
          return {seed:s.seed,claimed:true,filoni:true,warmEntryMs};
        }));
      }finally{await run.context.close();}
    }
    results.after.warmEntryMs=results.commissions[0].warmEntryMs;
    assert.deepEqual(errors,[]);
    assert.equal(results.visits.length,12);
    fs.writeFileSync(path.join(out,'verifica-calis.json'),JSON.stringify(results,null,2)+'\n');
    console.log('OK: 12 visite, servizi, due pontili, tre commissioni senza doppia ricompensa, due salvataggi precedenti e viaggio ai Filoni.');
    console.log(JSON.stringify({before:results.before,after:results.after}));
  }finally{await edge.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
