import { resourceLabels, edibleValues } from "../data/resources.js";
import { workDefs } from "../data/works.js";
import { crafts } from "../data/crafts.js";
import { housingDefs, buildingDefs, buildingOrder, housingOrder } from "../data/buildings.js";
import { books, researchDefs, researchCategoryOrder } from "../data/research.js";
import { farmingDefs } from "../data/farming.js";
import { animalFeedDefs, createInitialRanchData } from "../data/animals.js";
import { merchantDefaults } from "../data/trade.js";

import { createInitialState, resetState } from "../core/state.js";
import { $, qsa, firstEl, clamp, nowTime, formatSeconds } from "../core/utils.js";

import { bindEvents } from "./bindEvents.js";

import { createPlayerSystem, getExpToNext } from "../systems/player.js";
import { createStaminaSystem, getMaxStamina } from "../systems/stamina.js";
import { createWorkSystem, getWorkCost, getWorkDuration } from "../systems/work.js";
import { createCraftSystem } from "../systems/craft.js";
import { createResearchSystem } from "../systems/research.js";
import { createBuildSystem, getBuildingLevel, getHousingCount } from "../systems/build.js";
import { createFarmSystem } from "../systems/farm.js";
import { createRanchSystem } from "../systems/ranch.js";
import { createMerchantSystem } from "../systems/merchant.js";
import { createTradeSystem } from "../systems/trade.js";

const STORAGE_KEY = "city_lord_modular_save_v1";
const LOG_LIMIT = 120;
const WORK_QUEUE_LIMIT = 3;

function createDefaultResources() {
  const ids = new Set();

  Object.keys(resourceLabels).forEach((id) => ids.add(id));

  Object.values(crafts).forEach((craft) => {
    Object.keys(craft.costs || {}).forEach((id) => ids.add(id));
    Object.keys(craft.yields || {}).forEach((id) => ids.add(id));
  });

  Object.keys(farmingDefs).forEach((id) => ids.add(id));
  Object.keys(books).forEach((id) => ids.add(id));
  Object.keys(animalFeedDefs).forEach((id) => ids.add(id));

  return Object.fromEntries([...ids].sort().map((id) => [id, 0]));
}

function normalizeLoadedLogs(logs) {
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

function getResourceLabel(id) {
  return resourceLabels[id] || id;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function ensureExtendedState(s) {
  s.gold = Number(s.gold || 0);
  s.level = Math.max(1, Number(s.level || 1));
  s.exp = Math.max(0, Number(s.exp || 0));
  s.stamina = Number(s.stamina || 100);

  if (typeof s.intelligence !== "number") s.intelligence = 0;
  if (typeof s.managementLevel !== "number") s.managementLevel = 1;
  if (typeof s.managementExp !== "number") s.managementExp = 0;
  if (typeof s.tradeLevel !== "number") s.tradeLevel = 1;
  if (typeof s.tradeExp !== "number") s.tradeExp = 0;
  if (typeof s.reputation !== "number") s.reputation = 0;
  if (typeof s.pendingTax !== "number") s.pendingTax = 0;
  if (typeof s.castleLevel !== "number") s.castleLevel = 1;

  if (!s.resources || typeof s.resources !== "object") s.resources = {};
  s.resources = {
    ...createDefaultResources(),
    ...s.resources
  };

  s.logs = normalizeLoadedLogs(s.logs);

  if (!s.research || typeof s.research !== "object") s.research = {};
  if (!s.currentResearch || typeof s.currentResearch !== "object") s.currentResearch = null;
  if (!Array.isArray(s.researchQueue)) s.researchQueue = [];

  if (!s.currentAction || typeof s.currentAction !== "object") s.currentAction = null;
  if (!Array.isArray(s.actionQueue)) s.actionQueue = [];

  if (!s.housing || typeof s.housing !== "object") s.housing = {};
  if (!s.buildings || typeof s.buildings !== "object") s.buildings = {};

  if (!Array.isArray(s.plots)) s.plots = [null, null, null];
  if (!s.ranchData || typeof s.ranchData !== "object") s.ranchData = createInitialRanchData();

  if (!Array.isArray(s.workers)) s.workers = [];
  if (!s.merchant || typeof s.merchant !== "object") s.merchant = deepClone(merchantDefaults);

  if (!s.ui || typeof s.ui !== "object") s.ui = {};
  if (!s.ui.manualSeedSelection || !farmingDefs[s.ui.manualSeedSelection]) {
    s.ui.manualSeedSelection = "wheatSeed";
  }

  if (typeof s.logFilter !== "string") s.logFilter = "all";

  return s;
}

const state = ensureExtendedState(createInitialState(createDefaultResources));

let lastFrameTime = performance.now();

function addLog(text, type = "important") {
  state.logs.unshift({
    time: nowTime(),
    text,
    type
  });
  state.logs = state.logs.slice(0, LOG_LIMIT);
  render();
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
  for (const [id, amount] of Object.entries(costs)) {
    state.resources[id] -= amount;
  }
  return true;
}

function addManagementExp(amount) {
  state.managementExp += amount;
  while (state.managementExp >= getExpToNext(state.managementLevel)) {
    state.managementExp -= getExpToNext(state.managementLevel);
    state.managementLevel += 1;
    addLog(`管理等級提升到 Lv.${state.managementLevel}`, "important");
  }
}

function getManagementMaterialDiscount() {
  return Math.min(0.15, state.managementLevel * 0.005);
}

function effectiveWorkerWage() {
  return 8;
}

function safetyValue() {
  return buildSystem.getSafetyValue();
}

const playerSystem = createPlayerSystem({
  state,
  addLog
});

const staminaSystem = createStaminaSystem({
  state,
  addLog,
  spendResource
});

const tradeSystem = createTradeSystem({
  state,
  addLog,
  addManagementExp
});

const workSystem = createWorkSystem({
  state,
  addLog,
  addMainExp: playerSystem.addMainExp,
  gainResource
});

const craftSystem = createCraftSystem({
  state,
  addLog,
  addMainExp: playerSystem.addMainExp,
  gainResource,
  canAfford,
  spendCosts
});

const buildSystem = createBuildSystem({
  state,
  addLog,
  spendCosts
});

const farmSystem = createFarmSystem({
  state,
  addLog,
  gainResource,
  spendResource,
  spendCosts,
  getManagementMaterialDiscount
});

const ranchSystem = createRanchSystem({
  state,
  addLog,
  gainResource,
  spendResource
});

const researchSystem = createResearchSystem({
  state,
  addLog,
  gainResource,
  countBuiltPlots: () => farmSystem.countBuiltPlots()
});

const sellPrices = {
  wood: 2,
  stone: 2,
  fish: 4,
  shrimp: 5,
  crab: 8,
  herb: 4,
  rareHerb: 12,
  mushroom: 4,
  leather: 10,
  softLeather: 18,
  cottonCloth: 9,
  clothes: 24,
  staminaPotion: 30,
  stoneBrick: 6,
  brick: 6,
  glassBottle: 8,
  boneMeal: 5,
  compost: 5
};

const merchantSystem = createMerchantSystem({
  state,
  addLog,
  addTradeExp: tradeSystem.addTradeExp,
  addReputation: tradeSystem.addReputation,
  sellPrices
});

function syncDerivedResearchUnlocks() {
  Object.entries(researchDefs).forEach(([researchId, def]) => {
    if (!state.research[researchId]) return;

    if (def.unlockCraft) state.research[def.unlockCraft] = true;
    if (def.unlockBuild) state.research[def.unlockBuild] = true;
    if (def.unlockHouse) state.research[def.unlockHouse] = true;
  });

  if (state.buildings.blacksmith && !state.buildings.smithy) {
    state.buildings.smithy = state.buildings.blacksmith;
  }
  if (state.buildings.tailorHut && !state.buildings.tannery) {
    state.buildings.tannery = state.buildings.tailorHut;
  }
}

function saveGame() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    addLog("已存檔", "important");
  } catch (error) {
    console.error(error);
    addLog("存檔失敗", "important");
  }
}

function loadGame({ silent = false } = {}) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (!silent) addLog("沒有存檔", "important");
      return false;
    }

    const data = JSON.parse(raw);
    const next = ensureExtendedState(data);

    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, next);

    state.stamina = clamp(state.stamina, 0, getMaxStamina(state));
    syncDerivedResearchUnlocks();

    if (!silent) addLog("已讀檔", "important");
    return true;
  } catch (error) {
    console.error(error);
    if (!silent) addLog("讀檔失敗", "important");
    return false;
  }
}

function hardResetState() {
  resetState(state, createDefaultResources);
  ensureExtendedState(state);
}

function resetGame() {
  localStorage.removeItem(STORAGE_KEY);
  hardResetState();
  addLog("已重置存檔", "important");
}

function cycleManualSeedSelection() {
  const ids = Object.keys(farmingDefs);
  const current = state.ui.manualSeedSelection || ids[0];
  const idx = ids.indexOf(current);
  const next = ids[(idx + 1) % ids.length];
  state.ui.manualSeedSelection = next;
  render();
}

function plantSelectedSeed() {
  const seedId = state.ui.manualSeedSelection || "wheatSeed";
  farmSystem.plantSeed(seedId);
  render();
}

function bindStaticDataButtons(root = document) {
  root.querySelectorAll("[data-work]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => workSystem.requestWork(btn.dataset.work));
  });

  root.querySelectorAll("[data-craft]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      craftSystem.craftItem(btn.dataset.craft);
      render();
    });
  });

  root.querySelectorAll("[data-build]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      buildSystem.buildHousing(btn.dataset.build);
      render();
    });
  });
}

function renderTopStats() {
  const maxStaminaValue = getMaxStamina(state);
  const housingCap = buildSystem.getHousingCapacity();
  const safety = buildSystem.getSafetyValue();

  $("gold") && ($("gold").textContent = Math.floor(state.gold));
  $("level") && ($("level").textContent = state.level);
  $("exp") && ($("exp").textContent = Math.floor(state.exp));
  $("expNext") && ($("expNext").textContent = getExpToNext(state.level));

  $("intelligence") && ($("intelligence").textContent = state.intelligence);
  $("stamina") && ($("stamina").textContent = Math.floor(state.stamina));
  $("maxStamina") && ($("maxStamina").textContent = maxStaminaValue);

  $("managementLevel") && ($("managementLevel").textContent = state.managementLevel);
  $("managementExp") && ($("managementExp").textContent = Math.floor(state.managementExp));
  $("managementExpNext") && ($("managementExpNext").textContent = getExpToNext(state.managementLevel));

  $("tradeLevel") && ($("tradeLevel").textContent = state.tradeLevel);
  $("reputationValue") && ($("reputationValue").textContent = state.reputation.toFixed(1));
  $("taxIncome") && ($("taxIncome").textContent = Math.floor(state.pendingTax));

  $("housingCap") && ($("housingCap").textContent = housingCap);
  $("housingUsed") && ($("housingUsed").textContent = Array.isArray(state.workers) ? state.workers.length : 0);
  $("safetyValue") && ($("safetyValue").textContent = safety);

  $("expBar") &&
    ($("expBar").style.width = `${clamp((state.exp / getExpToNext(state.level)) * 100, 0, 100)}%`);
  $("staminaBar") &&
    ($("staminaBar").style.width = `${clamp((state.stamina / maxStaminaValue) * 100, 0, 100)}%`);
  $("managementBar") &&
    ($("managementBar").style.width = `${clamp((state.managementExp / getExpToNext(state.managementLevel)) * 100, 0, 100)}%`);

  const bestFood = staminaSystem.getBestFoodId();
  const eatHint = $("eatHint");
  if (eatHint) {
    eatHint.textContent = bestFood
      ? `目前最佳食物：${getResourceLabel(bestFood)}（${edibleValues[bestFood] >= 0 ? "+" : ""}${edibleValues[bestFood]}）`
      : "目前沒有可吃的食物";
  }
}

function renderResources() {
  const root = $("resources");
  if (!root) return;

  root.innerHTML = Object.entries(state.resources)
    .sort((a, b) => getResourceLabel(a[0]).localeCompare(getResourceLabel(b[0]), "zh-Hant"))
    .map(([id, value]) => {
      const edible =
        typeof edibleValues[id] === "number"
          ? `<div class="meta">可食用：${edibleValues[id] >= 0 ? "+" : ""}${edibleValues[id]} 體力</div>`
          : "";

      return `
        <div class="resource-item">
          <div>${getResourceLabel(id)}</div>
          <div><strong>${Math.floor(value)}</strong></div>
          ${edible}
        </div>
      `;
    })
    .join("");
}

function renderWorkButtons() {
  const root = $("workButtons");
  if (!root) return;

  root.innerHTML = Object.entries(workDefs)
    .map(([id, def]) => {
      const cost = getWorkCost(def);
      const duration = getWorkDuration(def);
      return `<button data-work="${id}" type="button">${def.name}（-${cost} 體力 / ${formatSeconds(duration)}）</button>`;
    })
    .join("");

  bindStaticDataButtons(root);
}

function renderCraftList() {
  const root = $("craftList");
  if (!root) return;

  const entries = Object.entries(crafts).filter(([, def]) => !craftSystem.isCraftHidden(def));

  root.innerHTML = entries
    .map(([id, def]) => {
      const unlocked = craftSystem.isCraftUnlocked(def);
      const costText = Object.entries(def.costs || {})
        .map(([resId, amount]) => `${getResourceLabel(resId)} ${amount}`)
        .join("、");
      const yieldText = Object.entries(def.yields || {})
        .map(([resId, amount]) => `${getResourceLabel(resId)} ${amount}`)
        .join("、");

      return `
        <div class="recipe-card">
          <div class="top">
            <strong>${def.name}</strong>
            <button data-craft="${id}" type="button" ${unlocked ? "" : "disabled"}>製作</button>
          </div>
          <div class="small muted">${def.skill || "craft"}</div>
          <div class="row" style="margin-top:8px;">
            <span class="pill">消耗體力：${def.stamina ?? 1}</span>
            <span class="pill">材料：${costText || "無"}</span>
            <span class="pill">產出：${yieldText || "無"}</span>
            ${def.unlock ? `<span class="pill ${unlocked ? "" : "bad"}">${unlocked ? "已解鎖" : `需研究：${def.unlock}`}</span>` : ""}
          </div>
        </div>
      `;
    })
    .join("");

  bindStaticDataButtons(root);
}

function renderBuildingButtons() {
  const root = $("buildingButtons");
  if (!root) return;

  root.innerHTML = buildingOrder
    .filter((id) => buildingDefs[id])
    .map((id) => {
      const def = buildingDefs[id];
      const level = getBuildingLevel(state, id);
      const costs = buildSystem.getUpgradeCost(id);
      const costText = Object.entries(costs)
        .map(([resId, amount]) => `${getResourceLabel(resId)} ${amount}`)
        .join("、");

      return `
        <div class="recipe-card">
          <div class="top">
            <strong>${def.name} Lv.${level}</strong>
            <button data-upgrade-building="${id}" type="button">升級</button>
          </div>
          <div class="small muted">${def.effectText || def.description || ""}</div>
          <div class="row" style="margin-top:8px;">
            <span class="pill">上限：${def.maxLevel}</span>
            <span class="pill">成本：${costText || "無"}</span>
          </div>
        </div>
      `;
    })
    .join("");

  root.querySelectorAll("[data-upgrade-building]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      buildSystem.upgradeBuilding(btn.dataset.upgradeBuilding);
      render();
    });
  });
}

function renderResearchArea() {
  const root = $("researchArea");
  if (!root) return;

  const bookCards = Object.values(books)
    .map((book) => {
      const own = Math.floor(state.resources[book.id] || 0);
      return `
        <div class="book-card">
          <strong>${book.name}</strong>
          <div class="small muted">持有：${own}</div>
          <div class="small muted">閱讀：${formatSeconds(book.duration)}</div>
          <button data-read-book="${book.id}" type="button" ${own > 0 ? "" : "disabled"}>閱讀</button>
        </div>
      `;
    })
    .join("");

  const researchCards = researchCategoryOrder
    .map((category) => {
      const list = Object.entries(researchDefs)
        .filter(([, def]) => def.category === category)
        .map(([id, def]) => {
          const done = researchSystem.isResearchCompleted(id);
          const available = researchSystem.meetsResearchRequirements(def);
          return `
            <div class="research-card">
              <div class="research-summary">
                <strong>${def.name}</strong>
                <div class="research-status ${done ? "done" : ""}">
                  ${done ? "已完成" : available ? "可研究" : researchSystem.getMissingRequirementText(def)}
                </div>
              </div>
              <button data-start-research="${id}" type="button" class="research-mini-btn" ${done ? "disabled" : ""}>
                ${done ? "完成" : "研究"}
              </button>
            </div>
          `;
        })
        .join("");

      return `
        <details open>
          <summary>${category}</summary>
          <div class="research-grid">${list}</div>
        </details>
      `;
    })
    .join("");

  root.innerHTML = `
    <div class="section-title">
      <strong>書籍閱讀</strong>
    </div>
    <div class="book-grid">${bookCards}</div>
    <div style="margin-top:12px"></div>
    ${researchCards}
  `;

  root.querySelectorAll("[data-start-research]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      researchSystem.startResearch(btn.dataset.startResearch);
      render();
    });
  });

  root.querySelectorAll("[data-read-book]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      researchSystem.startReading(btn.dataset.readBook);
      render();
    });
  });
}

function renderPlots() {
  const root = $("plots");
  if (!root) return;

  root.innerHTML = state.plots
    .map((plot, index) => {
      if (!plot) {
        return `
          <div class="plot">
            <div class="plot-label">農田 #${index + 1}</div>
            <div class="plot-note">空地</div>
            <div class="plot-actions">
              <button class="tiny-btn" data-plant-plot="${index}">種植 ${farmingDefs[state.ui.manualSeedSelection].name}</button>
            </div>
          </div>
        `;
      }

      const progress = clamp(((plot.total - plot.remaining) / plot.total) * 100, 0, 100);

      return `
        <div class="plot">
          <div class="plot-header">
            <div class="plot-label">${plot.name}</div>
            <div class="small muted">${formatSeconds(plot.remaining)}</div>
          </div>
          <div class="bar"><div class="fill action" style="width:${progress}%"></div></div>
          <div class="plot-note">${farmSystem.getSeedReturnDisplayText(plot.seedId)}</div>
          <div class="plot-actions">
            <button class="tiny-btn" data-harvest-plot="${index}" ${plot.remaining <= 0 ? "" : "disabled"}>收成</button>
            <button class="tiny-btn" data-fertilize-plot="${index}" data-fertilizer="boneMeal">骨粉</button>
            <button class="tiny-btn" data-fertilize-plot="${index}" data-fertilizer="compost">肥料</button>
          </div>
        </div>
      `;
    })
    .join("");

  root.querySelectorAll("[data-plant-plot]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      farmSystem.plantSeed(state.ui.manualSeedSelection, Number(btn.dataset.plantPlot));
      render();
    });
  });

  root.querySelectorAll("[data-harvest-plot]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      farmSystem.harvestPlot(Number(btn.dataset.harvestPlot));
      render();
    });
  });

  root.querySelectorAll("[data-fertilize-plot]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      farmSystem.applyFertilizer(Number(btn.dataset.fertilizePlot), btn.dataset.fertilizer);
      render();
    });
  });
}

function renderPastureArea() {
  const root = $("pastureArea");
  if (!root) return;

  root.innerHTML = Object.keys(animalFeedDefs)
    .map((animalId) => {
      const count = Math.floor(state.resources[animalId] || 0);
      const cap = ranchSystem.getAnimalCap(animalId);
      const fed = state.ranchData?.[animalId]?.fed || 0;
      const enabled = ranchSystem.isAnimalBreedingEnabled(animalId);
      const progress = ranchSystem.getAnimalProgressPercent(animalId);

      return `
        <div class="plot">
          <div class="plot-header">
            <div class="plot-label">${getResourceLabel(animalId)}</div>
            <div class="small muted">${count} / ${cap}</div>
          </div>
          <div class="bar"><div class="fill action" style="width:${progress}%"></div></div>
          <div class="plot-note">待繁殖餵養：${fed}｜狀態：${enabled ? "開啟" : "關閉"}</div>
          <div class="plot-actions">
            <button class="tiny-btn" data-feed-animal="${animalId}">餵食</button>
            <button class="tiny-btn" data-toggle-animal="${animalId}">${enabled ? "關閉" : "開啟"}</button>
          </div>
        </div>
      `;
    })
    .join("");

  root.querySelectorAll("[data-feed-animal]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      ranchSystem.feedAnimal(btn.dataset.feedAnimal);
      render();
    });
  });

  root.querySelectorAll("[data-toggle-animal]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      ranchSystem.toggleAnimalBreeding(btn.dataset.toggleAnimal);
      render();
    });
  });
}

function renderMerchantArea() {
  const root = $("merchantArea");
  if (!root) return;

  const merchant = state.merchant;
  const orders = Array.isArray(merchant.orders) ? merchant.orders : [];

  root.innerHTML = `
    <div class="small muted">
      商人狀態：${merchant.present ? `來訪中（剩餘 ${Math.ceil(merchant.presentSec)} 秒）` : "未來訪"}
    </div>
    <div class="small muted" style="margin-top:4px">
      到訪率：約 ${(merchantSystem.merchantChancePerMinute() * 100).toFixed(1)}% / 分鐘
    </div>
    <div class="small muted" style="margin-top:4px">
      攜帶現金：${merchant.cash || 0}
    </div>
    <div class="merchant-board">
      ${orders.map((order) => `
        <div class="order-card">
          <strong>${order.from}｜${order.tierLabel}</strong>
          <div class="small muted">需求：${getResourceLabel(order.resource)} × ${order.qty}</div>
          <div class="small muted">報酬：${order.rewardGold} 金 / 貿易 ${order.rewardTrade} / 聲望 ${order.rewardRep}</div>
          <div class="order-actions">
            <button data-fulfill-order="${order.id}" type="button">完成</button>
            <button data-cancel-order="${order.id}" type="button">取消</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;

  root.querySelectorAll("[data-fulfill-order]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      merchantSystem.fulfillMerchantOrder(btn.dataset.fulfillOrder);
      render();
    });
  });

  root.querySelectorAll("[data-cancel-order]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      merchantSystem.cancelMerchantOrder(btn.dataset.cancelOrder);
      render();
    });
  });
}

function renderActionLane() {
  const textEl = firstEl("productionText", "actionStatus");
  const barEl = firstEl("productionBar", "actionProgressBar");
  const queueEl = firstEl("productionQueue", "actionQueue");
  const cancelBtn = $("cancelActionBtn");
  const clearBtn = $("clearActionQueueBtn");

  if (!textEl || !barEl || !queueEl) return;

  if (state.currentAction && workDefs[state.currentAction.id]) {
    const def = workDefs[state.currentAction.id];
    const progress = clamp(
      ((state.currentAction.total - state.currentAction.remaining) / state.currentAction.total) * 100,
      0,
      100
    );

    textEl.textContent = `進行中：${def.name}｜剩餘 ${formatSeconds(state.currentAction.remaining)}`;
    barEl.style.width = `${progress}%`;
  } else if (state.actionQueue.length > 0) {
    const nextDef = workDefs[state.actionQueue[0]];
    if (nextDef && state.stamina < getWorkCost(nextDef)) {
      textEl.textContent = `等待中：${nextDef.name}｜體力不足，需要 ${getWorkCost(nextDef)} 體力`;
    } else {
      textEl.textContent = `等待中：下一項 ${nextDef ? nextDef.name : "未知工作"}`;
    }
    barEl.style.width = "0%";
  } else {
    textEl.textContent = "目前沒有進行中的工作";
    barEl.style.width = "0%";
  }

  queueEl.innerHTML = state.actionQueue.length
    ? state.actionQueue
        .map((id, index) => `<span class="queue-pill">${index + 1}. ${workDefs[id]?.name || id}</span>`)
        .join("")
    : `<span class="small muted">行動列為空</span>`;

  if (cancelBtn) cancelBtn.disabled = !state.currentAction;
  if (clearBtn) clearBtn.disabled = state.actionQueue.length === 0;
}

function renderResearchLane() {
  const textEl = $("researchText");
  const barEl = $("researchBar");
  const queueEl = $("researchQueue");

  if (!textEl || !barEl || !queueEl) return;

  if (state.currentResearch) {
    const progress = clamp(
      ((state.currentResearch.total - state.currentResearch.remaining) / state.currentResearch.total) * 100,
      0,
      100
    );

    textEl.textContent = `研究中：${state.currentResearch.name}｜剩餘 ${formatSeconds(state.currentResearch.remaining)}`;
    barEl.style.width = `${progress}%`;
  } else if (state.researchQueue.length > 0) {
    textEl.textContent = `等待中：下一項 ${state.researchQueue[0].name}`;
    barEl.style.width = "0%";
  } else {
    textEl.textContent = "目前沒有進行中的研究";
    barEl.style.width = "0%";
  }

  queueEl.innerHTML = state.researchQueue.length
    ? state.researchQueue
        .map((item, index) => `<span class="queue-pill">${index + 1}. ${item.name}</span>`)
        .join("")
    : `<span class="small muted">研究列為空</span>`;
}

function renderWorkersArea() {
  const root = $("workers");
  if (!root) return;
  root.innerHTML = `<div class="small muted">工人系統尚未完全模組化，先保留資料欄位與顯示區。</div>`;
}

function renderLog() {
  const root = $("log");
  if (!root) return;

  let rows = state.logs || [];
  if (state.logFilter !== "all") {
    rows = rows.filter((item) => (item.type || "important") === state.logFilter);
  }

  if (rows.length === 0) {
    root.innerHTML = `<div class="log-item">目前還沒有事件紀錄</div>`;
  } else {
    root.innerHTML = rows
      .map((item) => {
        const text = typeof item === "string" ? item : item.text;
        const time = typeof item === "string" ? "" : item.time || "";
        return `<div class="log-item">${time ? `<span class="small muted">${time}</span> ` : ""}${text}</div>`;
      })
      .join("");
  }

  $("logAllBtn")?.classList.toggle("active", state.logFilter === "all");
  $("logImportantBtn")?.classList.toggle("active", state.logFilter === "important");
  $("logLootBtn")?.classList.toggle("active", state.logFilter === "loot");
  $("logWorkerBtn")?.classList.toggle("active", state.logFilter === "worker");
}

function render() {
  syncDerivedResearchUnlocks();
  renderTopStats();
  renderResources();
  renderWorkButtons();
  renderCraftList();
  renderBuildingButtons();
  renderResearchArea();
  renderPlots();
  renderPastureArea();
  renderMerchantArea();
  renderActionLane();
  renderResearchLane();
  renderWorkersArea();
  renderLog();
}

function loop(now) {
  const deltaSeconds = Math.min(0.2, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  workSystem.updateAction(deltaSeconds);
  researchSystem.updateResearch(deltaSeconds);
  farmSystem.updatePlots(deltaSeconds);
  ranchSystem.updateRanch(deltaSeconds);
  merchantSystem.updateMerchant(deltaSeconds);
  tradeSystem.updateTaxTimer({
    deltaSeconds,
    effectiveWorkerWage,
    safetyValue
  });

  syncDerivedResearchUnlocks();
  renderActionLane();
  renderResearchLane();

  requestAnimationFrame(loop);
}

function init() {
  loadGame({ silent: true });
  syncDerivedResearchUnlocks();

  bindEvents({
    onRest: staminaSystem.rest,
    onEatBest: staminaSystem.eatBestFood,
    onSave: saveGame,
    onLoad: () => loadGame(),
    onResetConfirm: resetGame,
    onCancelAction: workSystem.cancelCurrentAction,
    onClearActionQueue: workSystem.clearActionQueue,
    onSetLogFilter: (filter) => {
      state.logFilter = filter;
      renderLog();
    }
  });

  $("seedSelectBtn")?.addEventListener("click", cycleManualSeedSelection);
  $("plantBtn")?.addEventListener("click", plantSelectedSeed);
  $("claimTaxBtn")?.addEventListener("click", () => {
    tradeSystem.claimTax();
    render();
  });

  bindStaticDataButtons(document);
  render();
  requestAnimationFrame(loop);
}

init();
