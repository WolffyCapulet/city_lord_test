import { resourceLabels, edibleValues } from "../data/resources.js";
import { workDefs } from "../data/works.js";
import { crafts } from "../data/crafts.js";
import { books, researchDefs } from "../data/research.js";

import { createInitialState, resetState } from "../core/state.js";
import { $, qsa, firstEl, clamp, nowTime, formatSeconds } from "../core/utils.js";

import { bindEvents } from "./bindEvents.js";

import { createPlayerSystem, getExpToNext } from "../systems/player.js";
import { createStaminaSystem, getMaxStamina } from "../systems/stamina.js";
import { createWorkSystem, getWorkCost, getWorkDuration } from "../systems/work.js";
import { createCraftSystem } from "../systems/craft.js";
import { createResearchSystem } from "../systems/research.js";

const STORAGE_KEY = "city_lord_rescue_save_v1";
const LOG_LIMIT = 120;

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

function ensureExtendedState(s) {
  s.gold = Number(s.gold || 0);
  s.level = Math.max(1, Number(s.level || 1));
  s.exp = Math.max(0, Number(s.exp || 0));
  s.stamina = Number(s.stamina || 100);

  if (typeof s.intelligence !== "number") s.intelligence = 0;
  if (typeof s.managementLevel !== "number") s.managementLevel = 1;
  if (typeof s.managementExp !== "number") s.managementExp = 0;
  if (typeof s.tradeLevel !== "number") s.tradeLevel = 1;
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

  if (!Array.isArray(s.workers)) s.workers = [];
  if (!s.ui || typeof s.ui !== "object") s.ui = {};
  if (!s.ui.mainPage || typeof s.ui.mainPage !== "string") s.ui.mainPage = "production";

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
  renderLog();
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

const playerSystem = createPlayerSystem({
  state,
  addLog
});

const staminaSystem = createStaminaSystem({
  state,
  addLog,
  spendResource
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

const researchSystem = createResearchSystem({
  state,
  addLog,
  gainResource,
  countBuiltPlots: () => 0
});

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

    if (!silent) addLog("已讀檔", "important");
    renderAll();
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
  renderAll();
  addLog("已重置存檔", "important");
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
      renderAll();
    });
  });
}

function safeRender(fn) {
  try {
    fn();
  } catch (error) {
    console.error(error);
  }
}

function renderTopStats() {
  const maxStaminaValue = getMaxStamina(state);

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
  $("castleLevel") && ($("castleLevel").textContent = state.castleLevel);

  $("housingCap") && ($("housingCap").textContent = 0);
  $("housingUsed") && ($("housingUsed").textContent = 0);
  $("safetyValue") && ($("safetyValue").textContent = 0);

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

  const totalKinds = Object.keys(state.resources).length;
  const totalAmount = Object.values(state.resources).reduce((sum, n) => sum + Number(n || 0), 0);

  root.innerHTML = `
    <div class="small muted" style="margin-bottom:8px;">
      物資種類：${totalKinds}｜總數量：${Math.floor(totalAmount)}
    </div>
    <div class="resource-list">
      ${Object.entries(state.resources)
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
        .join("")}
    </div>
  `;
}

function renderWorkButtons() {
  const root = $("workButtons");
  if (!root) {
    bindStaticDataButtons(document);
    return;
  }

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
  if (!root) {
    bindStaticDataButtons(document);
    return;
  }

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

function renderResearchArea() {
  const root = $("researchArea");
  if (!root) return;

  const categories = [...new Set(Object.values(researchDefs).map((def) => def.category || "other"))];

  const bookCards = Object.entries(books)
    .map(([id, book]) => {
      const own = Math.floor(state.resources[id] || 0);
      return `
        <div class="book-card">
          <strong>${book.name}</strong>
          <div class="small muted">持有：${own}</div>
          <div class="small muted">閱讀：${formatSeconds(book.duration)}</div>
          <button data-read-book="${id}" type="button" ${own > 0 ? "" : "disabled"}>閱讀</button>
        </div>
      `;
    })
    .join("");

  const researchBlocks = categories
    .map((category) => {
      const cards = Object.entries(researchDefs)
        .filter(([, def]) => (def.category || "other") === category)
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
          <div class="research-grid">${cards}</div>
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
    ${researchBlocks}
  `;

  root.querySelectorAll("[data-start-research]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      researchSystem.startResearch(btn.dataset.startResearch);
      renderAll();
    });
  });

  root.querySelectorAll("[data-read-book]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      researchSystem.startReading(btn.dataset.readBook);
      renderAll();
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

function renderCraftLaneFallback() {
  $("craftText") && ($("craftText").textContent = "製作線：目前採即時完成，尚未接製作讀條。");
  $("craftBar") && ($("craftBar").style.width = "0%");
  $("craftQueueTop") && ($("craftQueueTop").innerHTML = `<span class="small muted">尚未接製作列隊</span>`);
}

function renderPlaceholders() {
  if ($("buildingButtons")) {
    $("buildingButtons").innerHTML = `<div class="small muted">建築系統尚未接入救活版 main.js。</div>`;
  }
  if ($("plots")) {
    $("plots").innerHTML = `<div class="small muted">農田系統尚未接入救活版 main.js。</div>`;
  }
  if ($("pastureArea")) {
    $("pastureArea").innerHTML = `<div class="small muted">牧場系統尚未接入救活版 main.js。</div>`;
  }
  if ($("merchantArea")) {
    $("merchantArea").innerHTML = `<div class="small muted">商人 / 貿易系統尚未接入救活版 main.js。</div>`;
  }
  if ($("workers")) {
    $("workers").innerHTML = `<div class="small muted">工人系統尚未接入救活版 main.js。</div>`;
  }
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

function renderAll() {
  safeRender(renderTopStats);
  safeRender(renderResources);
  safeRender(renderWorkButtons);
  safeRender(renderCraftList);
  safeRender(renderResearchArea);
  safeRender(renderActionLane);
  safeRender(renderResearchLane);
  safeRender(renderCraftLaneFallback);
  safeRender(renderPlaceholders);
  safeRender(renderLog);
}

function loop(now) {
  const deltaSeconds = Math.min(0.2, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  workSystem.updateAction(deltaSeconds);
  researchSystem.updateResearch(deltaSeconds);

  safeRender(renderActionLane);
  safeRender(renderResearchLane);

  requestAnimationFrame(loop);
}

function initFallbackButtons() {
  $("claimTaxBtn")?.addEventListener("click", () => {
    addLog("稅收系統尚未接入救活版 main.js。", "important");
  });

  $("seedSelectBtn")?.addEventListener("click", () => {
    addLog("農田系統尚未接入救活版 main.js。", "important");
  });

  $("plantBtn")?.addEventListener("click", () => {
    addLog("農田系統尚未接入救活版 main.js。", "important");
  });

  $("recruitBtn")?.addEventListener("click", () => {
    addLog("工人系統尚未接入救活版 main.js。", "important");
  });

  $("payDebtBtn")?.addEventListener("click", () => {
    addLog("支付欠薪功能尚未接入救活版 main.js。", "important");
  });
}

function init() {
  loadGame({ silent: true });

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
    },
    onSetMainPage: (pageName) => {
      setMainPage(pageName);
    }
  });

  bindStaticDataButtons(document);
  initFallbackButtons();
  setMainPage(state.ui.mainPage || "production");
  renderAll();
  requestAnimationFrame(loop);
}

init();
