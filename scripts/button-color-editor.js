/* eslint-disable no-console */
/**
 * Button Color Editor Support
 *
 * This script provides editor support for button color selection in the Universal Editor.
 * When a primary button is selected in the editor, this adds a dropdown to select
 * the button color (Red, Transparent, Blue, Slate, Dark Maroon, Black, White).
 *
 * The color is applied immediately to the button for visual preview.
 */

const BUTTON_COLOR_OPTIONS = [
  { name: 'None', value: '' },
  { name: 'Red (Brand)', value: 'btn-red' },
  { name: 'Transparent', value: 'btn-transparent' },
  { name: 'White (Outline)', value: 'btn-white' },
];

const BUTTON_COLOR_CLASSES = BUTTON_COLOR_OPTIONS
  .map((opt) => opt.value)
  .filter((v) => v);

/**
 * Get the current button color class from a button element
 * @param {Element} button The button element
 * @returns {string} The current color class or empty string
 */
function getCurrentButtonColor(button) {
  if (!button) return '';
  return BUTTON_COLOR_CLASSES.find((cls) => button.classList.contains(cls)) || '';
}

/**
 * Apply a color class to a button, removing any existing color classes
 * @param {Element} button The button element
 * @param {string} colorClass The color class to apply
 */
function applyButtonColor(button, colorClass) {
  if (!button) return;

  // Remove all existing color classes
  BUTTON_COLOR_CLASSES.forEach((cls) => {
    button.classList.remove(cls);
  });

  // Add the new color class if provided
  if (colorClass) {
    button.classList.add(colorClass);
  }
}

/**
 * Create the button color dropdown element
 * @param {Element} button The button element being edited
 * @returns {Element} The dropdown wrapper element
 */
function createColorDropdown(button) {
  const wrapper = document.createElement('div');
  wrapper.className = 'button-color-editor-wrapper';
  wrapper.style.cssText = 'margin: 8px 0; padding: 8px 12px; background: #f5f5f5; border-radius: 4px;';

  const label = document.createElement('label');
  label.textContent = 'Button Color';
  label.style.cssText = 'display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #464646;';

  const select = document.createElement('select');
  select.className = 'button-color-select';
  select.style.cssText = 'width: 100%; padding: 6px 8px; border: 1px solid #d0d0d0; border-radius: 4px; font-size: 14px; background: #fff;';

  const currentColor = getCurrentButtonColor(button);

  BUTTON_COLOR_OPTIONS.forEach((option) => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.name;
    if (option.value === currentColor) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });

  select.addEventListener('change', (e) => {
    applyButtonColor(button, e.target.value);

    // Dispatch a custom event for any listeners
    button.dispatchEvent(new CustomEvent('buttonColorChange', {
      detail: { color: e.target.value },
      bubbles: true,
    }));
  });

  wrapper.appendChild(label);
  wrapper.appendChild(select);

  return wrapper;
}

/**
 * Find the currently selected button element in the editor
 * @returns {Element|null} The selected button or null
 */
function findSelectedButton() {
  // Look for a selected element that is a primary button
  const selected = document.querySelector('[data-aue-selected] a.button.primary');
  if (selected) return selected;

  // Also check if the selected element itself is a button
  const selectedEl = document.querySelector('[data-aue-selected]');
  if (selectedEl && selectedEl.matches('a.button.primary')) {
    return selectedEl;
  }

  // Check within button containers
  const buttonContainer = document.querySelector('[data-aue-selected] .button-container a.button.primary');
  if (buttonContainer) return buttonContainer;

  return null;
}

/**
 * Check if we should show button color options
 * @param {Element} propertiesPanel The canvas properties panel
 * @returns {boolean} True if primary button type is selected
 */
function shouldShowColorOptions(propertiesPanel) {
  if (!propertiesPanel) return false;

  // Check for the linkType dropdown with "primary" selected
  const typeDropdowns = propertiesPanel.querySelectorAll('select');
  const hasPrimarySelected = Array.from(typeDropdowns).some((dropdown) => {
    const selectedOption = dropdown.options[dropdown.selectedIndex];
    return selectedOption && selectedOption.value === 'primary';
  });
  if (hasPrimarySelected) return true;

  // Also check for existing primary class on the button
  const button = findSelectedButton();
  if (button && button.classList.contains('primary')) {
    return true;
  }

  return false;
}

/**
 * Add the color dropdown to the canvas properties panel
 */
function addColorDropdownToProperties() {
  const canvasProperties = document.getElementById('canvas-properties');
  if (!canvasProperties || !canvasProperties.classList.contains('is-canvas')) {
    return;
  }

  // Remove existing color dropdown if present
  const existingDropdown = canvasProperties.querySelector('.button-color-editor-wrapper');
  if (existingDropdown) {
    existingDropdown.remove();
  }

  // Check if we should show color options
  if (!shouldShowColorOptions(canvasProperties)) {
    return;
  }

  // Find the button being edited
  const button = findSelectedButton();
  if (!button) {
    return;
  }

  // Find the appropriate place to insert the dropdown
  // Look for the linkType field and insert after it
  const fieldWrappers = canvasProperties.querySelectorAll('[class*="spectrum-Field"]');
  let insertAfter = null;

  fieldWrappers.forEach((field) => {
    const label = field.querySelector('label');
    if (label && label.textContent.toLowerCase().includes('type')) {
      insertAfter = field.closest('[class*="spectrum-Form"]') || field;
    }
  });

  // Create and insert the color dropdown
  const colorDropdown = createColorDropdown(button);

  if (insertAfter && insertAfter.parentNode) {
    insertAfter.parentNode.insertBefore(colorDropdown, insertAfter.nextSibling);
  } else {
    // Fallback: append to the properties panel
    const formArea = canvasProperties.querySelector('[class*="spectrum-Form"]') || canvasProperties;
    formArea.appendChild(colorDropdown);
  }
}

/**
 * Initialize the button color editor
 * Sets up mutation observers to watch for changes in the properties panel
 */
function initButtonColorEditor() {
  // Watch for changes in the canvas properties panel
  const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;

    mutations.forEach((mutation) => {
      // Check if the canvas-properties panel was modified
      if (mutation.target.id === 'canvas-properties'
          || mutation.target.closest?.('#canvas-properties')) {
        shouldUpdate = true;
      }

      // Check for added nodes that might be the properties panel
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.id === 'canvas-properties' || node.querySelector?.('#canvas-properties')) {
            shouldUpdate = true;
          }
        }
      });
    });

    if (shouldUpdate) {
      // Debounce the update
      clearTimeout(initButtonColorEditor.debounceTimer);
      initButtonColorEditor.debounceTimer = setTimeout(addColorDropdownToProperties, 100);
    }
  });

  // Observe the entire document for changes to catch the properties panel
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-aue-selected'],
  });

  // Also listen for selection changes
  document.addEventListener('aue:ui-select', () => {
    setTimeout(addColorDropdownToProperties, 150);
  });

  // Listen for content updates
  document.addEventListener('aue:content-patch', () => {
    setTimeout(addColorDropdownToProperties, 150);
  });

  document.addEventListener('aue:content-update', () => {
    setTimeout(addColorDropdownToProperties, 150);
  });

  // Initial check
  setTimeout(addColorDropdownToProperties, 500);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initButtonColorEditor);
} else {
  initButtonColorEditor();
}

// Export for potential use in other modules
export {
  BUTTON_COLOR_OPTIONS,
  BUTTON_COLOR_CLASSES,
  applyButtonColor,
  getCurrentButtonColor,
  initButtonColorEditor,
};


