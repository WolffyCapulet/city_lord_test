export function createResearchSystem({
  state,
  addLog
}) {
  if (!state.research) state.research = {};
  if (!state.currentResearch) state.currentResearch = null;
  if (!state.researchQueue) state.researchQueue = [];

  function isUnlocked(researchId) {
    return !!state.research?.[researchId];
  }

  function unlock(researchId, label = researchId) {
    if (!researchId) return false;
    if (isUnlocked(researchId)) return false;

    state.research[researchId] = true;
    addLog(`研究完成：${label}`, "important");
    return true;
  }

  function startResearch(researchId, options = {}) {
    const {
      name = researchId,
      duration = 10
    } = options;

    if (!researchId) return false;

    if (isUnlocked(researchId)) {
      addLog(`${name}已經研究完成`, "important");
      return false;
    }

    if (state.currentResearch) {
      addLog(`目前已有研究進行中：${state.currentResearch.name}`, "important");
      return false;
    }

    state.currentResearch = {
      id: researchId,
      name,
      remaining: Math.max(0.1, Number(duration) || 10),
      total: Math.max(0.1, Number(duration) || 10)
    };

    addLog(`開始研究：${name}`, "important");
    return true;
  }

  function completeResearch() {
    const current = state.currentResearch;
    if (!current) return false;

    state.currentResearch = null;
    unlock(current.id, current.name);
    tryStartNextQueuedResearch();
    return true;
  }

  function cancelResearch() {
    if (!state.currentResearch) {
      addLog("目前沒有進行中的研究", "important");
      return false;
    }

    addLog(`已取消研究：${state.currentResearch.name}`, "important");
    state.currentResearch = null;
    return true;
  }

  function enqueueResearch(researchId, options = {}) {
    const {
      name = researchId,
      duration = 10
    } = options;

    if (!researchId) return false;

    if (isUnlocked(researchId)) {
      addLog(`${name}已經研究完成`, "important");
      return false;
    }

    if (state.researchQueue.some((item) => item.id === researchId)) {
      addLog(`${name}已經在研究佇列中`, "important");
      return false;
    }

    state.researchQueue.push({
      id: researchId,
      name,
      duration: Math.max(0.1, Number(duration) || 10)
    });

    addLog(`已加入研究佇列：${name}`, "important");
    return true;
  }

  function tryStartNextQueuedResearch() {
    if (state.currentResearch || !state.researchQueue.length) return false;

    const next = state.researchQueue.shift();
    if (!next) return false;

    if (isUnlocked(next.id)) return false;

    state.currentResearch = {
      id: next.id,
      name: next.name,
      remaining: next.duration,
      total: next.duration
    };

    addLog(`開始研究：${next.name}`, "important");
    return true;
  }

  function clearResearchQueue() {
    if (!state.researchQueue.length) {
      addLog("目前沒有研究佇列", "important");
      return false;
    }

    state.researchQueue = [];
    addLog("已清空研究佇列", "important");
    return true;
  }

  function updateResearch(deltaSeconds) {
    if (!state.currentResearch) {
      tryStartNextQueuedResearch();
      return;
    }

    state.currentResearch.remaining -= deltaSeconds;
    if (state.currentResearch.remaining <= 0) {
      completeResearch();
    }
  }

  return {
    isUnlocked,
    unlock,
    startResearch,
    completeResearch,
    cancelResearch,
    enqueueResearch,
    clearResearchQueue,
    updateResearch
  };
}
