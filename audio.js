(() => {
  const storageKey = "lumora-audio-v1";
  let enabled = true, volume = .55, ctx, master, beat = 0, nextTime = 0, timer;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved) { enabled = !!saved.enabled; volume = Math.max(0, Math.min(1, Number(saved.volume) || 0)); }
  } catch {}
  const melody = [76,0,0,79,78,0,74,0, 71,0,74,76,0,0,0,0, 74,0,0,78,81,0,79,0, 76,0,74,71,0,0,0,0,
    72,0,76,0,79,0,83,0, 81,0,0,79,76,0,74,0, 71,0,74,78,76,0,71,0, 69,0,71,0,0,0,0,0];
  const bass = [52,55,50,47,48,53,52,47];
  const quarryTheme = [64,0,67,0,62,64,0,0, 65,0,62,60,59,0,0,0];
  const riftTheme = [76,0,83,86,0,81,0,83, 79,0,88,0,83,78,0,0];
  const active = () => enabled && !!ctx && ctx.state === 'running';
  function persist() { try {localStorage.setItem(storageKey, JSON.stringify({enabled,volume}));} catch {} }
  function tone(note, start, duration, strength, type = 'sine', fall = 0) {
    const osc = ctx.createOscillator(), env = ctx.createGain();
    osc.type = type; const freq = 440 * 2 ** ((note - 69) / 12);
    osc.frequency.setValueAtTime(freq,start);
    if (fall) osc.frequency.exponentialRampToValueAtTime(freq * fall, start+duration);
    env.gain.setValueAtTime(.0001, start); env.gain.exponentialRampToValueAtTime(strength, start+.016);
    env.gain.exponentialRampToValueAtTime(.0001, start+duration);
    osc.connect(env); env.connect(master); osc.start(start); osc.stop(start+duration+.02);
    osc.onended = () => {osc.disconnect(); env.disconnect();};
  }
  function schedule() {
    if (!active() || document.hidden) return;
    nextTime = Math.max(ctx.currentTime+.015, nextTime);
    const visible = !document.getElementById('playScreen').hidden;
    const region=visible?window.Game?.s?.region:'valley';
    const danger = visible && window.Game?.view({detailed:false})?.boss;
    const length = danger ? .215 : .315;
    while (nextTime < ctx.currentTime+.23) {
      const k = beat % 64, root = bass[Math.floor(k/8)]+(region==='quarry'?-2:region==='rift'?5:0);
      if (k % 8 === 0) {
        tone(root-12,nextTime,length*7,.15,'sine');
        tone(root+7,nextTime+.05,length*6,.055,'sine');
      }
      if (k % 2 === 0) tone(root+[0,7,12,7][(k>>1)%4],nextTime+.03,length*2.5,.048,'triangle');
      const note=region==='quarry'?quarryTheme[k%16]:region==='rift'?riftTheme[k%16]:melody[k];
      if (note) {
        tone(note-(danger?12:0),nextTime,region==='rift'?1.27:.92,.075,'triangle');
        tone(note+12,nextTime+.12,.68,region==='rift'?.023:.014);
      }
      if (danger && k%2===1) tone(40,nextTime,.12,.13,'triangle',.65);
      nextTime +=length; beat++;
    }
  }
  function wake() {
    if(!enabled) return;
    try {
      if(!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = volume*.45; master.connect(ctx.destination);
        timer = setInterval(schedule,110);
      }
      if (ctx.state === 'suspended') ctx.resume().catch(()=>{});
      master.gain.setTargetAtTime(volume*.45,ctx.currentTime,.03);
    } catch {}
  }
  const effects = {attack:[65,53],swing:[67,58],hit:[47,36],hurt:[46,39],dash:[76,86],skill:[72,79,86],heal:[71,76,83],potion:[72,76,84],loot:[83,90],gather:[84,88],kill:[62,74],level:[71,74,78,83],evolve:[64,71,76,83,88],boss:[45,52,55],victory:[64,71,76,79,83],ui:[75],interact:[71,78],coin:[90,95],death:[56,52,47]};
  function play(id) {
    if (!active()) return;
    const notes=effects[id] || effects.ui;
    notes.forEach((n,i)=>tone(n,ctx.currentTime+.005+i*.065,.19+i*.06,.09,'triangle'));
  }
  document.addEventListener('visibilitychange',()=>{if (document.hidden && ctx) ctx.suspend().catch(()=>{});else if (ctx && enabled) wake();});
  window.Score = {wake,play,get enabled(){return enabled;},get volume(){return volume;},get started(){return !!ctx;},
    toggle(){ enabled=ctx? !enabled : true; if(enabled)wake();else if(ctx){master.gain.setTargetAtTime(.0001,ctx.currentTime,.02);ctx.suspend().catch(()=>{});} persist();return enabled;},
    setVolume(v){volume=Math.max(0,Math.min(1,v));if (enabled)wake();persist();}
  };
})();
