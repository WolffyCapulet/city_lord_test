import { createMerchantSystem } from "./merchant.js";
import { renderMerchantArea } from "../ui/render/renderMerchantArea.js";

const DEFAULT_SELL_PRICES = {
  wood: 2,
  stone: 2,
  fish: 5,
  shrimp: 6,
  crab: 8,
  herb: 4,
  rareHerb: 16,
  mushroom: 5,
  leather: 14,
  softLeather: 26,
  cottonCloth: 14,
  clothes: 28,
  staminaPotion: 30,
  stoneBrick: 12,
  brick: 10,
  glassBottle: 16,
  boneMeal: 10,
  compost: 9
};

export function createMerchantRuntime({
  state,
  addLog,
  addTradeExp,
  addReputation,
  getResourceLabel,
  sellPrices = DEFAULT_SELL_PRICES
}) {
  const merchantSystem = createMerchantSystem({
    state,
    addLog,
    addTradeExp,
    addReputation,
    sellPrices
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

  function render() {
    renderMerchantArea({
      state,
      getResourceLabel,
      merchantSystem,
      onFulfillOrder: (orderId) => {
        fulfillOrder(orderId);
      },
      onCancelOrder: (orderId) => {
        cancelOrder(orderId);
      },
      onRefreshMerchant: () => {
        refreshMerchant();
      }
    });
  }

  return {
    merchantSystem,
    sellPrices,
    update,
    render,
    fulfillOrder,
    cancelOrder,
    refreshMerchant
  };
}
