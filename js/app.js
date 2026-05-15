document.addEventListener('DOMContentLoaded', async () => {
  initClock();

  const initialConfig = await loadConfig();

  if (!initialConfig) {
    showError('无法加载配置', '请检查网络连接或通过 /setting 页面配置本地 JSON');
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
    return;
  }

  renderExams(initialConfig.exams, initialConfig);
  setInterval(() => updateTimers(), 1000);
  updateTimers();

  // 每5分钟自动重新加载配置，但仅更新考试科目状态，不更改背景图片
  setInterval(async () => {
    const newConfig = await loadConfig();
    if (newConfig && newConfig.exams) {
      renderExams(newConfig.exams, initialConfig);
      updateTimers();
    }
  }, 5 * 60 * 1000);
});
