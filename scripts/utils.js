function expToNext(level) {
  return Math.round(5 + 2.5 * level * (level - 1));
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roll(chance) {
  return Math.random() < chance;
}

function nowTime() {
  const d = new Date();
  return `[${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}]`;
}
