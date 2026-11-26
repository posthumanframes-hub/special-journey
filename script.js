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

    tile.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') show(tile);
    });
    tile.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && active === tile && !tile.contains(document.activeElement)) show(null);
    });

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
