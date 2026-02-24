/*
 * Embed Block
 * Show videos and social posts directly on your page
 * https://www.hlx.live/developer/block-collection/embed
 */

import { DOMPURIFY } from '../../scripts/scripts.js';

const loadScript = (url, callback, type) => {
  const head = document.querySelector('head');
  const script = document.createElement('script');
  script.src = url;
  if (type) {
    script.setAttribute('type', type);
  }
  script.onload = callback;
  head.append(script);
  return script;
};

/* Add iframe wrapper to the embed */
const getDefaultEmbed = (url) => `<div class="iframe-wrapper">
    <iframe src="${url.href}" allowfullscreen=""
      scrolling="no" allow="encrypted-media" title="Content from ${url.hostname}" loading="lazy">
    </iframe>
  </div>`;

const embedYoutube = (url, autoplay) => {
  const usp = new URLSearchParams(url.search);
  const suffix = autoplay ? '&muted=1&autoplay=1' : '';
  let vid = usp.get('v') ? encodeURIComponent(usp.get('v')) : '';
  const embed = url.pathname;
  if (url.origin.includes('youtu.be')) {
    [, vid] = url.pathname.split('/');
  }
  const embedHTML = `<div class="iframe-wrapper">
      <iframe src="https://www.youtube.com${vid ? `/embed/${vid}?rel=0&v=${vid}${suffix}` : embed}" 
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; picture-in-picture" allowfullscreen="" scrolling="no" title="Content from Youtube" loading="lazy"></iframe>
    </div>`;
  return embedHTML;
};

const embedVimeo = (url, autoplay) => {
  const [, video] = url.pathname.split('/');
  const suffix = autoplay ? '?muted=1&autoplay=1' : '';
  const embedHTML = `<div class="iframe-wrapper">
      <iframe src="https://player.vimeo.com/video/${video}${suffix}" 
        allow="autoplay; fullscreen; picture-in-picture" allowfullscreen  
      title="Content from Vimeo" loading="lazy"></iframe>
    </div>`;
  return embedHTML;
};

const embedTwitter = (url) => {
  if (!url.href.startsWith('https://twitter.com')) {
    url.href = url.href.replace('https://x.com', 'https://twitter.com');
  }
  const embedHTML = `<blockquote class="twitter-tweet"><a href="${url.href}"></a></blockquote>`;
  loadScript('https://platform.twitter.com/widgets.js');
  return embedHTML;
};

const loadEmbed = (block, link, autoplay) => {
  if (block.classList.contains('embed-is-loaded')) {
    return;
  }

  const EMBEDS_CONFIG = [
    {
      match: ['youtube', 'youtu.be'],
      embed: embedYoutube,
    },
    {
      match: ['vimeo'],
      embed: embedVimeo,
    },
    {
      match: ['twitter', 'x.com'],
      embed: embedTwitter,
    },
  ];
  const config = EMBEDS_CONFIG.find((e) => e.match.some((match) => link.includes(match)));
  const url = new URL(link);
  if (config) {
    const embedHtml = config.embed(url, autoplay);
    block.innerHTML = (window.DOMPurify?.sanitize(embedHtml, DOMPURIFY))
      ?? embedHtml;
    block.classList = `block embed embed-${config.match[0]}`;
  } else {
    const defaultHtml = getDefaultEmbed(url);
    block.innerHTML = (window.DOMPurify?.sanitize(defaultHtml, DOMPURIFY))
      ?? defaultHtml;
    block.classList = 'block embed';
  }
  block.classList.add('embed-is-loaded');
};

export default function decorate(block) {
  const placeholder = block.querySelector('picture');
  const link = block.querySelector('a').href;
  block.textContent = '';

  if (placeholder) {
    const wrapper = document.createElement('div');
    wrapper.className = 'embed-placeholder';
    const placeholderHtml = '<div class="embed-placeholder-play"><button type="button" title="Play"></button></div>';
    wrapper.innerHTML = (window.DOMPurify?.sanitize(placeholderHtml, DOMPURIFY))
      ?? placeholderHtml;
    wrapper.prepend(placeholder);
    wrapper.addEventListener('click', () => {
      loadEmbed(block, link, true);
    });
    block.append(wrapper);
  } else {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        loadEmbed(block, link);
      }
    });
    observer.observe(block);
  }
}
