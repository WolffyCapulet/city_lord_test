function escapeHtml(v) {
  return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function getQueuedId(item)    { return typeof item === "string" ? item : item?.id; }
function getQueuedCount(item) {
  if (typeof item === "string") return 1;
  if (item?.infinite || Number(item?.count) < 0) return -1;
  return Math.max(1, Math.floor(Number(item?.count || 1)));
}

// Track whether delegation listeners are already attached
const _bound = new WeakSet();

export function renderActionLane({
  state, workDefs, formatSeconds,
  onRemoveQueuedAction = null,
  onMoveQueuedAction   = null
}) {
  const queueEl = document.getElementById("productionQueue");
  if (!queueEl) return;

  const items = Array.isArray(state.actionQueue) ? state.actionQueue : [];

  // Rebuild queue HTML
  queueEl.innerHTML = items.length
    ? items.map((item, i, arr) => {
        const id    = getQueuedId(item);
        const count = getQueuedCount(item);
        const label = count < 0 ? "∞" : String(count);
        const name  = workDefs[id]?.name || id;
        return `<div class="queue-row">
          <span class="queue-pill">${i+1}. ${escapeHtml(name)} × ${label}</span>
          <div class="ops">
            <button class="tiny-btn" data-up="${i}"   ${i===0            ? "disabled":""}>↑</button>
            <button class="tiny-btn" data-dn="${i}"   ${i===arr.length-1 ? "disabled":""}>↓</button>
            <button class="tiny-btn" data-rm="${i}">×</button>
          </div>
        </div>`;
      }).join("")
    : `<span class="small muted">生產列為空</span>`;

  // Attach delegation listener ONCE per element lifetime
  if (!_bound.has(queueEl)) {
    _bound.add(queueEl);
    queueEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-rm], button[data-up], button[data-dn]");
      if (!btn) return;
      if (btn.dataset.rm !== undefined) onRemoveQueuedAction?.(Number(btn.dataset.rm));
      if (btn.dataset.up !== undefined) onMoveQueuedAction?.(Number(btn.dataset.up), -1);
      if (btn.dataset.dn !== undefined) onMoveQueuedAction?.(Number(btn.dataset.dn),  1);
    });
  }
}
