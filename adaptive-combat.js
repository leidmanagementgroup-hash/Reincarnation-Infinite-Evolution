(() => {
  'use strict';
  const channels=['melee','projectile','field'];
  const adaptiveTypes=new Set(['boss','kharun','syrava','asterion','nadir','dungeon-heir','sentinel','crystalguard']);
  const responses={melee:'counter',projectile:'sidestep',field:'break-line'};
  const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
  const number=(n,max)=>Number.isFinite(n)&&n>=0&&n<=max;
  const neutral=()=>({channel:null,count:0,last:0,next:0,guard:0,encounters:0,responses:0});
  const create=()=>({schema:1,memory:{}});
  const key=(s,m)=>s.region+'|'+m.type+'|'+m.id;

  function restore(raw){
    if(raw===undefined)return create();
    if(!object(raw)||raw.schema!==1||!object(raw.memory)||Object.keys(raw.memory).length>280||
      !Object.entries(raw.memory).every(([id,m])=>{
        const [region,type,index,extra]=id.split('|');
        return extra===undefined&&Object.hasOwn(World.regions,region)&&adaptiveTypes.has(type)&&/^\d{1,3}$/.test(index)&&object(m)&&
          (m.channel===null||channels.includes(m.channel))&&Number.isInteger(m.count)&&number(m.count,8)&&
          ['next','last','guard','encounters','responses'].every(k=>number(m[k],1e10+100));
      }))return null;
    return raw;
  }
  function profile(s,m){
    if(!s.adaptive||!adaptiveTypes.has(m.type))return null;
    const id=key(s,m);
    return s.adaptive.memory[id]||(s.adaptive.memory[id]=neutral());
  }
  function encounter(s,m){
    const p=profile(s,m);
    if(!p)return;
    p.encounters=Math.min(1e10,p.encounters+1);
  }
  function seeHit(s,m,channel){
    if(!channels.includes(channel))return;
    const p=profile(s,m);
    if(!p)return;
    if(p.channel===channel&&s.time-p.last<7)p.count=Math.min(8,p.count+1);
    else{p.channel=channel;p.count=1;}
    p.last=s.time;
  }
  function damageFactor(s,m,channel){
    return channel==='melee'&&s.adaptive?.memory[key(s,m)]?.guard>s.time?.84:1;
  }
  function response(s,m,d){
    const p=s.adaptive?.memory[key(s,m)];
    const legendary=m.type==='nadir'||m.type==='dungeon-heir';
    const required=legendary?(p?.encounters>1?3:4):6;
    if(!p||p.count<required||s.time>p.last+7||s.time<p.next||d>(legendary?118:95))return null;
    if(p.channel==='melee'&&d>53)return null;
    p.count=0;p.next=s.time+(legendary?5.4:11);
    p.responses=Math.min(1e10,p.responses+1);
    return responses[p.channel];
  }
  function guard(s,m,seconds){
    const p=profile(s,m);
    if(p)p.guard=s.time+seconds;
  }
  function clearGuard(s,m){
    const p=s.adaptive?.memory[key(s,m)];
    if(p)p.guard=0;
  }
  // Secondi di guardia rimasti, per mostrarla a schermo (RPG Evolution, incremento 4); sola lettura.
  function guardLeft(s,m){const p=s.adaptive?.memory[key(s,m)];return p?Math.max(0,p.guard-s.time):0;}
  window.Adaptive={create,restore,encounter,seeHit,damageFactor,response,guard,clearGuard,guardLeft};
})();
