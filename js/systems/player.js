import { getMaxStamina } from "./stamina.js";

export function getExpToNext(level) {
  return 5 + (level - 1) * 3;
}

export function createPlayerSystem({
  state,
  addLog
}) {
  function addMainExp(amount) {
    state.exp += amount;

    while (state.exp >= getExpToNext(state.level)) {
      state.exp -= getExpToNext(state.level);
      state.level += 1;
      state.stamina = getMaxStamina(state);

      addLog(`主等級提升到 Lv.${state.level}，體力已回滿`, "important");
    }
  }

  function gainGold(amount, reason = "") {
    const value = Math.max(0, Number(amount) || 0);
    if (value <= 0) return;

    state.gold += value;

    if (reason) {
      addLog(`獲得金幣 ${value}（${reason}）`, "loot");
    }
  }

  function spendGold(amount) {
    const value = Math.max(0, Number(amount) || 0);
    if (value <= 0) return true;
    if (state.gold < value) return false;

    state.gold -= value;
    return true;
  }

  function resetPlayerState() {
    state.gold = 0;
    state.level = 1;
    state.exp = 0;
    state.stamina = getMaxStamina({ level: 1 });
  }

  return {
    addMainExp,
    gainGold,
    spendGold,
    resetPlayerState
  };
}
