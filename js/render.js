function renderExams(exams, config) {
  const container = document.getElementById('exam-container');
  container.innerHTML = '';

  const subjects = collectNearestSubjects(exams);
  if (subjects.length === 0) {
    showError('暂无即将进行的考试', '所有考试均已结束或距离下一场超过8小时');
    return;
  }

  // 检查是否应该更换背景：当前时间在两个属于同一考试的科目之间，且间隔 >= 10分钟
  const now = getNow();
  let shouldChangeBackground = false;

  for (let i = 0; i < subjects.length - 1; i++) {
    const current = subjects[i];
    const next = subjects[i + 1];
    const gap = next.start - current.end;

    // 检查：
    // 1. 当前时间在两个科目之间
    // 2. 两个科目属于同一考试
    // 3. 间隔 >= 10分钟
    if (now > current.end && now < next.start && 
        current.examName === next.examName && 
        gap >= 10 * 60 * 1000) {
      shouldChangeBackground = true;
      break;
    }
  }

  if (shouldChangeBackground) {
    applyBackground(config);
  }

  const card = document.createElement('div');
  card.className = 'exam-card';

  const list = document.createElement('div');
  list.className = 'subject-list';

  subjects.forEach((item, idx) => {
    const row = createSubjectRowFromOccurrence(item.name, item.start, item.end, idx === 0);
    list.appendChild(row);
  });

  card.appendChild(list);
  container.appendChild(card);
}

function collectNearestSubjects(exams) {
  const now = getNow();
  const MAX_GAP = 8 * 3600 * 1000;
  const GROUP_GAP = 1 * 3600 * 1000;

  let allSubjects = [];
  for (const exam of exams) {
    for (const subject of exam.subjects) {
      const occ = resolveNextOccurrence(subject);
      if (!occ) continue;
      allSubjects.push({
        name: subject.name,
        start: occ.start.getTime(),
        end: occ.end.getTime(),
        examName: exam.name
      });
    }
  }

  allSubjects = allSubjects.filter(s => s.end > now);
  allSubjects.sort((a, b) => a.start - b.start);

  if (allSubjects.length === 0) return [];

  const first = allSubjects[0];
  if (first.start - now > MAX_GAP) return [];

  const result = [first];
  for (let i = 1; i < allSubjects.length; i++) {
    const gap = allSubjects[i].start - result[result.length - 1].end;
    if (gap <= GROUP_GAP) {
      result.push(allSubjects[i]);
    } else {
      break;
    }
  }

  return result;
}

function createSubjectRowFromOccurrence(name, startMs, endMs, isPrimary) {
  const row = document.createElement('div');
  row.className = 'subject-row' + (isPrimary ? ' subject-primary' : '');
  row.dataset.start = startMs;
  row.dataset.end = endMs;

  const startDate = new Date(startMs);
  const endDate = new Date(endMs);
  const dateStr = formatDate(startDate);
  const timeStr = `${formatTime(startDate)} - ${formatTime(endDate)}`;

  row.innerHTML = `
    <div class="subject-name">${esc(name)}</div>
    <div class="subject-time">${dateStr} ${timeStr}</div>
    <div class="subject-countdown"></div>
    <div class="subject-status"><span class="badge"></span></div>
    <div class="subject-progress">
      <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div class="progress-fill"></div>
      </div>
    </div>
  `;

  return row;
}

function updateTimers() {
  const now = getNow();
  const rows = document.querySelectorAll('.subject-row');

  rows.forEach(row => {
    const start = parseInt(row.dataset.start);
    const end = parseInt(row.dataset.end);
    const countdownEl = row.querySelector('.subject-countdown');
    const badgeEl = row.querySelector('.subject-status .badge');
    const fillEl = row.querySelector('.progress-fill');
    const barEl = row.querySelector('.progress-bar');

    if (now < start) {
      const diff = start - now;
      countdownEl.innerHTML = `<span class="countdown-label">距开始</span>${formatCountdown(diff)}`;
      badgeEl.textContent = '未开始';
      badgeEl.className = 'badge badge-waiting';
      fillEl.style.width = '0%';
      barEl.setAttribute('aria-valuenow', '0');
    } else if (now >= start && now <= end) {
      const diff = end - now;
      const progress = ((now - start) / (end - start)) * 100;
      countdownEl.innerHTML = `<span class="countdown-label">距结束</span>${formatCountdown(diff)}`;
      badgeEl.textContent = '进行中';
      badgeEl.className = 'badge badge-active';
      fillEl.style.width = `${progress.toFixed(1)}%`;
      barEl.setAttribute('aria-valuenow', Math.round(progress).toString());
    } else {
      countdownEl.innerHTML = `<span class="countdown-label">已结束</span>--:--:--`;
      badgeEl.textContent = '已结束';
      badgeEl.className = 'badge badge-done';
      fillEl.style.width = '100%';
      barEl.setAttribute('aria-valuenow', '100');
      row.style.display = 'none'; // 隐藏已结束的考试信息
    }
  });
}

function showError(title, message) {
  const container = document.getElementById('exam-container');
  container.innerHTML = `<div class="error-message"><h2>${title}</h2><p>${message}</p></div>`;
}
