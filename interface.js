(() => {
  const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
  const field=$('#field'), ctx=field.getContext('2d',{alpha:false});
  const keyState=new Set(), taped=new Map(), cam={x:0,y:0,w:0,h:0};
  const dirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
  const bindings={KeyJ:'attack',Space:'dash',Digit1:'skill1',Digit2:'skill2',Digit3:'skill3',KeyR:'innate',KeyQ:'potion',KeyE:'interact'};
  const panels={KeyC:'character',KeyI:'inventory',KeyK:'skills',KeyV:'evolution',KeyB:'bestiary',KeyM:'map',KeyL:'journal',KeyH:'help',KeyU:'activities',KeyT:'properties',KeyG:'guild',KeyO:'society',KeyN:'living'};
  const symbols={
    spark:['12,2 14,8 20,11 14,13 12,21 10,14 4,11 10,9 12,2','18,3 18,6','16.5,4.5 19.5,4.5'],
    arrow:['4,12 19,12','13,6 19,12 13,18'],book:['2,5 7,4 12,7 17,4 22,5 22,19 17,18 12,21 7,18 2,19 2,5','12,7 12,21'],
    settings:['4,6 20,6','4,12 20,12','4,18 20,18','8,4 8,8','16,10 16,14','10,16 10,20'],
    full:['3,9 3,3 9,3','15,3 21,3 21,9','21,15 21,21 15,21','9,21 3,21 3,15'],
    sound:['3,9 7,9 12,5 12,19 7,15 3,15 3,9','15,8 17,10 17,14 15,16','18,5 21,9 21,15 18,19'],
    mute:['2,9 6,9 11,5 11,19 6,15 2,15 2,9','16,9 21,15','21,9 16,15'],
    close:['5,5 19,19','19,5 5,19'],pause:['8,4 8,20','16,4 16,20'],
    bag:['5,9 8,7 7,3 17,3 16,7 19,9 21,16 18,21 6,21 3,16 5,9','7,8 17,8','10,13 14,13'],
    crest:['12,1 13.5,6 17,9 12,16 7,9 10.5,6 12,1','5,6 3,9 4,14 9,18 12,22 15,18 20,14 21,9 19,6','2,13 3,18 8,20','22,13 21,18 16,20','12,5 12,11']
  };
  let screen='title',panel=null,prevFocus,prevLoc='',clock=0,uiClock=0,prev=0,toastTimer,zoneTimer,renderEffects=true,guidance=true;
  let running=false,practiceHold=null,practiceCleanup=null;
  const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  try {renderEffects=localStorage.getItem('lumora-effects')!=='off';guidance=localStorage.getItem('lumora-guidance')!=='off';} catch {}
  function paintSymbols(root=document) {
    root.querySelectorAll('[data-symbol]').forEach(el=>{
      const id=el.dataset.symbol;if(el.firstChild?.dataset?.drawn===id)return;
      const c=document.createElement('canvas');c.width=48;c.height=48;c.dataset.drawn=id;
      const g=c.getContext('2d');g.scale(2,2);g.strokeStyle=getComputedStyle(el).color;g.lineWidth=id==='crest'?1.2:1.55;g.lineCap='square';g.lineJoin='miter';
      for(const path of symbols[id]||[]){g.beginPath();path.split(' ').forEach((coord,i)=>{const [x,y]=coord.split(',').map(Number);i?g.lineTo(x,y):g.moveTo(x,y);});g.stroke();}
      el.replaceChildren(c);
    });
    root.querySelectorAll('canvas[data-art]').forEach(c=>{
      const g=c.getContext('2d'),w=c.width;
      g.clearRect(0,0,w,c.height);g.imageSmoothingEnabled=false;
      if(c.dataset.art==='portrait')ActorArt.portrait(g,c.dataset.kind,0,0,w,{evolution:Number(c.dataset.evo||0)});
      else ActorArt.icon(g,c.dataset.kind,0,0,w);
    });
  }
  function toast(txt) {if (!txt) return;const el=$('#toast');el.textContent=txt;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2600);}
  function updateAudioIcon(){
    const on=Score.enabled && Score.started;
    $$('[data-do=audio]').forEach(b=>{const i=b.querySelector('i');if(i){i.dataset.symbol=on?'sound':'mute';paintSymbols(b);}b.setAttribute('aria-label',on?'Disattiva audio':'Attiva audio');b.title=on?'Disattiva audio':'Attiva audio';});
  }
  function title(){screen='title';closePanel();$('#titleScreen').hidden=false;$('#playScreen').hidden=true;prevLoc='';refreshTitle();paintSymbols();$('#playBtn').focus({preventScroll:true});}
  function refreshTitle(){const has=Game.hasSave(),b=$('#playBtn');b.dataset.do=has?'continue':'new';b.querySelector('span').textContent=has?'Continua il viaggio':'Nuova incarnazione';$('#otherPlay').hidden=!has;}
  function start(newLife) {
    const ok=newLife?Game.newGame():Game.load();
    if(ok===false){toast(newLife?'La nuova vita non è ancora disponibile.':'Caricamento non riuscito. Puoi importare una copia dalle opzioni.');return;}
    screen='play';$('#titleScreen').hidden=true;$('#playScreen').hidden=false;prevLoc='';uiClock=0;cam.x=NaN;
    observedStage=Game.s.player.evolutionStage;evolutionNotice=-1;trackedStatue=null;trackedSite=null;cancelPlacement();
    closePanel();syncHud();field.focus({preventScroll:true});
    if(newLife)openPanel('birth');
  }
  function clearInput(){keyState.clear();taped.clear();}
  let panelDetail=null;
  let placement=null;
  function cancelPlacement(){placement=null;$('#placementBar').hidden=true;field.classList.remove('placing');}
  function placementPoint(clientX,clientY){
    if(!Number.isFinite(clientX)||!Number.isFinite(clientY))return {x:Game.s.player.x+18,y:Game.s.player.y+9};
    const r=field.getBoundingClientRect();
    return {x:Math.round(cam.x)+(clientX-r.left)/r.width*cam.w,y:Math.round(cam.y)+(clientY-r.top)/r.height*cam.h};
  }
  function place(clientX,clientY){
    if(!placement)return;
    const point=placementPoint(clientX,clientY);
    if(Game.command('build',{op:'place',plan:placement.plan,id:placement.id,...point}))cancelPlacement();
  }
  function openPanel(name,detail=null,refresh=false){
    if(panel==='practice'&&name!=='practice')Game.cancelPractice();
    practiceCleanup?.();practiceCleanup=null;practiceHold=null;running=false;
    if(!refresh && !panel)prevFocus=document.activeElement;
    if(!refresh){$('#panelBody').scrollTop=0;clearInput();}
    if(!refresh||detail!==null)panelDetail=detail;
    panel=name;$('#veil').hidden=false;
    window.GamePanels.render(name,panelDetail);
    if(name==='practice')practiceCleanup=PracticePanel.bind($('#panelBody'),input=>{
      if(Object.hasOwn(input,'hold'))practiceHold=input.hold;
      if(input.action)PracticePanel.update($('#panelBody'),Game.practice(0,input));
    });
    paintSymbols($('#dialog'));
    if(!refresh)$('#xPanel').focus({preventScroll:true});
  }
  function closePanel(){
    if(panel==='practice')Game.cancelPractice();
    practiceCleanup?.();practiceCleanup=null;practiceHold=null;running=false;
    panel=null;$('#veil').hidden=true;clearInput();
    if(screen==='play' && !$('#playScreen').hidden)field.focus({preventScroll:true});
    else if(prevFocus?.isConnected && !prevFocus.closest('[hidden]'))prevFocus.focus({preventScroll:true});
  }
  function save(manual=false){if(!Game.s||screen!=='play')return false;const ok=Game.save();if(manual)toast(ok?'Partita salvata.':'Salvataggio locale non disponibile. Esporta una copia.');return ok;}
  function dispatch(id,el){
    if(id!=='audio')Score.wake();updateAudioIcon();
    switch(id){
      case 'new':Game.hasSave()?openPanel('confirmNew'):start(true);break;
      case 'confirmNew':start(true);break;
      case 'continue':start(false);break;
      case 'close':case 'resume':closePanel();break;
      case 'audio':Score.toggle();updateAudioIcon();if(panel==='settings')openPanel(panel,null,true);break;
      case 'full':if(document.fullscreenElement)document.exitFullscreen().catch(()=>toast('Schermo intero non disponibile.'));else if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>toast('Schermo intero non disponibile.'));else toast('Schermo intero non disponibile.');break;
      case 'save':save(true);break;
      case 'title':if(save(false))title();else{toast('Esporta una copia prima di tornare al titolo.');openPanel('settings');}break;
      case 'effects':renderEffects=!renderEffects;try{localStorage.setItem('lumora-effects',renderEffects?'on':'off');}catch{}openPanel('settings',null,true);break;
      case 'guidance':guidance=!guidance;try{localStorage.setItem('lumora-guidance',guidance?'on':'off');}catch{}syncHud();openPanel(panel==='help'?'help':'settings',null,true);break;
      case 'export':{
        if(!Game.s){toast('Inizia o carica una partita prima di esportarla.');break;}
        const blob=new Blob([Game.exportSave()],{type:'application/json'}),url=URL.createObjectURL(blob);
        const a=document.createElement('a');a.href=url;a.download='Reincarnation-Lumora.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),4000);break;
      }
      case 'import':$('#saveFile').value='';$('#saveFile').click();break;
      case 'confirmImport':{if(Game.importSave(window.GamePanels.pendingSave)){window.GamePanels.pendingSave=null;start(false);toast('Partita importata.');}else toast('Il file non contiene un salvataggio compatibile.');break;}
      case 'trackStatue':{
        trackedSite=null;
        trackedStatue=World.continents.find(c=>c.statue.id===el?.dataset.value)?.statue||null;
        closePanel();syncHud();if(trackedStatue)toast('Meta sulla mappa · '+trackedStatue.name);break;
      }
      case 'trackSite':{
        const id=el?.dataset.value;
        const site=[...Tradecraft.sites(Game.s),...Daily.sites(Game.s),...Economy.sites(Game.s),...Legendary.sites(Game.s),...UrbanWorld.sites(Game.s)].find(it=>it.id===id)||UrbanWorld.site(Game.s,id);
        if(!site)break;
        trackedStatue=null;trackedSite={...site.point,region:World.region,name:site.name||site.text};
        closePanel();syncHud();toast('Meta sulla mappa · '+trackedSite.name);break;
      }
      case 'trackDistrict':{
        const point=UrbanWorld.exterior(Game.s.seed).districts.find(d=>d.id===el?.dataset.value);
        if(!point)break;
        trackedStatue=null;trackedSite={x:point.x,y:point.y,region:UrbanWorld.cityId,name:point.name};
        closePanel();syncHud();toast('Meta sulla mappa · '+point.name);break;
      }
      case 'trackCity':{
        const city=World.regions[UrbanWorld.cityId];
        trackedStatue=null;trackedSite={...city.spawn,region:city.id,name:city.name};
        closePanel();syncHud();toast('Meta sulla mappa · '+city.name);break;
      }
      case 'trackLegendary':{
        const dungeon=Legendary.view(Game.s);
        if(!dungeon.discovered)break;
        trackedStatue=null;trackedSite={...dungeon.entrance,name:dungeon.name};
        closePanel();syncHud();toast('Meta sulla mappa · '+trackedSite.name);break;
      }
      case 'clearTrack':trackedStatue=null;trackedSite=null;closePanel();syncHud();break;
      case 'placeBuild':{
        const [plan,id]=el.dataset.value.split(':');
        placement={plan,id:id?Number(id):undefined,region:World.region};
        $('#placementBar').hidden=false;field.classList.add('placing');closePanel();break;
      }
      case 'cancelPlacement':cancelPlacement();break;
      default:openPanel(id,el?.dataset.value||null);
    }
  }
  function command(cmd,raw){
    let value=raw;
    if(cmd==='slot'){const [slot,id]=raw.split('|');value={slot:Number(slot),id};}
    if(['build','society','guild','workshop','daily','practice','economy','weave','gear','conflict','legendary','urban','city-service'].includes(cmd)){try{value=JSON.parse(raw);}catch{return;}}
    const old=panel;
    const done=cmd==='drink'?Game.action('potion'):Game.command(cmd,value);
    if(done!==false && old==='confirmDemolish'){openPanel('properties');return;}
    if(done!==false && ['accept','reward','sideReward'].includes(cmd) && panel===old){closePanel();return;}
    if(panel===old && panel&&panel!=='practice'){
      const filters=panel==='inventory'?Object.fromEntries($$('[data-inventory-filter]').map(el=>[el.name,el.value])):null;
      openPanel(panel,null,true);
      if(filters){
        for(const el of $$('[data-inventory-filter]'))if(Object.hasOwn(filters,el.name))el.value=filters[el.name];
        LifePanels.filter($('#panelBody'),Game.s);
      }
    }
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b || b.disabled)return;
    if(b.hasAttribute('data-do'))dispatch(b.dataset.do,b);
    else if(b.dataset.cmd){Score.wake();command(b.dataset.cmd,b.dataset.value);}
    else if(b.dataset.action && screen==='play' && !panel){Score.wake();Game.action(b.dataset.action);}
  });
  $('#saveFile').addEventListener('change',async e=>{
    const f=e.target.files[0];if(!f)return;if(f.size>Game.saveMaxBytes){toast('Il file supera la dimensione di un salvataggio.');return;}
    try{const v=await f.text();JSON.parse(v);window.GamePanels.pendingSave=v;openPanel('confirmImport');}catch{toast('File illeggibile. Seleziona un salvataggio JSON.');}
  });
  document.addEventListener('input',e=>{if(e.target.id==='audioVolume'){Score.setVolume(Number(e.target.value)/100);$('#volVal').textContent=e.target.value+'%';updateAudioIcon();}});
  document.addEventListener('submit',e=>{
    const form=e.target.dataset?.form;
    if(['practice','economy','weave'].includes(form)){
      e.preventDefault();
      const data=Object.fromEntries(new FormData(e.target));
      command(form,JSON.stringify(data));
    }else if(e.target.id==='charterForm'){
      e.preventDefault();
      command('guild',JSON.stringify({op:'found',name:e.target.elements.guildName.value,crest:e.target.elements.crest.value}));
    }else if(e.target.id==='districtForm'){
      e.preventDefault();
      command('build',JSON.stringify({op:'foundDistrict',name:e.target.elements.districtName.value}));
    }
  });
  for(const event of ['input','change'])document.addEventListener(event,e=>{
    if(e.target.matches('#catalogSearch,#catalogRarity'))window.GamePanels.filterCatalog();
    if(e.target.matches('[data-inventory-filter]'))LifePanels.filter($('#panelBody'),Game.s);
  });
  document.addEventListener('keydown',e=>{
    if(e.altKey||e.ctrlKey||e.metaKey)return;
    if(panel){
      if(e.code==='Escape'){e.preventDefault();closePanel();return;}
      if(e.code==='Tab'){const items=$$('#dialog button:not(:disabled),#dialog select,#dialog input').filter(el=>el.offsetParent!==null),i=items.indexOf(document.activeElement);if(items.length && ((e.shiftKey && i<=0)||(!e.shiftKey && i===items.length-1))){e.preventDefault();items[e.shiftKey?items.length-1:0].focus();}}
      return;
    }
    if(screen==='title'){
      if(['ArrowUp','ArrowDown','KeyW','KeyS'].includes(e.code)){e.preventDefault();const btns=$$('.titleNav button:not([hidden])'),i=btns.indexOf(document.activeElement),sign=e.code==='ArrowUp'||e.code==='KeyW'?-1:1;btns[(i<0?0:(i+sign+btns.length)%btns.length)].focus();}
      if(e.code==='Enter' && !document.activeElement.closest('button')){e.preventDefault();$('#playBtn').click();}return;
    }
    if(e.target.closest('button') && e.code==='Enter')return;
    if(placement){
      if(e.code==='Escape'){e.preventDefault();cancelPlacement();return;}
      if(e.code==='Enter'){e.preventDefault();place(placement.clientX,placement.clientY);return;}
      if(bindings[e.code]){e.preventDefault();return;}
    }
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(e.code))e.preventDefault();
    keyState.add(e.code);if(e.repeat)return;
    if(bindings[e.code]){e.preventDefault();Score.wake();Game.action(bindings[e.code]);}
    else if(panels[e.code])openPanel(panels[e.code]);
    else if(['Escape','KeyP','Tab'].includes(e.code)){e.preventDefault();openPanel('pause');}
  });
  document.addEventListener('keyup',e=>keyState.delete(e.code));
  document.addEventListener('pointerdown',e=>{
    const b=e.target.closest('[data-dir]');if(b){e.preventDefault();b.setPointerCapture(e.pointerId);taped.set(e.pointerId,b.dataset.dir);}
    if(e.target===field && screen==='play'&&!panel){
      e.preventDefault();field.focus();Score.wake();
      if(placement){if(e.button===0)place(e.clientX,e.clientY);return;}
      if(e.button===0){keyState.add('Mouse');Game.action('attack');}
    }
  });
  field.addEventListener('pointermove',e=>{if(placement){placement.clientX=e.clientX;placement.clientY=e.clientY;}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(event,e=>{taped.delete(e.pointerId);keyState.delete('Mouse');});
  window.addEventListener('blur',()=>{clearInput();practiceHold=null;running=false;if(screen==='play'&&!panel)openPanel('pause');});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();practiceHold=null;running=false;if(screen==='play'){save();if(!panel)openPanel('pause');}}});
  window.addEventListener('pagehide',()=>save());
  const hot=[['attack','J','attack','Attacco'],['dash','SPAZIO','dodge','Schivata'],['skill1','1','skill',''],['skill2','2','ward',''],['skill3','3','heal',''],['innate','R','core','Abilità innata'],['potion','Q','potion','Pozione']];
  function dimField(){
    const w=field.clientWidth,h=field.clientHeight;if(!w||!h)return;
    const scale=Math.max(1.25,Math.min(3.6,Math.max(w/635,h/375))), nw=Math.round(w/scale),nh=Math.round(h/scale);
    if(field.width!==nw||field.height!==nh){field.width=nw;field.height=nh;ctx.imageSmoothingEnabled=false;}
    cam.w=nw;cam.h=nh;
  }
  let avatarSig='',barSig='',observedStage=0,evolutionNotice=-1,trackedStatue=null,trackedSite=null,cityTrail=null;
  function urbanWaypoint(goal){
    const s=Game.s,distance=q=>Math.hypot(q.x-s.player.x,q.y-s.player.y);
    if(distance(goal)<=16)return goal;
    if(cityTrail?.goal!==goal||cityTrail.state!==s||cityTrail.at+1.25<s.time&&cityTrail.points[cityTrail.index]&&distance(cityTrail.points[cityTrail.index])>200){
      cityTrail={goal,state:s,at:s.time,index:0,points:UrbanWorld.exterior(s.seed).path(s.player,goal,6)||[]};
    }
    while(cityTrail.index<cityTrail.points.length&&distance(cityTrail.points[cityTrail.index])<13)cityTrail.index++;
    return cityTrail.points[cityTrail.index]||goal;
  }
  function navigationTarget(v){
    const goal=trackedStatue||trackedSite;
    if(!goal)return v.objective.target;
    if(trackedSite&&goal.region===UrbanWorld.cityId&&World.region===UrbanWorld.cityId)return urbanWaypoint(goal);
    return goal.region===World.region?goal:World.route(World.region,goal.region,v.campaignStage);
  }
  function appearance(p){return p.form===null?0:p.form+1+(p.evolutionStage===2?2:0);}
  function routeInfo(p,target){
    if(!target)return null;
    const x=target.x-p.x,y=target.y-p.y,dist=Math.hypot(x,y);
    const sector=(Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8;
    return {x,y,dist,angle:sector*45,direction:['est','sud-est','sud','sud-ovest','ovest','nord-ovest','nord','nord-est'][sector],steps:Math.round(dist/6)};
  }
  function syncHud(){
    if(screen!=='play'||!Game.s)return;const p=Game.s.player,v=Game.view({detailed:false});
    $('#formName').textContent=v.formName;$('#level').textContent='LV. '+p.level;
    for(const [key,max] of [['hp',v.hpMax],['mp',v.mpMax]]){const el=$('.bar.'+key);el.firstElementChild.style.width=100*Math.max(0,Math.min(1,p[key]/max))+'%';el.lastElementChild.textContent=Math.ceil(p[key])+' / '+max;}
    $('.xp i').style.width=Math.min(100,100*p.xp/v.xpNext)+'%';
    const sig=p.race+'|'+appearance(p);if(sig!==avatarSig){const c=$('#avatar canvas'),g=c.getContext('2d');g.clearRect(0,0,56,56);ActorArt.portrait(g,p.race,0,0,56,{evolution:appearance(p)});avatarSig=sig;}
    $('#location').textContent=v.location;$('#clock').textContent=v.clock+' · '+v.calendar.dayOfSeason+' '+v.calendar.season+' · '+v.weather;
    $('#questChapter').textContent=v.campaignTitle&&v.campaignTitle!==v.objective.title?v.campaignTitle:'Missione principale';
    $('#questTitle').textContent=v.objective.title;$('#questText').textContent=v.objective.text;
    const route=$('#questRoute'),way=routeInfo(p,navigationTarget(v));
    route.hidden=!way||!guidance;
    if(way){
      route.firstElementChild.textContent=way.dist<24?'◆':'➜';
      route.firstElementChild.style.transform='rotate('+(way.dist<24?0:way.angle)+'deg)';
      route.lastElementChild.textContent=(trackedStatue||trackedSite?'Meta · ':'')+(way.dist<24?'Obiettivo vicino':way.steps+' passi · '+way.direction);
    }
    const ie=$('#interaction');ie.hidden=!v.interact;ie.querySelector('span').textContent=v.interact||'';
    if(p.evolutionStage>observedStage)evolutionNotice=Game.s.time+5;
    observedStage=p.evolutionStage;
    $('#evoAlert').hidden=Game.s.time>evolutionNotice;
    $('#evoAlert').textContent='Nuova forma · V';
    const bh=$('#bossHud');bh.hidden=!v.boss;
    if(v.boss){
      bh.querySelector('strong').textContent=v.boss.name;
      bh.querySelector('i').style.width=Math.max(0,v.boss.hp/v.boss.maxHp*100)+'%';
      bh.querySelector('span').textContent='FASE '+(['','I','II','III'][v.boss.phase]||v.boss.phase)+' / '+(v.boss.maxPhase===3?'III':'II');
      bh.dataset.phase=String(v.boss.phase);
    }
    const innate=v.growth?.innate,ms=p.slots.join('/')+':'+p.potions+':'+(innate?.name||'')+':'+p.race;
    const skillFor=i=>i>=2&&i<=4?Game.activeSkill(p,p.slots[i-2]):hot[i][0]==='innate'?innate:null;
    if(ms!==barSig){const wrap=$('#hotbar');wrap.replaceChildren();hot.forEach(([id,key,icon,lab],i)=>{
      const def=skillFor(i),b=document.createElement('button');b.dataset.action=id;
      if(def){icon=def.icon||icon;lab=def.name;}b.title=lab+' ('+key+')';b.setAttribute('aria-label',b.title);
      b.innerHTML='<canvas width="32" height="32"></canvas><i class="cool"></i><small></small>';
      ActorArt.icon(b.querySelector('canvas').getContext('2d'),icon,0,0,32);b.querySelector('small').textContent=key+(id==='potion'?' ×'+p.potions:'');wrap.append(b);
    });barSig=ms;}
    hot.forEach(([id],i)=>{const skill=skillFor(i),timer=id==='innate'?'innate':skill?.id||id;const cd=v.cooldowns?.[id]??p.cooldowns?.[timer]??0;const total=skill?.cooldown||(id==='dash'?1.5:id==='attack'?.42:1);$('#hotbar').children[i].querySelector('.cool').style.height=Math.min(100,Math.max(0,cd/total*100))+'%';});
    const mini=$('#mini'),mg=mini.getContext('2d');World.drawMap(mg,mini.width,mini.height,p);
    const target=navigationTarget(v);
    if(target){
      const x=Math.round(target.x/World.width*mini.width),y=Math.round(target.y/World.height*mini.height);
      mg.save();mg.strokeStyle='#ffe095';mg.lineWidth=1.4;mg.beginPath();
      mg.moveTo(x,y-4);mg.lineTo(x+3,y);mg.lineTo(x,y+4);mg.lineTo(x-3,y);mg.closePath();mg.stroke();mg.restore();
    }
    if(v.location!==prevLoc){prevLoc=v.location;const b=$('#zoneBanner');b.textContent=v.location;b.classList.remove('show');void b.offsetWidth;b.classList.add('show');clearTimeout(zoneTimer);zoneTimer=setTimeout(()=>b.classList.remove('show'),2700);}
  }
  function atmosphere(t,v){
    if(UrbanWorld.kind(v.region))return;
    const hourParts=v.clock.split(':').map(Number),hour=hourParts[0]+hourParts[1]/60;
    const {minutes,sunriseMinutes,sunsetMinutes}=v.calendar,day=minutes>=sunriseMinutes&&minutes<=sunsetMinutes;
    const daylight=sunsetMinutes-sunriseMinutes;
    const light=day?Math.sin((minutes-sunriseMinutes)*Math.PI/daylight):-Math.sin(((minutes-sunsetMinutes+1440)%1440)*Math.PI/(1440-daylight));
    const dusk=Math.max(0,1-Math.abs(light)*3.5),night=Math.max(0,-light);
    // Tinte per continente e luci locali (World Art Overhaul); i sotterranei hanno una penombra costante.
    const sky=WorldLight.sky(v.region),under=!!sky.under;
    if(!under&&dusk>.01){ctx.fillStyle='rgba('+sky.dusk+','+(.13*dusk)+')';ctx.fillRect(0,0,cam.w,cam.h);}
    if(under||night>.01){ctx.fillStyle='rgba('+sky.night+','+(sky.depth*(under?1:night))+')';ctx.fillRect(0,0,cam.w,cam.h);}
    WorldLight.draw(ctx,{x:Math.round(cam.x),y:Math.round(cam.y),w:cam.w,h:cam.h},t,v.region,{night:under?1:night,dusk:under?0:dusk,minutes,calm:!renderEffects});
    // Con la riduzione del movimento del sistema le particelle si fermano come con gli effetti ridotti (da Codex).
    if(!renderEffects||reducedMotion?.matches)return;
    if(v.region==='quarry'||v.region==='rift'){
      const quarry=v.region==='quarry';
      for(let i=0;i<24;i++){
        const x=((i*113+t*(quarry?7:3)+Math.sin(t*.7+i)*11-cam.x*.63)%cam.w+cam.w)%cam.w;
        const y=((i*77-t*(quarry?12:4)-cam.y*.48)%cam.h+cam.h)%cam.h;
        if(Math.sin(i+t*1.3)<-.22)continue;
        ctx.fillStyle=quarry?(i%2?'#f0b36083':'#f2dab359'):(i%2?'#b3a5ffae':'#9cf5ed92');
        ctx.fillRect(x|0,y|0,1,1);
        if(!quarry&&i%6===0){ctx.fillRect((x|0)-1,y|0,3,1);ctx.fillRect(x|0,(y|0)-1,1,3);}
      }
      return;
    }
    // Nei sotterranei (Cripta, Santuario) non piove e non nevica.
    if(!under&&['rain','storm','snow'].includes(v.calendar.weatherKind)){
      const snow=v.calendar.weatherKind==='snow';
      ctx.fillStyle=snow?'#eaf6ff85':'#c0e5f16d';
      for(let i=0;i<(snow?42:68);i++){const x=((i*73-t*(snow?12:39)-cam.x*.3)%cam.w+cam.w)%cam.w,y=((i*83+t*(snow?29:130)-cam.y*.5)%cam.h+cam.h)%cam.h;ctx.fillRect(x|0,y|0,1,snow?1:4);}
    }
    else if(!WorldLight.ambient(ctx,{x:Math.round(cam.x),y:Math.round(cam.y),w:cam.w,h:cam.h},t,v.region,{night:under?1:night,dusk:under?0:dusk,width:World.width,height:World.height})){ctx.fillStyle=hour>17||hour<6?'#f4e9a9b5':'#ffefad99';for(let i=0;i<16;i++){const x=((i*113+t*3+Math.sin(t+i)*3-cam.x*.8)%cam.w+cam.w)%cam.w,y=((i*77+Math.sin(t*.4+i)*6-cam.y*.8)%cam.h+cam.h)%cam.h;if(Math.sin(i+t*.8)>.1)ctx.fillRect(x|0,y|0,1,1);}}
  }
  function paintObjective(view,p,c){
    const target=navigationTarget(view);
    if(!guidance||view.boss||!target)return;
    const w=routeInfo(p,target),x=target.x-c.x,y=target.y-c.y;
    if(w.dist<=25)return;
    const margin=24,top=Math.min(95,c.h*.31),bottom=c.h-43;
    const sx=Math.max(margin,Math.min(c.w-margin,x)),sy=Math.max(top,Math.min(bottom,y));
    const inside=sx===x&&sy===y;
    ctx.save();ctx.translate(Math.round(sx),Math.round(inside?sy-29+Math.sin(clock*3)*2:sy));
    if(inside){
      ctx.rotate(Math.PI*.25);ctx.fillStyle='#172b29';ctx.fillRect(-5,-5,10,10);
      ctx.strokeStyle='#ffe59a';ctx.lineWidth=1.3;ctx.strokeRect(-3.5,-3.5,7,7);
    }else{
      ctx.rotate(Math.atan2(w.y,w.x));ctx.lineWidth=2;ctx.lineJoin='round';
      ctx.beginPath();ctx.moveTo(-5,-5);ctx.lineTo(5,0);ctx.lineTo(-5,5);ctx.closePath();
      ctx.strokeStyle='#172b29';ctx.stroke();ctx.fillStyle='#ffe59a';ctx.fill();
    }
    ctx.restore();
  }
  function frame(ts){
    const elapsed=Math.max(0,(ts-prev)/1000),dt=Math.min(.05,elapsed);prev=ts;requestAnimationFrame(frame);
    if(screen!=='play'||!Game.s||document.hidden)return;dimField();
    if(placement?.region!==World.region&&placement)cancelPlacement();
    if(!panel){let x=Number(keyState.has('KeyD')||keyState.has('ArrowRight'))-Number(keyState.has('KeyA')||keyState.has('ArrowLeft')),y=Number(keyState.has('KeyS')||keyState.has('ArrowDown'))-Number(keyState.has('KeyW')||keyState.has('ArrowUp'));for(const d of taped.values()){x+=dirs[d][0];y+=dirs[d][1];}
      const activeElapsed=running?elapsed:dt;running=true;
      Game.step(dt,{x,y,attack:keyState.has('KeyJ')||keyState.has('Mouse')},activeElapsed);clock+=dt;
    }else if(panel==='practice'){
      PracticePanel.update($('#panelBody'),Game.practice(dt,{hold:practiceHold}));
    }
    const p=Game.s.player,px=Math.max(0,Math.min(World.width-cam.w,p.x-cam.w*.5)),py=Math.max(0,Math.min(World.height-cam.h,p.y-cam.h*.52));
    if(!Number.isFinite(cam.x)||cam.region!==World.region||Math.abs(cam.x-px)>cam.w*.9||Math.abs(cam.y-py)>cam.h*.9){cam.x=px;cam.y=py;cam.region=World.region;}else{const a=1-Math.exp(-12*dt);cam.x+=(px-cam.x)*a;cam.y+=(py-cam.y)*a;}
    const c={...cam,x:Math.round(cam.x),y:Math.round(cam.y)};
    ctx.save();ctx.translate(-c.x,-c.y);World.drawGround(ctx,c,clock);World.drawFront(ctx,c,clock,Game.actors(clock));ctx.restore();
    // Atmosfera e luci prima degli avvisi di combattimento: aree di pericolo e colpi restano leggibili di notte (da Codex).
    const v=Game.view({detailed:false});atmosphere(clock,v);
    ctx.save();ctx.translate(-c.x,-c.y);Game.drawFX(ctx,clock);
    if(placement&&!panel){const point=placementPoint(placement.clientX,placement.clientY);Build.preview(ctx,Game.s,placement.plan,point.x,point.y,placement.id);}
    ctx.restore();
    paintObjective(v,p,c);
    uiClock-=dt;if(uiClock<=0){syncHud();uiClock=.14;}
  }
  Game.onEvent=(type,data)=>{
    if(type==='toast')toast(data);
    else if(type==='sound')Score.play(data);
    else if(type==='panel'&&screen==='play'){
      if(data?.id==='statue'&&data.detail===trackedStatue?.id)trackedStatue=null;
      if(trackedSite&&trackedSite.region===World.region&&['workshop','economy','living','legendary','gear','city-site','guild'].includes(typeof data==='string'?data:data?.id)&&routeInfo(Game.s.player,trackedSite).dist<=40)trackedSite=null;
      if(typeof data==='string')openPanel(data);else if(data?.id)openPanel(data.id,data.detail??null);
    }else if(type==='change')uiClock=0;
  };
  for(let i=0;i<24;i++){const b=document.createElement('b');b.className='mote';const size=i%5===0?3:2;b.style.cssText='left:'+((i*47.3+13)%100)+'%;top:'+((i*17.7+22)%95)+'%;width:'+size+'px;height:'+size+'px;--dur:'+(4+i%7)+'s;--delay:-'+(i*1.7)+'s';$('#motes').append(b);}
  window.UI={get screen(){return screen;},get panel(){return panel;},get effects(){return renderEffects;},get guidance(){return guidance;},get trackedStatue(){return trackedStatue;},get trackedSite(){return trackedSite;},open:openPanel,close:closePanel,toast,paint:paintSymbols,appearance,routeInfo};
  const featuresStyle=document.createElement('style');
  featuresStyle.textContent=[PracticePanel.css,LifePanels.css,EconomyPanel.css,window.ConflictPanel?.css].filter(Boolean).join('\n');
  document.head.append(featuresStyle);
  refreshTitle();paintSymbols();updateAudioIcon();requestAnimationFrame(frame);
})();
