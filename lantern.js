/* Optional evening discovery at the fork in the glasswood. */
window.Lantern = (() => {
  "use strict";
  const point = Object.freeze({x:1040, y:340});
  const range = 25;
  const petals = [
    "......o......",
    ".....oko.....",
    ".....kdk.....",
    "..o..dgd..o..",
    "..ko.dgd.ok..",
    "..drkgggkrd..",
    "...drglgrd...",
    "...dglwlgd...",
    "..krglwlgrk..",
    "..krglllgrk..",
    "...drgllrd...",
    "....cgggc....",
    ".....kck.....",
    "......g......",
    "......c......",
    ".....gcg.....",
    ".....r.r....."
  ];
  const palette = {o:"#39324a",k:"#604057",d:"#994a63",r:"#df707a",g:"#ffbf76",l:"#ffe5a0",w:"#fffad2",c:"#c88f52"};
  function available(s) {
    if (!s || s.lanternFound || !Number.isFinite(s.time)) return false;
    const minute = s.calendar ? Calendar.minuteAt(s.calendar,s.time) : Math.floor(480+s.time*3)%1440;
    return minute >= 20*60 && minute < 22*60;
  }
  function focus(s) {
    if (!available(s) || !s.player || Math.hypot(s.player.x-point.x,s.player.y-point.y)>range) return null;
    return {kind:"lantern",point,range,text:"Ascolta il Lume senza nome"};
  }
  function actor(s,t) {
    if (!available(s)) return null;
    return {x:point.x,y:point.y,draw(c){
      c.save();
      const bob = Math.round(Math.sin(t*2.1)*2);
      c.translate(point.x,point.y);
      c.fillStyle="rgba(36,30,43,.32)";c.fillRect(-5,-1,10,2);
      c.fillStyle="rgba(255,176,111,.11)";c.fillRect(-9,-19+bob,18,10);c.fillRect(-6,-22+bob,12,16);
      for(let y=0;y<petals.length;y++)for(let x=0;x<petals[y].length;x++){
        const color=palette[petals[y][x]];
        if(color){c.fillStyle=color;c.fillRect(x-6,y-24+bob,1,1);}
      }
      for(let i=0;i<5;i++){
        const angle=t*.9+i*2.4;
        const sx=Math.round(Math.cos(angle)*(8+i)),sy=Math.round(-17+bob+Math.sin(angle*1.3)*7);
        c.fillStyle=i%2?"#fff3a9":"#df98af";c.fillRect(sx,sy,1,1);
      }
      c.restore();
    }};
  }
  function collect(s) {
    if (!focus(s)) return s?.lanternFound?"Hai già ascoltato il canto del lume.":"Il lume è fuori portata.";
    s.lanternFound=true;
    s.player.rep+=1;
    s.player.inventory.essence+=2;
    return "Il lume ricorda il tuo nome. +2 essenze · +1 reputazione.";
  }
  function hint(s) {
    if (s?.lanternFound) return "Hai ascoltato il Lume senza nome al crocevia del Bosco di Vetro.";
    return "Tra le 20 e le 22, al crocevia del Bosco di Vetro, sboccia un lume senza radici.";
  }
  return {available,focus,actor,collect,hint};
})();
