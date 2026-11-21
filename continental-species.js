/* New lineages extend the catalogue and use the game's existing pixel sprites as a base. */
(() => {
  'use strict';
  const data=[
    ['human','Umano delle vie','Comune',10,[82,35,10,3,87],'Tenacia. +4 vitalità massima.','I viandanti tramandano mestieri e tecniche sotto le insegne delle strade.',['Guardia del cammino','ward'],
      [['Spadaccino delle vie','Taglio del crocicchio','cleave'],['Studioso dei ponti','Grammatica di luce','bolt']],
      [['Campione dei sentieri','Discesa della guardia','burst'],['Custode delle pergamene','Libro dei ritorni','bloom']],['hp',4]],
    ['dwarf','Nano dei filoni','Comune',9,[96,32,11,4,79],'Costituzione dei filoni. +2 difesa.','Nelle sale minerarie intaglia legno, rame e iscrizioni.',['Battuta di rame','cleave'],
      [['Battipietra','Martello dei pilastri','burst'],['Incisore di sigilli','Rune di soglia','ward']],
      [['Maestro delle volte','Frattura del rame','fan'],['Custode della venatura','Patto del cristallo','bloom']],['def',2]],
    ['skeleton','Scheletro errante','Rara',5,[76,37,10,4,82],'Ossa leggere. +2 difesa.','Si desta con memorie sparse, libero di scegliere quali legami ricostruire.',['Vertebra d’argento','bolt'],
      [['Scheletro di lamiera','Giro d’ossa','cleave'],['Custode dei lumini','Lucerna sepolta','familiar']],
      [['Cavaliere d’ossa chiare','Schegge del meriggio','fan'],['Custode delle veglie','Cerchio dei nomi','bloom']],['def',2]],
    ['bear','Orso dei larici','Rara',5,[103,30,12,4,77],'Mantello robusto. +7 vitalità massima.','Tra le conifere segue i frutti maturi e protegge le rive.',['Zampa di torba','cleave'],
      [['Orso delle creste','Ruzzolone dei larici','burst'],['Orso delle sorgenti','Passo del disgelo','ward']],
      [['Grande Orso Boreale','Urto di ghiaccio','fan'],['Orso degli alvei','Disgelo vivo','bloom']],['hp',7]],
    ['fairy','Fata del polline','Epica',3.2,[66,55,10,2,95],'Polline lucente. +7 mana massimo.','Le ali trattengono segnali che cambiano con il profumo dei fiori.',['Polline errante','fan'],
      [['Fata dei venti alti','Ali controvento','bolt'],['Fata dei semi','Danza dei semi','bloom']],
      [['Araldo dei vortici','Corona di polline','burst'],['Custode del giardino sospeso','Fioritura celeste','familiar']],['mp',7]],
    ['elemental','Elementale di scoria','Epica',2.8,[90,44,12,4,81],'Nucleo di scoria. +6 mana massimo.','Muta consistenza alternando le rocce fredde ai calori del sottosuolo.',['Goccia di scoria','burst'],
      [['Vampa di roccia','Anello del calore','fan'],['Elemento di pomice','Pelle di spugna','ward']],
      [['Signore delle correnti calde','Fornace del respiro','burst'],['Custode delle pietre porose','Linfa minerale','bloom']],['mp',6]],
    ['wyvern','Viverna di brina','Leggendaria',1,[84,36,11,3,90],'Ali sottili. +5 velocità.','Da giovane plana per brevi tratti. Il volo arriva per gradi.',['Soffio di nevischio','fan'],
      [['Viverna dei crinali','Spira d’inverno','cleave'],['Viverna delle nebbie','Banco di nebbia','ward']],
      [['Viverna re delle quote','Martello del nord','burst'],['Viverna delle alte brume','Velo di brina','bloom']],['speed',5]],
    ['griffin','Grifone di sabbia','Leggendaria',0.95,[88,39,11,3,88],'Penne portanti. +4 velocità.','Annoda fili e penne per ricordare le vie attraversate.',['Becco del vento','cleave'],
      [['Grifone di mezzogiorno','Fendente delle dune','fan'],['Grifone delle rotte','Memoria dei nidi','familiar']],
      [['Guardiano delle Mille Vele','Raffica d’oro','burst'],['Grifone degli orizzonti','Vento dei ritorni','bloom']],['speed',4]]
  ];
  window.EvolutionContent={...window.EvolutionContent,lineages:window.EvolutionContent.lineages.concat(data)};
  window.ContinentalBiology={
    human:['Giovane adulto',6570,'valley','intelligence','Corpo agile e mani adatte agli strumenti.','Adattabilità fra mestieri.','Doti elementali limitate all’inizio.','sweep','Taglio di guardia'],
    dwarf:['Giovane adulto',8400,'quarry','strength','Corporatura compatta e robusta.','Tenuta in miniera.','Meno rapido in campo aperto.','slam','Battuta di fucina'],
    skeleton:['Risvegliato',3,'rift','vitality','Ossa animate da una scintilla di memoria.','Regge urti e attrito.','Ha poca vitalità al risveglio.','claw','Colpo di falangi'],
    bear:['Cucciolo',280,'valley','vitality','Manto folto e zampe pesanti.','Fisico robusto.','Passo lento nei tratti lunghi.','slam','Zampata larga'],
    fairy:['Giovane',820,'rift','magic','Ali leggere e polline conduttore.','Buona affinità arcana.','Resiste poco agli urti.','spit','Salva di polline'],
    elemental:['Scintilla giovane',10,'quarry','magic','Nucleo caldo tra frammenti di roccia.','Conserva mana nel nucleo.','Il peso rallenta le manovre.','spit','Sputo di scoria'],
    wyvern:['Cucciolo',350,'quarry','dexterity','Due ali e zampe leggere.','Plana e cambia direzione facilmente.','Il soffio giovane ha poca potenza.','spit','Soffio di nevischio'],
    griffin:['Cucciolo',390,'rift','dexterity','Piume, becco e zampe possenti.','Reagisce in fretta agli ostacoli.','Il volo prolungato richiede crescita.','claw','Artiglio di sabbia']
  };
  const art=window.ActorArt;
  const shapes={human:['merchant','#89a9b1'],dwarf:['smith','#c2a06b'],skeleton:['spirit','#e0dac8'],bear:['wolf','#a98367'],
    fairy:['sylph','#d0bd87'],elemental:['ember','#e3a676'],wyvern:['drake','#b9d5de'],griffin:['harpy','#c7a46f']};
  function accent(c,kind,x,y,opts,scale=1){
    const p=shapes[kind]?.[1];if(!p)return;
    c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);
    const t=opts?.t||0,f=Number(opts?.evolution)||0,mirror=opts?.dir==='left'?-1:1;
    const px=(c1,xx,yy,w,h)=>{c.fillStyle=c1;c.fillRect(xx,yy,w,h);};
    if(kind==='skeleton'){
      px('#2c4050',-5,-20,11,10);px(p,-4,-19,9,7);px('#304251',-3,-16,2,2);px('#304251',2,-16,2,2);
      px(p,-3,-12,7,2);px(p,-2,-9,5,1);px(p,-3,-7,7,1);
    }else if(kind==='bear'){
      px('#443c41',-8,-19,5,5);px('#443c41',4,-19,5,5);
      px(p,-7,-18,3,3);px(p,5,-18,3,3);px(p,-4,-9,9,4);px('#4c3c3d',-1,-8,3,2);
    }else if(kind==='human'||kind==='dwarf'){
      px('#3d4850',-6,-22,12,3);px(p,-5,-22,10,2);
      if(kind==='dwarf'){px('#ae9d82',-4,-13,9,4);px('#d7c8a6',-2,-12,5,3);}
    }else{
      const dy=Math.sin(t*5)>.5?-1:0;
      px(p,-10*mirror,-16+dy,4,2);px(p,7*mirror,-16+dy,4,2);
      px(p,-7,-12+dy,2,2);px(p,6,-12+dy,2,2);
    }
    if(f>0){px(f%2?'#f4d996':'#b4ded5',-5,-24,11,1);px('#ead7aa',-1,-26,3,4);}
    if(f>2){px(p,-9,-18,2,8);px(p,8,-18,2,8);}
    c.restore();
  }
  function draw(c,kind,x,y,opts={}){
    const a=shapes[kind];
    if(!a){art.draw(c,kind,x,y,opts);return;}
    art.draw(c,a[0],x,y,opts);
    accent(c,kind,x,y,opts);
  }
  function portrait(c,kind,x,y,size,opts={}){
    const a=shapes[kind];
    if(!a){art.portrait(c,kind,x,y,size,opts);return;}
    art.portrait(c,a[0],x,y,size,opts);
    accent(c,kind,x+size*.5,y+size*.81,opts,size/37);
  }
  window.ActorArt={...art,draw,portrait};
})();

