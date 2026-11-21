(() => {
  'use strict';
  const info={
    'civic-fountain':{name:'Fonte delle Lenti',description:'La pietra trattiene appena la luce. Il quartiere ha lasciato una canalina per il ripristino.',action:'Ripristina la fonte'},
    'inn-breakfast':{name:'Tavola del Focolare di Vetro',description:'Una razione di pane e acqua pronta per i viandanti del mattino.',action:'Ritira la razione'},
    'inn-cache':{name:'Taccuino dei viaggiatori',description:'Rilegato in tela e annotato da mani diverse. Gli ultimi fogli raccolgono le storie di Velaris.',action:'Leggi il taccuino'},
    archive:{name:'Archivio delle Quattro Lenti',description:'Le mappe dei primi alchimisti mostrano le corti prima delle strade in pietra.',action:'Consulta l’archivio'},
    academy:{name:'Sala delle Calibrazioni',description:'Una lente d’addestramento permette di esercitare la concentrazione e le tecniche arcane.',action:'Esercitati alla lente'},
    'guild-training':{name:'Sala di addestramento',description:'I fantocci della gilda portano i segni delle esercitazioni. Sul campo, alterna attacchi con J e schivate con Spazio per controllare la distanza.'},
    'house-cache':{name:'Cassone del custode',description:'Un mantello cerato e una lanterna di riserva accompagnano il custode nelle sue ronde lungo il canale.'}
  };
  const serviceId=id=>id==='archive-reading'?'archive':id==='academy-study'?'academy':id;
  const growingMinutes=80;
  const create=()=>({schema:1,restored:false,breakfast:-1,training:-1,read:[],seedbedAt:-1});
  const day=s=>Calendar.absoluteDays(s.calendar,s.time);
  const own=(o,id)=>Object.hasOwn(o,id);
  function restore(raw,s){
    if(raw===undefined)return create();
    if(!raw||raw.schema!==1||typeof raw.restored!=='boolean'||!Array.isArray(raw.read)||new Set(raw.read).size!==raw.read.length||
      !raw.read.every(id=>id==='archive'||id==='inn-cache')||!['breakfast','training'].every(id=>Number.isSafeInteger(raw[id])&&raw[id]>=-1&&raw[id]<=day(s)))return null;
    const seedbedAt=raw.seedbedAt===undefined?-1:raw.seedbedAt;
    if(!Number.isFinite(seedbedAt)||(seedbedAt<0&&seedbedAt!==-1)||seedbedAt>Calendar.timestamp(s.calendar,s.time)+growingMinutes+1e-6)return null;
    return {...raw,seedbedAt};
  }
  function nearby(s,id){
    const x=UrbanWorld.sites(s).find(s=>s.id===id);
    return !!x&&Math.hypot(x.point.x-s.player.x,x.point.y-s.player.y)<=x.range;
  }
  function view(s,site){
    if(site==='greenhouse-bed'){
      const ready=s.cityWorks.seedbedAt,now=Calendar.timestamp(s.calendar,s.time);
      const bed={name:'Aiuola delle erbe di rugiada',description:'Il vetro trattiene il calore anche in inverno. Il canale porta acqua dalla cisterna.',allowed:nearby(s,site)};
      if(ready===-1){
        const seeds=Inventory.quantity(s,'seeds')>0n;
        return {...bed,op:'sow',action:'Semina una semente',allowed:bed.allowed&&seeds,note:seeds?'La terra è pronta.':'Serve una semente. Puoi acquistarla al mercato.'};
      }
      if(ready===0)return {...bed,op:'water',action:'Apri la chiusa',note:'I semi sono nella terra asciutta.'};
      if(ready>now)return {...bed,allowed:false,note:'Le talee cresceranno fra '+Math.ceil(ready-now)+' minuti di gioco.'};
      return {...bed,op:'reap',action:'Raccogli le erbe',note:'Le foglie mature sono pronte da tagliare.'};
    }
    const id=serviceId(site);
    if(!own(info,id))return null;
    if(!info[id].action)return {...info[id],allowed:false};
    const state=s.cityWorks,t=Calendar.view(s.calendar,s.time,s.region);
    const capable=nearby(s,site);
    const used=id==='civic-fountain'?state.restored:id==='academy'?state.training===t.absoluteDays:
      id==='inn-breakfast'?state.breakfast===t.absoluteDays:state.read.includes(id);
    const affordable=id!=='civic-fountain'||Inventory.quantity(s,'ore')>=2n&&Inventory.quantity(s,'work')>=2n;
    const open=id!=='inn-breakfast'||t.hour>=6&&t.hour<11;
    const note=used?{
      'civic-fountain':'L’acqua risplende di nuovo. Il restauro rimane in città.',
      'inn-breakfast':'La porzione di oggi è già stata ritirata.',
      'inn-cache':'Un goblin e uno spirito hanno aperto insieme il primo mercato sotto i portici. Lo chiamavano la piazza dei due fuochi.',
      archive:'Velaris nacque intorno a quattro lenti costruite da comunità diverse. Almeno una viene da un antico laboratorio delle Querce.',
      academy:'Hai già completato l’esercitazione di oggi.'
    }[id]:!open?'La colazione si serve dalle 06:00 alle 11:00.':!affordable?'Servono due minerali lucenti e due travi di legno.':'';
    return {...info[id],used,allowed:capable&&!used&&affordable&&open,note};
  }
  function command(s,value){
    const site=value?.id,id=serviceId(site),station=view(s,site);
    if(!station?.allowed)return {ok:false,text:station?.note||'Avvicinati al luogo.'};
    const result=(text,event,meta)=>({ok:true,changed:true,text,panel:{id:'city-site',detail:site},event:event&&{id:event,amount:1,meta}});
    switch(id){
      case 'greenhouse-bed':
        if(value.op!==station.op)return {ok:false,text:'L’aiuola è già cambiata.'};
        if(station.op==='sow'){
          if(!Inventory.take(s,'seeds',1))return {ok:false,text:'Serve una semente.'};
          s.cityWorks.seedbedAt=0;
          return result('Hai seminato l’aiuola. Apri la chiusa per irrigarla.','sow');
        }
        if(station.op==='water'){
          s.cityWorks.seedbedAt=Calendar.timestamp(s.calendar,s.time)+growingMinutes;
          return result('L’acqua della cisterna raggiunge le talee.');
        }
        Inventory.add(s,'herb',2);s.cityWorks.seedbedAt=-1;
        return result('Hai raccolto due erbe di rugiada.','reap',{kind:'herb'});
      case 'civic-fountain':
        Inventory.take(s,'ore',2);Inventory.take(s,'work',2);s.cityWorks.restored=true;
        return result('La fonte delle Lenti è tornata a scorrere.','urban-restoration',{region:UrbanWorld.originId});
      case 'inn-breakfast':
        Inventory.add(s,'bread',1);Inventory.add(s,'water',1);s.cityWorks.breakfast=day(s);
        return result('Pane e acqua sono nello zaino.');
      case 'archive':case 'inn-cache':
        s.cityWorks.read.push(id);return result('Una storia di Velaris entra nel diario.','explore',{region:UrbanWorld.originId});
      case 'academy':
        s.cityWorks.training=day(s);return result('Hai concluso l’esercitazione.','study',{region:UrbanWorld.originId});
    }
  }
  window.UrbanServices={create,restore,view,command};
})();
