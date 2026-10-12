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
      const actions=document.createElement('div');actions.className='actions';for(const s of ['confirmed','declined']){const button=document.createElement('button');button.className=s==='confirmed'?'primary':'secondary';button.textContent=s==='confirmed'?'Confirm':'Decline';button.addEventListener('click',async()=>{try{const result=await api('/api/bookings/'+encodeURIComponent(b.id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:s})});notice(result.notification_queued?'Email queued for the private SMTP worker. Delivery is not yet confirmed.':'Status updated. Contact the customer manually; no message was sent.');await bookings();}catch(e){notice(e.message,true);}});actions.append(button);}item.append(actions);}
      else if(b.state==='confirmed'){const cancel=document.createElement('button');cancel.className='secondary';cancel.textContent='Cancel';cancel.addEventListener('click',async()=>{try{await api('/api/bookings/'+encodeURIComponent(b.id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:'cancelled'})});notice('Cancelled. Contact the customer to inform them.');await bookings();}catch(e){notice(e.message,true);}});item.append(cancel);}list.append(item);}
  }

  const weekdays=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  function timeField(name,value){
    const label=document.createElement('label');
    label.textContent=name;
    const input=document.createElement('input');
    input.type='time';input.step='1800';input.value=value||'';
    label.append(input);
    return {label,input};
  }
  async function hours(){
    const result=await api('/api/bookings/hours');
    const holder=$('hours');holder.replaceChildren();
    for(const day of result.hours){
      const row=document.createElement('div');row.className='booking';
      const heading=document.createElement('strong');heading.textContent=weekdays[day.weekday];
      const controls=document.createElement('div');controls.className='schedule-fields';
      const toggle=document.createElement('label');toggle.textContent='Status';
      const select=document.createElement('select');
      select.add(new Option('Open','1'));select.add(new Option('Closed','0'));
      select.value=String(day.enabled);toggle.append(select);controls.append(toggle);
      const open=timeField('Opening',day.opens);
      const close=timeField('Closing',day.closes);
      const breakA=timeField('Break starts',day.break_start);
      const breakB=timeField('Break ends',day.break_end);
      controls.append(open.label,close.label,breakA.label,breakB.label);
      const btn=document.createElement('button');btn.className='secondary';btn.type='button';btn.textContent='Save hours';
      btn.addEventListener('click',async()=>{
        btn.disabled=true;
        try{
          const body={enabled:select.value==='1',opens:open.input.value,closes:close.input.value,
            break_start:breakA.input.value||null,break_end:breakB.input.value||null};
          await api('/api/bookings/hours/'+day.weekday,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
          notice('Hours saved for '+weekdays[day.weekday]+'. Already confirmed customers are not notified.');
          await hours();
        }catch(e){notice(e.message,true);}
        finally{btn.disabled=false;}
      });
      row.append(heading,controls,btn);holder.append(row);
    }
  }
  async function closures(){
    const result=await api('/api/bookings/closures');
    const holder=$('closures');holder.replaceChildren();
    if(!result.closures.length){const empty=document.createElement('p');empty.textContent='No closed dates configured.';holder.append(empty);return;}
    for(const entry of result.closures){
      const item=document.createElement('div');item.className='item';
      const text=document.createElement('div');
      const strong=document.createElement('strong');strong.textContent=entry.day;
      const small=document.createElement('small');small.textContent=entry.reason||'No reason specified';
      text.append(strong,small);
      const button=document.createElement('button');button.className='secondary';button.textContent='Remove';
      button.addEventListener('click',async()=>{try{
        await api('/api/bookings/closures/'+encodeURIComponent(entry.day),{method:'DELETE'});
        notice('Date reopened. Please check any bookings before notifying customers.');
        await closures();
      }catch(e){notice(e.message,true);}});
      item.append(text,button);holder.append(item);
    }
  }

  async function init(){
    try{const link=await api('/api/bookings/link');$('public-link').value=location.origin+link.booking_page;await Promise.all([services(),bookings(),hours(),closures()]);}
    catch(e){notice('Please sign in to BarberFlow first. '+e.message,true);return;}
    const currentDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Brussels',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    $('closure-day').min=currentDate;
    $('closure-day').value=currentDate;
    $('closure-form').addEventListener('submit',async event=>{
      event.preventDefault();
      try{
        await api('/api/bookings/closures',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({day:$('closure-day').value,reason:$('closure-reason').value})});
        $('closure-reason').value='';
        notice('Date closed. Existing confirmed bookings must be handled manually.');
        await closures();
      }catch(e){notice(e.message,true);}
    });
    $('copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('public-link').value);notice('Booking link copied.');}catch{ $('public-link').select();notice('Copy the selected booking link.');}});
    $('service-form').addEventListener('submit',async event=>{event.preventDefault();try{await api('/api/bookings/services',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('name').value,duration_minutes:Number($('duration').value),price_cents:Math.round(Number($('price').value)*100)})});$('name').value='';notice('Service added. Your public booking page now displays it.');await services();}catch(e){notice(e.message,true);}});
  }
  init();
})();