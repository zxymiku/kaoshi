const STORAGE_KEYS = {
  config: 'kaoshi_config',
  background: 'kaoshi_background',
  theme: 'kaoshi_theme'
};

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadCurrentSettings();
  bindEvents();
});

function initTheme() {
  const theme = localStorage.getItem(STORAGE_KEYS.theme);
  if (theme) {
    document.documentElement.setAttribute('data-theme', theme);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

function loadCurrentSettings() {
  const config = localStorage.getItem(STORAGE_KEYS.config);
  if (config) {
    document.getElementById('config-json').value = config;
  }

  const bg = localStorage.getItem(STORAGE_KEYS.background);
  if (bg) {
    document.getElementById('bg-url').value = bg;
  }

  const theme = localStorage.getItem(STORAGE_KEYS.theme) || '';
  const radio = document.querySelector(`input[name="theme"][value="${theme}"]`);
  if (radio) radio.checked = true;
}

function bindEvents() {
  document.getElementById('save-config').addEventListener('click', saveConfig);
  document.getElementById('clear-config').addEventListener('click', clearConfig);
  document.getElementById('save-bg').addEventListener('click', saveBg);
  document.getElementById('clear-bg').addEventListener('click', clearBg);
  document.getElementById('preview-btn').addEventListener('click', () => {
    window.open('../', '_blank');
  });
  document.getElementById('config-file').addEventListener('change', loadFile);

  document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val) {
        localStorage.setItem(STORAGE_KEYS.theme, val);
        document.documentElement.setAttribute('data-theme', val);
      } else {
        localStorage.removeItem(STORAGE_KEYS.theme);
        const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', sys);
      }
      showToast('主题已更新');
    });
  });
}

function saveConfig() {
  const text = document.getElementById('config-json').value.trim();
  if (!text) {
    showToast('请输入 JSON 内容', true);
    return;
  }
  try {
    JSON.parse(text);
  } catch (e) {
    showToast('JSON 格式错误: ' + e.message, true);
    return;
  }
  localStorage.setItem(STORAGE_KEYS.config, text);
  showToast('配置已保存');
}

function clearConfig() {
  localStorage.removeItem(STORAGE_KEYS.config);
  document.getElementById('config-json').value = '';
  showToast('本地配置已清除');
}

function saveBg() {
  const url = document.getElementById('bg-url').value.trim();
  if (url) {
    localStorage.setItem(STORAGE_KEYS.background, url);
    showToast('背景图已保存');
  }
}

function clearBg() {
  localStorage.removeItem(STORAGE_KEYS.background);
  document.getElementById('bg-url').value = '';
  showToast('背景图已清除');
}

function loadFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const text = ev.target.result;
    try {
      JSON.parse(text);
      document.getElementById('config-json').value = text;
      showToast('文件已加载，点击保存以应用');
    } catch (err) {
      showToast('文件内容不是有效的 JSON', true);
    }
  };
  reader.readAsText(file);
}

function showToast(msg, isError) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.style.background = isError ? '#ef4444' : 'var(--status-active)';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}
