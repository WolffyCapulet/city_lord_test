import { resourceGroupDefs, getResourceGroupKey } from "../../data/dataResources.js";

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

function getBadgeText(edibleValue, fuelValue) {
  if (typeof edibleValue === "number" && typeof fuelValue === "number") return "可食用 / 可燃燒";
  if (typeof edibleValue === "number") return "可食用";
  if (typeof fuelValue === "number") return "可燃燒";
  return "";
}

function ensureResourceSections(state) {
  if (!state.ui) state.ui = {};
  if (!state.ui.openSections) state.ui.openSections = {};
  if (!state.ui.openSections.resources) state.ui.openSections.resources = {};

  resourceGroupDefs.forEach(({ key }) => {
    if (typeof state.ui.openSections.resources[key] !== "boolean") {
      state.ui.openSections.resources[key] = true; // default open
    }
  });
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

  ensureResourceSections(state);

  // Build grouped map
  const groups = {};
  resourceGroupDefs.forEach(({ key }) => { groups[key] = []; });

  Object.entries(state.resources || {}).forEach(([id, value]) => {
    if (Number(value || 0) <= 0) return;
    const key = getResourceGroupKey(id);
    if (!groups[key]) groups[key] = [];
    groups[key].push([id, value]);
  });

  // Sort each group by label
  Object.values(groups).forEach((arr) => {
    arr.sort((a, b) => getResourceLabel(a[0]).localeCompare(getResourceLabel(b[0]), "zh-Hant"));
  });

  const totalKinds = Object.values(groups).reduce((s, arr) => s + arr.length, 0);
  const totalAmount = Object.values(groups).reduce((s, arr) =>
    s + arr.reduce((ss, [, v]) => ss + Number(v || 0), 0), 0);

  if (totalKinds === 0) {
    root.innerHTML = `
      <div class="small muted" style="margin-bottom:8px;">物資種類：0｜總數量：0</div>
      <div class="small muted">目前沒有資源。</div>
    `;
    return;
  }

  const sectionsHtml = resourceGroupDefs.map(({ key, title }) => {
    const items = groups[key];
    if (!items || items.length === 0) return "";

    const isOpen = !!state.ui.openSections.resources[key];

    const itemsHtml = items.map(([id, value]) => {
      const label = getResourceLabel(id);
      const edibleValue = edibleValues[id];
      const fuelValue = fuelDurations[id];
      const clickable = typeof onResourceClick === "function" &&
        (typeof isResourceClickable !== "function" || !!isResourceClickable(id));

      const lines = [`${label}：${toInt(value)}`];
      if (typeof edibleValue === "number") lines.push(`可食用：${edibleValue >= 0 ? "+" : ""}${edibleValue} 體力`);
      if (typeof fuelValue === "number") lines.push(`可燃燒：篝火 +${fuelValue} 秒`);
      if (typeof getResourceHint === "function") {
        const hint = getResourceHint(id);
        if (hint) lines.push(hint);
      }

      const badge = getBadgeText(edibleValue, fuelValue);

      return `
        <div
          class="resource-item${clickable ? " clickable" : ""}"
          ${clickable ? `data-resource-id="${escapeHtml(id)}"` : ""}
          title="${escapeHtml(lines.join("\n"))}"
        >
          <div class="resource-name">${escapeHtml(label)}</div>
          <div class="resource-value"><strong>${toInt(value)}</strong></div>
          ${badge ? `<div class="meta">${escapeHtml(badge)}</div>` : ""}
        </div>
      `;
    }).join("");

    return `
      <div class="resource-group">
        <button
          type="button"
          class="resource-summary"
          data-resource-toggle="${escapeHtml(key)}"
          aria-expanded="${isOpen}"
        >
          <span>${escapeHtml(title)} (${items.length})</span>
          <span class="resource-arrow">${isOpen ? "▼" : "▶"}</span>
        </button>
        <div class="resource-body${isOpen ? "" : " closed"}">
          <div class="resource-list">${itemsHtml}</div>
        </div>
      </div>
    `;
  }).join("");

  root.innerHTML = `
    <div class="small muted" style="margin-bottom:8px;">
      物資種類：${totalKinds}｜總數量：${Math.floor(totalAmount)}
    </div>
    ${sectionsHtml}
  `;

  // Toggle group open/close
  root.querySelectorAll("[data-resource-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.resourceToggle;
      const isOpen = state.ui.openSections.resources[key];
      state.ui.openSections.resources[key] = !isOpen;

      const body = btn.nextElementSibling;
      if (body) body.classList.toggle("closed", isOpen);
      btn.setAttribute("aria-expanded", String(!isOpen));
      const arrow = btn.querySelector(".resource-arrow");
      if (arrow) arrow.textContent = isOpen ? "▶" : "▼";
    });
  });

  // Resource click handlers
  root.querySelectorAll("[data-resource-id]").forEach((el) => {
    el.addEventListener("click", () => {
      onResourceClick?.(el.dataset.resourceId);
    });
  });

  // Toggle all button
  const toggleBtn = document.getElementById("toggleResourcesBtn");
  if (toggleBtn) {
    toggleBtn.disabled = false;
    toggleBtn.textContent = "收合全部";
    toggleBtn.onclick = () => {
      const anyOpen = resourceGroupDefs.some(({ key }) =>
        groups[key]?.length > 0 && state.ui.openSections.resources[key]
      );
      const newState = !anyOpen;
      resourceGroupDefs.forEach(({ key }) => {
        if (groups[key]?.length > 0) state.ui.openSections.resources[key] = newState;
      });
      toggleBtn.textContent = newState ? "收合全部" : "展開全部";
      renderResources({ state, getResourceLabel, edibleValues, fuelDurations, isResourceClickable, getResourceHint, onResourceClick });
    };
  }
}
