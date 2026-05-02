import { resourceLabels, edibleValues, foodOrder } from "../data/resources.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getResourceLabel(id) {
  return resourceLabels[id] || id;
}

export function getMaxStamina(state) {
  return 100 + (state.level - 1) * 10;
}

export function createStaminaSystem({
  state,
  addLog,
  spendResource
}) {
  function rest() {
    const before = state.stamina;
    state.stamina = Math.min(getMaxStamina(state), state.stamina + 5);
    const actual = state.stamina - before;

    if (actual <= 0) {
      addLog("體力已滿，不需要休息", "important");
      return;
    }

    addLog(`你休息恢復 ${actual} 體力`, "important");
  }

  function getBestFoodId() {
    for (const id of foodOrder) {
      if ((state.resources[id] || 0) > 0 && typeof edibleValues[id] === "number") {
        return id;
      }
    }
    return "";
  }

  function eatResource(resourceId) {
    const value = edibleValues[resourceId];
    const label = getResourceLabel(resourceId);

    if (typeof value !== "number") return;

    if ((state.resources[resourceId] || 0) <= 0) {
      addLog(`沒有${label}可以使用`, "important");
      return;
    }

    if (state.stamina >= getMaxStamina(state) && value >= 0) {
      addLog("體力已滿，不需要吃食物", "important");
      return;
    }

    spendResource(resourceId, 1);

    const before = state.stamina;
    state.stamina = clamp(state.stamina + value, 0, getMaxStamina(state));
    const actual = state.stamina - before;

    addLog(`你使用了 1 個${label}，體力變化 ${actual >= 0 ? "+" : ""}${actual}`, "important");
  }

  function eatBestFood() {
    const best = getBestFoodId();
    if (!best) {
      addLog("目前沒有可吃的食物", "important");
      return;
    }
    eatResource(best);
  }

  return {
    rest,
    getBestFoodId,
    eatResource,
    eatBestFood,
    getMaxStamina: () => getMaxStamina(state)
  };
}
