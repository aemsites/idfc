import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Returns the first picture or img element from a cell's inner content.
 * @param {HTMLElement} cell
 * @returns {HTMLPictureElement|HTMLImageElement|null}
 */
function getCellPicture(cell) {
  if (!cell) return null;
  const inner = cell.querySelector('div') || cell;
  return inner.querySelector('picture') || inner.querySelector('img') || null;
}

/**
 * Returns trimmed text content of a cell.
 * @param {HTMLElement} cell
 * @returns {string}
 */
function getCellText(cell) {
  if (!cell) return '';
  return (cell.querySelector('div') || cell).textContent?.trim() || '';
}

/**
 * Returns the first anchor element from a cell.
 * @param {HTMLElement} cell
 * @returns {HTMLAnchorElement|null}
 */
function getCellLink(cell) {
  if (!cell) return null;
  return (cell.querySelector('div') || cell).querySelector('a[href]') || null;
}

/**
 * Appends a cloned picture/img into a .cards-icon-image wrapper on the card.
 * @param {HTMLElement} cardItem
 * @param {HTMLPictureElement|HTMLImageElement|null} pic
 * @param {string} altText
 */
function appendImage(cardItem, pic, altText) {
  if (!pic) return;
  const wrap = document.createElement('div');
  wrap.className = 'cards-icon-image';
  const cloned = pic.cloneNode(true);
  const img = cloned.tagName === 'IMG' ? cloned : cloned.querySelector('img');
  if (img && altText) img.alt = altText;
  wrap.appendChild(cloned);
  cardItem.appendChild(wrap);
}

/**
 * Appends cloned child elements from a cell into a .cards-icon-body wrapper on the card.
 * @param {HTMLElement} cardItem
 * @param {HTMLElement} cell
 */
function appendBody(cardItem, cell) {
  if (!cell) return;
  const inner = cell.querySelector('div') || cell;
  if (!inner.children.length && !inner.textContent.trim()) return;
  const wrap = document.createElement('div');
  wrap.className = 'cards-icon-body';
  if (inner.children.length) {
    [...inner.children].forEach((child) => wrap.appendChild(child.cloneNode(true)));
  } else {
    const p = document.createElement('p');
    p.textContent = inner.textContent.trim();
    wrap.appendChild(p);
  }
  cardItem.appendChild(wrap);
}

/**
 * Makes a card fully clickable and navigable by keyboard.
 * Hides the original anchor visually while preserving accessibility.
 * @param {HTMLElement} cardItem
 * @param {HTMLAnchorElement} link
 */
function makeClickable(cardItem, link) {
  if (!link?.href) return;
  cardItem.classList.add('cards-icon-clickable');
  cardItem.setAttribute('role', 'link');
  cardItem.setAttribute('tabindex', '0');

  // Keep the link accessible but visually hidden so the card surface is the click target
  const btnContainer = link.closest('.button-container');
  (btnContainer || link).classList.add('sr-only');

  cardItem.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    e.preventDefault();
    window.location.href = link.href;
  });
  cardItem.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      window.location.href = link.href;
    }
  });
}

/**
 * Builds a single card element from a table row.
 *
 * Supported row formats (from authoring):
 *   4-cell (UE): image | imageAlt | text | cardlink
 *   2-cell (doc): image | text  (link embedded in text cell)
 *   1-cell: text only (link embedded)
 *
 * @param {HTMLElement} row
 * @returns {HTMLElement|null}
 */
function buildCard(row) {
  const cells = [...row.children];
  if (!cells.length) return null;

  const cardItem = document.createElement('div');
  cardItem.classList.add('cards-icon-card');
  moveInstrumentation(row, cardItem);
  cardItem.removeAttribute('data-aue-prop');
  cardItem.setAttribute('data-aue-type', 'container');
  cardItem.setAttribute('data-aue-label', 'Card');

  let link;
  if (cells.length >= 4) {
    // UE format: image | imageAlt | text | cardlink
    appendImage(cardItem, getCellPicture(cells[0]), getCellText(cells[1]));
    appendBody(cardItem, cells[2]);
    link = getCellLink(cells[3]) || cardItem.querySelector('a[href]');
  } else if (cells.length >= 2) {
    // Document format: image | content (link may be embedded in content)
    appendImage(cardItem, getCellPicture(cells[0]), '');
    appendBody(cardItem, cells[1]);
    link = cardItem.querySelector('a[href]');
  } else {
    // Single cell: all content together
    appendBody(cardItem, cells[0]);
    link = cardItem.querySelector('a[href]');
  }

  makeClickable(cardItem, link);
  return cardItem;
}

/**
 * Replaces raw <picture> elements with optimized variants via createOptimizedPicture.
 * @param {HTMLElement} container
 */
function optimizeImages(container) {
  container.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    const optimizedImg = optimizedPic.querySelector('img');
    moveInstrumentation(img, optimizedImg);
    const w = img.getAttribute('width');
    const h = img.getAttribute('height');
    if (w && h) {
      optimizedImg.setAttribute('width', w);
      optimizedImg.setAttribute('height', h);
    }
    img.closest('picture').replaceWith(optimizedPic);
  });
}

/**
 * Decorates the cards-icon block.
 *
 * Variants (applied as CSS classes on the block element):
 *   image-left        – icon on left, no card border/background (default)
 *   important-documents – icon on top, centered grid cards
 *   related-search    – icon on left with right-side arrow indicator
 *
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  let rows = [...block.children];

  // Unwrap a single container div injected by UE (block-content / default-content wrapper)
  if (rows.length === 1) {
    const single = rows[0];
    if (
      single.classList.contains('default-content')
      || single.classList.contains('block-content')
    ) {
      rows = [...single.children];
    }
  }

  block.setAttribute('data-aue-type', 'container');
  block.setAttribute('data-aue-label', 'Cards Icon');

  const grid = document.createElement('div');
  grid.classList.add('cards-icon-grid');

  rows.forEach((row) => {
    const card = buildCard(row);
    if (card) grid.appendChild(card);
  });

  optimizeImages(grid);
  block.replaceChildren(grid);
}
