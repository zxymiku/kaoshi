function initClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

function getNow() {
  return Date.now();
}

function pad(num) {
  return num < 10 ? '0' + num : num;
}

function updateClock() {
  const now = new Date(getNow());
  const h = pad(now.getHours());
  const m = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  const el = document.getElementById('current-time');
  if (el) {
    el.innerHTML = `${h}<span class="clock-colon">:</span>${m}<span class="clock-colon">:</span>${s}`;
  }

  // Update date display
  const dateEl = document.getElementById('current-date');
  if (dateEl) {
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[now.getDay()];
    dateEl.textContent = `${year}年${month}月${day}日 ${weekday}`;
  }
}