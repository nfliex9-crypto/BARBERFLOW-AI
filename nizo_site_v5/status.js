/* BARBER NIZO status is private: token stays URL fragment, never query or logs. */
(() => {
 "use strict";
 const $=id=>document.getElementById(id);
 const params=new URLSearchParams(location.hash.slice(1));
 const id=params.get("id")||"", token=params.get("token")||"";
 const serviceNames={haircut:"Herenknipbeurt",beard:"Baard bijwerken",combo:"Knippen + baard",styling:"Haarstyling"};
 const labels={
  pending:"IN BEHANDELING",
  confirmed:"BEVESTIGD",
  declined:"GEWEIGERD",
  cancelled:"GEANNULEERD",
  expired:"VERLOPEN"
 };
 let pending=false;
 async function refresh(){
  if(pending)return;
  if(!/^[0-9a-f-]{36}$/i.test(id)||token.length<24){
    $("status-message").textContent="Je privélink is niet volledig. Vraag de oorspronkelijke link op of bel de barbershop.";
    $("current-status").textContent="LINK ONBEKEND";$("current-status").className="status-state status-danger";
    return;
  }
  pending=true;$("status-refresh").disabled=true;
  $("status-message").textContent="We controleren je aanvraag bij BARBER NIZO…";
  try{
   const r=await fetch("/api/booking?action=status",{
    method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",
    body:JSON.stringify({id,token}),cache:"no-store"
   });
   const data=await r.json();
   if(!r.ok)throw Error("Status niet bereikbaar. Probeer later opnieuw of bel 0471 82 16 30.");
   $("current-status").textContent=labels[data.status]||"ONBEKEND";
   $("current-status").className="status-state "+(data.status==="confirmed"?"status-success":data.status==="declined"||data.status==="cancelled"||data.status==="expired"?"status-danger":"");
   $("status-date").textContent=data.date||"—";
   $("status-time").textContent=data.time||"—";
   $("status-service").textContent=serviceNames[data.service]||data.service||"—";
   const messages={
    pending:"Je aanvraag is opgeslagen maar wacht nog op goedkeuring door de kapper.",
    confirmed:"Je afspraak is bevestigd door de eigenaar.",
    declined:"Je aanvraag is niet goedgekeurd. Kies opnieuw een afspraak of bel.",
    cancelled:"Deze afspraak werd geannuleerd.",
    expired:"De aanvraag is verlopen zonder bevestiging. Kies een nieuw tijdstip."
   };
   $("status-message").textContent=messages[data.status]||"Status niet bekend.";
  }catch(e){
   $("status-message").textContent=e.message;
   $("current-status").textContent="NIET BEREIKBAAR";
  }finally{pending=false;$("status-refresh").disabled=false;}
 }
 $("status-refresh").addEventListener("click",refresh);
 $("status-copy").addEventListener("click",async()=>{
   try{
    await navigator.clipboard.writeText(location.href);
    $("status-copy").textContent="PRIVÉLINK GEKOPIEERD";
    setTimeout(()=>$("status-copy").textContent="KOPIEER PRIVÉLINK",1700);
   }catch{$("status-message").textContent="Kopiëren is niet gelukt. Kopieer de adresbalk handmatig.";}
 });
 refresh();
})();
