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
  return Math.max(1, Math.floor(Number(item?.count || 1)));
}

export function renderCraftLane({
  state,
  crafts,
  formatSeconds,
  onRemoveQueuedCraft = null,
  onMoveQueuedCraft = null
}) {
  const textEl = document.getElementById("craftText");
  const barEl = document.getElementById("craftBar");
  const queueEl = document.getElementById("craftQueueTop");

  if (!textEl || !barEl || !queueEl) return;

  const queuedItems = Array.isArray(state.craftQueue) ? state.craftQueue : [];

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
  } else if (queuedItems.length > 0) {
    const nextItem = queuedItems[0];
    const nextId = getQueuedId(nextItem);
    const nextCount = getQueuedCount(nextItem);
    const nextDef = crafts[nextId];

    textEl.textContent = `等待中：下一項 ${nextDef ? nextDef.name : "未知配方"} × ${nextCount}`;
    textEl.title = textEl.textContent;
    barEl.style.width = "0%";
  } else {
    textEl.textContent = "目前沒有進行中的製作";
    textEl.title = "目前沒有進行中的製作";
    barEl.style.width = "0%";
  }

  queueEl.innerHTML = queuedItems.length
    ? queuedItems
        .map((item, index, arr) => {
          const id = getQueuedId(item);
          const count = getQueuedCount(item);
          const name = crafts[id]?.name || id;

          return `
            <div class="queue-row">
              <span class="queue-pill">${index + 1}. ${escapeHtml(name)} × ${count}</span>
              <div class="queue-row-actions">
                <button
                  type="button"
                  class="tiny-btn"
                  data-craft-up="${index}"
                  ${index === 0 ? "disabled" : ""}
                  title="上移"
                >↑</button>
                <button
                  type="button"
                  class="tiny-btn"
                  data-craft-down="${index}"
                  ${index === arr.length - 1 ? "disabled" : ""}
                  title="下移"
                >↓</button>
                <button
                  type="button"
                  class="tiny-btn danger"
                  data-craft-remove="${index}"
                  title="移除"
                >×</button>
              </div>
            </div>
          `;
        })
        .join("")
    : `<span class="small muted">製作列為空</span>`;

  queueEl.querySelectorAll("[data-craft-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onRemoveQueuedCraft?.(Number(btn.dataset.craftRemove));
    });
  });

  queueEl.querySelectorAll("[data-craft-up]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onMoveQueuedCraft?.(Number(btn.dataset.craftUp), -1);
    });
  });

  queueEl.querySelectorAll("[data-craft-down]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onMoveQueuedCraft?.(Number(btn.dataset.craftDown), 1);
    });
  });
}
