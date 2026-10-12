(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const salonId = params.get('salon') || '';
  const language = (params.get('lang') || navigator.language.slice(0,2) || 'en').toLowerCase();
  const translations = {
    en: {
      language:'Language', intro:'PERSONAL BOOKING EXPERIENCE', headline1:'Fresh cut.',headline2:'Easy booking.',
      subtitle:'Choose a service and request your preferred time.', subtitleSalon:n=>'Request your next appointment at '+n+'.',
      service:'Service', day:'Preferred day',times:'Available times',
      requestWarning:'Times shown in Europe/Brussels. This is a booking request, not an automatic confirmation.',
      name:'Your name',email:'Email address',phone:'Phone (optional)',
      consent:'I agree that the salon may store my contact details to handle this appointment request. The salon will contact me to confirm.',
      submit:'Send booking request →',disclaimer:'No payment is taken. No appointment is confirmed automatically.',
      footer:'Powered by BarberFlow · Pilot booking experience',chooseService:'Choose a service',
      noTimes:'No times available for this date.',invalidLink:'Invalid booking link.',
      noServices:'This salon has not added any services yet.',
      requestReceived:id=>'Request received (#'+id+'). The salon must contact you to confirm the appointment.',
      title:'Book an appointment · BarberFlow'
    },
    fr: {
      language:'Langue', intro:'VOTRE RENDEZ-VOUS EN QUELQUES CLICS',headline1:'Une coupe fraîche.',headline2:'Réservation facile.',
      subtitle:'Choisissez une prestation et l’heure souhaitée.',subtitleSalon:n=>'Demandez votre prochain rendez-vous chez '+n+'.',
      service:'Prestation',day:'Date souhaitée',times:'Créneaux disponibles',
      requestWarning:'Heures de Bruxelles. Il s’agit d’une demande : le salon doit confirmer le rendez-vous.',
      name:'Votre nom',email:'Adresse e-mail',phone:'Téléphone (facultatif)',
      consent:'J’accepte que le salon conserve mes coordonnées pour traiter ma demande. Le salon me contactera pour confirmer.',
      submit:'Envoyer la demande →',disclaimer:'Aucun paiement demandé. Le rendez-vous n’est pas confirmé automatiquement.',
      footer:'Propulsé par BarberFlow · Version pilote',chooseService:'Choisir une prestation',
      noTimes:'Aucun créneau disponible à cette date.',invalidLink:'Lien de réservation invalide.',
      noServices:'Ce salon n’a pas encore ajouté de prestations.',
      requestReceived:id=>'Demande reçue (#'+id+'). Le salon doit vous contacter pour confirmer le rendez-vous.',
      title:'Prendre rendez-vous · BarberFlow'
    },
    nl: {
      language:'Taal',intro:'BOEK EEN AFSPRAAK',headline1:'Frisse coupe.',headline2:'Eenvoudig boeken.',
      subtitle:'Kies een dienst en een gewenst tijdstip.',subtitleSalon:n=>'Vraag je volgende afspraak aan bij '+n+'.',
      service:'Dienst',day:'Gewenste datum',times:'Beschikbare tijdstippen',
      requestWarning:'Tijden in Brussel. Dit is een aanvraag: de salon moet de afspraak nog bevestigen.',
      name:'Je naam',email:'E-mailadres',phone:'Telefoon (optioneel)',
      consent:'Ik ga ermee akkoord dat de salon mijn contactgegevens bewaart om mijn afspraakaanvraag te verwerken. De salon neemt contact op om te bevestigen.',
      submit:'Aanvraag versturen →',disclaimer:'Geen betaling vereist. Je afspraak is nog niet automatisch bevestigd.',
      footer:'Mogelijk gemaakt door BarberFlow · Proefversie',chooseService:'Kies een dienst',
      noTimes:'Geen tijdstippen beschikbaar op deze datum.',invalidLink:'Ongeldige boekingslink.',
      noServices:'Deze salon heeft nog geen diensten toegevoegd.',
      requestReceived:id=>'Aanvraag ontvangen (#'+id+'). De salon moet contact opnemen om de afspraak te bevestigen.',
      title:'Afspraak aanvragen · BarberFlow'
    }
  };
  let locale = translations[language] ? language : 'en';
  let salonName = '';
  const state = {selected: null, generation: 0};
  const t = () => translations[locale];
  function notice(message, isError=false) {
    const element=$('notice');
    element.hidden=false;
    element.className=isError?'notice error':'notice';
    element.textContent=message;
  }
  function applyLanguage() {
    document.documentElement.lang=locale;
    $('language').value=locale;
    document.title=t().title;
    document.querySelectorAll('[data-i18n]').forEach(node=>{
      const key=node.dataset.i18n;
      if (typeof t()[key] === 'string') node.textContent=t()[key];
    });
    if (salonName) $('subtitle').textContent=t().subtitleSalon(salonName);
    const select=$('service');
    if(select.options.length && select.options[0].value==='') select.options[0].textContent=t().chooseService;
    if($('times').dataset.empty==='1') $('times').textContent=t().noTimes;
    $('times').setAttribute('aria-label',t().times);
    $('name').placeholder=t().name;
  }
  async function api(path, options={}) {
    const response=await fetch(path,{credentials:'same-origin',...options});
    let result={};try{result=await response.json();}catch{}
    if(!response.ok)throw new Error(result.detail||'Request failed');
    return result;
  }
  function brusselsDay(d) {
    const parts=new Intl.DateTimeFormat('en-GB',{
      timeZone:'Europe/Brussels',year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(d);
    const value=kind=>parts.find(part=>part.type===kind).value;
    return value('year')+'-'+value('month')+'-'+value('day');
  }
  function selectTime(startsAt) {
    state.selected=startsAt;
    document.querySelectorAll('.time-button').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.start===startsAt));
    });
    $('submit').disabled=!startsAt;
  }
  async function refreshTimes() {
    const generation=++state.generation;
    state.selected=null;
    $('submit').disabled=true;
    $('times').replaceChildren();
    $('times').dataset.empty='0';
    const service=$('service').value,day=$('date').value;
    if(!service||!day)return;
    try {
      const data=await api('/api/public/salons/'+encodeURIComponent(salonId)+
        '/slots?service_id='+encodeURIComponent(service)+'&day='+encodeURIComponent(day));
      if(generation!==state.generation)return;
      if(!data.slots.length){$('times').dataset.empty='1';$('times').textContent=t().noTimes;return;}
      data.slots.forEach(slot=>{
        const button=document.createElement('button');
        button.type='button';button.className='time-button';
        button.dataset.start=slot.starts_at;
        button.textContent=slot.label;
        button.setAttribute('aria-pressed','false');
        button.addEventListener('click',()=>selectTime(slot.starts_at));
        $('times').append(button);
      });
    } catch(error) {
      if(generation===state.generation)notice(error.message,true);
    }
  }
  async function load() {
    applyLanguage();
    $('language').addEventListener('change',event=>{
      locale=event.target.value;
      applyLanguage();
    });
    if(!/^[\w-]{3,64}$/.test(salonId)){notice(t().invalidLink,true);return;}
    try {
      const info=await api('/api/public/salons/'+encodeURIComponent(salonId));
      salonName=info.name;
      $('salon-name').textContent=salonName;
      $('service').replaceChildren();
      $('service').add(new Option(t().chooseService,''));
      info.services.forEach(svc=>{
        $('service').add(new Option(svc.name+' · '+svc.duration_minutes+' min · €'+
          (svc.price_cents/100).toFixed(2),svc.id));
      });
      if(!info.services.length)notice(t().noServices,true);
      applyLanguage();
    } catch(error) {notice(error.message,true);}
    const date=$('date'),today=new Date();
    date.min=brusselsDay(today);
    date.max=brusselsDay(new Date(today.getTime()+60*86400000));
    date.value=date.min;
    $('service').addEventListener('change',refreshTimes);
    date.addEventListener('change',refreshTimes);
    $('booking-form').addEventListener('submit',async event=>{
      event.preventDefault();
      if(!state.selected)return;
      $('submit').disabled=true;
      const request={
        service_id:$('service').value,starts_at:state.selected,
        customer_name:$('name').value,customer_email:$('email').value,
        customer_phone:$('phone').value,privacy_accepted:$('privacy').checked
      };
      try {
        const result=await api('/api/public/salons/'+encodeURIComponent(salonId)+'/requests',{
          method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)
        });
        $('booking-form').hidden=true;
        notice(t().requestReceived(result.id.slice(0,8)));
      } catch(error) {
        notice(error.message,true);
        $('submit').disabled=false;
      }
    });
  }
  load();
})();