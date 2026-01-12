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
  toClassName,
  getMetadata,
  readBlockConfig,
  toCamelCase,
} from './aem.js';

// Cached media query results for performance
const MEDIA_QUERIES = {
  mobile: window.matchMedia('(max-width: 599px)'),
  tablet: window.matchMedia('(min-width: 600px) and (max-width: 899px)'),
  desktop: window.matchMedia('(min-width: 900px)'),
};

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

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Autolinks modals
 * @param {Element} element The element to autolink modals
 */
function autolinkModals(element) {
  element.addEventListener('click', async (e) => {
    const origin = e.target.closest('a');

    if (origin && origin.href && origin.href.includes('/modals/')) {
      e.preventDefault();
      const { openModal } = await import(`${window.hlx.codeBasePath}/blocks/modal/modal.js`);
      openModal(origin.href);
    }
  });
}

function createFieldWrapper(fd) {
  const fieldWrapper = document.createElement('div');
  if (fd.Style) fieldWrapper.className = fd.Style;
  fieldWrapper.classList.add('field-wrapper', `${fd.Type}-wrapper`);

  fieldWrapper.dataset.fieldset = fd.Fieldset;

  return fieldWrapper;
}

const ids = [];
function generateFieldId(fd, suffix = '') {
  const slug = toClassName(`form-${fd.Name}${suffix}`);
  ids[slug] = ids[slug] || 0;
  const idSuffix = ids[slug] ? `-${ids[slug]}` : '';
  ids[slug] += 1;
  return `${slug}${idSuffix}`;
}

function createLabel(fd) {
  const label = document.createElement('label');
  label.id = generateFieldId(fd, '-label');
  label.textContent = fd.Label || fd.Name;
  label.setAttribute('for', fd.Id);
  if (fd.Mandatory.toLowerCase() === 'true' || fd.Mandatory.toLowerCase() === 'x') {
    label.dataset.required = true;
  }
  return label;
}

function setCommonAttributes(field, fd) {
  field.id = fd.Id;
  field.name = fd.Name;
  field.required = fd.Mandatory && (fd.Mandatory.toLowerCase() === 'true' || fd.Mandatory.toLowerCase() === 'x');
  field.placeholder = fd.Placeholder;
  field.value = fd.Value;
}

const createHeading = (fd) => {
  const fieldWrapper = createFieldWrapper(fd);

  const level = fd.Style && fd.Style.includes('sub-heading') ? 3 : 2;
  const heading = document.createElement(`h${level}`);
  heading.textContent = fd.Value || fd.Label;
  heading.id = fd.Id;

  fieldWrapper.append(heading);

  return { field: heading, fieldWrapper };
};

const createPlaintext = (fd) => {
  const fieldWrapper = createFieldWrapper(fd);

  const text = document.createElement('p');
  text.textContent = fd.Value || fd.Label;
  text.id = fd.Id;

  fieldWrapper.append(text);

  return { field: text, fieldWrapper };
};

const createSelect = async (fd) => {
  const select = document.createElement('select');
  setCommonAttributes(select, fd);
  const addOption = ({ text, value }) => {
    const option = document.createElement('option');
    option.text = text.trim();
    option.value = value.trim();
    if (option.value === fd.Value) {
      option.setAttribute('selected', '');
    }
    select.add(option);
    return option;
  };

  if (fd.Placeholder) {
    const ph = addOption({ text: fd.Placeholder, value: '' });
    ph.setAttribute('disabled', '');
  }

  if (fd.Options) {
    let options = [];
    if (fd.Options.startsWith('https://')) {
      const optionsUrl = new URL(fd.Options);
      const resp = await fetch(`${optionsUrl.pathname}${optionsUrl.search}`);
      const json = await resp.json();
      json.data.forEach((opt) => {
        options.push({
          text: opt.Option,
          value: opt.Value || opt.Option,
        });
      });
    } else {
      options = fd.Options.split(',').map((opt) => ({
        text: opt.trim(),
        value: opt.trim(),
      }));
    }

    options.forEach((opt) => addOption(opt));
  }

  const fieldWrapper = createFieldWrapper(fd);
  fieldWrapper.append(select);
  fieldWrapper.prepend(createLabel(fd));

  return { field: select, fieldWrapper };
};

const createConfirmation = (fd, form) => {
  form.dataset.confirmation = new URL(fd.Value).pathname;

  return {};
};

const createSubmit = (fd) => {
  const button = document.createElement('button');
  button.textContent = fd.Label || fd.Name;
  button.classList.add('button');
  button.type = 'submit';

  const fieldWrapper = createFieldWrapper(fd);
  fieldWrapper.append(button);
  return { field: button, fieldWrapper };
};

const createTextArea = (fd) => {
  const field = document.createElement('textarea');
  setCommonAttributes(field, fd);

  const fieldWrapper = createFieldWrapper(fd);
  const label = createLabel(fd);
  field.setAttribute('aria-labelledby', label.id);
  fieldWrapper.append(field);
  fieldWrapper.prepend(label);

  return { field, fieldWrapper };
};

const createInput = (fd) => {
  const field = document.createElement('input');
  field.type = fd.Type;
  setCommonAttributes(field, fd);

  const fieldWrapper = createFieldWrapper(fd);
  const label = createLabel(fd);
  field.setAttribute('aria-labelledby', label.id);
  fieldWrapper.append(field);
  if (fd.Type === 'radio' || fd.Type === 'checkbox') {
    fieldWrapper.append(label);
  } else {
    fieldWrapper.prepend(label);
  }

  return { field, fieldWrapper };
};

const createFieldset = (fd) => {
  const field = document.createElement('fieldset');
  setCommonAttributes(field, fd);

  if (fd.Label) {
    const legend = document.createElement('legend');
    legend.textContent = fd.Label;
    field.append(legend);
  }

  const fieldWrapper = createFieldWrapper(fd);
  fieldWrapper.append(field);

  return { field, fieldWrapper };
};

const createToggle = (fd) => {
  const { field, fieldWrapper } = createInput(fd);
  field.type = 'checkbox';
  if (!field.value) field.value = 'on';
  field.classList.add('toggle');
  fieldWrapper.classList.add('selection-wrapper');

  const toggleSwitch = document.createElement('div');
  toggleSwitch.classList.add('switch');
  toggleSwitch.append(field);
  fieldWrapper.append(toggleSwitch);

  const slider = document.createElement('span');
  slider.classList.add('slider');
  toggleSwitch.append(slider);
  slider.addEventListener('click', () => {
    field.checked = !field.checked;
  });

  return { field, fieldWrapper };
};

const createCheckbox = (fd) => {
  const { field, fieldWrapper } = createInput(fd);
  if (!field.value) field.value = 'checked';
  fieldWrapper.classList.add('selection-wrapper');

  return { field, fieldWrapper };
};

const createRadio = (fd) => {
  const { field, fieldWrapper } = createInput(fd);
  if (!field.value) field.value = fd.Label || 'on';
  fieldWrapper.classList.add('selection-wrapper');

  return { field, fieldWrapper };
};

const FIELD_CREATOR_FUNCTIONS = {
  select: createSelect,
  heading: createHeading,
  plaintext: createPlaintext,
  'text-area': createTextArea,
  toggle: createToggle,
  submit: createSubmit,
  confirmation: createConfirmation,
  fieldset: createFieldset,
  checkbox: createCheckbox,
  radio: createRadio,
};

export async function createField(fd, form) {
  fd.Id = fd.Id || generateFieldId(fd);
  const type = fd.Type.toLowerCase();
  const createFieldFunc = FIELD_CREATOR_FUNCTIONS[type] || createInput;
  const fieldElements = await createFieldFunc(fd, form);

  return fieldElements.fieldWrapper;
}

/**
 * Loads a fragment.
 * @param {string} path The path to the fragment
 * @returns {HTMLElement} The root element of the fragment
 */
// eslint-disable-next-line import/prefer-default-export
export async function loadFragment(path) {
  if (path && path.startsWith('/')) {
    // eslint-disable-next-line no-param-reassign
    path = path.replace(/(\.plain)?\.html/, '');
    const resp = await fetch(`${path}.plain.html`);
    if (resp.ok) {
      const main = document.createElement('main');
      main.innerHTML = await resp.text();

      // reset base path for media to fragment base
      const resetAttributeBase = (tag, attr) => {
        main.querySelectorAll(`${tag}[${attr}^="./media_"]`).forEach((elem) => {
          elem[attr] = new URL(elem.getAttribute(attr), new URL(path, window.location)).href;
        });
      };
      resetAttributeBase('img', 'src');
      resetAttributeBase('source', 'srcset');

      // Mark category-nav blocks to skip loading in fragments
      // They will be loaded explicitly when injected into the page
      const categoryNavBlocks = main.querySelectorAll('.category-nav');
      categoryNavBlocks.forEach((block) => {
        block.setAttribute('data-fragment-block', 'true');
      });

      // eslint-disable-next-line
      decorateMain(main);
      await loadSections(main);

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
    if (previousSibling
      && previousSibling.tagName === 'P'
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
 * Decorates primary buttons with color classes.
 * Handles color classes: btn-red, btn-blue, btn-slate, btn-dark-maroon, btn-black, btn-white
 *
 * This function works with the Universal Editor button model that includes a
 * conditional "classes" field that appears when linkType is "primary".
 * The classes field value is applied to the button's container or wrapper.
 *
 * @param {Element} element container element
 */
function decorateButtonColors(element) {
  const colorClasses = [
    'btn-red',
    'btn-blue',
    'btn-slate',
    'btn-dark-maroon',
    'btn-black',
    'btn-white',
    'btn-transparent',
  ];

  element.querySelectorAll('a.button.primary').forEach((button) => {
    // Check if button already has a color class
    const hasColorClass = colorClasses.some((c) => button.classList.contains(c));
    if (hasColorClass) return;

    // Check for color class in data attribute on button itself
    const buttonColor = button.dataset.buttonColor
      || button.getAttribute('data-button-color')
      || button.dataset.classes;
    if (buttonColor && colorClasses.includes(buttonColor)) {
      button.classList.add(buttonColor);
      return;
    }

    // Check for color class on parent container (p.button-container)
    const container = button.closest('.button-container');
    if (container) {
      // Check container's data-classes attribute (Universal Editor pattern)
      const containerClasses = container.dataset.classes;
      if (containerClasses && colorClasses.includes(containerClasses)) {
        button.classList.add(containerClasses);
        return;
      }

      // Check container's classList
      colorClasses.forEach((colorClass) => {
        if (container.classList.contains(colorClass)) {
          button.classList.add(colorClass);
          container.classList.remove(colorClass);
        }
      });
    }

    // Check for color class on parent's parent (for Universal Editor wrapper patterns)
    const wrapper = container?.parentElement;
    if (wrapper) {
      // Check wrapper's data-classes attribute
      const wrapperClasses = wrapper.dataset.classes;
      if (wrapperClasses && colorClasses.includes(wrapperClasses)) {
        button.classList.add(wrapperClasses);
        return;
      }

      // Check wrapper's classList
      colorClasses.forEach((colorClass) => {
        if (wrapper.classList.contains(colorClass)) {
          button.classList.add(colorClass);
          wrapper.classList.remove(colorClass);
        }
      });
    }

    // Check for block-level color class (for button blocks)
    const blockWrapper = button.closest('.block');
    if (blockWrapper) {
      colorClasses.forEach((colorClass) => {
        if (blockWrapper.classList.contains(colorClass)) {
          button.classList.add(colorClass);
          blockWrapper.classList.remove(colorClass);
        }
      });
    }
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
        categoryNavBlock.removeAttribute('data-fragment-block');
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
            sectionClone.setAttribute('data-category-name', categoryName);
          }
        }

        // Add class to the wrapper containing the block
        const blockWrapper = sectionClone.querySelector('.category-nav-wrapper');
        if (blockWrapper) {
          blockWrapper.classList.add('category-nav-block-wrapper');
        }
      }

      if (firstChild) {
        main.insertBefore(sectionClone, firstChild);
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

async function createForm(formHref, submitHref) {
  const { pathname } = new URL(formHref);
  const resp = await fetch(pathname);
  const json = await resp.json();

  const form = document.createElement('form');
  form.dataset.action = submitHref;

  const fields = await Promise.all(json.data.map((fd) => createField(fd, form)));
  fields.forEach((field) => {
    if (field) {
      form.append(field);
    }
  });

  // group fields into fieldsets
  const fieldsets = form.querySelectorAll('fieldset');
  fieldsets.forEach((fieldset) => {
    form.querySelectorAll(`[data-fieldset="${fieldset.name}"`).forEach((field) => {
      fieldset.append(field);
    });
  });

  return form;
}

function generatePayload(form) {
  const payload = {};

  [...form.elements].forEach((field) => {
    if (field.name && field.type !== 'submit' && !field.disabled) {
      if (field.type === 'radio') {
        if (field.checked) payload[field.name] = field.value;
      } else if (field.type === 'checkbox') {
        if (field.checked) payload[field.name] = payload[field.name] ? `${payload[field.name]},${field.value}` : field.value;
      } else {
        payload[field.name] = field.value;
      }
    }
  });
  return payload;
}

async function handleSubmit(form) {
  if (form.getAttribute('data-submitting') === 'true') return;

  const submit = form.querySelector('button[type="submit"]');
  try {
    form.setAttribute('data-submitting', 'true');
    submit.disabled = true;

    // create payload
    const payload = generatePayload(form);
    const response = await fetch(form.dataset.action, {
      method: 'POST',
      body: JSON.stringify({ data: payload }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (response.ok) {
      if (form.dataset.confirmation) {
        window.location.href = form.dataset.confirmation;
      }
    } else {
      const error = await response.text();
      throw new Error(error);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  } finally {
    form.setAttribute('data-submitting', 'false');
    submit.disabled = false;
  }
}

export async function decorateForm(block) {
  const formLink = block.querySelector('a').href;
  const submitLink = '/api';
  // if (!formLink || !submitLink) return;

  const form = await createForm(formLink, submitLink);
  block.replaceChildren(form);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const valid = form.checkValidity();
    if (valid) {
      handleSubmit(form);
    } else {
      const firstInvalidEl = form.querySelector(':invalid:not(fieldset)');
      if (firstInvalidEl) {
        firstInvalidEl.focus();
        firstInvalidEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
}

function loadAutoBlock(doc) {
  doc.querySelectorAll('a').forEach((a) => {
    if (a && a.href && a.href.includes('/fragments/')) {
      decorateFragment(a.parentElement);
    } else if (a && a.href && a.href.includes('/forms/')) {
      decorateForm(a.parentElement);
    }
  });
}

/** SECTIONS */

/**
 * Converts a CSS color value to RGB values
 * @param {string} color - CSS color value (hex, rgb, rgba, hsl, hsla, or named color)
 * @returns {Object|null} Object with r, g, b values (0-255) or null if invalid
 */
function parseColor(section) {
  if (!section) return null;

  const computedBg = getComputedStyle(section).backgroundColor;
  const rgbMatch = computedBg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!rgbMatch) return null;
  return {
    r: parseInt(rgbMatch[1], 10),
    g: parseInt(rgbMatch[2], 10),
    b: parseInt(rgbMatch[3], 10),
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
 * The color scheme detection uses the WCAG relative luminance formula to determine if a bg color
 * is light or dark, ensuring accessible and appropriate styling for content within the section.
 * Determines if a CSS color value is light or dark
 * @param {string} color - CSS color value
 * @param {number} threshold - Luminance threshold (default: 0.5)
 * @returns {boolean} true if light, false if dark, null if invalid color
 */
export function getColorScheme(section) {
  const rgb = parseColor(section);
  if (!rgb) return null;

  return getRelativeLuminance(rgb) > 0.5 ? 'light-scheme' : 'dark-scheme';
}

export function setColorScheme(section) {
  const scheme = getColorScheme(section);
  if (!scheme) return;
  section.querySelectorAll(':scope > *').forEach((el) => {
    // Reset any pre-made color schemes
    el.classList.remove('light-scheme', 'dark-scheme');
    el.classList.add(scheme);
  });
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
 * Creates a responsive picture element for background images with optimization
 * Similar to createOptimizedPicture, but for 2 background image options
 * @param {Element} main the main element
 */
function createResponsiveBackgroundPicture(main) {
  const sectionImgContainers = main.querySelectorAll(':scope > .section[data-sectionbackgroundimagemobile], :scope > .section[data-sectionbackgroundimage]');
  sectionImgContainers.forEach((sectionImgContainer) => {
    const sectionImg = sectionImgContainer.dataset.sectionbackgroundimage;
    const sectionMobImg = sectionImgContainer.dataset.sectionbackgroundimagemobile;
    let defaultImgUrl = null;

    const newPic = document.createElement('picture');
    newPic.classList.add('bg-images');

    if (sectionImg) {
      newPic.appendChild(createSource(sectionImg, 1920, MEDIA_QUERIES.desktop.media));
      newPic.appendChild(createSource(sectionImg, 899, MEDIA_QUERIES.tablet.media));
      defaultImgUrl = sectionImg;
    }

    if (sectionMobImg) {
      newPic.appendChild(createSource(sectionMobImg, 600, MEDIA_QUERIES.mobile.media));
      defaultImgUrl = sectionMobImg;
    }

    const newImg = document.createElement('img');
    newImg.alt = '';
    newImg.className = 'section-img';
    newImg.loading = 'lazy';

    if (defaultImgUrl) {
      // Set width and height once image loads to get native dimensions
      newImg.onload = () => {
        newImg.width = newImg.naturalWidth;
        newImg.height = newImg.naturalHeight;
      };
      newImg.src = defaultImgUrl;

      newPic.appendChild(newImg);
      sectionImgContainer.classList.add('has-bg-images');
      sectionImgContainer.prepend(newPic);
    }
  });
}

/**
 * Decorates all sections in a container element. Moved from aem.js
 * @param {Element} main The container element
 */
export function decorateSections(main) {
  const sectionsWithHeight = [];

  main.querySelectorAll(':scope > div:not([data-section-status])').forEach((section) => {
    const wrappers = [];
    let defaultContent = false;
    [...section.children].forEach((e) => {
      if ((e.tagName === 'DIV' && e.className) || !defaultContent) {
        const wrapper = document.createElement('div');
        wrappers.push(wrapper);
        defaultContent = e.tagName !== 'DIV' || !e.className;
        if (defaultContent) wrapper.classList.add('default-content-wrapper');
      }
      wrappers[wrappers.length - 1].append(e);
    });
    wrappers.forEach((wrapper) => section.append(wrapper));
    section.classList.add('section');
    section.dataset.sectionStatus = 'initialized';
    section.style.display = 'none';

    // Process section metadata
    const sectionMeta = section.querySelector('div.section-metadata');
    let heightDesktop = null;
    let heightMobile = null;

    if (sectionMeta) {
      const meta = readBlockConfig(sectionMeta);
      Object.keys(meta).forEach((key) => {
        if (key === 'style') {
          const styles = meta.style
            .split(',')
            .filter((style) => style)
            .map((style) => toClassName(style.trim()));
          styles.forEach((style) => section.classList.add(style));
        } else if (key === 'id') {
          section.id = meta[key];
        } else if (key === 'height') {
          heightDesktop = meta[key];
        } else if (key === 'heightmobile') {
          heightMobile = meta[key];
        } else {
          section.dataset[toCamelCase(key)] = meta[key];
        }
      });
      sectionMeta.parentNode.remove();
    }

    // Apply background color if specified
    if (section.dataset.backgroundcolor) {
      let bgValue = section.dataset.backgroundcolor.trim();

      // If it looks like a hex color (3 or 6 characters, alphanumeric), prepend with #
      if (/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(bgValue)) {
        bgValue = `#${bgValue}`;
      }
      section.style.background = bgValue;
    }

    // Apply color scheme based on background color
    setColorScheme(section);

    // Store sections with height for batch processing all on page
    if (heightDesktop || heightMobile) {
      sectionsWithHeight.push({
        section,
        heightDesktop,
        heightMobile,
      });
    }
  });

  // Set up single event listener for all sections with height
  if (sectionsWithHeight.length > 0) {
    const updateAllHeights = () => {
      const isMobile = MEDIA_QUERIES.mobile.matches;
      sectionsWithHeight.forEach(({ section, heightDesktop, heightMobile }) => {
        const height = isMobile && heightMobile ? heightMobile : heightDesktop;
        // Always set minHeight (or clear it with empty string if no value for current breakpoint)
        section.style.minHeight = height || '';
      });
    };

    updateAllHeights();
    MEDIA_QUERIES.mobile.addEventListener('change', updateAllHeights);
    MEDIA_QUERIES.desktop.addEventListener('change', updateAllHeights);
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // TODO: add auto block, if needed
    loadAutoBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateButtonGroups(main);
  decorateButtonColors(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  buildEmbedBlocks(main);
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
    const sheet = window.document.styleSheets[document.styleSheets.length - 1];
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
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
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
  categoryNavWrapper.setAttribute('data-nav-placeholder', 'true');

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

  for (let i = 0; i < navBlocksArray.length; i += 1) {
    const navBlock = navBlocksArray[i];
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
    } while (menuItem);
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
    crumbs[crumbs.length - 1].title = breadcrumbsTitle;
  }

  // last link is current page and should not be linked
  if (crumbs.length > 1) {
    crumbs[crumbs.length - 1].url = null;
  }
  if (crumbs.length > 0) {
    crumbs[crumbs.length - 1]['aria-current'] = 'page';
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
    script.setAttribute('data-schema-type', 'breadcrumb');
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
 * Load and inject breadcrumbs into the first section of main
 * @param {Element} main The main element
 */
async function loadBreadcrumbs(main) {
  // Check if breadcrumbs are enabled via page metadata
  const breadcrumbsMeta = getMetadata('breadcrumbs');

  if (!breadcrumbsMeta || breadcrumbsMeta.toLowerCase() !== 'true') {
    return;
  }

  try {
    const breadcrumbs = await buildBreadcrumbs();
    if (breadcrumbs) {
      // Find the first content section in main (skip category-nav sections)
      const sections = main.querySelectorAll(':scope > div.section');
      let targetSection = null;

      // Find the first section that is NOT a category-nav section
      for (let i = 0; i < sections.length; i += 1) {
        const section = sections[i];
        if (!section.classList.contains('category-nav-container')
            && !section.classList.contains('category-nav-section')) {
          targetSection = section;
          break;
        }
      }

      if (targetSection) {
        // Look for a wrapper div inside the section (e.g., hero-wrapper, cards-wrapper)
        const wrapperDiv = targetSection.querySelector(':scope > div[class*="-wrapper"]');

        if (wrapperDiv) {
          // Insert breadcrumbs as the first element inside the wrapper
          wrapperDiv.insertBefore(breadcrumbs, wrapperDiv.firstChild);
        } else {
          // Fallback: insert into section if no wrapper found
          targetSection.insertBefore(breadcrumbs, targetSection.firstChild);
        }
      } else {
        // Fallback: insert as first element in main if no suitable section found
        main.insertBefore(breadcrumbs, main.firstChild);
      }
    }
  } catch (error) {
    // Silently fail - breadcrumbs are optional enhancement
  }
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

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
  loadAutoBlock(doc);
  createResponsiveBackgroundPicture(main);
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
