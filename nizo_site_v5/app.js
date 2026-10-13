(() => {'use strict';
const $=id=>document.getElementById(id),reduce=matchMedia('(prefers-reduced-motion: reduce)');
const words={nl:{home:'HOME',services:'SERVICES',gallery:'GALLERY',hours:'OPENINGSUREN',contact:'CONTACT',book:'AFSPRAAK MAKEN',heroDescription:'Fresh fades, scherpe lijnen en de juiste vibe. Jouw look begint bij BARBER NIZO.',explore:'BEKIJK ONS WERK',servicesIntro:'Kies jouw stijl. De onderstaande prijzen zijn voorbeelden en worden nog door de eigenaar bevestigd.',priceNote:'* Voorstelprijzen ter illustratie, geen officiële prijslijst. Laat de eigenaar prijzen en behandelingen bevestigen.',story:'Nauwkeurig werk, een frisse vibe en een look die bij je past. Bij BARBER NIZO draait het om details — van de eerste lijn tot de laatste finish.',bookingMessage:'Kies je dienst, datum en beschikbare tijd. De kapper bevestigt persoonlijk.',call:'BEL OM TE BOEKEN',closed:'GESLOTEN'},en:{home:'HOME',services:'SERVICES',gallery:'GALLERY',hours:'OPENING HOURS',contact:'CONTACT',book:'BOOK NOW',heroDescription:'Fresh fades, sharp details and the right vibe. Your look begins at BARBER NIZO.',explore:'EXPLORE OUR WORK',servicesIntro:'Choose your style. These example prices have not yet been confirmed by the owner.',priceNote:'* Example prices only, not the official price list. The owner must verify the rates and services.',story:'Precision, good energy and a look that suits you. At BARBER NIZO the details matter, from first line to final touch.',bookingMessage:'Request a time online; the barber must confirm your appointment.',call:'CALL TO BOOK',closed:'CLOSED'},fr:{home:'ACCUEIL',services:'SERVICES',gallery:'GALERIE',hours:'HORAIRES',contact:'CONTACT',book:'PRENDRE RENDEZ-VOUS',heroDescription:'Des dégradés impeccables, des lignes précises et la bonne ambiance. Votre style commence chez BARBER NIZO.',explore:'VOIR NOTRE TRAVAIL',servicesIntro:'Choisissez votre style. Les prix présentés ne sont pas encore confirmés par le propriétaire.',priceNote:'* Prix indicatifs non officiels. Le propriétaire doit confirmer les tarifs et prestations.',story:'Un travail de précision, une bonne ambiance et un style qui vous ressemble. Chez BARBER NIZO, chaque détail compte.',bookingMessage:'Choisissez un créneau en ligne. Le salon confirmera votre demande.',call:'APPELER POUR RÉSERVER',closed:'FERMÉ'}};
const dayNames={nl:['Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag','Zondag'],en:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],fr:['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche']};
const setLanguage=lang=>{const dict=words[lang]||words.nl;document.documentElement.lang=lang;document.querySelectorAll('[data-tr]').forEach(el=>{const key=el.dataset.tr;if(dict[key])el.textContent=dict[key]});document.querySelectorAll('.hours-table>div').forEach((row,i)=>{row.firstElementChild.textContent=dayNames[lang][i]||dayNames.nl[i]});};
$('language').addEventListener('change',e=>setLanguage(e.target.value));setLanguage('nl');$('year').textContent=new Date().getFullYear();
$('menu-toggle').addEventListener('click',()=>{const expanded=$('menu-toggle').getAttribute('aria-expanded')==='true';$('menu-toggle').setAttribute('aria-expanded',String(!expanded));$('navlinks').classList.toggle('open',!expanded)});
document.querySelectorAll('.navlinks a').forEach(a=>a.addEventListener('click',()=>{$('navlinks').classList.remove('open');$('menu-toggle').setAttribute('aria-expanded','false')}));
let rafRequested=false;const onScroll=()=>{rafRequested=false;const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);$('scroll-progress').style.transform=`scaleX(${Math.min(1,Math.max(0,scrollY/max))})`;document.querySelector('.nav').classList.toggle('scrolled',scrollY>35);if(!reduce.matches&&innerWidth>700){document.querySelector('.hero-neon').style.setProperty('--hero-shift',Math.min(110,scrollY*.13)+'px')}};
addEventListener('scroll',()=>{if(!rafRequested){rafRequested=true;requestAnimationFrame(onScroll)}},{passive:true});onScroll();
if('IntersectionObserver' in window&&!reduce.matches){const o=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');o.unobserve(e.target)}}),{threshold:.12});document.querySelectorAll('.reveal').forEach(x=>{x.classList.add('will-animate');o.observe(x)})}else document.querySelectorAll('.reveal').forEach(x=>x.classList.add('visible'));
const track=$('gallery-track');$('gallery-prev').addEventListener('click',()=>track.scrollBy({left:-track.clientWidth*.72,behavior:reduce.matches?'auto':'smooth'}));$('gallery-next').addEventListener('click',()=>track.scrollBy({left:track.clientWidth*.72,behavior:reduce.matches?'auto':'smooth'}));
// Keep the sticky mobile booking action out of the hero and off the form.
// Safari must never display two giant calls to action at the same time.
const stickyBooking=document.querySelector('.mobile-book');
const heroSection=document.querySelector('.hero');
const bookingSection=document.querySelector('#booking');
if(stickyBooking&&heroSection&&bookingSection){
  const sections={hero:true,booking:false};
  const syncSticky=()=>{
    const onSmallScreen=window.matchMedia('(max-width:700px)').matches;
    stickyBooking.classList.toggle('is-visible',onSmallScreen&&!sections.hero&&!sections.booking);
  };
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(entry.target===heroSection)sections.hero=entry.isIntersecting;
        if(entry.target===bookingSection)sections.booking=entry.isIntersecting;
      }
      syncSticky();
    },{threshold:0.01});
    observer.observe(heroSection);observer.observe(bookingSection);
  }else{
    const inspect=()=>{
      const h=heroSection.getBoundingClientRect(),b=bookingSection.getBoundingClientRect();
      sections.hero=h.bottom>0&&h.top<innerHeight;
      sections.booking=b.bottom>0&&b.top<innerHeight;
      syncSticky();
    };
    window.addEventListener('scroll',inspect,{passive:true});inspect();
  }
  window.addEventListener('resize',syncSticky,{passive:true});syncSticky();
}

// The independent page-cut.js module owns the booking transition.

})();
