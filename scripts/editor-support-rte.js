/* eslint-disable no-console */
/* eslint-disable no-cond-assign */
/* eslint-disable import/prefer-default-export */

// group editable texts in single wrappers if applicable.
// this script should execute after script.js but before the the universal editor cors script
// and any block being loaded

export function decorateRichtext(container = document) {
  function deleteInstrumentation(element) {
    delete element.dataset.richtextResource;
    delete element.dataset.richtextProp;
    delete element.dataset.richtextFilter;
    delete element.dataset.richtextLabel;
  }

  let element;
  while (element = container.querySelector('[data-richtext-prop]:not(div)')) {
    const {
      richtextResource,
      richtextProp,
      richtextFilter,
      richtextLabel,
    } = element.dataset;
    deleteInstrumentation(element);
    const siblings = [];
    let sibling = element;
    while (sibling = sibling.nextElementSibling) {
      if (sibling.dataset.richtextResource === richtextResource
        && sibling.dataset.richtextProp === richtextProp) {
        deleteInstrumentation(sibling);
        siblings.push(sibling);
      } else break;
    }

    let orphanElements;
    if (richtextResource && richtextProp) {
      orphanElements = document.querySelectorAll(`[data-richtext-id="${richtextResource}"][data-richtext-prop="${richtextProp}"]`);
    } else {
      const editable = element.closest('[data-aue-resource]');
      if (editable) {
        orphanElements = editable.querySelectorAll(`:scope > :not([data-aue-resource]) [data-richtext-prop="${richtextProp}"]`);
      } else {
        console.warn(`Editable parent not found or richtext property ${richtextProp}`);
        return;
      }
    }

    if (orphanElements.length) {
      console.warn('Found orphan elements of a richtext, that were not consecutive siblings of '
        + 'the first paragraph', orphanElements);
      orphanElements.forEach((orphanElement) => deleteInstrumentation(orphanElement));
    } else {
      const group = document.createElement('div');
      if (richtextResource) {
        group.dataset.aueResource = richtextResource;
        group.dataset.aueBehavior = 'component';
      }
      if (richtextProp) group.dataset.aueProp = richtextProp;
      if (richtextLabel) group.dataset.aueLabel = richtextLabel;
      if (richtextFilter) group.dataset.aueFilter = richtextFilter;
      group.dataset.aueType = 'richtext';
      element.replaceWith(group);
      group.append(element, ...siblings);
    }
  }
}

// in cases where the block decoration is not done in one synchronous iteration we need to listen
// for new richtext-instrumented elements
const observer = new MutationObserver(() => decorateRichtext());
observer.observe(document, { attributeFilter: ['data-richtext-prop'], subtree: true });

decorateRichtext();

/**
 * Button color classes available for primary buttons
 */
const BUTTON_COLOR_CLASSES = [
  'btn-red',
  'btn-blue',
  'btn-slate',
  'btn-dark-maroon',
  'btn-black',
  'btn-white',
  'btn-transparent',
];

/**
 * Updates button color class on the selected button element
 * @param {string} colorClass - The new color class to apply
 */
function updateButtonColor(colorClass) {
  // Find the currently selected button in the editor
  // The Universal Editor marks selected elements with data-aue-selected attribute
  const selectedElement = document.querySelector('[data-aue-selected]');
  if (!selectedElement) return;

  // Find the button within or as the selected element
  let button = selectedElement.matches('a.button.primary')
    ? selectedElement
    : selectedElement.querySelector('a.button.primary');

  // Also check parent containers for button
  if (!button) {
    const container = selectedElement.closest('.button-container');
    if (container) {
      button = container.querySelector('a.button.primary');
    }
  }

  if (!button) return;

  // Remove all existing color classes
  BUTTON_COLOR_CLASSES.forEach((cls) => {
    button.classList.remove(cls);
  });

  // Add the new color class if it's valid and not empty
  if (colorClass && BUTTON_COLOR_CLASSES.includes(colorClass)) {
    button.classList.add(colorClass);
  }
}

/**
 * Observes the Universal Editor canvas properties panel for button color changes
 * Listens for changes to the Button Color dropdown when a primary button is selected
 */
function initButtonColorEditor() {
  // Check if we're in the Universal Editor environment
  if (!window.location.href.includes('adobeaemcloud.com')
    && !document.querySelector('[data-aue-resource]')) {
    return;
  }

  // Create a MutationObserver to watch for changes in the properties panel
  const propertiesObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // Look for added nodes that might be the properties panel or its contents
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        // Find select elements within the added content
        // The Universal Editor uses Spectrum UI components
        const selects = node.querySelectorAll ? node.querySelectorAll('select') : [];
        selects.forEach((select) => {
          // Check if this is a button color select by looking for our color options
          const hasColorOptions = Array.from(select.options).some(
            (opt) => BUTTON_COLOR_CLASSES.includes(opt.value),
          );

          if (hasColorOptions && !select.dataset.buttonColorListener) {
            select.dataset.buttonColorListener = 'true';
            select.addEventListener('change', (e) => {
              updateButtonColor(e.target.value);
            });
          }
        });
      });
    });
  });

  // Observe the entire document for property panel changes
  propertiesObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also handle existing selects on page load
  document.querySelectorAll('select').forEach((select) => {
    const hasColorOptions = Array.from(select.options).some(
      (opt) => BUTTON_COLOR_CLASSES.includes(opt.value),
    );

    if (hasColorOptions && !select.dataset.buttonColorListener) {
      select.dataset.buttonColorListener = 'true';
      select.addEventListener('change', (e) => {
        updateButtonColor(e.target.value);
      });
    }
  });
}

// Initialize button color editor support
initButtonColorEditor();
