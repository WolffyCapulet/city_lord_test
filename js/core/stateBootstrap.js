export function createStateBootstrap({
  createInitialState,
  normalizeState,
  resetState,
  resourceLabels,
  crafts,
  books,
  skillLabels,
  logLimit = 100
}) {
  function createDefaultSkills() {
    return Object.fromEntries(
      Object.keys(skillLabels).map((id) => [id, { level: 1, exp: 0 }])
    );
  }

  function createDefaultResources() {
    const ids = new Set();

    Object.keys(resourceLabels).forEach((id) => ids.add(id));

    Object.values(crafts).forEach((craft) => {
      Object.keys(craft.costs || {}).forEach((id) => ids.add(id));
      Object.keys(craft.yields || {}).forEach((id) => ids.add(id));
    });

    Object.keys(books).forEach((id) => ids.add(id));

    return Object.fromEntries([...ids].sort().map((id) => [id, 0]));
  }

  function normalizeLogs(logs) {
    if (!Array.isArray(logs)) return [];

    return logs
      .map((item) => {
        if (typeof item === "string") {
          return { time: "", text: item, type: "important" };
        }

        return {
          time: item?.time || "",
          text: item?.text || "",
          type: item?.type || "important"
        };
      })
      .filter((item) => item.text)
      .slice(0, logLimit);
  }

  const stateOptions = {
    createDefaultResources,
    createDefaultSkills
  };

  function ensureStateShape(s = {}) {
    const state = s;

    state.gold = Number(state.gold || 0);
    state.level = Math.max(1, Number(state.level || 1));
    state.exp = Math.max(0, Number(state.exp || 0));
    state.intelligence = Math.max(0, Number(state.intelligence || 0));

    state.stamina = Math.max(0, Number(state.stamina || 100));
    state.staminaLevel = Math.max(1, Number(state.staminaLevel || 1));
    state.staminaExp = Math.max(0, Number(state.staminaExp || 0));

    state.managementLevel = Math.max(1, Number(state.managementLevel || 1));
    state.managementExp = Math.max(0, Number(state.managementExp || 0));

    state.tradeLevel = Math.max(1, Number(state.tradeLevel || 1));
    state.tradeExp = Math.max(0, Number(state.tradeExp || 0));
    state.reputation = Math.max(0, Number(state.reputation || 0));

    state.castleLevel = Math.max(1, Number(state.castleLevel || 1));
    state.castleExp = Math.max(0, Number(state.castleExp || 0));
    state.safetyValue = Math.max(0, Number(state.safetyValue || 0));

    state.pendingTax = Math.max(0, Number(state.pendingTax || 0));
    state.campfireSec = Math.max(0, Number(state.campfireSec || 0));
    state.housingCap = Math.max(0, Number(state.housingCap || 0));

    state.resources = {
      ...createDefaultResources(),
      ...(state.resources || {})
    };

    state.skills = {
      ...createDefaultSkills(),
      ...(state.skills || {})
    };

    Object.keys(skillLabels).forEach((id) => {
      state.skills[id] = {
        level: Math.max(1, Number(state.skills[id]?.level || 1)),
        exp: Math.max(0, Number(state.skills[id]?.exp || 0))
      };
    });

    state.logs = normalizeLogs(state.logs);

    if (!Array.isArray(state.workers)) state.workers = [];
    if (!Array.isArray(state.actionQueue)) state.actionQueue = [];
    if (!Array.isArray(state.craftQueue)) state.craftQueue = [];
    if (!Array.isArray(state.researchQueue)) state.researchQueue = [];

    if (!state.research || typeof state.research !== "object") state.research = {};
    if (!state.housing || typeof state.housing !== "object") state.housing = {};
    if (!state.buildings || typeof state.buildings !== "object") state.buildings = {};

    if (!state.merchant || typeof state.merchant !== "object") {
      state.merchant = {};
    }

    state.merchant.minuteCounter = Math.max(0, Number(state.merchant.minuteCounter || 0));
    state.merchant.present = !!state.merchant.present;
    state.merchant.presentSec = Math.max(0, Number(state.merchant.presentSec || 0));
    state.merchant.cash = Math.max(0, Math.floor(Number(state.merchant.cash || 0)));
    state.merchant.maxCash = Math.max(
      state.merchant.cash,
      Math.floor(Number(state.merchant.maxCash || state.merchant.cash || 0))
    );
    state.merchant.storeFunds = Math.max(0, Math.floor(Number(state.merchant.storeFunds || 0)));
    state.merchant.lastStoreInjection = Math.max(
      0,
      Math.floor(Number(state.merchant.lastStoreInjection || 0))
    );
    state.merchant.keep =
      state.merchant.keep && typeof state.merchant.keep === "object"
        ? state.merchant.keep
        : {};
    state.merchant.orders = Array.isArray(state.merchant.orders) ? state.merchant.orders : [];
    state.merchant.nextOrderId = Math.max(
      1,
      Math.floor(Number(state.merchant.nextOrderId || 1))
    );

    if (!state.ui || typeof state.ui !== "object") state.ui = {};
    if (typeof state.ui.mainPage !== "string") state.ui.mainPage = "production";
    if (typeof state.ui.logFilter !== "string") state.ui.logFilter = "all";
    if (typeof state.ui.craftSmithyTab !== "string") state.ui.craftSmithyTab = "ingot";

    if (!state.ui.openSections || typeof state.ui.openSections !== "object") {
      state.ui.openSections = {};
    }

    if (
      !state.ui.openSections.resources ||
      typeof state.ui.openSections.resources !== "object"
    ) {
      state.ui.openSections.resources = {};
    }

    if (!state.ui.openSections.crafts || typeof state.ui.openSections.crafts !== "object") {
      state.ui.openSections.crafts = {
        basic: true,
        cooking: false,
        grinding: false,
        smithy: false,
        alchemy: false,
        tailoring: false,
        processing: false,
        other: false
      };
    }

    if (typeof state.ui.openSections.crafts.processing !== "boolean") {
      state.ui.openSections.crafts.processing = false;
    }

    if (
      !state.ui.openSections.research ||
      typeof state.ui.openSections.research !== "object"
    ) {
      state.ui.openSections.research = {
        books: true
      };
    }

    if (!state.ui.openSections.workers || typeof state.ui.openSections.workers !== "object") {
      state.ui.openSections.workers = {};
    }

    if (!state.currentAction || typeof state.currentAction !== "object") {
      state.currentAction = null;
    }
    if (!state.currentCraft || typeof state.currentCraft !== "object") {
      state.currentCraft = null;
    }
    if (!state.currentResearch || typeof state.currentResearch !== "object") {
      state.currentResearch = null;
    }

    if (typeof state.logFilter !== "string") state.logFilter = state.ui.logFilter || "all";
    state.ui.logFilter = state.logFilter;

    return state;
  }

  function safeCreateInitialState() {
    try {
      return ensureStateShape(createInitialState(stateOptions));
    } catch {
      return ensureStateShape({});
    }
  }

  function safeNormalizeState(raw) {
    try {
      return ensureStateShape(normalizeState(raw, stateOptions));
    } catch {
      return ensureStateShape(raw || {});
    }
  }

  function safeResetState(target) {
    try {
      resetState(target, stateOptions);
      return ensureStateShape(target);
    } catch {
      const fresh = safeCreateInitialState();
      Object.keys(target).forEach((key) => delete target[key]);
      Object.assign(target, fresh);
      return target;
    }
  }

  return {
    stateOptions,
    createDefaultSkills,
    createDefaultResources,
    normalizeLogs,
    ensureStateShape,
    safeCreateInitialState,
    safeNormalizeState,
    safeResetState
  };
}
