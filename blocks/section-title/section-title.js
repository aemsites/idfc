/**
 * Section Title: 4-cell contract.
 * Cell 0: title (tag+text). 1: title size. 2: subtitle (tag+text). 3: subtitle size.
 * Only title and subtitle are rendered; size/alignment are block classes only.
 */
import { readBlockConfig } from '../../scripts/aem.js';

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6, p';
const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'];
const ALIGNMENTS = ['left', 'center', 'right'];

const SIZE_MAP = new Map([
  ['xxl', 'size-xxl'],
  ['xl', 'size-xl'],
  ['l', 'size-l'],
  ['m', 'size-m'],
  ['s', 'size-s'],
  ['xs', 'size-xs'],
]);

function normalizeSize(val) {
  if (!val || typeof val !== 'string') return '';
  const n = val.trim().toLowerCase();
  if (!n) return '';
  const mapped = SIZE_MAP.get(n);
  if (mapped) return mapped;
  if (n.startsWith('size-')) return n;
  const order = ['xxl', 'xs', 'xl', 'l', 'm', 's'];
  const key = order.find((k) => n.includes(k));
  return key ? SIZE_MAP.get(key) ?? '' : '';
}

function cellText(row) {
  if (!row?.children?.length) return '';
  const col = row.children.length >= 2 ? row.children[1] : row.children[0];
  return (col?.textContent ?? '').trim();
}

function get(config, ...keys) {
  const v = keys.reduce((acc, k) => acc ?? config[k], undefined);
  return typeof v === 'string' ? v.trim() : '';
}

function hasValue(s) {
  return typeof s === 'string' && s.trim().length > 0;
}

function validTag(t) {
  if (!t || typeof t !== 'string') return '';
  const lower = t.trim().toLowerCase();
  return (HEADING_TAGS.includes(lower)) ? lower : '';
}

function parseFromId(id) {
  const out = { type: '', sizeClass: '', alignment: '' };
  if (!id || typeof id !== 'string') return out;
  const parts = id.split('---');
  if (parts[1] && HEADING_TAGS.includes(parts[1].toLowerCase())) {
    out.type = parts[1].toLowerCase();
  }
  const rest = (parts[2] ?? '').toLowerCase();
  const sizePart = (rest.split('-and-')[0] ?? '').replace(/^size-/, '');
  out.sizeClass = normalizeSize(sizePart) || normalizeSize(rest);
  if (rest.includes('right')) out.alignment = 'right';
  else if (rest.includes('center')) out.alignment = 'center';
  return out;
}

function getHeadingFromCell(cell, existingHeading = null) {
  const heading = existingHeading ?? cell?.querySelector?.(HEADING_SELECTOR);
  if (heading) {
    return {
      text: (heading.textContent ?? '').trim(),
      tag: heading.tagName.toLowerCase(),
      id: heading.id ?? '',
    };
  }
  return { text: cellText(cell), tag: 'h2', id: '' };
}

function buildHeading(tag, text, className, id = '', clone = null) {
  const el = document.createElement(HEADING_TAGS.includes(tag) ? tag : 'p');
  el.classList.add(className);
  if (clone) el.append(...clone.childNodes);
  else el.textContent = text ?? '';
  if (hasValue(id)) el.id = id;
  return el;
}

function readTitleFromRows(rows, block) {
  const state = {
    titleText: '',
    titleTag: 'h2',
    titleSizeClass: '',
    titleId: '',
    alignVal: '',
    titleHeadingEl: null,
  };
  const titleSource = rows.length >= 1 ? rows[0] : block;
  const titleHeadingEl = titleSource?.querySelector?.(HEADING_SELECTOR);
  state.titleHeadingEl = titleHeadingEl;
  const titleInfo = getHeadingFromCell(titleSource, titleHeadingEl);
  if (!hasValue(titleInfo.text) && !titleHeadingEl) return state;
  state.titleText = titleInfo.text;
  state.titleTag = titleInfo.tag;
  state.titleId = titleInfo.id;
  const fromId = parseFromId(titleInfo.id);
  if (fromId.type) state.titleTag = fromId.type;
  if (rows.length === 0) {
    state.titleSizeClass = fromId.sizeClass;
    state.alignVal = fromId.alignment;
  }
  if (rows.length >= 2) {
    state.titleSizeClass = normalizeSize(cellText(rows[1])) || state.titleSizeClass;
  }
  return state;
}

function readSubtitleFromRows(rows, block) {
  const state = {
    subtitleText: '',
    subtitleTag: 'p',
    subtitleSizeClass: '',
    subHeadingEl: null,
  };
  if (rows.length >= 3) {
    state.subHeadingEl = rows[2]?.querySelector?.(HEADING_SELECTOR) ?? null;
    const sub = getHeadingFromCell(rows[2], state.subHeadingEl);
    if (hasValue(sub.text) || state.subHeadingEl) {
      state.subtitleText = sub.text;
      state.subtitleTag = sub.tag;
    }
  }
  if (rows.length >= 4) state.subtitleSizeClass = normalizeSize(cellText(rows[3]));
  if (rows.length === 0 && hasValue(block.getAttribute?.('data-subtitle'))) {
    state.subtitleText = block.getAttribute('data-subtitle');
  }
  return state;
}

function applyConfig(state, config) {
  const cfg = (key, ...alt) => get(config, key, ...alt);
  const titleCfg = cfg('title-text', 'title') || cfg('title');
  if (hasValue(titleCfg)) state.titleText = titleCfg;
  const tType = validTag(cfg('title-type', 'titleType'));
  if (tType) state.titleTag = tType;
  if (hasValue(cfg('title-size', 'titleSize'))) {
    state.titleSizeClass = normalizeSize(cfg('title-size', 'titleSize'));
  }
  const align = cfg('classes', 'alignment') || cfg('alignment');
  if (ALIGNMENTS.includes(align)) state.alignVal = align;
  if (hasValue(cfg('subtitle'))) state.subtitleText = cfg('subtitle');
  const sType = validTag(cfg('subtitle-type', 'subtitleType'));
  if (sType) state.subtitleTag = sType;
  if (hasValue(cfg('subtitle-size', 'subtitleSize'))) {
    state.subtitleSizeClass = normalizeSize(cfg('subtitle-size', 'subtitleSize'));
  }
}

function renderSectionTitle(block, state) {
  block.replaceChildren();
  block.appendChild(buildHeading(
    state.titleTag,
    state.titleText,
    'title',
    state.titleId,
    state.titleHeadingEl?.cloneNode(true) ?? null,
  ));
  if (hasValue(state.titleSizeClass)) block.classList.add(state.titleSizeClass);
  if (ALIGNMENTS.includes(state.alignVal)) block.classList.add(state.alignVal);
  if (!hasValue(state.subtitleText)) return;
  block.appendChild(buildHeading(
    state.subtitleTag,
    state.subtitleText,
    'subtitle',
    '',
    state.subHeadingEl?.cloneNode(true) ?? null,
  ));
  if (hasValue(state.subtitleSizeClass)) block.classList.add(`subtitle-${state.subtitleSizeClass}`);
}

export default function decorate(block) {
  const config = readBlockConfig(block) ?? {};
  const rows = Array.from(block.querySelectorAll(':scope > div')).slice(0, 4);
  const titleState = readTitleFromRows(rows, block);
  const subtitleState = readSubtitleFromRows(rows, block);
  const state = { ...titleState, ...subtitleState };
  applyConfig(state, config);
  if (!hasValue(state.titleText) && !state.titleHeadingEl) return;
  renderSectionTitle(block, state);
}
