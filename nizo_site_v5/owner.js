/* BARBER NIZO v8 — real, authenticated salon command centre.
   All customer-supplied values are rendered with textContent, never innerHTML.
   No third-party analytics, no booking data stored in the browser.
*/
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const views = ["overview","appointments","services","closures","settings"];
  const state = {bookings:[],overview:null,settings:null,view:"overview",loading:false,truncated:false};
  const SERVICE_NAMES = {haircut:"Herenknipbeurt",beard:"Baard bijwerken",combo:"Knippen + baard",styling:"Haarstyling"};
  const STATUSES = {pending:"IN AANVRAAG",confirmed:"BEVESTIGD",declined:"GEWEIGERD",cancelled:"GEANNULEERD",expired:"VERLOPEN"};
  const text = (tag,value,className) => {
    const element=document.createElement(tag);
    element.textContent=String(value??"");
    if(className)element.className=className;
    return element;
  };
  function localToday(){
    const pieces=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Brussels",day:"2-digit",month:"2-digit",year:"numeric"}).formatToParts(new Date()).filter(part=>part.type!=="literal").map(part=>[part.type,part.value]));
    return pieces.year+"-"+pieces.month+"-"+pieces.day;
  }
  function addDays(day,offset){
    const date=new Date(day+"T12:00:00Z");date.setUTCDate(date.getUTCDate()+offset);
    return date.toISOString().slice(0,10);
  }
  const hhmm = value => String(Math.floor(Number(value)/60)).padStart(2,"0")+":"+String(Number(value)%60).padStart(2,"0");
  const money = cents => "€"+(Number(cents)/100).toFixed(2).replace(".",",");
  const escDay = value => typeof value==="string" ? value.slice(0,10) : "";
  const prettyDate = day => {
    if(!day)return "—";
    const value=new Date(day.slice(0,10)+"T12:00:00Z");
    return new Intl.DateTimeFormat("nl-BE",{weekday:"short",day:"2-digit",month:"short",timeZone:"UTC"}).format(value);
  };
  function notice(value,kind="info"){
    const el=$("owner-feedback");el.textContent=value;el.dataset.state=kind;
    const auth=$("owner-auth-feedback");if(auth&&!$("login-panel").hidden)auth.textContent=value;
  }
  async function call(action,method="GET",body=null,params={}){
    const query=new URLSearchParams({action,...params});
    const response=await fetch("/api/nizo-admin?"+query,{
      method,credentials:"same-origin",cache:"no-store",
      headers:body===null?{}:{"Content-Type":"application/json","X-Nizo-Action":"booking-update"},
      body:body===null?undefined:JSON.stringify(body)
    });
    let payload={};
    try{payload=await response.json();}catch{}
    if(!response.ok){
      const err=new Error(typeof payload.error==="string"?payload.error:"Network or server error");
      err.code=response.status;throw err;
    }
    return payload;
  }
  function showSignIn(){
    $("login-panel").hidden=false;$("dashboard-panel").hidden=true;
    $("owner-password").value="";
  }
  function showWorkspace(){
    $("login-panel").hidden=true;$("dashboard-panel").hidden=false;
  }
  function switchView(view){
    if(!views.includes(view))return;
    state.view=view;
    for(const name of views){
      $("view-"+name).hidden=name!==view;
    }
    document.querySelectorAll("[data-view]").forEach(el=>{
      const active=el.dataset.view===view;
      if(active)el.setAttribute("aria-current","page");else el.removeAttribute("aria-current");
    });
    $("current-view-label").textContent=({overview:"DASHBOARD",appointments:"AFSPRAKEN",services:"DIENSTEN & PRIJZEN",closures:"SLUITINGSDAGEN",settings:"SALON INFO"})[view];
    $("owner-sidebar").classList.remove("is-open");
    $("owner-mobile-menu").setAttribute("aria-expanded","false");
    if(view==="appointments")refreshBookings();
    if(view==="services"||view==="closures")refreshSettings();
    window.scrollTo({top:0,behavior:"auto"});
  }
  function renderOverview(){
    const data=state.overview;if(!data)return;
    const metrics=data.metrics||{};
    for(const key of ["pending","confirmed","today","total"])
      $("metric-"+key).textContent=Number(metrics[key]||0).toLocaleString("nl-BE");
    $("priority-pending").textContent=Number(metrics.pending||0).toLocaleString("nl-BE");
    $("nav-pending").textContent=Number(metrics.pending||0)>0?String(metrics.pending):"";
    const dayMap=new Map((data.days||[]).map(x=>[x.day,x]));
    const holder=$("owner-days");holder.replaceChildren();
    for(let i=0;i<14;i++){
      const day=addDays(data.today,i);
      const record=dayMap.get(day)||{};
      const p=Number(record.pending||0),c=Number(record.confirmed||0),height=Math.max(6,Math.min(100,(p+c)*18));
      const group=text("div","","owner-day");
      group.title=prettyDate(day)+": "+p+" aanvragen, "+c+" bevestigd";
      const shell=text("div","","owner-day-track");
      const stack=text("div","","owner-day-stacks");
      stack.style.height=height+"%";
      const a=text("span","","waiting"),b=text("span","","confirmed");
      a.style.flex=String(p||0);b.style.flex=String(c||0);
      stack.append(a,b);shell.append(stack);
      group.append(shell,text("small",day.slice(8)));
      holder.append(group);
    }
    renderLatest();
  }
  function renderLatest(){
    const holder=$("owner-latest-list");holder.replaceChildren();
    const rows=state.bookings.filter(x=>x.status==="pending"||x.status==="confirmed")
      .sort((a,b)=>(a.day+" "+hhmm(a.start_min)).localeCompare(b.day+" "+hhmm(b.start_min)))
      .filter(x=>x.day>=localToday()).slice(0,6);
    if(!rows.length){holder.append(text("p","Geen aankomende aanvragen gevonden.","owner-empty"));return;}
    for(const item of rows){
      const row=text("div","","owner-latest-row");
      const date=text("div",prettyDate(item.day),"owner-latest-date");
      const desc=text("div","","owner-latest-name");
      desc.append(text("strong",item.customer_name),text("small",(SERVICE_NAMES[item.service_key]||item.service_key)+" · "+hhmm(item.start_min)));
      row.append(date,desc,text("span",STATUSES[item.status]||item.status,"owner-status is-"+item.status));
      holder.append(row);
    }
  }
  function bookingCard(booking){
    const item=text("article","","owner-booking-card");
    const date=text("div","","owner-booking-when");
    date.append(text("strong",prettyDate(escDay(booking.day))),text("span",hhmm(booking.start_min)+" — "+hhmm(booking.end_min)));
    const customer=text("div","","owner-booking-customer");
    customer.append(text("strong",booking.customer_name));
    const emailLink=text("a",booking.customer_email);emailLink.href="mailto:"+encodeURIComponent(booking.customer_email).replace(/%40/g,"@");
    customer.append(emailLink);
    if(booking.customer_phone){
      const tel=text("a",booking.customer_phone);
      tel.href="tel:"+booking.customer_phone.replace(/[^+0-9]/g,"");
      customer.append(tel);
    }
    const service=text("div","","owner-booking-service");
    service.append(text("strong",SERVICE_NAMES[booking.service_key]||booking.service_key),text("span",STATUSES[booking.status]||booking.status,"owner-status is-"+booking.status));
    const actions=text("div","","owner-booking-actions");
    const makeButton=(label,next,variant)=>{
      const button=text("button",label,variant);
      button.type="button";
      button.addEventListener("click",()=>changeStatus(booking,next));
      actions.append(button);
    };
    if(booking.status==="pending"){
      makeButton("BEVESTIGEN","confirmed","owner-confirm-button");
      makeButton("WEIGEREN","declined","owner-deny-button");
    }else if(booking.status==="confirmed")makeButton("ANNULEREN","cancelled","owner-deny-button");
    else actions.append(text("small","Afgehandeld","owner-muted"));
    item.append(date,customer,service,actions);
    return item;
  }
  function renderBookings(){
    const holder=$("booking-entries");holder.replaceChildren();
    const status=$("owner-status").value,query=$("owner-query").value.trim().toLowerCase();
    const matching=state.bookings.filter(item=>{
      if(status!=="all"&&item.status!==status)return false;
      if(!query)return true;
      return [item.customer_name,item.customer_email,item.customer_phone,item.service_key,SERVICE_NAMES[item.service_key],item.day]
        .some(value=>String(value||"").toLowerCase().includes(query));
    });
    $("owner-results-count").textContent=matching.length+" AFSPRAKEN";
    $("owner-truncated-warning").hidden=!state.truncated;
    $("owner-updated-at").textContent=new Intl.DateTimeFormat("nl-BE",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Brussels"}).format(new Date());
    if(!matching.length){holder.append(text("p","Geen afspraken voor deze zoekopdracht.","owner-empty"));return;}
    for(const item of matching)holder.append(bookingCard(item));
  }
  async function changeStatus(item,to){
    if(!window.confirm("Afspraak "+prettyDate(item.day)+" "+hhmm(item.start_min)+" naar '"+STATUSES[to]+"' wijzigen?"))return;
    try{
      await call("update","POST",{id:item.id,status:to});
      notice("Afspraak aangepast: "+STATUSES[to],"success");
      await Promise.all([refreshBookings(),refreshOverview()]);
    }catch(err){notice("Kon afspraak niet aanpassen: "+err.message,"error");}
  }
  async function refreshOverview(){
    const result=await call("overview");state.overview=result;renderOverview();
  }
  async function refreshBookings(){
    const from=$("owner-from").value,to=$("owner-to").value;
    if(!from||!to||from>to){notice("Ongeldig datumbereik.","error");return;}
    try{
      const result=await call("list","GET",null,{from,to});
      state.bookings=result.bookings||[];state.truncated=!!result.truncated;
      renderBookings();renderLatest();
      if(result.truncated)notice("Er zijn meer dan 500 resultaten. Verklein het datumbereik.","warning");
    }catch(err){
      if(err.code===401){showSignIn();notice("Sessie verlopen. Meld je opnieuw aan.","error");return;}
      notice("Kon afspraken niet ophalen: "+err.message,"error");
    }
  }
  function renderServices(){
    const holder=$("owner-service-grid");holder.replaceChildren();
    const settings=state.settings;
    if(!settings)return;
    settings.services.forEach((svc,index)=>{
      const panel=text("form","","owner-service-card");
      const top=text("div","","owner-service-top");
      top.append(text("span",String(index+1).padStart(2,"0")+" / SERVICE","owner-overline"),text("span",svc.active?"ACTIEF":"INACTIEF","owner-status "+(svc.active?"is-confirmed":"is-cancelled")));
      panel.append(top);
      const field=(label,control)=>{
        const wrapper=text("label","","owner-form-label");wrapper.append(text("span",label));wrapper.append(control);return wrapper;
      };
      const name=document.createElement("input");
      name.name="name";name.required=true;name.maxLength=65;name.minLength=2;name.value=svc.name;
      const duration=document.createElement("select");
      for(let n=15;n<=180;n+=15){const opt=new Option(n+" MIN",String(n));duration.add(opt);}
      duration.value=String(svc.minutes);
      const price=document.createElement("input");price.type="number";price.step=".01";price.min="0";price.max="500";price.required=true;price.value=(svc.price_cents/100).toFixed(2);
      const row=text("div","","owner-service-fields");
      row.append(field("DUUR",duration),field("PRIJS (€)",price));
      const active=document.createElement("input");active.type="checkbox";active.checked=svc.active;
      const confirmed=document.createElement("input");confirmed.type="checkbox";confirmed.checked=svc.price_confirmed;
      const checks=text("div","","owner-service-checks");
      const ck=(input,label)=>{const wrap=text("label","","owner-checkbox");wrap.append(input,text("span",label));return wrap;};
      checks.append(ck(active,"ZICHTBAAR & BOEKBAAR"),ck(confirmed,"PRIJS DOOR EIGENAAR BEVESTIGD"));
      const save=text("button","WIJZIGINGEN OPSLAAN","owner-big-cta");save.type="submit";
      panel.append(field("NAAM VAN DE BEHANDELING",name),row,checks,save);
      panel.addEventListener("submit",async e=>{
        e.preventDefault();save.disabled=true;
        try{
          const euros=Number(price.value);
          if(!Number.isFinite(euros)||euros<0||euros>500)throw Error("Prijs moet tussen €0 en €500 liggen.");
          await call("service","POST",{id:svc.id,name:name.value,minutes:Number(duration.value),
            price_cents:Math.round(euros*100),active:active.checked,price_confirmed:confirmed.checked});
          notice("Dienst bijgewerkt. De website toont de nieuwe gegevens.","success");
          await refreshSettings();
        }catch(err){notice("Opslaan mislukt: "+err.message,"error");}
        finally{save.disabled=false;}
      });
      holder.append(panel);
    });
  }
  function renderClosures(){
    const holder=$("owner-closed-list");holder.replaceChildren();
    if(!state.settings?.closed?.length){holder.append(text("p","Geen geplande sluitingsdagen.","owner-empty"));return;}
    for(const closed of state.settings.closed){
      const row=text("div","","owner-closed-row");
      const info=text("div","","owner-closed-desc");
      info.append(text("strong",prettyDate(closed.day)),text("span",closed.reason||"Gesloten"));
      const remove=text("button","DATUM HEROPENEN","owner-ghost-btn");remove.type="button";
      remove.addEventListener("click",async()=>{
        if(!confirm("Sluitingsdag "+closed.day+" verwijderen?"))return;
        try{await call("open-day","POST",{day:closed.day});notice("Datum heropend.","success");await refreshSettings();}
        catch(err){notice("Heropenen mislukt: "+err.message,"error");}
      });
      row.append(info,remove);holder.append(row);
    }
  }
  async function refreshSettings(){
    try{state.settings=await call("settings");renderServices();renderClosures();}
    catch(err){if(err.code===401)showSignIn();notice("Saloninstellingen niet beschikbaar: "+err.message,"error");}
  }
  async function boot(){
    try{
      const range=localToday();
      $("owner-from").value=addDays(range,-30);
      $("owner-to").value=addDays(range,60);
      $("close-day-date").min=range;$("close-day-date").max=addDays(range,365);
      await Promise.all([refreshOverview(),refreshBookings(),refreshSettings()]);
      showWorkspace();switchView(state.view);notice("Verbonden met NIZO boekingsdatabase.","success");
    }catch(err){
      showSignIn();
      notice(err.code===401?"Log in met je privé beheerderswachtwoord.":"Verbinding met de database mislukt: "+err.message,err.code===401?"info":"error");
    }
  }
  $("login-form").addEventListener("submit",async e=>{
    e.preventDefault();const button=e.currentTarget.querySelector("button");button.disabled=true;
    try{await call("login","POST",{password:$("owner-password").value});await boot();}
    catch(err){notice("Inloggen mislukt: "+err.message,"error");}
    finally{button.disabled=false;}
  });
  $("owner-logout").addEventListener("click",async()=>{
    try{await call("logout","POST",{});}catch{}
    state.bookings=[];state.settings=null;state.overview=null;showSignIn();
    notice("Je bent uitgelogd.","info");
  });
  document.querySelectorAll("[data-view]").forEach(button=>button.addEventListener("click",()=>switchView(button.dataset.view)));
  document.querySelectorAll("[data-go]").forEach(button=>button.addEventListener("click",()=>switchView(button.dataset.go)));
  $("overview-refresh").addEventListener("click",async()=>{try{await Promise.all([refreshOverview(),refreshBookings()]);notice("Dashboard bijgewerkt.","success");}catch(err){notice(err.message,"error");}});
  $("reload-bookings").addEventListener("click",refreshBookings);
  $("owner-apply-filters").addEventListener("click",refreshBookings);
  $("owner-status").addEventListener("change",renderBookings);
  $("owner-query").addEventListener("input",renderBookings);
  $("owner-mobile-menu").addEventListener("click",()=>{
    const open=$("owner-sidebar").classList.toggle("is-open");
    $("owner-mobile-menu").setAttribute("aria-expanded",String(open));
  });
  $("close-day-form").addEventListener("submit",async e=>{
    e.preventDefault();const form=e.currentTarget;
    const day=$("close-day-date").value,reason=$("close-day-reason").value.trim();
    if(!form.reportValidity())return;
    const submit=form.querySelector('button[type="submit"]');submit.disabled=true;
    try{
      await call("close-day","POST",{day,reason});
      notice("Sluitingsdag toegevoegd.","success");form.reset();await refreshSettings();
    }catch(err){notice("Kan de dag niet sluiten: "+err.message,"error");}
    finally{submit.disabled=false;}
  });
  // The owner dashboard polls only while visible, with a short, bounded interval.
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!$("dashboard-panel").hidden)refreshOverview().catch(()=>{});});
  const clock=()=>{
    $("owner-clock").textContent=new Intl.DateTimeFormat("nl-BE",{timeZone:"Europe/Brussels",weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date());
  };
  clock();setInterval(clock,60000);
  boot();
})();