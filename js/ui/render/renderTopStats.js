export function renderTopStats({
  state,
  getExpToNext,
  getMaxStamina,
  formatReadableDuration = (seconds) => `${Math.max(0, Math.ceil(Number(seconds || 0)))}s`,
  getCycleTimeText = () => "",
  getHousingUsed = (s) => Array.isArray(s.workers) ? s.workers.length : 0,
  getHousingCap = (s) => Number(s.housingCap || 0),
  getSafetyValue = (s) => Number(s.safetyValue || 0),
  getTownStageName = (s) => s.townStageName || s.researchUnlockText || "荒地",
  getCampfireBarPercent = (s) => (Number(s.campfireSec || 0) > 0 ? 100 : 0)
}) {
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const setWidth = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.style.width = value;
  };

  const toggleClass = (id, className, enabled) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle(className, !!enabled);
  };

  const expNext = getExpToNext(state.level || 1);
  const maxStamina = getMaxStamina(state);

  const staminaLevel = state.staminaLevel || 1;
  const staminaExp = Number(state.staminaExp || 0);
  const staminaExpNext = getExpToNext(staminaLevel);

  const managementLevel = state.managementLevel || 1;
  const managementExp = Number(state.managementExp || 0);
  const managementExpNext = getExpToNext(managementLevel);

  const housingUsed = getHousingUsed(state);
  const housingCap = getHousingCap(state);
  const safetyValue = getSafetyValue(state);
  const townStageName = getTownStageName(state);

  setText("gold", Math.floor(state.gold || 0));
  setText("level", state.level || 1);
  setText("exp", Math.floor(state.exp || 0));
  setText("expNext", expNext);

  setText("intelligence", state.intelligence || 0);
  setText("cycleTime", getCycleTimeText(state));

  setText("stamina", Math.floor(state.stamina || 0));
  setText("maxStamina", maxStamina);

  setText("staminaLevel", staminaLevel);
  setText("staminaExp", Math.floor(staminaExp));
  setText("staminaExpNext", staminaExpNext);

  setText("managementLevel", managementLevel);
  setText("managementExp", Math.floor(managementExp));
  setText("managementExpNext", managementExpNext);

  setText("tradeLevel", state.tradeLevel || 1);
  setText("reputationValue", Number(state.reputation || 0).toFixed(1));
  setText("taxIncome", Math.floor(state.pendingTax || 0));
  setText("castleLevel", state.castleLevel || 1);

  setText("housingUsed", housingUsed);
  setText("housingCap", housingCap);
  setText("safetyValue", safetyValue);

  setText("salaryTimer", formatReadableDuration(state.salaryTimer || 0));
  setText("salaryDebt", Math.floor(state.salaryDebt || 0));
  setText("wageDebt", Math.floor(state.salaryDebt || 0));
  setText("campfireSec", formatReadableDuration(state.campfireSec || 0));
  setText("campfireTimer", formatReadableDuration(state.campfireSec || 0));

  // Cycle time based on intelligence
  const intel = Number(state.intelligence || 0);
  const raw = (1 + 0.02 * intel) / 10;
  const capped = raw <= 1 ? raw : 1 + (raw - 1) * 0.35;
  const cycleSec = Math.max(5, 1 / capped);
  setText("cycleTime", cycleSec.toFixed(2));

  // Town stage
  const townStageDefs = [
    {name:"荒地", minLevel:1, reqHouses:{}, reqBuildings:{}},
    {name:"小村落", minLevel:2, reqHouses:{cabin:2, wall:1}, reqBuildings:{well:1}},
    {name:"村落", minLevel:4, reqHouses:{cabin:3, wall:3}, reqBuildings:{well:1}},
    {name:"大村落", minLevel:6, reqHouses:{cabin:4, wall:6}, reqBuildings:{well:2}},
    {name:"城鎮", minLevel:10, reqHouses:{stoneHouse:3, wall:12}, reqBuildings:{townCenter:1, smithy:1, library:1}}
  ];
  let stage = townStageDefs[0];
  for (const s of townStageDefs) {
    const ok = state.level >= s.minLevel &&
      Object.entries(s.reqHouses || {}).every(([k,v]) => (state.housing?.[k]||0) >= v) &&
      Object.entries(s.reqBuildings || {}).every(([k,v]) => (state.buildings?.[k]||0) >= v);
    if (ok) stage = s;
  }
  const stageEl = document.getElementById("researchUnlockText");
  if (stageEl) stageEl.textContent = stage.name;
  setText("townStageLabel", stage.name);

  setWidth(
    "expBar",
    `${Math.min(100, Math.max(0, ((state.exp || 0) / expNext) * 100))}%`
  );

  setWidth(
    "staminaBar",
    `${Math.min(100, Math.max(0, ((state.stamina || 0) / maxStamina) * 100))}%`
  );

  setWidth(
    "staminaExpBar",
    `${Math.min(100, Math.max(0, (staminaExp / staminaExpNext) * 100))}%`
  );

  setWidth(
    "managementBar",
    `${Math.min(
      100,
      Math.max(0, (managementExp / managementExpNext) * 100)
    )}%`
  );

  setWidth(
    "campfireBar",
    `${Math.min(100, Math.max(0, getCampfireBarPercent(state)))}%`
  );

  const eatHint = document.getElementById("eatHint");
  if (eatHint) {
    eatHint.textContent = "休息 5/秒，閒置 0.1/秒（受體力等級加成）";
  }

  const claimTaxBtn = document.getElementById("claimTaxBtn");
  if (claimTaxBtn) {
    claimTaxBtn.disabled = !(Number(state.pendingTax || 0) > 0);
  }

  toggleClass("salaryPill", "bad", Number(state.salaryDebt || 0) > 0);
  toggleClass("campfirePill", "bad", Number(state.campfireSec || 0) <= 0);
  toggleClass("taxPill", "good", Number(state.pendingTax || 0) > 0);
}
