function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function deepMerge(base, patch) {
  if (!isPlainObject(base)) return patch;
  if (!isPlainObject(patch)) return patch ?? base;

  const result = { ...base };

  Object.keys(patch).forEach((key) => {
    const baseValue = base[key];
    const patchValue = patch[key];

    if (Array.isArray(patchValue)) {
      result[key] = [...patchValue];
      return;
    }

    if (isPlainObject(baseValue) && isPlainObject(patchValue)) {
      result[key] = deepMerge(baseValue, patchValue);
      return;
    }

    result[key] = patchValue;
  });

  return result;
}

function buildDefaultUiState() {
  return {
    mainPage: "production",
    logFilter: "all",
    openSections: {
      resources: {},
      crafts: {
        "基礎加工": true,
        "烹飪": false,
        "研磨": false,
        "冶煉與工具": false,
        "煉金與文具": false,
        "製革與裁縫": false,
        "獵物分解與開殼": false
      },
      research: {
        books: true
      },
      workers: {}
    }
  };
}

function buildDefaultBuildings() {
  return {
    well: 0,
    library: 0,
    mill: 0,
    alchemyHut: 0,
    lumberMill: 0,
    quarry: 0,
    fishingShack: 0,
    tannery: 0,
    smithy: 0,
    townCenter: 0,
    ranch: 0,
    waterChannel: 0,
    windmill: 0
  };
}

function buildDefaultHousing() {
  return {
    cabin: 0,
    stoneHouse: 0,
    wall: 0
  };
}

function buildDefaultMerchantState() {
  return {
    present: false,
    cash: 0,
    orders: [],
    storeFunds: 0
  };
}

export function createInitialState(createDefaultResources = () => ({})) {
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

    tradeLevel: 1,
    tradeExp: 0,
    reputation: 0,

    castleLevel: 1,
    castleExp: 0,
    safetyValue: 0,

    pendingTax: 0,
    campfireSec: 0,

    resources: createDefaultResources(),
    logs: [],

    workers: [],
    housingCap: 0,

    currentAction: null,
    actionQueue: [],

    currentCraft: null,
    craftQueue: [],

    research: {},
    currentResearch: null,
    researchQueue: [],

    housing: buildDefaultHousing(),
    buildings: buildDefaultBuildings(),
    merchant: buildDefaultMerchantState(),

    ui: buildDefaultUiState(),

    // 先保留一份相容欄位，避免你現有 render 還在讀舊位置
    logFilter: "all"
  };
}

export function normalizeState(state, createDefaultResources = () => ({})) {
  const defaults = createInitialState(createDefaultResources);
  const normalized = deepMerge(defaults, state || {});

  // resources 要保留預設資源鍵
  normalized.resources = {
    ...createDefaultResources(),
    ...(state?.resources || {})
  };

  // ui / openSections 保底
  normalized.ui = deepMerge(buildDefaultUiState(), normalized.ui || {});
  normalized.ui.openSections = deepMerge(
    buildDefaultUiState().openSections,
    normalized.ui.openSections || {}
  );

  // 讓舊 renderLog 也能吃到
  if (typeof normalized.logFilter !== "string") {
    normalized.logFilter = normalized.ui.logFilter || "all";
  }

  if (typeof normalized.ui.logFilter !== "string") {
    normalized.ui.logFilter = normalized.logFilter || "all";
  }

  // housing / buildings / merchant 保底
  normalized.housing = deepMerge(buildDefaultHousing(), normalized.housing || {});
  normalized.buildings = deepMerge(buildDefaultBuildings(), normalized.buildings || {});
  normalized.merchant = deepMerge(buildDefaultMerchantState(), normalized.merchant || {});

  if (!Array.isArray(normalized.logs)) normalized.logs = [];
  if (!Array.isArray(normalized.workers)) normalized.workers = [];
  if (!Array.isArray(normalized.actionQueue)) normalized.actionQueue = [];
  if (!Array.isArray(normalized.craftQueue)) normalized.craftQueue = [];
  if (!Array.isArray(normalized.researchQueue)) normalized.researchQueue = [];

  return normalized;
}

export function resetState(state, createDefaultResources = () => ({})) {
  const fresh = createInitialState(createDefaultResources);

  Object.keys(state).forEach((key) => {
    delete state[key];
  });

  Object.assign(state, fresh);

  return state;
}

export function applyStatePatch(state, patch = {}, createDefaultResources = () => ({})) {
  const merged = normalizeState(deepMerge(state, patch), createDefaultResources);

  Object.keys(state).forEach((key) => {
    delete state[key];
  });

  Object.assign(state, merged);

  return state;
}

export function ensureSectionState(state, sectionName, key, defaultOpen = false) {
  if (!state.ui) state.ui = buildDefaultUiState();
  if (!state.ui.openSections) state.ui.openSections = buildDefaultUiState().openSections;
  if (!state.ui.openSections[sectionName]) state.ui.openSections[sectionName] = {};

  if (typeof state.ui.openSections[sectionName][key] !== "boolean") {
    state.ui.openSections[sectionName][key] = defaultOpen;
  }

  return state.ui.openSections[sectionName][key];
}

export function toggleSectionOpen(state, sectionName, key, defaultOpen = false) {
  const current = ensureSectionState(state, sectionName, key, defaultOpen);
  state.ui.openSections[sectionName][key] = !current;
  return state.ui.openSections[sectionName][key];
}

export function setSectionOpen(state, sectionName, key, isOpen = true) {
  ensureSectionState(state, sectionName, key, false);
  state.ui.openSections[sectionName][key] = !!isOpen;
}

export function setAllSectionsOpen(state, sectionName, keys = [], isOpen = true) {
  if (!state.ui) state.ui = buildDefaultUiState();
  if (!state.ui.openSections) state.ui.openSections = buildDefaultUiState().openSections;
  if (!state.ui.openSections[sectionName]) state.ui.openSections[sectionName] = {};

  keys.forEach((key) => {
    state.ui.openSections[sectionName][key] = !!isOpen;
  });
}
