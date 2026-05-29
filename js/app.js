document.addEventListener('DOMContentLoaded', async () => {
  initClock();

  const initialConfig = await loadConfig();

  if (!initialConfig) {
    showError('无法加载配置', '请检查网络连接或通过 /setting 页面配置本地 JSON');
    document.body.classList.add('loaded');
    return;
  }

  applyTheme(initialConfig);
  applyBackground(initialConfig);

  if (initialConfig.title) {
    document.title = initialConfig.title;
    document.getElementById('page-title').textContent = initialConfig.title;
  }

  if (!initialConfig.exams || initialConfig.exams.length === 0) {
    showError('暂无考试信息', '请在 JSON 配置中添加考试数据');
    document.body.classList.add('loaded');
    return;
  }

  renderExams(initialConfig.exams, initialConfig);
  initBgPicker(initialConfig);

  // Trigger entrance animations
  requestAnimationFrame(() => {
    document.body.classList.add('loaded');
  });

  setInterval(() => {
    updateTimers();
    if (initialConfig.exams) {
      checkBackgroundGap(initialConfig.exams, initialConfig);
    }
  }, 1000);
  updateTimers();

  // 每5分钟重新渲染考试信息（使用已加载的 config），无需重新下载 JSON
  setInterval(() => {
    renderExams(initialConfig.exams, initialConfig);
    updateTimers();
  }, 5 * 60 * 1000);
});
