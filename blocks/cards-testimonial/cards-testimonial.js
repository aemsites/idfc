import {
  createOptimizedPicture, loadScript, loadCSS, getMetadata,
} from '../../scripts/aem.js';
import { moveInstrumentation, DOMPURIFY } from '../../scripts/scripts.js';

function parseReviewDateToISO(dateText) {
  if (!dateText || !String(dateText).trim()) return '';
  const trimmed = String(dateText).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dateOnlyMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateOnlyMatch) return dateOnlyMatch[1];
  try {
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) {
      return parsed.toISOString().split('T')[0];
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('Failed to parse review date:', e);
  }
  return '';
}

function formatDateForDisplay(isoDate) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(isoDate).trim())) return isoDate || '';
  try {
    const d = new Date(`${String(isoDate).trim()}T12:00:00`);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('Failed to format date:', e);
    return isoDate;
  }
}

function extractOneTestimonial(card) {
  const cardBody = card.querySelector('.cards-card-body');
  if (!cardBody) return null;
  const rawName = card.dataset.personName || card.getAttribute('data-person-name') || '';
  const rawProduct = card.dataset.productName || card.getAttribute('data-product-name') || 'IDFC FIRST Bank Credit Card';
  let authorName = rawName;
  let productName = rawProduct;
  let ratingValue = parseInt(card.dataset.authorRating || card.getAttribute('data-author-rating'), 10) || 0;
  let datePublished = parseReviewDateToISO(card.dataset.reviewDate || card.getAttribute('data-review-date') || '');
  if (!authorName) {
    const authorEl = cardBody.querySelector('.testimonial-person-name');
    authorName = authorEl ? authorEl.textContent : '';
  }
  if (!productName || productName === 'IDFC FIRST Bank Credit Card') {
    const productEl = cardBody.querySelector('.testimonial-product-name u') || cardBody.querySelector('p u');
    productName = productEl ? productEl.textContent : 'IDFC FIRST Bank Credit Card';
  }
  if (ratingValue <= 0) {
    const starIcons = cardBody.querySelectorAll('[class*="icon-star"]');
    ratingValue = starIcons.length;
  }
  const paragraphs = cardBody.querySelectorAll('p');
  let reviewText = '';
  paragraphs.forEach((p, index) => {
    if (p.classList.contains('testimonial-person-name') || p.classList.contains('testimonial-date')
        || p.classList.contains('testimonial-product-name')) return;
    if (index > 0 && !p.querySelector('u') && !p.querySelector('.icon-inverted-commas')
        && !p.querySelector('[class*="icon-star"]')) {
      reviewText += p.textContent.trim();
    }
  });
  if (!datePublished) {
    const dateEl = cardBody.querySelector('.testimonial-date');
    const dateText = dateEl ? dateEl.textContent : '';
    const dateParts = dateText.split('|');
    const dateString = dateParts.length > 1 ? dateParts[1].trim() : dateText.trim();
    datePublished = parseReviewDateToISO(dateString);
  }
  if (!datePublished) {
    [datePublished] = new Date().toISOString().split('T');
  }
  if (!reviewText || !authorName || ratingValue <= 0) return null;
  return {
    '@type': 'Review',
    reviewBody: reviewText,
    reviewRating: { '@type': 'Rating', ratingValue: ratingValue.toString(), bestRating: '5' },
    author: { '@type': 'Person', name: authorName },
    datePublished,
    itemReviewed: { '@type': 'Product', name: productName },
  };
}

function buildProductSchemaFromTestimonials(testimonials) {
  const totalRating = testimonials.reduce(
    (sum, t) => sum + parseInt(t.reviewRating.ratingValue, 10),
    0,
  );
  const avgRating = (totalRating / testimonials.length).toFixed(1);
  const pageTitle = document.title || 'IDFC FIRST Bank Credit Card';
  const pageDescription = getMetadata('description')
    || getMetadata('og:description')
    || 'Apply for Credit Card at IDFC FIRST Bank with exclusive benefits and rewards.';
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  const pageUrl = canonicalLink?.href || getMetadata('og:url') || window.location.href;
  const pageImage = getMetadata('og:image');
  const publishedTime = getMetadata('published-time');
  const modifiedTime = getMetadata('modified-time');
  const category = getMetadata('breadcrumbstitle');
  const brandName = pageTitle.includes('IDFC') && pageTitle.includes('|')
    ? pageTitle.split('|')[1].trim() : 'IDFC FIRST Bank';
  const schemaProductName = pageTitle.includes('|')
    ? pageTitle.split('|')[0].trim() : pageTitle;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: schemaProductName,
    description: pageDescription,
    brand: { '@type': 'Brand', name: brandName },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: avgRating,
      ratingCount: testimonials.length.toString(),
      reviewCount: testimonials.length.toString(),
    },
    review: testimonials,
  };
  if (pageUrl) schema.url = pageUrl;
  if (pageImage) schema.image = pageImage;
  if (publishedTime) schema.datePublished = publishedTime;
  if (modifiedTime) schema.dateModified = modifiedTime;
  if (category) schema.category = category;
  return schema;
}

function generateTestimonialSchema(block) {
  const cards = block.querySelectorAll('.cards-card');
  const testimonials = [...cards].map((card) => extractOneTestimonial(card)).filter(Boolean);
  if (testimonials.length === 0) return null;
  return buildProductSchemaFromTestimonials(testimonials);
}

function injectSchema(schema) {
  if (!schema) return;
  document.querySelectorAll(
    'script[type="application/ld+json"][data-schema-type="testimonial"], script[type="application/ld+json"][data-error]',
  ).forEach((script) => script.remove());
  if (window.testimonialSchemaInjected) return;
  try {
    const jsonString = JSON.stringify(schema, null, 2);
    JSON.parse(jsonString);
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema-type', 'testimonial');
    script.text = jsonString;
    document.head.appendChild(script);
    window.testimonialSchemaInjected = true;
    setTimeout(() => {
      document.querySelectorAll('script[type="application/ld+json"][data-error]').forEach((s) => s.remove());
    }, 500);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to inject JSON-LD schema:', error);
  }
}

const PROPERTY_FIELDS = ['swipable', 'autoplayEnabled', 'startingCard'];
const PROPERTY_FIELDS_BY_INDEX = new Map(PROPERTY_FIELDS.map((name, i) => [i, name]));
const DEFAULT_PRODUCT = 'IDFC FIRST Bank Credit Card';

function parsePropertyValue(fieldName, text) {
  const t = String(text).trim();
  if (fieldName === 'swipable' || fieldName === 'autoplayEnabled') {
    return (t === 'true' || t === 'false') ? t : null;
  }
  if (fieldName === 'startingCard') {
    return (t !== '' && !Number.isNaN(Number(t))) ? t : null;
  }
  return null;
}

function isCardEmpty(cardItem) {
  return !cardItem.textContent.trim() && !cardItem.querySelector('picture, img');
}

function tryConsumeTextOnlyCard(cardItem, cardIndex, propertyIndex, propertyValues, itemsToRemove) {
  const paragraphs = cardItem.querySelectorAll('p');
  const hasPicture = cardItem.querySelector('picture');
  const hasHeading = cardItem.querySelector('h1, h2, h3, h4, h5, h6');
  if (paragraphs.length !== 1 || hasPicture || hasHeading) return null;
  const fieldName = PROPERTY_FIELDS_BY_INDEX.get(propertyIndex);
  const value = parsePropertyValue(fieldName, paragraphs[0].textContent);
  if ((value ?? null) === null) {
    return { nextCardIndex: cardIndex, nextPropertyIndex: propertyIndex + 1 };
  }
  if (fieldName === 'swipable') propertyValues.swipable = value;
  else if (fieldName === 'autoplayEnabled') propertyValues.autoplayEnabled = value;
  else if (fieldName === 'startingCard') propertyValues.startingCard = value;
  itemsToRemove.push(cardItem);
  return { nextCardIndex: cardIndex + 1, nextPropertyIndex: propertyIndex + 1 };
}

function tryConsumeThreeParagraphCard(cardItem, propertyValues, itemsToRemove) {
  const paragraphs = cardItem.querySelectorAll('p');
  const hasPicture = cardItem.querySelector('picture');
  const hasHeading = cardItem.querySelector('h1, h2, h3, h4, h5, h6');
  if (paragraphs.length < 3 || hasPicture || hasHeading) return false;
  const texts = [...paragraphs].slice(0, 3).map((p) => p.textContent.trim());
  const allValid = PROPERTY_FIELDS.slice(0, 3).every(
    (name, i) => parsePropertyValue(name, texts[i]),
  );
  if (!allValid) return false;
  const [swipableVal, autoplayVal, startingVal] = texts;
  propertyValues.swipable = swipableVal;
  propertyValues.autoplayEnabled = autoplayVal;
  propertyValues.startingCard = startingVal;
  itemsToRemove.push(cardItem);
  return true;
}

function extractBlockProperties(block, cardsContainer) {
  const propertyValues = {};
  const itemsToRemove = [];
  const items = [...cardsContainer.querySelectorAll('.cards-card')];
  let cardIndex = 0;
  let propertyIndex = 0;

  while (cardIndex < items.length && propertyIndex < PROPERTY_FIELDS.length) {
    const cardItem = items.at(cardIndex);
    const empty = isCardEmpty(cardItem);
    if (empty) {
      itemsToRemove.push(cardItem);
      cardIndex += 1;
      propertyIndex += 1;
    } else {
      const textResult = tryConsumeTextOnlyCard(
        cardItem,
        cardIndex,
        propertyIndex,
        propertyValues,
        itemsToRemove,
      );
      if (textResult) {
        cardIndex = textResult.nextCardIndex;
        propertyIndex = textResult.nextPropertyIndex;
      } else if (tryConsumeThreeParagraphCard(cardItem, propertyValues, itemsToRemove)) {
        break;
      } else {
        break;
      }
    }
  }

  if (Object.hasOwn(propertyValues, 'swipable')) block.dataset.swipable = propertyValues.swipable;
  if (Object.hasOwn(propertyValues, 'autoplayEnabled')) block.dataset.autoplayEnabled = propertyValues.autoplayEnabled;
  if (Object.hasOwn(propertyValues, 'startingCard')) block.dataset.startingCard = propertyValues.startingCard;
  itemsToRemove.forEach((cardItem) => cardItem.remove());
}

function createQuoteIconElement() {
  const p = document.createElement('p');
  const span = document.createElement('span');
  span.className = 'icon icon-inverted-commas';
  const img = document.createElement('img');
  img.setAttribute('data-icon-name', 'inverted-commas');
  img.src = '/icons/inverted-commas.svg';
  img.alt = '';
  img.loading = 'lazy';
  img.width = 18;
  img.height = 15;
  span.appendChild(img);
  p.appendChild(span);
  return p;
}

function createStarRatingElement(rating, formattedDate = '') {
  const p = document.createElement('p');
  const count = Math.min(5, Math.max(0, parseInt(Number(rating), 10) || 0));
  for (let i = 0; i < count; i += 1) {
    const span = document.createElement('span');
    span.className = 'icon icon-star icon-star-yellow';
    const img = document.createElement('img');
    img.setAttribute('data-icon-name', 'star-yellow');
    img.src = '/icons/star-yellow.svg';
    img.alt = '';
    img.loading = 'lazy';
    img.width = 12;
    img.height = 11;
    span.appendChild(img);
    p.appendChild(span);
  }
  if (formattedDate) {
    p.appendChild(document.createTextNode(` | ${formattedDate}`));
  }
  return p;
}

const looksLikeQuoteColumn = (text) => {
  const t = String(text).trim().toLowerCase();
  return t === '' || t === 'inverted-commas' || t === 'none';
};

const STRUCTURED_LAYOUTS = [
  {
    length: 3,
    hasContent: (d) => {
      const hasReview = d[1] && d[1].textContent.trim().length > 0;
      const hasDetails = d[2] && d[2].querySelectorAll('p').length >= 4;
      return hasReview || hasDetails;
    },
    quoteIdx: 0,
    reviewIdx: 1,
    quotedetailsIdx: 2,
  },
  {
    length: 7,
    hasContent: (d) => d[1].textContent.trim() || d[2].textContent.trim()
      || d[3].textContent.trim(),
    quoteIdx: 1,
    reviewIdx: 2,
    personIdx: 3,
    productIdx: 4,
    ratingIdx: 5,
    dateIdx: 6,
  },
  {
    length: 6,
    hasContent: (d) => d[0].textContent.trim() || d[1].textContent.trim()
      || d[2].textContent.trim(),
    quoteIdx: 0,
    reviewIdx: 1,
    personIdx: 2,
    productIdx: 3,
    ratingIdx: 4,
    dateIdx: 5,
  },
  {
    length: 5,
    hasContent: (d) => !looksLikeQuoteColumn(d[0].textContent)
      && (d[0].textContent.trim() || d[1].textContent.trim()),
    quoteVal: 'none',
    reviewIdx: 0,
    personIdx: 1,
    productIdx: 2,
    ratingIdx: 3,
    dateIdx: 4,
  },
  {
    length: 5,
    hasContent: (d) => looksLikeQuoteColumn(d[0].textContent)
      && (d[1].textContent.trim() || d[2].textContent.trim()),
    quoteIdx: 0,
    reviewIdx: null,
    personIdx: 1,
    productIdx: 2,
    ratingIdx: 3,
    dateIdx: 4,
  },
];

function applyLegacyNormalization(cardItem, mainBody) {
  if (!mainBody.querySelector('.icon-inverted-commas')) {
    cardItem.dataset.quoteIcon = 'none';
  }
  const authorEl = mainBody.querySelector('h5');
  if (authorEl) {
    const name = authorEl.textContent;
    const p = document.createElement('p');
    p.className = 'testimonial-person-name';
    p.textContent = name;
    authorEl.replaceWith(p);
    cardItem.dataset.personName = name;
  }
  const dateEl = mainBody.querySelector('h6');
  if (dateEl) {
    const dt = dateEl.textContent;
    const p = document.createElement('p');
    p.className = 'testimonial-date';
    p.textContent = dt;
    dateEl.replaceWith(p);
    cardItem.dataset.reviewDate = dt;
  }
  const productEl = mainBody.querySelector('p u');
  if (productEl) {
    const name = productEl.textContent;
    const parentP = productEl.closest('p');
    if (parentP && !parentP.classList.contains('testimonial-product-name')) {
      parentP.classList.add('testimonial-product-name');
    }
    cardItem.dataset.productName = name;
  }
  const starIcons = mainBody.querySelectorAll('[class*="icon-star"]');
  if (starIcons.length > 0) {
    cardItem.dataset.authorRating = String(starIcons.length);
  }
}

function getQuoteIconVal(layoutMap, bodyDivsByIndex) {
  const quoteVal = layoutMap.get('quoteVal');
  if (quoteVal !== undefined) return quoteVal;
  const quoteIdx = layoutMap.get('quoteIdx');
  if (quoteIdx === undefined) return '';
  const quoteDiv = bodyDivsByIndex.get(quoteIdx);
  return quoteDiv ? quoteDiv.textContent.trim().toLowerCase() : '';
}

function getReviewHtml(layoutMap, bodyDivsByIndex) {
  const reviewIdx = layoutMap.get('reviewIdx');
  if ((reviewIdx ?? null) === null) return '';
  const reviewDiv = bodyDivsByIndex.get(reviewIdx);
  return reviewDiv ? reviewDiv.innerHTML : '';
}

function getDetailsFromLayout(layoutMap, bodyDivsByIndex) {
  const quotedetailsIdx = layoutMap.get('quotedetailsIdx');
  if (quotedetailsIdx !== undefined) {
    const detailsBody = bodyDivsByIndex.get(quotedetailsIdx);
    const detailsParas = detailsBody ? [...detailsBody.querySelectorAll('p')] : [];
    return {
      personName: detailsParas[0]?.textContent ?? '',
      productName: (detailsParas[1]?.textContent ?? '') || DEFAULT_PRODUCT,
      ratingRaw: detailsParas[2]?.textContent?.trim() ?? '',
      dateText: detailsParas[3]?.textContent?.trim() ?? '',
    };
  }
  const personIdx = layoutMap.get('personIdx');
  const productIdx = layoutMap.get('productIdx');
  const ratingIdx = layoutMap.get('ratingIdx');
  const dateIdx = layoutMap.get('dateIdx');
  if (
    personIdx === undefined || productIdx === undefined
    || ratingIdx === undefined || dateIdx === undefined
  ) {
    return {
      personName: '', productName: DEFAULT_PRODUCT, ratingRaw: '', dateText: '',
    };
  }
  const personDiv = bodyDivsByIndex.get(personIdx);
  const productDiv = bodyDivsByIndex.get(productIdx);
  const ratingDiv = bodyDivsByIndex.get(ratingIdx);
  const dateDiv = bodyDivsByIndex.get(dateIdx);
  return {
    personName: personDiv ? personDiv.textContent : '',
    productName: (productDiv ? productDiv.textContent : '') || DEFAULT_PRODUCT,
    ratingRaw: ratingDiv ? ratingDiv.textContent.trim() : '',
    dateText: dateDiv ? dateDiv.textContent.trim() : '',
  };
}

function normalizeTestimonialCard(cardItem) {
  const bodyDivs = [...cardItem.querySelectorAll('.cards-card-body')];
  if (bodyDivs.length === 0) return;

  const bodyDivsByIndex = new Map(bodyDivs.map((el, i) => [i, el]));
  const mainBody = bodyDivsByIndex.get(0);
  const layout = STRUCTURED_LAYOUTS.find(
    (l) => bodyDivs.length === l.length && l.hasContent(bodyDivs),
  );

  if (!layout) {
    applyLegacyNormalization(cardItem, mainBody);
    return;
  }

  const layoutMap = new Map(Object.entries(layout));
  const quoteIconVal = getQuoteIconVal(layoutMap, bodyDivsByIndex);
  const reviewHtml = getReviewHtml(layoutMap, bodyDivsByIndex);
  const details = getDetailsFromLayout(layoutMap, bodyDivsByIndex);

  const quoteIcon = (quoteIconVal === 'inverted-commas') ? 'inverted-commas' : 'none';
  const ratingNum = parseInt(details.ratingRaw, 10);
  const authorRating = (Number.isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) ? 5 : ratingNum;
  const dateText = details.dateText.trim();
  const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(dateText)
    ? dateText : parseReviewDateToISO(details.dateText) || details.dateText;
  const formattedDate = formatDateForDisplay(isoDate) || details.dateText;

  const newBody = document.createElement('div');
  newBody.className = 'cards-card-body';
  if (quoteIcon === 'inverted-commas') newBody.appendChild(createQuoteIconElement());
  cardItem.setAttribute('data-quote-icon', quoteIcon);
  if (reviewHtml.trim()) {
    const reviewWrapper = document.createElement('div');
    reviewWrapper.innerHTML = (window.DOMPurify?.sanitize(reviewHtml, DOMPURIFY))
      ?? reviewHtml;
    newBody.append(...reviewWrapper.childNodes);
  }
  const pPerson = document.createElement('p');
  pPerson.className = 'testimonial-person-name';
  pPerson.textContent = details.personName;
  newBody.appendChild(pPerson);
  const pProduct = document.createElement('p');
  pProduct.className = 'testimonial-product-name';
  const u = document.createElement('u');
  u.textContent = details.productName;
  pProduct.appendChild(u);
  newBody.appendChild(pProduct);
  newBody.appendChild(createStarRatingElement(authorRating, formattedDate));
  cardItem.setAttribute('data-person-name', details.personName);
  cardItem.setAttribute('data-product-name', details.productName);
  cardItem.setAttribute('data-author-rating', String(authorRating));
  cardItem.setAttribute('data-review-date', isoDate);

  bodyDivs.forEach((div) => div.remove());
  const imageDiv = cardItem.querySelector('.cards-card-image');
  if (imageDiv) {
    cardItem.insertBefore(newBody, imageDiv.nextSibling);
  } else {
    cardItem.appendChild(newBody);
  }
}

function buildCardsFromRows(rows) {
  const cardsContainer = document.createElement('div');
  cardsContainer.classList.add('grid-cards');
  rows.forEach((row) => {
    const cardItem = document.createElement('div');
    cardItem.classList.add('cards-card');
    moveInstrumentation(row, cardItem);
    while (row.firstElementChild) cardItem.append(row.firstElementChild);
    const divsToRemove = [];
    [...cardItem.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'cards-card-image';
      } else if (div.children.length > 0 || div.textContent.trim().length > 0) {
        div.className = 'cards-card-body';
      } else {
        divsToRemove.push(div);
      }
    });
    divsToRemove.forEach((div) => div.remove());
    cardsContainer.append(cardItem);
  });
  return cardsContainer;
}

function optimizePicturesInContainer(cardsContainer) {
  cardsContainer.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    const optimizedImg = optimizedPic.querySelector('img');
    moveInstrumentation(img, optimizedImg);
    const { width, height } = img.dataset;
    if (width && height) {
      optimizedImg.dataset.width = width;
      optimizedImg.dataset.height = height;
    } else if (img.closest('.swiper-slide')) {
      optimizedImg.dataset.width = '232';
      optimizedImg.dataset.height = '358';
    }
    img.closest('picture').replaceWith(optimizedPic);
  });
}

function copyBlockPropertiesFromContext(block) {
  const section = block.closest('.section');
  const blockContent = block.closest('.block-content');
  [blockContent, section].filter(Boolean).forEach((el) => {
    const { dataset } = el;
    if (block.dataset.swipable === undefined && dataset.swipable !== undefined) {
      block.dataset.swipable = dataset.swipable;
    }
    if (block.dataset.autoplayEnabled === undefined && dataset.autoplayEnabled !== undefined) {
      block.dataset.autoplayEnabled = dataset.autoplayEnabled;
    }
    if (block.dataset.startingCard === undefined && dataset.startingCard !== undefined) {
      block.dataset.startingCard = dataset.startingCard;
    }
  });
}

function setImageDimensionsFromRects(block) {
  block.querySelectorAll('img').forEach((img) => {
    if (img.hasAttribute('width') && img.hasAttribute('height')) return;
    const rect = img.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      img.dataset.width = String(Math.round(rect.width));
      img.dataset.height = String(Math.round(rect.height));
    }
  });
}

function waitForSwiperLib() {
  return new Promise((resolve) => {
    if (typeof Swiper !== 'undefined') {
      resolve();
      return;
    }
    const checkInterval = setInterval(() => {
      if (typeof Swiper !== 'undefined') {
        clearInterval(checkInterval);
        resolve();
      }
    }, 10);
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 2000);
  });
}

function updateStarIconInSlide(slide, activeSlide) {
  const isActive = slide === activeSlide;
  const iconSrc = isActive ? '/icons/star-yellow.svg' : '/icons/star-white.svg';
  const iconName = isActive ? 'star-yellow' : 'star-white';
  const spanClass = isActive ? 'icon icon-star icon-star-yellow' : 'icon icon-star icon-star-white';
  slide.querySelectorAll('[class*="icon-star"]').forEach((span) => {
    const img = span.querySelector('img');
    if (!img?.getAttribute('src')?.includes('star')) return;
    span.className = spanClass;
    img.src = iconSrc;
    img.dataset.iconName = iconName;
  });
}

export default async function decorate(block) {
  block.classList.add('cards-testimonial', 'testimonial-card');

  const rows = [...block.children];
  const cardsContainer = buildCardsFromRows(rows);
  optimizePicturesInContainer(cardsContainer);

  block.replaceChildren(cardsContainer);
  extractBlockProperties(block, cardsContainer);
  copyBlockPropertiesFromContext(block);

  cardsContainer.querySelectorAll('.cards-card').forEach((cardItem) => normalizeTestimonialCard(cardItem));
  block.append(cardsContainer);

  const isSwipable = block.dataset.swipable === 'true';
  const isAutoplayEnabled = block.dataset.autoplayEnabled === 'true';
  const startingCard = parseInt(block.dataset.startingCard || '0', 10);

  if (!isSwipable) {
    window.requestAnimationFrame(() => setImageDimensionsFromRects(block));
    injectSchema(generateTestimonialSchema(block));
    return;
  }

  await loadCSS('/scripts/swiperjs/swiper-bundle.min.css');
  await loadScript('/scripts/swiperjs/swiper-bundle.min.js');
  await waitForSwiperLib();

  if (typeof Swiper === 'undefined') {
    injectSchema(generateTestimonialSchema(block));
    return;
  }

  block.classList.add('swiper');
  cardsContainer.classList.add('swiper-wrapper');
  cardsContainer.classList.remove('grid-cards');
  cardsContainer.querySelectorAll('.cards-card').forEach((cardItem) => cardItem.classList.add('swiper-slide'));

  const swiperPagination = document.createElement('div');
  swiperPagination.className = 'swiper-pagination';
  block.appendChild(swiperPagination);

  const isMobileView = window.innerWidth < 600;
  const initialSlideIndex = isMobileView ? 0 : startingCard;

  const swiperConfig = {
    loop: false,
    watchSlidesProgress: true,
    watchSlidesVisibility: true,
    slidesPerView: 1.3,
    spaceBetween: 0,
    centeredSlides: true,
    initialSlide: initialSlideIndex,
    pagination: {
      el: '.swiper-pagination',
      type: 'bullets',
      clickable: true,
      dynamicBullets: false,
    },
    breakpoints: {
      600: { slidesPerView: 1.5, spaceBetween: 0, centeredSlides: true },
      900: { slidesPerView: 3, spaceBetween: 16, centeredSlides: true },
    },
  };
  if (isAutoplayEnabled) {
    swiperConfig.autoplay = {
      delay: 3000,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    };
  }

  // eslint-disable-next-line no-undef
  const swiper = new Swiper(block, swiperConfig);
  block.swiperInstance = swiper;

  let updateScheduled = false;
  const updateStarIcons = () => {
    if (updateScheduled) return;
    updateScheduled = true;
    requestAnimationFrame(() => {
      updateScheduled = false;
      const slides = block.querySelectorAll('.swiper-slide');
      const activeSlide = block.querySelector('.swiper-slide-active');
      slides.forEach((slide) => updateStarIconInSlide(slide, activeSlide));
    });
  };
  updateStarIcons();
  swiper.on('slideChange', updateStarIcons);
  swiper.on('slideChangeTransitionEnd', updateStarIcons);

  injectSchema(generateTestimonialSchema(block));
}
