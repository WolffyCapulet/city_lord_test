export const resourceLabels = {
  wood: "木頭",
  stone: "石頭",
  dirt: "泥土",
  sand: "沙子",
  copperOre: "銅礦",
  coal: "煤炭",
  ironOre: "鐵礦",
  silverOre: "銀礦",
  goldOre: "金礦",
  magnetite: "磁石",
  crystal: "水晶",
  gem: "寶石",
  coalPowder: "碳粉",
  copperPowder: "銅粉",
  ironPowder: "鐵粉",
  silverPowder: "銀粉",
  goldPowder: "金粉",
  magnetitePowder: "磁石粉",
  crystalPowder: "水晶粉",
  gemPowder: "寶石粉",
  herb: "草藥",
  rareHerb: "稀有藥草",
  mushroom: "蘑菇",
  branch: "樹枝",
  leaf: "樹葉",
  fiber: "纖維",
  ginseng: "人蔘",
  apple: "蘋果",
  wheat: "小麥",
  cotton: "棉花",
  carrot: "蘿蔔",
  wheatFlour: "小麥粉",
  bread: "麵包",
  cottonThread: "棉線",
  cottonCloth: "棉布",
  grassThread: "草線",
  grassCloth: "草布",
  boneMeal: "骨粉",
  compost: "肥料堆",
  wheatSeed: "小麥種子",
  mushroomSpore: "蘑菇菌種",
  appleSeed: "蘋果種子",
  cottonSeed: "棉花種子",
  carrotSeed: "蘿蔔種子",
  shellfish: "貝類",
  shell: "貝殼",
  clamMeat: "蛤肉",
  pearl: "珍珠",
  coral: "珊瑚",
  fish: "魚",
  shrimp: "蝦子",
  crab: "螃蟹",
  snail: "蝸牛",
  chicken: "雞",
  egg: "雞蛋",
  rawChicken: "生雞肉",
  feather: "羽毛",
  rabbit: "兔子",
  boar: "野豬",
  deer: "鹿",
  wolf: "野狼",
  brownBear: "棕熊",
  blackBear: "黑熊",
  rawMeat: "生肉",
  offal: "內臟",
  hide: "生皮",
  bone: "骨頭",
  boarTusk: "野豬牙",
  deerAntler: "鹿角",
  bearPaw: "熊掌",
  bearFang: "熊牙",
  planks: "木板",
  firewood: "柴火",
  stoneBrick: "石磚",
  brick: "磚塊",
  glass: "玻璃",
  glassBottle: "玻璃瓶",
  grilledMeat: "烤肉",
  grilledFish: "烤魚",
  grilledSausage: "烤香腸",
  bearStew: "燉熊掌",
  applePie: "蘋果派",
  herbTonic: "鞣劑",
  clamSoup: "海鮮湯",
  staminaPotion: "體力藥劑",
  paper: "紙張",
  ink: "墨水",
  note: "破舊筆記",
  manual: "入門教程",
  ironIngot: "鐵錠",
  copperIngot: "銅錠",
  leather: "皮革",
  softLeather: "柔軟皮革",
  clothes: "衣服",
  woodAxeTool: "木斧",
  woodPickTool: "木鎬",
  woodShovelTool: "木鏟",
  woodCarvingKnifeTool: "木刻刀",
  woodHammerTool: "木鎚子",
  woodPotTool: "木鍋子",
  woodHoeTool: "木鋤頭",
  woodPitchforkTool: "木草叉",
  woodFishingRodTool: "木釣竿",
  stoneAxeTool: "石斧",
  stonePickTool: "石鎬",
  shovelTool: "石鏟",
  stoneCarvingKnifeTool: "石刻木刀",
  stoneHammerTool: "石鎚子",
  stonePotTool: "石鍋子",
  stoneHoeTool: "石鋤頭",
  stonePitchforkTool: "石草叉",
  woodBowTool: "木弓",
  stoneBowTool: "石弓",
  copperBowTool: "銅弓",
  ironBowTool: "鐵弓",
  fishingRodTool: "石釣竿",
  fishNetTool: "魚網",
  copperAxeTool: "銅斧",
  copperShovelTool: "銅鏟",
  copperPickTool: "銅鎬",
  copperCarvingKnifeTool: "銅刻木刀",
  copperHammerTool: "銅鎚子",
  copperPotTool: "銅鍋子",
  copperHoeTool: "銅鋤頭",
  copperPitchforkTool: "銅草叉",
  copperFishingRodTool: "銅釣竿",
  ironAxeTool: "鐵斧",
  ironShovelTool: "鐵鏟",
  ironPickTool: "鐵鎬",
  ironCarvingKnifeTool: "鐵刻木刀",
  ironHammerTool: "鐵鎚子",
  ironPotTool: "鐵鍋子",
  ironHoeTool: "鐵鋤頭",
  ironPitchforkTool: "鐵草叉",
  ironFishingRodTool: "鐵釣竿",
  dairyCow: "乳牛",
  bull: "公牛",
  milk: "牛奶",
  cowHorn: "牛角",
  dictionary: "萬用字典"
};

export function getResourceLabel(id) {
  return resourceLabels[id] || id;
}

export const resourceGroupDefs = [
  { key: "food", title: "食物與飲品" },
  { key: "crops", title: "作物與種子" },
  { key: "herbsBooks", title: "草藥與文具" },
  { key: "materials", title: "基礎材料與礦物" },
  { key: "processed", title: "加工材料" },
  { key: "tools", title: "工具" },
  { key: "animals", title: "活體動物" },
  { key: "animalDrops", title: "獵物素材" },
  { key: "other", title: "其他" }
];

export const resourceUiText = {
  edible: "可食用",
  fuel: "燃料",
  edibleFuel: "可食/燃料",
  empty: "　"
};

const foodIds = new Set([
  "rawMeat",
  "rawChicken",
  "fish",
  "shrimp",
  "crab",
  "snail",
  "shellfish",
  "clamMeat",
  "egg",
  "milk",
  "apple",
  "wheat",
  "carrot",
  "mushroom",
  "grilledMeat",
  "grilledFish",
  "bread",
  "grilledSausage",
  "bearStew",
  "applePie",
  "clamSoup",
  "sashimi",
  "staminaPotion"
]);

const herbBookIds = new Set([
  "herb",
  "rareHerb",
  "ginseng",
  "paper",
  "ink",
  "note",
  "manual",
  "herbTonic"
]);

const cropSeedIds = new Set([
  "wheatSeed",
  "mushroomSpore",
  "appleSeed",
  "cottonSeed",
  "carrotSeed",
  "wheatSeedBundle",
  "cotton",
  "fiber"
]);

const basicMaterialIds = new Set([
  "wood",
  "stone",
  "dirt",
  "sand",
  "branch",
  "leaf",
  "coal",
  "copperOre",
  "ironOre",
  "silverOre",
  "goldOre",
  "magnetite",
  "crystal",
  "gem",
  "coalPowder",
  "copperPowder",
  "ironPowder",
  "silverPowder",
  "goldPowder",
  "magnetitePowder",
  "crystalPowder",
  "gemPowder"
]);

const animalIds = new Set([
  "chicken",
  "rabbit",
  "boar",
  "deer",
  "wolf",
  "brownBear",
  "blackBear",
  "dairyCow",
  "bull"
]);

const huntDropIds = new Set([
  "offal",
  "hide",
  "bone",
  "boarTusk",
  "deerAntler",
  "bearPaw",
  "bearFang",
  "feather",
  "shell",
  "pearl",
  "coral",
  "cowHorn"
]);

const processedIds = new Set([
  "planks",
  "firewood",
  "stoneBrick",
  "brick",
  "glass",
  "glassBottle",
  "wheatFlour",
  "boneMeal",
  "compost",
  "ironIngot",
  "copperIngot",
  "leather",
  "softLeather",
  "cottonThread",
  "cottonCloth",
  "grassThread",
  "grassCloth",
  "clothes"
]);

export function getResourceGroupKey(id) {
  if (foodIds.has(id)) return "food";
  if (cropSeedIds.has(id)) return "crops";
  if (herbBookIds.has(id)) return "herbsBooks";
  if (animalIds.has(id)) return "animals";
  if (huntDropIds.has(id)) return "animalDrops";
  if (processedIds.has(id)) return "processed";
  if (basicMaterialIds.has(id)) return "materials";

  if (id.endsWith("Tool")) return "tools";
  if (id.endsWith("Ore")) return "materials";
  if (id.endsWith("Powder")) return "materials";
  if (id.endsWith("Seed")) return "crops";
  if (id.endsWith("Ingot")) return "processed";

  return "other";
}

export const edibleValues = {
  rawMeat: -5,
  rawChicken: -5,
  fish: -5,
  grilledMeat: 10,
  grilledFish: 10,
  bread: 25,
  grilledSausage: 50,
  bearStew: 100,
  applePie: 50,
  clamSoup: 75
};

export const foodOrder = [
  "staminaPotion",
  "bearStew",
  "clamSoup",
  "grilledSausage",
  "applePie",
  "bread",
  "grilledMeat",
  "grilledFish",
  "rawChicken",
  "rawMeat",
  "fish"
];

export const fuelDurations = {
  leaf: 5,
  branch: 15,
  firewood: 60,
  coal: 180
};
