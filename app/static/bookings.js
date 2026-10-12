(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const notice=(t,err=false)=>{const e=$('notice');e.hidden=false;e.className=err?'notice error':'notice';e.textContent=t;};
  async function api(path,options={}){const r=await fetch(path,{credentials:'same-origin',...options});let j={};try{j=await r.json();}catch{}if(!r.ok)throw new Error(j.detail||'Request failed');return j;}
  const pill=s=>{const span=document.createElement('span');span.className='pill '+s;span.textContent=s;return span;};
  async function services(){
    const data=await api('/api/bookings/services');const list=$('services');list.replaceChildren();
    if(!data.services.length){const p=document.createElement('p');p.textContent='Create your first service to activate your public booking page.';list.append(p);}
    for(const s of data.services){const item=document.createElement('div');item.className='item';const d=document.createElement('div');const strong=document.createElement('strong');strong.textContent=s.name;const meta=document.createElement('small');meta.textContent=s.duration_minutes+' min · €'+(s.price_cents/100).toFixed(2);d.append(strong,meta);const button=document.createElement('button');button.className='secondary';button.textContent=s.active?'Disable':'Enable';button.addEventListener('click',async()=>{try{await api('/api/bookings/services/'+encodeURIComponent(s.id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({active:!s.active})});await services();}catch(e){notice(e.message,true);}});item.append(d,button);list.append(item);}
  }
  async function bookings(){
    const data=await api('/api/bookings');const list=$('bookings');list.replaceChildren();
    if(!data.bookings.length){const p=document.createElement('p');p.textContent='No requests yet. Share your link to start collecting appointments.';list.append(p);return;}
    for(const b of data.bookings){const item=document.createElement('div');item.className='booking';const title=document.createElement('strong');title.textContent=b.customer_name+' · '+b.service_name;const row=document.createElement('div');row.className='item';const time=document.createElement('span');time.textContent=new Date(b.starts_at).toLocaleString('nl-BE',{timeZone:'Europe/Brussels',dateStyle:'medium',timeStyle:'short'});row.append(time,pill(b.state));const email=document.createElement('small');email.textContent=b.customer_email+(b.customer_phone?' · '+b.customer_phone:'');item.append(title,row,email);if(b.state==='pending'){
      const actions=document.createElement('div');actions.className='actions';for(const s of ['confirmed','declined']){const button=document.createElement('button');button.className=s==='confirmed'?'primary':'secondary';button.textContent=s==='confirmed'?'Confirm':'Decline';button.addEventListener('click',async()=>{try{await api('/api/bookings/'+encodeURIComponent(b.id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:s})});notice(s==='confirmed'?'Marked confirmed. Contact the customer manually: no notification was sent.':'Request declined. Contact the customer manually.');await bookings();}catch(e){notice(e.message,true);}});actions.append(button);}item.append(actions);}
      else if(b.state==='confirmed'){const cancel=document.createElement('button');cancel.className='secondary';cancel.textContent='Cancel';cancel.addEventListener('click',async()=>{try{await api('/api/bookings/'+encodeURIComponent(b.id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:'cancelled'})});notice('Cancelled. Contact the customer to inform them.');await bookings();}catch(e){notice(e.message,true);}});item.append(cancel);}list.append(item);}
  }
  async function init(){
    try{const link=await api('/api/bookings/link');$('public-link').value=location.origin+link.booking_page;await Promise.all([services(),bookings()]);}
    catch(e){notice('Please sign in to BarberFlow first. '+e.message,true);return;}
    $('copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('public-link').value);notice('Booking link copied.');}catch{ $('public-link').select();notice('Copy the selected booking link.');}});
    $('service-form').addEventListener('submit',async event=>{event.preventDefault();try{await api('/api/bookings/services',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('name').value,duration_minutes:Number($('duration').value),price_cents:Math.round(Number($('price').value)*100)})});$('name').value='';notice('Service added. Your public booking page now displays it.');await services();}catch(e){notice(e.message,true);}});
  }
  init();
})();