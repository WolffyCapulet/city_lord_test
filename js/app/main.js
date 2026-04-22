import { resourceLabels, edibleValues, foodOrder } from "../data/resources.js";
import { workDefs } from "../data/works.js";
import { crafts } from "../data/crafts.js";
import { books, researchDefs } from "../data/research.js";

import { bindEvents } from "./bindEvents.js";

import { createInitialState, normalizeState, resetState } from "../core/state.js";

import { createWorkSystem, getWorkCost, getWorkDuration } from "../systems/work.js";
import { createResearchSystem } from "../systems/research.js";

import {
  renderTopStats,
  renderResearchArea,
  renderActionLane,
  renderResearchLane,
  renderLog
} from "../ui/components.js";

import { renderResources } from "../ui/render/renderResources.js";
import { renderWorkButtons } from "../ui/render/renderWorkButtons.js";
import { renderCraftList } from "../ui/render/renderCraftList.js";
import { renderSkillPills } from "../ui/render/renderSkillPills.js";

const STORAGE_KEY = "city_lord_modular_min_v0.0.0.1";
const LOG_LIMIT = 100;

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

const state = createInitialState(stateOptions);
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
    addLog(`${skillLabels[skillId] || skillId} 等級提升到 Lv.${state.skills[skillId].level}`, "important");
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

function isWarehouseResourceClickable(resourceId) {
  return typeof edibleValues[resourceId] === "number";
}

function getWarehouseResourceHint(resourceId) {
  if (typeof edibleValues[resourceId] === "number") {
    return "點擊使用";
  }
  return "";
}

function handleWarehouseResourceClick(resourceId) {
  if (typeof edibleValues[resourceId] === "number") {
    eatResource(resourceId);
    renderAll();
  }
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

  if (def.skill) {
    addSkillExp(def.skill, 1);
  }

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

    const data = normalizeState(JSON.parse(raw), stateOptions);

    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, data);

    state.logs = normalizeLogs(state.logs);
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
  resetState(state, stateOptions);
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

function renderAll() {
  syncDerivedResearchUnlocks();

  renderTopStats({
    state,
    getExpToNext,
    getMaxStamina,
    getBestFoodId,
    getResourceLabel,
    edibleValues
  });

  renderSkillPills({
    state,
    skillLabels,
    expToNext: getExpToNext
  });

  renderResources({
    state,
    getResourceLabel,
    edibleValues,
    isResourceClickable: isWarehouseResourceClickable,
    getResourceHint: getWarehouseResourceHint,
    onResourceClick: handleWarehouseResourceClick
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
    state,
    crafts,
    getResourceLabel,
    isCraftHidden,
    isCraftUnlocked,
    onCraftClick: (craftId) => {
      craftItem(craftId);
      renderAll();
    },
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
