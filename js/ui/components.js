export function renderTopStats({
  state,
  getExpToNext,
  getMaxStamina,
  getBestFoodId,
  getResourceLabel,
  edibleValues
}) {
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const setWidth = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.style.width = value;
  };

  const expNext = getExpToNext(state.level);
  const maxStamina = getMaxStamina(state);

  setText("gold", Math.floor(state.gold || 0));
  setText("level", state.level || 1);
  setText("exp", Math.floor(state.exp || 0));
  setText("expNext", expNext);
  setText("intelligence", state.intelligence || 0);
  setText("stamina", Math.floor(state.stamina || 0));
  setText("maxStamina", maxStamina);

  setText("managementLevel", state.managementLevel || 1);
  setText("managementExp", Math.floor(state.managementExp || 0));
  setText("managementExpNext", getExpToNext(state.managementLevel || 1));

  setText("tradeLevel", state.tradeLevel || 1);
  setText("reputationValue", (state.reputation || 0).toFixed(1));
  setText("taxIncome", Math.floor(state.pendingTax || 0));
  setText("castleLevel", state.castleLevel || 1);

  setText("housingUsed", Array.isArray(state.workers) ? state.workers.length : 0);
  setText("housingCap", state.housingCap || 0);
  setText("safetyValue", state.safetyValue || 0);

  setWidth("expBar", `${Math.min(100, Math.max(0, ((state.exp || 0) / expNext) * 100))}%`);
  setWidth("staminaBar", `${Math.min(100, Math.max(0, ((state.stamina || 0) / maxStamina) * 100))}%`);
  setWidth(
    "managementBar",
    `${Math.min(100, Math.max(0, ((state.managementExp || 0) / getExpToNext(state.managementLevel || 1)) * 100))}%`
  );

  const eatHint = document.getElementById("eatHint");
  if (eatHint) {
    const bestFood = getBestFoodId();
    eatHint.textContent = bestFood
      ? `目前最佳食物：${getResourceLabel(bestFood)}（${edibleValues[bestFood] >= 0 ? "+" : ""}${edibleValues[bestFood]}）`
      : "目前沒有可吃的食物";
  }
}

export function renderResources({
  state,
  getResourceLabel,
  edibleValues
}) {
  const root = document.getElementById("resources");
  if (!root) return;

  const totalKinds = Object.keys(state.resources || {}).length;
  const totalAmount = Object.values(state.resources || {}).reduce((sum, n) => sum + Number(n || 0), 0);

  root.innerHTML = `
    <div class="small muted" style="margin-bottom:8px;">
      物資種類：${totalKinds}｜總數量：${Math.floor(totalAmount)}
    </div>
    <div class="resource-list">
      ${Object.entries(state.resources || {})
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

export function renderWorkButtons({
  workDefs,
  getWorkCost,
  getWorkDuration,
  formatSeconds,
  onWorkClick
}) {
  const root = document.getElementById("workButtons");
  if (!root) return;

  root.innerHTML = Object.entries(workDefs)
    .map(([id, def]) => {
      const cost = getWorkCost(def);
      const duration = getWorkDuration(def);
      return `<button data-work="${id}" type="button">${def.name}（-${cost} 體力 / ${formatSeconds(duration)}）</button>`;
    })
    .join("");

  root.querySelectorAll("[data-work]").forEach((btn) => {
    btn.addEventListener("click", () => onWorkClick(btn.dataset.work));
  });
}

export function renderCraftList({
  crafts,
  getResourceLabel,
  isCraftHidden,
  isCraftUnlocked,
  onCraftClick
}) {
  const root = document.getElementById("craftList");
  if (!root) return;

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

  root.querySelectorAll("[data-craft]").forEach((btn) => {
    btn.addEventListener("click", () => onCraftClick(btn.dataset.craft));
  });
}

export function renderResearchArea({
  state,
  books,
  researchDefs,
  formatSeconds,
  getMissingRequirementText,
  isResearchCompleted,
  meetsResearchRequirements,
  onStartResearch,
  onReadBook
}) {
  const root = document.getElementById("researchArea");
  if (!root) return;

  const categories = [...new Set(Object.values(researchDefs).map((def) => def.category || "other"))];

  const bookCards = Object.entries(books)
    .map(([id, book]) => {
      const own = Math.floor(state.resources?.[id] || 0);
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

  const blocks = categories
    .map((category) => {
      const cards = Object.entries(researchDefs)
        .filter(([, def]) => (def.category || "other") === category)
        .map(([id, def]) => {
          const done = isResearchCompleted(id);
          const available = meetsResearchRequirements(def);

          return `
            <div class="research-card">
              <div class="research-summary">
                <strong>${def.name}</strong>
                <div class="research-status ${done ? "done" : ""}">
                  ${done ? "已完成" : available ? "可研究" : getMissingRequirementText(def)}
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
    ${blocks}
  `;

  root.querySelectorAll("[data-start-research]").forEach((btn) => {
    btn.addEventListener("click", () => onStartResearch(btn.dataset.startResearch));
  });

  root.querySelectorAll("[data-read-book]").forEach((btn) => {
    btn.addEventListener("click", () => onReadBook(btn.dataset.readBook));
  });
}

export function renderActionLane({
  state,
  workDefs,
  getWorkCost,
  formatSeconds
}) {
  const textEl = document.getElementById("productionText") || document.getElementById("actionStatus");
  const barEl = document.getElementById("productionBar") || document.getElementById("actionProgressBar");
  const queueEl = document.getElementById("productionQueue") || document.getElementById("actionQueue");
  const cancelBtn = document.getElementById("cancelActionBtn");
  const clearBtn = document.getElementById("clearActionQueueBtn");

  if (!textEl || !barEl || !queueEl) return;

  if (state.currentAction && workDefs[state.currentAction.id]) {
    const def = workDefs[state.currentAction.id];
    const progress = Math.min(
      100,
      Math.max(
        0,
        ((state.currentAction.total - state.currentAction.remaining) / state.currentAction.total) * 100
      )
    );

    textEl.textContent = `進行中：${def.name}｜剩餘 ${formatSeconds(state.currentAction.remaining)}`;
    barEl.style.width = `${progress}%`;
  } else if (state.actionQueue?.length > 0) {
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

  queueEl.innerHTML = state.actionQueue?.length
    ? state.actionQueue
        .map((id, index) => `<span class="queue-pill">${index + 1}. ${workDefs[id]?.name || id}</span>`)
        .join("")
    : `<span class="small muted">行動列為空</span>`;

  if (cancelBtn) cancelBtn.disabled = !state.currentAction;
  if (clearBtn) clearBtn.disabled = !state.actionQueue?.length;
}

export function renderResearchLane({
  state,
  formatSeconds
}) {
  const textEl = document.getElementById("researchText");
  const barEl = document.getElementById("researchBar");
  const queueEl = document.getElementById("researchQueue");

  if (!textEl || !barEl || !queueEl) return;

  if (state.currentResearch) {
    const progress = Math.min(
      100,
      Math.max(
        0,
        ((state.currentResearch.total - state.currentResearch.remaining) / state.currentResearch.total) * 100
      )
    );

    textEl.textContent = `研究中：${state.currentResearch.name}｜剩餘 ${formatSeconds(state.currentResearch.remaining)}`;
    barEl.style.width = `${progress}%`;
  } else if (state.researchQueue?.length > 0) {
    textEl.textContent = `等待中：下一項 ${state.researchQueue[0].name}`;
    barEl.style.width = "0%";
  } else {
    textEl.textContent = "目前沒有進行中的研究";
    barEl.style.width = "0%";
  }

  queueEl.innerHTML = state.researchQueue?.length
    ? state.researchQueue
        .map((item, index) => `<span class="queue-pill">${index + 1}. ${item.name}</span>`)
        .join("")
    : `<span class="small muted">研究列為空</span>`;
}

export function renderLog({ state }) {
  const root = document.getElementById("log");
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

  document.getElementById("logAllBtn")?.classList.toggle("active", state.logFilter === "all");
  document.getElementById("logImportantBtn")?.classList.toggle("active", state.logFilter === "important");
  document.getElementById("logLootBtn")?.classList.toggle("active", state.logFilter === "loot");
  document.getElementById("logWorkerBtn")?.classList.toggle("active", state.logFilter === "worker");
}
