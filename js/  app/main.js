import { workDefs, workerJobs, workLootInfo } from "../data/works.js";
import { crafts } from "../data/crafts.js";
import { resources } from "../data/resources.js";

const STORAGE_KEY = "city_lord_rewrite_save_v4";
const WORK_QUEUE_LIMIT = 3;

const resourceLabels = {
  wood: "木頭",
  stone: "石頭",
  berry: "莓果",
  herb: "草藥",
  fish: "魚",
  copperOre: "銅礦",
  plank: "木板",
  firewood: "柴火",
  cookedFish: "烤魚"
};

const edibleDefs = {
  berry: { name: "莓果", stamina: 3 },
  cookedFish: { name: "烤魚", stamina: 12 }
};


function createDefaultResources() {
  return {
    wood: 0,
    stone: 0,
    berry: 0,
    herb: 0,
    fish: 0,
    copperOre: 0,
    plank: 0,
    firewood: 0,
    cookedFish: 0
  };
}

const state = {
  gold: 0,
  level: 1,
  exp: 0,
  stamina: 100,
  resources: createDefaultResources(),
  logs: [],
  currentAction: null,
  actionQueue: []
};

let lastFrameTime = performance.now();

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roll(chance) {
  return Math.random() < chance;
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

function addLog(text) {
  state.logs.unshift(text);
  state.logs = state.logs.slice(0, 50);
  render();
}

function gainResource(id, amount) {
  state.resources[id] = (state.resources[id] || 0) + amount;
}

function spendResource(id, amount) {
  if ((state.resources[id] || 0) < amount) return false;
  state.resources[id] -= amount;
  return true;
}

function canAfford(costs) {
  return Object.entries(costs).every(([id, amount]) => (state.resources[id] || 0) >= amount);
}

function spendCosts(costs) {
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
    state.logs.unshift(`主等級提升到 Lv.${state.level}，體力已回滿`);
    state.logs = state.logs.slice(0, 50);
  }
}

function enqueueWork(workId) {
  const def = workDefs[workId];
  if (!def) return;
  if (state.actionQueue.length >= WORK_QUEUE_LIMIT) {
    addLog(`行動列已滿，最多只能排 ${WORK_QUEUE_LIMIT} 個工作`);
    return;
  }
  state.actionQueue.push(workId);
  addLog(`已排入行動列：${def.name}`);
}

function startWorkAction(workId, { silent = false } = {}) {
  const def = workDefs[workId];
  if (!def) return false;
  if (state.currentAction) return false;

  if (state.stamina < def.stamina ?? 1) {
    if (!silent) addLog(`${def.name}無法開始，體力不足`);
    return false;
  }

  state.stamina -= (def.stamina ?? 1);
  state.currentAction = {
    type: "work",
    id: workId,
    remaining: def.duration,
    total: def.duration
  };

  if (!silent) addLog(`開始${def.name}，預計 ${formatSeconds(def.duration)}`);
  return true;
}

function requestWork(workId) {
  if (state.currentAction) {
    enqueueWork(workId);
    return;
  }
  startWorkAction(workId);
}

function tryStartNextQueuedAction() {
  if (state.currentAction || state.actionQueue.length === 0) return false;
  const nextId = state.actionQueue[0];
  const nextDef = workDefs[nextId];
  if (!nextDef) {
    state.actionQueue.shift();
    return false;
  }
  if (state.stamina < nextDef.staminaCost) return false;
  state.actionQueue.shift();
  return startWorkAction(nextId);
}

function completeCurrentAction() {
  const action = state.currentAction;
  if (!action) return;

  state.currentAction = null;

  if (action.type !== "work") return;
  const def = workDefs[action.id];
  if (!def) return;

  const result = def.run();
  state.gold += result.gold || 0;
  for (const [resourceId, amount] of Object.entries(result.resources || {})) {
    gainResource(resourceId, amount);
  }
  addMainExp(1);
  addLog(result.log);
  tryStartNextQueuedAction();
}

function cancelCurrentAction() {
  if (!state.currentAction) {
    addLog("目前沒有進行中的工作");
    return;
  }
  const def = workDefs[state.currentAction.id];
  state.currentAction = null;
  addLog(`已取消目前工作：${def ? def.name : "未知工作"}`);
}

function clearActionQueue() {
  if (!state.actionQueue.length) {
    addLog("目前沒有等待中的行動列");
    return;
  }
  state.actionQueue = [];
  addLog("已清空行動列");
}

function updateAction(deltaSeconds) {
  if (!state.currentAction) {
    tryStartNextQueuedAction();
    return;
  }

  state.currentAction.remaining -= deltaSeconds;
  if (state.currentAction.remaining <= 0) {
    completeCurrentAction();
  }
}

function craftItem(craftId) {
  const def = crafts[craftId];
  if (!def) return;

  if (state.stamina < (def.stamina ?? 1)) {
    addLog(`${def.name}製作失敗，體力不足`);
    return;
  }

  if (!canAfford(def.costs)) {
    addLog(`${def.name}製作失敗，材料不足`);
    return;
  }

  spendCosts(def.costs);
  state.stamina -= (def.stamina ?? 1);

  for (const [resourceId, amount] of Object.entries(def.yields)) {
    gainResource(resourceId, amount);
  }

  addMainExp(1);

  const gainText = Object.entries(def.yields)
    .map(([id, amount]) => `${resourceLabels[id]} +${amount}`)
    .join("、");

  addLog(`你製作了 ${def.name}，獲得 ${gainText}，經驗 +${def.expGain || 0}`);
}

function rest() {
  const before = state.stamina;
  state.stamina = Math.min(maxStamina(), state.stamina + 5);
  const actual = state.stamina - before;

  if (actual <= 0) {
    addLog("體力已滿，不需要休息");
    return;
  }

  addLog(`你休息恢復 ${actual} 體力`);
}

function getBestFoodId() {
  const choices = Object.entries(edibleDefs)
    .filter(([id]) => (state.resources[id] || 0) > 0)
    .sort((a, b) => b[1].stamina - a[1].stamina);

  return choices[0]?.[0] || "";
}

function eatResource(resourceId) {
  const def = edibleDefs[resourceId];
  if (!def) return;

  if ((state.resources[resourceId] || 0) <= 0) {
    addLog(`沒有${def.name}可以吃`);
    return;
  }

  if (state.stamina >= maxStamina()) {
    addLog("體力已滿，不需要吃食物");
    return;
  }

  spendResource(resourceId, 1);
  const before = state.stamina;
  state.stamina = Math.min(maxStamina(), state.stamina + def.stamina);
  const actual = state.stamina - before;
  addLog(`你吃了 1 ${def.name}，恢復 ${actual} 體力`);
}

function eatBestFood() {
  const best = getBestFoodId();
  if (!best) {
    addLog("目前沒有可吃的食物");
    return;
  }
  eatResource(best);
}

function saveGame() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  addLog("已存檔");
}

function loadGame() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    addLog("沒有存檔");
    return;
  }

  const data = JSON.parse(raw);
  state.gold = data.gold ?? 0;
  state.level = data.level ?? 1;
  state.exp = data.exp ?? 0;
  state.stamina = data.stamina ?? 100;
  state.logs = Array.isArray(data.logs) ? data.logs : [];
  state.resources = {
    ...createDefaultResources(),
    ...(data.resources || {})
  };
  state.currentAction = data.currentAction && workDefs[data.currentAction.id]
    ? {
        type: "work",
        id: data.currentAction.id,
        remaining: Math.max(0, Number(data.currentAction.remaining) || 0),
        total: Math.max(0.1, Number(data.currentAction.total) || workDefs[data.currentAction.id].duration)
      }
    : null;
  state.actionQueue = Array.isArray(data.actionQueue)
    ? data.actionQueue.filter(id => !!workDefs[id]).slice(0, WORK_QUEUE_LIMIT)
    : [];

  addLog("已讀檔");
}

function resetGame() {
  if (!confirm("確定要重置這個 rewrite 存檔嗎？")) return;
  localStorage.removeItem(STORAGE_KEY);
  state.gold = 0;
  state.level = 1;
  state.exp = 0;
  state.stamina = 100;
  state.resources = createDefaultResources();
  state.logs = [];
  state.currentAction = null;
  state.actionQueue = [];
  addLog("已重置 rewrite 存檔");
}

function renderTopStats() {
  document.getElementById("gold").textContent = state.gold;
  document.getElementById("level").textContent = state.level;
  document.getElementById("exp").textContent = state.exp;
  document.getElementById("expNext").textContent = expToNext(state.level);
  document.getElementById("stamina").textContent = state.stamina;
  document.getElementById("maxStamina").textContent = maxStamina();

  const expRate = Math.max(0, Math.min(100, (state.exp / expToNext(state.level)) * 100));
  const staminaRate = Math.max(0, Math.min(100, (state.stamina / maxStamina()) * 100));
  document.getElementById("expBar").style.width = `${expRate}%`;
  document.getElementById("staminaBar").style.width = `${staminaRate}%`;

  const bestFood = getBestFoodId();
  const eatHint = document.getElementById("eatHint");
  if (bestFood) {
    eatHint.textContent = `目前最佳食物：${edibleDefs[bestFood].name}（恢復 ${edibleDefs[bestFood].stamina} 體力）`;
  } else {
    eatHint.textContent = "目前沒有可吃的食物";
  }
}

function renderResources() {
  const root = document.getElementById("resources");
  root.innerHTML = Object.entries(state.resources)
    .map(([id, value]) => {
      const edible = edibleDefs[id] ? `<div class="small muted">可食用：+${edibleDefs[id].stamina} 體力</div>` : "";
      return `
        <div class="resource-item">
          <div class="resource-name">${resourceLabels[id]}</div>
          <div class="resource-value">${value}</div>
          ${edible}
        </div>
      `;
    })
    .join("");
}

function renderWorkButtons() {
  const root = document.getElementById("workButtons");
  root.innerHTML = Object.entries(workDefs)
    .map(([id, def]) => `
      <button data-work="${id}">${def.name}（-${def.staminaCost} 體力 / ${formatSeconds(def.duration)}）</button>
    `)
    .join("");

  root.querySelectorAll("[data-work]").forEach(btn => {
    btn.addEventListener("click", () => requestWork(btn.dataset.work));
  });
}

function renderCraftList() {
  const root = document.getElementById("craftList");
  root.innerHTML = Object.entries(crafts)
    .map(([id, def]) => {
      const costText = Object.entries(def.costs)
        .map(([resId, amount]) => `${resourceLabels[resId]} ${amount}`)
        .join("、");
      const yieldText = Object.entries(def.yields)
        .map(([resId, amount]) => `${resourceLabels[resId]} ${amount}`)
        .join("、");
      return `
        <div class="recipe-card">
          <div class="top">
            <strong>${def.name}</strong>
            <button data-craft="${id}">製作</button>
          </div>
          <div class="small muted">${def.skill || "craft"}</div>
          <div class="row" style="margin-top:8px;">
            <span class="pill">消耗體力：${def.stamina ?? 1}</span>
            <span class="pill">材料：${costText}</span>
            <span class="pill">產出：${yieldText}</span>
          </div>
        </div>
      `;
    })
    .join("");

  root.querySelectorAll("[data-craft]").forEach(btn => {
    btn.addEventListener("click", () => craftItem(btn.dataset.craft));
  });
}

function renderActionLane() {
  const textEl = document.getElementById("actionStatus");
  const barEl = document.getElementById("actionProgressBar");
  const queueEl = document.getElementById("actionQueue");
  const cancelBtn = document.getElementById("cancelActionBtn");
  const clearBtn = document.getElementById("clearActionQueueBtn");

  if (state.currentAction && workDefs[state.currentAction.id]) {
    const def = workDefs[state.currentAction.id];
    const progress = Math.max(0, Math.min(100, ((state.currentAction.total - state.currentAction.remaining) / state.currentAction.total) * 100));
    textEl.textContent = `進行中：${def.name}｜剩餘 ${formatSeconds(state.currentAction.remaining)}`;
    barEl.style.width = `${progress}%`;
  } else if (state.actionQueue.length > 0) {
    const nextDef = workDefs[state.actionQueue[0]];
    if (nextDef && state.stamina < nextDef.staminaCost) {
      textEl.textContent = `等待中：${nextDef.name}｜體力不足，需要 ${nextDef.staminaCost} 體力`;
    } else {
      textEl.textContent = `等待中：下一項 ${nextDef ? nextDef.name : "未知工作"}`;
    }
    barEl.style.width = `0%`;
  } else {
    textEl.textContent = "目前沒有進行中的工作";
    barEl.style.width = `0%`;
  }

  queueEl.innerHTML = state.actionQueue.length
    ? state.actionQueue.map((id, index) => `<span class="queue-pill">${index + 1}. ${workDefs[id]?.name || id}</span>`).join("")
    : `<span class="small muted">行動列為空</span>`;

  cancelBtn.disabled = !state.currentAction;
  clearBtn.disabled = state.actionQueue.length === 0;
}

function renderLog() {
  const root = document.getElementById("log");
  if (state.logs.length === 0) {
    root.innerHTML = `<div class="log-item">目前還沒有事件紀錄</div>`;
    return;
  }
  root.innerHTML = state.logs
    .map(text => `<div class="log-item">${text}</div>`)
    .join("");
}

function render() {
  renderTopStats();
  renderResources();
  renderActionLane();
  renderLog();
}

function loop(now) {
  const deltaSeconds = Math.min(0.2, (now - lastFrameTime) / 1000);
  lastFrameTime = now;
  updateAction(deltaSeconds);
  renderActionLane();
  requestAnimationFrame(loop);
}

document.getElementById("restBtn").addEventListener("click", rest);
document.getElementById("eatBestBtn").addEventListener("click", eatBestFood);
document.getElementById("saveBtn").addEventListener("click", saveGame);
document.getElementById("loadBtn").addEventListener("click", loadGame);
document.getElementById("resetBtn").addEventListener("click", resetGame);
document.getElementById("cancelActionBtn").addEventListener("click", cancelCurrentAction);
document.getElementById("clearActionQueueBtn").addEventListener("click", clearActionQueue);

renderWorkButtons();
renderCraftList();
render();
requestAnimationFrame(loop);
