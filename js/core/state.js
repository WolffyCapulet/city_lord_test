function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function deepMerge(base, patch) {
  if (!isPlainObject(base)) return patch ?? base;
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

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildDefaultUiState() {
  return {
    mainPage: "production",
    logFilter: "all",
    craftSmithyTab: "ingot",
    openSections: {
      resources: {},
      crafts: {
        basic: true,
        cooking: false,
        grinding: false,
        smithy: false,
        alchemy: false,
        tailoring: false,
        other: false
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

function buildDefaultState({
  createDefaultResources = () => ({}),
  createDefaultSkills = () => ({})
} = {}) {
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
    skills: createDefaultSkills(),
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

    logFilter: "all"
  };
}

export function createInitialState(options = {}) {
  return buildDefaultState(options);
}

export function normalizeState(state, options = {}) {
  const defaults = buildDefaultState(options);
  const normalized = deepMerge(defaults, state || {});

  const defaultResources =
    typeof options.createDefaultResources === "function"
      ? options.createDefaultResources()
      : {};
  const defaultSkills =
    typeof options.createDefaultSkills === "function"
      ? options.createDefaultSkills()
      : {};

  normalized.gold = toNumber(normalized.gold, 0);
  normalized.level = Math.max(1, toNumber(normalized.level, 1));
  normalized.exp = Math.max(0, toNumber(normalized.exp, 0));
  normalized.intelligence = Math.max(0, toNumber(normalized.intelligence, 0));

  normalized.stamina = Math.max(0, toNumber(normalized.stamina, 100));
  normalized.staminaLevel = Math.max(1, toNumber(normalized.staminaLevel, 1));
  normalized.staminaExp = Math.max(0, toNumber(normalized.staminaExp, 0));

  normalized.managementLevel = Math.max(1, toNumber(normalized.managementLevel, 1));
  normalized.managementExp = Math.max(0, toNumber(normalized.managementExp, 0));

  normalized.tradeLevel = Math.max(1, toNumber(normalized.tradeLevel, 1));
  normalized.tradeExp = Math.max(0, toNumber(normalized.tradeExp, 0));
  normalized.reputation = Math.max(0, toNumber(normalized.reputation, 0));

  normalized.castleLevel = Math.max(1, toNumber(normalized.castleLevel, 1));
  normalized.castleExp = Math.max(0, toNumber(normalized.castleExp, 0));
  normalized.safetyValue = Math.max(0, toNumber(normalized.safetyValue, 0));

  normalized.pendingTax = Math.max(0, toNumber(normalized.pendingTax, 0));
  normalized.campfireSec = Math.max(0, toNumber(normalized.campfireSec, 0));
  normalized.housingCap = Math.max(0, toNumber(normalized.housingCap, 0));

  normalized.resources = {
    ...defaultResources,
    ...(normalized.resources || {})
  };

  normalized.skills = deepMerge(defaultSkills, normalized.skills || {});
  Object.keys(defaultSkills).forEach((id) => {
    normalized.skills[id] = {
      level: Math.max(1, toNumber(normalized.skills[id]?.level, 1)),
      exp: Math.max(0, toNumber(normalized.skills[id]?.exp, 0))
    };
  });

  if (!Array.isArray(normalized.logs)) normalized.logs = [];
  if (!Array.isArray(normalized.workers)) normalized.workers = [];
  if (!Array.isArray(normalized.actionQueue)) normalized.actionQueue = [];
  if (!Array.isArray(normalized.craftQueue)) normalized.craftQueue = [];
  if (!Array.isArray(normalized.researchQueue)) normalized.researchQueue = [];

  if (!isPlainObject(normalized.research)) normalized.research = {};
  if (!isPlainObject(normalized.housing)) normalized.housing = {};
  if (!isPlainObject(normalized.buildings)) normalized.buildings = {};
  if (!isPlainObject(normalized.merchant)) normalized.merchant = {};
  if (!isPlainObject(normalized.ui)) normalized.ui = {};

  normalized.housing = deepMerge(buildDefaultHousing(), normalized.housing);
  normalized.buildings = deepMerge(buildDefaultBuildings(), normalized.buildings);
  normalized.merchant = deepMerge(buildDefaultMerchantState(), normalized.merchant);
  normalized.ui = deepMerge(buildDefaultUiState(), normalized.ui);

  if (!normalized.currentAction || typeof normalized.currentAction !== "object") {
    normalized.currentAction = null;
  }

  if (!normalized.currentCraft || typeof normalized.currentCraft !== "object") {
    normalized.currentCraft = null;
  }

  if (!normalized.currentResearch || typeof normalized.currentResearch !== "object") {
    normalized.currentResearch = null;
  }

  if (typeof normalized.logFilter !== "string") {
    normalized.logFilter = normalized.ui.logFilter || "all";
  }

  if (typeof normalized.ui.logFilter !== "string") {
    normalized.ui.logFilter = normalized.logFilter || "all";
  }

  if (typeof normalized.ui.mainPage !== "string") {
    normalized.ui.mainPage = "production";
  }

  if (typeof normalized.ui.craftSmithyTab !== "string") {
    normalized.ui.craftSmithyTab = "ingot";
  }

  if (!isPlainObject(normalized.ui.openSections)) {
    normalized.ui.openSections = buildDefaultUiState().openSections;
  }

  if (!isPlainObject(normalized.ui.openSections.resources)) {
    normalized.ui.openSections.resources = {};
  }

  if (!isPlainObject(normalized.ui.openSections.crafts)) {
    normalized.ui.openSections.crafts = buildDefaultUiState().openSections.crafts;
  }

  if (!isPlainObject(normalized.ui.openSections.research)) {
    normalized.ui.openSections.research = buildDefaultUiState().openSections.research;
  }

  if (!isPlainObject(normalized.ui.openSections.workers)) {
    normalized.ui.openSections.workers = {};
  }

  return normalized;
}

export function resetState(state, options = {}) {
  const fresh = createInitialState(options);

  Object.keys(state).forEach((key) => {
    delete state[key];
  });

  Object.assign(state, fresh);
  return state;
}

export function applyStatePatch(state, patch = {}, options = {}) {
  const merged = normalizeState(deepMerge(state, patch), options);

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
