function normalizeQueueEntries(queue = []) {
  return (Array.isArray(queue) ? queue : [])
    .map((item) => {
      if (typeof item === "string") {
        return { id: item, count: 1, infinite: false };
      }

      const infinite = !!item?.infinite || Number(item?.count) < 0;
      return {
        id: item?.id,
        count: infinite ? -1 : Math.max(1, Math.floor(Number(item?.count || 1))),
        infinite
      };
    })
    .filter((item) => typeof item.id === "string" && item.id);
}

function getQueuedId(item) {
  return typeof item === "string" ? item : item?.id;
}

function getQueuedCount(item) {
  if (typeof item === "string") return 1;
  if (item?.infinite || Number(item?.count) < 0) return -1;
  return Math.max(1, Math.floor(Number(item?.count || 1)));
}

function makeQueueEntry(id, count = 1, infinite = false) {
  return {
    id,
    count: infinite ? -1 : Math.max(1, Math.floor(Number(count || 1))),
    infinite: !!infinite
  };
}

export function createWorkQueueRuntime({
  state,
  addLog,
  workDefs,
  getWorkCost,
  workSystem,
  queueLimit = 3
}) {
  if (!Array.isArray(state.actionQueue)) state.actionQueue = [];
  state.actionQueue = normalizeQueueEntries(state.actionQueue);

  function queueWork(workId, count = 1, infinite = false) {
    if (!Array.isArray(state.actionQueue)) state.actionQueue = [];

    if (state.actionQueue.length >= queueLimit) {
      addLog(`行動列隊已滿，最多等待 ${queueLimit} 項`, "important");
      return false;
    }

    const entry = makeQueueEntry(workId, count, infinite);
    state.actionQueue.push(entry);

    const qtyLabel = entry.count < 0 ? "∞" : entry.count;
    addLog(
      `已加入行動列隊：${workDefs[workId]?.name || workId} × ${qtyLabel}`,
      "important"
    );
    return true;
  }

  function startWorkNow(workId) {
    workSystem.requestWork(workId);
    return !!(state.currentAction && state.currentAction.id === workId);
  }

  function startWorkPlan(workId, count = 1, infinite = false) {
    const qty = infinite ? -1 : Math.max(1, Math.floor(Number(count || 1)));

    if (state.currentAction) {
      return queueWork(workId, qty, infinite);
    }

    const ok = startWorkNow(workId);
    if (!ok) return false;

    if (qty < 0) {
      if (state.actionQueue.length < queueLimit) {
        state.actionQueue.unshift(makeQueueEntry(workId, -1, true));
        addLog(`已開始 ${workDefs[workId]?.name || workId} 的無限生產`, "important");
      }
      return true;
    }

    if (qty > 1) {
      if (state.actionQueue.length < queueLimit) {
        state.actionQueue.unshift(makeQueueEntry(workId, qty - 1, false));
        addLog(`已安排 ${workDefs[workId]?.name || workId} 連續進行 ${qty} 次`, "important");
      } else {
        addLog(
          `已開始 ${workDefs[workId]?.name || workId}，但列隊已滿，剩餘 ${qty - 1} 次未加入`,
          "important"
        );
      }
    }

    return true;
  }

  function tryStartNextWork() {
    if (state.currentAction) return false;
    if (!Array.isArray(state.actionQueue) || state.actionQueue.length === 0) return false;

    const next = state.actionQueue[0];
    const nextId = getQueuedId(next);
    const nextCount = getQueuedCount(next);
    const nextDef = workDefs[nextId];

    if (!nextDef) {
      state.actionQueue.shift();
      return tryStartNextWork();
    }

    if (state.stamina < getWorkCost(nextDef)) {
      return false;
    }

    const ok = startWorkNow(nextId);
    if (!ok) return false;

    if (nextCount < 0) {
      state.actionQueue[0] = makeQueueEntry(nextId, -1, true);
      return true;
    }

    if (nextCount <= 1) {
      state.actionQueue.shift();
    } else {
      state.actionQueue[0] = makeQueueEntry(nextId, nextCount - 1, false);
    }

    return true;
  }

  function removeQueuedAction(index) {
    if (!Array.isArray(state.actionQueue)) return false;
    if (index < 0 || index >= state.actionQueue.length) return false;

    const [removed] = state.actionQueue.splice(index, 1);
    if (!removed) return false;

    const id = getQueuedId(removed);
    const count = getQueuedCount(removed);
    addLog(
      `已移除行動列隊：${workDefs[id]?.name || id} × ${count < 0 ? "∞" : count}`,
      "important"
    );
    return true;
  }

  function moveQueuedAction(index, direction) {
    if (!Array.isArray(state.actionQueue)) return false;

    const targetIndex = index + direction;
    if (
      index < 0 ||
      index >= state.actionQueue.length ||
      targetIndex < 0 ||
      targetIndex >= state.actionQueue.length
    ) {
      return false;
    }

    const temp = state.actionQueue[index];
    state.actionQueue[index] = state.actionQueue[targetIndex];
    state.actionQueue[targetIndex] = temp;
    return true;
  }

  function clearQueuedActions() {
    if (!Array.isArray(state.actionQueue) || state.actionQueue.length === 0) {
      addLog("目前沒有等待中的行動列", "important");
      return false;
    }

    state.actionQueue = [];
    addLog("已清空行動列", "important");
    return true;
  }

  function handleWorkClick(workId) {
    if (state.currentAction) {
      return queueWork(workId, 1, false);
    }
    return startWorkNow(workId);
  }

  return {
    normalizeQueueEntries,
    getQueuedId,
    getQueuedCount,
    queueWork,
    startWorkNow,
    startWorkPlan,
    tryStartNextWork,
    removeQueuedAction,
    moveQueuedAction,
    clearQueuedActions,
    handleWorkClick
  };
}
