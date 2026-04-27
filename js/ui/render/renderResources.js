function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toInt(value) {
  return Math.floor(Number(value || 0));
}

function canClickResource(id, isResourceClickable, onResourceClick) {
  if (typeof onResourceClick !== "function") return false;
  if (typeof isResourceClickable === "function") return !!isResourceClickable(id);
  return true;
}

function getBadgeText({ edibleValue, fuelValue }) {
  if (typeof edibleValue === "number" && typeof fuelValue === "number") {
    return "可食用 / 可燃燒";
  }
  if (typeof edibleValue === "number") {
    return "可食用";
  }
  if (typeof fuelValue === "number") {
    return "可燃燒";
  }
  return "";
}

export function renderResources({
  state,
  getResourceLabel = (id) => id,
  edibleValues = {},
  fuelDurations = {},
  isResourceClickable = null,
  getResourceHint = null,
  onResourceClick = null
}) {
  const root = document.getElementById("resources");
  if (!root) return;

  const resources = Object.entries(state.resources || {})
    .filter(([, value]) => Number(value || 0) > 0)
    .sort((a, b) =>
      getResourceLabel(a[0]).localeCompare(getResourceLabel(b[0]), "zh-Hant")
    );

  const totalKinds = resources.length;
  const totalAmount = resources.reduce((sum, [, value]) => sum + Number(value || 0), 0);

  if (resources.length === 0) {
    root.innerHTML = `
      <div class="small muted" style="margin-bottom:8px;">
        物資種類：0｜總數量：0
      </div>
      <div class="small muted">目前沒有資源。</div>
    `;
    const toggleBtn = document.getElementById("toggleResourcesBtn");
    if (toggleBtn) {
      toggleBtn.textContent = "收合全部";
      toggleBtn.onclick = null;
      toggleBtn.disabled = true;
    }
    return;
  }

  root.innerHTML = `
    <div class="small muted" style="margin-bottom:8px;">
      物資種類：${totalKinds}｜總數量：${Math.floor(totalAmount)}
    </div>

    <div class="resource-list">
      ${resources
        .map(([id, value]) => {
          const label = getResourceLabel(id);
          const edibleValue = edibleValues[id];
          const fuelValue = fuelDurations[id];
          const clickable = canClickResource(id, isResourceClickable, onResourceClick);

          const meta = [`${label}：${toInt(value)}`];

          if (typeof edibleValue === "number") {
            meta.push(`可食用：${edibleValue >= 0 ? "+" : ""}${edibleValue} 體力`);
          }

          if (typeof fuelValue === "number") {
            meta.push(`可燃燒：增加篝火 ${fuelValue} 秒`);
          }

          if (typeof getResourceHint === "function") {
            const hint = getResourceHint(id);
            if (hint) meta.push(hint);
          }

          return `
            <div
              class="resource-item ${clickable ? "clickable" : ""}"
              ${clickable ? `data-resource-id="${escapeHtml(id)}"` : ""}
              title="${escapeHtml(meta.join("\n"))}"
            >
              <div class="resource-name">${escapeHtml(label)}</div>
              <div class="resource-value"><strong>${toInt(value)}</strong></div>
              <div class="meta">${escapeHtml(
                getBadgeText({ edibleValue, fuelValue })
              )}</div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  root.querySelectorAll("[data-resource-id]").forEach((item) => {
    item.addEventListener("click", () => {
      onResourceClick?.(item.dataset.resourceId);
    });
  });

  const toggleBtn = document.getElementById("toggleResourcesBtn");
  if (toggleBtn) {
    toggleBtn.textContent = "收合全部";
    toggleBtn.disabled = true;
    toggleBtn.onclick = null;
  }
}
