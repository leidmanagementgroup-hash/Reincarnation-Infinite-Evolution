/* Public adventurer registers and player-run halls. Assignments advance only through active play. */
(() => {
  'use strict';
  const ranks=['F','E','D','C','B','A','S'], thresholds=[0,24,52,96,155,228,315];
  const crests=['Sole','Torre','Foglia','Stella'];
  const types={
    hunt:{name:'Caccia alle creature',text:'Sconfiggi quattro creature nei dintorni del luogo d’iscrizione.',goal:4,xp:29,gold:21},
    gather:{name:'Materiali per la gilda',text:'Raccogli tre minerali dai giacimenti della regione.',goal:3,xp:26,gold:19},
    survey:{name:'Rilievo delle vie',text:'Attraversa un passaggio verso un’altra regione e torna a riferire.',goal:1,xp:23,gold:17},
    script:{name:'Lettura del patto',text:'Leggi un’iscrizione degli Ardel presso una Statua della Rinascita.',goal:1,xp:39,gold:28},
    escort:{name:'Scorta della carovana',text:'Accompagna il corriere dalla bacheca fino al primo passaggio locale.',goal:1,xp:36,gold:26},
    dungeon:{name:'Esplorazione della cripta',text:'Scendi nella Cripta delle Soglie ed esamina tre steli distinte con E.',goal:3,xp:54,gold:38}
  };
  const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),own=(o,k)=>Object.hasOwn(o,k);
  const int=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const create=()=>({joined:false,xp:0,active:null,completed:{},team:[],personal:null});
  const fails=text=>({ok:false,text});
  const succeeds=(text,data={})=>({ok:true,text,changed:true,...data});
  const panel={id:'guild'};
  const rank=xp=>ranks[thresholds.findLastIndex(v=>xp>=v)];
  const validMember=(s,id)=>{const n=Society.entry(s,id);return !!n?.adult&&n.enrolled;};
  const validName=t=>typeof t==='string'&&t.trim()===t&&t.length>=3&&t.length<=28&&!/[\u0000-\u001F]/.test(t);
  function restore(raw,s){
    if(raw===undefined)return create();
    if(!obj(raw)||typeof raw.joined!=='boolean'||!int(raw.xp,0,1e8)||!obj(raw.completed)||
      Object.keys(raw.completed).length>Object.keys(World.regions).length*Object.keys(types).length||!Object.entries(raw.completed).every(([key,time])=>{
        const [area,type,rest]=key.split('/');return !rest&&own(World.regions,area)&&own(types,type)&&Number.isFinite(time)&&time>=0&&time<=s.time;
      })||!Array.isArray(raw.team)||new Set(raw.team).size!==raw.team.length||raw.team.length>2||!raw.team.every(id=>validMember(s,id)))return null;
    if(raw.active!==null&&(!obj(raw.active)||!own(types,raw.active.type)||!own(World.regions,raw.active.region)||
      !int(raw.active.progress,0,types[raw.active.type].goal)))return null;
    const active=raw.active;
    if(active?.type==='dungeon'&&(!Array.isArray(active.marks)||new Set(active.marks).size!==active.marks.length||
      active.marks.length!==active.progress||!active.marks.every(i=>int(i,0,2))||active.region!=='ancient-valley'))return null;
    if(active?.type==='escort'){
      const e=active.escort,r=World.regions[active.region];
      const onMap=p=>obj(p)&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.y>=0&&p.x<=r.width&&p.y<=r.height;
      if(!r.settlement||!onMap(e)||!Number.isFinite(e.hp)||e.hp<=0||e.hp>90||
        !Array.isArray(e.trail)||e.trail.length>120||!e.trail.every(onMap))return null;
    }
    const g=raw.personal;
    if(g!==null){
      if(!obj(g)||!validName(g.name)||!crests.includes(g.crest)||!int(g.treasury,0,1e8)||
        !Array.isArray(g.halls)||g.halls.length<1||g.halls.length>5||!g.halls.every(h=>obj(h)&&s.build.structures.some(o=>o.id===h.id&&o.plan==='hall'&&World.regions[o.region].continent===h.continent))||
        new Set(g.halls.map(h=>h.continent)).size!==g.halls.length||!Array.isArray(g.members)||g.members.length>8||
        new Set(g.members).size!==g.members.length||!g.members.every(id=>validMember(s,id))||
        !Array.isArray(g.squads)||g.squads.length!==2||!g.squads.every(q=>Array.isArray(q)&&q.length<=2&&q.every(id=>g.members.includes(id)))||
        new Set(g.squads.flat()).size!==g.squads.flat().length)return null;
      if(g.assignment!==null&&(!obj(g.assignment)||!int(g.assignment.squad,0,1)||!own(types,g.assignment.type)))return null;
    }
    return raw;
  }
  function sites(s){
    if(!s.guild)return [];
    const town=World.regions[s.region]?.settlement;
    const local=town?{x:town.x+40,y:town.y+24}:s.region==='valley'?{x:327,y:595}:null;
    const out=local?[{kind:'guild',id:'board',point:local,range:26,text:'Registro degli avventurieri'}]:[];
    const a=s.guild.active;
    if(s.region==='ardel-crypt'&&a?.type==='dungeon')for(const [i,p] of World.regions[s.region].marks.entries()){
      if(!a.marks.includes(i))out.push({kind:'guild',id:'crypt-'+i,point:p,range:26,text:'Esamina la stele '+(i+1)});
    }
    for(const hall of s.build.structures.filter(o=>o.region===s.region&&o.plan==='hall')){
      out.push({kind:'guild',id:'hall-'+hall.id,point:{x:hall.x+28,y:hall.y+31},range:28,text:'Entra nella sede di gilda'});
    }
    return out;
  }
  const nearby=s=>sites(s).filter(site=>dist(s.player,site.point)<=site.range);
  function use(s,id){
    if(!nearby(s).some(x=>x.id===id))return fails('Avvicinati alla bacheca o alla stele.');
    if(id.startsWith('crypt-')){
      const a=s.guild.active;a.marks.push(Number(id.slice(6)));a.progress=a.marks.length;
      return succeeds('Stele esaminata · '+a.progress+'/'+types.dungeon.goal+(a.progress===3?' · Torna alla bacheca.':''));
    }
    return {ok:true,panel};
  }
  const eligible=(s,id)=>id==='escort'?!!World.regions[s.region].settlement:id!=='dungeon'||s.region==='ancient-valley';
  const escortDestination=a=>World.regions[a.region].points.gates[0];
  function view(s){
    const g=s.guild,near=nearby(s),board=near.some(site=>site.id==='board'),hall=near.find(site=>site.id.startsWith('hall-'));
    const npcs=Society.view(s).local.filter(a=>a.adult).concat(g.team.map(id=>Society.entry(s,id)).filter(Boolean));
    const candidates=[...new Map(npcs.map(n=>[n.id,n])).values()].map(n=>({id:n.id,name:n.name,race:n.race,
      enrolled:n.enrolled,profession:n.profession,career:n.career,trust:n.trust,team:g.team.includes(n.id)}));
    return {rank:rank(g.xp),ranks,crests,joined:g.joined,xp:g.xp,board,hall:hall?Number(hall.id.slice(5)):null,
      active:g.active?{...g.active,...types[g.active.type],source:World.regions[g.active.region].name,
        destination:g.active.type==='escort'?escortDestination(g.active).label:null}:null,
      jobs:Object.entries(types).filter(([id])=>eligible(s,id)).map(([id,t])=>({id,...t,available:g.completed[s.region+'/'+id]===undefined||s.time-g.completed[s.region+'/'+id]>=95})),
      candidates,personal:g.personal};
  }
  function command(s,d){
    if(!obj(d))return fails('Ordine di gilda non valido.');
    const g=s.guild,near=nearby(s),board=near.some(x=>x.id==='board'),hall=near.find(x=>x.id.startsWith('hall-'));
    if(d.op==='dismiss'&&g.team.includes(d.id)){g.team=g.team.filter(id=>id!==d.id);return succeeds('Compagno congedato.');}
    if(d.op==='abandon'&&g.active){g.active=null;if(g.personal)g.personal.assignment=null;return succeeds('Incarico abbandonato.');}
    if(!near.length)return fails('Raggiungi una bacheca o una sede di gilda.');
    if(d.op==='join'){
      if(!board||g.joined)return fails('Iscriviti a una bacheca pubblica.');
      g.joined=true;return succeeds('Iscrizione ufficiale · rango F.');
    }
    if(!g.joined)return fails('Iscriviti prima alla gilda a una bacheca pubblica.');
    if(d.op==='accept'){
      const mission=types[d.type];
      if(!board||!mission||!eligible(s,d.type)||g.active)return fails('Serve una bacheca pubblica e uno spazio per un incarico.');
      const last=g.completed[s.region+'/'+d.type];
      if(last!==undefined&&s.time-last<95)return fails('La bacheca sta preparando un nuovo incarico.');
      g.active={type:d.type,region:s.region,progress:0};
      if(d.type==='dungeon')g.active.marks=[];
      if(d.type==='escort'){const start=near.find(x=>x.id==='board').point;g.active.escort={...start,hp:90,trail:[]};}
      return succeeds('Incarico accettato · '+mission.name);
    }
    if(d.op==='claim'){
      if(!board||!g.active||g.active.region!==s.region||g.active.progress<types[g.active.type].goal)return fails('Completa l’incarico e torna alla bacheca che l’ha assegnato.');
      const t=types[g.active.type],before=rank(g.xp);
      g.completed[s.region+'/'+g.active.type]=s.time;
      const split=g.personal&&g.personal.assignment?.type===g.active.type?Math.floor(t.gold/3):0;
      s.player.gold+=t.gold-split;g.xp+=t.xp;
      if(split){g.personal.treasury+=split;g.personal.assignment=null;}
      for(const id of g.team)Society.train(s,id);
      g.active=null;return succeeds('Compenso riscattato · '+(t.gold-split)+' Scintille'+(rank(g.xp)!==before?' · Nuovo rango '+rank(g.xp):''),{xp:15});
    }
    if(d.op==='register'){
      if(!board||!Society.register(s,d.id))return fails('Serve un adulto del luogo che si fidi di te e accetti l’iscrizione.');
      return succeeds('Avventuriero iscritto nel registro pubblico.');
    }
    if(d.op==='recruit'){
      const a=Society.entry(s,d.id);
      if(!a?.adult||!a.enrolled||a.location?.region!==s.region||g.team.length>=2||g.team.includes(a.id))return fails('La squadra può includere fino a due avventurieri adulti iscritti e presenti.');
      g.team.push(a.id);return succeeds(a.name+' entra nella squadra.');
    }
    if(d.op==='found'){
      const name=typeof d.name==='string'?d.name.trim():'';
      if(g.personal||!hall||!validName(name)||!crests.includes(d.crest))return fails('Serve una sede costruita, un nome e uno stemma valido.');
      if(g.xp<52||s.player.gold<25)return fails('Servono rango D e 25 Scintille.');
      s.player.gold-=25;
      g.personal={name,crest:d.crest,halls:[{id:Number(hall.id.slice(5)),continent:World.regions[s.region].continent}],
        treasury:0,members:[],squads:[[],[]],assignment:null};
      return succeeds('Gilda fondata · '+name);
    }
    const charter=g.personal;
    if(!charter||!hall)return fails('Raggiungi una sede per gestire la tua gilda.');
    if(d.op==='branch'){
      const continent=World.regions[s.region].continent;
      if(charter.halls.some(h=>h.continent===continent)||charter.treasury<20)return fails('Serve un continente senza sede e 20 Scintille nel fondo.');
      charter.treasury-=20;charter.halls.push({id:Number(hall.id.slice(5)),continent});return succeeds('Sede distaccata registrata.');
    }
    if(!charter.halls.some(h=>h.id===Number(hall.id.slice(5))))return fails('Registra questa sede prima di gestirla.');
    if(d.op==='deposit'&&s.player.gold>=10){s.player.gold-=10;charter.treasury+=10;return succeeds('Versati 10 Scintille nel fondo.');}
    if(d.op==='withdraw'&&charter.treasury>=10){charter.treasury-=10;s.player.gold+=10;return succeeds('Prelevati 10 Scintille dal fondo.');}
    if(d.op==='enroll'){
      if(!g.team.includes(d.id)||!validMember(s,d.id)||charter.members.includes(d.id)||charter.members.length>=8)return fails('Puoi accogliere fino a otto avventurieri iscritti della squadra.');
      charter.members.push(d.id);return succeeds('Membro accolto nella gilda personale.');
    }
    if(d.op==='assignMember'){
      if(!int(d.squad,0,1)||!charter.members.includes(d.id)||charter.squads[d.squad].length>=2)return fails('La squadra selezionata è piena.');
      charter.squads=charter.squads.map(q=>q.filter(id=>id!==d.id));charter.squads[d.squad].push(d.id);
      return succeeds('Membro assegnato alla squadra '+(d.squad+1)+'.');
    }
    if(d.op==='assignMission'){
      if(!g.active||!int(d.squad,0,1)||!charter.squads[d.squad].length)return fails('Serve un incarico accettato e una squadra formata.');
      g.team=[...charter.squads[d.squad]];
      charter.assignment={type:g.active.type,squad:d.squad};
      return succeeds('Incarico assegnato alla squadra attiva. Parti con i compagni per completarlo.');
    }
    return fails('Operazione non disponibile. Controlla i fondi e i materiali.');
  }
  function record(s,event,amount,meta){
    const a=s.guild?.active;if(!a||a.progress>=types[a.type].goal)return;
    const include=a.type==='hunt'&&event==='kill'&&s.region===a.region||
      a.type==='gather'&&event==='mine'&&meta.kind==='ore'&&s.region===a.region||
      a.type==='survey'&&event==='visit'&&s.region!==a.region||
      a.type==='script'&&event==='inscription'&&typeof meta.statue==='string';
    if(include){a.progress=Math.min(types[a.type].goal,a.progress+Math.max(1,Math.floor(amount||1)));
      if(a.progress===types[a.type].goal)return 'Incarico completato. Riscuoti alla bacheca di partenza.';}
  }
  let stage=null;
  function companions(s){
    if(!stage||stage.state!==s||stage.region!==s.region)stage={state:s,region:s.region,people:new Map()};
    return s.guild.team.flatMap((id,i)=>{
      const a=Society.entry(s,id);
      if(!a?.adult||!a.enrolled)return [];
      let c=stage.people.get(id);
      if(!c){
        const spell=['elf','spirit','slime','dryad','vampire'].includes(a.race);
        c={id,race:a.race,x:s.player.x-i*10,y:s.player.y+9,attack:spell?8:10,
          maxHp:55+Math.min(45,(a.career||0)*2),cd:0,spell,dir:'down',moving:false};
        c.hp=c.maxHp;stage.people.set(id,c);
      }
      return [c];
    });
  }
  function tick(s,dt,combat){
    for(const [i,c] of companions(s).entries()){
      const gap=dist(c,s.player),target=combat.target(c.x,c.y,c.spell?92:56);
      if(gap>174){c.x=s.player.x;c.y=s.player.y+12;c.hp=Math.max(20,c.hp);}
      c.cd=Math.max(0,c.cd-dt);
      if(c.hp<=15||!target)c.hp=Math.min(c.maxHp,c.hp+dt*(target?3:8));
      const fighting=target&&c.hp>15&&gap<110;
      const goal=fighting?target:{x:s.player.x+(i===0?-16:18),y:s.player.y+16};
      const d=dist(c,goal),dx=(goal.x-c.x)/(d||1),dy=(goal.y-c.y)/(d||1);
      c.moving=false;
      if(d>(fighting?(c.spell?45:19):8)){
        c.dir=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';
        const x=c.x+dx*78*dt,y=c.y+dy*78*dt;
        if(combat.walk(x,c.y,5)){c.x=x;c.moving=true;}
        if(combat.walk(c.x,y,5)){c.y=y;c.moving=true;}
      }
      if(fighting&&d<(c.spell?62:28)&&c.cd===0){
        c.cd=c.spell?1.65:1.3;
        const career=Society.entry(s,c.id)?.career||0;
        if(combat.hit(target,c.attack+Math.min(7,Math.floor(career/3)),c.spell?'#a8cce8':'#f3d5a4')&&target.hp===0)Society.train(s,c.id);
        if(d<32)c.hp=Math.max(3,c.hp-9);
      }
    }
    const a=s.guild.active;
    if(a?.type!=='escort'||a.region!==s.region||a.progress)return;
    const e=a.escort,goal=escortDestination(a),last=e.trail.at(-1)||e;
    if(e.trail.length<120&&dist(last,s.player)>1.7)e.trail.push({x:s.player.x,y:s.player.y});
    while(e.trail.length&&dist(e,e.trail[0])<.8)e.trail.shift();
    const next=e.trail[0],d=next?dist(e,next):0;
    if(next&&(e.trail.length>1||dist(e,s.player)>16)){
      const step=Math.min(67*dt,d);
      const x=e.x+(next.x-e.x)/d*step,y=e.y+(next.y-e.y)/d*step;
      if(combat.walk(x,e.y,5))e.x=x;
      if(combat.walk(e.x,y,5))e.y=y;
    }
    if(s.monsters.some(m=>m.hp>0&&m.engaged&&dist(m,e)<22))e.hp-=dt*10;
    if(e.hp<=0){s.guild.active=null;return 'La carovana si è ritirata. Puoi ritentare dalla bacheca.';}
    if(dist(e,goal)<29&&dist(s.player,goal)<47){
      a.progress=1;
      return 'Carovana scortata. Torna alla bacheca per il compenso.';
    }
  }
  function actors(s,t){
    const members=companions(s).map(c=>({x:c.x,y:c.y,draw:ctx=>{
      ActorArt.draw(ctx,c.race,c.x,c.y,{t,dir:c.dir,moving:c.moving,attack:c.cd>1.16});
      ctx.fillStyle='#192e31';ctx.fillRect(c.x-7,c.y-26,14,3);
      ctx.fillStyle='#a0d4ad';ctx.fillRect(c.x-6,c.y-25,Math.max(1,12*c.hp/c.maxHp),1);
    }}));
    for(const board of sites(s).filter(x=>x.id==='board')){
      const {x,y}=board.point;
      members.push({x,y,draw:c=>{
        c.fillStyle='#594a40';c.fillRect(x-7,y-16,14,12);c.fillRect(x-4,y-5,2,6);c.fillRect(x+3,y-5,2,6);
        c.fillStyle='#c8a66f';c.fillRect(x-6,y-14,12,7);c.fillStyle='#ece0b8';c.fillRect(x-1,y-13,4,5);
      }});
    }
    const a=s.guild.active;
    if(a?.type==='escort'&&a.region===s.region&&!a.progress){
      const e=a.escort;
      members.push({x:e.x,y:e.y,draw:c=>{
        ActorArt.draw(c,'merchant',e.x,e.y,{t,moving:dist(e,s.player)>19&&dist(e,s.player)<115});
        c.fillStyle='#e8ba78';c.fillRect(e.x-6,e.y-24,12*e.hp/90,2);
      }});
    }
    return members;
  }
  window.Guild={create,restore,sites,use,command,view,record,tick,actors};
})();

