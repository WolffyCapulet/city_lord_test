const STORAGE_KEY = "city_lord_rewrite_save_v3";

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

const workDefs = {
  labor: {
    name: "村莊打工",
    staminaCost: 2,
    expGain: 1,
    run() {
      const gold = randInt(1, 3);
      return {
        gold,
        resources: {},
        log: `你打工獲得 ${gold} 金，經驗 +1`
      };
    }
  },
  lumber: {
    name: "伐木",
    staminaCost: 3,
    expGain: 1,
    run() {
      const wood = randInt(2, 5);
      return {
        gold: 0,
        resources: { wood },
        log: `你伐木獲得 木頭 +${wood}，經驗 +1`
      };
    }
  },
  mining: {
    name: "採石",
    staminaCost: 4,
    expGain: 1,
    run() {
      const stone = randInt(2, 5);
      const copperOre = roll(0.35) ? 1 : 0;
      const resources = { stone };
      if (copperOre > 0) resources.copperOre = copperOre;
      const parts = [`石頭 +${stone}`];
      if (copperOre > 0) parts.push(`銅礦 +${copperOre}`);
      return {
        gold: 0,
        resources,
        log: `你採石獲得 ${parts.join("、")}，經驗 +1`
      };
    }
  },
  fishing: {
    name: "釣魚",
    staminaCost: 2,
    expGain: 1,
    run() {
      const fish = randInt(1, 3);
      return {
        gold: 0,
        resources: { fish },
        log: `你釣魚獲得 魚 +${fish}，經驗 +1`
      };
    }
  },
  forage: {
    name: "野外採集",
    staminaCost: 2,
    expGain: 1,
    run() {
      const berry = randInt(1, 4);
      const herb = roll(0.35) ? 1 : 0;
      const resources = { berry };
      if (herb > 0) resources.herb = herb;
      const parts = [`莓果 +${berry}`];
      if (herb > 0) parts.push(`草藥 +${herb}`);
      return {
        gold: 0,
        resources,
        log: `你野外採集獲得 ${parts.join("、")}，經驗 +1`
      };
    }
  }
};

const craftDefs = {
  plank: {
    name: "木板",
    staminaCost: 1,
    expGain: 1,
    costs: { wood: 2 },
    yields: { plank: 1 },
    desc: "2 木頭 → 1 木板"
  },
  firewood: {
    name: "柴火",
    staminaCost: 1,
    expGain: 1,
    costs: { wood: 1 },
    yields: { firewood: 2 },
    desc: "1 木頭 → 2 柴火"
  },
  cookedFish: {
    name: "烤魚",
    staminaCost: 1,
    expGain: 1,
    costs: { fish: 1, firewood: 1 },
    yields: { cookedFish: 1 },
    desc: "1 魚 + 1 柴火 → 1 烤魚"
  }
};

const state = {
  gold: 0,
  level: 1,
  exp: 0,
  stamina: 100,
  resources: {
    wood: 0,
    stone: 0,
    berry: 0,
    herb: 0,
    fish: 0,
    copperOre: 0,
    plank: 0,
    firewood: 0,
    cookedFish: 0
  },
  logs: []
};

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

function performWork(workId) {
  const def = workDefs[workId];
  if (!def) return;

  if (state.stamina < def.staminaCost) {
    addLog(`${def.name}失敗，體力不足`);
    return;
  }

  state.stamina -= def.staminaCost;
  const result = def.run();

  state.gold += result.gold || 0;
  for (const [resourceId, amount] of Object.entries(result.resources || {})) {
    gainResource(resourceId, amount);
  }

  addMainExp(def.expGain || 0);
  addLog(result.log);
}

function craftItem(craftId) {
  const def = craftDefs[craftId];
  if (!def) return;

  if (state.stamina < def.staminaCost) {
    addLog(`${def.name}製作失敗，體力不足`);
    return;
  }

  if (!canAfford(def.costs)) {
    addLog(`${def.name}製作失敗，材料不足`);
    return;
  }

  spendCosts(def.costs);
  state.stamina -= def.staminaCost;

  for (const [resourceId, amount] of Object.entries(def.yields)) {
    gainResource(resourceId, amount);
  }

  addMainExp(def.expGain || 0);

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

  const defaultResources = {
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

  state.resources = {
    ...defaultResources,
    ...(data.resources || {})
  };

  addLog("已讀檔");
}

function resetGame() {
  if (!confirm("確定要重置這個 rewrite 存檔嗎？")) return;
  localStorage.removeItem(STORAGE_KEY);
  state.gold = 0;
  state.level = 1;
  state.exp = 0;
  state.stamina = 100;
  state.resources = {
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
  state.logs = [];
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
      <button data-work="${id}">${def.name}（-${def.staminaCost} 體力）</button>
    `)
    .join("");

  root.querySelectorAll("[data-work]").forEach(btn => {
    btn.addEventListener("click", () => performWork(btn.dataset.work));
  });
}

function renderCraftList() {
  const root = document.getElementById("craftList");
  root.innerHTML = Object.entries(craftDefs)
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
          <div class="small muted">${def.desc}</div>
          <div class="row" style="margin-top:8px;">
            <span class="pill">消耗體力：${def.staminaCost}</span>
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
  renderLog();
}

document.getElementById("restBtn").addEventListener("click", rest);
document.getElementById("eatBestBtn").addEventListener("click", eatBestFood);
document.getElementById("saveBtn").addEventListener("click", saveGame);
document.getElementById("loadBtn").addEventListener("click", loadGame);
document.getElementById("resetBtn").addEventListener("click", resetGame);

renderWorkButtons();
renderCraftList();
render();
