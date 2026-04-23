function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

  if (state.currentAction && workDefs[state.currentAction.id]) {
    const def = workDefs[state.currentAction.id];

    const progress = Math.min(
      100,
      Math.max(
        0,
        ((state.currentAction.total - state.currentAction.remaining) /
          state.currentAction.total) *
          100
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
        .map((id, index, arr) => {
          const name = workDefs[id]?.name || id;
          return `
            <div class="queue-row">
              <span class="queue-pill">${index + 1}. ${escapeHtml(name)}</span>
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
  if (clearBtn) clearBtn.disabled = !state.actionQueue?.length;
}
