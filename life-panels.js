/* Pannelli di inventario, mestieri e vita quotidiana per l'interfaccia originale. */
(() => {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const it=new Intl.NumberFormat('it-IT');
  const has=(s,id,n=1)=>Inventory.quantity(s,id)>=BigInt(n);
  const tabNames={fishing:'Pesca',smithing:'Forgia',farming:'Orto',husbandry:'Recinto',cooking:'Cucina'};
  const methods=[['name','Nome A–Z'],['name-desc','Nome Z–A'],['quantity','Quantità decrescente'],['quantity-asc','Quantità crescente'],
    ['category','Categoria'],['quality','Qualità'],['rarity','Rarità']];
  const bagState={pack:{query:'',sort:'name',category:''},bank:{query:'',sort:'name',category:'',location:'pack'}};
  const result={scarso:'Scarso',buono:'Buono',ottimo:'Ottimo',perfetto:'Perfetto'};
  const phaseNames={dawn:'Alba',day:'Giorno',dusk:'Crepuscolo',night:'Notte'};
  const effectNames={attack:'Attacco',defense:'Difesa',speed:'Velocità',hunger:'Fame',thirst:'Sete',energy:'Energia',duration:'Durata'};
  const option=(value,label,selected)=>'<option value="'+esc(value)+'"'+(value===selected?' selected':'')+'>'+esc(label)+'</option>';
  const action=(label,type,value,disabled=false,primary=false)=>
    '<button type="button" class="btn'+(primary?' primary':'')+'" data-cmd="'+esc(type)+'" data-value="'+esc(typeof value==='object'?JSON.stringify(value):value)+'"'+(disabled?' disabled':'')+'>'+esc(label)+'</button>';
  const open=(label,page,value,selected=false)=>'<button type="button" class="btn'+(selected?' primary':'')+'" data-do="'+esc(page)+'"'+(value? ' data-value="'+esc(value)+'"':'')+(selected?' aria-current="true"':'')+'>'+esc(label)+'</button>';
  const icon=id=>'<canvas class="itemArt" data-art="icon" data-kind="'+esc(id||'shard')+'" width="32" height="32"></canvas>';
  const title=text=>'<h3 class="sectionTitle">'+esc(text)+'</h3>';
  const stat=(name,value)=>'<div class="stat"><small>'+esc(name)+'</small><b>'+esc(value)+'</b></div>';
  const details=(name,text,controls='',art='')=>'<div class="row lifePanelRow">'+art+'<div class="detail"><strong>'+esc(name)+'</strong>'+
    (text?'<small>'+esc(text)+'</small>':'')+'</div>'+(controls?'<div class="lifeRowActions">'+controls+'</div>':'')+'</div>';
  const regionName=id=>window.World?.regions?.[id]?.name||id;
  const humanMinutes=minutes=>{
    const hours=Math.floor(minutes/60),rest=minutes%60;
    return hours?(hours+' h'+(rest?' '+rest+' min':'')):rest+' min';
  };

  function quality(value){
    if(value==null)return '';
    if(Number.isInteger(value)&&value>=0&&value<4)return Object.values(result)[value];
    return Object.hasOwn(result,value)?result[value]:String(value);
  }
  function describeEffects(value){
    if(typeof value==='string')return value;
    if(Array.isArray(value))return value.map(describeEffects).filter(Boolean).join(' · ');
    if(!value||typeof value!=='object')return '';
    return Object.entries(value).map(([id,v])=>{
      const name=effectNames[id]||id.replace(/[-_.]+/g,' ');
      return typeof v==='number'?name+' '+(v>0?'+':'')+v:typeof v==='string'?name+' '+v:v===true?name:'';
    }).filter(Boolean).join(' · ');
  }
  function itemActions(s,item,location,bank,hpMax){
    const id=item.id,controls=[];
    if(location==='pack'){
      if(id==='potion')controls.push(action('Bevi','drink','',Number.isFinite(hpMax)&&s.player.hp>=hpMax));
      else if(/^blade-[0-3]$/.test(id)){
        const equipped=window.Gear?.isEquipped(s,id)??s.workshop?.weapon===id;
        controls.push(action(equipped?'Riponi':'Equipaggia','workshop',{op:'equip',id},false,!equipped));
      }else if(window.Game?.equipment?.[id]){
        const equipped=window.Gear?.isEquipped(s,id)??s.player.equipped===id;
        controls.push(action(equipped?'Equipaggiato':'Equipaggia','equip',id,equipped,!equipped));
      }
      if(window.GearPanel&&Gear.isManaged(id))controls.push(GearPanel.itemActions(s,id));
      const meal=window.Tradecraft?.nutrition(s,id);
      if(meal)controls.push(action(id==='water'||id==='milk'?'Bevi':'Mangia','daily',{op:'eat',id}));
      if(bank&&item.depositable){
        controls.push(action('Deposita 1','economy',{op:'itemDeposit',id,amount:'1'}));
        if(item.quantity!=='1')controls.push(action('Deposita pila','economy',{op:'itemDeposit',id,amount:item.quantity}));
      }
    }else if(bank){
      controls.push(action('Preleva 1','economy',{op:'itemWithdraw',id,amount:'1'}));
      if(item.quantity!=='1')controls.push(action('Preleva pila','economy',{op:'itemWithdraw',id,amount:item.quantity}));
    }
    return controls.join('');
  }

  function bagResults(s,bag,bank){
    const hpMax=window.Game?.s===s?Game.view({detailed:false}).hpMax:null;
    const categories=Object.fromEntries(bag.categories.map(c=>[c.id,c.name]));
    const lines=bag.items.map(item=>{
      const rarity=item.rarity&&item.rarity!=='Comune'?item.rarity:'',grade=quality(item.quality),
        desc=[categories[item.category],rarity,grade?('Qualità '+grade):'',item.description,describeEffects(item.effects)].filter(Boolean).join(' · ');
      const visual=icon(item.icon), controls=itemActions(s,item,bag.location,bank,hpMax);
      return '<div class="row lifePanelRow">'+visual+'<div class="detail"><strong>'+esc(item.name)+'</strong> <span class="bagQuantity" aria-label="'+
        esc('Quantità '+item.formatted)+'">×'+esc(item.formatted)+'</span><small>'+esc(desc)+'</small></div>'+
        (controls?'<div class="lifeRowActions">'+controls+'</div>':'')+'</div>';
    });
    const count=it.format(bag.shown)+' / '+it.format(bag.distinct)+' tipi visibili';
    return '<p class="bagSummary" role="status">'+esc(count)+' · Totale '+esc(bag.totalFormatted)+' unità</p>'+
      (lines.length?lines.join(''):'<p class="lifeEmpty">'+esc(bag.distinct?'Nessun oggetto corrispondente ai filtri.':bag.location==='deposit'?'Il deposito è vuoto.':'Lo zaino è vuoto.')+'</p>');
  }

  function inventory(s,options={}){
    if(!s||!window.Inventory)return '';
    const bank=options.bank===true||options.location==='deposit';
    const group=bank?'bank':'pack';
    const defaults=bagState[group];
    const loc=options.location??defaults.location??'pack';
    const bag=Inventory.view(s,{...defaults,...options,location:bank?loc:'pack'});
    const wallet=window.Economy?.wallet(s.player.gold);
    const money=wallet?details('Borsello',wallet.label,open('Mercati e banca','economy'),icon('coin')):'';
    const bankSelect=bank?'<label>Contenitore<select name="location" data-inventory-filter="location">'+option('pack','Zaino',bag.location)+option('deposit','Deposito',bag.location)+'</select></label>':'';
    return '<section class="inventoryLife" data-life-inventory="'+group+'">'+(bank?'':money)+
      '<div class="inventoryFilters"><label>Cerca<input name="query" type="search" autocomplete="off" placeholder="Nome o descrizione" data-inventory-filter="query" value="'+esc(bag.query)+'"></label>'+
      '<label>Categoria<select name="category" data-inventory-filter="category">'+option('','Tutte',bag.category)+
      bag.categories.map(c=>option(c.id,c.name,bag.category)).join('')+'</select></label>'+
      '<label>Ordina<select name="sort" data-inventory-filter="sort">'+methods.map(([id,name])=>option(id,name,bag.sort)).join('')+'</select></label>'+bankSelect+'</div>'+
      '<div class="bagResults">'+bagResults(s,bag,bank)+'</div></section>';
  }
  function filter(root,s){
    const panel=root?.closest?.('[data-life-inventory]')||root?.querySelector?.('[data-life-inventory]');
    if(!panel||!s)return false;
    const bank=panel.dataset.lifeInventory==='bank';
    const options=Object.fromEntries([...panel.querySelectorAll('[data-inventory-filter]')].map(input=>[input.dataset.inventoryFilter,input.value]));
    if(!bank)options.location='pack';
    Object.assign(bagState[bank?'bank':'pack'],options);
    const slot=panel.querySelector('.bagResults');
    slot.innerHTML=bagResults(s,Inventory.view(s,options),bank);
    window.UI?.paint?.(slot);
    return true;
  }

  function activityLocation(a){
    return a?.site?a.site.name+(a.near?' · Qui':' · '+regionName(a.site.region)):'Nessuna stazione in quest’area';
  }
  function practice(label,kind,data={},disabled=false){
    return action(label,'practice',{kind,...data},disabled,true);
  }
  function farmView(s,workshop,activity){
    const cal=Calendar.view(s.calendar,s.time,s.region);
    const rows=workshop.plots.map(plot=>{
      const label='Aiuola '+(plot.slot+1);
      const desc=plot.name?(plot.wait===0?plot.name+' · Matura':plot.name+' · Matura fra '+humanMinutes(plot.wait)):'Libera';
      return details(label,desc,plot.name?action('Raccogli','workshop',{op:'harvest',plot:plot.slot},!activity.near||plot.wait>0):'');
    });
    return details('Semina di '+cal.season,activity.reason||'Lavorazione del terreno, semina e irrigazione.',practice('Lavora l’aiuola','farming',{},!!activity.reason))+
      title('Aiuole')+rows.join('');
  }
  function herdView(s,workshop,activity){
    const fodder=has(s,'grain')||has(s,'herb'),tool=has(s,'brush');
    const eligible=activity.near&&fodder&&tool;
    const rows=workshop.animals.map(a=>{
      const producing=a.product==null?'':a.product>0?' · Prodotti fra '+humanMinutes(a.product):' · Latte e lana pronti';
      const age=a.adult?'Adulta':a.days===0?'Appena nata':'Giovane · '+a.days+(a.days===1?' giorno':' giorni');
      const note=eligible?(a.canFeed?'': ' · Accudita da poco'):!activity.near?' · Raggiungi il recinto.':!tool?' · Serve una spazzola.':' · Serve grano o erba di rugiada.';
      return details('Lanosa '+a.id,age+' · Fiducia '+a.trust+'/100'+producing+note,
        practice('Accudisci','husbandry',{animal:a.id},!eligible||!a.canFeed)+
        (a.product!=null?action('Raccogli prodotti','workshop',{op:'products',animal:a.id},!activity.near||a.product!==0):''));
    });
    const mature=workshop.animals.filter(a=>a.adult&&a.trust>=45).length;
    const ready=activity.near&&mature>=2&&workshop.animals.length<8&&has(s,'grain',2)&&
      s.workshop.breedAt<=Calendar.timestamp(s.calendar,s.time);
    return rows.join('')+details('Allarga il gregge','Servono due lanose adulte con fiducia 45, 2 grani e spazio nel recinto.',
      action('Alleva una lanosa','workshop',{op:'breed'},!ready));
  }
  function cookingView(s,workshop,activity){
    const canCook=activity.near&&has(s,'pan');
    const ingredients=workshop.ingredients.filter(item=>has(s,item.id));
    const enough=ingredients.length>=2||ingredients.some(item=>has(s,item.id,2));
    let preparation='';
    if(!canCook||!enough){
      preparation='<p>'+esc(!activity.near?'Raggiungi la cucina della locanda.':!has(s,'pan')?'Serve una pentola da campo.':'Raccogli due ingredienti, anche uguali, prima di cucinare.')+'</p>';
    }else{
      const first=ingredients[0].id,second=ingredients.find(i=>i.id!==first)?.id||first;
      const list=selected=>ingredients.map(i=>option(i.id,i.name+' ×'+i.quantity,selected)).join('');
      preparation='<form class="cookForm" data-form="practice"><input type="hidden" name="kind" value="cooking">'+
        '<div class="cookGrid"><label>Primo ingrediente<select name="a" required>'+list(first)+'</select></label>'+
        '<label>Secondo ingrediente<select name="b" required>'+list(second)+'</select></label>'+
        '<label>Tecnica<select name="method" required>'+workshop.methods.map(t=>option(t.id,t.name)).join('')+'</select></label></div>'+
        '<button type="submit" class="btn primary">Cucina</button></form>';
    }
    return preparation+title('Ricettario')+(workshop.recipes.length?workshop.recipes.map(r=>details(r.name,
      [quality(r.quality),r.description,'Preparazioni '+it.format(r.times)].filter(Boolean).join(' · '))).join(''):
      '<p>Combina due ingredienti al focolare per annotare la prima ricetta.</p>');
  }
  function workshop(s,detail){
    if(!s?.workshop||!window.Tradecraft)return '';
    const state=Tradecraft.view(s);
    const wanted=typeof detail==='string'?detail:detail?.kind;
    const choice=state.activities.find(a=>a.kind===wanted)||state.activities.find(a=>a.near)||state.activities[0];
    const tabs='<div class="actions workshopTabs">'+state.activities.map(a=>open(tabNames[a.kind]||a.name,'workshop',a.kind,choice===a)).join('')+'</div>';
    const place=details(choice.name,activityLocation(choice));
    let content='';
    switch(choice.kind){
      case 'fishing':content=details('Canna e lenza',choice.reason||'Lancia, aggancia al momento giusto e controlla la tensione.',
        practice('Lancia la lenza','fishing',{},!!choice.reason));break;
      case 'smithing':content=details('Forgia una lama',choice.reason||'Servono 2 minerali lucenti. Calore, colpi e tempra determinano la qualità.',
        practice('Lavora alla forgia','smithing',{},!!choice.reason))+
        details('Sartoria','Usa 2 unità di lana al banco di Ivo per cucire una mantella che ripara dal freddo.',
          action('Cuci una mantella','workshop',{op:'sew'},!choice.near||!has(s,'wool',2)));break;
      case 'farming':content=farmView(s,state,choice);break;
      case 'husbandry':content=herdView(s,state,choice);break;
      case 'cooking':content=cookingView(s,state,choice);break;
    }
    return '<section class="workshopLife">'+tabs+place+content+'</section>';
  }

  function need(name,value){
    const n=Math.max(0,Math.min(100,value));
    return '<div class="needMeter" data-low="'+(n<32)+'"><span>'+esc(name)+' <b>'+esc(n)+'%</b></span>'+
      '<progress aria-label="'+esc(name)+'" max="100" value="'+n+'"></progress></div>';
  }
  function living(s){
    if(!s?.daily||!s.calendar||!window.Daily)return '';
    const now=Calendar.view(s.calendar,s.time,s.region),state=Daily.view(s);
    const temp=state.temperature<=-28?'Freddo intenso':state.temperature>=28?'Caldo intenso':'Temperatura tollerabile';
    const fatigue=Object.entries(state.modifiers).filter(([,m])=>m).map(([key,delta])=>(effectNames[key]||key)+' '+(delta>0?'+':'')+delta);
    let tools='';
    if(state.nearWater)tools+=action('Bevi alla fonte','daily',{op:'water'},false);
    if(state.restPlace){
      const until=Calendar.sleep(s.calendar,s.time),hours=until.ok?humanMinutes(Math.round(until.minutes)):'';
      tools+=action('Dormi fino alle 06:00','sleep','',false,true);
      tools+=open('Apri lo zaino','inventory');
      return livingBody(now,state,temp,fatigue,details(state.restPlace,hours?'Riposo disponibile · '+hours+' di tempo di gioco.':'Riposo disponibile.',tools));
    }
    tools+=open('Apri lo zaino','inventory');
    return livingBody(now,state,temp,fatigue,details('Riposo','Dormi presso una locanda, in una casa di proprietà o in un luogo adatto al corredo da campo.',tools));
  }
  function livingBody(now,state,temp,fatigue,below){
    const phase=phaseNames[now.phase]||'';
    return '<section class="lifeStatus"><div class="stats">'+stat('Data',now.date)+stat('Ora',now.clock)+stat('Fase',phase)+stat('Meteo',now.weather)+
      stat('Alba',now.sunrise)+stat('Tramonto',now.sunset)+'</div><div class="needGrid">'+need('Sazietà',state.hunger)+need('Idratazione',state.thirst)+need('Energia',state.energy)+'</div>'+
      details(temp,(state.temperature>0?'+':'')+state.temperature+' · '+(fatigue.length?fatigue.join(' · '):'Nessuna penalità o bonus attivo.'))+
      (state.buff?details('Effetto del pasto',(effectNames[state.buff.kind]||state.buff.kind)+' +'+state.buff.power+' · '+humanMinutes(state.buff.remaining)):'')+below+'</section>';
  }
  function quests(s){
    if(!s?.daily||!window.Daily)return '';
    const rows=Daily.view(s).quests.map(q=>{
      const qty=q.accepted?' · '+q.progress+'/'+q.target:'';
      let control=q.claimed?'<span class="lifeQuestState">Riscossa</span>':q.ready?action('Riscuoti','daily',{op:'claim',id:q.id},false,true):
        q.accepted?'<span class="lifeQuestState">In corso</span>':action('Accetta','daily',{op:'accept',id:q.id},false);
      return details(q.name,[q.category,q.from,q.need+qty,q.reward+' Scintille'].filter(Boolean).join(' · '),control);
    });
    return rows.length?title('Incarichi dei mestieri e giornalieri')+rows.join(''):'';
  }

  const css=[
    '.inventoryLife .inventoryFilters,.workshopLife .cookGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:7px;margin:9px 0 11px}',
    '.inventoryFilters label,.cookForm label{min-width:0;display:grid;gap:3px;font-size:12px;color:#b9cbc2}',
    '.inventoryLife select,.inventoryLife input,.cookForm select{width:100%;min-height:32px;box-sizing:border-box;background:#10292e;color:#e6e5d4;border:1px solid var(--line,#769483);border-radius:2px;padding:4px 6px;font:inherit}',
    '.bagQuantity{display:inline-block;color:#f5d398;font-size:12px;font-weight:bold;max-width:100%;overflow-wrap:anywhere}',
    '.lifePanelRow .detail{min-width:0;overflow-wrap:anywhere}',
    '.lifeRowActions{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;min-width:max-content}',
    '.bagSummary,.lifeEmpty{font-size:13px}.workshopTabs{margin:4px 0 7px}.cookForm{margin:7px 0 11px}',
    '.lifeStatus .needGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:7px;margin:8px 0}',
    '.needMeter{padding:6px 8px;border:1px solid var(--line,#769483);background:#182f33}.needMeter span{display:flex;justify-content:space-between;color:#d7e6d8;font-size:12px}',
    '.needMeter progress{width:100%;height:10px;accent-color:#88bc9f}.needMeter[data-low="true"] progress{accent-color:#de8f76}',
    '.lifeQuestState{font-size:12px;color:#ebc68d}',
    '@media(max-width:530px){.lifePanelRow{flex-wrap:wrap}.lifePanelRow .detail{min-width:52%}.lifePanelRow .lifeRowActions{margin-left:auto;min-width:0}}'
  ].join('\n');
  window.LifePanels=Object.freeze({inventory,workshop,living,quests,filter,css});
})();

