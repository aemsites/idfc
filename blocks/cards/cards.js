import {
  createOptimizedPicture, loadScript, loadCSS, toCamelCase,
} from '../../scripts/aem.js';
import { moveInstrumentation, DOMPURIFY } from '../../scripts/scripts.js';
import { createModal } from '../modal/modal.js';

/**
 * Sanitizes text for JSON-LD by removing/replacing problematic characters
 * @param {string} text The text to sanitize
 * @returns {string} Sanitized text
 */

/**
 * Block and card field order (strict index-based parsing).
 * Cards block: 7 config rows (no "classes" – applied as CSS class on element only).
 * Card item: 9 cells per card.
 */

/** Block config: 7 rows, one per field. "classes" is not a model field. */
const CONFIG_ROW_COUNT = 7;

/** Cards block model field names in order (markdown/config). */
const CARDS_FIELDS = [
  // eslint-disable-next-line secure-coding/no-hardcoded-credentials -- field names only
  'modalTheme', 'modalDialogBackgroundImageTexture', 'modalPageBackgroundImage',
  'modalPageDecorationImage', 'swipable', 'autoplayEnabled', 'startingCard',
];

/** Card model field names in order (markdown/config). */
const CARD_FIELDS = [
  'image', 'imageAlt', 'dividerImage', 'cardTag', 'backgroundImageTexture',
  'text', 'cardLink', 'cardLinkText', 'modalContent',
];

/** Set of allowed block config keys (avoids prototype pollution when setting dataset). */
const CARDS_FIELDS_SET = new Set(CARDS_FIELDS);

/**
 * Sets a data-* attribute on an element for a whitelisted camelCase key.
 * @param {HTMLElement} el Element
 * @param {string} camelKey Key from CARDS_FIELDS (camelCase)
 * @param {string} value Value to set
 */
function setBlockDataAttribute(el, camelKey, value) {
  if (!CARDS_FIELDS_SET.has(camelKey)) return;
  const dataAttr = `data-${camelKey.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
  el.setAttribute(dataAttr, value);
}

/**
 * Returns the value from a block/card cell: first img src, first a href, or text content.
 * @param {HTMLElement} cell Cell element (may contain div > img/p/a)
 * @returns {string} Value or empty string
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

/**
 * Returns the value from a config row's value column (col 1): same logic as readBlockConfig.
 * @param {HTMLElement} col Second column element (value)
 * @returns {string} Single value (first img src, first a href, or text)
 */
function getConfigColumnValue(col) {
  if (!col) return '';
  if (col.querySelector('a')) {
    const as = [...col.querySelectorAll('a')];
    return as.length >= 1 ? as[0].href : '';
  }
  if (col.querySelector('img')) {
    const imgs = [...col.querySelectorAll('img')];
    return imgs.length >= 1 ? imgs[0].src : '';
  }
  if (col.querySelector('p')) {
    const ps = [...col.querySelectorAll('p')];
    return ps.length >= 1 ? ps[0].textContent?.trim() ?? '' : '';
  }
  return col.textContent?.trim() ?? '';
}

/**
 * Gets value from a config row (single cell or second column).
 * @param {HTMLElement} row Row element
 * @returns {string} Value (img src, link href, or text)
 */
function getConfigRowValue(row) {
  const cols = [...row.children];
  const cell = cols.length >= 2 ? cols[1] : cols[0];
  return cell ? getConfigColumnValue(cell) : '';
}

/**
 * Counts how many leading rows are config rows by structure (for UE-safe parsing).
 * Config rows: one-column = single cell; two-column = two cells with label in CARDS_FIELDS.
 * Stops at first non-config row or at 7, so card rows are never mistaken for config.
 * @param {HTMLElement[]} rows Block children
 * @returns {number} Number of config rows (0–7)
 */
function getConfigRowCount(rows) {
  if (!rows.length) return 0;
  const firstRow = rows[0];
  const isOneColumn = firstRow.children.length === 1;
  let count = 0;
  const max = Math.min(CONFIG_ROW_COUNT, rows.length);
  if (isOneColumn) {
    while (count < max && rows.at(count)?.children.length === 1) count += 1;
    return count;
  }
  while (count < max) {
    const row = rows.at(count);
    const cols = [...row.children];
    if (cols.length >= 2) {
      const name = toCamelCase(cols[0].textContent?.trim() ?? '');
      if (name && CARDS_FIELDS.includes(name)) {
        count += 1;
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return count;
}

function applyOneColumnConfigRows(block, rows, limit) {
  for (let i = 0; i < limit; i += 1) {
    const key = CARDS_FIELDS[i];
    const rawVal = getConfigRowValue(rows[i]);
    if (rawVal) setBlockDataAttribute(block, key, rawVal);
  }
}

function applyTwoColumnConfigRows(block, rows, limit) {
  for (let i = 0; i < limit; i += 1) {
    const row = rows[i];
    const cols = [...row.children];
    if (cols.length >= 2) {
      const name = toCamelCase(cols[0].textContent?.trim() ?? '');
      if (name && CARDS_FIELDS.includes(name)) {
        const value = getConfigColumnValue(cols[1]);
        if (value) setBlockDataAttribute(block, name, value);
      }
    }
  }
}

/**
 * Extracts block-level properties from config rows by field index.
 * Cards block has 7 fields only (no "classes" – that is CSS only).
 * Uses structure-based config row count so UE/fragments never treat card rows as config.
 * @param {HTMLElement} block The block element (children: config rows then card rows)
 * @param {HTMLElement[]} [rowsOverride] If provided, use as rows instead of block.children
 * @returns {number} Number of config rows consumed
 */
function extractBlockProperties(block, rowsOverride) {
  const rows = rowsOverride ?? [...block.children];
  const limit = getConfigRowCount(rows);
  if (limit === 0) return 0;
  const isOneColumn = rows[0].children.length === 1;
  if (isOneColumn) applyOneColumnConfigRows(block, rows, limit);
  else applyTwoColumnConfigRows(block, rows, limit);
  return limit;
}

/**
 * Creates and appends the arrow icon element to a card body
 * @param {HTMLElement} cardBody The card body element to append the arrow to
 */
function appendArrowIcon(cardBody) {
  // Check if arrow already exists
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

function hideLinkInSrOnly(cardLink) {
  let buttonContainer = cardLink.closest('.button-container');
  if (!buttonContainer) {
    buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';
    cardLink.parentNode.insertBefore(buttonContainer, cardLink);
    buttonContainer.appendChild(cardLink);
  }
  buttonContainer.classList.add('sr-only');
}

function setupComplexModalCard(cardItem, cardLink, mainBody, shouldAddArrow) {
  cardItem.classList.add('card-clickable');
  cardItem.setAttribute('role', 'button');
  cardItem.setAttribute('tabindex', '0');
  const handleClick = (e) => {
    if (e.target.closest('a')) return;
    e.preventDefault();
    e.stopPropagation();
    cardLink.click();
  };
  cardItem.addEventListener('click', handleClick);
  cardItem.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      cardLink.click();
    }
  });
  hideLinkInSrOnly(cardLink);
  if (shouldAddArrow) appendArrowIcon(mainBody);
}

function buildModalOptionsFromBlock(parentBlock, modalTheme) {
  const modalOptions = {};
  if (modalTheme) modalOptions.modalTheme = modalTheme;
  const blockTextureUrl = parentBlock?.dataset?.modalDialogBackgroundImageTexture;
  if (blockTextureUrl) modalOptions.textureImage = blockTextureUrl;
  const pageBackgroundUrl = parentBlock?.dataset?.modalPageBackgroundImage;
  if (pageBackgroundUrl) modalOptions.pageBackgroundImage = pageBackgroundUrl;
  const decorationImageUrl = parentBlock?.dataset?.modalPageDecorationImage;
  if (decorationImageUrl) modalOptions.decorationImage = decorationImageUrl;
  const ctaContent = parentBlock?.dataset?.modalCtaContent;
  if (ctaContent) modalOptions.ctaContent = ctaContent;
  return modalOptions;
}

function setupEasyModalCard(
  cardItem,
  modalContentDiv,
  mainBody,
  shouldAddArrow,
  modalTheme,
  parentBlock,
) {
  cardItem.classList.add('card-clickable', 'card-modal');
  cardItem.setAttribute('role', 'button');
  cardItem.setAttribute('tabindex', '0');
  const modalContent = modalContentDiv.cloneNode(true);
  const openCardModal = async () => {
    const contentWrapper = document.createElement('div');
    contentWrapper.innerHTML = (window.DOMPurify?.sanitize(modalContent.innerHTML, DOMPURIFY))
      ?? modalContent.innerHTML;
    const modalOptions = buildModalOptionsFromBlock(parentBlock, modalTheme);
    const { showModal } = await createModal([contentWrapper], modalOptions);
    showModal();
  };
  cardItem.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    e.preventDefault();
    e.stopPropagation();
    openCardModal();
  });
  cardItem.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openCardModal();
    }
  });
  if (shouldAddArrow) appendArrowIcon(mainBody);
}

function setupRegularLinkCard(cardItem, cardLink, mainBody, shouldAddArrow) {
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
  hideLinkInSrOnly(cardLink);
  if (shouldAddArrow) appendArrowIcon(mainBody);
}

/**
 * Sets up card interactivity based on card type:
 * 1. Standard card: No link, no modal - not clickable
 * 2. Easy modal card: No link, has modalContent - opens inline modal on click
 * 3. Complex modal card: Has link to /modals/ path - handled by autolinkModals
 * @param {HTMLElement} cardItem The card element
 * @param {boolean} shouldAddArrow Whether to add the arrow icon for interactive cards
 * @param {string} modalTheme Optional theme class to apply to the modal
 * @param {HTMLElement} parentBlock The parent block element (passed to avoid repeated queries)
 */
function setupCardInteractivity(cardItem, shouldAddArrow = false, modalTheme = '', parentBlock = null) {
  const cardBodies = cardItem.querySelectorAll('.cards-card-body');
  if (cardBodies.length === 0) return;

  const mainBody = cardBodies.item(0);
  const modalContentDiv = cardBodies.length > 1 ? cardBodies.item(cardBodies.length - 1) : null;
  const linkInModal = modalContentDiv?.querySelector('a');
  const isJustALink = modalContentDiv && linkInModal
    && modalContentDiv.textContent.trim() === linkInModal?.textContent.trim();
  const hasModalContent = modalContentDiv
    && modalContentDiv.textContent.trim().length > 0
    && modalContentDiv !== mainBody
    && !isJustALink;

  if (modalContentDiv && modalContentDiv !== mainBody) {
    modalContentDiv.classList.add('cards-modal-content');
  }

  const cardLink = cardItem.querySelector('a[href]');
  const hasModalPath = cardLink && cardLink.href && cardLink.href.includes('/modals/');
  const hasRegularLink = cardLink && !hasModalPath;

  if (hasModalPath) {
    setupComplexModalCard(cardItem, cardLink, mainBody, shouldAddArrow);
    return;
  }
  if (hasModalContent) {
    setupEasyModalCard(
      cardItem,
      modalContentDiv,
      mainBody,
      shouldAddArrow,
      modalTheme,
      parentBlock,
    );
    return;
  }
  if (hasRegularLink) {
    setupRegularLinkCard(cardItem, cardLink, mainBody, shouldAddArrow);
  }
}

/**
 * Splits the cardContent cell (third cell) into cardTag, cards-card-body, and cards-modal-content.
 * @param {HTMLElement} cardItem The card element to append to
 * @param {HTMLElement} contentCell The third cell (cardContent)
 */
function splitCardContentCell(cardItem, contentCell) {
  const wrapper = contentCell.querySelector('div') || contentCell;
  const nodes = [...wrapper.children];
  const headingIndices = [];
  nodes.forEach((el, i) => {
    if (el.matches?.('h1, h2, h3, h4, h5, h6')) headingIndices.push(i);
  });
  let tagNodes; let bodyNodes; let modalNodes;
  if (headingIndices.length > 0) {
    const first = headingIndices[0];
    const second = headingIndices[1] ?? nodes.length;
    tagNodes = first > 0 ? nodes.slice(0, first) : [];
    bodyNodes = nodes.slice(first, second);
    modalNodes = second < nodes.length ? nodes.slice(second) : [];
  } else {
    if (nodes.length === 0) return;
    if (nodes.length === 1) {
      tagNodes = [];
      bodyNodes = nodes;
      modalNodes = [];
    } else if (nodes.length === 2) {
      tagNodes = [nodes[0]];
      bodyNodes = [nodes[1]];
      modalNodes = [];
    } else {
      tagNodes = [nodes[0]];
      bodyNodes = nodes.slice(1, -1);
      modalNodes = [nodes.at(-1)];
    }
  }
  if (tagNodes.length > 0) {
    const tagDiv = document.createElement('div');
    tagDiv.className = 'cards-card-tag';
    tagNodes.forEach((n) => tagDiv.appendChild(n));
    cardItem.appendChild(tagDiv);
  }
  if (bodyNodes.length > 0) {
    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'cards-card-body';
    bodyNodes.forEach((n) => bodyDiv.appendChild(n));
    cardItem.appendChild(bodyDiv);
  }
  if (modalNodes.length > 0) {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'cards-card-body cards-modal-content';
    modalNodes.forEach((n) => modalDiv.appendChild(n));
    cardItem.appendChild(modalDiv);
  }
}

/**
 * Returns the first picture or img from a cell (from inner div if present).
 * @param {HTMLElement} cell Cell element
 * @returns {HTMLPictureElement|HTMLImageElement|null} picture or img or null
 */
function getCellPictureOrImg(cell) {
  if (!cell) return null;
  const inner = cell.querySelector('div') || cell;
  return inner.querySelector?.('picture') || inner.querySelector?.('img') || null;
}

/**
 * Appends a cell's inner content (clone) into a wrapper and appends wrapper to cardItem.
 * @param {HTMLElement} cardItem Card element
 * @param {HTMLElement} cell Cell element
 * @param {string} wrapperClass Class name for the wrapper div
 */
function appendCellContentAs(cardItem, cell, wrapperClass) {
  const inner = cell?.querySelector('div') || cell;
  if (!inner || !inner.children.length) return;
  const wrap = document.createElement('div');
  wrap.className = wrapperClass;
  [...inner.children].forEach((child) => wrap.appendChild(child.cloneNode(true)));
  cardItem.appendChild(wrap);
}

function appendCardImageWithAlt(cardItem, pic, altText) {
  if (!pic) return;
  const imageWrap = document.createElement('div');
  imageWrap.className = 'cards-card-image';
  const cloned = pic.cloneNode(true);
  const alt = altText || '';
  if (alt && cloned.tagName === 'IMG') cloned.alt = alt;
  if (cloned.tagName === 'PICTURE' && cloned.querySelector('img')) {
    cloned.querySelector('img').alt = alt;
  }
  imageWrap.appendChild(cloned);
  cardItem.appendChild(imageWrap);
}

function appendCardDivider(cardItem, pic) {
  if (!pic) return;
  const dividerWrap = document.createElement('div');
  dividerWrap.className = 'cards-card-divider';
  dividerWrap.appendChild(pic.cloneNode(true));
  cardItem.appendChild(dividerWrap);
}

function appendFallbackCardImageFromCell(cardItem, cells, cellIndex) {
  const pic = getCellPictureOrImg(cells.at(cellIndex));
  if (!pic) return;
  const imageWrap = document.createElement('div');
  imageWrap.className = 'cards-card-image';
  imageWrap.appendChild(pic.cloneNode(true));
  cardItem.insertBefore(imageWrap, cardItem.firstChild);
}

function appendCardTexture(cardItem, pic) {
  if (!pic) return;
  const textureWrap = document.createElement('div');
  textureWrap.className = 'cards-card-bg-texture';
  textureWrap.appendChild(pic.cloneNode(true));
  cardItem.appendChild(textureWrap);
}

function appendCardLinkButton(cardItem, linkEl, linkText, onlySetTextIfDifferentFromHref) {
  if (!linkEl?.href) return;
  const btnWrap = document.createElement('p');
  btnWrap.className = 'button-container';
  const a = linkEl.cloneNode(true);
  if (onlySetTextIfDifferentFromHref) {
    if (linkText && linkText !== linkEl.href) a.textContent = linkText;
  } else if (linkText) {
    a.textContent = linkText;
  }
  btnWrap.appendChild(a);
  const body = cardItem.querySelector('.cards-card-body');
  (body || cardItem).appendChild(btnWrap);
}

function initCardItemWithRows(cardItem, rowOrRows) {
  const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
  rows.forEach((row) => {
    if (row) moveInstrumentation(row, cardItem);
  });
  cardItem.removeAttribute('data-aue-prop');
  cardItem.setAttribute('data-aue-type', 'container');
  cardItem.setAttribute('data-aue-label', 'Card');
}

/**
 * Builds a single card from 9 cells in CARD_FIELDS order (strict index-based).
 * @param {HTMLElement[]} cells Array of 9 cell elements (image, imageAlt, dividerImage,
 *   cardTag, backgroundImageTexture, text, cardLink, cardLinkText, modalContent)
 * @param {HTMLElement|HTMLElement[]} rowOrRows Source row(s) for UE instrumentation
 * @returns {HTMLElement} The card element
 */
function buildCardFromCells(cells, rowOrRows) {
  if (!cells || cells.length < 9) return null;

  const cardItem = document.createElement('div');
  cardItem.classList.add('cards-card');
  initCardItemWithRows(cardItem, rowOrRows);

  const pic0 = getCellPictureOrImg(cells[0]);
  const dividerPic = getCellPictureOrImg(cells[2]);
  appendCardImageWithAlt(cardItem, pic0, cells[1] ? getCellValue(cells[1]) : '');
  appendCardDivider(cardItem, dividerPic);
  if (!pic0 && !dividerPic && cells[1]) {
    appendFallbackCardImageFromCell(cardItem, cells, 1);
  }
  appendCellContentAs(cardItem, cells[3], 'cards-card-tag');
  appendCardTexture(cardItem, getCellPictureOrImg(cells[4]));
  appendCellContentAs(cardItem, cells[5], 'cards-card-body');
  const linkEl9 = (cells[6]?.querySelector('div') || cells[6])?.querySelector?.('a[href]');
  const linkText9 = cells[7] ? getCellValue(cells[7]) : getCellValue(cells[6]);
  appendCardLinkButton(cardItem, linkEl9, linkText9, false);
  appendCellContentAs(cardItem, cells[8], 'cards-card-body cards-modal-content');
  return cardItem;
}

/**
 * Builds a single card from 7 cells (sheet order: image, imageAlt, dividerImage,
 * backgroundImageTexture, text, cardLink, modalContent). Used when card row has 7 cells.
 */
function buildCardFromSevenCells(cells, rowOrRows) {
  if (!cells || cells.length < 7) return null;

  const cardItem = document.createElement('div');
  cardItem.classList.add('cards-card');
  initCardItemWithRows(cardItem, rowOrRows);

  const pic0 = getCellPictureOrImg(cells[0]);
  const dividerPic = getCellPictureOrImg(cells[2]);
  appendCardImageWithAlt(cardItem, pic0, cells[1] ? getCellValue(cells[1]) : '');
  appendCardDivider(cardItem, dividerPic);
  if (!pic0 && !dividerPic && cells[1]) {
    appendFallbackCardImageFromCell(cardItem, cells, 1);
  }
  appendCardTexture(cardItem, getCellPictureOrImg(cells[3]));
  appendCellContentAs(cardItem, cells[4], 'cards-card-body');
  const linkEl7 = (cells[5]?.querySelector('div') || cells[5])?.querySelector?.('a[href]');
  appendCardLinkButton(cardItem, linkEl7, getCellValue(cells[5]), true);
  appendCellContentAs(cardItem, cells[6], 'cards-card-body cards-modal-content');
  return cardItem;
}

/**
 * Builds a single card from one row with 3 cells (legacy: image | decor | content).
 * @param {HTMLElement} row Row element with 3 child cells
 * @returns {HTMLElement} The card element
 */
function buildCardFromThreeCells(row) {
  const cells = [...row.children];
  if (cells.length < 3) return null;
  const cardItem = document.createElement('div');
  cardItem.classList.add('cards-card');
  moveInstrumentation(row, cardItem);
  cardItem.removeAttribute('data-aue-prop');
  cardItem.setAttribute('data-aue-type', 'container');
  cardItem.setAttribute('data-aue-label', 'Card');

  const imageCell = cells[0].querySelector('div') || cells[0];
  const picture = imageCell.querySelector?.('picture');
  if (picture) {
    const imageWrap = document.createElement('div');
    imageWrap.className = 'cards-card-image';
    imageWrap.appendChild(picture);
    cardItem.appendChild(imageWrap);
  }
  const decorCell = cells[1].querySelector('div') || cells[1];
  const pictures = [...decorCell.querySelectorAll?.('picture') || []];
  if (pictures.length >= 1) {
    const dividerWrap = document.createElement('div');
    dividerWrap.className = 'cards-card-divider';
    dividerWrap.appendChild(pictures[0]);
    cardItem.appendChild(dividerWrap);
  }
  if (pictures.length >= 2) {
    const textureWrap = document.createElement('div');
    textureWrap.className = 'cards-card-bg-texture';
    textureWrap.appendChild(pictures[1]);
    cardItem.appendChild(textureWrap);
  }
  splitCardContentCell(cardItem, cells[2]);
  return cardItem;
}

/**
 * Identifies and marks semantic elements within a card:
 * - dividerImage: thin horizontal image (cards-card-divider)
 * - backgroundImageTexture: large texture image (cards-card-bg-texture)
 * - cardTag: simple text tag before main content (cards-card-tag)
 * @param {HTMLElement} cardItem The card element
 */
function identifySemanticCardElements(cardItem) {
  const children = [...cardItem.children];

  // Process all cards-card-image elements to identify dividers and textures
  children.forEach((div) => {
    if (!div.classList.contains('cards-card-image')) return;

    const img = div.querySelector('img');
    if (!img) return;

    const width = parseInt(img.getAttribute('width'), 10) || 0;
    const height = parseInt(img.getAttribute('height'), 10) || 0;

    // Divider: thin horizontal image (height < 50px, width much greater than height)
    if (height > 0 && height < 50 && width > height * 3) {
      div.classList.remove('cards-card-image');
      div.classList.add('cards-card-divider');
      return;
    }

    // Texture: large image (both dimensions > 100px)
    if (width > 100 && height > 100) {
      div.classList.remove('cards-card-image');
      div.classList.add('cards-card-bg-texture');
    }
  });

  // Identify cardTag: a simple text body that appears before the main content body
  // The cardTag has just text (p tag) without headings, and the next body has headings
  const bodyDivs = children.filter((div) => div.classList.contains('cards-card-body'));
  if (bodyDivs.length >= 2) {
    const firstBody = bodyDivs[0];
    const secondBody = bodyDivs[1];

    // Check if first body is a simple tag (no headings, just text)
    // and second body has headings (the main content)
    const firstHasHeading = firstBody.querySelector('h1, h2, h3, h4, h5, h6');
    const secondHasHeading = secondBody.querySelector('h1, h2, h3, h4, h5, h6');

    if (!firstHasHeading && secondHasHeading) {
      // First body is the cardTag
      firstBody.classList.remove('cards-card-body');
      firstBody.classList.add('cards-card-tag');
    }
  }
}

// Mayura scrollbar recovery: one global resize listener instead of per-swiper resize/breakpoint
let mayuraScrollbarResizeAttached = false;

function runScrollbarRecoveryForSwiper(swiper, scrollbarContainer) {
  try {
    if (scrollbarContainer) {
      scrollbarContainer.querySelectorAll('.swiper-pagination-handle').forEach((el) => el.remove());
      if (swiper.scrollbar && swiper.scrollbar.dragEl) {
        swiper.scrollbar.dragEl = null;
      }
    }
    if (swiper.scrollbar && typeof swiper.scrollbar.init === 'function') {
      swiper.scrollbar.init();
    }
    if (swiper.scrollbar && typeof swiper.scrollbar.updateSize === 'function') {
      swiper.scrollbar.updateSize();
    }
    swiper.update();
  } catch {
    // Intentionally ignore so recovery fails gracefully and callers continue
  }
}

function checkAndRecoverMayuraScrollbarForBlock(block, swiper) {
  if (!block || !swiper || !swiper.scrollbar) return;
  const scrollbarEl = block.querySelector('.swiper-scrollbar');
  const handleEl = block.querySelector('.swiper-pagination-handle');
  const hasScrollbar = !!scrollbarEl;
  const hasHandle = !!handleEl;
  const isLocked = scrollbarEl?.classList.contains('swiper-scrollbar-lock');
  const isHidden = scrollbarEl?.style?.display === 'none';

  if (!hasScrollbar) {
    const newScrollbar = document.createElement('div');
    newScrollbar.className = 'swiper-scrollbar swiper-scrollbar-horizontal';
    block.appendChild(newScrollbar);
    runScrollbarRecoveryForSwiper(swiper, null);
    return;
  }

  // Swiper can add swiper-scrollbar-lock + display:none when container had zero size at init
  // (e.g. tab panel hidden). Force-unlock and unhide so recovery can run and handle is visible.
  if (isLocked || isHidden) {
    scrollbarEl.classList.remove('swiper-scrollbar-lock');
    scrollbarEl.style.removeProperty('display');
  }

  if (!hasHandle || isLocked || isHidden) {
    runScrollbarRecoveryForSwiper(swiper, scrollbarEl);
    // Fix slide offset when block is visible (tabbed or not: init may have run in hidden container)
    const tabpanel = block.closest('[role="tabpanel"]');
    const isVisible = !tabpanel || tabpanel.getAttribute('aria-hidden') === 'false';
    if (isVisible && typeof swiper.slideTo === 'function') {
      const expectedSlide = parseInt(block.dataset.startingCard || '0', 10);
      const isMobile = window.innerWidth < 600;
      const targetSlide = isMobile ? 0 : expectedSlide;
      if (swiper.activeIndex !== targetSlide) {
        swiper.slideTo(targetSlide, 0);
      }
    }
  }
}

function globalMayuraScrollbarResizeHandler() {
  requestAnimationFrame(() => {
    const blocks = document.querySelectorAll('.mayura .cards.swiper');
    blocks.forEach((block) => {
      const swiper = block.swiperInstance;
      if (swiper) checkAndRecoverMayuraScrollbarForBlock(block, swiper);
    });
  });
}

function getStaticImageDimensionsForBlock(block, img) {
  if (block.classList.contains('all-about-card')) return { width: 280, height: 350 };
  if (block.classList.contains('important-documents')) return { width: 175, height: 175 };
  if (img.closest('.swiper-slide')) return { width: 232, height: 358 };
  return null;
}

function applyInitialLayoutLock(block) {
  const isDesktop = window.matchMedia('(min-width: 900px)').matches;
  const section = block.closest('.section');
  const wrapper = block.closest('.cards-wrapper') || block.parentElement;
  const isAllAboutCard = block.classList.contains('all-about-card');
  const initialBlockHeight = block.getBoundingClientRect().height;
  const initialWrapperHeight = wrapper?.getBoundingClientRect().height;
  const initialSectionHeight = section?.getBoundingClientRect().height;

  if (isDesktop && isAllAboutCard && section) {
    section.style.minHeight = '1412px';
    if (wrapper) wrapper.style.minHeight = '1412px';
    block.style.minHeight = '1412px';
    block.style.visibility = 'hidden';
  }
  if (isDesktop && initialBlockHeight > 0) {
    block.style.minHeight = `${initialBlockHeight}px`;
    if (wrapper && initialWrapperHeight) wrapper.style.minHeight = `${initialWrapperHeight}px`;
    if (section?.classList.contains('cards-container') && initialSectionHeight) {
      section.style.minHeight = `${initialSectionHeight}px`;
    }
  }

  const release = () => {
    if (!isDesktop) return;
    block.style.minHeight = '';
    if (wrapper) wrapper.style.minHeight = '';
    if (section) section.style.minHeight = '';
  };
  const setRenderedImageDimensions = () => {
    block.querySelectorAll('img').forEach((img) => {
      if (img.hasAttribute('width') && img.hasAttribute('height')) return;
      const rect = img.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        img.setAttribute('width', Math.round(rect.width));
        img.setAttribute('height', Math.round(rect.height));
      }
    });
  };
  return {
    release,
    setRenderedImageDimensions,
    isDesktop,
    isAllAboutCard,
  };
}

function getBlockVariantFlags(block) {
  const { classList } = block;
  const isExperienceLife = classList.contains('experience-life');
  const isJoiningPerks = classList.contains('joining-perks');
  const supportsSemanticElements = classList.contains('key-benefits')
    || isExperienceLife
    || classList.contains('reward-points');
  return {
    isImportantDocuments: classList.contains('important-documents'),
    isRelatedSearch: classList.contains('related-search'),
    isImageAndTitle: classList.contains('image-and-title'),
    isExperienceLife,
    isBlogPosts: classList.contains('blog-posts'),
    isEarnRewards: classList.contains('earn-rewards'),
    isJoiningPerks,
    supportsSemanticElements,
    isExploreOtherCards: classList.contains('explore-other-cards'),
    isAllAboutCard: classList.contains('all-about-card'),
    isInCsCards: block.closest('#cscards') !== null,
  };
}

function shouldSkipRebuild(block) {
  const singleChild = block.children.length === 1 ? block.children[0] : null;
  return singleChild?.classList?.contains('grid-cards') && singleChild?.querySelector?.('.cards-card');
}

function parseRowsAndConfig(block) {
  let rows = [...block.children];
  const single = rows.length === 1 ? rows[0] : null;
  const unwrap = single?.classList?.contains('default-content')
    || single?.classList?.contains('block-content');
  if (unwrap) rows = [...single.children];
  const configRowCount = extractBlockProperties(block, rows);
  const cardRows = rows.slice(configRowCount);
  const firstCardRow = cardRows[0];
  const numCells = firstCardRow ? firstCardRow.children.length : 0;
  return {
    rows,
    configRowCount,
    cardRows,
    numCells,
  };
}

function moveInstrumentationToBlock(block, rows, configRowCount) {
  for (let i = 0; i < configRowCount; i += 1) {
    moveInstrumentation(rows[i], block);
  }
  block.removeAttribute('data-aue-prop');
  block.setAttribute('data-aue-type', 'container');
  block.setAttribute('data-aue-label', 'Cards');
}

function appendCardsFromFourCellRows(cardRows, cardsContainer) {
  for (let i = 0; i < cardRows.length; i += 3) {
    const group = cardRows.slice(i, i + 3);
    if (group.length === 3) {
      const cells = [...group[0].children, ...group[1].children, ...group[2].children];
      const cardItem = buildCardFromCells(cells, group);
      if (cardItem) cardsContainer.append(cardItem);
    } else if (group.length > 0) {
      // eslint-disable-next-line no-console
      console.error('Cards block: card rows group has unexpected length (expected 3, got %d). Index: %d.', group.length, i);
    }
  }
}

function buildCardsFromRows(cardRows, numCells, cardsContainer) {
  if (numCells === CARD_FIELDS.length) {
    cardRows.forEach((row) => {
      const cells = [...row.children];
      const cardItem = buildCardFromCells(cells, row);
      if (cardItem) cardsContainer.append(cardItem);
    });
    return;
  }
  if (numCells === 4) {
    appendCardsFromFourCellRows(cardRows, cardsContainer);
    return;
  }
  if (numCells === 3) {
    cardRows.forEach((row) => {
      const cardItem = buildCardFromThreeCells(row);
      if (cardItem) cardsContainer.append(cardItem);
    });
    return;
  }
  if (numCells === 7) {
    cardRows.forEach((row) => {
      const cells = [...row.children];
      const cardItem = buildCardFromSevenCells(cells, row);
      if (cardItem) cardsContainer.append(cardItem);
    });
    return;
  }
  if (numCells === 8) {
    cardRows.forEach((row) => {
      const cells = [...row.children];
      cells.push(document.createElement('div'));
      const cardItem = buildCardFromCells(cells, row);
      if (cardItem) cardsContainer.append(cardItem);
    });
    return;
  }
  if (cardRows.length > 0) {
    // eslint-disable-next-line no-console
    console.error('Cards block: unexpected card row cell count (%d). Expected 3, 4, 7, 8, or 9.', numCells);
  }
}

function optimizeCardPicturesInContainer(cardsContainer, block) {
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
      const staticSize = getStaticImageDimensionsForBlock(block, img);
      if (staticSize) {
        optimizedImg.setAttribute('width', staticSize.width);
        optimizedImg.setAttribute('height', staticSize.height);
      }
    }
    img.closest('picture').replaceWith(optimizedPic);
  });
}

function getCardVariantClass(flags) {
  if (flags.isImportantDocuments) return 'important-documents-card';
  if (flags.isBlogPosts) return 'blog-post-card';
  const isBenefit = !flags.isEarnRewards && !flags.isJoiningPerks
    && !flags.isImageAndTitle && !flags.isAllAboutCard;
  if (!isBenefit) return null;
  return flags.isExploreOtherCards ? 'explore-other-cards' : 'benefit-cards';
}

function applyCardClassesAndInteractivity(block, allCards, flags) {
  const modalTheme = block.dataset.modalTheme || '';
  const variantClass = getCardVariantClass(flags);
  allCards.forEach((cardItem) => {
    if (variantClass) cardItem.classList.add(variantClass);
    if (!flags.isBlogPosts) {
      setupCardInteractivity(cardItem, flags.supportsSemanticElements, modalTheme, block);
    }
  });
}

function applySlideCountClasses(block, slideCount) {
  if (slideCount === 1) block.classList.add('cards-single-slide');
  else if (slideCount === 2) block.classList.add('cards-two-slides');
}

function getSwiperConfig(block, slideCount, flags) {
  const isMayuraTemplate = document.body.classList.contains('mayura');
  const isAutoplayEnabled = block.dataset.autoplayEnabled === 'true';
  const startingCard = parseInt(block.dataset.startingCard || '0', 10);
  const isMobileView = window.innerWidth < 600;
  const initialSlideIndex = isMobileView ? 0 : startingCard;

  const baseConfig = {
    slidesPerView: 1.2,
    spaceBetween: 16,
    initialSlide: initialSlideIndex,
    centeredSlides: true,
    ...(isMayuraTemplate
      ? {
        scrollbar: {
          el: '.swiper-scrollbar',
          dragClass: 'swiper-pagination-handle',
          dragSize: 33,
          draggable: true,
          snapOnRelease: true,
        },
      }
      : {
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
          dynamicBullets: false,
          type: 'bullets',
        },
      }),
  };

  if (flags.isExperienceLife) {
    baseConfig.slidesPerView = 1.15;
    baseConfig.spaceBetween = 16;
    baseConfig.breakpoints = {
      600: {
        slidesPerView: Math.min(2, slideCount),
        spaceBetween: 20,
        centeredSlides: slideCount > 2,
      },
      900: {
        slidesPerView: Math.min(3, slideCount),
        spaceBetween: 36,
        centeredSlides: slideCount > 3,
      },
    };
  } else if (flags.isJoiningPerks) {
    baseConfig.loop = false;
    baseConfig.watchSlidesProgress = true;
    baseConfig.watchSlidesVisibility = true;
    baseConfig.slidesPerView = 1.5;
    baseConfig.spaceBetween = 16;
    baseConfig.breakpoints = {
      600: {
        slidesPerView: 2,
        spaceBetween: 30,
        centeredSlides: slideCount > 2,
      },
      900: {
        slidesPerView: 3,
        spaceBetween: 60,
        centeredSlides: slideCount > 3,
      },
    };
  } else if (flags.isExploreOtherCards || flags.isBlogPosts) {
    baseConfig.loop = false;
    baseConfig.watchSlidesProgress = true;
    baseConfig.watchSlidesVisibility = true;
    baseConfig.slidesPerView = 1;
    baseConfig.spaceBetween = 25;
    baseConfig.breakpoints = {
      600: {
        slidesPerView: 2,
        spaceBetween: 20,
        centeredSlides: slideCount > 2,
      },
      900: {
        slidesPerView: 3,
        spaceBetween: 42,
        centeredSlides: slideCount > 3,
      },
    };
  } else if (flags.isAllAboutCard) {
    baseConfig.loop = false;
    baseConfig.watchSlidesProgress = true;
    baseConfig.watchSlidesVisibility = true;
    baseConfig.slidesPerView = 1.5;
    baseConfig.spaceBetween = 16;
    baseConfig.breakpoints = {
      600: {
        slidesPerView: 2,
        spaceBetween: 20,
        centeredSlides: slideCount > 2,
      },
      900: {
        slidesPerView: 3,
        spaceBetween: 42,
        centeredSlides: slideCount > 3,
      },
    };
  } else {
    baseConfig.spaceBetween = 16;
    baseConfig.breakpoints = {
      600: {
        slidesPerView: Math.min(2, slideCount),
        spaceBetween: 20,
        centeredSlides: slideCount > 2,
      },
      900: {
        slidesPerView: Math.min(3, slideCount),
        spaceBetween: 36,
        centeredSlides: slideCount > 3,
      },
    };
  }
  if (isAutoplayEnabled) {
    baseConfig.autoplay = { delay: 3000, disableOnInteraction: false, pauseOnMouseEnter: true };
    baseConfig.loop = false;
  }
  return { config: baseConfig, initialSlideIndex, isMayuraTemplate };
}

async function initSwiper(block, cardsContainer, flags, layout) {
  await loadCSS('/scripts/swiperjs/swiper-bundle.min.css');
  await loadScript('/scripts/swiperjs/swiper-bundle.min.js');
  const waitForSwiper = () => new Promise((resolve) => {
    if (typeof Swiper !== 'undefined') {
      resolve();
    } else {
      const checkInterval = setInterval(() => {
        if (typeof Swiper !== 'undefined') {
          clearInterval(checkInterval);
          resolve();
        }
      }, 10);
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 2000);
    }
  });
  await waitForSwiper();

  block.classList.add('swiper');
  cardsContainer.classList.add('swiper-wrapper');
  cardsContainer.classList.remove('grid-cards');
  cardsContainer.querySelectorAll('.cards-card').forEach((cardItem) => {
    cardItem.classList.add('swiper-slide');
  });

  const slideCount = cardsContainer.querySelectorAll('.cards-card').length;
  const swiperResult = getSwiperConfig(block, slideCount, flags);
  const { config: swiperConfig, initialSlideIndex, isMayuraTemplate } = swiperResult;

  if (isMayuraTemplate) {
    const scrollbarEl = document.createElement('div');
    scrollbarEl.className = 'swiper-scrollbar';
    block.appendChild(scrollbarEl);
  } else {
    const swiperPagination = document.createElement('div');
    swiperPagination.className = 'swiper-pagination';
    block.appendChild(swiperPagination);
  }

  applySlideCountClasses(block, slideCount);

  if (typeof Swiper === 'undefined') {
    // eslint-disable-next-line no-console
    console.warn('Swiper library not available, cards will display without slider');
    return;
  }

  // eslint-disable-next-line no-undef
  const swiper = new Swiper(block, swiperConfig);
  window.requestAnimationFrame(() => layout.release());
  if (flags.isAllAboutCard) block.style.visibility = '';
  window.requestAnimationFrame(() => layout.setRenderedImageDimensions());
  block.swiperInstance = swiper;

  const tryFixSlide = () => {
    const active = swiper.activeIndex;
    const real = swiper.realIndex;
    const mismatch = (active !== initialSlideIndex) || (real !== initialSlideIndex);
    if (mismatch && typeof swiper.slideTo === 'function' && initialSlideIndex >= 0) {
      swiper.slideTo(initialSlideIndex, 0);
    }
  };
  requestAnimationFrame(() => {
    setTimeout(tryFixSlide, 50);
    setTimeout(tryFixSlide, 350);
  });

  if (isMayuraTemplate) {
    checkAndRecoverMayuraScrollbarForBlock(block, swiper);
    swiper.on('init', () => checkAndRecoverMayuraScrollbarForBlock(block, swiper));
    if (!mayuraScrollbarResizeAttached) {
      mayuraScrollbarResizeAttached = true;
      window.addEventListener('resize', () => globalMayuraScrollbarResizeHandler());
      setTimeout(() => globalMayuraScrollbarResizeHandler(), 700);
      setTimeout(() => globalMayuraScrollbarResizeHandler(), 1400);
      document.addEventListener('click', (e) => {
        const tab = e.target.closest('.mayura [role="tab"]');
        if (!tab) return;
        const panelId = tab.getAttribute('aria-controls');
        setTimeout(() => globalMayuraScrollbarResizeHandler(), 150);
        setTimeout(() => globalMayuraScrollbarResizeHandler(), 400);
        setTimeout(() => {
          const panel = panelId ? document.getElementById(panelId) : null;
          const tabBlock = panel?.querySelector('.cards.swiper');
          const target = tabBlock ? parseInt(tabBlock.dataset.startingCard || '0', 10) : null;
          if (tabBlock?.swiperInstance && window.innerWidth >= 600 && target !== null) {
            tabBlock.swiperInstance.slideTo(target, 0);
          }
        }, 200);
      });
      const mayuraRoot = document.querySelector('.mayura');
      if (mayuraRoot) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
              const panel = mutation.target;
              if (panel.getAttribute?.('role') === 'tabpanel' && panel.getAttribute('aria-hidden') === 'false') {
                const visibleBlock = panel.querySelector('.cards.swiper');
                // Intentional: Mayura tab-panel visibility uses observer + rAF + setTimeout chain
                /* eslint-disable sonarjs/no-nested-functions */
                requestAnimationFrame(() => {
                  setTimeout(() => globalMayuraScrollbarResizeHandler(), 50);
                  setTimeout(() => globalMayuraScrollbarResizeHandler(), 250);
                });
                /* eslint-enable sonarjs/no-nested-functions */
                if (visibleBlock && window.innerWidth >= 600) {
                  setTimeout(() => {
                    const swiperInst = visibleBlock.swiperInstance;
                    const target = parseInt(visibleBlock.dataset.startingCard || '0', 10);
                    if (swiperInst) swiperInst.slideTo(target, 0);
                  }, 200);
                }
              }
            }
          });
        });
        observer.observe(mayuraRoot, { attributes: true, subtree: true, attributeFilter: ['aria-hidden'] });
      }
    }
    requestAnimationFrame(() => {
      setTimeout(() => checkAndRecoverMayuraScrollbarForBlock(block, swiper), 150);
      setTimeout(() => checkAndRecoverMayuraScrollbarForBlock(block, swiper), 450);
    });
  }
}

function setupViewAllViewLess(block, allCards) {
  const maxVisible = 3;
  const isMobile = () => window.innerWidth <= 768;
  const toggleView = (btn, expand) => {
    allCards.forEach((card, index) => {
      if (index >= maxVisible) card.style.display = expand ? 'flex' : 'none';
    });
    btn.textContent = expand ? 'View Less' : 'View All';
  };
  const setupToggleButton = () => {
    if (allCards.length <= maxVisible || !isMobile()) return;
    allCards.forEach((card, index) => {
      card.style.display = index >= maxVisible ? 'none' : 'flex';
    });
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'View All';
    toggleBtn.className = 'view-toggle';
    block.appendChild(toggleBtn);
    toggleBtn.addEventListener('click', () => {
      const isExpanded = toggleBtn.textContent === 'View Less';
      toggleView(toggleBtn, !isExpanded);
    });
  };
  setupToggleButton();
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const existingBtn = block.querySelector('.view-toggle');
      if (existingBtn) existingBtn.remove();
      allCards.forEach((card) => { card.style.display = 'flex'; });
      setupToggleButton();
    }, 150);
  });
}

export default async function decorate(block) {
  const layout = applyInitialLayoutLock(block);
  const flags = getBlockVariantFlags(block);
  if (shouldSkipRebuild(block)) return;

  const {
    rows, configRowCount, cardRows, numCells,
  } = parseRowsAndConfig(block);
  moveInstrumentationToBlock(block, rows, configRowCount);

  const cardsContainer = document.createElement('div');
  cardsContainer.classList.add('grid-cards');
  buildCardsFromRows(cardRows, numCells, cardsContainer);

  if (flags.supportsSemanticElements) {
    cardsContainer.querySelectorAll('.cards-card').forEach((cardItem) => {
      identifySemanticCardElements(cardItem);
    });
  }
  optimizeCardPicturesInContainer(cardsContainer, block);
  block.replaceChildren(cardsContainer);

  const allCards = cardsContainer.querySelectorAll('.cards-card');
  applyCardClassesAndInteractivity(block, allCards, flags);

  const isSwipable = block.dataset.swipable === 'true';
  if (isSwipable) {
    await initSwiper(block, cardsContainer, flags, layout);
  } else {
    const showViewAllToggle = !flags.isImportantDocuments && !flags.isRelatedSearch
      && !flags.isImageAndTitle && !flags.isEarnRewards && !flags.isJoiningPerks
      && !flags.isInCsCards;
    if (showViewAllToggle) {
      setupViewAllViewLess(block, allCards);
    }

    layout.release();
    if (flags.isAllAboutCard) block.style.visibility = '';
    window.requestAnimationFrame(() => layout.setRenderedImageDimensions());
  }
}
