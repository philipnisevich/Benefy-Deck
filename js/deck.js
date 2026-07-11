/* ============================================================
   Benefy Deck — presentation engine
   ------------------------------------------------------------
   • One click per slide — every slide shows all its content at
     once, with a staggered entrance ([data-step] = stagger order).
   • Shared-number morph: when two adjacent slides carry a matching
     [data-morph] number with [data-count], advancing between them
     keeps the number fixed in place and counts its digits up/down,
     while [data-swap] captions slide horizontally (old out, new in).
     This is the "everything stays in place and just changes" effect.
   • window.Deck exposes next/prev/goto for scripting.
   ============================================================ */
(() => {
  const deck = document.querySelector('.deck');
  const slides = Array.from(document.querySelectorAll('.slide'));
  const progress = document.querySelector('.progress');
  const pageno = document.querySelector('.pageno');
  const hint = document.querySelector('.hint');
  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let index = 0;
  let busy = false;               // locked while a morph is playing

  /* ---------- staggered entrance delays ---------- */
  slides.forEach(slide => {
    slide.querySelectorAll('[data-step]').forEach(el => {
      el.style.setProperty('--sd', (+el.dataset.step || 0) * 90 + 'ms');
    });
    // On non-morph entrance, count [data-count] numbers up from zero.
    slide.querySelectorAll('[data-split="words"]').forEach(el => splitWords(el));
  });

  function splitWords(el) {
    const parts = el.textContent.split(/(\s+)/);
    el.textContent = '';
    let i = 0;
    parts.forEach(chunk => {
      if (chunk.trim() === '') { el.appendChild(document.createTextNode(chunk)); return; }
      const s = document.createElement('span');
      s.className = 'word';
      s.style.setProperty('--i', i++);
      s.textContent = chunk;
      el.appendChild(s);
    });
  }

  /* ---------- number formatting + tween ---------- */
  function fmtNum(v, fmt) {
    const s = Math.round(v).toLocaleString('en-US');
    if (fmt === 'dollar') return '$' + s;
    if (fmt === 'percent') return s + '%';
    return s;
  }

  function countTween(el, from, to, fmt, dur = 1250) {
    if (el._raf) cancelAnimationFrame(el._raf);
    if (reduceMotion) { el.textContent = fmtNum(to, fmt); return; }
    const t0 = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 3);          // easeOutCubic
    const frame = now => {
      const t = Math.min(1, (now - t0) / dur);
      el.textContent = fmtNum(from + (to - from) * ease(t), fmt);
      if (t < 1) el._raf = requestAnimationFrame(frame);
      else { el.textContent = fmtNum(to, fmt); el._raf = null; }
    };
    el._raf = requestAnimationFrame(frame);
  }

  /* ---------- morph detection ---------- */
  const numberOf = slide => slide.querySelector('[data-morph][data-count]');
  function isMorphPair(a, b) {
    const na = numberOf(a), nb = numberOf(b);
    return !!(na && nb && na.dataset.morph === nb.dataset.morph);
  }

  /* ---------- the in-place morph transition ---------- */
  function morphTransition(oldSlide, newSlide, dir) {
    busy = true;
    deck.classList.add('morphing');

    const oldNum = numberOf(oldSlide);
    const newNum = numberOf(newSlide);
    const X = 64 * dir;   // forward: old exits left (-), new enters from right (+)

    // Seed the new number at the OLD value before it's shown, so the final
    // value never flashes for a frame, then activate the new slide (its
    // entrance stagger is suppressed by .morphing, so it won't re-fire when
    // the morph ends and we simply drop the .morphing class).
    newNum.textContent = fmtNum(+oldNum.dataset.count, newNum.dataset.format);
    applyActive(newSlide, false);      // no entrance replay — the count carries it

    // Both slides visible, no fade, no vertical entrance — full manual control.
    [oldSlide, newSlide].forEach(s => {
      s.style.opacity = '1';
      s.style.visibility = 'visible';
      s.style.pointerEvents = 'none';
    });
    newSlide.style.zIndex = '2';
    oldSlide.style.zIndex = '1';

    // The number stays put: hide the old one (identical position) and climb
    // the new one's digits from the old value to the new.
    oldNum.style.opacity = '0';
    countTween(newNum, +oldNum.dataset.count, +newNum.dataset.count, newNum.dataset.format);

    // Captions swap horizontally.
    newSlide.querySelectorAll('[data-swap]').forEach((el, i) => {
      el.animate(
        [{ transform: `translateX(${X}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 640, delay: i * 55, easing: EASE, fill: 'both' }
      );
    });
    oldSlide.querySelectorAll('[data-swap]').forEach(el => {
      el.animate(
        [{ transform: 'none', opacity: 1 }, { transform: `translateX(${-X}px)`, opacity: 0 }],
        { duration: 480, easing: EASE, fill: 'both' }
      );
    });

    // Finalize: hand control back to the class-based state.
    clearTimeout(morphTransition._t);
    morphTransition._t = setTimeout(() => {
      deck.classList.remove('morphing');
      [oldSlide, newSlide].forEach(s => {
        s.querySelectorAll('[data-swap]').forEach(el => el.getAnimations().forEach(a => a.cancel()));
        s.style.opacity = s.style.visibility = s.style.pointerEvents = s.style.zIndex = '';
      });
      oldNum.style.opacity = '';
      busy = false;
    }, 760);
  }

  /* ---------- activation ---------- */
  // enter=true replays the staggered entrance (plain transitions / boot);
  // morph targets activate WITHOUT it, so their number just counts.
  function applyActive(slide, enter = false) {
    slides.forEach(s => {
      s.classList.toggle('is-active', s === slide);
      if (s !== slide) s.classList.remove('enter');
    });
    if (enter) {
      slide.classList.remove('enter');
      void slide.offsetWidth;          // force reflow so the animation restarts
      slide.classList.add('enter');
    }
  }

  function updateChrome() {
    progress.style.width = `${index / (slides.length - 1) * 100}%`;
    pageno.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    document.body.classList.toggle('title-slide-active', slides[index].dataset.kind === 'title');
    if (location.hash !== '#' + (index + 1)) history.replaceState(null, '', '#' + (index + 1));
  }

  function go(target, dir) {
    if (busy || target === index || target < 0 || target > slides.length - 1) return;
    const oldSlide = slides[index];
    const newSlide = slides[target];
    const morph = Math.abs(target - index) === 1 && isMorphPair(oldSlide, newSlide);
    index = target;
    if (morph) {
      morphTransition(oldSlide, newSlide, dir);
    } else {
      applyActive(newSlide, true);     // normal staggered entrance; no count-up
    }
    updateChrome();
  }

  const next = () => go(index + 1, 1);
  const prev = () => go(index - 1, -1);
  const goto = i => go(i, i > index ? 1 : -1);

  /* ---------- input ---------- */
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown':
        e.preventDefault(); next(); dismissHint(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
        e.preventDefault(); prev(); break;
      case 'Home': goto(0); break;
      case 'End': goto(slides.length - 1); break;
      case 'f': case 'F': toggleFullscreen(); break;
      default: if (/^[1-9]$/.test(e.key)) goto(+e.key - 1);
    }
  });

  deck.addEventListener('click', (e) => {
    if (e.target.closest('.controls') || e.target.closest('a')) return;
    (e.clientX > window.innerWidth / 2 ? next : prev)();
    dismissHint();
  });

  let tx = 0;
  deck.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  deck.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
  }, { passive: true });

  document.querySelector('[data-nav="prev"]')?.addEventListener('click', prev);
  document.querySelector('[data-nav="next"]')?.addEventListener('click', () => { next(); dismissHint(); });
  document.querySelector('[data-nav="full"]')?.addEventListener('click', toggleFullscreen);

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  let hintTimer;
  function dismissHint() { hint?.classList.add('is-hidden'); clearTimeout(hintTimer); }
  hintTimer = setTimeout(dismissHint, 4200);

  window.addEventListener('hashchange', () => {
    const n = parseInt(location.hash.slice(1), 10);
    if (!isNaN(n) && n - 1 !== index) goto(n - 1);
  });

  /* ---------- boot ---------- */
  const start = parseInt(location.hash.slice(1), 10);
  index = (!isNaN(start) && start >= 1 && start <= slides.length) ? start - 1 : 0;
  applyActive(slides[index], true);
  updateChrome();

  window.Deck = { next, prev, goto, get index() { return index; } };
})();
