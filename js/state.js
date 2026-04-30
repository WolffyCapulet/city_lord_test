const farmingDefs = {
  wheatSeed:{name:'小麥', duration:60, yields:{wheat:[12,18]}, skill:'farming', fixedSeedReturn:[1,3]},
  mushroomSpore:{name:'蘑菇', duration:75, yields:{mushroom:[5,8]}, skill:'farming', returnBase:0.25},
  appleSeed:{name:'蘋果樹', duration:180, yields:{apple:[4,8], wood:[2,4], branch:[3,6], leaf:[4,8]}, skill:'farming', returnBase:0.50},
  cottonSeed:{name:'棉花', duration:95, yields:{cotton:[6,10]}, skill:'farming', returnBase:0.32},
  carrotSeed:{name:'蘿蔔', duration:80, yields:{carrot:[8,12]}, skill:'farming', returnBase:0.35}
};

const buildingDefs = {
  well:{name:'水井', max:5, desc:'體力恢復 +10% / 級', cost:(lv)=>({gold:20+lv*25, resources:{stoneBrick:4+lv*2, wood:8+lv*4}})},
  library:{name:'圖書室', max:5, desc:'閱讀與研究速度 +15% / 級', cost:(lv)=>({gold:30+lv*35, resources:{planks:6+lv*3, stoneBrick:3+lv*2}})},
  mill:{name:'磨坊', max:5, desc:'研磨類配方製作速度 +20% / 級', cost:(lv)=>({gold:25+lv*30, resources:{planks:8+lv*4, stoneBrick:4+lv*2}})},
  alchemyHut:{name:'煉金小屋', max:5, desc:'煉金速度 +20% / 級', cost:(lv)=>({gold:35+lv*35, resources:{planks:6+lv*3, glassBottle:1+Math.floor(lv/2), brick:4+lv*2}})},
  lumberMill:{name:'伐木廠', max:5, desc:'伐木速度與伐木技能經驗 +10% / 級', cost:(lv)=>({gold:25+lv*30, resources:{planks:8+lv*4, stoneBrick:3+lv*2}})},
  quarry:{name:'挖掘場', max:5, desc:'挖礦與挖掘速度與技能經驗 +10% / 級', cost:(lv)=>({gold:30+lv*35, resources:{stoneBrick:8+lv*3, planks:4+lv*2}})},
  fishingShack:{name:'釣魚小屋', max:5, desc:'釣魚速度與技能經驗 +10% / 級', cost:(lv)=>({gold:25+lv*30, resources:{planks:8+lv*4, stoneBrick:2+lv}})},
  tannery:{name:'裁縫小屋', max:5, desc:'棉線、棉布、衣服與皮料加工速度 +20% / 級', cost:(lv)=>({gold:28+lv*34, resources:{planks:6+lv*3, brick:4+lv*2, hide:2+lv}})},
  smithy:{name:'鐵匠鋪', max:5, desc:'冶煉與工具製作速度 +20% / 級', cost:(lv)=>({gold:40+lv*40, resources:{stoneBrick:8+lv*3, ironIngot:1+lv, planks:4+lv*2}})},
  townCenter:{name:'城鎮中心', max:5, desc:'人民工作速度 +5% / 級，商人每分鐘到訪率 +1% / 級', cost:(lv)=>({gold:60+lv*50, resources:{stoneBrick:10+lv*4, brick:8+lv*3, planks:8+lv*3, glass:2+lv}})},
  ranch:{name:'牧場', max:5, desc:'牧場繁殖速度 +20% / 級，雞蛋產量增加', cost:(lv)=>({gold:32+lv*36, resources:{planks:8+lv*3, hide:2+lv, stoneBrick:4+lv*2}})},
  waterChannel:{name:'水渠', max:5, desc:'農田生長速度 +10% / 級，農作物產量 +5% / 級', cost:(lv)=>({gold:22+lv*24, resources:{stone:8+lv*3, wood:6+lv*2, dirt:10+lv*4}})},
  windmill:{name:'風車', max:5, desc:'提高種子返還，並使磨坊相關製作速度額外 +15% / 級', cost:(lv)=>({gold:48+lv*42, resources:{planks:10+lv*4, stoneBrick:6+lv*3, wheatFlour:3+lv, glass:1+Math.floor(lv/2)}})}
};


const researchDefs = {
  stoneAxe:{name:'石斧設計', category:'tool', intReq:5, duration:40, desc:'解鎖石斧製作。石斧在倉庫中時伐木產量 +20%，伐木速度 +10%', rewardInt:1},
  shovel:{name:'鏟子設計', category:'tool', intReq:8, duration:50, desc:'解鎖鏟子製作。鏟子在倉庫中時挖掘產量 +20%，挖掘速度 +10%', rewardInt:1},
  fishingRod:{name:'魚竿設計', category:'tool', intReq:10, duration:60, desc:'解鎖魚竿製作。魚竿在倉庫中時釣魚產量 +20%，釣魚速度 +10%', rewardInt:2},
  stonePick:{name:'石鎬設計', category:'tool', intReq:6, duration:45, desc:'解鎖石鎬製作。石鎬可供挖礦工人使用。', rewardInt:1},
  stoneKnife:{name:'石刻木刀設計', category:'tool', intReq:6, duration:45, desc:'解鎖石刻木刀製作。主要用於木工類製作。', rewardInt:1},
  stoneHammer:{name:'石鎚子設計', category:'tool', intReq:7, duration:50, desc:'解鎖石鎚子製作。可供工匠使用。', rewardInt:1},
  stonePot:{name:'石鍋子設計', category:'tool', intReq:7, duration:50, desc:'解鎖石鍋子製作。可供廚師使用。', rewardInt:1},
  stoneHoe:{name:'石鋤頭設計', category:'tool', intReq:7, duration:50, desc:'解鎖石鋤頭製作。可供農夫使用。', rewardInt:1},
  stonePitchfork:{name:'石草叉設計', category:'tool', intReq:7, duration:50, desc:'解鎖石草叉製作。可供牧場工人使用。', rewardInt:1},
  stoneBow:{name:'石弓設計', category:'tool', intReq:6, duration:45, desc:'解鎖石弓製作。可供狩獵工人使用。', rewardInt:1, unlockCraft:'stoneBowTool'},
  fishNet:{name:'魚網設計', category:'tool', intReq:8, duration:55, desc:'解鎖魚網製作。可供釣魚工人使用。', rewardInt:1, unlockCraft:'fishNetTool'},

  copperAxe:{name:'銅斧設計', category:'tool', intReq:11, duration:70, desc:'解鎖銅斧製作。', rewardInt:2},
  copperPick:{name:'銅鎬設計', category:'tool', intReq:11, duration:70, desc:'解鎖銅鎬製作。', rewardInt:2},
  copperShovel:{name:'銅鏟設計', category:'tool', intReq:11, duration:70, desc:'解鎖銅鏟製作。', rewardInt:2},
  copperKnife:{name:'銅刻木刀設計', category:'tool', intReq:11, duration:70, desc:'解鎖銅刻木刀製作。主要用於木工類製作。', rewardInt:2},
  copperHammer:{name:'銅鎚子設計', category:'tool', intReq:11, duration:70, desc:'解鎖銅鎚子製作。', rewardInt:2},
  copperPot:{name:'銅鍋子設計', category:'tool', intReq:11, duration:70, desc:'解鎖銅鍋子製作。', rewardInt:2},
  copperHoe:{name:'銅鋤頭設計', category:'tool', intReq:11, duration:70, desc:'解鎖銅鋤頭製作。', rewardInt:2},
  copperPitchfork:{name:'銅草叉設計', category:'tool', intReq:11, duration:70, desc:'解鎖銅草叉製作。', rewardInt:2},
  copperFishingRod:{name:'銅釣竿設計', category:'tool', intReq:11, duration:70, desc:'解鎖銅釣竿製作。', rewardInt:2},
  copperBow:{name:'銅弓設計', category:'tool', intReq:12, duration:75, desc:'解鎖銅弓製作。', rewardInt:2, unlockCraft:'copperBowTool'},
  ironAxe:{name:'鐵斧設計', category:'tool', intReq:14, duration:90, desc:'解鎖鐵斧製作。', rewardInt:3},
  ironPick:{name:'鐵鎬設計', category:'tool', intReq:14, duration:90, desc:'解鎖鐵鎬製作。', rewardInt:3},
  ironShovel:{name:'鐵鏟設計', category:'tool', intReq:14, duration:90, desc:'解鎖鐵鏟製作。', rewardInt:3},
  ironKnife:{name:'鐵刻木刀設計', category:'tool', intReq:15, duration:95, desc:'解鎖鐵刻木刀製作。主要用於木工類製作。', rewardInt:3},
  ironHammer:{name:'鐵鎚子設計', category:'tool', intReq:15, duration:95, desc:'解鎖鐵鎚子製作。', rewardInt:3},
  ironPot:{name:'鐵鍋子設計', category:'tool', intReq:15, duration:95, desc:'解鎖鐵鍋子製作。', rewardInt:3},
  ironHoe:{name:'鐵鋤頭設計', category:'tool', intReq:14, duration:90, desc:'解鎖鐵鋤頭製作。', rewardInt:3},
  ironPitchfork:{name:'鐵草叉設計', category:'tool', intReq:14, duration:90, desc:'解鎖鐵草叉製作。', rewardInt:3},
  ironFishingRod:{name:'鐵釣竿設計', category:'tool', intReq:15, duration:95, desc:'解鎖鐵釣竿製作。', rewardInt:3},
  ironBow:{name:'鐵弓設計', category:'tool', intReq:15, duration:95, desc:'解鎖鐵弓製作。', rewardInt:3, unlockCraft:'ironBowTool'},
  autoMealPlan:{name:'自動進食規劃', category:'quality', intReq:9, duration:70, desc:'解鎖玩家自動進食設定，可選擇低於幾%體力自動吃東西，以及指定要吃的食物。', rewardInt:1},

  wellPlan:{name:'水井藍圖', category:'building', intReq:4, duration:35, desc:'解鎖水井建造。', rewardInt:1, unlockBuild:'well', levelReq:2},
  wallPlan:{name:'城牆藍圖', category:'building', intReq:6, duration:45, desc:'解鎖城牆建造。', rewardInt:1, unlockHouse:'wall', levelReq:3, reqHouses:{cabin:2}, reqBuildings:{well:1}},
  lumberMillPlan:{name:'伐木廠藍圖', category:'building', intReq:7, duration:50, desc:'解鎖伐木廠升級。', rewardInt:1, unlockBuild:'lumberMill', levelReq:4, reqHouses:{cabin:2}, reqBuildings:{well:1}},
  fishingShackPlan:{name:'釣魚小屋藍圖', category:'building', intReq:7, duration:50, desc:'解鎖釣魚小屋升級。', rewardInt:1, unlockBuild:'fishingShack', levelReq:4, reqHouses:{cabin:2}, reqBuildings:{well:1}},
  stoneHousePlan:{name:'中石屋藍圖', category:'building', intReq:8, duration:60, desc:'解鎖中石屋建造。', rewardInt:2, unlockHouse:'stoneHouse', levelReq:5, reqHouses:{cabin:3, wall:1}, reqBuildings:{well:1}},
  smithyPlan:{name:'鐵匠鋪藍圖', category:'building', intReq:9, duration:70, desc:'解鎖鐵匠鋪升級。', rewardInt:2, unlockBuild:'smithy', levelReq:6, reqHouses:{wall:3}, reqBuildings:{well:1}},
  quarryPlan:{name:'挖掘場藍圖', category:'building', intReq:9, duration:70, desc:'解鎖挖掘場升級。', rewardInt:2, unlockBuild:'quarry', levelReq:6, reqHouses:{stoneHouse:1, wall:4}, reqBuildings:{well:1}},
  libraryPlan:{name:'圖書室藍圖', category:'building', intReq:10, duration:80, desc:'解鎖圖書室升級。', rewardInt:2, unlockBuild:'library', levelReq:7, reqHouses:{stoneHouse:1, wall:4}, reqBuildings:{well:1}},
  ranchPlan:{name:'牧場藍圖', category:'building', intReq:10, duration:75, desc:'解鎖牧場升級。', rewardInt:2, unlockBuild:'ranch', levelReq:7, reqHouses:{cabin:4}, reqBuildings:{well:1}},
  waterChannelPlan:{name:'水渠藍圖', category:'building', intReq:10, duration:80, desc:'解鎖水渠建造。水渠能加快農田生長，並略微提高農作物產量。', rewardInt:2, unlockBuild:'waterChannel', levelReq:7, reqBuildings:{well:1}, reqPlots:3},
  millPlan:{name:'磨坊藍圖', category:'building', intReq:11, duration:85, desc:'解鎖磨坊升級。磨坊能提升小麥粉、骨粉、肥料堆與各類礦物粉末的製作效率。', rewardInt:2, unlockBuild:'mill', levelReq:8, reqBuildings:{well:2, waterChannel:1}, reqPlots:4},
  windmillPlan:{name:'風車藍圖', category:'building', intReq:13, duration:110, desc:'解鎖風車建造。風車能提高種子返還，並強化磨坊效率。', rewardInt:3, unlockBuild:'windmill', levelReq:10, reqBuildings:{mill:1, waterChannel:1}, reqPlots:6},
  tanneryPlan:{name:'裁縫小屋藍圖', category:'building', intReq:11, duration:85, desc:'解鎖裁縫小屋升級。', rewardInt:2, unlockBuild:'tannery', levelReq:8, reqHouses:{stoneHouse:1}, reqBuildings:{well:1}},
  alchemyHutPlan:{name:'煉金小屋藍圖', category:'building', intReq:12, duration:95, desc:'解鎖煉金小屋升級。', rewardInt:3, unlockBuild:'alchemyHut', levelReq:9, reqBuildings:{library:1}},
  townCenterPlan:{name:'城鎮中心藍圖', category:'building', intReq:14, duration:120, desc:'解鎖城鎮中心升級。', rewardInt:3, unlockBuild:'townCenter', levelReq:10, reqHouses:{stoneHouse:2, wall:6}, reqBuildings:{well:2}}
};

const castleExpBase = {
  cabin:5, stoneHouse:12, wall:15,
  well:6, library:10, mill:8, alchemyHut:10, lumberMill:8, quarry:8, fishingShack:8, tannery:8, smithy:12, townCenter:20, ranch:10, waterChannel:6, windmill:12
};
const castleExpUpgrade = {
  cabin:2, stoneHouse:4, wall:5,
  well:2, library:3, mill:2, alchemyHut:3, lumberMill:2, quarry:2, fishingShack:2, tannery:2, smithy:4, townCenter:6, ranch:3, waterChannel:2, windmill:4
};
const houseBuildBaseCaps = { cabin:10, stoneHouse:5, wall:9999 };
const ranchRarityCaps = { common:0.42, uncommon:0.24, rare:0.12, epic:0.05 };
const animalRarity = { chicken:'common', rabbit:'common', dairyCow:'common', bull:'common', boar:'uncommon', deer:'rare', wolf:'rare', brownBear:'epic', blackBear:'epic' };
const animalFeedDefs = {
  chicken:{food:'wheat', amount:1, label:'小麥', breedSeconds:180, hatchChance:1.00, eggFoodPerCycle:1},
  rabbit:{food:'carrot', amount:1, label:'蘿蔔', breedSeconds:180, hatchChance:0.95},
  dairyCow:{food:'wheat', amount:2, label:'小麥', breedSeconds:210, hatchChance:0.90},
  bull:{food:'wheat', amount:2, label:'小麥', breedSeconds:210, hatchChance:0.90},
  boar:{food:'mushroom', amount:2, label:'蘑菇', breedSeconds:240, hatchChance:0.75},
  deer:{food:'fiber', amount:2, label:'纖維', breedSeconds:300, hatchChance:0.60},
  wolf:{food:'rawMeat', amount:2, label:'生肉', breedSeconds:300, hatchChance:0.52},
  brownBear:{food:'fish', amount:3, label:'魚', breedSeconds:360, hatchChance:0.38},
  blackBear:{food:'fish', amount:4, label:'魚', breedSeconds:360, hatchChance:0.32}
};
function createInitialRanchData(){
  const data = {};
  Object.keys(animalFeedDefs).forEach(id => data[id] = {fed:0, timer:0, enabled:true});
  return data;
}
const townStageDefs = [
  {name:'荒地', minLevel:1, reqHouses:{}, reqBuildings:{}},
  {name:'小村落', minLevel:2, reqHouses:{cabin:2, wall:1}, reqBuildings:{well:1}},
  {name:'聚居地', minLevel:4, reqHouses:{cabin:4, wall:3}, reqBuildings:{well:1}},
  {name:'村莊', minLevel:6, reqHouses:{cabin:5, stoneHouse:1, wall:6}, reqBuildings:{well:2}},
  {name:'商業聚落', minLevel:8, reqHouses:{stoneHouse:2, wall:8}, reqBuildings:{well:2, townCenter:1}},
  {name:'城鎮', minLevel:10, reqHouses:{stoneHouse:3, wall:12}, reqBuildings:{townCenter:1, smithy:1, library:1}},
  {name:'商業中心', minLevel:13, reqHouses:{stoneHouse:4, wall:16}, reqBuildings:{townCenter:2, mill:1, waterChannel:1}},
  {name:'城池', minLevel:16, reqHouses:{wall:24}, reqBuildings:{townCenter:3, smithy:2, library:1, windmill:1}}
];


function expToNext(level){ return Math.round(5 + 2.5 * level * (level - 1)); }
function clamp(n,min,max){ return Math.min(max, Math.max(min,n)); }
function toFiniteNumber(value, fallback=0){
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function roll(chance){ return Math.random()<chance; }
function nowTime(){ const d=new Date(); return `[${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}]`; }
function jobDisplayName(job){
  const extra = {idle:'待命', farming:'農務', crafting:'工匠', cook:'廚師', ranch:'牧場'};
  if(extra[job]) return extra[job];
  return workDefs[job] ? workDefs[job].name : job;
}

function createInitialState(){
  const skills = {};
  Object.keys(skillLabels).forEach(k => skills[k] = {level:1, exp:0});
  return {
    gold:0, level:1, exp:0, intelligence:0,
    stamina:100, staminaLevel:1, staminaExp:0,
    managementLevel:1, managementExp:0,
    castleLevel:1, castleExp:0,
    tradeLevel:1, tradeExp:0, reputation:0,
    pendingTax:0,
    campfireSec:0, isResting:false, autoWork:null, autoWorkCount:0, workQueue:[], autoCraft:null, autoCraftInfinite:false, craftQueue:[], craftRepeat:false, productionAction:null, craftAction:null, researchAction:null, researchQueue:[], playerAction:null, autoResting:false, autoRestResume:null, craftPausedForStamina:false, craftPausedName:'',
    staminaPotionBuff:0, staminaPotionCooldown:0,
    nextWorkerId:1, workers:[], salaryTimer:300, salaryDebt:0,
    craftYieldCarry:{},
    houses:{cabin:0, stoneHouse:0, wall:0},
    buildings:{well:0, library:0, mill:0, alchemyHut:0, lumberMill:0, quarry:0, fishingShack:0, tannery:0, smithy:0, townCenter:0, ranch:0, waterChannel:0, windmill:0},
    research:Object.fromEntries(Object.keys(researchDefs).map(k=>[k,false])),
    ui:{researchTab:'available', hideCompletedResearch:false, craftQueueExpanded:false, logTab:'important', mainPage:'production', shopTab:'all', smithyTab:'ingot', manualSeedSelection:'wheatSeed', farmerSeedPreference:'auto', playerAutoEatThreshold:0, playerAutoEatFood:'auto', shopBuyQty:{}, shopSellQty:{}},
    merchant:{minuteCounter:0, present:false, presentSec:0, cash:0, maxCash:0, storeFunds:0, lastStoreInjection:0, keep:{}, orders:[], nextOrderId:1},
    farmerAutoFertilize:false,
    ranchData:createInitialRanchData(),
    plots:[null,null,null],
    logs:[{time:nowTime(), text:'開始遊戲。你是剛起步的城主。', type:'important'}],
    resources:Object.fromEntries(Object.keys(resourceLabels).map(k=>[k,0])),
    skills
  };
}

function getLoadCandidates(){
  const keys = [STORAGE_KEY, STORAGE_KEY_LEGACY, ...LEGACY_STORAGE_KEYS];
  return [...new Set(keys)];
}

function unwrapSaveData(parsed){
  if(!parsed || typeof parsed !== 'object') return null;
  if(parsed && typeof parsed === 'object' && parsed.data && typeof parsed.data === 'object'){
    return {
      data: parsed.data,
      meta: {
        schemaVersion: parsed.schemaVersion || 1,
        savedAt: parsed.savedAt || null,
        gameVersion: parsed.gameVersion || null,
        sourceKey: parsed.sourceKey || null
      }
    };
  }
  return {
    data: parsed,
    meta: { schemaVersion: 1, savedAt: null, gameVersion: null, sourceKey: null }
  };
}

function migrateLoadedState(data, meta={}){
  const migrated = JSON.parse(JSON.stringify(data));
  if(typeof migrated.saveSchemaVersion !== 'number') migrated.saveSchemaVersion = meta.schemaVersion || 1;
  if(!migrated.meta || typeof migrated.meta !== 'object') migrated.meta = {};
  if(meta.sourceKey) migrated.meta.lastLoadedFrom = meta.sourceKey;
  if(!Array.isArray(migrated.workers) && Array.isArray(migrated.workerList)) migrated.workers = migrated.workerList;
  if(!Array.isArray(migrated.plots)){
    if(Array.isArray(migrated.fields)) migrated.plots = migrated.fields;
    else if(Array.isArray(migrated.farmPlots)) migrated.plots = migrated.farmPlots;
  }
  return migrated;
}

function getSaveTimestamp(unwrapped){
  if(!unwrapped || !unwrapped.data || typeof unwrapped.data !== 'object') return 0;
  const metaSavedAt = Number(unwrapped.meta && unwrapped.meta.savedAt);
  const dataSavedAt = Number(unwrapped.data && unwrapped.data.meta && unwrapped.data.meta.lastSavedAt);
  if(Number.isFinite(metaSavedAt) && metaSavedAt > 0) return metaSavedAt;
  if(Number.isFinite(dataSavedAt) && dataSavedAt > 0) return dataSavedAt;
  return 0;
}

function loadGame(){
  try{
    let best = null;
    for(const key of getLoadCandidates()){
      const raw = localStorage.getItem(key);
      if(!raw) continue;
      try{
        const parsed = JSON.parse(raw);
        const unwrapped = unwrapSaveData(parsed);
        if(!unwrapped || !unwrapped.data || typeof unwrapped.data !== 'object') continue;
        unwrapped.meta.sourceKey = key;
        unwrapped.meta.detectedSavedAt = getSaveTimestamp(unwrapped);
        if(!best || unwrapped.meta.detectedSavedAt > best.meta.detectedSavedAt){
          best = unwrapped;
        }
      }catch(err){
        console.warn('讀取存檔失敗:', key, err);
      }
    }
    return best ? migrateLoadedState(best.data, best.meta) : null;
  }catch(err){
    console.warn('讀取存檔失敗:', err);
    return null;
  }
}

const state = loadGame() || createInitialState();
normalizeState(state);
applyV060Migration(state);
if(state.meta && state.meta.lastLoadedFrom && state.meta.lastLoadedFrom !== 'new'){
  const sourceName = state.meta.lastLoadedFrom === STORAGE_KEY ? '共用存檔' : `舊版存檔（${state.meta.lastLoadedFrom}）`;
  if(!Array.isArray(state.logs)) state.logs = [];
  state.logs.unshift({time:nowTime(), text:`已載入${sourceName}。`, type:'important'});
  if(state.meta.housingRecovered){
    state.logs.unshift({time:nowTime(), text:'已自動修復住房容量。', type:'important'});
    state.meta.housingRecovered = false;
  }
  state.logs = state.logs.slice(0, 220);
}
let lastTick = performance.now();
let allResourcesOpen = true;
let resourceOpenState = {};
let merchantUiInteractionUntil = 0;
function markMerchantUiInteraction(ms=1200){
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  merchantUiInteractionUntil = Math.max(merchantUiInteractionUntil, now + ms);
}
function isMerchantUiInteractionLocked(){
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const root = document.getElementById('merchantArea');
  const hovering = !!(root && root.matches && root.matches(':hover'));
  const focused = !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('#merchantArea'));
  return hovering || focused || now < merchantUiInteractionUntil;
}

function normalizeState(s){
  if(typeof s.saveSchemaVersion !== 'number') s.saveSchemaVersion = SAVE_SCHEMA_VERSION;
  else s.saveSchemaVersion = Math.max(s.saveSchemaVersion, SAVE_SCHEMA_VERSION);
  if(!s.meta || typeof s.meta !== 'object') s.meta = {};
  if(typeof s.meta.lastSavedAt !== 'number') s.meta.lastSavedAt = Date.now();
  if(typeof s.meta.lastSavedGameVersion !== 'string') s.meta.lastSavedGameVersion = GAME_VERSION;
  if(typeof s.meta.lastLoadedFrom !== 'string') s.meta.lastLoadedFrom = 'new';

  s.gold = toFiniteNumber(s.gold, 0);
  s.level = Math.max(1, Math.floor(toFiniteNumber(s.level, 1)));
  s.exp = toFiniteNumber(s.exp, 0);
  s.intelligence = toFiniteNumber(s.intelligence, 0);
  s.staminaLevel = Math.max(1, Math.floor(toFiniteNumber(s.staminaLevel, 1)));
  s.staminaExp = toFiniteNumber(s.staminaExp, 0);
  s.stamina = toFiniteNumber(s.stamina, 100);
  s.managementLevel = Math.max(1, Math.floor(toFiniteNumber(s.managementLevel, 1)));
  s.castleLevel = Math.max(1, Math.floor(toFiniteNumber(s.castleLevel, 1)));
  s.castleExp = Math.max(0, toFiniteNumber(s.castleExp, 0));
  s.managementExp = toFiniteNumber(s.managementExp, 0);
  s.tradeLevel = Math.max(1, Math.floor(toFiniteNumber(s.tradeLevel, 1)));
  s.tradeExp = toFiniteNumber(s.tradeExp, 0);
  s.reputation = Math.max(0, toFiniteNumber(s.reputation, 0));
  s.campfireSec = Math.max(0, toFiniteNumber(s.campfireSec, 0));
  s.salaryTimer = Math.max(0, toFiniteNumber(s.salaryTimer, 300));
  s.salaryDebt = Math.max(0, Math.floor(toFiniteNumber(s.salaryDebt, 0)));
  s.pendingTax = Math.max(0, Math.floor(toFiniteNumber(s.pendingTax, 0)));
  s.nextWorkerId = Math.max(1, Math.floor(toFiniteNumber(s.nextWorkerId, 1)));
  s.isResting = !!s.isResting;

  if(!s.houses) s.houses = {cabin:0, stoneHouse:0, wall:0};
  s.houses.cabin = Math.max(0, Math.floor(toFiniteNumber(s.houses.cabin, 0)));
  s.houses.stoneHouse = Math.max(0, Math.floor(toFiniteNumber(s.houses.stoneHouse, 0)));
  s.houses.wall = Math.max(0, Math.floor(toFiniteNumber(s.houses.wall, 0)));
  if(!Number.isFinite(Number(s.castleLevel)) || !Number.isFinite(Number(s.castleExp)) || (toFiniteNumber(s.castleLevel,1) === 1 && toFiniteNumber(s.castleExp,0) === 0 && s.houses.wall > 0)){
    let totalCastleExp = Math.max(0, Math.floor(toFiniteNumber(s.castleTotalExp, 0)));
    if(totalCastleExp <= 0) totalCastleExp = s.houses.wall * 10;
    let level = 1;
    while(totalCastleExp >= expToNext(level)){
      totalCastleExp -= expToNext(level);
      level++;
    }
    s.castleLevel = level;
    s.castleExp = totalCastleExp;
  }

  if(!s.buildings) s.buildings = {well:0, library:0, mill:0, alchemyHut:0, lumberMill:0, quarry:0, fishingShack:0, tannery:0, smithy:0, townCenter:0, ranch:0, waterChannel:0, windmill:0};
  Object.keys({well:0, library:0, mill:0, alchemyHut:0, lumberMill:0, quarry:0, fishingShack:0, tannery:0, smithy:0, townCenter:0, ranch:0, waterChannel:0, windmill:0}).forEach(k => {
    s.buildings[k] = Math.max(0, Math.floor(toFiniteNumber(s.buildings[k], 0)));
  });

  if(!s.research || typeof s.research !== 'object') s.research = {};
  Object.keys(researchDefs).forEach(k => { s.research[k] = !!s.research[k]; });
  if(!s.ui || typeof s.ui !== 'object') s.ui = {};
  if(typeof s.ui.researchTab !== 'string') s.ui.researchTab = 'available';
  if(typeof s.ui.hideCompletedResearch !== 'boolean') s.ui.hideCompletedResearch = false;
  if(typeof s.ui.craftQueueExpanded !== 'boolean') s.ui.craftQueueExpanded = false;
  if(typeof s.ui.logTab !== 'string') s.ui.logTab = 'important';
  if(typeof s.ui.mainPage !== 'string') s.ui.mainPage = 'production';
  if(typeof s.ui.shopTab !== 'string') s.ui.shopTab = 'all';
  if(typeof s.ui.smithyTab !== 'string') s.ui.smithyTab = 'ingot';
  if(!s.ui.shopBuyQty || typeof s.ui.shopBuyQty !== 'object') s.ui.shopBuyQty = {};
  if(!s.ui.shopSellQty || typeof s.ui.shopSellQty !== 'object') s.ui.shopSellQty = {};
  if(typeof s.ui.manualSeedSelection !== 'string' || !farmingDefs[s.ui.manualSeedSelection]) s.ui.manualSeedSelection = 'wheatSeed';
  if(typeof s.ui.farmerSeedPreference !== 'string' || (s.ui.farmerSeedPreference !== 'auto' && !farmingDefs[s.ui.farmerSeedPreference])) s.ui.farmerSeedPreference = 'auto';
  if(typeof s.ui.workQueueExpanded !== 'boolean') s.ui.workQueueExpanded = false;
  if(typeof s.ui.researchQueueExpanded !== 'boolean') s.ui.researchQueueExpanded = false;
  if(typeof s.ui.workQueueExpanded !== 'boolean') s.ui.workQueueExpanded = false;
  if(typeof s.ui.researchQueueExpanded !== 'boolean') s.ui.researchQueueExpanded = false;


  Object.entries(researchDefs).forEach(([key, def]) => {
    if(def.unlockBuild && s.buildings && toFiniteNumber(s.buildings[def.unlockBuild], 0) > 0) s.research[key] = true;
    if(def.unlockHouse && s.houses && toFiniteNumber(s.houses[def.unlockHouse], 0) > 0) s.research[key] = true;
  });

  if(!Array.isArray(s.plots)) s.plots = [null,null,null];
  s.farmerAutoFertilize = !!s.farmerAutoFertilize;
  if(!s.ranchData || typeof s.ranchData !== 'object') s.ranchData = createInitialRanchData();
  Object.keys(animalFeedDefs).forEach(id => {
    if(!s.ranchData[id] || typeof s.ranchData[id] !== 'object') s.ranchData[id] = {fed:0, timer:0, enabled:true};
    s.ranchData[id].fed = Math.max(0, Math.floor(toFiniteNumber(s.ranchData[id].fed, 0)));
    s.ranchData[id].timer = Math.max(0, toFiniteNumber(s.ranchData[id].timer, 0));
    if(typeof s.ranchData[id].enabled !== 'boolean') s.ranchData[id].enabled = true;
  });
  if(!Array.isArray(s.workers)) s.workers = [];
  if(typeof s.autoResting !== 'boolean') s.autoResting = false;
  if(typeof s.autoRestResume !== 'string' && s.autoRestResume !== null) s.autoRestResume = null;
  if(typeof s.autoCraft !== 'string' && s.autoCraft !== null) s.autoCraft = null;
  if(typeof s.autoWorkCount !== 'number') s.autoWorkCount = (s.autoWork ? -1 : 0);
  s.autoWorkCount = Math.floor(toFiniteNumber(s.autoWorkCount, s.autoWork ? -1 : 0));
  if(!Array.isArray(s.workQueue)) s.workQueue = [];
  s.workQueue = s.workQueue.map(item => typeof item === 'string' ? ({id:item,count:1,infinite:false}) : ({id:item.id,count:Math.max(1,Math.floor(toFiniteNumber(item.count,1))),infinite:!!item.infinite})).filter(item => item.id);
  if(typeof s.craftRepeat !== 'boolean') s.craftRepeat = false;
  if(!Array.isArray(s.craftQueue)) s.craftQueue = [];
  s.craftQueue = s.craftQueue.map(item => typeof item === 'string' ? ({id:item,count:1}) : ({id:item.id,count:isInfiniteCraftCount(item.count) ? 9999 : Math.max(1,Math.floor(toFiniteNumber(item.count,1)))})).filter(item => item.id);
  sanitizeCraftInfiniteState(s);
  if(!Array.isArray(s.researchQueue)) s.researchQueue = [];
  s.researchQueue = s.researchQueue.map(item => ({kind:item.kind || 'research', id:item.id, count:Math.max(1,Math.floor(toFiniteNumber(item.count,1)))})).filter(item => item.id);
  if(!s.merchant || typeof s.merchant !== 'object') s.merchant = {minuteCounter:0, present:false, presentSec:0, cash:0, maxCash:0, storeFunds:0, lastStoreInjection:0, keep:{}, orders:[], nextOrderId:1};
  s.merchant.minuteCounter = Math.max(0, toFiniteNumber(s.merchant.minuteCounter, 0));
  s.merchant.present = !!s.merchant.present;
  s.merchant.presentSec = Math.max(0, toFiniteNumber(s.merchant.presentSec, 0));
  s.merchant.cash = Math.max(0, Math.floor(toFiniteNumber(s.merchant.cash, 0)));
  s.merchant.maxCash = Math.max(s.merchant.cash, Math.floor(toFiniteNumber(s.merchant.maxCash, s.merchant.cash)));
  s.merchant.storeFunds = Math.max(0, Math.floor(toFiniteNumber(s.merchant.storeFunds, s.merchant.cash)));
  s.merchant.lastStoreInjection = Math.max(0, Math.floor(toFiniteNumber(s.merchant.lastStoreInjection, s.merchant.maxCash)));
  if(!s.merchant.keep || typeof s.merchant.keep !== 'object') s.merchant.keep = {};
  if(!Array.isArray(s.merchant.orders)) s.merchant.orders = [];
  s.merchant.orders = s.merchant.orders.filter(o=>o && o.id && o.resource && Number.isFinite(Number(o.qty)) && Number.isFinite(Number(o.rewardGold))).map(o=>({
    id:o.id,
    resource:o.resource,
    qty:Math.max(1,Math.floor(toFiniteNumber(o.qty,1))),
    rewardGold:Math.max(1,Math.floor(toFiniteNumber(o.rewardGold,1))),
    rewardTrade:Math.max(0.2,toFiniteNumber(o.rewardTrade,0.2)),
    rewardRep:Math.max(0.1,toFiniteNumber(o.rewardRep,0.1)),
    from:o.from || '商人',
    tier:o.tier || 'common',
    tierLabel:o.tierLabel || getOrderTierMeta(o.tier || 'common').label
  }));
  s.merchant.nextOrderId = Math.max(1, Math.floor(toFiniteNumber(s.merchant.nextOrderId, 1)));

  if((s.houses.cabin + s.houses.stoneHouse + s.houses.wall) === 0 && Array.isArray(s.logs) && s.logs.length){
    const joined = s.logs.join('\\n');
    const countMatches = (pattern) => (joined.match(pattern) || []).length;
    s.houses.cabin = countMatches(/完成建築：小木屋/g);
    s.houses.stoneHouse = countMatches(/完成建築：中石屋/g);
    s.houses.wall = countMatches(/完成建築：城牆段/g);
  }
  const currentCap = s.houses.cabin * 2 + s.houses.stoneHouse * 5;
  if(Array.isArray(s.workers) && currentCap < s.workers.length){
    const missingCap = s.workers.length - currentCap;
    s.houses.cabin += Math.ceil(missingCap / 2);
    if(!s.meta.housingRecovered) s.meta.housingRecovered = true;
  }

  if(s.playerAction && !s.productionAction && !s.craftAction && !s.researchAction){
    if(s.playerAction.type === 'work') s.productionAction = s.playerAction;
    else if(s.playerAction.type === 'craft') s.craftAction = s.playerAction;
    else if(s.playerAction.type === 'read' || s.playerAction.type === 'research') s.researchAction = s.playerAction;
  }
  if(!s.productionAction || typeof s.productionAction !== 'object') s.productionAction = null;
  if(!s.craftAction || typeof s.craftAction !== 'object') s.craftAction = null;
  if(!s.researchAction || typeof s.researchAction !== 'object') s.researchAction = null;
  s.playerAction = null;
  ['productionAction','craftAction','researchAction'].forEach(key => {
    const a = s[key];
    if(!a) return;
    a.remaining = Math.max(0, toFiniteNumber(a.remaining, 0));
    a.total = Math.max(0.01, toFiniteNumber(a.total, 0.01));
    if(typeof a.id !== 'string') s[key] = null;
  });

  s.workers.forEach(w => {
    w.id = Math.max(1, Math.floor(toFiniteNumber(w.id, 1)));
    w.remaining = Math.max(0, toFiniteNumber(w.remaining, 15));
    w.switchCooldown = Math.max(0, toFiniteNumber(w.switchCooldown, 0));
    if(w.job === 'artisan') w.job = 'crafting';
    if(!w.job) w.job = 'idle';
    w.maxStamina = Math.max(20, toFiniteNumber(w.maxStamina, 30));
    w.stamina = clamp(toFiniteNumber(w.stamina, w.maxStamina), 0, w.maxStamina);
    if(typeof w.toolId !== 'string') w.toolId = '';
    w.toolDurability = Math.max(0, toFiniteNumber(w.toolDurability, 0));
    if(typeof w.clothesEquipped !== 'boolean') w.clothesEquipped = false;
    w.clothesDurability = Math.max(0, toFiniteNumber(w.clothesDurability, 0));
    if(typeof w.toolPreference !== 'string') w.toolPreference = 'auto';
    if(typeof w.foodPreference !== 'string') w.foodPreference = 'auto';
    if(typeof w.craftRecipe !== 'string') w.craftRecipe = 'plank';
    if(typeof w.cookRecipe !== 'string') w.cookRecipe = 'auto';
    if(typeof w.farmSeedPreference !== 'string') w.farmSeedPreference = 'auto';
  });

  if(!s.skills) s.skills = {};
  if(!s.skills.gathering){
    const forest = s.skills.forest || {level:1, exp:0};
    const shore = s.skills.shore || {level:1, exp:0};
    s.skills.gathering = { level: Math.max(toFiniteNumber(forest.level,1), toFiniteNumber(shore.level,1)), exp: toFiniteNumber(forest.exp,0) + toFiniteNumber(shore.exp,0) };
  }
  Object.keys(skillLabels).forEach(k => {
    if(!s.skills[k] || typeof s.skills[k] !== 'object') s.skills[k] = {level:1, exp:0};
    s.skills[k].level = Math.max(1, Math.floor(toFiniteNumber(s.skills[k].level, 1)));
    s.skills[k].exp = toFiniteNumber(s.skills[k].exp, 0);
  });

  if(!s.craftYieldCarry || typeof s.craftYieldCarry !== 'object') s.craftYieldCarry = {};

  if(!s.resources) s.resources = {};
  Object.keys(resourceLabels).forEach(k => { s.resources[k] = Math.max(0, toFiniteNumber(s.resources[k], 0)); });

  if(!Array.isArray(s.logs)) s.logs = [];
  s.logs = s.logs.map(item => {
    if(typeof item === 'string'){
      const parts = item.split(' ');
      const time = parts.shift() || nowTime();
      return {time, text:parts.join(' '), type:inferLogType(parts.join(' '))};
    }
    return {time:item.time || nowTime(), text:item.text || '', type:item.type || inferLogType(item.text || '')};
  });
  const fixedMaxStamina = 100 + (s.staminaLevel - 1) * 10;
  s.stamina = clamp(s.stamina, 0, fixedMaxStamina);
  autoCullExcessAnimals(false);
}

