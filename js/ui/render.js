function setMainPage(page) {
  state.ui.mainPage = page;
  renderMainPageNav();
  render();
}

function renderMainPageNav() {
  const allowed = ["production", "farm", "trade", "build", "workers", "log"];
  if (!allowed.includes(state.ui.mainPage)) state.ui.mainPage = "production";
  document.querySelectorAll("[data-main-nav]").forEach((btn) => {
    const page = btn.dataset.mainNav;
    btn.classList.toggle("active", page === state.ui.mainPage);
  });
  document.querySelectorAll("[data-main-page]").forEach((panel) => {
    panel.classList.toggle("page-hidden", panel.dataset.mainPage !== state.ui.mainPage);
  });
}

function renderLog() {
  const root = document.getElementById("log");
  const tab = state.ui.logTab || "important";
  const rows = (state.logs || [])
    .map((item) =>
      typeof item === "string"
        ? { time: "", text: item, type: inferLogType(item) }
        : { time: item.time || "", text: item.text || "", type: item.type || inferLogType(item.text || "") }
    )
    .filter((item) => {
      if (tab === "all") return true;
      return (item.type || "important") === tab;
    });
  root.innerHTML = rows.length
    ? rows.map((item) => `<div class="log-item"><span class="small muted">${item.time}</span> ${item.text}</div>`).join("")
    : '<div class="log-item muted">目前沒有符合此分類的紀錄。</div>';
  document.getElementById("logImportantBtn")?.classList.toggle("active", tab === "important");
  document.getElementById("logWorkerBtn")?.classList.toggle("active", tab === "worker");
  document.getElementById("logLootBtn")?.classList.toggle("active", tab === "loot");
  document.getElementById("logAllBtn")?.classList.toggle("active", tab === "all");
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

function getResourceUseMeta(id){
  const food = edibleValues[id];
  if(id === 'staminaPotion') return { action:'potion', label:`點擊使用｜180 秒內提高體力回復速度，冷卻 300 秒` };
  if(typeof food === 'number') return { action:'eat', label: food >= 0 ? `點擊使用｜恢復 ${food} 體力` : `點擊食用｜體力 ${food}` };
  if(id === 'boneMeal') return { action:'fertilize', label:'點擊施肥｜對目前作物縮短 5% 成長時間' };
  if(id === 'compost') return { action:'fertilize', label:'點擊施肥｜對目前作物縮短 10% 成長時間' };
  if(id in fuelDurations) return { action:'fuel', label:`點擊投入篝火｜+${fuelDurations[id]} 秒` };
  return null;
}

function renderResources(){
  const groups = {
    '食物與飲品':['rawMeat','rawChicken','fish','sashimi','grilledMeat','grilledFish','bread','grilledSausage','bearStew','applePie','clamSoup','staminaPotion'],
    '基礎資源':['wood','stone','dirt','sand','branch','leaf','firewood','coal'],
    '農作與種子':['apple','wheat','cotton','carrot','wheatFlour','cottonThread','cottonCloth','grassThread','grassCloth','wheatSeed','mushroomSpore','appleSeed','cottonSeed','carrotSeed','egg','boneMeal','compost'],
    '礦物':['copperOre','ironOre','silverOre','goldOre','magnetite','crystal','gem','copperIngot','ironIngot','coalPowder','copperPowder','ironPowder','silverPowder','goldPowder','magnetitePowder','crystalPowder','gemPowder'],
    '採集':['herb','rareHerb','mushroom','fiber','ginseng','shellfish','shell','clamMeat','pearl','coral','snail'],
    '漁獲':['shrimp','crab'],
    '獵物與分解材料':['chicken','rabbit','dairyCow','bull','boar','deer','wolf','brownBear','blackBear','milk','cowHorn','offal','hide','bone','feather','boarTusk','deerAntler','bearPaw','bearFang','leather','softLeather','clothes'],
    '工具與建材':['woodAxeTool','woodPickTool','woodShovelTool','woodCarvingKnifeTool','woodHammerTool','woodPotTool','woodHoeTool','woodPitchforkTool','woodFishingRodTool','stoneAxeTool','stonePickTool','shovelTool','stoneCarvingKnifeTool','stoneHammerTool','stonePotTool','stoneHoeTool','stonePitchforkTool','woodBowTool','stoneBowTool','fishingRodTool','fishNetTool','copperAxeTool','copperShovelTool','copperPickTool','copperCarvingKnifeTool','copperHammerTool','copperPotTool','copperHoeTool','copperPitchforkTool','copperBowTool','copperFishingRodTool','ironAxeTool','ironShovelTool','ironPickTool','ironCarvingKnifeTool','ironHammerTool','ironPotTool','ironHoeTool','ironPitchforkTool','ironBowTool','ironFishingRodTool','planks','stoneBrick','brick','glass','glassBottle']
  };
  const root = document.getElementById('resources');
  root.innerHTML = '';
  Object.entries(groups).forEach(([title, ids]) => {
    const group = document.createElement('div');
    group.className = 'resource-group';
    const isOpen = title in resourceOpenState ? resourceOpenState[title] : allResourcesOpen;
    resourceOpenState[title] = isOpen;
    const summary = document.createElement('button');
    summary.type = 'button';
    summary.className = 'resource-summary';
    summary.dataset.group = title;
    summary.innerHTML = `<span>${title}</span><span class="resource-arrow">${isOpen ? '▼' : '▶'}</span>`;
    summary.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const current = resourceOpenState[title] ?? allResourcesOpen;
      resourceOpenState[title] = !current;
      renderResources();
    });
    group.appendChild(summary);
    const body = document.createElement('div');
    body.className = 'resource-body' + (isOpen ? '' : ' closed');
    if(title === '食物與飲品'){
      const settingRow = document.createElement('div');
      settingRow.className = 'row';
      settingRow.style.padding = '8px 8px 0';
      const autoEatBtn = document.createElement('button');
      autoEatBtn.type = 'button';
      autoEatBtn.className = 'tiny-btn';
      autoEatBtn.textContent = state.research.autoMealPlan ? `自動進食：${getPlayerAutoEatThreshold() > 0 ? `${getPlayerAutoEatThreshold()}%` : '關'} / ${getPlayerAutoEatFood() === 'auto' ? '自動' : resourceLabels[getPlayerAutoEatFood()]}` : '研究後可解鎖自動進食';
      autoEatBtn.disabled = !state.research.autoMealPlan;
      autoEatBtn.onpointerdown = (e)=>{ e.preventDefault(); e.stopPropagation(); if(!autoEatBtn.disabled) openPlayerAutoEatSettings(); };
      autoEatBtn.onclick = (e)=>e.preventDefault();
      settingRow.appendChild(autoEatBtn);
      body.appendChild(settingRow);
    }
    const list = document.createElement('div');
    list.className = 'resource-list';
    ids.forEach(id => {
      const item = document.createElement('button');
      item.type = 'button';
      const meta = getResourceUseMeta(id);
      item.className = 'resource-item' + (meta ? ' clickable' : '');
      if(meta){
        item.dataset.action = meta.action;
        item.dataset.id = id;
        item.title = meta.label;
        item.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openResourceModal(id, meta.action);
        });
      } else {
        item.disabled = true;
        item.title = `${resourceLabels[id]}：${format(state.resources[id] || 0)}`;
      }
      item.innerHTML = `<strong>${resourceLabels[id]}：${format(state.resources[id] || 0)}</strong>${meta ? `<span class="meta">${meta.label}</span>` : ''}`;
      list.appendChild(item);
    });
    body.appendChild(list);
    group.appendChild(body);
    root.appendChild(group);
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

function render(){
  bindHouseButtons();
  renderMainPageNav();
  document.getElementById('gold').textContent = format(state.gold);
  document.getElementById('level').textContent = state.level;
  document.getElementById('exp').textContent = format(state.exp);
  document.getElementById('expNext').textContent = expToNext(state.level);
  document.getElementById('expBar').style.width = `${(state.exp / expToNext(state.level)) * 100}%`;
  document.getElementById('intelligence').textContent = state.intelligence;
  const activeProductionWorkId = (state.productionAction && state.productionAction.id) || state.autoWork || null;
  document.getElementById('cycleTime').textContent = getProductionDuration(activeProductionWorkId).toFixed(2);
  document.getElementById('stamina').textContent = format(state.stamina);
  document.getElementById('maxStamina').textContent = maxStamina();
  document.getElementById('staminaBar').style.width = `${(state.stamina / maxStamina()) * 100}%`;
  document.getElementById('staminaLevel').textContent = state.staminaLevel;
  document.getElementById('staminaExp').textContent = format(state.staminaExp);
  document.getElementById('staminaExpNext').textContent = expToNext(state.staminaLevel);
  document.getElementById('staminaExpBar').style.width = `${(state.staminaExp / expToNext(state.staminaLevel)) * 100}%`;
  document.getElementById('managementLevel').textContent = state.managementLevel;
  document.getElementById('managementExp').textContent = format(state.managementExp);
  document.getElementById('managementExpNext').textContent = expToNext(state.managementLevel);
  document.getElementById('managementBar').style.width = `${(state.managementExp / expToNext(state.managementLevel)) * 100}%`;
  document.getElementById('housingUsed').textContent = state.workers.length;
  document.getElementById('housingCap').textContent = housingCap();
  document.getElementById('salaryTimer').textContent = formatReadableDuration(state.salaryTimer);
  document.getElementById('salaryDebt').textContent = format(state.salaryDebt);
  document.getElementById('campfireSec').textContent = formatReadableDuration(state.campfireSec);
  document.getElementById('castleLevel').textContent = state.castleLevel;
  document.getElementById('taxIncome').textContent = format(state.pendingTax);
  const safetyEl = document.getElementById('safetyValue'); if(safetyEl) safetyEl.textContent = format(safetyValue());
  const tradeLvEl = document.getElementById('tradeLevel'); if(tradeLvEl) tradeLvEl.textContent = state.tradeLevel;
  const repEl = document.getElementById('reputationValue'); if(repEl) repEl.textContent = format(state.reputation);
  const castlePill = document.getElementById('castlePill'); if(castlePill) castlePill.title = getCastleLevelEffectText();
  const safetyPill = document.getElementById('safetyPill'); if(safetyPill) safetyPill.title = `安全值：${safetyValue()}\n安全帶：${getSafetyBand().label}\n${getSafetyBand().desc}\n作用：提高商人到訪率、商人攜帶資金與高品質訂單機率。`;
  const tradePill = document.getElementById('tradePill'); if(tradePill) tradePill.title = getTradeLevelEffectText();
  const repPill = document.getElementById('reputationPill'); if(repPill) repPill.title = getReputationEffectText();
  const taxPill = document.getElementById('taxPill'); if(taxPill) taxPill.title = getTaxEffectText();
  const salaryPill = document.getElementById('salaryPill'); if(salaryPill) salaryPill.title = `薪資倒數：${formatReadableDuration(state.salaryTimer)}\n下次結算時會依工人數量與薪資扣款。`;
  const campfirePill = document.getElementById('campfirePill'); if(campfirePill) campfirePill.title = `篝火剩餘：${formatReadableDuration(state.campfireSec)}\n篝火持續時，玩家與工人行動速度都會獲得額外加成。`;
  const farmingPill = document.getElementById('farmingPill'); if(farmingPill) farmingPill.title = `耕種\n${getSkillLevelEffectText('farming')}`;
  const ranchLevelPill = document.getElementById('ranchLevelPill'); if(ranchLevelPill) ranchLevelPill.title = getRanchLevelEffectText();
  const levelCard = document.getElementById('level'); if(levelCard && levelCard.parentElement) levelCard.parentElement.title = `主等級\n等級：Lv.${state.level}\n經驗：${format(state.exp)} / ${expToNext(state.level)}\n效果：提升整體進度基礎與部分解鎖條件。`;
  const staminaCard = document.getElementById('staminaLevel'); if(staminaCard && staminaCard.parentElement) staminaCard.parentElement.title = `體力等級\n等級：Lv.${state.staminaLevel}\n經驗：${format(state.staminaExp)} / ${expToNext(state.staminaLevel)}\n效果：最大體力提升，休息與進食恢復效率提高。`;
  const mgCard = document.getElementById('managementLevel'); if(mgCard && mgCard.parentElement && mgCard.parentElement.parentElement) mgCard.parentElement.parentElement.title = getManagementLevelEffectText();
  document.getElementById('campfireBar').style.width = `${Math.min(100, (state.campfireSec / 180) * 100)}%`;
  const stage = getTownStage();
  const nextStage = getNextTownStage();
  const researchTextEl = document.getElementById('researchUnlockText');
  if(researchTextEl){
    researchTextEl.textContent = nextStage ? `${stage.name} → ${nextStage.name}` : `${stage.name}（最高）`;
    researchTextEl.title = nextStage ? getMissingReqText(nextStage) : '目前已達最高城鎮階段。';
  }
  document.getElementById('farmingLevel').textContent = state.skills.farming.level;
  document.getElementById('seedReturnRate').textContent = getSeedReturnDisplayText('wheatSeed');
  document.getElementById('workerCycle').textContent = getWorkerCycleTime().toFixed(2);
  renderWorkActionButtons();
  renderCraftActionButtons();
  document.getElementById('restBtn').textContent = state.isResting ? '停止休息' : '開始休息';
  document.getElementById('payDebtBtn').disabled = state.salaryDebt <= 0;
  document.getElementById('claimTaxBtn').disabled = state.pendingTax <= 0;
  document.getElementById('toggleResourcesBtn').textContent = allResourcesOpen ? '收合全部' : '展開全部';
  document.querySelectorAll('[data-work]').forEach(btn => btn.classList.toggle('active', btn.dataset.work === state.autoWork));
  renderSkills();
  renderAction();
  renderResources();
  renderSeedSelect();
  renderQuickAssign();
  renderWorkers();
  renderPlots();
  renderPasture();
  renderBuildingButtons();
  renderResearch();
  const merchantActiveEl = document.activeElement;
  const merchantFocused = !!(merchantActiveEl && merchantActiveEl.closest && merchantActiveEl.closest('#merchantArea') && /^(INPUT|SELECT|TEXTAREA|BUTTON)$/i.test(merchantActiveEl.tagName || ''));
  if(!merchantFocused && !isMerchantUiInteractionLocked()) renderMerchant();
  renderWorkerCraftSelect();
  renderWorkQueue();
  renderCraftQueue();
  renderResearchQueue();
  renderLog();
}

function renderSkills(){
  const root = document.getElementById('skillPills');
  root.innerHTML = '';
  Object.entries(skillLabels).forEach(([id,label]) => {
    const skill = state.skills[id];
    const div = document.createElement('div');
    div.className = 'pill';
    div.textContent = `${label} Lv.${skill.level}`;
    div.title = `${label}\n${getSkillLevelEffectText(id)}`;
    root.appendChild(div);
  });
}

function renderAction(){
  const setLane = (prefix, action, idleText, activeTextFn) => {
    const textEl = document.getElementById(prefix + 'Text');
    const barEl = document.getElementById(prefix + 'Bar');
    if(action){
      textEl.textContent = activeTextFn(action);
      barEl.style.width = `${clamp((1 - action.remaining / action.total) * 100, 0, 100)}%`;
    }else{
      textEl.textContent = idleText;
      barEl.style.width = '0%';
    }
  };
  const workQueued = getQueueCount(state.workQueue);
  if(state.productionAction){
    const a = state.productionAction;
    const modeText = state.autoWorkCount < 0 ? '∞' : (state.autoWorkCount > 0 ? `×${state.autoWorkCount}` : '');
    setLane('production', a, '生產：閒置', act => `生產：${workDefs[act.id].name}${modeText ? ` ${modeText}` : ''}${(act.outputMultiplier || 1) > 1.001 ? `｜${PRODUCTION_MIN_CYCLE_SECONDS} 秒產出 ×${(act.outputMultiplier || 1).toFixed(2)}` : ''}｜剩餘 ${Math.max(0,act.remaining).toFixed(1)} 秒`);
  }else if(state.isResting){
    document.getElementById('productionText').textContent = '生產：休息中';
    document.getElementById('productionBar').style.width = '100%';
  }else if(state.autoWork){
    const modeText = state.autoWorkCount < 0 ? '∞' : (state.autoWorkCount > 0 ? `×${state.autoWorkCount}` : '');
    document.getElementById('productionText').textContent = `生產：待命，${workDefs[state.autoWork].name}${modeText}`;
    document.getElementById('productionBar').style.width = '0%';
  }else if(workQueued){
    document.getElementById('productionText').textContent = '生產：待命';
    document.getElementById('productionBar').style.width = '0%';
  }else{
    document.getElementById('productionText').textContent = '生產：閒置';
    document.getElementById('productionBar').style.width = '0%';
  }
  const qCount = getQueueCount(state.craftQueue);
  const craftIdleText = state.craftPausedForStamina && state.craftPausedName ? `製作：體力不足暫停（${state.craftPausedName}）` : state.autoCraft ? `製作：待命，重複${crafts[state.autoCraft].name}` : qCount ? `製作：待命` : '製作：閒置';
  setLane('craft', state.craftAction, craftIdleText, act => `製作：${crafts[act.id].name}${state.autoCraft===act.id?'（重複）':''}${(act.outputMultiplier || 1) > 1.001 ? `｜${CRAFT_MIN_CYCLE_SECONDS} 秒產出 ×${(act.outputMultiplier || 1).toFixed(2)}` : ''}｜剩餘 ${Math.max(0,act.remaining).toFixed(1)} 秒`);
  const rQueued = getQueueCount(state.researchQueue);
  if(state.researchAction){
    const a = state.researchAction;
    const label = a.type === 'read' ? `研究：閱讀《${books[a.id].name}》` : `研究：${researchDefs[a.id].name}`;
    document.getElementById('researchText').textContent = `${label}｜剩餘 ${Math.max(0,a.remaining).toFixed(1)} 秒`;
    document.getElementById('researchBar').style.width = `${clamp((1 - a.remaining / a.total) * 100, 0, 100)}%`;
  }else{
    document.getElementById('researchText').textContent = rQueued ? '研究：待命' : '研究：閒置';
    document.getElementById('researchBar').style.width = '0%';
  }
}

function renderWorkerCraftSelect(){ const box = document.getElementById('workerCraftSelect'); if(box) box.closest('label')?.parentElement?.remove(); }

function renderSeedSelect(){
  const seedBtn = document.getElementById('seedSelectBtn');
  if(seedBtn){
    const seedId = getSelectedManualSeed();
    seedBtn.textContent = `手動：${farmingDefs[seedId]?.name || '未選擇'}（${format(state.resources[seedId] || 0)}）`;
    seedBtn.title = '點擊選擇手動種植作物';
    seedBtn.onclick = (e) => { e.preventDefault(); openManualSeedChoice(); };
    seedBtn.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); openManualSeedChoice(); };
  }
  const plantBtn = document.getElementById('plantBtn');
  if(plantBtn){
    plantBtn.textContent = '種下';
    plantBtn.title = '把目前選擇的作物種到第一塊空農地';
    const plantNow = (e) => {
      if(e){ e.preventDefault(); e.stopPropagation(); }
      const seedId = getSelectedManualSeed();
      if(!seedId || !farmingDefs[seedId]) return addLog('請先選擇可種植的種子。');
      if(!tryPlantSeed(seedId,'manual')) return addLog('沒有空農地、尚未建造農田，或種子不足。');
      render();
    };
    plantBtn.onclick = plantNow;
    plantBtn.onpointerdown = plantNow;
  }
  const farmerSeedBtn = document.getElementById('farmerSeedBtn');
  if(farmerSeedBtn){
    const pref = getFarmerSeedPreference();
    farmerSeedBtn.textContent = `農夫：${pref === 'auto' ? '自動' : farmingDefs[pref]?.name || '自動'}`;
    farmerSeedBtn.title = '點擊設定農夫自動種植偏好';
    farmerSeedBtn.onclick = (e) => { e.preventDefault(); openFarmerSeedChoice(); };
    farmerSeedBtn.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); openFarmerSeedChoice(); };
  }
  const farmerBtn = document.getElementById('farmerAutoFertilizeBtn');
  if(farmerBtn){
    farmerBtn.textContent = `施肥：${state.farmerAutoFertilize ? '開' : '關'}`;
    farmerBtn.title = '點擊切換農夫自動施肥';
    const toggleAutoFertilize = (e) => {
      if(e){ e.preventDefault(); e.stopPropagation(); }
      state.farmerAutoFertilize = !state.farmerAutoFertilize;
      addLog(`農夫自動施肥已${state.farmerAutoFertilize ? '開啟' : '關閉'}。`);
      render();
    };
    farmerBtn.onclick = toggleAutoFertilize;
    farmerBtn.onpointerdown = toggleAutoFertilize;
  }
}

function renderQuickAssign(){
  const root = document.getElementById('quickAssignArea');
  if(!root) return;
  root.innerHTML = '';
  if(state.workers.length === 0) return;
  const title = document.createElement('div');
  title.className = 'small muted';
  const idleReady = state.workers.filter(w => w.job === 'idle' && w.switchCooldown <= 0).length;
  title.textContent = `快速指派：按 + 從待命工人派往崗位，按 − 把該崗位工人調回待命。可立即調度的待命工人：${idleReady} 人。`;
  root.appendChild(title);
  const grid = document.createElement('div');
  grid.className = 'quick-assign-grid';
  workerJobs.filter(job => job !== 'idle').forEach(job => {
    const row = document.createElement('div');
    row.className = 'qa-row';
    const left = document.createElement('div');
    left.innerHTML = `<strong>${jobDisplayName(job)}</strong><div class="small muted">目前 ${state.workers.filter(w => w.job === job).length} 人</div>`;
    row.appendChild(left);
    const controls = document.createElement('div');
    controls.className = 'qa-controls';
    const minus = document.createElement('button');
    minus.className = 'tiny-btn';
    minus.textContent = '−';
    minus.type = 'button';
    minus.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); adjustWorkersForJob(job, -1); });
    const count = document.createElement('span');
    count.className = 'job-count';
    count.textContent = state.workers.filter(w => w.job === job).length;
    const plus = document.createElement('button');
    plus.className = 'tiny-btn';
    plus.textContent = '+';
    plus.type = 'button';
    plus.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); adjustWorkersForJob(job, 1); });
    controls.appendChild(minus);
    controls.appendChild(count);
    controls.appendChild(plus);
    row.appendChild(controls);
    grid.appendChild(row);
  });
  root.appendChild(grid);
}

function renderWorkers(){
  const root = document.getElementById('workers');
  root.innerHTML = '';
  if(state.workers.length === 0){
    root.innerHTML = '<div class="muted small" style="margin-top:8px">還沒有工人。先蓋房，再招募。</div>';
    return;
  }
  const summary = document.createElement('div');
  summary.className = 'small muted';
  summary.style.marginTop = '10px';
  const byJob = {};
  workerJobs.forEach(job => byJob[job] = 0);
  state.workers.forEach(w => byJob[w.job] = (byJob[w.job] || 0) + 1);
  const cooldown = state.workers.filter(w => w.switchCooldown > 0).length;
  summary.textContent = `工人總數 ${state.workers.length} 人｜待命 ${byJob.idle || 0} 人｜工匠 ${byJob.crafting || 0} 人｜廚師 ${byJob.cook || 0} 人｜村民正在回程/前往 ${cooldown} 人${state.salaryDebt > 0 ? '｜欠薪暫停中' : ''}`;
  root.appendChild(summary);
  const pref = document.createElement('div');
  pref.className = 'small muted';
  pref.style.marginTop = '8px';
  pref.textContent = '工人設定列表：每名工人可個別設定工具優先、食物偏好；工匠可個別指定製作配方。';
  root.appendChild(pref);
  const grid = document.createElement('div');
  grid.className = 'workers-grid';
  const artisanSkills = new Set(['woodworking','masonry','smelting','alchemy','tanning']);
  const craftOptions = Object.entries(crafts).filter(([id, def]) => (!def.unlock || state.research[def.unlock]) && artisanSkills.has(def.skill));
  const foodChoices = getWorkerFoodChoices();
  state.workers.forEach(worker => {
    const card = document.createElement('div');
    card.className = 'worker';
    let label = '待命中';
    let remaining = 0;
    let total = 1;
    if(state.salaryDebt > 0){ label = '欠薪暫停'; }
    else if(worker.switchCooldown > 0){ label = `回程/前往 ${worker.switchCooldown.toFixed(1)} 秒`; remaining = worker.switchCooldown; total = 10; }
    else if(worker.job === 'idle'){ label = '待命中'; }
    else {
      const needsTool = getToolOptionsForJob(worker.job).length > 0;
      const staminaNeed = getWorkerStaminaCost(worker.job) * (worker.clothesEquipped && worker.clothesDurability > 0 ? 1 : 1.35);
      if(needsTool && (!worker.toolId || worker.toolDurability <= 0)) label = '缺少工具';
      else if(worker.stamina < staminaNeed) label = '體力不足';
      else label = `${jobDisplayName(worker.job)} ${worker.remaining.toFixed(1)} 秒`;
      total = getWorkerEffectiveCycleTime(worker);
      remaining = Math.min(worker.remaining, total);
    }
    const progress = total > 0 ? clamp((1 - remaining / total) * 100, 0, 100) : 0;
    const workerOutputText = getWorkerOutputPreviewText(worker);
    const clothesText = worker.clothesEquipped && worker.clothesDurability > 0 ? `衣服（${Math.ceil(worker.clothesDurability)}/${getToolDurabilityMax('clothes')}）` : '無衣服';
    const toolText = worker.toolId && worker.toolDurability > 0 ? `${resourceLabels[worker.toolId]}（${Math.ceil(worker.toolDurability)}/${getToolDurabilityMax(worker.toolId)}）` : '缺工具';
    const needToolText = getWorkerToolRequirementText(worker.job);
    card.innerHTML = `
      <div class="worker-status">
        <span class="worker-label">工人 #${worker.id}</span>
        <span class="small muted">${label}</span>
      </div>
      <div class="bar"><div class="fill action" style="width:${progress}%"></div></div>
      <div class="small muted" style="margin-top:4px">${jobDisplayName(worker.job)}</div>
      <div class="small muted">體力：${worker.stamina.toFixed(1)} / ${worker.maxStamina}</div>
      <div class="small muted">需求工具：${needToolText}</div>
      ${workerOutputText ? `<div class="small muted">${workerOutputText}</div>` : ''}
      <div class="small muted">工具：${toolText}</div>
      <div class="small muted">衣服：${clothesText}</div>
    `;
    const prefWrap = document.createElement('div');
    prefWrap.className = 'row';
    prefWrap.style.marginTop = '6px';
    prefWrap.style.alignItems = 'center';
    const toolOptions = getToolOptionsForJob(worker.job);
    const currentToolPref = toolOptions.includes(worker.toolPreference) ? worker.toolPreference : 'auto';
    const toolBtn = document.createElement('button');
    toolBtn.type = 'button';
    toolBtn.textContent = toolOptions.length ? `工具優先：${currentToolPref === 'auto' ? '自動' : resourceLabels[currentToolPref]}` : '工具優先：不需要';
    toolBtn.disabled = !toolOptions.length;
    toolBtn.onpointerdown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if(!toolOptions.length) return;
      openChoiceModal({
        title: `工人 #${worker.id} 工具優先`,
        desc: `目前工作：${jobDisplayName(worker.job)}\n需求工具：${needToolText}`,
        options: [
          {label: `自動${currentToolPref === 'auto' ? ' ✓' : ''}`, onSelect: () => { worker.toolPreference = 'auto'; render(); }},
          ...toolOptions.map(id => ({ label: `${resourceLabels[id]}${currentToolPref === id ? ' ✓' : ''}`, onSelect: () => { worker.toolPreference = id; render(); }}))
        ]
      });
    };
    toolBtn.onclick = (e) => e.preventDefault();
    prefWrap.appendChild(toolBtn);
    const currentFoodPref = foodChoices.includes(worker.foodPreference) ? worker.foodPreference : 'auto';
    const foodBtn = document.createElement('button');
    foodBtn.type = 'button';
    foodBtn.textContent = `食物：${currentFoodPref === 'auto' ? '自動' : resourceLabels[currentFoodPref]}`;
    foodBtn.onpointerdown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openChoiceModal({
        title: `工人 #${worker.id} 食物偏好`,
        desc: '選擇工人優先食用的恢復食物。若為自動，工人會先吃便宜或低階食物，並盡量保留一部分熟食庫存給玩家。若指定食物不足，工人會等待或休息。',
        options: [
          {label: `自動${currentFoodPref === 'auto' ? ' ✓' : ''}`, onSelect: () => { worker.foodPreference = 'auto'; render(); }},
          ...foodChoices.map(id => ({ label: `${resourceLabels[id]}（庫存 ${format(state.resources[id] || 0)}）${currentFoodPref === id ? ' ✓' : ''}`, onSelect: () => { worker.foodPreference = id; render(); }}))
        ]
      });
    };
    foodBtn.onclick = (e) => e.preventDefault();
    prefWrap.appendChild(foodBtn);
    card.appendChild(prefWrap);
    grid.appendChild(card);
  });
  root.appendChild(grid);
}

function renderPlots(){
  const root = document.getElementById('plots');
  root.innerHTML = '';
  const summary = document.createElement('div');
  summary.className = 'row';
  summary.style.justifyContent = 'space-between';
  summary.style.alignItems = 'center';
  summary.style.marginBottom = '8px';
  const info = document.createElement('div');
  info.className = 'small muted';
  info.textContent = `已建農田：${countBuiltPlots()}/${getFarmPlotCap()}`;
  const cost = getFarmBuildCost();
  info.title = `建造下一塊農田\n需求金幣：${cost.gold}\n需求材料：${formatCostBundle(applyBuildingResourceDiscount(cost.resources))}\n目前已建：${countBuiltPlots()} / ${getFarmPlotCap()}\n城鎮中心每級提高農田上限 +2`;
  summary.appendChild(info);
  const buildBtn = document.createElement('button');
  buildBtn.type = 'button';
  buildBtn.className = 'tiny-btn';
  buildBtn.textContent = countBuiltPlots() >= getFarmPlotCap() ? '建造農田（已上限）' : '建造農田';
  buildBtn.title = info.title;
  buildBtn.disabled = countBuiltPlots() >= getFarmPlotCap();
  buildBtn.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); if(!buildBtn.disabled && buildFarmPlot()) render(); };
  buildBtn.onclick = (e) => e.preventDefault();
  summary.appendChild(buildBtn);
  root.appendChild(summary);

  const grid = document.createElement('div');
  grid.className = 'plot-grid';
  state.plots.forEach((plot, idx) => {
    const box = document.createElement('div');
    box.className = 'plot';
    if(!plot){
      const selectedSeed = getSelectedManualSeed();
      box.innerHTML = `
        <div class="plot-header">
          <div class="plot-label">農地 ${idx + 1}</div>
          <div class="plot-note">空地</div>
        </div>
        <div class="plot-note">目前選擇：${farmingDefs[selectedSeed]?.name || '未選擇'}</div>`;
      const row = document.createElement('div');
      row.className = 'plot-actions';
      const plantBtn = document.createElement('button');
      plantBtn.type = 'button';
      plantBtn.className = 'tiny-btn';
      plantBtn.textContent = '種下';
      plantBtn.title = `在農地 ${idx + 1} 種下目前選擇的作物`;
      plantBtn.onpointerdown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if(!tryPlantSeed(selectedSeed, 'manual', idx)) addLog(`無法在農地 ${idx + 1} 種下${farmingDefs[selectedSeed]?.name || '作物'}。`);
        render();
      };
      plantBtn.onclick = (e) => e.preventDefault();
      const chooseBtn = document.createElement('button');
      chooseBtn.type = 'button';
      chooseBtn.className = 'tiny-btn';
      chooseBtn.textContent = '選作物';
      chooseBtn.onpointerdown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openManualSeedChoice(idx);
      };
      chooseBtn.onclick = (e) => e.preventDefault();
      row.appendChild(plantBtn);
      row.appendChild(chooseBtn);
      box.appendChild(row);
    }else{
      const def = farmingDefs[plot.seedId];
      const matured = plot.remaining <= 0;
      box.innerHTML = `
        <div class="plot-header">
          <div class="plot-label">農地 ${idx + 1}：${def.name}</div>
          <div class="plot-note">${matured ? '可收成' : `剩 ${plot.remaining.toFixed(1)} 秒`}</div>
        </div>
        <div class="plot-note">${matured ? '已成熟，點收成即可。' : `骨粉 ${plot.boneMealUsed || 0}｜肥料 ${plot.compostUsed || 0}`}</div>
        <div class="bar"><div class="fill exp" style="width:${(1 - plot.remaining / plot.total) * 100}%"></div></div>`;
      if(matured){
        const doHarvest = (e) => {
          if(e){
            e.preventDefault();
            e.stopPropagation();
          }
          if(harvestPlot(idx, 'manual')) render();
        };
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = '收成';
        btn.className = 'tiny-btn';
        btn.style.marginTop = '6px';
        btn.onclick = doHarvest;
        btn.onpointerdown = doHarvest;
        box.onclick = (e) => {
          if(e.target !== btn) doHarvest(e);
        };
        box.onpointerdown = (e) => {
          if(e.target !== btn) doHarvest(e);
        };
        box.style.cursor = 'pointer';
        box.appendChild(btn);
      }else{
        const row = document.createElement('div');
        row.className = 'plot-actions';
        const boneBtn = document.createElement('button');
        boneBtn.className = 'tiny-btn';
        boneBtn.textContent = `骨粉（${format(state.resources.boneMeal || 0)}）`;
        boneBtn.title = `點擊使用骨粉，${def.name}剩餘時間立即縮短 5%`;
        boneBtn.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); if(applyFertilizer(idx, 'boneMeal', 'manual')) render(); };
        boneBtn.onclick = (e) => e.preventDefault();
        const compBtn = document.createElement('button');
        compBtn.className = 'tiny-btn';
        compBtn.textContent = `肥料（${format(state.resources.compost || 0)}）`;
        compBtn.title = `點擊使用肥料堆，${def.name}剩餘時間立即縮短 10%`;
        compBtn.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); if(applyFertilizer(idx, 'compost', 'manual')) render(); };
        compBtn.onclick = (e) => e.preventDefault();
        row.appendChild(boneBtn);
        row.appendChild(compBtn);
        box.appendChild(row);
      }
    }
    grid.appendChild(box);
  });
  root.appendChild(grid);
}

function renderPasture(){
  const root = document.getElementById('pastureArea');
  if(!root) return;
  const ranchLv = state.buildings.ranch || 0;
  const ranchWorkers = state.workers.filter(w => w.job === 'ranch').length;
  const levelEl = document.getElementById('ranchLevel'); if(levelEl) levelEl.textContent = ranchLv;
  const workerEl = document.getElementById('ranchWorkers'); if(workerEl) workerEl.textContent = ranchWorkers;
  const animals = ['chicken','rabbit','dairyCow','bull','boar','deer','wolf','brownBear','blackBear'];
  const totalCap = getRanchTotalCapacity();
  const usedCap = getRanchUsedCapacity();
  root.innerHTML = '';

  const top = document.createElement('div');
  top.className = 'small muted';
  top.textContent = ranchLv > 0
    ? `牧場容量 ${format(usedCap)} / ${format(totalCap)}｜繁殖速度加成 ${Math.round(ranchLv * 20)}%｜雞蛋額外產量加成 ${Math.round(ranchLv * 10)}%｜牧場工人 ${ranchWorkers} 人`
    : '尚未建造牧場。可先在建築區升級牧場，再指派工人到牧場工作。';
  root.appendChild(top);

  const help = document.createElement('div');
  help.className = 'small muted';
  help.style.marginTop = '4px';
  help.textContent = '牧場工人會先自動餵養可繁殖的動物，再推進繁殖進度；每種動物都可個別開關繁殖。';
  root.appendChild(help);

  const grid = document.createElement('div');
  grid.className = 'info-grid';
  grid.style.marginTop = '8px';

  animals.forEach(id => {
    const have = Math.floor(toFiniteNumber(state.resources[id] || 0, 0));
    const cap = getAnimalCap(id);
    const rarity = getAnimalRarityLabel(id);
    const ratioText = getAnimalCapRatioText(id);
    const feed = animalFeedDefs[id];
    const ranchState = state.ranchData[id] || {fed:0, timer:0, enabled:true};
    const enabled = isAnimalBreedingEnabled(id);
    const need = getAnimalBreedSeconds(id);
    const pct = getAnimalProgressPercent(id);
    const ready = enabled && ranchState.timer >= need && ranchState.fed > 0;
    const pairHint = id === 'dairyCow' ? '｜需至少 1 公牛配對' : id === 'bull' ? '｜需至少 1 乳牛配對' : '';
    const statusText = !enabled
      ? '繁殖已關閉'
      : ranchState.fed <= 0
        ? '尚未餵養，沒有繁殖進度'
        : ready
          ? `可繁殖｜${Math.floor(ranchState.timer)}/${need} 秒`
          : `進度 ${Math.floor(ranchState.timer)}/${need} 秒`;

    const card = document.createElement('div');
    card.className = 'mini';
    card.title = `稀有度：${rarity}
物種上限比例：${ratioText}
物種上限：${cap}
超出上限會自動屠宰。`;

    const title = document.createElement('strong');
    title.textContent = resourceLabels[id];
    card.appendChild(title);

    const line1 = document.createElement('div');
    line1.className = 'small muted';
    line1.textContent = `現有 ${format(have)} / 上限 ${format(cap)} 隻`;
    card.appendChild(line1);

    const line2 = document.createElement('div');
    line2.className = 'small muted';
    line2.textContent = `${rarity}｜餵養 ${resourceLabels[feed.food]} × ${feed.amount}${pairHint}`;
    card.appendChild(line2);

    const line3 = document.createElement('div');
    line3.className = 'small muted';
    line3.textContent = `已餵 ${format(ranchState.fed)} 次｜${statusText}`;
    card.appendChild(line3);

    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.marginTop = '6px';
    const fill = document.createElement('div');
    fill.className = 'fill action';
    fill.style.width = `${pct}%`;
    bar.appendChild(fill);
    card.appendChild(bar);

    const row = document.createElement('div');
    row.className = 'row';
    row.style.marginTop = '6px';

    const feedBtn = document.createElement('button');
    feedBtn.type = 'button';
    feedBtn.className = 'tiny-btn';
    feedBtn.textContent = '餵養';
    feedBtn.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); openFeedAnimalModal(id); };
    feedBtn.onclick = (e) => e.preventDefault();
    row.appendChild(feedBtn);

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'tiny-btn' + (enabled ? ' active' : '');
    toggleBtn.textContent = `繁殖：${enabled ? '開' : '關'}`;
    const doToggleBreeding = (e) => { if(e){ e.preventDefault(); e.stopPropagation(); } toggleAnimalBreeding(id); };
    toggleBtn.onpointerdown = doToggleBreeding;
    toggleBtn.onclick = doToggleBreeding;
    row.appendChild(toggleBtn);

    card.appendChild(row);
    grid.appendChild(card);
  });

  root.appendChild(grid);

  const bottom = document.createElement('div');
  bottom.className = 'small muted';
  bottom.style.marginTop = '8px';
  bottom.textContent = '繁殖需要先餵食；乳牛與公牛需要成對餵養後才會繁殖。普通動物約 180 秒，常見 240 秒，稀有 300 秒，珍稀 360 秒，會再受牧場等級縮短。';
  root.appendChild(bottom);
}

function renderBuildingButtons(){
  const root = document.getElementById('buildingButtons');
  root.innerHTML = '';

  const farmBtn = document.createElement('button');
  farmBtn.type = 'button';
  const farmCost = getFarmBuildCost();
  const farmCap = getFarmPlotCap();
  const farmBuilt = countBuiltPlots();
  farmBtn.textContent = farmBuilt >= farmCap ? `農田（已上限）` : `農田 ${farmBuilt}/${farmCap}`;
  farmBtn.title = `建造農田\n需求金幣：${farmCost.gold}\n需求材料：${formatCostBundle(applyBuildingResourceDiscount(farmCost.resources))}\n目前已建：${farmBuilt}/${farmCap}\n效果：提供耕種空地，可種植作物。\n建成城池經驗：2`;
  farmBtn.disabled = farmBuilt >= farmCap;
  farmBtn.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); if(!farmBtn.disabled && buildFarmPlot()) render(); };
  farmBtn.onclick = (e) => e.preventDefault();
  root.appendChild(farmBtn);

  Object.entries(buildingDefs).forEach(([key, def]) => {
    const unlocked = isBuildUnlocked(key);
    const currentLv = state.buildings[key] || 0;
    if(!unlocked && currentLv === 0) return;
    const nextLv = currentLv + 1;
    const btn = document.createElement('button');
    const rawCost = currentLv >= def.max ? null : def.cost(nextLv);
    const cost = rawCost ? {gold: rawCost.gold, resources: applyBuildingResourceDiscount(rawCost.resources)} : null;
    btn.textContent = currentLv >= def.max
      ? `${def.name} Lv.${currentLv}（已上限）`
      : `${def.name} Lv.${currentLv} → ${Math.min(nextLv, def.max)}`;
    btn.title = currentLv >= def.max
      ? `${def.name}\n${def.desc}\n已達最高等級（已上限）`
      : `${def.name}\n需求金幣：${cost.gold}\n需求材料：${formatCostBundle(cost.resources)}\n效果：${def.desc}\n建成城池經驗：${castleExpBase[key] || 0}\n升級城池經驗：${castleExpUpgrade[key] || 0}`;
    if(currentLv >= def.max){
      btn.disabled = true;
    } else {
      btn.type = 'button';
      btn.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); upgradeBuilding(key); };
      btn.onclick = (e) => { e.preventDefault(); };
    }
    root.appendChild(btn);
  });
}

function getResearchCategoryLabel(def){
  if(def.category === 'tool') return '工具研究';
  if(def.category === 'building') return '建築藍圖研究';
  if(def.category === 'quality') return '功能研究';
  return '研究';
}

function bindCardOpen(card, handler){
  const canIgnoreTarget = (target) => !!(target && target.closest('button,input,select,textarea,label,a'));
  card.style.cursor = 'pointer';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.onpointerdown = null;
  card.onclick = (e) => {
    if(canIgnoreTarget(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    handler();
  };
  card.onkeydown = (e) => {
    if(e.key === 'Enter' || e.key === ' '){
      if(canIgnoreTarget(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      handler();
    }
  };
}

function renderResearch(){
  const root = document.getElementById('researchArea');
  root.innerHTML = '';
  const info = document.createElement('div');
  info.className = 'small muted';
  const stage = getTownStage();
  const nextStage = getNextTownStage();
  info.textContent = `目前智力：${state.intelligence}｜城鎮階段：${stage.name}${nextStage ? `｜下一階段：${nextStage.name}` : '｜已達最高階段'}`;
  if(nextStage) info.title = getMissingReqText(nextStage);
  root.appendChild(info);

  const tools = document.createElement('div');
  tools.className = 'row';
  tools.style.marginTop = '8px';
  const hideBtn = document.createElement('button');
  hideBtn.type = 'button';
  hideBtn.className = 'tiny-btn';
  hideBtn.textContent = `已完成研究：${state.ui.hideCompletedResearch ? '隱藏' : '顯示'}`;
  hideBtn.onpointerdown = (e)=>{ e.preventDefault(); e.stopPropagation(); state.ui.hideCompletedResearch = !state.ui.hideCompletedResearch; renderResearch(); };
  hideBtn.onclick = (e)=>e.preventDefault();
  tools.appendChild(hideBtn);
  root.appendChild(tools);

  const bookTitle = document.createElement('div');
  bookTitle.className = 'section-title';
  bookTitle.style.marginTop = '8px';
  bookTitle.innerHTML = '<strong>研究書籍</strong><span class="small muted">點按下方按鈕可選擇閱讀幾本；可立即開始或加入右上角研究列隊</span>';
  root.appendChild(bookTitle);

  const bookGrid = document.createElement('div');
  bookGrid.className = 'book-grid';
  Object.entries(books).forEach(([id, book]) => {
    const card = document.createElement('div');
    card.className = 'book-card';
    const owned = Math.floor(toFiniteNumber(state.resources[id], 0));

    const title = document.createElement('strong');
    title.textContent = book.name;
    card.appendChild(title);

    const lines = [
      `目前持有：${owned} 本`,
      '開始閱讀時會先從庫存扣除 1 本',
      `閱讀時間：${formatSecondsLabel(getReadingDuration(book.duration))}`,
      `完成後：智力 +${book.intGain}、主經驗 +${book.expGain}`
    ];
    lines.forEach(textLine => {
      const div = document.createElement('div');
      div.className = 'small muted';
      div.textContent = textLine;
      card.appendChild(div);
    });

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'tiny-btn research-mini-btn';
    openBtn.textContent = '閱讀設定';
    openBtn.onpointerdown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openBookModal(id);
    };
    openBtn.onclick = (e)=>e.preventDefault();
    card.appendChild(openBtn);

    bindCardOpen(card, () => openBookModal(id));
    card.title = `${book.name}\n目前持有：${owned} 本`;
    bookGrid.appendChild(card);
  });
  root.appendChild(bookGrid);

  const tabs = document.createElement('div');
  tabs.className = 'tab-row';
  const tabDefs = [
    {id:'available', label:'可研究'},
    {id:'completed', label:'已完成'},
    {id:'locked', label:'未達條件'}
  ];
  tabDefs.forEach(tab => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tiny-btn tab-btn' + (state.ui.researchTab === tab.id ? ' active' : '');
    btn.textContent = tab.label;
    btn.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); state.ui.researchTab = tab.id; renderResearch(); };
    btn.onclick = (e) => e.preventDefault();
    tabs.appendChild(btn);
  });
  root.appendChild(tabs);

  const list = document.createElement('div');
  list.className = 'research-grid';
  let items = Object.entries(researchDefs).filter(([key]) => getResearchStatus(key) === state.ui.researchTab);
  if(state.ui.hideCompletedResearch && state.ui.researchTab === 'completed') items = [];
  if(!items.length){
    const empty = document.createElement('div');
    empty.className = 'small muted';
    empty.textContent = state.ui.researchTab === 'completed' ? '目前沒有要顯示的已完成研究。' : state.ui.researchTab === 'available' ? '目前沒有可研究項目。' : '目前沒有被鎖定的研究。';
    list.appendChild(empty);
  } else {
    items.forEach(([key, def]) => {
      const card = document.createElement('div');
      card.className = 'research-card';
      const status = getResearchStatus(key);
      bindCardOpen(card, () => openResearchModal(key));

      const title = document.createElement('strong');
      title.textContent = def.name;
      card.appendChild(title);

      const typeLine = document.createElement('div');
      typeLine.className = 'small muted';
      typeLine.textContent = getResearchCategoryLabel(def);
      card.appendChild(typeLine);

      const statusLine = document.createElement('div');
      statusLine.className = 'research-status' + (status === 'completed' ? ' done' : '');
      statusLine.textContent = status === 'completed' ? '已完成' : (status === 'available' ? '可研究' : '未達條件');
      card.appendChild(statusLine);

      if(status === 'locked'){
        const hint = document.createElement('div');
        hint.className = 'small muted';
        hint.style.marginTop = '4px';
        hint.textContent = getMissingReqText(def);
        card.appendChild(hint);
      } else {
        const desc = document.createElement('div');
        desc.className = 'small muted';
        desc.textContent = def.desc;
        card.appendChild(desc);
      }

      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'tiny-btn research-mini-btn';
      openBtn.textContent = status === 'completed' ? '查看說明' : (status === 'locked' ? '查看條件' : '開始/排隊');
      openBtn.onpointerdown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openResearchModal(key);
      };
      openBtn.onclick = (e)=>e.preventDefault();
      card.appendChild(openBtn);

      list.appendChild(card);
    });
  }
  root.appendChild(list);
}

function renderCraftQueue(){
  const label = document.getElementById('autoCraftLabel');
  if(label) label.textContent = state.autoCraft && crafts[state.autoCraft] ? `${crafts[state.autoCraft].name}${state.autoCraftInfinite ? '（∞）' : ''}` : '無';
  const root = document.getElementById('craftQueueTop');
  if(!root) return;
  root.innerHTML = '';
  const qCount = getQueueCount(state.craftQueue);
  const qTotal = getQueueTotalActions(state.craftQueue);
  const qInfo = estimateCraftQueueSeconds();
  const qInfinite = qInfo.infinite;
  const hasCurrent = !!(state.craftAction && crafts[state.craftAction.id]);
  const hasAuto = !!(state.autoCraft && crafts[state.autoCraft]);
  const summary = document.createElement('div');
  summary.className = 'queue-summary';
  const pill = document.createElement('span');
  pill.className = 'queue-pill' + ((qCount || state.autoCraftInfinite || hasCurrent || hasAuto) ? ' clickable' : '');
  if(hasCurrent) pill.textContent = `製作中：${crafts[state.craftAction.id].name}`;
  else if(qCount) pill.textContent = `+${qCount} 列隊｜${formatQueueTimeShort(qInfo.total, qInfinite)}`;
  else pill.textContent = state.autoCraftInfinite ? '自動連作：∞' : (hasAuto ? `待命：${crafts[state.autoCraft].name}` : '等待隊列：空');
  pill.title = qCount || state.autoCraftInfinite || hasCurrent || hasAuto
    ? `目前共有 ${qCount} 格列隊${hasCurrent ? '，且有 1 項正在製作中' : ''}${qInfinite ? '，其中含有無限項目或正在無限連作' : `，總次數 ${qTotal}`}。點擊可查看列隊詳情。`
    : '目前沒有等待中的製作列隊。';
  if(qCount || state.autoCraftInfinite || hasCurrent || hasAuto){
    pill.onpointerdown = (e)=>{ e.preventDefault(); e.stopPropagation(); openQueueModal('craft'); };
    pill.onclick = (e)=>e.preventDefault();
  }
  summary.appendChild(pill);
  if(hasCurrent || hasAuto){
    const cancel = document.createElement('button');
    cancel.type='button';
    cancel.className='tiny-btn queue-toggle';
    cancel.textContent='取消目前';
    cancel.onpointerdown=(e)=>{ e.preventDefault(); e.stopPropagation(); cancelCurrentCraft(); };
    cancel.onclick=(e)=>e.preventDefault();
    summary.appendChild(cancel);
  }
  if(qCount){
    const clear = document.createElement('button');
    clear.type='button';
    clear.className='tiny-btn queue-toggle';
    clear.textContent='清空';
    clear.onpointerdown=(e)=>{ e.preventDefault(); e.stopPropagation(); state.craftQueue=[]; renderCraftQueue(); renderAction(); };
    clear.onclick=(e)=>e.preventDefault();
    summary.appendChild(clear);
  }
  root.appendChild(summary);
}

function renderMerchant(){
  const root = document.getElementById('merchantArea');
  if(!root) return;
  markMerchantUiInteraction(250);
  root.innerHTML = '';

  const top = document.createElement('div');
  top.className = 'row';
  const status = document.createElement('span');
  status.className = 'pill';
  const safetyBand = getSafetyBand();
  status.textContent = state.merchant.present ? `商人到訪中（${Math.ceil(state.merchant.presentSec)} 秒）｜安全值 ${safetyValue()}｜${safetyBand.label}` : `每分鐘到訪率 ${Math.round(merchantChancePerMinute()*100)}%｜安全值 ${safetyValue()}｜${safetyBand.label}`;
  status.title = `安全值：${safetyValue()}
${safetyBand.desc}`;
  const orderInfo = document.createElement('span');
  orderInfo.className = 'pill';
  const highCount = state.merchant.orders.filter(o => (o.tier || 'common') !== 'common').length;
  orderInfo.textContent = `布告欄訂單：${state.merchant.orders.length}/${getMerchantOrderLimit()} 張｜高階 ${highCount} 張`;
  const cashInfo = document.createElement('span');
  cashInfo.className = 'pill';
  cashInfo.textContent = `商店資金：${Math.floor(toFiniteNumber(state.merchant.storeFunds, 0))} 金`;
  cashInfo.title = `商人來訪時會把帶來的資金投入商店。玩家購買時，消費金額也會流入商店；玩家賣出時，會直接扣除商店資金。`;
  top.appendChild(status);
  top.appendChild(orderInfo);
  top.appendChild(cashInfo);
  root.appendChild(top);

  const help = document.createElement('div');
  help.className = 'small muted';
  help.style.marginTop = '6px';
  help.textContent = `商人到訪時會在布告欄張貼收購訂單，並把本次帶來的金幣投入商店。玩家平時也能直接向商店賣貨；商店會用現有資金收購，而玩家購買商品花掉的金額也會回流到商店。布告欄訂單上限基礎 3 張，貿易等級每 5 等 +1 張，目前上限 ${getMerchantOrderLimit()} 張。`;
  root.appendChild(help);

  const boardTitle = document.createElement('div');
  boardTitle.className = 'section-title';
  boardTitle.style.marginTop = '8px';
  boardTitle.innerHTML = `<strong>布告欄</strong><span class="small muted">目前 ${state.merchant.orders.length}/${getMerchantOrderLimit()} 張｜基礎 3 張，貿易等級每 5 等 +1 張</span>`;
  root.appendChild(boardTitle);

  const board = document.createElement('div');
  board.className = 'merchant-board';
  if(!state.merchant.orders.length){
    const empty = document.createElement('div');
    empty.className = 'order-card';
    empty.innerHTML = `<div class="small muted">目前沒有待完成的商人訂單。上限 ${getMerchantOrderLimit()} 張。</div>`;
    board.appendChild(empty);
  } else {
    state.merchant.orders.forEach(order => {
      const card = document.createElement('div');
      card.className = 'order-card';
      const have = Math.floor(toFiniteNumber(state.resources[order.resource], 0));
      const title = document.createElement('strong');
      title.textContent = `${order.from}【${order.tierLabel || getOrderTierMeta(order.tier || 'common').label}】收購 ${resourceLabels[order.resource]}`;
      const need = document.createElement('div');
      need.className = 'small muted';
      need.textContent = `需求：${resourceLabels[order.resource]} ${order.qty}｜現有 ${have}`;
      const reward = document.createElement('div');
      reward.className = 'small muted';
      reward.textContent = `報酬：${order.rewardGold} 金、貿易 EXP ${order.rewardTrade}、聲望 ${order.rewardRep}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '繳交訂單';
      btn.disabled = have < order.qty;
      btn.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); if(!btn.disabled) fulfillMerchantOrder(order.id); };
      btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); if(!btn.disabled) fulfillMerchantOrder(order.id); };
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = '';
      cancelBtn.textContent = '取消訂單';
      cancelBtn.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); cancelMerchantOrder(order.id); };
      cancelBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); cancelMerchantOrder(order.id); };
      const actions = document.createElement('div');
      actions.className = 'order-actions';
      actions.appendChild(btn);
      actions.appendChild(cancelBtn);
      card.appendChild(title);
      card.appendChild(need);
      card.appendChild(reward);
      card.appendChild(actions);
      board.appendChild(card);
    });
  }
  root.appendChild(board);

  const marketTitle = document.createElement('div');
  marketTitle.className = 'section-title';
  marketTitle.style.marginTop = '10px';
  marketTitle.innerHTML = '<strong>商店與商人買賣</strong><span class="small muted">直接輸入要買或賣的數量，避免誤觸大量交易</span>';
  root.appendChild(marketTitle);

  const tabRow = document.createElement('div');
  tabRow.className = 'tab-row';
  const activeTab = shopCategories[state.ui.shopTab] ? state.ui.shopTab : 'all';
  state.ui.shopTab = activeTab;
  Object.entries(shopCategories).forEach(([key, cfg]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tab-btn' + (key === activeTab ? ' active' : '');
    btn.textContent = cfg.label;
    btn.onclick = () => {
      markMerchantUiInteraction(1200);
      state.ui.shopTab = key;
      renderMerchant();
    };
    tabRow.appendChild(btn);
  });
  root.appendChild(tabRow);

  const tabHelp = document.createElement('div');
  tabHelp.className = 'small muted';
  tabHelp.style.marginTop = '6px';
  tabHelp.textContent = shopCategories[activeTab].desc;
  root.appendChild(tabHelp);

  const grid = document.createElement('div');
  grid.className = 'merchant-grid';
  const ids = getShopTabItems(activeTab);
  ids.forEach(id => {
    const card = document.createElement('div');
    card.className = 'merchant-item';
    const stock = Math.floor(toFiniteNumber(state.resources[id], 0));
    const buyPrice = shopPrices[id];
    const sellPrice = sellPrices[id];
    const keepVal = Math.max(0, Math.floor(toFiniteNumber(state.merchant.keep[id], 0)));

    const lab = document.createElement('strong');
    lab.textContent = `${resourceLabels[id] || id}（現有 ${format(stock)}）`;
    card.appendChild(lab);

    const info = document.createElement('div');
    info.className = 'small muted';
    const parts = [];
    if(buyPrice != null) parts.push(`買 ${buyPrice} 金`);
    if(sellPrice != null) parts.push(`賣 ${sellPrice} 金`);
    info.textContent = parts.join('｜') || '不可買賣';
    card.appendChild(info);

    if(buyPrice != null){
      const rowBuy = document.createElement('div');
      rowBuy.className = 'row';
      rowBuy.style.gap = '6px';
      rowBuy.style.alignItems = 'center';
      const buyLabel = document.createElement('span');
      buyLabel.className = 'small muted';
      buyLabel.textContent = '買';
      const buyInput = document.createElement('input');
      buyInput.type = 'number';
      buyInput.min = '1';
      buyInput.step = '1';
      buyInput.inputMode = 'numeric';
      buyInput.value = getStoredShopQty('shopBuyQty', id, 1);
      buyInput.title = '輸入想購買的數量。';
      buyInput.oninput = () => {
        markMerchantUiInteraction(1800);
        setStoredShopQty('shopBuyQty', id, buyInput.value);
      };
      buyInput.onchange = buyInput.oninput;
      buyInput.onclick = () => markMerchantUiInteraction(1800);
      buyInput.onfocus = () => markMerchantUiInteraction(1800);
      buyInput.onkeydown = () => markMerchantUiInteraction(1800);
      rowBuy.appendChild(buyLabel);
      rowBuy.appendChild(buyInput);

      const buyBtn = document.createElement('button');
      buyBtn.className = 'tiny-btn';
      buyBtn.type = 'button';
      buyBtn.textContent = '購買';
      buyBtn.onpointerdown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        markMerchantUiInteraction(1800);
        buyFromShop(id, getStoredShopQty('shopBuyQty', id, buyInput.value || 1));
      };
      buyBtn.onclick = (e) => e.preventDefault();
      rowBuy.appendChild(buyBtn);

      card.appendChild(rowBuy);
    } else {
      const tag = document.createElement('span');
      tag.className = 'small muted';
      tag.textContent = '不可購買';
      card.appendChild(tag);
    }

    if(sellPrice != null){
      const rowSell = document.createElement('div');
      rowSell.className = 'row';
      rowSell.style.gap = '6px';
      rowSell.style.alignItems = 'center';
      const sellLabel = document.createElement('span');
      sellLabel.className = 'small muted';
      sellLabel.textContent = '賣';
      const sellInput = document.createElement('input');
      sellInput.type = 'number';
      sellInput.min = '1';
      sellInput.step = '1';
      sellInput.inputMode = 'numeric';
      sellInput.value = getStoredShopQty('shopSellQty', id, 1);
      sellInput.title = '輸入想賣給商店的數量。';
      sellInput.oninput = () => {
        markMerchantUiInteraction(1800);
        setStoredShopQty('shopSellQty', id, sellInput.value);
      };
      sellInput.onchange = sellInput.oninput;
      sellInput.onclick = () => markMerchantUiInteraction(1800);
      sellInput.onfocus = () => markMerchantUiInteraction(1800);
      sellInput.onkeydown = () => markMerchantUiInteraction(1800);
      rowSell.appendChild(sellLabel);
      rowSell.appendChild(sellInput);

      const sellBtn = document.createElement('button');
      sellBtn.className = 'tiny-btn';
      sellBtn.type = 'button';
      sellBtn.textContent = '賣出';
      sellBtn.disabled = false;
      sellBtn.onpointerdown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        markMerchantUiInteraction(1800);
        sellToMerchant(id, getStoredShopQty('shopSellQty', id, sellInput.value || 1));
      };
      sellBtn.onclick = (e) => e.preventDefault();
      rowSell.appendChild(sellBtn);

      card.appendChild(rowSell);
    } else {
      const note = document.createElement('div');
      note.className = 'small muted';
      note.textContent = '不可賣出';
      card.appendChild(note);
    }
    grid.appendChild(card);
  });
  root.appendChild(grid);
}



