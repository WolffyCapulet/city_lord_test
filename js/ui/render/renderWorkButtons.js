function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderWorkButtons({
  workDefs,
  getWorkCost,
  getWorkDuration,
  formatSeconds,
  onWorkClick
}) {
  const root = document.getElementById("workButtons");
  if (!root) return;

  root.innerHTML = Object.entries(workDefs)
    .map(([id, def]) => {
      const cost = Number(getWorkCost(def) || 0);
      const duration = Number(getWorkDuration(def) || 0);

      const title = [
        def.name,
        `體力：${cost}`,
        `生產節奏：${formatSeconds(duration)}`
      ].join("\n");

      return `
        <button
          data-work="${escapeHtml(id)}"
          type="button"
          title="${escapeHtml(title)}"
        >
          ${escapeHtml(def.name)}
        </button>
      `;
    })
    .join("");

  root.querySelectorAll("[data-work]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onWorkClick(btn.dataset.work);
    });
  });
}
