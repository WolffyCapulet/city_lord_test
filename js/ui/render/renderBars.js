// Fast updater - called every RAF frame
// Updates bars, text labels, AND queue display (no event listeners - delegation handles those)

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

function updateBar(barId, textId, pct, text) {
  const bar = document.getElementById(barId);
  const el  = document.getElementById(textId);
  if (bar) bar.style.width = pct.toFixed(2) + "%";
  if (el)  el.textContent  = text;
}

function renderQueueRows(containerId, items, nameMap) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!items.length) {
    el.innerHTML = `<span class="small muted">${containerId === "productionQueue" ? "生產" : "製作"}列為空</span>`;
    return;
  }
  el.innerHTML = items.map((item, i, arr) => {
    const id    = getQueuedId(item);
    const count = getQueuedCount(item);
    const label = count < 0 ? "∞" : String(count);
    const name  = nameMap[id]?.name || id;
    return `<div class="queue-row">
      <span class="queue-pill">${i+1}. ${escapeHtml(name)} × ${label}</span>
      <div class="ops">
        <button class="tiny-btn" data-up="${i}"   ${i===0             ? "disabled":""}>↑</button>
        <button class="tiny-btn" data-dn="${i}"   ${i===arr.length-1  ? "disabled":""}>↓</button>
        <button class="tiny-btn" data-rm="${i}">×</button>
      </div>
    </div>`;
  }).join("");
}

export function renderBars({ state, workDefs, crafts, formatSeconds }) {
  const maxStamina = 100 + ((state.level || 1) - 1) * 10;

  // ── Stamina ──────────────────────────────────────────────
  const stamPct = Math.min(100, Math.max(0,
    (Number(state.stamina || 0) / maxStamina) * 100));
  const staminaBar = document.getElementById("staminaBar");
  const staminaEl  = document.getElementById("stamina");
  if (staminaBar) staminaBar.style.width = stamPct.toFixed(2) + "%";
  if (staminaEl)  staminaEl.textContent  = Math.floor(state.stamina || 0);

  // ── Production bar ────────────────────────────────────────
  if (state.currentAction && workDefs?.[state.currentAction.id]) {
    const def       = workDefs[state.currentAction.id];
    const total     = Math.max(0.01, Number(state.currentAction.total    || 0.01));
    const remaining = Math.max(0,    Number(state.currentAction.remaining || 0));
    const pct       = Math.min(100, ((total - remaining) / total) * 100);
    updateBar("productionBar", "productionText", pct,
      `生產中：${def.name}｜剩餘 ${formatSeconds(remaining)}`);
  } else {
    const q = Array.isArray(state.actionQueue) ? state.actionQueue : [];
    const nextName = q.length > 0 ? (workDefs?.[getQueuedId(q[0])]?.name || "?") : "";
    updateBar("productionBar", "productionText", 0,
      q.length > 0 ? `等待中：下一項 ${nextName}` : "生產線：目前沒有進行中的動作。");
  }

  // ── Production queue display ──────────────────────────────
  const aq = Array.isArray(state.actionQueue) ? state.actionQueue : [];
  renderQueueRows("productionQueue", aq, workDefs || {});

  // ── Craft bar ─────────────────────────────────────────────
  if (state.currentCraft && crafts?.[state.currentCraft.id]) {
    const def       = crafts[state.currentCraft.id];
    const total     = Math.max(0.01, Number(state.currentCraft.total    || 0.01));
    const remaining = Math.max(0,    Number(state.currentCraft.remaining || 0));
    const pct       = Math.min(100, ((total - remaining) / total) * 100);
    updateBar("craftBar", "craftText", pct,
      `製作中：${def.name}｜剩餘 ${formatSeconds(remaining)}`);
  } else {
    const q = Array.isArray(state.craftQueue) ? state.craftQueue : [];
    const nextName = q.length > 0 ? (crafts?.[getQueuedId(q[0])]?.name || "?") : "";
    updateBar("craftBar", "craftText", 0,
      q.length > 0 ? `等待中：下一項 ${nextName}` : "製作線：目前沒有進行中的動作。");
  }

  // ── Craft queue display ───────────────────────────────────
  const cq = Array.isArray(state.craftQueue) ? state.craftQueue : [];
  renderQueueRows("craftQueueTop", cq, crafts || {});

  // ── Research bar ──────────────────────────────────────────
  if (state.currentResearch) {
    const total     = Math.max(0.01, Number(state.currentResearch.total    || 0.01));
    const remaining = Math.max(0,    Number(state.currentResearch.remaining || 0));
    const pct       = Math.min(100, ((total - remaining) / total) * 100);
    updateBar("researchBar", "researchText", pct,
      `研究中：${state.currentResearch.name}｜剩餘 ${formatSeconds(remaining)}`);
  } else {
    const rq = Array.isArray(state.researchQueue) ? state.researchQueue : [];
    updateBar("researchBar", "researchText", 0,
      rq.length > 0 ? `等待中：${rq[0]?.name || "?"}` : "研究線：目前沒有進行中的動作。");
  }
}
