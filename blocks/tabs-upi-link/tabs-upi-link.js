// eslint-disable-next-line import/no-unresolved
import { toClassName } from '../../scripts/aem.js';
import { ensureDOMPurify, moveInstrumentation, DOMPURIFY } from '../../scripts/scripts.js';

/**
 * Returns a fallback video URL for DAM paths. When the primary URL is /content/dam/...,
 * EDS/preview often returns 404; the fallback points to the same filename under
 * /blocks/tabs-upi-link/ so the repo file can be used.
 * @param {string} primaryUrl - Absolute video URL (e.g. from AEM picker)
 * @returns {string|null} Fallback URL or null if primary is not a DAM path
 */
function getBlockFallbackVideoUrl(primaryUrl) {
  try {
    const u = new URL(primaryUrl);
    if (!u.pathname.includes('/content/dam/')) return null;
    const filename = u.pathname.split('/').filter(Boolean).pop();
    if (!filename?.toLowerCase().endsWith('.mp4')) return null;
    return new URL(`/blocks/tabs-upi-link/${filename}`, u.origin).href;
  } catch {
    return null;
  }
}

/**
 * Creates a looping, muted, autoplay video element for the phone animation.
 * If fallbackUrl is provided and the initial source fails (e.g. 404), switches to fallback once.
 * @param {string} videoSrc - Initial video URL
 * @param {string|null} [fallbackUrl] - Optional URL to try if the initial source fails
 * @returns {HTMLVideoElement}
 */
function createVideoElement(videoSrc, fallbackUrl = null) {
  const video = document.createElement('video');
  video.className = 'phone-animation-video';
  video.setAttribute('loop', '');
  video.setAttribute('muted', '');
  video.setAttribute('autoplay', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('preload', 'auto');
  video.muted = true;
  const source = document.createElement('source');
  source.src = videoSrc;
  source.type = 'video/mp4';
  video.appendChild(source);

  if (fallbackUrl) {
    video.addEventListener('error', () => {
      const srcEl = video.querySelector('source');
      if (srcEl) {
        srcEl.src = fallbackUrl;
        video.load();
        video.play().catch(() => {});
      }
    }, { once: true });
  }

  return video;
}

/**
 * Remove the .mp4 link from the DOM (prefer removing parent p if present).
 * @param {HTMLAnchorElement} link - The link element to remove
 */
function removeMp4LinkFromDom(link) {
  const p = link.closest('p');
  if (p) p.remove();
  else link.remove();
}

/**
 * Try to get video URL from an anchor with .mp4 href. Removes the link from DOM on success.
 * @param {HTMLAnchorElement|null} link - Link element
 * @returns {string|null} Absolute video URL or null
 */
function getVideoUrlFromMp4Link(link) {
  if (!link) return null;
  const raw = link.getAttribute('href');
  if (!raw) return null;
  try {
    const url = new URL(raw, window.location.href).href;
    removeMp4LinkFromDom(link);
    return url;
  } catch {
    if (link.href) {
      removeMp4LinkFromDom(link);
      return link.href;
    }
    return null;
  }
}

/**
 * Try to get video URL from legacy paragraph text (plain URL ending in .mp4). Removes p on success.
 * @param {HTMLElement} phoneGroupDiv - Container to search for p
 * @returns {string|null} Video URL or null
 */
function getVideoUrlFromLegacyParagraph(phoneGroupDiv) {
  const p = phoneGroupDiv.querySelector('p');
  if (!p) return null;
  const text = p.textContent.trim();
  // eslint-disable-next-line browser-security/detect-mixed-content -- localhost is valid
  if (text.endsWith('.mp4') && (text.startsWith('http://localhost') || text.startsWith('https://'))) {
    p.remove();
    return text;
  }
  return null;
}

/**
 * Gets the phone animation video URL from the phone group div (picture + .mp4 link).
 * Removes the link from the DOM so it is not shown. Supports AEM picker links and
 * legacy plain HTTP(S) URLs in a paragraph.
 * @param {HTMLElement} phoneGroupDiv - Block child containing picture and an .mp4 link
 * @returns {string|null} Absolute video URL or null
 */
function getPhoneVideoUrlFromPhoneGroup(phoneGroupDiv) {
  const link = phoneGroupDiv.querySelector('a[href*=".mp4"]');
  const fromLink = link ? getVideoUrlFromMp4Link(link) : null;
  if (fromLink) return fromLink;
  return getVideoUrlFromLegacyParagraph(phoneGroupDiv);
}

/**
 * @param {HTMLElement[]} children
 * @returns {{ titleDiv: HTMLElement|undefined, imageDiv: HTMLElement|undefined,
 *   phoneGroupDiv: HTMLElement|null, pictureSourceDiv: HTMLElement|undefined|null }}
 */
function getBlockStructure(children) {
  const titleDiv = children.find((child) => child.querySelector('h2'));
  const imageDiv = children.find((child) => {
    const hasPicture = child.querySelector('picture');
    const hasOtherContent = child.querySelector('h2, h3, p');
    return hasPicture && !hasOtherContent;
  });
  const phoneGroupDiv = !imageDiv && titleDiv
    ? children.find((child) => child !== titleDiv && child.querySelector('picture') && child.querySelector('a[href*=".mp4"]'))
    : null;
  const pictureSourceDiv = imageDiv || phoneGroupDiv;
  return {
    titleDiv, imageDiv, phoneGroupDiv, pictureSourceDiv,
  };
}

/**
 * Build tablist buttons and populate tabNames map.
 * @param {HTMLElement} block
 * @param {HTMLElement[]} tabPanels
 * @param {HTMLElement} tablist
 * @param {Map<number, string>} tabNames
 */
function buildTabButtons(block, tabPanels, tablist, tabNames) {
  tabPanels.forEach((tabpanel, i) => {
    const firstChildDiv = tabpanel.querySelector(':scope > div:first-child');
    if (!firstChildDiv) return;

    const tabNameElement = firstChildDiv.querySelector('p');
    if (!tabNameElement) return;

    const tabName = tabNameElement.textContent.trim();
    if (!tabName) return;

    tabNames.set(i, i === 0 ? 'the app' : tabName);
    const id = toClassName(tabName);

    tabpanel.className = 'tabs-panel';
    tabpanel.id = `tabpanel-${id}`;
    tabpanel.setAttribute('aria-hidden', !!i);
    tabpanel.setAttribute('aria-labelledby', `tab-${id}`);
    tabpanel.setAttribute('role', 'tabpanel');

    const button = document.createElement('button');
    button.className = 'tabs-tab';
    button.id = `tab-${id}`;
    moveInstrumentation(tabNameElement.parentElement, tabpanel.lastElementChild);
    const tabLabelHtml = `<p>${tabNameElement.innerHTML}</p>`;
    button.innerHTML = window.DOMPurify.sanitize(tabLabelHtml, DOMPURIFY);

    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.setAttribute('aria-selected', !i);
    button.setAttribute('role', 'tab');
    button.setAttribute('type', 'button');
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-selected') === 'true') return;
      block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
        panel.setAttribute('aria-hidden', true);
      });
      tablist.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-selected', false);
      });
      tabpanel.setAttribute('aria-hidden', false);
      button.setAttribute('aria-selected', true);
    });
    tablist.append(button);
    firstChildDiv.remove();
    const buttonP = button.querySelector('p');
    if (buttonP) moveInstrumentation(buttonP, null);
  });
}

/**
 * Build image section and mobile panel layout when picture source exists.
 * @param {HTMLElement} pictureSourceDiv
 * @param {HTMLElement[]} tabPanels
 * @param {HTMLElement} tabsWrapper
 */
function buildImageAndMobilePanels(pictureSourceDiv, tabPanels, tabsWrapper) {
  if (!pictureSourceDiv) return;
  const picture = pictureSourceDiv.querySelector('picture');
  if (!picture) return;

  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'tabs-upi-link-image';
  imageWrapper.appendChild(picture.cloneNode(true));
  const videoContainer = document.createElement('div');
  videoContainer.className = 'phone-animation-video-container';
  imageWrapper.appendChild(videoContainer);
  tabsWrapper.appendChild(imageWrapper);

  tabPanels.forEach((tabpanel) => {
    const mobileImageWrapper = document.createElement('div');
    mobileImageWrapper.className = 'tabs-upi-link-panel-image';
    mobileImageWrapper.appendChild(picture.cloneNode(true));
    const mobileVideoContainer = document.createElement('div');
    mobileVideoContainer.className = 'phone-animation-video-container mobile';
    mobileImageWrapper.appendChild(mobileVideoContainer);

    const buttonContainer = tabpanel.querySelector('.button-container');
    if (buttonContainer) buttonContainer.remove();

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'tabs-upi-link-panel-content';
    while (tabpanel.firstChild) {
      contentWrapper.appendChild(tabpanel.firstChild);
    }
    const topSection = document.createElement('div');
    topSection.className = 'tabs-upi-link-panel-top';
    topSection.appendChild(mobileImageWrapper);
    topSection.appendChild(contentWrapper);
    tabpanel.appendChild(topSection);
    if (buttonContainer) tabpanel.appendChild(buttonContainer);
  });
}

/**
 * Attach video elements to all .phone-animation-video-container in the block.
 * @param {HTMLElement} block
 */
function attachVideosToBlock(block) {
  const videoPath = block.dataset.phoneVideoUrl;
  if (!videoPath) return;

  const fallbackUrl = getBlockFallbackVideoUrl(videoPath);
  let useFallbackFirst = false;
  try {
    useFallbackFirst = Boolean(fallbackUrl && new URL(videoPath).pathname.includes('/content/dam/'));
  } catch {
    // ignore
  }
  const initialUrl = useFallbackFirst ? fallbackUrl : videoPath;
  const errorFallbackUrl = useFallbackFirst ? null : fallbackUrl;
  block.querySelectorAll('.phone-animation-video-container').forEach((container) => {
    container.appendChild(createVideoElement(initialUrl, errorFallbackUrl));
  });
}

export default async function decorate(block) {
  if (block.querySelector('.tabs-list')) return;

  await ensureDOMPurify();

  const children = [...block.children];
  const { titleDiv, phoneGroupDiv, pictureSourceDiv } = getBlockStructure(children);

  if (phoneGroupDiv) {
    const videoUrl = getPhoneVideoUrlFromPhoneGroup(phoneGroupDiv);
    if (videoUrl) block.dataset.phoneVideoUrl = videoUrl;
  }

  children.forEach((child) => {
    if (child.classList.contains('tabs-panel')) {
      child.classList.remove('tabs-panel');
      child.removeAttribute('id');
      child.removeAttribute('aria-hidden');
      child.removeAttribute('aria-labelledby');
      child.removeAttribute('role');
    }
  });

  const tabPanels = children.filter((child) => child !== titleDiv && child !== pictureSourceDiv);
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');
  const tabNames = new Map();
  buildTabButtons(block, tabPanels, tablist, tabNames);

  const tabsWrapper = document.createElement('div');
  tabsWrapper.className = 'tabs-upi-link-content';
  buildImageAndMobilePanels(pictureSourceDiv, tabPanels, tabsWrapper);

  const tabsContainer = document.createElement('div');
  tabsContainer.className = 'tabs-upi-link-tabs';
  if (tablist.children.length > 0) tabsContainer.appendChild(tablist);

  let tabIndex = 0;
  tabPanels.forEach((tabpanel) => {
    tabsContainer.appendChild(tabpanel);
    const qrPicture = tabpanel.querySelector('.tabs-upi-link-panel-content picture');
    const tabLabel = tabNames.get(tabIndex);
    if (qrPicture && tabLabel) {
      const qrText = document.createElement('p');
      qrText.className = 'tabs-upi-link-qr-text';
      qrText.textContent = `Scan the QR code to open ${tabLabel}`;
      const qrWrapper = document.createElement('div');
      qrWrapper.className = 'tabs-upi-link-qr-wrapper';
      qrPicture.parentNode.insertBefore(qrWrapper, qrPicture);
      qrWrapper.appendChild(qrPicture);
      qrWrapper.appendChild(qrText);
    }
    tabIndex += 1;
  });

  tabsWrapper.appendChild(tabsContainer);
  block.textContent = '';

  if (titleDiv) {
    const titleWrapper = document.createElement('div');
    titleWrapper.className = 'tabs-upi-link-title';
    titleWrapper.appendChild(titleDiv);
    block.appendChild(titleWrapper);
  }
  block.appendChild(tabsWrapper);

  function updateScanToTap() {
    const isMobile = window.matchMedia('(max-width: 899px)').matches;
    block.querySelectorAll('.tabs-panel h3').forEach((h3) => {
      const text = h3.textContent;
      h3.textContent = isMobile ? text.replace(/Scan/g, 'Tap') : text.replace(/Tap/g, 'Scan');
    });
  }
  updateScanToTap();
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateScanToTap, 150);
  });

  attachVideosToBlock(block);
}
