export const STORAGE_KEY = "city_lord_save_v0.0.1";
export const LOG_LIMIT = 80;
export const WORK_QUEUE_LIMIT = 3;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeLoadedLogs(logs, logLimit = LOG_LIMIT) {
  if (!Array.isArray(logs)) return [];

  return logs
    .map((item) => {
      if (typeof item === "string") {
        return { time: "", text: item, type: "important" };
      }

      return {
        time: item?.time || "",
        text: item?.text || "",
        type: item?.type || "important"
      };
    })
    .filter((item) => item.text)
    .slice(0, logLimit);
}

export function saveState({
  state,
  storageKey = STORAGE_KEY
}) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, error };
  }
}

export function clearSave(storageKey = STORAGE_KEY) {
  try {
    localStorage.removeItem(storageKey);
    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, error };
  }
}

export function loadStateInto({
  state,
  storageKey = STORAGE_KEY,
  createDefaultResources,
  workDefs,
  getWorkDuration,
  getMaxStaminaForLevel,
  logLimit = LOG_LIMIT,
  workQueueLimit = WORK_QUEUE_LIMIT
}) {
  try {
    const raw = localStorage.getItem(storageKey);

    if (!raw) {
      return {
        ok: false,
        found: false
      };
    }

    const data = JSON.parse(raw);

    const level = Math.max(1, Number(data.level ?? 1) || 1);
    const maxStaminaValue = getMaxStaminaForLevel(level);

    state.gold = Number(data.gold ?? 0);
    state.level = level;
    state.exp = Math.max(0, Number(data.exp ?? 0) || 0);
    state.stamina = clamp(Number(data.stamina ?? 100) || 100, 0, maxStaminaValue);

    state.logs = normalizeLoadedLogs(data.logs, logLimit);
    state.logFilter = typeof data.logFilter === "string" ? data.logFilter : "all";

    state.research = data.research && typeof data.research === "object" ? data.research : {};

    state.currentResearch =
      data.currentResearch && typeof data.currentResearch === "object"
        ? {
            id: data.currentResearch.id,
            name: data.currentResearch.name || data.currentResearch.id,
            remaining: Math.max(0, Number(data.currentResearch.remaining) || 0),
            total: Math.max(0.1, Number(data.currentResearch.total) || 10)
          }
        : null;

    state.researchQueue = Array.isArray(data.researchQueue)
      ? data.researchQueue
          .map((item) => ({
            id: item.id,
            name: item.name || item.id,
            duration: Math.max(0.1, Number(item.duration) || 10)
          }))
          .filter((item) => item.id)
      : [];

    state.resources = {
      ...createDefaultResources(),
      ...(data.resources || {})
    };

    state.currentAction =
      data.currentAction && workDefs[data.currentAction.id]
        ? {
            type: "work",
            id: data.currentAction.id,
            remaining: Math.max(0, Number(data.currentAction.remaining) || 0),
            total: Math.max(
              0.1,
              Number(data.currentAction.total) || getWorkDuration(workDefs[data.currentAction.id])
            )
          }
        : null;

    state.actionQueue = Array.isArray(data.actionQueue)
      ? data.actionQueue.filter((id) => !!workDefs[id]).slice(0, workQueueLimit)
      : [];

    return {
      ok: true,
      found: true
    };
  } catch (error) {
    console.error(error);
    return {
      ok: false,
      found: true,
      error
    };
  }
}
