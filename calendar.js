/* One persistent world calendar. Simulation clocks keep their original units. */
(() => {
  'use strict';
  const minutesPerDay=1440;
  const secondsPerDay=1800;
  const minutesPerSecond=minutesPerDay/secondsPerDay;
  const startMinute=8*60;
  const wakeMinute=6*60;
  const daysPerSeason=12;
  const seasons=[
    {id:'spring',name:'Primavera',sunrise:360,sunset:1140},
    {id:'summer',name:'Estate',sunrise:315,sunset:1225},
    {id:'autumn',name:'Autunno',sunrise:395,sunset:1090},
    {id:'winter',name:'Inverno',sunrise:440,sunset:1020}
  ];
  const zones={
    valley:'temperate',quarry:'volcanic',rift:'astral','ancient-valley':'temperate','ardel-crypt':'underground',
    'frost-pass':'alpine','winter-citadel':'alpine','verdant-canopy':'forest','moon-grove':'astral',
    'golden-savanna':'savanna','root-sanctuary':'forest','dune-port':'coast','sunken-dunes':'desert','nadir-vault':'underground'
  };
  const byPalette={ruin:'temperate',pine:'alpine',snow:'alpine',fae:'forest',root:'forest',star:'astral',
    grass:'savanna',shore:'coast',canyon:'desert'};
  const conditions={
    clear:['Sereno','clear'],cloud:['Nuvoloso','cloud'],rain:['Pioggia','rain'],storm:['Temporale','storm'],
    breeze:['Brezza','wind'],wind:['Vento forte','wind'],snow:['Neve','snow'],sleet:['Nevischio','snow'],
    fog:['Nebbia','fog'],mist:['Bruma luminosa','fog'],heat:['Calura','heat'],ash:['Cenere in sospensione','ash'],
    cinder:['Brezza calda','wind'],sand:['Sabbia in sospensione','sand'],star:['Coruschi','astral'],
    vapour:['Umidità della cripta','fog'],cold:['Aria secca','clear']
  };
  // Repeated entries encode prevalence across a season. A forecast block never uses random state.
  const forecast={
    temperate:[
      ['clear','clear','rain','rain','cloud','breeze'],['clear','clear','clear','heat','breeze','storm'],
      ['cloud','rain','rain','fog','breeze','clear'],['cloud','sleet','rain','snow','fog','clear']
    ],
    volcanic:[
      ['ash','clear','cinder','cinder','fog'],['heat','heat','cinder','ash','clear'],
      ['ash','cinder','wind','fog','clear'],['ash','clear','fog','cinder','ash']
    ],
    astral:[
      ['star','mist','breeze','clear','star'],['star','clear','star','breeze','mist'],
      ['mist','star','mist','breeze','star'],['star','mist','snow','mist','star']
    ],
    underground:[
      ['vapour','vapour','mist'],['vapour','mist','vapour'],['vapour','vapour','mist'],['vapour','mist','vapour']
    ],
    alpine:[
      ['sleet','snow','cloud','clear','wind'],['clear','clear','sleet','wind','rain'],
      ['snow','wind','sleet','cloud','clear'],['snow','snow','snow','wind','clear']
    ],
    forest:[
      ['rain','mist','clear','rain','breeze'],['clear','clear','mist','storm','rain'],
      ['fog','rain','mist','cloud','clear'],['fog','cloud','sleet','snow','mist']
    ],
    savanna:[
      ['clear','rain','heat','breeze','clear'],['heat','heat','heat','clear','storm'],
      ['clear','breeze','storm','rain','rain'],['clear','clear','breeze','cloud','rain']
    ],
    coast:[
      ['breeze','wind','rain','clear','clear'],['clear','clear','breeze','heat','storm'],
      ['wind','rain','fog','storm','clear'],['wind','rain','cloud','fog','clear']
    ],
    desert:[
      ['heat','clear','clear','sand','wind'],['heat','heat','heat','sand','clear'],
      ['clear','wind','clear','sand','cold'],['clear','wind','cloud','clear','sand']
    ]
  };
  const maxOffset=1e13;
  const cache=new WeakMap();
  const pad=n=>String(n).padStart(2,'0');
  const format=minute=>pad(Math.floor(minute/60))+':'+pad(minute%60);

  function create(seed){return {seed:seed>>>0,offset:0};}
  function restore(raw,seed,legacyTime=0){
    const actualSeed=seed>>>0;
    if(raw===undefined){
      if(!Number.isFinite(legacyTime)||legacyTime<0||legacyTime>maxOffset/3)return null;
      return {seed:actualSeed,offset:legacyTime*(3-minutesPerSecond)};
    }
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.seed!==actualSeed||
      !Number.isFinite(raw.offset)||raw.offset<0||raw.offset>maxOffset)return null;
    return {seed:raw.seed,offset:raw.offset};
  }

  function advance(state,extraRealSeconds) {
    if(!state||!Number.isFinite(extraRealSeconds)||extraRealSeconds<=0)return false;
    state.offset=Math.min(maxOffset,state.offset+extraRealSeconds*minutesPerSecond);
    return true;
  }

  function timestamp(state,worldTime){
    const elapsed=Number.isFinite(worldTime)?Math.max(0,worldTime):0;
    return startMinute+elapsed*minutesPerSecond+(state?.offset||0);
  }

  function minuteAt(state,worldTime){
    return Math.floor(timestamp(state,worldTime)+1e-7)%minutesPerDay;
  }

  function absoluteDays(state,worldTime){
    return Math.floor((timestamp(state,worldTime)+1e-7)/minutesPerDay);
  }

  function ageDays(state,worldTime){
    return Math.floor((timestamp(state,worldTime)-startMinute+1e-7)/minutesPerDay);
  }

  function weatherAt(state,minute,region,seasonIndex){
    const block=Math.floor(minute/180);
    const previous=state&&cache.get(state);
    if(previous?.block===block&&previous.region===region&&previous.seasonIndex===seasonIndex)return previous.result;
    const climate=Object.hasOwn(zones,region)?zones[region]:byPalette[window.World?.regions?.[region]?.palette]||'temperate';
    let mix=(state?.seed||0)>>>0;
    for(const character of region||'valley')mix=Math.imul(mix^character.charCodeAt(0),16777619);
    mix=(mix+Math.imul(block,0x9e3779b1))|0;
    mix=Math.imul(mix^(mix>>>16),0x7feb352d);
    mix=Math.imul(mix^(mix>>>15),0x846ca68b);
    const list=forecast[climate][seasonIndex];
    const key=list[((mix^(mix>>>16))>>>0)%list.length];
    const [weather,weatherKind]=conditions[key];
    const result={weather,weatherKind,weatherKey:key,climate};
    if(state)cache.set(state,{block,region,seasonIndex,result});
    return result;
  }

  function lightAt(minute,season){
    if(minute>=season.sunrise-32&&minute<season.sunrise+48)return 'dawn';
    if(minute>=season.sunset-44&&minute<season.sunset+35)return 'dusk';
    return minute>=season.sunrise+48&&minute<season.sunset-44?'day':'night';
  }

  function view(state,worldTime,region='valley'){
    const total=timestamp(state,worldTime);
    const days=Math.floor((total+1e-7)/minutesPerDay);
    const minutes=Math.floor(total+1e-7)%minutesPerDay;
    const seasonIndex=Math.floor(days/daysPerSeason)%seasons.length;
    const season=seasons[seasonIndex];
    const dayOfSeason=1+days%daysPerSeason;
    const year=1+Math.floor(days/(daysPerSeason*seasons.length));
    return {
      day:days+1,absoluteDays:days,ageDays:ageDays(state,worldTime),dayOfSeason,year,
      season:season.name,seasonId:season.id,seasonIndex,
      date:dayOfSeason+' '+season.name+' · Anno '+year,
      clock:format(minutes),hour:Math.floor(minutes/60),minute:minutes%60,minutes,
      timestamp:total,phase:lightAt(minutes,season),sunrise:format(season.sunrise),sunset:format(season.sunset),
      sunriseMinutes:season.sunrise,sunsetMinutes:season.sunset,
      shopOpen:minutes>=420&&minutes<1200,canSleep:true,
      ...weatherAt(state,total,region,seasonIndex)
    };
  }

  function sleep(state,worldTime){
    if(!state||!Number.isFinite(worldTime)||worldTime<0)return {ok:false,seconds:0,minutes:0,message:'Il tempo di riposo non è disponibile.'};
    const now=timestamp(state,worldTime);
    const base=Math.floor((now+1e-7)/minutesPerDay)*minutesPerDay;
    let until=base+wakeMinute;
    if(until<=now+1e-7)until+=minutesPerDay;
    const minutes=until-now;
    return {ok:true,minutes,seconds:minutes/minutesPerSecond,wakeAt:until,message:'Hai riposato fino alle 06:00.'};
  }

  window.Calendar={secondsPerDay,daysPerSeason,minutesPerSecond,create,restore,advance,view,sleep,timestamp,minuteAt,absoluteDays,ageDays};
})();

