import { resourceLabels, edibleValues, fuelDurations } from "../data/dataResources.js";
import { workDefs } from "../data/dataWorks.js";
import { crafts } from "../data/dataCrafts.js";
import { books, researchDefs } from "../data/dataResearch.js";
import { buildingDefs, buildingOrder, housingDefs } from "../data/dataBuildings.js";

import { bindEvents } from "./bindEvents.js";
import { createAppRenderer } from "../ui/render/renderApp.js";
import { createAppLoop } from "./appLoop.js";

import { createInitialState, normalizeState, resetState } from "../core/state.js";
import { createStateBootstrap } from "../core/stateBootstrap.js";

import { createWorkSystem, getWorkCost } from "../systems/work.js";
import { createResearchSystem } from "../systems/research.js";
import { createMerchantRuntime } from "../systems/merchantRuntime.js";
import { createCraftRuntime } from "../systems/craftRuntime.js";
import { createWorkersRuntime } from "../systems/workersRuntime.js";
import { createPlayerRuntime } from "../systems/playerRuntime.js";
import { createStaminaRuntime } from "../systems/staminaRuntime.js";
import { createWorkQueueRuntime } from "../systems/workQueueRuntime.js";
import { createBuildSystem } from "../systems/build.js";
import { showActionModal } from "../ui/modals.js";

// Expose building defs for renderApp
window.__cityLordBuildingDefs = { buildingDefs, buildingOrder };

const STORAGE_KEY = "city_lord_modular_min_v0.0.0.1";
const LOG_LIMIT = 100;
const QUEUE_LIMIT = 3;

const skillLabels = {
  labor: "打工", lumber: "伐木", mining: "挖礦", fishing: "釣魚",
  hunting: "狩獵", gathering: "採集", digging: "挖掘", farming: "耕種",
  woodworking: "木工", masonry: "石工", cooking: "烹飪", smelting: "冶煉",
  alchemy: "煉金", tanning: "裁縫"
};

function nowTime() {
  const d = new Date();
  return `[${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}]`;
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

function getMaxStamina(stateOrLevel) {
  const level = typeof stateOrLevel === "object"
    ? (stateOrLevel?.level || 1)
    : (stateOrLevel || 1);
  return 100 + (level - 1) * 10;
}

function getResourceLabel(id) {
  return resourceLabels[id] || id;
}

function formatBundleText(bundle = {}) {
  const entries = Object.entries(bundle);
  if (!entries.length) return "無";
  return entries.map(([id, amount]) => `${getResourceLabel(id)} ${amount}`).join("、");
}

// Bootstrap state
const stateBootstrap = createStateBootstrap({
  createInitialState, normalizeState, resetState,
  resourceLabels, crafts, books, skillLabels, logLimit: LOG_LIMIT
});

const state = stateBootstrap.safeCreateInitialState();

// Player runtime (log, resources, exp)
const playerRuntime = createPlayerRuntime({
  state, getExpToNext, skillLabels, logLimit: LOG_LIMIT, nowTime
});

const { addLog, gainResource, spendResource, canAfford, spendCosts, addMainExp, addSkillExp, addTradeExp, addReputation } = playerRuntime;

// Stamina
const staminaRuntime = createStaminaRuntime({
  state, addLog, spendResource, getMaxStamina
});
const { rest, eatBestFood, isWarehouseResourceClickable, getWarehouseResourceHint, handleWarehouseResourceClick } = staminaRuntime;

// Work system
const workSystem = createWorkSystem({ state, addLog, addMainExp, gainResource, addSkillExp });

// Work queue
const workQueueRuntime = createWorkQueueRuntime({
  state, addLog, workDefs, getWorkCost, workSystem, queueLimit: QUEUE_LIMIT
});
const { startWorkPlan, tryStartNextWork, removeQueuedAction, moveQueuedAction, clearQueuedActions } = workQueueRuntime;

// Research
const researchSystem = createResearchSystem({
  state, addLog, gainResource,
  countBuiltPlots: () => Array.isArray(state.plots) ? state.plots.length : 0
});

// Merchant
const merchantRuntime = createMerchantRuntime({
  state, addLog, addTradeExp, addReputation, getResourceLabel
});

// Crafting
const craftRuntime = createCraftRuntime({
  state, addLog, addMainExp, addSkillExp, gainResource, canAfford, spendCosts,
  getResourceLabel, queueLimit: QUEUE_LIMIT, crafts
});
const { isCraftHidden, isCraftUnlocked, getCraftDuration, queueCraft, updateCraft, tryStartNextCraft, removeQueuedCraft, moveQueuedCraft, startCraftPlan } = craftRuntime;

// Workers (includes farm & ranch internally)
const workersRuntime = createWorkersRuntime({
  state, addLog, gainResource, spendResource, spendCosts, canAfford, addMainExp, addSkillExp, getResourceLabel
});

// Build system
const buildSystem = createBuildSystem({ state, addLog, spendCosts });

// Keep housingCap in sync
function syncHousingCap() {
  state.housingCap = buildSystem.getHousingCapacity();
}

// Keep safetyValue in sync
function syncSafetyValue() {
  state.safetyValue = buildSystem.getSafetyValue();
}

// Keep research unlocks in sync
function syncDerivedResearchUnlocks() {
  Object.entries(researchDefs).forEach(([, def]) => {
    // already handled inside researchSystem.completeResearch
  });
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

function saveGame() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    addLog("已存檔", "important");
    renderAll();
  } catch (e) {
    addLog("存檔失敗", "important");
    renderAll();
  }
}

function loadGame({ silent = false } = {}) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (!silent) { addLog("沒有存檔", "important"); renderAll(); }
      return false;
    }
    const data = stateBootstrap.safeNormalizeState(JSON.parse(raw));
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, data);
    state.stamina = Math.min(state.stamina, getMaxStamina(state));
    if (!silent) addLog("已讀檔", "important");
    renderAll();
    return true;
  } catch (e) {
    if (!silent) { addLog("讀檔失敗", "important"); renderAll(); }
    return false;
  }
}

function resetGame() {
  localStorage.removeItem(STORAGE_KEY);
  stateBootstrap.safeResetState(state);
  addLog("已重置存檔", "important");
  renderAll();
}

function openWorkActionModal(workId) {
  const def = workDefs[workId];
  if (!def) return;
  showActionModal({
    title: def.name,
    description: `單次體力：${getWorkCost(def)}\n說明：選擇要執行幾次。`,
    quantity: 1,
    quantityHint: state.currentAction ? "目前生產線忙碌中，可加入列隊" : "可直接開始",
    quickButtons: [1, 10, 50, 100, "∞"],
    allowQueue: true, allowStart: true,
    onQueue: (qty, isInfinite) => { workQueueRuntime.queueWork(workId, qty, isInfinite); renderAll(); },
    onStart: (qty, isInfinite) => { startWorkPlan(workId, qty, isInfinite); renderAll(); }
  });
}

function openCraftActionModal(craftId) {
  const def = crafts[craftId];
  if (!def) return;
  showActionModal({
    title: def.name,
    description: [
      `單次體力：${def.stamina ?? 1}`,
      `材料：${formatBundleText(def.costs || {})}`,
      `產出：${formatBundleText(def.yields || {})}`,
      `製作節奏：${formatSeconds(getCraftDuration(def, craftId))}`
    ].join("\n"),
    quantity: 1,
    quantityHint: state.currentCraft ? "目前製作線忙碌中，可加入列隊" : "可直接開始",
    quickButtons: [1, 10, 50, 100, "∞"],
    allowQueue: true, allowStart: true,
    onQueue: (qty, isInfinite) => { queueCraft(craftId, qty, isInfinite); renderAll(); },
    onStart: (qty, isInfinite) => { startCraftPlan(craftId, qty, isInfinite); renderAll(); }
  });
}

let renderAll = () => {};

const appRenderer = createAppRenderer({
  state, workDefs, crafts, books, researchDefs,
  merchantRuntime, workersRuntime,

  getExpToNext, getMaxStamina, formatReadableDuration, formatSeconds,
  getResourceLabel, edibleValues, fuelDurations, getWorkCost,

  isResourceClickable: isWarehouseResourceClickable,
  getResourceHint: getWarehouseResourceHint,
  onResourceClick: (id) => { handleWarehouseResourceClick(id, renderAll); },

  isCraftHidden, isCraftUnlocked, getCraftDuration,

  onWorkClick: (workId) => openWorkActionModal(workId),
  onCraftClick: (craftId) => openCraftActionModal(craftId),
  onStartResearch: (id) => { researchSystem.startResearch(id); renderAll(); },
  onReadBook: (id) => { researchSystem.startReading(id); renderAll(); },

  onRemoveQueuedAction: (i) => { removeQueuedAction(i); renderAll(); },
  onMoveQueuedAction: (i, d) => { moveQueuedAction(i, d); renderAll(); },
  onRemoveQueuedCraft: (i) => { removeQueuedCraft(i); renderAll(); },
  onMoveQueuedCraft: (i, d) => { moveQueuedCraft(i, d); renderAll(); },

  getMissingRequirementText: researchSystem.getMissingRequirementText,
  isResearchCompleted: researchSystem.isResearchCompleted,
  meetsResearchRequirements: researchSystem.meetsResearchRequirements,

  onRecruitWorker: () => { workersRuntime.recruitWorker(); syncHousingCap(); renderAll(); },
  onPayDebt: () => { workersRuntime.payDebt(); renderAll(); },
  onSetWorkerJob: (id, job) => { workersRuntime.setWorkerJob(id, job); renderAll(); },
  onAdjustWorkersForJob: (job, delta) => { workersRuntime.adjustWorkersForJob(job, delta); renderAll(); },

  onFulfillOrder: (id) => { merchantRuntime.fulfillOrder(id); renderAll(); },
  onCancelOrder: (id) => { merchantRuntime.cancelOrder(id); renderAll(); },
  onRefreshMerchant: () => { merchantRuntime.refreshMerchant(); renderAll(); },

  buildSystem,
  onBuildHousing: (id) => {
    buildSystem.buildHousing(id);
    syncHousingCap();
    syncSafetyValue();
    renderAll();
  },
  onUpgradeBuilding: (id) => {
    buildSystem.upgradeBuilding(id);
    syncHousingCap();
    syncSafetyValue();
    renderAll();
  }
});

renderAll = () => {
  syncHousingCap();
  syncSafetyValue();
  appRenderer.renderAll();
};

const { renderHeaderStats, renderLivePanels } = appRenderer;

const appLoop = createAppLoop({
  state, workSystem, updateCraft, researchSystem,
  merchantRuntime, workersRuntime,
  tryStartNextWork, tryStartNextCraft,
  renderHeaderStats,
  renderLivePanels: () => {
    syncHousingCap();
    syncSafetyValue();
    renderLivePanels();
  }
});

// Wire housing build buttons
function wireHousingButtons() {
  document.querySelectorAll("[data-build]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.build;
      buildSystem.buildHousing(id);
      syncHousingCap();
      syncSafetyValue();
      renderAll();
    });
  });
}

function init() {
  loadGame({ silent: true });

  bindEvents({
    onRest: () => { rest(); renderAll(); },
    onEatBest: () => { eatBestFood(); renderAll(); },
    onSave: saveGame,
    onLoad: () => loadGame(),
    onResetConfirm: resetGame,
    onCancelAction: () => { workSystem.cancelCurrentAction?.(); renderAll(); },
    onClearActionQueue: () => { clearQueuedActions(); renderAll(); },
    onSetLogFilter: (filter) => {
      state.logFilter = filter;
      state.ui.logFilter = filter;
      renderAll();
    },
    onSetMainPage: (pageName) => setMainPage(pageName),
    onClaimTax: () => {
      if (Number(state.pendingTax || 0) > 0) {
        state.gold += Math.floor(state.pendingTax);
        addLog(`領取稅收 ${Math.floor(state.pendingTax)} 金`, "important");
        state.pendingTax = 0;
      }
      renderAll();
    },
    onPayDebt: () => { workersRuntime.payDebt(); renderAll(); },
    onRecruitWorker: () => { workersRuntime.recruitWorker(); syncHousingCap(); renderAll(); },
    onOpenSeedSelect: () => { addLog("種子選擇功能開發中", "important"); renderAll(); },
    onPlant: () => { addLog("種植功能請透過農夫工人自動進行", "important"); renderAll(); },
    onToggleFarmerSeedMode: () => { addLog("農夫自動模式功能開發中", "important"); renderAll(); },
    onToggleFarmerAutoFertilize: () => { addLog("自動施肥功能開發中", "important"); renderAll(); }
  });

  wireHousingButtons();
  setMainPage(state.ui?.mainPage || "production");
  renderAll();
  appLoop.start();
}

init();
