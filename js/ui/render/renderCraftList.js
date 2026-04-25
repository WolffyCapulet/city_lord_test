export function renderCraftList({
  crafts,
  getResourceLabel,
  isCraftHidden,
  isCraftUnlocked,
  onCraftClick,
  getCraftDuration = null,
  formatSeconds = null
}) {
  const root = document.getElementById("craftList");
  if (!root) return;

  const entries = Object.entries(crafts || {}).filter(([, def]) => !isCraftHidden(def));

  root.innerHTML = entries
    .map(([id, def]) => {
      const unlocked = isCraftUnlocked(def);

      const costText = Object.entries(def.costs || {})
        .map(([resId, amount]) => `${getResourceLabel(resId)} ${amount}`)
        .join("、");

      const yieldText = Object.entries(def.yields || {})
        .map(([resId, amount]) => `${getResourceLabel(resId)} ${amount}`)
        .join("、");

      const titleLines = [
        def.name,
        `體力：${def.stamina ?? 1}`,
        `材料：${costText || "無"}`,
        `產出：${yieldText || "無"}`
      ];

      if (typeof getCraftDuration === "function" && typeof formatSeconds === "function") {
        titleLines.push(`製作節奏：${formatSeconds(getCraftDuration(def, id))}`);
      }

      if (def.unlock) {
        titleLines.push(unlocked ? "已解鎖" : `需研究：${def.unlock}`);
      }

      return `
        <button
          type="button"
          data-craft="${id}"
          title="${titleLines.join("\n").replace(/"/g, "&quot;")}"
          ${unlocked ? "" : "disabled"}
        >
          ${def.name}
        </button>
      `;
    })
    .join("");

  root.querySelectorAll("[data-craft]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onCraftClick(btn.dataset.craft);
    });
  });
}
