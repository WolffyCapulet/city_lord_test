function inferLogType(text){
  if(/^(工人 #|工人製作完成|工人收成|工人分解|工人開啟|工匠 #|廚師 #)/.test(text)) return 'worker';
  if(/(研究完成|商人|布告|稅收|讀完《|等級提升|城池等級提升|主等級提升|體力等級提升|管理等級提升|貿易等級提升)/.test(text)) return 'important';
  if(/(打工完成|伐木完成|挖礦完成|釣魚完成|狩獵完成|森林採集完成|海邊採集完成|挖掘完成|你收成了|你種下了|你使用了|製作.*完成|獲得：|打開了貝類|分解|完成了)/.test(text)) return 'loot';
  return 'important';
}
function addLog(text, rerender=true, type=null){
  const entry = {time:nowTime(), text, type:type || inferLogType(text)};
  state.logs.unshift(entry);
  state.logs = state.logs.slice(0, 260);
  if(state._suspendRender) rerender = false;
  if(rerender) render();
}
function buildSaveEnvelope(){
  state.saveSchemaVersion = SAVE_SCHEMA_VERSION;
  state.meta.lastSavedAt = Date.now();
  state.meta.lastSavedGameVersion = GAME_VERSION;
  const snapshot = JSON.parse(JSON.stringify(state));
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    gameVersion: GAME_VERSION,
    savedAt: state.meta.lastSavedAt,
    sourceKey: STORAGE_KEY,
    data: snapshot
  };
}

function saveGame(){
  const envelope = buildSaveEnvelope();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  localStorage.setItem(STORAGE_KEY_LEGACY, JSON.stringify(envelope.data));
  addLog('已存檔。', false);
  render();
}


function maxStamina(){ return 100 + (state.staminaLevel - 1) * 10; }
function getRestEfficiencyBonus(){ return Math.min(0.60, (state.staminaLevel - 1) * 0.02); }
function getFoodEffectivenessBonus(){ return Math.min(0.40, (state.staminaLevel - 1) * 0.01); }
function getStaminaPotionRegenBonus(){ return state.staminaPotionBuff > 0 ? 0.50 : 0; }
const workerFoodPriority = ['rawChicken','grilledFish','grilledMeat','bread','clamSoup','applePie','grilledSausage','bearStew'];
const workerFoodReserve = { rawChicken:0, bread:4, clamSoup:4, applePie:3, grilledFish:6, grilledMeat:6, grilledSausage:4, bearStew:2 };

const toolDurabilityMap = {
  woodAxeTool:10, woodPickTool:10, woodShovelTool:10, woodCarvingKnifeTool:10, woodHammerTool:10, woodPotTool:10, woodHoeTool:10, woodPitchforkTool:10, woodFishingRodTool:10,
  stoneAxeTool:25, stonePickTool:25, shovelTool:25, stoneCarvingKnifeTool:25, stoneHammerTool:25, stonePotTool:25, stoneHoeTool:25, stonePitchforkTool:25,
  woodBowTool:10, stoneBowTool:25, copperBowTool:50, ironBowTool:100,
  fishingRodTool:25, fishNetTool:25,
  copperAxeTool:50, copperShovelTool:50, copperPickTool:50, copperCarvingKnifeTool:50, copperHammerTool:50, copperPotTool:50, copperHoeTool:50, copperPitchforkTool:50, copperFishingRodTool:50,
  ironAxeTool:100, ironShovelTool:100, ironPickTool:100, ironCarvingKnifeTool:100, ironHammerTool:100, ironPotTool:100, ironHoeTool:100, ironPitchforkTool:100, ironFishingRodTool:100,
  clothes:100
};
function getToolOptionsForJob(job){
  const map = {
    lumber:['ironAxeTool','copperAxeTool','stoneAxeTool','woodAxeTool'],
    mining:['ironPickTool','copperPickTool','stonePickTool','woodPickTool'],
    fishing:['fishNetTool','ironFishingRodTool','copperFishingRodTool','fishingRodTool','woodFishingRodTool'],
    hunting:['ironBowTool','copperBowTool','stoneBowTool','woodBowTool'],
    forest:[],
    shore:[],
    digging:['ironShovelTool','copperShovelTool','shovelTool','woodShovelTool'],
    farming:['ironHoeTool','copperHoeTool','stoneHoeTool','woodHoeTool'],
    crafting:['ironHammerTool','copperHammerTool','stoneHammerTool','woodHammerTool'],
    cook:['ironPotTool','copperPotTool','stonePotTool','woodPotTool'],
    ranch:['ironPitchforkTool','copperPitchforkTool','stonePitchforkTool','woodPitchforkTool']
  };
  return map[job] || [];
}
function getToolDisplayName(id){ return resourceLabels[id] || '工具'; }
function getToolDurabilityMax(id){ return toolDurabilityMap[id] || 0; }
function getWorkerToolRequirementText(job){
  const options = getToolOptionsForJob(job);
  if(!options.length) return '此工作不需要工具';
  return options.map(getToolDisplayName).join(' / ');
}
function getOrderedToolOptions(worker, job){
  const options = [...getToolOptionsForJob(job)];
  const pref = worker && worker.toolPreference;
  if(pref && pref !== 'auto' && options.includes(pref)) return [pref, ...options.filter(id => id !== pref)];
  return options;
}
function getWorkerFoodChoices(){
  return workerFoodPriority.filter(id => getWorkerFoodRecovery(id) > 0);
}
function getWorkerFoodReserve(item){
  return Math.max(0, Math.floor(toFiniteNumber(workerFoodReserve[item], 0)));
}

function getWorkerStaminaCost(job){
  const def = workDefs[job];
  if(def) return def.staminaCost || 2;
  if(job === 'crafting') return 2;
  if(job === 'cook') return 2;
  if(job === 'farming') return 2;
  if(job === 'ranch') return 2;
  return 1;
}
function getWorkerFoodRecovery(item){
  if(item === 'staminaPotion') return 0;
  const value = edibleValues[item];
  if(typeof value !== 'number' || value <= 0) return 0;
  return value;
}
function getPlayerAutoEatThreshold(){
  return state.research.autoMealPlan ? Math.max(0, Math.min(95, Math.floor(toFiniteNumber(state.ui.playerAutoEatThreshold, 0)))) : 0;
}
function getPlayerAutoEatFood(){
  const key = state.ui.playerAutoEatFood;
  return key === 'auto' || getWorkerFoodChoices().includes(key) ? key : 'auto';
}
function getPlayerAutoEatChoices(){
  return getWorkerFoodChoices();
}
function choosePlayerAutoEatFood(){
  let choices = getPlayerAutoEatChoices().filter(id => (state.resources[id] || 0) > 0);
  const pref = getPlayerAutoEatFood();
  if(pref !== 'auto') choices = choices.filter(id => id === pref);
  if(!choices.length) return '';
  choices.sort((a,b) => getWorkerFoodRecovery(a) - getWorkerFoodRecovery(b));
  return choices[0] || '';
}
function runPlayerAutoEat(){
  const threshold = getPlayerAutoEatThreshold();
  if(threshold <= 0) return false;
  if(maxStamina() <= 0) return false;
  if((state.stamina / maxStamina()) * 100 > threshold) return false;
  const item = choosePlayerAutoEatFood();
  if(!item) return false;
  if(!spendResource(item, 1)) return false;
  const value = edibleValues[item] || 0;
  const actual = value >= 0 ? restoreStamina(value, true) : (()=>{ const before = state.stamina; state.stamina = clamp(state.stamina + value, 0, maxStamina()); return state.stamina - before; })();
  addLog(`自動進食：使用${resourceLabels[item]}，體力變化 ${actual >= 0 ? '+' : ''}${actual.toFixed(1)}。`, false, 'important');
  return true;
}
function openPlayerAutoEatSettings(){
  if(!state.research.autoMealPlan){ addLog('尚未研究自動進食規劃。'); return; }
  const threshold = getPlayerAutoEatThreshold();
  const food = getPlayerAutoEatFood();
  openChoiceModal({
    title:'玩家自動進食設定',
    desc:`目前設定：${threshold > 0 ? `體力低於 ${threshold}% 時自動進食` : '關閉'}\n食物選擇：${food === 'auto' ? '自動' : resourceLabels[food]}`,
    options:[
      {label:'設定觸發門檻', onSelect:()=>openChoiceModal({ title:'自動進食門檻', desc:'選擇玩家體力低於多少百分比時自動進食。', options:[0,25,40,60,80].map(v => ({ label:`${v === 0 ? '關閉' : `${v}%`}${threshold === v ? ' ✓' : ''}`, onSelect:()=>{ state.ui.playerAutoEatThreshold = v; render(); } })) }) , closeOnSelect:false},
      {label:'設定食物', onSelect:()=>openChoiceModal({ title:'自動進食食物', desc:'選擇玩家自動進食時優先使用的食物。', options:[ {label:`自動${food === 'auto' ? ' ✓' : ''}`, onSelect:()=>{ state.ui.playerAutoEatFood = 'auto'; render(); }}, ...getPlayerAutoEatChoices().map(id => ({ label:`${resourceLabels[id]}（庫存 ${format(state.resources[id] || 0)}）${food === id ? ' ✓' : ''}`, onSelect:()=>{ state.ui.playerAutoEatFood = id; render(); } })) ] }), closeOnSelect:false}
    ]
  });
}
function equipWorkerTool(worker){
  const options = getOrderedToolOptions(worker, worker.job);
  for(const toolId of options){
    if((state.resources[toolId] || 0) > 0){
      spendResource(toolId,1);
      worker.toolId = toolId;
      worker.toolDurability = toolDurabilityMap[toolId] || 40;
      addLog(`工人 #${worker.id} 裝備了${resourceLabels[toolId]}。`, false, 'worker');
      return true;
    }
  }
  return options.length === 0;
}
function equipWorkerClothes(worker){
  if(worker.clothesEquipped && worker.clothesDurability > 0) return true;
  if((state.resources.clothes || 0) > 0){
    spendResource('clothes',1);
    worker.clothesEquipped = true;
    worker.clothesDurability = toolDurabilityMap.clothes;
    addLog(`工人 #${worker.id} 穿上了衣服。`, false, 'worker');
    return true;
  }
  return false;
}
function workerEatIfNeeded(worker, needed=0){
  if(worker.stamina >= needed) return true;
  const missing = Math.max(0, worker.maxStamina - worker.stamina);
  if(missing <= 0) return true;
  const pref = worker.foodPreference || 'auto';
  let options = getWorkerFoodChoices().filter(item => (state.resources[item] || 0) > 0);
  if(pref !== 'auto'){
    options = options.filter(item => item === pref);
  }else{
    const reserved = options.filter(item => (state.resources[item] || 0) > getWorkerFoodReserve(item));
    if(reserved.length) options = reserved;
  }
  let candidates = options.filter(item => getWorkerFoodRecovery(item) <= missing + 0.001);
  if(!candidates.length && pref === 'auto') return worker.stamina >= needed;
  if(!candidates.length) candidates = options.filter(item => getWorkerFoodRecovery(item) > 0);
  if(!candidates.length) return worker.stamina >= needed;
  candidates.sort((a,b) => getWorkerFoodRecovery(a) - getWorkerFoodRecovery(b));
  const item = candidates[0];
  const recover = getWorkerFoodRecovery(item);
  if(recover <= 0) return worker.stamina >= needed;
  spendResource(item,1);
  const actual = Math.min(missing, recover);
  worker.stamina = Math.min(worker.maxStamina, worker.stamina + actual);
  addLog(`工人 #${worker.id} 吃了${resourceLabels[item]}，恢復 ${actual.toFixed(1)} 體力。`, false, 'worker');
  return worker.stamina >= needed;
}
function degradeWorkerEquipment(worker){
  if(worker.toolId && worker.toolDurability > 0){
    worker.toolDurability -= 1;
    if(worker.toolDurability <= 0){
      addLog(`工人 #${worker.id} 的${resourceLabels[worker.toolId]}損壞了。`, false, 'worker');
      worker.toolId = '';
      worker.toolDurability = 0;
    }
  }
  if(worker.clothesEquipped && worker.clothesDurability > 0){
    worker.clothesDurability -= 1;
    if(worker.clothesDurability <= 0){
      addLog(`工人 #${worker.id} 的衣服損壞了。`, false, 'worker');
      worker.clothesEquipped = false;
      worker.clothesDurability = 0;
    }
  }
}
function getWorkerEffectiveCycleTimeUncapped(worker){
  let t = getWorkerCycleTimeUncapped(worker.job);
  if(!worker.clothesEquipped || worker.clothesDurability <= 0) t *= 1.25;
  if(worker.toolId && worker.toolId.startsWith('copper')) t *= 0.90;
  return t;
}
function getWorkerEffectiveCycleTime(worker){
  return Math.max(WORKER_MIN_CYCLE_SECONDS, getWorkerEffectiveCycleTimeUncapped(worker));
}
function getWorkerOutputMultiplier(worker){
  const uncapped = Math.max(0.01, getWorkerEffectiveCycleTimeUncapped(worker));
  if(uncapped >= WORKER_MIN_CYCLE_SECONDS) return 1;
  return WORKER_MIN_CYCLE_SECONDS / uncapped;
}
function getWorkerOutputPreviewText(worker){
  const multiplier = getWorkerOutputMultiplier(worker);
  if(multiplier <= 1.001) return '';
  return `${WORKER_MIN_CYCLE_SECONDS} 秒產出 ×${multiplier.toFixed(2)}`;
}
function useStaminaPotion(){
  if((state.resources.staminaPotion || 0) <= 0) return addLog('沒有可用的體力藥劑。');
  if(state.staminaPotionCooldown > 0) return addLog(`體力藥劑冷卻中，剩餘 ${Math.ceil(state.staminaPotionCooldown)} 秒。`);
  spendResource('staminaPotion',1);
  state.staminaPotionBuff = 180;
  state.staminaPotionCooldown = 300;
  addLog('已使用體力藥劑：180 秒內體力回復速度提升，冷卻 300 秒。', true, 'important');
  render();
}
function getManagementMaterialDiscount(){ return Math.min(0.15, state.managementLevel * 0.005); }
function getManagementWageDiscount(){ return Math.min(0.25, state.managementLevel * 0.008); }
function getHouseBuildCap(key){
  if(key === 'wall') return wallCap();
  const base = houseBuildBaseCaps[key] || 0;
  const town = state.buildings?.townCenter || 0;
  if(key === 'cabin') return base + town;
  if(key === 'stoneHouse') return base + Math.floor(town / 2);
  return base;
}
function housingCap(){ return state.houses.cabin * 2 + state.houses.stoneHouse * 5; }
function wallCap(){ return 30 + (state.buildings.townCenter || 0) * 15 + state.castleLevel * 5; }
function safetyValue(){ return state.castleLevel * 5 + state.houses.wall * 2; }
function getSafetyBand(){
  const s = safetyValue();
  if(s >= 150) return {key:'high', label:'極安全', desc:'商人很願意帶大量資金與高品質大宗訂單。'};
  if(s >= 80) return {key:'mid', label:'安全', desc:'商人較常帶來較好的訂單與更多資金。'};
  if(s >= 30) return {key:'low', label:'穩定', desc:'商人願意穩定往來，訂單品質開始提升。'};
  return {key:'risk', label:'不穩', desc:'商人偏保守，資金與訂單品質較低。'};
}
function getManagementLevelEffectText(){
  const wageCut = Math.round(getManagementWageDiscount() * 1000) / 10;
  const matCut = Math.round(getManagementMaterialDiscount() * 1000) / 10;
  return `管理等級 Lv.${state.managementLevel}\n經驗：${format(state.managementExp)} / ${expToNext(state.managementLevel)}\n效果：工人薪水 -${wageCut}%\n建築材料需求 -${matCut}%\n工人工作經驗分紅偏低，但會額外提供管理經驗。`;
}
function getCastleLevelEffectText(){
  const stage = getTownStage();
  return `城池等級 Lv.${state.castleLevel}\n經驗：${format(state.castleExp)} / ${expToNext(state.castleLevel)}\n安全值：${safetyValue()}（${getSafetyBand().label}）\n效果：提高商人到訪率、商人攜帶資金、累積稅收與部分城鎮階段條件。\n目前城鎮階段：${stage.name}`;
}
function getTradeLevelEffectText(){
  return `貿易等級 Lv.${state.tradeLevel}\n經驗：${format(state.tradeExp)} / ${expToNext(state.tradeLevel)}\n效果：提高商人到訪率與商人攜帶資金。\n目前每分鐘商人到訪率：約 ${Math.round(merchantChancePerMinute()*100)}%`;
}
function getRanchLevelEffectText(){
  const ranchLv = state.buildings.ranch || 0;
  const workers = state.workers.filter(w => w.job === 'ranch').length;
  return `牧場等級 Lv.${ranchLv}\n經驗：此項目為建築等級，無獨立經驗值\n效果：繁殖速度 +${Math.round(ranchLv * 20)}%\n雞蛋額外產量 +${Math.round(ranchLv * 10)}%\n牧場工人：${workers} 人`;
}
function getReputationEffectText(){
  return `聲望：${format(state.reputation)}\n效果：工人工作速度 +${Math.round(getReputationWorkerSpeedBonus()*100)}%\n經驗獲取 +${Math.round(getReputationExpBonus()*100)}%\n產量 +${Math.round(getReputationYieldBonus()*100)}%`;
}
function getTaxEffectText(){
  return `累積稅收：${format(state.pendingTax)} 金\n領取時可獲得同時的管理經驗：${Math.floor(state.pendingTax * 0.5)}\n稅收會受城池等級、安全值與工人工資規模影響。`;
}
function countBuiltPlots(){ return Array.isArray(state.plots) ? state.plots.length : 0; }
function getFarmPlotCap(){
  return 4 + (state.buildings.townCenter || 0) * 2;
}
function getFarmBuildCost(){
  const built = countBuiltPlots();
  return {
    gold: 10 + built * 4,
    resources: {
      planks: 2 + Math.floor(built / 3),
      dirt: 6 + built * 2,
      stone: 4 + Math.floor(built / 2)
    }
  };
}
function buildFarmPlot(){
  if(countBuiltPlots() >= getFarmPlotCap()){
    addLog('農田已達上限。');
    return false;
  }
  const rawCost = getFarmBuildCost();
  const cost = { gold: rawCost.gold, resources: applyBuildingResourceDiscount(rawCost.resources) };
  if(state.gold < cost.gold){
    addLog(`金幣不足，建造農田需要 ${cost.gold} 金，尚缺 ${Math.ceil(cost.gold - state.gold)} 金。`);
    return false;
  }
  if(!canAffordResources(cost.resources)){
    const missing = getMissingResources(cost.resources);
    addLog(`材料不足，建造農田需要：${formatCostBundle(cost.resources)}；尚缺：${formatCostBundle(missing)}。`);
    return false;
  }
  state.gold -= cost.gold;
  spendResources(cost.resources);
  if(!Array.isArray(state.plots)) state.plots = [];
  state.plots.push(null);
  addManagementExp(1);
  addCastleExp(2);
  addLog(`你建造了一塊農田。目前農田：${countBuiltPlots()} / ${getFarmPlotCap()}。`);
  return true;
}
function meetsStageOrResearchReqs(def){
  if(state.level < (def.levelReq || 1)) return false;
  if(state.castleLevel < (def.minLevel || 1)) return false;
  if(def.intReq && state.intelligence < def.intReq) return false;
  if(def.reqHouses){
    for(const [k, need] of Object.entries(def.reqHouses)){ if((state.houses[k] || 0) < need) return false; }
  }
  if(def.reqBuildings){
    for(const [k, need] of Object.entries(def.reqBuildings)){ if((state.buildings[k] || 0) < need) return false; }
  }
  if(def.reqPlots && countBuiltPlots() < def.reqPlots) return false;
  return true;
}
function getTownStage(){
  let current = townStageDefs[0];
  for(const stage of townStageDefs){ if(meetsStageOrResearchReqs(stage)) current = stage; }
  return current;
}
function getNextTownStage(){
  const current = getTownStage();
  const idx = townStageDefs.findIndex(s => s.name === current.name);
  return idx >= 0 && idx < townStageDefs.length - 1 ? townStageDefs[idx+1] : null;
}
function getMissingReqText(def){
  const misses = [];
  if(state.level < (def.levelReq || 1)) misses.push(`主等級 ${state.level}/${def.levelReq}`);
  if(state.castleLevel < (def.minLevel || 1)) misses.push(`城池等級 ${state.castleLevel}/${def.minLevel}`);
  if(def.intReq && state.intelligence < def.intReq) misses.push(`智力 ${state.intelligence}/${def.intReq}`);
  if(def.reqHouses){
    for(const [k, need] of Object.entries(def.reqHouses)){
      const label = houseBuilds[k]?.name || k;
      const have = state.houses[k] || 0;
      if(have < need) misses.push(`${label} ${have}/${need}`);
    }
  }
  if(def.reqBuildings){
    for(const [k, need] of Object.entries(def.reqBuildings)){
      const label = buildingDefs[k]?.name || k;
      const have = state.buildings[k] || 0;
      if(have < need) misses.push(`${label} ${have}/${need}`);
    }
  }
  if(def.reqPlots && countBuiltPlots() < def.reqPlots) misses.push(`農田 ${countBuiltPlots()}/${def.reqPlots}`);
  return misses.length ? `尚缺：${misses.join('、')}` : '條件已滿足';
}

function currentCastleTotalExp(){
  let total = Math.max(0, Math.floor(toFiniteNumber(state.castleExp, 0)));
  for(let lv = 1; lv < state.castleLevel; lv++) total += expToNext(lv);
  return total;
}
function setCastleFromTotalExp(total, {log=false} = {}){
  total = Math.max(0, Math.floor(toFiniteNumber(total, 0)));
  let level = 1;
  let remaining = total;
  while(remaining >= expToNext(level)){
    remaining -= expToNext(level);
    level++;
  }
  const old = state.castleLevel;
  state.castleLevel = level;
  state.castleExp = remaining;
  if(log && level > old) addLog(`城池等級提升到 Lv.${state.castleLevel}。`);
}
function addCastleExp(amount){
  setCastleFromTotalExp(currentCastleTotalExp() + amount, {log:true});
}
function getBuildingCastleExpTotal(){
  let total = 0;
  total += state.houses.cabin * castleExpBase.cabin;
  total += state.houses.stoneHouse * castleExpBase.stoneHouse;
  total += state.houses.wall * castleExpBase.wall;
  Object.entries(state.buildings).forEach(([key, lv]) => {
    if(!lv) return;
    total += (castleExpBase[key] || 0);
    total += Math.max(0, lv - 1) * (castleExpUpgrade[key] || 0);
  });
  return total;
}
function applyBuildingResourceDiscount(costs){
  const discount = getManagementMaterialDiscount();
  if(discount <= 0) return JSON.parse(JSON.stringify(costs));
  const out = {};
  Object.entries(costs).forEach(([id, amt]) => {
    out[id] = Math.max(1, Math.ceil(amt * (1 - discount)));
  });
  return out;
}
function currentTaxIncome(){
  const base = state.workers.length * effectiveWorkerWage() * 0.10;
  const safetyBonus = 1 + safetyValue() * 0.01;
  return Math.floor(base * (1 + (state.castleLevel - 1) * 0.03) * safetyBonus);
}
function merchantChancePerMinute(){
  return clamp(0.01 + state.buildings.townCenter * 0.01 + (state.tradeLevel - 1) * 0.005 + (state.castleLevel - 1) * 0.003 + safetyValue() * 0.0008 + state.reputation * 0.0005, 0.01, 0.6);
}
function merchantCashPerVisit(){
  const base = 120;
  const tradeBonus = (state.tradeLevel - 1) * 40;
  const reputationBonus = Math.floor(state.reputation * 6);
  const townCenterBonus = state.buildings.townCenter * 25;
  const castleBonus = (state.castleLevel - 1) * 25;
  const safetyBonus = Math.floor(safetyValue() * 8);
  return Math.max(80, Math.floor((base + tradeBonus + reputationBonus + townCenterBonus + castleBonus + safetyBonus) * (0.9 + Math.random() * 0.2)));
}
function getReputationWorkerSpeedBonus(){
  return Math.min(0.25, state.reputation * 0.002);
}
function getReputationExpBonus(){
  return Math.min(0.50, state.reputation * 0.003);
}
function getReputationYieldBonus(){
  return Math.min(0.25, state.reputation * 0.002);
}
function getRanchTotalCapacity(){
  return 50 + (state.buildings.ranch || 0) * 150;
}
function getAnimalCap(animalId){
  const ratio = ranchRarityCaps[animalRarity[animalId] || 'common'] || 0.1;
  return Math.max(1, Math.floor(getRanchTotalCapacity() * ratio));
}
function getRanchUsedCapacity(){
  return ['chicken','rabbit','dairyCow','bull','boar','deer','wolf','brownBear','blackBear']
    .reduce((sum,id)=>sum + Math.floor(toFiniteNumber(state.resources[id],0)), 0);
}
function getAnimalRarityLabel(id){
  const map = {common:'普通', uncommon:'常見', rare:'稀有', epic:'珍稀'};
  return map[animalRarity[id] || 'common'] || '普通';
}
function getAnimalCapRatioText(id){
  const ratio = ranchRarityCaps[animalRarity[id] || 'common'] || 0;
  return `${Math.round(ratio * 100)}%`;
}
function getAutoCullLootForAnimal(id, count){
  const drops = {};
  const add = (res, amt) => { if(amt>0) drops[res] = (drops[res] || 0) + amt; };
  for(let i=0;i<count;i++){
    if(id === 'chicken'){
      add('rawChicken', randInt(1,2)); add('feather', randInt(1,3)); add('bone', 1);
    }else if(id === 'rabbit'){
      add('rawMeat', randInt(1,3)); add('hide', 1); add('bone', randInt(1,2));
    }else if(id === 'dairyCow'){
      add('rawMeat', randInt(4,8)); add('hide', randInt(1,2)); add('milk', randInt(2,4));
    }else if(id === 'bull'){
      add('rawMeat', randInt(4,8)); add('hide', randInt(1,2)); add('cowHorn', randInt(1,2));
    }else if(id === 'boar'){
      add('rawMeat', randInt(4,8)); add('offal', randInt(1,4)); add('hide', randInt(1,3)); add('bone', randInt(1,3)); if(roll(0.25)) add('boarTusk', randInt(1,2));
    }else if(id === 'deer'){
      add('rawMeat', randInt(3,7)); add('offal', randInt(1,3)); add('hide', randInt(1,2)); add('bone', randInt(1,3)); if(roll(0.5)) add('deerAntler', randInt(1,2));
    }else if(id === 'wolf'){
      add('rawMeat', randInt(2,5)); add('offal', randInt(1,2)); add('hide', randInt(1,2)); add('bone', randInt(1,3));
    }else if(id === 'brownBear'){
      add('rawMeat', randInt(6,12)); add('offal', randInt(2,6)); add('hide', randInt(2,5)); add('bone', randInt(2,5)); if(roll(0.35)) add('bearPaw', randInt(1,2)); if(roll(0.2)) add('bearFang', randInt(1,2));
    }else if(id === 'blackBear'){
      add('rawMeat', randInt(8,15)); add('offal', randInt(3,8)); add('hide', randInt(3,6)); add('bone', randInt(3,6)); if(roll(0.5)) add('bearPaw', randInt(1,2)); if(roll(0.35)) add('bearFang', randInt(1,3));
    }
  }
  return drops;
}
function autoCullExcessAnimals(logIt=false){
  const animals = Object.keys(animalRarity);
  animals.forEach(id => {
    const have = Math.floor(toFiniteNumber(state.resources[id], 0));
    const cap = getAnimalCap(id);
    if(have <= cap) return;
    const extra = have - cap;
    state.resources[id] = cap;
    const loot = getAutoCullLootForAnimal(id, extra);
    Object.entries(loot).forEach(([rid, amt]) => gainResource(rid, amt));
    if(logIt){
      const txt = Object.entries(loot).map(([rid, amt]) => `${resourceLabels[rid]}${amt}`).join('、');
      addLog(`因牧場容量調整，自動屠宰${resourceLabels[id]} ${extra} 隻，獲得：${txt}。`, false);
    }
  });
}
function applyV060Migration(s){
  if(!s.meta || s.meta.migration_v0_6_0_applied) return;
  if(!s.meta.lastLoadedFrom || s.meta.lastLoadedFrom === 'new') return;
  const currentTotal = currentCastleTotalExp();
  const legacyWallOnly = s.houses.wall * 10;
  const targetTotal = currentTotal + Math.max(0, getBuildingCastleExpTotal() - legacyWallOnly);
  setCastleFromTotalExp(targetTotal, {log:false});
  const allowedWorkers = housingCap();
  if(s.workers.length > allowedWorkers){
    const excess = s.workers.length - allowedWorkers;
    const refund = excess * (40 + 8);
    const sorted = [...s.workers].sort((a,b) => ((a.job === 'idle') ? -1 : 1) - ((b.job === 'idle') ? -1 : 1) || (b.id - a.id));
    const removeIds = new Set(sorted.slice(0, excess).map(w => w.id));
    s.workers = s.workers.filter(w => !removeIds.has(w.id));
    s.gold += refund;
    addLog(`因住房規則調整，已退聘 ${excess} 名超額工人並退回 ${refund} 金。`, false);
  }
  autoCullExcessAnimals(true);
  s.tradeExp = toFiniteNumber(s.tradeExp, 0) + 100;
  while(s.tradeExp >= expToNext(s.tradeLevel)){
    s.tradeExp -= expToNext(s.tradeLevel);
    s.tradeLevel++;
    addLog(`貿易等級提升到 Lv.${s.tradeLevel}。`, false);
  }
  s.reputation = Math.max(0, toFiniteNumber(s.reputation, 0) + 10);
  addLog('v0.6.0 更新補發已套用：補發城池經驗、整理工人與牧場容量，並發放基礎貿易與聲望補助。', false);
  s.meta.migration_v0_6_0_applied = true;
}

function addTradeExp(amount){
  state.tradeExp += amount;
  while(state.tradeExp >= expToNext(state.tradeLevel)){
    state.tradeExp -= expToNext(state.tradeLevel);
    state.tradeLevel++;
    addLog(`貿易等級提升到 Lv.${state.tradeLevel}。`);
  }
}
function addReputation(amount){
  state.reputation = Math.max(0, +(state.reputation + amount).toFixed(2));
}

function getOrderTierMeta(tier){
  if(tier === 'epic') return {label:'高級', multiplier:2.0, bonusTrade:40, rep:4};
  if(tier === 'rare') return {label:'進階', multiplier:1.6, bonusTrade:15, rep:2};
  return {label:'普通', multiplier:1.35, bonusTrade:5, rep:1};
}
function createMerchantOrder(fromMerchant=true){
  const pool = [
    {resource:'wood', tier:'common', qty:[20,40]},
    {resource:'stone', tier:'common', qty:[18,36]},
    {resource:'fish', tier:'common', qty:[8,18]},
    {resource:'shrimp', tier:'common', qty:[8,18]},
    {resource:'crab', tier:'rare', qty:[4,10]},
    {resource:'herb', tier:'common', qty:[10,20]},
    {resource:'rareHerb', tier:'rare', qty:[3,8]},
    {resource:'mushroom', tier:'common', qty:[8,18]},
    {resource:'leather', tier:'rare', qty:[4,10]},
    {resource:'softLeather', tier:'epic', qty:[2,6]},
    {resource:'cottonCloth', tier:'rare', qty:[3,8]},
    {resource:'clothes', tier:'epic', qty:[1,4]},
    {resource:'staminaPotion', tier:'epic', qty:[1,4]},
    {resource:'stoneBrick', tier:'rare', qty:[8,20]},
    {resource:'brick', tier:'rare', qty:[8,20]},
    {resource:'glassBottle', tier:'rare', qty:[4,10]},
    {resource:'boneMeal', tier:'common', qty:[3,8]},
    {resource:'compost', tier:'common', qty:[3,8]}
  ];
  const safety = safetyValue();
  const orderBoost = safety >= 150 ? 1.25 : safety >= 80 ? 1.15 : safety >= 30 ? 1.05 : 1;
  const tierWeights = safety >= 150 ? {common:1, rare:2.2, epic:1.8} : safety >= 80 ? {common:1.4, rare:1.8, epic:1.2} : {common:2, rare:1.2, epic:0.5};
  const weighted = [];
  pool.forEach(p => { for(let i=0;i<Math.round((tierWeights[p.tier]||1)*10);i++) weighted.push(p); });
  const pick = weighted[randInt(0, weighted.length-1)];
  const qty = Math.max(1, Math.floor(randInt(pick.qty[0], pick.qty[1]) * orderBoost));
  const baseSell = qty * (sellPrices[pick.resource] || 1);
  const meta = getOrderTierMeta(pick.tier);
  const rewardGold = Math.max(Math.ceil(baseSell * meta.multiplier), baseSell + 5);
  const rewardTrade = rewardGold + meta.bonusTrade;
  const rewardRep = meta.rep;
  return {
    id: 'ord' + (state.merchant.nextOrderId++),
    resource: pick.resource,
    qty,
    rewardGold,
    rewardTrade,
    rewardRep,
    tier: pick.tier,
    tierLabel: meta.label,
    from: fromMerchant ? '行腳商人' : '村民委託'
  };
}
function getMerchantOrderLimit(){
  return 3 + Math.floor(Math.max(1, state.tradeLevel) / 5);
}

function cancelMerchantOrder(orderId){
  const idx = state.merchant.orders.findIndex(o => o.id === orderId);
  if(idx < 0) return;
  const [order] = state.merchant.orders.splice(idx, 1);
  addLog(`已取消商人訂單：${order.from}收購${resourceLabels[order.resource]} ${order.qty}。`, true, 'important');
  renderMerchant();
}

function addMerchantOrders(count=1){
  let added = 0;
  const limit = getMerchantOrderLimit();
  for(let i=0;i<count;i++){
    if(state.merchant.orders.length >= limit) break;
    state.merchant.orders.push(createMerchantOrder(true));
    added++;
  }
  return added;
}
function fulfillMerchantOrder(orderId){
  const idx = state.merchant.orders.findIndex(o => o.id === orderId);
  if(idx < 0) return;
  const order = state.merchant.orders[idx];
  const have = Math.floor(toFiniteNumber(state.resources[order.resource], 0));
  if(have < order.qty){
    addLog(`布告欄訂單材料不足，繳交${resourceLabels[order.resource]}${order.qty}需要，尚缺 ${order.qty - have}。`);
    return;
  }
  state.resources[order.resource] -= order.qty;
  state.gold += order.rewardGold;
  const tradeGain = order.rewardGold + order.rewardTrade;
  addTradeExp(tradeGain);
  addReputation(order.rewardRep);
  addLog(`完成布告欄訂單：繳交${resourceLabels[order.resource]}${order.qty}，獲得 ${order.rewardGold} 金、貿易經驗 ${tradeGain}、聲望 ${order.rewardRep}。`, true, 'important');
  state.merchant.orders.splice(idx, 1);
  render();
  renderMerchant();
}

function getAnimalBreedSeconds(id){
  const def = animalFeedDefs[id];
  if(!def) return 240;
  const speedBonus = 1 + (state.buildings.ranch || 0) * 0.20;
  return Math.max(60, Math.round(def.breedSeconds / speedBonus));
}
function getActiveRanchWorkersCount(){
  return (state.workers || []).filter(worker => worker && worker.job === 'ranch' && state.salaryDebt <= 0).length;
}
function hasActiveRanchBreedingProgress(){
  const singleAnimals = ['chicken','rabbit','boar','deer','wolf','brownBear','blackBear'];
  if(singleAnimals.some(id => isAnimalBreedingEnabled(id) && (state.resources[id] || 0) >= 2 && (state.ranchData?.[id]?.fed || 0) > 0)) return true;
  return isAnimalBreedingEnabled('dairyCow') && isAnimalBreedingEnabled('bull')
    && (state.resources.dairyCow || 0) >= 1
    && (state.resources.bull || 0) >= 1
    && (state.ranchData?.dairyCow?.fed || 0) > 0
    && (state.ranchData?.bull?.fed || 0) > 0;
}
function isAnimalBreedingEnabled(id){
  if(!state.ranchData || !state.ranchData[id]) return true;
  return state.ranchData[id].enabled !== false;
}
function toggleAnimalBreeding(id){
  if(!state.ranchData || typeof state.ranchData !== 'object') state.ranchData = createInitialRanchData();
  if(!state.ranchData[id] || typeof state.ranchData[id] !== 'object') state.ranchData[id] = {fed:0, timer:0, enabled:true};
  state.ranchData[id].enabled = !isAnimalBreedingEnabled(id);
  if(!state.ranchData[id].enabled) state.ranchData[id].timer = 0;
  addLog(`${resourceLabels[id]}繁殖已${state.ranchData[id].enabled ? '開啟' : '關閉'}。`, true, 'important');
  render();
}
function getAnimalProgressPercent(id){
  const ranchState = (state.ranchData && state.ranchData[id]) ? state.ranchData[id] : {fed:0, timer:0, enabled:true};
  if(!isAnimalBreedingEnabled(id) || ranchState.fed <= 0) return 0;
  const need = getAnimalBreedSeconds(id);
  if(need <= 0) return 0;
  return clamp((ranchState.timer / need) * 100, 0, 100);
}
function feedAnimalMany(id, qty=1){
  const def = animalFeedDefs[id];
  if(!def) return false;
  const maxFeed = Math.floor(toFiniteNumber(state.resources[def.food], 0) / Math.max(1, def.amount));
  const times = Math.max(1, Math.min(Math.floor(toFiniteNumber(qty, 1)), maxFeed));
  if(times <= 0){
    addLog(`${resourceLabels[id]}需要 ${resourceLabels[def.food]} ${def.amount} 才能餵養。`);
    return false;
  }
  if(!state.ranchData[id]) state.ranchData[id] = {fed:0, timer:0, enabled:true};
  spendResource(def.food, def.amount * times);
  state.ranchData[id].fed += times;
  addLog(`你餵了${resourceLabels[id]} ${times} 次：${resourceLabels[def.food]} -${def.amount * times}，目前待繁殖餵養次數 ${state.ranchData[id].fed}。`, true, 'important');
  render();
  return true;
}
function feedAnimal(id){
  return feedAnimalMany(id, 1);
}
function openFeedAnimalModal(id){
  const def = animalFeedDefs[id];
  if(!def) return;
  const have = Math.floor(toFiniteNumber(state.resources[def.food], 0));
  const maxFeed = Math.floor(have / Math.max(1, def.amount));
  const ranchState = state.ranchData[id] || {fed:0, timer:0, enabled:true};
  openActionModal({
    title: `餵養${resourceLabels[id]}`,
    desc: [
      `目前${resourceLabels[def.food]}：${have}`,
      `每次餵養消耗：${resourceLabels[def.food]} × ${def.amount}`,
      `目前待繁殖餵養次數：${format(ranchState.fed || 0)}`,
      `最多可餵：${Math.max(0, maxFeed)} 次`
    ].join('\n'),
    quick:[1,5,10,'全部'],
    max:Math.max(1, maxFeed),
    startLabel:'確認餵養',
    onStart:(qty)=>feedAnimalMany(id, qty)
  });
}

function claimTax(){
  if(state.pendingTax <= 0) return addLog('目前沒有可領取的稅收。');
  const amt = state.pendingTax;
  state.pendingTax = 0;
  state.gold += amt;
  const mgmtExp = Math.max(1, Math.floor(amt * 0.5));
  addManagementExp(mgmtExp);
  addLog(`已領取累積稅收 ${amt} 金，管理經驗 +${mgmtExp}。`);
  render();
}

function effectiveWorkerWage(){
  const discount = getManagementWageDiscount();
  return Math.max(1, Math.ceil(8 * (1 - discount)));
}
function hasTool(resId){ return (state.resources[resId] || 0) > 0; }
function getWorkSpeedBonus(workId){
  let bonus = state.campfireSec > 0 ? 0.10 : 0;
  if(workId === 'lumber') bonus += state.buildings.lumberMill * 0.10 + (hasTool('ironAxeTool') ? 0.25 : (hasTool('copperAxeTool') ? 0.20 : (hasTool('stoneAxeTool') ? 0.10 : (hasTool('woodAxeTool') ? 0.05 : 0))));
  if(workId === 'mining') bonus += state.buildings.quarry * 0.10 + (hasTool('ironPickTool') ? 0.25 : (hasTool('copperPickTool') ? 0.20 : (hasTool('stonePickTool') ? 0.10 : (hasTool('woodPickTool') ? 0.05 : 0))));
  if(workId === 'digging') bonus += state.buildings.quarry * 0.10 + (hasTool('ironShovelTool') ? 0.25 : (hasTool('copperShovelTool') ? 0.20 : (hasTool('shovelTool') ? 0.10 : (hasTool('woodShovelTool') ? 0.05 : 0))));
  if(workId === 'fishing') bonus += state.buildings.fishingShack * 0.10 + (hasTool('ironFishingRodTool') ? 0.25 : (hasTool('copperFishingRodTool') ? 0.20 : (hasTool('fishingRodTool') ? 0.10 : (hasTool('woodFishingRodTool') ? 0.05 : 0))));
  if(workId === 'hunting') bonus += hasTool('ironBowTool') ? 0.25 : (hasTool('copperBowTool') ? 0.20 : (hasTool('stoneBowTool') ? 0.12 : (hasTool('woodBowTool') ? 0.06 : 0)));
  return bonus;
}
function getPlayerCycleTime(workId=null){
  const raw = (1 + 0.02 * state.intelligence) / 10;
  const capped = raw <= 1 ? raw : 1 + (raw - 1) * 0.35;
  const base = 1 / capped;
  const bonus = workId ? getWorkSpeedBonus(workId) : 0;
  return base / (1 + bonus);
}
const PRODUCTION_MIN_CYCLE_SECONDS = 5;
function getProductionDurationUncapped(workId=null){
  return getPlayerCycleTime(workId);
}
function getProductionOutputMultiplier(workId=null){
  const uncapped = Math.max(0.01, getProductionDurationUncapped(workId));
  if(uncapped >= PRODUCTION_MIN_CYCLE_SECONDS) return 1;
  return PRODUCTION_MIN_CYCLE_SECONDS / uncapped;
}
function getProductionDuration(workId=null){
  return Math.max(PRODUCTION_MIN_CYCLE_SECONDS, getProductionDurationUncapped(workId));
}
function getProductionOutputPreviewText(workId=null){
  const multiplier = getProductionOutputMultiplier(workId);
  if(multiplier <= 1.001) return '';
  return `額外產出：約 ×${multiplier.toFixed(2)} / ${PRODUCTION_MIN_CYCLE_SECONDS} 秒`;
}
const WORKER_MIN_CYCLE_SECONDS = 10;
function getWorkerCycleTimeUncapped(job=null){
  let mult = 1 + (state.managementLevel - 1) * 0.02 + state.houses.stoneHouse * 0.03 + state.buildings.townCenter * 0.05 + (state.campfireSec > 0 ? 0.10 : 0) + getReputationWorkerSpeedBonus();
  if(job === 'ranch') mult += state.buildings.ranch * 0.20;
  if(job && job !== 'crafting' && job !== 'ranch') mult += getWorkSpeedBonus(job);
  return 15 / mult;
}
function getWorkerCycleTime(job=null){
  return Math.max(WORKER_MIN_CYCLE_SECONDS, getWorkerCycleTimeUncapped(job));
}
function getReadingDuration(base){ return base / (1 + state.buildings.library * 0.15); }
const CRAFT_MIN_CYCLE_SECONDS = 5;
function getCraftDurationUncapped(craftId, fromWorker=false){
  if(fromWorker) return getWorkerCycleTime('crafting');
  const craft = crafts[craftId];
  let bonus = state.campfireSec > 0 ? 0.10 : 0;
  if(craft.skill === 'alchemy') bonus += state.buildings.alchemyHut * 0.20;
  if(craft.skill === 'tanning') bonus += state.buildings.tannery * 0.20;
  if(['flour','boneMeal','compost'].includes(craftId)) bonus += state.buildings.mill * 0.20 + state.buildings.windmill * 0.15;
  if(['ironFirewood','ironCoal','copperFirewood','copperCoal','woodAxeTool','woodPickTool','woodShovelTool','woodCarvingKnifeTool','woodHammerTool','woodPotTool','woodHoeTool','woodPitchforkTool','woodFishingRodTool','woodBowTool','stoneAxeTool','stonePickTool','shovelTool','stoneCarvingKnifeTool','stoneHammerTool','stonePotTool','stoneHoeTool','stonePitchforkTool','stoneBowTool','fishingRodTool','fishNetTool','copperAxeTool','copperShovelTool','copperPickTool','copperCarvingKnifeTool','copperHammerTool','copperPotTool','copperHoeTool','copperPitchforkTool','copperBowTool','copperFishingRodTool','ironAxeTool','ironShovelTool','ironPickTool','ironCarvingKnifeTool','ironHammerTool','ironPotTool','ironHoeTool','ironPitchforkTool','ironFishingRodTool','ironBowTool'].includes(craftId)) bonus += state.buildings.smithy * 0.20;
  return getPlayerCycleTime() / (1 + bonus);
}
function getCraftOutputMultiplier(craftId, fromWorker=false){
  const uncapped = Math.max(0.01, getCraftDurationUncapped(craftId, fromWorker));
  if(uncapped >= CRAFT_MIN_CYCLE_SECONDS) return 1;
  return CRAFT_MIN_CYCLE_SECONDS / uncapped;
}
function getCraftDuration(craftId, fromWorker=false){
  return Math.max(CRAFT_MIN_CYCLE_SECONDS, getCraftDurationUncapped(craftId, fromWorker));
}
function getCraftOutputPreviewText(craftId, fromWorker=false){
  const multiplier = getCraftOutputMultiplier(craftId, fromWorker);
  if(multiplier <= 1.001) return '';
  return `額外產出：約 ×${multiplier.toFixed(2)} / ${CRAFT_MIN_CYCLE_SECONDS} 秒`;
}
function scaleCraftYields(craftId, yields, multiplier=1){
  if(multiplier <= 1.000001) return Object.fromEntries(Object.entries(yields).map(([id, amt]) => [id, amt]));
  if(!state.craftYieldCarry || typeof state.craftYieldCarry !== 'object') state.craftYieldCarry = {};
  const scaled = {};
  Object.entries(yields).forEach(([id, amt]) => {
    const carryKey = `${craftId}:${id}`;
    const carry = toFiniteNumber(state.craftYieldCarry[carryKey], 0);
    const total = amt * multiplier + carry;
    let out = Math.floor(total + 1e-9);
    if(out < amt) out = amt;
    state.craftYieldCarry[carryKey] = Math.max(0, total - out);
    scaled[id] = out;
  });
  return scaled;
}
function getScaledProductionResult(workId, multiplier=1){
  if(multiplier <= 1.000001) return getWorkSummaryLoot(workId, false);
  if(!state.productionCycleCarry || typeof state.productionCycleCarry !== 'object') state.productionCycleCarry = {};
  const carryKey = String(workId || 'generic');
  const carry = toFiniteNumber(state.productionCycleCarry[carryKey], 0);
  const totalCycles = Math.max(1, multiplier + carry);
  let cycleCount = Math.floor(totalCycles + 1e-9);
  if(cycleCount < 1) cycleCount = 1;
  state.productionCycleCarry[carryKey] = Math.max(0, totalCycles - cycleCount);
  const combined = { loot:{}, gold:0, rarity:'common', skillExp:0, mainExp:0 };
  for(let i=0;i<cycleCount;i++){
    const part = getWorkSummaryLoot(workId, false);
    Object.entries(part.loot || {}).forEach(([id, amt]) => {
      combined.loot[id] = (combined.loot[id] || 0) + amt;
    });
    combined.gold += toFiniteNumber(part.gold, 0);
    combined.skillExp += toFiniteNumber(part.skillExp, 0);
    combined.mainExp += toFiniteNumber(part.mainExp, 0);
    if((rarityMultipliers[part.rarity] || 1) > (rarityMultipliers[combined.rarity] || 1)) combined.rarity = part.rarity;
  }
  return combined;
}

function getCropDuration(seedId){
  const def = farmingDefs[seedId];
  if(!def) return 60;
  const bonus = (state.buildings.waterChannel || 0) * 0.10;
  return def.duration / (1 + bonus);
}
function getCropYieldMultiplier(seedId){
  const waterBonus = (state.buildings.waterChannel || 0) * 0.12;
  const farmingBonus = Math.floor(Math.max(0, state.skills.farming.level - 1) / 5) * 0.05;
  return 1 + waterBonus + farmingBonus;
}
function getSeedReturnChance(seedId){
  const def = farmingDefs[seedId];
  if(!def || def.fixedSeedReturn) return 0;
  const base = def.returnBase || 0;
  const bonus = Math.min(0.25, (state.skills.farming.level - 1) * 0.01) + state.buildings.windmill * 0.05;
  return clamp(base + bonus, 0, 0.95);
}
function getFixedSeedReturnRange(seedId){
  const def = farmingDefs[seedId];
  if(!def || !Array.isArray(def.fixedSeedReturn)) return null;
  const skillBonus = Math.floor(Math.max(0, state.skills.farming.level - 1) / 10);
  const windBonus = Math.floor((state.buildings.windmill || 0) / 2);
  return {
    min: Math.max(0, def.fixedSeedReturn[0] + skillBonus + windBonus),
    max: Math.max(0, def.fixedSeedReturn[1] + skillBonus + windBonus)
  };
}
function getSeedReturnCount(seedId){
  const range = getFixedSeedReturnRange(seedId);
  if(!range) return 0;
  return randInt(range.min, Math.max(range.min, range.max));
}
function getSeedReturnDisplayText(seedId){
  const range = getFixedSeedReturnRange(seedId);
  if(range) return `固定返還 ${range.min}~${range.max} 顆種子`;
  return `種子返還率 ${Math.round(getSeedReturnChance(seedId) * 100)}%`;
}
function getRegenRate(resting){
  let rate = resting ? 5 : 0.1;
  rate *= 1 + state.buildings.well * 0.10;
  rate *= 1 + getRestEfficiencyBonus();
  if(state.campfireSec > 0) rate *= 1.10;
  rate *= 1 + getStaminaPotionRegenBonus();
  return rate;
}
function gainResource(id, amt){ state.resources[id] = (state.resources[id] || 0) + amt; }
function spendResource(id, amt){ if((state.resources[id]||0) < amt) return false; state.resources[id]-=amt; return true; }
function canAffordResources(costs){ return Object.entries(costs).every(([id,amt]) => (state.resources[id]||0) >= amt); }
function spendResources(costs){ if(!canAffordResources(costs)) return false; Object.entries(costs).forEach(([id,amt]) => state.resources[id]-=amt); return true; }
function spendGold(amt){ if(state.gold < amt) return false; state.gold -= amt; return true; }
function formatCostBundle(costs){
  return Object.entries(costs).map(([id,amt]) => `${resourceLabels[id] || id}${amt}`).join('、');
}
function getMissingResources(costs){
  const missing = {};
  Object.entries(costs).forEach(([id, amt]) => {
    const have = toFiniteNumber(state.resources[id], 0);
    if(have < amt) missing[id] = amt - have;
  });
  return missing;
}
function formatMissingResources(costs){
  const missing = getMissingResources(costs);
  const entries = Object.entries(missing);
  if(!entries.length) return '';
  return entries.map(([id, amt]) => `${resourceLabels[id] || id}${amt}`).join('、');
}
function addManagementFromSpend(gold){ addManagementExp(Math.max(1, Math.floor(gold / 10))); }
function restoreStamina(amount, grantsExp=true){
  const before = state.stamina;
  state.stamina = clamp(state.stamina + amount, 0, maxStamina());
  const actual = state.stamina - before;
  if(grantsExp && actual > 0) addStaminaExp(actual);
  return actual;
}
function addMainExp(amount){
  state.exp += amount;
  while(state.exp >= expToNext(state.level)){
    state.exp -= expToNext(state.level);
    state.level++;
    addLog(`主等級提升到 Lv.${state.level}。`);
  }
}
function addSkillExp(skillId, amount){
  const mult = 1 + getSkillExpBonus(skillId);
  const skill = state.skills[skillId];
  if(!skill) return;
  skill.exp += amount * mult;
  while(skill.exp >= expToNext(skill.level)){
    skill.exp -= expToNext(skill.level);
    skill.level++;
    addLog(`${skillLabels[skillId]} 等級提升到 Lv.${skill.level}。`);
  }
}
function getSkillExpBonus(skillId){
  if(skillId === 'lumber') return state.buildings.lumberMill * 0.10;
  if(skillId === 'mining' || skillId === 'digging') return state.buildings.quarry * 0.10;
  if(skillId === 'fishing') return state.buildings.fishingShack * 0.10;
  return 0;
}
function addManagementExp(amount){
  state.managementExp += amount;
  while(state.managementExp >= expToNext(state.managementLevel)){
    state.managementExp -= expToNext(state.managementLevel);
    state.managementLevel++;
    addLog(`管理等級提升到 Lv.${state.managementLevel}。`);
  }
}
function gainGold(amount){ state.gold += amount; }
function addResource(id, amount){ state.resources[id] = Math.max(0, toFiniteNumber(state.resources[id],0) + amount); }
function addStaminaExp(amount){
  state.staminaExp += amount;
  while(state.staminaExp >= expToNext(state.staminaLevel)){
    state.staminaExp -= expToNext(state.staminaLevel);
    state.staminaLevel++;
    state.stamina = Math.min(maxStamina(), state.stamina + 10);
    addLog(`體力等級提升到 Lv.${state.staminaLevel}，最大體力增加。`);
  }
}

function rarityName(key){ return {common:'普通', rare:'稀有', epic:'珍稀', legendary:'極稀有'}[key]; }

function getWorkSummaryLoot(workId, isWorker=false){
  const loot = {};
  let rarity = 'common';
  const miningLv = state.skills.mining.level;
  const setRarity = (r) => { if(rarityMultipliers[r] > rarityMultipliers[rarity]) rarity = r; };
  const add = (id, amt) => { loot[id] = (loot[id] || 0) + amt; };
  switch(workId){
    case 'labor':
      return {loot, gold:1 * (1 + 0.1 * (state.level - 1)), rarity:'common', skillExp:1, mainExp:1};
    case 'lumber':
      add('wood', randInt(2,5));
      add('branch', randInt(1,3));
      add('leaf', randInt(1,4));
      if(roll(0.18)) { add('apple', randInt(1,2)); setRarity('rare'); }
      if(roll(0.05)) { add('appleSeed', 1); setRarity('rare'); }
      break;
    case 'mining':
      add('stone', randInt(2,6));
      add('copperOre', randInt(1,5));
      if(roll(0.8)) add('coal', randInt(1,3));
      if(roll(0.55)) add('ironOre', randInt(1,2));
      if(miningLv >= 10){
        if(roll(0.12)){ add('silverOre', randInt(1,2)); setRarity('rare'); }
        if(roll(0.08)){ add('magnetite', 1); setRarity('rare'); }
        if(roll(0.03)){ add('crystal', 1); setRarity('epic'); }
      }
      if(miningLv >= 20){
        if(roll(0.06)){ add('goldOre', randInt(1,2)); setRarity('epic'); }
        if(roll(0.02)){ add('gem', 1); setRarity('legendary'); }
      }
      break;
    case 'fishing':{
      const r = Math.random();
      if(r < 0.55) add('fish', randInt(2,4));
      else if(r < 0.85) add('shrimp', randInt(2,4));
      else if(r < 0.97) { add('crab', randInt(1,2)); setRarity('rare'); }
      else { add('snail', 1); setRarity('rare'); }
      if(roll(0.005)){ add('ironOre', 1); setRarity('rare'); }
      if(roll(0.001)){ add('crystal', 1); setRarity('legendary'); }
      break;
    }
    case 'hunting':{
      const r = Math.random();
      if(r < 0.24) add('rabbit', 1);
      else if(r < 0.50) add('boar', 1);
      else if(r < 0.72) add('deer', 1);
      else if(r < 0.87) { add('wolf', 1); setRarity('rare'); }
      else if(r < 0.97) { add('brownBear', 1); setRarity('rare'); }
      else { add('blackBear', 1); setRarity('epic'); }
      break;
    }
    case 'forest':
      if(roll(0.65)) add('herb', randInt(1,3));
      if(roll(0.08)){ add('rareHerb', 1); setRarity('rare'); }
      if(roll(0.55)) add('mushroom', randInt(1,3));
      add('branch', randInt(1,3));
      add('leaf', randInt(1,4));
      add('fiber', randInt(1,3));
      if(roll(0.05)){ add('ginseng', 1); setRarity('rare'); }
      if(roll(0.08)){ add('wheatSeed', 1); setRarity('rare'); }
      if(roll(0.07)){ add('mushroomSpore', 1); setRarity('rare'); }
      if(roll(0.06)){ add('cottonSeed', 1); setRarity('rare'); }
      if(roll(0.06)){ add('carrotSeed', 1); setRarity('rare'); }
      break;
    case 'shore':
      add('sand', randInt(1,5));
      if(roll(0.7)) add('shellfish', randInt(1,3));
      if(roll(0.35)){ add('crab', randInt(1,2)); setRarity('rare'); }
      if(roll(0.15)){ add('coral', 1); setRarity('rare'); }
      break;
    case 'digging':
      add('dirt', randInt(2,6));
      add('stone', randInt(1,4));
      if(roll(0.8)) add('sand', randInt(0,3));
      break;
  }
  if(workId === 'lumber'){
    const mult = hasTool('ironAxeTool') ? 1.5 : (hasTool('copperAxeTool') ? 1.35 : (hasTool('stoneAxeTool') ? 1.2 : (hasTool('woodAxeTool') ? 1.1 : 1)));
    if(mult > 1){
      if(loot.wood) loot.wood = Math.max(1, Math.floor(loot.wood * mult));
      if(loot.branch) loot.branch = Math.max(1, Math.floor(loot.branch * mult));
    }
  }
  if(workId === 'digging'){
    const mult = hasTool('ironShovelTool') ? 1.5 : (hasTool('copperShovelTool') ? 1.35 : (hasTool('shovelTool') ? 1.2 : (hasTool('woodShovelTool') ? 1.1 : 1)));
    if(mult > 1) Object.keys(loot).forEach(k => loot[k] = Math.max(1, Math.floor(loot[k] * mult)));
  }
  if(workId === 'fishing'){
    let mult = 1;
    if(hasTool('fishNetTool')) mult = 1.8;
    else if(hasTool('ironFishingRodTool')) mult = 1.5;
    else if(hasTool('copperFishingRodTool')) mult = 1.35;
    else if(hasTool('fishingRodTool')) mult = 1.2;
    else if(hasTool('woodFishingRodTool')) mult = 1.1;
    if(mult > 1) Object.keys(loot).forEach(k => loot[k] = Math.max(1, Math.floor(loot[k] * mult)));
  }
  if(workId === 'mining'){
    const mult = hasTool('ironPickTool') ? 1.45 : (hasTool('copperPickTool') ? 1.25 : (hasTool('stonePickTool') ? 1.12 : (hasTool('woodPickTool') ? 1.06 : 1)));
    if(mult > 1) Object.keys(loot).forEach(k => loot[k] = Math.max(1, Math.floor(loot[k] * mult)));
  }
  if(isWorker){
    Object.keys(loot).forEach(k => loot[k] = Math.max(1, Math.floor(loot[k] * 0.8)));
  }
  return { loot, gold:0, rarity, skillExp:rarityMultipliers[rarity], mainExp:rarityMultipliers[rarity] };
}

function getScaledWorkerWorkResult(workId, multiplier=1){
  const result = getWorkSummaryLoot(workId, true);
  const mult = Math.max(1, toFiniteNumber(multiplier, 1));
  if(mult <= 1.000001) return result;
  if(!state.workerYieldCarry || typeof state.workerYieldCarry !== 'object') state.workerYieldCarry = {};
  const scaledLoot = {};
  Object.entries(result.loot || {}).forEach(([id, amt]) => {
    const carryKey = `worker:${workId}:${id}`;
    const carry = toFiniteNumber(state.workerYieldCarry[carryKey], 0);
    const total = amt * mult + carry;
    const out = Math.floor(total + 1e-9);
    state.workerYieldCarry[carryKey] = total - out;
    if(out > 0) scaledLoot[id] = out;
  });
  return {
    ...result,
    loot: scaledLoot,
    gold: result.gold * mult,
    skillExp: result.skillExp * mult,
    mainExp: result.mainExp * mult
  };
}

function applyWorkResult(workId, result, isWorker=false, workerId=null){
  if(isWorker){
    const yb = 1 + getReputationYieldBonus();
    Object.keys(result.loot).forEach(id => {
      result.loot[id] = Math.max(1, Math.round(result.loot[id] * yb));
    });
  }
  Object.entries(result.loot).forEach(([id,amt]) => gainResource(id, amt));
  state.gold += result.gold;
  const skillId = workDefs[workId].skill;
  if(!isWorker){
    addSkillExp(skillId, result.skillExp);
    addMainExp(result.mainExp);
  }else{
    const expMult = 1 + getReputationExpBonus();
    addSkillExp(skillId, result.skillExp * 0.05 * expMult);
    addMainExp(result.mainExp * 0.10 * expMult);
    addManagementExp(0.3);
  }
  const gained = Object.entries(result.loot).map(([id,amt]) => `${resourceLabels[id]}+${amt}`).join('、');
  const rareText = result.rarity !== 'common' ? `（${rarityName(result.rarity)}）` : '';
  if(!isWorker){
    const goldText = result.gold ? `金幣+${result.gold.toFixed(1)}` : '';
    addLog(`${workDefs[workId].name}完成${rareText}${gained || ''}${gained && goldText ? '、' : ''}${goldText}`);
  }else if(result.rarity !== 'common'){
    addLog(`工人 #${workerId} 在${workDefs[workId].name}取得${rareText}成果：${gained}`);
  }
}

function canStartProduction(){ return !state.productionAction && !state.isResting; }
function canStartCraft(){ return !state.craftAction; }

const buildResearchByTarget = Object.fromEntries(Object.entries(researchDefs).filter(([,v])=>v.unlockBuild).map(([k,v])=>[v.unlockBuild,k]));
const houseResearchByTarget = Object.fromEntries(Object.entries(researchDefs).filter(([,v])=>v.unlockHouse).map(([k,v])=>[v.unlockHouse,k]));
function getResearchStatus(key){
  if(state.research[key]) return 'completed';
  const def = researchDefs[key];
  if(meetsStageOrResearchReqs(def)) return 'available';
  return 'locked';
}
function isBuildUnlocked(key){
  const rk = buildResearchByTarget[key];
  return !rk || !!state.research[rk] || (state.buildings[key] || 0) > 0;
}
function isHouseUnlocked(key){
  const rk = houseResearchByTarget[key];
  return !rk || !!state.research[rk] || (state.houses[key] || 0) > 0;
}

function canStartResearch(){ return !state.researchAction; }

function triggerAutoRest(workId){
  const targetWork = workId || state.autoWork;
  if(!targetWork) return false;
  state.isResting = true;
  state.autoResting = true;
  state.autoRestResume = targetWork;
  if(state.productionAction && state.productionAction.type === 'work') state.productionAction = null;
  addLog(`體力耗盡，自動開始休息。體力全滿後會繼續${workDefs[targetWork].name}。`, false);
  return true;
}
function maybeResumeAfterAutoRest(){
  if(!state.isResting || !state.autoResting || !state.autoRestResume) return false;
  if(state.stamina + 1e-6 < maxStamina()) return false;
  const resumeWork = state.autoRestResume;
  state.isResting = false;
  state.autoResting = false;
  state.autoRestResume = null;
  addLog(`體力已全滿，自動恢復${workDefs[resumeWork].name}。`, false);
  if(!state.productionAction){
    beginWorkCycle(resumeWork, {silent:true});
  }
  return true;
}
function beginWorkCycle(workId,{silent=false}={}){
  const def = workDefs[workId];
  if(state.stamina < def.staminaCost){
    if(state.autoWork === workId){
      triggerAutoRest(workId);
    }else{
      state.autoWork = null;
      if(!silent) addLog(`體力不足，${def.name}已停止。`);
    }
    return false;
  }
  state.stamina -= def.staminaCost;
  const duration = getProductionDuration(workId);
  const outputMultiplier = getProductionOutputMultiplier(workId);
  state.productionAction = {type:'work', id:workId, remaining:duration, total:duration, outputMultiplier};
  return true;
}
function startWork(workId){
  if(state.isResting) return addLog('休息中，請先停止休息。');
  if(state.productionAction && state.productionAction.type !== 'work') return addLog('你現在無法開始工作。');
  const switching = state.autoWork && state.autoWork !== workId;
  state.autoWork = workId;
  if(!state.productionAction){
    if(beginWorkCycle(workId)){ addLog(`${workDefs[workId].name}已設為持續工作。`); }
  }else if(switching){
    addLog(`已切換持續工作為：${workDefs[workId].name}。`);
  }
  render();
}
function stopAutoWork(reason='已停止持續工作。'){
  if(!state.autoWork && !(state.productionAction && state.productionAction.type === 'work')) return addLog('目前沒有持續工作。');
  state.autoWork = null;
  state.autoResting = false;
  state.autoRestResume = null;
  if(state.productionAction && state.productionAction.type === 'work') state.productionAction = null;
  addLog(reason);
  render();
}
function startReading(bookId){
  if(beginReadNow(bookId, false)) render();
}
function getResearchUnlockResultText(def){
  if(!def) return '已完成研究。';
  if(def.unlockCraft && crafts[def.unlockCraft]) return `已解鎖配方：${crafts[def.unlockCraft].name}。`;
  if(def.unlockBuild && buildingDefs[def.unlockBuild]) return `已解鎖建築：${buildingDefs[def.unlockBuild].name}。`;
  if(def.unlockHouse && houseBuilds[def.unlockHouse]) return `已解鎖建造：${houseBuilds[def.unlockHouse].name}。`;
  if(def.id === 'autoMealPlan' || def.name === '自動進食規劃') return '已解鎖玩家自動進食設定。';
  if(def.category === 'tool') return '已解鎖對應工具配方。';
  return '已解鎖新內容。';
}

function startResearch(key){
  if(state.research[key]) return addLog('這項研究已完成。');
  if(!canStartResearch()) return addLog('研究線忙碌中，無法研究。');
  const def = researchDefs[key];
  if(!meetsStageOrResearchReqs(def)) return addLog(`尚未達成研究條件。${getMissingReqText(def)}`);
  const dur = getReadingDuration(def.duration);
  state.researchAction = {type:'research', id:key, remaining:dur, total:dur};
  addLog(`開始研究：${def.name}。`);
  render();
}

