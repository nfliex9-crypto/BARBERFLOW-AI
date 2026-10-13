/* BARBER NIZO — real appointment request journey, no fake availability.
   The server (Neon + exclusion constraint) is authoritative for slots.
   flatpickr is an optional enhancement; native date input is the fallback. */
(() => {
 "use strict";
 const $=id=>document.getElementById(id),form=$("appointment-form");
 const fallbackServices=[
  {id:"haircut",name:"Herenknipbeurt",minutes:30,price_cents:2500},
  {id:"beard",name:"Baard bijwerken",minutes:30,price_cents:1500},
  {id:"combo",name:"Knippen + baard",minutes:45,price_cents:3500},
  {id:"styling",name:"Haarstyling",minutes:30,price_cents:2000}
 ];
 const words={
  nl:{connecting:"Beschikbaarheid controleren…",available:"Selecteer een tijdstip dat nog vrij is.",offline:"Online boeken is tijdelijk niet beschikbaar. Bel 0471 82 16 30.",noSlots:"Geen vrije tijdstippen voor deze dag. Probeer een andere datum.",closed:"Zondag gesloten — kies een andere dag.",required:"Vul je gegevens in en kies een beschikbare datum en tijd.",sending:"Aanvraag veilig opslaan…",confirmed:"Aanvraag opgeslagen. Dit is nog GEEN bevestigde afspraak. De barbershop moet de aanvraag goedkeuren.",failed:"Kan de aanvraag niet opslaan. Probeer opnieuw of bel de zaak.",bookAgain:"Een andere aanvraag",selectService:"Kies een behandeling",slotTaken:"Dit tijdstip is net bezet. Kies een nieuwe tijd.",hold:"In afwachting van bevestiging",requestId:"REFERENTIE",service:"BEHANDELING",date:"DATUM",time:"TIJD",day:["zo","ma","di","wo","do","vr","za"]},
  en:{connecting:"Checking real-time availability…",available:"Choose a free appointment time.",offline:"Online booking is temporarily unavailable. Call 0471 82 16 30.",noSlots:"No times available. Choose a different day.",closed:"Closed Sundays — choose another date.",required:"Enter your details and pick an available date and time.",sending:"Saving your request securely…",confirmed:"Request saved. This is NOT a confirmed appointment. The salon must approve it.",failed:"Could not save the request. Please retry or call.",bookAgain:"Another request",selectService:"Choose a treatment",slotTaken:"That time was just requested. Choose another.",hold:"Awaiting confirmation",requestId:"REFERENCE",service:"TREATMENT",date:"DATE",time:"TIME",day:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]},
  fr:{connecting:"Vérification des disponibilités…",available:"Choisissez un créneau disponible.",offline:"Réservation en ligne momentanément indisponible. Appelez le 0471 82 16 30.",noSlots:"Aucun créneau disponible. Choisissez une autre date.",closed:"Fermé le dimanche — choisissez une autre date.",required:"Remplissez vos coordonnées et choisissez une date et une heure.",sending:"Enregistrement sécurisé de votre demande…",confirmed:"Demande enregistrée. Ce rendez-vous n'est PAS confirmé. Le salon doit l'approuver.",failed:"Impossible d'enregistrer. Réessayez ou appelez.",bookAgain:"Nouvelle demande",selectService:"Choisir une prestation",slotTaken:"Ce créneau vient d'être pris. Choisissez-en un autre.",hold:"En attente de confirmation",requestId:"RÉFÉRENCE",service:"PRESTATION",date:"DATE",time:"HEURE",day:["dim","lun","mar","mer","jeu","ven","sam"]}
 };
 const state={services:fallbackServices,service:"haircut",date:"",time:"",live:false,loading:false,requestSeq:0,dayLimit:60};
 const lang=()=>words[$("language")?.value]||words.nl;
 function say(message,kind="info"){const el=$("booking-feedback");el.textContent=message;el.dataset.state=kind;}
 function euro(n){return n>0?"€"+(n/100).toFixed(2).replace(".00",""):"—";}
 function addDays(day,amount){const d=new Date(day+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10);}
 function belgiumToday(){
   const p=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Brussels",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).filter(t=>t.type!=="literal").map(x=>[x.type,x.value]));
   return p.year+"-"+p.month+"-"+p.day;
 }
 const isSunday=day=>new Date(day+"T12:00:00Z").getUTCDay()===0;
 function syncPublicPrices(){
   const byId=new Map(state.services.map(service=>[service.id,service]));
   document.querySelectorAll('.service-card[data-service]').forEach(card=>{
     const s=byId.get(card.dataset.service);
     card.hidden=!s||s.active===false;
     if(!s||s.active===false)return;
     const name=card.querySelector('.service-body h3');
     const duration=card.querySelector('.service-body p');
     const tag=card.querySelector('.service-body strong');
     if(name)name.textContent=s.name;
     if(duration)duration.textContent=s.minutes+' MIN';
     if(tag){
       tag.replaceChildren();
       tag.append(document.createTextNode(euro(s.price_cents)+' '));
       if(!s.price_confirmed)tag.append(document.createElement('small')).textContent='*';
     }
   });
   const allOfficial=state.live&&state.services.length>0&&state.services.every(s=>s.price_confirmed);
   document.querySelectorAll('.price-note').forEach(note=>note.hidden=!!allOfficial);
 }

 function updateSummary(){
   const s=state.services.find(x=>x.id===state.service);
   $("summary-service").textContent=s?s.name:"—";
   $("summary-date").textContent=state.date||"—";
   $("summary-time").textContent=state.time||"—";
   $("booking-submit").disabled=!(state.live&&state.service&&state.date&&state.time)||state.loading;
 }
 function renderServices(){
   const holder=$("booking-services");holder.replaceChildren();
   state.services.filter(s=>s.active!==false).forEach(s=>{
     const button=document.createElement("button");button.type="button";button.className="booking-service";
     button.setAttribute("role","radio");button.setAttribute("aria-checked",String(s.id===state.service));
     button.dataset.service=s.id;
     const text=document.createElement("span");text.className="booking-service-name";text.textContent=s.name;
     const meta=document.createElement("small");meta.textContent=s.minutes+" MIN / "+euro(s.price_cents)+(s.price_confirmed?"":" *");
     button.append(text,meta);
     button.addEventListener("click",()=>{
       if(state.service===s.id)return;state.service=s.id;state.time="";
       renderServices();updateSummary();loadSlots();
     });holder.append(button);
   });
 }
 function renderDates(){
   const today=belgiumToday(),strip=$("date-strip");strip.replaceChildren();
   for(let offset=0;offset<14;offset++){
      const day=addDays(today,offset),d=new Date(day+"T12:00:00Z"),button=document.createElement("button");
      button.type="button";button.className="day-chip";button.disabled=isSunday(day);
      button.classList.toggle("selected",day===state.date);
      button.setAttribute("aria-pressed",String(day===state.date));
      const name=document.createElement("small");name.textContent=lang().day[d.getUTCDay()];
      const num=document.createElement("strong");num.textContent=day.slice(8);
      button.append(name,num);button.addEventListener("click",()=>changeDate(day));strip.append(button);
   }
 }
 function changeDate(day){
   if(!day||isSunday(day)){say(lang().closed,"error");return;}
   state.date=day;state.time="";$("booking-date").value=day;
   renderDates();updateSummary();loadSlots();
 }
 async function loadSlots(){
   const turn=++state.requestSeq,slots=$("booking-times");slots.replaceChildren();
   updateSummary();
   if(!state.date||!state.service||!state.live){say(lang().offline,"error");return;}
   say(lang().connecting,"loading");
   const busy=document.createElement("span");busy.className="booking-helper";busy.textContent=lang().connecting;slots.append(busy);
   try{
     const response=await fetch("/api/booking?action=slots&service="+encodeURIComponent(state.service)+"&date="+encodeURIComponent(state.date),{cache:"no-store"});
     const data=await response.json();
     if(turn!==state.requestSeq)return;
     if(!response.ok)throw Error(data.error||lang().offline);
     slots.replaceChildren();
     if(!data.slots?.length){say(lang().noSlots,"warning");slots.textContent=lang().noSlots;return;}
     say(lang().available,"success");
     for(const item of data.slots){
       const button=document.createElement("button");button.type="button";
       button.className="booking-time";button.textContent=item.time;
       button.setAttribute("aria-pressed","false");
       button.addEventListener("click",()=>{
         state.time=item.time;slots.querySelectorAll(".booking-time").forEach(btn=>btn.setAttribute("aria-pressed",String(btn===button)));
         updateSummary();say(lang().available,"success");
       });
       slots.append(button);
     }
   }catch(err){
     if(turn!==state.requestSeq)return;
     slots.replaceChildren();say(lang().offline,"error");
   }
 }
 async function submit(e){
   e.preventDefault();
   if(!state.live||!form.reportValidity()||!state.time||!state.date){say(lang().required,"error");return;}
   if(state.loading)return;state.loading=true;updateSummary();say(lang().sending,"loading");
   const body={
     service:state.service,date:state.date,time:state.time,
     name:form.elements.name.value.trim(),email:form.elements.email.value.trim(),
     phone:form.elements.phone.value.trim(),consent:form.elements.consent.checked,
     website:form.elements.website.value
   };
   try{
     const response=await fetch("/api/booking?action=request",{
        method:"POST",credentials:"same-origin",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(body)
     });
     const data=await response.json();
     if(!response.ok){
       if(response.status===409){state.time="";loadSlots();throw Error(lang().slotTaken);}
       throw Error(data.error||lang().failed);
     }
     if(data.status!=="pending"||!data.id)throw Error(lang().failed);
     $("appointment-form").hidden=true;
     const block=$("booking-confirmation");block.hidden=false;
     $("confirmed-message").textContent=lang().confirmed;
     $("confirmed-reference").textContent=lang().requestId+": "+data.id.slice(0,13).toUpperCase()+" · "+state.date+" "+state.time;
     const statusLink=$("booking-status-link");
     if(statusLink&&typeof data.token==="string"&&data.token.length>=24){
       const fragment=new URLSearchParams({id:data.id,token:data.token});
       statusLink.href="status.html#"+fragment.toString();
       statusLink.hidden=false;
     }
     say(lang().hold,"success");block.focus();
   }catch(err){say(err.message||lang().failed,"error");}
   finally{state.loading=false;updateSummary();}
 }
 async function initialize(){
   form.addEventListener("submit",submit);
   $("booking-reset").addEventListener("click",()=>{
     $("booking-confirmation").hidden=true;form.hidden=false;form.reset();state.time="";
     updateSummary();loadSlots();
   });
   $("language").addEventListener("change",()=>{renderDates();renderServices();if(state.live)loadSlots();});
   const date=$("booking-date"),today=belgiumToday();date.min=today;date.max=addDays(today,60);
   const chosen=isSunday(today)?addDays(today,1):today;state.date=chosen;date.value=chosen;
   date.addEventListener("change",()=>changeDate(date.value));
   // Optional enhancement: the underlying native date input always remains functional.
   if(window.flatpickr){
     try{window.flatpickr(date,{dateFormat:"Y-m-d",minDate:today,maxDate:date.max,
       disable:[d=>d.getDay()===0],defaultDate:chosen,
       onChange:dates=>{if(dates[0]){const y=dates[0].getFullYear(),m=String(dates[0].getMonth()+1).padStart(2,"0"),d=String(dates[0].getDate()).padStart(2,"0");changeDate(y+"-"+m+"-"+d);}}
     });}catch{}
   }
   renderServices();renderDates();updateSummary();
   try{
     const res=await fetch("/api/booking?action=config",{cache:"no-store"});
     if(!res.ok)throw Error("no backend");const c=await res.json();
     if(!c.active||!Array.isArray(c.services)||!c.services.length)throw Error("inactive");
     state.services=c.services;state.live=true;state.dayLimit=c.advance_days||60;
     if(!state.services.some(x=>x.id===state.service))state.service=state.services[0].id;
     syncPublicPrices();renderServices();await loadSlots();
   }catch{state.live=false;$("booking-times").textContent=lang().offline;say(lang().offline,"error");}
 }
 initialize();
})();
