// Housing - costs match old houseBuilds (with gold)
export const housingDefs = {
  cabin: {
    id: "cabin",
    name: "小木屋",
    type: "housing",
    description: "提供基礎居住空間。",
    gold: 20,
    costs: { planks: 10, stoneBrick: 4 },
    buildTime: 12,
    housingGain: 2,
    safetyGain: 0,
    cityExpGain: 5,
    maxCount: 10
  },
  stoneHouse: {
    id: "stoneHouse",
    name: "中石屋",
    type: "housing",
    description: "提供更高的住房容量，耐久也更高。",
    gold: 60,
    costs: { planks: 16, stoneBrick: 12, brick: 8 },
    buildTime: 20,
    housingGain: 5,
    safetyGain: 1,
    cityExpGain: 12,
    maxCount: 5
  },
  wall: {
    id: "wall",
    name: "城牆段",
    type: "defense",
    description: "提升城鎮安全值與城池經驗。",
    gold: 0,
    costs: { stoneBrick: 5, planks: 2, brick: 3 },
    buildTime: 10,
    housingGain: 0,
    safetyGain: 4,
    cityExpGain: 15,
    maxCount: 9999
  }
};

// Building upgrade cost function: cost(lv) = base + lv * scale
// Matches old game: cost:(lv)=>({gold: A+lv*B, resources:{...}})
export const buildingDefs = {
  well: {
    id: "well", name: "水井", type: "utility",
    description: "提升休息與日常體力恢復效率。",
    effectText: "體力恢復 +10% / 級",
    unlockResearch: null,
    maxLevel: 5,
    cityExpGain: 6, levelExpGain: 2,
    getCost: (lv) => ({ gold: 20 + lv * 25, resources: { stoneBrick: 4 + lv * 2, wood: 8 + lv * 4 } }),
    effects: { restRecoveryBonus: 0.10, passiveRecoveryBonus: 0.02 }
  },
  library: {
    id: "library", name: "圖書室", type: "research",
    description: "提升研究與閱讀效率。",
    effectText: "閱讀與研究速度 +15% / 級",
    unlockResearch: "libraryPlan",
    maxLevel: 5,
    cityExpGain: 10, levelExpGain: 3,
    getCost: (lv) => ({ gold: 30 + lv * 35, resources: { planks: 6 + lv * 3, stoneBrick: 3 + lv * 2 } }),
    effects: { researchSpeedBonus: 0.15, readingSpeedBonus: 0.15 }
  },
  mill: {
    id: "mill", name: "磨坊", type: "production",
    description: "強化研磨與粉末類配方效率。",
    effectText: "研磨類配方製作速度 +20% / 級",
    unlockResearch: "millPlan",
    maxLevel: 5,
    cityExpGain: 8, levelExpGain: 2,
    getCost: (lv) => ({ gold: 25 + lv * 30, resources: { planks: 8 + lv * 4, stoneBrick: 4 + lv * 2 } }),
    effects: { grindingSpeedBonus: 0.20 }
  },
  windmill: {
    id: "windmill", name: "風車", type: "farm",
    description: "提高種子返還，並使磨坊相關製作速度額外提升。",
    effectText: "提高種子返還，磨坊額外速度 +15% / 級",
    unlockResearch: "windmillPlan",
    maxLevel: 5,
    cityExpGain: 10, levelExpGain: 3,
    getCost: (lv) => ({ gold: 48 + lv * 42, resources: { planks: 10 + lv * 4, stoneBrick: 6 + lv * 3, wheatFlour: 3 + lv, glass: 1 + Math.floor(lv / 2) } }),
    effects: { seedReturnBonus: 0.05, millEfficiencyBonus: 0.15 }
  },
  alchemyHut: {
    id: "alchemyHut", name: "煉金小屋", type: "production",
    description: "提升煉金類製作效率。",
    effectText: "煉金速度 +20% / 級",
    unlockResearch: "alchemyHutPlan",
    maxLevel: 5,
    cityExpGain: 10, levelExpGain: 3,
    getCost: (lv) => ({ gold: 35 + lv * 35, resources: { planks: 6 + lv * 3, glassBottle: 1 + Math.floor(lv / 2), brick: 4 + lv * 2 } }),
    effects: { alchemySpeedBonus: 0.20 }
  },
  lumberMill: {
    id: "lumberMill", name: "伐木廠", type: "production",
    description: "提升伐木速度與技能經驗。",
    effectText: "伐木速度與伐木技能經驗 +10% / 級",
    unlockResearch: "lumberMillPlan",
    maxLevel: 5,
    cityExpGain: 8, levelExpGain: 2,
    getCost: (lv) => ({ gold: 25 + lv * 30, resources: { planks: 8 + lv * 4, stoneBrick: 3 + lv * 2 } }),
    effects: { lumberSpeedBonus: 0.10, lumberExpBonus: 0.10 }
  },
  quarry: {
    id: "quarry", name: "挖掘場", type: "production",
    description: "提升挖礦與挖掘速度及技能經驗。",
    effectText: "挖礦與挖掘速度與技能經驗 +10% / 級",
    unlockResearch: "quarryPlan",
    maxLevel: 5,
    cityExpGain: 8, levelExpGain: 2,
    getCost: (lv) => ({ gold: 30 + lv * 35, resources: { stoneBrick: 8 + lv * 3, planks: 4 + lv * 2 } }),
    effects: { miningSpeedBonus: 0.10, miningExpBonus: 0.10 }
  },
  fishingShack: {
    id: "fishingShack", name: "釣魚小屋", type: "production",
    description: "提升釣魚速度及技能經驗。",
    effectText: "釣魚速度與技能經驗 +10% / 級",
    unlockResearch: "fishingShackPlan",
    maxLevel: 5,
    cityExpGain: 8, levelExpGain: 2,
    getCost: (lv) => ({ gold: 25 + lv * 30, resources: { planks: 8 + lv * 4, stoneBrick: 2 + lv } }),
    effects: { fishingSpeedBonus: 0.10, fishingExpBonus: 0.10 }
  },
  smithy: {
    id: "smithy", name: "鐵匠鋪", type: "production",
    description: "提升冶煉與工具製作效率。",
    effectText: "冶煉與工具製作速度 +20% / 級",
    unlockResearch: "smithyPlan",
    maxLevel: 5,
    cityExpGain: 12, levelExpGain: 4,
    getCost: (lv) => ({ gold: 40 + lv * 40, resources: { stoneBrick: 8 + lv * 3, ironIngot: 1 + lv, planks: 4 + lv * 2 } }),
    effects: { smeltingSpeedBonus: 0.20, toolCraftSpeedBonus: 0.20 }
  },
  tannery: {
    id: "tannery", name: "裁縫小屋", type: "production",
    description: "提升布料、衣服與皮料加工效率。",
    effectText: "棉線、棉布、衣服與皮料加工速度 +20% / 級",
    unlockResearch: "tanneryPlan",
    maxLevel: 5,
    cityExpGain: 8, levelExpGain: 2,
    getCost: (lv) => ({ gold: 28 + lv * 34, resources: { planks: 6 + lv * 3, brick: 4 + lv * 2, hide: 2 + lv } }),
    effects: { tailoringSpeedBonus: 0.20 }
  },
  townCenter: {
    id: "townCenter", name: "城鎮中心", type: "core",
    description: "提升工人工作效率與商人到訪率。",
    effectText: "人民工作速度 +5% / 級，商人每分鐘到訪率 +1% / 級",
    unlockResearch: "townCenterPlan",
    maxLevel: 5,
    cityExpGain: 20, levelExpGain: 6,
    getCost: (lv) => ({ gold: 60 + lv * 50, resources: { stoneBrick: 10 + lv * 4, brick: 8 + lv * 3, planks: 8 + lv * 3, glass: 2 + lv } }),
    effects: { workerSpeedBonus: 0.05, merchantChanceBonus: 0.01 }
  },
  ranch: {
    id: "ranch", name: "牧場", type: "farm",
    description: "提升繁殖速度與雞蛋等牧場產出。",
    effectText: "牧場繁殖速度 +20% / 級，雞蛋產量增加",
    unlockResearch: "ranchPlan",
    maxLevel: 5,
    cityExpGain: 10, levelExpGain: 3,
    getCost: (lv) => ({ gold: 32 + lv * 36, resources: { planks: 8 + lv * 3, hide: 2 + lv, stoneBrick: 4 + lv * 2 } }),
    effects: { breedingSpeedBonus: 0.20, ranchYieldBonus: 0.05 }
  },
  waterChannel: {
    id: "waterChannel", name: "水渠", type: "farm",
    description: "縮短農田生長時間並提高作物產量。",
    effectText: "農田生長速度 +10% / 級，農作物產量 +5% / 級",
    unlockResearch: "waterChannelPlan",
    maxLevel: 5,
    cityExpGain: 8, levelExpGain: 2,
    getCost: (lv) => ({ gold: 22 + lv * 24, resources: { stone: 8 + lv * 3, wood: 6 + lv * 2, dirt: 10 + lv * 4 } }),
    effects: { cropGrowthBonus: 0.10, cropYieldBonus: 0.05 }
  }
};

export const buildingOrder = [
  "well", "waterChannel", "library", "mill", "windmill",
  "alchemyHut", "lumberMill", "quarry", "fishingShack",
  "smithy", "tannery", "townCenter", "ranch"
];

export const housingOrder = ["cabin", "stoneHouse", "wall"];
