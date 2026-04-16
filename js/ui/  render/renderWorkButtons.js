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
      const cost = getWorkCost(def);
      const duration = getWorkDuration(def);

      return `
        <button data-work="${id}" type="button">
          ${def.name}（-${cost} 體力 / ${formatSeconds(duration)}）
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
