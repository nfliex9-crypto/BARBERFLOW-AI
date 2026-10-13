/* Private owner dashboard — all untrusted client data rendered with textContent. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
function message(s){$("owner-feedback").textContent=s;}
async function api(action,method="GET",body=null){
 const r=await fetch("/api/nizo-admin?action="+encodeURIComponent(action),{
  method,credentials:"same-origin",headers:body?{"Content-Type":"application/json","X-Nizo-Action":"booking-update"}:{},
  body:body?JSON.stringify(body):undefined,cache:"no-store"
 });
 let d={};try{d=await r.json();}catch{}
 if(!r.ok)throw Error(d.error||"Request failed");
 return d;
}
function tag(text,cls){
 const span=document.createElement("span");span.textContent=text;span.className=cls;return span;
}
function column(strong,items){
 const col=document.createElement("div");
 const name=document.createElement("strong");name.textContent=strong;col.append(name);
 for(const item of items){
   const child=document.createElement("small");child.textContent=item;col.append(child);
 }
 return col;
}
async function update(id,status){
 if(!confirm("Change booking to "+status+"?"))return;
 try{
   await api("update","POST",{id,status});
   message("Saved booking "+id.slice(0,8)+" → "+status);
   await refresh();
 }catch(e){message(e.message);}
}
function render(data){
 const entries=$("booking-entries");entries.replaceChildren();
 const rows=data.bookings||[],counts={pending:0,confirmed:0,declined:0,cancelled:0,expired:0};
 rows.forEach(b=>{counts[b.status]=(counts[b.status]||0)+1;});
 const counters=$("owner-metrics");counters.replaceChildren();
 for(const [status,num] of Object.entries(counts)){
   const chip=tag(status.toUpperCase()+" "+num,"");counters.append(chip);
 }
 if(!rows.length){entries.textContent="No booking requests yet.";return;}
 rows.forEach(b=>{
   const card=document.createElement("article");card.className="owner-item";
   const time=String(Math.floor(Number(b.start_min)/60)).padStart(2,"0")+":"+String(Number(b.start_min)%60).padStart(2,"0");
   const date=typeof b.day==="string"?b.day:String(b.day).slice(0,10);
   const when=column(date+" · "+time,[b.service_key,"STATUS: "+b.status.toUpperCase()]);
   const who=column(b.customer_name,[b.customer_email,b.customer_phone||"No phone"]);
   const actions=document.createElement("div");actions.className="owner-actions";
   actions.append(tag(b.status.toUpperCase(),"owner-pill"));
   if(b.status==="pending"){
     for(const status of ["confirmed","declined"]){
       const button=document.createElement("button");
       button.type="button";button.textContent=status==="confirmed"?"CONFIRM ✓":"DECLINE ×";
       button.className=status==="confirmed"?"accept":"decline";
       button.addEventListener("click",()=>update(b.id,status));actions.append(button);
     }
   }else if(b.status==="confirmed"){
     const cancel=document.createElement("button");cancel.type="button";cancel.textContent="CANCEL";
     cancel.addEventListener("click",()=>update(b.id,"cancelled"));actions.append(cancel);
   }
   card.append(when,who,actions);entries.append(card);
 });
}
async function refresh(){
 try{
   const data=await api("list");
   $("login-panel").hidden=true;$("dashboard-panel").hidden=false;
   render(data);message("Connected. Bookings are stored in Neon.");
 }catch(e){
   $("login-panel").hidden=false;$("dashboard-panel").hidden=true;
   message("Sign in to access owner bookings.");
 }
}
$("login-form").addEventListener("submit",async e=>{
 e.preventDefault();const pass=$("owner-password").value;
 try{await api("login","POST",{password:pass});$("owner-password").value="";await refresh();}
 catch(e){message(e.message);}
});
$("reload-bookings").addEventListener("click",refresh);
$("owner-logout").addEventListener("click",async()=>{try{await api("logout","POST",{});}catch{}$("login-panel").hidden=false;$("dashboard-panel").hidden=true;message("Signed out.");});
refresh();
})();
