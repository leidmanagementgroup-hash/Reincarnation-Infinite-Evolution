/* Construction on designated land in the new regions, kept separately from terrain. */
(() => {
  'use strict';
  const grid=12, colours=['#876150','#587a7b','#718459','#655e83'];
  const plans={
    house:{name:'Casa',w:48,h:36,wood:2,ore:2,gold:8},
    farm:{name:'Fattoria',w:48,h:36,wood:2,ore:1,gold:4},
    lab:{name:'Laboratorio',w:48,h:36,wood:2,ore:3,gold:9},
    shop:{name:'Bottega',w:36,h:36,wood:2,ore:1,gold:7},
    hall:{name:'Sede di gilda',w:60,h:36,wood:4,ore:4,gold:16},
    wall:{name:'Muro',w:24,h:12,wood:0,ore:2,gold:0},
    bridge:{name:'Ponte',w:48,h:24,wood:3,ore:1,gold:0},
    keep:{name:'Castello',w:72,h:48,wood:5,ore:8,gold:32}
  };
  const owns=(o,k)=>Object.hasOwn(o,k), dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
  const integer=(x,a,b)=>Number.isInteger(x)&&x>=a&&x<=b;
  const fail=text=>({ok:false,text});
  const done=(text,event=false)=>({ok:true,text,changed:true,event:event?{id:'build',amount:1.5}:undefined,xp:event?11:0});
  const create=()=>({seq:1,structures:[],districts:{}});
  function get(s,id){return s.build.structures.find(o=>o.id===id);}
  function rect(o){const p=plans[o.plan];return {...o,w:p.w+(o.level>1&&o.plan!=='bridge'&&o.plan!=='wall'?12:0),h:p.h};}
  const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  const centre=w=>({x:w.x+w.w/2,y:w.y+w.h/2});
  const zoneFor=region=>World.regions[region]?.buildZone;
  const inside=(a,b)=>a.x>=b.x&&a.y>=b.y&&a.x+a.w<=b.x+b.w&&a.y+a.h<=b.y+b.h;
  function validateLayout(o,structures){
    const zone=zoneFor(o.region);
    if(!zone)return 'Qui non c’è un lotto edificabile.';
    const r=rect(o);
    if(!inside(r,zone))return 'Rimani entro i confini del lotto.';
    const channel=zone.x+144,spans=r.x<=channel-12&&r.x+r.w>=channel+12;
    if(o.plan==='bridge'&&!spans)return 'Il ponte deve congiungere le due sponde del canale.';
    if(o.plan!=='bridge'&&r.x<channel+9&&r.x+r.w>channel-9)return 'Lascia libero il canale.';
    if(structures.some(x=>x.id!==o.id&&x.region===o.region&&overlap(r,rect(x))))return 'Questo spazio è già occupato.';
    return '';
  }
  function restore(raw){
    if(raw===undefined)return create();
    if(!obj(raw)||!integer(raw.seq,1,1e8)||!Array.isArray(raw.structures)||raw.structures.length>140)return null;
    if(!raw.structures.every(o=>obj(o)&&integer(o.id,1,raw.seq-1)&&owns(plans,o.plan)&&zoneFor(o.region)&&
      integer(o.x,0,2000)&&integer(o.y,0,2000)&&integer(o.color,0,colours.length-1)&&
      integer(o.level,1,2)&&integer(o.furniture,0,3)&&Number.isFinite(o.readyAt)&&o.readyAt>=0&&o.readyAt<1e11&&
      (o.plan==='farm'||o.readyAt===0)))return null;
    if(new Set(raw.structures.map(o=>o.id)).size!==raw.structures.length||
      raw.structures.some(o=>validateLayout(o,raw.structures)))return null;
    const districts=raw.districts||{};
    if(!obj(districts)||!Object.entries(districts).every(([region,d])=>zoneFor(region)&&obj(d)&&
      typeof d.name==='string'&&d.name.length>=3&&d.name.length<=28&&integer(d.funds,0,60)&&integer(d.pulse,0,1e9)))return null;
    return {seq:raw.seq,structures:raw.structures.map(o=>({...o})),districts};
  }
  function funds(s,cost){return s.life.supplies.work>=(cost.wood||0)&&s.player.inventory.ore>=(cost.ore||0)&&s.player.gold>=(cost.gold||0);}
  function spend(s,cost){
    s.life.supplies.work-=cost.wood||0;s.player.inventory.ore-=cost.ore||0;s.player.gold-=cost.gold||0;
  }
  function near(s,o){return o.region===s.region&&dist(s.player,centre(rect(o)))<=66;}
  function stock(s){return {wood:s.life.supplies.work,ore:s.player.inventory.ore,gold:s.player.gold};}
  function districtLevel(s,region){
    const structures=s.build.structures.filter(x=>x.region===region);
    const count=plan=>structures.filter(x=>x.plan===plan).length;
    if(count('house')<2||!count('farm')||!count('shop'))return 0;
    return count('keep')&&count('hall')&&count('lab')?2:1;
  }
  function tick(s){
    const pulse=Math.floor(s.time/125);
    for(const [region,d] of Object.entries(s.build.districts)){
      if(pulse<=d.pulse)continue;
      const level=districtLevel(s,region);
      d.funds=Math.min(60,d.funds+(pulse-d.pulse)*level*3);d.pulse=pulse;
    }
  }
  function workReason(s,o){
    if(!near(s,o))return 'Avvicinati alla costruzione.';
    if(o.plan==='farm')return o.readyAt>s.time?'Raccolto fra '+Math.ceil(o.readyAt-s.time)+' s.':o.readyAt||s.life.supplies.seeds?'':'Servono sementi.';
    if(o.plan==='lab')return s.player.inventory.herb>=2&&s.player.inventory.ore>=1?'':'Servono 2 erbe e 1 minerale.';
    if(o.plan==='shop')return s.life.supplies.grain>=2?'':'Servono 2 grani.';
    return 'Uso riservato agli abitanti o alla gilda.';
  }
  function view(s){
    const z=zoneFor(s.region),d=s.build.districts[s.region],level=z?districtLevel(s,s.region):0;
    return {zone:z,near:!!z&&dist(s.player,centre(z))<208,stock:stock(s),
      district:d?{...d,level}:null,districtReady:level>0,
      plans:Object.entries(plans).map(([id,p])=>({id,...p,affordable:funds(s,p)})),
      structures:s.build.structures.map(o=>({...rect(o),name:plans[o.plan].name,near:near(s,o),workReason:workReason(s,o)}))};
  }
  function position(s,x,y){
    const z=zoneFor(s.region);
    if(!z||!Number.isFinite(x)||!Number.isFinite(y)||dist(s.player,centre(z))>208||dist(s.player,{x,y})>176)return null;
    return {x:z.x+Math.floor((x-z.x)/grid)*grid,y:z.y+Math.floor((y-z.y)/grid)*grid};
  }
  function proposal(s,plan,x,y,id){
    if(!owns(plans,plan))return null;
    const start=position(s,x,y);
    if(!start)return null;
    const existing=id?get(s,id):null;
    if(id&&(!existing||existing.plan!==plan||!near(s,existing)))return null;
    const o={id:existing?.id||s.build.seq,region:s.region,plan,...start,color:existing?.color||0,level:existing?.level||1,furniture:existing?.furniture||0,readyAt:existing?.readyAt||0};
    const reason=validateLayout(o,s.build.structures)||(!existing&&!funds(s,plans[plan])?'Materiali insufficienti.':'');
    if((plan==='wall'||plan==='keep')&&overlap(rect(o),{x:s.player.x-7,y:s.player.y-7,w:14,h:14}))return {...o,reason:'Sposta il personaggio fuori dall’ingombro.'};
    return {...o,reason};
  }
  function command(s,d){
    if(!obj(d))return fail('Comando della proprietà non valido.');
    if(d.op==='foundDistrict'||d.op==='collectDistrict'){
      const z=zoneFor(s.region);
      if(!z||dist(s.player,centre(z))>154)return fail('Raggiungi il lotto.');
      const district=s.build.districts[s.region];
      if(d.op==='collectDistrict'){
        if(!district?.funds)return fail('La cassa dell’insediamento è vuota.');
        const funds=district.funds;s.player.gold+=funds;district.funds=0;
        return done('Entrate delle botteghe · '+funds+' Scintille.');
      }
      const name=typeof d.name==='string'?d.name.trim():'';
      if(district||name.length<3||name.length>28||!/^[^\u0000-\u001f]+$/.test(name))return fail('Serve un nome valido per un nuovo insediamento.');
      if(!districtLevel(s,s.region))return fail('Servono due case, una fattoria e una bottega.');
      s.build.districts[s.region]={name,funds:0,pulse:Math.floor(s.time/125)};
      return done('Insediamento fondato · '+name,true);
    }
    if(d.op==='place'){
      const o=proposal(s,d.plan,d.x,d.y,d.id);
      if(!o)return fail('Raggiungi il lotto e scegli una posizione vicina.');
      if(o.reason)return fail(o.reason);
      if(!d.id&&s.build.structures.length>=140)return fail('Il registro delle proprietà è pieno.');
      delete o.reason;
      if(d.id)Object.assign(get(s,d.id),o);
      else{spend(s,plans[o.plan]);s.build.structures.push(o);s.build.seq++;}
      return done(d.id?'Posizione aggiornata.':plans[o.plan].name+' costruita.',!d.id);
    }
    const o=get(s,d.id);
    if(!o||!near(s,o))return fail('Avvicinati a una proprietà che possiedi.');
    if(d.op==='paint'){o.color=(o.color+1)%colours.length;return done('Finitura modificata.');}
    if(d.op==='furnish'&&o.plan==='house'){
      o.furniture=(o.furniture+1)%4;
      return done('Arredamento disposto nella casa.');
    }
    if(d.op==='upgrade'&&o.level===1&&!['bridge','wall'].includes(o.plan)){
      const upgraded={...o,level:2},problem=validateLayout(upgraded,s.build.structures),cost={wood:2,ore:2,gold:7};
      if(problem)return fail(problem);
      if(!funds(s,cost))return fail('Servono 2 travi, 2 minerali e 7 Scintille.');
      spend(s,cost);o.level=2;return done('Ampliamento completato.',true);
    }
    if(d.op==='remove'&&d.confirm===true){
      if(s.society?.home===o.id||s.guild?.personal?.halls?.some(x=>x.id===o.id))return fail('Trasferisci prima la famiglia o la gilda dalla costruzione.');
      if(o.plan==='bridge'&&World.buildWater(s.player.x,s.player.y,6))return fail('Scendi dal ponte prima di demolirlo.');
      s.build.structures=s.build.structures.filter(a=>a.id!==o.id);
      s.life.supplies.work+=Math.floor(plans[o.plan].wood/2);
      s.player.inventory.ore+=Math.floor(plans[o.plan].ore/2);
      return done('Proprietà demolita. Parte dei materiali è stata recuperata.');
    }
    if(d.op==='work'){
      const reason=workReason(s,o);if(reason)return fail(reason);
      if(o.plan==='farm'){
        if(!o.readyAt){s.life.supplies.seeds--;o.readyAt=s.time+18;return {...done('Semina completata.'),event:{id:'field',amount:1},xp:5};}
        o.readyAt=0;s.life.supplies.seeds++;s.life.supplies.grain+=o.level===2?5:3;s.player.inventory.herb++;
        return {...done('Raccolto della fattoria.'),event:{id:'field',amount:2},xp:18,essence:1};
      }
      if(o.plan==='lab'){
        s.player.inventory.herb-=2;s.player.inventory.ore--;s.player.potions+=o.level+1;
        return {...done('Pozioni distillate nel laboratorio.'),event:{id:'craft',amount:1.3},xp:17};
      }
      s.life.supplies.grain-=2;s.player.gold+=8+o.level*2;
      return {...done('Vendita conclusa in bottega.'),event:{id:'trade',amount:1},xp:10};
    }
    return fail('Questa modifica non è disponibile.');
  }
  function home(s,id){
    const h=s.build?.structures.find(o=>o.plan==='house'&&(id==null||o.id===id));if(!h)return null;
    return {id:h.id,region:h.region,...centre(rect(h)),name:'Casa del viandante'};
  }
  function blocked(s,x,y,r){
    if(!s.build)return false;
    for(const o of s.build.structures){
      if(o.region!==s.region||!['wall','keep'].includes(o.plan))continue;
      const b=rect(o);
      if(x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h)return true;
    }
    return false;
  }
  function bridgeAt(s,x,y,r){
    return World.buildWater(x,y,r)&&s.build.structures.some(o=>o.region===s.region&&o.plan==='bridge'&&x>=o.x&&x<=o.x+plans.bridge.w&&y-r>=o.y&&y+r<=o.y+plans.bridge.h);
  }
  function actors(s){
    const owned=s.build.structures.filter(o=>o.region===s.region);
    const out=owned.map(o=>{
      const b=rect(o),floor=['bridge','farm'].includes(b.plan)||b.plan==='house'&&s.player.x>=b.x&&s.player.x<=b.x+b.w&&s.player.y>=b.y&&s.player.y<=b.y+b.h;
      return {x:b.x+b.w/2,y:floor?b.y-3:b.y+b.h,draw:c=>draw(c,b,s)};
    });
    if(s.build.districts[s.region]&&districtLevel(s,s.region)){
      for(const [i,o] of owned.filter(o=>o.plan==='house').slice(0,3).entries()){
        const x=o.x+Math.round((Math.sin(s.time*.9+i)*.5+.5)*(rect(o).w-12))+6,y=o.y+rect(o).h+9;
        out.push({x,y,draw:c=>ActorArt.draw(c,i%2?'merchant':'human',x,y,{t:s.time,dir:'down',moving:true})});
      }
    }
    return out;
  }
  function draw(c,o,s){
    const {x,y,w,h,plan}=o,roof=colours[o.color];
    const px=(color,a,b,cw,ch)=>{c.fillStyle=color;c.fillRect(x+a,y+b,cw,ch);};
    px('#24363862',1,3,w,h);
    if(plan==='bridge'){
      px('#684b38',0,0,w,h);for(let i=1;i<w;i+=4)px(i%3?'#b59866':'#a07c54',i,2,3,h-4);
      px('#d7b080',0,1,w,2);px('#6f5039',0,h-4,w,3);return;
    }
    if(plan==='farm'){
      px('#544a39',0,0,w,h);for(let j=4;j<h-3;j+=7){px('#886b4d',2,j,w-4,4);
        for(let i=4;i<w-3;i+=5)if(o.readyAt)px(o.readyAt<=s.time?'#e4c480':'#7ea066',i,j-2,2,4);}
      px('#a08d68',0,0,w,2);return;
    }
    if(plan==='wall'){
      px('#465957',0,0,w,h);px('#8f9a85',0,1,w,2);
      for(let j=3;j<h;j+=4){for(let i=2+(j%2)*3;i<w-2;i+=6)px('#74837b',i,j,5,2);}return;
    }
    const indoor=s.player.x>=x&&s.player.x<=x+w&&s.player.y>=y&&s.player.y<=y+h;
    if((indoor||o.furniture)&&plan==='house'){
      px('#6f533c',0,0,w,h);for(let i=0;i<w;i+=5)px('#a98056',i,2,4,h-4);
      px('#493e38',0,0,w,3);px('#493e38',0,0,3,h);px('#493e38',w-3,0,3,h);
      if(o.furniture&1){px('#4b3c38',6,6,10,14);px('#dfd5b3',7,7,8,4);px('#936d88',7,11,8,7);}
      if(o.furniture&2){px('#542f32',w-18,8,12,10);px('#b08351',w-18,7,12,7);px('#d5b267',w-14,8,4,2);}
      return;
    }
    px('#5a4c43',2,10,w-4,h-10);px('#baa782',4,12,w-8,h-14);
    px('#413b39',w/2-4,h-13,8,13);px('#ac7a51',w/2-3,h-11,6,10);
    for(const i of [9,w-16]){px('#4a5551',i,h-17,7,7);px('#edbd78',i+1,h-16,5,5);}
    px('#31464a',0,0,w,17);px(roof,2,2,w-4,12);
    for(let j=4;j<14;j+=4){px('#21343d64',3,j,w-6,1);for(let i=j%3+3;i<w-2;i+=6)px('#faddb13c',i,j+1,3,1);}
    if(plan==='keep'||plan==='hall'){px('#555b56',0,-7,10,15);px('#8d9884',0,-8,10,3);px('#555b56',w-10,-7,10,15);px('#8d9884',w-10,-8,10,3);}
  }
  function preview(c,s,plan,x,y,id){
    const o=proposal(s,plan,x,y,id);if(!o)return;
    c.save();c.globalAlpha=.62;const b=rect(o);draw(c,b,s);c.globalAlpha=.92;
    c.strokeStyle=o.reason?'#ffc2ac':'#b5e6ad';c.strokeRect(b.x+.5,b.y+.5,b.w-1,b.h-1);c.restore();
  }
  window.Build={create,restore,view,command,home,blocked,bridgeAt,tick,actors,preview};
})();

