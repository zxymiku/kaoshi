const BG_STORAGE_KEY = 'kaoshi_background';

function initBgPicker(config) {
  const switcher = document.getElementById('bg-switcher');
  const toggle = document.getElementById('bg-switcher-toggle');
  const popup = document.getElementById('bg-switcher-popup');
  const btnPrev = document.getElementById('bg-prev');
  const btnNext = document.getElementById('bg-next');
  const nameEl = document.getElementById('bg-name');
  const btnApply = document.getElementById('bg-apply');

  if (!switcher || !toggle || !popup || !config) return;

  const backgrounds = Array.isArray(config.backgrounds) ? config.backgrounds : [];
  if (backgrounds.length === 0) {
    toggle.style.display = 'none';
    return;
  }

  const items = backgrounds.map((url, index) => {
    return {
      url,
      label: parseBackgroundLabel(url, index)
    };
  });

  let currentIndex = 0;

  // Try to find the currently active background to set initial index
  const savedBg = localStorage.getItem(BG_STORAGE_KEY);
  if (savedBg) {
    const foundIdx = items.findIndex(item => item.url === savedBg);
    if (foundIdx !== -1) {
      currentIndex = foundIdx;
    }
  }

  function updateDisplay() {
    if (items.length === 0) return;
    // Add slide animation class
    nameEl.style.transform = 'translateY(10px)';
    nameEl.style.opacity = '0';
    
    setTimeout(() => {
      nameEl.textContent = items[currentIndex].label;
      nameEl.style.transform = 'translateY(0)';
      nameEl.style.opacity = '1';
    }, 150);
  }

  btnPrev.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + items.length) % items.length;
    updateDisplay();
  });

  btnNext.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % items.length;
    updateDisplay();
  });

  // Wheel scroll to change background
  const selectorEl = document.querySelector('.bg-selector');
  if (selectorEl) {
    selectorEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        currentIndex = (currentIndex + 1) % items.length;
        updateDisplay();
      } else if (e.deltaY < 0) {
        currentIndex = (currentIndex - 1 + items.length) % items.length;
        updateDisplay();
      }
    }, { passive: false });

    // Swipe to change background
    let touchStartY = 0;
    selectorEl.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    selectorEl.addEventListener('touchend', (e) => {
      const touchEndY = e.changedTouches[0].clientY;
      const diff = touchStartY - touchEndY;
      if (Math.abs(diff) > 30) {
        if (diff > 0) {
          // Swipe up = Next
          currentIndex = (currentIndex + 1) % items.length;
        } else {
          // Swipe down = Prev
          currentIndex = (currentIndex - 1 + items.length) % items.length;
        }
        updateDisplay();
      }
    }, { passive: true });
  }

  btnApply.addEventListener('click', () => {
    const url = items[currentIndex].url;
    applyBackgroundSelection(url, config);
    popup.classList.remove('open');
  });

  toggle.addEventListener('click', () => {
    const isOpen = popup.classList.contains('open');
    if (!isOpen) {
      updateDisplay();
    }
    popup.classList.toggle('open');
  });

  document.addEventListener('click', (event) => {
    if (!switcher.contains(event.target)) {
      popup.classList.remove('open');
    }
  });

  // Init text without animation
  if (items.length > 0) {
    nameEl.textContent = items[currentIndex].label;
  }
}

function parseBackgroundLabel(url, index) {
  const filename = url.split('/').pop() || '';
  const name = filename.replace(/\.[^/.]+$/, '');
  const digits = (name.match(/\d+/g) || []).join('');
  return digits || String(index + 1).padStart(2, '0');
}

function applyBackgroundSelection(url, config) {
  localStorage.setItem(BG_STORAGE_KEY, url);
  const bgEl = document.getElementById('bg-image');
  if (!bgEl) return;
  bgEl.style.backgroundImage = `url("${url}")`;
  const blur = config.backgroundBlur != null ? config.backgroundBlur : 0;
  bgEl.style.filter = blur > 0 ? `blur(${blur}px)` : '';
}
