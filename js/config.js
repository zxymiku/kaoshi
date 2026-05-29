const DEFAULT_CONFIG_URL = 'https://s.zxymiku.top/config/kaoshi';

const STORAGE_KEYS = {
  config: 'kaoshi_config',
  configTime: 'kaoshi_config_time',
  background: 'kaoshi_background',
  theme: 'kaoshi_theme'
};

const CONFIG_EXPIRE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

async function loadConfig() {
  let config = null;

  const params = new URLSearchParams(window.location.search);
  const configUrl = params.get('config');

  if (configUrl) {
    config = await fetchJson(configUrl);
  }

  if (!config) {
    const stored = localStorage.getItem(STORAGE_KEYS.config);
    const storedTime = localStorage.getItem(STORAGE_KEYS.configTime);
    
    if (stored && storedTime) {
      const timeDiff = Date.now() - parseInt(storedTime, 10);
      if (timeDiff > CONFIG_EXPIRE_MS) {
        console.log('Local config expired (3 days). Dropping and fetching default.');
        localStorage.removeItem(STORAGE_KEYS.config);
        localStorage.removeItem(STORAGE_KEYS.configTime);
      } else {
        try {
          config = JSON.parse(stored);
        } catch (e) {
          console.warn('Invalid localStorage config:', e);
        }
      }
    } else if (stored && !storedTime) {
      // Legacy config without timestamp, clear it to be safe or migrate it. Let's just use it and set time to now.
      try {
        config = JSON.parse(stored);
        localStorage.setItem(STORAGE_KEYS.configTime, Date.now().toString());
      } catch (e) {
        console.warn('Invalid localStorage config:', e);
      }
    }
  }

  if (!config) {
    config = await fetchJson(DEFAULT_CONFIG_URL);
  }

  if (!config) {
    return null;
  }

  if (localStorage.getItem(STORAGE_KEYS.background)) {
    localStorage.removeItem(STORAGE_KEYS.background);
  }

  const themeOverride = localStorage.getItem(STORAGE_KEYS.theme);
  if (themeOverride) {
    config._themeOverride = themeOverride;
  }

  return config;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (e) {
    clearTimeout(timeoutId);
    console.error('Failed to fetch config:', url, e);
    return null;
  }
}

function applyTheme(config) {
  let theme = 'light';

  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    theme = 'dark';
  }

  if (config && config.theme) {
    theme = config.theme;
  }

  if (config && config._themeOverride) {
    theme = config._themeOverride;
  }

  document.documentElement.setAttribute('data-theme', theme);
}

function getRandomBackgroundUrl(config, excludeUrl) {
  if (!config || !Array.isArray(config.backgrounds) || config.backgrounds.length === 0) {
    return '';
  }

  const list = config.backgrounds.filter(url => url && url !== excludeUrl);
  const candidates = list.length > 0 ? list : config.backgrounds;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function applyBackground(config, overrideUrl) {
  if (!config) return;

  let bgUrl = '';

  const bgOverride = sessionStorage.getItem(STORAGE_KEYS.background);
  if (overrideUrl) {
    bgUrl = overrideUrl;
  } else if (bgOverride) {
    bgUrl = bgOverride;
  } else if (config.backgrounds && config.backgrounds.length > 0) {
    let sessionBg = sessionStorage.getItem('kaoshi_session_bg');
    if (!sessionBg || !config.backgrounds.includes(sessionBg)) {
      sessionBg = getRandomBackgroundUrl(config);
      sessionStorage.setItem('kaoshi_session_bg', sessionBg);
    }
    bgUrl = sessionBg;
  } else if (config.background) {
    bgUrl = config.background;
  }

  if (!bgUrl) return;

  const bgEl = document.getElementById('bg-image');
  if (bgEl) {
    bgEl.style.backgroundImage = `url("${bgUrl}")`;
    const blur = config.backgroundBlur != null ? config.backgroundBlur : 0;
    if (blur > 0) {
      bgEl.style.filter = `blur(${blur}px)`;
    } else {
      bgEl.style.filter = '';
    }
  }
}
