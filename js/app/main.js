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
import { showActionModal } from "../ui/modals.js";

const STORAGE_KEY = "city_lord_modular_min_v0.0.0.1";
const LOG_LIMIT = 100;
const QUEUE_LIMIT = 3;
const IDLE_REGEN_PER_SEC = 0.1;
const REST_REGEN_PER_SEC = 5;

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
  return m <= 0 ? `${s}s` : `${m}m${String(s).padStart(2, "0")}s`;
}

function getExpToNext(level) {
  return Math.round(5 + 2.5 * level * (level - 1));
}

function getMaxStamina(targetState = state) {
  return 100 + Math.max(0, Number(targetState?.staminaLevel || 1) - 1) * 10;
}

function getRestEfficiencyBonus(targetState = state) {
  return Math.min(0.6, Math.max(0, Number(targetState?.staminaLevel || 1) - 1) * 0.02);
}

function getFoodEffectivenessBonus(targetState = state) {
  return Math.min(0.4, Math.max(0, Number(targetState?.staminaLevel || 1) - 1) * 0.01);
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
      if (typeof item === "string") return { time: "", text: item, type: "important" };
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

function normalizeQueueEntries(queue = []) {
  return (Array.isArray(queue) ? queue : [])
    .map((item) => {
      if (typeof item === "string") {
        return { id: item, count: 1, infinite: false };
      }
      const infinite = !!item?.infinite || Number(item?.count) < 0;
      return {
        id: item?.id,
        count: infinite ? -1 : Math.max(1, Math.floor(Number(item?.count || 1))),
        infinite
      };
    })
    .filter((item) => typeof item.id === "string" && item.id);
}

function getQueuedId(item) {
  return typeof item === "string" ? item : item?.id;
}

function getQueuedCount(item) {
  if (typeof item === "string") return 1;
  if (item?.infinite || Number(item?.count) < 0) return -1;
  return Math.max(1, Math.floor(Number(item?.count || 1)));
}

function formatBundleText(bundle = {}) {
  const entries = Object.entries(bundle);
  if (!entries.length) return "無";
  return entries.map(([id, amount]) => `${getResourceLabel(id)} ${amount}`).join("、");
}

function ensureStateShape(s = {}) {
  const target = s;

  target.gold = Number(target.gold || 0);
  target.level = Math.max(1, Number(target.level || 1));
  target.exp = Math.max(0, Number(target.exp || 0));
  target.intelligence = Math.max(0, Number(target.intelligence || 0));

  target.staminaLevel = Math.max(1, Number(target.staminaLevel || 1));
  target.staminaExp = Math.max(0, Number(target.staminaExp || 0));
  target.stamina = clamp(Number(target.stamina ?? getMaxStamina(target)), 0, getMaxStamina(target));
  target.isResting = !!target.isResting;

  target.managementLevel = Math.max(1, Number(target.managementLevel || 1));
  target.managementExp = Math.max(0, Number(target.managementExp || 0));

  target.tradeLevel = Math.max(1, Number(target.tradeLevel || 1));
  target.tradeExp = Math.max(0, Number(target.tradeExp || 0));
  target.reputation = Math.max(0, Number(target.reputation || 0));

  target.castleLevel = Math.max(1, Number(target.castleLevel || 1));
  target.castleExp = Math.max(0, Number(target.castleExp || 0));
  target.safetyValue = Math.max(0, Number(target.safetyValue || 0));

  target.pendingTax = Math.max(0, Number(target.pendingTax || 0));
  target.campfireSec = Math.max(0, Number(target.campfireSec || 0));
  target.housingCap = Math.max(0, Number(target.housingCap || 0));

  target.resources = { ...createDefaultResources(), ...(target.resources || {}) };
  target.skills = { ...createDefaultSkills(), ...(target.skills || {}) };
  Object.keys(skillLabels).forEach((id) => {
    target.skills[id] = {
      level: Math.max(1, Number(target.skills[id]?.level || 1)),
      exp: Math.max(0, Number(target.skills[id]?.exp || 0))
    };
  });

  target.logs = normalizeLogs(target.logs);
  if (!Array.isArray(target.workers)) target.workers = [];
  target.actionQueue = normalizeQueueEntries(target.actionQueue);
  target.craftQueue = normalizeQueueEntries(target.craftQueue);
  if (!Array.isArray(target.researchQueue)) target.researchQueue = [];

  if (!target.research || typeof target.research !== "object") target.research = {};
  if (!target.housing || typeof target.housing !== "object") target.housing = {};
  if (!target.buildings || typeof target.buildings !== "object") target.buildings = {};
  if (!target.merchant || typeof target.merchant !== "object") {
    target.merchant = { present: false, cash: 0, orders: [], storeFunds: 0 };
  }

  if (!target.ui || typeof target.ui !== "object") target.ui = {};
  if (typeof target.ui.mainPage !== "string") target.ui.mainPage = "production";
  if (typeof target.ui.logFilter !== "string") target.ui.logFilter = "all";
  if (typeof target.ui.craftSmithyTab !== "string") target.ui.craftSmithyTab = "ingot";

  if (!target.ui.openSections || typeof target.ui.openSections !== "object") target.ui.openSections = {};
  if (!target.ui.openSections.resources || typeof target.ui.openSections.resources !== "object") target.ui.openSections.resources = {};
  if (!target.ui.openSections.crafts || typeof target.ui.openSections.crafts !== "object") {
    target.ui.openSections.crafts = {
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
  if (!target.ui.openSections.research || typeof target.ui.openSections.research !== "object") {
    target.ui.openSections.research = { books: true };
  }
  if (!target.ui.openSections.workers || typeof target.ui.openSections.workers !== "object") {
    target.ui.openSections.workers = {};
  }

  if (!target.currentAction || typeof target.currentAction !== "object") target.currentAction = null;
  if (!target.currentCraft || typeof target.currentCraft !== "object") target.currentCraft = null;
  if (!target.currentResearch || typeof target.currentResearch !== "object") target.currentResearch = null;

  if (typeof target.logFilter !== "string") target.logFilter = target.ui.logFilter || "all";
  target.ui.logFilter = target.logFilter;
  return target;
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
  state.logs.unshift({ time: nowTime(), text, type });
  state.logs = normalizeLogs(state.logs).slice(0, LOG_LIMIT);
}

function addStaminaExp(amount) {
  const gain = Math.max(0, Number(amount || 0));
  if (gain <= 0) return;
  state.staminaExp += gain;
  while (state.staminaExp >= getExpToNext(state.staminaLevel)) {
    state.staminaExp -= getExpToNext(state.staminaLevel);
    state.staminaLevel += 1;
    state.stamina = Math.min(getMaxStamina(state), state.stamina + 10);
    addLog(`體力等級提升到 Lv.${state.staminaLevel}`, "important");
  }
}

function spendPlayerStamina(amount) {
  const need = Math.max(0, Number(amount || 0));
  if (need <= 0) return true;
  if (state.stamina < need) return false;
  state.stamina -= need;
  addStaminaExp(need);
  return true;
}

function restoreStamina(amount, { silent = true } = {}) {
  const boosted = Math.max(0, Number(amount || 0));
  if (boosted <= 0) return 0;
  const before = state.stamina;
  state.stamina = clamp(state.stamina + boosted, 0, getMaxStamina(state));
  const actual = state.stamina - before;
  if (!silent && actual > 0) addLog(`體力恢復 ${actual.toFixed(1)}`, "important");
  return actual;
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
  return Object.entries(costs).every(([id, amount]) => (state.resources[id] || 0) >= amount);
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
    addLog(`${skillLabels[skillId] || skillId} 等級提升到 Lv.${state.skills[skillId].level}`, "important");
  }
}

function getBestFoodId() {
  for (const id of foodOrder) {
    if ((state.resources[id] || 0) > 0 && typeof edibleValues[id] === "number") return id;
  }
  return "";
}

function toggleRest() {
  if (state.isResting) {
    state.isResting = false;
    addLog("已停止休息", "important");
    return;
  }

  if (state.currentAction) {
    const name = workDefs[state.currentAction.id]?.name || "目前工作";
    workSystem.cancelCurrentAction?.();
    addLog(`開始休息，已停止 ${name}`, "important");
  } else {
    addLog("開始休息", "important");
  }

  state.isResting = true;
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
  let actual = 0;
  if (value >= 0) {
    actual = restoreStamina(value * (1 + getFoodEffectivenessBonus(state)));
  } else {
    const before = state.stamina;
    state.stamina = clamp(state.stamina + value, 0, getMaxStamina(state));
    actual = state.stamina - before;
  }

  addLog(`你使用了 1 個${label}，體力變化 ${actual >= 0 ? "+" : ""}${actual.toFixed(1)}`, "important");
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
  return typeof edibleValues[resourceId] === "number" || typeof fuelDurations[resourceId] === "number";
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
    if (eatResource(resourceId)) renderAll();
    return;
  }
  if (typeof fuelDurations[resourceId] === "number") {
    if (addCampfireFuel(resourceId)) renderAll();
  }
}

function hasResource(id) {
  return Number(state.resources?.[id] || 0) > 0;
}

function getWorkSpeedBonus(workId = null) {
  let bonus = 0;
  if (workId === "lumber") {
    bonus += (state.buildings?.lumberMill || 0) * 0.1;
    bonus += hasResource("ironAxeTool") ? 0.25 : hasResource("copperAxeTool") ? 0.2 : hasResource("stoneAxeTool") ? 0.1 : hasResource("woodAxeTool") ? 0.05 : 0;
  }
  if (workId === "mining") {
    bonus += (state.buildings?.quarry || 0) * 0.1;
    bonus += hasResource("ironPickTool") ? 0.25 : hasResource("copperPickTool") ? 0.2 : hasResource("stonePickTool") ? 0.1 : hasResource("woodPickTool") ? 0.05 : 0;
  }
  if (workId === "digging") {
    bonus += (state.buildings?.quarry || 0) * 0.1;
    bonus += hasResource("ironShovelTool") ? 0.25 : hasResource("copperShovelTool") ? 0.2 : hasResource("shovelTool") ? 0.1 : hasResource("woodShovelTool") ? 0.05 : 0;
  }
  if (workId === "fishing") {
    bonus += (state.buildings?.fishingShack || 0) * 0.1;
    bonus += hasResource("ironFishingRodTool") ? 0.25 : hasResource("copperFishingRodTool") ? 0.2 : hasResource("fishingRodTool") ? 0.1 : hasResource("woodFishingRodTool") ? 0.05 : 0;
  }
  if (workId === "hunting") {
    bonus += hasResource("ironBowTool") ? 0.25 : hasResource("copperBowTool") ? 0.2 : hasResource("stoneBowTool") ? 0.12 : hasResource("woodBowTool") ? 0.06 : 0;
  }
  if (state.campfireSec > 0) bonus += 0.1;
  return bonus;
}

function getProductionDuration(workId = null) {
  const raw = (1 + 0.02 * Number(state.intelligence || 0)) / 10;
  const capped = raw <= 1 ? raw : 1 + (raw - 1) * 0.35;
  const base = 1 / capped;
  const bonus = workId ? getWorkSpeedBonus(workId) : 0;
  return Math.max(5, base / (1 + bonus));
}

const grindingCrafts = new Set(["flour", "boneMeal", "compost", "wheatSeedBundle", "coalPowder", "copperPowder", "ironPowder", "silverPowder", "goldPowder", "magnetitePowder", "crystalPowder", "gemPowder"]);
const alchemyCrafts = new Set(["herbTonic", "staminaPotion", "paper", "ink", "note", "manual"]);
const smithyCrafts = new Set(["ironFirewood", "ironCoal", "copperFirewood", "copperCoal", "woodAxeTool", "woodPickTool", "woodShovelTool", "woodCarvingKnifeTool", "woodHammerTool", "woodPotTool", "woodHoeTool", "woodPitchforkTool", "woodFishingRodTool", "woodBowTool", "stoneAxeTool", "stonePickTool", "shovelTool", "stoneCarvingKnifeTool", "stoneHammerTool", "stonePotTool", "stoneHoeTool", "stonePitchforkTool", "fishingRodTool", "stoneBowTool", "copperAxeTool", "copperPickTool", "copperShovelTool", "copperCarvingKnifeTool", "copperHammerTool", "copperPotTool", "copperHoeTool", "copperPitchforkTool", "copperFishingRodTool", "copperBowTool", "ironAxeTool", "ironPickTool", "ironShovelTool", "ironCarvingKnifeTool", "ironHammerTool", "ironPotTool", "ironHoeTool", "ironPitchforkTool", "ironFishingRodTool", "ironBowTool", "fishNetTool"]);
const tailoringCrafts = new Set(["leather", "softLeather", "cottonThread", "cottonCloth", "grassThread", "grassCloth", "clothes"]);

function getCraftSpeedBonus(craftId) {
  let bonus = state.campfireSec > 0 ? 0.1 : 0;
  if (grindingCrafts.has(craftId)) {
    bonus += (state.buildings?.mill || 0) * 0.2;
    bonus += (state.buildings?.windmill || 0) * 0.15;
  }
  if (alchemyCrafts.has(craftId)) bonus += (state.buildings?.alchemyHut || 0) * 0.2;
  if (smithyCrafts.has(craftId)) bonus += (state.buildings?.smithy || 0) * 0.2;
  if (tailoringCrafts.has(craftId)) bonus += (state.buildings?.tannery || 0) * 0.2;
  return bonus;
}

function getCraftDuration(def, craftId) {
  const raw = (1 + 0.02 * Number(state.intelligence || 0)) / 10;
  const capped = raw <= 1 ? raw : 1 + (raw - 1) * 0.35;
  const base = 1 / capped;
  return Math.max(5, base / (1 + getCraftSpeedBonus(craftId)));
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

function beginCraft(craftId, { silent = false } = {}) {
  const def = crafts[craftId];
  const check = canStartCraft(def);
  if (!check.ok) {
    if (!silent) {
      if (check.reason === "hidden") addLog(`${def?.name || craftId}目前不可見`, "important");
      else if (check.reason === "locked") addLog(`${def?.name || craftId}尚未解鎖，需要研究：${def?.unlock}`, "important");
      else if (check.reason === "stamina") addLog(`${def?.name || craftId}製作失敗，體力不足`, "important");
      else if (check.reason === "materials") addLog(`${def?.name || craftId}製作失敗，材料不足`, "important");
    }
    return false;
  }

  const staminaCost = Math.max(1, Number(def.stamina ?? 1));
  if (!spendPlayerStamina(staminaCost)) return false;
  if (!spendCosts(def.costs || {})) return false;

  const duration = getCraftDuration(def, craftId);
  state.currentCraft = { id: craftId, total: duration, remaining: duration };
  if (!silent) addLog(`開始製作：${def.name}`, "important");
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
  if (def.skill) addSkillExp(def.skill, 1);

  const gainText = Object.entries(def.yields || {})
    .map(([id, amount]) => `${getResourceLabel(id)} +${amount}`)
    .join("、");
  addLog(`你製作了 ${def.name}，獲得 ${gainText}，經驗 +1`, "loot");
}

function updateCraft(deltaSeconds) {
  if (!state.currentCraft) return;
  state.currentCraft.remaining = Math.max(0, Number(state.currentCraft.remaining || 0) - deltaSeconds);
  if (state.currentCraft.remaining <= 0) finishCurrentCraft();
}

function queueWork(workId, count = 1, infinite = false) {
  if (!Array.isArray(state.actionQueue)) state.actionQueue = [];
  if (state.actionQueue.length >= QUEUE_LIMIT) {
    addLog(`行動列隊已滿，最多等待 ${QUEUE_LIMIT} 項`, "important");
    return false;
  }
  const qty = infinite ? -1 : Math.max(1, Math.floor(Number(count || 1)));
  state.actionQueue.push({ id: workId, count: qty, infinite: !!infinite });
  addLog(`已加入行動列隊：${workDefs[workId]?.name || workId} × ${qty < 0 ? "∞" : qty}`, "important");
  return true;
}

function startWorkNow(workId) {
  const def = workDefs[workId];
  if (!def) return false;
  if (state.isResting) state.isResting = false;
  if (!spendPlayerStamina(getWorkCost(def))) {
    addLog(`${def.name}無法開始，體力不足`, "important");
    return false;
  }
  return workSystem.requestWork(workId);
}

function startWorkPlan(workId, count = 1, infinite = false) {
  const qty = infinite ? -1 : Math.max(1, Math.floor(Number(count || 1)));
  if (state.currentAction) return queueWork(workId, count, infinite);

  const ok = startWorkNow(workId);
  if (!ok) return false;

  if (qty < 0) {
    if (state.actionQueue.length < QUEUE_LIMIT) {
      state.actionQueue.unshift({ id: workId, count: -1, infinite: true });
      addLog(`已開始 ${workDefs[workId]?.name || workId} 的無限生產`, "important");
    }
    return true;
  }

  if (qty > 1) {
    if (state.actionQueue.length < QUEUE_LIMIT) {
      state.actionQueue.unshift({ id: workId, count: qty - 1, infinite: false });
      addLog(`已安排 ${workDefs[workId]?.name || workId} 連續進行 ${qty} 次`, "important");
    } else {
      addLog(`已開始 ${workDefs[workId]?.name || workId}，但列隊已滿，剩餘 ${qty - 1} 次未加入`, "important");
    }
  }
  return true;
}

function tryStartNextWork() {
  if (state.currentAction) return false;
  if (!Array.isArray(state.actionQueue) || state.actionQueue.length === 0) return false;

  const next = state.actionQueue[0];
  const nextId = getQueuedId(next);
  const nextCount = getQueuedCount(next);
  const nextDef = workDefs[nextId];

  if (!nextDef) {
    state.actionQueue.shift();
    return tryStartNextWork();
  }
  if (state.stamina < getWorkCost(nextDef)) return false;

  const ok = startWorkNow(nextId);
  if (!ok) return false;

  if (nextCount < 0) {
    state.actionQueue[0] = { id: nextId, count: -1, infinite: true };
    return true;
  }
  if (nextCount <= 1) {
    state.actionQueue.shift();
  } else {
    state.actionQueue[0] = { id: nextId, count: nextCount - 1, infinite: false };
  }
  return true;
}

function removeQueuedAction(index) {
  if (!Array.isArray(state.actionQueue)) return false;
  if (index < 0 || index >= state.actionQueue.length) return false;
  const [removed] = state.actionQueue.splice(index, 1);
  if (removed) {
    const count = getQueuedCount(removed);
    addLog(`已移除行動列隊：${workDefs[getQueuedId(removed)]?.name || getQueuedId(removed)} × ${count < 0 ? "∞" : count}`, "important");
    return true;
  }
  return false;
}

function moveQueuedAction(index, direction) {
  if (!Array.isArray(state.actionQueue)) return false;
  const targetIndex = index + direction;
  if (index < 0 || index >= state.actionQueue.length || targetIndex < 0 || targetIndex >= state.actionQueue.length) return false;
  const temp = state.actionQueue[index];
  state.actionQueue[index] = state.actionQueue[targetIndex];
  state.actionQueue[targetIndex] = temp;
  return true;
}

function queueCraft(craftId, count = 1, infinite = false) {
  if (!Array.isArray(state.craftQueue)) state.craftQueue = [];
  if (state.craftQueue.length >= QUEUE_LIMIT) {
    addLog(`製作列隊已滿，最多等待 ${QUEUE_LIMIT} 項`, "important");
    return false;
  }
  const qty = infinite ? -1 : Math.max(1, Math.floor(Number(count || 1)));
  state.craftQueue.push({ id: craftId, count: qty, infinite: !!infinite });
  addLog(`已加入製作列隊：${crafts[craftId]?.name || craftId} × ${qty < 0 ? "∞" : qty}`, "important");
  return true;
}

function startCraftPlan(craftId, count = 1, infinite = false) {
  const qty = infinite ? -1 : Math.max(1, Math.floor(Number(count || 1)));
  if (state.currentCraft) return queueCraft(craftId, count, infinite);

  const ok = beginCraft(craftId);
  if (!ok) return false;

  if (qty < 0) {
    if (state.craftQueue.length < QUEUE_LIMIT) {
      state.craftQueue.unshift({ id: craftId, count: -1, infinite: true });
      addLog(`已開始 ${crafts[craftId]?.name || craftId} 的無限製作`, "important");
    }
    return true;
  }

  if (qty > 1) {
    if (state.craftQueue.length < QUEUE_LIMIT) {
      state.craftQueue.unshift({ id: craftId, count: qty - 1, infinite: false });
      addLog(`已安排 ${crafts[craftId]?.name || craftId} 連續製作 ${qty} 次`, "important");
    } else {
      addLog(`已開始 ${crafts[craftId]?.name || craftId}，但列隊已滿，剩餘 ${qty - 1} 次未加入`, "important");
    }
  }
  return true;
}

function tryStartNextCraft() {
  if (state.currentCraft) return false;
  if (!Array.isArray(state.craftQueue) || state.craftQueue.length === 0) return false;

  const next = state.craftQueue[0];
  const nextId = getQueuedId(next);
  const nextCount = getQueuedCount(next);
  const def = crafts[nextId];
  const check = canStartCraft(def);

  if (!check.ok) {
    if (["hidden", "locked", "invalid"].includes(check.reason)) {
      state.craftQueue.shift();
      return tryStartNextCraft();
    }
    return false;
  }

  const ok = beginCraft(nextId, { silent: true });
  if (!ok) return false;

  if (nextCount < 0) {
    state.craftQueue[0] = { id: nextId, count: -1, infinite: true };
    return true;
  }
  if (nextCount <= 1) {
    state.craftQueue.shift();
  } else {
    state.craftQueue[0] = { id: nextId, count: nextCount - 1, infinite: false };
  }
  return true;
}

function removeQueuedCraft(index) {
  if (!Array.isArray(state.craftQueue)) return false;
  if (index < 0 || index >= state.craftQueue.length) return false;
  const [removed] = state.craftQueue.splice(index, 1);
  if (removed) {
    const count = getQueuedCount(removed);
    addLog(`已移除製作列隊：${crafts[getQueuedId(removed)]?.name || getQueuedId(removed)} × ${count < 0 ? "∞" : count}`, "important");
    return true;
  }
  return false;
}

function moveQueuedCraft(index, direction) {
  if (!Array.isArray(state.craftQueue)) return false;
  const targetIndex = index + direction;
  if (index < 0 || index >= state.craftQueue.length || targetIndex < 0 || targetIndex >= state.craftQueue.length) return false;
  const temp = state.craftQueue[index];
  state.craftQueue[index] = state.craftQueue[targetIndex];
  state.craftQueue[targetIndex] = temp;
  return true;
}

const workSystem = createWorkSystem({ state, addLog, addMainExp, gainResource, addSkillExp });
const researchSystem = createResearchSystem({ state, addLog, gainResource, countBuiltPlots: () => 0 });

function openWorkActionModal(workId) {
  const def = workDefs[workId];
  if (!def) return;
  const busy = !!state.currentAction;

  showActionModal({
    title: def.name,
    description: [
      `單次體力：${getWorkCost(def)}`,
      `生產節奏：${formatSeconds(getProductionDuration(workId))}`,
      `單次普通經驗：1`,
      `單次${skillLabels[def.skill]}經驗：1`
    ].join("\n"),
    quantity: 1,
    quantityHint: busy ? "目前生產線忙碌中，可加入列隊" : "目前沒有工作進行中，請直接按「立即開始」",
    quickButtons: [1, 10, 50, 100, "∞"],
    allowQueue: busy,
    allowStart: true,
    onQueue: (qty, isInfinite) => {
      queueWork(workId, qty, isInfinite);
      renderAll();
    },
    onStart: (qty, isInfinite) => {
      startWorkPlan(workId, qty, isInfinite);
      renderAll();
    }
  });
}

function openCraftActionModal(craftId) {
  const def = crafts[craftId];
  if (!def) return;
  const busy = !!state.currentCraft;

  showActionModal({
    title: def.name,
    description: [
      `單次體力：${def.stamina ?? 1}`,
      `製作節奏：${formatSeconds(getCraftDuration(def, craftId))}`,
      `配方：${formatBundleText(def.costs || {})} → ${formatBundleText(def.yields || {})}`,
      `單次${skillLabels[def.skill] || def.skill}經驗：1`
    ].join("\n"),
    quantity: 1,
    quantityHint: busy ? "目前製作線忙碌中，可加入列隊" : "目前沒有製作進行中，請直接按「立即開始」",
    quickButtons: [1, 10, 50, 100, "∞"],
    allowQueue: busy,
    allowStart: true,
    onQueue: (qty, isInfinite) => {
      queueCraft(craftId, qty, isInfinite);
      renderAll();
    },
    onStart: (qty, isInfinite) => {
      startCraftPlan(craftId, qty, isInfinite);
      renderAll();
    }
  });
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
    if (!silent) addLog("已讀檔", "important");
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

function updateRestButton() {
  const restBtn = document.getElementById("restBtn");
  if (!restBtn) return;
  restBtn.textContent = state.isResting ? "停止休息" : "開始休息";
  restBtn.classList.toggle("active", state.isResting);
}

function renderHeaderStats() {
  const activeWorkId = state.currentAction?.id || null;
  renderTopStats({
    state,
    getExpToNext,
    getMaxStamina,
    formatReadableDuration,
    getCycleTimeText: () => (activeWorkId ? getProductionDuration(activeWorkId).toFixed(2) : getProductionDuration().toFixed(2)),
    getCampfireBarPercent: (s) => Math.min(100, Math.max(0, (Number(s.campfireSec || 0) / 180) * 100))
  });

  renderSkillPills({ state, skillLabels, expToNext: getExpToNext });
  updateRestButton();
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
    onWorkClick: (workId) => openWorkActionModal(workId)
  });

  renderCraftList({
    state,
    crafts,
    getResourceLabel,
    isCraftHidden,
    isCraftUnlocked,
    onCraftClick: (craftId) => openCraftActionModal(craftId),
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
    formatSeconds,
    onRemoveQueuedAction: (index) => {
      removeQueuedAction(index);
      renderAll();
    },
    onMoveQueuedAction: (index, direction) => {
      moveQueuedAction(index, direction);
      renderAll();
    }
  });

  renderCraftLane({
    state,
    crafts,
    formatSeconds,
    onRemoveQueuedCraft: (index) => {
      removeQueuedCraft(index);
      renderAll();
    },
    onMoveQueuedCraft: (index, direction) => {
      moveQueuedCraft(index, direction);
      renderAll();
    }
  });

  renderResearchLane({ state, formatSeconds });
  renderLog({ state });
  renderPlaceholders();
}

function loop(now) {
  const deltaSeconds = Math.min(0.2, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  state.campfireSec = Math.max(0, Number(state.campfireSec || 0) - deltaSeconds);

  const regenBonus = 1 + getRestEfficiencyBonus(state) + (state.campfireSec > 0 ? 0.1 : 0);
  if (state.isResting) {
    restoreStamina(REST_REGEN_PER_SEC * regenBonus * deltaSeconds);
    if (state.stamina >= getMaxStamina(state)) state.stamina = getMaxStamina(state);
  } else {
    restoreStamina(IDLE_REGEN_PER_SEC * regenBonus * deltaSeconds);
  }

  workSystem.updateAction(deltaSeconds);
  updateCraft(deltaSeconds);
  researchSystem.updateResearch(deltaSeconds);

  if (!state.currentAction && !state.isResting && state.actionQueue?.length > 0) {
    tryStartNextWork();
  }
  if (!state.currentCraft && state.craftQueue?.length > 0) {
    tryStartNextCraft();
  }

  renderHeaderStats();
  renderActionLane({ state, workDefs, getWorkCost, formatSeconds, onRemoveQueuedAction: (index) => { removeQueuedAction(index); renderAll(); }, onMoveQueuedAction: (index, direction) => { moveQueuedAction(index, direction); renderAll(); } });
  renderCraftLane({ state, crafts, formatSeconds, onRemoveQueuedCraft: (index) => { removeQueuedCraft(index); renderAll(); }, onMoveQueuedCraft: (index, direction) => { moveQueuedCraft(index, direction); renderAll(); } });
  renderResearchLane({ state, formatSeconds });

  requestAnimationFrame(loop);
}

function init() {
  loadGame({ silent: true });

  bindEvents({
    onRest: () => {
      toggleRest();
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
      state.isResting = false;
      workSystem.cancelCurrentAction?.();
      renderAll();
    },
    onClearActionQueue: () => {
      state.actionQueue = [];
      renderAll();
    },
    onSetLogFilter: (filter) => {
      state.logFilter = filter;
      state.ui.logFilter = filter;
      renderLog({ state });
    },
    onSetMainPage: (pageName) => setMainPage(pageName),
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
