function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderLog({ state }) {
  const root = document.getElementById("log");
  if (!root) return;

  const activeFilter = state.logFilter || state.ui?.logFilter || "all";
  let rows = state.logs || [];

  if (activeFilter !== "all") {
    rows = rows.filter((item) => (item.type || "important") === activeFilter);
  }

  if (rows.length === 0) {
    root.innerHTML = `<div class="log-item">目前還沒有事件紀錄</div>`;
  } else {
    root.innerHTML = rows
      .map((item) => {
        const text = typeof item === "string" ? item : item.text;
        const time = typeof item === "string" ? "" : item.time || "";

        return `
          <div class="log-item">
            ${time ? `<span class="small muted">${escapeHtml(time)}</span> ` : ""}
            ${escapeHtml(text)}
          </div>
        `;
      })
      .join("");
  }

  document.getElementById("logAllBtn")?.classList.toggle("active", activeFilter === "all");
  document.getElementById("logImportantBtn")?.classList.toggle("active", activeFilter === "important");
  document.getElementById("logLootBtn")?.classList.toggle("active", activeFilter === "loot");
  document.getElementById("logWorkerBtn")?.classList.toggle("active", activeFilter === "worker");
}
