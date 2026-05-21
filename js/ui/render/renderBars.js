// Fast updater called every RAF frame.
// ONLY updates widths and text content - NO innerHTML changes.
// Queue display is handled by renderActionLane/renderCraftLane/renderResearchLane (on renderAll).

export function renderBars({ state, workDefs, crafts, formatSeconds }) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  const setW = (id, pct) => {
    const el = document.getElementById(id);
    if (el) el.style.width = pct.toFixed(2) + "%";
  };

  // Stamina bar
  const maxStamina = 100 + ((state.level || 1) - 1) * 10;
  const stam = Math.max(0, Math.min(maxStamina, Number(state.stamina || 0)));
  setW("staminaBar", (stam / maxStamina) * 100);
  set("stamina", Math.floor(stam));

  // Production bar
  if (state.currentAction && workDefs?.[state.currentAction.id]) {
    const total     = Math.max(0.01, Number(state.currentAction.total    || 0.01));
    const remaining = Math.max(0,    Number(state.currentAction.remaining || 0));
    const pct = Math.min(100, ((total - remaining) / total) * 100);
    setW("productionBar", pct);
    set("productionText", `生產中：${workDefs[state.currentAction.id].name}｜剩餘 ${formatSeconds(remaining)}`);
  } else {
    setW("productionBar", 0);
    const q = Array.isArray(state.actionQueue) ? state.actionQueue : [];
    if (q.length > 0) {
      const nextId   = typeof q[0] === "string" ? q[0] : q[0]?.id;
      const nextName = workDefs?.[nextId]?.name || nextId || "?";
      set("productionText", `等待中：下一項 ${nextName}`);
    } else {
      set("productionText", "生產線：目前沒有進行中的動作。");
    }
  }

  // Craft bar
  if (state.currentCraft && crafts?.[state.currentCraft.id]) {
    const total     = Math.max(0.01, Number(state.currentCraft.total    || 0.01));
    const remaining = Math.max(0,    Number(state.currentCraft.remaining || 0));
    const pct = Math.min(100, ((total - remaining) / total) * 100);
    setW("craftBar", pct);
    set("craftText", `製作中：${crafts[state.currentCraft.id].name}｜剩餘 ${formatSeconds(remaining)}`);
  } else {
    setW("craftBar", 0);
    const q = Array.isArray(state.craftQueue) ? state.craftQueue : [];
    if (q.length > 0) {
      const nextId   = typeof q[0] === "string" ? q[0] : q[0]?.id;
      const nextName = crafts?.[nextId]?.name || nextId || "?";
      set("craftText", `等待中：下一項 ${nextName}`);
    } else {
      set("craftText", "製作線：目前沒有進行中的動作。");
    }
  }

  // Research bar
  if (state.currentResearch) {
    const total     = Math.max(0.01, Number(state.currentResearch.total    || 0.01));
    const remaining = Math.max(0,    Number(state.currentResearch.remaining || 0));
    const pct = Math.min(100, ((total - remaining) / total) * 100);
    setW("researchBar", pct);
    set("researchText", `研究中：${state.currentResearch.name}｜剩餘 ${formatSeconds(remaining)}`);
  } else {
    setW("researchBar", 0);
    const rq = Array.isArray(state.researchQueue) ? state.researchQueue : [];
    set("researchText", rq.length > 0
      ? `等待中：下一項 ${rq[0]?.name || "?"}`
      : "研究線：目前沒有進行中的動作。");
  }
}
