import { workDefs } from "../data/dataWorks.js";
import { resourceLabels } from "../data/dataResources.js";

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function roll(chance) { return Math.random() < chance; }
function getResourceLabel(id) { return resourceLabels[id] || id; }

export function getWorkCost(def) {
  return Math.max(1, Number(def?.staminaCost ?? def?.stamina ?? 1) || 1);
}
export function getWorkDuration(def, state) {
  // Duration based on intelligence: base 10s, reduced by intelligence
  const intel = Number(state?.intelligence || 0);
  const raw = (1 + 0.02 * intel) / 10;   // cycles per second
  const capped = raw <= 1 ? raw : 1 + (raw - 1) * 0.35;
  const cycleSec = Math.max(5, 1 / capped);  // min 5s
  return cycleSec;
}

function hasTool(state, resId) {
  return Number(state?.resources?.[resId] || 0) > 0;
}

export function getWorkSummaryLoot(workId, state = null) {
  const loot = {};
  let gold = 0;
  let rarity = "common";
  let log = "";
  let type = "loot";

  const miningLv = state?.skills?.mining?.level || 1;
  const setRarity = (r) => {
    const order = ["common","rare","epic","legendary"];
    if (order.indexOf(r) > order.indexOf(rarity)) rarity = r;
  };
  function add(id, amt) { loot[id] = (loot[id] || 0) + amt; }

  switch (workId) {
    case "labor": {
      const level = Math.max(1, Number(state?.level || 1));
      gold = Math.max(1, Math.floor(1 * (1 + 0.1 * (level - 1)) * (randInt(95,105)/100)));
      log = `村莊打工完成，獲得金幣 ${gold}`;
      return { gold, resources: loot, log, type, rarity };
    }
    case "lumber":
      add("wood", randInt(2, 5));
      add("branch", randInt(1, 3));
      add("leaf", randInt(1, 4));
      if (roll(0.18)) { add("apple", randInt(1, 2)); setRarity("rare"); }
      if (roll(0.05)) { add("appleSeed", 1); setRarity("rare"); }
      // Tool bonus
      { const mult = hasTool(state,"ironAxeTool") ? 1.5 : hasTool(state,"copperAxeTool") ? 1.35 : hasTool(state,"stoneAxeTool") ? 1.2 : hasTool(state,"woodAxeTool") ? 1.1 : 1;
        if (mult > 1) { if (loot.wood) loot.wood = Math.max(1, Math.floor(loot.wood * mult)); if (loot.branch) loot.branch = Math.max(1, Math.floor(loot.branch * mult)); } }
      log = "伐木完成";
      break;
    case "mining":
      add("stone", randInt(2, 6));
      add("copperOre", randInt(1, 5));
      if (roll(0.8)) add("coal", randInt(1, 3));
      if (roll(0.55)) add("ironOre", randInt(1, 2));
      if (miningLv >= 10) {
        if (roll(0.12)) { add("silverOre", randInt(1, 2)); setRarity("rare"); }
        if (roll(0.08)) { add("magnetite", 1); setRarity("rare"); }
        if (roll(0.03)) { add("crystal", 1); setRarity("epic"); }
      }
      if (miningLv >= 20) {
        if (roll(0.06)) { add("goldOre", randInt(1, 2)); setRarity("epic"); }
        if (roll(0.02)) { add("gem", 1); setRarity("legendary"); }
      }
      // Tool bonus
      { const mult = hasTool(state,"ironPickTool") ? 1.45 : hasTool(state,"copperPickTool") ? 1.25 : hasTool(state,"stonePickTool") ? 1.12 : hasTool(state,"woodPickTool") ? 1.06 : 1;
        if (mult > 1) Object.keys(loot).forEach(k => { loot[k] = Math.max(1, Math.floor(loot[k] * mult)); }); }
      log = "挖礦完成";
      break;
    case "fishing": {
      const r = Math.random();
      if (r < 0.55) add("fish", randInt(2, 4));
      else if (r < 0.85) add("shrimp", randInt(2, 4));
      else if (r < 0.97) { add("crab", randInt(1, 2)); setRarity("rare"); }
      else { add("snail", 1); setRarity("rare"); }
      if (roll(0.005)) { add("ironOre", 1); setRarity("rare"); }
      if (roll(0.001)) { add("crystal", 1); setRarity("legendary"); }
      // Tool bonus
      const fmult = hasTool(state,"fishNetTool") ? 1.8 : hasTool(state,"ironFishingRodTool") ? 1.5 : hasTool(state,"copperFishingRodTool") ? 1.35 : hasTool(state,"fishingRodTool") ? 1.2 : hasTool(state,"woodFishingRodTool") ? 1.1 : 1;
      if (fmult > 1) Object.keys(loot).forEach(k => { loot[k] = Math.max(1, Math.floor(loot[k] * fmult)); });
      log = "釣魚完成";
      break;
    }
    case "hunting": {
      const r = Math.random();
      if (r < 0.24) add("rabbit", 1);
      else if (r < 0.50) add("boar", 1);
      else if (r < 0.72) add("deer", 1);
      else if (r < 0.87) { add("wolf", 1); setRarity("rare"); }
      else if (r < 0.97) { add("brownBear", 1); setRarity("rare"); }
      else { add("blackBear", 1); setRarity("epic"); }
      log = "狩獵完成";
      break;
    }
    case "forest":
      if (roll(0.65)) add("herb", randInt(1, 3));
      if (roll(0.08)) { add("rareHerb", 1); setRarity("rare"); }
      if (roll(0.55)) add("mushroom", randInt(1, 3));
      add("branch", randInt(1, 3));
      add("leaf", randInt(1, 4));
      add("fiber", randInt(1, 3));
      if (roll(0.05)) { add("ginseng", 1); setRarity("rare"); }
      if (roll(0.08)) { add("wheatSeed", 1); setRarity("rare"); }
      if (roll(0.07)) { add("mushroomSpore", 1); setRarity("rare"); }
      if (roll(0.06)) { add("cottonSeed", 1); setRarity("rare"); }
      if (roll(0.06)) { add("carrotSeed", 1); setRarity("rare"); }
      log = "森林採集完成";
      break;
    case "shore":
      add("sand", randInt(1, 5));
      if (roll(0.7)) add("shellfish", randInt(1, 3));
      if (roll(0.35)) { add("crab", randInt(1, 2)); setRarity("rare"); }
      if (roll(0.15)) { add("coral", 1); setRarity("rare"); }
      log = "海邊採集完成";
      break;
    case "digging":
      add("dirt", randInt(2, 6));
      add("stone", randInt(1, 4));
      if (roll(0.8)) add("sand", randInt(0, 3));
      // Tool bonus
      { const mult = hasTool(state,"ironShovelTool") ? 1.5 : hasTool(state,"copperShovelTool") ? 1.35 : hasTool(state,"shovelTool") ? 1.2 : hasTool(state,"woodShovelTool") ? 1.1 : 1;
        if (mult > 1) Object.keys(loot).forEach(k => { loot[k] = Math.max(1, Math.floor(loot[k] * mult)); }); }
      log = "挖掘完成";
      break;
    default:
      log = "工作完成";
      type = "important";
      break;
  }

  const rarityLabel = { common:"", rare:"【稀有】", epic:"【珍稀】", legendary:"【極稀有】" }[rarity] || "";
  const gainText = Object.entries(loot)
    .map(([id, amt]) => `${getResourceLabel(id)} +${amt}`)
    .join("、");
  if (gainText) log += `，獲得 ${gainText}`;
  if (gold > 0) log += `、金幣 ${gold}`;
  if (rarityLabel) { log += ` ${rarityLabel}`; type = "loot"; }

  return { gold, resources: loot, log, type, rarity };
}

export function createWorkSystem({ state, addLog, addMainExp, gainResource, addSkillExp }) {
  function startWorkAction(workId, { silent = false } = {}) {
    const def = workDefs[workId];
    if (!def || state.currentAction) return false;
    const cost = getWorkCost(def);
    const duration = getWorkDuration(def, state);
    if (state.stamina < cost) {
      if (!silent) addLog(`${def.name}無法開始，體力不足`, "important");
      return false;
    }
    state.currentAction = { type: "work", id: workId, staminaCost: cost, remaining: duration, total: duration };
    if (!silent) addLog(`開始${def.name}，預計 ${duration.toFixed(1)} 秒`, "important");
    return true;
  }

  function requestWork(workId) { return startWorkAction(workId); }

  function completeCurrentAction() {
    const action = state.currentAction;
    if (!action) return false;
    state.currentAction = null;
    if (action.type !== "work") return false;
    // Deduct stamina at completion
    state.stamina = Math.max(0, Number(state.stamina || 0) - Number(action.staminaCost || 0));
    const result = getWorkSummaryLoot(action.id, state);
    state.gold += result.gold || 0;
    for (const [id, amt] of Object.entries(result.resources || {})) gainResource(id, amt);
    addMainExp(1);
    if (typeof addSkillExp === "function") {
      const def = workDefs[action.id];
      if (def?.skill) addSkillExp(def.skill, 1);
    }
    addLog(result.log, result.type || "loot");
    return true;
  }

  function cancelCurrentAction() {
    if (!state.currentAction) { addLog("目前沒有進行中的工作", "important"); return false; }
    const def = workDefs[state.currentAction.id];
    state.currentAction = null;
    addLog(`已取消：${def?.name || "工作"}`, "important");
    return true;
  }

  function updateAction(deltaSeconds) {
    if (!state.currentAction) return;
    state.currentAction.remaining -= deltaSeconds;
    if (state.currentAction.remaining <= 0) completeCurrentAction();
  }

  return { requestWork, cancelCurrentAction, updateAction, startWorkAction, completeCurrentAction };
}
