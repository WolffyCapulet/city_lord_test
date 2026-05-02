import { createMerchantSystem } from "./merchant.js";
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

  // render is now called directly from renderApp with renderMerchantArea
  function render({ onAfterChange } = {}) {
    // No-op here; rendering is done externally by renderApp
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
