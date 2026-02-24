// eslint-disable-next-line import/no-unresolved
import { toClassName } from '../../scripts/aem.js';
import { getBlockId, moveInstrumentation, DOMPURIFY } from '../../scripts/scripts.js';

function createTabButton(block, tabpanel, tablist, index, buttonContent, buttonId) {
  const button = document.createElement('button');
  button.className = 'tabs-tab';
  button.id = buttonId;
  button.innerHTML = (window.DOMPurify?.sanitize(buttonContent, DOMPURIFY))
    ?? buttonContent;
  button.setAttribute('aria-controls', tabpanel.id);
  button.setAttribute('aria-selected', !index);
  button.setAttribute('role', 'tab');
  button.setAttribute('type', 'button');
  button.addEventListener('click', () => {
    block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
      panel.setAttribute('aria-hidden', true);
    });
    tablist.querySelectorAll('button').forEach((btn) => {
      btn.setAttribute('aria-selected', false);
    });
    tabpanel.setAttribute('aria-hidden', false);
    button.setAttribute('aria-selected', true);
  });
  return button;
}

export default async function decorate(block) {
  block.id = getBlockId('tabs');

  // Check if this is a multisection tabs block (items have data-multisection)
  const isMultiSection = [...block.children].some((child) => child.hasAttribute('data-multisection'));

  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  if (isMultiSection) {
    // MultiSection mode: block children are tab items with data-tabname and content
    const tabs = [...block.children];
    const sectionTitles = [];

    tabs.forEach((tab) => {
      const titles = tab.querySelectorAll('.tab-section-title');
      titles.forEach((title) => {
        if (!sectionTitles.includes(title)) {
          sectionTitles.push(title);
        }
      });
    });

    const headers = tabs[0];
    const tabStyle = headers.getAttribute('data-category');
    if (tabStyle) {
      block.classList.add(tabStyle);
    }

    tabs.forEach((tab, i) => {
      const tabName = tab.getAttribute('data-tabname') || '';
      const id = toClassName(tabName);
      const tabpanel = block.children[i];
      tabpanel.classList.add('tabs-panel');
      tabpanel.id = `${block.id}_tabPane_${i}`;
      tabpanel.setAttribute('aria-hidden', !!i);
      tabpanel.setAttribute('aria-labelledby', `tab-${id}`);
      tabpanel.setAttribute('role', 'tabpanel');

      const tabTextWrapper = document.createElement('div');
      if (tabName) {
        const tabText = document.createElement('p');
        tabText.textContent = tabName;
        tabTextWrapper.append(tabText);
      }
      const button = createTabButton(
        block,
        tabpanel,
        tablist,
        i,
        (window.DOMPurify?.sanitize(tabTextWrapper.innerHTML, DOMPURIFY))
          ?? tabTextWrapper.innerHTML,
        `${block.id}_tab_${i}`,
      );
      tablist.append(button);
    });

    block.prepend(tablist);
    sectionTitles.forEach((sectionTitle) => {
      sectionTitle.remove();
      tablist.insertAdjacentElement('afterend', sectionTitle);
    });
  } else {
    // Standalone mode: row-based structure (each row = tab label cell + content cell)
    const tabs = [...block.children].map((child) => child.firstElementChild);
    if (tabs.length === 0) return;

    tabs.forEach((tab, i) => {
      const id = toClassName(tab.textContent);
      const raw = tab.innerHTML;
      const buttonContent = (window.DOMPurify?.sanitize(raw, DOMPURIFY)) ?? raw;
      const tabpanel = block.children[i];
      tabpanel.className = 'tabs-panel';
      tabpanel.id = `${block.id}_tabPane_${i}`;
      tabpanel.setAttribute('aria-hidden', !!i);
      tabpanel.setAttribute('aria-labelledby', `tab-${id}`);
      tabpanel.setAttribute('role', 'tabpanel');

      const button = createTabButton(
        block,
        tabpanel,
        tablist,
        i,
        buttonContent,
        `tab-${id}`,
      );
      tablist.append(button);
      tab.remove();
      moveInstrumentation(button.querySelector('p'), null);
    });

    block.prepend(tablist);
  }
}
