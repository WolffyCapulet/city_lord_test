export function createAppLoop({
  state,
  workSystem,
  updateCraft,
  researchSystem,
  merchantRuntime = null,
  workersRuntime = null,
  tryStartNextWork,
  tryStartNextCraft,
  renderHeaderStats,
  renderLivePanels,
  maxDeltaSeconds = 0.2
}) {
  let lastFrameTime = performance.now();
  let rafId = 0;

  function tick(now) {
    const deltaSeconds = Math.min(
      maxDeltaSeconds,
      Math.max(0, (now - lastFrameTime) / 1000)
    );
    lastFrameTime = now;

    state.campfireSec = Math.max(
      0,
      Number(state.campfireSec || 0) - deltaSeconds
    );

    workSystem.updateAction(deltaSeconds);
    updateCraft(deltaSeconds);
    researchSystem.updateResearch(deltaSeconds);
    merchantRuntime?.update?.(deltaSeconds);
    workersRuntime?.update?.(deltaSeconds);

    if (!state.currentAction && state.actionQueue?.length > 0) {
      tryStartNextWork();
    }

    if (!state.currentCraft && state.craftQueue?.length > 0) {
      tryStartNextCraft();
    }

    renderHeaderStats();
    renderLivePanels();

    rafId = requestAnimationFrame(tick);
  }

  function start() {
    stop();
    lastFrameTime = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  return {
    start,
    stop,
    tick
  };
}
