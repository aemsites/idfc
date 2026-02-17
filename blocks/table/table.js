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
 * Checks if a text value represents a CSS color or gradient
 * @param {string} text - Text to check
 * @returns {boolean}
 */
function isBackgroundColor(text) {
  return text.startsWith('var(')
    || text.startsWith('#')
    || text.includes('gradient')
    || text.includes('rgb')
    || /^[0-9a-fA-F]{3,8}$/i.test(text)
    || /^(transparent|inherit|initial|unset)$/i.test(text);
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

  // Parse id from first single-column text row
  if (rows[0]?.children.length === 1) {
    const cell = rows[0].children[0];
    const text = cell.textContent?.trim();
    if (text && !cell.querySelector('picture')) {
      block.id = text;
      metadataCount = 1;
    }
  }

  // Parse background group cell (element grouping: color, desktop image+alt, mobile image)
  const bgRow = rows[metadataCount];
  if (bgRow?.children.length === 1) {
    const cell = bgRow.children[0];
    const pictures = Array.from(cell.querySelectorAll('picture'));

    if (pictures.length > 0) {
      // Desktop image (first picture, alt applied via field collapse)
      const desktopImg = pictures[0].querySelector('img');
      desktopImageUrl = desktopImg?.src || null;
      imageAlt = desktopImg?.alt || '';

      // Mobile image (second picture, if present)
      if (pictures.length > 1) {
        mobileImageUrl = pictures[1].querySelector('img')?.src || null;
      }

      // Background color from remaining text content
      const cellClone = cell.cloneNode(true);
      cellClone.querySelectorAll('picture').forEach((pic) => pic.remove());
      const colorText = cellClone.textContent?.trim();
      if (colorText) backgroundColor = colorText;

      metadataCount += 1;
    } else {
      // No images — check for color-only background
      const text = cell.textContent?.trim();
      if (text && isBackgroundColor(text)) {
        backgroundColor = text;
        metadataCount += 1;
      }
    }
  }

  const table = document.createElement('table');
  const noHeaderVariants = ['fees-and-charges', 'reward-points'];
  const thead = noHeaderVariants.includes(block.id) ? null : document.createElement('thead');
  const tbody = document.createElement('tbody');

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
    // Table: backgroundColor, image, imageMobile. Section: backgroundcolor,
    // sectionBackgroundImage, sectionBackgroundImageMobile.
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
