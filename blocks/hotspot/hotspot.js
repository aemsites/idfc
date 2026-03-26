/**
 * Hotspot Block
 *
 * Creates an image with interactive hotspots. Clicking a hotspot displays
 * its tooltip content on the left side with a connecting line to the hotspot.
 * Link hotspots (#id) navigate to other hotspot blocks.
 */

import { ensureDOMPurify, moveInstrumentation, DOMPURIFY } from '../../scripts/scripts.js';

/** DOMPurify config for hotspot container HTML: preserve data-* attributes for navigation. */
const HOTSPOT_CONTAINER_DOMPURIFY = {
  ...DOMPURIFY,
  ADD_ATTR: [
    'data-target-hotspot', 'data-panel-content', 'data-x', 'data-y', 'data-original-block-id',
  ],
};

// Per-section tracking (keyed by section element)
// Stores: { firstBlockId, firstBlockElement, maxHeight, seenFirst, contentMap }
// contentMap stores original decorated content for each hotspot block by ID within that section
const sectionDataMap = new Map();

// Store animation frame IDs for cleanup
const animationFrameMap = new Map();

// Track containers that are currently transitioning (skip padding updates)
const transitioningContainers = new Set();

/**
 * Get or create section data for a given section element
 */
function getSectionData(section) {
  if (!sectionDataMap.has(section)) {
    sectionDataMap.set(section, {
      firstBlockId: null,
      firstBlockElement: null,
      maxHeight: 0,
      seenFirst: false,
      contentMap: new Map(), // Store block content by ID within this section
    });
  }
  return sectionDataMap.get(section);
}

/**
 * Parse hotspot item rows
 * Each row with 3 cells (text, x, y) becomes a hotspot
 * If the first cell contains an anchor starting with #, it's a link hotspot
 */
function parseHotspotGroups(rows) {
  const groups = [];

  rows.forEach((row) => {
    if (row.children.length < 3) {
      // Skip rows without 3 cells (text, x, y)
      return;
    }

    const cells = Array.from(row.children);
    const firstCell = cells[0];
    const xHotspot = parseFloat(cells[1]?.textContent?.trim()) || 0;
    const yHotspot = parseFloat(cells[2]?.textContent?.trim()) || 0;

    // Check for anchor tag with # href (link hotspot)
    const anchor = firstCell.querySelector('a[href^="#"]');
    const isLink = !!anchor;
    let targetId = '';

    if (isLink) {
      // Extract target ID from anchor href (remove the #)
      targetId = anchor.getAttribute('href').substring(1);
    } else {
      // Also check if the text content itself starts with # (plain text link)
      const textContent = firstCell.textContent?.trim() || '';
      if (textContent.startsWith('#')) {
        targetId = textContent.substring(1);
      }
    }

    const hasLink = isLink || !!targetId;

    if (hasLink && targetId) {
      // Link hotspot - navigates to another hotspot block
      groups.push({
        type: 'link',
        targetId,
        x: xHotspot,
        y: yHotspot,
        row,
      });
    } else {
      // Standard hotspot - shows block-level hotspot-text in left panel
      groups.push({
        type: 'standard',
        x: xHotspot,
        y: yHotspot,
        row,
      });
    }
  });

  return groups;
}

/**
 * Shows the initial panel content by getting panelHTML from the first hotspot
 * and making the panel visible. This is used both on initial load and after navigation.
 * @param {HTMLElement} container - The hotspot container element
 * @param {string} currentBlockId - The current block's ID being displayed
 * @param {boolean} skipPaddingCalculation - Skip padding calculation (transitions)
 */
function showInitialPanel(container, currentBlockId, skipPaddingCalculation = false) {
  const tooltipPanel = container.querySelector('.hotspot-tooltip-panel');
  const tooltipContent = container.querySelector('.hotspot-tooltip-content');
  const imageSection = container.querySelector('.hotspot-image-section');

  if (!tooltipPanel || !tooltipContent || !imageSection) {
    return;
  }

  // Get panel content from the first hotspot's data
  const firstHotspot = imageSection.querySelector('.hotspot-marker');
  if (!firstHotspot) {
    return;
  }

  const panelHTML = firstHotspot.dataset.panelContent || '';
  if (!panelHTML) {
    return;
  }

  tooltipContent.innerHTML = (window.DOMPurify?.sanitize(panelHTML, DOMPURIFY)) ?? panelHTML;
  tooltipPanel.classList.add('visible');

  // Only calculate padding if not skipped (during transitions, fadeTransition handles this)
  if (!skipPaddingCalculation) {
    // Function to calculate and set padding position
    const calculateInitialPadding = () => {
      const panelItem = tooltipContent.querySelector('.hotspot-panel-item');
      if (!panelItem || !firstHotspot) return;

      // Disable transition for instant positioning
      tooltipContent.style.transition = 'none';

      // Force layout to get accurate measurements
      tooltipContent.offsetHeight; // eslint-disable-line no-unused-expressions

      const hotspotRect = firstHotspot.getBoundingClientRect();
      const panelItemRect = panelItem.getBoundingClientRect();
      const currentPadding = parseFloat(tooltipContent.style.paddingTop) || 0;

      // Calculate hotspot center Y
      const hotspotCenterY = hotspotRect.top + (hotspotRect.height / 2);

      // Calculate panel item center Y at padding 0
      const panelItemCenterYAtZero = panelItemRect.top
        + (panelItemRect.height / 2) - currentPadding;

      // Calculate desired padding
      const desiredPadding = Math.max(0, hotspotCenterY - panelItemCenterYAtZero);
      tooltipContent.style.paddingTop = `${desiredPadding}px`;

      // Force reflow then re-enable transition
      tooltipContent.offsetHeight; // eslint-disable-line no-unused-expressions
      tooltipContent.style.transition = '';
    };

    // Run a callback after double RAF (ensures layout is stable)
    const runAfterDoubleRAF = (fn) => {
      requestAnimationFrame(() => requestAnimationFrame(fn));
    };

    const mainImage = imageSection.querySelector('img');
    const schedulePadding = () => runAfterDoubleRAF(calculateInitialPadding);

    if (mainImage && mainImage.naturalWidth === 0) {
      mainImage.addEventListener('load', schedulePadding, { once: true });
    } else {
      runAfterDoubleRAF(calculateInitialPadding);
    }
  }

  // Set up the go-back behavior:
  // The "Go back" link is authored in the content - find links with href starting with #
  // - If href is just "#", hide the entire section
  // - Otherwise, navigate to the block with the specified ID
  const goBackLinks = tooltipContent.querySelectorAll('a[href^="#"]');
  const sectionWrapper = container.closest('.section');
  const sectionData = getSectionData(sectionWrapper);

  goBackLinks.forEach((link) => {
    link.addEventListener('click', (evt) => {
      evt.preventDefault();

      const href = link.getAttribute('href') || '#';
      const targetId = href.substring(1); // Remove the # prefix

      if (!targetId) {
        // href is just "#" - expand the hero back to 100% (reverse of #the-concept-hotspot)
        const hero = document.querySelector('.hero-heritage-cc');
        if (hero) {
          hero.classList.remove('hero-heritage-cc-collapsed');
        }
      } else {
        // Navigate to the specified block (within this section)
        const targetContent = sectionData.contentMap.get(targetId);
        if (targetContent) {
          // Mark as transitioning to prevent RAF override
          transitioningContainers.add(container);

          // Start moving text towards where it will be
          const currentTooltipContent = container.querySelector('.hotspot-tooltip-content');
          const currentPanelItem = container.querySelector('.hotspot-panel-item');
          const targetHotspot = container.querySelector(`.hotspot-marker[data-target-hotspot="${targetId}"]`);

          if (currentTooltipContent && currentPanelItem && targetHotspot) {
            const hotspotRect = targetHotspot.getBoundingClientRect();
            const panelItemRect = currentPanelItem.getBoundingClientRect();
            const currentPadding = parseFloat(currentTooltipContent.style.paddingTop) || 0;
            const panelItemCenterYAtZero = panelItemRect.top
              + (panelItemRect.height / 2) - currentPadding;
            const hotspotCenterY = hotspotRect.top + (hotspotRect.height / 2);
            const navPadding = Math.max(0, hotspotCenterY - panelItemCenterYAtZero);
            currentTooltipContent.style.paddingTop = `${navPadding}px`;
          }

          // eslint-disable-next-line no-use-before-define
          fadeTransition(container, () => {
            const cfg = HOTSPOT_CONTAINER_DOMPURIFY;
            const sanitized = window.DOMPurify?.sanitize(targetContent, cfg);
            container.innerHTML = sanitized ?? targetContent;
            // eslint-disable-next-line no-use-before-define
            reattachHotspotListeners(container, targetId);
            showInitialPanel(container, targetId, true);
          });
        }
      }
    });
  });
}

/**
 * Waits for all images in an element to finish loading.
 * @param {HTMLElement} element - The element containing images
 * @returns {Promise} Resolves when all images are loaded
 */
function waitForImages(element) {
  const images = element.querySelectorAll('img');
  const imagePromises = Array.from(images).map((img) => {
    if (img.complete) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true }); // Don't block on errors
    });
  });
  return Promise.all(imagePromises);
}

/**
 * Performs a fade transition when switching block content.
 * Waits for fade-out to complete, swaps content, waits for images to load,
 * then fades back in. Also handles text position animation.
 * @param {HTMLElement} container - The container element
 * @param {Function} contentSwapCallback - Function to call during the fade (swaps content)
 * @returns {Promise} Resolves when the transition is complete
 */
function fadeTransition(container, contentSwapCallback) {
  return new Promise((resolve) => {
    // Mark container as transitioning - RAF will skip padding updates
    transitioningContainers.add(container);

    // Start fade out
    container.classList.add('fade-out');

    const onFadeInEnd = () => {
      container.removeEventListener('transitionend', onFadeInEnd);
      container.classList.remove('brightness-flash');
      resolve();
    };

    const startFadeIn = () => {
      container.classList.add('brightness-flash');
      container.classList.remove('fade-out');
      container.addEventListener('transitionend', onFadeInEnd, { once: true });
    };

    const runAfterImages = () => {
      requestAnimationFrame(() => requestAnimationFrame(startFadeIn));
    };

    // Wait for fade-out transition to complete
    const onFadeOutEnd = () => {
      container.removeEventListener('transitionend', onFadeOutEnd);

      // Capture the ACTUAL computed position at the END of fade-out (mid-animation point)
      const tooltipContent = container.querySelector('.hotspot-tooltip-content');
      const positionAtFadeOut = tooltipContent
        ? window.getComputedStyle(tooltipContent).paddingTop
        : '0px';

      // Swap content while invisible
      contentSwapCallback();

      // Set new content's initial position to where the old content was
      const newTooltipContent = container.querySelector('.hotspot-tooltip-content');
      if (newTooltipContent && positionAtFadeOut) {
        // Temporarily disable transition to set initial position instantly
        newTooltipContent.style.transition = 'none';
        newTooltipContent.style.paddingTop = positionAtFadeOut;
        // Force reflow to apply the instant change
        newTooltipContent.offsetHeight; // eslint-disable-line no-unused-expressions
        // Re-enable transition for the animation
        newTooltipContent.style.transition = '';
      }

      // Allow RAF to calculate final position again
      transitioningContainers.delete(container);

      waitForImages(container).then(runAfterImages);
    };

    container.addEventListener('transitionend', onFadeOutEnd, { once: true });
  });
}

/**
 * Handles click on a "go back" link (href="#..." or "#").
 * Either expands hero or navigates to the target block.
 * @param {Event} evt - Click event
 * @param {Object} sectionData - Section data from getSectionData(section)
 * @param {HTMLElement} container - Hotspot container element
 * @param {Function} reattachListeners - reattachHotspotListeners(container, blockId)
 */
function handleGoBackLinkClick(evt, sectionData, container, reattachListeners) {
  evt.preventDefault();
  const href = evt.currentTarget.getAttribute('href') || '#';
  const targetId = href.substring(1);

  if (!targetId) {
    const hero = document.querySelector('.hero-heritage-cc');
    if (hero) hero.classList.remove('hero-heritage-cc-collapsed');
    return;
  }

  const content = sectionData.contentMap.get(targetId);
  if (!content) return;

  transitioningContainers.add(container);
  fadeTransition(container, () => {
    const sanitized = window.DOMPurify?.sanitize(content, HOTSPOT_CONTAINER_DOMPURIFY);
    container.innerHTML = sanitized ?? content;
    reattachListeners(container, targetId);
    showInitialPanel(container, targetId, true);
  });
}

/**
 * Attaches click handlers to all "go back" links (href^="#") in tooltip content.
 * @param {HTMLElement} tooltipContent - Element containing the links
 * @param {HTMLElement} container - Hotspot container element
 * @param {Function} reattachListeners - reattachHotspotListeners(container, blockId)
 */
function attachGoBackHandlers(tooltipContent, container, reattachListeners) {
  const sectionWrapper = container.closest('.section');
  const sectionData = getSectionData(sectionWrapper);
  const goBackLinks = tooltipContent.querySelectorAll('a[href^="#"]');
  goBackLinks.forEach((link) => {
    link.addEventListener('click', (evt) => handleGoBackLinkClick(evt, sectionData, container, reattachListeners));
  });
}

/**
 * Get stored content from section's contentMap or live DOM for a target block ID.
 * @param {Object} sectionData - Section data from getSectionData(section)
 * @param {string} targetId - Target block ID
 * @returns {string|null} HTML content or null
 */
function getStoredOrLiveContent(sectionData, targetId) {
  const stored = sectionData.contentMap.get(targetId);
  if (stored) return stored;
  const targetBlock = document.getElementById(targetId);
  if (!targetBlock?.classList.contains('hotspot')) return null;
  const targetContainer = targetBlock.querySelector('.hotspot-container');
  return targetContainer ? targetContainer.innerHTML : null;
}

/**
 * Animate tooltip content padding toward the clicked hotspot (used during fade-out).
 * @param {HTMLElement} container - Hotspot container
 * @param {HTMLElement} hotspot - Clicked hotspot marker
 */
function applyClickPadding(container, hotspot) {
  const currentTooltipContent = container.querySelector('.hotspot-tooltip-content');
  const currentPanelItem = container.querySelector('.hotspot-panel-item');
  if (!currentTooltipContent || !currentPanelItem) return;
  const hotspotRect = hotspot.getBoundingClientRect();
  const panelItemRect = currentPanelItem.getBoundingClientRect();
  const currentPadding = parseFloat(currentTooltipContent.style.paddingTop) || 0;
  const panelItemCenterYAtZero = panelItemRect.top + (panelItemRect.height / 2) - currentPadding;
  const hotspotCenterY = hotspotRect.top + (hotspotRect.height / 2);
  const movePadding = Math.max(0, hotspotCenterY - panelItemCenterYAtZero);
  currentTooltipContent.style.paddingTop = `${movePadding}px`;
}

/**
 * Navigate to another hotspot block's content (link click).
 * Gets content, applies padding animation, runs fade transition.
 * @param {HTMLElement} container - Hotspot container
 * @param {string} targetId - Target block ID
 * @param {HTMLElement} hotspot - Clicked hotspot marker
 * @param {Function} reattachListeners - reattachHotspotListeners(container, blockId)
 */
function navigateToHotspotContent(container, targetId, hotspot, reattachListeners) {
  const sectionWrapper = container.closest('.section');
  const sectionData = getSectionData(sectionWrapper);
  const newContent = getStoredOrLiveContent(sectionData, targetId);
  if (!newContent) return;
  transitioningContainers.add(container);
  applyClickPadding(container, hotspot);
  fadeTransition(container, () => {
    const sanitized = window.DOMPurify?.sanitize(newContent, HOTSPOT_CONTAINER_DOMPURIFY);
    container.innerHTML = sanitized ?? newContent;
    reattachListeners(container, targetId);
    showInitialPanel(container, targetId, true);
  });
}

/**
 * Sets up SVG connector line that draws from hotspot panel item to the hotspot marker.
 * Uses requestAnimationFrame for smooth updates on resize/scroll.
 * - Desktop mode: Line from right-center of .hotspot-panel-item to hotspot marker
 * - Mobile mode: Line from top-center of .hotspot-panel-item to hotspot marker
 * @param {HTMLElement} container - The hotspot container element
 * @param {string} currentBlockId - The ID of the block currently being displayed
 * @returns {Function} cleanup function to stop the animation loop
 */
function setupConnectorLine(container, currentBlockId = null) {
  // Use container element as cleanup key (unique per container, not per block ID)
  const cleanupKey = container;

  // Cancel any existing animation for this container
  const existingCleanup = animationFrameMap.get(cleanupKey);
  if (existingCleanup) existingCleanup();

  // Remove any existing connector (wrapper + SVG)
  const existingWrapper = container.querySelector('.hotspot-connector-wrapper');
  if (existingWrapper) existingWrapper.remove();

  if (container.style) container.style.position = 'relative';

  // Wrapper div: use .style so connector overlays container
  const wrapper = document.createElement('div');
  wrapper.className = 'hotspot-connector-wrapper';
  const wrapperStyle = 'position:absolute;inset:0;pointer-events:none;overflow:visible;'
    + 'z-index:10';
  wrapper.style.cssText = wrapperStyle;
  container.appendChild(wrapper);

  let animationFrameId = null;

  function drawLine() {
    // Clear previous frame's line
    wrapper.querySelectorAll('.hotspot-connector-line').forEach((el) => el.remove());

    const tooltipPanel = container.querySelector('.hotspot-tooltip-panel');
    const panelItem = container.querySelector('.hotspot-panel-item');
    const imageSection = container.querySelector('.hotspot-image-section');

    // Only draw if tooltip is visible and panel item exists
    if (!tooltipPanel?.classList.contains('visible') || !panelItem || !imageSection) {
      animationFrameId = requestAnimationFrame(drawLine);
      return;
    }

    // Get target hotspot:
    // 1. Prefer active hotspot
    // 2. Then hotspot that links to the current block being displayed
    // 3. Fallback to first hotspot
    const activeHotspot = container.querySelector('.hotspot-marker.active');
    const matchingHotspot = currentBlockId
      ? imageSection.querySelector(`.hotspot-marker[data-target-hotspot="${currentBlockId}"]`)
      : null;
    const firstHotspot = imageSection.querySelector('.hotspot-marker');
    const targetHotspot = activeHotspot || matchingHotspot || firstHotspot;

    if (!targetHotspot) {
      animationFrameId = requestAnimationFrame(drawLine);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const w = containerRect.width;
    const h = containerRect.height;
    if (!w || !h) {
      animationFrameId = requestAnimationFrame(drawLine);
      return;
    }
    const hotspotRect = targetHotspot.getBoundingClientRect();
    const tooltipPanelRect = tooltipPanel.getBoundingClientRect();
    const imageSectionRect = imageSection.getBoundingClientRect();
    const tooltipContent = container.querySelector('.hotspot-tooltip-content');
    let panelItemRect = panelItem.getBoundingClientRect();

    // Detect mobile mode: panel is below image when panel's top is >= image's bottom
    // or when container has flex-direction: column (stacked layout)
    const containerStyles = window.getComputedStyle(container);
    const isMobileLayout = containerStyles.flexDirection === 'column'
      || tooltipPanelRect.top >= imageSectionRect.bottom - 20;

    // Align panel item center with hotspot center (desktop only)
    // Skip during transitions to allow CSS animation to complete
    if (!isMobileLayout && tooltipContent && !transitioningContainers.has(container)) {
      // Get the TARGET padding value (what we're animating towards)
      const targetPadding = parseFloat(tooltipContent.style.paddingTop) || 0;

      // Use tooltip panel's top as stable reference (doesn't change during animation)
      // Panel item's position at padding=0 would be near the top of the panel
      const panelItemHeight = panelItem.offsetHeight;
      const panelTopPadding = parseFloat(window.getComputedStyle(tooltipPanel).paddingTop) || 40;

      // Calculate where panel item center would be at padding 0
      // (tooltip panel top + panel's padding + half of panel item height)
      const panelItemCenterYAtZero = tooltipPanelRect.top + panelTopPadding + (panelItemHeight / 2);

      // Calculate hotspot center Y (absolute position)
      const hotspotCenterYAbs = hotspotRect.top + (hotspotRect.height / 2);

      // Calculate desired padding to align centers
      const desiredPaddingTop = Math.max(0, hotspotCenterYAbs - panelItemCenterYAtZero);

      // Only update if significantly different from TARGET (avoids fighting with CSS transition)
      const paddingDiff = Math.abs(desiredPaddingTop - targetPadding);
      if (paddingDiff > 2) {
        tooltipContent.style.paddingTop = `${desiredPaddingTop}px`;
      }

      // Re-get panelItem rect after potential padding change
      panelItemRect = panelItem.getBoundingClientRect();
    } else if (tooltipContent && !transitioningContainers.has(container)) {
      // Reset padding in mobile mode (but not during transitions)
      tooltipContent.style.paddingTop = '';
    }

    let x1; let y1; let x2; let y2;

    // Offset to add spacing between text and line start
    const lineOffset = 10;

    const lineColor = 'black';

    // Hotspot center coordinates
    const hotspotCenterX = hotspotRect.left + (hotspotRect.width / 2) - containerRect.left;
    const hotspotCenterY = hotspotRect.top + (hotspotRect.height / 2) - containerRect.top;

    // Use all <p> elements except the last one for line attachment
    // (last one is typically "Go back")
    // Calculate combined bounding box of these paragraphs
    const allParagraphs = panelItem.querySelectorAll('p');
    let lineTargetRect = panelItemRect; // fallback

    if (allParagraphs.length > 1) {
      // Get all paragraphs except the last one
      const contentParagraphs = Array.from(allParagraphs).slice(0, -1);

      // Calculate combined bounding box
      const firstRect = contentParagraphs[0].getBoundingClientRect();
      const lastRect = contentParagraphs.at(-1).getBoundingClientRect();

      // Combined rect: from first paragraph's top/left to last paragraph's bottom, widest right
      let maxRight = firstRect.right;
      contentParagraphs.forEach((p) => {
        const rect = p.getBoundingClientRect();
        if (rect.right > maxRight) maxRight = rect.right;
      });

      lineTargetRect = {
        top: firstRect.top,
        bottom: lastRect.bottom,
        left: firstRect.left,
        right: maxRight,
        width: maxRight - firstRect.left,
        height: lastRect.bottom - firstRect.top,
      };
    } else if (allParagraphs.length === 1) {
      // Only one paragraph, use it directly
      lineTargetRect = allParagraphs[0].getBoundingClientRect();
    }

    if (isMobileLayout) {
      // Mobile mode: Line from top-center of first paragraph to hotspot center (with offset above)
      x1 = lineTargetRect.left + (lineTargetRect.width / 2) - containerRect.left;
      y1 = lineTargetRect.top - containerRect.top - lineOffset;

      // Line ends at center of hotspot marker
      x2 = hotspotCenterX;
      y2 = hotspotCenterY;
    } else {
      // Desktop: Line from right-center of first paragraph to hotspot center
      x1 = lineTargetRect.right - containerRect.left + lineOffset;
      y1 = lineTargetRect.top + (lineTargetRect.height / 2) - containerRect.top;

      // Line ends at center of hotspot marker
      x2 = hotspotCenterX;
      y2 = hotspotCenterY;
    }

    // Draw connector as a rotated div (avoids SVG rendering issues)
    const length = Math.hypot(x2 - x1, y2 - y1);
    const angleDeg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;

    const lineEl = document.createElement('div');
    lineEl.className = 'hotspot-connector-line';
    lineEl.style.cssText = `position:absolute;left:${x1}px;top:${y1}px;width:${length}px;`
      + `height:1px;background:${lineColor};transform-origin:0 50%;transform:rotate(${angleDeg}deg);`;
    wrapper.appendChild(lineEl);

    // Continue the animation loop
    animationFrameId = requestAnimationFrame(drawLine);
  }

  // Start the continuous drawing loop
  animationFrameId = requestAnimationFrame(drawLine);

  // Return cleanup function
  const cleanup = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (wrapper.parentNode) {
      wrapper.remove();
    }
  };

  // Store cleanup function for later
  animationFrameMap.set(cleanupKey, cleanup);

  return cleanup;
}

/**
 * Parse block-level metadata from the first 3 rows (image, block ID, hotspot text).
 * @param {HTMLElement[]} rows - Block row elements
 * @returns {{ imageElement: HTMLPictureElement|null, blockId: string, hotspotText: string }}
 */
/**
 * Set width/height on img when missing so Chrome does not treat it as "unsized" (CLS).
 * Uses 16:10 to match .hotspot-image-wrapper { aspect-ratio: 16 / 10 }.
 * Preserves or completes attrs when only one of width/height is authored.
 */
function ensureHotspotMainImageDimensions(picture) {
  const img = picture.querySelector('img');
  if (!img) return;
  const aw = 16;
  const ah = 10;
  const defW = 600;
  const defH = 375;
  let w = parseInt(img.getAttribute('width'), 10);
  let h = parseInt(img.getAttribute('height'), 10);
  const hasW = Number.isFinite(w) && w > 0;
  const hasH = Number.isFinite(h) && h > 0;
  if (hasW && hasH) return;
  if (hasW && !hasH) {
    img.setAttribute('height', String(Math.round((w * ah) / aw)));
    return;
  }
  if (hasH && !hasW) {
    img.setAttribute('width', String(Math.round((h * aw) / ah)));
    return;
  }
  img.setAttribute('width', String(defW));
  img.setAttribute('height', String(defH));
}

function parseBlockMetadata(rows) {
  let imageElement = null;
  let blockId = '';
  let hotspotText = '';
  if (rows.length > 0) {
    const picture = rows[0].querySelector('picture');
    if (picture) imageElement = picture;
  }
  if (rows.length > 1) {
    const idCell = rows[1].children[0];
    blockId = idCell ? idCell.textContent?.trim() || '' : '';
  }
  if (rows.length > 2) {
    const textRow = rows[2];
    const firstCell = textRow.children[0];
    const rawHTML = firstCell ? firstCell.innerHTML?.trim() : textRow.innerHTML?.trim();
    if (rawHTML) {
      hotspotText = (window.DOMPurify?.sanitize(rawHTML, DOMPURIFY)) ?? rawHTML;
    }
  }
  return { imageElement, blockId, hotspotText };
}

/**
 * Handle standard hotspot click: toggle panel visibility and attach go-back handlers.
 */
function handleStandardHotspotClick(
  hotspot,
  tooltipContent,
  tooltipPanel,
  imageWrapper,
  container,
  hotspotText,
  reattachListeners,
) {
  const isActive = hotspot.classList.contains('active');
  imageWrapper.querySelectorAll('.hotspot-marker').forEach((m) => m.classList.remove('active'));
  if (isActive) {
    tooltipPanel.classList.remove('visible');
    return;
  }
  hotspot.classList.add('active');
  const panelItemHtml = `<div class="hotspot-panel-item">${hotspotText}</div>`;
  tooltipContent.innerHTML = hotspotText
    ? ((window.DOMPurify?.sanitize(panelItemHtml, DOMPURIFY)) ?? panelItemHtml)
    : '';
  tooltipPanel.classList.add('visible');
  attachGoBackHandlers(tooltipContent, container, reattachListeners);
}

/**
 * Update section and block-content min-height from measured block height.
 */
function updateSectionMinHeight(sectionWrapper, block, sectionData, blockHeight) {
  if (blockHeight <= sectionData.maxHeight) return;
  sectionData.maxHeight = blockHeight;
  if (sectionWrapper) {
    sectionWrapper.style.minHeight = `${sectionData.maxHeight}px`;
    const blockContent = block.closest('.block-content');
    if (blockContent) blockContent.style.minHeight = `${sectionData.maxHeight}px`;
  }
}

export default async function decorate(block) {
  await ensureDOMPurify();

  const rows = Array.from(block.children);
  const metadataRowCount = 3;
  const { imageElement, blockId, hotspotText } = parseBlockMetadata(rows);

  if (blockId) {
    block.id = blockId;
  }

  // Create the main container
  const container = document.createElement('div');
  container.className = 'hotspot-container';
  // Store original block ID for animation cleanup (stays constant across navigations)
  container.dataset.originalBlockId = blockId;

  // Create left panel for tooltip content
  const tooltipPanel = document.createElement('div');
  tooltipPanel.className = 'hotspot-tooltip-panel';

  const tooltipContent = document.createElement('div');
  tooltipContent.className = 'hotspot-tooltip-content';
  tooltipPanel.appendChild(tooltipContent);

  container.appendChild(tooltipPanel);

  // Create right section for image with hotspots
  const imageSection = document.createElement('div');
  imageSection.className = 'hotspot-image-section';

  // Create image wrapper (hotspots will be positioned relative to this)
  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'hotspot-image-wrapper';

  // Add the image
  if (imageElement) {
    const picClone = imageElement.cloneNode(true);
    ensureHotspotMainImageDimensions(picClone);
    imageWrapper.appendChild(picClone);
  }

  imageSection.appendChild(imageWrapper);
  container.appendChild(imageSection);

  // Parse and process hotspot items
  const hotspotItems = rows.slice(metadataRowCount);
  const hotspotGroups = parseHotspotGroups(hotspotItems);

  hotspotGroups.forEach((group, groupIndex) => {
    // Create hotspot marker
    const hotspot = document.createElement('button');
    hotspot.type = 'button'; // Prevent form submission behavior
    hotspot.className = 'hotspot-marker';
    hotspot.setAttribute('aria-label', `Hotspot ${groupIndex + 1}`);
    hotspot.style.left = `${group.x}%`;
    hotspot.style.top = `${group.y}%`;

    // Store position for connecting line
    hotspot.dataset.x = group.x;
    hotspot.dataset.y = group.y;

    moveInstrumentation(group.row, hotspot);

    // Build panel content from block-level hotspot-text
    // The "Go back" link is authored in the content itself, not added here
    const panelHTML = hotspotText
      ? `<div class="hotspot-panel-item">${hotspotText}</div>`
      : '';

    hotspot.dataset.panelContent = panelHTML;

    if (group.type === 'link') {
      hotspot.classList.add('hotspot-link-marker');
      hotspot.dataset.targetHotspot = group.targetId;
      hotspot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // eslint-disable-next-line no-use-before-define
        navigateToHotspotContent(container, group.targetId, hotspot, reattachHotspotListeners);
      });
    } else {
      hotspot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleStandardHotspotClick(
          hotspot,
          tooltipContent,
          tooltipPanel,
          imageWrapper,
          container,
          hotspotText,
          // eslint-disable-next-line no-use-before-define
          reattachHotspotListeners,
        );
      });
    }

    imageWrapper.appendChild(hotspot);
  });

  // Close panel when clicking outside - only if a hotspot is actively selected
  // This prevents the initial panel from being hidden by unrelated clicks (e.g., closing a modal)
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      const hasActiveHotspot = imageWrapper.querySelector('.hotspot-marker.active');
      if (hasActiveHotspot) {
        tooltipPanel.classList.remove('visible');
        imageWrapper.querySelectorAll('.hotspot-marker').forEach((m) => m.classList.remove('active'));
      }
    }
  });

  // Replace block content
  block.replaceChildren(container);

  // Get section-specific data (scoped to this section only)
  const sectionWrapper = block.closest('.section');
  const sectionData = getSectionData(sectionWrapper);

  // Track the first block's info for "Go back" functionality (per section)
  // Must be done BEFORE showInitialPanel so it knows if this is the first block
  if (!sectionData.seenFirst) {
    sectionData.firstBlockId = blockId;
    sectionData.firstBlockElement = block;
    sectionData.seenFirst = true;
  }

  // Setup SVG connector line
  setupConnectorLine(container, blockId);

  // Show initial panel with hotspot-text (so it's visible by default)
  showInitialPanel(container, blockId);

  // Measure block height BEFORE hiding (for consistent section height)
  const blockHeight = block.offsetHeight;
  updateSectionMinHeight(sectionWrapper, block, sectionData, blockHeight);

  // Hide all blocks initially (including first) to prevent CLS
  // First block is shown only when user clicks "The Concept" button (see hero-heritage-cc)
  block.style.display = 'none';
  if (blockId !== sectionData.firstBlockId) {
    block.setAttribute('aria-hidden', 'true');
  }

  // Store original content AFTER showing initial panel (so stored state includes visible panel)
  // Content is stored per-section to avoid conflicts between sections with same block IDs.
  // Use HOTSPOT_CONTAINER_DOMPURIFY so data-target-hotspot/data-panel-content are preserved.
  if (blockId) {
    const stored = (window.DOMPurify?.sanitize(container.innerHTML, HOTSPOT_CONTAINER_DOMPURIFY))
      ?? container.innerHTML;
    sectionData.contentMap.set(blockId, stored);
  }
}

/**
 * Re-attach event listeners after replacing hotspot content
 * @param {HTMLElement} container - The hotspot container
 * @param {string} blockId - The ID of the block currently being displayed
 */
function reattachHotspotListeners(container, blockId) {
  const tooltipPanel = container.querySelector('.hotspot-tooltip-panel');
  const tooltipContent = container.querySelector('.hotspot-tooltip-content');
  const imageSection = container.querySelector('.hotspot-image-section');

  // Re-setup SVG connector line with current block ID
  setupConnectorLine(container, blockId);

  if (!imageSection) {
    return;
  }

  const hotspots = imageSection.querySelectorAll('.hotspot-marker');

  hotspots.forEach((hotspot) => {
    const isLink = hotspot.classList.contains('hotspot-link-marker');
    const panelHTML = hotspot.dataset.panelContent || '';
    const targetId = hotspot.dataset.targetHotspot;

    if (isLink && targetId) {
      hotspot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigateToHotspotContent(container, targetId, hotspot, reattachHotspotListeners);
      });
    } else {
      hotspot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isActive = hotspot.classList.contains('active');

        imageSection.querySelectorAll('.hotspot-marker').forEach((m) => m.classList.remove('active'));

        if (!isActive && tooltipPanel && tooltipContent) {
          hotspot.classList.add('active');
          tooltipContent.innerHTML = (window.DOMPurify?.sanitize(panelHTML, DOMPURIFY))
          ?? panelHTML;
          tooltipPanel.classList.add('visible');

          // Attach go-back handlers to any links with href starting with #
          attachGoBackHandlers(tooltipContent, container, reattachHotspotListeners);
        } else if (tooltipPanel) {
          tooltipPanel.classList.remove('visible');
        }
      });
    }
  });
}
