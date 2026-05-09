document.addEventListener('DOMContentLoaded', async () => {
  initClock();

  const config = await loadConfig();

  if (!config) {
    showError('无法加载配置', '请检查网络连接或通过 /setting 页面配置本地 JSON');
    return;
  }

  applyTheme(config);
  applyBackground(config);

  if (config.title) {
    document.title = config.title;
    document.getElementById('page-title').textContent = config.title;
  }

  if (!config.exams || config.exams.length === 0) {
    showError('暂无考试信息', '请在 JSON 配置中添加考试数据');
    return;
  }

  renderExams(config.exams);
  setInterval(() => updateTimers(), 1000);
  updateTimers();
});
