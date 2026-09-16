/* H791-pcb-screen-buttons-encoder.dxf, REV 08. Dimensions are millimeters.
 * CAD (X,Y) -> upright board (left,top): (26-Y, 41-X).
 * OLED means active display area; RGB diameters are proposed window sizes.
 */
(() => {
  const board = Object.freeze({ width: 52, height: 82 });
  const parts = Object.freeze([
    { selector: '.screen-bezel', x: 23, y: 6.5, width: 29.42, height: 14.7 },
    { selector: '.key-menu', x: 9.5, y: 12, width: 8, height: 6 },
    { selector: '.key-back', x: 9.5, y: 1, width: 8, height: 6 },
    { selector: '.key-mute', x: 11, y: -18.5, width: 6.5, height: 4.5 },
    { selector: '#side-wheel', x: 27, y: -21, width: 17, height: 17 },
    { selector: '#led-left', x: 34.5, y: 11.5, width: 2, height: 2 },
    { selector: '#led-right', x: 34.5, y: 1.5, width: 2, height: 2 },
  ].map(Object.freeze));

  function apply(card) {
    card.style.aspectRatio = `${board.width} / ${board.height}`;
    for (const part of parts) {
      const element = card.querySelector(part.selector);
      const left = board.width / 2 - part.y - part.width / 2;
      const top = board.height / 2 - part.x - part.height / 2;
      element.style.left = `${left / board.width * 100}%`;
      element.style.top = `${top / board.height * 100}%`;
      element.style.width = `${part.width / board.width * 100}%`;
      element.style.height = `${part.height / board.height * 100}%`;
      if (part.selector === '#side-wheel') {
        element.style.setProperty('--wheel-clip-start', `${(board.width - left) / part.width * 100}%`);
      }
    }
  }

  window.IHereHardwareLayout = Object.freeze({ revision: 'REV 08 + front-panel horizontal MENU/BACK', board, parts, apply });
  apply(document.querySelector('.ihere-card'));
})();
