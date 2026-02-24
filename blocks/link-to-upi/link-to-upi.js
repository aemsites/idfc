import { DOMPURIFY } from '../../scripts/scripts.js';

/**
 * Extract block-level fields from rows. Each row is a div containing a single div with content.
 * @param {HTMLCollection|Element[]} rows Block children
 * @returns {{ title: string, text: string, image: Node|null, imageAlt: string }}
 */
function parseBlockFields(rows) {
  const getCell = (index) => rows[index]?.querySelector(':scope > div');
  const firstCell = getCell(0);
  const secondCell = getCell(1);
  const thirdCell = getCell(2);
  const fourthCell = getCell(3);

  let image = null;
  if (thirdCell) {
    const pictureElement = thirdCell.querySelector('picture');
    const imgElement = thirdCell.querySelector('img');
    image = (pictureElement || imgElement) ? (pictureElement || imgElement).cloneNode(true) : null;
  }

  return {
    title: firstCell?.textContent?.trim() || '',
    text: (window.DOMPurify?.sanitize(secondCell?.innerHTML || '', DOMPURIFY)) ?? (secondCell?.innerHTML || ''),
    image,
    imageAlt: fourthCell?.textContent?.trim() || '',
  };
}

/**
 * Build the link-to-upi container DOM from parsed fields.
 * @param {{ title: string, text: string, image: Node|null, imageAlt: string }} fields
 * @returns {Element}
 */
function buildContainer(fields) {
  const container = document.createElement('div');
  container.className = 'link-to-upi-container';

  if (fields.title) {
    const titleEl = document.createElement('h1');
    titleEl.className = 'link-to-upi-title';
    titleEl.textContent = fields.title;
    container.append(titleEl);
  }

  const imageSection = document.createElement('div');
  imageSection.className = 'link-to-upi-image';
  if (fields.image) {
    if (fields.imageAlt) {
      const img = fields.image.tagName === 'IMG' ? fields.image : fields.image.querySelector('img');
      if (img) img.alt = fields.imageAlt;
    }
    imageSection.append(fields.image);
  }
  container.append(imageSection);

  if (fields.text) {
    const textEl = document.createElement('div');
    textEl.className = 'link-to-upi-text';
    textEl.innerHTML = (window.DOMPurify?.sanitize(fields.text, DOMPURIFY))
      ?? fields.text;
    container.append(textEl);
  }

  return container;
}

export default function decorate(block) {
  const rows = Array.from(block.children);
  const fields = parseBlockFields(rows);
  block.innerHTML = (window.DOMPurify?.sanitize('', DOMPURIFY)) ?? '';
  block.append(buildContainer(fields));
}
