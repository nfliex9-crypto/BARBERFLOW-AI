/* BARBER NIZO / real page-cut transition.
 * The entire visible viewport is duplicated into TWO clipped page sheets.
 * The scissors cut along the seam; both physical-looking page halves then
 * separate to reveal the live booking section underneath.
 * Decorative only: reduced-motion, missing canvas, and failures fall back.
 */
(() => {
  'use strict';
  if (window.__nizoSplitCutInstalled) return;
  window.__nizoSplitCutInstalled = true;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = false;

  function bookingTarget() {
    const section = document.getElementById('booking');
    if (!section) return;
    section.scrollIntoView({ behavior: 'instant', block: 'start' });
    history.replaceState(null, '', '#booking');
    const h = document.getElementById('booking-heading') || section;
    if (!h.hasAttribute('tabindex')) h.tabIndex = -1;
    h.focus({ preventScroll: true });
  }

  function copyVisiblePage() {
    const container = document.createElement('div');
    container.className = 'nizo-cut-snapshot';
    const width = window.innerWidth;
    const height = window.innerHeight;
    for (const node of [...document.body.children]) {
      if (node.id === 'scissor-overlay' || node.id === 'scroll-progress') continue;
      if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') continue;
      const rect = node.getBoundingClientRect();
      if (rect.bottom < -2 || rect.top > height + 2 || rect.width <= 0 || rect.height <= 0) continue;
      // Only clone visible, on-screen roots; no network calls, no image scraping.
      const copy = node.cloneNode(true);
      copy.style.position = 'absolute';
      copy.style.left = Math.round(rect.left) + 'px';
      copy.style.top = Math.round(rect.top) + 'px';
      copy.style.width = Math.round(rect.width) + 'px';
      copy.style.height = Math.round(rect.height) + 'px';
      copy.style.margin = '0';
      copy.style.maxWidth = 'none';
      copy.style.transform = 'none';
      copy.style.animation = 'none';
      copy.querySelectorAll('[id]').forEach(child => child.removeAttribute('id'));
      copy.removeAttribute('id');
      copy.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
      copy.querySelectorAll('video').forEach(video => { video.pause(); video.removeAttribute('autoplay'); });
      container.append(copy);
    }
    container.style.width = width + 'px';
    return container;
  }

  function makeHalf(kind) {
    const half = document.createElement('div');
    half.className = 'nizo-page-half nizo-page-' + kind;
    half.append(copyVisiblePage());
    return half;
  }

  function playSplit() {
    if (active) return;
    if (reduce.matches || !window.requestAnimationFrame ||
        !window.CSS || !CSS.supports('clip-path', 'polygon(0 0,100% 0,100% 50%,0 50%)')) {
      bookingTarget();
      return;
    }
    active = true;
    const overlay = document.getElementById('scissor-overlay');
    const scissors = document.getElementById('scissor-icon');
    const line = overlay.querySelector('.cut-line');
    const flash = overlay.querySelector('.cut-flash');
    const canvas = document.getElementById('hair-canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) { active = false; bookingTarget(); return; }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const centerY = height * 0.50;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const top = makeHalf('top');
    const bottom = makeHalf('bottom');
    overlay.insertBefore(bottom, overlay.firstChild);
    overlay.insertBefore(top, overlay.firstChild);
    overlay.hidden = false;
    document.body.classList.add('nizo-page-cutting');
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const clipCount = Math.min(45, Math.max(19, Math.floor(width / 25)));
    const hair = Array.from({ length: clipCount }, (_, i) => ({
      at: (i + .5) / clipCount,
      len: 4 + (i * 7) % 9,
      curve: Math.sin(i * 3.14) * 9,
      lift: 20 + (i * 19) % 55,
      color: i % 4 ? '#bba5ca' : '#d6fd50'
    }));
    const start = performance.now();
    const total = 1380;
    let bookingShown = false;
    let frame = 0;
    let done = false;
    function finish() {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      top.remove();
      bottom.remove();
      ctx.clearRect(0, 0, width, height);
      overlay.hidden = true;
      line.style.transform = '';
      scissors.style.transform = '';
      scissors.style.opacity = '';
      flash.style.opacity = '';
      document.body.classList.remove('nizo-page-cutting');
      active = false;
      if (!bookingShown) bookingTarget();
    }
    const onPageHide = () => finish();
    window.addEventListener('pagehide', onPageHide, { once: true });
    const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    function frameLoop(now) {
      if (done) return;
      const p = Math.min(1, (now - start) / total);
      // Phase 1: the scissors cross the actual screenshot's full width.
      const crossing = ease(Math.min(1, p / .55));
      const splitProgress = ease(Math.max(0, Math.min(1, (p - .49) / .49)));
      const x = -115 + (width + 240) * crossing;
      const bladeSwing = Math.sin(p * 43) * 12;
      scissors.style.transform = 'translate3d(' + x + 'px,' +
        (centerY - 70) + 'px,0) rotate(' + (-10 + bladeSwing) + 'deg)';
      scissors.style.opacity = p > .61 ? String(Math.max(0, 1 - (p - .61) * 10)) : '1';
      scissors.style.setProperty('--blade-angle', (Math.sin(p * 45) * 18) + 'deg');
      line.style.transform = 'translate3d(0,' + centerY + 'px,0) scaleX(' + crossing + ')';
      // Phase 2: separate the actual page's two independently cloned halves.
      top.style.transform = 'translate3d(0,' + (-splitProgress * height * .67) +
        'px,0) rotate(' + (-splitProgress * 1.5) + 'deg)';
      bottom.style.transform = 'translate3d(0,' + (splitProgress * height * .68) +
        'px,0) rotate(' + (splitProgress * 1.2) + 'deg)';
      const flicker = Math.max(0, 1 - Math.abs(p - .57) * 14);
      flash.style.opacity = String(flicker * .28);
      ctx.clearRect(0, 0, width, height);
      hair.forEach((strand, i) => {
        const age = (crossing - strand.at) * 4;
        if (age < 0 || age > 1) return;
        const px = strand.at * width + Math.sin(i + age * 6) * age * 22;
        const py = centerY + strand.curve + age * age * strand.lift *
          (i % 2 ? 1 : -1);
        ctx.save();
        ctx.globalAlpha = .85 * (1 - age);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = strand.color;
        ctx.translate(px, py);
        ctx.rotate(age * 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(strand.len / 2, -4, strand.len, 0);
        ctx.stroke();
        ctx.restore();
      });
      // The new booking section becomes visible BEHIND the separating sheets.
      if (p > .56 && !bookingShown) {
        bookingShown = true;
        bookingTarget();
      }
      if (p < 1) frame = requestAnimationFrame(frameLoop);
      else finish();
    }
    frame = requestAnimationFrame(frameLoop);
  }

  document.addEventListener('click', event => {
    const a = event.target.closest('a[href="#booking"]');
    if (!a || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    try { playSplit(); }
    catch (error) {
      document.querySelectorAll('.nizo-page-half').forEach(el => el.remove());
      const overlay = document.getElementById('scissor-overlay');
      if (overlay) overlay.hidden = true;
      document.body.classList.remove('nizo-page-cutting');
      active = false;
      bookingTarget();
    }
  });
})();
