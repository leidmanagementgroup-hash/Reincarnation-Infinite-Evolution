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
    under:{dusk:'0,0,0',night:'12,16,34',depth:.34,under:true},
    // Cava delle Braci: crepuscolo di brace e notte rossastra; Fenditura Astrale: viola profondo.
    // Cripta delle Soglie: penombra calda e violacea di un sepolcro antico, rischiarata dai bracieri.
    crypt:{dusk:'0,0,0',night:'22,12,24',depth:.4,under:true},
    // Santuario della Marea Muta: penombra marina costante, come un sotterraneo.
    tide:{dusk:'0,0,0',night:'6,22,42',depth:.3,under:true},
    ember:{dusk:'240,120,70',night:'46,18,32',depth:.46},
    astral:{dusk:'190,120,210',night:'26,18,72',depth:.44}
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
  // ambient(regionId) → chiave dell'atmosfera mobile (particelle e nuvole) o null per lasciare quella generica.
  function provide(match,sources,sky,ambient){providers.push({match,sources,sky,ambient});}
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
    const {lights=[],windows=[],emissive=null}=p.sources(cam)||{};
    c.save();c.translate(-cam.x,-cam.y);
    if(emissive?.image&&strength>.03){
      // Superfici che emettono luce (lava, crepe, cristalli): riaccese sopra il velo notturno.
      const img=emissive.image,sx=Math.max(0,Math.floor(cam.x)),sy=Math.max(0,Math.floor(cam.y));
      const sw=Math.min(img.width-sx,Math.ceil(cam.w)+1),sh=Math.min(img.height-sy,Math.ceil(cam.h)+1);
      if(sw>0&&sh>0){c.globalCompositeOperation='screen';c.globalAlpha=Math.min(1,e.night*1.1+e.dusk*.45)*(emissive.alpha??1);c.drawImage(img,sx,sy,sw,sh,sx,sy,sw,sh);c.globalCompositeOperation='source-over';}
    }
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
  // Atmosfera mobile per bioma: particelle proprie e, di giorno all'aperto, ombre di nuvole che scorrono.
  // Restituisce false se la regione non ne ha una (resta quella generica di interface.js).
  const motes={
    ruin:{n:18,day:'#f6eab0',night:'#d9f58a',fly:true,speed:[4,-1]},
    pine:{n:14,day:'#c9b25a',night:null,speed:[3,7]},
    snow:{n:34,day:'#ffffff',night:'#e8f2ff',speed:[-5,11],flake:true},
    fae:{n:20,day:'#aee8d4',night:'#9ff0dd',fly:true,speed:[1,-4]},
    star:{n:22,day:'#e3c8ff',night:'#bfe9ff',twinkle:true,speed:[2,-2]},
    grass:{n:16,day:'#ead39a',night:'#f4c46c',fly:true,speed:[9,0]},
    root:{n:22,day:'#c9e6a6',night:'#d8f58a',fly:true,speed:[1,-2]},
    shore:{n:14,day:'#ffffff',night:'#cfe3ff',streak:true,speed:[16,1]},
    canyon:{n:16,day:'#e7c08f',night:'#c99a75',streak:true,speed:[18,2]},
    under:{n:12,day:'#9aa7ad',night:'#9aa7ad',speed:[0,3]},
    crypt:{n:18,day:'#e8c88a',night:'#e8c88a',twinkle:true,speed:[1,2]},
    tide:{n:22,day:'#9fe0d8',night:'#9fe0d8',twinkle:true,speed:[1,-6]}
  };
  const cloudImages=[];
  function cloud(i){
    if(cloudImages[i])return cloudImages[i];
    const image=canvas(176,96),g=image.getContext('2d');g.fillStyle='#16242c';
    let seed=4129+i*977;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let k=0;k<9;k++){
      const cx=30+rnd()*116,cy=26+rnd()*44,rx=18+rnd()*26,ry=10+rnd()*13;
      for(let j=-Math.round(ry);j<=ry;j++){const d=Math.floor(rx*Math.sqrt(Math.max(0,1-j*j/(ry*ry))));g.fillRect(Math.round(cx-d),Math.round(cy+j),2*d+1,1);}
    }
    return cloudImages[i]=image;
  }
  function ambient(c,cam,t,region,e){
    const p=find(region),key=p?.ambient?.(region),m=motes[key];
    if(!m)return false;
    if(e.calm||reduced())return true;
    const nightish=Math.min(1,e.night*1.6+e.dusk*.5),day=Math.max(0,1-e.night*2.2-e.dusk*1.4);
    c.save();
    if(key!=='under'&&day>.05&&e.width){
      // Ombre di nuvole in coordinate del mondo: scorrono piano verso est e si spengono al tramonto.
      c.globalAlpha=.075*day;
      for(let i=0;i<4;i++){
        const span=e.width+420,x=((i*397+t*(5+i*1.3))%span+span)%span-210,y=((i*233+e.height*.2)%(e.height+120))-60+Math.sin(t*.05+i)*20;
        if(x+176<cam.x||x>cam.x+cam.w||y+96<cam.y||y>cam.y+cam.h)continue;
        c.drawImage(cloud(i%3),Math.round(x-cam.x),Math.round(y-cam.y));
      }
    }
    const color=nightish>.5?m.night:m.day;
    if(color){
      const glowing=m.fly&&nightish>.5;
      if(glowing)c.globalCompositeOperation='screen';
      for(let i=0;i<m.n;i++){
        const x=((i*113+t*m.speed[0]+Math.sin(t*.7+i)*4-cam.x*.85)%cam.w+cam.w)%cam.w;
        const y=((i*71+t*m.speed[1]+Math.sin(t*.5+i*1.3)*5-cam.y*.85)%cam.h+cam.h)%cam.h;
        const pulse=Math.sin(t*1.4+i*1.7);
        if(m.twinkle||glowing){if(pulse<.1)continue;c.globalAlpha=(glowing?.85:.7)*pulse;}
        else c.globalAlpha=m.flake?.75:.55;
        c.fillStyle=color;
        if(m.streak){c.fillRect(x|0,y|0,3+(i%3),1);continue;}
        c.fillRect(x|0,y|0,1,1);
        if(m.flake&&i%4===0)c.fillRect((x|0)+1,y|0,1,1);
        if(m.twinkle&&pulse>.8){c.fillRect((x|0)-1,y|0,3,1);c.fillRect(x|0,(y|0)-1,1,3);}
        if(glowing){c.globalAlpha=.18*pulse;c.fillRect((x|0)-1,(y|0)-1,3,3);}
      }
    }
    c.restore();
    return true;
  }
  window.WorldLight={provide,sky,draw,ambient,budget,skies};
})();
