import { resourceLabels, edibleValues, foodOrder } from "../data/resources.js";
import { workDefs } from "../data/works.js";
import { crafts } from "../data/crafts.js";
import { books, researchDefs } from "../data/research.js";

import { bindEvents } from "./bindEvents.js";

import { createWorkSystem, getWorkCost, getWorkDuration } from "../systems/work.js";
import { createResearchSystem } from "../systems/research.js";

import {
  renderTopStats,
  renderResources,
  renderWorkButtons,
  renderCraftList,
  renderResearchArea,
  renderActionLane,
  renderResearchLane,
  renderLog
} from "../ui/components.js";

const STORAGE_KEY = "city_lord_modular_v0.1.0.4";
const LOG_LIMIT = 200;

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
  tailoring: "裁縫"
};

const townStageDefs = [
  { name: "荒地", minCastle: 1 },
  { name: "小村落", minCastle: 2 },
  { name: "聚居地", minCastle: 4 },
  { name: "村莊", minCastle: 6 },
  { name: "商業聚落", minCastle: 8 },
  { name: "城鎮", minCastle: 10 },
  { name: "商業中心", minCastle: 13 },
  { name: "城池", minCastle: 16 }
];

function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
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
  let s = Math.max(0, Math.floor(Number(seconds || 0)));

  const d = Math.floor(s / 86400);
  s %= 86400;
  const h = Math.floor(s / 3600);
  s %= 3600;
  const m = Math.floor(s / 60);
  s %= 60;

  if (d > 0) return `${d}d${h}h${m}m${s}s`;
  if (h > 0) return `${h}h${m}m${s}s`;
  if (m > 0) return `${m}m${s}s`;
  return `${s}s`;
}

function getExpToNext(level) {
  return Math.round(5 + 2.5 * level * (level - 1));
}

function getMaxStamina(state) {
  return 100 + ((state.staminaLevel || 1) - 1) * 10;
}

function getResourceLabel(id) {
  return resourceLabels[id] || id;
}

function createDefaultSkills() {
  return Object.fromEntries(
    Object.keys(skillLabels).map((key) => [
      key,
      { level: 1, exp: 0 }
    ])
  );
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

function createState() {
  return {
    gold: 0,
    level: 1,
    exp: 0,

    intelligence: 0,

    stamina: 100,
    staminaLevel: 1,
    staminaExp: 0,

    managementLevel: 1,
    managementExp: 0,

    castleLevel: 1,
    castleExp: 0,

    tradeLevel: 1,
    tradeExp: 0,
    reputation: 0,
    pendingTax: 0,

    campfireSec: 0,

    salaryTimer: 300,
    salaryDebt: 0,

    houses: {
      cabin: 0,
      stoneHouse: 0,
      wall: 0
    },

    buildings: {
      well: 0,
      library: 0,
      mill: 0,
      alchemyHut: 0,
      lumberMill: 0,
      quarry: 0,
      fishingShack: 0,
      tannery: 0,
      smithy: 0,
      townCenter: 0,
      ranch: 0,
      waterChannel: 0,
      windmill: 0
    },

    workers: [],
    nextWorkerId: 1,

    merchant: {
      minuteCounter: 0,
      present: false,
      presentSec: 0,
      cash: 0,
      maxCash: 0,
      keep: {},
      orders: [],
      nextOrderId: 1
    },

    plots: [null, null, null],
    ranchData: {},

    resources: createDefaultResources(),
    skills: createDefaultSkills(),

    logs: [],

    currentAction: null,
    actionQueue: [],

    currentResearch: null,
    researchQueue: [],
    research: Object.fromEntries(Object.keys(researchDefs).map((id) => [id, false])),

    ui: {
      mainPage: "production"
    },

    logFilter: "all"
  };
}

function ensureStateShape(s) {
  s.gold = Number(s.gold || 0);
  s.level = Math.max(1, Number(s.level || 1));
  s.exp = Math.max(0, Number(s.exp || 0));

  s.intelligence = Number(s.intelligence || 0);

  s.staminaLevel = Math.max(1, Number(s.staminaLevel || 1));
  s.staminaExp = Math.max(0, Number(s.staminaExp || 0));
  s.stamina = clamp(Number(s.stamina || 100), 0, getMaxStamina(s));

  s.managementLevel = Math.max(1, Number(s.managementLevel || 1));
  s.managementExp = Math.max(0, Number(s.managementExp || 0));

  s.castleLevel = Math.max(1, Number(s.castleLevel || 1));
  s.castleExp = Math.max(0, Number(s.castleExp || 0));

  s.tradeLevel = Math.max(1, Number(s.tradeLevel || 1));
  s.tradeExp = Math.max(0, Number(s.tradeExp || 0));
  s.reputation = Number(s.reputation || 0);
  s.pendingTax = Math.max(0, Number(s.pendingTax || 0));

  s.campfireSec = Math.max(0, Number(s.campfireSec || 0));

  s.salaryTimer = Math.max(0, Number(s.salaryTimer || 300));
  s.salaryDebt = Math.max(0, Number(s.salaryDebt || 0));

  if (!s.houses || typeof s.houses !== "object") s.houses = {};
  s.houses.cabin = Math.max(0, Number(s.houses.cabin || 0));
  s.houses.stoneHouse = Math.max(0, Number(s.houses.stoneHouse || 0));
  s.houses.wall = Math.max(0, Number(s.houses.wall || 0));

  if (!s.buildings || typeof s.buildings !== "object") s.buildings = {};
  [
    "well",
    "library",
    "mill",
    "alchemyHut",
    "lumberMill",
    "quarry",
    "fishingShack",
    "tannery",
    "smithy",
    "townCenter",
    "ranch",
    "waterChannel",
    "windmill"
  ].forEach((key) => {
    s.buildings[key] = Math.max(0, Number(s.buildings[key] || 0));
  });

  if (!Array.isArray(s.workers)) s.workers = [];
  s.nextWorkerId = Math.max(1, Number(s.nextWorkerId || 1));

  if (!s.merchant || typeof s.merchant !== "object") {
    s.merchant = {
      minuteCounter: 0,
      present: false,
      presentSec: 0,
      cash: 0,
      maxCash: 0,
      keep: {},
      orders: [],
      nextOrderId: 1
    };
  }

  if (!Array.isArray(s.plots)) s.plots = [null, null, null];
  if (!s.ranchData || typeof s.ranchData !== "object") s.ranchData = {};

  s.resources = {
    ...createDefaultResources(),
    ...(s.resources || {})
  };

  if (!s.skills || typeof s.skills !== "object") s.skills = createDefaultSkills();
  Object.keys(skillLabels).forEach((key) => {
    if (!s.skills[key] || typeof s.skills[key] !== "object") {
      s.skills[key] = { level: 1, exp: 0 };
    }
    s.skills[key].level = Math.max(1, Number(s.skills[key].level || 1));
    s.skills[key].exp = Math.max(0, Number(s.skills[key].exp || 0));
  });

  s.logs = normalizeLogs(s.logs);

  if (!s.currentAction || typeof s.currentAction !== "object") s.currentAction = null;
  if (!Array.isArray(s.actionQueue)) s.actionQueue = [];

  if (!s.currentResearch || typeof s.currentResearch !== "object") s.currentResearch = null;
  if (!Array.isArray(s.researchQueue)) s.researchQueue = [];

  if (!s.research || typeof s.research !== "object") {
    s.research = Object.fromEntries(Object.keys(researchDefs).map((id) => [id, false]));
  }
  Object.keys(researchDefs).forEach((id) => {
    s.research[id] = !!s.research[id];
  });

  if (!s.ui || typeof s.ui !== "object") s.ui = {};
  if (!s.ui.mainPage) s.ui.mainPage = "production";

  if (typeof s.logFilter !== "string") s.logFilter = "all";

  return s;
}

const state = ensureStateShape(createState());
let lastFrameTime = performance.now();

function addLog(text, type = "important") {
  state.logs.unshift({
    time: nowTime(),
    text,
    type
  });
  state.logs = state.logs.slice(0, LOG_LIMIT);
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

function addStaminaExp(amount) {
  state.staminaExp += amount;

  while (state.staminaExp >= getExpToNext(state.staminaLevel)) {
    state.staminaExp -= getExpToNext(state.staminaLevel);
    state.staminaLevel += 1;
    state.stamina = Math.min(getMaxStamina(state), state.stamina + 10);
    addLog(`體力等級提升到 Lv.${state.staminaLevel}`, "important");
  }
}

function addManagementExp(amount) {
  state.managementExp += amount;

  while (state.managementExp >= getExpToNext(state.managementLevel)) {
    state.managementExp -= getExpToNext(state.managementLevel);
    state.managementLevel += 1;
    addLog(`管理等級提升到 Lv.${state.managementLevel}`, "important");
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

function getCycleTimeText() {
  return (getWorkDuration(workDefs.labor) || 10).toFixed(2);
}

function getHousingUsed(state) {
  return Array.isArray(state.workers) ? state.workers.length : 0;
}

function getHousingCap(state) {
  return (state.houses.cabin || 0) * 2 + (state.houses.stoneHouse || 0) * 5;
}

function getSafetyValue(state) {
  return (state.castleLevel || 1) * 5 + (state.houses.wall || 0) * 2;
}

function getTownStageName(state) {
  let current = "荒地";
  for (const stage of townStageDefs) {
    if ((state.castleLevel || 1) >= stage.minCastle) {
      current = stage.name;
    }
  }
  return current;
}

function getCampfireBarPercent(state) {
  return clamp((Number(state.campfireSec || 0) / 300) * 100, 0, 100);
}

function rest() {
  const before = state.stamina;
  state.stamina = Math.min(getMaxStamina(state), state.stamina + 5);
  const actual = state.stamina - before;

  if (actual <= 0) {
    addLog("體力已滿，不需要休息", "important");
    return;
  }

  addStaminaExp(actual);
  addLog(`你休息恢復 ${actual} 體力`, "important");
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

  if (actual > 0) addStaminaExp(actual);

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

function claimTax() {
  const amount = Math.floor(Number(state.pendingTax || 0));
  if (amount <= 0) {
    addLog("目前沒有可領取的稅收", "important");
    return;
  }

  state.gold += amount;
  state.pendingTax = 0;
  addManagementExp(Math.max(1, Math.floor(amount * 0.5)));
  addLog(`已領取稅收 ${amount} 金`, "important");
}

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

  const staminaCost = Math.max(1, Number(def.stamina ?? 1));

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

    const data = ensureStateShape(JSON.parse(raw));

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
  const fresh = ensureStateShape(createState());
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, fresh);
  addLog("已重置存檔", "important");
  renderAll();
}

function setMainPage(pageName) {
  state.ui.mainPage = pageName;

  qsa("[data-main-page]").forEach((panel) => {
    panel.classList.toggle("page-hidden", panel.dataset.mainPage !== pageName);
  });

  qsa("[data-main-nav]").forEach((btn) => {
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
  countBuiltPlots: () => Array.isArray(state.plots) ? state.plots.length : 0
});

function renderCraftLane() {
  const textEl = document.getElementById("craftText");
  const barEl = document.getElementById("craftBar");
  const queueEl = document.getElementById("craftQueueTop");

  if (!textEl || !barEl || !queueEl) return;

  textEl.textContent = "製作線：目前為即時製作模式。";
  barEl.style.width = "0%";
  queueEl.innerHTML = `<span class="small muted">目前沒有製作列隊</span>`;
}

function renderAll() {
  syncDerivedResearchUnlocks();

  renderTopStats({
    state,
    skillLabels,
    getExpToNext,
    getMaxStamina,
    formatReadableDuration,
    getCycleTimeText,
    getHousingUsed,
    getHousingCap,
    getSafetyValue,
    getTownStageName,
    getCampfireBarPercent
  });

  renderResources({
    state,
    getResourceLabel,
    edibleValues
  });

  renderWorkButtons({
    workDefs,
    getWorkCost,
    getWorkDuration,
    formatSeconds,
    onWorkClick: (workId) => {
      workSystem.requestWork(workId);
      renderAll();
    }
  });

  renderCraftList({
    crafts,
    getResourceLabel,
    isCraftHidden,
    isCraftUnlocked,
    onCraftClick: (craftId) => {
      craftItem(craftId);
      renderAll();
    }
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

  renderResearchLane({
    state,
    formatSeconds
  });

  renderCraftLane();
  renderLog({ state });
}

function loop(now) {
  const deltaSeconds = Math.min(0.2, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  workSystem.updateAction(deltaSeconds);
  researchSystem.updateResearch(deltaSeconds);

  renderActionLane({
    state,
    workDefs,
    getWorkCost,
    formatSeconds
  });

  renderResearchLane({
    state,
    formatSeconds
  });

  requestAnimationFrame(loop);
}

function initExtraButtons() {
  document.getElementById("claimTaxBtn")?.addEventListener("click", () => {
    claimTax();
    renderAll();
  });

  document.getElementById("seedSelectBtn")?.addEventListener("click", () => {
    addLog("農田系統下一步接回", "important");
  });

  document.getElementById("plantBtn")?.addEventListener("click", () => {
    addLog("農田系統下一步接回", "important");
  });

  document.getElementById("payDebtBtn")?.addEventListener("click", () => {
    addLog("欠薪 / 工人系統下一步接回", "important");
  });

  document.getElementById("recruitBtn")?.addEventListener("click", () => {
    addLog("工人招募系統下一步接回", "important");
  });

  document.getElementById("toggleResourcesBtn")?.addEventListener("click", () => {
    addLog("倉庫分組收合下一步接回", "important");
  });
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
      workSystem.cancelCurrentAction();
      renderAll();
    },
    onClearActionQueue: () => {
      workSystem.clearActionQueue();
      renderAll();
    },
    onSetLogFilter: (filter) => {
      state.logFilter = filter;
      renderLog({ state });
    },
    onSetMainPage: (pageName) => {
      setMainPage(pageName);
    }
  });

  initExtraButtons();
  setMainPage(state.ui.mainPage || "production");
  renderAll();
  requestAnimationFrame(loop);
}

init();
