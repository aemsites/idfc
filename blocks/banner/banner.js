const SECTION_CONFIG = [
  { classes: ['banner-heading'], sub: { selector: 'p', class: 'banner-heading-text' } },
  { classes: ['banner-bottom-text'], sub: { selector: 'p', class: 'banner-bottom-text-content' } },
  { classes: ['banner-image-desktop', 'banner-image'], sub: { selector: 'picture', class: 'banner-picture' }, imgLoading: 'eager' },
  { classes: ['banner-image-mobile', 'banner-image'], sub: { selector: 'picture', class: 'banner-picture' }, imgLoading: 'lazy' },
];

function decorateSection(section, config) {
  if (!section || !config) return;
  section.classList.add(...config.classes);
  const sub = config.sub && section.querySelector(config.sub.selector);
  if (sub) sub.classList.add(config.sub.class);
  const img = config.imgLoading && section.querySelector('img');
  if (img) {
    img.classList.add('banner-img');
    img.loading = config.imgLoading;
  }
}

export default function decorate(block) {
  const container = block.querySelector(':scope > div');
  if (!container) return;

  container.classList.add('banner-content');
  const children = Array.from(container.children);

  SECTION_CONFIG.forEach((config, i) => decorateSection(children[i], config));
}
