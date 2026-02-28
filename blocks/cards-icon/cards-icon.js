import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Decorates the cards-icon block.
 * Expects 3 children per row: image, body, link (optional).
 * If the third child has a URL, the card is wrapped in an <a>; the link cell is not shown.
 *
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const outer = document.createElement('div');
  outer.classList.add('cards-icon-grid');
  [...block.children].forEach((row) => {
    const inner = document.createElement('div');
    inner.classList.add('cards-icon-card');
    moveInstrumentation(row, inner);
    while (row.firstElementChild) inner.append(row.firstElementChild);

    // Expect 3 children: image, body, link (optional)
    const [imageCell, bodyCell, linkCell] = inner.children;
    if (imageCell) imageCell.className = 'cards-icon-image';
    if (bodyCell) bodyCell.className = 'cards-icon-body';

    let url = null;
    if (linkCell) {
      const a = linkCell.querySelector('a[href]');
      if (a?.href) url = a.href;
      else {
        const text = linkCell.textContent?.trim();
        if (text && (text.startsWith('http') || text.startsWith('/'))) url = text;
      }
      linkCell.remove();
    }

    if (url) {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.classList.add('cards-icon-card-link');
      anchor.appendChild(inner);
      outer.append(anchor);
    } else {
      outer.append(inner);
    }
  });
  outer.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(outer);
}
