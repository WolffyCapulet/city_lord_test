export const books = {
  note: {
    id: "note",
    name: "破舊筆記",
    duration: 30,
    intGain: 1,
    expGain: 1,
    consume: 1
  },
  manual: {
    id: "manual",
    name: "入門教程",
    duration: 120,
    intGain: 5,
    expGain: 5,
    consume: 1
  }
};

export const researchDefs = {
  stoneAxe: {
    id: "stoneAxe",
    name: "石斧設計",
    category: "tool",
    intReq: 5,
    duration: 40,
    desc: "解鎖石斧製作。石斧在倉庫中時伐木產量 +20%，伐木速度 +10%",
    rewardInt: 1
  },

  shovel: {
    id: "shovel",
    name: "鏟子設計",
    category: "tool",
    intReq: 8,
    duration: 50,
    desc: "解鎖鏟子製作。鏟子在倉庫中時挖掘產量 +20%，挖掘速度 +10%",
    rewardInt: 1
  },

  fishingRod: {
    id: "fishingRod",
    name: "魚竿設計",
    category: "tool",
    intReq: 10,
    duration: 60,
    desc: "解鎖魚竿製作。魚竿在倉庫中時釣魚產量 +20%，釣魚速度 +10%",
    rewardInt: 2
  },

  stonePick: {
    id: "stonePick",
    name: "石鎬設計",
    category: "tool",
    intReq: 6,
    duration: 45,
    desc: "解鎖石鎬製作。石鎬可供挖礦工人使用。",
    rewardInt: 1
  },

  stoneKnife: {
    id: "stoneKnife",
    name: "石刻木刀設計",
    category: "tool",
    intReq: 6,
    duration: 45,
    desc: "解鎖石刻木刀製作。主要用於木工類製作。",
    rewardInt: 1
  },

  stoneHammer: {
    id: "stoneHammer",
    name: "石鎚子設計",
    category: "tool",
    intReq: 7,
    duration: 50,
    desc: "解鎖石鎚子製作。可供工匠使用。",
    rewardInt: 1
  },

  stonePot: {
    id: "stonePot",
    name: "石鍋子設計",
    category: "tool",
    intReq: 7,
    duration: 50,
    desc: "解鎖石鍋子製作。可供廚師使用。",
    rewardInt: 1
  },

  stoneHoe: {
    id: "stoneHoe",
    name: "石鋤頭設計",
    category: "tool",
    intReq: 7,
    duration: 50,
    desc: "解鎖石鋤頭製作。可供農夫使用。",
    rewardInt: 1
  },

  stonePitchfork: {
    id: "stonePitchfork",
    name: "石草叉設計",
    category: "tool",
    intReq: 7,
    duration: 50,
    desc: "解鎖石草叉製作。可供牧場工人使用。",
    rewardInt: 1
  },

  stoneBow: {
    id: "stoneBow",
    name: "石弓設計",
    category: "tool",
    intReq: 6,
    duration: 45,
    desc: "解鎖石弓製作。可供狩獵工人使用。",
    rewardInt: 1,
    unlockCraft: "stoneBowTool"
  },

  fishNet: {
    id: "fishNet",
    name: "魚網設計",
    category: "tool",
    intReq: 8,
    duration: 55,
    desc: "解鎖魚網製作。可供釣魚工人使用。",
    rewardInt: 1,
    unlockCraft: "fishNetTool"
  },

  copperAxe: {
    id: "copperAxe",
    name: "銅斧設計",
    category: "tool",
    intReq: 11,
    duration: 70,
    desc: "解鎖銅斧製作。",
    rewardInt: 2
  },

  copperPick: {
    id: "copperPick",
    name: "銅鎬設計",
    category: "tool",
    intReq: 11,
    duration: 70,
    desc: "解鎖銅鎬製作。",
    rewardInt: 2
  },

  copperShovel: {
    id: "copperShovel",
    name: "銅鏟設計",
    category: "tool",
    intReq: 11,
    duration: 70,
    desc: "解鎖銅鏟製作。",
    rewardInt: 2
  },

  copperKnife: {
    id: "copperKnife",
    name: "銅刻木刀設計",
    category: "tool",
    intReq: 11,
    duration: 70,
    desc: "解鎖銅刻木刀製作。主要用於木工類製作。",
    rewardInt: 2
  },

  copperHammer: {
    id: "copperHammer",
    name: "銅鎚子設計",
    category: "tool",
    intReq: 11,
    duration: 70,
    desc: "解鎖銅鎚子製作。",
    rewardInt: 2
  },

  copperPot: {
    id: "copperPot",
    name: "銅鍋子設計",
    category: "tool",
    intReq: 11,
    duration: 70,
    desc: "解鎖銅鍋子製作。",
    rewardInt: 2
  },

  copperHoe: {
    id: "copperHoe",
    name: "銅鋤頭設計",
    category: "tool",
    intReq: 11,
    duration: 70,
    desc: "解鎖銅鋤頭製作。",
    rewardInt: 2
  },

  copperPitchfork: {
    id: "copperPitchfork",
    name: "銅草叉設計",
    category: "tool",
    intReq: 11,
    duration: 70,
    desc: "解鎖銅草叉製作。",
    rewardInt: 2
  },

  copperFishingRod: {
    id: "copperFishingRod",
    name: "銅釣竿設計",
    category: "tool",
    intReq: 11,
    duration: 70,
    desc: "解鎖銅釣竿製作。",
    rewardInt: 2
  },

  copperBow: {
    id: "copperBow",
    name: "銅弓設計",
    category: "tool",
    intReq: 12,
    duration: 75,
    desc: "解鎖銅弓製作。",
    rewardInt: 2,
    unlockCraft: "copperBowTool"
  },

  ironAxe: {
    id: "ironAxe",
    name: "鐵斧設計",
    category: "tool",
    intReq: 14,
    duration: 90,
    desc: "解鎖鐵斧製作。",
    rewardInt: 3
  },

  ironPick: {
    id: "ironPick",
    name: "鐵鎬設計",
    category: "tool",
    intReq: 14,
    duration: 90,
    desc: "解鎖鐵鎬製作。",
    rewardInt: 3
  },

  ironShovel: {
    id: "ironShovel",
    name: "鐵鏟設計",
    category: "tool",
    intReq: 14,
    duration: 90,
    desc: "解鎖鐵鏟製作。",
    rewardInt: 3
  },

  ironKnife: {
    id: "ironKnife",
    name: "鐵刻木刀設計",
    category: "tool",
    intReq: 15,
    duration: 95,
    desc: "解鎖鐵刻木刀製作。主要用於木工類製作。",
    rewardInt: 3
  },

  ironHammer: {
    id: "ironHammer",
    name: "鐵鎚子設計",
    category: "tool",
    intReq: 15,
    duration: 95,
    desc: "解鎖鐵鎚子製作。",
    rewardInt: 3
  },

  ironPot: {
    id: "ironPot",
    name: "鐵鍋子設計",
    category: "tool",
    intReq: 15,
    duration: 95,
    desc: "解鎖鐵鍋子製作。",
    rewardInt: 3
  },

  ironHoe: {
    id: "ironHoe",
    name: "鐵鋤頭設計",
    category: "tool",
    intReq: 14,
    duration: 90,
    desc: "解鎖鐵鋤頭製作。",
    rewardInt: 3
  },

  ironPitchfork: {
    id: "ironPitchfork",
    name: "鐵草叉設計",
    category: "tool",
    intReq: 14,
    duration: 90,
    desc: "解鎖鐵草叉製作。",
    rewardInt: 3
  },

  ironFishingRod: {
    id: "ironFishingRod",
    name: "鐵釣竿設計",
    category: "tool",
    intReq: 15,
    duration: 95,
    desc: "解鎖鐵釣竿製作。",
    rewardInt: 3
  },

  ironBow: {
    id: "ironBow",
    name: "鐵弓設計",
    category: "tool",
    intReq: 15,
    duration: 95,
    desc: "解鎖鐵弓製作。",
    rewardInt: 3,
    unlockCraft: "ironBowTool"
  },

  autoMealPlan: {
    id: "autoMealPlan",
    name: "自動進食規劃",
    category: "quality",
    intReq: 9,
    duration: 70,
    desc: "解鎖玩家自動進食設定，可選擇低於幾%體力自動吃東西，以及指定要吃的食物。",
    rewardInt: 1
  },

  wellPlan: {
    id: "wellPlan",
    name: "水井藍圖",
    category: "building",
    intReq: 4,
    levelReq: 2,
    duration: 35,
    desc: "解鎖水井建造。",
    rewardInt: 1,
    unlockBuild: "well"
  },

  wallPlan: {
    id: "wallPlan",
    name: "城牆藍圖",
    category: "building",
    intReq: 6,
    levelReq: 3,
    duration: 45,
    desc: "解鎖城牆建造。",
    rewardInt: 1,
    unlockHouse: "wall",
    reqHouses: { cabin: 2 },
    reqBuildings: { well: 1 }
  },

  lumberMillPlan: {
    id: "lumberMillPlan",
    name: "伐木廠藍圖",
    category: "building",
    intReq: 7,
    levelReq: 4,
    duration: 50,
    desc: "解鎖伐木廠升級。",
    rewardInt: 1,
    unlockBuild: "lumberMill",
    reqHouses: { cabin: 2 },
    reqBuildings: { well: 1 }
  },

  fishingShackPlan: {
    id: "fishingShackPlan",
    name: "釣魚小屋藍圖",
    category: "building",
    intReq: 7,
    levelReq: 4,
    duration: 50,
    desc: "解鎖釣魚小屋升級。",
    rewardInt: 1,
    unlockBuild: "fishingShack",
    reqHouses: { cabin: 2 },
    reqBuildings: { well: 1 }
  },

  stoneHousePlan: {
    id: "stoneHousePlan",
    name: "中石屋藍圖",
    category: "building",
    intReq: 8,
    levelReq: 5,
    duration: 60,
    desc: "解鎖中石屋建造。",
    rewardInt: 2,
    unlockHouse: "stoneHouse",
    reqHouses: { cabin: 3, wall: 1 },
    reqBuildings: { well: 1 }
  },

  smithyPlan: {
    id: "smithyPlan",
    name: "鐵匠鋪藍圖",
    category: "building",
    intReq: 9,
    levelReq: 6,
    duration: 70,
    desc: "解鎖鐵匠鋪升級。",
    rewardInt: 2,
    unlockBuild: "smithy",
    reqHouses: { wall: 3 },
    reqBuildings: { well: 1 }
  },

  quarryPlan: {
    id: "quarryPlan",
    name: "挖掘場藍圖",
    category: "building",
    intReq: 9,
    levelReq: 6,
    duration: 70,
    desc: "解鎖挖掘場升級。",
    rewardInt: 2,
    unlockBuild: "quarry",
    reqHouses: { stoneHouse: 1, wall: 4 },
    reqBuildings: { well: 1 }
  },

  libraryPlan: {
    id: "libraryPlan",
    name: "圖書室藍圖",
    category: "building",
    intReq: 10,
    levelReq: 7,
    duration: 80,
    desc: "解鎖圖書室升級。",
    rewardInt: 2,
    unlockBuild: "library",
    reqHouses: { stoneHouse: 1, wall: 4 },
    reqBuildings: { well: 1 }
  },

  ranchPlan: {
    id: "ranchPlan",
    name: "牧場藍圖",
    category: "building",
    intReq: 10,
    levelReq: 7,
    duration: 75,
    desc: "解鎖牧場升級。",
    rewardInt: 2,
    unlockBuild: "ranch",
    reqHouses: { cabin: 4 },
    reqBuildings: { well: 1 }
  },

  waterChannelPlan: {
    id: "waterChannelPlan",
    name: "水渠藍圖",
    category: "building",
    intReq: 10,
    levelReq: 7,
    duration: 80,
    desc: "解鎖水渠建造。水渠能加快農田生長，並略微提高農作物產量。",
    rewardInt: 2,
    unlockBuild: "waterChannel",
    reqBuildings: { well: 1 },
    reqPlots: 3
  },

  millPlan: {
    id: "millPlan",
    name: "磨坊藍圖",
    category: "building",
    intReq: 11,
    levelReq: 8,
    duration: 85,
    desc: "解鎖磨坊升級。磨坊能提升小麥粉、骨粉、肥料堆與各類礦物粉末的製作效率。",
    rewardInt: 2,
    unlockBuild: "mill",
    reqBuildings: { well: 2, waterChannel: 1 },
    reqPlots: 4
  },

  windmillPlan: {
    id: "windmillPlan",
    name: "風車藍圖",
    category: "building",
    intReq: 13,
    levelReq: 10,
    duration: 110,
    desc: "解鎖風車建造。風車能提高種子返還，並強化磨坊效率。",
    rewardInt: 3,
    unlockBuild: "windmill",
    reqBuildings: { mill: 1, waterChannel: 1 },
    reqPlots: 6
  },

  tanneryPlan: {
    id: "tanneryPlan",
    name: "裁縫小屋藍圖",
    category: "building",
    intReq: 11,
    levelReq: 8,
    duration: 85,
    desc: "解鎖裁縫小屋升級。",
    rewardInt: 2,
    unlockBuild: "tannery",
    reqHouses: { stoneHouse: 1 },
    reqBuildings: { well: 1 }
  },

  alchemyHutPlan: {
    id: "alchemyHutPlan",
    name: "煉金小屋藍圖",
    category: "building",
    intReq: 12,
    levelReq: 9,
    duration: 95,
    desc: "解鎖煉金小屋升級。",
    rewardInt: 3,
    unlockBuild: "alchemyHut",
    reqBuildings: { library: 1 }
  },

  townCenterPlan: {
    id: "townCenterPlan",
    name: "城鎮中心藍圖",
    category: "building",
    intReq: 14,
    levelReq: 10,
    duration: 120,
    desc: "解鎖城鎮中心升級。",
    rewardInt: 3,
    unlockBuild: "townCenter",
    reqHouses: { stoneHouse: 2, wall: 6 },
    reqBuildings: { well: 2 }
  }
};

export const researchCategoryOrder = [
  "tool",
  "quality",
  "building"
];

export const researchOrder = Object.keys(researchDefs);
