import {
  orderTierMeta,
  merchantOrderPool,
  merchantDefaults,
  merchantRules
} from "../data/trade.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function createMerchantSystem({
  state,
  addLog,
  addTradeExp,
  addReputation,
  sellPrices
}) {
  if (!state.merchant || typeof state.merchant !== "object") {
    state.merchant = JSON.parse(JSON.stringify(merchantDefaults));
  }

  function getOrderTierMeta(tier) {
    return orderTierMeta[tier] || orderTierMeta.common;
  }

  function merchantChancePerMinute() {
    return clamp(
      merchantRules.baseChancePerMinute +
        (Math.max(1, Number(state.buildings?.townCenter || 0)) - 1) * merchantRules.townCenterChancePerLevel +
        (Math.max(1, Number(state.tradeLevel || 1)) - 1) * merchantRules.tradeLevelChancePerLevel +
        (Math.max(1, Number(state.castleLevel || 1)) - 1) * merchantRules.castleLevelChancePerLevel +
        (Number(state.safetyValue || 0)) * merchantRules.safetyChancePerPoint +
        (Number(state.reputation || 0)) * merchantRules.reputationChancePerPoint,
      merchantRules.minChancePerMinute,
      merchantRules.maxChancePerMinute
    );
  }

  function merchantCashPerVisit() {
    const base =
      merchantRules.baseCash +
      (Math.max(1, Number(state.tradeLevel || 1)) - 1) * merchantRules.tradeCashPerLevel +
      Math.floor(Number(state.reputation || 0) * merchantRules.reputationCashPerPoint) +
      Number(state.buildings?.townCenter || 0) * merchantRules.townCenterCashPerLevel +
      (Math.max(1, Number(state.castleLevel || 1)) - 1) * merchantRules.castleCashPerLevel +
      Math.floor(Number(state.safetyValue || 0) * merchantRules.safetyCashPerPoint);

    const factor =
      merchantRules.visitCashRandomMin +
      Math.random() * (merchantRules.visitCashRandomMax - merchantRules.visitCashRandomMin);

    return Math.max(80, Math.floor(base * factor));
  }

  function getMerchantOrderLimit() {
    return (
      merchantRules.baseOrderLimit +
      Math.floor(Math.max(1, Number(state.tradeLevel || 1)) / merchantRules.orderLimitEveryTradeLevels)
    );
  }

  function createMerchantOrder(fromMerchant = true) {
    const weighted = [];

    merchantOrderPool.forEach((item) => {
      const weight =
        item.tier === "epic" ? 5 :
        item.tier === "rare" ? 12 :
        20;

      for (let i = 0; i < weight; i++) weighted.push(item);
    });

    const pick = weighted[randInt(0, weighted.length - 1)];
    const qty = Math.max(1, randInt(pick.qty[0], pick.qty[1]));
    const baseSell = qty * (sellPrices[pick.resource] || 1);
    const meta = getOrderTierMeta(pick.tier);

    return {
      id: `ord${state.merchant.nextOrderId++}`,
      resource: pick.resource,
      qty,
      rewardGold: Math.max(Math.ceil(baseSell * meta.multiplier), baseSell + 5),
      rewardTrade: Math.max(0.2, meta.bonusTrade + baseSell),
      rewardRep: Math.max(0.1, meta.rep),
      tier: pick.tier,
      tierLabel: meta.label,
      from: fromMerchant ? "行腳商人" : "村民委託"
    };
  }

  function addMerchantOrders(count = 1) {
    let added = 0;
    const limit = getMerchantOrderLimit();

    for (let i = 0; i < count; i++) {
      if (state.merchant.orders.length >= limit) break;
      state.merchant.orders.push(createMerchantOrder(true));
      added++;
    }

    return added;
  }

  function fulfillMerchantOrder(orderId) {
    const idx = state.merchant.orders.findIndex((o) => o.id === orderId);
    if (idx < 0) return false;

    const order = state.merchant.orders[idx];
    const have = Math.floor(Number(state.resources?.[order.resource] || 0));

    if (have < order.qty) {
      addLog(`訂單材料不足，尚缺 ${order.qty - have}`, "important");
      return false;
    }

    state.resources[order.resource] -= order.qty;
    state.gold += order.rewardGold;

    addTradeExp(order.rewardTrade);
    addReputation(order.rewardRep);

    addLog(
      `完成訂單：${order.resource} ${order.qty}，獲得 ${order.rewardGold} 金、貿易經驗 ${order.rewardTrade}、聲望 ${order.rewardRep}`,
      "important"
    );

    state.merchant.orders.splice(idx, 1);
    return true;
  }

  function cancelMerchantOrder(orderId) {
    const idx = state.merchant.orders.findIndex((o) => o.id === orderId);
    if (idx < 0) return false;

    const [order] = state.merchant.orders.splice(idx, 1);
    addLog(`已取消訂單：${order.resource} ${order.qty}`, "important");
    return true;
  }

  function refreshMerchantVisit() {
    state.merchant.present = true;
    state.merchant.cash = merchantCashPerVisit();
    state.merchant.maxCash = state.merchant.cash;
    state.merchant.presentSec = 300;
    addMerchantOrders(2);

    addLog(`商人來訪，攜帶金額 ${state.merchant.cash}`, "important");
  }

  function updateMerchant(deltaSeconds) {
    state.merchant.minuteCounter += deltaSeconds;

    if (!state.merchant.present && state.merchant.minuteCounter >= 60) {
      state.merchant.minuteCounter = 0;

      if (Math.random() < merchantChancePerMinute()) {
        refreshMerchantVisit();
      }
    }

    if (state.merchant.present) {
      state.merchant.presentSec = Math.max(0, state.merchant.presentSec - deltaSeconds);

      if (state.merchant.presentSec <= 0) {
        state.merchant.present = false;
        state.merchant.cash = 0;
        addLog("商人離開了", "important");
      }
    }
  }

  return {
    getOrderTierMeta,
    merchantChancePerMinute,
    merchantCashPerVisit,
    getMerchantOrderLimit,
    createMerchantOrder,
    addMerchantOrders,
    fulfillMerchantOrder,
    cancelMerchantOrder,
    refreshMerchantVisit,
    updateMerchant
  };
}
