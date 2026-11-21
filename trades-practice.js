/* Minigiochi di mestiere. Nessuna dipendenza da Canvas, DOM, motore o salvataggi. */
(() => {
  'use strict';

  const aliases={fish:'fishing',pesca:'fishing',smith:'smithing',forge:'smithing',fabbro:'smithing',
    farm:'farming',field:'farming',agricoltura:'farming',herd:'husbandry',allevamento:'husbandry',cook:'cooking',cucina:'cooking'};
  const fish=Object.freeze([
    Object.freeze({id:'roach',name:'Scardola ramata',rarity:'Comune',weight:42,power:.76,pace:1.25,yield:1}),
    Object.freeze({id:'trout',name:'Trota delle radici',rarity:'Comune',weight:29,power:.86,pace:1.67,yield:2}),
    Object.freeze({id:'perch',name:'Persico di quarzo',rarity:'Raro',weight:20,power:1.04,pace:1.94,yield:3}),
    Object.freeze({id:'mooncarp',name:'Carpa lunare',rarity:'Epico',weight:9,power:1.16,pace:2.23,yield:4})
  ]);
  const recipes=Object.freeze({
    soup:Object.freeze({id:'soup',name:'Zuppa di radici',minutes:8.2,range:[.46,.71]}),
    fillet:Object.freeze({id:'fillet',name:'Filetto di fiume',minutes:6.8,range:[.54,.73]}),
    bread:Object.freeze({id:'bread',name:'Pane di Vela',minutes:10,range:[.55,.78]})
  });
  const titles={fishing:'Pesca',smithing:'Forgia',farming:'Coltivazione',husbandry:'Cura delle lanose',cooking:'Cucina'};
  const maxDuration={fishing:32,smithing:45,farming:55,husbandry:48,cooking:42};
  const has=(o,k)=>Object.hasOwn(o,k);
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
  const average=(values,fallback=0)=>values.length?values.reduce((sum,n)=>sum+n,0)/values.length:fallback;
  const finite=(value,fallback)=>Number.isFinite(value)?value:fallback;
  const meanOf=([a,b])=>(a+b)*.5;
  const triangle=x=>1-Math.abs(2*((x%1+1)%1)-1);
  const precision=(value,target,wide=.55)=>clamp(1-Math.max(0,Math.abs(value-meanOf(target))-(target[1]-target[0])*.24)/wide);
  const titleCase=value=>value.charAt(0).toLocaleUpperCase('it')+value.slice(1);
  const target=(id,label,value,band,tone)=>({id,label,value:clamp(value),target:band,tone});
  const button=(id,label,enabled=true,hold=false)=>({id,label,enabled,hold});

  function hash(number,salt=0){
    let n=(number+Math.imul(0x9e3779b1,salt+1))>>>0;
    n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);
    return ((n^(n>>>15))>>>0)/4294967296;
  }
  function seedOf(value){
    if(Number.isFinite(value))return value>>>0;
    let number=2166136261;
    for(const ch of String(value??''))number=Math.imul(number^ch.codePointAt(0),16777619);
    return number>>>0;
  }
  function phase(s,name){
    s.phase=name;s.phaseAt=s.elapsed;
  }
  function finish(s,points,success,extra={}){
    if(s.result)return;
    const score=Math.round(clamp(points,0,100));
    const quality=score>=94?'perfetto':score>=80?'ottimo':score>=59?'buono':'scarso';
    const reason=success?undefined:extra.reason||'La prova non ha raggiunto la qualità necessaria.';
    s.result={done:true,success,kind:s.kind,quality,score,...extra,reason};
    phase(s,'done');
    s.feedback=success?'Risultato '+quality+'.':reason;
  }
  function recipeOf(value){
    if(value&&typeof value==='object'){
      if(!value.name&&typeof value.id==='string'&&has(recipes,value.id))return recipes[value.id];
      const id=typeof value.id==='string'&&/^[a-z0-9_-]{1,30}$/.test(value.id)?value.id:'soup';
      const name=typeof value.name==='string'&&value.name.trim()?value.name.trim().slice(0,50):recipes.soup.name;
      const minutes=clamp(finite(value.minutes,8.2),5.2,14);
      return {id,name,minutes,range:recipes.soup.range};
    }
    return typeof value==='string'&&has(recipes,value)?recipes[value]:recipes.soup;
  }

  function create(request,seed,preset={}){
    const kind=has(aliases,request)?aliases[request]:request;
    if(!has(titles,kind))return null;
    if(!preset||typeof preset!=='object')preset={};
    const key=seedOf(seed),difficulty=clamp(finite(preset.difficulty,1),.72,1.32);
    const base={kind,seed:key,difficulty,elapsed:0,phaseAt:0,phase:'',feedback:'',result:null,
      room:0,holdAction:'',holdUntil:0,lastAction:-10,offset:hash(key,4)};
    switch(kind){
      case 'fishing':{
        const eligible=Array.isArray(preset.fish)?fish.filter(f=>preset.fish.includes(f.id)):[];
        return {...base,phase:'cast',castPower:0,castPrecision:0,bitesAt:0,hookPrecision:0,fish:null,pool:eligible.length?eligible:fish,
          tension:.38,draw:0,breakFor:0,slackFor:0,goodTime:0,reelTime:0,tries:0,preHooks:0};
      }
      case 'smithing':return {...base,phase:'temper',heat:.22,work:[],quickStrikes:0,scorch:0,quenchAt:0};
      case 'farming':return {...base,phase:'soil',till:[],seedWork:[],water:0,waterTarget:.54+hash(key,8)*.22};
      case 'husbandry':return {...base,phase:'company',stress:.62+hash(key,3)*.15,calmSeconds:0,grooming:[],food:0,foodTarget:.49+hash(key,8)*.24};
      case 'cooking':return {...base,phase:'pot',heat:.28,cook:0,burn:0,heatWork:0,hotTime:0,stirs:[],recipe:recipeOf(preset.recipe)};
    }
  }

  const age=s=>s.elapsed-s.phaseAt;
  const castAt=s=>triangle(.15+s.elapsed*.72);
  const smithRhythm=s=>triangle(s.elapsed*(.91+s.difficulty*.18)+s.offset);
  const soilAt=s=>triangle(age(s)*.86+s.offset);
  const seedAt=s=>triangle(age(s)*1.08+s.offset*.71);
  const groomAt=s=>triangle(age(s)*.93+s.offset*.86);
  const spoonAt=s=>triangle(s.elapsed*.72+s.offset*.67);
  const castBand=[.71,.88],heatBand=[.56,.80],strikeBand=[.73,.98],soilBand=[.33,.66],seedBand=[.43,.69],groomBand=[.56,.81];
  const lineBand=[.30,.79];
  const staminaGoal=s=>Math.max(1.75,3.2*s.fish.power*s.difficulty+1-s.castPrecision*.6);
  const tendingGoal=s=>s.stress<=.24;
  const cookingGoals=s=>s.recipe.range;

  function chooseFish(s){
    const weights=s.pool.map(f=>f.weight*(f.rarity==='Comune'?1:.55+s.castPrecision*.88));
    let roll=hash(s.seed,17)*weights.reduce((sum,n)=>sum+n,0);
    for(const [i,weight] of weights.entries()){
      roll-=weight;
      if(roll<0)return s.pool[i];
    }
    return s.pool[0];
  }
  function setPulse(s,message){
    s.feedback=message;
  }
  function tapHold(s,id,duration=.31){
    s.holdAction=id;s.holdUntil=Math.max(s.holdUntil,s.elapsed+duration);
  }
  function endFish(s,success,why=''){
    if(!success){finish(s,0,false,{reason:why});return;}
    const safe=clamp(s.goodTime/Math.max(.1,s.reelTime));
    finish(s,100*(.27*s.castPrecision+.27*s.hookPrecision+.46*safe),true,
      {fish:s.fish,catchId:s.fish.id,yield:s.fish.yield});
  }
  function fishingClick(s,action){
    if(action==='cast'&&s.phase==='cast'){
      s.castPower=castAt(s);s.castPrecision=precision(s.castPower,castBand,.67);
      if(s.castPrecision<.18){setPulse(s,'Il galleggiante è caduto troppo vicino. Riprova.');return;}
      s.tries++;s.fish=chooseFish(s);
      s.bitesAt=s.elapsed+.8+hash(s.seed,37)*1.37+(1-s.castPrecision)*.5;
      phase(s,'wait');
      setPulse(s,'Segui il galleggiante. Aspetta il segnale prima di agganciare.');
    }else if(action==='hook'&&s.phase==='wait'){
      const delta=s.elapsed-s.bitesAt;
      if(delta<0){s.preHooks++;setPulse(s,'Presto. Aspetta lo strappo del galleggiante.');return;}
      if(delta>.85/s.difficulty){endFish(s,false,'Il pesce è sfuggito prima dell’aggancio.');return;}
      s.hookPrecision=clamp(1-delta*.69-Math.min(.24,s.preHooks*.08));
      phase(s,'reel');
      setPulse(s,'Pesce agganciato. Recupera a tratti per proteggere la lenza.');
    }else if(action==='reel'&&s.phase==='reel'){
      tapHold(s,'reel',.31);
    }
  }
  function fishingTime(s,dt,held){
    if(s.phase==='wait'){
      if(s.elapsed>=s.bitesAt&&s.elapsed<=s.bitesAt+dt+.02)setPulse(s,'Ora! Il galleggiante è sparito.');
      if(s.elapsed>s.bitesAt+.85/s.difficulty)endFish(s,false,'Il pesce ha lasciato l’amo.');
      return;
    }
    if(s.phase!=='reel')return;
    const pulling=(Math.sin(age(s)*s.fish.pace*2.1+s.offset*5)+1)*.5;
    const reeling=held==='reel';
    s.tension=clamp(s.tension+dt*((reeling?.44:-.33)+pulling*.33*s.fish.power*s.difficulty-.13));
    if(reeling){
      s.reelTime+=dt;
      if(s.tension>=lineBand[0]&&s.tension<=lineBand[1])s.goodTime+=dt;
      if(s.tension>.16&&s.tension<.93)s.draw+=dt*(s.tension<.30?.57:s.tension>.79?.72:1.17);
    }
    s.breakFor=s.tension>=.97?s.breakFor+dt:Math.max(0,s.breakFor-dt*2);
    s.slackFor=s.tension<=.055?s.slackFor+dt:Math.max(0,s.slackFor-dt*2.4);
    if(s.breakFor>.32){endFish(s,false,'La lenza si è spezzata per la tensione.');return;}
    if(s.slackFor>1.08){endFish(s,false,'La lenza si è allentata e il pesce è sgusciato via.');return;}
    if(s.draw>=staminaGoal(s)){endFish(s,true);return;}
    if(s.tension>=.85)setPulse(s,'Lascia scorrere la lenza.');
    else if(s.tension<=.23)setPulse(s,'Recupera prima che la lenza si allenti.');
    else setPulse(s,'Mantieni il recupero entro la fascia dorata.');
  }

  function smithClick(s,action){
    if(action==='heat'&&s.phase==='temper'){
      if(s.elapsed-s.lastAction<.15)return;
      s.lastAction=s.elapsed;s.heat=clamp(s.heat+.17);
      setPulse(s,s.heat>.86?'Il pezzo è troppo caldo. Lascia che perda calore.':'Le braci scaldano il metallo.');
    }else if(action==='strike'&&s.phase==='temper'){
      if(s.elapsed-s.lastAction<.25){s.quickStrikes++;setPulse(s,'Lascia tornare il martello prima del prossimo colpo.');return;}
      s.lastAction=s.elapsed;
      if(s.heat<.38){setPulse(s,'Troppo freddo. Aggiungi calore prima di colpire.');return;}
      const timed=precision(smithRhythm(s),strikeBand,.56),heated=precision(s.heat,heatBand,.5);
      s.work.push(timed*.64+heated*.36);s.heat=Math.max(0,s.heat-.055);
      setPulse(s,timed>.78&&heated>.8?'Colpo pieno.':'Il martello ha lasciato un segno poco uniforme.');
      if(s.work.length>=6){phase(s,'quench');s.quenchAt=s.elapsed;setPulse(s,'Il pezzo è formato. Tempra quando il calore entra nella fascia azzurra.');}
    }else if(action==='quench'&&s.phase==='quench'){
      const cool=precision(s.heat,[.26,.48],.39);
      const score=100*(average(s.work)*.78+cool*.22)-Math.min(22,s.scorch*11+s.quickStrikes*2.5);
      finish(s,score,score>=28,{hits:s.work.length,scorched:s.scorch>=.8});
    }
  }
  function smithTime(s,dt,held){
    const stoke=held==='heat'&&s.phase==='temper';
    s.heat=clamp(s.heat+dt*((stoke?.31:0)-(s.phase==='quench'?.14:.055)*s.difficulty));
    if(s.heat>.94)s.scorch+=dt;
    if(s.scorch>2.4)finish(s,0,false,{reason:'Il metallo è bruciato prima della tempra.'});
  }

  function farmClick(s,action){
    if(action==='till'&&s.phase==='soil'){
      if(s.elapsed-s.lastAction<.25)return;
      s.lastAction=s.elapsed;
      const score=precision(soilAt(s),soilBand,.57);
      s.till.push(score);
      setPulse(s,score>.76?'Terra ben smossa.':'Solco irregolare, fai attenzione al ritmo.');
      if(s.till.length===3){phase(s,'seed');setPulse(s,'Ora distribuisci i semi nei tre solchi.');}
    }else if(action==='sow'&&s.phase==='seed'){
      if(s.elapsed-s.lastAction<.22)return;
      s.lastAction=s.elapsed;
      const score=precision(seedAt(s),seedBand,.62);
      s.seedWork.push(score);
      setPulse(s,score>.76?'Buona spaziatura.':'I semi sono un po’ troppo vicini.');
      if(s.seedWork.length===3){phase(s,'water');setPulse(s,'Irriga fino alla fascia azzurra, poi termina.');}
    }else if(action==='water'&&s.phase==='water'){
      if(s.elapsed-s.lastAction<.2)return;
      s.lastAction=s.elapsed;s.water=clamp(s.water+.117);
    }else if(action==='finish'&&s.phase==='water'&&s.water>.05){
      const moisture=precision(s.water,[s.waterTarget-.11,s.waterTarget+.11],.47);
      const score=100*(average(s.till)*.31+average(s.seedWork)*.31+moisture*.38)-(s.water<.13?14:0);
      finish(s,score,score>=29,{germination:Math.round(clamp(moisture)*100),water:s.water});
    }
  }
  function farmTime(s,dt,held){
    if(s.phase==='water'&&held==='water')s.water=clamp(s.water+dt*.31);
  }

  function herdClick(s,action){
    if(action==='calm'&&s.phase==='company'){
      if(s.elapsed-s.lastAction<.26)return;
      s.lastAction=s.elapsed;s.stress=Math.max(0,s.stress-.176);
      setPulse(s,tendingGoal(s)?'La lanosa ti lascia avvicinare.':'Aspetta che il respiro si regolarizzi.');
      if(tendingGoal(s))phase(s,'groom');
    }else if(action==='groom'&&s.phase==='groom'){
      if(s.elapsed-s.lastAction<.25)return;
      s.lastAction=s.elapsed;
      const score=precision(groomAt(s),groomBand,.55);
      s.grooming.push(score);s.stress=clamp(s.stress+(1-score)*.105);
      setPulse(s,score>.75?'La spazzola scorre lungo la lana.':'Una passata troppo brusca ha agitato la lanosa.');
      if(s.grooming.length===3){phase(s,'feed');setPulse(s,'Dosa una porzione equilibrata prima di offrirla.');}
    }else if(action==='feed'&&s.phase==='feed'){
      if(s.elapsed-s.lastAction<.23)return;
      s.lastAction=s.elapsed;s.food=clamp(s.food+.128);
    }else if(action==='serve'&&s.phase==='feed'&&s.food>.07){
      const portion=precision(s.food,[s.foodTarget-.105,s.foodTarget+.105],.49);
      const comfort=clamp((1-s.stress)/.8);
      const grade=100*(.31*comfort+.34*average(s.grooming)+.35*portion)-(s.food<.1?16:0);
      finish(s,grade,grade>=29,{comfort:Math.round((1-s.stress)*100),food:s.food});
    }
  }
  function herdTime(s,dt,held){
    if(s.phase==='company'&&held==='calm'){
      s.stress=Math.max(0,s.stress-dt*.32);s.calmSeconds+=dt;
      if(tendingGoal(s)){phase(s,'groom');setPulse(s,'La lanosa è tranquilla. Ora spazzola seguendo il ritmo.');}
    }
    if(s.phase==='feed'&&held==='feed')s.food=clamp(s.food+dt*.29);
  }

  function cookClick(s,action){
    if(action==='heat'){
      if(s.elapsed-s.lastAction<.16)return;
      s.lastAction=s.elapsed;s.heat=clamp(s.heat+.145);
    }else if(action==='cool'){
      if(s.elapsed-s.lastAction<.14)return;
      s.lastAction=s.elapsed;s.heat=Math.max(0,s.heat-.185);
    }else if(action==='stir'){
      if(s.elapsed-s.lastAction<.44)return;
      s.lastAction=s.elapsed;
      if(s.heat<.34){setPulse(s,'Aspetta che la cottura cominci a sobbollire.');return;}
      const score=precision(spoonAt(s),[.54,.83],.6);
      if(s.stirs.length<6)s.stirs.push(score);
      s.burn=Math.max(0,s.burn-.032);
      setPulse(s,score>.73?'Consistenza uniforme.':'Mescola seguendo il movimento del cucchiaio.');
    }else if(action==='serve'&&s.cook>.29){
      const doneness=precision(s.cook,[.81,1.05],.62),control=clamp(s.heatWork/Math.max(.1,s.hotTime)),
        texture=average(s.stirs,.33)*Math.min(1,(s.stirs.length+1)/3);
      const score=100*(doneness*.53+control*.24+texture*.23)-s.burn*57;
      const ok=s.cook>=.47&&s.burn<.84&&score>=28;
      finish(s,score,ok,{recipe:s.recipe,texture:Math.round(texture*100),reason:ok?undefined:'Controlla la cottura prima di servire.'});
    }
  }
  function cookTime(s,dt,held){
    s.heat=clamp(s.heat+dt*((held==='heat'?.23:held==='cool'?-.36:0)-.045));
    if(s.heat>=.34){
      const p=precision(s.heat,cookingGoals(s),.46);
      s.cook+=dt*Math.max(.22,s.heat)/s.recipe.minutes*1.8;
      s.hotTime+=dt;s.heatWork+=dt*p;
    }
    if(s.heat>.84)s.burn+=dt*(.16+(s.heat-.84)*.48);
    if(s.cook>1.06)s.burn+=dt*.081*s.difficulty;
    if(s.burn>.84||s.cook>1.53){finish(s,0,false,{recipe:s.recipe,reason:'La preparazione è bruciata.'});return;}
    if(s.heat>.84)setPulse(s,'Il fondo sta bruciando. Abbassa il fuoco.');
    else if(s.cook>.87)setPulse(s,'La preparazione è pronta. Impiatta.');
  }

  const clicks={fishing:fishingClick,smithing:smithClick,farming:farmClick,husbandry:herdClick,cooking:cookClick};
  const timers={fishing:fishingTime,smithing:smithTime,farming:farmTime,husbandry:herdTime,cooking:cookTime};
  const holdByKind={fishing:'reel',smithing:'heat',farming:'water',husbandry:'calm',cooking:'heat'};
  const holdable={
    fishing:new Set(['reel']),smithing:new Set(['heat']),farming:new Set(['water']),
    husbandry:new Set(['calm','feed']),cooking:new Set(['heat','cool'])
  };
  function step(s,delta,input={}){
    if(!s||!has(timers,s.kind)||s.result)return null;
    if(typeof input==='string')input={action:input};
    if(!input||typeof input!=='object')input={};
    const actions=input.action;
    if(typeof actions==='string')clicks[s.kind](s,actions);
    const raw=input.hold,held=typeof raw==='string'&&holdable[s.kind].has(raw)?raw:raw===true?
      (holdable[s.kind].has(input.action)?input.action:s.kind==='husbandry'&&s.phase==='feed'?'feed':holdByKind[s.kind]):'';
    const dt=clamp(finite(delta,0),0,.12);
    let left=dt;
    while(left>1e-6&&!s.result){
      const d=Math.min(1/60,left);left-=d;s.elapsed+=d;
      const pulse=s.elapsed<s.holdUntil?s.holdAction:'';
      timers[s.kind](s,d,held||pulse);
      if(!s.result&&s.elapsed>=maxDuration[s.kind])finish(s,0,false,{reason:'È scaduto il tempo per questa prova.'});
    }
    return s.result;
  }

  function fishView(s){
    if(s.phase==='cast')return {instructions:'Lancia quando la potenza passa nella fascia dorata.',
      meters:[target('cast','Potenza del lancio',castAt(s),castBand,'gold')],actions:[button('cast','Lancia')],progress:0};
    if(s.phase==='wait'){
      const bite=s.elapsed>=s.bitesAt;
      return {instructions:bite?'Il galleggiante si è immerso. Aggancia ora.':'Aspetta che il pesce morda.',
        meters:[target('float','Galleggiante',bite?.97:.14+.04*Math.sin(s.elapsed*11),[.84,1],bite?'gold':'blue')],
        actions:[button('hook','Aggancia')],progress:.16};
    }
    return {instructions:'Tieni premuto Recupera. Rilascia quando sale troppo la tensione.',progress:clamp(s.draw/staminaGoal(s)),
      meters:[target('tension','Tensione della lenza',s.tension,lineBand,s.tension>.85?'red':'blue'),
        target('retrieve','Recupero',s.draw/staminaGoal(s),undefined,'gold')],actions:[button('reel','Recupera',true,true)]};
  }
  function smithView(s){
    return s.phase==='quench' ? {instructions:'Tempra quando il metallo si raffredda nella fascia azzurra.',progress:.9,
      meters:[target('heat','Calore del metallo',s.heat,[.26,.48],'blue')],actions:[button('quench','Tempra')]}:
      {instructions:'Scalda il pezzo. Poi dai sei colpi quando ritmo e temperatura sono nelle fasce.',progress:s.work.length/6*.88,
        meters:[target('heat','Calore del metallo',s.heat,heatBand,s.heat>.86?'red':'gold'),
          target('rhythm','Ritmo del martello',smithRhythm(s),strikeBand,'blue')],
        actions:[button('heat','Alimenta le braci',true,true),button('strike','Martella',s.heat>=.38)]};
  }
  function farmView(s){
    if(s.phase==='soil')return {instructions:'Prepara i tre solchi. Lavora quando il terreno entra nella fascia.',
      meters:[target('soil','Terreno',soilAt(s),soilBand,'gold')],actions:[button('till','Lavora il terreno')],progress:s.till.length/9};
    if(s.phase==='seed')return {instructions:'Distribuisci i semi quando l’indicatore entra nella fascia.',
      meters:[target('seed','Spaziatura',seedAt(s),seedBand,'gold')],actions:[button('sow','Semina')],progress:(3+s.seedWork.length)/9};
    return {instructions:'Dosa l’acqua e fermati prima di allagare i solchi.',progress:.71+s.water*.18,
      meters:[target('water','Umidità',s.water,[s.waterTarget-.11,s.waterTarget+.11],'blue')],
      actions:[button('water','Irriga',true,true),button('finish','Termina il lavoro',s.water>.05)]};
  }
  function herdView(s){
    if(s.phase==='company')return {instructions:'Avvicinati con calma finché la lanosa si rilassa.',progress:clamp((.78-s.stress)*.53),
      meters:[target('stress','Agitazione',s.stress,[0,.24],'blue')],actions:[button('calm','Rassicura',true,true)]};
    if(s.phase==='groom')return {instructions:'Spazzola tre volte seguendo il ritmo del pelo.',progress:.32+s.grooming.length*.11,
      meters:[target('groom','Ritmo della spazzola',groomAt(s),groomBand,'gold'),target('stress','Agitazione',s.stress,[0,.24],'blue')],
      actions:[button('groom','Spazzola')]};
    return {instructions:'Dosa il mangime, poi offri la porzione senza riempire troppo la ciotola.',progress:.72+s.food*.18,
      meters:[target('food','Ciotola',s.food,[s.foodTarget-.105,s.foodTarget+.105],'gold')],
      actions:[button('feed','Aggiungi mangime',true,true),button('serve','Offri la porzione',s.food>.07)]};
  }
  function cookView(s){
    return {instructions:'Cuoci '+s.recipe.name.toLocaleLowerCase('it')+' regolandone il calore, mescola al ritmo e impiatta a cottura ultimata.',progress:clamp(s.cook),
      meters:[target('heat','Fuoco',s.heat,cookingGoals(s),s.heat>.84?'red':'gold'),
        target('done','Cottura',s.cook,[.81,1],'blue'),target('spoon','Ritmo del cucchiaio',spoonAt(s),[.54,.83],'gold')],
      actions:[button('heat','Alza il fuoco',true,true),button('cool','Abbassa il fuoco',true,true),
        button('stir','Mescola',s.heat>=.34),button('serve','Impiatta',s.cook>.29)]};
  }
  const views={fishing:fishView,smithing:smithView,farming:farmView,husbandry:herdView,cooking:cookView};
  function view(s){
    if(!s||!has(views,s.kind))return null;
    return {kind:s.kind,title:titles[s.kind],phase:s.phase,feedback:s.feedback,result:s.result,timeLeft:Math.max(0,Math.ceil(maxDuration[s.kind]-s.elapsed)),
      ...(s.result ? {instructions:s.result.success?titleCase(s.result.quality)+' · '+s.result.score+'/100':s.result.reason,
        progress:1,meters:[],actions:[]} : views[s.kind](s))};
  }

  window.GamePractice=Object.freeze({create,step,view,fish,recipes});
})();

