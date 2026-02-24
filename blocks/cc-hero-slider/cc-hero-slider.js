import { loadScript, loadCSS } from '../../scripts/aem.js';
import { moveInstrumentation, DOMPURIFY } from '../../scripts/scripts.js';

/**
 * Decorates the CC Hero Slider block
 * @param {HTMLElement} block The block element
 */
export default async function decorate(block) {
  // Build the slider structure
  const slides = [...block.children];

  // Create swiper container structure
  const swiperWrapper = document.createElement('div');
  swiperWrapper.className = 'swiper-wrapper';

  slides.forEach((slide) => {
    const swiperSlide = document.createElement('div');
    swiperSlide.className = 'swiper-slide cc-hero-slider-item';
    moveInstrumentation(slide, swiperSlide);

    const children = [...slide.children];

    // First div: Desktop Background Image
    const desktopBgDiv = children[0];
    if (desktopBgDiv) {
      const desktopPicture = desktopBgDiv.querySelector('picture');
      if (desktopPicture) {
        const desktopBgWrapper = document.createElement('div');
        desktopBgWrapper.className = 'cc-hero-slider-bg cc-hero-slider-bg-desktop';
        desktopBgWrapper.appendChild(desktopPicture.cloneNode(true));
        swiperSlide.appendChild(desktopBgWrapper);
      }
    }

    // Second div: Mobile Background Image
    const mobileBgDiv = children[1];
    if (mobileBgDiv) {
      const mobilePicture = mobileBgDiv.querySelector('picture');
      if (mobilePicture) {
        const mobileBgWrapper = document.createElement('div');
        mobileBgWrapper.className = 'cc-hero-slider-bg cc-hero-slider-bg-mobile';
        mobileBgWrapper.appendChild(mobilePicture.cloneNode(true));
        swiperSlide.appendChild(mobileBgWrapper);
      }
    }

    // Third div: Slide Content
    const contentDiv = children[2];
    if (contentDiv) {
      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'cc-hero-slider-content';
      // Move all content from the original div
      while (contentDiv.firstChild) {
        contentWrapper.appendChild(contentDiv.firstChild);
      }
      swiperSlide.appendChild(contentWrapper);
    }

    // Fourth div: Pop-up trigger CTA text (optional)
    const popupTriggerDiv = children[3];
    if (popupTriggerDiv?.textContent.trim()) {
      const popupTrigger = document.createElement('div');
      popupTrigger.className = 'cc-hero-slider-popup-trigger';
      const popupRaw = popupTriggerDiv.innerHTML;
      popupTrigger.innerHTML = (window.DOMPurify?.sanitize(popupRaw, DOMPURIFY))
        ?? popupRaw;
      swiperSlide.appendChild(popupTrigger);
    }

    // Fifth div: Pop-up ID (optional) - store as data attribute
    const popupIdDiv = children[4];
    if (popupIdDiv?.textContent.trim()) {
      swiperSlide.dataset.popupId = popupIdDiv.textContent.trim();
    }

    swiperWrapper.appendChild(swiperSlide);
  });

  // Clear block and add swiper structure
  block.textContent = '';
  block.classList.add('cc-hero-slider', 'swiper');
  block.appendChild(swiperWrapper);

  // Load Swiper library
  await loadCSS('/scripts/swiperjs/swiper-bundle.min.css');
  await loadScript('/scripts/swiperjs/swiper-bundle.min.js');

  // Wait for Swiper to be available
  const waitForSwiper = () => new Promise((resolve) => {
    if (typeof Swiper !== 'undefined') {
      resolve();
    } else {
      const checkInterval = setInterval(() => {
        if (typeof Swiper !== 'undefined') {
          clearInterval(checkInterval);
          resolve();
        }
      }, 10);
      // Timeout after 2 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 2000);
    }
  });
  await waitForSwiper();

  // Initialize Swiper if available
  if (typeof Swiper === 'undefined') {
    // eslint-disable-next-line no-console
    console.warn('Swiper library not available, hero slider will display without slider functionality');
    return;
  }

  // Swiper configuration for hero slider
  const swiperConfig = {
    slidesPerView: 1,
    spaceBetween: 0,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },
    effect: 'slide',
    speed: 600,
  };

  // eslint-disable-next-line no-undef
  const swiper = new Swiper(block, swiperConfig);

  // Store swiper instance for potential future use
  block.swiperInstance = swiper;
}
