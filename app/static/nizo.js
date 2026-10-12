(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const localeText = {
    nl: {
      navServices:'Services', navAbout:'Over ons',navVisit:'Locatie',navBook:'Boeken',
      ctaNav:'AFSPRAAK MAKEN ↗',heroSub:'Scherpe lijnen. Een frisse look. De barbershop in Gent voor jouw volgende afspraak.',
      heroBook:'PLAN JE AFSPRAAK',heroExplore:'ONTDEK SERVICES',callDirect:'Bel rechtstreeks',
      whatWeDo:'ONZE SERVICES', servicesHeading:'JOUW LOOK. ONZE FOCUS.',
      servicesLead:'Van een frisse herensnit tot een strakke baard. Kies een behandeling en vraag een geschikt moment aan.',
      serviceDesc1:'Frisse snit, passend bij jouw stijl.',serviceDesc2:'Haar en baard, één verzorgde look.',
      serviceDesc3:'Scherpe contouren en nette afwerking.',priceUponRequest:'PRIJS OP AANVRAAG',
      servicePreview:'Voorbeeldcategorieën. De eigenaar bevestigt de exacte diensten en prijzen vóór publicatie.',
      theBarber:'THE BARBER', aboutHeading:'EEN GOEDE COUPE IS PERSOONLIJK.',
      aboutText:'Een herkenbare barbershop in Phoenixstraat, Gent. Voor je volgende frisse coupe, strakke lijn of baardverzorging.',
      makeBooking:'AFSPRAAK',bookingHeading:'JOUW STOEL WACHT OP JOU.',
      bookingLead:'Selecteer je behandeling, kies een tijdstip en stuur je aanvraag. Een afspraak is pas definitief na bevestiging door de barbershop.',
      selectService:'Kies behandeling',selectDay:'Datum',selectTime:'Beschikbare tijdstippen',yourName:'Jouw naam',
      yourEmail:'E-mail',yourPhone:'Telefoon (optioneel)',
      consent:'Ik ga akkoord met de verwerking van mijn gegevens om deze afspraakaanvraag te behandelen. Lees het privacybeleid.',
      requestCta:'VERSTUUR AANVRAAG ↗',requestOnly:'Dit is een aanvraag. De barbershop moet deze nog bevestigen. Geen online betaling.',
      callToBook:'BEL VOOR EEN AFSPRAAK ↗', needHelp:'LIEVER BELLEN?',contactHeading:'STRAK GEKNIPT. GOED GEPLAND.',
      contactText:'Vragen over een behandeling? Neem rechtstreeks contact op met de barbershop.',findUs:'VIND ONS',
      visitHeading:'IN HET HART VAN GENT.',directions:'ROUTEBESCHRIJVING',openingHours:'OPENINGSUREN',
      hoursCheck:'Vraag naar de actuele openingsuren.',bottomCta:'JOUW VOLGENDE COUPE?',privacyPolicy:'PRIVACY',ownerPortal:'BEHEERDER',
      credits:'Websitepilot gebouwd met BarberFlow', servicePick:'Selecteer je behandeling',
      noSlots:'Geen beschikbare tijdstippen voor deze datum.',chooseFirst:'Kies eerst een behandeling.',
      preview:'WEBSITE PREVIEW — Nog niet officieel gepubliceerd.',
      disabled:'Online boekingen worden voorbereid. Bel rechtstreeks voor een afspraak.',
      submitted:'Aanvraag ontvangen! Het is nog geen bevestigde afspraak. De barbershop neemt contact met je op.',
      genericError:'De aanvraag kon niet worden verwerkt. Probeer opnieuw of bel rechtstreeks.',
      closed:'Gesloten',dayNames:['Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag','Zondag']
    },
    en: {
      navServices:'Services',navAbout:'About',navVisit:'Find us',navBook:'Book',
      ctaNav:'BOOK APPOINTMENT ↗',heroSub:'Sharp lines. A fresh look. Your next visit starts here in Ghent.',
      heroBook:'REQUEST A BOOKING',heroExplore:'EXPLORE SERVICES',callDirect:'Call directly',
      whatWeDo:'OUR SERVICES',servicesHeading:'YOUR LOOK. OUR FOCUS.',
      servicesLead:'From a fresh haircut to a precise beard trim. Request your preferred appointment.',
      serviceDesc1:'A fresh cut that suits your style.',serviceDesc2:'Hair and beard, one clean look.',
      serviceDesc3:'Sharp contours and a neat finish.',priceUponRequest:'PRICE ON REQUEST',
      servicePreview:'Example service categories. The owner must confirm actual services and prices before launch.',
      theBarber:'THE BARBER',aboutHeading:'A GOOD CUT IS PERSONAL.',
      aboutText:'Find the barbershop on Phoenixstraat in Ghent. For your next haircut and beard care.',
      makeBooking:'APPOINTMENT',bookingHeading:'YOUR CHAIR IS WAITING.',
      bookingLead:'Pick a service, date and time. This request becomes an appointment only after the barbershop confirms it.',
      selectService:'Choose service',selectDay:'Date',selectTime:'Available times',yourName:'Your name',
      yourEmail:'Email',yourPhone:'Phone (optional)',
      consent:'I agree to processing of my contact details to handle this appointment request. See the privacy notice.',
      requestCta:'SEND BOOKING REQUEST ↗',requestOnly:'This is a request, not a confirmed booking. No online payment.',
      callToBook:'CALL FOR A BOOKING ↗', needHelp:'PREFER A CALL?',contactHeading:'CLEAN CUT. WELL PLANNED.',
      contactText:'Questions about a service? Contact the barbershop directly.',findUs:'FIND US',
      visitHeading:'IN THE HEART OF GHENT.',directions:'GET DIRECTIONS',openingHours:'OPENING HOURS',
      hoursCheck:'Ask the salon for current opening hours.',bottomCta:'YOUR NEXT CUT?',privacyPolicy:'PRIVACY',
      ownerPortal:'OWNER LOGIN',credits:'Website preview built with BarberFlow',
      servicePick:'Select a service',noSlots:'No available times on this date.',chooseFirst:'Choose a service first.',
      preview:'WEBSITE PREVIEW — Not officially published.',disabled:'Online bookings are being prepared. Please call the salon.',
      submitted:'Request received! Your appointment is not confirmed yet. The barbershop will contact you.',
      genericError:'Could not send the request. Please retry or call.',closed:'Closed',
      dayNames:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    },
    fr: {
      navServices:'Prestations',navAbout:'À propos',navVisit:'Adresse',navBook:'Réserver',
      ctaNav:'PRENDRE RENDEZ-VOUS ↗',heroSub:'Des lignes nettes, un style soigné. Votre prochaine visite commence à Gand.',
      heroBook:'DEMANDER UN RENDEZ-VOUS',heroExplore:'NOS PRESTATIONS',callDirect:'Appeler directement',
      whatWeDo:'NOS PRESTATIONS',servicesHeading:'VOTRE STYLE. NOTRE PRIORITÉ.',
      servicesLead:'Une coupe fraîche ou une barbe bien taillée. Demandez votre créneau préféré.',
      serviceDesc1:'Une coupe adaptée à votre style.',serviceDesc2:'Cheveux et barbe, une finition soignée.',
      serviceDesc3:'Des contours précis et une finition nette.',priceUponRequest:'PRIX SUR DEMANDE',
      servicePreview:'Prestations données à titre indicatif. Le gérant doit confirmer les services et les prix.',
      theBarber:'LE BARBIER',aboutHeading:'UNE BONNE COUPE EST PERSONNELLE.',
      aboutText:'Un barbershop dans la Phoenixstraat, à Gand, pour vos coupes et soins de barbe.',
      makeBooking:'RENDEZ-VOUS',bookingHeading:'VOTRE FAUTEUIL VOUS ATTEND.',
      bookingLead:'Choisissez la prestation et le créneau souhaité. Le salon doit confirmer votre demande.',
      selectService:'Prestation',selectDay:'Date',selectTime:'Créneaux disponibles',yourName:'Votre nom',
      yourEmail:'E-mail',yourPhone:'Téléphone (facultatif)',
      consent:'J’accepte le traitement de mes coordonnées pour cette demande de rendez-vous. Consultez la politique de confidentialité.',
      requestCta:'ENVOYER LA DEMANDE ↗',requestOnly:'Ceci est une demande, pas un rendez-vous confirmé. Aucun paiement en ligne.',
      callToBook:'APPELER POUR RÉSERVER ↗',needHelp:'VOUS PRÉFÉREZ APPELER ?',contactHeading:'BIEN COUPÉ. BIEN PLANIFIÉ.',
      contactText:'Des questions ? Contactez le barbershop directement.',findUs:'NOUS TROUVER',
      visitHeading:'AU CŒUR DE GAND.',directions:'ITINÉRAIRE',openingHours:'HEURES D’OUVERTURE',
      hoursCheck:'Demandez les horaires actuels au salon.',bottomCta:'VOTRE PROCHAINE COUPE ?',privacyPolicy:'CONFIDENTIALITÉ',
      ownerPortal:'ESPACE GÉRANT',credits:'Aperçu réalisé avec BarberFlow',
      servicePick:'Choisissez une prestation',noSlots:'Aucun créneau disponible ce jour-là.',chooseFirst:'Choisissez une prestation.',
      preview:'APERÇU — Site non publié officiellement.',disabled:'Les réservations en ligne sont en préparation. Appelez le salon.',
      submitted:'Demande reçue ! Le salon doit encore confirmer votre rendez-vous.',
      genericError:'Impossible d’envoyer la demande. Réessayez ou appelez.',closed:'Fermé',
      dayNames:['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche']
    }
  };
  const param = new URLSearchParams(location.search);
  let lang = ['nl','en','fr'].includes(param.get('lang'))?param.get('lang'):'nl';
  let site=null;
  let selectedTime=null;
  let generation=0;
  // Confirmed by the project contact, unlike third-party opening-hours directories.
  const NIZO_HOURS = Array.from({length:7},(_,weekday)=>({
    weekday, enabled: weekday===0?0:1,
    opens:'10:00',closes:weekday===6?'17:00':'19:00'
  }));
  function tr(key){return localeText[lang][key]||key;}
  function setNotice(message,err=false){
    const node=$('booking-state');node.textContent=message;node.className='notice'+(err?' error':'');
  }
  function localeApply(){
    document.documentElement.lang=lang;$('language').value=lang;
    document.querySelectorAll('[data-tr]').forEach(node=>{
      const translated=localeText[lang][node.dataset.tr];
      if(typeof translated==='string')node.textContent=translated;
    });
    if(site)renderSite();
  }
  async function json(url,options={}){
    const response=await fetch(url,{credentials:'same-origin',...options});
    let content={};try{content=await response.json();}catch{}
    if(!response.ok)throw new Error(typeof content.detail==='string'?content.detail:tr('genericError'));
    return content;
  }
  function fmtDay(date){
    const pieces=new Intl.DateTimeFormat('en-GB',{
      timeZone:'Europe/Brussels',year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(date);
    const part=type=>pieces.find(x=>x.type===type).value;
    return part('year')+'-'+part('month')+'-'+part('day');
  }
  function renderHours(){
    const holder=$('hours-list');
    const schedule=(site && Array.isArray(site.hours) && site.hours.length===7)
      ? site.hours : NIZO_HOURS;
    holder.replaceChildren();
    [...schedule].sort((a,b)=>a.weekday-b.weekday).forEach(h=>{
      const row=document.createElement('div');row.className='hours-row';
      const day=document.createElement('span');day.textContent=tr('dayNames')[h.weekday];
      const time=document.createElement('span');
      time.textContent=h.enabled?h.opens+' – '+h.closes:tr('closed');
      row.append(day,time);holder.append(row);
    });
  }
  function renderSite(){
    renderHours();
    const cards=$('service-cards');
    if(site.configured && site.services.length){
      cards.replaceChildren();
      site.services.forEach((svc,index)=>{
        const card=document.createElement('article');card.className='service-card';
        const nr=document.createElement('span');nr.className='service-nr';nr.textContent=String(index+1).padStart(2,'0');
        const icon=document.createElement('span');icon.className='service-icon';icon.textContent=['✂','◈','✦'][index%3];
        const heading=document.createElement('h3');heading.textContent=svc.name;
        const meta=document.createElement('span');meta.className='service-meta';
        meta.textContent=(svc.price_cents>0?'€'+(svc.price_cents/100).toFixed(2):tr('priceUponRequest'))+
          ' · '+svc.duration_minutes+' MIN';
        card.append(nr,icon,heading,meta);cards.append(card);
      });
    }
    $('service-disclaimer').hidden=!!site.published;
    $('preview-notice').hidden=!!site.published;
    if(!site.booking_enabled){
      $('nizo-booking-form').hidden=true;
      $('phone-fallback').hidden=false;
      setNotice(tr('disabled'));

      return;
    }
    $('nizo-booking-form').hidden=false;
    $('phone-fallback').hidden=true;
    setNotice(tr('requestOnly'));
    const input=$('nizo-service'),previous=input.value;
    input.replaceChildren();input.add(new Option(tr('servicePick'),''));
    site.services.forEach(service=>{
      const cost=service.price_cents>0?'€'+(service.price_cents/100).toFixed(2):tr('priceUponRequest');
      input.add(new Option(service.name+' · '+service.duration_minutes+' min · '+cost,service.id));
    });
    if([...input.options].some(option=>option.value===previous))input.value=previous;

  }
  async function refreshSlots(){
    const current=++generation;selectedTime=null;$('nizo-submit').disabled=true;
    const slotBox=$('nizo-slots');slotBox.replaceChildren();
    const service=$('nizo-service').value,day=$('nizo-date').value;
    if(!service||!day)return;
    const loading=document.createElement('span');loading.className='slots-loading';loading.textContent='…';slotBox.append(loading);
    try{
      const result=await json('/api/public/salons/'+encodeURIComponent(site.salon_id)+
        '/slots?service_id='+encodeURIComponent(service)+'&day='+encodeURIComponent(day));
      if(current!==generation)return;
      slotBox.replaceChildren();
      if(!result.slots.length){slotBox.textContent=tr('noSlots');return;}
      result.slots.forEach(slot=>{
        const button=document.createElement('button');button.type='button';button.className='slot';
        button.dataset.start=slot.starts_at;button.textContent=slot.label;
        button.setAttribute('aria-pressed','false');
        button.addEventListener('click',()=>{
          selectedTime=slot.starts_at;$('nizo-submit').disabled=false;
          slotBox.querySelectorAll('.slot').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
        });slotBox.append(button);
      });
    }catch(error){if(current===generation)setNotice(error.message,true);}
  }
  async function load(){
    $('year').textContent=String(new Date().getFullYear());
    $('language').addEventListener('change',e=>{lang=e.target.value;localeApply();});
    $('mobile-menu').addEventListener('click',()=>{
      const panel=$('mobile-panel');panel.hidden=!panel.hidden;
      $('mobile-menu').setAttribute('aria-expanded',String(!panel.hidden));
    });
    document.querySelectorAll('#mobile-panel a').forEach(a=>a.addEventListener('click',()=>{
      $('mobile-panel').hidden=true;$('mobile-menu').setAttribute('aria-expanded','false');
    }));
    localeApply();
    try{site=await json('/api/nizo/site');renderSite();}
    catch(error){
      // Standalone hosting previews contain no API; keep the phone fallback usable.
      site={configured:false,published:false,booking_enabled:false,services:[],hours:NIZO_HOURS};
      renderSite();
      setNotice(tr('disabled'));
      return;
    }
    const date=$('nizo-date'),now=new Date();
    date.min=fmtDay(now);date.max=fmtDay(new Date(now.getTime()+60*86400000));date.value=date.min;
    $('nizo-service').addEventListener('change',refreshSlots);
    date.addEventListener('change',refreshSlots);
    $('nizo-booking-form').addEventListener('submit',async e=>{
      e.preventDefault();
      if(!selectedTime||!site?.booking_enabled)return;
      $('nizo-submit').disabled=true;
      const payload={
        service_id:$('nizo-service').value,starts_at:selectedTime,
        customer_name:$('nizo-name').value,customer_email:$('nizo-email').value,
        customer_phone:$('nizo-phone').value,privacy_accepted:$('nizo-privacy').checked
      };
      try{
        const result=await json('/api/public/salons/'+encodeURIComponent(site.salon_id)+'/requests',{
          method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
        });
        $('nizo-booking-form').hidden=true;
        setNotice(tr('submitted')+' #'+result.id.slice(0,8));
        document.querySelector('#booking').scrollIntoView({behavior:'smooth'});
      }catch(error){setNotice(error.message,true);$('nizo-submit').disabled=false;}
    });
  }
  load();
})();