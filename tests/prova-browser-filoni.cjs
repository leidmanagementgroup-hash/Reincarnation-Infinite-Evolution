// Uso: node tests/prova-browser-filoni.cjs <nuovo.html> <prima.html> [cartella-risultati]
// PW_CORE punta a playwright-core, installato fuori dal progetto.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');

const [candidate, baseline, output = null] = process.argv.slice(2);
assert(candidate && baseline, 'Specificare la build nuova e quella precedente.');
if (output) fs.mkdirSync(output, { recursive: true });
const sha = content => crypto.createHash('sha256').update(content).digest('hex');
const init = () => {
  const actual = requestAnimationFrame.bind(window);
  let queue = [], time = 1000, ids = 0;
  window.requestAnimationFrame = callback => { queue.push(callback); return ++ids; };
  window.cancelAnimationFrame = () => {};
  window.__filoniFrame = (count = 1) => {
    for (let i = 0; i < count; i++) {
      time += 1000 / 60;
      const pending = queue;
      queue = [];
      for (const callback of pending) callback(time);
    }
  };
  window.__filoniRAF = actual;
  localStorage.setItem('lumora-guidance', 'off');
};

const helpers = () => {
  window.__filoniRoute = destination => {
    for (let i = 0; i < 9 && Game.s.region !== destination; i++) {
      const s = Game.s, gate = World.route(s.region, destination, s.campaign.stage);
      if (!gate) throw Error('Passaggio assente ' + s.region + ' verso ' + destination);
      Object.assign(s.player, { x: gate.x, y: gate.y });
      if (!Game.action('interact')) throw Error('Varco rifiutato ' + gate.id);
      __filoniFrame();
    }
    if (Game.s.region !== destination) throw Error('Regione finale errata');
  };
  window.__filoniTime = target => {
    const s = Game.s, now = Calendar.timestamp(s.calendar, s.time);
    const difference=target-now%1440;
    if(Math.abs(difference)>.5)s.calendar.offset += ((difference + 1440) % 1440);
  };
  window.__filoniWalk = goal => {
    const s = Game.s, radius = 6, origin = { x: s.player.x, y: s.player.y };
    const map = UrbanDistricts.create(s.region, s.seed);
    const legal = (x, y) => World.canWalk(x, y, radius);
    function clear(a, b) {
      const n = Math.max(1, Math.ceil(Math.hypot(a.x-b.x, a.y-b.y) / 2));
      for (let i = 0; i <= n; i++) {
        if (!legal(a.x + (b.x-a.x)*i/n, a.y + (b.y-a.y)*i/n)) return false;
      }
      return true;
    }
    function roomPath() {
      if (clear(origin, goal)) return [origin, goal];
      const size = 12, cols = Math.ceil(World.width / size), rows = Math.ceil(World.height / size);
      const point = i => ({x:(i % cols)*size, y:Math.floor(i / cols)*size});
      const parent = new Map(), queue = [];
      for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) {
        const entry = Math.round(origin.x/size)+x+(Math.round(origin.y/size)+y)*cols;
        if (entry >= 0 && entry < rows*cols && clear(origin,point(entry))) { queue.push(entry); parent.set(entry,-1); }
      }
      for (let n = 0; n < queue.length; n++) {
        const id = queue[n], p = point(id);
        if (Math.hypot(goal.x-p.x,goal.y-p.y)<44 && clear(p,goal)) {
          const route = [goal];
          for (let cur = id; cur >= 0; cur = parent.get(cur)) route.push(point(cur));
          return route.concat(origin).reverse();
        }
        for (const next of [id+1,id-1,id+cols,id-cols]) {
          if (next < 0 || next >= cols*rows || parent.has(next)) continue;
          const q=point(next);
          if (Math.abs(q.x-p.x)>size || !clear(p,q)) continue;
          queue.push(next); parent.set(next,id);
        }
      }
      return [];
    }
    const trail = map.path ? map.path(origin,goal,radius) : roomPath();
    if (trail.length < 2) throw Error('Meta non raggiungibile ' + JSON.stringify(goal));
    let marched = 0, checks = 0;
    for (const point of trail.slice(1)) {
      let clock = 0;
      while (clock++ < 1300) {
        const p=s.player,dx=point.x-p.x,dy=point.y-p.y,d=Math.hypot(dx,dy);
        if(d<1.6)break;
        Game.step(1/120,{x:dx/d,y:dy/d});checks++;
        if(!legal(p.x,p.y))throw Error('Camminata fuori collisione in '+s.region);
        marched+=Math.hypot(point.x-dx-p.x,point.y-dy-p.y);
      }
      if(clock>=1300)throw Error('Camminata bloccata in '+s.region+' '+JSON.stringify(point));
    }
    if(Math.hypot(goal.x-s.player.x,goal.y-s.player.y)>5)throw Error('Arrivo impreciso');
    return {checks,pixels:Math.round(marched)};
  };
};

async function open(browser, file, seed, errors) {
  const context = await browser.newContext({ offline:true, viewport:{ width:1280,height:720 } });
  await context.addInitScript(init);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  const filePath = path.resolve(file), expected = sha(fs.readFileSync(filePath));
  const response = await page.goto(pathToFileURL(filePath).href);
  assert.equal(sha(await response.body()),expected,'Edge deve aprire precisamente il file indicato');
  await page.evaluate(() => __filoniFrame(5));
  await page.click('#playBtn');
  await page.locator('#dialog button[data-do="resume"]').first().click();
  await page.evaluate(seed => {
    const roll=Math.random;let n=0;
    Math.random=()=>n++===0?seed/4294967296:.24;
    try { Game.newGame(); } finally { Math.random=roll; }
    __filoniFrame(3);
  },seed);
  await page.evaluate(helpers);
  return {context,page,sha256:expected,file:filePath};
}
async function picture(page, name, spot, time=735) {
  if(!output)return;
  await page.evaluate(([point,time]) => {
    if(UI.panel)UI.close();
    if(point)Object.assign(Game.s.player,point);
    __filoniTime(time);
    __filoniFrame(24);
  },[spot,time]);
  await page.screenshot({path:path.join(output,name+'.png')});
}
async function measure(page) {
  return page.evaluate(async () => {
    if(UI.panel)UI.close();
    const step=Game.step;
    Game.step=()=>{};
    try {
      __filoniFrame(24);
      const samples=[];
      for(let i=0;i<90;i++){
        await new Promise(resolve=>__filoniRAF(resolve));
        const start=performance.now();__filoniFrame();samples.push(performance.now()-start);
      }
      samples.sort((a,b)=>a-b);
      return {median:samples[45],p95:samples[85],max:samples.at(-1),framesOver33:samples.filter(ms=>ms>33).length};
    } finally { Game.step=step; }
  });
}

(async () => {
  const browser=await chromium.launch({channel:'msedge'}),errors=[];
  const results={browser:browser.version(),viewport:[1280,720],offline:true,walks:[]};
  try {
    const old=await open(browser,baseline,19425,errors);
    results.before={file:old.file,sha256:old.sha256};
    const oldSave=await old.page.evaluate(() => {
      __filoniRoute('frost-pass');__filoniTime(735);
      Object.assign(Game.s.player,{x:455,y:409});
      Inventory.add(Game.s,'ore',2n**61n+7n);
      return Game.exportSave();
    });
    await picture(old.page,'prima-borgo');
    const oldDistrict=await old.page.evaluate(() => Boolean(window.UrbanDistricts));
    const oldRooms=[];
    if(oldDistrict){
      await old.page.evaluate(()=>__filoniRoute(UrbanDistricts.id));
      await picture(old.page,'prima-piazzale',{x:462,y:416});results.before.frame=await measure(old.page);
      await picture(old.page,'prima-piazzale-notte',{x:462,y:416},1320);
      await picture(old.page,'prima-corte-dei-larici',{x:432,y:229});
      await picture(old.page,'prima-cortile-delle-botteghe',{x:433,y:548});
      const doors=await old.page.evaluate(()=>UrbanWorld.sites(Game.s).map(site=>site.to));
      assert.equal(doors.length,5);
      for(const room of doors){
        const saved=await old.page.evaluate(room=>{
          __filoniRoute(room);
          const role=UrbanDistricts.roomKind(room),service=UrbanWorld.site(Game.s,{inn:'inn-bed',shop:'shop',forge:'forge',house:'house-bed'}[role]);
          __filoniWalk(service);
          return {room,x:Game.s.player.x,y:Game.s.player.y,save:Game.exportSave()};
        },room);
        oldRooms.push(saved);
      }
    }else results.before.frame=await measure(old.page);
    await old.context.close();

    for(const seed of [19425,555,2024]){
      const run=await open(browser,candidate,seed,errors),{page}=run;
      try {
        if(seed===19425){
          results.importedRooms=[];
          for(const fixture of oldRooms){
            const imported=await page.evaluate(({room,x,y,save})=>{
              if(!Game.importSave(save))return false;
              return Game.s.region===room&&Game.s.player.x===x&&Game.s.player.y===y&&World.canWalk(x,y,6)&&Inventory.quantity(Game.s,'ore')===2n**61n+7n;
            },fixture);
            assert(imported,'Il salvataggio del prototipo deve aprirsi in '+fixture.room);
            results.importedRooms.push(fixture.room);
          }
          const imported=await page.evaluate(raw=>Game.importSave(raw)&&Game.s.region==='frost-pass'&&
            Game.s.player.x===455&&Game.s.player.y===409&&Inventory.quantity(Game.s,'ore')===2n**61n+7n,oldSave);
          assert(imported,'Il salvataggio precedente deve conservare punto e quantità');
          await picture(page,'dopo-borgo-storico',{x:455,y:409});
        }else await page.evaluate(()=>__filoniRoute('frost-pass'));
        const arrival=await page.evaluate(()=>{
          __filoniTime(735);
          const gate=World.route('frost-pass',UrbanDistricts.id,0);
          Object.assign(Game.s.player,{x:gate.x,y:gate.y});
          const start=performance.now(),entered=Game.action('interact');
          __filoniFrame();
          return {entered,ms:performance.now()-start,region:Game.s.region};
        });
        assert(arrival.entered && arrival.region==='city-filoni');
        if(seed===19425){
          results.after={file:run.file,sha256:run.sha256,coldEntryMs:arrival.ms};
          await picture(page,'dopo-piazzale',{x:462,y:416});results.after.frame=await measure(page);
          await picture(page,'dopo-piazzale-notte',{x:462,y:416},1320);
          await picture(page,'dopo-corte-dei-larici',{x:432,y:229});
          await picture(page,'dopo-cortile-delle-botteghe',{x:433,y:548});
        }
        const doors=await page.evaluate(()=>UrbanWorld.sites(Game.s).map(site=>site.id));
        assert.equal(doors.length,5);
        for(const door of doors){
          const record=await page.evaluate(id=>{
            const s=Game.s,entry=UrbanWorld.sites(s).find(site=>site.id===id);
            const outdoor=__filoniWalk(entry);
            if(!Game.action('interact')||s.region!==entry.to)throw Error('Porta non funzionante '+id);
            const room=s.region,kind=UrbanDistricts.roomKind(room),services={inn:'inn-bed',shop:'shop',forge:'forge',house:'house-bed'};
            const service=UrbanWorld.site(s,services[kind]);
            const indoor=__filoniWalk(service);
            if(!Game.action('interact'))throw Error('Servizio inattivo '+services[kind]);
            if(UI.panel)UI.close();
            if(kind==='shop'){
              __filoniTime(735);s.player.gold=200;
              const n=Inventory.quantity(s,'herb'),trade=Economy.command(s,{op:'buy',id:'herb',amount:'1'});
              if(!trade.ok||trade.event.meta.market!=='filoni'||Inventory.quantity(s,'herb')!==n+1n)throw Error(trade.text);
            }else if(kind==='forge'){
              __filoniTime(735);
              if(Inventory.quantity(s,'ore')<2n)Inventory.add(s,'ore',2);
              const result=Tradecraft.start(s,{kind:'smithing'});
              if(!result.ok)throw Error(result.text);
            }else if(kind==='inn'){
              __filoniTime(1320);
              if(!Game.command('sleep')||Calendar.view(s.calendar,s.time,s.region).minutes!==360)throw Error('Riposo non riuscito');
              if(UI.panel)UI.close();
            }
            const save=Game.exportSave(),x=s.player.x,y=s.player.y;
            if(!Game.save()||!Game.load()||Game.s.region!==room||Game.s.player.x!==x||Game.s.player.y!==y||!Game.importSave(save))throw Error('Salvataggio interno non ripristinato');
            return {room,kind,outdoor,indoor};
          },door);
          if(seed===19425)await picture(page,'interno-'+door.slice(5));
          const returned=await page.evaluate(id=>{
            const room=Game.s.region,back=UrbanWorld.site(Game.s,'exit');
            __filoniWalk(back);
            if(!Game.action('interact')||Game.s.region!=='city-filoni')throw Error('Uscita errata '+room);
            const original=UrbanWorld.sites(Game.s).find(site=>site.id===id);
            return Math.hypot(Game.s.player.x-original.x,Game.s.player.y-original.y)<=1;
          },door);
          assert(returned,'Ritorno dalla stessa soglia');
          results.walks.push({seed,door,...record});
          console.log('OK',seed,door,record.outdoor.pixels+' px fuori',record.indoor.pixels+' px all’interno');
        }
        const warm=await page.evaluate(()=>{
          const back=World.route('city-filoni','frost-pass',0);
          __filoniWalk(back);
          if(!Game.action('interact')||Game.s.region!=='frost-pass')throw Error('Ritorno al Passo fallito');
          const t0=performance.now();
          if(!Game.action('interact')||Game.s.region!=='city-filoni')throw Error('Rientro nel piazzale fallito');
          __filoniFrame();return performance.now()-t0;
        });
        if(seed===19425)results.after.warmEntryMs=warm;
      }finally{await run.context.close();}
    }
    assert.deepEqual(errors,[],'Errori JavaScript o risorse online');
    if(output)fs.writeFileSync(path.join(output,'verifica-build.json'),JSON.stringify(results,null,2));
    console.log('OK: 15 visite, riposo, commercio, forgiatura, salvataggi e collegamento al Passo.');
    console.log(JSON.stringify({before:results.before,after:results.after}));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
