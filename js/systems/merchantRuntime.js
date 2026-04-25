import { createMerchantSystem } from "./merchant.js";
import { renderMerchantArea } from "../ui/render/renderMerchantArea.js";
import { sellPrices } from "../data/trade.js";

export function createMerchantRuntime({
  state,
  addLog,
  addTradeExp,
  addReputation,
  getResourceLabel,
  merchantSellPrices = sellPrices
}) {
  const merchantSystem = createMerchantSystem({
    state,
    addLog,
    addTradeExp,
    addReputation,
    sellPrices: merchantSellPrices
  });

  function fulfillOrder(orderId) {
    return merchantSystem.fulfillMerchantOrder(orderId);
  }

  function cancelOrder(orderId) {
    return merchantSystem.cancelMerchantOrder(orderId);
  }

  function refreshMerchant() {
    return merchantSystem.refreshMerchantVisit();
  }

  function update(deltaSeconds) {
    merchantSystem.updateMerchant(deltaSeconds);
  }

  function render({ onAfterChange } = {}) {
    renderMerchantArea({
      state,
      getResourceLabel,
      merchantSystem,
      onFulfillOrder: (orderId) => {
        fulfillOrder(orderId);
        onAfterChange?.();
      },
      onCancelOrder: (orderId) => {
        cancelOrder(orderId);
        onAfterChange?.();
      },
      onRefreshMerchant: () => {
        refreshMerchant();
        onAfterChange?.();
      }
    });
  }

  return {
    merchantSystem,
    sellPrices: merchantSellPrices,
    update,
    render,
    fulfillOrder,
    cancelOrder,
    refreshMerchant
  };
}
