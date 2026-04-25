import {
  resourceLabels,
  edibleValues,
  fuelDurations
} from "../data/resources.js";
import { workDefs } from "../data/works.js";
import { crafts } from "../data/crafts.js";
import { books, researchDefs } from "../data/research.js";

import { bindEvents } from "./bindEvents.js";
import { createAppRenderer } from "./renderApp.js";
import { createAppLoop } from "./appLoop.js";

import {
  createInitialState,
  normalizeState,
  resetState
} from "../core/state.js";
import { createStateBootstrap } from "../core/stateBootstrap.js";

import {
  createWorkSystem,
  getWorkCost
} from "../systems/work.js";
import { createResearchSystem } from "../systems/research.js";
import { createMerchantRuntime } from "../systems/merchantRuntime.js";
import { createCraftRuntime } from "../systems/craftRuntime.js";
import { createWorkersRuntime } from "../systems/workersRuntime.js";
import { createPlayerRuntime } from "../systems/playerRuntime.js";
import { createStaminaRuntime } from "../systems/staminaRuntime.js";
import { createWorkQueueRuntime } from "../systems/workQueueRuntime.js";

const STORAGE_KEY = "city_lord_modular_min_v0.0.0.1";
const LOG_LIMIT = 100;
const QUEUE_LIMIT = 3;

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

const stateBootstrap = createStateBootstrap({
  createInitialState,
  normalizeState,
  resetState,
  resourceLabels,
  crafts,
  books,
  skillLabels,
  logLimit: LOG_LIMIT
});

const state = stateBootstrap.safeCreateInitialState();

const playerRuntime = createPlayerRuntime({
  state,
  getExpToNext,
  skillLabels,
  logLimit: LOG_LIMIT,
  nowTime
});

const {
  addLog,
  gainResource,
  spendResource,
  canAfford,
  spendCosts,
  addMainExp,
  addSkillExp,
  addTradeExp,
  addReputation
} = playerRuntime;

const staminaRuntime = createStaminaRuntime({
  state,
  addLog,
  spendResource,
  getMaxStamina
});

const {
  rest,
  eatBestFood,
  isWarehouseResourceClickable,
  getWarehouseResourceHint,
  handleWarehouseResourceClick
} = staminaRuntime;

const workSystem = createWorkSystem({
  state,
  addLog,
  addMainExp,
  gainResource
});

const workQueueRuntime = createWorkQueueRuntime({
  state,
  addLog,
  workDefs,
  getWorkCost,
  workSystem,
  queueLimit: QUEUE_LIMIT
});

const {
  handleWorkClick,
  tryStartNextWork,
  removeQueuedAction,
  moveQueuedAction,
  clearQueuedActions
} = workQueueRuntime;

const researchSystem = createResearchSystem({
  state,
  addLog,
  gainResource,
  countBuiltPlots: () => 0
});

const merchantRuntime = createMerchantRuntime({
  state,
  addLog,
  addTradeExp,
  addReputation,
  getResourceLabel
});

const craftRuntime = createCraftRuntime({
  state,
  addLog,
  addMainExp,
  addSkillExp,
  gainResource,
  canAfford,
  spendCosts,
  getResourceLabel,
  queueLimit: QUEUE_LIMIT,
  crafts
});

const {
  isCraftHidden,
  isCraftUnlocked,
  getCraftDuration,
  updateCraft,
  tryStartNextCraft,
  removeQueuedCraft,
  moveQueuedCraft,
  startCraftPlan
} = craftRuntime;

const workersRuntime = createWorkersRuntime({
  state,
  addLog,
  gainResource,
  spendResource,
  spendCosts,
  canAfford,
  addMainExp,
  addSkillExp,
  getResourceLabel
});

function craftItem(craftId) {
  return startCraftPlan(craftId, 1, false);
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

    const data = stateBootstrap.safeNormalizeState(JSON.parse(raw));

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
  stateBootstrap.safeResetState(state);
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

let renderAll = () => {};

const appRenderer = createAppRenderer({
  state,
  workDefs,
  crafts,
  books,
  researchDefs,
  merchantRuntime,
  workersRuntime,

  getExpToNext,
  getMaxStamina,
  formatReadableDuration,
  formatSeconds,
  getResourceLabel,
  edibleValues,
  fuelDurations,
  getWorkCost,

  isResourceClickable: isWarehouseResourceClickable,
  getResourceHint: getWarehouseResourceHint,
  onResourceClick: (resourceId) => {
    handleWarehouseResourceClick(resourceId, renderAll);
  },

  isCraftHidden,
  isCraftUnlocked,
  getCraftDuration,

  onWorkClick: (workId) => {
    handleWorkClick(workId);
    renderAll();
  },
  onCraftClick: (craftId) => {
    craftItem(craftId);
    renderAll();
  },
  onStartResearch: (researchId) => {
    researchSystem.startResearch(researchId);
    renderAll();
  },
  onReadBook: (bookId) => {
    researchSystem.startReading(bookId);
    renderAll();
  },

  onRemoveQueuedAction: (index) => {
    removeQueuedAction(index);
    renderAll();
  },
  onMoveQueuedAction: (index, direction) => {
    moveQueuedAction(index, direction);
    renderAll();
  },
  onRemoveQueuedCraft: (index) => {
    removeQueuedCraft(index);
    renderAll();
  },
  onMoveQueuedCraft: (index, direction) => {
    moveQueuedCraft(index, direction);
    renderAll();
  },

  getMissingRequirementText: researchSystem.getMissingRequirementText,
  isResearchCompleted: researchSystem.isResearchCompleted,
  meetsResearchRequirements: researchSystem.meetsResearchRequirements,

  onRecruitWorker: () => {
    workersRuntime.recruitWorker();
    renderAll();
  },
  onPayDebt: () => {
    workersRuntime.payDebt();
    renderAll();
  },
  onSetWorkerJob: (workerId, job) => {
    workersRuntime.setWorkerJob(workerId, job);
    renderAll();
  },
  onAdjustWorkersForJob: (job, delta) => {
    workersRuntime.adjustWorkersForJob(job, delta);
    renderAll();
  }
});

const {
  renderHeaderStats,
  renderLivePanels
} = appRenderer;

const rawRenderAll = appRenderer.renderAll;
renderAll = () => {
  syncDerivedResearchUnlocks();
  rawRenderAll();
};

const appLoop = createAppLoop({
  state,
  workSystem,
  updateCraft,
  researchSystem,
  merchantRuntime,
  workersRuntime,
  tryStartNextWork,
  tryStartNextCraft,
  renderHeaderStats,
  renderLivePanels
});

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
      renderAll();
    },
    onClearActionQueue: () => {
      clearQueuedActions();
      renderAll();
    },
    onSetLogFilter: (filter) => {
      state.logFilter = filter;
      if (!state.ui) state.ui = {};
      state.ui.logFilter = filter;
      renderAll();
    },
    onSetMainPage: (pageName) => {
      setMainPage(pageName);
    },
    onClaimTax: () => showFeatureStub("稅收"),
    onPayDebt: () => {
      workersRuntime.payDebt();
      renderAll();
    },
    onRecruitWorker: () => {
      workersRuntime.recruitWorker();
      renderAll();
    },
    onOpenSeedSelect: () => showFeatureStub("種子選擇"),
    onPlant: () => showFeatureStub("種植"),
    onToggleFarmerSeedMode: () => showFeatureStub("農夫種植模式"),
    onToggleFarmerAutoFertilize: () => showFeatureStub("自動施肥")
  });

  setMainPage(state.ui.mainPage || "production");
  renderAll();
  appLoop.start();
}

init();
