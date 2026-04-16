import { resourceLabels, edibleValues } from "../data/resources.js";
import { workDefs } from "../data/works.js";
import { crafts } from "../data/crafts.js";
import { books, researchDefs } from "../data/research.js";
import { createWorkSystem, getWorkCost, getWorkDuration } from "../systems/work.js";
import { createResearchSystem } from "../systems/research.js";

const STORAGE_KEY = "city_lord_minimal_save_v1";
const LOG_LIMIT = 120;
const WORK_QUEUE_LIMIT = 3;

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

function formatSeconds(seconds) {
  return `${Math.max(0, seconds).toFixed(1)} 秒`;
}

function getResourceLabel(id) {
  return resourceLabels[id] || id;
}

function expToNext(level) {
  return Math.round(5 + 2.5 * level * (level - 1));
}

function maxStamina() {
  return 100;
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
    managementLevel: 1,
    managementExp: 0,
    tradeLevel: 1,
    reputation: 0,
    pendingTax: 0,
    castleLevel: 1,

    resources: createDefaultResources(),
    logs: [],

    currentAction: null,
    actionQueue: [],

    research: {},
    currentResearch: null,
    researchQueue: [],

    housing: {},
    buildings: {},

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
  s.stamina = Number(s.stamina || 100);
  s.managementLevel = Math.max(1, Number(s.managementLevel || 1));
  s.managementExp = Number(s.managementExp || 0);
  s.tradeLevel = Math.max(1, Number(s.tradeLevel || 1));
  s.reputation = Number(s.reputation || 0);
  s.pendingTax = Number(s.pendingTax || 0);
  s.castleLevel = Math.max(1, Number(s.castleLevel || 1));

  s.resources = {
    ...createDefaultResources(),
    ...(s.resources || {})
  };

  s.logs = normalizeLogs(s.logs);

  if (!s.currentAction || typeof s.currentAction !== "object") s.currentAction = null;
  if (!Array.isArray(s.actionQueue)) s.actionQueue = [];

  if (!s.research || typeof s.research !== "object") s.research = {};
  if (!s.currentResearch || typeof s.currentResearch !== "object") s.currentResearch = null;
  if (!Array.isArray(s.researchQueue)) s.researchQueue = [];

  if (!s.housing || typeof s.housing !== "object") s.housing = {};
  if (!s.buildings || typeof s.buildings !== "object") s.buildings = {};

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
  renderLog();
}

function addMainExp(amount) {
  state.exp += amount;
  while (state.exp >= expToNext(state.level)) {
    state.exp -= expToNext(state.level);
    state.level += 1;
    addLog(`主等級提升到 Lv.${state.level}`, "important");
  }
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

function isCraftHidden(def) {
  return !!def.hidden;
}

function isCraftUnlocked(def) {
  return !def.unlock || !!state.research[def.unlock];
}

function craftItem(craftId) {
  const def = crafts[craftId];
  if (!def) return false;

  if (isCraftHidden(def)) {
    addLog("這個配方目前不顯示", "important");
    return false;
  }

  if (!isCraftUnlocked(def)) {
    addLog(`尚未解鎖配方：${def.name}`, "important");
    return false;
  }

  const staminaCost = Math.max(1, Number(def.stamina ?? 1));

  if (state.stamina < staminaCost) {
    addLog(`${def.name}無法製作，體力不足`, "important");
    return false;
  }

  if (!spendCosts(def.costs || {})) {
    addLog(`${def.name}材料不足`, "important");
    return false;
  }

  state.stamina -= staminaCost;

  Object.entries(def.yields || {}).forEach(([id, amount]) => {
    gainResource(id, amount);
  });

  addMainExp(1);

  const gainText = Object.entries(def.yields || {})
    .map(([id, amount]) => `${getResourceLabel(id)} +${amount}`)
    .join("、");

  addLog(`製作完成：${def.name}${gainText ? `，獲得 ${gainText}` : ""}`, "loot");
  return true;
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

    const data = ensureStateShape(JSON.parse(raw));
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, data);

    if (!silent) addLog("已讀檔", "important");
    renderAll();
    return true;
  } catch (error) {
    console.error(error);
    if (!silent) addLog("讀檔失敗", "important");
    return false;
  }
}

function resetGame() {
  localStorage.removeItem(STORAGE_KEY);
  const fresh = ensureStateShape(createState());
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, fresh);
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

function getBestFoodId() {
  const order = [
    "bearStew",
    "clamSoup",
    "grilledSausage",
    "applePie",
    "bread",
    "grilledMeat",
    "grilledFish",
    "rawChicken",
    "rawMeat",
    "fish"
  ];

  for (const id of order) {
    if ((state.resources[id] || 0) > 0 && typeof edibleValues[id] === "number") {
      return id;
    }
  }

  return "";
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
  renderTopStats();
}

function eatResource(resourceId) {
  const value = edibleValues[resourceId];
  const label = getResourceLabel(resourceId);

  if (typeof value !== "number") return;
  if ((state.resources[resourceId] || 0) <= 0) {
    addLog(`沒有${label}可以食用`, "important");
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

  addLog(`你食用了 ${label}，體力變化 ${actual >= 0 ? "+" : ""}${actual}`, "important");
  renderTopStats();
}

function eatBestFood() {
  const best = getBestFoodId();
  if (!best) {
    addLog("目前沒有可吃的食物", "important");
    return;
  }
  eatResource(best);
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
      craftItem(btn.dataset.craft);
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
  $("gold") && ($("gold").textContent = Math.floor(state.gold));
  $("level") && ($("level").textContent = state.level);
  $("exp") && ($("exp").textContent = Math.floor(state.exp));
  $("expNext") && ($("expNext").textContent = expToNext(state.level));

  $("intelligence") && ($("intelligence").textContent = state.intelligence);
  $("stamina") && ($("stamina").textContent = Math.floor(state.stamina));
  $("maxStamina") && ($("maxStamina").textContent = maxStamina());

  $("managementLevel") && ($("managementLevel").textContent = state.managementLevel);
  $("managementExp") && ($("managementExp").textContent = Math.floor(state.managementExp));
  $("managementExpNext") && ($("managementExpNext").textContent = expToNext(state.managementLevel));

  $("tradeLevel") && ($("tradeLevel").textContent = state.tradeLevel);
  $("reputationValue") && ($("reputationValue").textContent = state.reputation.toFixed(1));
  $("taxIncome") && ($("taxIncome").textContent = Math.floor(state.pendingTax));
  $("castleLevel") && ($("castleLevel").textContent = state.castleLevel);

  $("housingCap") && ($("housingCap").textContent = 0);
  $("housingUsed") && ($("housingUsed").textContent = 0);
  $("safetyValue") && ($("safetyValue").textContent = 0);

  $("expBar") &&
    ($("expBar").style.width = `${clamp((state.exp / expToNext(state.level)) * 100, 0, 100)}%`);
  $("staminaBar") &&
    ($("staminaBar").style.width = `${clamp((state.stamina / maxStamina()) * 100, 0, 100)}%`);
  $("managementBar") &&
    ($("managementBar").style.width = `${clamp((state.managementExp / expToNext(state.managementLevel)) * 100, 0, 100)}%`);

  const bestFood = getBestFoodId();
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

      return `
        <div class="recipe-card">
          <div class="top">
            <strong>${def.name}</strong>
            <button data-craft="${id}" type="button" ${unlocked ? "" : "disabled"}>製作</button>
          </div>
          <div class="small muted">材料：${costText || "無"}</div>
          <div class="small muted">產出：${yieldText || "無"}</div>
          <div class="row" style="margin-top:8px;">
            <span class="pill">消耗體力：${def.stamina ?? 1}</span>
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
          const done = !!state.research[id];
          const available =
            (!def.levelReq || state.level >= def.levelReq) &&
            (!def.intReq || state.intelligence >= def.intReq);

          const missingText = !done && !available
            ? `尚缺：${def.levelReq && state.level < def.levelReq ? `主等級 ${state.level}/${def.levelReq}` : ""}${def.intReq && state.intelligence < def.intReq ? `${def.levelReq && state.level < def.levelReq ? "、" : ""}智力 ${state.intelligence}/${def.intReq}` : ""}`
            : done ? "已完成" : "可研究";

          return `
            <div class="research-card">
              <div class="research-summary">
                <strong>${def.name}</strong>
                <div class="research-status ${done ? "done" : ""}">${missingText}</div>
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
  $("buildingButtons") && ($("buildingButtons").innerHTML = `<div class="small muted">建築系統尚未接入最小可運行版。</div>`);
  $("plots") && ($("plots").innerHTML = `<div class="small muted">農田系統尚未接入最小可運行版。</div>`);
  $("pastureArea") && ($("pastureArea").innerHTML = `<div class="small muted">牧場系統尚未接入最小可運行版。</div>`);
  $("merchantArea") && ($("merchantArea").innerHTML = `<div class="small muted">商人 / 貿易系統尚未接入最小可運行版。</div>`);
  $("workers") && ($("workers").innerHTML = `<div class="small muted">工人系統尚未接入最小可運行版。</div>`);
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

function bindBasicEvents() {
  $("restBtn")?.addEventListener("click", rest);
  $("eatBestBtn")?.addEventListener("click", eatBestFood);
  $("saveBtn")?.addEventListener("click", saveGame);
  $("loadBtn")?.addEventListener("click", () => loadGame());
  $("cancelActionBtn")?.addEventListener("click", () => workSystem.cancelCurrentAction());
  $("clearActionQueueBtn")?.addEventListener("click", () => workSystem.clearActionQueue());

  qsa("[data-main-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setMainPage(btn.dataset.mainNav);
    });
  });

  $("logAllBtn")?.addEventListener("click", () => {
    state.logFilter = "all";
    renderLog();
  });
  $("logImportantBtn")?.addEventListener("click", () => {
    state.logFilter = "important";
    renderLog();
  });
  $("logLootBtn")?.addEventListener("click", () => {
    state.logFilter = "loot";
    renderLog();
  });
  $("logWorkerBtn")?.addEventListener("click", () => {
    state.logFilter = "worker";
    renderLog();
  });

  $("resetBtn")?.addEventListener("click", () => {
    const ok = confirm("確定要重置存檔嗎？");
    if (ok) resetGame();
  });

  $("claimTaxBtn")?.addEventListener("click", () => {
    addLog("稅收系統尚未接入最小可運行版。", "important");
  });

  $("seedSelectBtn")?.addEventListener("click", () => {
    addLog("農田系統尚未接入最小可運行版。", "important");
  });

  $("plantBtn")?.addEventListener("click", () => {
    addLog("農田系統尚未接入最小可運行版。", "important");
  });

  $("recruitBtn")?.addEventListener("click", () => {
    addLog("工人系統尚未接入最小可運行版。", "important");
  });

  $("payDebtBtn")?.addEventListener("click", () => {
    addLog("支付欠薪功能尚未接入最小可運行版。", "important");
  });
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

function init() {
  loadGame({ silent: true });
  bindBasicEvents();
  bindStaticDataButtons(document);
  setMainPage(state.ui.mainPage || "production");
  renderAll();
  requestAnimationFrame(loop);
}

init();
