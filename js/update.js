function safeTickStep(name, fn){
  try{
    fn();
    if(state._runtimeErrors && state._runtimeErrors[name]) delete state._runtimeErrors[name];
    return true;
  }catch(err){
    console.error(`[${name}]`, err);
    if(!state._runtimeErrors) state._runtimeErrors = {};
    const prev = state._runtimeErrors[name] || 0;
    const now = Date.now();
    state._runtimeErrors[name] = now;
    if(!prev || now - prev > 5000){
      addLog(`系統修復保護：${name} 更新時發生錯誤，已暫時跳過該段並讓其他讀條繼續。`, false, 'important');
    }
    return false;
  }
}

function updateTimersSystem(delta){
  state.campfireSec = Math.max(0, state.campfireSec - delta);
  state.staminaPotionBuff = Math.max(0, state.staminaPotionBuff - delta);
  state.staminaPotionCooldown = Math.max(0, state.staminaPotionCooldown - delta);
  state.salaryTimer -= delta;
  state.merchant.minuteCounter += delta;
  if(state.merchant.present){
    state.merchant.presentSec = Math.max(0, state.merchant.presentSec - delta);
    if(state.merchant.presentSec <= 0){
      state.merchant.present = false;
      state.merchant.cash = 0;
      state.merchant.maxCash = 0;
      addLog('商人離開了城鎮。', false);
    }
  }
  if(state.merchant.minuteCounter >= 60){
    state.merchant.minuteCounter -= 60;
    if(!state.merchant.present && roll(merchantChancePerMinute())){
      state.merchant.present = true;
      state.merchant.presentSec = 60;
      state.merchant.maxCash = merchantCashPerVisit();
      state.merchant.cash = state.merchant.maxCash;
      state.merchant.lastStoreInjection = state.merchant.maxCash;
      state.merchant.storeFunds = Math.max(0, Math.floor(toFiniteNumber(state.merchant.storeFunds, 0))) + state.merchant.lastStoreInjection;
      const addedOrders = addMerchantOrders(randInt(1,2));
      addLog(`有商人來到城裡張貼收購布告，共新增 ${addedOrders} 張訂單，並替商店投入 ${state.merchant.lastStoreInjection} 金（目前商店資金 ${state.merchant.storeFunds}，安全值 ${safetyValue()}）。`, false);
    }
  }
  if(state.salaryTimer <= 0){
    const tax = currentTaxIncome();
    if(tax > 0){
      state.pendingTax += tax;
      addLog(`已累積稅收 ${tax} 金（安全值 ${safetyValue()}、城池等級 Lv.${state.castleLevel}）。`, false);
    }
    const baseWage = 8 * state.workers.length;
    const wage = effectiveWorkerWage() * state.workers.length;
    if(wage > 0){
      if(state.gold >= wage){
        state.gold -= wage;
        addManagementExp(Math.max(1, Math.floor(baseWage * 0.5)));
        addLog(`已支付工人薪資 ${wage} 金（原始薪資 ${baseWage} 金）。`, false);
      }else{
        state.salaryDebt += wage;
        addLog(`金幣不足，累積欠薪 ${wage} 金，工人停止工作。`, false);
      }
    }
    state.salaryTimer += 300;
  }
  restoreStamina(getRegenRate(state.isResting) * delta, true);
  runPlayerAutoEat();
  maybeResumeAfterAutoRest();
}

function updateProductionSystem(delta){
  if(state.productionAction){
    state.productionAction.remaining -= delta;
    if(state.productionAction.remaining <= 0){
      const action = state.productionAction;
      state.productionAction = null;
      if(action.type === 'work'){
        const result = getScaledProductionResult(action.id, toFiniteNumber(action.outputMultiplier, 1));
        applyWorkResult(action.id, result, false);
        if(state.autoWork){
          if(state.autoWorkCount > 0) state.autoWorkCount -= 1;
          if(state.autoWorkCount === 0) state.autoWork = null;
        }
        if(state.autoWork) beginWorkCycle(state.autoWork, {silent:true});
        else if(state.workQueue.length && !state.isResting) tryStartQueuedWork();
      }
    }
  }else if(state.autoWork && !state.isResting){
    beginWorkCycle(state.autoWork, {silent:true});
  }else if(state.workQueue.length && !state.isResting){
    tryStartQueuedWork();
  }
}

function updateCraftSystem(delta){
  if(state.craftAction){
    state.craftAction.remaining -= delta;
    if(state.craftAction.remaining <= 0){
      const action = state.craftAction;
      state.craftAction = null;
      const def = crafts[action.id];
      if(def){
        const outputMultiplier = Math.max(1, toFiniteNumber(action.outputMultiplier, 1));
        const scaledYields = scaleCraftYields(action.id, def.yields, outputMultiplier);
        Object.entries(scaledYields).forEach(([id,amt]) => gainResource(id,amt));
        addSkillExp(def.skill, (action.fromWorker ? 0.15 : 1) * outputMultiplier);
        addMainExp((action.fromWorker ? 0.2 : 0.8) * outputMultiplier);
        if(action.fromWorker) addManagementExp(0.2 * outputMultiplier);
        const actualYieldText = Object.entries(scaledYields).map(([id,amt])=>`${resourceLabels[id]}${amt}`).join('、');
        const multiplierText = outputMultiplier > 1.001 ? `（${CRAFT_MIN_CYCLE_SECONDS} 秒產出 ×${outputMultiplier.toFixed(2)}）` : '';
        addLog(action.fromWorker ? `工人製作完成${multiplierText}：${actualYieldText}。` : craftCompletionText(def, scaledYields, outputMultiplier), false, 'loot');
      }
      if(state.craftQueue.length){
        const next = state.craftQueue[0];
        if(beginCraftCycle(next.id, false)){
          next.count -= 1;
          if(next.count <= 0) state.craftQueue.shift();
        }else if(lastCraftBeginError !== 'stamina'){
          state.craftQueue.shift();
        }
      } else if(state.autoCraft === action.id){
        if(!beginCraftCycle(action.id, true)){
          const def2 = crafts[action.id];
          if(lastCraftBeginError !== 'stamina' && def2){
            const needText = formatCostBundle(def2.costs);
            const missingText = formatMissingResources(def2.costs);
            addLog(`重複製作停止：${def2.name}需要 ${needText}${missingText ? `；尚缺：${missingText}` : ''}`, false);
            state.autoCraft = null;
            state.autoCraftInfinite = false;
          }
        }
      }
    }
  }else if(state.craftQueue.length){
    const next = state.craftQueue[0];
    if(beginCraftCycle(next.id, false)){
      next.count -= 1;
      if(next.count <= 0) state.craftQueue.shift();
    }else if(lastCraftBeginError !== 'stamina'){
      state.craftQueue.shift();
    }
  }else if(state.autoCraft){
    if(!beginCraftCycle(state.autoCraft, true)){
      if(lastCraftBeginError !== 'stamina'){
        const def = crafts[state.autoCraft];
        if(def){
          const needText = formatCostBundle(def.costs);
          const missingText = formatMissingResources(def.costs);
          addLog(`重複製作停止：${def.name}需要 ${needText}${missingText ? `；尚缺：${missingText}` : ''}`, false);
        }
        state.autoCraft = null;
        state.autoCraftInfinite = false;
      }
    }
  }
}

function updateResearchSystem(delta){
  if(state.researchAction){
    state.researchAction.remaining -= delta;
    if(state.researchAction.remaining <= 0){
      const action = state.researchAction;
      state.researchAction = null;
      if(action.type === 'read'){
        const book = books[action.id];
        if(book){
          state.intelligence += book.intGain;
          addMainExp(book.expGain);
          addLog(`讀完《${book.name}》，智力 +${book.intGain}。`, false);
        }
      }else if(action.type === 'research'){
        const def = researchDefs[action.id];
        if(def){
          state.research[action.id] = true;
          state.intelligence += def.rewardInt;
          addMainExp(2);
          addLog(`研究完成：${def.name}。${getResearchUnlockResultText(def)}`, false);
        }
      }
      renderCraftActionButtons();
      renderBuildingButtons();
      bindHouseButtons();
      renderResearch();
      if(state.researchQueue.length) tryStartQueuedResearch();
    }
  }else if(state.researchQueue.length){
    tryStartQueuedResearch();
  }
}

function updatePlotsSystem(delta){
  state.plots.forEach(plot => {
    if(plot && plot.remaining > 0) plot.remaining = Math.max(0, plot.remaining - delta);
  });
}

function updateRanchSystem(delta){
  if(!state.ranchData || typeof state.ranchData !== 'object') state.ranchData = createInitialRanchData();
  Object.keys(animalFeedDefs).forEach(id => {
    if(!state.ranchData[id] || typeof state.ranchData[id] !== 'object') state.ranchData[id] = {fed:0, timer:0, enabled:true};
    if(typeof state.ranchData[id].enabled !== 'boolean') state.ranchData[id].enabled = true;
    state.ranchData[id].timer = Math.max(0, toFiniteNumber(state.ranchData[id].timer, 0));
    state.ranchData[id].fed = Math.max(0, Math.floor(toFiniteNumber(state.ranchData[id].fed, 0)));
  });
  autoCullExcessAnimals(false);

  const ranchWorkers = getActiveRanchWorkersCount();
  if(ranchWorkers <= 0) return;

  const ranchBonus = state.buildings.ranch * 0.03;
  const progressGain = Math.max(0, toFiniteNumber(delta, 0)) * ranchWorkers;
  if(progressGain <= 0) return;

  const births = {};
  const addBirth = (id, amt=1) => {
    if(amt <= 0) return;
    gainResource(id, amt);
    births[id] = (births[id] || 0) + amt;
  };

  const singleAnimals = ['chicken','rabbit','boar','deer','wolf','brownBear','blackBear'];
  singleAnimals.forEach(id => {
    const ranchState = state.ranchData[id];
    if(!isAnimalBreedingEnabled(id)) return;
    if((state.resources[id] || 0) < 2 || ranchState.fed <= 0) return;
    ranchState.timer += progressGain;
    const need = getAnimalBreedSeconds(id);
    while(ranchState.timer >= need && ranchState.fed > 0){
      ranchState.timer -= need;
      ranchState.fed = Math.max(0, ranchState.fed - 1);
      if(roll(animalFeedDefs[id].hatchChance + ranchBonus)) addBirth(id, 1);
    }
  });

  const cowEnabled = isAnimalBreedingEnabled('dairyCow');
  const bullEnabled = isAnimalBreedingEnabled('bull');
  if(cowEnabled && bullEnabled && (state.resources.dairyCow || 0) >= 1 && (state.resources.bull || 0) >= 1 && state.ranchData.dairyCow.fed > 0 && state.ranchData.bull.fed > 0){
    state.ranchData.dairyCow.timer += progressGain;
    state.ranchData.bull.timer += progressGain;
    const need = Math.max(getAnimalBreedSeconds('dairyCow'), getAnimalBreedSeconds('bull'));
    while(state.ranchData.dairyCow.timer >= need && state.ranchData.bull.timer >= need && state.ranchData.dairyCow.fed > 0 && state.ranchData.bull.fed > 0){
      state.ranchData.dairyCow.timer -= need;
      state.ranchData.bull.timer -= need;
      state.ranchData.dairyCow.fed = Math.max(0, state.ranchData.dairyCow.fed - 1);
      state.ranchData.bull.fed = Math.max(0, state.ranchData.bull.fed - 1);
      if(roll(0.90 + ranchBonus)) addBirth(Math.random() < 0.55 ? 'dairyCow' : 'bull', 1);
    }
  }

  if(Object.keys(births).length){
    autoCullExcessAnimals(false);
    const birthText = Object.entries(births).map(([id, amt]) => `${resourceLabels[id]}${amt}`).join('、');
    addLog(`牧場繁殖完成：${birthText}。`, false, 'worker');
  }
}

function updateWorkersSystem(delta){
  state.workers.forEach(worker => {
    if(!worker || typeof worker !== 'object') return;
    if(worker.switchCooldown > 0) worker.switchCooldown = Math.max(0, worker.switchCooldown - delta);
    if(state.salaryDebt > 0 || worker.job === 'idle') return;
    const proactiveStaminaNeed = getWorkerStaminaCost(worker.job) * (worker.clothesEquipped && worker.clothesDurability > 0 ? 1 : 1.35);
    if(worker.stamina < proactiveStaminaNeed){
      workerEatIfNeeded(worker, proactiveStaminaNeed);
    }
    worker.remaining = Math.max(0, toFiniteNumber(worker.remaining, getWorkerEffectiveCycleTime(worker))) - delta;
    if(worker.remaining > 0) return;

    const needTool = getToolOptionsForJob(worker.job).length > 0;
    if(needTool && (!worker.toolId || worker.toolDurability <= 0)){
      if(!equipWorkerTool(worker)){
        addLog(`工人 #${worker.id} 缺少工具，無法進行${jobDisplayName(worker.job)}。`, false, 'worker');
        worker.remaining = 8;
        return;
      }
    }
    equipWorkerClothes(worker);

    const staminaNeed = getWorkerStaminaCost(worker.job) * (worker.clothesEquipped && worker.clothesDurability > 0 ? 1 : 1.35);
    if(worker.stamina < staminaNeed){
      workerEatIfNeeded(worker, staminaNeed);
      if(worker.stamina < staminaNeed){
        worker.stamina = Math.min(worker.maxStamina, worker.stamina + 2);
        addLog(`工人 #${worker.id} 體力不足，正在休息恢復。`, false, 'worker');
        worker.remaining = 10;
        return;
      }
    }

    let didWork = false;
    const outputMultiplier = getWorkerOutputMultiplier(worker);
    if(worker.job === 'farming'){
      let acted = false;
      for(let i=0;i<state.plots.length;i++){
        if(state.plots[i] && state.plots[i].remaining <= 0){ harvestPlot(i, worker.id, outputMultiplier); acted = true; break; }
      }
      if(!acted){
        const seedOrder = getFarmerSeedOrder(getWorkerFarmSeedPreference(worker));
        for(const seedId of seedOrder){
          if((state.resources[seedId] || 0) > 0 && tryPlantSeed(seedId, 'worker')){
            addLog(`工人 #${worker.id} 種下了${farmingDefs[seedId].name}。`, false, 'worker');
            addManagementExp(0.3);
            acted = true;
            break;
          }
        }
      }
      if(!acted && state.farmerAutoFertilize){
        const targetIndex = findBestGrowingPlotIndex();
        if(targetIndex >= 0){
          if((state.resources.compost || 0) > 0 && applyFertilizer(targetIndex, 'compost', 'worker')){ addManagementExp(0.3); acted = true; }
          else if((state.resources.boneMeal || 0) > 0 && applyFertilizer(targetIndex, 'boneMeal', 'worker')){ addManagementExp(0.3); acted = true; }
        }
      }
      didWork = acted;
      if(didWork) worker.stamina = Math.max(0, worker.stamina - staminaNeed);
      worker.remaining = getWorkerEffectiveCycleTime(worker);
      if(didWork) degradeWorkerEquipment(worker);
      return;
    }

    if(worker.job === 'crafting'){
      const craftId = worker.craftRecipe || 'plank';
      const def = crafts[craftId];
      if(def && canAffordResources(def.costs)){
        spendResources(def.costs);
        const scaledYields = scaleCraftYields(craftId, def.yields, outputMultiplier);
        Object.entries(scaledYields).forEach(([id,amt]) => gainResource(id,amt));
        addSkillExp(def.skill, 0.05 * outputMultiplier);
        addMainExp(0.10 * outputMultiplier);
        addManagementExp(0.3 * outputMultiplier);
        const yieldText = Object.entries(scaledYields).map(([id,amt])=>`${resourceLabels[id]}${amt}`).join('、');
        const multiplierText = outputMultiplier > 1.001 ? `（${WORKER_MIN_CYCLE_SECONDS} 秒產出 ×${outputMultiplier.toFixed(2)}）` : '';
        addLog(`工匠 #${worker.id} 完成${multiplierText}：${yieldText}。`, false, 'loot');
        didWork = true;
      }else{
        addLog(`工匠 #${worker.id} 缺少材料，無法製作${def ? def.name : '配方'}。`, false, 'important');
      }
      if(didWork) worker.stamina = Math.max(0, worker.stamina - staminaNeed);
      worker.remaining = getWorkerEffectiveCycleTime(worker);
      if(didWork) degradeWorkerEquipment(worker);
      return;
    }

    if(worker.job === 'cook'){
      const craftId = getAutoCookCraftId(worker);
      const def = crafts[craftId];
      if(def && canAffordResources(def.costs)){
        spendResources(def.costs);
        const scaledYields = scaleCraftYields(craftId, def.yields, outputMultiplier);
        Object.entries(scaledYields).forEach(([id,amt]) => gainResource(id,amt));
        addSkillExp('cooking', 0.05 * outputMultiplier);
        addMainExp(0.10 * outputMultiplier);
        addManagementExp(0.3 * outputMultiplier);
        const yieldText = Object.entries(scaledYields).map(([id,amt])=>`${resourceLabels[id]}${amt}`).join('、');
        const multiplierText = outputMultiplier > 1.001 ? `（${WORKER_MIN_CYCLE_SECONDS} 秒產出 ×${outputMultiplier.toFixed(2)}）` : '';
        addLog(`廚師 #${worker.id} 完成${multiplierText}：${yieldText}。`, false, 'loot');
        didWork = true;
      }else{
        addLog(`廚師 #${worker.id} 目前沒有可烹飪的材料（需要生肉 / 魚 / 內臟+麵粉 / 蛤肉 / 蘋果+麵粉 / 熊掌）。`, false, 'important');
      }
      if(didWork) worker.stamina = Math.max(0, worker.stamina - staminaNeed);
      worker.remaining = getWorkerEffectiveCycleTime(worker);
      if(didWork) degradeWorkerEquipment(worker);
      return;
    }

    if(worker.job === 'ranch'){
      didWork = processRanch(worker);
      if(didWork) worker.stamina = Math.max(0, worker.stamina - staminaNeed);
      worker.remaining = getWorkerEffectiveCycleTime(worker);
      if(didWork) degradeWorkerEquipment(worker);
      return;
    }

    const result = getScaledWorkerWorkResult(worker.job, outputMultiplier);
    applyWorkResult(worker.job, result, true, worker.id);
    worker.stamina = Math.max(0, worker.stamina - staminaNeed);
    worker.remaining = getWorkerEffectiveCycleTime(worker);
    degradeWorkerEquipment(worker);
  });
}

function update(delta){
  state._suspendRender = true;
  const safeDelta = Math.max(0, Math.min(0.25, toFiniteNumber(delta, 0)));
  safeTickStep('timers', () => updateTimersSystem(safeDelta));
  safeTickStep('production', () => updateProductionSystem(safeDelta));
  safeTickStep('craft', () => updateCraftSystem(safeDelta));
  safeTickStep('research', () => updateResearchSystem(safeDelta));
  safeTickStep('plots', () => updatePlotsSystem(safeDelta));
  safeTickStep('ranch', () => updateRanchSystem(safeDelta));
  safeTickStep('workers', () => updateWorkersSystem(safeDelta));
  state._suspendRender = false;
}

function format(num){
  if(Math.abs(num) >= 1000) return num.toFixed(0);
  if(Number.isInteger(num)) return String(num);
  return num.toFixed(1);
}

function formatSecondsLabel(seconds){
  return `${seconds.toFixed(1)}秒`;
}

function bundleText(bundle){
  return Object.entries(bundle).map(([id,amt]) => `${resourceLabels[id]}${amt}`).join(' + ');
}

function craftCompletionText(def, yieldsOverride=null, outputMultiplier=1){
  const yieldBundle = yieldsOverride || def.yields;
  const yieldText = Object.entries(yieldBundle).map(([id,amt]) => `${resourceLabels[id]}${amt}`).join('、');
  const mainProduct = Object.keys(yieldBundle)[0] || Object.keys(def.yields)[0];
  const multiplierText = outputMultiplier > 1.001 ? `（${CRAFT_MIN_CYCLE_SECONDS} 秒產出 ×${outputMultiplier.toFixed(2)}）` : '';
  return `製作${resourceLabels[mainProduct] || def.name}完成${multiplierText}：${yieldText}。`;
}

function renderWorkActionButtons(){
  document.querySelectorAll('[data-work]').forEach(btn => {
    const id = btn.dataset.work;
    const def = workDefs[id];
    const cycle = getProductionDuration(id);
    btn.type = 'button';
    btn.textContent = def.name;
    const outputPreview = getProductionOutputPreviewText(id);
    btn.title = `${def.name}
體力：${def.staminaCost}
生產節奏：${formatSecondsLabel(cycle)}${outputPreview ? `
${outputPreview}` : ''}`;
    btn.onpointerdown = null;
    btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openWorkModal(id); };
  });
}

const craftGroupMap = {
  plank:'基礎加工', stoneBrick:'基礎加工', brickFirewood:'基礎加工', brickCoal:'基礎加工', glassFirewood:'基礎加工', glassCoal:'基礎加工', bottle:'基礎加工',
  sashimi:'烹飪', grilledMeat:'烹飪', grilledFish:'烹飪', bread:'烹飪', grilledSausage:'烹飪', bearStew:'烹飪', applePie:'烹飪', clamSoup:'烹飪',
  flour:'研磨', boneMeal:'研磨', compost:'研磨', wheatSeedBundle:'研磨', coalPowder:'研磨', copperPowder:'研磨', ironPowder:'研磨', silverPowder:'研磨', goldPowder:'研磨', magnetitePowder:'研磨', crystalPowder:'研磨', gemPowder:'研磨',
  ironFirewood:'冶煉與工具', ironCoal:'冶煉與工具', copperFirewood:'冶煉與工具', copperCoal:'冶煉與工具', woodAxeTool:'冶煉與工具', woodPickTool:'冶煉與工具', woodShovelTool:'冶煉與工具', woodCarvingKnifeTool:'冶煉與工具', woodHammerTool:'冶煉與工具', woodPotTool:'冶煉與工具', woodHoeTool:'冶煉與工具', woodPitchforkTool:'冶煉與工具', woodFishingRodTool:'冶煉與工具', stoneAxeTool:'冶煉與工具', stonePickTool:'冶煉與工具', shovelTool:'冶煉與工具', stoneCarvingKnifeTool:'冶煉與工具', stoneHammerTool:'冶煉與工具', stonePotTool:'冶煉與工具', stoneHoeTool:'冶煉與工具', stonePitchforkTool:'冶煉與工具', fishingRodTool:'冶煉與工具', woodBowTool:'冶煉與工具', stoneBowTool:'冶煉與工具', copperAxeTool:'冶煉與工具', copperPickTool:'冶煉與工具', copperShovelTool:'冶煉與工具', copperCarvingKnifeTool:'冶煉與工具', copperHammerTool:'冶煉與工具', copperPotTool:'冶煉與工具', copperHoeTool:'冶煉與工具', copperPitchforkTool:'冶煉與工具', copperFishingRodTool:'冶煉與工具', copperBowTool:'冶煉與工具', ironAxeTool:'冶煉與工具', ironPickTool:'冶煉與工具', ironShovelTool:'冶煉與工具', ironCarvingKnifeTool:'冶煉與工具', ironHammerTool:'冶煉與工具', ironPotTool:'冶煉與工具', ironHoeTool:'冶煉與工具', ironPitchforkTool:'冶煉與工具', ironFishingRodTool:'冶煉與工具', ironBowTool:'冶煉與工具',
  herbTonic:'煉金與文具', staminaPotion:'煉金與文具', paper:'煉金與文具', ink:'煉金與文具', note:'煉金與文具', manual:'煉金與文具',
  leather:'製革與裁縫', softLeather:'製革與裁縫', cottonThread:'製革與裁縫', cottonCloth:'製革與裁縫', grassThread:'製革與裁縫', grassCloth:'製革與裁縫', clothes:'製革與裁縫', fishNetTool:'製革與裁縫'
};
function ensureCraftButtonsExist(){
  const page = document.querySelector('[data-main-page="production"]');
  if(!page) return;
  const groups = {};
  page.querySelectorAll('details').forEach(detail => {
    const summary = detail.querySelector('summary');
    const row = detail.querySelector('.row');
    if(summary && row) groups[summary.textContent.trim()] = row;
  });
  Object.keys(crafts).forEach(id => {
    if(crafts[id]?.hidden) return;
    if(page.querySelector(`[data-craft="${id}"]`)) return;
    const groupName = craftGroupMap[id];
    const row = groups[groupName];
    if(!row) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.craft = id;
    btn.textContent = crafts[id].name;
    row.appendChild(btn);
  });
}
const smithyTabDefs = [
  {id:'ingot', label:'錠'},
  {id:'wood', label:'木製'},
  {id:'stone', label:'石製'},
  {id:'copper', label:'銅製'},
  {id:'iron', label:'鐵製'},
  {id:'other', label:'其他'}
];
const smithyCraftCategoryMap = {
  ironFirewood:'ingot', ironCoal:'ingot', copperFirewood:'ingot', copperCoal:'ingot',
  woodAxeTool:'wood', woodPickTool:'wood', woodShovelTool:'wood', woodCarvingKnifeTool:'wood', woodHammerTool:'wood', woodPotTool:'wood', woodHoeTool:'wood', woodPitchforkTool:'wood', woodFishingRodTool:'wood', woodBowTool:'wood',
  stoneAxeTool:'stone', stonePickTool:'stone', shovelTool:'stone', stoneCarvingKnifeTool:'stone', stoneHammerTool:'stone', stonePotTool:'stone', stoneHoeTool:'stone', stonePitchforkTool:'stone', fishingRodTool:'stone', stoneBowTool:'stone',
  copperAxeTool:'copper', copperPickTool:'copper', copperShovelTool:'copper', copperCarvingKnifeTool:'copper', copperHammerTool:'copper', copperPotTool:'copper', copperHoeTool:'copper', copperPitchforkTool:'copper', copperFishingRodTool:'copper', copperBowTool:'copper',
  ironAxeTool:'iron', ironPickTool:'iron', ironShovelTool:'iron', ironCarvingKnifeTool:'iron', ironHammerTool:'iron', ironPotTool:'iron', ironHoeTool:'iron', ironPitchforkTool:'iron', ironFishingRodTool:'iron', ironBowTool:'iron',
  fishNetTool:'other'
};
function renderSmithyTabs(){
  const page = document.querySelector('[data-main-page="production"]');
  if(!page) return;
  const detail = Array.from(page.querySelectorAll('details')).find(d => d.querySelector('summary') && d.querySelector('summary').textContent.trim() === '冶煉與工具');
  if(!detail) return;
  let tabRow = detail.querySelector('.smithy-tab-row');
  if(!tabRow){
    tabRow = document.createElement('div');
    tabRow.className = 'tab-row smithy-tab-row';
    tabRow.style.marginTop = '8px';
    const row = detail.querySelector('.row');
    detail.insertBefore(tabRow, row);
  }
  tabRow.innerHTML = '';
  smithyTabDefs.forEach(tab => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tiny-btn tab-btn' + (state.ui.smithyTab === tab.id ? ' active' : '');
    btn.textContent = tab.label;
    btn.onpointerdown = (e)=>{ e.preventDefault(); e.stopPropagation(); state.ui.smithyTab = tab.id; renderCraftActionButtons(); };
    btn.onclick = (e)=>e.preventDefault();
    tabRow.appendChild(btn);
  });
}
function renderCraftActionButtons(){
  ensureCraftButtonsExist();
  renderSmithyTabs();
  document.querySelectorAll('[data-craft]').forEach(btn => {
    const id = btn.dataset.craft;
    const def = crafts[id];
    if(!def || def.hidden) return;
    const cycle = getCraftDuration(id);
    const outputPreview = getCraftOutputPreviewText(id);
    const recipe = `${bundleText(def.costs)} → ${bundleText(def.yields)}`;
    const locked = !!(def.unlock && !state.research[def.unlock]);
    const groupName = craftGroupMap[id] || '';
    const isSmithy = groupName === '冶煉與工具';
    const category = smithyCraftCategoryMap[id] || 'other';
    const hiddenByTab = isSmithy && category !== (state.ui.smithyTab || 'ingot');
    btn.type = 'button';
    btn.textContent = def.name;
    btn.title = locked
      ? `${def.name}
尚未研究${researchDefs[def.unlock]?.name || def.unlock}。`
      : `${def.name}
體力：${def.stamina || 1}
配方：${recipe}
製作節奏：${formatSecondsLabel(cycle)}${outputPreview ? `\n${outputPreview}` : ''}`;
    btn.style.display = (locked || hiddenByTab) ? 'none' : '';
    btn.onpointerdown = null;
    btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); if(!locked && !hiddenByTab) openCraftModal(id); };
  });
}

