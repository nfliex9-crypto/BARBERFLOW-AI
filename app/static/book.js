(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sid = new URLSearchParams(location.search).get('salon') || '';
  const state = {selected: null, slots: []};
  const notice = (message, error=false) => {const n=$('notice'); n.hidden=false; n.className=error?'notice error':'notice';n.textContent=message;};
  async function api(path, options) {
    const response = await fetch(path, {credentials:'same-origin',...options});
    let result = {};try {result=await response.json();} catch {}
    if (!response.ok) throw new Error(result.detail || 'Unable to complete your request.');
    return result;
  }
  function selectTime(value) {
    state.selected=value;
    document.querySelectorAll('.time-button').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.start===value)));
    $('submit').disabled=!value;
  }
  async function slots() {
    state.selected=null;$('submit').disabled=true;$('times').replaceChildren();
    const service=$('service').value, day=$('date').value;
    if (!service||!day) return;
    try {
      const data=await api('/api/public/salons/'+encodeURIComponent(sid)+'/slots?service_id='+encodeURIComponent(service)+'&day='+encodeURIComponent(day));
      state.slots=data.slots;
      if (!state.slots.length) {$('times').textContent='No slots available for this date.';return;}
      state.slots.forEach(slot=>{const b=document.createElement('button');b.type='button';b.className='time-button';b.dataset.start=slot.starts_at;b.textContent=slot.label;b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>selectTime(slot.starts_at));$('times').append(b);});
    }catch(e){notice(e.message,true);}
  }
  async function load() {
    if(!/^[\w-]{3,64}$/.test(sid)){notice('Invalid booking link.',true);return;}
    try {
      const info=await api('/api/public/salons/'+encodeURIComponent(sid));
      $('salon-name').textContent=info.name;
      $('subtitle').textContent='Request your next appointment at '+info.name+'.';
      $('service').replaceChildren();
      $('service').add(new Option('Choose a service',''));
      info.services.forEach(s=>$('service').add(new Option(s.name+' · '+s.duration_minutes+' min · €'+(s.price_cents/100).toFixed(2),s.id)));
      if(!info.services.length) notice('This salon has not added any services yet.',true);
    }catch(e){notice(e.message,true);}
    const date=$('date');
    const today=new Date();date.min=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Brussels',year:'numeric',month:'2-digit',day:'2-digit'}).format(today);
    const max=new Date(today.getTime()+60*86400000);date.max=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Brussels',year:'numeric',month:'2-digit',day:'2-digit'}).format(max);
    date.value=date.min;
    $('service').addEventListener('change',slots);date.addEventListener('change',slots);
    $('booking-form').addEventListener('submit',async event=>{
      event.preventDefault(); if(!state.selected)return;
      $('submit').disabled=true;
      const body={service_id:$('service').value,starts_at:state.selected,customer_name:$('name').value,customer_email:$('email').value,customer_phone:$('phone').value,privacy_accepted:$('privacy').checked};
      try {const result=await api('/api/public/salons/'+encodeURIComponent(sid)+'/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});$('booking-form').hidden=true;notice('Request received (#'+result.id.slice(0,8)+'). The salon must contact you to confirm your appointment.');}
      catch(e){notice(e.message,true);$('submit').disabled=false;}
    });
  }
  load();
})();