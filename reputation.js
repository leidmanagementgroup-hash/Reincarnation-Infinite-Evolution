(() => {
  'use strict';
  const factions={cartographers:'Compagnia dei Cartografi',lanterns:'Custodi delle Lanterne'};
  const titles={
    vela:{name:'Luce di Vela',description:'Hai restituito il seme di Orveth al borgo.'},
    rift:{name:'Custode del Varco',description:'Hai riportato a Vela i tre frammenti e chiuso il Varco.'},
    hunter:{name:'Nome sussurrato nei sotterranei',description:'Hai sconfitto il sovrano originale di un dungeon leggendario.'},
    sovereign:{name:'Sovrano del Sottosuolo',description:'Hai rivendicato il governo di un dungeon leggendario.'},
    healer:{name:'Mani della Cura',description:'Hai salvato tre persone in condizioni critiche.'},
    ranger:{name:'Viandante delle Cinque Terre',description:'Hai raggiunto tutti e cinque i continenti.'}
  };
  const clamp=x=>Math.max(-100,Math.min(100,x));
  const own=(o,key)=>Object.hasOwn(o,key);
  const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
  const reputationEvents=new Set(['visit','trade','kill','guild-claim','guild-found','guild-branch','quest-claim','campaign-vela','campaign-rift','legendary-kill','sovereign','npcRescue','npc-neglect']);
  const create=()=>({schema:1,standings:{},titles:[],medics:0,visited:[],daily:{}});
  const continentOf=id=>World.regions[id]?.continent;
  const townOf=region=>region==='valley'?'Borgo di Vela':World.regions[region]?.settlement?.name;

  function validKey(key){
    const [type,id,extra]=key.split(':');
    if(extra!==undefined||!id)return false;
    if(type==='town')return !!townOf(id);
    if(type==='realm')return World.continents.some(c=>c.id===id);
    if(type==='faction')return own(factions,id);
    return type==='guild'&&['public','personal'].includes(id);
  }
  function restore(raw,s){
    if(raw===undefined){
      const result=create(),origin=continentOf(s.region);
      if(origin)result.visited.push(origin);
      if(s.quest===4){
        result.standings['town:valley']=Math.min(100,s.player.rep);
        result.titles.push('vela');
      }
      if(s.campaign.completed)result.titles.push('rift');
      if(s.guild?.joined)result.standings['guild:public']=Math.min(100,Math.floor(s.guild.xp/4));
      return result;
    }
    if(!object(raw)||raw.schema!==1||!object(raw.standings)||!Object.entries(raw.standings).every(([key,n])=>validKey(key)&&Number.isInteger(n)&&Math.abs(n)<=100)||
      !Array.isArray(raw.titles)||new Set(raw.titles).size!==raw.titles.length||!raw.titles.every(id=>own(titles,id))||
      !Array.isArray(raw.visited)||new Set(raw.visited).size!==raw.visited.length||!raw.visited.every(id=>World.continents.some(c=>c.id===id))||
      !Number.isInteger(raw.medics)||raw.medics<0||raw.medics>3||!object(raw.daily)||
      !Object.entries(raw.daily).every(([key,n])=>/^[a-z-]+$/.test(key)&&['trade','kill','help'].includes(key)&&Number.isInteger(n.day)&&n.day>=0&&n.day<1e12&&Number.isInteger(n.count)&&n.count>=0&&n.count<=4))return null;
    return raw;
  }
  function update(data,id,n){
    if(validKey(id))data.standings[id]=clamp((data.standings[id]||0)+n);
  }
  function record(s,event,meta={}){
    const r=s.reputation;
    if(!r||!reputationEvents.has(event))return [];
    const region=meta.region||s.region,continent=continentOf(region),town='town:'+region,realm='realm:'+continent,notes=[];
    const title=id=>{
      if(!r.titles.includes(id)){r.titles.push(id);notes.push('Titolo ottenuto · '+titles[id].name);}
    };
    const cap=(key,limit)=>{
      const day=Calendar.absoluteDays(s.calendar,s.time);
      if(r.daily[key]?.day!==day)r.daily[key]={day,count:0};
      if(r.daily[key].count>=limit)return false;
      r.daily[key].count++;
      return true;
    };
    switch(event){
      case 'visit':
        if(continent&&!r.visited.includes(continent)){
          r.visited.push(continent);update(r,realm,2);update(r,'faction:cartographers',4);
          if(r.visited.length===World.continents.length)title('ranger');
        }
        break;
      case 'trade':
        if(cap('trade',4))update(r,town,1);
        break;
      case 'kill':
        if(cap('kill',3))update(r,realm,1);
        break;
      case 'guild-claim':update(r,'guild:public',4);update(r,town,2);break;
      case 'guild-found':update(r,'guild:personal',7);break;
      case 'guild-branch':update(r,'guild:personal',5);update(r,realm,3);break;
      case 'quest-claim':update(r,'faction:lanterns',2);update(r,town,1);break;
      case 'campaign-vela':update(r,'town:valley',12);update(r,'faction:lanterns',8);title('vela');break;
      case 'campaign-rift':update(r,'town:valley',12);update(r,realm,9);title('rift');break;
      case 'legendary-kill':update(r,'faction:cartographers',10);update(r,realm,8);title('hunter');break;
      case 'sovereign':update(r,'faction:cartographers',5);title('sovereign');break;
      case 'npcRescue':
        if(cap('help',3)){
          update(r,town,meta.critical?5:2);update(r,realm,2);
          if(meta.critical)r.medics=Math.min(3,r.medics+1);
        }
        if(r.medics===3)title('healer');
        break;
      case 'npc-neglect':update(r,town,-1);break;
    }
    return notes;
  }
  function view(s){
    const r=s.reputation;
    const rank=n=>n>=35?'Onorato':n>=12?'Stimato':n>=1?'Benvoluto':n===0?'Sconosciuto':n>=-15?'Diffidato':'Ostile';
    const entry=(type,id,name)=>{const score=r.standings[type+':'+id]||0;return {name,score,rank:rank(score)};};
    return {
      towns:Object.keys(World.regions).filter(townOf).map(id=>entry('town',id,townOf(id))),
      realms:World.continents.map(c=>entry('realm',c.id,c.name)),
      guilds:[entry('guild','public','Gilda degli Avventurieri'),...(s.guild?.personal?[entry('guild','personal',s.guild.personal.name)]:[])],
      factions:Object.entries(factions).map(([id,name])=>entry('faction',id,name)),
      titles:r.titles.map(id=>titles[id])
    };
  }
  const discount=(s,region)=>Math.max(-2,Math.min(2,Math.trunc((s.reputation?.standings['town:'+region]||0)/15)));
  window.Reputation={create,restore,record,view,discount};
})();
