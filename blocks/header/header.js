import { getMetadata, decorateIcons } from '../../scripts/aem.js';
import { loadFragment, DOMPURIFY } from '../../scripts/scripts.js';
import { parseCategoryNavBlock, buildDropdown } from '../category-nav/category-nav.js';

// media query matches for different viewport sizes
const isDesktop = window.matchMedia('(min-width: 990px)');
const isLargeDesktop = window.matchMedia('(min-width: 1200px)');

// Cache for dynamically imported block modules (performance optimization)
const blockModuleCache = new Map();

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === 'nav-drop';
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  sections.querySelectorAll('.nav-sections .default-content-wrapper > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');

  // Reset tab view when closing menu
  if (expanded) {
    navSections.classList.remove('tab-view-active');
    const tabBar = navSections.querySelector('.nav-tab-bar');
    if (tabBar) {
      tabBar.remove();
    }
    // Reset all sections display
    const sectionsUl = navSections.querySelector('.default-content-wrapper > ul');
    const allSections = sectionsUl ? Array.from(sectionsUl.querySelectorAll(':scope > li')) : [];
    allSections.forEach((section) => {
      section.style.display = '';
      section.classList.remove('active-tab-content');
      section.setAttribute('aria-expanded', 'false');
      // Remove explore links
      const exploreLink = section.querySelector('.explore-section-link');
      if (exploreLink) {
        exploreLink.remove();
      }
    });
  }

  // Always collapse all nav sections when toggling the menu
  toggleAllNavSections(navSections, false);
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  // enable nav dropdown keyboard accessibility
  const navDrops = navSections.querySelectorAll('.nav-drop');
  if (isDesktop.matches) {
    navDrops.forEach((drop) => {
      if (!drop.hasAttribute('tabindex')) {
        drop.setAttribute('tabindex', 0);
        drop.addEventListener('focus', focusNavSection);
      }
    });
  } else {
    navDrops.forEach((drop) => {
      drop.removeAttribute('tabindex');
      drop.removeEventListener('focus', focusNavSection);
    });
  }

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    window.addEventListener('keydown', closeOnEscape);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
  }
}

/**
 * Creates a dropdown with overlay functionality
 * @param {Object} options Configuration options
 * @returns {Object} Dropdown controls and functions
 */
function createDropdown(options) {
  const {
    className,
    overlayClassName,
    fragmentPath,
    closeDelay = 100,
  } = options;

  const dropdown = document.createElement('div');
  dropdown.className = className;

  const closeBtn = document.createElement('button');
  closeBtn.className = `${className.split(' ')[0]}-close-btn`;
  closeBtn.textContent = '\u00D7'; // × (multiplication sign / close icon)
  closeBtn.setAttribute('aria-label', 'Close');
  dropdown.appendChild(closeBtn);

  const overlay = document.createElement('div');
  overlay.className = overlayClassName;

  document.body.appendChild(overlay);
  document.body.appendChild(dropdown);

  let loaded = false;
  let closeTimeout = null;

  const openDropdown = async () => {
    clearTimeout(closeTimeout);
    if (!loaded && fragmentPath) {
      const dropdownFragment = await loadFragment(fragmentPath);
      if (dropdownFragment) dropdown.append(...dropdownFragment.childNodes);
      loaded = true;
    }
    if (!isDesktop.matches) overlay.classList.add('visible');
    dropdown.classList.add('open');
  };

  const closeDropdown = () => {
    overlay.classList.remove('visible');
    dropdown.classList.remove('open');
  };

  const scheduleClose = () => {
    clearTimeout(closeTimeout);
    closeTimeout = setTimeout(closeDropdown, closeDelay);
  };

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeDropdown();
  });
  overlay.addEventListener('click', () => closeDropdown());

  return {
    dropdown,
    overlay,
    openDropdown,
    closeDropdown,
    scheduleClose,
    clearTimeout: () => clearTimeout(closeTimeout),
  };
}

/**
 * Start odometer animation for Customer Service in nav-tools
 * @param {Element} navTools Nav tools container
 */
function startOdometerAnimation(navTools) {
  const odometerTrack = navTools.querySelector('.grnt-odometer-track');
  if (!odometerTrack) return;

  const spans = odometerTrack.querySelectorAll('span');
  const spanHeight = 20;
  const totalItems = spans.length - 1;
  let currentIndex = 0;

  setInterval(() => {
    currentIndex += 1;
    odometerTrack.style.transform = `translateY(-${currentIndex * spanHeight}px)`;
    if (currentIndex >= totalItems) {
      setTimeout(() => {
        odometerTrack.style.transition = 'none';
        odometerTrack.style.transform = 'translateY(0)';
        currentIndex = 0;
        setTimeout(() => {
          odometerTrack.style.transition = 'transform 0.6s ease-in-out';
        }, 50);
      }, 600);
    }
  }, 1500);
}

/**
 * Setup customer service dropdown on odometer; returns openDropdown for mobile use.
 * @param {Element} navTools Nav tools container
 * @returns {(() => Promise<void>)|null} openDropdown or null
 */
function setupCustomerServiceDropdown(navTools) {
  const odometerEl = navTools.querySelector('.grnt-animation-odometer');
  const odometerLi = odometerEl?.closest('li');
  if (!odometerLi) return null;

  const cs = createDropdown({
    className: 'cs-dropdown',
    overlayClassName: 'cs-dropdown-overlay',
    fragmentPath: '/fragments/customer-service-dropdown',
    closeDelay: 100,
  });

  odometerLi.style.cursor = 'pointer';
  odometerLi.addEventListener('mouseenter', () => {
    if (isDesktop.matches) cs.openDropdown();
  });
  cs.dropdown.addEventListener('mouseenter', () => cs.clearTimeout());
  cs.dropdown.addEventListener('mouseleave', (e) => {
    if (isDesktop.matches && !odometerLi.contains(e.relatedTarget)) cs.scheduleClose();
  });
  odometerLi.addEventListener('mouseleave', (e) => {
    if (isDesktop.matches && !cs.dropdown.contains(e.relatedTarget)) cs.scheduleClose();
  });
  odometerLi.addEventListener('click', () => {
    if (!isDesktop.matches) cs.openDropdown();
  });

  document.addEventListener('click', (e) => {
    const clickedMobileOdometer = e.target.closest('.mobile-customer-service-odometer');
    const isOutsideClick = !cs.dropdown.contains(e.target)
      && !odometerLi.contains(e.target)
      && !clickedMobileOdometer
      && !cs.overlay.contains(e.target);
    if (!isDesktop.matches && isOutsideClick) cs.closeDropdown();
  });

  return cs.openDropdown;
}

/**
 * Setup login dropdown on #login-button.
 * @param {Element} navToolsWrapper Nav tools wrapper containing #login-button
 */
function setupLoginDropdown(navToolsWrapper) {
  const loginButton = navToolsWrapper.querySelector('#login-button');
  if (!loginButton) return;

  const login = createDropdown({
    className: 'login-dropdown',
    overlayClassName: 'login-dropdown-overlay',
    fragmentPath: '/fragments/login',
    closeDelay: 200,
  });

  loginButton.addEventListener('mouseenter', () => {
    if (isDesktop.matches) login.openDropdown();
  });
  login.dropdown.addEventListener('mouseenter', () => login.clearTimeout());
  login.dropdown.addEventListener('mouseleave', (e) => {
    if (isDesktop.matches && !loginButton.contains(e.relatedTarget)) login.scheduleClose();
  });
  loginButton.addEventListener('mouseleave', (e) => {
    if (isDesktop.matches && !login.dropdown.contains(e.relatedTarget)) login.scheduleClose();
  });
  loginButton.addEventListener('click', () => {
    if (!isDesktop.matches) login.openDropdown();
  });
  document.addEventListener('click', (e) => {
    const isOutsideClick = !login.dropdown.contains(e.target)
      && !loginButton.contains(e.target)
      && !login.overlay.contains(e.target);
    if (isOutsideClick && login.dropdown.classList.contains('open')) login.closeDropdown();
  });
}

/** Search fallback suggestions list (used when API fails or returns empty). */
const SEARCH_FALLBACK_SUGGESTIONS = [
  { title: 'Personal Loan', url: '/personal-banking/loans/personal-loan', type: 'Loan' },
  { title: 'Savings Account', url: '/personal-banking/accounts/savings-account', type: 'Account' },
  { title: 'Fixed Deposit', url: '/personal-banking/deposits/fixed-deposit', type: 'Deposit' },
  { title: 'Home Loan', url: '/personal-banking/loans/home-loan', type: 'Loan' },
  { title: 'FASTag', url: '/personal-banking/fastag', type: 'Service' },
  { title: 'Mutual Funds', url: '/wealth-management/mutual-funds', type: 'Investment' },
  { title: 'Current Account', url: '/business-banking/current-account', type: 'Account' },
  { title: 'Business Loan', url: '/business-banking/loans/business-loan', type: 'Loan' },
  { title: 'NRI Account', url: '/nri-banking/nri-savings-account', type: 'Account' },
  { title: 'Gaj Credit Card', url: '/credit-card/metal-credit-card/gaj', type: 'Premium Metal' },
  { title: 'Ashva Credit Card', url: '/credit-card/metal-credit-card/ashva', type: 'Premium Metal' },
  { title: 'Mayura Credit Card', url: '/credit-card/metal-credit-card/mayura', type: 'Premium Metal' },
  { title: 'FIRST Private Credit Card', url: '/credit-card/FIRSTPrivateCreditCard', type: 'Premium Metal' },
  { title: 'Diamond Reserve Credit Card', url: '/credit-card/diamond-reserve-credit-card', type: 'Travel' },
  { title: 'IndiGo Credit Card', url: '/credit-card/indigo-credit-card', type: 'Travel' },
  { title: 'Club Vistara Credit Card', url: '/credit-card/vistara-credit-card', type: 'Travel' },
  { title: 'FIRST WOW! Black Credit Card', url: '/credit-card/wow-black-credit-card', type: 'Travel' },
  { title: 'FIRST Classic Credit Card', url: '/credit-card/classic', type: 'Lifetime Free' },
  { title: 'FIRST Millennia Credit Card', url: '/credit-card/millennia', type: 'Lifetime Free' },
  { title: 'FIRST Select Credit Card', url: '/credit-card/select', type: 'Lifetime Free' },
  { title: 'FIRST Wealth Credit Card', url: '/credit-card/wealth', type: 'Lifetime Free' },
  { title: 'FIRST WOW! Credit Card', url: '/credit-card/wow', type: 'Lifetime Free' },
  { title: 'LIC Classic Credit Card', url: '/credit-card/lic-classic-credit-card', type: 'Lifetime Free' },
  { title: 'LIC Select Credit Card', url: '/credit-card/lic-credit-card', type: 'Lifetime Free' },
  { title: 'Hello Cashback Credit Card', url: '/credit-card/hello-cashback-credit-card', type: 'UPI Card' },
  { title: 'FIRST Power Credit Card', url: '/credit-card/hpcl-power-fuel-credit-card', type: 'Fuel & UPI' },
  { title: 'FIRST Power+ Credit Card', url: '/credit-card/hpcl-power-fuel-credit-card', type: 'Fuel & UPI' },
  { title: 'FIRST EA₹N Credit Card', url: '/credit-card/secured-rupay-credit-card', type: 'UPI Card' },
  { title: 'FIRST Digital RuPay Credit Card', url: '/credit-card/rupay-credit-card', type: 'UPI Card' },
  { title: 'FIRST SWYP EMI Credit Card', url: '/credit-card/swyp-emi-credit-card', type: 'EMI Card' },
  { title: 'CreditPro Balance Transfer', url: '/credit-card/credit-card-balance-transfer', type: 'Balance Transfer' },
  { title: 'Business Credit Card', url: '/credit-card/business-credit-card-sme', type: 'Business' },
  { title: 'Corporate Credit Card', url: '/credit-card/corporate-credit-card', type: 'Business' },
  { title: 'Purchase Credit Card', url: '/credit-card/purchase-credit-card', type: 'Business' },
  { title: 'Credit Card Referral Program', url: '/credit-card/credit-card-referral-program', type: 'Service' },
  { title: 'Add-on Credit Card', url: '/credit-card/add-on-credit-card', type: 'Service' },
  { title: 'Personalised Credit Card', url: '/credit-card/image-card/apply', type: 'Service' },
  { title: 'Credit Card', url: '/credit-card', type: 'Product' },
];

function getSearchFallbackSuggestions(query) {
  const lowerQuery = query.toLowerCase();
  return SEARCH_FALLBACK_SUGGESTIONS
    .filter((item) => item.title.toLowerCase().includes(lowerQuery))
    .slice(0, 10);
}

/** Tracks which mobile odometer containers have started animation (run once per container). */
const mobileOdometerStarted = new WeakSet();

/**
 * Start mobile odometer animation once per container.
 * @param {Element} container Element with .grnt-odometer-track
 */
function startMobileOdometerAnimation(container) {
  if (!container || mobileOdometerStarted.has(container)) return;
  mobileOdometerStarted.add(container);

  const track = container.querySelector('.grnt-odometer-track');
  if (!track) return;

  const spans = track.querySelectorAll('span');
  const spanHeight = 20;
  const totalItems = spans.length - 1;
  let currentIndex = 0;
  track.style.transform = 'translateY(0)';

  setInterval(() => {
    currentIndex += 1;
    track.style.transform = `translateY(-${currentIndex * spanHeight}px)`;
    if (currentIndex >= totalItems) {
      setTimeout(() => {
        track.style.transition = 'none';
        track.style.transform = 'translateY(0)';
        currentIndex = 0;
        setTimeout(() => { track.style.transition = 'transform 0.6s ease-in-out'; }, 50);
      }, 600);
    }
  }, 1500);
}

/**
 * Build mobile customer-service odometer container (markup only).
 * @param {string[]} odometerItemTexts Text for each odometer item
 * @returns {Element} Container element
 */
function buildMobileOdometerContainer(odometerItemTexts) {
  const container = document.createElement('div');
  /* eslint-disable-next-line secure-coding/no-hardcoded-credentials --
  CSS class, not credential. Next time don't use 'service' in the class name. */
  container.className = 'mobile-customer-service-odometer';
  if (odometerItemTexts.length === 0) return container;

  const spans = odometerItemTexts.map((text) => `<span>${text}</span>`).join('');
  const firstItemText = odometerItemTexts[0];
  const odometerHtml = `
    <div class="grnt-animation-odometer">
      <div class="grnt-odometer-track">
        ${spans}
        <span>${firstItemText}</span>
      </div>
    </div>
  `;
  container.innerHTML = (window.DOMPurify?.sanitize(odometerHtml, DOMPURIFY)) ?? odometerHtml;
  return container;
}

/**
 * Wire mobile odometer click and start animation when nav expands.
 * @param {Element} nav Nav element (aria-expanded observed)
 * @param {Element} mobileOdometerContainer Mobile odometer container
 * @param {(() => void)|null} csDropdownOpen Open function for customer service dropdown
 */
function wireMobileOdometer(nav, mobileOdometerContainer, csDropdownOpen) {
  mobileOdometerContainer.style.cursor = 'pointer';
  mobileOdometerContainer.addEventListener('click', () => {
    if (!isDesktop.matches && csDropdownOpen) csDropdownOpen();
  });

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'aria-expanded' && nav.getAttribute('aria-expanded') === 'true') {
        setTimeout(() => startMobileOdometerAnimation(mobileOdometerContainer), 100);
      }
    });
  });
  observer.observe(nav, { attributes: true });
}

/**
 * Initialize nav section behaviors (desktop/tablet/mobile) per section.
 * @param {Object} domCache Cache with allNavSections
 * @param {function(Element)} setupDesktop Called for each section when isLargeDesktop
 * @param {function(Element)} setupTablet Called for each section when isDesktop but not large
 * @param {function(Element)} setupMobile Called for each section when mobile
 */
function initNavSectionBehaviors(domCache, setupDesktop, setupTablet, setupMobile) {
  domCache.allNavSections.forEach((navSection) => {
    if (!navSection.getAttribute('data-fragment-path')) return;
    if (isLargeDesktop.matches) setupDesktop(navSection);
    else if (isDesktop.matches) setupTablet(navSection);
    else setupMobile(navSection);
  });
}

/**
 * Setup search dropdown (search box, results, mobile search icon).
 * @param {Element} navToolsWrapper Wrapper containing #search-box
 * @param {Element} navTools Nav tools container (for mobile search icon)
 */
function setupSearchDropdown(navToolsWrapper, navTools) {
  const searchBox = navToolsWrapper.querySelector('#search-box');
  if (!searchBox) return;

  const search = createDropdown({
    className: 'search-dropdown',
    overlayClassName: 'search-dropdown-overlay',
    fragmentPath: '/fragments/search-dropdown',
    closeDelay: 100,
  });

  const mobileSearchBox = document.createElement('div');
  mobileSearchBox.className = 'mobile-search-input-wrapper';
  mobileSearchBox.id = 'mobile-search-box';
  const mobileSearchHtml = `
    <span class="icon icon-search"></span>
    <input type="text" placeholder="What are you looking for..." class="search-input mobile-search-input" />
  `;
  mobileSearchBox.innerHTML = (window.DOMPurify?.sanitize(mobileSearchHtml, DOMPURIFY))
   ?? mobileSearchHtml;

  const insertMobileSearchBox = () => {
    const firstSection = search.dropdown.querySelector('.section');
    if (firstSection && !search.dropdown.querySelector('#mobile-search-box')) {
      search.dropdown.insertBefore(mobileSearchBox, firstSection);
      decorateIcons(mobileSearchBox);
    }
  };

  const searchInput = searchBox.querySelector('.search-input');
  const mobileSearchInput = mobileSearchBox.querySelector('.mobile-search-input');
  let searchTimeout = null;
  let defaultDropdownContent = null;

  const storeDefaultContent = () => {
    if (!defaultDropdownContent && search.dropdown.querySelector('.default-content')) {
      defaultDropdownContent = search.dropdown.querySelector('.default-content').cloneNode(true);
    }
  };

  const restoreDefaultContent = () => {
    const searchResults = search.dropdown.querySelector('.search-results');
    if (searchResults) searchResults.remove();
    const firstSection = search.dropdown.querySelector('.section');
    if (firstSection && firstSection.style.display === 'none') firstSection.style.display = '';
  };

  const displaySearchResults = (results, query, container) => {
    const loadingEl = container.querySelector('.search-results-loading');
    if (loadingEl) loadingEl.remove();

    if (results.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'search-results-empty';
      const p1 = document.createElement('p');
      p1.append(
        document.createTextNode('No results found for "'),
        document.createTextNode(query),
        document.createTextNode('"'),
      );
      emptyDiv.appendChild(p1);
      const p2 = document.createElement('p');
      p2.textContent = 'Try searching for something else or press Enter to see all results';
      emptyDiv.appendChild(p2);
      container.appendChild(emptyDiv);
      return;
    }

    const resultsList = document.createElement('ul');
    resultsList.classList.add('search-results-list');
    results.forEach((result) => {
      const li = document.createElement('li');
      const liHtml = `
        <a href="${result.url}">
          <span class="search-result-title">${result.title}</span>
          ${result.type ? `<span class="search-result-type">${result.type}</span>` : ''}
        </a>
      `;
      li.innerHTML = (window.DOMPurify?.sanitize(liHtml, DOMPURIFY)) ?? liHtml;
      resultsList.appendChild(li);
    });
    container.appendChild(resultsList);

    const viewAllLink = document.createElement('div');
    viewAllLink.classList.add('search-results-footer');
    const viewAllAnchor = document.createElement('a');
    viewAllAnchor.href = `https://www.idfcfirst.bank.in/search?skey=${encodeURIComponent(query)}`;
    viewAllAnchor.className = 'view-all-results';
    viewAllAnchor.append(
      document.createTextNode('View all results for "'),
      document.createTextNode(query),
      document.createTextNode('" '),
    );
    const viewAllIcon = document.createElement('span');
    viewAllIcon.className = 'icon icon-arrow-right-alt';
    viewAllAnchor.appendChild(viewAllIcon);
    viewAllLink.appendChild(viewAllAnchor);
    viewAllLink.querySelector('.view-all-results').addEventListener('click', () => {
      sessionStorage.setItem('searchKeySolar', query);
    });
    container.appendChild(viewAllLink);
    decorateIcons(viewAllLink);
  };

  const fetchSearchResults = async (query, container) => {
    try {
      const response = await fetch(`https://www.idfcfirst.bank.in/bin/idfcfirstbank/search?q=${encodeURIComponent(query)}&limit=10`);
      let results = response.ok ? ((await response.json()).results || []) : [];
      if (results.length === 0) results = getSearchFallbackSuggestions(query);
      displaySearchResults(results, query, container);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('[Header Search] Search API failed, using fallback suggestions:', error?.message ?? error);
      displaySearchResults(getSearchFallbackSuggestions(query), query, container);
    }
  };

  const createSearchResults = (query) => {
    const existingResults = search.dropdown.querySelector('.search-results');
    if (existingResults) existingResults.remove();
    const firstSection = search.dropdown.querySelector('.section');
    if (!firstSection) return;

    firstSection.style.display = 'none';
    const resultsContainer = document.createElement('div');
    resultsContainer.classList.add('search-results', 'section');
    resultsContainer.setAttribute('data-search-results', 'true');
    const headerDiv = document.createElement('div');
    headerDiv.className = 'search-results-header';
    const headerH3 = document.createElement('h3');
    headerH3.append(
      document.createTextNode('Search results for "'),
      document.createTextNode(query),
      document.createTextNode('"'),
    );
    headerDiv.appendChild(headerH3);
    resultsContainer.appendChild(headerDiv);
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'search-results-loading';
    const loadingP = document.createElement('p');
    loadingP.textContent = 'Searching...';
    loadingDiv.appendChild(loadingP);
    resultsContainer.appendChild(loadingDiv);
    firstSection.parentNode.insertBefore(resultsContainer, firstSection);
    setTimeout(() => fetchSearchResults(query, resultsContainer), 300);
  };

  const handleSearchInput = (e) => {
    const query = e.target.value.trim();
    if (e.target === searchInput && mobileSearchInput) mobileSearchInput.value = query;
    else if (e.target === mobileSearchInput && searchInput) searchInput.value = query;
    if (searchTimeout) clearTimeout(searchTimeout);
    if (query.length === 0) {
      restoreDefaultContent();
      return;
    }
    if (query.length >= 2) searchTimeout = setTimeout(() => createSearchResults(query), 300);
  };

  const handleSearchKeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const { target } = e;
      if (!target || typeof target.value !== 'string') return;
      const query = String(target.value).trim();
      if (typeof query === 'string' && query.length > 0) {
        sessionStorage.setItem('searchKeySolar', query);
        window.location.href = `https://www.idfcfirst.bank.in/search?skey=${encodeURIComponent(query)}`;
      }
    }
  };

  if (searchInput) {
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleSearchKeydown);
    const originalOpenDropdown = search.openDropdown;
    search.openDropdown = async () => {
      await originalOpenDropdown();
      storeDefaultContent();
      insertMobileSearchBox();
      if (!isDesktop.matches && mobileSearchInput) mobileSearchInput.focus();
      else searchInput.focus();
    };
  }
  if (mobileSearchInput) {
    mobileSearchInput.addEventListener('input', handleSearchInput);
    mobileSearchInput.addEventListener('keydown', handleSearchKeydown);
  }

  searchBox.addEventListener('click', () => search.openDropdown());
  search.dropdown.addEventListener('mouseenter', () => search.clearTimeout());
  search.dropdown.addEventListener('mouseleave', (e) => {
    if (isDesktop.matches && !searchBox.contains(e.relatedTarget)) search.scheduleClose();
  });
  searchBox.addEventListener('mouseleave', (e) => {
    if (isDesktop.matches && !search.dropdown.contains(e.relatedTarget)) search.scheduleClose();
  });

  const mobileSearchIconEl = navTools.querySelector('.mobile-search-icon');
  if (mobileSearchIconEl) mobileSearchIconEl.addEventListener('click', () => search.openDropdown());

  document.addEventListener('click', (e) => {
    const isOutsideClick = !search.dropdown.contains(e.target)
      && !searchBox.contains(e.target)
      && !e.target.closest('.mobile-search-icon')
      && !search.overlay.contains(e.target);
    if (isOutsideClick && search.dropdown.classList.contains('open')) {
      search.closeDropdown();
      if (searchInput) searchInput.value = '';
      if (mobileSearchInput) mobileSearchInput.value = '';
      restoreDefaultContent();
    }
  });
}

/**
 * Extract logo src and alt from nav fragment.
 * @param {DocumentFragment} fragment Nav fragment
 * @returns {{ logoImgSrc: string, logoImgAlt: string }}
 */
function getLogoFromFragment(fragment) {
  let logoImgSrc = '/icons/idfc-logo-nav.svg';
  let logoImgAlt = 'IDFC FIRST Bank';

  const logoSection = fragment.querySelector('.section[data-id="logo"]');
  if (logoSection) {
    const logoImg = logoSection.querySelector('img');
    if (logoImg) {
      const srcFromFragment = logoImg.getAttribute('src');
      logoImgAlt = logoImg.getAttribute('alt') || logoImgAlt;
      if (srcFromFragment) logoImgSrc = srcFromFragment;
    }
  } else {
    const allImages = fragment.querySelectorAll('img');
    if (allImages.length > 0) {
      const lastImg = allImages.at(-1);
      const srcFromFragment = lastImg.getAttribute('src');
      logoImgAlt = lastImg.getAttribute('alt') || logoImgAlt;
      if (srcFromFragment) logoImgSrc = srcFromFragment;
    }
  }
  return { logoImgSrc, logoImgAlt };
}

/**
 * Build nav-brand section with logo link.
 * @param {Element} navBrand Container element
 * @param {{ logoImgSrc: string, logoImgAlt: string }} logo Logo data
 */
function buildNavBrand(navBrand, logo) {
  const navBrandHtml = `<a href="https://www.idfcfirst.bank.in/personal-banking" aria-label="IDFC FIRST Bank Home">
    <img src="${logo.logoImgSrc}" alt="${logo.logoImgAlt}">
  </a>`;
  navBrand.innerHTML = (window.DOMPurify?.sanitize(navBrandHtml, DOMPURIFY)) ?? navBrandHtml;
}

/**
 * Build nav-sections list (ul of nav items) from fragment.
 * @param {DocumentFragment} fragment Nav fragment
 * @returns {{ navSectionsWrapper: Element, navSectionsUl: Element } | null} Wrapper and ul, or null
 */
function buildNavSectionsFromFragment(fragment) {
  const sections = fragment.querySelectorAll(':scope > .section');
  const navSectionsWrapper = document.createElement('div');
  navSectionsWrapper.classList.add('default-content-wrapper');
  const navSectionsUl = document.createElement('ul');

  sections.forEach((section) => {
    const sectionId = section.getAttribute('data-id');
    if (!sectionId) return;

    const h2 = section.querySelector('h2');
    const links = section.querySelectorAll('a');
    if (!h2 || links.length === 0) return;

    let title;
    let titleUrl = null;
    let fragmentPath;

    if (links.length >= 2) {
      const titleLink = links[0];
      const fragmentLink = links[1];
      title = titleLink.textContent.trim();
      titleUrl = titleLink.getAttribute('href');
      fragmentPath = fragmentLink.getAttribute('href');
    } else {
      title = h2.textContent.trim();
      fragmentPath = links[0].getAttribute('href');
    }

    if (!fragmentPath) return;

    const li = document.createElement('li');
    li.setAttribute('data-fragment-path', fragmentPath);
    if (titleUrl) li.setAttribute('data-title-url', titleUrl);
    li.setAttribute('aria-expanded', 'false');

    const titleP = document.createElement('p');
    const titleA = document.createElement('a');
    titleA.textContent = title;
    titleA.href = titleUrl || '#';
    titleA.classList.add('nav-title-link');
    if (!titleUrl) titleA.addEventListener('click', (e) => e.preventDefault());

    titleP.appendChild(titleA);
    li.appendChild(titleP);
    navSectionsUl.appendChild(li);
  });

  navSectionsWrapper.appendChild(navSectionsUl);
  return { navSectionsWrapper, navSectionsUl };
}

/**
 * Extract tools section data (search, odometer, buttons) from fragment sections.
 * @param {NodeListOf<Element>} sections Fragment sections
 * @returns {{ searchP: Element|null, toolsUl: Element|null, toolsContent:
 * Element|null, odometerItemTexts: string[], buttonParagraphs: Element[] }}
 */
function getToolsData(sections) {
  const result = {
    searchP: null,
    toolsUl: null,
    toolsContent: null,
    odometerItemTexts: [],
    buttonParagraphs: [],
  };

  const toolsSection = Array.from(sections).find((s) => s.getAttribute('data-id') === 'nav-tools');
  if (!toolsSection) return result;

  const toolsContent = toolsSection.querySelector('.default-content');
  if (!toolsContent) return result;

  result.toolsContent = toolsContent;
  result.searchP = toolsContent.querySelector('p strong')?.parentElement;
  result.toolsUl = toolsContent.querySelector('ul');

  if (result.toolsUl) {
    const originalLis = Array.from(result.toolsUl.querySelectorAll('li'));
    if (originalLis.length > 0) {
      result.odometerItemTexts = originalLis.map((li) => li.textContent.trim());
    }
  }

  result.buttonParagraphs = Array.from(toolsContent.querySelectorAll('p'))
    .filter((p) => {
      if (p.querySelector('strong')) return false;
      const hasLink = p.querySelector('a');
      const textContent = p.textContent.trim().toLowerCase();
      return hasLink || ['pay', 'login'].includes(textContent);
    });

  return result;
}

/**
 * Build nav-tools DOM (search bar, odometer list, button items) and append to wrapper.
 * @param {Element} navToolsWrapper Wrapper element
 * @param {ReturnType<getToolsData>} toolsData From getToolsData()
 */
function buildNavToolsDOM(navToolsWrapper, toolsData) {
  const {
    searchP,
    toolsUl,
    odometerItemTexts,
    buttonParagraphs,
  } = toolsData;

  if (searchP) {
    const searchText = searchP.textContent.trim();
    const searchElement = document.createElement('p');
    searchElement.id = 'search-box';
    const iconSpan = document.createElement('span');
    iconSpan.className = 'icon icon-search';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = searchText;
    searchInput.className = 'search-input';
    searchElement.appendChild(iconSpan);
    searchElement.appendChild(searchInput);
    navToolsWrapper.appendChild(searchElement);
  }

  if (toolsUl && odometerItemTexts.length > 0) {
    const toolsUlClone = document.createElement('ul');
    const odometerLi = document.createElement('li');
    const odometerSpans = odometerItemTexts.map((text) => `<span>${text}</span>`).join('');
    const firstItemText = odometerItemTexts[0];
    const odometerLiHtml = `
      <div class="grnt-animation-odometer">
        <div class="grnt-odometer-track">
          ${odometerSpans}
          <span>${firstItemText}</span>
        </div>
      </div>
    `;
    odometerLi.innerHTML = (window.DOMPurify?.sanitize(odometerLiHtml, DOMPURIFY))
    ?? odometerLiHtml;
    toolsUlClone.appendChild(odometerLi);
    navToolsWrapper.appendChild(toolsUlClone);
  }

  buttonParagraphs.forEach((p) => {
    const link = p.querySelector('a');
    const buttonLi = document.createElement('li');
    const buttonText = link ? link.textContent.trim() : p.textContent.trim();
    const buttonTextLower = buttonText.toLowerCase();

    if (buttonTextLower === 'pay') {
      buttonLi.id = 'pay-button';
      buttonLi.appendChild(document.createTextNode(buttonText));
      if (link) {
        buttonLi.style.cursor = 'pointer';
        buttonLi.addEventListener('click', () => { window.location.href = link.href; });
      }
    } else if (buttonTextLower === 'login') {
      buttonLi.id = 'login-button';
      buttonLi.style.cursor = 'pointer';
      const loginIcon = document.createElement('span');
      loginIcon.classList.add('icon', 'icon-login-lock');
      buttonLi.appendChild(loginIcon);
      buttonLi.appendChild(document.createTextNode(buttonText));
    }

    let targetUl = navToolsWrapper.querySelector('ul');
    if (!targetUl) {
      targetUl = document.createElement('ul');
      navToolsWrapper.appendChild(targetUl);
    }
    targetUl.appendChild(buttonLi);
  });
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';

  if (!fragment.querySelector('.default-content')) return;

  const navBrand = document.createElement('div');
  navBrand.classList.add('nav-brand', 'section');
  const navSections = document.createElement('div');
  navSections.classList.add('nav-sections', 'section');
  const navTools = document.createElement('div');
  navTools.classList.add('nav-tools', 'section');

  buildNavBrand(navBrand, getLogoFromFragment(fragment));

  const navSectionsBuilt = buildNavSectionsFromFragment(fragment);
  navSections.appendChild(navSectionsBuilt.navSectionsWrapper);
  const { navSectionsUl } = navSectionsBuilt;

  const domCache = {
    navSectionsUl,
    get allNavSections() {
      return Array.from(this.navSectionsUl.querySelectorAll(':scope > li'));
    },
  };

  const sections = fragment.querySelectorAll(':scope > .section');
  const toolsData = getToolsData(sections);
  const navToolsWrapper = document.createElement('div');
  navToolsWrapper.classList.add('default-content-wrapper');
  buildNavToolsDOM(navToolsWrapper, toolsData);
  navTools.appendChild(navToolsWrapper);

  // Create mobile search icon (replaces CSS ::after pseudo-element)
  const mobileSearchIcon = document.createElement('span');
  mobileSearchIcon.classList.add('mobile-search-icon', 'icon', 'icon-search');
  navTools.appendChild(mobileSearchIcon);

  decorateIcons(navTools);
  setTimeout(() => startOdometerAnimation(navTools), 100);

  const csDropdownOpen = setupCustomerServiceDropdown(navTools);
  setupSearchDropdown(navToolsWrapper, navTools);
  setupLoginDropdown(navToolsWrapper);

  const mobileOdometerContainer = buildMobileOdometerContainer(toolsData.odometerItemTexts);
  wireMobileOdometer(nav, mobileOdometerContainer, csDropdownOpen);

  // Assemble the navigation
  nav.appendChild(navBrand);
  nav.appendChild(mobileOdometerContainer); // Add mobile odometer
  nav.appendChild(navSections);
  nav.appendChild(navTools);

  /**
   * Process category-nav section content
   */
  function processCategoryNavSection(section) {
    const defaultContent = section.querySelector('.default-content');
    if (!defaultContent) return null;

    const categoryNavBlock = section.querySelector('.category-nav.block');
    if (!categoryNavBlock) return null;

    const titleP = defaultContent.querySelector('p');
    if (!titleP) return null;

    // Check for Cards blocks at the section level (they're siblings of default-content)
    // Only include cards blocks that actually have content (cards-card elements)
    const cardsBlocks = Array.from(section.querySelectorAll('.cards.block'))
      .filter((cardsBlock) => cardsBlock.querySelector('.cards-card'));

    // If no Cards blocks with content, just return the category-nav block directly
    if (cardsBlocks.length === 0) {
      return {
        titleText: titleP.textContent.trim(),
        content: categoryNavBlock.cloneNode(true),
      };
    }

    // Create a wrapper to hold both category-nav and Cards blocks
    const sectionContent = document.createElement('div');
    sectionContent.appendChild(categoryNavBlock.cloneNode(true));

    cardsBlocks.forEach((cardsBlock) => {
      // Wrap the cards block in a container with "Discover" heading
      const discoverContainer = document.createElement('div');
      discoverContainer.classList.add('nav-discover-section');

      const discoverHeading = document.createElement('p');
      discoverHeading.classList.add('nav-discover-heading');
      discoverHeading.textContent = 'Discover';

      discoverContainer.appendChild(discoverHeading);
      discoverContainer.appendChild(cardsBlock.cloneNode(true));

      sectionContent.appendChild(discoverContainer);
    });

    return {
      titleText: titleP.textContent.trim(),
      content: sectionContent,
    };
  }

  /**
   * Process standard section content for mobile accordion view
   */
  function processStandardSectionMobile(section) {
    const defaultContent = section.querySelector('.default-content');
    if (!defaultContent) return null;

    const children = Array.from(defaultContent.children);
    if (children.length === 0) return null;

    // Check for Cards blocks at the section level (they're siblings of default-content)
    // Only include cards blocks that actually have content (cards-card elements)
    const cardsBlocks = Array.from(section.querySelectorAll('.cards.block'))
      .filter((cardsBlock) => cardsBlock.querySelector('.cards-card'));

    // Helper function: Create view-all wrapper with title and optional "View All" button
    const createViewAllWrapper = (titleElement) => {
      const titleText = titleElement.textContent.trim();
      const link = titleElement.querySelector('a');

      const wrapper = document.createElement('div');
      wrapper.classList.add('nav-view-all-wrapper');

      const titleSpan = document.createElement('span');
      titleSpan.classList.add('nav-view-all-section-title');
      titleSpan.textContent = titleText;
      wrapper.appendChild(titleSpan);

      // Add "View All" button only if link exists
      if (link) {
        const viewAllBtn = document.createElement('a');
        viewAllBtn.href = link.href;
        viewAllBtn.classList.add('nav-view-all-btn');
        viewAllBtn.textContent = 'View All';
        const arrowSpan = document.createElement('span');
        arrowSpan.className = 'icon icon-arrow-right-alt';
        viewAllBtn.appendChild(arrowSpan);
        wrapper.appendChild(viewAllBtn);
        decorateIcons(viewAllBtn);
      }

      return wrapper;
    };

    const titleElement = children.find((child) => child.tagName === 'H3');
    if (!titleElement) return null;

    const titleText = titleElement.textContent.trim();

    // Create wrapper for non-title children
    const sectionContent = document.createElement('div');

    // Create primary links wrapper (will contain viewAllWrapper + top-level links)
    const primaryLinksWrapper = document.createElement('div');
    primaryLinksWrapper.classList.add('nav-primary-links');

    // Add section title with optional "View All" button
    const viewAllWrapper = createViewAllWrapper(titleElement);
    primaryLinksWrapper.appendChild(viewAllWrapper);

    // Process children and handle H4 subsections
    let currentH4Section = null;
    let currentH4Content = null;
    let firstH4Found = false;
    const h4Sections = [];

    children.forEach((child) => {
      if (child.tagName === 'H3') {
        return; // Skip H3, we already processed it
      }

      // Check if this is a block element (like Cards, etc.)
      const isBlock = child.classList && (child.classList.contains('block') || child.classList.contains('cards'));

      if (child.tagName === 'H4') {
        // Close previous H4 section if exists and add to collection
        if (currentH4Section) {
          h4Sections.push(currentH4Section);
        }

        // Create new H4 section (not an accordion, just a header with content)
        currentH4Section = document.createElement('div');
        currentH4Section.classList.add('nav-h4-section');

        // Mark the first H4 section for special layout positioning
        if (!firstH4Found) {
          currentH4Section.classList.add('first-h4');
          firstH4Found = true;
        }

        // Create H4 title with optional "View All" button using same helper
        const h4Title = document.createElement('p');
        h4Title.classList.add('nav-h4-section-title');
        h4Title.appendChild(createViewAllWrapper(child));
        currentH4Section.appendChild(h4Title);

        currentH4Content = document.createElement('ul');
        currentH4Content.classList.add('nav-h4-section-content');
        currentH4Section.appendChild(currentH4Content);
      } else if (isBlock) {
        // Blocks should ALWAYS be top-level, never nested under H4
        // Close current H4 section if exists
        if (currentH4Section) {
          h4Sections.push(currentH4Section);
          currentH4Section = null;
          currentH4Content = null;
        }
        // Add block at top level (will be added later)
        sectionContent.appendChild(child.cloneNode(true));
      } else if (currentH4Section) {
        // Add content under current H4
        const li = document.createElement('li');
        li.appendChild(child.cloneNode(true));
        currentH4Content.appendChild(li);
      } else {
        // Top-level content (no H4) - add to primary links wrapper
        primaryLinksWrapper.appendChild(child.cloneNode(true));
      }
    });

    // Don't forget to append the last H4 section if exists
    if (currentH4Section) {
      h4Sections.push(currentH4Section);
    }

    // Now assemble the final structure
    // Add primary links wrapper first
    sectionContent.appendChild(primaryLinksWrapper);

    // Add all H4 sections
    h4Sections.forEach((h4Section) => {
      sectionContent.appendChild(h4Section);
    });

    // Add any Cards blocks from the section (they're siblings of default-content)
    cardsBlocks.forEach((cardsBlock) => {
      // Wrap the cards block in a container with "Discover" heading
      const discoverContainer = document.createElement('div');
      discoverContainer.classList.add('nav-discover-section');

      const discoverHeading = document.createElement('p');
      discoverHeading.classList.add('nav-discover-heading');
      discoverHeading.textContent = 'Discover';

      discoverContainer.appendChild(discoverHeading);
      discoverContainer.appendChild(cardsBlock.cloneNode(true));

      sectionContent.appendChild(discoverContainer);
    });

    return {
      titleText,
      content: sectionContent,
    };
  }

  /**
   * Decorate category-nav blocks after adding to DOM
   */
  function decorateCategoryNavBlocks(ul) {
    const categoryNavBlocks = ul.querySelectorAll('.category-nav.block');
    if (categoryNavBlocks.length === 0) return;

    // Load category-nav CSS if not already loaded
    const cssPath = '/blocks/category-nav/category-nav.css';
    if (!document.querySelector(`link[href="${cssPath}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssPath;
      document.head.appendChild(link);
    }

    // Decorate category-nav blocks
    categoryNavBlocks.forEach((navBlock) => {
      // Mark as fragment block to prevent duplicate decoration
      navBlock.setAttribute('data-fragment-block', 'true');

      // For fragment blocks, we need to manually parse and build the dropdown
      // instead of using the full decorate() function which builds a unified nav
      const categoryData = parseCategoryNavBlock(navBlock);
      const dropdown = buildDropdown(categoryData);

      if (dropdown) {
        // Replace the raw block content with the styled dropdown
        navBlock.innerHTML = '';
        navBlock.appendChild(dropdown);
      }
    });
  }

  /**
   * Setup mobile accordion behavior using event delegation
   */
  function setupMobileAccordionBehavior(ul) {
    ul.addEventListener('click', (e) => {
      // Find the closest nav-fragment-section
      const sectionItem = e.target.closest('.nav-fragment-section');

      // Only process if we're inside a section but not clicking content links
      if (!sectionItem || e.target.closest('.nav-fragment-section-content')) return;

      const subUl = sectionItem.querySelector('.nav-fragment-section-content');
      if (subUl) {
        const expanded = sectionItem.getAttribute('aria-expanded') === 'true';

        // Close all other sections first (accordion behavior)
        const allSections = ul.querySelectorAll('.nav-fragment-section');
        allSections.forEach((section) => {
          if (section !== sectionItem) {
            section.setAttribute('aria-expanded', 'false');
          }
        });

        // Toggle the clicked section
        const { scrollHeight } = subUl;
        sectionItem.style.setProperty('--section-scroll-height', `${scrollHeight}px`);
        sectionItem.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      }
    });
  }

  /**
   * Setup desktop accordion behavior - click section titles to show content in column 2
   */
  function setupDesktopAccordionBehavior(ul) {
    ul.addEventListener('click', (e) => {
      // Find the closest nav-fragment-section
      const sectionItem = e.target.closest('.nav-fragment-section');

      // Only process clicks on the title (column 1)
      if (!sectionItem || !e.target.closest('.nav-fragment-section-title')) return;

      const expanded = sectionItem.getAttribute('aria-expanded') === 'true';

      // Close all other sections first (accordion behavior)
      const allSections = ul.querySelectorAll('.nav-fragment-section');
      allSections.forEach((section) => {
        if (section !== sectionItem) {
          section.setAttribute('aria-expanded', 'false');
        }
      });

      // Toggle the clicked section
      sectionItem.setAttribute('aria-expanded', expanded ? 'false' : 'true');

      // Auto-expand first section on load (for desktop)
      if (!expanded && allSections.length > 0 && sectionItem === allSections[0]) {
        sectionItem.setAttribute('aria-expanded', 'true');
      }
    });
  }

  /** Build accordion UL from fragment sections (category-nav or standard). */
  function buildFragmentSectionsUl(fragmentContent) {
    const fragmentSections = fragmentContent.querySelectorAll('.section');
    const ul = document.createElement('ul');
    ul.classList.add('nav-fragment-content');
    fragmentSections.forEach((section) => {
      const processed = processCategoryNavSection(section)
        || processStandardSectionMobile(section);
      if (!processed) return;
      const sectionLi = document.createElement('li');
      sectionLi.classList.add('nav-fragment-section');
      sectionLi.setAttribute('aria-expanded', 'false');
      const titleWrapper = document.createElement('p');
      titleWrapper.classList.add('nav-fragment-section-title');
      titleWrapper.textContent = processed.titleText;
      sectionLi.appendChild(titleWrapper);
      const sectionUl = document.createElement('ul');
      sectionUl.classList.add('nav-fragment-section-content');
      const contentLi = document.createElement('li');
      contentLi.appendChild(processed.content);
      sectionUl.appendChild(contentLi);
      sectionLi.appendChild(sectionUl);
      ul.appendChild(sectionLi);
    });
    return ul;
  }

  /** Decorate non–category-nav blocks in fragment UL (Cards, etc.) using cached imports. */
  async function decorateFragmentBlocks(ul) {
    const otherBlocks = ul.querySelectorAll('.block:not(.category-nav)');
    const toProcess = otherBlocks.length > 100 ? otherBlocks.slice(0, 100) : otherBlocks;
    for (const blockElement of toProcess) {
      const blockName = Array.from(blockElement.classList).find((c) => c !== 'block');
      if (blockName) {
        let mod = blockModuleCache.get(blockName);
        if (!mod) {
          // eslint-disable-next-line no-await-in-loop
          mod = await import(`../${blockName}/${blockName}.js`);
          blockModuleCache.set(blockName, mod);
        }
        if (mod.default) {
          // eslint-disable-next-line no-await-in-loop
          await mod.default(blockElement);
        }
      }
    }
  }

  /**
   * Load fragment content and build structure based on viewport.
   * Both Desktop and Mobile: use nested accordion structure.
   */
  async function loadNavFragmentContent(navSection, isMobile = false) {
    const fragmentPath = navSection.getAttribute('data-fragment-path');
    const alreadyLoaded = navSection.getAttribute('data-fragment-loaded') === 'true';
    const loading = navSection.getAttribute('data-fragment-loading') === 'true';
    const hasContent = navSection.querySelector('.nav-fragment-content');
    if (!fragmentPath || alreadyLoaded || loading || hasContent) return true;

    navSection.setAttribute('data-fragment-loading', 'true');
    try {
      const fragmentContent = await loadFragment(fragmentPath);
      if (!fragmentContent) return false;

      const ul = buildFragmentSectionsUl(fragmentContent);
      if (ul.children.length === 0) {
        navSection.removeAttribute('data-fragment-loading');
        return false;
      }

      navSection.appendChild(ul);
      navSection.setAttribute('data-fragment-loaded', 'true');
      navSection.removeAttribute('data-fragment-loading');
      navSection.classList.add('nav-drop');
      decorateCategoryNavBlocks(ul);
      await decorateFragmentBlocks(ul);
      if (isMobile) setupMobileAccordionBehavior(ul);
      else setupDesktopAccordionBehavior(ul);
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('[Header Nav] Failed to load fragment:', error?.message ?? error);
      navSection.removeAttribute('data-fragment-loading');
      return false;
    }
  }

  /**
   * Tablet (990-1200px): Hover shows underline only, click expands dropdown
   */
  function setupTabletNavigation(navSection) {
    const titleLink = navSection.querySelector('.nav-title-link');
    if (!titleLink) return;

    // Click to expand dropdown (prevent navigation)
    titleLink.addEventListener('click', async (e) => {
      e.preventDefault();

      // Load content if not already loaded
      await loadNavFragmentContent(navSection, false);

      // Toggle this section
      const isExpanded = navSection.getAttribute('aria-expanded') === 'true';

      if (isExpanded) {
        navSection.setAttribute('aria-expanded', 'false');
        const allInnerSections = navSection.querySelectorAll('.nav-fragment-section');
        allInnerSections.forEach((section) => {
          section.setAttribute('aria-expanded', 'false');
        });
      } else {
        toggleAllNavSections(navSections);
        navSection.setAttribute('aria-expanded', 'true');

        // Auto-expand first section in the dropdown
        const firstSection = navSection.querySelector('.nav-fragment-section:first-child');
        if (firstSection) {
          firstSection.setAttribute('aria-expanded', 'true');
        }
      }
    });
  }

  /**
   * Desktop (1200px+): Hover shows dropdown, click on title navigates to page
   */
  function setupDesktopNavigation(navSection) {
    // Load and show dropdown on hover
    navSection.addEventListener('mouseenter', async () => {
      await loadNavFragmentContent(navSection, false); // false = desktop
      toggleAllNavSections(navSections);
      navSection.setAttribute('aria-expanded', 'true');

      // Auto-expand first section in the dropdown
      const firstSection = navSection.querySelector('.nav-fragment-section:first-child');
      if (firstSection) {
        firstSection.setAttribute('aria-expanded', 'true');
      }
    });

    // Hide dropdown when mouse leaves
    navSection.addEventListener('mouseleave', () => {
      navSection.setAttribute('aria-expanded', 'false');
      // Reset all inner sections
      const allInnerSections = navSection.querySelectorAll('.nav-fragment-section');
      allInnerSections.forEach((section) => {
        section.setAttribute('aria-expanded', 'false');
      });
    });

    // Title link navigates normally (no preventDefault)
    // This allows desktop users to click to go to the parent page
  }

  /**
   * Create "Explore" link for a section (DRY helper)
   */
  function createExploreLinkIfNeeded(section) {
    let exploreLink = section.querySelector('.explore-section-link');
    if (!exploreLink) {
      const titleUrl = section.getAttribute('data-title-url');
      const titleText = section.querySelector('.nav-title-link')?.textContent || '';

      if (titleUrl) {
        exploreLink = document.createElement('a');
        exploreLink.classList.add('explore-section-link');
        exploreLink.href = titleUrl;
        exploreLink.textContent = `Explore ${titleText}`;
        const arrowSpan = document.createElement('span');
        arrowSpan.className = 'arrow';
        arrowSpan.textContent = '→';
        exploreLink.appendChild(arrowSpan);

        // Insert before the fragment content
        const fragmentContent = section.querySelector('.nav-fragment-content');
        if (fragmentContent) {
          fragmentContent.before(exploreLink);
        }
      }
    }
  }

  /**
   * Update tab bar active state (DRY helper)
   */
  function updateTabBarActiveState(selectedSection) {
    const tabBar = navSections.querySelector('.nav-tab-bar');
    if (tabBar) {
      const tabs = tabBar.querySelectorAll('.nav-tab');
      const selectedPath = selectedSection.getAttribute('data-fragment-path');
      tabs.forEach((tab) => {
        tab.classList.toggle('active', tab.getAttribute('data-section-id') === selectedPath);
      });
    }
  }

  /**
   * Switch displayed tab content
   */
  async function switchTabContent(selectedSection) {
    const allSections = domCache.allNavSections;

    await loadNavFragmentContent(selectedSection, true);

    allSections.forEach((section) => {
      const isSelected = section === selectedSection;
      section.style.display = isSelected ? 'block' : 'none';
      section.classList.toggle('active-tab-content', isSelected);
      section.setAttribute('aria-expanded', isSelected ? 'true' : 'false');
    });

    updateTabBarActiveState(selectedSection);
    createExploreLinkIfNeeded(selectedSection);
  }

  /**
   * Create tab bar (DRY helper)
   */
  function createTabBar() {
    const sectionsUl = domCache.navSectionsUl;
    const allSections = domCache.allNavSections;
    const tabBar = document.createElement('div');
    tabBar.classList.add('nav-tab-bar');

    allSections.forEach((section) => {
      const titleLink = section.querySelector('.nav-title-link');
      const titleText = titleLink ? titleLink.textContent : '';

      const tab = document.createElement('button');
      tab.classList.add('nav-tab');
      tab.textContent = titleText;
      tab.setAttribute('data-section-id', section.getAttribute('data-fragment-path'));
      tab.setAttribute('data-title-url', section.getAttribute('data-title-url') || '');

      tab.addEventListener('click', () => switchTabContent(section));
      tabBar.appendChild(tab);
    });

    sectionsUl.before(tabBar);
    return tabBar;
  }

  /**
   * Mobile: Switch to tab view when a nav section is clicked
   */
  function switchToTabView(selectedSection) {
    navSections.classList.add('tab-view-active');

    if (!navSections.querySelector('.nav-tab-bar')) {
      createTabBar();
    }

    switchTabContent(selectedSection);
  }

  /**
   * Mobile: Click to switch to tab view
   */
  function setupMobileNavigation(navSection) {
    const titleLink = navSection.querySelector('.nav-title-link');

    navSection.addEventListener('click', async (e) => {
      // Don't handle clicks if already in tab view
      if (navSections.classList.contains('tab-view-active')) {
        return;
      }

      // Don't handle clicks on nested section items
      if (e.target.closest('.nav-fragment-section')) return;

      // Prevent title link navigation on mobile
      if (e.target === titleLink) {
        e.preventDefault();
      }

      // Switch to tab view
      switchToTabView(navSection);
    });
  }

  initNavSectionBehaviors(
    domCache,
    setupDesktopNavigation,
    setupTabletNavigation,
    setupMobileNavigation,
  );

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;

  hamburger.addEventListener('click', () => {
    toggleMenu(nav, navSections);
  });

  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');

  // prevent mobile nav behavior on window resize - always start collapsed
  toggleMenu(nav, navSections, false);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, false));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
