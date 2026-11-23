/* Avvio del laboratorio attraverso lo stesso varco, senza chiavi della campagna. */
(() => {
  'use strict';
  const size=window.UrbanLabSize,heading=document.querySelector('#titleScreen h1');
  document.title='Reincarnation · Laboratorio urbano · '+size+' edifici';
  heading.textContent='Confluenza';
  document.querySelector('#titleScreen .story').textContent=
    size+' edifici nella città sperimentale. I salvataggi di questa build sono separati da quelli della campagna.';
  document.querySelector('#titleScreen .chapter span').textContent='LABORATORIO URBANO';
  document.querySelector('#titleScreen .chapter strong').textContent='Cinque famiglie in città';
  const enter=Game.newGame;
  Game.newGame=function(...args){
    const ok=enter.apply(this,args);
    if(ok)Game.action('interact');
    return ok;
  };
})();
