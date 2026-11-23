(() => {
  'use strict';
  /* Identità della stirpe (Living World 2.0, incremento 4). Nessuna regola nuova: rende visibili i vantaggi e i limiti che
     il gioco applica già e li collega alle attività esistenti. I valori si leggono dalle stesse funzioni usate dal motore
     (profili dei bisogni di Daily, attacco naturale di Growth.strike, maturità di Society, dono generico `passive` della
     stirpe); i doni speciali delle nove stirpi originali sono scritti nel motore come costanti e qui sono descritti con i loro
     numeri: tests/verifica-stirpi.cjs controlla che descrizione e comportamento coincidano.
     Prototipo con opportunità e difficoltà dedicate: Slime di rugiada, Goblin dei rovi, Viverna di brina. */
  const gifts={ // engine.js: pozione, uccisione, schivata, mana, danni (righe citate nei commenti della prova)
    slime:'Una pozione ti cura il 67% della vitalità massima (le altre stirpi il 48%).',
    goblin:'Ogni creatura vinta ti lascia 1 Scintilla in più.',
    wolf:'La schivata si ricarica in 0,95 s invece di 1,5 s.',
    elf:'Rigeneri 2,5 mana al secondo invece di 1,65.',
    spirit:'Durante la schivata resti intangibile per 0,55 s invece di 0,34 s.',
    vampire:'Ogni creatura vinta ti restituisce 5 punti vita.',
    demon:'In mischia infliggi ×1,2 ai nemici sotto metà vita.',
    drake:'I colpi magici ti fanno 3 danni in meno; al primo stadio il morso diventa un soffio a distanza.',
    secret:'Ogni creatura vinta ti restituisce 4 punti mana.'
  };
  const statNames={hp:'vitalità massima',mp:'mana massimo',atk:'attacco',def:'difesa',speed:'velocità'};
  const needNames={hunger:'Fame',thirst:'Sete',energy:'Stanchezza',cold:'Freddo',heat:'Caldo'};
  const fmt=n=>String(Math.round(n*100)/100).replace('.',',');
  const has=(s,id,n=1n)=>Inventory.quantity(s,id)>=n;

  function giftText(race){
    if(gifts[race.id])return gifts[race.id];
    const [key,value]=race.passive||[];
    return key?'+'+value+' '+(statNames[key]||key)+'.':'Nessun dono numerico oltre a quanto descritto.';
  }
  function needsProfile(race){
    const r=Daily.racial(race);
    return Object.entries(needNames).map(([key,label])=>{
      const v=r[key],delta=Math.round((v-1)*100);
      return {key,label,factor:v,text:label+' ×'+fmt(v)+(Math.abs(delta)<3?' (come la media)':delta<0?' ('+Math.abs(delta)+'% in meno)':' ('+delta+'% in più)')};
    });
  }
  function attackProfile(s){
    const race=Game.races.find(r=>r.id===s.player.race);
    const a=Growth.strike(s.player.growth,race,s.player),ranged=a.style==='spit';
    return {name:a.name,reach:a.reach,damage:a.damage,ranged,
      text:a.name+' · portata '+a.reach+' px · forza ×'+fmt(a.damage)+(ranged?' · colpo a distanza':' · colpo ravvicinato'),
      boss:ranged?'Colpisci da lontano: la guardia adattiva dei boss, che riduce del 16% i colpi ravvicinati, non riduce i tuoi.':
        'Colpisci da vicino: quando un boss si mette in guardia i tuoi colpi ravvicinati perdono il 16%; allontanati o cambia ritmo.'};
  }
  // Predisposizione: pesa sul ramo d'assalto (Forza, Destrezza, Magia) o su quello di sostegno; contano anche le abitudini.
  function branchHint(s,race,bio){
    const side=['Forza','Destrezza','Magia'].includes(bio.aptitude)?0:1;
    const forms=race.forms||[],name=forms[side]?.name||forms[side]?.[0]||(side?'ramo di sostegno':'ramo d’assalto');
    return 'La predisposizione ('+bio.aptitude+') pesa verso '+name+'; contano anche scontri, magie, mestieri e tempo nel territorio affine ('+bio.affinity+').';
  }

  // Opportunità e difficoltà dedicate, con lo stato attuale del personaggio e le attività collegate.
  function prototype(s,race){
    const p=s.player,d=Daily.racial(race.id),list=[];
    const offer=()=>{try{return Daily.view(s).quests.find(q=>q.category==='Evento');}catch{return null;}};
    const request=id=>window.Requests?.view(s).find(r=>r.id===id);
    if(race.id==='slime'){
      const tessa=window.WorldMemory?.merchantView(s);
      list.push({kind:'Opportunità',title:'Pozioni più efficaci',text:'Una pozione ti cura il 67% della vitalità invece del 48%. Ivo distilla due pozioni con 2 erbe e 1 minerale; Tessa le vende a '+Game.rules.potionPrice+' Scintille'+(tessa?.reserve.open?' e ne tiene una da parte per te a emporio chiuso':' e, quando si fiderà di te, ne terrà una da parte')+'.',status:'Pozioni con te: '+p.potions});
      list.push({kind:'Opportunità',title:'Viaggi con poche provviste',text:'Fame ×'+fmt(d.hunger)+' ed energia ×'+fmt(d.energy)+': ti stanchi e ti affami più lentamente delle altre stirpi.',status:'Fame '+Math.round(s.daily?.hunger??100)+' · energia '+Math.round(s.daily?.energy??100)});
      list.push({kind:'Difficoltà',title:'Sete e sbalzi di temperatura',text:'Sete ×'+fmt(d.thirst)+', freddo ×'+fmt(d.cold)+', caldo ×'+fmt(d.heat)+': riempi la borraccia alla fonte della locanda (fino a 3) e porta una mantella di lana per il freddo.',
        status:'Borracce '+Inventory.quantity(s,'water')+' · mantella '+(has(s,'woolcloak')?'sì':'no')});
    }else if(race.id==='goblin'){
      const o=offer(),guild=s.guild?.active;
      list.push({kind:'Opportunità',title:'Mani svelte nella caccia',text:'Ogni creatura vinta ti lascia 1 Scintilla in più: rende di più nelle cacce, come «Impronte vicino a Vela» (offerta del giorno quando i lupi si fanno vicini) e gli incarichi di caccia della gilda.',
        status:'Creature vinte '+p.kills+' · Scintille in più ricevute '+p.kills+(o?.id==='patrol'?' · oggi c’è «Impronte vicino a Vela»':'')+(guild?.type==='hunt'?' · caccia della gilda in corso':'')});
      list.push({kind:'Opportunità',title:'Destrezza e mestieri',text:'La predisposizione alla Destrezza rende più probabili i talenti legati alla destrezza e spinge verso il ramo d’assalto; forgia, cucito e lavori di bottega allenano la Destrezza.',
        status:'Fabbro livello '+Life.level(s,'smith')});
      list.push({kind:'Difficoltà',title:'Nessun vantaggio sui bisogni',text:'Fame, sete, stanchezza e clima pesano come per la media delle stirpi, e la spazzata è un colpo ravvicinato: contro un boss in guardia perde il 16%.',status:''});
    }else if(race.id==='wyvern'){
      const o=offer(),wool=request('wool-cloaks');
      list.push({kind:'Opportunità',title:'Soffio a distanza contro i boss',text:'Il Soffio di nevischio colpisce da 65 px come un proiettile: la guardia adattiva dei boss non lo riduce.',status:''});
      list.push({kind:'Opportunità',title:'A tuo agio nel caldo',text:'Caldo ×'+fmt(d.heat)+' e affinità con la Cava delle Braci: miniera e forgia senza patire il calore. Al borgo, l’offerta «Minerale per il banco» chiede proprio minerale.',
        status:o?.id==='stone'?'Oggi c’è «Minerale per il banco»':'Offerta del giorno: '+(o?.name||'nessuna')});
      list.push({kind:'Difficoltà',title:'Il freddo ti colpisce di più',text:'Freddo ×'+fmt(d.cold)+': sul passo di Nordharyn (−28°) cuci una mantella di lana al banco di Ivo (2 lana), che riduce il freddo del 30%. Ivo stesso, quando arriva il freddo, cerca lana per le mantelle.',
        status:'Mantella '+(has(s,'woolcloak')?'sì':'no')+' · lana '+Inventory.quantity(s,'wool')+(wool?' · richiesta di Ivo: '+({open:'disponibile',active:'in corso',ready:'pronta',rest:'completata di recente',closed:'non ora'}[wool.state]):'')});
    }
    return list;
  }

  function view(s){
    if(!s?.player)return null;
    const race=Game.races.find(r=>r.id===s.player.race);
    if(!race)return null;
    const bio=Growth.biology(race.id),mature=window.Society?.mature?Society.mature(s):null;
    return {id:race.id,name:race.name,rarity:race.rarity,chance:fmt(race.weight)+'%',
      gift:giftText(race),numericGift:Object.hasOwn(gifts,race.id),attack:attackProfile(s),needs:needsProfile(race.id),
      insulation:'Con una mantella di lana nello zaino il freddo pesa il 30% in meno.',
      bio,branch:branchHint(s,race,bio),
      courtship:mature?(mature.ready?'Puoi proporre un corteggiamento a un abitante amico.':mature.reason):'',
      prototype:prototype(s,race)};
  }
  window.Lineage={view,gifts};
})();
