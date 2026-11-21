/* Luce del mondo aperto (World Art Overhaul): tinte di crepuscolo e notte per continente, finestre accese e aloni di
   lanterne, fuochi e cristalli fuori da Velaris. I moduli del mondo registrano le sorgenti visibili della propria
   regione; interface.js chiama WorldLight.draw dopo la tinta notturna. Velaris e gli interni hanno la propria luce. */
(() => {
  'use strict';
  const providers=[];
  const budget=8;
  // Tinte per tavolozza o regione: crepuscolo, notte e profondità della notte (alfa massimo del velo).
  const skies={
    // Regioni senza fornitore (Cava, Fenditura, Santuario): stessi valori di prima del World Art Overhaul.
    base:{dusk:'223,127,74',night:'19,27,81',depth:.34},
    valley:{dusk:'223,127,74',night:'20,30,80',depth:.48},
    ruin:{dusk:'223,127,74',night:'20,30,80',depth:.48},
    pine:{dusk:'214,136,96',night:'14,32,68',depth:.5},
    snow:{dusk:'222,150,124',night:'24,44,92',depth:.42},
    fae:{dusk:'210,134,98',night:'12,40,62',depth:.5},
    star:{dusk:'206,122,152',night:'34,22,82',depth:.5},
    grass:{dusk:'238,138,72',night:'34,26,66',depth:.48},
    root:{dusk:'204,140,88',night:'8,34,42',depth:.52},
    shore:{dusk:'232,150,100',night:'18,36,74',depth:.46},
    canyon:{dusk:'238,128,72',night:'42,24,62',depth:.48},
    under:{dusk:'0,0,0',night:'12,16,34',depth:.34,under:true}
  };
  const tones={
    lamp:{pool:['rgba(255,182,86,.40)','rgba(248,160,69,.22)','rgba(212,101,43,0)'],core:['rgba(255,200,104,.5)','rgba(255,166,73,.2)','rgba(255,138,53,0)']},
    fire:{pool:['rgba(255,150,70,.42)','rgba(236,104,48,.22)','rgba(190,60,30,0)'],core:['rgba(255,190,110,.52)','rgba(245,130,60,.2)','rgba(220,90,40,0)']},
    crystal:{pool:['rgba(126,238,226,.32)','rgba(96,206,214,.16)','rgba(70,160,205,0)'],core:['rgba(190,255,245,.5)','rgba(120,230,230,.2)','rgba(90,190,230,0)']},
    spirit:{pool:['rgba(196,170,255,.30)','rgba(150,130,240,.15)','rgba(110,90,210,0)'],core:['rgba(230,210,255,.45)','rgba(180,160,255,.18)','rgba(140,120,230,0)']}
  };
  const sprites={};
  let motion;
  function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function glow(kind){
    if(sprites[kind])return sprites[kind];
    const tone=tones[kind]||tones.lamp,image=canvas(88,62),g=image.getContext('2d');
    g.save();g.translate(44,33);g.scale(1,.49);
    const pool=g.createRadialGradient(0,0,0,0,0,43);
    pool.addColorStop(0,tone.pool[0]);pool.addColorStop(.36,tone.pool[1]);pool.addColorStop(1,tone.pool[2]);
    g.fillStyle=pool;g.fillRect(-44,-44,88,88);g.restore();
    const core=g.createRadialGradient(44,14,0,44,14,14);
    core.addColorStop(0,tone.core[0]);core.addColorStop(.3,tone.core[1]);core.addColorStop(1,tone.core[2]);
    g.fillStyle=core;g.fillRect(30,0,28,28);
    return sprites[kind]=image;
  }
  function reduced(){
    try{if(motion===undefined)motion=window.matchMedia?.('(prefers-reduced-motion: reduce)')||null;}catch{motion=null;}
    return !!motion?.matches;
  }
  // match(regionId) → vero se il fornitore descrive la regione; sources(cam) → {lights:[{x,y,kind,core}], windows:[{x,y,w,h,seed}]}.
  function provide(match,sources,sky){providers.push({match,sources,sky});}
  function find(region){return providers.find(p=>p.match(region));}
  function sky(region){
    const p=find(region),key=p?.sky?.(region);
    return skies[key]||(p&&skies[region])||skies.base;
  }
  // e: {night, dusk, minutes, calm}. Il contesto non è traslato: la camera arriva in coordinate del mondo.
  function draw(c,cam,t,region,e){
    const p=find(region);
    if(!p)return 0;
    const strength=Math.min(1,e.night*1.8+e.dusk*.3),wStrength=Math.min(1,e.night*2+e.dusk*.7);
    if(strength<.03&&wStrength<.05)return 0;
    const calm=e.calm||reduced();
    const {lights=[],windows=[]}=p.sources(cam)||{};
    c.save();c.translate(-cam.x,-cam.y);
    if(wStrength>.05){
      // Finestre accese: più numerose la sera, poche nel cuore della notte; decise dalla posizione, non dal caso.
      const m=e.minutes??1200,share=m>=1000&&m<1400?.85:(m>=1400||m<300)?.35:.6;
      for(const w of windows){
        if(((w.seed*37)%100)/100>=share)continue;
        c.globalAlpha=.16*wStrength;c.fillStyle='#ffaa55';c.fillRect(w.x-2,w.y-2,w.w+4,w.h+5);
        c.globalAlpha=.78*wStrength;c.fillStyle='#ffd882';c.fillRect(w.x,w.y,w.w,w.h);
        c.globalAlpha=.5*wStrength;c.fillStyle='#fff1c4';c.fillRect(w.x,w.y,w.w,1);
      }
    }
    const cx=cam.x+cam.w/2,cy=cam.y+cam.h/2;
    // Prima lanterne e fuochi (priorità 0), poi monumenti e cristalli; a pari priorità i più vicini al centro.
    const near=lights.filter(o=>o.x+44>=cam.x&&o.x-44<=cam.x+cam.w&&o.y+30>=cam.y&&o.y-40<=cam.y+cam.h)
      .sort((a,b)=>(a.p||0)-(b.p||0)||(a.x-cx)**2+(a.y-cy)**2-((b.x-cx)**2+(b.y-cy)**2));
    let used=0;
    c.globalCompositeOperation='screen';
    for(const o of near){
      const kind=o.kind||'lamp';
      const base=kind==='crystal'||kind==='spirit'?(strength>.06?.25+.6*strength:0):strength;
      if(base<.03)continue;
      if(used<budget){
        const pulse=calm?1:kind==='fire'?.86+.14*Math.sin(t*5+o.x):kind==='crystal'||kind==='spirit'?.84+.16*Math.sin(t*1.6+o.x*.37):.96+.04*Math.sin(t*2+o.x);
        c.globalAlpha=Math.min(1,base*pulse);
        c.drawImage(glow(kind),Math.round(o.x-44),Math.round(o.y-(o.lift??14)));
        used++;
      }
      if(o.core){c.globalAlpha=Math.min(1,base);c.fillStyle=o.core[4]||'#ffdf94';c.fillRect(o.core[0],o.core[1],o.core[2],o.core[3]);}
    }
    c.restore();
    return used;
  }
  window.WorldLight={provide,sky,draw,budget,skies};
})();
