/**
 * Category Navigation - Collects all category-nav blocks and builds unified navigation
 */

import { loadCSS, loadScript } from '../../scripts/aem.js';

// Track if we've already built the unified nav
let unifiedNavBuilt = false;

/**
 * Reset the unified nav flag - used by editor-support.js when reloading
 * @returns {void}
 */
export function resetUnifiedNavFlag() {
  unifiedNavBuilt = false;
}

/**
 * Build a card from a category nav item row
 */
function buildCardFromRow(row) {
  const cells = Array.from(row.children);
  if (cells.length === 0) return null;

  const card = document.createElement('div');
  card.classList.add('category-nav-card');

  // Extract data from cells
  // Order matches _category-nav.json model:
  // title, link, card-bg, tag1, tag1-bg, tag2, tag2-bg, tag3, tag3-bg, image
  const title = cells[0]?.textContent?.trim() || '';
  const link = cells[1]?.querySelector('a')?.href || cells[1]?.textContent?.trim() || '#';
  const cardBgColor = cells[2]?.textContent?.trim() || '';
  const tag1 = cells[3]?.textContent?.trim() || '';
  const tag1BgColor = cells[4]?.textContent?.trim() || '';
  const tag2 = cells[5]?.textContent?.trim() || '';
  const tag2BgColor = cells[6]?.textContent?.trim() || '';
  const tag3 = cells[7]?.textContent?.trim() || '';
  const tag3BgColor = cells[8]?.textContent?.trim() || '';
  const imageElement = cells[9]?.querySelector('img') || cells[9]?.querySelector('picture');

  // Skip rows without a title - they're likely headers or empty rows
  if (!title) {
    return null;
  }

  // Add data attributes for easier targeting
  card.setAttribute('data-card-title', title);
  if (cardBgColor) card.setAttribute('data-card-gradient', cardBgColor);

  // Add card background color
  if (cardBgColor) {
    card.classList.add(cardBgColor);
  } else {
    card.classList.add('default-tan-gradient');
  }

  const cardLink = document.createElement('a');
  cardLink.href = link;
  cardLink.classList.add('category-nav-card-link');
  cardLink.setAttribute('data-gtm-desk-l3cards-click', '');

  // Tags container
  const tagsContainer = document.createElement('div');
  tagsContainer.classList.add('category-nav-tags');

  // Add tags if they exist
  const tags = [];
  if (tag1) tags.push({ text: tag1, colorClass: tag1BgColor });
  if (tag2) tags.push({ text: tag2, colorClass: tag2BgColor });
  if (tag3) tags.push({ text: tag3, colorClass: tag3BgColor });

  if (tags.length > 0) {
    tags.forEach((tag, index) => {
      const tagSpan = document.createElement('span');
      tagSpan.classList.add('category-nav-tag');
      // Only add color class if it exists and doesn't contain spaces
      if (tag.colorClass && tag.colorClass.trim() && !tag.colorClass.includes(' ')) {
        tagSpan.classList.add(tag.colorClass);
      }
      tagSpan.textContent = tag.text;
      tagSpan.setAttribute('data-tag-index', index + 1);
      tagsContainer.appendChild(tagSpan);
    });
  } else {
    tagsContainer.style.display = 'none';
  }

  // Card title (appended first)
  const titleDiv = document.createElement('div');
  titleDiv.classList.add('category-nav-card-title');
  titleDiv.textContent = title;

  const iconSpan = document.createElement('span');
  iconSpan.classList.add('category-nav-card-icon');
  titleDiv.appendChild(iconSpan);

  cardLink.appendChild(titleDiv);

  // Card image (optional, appended second)
  if (imageElement) {
    const imageWrapper = document.createElement('div');
    imageWrapper.classList.add('category-nav-card-image');
    // Clone the image/picture element to avoid moving it from the original DOM
    imageWrapper.appendChild(imageElement.cloneNode(true));
    cardLink.appendChild(imageWrapper);
  }

  // Tags container (appended last)
  cardLink.appendChild(tagsContainer);

  card.appendChild(cardLink);

  return card;
}

/**
 * Parse a single category-nav block to extract its data
 */
export function parseCategoryNavBlock(block) {
  // Get the category name from the section's first text element
  const section = block.closest('.section');
  const textElements = section?.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
  let categoryName = 'Category';

  // Find the first text element that's not inside the category-nav block
  // eslint-disable-next-line no-restricted-syntax
  for (const el of textElements || []) {
    if (!block.contains(el)) {
      categoryName = el.textContent.trim();
      break;
    }
  }

  // Extract eyebrow-title, link, and linkText from block structure
  const rows = Array.from(block.children);
  let eyebrowTitle = '';
  let linkText = '';
  let linkUrl = '';

  // Category-level fields are in separate rows with 1 cell each at the top
  // Row 0: eyebrow-title (1 cell, plain text)
  // Row 1: explore-link (1 cell, URL - can be plain text or <a> tag)
  // Row 2: explore-link-description (1 cell, plain text)
  // Remaining rows: card items (9 cells each)
  let metadataRowCount = 0;

  // Row 0: eyebrow-title
  if (rows.length > 0 && rows[0].children.length === 1) {
    eyebrowTitle = rows[0].children[0]?.textContent?.trim() || '';
    metadataRowCount = 1;
  }

  // Row 1: explore-link (URL)
  if (rows.length > 1 && rows[1].children.length === 1) {
    const linkCell = rows[1].children[0];
    const linkAnchor = linkCell?.querySelector('a');
    if (linkAnchor) {
      linkUrl = linkAnchor.href || '';
    } else {
      linkUrl = linkCell?.textContent?.trim() || '';
    }
    metadataRowCount = 2;
  }

  // Row 2: explore-link-description (display text)
  if (rows.length > 2 && rows[2].children.length === 1) {
    linkText = rows[2].children[0]?.textContent?.trim() || '';
    metadataRowCount = 3;
  }

  // Get all the category nav items (rows in the block table)
  // Skip metadata rows and start from the first card item (9-cell rows)
  const items = [];
  rows.slice(metadataRowCount).forEach((row) => {
    const card = buildCardFromRow(row);
    if (card) {
      items.push(card);
    }
  });

  return {
    title: categoryName,
    id: categoryName.toLowerCase().replace(/\s+/g, '-').replace(/&/g, ''),
    eyebrowTitle,
    linkText,
    linkUrl,
    items,
  };
}

/**
 * Initialize Swiper for card navigation
 * @param {HTMLElement} carouselWrapper - The carousel wrapper element
 * @param {HTMLElement} prevButton - Previous button
 * @param {HTMLElement} nextButton - Next button
 * @returns {Promise<void>}
 */
async function initializeSwiperNavigation(carouselWrapper, prevButton, nextButton) {
  // Load Swiper library if not already loaded
  await loadCSS('/scripts/swiperjs/swiper-bundle.min.css');
  await loadScript('/scripts/swiperjs/swiper-bundle.min.js');

  // Wait for Swiper to be available
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
      // Timeout after 2 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 2000);
    }
  });
  await waitForSwiper();

  if (typeof Swiper === 'undefined') {
    // eslint-disable-next-line no-console
    console.warn('Swiper library not available');
    return;
  }

  // Get the container that should become the swiper
  const container = carouselWrapper.querySelector('.category-nav-cards-container');
  if (!container) return;

  // Add Swiper classes to the container
  container.classList.add('swiper');

  // Find all cards and wrap them
  const cards = Array.from(container.children);

  // Create swiper-wrapper
  const swiperWrapper = document.createElement('div');
  swiperWrapper.classList.add('swiper-wrapper');

  // Move all cards into swiper-wrapper and add swiper-slide class
  cards.forEach((card) => {
    card.classList.add('swiper-slide');
    swiperWrapper.appendChild(card);
  });

  container.appendChild(swiperWrapper);

  // Configure Swiper
  const swiperConfig = {
    slidesPerView: 3,
    spaceBetween: 30,
    navigation: {
      nextEl: nextButton,
      prevEl: prevButton,
    },
    breakpoints: {
      320: {
        slidesPerView: 1,
        spaceBetween: 20,
      },
      768: {
        slidesPerView: 2,
        spaceBetween: 25,
      },
      1024: {
        slidesPerView: 3,
        spaceBetween: 30,
      },
    },
  };

  // Initialize Swiper
  // eslint-disable-next-line no-undef
  const swiper = new Swiper(container, swiperConfig);

  // Store swiper instance for potential future use
  carouselWrapper.swiperInstance = swiper;
}

/**
 * Build dropdown content
 */
export function buildDropdown(categoryData) {
  if (!categoryData.items || categoryData.items.length === 0) return null;

  const dropdown = document.createElement('div');
  dropdown.classList.add('category-nav-dropdown');
  dropdown.setAttribute('data-category', categoryData.id);

  // Header box
  const hdBx = document.createElement('div');
  hdBx.classList.add('category-nav-dropdown-header');

  // Left side: Eyebrow title
  if (categoryData.eyebrowTitle) {
    const eyebrowText = document.createElement('p');
    eyebrowText.classList.add('category-nav-eyebrow-title');
    eyebrowText.textContent = categoryData.eyebrowTitle;
    hdBx.appendChild(eyebrowText);
  }

  // Right side: Link
  if (categoryData.linkText && categoryData.linkUrl) {
    const linkElement = document.createElement('a');
    linkElement.classList.add('category-nav-explore-link');
    linkElement.href = categoryData.linkUrl;
    linkElement.textContent = categoryData.linkText;
    hdBx.appendChild(linkElement);
  }

  // Add close button for cards block items
  if (categoryData.isFromCardsBlock) {
    const closeButton = document.createElement('button');
    closeButton.classList.add('category-nav-close-button');
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.innerHTML = '×'; // Using × symbol
    closeButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const navItem = dropdown.closest('.category-nav-item-cards');
      if (navItem) {
        navItem.classList.remove('is-open');
      }
    });
    hdBx.appendChild(closeButton);
  }

  dropdown.appendChild(hdBx);

  // Create carousel wrapper if we have cards from Cards block
  const hasCardsFromBlock = categoryData.isFromCardsBlock && categoryData.items.length > 0;

  if (hasCardsFromBlock) {
    // Create carousel wrapper
    const carouselWrapper = document.createElement('div');
    carouselWrapper.classList.add('category-nav-carousel-wrapper');

    // Build card list
    const menuCardList = document.createElement('div');
    menuCardList.classList.add('category-nav-cards-container', 'category-nav-cards-carousel');
    menuCardList.setAttribute('data-current-page', '0');
    menuCardList.setAttribute('data-total-items', categoryData.items.length);

    categoryData.items.forEach((card) => {
      menuCardList.appendChild(card);
    });

    carouselWrapper.appendChild(menuCardList);

    // Always add navigation arrows for Cards block items
    const navigationWrapper = document.createElement('div');
    navigationWrapper.classList.add('category-nav-navigation');

    const prevButton = document.createElement('button');
    prevButton.classList.add('category-nav-nav-button', 'category-nav-nav-prev');
    prevButton.setAttribute('aria-label', 'Previous');
    const prevArrow = document.createElement('span');
    prevArrow.classList.add('nav-arrow');
    prevArrow.textContent = '‹';
    prevButton.appendChild(prevArrow);
    prevButton.disabled = true; // Start disabled

    const nextButton = document.createElement('button');
    nextButton.classList.add('category-nav-nav-button', 'category-nav-nav-next');
    nextButton.setAttribute('aria-label', 'Next');
    const nextArrow = document.createElement('span');
    nextArrow.classList.add('nav-arrow');
    nextArrow.textContent = '›';
    nextButton.appendChild(nextArrow);

    navigationWrapper.appendChild(prevButton);
    navigationWrapper.appendChild(nextButton);

    carouselWrapper.appendChild(navigationWrapper);

    // Initialize Swiper navigation
    initializeSwiperNavigation(carouselWrapper, prevButton, nextButton);

    dropdown.appendChild(carouselWrapper);
  } else {
    // Build card list (traditional approach for category-nav blocks)
    const menuCardList = document.createElement('div');
    menuCardList.classList.add('category-nav-cards-container');

    categoryData.items.forEach((card) => {
      menuCardList.appendChild(card);
    });

    dropdown.appendChild(menuCardList);
  }

  return dropdown;
}

/**
 * Build the unified navigation bar from all category data
 */
function buildUnifiedNavigation(categoriesData) {
  const topNav = document.createElement('div');
  topNav.classList.add('top-nav', 'bg-light-white', 'category-nav-bar');

  const tabsPane = document.createElement('div');
  tabsPane.classList.add('tabs-pane-js', 'category-nav-tabs-pane');

  const tabPane = document.createElement('div');
  tabPane.classList.add('tab-pane', 'top-second-nav-js', 'active', 'category-nav-tab-pane');

  // Create single navigation list
  const navList = document.createElement('ul');
  navList.classList.add('top-nav-left', 'category-nav-list');

  categoriesData.forEach((category) => {
    const li = document.createElement('li');
    li.classList.add('category-nav-item');
    li.setAttribute('data-header-gtm', category.title);
    li.setAttribute('data-category', category.id);

    const link = document.createElement('a');
    link.classList.add('category-nav-link');

    // If category has an icon, use it; otherwise use text
    if (category.iconElement) {
      link.appendChild(category.iconElement);
    } else {
      link.textContent = category.title;
    }

    link.href = `#${category.id}`;

    // Mark cards block items differently for click behavior
    if (category.isFromCardsBlock) {
      li.classList.add('category-nav-item-cards');
      li.setAttribute('data-click-to-open', 'true');

      // Only add bulletin-notification class for bell icon items
      if (category.title === 'bell-outline' || category.title === 'bell') {
        /* eslint-disable-next-line secure-coding/no-hardcoded-credentials -- CSS class */
        li.classList.add('category-nav-bulletin-notification');
      }

      // For cards block: toggle dropdown on click
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isCurrentlyOpen = li.classList.contains('is-open');

        // Close all other open dropdowns
        document.querySelectorAll('.category-nav-item-cards.is-open').forEach((openItem) => {
          if (openItem !== li) {
            openItem.classList.remove('is-open');
          }
        });

        // Toggle this dropdown
        if (isCurrentlyOpen) {
          li.classList.remove('is-open');
        } else {
          li.classList.add('is-open');
        }
      });
    } else {
      // For regular items: scroll to section
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(category.id);
        if (target) {
          const yOffset = -200;
          const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      });
    }

    li.appendChild(link);

    // Build dropdown
    const dropdown = buildDropdown(category);
    if (dropdown) {
      li.appendChild(dropdown);
    }

    // Append to single list
    navList.appendChild(li);
  });

  // Append list to the tab pane
  tabPane.appendChild(navList);

  tabsPane.appendChild(tabPane);
  topNav.appendChild(tabsPane);

  // Add click-outside listener to close cards block dropdowns
  document.addEventListener('click', (e) => {
    const clickedInsideCardsNav = e.target.closest('.category-nav-item-cards');
    if (!clickedInsideCardsNav) {
      document.querySelectorAll('.category-nav-item-cards.is-open').forEach((openItem) => {
        openItem.classList.remove('is-open');
      });
    }
  });

  return topNav;
}

/**
 * Smart positioning for dropdown menus to prevent overflow
 * Positions each dropdown to stay within viewport with padding
 * Accounts for responsive dropdown widths based on viewport size
 */
function positionDropdowns() {
  const navItems = document.querySelectorAll('.category-nav-item');
  const viewportWidth = window.innerWidth;
  const padding = 40; // Extra padding from right edge

  // Determine dropdown width based on viewport (matches CSS media queries)
  let dropdownWidth = 860; // Default width for >= 1200px
  if (viewportWidth >= 990 && viewportWidth < 1200) {
    dropdownWidth = 720; // Medium screens
  }

  navItems.forEach((item) => {
    const dropdown = item.querySelector('.category-nav-dropdown');
    if (!dropdown) return;

    // Get the position of the nav item
    const itemRect = item.getBoundingClientRect();

    // Calculate if dropdown would overflow
    const dropdownRightEdge = itemRect.left + dropdownWidth;
    const overflow = dropdownRightEdge - (viewportWidth - padding);

    // Reset any previous positioning
    dropdown.style.left = '';
    dropdown.style.right = '';

    if (overflow > 0) {
      // Dropdown would overflow, shift it left
      const shift = overflow;
      dropdown.style.left = `-${shift}px`;
    } else {
      // Dropdown fits, align to left edge of trigger
      dropdown.style.left = '0';
    }
  });
}

/**
 * Convert a cards block card (li element) to category-nav dropdown card format
 * @param {HTMLElement} cardLi - The card li element from cards block
 * @returns {HTMLElement} Converted card element for dropdown
 */
function convertCardsBlockCardToDropdownCard(cardLi) {
  const card = document.createElement('div');
  card.classList.add('category-nav-card', 'category-nav-bulletin-card');

  // Main card wrapper (not a link anymore, since we have multiple links inside)
  const cardWrapper = document.createElement('div');
  /* eslint-disable-next-line secure-coding/no-hardcoded-credentials -- CSS class */
  cardWrapper.classList.add('category-nav-bulletin-card-wrapper');

  // Extract content from card body (cards.js already validated structure)
  const cardBody = cardLi.querySelector('.cards-card-body');
  let title = '';
  const paragraphElements = [];

  // Check for heading first
  const heading = cardBody?.querySelector('h1, h2, h3, h4, h5, h6');
  const paragraphs = Array.from(cardBody?.querySelectorAll('p') || []);

  if (heading) {
    // If there's a heading, use it as title
    title = heading.textContent.trim();
    // All paragraphs are kept for processing
    paragraphElements.push(...paragraphs);
  } else if (paragraphs.length > 0) {
    // No heading, so first paragraph is the title
    title = paragraphs[0].textContent.trim();
    // Remaining paragraphs are kept for processing (skip the first one)
    paragraphElements.push(...paragraphs.slice(1));
  }

  // Extract and add image first
  const cardImage = cardLi.querySelector('.cards-card-image');
  if (cardImage) {
    const imageWrapper = document.createElement('div');
    /* eslint-disable-next-line secure-coding/no-hardcoded-credentials -- CSS class */
    imageWrapper.classList.add('category-nav-bulletin-card-image');
    imageWrapper.appendChild(cardImage.cloneNode(true));
    cardWrapper.appendChild(imageWrapper);
  }

  // Create a body container to wrap title, description, divider, and buttons
  // This container will have the red background and padding
  const bodyContainer = document.createElement('div');
  bodyContainer.classList.add('category-nav-bulletin-card-body');

  // Add title
  if (title) {
    const titleDiv = document.createElement('div');
    /* eslint-disable-next-line secure-coding/no-hardcoded-credentials -- CSS class */
    titleDiv.classList.add('category-nav-bulletin-card-title');
    titleDiv.textContent = title;
    bodyContainer.appendChild(titleDiv);
  }

  // Process paragraphs according to the new logic
  // Separate paragraphs into description text and button links
  const descriptionParagraphs = [];
  const buttonParagraphs = [];

  paragraphElements.forEach((p) => {
    const link = p.querySelector('a[href]');
    const text = p.textContent.trim();
    const isJustLink = link && text === link.textContent.trim();

    if (isJustLink) {
      // This paragraph is just a link, should be a button
      buttonParagraphs.push(p);
    } else if (text) {
      // This paragraph has text content (not just a link)
      descriptionParagraphs.push(p);
    }
  });

  // Display description paragraphs
  descriptionParagraphs.forEach((p) => {
    const text = p.textContent.trim();

    if (text === '---') {
      // Convert "---" to horizontal divider
      const divider = document.createElement('hr');
      /* eslint-disable-next-line secure-coding/no-hardcoded-credentials -- CSS class */
      divider.classList.add('category-nav-bulletin-card-divider');
      bodyContainer.appendChild(divider);
    } else if (text) {
      // Display as description text
      const textLine = document.createElement('div');
      /* eslint-disable-next-line secure-coding/no-hardcoded-credentials -- CSS class */
      textLine.classList.add('category-nav-bulletin-card-description');
      textLine.textContent = text;
      bodyContainer.appendChild(textLine);
    }
  });

  // Display button links in a row at the bottom
  if (buttonParagraphs.length > 0) {
    const buttonsRow = document.createElement('div');
    /* eslint-disable-next-line secure-coding/no-hardcoded-credentials -- CSS class */
    buttonsRow.classList.add('category-nav-bulletin-card-buttons');

    buttonParagraphs.forEach((p) => {
      const link = p.querySelector('a[href]');
      if (link) {
        const button = document.createElement('a');
        /* eslint-disable-next-line secure-coding/no-hardcoded-credentials -- CSS class */
        button.classList.add('category-nav-bulletin-card-button');
        button.href = link.href;
        button.textContent = link.textContent.trim();
        button.setAttribute('data-gtm-desk-l3cards-click', '');
        buttonsRow.appendChild(button);
      }
    });

    if (buttonsRow.children.length > 0) {
      bodyContainer.appendChild(buttonsRow);
    }
  }

  // Append the body container to the card wrapper
  cardWrapper.appendChild(bodyContainer);

  card.appendChild(cardWrapper);
  return card;
}

/**
 * Get text elements that are outside any .block (for section-level content)
 * @param {HTMLElement} section - Section to query
 * @param {Array<HTMLElement>} [cached] - Optional pre-computed list
 * @returns {Array<HTMLElement>}
 */
function getTextElementsOutsideBlocks(section, cached = null) {
  if (cached) return cached;
  const all = section.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
  const result = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const el of all || []) {
    if (!el.closest('.block')) result.push(el);
  }
  return result;
}

/**
 * Build icon element and name from a span.icon
 * @param {HTMLElement} iconSpan - Element with class icon and icon-*
 * @returns {{ iconElement: HTMLElement, iconName: string }}
 */
function createIconElementFromSpan(iconSpan) {
  const iconClass = Array.from(iconSpan.classList).find((c) => c.startsWith('icon-'));
  const iconName = iconClass ? iconClass.substring(5) : 'icon';
  const iconElement = document.createElement('span');
  iconElement.classList.add('icon', `icon-${iconName}`);
  const iconImg = document.createElement('img');
  iconImg.setAttribute('data-icon-name', iconName);
  iconImg.src = `/icons/${iconName}.svg`;
  iconImg.alt = iconName;
  iconImg.loading = 'lazy';
  iconElement.appendChild(iconImg);
  return { iconElement, iconName };
}

/**
 * Parse a section with a Cards block to extract category data
 * @param {HTMLElement} section - The section element containing Cards block
 * @param {Array<HTMLElement>} [cachedTextElements] - Optional cached text elements
 * @returns {Object} Category data object
 */
function parseSectionWithCardsBlock(section, cachedTextElements = null) {
  const textElementsOutsideBlocks = getTextElementsOutsideBlocks(section, cachedTextElements);

  let categoryName = 'Category';
  let iconElement = null;
  let dropdownTitle = '';

  if (textElementsOutsideBlocks.length > 0) {
    const firstElement = textElementsOutsideBlocks[0];
    const icon = firstElement.querySelector('span.icon');
    if (icon) {
      const { iconElement: el, iconName } = createIconElementFromSpan(icon);
      iconElement = el;
      categoryName = iconName;
    } else {
      categoryName = firstElement.textContent.trim();
    }
  }

  if (textElementsOutsideBlocks.length > 1) {
    dropdownTitle = textElementsOutsideBlocks[1].textContent.trim();
  }

  const cardsBlock = section.querySelector('.cards.block');
  if (!cardsBlock) return null;

  const cardItems = cardsBlock.querySelectorAll('.cards-card');
  const items = [];
  cardItems.forEach((cardLi) => {
    const convertedCard = convertCardsBlockCardToDropdownCard(cardLi);
    if (convertedCard) items.push(convertedCard);
  });

  return {
    title: categoryName,
    id: categoryName.toLowerCase().replace(/\s+/g, '-').replace(/&/g, ''),
    eyebrowTitle: dropdownTitle,
    linkText: '',
    linkUrl: '',
    items,
    isFromCardsBlock: true,
    iconElement,
  };
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

  // In Universal Editor, the content is loaded via a proxy/canvas URL,
  // so window.location.pathname doesn't reflect the actual page path.
  // We need to check the data-aue-resource attribute on main element.
  const mainElement = document.querySelector('main[data-aue-resource]');
  const isInUniversalEditor = !!mainElement;

  if (isInUniversalEditor) {
    // Get the resource path from the data-aue-resource attribute
    // Format: "urn:aemconnection:/content/idfc-edge/framework/ccnav.html/jcr:content"
    const resourcePath = mainElement.getAttribute('data-aue-resource') || '';
    const isUEFrameworkPath = resourcePath.includes('/framework/');
    return isUEFrameworkPath;
  }

  return isFrameworkPath;
}

/**
 * Find sections that have a Cards block and icon (bell) but no category-nav block.
 * Returns array of { section, textElements } for use in parseSectionWithCardsBlock.
 * @param {NodeListOf<Element>|Element[]} allCategoryNavBlocks
 * @returns {Array<{ section: HTMLElement, textElements: HTMLElement[] }>}
 */
function getSectionsWithCardsData(allCategoryNavBlocks) {
  const sectionsWithCardsData = [];
  if (allCategoryNavBlocks.length === 0) return sectionsWithCardsData;

  const firstNavBlock = allCategoryNavBlocks[0];
  const container = firstNavBlock.closest('.section')?.parentElement;
  if (!container) return sectionsWithCardsData;

  const allSiblings = Array.from(container.children).filter((el) => el.classList.contains('section'));
  allSiblings.forEach((section) => {
    const hasCardsBlock = section.querySelector('.cards.block');
    const hasCategoryNav = section.querySelector('.category-nav.block');
    const textElements = Array.from(section.querySelectorAll('p, h1, h2, h3, h4, h5, h6'))
      .filter((el) => !el.closest('.block'));
    const hasIcon = textElements.some((el) => el.querySelector('span.icon'));
    if (hasCardsBlock && !hasCategoryNav && hasIcon) {
      sectionsWithCardsData.push({ section, textElements });
    }
  });
  return sectionsWithCardsData;
}

export default function decorate(block) {
  if (isEditingFrameworkPage()) return;
  if (block.hasAttribute('data-fragment-block')) return;
  if (unifiedNavBuilt) {
    block.style.display = 'none';
    return;
  }

  unifiedNavBuilt = true;

  const main = document.querySelector('main');
  const allCategoryNavBlocks = main ? main.querySelectorAll('.category-nav.block') : [block];
  const sectionsWithCardsData = getSectionsWithCardsData(allCategoryNavBlocks);

  if (allCategoryNavBlocks.length === 0 && sectionsWithCardsData.length === 0) {
    block.style.display = 'none';
    return;
  }

  // Parse data from all blocks and sections, and add section IDs
  const categoriesData = [];

  // First, process traditional category-nav blocks
  allCategoryNavBlocks.forEach((navBlock) => {
    const categoryData = parseCategoryNavBlock(navBlock);
    if (categoryData.items.length > 0) {
      categoriesData.push(categoryData);

      // Add ID to the section for anchor navigation
      const section = navBlock.closest('.section');
      if (section && !section.id) {
        section.id = categoryData.id;
        section.setAttribute('data-category-id', categoryData.id);
      }
    }
  });

  // Then, process sections with Cards blocks (using cached text elements)
  sectionsWithCardsData.forEach(({ section, textElements }) => {
    const categoryData = parseSectionWithCardsBlock(section, textElements);
    if (categoryData && categoryData.items.length > 0) {
      categoriesData.push(categoryData);

      // Add ID to the section for anchor navigation
      if (!section.id) {
        section.id = categoryData.id;
        section.setAttribute('data-category-id', categoryData.id);
      }
    }
  });

  if (categoriesData.length === 0) {
    block.style.display = 'none';
    return;
  }

  // Build the unified navigation
  const unifiedNav = buildUnifiedNavigation(categoriesData);

  // Find the wrapper that was created by scripts.js
  let categoryNavWrapper = document.querySelector('.category-nav-wrapper[data-nav-placeholder="true"]');

  if (!categoryNavWrapper) {
    // If no placeholder wrapper exists, create one
    categoryNavWrapper = document.createElement('div');
    categoryNavWrapper.classList.add('category-nav-wrapper');
    if (main) {
      main.insertBefore(categoryNavWrapper, main.firstChild);
    } else {
      // eslint-disable-next-line no-console
      console.error('[Category Nav Block] Could not find main element to insert wrapper');
    }
  }

  // Populate the wrapper with the unified navigation
  categoryNavWrapper.innerHTML = '';
  categoryNavWrapper.appendChild(unifiedNav);
  categoryNavWrapper.removeAttribute('data-nav-placeholder');

  // Move to header
  const navWrapper = document.querySelector('header.header-wrapper .nav-wrapper');
  if (navWrapper && !navWrapper.contains(categoryNavWrapper)) {
    navWrapper.appendChild(categoryNavWrapper);
    categoryNavWrapper.classList.add('header-category-nav');
  }

  // Hide all the individual category-nav blocks in the main content
  allCategoryNavBlocks.forEach((navBlock) => {
    navBlock.style.display = 'none';
    // Also hide the parent section if it only contains the nav block
    const section = navBlock.closest('.section');
    if (section) {
      const visibleContent = Array.from(section.children).filter(
        (child) => child !== navBlock && !child.classList.contains('section-metadata') && child.textContent.trim() !== '',
      );
      if (visibleContent.length === 0) {
        section.style.display = 'none';
      }
    }
  });

  // Remove sections with Cards blocks that are now in the nav (bell notifications, etc.)
  // These sections have already been processed and moved to the navigation bar
  // EXCEPT in Universal Editor where they need to remain visible for editing
  const isInUniversalEditor = window.hlx?.isEditor === true;

  if (!isInUniversalEditor) {
    sectionsWithCardsData.forEach(({ section }) => {
      section.remove();
    });
  }

  // Position dropdowns intelligently after a short delay to ensure DOM is fully rendered
  setTimeout(() => {
    positionDropdowns();
  }, 100);

  // Reposition dropdowns on window resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      positionDropdowns();
    }, 150);
  });

  // Also reposition on mouseenter for extra accuracy
  const navItems = document.querySelectorAll('.category-nav-item');
  navItems.forEach((item) => {
    item.addEventListener('mouseenter', () => {
      positionDropdowns();
    });
  });
}
