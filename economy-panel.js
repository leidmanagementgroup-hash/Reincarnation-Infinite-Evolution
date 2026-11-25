/* Pannello per i mercati e la banca universale. */
(() => {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const off=condition=>condition?' disabled':'';
  const validCount=value=>/^(0|[1-9]\d*)$/.test(String(value??''));
  const asCount=value=>validCount(value)?BigInt(value):0n;
  const head=label=>'<h3 class="sectionTitle">'+esc(label)+'</h3>';
  const amount=(label='Quantità')=>'<input name="amount" type="text" inputmode="numeric" pattern="[1-9][0-9]*" value="1" required aria-label="'+esc(label)+'">';
  const glyph=icon=>'<canvas class="itemArt" width="32" height="32" data-art="icon" data-kind="'+esc(icon||'coin')+'"></canvas>';
  const option=(value,label)=>'<option value="'+esc(value)+'">'+esc(label)+'</option>';
  const submit=(label,disabled=false)=>'<button type="submit" class="btn primary"'+off(disabled)+'>'+esc(label)+'</button>';
  function quick(op,id,n,possible,name){
    const verb=op==='buy'?'Compra':'Vendi',label=verb+' '+n;
    return '<button class="btn'+(op==='buy'&&n===1?' primary':'')+'" type="button" data-cmd="economy" data-value="'+
      esc(JSON.stringify({op,id,amount:String(n)}))+'" aria-label="'+esc(label+' '+name)+'"'+off(!possible)+'>'+esc(label)+'</button>';
  }
  function coinList(wallet){
    return '<ul class="economyCoins">'+wallet.coins.map(c=>
      '<li><small>'+esc(c.name)+'</small><b>'+esc(c.formatted)+'</b></li>').join('')+'</ul>';
  }
  function currencyCards(data){
    return '<div class="economyWallets"><section class="card">'+
      '<h3>Borsello</h3>'+coinList(data.wallet)+'</section>'+
      '<section class="card"><h3>Banca condivisa</h3>'+coinList(data.bank.wallet)+'</section></div>';
  }
  function row(record,available,carried){
    const stock=asCount(record.stock),owned=asCount(record.owned);
    const buy=n=>available&&stock>=BigInt(n)&&carried>=BigInt(record.buy)*BigInt(n);
    const sell=n=>available&&record.sellable&&owned>=BigInt(n);
    const choices=(buy(1)?option('buy','Compra'):'')+(sell(1)?option('sell','Vendi'):'');
    return '<article class="row economyListing">'+glyph(record.icon)+
      '<div class="detail"><strong>'+esc(record.name)+'</strong><small>Scorta locale <b>'+esc(record.formattedStock)+'</b> · Nello zaino <b>'+esc(record.formattedOwned)+'</b></small>'+
      '<small>Compra a '+esc(record.buy)+' · Vendi a '+esc(record.sell)+' Scintille per unità</small></div>'+
      (available?'<div class="economyTrade">'+
        '<div class="economyQuick">'+quick('buy',record.id,1,buy(1),record.name)+quick('buy',record.id,5,buy(5),record.name)+
          quick('sell',record.id,1,sell(1),record.name)+quick('sell',record.id,5,sell(5),record.name)+'</div>'+
        (choices?'<details class="economyMore"><summary>Altra quantità</summary><form data-form="economy" class="economyForm economyCustom">'+
          '<input type="hidden" name="id" value="'+esc(record.id)+'">'+
          '<select name="op" aria-label="Operazione per '+esc(record.name)+'">'+choices+'</select>'+
          amount('Quantità di '+record.name)+submit('Conferma')+'</form></details>':'')+'</div>':'')+'</article>';
  }
  function moneyForm(data){
    const allowDeposit=asCount(data.wallet.total)>0n,allowWithdraw=asCount(data.bank.balance)>0n;
    if(!allowDeposit&&!allowWithdraw)return '<p class="caption">Il borsello e il conto sono vuoti.</p>';
    return '<form class="economyForm economyMoney" data-form="economy">'+
      '<select name="op" aria-label="Operazione sul denaro">'+
        (allowDeposit?option('bankDeposit','Versa denaro'):'')+(allowWithdraw?option('bankWithdraw','Preleva denaro'):'')+'</select>'+
      amount('Quantità di monete')+
      '<select name="currency" aria-label="Valuta">'+data.wallet.coins.slice().reverse().map(c=>option(c.id,c.name)).join('')+'</select>'+
      submit('Conferma')+'</form>';
  }
  function itemForm(rows,op,label){
    if(!rows.length)return '';
    return '<details class="economyMore economyItemBank"><summary>'+esc(label)+'</summary><form class="economyForm economyItems" data-form="economy">'+
      '<input type="hidden" name="op" value="'+esc(op)+'">'+
      '<select name="id" aria-label="Oggetto">'+rows.map(r=>option(r.id,r.name+' ×'+r.formatted)).join('')+'</select>'+
      amount('Quantità di oggetti')+submit('Conferma')+'</form></details>';
  }
  function bank(s,data){
    const vault=data.bank.items.items;
    const stock=window.Inventory.view(s,{location:'pack'}).items.filter(item=>item.depositable);
    return head('Depositi e prelievi')+'<p>Il conto e gli oggetti depositati sono accessibili da tutti i mercati.</p>'+
      (data.bank.available?moneyForm(data)+itemForm(stock,'itemDeposit','Deposita oggetti')+itemForm(vault,'itemWithdraw','Ritira oggetti'):
        '<p class="caption">Per versare o prelevare, raggiungi un bancone durante l’orario di apertura.</p>')+
      (vault.length?'<ul class="economyStored" aria-label="Oggetti in deposito">'+vault.map(r=>
        '<li>'+esc(r.name)+' <b>×'+esc(r.formatted)+'</b></li>').join('')+'</ul>':
        '<p class="caption">Il deposito degli oggetti è vuoto.</p>');
  }
  function marketIndex(entries){
    const continents=window.World?.continents||[];
    return '<details class="economyWhere"><summary>Dove trovare i '+(entries.length===5?'cinque ':'')+'mercati</summary><ul>'+
      entries.map(m=>{
        const continent=continents.find(c=>c.id===m.continent)?.name;
        const place=[m.regionName,continent].filter(Boolean).join(' · ');
        return '<li><div><strong>'+esc(m.name)+'</strong><small>'+esc(place)+' · '+esc(m.hours)+'</small></div>'+
          '<span class="economyStatus" data-open="'+Boolean(m.open)+'">'+(m.open?(m.near?'Sei qui':'Aperto'):'Chiuso')+'</span></li>';
      }).join('')+'</ul></details>';
  }
  /* Tendenze, merci in viaggio e ricchezza del mercato aperto (ECO-003): sola lettura da `Economy.flowReport`. */
  function trend(view,stockPct){
    const net=view?view.output-view.demand:0,pressure=Math.abs(net)<.05?0:net>0?1:-1;
    if(stockPct<35&&pressure<=0)return {sign:'▼',text:'scarsa e in calo',tone:'low'};
    if(stockPct>135&&pressure>=0)return {sign:'▲',text:'abbondante',tone:'high'};
    if(pressure>0)return {sign:'▲',text:'in ripresa',tone:'up'};
    if(pressure<0)return {sign:'▼',text:'in consumo',tone:'down'};
    return {sign:'■',text:'stabile',tone:'flat'};
  }
  function flows(s,market){
    const rep=window.Economy?.flowReport?.(s);
    if(!rep)return '';
    const mine=rep.markets.find(m=>m.id===market.id);
    if(!mine)return '';
    const names=Object.fromEntries(market.rows.map(r=>[r.id,r.name]));
    const nameOf=id=>names[id]||names[id==='potion'?'potions':id]||id;
    const view=rep.outlook[market.id]||{},coming=rep.transit[market.id]||{};
    const goods=mine.goods.map(g=>{
      const target=Number(g.target)||1,have=Number(g.stock)||0,pct=Math.round(100*have/target),t=trend(view[g.id],pct);
      return '<li data-tone="'+t.tone+'"><span aria-hidden="true">'+t.sign+'</span> <b>'+esc(nameOf(g.id))+'</b> · '+esc(have)+' / '+esc(target)+
        ' · '+esc(t.text)+(coming[g.id]?' · <em>'+esc(coming[g.id])+' in arrivo</em>':'')+'</li>';
    }).join('');
    const ids=Object.fromEntries(rep.markets.map(m=>[m.id,m.id]));
    const link=rep.routes.filter(r=>r[0]===market.id||r[1]===market.id).map(r=>{
      const other=r[0]===market.id?r[1]:r[0],to=(window.Economy.view(s).markets||[]).find(m=>m.id===other);
      return '<li>'+esc(to?to.name:ids[other]||other)+' · '+esc(r[2])+(r[2]===1?' giorno':' giorni')+' di viaggio · fino a '+esc(r[3])+' carichi</li>';
    }).join('');
    return '<details class="economyMore economyFlows"><summary>Tendenze e rotte del mercato</summary>'+
      '<p class="caption">Ricchezza locale '+esc(mine.wealth)+' · giorno '+esc(rep.day)+'. Le tendenze confrontano produzione e consumo dei residenti con le scorte.</p>'+
      '<ul class="economyTrend" aria-label="Tendenze delle merci">'+goods+'</ul>'+
      (link?'<h4>Rotte commerciali</h4><ul class="economyRoutes">'+link+'</ul>':'')+'</details>';
  }
  function render(s){
    const data=window.Economy?.view(s);
    if(!data)return '<p>Apri una partita per consultare i mercati.</p>';
    const market=data.market,carried=asCount(data.wallet.total);
    const access=market.available?'Commercio disponibile al bancone.':(!market.open?
      'Commercio sospeso fino all’apertura.':('Raggiungi il banco in '+market.regionName+' per commerciare.'));
    return '<div class="economyPanel">'+
      currencyCards(data)+marketIndex(data.markets)+
      '<div class="economyHead">'+head(market.name)+
        '<span class="economyStatus" data-open="'+Boolean(market.open)+'">'+(market.open?'Aperto':'Chiuso')+'</span></div>'+
      '<p>'+esc(market.regionName)+' · '+esc(market.hours)+' · '+esc(access)+'</p>'+
      '<p class="caption">'+(market.id==='velaris'?
        'Le botteghe ricevono beni dai mestieri locali all’alba e dalle commissioni consegnate a Velaris. Le scorte influenzano i prezzi.':
        'Le scorte appartengono a questo mercato. I prodotti di base vengono riforniti col passare dei giorni.')+'</p>'+
      '<section aria-label="Scorte e prezzi del mercato">'+(market.rows.length?market.rows.map(r=>row(r,market.available,carried)).join(''):'<p>Le scorte sono esaurite.</p>')+'</section>'+
      flows(s,market)+careers(s,market)+bank(s,data)+'</div>';
  }
  /* Mestieri (Living World 2.0): ordini dell'armeria ai Filoni, contratti del Registro a Calis, taccuino dei prezzi visti. */
  function careerAction(label,op,possible){
    return '<button class="btn primary" type="button" data-cmd="economy" data-value="'+esc(JSON.stringify({op}))+'"'+off(!possible)+'>'+esc(label)+'</button>';
  }
  function careers(s,market){
    const v=window.Careers?.view(s,market.id);
    if(!v)return '';
    let out='';
    if(v.armory){
      const a=v.armory;
      out+='<section class="card economyCareer" aria-label="'+esc(a.name)+'"><h3>'+esc(a.name)+'</h3>'+
        '<p>'+esc(a.standing)+' · ordini consegnati '+esc(a.orders)+' · lame sul banco '+esc(a.onBench)+' (ordina quando sono meno di '+esc(a.want)+')</p>'+
        '<p class="caption">'+esc(a.available?'Ordine del giorno: una lama di qualità almeno '+a.minQuality+'. Consegneresti '+a.bladeName+'.':a.why)+(a.next?' '+esc(a.next):'')+'</p>'+
        careerAction(a.available?'Consegna la lama · +'+a.pay+' Scintille':'Consegna la lama','armoryOrder',a.available&&market.available)+'</section>';
    }
    if(v.cargo){
      const c=v.cargo;
      out+='<section class="card economyCareer" aria-label="'+esc(c.name)+'"><h3>'+esc(c.name)+'</h3>'+
        '<p>'+esc(c.standing)+' · contratti consegnati '+esc(c.contracts)+(c.good?' · al porto manca '+c.goodName+' ('+c.gap+'% sotto la scorta)':'')+'</p>'+
        '<p class="caption">'+esc(c.available?'Contratto del giorno: '+c.size+' '+c.goodName+'.':c.why)+(c.next?' '+esc(c.next):'')+'</p>'+
        careerAction(c.available?'Consegna il carico · +'+c.pay+' Scintille':'Consegna il carico','cargoContract',c.available&&market.available)+'</section>';
    }
    out+='<section class="card economyCareer" aria-label="Taccuino del mercante"><h3>Taccuino del mercante</h3>'+
      (v.notebook.length?'<ul class="economyNotes">'+v.notebook.map(n=>'<li>'+esc(n.name+' · qui la compri a '+n.buy+' · '+n.market+' la pagava '+n.sell+' (giorno '+n.day+')')+'</li>').join('')+'</ul>':
        '<p class="caption">'+esc(v.visited<2?'Il taccuino annota i prezzi dei mercati in cui commerci di persona: visitane altri per confrontarli.':'Nessuna merce di qui si vendeva meglio nei mercati che hai visto.')+'</p>')+'</section>';
    return out;
  }
  const css=[
    '.economyWallets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}',
    '.economyCoins{list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 10px;padding:0;margin:7px 0 0}',
    '.economyCoins li{min-width:0}',
    '.economyFlows{margin:9px 0}.economyTrend,.economyRoutes{list-style:none;margin:5px 0;padding:0}.economyTrend li,.economyRoutes li{font-size:12px;border-top:1px solid var(--line);padding:4px 0}.economyTrend [data-tone=low],.economyTrend [data-tone=down]{color:#edc0a8}.economyTrend [data-tone=high],.economyTrend [data-tone=up]{color:#c6dfb5}.economyFlows h4{margin:8px 0 2px;font-size:12px;color:var(--gold)}',
    '.economyCareer{margin-top:10px}.economyNotes{margin:6px 0 0;padding-left:18px}',
    '.economyCoins li small{font-size:11px;margin:0}',
    '.economyCoins li b,.economyListing b,.economyStored b{color:var(--gold);overflow-wrap:anywhere}',
    '.economyWhere{border:1px solid var(--line);border-radius:3px;margin:9px 0 7px;padding:7px 10px}',
    '.economyWhere summary,.economyMore summary{color:var(--gold);cursor:pointer;font-size:12px}',
    '.economyWhere ul,.economyStored{list-style:none;margin:5px 0;padding:0}',
    '.economyWhere li{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--line)}',
    '.economyWhere li small{display:block;color:var(--muted);font-size:11px}',
    '.economyHead{display:flex;align-items:baseline;justify-content:space-between;gap:8px}',
    '.economyStatus{border:1px solid var(--line);border-radius:2px;white-space:nowrap;padding:2px 5px;font-size:10px;color:#edc0a8}',
    '.economyStatus[data-open=true]{color:#c6dfb5}',
    '.economyListing{align-items:flex-start;gap:8px}',
    '.economyListing .detail,.economyTrade{min-width:0}',
    '.economyTrade{display:grid;gap:6px;flex:none;width:min(246px,49%)}',
    '.economyQuick{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}',
    '.economyQuick .btn,.economyForm .btn{min-width:0;padding:6px 5px;white-space:nowrap}',
    '.economyQuick .btn{font-size:11px}',
    '.economyMore summary{padding:2px 0}',
    '.economyItemBank{margin:6px 0}',
    '.economyForm{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0;align-items:stretch}',
    '.economyForm input:not([type=hidden]),.economyForm select{font:inherit;font-size:12px;color:var(--paper);background:#142b30;border:1px solid var(--line);border-radius:2px;padding:5px;min-width:0;max-width:100%}',
    '.economyForm input[name=amount]{width:66px}',
    '.economyItems select[name=id]{max-width:min(290px,100%)}',
    '.economyCustom select[name=op]{flex:1}',
    '.economyStored li{font-size:12px;border-top:1px solid var(--line);padding:4px 0}',
    '@media(max-width:550px){.economyListing{flex-wrap:wrap}.economyListing .detail{flex:1}.economyTrade{width:100%}.economyQuick .btn,.economyForm .btn{min-height:34px}.economyForm input:not([type=hidden]),.economyForm select{min-height:34px}}'
  ].join('\n');
  window.EconomyPanel={render,css};
})();

