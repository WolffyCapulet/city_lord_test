// Fast bar updater - called every RAF frame, only touches width/text, no innerHTML
export function renderBars({ state, workDefs, crafts, formatSeconds }) {
  // Production bar
  const productionBar  = document.getElementById("productionBar");
  const productionText = document.getElementById("productionText");

  if (state.currentAction && workDefs[state.currentAction.id]) {
    const def      = workDefs[state.currentAction.id];
    const total    = Math.max(0.01, Number(state.currentAction.total || 0.01));
    const remaining = Math.max(0, Number(state.currentAction.remaining || 0));
    const pct      = Math.min(100, ((total - remaining) / total) * 100);
    if (productionBar)  productionBar.style.width  = pct.toFixed(2) + "%";
    if (productionText) productionText.textContent =
      `生產中：${def.name}｜剩餘 ${formatSeconds(remaining)}`;
  } else {
    if (productionBar)  productionBar.style.width  = "0%";
    if (productionText) {
      const hasQueue = state.actionQueue?.length > 0;
      productionText.textContent = hasQueue
        ? `等待中：下一項 ${workDefs[state.actionQueue[0]?.id]?.name || "?"}`
        : "生產線：目前沒有進行中的動作。";
    }
  }

  // Craft bar
  const craftBar  = document.getElementById("craftBar");
  const craftText = document.getElementById("craftText");

  if (state.currentCraft && crafts[state.currentCraft.id]) {
    const def      = crafts[state.currentCraft.id];
    const total    = Math.max(0.01, Number(state.currentCraft.total || 0.01));
    const remaining = Math.max(0, Number(state.currentCraft.remaining || 0));
    const pct      = Math.min(100, ((total - remaining) / total) * 100);
    if (craftBar)  craftBar.style.width  = pct.toFixed(2) + "%";
    if (craftText) craftText.textContent =
      `製作中：${def.name}｜剩餘 ${formatSeconds(remaining)}`;
  } else {
    if (craftBar)  craftBar.style.width  = "0%";
    if (craftText) {
      const hasQueue = state.craftQueue?.length > 0;
      craftText.textContent = hasQueue
        ? `等待中：${crafts[state.craftQueue[0]?.id]?.name || "?"}`
        : "製作線：目前沒有進行中的動作。";
    }
  }

  // Research bar
  const researchBar  = document.getElementById("researchBar");
  const researchText = document.getElementById("researchText");

  if (state.currentResearch) {
    const total    = Math.max(0.01, Number(state.currentResearch.total || 0.01));
    const remaining = Math.max(0, Number(state.currentResearch.remaining || 0));
    const pct      = Math.min(100, ((total - remaining) / total) * 100);
    if (researchBar)  researchBar.style.width  = pct.toFixed(2) + "%";
    if (researchText) researchText.textContent =
      `研究中：${state.currentResearch.name}｜剩餘 ${formatSeconds(remaining)}`;
  } else {
    if (researchBar)  researchBar.style.width  = "0%";
    if (researchText) researchText.textContent = "研究線：目前沒有進行中的動作。";
  }

  // Stamina bar (also live)
  const staminaBar = document.getElementById("staminaBar");
  const staminaEl  = document.getElementById("stamina");
  const maxStamina = 100 + ((state.level || 1) - 1) * 10;
  const stamPct    = Math.min(100, Math.max(0, (Number(state.stamina || 0) / maxStamina) * 100));
  if (staminaBar) staminaBar.style.width  = stamPct.toFixed(2) + "%";
  if (staminaEl)  staminaEl.textContent   = Math.floor(state.stamina || 0);
}
