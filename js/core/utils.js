export function $(id) {
  return document.getElementById(id);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function firstEl(...ids) {
  for (const id of ids) {
    const el = $(id);
    if (el) return el;
  }
  return null;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function roll(chance) {
  return Math.random() < chance;
}

export function nowTime() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `[${hh}:${mm}:${ss}]`;
}

export function formatSeconds(seconds) {
  return `${Math.max(0, seconds).toFixed(1)} 秒`;
}
