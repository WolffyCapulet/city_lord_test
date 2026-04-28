import {
  getResourceGroupKey,
  getResourceLabel as defaultGetResourceLabel,
  resourceGroupDefs,
  resourceUiText,
  fuelDurations as defaultFuelDurations
} from "../../data/resources.js";

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

function ensureResourceOpenState(state, groups) {
  if (!state.ui) state.ui = {};
  if (!state.ui.openSections) state.ui.openSections = {};
  if (!state.ui.openSections.resources) state.ui.openSections.resources = {};

  groups.forEach((group) => {
    if (typeof state.ui.openSections.resources[group.key] !== "boolean") {
      state.ui.openSections.resources[group.key] = true;
    }
  });
}

function buildGroups(resources, getResourceLabel) {
  const groups = resourceGroupDefs.map((def) => ({ ...def, items: [] }));

  Object.entries(resources || {})
    .filter(([, value]) => Number(value || 0) > 0)
    .sort((a, b) =>
      getResourceLabel(a[0]).localeCompare(getResourceLabel(b[0]), "zh-Hant")
    )
    .forEach(([id, value]) => {
      const key = getResourceGroupKey(id);
      const group = groups.find((g) => g.key === key);
      if (group) {
        group.items.push({ id, value: toInt(value) });
      }
    });

  return groups.filter((group) => group.items.length > 0);
}

function canClickResource(id, isResourceClickable, onResourceClick) {
  if (typeof onResourceClick !== "function") return false;
  if (typeof isResourceClickable === "function") return !!isResourceClickable(id);
  return true;
}

function getBadgeText({ edibleValue, fuelValue }) {
  if (typeof edibleValue === "number" && typeof fuelValue === "number") {
    return resourceUiText.edibleFuel;
  }
  if (typeof edibleValue === "number") {
    return resourceUiText.edible;
  }
  if (typeof fuelValue === "number") {
    return resourceUiText.fuel;
  }
  return resourceUiText.empty;
}

export function renderResources({
  state,
  getResourceLabel = defaultGetResourceLabel,
  edibleValues = {},
  fuelDurations = defaultFuelDurations,
  isResourceClickable = null,
  getResourceHint = null,
  onResourceClick = null
}) {
  const root = document.getElementById("resources");
  if (!root) return;

  const resources = state.resources || {};
  const totalKinds = Object.keys(resources).filter(
    (key) => Number(resources[key] || 0) > 0
  ).length;
  const totalAmount = Object.values(resources).reduce(
    (sum, n) => sum + Number(n || 0),
    0
  );

  const groups = buildGroups(resources, getResourceLabel);
  ensureResourceOpenState(state, groups);

  const allOpen =
    groups.length > 0 &&
    groups.every((group) => state.ui?.openSections?.resources?.[group.key]);

  root.innerHTML = `
    <div class="small muted" style="margin-bottom:8px;">
      物資種類：${totalKinds}｜總數量：${Math.floor(totalAmount)}
    </div>

    ${groups
      .map((group) => {
        const isOpen = !!state.ui.openSections.resources[group.key];

        return `
          <section class="resource-group">
            <button
              type="button"
              class="resource-summary"
              data-toggle-resource-group="${escapeHtml(group.key)}"
              aria-expanded="${isOpen ? "true" : "false"}"
            >
              <span>${escapeHtml(group.title)}（${group.items.length}）</span>
              <span class="resource-arrow">${isOpen ? "▼" : "▶"}</span>
            </button>

            <div class="resource-body ${isOpen ? "" : "closed"}">
              ${
                isOpen
                  ? `
                    <div class="resource-list">
                      ${group.items
                        .map(({ id, value }) => {
                          const label = getResourceLabel(id);
                          const edibleValue = edibleValues[id];
                          const fuelValue = fuelDurations[id];
                          const clickable = canClickResource(
                            id,
                            isResourceClickable,
                            onResourceClick
                          );

                          const meta = [`${label}：${value}`];

                          if (typeof edibleValue === "number") {
                            meta.push(
                              `${resourceUiText.edible}：${
                                edibleValue >= 0 ? "+" : ""
                              }${edibleValue} 體力`
                            );
                          }

                          if (typeof fuelValue === "number") {
                            meta.push(`${resourceUiText.fuel}：可增加篝火 ${fuelValue} 秒`);
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
                              <div class="resource-value"><strong>${value}</strong></div>
                              <div class="meta">${escapeHtml(
                                getBadgeText({ edibleValue, fuelValue })
                              )}</div>
                            </div>
                          `;
                        })
                        .join("")}
                    </div>
                  `
                  : ""
              }
            </div>
          </section>
        `;
      })
      .join("")}
  `;

  root.querySelectorAll("[data-toggle-resource-group]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.toggleResourceGroup;
      state.ui.openSections.resources[key] = !state.ui.openSections.resources[key];

      renderResources({
        state,
        getResourceLabel,
        edibleValues,
        fuelDurations,
        isResourceClickable,
        getResourceHint,
        onResourceClick
      });
    });
  });

  root.querySelectorAll("[data-resource-id]").forEach((item) => {
    item.addEventListener("click", () => {
      onResourceClick?.(item.dataset.resourceId);
    });
  });

  const toggleBtn = document.getElementById("toggleResourcesBtn");
  if (toggleBtn) {
    toggleBtn.textContent = allOpen ? "收合全部" : "展開全部";
    toggleBtn.onclick = () => {
      const nextOpen = !allOpen;
      groups.forEach((group) => {
        state.ui.openSections.resources[group.key] = nextOpen;
      });

      renderResources({
        state,
        getResourceLabel,
        edibleValues,
        fuelDurations,
        isResourceClickable,
        getResourceHint,
        onResourceClick
      });
    };
  }
}
