/* eslint-disable no-console */
/* eslint-disable no-cond-assign */
/* eslint-disable import/prefer-default-export */

// group editable texts in single wrappers if applicable.
// this script should execute after script.js but before the the universal editor cors script
// and any block being loaded

/** Maximum iterations per loop to prevent CWE-606 (loop bound from user-controlled input). */
const MAX_RICHTEXT_ITERATIONS = 1000;

function deleteInstrumentation(element) {
  delete element.dataset.richtextResource;
  delete element.dataset.richtextProp;
  delete element.dataset.richtextFilter;
  delete element.dataset.richtextLabel;
}

function collectSiblings(element, richtextResource, richtextProp) {
  const siblings = [];
  let sibling = element;
  for (let s = 0; s < MAX_RICHTEXT_ITERATIONS && (sibling = sibling.nextElementSibling); s += 1) {
    if (sibling.dataset.richtextResource === richtextResource
      && sibling.dataset.richtextProp === richtextProp) {
      deleteInstrumentation(sibling);
      siblings.push(sibling);
    } else {
      break;
    }
  }
  return siblings;
}

function getOrphanElements(element, richtextResource, richtextProp) {
  if (richtextResource && richtextProp) {
    return document.querySelectorAll(`[data-richtext-id="${richtextResource}"][data-richtext-prop="${richtextProp}"]`);
  }
  const editable = element.closest('[data-aue-resource]');
  if (!editable) {
    console.warn(`Editable parent not found or richtext property ${richtextProp}`);
    return null;
  }
  return editable.querySelectorAll(`:scope > :not([data-aue-resource]) [data-richtext-prop="${richtextProp}"]`);
}

function createGroupAndReplace(element, siblings, dataset) {
  const group = document.createElement('div');
  if (dataset.richtextResource) {
    group.dataset.aueResource = dataset.richtextResource;
    group.dataset.aueBehavior = 'component';
  }
  if (dataset.richtextProp) group.dataset.aueProp = dataset.richtextProp;
  if (dataset.richtextLabel) group.dataset.aueLabel = dataset.richtextLabel;
  if (dataset.richtextFilter) group.dataset.aueFilter = dataset.richtextFilter;
  group.dataset.aueType = 'richtext';
  element.replaceWith(group);
  group.append(element, ...siblings);
}

export function decorateRichtext(container = document) {
  const candidates = Array.from(container.querySelectorAll('[data-richtext-prop]:not(div)'));
  const processCount = Math.min(candidates.length, MAX_RICHTEXT_ITERATIONS);
  for (let i = 0; i < processCount; i += 1) {
    const element = candidates[i];
    if (!element.dataset.richtextProp) continue; // eslint-disable-line no-continue
    const {
      richtextResource, richtextProp, richtextFilter, richtextLabel,
    } = element.dataset;
    deleteInstrumentation(element);
    const siblings = collectSiblings(element, richtextResource, richtextProp);
    const orphanElements = getOrphanElements(element, richtextResource, richtextProp);
    if (orphanElements === null) return;
    if (orphanElements.length > 0) {
      console.warn('Found orphan elements of a richtext, that were not consecutive siblings of '
        + 'the first paragraph', orphanElements);
      orphanElements.forEach((orphanElement) => deleteInstrumentation(orphanElement));
    } else {
      createGroupAndReplace(element, siblings, {
        richtextResource, richtextProp, richtextFilter, richtextLabel,
      });
    }
  }
}

// in cases where the block decoration is not done in one synchronous iteration we need to listen
// for new richtext-instrumented elements
const observer = new MutationObserver(() => decorateRichtext());
observer.observe(document, { attributeFilter: ['data-richtext-prop'], subtree: true });

decorateRichtext();
