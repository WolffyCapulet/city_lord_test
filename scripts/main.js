const LOOP_RENDER_INTERVAL = 80;
let lastRenderTick = 0;

function loop(now) {
  const delta = Math.min(0.25, (now - lastTick) / 1000);
  lastTick = now;
  try {
    update(delta);
  } catch (err) {
    console.error("[loop:update]", err);
    addLog("主循環保護：更新時發生錯誤，已跳過本幀避免整體停止。", false, "important");
  }
  try {
    if (now - lastRenderTick >= LOOP_RENDER_INTERVAL) {
      render();
      lastRenderTick = now;
    }
  } catch (err) {
    console.error("[loop:render]", err);
  }
  requestAnimationFrame(loop);
}

function bootstrapGame() {
  initializeState();
  initializeEvents();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener("error", (e) => {
  console.error("[window.error]", e.error || e.message);
});

bootstrapGame();
