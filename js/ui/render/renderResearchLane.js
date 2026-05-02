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
        ((state.currentResearch.total - state.currentResearch.remaining) /
          state.currentResearch.total) *
          100
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
        .map(
          (item, index) =>
            `<span class="queue-pill">${index + 1}. ${item.name}</span>`
        )
        .join("")
    : `<span class="small muted">研究列為空</span>`;
}
