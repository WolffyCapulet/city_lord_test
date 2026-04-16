export const orderTierMeta = {
  common: {
    id: "common",
    label: "普通",
    multiplier: 1.35,
    bonusTrade: 5,
    rep: 1
  },
  rare: {
    id: "rare",
    label: "進階",
    multiplier: 1.6,
    bonusTrade: 15,
    rep: 2
  },
  epic: {
    id: "epic",
    label: "高級",
    multiplier: 2.0,
    bonusTrade: 40,
    rep: 4
  }
};

export const merchantOrderPool = [
  { resource: "wood", tier: "common", qty: [20, 40] },
  { resource: "stone", tier: "common", qty: [18, 36] },
  { resource: "fish", tier: "common", qty: [8, 18] },
  { resource: "shrimp", tier: "common", qty: [8, 18] },
  { resource: "crab", tier: "rare", qty: [4, 10] },
  { resource: "herb", tier: "common", qty: [10, 20] },
  { resource: "rareHerb", tier: "rare", qty: [3, 8] },
  { resource: "mushroom", tier: "common", qty: [8, 18] },
  { resource: "leather", tier: "rare", qty: [4, 10] },
  { resource: "softLeather", tier: "epic", qty: [2, 6] },
  { resource: "cottonCloth", tier: "rare", qty: [3, 8] },
  { resource: "clothes", tier: "epic", qty: [1, 4] },
  { resource: "staminaPotion", tier: "epic", qty: [1, 4] },
  { resource: "stoneBrick", tier: "rare", qty: [8, 20] },
  { resource: "brick", tier: "rare", qty: [8, 20] },
  { resource: "glassBottle", tier: "rare", qty: [4, 10] },
  { resource: "boneMeal", tier: "common", qty: [3, 8] },
  { resource: "compost", tier: "common", qty: [3, 8] }
];

export const merchantDefaults = {
  minuteCounter: 0,
  present: false,
  presentSec: 0,
  cash: 0,
  maxCash: 0,
  storeFunds: 0,
  lastStoreInjection: 0,
  keep: {},
  orders: [],
  nextOrderId: 1
};

export const merchantRules = {
  baseChancePerMinute: 0.01,
  townCenterChancePerLevel: 0.01,
  tradeLevelChancePerLevel: 0.005,
  castleLevelChancePerLevel: 0.003,
  safetyChancePerPoint: 0.0008,
  reputationChancePerPoint: 0.0005,
  minChancePerMinute: 0.01,
  maxChancePerMinute: 0.6,

  baseCash: 120,
  tradeCashPerLevel: 40,
  reputationCashPerPoint: 6,
  townCenterCashPerLevel: 25,
  castleCashPerLevel: 25,
  safetyCashPerPoint: 8,

  visitCashRandomMin: 0.9,
  visitCashRandomMax: 1.1,

  baseOrderLimit: 3,
  orderLimitEveryTradeLevels: 5
};
