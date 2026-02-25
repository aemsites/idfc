import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Recursively animate steps in sequence
 * @param {Array<HTMLElement>} steps - Array of step li elements
 * @param {number} index - Current step index
 * @param {number} duration - Animation duration per phase in milliseconds
 */
function animateStepsSequence(steps, index, duration) {
  // Base case: all steps animated
  if (index >= steps.length) {
    return;
  }

  const currentStep = steps[index];
  const image = currentStep.querySelector('.steps-item-image');
  const body = currentStep.querySelector('.steps-item-body');
  const hasConnector = index < steps.length - 1; // Not the last step

  // 1. Fade in the image
  if (image) {
    image.classList.add('animating');
  }

  // Wait for image animation to complete
  setTimeout(() => {
    if (image) {
      image.classList.remove('animating');
      image.classList.add('visible');
    }

    // 2. Fade in the body text
    if (body) {
      body.classList.add('animating');
    }

    setTimeout(() => {
      if (body) {
        body.classList.remove('animating');
        body.classList.add('visible');
      }

      // 3. Animate the connector line if not the last step
      if (hasConnector) {
        currentStep.classList.add('connector-animating');

        setTimeout(() => {
          currentStep.classList.remove('connector-animating');
          currentStep.classList.add('connector-visible');

          // 4. Move to next step
          animateStepsSequence(steps, index + 1, duration);
        }, duration);
      }
    }, duration);
  }, duration);
}

/**
 * Animate steps sequentially using IntersectionObserver
 * @param {HTMLElement} block - The steps block element
 * @param {HTMLElement} ul - The UL element containing step items
 * @param {string} animationDuration - Total animation duration in seconds
 */
function initializeStepsAnimation(block, ul, animationDuration) {
  const steps = Array.from(ul.children);

  // Calculate total number of animation phases
  // Each step has: image (1) + body (1) + connector (1, except last step)
  // So total phases = (steps.length * 2) + (steps.length - 1) = steps.length * 3 - 1
  const totalPhases = steps.length * 3 - 1;

  // Calculate duration per phase
  const totalDuration = parseFloat(animationDuration) * 1000 || 3000; // Convert to milliseconds
  const duration = totalDuration / totalPhases;

  // Set CSS custom property for animation duration (per phase, in seconds)
  const durationInSeconds = duration / 1000;
  block.style.setProperty('--animation-duration', `${durationInSeconds}s`);

  /**
   * Start the animation sequence
   */
  function startAnimation() {
    setTimeout(() => {
      animateStepsSequence(steps, 0, duration);
    }, 1000);
  }

  // Check if block is already in viewport (for elements visible on page load)
  const rect = block.getBoundingClientRect();
  const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;

  if (isInViewport) {
    // Element is already visible, start animation immediately
    startAnimation();
  } else {
    // Use IntersectionObserver to detect when block scrolls into view
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startAnimation();
            // Unobserve after animation starts (only animate once)
            observer.unobserve(block);
          }
        });
      },
      {
        threshold: 0.2, // Trigger when 20% of the block is visible
      },
    );

    observer.observe(block);
  }
}

/**
 * Parse block-level metadata from the first rows (single-cell rows from "steps" model).
 * @param {HTMLDivElement[]} rows - Block children (table rows)
 * @returns {{ metadataRowCount: number, title: string, subtitle: string,
 *   componentId: string, animation: string, animationDuration: string }}
 */
function parseStepsMetadata(rows) {
  let metadataRowCount = 0;
  let title = '';
  let subtitle = '';
  let componentId = '';
  let animation = '';
  let animationDuration = '';

  if (rows.length > 0 && rows[0].children.length === 1) {
    title = rows[0].children[0]?.textContent?.trim() || '';
    metadataRowCount = 1;
  }
  if (rows.length > 1 && rows[1].children.length === 1) {
    subtitle = rows[1].children[0]?.textContent?.trim() || '';
    metadataRowCount = 2;
  }
  if (rows.length > 2 && rows[2].children.length === 1) {
    componentId = rows[2].children[0]?.textContent?.trim() || '';
    metadataRowCount = 3;
  }
  if (rows.length > 3 && rows[3].children.length === 1) {
    animation = rows[3].children[0]?.textContent?.trim() || '';
    metadataRowCount = 4;
  }
  if (rows.length > 4 && rows[4].children.length === 1) {
    animationDuration = rows[4].children[0]?.textContent?.trim() || '';
    metadataRowCount = 5;
  }

  return {
    metadataRowCount, title, subtitle, componentId, animation, animationDuration,
  };
}

export default function decorate(block) {
  const rows = Array.from(block.children);
  const {
    metadataRowCount, title, subtitle, componentId, animation, animationDuration,
  } = parseStepsMetadata(rows);

  // Check if block already has 'animated' class (set by 'classes' field in model)
  const hasAnimatedClass = block.classList.contains('animated');

  // Store config as data attributes on the block for CSS/JS use
  if (componentId) block.dataset.componentId = componentId;
  if (animation) {
    block.dataset.animation = animation;
  }
  if (animationDuration) block.dataset.animationDuration = animationDuration;

  // Determine if animation should be enabled (either from metadata or class)
  const shouldAnimate = animation === 'animated' || hasAnimatedClass;

  // Build UL structure - only process rows that are actual step items
  // Skip the metadata rows and process only the item rows (which have multiple cells)
  const ul = document.createElement('ul');
  rows.slice(metadataRowCount).forEach((row) => {
    // Skip empty rows
    if (row.children.length === 0) {
      return;
    }

    // Process actual step item rows
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'steps-item-image';
      } else {
        div.className = 'steps-item-body';
      }
    });
    ul.append(li);
  });

  // Append UL to block
  block.textContent = '';
  if (title) {
    const titleEl = document.createElement('h2');
    titleEl.className = 'steps-title';
    titleEl.textContent = title;
    block.append(titleEl);
  }
  if (subtitle) {
    const subtitleEl = document.createElement('h3');
    subtitleEl.className = 'steps-subtitle';
    subtitleEl.textContent = subtitle;
    block.append(subtitleEl);
  }
  ul.classList.add('grid-steps');
  block.append(ul);

  // Initialize animation if enabled (check both metadata field and class)
  if (shouldAnimate) {
    initializeStepsAnimation(block, ul, animationDuration);
  }
}
