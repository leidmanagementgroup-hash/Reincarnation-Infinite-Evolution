/* Profilo di laboratorio, incluso soltanto da build.py --urban-lab. */
(() => {
  'use strict';
  const size=window.UrbanLabSize;
  if(![25,50,100,250].includes(size))return;
  const span=512,columns=5,rows=size/(columns*5),neighborhoods=[],lots=[],workers=[];
  const themes=[
    {name:'Logge dei Mercanti',palette:'ruin',tone:1,street:32,plaza:[71,40,4],room:'inn',landmark:'Locanda delle Logge',scenery:[['shrub',3],['rock',4],['pine1',5]],
      types:['hall','workshop','house','house','workshop'],props:[['stall',104,230,7],['stall',155,230,7],['well',309,216,8],['lamp',194,228],['lamp',305,284]]},
    {name:'Officine della Brina',palette:'pine',tone:0,street:27,plaza:[64,38,2,12,0],room:'forge',landmark:'Fucina dei Tre Magli',scenery:[['pine0',5],['pine1',5],['rock',4]],
      types:['workshop','house','hall','workshop','house'],props:[['crate',126,224,7],['cargo',161,227,7],['well',308,216,8],['lamp',181,226],['lamp',318,284]]},
    {name:'Corti del Vetro',palette:'fae',tone:2,street:29,plaza:[65,59,2,-14,0],room:'archive',landmark:'Archivio dei Venti',scenery:[['shrub',3],['pine2',5],['pine1',5]],
      types:['hall','house','workshop','house','hall'],props:[['well',310,217,8],['lamp',206,231],['lamp',301,278],['well',109,319,8],['lamp',315,312]]},
    {name:'Giardini delle Radici',palette:'root',tone:0,street:23,plaza:[67,45,4,-16,8],room:'house',landmark:'Casa delle Talee',scenery:[['shrub',3],['palm',6],['pine2',5]],
      types:['house','house','workshop','hall','house'],props:[['well',309,216,8],['palm',144,235,6],['palm',112,315,6],['lamp',205,228],['lamp',300,284]]},
    {name:'Corte delle Corone',palette:'shore',tone:1,street:35,plaza:[77,49,4,17,5],room:'store',landmark:'Deposito delle Corone',scenery:[['palm',6],['rock',4],['grass',2]],
      types:['hall','house','house','workshop','hall'],props:[['stall',107,226,7],['cargo',155,230,7],['well',309,216,8],['lamp',192,226],['lamp',316,282]]}
  ];
  const plans=[
    [[97,137],[191,151],[352,145],[119,360],[385,375]],
    [[109,154],[193,131],[382,153],[99,369],[348,385]],
    [[101,146],[195,165],[331,145],[134,379],[409,355]],
    [[83,158],[171,124],[363,160],[172,382],[375,340]],
    [[105,143],[199,163],[412,142],[92,366],[342,387]]
  ],districtMarks=[];
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
    const theme=themes[(column+row*2)%themes.length],id='rione-'+column+'-'+row;
    const name=theme.name+(row?' · '+(row+1):''),x=column*span,y=row*span;
    const position=plans[(column+row*2)%plans.length];
    const local=position.map(([dx,dy],i)=>{
      const component=theme.types[i],wide=component==='hall'?66:component==='workshop'?51:40;
      return {id:id+'-lotto-'+(i+1),name:i===0?theme.landmark+(row?' · '+(row+1):''):
        (component==='house'?'Dimora':component==='workshop'?'Bottega':'Sala')+' · '+name+' '+(i+1),
        x:x+dx+(i===2?row%3*10:0),y:y+dy,palette:theme.palette,depth:component==='hall'?34:29,
        widths:[wide,wide+6,wide+10],stories:1+(i+column)%3,component,
        room:i===0&&(row===0||row%3===0)?theme.room:undefined,
        sign:i===0?{inn:'bed',forge:'anvil',archive:'wood',house:'bed',store:'crate'}[theme.room]:null};
    });
    lots.push(...local);
    neighborhoods.push({id,name,column,row,palette:theme.palette,tone:theme.tone,plaza:theme.plaza,
      roadWidth:theme.street,lots:local,props:theme.props,scenery:theme.scenery});
    districtMarks.push({x:x+256,y:y+256,name});
    if(row===0)workers.push({skin:['human','dwarf','elf','goblin','human'][column],tempo:43+column,
      agenda:[[0,local[3].id],[425+column*9,id+'-plaza'],[540+column*11,local[0].id],
        [735,id+'-plaza'],[822,local[2].id],[1110,id+'-plaza'],[1230,local[3].id]]});
  }
  const terrain={
    soil:['#776f4e','#898057','#989162','#a69a68','#b1a672','#c0af7c','#cab789'],
    dry:['#969061','#a49b69','#b0a172','#bda778'],
    track:['#998760','#a69267','#b7a475','#c5b186','#d8c494','#dfcca6'],
    verge:['#978b62','#a29864','#b1a376'],paving:['#82776e','#aba099','#c4b7a3','#d9c8a8'],
    joint:'#8f8577',pebble:['#9c9062','#d6c196'],tuft:['#838457','#92905d','#b1aa75'],
    flowers:['#d3a98c','#e0c78f','#c5cf9f']
  };
  UrbanProfiles.push({id:'city-urban-lab',name:'Confluenza · '+size+' edifici',description:'Laboratorio urbano dei cinque continenti.',
    origin:'valley',market:null,palette:'ruin',revision:1,width:span*columns,height:span*rows,hidden:true,
    spawn:{x:222,y:256},entry:{x:420,y:610},exit:{x:72,y:256},
    entrance:{id:'gate-urban-lab',label:'Entra nel laboratorio urbano',mark:'Accesso a Confluenza'},
    departure:{id:'gate-urban-lab-valley',label:'Torna alla Valle di Vela'},roomExit:'Torna a Confluenza',
    plaza:{x:256,y:256,rx:70,ry:40},landmarks:districtMarks,lots,workers,
    art:{...FiloniSprites,terrain},dryAbove:228,
    furniture:{stall:['stall',1],well:['well',1],lamp:['lamp',1]},
    neighborhoodSize:span,neighborhoods});
})();
