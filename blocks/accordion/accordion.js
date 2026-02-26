import { moveInstrumentation, getBlockId } from '../../scripts/scripts.js';

function processMultiSection(block) {
  const accordionItems = [];
  const sectionTitles = [];
  [...block.children].forEach((item) => {
    const titles = item.querySelectorAll('.tab-section-title');
    titles.forEach((title) => {
      if (!sectionTitles.includes(title)) sectionTitles.push(title);
    });
  });

  [...block.children].forEach((item) => {
    const tabName = item.getAttribute('data-tabname') || '';
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.textContent = tabName;

    const body = document.createElement('div');
    body.className = 'accordion-item-body';
    while (item.firstChild) body.appendChild(item.firstChild);

    const details = document.createElement('details');
    moveInstrumentation(item, details);
    details.className = 'accordion-item';
    details.append(summary, body);
    item.replaceWith(details);
    accordionItems.push(details);
  });

  sectionTitles.reverse().forEach((sectionTitle) => block.prepend(sectionTitle));
  return accordionItems;
}

function parseConfigCell(value, hasCtaLink, foundLink) {
  const valueLower = value.toLowerCase();
  if (valueLower === 'true' || valueLower === 'no-schema') {
    return { noSchema: true };
  }
  const numValue = parseInt(value, 10);
  if (!Number.isNaN(numValue) && numValue >= 0) {
    if (hasCtaLink) {
      return {
        ctaLocation: foundLink ? undefined : numValue,
        openItemConfig: foundLink ? numValue : undefined,
      };
    }
    return { openItemConfig: numValue };
  }
  return null;
}

function parseConfigRows(block) {
  let hasCtaLink = false;
  [...block.children].forEach((row) => {
    if (row.children.length === 1 && row.children[0].querySelector('a')) hasCtaLink = true;
  });

  let noSchema = false;
  let ctaUrl = null;
  let ctaText = null;
  let ctaLocation = null;
  let openItemConfig = null;
  let foundLink = false;

  [...block.children].forEach((row) => {
    if (row.children.length !== 1) return;
    const cell = row.children[0];
    const value = cell.textContent.trim();
    const link = cell.querySelector('a');
    if (link) {
      ctaUrl = link.href;
      ctaText = link.textContent.trim();
      foundLink = true;
    } else {
      const update = parseConfigCell(value, hasCtaLink, foundLink);
      if (update) {
        if (update.noSchema) noSchema = true;
        if (update.ctaLocation !== undefined) ctaLocation = update.ctaLocation;
        if (update.openItemConfig !== undefined) openItemConfig = update.openItemConfig;
      }
    }
    row.remove();
  });

  return {
    noSchema,
    ctaUrl,
    ctaText,
    ctaLocation,
    openItemConfig,
  };
}

function processStandaloneRows(block, noSchema) {
  const accordionItems = [];
  [...block.children].forEach((row) => {
    const children = [...row.children];
    if (children.length !== 2) {
      row.remove();
      return;
    }
    const label = children[0];
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    if (!noSchema) {
      summary.setAttribute('itemscope', '');
      summary.setAttribute('itemprop', 'mainEntity');
      summary.setAttribute('itemtype', 'https://schema.org/Question');
    }
    summary.append(...label.childNodes);
    if (!noSchema && summary.firstElementChild) {
      summary.firstElementChild.setAttribute('itemprop', 'name');
    }

    const body = children[1];
    body.className = 'accordion-item-body';
    const details = document.createElement('details');
    moveInstrumentation(row, details);
    details.className = 'accordion-item';
    if (!noSchema) {
      details.setAttribute('itemscope', '');
      details.setAttribute('itemprop', 'acceptedAnswer');
      details.setAttribute('itemtype', 'https://schema.org/Answer');
    }
    details.append(summary, body);
    row.replaceWith(details);
    accordionItems.push(details);
  });
  return accordionItems;
}

function setupCtaButton(block, accordionItems, ctaLocation, ctaUrl, ctaText) {
  const originalText = ctaText;
  const expandedText = 'Show less';
  for (let i = ctaLocation; i < accordionItems.length; i += 1) {
    accordionItems[i].classList.add('accordion-item-hidden');
  }

  const ctaButton = document.createElement('a');
  ctaButton.href = ctaUrl;
  ctaButton.textContent = originalText;
  ctaButton.className = 'accordion-cta button';
  block.appendChild(ctaButton);

  let isExpanded = false;
  ctaButton.addEventListener('click', (e) => {
    if (!ctaUrl.endsWith('#') && ctaUrl !== '') return;
    e.preventDefault();
    if (isExpanded) {
      for (let i = ctaLocation; i < accordionItems.length; i += 1) {
        accordionItems[i].classList.add('accordion-item-hidden');
      }
      ctaButton.textContent = originalText;
      block.classList.remove('expanded');
      isExpanded = false;
    } else {
      for (let i = ctaLocation; i < accordionItems.length; i += 1) {
        accordionItems[i].classList.remove('accordion-item-hidden');
      }
      ctaButton.textContent = expandedText;
      block.classList.add('expanded');
      isExpanded = true;
    }
  });
}

function setupSingleOpenBehavior(block, getIsInitialLoad) {
  block.querySelectorAll('details').forEach((detail) => {
    const toggleHandler = () => {
      if (!detail.open) return;
      block.querySelectorAll('details').forEach((el) => {
        if (el !== detail && el.open) el.removeAttribute('open');
      });
      if (getIsInitialLoad()) return;
      const detailRect = detail.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      window.scrollTo({
        top: scrollTop + detailRect.top - 170,
        behavior: 'smooth',
      });
    };
    detail.addEventListener('toggle', toggleHandler);
    detail.accordionToggleHandler = toggleHandler;
  });
}

function openDefaultItem(accordionItems, openItemConfig, setInitialLoadComplete) {
  if (accordionItems.length === 0) return;
  let itemToOpen = 1;
  if (openItemConfig !== null && openItemConfig !== undefined) {
    if (openItemConfig === 0) itemToOpen = 0;
    else if (
      openItemConfig > 0 && openItemConfig <= accordionItems.length
    ) itemToOpen = openItemConfig;
  }
  if (itemToOpen > 0) {
    const item = accordionItems.at(itemToOpen - 1);
    if (item) item.setAttribute('open', '');
  }
  setTimeout(() => setInitialLoadComplete(), 100);
}

export default function decorate(block) {
  block.id = getBlockId('accordion');
  let isInitialLoad = true;
  const getIsInitialLoad = () => isInitialLoad;
  const setInitialLoadComplete = () => { isInitialLoad = false; };
  const isMultiSection = [...block.children].some(
    (child) => child.hasAttribute('data-multisection'),
  );

  let accordionItems;
  let ctaUrl = null;
  let ctaText = null;
  let ctaLocation = null;
  let openItemConfig = null;

  if (isMultiSection) {
    accordionItems = processMultiSection(block);
  } else {
    const config = parseConfigRows(block);
    accordionItems = processStandaloneRows(block, config.noSchema);
    ctaUrl = config.ctaUrl;
    ctaText = config.ctaText;
    ctaLocation = config.ctaLocation;
    openItemConfig = config.openItemConfig;
  }

  const showCta = ctaLocation !== null && ctaLocation !== undefined
    && ctaLocation < accordionItems.length && ctaUrl && ctaText;
  if (showCta) setupCtaButton(block, accordionItems, ctaLocation, ctaUrl, ctaText);

  setupSingleOpenBehavior(block, getIsInitialLoad);
  openDefaultItem(accordionItems, openItemConfig, setInitialLoadComplete);
}
