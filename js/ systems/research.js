import { books, researchDefs } from "../data/research.js";

export function createResearchSystem({
  state,
  addLog,
  gainResource,
  countBuiltPlots
}) {
  if (!state.research) state.research = {};
  if (!state.currentResearch) state.currentResearch = null;
  if (!state.researchQueue) state.researchQueue = [];

  function isResearchCompleted(researchId) {
    return !!state.research?.[researchId];
  }

  function meetsResearchRequirements(def) {
    if (!def) return false;

    if (def.levelReq && state.level < def.levelReq) return false;
    if (def.intReq && state.intelligence < def.intReq) return false;

    if (def.reqHouses) {
      for (const [id, need] of Object.entries(def.reqHouses)) {
        if ((state.housing?.[id] || 0) < need) return false;
      }
    }

    if (def.reqBuildings) {
      for (const [id, need] of Object.entries(def.reqBuildings)) {
        if ((state.buildings?.[id] || 0) < need) return false;
      }
    }

    if (def.reqPlots && countBuiltPlots() < def.reqPlots) return false;

    return true;
  }

  function getMissingRequirementText(def) {
    if (!def) return "找不到研究資料";

    const misses = [];

    if (def.levelReq && state.level < def.levelReq) {
      misses.push(`主等級 ${state.level}/${def.levelReq}`);
    }

    if (def.intReq && state.intelligence < def.intReq) {
      misses.push(`智力 ${state.intelligence}/${def.intReq}`);
    }

    if (def.reqHouses) {
      for (const [id, need] of Object.entries(def.reqHouses)) {
        const have = state.housing?.[id] || 0;
        if (have < need) misses.push(`住房 ${id} ${have}/${need}`);
      }
    }

    if (def.reqBuildings) {
      for (const [id, need] of Object.entries(def.reqBuildings)) {
        const have = state.buildings?.[id] || 0;
        if (have < need) misses.push(`建築 ${id} ${have}/${need}`);
      }
    }

    if (def.reqPlots && countBuiltPlots() < def.reqPlots) {
      misses.push(`農田 ${countBuiltPlots()}/${def.reqPlots}`);
    }

    return misses.length ? `尚缺：${misses.join("、")}` : "條件已滿足";
  }

  function applyResearchRewards(def) {
    if (!def) return;

    if (def.rewardInt) {
      state.intelligence = (state.intelligence || 0) + def.rewardInt;
    }

    if (def.unlockCraft) {
      addLog(`已解鎖配方：${def.unlockCraft}`, "important");
    }

    if (def.unlockBuild) {
      addLog(`已解鎖建築：${def.unlockBuild}`, "important");
    }

    if (def.unlockHouse) {
      addLog(`已解鎖住房：${def.unlockHouse}`, "important");
    }
  }

  function completeResearch(researchId) {
    const def = researchDefs[researchId];
    if (!def) return false;

    if (!state.research) state.research = {};
    state.research[researchId] = true;

    applyResearchRewards(def);
    addLog(`研究完成：${def.name}`, "important");
    return true;
  }

  function startResearch(researchId) {
    const def = researchDefs[researchId];
    if (!def) {
      addLog("找不到研究資料", "important");
      return false;
    }

    if (isResearchCompleted(researchId)) {
      addLog(`${def.name}已經研究完成`, "important");
      return false;
    }

    if (!meetsResearchRequirements(def)) {
      addLog(`${def.name}尚未達成研究條件。${getMissingRequirementText(def)}`, "important");
      return false;
    }

    if (state.currentResearch) {
      addLog(`目前已有研究進行中：${state.currentResearch.name}`, "important");
      return false;
    }

    state.currentResearch = {
      type: "research",
      id: researchId,
      name: def.name,
      remaining: Math.max(0.1, Number(def.duration) || 10),
      total: Math.max(0.1, Number(def.duration) || 10)
    };

    addLog(`開始研究：${def.name}`, "important");
    return true;
  }

  function startReading(bookId) {
    const def = books[bookId];
    if (!def) {
      addLog("找不到書籍資料", "important");
      return false;
    }

    if ((state.resources?.[bookId] || 0) < (def.consume || 1)) {
      addLog(`沒有可閱讀的${def.name}`, "important");
      return false;
    }

    if (state.currentResearch) {
      addLog(`目前已有研究進行中：${state.currentResearch.name}`, "important");
      return false;
    }

    state.resources[bookId] -= def.consume || 1;

    state.currentResearch = {
      type: "read",
      id: bookId,
      name: def.name,
      remaining: Math.max(0.1, Number(def.duration) || 10),
      total: Math.max(0.1, Number(def.duration) || 10)
    };

    addLog(`開始閱讀：${def.name}`, "important");
    return true;
  }

  function enqueueResearch(researchId) {
    const def = researchDefs[researchId];
    if (!def) return false;

    if (isResearchCompleted(researchId)) {
      addLog(`${def.name}已經研究完成`, "important");
      return false;
    }

    if (state.researchQueue.some((item) => item.type === "research" && item.id === researchId)) {
      addLog(`${def.name}已經在研究佇列中`, "important");
      return false;
    }

    state.researchQueue.push({
      type: "research",
      id: researchId,
      name: def.name,
      duration: Math.max(0.1, Number(def.duration) || 10)
    });

    addLog(`已加入研究佇列：${def.name}`, "important");
    return true;
  }

  function enqueueReading(bookId) {
    const def = books[bookId];
    if (!def) return false;

    state.researchQueue.push({
      type: "read",
      id: bookId,
      name: def.name,
      duration: Math.max(0.1, Number(def.duration) || 10)
    });

    addLog(`已加入閱讀佇列：${def.name}`, "important");
    return true;
  }

  function cancelCurrentResearch() {
    if (!state.currentResearch) {
      addLog("目前沒有進行中的研究", "important");
      return false;
    }

    addLog(`已取消：${state.currentResearch.name}`, "important");
    state.currentResearch = null;
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

  function tryStartNextQueuedResearch() {
    if (state.currentResearch || !state.researchQueue.length) return false;

    const next = state.researchQueue.shift();
    if (!next) return false;

    if (next.type === "research") {
      if (isResearchCompleted(next.id)) return false;
      return startResearch(next.id);
    }

    if (next.type === "read") {
      return startReading(next.id);
    }

    return false;
  }

  function finishCurrentResearch() {
    const current = state.currentResearch;
    if (!current) return false;

    state.currentResearch = null;

    if (current.type === "research") {
      completeResearch(current.id);
    } else if (current.type === "read") {
      const def = books[current.id];
      if (def) {
        state.intelligence = (state.intelligence || 0) + (def.intGain || 0);
        addLog(`讀完《${def.name}》，智力 +${def.intGain || 0}，主經驗 +${def.expGain || 0}`, "important");
      }
    }

    tryStartNextQueuedResearch();
    return true;
  }

  function updateResearch(deltaSeconds) {
    if (!state.currentResearch) {
      tryStartNextQueuedResearch();
      return;
    }

    state.currentResearch.remaining -= deltaSeconds;
    if (state.currentResearch.remaining <= 0) {
      finishCurrentResearch();
    }
  }

  return {
    isResearchCompleted,
    meetsResearchRequirements,
    getMissingRequirementText,
    startResearch,
    startReading,
    enqueueResearch,
    enqueueReading,
    cancelCurrentResearch,
    clearResearchQueue,
    updateResearch
  };
}
