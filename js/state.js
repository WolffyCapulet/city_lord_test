let state = null;
let lastTick = performance.now();
let allResourcesOpen = true;
let resourceOpenState = {};
let merchantUiInteractionUntil = 0;

function createInitialState() {
  const skills = {};
  Object.keys(skillLabels).forEach((k) => (skills[k] = { level: 1, exp: 0 }));
  return {
    gold: 0,
    level: 1,
    exp: 0,
    intelligence: 0,
    stamina: 100,
    staminaLevel: 1,
    staminaExp: 0,
    managementLevel: 1,
    managementExp: 0,
    castleLevel: 1,
    castleExp: 0,
    tradeLevel: 1,
    tradeExp: 0,
    reputation: 0,
    pendingTax: 0,
    campfireSec: 0,
    isResting: false,
    autoWork: null,
    autoWorkCount: 0,
    workQueue: [],
    autoCraft: null,
    autoCraftInfinite: false,
    craftQueue: [],
    craftRepeat: false,
    productionAction: null,
    craftAction: null,
    researchAction: null,
    researchQueue: [],
    playerAction: null,
    autoResting: false,
    autoRestResume: null,
    craftPausedForStamina: false,
    craftPausedName: "",
    staminaPotionBuff: 0,
    staminaPotionCooldown: 0,
    nextWorkerId: 1,
    workers: [],
    salaryTimer: 300,
    salaryDebt: 0,
    craftYieldCarry: {},
    houses: { cabin: 0, stoneHouse: 0, wall: 0 },
    buildings: { well: 0, library: 0, mill: 0, alchemyHut: 0, lumberMill: 0, quarry: 0, fishingShack: 0, tannery: 0, smithy: 0, townCenter: 0, ranch: 0, waterChannel: 0, windmill: 0 },
    research: Object.fromEntries(Object.keys(researchDefs).map((k) => [k, false])),
    ui: { researchTab: "available", hideCompletedResearch: false, craftQueueExpanded: false, logTab: "important", mainPage: "production", shopTab: "all", smithyTab: "ingot", manualSeedSelection: "wheatSeed", farmerSeedPreference: "auto", playerAutoEatThreshold: 0, playerAutoEatFood: "auto", shopBuyQty: {}, shopSellQty: {} },
    merchant: { minuteCounter: 0, present: false, presentSec: 0, cash: 0, maxCash: 0, storeFunds: 0, lastStoreInjection: 0, keep: {}, orders: [], nextOrderId: 1 },
    farmerAutoFertilize: false,
    ranchData: createInitialRanchData(),
    plots: [null, null, null],
    logs: [{ time: nowTime(), text: "開始遊戲。你是剛起步的城主。", type: "important" }],
    resources: Object.fromEntries(Object.keys(resourceLabels).map((k) => [k, 0])),
    skills
  };
}

function getLoadCandidates() {
  const keys = [STORAGE_KEY, STORAGE_KEY_LEGACY, ...LEGACY_STORAGE_KEYS];
  return [...new Set(keys)];
}

function unwrapSaveData(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  if (parsed && typeof parsed === "object" && parsed.data && typeof parsed.data === "object") {
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
  return { data: parsed, meta: { schemaVersion: 1, savedAt: null, gameVersion: null, sourceKey: null } };
}

function migrateLoadedState(data, meta = {}) {
  const migrated = JSON.parse(JSON.stringify(data));
  if (typeof migrated.saveSchemaVersion !== "number") migrated.saveSchemaVersion = meta.schemaVersion || 1;
  if (!migrated.meta || typeof migrated.meta !== "object") migrated.meta = {};
  if (meta.sourceKey) migrated.meta.lastLoadedFrom = meta.sourceKey;
  if (!Array.isArray(migrated.workers) && Array.isArray(migrated.workerList)) migrated.workers = migrated.workerList;
  if (!Array.isArray(migrated.plots)) {
    if (Array.isArray(migrated.fields)) migrated.plots = migrated.fields;
    else if (Array.isArray(migrated.farmPlots)) migrated.plots = migrated.farmPlots;
  }
  return migrated;
}

function getSaveTimestamp(unwrapped) {
  if (!unwrapped || !unwrapped.data || typeof unwrapped.data !== "object") return 0;
  const metaSavedAt = Number(unwrapped.meta && unwrapped.meta.savedAt);
  const dataSavedAt = Number(unwrapped.data && unwrapped.data.meta && unwrapped.data.meta.lastSavedAt);
  if (Number.isFinite(metaSavedAt) && metaSavedAt > 0) return metaSavedAt;
  if (Number.isFinite(dataSavedAt) && dataSavedAt > 0) return dataSavedAt;
  return 0;
}

function loadGame() {
  try {
    let best = null;
    for (const key of getLoadCandidates()) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const unwrapped = unwrapSaveData(parsed);
        if (!unwrapped || !unwrapped.data || typeof unwrapped.data !== "object") continue;
        unwrapped.meta.sourceKey = key;
        unwrapped.meta.detectedSavedAt = getSaveTimestamp(unwrapped);
        if (!best || unwrapped.meta.detectedSavedAt > best.meta.detectedSavedAt) best = unwrapped;
      } catch (err) {
        console.warn("讀取存檔失敗:", key, err);
      }
    }
    return best ? migrateLoadedState(best.data, best.meta) : null;
  } catch (err) {
    console.warn("讀取存檔失敗:", err);
    return null;
  }
}

function markMerchantUiInteraction(ms = 1200) {
  const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  merchantUiInteractionUntil = Math.max(merchantUiInteractionUntil, now + ms);
}

function isMerchantUiInteractionLocked() {
  const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  const root = document.getElementById("merchantArea");
  const hovering = !!(root && root.matches && root.matches(":hover"));
  const focused = !!(document.activeElement && document.activeElement.closest && document.activeElement.closest("#merchantArea"));
  return hovering || focused || now < merchantUiInteractionUntil;
}

function initializeState() {
  state = loadGame() || createInitialState();
  normalizeState(state);
  applyV060Migration(state);
  if (state.meta && state.meta.lastLoadedFrom && state.meta.lastLoadedFrom !== "new") {
    const sourceName = state.meta.lastLoadedFrom === STORAGE_KEY ? "共用存檔" : `舊版存檔（${state.meta.lastLoadedFrom}）`;
    if (!Array.isArray(state.logs)) state.logs = [];
    state.logs.unshift({ time: nowTime(), text: `已載入${sourceName}。`, type: "important" });
    if (state.meta.housingRecovered) {
      state.logs.unshift({ time: nowTime(), text: "已自動修復住房容量。", type: "important" });
      state.meta.housingRecovered = false;
    }
    state.logs = state.logs.slice(0, 220);
  }
  lastTick = performance.now();
}
