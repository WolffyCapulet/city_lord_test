export const housingDefs = {
  cabin: {
    id: "cabin",
    name: "小木屋",
    type: "housing",
    description: "提供基礎居住空間。",
    costs: {
      wood: 20,
      planks: 6,
      fiber: 4
    },
    buildTime: 12,
    housingGain: 2,
    safetyGain: 0,
    cityExpGain: 5,
    maxCount: 20
  },

  stoneHouse: {
    id: "stoneHouse",
    name: "中石屋",
    type: "housing",
    description: "提供更高的住房容量，耐久也更高。",
    costs: {
      stoneBrick: 16,
      planks: 10,
      glass: 4
    },
    buildTime: 20,
    housingGain: 5,
    safetyGain: 1,
    cityExpGain: 12,
    maxCount: 12
  },

  wall: {
    id: "wall",
    name: "城牆段",
    type: "defense",
    description: "提升城鎮安全值與城池經驗。",
    costs: {
      stoneBrick: 20,
      planks: 8
    },
    buildTime: 18,
    housingGain: 0,
    safetyGain: 4,
    cityExpGain: 15,
    maxCount: 999
  }
};

export const buildingDefs = {
  well: {
    id: "well",
    name: "水井",
    type: "utility",
    description: "提升休息與日常體力恢復效率。",
    unlockResearch: null,
    maxLevel: 5,
    baseCost: {
      stone: 20,
      planks: 4
    },
    costScale: 1.35,
    cityExpGain: 6,
    levelExpGain: 2,
    effects: {
      restRecoveryBonus: 0.08,
      passiveRecoveryBonus: 0.02
    },
    effectText: "休息回體與自然回體提升。"
  },

  waterChannel: {
    id: "waterChannel",
    name: "水渠",
    type: "farm",
    description: "基礎農業建築，縮短農田生長時間並微幅提高收成。",
    unlockResearch: "waterChannel",
    maxLevel: 5,
    baseCost: {
      stone: 12,
      planks: 6,
      dirt: 20
    },
    costScale: 1.35,
    cityExpGain: 8,
    levelExpGain: 2,
    effects: {
      cropGrowthBonus: 0.06,
      cropYieldBonus: 0.03
    },
    effectText: "農田生長加快，作物收成略增。"
  },

  library: {
    id: "library",
    name: "圖書室",
    type: "research",
    description: "提升研究與閱讀效率。",
    unlockResearch: "library",
    maxLevel: 5,
    baseCost: {
      planks: 14,
      paper: 8,
      glass: 6
    },
    costScale: 1.4,
    cityExpGain: 10,
    levelExpGain: 3,
    effects: {
      researchSpeedBonus: 0.08,
      readingSpeedBonus: 0.08
    },
    effectText: "研究與閱讀速度提升。"
  },

  mill: {
    id: "mill",
    name: "磨坊",
    type: "production",
    description: "強化研磨與粉末類配方效率。",
    unlockResearch: "mill",
    maxLevel: 5,
    baseCost: {
      planks: 16,
      stoneBrick: 12,
      fiber: 6
    },
    costScale: 1.4,
    cityExpGain: 8,
    levelExpGain: 2,
    effects: {
      grindingSpeedBonus: 0.1
    },
    effectText: "研磨配方製作時間縮短。"
  },

  windmill: {
    id: "windmill",
    name: "風車",
    type: "farm",
    description: "進一步提高種子返還，並強化磨坊效率。",
    unlockResearch: "windmill",
    maxLevel: 5,
    baseCost: {
      planks: 20,
      fiber: 10,
      stoneBrick: 10
    },
    costScale: 1.45,
    cityExpGain: 10,
    levelExpGain: 3,
    effects: {
      seedReturnBonus: 0.05,
      millEfficiencyBonus: 0.05
    },
    effectText: "種子返還提升，磨坊效率進一步強化。"
  },

  alchemyHut: {
    id: "alchemyHut",
    name: "煉金小屋",
    type: "production",
    description: "提升藥劑、粉末、肥料類製作效率。",
    unlockResearch: "alchemyHut",
    maxLevel: 5,
    baseCost: {
      planks: 14,
      glassBottle: 6,
      herb: 8
    },
    costScale: 1.4,
    cityExpGain: 10,
    levelExpGain: 3,
    effects: {
      alchemySpeedBonus: 0.1
    },
    effectText: "煉金與消耗品製作速度提升。"
  },

  blacksmith: {
    id: "blacksmith",
    name: "鐵匠鋪",
    type: "production",
    description: "提升冶煉、金屬工具製作效率。",
    unlockResearch: "blacksmith",
    maxLevel: 5,
    baseCost: {
      stoneBrick: 18,
      ironIngot: 4,
      planks: 10
    },
    costScale: 1.45,
    cityExpGain: 12,
    levelExpGain: 4,
    effects: {
      smeltingSpeedBonus: 0.1,
      toolCraftSpeedBonus: 0.1
    },
    effectText: "冶煉與金屬工具製作速度提升。"
  },

  tailorHut: {
    id: "tailorHut",
    name: "裁縫小屋",
    type: "production",
    description: "提升布料、衣服、漁網等製作效率。",
    unlockResearch: "tailorHut",
    maxLevel: 5,
    baseCost: {
      planks: 12,
      cottonCloth: 4,
      fiber: 8
    },
    costScale: 1.4,
    cityExpGain: 8,
    levelExpGain: 2,
    effects: {
      tailoringSpeedBonus: 0.1
    },
    effectText: "裁縫與布料加工速度提升。"
  },

  townCenter: {
    id: "townCenter",
    name: "城鎮中心",
    type: "core",
    description: "提升工人工作效率與商人到訪率。",
    unlockResearch: "townCenter",
    maxLevel: 5,
    baseCost: {
      stoneBrick: 24,
      planks: 16,
      glass: 8
    },
    costScale: 1.5,
    cityExpGain: 20,
    levelExpGain: 6,
    effects: {
      workerSpeedBonus: 0.06,
      merchantChanceBonus: 0.05
    },
    effectText: "工人效率提升，商人更常出現。"
  },

  ranch: {
    id: "ranch",
    name: "牧場",
    type: "farm",
    description: "提升繁殖速度與雞蛋等牧場產出。",
    unlockResearch: "ranch",
    maxLevel: 5,
    baseCost: {
      planks: 18,
      fiber: 10,
      stone: 12
    },
    costScale: 1.4,
    cityExpGain: 10,
    levelExpGain: 3,
    effects: {
      breedingSpeedBonus: 0.08,
      ranchYieldBonus: 0.05
    },
    effectText: "繁殖更快，牧場產量提升。"
  }
};

export const buildingOrder = [
  "well",
  "waterChannel",
  "library",
  "mill",
  "windmill",
  "alchemyHut",
  "blacksmith",
  "tailorHut",
  "townCenter",
  "ranch"
];

export const housingOrder = [
  "cabin",
  "stoneHouse",
  "wall"
];
