export function renderResources({
  state,
  getResourceLabel,
  edibleValues
}) {
  const root = document.getElementById("resources");
  if (!root) return;

  const totalKinds = Object.keys(state.resources || {}).length;
  const totalAmount = Object.values(state.resources || {}).reduce(
    (sum, n) => sum + Number(n || 0),
    0
  );

  root.innerHTML = `
    <div class="small muted" style="margin-bottom:8px;">
      物資種類：${totalKinds}｜總數量：${Math.floor(totalAmount)}
    </div>

    <div class="resource-list">
      ${Object.entries(state.resources || {})
        .sort((a, b) => getResourceLabel(a[0]).localeCompare(getResourceLabel(b[0]), "zh-Hant"))
        .map(([id, value]) => {
          const edible =
            typeof edibleValues[id] === "number"
              ? `<div class="small muted">
                   可食用：${edibleValues[id] >= 0 ? "+" : ""}${edibleValues[id]} 體力
                 </div>`
              : "";

          return `
            <div class="resource-item">
              <div class="resource-name">${getResourceLabel(id)}</div>
              <div class="resource-value">${Math.floor(value)}</div>
              ${edible}
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}
