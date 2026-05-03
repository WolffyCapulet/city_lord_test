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
    rafId = requestAnimationFrame(tick);

    try {
      const deltaSeconds = Math.min(
        maxDeltaSeconds,
        Math.max(0, (now - lastFrameTime) / 1000)
      );
      lastFrameTime = now;

      state.campfireSec = Math.max(0, Number(state.campfireSec || 0) - deltaSeconds);

      // Passive stamina regen
      // Idle (no current action): 2/sec; working: 0.5/sec; campfire adds +3/sec
      const maxStamina = 100 + ((state.level || 1) - 1) * 10;
      if (Number(state.stamina || 0) < maxStamina) {
        const isWorking = !!state.currentAction;
        const baseRegen = isWorking ? 0.5 : 2.0;
        const campfireBonus = Number(state.campfireSec || 0) > 0 ? 3.0 : 0;
        const wellBonus = Number(state.buildings?.well || 0) * 0.2;
        const regenRate = baseRegen + campfireBonus + wellBonus;
        state.stamina = Math.min(maxStamina, Number(state.stamina || 0) + regenRate * deltaSeconds);
      }

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
    } catch (err) {
      console.error("[appLoop tick error]", err);
    }
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

  return { start, stop, tick };
}
