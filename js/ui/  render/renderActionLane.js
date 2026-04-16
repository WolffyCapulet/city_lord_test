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
        .map(
          (id, index) =>
            `<span class="queue-pill">${index + 1}. ${workDefs[id]?.name || id}</span>`
        )
        .join("")
    : `<span class="small muted">行動列為空</span>`;

  if (cancelBtn) cancelBtn.disabled = !state.currentAction;
  if (clearBtn) clearBtn.disabled = !state.actionQueue?.length;
}
