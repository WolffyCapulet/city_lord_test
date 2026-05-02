import { crafts as craftDefs } from "../data/crafts.js";

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

export function createCraftRuntime({
  state,
  addLog,
  addMainExp,
  addSkillExp = () => {},
  gainResource,
  canAfford,
  spendCosts,
  getResourceLabel = (id) => id,
  queueLimit = 3,
  crafts = craftDefs,
  onBlockedByStamina = null,
  onIdle = null
}) {
  if (!Array.isArray(state.craftQueue)) state.craftQueue = [];
  state.craftQueue = normalizeQueueEntries(state.craftQueue);
  if (!state.currentCraft || typeof state.currentCraft !== "object") {
    state.currentCraft = null;
  }

  function isCraftHidden(def) {
    return !!def?.hidden;
  }

  function isCraftUnlocked(def) {
    if (!def?.unlock) return true;
    return !!state.research?.[def.unlock];
  }

  function getCraftDuration(def, craftId) {
    return Math.max(0.2, Number(def?.duration ?? 1));
  }

  function canStartCraft(def) {
    if (!def) return { ok: false, reason: "invalid" };
    if (isCraftHidden(def)) return { ok: false, reason: "hidden" };
    if (!isCraftUnlocked(def)) return { ok: false, reason: "locked" };

    const staminaCost = Math.max(1, Number(def.stamina ?? 1));
    if (Number(state.stamina || 0) < staminaCost) return { ok: false, reason: "stamina" };
    if (!canAfford(def.costs || {})) return { ok: false, reason: "materials" };

    return { ok: true, reason: "" };
  }

  function queueCraft(craftId, count = 1, infinite = false) {
    if (!Array.isArray(state.craftQueue)) state.craftQueue = [];

    if (state.craftQueue.length >= queueLimit) {
      addLog(`製作列隊已滿，最多等待 ${queueLimit} 項`, "important");
      return false;
    }

    const entry = makeQueueEntry(craftId, count, infinite);
    state.craftQueue.push(entry);

    const label = entry.count < 0 ? "∞" : entry.count;
    addLog(`已加入製作列隊：${crafts[craftId]?.name || craftId} × ${label}`, "important");
    return true;
  }

  function beginCraft(craftId, { silent = false } = {}) {
    const def = crafts[craftId];
    const check = canStartCraft(def);

    if (!check.ok) {
      if (!silent) {
        if (check.reason === "hidden") {
          addLog(`${def?.name || craftId}目前不可見`, "important");
        } else if (check.reason === "locked") {
          addLog(`${def?.name || craftId}尚未解鎖，需要研究：${def?.unlock}`, "important");
        } else if (check.reason === "stamina") {
          addLog(`${def?.name || craftId}製作失敗，體力不足`, "important");
        } else if (check.reason === "materials") {
          addLog(`${def?.name || craftId}製作失敗，材料不足`, "important");
        }
      }
      return false;
    }

    const staminaCost = Math.max(1, Number(def.stamina ?? 1));
    spendCosts(def.costs || {});
    state.stamina -= staminaCost;

    const duration = getCraftDuration(def, craftId);
    state.currentCraft = {
      id: craftId,
      total: duration,
      remaining: duration
    };

    if (!silent) {
      addLog(`開始製作：${def.name}`, "important");
    }

    return true;
  }

  function finishCurrentCraft() {
    if (!state.currentCraft) return false;

    const craftId = state.currentCraft.id;
    const def = crafts[craftId];
    state.currentCraft = null;

    if (!def) return false;

    for (const [resourceId, amount] of Object.entries(def.yields || {})) {
      gainResource(resourceId, amount);
    }

    addMainExp(1);
    if (def.skill) addSkillExp(def.skill, 1);

    const gainText = Object.entries(def.yields || {})
      .map(([id, amount]) => `${getResourceLabel(id)} +${amount}`)
      .join("、");

    addLog(`你製作了 ${def.name}，獲得 ${gainText}，經驗 +1`, "loot");
    return true;
  }

  function updateCraft(deltaSeconds) {
    if (!state.currentCraft) return false;

    state.currentCraft.remaining = Math.max(
      0,
      Number(state.currentCraft.remaining || 0) - Number(deltaSeconds || 0)
    );

    if (state.currentCraft.remaining <= 0) {
      finishCurrentCraft();
      return true;
    }

    return false;
  }

  function startCraftPlan(craftId, count = 1, infinite = false) {
    const qty = infinite ? -1 : Math.max(1, Math.floor(Number(count || 1)));

    if (state.currentCraft) {
      return queueCraft(craftId, qty, infinite);
    }

    const started = beginCraft(craftId);
    if (!started) return false;

    if (qty < 0) {
      if (state.craftQueue.length < queueLimit) {
        state.craftQueue.unshift(makeQueueEntry(craftId, -1, true));
        addLog(`已安排 ${crafts[craftId]?.name || craftId} 無限製作`, "important");
      }
      return true;
    }

    if (qty > 1) {
      if (state.craftQueue.length < queueLimit) {
        state.craftQueue.unshift(makeQueueEntry(craftId, qty - 1, false));
        addLog(`已安排 ${crafts[craftId]?.name || craftId} 連續製作 ${qty} 次`, "important");
      } else {
        addLog(
          `已開始 ${crafts[craftId]?.name || craftId}，但列隊已滿，剩餘 ${qty - 1} 次未加入`,
          "important"
        );
      }
    }

    return true;
  }

  function reserveQueuedEntryAt(index) {
    const entry = state.craftQueue[index];
    if (!entry) return null;

    const id = getQueuedId(entry);
    const count = getQueuedCount(entry);

    if (count < 0) {
      return { id, infinite: true };
    }

    if (count <= 1) {
      state.craftQueue.splice(index, 1);
    } else {
      state.craftQueue[index] = makeQueueEntry(id, count - 1, false);
    }

    return { id, infinite: false };
  }

  function purgeInvalidQueueEntries() {
    let removedAny = false;

    state.craftQueue = state.craftQueue.filter((entry) => {
      const id = getQueuedId(entry);
      const def = crafts[id];
      const check = canStartCraft(def);

      if (["invalid", "hidden", "locked"].includes(check.reason)) {
        removedAny = true;
        addLog(`已自動移除不可用配方：${def?.name || id}`, "important");
        return false;
      }
      return true;
    });

    return removedAny;
  }

  function findFirstRunnableQueueIndex() {
    let hasStaminaBlocked = false;

    for (let i = 0; i < state.craftQueue.length; i += 1) {
      const entry = state.craftQueue[i];
      const id = getQueuedId(entry);
      const def = crafts[id];
      const check = canStartCraft(def);

      if (check.ok) return i;
      if (check.reason === "stamina") hasStaminaBlocked = true;
    }

    return hasStaminaBlocked ? -2 : -1;
  }

  function tryStartNextCraft() {
    if (state.currentCraft) return false;
    if (!Array.isArray(state.craftQueue) || state.craftQueue.length === 0) {
      onIdle?.();
      return false;
    }

    purgeInvalidQueueEntries();
    if (state.craftQueue.length === 0) {
      onIdle?.();
      return false;
    }

    const index = findFirstRunnableQueueIndex();

    if (index === -2) {
      onBlockedByStamina?.("craft_queue");
      return false;
    }

    if (index < 0) {
      onIdle?.();
      return false;
    }

    const reserved = reserveQueuedEntryAt(index);
    if (!reserved?.id) return false;

    const started = beginCraft(reserved.id, { silent: true });
    if (!started) {
      if (reserved.infinite) {
        state.craftQueue.splice(index, 0, makeQueueEntry(reserved.id, -1, true));
      } else {
        state.craftQueue.splice(index, 0, makeQueueEntry(reserved.id, 1, false));
      }
      return false;
    }

    return true;
  }

  function removeQueuedCraft(index) {
    if (!Array.isArray(state.craftQueue)) return false;
    if (index < 0 || index >= state.craftQueue.length) return false;

    const [removed] = state.craftQueue.splice(index, 1);
    if (!removed) return false;

    const id = getQueuedId(removed);
    const count = getQueuedCount(removed);
    addLog(`已移除製作列隊：${crafts[id]?.name || id} × ${count < 0 ? "∞" : count}`, "important");
    return true;
  }

  function moveQueuedCraft(index, direction) {
    if (!Array.isArray(state.craftQueue)) return false;

    const targetIndex = index + direction;
    if (
      index < 0 ||
      index >= state.craftQueue.length ||
      targetIndex < 0 ||
      targetIndex >= state.craftQueue.length
    ) {
      return false;
    }

    const temp = state.craftQueue[index];
    state.craftQueue[index] = state.craftQueue[targetIndex];
    state.craftQueue[targetIndex] = temp;
    return true;
  }

  return {
    normalizeQueueEntries,
    getQueuedId,
    getQueuedCount,
    isCraftHidden,
    isCraftUnlocked,
    getCraftDuration,
    canStartCraft,
    queueCraft,
    beginCraft,
    finishCurrentCraft,
    updateCraft,
    startCraftPlan,
    tryStartNextCraft,
    removeQueuedCraft,
    moveQueuedCraft,
    findFirstRunnableQueueIndex,
    purgeInvalidQueueEntries
  };
}
