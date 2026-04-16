export function renderTopStats({
  state,
  getExpToNext,
  getMaxStamina,
  getBestFoodId,
  getResourceLabel,
  edibleValues
}) {
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const setWidth = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.style.width = value;
  };

  const expNext = getExpToNext(state.level || 1);
  const maxStamina = getMaxStamina(state);

  setText("gold", Math.floor(state.gold || 0));
  setText("level", state.level || 1);
  setText("exp", Math.floor(state.exp || 0));
  setText("expNext", expNext);

  setText("intelligence", state.intelligence || 0);
  setText("stamina", Math.floor(state.stamina || 0));
  setText("maxStamina", maxStamina);

  setText("managementLevel", state.managementLevel || 1);
  setText("managementExp", Math.floor(state.managementExp || 0));
  setText("managementExpNext", getExpToNext(state.managementLevel || 1));

  setText("tradeLevel", state.tradeLevel || 1);
  setText("reputationValue", Number(state.reputation || 0).toFixed(1));
  setText("taxIncome", Math.floor(state.pendingTax || 0));
  setText("castleLevel", state.castleLevel || 1);

  setText("housingUsed", Array.isArray(state.workers) ? state.workers.length : 0);
  setText("housingCap", state.housingCap || 0);
  setText("safetyValue", state.safetyValue || 0);

  setWidth(
    "expBar",
    `${Math.min(100, Math.max(0, ((state.exp || 0) / expNext) * 100))}%`
  );

  setWidth(
    "staminaBar",
    `${Math.min(100, Math.max(0, ((state.stamina || 0) / maxStamina) * 100))}%`
  );

  setWidth(
    "managementBar",
    `${Math.min(
      100,
      Math.max(
        0,
        ((state.managementExp || 0) / getExpToNext(state.managementLevel || 1)) * 100
      )
    )}%`
  );

  const eatHint = document.getElementById("eatHint");
  if (eatHint) {
    const bestFood = getBestFoodId();

    eatHint.textContent = bestFood
      ? `目前最佳食物：${getResourceLabel(bestFood)}（${edibleValues[bestFood] >= 0 ? "+" : ""}${edibleValues[bestFood]}）`
      : "目前沒有可吃的食物";
  }
}
