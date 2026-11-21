/* The gear screen uses the existing pane, buttons, icons and colour palette. */
(() => {
  'use strict';

  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
  const title=text=>'<h3 class="sectionTitle">'+esc(text)+'</h3>';
  const actions=(...contents)=>'<div class="actions">'+contents.join('')+'</div>';
  const select=(label,id='',primary=false)=>'<button class="btn '+(primary?'primary':'')+'" data-do="gear"'+
    (id?' data-value="'+esc(id)+'"':'')+'>'+esc(label)+'</button>';
  const command=(label,d,disabled=false,primary=false)=>'<button class="btn '+(primary?'primary':'')+
    '" data-cmd="gear" data-value="'+esc(JSON.stringify(d))+'"'+(disabled?' disabled':'')+'>'+esc(label)+'</button>';
  const icon=kind=>'<canvas class="itemArt" data-art="icon" data-kind="'+esc(kind||'ward')+'" width="32" height="32" aria-hidden="true"></canvas>';
  const row=(name,more,tools='',art='')=>'<div class="row lifePanelRow">'+art+'<div class="detail"><strong>'+esc(name)+'</strong>'+
    (more?'<small>'+esc(more)+'</small>':'')+'</div>'+tools+'</div>';
  const rarity=r=>'<span class="cap" style="color:'+r.color+'">'+esc(r.name)+'</span>';
  const details=(name,state,tool='')=>{
    const copy=state.allowed?state.cost:[state.reason,state.cost].filter(Boolean).join(' · ');
    return row(name,copy,tool);
  };
  const statsOf=stats=>[['attack','Attacco'],['defense','Difesa'],['speed','Velocità']]
    .filter(([id])=>stats[id]).map(([id,label])=>label+' +'+stats[id]).join(' · ');

  function status(item){
    if(item.equipped&&item.broken)return 'Equipaggiato · Inattivo';
    if(item.active)return 'Equipaggiato';
    if(item.pack)return 'Nello zaino';
    if(item.deposit)return 'In deposito';
    if(item.acquired)return 'Fuori dallo zaino';
    return 'Da acquisire';
  }
  const target=(item,lab='Dettagli')=>select(lab,item.id);
  function pieceSummary(item,includeRarity=true){
    return [includeRarity?item.rarity.name:'',item.quality,status(item),item.current!=null?'Durabilità '+item.current+' / '+item.max:'']
      .filter(Boolean).join(' · ');
  }
  function overview(state,detail){
    const filter=state.rarities.find(r=>'rarity-'+r.id===detail);
    const selected=state.slots.map(slot=>{
      const item=state.items.find(it=>it.id===slot.selected);
      return row(slot.label,item?item.name+' · '+pieceSummary(item):'Slot libero.',item?target(item):'',icon(item?.icon||'ward'));
    }).join('');
    const equipped=state.items.filter(item=>item.active);
    const summed={attack:0,defense:0,speed:0};
    for(const item of equipped)for(const id of Object.keys(summed))summed[id]+=item.stats[id]||0;
    const summary=statsOf(summed);
    const filters=actions(select('Tutte le rarità','',!filter),
      ...state.rarities.map(r=>select(r.name,'rarity-'+r.id,filter?.id===r.id)));
    const markup=(filter?[filter]:state.rarities).map(r=>{
      const entries=state.items.filter(e=>e.rarity.id===r.id);
      if(!entries.length)return '';
      return '<h3 class="sectionTitle" style="color:'+r.color+'">'+esc(r.name)+'</h3>'+
        entries.map(item=>row(item.name,pieceSummary(item,false)+' · '+statsOf(item.stats),target(item),icon(item.icon))).join('');
    }).join('');
    return title('Slot della forma attuale')+selected+
      (summary?row('Bonus dell’equipaggiamento attivo',summary):'')+
      title('Manutenzione e catalogo')+row(state.location,'Fabbro livello '+state.smithRank+' · Corredi '+state.kits)+
      details('Prepara un corredo da riparazione',state.makeKit,command('Prepara',{op:'makeKit'},!state.makeKit.allowed))+
      filters+markup;
  }

  function detailView(state,item){
    const slot=state.slots.find(where=>where.id===item.slot);
    const back=actions(select('Torna all’equipaggiamento'),select(item.rarity.name,'rarity-'+item.rarity.id));
    const top=back+'<header>'+rarity(item.rarity)+title(item.name)+'</header>'+
      row(slot.label,item.description,undefined,icon(item.icon))+
      row(status(item),statsOf(item.stats));
    if(!item.acquired){
      const unlock=item.craft?details('Materiali e lavoro di forgia',item.craft,command('Forgia',{op:'craft',id:item.id},!item.craft.allowed,true)):
        row('Provenienza',item.source);
      return top+unlock;
    }
    const current=item.current ?? 0;
    const meter='<progress class="practiceProgress" aria-label="Durabilità" value="'+current+'" max="'+item.max+'"></progress>';
    const wear=current===0?'Durabilità 0 / '+item.max+' · Il pezzo non fornisce bonus.':
      'Durabilità '+current+' / '+item.max;
    const progress=row('Qualità '+item.quality,wear,meter)+
      row('Maestria '+item.mastery+' / 5',item.masteryNext==null?'Maestria massima.':
      item.uses+' / '+item.masteryNext+' utilizzi per il livello successivo.')+
      row('Ascensione '+item.ascension+' / 2',item.enchant?item.enchant.name+' · '+item.enchant.description:'Incantamento assente.');
    if(!item.pack)return top+progress+row('Operazioni',item.deposit?'Preleva il pezzo dal deposito per usarlo.':'Riporta il pezzo nello zaino prima di lavorarlo.');
    const equip=actions(command(item.equipped?'Riponi':'Equipaggia',
      {op:item.equipped?'unequip':'equip',id:item.id},!item.equipped&&item.broken,true));
    const repairs=title('Riparazioni')+
      details('Riparazione da Ivo',item.repairNPC,command('Ripara',{op:'repair',mode:'npc',id:item.id},!item.repairNPC.allowed))+
      details('Riparazione sul campo',item.repairKit,command('Usa corredo',{op:'repair',mode:'kit',id:item.id},!item.repairKit.allowed));
    const upgrades=title('Lavorazione avanzata')+
      [['temper','Migliora qualità','Tempra'],['ascend','Ascensione','Ascendi'],['enchant','Primo incantamento','Incanta']]
        .map(([op,label,verb])=>details(label,item.upgrades[op],command(verb,{op,id:item.id},!item.upgrades[op].allowed))).join('');
    return top+progress+equip+repairs+upgrades;
  }

  function render(s,detail=''){
    if(!window.Gear)return '';
    const state=Gear.view(s);
    if(!state)return '';
    const item=state.items.find(row=>row.id===detail);
    return item?detailView(state,item):overview(state,detail);
  }

  function itemActions(s,id){
    if(!window.Gear?.isManaged(id))return '';
    return select('Equipaggiamento',id);
  }

  window.GearPanel=Object.freeze({render,itemActions});
})();

