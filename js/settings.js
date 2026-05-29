document.addEventListener('DOMContentLoaded', async () => {
  const jsonTextarea = document.getElementById('config-json');
  const fileInput = document.getElementById('config-file');
  const saveConfigBtn = document.getElementById('save-config');
  const loadRemoteBtn = document.getElementById('load-remote-config');
  const clearConfigBtn = document.getElementById('clear-config');
  
  const bgUrlInput = document.getElementById('bg-url');
  const saveBgBtn = document.getElementById('save-bg');
  const clearBgBtn = document.getElementById('clear-bg');
  
  const themeRadios = document.querySelectorAll('input[name="theme"]');
  const toast = document.getElementById('toast');

  let currentConfigObj = {};

  // Tabs logic
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.target).classList.add('active');
      
      // If switching to visual, parse json and render
      if (btn.dataset.target === 'tab-visual') {
        try {
          currentConfigObj = JSON.parse(jsonTextarea.value);
          renderVisualEditor(currentConfigObj);
        } catch(e) {
          showToast('JSON 格式错误，无法生成可视化界面');
        }
      }
      // If switching to json, serialize visual and set text
      if (btn.dataset.target === 'tab-json') {
        currentConfigObj = serializeVisualEditor(currentConfigObj);
        jsonTextarea.value = JSON.stringify(currentConfigObj, null, 2);
      }
    });
  });

  let currentToastTimeout;
  function showToast(msg) {
    if (currentToastTimeout) clearTimeout(currentToastTimeout);
    toast.textContent = msg;
    toast.classList.add('show');
    currentToastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // Load configuration
  async function reloadConfig(forceRemote = false) {
    jsonTextarea.value = "加载中...";
    try {
      let configObj;
      if (forceRemote) {
        configObj = await fetchJson(DEFAULT_CONFIG_URL);
      } else {
        configObj = await loadConfig();
      }
      
      if (configObj) {
        const displayObj = { ...configObj };
        delete displayObj._themeOverride;
        currentConfigObj = displayObj;
        jsonTextarea.value = JSON.stringify(displayObj, null, 2);
        renderVisualEditor(displayObj);
      } else {
        jsonTextarea.value = "加载配置失败。";
      }
    } catch (e) {
      jsonTextarea.value = "加载配置错误：" + e.message;
    }
  }

  await reloadConfig();

  // --- Visual Editor Logic ---
  function renderVisualEditor(config) {
    const titleInput = document.getElementById('ve-title');
    const container = document.getElementById('ve-exams-container');
    titleInput.value = config.title || '';
    container.innerHTML = '';
    
    if (config.exams && Array.isArray(config.exams)) {
      config.exams.forEach((exam, eIndex) => {
        const examDiv = document.createElement('div');
        examDiv.className = 'editor-exam';
        examDiv.innerHTML = `
          <div class="editor-exam-header">
            <input type="text" class="form-control exam-name-input" value="${exam.name || ''}" placeholder="考试类型名称 (例如：模拟考试)" style="width: auto; flex: 1; font-weight: bold;">
            <button class="btn btn-danger btn-remove-exam" style="margin-left: 10px; padding: 6px 12px; font-size: 0.8rem;">删除此类型</button>
          </div>
          <div class="subjects-container"></div>
          <button class="btn btn-secondary btn-add-subject" style="margin-top: 10px; font-size: 0.85rem; padding: 6px 12px;">+ 添加科目</button>
        `;
        
        const subjContainer = examDiv.querySelector('.subjects-container');
        if (exam.subjects && Array.isArray(exam.subjects)) {
          exam.subjects.forEach((subj, sIndex) => {
            const subjDiv = renderSubjectForm(subj);
            subjContainer.appendChild(subjDiv);
          });
        }
        
        examDiv.querySelector('.btn-add-subject').addEventListener('click', () => {
          subjContainer.appendChild(renderSubjectForm({ name: '', startTime: '', endTime: '' }));
        });
        examDiv.querySelector('.btn-remove-exam').addEventListener('click', () => {
          examDiv.remove();
        });
        
        container.appendChild(examDiv);
      });
    }
  }

  function padTime(timeStr) {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    return timeStr;
  }

  function renderSubjectForm(subj) {
    const div = document.createElement('div');
    div.className = 'editor-subject';
    div.innerHTML = `
      <div><label>科目名称</label><input type="text" class="form-control subj-name" value="${subj.name || ''}"></div>
      <div><label>类型</label><select class="form-control subj-type">
        <option value="weekly" ${subj.type === 'weekly' ? 'selected' : ''}>每周</option>
        <option value="fixed" ${subj.type === 'fixed' ? 'selected' : ''}>特定日期</option>
      </select></div>
      <div><label>星期/日期</label><input type="text" class="form-control subj-day" value="${subj.dayOfWeek !== undefined ? subj.dayOfWeek : (subj.date || '')}" placeholder="0=周日, YYYY-MM-DD"></div>
      <div><label>开始时间</label><input type="time" class="form-control subj-start" value="${padTime(subj.startTime)}"></div>
      <div><label>结束时间</label><input type="time" class="form-control subj-end" value="${padTime(subj.endTime)}"></div>
      <div style="display:flex; align-items:flex-end;"><button class="btn btn-danger btn-remove-subj" style="padding: 10px 14px;">X</button></div>
    `;
    div.querySelector('.btn-remove-subj').addEventListener('click', () => div.remove());
    return div;
  }

  function serializeVisualEditor(baseConfig) {
    const newConfig = { ...baseConfig };
    newConfig.title = document.getElementById('ve-title').value;
    newConfig.exams = [];
    
    document.querySelectorAll('.editor-exam').forEach(examDiv => {
      const examName = examDiv.querySelector('.exam-name-input').value;
      const exam = { name: examName, subjects: [] };
      
      examDiv.querySelectorAll('.editor-subject').forEach(subjDiv => {
        const type = subjDiv.querySelector('.subj-type').value;
        const dayVal = subjDiv.querySelector('.subj-day').value;
        const subj = {
          name: subjDiv.querySelector('.subj-name').value,
          type: type,
          startTime: subjDiv.querySelector('.subj-start').value,
          endTime: subjDiv.querySelector('.subj-end').value
        };
        
        if (type === 'weekly') {
          subj.dayOfWeek = parseInt(dayVal) || 0;
        } else {
          subj.date = dayVal;
        }
        
        exam.subjects.push(subj);
      });
      newConfig.exams.push(exam);
    });
    return newConfig;
  }

  document.getElementById('ve-add-exam').addEventListener('click', () => {
    const container = document.getElementById('ve-exams-container');
    const examDiv = document.createElement('div');
    examDiv.className = 'editor-exam';
    examDiv.innerHTML = `
      <div class="editor-exam-header">
        <input type="text" class="form-control exam-name-input" value="新考试类型" style="width: auto; flex: 1; font-weight: bold;">
        <button class="btn btn-danger btn-remove-exam" style="margin-left: 10px; padding: 6px 12px; font-size: 0.8rem;">删除</button>
      </div>
      <div class="subjects-container"></div>
      <button class="btn btn-secondary btn-add-subject" style="margin-top: 10px; font-size: 0.85rem; padding: 6px 12px;">+ 添加科目</button>
    `;
    examDiv.querySelector('.btn-add-subject').addEventListener('click', () => {
      examDiv.querySelector('.subjects-container').appendChild(renderSubjectForm({ name: '', startTime: '', endTime: '' }));
    });
    examDiv.querySelector('.btn-remove-exam').addEventListener('click', () => {
      examDiv.remove();
    });
    container.appendChild(examDiv);
  });

  // --- End Visual Editor Logic ---

  // Background setting
  const savedBg = sessionStorage.getItem(STORAGE_KEYS.background);
  if (savedBg) bgUrlInput.value = savedBg;

  // Theme setting
  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || '';
  themeRadios.forEach(r => {
    if (r.value === savedTheme) {
      r.checked = true;
    }
    r.addEventListener('change', () => {
      if (r.checked) {
        if (r.value) {
          localStorage.setItem(STORAGE_KEYS.theme, r.value);
        } else {
          localStorage.removeItem(STORAGE_KEYS.theme);
        }
        applyTheme({ _themeOverride: r.value });
        showToast('主题设置已应用');
      }
    });
  });

  // Config Actions
  saveConfigBtn.addEventListener('click', () => {
    try {
      let finalConfig;
      if (document.getElementById('tab-visual').classList.contains('active')) {
        finalConfig = serializeVisualEditor(currentConfigObj);
        jsonTextarea.value = JSON.stringify(finalConfig, null, 2);
      } else {
        const val = jsonTextarea.value.trim();
        if (!val) throw new Error('配置不能为空');
        finalConfig = JSON.parse(val);
      }
      
      localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(finalConfig));
      localStorage.setItem(STORAGE_KEYS.configTime, Date.now().toString());
      showToast('配置已保存到本地并应用');
    } catch (e) {
      showToast('JSON 格式错误：' + e.message);
    }
  });

  loadRemoteBtn.addEventListener('click', async () => {
    await reloadConfig(true);
    showToast('已加载远程默认配置，若要应用请点击保存');
  });

  clearConfigBtn.addEventListener('click', () => {
    if (confirm('确定要清除本地配置，恢复默认设置吗？')) {
      localStorage.removeItem(STORAGE_KEYS.config);
      localStorage.removeItem(STORAGE_KEYS.configTime);
      reloadConfig();
      showToast('本地配置已清除');
    }
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const obj = JSON.parse(evt.target.result);
        jsonTextarea.value = JSON.stringify(obj, null, 2);
        currentConfigObj = obj;
        if (document.getElementById('tab-visual').classList.contains('active')) {
          renderVisualEditor(obj);
        }
        showToast('文件已加载，请点击保存应用配置');
      } catch (err) {
        showToast('文件格式错误');
      }
    };
    reader.readAsText(file);
    fileInput.value = '';
  });

  // Background Actions
  saveBgBtn.addEventListener('click', () => {
    const val = bgUrlInput.value.trim();
    if (val) {
      sessionStorage.setItem(STORAGE_KEYS.background, val);
      showToast('自定义背景已保存（仅本次访问生效）');
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.background);
      showToast('已清除背景设置');
    }
  });

  clearBgBtn.addEventListener('click', () => {
    sessionStorage.removeItem(STORAGE_KEYS.background);
    bgUrlInput.value = '';
    showToast('已清除自定义背景');
  });
});
