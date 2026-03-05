import { decorateButtons, readBlockConfig } from '../../scripts/aem.js';
import { loadFragment } from '../../scripts/scripts.js';

/** Get plain text from optional richtext/html string (strips tags, no script execution). */
function textFromRichtext(value) {
  if (value === null || value === undefined || value === '') return '';
  const s = String(value).trim();
  if (!s) return '';
  let out = '';
  let i = 0;
  while (i < s.length) {
    const start = s.indexOf('<', i);
    if (start === -1) {
      out += s.slice(i);
      break;
    }
    out += s.slice(i, start);
    const end = s.indexOf('>', start);
    i = end === -1 ? s.length : end + 1;
  }
  return out.trim();
}

/* eslint-disable secure-coding/no-hardcoded-credentials -- CSS classes/style props only */

/**
 * Checks if a string is a valid CSS color or gradient value
 * Accepts: hex, rgb/rgba, hsl/hsla, explicit gradients, design tokens, or web colors
 * - If value contains hyphens: treated as design token
 * - If value is letters only (no hyphens): treated as web color keyword
 * @param {string} value - The string to check
 * @returns {boolean} - True if the value is a color/gradient
 */
function isCssColorOrGradient(value) {
  if (!value) return false;
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();

  // Check for hex color (#fff, #ffffff, #ffffffff)
  if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) return true;

  // Check for rgb/rgba
  if (lower.startsWith('rgb(') || lower.startsWith('rgba(')) return true;

  // Check for hsl/hsla
  if (lower.startsWith('hsl(') || lower.startsWith('hsla(')) return true;

  // Check for explicit gradient definitions
  if (lower.startsWith('linear-gradient(')
      || lower.startsWith('radial-gradient(')
      || lower.startsWith('conic-gradient(')
      || lower.startsWith('repeating-linear-gradient(')
      || lower.startsWith('repeating-radial-gradient(')
      || lower.startsWith('repeating-conic-gradient(')) return true;

  // Check for design tokens (contains hyphens)
  // Accepts: var(--token-name), --token-name, or token-name
  if (trimmed.includes('-')) return true;

  // Check for web color keywords (letters only, no hyphens)
  // e.g., red, navy, transparent, rebeccapurple
  if (/^[a-z]+$/i.test(trimmed)) return true;

  return false;
}

/**
 * Normalizes a color/gradient value to proper CSS format
 * Converts design tokens to var(--token-name) format
 * @param {string} value - The raw value
 * @returns {string} - The normalized CSS value
 */
function normalizeCssColorValue(value) {
  if (!value) return value;
  const trimmed = value.trim();

  // Already a var() - return as-is
  if (trimmed.toLowerCase().startsWith('var(')) return trimmed;

  // If it contains hyphens, treat as design token and wrap in var()
  if (trimmed.includes('-')) {
    // Remove leading -- if present, then add var(--)
    const tokenName = trimmed.startsWith('--') ? trimmed.slice(2) : trimmed;
    return `var(--${tokenName})`;
  }

  // Otherwise return as-is (hex, rgb, hsl, gradient, web color)
  return trimmed;
}

/** Collapse hero and show first hotspot block (when "The Concept" is clicked). */
function showConceptHotspotBlock() {
  const hero = document.querySelector('.hero-heritage-cc');
  if (hero) hero.classList.toggle('hero-heritage-cc-collapsed');
  const firstBlock = document.getElementById('the-concept-hotspot')
    || document.querySelector('.hotspot-container .hotspot');
  if (firstBlock?.classList.contains('hotspot')) {
    firstBlock.style.display = 'block';
  }
}

/** Register global click listener for "The Concept" hash link (once per page). */
function setupConceptLinkListener() {
  if (document.body.dataset.heroConceptLinkListener) return;
  document.body.dataset.heroConceptLinkListener = 'true';
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href*="the-concept-hotspot"]');
    if (!link) return;
    const isHashLink = link.hash === '#the-concept-hotspot'
      || link.getAttribute('href')?.includes('the-concept-hotspot');
    if (!isHashLink) return;
    showConceptHotspotBlock();
  });
}

/** Set modal theme and asset data on block for modal links (e.g. fees). */
function setBlockModalTheme(block) {
  block.dataset.modalTheme = 'modal-mayura-blue';
  block.dataset.modalDialogBackgroundImageTexture = '/credit-card/metal-credit-card/media_15a8f844f87bf985cbf4471803bc87278ff6daa36.png';
  block.dataset.modalPageBackgroundImage = '/credit-card/metal-credit-card/media_1aa917044ef2aa165adb54e6ecc718b1cd83e80a4.png';
  block.dataset.modalPageDecorationImage = '/credit-card/metal-credit-card/media_13f68aa7e19d4532ae6d8a784fb5c4e140fb55d3e.svg';
}

/** True if the link's text looks like a URL (bare link to remove as duplicate). */
function isLinkTextUrl(link) {
  const text = link.textContent?.trim() ?? '';
  if (!text) return true;
  const hasProtocol = text.indexOf('://') > 0 && (text.startsWith('https') || text.startsWith('http'));
  return hasProtocol || link.href === text;
}

/** Add arrow icon span to an element. */
function appendArrowIcon(el) {
  const span = document.createElement('span');
  span.className = 'icon icon-arrow-right-white';
  const img = document.createElement('img');
  img.setAttribute('data-icon-name', 'arrow-right-white');
  img.src = '/icons/arrow-right-white.svg';
  img.alt = '';
  img.loading = 'lazy';
  span.appendChild(img);
  el.appendChild(span);
}

/** Attach modal open handler for /modals/ links. */
function attachModalClickHandler(block, link) {
  link.addEventListener('click', async (e) => {
    if (!link.href.includes('/modals/')) return;
    e.preventDefault();
    e.stopPropagation();
    const { openModal } = await import(`${window.hlx.codeBasePath}/blocks/modal/modal.js`);
    await openModal(link.href, {
      modalTheme: block.dataset.modalTheme,
      textureImage: block.dataset.modalDialogBackgroundImageTexture,
      pageBackgroundImage: block.dataset.modalPageBackgroundImage,
      decorationImage: block.dataset.modalPageDecorationImage,
    });
    setTimeout(() => {
      const modalDialog = document.querySelector('dialog.modal-mayura-blue[open]');
      if (modalDialog) {
        modalDialog.querySelectorAll('.section.table-container').forEach((section) => {
          section.style.removeProperty('background');
        });
      }
    }, 50);
  });
}

/** True if href is the apply CTA (mayura upgrade). */
function isApplyCtaHref(href) {
  return typeof href === 'string' && href.includes('mayura-upgrade');
}

/** True if href is the fees/modal CTA. */
function isFeesCtaHref(href) {
  return typeof href === 'string' && (href.includes('fee-and-charges') || href.includes('/modals/'));
}

/** Find apply and fees link elements in row. */
function findHeaderCtaLinks(row) {
  const allLinkPs = [...row.querySelectorAll('p:has(a)')];
  let applyLink = null;
  let applyLinkP = null;
  let feesLink = null;
  let feesLinkP = null;
  const toRemove = [];
  allLinkPs.forEach((p) => {
    const a = p.querySelector('a');
    if (!a) return;
    const href = a.href || '';
    const isUrlOnly = isLinkTextUrl(a);
    if (isApplyCtaHref(href)) {
      if (!applyLink) {
        applyLink = a;
        applyLinkP = p;
      } else if (isUrlOnly) toRemove.push(p);
    } else if (isFeesCtaHref(href)) {
      if (!feesLink) {
        feesLink = a;
        feesLinkP = p;
      } else if (isUrlOnly) toRemove.push(p);
    } else if (isUrlOnly) {
      toRemove.push(p);
    }
  });
  return {
    applyLink,
    applyLinkP,
    feesLink,
    feesLinkP,
    toRemove,
  };
}

/** Ensure row has a single inner div and return it. */
function ensureHeaderCtaContainer(row) {
  let inner = row.querySelector(':scope > div');
  if (!inner) {
    inner = document.createElement('div');
    row.appendChild(inner);
  }
  return inner;
}

function applyFirstCtaToContainer(container, applyLink, applyLinkP, firstCtaText, firstCtaHref) {
  if (applyLink && applyLinkP) {
    applyLink.textContent = firstCtaText;
    applyLink.classList.add('hero-heritage-cc-header-cta-link', 'button', 'primary');
    if (firstCtaHref) applyLink.href = firstCtaHref.trim();
    applyLinkP.classList.add('button-container');
    if (!applyLink.querySelector('.icon')) appendArrowIcon(applyLink);
    if (applyLinkP.parentNode !== container) container.appendChild(applyLinkP);
    return;
  }
  if (!firstCtaHref) return;
  const firstP = document.createElement('p');
  firstP.classList.add('button-container');
  const firstA = document.createElement('a');
  firstA.href = firstCtaHref.trim();
  firstA.textContent = firstCtaText;
  firstA.classList.add('hero-heritage-cc-header-cta-link', 'button', 'primary');
  appendArrowIcon(firstA);
  firstP.appendChild(firstA);
  container.appendChild(firstP);
}

function applySecondCtaToContainer(block, container, feesLink, feesLinkP, ctaText2, secondCtaHref) {
  if (feesLink && feesLinkP) {
    feesLink.classList.remove('button', 'primary');
    feesLink.classList.add('hero-heritage-cc-header-cta-fees-link');
    feesLink.textContent = feesLink.textContent?.trim() || ctaText2 || 'Fees and charges';
    feesLink.title = feesLink.textContent?.trim() || feesLink.title || '';
    feesLinkP.classList.remove('button-container');
    if (!feesLink.querySelector('.icon')) appendArrowIcon(feesLink);
    attachModalClickHandler(block, feesLink);
    if (feesLinkP.parentNode !== container) container.appendChild(feesLinkP);
    return;
  }
  if (!ctaText2 || !secondCtaHref) return;
  const secondP = document.createElement('p');
  const secondA = document.createElement('a');
  secondA.href = secondCtaHref.trim();
  secondA.textContent = ctaText2;
  secondA.title = ctaText2;
  secondA.classList.add('hero-heritage-cc-header-cta-fees-link');
  appendArrowIcon(secondA);
  attachModalClickHandler(block, secondA);
  secondP.appendChild(secondA);
  container.appendChild(secondP);
}

/** Build header CTA (arrow + second CTA from DOM or config), then decorateButtons. */
function buildHeaderCtaLinks(block, row, ctaContent, btnTxt) {
  const config = readBlockConfig(block);
  const firstCtaText = textFromRichtext(
    config['header-cta-text']
    ?? block.getAttribute('data-headercta-text')
    ?? block.getAttribute('data-header-cta-text'),
  ) || btnTxt;
  const firstCtaLinkRaw = config['header-cta-link']
    ?? block.getAttribute('data-headercta-link')
    ?? block.getAttribute('data-header-cta-link');
  const firstCtaHref = (typeof firstCtaLinkRaw === 'string' && firstCtaLinkRaw.trim())
    || (Array.isArray(firstCtaLinkRaw) && firstCtaLinkRaw[0])
    || '';
  const ctaText2 = textFromRichtext(
    config['header-cta-text-2']
    ?? block.getAttribute('data-headercta-text2')
    ?? block.getAttribute('data-header-cta-text2'),
  );
  const ctaLink2Raw = config['header-cta-link-2']
    ?? block.getAttribute('data-headercta-link2')
    ?? block.getAttribute('data-header-cta-link2');
  const secondCtaHref = (typeof ctaLink2Raw === 'string' && ctaLink2Raw.trim())
    || (Array.isArray(ctaLink2Raw) && ctaLink2Raw[0])
    || '';

  const {
    applyLink,
    applyLinkP,
    feesLink,
    feesLinkP,
    toRemove,
  } = findHeaderCtaLinks(row);
  toRemove.forEach((p) => {
    p.remove();
  });

  const container = ensureHeaderCtaContainer(row);
  applyFirstCtaToContainer(container, applyLink, applyLinkP, firstCtaText, firstCtaHref);
  decorateButtons(row);
  applySecondCtaToContainer(block, container, feesLink, feesLinkP, ctaText2, secondCtaHref);

  row.querySelectorAll('p:not(:has(a))').forEach((p) => {
    if (p.textContent?.trim() && !p.querySelector('picture, img')) p.remove();
  });
}

/** Decorate Section 1: Header CTA (Apply Now button + fees link). */
function decorateHeaderCta(block, row) {
  row.classList.add('hero-heritage-cc-header-cta');
  const ctaContent = row.querySelector(':scope > div');
  if (!ctaContent) return;

  const textParagraph = ctaContent.querySelector('p:not(:has(a))');
  const buttonText = textParagraph?.textContent?.trim() || 'Apply Now';
  buildHeaderCtaLinks(block, row, ctaContent, buttonText);
}

/** Apply background image from first picture to section (or UE preview). */
function applyIntroBackground(block, introContent, pictures) {
  const bgPicture = pictures[0];
  if (!bgPicture) return;

  const bgPictureWrapper = bgPicture.closest('p');
  const bgImg = bgPicture.querySelector('img');
  const isInUE = !!document.querySelector('main[data-aue-resource]');

  if (isInUE) {
    bgPicture.classList.add('hero-heritage-cc-intro-bg-preview');
    if (bgPictureWrapper) bgPictureWrapper.classList.add('hero-heritage-cc-intro-bg-preview-wrapper');
    return;
  }

  const webpSource = bgPicture.querySelector('source[type="image/webp"]');
  let bgUrl = webpSource?.srcset?.split(',')[0]?.trim()?.split(' ')[0] || bgImg?.src;
  if (bgUrl?.includes('optimize=medium')) {
    bgUrl = bgUrl.replace('optimize=medium', 'optimize=large');
  }

  if (bgUrl) {
    const sectionContainer = block.closest('.section');
    if (sectionContainer) {
      sectionContainer.style.backgroundImage = `url(${bgUrl})`;
      sectionContainer.style.backgroundSize = 'cover';
      sectionContainer.style.backgroundRepeat = 'repeat';
      sectionContainer.style.backgroundPosition = 'center center';
      sectionContainer.style.backgroundAttachment = 'fixed';
      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.as = 'image';
      preloadLink.href = bgUrl;
      preloadLink.fetchPriority = 'high';
      if (webpSource) preloadLink.type = 'image/webp';
      document.head.appendChild(preloadLink);
    }
  }

  bgPicture.remove();
  if (bgPictureWrapper) bgPictureWrapper.remove();
}

/** Apply decoration images from pictures[1] and pictures[2] to section. */
function applyIntroDecorations(block, pictures) {
  const sectionContainer = block.closest('.section');
  if (!sectionContainer) return;

  [1, 2].forEach((i) => {
    const pic = pictures[i];
    if (!pic) return;
    const img = pic.querySelector('img');
    const prop = i === 1 ? '--hero-heritage-cc-decoration-top-right' : '--hero-heritage-cc-decoration-bottom-left';
    if (img?.src) sectionContainer.style.setProperty(prop, `url(${img.src})`);
    pic.remove();
    const wrapper = pic.closest('p');
    if (wrapper) wrapper.remove();
  });
}

/** Wrap Hindi and English logo paragraphs in a single wrapper. */
function wrapIntroLogos(pictures) {
  const hindiLogoP = pictures[3]?.closest('p');
  const englishLogoP = pictures[4]?.closest('p');
  if (!hindiLogoP || !englishLogoP) return;

  hindiLogoP.classList.add('hero-heritage-cc-intro-logo-hindi');
  englishLogoP.classList.add('hero-heritage-cc-intro-logo-english');
  const logoWrapper = document.createElement('div');
  logoWrapper.classList.add('hero-heritage-cc-intro-logo-wrapper');
  hindiLogoP.parentNode.insertBefore(logoWrapper, hindiLogoP);
  logoWrapper.appendChild(hindiLogoP);
  logoWrapper.appendChild(englishLogoP);
}

/** Find gradient/color paragraph, set block data and CSS var; hide or show preview in UE. */
function processIntroGradientParagraphs(block, introContent, hasAueResource) {
  const paragraphs = introContent.querySelectorAll('p');
  paragraphs.forEach((p) => {
    if (p.querySelector('picture, a')) return;
    const text = p.textContent.trim();
    if (!isCssColorOrGradient(text)) return;

    const normalizedValue = normalizeCssColorValue(text);
    block.dataset.gradientColor = normalizedValue;
    block.style.setProperty('--hero-heritage-cc-intro-gradient', normalizedValue);
    if (hasAueResource) {
      p.classList.add('hero-heritage-cc-intro-gradient-preview');
    } else {
      p.remove();
    }
  });
}

/** Add credit card name class to headings after the first. */
function styleIntroCreditCardHeadings(introContent) {
  const allHeadings = introContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
  allHeadings.forEach((heading, index) => {
    if (index > 0) heading.classList.add('hero-heritage-cc-intro-credit-card-name');
  });
}

/** Decorate Section 2: Intro (text, background, logos, gradient, credit card name). */
function decorateIntro(block, row, hasAueResource) {
  row.classList.add('hero-heritage-cc-intro');
  const introContent = row.querySelector(':scope > div');
  if (!introContent) return;

  const introHeading = introContent.querySelector('h1, h2, h3, h4, h5, h6');
  if (introHeading) introHeading.classList.add('hero-heritage-cc-intro-text-top');

  const pictures = introContent.querySelectorAll('picture');
  applyIntroBackground(block, introContent, pictures);
  applyIntroDecorations(block, pictures);
  wrapIntroLogos(pictures);
  processIntroGradientParagraphs(block, introContent, hasAueResource);
  styleIntroCreditCardHeadings(introContent);
}

/** Setup banner curtain, concept container, and click handler for "The Concept" / Go back. */
function setupBannerConceptSwap(block, row) {
  const bannerDiv = row;
  const bannerInner = bannerDiv.querySelector(':scope > div');
  let conceptContainer = null;

  const bannerCurtain = document.createElement('div');
  bannerCurtain.classList.add('hero-heritage-cc-banner-curtain');
  bannerCurtain.style.clipPath = 'inset(0 0 0 0)';
  bannerCurtain.style.transition = 'clip-path 0.35s ease-out 0s forwards';
  bannerInner.appendChild(bannerCurtain);

  const bannerImage = bannerInner.querySelector('.hero-heritage-cc-banner-image');
  const bannerCtaGroup = bannerInner.querySelector('.hero-heritage-cc-banner-cta-group');
  bannerCurtain.appendChild(bannerImage);
  bannerCurtain.appendChild(bannerCtaGroup);

  const showOriginalBanner = () => {
    if (!conceptContainer) return;
    bannerInner.style.animation = 'none';
    bannerInner.style.opacity = '1';
    bannerInner.style.visibility = 'visible';
    conceptContainer.style.transform = 'translateY(100%)';
    conceptContainer.style.visibility = 'hidden';
    conceptContainer.style.opacity = '0';
    bannerCurtain.style.clipPath = 'inset(0 0 0 0)';
    setTimeout(() => {
      conceptContainer.style.display = 'none';
      conceptContainer.style.opacity = '';
      conceptContainer.style.transform = '';
      bannerDiv.classList.remove('hero-heritage-cc-banner-swapped');
    }, 350);
  };

  const showConceptView = () => {
    conceptContainer.style.display = '';
    conceptContainer.style.visibility = 'hidden';
    conceptContainer.style.opacity = '0';
    conceptContainer.style.transform = 'translateY(100%)';
    bannerCurtain.style.clipPath = 'inset(0 0 0 0)';
    // Force reflow so transition runs
    // eslint-disable-next-line no-unused-expressions -- intentional reflow
    conceptContainer.offsetHeight;
    conceptContainer.style.visibility = 'visible';
    conceptContainer.style.opacity = '1';
    conceptContainer.style.transform = 'translateY(0)';
    bannerCurtain.style.clipPath = 'inset(0 0 100% 0)';
    bannerDiv.classList.add('hero-heritage-cc-banner-swapped');
  };

  bannerDiv.addEventListener('click', async (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    if (link.href.endsWith('#') || link.getAttribute('href') === '#') {
      e.preventDefault();
      e.stopPropagation();
      showOriginalBanner();
      return;
    }
    if (!link.href.includes('/modals/')) return;
    if (link.classList.contains('primary')) return;

    e.preventDefault();
    e.stopPropagation();
    showConceptHotspotBlock();

    if (conceptContainer) {
      showConceptView();
      return;
    }

    const path = new URL(link.href).pathname;
    const fragment = await loadFragment(path);
    if (!fragment) return;

    const fragmentSections = fragment.querySelectorAll('.section');
    if (fragmentSections.length === 0) return;

    conceptContainer = document.createElement('div');
    conceptContainer.classList.add('hero-heritage-cc-concept-container');
    conceptContainer.style.display = 'none';

    fragmentSections.forEach((section, index) => {
      if (index > 0) section.style.display = 'none';
      conceptContainer.appendChild(section);
    });
    bannerDiv.appendChild(conceptContainer);

    const { setupModalInteractivity } = await import('../modal/modal.js');
    await setupModalInteractivity(conceptContainer);
    showConceptView();
  });
}

/** Decorate Section 3: Banner (logo, text, image, CTAs and concept swap). */
function decorateBanner(block, row) {
  row.classList.add('hero-heritage-cc-banner');
  const bannerContent = row.querySelector(':scope > div');
  if (bannerContent) {
    const pictures = bannerContent.querySelectorAll('picture');
    if (pictures[0]) pictures[0].closest('p')?.classList.add('hero-heritage-cc-banner-top-logo');
    if (pictures[1]) pictures[1].closest('p')?.classList.add('hero-heritage-cc-banner-image');
    const bannerHeading = bannerContent.querySelector('h1, h2, h3, h4, h5, h6');
    if (bannerHeading) bannerHeading.classList.add('hero-heritage-cc-banner-text');
    const buttonContainers = bannerContent.querySelectorAll('.button-container');
    if (buttonContainers.length > 0) {
      const ctaWrapper = document.createElement('div');
      ctaWrapper.classList.add('hero-heritage-cc-banner-cta-group');
      buttonContainers[0].parentNode.insertBefore(ctaWrapper, buttonContainers[0]);
      buttonContainers.forEach((btn) => {
        btn.classList.add('hero-heritage-cc-banner-cta');
        ctaWrapper.appendChild(btn);
      });
    }
  }

  setupBannerConceptSwap(block, row);
}

export default function decorate(block) {
  const mainElement = document.querySelector('main');
  const hasAueResource = mainElement?.hasAttribute('data-aue-resource');

  setupConceptLinkListener();
  setBlockModalTheme(block);

  const rows = [...block.children].filter((child) => child.tagName === 'DIV');
  if (rows[0]) decorateHeaderCta(block, rows[0]);
  if (rows[1]) decorateIntro(block, rows[1], hasAueResource);
  if (rows[2]) decorateBanner(block, rows[2]);
}
