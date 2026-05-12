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
  if (el) el.textContent = `${h}:${m}:${s}`;
}