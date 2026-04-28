const CHARACTER_LIMIT = 249;

export default function decorate(block) {
  block.id = 'overview';
  const heading = block.querySelector('h2');
  const paragraphs = block.querySelectorAll('p');

  // Apply class to heading and first paragraph
  if (heading) heading.classList.add('overview-title');
  if (paragraphs[0]) paragraphs[0].classList.add('overview-para');

  // Single paragraph: truncate after CHARACTER_LIMIT chars with inline Read more / Read less
  if (paragraphs.length === 1 && paragraphs[0]) {
    const p = paragraphs[0];
    const fullText = p.textContent.trim();
    if (fullText.length > CHARACTER_LIMIT) {
      const truncatedText = fullText.slice(0, CHARACTER_LIMIT);
      p.textContent = '';

      const textSpan = document.createElement('span');
      textSpan.className = 'overview-paraText';

      const ellipsisSpan = document.createElement('span');
      ellipsisSpan.className = 'overview-ellipsis';
      ellipsisSpan.textContent = '... ';

      const readMoreBtn = document.createElement('span');
      readMoreBtn.className = 'overview-readMore';
      readMoreBtn.setAttribute('role', 'button');
      readMoreBtn.tabIndex = 0;
      readMoreBtn.textContent = 'Read more';

      let expanded = false;
      const sync = () => {
        textSpan.textContent = expanded ? fullText : truncatedText;
        ellipsisSpan.hidden = expanded;
        readMoreBtn.textContent = expanded ? 'Read less' : 'Read more';
        p.classList.toggle('overview-para--expanded', expanded);
      };

      const toggle = () => {
        expanded = !expanded;
        sync();
      };

      readMoreBtn.addEventListener('click', toggle);
      readMoreBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });

      p.append(textSpan, ellipsisSpan, readMoreBtn);
      sync();
    }
  } else if (paragraphs.length > 1) {
    // Create the hidden container
    const hiddenWrapper = document.createElement('div');
    hiddenWrapper.classList.add('overview-hiddenPara');
    hiddenWrapper.style.display = 'none';

    // Move all paragraphs after the first into the hidden wrapper
    paragraphs.forEach((p, i) => {
      if (i > 0) hiddenWrapper.appendChild(p);
    });

    // Add hidden wrapper after the first paragraph
    paragraphs[0].insertAdjacentElement('afterend', hiddenWrapper);

    // Create the Read More button
    const readMoreBtn = document.createElement('p');
    readMoreBtn.className = 'overview-readMore';
    readMoreBtn.textContent = 'Read more';
    readMoreBtn.addEventListener('click', () => {
      const expanded = hiddenWrapper.style.display === 'none';
      hiddenWrapper.style.display = expanded ? 'block' : 'none';
      readMoreBtn.textContent = expanded ? 'Read less' : 'Read more';
    });

    // Insert the button after the hidden content
    hiddenWrapper.insertAdjacentElement('afterend', readMoreBtn);
  }
}
