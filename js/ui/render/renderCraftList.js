function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function makeTooltipLines({
  def,
  craftId,
  getResourceLabel,
  getCraftDuration,
  formatSeconds,
  isUnlocked
}) {
  const costText = Object.entries(def.costs || {})
    .map(([resId, amount]) => `${getResourceLabel(resId)} ${amount}`)
    .join("、");

  const yieldText = Object.entries(def.yields || {})
    .map(([resId, amount]) => `${getResourceLabel(resId)} ${amount}`)
    .join("、");

  const lines = [
    def.name,
    `體力：${def.stamina ?? 1}`,
    `材料：${costText || "無"}`,
    `產出：${yieldText || "無"}`
  ];

  if (typeof getCraftDuration === "function" && typeof formatSeconds === "function") {
    lines.push(`製作節奏：${formatSeconds(getCraftDuration(def, craftId))}`);
  }

  if (def.unlock) {
    lines.push(isUnlocked ? "已解鎖" : `需研究：${def.unlock}`);
  }

  return lines.join("\n");
}

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
    .map(([craftId, def]) => {
      const unlocked = isCraftUnlocked(def);
      const tooltip = makeTooltipLines({
        def,
        craftId,
        getResourceLabel,
        getCraftDuration,
        formatSeconds,
        isUnlocked: unlocked
      });

      return `
        <button
          type="button"
          data-craft="${escapeHtml(craftId)}"
          title="${escapeHtml(tooltip)}"
          ${unlocked ? "" : "disabled"}
        >
          ${escapeHtml(def.name)}
        </button>
      `;
    })
    .join("");

  root.querySelectorAll("[data-craft]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onCraftClick?.(btn.dataset.craft);
    });
  });
}
