/* Premium, progressive animation layer.
   motion@14.1.0 (MIT) loaded only for fine-pointer/reduced-motion-safe devices.
   CSS-only fallbacks work if CDN is unavailable. */
(() => {
 const reduce=matchMedia("(prefers-reduced-motion: reduce)");
 if(reduce.matches)return;
 const fine=matchMedia("(pointer:fine)");
 if(fine.matches){
   // Use smooth scrolling ONLY on desktop; native scrolling is safest for mobile booking.
   const script=document.createElement("script");
   script.src="https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js";
   script.defer=true;script.onload=()=>{
     try{
       const instance=new window.Lenis({autoRaf:true,anchors:true,smoothWheel:true,duration:1.1});
       window.nizoLenis=instance;
       document.addEventListener("click",e=>{if(e.target.closest('a[href="#booking"]'))instance.stop();},{capture:true});
       document.getElementById("booking")?.addEventListener("focusin",()=>instance.start(),{once:true});
     }catch{ /* fallback native scroll */ }
   };
   document.head.append(script);
 }
 const pointerGlow=document.createElement("span");
 pointerGlow.className="nizo-pointer-aura";pointerGlow.setAttribute("aria-hidden","true");
 document.body.append(pointerGlow);
 let next=false,lastX=0,lastY=0;
 window.addEventListener("pointermove",e=>{
   if(e.pointerType!=="mouse")return;
   lastX=e.clientX;lastY=e.clientY;
   if(next)return;next=true;
   requestAnimationFrame(()=>{next=false;pointerGlow.style.transform="translate3d("+lastX+"px,"+lastY+"px,0)";});
 },{passive:true});
 window.addEventListener("pointerdown",()=>pointerGlow.classList.add("active"));
 window.addEventListener("pointerup",()=>pointerGlow.classList.remove("active"));
})();
const perform=async()=>{
 if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 try{
   const {animate,inView} = await import("https://cdn.jsdelivr.net/npm/motion@14.1.0/+esm");
   const title=document.querySelector(".hero h1");
   if(title)animate(title,{opacity:[0,1],y:[32,0],filter:["blur(8px)","blur(0px)"]},{duration:1.05,ease:[.18,.67,.33,1]});
   document.querySelectorAll(".service-card").forEach((el,index)=>{
     inView(el,()=>{animate(el,{opacity:[.55,1],scale:[.97,1]},{duration:.65,delay:Math.min(index*.1,.35)});},{margin:"0px 0px -10% 0px",amount:.1});
   });
   document.querySelectorAll(".gallery-track figure").forEach(el=>{
     inView(el,()=>animate(el,{opacity:[.7,1],scale:[.985,1]},{duration:.7}),{amount:.1});
   });
   document.querySelectorAll(".booking-panel").forEach(el=>{
     inView(el,()=>animate(el,{opacity:[.65,1],y:[22,0]},{duration:.8}),{amount:.12});
   });
 }catch{
   /* The site remains fully usable when third-party animation modules fail. */
 }
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",perform,{once:true});
else perform();
