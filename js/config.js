const DEFAULT_CONFIG_URL = './example.json';

const STORAGE_KEYS = {
  config: 'kaoshi_config',
  background: 'kaoshi_background',
  theme: 'kaoshi_theme'
};

async function loadConfig() {
  let config = null;

  const params = new URLSearchParams(window.location.search);
  const configUrl = params.get('config');

  if (configUrl) {
    config = await fetchJson(configUrl);
  }

  if (!config) {
    const stored = localStorage.getItem(STORAGE_KEYS.config);
    if (stored) {
      try {
        config = JSON.parse(stored);
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

  const bgOverride = localStorage.getItem(STORAGE_KEYS.background);
  if (bgOverride) {
    config.background = bgOverride;
  }

  const themeOverride = localStorage.getItem(STORAGE_KEYS.theme);
  if (themeOverride) {
    config._themeOverride = themeOverride;
  }

  return config;
}

async function fetchJson(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (e) {
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

function applyBackground(config) {
  if (config && config.background) {
    document.body.style.backgroundImage = `url("${config.background}")`;
  }
}
