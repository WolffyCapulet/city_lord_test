import { housingDefs, buildingDefs } from "../data/buildings.js";

function scaleCosts(costs, scale, level) {
  const factor = Math.pow(scale, Math.max(0, level - 1));
  return Object.fromEntries(
    Object.entries(costs).map(([id, amount]) => [id, Math.ceil(amount * factor)])
  );
}

export function getHousingCount(state, buildingId) {
  return Number(state.housing?.[buildingId] || 0);
}

export function getBuildingLevel(state, buildingId) {
  return Number(state.buildings?.[buildingId] || 0);
}

export function createBuildSystem({
  state,
  addLog,
  spendCosts
}) {
  if (!state.housing) state.housing = {};
  if (!state.buildings) state.buildings = {};

  function canBuildHousing(buildingId) {
    const def = housingDefs[buildingId];
    if (!def) return { ok: false, reason: "找不到建築資料" };

    const currentCount = getHousingCount(state, buildingId);
    if (currentCount >= def.maxCount) {
      return { ok: false, reason: `${def.name}已達上限` };
    }

    return { ok: true, def };
  }

  function buildHousing(buildingId) {
    const check = canBuildHousing(buildingId);
    if (!check.ok) {
      addLog(check.reason, "important");
      return false;
    }

    const def = check.def;

    if (!spendCosts(def.costs || {})) {
      addLog(`${def.name}建造失敗，材料不足`, "important");
      return false;
    }

    state.housing[buildingId] = getHousingCount(state, buildingId) + 1;
    addLog(`已建造：${def.name}`, "important");
    return true;
  }

  function canUpgradeBuilding(buildingId) {
    const def = buildingDefs[buildingId];
    if (!def) return { ok: false, reason: "找不到建築資料" };

    const currentLevel = getBuildingLevel(state, buildingId);
    if (currentLevel >= def.maxLevel) {
      return { ok: false, reason: `${def.name}已達上限` };
    }

    if (def.unlockResearch && !state.research?.[def.unlockResearch]) {
      return { ok: false, reason: `${def.name}尚未解鎖研究：${def.unlockResearch}` };
    }

    return { ok: true, def, currentLevel };
  }

  function getUpgradeCost(buildingId) {
    const def = buildingDefs[buildingId];
    if (!def) return {};

    const nextLevel = getBuildingLevel(state, buildingId) + 1;
    return scaleCosts(def.baseCost || {}, def.costScale || 1, nextLevel);
  }

  function upgradeBuilding(buildingId) {
    const check = canUpgradeBuilding(buildingId);
    if (!check.ok) {
      addLog(check.reason, "important");
      return false;
    }

    const def = check.def;
    const nextLevel = check.currentLevel + 1;
    const costs = getUpgradeCost(buildingId);

    if (!spendCosts(costs)) {
      addLog(`${def.name}升級失敗，材料不足`, "important");
      return false;
    }

    state.buildings[buildingId] = nextLevel;
    addLog(`${def.name}升到 Lv.${nextLevel}`, "important");
    return true;
  }

  function getHousingCapacity() {
    let total = 0;

    for (const [buildingId, count] of Object.entries(state.housing)) {
      const def = housingDefs[buildingId];
      if (!def) continue;
      total += (def.housingGain || 0) * count;
    }

    return total;
  }

  function getSafetyValue() {
    let total = 0;

    for (const [buildingId, count] of Object.entries(state.housing)) {
      const def = housingDefs[buildingId];
      if (!def) continue;
      total += (def.safetyGain || 0) * count;
    }

    return total;
  }

  function getBuildingEffectValue(buildingId, effectKey) {
    const def = buildingDefs[buildingId];
    if (!def) return 0;

    const level = getBuildingLevel(state, buildingId);
    if (level <= 0) return 0;

    const perLevel = Number(def.effects?.[effectKey] || 0);
    return perLevel * level;
  }

  return {
    buildHousing,
    canBuildHousing,
    upgradeBuilding,
    canUpgradeBuilding,
    getUpgradeCost,
    getHousingCapacity,
    getSafetyValue,
    getBuildingLevel,
    getHousingCount,
    getBuildingEffectValue
  };
}
