const crafts = {
  plank:{name:'木板', skill:'woodworking', costs:{wood:5}, yields:{planks:1, firewood:2}, stamina:1},
  stoneBrick:{name:'石磚', skill:'masonry', costs:{stone:5}, yields:{stoneBrick:1}, stamina:2},
  brickFirewood:{name:'磚塊(柴)', skill:'masonry', costs:{dirt:5, firewood:1}, yields:{brick:1}, stamina:2},
  brickCoal:{name:'磚塊(煤)', skill:'masonry', costs:{dirt:10, coal:1}, yields:{brick:2}, stamina:2},
  glassFirewood:{name:'玻璃(柴)', skill:'masonry', costs:{sand:5, firewood:1}, yields:{glass:1}, stamina:2},
  glassCoal:{name:'玻璃(煤)', skill:'masonry', costs:{sand:10, coal:1}, yields:{glass:2}, stamina:2},
  bottle:{name:'玻璃瓶', skill:'masonry', costs:{glass:2}, yields:{glassBottle:1}, stamina:1},

  sashimi:{name:'生魚片', skill:'cooking', costs:{fish:2, shrimp:1}, yields:{sashimi:1}, stamina:1, hidden:true},
  grilledMeat:{name:'烤肉', skill:'cooking', costs:{rawMeat:2}, yields:{grilledMeat:1}, stamina:1},
  grilledFish:{name:'烤魚', skill:'cooking', costs:{fish:2}, yields:{grilledFish:1}, stamina:1},
  bread:{name:'麵包', skill:'cooking', costs:{wheatFlour:1}, yields:{bread:1}, stamina:1},
  grilledSausage:{name:'烤香腸', skill:'cooking', costs:{offal:2, wheatFlour:1}, yields:{grilledSausage:1}, stamina:1},
  bearStew:{name:'燉熊掌', skill:'cooking', costs:{bearPaw:1}, yields:{bearStew:1}, stamina:2},
  flour:{name:'小麥粉', skill:'cooking', costs:{wheat:3}, yields:{wheatFlour:1}, stamina:1},
  applePie:{name:'蘋果派', skill:'cooking', costs:{apple:2, wheatFlour:1}, yields:{applePie:1}, stamina:2},
  clamSoup:{name:'海鮮湯', skill:'cooking', costs:{fish:2, shrimp:1, mushroom:1}, yields:{clamSoup:1}, stamina:2},

  ironFirewood:{name:'鐵錠(柴)', skill:'smelting', costs:{ironOre:5, firewood:1}, yields:{ironIngot:1}, stamina:2},
  ironCoal:{name:'鐵錠(煤)', skill:'smelting', costs:{ironOre:10, coal:1}, yields:{ironIngot:2}, stamina:2},
  copperFirewood:{name:'銅錠(柴)', skill:'smelting', costs:{copperOre:5, firewood:1}, yields:{copperIngot:1}, stamina:2},
  copperCoal:{name:'銅錠(煤)', skill:'smelting', costs:{copperOre:10, coal:1}, yields:{copperIngot:2}, stamina:2},

  leather:{name:'皮革', skill:'tanning', costs:{hide:2}, yields:{leather:1}, stamina:1},
  softLeather:{name:'柔軟皮革', skill:'tanning', costs:{leather:1, herbTonic:1}, yields:{softLeather:1}, stamina:1},
  cottonThread:{name:'紡成棉線', skill:'tanning', costs:{cotton:3}, yields:{cottonThread:1}, stamina:1},
  cottonCloth:{name:'織成棉布', skill:'tanning', costs:{cottonThread:2}, yields:{cottonCloth:1}, stamina:1},
  grassThread:{name:'草線', skill:'tanning', costs:{fiber:4}, yields:{grassThread:1}, stamina:1},
  grassCloth:{name:'草布', skill:'tanning', costs:{grassThread:2}, yields:{grassCloth:1}, stamina:1},
  clothes:{name:'縫製衣服', skill:'tanning', costs:{cottonCloth:2, cottonThread:1}, yields:{clothes:1}, stamina:2},
  fishNetTool:{name:'魚網', skill:'tanning', costs:{grassCloth:2, grassThread:1}, yields:{fishNetTool:1}, unlock:'fishNet', stamina:2},

  herbTonic:{name:'鞣劑', skill:'alchemy', costs:{herb:4, mushroom:1, glassBottle:1}, yields:{herbTonic:1}, stamina:1},
  staminaPotion:{name:'體力藥劑', skill:'alchemy', costs:{herb:3, glassBottle:1}, yields:{staminaPotion:1}, stamina:1},
  boneMeal:{name:'骨粉', skill:'alchemy', costs:{bone:3}, yields:{boneMeal:1}, stamina:1},
  compost:{name:'肥料堆', skill:'alchemy', costs:{branch:2, leaf:4}, yields:{compost:1}, stamina:1},
  wheatSeedBundle:{name:'小麥種子', skill:'alchemy', costs:{wheat:1}, yields:{wheatSeed:10}, stamina:1},
  paper:{name:'紙張', skill:'alchemy', costs:{fiber:10}, yields:{paper:1}, stamina:1},
  ink:{name:'墨水', skill:'alchemy', costs:{herb:1, mushroom:1, coral:1}, yields:{ink:1}, stamina:1},
  note:{name:'破舊筆記', skill:'alchemy', costs:{paper:10, leather:1, ink:1}, yields:{note:1}, stamina:2},
  manual:{name:'入門教程', skill:'alchemy', costs:{paper:25, leather:5, ink:5}, yields:{manual:1}, stamina:3},
  coalPowder:{name:'碳粉', skill:'alchemy', costs:{coal:1}, yields:{coalPowder:1}, stamina:1},
  copperPowder:{name:'銅粉', skill:'alchemy', costs:{copperOre:1}, yields:{copperPowder:1}, stamina:1},
  ironPowder:{name:'鐵粉', skill:'alchemy', costs:{ironOre:1}, yields:{ironPowder:1}, stamina:1},
  silverPowder:{name:'銀粉', skill:'alchemy', costs:{silverOre:1}, yields:{silverPowder:1}, stamina:1},
  goldPowder:{name:'金粉', skill:'alchemy', costs:{goldOre:1}, yields:{goldPowder:1}, stamina:1},
  magnetitePowder:{name:'磁石粉', skill:'alchemy', costs:{magnetite:1}, yields:{magnetitePowder:1}, stamina:1},
  crystalPowder:{name:'水晶粉', skill:'alchemy', costs:{crystal:1}, yields:{crystalPowder:1}, stamina:1},
  gemPowder:{name:'寶石粉', skill:'alchemy', costs:{gem:1}, yields:{gemPowder:1}, stamina:1},

  woodAxeTool:{name:'木斧', skill:'woodworking', costs:{wood:3, fiber:1}, yields:{woodAxeTool:1}, stamina:1},
  woodPickTool:{name:'木鎬', skill:'woodworking', costs:{wood:4, fiber:1}, yields:{woodPickTool:1}, stamina:1},
  woodShovelTool:{name:'木鏟', skill:'woodworking', costs:{wood:3, fiber:1}, yields:{woodShovelTool:1}, stamina:1},
  woodCarvingKnifeTool:{name:'木刻刀', skill:'woodworking', costs:{wood:2, fiber:1}, yields:{woodCarvingKnifeTool:1}, stamina:1},
  woodHammerTool:{name:'木鎚子', skill:'woodworking', costs:{wood:4, fiber:1}, yields:{woodHammerTool:1}, stamina:1},
  woodPotTool:{name:'木鍋子', skill:'woodworking', costs:{wood:4, leaf:2}, yields:{woodPotTool:1}, stamina:1},
  woodHoeTool:{name:'木鋤頭', skill:'woodworking', costs:{wood:3, fiber:1}, yields:{woodHoeTool:1}, stamina:1},
  woodPitchforkTool:{name:'木草叉', skill:'woodworking', costs:{wood:3, fiber:1}, yields:{woodPitchforkTool:1}, stamina:1},
  woodFishingRodTool:{name:'木釣竿', skill:'woodworking', costs:{wood:3, fiber:2}, yields:{woodFishingRodTool:1}, stamina:1},
  woodBowTool:{name:'木弓', skill:'woodworking', costs:{wood:3, fiber:2}, yields:{woodBowTool:1}, stamina:1},
  stoneAxeTool:{name:'石斧', skill:'smelting', costs:{stone:2, wood:1, fiber:1}, yields:{stoneAxeTool:1}, unlock:'stoneAxe', stamina:1},
  stonePickTool:{name:'石鎬', skill:'smelting', costs:{stone:3, wood:1}, yields:{stonePickTool:1}, unlock:'stonePick', stamina:1},
  shovelTool:{name:'石鏟', skill:'smelting', costs:{stone:2, wood:1}, yields:{shovelTool:1}, unlock:'shovel', stamina:1},
  stoneCarvingKnifeTool:{name:'石刻木刀', skill:'smelting', costs:{stone:2, wood:1}, yields:{stoneCarvingKnifeTool:1}, unlock:'stoneKnife', stamina:1},
  stoneHammerTool:{name:'石鎚子', skill:'smelting', costs:{stone:3, wood:1}, yields:{stoneHammerTool:1}, unlock:'stoneHammer', stamina:1},
  stonePotTool:{name:'石鍋子', skill:'smelting', costs:{stone:3, wood:1}, yields:{stonePotTool:1}, unlock:'stonePot', stamina:1},
  stoneHoeTool:{name:'石鋤頭', skill:'smelting', costs:{stone:2, wood:1}, yields:{stoneHoeTool:1}, unlock:'stoneHoe', stamina:1},
  stonePitchforkTool:{name:'石草叉', skill:'smelting', costs:{stone:2, wood:1}, yields:{stonePitchforkTool:1}, unlock:'stonePitchfork', stamina:1},
  stoneBowTool:{name:'石弓', skill:'smelting', costs:{wood:2, stone:2, fiber:2}, yields:{stoneBowTool:1}, unlock:'stoneBow', stamina:1},
  fishingRodTool:{name:'石釣竿', skill:'smelting', costs:{wood:2, fiber:2}, yields:{fishingRodTool:1}, unlock:'fishingRod', stamina:1},

  copperAxeTool:{name:'銅斧', skill:'smelting', costs:{copperIngot:1, wood:2}, yields:{copperAxeTool:1}, unlock:'copperAxe', stamina:1},
  copperShovelTool:{name:'銅鏟', skill:'smelting', costs:{copperIngot:1, wood:2}, yields:{copperShovelTool:1}, unlock:'copperShovel', stamina:1},
  copperPickTool:{name:'銅鎬', skill:'smelting', costs:{copperIngot:2, wood:2}, yields:{copperPickTool:1}, unlock:'copperPick', stamina:1},
  copperCarvingKnifeTool:{name:'銅刻木刀', skill:'smelting', costs:{copperIngot:1, wood:1}, yields:{copperCarvingKnifeTool:1}, unlock:'copperKnife', stamina:1},
  copperHammerTool:{name:'銅鎚子', skill:'smelting', costs:{copperIngot:2, wood:1}, yields:{copperHammerTool:1}, unlock:'copperHammer', stamina:1},
  copperPotTool:{name:'銅鍋子', skill:'smelting', costs:{copperIngot:2, wood:1}, yields:{copperPotTool:1}, unlock:'copperPot', stamina:1},
  copperHoeTool:{name:'銅鋤頭', skill:'smelting', costs:{copperIngot:1, wood:2}, yields:{copperHoeTool:1}, unlock:'copperHoe', stamina:1},
  copperPitchforkTool:{name:'銅草叉', skill:'smelting', costs:{copperIngot:1, wood:2}, yields:{copperPitchforkTool:1}, unlock:'copperPitchfork', stamina:1},
  copperBowTool:{name:'銅弓', skill:'smelting', costs:{copperIngot:1, wood:2, fiber:2}, yields:{copperBowTool:1}, unlock:'copperBow', stamina:1},
  copperFishingRodTool:{name:'銅釣竿', skill:'smelting', costs:{copperIngot:1, fiber:2}, yields:{copperFishingRodTool:1}, unlock:'copperFishingRod', stamina:1},
  ironAxeTool:{name:'鐵斧', skill:'smelting', costs:{ironIngot:1, wood:2}, yields:{ironAxeTool:1}, unlock:'ironAxe', stamina:1},
  ironShovelTool:{name:'鐵鏟', skill:'smelting', costs:{ironIngot:1, wood:2}, yields:{ironShovelTool:1}, unlock:'ironShovel', stamina:1},
  ironPickTool:{name:'鐵鎬', skill:'smelting', costs:{ironIngot:2, wood:2}, yields:{ironPickTool:1}, unlock:'ironPick', stamina:1},
  ironCarvingKnifeTool:{name:'鐵刻木刀', skill:'smelting', costs:{ironIngot:1, wood:1}, yields:{ironCarvingKnifeTool:1}, unlock:'ironKnife', stamina:1},
  ironHammerTool:{name:'鐵鎚子', skill:'smelting', costs:{ironIngot:2, wood:1}, yields:{ironHammerTool:1}, unlock:'ironHammer', stamina:1},
  ironPotTool:{name:'鐵鍋子', skill:'smelting', costs:{ironIngot:2, wood:1}, yields:{ironPotTool:1}, unlock:'ironPot', stamina:1},
  ironHoeTool:{name:'鐵鋤頭', skill:'smelting', costs:{ironIngot:1, wood:2}, yields:{ironHoeTool:1}, unlock:'ironHoe', stamina:1},
  ironPitchforkTool:{name:'鐵草叉', skill:'smelting', costs:{ironIngot:1, wood:2}, yields:{ironPitchforkTool:1}, unlock:'ironPitchfork', stamina:1},
  ironBowTool:{name:'鐵弓', skill:'smelting', costs:{ironIngot:1, wood:2, fiber:2}, yields:{ironBowTool:1}, unlock:'ironBow', stamina:1},
  ironFishingRodTool:{name:'鐵釣竿', skill:'smelting', costs:{ironIngot:1, fiber:2}, yields:{ironFishingRodTool:1}, unlock:'ironFishingRod', stamina:1}
};

function isInfiniteCraftCount(count){
  const n = Math.floor(toFiniteNumber(count, 0));
  return n === 9999 || n < 0;
}
function isInfiniteCraftQueueItem(item){
  return !!item && isInfiniteCraftCount(item.count);
}
function sanitizeCraftInfiniteState(targetState=state){
  if(!targetState) return [];
  if(!Array.isArray(targetState.craftQueue)) targetState.craftQueue = [];
  const removed = [];
  let keptQueueInfinite = false;
  const hasAuto = !!targetState.autoCraft;
  targetState.craftQueue = targetState.craftQueue.filter(item => {
    if(!isInfiniteCraftQueueItem(item)) return true;
    if(hasAuto){
      removed.push(item);
      return false;
    }
    if(keptQueueInfinite){
      removed.push(item);
      return false;
    }
    item.count = 9999;
    keptQueueInfinite = true;
    return true;
  });
  if(hasAuto){
    targetState.autoCraftInfinite = true;
    targetState.craftRepeat = true;
  }
  return removed;
}
function clearInfiniteCraftState(options={}){
  const { silent=false } = options;
  const removedNames = [];
  if(state.autoCraft){
    removedNames.push(crafts[state.autoCraft]?.name || state.autoCraft);
    state.autoCraft = null;
    state.autoCraftInfinite = false;
    state.craftRepeat = false;
  }
  if(Array.isArray(state.craftQueue) && state.craftQueue.length){
    const removed = [];
    state.craftQueue = state.craftQueue.filter(item => {
      if(!isInfiniteCraftQueueItem(item)) return true;
      removed.push(item);
      return false;
    });
    removed.forEach(item => removedNames.push(crafts[item.id]?.name || item.id));
  }
  const uniqueNames = [...new Set(removedNames.filter(Boolean))];
  if(uniqueNames.length && !silent) addLog(`已清除舊的無限製作排程：${uniqueNames.join('、')}。`);
  return uniqueNames;
}

function enqueueCraft(craftId, count){
  const def = crafts[craftId];
  if(!def) return;
  if(def.unlock && !state.research[def.unlock]) return addLog(`尚未研究${researchDefs[def.unlock].name}。`);
  const normalizedCount = isInfiniteCraftCount(count) ? 9999 : Math.max(1, Math.floor(toFiniteNumber(count, 1)));
  if(normalizedCount === 9999){
    const cleared = clearInfiniteCraftState({silent:true});
    if(cleared.length) addLog(`已清除舊的無限製作排程：${cleared.join('、')}。`);
  }
  if(state.craftQueue.length >= 3) return addLog('製作排程已滿，最多只能等待 3 格。');
  state.craftQueue.push({id:craftId, count:normalizedCount});
  addLog(`已排入製作：${def.name}${normalizedCount === 9999 ? '（∞）' : ` × ${normalizedCount}`}。`);
}
let lastCraftBeginError = '';
function beginCraftCycle(craftId, silent=false, fromWorker=false){
  lastCraftBeginError = '';
  const def = crafts[craftId];
  if(!def) return false;
  if(def.unlock && !state.research[def.unlock]){
    lastCraftBeginError = 'unlock';
    if(!silent) addLog(`尚未研究${researchDefs[def.unlock].name}。`);
    return false;
  }
  if(!canAffordResources(def.costs)){
    lastCraftBeginError = 'resources';
    state.craftPausedForStamina = false;
    if(!silent){
      const needText = formatCostBundle(def.costs);
      const missingText = formatMissingResources(def.costs);
      addLog(`材料不足，製作${def.name}需要：${needText}${missingText ? `；尚缺：${missingText}` : ''}`);
    }
    return false;
  }
  if(!fromWorker){
    const staminaCost = def.stamina || 1;
    if(state.stamina < staminaCost){
      lastCraftBeginError = 'stamina';
      if(!state.craftPausedForStamina || state.craftPausedName !== def.name){
        addLog(`體力不足，製作${def.name}已暫停，恢復後會自動繼續。`, true, 'important');
      }
      state.craftPausedForStamina = true;
      state.craftPausedName = def.name;
      return false;
    }
    state.stamina -= staminaCost;
  }
  state.craftPausedForStamina = false;
  state.craftPausedName = '';
  spendResources(def.costs);
  const dur = getCraftDuration(craftId, fromWorker);
  const outputMultiplier = getCraftOutputMultiplier(craftId, fromWorker);
  state.craftAction = {type:'craft', id:craftId, remaining:dur, total:dur, fromWorker, outputMultiplier};
  return true;
}
function tryStartNextCraftNow(){
  if(state.craftAction) return false;
  if(state.craftQueue.length){
    const next = state.craftQueue[0];
    if(beginCraftCycle(next.id, true)){
      next.count -= 1;
      if(next.count <= 0) state.craftQueue.shift();
      return true;
    }
    if(lastCraftBeginError !== 'stamina') state.craftQueue.shift();
  }
  if(state.autoCraft){
    if(beginCraftCycle(state.autoCraft, true)) return true;
    if(lastCraftBeginError !== 'stamina'){
      state.autoCraft = null;
      state.autoCraftInfinite = false;
      state.craftRepeat = false;
    }
    return false;
  }
  return false;
}
function cancelCurrentCraft(options={}){
  const { refundMaterials=true, startNext=true, silent=false } = options;
  if(!state.craftAction){
    if(state.autoCraft){
      const name = crafts[state.autoCraft]?.name || '製作';
      state.autoCraft = null;
      state.autoCraftInfinite = false;
      state.craftRepeat = false;
      state.craftPausedForStamina = false;
      state.craftPausedName = '';
      if(!silent){
        addLog(`已取消待命中的重複製作：${name}。`);
        render();
      }
      return true;
    }
    if(!silent) addLog('目前沒有正在製作中的項目。');
    return false;
  }
  const action = state.craftAction;
  const def = crafts[action.id];
  state.craftAction = null;
  if(state.autoCraft === action.id){
    state.autoCraft = null;
    state.autoCraftInfinite = false;
    state.craftRepeat = false;
  }
  state.craftPausedForStamina = false;
  state.craftPausedName = '';
  let refundText = '';
  if(refundMaterials && def?.costs){
    Object.entries(def.costs).forEach(([id, amt]) => gainResource(id, amt));
    refundText = ` 已退回材料：${formatCostBundle(def.costs)}。`;
  }
  if(!silent) addLog(`已取消目前製作：${def?.name || '未知配方'}。${refundText}`.trim());
  if(startNext) tryStartNextCraftNow();
  if(!silent) render();
  return true;
}
function stopAutoCraft(){
  const currentName = state.autoCraft && crafts[state.autoCraft] ? crafts[state.autoCraft].name : '';
  state.autoCraft = null;
  state.autoCraftInfinite = false;
  state.craftRepeat = false;
  state.craftQueue = [];
  addLog(currentName ? `已停止${currentName}的重複製作，並清空排程。` : '已停止製作，並清空排程。');
  render();
}
function startCraft(craftId){
  if(!crafts[craftId]) return;
  scheduleCraftAction(craftId, 1, 'start');
}

const craftStaminaCosts = {
  plank:1, stoneBrick:2, brickFirewood:2, brickCoal:2, glassFirewood:2, glassCoal:2, bottle:1,
  sashimi:1, grilledMeat:1, grilledFish:1, bread:1, grilledSausage:1, bearStew:2, flour:1, applePie:2, clamSoup:2,
  ironFirewood:3, ironCoal:3, copperFirewood:3, copperCoal:3, leather:1, softLeather:1, herbTonic:1, staminaPotion:1, boneMeal:1, compost:1, wheatSeedBundle:1, paper:1, ink:1, note:2, manual:3, coalPowder:1, copperPowder:1, ironPowder:1, silverPowder:1, goldPowder:1, magnetitePowder:1, crystalPowder:1, gemPowder:1,
  cottonThread:1, cottonCloth:1, grassThread:1, grassCloth:1, clothes:2, fishNetTool:2,
  woodAxeTool:1, woodPickTool:1, woodShovelTool:1, woodCarvingKnifeTool:1, woodHammerTool:1, woodPotTool:1, woodHoeTool:1, woodPitchforkTool:1, woodFishingRodTool:1, woodBowTool:1,
  stoneAxeTool:1, stonePickTool:1, shovelTool:1, stoneCarvingKnifeTool:1, stoneHammerTool:1, stonePotTool:1, stoneHoeTool:1, stonePitchforkTool:1, stoneBowTool:1, fishingRodTool:1,
  copperAxeTool:1, copperPickTool:1, copperShovelTool:1, copperCarvingKnifeTool:1, copperHammerTool:1, copperPotTool:1, copperHoeTool:1, copperPitchforkTool:1, copperBowTool:1, copperFishingRodTool:1,
  ironAxeTool:1, ironPickTool:1, ironShovelTool:1, ironCarvingKnifeTool:1, ironHammerTool:1, ironPotTool:1, ironHoeTool:1, ironPitchforkTool:1, ironBowTool:1, ironFishingRodTool:1
};
Object.entries(craftStaminaCosts).forEach(([id, cost]) => { if(crafts[id]) crafts[id].stamina = cost; });

const houseBuilds = {
  cabin:{name:'小木屋', gold:20, costs:{planks:10, stoneBrick:4}},
  stoneHouse:{name:'中石屋', gold:60, costs:{planks:16, stoneBrick:12, brick:8}},
  wall:{name:'城牆段', gold:0, costs:{stoneBrick:5, planks:2, brick:3}}
};


function getHouseEffectText(key){
  if(key === 'cabin') return '效果：住房容量 +2';
  if(key === 'stoneHouse') return '效果：住房容量 +5，工人效率 +3%';
  if(key === 'wall') return '效果：城池經驗 +15';
  return '';
}
function getHouseBuiltCountText(key){
  const built = Math.max(0, Math.floor((state.houses && state.houses[key]) || 0));
  return `已建：${built} 棟`;
}
function getHouseExtraStatusText(key){
  if(key === 'cabin' || key === 'stoneHouse'){
    return `目前總住房容量：${housingCap()}｜目前住房：${state.workers.length}/${housingCap()}`;
  }
  if(key === 'wall'){
    return `目前城牆段數：${Math.max(0, Math.floor((state.houses && state.houses.wall) || 0))}/${wallCap()}｜城池等級：Lv.${state.castleLevel}｜安全值 ${safetyValue()}`;
  }
  return '';
}

function bindHouseButtons(){
  document.querySelectorAll('[data-build]').forEach(btn => {
    const key = btn.dataset.build;
    const def = houseBuilds[key];
    btn.type = 'button';
    const cap = getHouseBuildCap(key);
    const discountedCosts = applyBuildingResourceDiscount(def.costs);
    const unlocked = isHouseUnlocked(key);
    const shouldHide = key !== 'cabin' && !unlocked && (state.houses[key] || 0) === 0;
    if(shouldHide){
      btn.style.display = 'none';
      return;
    }
    btn.style.display = '';
    btn.textContent = key === 'cabin'
      ? `小木屋${state.houses[key] >= cap ? '（已上限）' : ''}`
      : key === 'stoneHouse'
        ? `中石屋${state.houses[key] >= cap ? '（已上限）' : ''}`
        : `城牆段${state.houses[key] >= cap ? '（已上限）' : ''}`;
    btn.title = `${def.name}\n需求金幣：${def.gold}\n需求材料：${formatCostBundle(discountedCosts)}\n${getHouseEffectText(key)}\n${getHouseBuiltCountText(key)}\n可建上限：${cap}\n${getHouseExtraStatusText(key)}`;
    btn.disabled = state.houses[key] >= cap;
    btn.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); if(!btn.disabled) buildHouse(key); };
    btn.onclick = (e) => { e.preventDefault(); };
  });
}


function buildHouse(key){
  const def = houseBuilds[key];
  if(!isHouseUnlocked(key) && key !== 'cabin' && (state.houses[key] || 0) === 0) return addLog(`尚未研究${def.name}。`);
  const cap = getHouseBuildCap(key);
  if(state.houses[key] >= cap) return addLog(`${def.name}（已上限）。目前 ${state.houses[key]}/${cap}。`);
  const discountedCosts = applyBuildingResourceDiscount(def.costs);
  if(!canAffordResources(discountedCosts)){
    const needText = formatCostBundle(discountedCosts);
    const missingText = formatMissingResources(discountedCosts);
    return addLog(`建材不足，建造${def.name}需要：${needText}${missingText ? `；尚缺：${missingText}` : ''}`);
  }
  spendResources(discountedCosts);
  if(def.gold && !spendGold(def.gold)){
    Object.entries(discountedCosts).forEach(([id,amt]) => gainResource(id,amt));
    return addLog(`金幣不足，建造${def.name}需要：${def.gold} 金；尚缺：${Math.max(0, def.gold - toFiniteNumber(state.gold, 0))} 金。`);
  }
  const oldCycles = {};
  if(key === 'stoneHouse'){
    state.workers.forEach(w => {
      oldCycles[w.id] = getWorkerCycleTime(w.job);
    });
  }
  state.houses[key] += 1;
  if(key === 'stoneHouse'){
    state.workers.forEach(w => {
      if(w.switchCooldown > 0 || w.job === 'idle') return;
      const oldCycle = Math.max(0.01, oldCycles[w.id] || 15);
      const newCycle = Math.max(0.01, getWorkerCycleTime(w.job));
      w.remaining = Math.max(0, w.remaining * (newCycle / oldCycle));
    });
  }
  const gainedCastleExp = castleExpBase[key] || 0;
  if(gainedCastleExp) addCastleExp(gainedCastleExp);
  if(def.gold) addManagementFromSpend(def.gold);
  addLog(`完成建築：${def.name}${gainedCastleExp ? `，城池經驗 +${gainedCastleExp}` : ''}。目前住房 ${state.workers.length}/${housingCap()}。`);
  render();
}

function upgradeBuilding(key){
  const building = buildingDefs[key];
  if(!isBuildUnlocked(key) && (state.buildings[key] || 0) === 0) return addLog(`尚未研究${building.name}。`);
  const lv = state.buildings[key];
  if(lv >= building.max) return addLog(`${building.name}（已上限）。`);
  const rawCost = building.cost(lv + 1);
  const discountedResources = applyBuildingResourceDiscount(rawCost.resources);
  if(!canAffordResources(discountedResources)){
    const needText = formatCostBundle(discountedResources);
    const missingText = formatMissingResources(discountedResources);
    return addLog(`建材不足，升級${building.name}需要：${needText}${missingText ? `；尚缺：${missingText}` : ''}`);
  }
  spendResources(discountedResources);
  if(!spendGold(rawCost.gold)){
    Object.entries(discountedResources).forEach(([id,amt]) => gainResource(id,amt));
    return addLog(`金幣不足，升級${building.name}需要：${rawCost.gold} 金；尚缺：${Math.max(0, rawCost.gold - toFiniteNumber(state.gold, 0))} 金。`);
  }
  state.buildings[key] += 1;
  const gainedCastleExp = castleExpUpgrade[key] || 0;
  if(gainedCastleExp) addCastleExp(gainedCastleExp);
  addManagementFromSpend(rawCost.gold);
  addLog(`${building.name} 升到 Lv.${state.buildings[key]}${gainedCastleExp ? `，城池經驗 +${gainedCastleExp}` : ''}。`);
  render();
}


function recruitWorker(){
  if(state.workers.length >= housingCap()) return addLog('沒有住房空位，不能招募工人。');
  if(!spendGold(40)) return addLog('金幣不足，無法招募工人。');
  addManagementFromSpend(40);
  state.workers.push({id:state.nextWorkerId++, job:'idle', remaining:getWorkerCycleTime(), switchCooldown:0, maxStamina:30, stamina:30, toolId:'', toolDurability:0, clothesEquipped:false, clothesDurability:0, toolPreference:'auto', foodPreference:'auto', craftRecipe:'plank'});
  addLog('成功招募一名工人。');
  render();
}
function setWorkerJob(id, job, options={}){
  const { silent=false, rerender=true } = options;
  const worker = state.workers.find(w => w.id === id);
  if(!worker) return false;
  if(worker.switchCooldown > 0){
    if(!silent) addLog(`工人 #${id} 剛換崗，請稍後再調度。`);
    return false;
  }
  worker.job = job;
  worker.remaining = getWorkerCycleTime(job === 'idle' ? null : job);
  worker.switchCooldown = 10;
  if(job === 'idle'){ worker.toolId=''; worker.toolDurability=0; }
  if(!silent) addLog(`工人 #${id} 已指派到：${jobDisplayName(job)}。`);
  if(rerender) render();
  return true;
}

function adjustWorkersForJob(job, delta){
  if(delta > 0){
    const idleWorker = state.workers.find(w => w.job === 'idle' && w.switchCooldown <= 0);
    if(!idleWorker){ addLog(`沒有可立即指派到${jobDisplayName(job)}的待命工人。`); return; }
    setWorkerJob(idleWorker.id, job, {silent:true, rerender:false});
    addLog(`已快速指派工人 #${idleWorker.id} 到${jobDisplayName(job)}。`);
    render();
    return;
  }
  if(delta < 0){
    const assignedWorker = [...state.workers].reverse().find(w => w.job === job && w.switchCooldown <= 0);
    if(!assignedWorker){ addLog(`${jobDisplayName(job)}沒有可立即撤回的工人。`); return; }
    setWorkerJob(assignedWorker.id, 'idle', {silent:true, rerender:false});
    addLog(`已將工人 #${assignedWorker.id} 從${jobDisplayName(job)}調回待命。`);
    render();
  }
}
function payDebt(){
  if(state.salaryDebt <= 0) return addLog('目前沒有欠薪。');
  if(!spendGold(state.salaryDebt)) return addLog('金幣不足，無法支付欠薪。');
  addManagementFromSpend(state.salaryDebt);
  addLog(`已支付欠薪 ${state.salaryDebt} 金。`);
  state.salaryDebt = 0;
  render();
}

function getAutoCookCraftId(worker=null){
  const pref = worker && worker.cookRecipe && worker.cookRecipe !== 'auto' ? worker.cookRecipe : '';
  if(pref && crafts[pref] && canAffordResources(crafts[pref].costs)) return pref;
  const order = ['grilledMeat','grilledFish','bread','grilledSausage','clamSoup','applePie','bearStew'];
  return order.find(id => crafts[id] && canAffordResources(crafts[id].costs)) || '';
}

function processRanch(worker){
  const workerId = worker.id;
  const drops = {};
  const add = (res, amt) => { if(amt<=0) return; gainResource(res, amt); drops[res] = (drops[res] || 0) + amt; };
  let acted = false;
  let progressOnly = hasActiveRanchBreedingProgress();
  const ranchBonus = state.buildings.ranch * 0.03;
  Object.keys(animalFeedDefs).forEach(id => {
    if(!state.ranchData[id] || typeof state.ranchData[id] !== 'object') state.ranchData[id] = {fed:0, timer:0, enabled:true};
    if(typeof state.ranchData[id].enabled !== 'boolean') state.ranchData[id].enabled = true;
  });

  const tryAutoFeed = (id) => {
    if(!isAnimalBreedingEnabled(id)) return false;
    const def = animalFeedDefs[id];
    const ranchState = state.ranchData[id];
    if(!def || !ranchState) return false;
    if((state.resources[id] || 0) <= 0) return false;
    if((state.resources[def.food] || 0) < def.amount) return false;
    spendResource(def.food, def.amount);
    ranchState.fed += 1;
    acted = true;
    progressOnly = true;
    return true;
  };

  const singleAnimals = ['chicken','rabbit','boar','deer','wolf','brownBear','blackBear'];
  const needFeedSingles = singleAnimals.filter(id => isAnimalBreedingEnabled(id) && (state.resources[id] || 0) >= 2 && (state.ranchData[id]?.fed || 0) <= 0);
  if(needFeedSingles.length){
    tryAutoFeed(needFeedSingles[0]);
  }

  const pairReady = isAnimalBreedingEnabled('dairyCow') && isAnimalBreedingEnabled('bull') && (state.resources.dairyCow || 0) >= 1 && (state.resources.bull || 0) >= 1;
  if(pairReady){
    if((state.ranchData.dairyCow.fed || 0) <= 0) tryAutoFeed('dairyCow');
    if((state.ranchData.bull.fed || 0) <= 0) tryAutoFeed('bull');
  }

  const chickenFeed = animalFeedDefs.chicken;
  if((state.resources.chicken || 0) >= 1 && (state.resources[chickenFeed.food] || 0) >= chickenFeed.eggFoodPerCycle){
    spendResource(chickenFeed.food, chickenFeed.eggFoodPerCycle);
    add('egg', randInt(1, Math.max(2, 2 + state.buildings.ranch)));
    if(roll(0.35 + ranchBonus)) add('feather', randInt(1,2));
    acted = true;
  }
  const didWork = acted || progressOnly;
  if(didWork){
    autoCullExcessAnimals(false);
    addSkillExp('farming', 0.05);
    addMainExp(0.10);
    addManagementExp(0.3);
    const dropText = Object.entries(drops).map(([id,amt]) => `${resourceLabels[id]}${amt}`).join('、');
    if(dropText){
      addLog(`工人 #${workerId} 在牧場獲得：${dropText}。`, false, 'worker');
    }
  }
  return didWork;
}



