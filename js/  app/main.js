import { workDefs } from "../data/works.js";
import { crafts } from "../data/crafts.js";
import { resourceLabels, edibleValues, foodOrder } from "../data/resources.js";
import { bindEvents } from "./bindEvents.js";
import { createWorkSystem, getWorkCost, getWorkDuration } from "../systems/work.js";
import { createStaminaSystem, getMaxStamina } from "../systems/stamina.js";

const STORAGE_KEY = "city_lord_save_v0.0.1";
const WORK_QUEUE_LIMIT = 3;
const LOG_LIMIT = 80;

function $(id) {
  return document.getElementById(id);
}

function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function firstEl(...ids) {
  for (const id of ids) {
    const el = $(id);
    if (el) return el;
  }
  return null;
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

function expToNext(level) {
  return 5 + (level - 1) * 3;
}

function maxStamina() {
  return 100 + (state.level - 1) * 10;
}

function formatSeconds(seconds) {
  return `${Math.max(0, seconds).toFixed(1)} 秒`;
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

const state = {
  gold: 0,
  level: 1,
  exp: 0,
  stamina: 100,
  resources: createDefaultResources(),
  logs: [],
  currentAction: null,
  actionQueue: [],
  logFilter: "all",
  research: {}
};

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

function addMainExp(amount) {
  state.exp += amount;

  while (state.exp >= expToNext(state.level)) {
    state.exp -= expToNext(state.level);
    state.level += 1;
    state.stamina = maxStamina();

    state.logs.unshift({
      time: nowTime(),
      text: `主等級提升到 Lv.${state.level}，體力已回滿`,
      type: "important"
    });
    state.logs = state.logs.slice(0, LOG_LIMIT);
  }
}

const workSystem = createWorkSystem({
  state,
  addLog,
  addMainExp,
  gainResource
});

function isCraftHidden(def) {
  return !!def.hidden;
}

function isCraftUnlocked(def) {
  if (!def.unlock) return true;
  return !!state.research?.[def.unlock];
}

function craftItem(craftId) {
  const def = crafts[craftId];
  if (!def) return;

  if (isCraftHidden(def)) {
    addLog(`${def.name}目前不可見`, "important");
    return;
  }

  if (!isCraftUnlocked(def)) {
    addLog(`${def.name}尚未解鎖，需要研究：${def.unlock}`, "important");
    return;
  }

  const staminaCost = Math.max(1, Number(def.stamina ?? 1) || 1);

  if (state.stamina < staminaCost) {
    addLog(`${def.name}製作失敗，體力不足`, "important");
    return;
  }

  if (!canAfford(def.costs || {})) {
    addLog(`${def.name}製作失敗，材料不足`, "important");
    return;
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
}

function rest() {
  const before = state.stamina;
  state.stamina = Math.min(maxStamina(), state.stamina + 5);
  const actual = state.stamina - before;

  if (actual <= 0) {
    addLog("體力已滿，不需要休息", "important");
    return;
  }

  addLog(`你休息恢復 ${actual} 體力`, "important");
}

function getBestFoodId() {
  for (const id of foodOrder) {
    if ((state.resources[id] || 0) > 0 && typeof edibleValues[id] === "number") {
      return id;
    }
  }
  return "";
}

function eatResource(resourceId) {
  const value = edibleValues[resourceId];
  const label = getResourceLabel(resourceId);

  if (typeof value !== "number") return;

  if ((state.resources[resourceId] || 0) <= 0) {
    addLog(`沒有${label}可以使用`, "important");
    return;
  }

  if (state.stamina >= maxStamina() && value >= 0) {
    addLog("體力已滿，不需要吃食物", "important");
    return;
  }

  spendResource(resourceId, 1);

  const before = state.stamina;
  state.stamina = clamp(state.stamina + value, 0, maxStamina());
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

    state.gold = Number(data.gold ?? 0);
    state.level = Math.max(1, Number(data.level ?? 1) || 1);
    state.exp = Math.max(0, Number(data.exp ?? 0) || 0);
    state.stamina = clamp(Number(data.stamina ?? 100) || 100, 0, maxStamina());

    state.logs = normalizeLoadedLogs(data.logs);
    state.logFilter = typeof data.logFilter === "string" ? data.logFilter : "all";
    state.research = data.research && typeof data.research === "object" ? data.research : {};

    state.resources = {
      ...createDefaultResources(),
      ...(data.resources || {})
    };

    state.currentAction =
      data.currentAction && workDefs[data.currentAction.id]
        ? {
            type: "work",
            id: data.currentAction.id,
            remaining: Math.max(0, Number(data.currentAction.remaining) || 0),
            total: Math.max(
              0.1,
              Number(data.currentAction.total) || getWorkDuration(workDefs[data.currentAction.id])
            )
          }
        : null;

    state.actionQueue = Array.isArray(data.actionQueue)
      ? data.actionQueue.filter((id) => !!workDefs[id]).slice(0, WORK_QUEUE_LIMIT)
      : [];

    if (!silent) addLog("已讀檔", "important");
    return true;
  } catch (error) {
    console.error(error);
    if (!silent) addLog("讀檔失敗", "important");
    return false;
  }
}

function hardResetState() {
  state.gold = 0;
  state.level = 1;
  state.exp = 0;
  state.stamina = 100;
  state.resources = createDefaultResources();
  state.logs = [];
  state.currentAction = null;
  state.actionQueue = [];
  state.logFilter = "all";
  state.research = {};
}

function resetGame() {
  localStorage.removeItem(STORAGE_KEY);
  hardResetState();
  addLog("已重置存檔", "important");
}

function renderTopStats() {
  if ($("gold")) $("gold").textContent = state.gold;
  if ($("level")) $("level").textContent = state.level;
  if ($("exp")) $("exp").textContent = state.exp;
  if ($("expNext")) $("expNext").textContent = expToNext(state.level);
  if ($("stamina")) $("stamina").textContent = Math.floor(state.stamina);
  if ($("maxStamina")) $("maxStamina").textContent = maxStamina();

  const expRate = clamp((state.exp / expToNext(state.level)) * 100, 0, 100);
  const staminaRate = clamp((state.stamina / maxStamina()) * 100, 0, 100);

  if ($("expBar")) $("expBar").style.width = `${expRate}%`;
  if ($("staminaBar")) $("staminaBar").style.width = `${staminaRate}%`;

  const bestFood = getBestFoodId();
  const eatHint = $("eatHint");
  if (eatHint) {
    eatHint.textContent = bestFood
      ? `目前最佳食物：${getResourceLabel(bestFood)}（體力 ${edibleValues[bestFood] >= 0 ? "+" : ""}${edibleValues[bestFood]}）`
      : "目前沒有可吃的食物";
  }
}

function renderResources() {
  const root = $("resources");
  if (!root) return;

  root.innerHTML = Object.entries(state.resources)
    .sort((a, b) => getResourceLabel(a[0]).localeCompare(getResourceLabel(b[0]), "zh-Hant"))
    .map(([id, value]) => {
      const edible = typeof edibleValues[id] === "number"
        ? `<div class="small muted">可食用：${edibleValues[id] >= 0 ? "+" : ""}${edibleValues[id]} 體力</div>`
        : "";

      return `
        <div class="resource-item">
          <div class="resource-name">${getResourceLabel(id)}</div>
          <div class="resource-value">${value}</div>
          ${edible}
        </div>
      `;
    })
    .join("");
}

function bindDynamicWorkButtons(root = document) {
  root.querySelectorAll("[data-work]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => workSystem.requestWork(btn.dataset.work));
  });
}

function bindDynamicCraftButtons(root = document) {
  root.querySelectorAll("[data-craft]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => craftItem(btn.dataset.craft));
  });
}

function refreshStaticCraftButtons() {
  qsa("[data-craft]").forEach((btn) => {
    const craftId = btn.dataset.craft;
    const def = crafts[craftId];
    if (!def) return;

    const hidden = isCraftHidden(def);
    const unlocked = isCraftUnlocked(def);

    btn.disabled = hidden || !unlocked;
    btn.title = !unlocked && def.unlock ? `需研究：${def.unlock}` : "";
  });
}

function renderWorkButtons() {
  const root = $("workButtons");
  if (!root) {
    bindDynamicWorkButtons(document);
    return;
  }

  root.innerHTML = Object.entries(workDefs)
    .map(([id, def]) => {
      const cost = getWorkCost(def);
      const duration = getWorkDuration(def);
      return `<button data-work="${id}" type="button">${def.name}（-${cost} 體力 / ${formatSeconds(duration)}）</button>`;
    })
    .join("");

  bindDynamicWorkButtons(root);
}

function renderCraftList() {
  const root = $("craftList");

  if (!root) {
    bindDynamicCraftButtons(document);
    refreshStaticCraftButtons();
    return;
  }

  const entries = Object.entries(crafts).filter(([, def]) => !isCraftHidden(def));

  root.innerHTML = entries
    .map(([id, def]) => {
      const unlocked = isCraftUnlocked(def);

      const costText = Object.entries(def.costs || {})
        .map(([resId, amount]) => `${getResourceLabel(resId)} ${amount}`)
        .join("、");

      const yieldText = Object.entries(def.yields || {})
        .map(([resId, amount]) => `${getResourceLabel(resId)} ${amount}`)
        .join("、");

      const unlockText = def.unlock
        ? `<span class="pill ${unlocked ? "" : "bad"}">${unlocked ? "已解鎖" : `需研究：${def.unlock}`}</span>`
        : "";

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
            ${unlockText}
          </div>
        </div>
      `;
    })
    .join("");

  bindDynamicCraftButtons(root);
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
  renderTopStats();
  renderResources();
  renderActionLane();
  renderCraftList();
  renderLog();
}

function loop(now) {
  const deltaSeconds = Math.min(0.2, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  workSystem.updateAction(deltaSeconds);
  renderActionLane();

  requestAnimationFrame(loop);
}

function init() {
  loadGame({ silent: true });

  bindEvents({
    onRest: rest,
    onEatBest: eatBestFood,
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

  renderWorkButtons();
  renderCraftList();
  render();
  requestAnimationFrame(loop);
}

init();
