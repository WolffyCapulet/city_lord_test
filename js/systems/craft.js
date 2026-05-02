import { crafts } from "../data/crafts.js";
import { resourceLabels } from "../data/resources.js";

function getResourceLabel(id) {
  return resourceLabels[id] || id;
}

export function createCraftSystem({
  state,
  addLog,
  addMainExp,
  gainResource,
  canAfford,
  spendCosts
}) {
  function isCraftHidden(def) {
    return !!def.hidden;
  }

  function isCraftUnlocked(def) {
    if (!def.unlock) return true;
    return !!state.research?.[def.unlock];
  }

  function craftItem(craftId) {
    const def = crafts[craftId];
    if (!def) return false;

    if (isCraftHidden(def)) {
      addLog(`${def.name}目前不可見`, "important");
      return false;
    }

    if (!isCraftUnlocked(def)) {
      addLog(`${def.name}尚未解鎖，需要研究：${def.unlock}`, "important");
      return false;
    }

    const staminaCost = Math.max(1, Number(def.stamina ?? 1) || 1);

    if (state.stamina < staminaCost) {
      addLog(`${def.name}製作失敗，體力不足`, "important");
      return false;
    }

    if (!canAfford(def.costs || {})) {
      addLog(`${def.name}製作失敗，材料不足`, "important");
      return false;
    }

    spendCosts(def.costs || {});
    state.stamina -= staminaCost;

    for (const [resourceId, amount] of Object.entries(def.yields || {})) {
      gainResource(resourceId, amount);
    }

    addMainExp(1);

    const gainText = Object.entries(def.yields || {})
      .map(([id, amount]) => `${getResourceLabel(id)} +${amount}`)
      .join("、");

    addLog(`你製作了 ${def.name}，獲得 ${gainText}，經驗 +1`, "loot");
    return true;
  }

  return {
    isCraftHidden,
    isCraftUnlocked,
    craftItem
  };
}
