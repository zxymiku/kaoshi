let timeOffset = 0;

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
  const el = document.getElementById('current-time');
  if (el) el.textContent = `${h}:${m}:${s}`;
}
