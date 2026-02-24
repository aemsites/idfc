/*
 * Table Block
 * Recreate a table
 * https://www.hlx.live/developer/block-collection/table
 */

import {
  moveInstrumentation,
  handleBackgroundImages,
  handleBackground,
  normalizeBackgroundColor,
  getColorScheme,
  DOMPURIFY,
} from '../../scripts/scripts.js';

/**
 * Extracts image URL from picture or img element
 * @param {Element} element - Picture or img element
 * @returns {string|null} - Image URL or null
 */
function extractImageUrl(element) {
  if (!element) return null;
  if (element.tagName === 'IMG') return element.src;
  if (element.tagName === 'PICTURE') return element.querySelector('img')?.src || null;
  return null;
}

/** Maximum rows to scan for metadata (limits loop iterations for CWE-606) */
const MAX_METADATA_SCAN_ROWS = 100;

const NO_HEADER_VARIANTS = new Set(['fees-and-charges', 'reward-points']);

function isColorOrGradientText(text) {
  if (!text) return false;
  return text.startsWith('var(') || text.startsWith('#') || text.includes('gradient')
    || text.includes('rgb')
    || /^[0-9a-f]{3,6}$/i.test(text)
    || /^(transparent|inherit|initial|unset)$/i.test(text);
}

function isColorPattern(text) {
  return text.startsWith('var(') || text.startsWith('#') || text.includes('gradient');
}

function isAltCandidate(text) {
  return text !== 'true' && text !== 'false' && !/^\d+px$/.test(text);
}

/** Check cell for imageAlt text. Returns { imageAlt, stop }; stop true when row is done. */
function parseAltFromCell(cell) {
  if (cell.querySelector('img, picture')) return { imageAlt: '', stop: true };
  const text = cell.textContent?.trim();
  if (!text) return { imageAlt: '', stop: false };
  if (isAltCandidate(text) && !isColorPattern(text)) return { imageAlt: text, stop: true };
  return { imageAlt: '', stop: true };
}

/** Parse row 0 as block id; return 0 or 1 for metadataCount. */
function parseRow0Id(block, rows) {
  const row = rows[0];
  if (row?.children.length !== 1) return 0;
  const cell = row.children[0];
  const text = cell.textContent?.trim();
  if (!text || cell.querySelector('img, picture')) return 0;
  block.id = text;
  return 1;
}

/** Parse row 1 as background color; return { backgroundColor, metadataCount }. */
function parseRow1Background(rows) {
  const row = rows[1];
  if (row?.children.length !== 1) return { backgroundColor: '', metadataCount: 0 };
  const cell = row.children[0];
  if (cell.querySelector('img, picture')) return { backgroundColor: '', metadataCount: 0 };
  const text = cell.textContent?.trim();
  const backgroundColor = isColorOrGradientText(text) ? text : '';
  const metadataCount = text ? 2 : 0;
  return { backgroundColor, metadataCount };
}

/** Find next row with single cell containing picture/img; return url or null and new count. */
function findNextImageRow(rows, startCount) {
  // eslint-disable-next-line secure-coding/no-unchecked-loop-condition
  for (let step = 0; step < MAX_METADATA_SCAN_ROWS; step += 1) {
    const j = startCount + step;
    if (j >= rows.length) return { url: null, nextCount: startCount };
    const row = rows[j];
    if (row?.children.length === 1) {
      const cell = row.children[0];
      const imageElement = cell.querySelector('picture, img');
      if (imageElement) {
        return { url: extractImageUrl(imageElement), nextCount: j + 1 };
      }
      if (cell.textContent?.trim()) return { url: null, nextCount: startCount };
    }
  }
  return { url: null, nextCount: startCount };
}

/** Find desktop and mobile image URLs in consecutive single-cell image rows. */
function findDesktopMobileImages(rows, startCount) {
  const first = findNextImageRow(rows, startCount);
  if (!first.url) return { desktopImageUrl: null, mobileImageUrl: null, metadataCount: startCount };
  const second = findNextImageRow(rows, first.nextCount);
  return {
    desktopImageUrl: first.url,
    mobileImageUrl: second.url || null,
    metadataCount: second.url ? second.nextCount : first.nextCount,
  };
}

/** Find imageAlt in next single-cell text row that is not color/boolean/px. */
function findImageAlt(rows, startCount) {
  // Loop is bounded: max MAX_METADATA_SCAN_ROWS iterations and early return when j >= rows.length
  // eslint-disable-next-line secure-coding/no-unchecked-loop-condition
  for (let step = 0; step < MAX_METADATA_SCAN_ROWS; step += 1) {
    const j = startCount + step;
    if (j >= rows.length) return { imageAlt: '', metadataCount: startCount };
    const row = rows[j];
    if (row?.children.length === 1) {
      const result = parseAltFromCell(row.children[0]);
      if (result.stop) {
        return { imageAlt: result.imageAlt, metadataCount: result.imageAlt ? j + 1 : startCount };
      }
    }
  }
  return { imageAlt: '', metadataCount: startCount };
}

/** Find tableRowMaxWidth (e.g. "800px") in next single-cell row. */
function findTableRowMaxWidth(rows, startCount) {
  // eslint-disable-next-line secure-coding/no-unchecked-loop-condition
  for (let step = 0; step < MAX_METADATA_SCAN_ROWS; step += 1) {
    const j = startCount + step;
    if (j >= rows.length) return { tableRowMaxWidth: '', metadataCount: startCount };
    const row = rows[j];
    if (row?.children.length === 1) {
      const cell = row.children[0];
      const text = cell.textContent?.trim();
      if (text && /^\d+px$/.test(text)) {
        return { tableRowMaxWidth: text, metadataCount: j + 1 };
      }
      if (text && !cell.querySelector('img, picture')) {
        return { tableRowMaxWidth: '', metadataCount: startCount };
      }
    }
  }
  return { tableRowMaxWidth: '', metadataCount: startCount };
}

/** Advance metadataCount past a single-cell row containing 'true' or 'false'. */
function advancePastBooleanRow(rows, metadataCount) {
  const safeIndex = Number(metadataCount);
  if (!Number.isInteger(safeIndex) || safeIndex < 0 || safeIndex >= rows.length) {
    return metadataCount;
  }
  const row = rows.at(safeIndex);
  if (row?.children.length !== 1) return metadataCount;
  const text = row.children[0].textContent?.trim();
  return (text === 'true' || text === 'false') ? metadataCount + 1 : metadataCount;
}

/** Extract all table metadata from block and rows. */
function extractTableMetadata(block, rows) {
  let metadataCount = parseRow0Id(block, rows);
  const { backgroundColor, metadataCount: row1Count } = parseRow1Background(rows);
  if (row1Count > metadataCount) metadataCount = row1Count;

  const images = findDesktopMobileImages(rows, metadataCount);
  metadataCount = images.metadataCount;

  const altResult = findImageAlt(rows, metadataCount);
  metadataCount = altResult.metadataCount;

  const maxWidthResult = findTableRowMaxWidth(rows, metadataCount);
  metadataCount = maxWidthResult.metadataCount;

  metadataCount = advancePastBooleanRow(rows, metadataCount);

  return {
    metadataCount,
    backgroundColor,
    desktopImageUrl: images.desktopImageUrl,
    mobileImageUrl: images.mobileImageUrl,
    imageAlt: altResult.imageAlt,
    tableRowMaxWidth: maxWidthResult.tableRowMaxWidth,
  };
}

function isDataRow(row) {
  if (!row.children?.length) return false;
  const cells = Array.from(row.children);
  return cells.some((cell) => cell.textContent?.trim() || cell.querySelector('img, picture'));
}

function buildTableRows(dataRows, thead, tbody) {
  let headerRowProcessed = false;
  dataRows.forEach((row, i) => {
    if (!row.children?.length) return;
    const tr = document.createElement('tr');
    moveInstrumentation(row, tr);
    const isFirstRow = i === 0;
    const isLastRow = i === dataRows.length - 1;
    const isHeaderRow = isFirstRow && thead && !headerRowProcessed;
    const cells = Array.from(row.children);
    const firstCell = cells[0];
    const secondCell = cells[1];
    const isEmptySecondCell = isLastRow && secondCell && !secondCell.textContent?.trim();
    if (isEmptySecondCell) {
      const cell = document.createElement(isHeaderRow ? 'th' : 'td');
      if (isHeaderRow) cell.setAttribute('scope', 'column');
      cell.setAttribute('colspan', '2');
      cell.innerHTML = (window.DOMPurify?.sanitize(firstCell.innerHTML, DOMPURIFY))
        ?? firstCell.innerHTML;
      tr.append(cell);
    } else {
      cells.forEach((cell) => {
        const td = document.createElement(isHeaderRow ? 'th' : 'td');
        if (isHeaderRow) td.setAttribute('scope', 'column');
        td.innerHTML = (window.DOMPurify?.sanitize(cell.innerHTML, DOMPURIFY))
          ?? cell.innerHTML;
        tr.append(td);
      });
    }
    if (isHeaderRow) {
      thead.append(tr);
      headerRowProcessed = true;
    } else {
      tbody.append(tr);
    }
  });
}

function applyBackgroundToBlock(block, table, metadata) {
  const {
    backgroundColor, desktopImageUrl, mobileImageUrl, imageAlt,
  } = metadata;
  if (!backgroundColor && !desktopImageUrl && !mobileImageUrl) return;
  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'table-background-image';
  if (backgroundColor) {
    handleBackground({ text: normalizeBackgroundColor(backgroundColor) }, imageWrapper);
  }
  if (desktopImageUrl || mobileImageUrl) {
    handleBackgroundImages(desktopImageUrl || mobileImageUrl, mobileImageUrl || null, imageWrapper);
  }
  if (imageAlt) imageWrapper.dataset.imageAlt = imageAlt;
  block.append(imageWrapper);
  const scheme = getColorScheme(imageWrapper);
  if (scheme) {
    block.classList.add(scheme);
    table.classList.add(scheme);
  }
}

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  const rows = Array.from(block.children);
  const metadata = extractTableMetadata(block, rows);

  const table = document.createElement('table');
  const thead = NO_HEADER_VARIANTS.has(block.id) ? null : document.createElement('thead');
  const tbody = document.createElement('tbody');
  if (metadata.tableRowMaxWidth) table.style.maxWidth = metadata.tableRowMaxWidth;

  const dataRows = rows.slice(metadata.metadataCount).filter(isDataRow);
  buildTableRows(dataRows, thead, tbody);

  block.textContent = '';
  applyBackgroundToBlock(block, table, metadata);
  if (thead) table.append(thead);
  table.append(tbody);
  block.append(table);
}
