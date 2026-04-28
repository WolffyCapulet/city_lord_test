import {
  resourceLabels,
  edibleValues,
  fuelDurations
} from "../data/dataResources.js";
import { workDefs } from "../data/dataWorks.js";
import { crafts } from "../data/dataCrafts.js";
import { books, researchDefs } from "../data/dataResearch.js";
import {
  housingDefs,
  housingOrder,
  buildingDefs,
  buildingOrder
} from "../data/dataBuildings.js";
import { farmingDefs } from "../data/dataFarming.js";
import {
  animalFeedDefs,
  animalRarity,
  createInitialRanchData,
  getAnimalRarityLabel
} from "../data/dataAnimals.js";

import { bindEvents } from "./bindEvents.js";
import { createAppRenderer } from "../ui/render/renderApp.js";
import { createAppLoop } from "./appLoop.js";

import {
  createInitialState,
  normalizeState,
  resetState
} from "../core/state.js";
import { createStateBootstrap } from "../core/stateBootstrap.js";
import { saveState, clearSave } from "../core/save.js";
import {
  clamp,
  nowTime,
  formatSeconds
} from "../core/utils.js";

import {
  createWorkSystem,
  getWorkCost,
  getWorkDuration
} from "../systems/work.js";
import { createBuildSystem } from "../systems/build.js";
import { createResearchSystem } from "../systems/systemsResearch.js";
import { createTradeSystem } from "../systems/systemsTrade.js";
import { createMerchantRuntime } from "../systems/merchantRuntime.js";
import { createCraftRuntime } from "../systems/craftRuntime.js";
import { createWorkersRuntime } from "../systems/workersRuntime.js";
import { createPlayerRuntime } from "../systems/playerRuntime.js";
import { createStaminaRuntime } from "../systems/staminaRuntime.js";
import { createWorkQueueRuntime } from "../systems/workQueueRuntime.js";

import {
  showActionModal,
  openModal,
  closeModal,
  enableModalDismissByBackdrop,
  enableModalDismissByEscape
} from "../ui/modals.js";

const STORAGE_KEY = "city_lord_modular_min_v0.0.0.1";
const LOG_LIMIT = 100;
const QUEUE_LIMIT = 3;

const BUILDING_UNLOCK_ALIASES = {
  blacksmith: "smithy",
  tailorHut: "tannery"
};

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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatBundleText(bundle = {}) {
  const entries = Object.entries(bundle);
  if (!entries.length) return "無";

  return entries
    .map(([id, amount]) => `${getResourceLabel(id)} ${amount}`)
    .join("、");
}

function canAffordText(costs = {}) {
  const missing = Object.entries(costs)
    .filter(([id, amount]) => Number(state.resources?.[id] || 0) < Number(amount || 0))
    .map(([id, amount]) => {
      const have = Math.floor(Number(state.resources?.[id] || 0));
      return `${getResourceLabel(id)} ${have}/${amount}`;
    });

  return missing.length ? `缺少：${missing.join("、")}` : "材料足夠";
}

function hasResearchFlag(id) {
  return !!state.research?.[id];
}

function isHousingUnlocked(housingId) {
  if (housingId === "cabin") return true;
  return hasResearchFlag(housingId);
}

function isBuildingUnlocked(buildingId, def) {
  if (!def?.unlockResearch) return true;

  const alias = BUILDING_UNLOCK_ALIASES[buildingId];

  return (
    hasResearchFlag(def.unlockResearch) ||
    hasResearchFlag(buildingId) ||
    (alias ? hasResearchFlag(alias) : false)
  );
}

function addManagementExp(amount) {
  const value = Math.max(0, Number(amount || 0));
  if (value <= 0) return;

  state.managementExp = Math.max(0, Number(state.managementExp || 0) + value);

  while (state.managementExp >= getExpToNext(state.managementLevel || 1)) {
    state.managementExp -= getExpToNext(state.managementLevel || 1);
    state.managementLevel = Math.max(1, Number(state.managementLevel || 1) + 1);
    addLog(`管理等級提升到 Lv.${state.managementLevel}`, "important");
  }
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

if (!Array.isArray(state.plots) || state.plots.length === 0) {
  state.plots = [null, null, null];
}

if (!state.ranchData || typeof state.ranchData !== "object" || Object.keys(state.ranchData).length === 0) {
  state.ranchData = createInitialRanchData();
}

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
  addSkillExp
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

const buildSystem = createBuildSystem({
  state,
  addLog,
  spendCosts
});

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

const farmSystem = workersRuntime.farmSystem;
const ranchSystem = workersRuntime.ranchSystem;

const researchSystem = createResearchSystem({
  state,
  addLog,
  gainResource,
  countBuiltPlots: () => farmSystem.countBuiltPlots()
});

const rawUpdateResearch = researchSystem.updateResearch;

researchSystem.updateResearch = (deltaSeconds) => {
  const before = state.currentResearch
    ? {
        type: state.currentResearch.type,
        id: state.currentResearch.id,
        remaining: Number(state.currentResearch.remaining || 0)
      }
    : null;

  rawUpdateResearch(deltaSeconds);

  if (
    before?.type === "read" &&
    before.remaining > 0 &&
    before.remaining - Number(deltaSeconds || 0) <= 0
  ) {
    const def = books[before.id];
    const expGain = Math.max(0, Number(def?.expGain || 0));

    if (expGain > 0) {
      addMainExp(expGain);
    }
  }
};

const tradeSystem = createTradeSystem({
  state,
  addLog,
  addManagementExp
});

const merchantRuntime = createMerchantRuntime({
  state,
  addLog,
  addTradeExp: tradeSystem.addTradeExp,
  addReputation: tradeSystem.addReputation,
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
  queueCraft,
  updateCraft,
  tryStartNextCraft,
  removeQueuedCraft,
  moveQueuedCraft,
  startCraftPlan
} = craftRuntime;

const workSystem = createWorkSystem({
  state,
  addLog,
  addMainExp,
  gainResource,
  addSkillExp
});

const rawRequestWork = workSystem.requestWork;

workSystem.requestWork = (workId) => {
  const beforeStamina = Number(state.stamina || 0);
  const hadAction = !!state.currentAction;
  const ok = rawRequestWork(workId);

  if (
    ok &&
    !hadAction &&
    state.currentAction?.id === workId &&
    Number(state.stamina || 0) === beforeStamina
  ) {
    const cost = Math.max(
      1,
      Number(state.currentAction.staminaCost ?? getWorkCost(workDefs[workId]))
    );

    state.stamina = Math.max(0, beforeStamina - cost);
  }

  return ok;
};

const workQueueRuntime = createWorkQueueRuntime({
  state,
  addLog,
  workDefs,
  getWorkCost,
  workSystem,
  queueLimit: QUEUE_LIMIT
});

const {
  startWorkPlan,
  tryStartNextWork,
  removeQueuedAction,
  moveQueuedAction,
  clearQueuedActions
} = workQueueRuntime;

function updateDerivedStats() {
  state.housingCap = buildSystem.getHousingCapacity();
  state.safetyValue = buildSystem.getSafetyValue();

  const townCenterLevel = Number(state.buildings?.townCenter || 0);
  const wallCount = Number(state.housing?.wall || 0);

  if (townCenterLevel >= 3) {
    state.townStageName = "城鎮";
  } else if (townCenterLevel >= 1 || wallCount >= 6) {
    state.townStageName = "村鎮";
  } else if (wallCount >= 1) {
    state.townStageName = "聚落";
  } else {
    state.townStageName = "荒地";
  }
}

function syncDerivedResearchUnlocks() {
  Object.entries(researchDefs).forEach(([researchId, def]) => {
    if (!state.research?.[researchId]) return;

    if (def.unlockCraft) state.research[def.unlockCraft] = true;
    if (def.unlockBuild) state.research[def.unlockBuild] = true;
    if (def.unlockHouse) state.research[def.unlockHouse] = true;
  });

  if (state.research?.smithy) state.research.blacksmith = true;
  if (state.research?.tannery) state.research.tailorHut = true;
}

function getSelectedSeedId() {
  if (!state.ui) state.ui = {};

  if (!state.ui.selectedSeed || !farmingDefs[state.ui.selectedSeed]) {
    state.ui.selectedSeed = Object.keys(farmingDefs)[0] || "";
  }

  return state.ui.selectedSeed;
}

function showChoiceModal({
  title = "選擇項目",
  description = "",
  options = [],
  onSelect
} = {}) {
  const titleEl = document.getElementById("choiceModalTitle");
  const descEl = document.getElementById("choiceModalDesc");
  const optionsEl = document.getElementById("choiceModalOptions");
  const closeBtn = document.getElementById("choiceModalCloseBtn");

  if (!titleEl || !descEl || !optionsEl) return;

  titleEl.textContent = title;
  descEl.textContent = description;
  optionsEl.innerHTML = options
    .map((option) => {
      const disabled = option.disabled ? "disabled" : "";
      return `
        <button
          type="button"
          class="tiny-btn ${option.active ? "active" : ""}"
          data-choice-value="${escapeHtml(option.value)}"
          ${disabled}
          title="${escapeHtml(option.title || option.label)}"
        >
          ${escapeHtml(option.label)}
        </button>
      `;
    })
    .join("");

  optionsEl.querySelectorAll("[data-choice-value]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onSelect?.(btn.dataset.choiceValue);
      closeModal("choiceModal");
    });
  });

  if (closeBtn) {
    closeBtn.onclick = () => closeModal("choiceModal");
  }

  enableModalDismissByBackdrop("choiceModal");
  enableModalDismissByEscape();
  openModal("choiceModal");
}

function openSeedSelect() {
  const selected = getSelectedSeedId();

  showChoiceModal({
    title: "選擇要種植的種子",
    description: "選擇後，按「種下」會自動種到第一塊空農田。",
    options: Object.entries(farmingDefs).map(([seedId, def]) => {
      const have = Math.floor(Number(state.resources?.[seedId] || 0));

      return {
        value: seedId,
        label: `${def.name}（${getResourceLabel(seedId)}：${have}）`,
        active: seedId === selected,
        disabled: have <= 0,
        title: [
          def.name,
          `持有：${have}`,
          `成長：${formatSeconds(farmSystem.getCropDuration(seedId))}`,
          farmSystem.getSeedReturnDisplayText(seedId)
        ].join("\n")
      };
    }),
    onSelect: (seedId) => {
      state.ui.selectedSeed = seedId;
      renderAll();
    }
  });
}

function openWorkActionModal(workId) {
  const def = workDefs[workId];
  if (!def) return;

  showActionModal({
    title: def.name,
    description: [
      `單次體力：${getWorkCost(def)}`,
      `生產節奏：${formatSeconds(getWorkDuration(def))}`,
      "說明：輸入要執行幾次。",
      "可選擇無限持續生產。"
    ].join("\n"),
    quantity: 1,
    quantityHint: state.currentAction
      ? "目前生產線忙碌中，可加入列隊"
      : "可直接開始",
    quickButtons: [1, 10, 50, 100, "∞"],
    allowQueue: true,
    allowStart: true,
    onQueue: (qty, isInfinite) => {
      workQueueRuntime.queueWork(workId, qty, isInfinite);
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

  showActionModal({
    title: def.name,
    description: [
      `單次體力：${def.stamina ?? 1}`,
      `材料：${formatBundleText(def.costs || {})}`,
      `產出：${formatBundleText(def.yields || {})}`,
      `製作節奏：${formatSeconds(getCraftDuration(def, craftId))}`,
      "可選擇無限持續製作。"
    ].join("\n"),
    quantity: 1,
    quantityHint: state.currentCraft
      ? "目前製作線忙碌中，可加入列隊"
      : "可直接開始",
    quickButtons: [1, 10, 50, 100, "∞"],
    allowQueue: true,
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
  const result = saveState({
    state,
    storageKey: STORAGE_KEY
  });

  addLog(result.ok ? "已存檔" : "存檔失敗", "important");
  renderAll();
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

    if (!Array.isArray(state.plots) || state.plots.length === 0) {
      state.plots = [null, null, null];
    }

    if (
      !state.ranchData ||
      typeof state.ranchData !== "object" ||
      Object.keys(state.ranchData).length === 0
    ) {
      state.ranchData = createInitialRanchData();
    }

    state.stamina = clamp(state.stamina, 0, getMaxStamina(state));

    syncDerivedResearchUnlocks();
    updateDerivedStats();

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
  const result = clearSave(STORAGE_KEY);

  stateBootstrap.safeResetState(state);
  state.plots = [null, null, null];
  state.ranchData = createInitialRanchData();

  syncDerivedResearchUnlocks();
  updateDerivedStats();

  addLog(
    result.ok ? "已重置存檔" : "清除存檔時發生錯誤，但目前狀態已重置",
    "important"
  );

  renderAll();
}

function setMainPage(pageName) {
  if (!state.ui) state.ui = {};
  state.ui.mainPage = pageName;

  document.querySelectorAll("[data-main-page]").forEach((panel) => {
    panel.classList.toggle("page-hidden", panel.dataset.mainPage !== pageName);
  });

  document.querySelectorAll("[data-main-nav]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mainNav === pageName);
  });
}

function handleBuildHousing(housingId) {
  buildSystem.buildHousing(housingId);
  updateDerivedStats();
  renderAll();
}

function handleUpgradeBuilding(buildingId) {
  buildSystem.upgradeBuilding(buildingId);
  updateDerivedStats();
  renderAll();
}

function renderBuildArea() {
  updateDerivedStats();

  document.querySelectorAll("[data-build]").forEach((btn) => {
    const housingId = btn.dataset.build;
    const def = housingDefs[housingId];
    if (!def) return;

    const count = buildSystem.getHousingCount(state, housingId);
    const unlocked = isHousingUnlocked(housingId);
    const atCap = count >= Number(def.maxCount || Infinity);
    const title = [
      def.name,
      def.description || "",
      `數量：${count}/${def.maxCount}`,
      `材料：${formatBundleText(def.costs || {})}`,
      unlocked ? canAffordText(def.costs || {}) : "尚未解鎖"
    ].join("\n");

    btn.title = title;
    btn.disabled = !unlocked || atCap;
    btn.textContent = `${def.name} ${count}/${def.maxCount}${atCap ? "（已上限）" : ""}`;
    btn.onclick = () => handleBuildHousing(housingId);
  });

  const root = document.getElementById("buildingButtons");
  if (!root) return;

  root.innerHTML = buildingOrder
    .map((buildingId) => {
      const def = buildingDefs[buildingId];
      if (!def) return "";

      const level = buildSystem.getBuildingLevel(state, buildingId);
      const unlocked = isBuildingUnlocked(buildingId, def);
      const atCap = level >= Number(def.maxLevel || 0);
      const costs = buildSystem.getUpgradeCost(buildingId);

      const title = [
        def.name,
        def.description || "",
        `等級：${level}/${def.maxLevel}`,
        `升級材料：${formatBundleText(costs)}`,
        unlocked ? canAffordText(costs) : `尚未解鎖：${def.unlockResearch || buildingId}`,
        def.effectText || ""
      ].join("\n");

      return `
        <button
          type="button"
          data-upgrade-building="${escapeHtml(buildingId)}"
          title="${escapeHtml(title)}"
          ${!unlocked || atCap ? "disabled" : ""}
        >
          ${escapeHtml(def.name)} Lv.${level}${atCap ? "（已上限）" : ""}
        </button>
      `;
    })
    .join("");

  root.querySelectorAll("[data-upgrade-building]").forEach((btn) => {
    btn.addEventListener("click", () => {
      handleUpgradeBuilding(btn.dataset.upgradeBuilding);
    });
  });
}

function renderFarmArea() {
  const selectedSeed = getSelectedSeedId();
  const selectedDef = farmingDefs[selectedSeed];

  const farmingLevelEl = document.getElementById("farmingLevel");
  if (farmingLevelEl) {
    farmingLevelEl.textContent = state.skills?.farming?.level || 1;
  }

  const seedReturnRateEl = document.getElementById("seedReturnRate");
  if (seedReturnRateEl) {
    seedReturnRateEl.textContent = selectedSeed
      ? farmSystem.getSeedReturnDisplayText(selectedSeed)
      : "無";
  }

  const seedSelectBtn = document.getElementById("seedSelectBtn");
  if (seedSelectBtn) {
    seedSelectBtn.textContent = selectedDef
      ? `手動：${selectedDef.name}`
      : "手動：未選擇";
  }

  const plantBtn = document.getElementById("plantBtn");
  if (plantBtn) {
    const hasSeed = selectedSeed && Number(state.resources?.[selectedSeed] || 0) > 0;
    const hasEmptyPlot = Array.isArray(state.plots) && state.plots.some((plot) => plot === null);
    plantBtn.disabled = !hasSeed || !hasEmptyPlot;
  }

  const farmerSeedBtn = document.getElementById("farmerSeedBtn");
  if (farmerSeedBtn) {
    farmerSeedBtn.textContent = `農夫：${state.ui?.farmerSeedMode || "自動"}`;
  }

  const farmerAutoFertilizeBtn = document.getElementById("farmerAutoFertilizeBtn");
  if (farmerAutoFertilizeBtn) {
    farmerAutoFertilizeBtn.textContent = `施肥：${state.ui?.farmerAutoFertilize ? "開" : "關"}`;
  }

  const root = document.getElementById("plots");
  if (!root) return;

  const plots = Array.isArray(state.plots) ? state.plots : [];
  const cap = farmSystem.getFarmPlotCap();
  const cost = farmSystem.getFarmBuildCost();

  root.innerHTML = `
    <div class="row" style="margin:10px 0 8px;">
      <span class="pill">農田：${plots.length}/${cap}</span>
      <span class="pill">建造費用：${cost.gold} 金、${formatBundleText(cost.resources)}</span>
      <button
        id="buildFarmPlotBtn"
        type="button"
        class="tiny-btn"
        ${plots.length >= cap ? "disabled" : ""}
        title="${escapeHtml(`建造農田\n金幣：${cost.gold}\n材料：${formatBundleText(cost.resources)}`)}"
      >
        建造農田${plots.length >= cap ? "（已上限）" : ""}
      </button>
    </div>

    <div class="plot-grid">
      ${
        plots.length
          ? plots
              .map((plot, index) => {
                if (!plot) {
                  return `
                    <div class="plot">
                      <div class="plot-header">
                        <div class="plot-label">農田 #${index + 1}</div>
                        <span class="tag">空地</span>
                      </div>
                      <div class="plot-note">可以種植選擇中的種子。</div>
                    </div>
                  `;
                }

                const total = Math.max(0.01, Number(plot.total || 0.01));
                const remaining = Math.max(0, Number(plot.remaining || 0));
                const progress = Math.min(100, Math.max(0, ((total - remaining) / total) * 100));
                const mature = remaining <= 0;

                return `
                  <div class="plot">
                    <div class="plot-header">
                      <div class="plot-label">農田 #${index + 1}：${escapeHtml(plot.name || plot.seedId)}</div>
                      <span class="tag">${mature ? "成熟" : "成長中"}</span>
                    </div>

                    <div class="bar">
                      <div class="fill" style="width:${progress}%"></div>
                    </div>

                    <div class="plot-note">
                      剩餘：${formatSeconds(remaining)}
                      ${plot.fertilized ? `｜已施肥：${escapeHtml(plot.fertilizerType)}` : ""}
                    </div>

                    <div class="plot-actions">
                      <button
                        type="button"
                        class="tiny-btn"
                        data-harvest-plot="${index}"
                        ${mature ? "" : "disabled"}
                      >
                        收成
                      </button>
                      <button
                        type="button"
                        class="tiny-btn"
                        data-fertilize-plot="${index}"
                        data-fertilizer="boneMeal"
                        ${!plot.fertilized && Number(state.resources?.boneMeal || 0) > 0 ? "" : "disabled"}
                      >
                        骨粉
                      </button>
                      <button
                        type="button"
                        class="tiny-btn"
                        data-fertilize-plot="${index}"
                        data-fertilizer="compost"
                        ${!plot.fertilized && Number(state.resources?.compost || 0) > 0 ? "" : "disabled"}
                      >
                        肥料堆
                      </button>
                    </div>
                  </div>
                `;
              })
              .join("")
          : `<div class="small muted">目前沒有農田。</div>`
      }
    </div>
  `;

  root.querySelector("#buildFarmPlotBtn")?.addEventListener("click", () => {
    farmSystem.buildFarmPlot();
    renderAll();
  });

  root.querySelectorAll("[data-harvest-plot]").forEach((btn) => {
    btn.addEventListener("click", () => {
      farmSystem.harvestPlot(Number(btn.dataset.harvestPlot));
      renderAll();
    });
  });

  root.querySelectorAll("[data-fertilize-plot]").forEach((btn) => {
    btn.addEventListener("click", () => {
      farmSystem.applyFertilizer(
        Number(btn.dataset.fertilizePlot),
        btn.dataset.fertilizer
      );
      renderAll();
    });
  });
}

function renderPastureArea() {
  const ranchLevelEl = document.getElementById("ranchLevel");
  if (ranchLevelEl) {
    ranchLevelEl.textContent = Number(state.buildings?.ranch || 0);
  }

  const ranchWorkersEl = document.getElementById("ranchWorkers");
  if (ranchWorkersEl) {
    ranchWorkersEl.textContent = workersRuntime.getJobCounts().ranch || 0;
  }

  const root = document.getElementById("pastureArea");
  if (!root) return;

  const animalIds = Object.keys(animalFeedDefs);
  const used = ranchSystem.getRanchUsedCapacity();
  const total = ranchSystem.getRanchTotalCapacity();

  root.innerHTML = `
    <div class="row" style="margin:10px 0 8px;">
      <span class="pill">牧場容量：${used}/${total}</span>
      <button id="autoCullAnimalsBtn" type="button" class="tiny-btn">
        整理超量動物
      </button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px;">
      ${animalIds
        .map((animalId) => {
          const def = animalFeedDefs[animalId];
          const have = Math.floor(Number(state.resources?.[animalId] || 0));
          const cap = ranchSystem.getAnimalCap(animalId);
          const ranchData = state.ranchData?.[animalId] || { fed: 0, timer: 0, enabled: true };
          const enabled = ranchSystem.isAnimalBreedingEnabled(animalId);
          const progress = ranchSystem.getAnimalProgressPercent(animalId);
          const rarity = animalRarity[animalId] || "common";
          const foodHave = Math.floor(Number(state.resources?.[def.food] || 0));
          const canFeed = have > 0 && foodHave >= Number(def.amount || 1);

          return `
            <div style="border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px;background:rgba(255,255,255,.03);display:flex;flex-direction:column;gap:6px;">
              <div style="display:flex;justify-content:space-between;gap:8px;">
                <strong>${escapeHtml(getResourceLabel(animalId))}</strong>
                <span class="pill">${escapeHtml(getAnimalRarityLabel(rarity))}</span>
              </div>

              <div class="small muted">數量：${have}/${cap}</div>
              <div class="small muted">餵養：${Math.floor(Number(ranchData.fed || 0))} 次</div>
              <div class="small muted">飼料：${escapeHtml(getResourceLabel(def.food))} × ${def.amount}（持有 ${foodHave}）</div>

              <div class="bar">
                <div class="fill" style="width:${progress}%"></div>
              </div>

              <div class="row">
                <button
                  type="button"
                  class="tiny-btn"
                  data-feed-animal="${escapeHtml(animalId)}"
                  ${canFeed ? "" : "disabled"}
                >
                  餵養
                </button>

                <button
                  type="button"
                  class="tiny-btn"
                  data-toggle-animal="${escapeHtml(animalId)}"
                >
                  繁殖：${enabled ? "開" : "關"}
                </button>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  root.querySelector("#autoCullAnimalsBtn")?.addEventListener("click", () => {
    ranchSystem.autoCullExcessAnimals(true);
    renderAll();
  });

  root.querySelectorAll("[data-feed-animal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      ranchSystem.feedAnimal(btn.dataset.feedAnimal);
      renderAll();
    });
  });

  root.querySelectorAll("[data-toggle-animal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      ranchSystem.toggleAnimalBreeding(btn.dataset.toggleAnimal);
      renderAll();
    });
  });
}

function renderExtraPanels() {
  updateDerivedStats();
  renderBuildArea();
  renderFarmArea();
  renderPastureArea();
}

function claimTax() {
  tradeSystem.claimTax();
  renderAll();
}

function updateTax(deltaSeconds) {
  tradeSystem.updateTaxTimer({
    deltaSeconds,
    effectiveWorkerWage: workersRuntime.effectiveWorkerWage,
    safetyValue: () => state.safetyValue
  });
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
    openWorkActionModal(workId);
  },

  onCraftClick: (craftId) => {
    openCraftActionModal(craftId);
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
    updateDerivedStats();
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

const rawRenderAll = appRenderer.renderAll;

function renderHeaderStatsWithDerived() {
  syncDerivedResearchUnlocks();
  updateDerivedStats();
  appRenderer.renderHeaderStats();
}

function renderLivePanelsWithExtras() {
  updateDerivedStats();
  appRenderer.renderLivePanels();
  renderExtraPanels();
}

renderAll = () => {
  syncDerivedResearchUnlocks();
  updateDerivedStats();
  rawRenderAll();
  renderExtraPanels();
  setMainPage(state.ui?.mainPage || "production");
};

const gameWorkersRuntime = {
  ...workersRuntime,
  update(deltaSeconds) {
    workersRuntime.update(deltaSeconds);
    updateTax(deltaSeconds);
  }
};

const appLoop = createAppLoop({
  state,
  workSystem,
  updateCraft,
  researchSystem,
  merchantRuntime,
  workersRuntime: gameWorkersRuntime,
  tryStartNextWork,
  tryStartNextCraft,
  renderHeaderStats: renderHeaderStatsWithDerived,
  renderLivePanels: renderLivePanelsWithExtras
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

    onLoad: () => {
      loadGame();
    },

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

    onClaimTax: claimTax,

    onPayDebt: () => {
      workersRuntime.payDebt();
      renderAll();
    },

    onRecruitWorker: () => {
      workersRuntime.recruitWorker();
      updateDerivedStats();
      renderAll();
    },

    onOpenSeedSelect: openSeedSelect,

    onPlant: () => {
      const seedId = getSelectedSeedId();
      farmSystem.plantSeed(seedId);
      renderAll();
    },

    onToggleFarmerSeedMode: () => {
      if (!state.ui) state.ui = {};
      state.ui.farmerSeedMode =
        state.ui.farmerSeedMode === "自動" ? "手動" : "自動";
      addLog(`農夫種植模式：${state.ui.farmerSeedMode}`, "important");
      renderAll();
    },

    onToggleFarmerAutoFertilize: () => {
      if (!state.ui) state.ui = {};
      state.ui.farmerAutoFertilize = !state.ui.farmerAutoFertilize;
      addLog(
        `自動施肥已${state.ui.farmerAutoFertilize ? "開啟" : "關閉"}`,
        "important"
      );
      renderAll();
    }
  });

  syncDerivedResearchUnlocks();
  updateDerivedStats();
  setMainPage(state.ui?.mainPage || "production");
  renderAll();
  appLoop.start();
}

init();
