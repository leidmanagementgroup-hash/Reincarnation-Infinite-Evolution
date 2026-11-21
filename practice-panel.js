/* Vista accessibile dei mestieri. Può essere montata nell'interfaccia esistente. */
(() => {
  'use strict';
  const uiAttribute='data-practice-panel';
  const bindings=new WeakMap();
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const percent=value=>Math.round(Math.max(0,Math.min(1,Number.isFinite(value)?value:0))*100);
  const tone=value=>value==='blue'||value==='red'?value:'gold';
  const stamp=value=>Math.max(0,Math.floor(Number(value)||0))+' s';
  const signature=view=>[view.phase,...view.meters.map(m=>m.id),...view.actions.map(a=>a.id)].join('|');
  const report=result=>{
    if(!result)return '';
    const product=result.fish?.name||result.recipe?.name||'';
    return result.success
      ? [product,result.quality+' · '+result.score+'/100'].filter(Boolean).join(' — ')
      : result.reason||'Prova non riuscita.';
  };

  function meterHtml(m){
    const width=percent(m.value),band=m.target,left=percent(band?.[0]),range=Math.max(0,percent(band?.[1])-left);
    return '<div class="practiceMeter" data-practice-meter="'+escape(m.id)+'" data-tone="'+tone(m.tone)+'">'+
      '<div class="practiceLabel"><span>'+escape(m.label)+'</span><span data-practice-value>'+width+'%</span></div>'+
      '<div class="practiceTrack" role="meter" aria-label="'+escape(m.label)+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+width+'">'+
      (band?'<i class="practiceBand" aria-hidden="true" style="left:'+left+'%;width:'+range+'%"></i>':'')+
      '<i class="practiceFill" aria-hidden="true" style="width:'+width+'%"></i>'+
      '<i class="practiceCursor" aria-hidden="true" style="left:'+width+'%"></i></div></div>';
  }
  function actionHtml(a){
    return '<button class="btn primary practiceAction" type="button" data-practice="'+escape(a.id)+'"'+
      (a.hold?' data-hold="true"':'')+(a.enabled===false?' disabled':'')+'>'+
      '<span>'+escape(a.label)+'</span>'+(a.hold?'<small class="practiceHold">Premi o tieni premuto</small>':'')+'</button>';
  }
  function components(view){
    return '<div class="practiceMeters">'+view.meters.map(meterHtml).join('')+'</div>'+
      '<div class="practiceActions">'+view.actions.map(actionHtml).join('')+'</div>'+
      (view.result?'<p class="practiceResult'+(view.result.success?' success':'')+'" role="status">'+escape(report(view.result))+'</p>':'');
  }

  function render(view){
    if(!view)return '';
    const progress=percent(view.progress);
    return '<div class="practiceGame" '+uiAttribute+' data-practice-stage="'+escape(view.phase)+'">'+
      '<div class="practiceHead"><strong>'+escape(view.title)+'</strong><span class="practiceTime" data-practice-time'+(view.result?' hidden':'')+'>'+stamp(view.timeLeft)+'</span></div>'+
      '<p class="practiceInstructions" data-practice-instructions>'+escape(view.instructions)+'</p>'+
      '<div class="practiceProgressLine" role="progressbar" aria-label="Avanzamento della prova" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+progress+'"'+(view.result?' hidden':'')+'><i aria-hidden="true" style="width:'+progress+'%"></i></div>'+
      '<div class="practiceBody" data-practice-layout="'+escape(signature(view))+'">'+components(view)+'</div>'+
      '<p class="practiceFeedback" data-practice-feedback aria-live="polite">'+escape(view.feedback)+'</p></div>';
  }
  const panelRoot=root=>!root?null:root.hasAttribute?.(uiAttribute)?root:root.querySelector?.('['+uiAttribute+']')||null;
  const put=(element,text)=>{const next=String(text??'');if(element&&element.textContent!==next)element.textContent=next;};

  function meterUpdate(meter,m){
    const width=percent(m.value),newTone=tone(m.tone);
    if(meter.dataset.tone!==newTone)meter.dataset.tone=newTone;
    const track=meter.querySelector('.practiceTrack');
    if(track.getAttribute('aria-valuenow')===String(width))return;
    track.setAttribute('aria-valuenow',width);
    put(meter.querySelector('[data-practice-value]'),width+'%');
    track.querySelector('.practiceFill').style.width=width+'%';
    track.querySelector('.practiceCursor').style.left=width+'%';
  }
  function update(root,view){
    const panel=panelRoot(root);
    if(!panel||!view)return false;
    const content=panel.querySelector('.practiceBody'),layout=signature(view);
    panel.dataset.practiceStage=view.phase;
    const time=panel.querySelector('[data-practice-time]');
    time.hidden=!!view.result;put(time,stamp(view.timeLeft));
    put(panel.querySelector('[data-practice-instructions]'),view.instructions);
    put(panel.querySelector('[data-practice-feedback]'),view.feedback);
    const line=panel.querySelector('.practiceProgressLine'),progress=percent(view.progress);
    line.hidden=!!view.result;
    if(line.getAttribute('aria-valuenow')!==String(progress)){
      line.setAttribute('aria-valuenow',progress);
      line.firstElementChild.style.width=progress+'%';
    }
    if(content.dataset.practiceLayout!==layout){
      const focused=panel.ownerDocument.activeElement, changeFocus=content.contains(focused);
      const previous=focused?.dataset?.practice;
      bindings.get(panel)?.release();
      content.innerHTML=components(view);content.dataset.practiceLayout=layout;
      if(changeFocus){
        const buttons=[...content.querySelectorAll('button[data-practice]:enabled')];
        (buttons.find(a=>a.dataset.practice===previous)||buttons[0])?.focus({preventScroll:true});
      }
      return true;
    }
    const meters=content.querySelectorAll('[data-practice-meter]');
    view.meters.forEach((m,i)=>meterUpdate(meters[i],m));
    const buttons=content.querySelectorAll('button[data-practice]');
    view.actions.forEach((a,i)=>{
      buttons[i].disabled=a.enabled===false;
      put(buttons[i].querySelector('span'),a.label);
    });
    return true;
  }

  function bind(root,control){
    const panel=panelRoot(root);
    if(!panel||typeof control!=='function')return ()=>{};
    bindings.get(panel)?.dispose();
    const doc=panel.ownerDocument;
    let active=null,closed=false;
    function release(pointer){
      if(!active||(pointer!==undefined&&active.pointer!==pointer))return;
      const {button}=active;active=null;
      delete button.dataset.pressed;
      control({hold:null});
    }
    function onPointerDown(event){
      if(event.button!==0||active)return;
      const button=event.target.closest?.('button[data-practice]');
      if(!button||!panel.contains(button)||button.disabled||button.dataset.hold!=='true')return;
      active={button,pointer:event.pointerId};
      button.dataset.pressed='true';
      try{button.setPointerCapture(event.pointerId);}catch{}
      control({hold:button.dataset.practice});
      control({action:button.dataset.practice});
    }
    function onPointerUp(event){release(event.pointerId);}
    function onClick(event){
      const button=event.target.closest?.('button[data-practice]');
      if(!button||!panel.contains(button)||button.disabled)return;
      if(button.dataset.hold==='true'&&event.detail>0)return;
      event.preventDefault();control({action:button.dataset.practice});
    }
    function onVisibility(){if(doc.hidden)release();}
    function dispose(){
      if(closed)return;
      closed=true;release();
      panel.removeEventListener('pointerdown',onPointerDown);
      panel.removeEventListener('lostpointercapture',onPointerUp);
      panel.removeEventListener('click',onClick);
      doc.removeEventListener('pointerup',onPointerUp,true);
      doc.removeEventListener('pointercancel',onPointerUp,true);
      doc.removeEventListener('visibilitychange',onVisibility);
      doc.defaultView?.removeEventListener('blur',releaseBlur);
      if(bindings.get(panel)?.dispose===dispose)bindings.delete(panel);
    }
    function releaseBlur(){release();}
    panel.addEventListener('pointerdown',onPointerDown);
    panel.addEventListener('lostpointercapture',onPointerUp);
    panel.addEventListener('click',onClick);
    doc.addEventListener('pointerup',onPointerUp,true);
    doc.addEventListener('pointercancel',onPointerUp,true);
    doc.addEventListener('visibilitychange',onVisibility);
    doc.defaultView?.addEventListener('blur',releaseBlur);
    bindings.set(panel,{release,dispose});
    return dispose;
  }

  const css = [
    '.practiceGame{margin:5px 0 16px;padding:13px;border:1px solid var(--line,#598268);background:#122a30;color:#e8e2cc}',
    '.practiceGame [hidden]{display:none!important}',
    '.practiceHead,.practiceLabel{display:flex;justify-content:space-between;align-items:center;gap:10px}',
    '.practiceHead{margin-bottom:4px}.practiceHead strong{font-size:17px;color:#eac386}.practiceTime{font-variant-numeric:tabular-nums;font-size:12px;color:#d4d8c6}',
    '.practiceGame .practiceInstructions{margin:5px 0 9px;color:#dce3d2}.practiceGame .practiceFeedback{min-height:20px;margin:7px 0 0;font-size:13px;color:#e8cca3}',
    '.practiceProgressLine{height:4px;background:#102023;overflow:hidden}.practiceProgressLine i{display:block;height:100%;background:#c8b785}',
    '.practiceMeters{display:flex;flex-direction:column;gap:9px;margin:11px 0 12px}.practiceMeters:empty{display:none}',
    '.practiceLabel{color:#c9d7cd;font-size:12px;margin-bottom:3px}.practiceLabel span:last-child{color:#efcf8e;font-variant-numeric:tabular-nums}',
    '.practiceTrack{height:16px;position:relative;overflow:hidden;border:1px solid #668075;background:#0d2026}',
    '.practiceBand,.practiceFill,.practiceCursor{position:absolute;top:0;bottom:0}.practiceBand{background:#d7c07b40;border:1px solid #dcc581}.practiceFill{left:0;background:#b98b4a77}.practiceCursor{width:2px;background:#ffdf9a}',
    '.practiceMeter[data-tone="blue"] .practiceBand{background:#75b6b64a;border-color:#7aaead}.practiceMeter[data-tone="blue"] .practiceFill{background:#5caeaf82}.practiceMeter[data-tone="blue"] .practiceCursor{background:#c9ffef}',
    '.practiceMeter[data-tone="red"] .practiceFill{background:#da726dad}.practiceMeter[data-tone="red"] .practiceCursor{background:#ffc1ad}',
    '.practiceActions{display:flex;flex-wrap:wrap;gap:7px}.practiceActions:empty{display:none}',
    '.practiceAction{min-height:40px;touch-action:none}.practiceAction[data-pressed]{outline:2px solid #e8c881;outline-offset:1px}.practiceHold{display:block;font-size:10px;color:inherit;opacity:.8}',
    '.practiceGame .practiceResult{padding:7px 8px;margin:9px 0 3px;border-left:3px solid #d57768;background:#3b2c2d;color:#fff1d3}',
    '.practiceGame .practiceResult.success{border-color:#92c399;background:#163d34}'
  ].join('\n');

  window.PracticePanel=Object.freeze({render,bind,update,css});
})();

