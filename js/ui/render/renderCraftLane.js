export function renderCraftLane({
  state,
  crafts,
  formatSeconds
}) {
  const textEl = document.getElementById("craftText");
  const barEl = document.getElementById("craftBar");
  const queueEl = document.getElementById("craftQueueTop");

  if (!textEl || !barEl || !queueEl) return;

  if (state.currentCraft && crafts[state.currentCraft.id]) {
    const def = crafts[state.currentCraft.id];
    const total = Math.max(0.01, Number(state.currentCraft.total || 0.01));
    const remaining = Math.max(0, Number(state.currentCraft.remaining || 0));
    const progress = Math.min(
      100,
      Math.max(0, ((total - remaining) / total) * 100)
    );

    textEl.textContent = `製作中：${def.name}｜剩餘 ${formatSeconds(remaining)}`;
    textEl.title = `${def.name}\n剩餘：${formatSeconds(remaining)}`;
    barEl.style.width = `${progress}%`;
  } else if (state.craftQueue?.length > 0) {
    const nextId = state.craftQueue[0];
    const nextDef = crafts[nextId];
    textEl.textContent = `等待中：下一項 ${nextDef ? nextDef.name : "未知配方"}`;
    textEl.title = textEl.textContent;
    barEl.style.width = "0%";
  } else {
    textEl.textContent = "目前沒有進行中的製作";
    textEl.title = "目前沒有進行中的製作";
    barEl.style.width = "0%";
  }

  queueEl.innerHTML = state.craftQueue?.length
    ? state.craftQueue
        .map(
          (id, index) =>
            `<span class="queue-pill">${index + 1}. ${crafts[id]?.name || id}</span>`
        )
        .join("")
    : `<span class="small muted">製作列為空</span>`;
}
