import {
  loadHeader,
  loadFooter,
  buildBlock,
  decorateBlock,
  decorateButtons,
  decorateIcons,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadBlock,
  loadSection,
  loadSections,
  loadCSS,
  loadScript,
  getMetadata,
  DOMPURIFY,
  // readBlockConfig,
  pickPicturePreloadUrl,
  toCamelCase,
} from './aem.js';

export { DOMPURIFY };

// Max collection size before iteration to prevent DoS from excessive loops (CWE-400)
const MAX_ITERATION_LIMIT = 500;

// DOMPurify loaded once for HTML sanitization (mitigates DOM XSS from contentMap/dataset)
let domPurifyReady = null;

/**
 * Ensures DOMPurify is loaded. Resolves with the script load. Safe to call multiple times.
 * @returns {Promise<void>}
 */
export async function ensureDOMPurify() {
  if (!domPurifyReady) {
    const base = window.hlx?.codeBasePath ?? '';
    domPurifyReady = loadScript(`${base}/scripts/dompurify.min.js`);
  }
  return domPurifyReady;
}

// Cached media query results for Section performance
const MEDIA_QUERIES = {
  mobile: window.matchMedia('(max-width: 599px)'),
  tablet: window.matchMedia('(min-width: 600px) and (max-width: 989px)'),
  desktop: window.matchMedia('(min-width: 990px)'),
};

const PROD_ORIGIN = 'https://www.idfcfirst.bank.in';

function makeProdUrl(href) {
  if (!href || href.startsWith('#')) return href;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href)) {
    try {
      const url = new URL(href);
      if (url.origin.toLowerCase().includes('ww2.idfcfirst.bank.in')) {
        return new URL(url.pathname + url.search + url.hash, PROD_ORIGIN).toString();
      }
    } catch (e) { /* invalid URL */
      // eslint-disable-next-line no-console
      console.error(`Invalid URL: ${href}`, e);
    }
    return href;
  }
  return new URL(href, PROD_ORIGIN).toString();
}

/**
 * Open PDF links and my.idfcfirst links in a new tab
 * @param {Element} a the anchor element to process
 */
export function processLink(a) {
  if (a.href && (a.href.includes('.pdf') || a.href.includes('my.idfcfirst'))) {
    a.target = '_blank';
  }
}

/**
 * Process all links in a container (defaults to entire document)
 * @param {Element} container the container element to search for links
 */
export function processLinks(container = document) {
  container.querySelectorAll('a').forEach(processLink);
}

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to?.setAttribute(attr, value);
      from?.removeAttribute(attr);
    }
  });
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

// Purpose of this function is to copy all attributes from source element to target element.
// This is used to copy all attributes from a tab section to the new section.
export function moveAllAttributes(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName),
  );
}

/* add a block id_number to a block instance (when any decorate(block) defines it)
  to be used for martech tracking, aria-controls, aria-labelledby, etc.
*/
const blockIds = new Map();
export function getBlockId(name) {
  const forBlock = blockIds.get(name) ?? 0;
  blockIds.set(name, forBlock + 1);
  return `${name}_${forBlock}`;
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
}

/**
 * Build modal options from parent block with modal theme data attributes.
 * @param {Element} origin Link element to find parent theme container
 * @returns {Object} Modal options object
 */
function getModalOptionsFromParent(origin) {
  const modalOptions = {};
  const parentWithTheme = origin.closest('[data-modal-theme]');
  if (!parentWithTheme?.dataset) return modalOptions;

  const { dataset } = parentWithTheme;
  if (dataset.modalTheme) modalOptions.modalTheme = dataset.modalTheme;
  if (dataset.modalDialogBackgroundImageTexture) {
    modalOptions.textureImage = dataset.modalDialogBackgroundImageTexture;
  }
  if (dataset.modalPageBackgroundImage) {
    modalOptions.pageBackgroundImage = dataset.modalPageBackgroundImage;
  }
  if (dataset.modalPageDecorationImage) {
    modalOptions.decorationImage = dataset.modalPageDecorationImage;
  }
  return modalOptions;
}

/**
 * Autolinks modals
 * @param {Element} element The element to autolink modals
 */
function autolinkModals(element) {
  element.addEventListener('click', async (e) => {
    const origin = e.target.closest('a');
    const isModalLink = origin?.href?.includes('/modals/');

    if (!isModalLink) return;

    e.preventDefault();
    e.stopPropagation();

    const modalOptions = getModalOptionsFromParent(origin);
    const { openModal } = await import(`${window.hlx.codeBasePath}/blocks/modal/modal.js`);
    openModal(origin.href, modalOptions);
  });
}

/**
 * Loads a fragment.
 * @param {string} path The path to the fragment
 * @returns {Promise<HTMLElement|null>} Resolves with the root element of the fragment, or null
 */
// eslint-disable-next-line import/prefer-default-export
export async function loadFragment(path) {
  if (path?.startsWith('/')) {
    // eslint-disable-next-line no-param-reassign
    path = path.replace(/(\.plain)?\.html/, '');
    const resp = await fetch(`${path}.plain.html`);
    if (resp.ok) {
      await ensureDOMPurify();
      const main = document.createElement('main');
      main.innerHTML = window.DOMPurify.sanitize(await resp.text(), DOMPURIFY);

      // reset base path for media to fragment base (whitelist attr to avoid prototype pollution)
      const resetAttributeBase = (tag, attr) => {
        if (attr !== 'src' && attr !== 'srcset') return;
        main.querySelectorAll(`${tag}[${attr}^="./media_"]`).forEach((elem) => {
          const { href } = new URL(elem.getAttribute(attr), new URL(path, window.location));
          if (attr === 'src') elem.src = href;
          else if (attr === 'srcset') elem.srcset = href;
        });
      };
      resetAttributeBase('img', 'src');
      resetAttributeBase('source', 'srcset');

      // Mark category-nav blocks to skip loading in fragments
      // They will be loaded explicitly when injected into the page
      const categoryNavBlocks = main.querySelectorAll('.category-nav');
      categoryNavBlocks.forEach((block) => {
        block.dataset.fragmentBlock = 'true';
      });

      // eslint-disable-next-line
      decorateMain(main);
      await loadSections(main);
      processLinks(main);
      return main;
    }
  }
  return null;
}

export default async function decorateFragment(block) {
  const link = block.querySelector('a');
  const path = link ? link.getAttribute('href') : block.textContent.trim();
  const fragment = await loadFragment(path);
  if (fragment) {
    const fragmentSection = fragment.querySelector(':scope .section');
    if (fragmentSection) {
      block.classList.add(...fragmentSection.classList);
      block.classList.remove('section');
      block.replaceChildren(...fragmentSection.childNodes);
    }
  }
}

/**
 * Handle button groups: wrap button with preceding superscript text
 * This allows text (in superscript) and button to be moved together in responsive layouts
 * @param {Element} element container element
 */
function decorateButtonGroups(element) {
  element.querySelectorAll('p.button-container').forEach((buttonContainer) => {
    // Check if this button container hasn't already been grouped
    if (buttonContainer.parentElement?.classList.contains('button-group')) {
      return;
    }

    // Check if the previous sibling is a <p> containing a <sup>
    const previousSibling = buttonContainer.previousElementSibling;
    if (previousSibling?.tagName === 'P'
      && previousSibling.querySelector('sup')) {
      // Create a new div with class 'button-group'
      const buttonGroup = document.createElement('div');
      buttonGroup.className = 'button-group';

      // Insert the new div before the previous sibling
      buttonContainer.parentElement.insertBefore(buttonGroup, previousSibling);

      // Move both elements into the button-group
      buttonGroup.appendChild(previousSibling);
      buttonGroup.appendChild(buttonContainer);
    }
  });
}

/**
 * Preload hero-heritage-cc LCP background image before block JS and before template work,
 * matching URL/row logic in blocks/hero-heritage-cc/hero-heritage-cc.js (intro = 2nd DIV row).
 * Also sets fetchpriority/loading on the intro img so the request competes earlier than loadBlock.
 */
function preloadHeroHeritageCcLcpImage(main) {
  if (!main || document.querySelector('main[data-aue-resource]')) {
    return;
  }
  const block = main.querySelector('.hero-heritage-cc');
  if (!block) return;
  const rows = [...block.children].filter((c) => c.tagName === 'DIV');
  const introRow = rows[1];
  if (!introRow) return;
  const introContent = introRow.querySelector(':scope > div');
  const firstPicture = introContent?.querySelector('picture');
  if (!firstPicture) return;
  const img = firstPicture.querySelector('img');
  const { url: urlRaw, source: matchedWebpSource } = pickPicturePreloadUrl(firstPicture, 'image/webp');
  const url = urlRaw || img?.src || '';
  if (!url) return;
  const existingPreload = document.querySelector(`head > link[rel="preload"][as="image"][href="${url}"]`);
  if (!existingPreload) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    /* Property + attribute: Lighthouse reads the DOM attribute on the preload hint. */
    link.fetchPriority = 'high';
    link.setAttribute('fetchpriority', 'high');
    if (matchedWebpSource || url.includes('format=webply')) link.type = 'image/webp';
    document.head.insertBefore(link, document.head.firstChild);
  }

  if (img) {
    img.setAttribute('fetchpriority', 'high');
    img.setAttribute('loading', 'eager');
  }
}

function prepareHeroForCLS(main) {
  if (!window.matchMedia('(min-width: 900px)').matches) {
    return;
  }
  main.querySelectorAll('.hero').forEach((block) => {
    if (block.dataset.heroPrepared === 'true') return;

    const picture = block.querySelector('picture');
    if (picture) {
      const pictureParent = picture.parentElement;
      if (pictureParent) {
        pictureParent.remove();
        block.appendChild(picture);
      }
    }

    const buttonGroups = block.querySelectorAll('.button-group');
    if (buttonGroups.length > 0 && !block.querySelector('.button-groups-wrapper')) {
      const buttonGroupsWrapper = document.createElement('div');
      buttonGroupsWrapper.className = 'button-groups-wrapper';
      const firstGroup = buttonGroups[0];
      firstGroup.parentElement.insertBefore(buttonGroupsWrapper, firstGroup);
      buttonGroups.forEach((group) => {
        buttonGroupsWrapper.appendChild(group);
      });
    }

    block.dataset.heroPrepared = 'true';
  });
}

/**
 * Check if we're viewing a framework page (either in Universal Editor or directly)
 * Framework pages are template/fragment pages and should display their raw content
 * @returns {boolean} True if viewing a framework page
 */
function isEditingFrameworkPage() {
  // Check if current path is in the framework folder
  // The path could be /framework/* or /content/idfc-edge/framework/*
  const isFrameworkPath = window.location.pathname.includes('/framework/');

  return isFrameworkPath;
}

/**
 * Load and inject category navigation fragment from page metadata
 * Reads the 'category-nav' page metadata field and injects the referenced fragment
 * @param {Element} main The main element
 */
async function loadCategoryNavFragment(main) {
  // Skip loading fragments when viewing framework pages
  // Framework pages are templates/fragments and should display their raw content
  if (isEditingFrameworkPage()) {
    return;
  }

  // Read the category-nav metadata value from the page
  const categoryNavPath = getMetadata('category-nav');

  if (!categoryNavPath) {
    return;
  }

  try {
    // Load the fragment content
    const fragment = await loadFragment(categoryNavPath);

    if (!fragment) {
      // eslint-disable-next-line no-console
      console.error(`[Category Nav Fragment] Failed to load fragment from: ${categoryNavPath}`);
      return;
    }

    // Get all sections from the fragment
    const fragmentSections = fragment.querySelectorAll(':scope > .section');

    if (fragmentSections.length === 0) {
      return;
    }

    // Insert all fragment sections at the beginning of main
    // They should be inserted before any existing content
    const { firstChild } = main;
    fragmentSections.forEach((section) => {
      // Clone the section to avoid moving it from the fragment
      const sectionClone = section.cloneNode(true);

      // Add semantic classes to sections containing category-nav blocks
      const categoryNavBlock = sectionClone.querySelector('.category-nav');
      if (categoryNavBlock) {
        // Remove the fragment-block marker so it can be loaded on the page
        delete categoryNavBlock.dataset.fragmentBlock;
        // Reset block status so it can be loaded explicitly later
        categoryNavBlock.dataset.blockStatus = '';

        // Add class to identify this as a category navigation section
        sectionClone.classList.add('category-nav-section');

        // Find the category title and add a class
        const titleWrapper = sectionClone.querySelector('.default-content-wrapper');
        if (titleWrapper) {
          titleWrapper.classList.add('category-title-wrapper');
          const titleElement = titleWrapper.querySelector('p, h1, h2, h3, h4, h5, h6');
          if (titleElement) {
            titleElement.classList.add('category-title');
            // Add data attribute with the category name
            const categoryName = titleElement.textContent.trim();
            sectionClone.dataset.categoryName = categoryName;
          }
        }

        // Add class to the wrapper containing the block
        const blockWrapper = sectionClone.querySelector('.category-nav-wrapper');
        if (blockWrapper) {
          blockWrapper.classList.add('category-nav-block-wrapper');
        }
      }

      if (firstChild) {
        firstChild.before(sectionClone);
      } else {
        main.appendChild(sectionClone);
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Category Nav Fragment] Error loading fragment:', error);
  }
}

/**
 * check if link text is same as the href
 * @param {Element} link the link element
 * @returns {boolean} true or false
 */
export function linkTextIncludesHref(link) {
  const href = link.getAttribute('href');
  const textcontent = link.textContent;

  return textcontent.includes(href);
}

/**
 * Builds 'embed' blocks when non-fragment links are encountered
 * @param {Element} main The container element
 */
export function buildEmbedBlocks(main) {
  const embedPlatforms = /youtu\.be|youtu|vimeo|twitter\.com/;
  main.querySelectorAll('a[href]').forEach((a) => {
    if (embedPlatforms.test(a.href) && linkTextIncludesHref(a)) {
      const embedBlock = buildBlock('embed', a.cloneNode(true));
      a.replaceWith(embedBlock);
      decorateBlock(embedBlock);
    }
  });
}

function loadAutoBlock(doc) {
  doc.querySelectorAll('a').forEach((a) => {
    if (a?.href?.includes('/fragments/')) {
      decorateFragment(a.parentElement);
    }
  });
}

/**
 * Loads a template.
 * @param {Element} doc The container element
 * @param {string} templateName The name of the template
 */
async function loadTemplate(doc, templateName) {
  try {
    const cssLoaded = loadCSS(`${window.hlx.codeBasePath}/templates/${templateName}/${templateName}.css`);
    const decorationComplete = new Promise((resolve) => {
      (async () => {
        try {
          const mod = await import(`../templates/${templateName}/${templateName}.js`);
          if (mod.default) {
            await mod.default(doc);
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.log(`failed to load module for ${templateName}`, error);
        }
        resolve();
      })();
    });
    await Promise.all([cssLoaded, decorationComplete]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`failed to load block ${templateName}`, error);
  }
}

/** SECTIONS */

/**
 * Converts the computed background color of an element to RGB values.
 * Used for section or table background containers to drive light-scheme/dark-scheme.
 * @param {Element} element - Section or table bg wrapper (.section, .table-background-image)
 * @returns {Object|null} Object with r, g, b values (0-255) or null if invalid/unavailable
 */
function parseColor(element) {
  // Only run for section or table background wrapper; ignore other element types for now.
  const isSection = element?.classList?.contains('section');
  const isTableBg = element?.classList?.contains('table-background-image');
  if (!isSection && !isTableBg) return null;

  const computedBg = getComputedStyle(element).background;
  const rgbMatch = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(computedBg);
  if (!rgbMatch) return null;
  return {
    r: Number.parseInt(rgbMatch[1], 10),
    g: Number.parseInt(rgbMatch[2], 10),
    b: Number.parseInt(rgbMatch[3], 10),
  };
}

function getRelativeLuminance({ r, g, b }) {
  // Convert to sRGB
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  // Apply gamma correction
  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : ((rsRGB + 0.055) / 1.055) ** 2.4;
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : ((gsRGB + 0.055) / 1.055) ** 2.4;
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : ((bsRGB + 0.055) / 1.055) ** 2.4;

  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Uses WCAG relative luminance on the element's computed background to determine light or dark
 * scheme for accessible styling. Works for section or table background containers.
 * @param {Element} element - Section or table background wrapper with a set background
 * @returns {string|null} 'light-scheme' | 'dark-scheme' or null if color cannot be determined
 */
export function getColorScheme(element) {
  const rgb = parseColor(element);
  if (!rgb) return null;

  return getRelativeLuminance(rgb) > 0.5 ? 'light-scheme' : 'dark-scheme';
}

/**
 * Applies light-scheme or dark-scheme to direct children based on element's background luminance.
 * Use with section or table background wrapper (e.g. .section, .table-background-image).
 * @param {Element} element - Section or table background wrapper
 */
export function setColorScheme(element) {
  const scheme = getColorScheme(element);
  if (!scheme) return;
  element.querySelectorAll(':scope > *').forEach((el) => {
    el.classList.remove('light-scheme', 'dark-scheme');
    el.classList.add(scheme);
  });
}

/**
 * Normalizes a background color string for use with handleBackground (e.g. Table backgroundColor,
 * Section backgroundcolor). Ensures bare hex (e.g. "fff") gets "#" prefix so CSS is valid.
 * @param {string} color - Raw color from block/section metadata
 * @returns {string} - Color string suitable for handleBackground
 */
export function normalizeBackgroundColor(color) {
  if (!color || typeof color !== 'string') return color;
  const trimmed = color.trim();
  if (/^[0-9a-fA-F]{3,6}$/.exec(trimmed)) return `#${trimmed}`;
  return trimmed;
}

/**
 * Helper function to create a <source> element
 * @param {string} src the image url
 * @param {number} width the width of the image
 * @param {MediaQueryList} mediaQuery the media query to apply to the source
 *
 * @returns imageSource
 */
export function createSource(src, width, mediaQuery) {
  const { pathname } = new URL(src, window.location.href);
  const source = document.createElement('source');
  source.type = 'image/webp';
  source.srcset = `${pathname}?width=${width}&format=webply&optimize=medium`;
  source.media = mediaQuery;

  return source;
}

/**
 * Extracts image URL from metadata content (picture or img element)
 * @param {Element} content the metadata content element
 * @returns {string|null} the image URL or null
 */
function extractImageUrl(content) {
  const img = content.querySelector('img');
  return img?.src || null;
}

/**
 * Creates a responsive picture element for background images with optimization
 * @param {string} desktopUrl the desktop background image URL
 * @param {string|null} mobileUrl the mobile background image URL (optional)
 * @param {Element} section the section element to add the background to
 */
export function handleBackgroundImages(desktopUrl, mobileUrl, section) {
  if (!desktopUrl) return;

  const newPic = document.createElement('picture');
  newPic.classList.add('bg-images');

  // Add mobile source if provided
  if (mobileUrl) {
    newPic.appendChild(createSource(mobileUrl, 600, MEDIA_QUERIES.mobile.media));
  } else {
    newPic.appendChild(createSource(desktopUrl, 899, MEDIA_QUERIES.tablet.media));
  }

  // Add desktop source
  newPic.appendChild(createSource(desktopUrl, 1920, MEDIA_QUERIES.desktop.media));

  // Create the default img element
  const newImg = document.createElement('img');
  newImg.alt = '';
  newImg.className = 'section-img';
  newImg.loading = 'lazy';

  // Use mobile image as default if available, otherwise desktop
  const defaultImgUrl = mobileUrl || desktopUrl;

  // Set width and height once image loads to get native dimensions
  newImg.onload = () => {
    newImg.width = newImg.naturalWidth;
    newImg.height = newImg.naturalHeight;
  };
  newImg.src = defaultImgUrl;

  newPic.appendChild(newImg);
  section.classList.add('has-bg-images');
  section.prepend(newPic);
}

export function handleBackground(background, section) {
  const color = background.text;
  // instead of typing "var(--color-name)" authors can use "color-token-name"
  if (color) {
    section.style.background = color.startsWith('color-token')
      ? `var(${color.replace('color-token', '--color')})`
      : color;
    setColorScheme(section);
  }
}

function handleStyle(text, section) {
  // Split by comma (with or without spaces) and trim each style
  const styles = text.split(',').map((style) => style.trim().replaceAll(' ', '-'));
  section.classList.add(...styles);
}

function handleLayout(text, section, type) {
  // any and all .block-content divs will get this treatment
  // so if you want all blocks in a section to be in the same grid,
  // you can't have default content in between blocks.
  // otherwise each block-content will get its own grid.
  if (text === '0') return;
  if (type === 'grid') section.classList.add('grid');
  section.classList.add(`${type}-${text}`);
}

// Registry for sections with height - batch processing for performance
const sectionsWithHeight = [];
let heightListenersInitialized = false;

function handleHeight(heightDesktop, heightMobile, section) {
  if (!heightDesktop && !heightMobile) return;

  // Add section to registry
  sectionsWithHeight.push({
    section,
    heightDesktop,
    heightMobile,
  });

  // Set up single event listener for all sections (only once)
  if (!heightListenersInitialized) {
    heightListenersInitialized = true;

    const updateAllHeights = () => {
      const isMobile = MEDIA_QUERIES.mobile.matches;
      sectionsWithHeight.forEach(({ section: sec, heightDesktop: hd, heightMobile: hm }) => {
        const height = isMobile && hm ? hm : hd;
        // Always set minHeight (or clear it with empty string if no value for current breakpoint)
        sec.style.minHeight = height || '';
      });
    };

    // Initial update and set up listeners
    updateAllHeights();
    MEDIA_QUERIES.mobile.addEventListener('change', updateAllHeights);
    MEDIA_QUERIES.desktop.addEventListener('change', updateAllHeights);
  } else {
    // If listeners already set up, just apply the height for this section
    const isMobile = MEDIA_QUERIES.mobile.matches;
    const height = isMobile && heightMobile ? heightMobile : heightDesktop;
    section.style.minHeight = height || '';
  }
}

const SAFE_METADATA_KEY = (key) => typeof key === 'string' && key !== '__proto__' && key !== 'constructor';
const getSectionMetadata = (el) => {
  const rdx = new Map();
  [...el.childNodes].forEach((row) => {
    if (row.children && row.children.length >= 2) {
      const key = row.children[0].textContent.trim().toLowerCase();
      const content = row.children[1];
      const text = content.textContent.trim().toLowerCase();
      if (key && content && SAFE_METADATA_KEY(key)) rdx.set(key, { content, text });
    }
  });
  return rdx;
};

// Set() is used since ES6 to avoid duplicates and (theoretically) improve performance
const SECTION_METADATA_SPECIAL_KEYS = new Set([
  'style', 'grid', 'gap', 'spacing', 'container', 'height', 'heightmobile',
  'sectionbackgroundimage', 'sectionbackgroundimagemobile', 'backgroundcolor',
  'background-block', 'background-block-image', 'background-block-image-mobile',
  'object-fit-block', 'object-position-block', 'decoration-image-top',
  'decoration-image-bottom', 'decoration-reverse',
]);
const SECTION_METADATA_PRESERVE_CASE_KEYS = new Set(['tabname', 'multisection']);

function applySpecialSectionMetadata(metadata, section) {
  const style = metadata.get('style');
  if (style?.text) handleStyle(style.text, section);
  const backgroundcolor = metadata.get('backgroundcolor');
  if (backgroundcolor?.text) handleBackground(backgroundcolor, section);
  const grid = metadata.get('grid');
  if (grid?.text) handleLayout(grid.text, section, 'grid');
  const gap = metadata.get('gap');
  const gapText = gap?.text?.replace(/^size-/, '');
  if (gapText) handleLayout(gapText, section, 'gap');
  const spacing = metadata.get('spacing');
  const spacingText = spacing?.text?.replace(/^size-/, '');
  if (spacingText) handleLayout(spacingText, section, 'spacing');
  const containerwidth = metadata.get('containerwidth');
  if (containerwidth?.text) handleLayout(containerwidth.text, section, 'container');
  const height = metadata.get('height');
  const heightmobile = metadata.get('heightmobile');
  const heightDesktop = height?.text || null;
  const heightMobile = heightmobile?.text || null;
  if (heightDesktop || heightMobile) handleHeight(heightDesktop, heightMobile, section);
}

function camelToDataAttr(camel) {
  return `data-${camel.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
}
function applyDataAttributesFromMetadata(metadata, section) {
  metadata.forEach((value, key) => {
    if (!SAFE_METADATA_KEY(key) || SECTION_METADATA_SPECIAL_KEYS.has(key)) return;
    const out = SECTION_METADATA_PRESERVE_CASE_KEYS.has(key)
      ? value.content.textContent.trim()
      : value.text;
    section.setAttribute(camelToDataAttr(toCamelCase(key)), out);
  });
  const idMeta = metadata.get('id');
  if (idMeta?.text) section.id = idMeta.text;
}

function applySectionBackgroundImages(metadata, section) {
  const sectionbackgroundimage = metadata.get('sectionbackgroundimage');
  const sectionbackgroundimagemobile = metadata.get('sectionbackgroundimagemobile');
  const desktopBgImg = sectionbackgroundimage?.content
    ? extractImageUrl(sectionbackgroundimage.content)
    : null;
  const mobileBgImg = sectionbackgroundimagemobile?.content
    ? extractImageUrl(sectionbackgroundimagemobile.content)
    : null;
  if (desktopBgImg || mobileBgImg) handleBackgroundImages(desktopBgImg, mobileBgImg, section);
}

function applyDecorationImages(metadata, section) {
  const topContent = metadata.get('decoration-image-top') ?? metadata.get('doodle-image-top');
  const bottomContent = metadata.get('decoration-image-bottom') ?? metadata.get('doodle-image-bottom');
  const decorationImageTop = topContent?.content ? extractImageUrl(topContent.content) : null;
  const decorationImageBottom = bottomContent?.content
    ? extractImageUrl(bottomContent.content)
    : null;
  const reverseMeta = metadata.get('decoration-reverse') ?? metadata.get('doodle-reverse');
  const decorationReverse = reverseMeta?.text === 'true';

  if (!decorationImageTop && !decorationImageBottom) return;

  const setDecoProp = (name, url) => section.style.setProperty(name, `url(${url})`);
  if (decorationReverse) {
    if (decorationImageBottom) setDecoProp('--decoration-before-image', decorationImageBottom);
    if (decorationImageTop) setDecoProp('--decoration-after-image', decorationImageTop);
  } else {
    if (decorationImageTop) setDecoProp('--decoration-before-image', decorationImageTop);
    if (decorationImageBottom) setDecoProp('--decoration-after-image', decorationImageBottom);
  }
  section.classList.add('has-decorations');
  if (decorationReverse) section.classList.add('decorations-reversed');
}
// apply background and background images to block content
function applyBlockContentMetadata(metadata, section) {
  const blockContents = section.querySelectorAll(':scope > div.block-content');
  if (blockContents.length === 0) return;

  const bgBlock = metadata.get('background-block');
  const backgroundBlockImage = metadata.get('background-block-image');
  const backgroundBlockImageMobile = metadata.get('background-block-image-mobile');
  const desktopBlockBgImg = backgroundBlockImage?.content
    ? extractImageUrl(backgroundBlockImage.content)
    : null;
  const mobileBlockBgImg = backgroundBlockImageMobile?.content
    ? extractImageUrl(backgroundBlockImageMobile.content)
    : null;
  const objectFit = metadata.get('object-fit-block')?.text;
  const objectPosition = metadata.get('object-position-block')?.text;

  blockContents.forEach((blockContent) => {
    if (bgBlock?.text) handleBackground(bgBlock, blockContent);
    if (desktopBlockBgImg || mobileBlockBgImg) {
      handleBackgroundImages(desktopBlockBgImg, mobileBlockBgImg, blockContent);
    }
    if (objectFit) blockContent.dataset.objectFit = objectFit;
    if (objectPosition) blockContent.dataset.objectPosition = objectPosition;
  });
}

// handle section metadata with the 5 helper functions
export function handleSectionMetadata(el) {
  const section = el.closest('.section');
  if (!section) return;

  const metadata = getSectionMetadata(el);
  applySpecialSectionMetadata(metadata, section);
  applyDataAttributesFromMetadata(metadata, section);
  applySectionBackgroundImages(metadata, section);
  applyDecorationImages(metadata, section);
  applyBlockContentMetadata(metadata, section);
  el.remove();
}

/* separates default content from block content for sections */
function groupChildren(section) {
  const allChildren = section.querySelectorAll(':scope > *');

  // Filter out section-metadata elements from "blocks"
  const children = [...allChildren].filter((child) => !child.classList.contains('section-metadata'));
  if (children.length === 0) return [];
  const hasBlocks = children.some((child) => child.tagName === 'DIV' && child.className);

  // If no blocks, just wrap everything in default-content and return
  if (!hasBlocks) {
    const defaultWrapper = document.createElement('div');
    defaultWrapper.className = 'default-content';
    children.forEach((child) => defaultWrapper.append(child));
    return [defaultWrapper];
  }

  // Otherwise, group blocks and default content separately
  const groups = [];
  let currentGroup = null;

  // Limit iteration to prevent DoS from sections with excessive direct children (CWE-400)
  const toProcess = children.length > MAX_ITERATION_LIMIT
    ? children.slice(0, MAX_ITERATION_LIMIT) : children;

  for (const child of toProcess) {
    const isDiv = child.tagName === 'DIV';
    const currentType = currentGroup?.classList.contains('block-content');

    if (!currentGroup || currentType !== isDiv) {
      currentGroup = document.createElement('div');
      currentGroup.className = isDiv
        ? 'block-content' : 'default-content';
      groups.push(currentGroup);
    }

    currentGroup.append(child);
  }

  return groups;
}

export function decorateSections(parent, isDoc) {
  const selector = isDoc ? 'main > div' : ':scope > div';
  return [...parent.querySelectorAll(selector)].map((section) => {
    const groups = groupChildren(section);
    section.append(...groups);

    section.classList.add('section');
    section.blocks = [...section.querySelectorAll('.block-content > div[class]')];

    const sectionMeta = section.querySelector('.section-metadata');
    if (sectionMeta) {
      handleSectionMetadata(sectionMeta);
    }

    return section;
  });
}

/**
 * Observes .section.entrance-animation and adds .is-visible when section enters viewport.
 * @param {Element} container - Element to search for sections (e.g. main)
 */
function initEntranceAnimationObserver(container) {
  const sections = container?.querySelectorAll('.section.entrance-animation') || [];
  if (sections.length === 0) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target); /* stop observing once animated */
        }
      });
    },
    { rootMargin: '0px 0px -50px 0px', threshold: 0 },
  );
  sections.forEach((section) => observer.observe(section));
}

/**
 * Finds all elements in main with the same data-multisection as the container section,
 * excluding the container itself. Items may be other sections or divs (tab/accordion panels).
 */
function getMultisectionItemsForSection(main, containerSection) {
  const groupValue = containerSection.dataset.multisection;
  if (!groupValue) return [];
  // Escape for safe use in CSS attribute selector (CWE-134); value may come from authored content.
  const matches = main.querySelectorAll(`[data-multisection="${CSS.escape(groupValue)}"]`);
  return [...matches].filter((el) => el !== containerSection);
}

/**
 * Ensures the section has a .block-content wrapper so blocks are discoverable.
 * Creates one and prepends it to the section if missing.
 * @param {Element} section The section element
 * @returns {Element} The .block-content element (existing or newly created)
 */
function ensureBlockContent(section) {
  let contentContainer = section.querySelector(':scope > .block-content');
  if (!contentContainer) {
    contentContainer = document.createElement('div');
    contentContainer.className = 'block-content';
    section.prepend(contentContainer);
    if (section.blocks) section.blocks = [...section.querySelectorAll('.block-content > div[class]')];
  }
  return contentContainer;
}

/**
 * Builds the tabs/accordion block inside an existing section and moves the grouped items into it.
 * Appends the block as a direct child of .block-content so it is discovered and decorated.
 * Returns the created block element so the section's blocks list can be updated.
 */
function appendMultiSectionBlock(section, groupItems, blockClass, handlePicture = false) {
  const firstItem = groupItems[0];

  if (handlePicture) {
    const firstChild = firstItem.firstElementChild;
    if (firstChild?.tagName === 'PICTURE' && firstChild.classList.contains('bg-images')) {
      firstChild.remove();
      section.prepend(firstChild);
    }
  }

  const blockDiv = document.createElement('div');
  blockDiv.classList.add(blockClass);
  groupItems.forEach((item) => {
    blockDiv.append(item);
  });

  const contentContainer = ensureBlockContent(section);
  contentContainer.append(blockDiv);

  if (section.blocks) {
    section.blocks.push(blockDiv);
  }
  return blockDiv;
}

export function buildMultiSection(main) {
  const containerSections = main.querySelectorAll('.section[data-is-multisection="true"]');

  containerSections.forEach((section) => {
    const items = getMultisectionItemsForSection(main, section);
    if (items.length === 0) return;

    // Block type comes from container section's "Grouped section type" (data-category)
    const containerCategory = section.dataset.category || '';
    const blockClass = containerCategory === 'accordion'
      ? 'accordion'
      : 'tabs'; // tabs-horizontal, tabs-vertical, or any other value → tabs

    section.classList.add('multi', `${blockClass}-container`);
    appendMultiSectionBlock(section, items, blockClass, true);
    // Decorate blocks inside nested sections so they get .block and are loaded by loadSection
    decorateBlocks(section);
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // add auto block, if needed
    loadAutoBlock(main);
    buildMultiSection(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

function decorateLinkedPictures(main) {
  main.querySelectorAll('p:has(> picture) + p > a').forEach((a) => {
    const pWithLink = a.parentElement;
    const pWithPicture = pWithLink.previousElementSibling;
    const picture = pWithPicture.querySelector('picture');

    // If link text equals the href (plain URL link), wrap the picture
    if (a.textContent.trim() === a.href) {
      a.textContent = '';
      a.append(picture);

      // Optional: remove empty p element
      pWithPicture.remove();
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  decorateSections(main); /* must be before buildAutoBlocks */
  buildAutoBlocks(main);
  initEntranceAnimationObserver(main);
  decorateBlocks(main);
  decorateButtonGroups(main);
  buildEmbedBlocks(main);
  decorateLinkedPictures(main);
}

function addOverlayRule(ruleSet, selector, property, value) {
  if (!ruleSet.has(selector)) {
    ruleSet.set(selector, [`--${property}: ${value};`]);
  } else {
    ruleSet.get(selector).push(`--${property}: ${value};`);
  }
}

async function loadThemeSpreadSheetConfig() {
  const theme = getMetadata('design');
  if (!theme) return;
  // make sure the json files are added to paths.json first
  const resp = await fetch(`/${theme}.json?offset=0&limit=500`);

  if (resp.status === 200) {
    // create style element that should be last in the head
    document.head.insertAdjacentHTML('beforeend', '<style id="style-overrides"></style>');
    const sheets = window.document.styleSheets;
    const sheet = sheets.item(sheets.length - 1);
    // load spreadsheet
    const json = await resp.json();
    const tokens = json.data || json.default.data;
    // go through the entries and create the rule set
    const ruleSet = new Map();
    tokens.forEach((e) => {
      const {
        Property, Value, Section, Block,
      } = e;
      let selector = '';
      if (Section.length === 0 && Block.length === 0) {
        // :root { --<property>: <value>; }
        addOverlayRule(ruleSet, ':root', Property, Value);
      } else {
        // define the section selector if set
        if (Section.length > 0) {
          selector = `main .section.${Section}`;
        } else {
          selector = 'main .section';
        }
        // define the block selector if set
        if (Block.length) {
          Block.split(',').forEach((entry) => {
            // eslint-disable-next-line no-param-reassign
            entry = entry.trim();
            let blockSelector = selector;
            // special cases: default wrapper, text, image, button, title
            switch (entry) {
              case 'default':
                blockSelector += ' .default-content-wrapper';
                break;
              case 'image':
                blockSelector += ` .default-content-wrapper img, ${selector} .block.columns img`;
                break;
              case 'text':
                blockSelector += ` .default-content-wrapper p:not(:has(:is(a.button , picture))), ${selector} .columns.block p:not(:has(:is(a.button , picture)))`;
                break;
              case 'button':
                blockSelector += ' .default-content-wrapper a.button';
                break;
              case 'title':
                blockSelector += ` .default-content-wrapper :is(h1,h2,h3,h4,h5,h6), ${selector} .columns.block :is(h1,h2,h3,h4,h5,h6)`;
                break;
              default:
                blockSelector += ` .block.${entry}`;
            }
            // main .section.<section-name> .block.<block-name> { --<property>: <value>; }
            // or any of the spacial cases above
            addOverlayRule(ruleSet, blockSelector, Property, Value);
          });
        } else {
          // main .section.<section-name> { --<property>: <value>; }
          addOverlayRule(ruleSet, selector, Property, Value);
        }
      }
    });
    // finally write the rule sets to the style element
    ruleSet.forEach((rules, selector) => {
      sheet.insertRule(`${selector} {${rules.join(';')}}`, sheet.cssRules.length);
    });
  }
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  loadThemeSpreadSheetConfig();

  const getAppBanner = sessionStorage.getItem('getAppBanner');
  const header = doc.querySelector('header');
  if (header && !MEDIA_QUERIES.desktop.matches) {
    if (getAppBanner) {
      // Banner was closed previously: use nav-height only (avoids gap on mobile)
      header.style.height = 'var(--nav-height)';
      document.body.classList.add('app-banner-closed');
    } else {
      // Reserve space for banner before it loads (minimizes CLS when banner injects in loadLazy)
      document.body.classList.add('expect-app-banner');
    }
  }

  const main = doc.querySelector('main');
  const templateName = getMetadata('template');
  if (templateName) {
    await loadTemplate(doc, templateName);
  }
  if (main) {
    decorateMain(main);
    /* Second pass if hero was missing at module init. Idempotent via preload dedupe. */
    preloadHeroHeritageCcLcpImage(main);
    const h1Title = getMetadata('h1-title');
    if (h1Title) {
      const h1 = document.createElement('h1');
      h1.textContent = h1Title;
      main.insertBefore(h1, main.firstChild);
    }
    prepareHeroForCLS(main);

    // Early detection of category-nav to prevent CLS
    // Check page metadata for category-nav path - if present, add class to body
    // This allows CSS to set correct header height BEFORE body.appear
    const categoryNavPath = getMetadata('category-nav');
    if (categoryNavPath) {
      document.body.classList.add('has-category-nav');
    }

    // Mark framework pages so CSS can show raw content for editing/preview
    if (isEditingFrameworkPage()) {
      document.body.classList.add('is-framework-page');
    }

    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
  if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
    loadFonts();
  }
}

/**
 * Decorates the get app banner element
 * @param {Element} container The container element (typically header)
 */
function decorateGetAppBanner(container) {
  const getAppBanner = container.querySelector('#grnt-app-mob');
  if (!getAppBanner) return;

  getAppBanner.classList.add('grnt-app-mob-main');

  // Check sessionStorage - hide banner if previously closed
  if (sessionStorage.getItem('getAppBanner')) {
    getAppBanner.classList.add('d-none');
    return;
  }

  // Close button - hide banner and save to sessionStorage
  const closeBtn = getAppBanner.querySelector('.button-container > a:has(.icon-icon-plus)');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      getAppBanner.classList.add('d-none');
      sessionStorage.setItem('getAppBanner', 'true');
      document.body.classList.add('app-banner-closed');
      // Reset height style on header when banner is closed
      const header = document.querySelector('header');
      if (header) {
        header.style.height = 'var(--nav-height)';
      }
    });
  }
}

/**
 * Load and inject get app banner fragment into header
 * Loads the fragment from /fragments/getappbanner and appends to header
 */
async function loadGetAppBannerFragment() {
  // Skip loading fragments when viewing framework pages
  if (isEditingFrameworkPage() || MEDIA_QUERIES.desktop.matches) {
    return;
  }

  const header = document.querySelector('header');
  if (!header) {
    return;
  }

  try {
    const fragment = await loadFragment('/framework/getappbanner');

    if (!fragment) {
      // eslint-disable-next-line no-console
      console.error('[Get App Banner] Failed to load fragment from: /framework/getappbanner');
      return;
    }
    const getAppBanner = fragment.querySelector('#grnt-app-mob');

    if (!getAppBanner) {
      // eslint-disable-next-line no-console
      console.error('[Get App Banner] No #grnt-app-mob found in framework');
      return;
    }
    header.firstChild.prepend(getAppBanner);
    decorateGetAppBanner(header);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Get App Banner] Error loading fragment:', error);
  }
}

/**
 * Create category navbar wrapper at top of page
 * The actual navigation will be built by category-nav.js which collects all category-nav blocks
 *
 * Category nav content can come from:
 * 1. Page-level aem-content field (defined in _page.json) that references a fragment
 *    - The fragment is injected as sections/blocks directly into main
 * 2. Directly authored category-nav blocks on the page
 *
 * @param {Element} main The main element
 */
async function loadCategoryNav(main) {
  // Skip building navigation when viewing framework pages
  // Framework pages are templates/fragments and should display their raw content
  if (isEditingFrameworkPage()) {
    return;
  }

  // Check if there are any category-nav blocks on the page
  // These could be from:
  // - A fragment referenced by the page-level "category-nav" aem-content field
  // - Direct authoring of category-nav blocks on the page
  const categoryNavBlocks = main.querySelectorAll('.category-nav.block');

  if (categoryNavBlocks.length === 0) {
    return;
  }

  // Create category-nav wrapper directly in header to prevent CLS
  // This ensures header height is correct from the start
  const navWrapper = document.querySelector('header.header-wrapper .nav-wrapper');
  const categoryNavWrapper = document.createElement('div');
  categoryNavWrapper.classList.add('category-nav-wrapper');
  categoryNavWrapper.dataset.navPlaceholder = 'true';

  // Insert into header nav-wrapper (not main) to prevent layout shift
  if (navWrapper) {
    navWrapper.appendChild(categoryNavWrapper);
  } else {
    // Fallback: insert at top of main if header not found
    main.insertBefore(categoryNavWrapper, main.firstChild);
  }

  // Load CSS for the category nav
  const blockName = 'category-nav';
  try {
    await loadCSS(`${window.hlx.codeBasePath}/blocks/${blockName}/${blockName}.css`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Category Nav] Failed to load CSS:', error);
  }

  // Load ALL category-nav blocks together to ensure they all see each other
  // This is critical because the first block to load will build the unified navigation
  const navBlocksArray = Array.from(categoryNavBlocks);

  // Reset the unified nav flag in case blocks were partially decorated earlier
  // This ensures the first block we explicitly load will build the unified navigation
  try {
    const categoryNavModule = await import(`${window.hlx.codeBasePath}/blocks/category-nav/category-nav.js`);
    if (categoryNavModule.resetUnifiedNavFlag) {
      categoryNavModule.resetUnifiedNavFlag();
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Category Nav] Failed to reset flag:', error);
  }

  for (const element of navBlocksArray) {
    const navBlock = element;
    // Remove block status entirely to force fresh decoration
    delete navBlock.dataset.blockStatus;

    // eslint-disable-next-line no-await-in-loop
    await loadBlock(navBlock);
  }

  // Clean up: Remove the fragment sections from main
  // These were injected from the fragment but are no longer needed
  // since the navigation has been built and moved to the header
  const categoryNavSections = main.querySelectorAll('.category-nav-container');
  if (categoryNavSections.length > 0) {
    categoryNavSections.forEach((section) => {
      section.remove();
    });
  }
}

/**
 * Get direct text content from a menu item (excluding nested elements)
 * @param {Element} menuItem The menu item element
 * @returns {string} The direct text content
 */
function getDirectTextContent(menuItem) {
  const menuLink = menuItem.querySelector(':scope > a');
  if (menuLink) {
    return menuLink.textContent.trim();
  }
  return Array.from(menuItem.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent)
    .join(' ');
}

/** Start Breadcrumbs */

/**
 * Build breadcrumbs from navigation tree
 * @param {Element} nav The navigation element
 * @param {string} currentUrl The current page URL
 * @returns {Promise<Array>} Array of breadcrumb objects
 */
async function buildBreadcrumbsFromNavTree(nav, currentUrl) {
  const crumbs = [];

  const homeUrl = document.querySelector('.nav-brand a[href]')?.href;
  if (!homeUrl) return crumbs;

  let menuItem = Array.from(nav.querySelectorAll('a')).find((a) => a.href === currentUrl);
  if (menuItem) {
    do {
      const link = menuItem.querySelector(':scope > a');
      crumbs.unshift({ title: getDirectTextContent(menuItem), url: link ? link.href : null });
      menuItem = menuItem.closest('ul')?.closest('li');
    } while (menuItem && menuItem.length < MAX_ITERATION_LIMIT);
  } else if (currentUrl !== homeUrl) {
    // Page not found in nav, build breadcrumbs from URL path
    const url = new URL(currentUrl);
    const pathSegments = url.pathname.split('/').filter((segment) => segment !== '');

    // Build breadcrumb trail from URL path segments
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLastSegment = index === pathSegments.length - 1;

      if (isLastSegment) {
        // For the last segment (current page), use page title
        // (will be overridden by breadcrumbsTitle metadata if present)
        let pageTitle = getMetadata('og:title') || document.title;
        // Strip out site name suffix (anything after |, -, or : followed by site name)
        pageTitle = pageTitle.split('|')[0].split(' - ')[0].trim();
        crumbs.push({ title: pageTitle, url: currentUrl });
      } else {
        // For intermediate segments, convert path to readable title
        let title = segment
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        // Pluralize "card" to "cards" for better grammar in breadcrumbs
        title = title.replace(/\bCard\b/g, 'Cards');
        const segmentUrl = `${url.origin}${currentPath}`;
        crumbs.push({ title, url: segmentUrl });
      }
    });
  }

  // Don't add "Home" to breadcrumbs - start with first level after home
  // Uncomment this if you want to add a home label to the beginning of the breadcrumbs
  // const placeholders = await fetchPlaceholders();
  // const homePlaceholder = placeholders.breadcrumbsHomeLabel || 'Home';
  // crumbs.unshift({ title: homePlaceholder, url: homeUrl });

  // Override last breadcrumb title with breadcrumbsTitle if available
  const breadcrumbsTitle = getMetadata('breadcrumbstitle');
  if (breadcrumbsTitle && crumbs.length > 0) {
    crumbs.at(-1).title = breadcrumbsTitle;
  }

  // last link is current page and should not be linked
  if (crumbs.length > 1) {
    crumbs.at(-1).url = null;
  }
  if (crumbs.length > 0) {
    crumbs.at(-1)['aria-current'] = 'page';
  }
  return crumbs;
}

/**
 * Generates BreadcrumbList JSON-LD schema
 * @param {Array} crumbs Array of breadcrumb objects with title and url
 */
function generateBreadcrumbSchema(crumbs) {
  if (!crumbs || crumbs.length === 0) {
    return null;
  }

  // Get site origin for constructing absolute URLs
  const siteOrigin = window.location.origin;

  // Build itemListElement array
  const itemListElement = crumbs.map((crumb, index) => {
    // Ensure URL is absolute
    let itemUrl = crumb.url;
    if (itemUrl && !itemUrl.startsWith('http')) {
      itemUrl = `${siteOrigin}${itemUrl}`;
    }

    const item = {
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.title,
    };

    // Only add item URL if it's a link (not the current page)
    if (crumb.url) {
      item.item = itemUrl;
    }

    return item;
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  };
}

/**
 * Injects BreadcrumbList JSON-LD schema into the document head
 * @param {Object} schema The schema object to inject
 */
function injectBreadcrumbSchema(schema) {
  if (!schema) {
    return;
  }

  // Remove existing breadcrumb schema if present
  const existingSchema = document.querySelector('script[type="application/ld+json"][data-schema-type="breadcrumb"]');
  if (existingSchema) {
    existingSchema.remove();
  }

  try {
    // Stringify with pretty printing
    const jsonString = JSON.stringify(schema, null, 2);

    // Validate JSON
    JSON.parse(jsonString);

    // Create and inject schema
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.schemaType = 'breadcrumb';
    script.text = jsonString;

    document.head.appendChild(script);
  } catch (error) {
    // Silently fail
    // eslint-disable-next-line no-console
    console.error('Failed to inject breadcrumb schema:', error);
  }
}

/**
 * Build breadcrumbs navigation element
 * @returns {Promise<Element>} The breadcrumbs nav element
 */
async function buildBreadcrumbs() {
  const breadcrumbs = document.createElement('nav');
  breadcrumbs.className = 'breadcrumbs';
  breadcrumbs.ariaLabel = 'Breadcrumb';

  // Look for nav-sections within the header navigation
  const navSections = document.querySelector('header nav .nav-sections');
  if (!navSections) {
    return null;
  }

  const crumbs = await buildBreadcrumbsFromNavTree(navSections, document.location.href);

  if (crumbs.length === 0) {
    return null;
  }

  const ol = document.createElement('ol');
  ol.append(...crumbs.map((item) => {
    const li = document.createElement('li');
    if (item['aria-current']) li.setAttribute('aria-current', item['aria-current']);
    if (item.url) {
      const a = document.createElement('a');
      a.href = item.url;
      a.textContent = item.title;
      li.append(a);
    } else {
      li.textContent = item.title;
    }
    return li;
  }));

  breadcrumbs.append(ol);

  // Generate and inject BreadcrumbList JSON-LD schema
  const breadcrumbSchema = generateBreadcrumbSchema(crumbs);
  if (breadcrumbSchema) {
    injectBreadcrumbSchema(breadcrumbSchema);
  }

  return breadcrumbs;
}

/**
 * Returns the first section in main that is not a category-nav section.
 * @param {Element} main The main element
 * @returns {Element|null} First content section or null
 */
function findFirstContentSection(main) {
  const sections = main.querySelectorAll(':scope > div.section');
  const toScan = sections.length > MAX_ITERATION_LIMIT
    ? [...sections].slice(0, MAX_ITERATION_LIMIT) : [...sections];
  for (const section of toScan) {
    const isCategoryNav = section.classList.contains('category-nav-container')
      || section.classList.contains('category-nav-section');
    if (!isCategoryNav) return section;
  }
  return null;
}

/**
 * Injects breadcrumbs into the appropriate place in main (first content section or main).
 * @param {Element} breadcrumbs Breadcrumbs container element
 * @param {Element} main The main element
 */
function injectBreadcrumbsInto(breadcrumbs, main) {
  const targetSection = findFirstContentSection(main);
  if (!targetSection) {
    main.insertBefore(breadcrumbs, main.firstChild);
    return;
  }
  const wrapperDiv = targetSection.querySelector(':scope > div[class*="-wrapper"]');
  const container = wrapperDiv || targetSection;
  container.insertBefore(breadcrumbs, container.firstChild);
}

/**
 * Load and inject breadcrumbs into the first section of main
 * @param {Element} main The main element
 */
async function loadBreadcrumbs(main) {
  if (getMetadata('breadcrumbs')?.toLowerCase() !== 'true') return;

  try {
    const breadcrumbs = await buildBreadcrumbs();
    if (breadcrumbs) injectBreadcrumbsInto(breadcrumbs, main);
  } catch {
    // Silently fail - breadcrumbs are optional enhancement
  }
}

/** End Breadcrumbs */

/**
 * Exit intent whole page popup (modal)
 * Loads a modal based on page metadata when exit intent conditions are met.
 * Reads 'modal-content' (path) and optionally 'modal-timer' (ms for idle-after-scroll).
 *
 * Triggers (show popup immediately when any is detected):
 * - Mouse leaves top of page (cursor goes above viewport, clientY < 10)
 * - Back button (popstate)
 * - Alt + Left Arrow (keyboard back shortcut)
 * - Backspace (when focus is not in input/textarea)
 * - Fast scroll up (> 100px in one go)
 * - Tab focus (user returns to tab via visibilitychange)
 *
 * Delayed trigger:
 * - Idle after scroll: user stops scrolling for modal-timer ms (default 5000)
 */
function loadExitIntentModal() {
  // Suppress exit intent modals in Universal Editor to avoid disrupting content editing
  if (window.hlx?.isEditor) {
    return;
  }

  const modalContent = getMetadata('modal-content');
  if (!modalContent) {
    return;
  }

  const idleTimeMs = parseInt(getMetadata('modal-timer'), 10);
  const idleAfterScrollMs = (Number.isNaN(idleTimeMs) || idleTimeMs < 0) ? 5000 : idleTimeMs;

  let showPopup = true;
  let lastScrollY = window.scrollY;
  let idleTimeout = null;
  const listeners = [];

  function removeListeners() {
    listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    listeners.length = 0;
    if (idleTimeout) {
      clearTimeout(idleTimeout);
      idleTimeout = null;
    }
  }

  async function showExitIntentPopup() {
    if (!showPopup) return;

    showPopup = false;
    removeListeners();

    try {
      const { openModal } = await import(`${window.hlx.codeBasePath}/blocks/modal/modal.js`);
      openModal(modalContent, { isAutoPopup: true });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load exit intent modal:', error);
      showPopup = true; // Allow retry on error
    }
  }

  function addListener(element, event, handler) {
    element.addEventListener(event, handler);
    listeners.push({ element, event, handler });
  }

  // Mouse leaves top of page (desktop exit intent)
  addListener(document, 'mouseleave', (e) => {
    if (e.clientY < 10) showExitIntentPopup();
  });

  // Back button (popstate)
  addListener(window, 'popstate', showExitIntentPopup);

  // Alt + Left Arrow (keyboard back)
  addListener(window, 'keydown', (e) => {
    if (e.altKey && e.key === 'ArrowLeft') {
      showExitIntentPopup();
      window.history.pushState(null, null, window.location.href);
    }
  });

  // Backspace (when focus not in input/textarea)
  addListener(window, 'keydown', (e) => {
    if (e.key === 'Backspace' && !e.target.matches('input, textarea')) {
      e.preventDefault();
      showExitIntentPopup();
    }
  });

  // Fast scroll up + idle after scroll
  addListener(window, 'scroll', () => {
    const scrollDiff = lastScrollY - window.scrollY;
    if (scrollDiff > 100) {
      showExitIntentPopup();
      return;
    }
    lastScrollY = window.scrollY;

    if (idleTimeout) clearTimeout(idleTimeout);
    idleTimeout = setTimeout(showExitIntentPopup, idleAfterScrollMs);
  });

  // Tab focus (user returns to tab)
  addListener(document, 'visibilitychange', () => {
    if (!document.hidden) showExitIntentPopup();
  });
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  autolinkModals(doc);
  const main = doc.querySelector('main');

  // Load header first so nav-wrapper is available for category navbar
  await loadHeader(doc.querySelector('header'));

  // Load get app banner fragment and append to header
  await loadGetAppBannerFragment();

  // Load breadcrumbs after header is available and insert as first element in main
  await loadBreadcrumbs(main);

  // Load category-nav fragment from page metadata BEFORE decorating main
  // This ensures the fragment sections are present when decorateMain runs
  await loadCategoryNavFragment(main);

  // Create category navbar wrapper BEFORE loading sections
  // This ensures the placeholder is in place when blocks are decorated
  await loadCategoryNav(main);

  // Now load all sections including category-nav blocks
  // The category-nav blocks will find the wrapper and populate it
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  // Rewrite relative links to prod origin (avoid ww2 links)
  doc.querySelectorAll('a[href]').forEach((a) => {
    a.href = makeProdUrl(a.getAttribute('href'));
  });

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
  loadAutoBlock(doc);

  // Start exit intent modal if configured in page metadata
  loadExitIntentModal();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */

// delayed GTM script

window.dataLayer = window.dataLayer || [];

function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  // Restore default body background after all sections are loaded
  // This prevents white flash during initial page load on dark-themed pages
  document.body.classList.add('page-loaded');
  loadDelayed();
}

/* Earliest point in this module: before loadEager (fonts, template, decorateMain). */
preloadHeroHeritageCcLcpImage(document.querySelector('main'));

loadPage();
