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

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  const rows = Array.from(block.children);
  let metadataCount = 0;
  let backgroundColor = '';
  let desktopImageUrl = null;
  let mobileImageUrl = null;
  let imageAlt = '';
  let tableRowMaxWidth = '';

  // Parse grouped background cell (background_color, background_image/Alt, background_imageMobile)
  if (rows[0]?.children.length === 1) {
    const cell = rows[0].children[0];
    const pictures = cell.querySelectorAll('picture');
    const textContent = [...cell.childNodes]
      .filter((n) => (n.nodeType === Node.TEXT_NODE
        || (n.tagName === 'P' && !n.querySelector('picture, img'))))
      .map((n) => n.textContent.trim())
      .find((t) => t) || '';
    const isColorOrGradient = textContent && (textContent.startsWith('var(')
      || textContent.startsWith('#') || textContent.includes('gradient')
      || textContent.includes('rgb') || textContent.match(/^[0-9a-fA-F]{3,6}$/i)
      || textContent.match(/^(transparent|inherit|initial|unset)$/i));

    if (pictures.length > 0 || isColorOrGradient) {
      if (pictures[0]) desktopImageUrl = extractImageUrl(pictures[0]);
      if (pictures[1]) mobileImageUrl = extractImageUrl(pictures[1]);
      const img = cell.querySelector('img');
      if (img?.alt) imageAlt = img.alt;
      if (isColorOrGradient) backgroundColor = textContent;
      metadataCount = 1;
    }
  }

  // Parse tableRowMaxWidth
  if (rows[metadataCount]?.children.length === 1) {
    const cell = rows[metadataCount].children[0];
    const text = cell.textContent?.trim();
    if (text?.match(/^\d+px$/)) {
      tableRowMaxWidth = text;
      metadataCount += 1;
    }
  }

  const table = document.createElement('table');
  const noHeaderVariants = ['fees-and-charges', 'reward-points'];
  const hasNoHeader = noHeaderVariants.some((v) => block.classList.contains(v));
  const thead = hasNoHeader ? null : document.createElement('thead');
  const tbody = document.createElement('tbody');

  if (tableRowMaxWidth) {
    table.style.maxWidth = tableRowMaxWidth;
  }

  // Filter out empty rows (rows where all cells have no content)
  const dataRows = rows.slice(metadataCount).filter((row) => {
    if (!row.children?.length) return false;
    const cells = Array.from(row.children);
    return cells.some((cell) => cell.textContent?.trim() || cell.querySelector('img, picture'));
  });

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
      cell.innerHTML = firstCell.innerHTML;
      tr.append(cell);
    } else {
      cells.forEach((cell) => {
        const td = document.createElement(isHeaderRow ? 'th' : 'td');
        if (isHeaderRow) td.setAttribute('scope', 'column');
        td.innerHTML = cell.innerHTML;
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

  block.textContent = '';

  if (backgroundColor || desktopImageUrl || mobileImageUrl) {
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'table-background-image';

    // Same logic as Section: handleBackground + handleBackgroundImages.
    // Table: background_color, background_image, background_imageMobile.
    // Section: backgroundcolor, sectionBackgroundImage, sectionBackgroundImageMobile.
    if (backgroundColor) {
      const normalizedColor = normalizeBackgroundColor(backgroundColor);
      handleBackground({ text: normalizedColor }, imageWrapper);
    }

    if (desktopImageUrl || mobileImageUrl) {
      // desktopUrl required; use mobile as fallback when only mobile image set
      const desktopUrl = desktopImageUrl || mobileImageUrl;
      const mobileUrl = mobileImageUrl || null;
      handleBackgroundImages(desktopUrl, mobileUrl, imageWrapper);
    }

    if (imageAlt) imageWrapper.dataset.imageAlt = imageAlt;
    block.append(imageWrapper);

    // setColorScheme(imageWrapper) only applies to imageWrapper's direct children (the picture).
    // The table is a sibling, not a child, so apply scheme to block and table so content gets it.
    const scheme = getColorScheme(imageWrapper);
    if (scheme) {
      block.classList.add(scheme);
      table.classList.add(scheme);
    }
  }

  if (thead) table.append(thead);
  table.append(tbody);
  block.append(table);
}
