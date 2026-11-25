(() => {
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const disabled=flag=>flag?' disabled':'';
  function btn(label,action,style='',value=null) {return '<button class="btn '+style+'" data-do="'+action+'"'+(value===null?'':' data-value="'+esc(value)+'"')+'>'+esc(label)+'</button>';}
  // Memoria del mondo (Living World 2.0): che cosa ricorda Tessa e che cosa ne deriva. Testo sempre con esc().
  function tessaMemory(p){
    const s=Game.s;if(!window.WorldMemory||!s)return '';
    const m=WorldMemory.merchantView(s),rules=WorldMemory.rules;
    let out=h('Tessa ti ricorda')+'<p>'+esc(m.level)+(m.recent.length?'':' · non avete ancora storie in comune')+'</p>';
    out+=m.recent.map(e=>row('Giorno '+e.day,(e.bad?'⚠ ':'')+e.text)).join('');
    const need=m.short>0?'L’emporio è a corto di erbe di rugiada ('+m.stock+' su '+m.target+').':'Le erbe di rugiada non mancano.';
    out+=row('Erbe per l’emporio',need+(m.give.ok?'':' '+m.give.why),cmd(m.give.ok?'Consegna '+m.give.count+' · +'+m.give.pay+' Scintille':'Consegna','tieGive','',!m.give.ok),icon('herb'));
    if(m.promise)out+=row('La tua parola',m.promise.given+' su '+m.promise.need+' erbe · '+m.promise.dueLabel);
    else if(m.short>0)out+=row('La tua parola',m.distrust?'«Dopo l’ultima volta preferisco non contarci.»':'Prometti '+rules.PROMISE_NEED+' erbe entro domani sera. Mancare la parola pesa più di un aiuto.',cmd('Prometti','tiePromise','',!m.canPromise));
    const r=m.reserve;
    out+=row('Pozione messa da parte',r.open?(r.shopOpen?'A emporio chiuso Tessa ti tiene una pozione al giorno, allo stesso prezzo.':r.used?'Già ritirata oggi.':'Tessa l’ha tenuta per te.'):'Quando Tessa si fiderà di te, terrà una pozione per le ore di chiusura.',
      cmd('Ritira · '+Game.rules.potionPrice+' Scintille','tieReserve','',!r.open||r.shopOpen||r.used||p.gold<Game.rules.potionPrice),icon('potion'));
    return out;
  }
  // Identità della stirpe (Living World 2.0): valori letti dalle regole del gioco, opportunità e difficoltà collegate.
  function lineageSection(){
    const s=Game.s,l=window.Lineage&&s?Lineage.view(s):null;
    if(!l)return '';
    // Rarità, probabilità e dono sono già nell'intestazione: qui solo ciò che aggiunge numeri e collegamenti.
    let out=h('Identità della stirpe')+(l.numericGift?row('Dono in numeri',l.gift):'')+
      row('Attacco naturale',l.attack.text+'. '+l.attack.boss)+
      row('Bisogni della stirpe',l.needs.map(n=>n.text).join(' · ')+'. '+l.insulation)+
      row('Corpo e indole',[l.bio.body,l.bio.strength,l.bio.weakness].filter(Boolean).join(' · '))+
      row('Verso l’evoluzione',l.branch)+(l.courtship?row('Legami',l.courtship):'');
    if(l.prototype.length)out+=h('Che cosa ti offre la tua stirpe')+l.prototype.map(o=>row(o.kind+' · '+o.title,o.text+(o.status?' · '+o.status:''))).join('');
    return out;
  }
  // Richieste del mondo (Living World 2.0): nel diario tutte, nel dialogo di una fonte solo la sua. Testo passato da row/h.
  function requestRows(only){
    const s=Game.s;if(!window.Requests||!s)return '';
    const list=Requests.view(s).filter(r=>!only||r.id===only).filter(r=>only||r.state!=='closed'||r.done);
    if(!list.length)return '';
    const states={open:'Disponibile oggi',active:'In corso',ready:'Pronta da riscuotere',rest:'Completata di recente',closed:'Non disponibile',expired:'Scaduta'};
    return h('Richieste del mondo')+list.map(r=>{
      const timing=r.left!==null?' · '+(r.left<0?'tempo scaduto':r.left>0?'scade fra '+r.left+(r.left===1?' giorno':' giorni'):'scade oggi'):' · durata '+r.days+(r.days===1?' giorno':' giorni');
      const text=[states[r.state],r.from,r.need,r.state==='active'||r.state==='ready'?r.goal:'',r.state==='rest'?'':r.reward+' Scintille'+timing,r.why,(r.state==='open'||r.state==='ready')&&!r.atSource?r.sourceHint:''].filter(Boolean).join(' · ');
      const control=r.state==='open'?cmd('Accetta','requests',{op:'accept',id:r.id},!r.atSource):r.state==='ready'?cmd('Riscuoti','requests',{op:'claim',id:r.id},!r.atSource,'primary'):'';
      return row(r.name,text,control);
    }).join('');
  }
  // Voci dai continenti (Living World 2.0): fama regionale e notizie ancora in viaggio lungo le rotte.
  function renownRows(){
    const s=Game.s;if(!window.Renown||!s)return '';
    const list=Renown.view(s);
    if(!list.some(r=>r.known.length||r.coming.length))return '';
    return h('Voci dai continenti')+list.map(r=>row(r.continent+' · '+r.level,[r.culture,r.note,
      ...r.known.map(k=>'Giorno '+k.day+': '+(k.bad?'⚠ ':'')+k.text+(k.origin!==r.continent?' (voce da '+k.origin+')':'')),
      ...r.coming.map(c=>'In viaggio: «'+c.text+'» arriverà il giorno '+c.day)].join(' · '))).join('');
  }
  function npcMemory(id){
    const s=Game.s,who=window.WorldMemory&&s?WorldMemory.view(s).find(x=>x.id===id):null;
    if(!who||!who.episodes.length)return '';
    return h(who.name+' ricorda')+who.episodes.map(e=>row('Giorno '+e.day,(e.bad?'⚠ ':'')+e.text+(e.source==='witness'?' (l’ha visto di persona)':e.source==='rumor'?' (per sentito dire)':''))).join('');
  }
  function cmd(label,action,value='',off=false,style='') {return '<button class="btn '+style+'" data-cmd="'+esc(action)+'" data-value="'+esc(typeof value==='object'?JSON.stringify(value):value)+'"'+disabled(off)+'>'+esc(label)+'</button>';}
  const picture=(kind,n=64,evo=0)=>'<canvas data-art="portrait" data-kind="'+esc(kind)+'" data-evo="'+evo+'" width="'+n+'" height="'+n+'"></canvas>';
  const portrait=(kind,n=64,evo=0)=>'<div class="portraitCell">'+picture(kind,n,evo)+'</div>';
  const icon=(kind)=>'<canvas class="itemArt" width="32" height="32" data-art="icon" data-kind="'+esc(kind)+'"></canvas>';
  const stat=(name,val)=>'<div class="stat"><small>'+esc(name)+'</small><b>'+esc(val)+'</b></div>';
  const h=(text)=>'<h3 class="sectionTitle">'+esc(text)+'</h3>';
  const row=(name,description,control='',art='')=>'<div class="row">'+art+'<div class="detail"><strong>'+esc(name)+'</strong>'+(description?'<small>'+esc(description)+'</small>':'')+'</div>'+control+'</div>';
  function actions(...contents){return '<div class="actions">'+contents.join('')+'</div>';}
  function rarity(r){return '<span class="rare" style="color:'+(/^#[a-f\d]{3,8}$/i.test(r.color)?r.color:'#edc783')+'">'+esc(r.rarity)+'</span>';}
  const keys=[['W A S D / ↑ ↓ ← →','Movimento'],['J / clic sinistro','Attacco naturale · tieni premuto per concatenare i colpi'],['SPAZIO','Schivata'],['1 · 2 · 3','Abilità assegnate'],['R','Abilità innata'],['E','Parla, raccogli, lavora o attraversa un passaggio'],['Q','Usa una pozione'],['I · K · V','Inventario, abilità, evoluzioni'],['C · B','Personaggio, bestiario'],['M · L','Mappa, diario'],['U · O','Mestieri, abitanti e famiglia'],['N','Calendario, bisogni e riposo'],['T · G','Proprietà, gilda'],['H','Guida e indicazioni'],['ESC / P','Pausa o chiudi il pannello']];
  const allKeys=()=>'<div class="keys">'+keys.map(([k,t])=>'<div><kbd>'+k+'</kbd></div><b>'+t+'</b>').join('')+'</div>';
  let detailId='';
  function render(page,detail){
    const p=Game.s?.player,v=p?Game.view():null,s=Game.s,playing=window.UI.screen==='play',rules=Game.rules||{};
    const top=$('#panelTitle'),kicker=$('#panelKicker'),tabs=$('#tabs'),body=$('#panelBody');
    tabs.replaceChildren();let html='';
    const titles={pause:'In pausa',settings:'Opzioni e comandi',birth:'Il tuo risveglio',lineages:'Grimorio delle stirpi',lineage:'Scheda della stirpe',character:'Personaggio',inventory:'Inventario',skills:'Abilità',evolution:'Albero delle evoluzioni',journal:'Diario di viaggio',bestiary:'Bestiario',map:'Mappa della valle',elder:'La custode delle radici',merchant:'Emporio del borgo',smith:'Forgia di Vela',victory:'Il bosco ricorda',confirmNew:'Iniziare una nuova vita?',confirmImport:'Caricare questa partita?'};
    Object.assign(titles,{spellbook:'Enciclopedia delle abilità',help:'Guida di viaggio',map:'Carta della regione',atlas:'Atlante dei cinque continenti',continent:'Continente',statue:'Patto degli Ardel',ending:'La promessa di Lùmora',activities:'Attività e mestieri',properties:'Proprietà e costruzioni',confirmDemolish:'Demolire la costruzione?',society:'Abitanti e famiglia',guild:'Gilda degli avventurieri'});
    Object.assign(titles,{workshop:'La pratica dei mestieri',practice:Game.practiceView()?.title||'Attività',living:'Calendario e riposo',economy:'Mercato e banca'});
    Object.assign(titles,{gear:'Equipaggiamento',legendary:'Registro del santuario',conflicts:'Pattuglie e soccorso',reputation:'Reputazione e titoli','elder-record':'Registro di Nerea'});
    Object.assign(titles,{urban:'Velaris · Abitanti e commissioni','city-site':'Velaris'});
    const tabSet=[['character','Personaggio'],['inventory','Inventario'],['gear','Equipaggiamento'],['skills','Abilità'],['evolution','Evoluzioni'],['activities','Mestieri'],['journal','Diario'],['bestiary','Bestiario'],['map','Mappa'],['society','Abitanti'],['properties','Proprietà'],['guild','Gilda']];
    $('#dialog').dataset.page=page;
    top.textContent=titles[page]||'Lùmora';kicker.textContent=playing?(v.campaignTitle||'Le radici di Lùmora'):'Reincarnation · Infinite Evolution';
    if(tabSet.some(([id])=>id===page)){
      tabs.innerHTML=tabSet.map(([id,label])=>'<button data-do="'+id+'" class="'+(page===id?'active':'')+'"'+(page===id?' aria-current="page"':'')+'>'+label+'</button>').join('');
    }
    switch(page){
      case 'confirmNew':html='<p>Il gioco estrarrà specie, predisposizioni e abilità innata per la nuova vita. La nuova incarnazione prenderà il posto della partita salvata su questo browser.</p>'+actions(btn('Conserva la partita','close'),btn('Nuova incarnazione','confirmNew','primary'));break;
      case 'confirmImport':html='<p>Il viaggio contenuto nel file selezionato prenderà il posto del salvataggio locale.</p>'+actions(btn('Annulla','close'),btn('Importa e gioca','confirmImport','primary'));break;
      case 'pause':html='<p class="lead">'+esc(v.formName)+' · Livello '+p.level+' · '+esc(v.location)+'</p>'+actions(btn('Riprendi il viaggio','resume','primary'),btn('Salva partita','save'),btn('Guida di viaggio','help'),btn('Opzioni e comandi','settings'))+h('Taccuino')+actions(...tabSet.map(([id,label])=>btn(label,id)))+actions(btn('Salva e torna al titolo','title'));break;
      case 'settings':
        html=row('Audio',Score.enabled&&Score.started?'Musica ed effetti attivi':'Musica ed effetti disattivati',btn(Score.enabled&&Score.started?'Disattiva':'Attiva','audio'))+
          '<div class="row"><label for="audioVolume">Volume</label><input class="volume" id="audioVolume" type="range" min="0" max="100" value="'+Math.round(Score.volume*100)+'"><span id="volVal">'+Math.round(Score.volume*100)+'%</span></div>'+
          row('Particelle ambientali','Pioggia, polline e lucciole durante il viaggio.',btn(UI.effects?'Attive':'Disattivate','effects'))+
          row('Indicazioni sul campo','Freccia verso l’obiettivo e distanza approssimativa.',btn(UI.guidance?'Attive':'Disattivate','guidance'))+
          h('Comandi')+allKeys()+'<p class="caption">Su schermo tattile usa le frecce e tocca le icone delle azioni.</p>'+
          h('Partita')+'<p>Il gioco conserva i progressi in questo browser. Una copia esportata ti permette di portarli su un altro dispositivo.</p>'+actions(...(playing?[btn('Salva adesso','save'),btn('Esporta partita','export')]:[]),btn('Importa partita','import'),btn('Schermo intero','full'));break;
      case 'help':
        html=playing?objectives(v,p)+actions(btn('Apri la mappa','map','primary'),btn('Atlante','atlas'),btn('Segna Velaris','trackCity'),btn('Attività e mestieri','activities'),btn(UI.guidance?'Disattiva indicazioni':'Attiva indicazioni','guidance')):'';
        html+=h('Combattimento')+'<p>Concatena gli attacchi naturali con J e usa R per l’abilità innata. Schiva con Spazio quando vedi il segnale di un colpo. Usa K per assegnare le altre tecniche.</p>'+
          h('Crescita e professioni')+'<p>Le attività allenano le statistiche e i mestieri. Apri l’albero con V per osservare quali abitudini stanno indirizzando la prossima trasformazione. Premi U per trovare i luoghi di lavoro.</p>'+
          h('I cinque continenti')+'<p>Dalla Valle di Lùmora segui la Via degli Antichi. L’atlante permette di segnare una statua e seguirne i passaggi. Dopo una sconfitta puoi recuperare il borsello nel punto indicato sulla mappa.</p>'+
          h('Proprietà e gilda')+'<p>Vicino a un lotto premi T per costruire. Iscriviti con E davanti a una bacheca, completa gli incarichi e recluta adulti iscritti al registro.</p>'+h('Comandi')+allKeys();break;
      case 'lineages':
        html='<p>Apri una stirpe per confrontare dono, statistiche e rami evolutivi.</p>'+catalogControls('Cerca una stirpe',Game.races.map(r=>r.rarity),'Rarità')+'<div class="lineageGrid">'+Game.races.map(r=>{
          const secret=r.secret && p?.race!==r.id,name=secret?'Stirpe celata':r.name;
          return '<button class="lineageCard" data-do="lineage" data-value="'+esc(r.id)+'" '+catalogAttrs(secret?name:[name,...r.forms.flatMap(f=>[f.name,f.next?.name])].join(' '),r.rarity)+'>'+
            (secret?'<span class="hiddenSpecies" aria-hidden="true">?</span>':picture(r.id,54))+'<strong>'+esc(name)+'</strong>'+rarity(r)+'</button>';
        }).join('')+'</div>';break;
      case 'lineage':{
        if(detail)detailId=detail;const r=Game.races.find(x=>x.id===detailId)||Game.races[0];
        if(r.secret && p?.race!==r.id){html='<p class="lead">Una pagina argentata è rimasta bianca. Il nome di questa creatura appare soltanto a chi nasce sotto il suo segno.</p>'+actions(btn('Tutte le stirpi','lineages'));break;}
        html=feature(r,r.name)+lineageStats(r)+h('Dono di specie')+'<p>'+esc(r.trait)+'</p>'+biology(window.Growth?.biology?.(r))+h('Rami evolutivi')+branches(r,null)+actions(btn('Tutte le stirpi','lineages'));break;}
      case 'birth':
        kicker.textContent='Reincarnazione';html=feature(v.race,v.formName)+innatePanel(v.growth?.innate,false)+
          '<div class="narrative"><p class="lead">Ti risvegli al Borgo di Vela. Nerea ti fa cenno di avvicinarti.</p></div>'+
          '<p class="caption"><kbd>WASD</kbd> Muoviti &nbsp; <kbd>E</kbd> Parla &nbsp; <kbd>R</kbd> Usa l’innata</p>'+actions(btn('Entra nella valle','resume','primary'),btn('Predisposizioni','character'));break;
      case 'character':
        html=feature(v.race,v.formName,UI.appearance(p))+'<div class="stats">'+stat('Livello',p.level)+stat('HP',Math.ceil(p.hp)+' / '+v.hpMax)+stat('MP',Math.ceil(p.mp)+' / '+v.mpMax)+stat('Attacco',v.attack)+stat('Difesa',v.defense)+stat('Velocità',Math.round(v.speed))+'</div>'+
          row('Esperienza',Math.floor(p.xp)+' / '+v.xpNext+' PE per il livello successivo.')+row('Dono di specie',v.race.trait)+lineageSection()+
          growthProfile(v.growth)+innatePanel(v.growth?.innate,false)+row('Reputazione a Vela',p.rep+' punti · '+(p.rep>=3?'Alleato del borgo':'Viandante'))+h('Tratti assimilati')+
          (p.traits.length?p.traits.map(id=>row(Game.traits[id]?.name||id,Game.traits[id]?.description)).join(''):'<p>Le creature sconfitte lasciano echi. Nel pannello Abilità puoi usarli per assimilare un tratto.</p>');
        html+=h('Tecniche acquisite')+'<p>'+esc(Object.keys(p.skills).map(id=>Game.skills[id]?.name).filter(Boolean).join(' · '))+'</p>'+actions(btn('Gestisci abilità','skills'),btn('Equipaggiamento','gear'),btn('Reputazione e titoli','reputation'));break;
      case 'journal':
        html=objectives(v,p)+campaignRoad(v)+h('Incarico secondario')+row('La commissione del borgo',v.sideQuest)+
          '<div class="stats">'+stat('Creature vinte',p.kills)+stat('Reputazione',p.rep)+stat('Borsello',Economy.wallet(p.gold).label)+'</div>'+
          (window.Lantern?h('Voci del bosco')+'<p>'+esc(Lantern.hint(s))+'</p>':'')+LifePanels.quests(s)+requestRows()+renownRows()+worldNotes(v.life)+
          actions(btn('Apri la mappa','map'),btn('Incarichi della gilda','guild'),btn('Reputazione e titoli','reputation'),
            ...(Legendary.view(s).discovered?[btn('Registro del santuario','legendary')]:[]));break;
      case 'activities':
        html=actions(btn('Pesca, forgia, orto e allevamento','workshop','primary'),btn('Calendario e riposo','living'),btn('Mercato e banca','economy'))+activityPanel(v.life,p);break;
      case 'workshop':
        html=LifePanels.workshop(s,detail)+actions(btn('Riparazioni e incantamenti','gear'));break;
      case 'practice':
        html=PracticePanel.render(Game.practiceView())+actions(btn('Torna ai mestieri','workshop','',Game.practiceView()?.kind));break;
      case 'living':
        html=LifePanels.living(s);break;
      case 'economy':
        html=EconomyPanel.render(s);break;
      case 'properties':
        html=propertyPanel(v.build,p);break;
      case 'confirmDemolish':
        html='<p>La costruzione sarà rimossa dal lotto. Recupererai parte dei materiali.</p>'+
          actions(btn('Annulla','properties'),cmd('Demolisci','build',{op:'remove',id:Number(detail),confirm:true},false,'primary'));break;
      case 'society':
        html=UrbanWorld.inCity(v.region)?urbanPanel(s,detail):societyPanel(Society.view(s,detail),v.region)+actions(btn('Pattuglie e soccorso','conflicts'));break;
      case 'urban':
        html=urbanPanel(s,detail);break;
      case 'city-site':{
        const service=UrbanServices.view(s,detail);
        if(!service)break;
        top.textContent=service.name;
        html='<p class="lead">'+esc(service.description)+'</p>'+(service.note?'<p class="narrative">'+esc(service.note)+'</p>':'')+
          (service.allowed?actions(cmd(service.action,'city-service',{id:detail,op:service.op},false,'primary')):'')+actions(btn('Mappa','map'));
        break;}
      case 'conflicts':
        html=window.ConflictPanel?.render(s,detail)||'';
        if(detail==='elder'&&v.elderLost)html+=elderArchive(s,v);
        html+=actions(btn('Riprendi il viaggio','resume'));
        break;
      case 'reputation':{
        const renown=Reputation.view(s);
        html='<p>Scambi, incarichi, viaggi, soccorsi e imprese influenzano la reputazione, da −100 a +100.</p>'+
          h('Titoli ottenuti')+(renown.titles.length?renown.titles.map(title=>row(title.name,title.description)).join(''):'<p>Le imprese annotate nel diario possono diventare titoli.</p>');
        for(const [label,entries] of [['Città',renown.towns],['Autorità regionali',renown.realms],['Gilde',renown.guilds],['Fazioni',renown.factions]]){
          html+=h(label)+entries.map(a=>row(a.name,a.rank+' · '+(a.score>0?'+':'')+a.score)).join('');
        }
        html+=actions(btn('Torna al personaggio','character'));
        break;}
      case 'legendary':{
        const found=Legendary.view(s);
        if(!found.discovered){html='<p>Nessun santuario leggendario è stato scoperto in questa vita.</p>';break;}
        top.textContent=found.name;
        const inscription=found.lore.find(item=>item.id===detail);
        html=(inscription?h(inscription.title)+'<p class="narrative">'+esc(inscription.text)+'</p>':'')+
          '<p class="lead">'+esc(found.description)+'</p>'+row('Ingresso',found.regionName,btn('Segna l’ingresso','trackLegendary'))+
          row('Sovrano',found.ruler)+row('Ecosistema',found.ecology)+
          (Number.isFinite(found.heirInDays)?row('Successione','Fra '+found.heirInDays+' giorni un nuovo sovrano potrebbe reclamare il trono.'):'')+
          row('Visite',found.visits.toLocaleString('it-IT')+(found.claimed?' · Ricompense originali ottenute':''));
        if(found.canClaim)html+=actions(cmd('Rivendica il trono','legendary',{op:'claim'},false,'primary'));
        if(found.lore.length)html+=h('Iscrizioni lette')+found.lore.map(a=>row(a.title,a.text)).join('');
        html+=actions(btn('Riprendi il viaggio','resume'));
        break;}
      case 'guild':
        html=guildPanel(v.guild,s);break;
      case 'inventory':
        html=actions(btn('Equipaggiamento e riparazioni','gear','primary'))+LifePanels.inventory(s);break;
      case 'gear':
        html=GearPanel.render(s,detail)+((UrbanWorld.kind(v.region)==='forge'||UrbanDistricts.roomKind(v.region)==='forge')?actions(btn('Prova di forgiatura','workshop','primary','smithing')):'')+
          actions(btn('Torna all’inventario','inventory'));break;
      case 'skills':{
        html=innatePanel(v.growth?.innate,true)+h('Tecniche assegnabili')+actions(btn('Enciclopedia delle abilità','spellbook'))+'<p>Assegna un potere a uno dei tre tasti. Ogni cinque utilizzi la maestria sale di un livello, fino al quinto.</p>';
        for(const [id,entry] of Object.entries(p.skills)){
          const def=Game.activeSkill(p,id);if(!def)continue;
          const slots='<div class="slots">'+[0,1,2].map(i=>cmd(String(i+1),'slot',i+'|'+id,false,p.slots[i]===id?'on':'')).join('')+'</div>';
          html+=row(def.name,'Lv. '+entry.level+' · '+def.cost+' mana · '+def.cooldown.toLocaleString('it')+' s di ricarica. '+def.description,slots,icon(def.icon||'skill'));
        }
        const options=Object.keys(p.skills).map(id=>'<option value="'+esc(id)+'">'+esc(Game.activeSkill(p,id).name)+' · Lv. '+p.skills[id].level+'</option>').join('');
        html+=h('Fusione dei poteri')+row('Sintesi','Porta '+(Game.skills.spark?.name||'Scintilla')+' e '+(Game.skills.mend?.name||'Rigenerazione')+' alla maestria '+rules.fuseLevel+'. La fusione richiede '+rules.fuseEssence+' essenze.',cmd(p.skills.aurora?'Fusione appresa':'Fondi','fuse','',!!p.skills.aurora || (p.skills.spark?.level||0)<rules.fuseLevel || (p.skills.mend?.level||0)<rules.fuseLevel || p.inventory.essence<rules.fuseEssence))+
          '<p>Combina due tecniche. Prova una cura con una barriera, o Scintilla con dardi divergenti. Con la pratica alcune fusioni cambiano forma alla maestria 4.</p>'+
          '<form class="cookForm" data-form="weave"><div class="cookGrid"><label>Prima tecnica<select name="a">'+options+'</select></label><label>Seconda tecnica<select name="b">'+options+'</select></label></div><button type="submit" class="btn primary">Sperimenta</button></form>'+h('Assimilazione');
        html+='<p>'+esc('Per ogni tratto servono '+rules.assimilationEchoes+' echi della creatura e '+rules.assimilationEssence+' essenza. Puoi legare fino a '+rules.traitCap+' tratti a questa vita.')+'</p>';
        for(const [id,tr] of Object.entries(Game.traits)){
          const n=p.echoes[id]||0,got=p.traits.includes(id);
          html+=row(tr.name,tr.description+' · Echi raccolti '+n,cmd(got?'Assimilato':'Assimila','assimilate',id,got || n<rules.assimilationEchoes || p.inventory.essence<rules.assimilationEssence || p.traits.length>=rules.traitCap));
        }break;}
      case 'spellbook':{
        const defs=Object.values(Game.skills);
        const filter=detail==='known'?'known':'all';
        html=actions(btn('Tutte · '+defs.length,'spellbook',filter==='all'?'primary':'','all'),btn('Apprese · '+Object.keys(p.skills).length,'spellbook',filter==='known'?'primary':'','known'),btn('Assegna ai tasti','skills'))+
          catalogControls('Cerca un’abilità',defs.map(d=>d.category),'Categoria');
        const sources=new Map();
        for(const race of Game.races){
          sources.set(race.start,{race,name:race.name});
          for(const form of race.forms){
            sources.set(form.skill,{race,name:form.name});
            if(form.next)sources.set(form.next.skill,{race,name:form.next.name});
          }
        }
        let hidden=0;
        for(const def of defs){
          if(filter==='known'&&!p.skills[def.id])continue;
          const item=sources.get(def.id);
          if(item?.race.secret&&p.race!==item.race.id){hidden++;continue;}
          const source=item?.name||(def.id==='aurora'?'Fusione':'Dono del risveglio');
          html+='<div '+catalogAttrs(def.name+' '+source+' '+def.description,def.category)+'>'+row(def.name,(p.skills[def.id]?'Appresa · ':'')+source+' · '+def.category+' · '+def.cost+' mana. '+def.description,'',icon(def.icon))+'</div>';
        }
        if(hidden)html+='<p class="caption">'+hidden+' tecniche appartengono a stirpi celate.</p>';
        break;}
      case 'evolution':
        html=feature(v.race,v.formName,UI.appearance(p))+
          '<p>Le metamorfosi avvengono durante il viaggio. L’albero mostra le condizioni e la tendenza maturata finora.</p>'+
          evolutionChecklist(v.evolution,p)+branches(v.race,p,v.evolution)+evolutionHistory(v.growth,v.race);break;
      case 'bestiary':
        html='<p>Incontra le creature per completare le loro schede. I boss sconfitti restano registrati qui.</p>';
        for(const [id,entry] of Object.entries(Game.codex)){
          const known=Array.isArray(s.seen)?s.seen.includes(id):!!s.seen?.[id];const count=s.defeated?.[id]||0;
          html+=row(known?entry.name:'Presenza sconosciuta',known?entry.habitat+' · '+entry.description:'Habitat segnalato · '+entry.habitat,'<small>'+esc(known?'Vinte '+count:'Da scoprire')+'</small>',known?'<div class="portraitCell" style="width:52px">'+picture(id==='wolf'?'feral':id,52)+'</div>':'<span class="portraitCell" style="width:52px;height:52px;color:#b79b65">?</span>');
        }break;
      case 'map':
        html=actions(btn('Atlante dei cinque continenti','atlas','primary'),...(UI.trackedStatue||UI.trackedSite?[btn('Rimuovi meta','clearTrack')]:[]))+objectives(v,p)+'<canvas id="worldMap" class="bookMap" width="600" height="348" aria-label="Carta della regione"></canvas><div class="swatches"><span>◆ Posizione attuale</span><span style="color:#e8be77">✧ Obiettivo principale</span><span style="color:#a0daa7">⊡ Passaggio aperto</span><span style="color:#adf1dc">▪ Luogo di attività</span></div>'+h(v.regionName||'Luoghi della valle')+'<div class="cards">'+World.landmarks.map((l,i)=>'<div class="card"><strong>'+String.fromCharCode(65+i)+' · '+esc(l.name)+'</strong></div>').join('')+'</div>'+
          gates(v)+stationList(v.life,p)+(UrbanWorld.inCity(v.region)?urbanMap(s):'')+
          [...Tradecraft.sites(s),...Daily.sites(s),...Economy.sites(s),...(Legendary.view(s).discovered?Legendary.sites(s).filter(site=>site.id==='legendary-entry'):[])].map(site=>{
            const there=UI.routeInfo(p,site.point);
            return row(site.name||site.text,there?there.steps+' passi · '+there.direction:'Nelle vicinanze',btn('Segna sulla mappa','trackSite','',site.id||'camp'));
          }).join('')+cacheList(v.life,p)+campaignRoad(v);break;
      case 'atlas':{
        const current=World.regions[v.region].continent;
        html='<div class="worldAtlas">'+World.continents.map(c=>'<button class="atlasLand '+(c.id===current?'here':'')+'" data-do="continent" data-value="'+esc(c.id)+'" style="--atlas-x:'+c.position.x+'%;--atlas-y:'+c.position.y+'%"><span class="cap">'+esc(c.direction)+'</span><strong>'+esc(c.name)+'</strong><small>'+esc(c.subtitle)+'</small></button>').join('')+'</div>'+
          actions(btn('Carta della regione','map'),btn('Segna Velaris','trackCity'));break;}
      case 'continent':{
        const c=World.continents.find(c=>c.id===detail)||World.continents[0],st=v.life.world.statues.find(st=>st.id===c.statue.id);
        top.textContent=c.name;kicker.textContent=c.subtitle;
        html=c.regions.filter(id=>!World.regions[id].hidden||Legendary.view(s).discovered).map(id=>{const r=World.regions[id];return row(r.name,r.description,id===v.region?'<span class="gateStatus open">Sei qui</span>':id===UrbanWorld.cityId?btn('Segna sulla mappa','trackCity'):'');}).join('')+
          h('Statua della Rinascita')+row(st.name,st.landmark+(st.active?' · Ultima attivata':''),btn('Segna sulla mappa','trackStatue','primary',st.id))+
          (st.visited?'<p class="narrative">'+esc(st.lore)+'</p>':'')+actions(btn('Tutti i continenti','atlas'));break;}
      case 'statue':{
        const st=v.life.world.statues.find(st=>st.id===detail);
        if(!st)break;
        top.textContent=st.name;kicker.textContent=st.continent+' · '+st.landmark;
        html='<p class="lead">'+esc(st.lore)+'</p>'+row('Punto di rinascita','Ultima statua attivata. Alla prossima sconfitta ti risveglierai qui.')+
          row('Iscrizioni lette',v.life.world.statues.filter(x=>x.visited).length+' / '+v.life.world.statues.length)+actions(btn('Riprendi il viaggio','resume','primary'),btn('Apri l’atlante','atlas'));break;}
      case 'elder':
      case 'elder-record':{
        if(page==='elder-record'){
          html=elderArchive(s,v)+actions(btn('Memoriale','conflicts','','elder'),btn('Torna al borgo','close'));
          break;
        }
        const stage=v.campaignStage??0;
        const text=stage===4?'Il cuore del Varco ha ripreso a battere. Ascoltalo insieme a me.':stage>=5?'Se le campane suonano ancora, è perché qualcuno si è preso cura anche della più piccola luce.':s.quest===0?'Da tre notti le lanterne si spengono da sole. Scopri cosa è accaduto a tre creature oltre il ponte. Dove le loro ombre si incontrano troverai Orveth.':s.quest===3?'La lanterna più antica ha ripreso a brillare, ma le radici puntano verso la cava. Prendi la benedizione del borgo prima di ripartire.':v.objective.text;
        html=npc('elder','Nerea · custode di Vela',text);
        if(s.quest===0)html+=actions(cmd('Accetta la missione','accept','',false,'primary'));
        if(s.quest===3)html+=actions(cmd('Concludi il primo capitolo','reward','',false,'primary'));
        if(stage===4)html+=actions(cmd('Concludi la campagna','finish','',false,'primary'));
        html+=npcMemory('elder')+actions(btn('Torna al borgo','close'));break;}
      case 'merchant':
        html=npc('merchant','Tessa · mercante','Il ponte regge ancora. Se vai oltre la radura, porta con te un po’ di linfa.')+
          row('Emporio · 07:00–20:00',Economy.wallet(p.gold).label+(v.calendar.shopOpen?'':' · Chiuso'))+
          row('Pozione di linfa','Una dose di linfa curativa.'+(p.race==='slime'?' Per uno Slime cura il 67% della vitalità.':''),cmd('Acquista · '+rules.potionPrice+' Scintille','buyPotion','',p.gold<rules.potionPrice||!v.calendar.shopOpen),icon('potion'))+
          row('Talismano di Vela','Attacco +3 · Difesa +1',cmd(p.inventory.charm?'Acquistato':'Acquista · '+rules.charmPrice+' Scintille','buyCharm','',p.gold<rules.charmPrice||p.inventory.charm>0||!v.calendar.shopOpen),icon('ward'))+
          tessaMemory(p)+
          actions(btn('Mercato regionale e banca','economy'));break;
      case 'smith':
        html=npc('smith','Ivo · fabbro di Vela','Se macini il minerale fino a farne polvere, la linfa trattiene il suo calore per tutta la notte.')+row('Distilla due pozioni',rules.craftHerb+' erbe di rugiada e '+rules.craftOre+' minerale lucente.'+(p.race==='slime'?' Per uno Slime ogni pozione cura il 67% della vitalità.':''),cmd('Distilla','craft','',p.inventory.herb<rules.craftHerb||p.inventory.ore<rules.craftOre),icon('potion'))+
          '<div class="stats">'+stat('Erbe',p.inventory.herb||0)+stat('Minerali',p.inventory.ore||0)+'</div>'+h('Commissione del fabbro')+'<p>'+esc(v.sideQuest)+'</p>'+
          (s.sideQuest===0?actions(cmd('Accetta incarico','sideAccept','',false,'primary')):s.sideQuest===1?actions(cmd('Consegna '+rules.sideHerb+' erbe','sideReward','',p.inventory.herb<rules.sideHerb,'primary')):'')+
          requestRows('wool-cloaks')+npcMemory('smith')+actions(btn('Forgia al banco di Ivo','workshop','','smithing'),btn('Ripara o incanta','gear'));break;
      case 'victory':
        kicker.textContent='Capitolo I · compiuto';html=npc('boss','Orveth, il Cervo Cavo','Le corna si accendono un’ultima volta. Dal cavo nel suo petto cade un seme. Quando lo tocchi, sotto il borgo tornano a pulsare le radici.')+
          '<p class="lead">Dal seme partono radici nuove. Seguile verso il passo a est, che ora conduce alla Cava delle Braci.</p><div class="stats">'+stat('Livello',p.level)+stat('Creature vinte',p.kills)+stat('Reputazione',p.rep)+'</div>'+actions(btn('Continua il viaggio','resume','primary'),btn('Apri la mappa','map'));break;
      case 'ending':
        kicker.textContent='Campagna completata';html=(v.elderLost?
          row('Finale · La promessa ereditata','I quattro guardiani sono caduti e il Varco si è richiuso. Il borgo accende una lanterna sul memoriale di Nerea.'):
          npc('elder','Nerea · custode di Vela','Stanotte le campane non annunciano il pericolo. Chiamano a casa chi credeva di averla perduta.')+
          '<p class="lead">Dopo la caduta dei quattro guardiani, il Varco si è richiuso e il borgo ha riacceso le sue lanterne. Adesso puoi attraversare Lùmora seguendo la tua strada.</p>')+
          '<div class="stats">'+stat('Forma',v.formName)+stat('Livello',p.level)+stat('Creature vinte',p.kills)+stat('Reputazione',p.rep)+'</div>'+campaignRoad(v)+actions(btn('Continua a esplorare','resume','primary'),btn('Salva e torna al titolo','title'));break;
    }
    body.innerHTML=html;
    if(page==='map'){
      const c=$('#worldMap'),g=c.getContext('2d');World.drawMap(g,c.width,c.height,p);
      g.save();g.textAlign='center';g.textBaseline='middle';g.font='bold 12px Segoe UI';
      World.landmarks.forEach((l,i)=>{const x=l.x/World.width*c.width,y=l.y/World.height*c.height;g.fillStyle='#10272be6';g.fillRect(x-7,y-19,15,14);g.fillStyle='#f5e5bb';g.fillText(String.fromCharCode(65+i),x+.5,y-12);});
      for(const gate of World.points.gates||[]){
        const x=gate.x/World.width*c.width,y=gate.y/World.height*c.height;
        g.fillStyle='#10272b';g.fillRect(x-5,y-5,10,10);g.strokeStyle=(v.campaignStage||0)>=(gate.minStage||0)?'#a0daa7':'#b18d81';g.lineWidth=2;g.strokeRect(x-4,y-4,8,8);
      }
      for(const station of v.life?.stations||[]){
        if(station.region!==v.region)continue;
        const x=station.x/World.width*c.width,y=station.y/World.height*c.height;
        g.fillStyle='#112528';g.fillRect(x-4,y-4,8,8);g.fillStyle='#adf1dc';g.fillRect(x-2,y-2,4,4);
      }
      for(const {point} of [...Tradecraft.sites(s),...Daily.sites(s),...Economy.sites(s)]){
        const x=point.x/World.width*c.width,y=point.y/World.height*c.height;
        g.fillStyle='#112528';g.fillRect(x-4,y-4,8,8);g.fillStyle='#adf1dc';g.fillRect(x-2,y-2,4,4);
      }
      if(UrbanWorld.inCity(s.region)){
        for(const site of urbanMapSources(s)){
          const {point}=site,x=point.x/World.width*c.width,y=point.y/World.height*c.height;
          g.fillStyle='#102232';g.fillRect(x-5,y-5,10,10);
          g.fillStyle='#e6c886';g.fillRect(x-3,y-3,6,6);
          g.fillStyle='#102232';g.fillRect(x-1,y-1,2,2);
        }
      }
      for(const cache of v.life?.world?.deathCaches||[]){
        if(cache.region!==v.region)continue;
        g.fillStyle='#f2b86d';g.fillRect(cache.x/World.width*c.width-3,cache.y/World.height*c.height-3,6,6);
      }
      const plot=v.build?.zone;
      if(plot){g.lineWidth=1;g.strokeStyle='#e2c58a';g.strokeRect(plot.x/World.width*c.width,plot.y/World.height*c.height,plot.w/World.width*c.width,plot.h/World.height*c.height);}
      for(const site of Guild.sites(s)){
        g.fillStyle='#fae4a2';g.fillRect(site.point.x/World.width*c.width-1,site.point.y/World.height*c.height-1,3,3);
      }
      const target=v.objective.target;
      if(target){const x=target.x/World.width*c.width,y=target.y/World.height*c.height;g.strokeStyle='#ffdc8e';g.lineWidth=2;g.beginPath();g.moveTo(x,y-7);g.lineTo(x+6,y);g.lineTo(x,y+7);g.lineTo(x-6,y);g.closePath();g.stroke();}
      g.restore();
    }
    if(page==='lineages'||page==='spellbook')filterCatalog();
  }
  function feature(r,name,evo=0){
    const weight=Game.races.reduce((total,race)=>total+race.weight,0);
    const chance=(r.weight/weight*100).toLocaleString('it',{maximumFractionDigits:3});
    return '<div class="raceFeature">'+portrait(r.id,90,evo)+'<div>'+rarity(r)+'<h3>'+esc(name)+'</h3><p>'+esc(r.description)+'</p><small class="sub">Probabilità al sorteggio · '+chance+'%</small></div></div>';
  }
  function lineageStats(r){return '<div class="stats">'+stat('Vitalità',r.hp)+stat('Mana',r.mp)+stat('Attacco',r.atk)+stat('Difesa',r.def)+stat('Velocità',r.speed)+'</div>';}
  function biology(bio){
    if(!bio)return '';
    const entries=[
      ['Costituzione',bio.description||bio.body||bio.family],
      ['Punto di forza',bio.strength||bio.advantage],
      ['Debolezza',bio.weakness],
      ['Affinità',Array.isArray(bio.affinity)?bio.affinity.join(' · '):bio.affinity||bio.habitat],
      ['Predisposizione frequente',bio.aptitude],
      ['Attacco naturale',bio.natural||bio.attackName||bio.naturalAttack]
    ].filter(([,value])=>typeof value==='string'&&value);
    return entries.length?h('Biologia della stirpe')+entries.map(([label,value])=>row(label,value)).join(''):'';
  }
  function growthProfile(g){
    if(!g)return '';
    const names={strength:'Forza',endurance:'Resistenza',intelligence:'Intelligenza',magic:'Magia',dexterity:'Destrezza',vitality:'Vitalità',agriculture:'Agricoltura'};
    const age=typeof g.age==='object'&&g.age?g.age.label:g.age;
    return (age?row('Età biologica',[age,g.maturity||g.origin].filter(Boolean).join(' · ')):'')+biology(g.bio)+
      h('Statistiche allenate')+'<div class="stats">'+Object.entries(names).map(([key,name])=>stat(name,g.attributes?.[key]??'—')).join('')+'</div>'+
      h('Predisposizioni individuali')+(g.aptitudes||[]).map(a=>row(a.name,[a.grade,a.value].filter(x=>x!==undefined).join(' · '))).join('')+
      h('Talenti latenti')+(g.latent||[]).map(t=>row(t.name,t.condition||t.description||'','<span class="gateStatus '+(t.unlocked?'open':'')+'">'+(t.unlocked?'Risvegliato':'Latente')+'</span>')).join('')+
      mutationTag(g.mutation);
  }
  function mutationTag(mutation){
    if(!mutation)return '';
    return row(mutation.name||'Mutazione',mutation.description||mutation.reason||'Una traccia rara maturata durante il viaggio.','<span class="gateStatus open">Mutazione</span>');
  }
  // Soglie dell'innata (stesse di growth.js): ramo a 5 utilizzi efficaci, maestria ogni 4, risonanza dai 15 con i talenti in armonia.
  function innateSteps(a){
    const uses=Number(a.uses)||0,parts=[uses+' utilizzi efficaci'];
    parts.push(a.branch?'ramo manifestato':'ramo a 5 utilizzi ('+Math.min(uses,5)+' / 5), orientato da come la usi');
    if((a.level||1)<5)parts.push('maestria '+((a.level||1)+1)+' a '+4*(a.level||1)+' utilizzi');
    else parts.push('maestria massima');
    parts.push(a.resonance?'in risonanza':a.branch?'risonanza dai 15 utilizzi ('+Math.min(uses,15)+' / 15) quando i talenti sono in armonia':'risonanza dopo il ramo');
    return parts.join(' · ')+'.';
  }
  function innatePanel(innate,details){
    if(!innate)return '';
    const summary=[innate.description,innate.rarity,'Livello '+innate.level].filter(Boolean).join(' · ')+
      (details?' · '+innate.cost+' mana · '+Number(innate.cooldown).toLocaleString('it')+' s di ricarica'+(innate.power?' · Intensità ×'+Number(innate.power).toLocaleString('it',{maximumFractionDigits:2}):''):'');
    return h('Abilità innata')+row(innate.name,summary,'<kbd>R</kbd>',icon(innate.icon||'core'))+
      (details?'<p class="caption">'+esc(innateSteps(innate))+'</p>':
        '')+(details?(innate.branches||[]).map(b=>row(b.name,[b.description,b.hint].filter(Boolean).join(' '),'<span class="gateStatus '+(b.id===innate.branch?'open':'')+'">'+(b.id===innate.branch?'Manifestata':'Possibile')+'</span>')).join(''):'');
  }
  function stationList(life,p){
    if(!life?.stations?.length)return '';
    const list=life.stations.filter(s=>s.region===World.region);
    if(!list.length)return '';
    return h('Luoghi di attività')+list.map(s=>{
      const info=UI.routeInfo(p,s),where=info.dist<30?'Nelle vicinanze':info.steps+' passi · '+info.direction;
      return row(s.name,(s.description?s.description+' · ':'')+where,'<kbd>E</kbd>');
    }).join('');
  }
  function suppliesPanel(stock){
    return '<div class="stats">'+stat('Sementi',stock.seeds)+stat('Grano',stock.grain)+stat('Lana',stock.wool)+stat('Travi',stock.work)+'</div>';
  }
  function propertyPanel(build,p){
    const z=build.zone,way=z?UI.routeInfo(p,{x:z.x+z.w/2,y:z.y+z.h/2}):null;
    let html='<div class="stats">'+stat('Travi',build.stock.wood)+stat('Minerali',build.stock.ore)+stat('Scintille',build.stock.gold)+'</div>';
    html+=z?h('Lotto della regione')+(build.near?'<p>Seleziona un progetto e posizionalo sul terreno. Il ponte deve collegare le due sponde del canale del lotto.</p>':
      '<p>Raggiungi il lotto · '+way.steps+' passi '+esc(way.direction)+'. Il suo perimetro è segnato sull’atlante.</p>'):'<p>Le nuove regioni offrono lotti presso i loro insediamenti.</p>';
    if(build.near)html+=build.plans.map(plan=>row(plan.name,plan.wood+' travi · '+plan.ore+' minerali · '+plan.gold+' Scintille',
      plan.affordable?btn('Posiziona','placeBuild','primary',plan.id):'<span class="gateStatus">Materiali insufficienti</span>')).join('');
    html+=h('Registro delle proprietà');
    if(!build.structures.length)return html+'<p>Le costruzioni che posizioni compariranno qui.</p>';
    for(const o of build.structures){
      html+=row(o.name,World.regions[o.region].name+' · '+(o.level===2?'Ampliata':'Livello 1'));
      if(!o.near)continue;
      html+=actions(btn('Sposta','placeBuild','',''+o.plan+':'+o.id),cmd('Cambia finitura','build',{op:'paint',id:o.id}),
        ...(o.plan==='house'?[cmd('Arreda','build',{op:'furnish',id:o.id})]:[]),
        ...(o.level===1&&!['bridge','wall'].includes(o.plan)?[cmd('Amplia','build',{op:'upgrade',id:o.id})]:[]),
        ...(['lab','farm','shop'].includes(o.plan)?[cmd(o.plan==='farm'?(o.readyAt?'Raccogli':'Semina'):o.plan==='lab'?'Distilla':'Vendi il grano','build',{op:'work',id:o.id},!!o.workReason)]:[]),
        btn('Demolisci','confirmDemolish','',String(o.id)));
      if(o.workReason&&['lab','farm','shop'].includes(o.plan))html+='<p class="caption">'+esc(o.workReason)+'</p>';
    }
    if(build.district)html+=h(build.district.name)+row(build.district.level===2?'Città del lotto':build.district.level?'Villaggio del lotto':'Insediamento in pausa',
      'Entrate disponibili · '+build.district.funds+' Scintille',cmd('Ritira entrate','build',{op:'collectDistrict'},!build.district.funds||!build.near));
    else if(build.near){
      html+=h('Insediamento')+'<p>Un villaggio richiede due case, una fattoria e una bottega. Castello, laboratorio e sede di gilda lo promuovono a città del lotto.</p>';
      if(build.districtReady)html+='<form id="districtForm" class="catalogControls"><input name="districtName" aria-label="Nome dell’insediamento" required minlength="3" maxlength="28" placeholder="Nome dell’insediamento"><button class="btn primary" type="submit">Fonda il villaggio</button></form>';
    }
    return html;
  }
  function societyPanel(c,region){
    const a=c.selected,t=c.towns.find(x=>x.region===region);
    let html=t?row(t.name,'Insediamento · Stadio '+t.level+' · '+t.stock+' travi a mercato · '+(t.accord?'Accordo commerciale attivo':'Scambi locali')):'';
    if(a){
      const health=Conflicts.condition(Game.s,a.id);
      html+=(health?.status==='dead'?row(a.name,'Memoriale',btn('Leggi la scheda','conflicts','',a.id)):npc(a.race,a.name,a.personality))+
        row(a.profession,[a.age+' anni',a.bond,a.formName,a.enrolled?'Registro degli avventurieri':'',health?.label].filter(Boolean).join(' · '));
      html+=c.actions.map(x=>row(x.label,x.reason,cmd('Esegui','society',{id:a.id,op:x.op},!x.allowed,'primary'))).join('');
      if(a.memories?.length)html+=h('Ricordi condivisi')+a.memories.slice(-6).reverse().map(m=>row({chat:'Conversazione',gift:'Un dono',trade:'Uno scambio'}[m.kind],'Giorno '+(1+Math.floor(m.at/480)))).join('');
      html+=actions(btn('Abitanti del luogo','society'));
    }else{
      html+=c.local.length?h('Abitanti del luogo')+c.local.map(a=>{
        const state=Conflicts.condition(Game.s,a.id);
        return row(a.name,[a.profession,a.bond,state?.label].filter(Boolean).join(' · '),btn('Scheda',state?.status==='dead'?'conflicts':'society','',a.id));
      }).join(''):
        '<p>Visita un insediamento nuovo. Premi E vicino a un abitante per conversare o commerciare.</p>';
    }
    if(c.family.partner){
      const partner=c.family.partner,state=Conflicts.condition(Game.s,partner.id);
      html+=h('Famiglia')+row(partner.name,state?.status==='dead'?'Coniuge · In memoria':state?.status==='critical'?'Coniuge · In pericolo':'Coniuge · '+(c.family.home?World.regions[c.family.home.region].name:'In cerca di una casa'))+
        c.family.children.map(a=>row(a.name,a.age+' anni · '+a.profession+' · Predisposizione '+a.aptitude+'/100'+(a.skills.length?' · '+a.skills.join(', '):''))).join('');
    }
    return html;
  }
  function elderArchive(s,v){
    const stage=v.campaignStage??0;
    let html=h('Le ultime note di Nerea')+'<p class="narrative">'+esc(s.quest===0?
      'Sul memoriale restano gli appunti della custode. Tre creature oltre il ponte spengono le lanterne, e dove le loro ombre si incontrano attende Orveth.':
      s.quest===3?'Il seme di Orveth pulsa nella tua mano. Il borgo affida a te l’eredità della custode.':
      stage===4?'Il registro custodisce il rito per ricomporre i tre frammenti al borgo.':v.objective.text)+'</p>';
    if(s.quest===0)html+=actions(cmd('Raccogli l’ultimo incarico','accept','',false,'primary'));
    if(s.quest===3)html+=actions(cmd('Deponi il seme sul memoriale','reward','',false,'primary'));
    if(stage===4)html+=actions(cmd('Concludi la campagna','finish','',false,'primary'));
    return html;
  }
  function urbanMapSources(s){
    const places=UrbanWorld.sites(s);
    const board=UrbanWorld.site(s,'guild');
    return board?places.concat({...board,id:'guild',name:'Registro degli avventurieri'}):places;
  }
  function urbanMap(s){
    const outside=s.region===UrbanWorld.cityId;
    const layout=outside&&UrbanWorld.exterior(s.seed),labels=layout?.districts||[];
    const type=outside&&UrbanWorld.settlementTypes[World.regions[s.region].settlementType];
    return (labels.length?row(type.label+' di Velaris',layout.buildings.length+' edifici · '+labels.length+' quartieri')+
      h('Quartieri')+labels.map(d=>row(d.name,d.description||d.theme||'',btn('Segna','trackDistrict','',d.id))).join(''):'')+
      h(outside?'Ingressi e servizi':'Stanze e servizi')+urbanMapSources(s).map(site=>{
        const route=UI.routeInfo(s.player,site.point);
        return row(site.name||site.text,route?route.steps+' passi · '+route.direction:'',btn('Segna','trackSite','',site.id));
      }).join('')+actions(btn('Abitanti e commissioni','urban'));
  }
  function urbanPanel(s,detail){
    const model=UrbanLife.view(s,detail),city=model.city;
    let html='';
    if(city){
      html='<div class="stats">'+stat('Abitanti',city.population)+stat('Qui vicino',city.visible)+
        stat('Specie',typeof city.species==='number'?city.species:city.species?.length||0)+'</div>';
    }
    const resident=model.selected;
    if(resident){
      html+=npc(resident.race,resident.name,resident.personality||resident.activity)+
        row(resident.profession,[resident.raceName,resident.activity].filter(Boolean).join(' · '))+
        row('Abitazione e lavoro',[resident.home,resident.work].filter(it=>typeof it==='string').join(' · '))+
        (resident.trade?row('Mestiere e mercato',resident.trade.text):'');
      if(resident.schedule?.length)html+=h('Giornata')+resident.schedule.map(block=>row(block.label,[block.at,block.where].filter(Boolean).join(' · '))).join('');
      if(resident.memories?.length)html+=h('Ricordi condivisi')+resident.memories.slice(-4).reverse().map(m=>row(m.text,m.day!==undefined?'Giorno '+m.day:'')).join('');
    }else if(model.local?.length){
      html+=h('Abitanti nelle vicinanze')+model.local.map(a=>row(a.name,[a.profession,a.activity].filter(Boolean).join(' · '),btn('Scheda','urban','',a.id))).join('');
    }
    if(model.actions?.length)html+=actions(...model.actions.map(action=>cmd(action.label,'urban',{op:action.op,id:action.id||resident?.id},!action.allowed,'primary')));
    const commission=model.commission;
    if(commission){
      const item=Inventory.definition(s,commission.item);
      html+=h('Commissione cittadina')+row(commission.name,commission.description||
        [item&&commission.amount+' × '+item.name,commission.reward&&commission.reward+' Scintille',commission.claimed&&'Completata'].filter(Boolean).join(' · '));
    }
    if(city?.event?.name)html+=row(city.event.name,city.event.text||'');
    return html+actions(btn('Carta di Velaris','map'),...(resident?[btn('Abitanti','urban')]:[]));
  }
  function guildPanel(g,s){
    const named=id=>Society.entry(s,id)?.name||'Membro';
    let html=row('Registro e rango',g.joined?'Rango '+g.rank+' · '+g.xp+' riconoscimento':'Iscrizione disponibile alle bacheche degli insediamenti.',
      !g.joined&&g.board?cmd('Iscriviti','guild',{op:'join'},false,'primary'):'');
    if(g.active)html+=h('Incarico seguito')+row(g.active.name,g.active.text+' · '+g.active.progress+' / '+g.active.goal+' · Bacheca '+g.active.source,
      g.active.progress>=g.active.goal&&g.board&&g.active.region===(g.chapter||s.region)?cmd('Riscuoti','guild',{op:'claim'},false,'primary'):'');
    if(g.active?.destination&&!g.active.progress)html+=row('Meta della scorta',g.active.destination+' · Resistenza del corriere '+Math.ceil(g.active.escort.hp)+'/90');
    if(g.active)html+=actions(cmd('Abbandona incarico','guild',{op:'abandon'}));
    if(g.joined&&g.board&&!g.active)html+=h('Bacheca pubblica')+g.jobs.map(j=>row(j.name,j.text+' · '+j.gold+' Scintille',cmd('Accetta','guild',{op:'accept',type:j.id},!j.available,'primary'))).join('');
    if(!g.board&&!g.hall)html+='<p>Cerca il registro dell’insediamento o entra nella tua sede. Premi E davanti alla bacheca.</p>';
    if(g.joined)html+=h('Avventurieri')+g.candidates.map(a=>{
      const state=Conflicts.condition(s,a.id),available=Conflicts.canFight(s,a.id);
      return row(a.name,[a.profession,a.enrolled?'Iscritto · Carriera '+a.career:'Da iscrivere',state?.label].filter(Boolean).join(' · '),
        a.team?cmd('Congeda','guild',{op:'dismiss',id:a.id}):a.enrolled&&g.board?cmd('Recluta','guild',{op:'recruit',id:a.id},!available):
        g.board&&a.trust>=2?cmd('Invita a iscriversi','guild',{op:'register',id:a.id},!available):'');
    }).join('');
    const own=g.personal;
    if(g.hall&&!own&&g.joined){
      html+=h('Fondazione')+'<p>Con rango D e 25 Scintille puoi fondare qui la tua gilda.</p>'+
        '<form id="charterForm" class="catalogControls"><input name="guildName" aria-label="Nome della gilda" placeholder="Nome della gilda" required minlength="3" maxlength="28">'+
        '<select name="crest" aria-label="Stemma">'+g.crests.map(x=>'<option>'+esc(x)+'</option>').join('')+'</select><button class="btn primary" type="submit">Fonda la gilda</button></form>';
    }
    if(!own)return html;
    html+=h(own.name)+row('Stemma '+own.crest,'Fondo '+own.treasury+' Scintille · '+own.halls.length+' sedi · '+own.members.length+' membri');
    html+=own.halls.map(it=>row(World.continents.find(c=>c.id===it.continent).name,'Sede '+it.id)).join('');
    if(!g.hall)return html;
    if(!own.halls.some(it=>it.id===g.hall))return html+actions(cmd('Registra sede distaccata · 20 Scintille','guild',{op:'branch'},false,'primary'));
    html+=actions(cmd('Versa 10 Scintille','guild',{op:'deposit'}),cmd('Preleva 10 Scintille','guild',{op:'withdraw'},own.treasury<10));
    for(const a of g.candidates.filter(a=>a.team&&!own.members.includes(a.id)))html+=row(a.name,'Avventuriero della squadra',cmd('Accogli nella gilda','guild',{op:'enroll',id:a.id}));
    for(const id of own.members)html+=row(named(id),'Membro',actions(...own.squads.map((_,i)=>cmd('Squadra '+(i+1),'guild',{op:'assignMember',id,squad:i}))));
    for(const [i,q] of own.squads.entries())html+=row('Squadra '+(i+1),q.length?q.map(named).join(', '):'Ancora da formare',
      g.active&&q.length?cmd('Assegna incarico attuale','guild',{op:'assignMission',squad:i}):'');
    return html;
  }
  function cacheList(life,p){
    const caches=life?.world?.deathCaches||[];
    if(!caches.length)return '';
    return h('Borselli da recuperare')+caches.map(b=>{
      const direction=b.region===World.region?UI.routeInfo(p,b):null;
      return row(World.regions[b.region].name,b.gold+' Scintille'+(direction?' · '+direction.steps+' passi '+direction.direction:''));
    }).join('');
  }
  function activityPanel(life,p){
    if(!life)return '';
    const near=new Set(life.stations.filter(s=>s.region===World.region&&UI.routeInfo(p,s).dist<=42).map(s=>s.id));
    const activities=(life.activities||[]).filter(a=>a.near??(a.allowed||near.has(a.station)));
    const timers=(life.plots||[]).filter(Boolean).map(x=>x.readyIn>0?'Raccolto fra '+x.readyIn+' s':'Raccolto maturo');
    if(life.herd?.readyIn!=null)timers.push(life.herd.readyIn>0?'Prodotti del recinto fra '+life.herd.readyIn+' s':'Prodotti del recinto pronti');
    return (activities.length?h('Azioni nelle vicinanze')+activities.map(a=>row(a.label,a.allowed?a.description:[a.description,a.reason].filter(Boolean).join(' · '),cmd(a.label,'life',a.id,!a.allowed,'primary'))).join(''):
      '<p>Raggiungi un luogo di lavoro e premi E per vedere le attività disponibili. L’atlante indica i luoghi nel territorio attuale.</p>')+
      (life.supplies?h('Scorte di lavoro')+suppliesPanel(life.supplies):'')+
      (life.project?row('Lanterna di Vela','Restauro '+life.project.level+' / '+life.project.total):'')+
      (timers.length?row('In maturazione',timers.join(' · ')+'. Il tempo scorre durante l’esplorazione.',btn('Torna al gioco','resume')):'')+
      h('Mestieri')+(life.professions||[]).map(a=>{
        const xp=a.next>0?'<progress class="practiceProgress" aria-label="Pratica '+esc(a.name)+'" title="'+esc(a.xp)+' / '+esc(a.next)+'" value="'+Number(a.xp)+'" max="'+Number(a.next)+'"></progress>':'';
        return row(a.name,'Livello '+a.level+' · '+a.rank+' · '+a.description,xp);
      }).join('')+
      (life.hybrids?.length?h('Mestieri ibridi')+life.hybrids.map(a=>row(a.name,a.description)).join(''):'')+
      stationList(life,p)+actions(btn('Apri l’atlante','map'));
  }
  function worldNotes(life){
    const world=life?.world;
    if(!world)return '';
    const statue=world.statue;
    return (statue?h('Rinascita')+row(statue.name||'Statua della Rinascita',statue.active?'Punto attivo · '+statue.landmark:'Prima statua · Valle degli Antichi.'):'')+
      (world.event?h('Cronaca di Lùmora')+row(world.event.title,world.event.text+' '+(world.mood||'')):'')+
      (world.news?.length?world.news.slice(-4).reverse().map(n=>row(n.title,'Giorno '+n.day+' · '+n.text)).join(''):'')+
      (world.npcs?.length?h('Abitanti del borgo')+world.npcs.map(n=>row(n.name,[n.role,n.status,n.personality,n.goal].filter(Boolean).join(' · '))).join(''):'');
  }
  function objectives(v,p){
    const goal=v.objective,way=UI.routeInfo(p,goal.target);
    const route=way?(way.dist<24?'Obiettivo vicino':way.steps+' passi verso '+way.direction):'';
    return '<div class="focusGoal"><span class="cap">Missione principale</span><h3>'+esc(goal.title)+'</h3><p>'+esc(goal.text)+'</p>'+(route?'<div class="goalDistance">◆ '+esc(route)+'</div>':'')+'</div>';
  }
  function campaignRoad(v){
    const stage=v.campaignStage??0,markers=[['Valle di Lùmora','Orveth · Cerchio delle Radici'],['Cava delle Braci','Kharun · Forgia Sepolta'],['Fenditura Astrale','Syrava · Conca di Vetro'],['Cuore del Varco','Asterion · Varco'],['Borgo di Vela','Epilogo con Nerea']];
    return h('Percorso della campagna')+'<ol class="campaignRoad">'+markers.map(([title,desc],i)=>{
      const state=stage>i?'done':stage===i?'current':'later';
      return '<li class="'+state+'"'+(state==='current'?' aria-current="step"':'')+'><span>'+ (stage>i?'✓':i+1)+'</span><div><strong>'+esc(title)+'</strong><small>'+esc(desc)+'</small></div></li>';
    }).join('')+'</ol>';
  }
  function gates(v){
    if(!World.points.gates?.length)return '';
    return h('Passaggi')+World.points.gates.map(g=>{
      const open=(v.campaignStage??0)>=(g.minStage||0),to=World.regions?.[g.to]?.name||g.to;
      return row(g.label||to,open?'Verso '+to+' · avvicinati e premi E.':'Verso '+to+' · avanza nella missione principale.','<span class="gateStatus '+(open?'open':'')+'">'+(open?'Aperto':'Chiuso')+'</span>');
    }).join('');
  }
  // Avanzamento per ciascuna via della condizione (RPG Evolution, incremento 3): basta una via; le soglie sono quelle di growth.js.
  function conditionPaths(evo){
    const g=evo.progress;if(!g||evo.conditionReady)return '';
    const way=(done,txt)=>'<li class="'+(done?'met':'')+'"><span aria-hidden="true">'+(done?'✓':'·')+'</span>'+esc(txt)+'</li>';
    const n=x=>Math.floor(x);
    const ways=evo.stage===0?[
      way(g.fights>=3,'Scontri vinti '+Math.min(g.fights,3)+' / 3'),
      way(g.work>=5,'Pratiche di mestiere '+Math.min(n(g.work),5)+' / 5'),
      way(g.mix>=3&&g.levelThree,'Le due vie insieme '+Math.min(n(g.mix*10)/10,3).toLocaleString('it')+' / 3'+(g.levelThree?'':' (dal livello 3)'))
    ]:[
      way(g.story,'Kharun sconfitto'),
      way(g.peak>=4,'Un mestiere al grado 4 · migliore grado '+(g.peak||0)),
      way(g.work>=32,'Pratiche di mestiere '+Math.min(n(g.work),32)+' / 32')
    ];
    return '<p class="caption">Basta una di queste vie:</p><ul class="evoPaths">'+ways.join('')+'</ul>';
  }
  function evolutionChecklist(evo,p){
    if(!evo)return '';
    if(evo.stage>=2)return '<p class="caption">Hai raggiunto la forma finale di questa stirpe.</p>';
    const requirement=(done,txt)=>'<li class="'+(done?'met':'')+'"><span aria-hidden="true">'+(done?'✓':'○')+'</span>'+esc(txt)+'</li>';
    return '<div class="evoChecklist"><h3>'+(evo.stage===1?'Seconda evoluzione':'Prima evoluzione')+'</h3><ul>'+
      requirement(evo.levelReady??p.level>=evo.level,'Livello '+evo.level+' · attuale '+p.level)+
      requirement(evo.essenceReady??p.inventory.essence>=evo.essence,'Essenze '+p.inventory.essence+' / '+evo.essence)+
      (evo.condition?requirement(evo.conditionReady,evo.condition):'')+
      '</ul>'+conditionPaths(evo)+(evo.waiting?'<p class="caption evoWaiting">✦ Pronta: avverrà alla fine dello scontro con il boss.</p>':'')+(evo.influences?.length?'<p class="caption">Influenze recenti · '+evo.influences.map(x=>esc(x.name)).join(' · ')+'</p>':'')+
      (evo.progress?'<p class="caption">Scontri vinti '+esc(evo.progress.fights)+' · Pratiche '+Math.floor(evo.progress.work)+(evo.progress.profession?' · '+esc(evo.progress.profession):'')+'</p>':'')+'</div>';
  }
  function evolutionHistory(g,race){
    const history=g?.history||[];
    if(!history.length)return '';
    return h('Trasformazioni avvenute')+history.map(entry=>{
      const first=race.forms[entry.branch],form=entry.stage===2?first?.next:first;
      return row(form?.name||'Metamorfosi',entry.reason)+mutationTag(entry.mutation);
    }).join('');
  }
  function branches(r,p,evolution){
    const stage=p?.evolutionStage??(p?.form==null?0:1);
    return '<div class="branches">'+r.forms.map((first,index)=>{
      const chosen=p?.form===index,locked=p?.form!=null&&!chosen;
      const tendency=p?.form===null&&evolution?.branch===index;
      const stages=[first,first.next].filter(Boolean);
      const body=stages.map((form,i)=>{
        const art=index+1+i*2,power=Game.skills[form.skill],current=chosen&&stage===i+1;
        return '<div class="formStep '+(current?'current':'')+'">'+portrait(r.id,58,art)+'<div><span class="cap">'+(i?'Forma finale':'Prima forma')+'</span><strong>'+esc(form.name)+'</strong>'+
          '<small>'+esc(form.description)+'</small>'+(power?'<small class="formSkill" title="'+esc(power.description)+'">✦ '+esc(power.name)+'</small>':'')+
          (current?'<span class="activeForm">Forma attuale</span>':'')+'</div></div>';
      }).join('');
      return '<section class="branch '+(locked?'branchLocked':tendency?'branchTendency':'')+'">'+
        (tendency?'<span class="cap">Tendenza attuale</span>':'')+body+(locked?'<small>Ramo alternativo</small>':'')+'</section>';
    }).join('')+'</div>';
  }
  function catalogAttrs(label,category){return 'data-catalog="'+esc(label)+'" data-category="'+esc(category)+'"';}
  function catalogControls(placeholder,values,category){
    return '<div class="catalogControls"><input type="search" id="catalogSearch" placeholder="'+esc(placeholder)+'" aria-label="'+esc(placeholder)+'">'+
      '<select id="catalogRarity" aria-label="'+esc(category)+'"><option value="">'+esc(category)+': tutte</option>'+
      [...new Set(values)].filter(Boolean).map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('')+
      '</select><span id="catalogCount" role="status"></span></div>';
  }
  function filterCatalog(){
    const input=$('#catalogSearch'),list=$('#catalogRarity'),count=$('#catalogCount');
    if(!input||!list||!count)return;
    const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('it');
    const query=normalize(input.value.trim()),category=list.value;
    let visible=0,total=0;
    for(const card of document.querySelectorAll('[data-catalog]')){
      total++;card.hidden=!(normalize(card.dataset.catalog).includes(query)&&(!category||card.dataset.category===category));
      if(!card.hidden)visible++;
    }
    count.textContent=visible?visible+' / '+total:'Nessun risultato';
  }
  function npc(kind,name,text){return '<div class="npcFeature">'+portrait(kind,60)+'<div><h3>'+esc(name)+'</h3><p class="lead">«'+esc(text)+'»</p></div></div>';}
  window.GamePanels={render,filterCatalog,pendingSave:null};
})();
