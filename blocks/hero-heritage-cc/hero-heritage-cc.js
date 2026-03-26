import { decorateButtons } from '../../scripts/aem.js';
import { loadFragment } from '../../scripts/scripts.js';

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

/** Decorate Section 1: Header CTA — show Header CTA Text (richtext) as-is in the container. */
function decorateHeaderCta(block, row) {
  row.classList.add('hero-heritage-cc-header-cta');
  decorateButtons(row);
}

/** Apply background image from first picture to section (or UE preview). Uses an img for LCP. */
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

  const sectionContainer = block.closest('.section');
  if (!sectionContainer || !bgUrl) {
    bgPicture.remove();
    if (bgPictureWrapper) bgPictureWrapper.remove();
    return;
  }

  /* Preload only if not already added by scripts.js (early LCP preload) */
  const existingPreload = document.querySelector(`head > link[rel="preload"][as="image"][href="${bgUrl}"]`);
  if (!existingPreload) {
    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.as = 'image';
    preloadLink.href = bgUrl;
    preloadLink.fetchPriority = 'high';
    if (webpSource) preloadLink.type = 'image/webp';
    document.head.insertBefore(preloadLink, document.head.firstChild);
  }

  /* Keep an img in the DOM as the LCP element (better than CSS background for PageSpeed) */
  const layer = document.createElement('div');
  layer.className = 'hero-heritage-cc-bg-layer';
  layer.setAttribute('aria-hidden', 'true');
  sectionContainer.insertBefore(layer, sectionContainer.firstChild);
  if (bgPictureWrapper) {
    layer.appendChild(bgPictureWrapper);
  } else {
    layer.appendChild(bgPicture);
  }
  if (bgImg) {
    bgImg.setAttribute('fetchpriority', 'high');
    bgImg.setAttribute('loading', 'eager');
  }
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
    block.style.setProperty('--hero-heritage-cc-intro-gradient', normalizedValue); // change to --gradient-heritage-cc-intro?
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
