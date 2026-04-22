import {
  resourceLabels,
  edibleValues,
  foodOrder,
  fuelDurations
} from "../data/resources.js";
import { workDefs } from "../data/works.js";
import { crafts } from "../data/crafts.js";
import { books, researchDefs } from "../data/research.js";

import { bindEvents } from "./bindEvents.js";

import {
  createInitialState,
  normalizeState,
  resetState
} from "../core/state.js";

import {
  createWorkSystem,
  getWorkCost
} from "../systems/work.js";
import { createResearchSystem } from "../systems/research.js";

import { renderResearchArea } from "../ui/render/renderResearchArea.js";
import { renderActionLane } from "../ui/render/renderActionLane.js";
import { renderCraftLane } from "../ui/render/renderCraftLane.js";
import { renderResearchLane } from "../ui/render/renderResearchLane.js";
import { renderLog } from "../ui/render/renderLog.js";
import { renderTopStats } from "../ui/render/renderTopStats.js";
import { renderResources } from "../ui/render/renderResources.js";
import { renderWorkButtons } from "../ui/render/renderWorkButtons.js";
import { renderCraftList } from "../ui/render/renderCraftList.js";
import { renderSkillPills } from "../ui/render/renderSkillPills.js";

const STORAGE_KEY = "city_lord_modular_min_v0.0.0.1";
const LOG_LIMIT = 100;
const QUEUE_LIMIT = 3;
const PRODUCTION_MIN_CYCLE_SECONDS = 5;
const CRAFT_MIN_CYCLE_SECONDS = 5;

const skillLabels = {
  labor: "打工",
  lumber: "伐木",
  mining: "挖礦",
  fishing: "釣魚",
  hunting: "狩獵",
  gathering: "採集",
  digging: "挖掘",
  farming: "耕種",
  woodworking: "木工",
  masonry: "石工",
  cooking: "烹飪",
  smelting: "冶煉",
  alchemy: "煉金",
  tanning: "裁縫"
};

function createDefaultSkills() {
  return Object.fromEntries(
    Object.keys(skillLabels).map((id) => [id, { level: 1, exp: 0 }])
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function nowTime() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `[${hh}:${mm}:${ss}]`;
}

function formatSeconds(seconds) {
  return `${Math.max(0, Number(seconds || 0)).toFixed(1)} 秒`;
}

function formatReadableDuration(seconds) {
  const total = Math.max(0, Math.ceil(Number(seconds || 0)));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m${String(s).padStart(2, "0")}s`;
}

function getExpToNext(level) {
  return Math.round(5 + 2.5 * level * (level - 1));
}

function getMaxStamina() {
  return 100;
}

function getResourceLabel(id) {
  return resourceLabels[id] || id;
}

function createDefaultResources() {
  const ids = new Set();

  Object.keys(resourceLabels).forEach((id) => ids.add(id));

  Object.values(crafts).forEach((craft) => {
    Object.keys(craft.costs || {}).forEach((id) => ids.add(id));
    Object.keys(craft.yields || {}).forEach((id) => ids.add(id));
  });

  Object.keys(books).forEach((id) => ids.add(id));

  return Object.fromEntries([...ids].sort().map((id) => [id, 0]));
}

function normalizeLogs(logs) {
  if (!Array.isArray(logs)) return [];

  return logs
    .map((item) => {
      if (typeof item === "string") {
        return { time: "", text: item, type: "important" };
      }

      return {
        time: item?.time || "",
        text: item?.text || "",
        type: item?.type || "important"
      };
    })
    .filter((item) => item.text)
    .slice(0, LOG_LIMIT);
}

const stateOptions = {
  createDefaultResources,
  createDefaultSkills
};

function ensureStateShape(s = {}) {
  const state = s;

  state.gold = Number(state.gold || 0);
  state.level = Math.max(1, Number(state.level || 1));
  state.exp = Math.max(0, Number(state.exp || 0));
  state.intelligence = Math.max(0, Number(state.intelligence || 0));

  state.stamina = Math.max(0, Number(state.stamina || 100));
  state.staminaLevel = Math.max(1, Number(state.staminaLevel || 1));
  state.staminaExp = Math.max(0, Number(state.staminaExp || 0));

  state.managementLevel = Math.max(1, Number(state.managementLevel || 1));
  state.managementExp = Math.max(0, Number(state.managementExp || 0));

  state.tradeLevel = Math.max(1, Number(state.tradeLevel || 1));
  state.tradeExp = Math.max(0, Number(state.tradeExp || 0));
  state.reputation = Math.max(0, Number(state.reputation || 0));

  state.castleLevel = Math.max(1, Number(state.castleLevel || 1));
  state.castleExp = Math.max(0, Number(state.castleExp || 0));
  state.safetyValue = Math.max(0, Number(state.safetyValue || 0));

  state.pendingTax = Math.max(0, Number(state.pendingTax || 0));
  state.campfireSec = Math.max(0, Number(state.campfireSec || 0));
  state.housingCap = Math.max(0, Number(state.housingCap || 0));

  state.resources = {
    ...createDefaultResources(),
    ...(state.resources || {})
  };

  state.skills = {
    ...createDefaultSkills(),
    ...(state.skills || {})
  };

  Object.keys(skillLabels).forEach((id) => {
    state.skills[id] = {
      level: Math.max(1, Number(state.skills[id]?.level || 1)),
      exp: Math.max(0, Number(state.skills[id]?.exp || 0))
    };
  });

  state.logs = normalizeLogs(state.logs);

  if (!Array.isArray(state.workers)) state.workers = [];
  if (!Array.isArray(state.actionQueue)) state.actionQueue = [];
  if (!Array.isArray(state.craftQueue)) state.craftQueue = [];
  if (!Array.isArray(state.researchQueue)) state.researchQueue = [];

  if (!state.research || typeof state.research !== "object") state.research = {};
  if (!state.housing || typeof state.housing !== "object") state.housing = {};
  if (!state.buildings || typeof state.buildings !== "object") state.buildings = {};
  if (!state.merchant || typeof state.merchant !== "object") {
    state.merchant = {
      present: false,
      cash: 0,
      orders: [],
      storeFunds: 0
    };
  }

  if (!state.ui || typeof state.ui !== "object") state.ui = {};
  if (typeof state.ui.mainPage !== "string") state.ui.mainPage = "production";
  if (typeof state.ui.logFilter !== "string") state.ui.logFilter = "all";
  if (typeof state.ui.craftSmithyTab !== "string") state.ui.craftSmithyTab = "ingot";

  if (!state.ui.openSections || typeof state.ui.openSections !== "object") {
    state.ui.openSections = {};
  }
  if (!state.ui.openSections.resources || typeof state.ui.openSections.resources !== "object") {
    state.ui.openSections.resources = {};
  }
  if (!state.ui.openSections.crafts || typeof state.ui.openSections.crafts !== "object") {
    state.ui.openSections.crafts = {
      basic: true,
      cooking: false,
      grinding: false,
      smithy: false,
      alchemy: false,
      tailoring: false,
      processing: false,
      other: false
    };
  }
  if (typeof state.ui.openSections.crafts.processing !== "boolean") {
    state.ui.openSections.crafts.processing = false;
  }
  if (!state.ui.openSections.research || typeof state.ui.openSections.research !== "object") {
    state.ui.openSections.research = {
      books: true
    };
  }
  if (!state.ui.openSections.workers || typeof state.ui.openSections.workers !== "object") {
    state.ui.openSections.workers = {};
  }

  if (!state.currentAction || typeof state.currentAction !== "object") state.currentAction = null;
  if (!state.currentCraft || typeof state.currentCraft !== "object") state.currentCraft = null;
  if (!state.currentResearch || typeof state.currentResearch !== "object") state.currentResearch = null;

  if (typeof state.logFilter !== "string") state.logFilter = state.ui.logFilter || "all";
  state.ui.logFilter = state.logFilter;

  return state;
}

function safeCreateInitialState() {
  try {
    return ensureStateShape(createInitialState(stateOptions));
  } catch {
    return ensureStateShape({});
  }
}

function safeNormalizeState(raw) {
  try {
    return ensureStateShape(normalizeState(raw, stateOptions));
  } catch {
    return ensureStateShape(raw || {});
  }
}

function safeResetState(target) {
  try {
    resetState(target, stateOptions);
    return ensureStateShape(target);
  } catch {
    const fresh = safeCreateInitialState();
    Object.keys(target).forEach((key) => delete target[key]);
    Object.assign(target, fresh);
    return target;
  }
}

const state = safeCreateInitialState();
let lastFrameTime = performance.now();

function addLog(text, type = "important") {
  state.logs.unshift({
    time: nowTime(),
    text,
    type
  });

  state.logs = normalizeLogs(state.logs).slice(0, LOG_LIMIT);
}

function gainResource(id, amount) {
  if (!id) return;
  state.resources[id] = (state.resources[id] || 0) + amount;
}

function spendResource(id, amount) {
  if ((state.resources[id] || 0) < amount) return false;
  state.resources[id] -= amount;
  return true;
}

function canAfford(costs = {}) {
  return Object.entries(costs).every(([id, amount]) => {
    return (state.resources[id] || 0) >= amount;
  });
}

function spendCosts(costs = {}) {
  if (!canAfford(costs)) return false;

  Object.entries(costs).forEach(([id, amount]) => {
    state.resources[id] -= amount;
  });

  return true;
}

function addMainExp(amount) {
  state.exp += amount;

  while (state.exp >= getExpToNext(state.level)) {
    state.exp -= getExpToNext(state.level);
    state.level += 1;
    addLog(`主等級提升到 Lv.${state.level}`, "important");
  }
}

function addSkillExp(skillId, amount = 1) {
  if (!state.skills?.[skillId]) return;

  state.skills[skillId].exp += amount;

  while (state.skills[skillId].exp >= getExpToNext(state.skills[skillId].level)) {
    state.skills[skillId].exp -= getExpToNext(state.skills[skillId].level);
    state.skills[skillId].level += 1;
    addLog(
      `${skillLabels[skillId] || skillId} 等級提升到 Lv.${state.skills[skillId].level}`,
      "important"
    );
  }
}

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

function handleWarehouseResourceClick(resourceId) {
  if (typeof edibleValues[resourceId] === "number") {
    if (eatResource(resourceId)) {
      renderAll();
    }
    return;
  }

  if (typeof fuelDurations[resourceId] === "number") {
    if (addCampfireFuel(resourceId)) {
      renderAll();
    }
  }
}

function hasResource(id) {
  return Number(state.resources?.[id] || 0) > 0;
}

function getWorkSpeedBonus(workId = null) {
  let bonus = 0;

  if (workId === "lumber") {
    bonus += (state.buildings?.lumberMill || 0) * 0.10;
    bonus += hasResource("ironAxeTool")
      ? 0.25
      : hasResource("copperAxeTool")
      ? 0.20
      : hasResource("stoneAxeTool")
      ? 0.10
      : hasResource("woodAxeTool")
      ? 0.05
      : 0;
  }

  if (workId === "mining") {
    bonus += (state.buildings?.quarry || 0) * 0.10;
    bonus += hasResource("ironPickTool")
      ? 0.25
      : hasResource("copperPickTool")
      ? 0.20
      : hasResource("stonePickTool")
      ? 0.10
      : hasResource("woodPickTool")
      ? 0.05
      : 0;
  }

  if (workId === "digging") {
    bonus += (state.buildings?.quarry || 0) * 0.10;
    bonus += hasResource("ironShovelTool")
      ? 0.25
      : hasResource("copperShovelTool")
      ? 0.20
      : hasResource("shovelTool")
      ? 0.10
      : hasResource("woodShovelTool")
      ? 0.05
      : 0;
  }

  if (workId === "fishing") {
    bonus += (state.buildings?.fishingShack || 0) * 0.10;
    bonus += hasResource("ironFishingRodTool")
      ? 0.25
      : hasResource("copperFishingRodTool")
      ? 0.20
      : hasResource("fishingRodTool")
      ? 0.10
      : hasResource("woodFishingRodTool")
      ? 0.05
      : 0;
  }

  if (workId === "hunting") {
    bonus += hasResource("ironBowTool")
      ? 0.25
      : hasResource("copperBowTool")
      ? 0.20
      : hasResource("stoneBowTool")
      ? 0.12
      : hasResource("woodBowTool")
      ? 0.06
      : 0;
  }

  return bonus;
}

function getPlayerCycleTime(workId = null) {
  const raw = (1 + 0.02 * Number(state.intelligence || 0)) / 10;
  const capped = raw <= 1 ? raw : 1 + (raw - 1) * 0.35;
  const base = 1 / capped;
  const bonus = workId ? getWorkSpeedBonus(workId) : 0;
  return base / (1 + bonus);
}

function getProductionDurationUncapped(workId = null) {
  return getPlayerCycleTime(workId);
}

function getProductionDuration(workId = null) {
  return Math.max(PRODUCTION_MIN_CYCLE_SECONDS, getProductionDurationUncapped(workId));
}

const grindingCrafts = new Set([
  "flour",
  "boneMeal",
  "compost",
  "wheatSeedBundle",
  "coalPowder",
  "copperPowder",
  "ironPowder",
  "silverPowder",
  "goldPowder",
  "magnetitePowder",
  "crystalPowder",
  "gemPowder"
]);

const alchemyCrafts = new Set([
  "herbTonic",
  "staminaPotion",
  "paper",
  "ink",
  "note",
  "manual"
]);

const smithyCrafts = new Set([
  "ironFirewood",
  "ironCoal",
  "copperFirewood",
  "copperCoal",
  "woodAxeTool",
  "woodPickTool",
  "woodShovelTool",
  "woodCarvingKnifeTool",
  "woodHammerTool",
  "woodPotTool",
  "woodHoeTool",
  "woodPitchforkTool",
  "woodFishingRodTool",
  "woodBowTool",
  "stoneAxeTool",
  "stonePickTool",
  "shovelTool",
  "stoneCarvingKnifeTool",
  "stoneHammerTool",
  "stonePotTool",
  "stoneHoeTool",
  "stonePitchforkTool",
  "fishingRodTool",
  "stoneBowTool",
  "copperAxeTool",
  "copperPickTool",
  "copperShovelTool",
  "copperCarvingKnifeTool",
  "copperHammerTool",
  "copperPotTool",
  "copperHoeTool",
  "copperPitchforkTool",
  "copperFishingRodTool",
  "copperBowTool",
  "ironAxeTool",
  "ironPickTool",
  "ironShovelTool",
  "ironCarvingKnifeTool",
  "ironHammerTool",
  "ironPotTool",
  "ironHoeTool",
  "ironPitchforkTool",
  "ironFishingRodTool",
  "ironBowTool",
  "fishNetTool"
]);

const tailoringCrafts = new Set([
  "leather",
  "softLeather",
  "cottonThread",
  "cottonCloth",
  "grassThread",
  "grassCloth",
  "clothes"
]);

function getCraftSpeedBonus(craftId) {
  let bonus = 0;

  if (grindingCrafts.has(craftId)) {
    bonus += (state.buildings?.mill || 0) * 0.20;
    bonus += (state.buildings?.windmill || 0) * 0.15;
  }

  if (alchemyCrafts.has(craftId)) {
    bonus += (state.buildings?.alchemyHut || 0) * 0.20;
  }

  if (smithyCrafts.has(craftId)) {
    bonus += (state.buildings?.smithy || 0) * 0.20;
  }

  if (tailoringCrafts.has(craftId)) {
    bonus += (state.buildings?.tannery || 0) * 0.20;
  }

  return bonus;
}

function getCraftCycleTime(craftId = null) {
  const raw = (1 + 0.02 * Number(state.intelligence || 0)) / 10;
  const capped = raw <= 1 ? raw : 1 + (raw - 1) * 0.35;
  const base = 1 / capped;
  const bonus = craftId ? getCraftSpeedBonus(craftId) : 0;
  return base / (1 + bonus);
}

function getCraftDuration(def, craftId) {
  return Math.max(CRAFT_MIN_CYCLE_SECONDS, getCraftCycleTime(craftId));
}

function isCraftHidden(def) {
  return !!def.hidden;
}

function isCraftUnlocked(def) {
  if (!def.unlock) return true;
  return !!state.research?.[def.unlock];
}

function canStartCraft(def) {
  if (!def) return { ok: false, reason: "invalid" };
  if (isCraftHidden(def)) return { ok: false, reason: "hidden" };
  if (!isCraftUnlocked(def)) return { ok: false, reason: "locked" };

  const staminaCost = Math.max(1, Number(def.stamina ?? 1));
  if (state.stamina < staminaCost) return { ok: false, reason: "stamina" };
  if (!canAfford(def.costs || {})) return { ok: false, reason: "materials" };

  return { ok: true, reason: "" };
}

function queueWork(workId) {
  if (!Array.isArray(state.actionQueue)) state.actionQueue = [];

  if (state.actionQueue.length >= QUEUE_LIMIT) {
    addLog(`生產列隊已滿，最多等待 ${QUEUE_LIMIT} 項`, "important");
    return false;
  }

  state.actionQueue.push(workId);
  addLog(`已加入生產列隊：${workDefs[workId]?.name || workId}`, "important");
  return true;
}

function startWorkNow(workId) {
  workSystem.requestWork(workId);

  if (state.currentAction && state.currentAction.id === workId) {
    const duration = getProductionDuration(workId);
    state.currentAction.total = duration;
    state.currentAction.remaining = duration;
    return true;
  }

  return false;
}

function tryStartNextWork() {
  if (state.currentAction) return false;
  if (!Array.isArray(state.actionQueue) || state.actionQueue.length === 0) return false;

  const nextId = state.actionQueue[0];
  const def = workDefs[nextId];
  if (!def) {
    state.actionQueue.shift();
    return tryStartNextWork();
  }

  if (state.stamina < getWorkCost(def)) {
    return false;
  }

  state.actionQueue.shift();
  return startWorkNow(nextId);
}

function beginCraft(craftId, { silent = false } = {}) {
  const def = crafts[craftId];
  const check = canStartCraft(def);

  if (!check.ok) {
    if (!silent) {
      if (check.reason === "hidden") {
        addLog(`${def?.name || craftId}目前不可見`, "important");
      } else if (check.reason === "locked") {
        addLog(`${def?.name || craftId}尚未解鎖，需要研究：${def?.unlock}`, "important");
      } else if (check.reason === "stamina") {
        addLog(`${def?.name || craftId}製作失敗，體力不足`, "important");
      } else if (check.reason === "materials") {
        addLog(`${def?.name || craftId}製作失敗，材料不足`, "important");
      }
    }
    return false;
  }

  const staminaCost = Math.max(1, Number(def.stamina ?? 1));
  spendCosts(def.costs || {});
  state.stamina -= staminaCost;

  const duration = getCraftDuration(def, craftId);

  state.currentCraft = {
    id: craftId,
    total: duration,
    remaining: duration
  };

  if (!silent) {
    addLog(`開始製作：${def.name}`, "important");
  }

  return true;
}

function finishCurrentCraft() {
  if (!state.currentCraft) return;

  const craftId = state.currentCraft.id;
  const def = crafts[craftId];
  state.currentCraft = null;

  if (!def) return;

  for (const [resourceId, amount] of Object.entries(def.yields || {})) {
    gainResource(resourceId, amount);
  }

  addMainExp(1);

  if (def.skill) {
    addSkillExp(def.skill, 1);
  }

  const gainText = Object.entries(def.yields || {})
    .map(([id, amount]) => `${getResourceLabel(id)} +${amount}`)
    .join("、");

  addLog(`你製作了 ${def.name}，獲得 ${gainText}，經驗 +1`, "loot");
}

function queueCraft(craftId) {
  if (!Array.isArray(state.craftQueue)) state.craftQueue = [];

  if (state.craftQueue.length >= QUEUE_LIMIT) {
    addLog(`製作列隊已滿，最多等待 ${QUEUE_LIMIT} 項`, "important");
    return false;
  }

  state.craftQueue.push(craftId);
  addLog(`已加入製作列隊：${crafts[craftId]?.name || craftId}`, "important");
  return true;
}

function tryStartNextCraft() {
  if (state.currentCraft) return false;
  if (!Array.isArray(state.craftQueue) || state.craftQueue.length === 0) return false;

  const nextId = state.craftQueue[0];
  const def = crafts[nextId];
  const check = canStartCraft(def);

  if (!check.ok) {
    if (check.reason === "hidden" || check.reason === "locked" || check.reason === "invalid") {
      state.craftQueue.shift();
      return tryStartNextCraft();
    }
    return false;
  }

  state.craftQueue.shift();
  return beginCraft(nextId, { silent: true });
}

function updateCraft(deltaSeconds) {
  if (!state.currentCraft) return;

  state.currentCraft.remaining = Math.max(
    0,
    Number(state.currentCraft.remaining || 0) - deltaSeconds
  );

  if (state.currentCraft.remaining <= 0) {
    finishCurrentCraft();
  }
}

function craftItem(craftId) {
  if (state.currentCraft) {
    return queueCraft(craftId);
  }

  return beginCraft(craftId);
}

function saveGame() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    addLog("已存檔", "important");
    renderAll();
  } catch (error) {
    console.error(error);
    addLog("存檔失敗", "important");
    renderAll();
  }
}

function loadGame({ silent = false } = {}) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (!silent) {
        addLog("沒有存檔", "important");
        renderAll();
      }
      return false;
    }

    const data = safeNormalizeState(JSON.parse(raw));

    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, data);

    state.stamina = clamp(state.stamina, 0, getMaxStamina(state));

    if (!silent) {
      addLog("已讀檔", "important");
    }

    renderAll();
    return true;
  } catch (error) {
    console.error(error);
    if (!silent) {
      addLog("讀檔失敗", "important");
      renderAll();
    }
    return false;
  }
}

function resetGame() {
  localStorage.removeItem(STORAGE_KEY);
  safeResetState(state);
  addLog("已重置存檔", "important");
  renderAll();
}

function setMainPage(pageName) {
  state.ui.mainPage = pageName;

  document.querySelectorAll("[data-main-page]").forEach((panel) => {
    panel.classList.toggle("page-hidden", panel.dataset.mainPage !== pageName);
  });

  document.querySelectorAll("[data-main-nav]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mainNav === pageName);
  });
}

function syncDerivedResearchUnlocks() {
  Object.entries(researchDefs).forEach(([researchId, def]) => {
    if (!state.research[researchId]) return;

    if (def.unlockCraft) state.research[def.unlockCraft] = true;
    if (def.unlockBuild) state.research[def.unlockBuild] = true;
    if (def.unlockHouse) state.research[def.unlockHouse] = true;
  });
}

const workSystem = createWorkSystem({
  state,
  addLog,
  addMainExp,
  gainResource
});

const researchSystem = createResearchSystem({
  state,
  addLog,
  gainResource,
  countBuiltPlots: () => 0
});

function showFeatureStub(featureName) {
  addLog(`${featureName}功能尚未接回 main.js`, "important");
  renderAll();
}

function renderPlaceholders() {
  const setPlaceholder = (id, text) => {
    const el = document.getElementById(id);
    if (el && !el.innerHTML.trim()) {
      el.innerHTML = `<div class="small muted">${text}</div>`;
    }
  };

  setPlaceholder("buildingButtons", "建築系統尚未接回 main.js");
  setPlaceholder("plots", "農田系統尚未接回 main.js");
  setPlaceholder("pastureArea", "牧場系統尚未接回 main.js");
  setPlaceholder("merchantArea", "商人 / 貿易系統尚未接回 main.js");
  setPlaceholder("workers", "工人系統尚未接回 main.js");
}

function renderHeaderStats() {
  const activeWorkId = state.currentAction?.id || null;

  renderTopStats({
    state,
    getExpToNext,
    getMaxStamina,
    formatReadableDuration,
    getCycleTimeText: () =>
      activeWorkId ? getProductionDuration(activeWorkId).toFixed(2) : getProductionDuration().toFixed(2),
    getCampfireBarPercent: (s) =>
      Math.min(100, Math.max(0, (Number(s.campfireSec || 0) / 180) * 100))
  });

  renderSkillPills({
    state,
    skillLabels,
    expToNext: getExpToNext
  });
}

function renderAll() {
  syncDerivedResearchUnlocks();

  renderHeaderStats();

  renderResources({
    state,
    getResourceLabel,
    edibleValues,
    fuelDurations,
    isResourceClickable: isWarehouseResourceClickable,
    getResourceHint: getWarehouseResourceHint,
    onResourceClick: handleWarehouseResourceClick
  });

  renderWorkButtons({
    workDefs,
    getWorkCost,
    getWorkDuration: (def, id) => getProductionDuration(id),
    formatSeconds,
    onWorkClick: (workId) => {
      if (state.currentAction) {
        queueWork(workId);
      } else {
        startWorkNow(workId);
      }
      renderAll();
    }
  });

  renderCraftList({
    state,
    crafts,
    getResourceLabel,
    isCraftHidden,
    isCraftUnlocked,
    onCraftClick: (craftId) => {
      craftItem(craftId);
      renderAll();
    },
    getCraftDuration,
    formatSeconds
  });

  renderResearchArea({
    state,
    books,
    researchDefs,
    formatSeconds,
    getMissingRequirementText: researchSystem.getMissingRequirementText,
    isResearchCompleted: researchSystem.isResearchCompleted,
    meetsResearchRequirements: researchSystem.meetsResearchRequirements,
    onStartResearch: (researchId) => {
      researchSystem.startResearch(researchId);
      renderAll();
    },
    onReadBook: (bookId) => {
      researchSystem.startReading(bookId);
      renderAll();
    }
  });

  renderActionLane({
    state,
    workDefs,
    getWorkCost,
    formatSeconds
  });

  renderCraftLane({
    state,
    crafts,
    formatSeconds
  });

  renderResearchLane({
    state,
    formatSeconds
  });

  renderLog({ state });

  renderPlaceholders();
}

function loop(now) {
  const deltaSeconds = Math.min(0.2, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  state.campfireSec = Math.max(0, Number(state.campfireSec || 0) - deltaSeconds);

  workSystem.updateAction(deltaSeconds);
  updateCraft(deltaSeconds);
  researchSystem.updateResearch(deltaSeconds);

  if (!state.currentAction && state.actionQueue?.length > 0) {
    const nextId = state.actionQueue[0];
    const nextDef = workDefs[nextId];
    if (nextDef && state.stamina >= getWorkCost(nextDef)) {
      tryStartNextWork();
    }
  }

  if (state.currentCraft && state.currentCraft.remaining <= 0) {
    tryStartNextCraft();
  } else if (!state.currentCraft && state.craftQueue?.length > 0) {
    tryStartNextCraft();
  }

  renderHeaderStats();

  renderActionLane({
    state,
    workDefs,
    getWorkCost,
    formatSeconds
  });

  renderCraftLane({
    state,
    crafts,
    formatSeconds
  });

  renderResearchLane({
    state,
    formatSeconds
  });

  requestAnimationFrame(loop);
}

function init() {
  loadGame({ silent: true });

  bindEvents({
    onRest: () => {
      rest();
      renderAll();
    },
    onEatBest: () => {
      eatBestFood();
      renderAll();
    },
    onSave: saveGame,
    onLoad: () => loadGame(),
    onResetConfirm: resetGame,
    onCancelAction: () => {
      workSystem.cancelCurrentAction?.();
      state.actionQueue = [];
      renderAll();
    },
    onClearActionQueue: () => {
      state.actionQueue = [];
      renderAll();
    },
    onSetLogFilter: (filter) => {
      state.logFilter = filter;
      if (!state.ui) state.ui = {};
      state.ui.logFilter = filter;
      renderLog({ state });
    },
    onSetMainPage: (pageName) => {
      setMainPage(pageName);
    },
    onClaimTax: () => showFeatureStub("稅收"),
    onPayDebt: () => showFeatureStub("支付欠薪"),
    onRecruitWorker: () => showFeatureStub("招募工人"),
    onOpenSeedSelect: () => showFeatureStub("種子選擇"),
    onPlant: () => showFeatureStub("種植"),
    onToggleFarmerSeedMode: () => showFeatureStub("農夫種植模式"),
    onToggleFarmerAutoFertilize: () => showFeatureStub("自動施肥")
  });

  setMainPage(state.ui.mainPage || "production");
  renderAll();
  requestAnimationFrame(loop);
}

init();
