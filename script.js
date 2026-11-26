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
      // 0 when the group's top meets the bottom of the screen,
      // 1 once it has risen to a fifth of the way down.
      const t = Math.min(1, Math.max(0, (vh - top) / (vh * 0.8)));
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
