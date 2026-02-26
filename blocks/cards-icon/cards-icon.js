import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Cards-icon block: Important Documents, Related Search, and Image and Title variants only.
 * No Swiper carousel; grid layout only.
 * Card row: 6 cells - image, imageAlt, card-tag, card_text, card_link, card_linkText.
 */

function getCellValue(cell) {
  if (!cell) return '';
  const inner = cell.querySelector('div') || cell;
  const img = inner.querySelector?.('img') || (inner.tagName === 'IMG' ? inner : null);
  if (img?.src) return img.src;
  const a = inner.querySelector?.('a[href]');
  if (a?.href) return a.href;
  const t = inner.textContent?.trim();
  return t || '';
}

function getCellPictureOrImg(cell) {
  if (!cell) return null;
  const inner = cell.querySelector('div') || cell;
  return inner.querySelector?.('picture') || inner.querySelector?.('img') || null;
}

function appendCellContentAs(cardItem, cell, wrapperClass) {
  const inner = cell?.querySelector('div') || cell;
  if (!inner || !inner.children.length) return;
  const wrap = document.createElement('div');
  wrap.className = wrapperClass;
  [...inner.children].forEach((child) => wrap.appendChild(child.cloneNode(true)));
  cardItem.appendChild(wrap);
}

function appendArrowIcon(cardBody) {
  if (cardBody.querySelector('.icon-arrow-right-white')) return;
  const arrowP = document.createElement('p');
  const arrowSpan = document.createElement('span');
  arrowSpan.className = 'icon icon-arrow-right-white';
  const arrowImg = document.createElement('img');
  arrowImg.setAttribute('data-icon-name', 'arrow-right-white');
  arrowImg.src = '/icons/arrow-right-white.svg';
  arrowImg.alt = 'arrow-right-white';
  arrowImg.loading = 'lazy';
  arrowSpan.appendChild(arrowImg);
  arrowP.appendChild(arrowSpan);
  cardBody.appendChild(arrowP);
}

function setupCardInteractivity(cardItem, shouldAddArrow = false) {
  const cardBodies = cardItem.querySelectorAll('.cards-card-body');
  if (cardBodies.length === 0) return;

  const mainBody = cardBodies[0];
  const cardLink = cardItem.querySelector('a[href]');
  if (!cardLink) return;

  cardItem.classList.add('card-clickable');
  cardItem.setAttribute('role', 'link');
  cardItem.setAttribute('tabindex', '0');

  const handleClick = (e) => {
    if (e.target.closest('a')) return;
    e.preventDefault();
    cardLink.click();
  };

  cardItem.addEventListener('click', handleClick);
  cardItem.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      cardLink.click();
    }
  });

  let buttonContainer = cardLink.closest('.button-container');
  if (!buttonContainer) {
    buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';
    cardLink.parentNode.insertBefore(buttonContainer, cardLink);
    buttonContainer.appendChild(cardLink);
  }
  buttonContainer.classList.add('sr-only');

  if (shouldAddArrow) appendArrowIcon(mainBody);
}

/**
 * Builds a card from 6 cells (image, imageAlt, card-tag, card_text, card_link, card_linkText).
 */
function buildCardFromSixCells(row) {
  const cardItem = document.createElement('div');
  cardItem.classList.add('cards-card');
  moveInstrumentation(row, cardItem);

  const cells = [...row.children];
  if (cells.length < 6) return cardItem;

  // cells[0]: image
  const pic = getCellPictureOrImg(cells[0]);
  if (pic) {
    const imageWrap = document.createElement('div');
    imageWrap.className = 'cards-card-image';
    const cloned = pic.cloneNode(true);
    const alt = (cells[1] && getCellValue(cells[1])) || '';
    if (alt && cloned.tagName === 'IMG') cloned.alt = alt;
    if (cloned.tagName === 'PICTURE' && cloned.querySelector('img')) {
      cloned.querySelector('img').alt = alt;
    }
    imageWrap.appendChild(cloned);
    cardItem.appendChild(imageWrap);
  }
  // cells[2]: card-tag
  appendCellContentAs(cardItem, cells[2], 'cards-card-tag');
  // cells[3]: card_text (main body)
  appendCellContentAs(cardItem, cells[3], 'cards-card-body');
  // cells[4]: card_link, cells[5]: card_linkText (optional override)
  const linkEl = (cells[4]?.querySelector('div') || cells[4])?.querySelector?.('a[href]');
  const linkTextOverride = cells[5] ? getCellValue(cells[5]) : '';
  if (linkEl && linkEl.href) {
    const btnWrap = document.createElement('p');
    btnWrap.className = 'button-container';
    const a = linkEl.cloneNode(true);
    if (linkTextOverride) a.textContent = linkTextOverride;
    btnWrap.appendChild(a);
    const body = cardItem.querySelector('.cards-card-body');
    (body || cardItem).appendChild(btnWrap);
  }
  return cardItem;
}

export default async function decorate(block) {
  const { classList } = block;
  const isImportantDocuments = classList.contains('important-documents');
  const isRelatedSearch = classList.contains('related-search');

  const rows = [...block.children];
  const cardRows = rows;

  const cardsContainer = document.createElement('div');
  cardsContainer.classList.add('grid-cards');

  cardRows.forEach((row, rowIndex) => {
    const numCells = row.querySelectorAll(':scope > div').length || row.children.length;
    if (numCells === 6) {
      const cardItem = buildCardFromSixCells(row);
      cardsContainer.append(cardItem);
    } else {
      // eslint-disable-next-line no-console
      console.error(
        'Cards-icon block: card row has unexpected number of cells (expected 6, got %d). Row index: %d.',
        numCells,
        rowIndex,
      );
    }
  });

  const getStaticImageDimensions = () => {
    if (isImportantDocuments) return { width: 175, height: 175 };
    return null;
  };

  cardsContainer.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    const optimizedImg = optimizedPic.querySelector('img');
    moveInstrumentation(img, optimizedImg);

    const width = img.getAttribute('width');
    const height = img.getAttribute('height');
    if (width && height) {
      optimizedImg.setAttribute('width', width);
      optimizedImg.setAttribute('height', height);
    } else {
      const staticSize = getStaticImageDimensions();
      if (staticSize) {
        optimizedImg.setAttribute('width', staticSize.width);
        optimizedImg.setAttribute('height', staticSize.height);
      }
    }

    img.closest('picture').replaceWith(optimizedPic);
  });

  block.replaceChildren(cardsContainer);

  const allCards = cardsContainer.querySelectorAll('.cards-card');

  allCards.forEach((cardItem) => {
    if (isImportantDocuments) {
      cardItem.classList.add('important-documents-card');
    } else if (isRelatedSearch) {
      cardItem.classList.add('benefit-cards');
    }
    // image-and-title: no extra card class

    const shouldAddArrow = false;
    setupCardInteractivity(cardItem, shouldAddArrow);
  });

  block.append(cardsContainer);
}
