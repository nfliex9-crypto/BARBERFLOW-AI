(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const localeText = {
    nl: {
      examplePriceLabel:'RICHTPRIJS*',priceDisclosure:'* VOORSTELPRIJZEN — nog niet bevestigd door BARBER NIZO. Geen officiële prijslijst. De eigenaar controleert alle prijzen vóór online boekingen.',priceToolEyebrow:'KIES JE LOOK',priceToolHeading:'CHECK DE PRIJS.',priceToolDisclaimer:'Indicatieve voorbeeldprijs, nog niet bevestigd door de zaak.',priceToolConfirmed:'Deze prijs is door de salonbeheerder ingesteld. Betaal pas in de zaak.',priceOnRequest:'OP AANVRAAG',serviceDesc4:'De finishing touch voor jouw look.',styleTitle:'HAARSTYLING',suggestedDuration:'min',
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
      examplePriceLabel:'SUGGESTED*',priceDisclosure:'* SUGGESTED PRICES ONLY — not confirmed by BARBER NIZO. Not an official price list. The owner will verify all prices before online bookings.',priceToolEyebrow:'FIND YOUR STYLE',priceToolHeading:'CHECK THE PRICE.',priceToolDisclaimer:'Suggested example price only, not confirmed by the salon.',priceToolConfirmed:'This price was set by the salon owner. Payment is at the salon.',priceOnRequest:'ON REQUEST',serviceDesc4:'The finishing touch to your look.',styleTitle:'HAIR STYLING',suggestedDuration:'min',
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
      examplePriceLabel:'PRIX PROPOSÉ*',priceDisclosure:'* PRIX INDICATIFS UNIQUEMENT — non confirmés par BARBER NIZO. Cette liste n’est pas officielle. Le gérant vérifiera les tarifs avant la prise de rendez-vous.',priceToolEyebrow:'VOTRE STYLE',priceToolHeading:'DÉCOUVREZ LES PRIX.',priceToolDisclaimer:'Tarif indicatif non confirmé par le salon.',priceToolConfirmed:'Tarif enregistré par le gérant. Paiement sur place.',priceOnRequest:'SUR DEMANDE',serviceDesc4:'La touche finale de votre style.',styleTitle:'COIFFAGE',suggestedDuration:'min',
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
  const PRICING_PREVIEW = Object.freeze([
    {name:'HERENKNIPBEURT',duration_minutes:30,price_cents:2500,desc:'serviceDesc1',label:'01 / CUT'},
    {name:'BAARD BIJWERKEN',duration_minutes:30,price_cents:1500,desc:'serviceDesc3',label:'02 / BEARD'},
    {name:'KNIPPEN + BAARD',duration_minutes:45,price_cents:3500,desc:'serviceDesc2',label:'03 / COMPLETE'},
    {name:'HAARSTYLING',duration_minutes:30,price_cents:2000,desc:'serviceDesc4',label:'04 / STYLE'}
  ]);
  let visibleServices = PRICING_PREVIEW;
  const motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  function showPrice(service,previewMode) {
    const amount=Number(service.price_cents);
    if (!Number.isFinite(amount)||amount<=0) return tr('priceOnRequest');
    return '€'+(amount/100).toFixed(2).replace('.00','');
  }
  function labelFor(service,index,previewMode){
    if(!previewMode) return service.name;
    if(index===3) return tr('styleTitle');
    return service.name;
  }
  function syncPlanner() {
    const selector=$('pricing-service');
    const old=selector.value;
    selector.replaceChildren();
    visibleServices.forEach((svc,index)=>selector.add(new Option(labelFor(svc,index,!site?.configured),String(index))));
    if(Number(old)>=0&&Number(old)<visibleServices.length) selector.value=old;
    else selector.value='0';
    updatePricePanel();
  }
  function updatePricePanel(){
    const index=Number($('pricing-service').value)||0;
    const svc=visibleServices[index];
    if(!svc)return;
    $('pricing-amount').textContent=showPrice(svc,!site?.configured);
    $('pricing-duration').textContent=svc.duration_minutes+' MIN';
    $('pricing-disclaimer').textContent=site?.configured?tr('priceToolConfirmed'):tr('priceToolDisclaimer');
    if(site?.configured && !svc.price_cents) $('pricing-disclaimer').textContent=tr('priceOnRequest');
    if(site?.booking_enabled){
      const booking=$('nizo-service');
      if(booking && svc.id) booking.value=svc.id;
    }
  }
  function observeReveals() {
    if(!window.nizoRevealObserver)return;
    if(motionReduced||!('IntersectionObserver' in window))return;
    const observer=window.nizoRevealObserver;
    document.querySelectorAll('.service-card,.gallery-shot,.services-intro,.about-text,.booking-surface,.info-box,.price-planner').forEach(el=>{
      if(el.dataset.observed)return;
      el.dataset.observed='true';
      el.classList.add('motion-reveal');
      observer.observe(el);
    });
  }
  function renderSite(){
    renderHours();
    const previewMode=!site?.configured;
    visibleServices=site?.configured&&Array.isArray(site.services)&&site.services.length
      ?site.services:PRICING_PREVIEW;
    const cards=$('service-cards');
    cards.replaceChildren();
    visibleServices.forEach((svc,index)=>{
      const card=document.createElement('a');
      card.className='service-card';card.href='#pricing';card.dataset.serviceIndex=String(index);
      const nr=document.createElement('span');nr.className='service-nr';
      nr.textContent=previewMode?svc.label:String(index+1).padStart(2,'0')+' / SERVICE';
      const details=document.createElement('div');details.className='service-details';
      const title=document.createElement('h3');title.textContent=labelFor(svc,index,previewMode);
      const desc=document.createElement('p');
      desc.textContent=previewMode?tr(svc.desc):'BARBER NIZO · GENT';
      const priceBlock=document.createElement('div');priceBlock.className='service-price';
      const price=document.createElement('strong');price.textContent=showPrice(svc,previewMode);
      const tag=document.createElement('small');
      tag.textContent=previewMode?tr('examplePriceLabel'):'';
      priceBlock.append(price,tag);
      const meta=document.createElement('span');meta.className='service-meta';
      meta.textContent=svc.duration_minutes+' MIN';
      const arrow=document.createElement('span');arrow.className='service-arrow';
      arrow.setAttribute('aria-hidden','true');arrow.textContent='↗';
      details.append(title,desc,priceBlock,meta);card.append(nr,details,arrow);
      card.addEventListener('click',()=>{
        $('pricing-service').value=String(index);
        updatePricePanel();
      });
      cards.append(card);
    });
    $('service-disclaimer').hidden=!previewMode && !!site.published;
    syncPlanner();
    $('preview-notice').hidden=!!site.published;
    if(!site.booking_enabled){
      $('nizo-booking-form').hidden=true;
      $('phone-fallback').hidden=false;
      setNotice(tr('disabled'));
      observeReveals();
      return;
    }
    $('nizo-booking-form').hidden=false;
    $('phone-fallback').hidden=true;
    setNotice(tr('requestOnly'));
    const input=$('nizo-service'),previous=input.value;
    input.replaceChildren();input.add(new Option(tr('servicePick'),''));
    site.services.forEach(service=>{
      const cost=showPrice(service,false);
      input.add(new Option(service.name+' · '+service.duration_minutes+' min · '+cost,service.id));
    });
    if([...input.options].some(option=>option.value===previous))input.value=previous;
    observeReveals();
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
  function setupMotion(){
    if(!motionReduced && 'IntersectionObserver' in window){
      window.nizoRevealObserver=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('motion-in');window.nizoRevealObserver.unobserve(entry.target);}});
      },{rootMargin:'0px 0px -30px 0px',threshold:0.07});
    }
    const navLinks=[...document.querySelectorAll('.primary-nav a[href^="#"]')];
    const sections=[...document.querySelectorAll('main section[id]')];
    if('IntersectionObserver' in window){
      const activeObserver=new IntersectionObserver(entries=>{
        const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio);
        if(!visible.length)return;
        const current=visible[0].target.id;
        navLinks.forEach(link=>link.classList.toggle('nav-active',link.getAttribute('href')==='#'+current));
      },{rootMargin:'-25% 0px -50% 0px',threshold:[0,.1,.25]});
      sections.forEach(section=>activeObserver.observe(section));
    }
    const progress=$('reading-progress'),heroLogo=document.querySelector('.neon-on-wall');
    let queued=false;
    function paintScroll(){
      queued=false;
      const max=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
      progress.style.transform='scaleX('+Math.max(0,Math.min(1,window.scrollY/max))+')';
      if(!motionReduced&&heroLogo&&window.innerWidth>700){
        heroLogo.style.setProperty('--scroll-offset',Math.min(120,window.scrollY*.14)+'px');
      }
      document.querySelector('.site-header')?.classList.toggle('is-scrolled',window.scrollY>42);
    }
    window.addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(paintScroll);}}, {passive:true});
    paintScroll();
    const gallery=document.querySelector('.gallery-grid');
    const prev=$('gallery-prev'),next=$('gallery-next');
    if(gallery&&prev&&next){
      const advance=dir=>gallery.scrollBy({left:dir*Math.max(230,gallery.clientWidth*.62),behavior:motionReduced?'auto':'smooth'});
      prev.addEventListener('click',()=>advance(-1));
      next.addEventListener('click',()=>advance(1));
    }
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
    $('pricing-service').addEventListener('change',updatePricePanel);
    setupMotion();
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