export function createInitialState(createDefaultResources) {
  return {
    gold: 0,
    level: 1,
    exp: 0,
    stamina: 100,

    resources: createDefaultResources(),
    logs: [],

    currentAction: null,
    actionQueue: [],

    research: {},
    currentResearch: null,
    researchQueue: [],

    housing: {},
    buildings: {},

    logFilter: "all"
  };
}

export function resetState(state, createDefaultResources) {
  state.gold = 0;
  state.level = 1;
  state.exp = 0;
  state.stamina = 100;

  state.resources = createDefaultResources();
  state.logs = [];

  state.currentAction = null;
  state.actionQueue = [];

  state.research = {};
  state.currentResearch = null;
  state.researchQueue = [];

  state.housing = {};
  state.buildings = {};

  state.logFilter = "all";
}

export function applyStatePatch(state, patch = {}) {
  Object.keys(patch).forEach((key) => {
    state[key] = patch[key];
  });

  return state;
}
