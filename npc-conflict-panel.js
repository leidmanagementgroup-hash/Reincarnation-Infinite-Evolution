/* Collega gli scontri persistenti ai pannelli originali senza cambiare HUD e mappa. */
(() => {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const order={critical:0,injured:1,dead:2,healthy:3};
  const regionName=region=>window.World?.regions?.[region]?.name||region;
  const row=(name,body,action='')=>'<div class="row conflictRow"><div class="detail"><strong>'+esc(name)+'</strong><small>'+esc(body)+'</small></div>'+action+'</div>';
  const title=label=>'<h3 class="sectionTitle">'+esc(label)+'</h3>';
  const open=(label,page,id)=>'<button type="button" class="btn" data-do="'+esc(page)+'"'+(id?' data-value="'+esc(id)+'"':'')+'>'+esc(label)+'</button>';
  const command=(a,id)=>'<button type="button" class="btn'+(a.allowed?' primary':'')+'" data-cmd="conflict" data-value="'+
    esc(JSON.stringify({id,op:a.op}))+'"'+(a.allowed?'':' disabled')+'>'+esc(a.label)+'</button>';
  function render(s,id){
    const v=window.Conflicts?.view(s,id);
    if(!v)return '';
    const info=v.selected;
    let out='<section class="conflictLedger">';
    if(info){
      const hp=info.status==='dead'||info.status==='critical'?'':info.hp+'/'+info.maxHp+' vitalità';
      const region=info.point&&regionName(info.point.region);
      out+=title(info.name)+row(info.label,[info.role,region,hp].filter(Boolean).join(' · '));
      if(info.cause)out+='<p class="caption">'+esc(info.cause)+'</p>';
      if(info.status==='critical')out+='<p class="conflictWarning">Cure urgenti · '+esc(info.deadline)+' secondi di gioco. Il tempo riprende quando torni nel mondo.</p>';
      if(info.status==='dead')out+='<p>Il memoriale conserva il nome dell’abitante e il ricordo dei suoi legami. L’Eco del sovrano leggendario permette un solo tentativo di risveglio.</p>';
      if(info.status==='healthy')out+=row('Esperienza di difesa',info.experience+' punti · scontri vinti '+info.kills);
      if(v.actions.length){
        out+='<div class="actions">'+v.actions.map(a=>command(a,info.id)).join('')+'</div>';
        const hints=[...new Set(v.actions.map(a=>a.reason).filter(Boolean))];
        if(hints.length)out+='<p class="caption">'+esc(hints.join(' '))+'</p>';
      }
      out+='<div class="actions">'+open('Cronaca degli scontri','conflicts')+'</div>';
    }
    if(v.active&&!info){
      out+=title('Scontro in corso')+row(v.active.npc?.name||'Pattuglia',v.active.opponent,
        v.active.npc?open('Vedi condizioni','conflicts',v.active.npc.id):'');
    }
    if(v.family)out+='<p class="conflictWarning">'+esc(v.family)+'</p>';
    if(v.faction.mourning)out+=row('Lutto nella regione','Morti registrate '+v.faction.deaths+'. Gli abitanti ne conservano memoria.');
    if(v.entries.length){
      out+=title('Condizioni registrate')+v.entries.slice().sort((a,b)=>order[a.status]-order[b.status]).map(n=>
        row(n.name,n.label+' · '+(n.point?regionName(n.point.region):n.role),open('Dettagli','conflicts',n.id))).join('');
    }
    if(v.events.length)out+=title('Ultimi avvenimenti')+v.events.slice(0,12).map(e=>row(e.title,regionName(e.region))).join('');
    if(!info&&!v.active&&!v.entries.length&&!v.events.length)out+='<p>Le pattuglie si muovono lungo i margini degli insediamenti. Gli esiti degli scontri compaiono qui.</p>';
    return out+'</section>';
  }
  const css='.conflictWarning{padding:8px 10px;border-left:3px solid #d69580;background:#372d31;color:#f1c3ad}.conflictRow .detail{min-width:0}.conflictRow .btn{flex:none}';
  window.ConflictPanel={render,css};
})();

