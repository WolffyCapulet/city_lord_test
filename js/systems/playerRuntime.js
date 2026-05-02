export function createPlayerRuntime({
  state,
  getExpToNext,
  skillLabels,
  logLimit = 100,
  nowTime = () => ""
}) {
  function addLog(text, type = "important") {
    if (!Array.isArray(state.logs)) state.logs = [];

    state.logs.unshift({
      time: nowTime(),
      text,
      type
    });

    state.logs = state.logs
      .filter((item) => item && item.text)
      .slice(0, logLimit);
  }

  function gainResource(id, amount) {
    if (!id) return;
    state.resources[id] = (state.resources[id] || 0) + amount;
  }

  function spendResource(id, amount) {
    if ((state.resources[id] || 0) < amount) return false;
    state.resources[id] -= amount;
    return true;
  }

  function canAfford(costs = {}) {
    return Object.entries(costs).every(([id, amount]) => {
      return (state.resources[id] || 0) >= amount;
    });
  }

  function spendCosts(costs = {}) {
    if (!canAfford(costs)) return false;

    Object.entries(costs).forEach(([id, amount]) => {
      state.resources[id] -= amount;
    });

    return true;
  }

  function addMainExp(amount) {
    state.exp += amount;

    while (state.exp >= getExpToNext(state.level)) {
      state.exp -= getExpToNext(state.level);
      state.level += 1;
      addLog(`主等級提升到 Lv.${state.level}`, "important");
    }
  }

  function addSkillExp(skillId, amount = 1) {
    if (!state.skills?.[skillId]) return;

    state.skills[skillId].exp += amount;

    while (state.skills[skillId].exp >= getExpToNext(state.skills[skillId].level)) {
      state.skills[skillId].exp -= getExpToNext(state.skills[skillId].level);
      state.skills[skillId].level += 1;
      addLog(
        `${skillLabels[skillId] || skillId} 等級提升到 Lv.${state.skills[skillId].level}`,
        "important"
      );
    }
  }

  function addTradeExp(amount) {
    const value = Math.max(0, Number(amount || 0));
    if (value <= 0) return;

    state.tradeExp = Math.max(0, Number(state.tradeExp || 0) + value);

    while (state.tradeExp >= getExpToNext(state.tradeLevel || 1)) {
      state.tradeExp -= getExpToNext(state.tradeLevel || 1);
      state.tradeLevel = Math.max(1, Number(state.tradeLevel || 1) + 1);
      addLog(`貿易等級提升到 Lv.${state.tradeLevel}`, "important");
    }
  }

  function addReputation(amount) {
    state.reputation = Math.max(
      0,
      +(Number(state.reputation || 0) + Number(amount || 0)).toFixed(1)
    );
  }

  return {
    addLog,
    gainResource,
    spendResource,
    canAfford,
    spendCosts,
    addMainExp,
    addSkillExp,
    addTradeExp,
    addReputation
  };
}
