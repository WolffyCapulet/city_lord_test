export function renderLog({ state }) {
  const root = document.getElementById("log");
  if (!root) return;

  let rows = state.logs || [];

  if (state.logFilter !== "all") {
    rows = rows.filter((item) => (item.type || "important") === state.logFilter);
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
            ${time ? `<span class="small muted">${time}</span> ` : ""}
            ${text}
          </div>
        `;
      })
      .join("");
  }

  document.getElementById("logAllBtn")?.classList.toggle("active", state.logFilter === "all");
  document.getElementById("logImportantBtn")?.classList.toggle("active", state.logFilter === "important");
  document.getElementById("logLootBtn")?.classList.toggle("active", state.logFilter === "loot");
  document.getElementById("logWorkerBtn")?.classList.toggle("active", state.logFilter === "worker");
}
