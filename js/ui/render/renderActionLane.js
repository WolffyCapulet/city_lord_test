function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getQueuedId(item) {
  return typeof item === "string" ? item : item?.id;
}

function getQueuedCount(item) {
  if (typeof item === "string") return 1;
  if (item?.infinite || Number(item?.count) < 0) return -1;
  return Math.max(1, Math.floor(Number(item?.count || 1)));
}

export function renderActionLane({
  state,
  workDefs,
  getWorkCost,
  formatSeconds,
  onRemoveQueuedAction = null,
  onMoveQueuedAction = null
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

  const queuedItems = Array.isArray(state.actionQueue) ? state.actionQueue : [];

  if (state.currentAction && workDefs[state.currentAction.id]) {
    const def = workDefs[state.currentAction.id];

    const total = Math.max(0.01, Number(state.currentAction.total || 0.01));
    const remaining = Math.max(0, Number(state.currentAction.remaining || 0));

    const progress = Math.min(
      100,
      Math.max(0, ((total - remaining) / total) * 100)
    );

    textEl.textContent = `進行中：${def.name}｜剩餘 ${formatSeconds(remaining)}`;
    barEl.style.width = `${progress}%`;
  } else if (queuedItems.length > 0) {
    const nextItem = queuedItems[0];
    const nextId = getQueuedId(nextItem);
    const nextCount = getQueuedCount(nextItem);
    const nextCountLabel = nextCount < 0 ? "∞" : String(nextCount);
    const nextDef = workDefs[nextId];

    if (nextDef && state.stamina < getWorkCost(nextDef)) {
      textEl.textContent = `等待中：${nextDef.name} × ${nextCountLabel}｜體力不足，需要 ${getWorkCost(nextDef)} 體力`;
    } else {
      textEl.textContent = `等待中：下一項 ${nextDef ? nextDef.name : "未知工作"} × ${nextCountLabel}`;
    }

    barEl.style.width = "0%";
  } else {
    textEl.textContent = "目前沒有進行中的工作";
    barEl.style.width = "0%";
  }

  queueEl.innerHTML = queuedItems.length
    ? queuedItems
        .map((item, index, arr) => {
          const id = getQueuedId(item);
          const count = getQueuedCount(item);
          const countLabel = count < 0 ? "∞" : String(count);
          const name = workDefs[id]?.name || id;

          return `
            <div class="queue-row">
              <span class="queue-pill">${index + 1}. ${escapeHtml(name)} × ${countLabel}</span>
              <div class="queue-row-actions">
                <button
                  type="button"
                  class="tiny-btn"
                  data-action-up="${index}"
                  ${index === 0 ? "disabled" : ""}
                  title="上移"
                >↑</button>
                <button
                  type="button"
                  class="tiny-btn"
                  data-action-down="${index}"
                  ${index === arr.length - 1 ? "disabled" : ""}
                  title="下移"
                >↓</button>
                <button
                  type="button"
                  class="tiny-btn danger"
                  data-action-remove="${index}"
                  title="移除"
                >×</button>
              </div>
            </div>
          `;
        })
        .join("")
    : `<span class="small muted">行動列為空</span>`;

  queueEl.querySelectorAll("[data-action-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onRemoveQueuedAction?.(Number(btn.dataset.actionRemove));
    });
  });

  queueEl.querySelectorAll("[data-action-up]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onMoveQueuedAction?.(Number(btn.dataset.actionUp), -1);
    });
  });

  queueEl.querySelectorAll("[data-action-down]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onMoveQueuedAction?.(Number(btn.dataset.actionDown), 1);
    });
  });

  if (cancelBtn) cancelBtn.disabled = !state.currentAction;
  if (clearBtn) clearBtn.disabled = !queuedItems.length;
}
