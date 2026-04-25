import {
  resourceLabels,
  edibleValues,
  foodOrder,
  fuelDurations
} from "../data/resources.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getResourceLabel(id) {
  return resourceLabels[id] || id;
}

export function createStaminaRuntime({
  state,
  addLog,
  spendResource,
  getMaxStamina
}) {
  function getBestFoodId() {
    for (const id of foodOrder) {
      if ((state.resources[id] || 0) > 0 && typeof edibleValues[id] === "number") {
        return id;
      }
    }
    return "";
  }

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

  function eatResource(resourceId) {
    const value = edibleValues[resourceId];
    const label = getResourceLabel(resourceId);

    if (typeof value !== "number") return false;

    if ((state.resources[resourceId] || 0) <= 0) {
      addLog(`沒有${label}可以使用`, "important");
      return false;
    }

    if (state.stamina >= getMaxStamina(state) && value >= 0) {
      addLog("體力已滿，不需要吃食物", "important");
      return false;
    }

    spendResource(resourceId, 1);

    const before = state.stamina;
    state.stamina = clamp(state.stamina + value, 0, getMaxStamina(state));
    const actual = state.stamina - before;

    addLog(`你使用了 1 個${label}，體力變化 ${actual >= 0 ? "+" : ""}${actual}`, "important");
    return true;
  }

  function eatBestFood() {
    const best = getBestFoodId();
    if (!best) {
      addLog("目前沒有可吃的食物", "important");
      return;
    }

    eatResource(best);
  }

  function addCampfireFuel(resourceId) {
    const duration = Number(fuelDurations[resourceId] || 0);
    const label = getResourceLabel(resourceId);

    if (duration <= 0) return false;

    if ((state.resources[resourceId] || 0) <= 0) {
      addLog(`沒有${label}可以投入篝火`, "important");
      return false;
    }

    spendResource(resourceId, 1);
    state.campfireSec = Math.max(0, Number(state.campfireSec || 0)) + duration;

    addLog(`你投入了 1 個${label}，篝火延長 ${duration} 秒`, "important");
    return true;
  }

  function isWarehouseResourceClickable(resourceId) {
    return (
      typeof edibleValues[resourceId] === "number" ||
      typeof fuelDurations[resourceId] === "number"
    );
  }

  function getWarehouseResourceHint(resourceId) {
    const isFood = typeof edibleValues[resourceId] === "number";
    const isFuel = typeof fuelDurations[resourceId] === "number";

    if (isFood && isFuel) return "點擊使用 / 投入篝火";
    if (isFood) return "點擊使用";
    if (isFuel) return "點擊投入篝火";
    return "";
  }

  function handleWarehouseResourceClick(resourceId, onChanged = null) {
    if (typeof edibleValues[resourceId] === "number") {
      if (eatResource(resourceId)) {
        onChanged?.();
      }
      return;
    }

    if (typeof fuelDurations[resourceId] === "number") {
      if (addCampfireFuel(resourceId)) {
        onChanged?.();
      }
    }
  }

  return {
    getBestFoodId,
    rest,
    eatResource,
    eatBestFood,
    addCampfireFuel,
    isWarehouseResourceClickable,
    getWarehouseResourceHint,
    handleWarehouseResourceClick
  };
}
