let lastBackgroundGapKey = null;
let lastBackgroundGapUrl = null;

// SVG icons for badge states
const BADGE_ICONS = {
  waiting: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  active: '<span class="badge-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:currentColor;"></span>',
  done: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
};

function renderExams(exams, config) {
  const container = document.getElementById('exam-container');
  container.innerHTML = '';

  const subjects = collectNearestSubjects(exams);
  if (subjects.length === 0) {
    showError('暂无即将进行的考试', '所有考试均已结束或距离下一场超过8小时');
    return;
  }

  checkBackgroundGap(exams, config);

  const card = document.createElement('div');
  card.className = 'exam-card';

  const list = document.createElement('div');
  list.className = 'subject-list';

  subjects.forEach((item, idx) => {
    const row = createSubjectRowFromOccurrence(item.name, item.start, item.end, idx === 0);
    // Stagger animation
    row.classList.add('animate-stagger');
    row.style.setProperty('--stagger-index', idx);
    list.appendChild(row);
  });

  card.appendChild(list);
  container.appendChild(card);
}

function collectNearestSubjects(exams) {
  const now = getNow();
  const MAX_GAP = 8 * 3600 * 1000;
  const GROUP_GAP = 1 * 3600 * 1000;
  const RECENT_END_BUFFER = 60 * 1000;

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

  allSubjects = allSubjects.filter(s => s.end > now - RECENT_END_BUFFER);
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

function findCurrentGapInterval(exams, now) {
  for (const exam of exams) {
    const occurrences = [];
    for (const subject of exam.subjects) {
      const next = resolveNextOccurrence(subject);
      if (next) {
        occurrences.push({
          name: subject.name,
          start: next.start.getTime(),
          end: next.end.getTime()
        });
      }
      const previous = resolvePreviousOccurrence(subject);
      if (previous) {
        occurrences.push({
          name: subject.name,
          start: previous.start.getTime(),
          end: previous.end.getTime()
        });
      }
    }

    occurrences.sort((a, b) => a.start - b.start);
    for (let i = 0; i < occurrences.length - 1; i++) {
      const current = occurrences[i];
      const next = occurrences[i + 1];
      const gap = next.start - current.end;
      if (current.name !== next.name && now > current.end && now < next.start && gap >= 10 * 60 * 1000) {
        return {
          examName: exam.name,
          currentEnd: current.end,
          nextStart: next.start
        };
      }
    }
  }
  return null;
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
      <span class="progress-percent"></span>
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
    const percentEl = row.querySelector('.progress-percent');

    if (now < start) {
      const diff = start - now;
      countdownEl.innerHTML = `<span class="countdown-label">距开始</span>${formatCountdown(diff)}`;
      badgeEl.innerHTML = BADGE_ICONS.waiting + ' 未开始';
      badgeEl.className = 'badge badge-waiting';
      fillEl.style.width = '0%';
      fillEl.classList.remove('progress-fill--running');
      barEl.setAttribute('aria-valuenow', '0');
      if (percentEl) {
        percentEl.classList.remove('visible');
        percentEl.textContent = '';
      }
      row.classList.remove('subject-ended');
    } else if (now >= start && now <= end) {
      const diff = end - now;
      const progress = ((now - start) / (end - start)) * 100;
      countdownEl.innerHTML = `<span class="countdown-label">距结束</span>${formatCountdown(diff)}`;
      badgeEl.innerHTML = BADGE_ICONS.active + ' 进行中';
      badgeEl.className = 'badge badge-active';
      fillEl.classList.add('progress-fill--running');
      fillEl.style.width = `${progress.toFixed(1)}%`;
      barEl.setAttribute('aria-valuenow', Math.round(progress).toString());
      if (percentEl) {
        percentEl.classList.add('visible');
        percentEl.textContent = `${progress.toFixed(1)}%`;
      }
      row.classList.remove('subject-ended');
    } else if (now > end && now <= end + 60 * 1000) {
      countdownEl.innerHTML = `<span class="countdown-label">已结束</span>--:--:--`;
      badgeEl.innerHTML = BADGE_ICONS.done + ' 已结束';
      badgeEl.className = 'badge badge-done';
      fillEl.classList.remove('progress-fill--running');
      fillEl.style.width = '100%';
      barEl.setAttribute('aria-valuenow', '100');
      if (percentEl) {
        percentEl.classList.remove('visible');
        percentEl.textContent = '';
      }
      row.classList.add('subject-ended');
      row.style.display = '';
    } else {
      countdownEl.innerHTML = `<span class="countdown-label">已结束</span>--:--:--`;
      badgeEl.innerHTML = BADGE_ICONS.done + ' 已结束';
      badgeEl.className = 'badge badge-done';
      fillEl.classList.remove('progress-fill--running');
      fillEl.style.width = '100%';
      barEl.setAttribute('aria-valuenow', '100');
      if (percentEl) {
        percentEl.classList.remove('visible');
        percentEl.textContent = '';
      }
      row.classList.add('subject-ended');
      row.style.display = 'none'; // 隐藏已结束超过1分钟的考试信息
    }
  });
}

function showError(title, message) {
  const container = document.getElementById('exam-container');
  container.innerHTML = `<div class="error-message"><h2>${title}</h2><p>${message}</p></div>`;
}

function checkBackgroundGap(exams, config) {
  const now = getNow();
  const gapInfo = findCurrentGapInterval(exams, now);
  const manualOverride = sessionStorage.getItem(STORAGE_KEYS.background);

  if (gapInfo && !manualOverride) {
    const gapKey = `${gapInfo.examName}|${gapInfo.currentEnd}|${gapInfo.nextStart}`;
    if (gapKey !== lastBackgroundGapKey) {
      lastBackgroundGapKey = gapKey;
      lastBackgroundGapUrl = getRandomBackgroundUrl(config, lastBackgroundGapUrl);
      applyBackground(config, lastBackgroundGapUrl);
    }
  } else {
    if (lastBackgroundGapKey !== null) {
      lastBackgroundGapKey = null;
      lastBackgroundGapUrl = null;
      applyBackground(config);
    }
  }
}
