let timeOffset = 0;

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

async function initClock() {
  try {
    const resp = await fetch('https://worldtimeapi.org/api/timezone/Asia/Shanghai');
    if (resp.ok) {
      const data = await resp.json();
      const serverTime = new Date(data.datetime).getTime();
      timeOffset = serverTime - Date.now();
    }
  } catch (e) {
    timeOffset = 0;
  }
  updateClock();
  setInterval(updateClock, 1000);
}

function getNow() {
  return Date.now() + timeOffset;
}

function updateClock() {
  const now = new Date(getNow());
  const h = pad(now.getHours());
  const m = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  const el = document.getElementById('current-time') || document.getElementById('clock-time');
  if (el) el.textContent = `${h}:${m}:${s}`;
}

function showError(title, message) {
  const container = document.getElementById('exam-container');
  container.innerHTML = `<div class="error-message"><h2>${title}</h2><p>${message}</p></div>`;
}

function renderExams(exams) {
  const container = document.getElementById('exam-container');
  container.innerHTML = '';

  const nearest = findNearestExam(exams);
  if (!nearest) {
    showError('暂无即将进行的考试', '所有考试均已结束');
    return;
  }

  const card = document.createElement('div');
  card.className = 'exam-card';

  const header = document.createElement('div');
  header.className = 'exam-header';
  header.innerHTML = `
    <h2 class="exam-name">${esc(nearest.name)}</h2>
    <span class="badge exam-badge" data-exam></span>
  `;

  const list = document.createElement('div');
  list.className = 'subject-list';

  nearest.subjects.forEach(subject => {
    const row = createSubjectRow(subject);
    if (row) list.appendChild(row);
  });

  card.appendChild(header);
  card.appendChild(list);
  container.appendChild(card);
}

function findNearestExam(exams) {
  const now = getNow();
  let best = null;
  let bestDistance = Infinity;

  for (const exam of exams) {
    let examStart = Infinity;
    let hasActive = false;
    let allDone = true;

    for (const subject of exam.subjects) {
      const occ = resolveNextOccurrence(subject);
      if (!occ) continue;
      allDone = false;
      const startMs = occ.start.getTime();
      const endMs = occ.end.getTime();
      if (now >= startMs && now <= endMs) hasActive = true;
      if (startMs < examStart) examStart = startMs;
    }

    if (hasActive) return exam;
    if (allDone) continue;

    const distance = examStart - now;
    if (distance >= 0 && distance < bestDistance) {
      bestDistance = distance;
      best = exam;
    }
  }

  return best;
}

function createSubjectRow(subject) {
  const occurrence = resolveNextOccurrence(subject);
  if (!occurrence) return null;

  const row = document.createElement('div');
  row.className = 'subject-row';
  row.dataset.start = occurrence.start.getTime();
  row.dataset.end = occurrence.end.getTime();

  const dateStr = formatDate(occurrence.start);
  const timeStr = `${formatTime(occurrence.start)} - ${formatTime(occurrence.end)}`;

  row.innerHTML = `
    <div class="subject-name">${esc(subject.name)}</div>
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
    }
  });

  updateExamBadges();
}

function updateExamBadges() {
  const cards = document.querySelectorAll('.exam-card');
  cards.forEach(card => {
    const badge = card.querySelector('.exam-badge');
    const rows = card.querySelectorAll('.subject-row');
    let hasActive = false;
    let allDone = true;
    const now = getNow();

    rows.forEach(row => {
      const start = parseInt(row.dataset.start);
      const end = parseInt(row.dataset.end);
      if (now >= start && now <= end) hasActive = true;
      if (now < end) allDone = false;
    });

    if (hasActive) {
      badge.textContent = '进行中';
      badge.className = 'badge exam-badge badge-active';
    } else if (allDone && rows.length > 0) {
      badge.textContent = '已结束';
      badge.className = 'badge exam-badge badge-done';
    } else {
      badge.textContent = '未开始';
      badge.className = 'badge exam-badge badge-waiting';
    }
  });
}

function resolveNextOccurrence(subject) {
  const now = new Date();

  if (subject.type === 'fixed') {
    const start = parseDateTime(subject.date, subject.startTime);
    const end = parseDateTime(subject.date, subject.endTime);
    return { start, end };
  }

  if (subject.type === 'weekly') {
    return resolveWeekly(subject, now);
  }

  if (subject.type === 'recurring') {
    return resolveRecurring(subject, now);
  }

  return null;
}

function resolveWeekly(subject, now) {
  const target = findNextWeekday(now, subject.dayOfWeek, subject.startTime, subject.endTime);

  if (subject.validUntil && target.start > new Date(subject.validUntil + 'T23:59:59')) {
    return null;
  }
  if (subject.validFrom && target.end < new Date(subject.validFrom + 'T00:00:00')) {
    return findNextWeekdayAfter(new Date(subject.validFrom), subject.dayOfWeek, subject.startTime, subject.endTime);
  }

  return target;
}

function findNextWeekday(now, dayOfWeek, startTime, endTime) {
  const today = now.getDay();
  let daysAhead = dayOfWeek - today;

  if (daysAhead < 0) daysAhead += 7;

  const candidateDate = new Date(now);
  candidateDate.setDate(candidateDate.getDate() + daysAhead);

  const end = setTime(candidateDate, endTime);

  if (daysAhead === 0 && now > end) {
    candidateDate.setDate(candidateDate.getDate() + 7);
  }

  const start = setTime(candidateDate, startTime);
  const endFinal = setTime(candidateDate, endTime);
  return { start, end: endFinal };
}

function findNextWeekdayAfter(afterDate, dayOfWeek, startTime, endTime) {
  const d = new Date(afterDate);
  while (d.getDay() !== dayOfWeek) {
    d.setDate(d.getDate() + 1);
  }
  return { start: setTime(d, startTime), end: setTime(d, endTime) };
}

function resolveRecurring(subject, now) {
  const startDate = new Date(subject.startDate + 'T00:00:00');
  const endDate = new Date(subject.endDate + 'T23:59:59');
  const intervalDays = getIntervalDays(subject.interval);

  let cursor = new Date(startDate);
  while (cursor.getDay() !== subject.dayOfWeek) {
    cursor.setDate(cursor.getDate() + 1);
  }

  let best = null;
  while (cursor <= endDate) {
    const occEnd = setTime(cursor, subject.endTime);
    if (occEnd >= now) {
      best = { start: setTime(new Date(cursor), subject.startTime), end: occEnd };
      break;
    }
    cursor.setDate(cursor.getDate() + intervalDays);
  }

  return best;
}

function getIntervalDays(interval) {
  switch (interval) {
    case 'daily': return 1;
    case 'weekly': return 7;
    case 'biweekly': return 14;
    case 'monthly': return 30;
    default: return 7;
  }
}

function parseDateTime(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

function setTime(date, timeStr) {
  const d = new Date(date);
  const [h, m] = timeStr.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  if (days > 0) {
    return `${days}天 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function formatDate(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${m}月${d}日 ${weekdays[date.getDay()]}`;
}

function formatTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(n) {
  return n.toString().padStart(2, '0');
}

function esc(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}
