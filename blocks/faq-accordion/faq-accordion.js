import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  block.id = 'faqs';

  const items = [...block.children].filter(
    (item) => item.querySelectorAll('div').length >= 2,
  );

  // Clear block and re-structure
  block.innerHTML = '';

  const visibleCount = 3;

  items.forEach((item, index) => {
    moveInstrumentation(item, item);
    item.classList.add('faq-accordion-item');

    const question = item.children[0];
    const answer = item.children[1];

    question.classList.add('faq-accordion-label');
    answer.classList.add('faq-accordion-body');

    // Hide content by default
    answer.style.maxHeight = '0px';
    answer.style.overflow = 'hidden';

    if (index < visibleCount) item.classList.add('visible');

    block.appendChild(item);
  });

  // Add toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'faq-accordion-toggle-btn';
  toggleBtn.textContent = 'More FAQs';
  block.appendChild(toggleBtn);

  let expanded = false;

  toggleBtn.addEventListener('click', () => {
    expanded = !expanded;
    items.forEach((item, i) => {
      const answer = item.querySelector('.faq-accordion-body');
      if (expanded || i < visibleCount) {
        item.classList.add('visible');
      } else {
        item.classList.remove('visible');
        item.classList.remove('open');
        answer.style.maxHeight = '0px';
      }
    });
    toggleBtn.textContent = expanded ? 'Less FAQs' : 'More FAQs';
  });

  // Accordion behavior: one open at a time
  items.forEach((item) => {
    const question = item.querySelector('.faq-accordion-label');
    const answer = item.querySelector('.faq-accordion-body');

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all open items
      items.forEach((el) => {
        el.classList.remove('open');
        const body = el.querySelector('.faq-accordion-body');
        body.style.maxHeight = '0px';
      });

      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = 'none'; // temporarily unset
        // const height = answer.scrollHeight + 'px';
        answer.style.maxHeight = '0'; // reset before transition
        // eslint-disable-next-line no-void
        void answer.offsetHeight; // force reflow
        answer.style.maxHeight = 'fit-content'; // animate to actual height
      }
    });
  });
}
