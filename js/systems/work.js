import { workDefs } from "../data/works.js";
import { resourceLabels } from "../data/resources.js";

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roll(chance) {
  return Math.random() < chance;
}

function getResourceLabel(id) {
  return resourceLabels[id] || id;
}

export function getWorkCost(def) {
  return Math.max(1, Number(def?.staminaCost ?? def?.stamina ?? 1) || 1);
}

export function getWorkDuration(def) {
  return Math.max(0.1, Number(def?.base ?? 10) || 10);
}

export function getWorkSummaryLoot(workId, state = null) {
  const loot = {};
  let gold = 0;
  let log = "";
  let type = "loot";

  function add(id, amount) {
    loot[id] = (loot[id] || 0) + amount;
  }

  switch (workId) {
    case "labor": {
      const level = Math.max(1, Number(state?.level || 1));
      const baseGold = 10;
      const levelMultiplier = 1 + (level - 1) * 0.1;
      const randomFactor = randInt(95, 105) / 100;
      gold += Math.max(1, Math.floor(baseGold * levelMultiplier * randomFactor));
      log = `村莊打工完成，獲得金幣 ${gold}`;
      break;
    }

    case "lumber":
      add("wood", randInt(2, 5));
      add("branch", randInt(1, 3));
      add("leaf", randInt(1, 4));
      if (roll(0.15)) add("apple", randInt(1, 2));
      if (roll(0.05)) add("appleSeed", 1);
      log = "伐木完成";
      break;

    case "mining":
      add("stone", randInt(2, 6));
      add("copperOre", randInt(1, 3));
      if (roll(0.8)) add("coal", randInt(1, 3));
      if (roll(0.55)) add("ironOre", randInt(1, 2));
      if (roll(0.12)) add("silverOre", randInt(1, 2));
      if (roll(0.08)) add("magnetite", 1);
      if (roll(0.03)) add("crystal", 1);
      if (roll(0.01)) add("goldOre", 1);
      if (roll(0.005)) add("gem", 1);
      log = "挖礦完成";
      break;

    case "fishing":
      if (roll(0.55)) add("fish", randInt(2, 4));
      if (roll(0.30)) add("shrimp", randInt(2, 4));
      if (roll(0.12)) add("crab", randInt(1, 2));
      if (roll(0.05)) add("snail", 1);
      if (roll(0.01)) add("copperOre", randInt(1, 2));
      if (roll(0.005)) add("coal", randInt(1, 2));
      if (roll(0.003)) add("ironOre", 1);
      if (roll(0.002)) add("silverOre", 1);
      if (roll(0.001)) add("magnetite", 1);
      if (roll(0.001)) add("crystal", 1);
      log = "釣魚完成";
      break;

    case "hunting": {
      const r = Math.random();
      if (r < 0.12) add("chicken", 1);
      else if (r < 0.24) add("rabbit", 1);
      else if (r < 0.32) add("dairyCow", 1);
      else if (r < 0.38) add("bull", 1);
      else if (r < 0.52) add("boar", 1);
      else if (r < 0.70) add("deer", 1);
      else if (r < 0.85) add("wolf", 1);
      else if (r < 0.96) add("brownBear", 1);
      else add("blackBear", 1);
      log = "狩獵完成";
      break;
    }

    case "forest":
      add("branch", randInt(1, 3));
      add("leaf", randInt(1, 4));
      add("fiber", randInt(1, 3));
      if (roll(0.65)) add("herb", randInt(1, 3));
      if (roll(0.55)) add("mushroom", randInt(1, 3));
      if (roll(0.1)) add("wheatSeed", 1);
      if (roll(0.08)) add("rareHerb", 1);
      if (roll(0.08)) add("mushroomSpore", 1);
      if (roll(0.05)) add("ginseng", 1);
      if (roll(0.05)) add("cottonSeed", 1);
      if (roll(0.05)) add("carrotSeed", 1);
      log = "森林採集完成";
      break;

    case "shore":
      add("sand", randInt(1, 5));
      if (roll(0.5)) add("shellfish", 1);
      if (roll(0.35)) add("crab", 1);
      if (roll(0.25)) add("branch", randInt(1, 2));
      if (roll(0.15)) add("coral", 1);
      log = "海邊採集完成";
      break;

    case "digging":
      add("dirt", randInt(2, 6));
      add("stone", randInt(1, 4));
      if (roll(0.5)) add("sand", randInt(0, 3));
      if (roll(0.05)) add("coal", 1);
      if (roll(0.025)) add("copperOre", 1);
      if (roll(0.015)) add("ironOre", 1);
      if (roll(0.01)) add("silverOre", 1);
      if (roll(0.008)) add("magnetite", 1);
      if (roll(0.005)) add("crystal", 1);
      if (roll(0.001)) add("goldOre", 1);
      if (roll(0.0001)) add("gem", 1);
      log = "挖掘完成";
      break;

    default:
      log = "工作完成";
      type = "important";
      break;
  }

  const gainText = Object.entries(loot)
    .map(([id, amount]) => `${getResourceLabel(id)} +${amount}`)
    .join("、");

  if (gainText && gold > 0) {
    log += `，獲得 ${gainText}、金幣 ${gold}`;
  } else if (gainText) {
    log += `，獲得 ${gainText}`;
  }

  return { gold, resources: loot, log, type };
}

export function createWorkSystem({
  state,
  addLog,
  addMainExp,
  gainResource,
  addSkillExp
}) {
  function startWorkAction(workId, { silent = false } = {}) {
    const def = workDefs[workId];
    if (!def) return false;
    if (state.currentAction) return false;

    const cost = getWorkCost(def);
    const duration = getWorkDuration(def);

    if (state.stamina < cost) {
      if (!silent) addLog(`${def.name}無法開始，體力不足`, "important");
      return false;
    }

    state.currentAction = {
      type: "work",
      id: workId,
      staminaCost: cost,
      remaining: duration,
      total: duration
    };

    if (!silent) {
      addLog(`開始${def.name}，預計 ${duration.toFixed(1)} 秒`, "important");
    }

    return true;
  }

  function requestWork(workId) {
    return startWorkAction(workId);
  }

  function completeCurrentAction() {
    const action = state.currentAction;
    if (!action) return false;

    state.currentAction = null;
    if (action.type !== "work") return false;

    const result = getWorkSummaryLoot(action.id, state);
    state.gold += result.gold || 0;

    for (const [resourceId, amount] of Object.entries(result.resources || {})) {
      gainResource(resourceId, amount);
    }

    addMainExp(1);
    if (typeof addSkillExp === "function") {
      const def = workDefs[action.id];
      if (def?.skill) addSkillExp(def.skill, 1);
    }
    addLog(result.log, result.type || "loot");
    return true;
  }

  function cancelCurrentAction() {
    if (!state.currentAction) {
      addLog("目前沒有進行中的工作", "important");
      return false;
    }

    const def = workDefs[state.currentAction.id];
    state.currentAction = null;
    addLog(`已取消目前工作：${def ? def.name : "未知工作"}`, "important");
    return true;
  }

  function clearActionQueue() {
    if (!Array.isArray(state.actionQueue) || !state.actionQueue.length) {
      addLog("目前沒有等待中的行動列", "important");
      return false;
    }

    state.actionQueue = [];
    addLog("已清空行動列", "important");
    return true;
  }

  function updateAction(deltaSeconds) {
    if (!state.currentAction) return;

    state.currentAction.remaining -= deltaSeconds;
    if (state.currentAction.remaining <= 0) {
      completeCurrentAction();
    }
  }

  return {
    requestWork,
    cancelCurrentAction,
    clearActionQueue,
    updateAction,
    startWorkAction,
    completeCurrentAction
  };
}
