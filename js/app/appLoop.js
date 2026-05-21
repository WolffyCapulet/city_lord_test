import { renderBars } from "../ui/render/renderBars.js";

export function createAppLoop({
  state,
  workDefs,
  crafts,
  workSystem,
  updateCraft,
  researchSystem,
  merchantRuntime = null,
  workersRuntime = null,
  tryStartNextWork,
  tryStartNextCraft,
  formatSeconds,
  renderHeaderStats,
  renderLivePanels,
  maxDeltaSeconds = 0.2
}) {
  let lastFrameTime = performance.now();
  let rafId = 0;
  let errorCount = 0;

  function tick(now) {
    rafId = requestAnimationFrame(tick);

    const raw = (now - lastFrameTime) / 1000;
    const deltaSeconds = Math.min(maxDeltaSeconds, Math.max(0, raw));
    lastFrameTime = now;

    // ── Game state updates ──────────────────────────────────
    try {
      state.campfireSec = Math.max(0, Number(state.campfireSec || 0) - deltaSeconds);

      // Passive stamina regen
      const maxStamina = 100 + ((state.level || 1) - 1) * 10;
      if (Number(state.stamina || 0) < maxStamina) {
        const isWorking = !!state.currentAction;
        const baseRegen = isWorking ? 0.5 : 2.0;
        const campfireBonus = Number(state.campfireSec || 0) > 0 ? 3.0 : 0;
        const wellBonus = Number(state.buildings?.well || 0) * 0.2;
        state.stamina = Math.min(
          maxStamina,
          Number(state.stamina || 0) + (baseRegen + campfireBonus + wellBonus) * deltaSeconds
        );
      }

      // Salary timer
      if (typeof state.salaryTimer !== "number" || isNaN(state.salaryTimer)) {
        state.salaryTimer = 300;
      }
      state.salaryTimer = Math.max(0, state.salaryTimer - deltaSeconds);
      if (state.salaryTimer <= 0) {
        const workers = Array.isArray(state.workers) ? state.workers : [];
        if (workers.length > 0) {
          const mgDiscount = Math.min(0.5, (Number(state.managementLevel || 1) - 1) * 0.02);
          const wage = Math.max(1, Math.round(8 * (1 - mgDiscount)));
          const total = workers.length * wage;
          if (Number(state.gold || 0) >= total) {
            state.gold -= total;
            state.managementExp = (state.managementExp || 0) + Math.max(1, Math.floor(total * 0.5));
          } else {
            state.salaryDebt = (state.salaryDebt || 0) + total;
          }
        }
        state.salaryTimer = 300;
      }
    } catch (e) {
      if (errorCount++ < 5) console.error("[tick:state]", e);
    }

    // ── System updates ──────────────────────────────────────
    try { workSystem.updateAction(deltaSeconds); }
    catch (e) { if (errorCount++ < 5) console.error("[tick:workSystem]", e); }

    try { updateCraft(deltaSeconds); }
    catch (e) { if (errorCount++ < 5) console.error("[tick:craft]", e); }

    try { researchSystem.updateResearch(deltaSeconds); }
    catch (e) { if (errorCount++ < 5) console.error("[tick:research]", e); }

    try { merchantRuntime?.update?.(deltaSeconds); }
    catch (e) { if (errorCount++ < 5) console.error("[tick:merchant]", e); }

    try { workersRuntime?.update?.(deltaSeconds); }
    catch (e) { if (errorCount++ < 5) console.error("[tick:workers]", e); }

    // ── Auto-start queued items ─────────────────────────────
    try {
      if (!state.currentAction && (state.actionQueue?.length ?? 0) > 0) {
        tryStartNextWork();
      }
      if (!state.currentCraft && (state.craftQueue?.length ?? 0) > 0) {
        tryStartNextCraft();
      }
    } catch (e) {
      if (errorCount++ < 5) console.error("[tick:queue]", e);
    }

    // ── Render bars (fast, no DOM rebuild) ─────────────────
    try {
      renderBars({ state, workDefs, crafts, formatSeconds });
    } catch (e) {
      if (errorCount++ < 5) console.error("[tick:renderBars]", e);
    }
  }

  function start() {
    stop();
    lastFrameTime = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  return { start, stop };
}
