/* BARBER NIZO scissor-cut interaction: local JS, no trackers. */
(function(){
'use strict';
if(window.__nizoScissorsInstalled)return;
window.__nizoScissorsInstalled=true;
var reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
var running=false;
var icon='<svg width="134" height="134" viewBox="0 0 134 134" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs><filter id="nizo-glow"><feGaussianBlur stdDeviation="2.5" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g stroke="#e5f94d" stroke-width="5.5" stroke-linecap="round" fill="none" filter="url(#nizo-glow)"><path class="scissor-blade-a" d="M65 69 L109 27 Q118 21 123 14" transform-origin="65px 69px"/><path class="scissor-blade-b" d="M65 69 L120 103" transform-origin="65px 69px"/><circle cx="39" cy="95" r="16"/><circle cx="86" cy="107" r="16"/><path d="M50 83L65 69L82 93M69 73L96 48"/><circle cx="65" cy="69" r="4" fill="#d874fe" stroke="#d874fe"/></g></svg>';
function goToBooking(){
 var target=document.getElementById('booking');if(!target)return;
 target.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
 history.replaceState(null,'','#booking');
 var heading=target.querySelector('h2,h3')||target;
 if(!heading.hasAttribute('tabindex'))heading.tabIndex=-1;
 heading.focus({preventScroll:true});
}
function playCut(){
 if(running)return;
 if(reduced.matches || !('animate' in Element.prototype)){goToBooking();return;}
 running=true;
 var overlay=document.createElement('div');overlay.className='nizo-cut-stage';overlay.setAttribute('aria-hidden','true');
 overlay.innerHTML='<div class="nizo-cut-flash"></div><div class="nizo-cut-rail"></div><div class="nizo-scissors">'+icon+'</div><canvas class="nizo-hair-canvas"></canvas>';
 document.body.append(overlay);
 var canvas=overlay.querySelector('canvas'),ctx=canvas.getContext('2d');
 var vw=window.innerWidth,vh=window.innerHeight,dpr=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.ceil(vw*dpr);canvas.height=Math.ceil(vh*dpr);ctx.scale(dpr,dpr);
 var centerY=vh*.53,start=performance.now(),duration=1080,raf=0;
 var count=Math.min(28,Math.max(12,Math.floor(vw/30)));
 var strands=Array.from({length:count},function(_,i){return {at:(i+.45)/count,angle:Math.sin(i*3.9)*.9-.25,len:2.5+(i*7%10),speed:35+(i*11%55),sway:Math.sin(i*1.9),color:i%4===0?'#d36dff':i%3===0?'#efff53':'#b7a5bd'};});
 var line=overlay.querySelector('.nizo-cut-rail'),scissors=overlay.querySelector('.nizo-scissors'),flash=overlay.querySelector('.nizo-cut-flash');
 var bladeA=overlay.querySelector('.scissor-blade-a'),bladeB=overlay.querySelector('.scissor-blade-b'),scrolled=false;
 function tick(t){
   var k=Math.min(1,(t-start)/duration),travel=Math.min(1,k/.78);
   var eased=travel<.5?2*travel*travel:1-Math.pow(-2*travel+2,2)/2;
   var x=-110+(vw+200)*eased;
   scissors.style.transform='translate3d('+x+'px,'+(centerY-72)+'px,0) rotate('+(-14+7*Math.sin(k*19))+'deg)';
   scissors.style.opacity=k>.93?String(Math.max(0,(1-k)*13)):'1';
   bladeA.style.transform='rotate('+(12+16*Math.sin(k*38))+'deg)';
   bladeB.style.transform='rotate('+(-12-16*Math.sin(k*38))+'deg)';
   line.style.transform='translate3d(0,'+centerY+'px,0) scaleX('+eased+')';
   flash.style.opacity=k>.65&&k<.93?String(Math.max(0,.22*(1-Math.abs(k-.79)/.14))):'0';
   ctx.clearRect(0,0,vw,vh);
   strands.forEach(function(g,i){
     var a=(eased-g.at)*4.8;if(a<0||a>1)return;
     var px=g.at*vw+Math.sin(g.sway+a*6)*23;
     var py=centerY+(a*g.speed*g.angle)+(a*a*94*(i%2?1:-1));
     ctx.save();ctx.globalAlpha=(1-a)*.95;ctx.strokeStyle=g.color;ctx.lineWidth=1.1;
     ctx.translate(px,py);ctx.rotate(g.angle+a*2);
     ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(g.len/2,-4,g.len,0);ctx.stroke();ctx.restore();
   });
   if(k>.53&&!scrolled){scrolled=true;goToBooking();}
   if(k<1){raf=requestAnimationFrame(tick);}else{cancelAnimationFrame(raf);overlay.remove();running=false;}
 }
 raf=requestAnimationFrame(tick);
 window.addEventListener('pagehide',function(){cancelAnimationFrame(raf);overlay.remove();running=false;},{once:true});
}
document.addEventListener('click',function(event){
 var link=event.target.closest('a[href="#booking"]');
 if(!link || event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;
 event.preventDefault();playCut();
});
})();
