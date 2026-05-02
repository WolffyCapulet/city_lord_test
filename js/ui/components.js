export { renderResources } from "./render/renderResources.js";
export { renderWorkButtons } from "./render/renderWorkButtons.js";
export { renderCraftList } from "./render/renderCraftList.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setWidth(id, value) {
  const el = document.getElementById(id);
  if (el) el.style.width = value;
}

function formatInt(value) {
  return Math.floor(Number(value || 0));
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function ensureResearchUiState(state) {
  if (!state.ui) state.ui = {};
  if (!state.ui.openSections) state.ui.openSections = {};
  if (!state.ui.openSections.research) {
    state.ui.openSections.research = {
      books: true
    };
  }
}

function getResearchSectionKey(category) {
  return `category:${category || "other"}`;
}

export function renderTopStats({
  state,
  getExpToNext,
  getMaxStamina,
  getBestFoodId,
  getResourceLabel,
  edibleValues
}) {
  const level = Math.max(1, safeNumber(state.level, 1));
  const expNext = Math.max(1, safeNumber(getExpToNext(level), 1));
  const maxStamina = Math.max(1, safeNumber(getMaxStamina(state), 100));
  const stamina = Math.max(0, safeNumber(state.stamina, 0));

  setText("gold", formatInt(state.gold));
  setText("level", level);
  setText("exp", formatInt(state.exp));
  setText("expNext", expNext);
  setText("intelligence", formatInt(state.intelligence));
  setText("stamina", formatInt(stamina));
  setText("maxStamina", maxStamina);

  setText("managementLevel", Math.max(1, formatInt(state.managementLevel || 1)));
  setText("managementExp", formatInt(state.managementExp));
  setText(
    "managementExpNext",
    Math.max(1, safeNumber(getExpToNext(state.managementLevel || 1), 1))
  );

  setText("tradeLevel", Math.max(1, formatInt(state.tradeLevel || 1)));
  setText("reputationValue", safeNumber(state.reputation, 0).toFixed(1));
  setText("taxIncome", formatInt(state.pendingTax));
  setText("castleLevel", Math.max(1, formatInt(state.castleLevel || 1)));

  setText("housingUsed", Array.isArray(state.workers) ? state.workers.length : 0);
  setText("housingCap", formatInt(state.housingCap));
  setText("safetyValue", formatInt(state.safetyValue));

  const managementExpNext = Math.max(
    1,
    safeNumber(getExpToNext(state.managementLevel || 1), 1)
  );

  setWidth(
    "expBar",
    `${Math.min(100, Math.max(0, (safeNumber(state.exp, 0) / expNext) * 100))}%`
  );
  setWidth(
    "staminaBar",
    `${Math.min(100, Math.max(0, (stamina / maxStamina) * 100))}%`
  );
  setWidth(
    "managementBar",
    `${Math.min(
      100,
      Math.max(0, (safeNumber(state.managementExp, 0) / managementExpNext) * 100)
    )}%`
  );

  const eatHint = document.getElementById("eatHint");
  if (eatHint) {
    const bestFood = getBestFoodId();
    eatHint.textContent = bestFood
      ? `目前最佳食物：${getResourceLabel(bestFood)}（${
          edibleValues[bestFood] >= 0 ? "+" : ""
        }${edibleValues[bestFood]}）`
      : "目前沒有可吃的食物";
  }
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

  ensureResearchUiState(state);

  const categories = [
    ...new Set(Object.values(researchDefs).map((def) => def.category || "other"))
  ];

  if (typeof state.ui.openSections.research.books !== "boolean") {
    state.ui.openSections.research.books = true;
  }

  categories.forEach((category) => {
    const key = getResearchSectionKey(category);
    if (typeof state.ui.openSections.research[key] !== "boolean") {
      state.ui.openSections.research[key] = true;
    }
  });

  const bookCards = Object.entries(books)
    .map(([id, book]) => {
      const own = formatInt(state.resources?.[id] || 0);
      const title = [
        book.name,
        `持有：${own}`,
        `閱讀：${formatSeconds(book.duration)}`
      ].join("\n");

      return `
        <div class="book-card" title="${escapeHtml(title)}">
          <strong>${escapeHtml(book.name)}</strong>
          <div class="small muted">持有：${own}</div>
          <div class="small muted">閱讀：${escapeHtml(formatSeconds(book.duration))}</div>
          <button data-read-book="${escapeHtml(id)}" type="button" ${
        own > 0 ? "" : "disabled"
      }>閱讀</button>
        </div>
      `;
    })
    .join("");

  const blocks = categories
    .map((category) => {
      const key = getResearchSectionKey(category);
      const isOpen = !!state.ui.openSections.research[key];

      const cards = Object.entries(researchDefs)
        .filter(([, def]) => (def.category || "other") === category)
        .map(([id, def]) => {
          const done = isResearchCompleted(id);
          const available = meetsResearchRequirements(def);
          const statusText = done
            ? "已完成"
            : available
            ? "可研究"
            : getMissingRequirementText(def);

          const title = [
            def.name,
            statusText
          ].join("\n");

          return `
            <div class="research-card" title="${escapeHtml(title)}">
              <div class="research-summary">
                <strong>${escapeHtml(def.name)}</strong>
                <div class="research-status ${done ? "done" : ""}">
                  ${done ? "已完成" : escapeHtml(statusText)}
                </div>
              </div>
              <button
                data-start-research="${escapeHtml(id)}"
                type="button"
                class="research-mini-btn"
                ${done ? "disabled" : ""}
              >
                ${done ? "完成" : "研究"}
              </button>
            </div>
          `;
        })
        .join("");

      return `
        <details
          data-research-group="${escapeHtml(key)}"
          ${isOpen ? "open" : ""}
        >
          <summary>${escapeHtml(category)}</summary>
          <div class="research-grid">${cards}</div>
        </details>
      `;
    })
    .join("");

  root.innerHTML = `
    <details
      data-research-group="books"
      ${state.ui.openSections.research.books ? "open" : ""}
    >
      <summary>書籍閱讀</summary>
      <div class="book-grid" style="margin-top:8px;">${bookCards}</div>
    </details>

    <div style="margin-top:12px;"></div>

    ${blocks}
  `;

  root.querySelectorAll("[data-start-research]").forEach((btn) => {
    btn.addEventListener("click", () => onStartResearch(btn.dataset.startResearch));
  });

  root.querySelectorAll("[data-read-book]").forEach((btn) => {
    btn.addEventListener("click", () => onReadBook(btn.dataset.readBook));
  });

  root.querySelectorAll("[data-research-group]").forEach((detail) => {
    detail.addEventListener("toggle", () => {
      state.ui.openSections.research[detail.dataset.researchGroup] = detail.open;
    });
  });
}

export function renderActionLane({
  state,
  workDefs,
  getWorkCost,
  formatSeconds
}) {
  const textEl =
    document.getElementById("productionText") ||
    document.getElementById("actionStatus");
  const barEl =
    document.getElementById("productionBar") ||
    document.getElementById("actionProgressBar");
  const queueEl =
    document.getElementById("productionQueue") ||
    document.getElementById("actionQueue");
  const cancelBtn = document.getElementById("cancelActionBtn");
  const clearBtn = document.getElementById("clearActionQueueBtn");

  if (!textEl || !barEl || !queueEl) return;

  if (state.currentAction && workDefs[state.currentAction.id]) {
    const def = workDefs[state.currentAction.id];
    const total = Math.max(0.01, safeNumber(state.currentAction.total, 0.01));
    const remaining = Math.max(0, safeNumber(state.currentAction.remaining, 0));
    const progress = Math.min(
      100,
      Math.max(0, ((total - remaining) / total) * 100)
    );

    textEl.textContent = `進行中：${def.name}｜剩餘 ${formatSeconds(remaining)}`;
    textEl.title = `${def.name}\n剩餘：${formatSeconds(remaining)}`;
    barEl.style.width = `${progress}%`;
  } else if (state.actionQueue?.length > 0) {
    const nextDef = workDefs[state.actionQueue[0]];
    if (nextDef && safeNumber(state.stamina, 0) < getWorkCost(nextDef)) {
      textEl.textContent = `等待中：${nextDef.name}｜體力不足，需要 ${getWorkCost(nextDef)} 體力`;
    } else {
      textEl.textContent = `等待中：下一項 ${nextDef ? nextDef.name : "未知工作"}`;
    }
    textEl.title = textEl.textContent;
    barEl.style.width = "0%";
  } else {
    textEl.textContent = "目前沒有進行中的工作";
    textEl.title = "目前沒有進行中的工作";
    barEl.style.width = "0%";
  }

  queueEl.innerHTML = state.actionQueue?.length
    ? state.actionQueue
        .map(
          (id, index) =>
            `<span class="queue-pill" title="${escapeHtml(
              workDefs[id]?.name || id
            )}">${index + 1}. ${escapeHtml(workDefs[id]?.name || id)}</span>`
        )
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
    const total = Math.max(0.01, safeNumber(state.currentResearch.total, 0.01));
    const remaining = Math.max(
      0,
      safeNumber(state.currentResearch.remaining, 0)
    );
    const progress = Math.min(
      100,
      Math.max(0, ((total - remaining) / total) * 100)
    );

    textEl.textContent = `研究中：${state.currentResearch.name}｜剩餘 ${formatSeconds(
      remaining
    )}`;
    textEl.title = `${state.currentResearch.name}\n剩餘：${formatSeconds(remaining)}`;
    barEl.style.width = `${progress}%`;
  } else if (state.researchQueue?.length > 0) {
    textEl.textContent = `等待中：下一項 ${state.researchQueue[0].name}`;
    textEl.title = textEl.textContent;
    barEl.style.width = "0%";
  } else {
    textEl.textContent = "目前沒有進行中的研究";
    textEl.title = "目前沒有進行中的研究";
    barEl.style.width = "0%";
  }

  queueEl.innerHTML = state.researchQueue?.length
    ? state.researchQueue
        .map(
          (item, index) =>
            `<span class="queue-pill" title="${escapeHtml(
              item.name
            )}">${index + 1}. ${escapeHtml(item.name)}</span>`
        )
        .join("")
    : `<span class="small muted">研究列為空</span>`;
}

export function renderLog({ state }) {
  const root = document.getElementById("log");
  if (!root) return;

  const activeFilter = state.logFilter || state.ui?.logFilter || "all";
  let rows = state.logs || [];

  if (activeFilter !== "all") {
    rows = rows.filter((item) => (item.type || "important") === activeFilter);
  }

  if (rows.length === 0) {
    root.innerHTML = `<div class="log-item">目前還沒有事件紀錄</div>`;
  } else {
    root.innerHTML = rows
      .map((item) => {
        const text = typeof item === "string" ? item : item.text;
        const time = typeof item === "string" ? "" : item.time || "";
        return `
          <div class="log-item">
            ${
              time
                ? `<span class="small muted">${escapeHtml(time)}</span> `
                : ""
            }
            ${escapeHtml(text)}
          </div>
        `;
      })
      .join("");
  }

  document.getElementById("logAllBtn")?.classList.toggle("active", activeFilter === "all");
  document.getElementById("logImportantBtn")?.classList.toggle("active", activeFilter === "important");
  document.getElementById("logLootBtn")?.classList.toggle("active", activeFilter === "loot");
  document.getElementById("logWorkerBtn")?.classList.toggle("active", activeFilter === "worker");
}
