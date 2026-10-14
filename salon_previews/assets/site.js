/* BARBERFLOW salon proposal interactions.  No booking API, no data collection.
   Time chips demonstrate UX ONLY and are not real-time availability.
*/
(()=>{
  "use strict";
  const $=id=>document.getElementById(id), config=window.SALON_PROPOSAL;
  if(!config)return;
  const reduce=window.matchMedia("(prefers-reduced-motion:reduce)");
  const menu=$("nav-toggle"),mobile=$("mobile-nav");
  menu?.addEventListener("click",()=>{
    const expanded=menu.getAttribute("aria-expanded")==="true";
    menu.setAttribute("aria-expanded",String(!expanded));
    mobile.classList.toggle("open",!expanded);
  });
  mobile?.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>{
    mobile.classList.remove("open");menu.setAttribute("aria-expanded","false");
  }));
  const services=$("demo-services"),date=$("demo-date"),times=$("demo-times"),result=$("demo-summary");
  const state={service:0,date:"",time:""};
  const fullDate=new Intl.DateTimeFormat("nl-BE",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"});
  function euros(x){return x==null?"Prijs op aanvraag":"€"+Number(x).toFixed(0);}
  function displayDate(day){return day?fullDate.format(new Date(day+"T12:00:00Z")):"nog geen datum";}
  function validISO(day){if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;const d=new Date(day+"T12:00:00Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===day;}
  function todayBrussels(){
    const parts=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Brussels",day:"2-digit",month:"2-digit",year:"numeric"}).formatToParts(new Date()).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
    return parts.year+"-"+parts.month+"-"+parts.day;
  }
  function addDays(iso,days){
    const d=new Date(iso+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);
  }
  const min=todayBrussels();date.min=min;date.max=addDays(min,30);
  let start=min;
  for(let offset=0;offset<7;offset++){
    const day=addDays(min,offset),dayOfWeek=new Date(day+"T12:00:00Z").getUTCDay();
    if(!(config.closedDays||[]).includes(dayOfWeek)){start=day;break;}
  }
  date.value=start;state.date=start;
  function summary(){
    const service=config.services[state.service];
    const values=[service.name,displayDate(state.date),state.time||"tijdstip niet geselecteerd"];
    result.replaceChildren();
    values.forEach((value,i)=>{
      if(i)result.append(document.createTextNode(" · "));
      const b=document.createElement("b");b.textContent=value;result.append(b);
    });
  }
  function renderServices(){
    services.replaceChildren();
    config.services.forEach((svc,index)=>{
      const item=document.createElement("button");item.type="button";
      item.className="choice";item.textContent=svc.name;
      item.setAttribute("aria-pressed",String(index===state.service));
      if(index===state.service)item.classList.add("active");
      item.addEventListener("click",()=>{state.service=index;renderServices();summary();});
      services.append(item);
    });
  }
  function renderTimes(){
    times.replaceChildren();
    for(const time of ["09:30","11:00","13:30","15:00"]){
      const button=document.createElement("button");button.type="button";button.className="choice";
      button.textContent=time;button.setAttribute("aria-pressed",String(state.time===time));
      if(state.time===time)button.classList.add("active");
      button.addEventListener("click",()=>{state.time=time;renderTimes();summary();});
      times.append(button);
    }
  }
  date.addEventListener("change",()=>{
    if(!validISO(date.value)||date.value<date.min||date.value>date.max){
      date.setCustomValidity("Kies een geldige datum binnen de volgende 30 dagen.");date.reportValidity();return;
    }
    const weekday=new Date(date.value+"T12:00:00Z").getUTCDay();
    if((config.closedDays||[]).includes(weekday)){
      date.setCustomValidity("Deze dag is volgens de beschikbare informatie gesloten.");date.reportValidity();return;
    }
    date.setCustomValidity("");state.date=date.value;state.time="";renderTimes();summary();
  });
  renderServices();renderTimes();summary();
  const bookButton=$("demo-call");
  if(bookButton&&config.phone)bookButton.href="tel:"+config.phone.replace(/[^+0-9]/g,"");
  document.querySelectorAll("[data-pick]").forEach(button=>button.addEventListener("click",()=>{
    const index=Number(button.dataset.pick);
    if(!Number.isInteger(index)||index<0||index>=config.services.length)return;
    state.service=index;renderServices();summary();
    document.getElementById("booking")?.scrollIntoView({behavior:reduce.matches?"auto":"smooth"});
  }));
  const reveal=document.querySelectorAll(".reveal");
  if("IntersectionObserver" in window&&!reduce.matches){
    const observer=new IntersectionObserver(entries=>entries.forEach(e=>{
      if(e.isIntersecting){e.target.classList.add("visible");observer.unobserve(e.target);}
    }),{threshold:.12});
    reveal.forEach(x=>observer.observe(x));
  }else reveal.forEach(x=>x.classList.add("visible"));
  // Move glow subtly around hero on pointer-fine desktop.
  if(window.matchMedia("(pointer:fine)").matches&&!reduce.matches){
    const hero=document.querySelector(".hero-media");
    hero?.addEventListener("pointermove",e=>{
      const box=hero.getBoundingClientRect();
      hero.style.setProperty("--pointer-x",((e.clientX-box.left)/box.width*100).toFixed(1)+"%");
      hero.style.setProperty("--pointer-y",((e.clientY-box.top)/box.height*100).toFixed(1)+"%");
    },{passive:true});
  }
})();
