export const animalRarity = {
  chicken: "common",
  rabbit: "common",
  dairyCow: "common",
  bull: "common",
  boar: "uncommon",
  deer: "rare",
  wolf: "rare",
  brownBear: "epic",
  blackBear: "epic"
};

export const ranchRarityCaps = {
  common: 0.42,
  uncommon: 0.24,
  rare: 0.12,
  epic: 0.05
};

export const animalFeedDefs = {
  chicken: {
    id: "chicken",
    food: "wheat",
    amount: 1,
    label: "小麥",
    breedSeconds: 180,
    hatchChance: 1.0,
    eggFoodPerCycle: 1
  },

  rabbit: {
    id: "rabbit",
    food: "carrot",
    amount: 1,
    label: "蘿蔔",
    breedSeconds: 180,
    hatchChance: 0.95
  },

  dairyCow: {
    id: "dairyCow",
    food: "wheat",
    amount: 2,
    label: "小麥",
    breedSeconds: 210,
    hatchChance: 0.9
  },

  bull: {
    id: "bull",
    food: "wheat",
    amount: 2,
    label: "小麥",
    breedSeconds: 210,
    hatchChance: 0.9
  },

  boar: {
    id: "boar",
    food: "mushroom",
    amount: 2,
    label: "蘑菇",
    breedSeconds: 240,
    hatchChance: 0.75
  },

  deer: {
    id: "deer",
    food: "fiber",
    amount: 2,
    label: "纖維",
    breedSeconds: 300,
    hatchChance: 0.6
  },

  wolf: {
    id: "wolf",
    food: "rawMeat",
    amount: 2,
    label: "生肉",
    breedSeconds: 300,
    hatchChance: 0.52
  },

  brownBear: {
    id: "brownBear",
    food: "fish",
    amount: 3,
    label: "魚",
    breedSeconds: 360,
    hatchChance: 0.38
  },

  blackBear: {
    id: "blackBear",
    food: "fish",
    amount: 4,
    label: "魚",
    breedSeconds: 360,
    hatchChance: 0.32
  }
};

export function createInitialRanchData() {
  const data = {};
  Object.keys(animalFeedDefs).forEach((id) => {
    data[id] = {
      fed: 0,
      timer: 0,
      enabled: true
    };
  });
  return data;
}

export function getAnimalRarityLabel(rarity) {
  const map = {
    common: "普通",
    uncommon: "常見",
    rare: "稀有",
    epic: "珍稀"
  };

  return map[rarity] || "普通";
}
