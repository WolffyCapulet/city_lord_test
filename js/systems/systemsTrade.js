export function createTradeSystem({
  state,
  addLog,
  addManagementExp
}) {
  function expToNext(level) {
    return Math.round(5 + 2.5 * level * (level - 1));
  }

  function addTradeExp(amount) {
    state.tradeExp = Math.max(0, Number(state.tradeExp || 0) + Number(amount || 0));

    while (state.tradeExp >= expToNext(state.tradeLevel || 1)) {
      state.tradeExp -= expToNext(state.tradeLevel || 1);
      state.tradeLevel = Math.max(1, Number(state.tradeLevel || 1) + 1);
      addLog(`貿易等級提升到 Lv.${state.tradeLevel}`, "important");
    }
  }

  function addReputation(amount) {
    state.reputation = Math.max(
      0,
      +(Number(state.reputation || 0) + Number(amount || 0)).toFixed(2)
    );
  }

  function getReputationWorkerSpeedBonus() {
    return Math.min(0.25, Number(state.reputation || 0) * 0.002);
  }

  function getReputationExpBonus() {
    return Math.min(0.5, Number(state.reputation || 0) * 0.003);
  }

  function getReputationYieldBonus() {
    return Math.min(0.25, Number(state.reputation || 0) * 0.002);
  }

  function currentTaxIncome({
    effectiveWorkerWage,
    safetyValue
  }) {
    const workers = Array.isArray(state.workers) ? state.workers.length : 0;
    const wage = Number(effectiveWorkerWage?.() || 0);
    const safety = Number(safetyValue?.() || 0);

    const base = workers * wage * 0.1;
    const safetyBonus = 1 + safety * 0.01;

    return Math.floor(
      base *
      (1 + (Math.max(1, Number(state.castleLevel || 1)) - 1) * 0.03) *
      safetyBonus
    );
  }

  function claimTax() {
    const amount = Math.floor(Number(state.pendingTax || 0));
    if (amount <= 0) {
      addLog("目前沒有可領取的稅收", "important");
      return false;
    }

    state.pendingTax = 0;
    state.gold = Math.max(0, Number(state.gold || 0) + amount);

    const managementExp = Math.max(1, Math.floor(amount * 0.5));
    addManagementExp(managementExp);

    addLog(`已領取累積稅收 ${amount} 金，管理經驗 +${managementExp}`, "important");
    return true;
  }

  function updateTaxTimer({
    deltaSeconds,
    effectiveWorkerWage,
    safetyValue
  }) {
    if (!deltaSeconds || deltaSeconds <= 0) return;

    state._taxTimer = Number(state._taxTimer || 0) + deltaSeconds;

    while (state._taxTimer >= 60) {
      state._taxTimer -= 60;
      state.pendingTax = Math.max(
        0,
        Number(state.pendingTax || 0) + currentTaxIncome({ effectiveWorkerWage, safetyValue })
      );
    }
  }

  return {
    addTradeExp,
    addReputation,
    getReputationWorkerSpeedBonus,
    getReputationExpBonus,
    getReputationYieldBonus,
    currentTaxIncome,
    claimTax,
    updateTaxTimer
  };
}
