import { housingDefs, buildingDefs } from "../data/dataBuildings.js";

export function getHousingCount(state, id) { return Number(state.housing?.[id] || 0); }
export function getBuildingLevel(state, id) { return Number(state.buildings?.[id] || 0); }

export function createBuildSystem({ state, addLog, spendCosts }) {
  if (!state.housing)   state.housing   = {};
  if (!state.buildings) state.buildings = {};

  function gainCastleExp(amount) {
    if (!amount) return;
    state.castleExp = (state.castleExp || 0) + amount;
    const expNeeded = () => Math.round(5 + 2.5 * (state.castleLevel || 1) * ((state.castleLevel || 1) - 1));
    while ((state.castleExp || 0) >= expNeeded()) {
      state.castleExp -= expNeeded();
      state.castleLevel = (state.castleLevel || 1) + 1;
      addLog(`城池等級提升到 Lv.${state.castleLevel}！`, "important");
    }
  }

  function canBuildHousing(id) {
    const def = housingDefs[id];
    if (!def) return { ok: false, reason: "找不到建築資料" };
    const count = getHousingCount(state, id);
    if (count >= def.maxCount) return { ok: false, reason: `${def.name}已達上限 (${def.maxCount})` };
    if ((state.gold || 0) < (def.gold || 0)) return { ok: false, reason: `金幣不足，需要 ${def.gold} 金` };
    return { ok: true, def };
  }

  function buildHousing(id) {
    const check = canBuildHousing(id);
    if (!check.ok) { addLog(check.reason, "important"); return false; }
    const def = check.def;
    if (!spendCosts(def.costs || {})) { addLog(`${def.name}建造失敗，材料不足`, "important"); return false; }
    state.gold = (state.gold || 0) - (def.gold || 0);
    state.housing[id] = getHousingCount(state, id) + 1;
    gainCastleExp(def.cityExpGain);
    addLog(`已建造：${def.name}`, "important");
    return true;
  }

  function getUpgradeCost(id) {
    const def = buildingDefs[id];
    if (!def) return {};
    const lv = getBuildingLevel(state, id);
    return def.getCost ? def.getCost(lv) : {};
  }

  function canUpgradeBuilding(id) {
    const def = buildingDefs[id];
    if (!def) return { ok: false, reason: "找不到建築資料" };
    const lv = getBuildingLevel(state, id);
    if (lv >= def.maxLevel) return { ok: false, reason: `${def.name}已達上限 (Lv.${def.maxLevel})` };
    if (def.unlockResearch && !state.research?.[def.unlockResearch]) {
      return { ok: false, reason: `${def.name}尚未解鎖（需研究：${def.unlockResearch}）` };
    }
    return { ok: true, def, lv };
  }

  function upgradeBuilding(id) {
    const check = canUpgradeBuilding(id);
    if (!check.ok) { addLog(check.reason, "important"); return false; }
    const def = check.def;
    const nextLv = check.lv + 1;
    const cost = getUpgradeCost(id);
    if ((state.gold || 0) < (cost.gold || 0)) {
      addLog(`${def.name}升級失敗，金幣不足（需要 ${cost.gold} 金）`, "important");
      return false;
    }
    if (!spendCosts(cost.resources || {})) {
      addLog(`${def.name}升級失敗，材料不足`, "important");
      return false;
    }
    state.gold = (state.gold || 0) - (cost.gold || 0);
    state.buildings[id] = nextLv;
    gainCastleExp((def.cityExpGain || 0) + (def.levelExpGain || 0) * nextLv);
    addLog(`${def.name}升到 Lv.${nextLv}`, "important");
    return true;
  }

  function getHousingCapacity() {
    return Object.entries(state.housing).reduce((sum, [id, count]) => {
      return sum + (housingDefs[id]?.housingGain || 0) * count;
    }, 0);
  }

  function getSafetyValue() {
    return Object.entries(state.housing).reduce((sum, [id, count]) => {
      return sum + (housingDefs[id]?.safetyGain || 0) * count;
    }, 0);
  }

  function getBuildingEffectValue(id, effectKey) {
    const def = buildingDefs[id];
    if (!def) return 0;
    const lv = getBuildingLevel(state, id);
    return (def.effects?.[effectKey] || 0) * lv;
  }

  return {
    buildHousing, canBuildHousing,
    upgradeBuilding, canUpgradeBuilding, getUpgradeCost,
    getHousingCapacity, getSafetyValue,
    getBuildingLevel, getHousingCount, getBuildingEffectValue
  };
}
