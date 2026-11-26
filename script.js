// Tile reveal: one tile at a time, by hover (fine pointers), focus (keyboard)
// or a first tap (touch). A second tap — or a click on a revealed tile —
// opens the project.
(() => {
  const tiles = [...document.querySelectorAll('.tile')];
  let active = null;

  const show = (tile) => {
    if (active === tile) return;
    if (active) active.classList.remove('is-active');
    active = tile;
    if (tile) tile.classList.add('is-active');
  };

  tiles.forEach((tile) => {
    const link = tile.querySelector('.tile__link');

    let hideTimer = 0;
    tile.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      clearTimeout(hideTimer);
      // 8 — turn the tile the way the cursor came in (only while it's face-up)
      if (active !== tile) {
        const r = tile.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5;
        const dy = (e.clientY - r.top) / r.height - 0.5;
        tile.dataset.flip = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'right' : 'left') : (dy < 0 ? 'down' : 'up');
      }
      show(tile);
    });
    tile.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse' || active !== tile || tile.contains(document.activeElement)) return;
      // 7 — a short grace period, so crossing a gap doesn't flicker the tile
      hideTimer = setTimeout(() => { if (active === tile && !tile.matches(':hover')) show(null); }, 140);
    });

    // 11 — on touch, a light press tips the tile, hinting that it turns over
    tile.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch' || active === tile) return;
      tile.classList.add('is-pressed');
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) =>
      tile.addEventListener(type, () => tile.classList.remove('is-pressed')));

    tile.addEventListener('focusin', () => show(tile));
    tile.addEventListener('focusout', (e) => {
      if (!tile.contains(e.relatedTarget) && !tile.matches(':hover')) {
        if (active === tile) show(null);
      }
    });

    tile.addEventListener('click', (e) => {
      if (active !== tile) {
        // First tap reveals; it never navigates.
        e.preventDefault();
        if (!tile.dataset.flip || e.pointerType !== 'mouse') tile.dataset.flip = 'right';
        show(tile);
        return;
      }
      if (e.target !== link && !link.contains(e.target)) link.click();
    });
  });

  // Wander drift: each Wander tile starts at the matching Work tile's place
  // and size in the cluster and eases out to its own, wider position as the section
  // scrolls into view. With reduced motion, tiles simply sit in place.
  const workList = document.querySelector('.tiles--work');
  const wanderList = document.querySelector('.tiles--wander');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (workList && wanderList) {
    const work = [...workList.children];
    const wander = [...wanderList.children];
    let ticking = false;

    const measure = () => {
      wander.forEach((tile, i) => {
        const home = work[i];
        const dx = home ? home.offsetLeft - tile.offsetLeft : 0;
        const dy = home ? home.offsetTop - tile.offsetTop : 0;
        tile.style.setProperty('--dx', `${dx}px`);
        tile.style.setProperty('--dy', `${dy}px`);
        const ds = home && tile.offsetWidth ? home.offsetWidth / tile.offsetWidth : 1;
        tile.style.setProperty('--ds', ds.toFixed(4));
      });
    };

    const update = () => {
      ticking = false;
      if (still.matches) { wanderList.style.setProperty('--p', 1); return; }
      const vh = window.innerHeight;
      const top = wanderList.getBoundingClientRect().top;
      // Stays packed until the tiles are well in view (their top has risen
      // past 55% of the screen), then spreads over the next ~65% of a screen
      // of scrolling.
      const start = vh * 0.55, span = vh * 0.65;
      const t = Math.min(1, Math.max(0, (start - top) / span));
      const eased = t * t * (3 - 2 * t);
      wanderList.style.setProperty('--p', eased.toFixed(4));
    };

    const request = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };

    measure();
    update();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', () => { measure(); request(); });
    still.addEventListener('change', request);
    if (document.fonts) document.fonts.ready.then(() => { measure(); update(); });
  }

  // Tap elsewhere or press Escape to turn the tile back over.
  document.addEventListener('click', (e) => {
    if (active && !active.contains(e.target)) show(null);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && active) {
      const el = active;
      show(null);
      if (el.contains(document.activeElement)) document.activeElement.blur();
    }
  });
})();

// Tactile tiles & small motions: cursor light and tilt on tiles, Work tiles
// settling into place, and the Wander note writing itself out.
(() => {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  // 3 + 5 — light follows the cursor, the tile tilts toward it (desktop only).
  document.querySelectorAll('.tile').forEach((tile) => {
    let frame = 0;
    tile.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !finePointer.matches || still.matches) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = tile.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        tile.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        tile.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
        tile.style.setProperty('--glow', '1');
        tile.style.setProperty('--rx', `${((0.5 - y) * 7).toFixed(2)}deg`);
        tile.style.setProperty('--ry', `${((x - 0.5) * 7).toFixed(2)}deg`);
        tile.classList.add('is-tilting');
      });
    });
    tile.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame);
      tile.classList.remove('is-tilting');
      ['--glow', '--rx', '--ry'].forEach((p) => tile.style.removeProperty(p));
    });
  });

  if (!('IntersectionObserver' in window)) return;

  // 6 — Work tiles are laid one after another the first time Work is in view.
  const work = document.querySelector('.tiles--work');
  if (work && !still.matches) {
    [...work.children].forEach((t, i) => t.style.setProperty('--i', i));
    work.classList.add('is-waiting');
    new IntersectionObserver((entries, io) => {
      if (!entries.some((en) => en.isIntersecting)) return;
      work.classList.replace('is-waiting', 'is-laid');
      io.disconnect();
    }, { threshold: 0.2 }).observe(work);
  }

  // 7 — the handwritten note beside Wander writes itself out once.
  const note = document.querySelector('.scribble');
  if (note) {
    new IntersectionObserver((entries, io) => {
      if (!entries.some((en) => en.isIntersecting)) return;
      note.classList.add('is-written');
      io.disconnect();
    }, { rootMargin: '0px 0px -25% 0px' }).observe(note.closest('h2'));
  }
})();

// Landing screen, round 2: sticky header state, sparkle burst, rotating
// role phrase and layered cursor depth.
(() => {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  // 8 — the header gains a soft surface once the page has scrolled.
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // 5 — the sparkle after the name scatters a few tiny sparkles.
  const sparkBtn = document.querySelector('.spark-btn');
  if (sparkBtn) {
    sparkBtn.addEventListener('click', () => {
      if (still.matches) return;
      const r = sparkBtn.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const ns = 'http://www.w3.org/2000/svg';
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + Math.random() * 0.5;
        const d = 34 + Math.random() * 38;
        const bit = document.createElementNS(ns, 'svg');
        bit.setAttribute('class', 'spark-bit');
        bit.setAttribute('aria-hidden', 'true');
        bit.innerHTML = '<use href="#spark"/>';
        bit.style.left = `${cx}px`;
        bit.style.top = `${cy}px`;
        bit.style.setProperty('--bx', `${Math.cos(a) * d}px`);
        bit.style.setProperty('--by', `${Math.sin(a) * d}px`);
        const s = 6 + Math.random() * 8;
        bit.style.width = bit.style.height = `${s}px`;
        document.body.appendChild(bit);
        setTimeout(() => bit.remove(), 1000);
      }
    });
  }

  // 3 — the last phrase of the role rotates once, then settles back on the
  // title (under five seconds in all). Clicking the phrase cycles it again.
  const rot = document.querySelector('.rotator');
  if (rot) {
    const phrases = (rot.dataset.phrases || '').split('|').filter(Boolean);
    let i = 0, timer = 0;
    const swap = (to) => {
      rot.classList.add('is-out');
      setTimeout(() => { rot.textContent = phrases[to]; rot.classList.remove('is-out'); }, 260);
    };
    const runOnce = (delay) => {
      clearTimeout(timer);
      if (still.matches || phrases.length < 2) return;
      let step = 0;
      const next = () => {
        step++;
        i = step % phrases.length;
        swap(i);
        if (step < phrases.length) timer = setTimeout(next, 1550);
      };
      timer = setTimeout(next, delay);
    };
    const seen = document.documentElement.classList.contains('seen');
    runOnce(seen ? 1600 : 3200);
    rot.addEventListener('click', () => runOnce(0));
  }

  // 4 — layered depth: decorations drift a few pixels with the cursor.
  const hero = document.querySelector('.intro');
  if (hero) {
    let frame = 0;
    hero.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !finePointer.matches || still.matches) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = hero.getBoundingClientRect();
        hero.style.setProperty('--px', (((e.clientX - r.left) / r.width) - 0.5).toFixed(3));
        hero.style.setProperty('--py', (((e.clientY - r.top) / r.height) - 0.5).toFixed(3));
      });
    });
    hero.addEventListener('pointerleave', () => {
      hero.style.removeProperty('--px');
      hero.style.removeProperty('--py');
    });
  }
})();

// 2 — hand-laid imperfection: each tile gets a tiny, stable rotation, a slight
// shade shift and a worn spot, as real pressed tiles do.
(() => {
  const rand = (seed) => { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); };
  document.querySelectorAll('.tile').forEach((tile, i) => {
    const a = rand(i + 1), b = rand(i + 11), c = rand(i + 21), d = rand(i + 31);
    tile.style.setProperty('--rz', `${((a - 0.5) * 1.2).toFixed(2)}deg`);
    tile.style.setProperty('--shade', (0.97 + b * 0.06).toFixed(3));
    tile.style.setProperty('--wx', `${Math.round(c * 100)}%`);
    tile.style.setProperty('--wy', `${d < 0.5 ? 4 : 96}%`);
  });
})();
