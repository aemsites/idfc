/**
 * Deferred (non-module) so it runs as soon as the HTML document is parsed, before
 * aem.js / scripts.js modules. Upgrades hero intro <img> from plain-HTML loading="lazy"
 * to eager + fetchpriority=high so the LCP request is not deferred to script phase.
 */
(function heroIntroLcpPriority() {
  if (document.querySelector('main[data-aue-resource]')) return;

  const main = document.querySelector('main');
  if (!main) return;

  const block = main.querySelector('.hero-heritage-cc');
  if (!block) return;

  const rows = [...block.children].filter((c) => c.tagName === 'DIV');
  const introRow = rows[1];
  if (!introRow) return;

  const introContent = introRow.querySelector(':scope > div');
  const pic = introContent?.querySelector('picture');
  const img = pic?.querySelector('img');
  if (!img) return;

  img.setAttribute('loading', 'eager');
  img.setAttribute('fetchpriority', 'high');
}());
