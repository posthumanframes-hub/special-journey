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
