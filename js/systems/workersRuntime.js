import { workerJobs, workDefs } from "../data/works.js";
import { foodOrder, edibleValues } from "../data/resources.js";
import { crafts } from "../data/crafts.js";
import { housingDefs } from "../data/buildings.js";

import { getWorkSummaryLoot } from "./work.js";
import { createFarmSystem } from "./farm.js";
import { createRanchSystem } from "./ranch.js";

const WORKER_RECRUIT_COST = 40;
const WORKER_BASE_WAGE = 8;
const WORKER_PAY_INTERVAL = 300;
const WORKER_SWITCH_COOLDOWN = 10;
const WORKER_MAX_STAMINA = 30;

const FARMER_SEED_ORDER = [
  "wheatSeed",
  "mushroomSpore",
  "appleSeed",
  "cottonSeed",
  "carrotSeed"
];

const COOK_RECIPE_ORDER = [
  "grilledMeat",
  "grilledFish",
  "bread",
  "grilledSausage",
  "clamSoup",
  "applePie",
  "bearStew"
];

const CRAFT_RECIPE_ORDER = [
  "plank",
  "stoneBrick",
  "flour",
  "leather",
  "cottonThread",
  "cottonCloth",
  "bottle",
  "boneMeal",
  "compost",
  "herbTonic",
  "staminaPotion",
  "copperFirewood",
  "ironFirewood"
];

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function makeWorker(id) {
  return {
    id,
    job: "idle",
    remaining: 0,
    switchCooldown: 0,
    maxStamina: WORKER_MAX_STAMINA,
    stamina: WORKER_MAX_STAMINA,
    foodPreference: "auto",
    craftRecipe: "plank",
    cookRecipe: "auto"
  };
}

function getJobLabel(jobId) {
  if (jobId === "idle") return "待命";
  if (jobId === "farming") return "農夫";
  if (jobId === "crafting") return "工匠";
  if (jobId === "cook") return "廚師";
  if (jobId === "ranch") return "牧場工";
  return workDefs[jobId]?.name || jobId;
}

export function createWorkersRuntime({
  state,
  addLog,
  gainResource,
  spendResource,
  spendCosts,
  canAfford,
  addMainExp,
  addSkillExp,
  getResourceLabel = (id) => id
}) {
  if (!Array.isArray(state.workers)) state.workers = [];
  if (!Number.isFinite(state.nextWorkerId)) state.nextWorkerId = 1;
  if (!Number.isFinite(state.salaryDebt)) state.salaryDebt = 0;
  if (!Number.isFinite(state.salaryTimer)) state.salaryTimer = WORKER_PAY_INTERVAL;
  if (!Array.isArray(state.plots)) state.plots = [];
  if (!state.ranchData || typeof state.ranchData !== "object") state.ranchData = {};

  const farmSystem = createFarmSystem({
    state,
    addLog,
    gainResource,
    spendResource,
    spendCosts,
    getManagementMaterialDiscount: () => 0
  });

  const ranchSystem = createRanchSystem({
    state,
    addLog,
    gainResource,
    spendResource
  });

  function getHousingCapacity() {
    return Object.entries(state.housing || {}).reduce((sum, [buildingId, count]) => {
      const def = housingDefs[buildingId];
      return sum + Number(def?.housingGain || 0) * Number(count || 0);
    }, 0);
  }

  function getWorkerCount() {
    return Array.isArray(state.workers) ? state.workers.length : 0;
  }

  function getAvailableHousing() {
    return Math.max(0, getHousingCapacity() - getWorkerCount());
  }

  function getManagementWageDiscount() {
    return Math.min(0.25, Math.max(0, Number(state.managementLevel || 1)) * 0.008);
  }

  function effectiveWorkerWage() {
    return Math.max(1, Math.floor(WORKER_BASE_WAGE * (1 - getManagementWageDiscount())));
  }

  function getWorkerCycleTime(job = "idle") {
    if (job === "idle") return 0;
    if (workDefs[job]) return Math.max(6, Number(workDefs[job].base || 10));
    return 10;
  }

  function getWorkerStaminaCost(job = "idle") {
    if (job === "idle") return 0;
    if (workDefs[job]) return Math.max(1, Number(workDefs[job].staminaCost || 1));
    return 2;
  }

  function findWorker(workerId) {
    return state.workers.find((worker) => Number(worker.id) === Number(workerId)) || null;
  }

  function recruitWorker() {
    if (getWorkerCount() >= getHousingCapacity()) {
      addLog("沒有住房空位，不能招募工人。", "important");
      return false;
    }

    if (Number(state.gold || 0) < WORKER_RECRUIT_COST) {
      addLog(`金幣不足，無法招募工人，需要 ${WORKER_RECRUIT_COST} 金。`, "important");
      return false;
    }

    state.gold -= WORKER_RECRUIT_COST;
    state.workers.push(makeWorker(state.nextWorkerId++));
    addLog("成功招募一名工人。", "important");
    return true;
  }

  function setWorkerJob(workerId, job, { silent = false } = {}) {
    const worker = findWorker(workerId);
    if (!worker) return false;

    if (!workerJobs.includes(job)) {
      if (!silent) addLog(`找不到工種：${job}`, "important");
      return false;
    }

    if (worker.switchCooldown > 0) {
      if (!silent) addLog(`工人 #${worker.id} 剛換崗，請稍後再調度。`, "important");
      return false;
    }

    worker.job = job;
    worker.remaining = getWorkerCycleTime(job);
    worker.switchCooldown = WORKER_SWITCH_COOLDOWN;

    if (!silent) {
      addLog(`工人 #${worker.id} 已指派到：${getJobLabel(job)}。`, "important");
    }

    return true;
  }

  function adjustWorkersForJob(job, delta) {
    if (!workerJobs.includes(job) || job === "idle") return false;

    if (delta > 0) {
      const idleWorker = state.workers.find((worker) => {
        return worker.job === "idle" && Number(worker.switchCooldown || 0) <= 0;
      });

      if (!idleWorker) {
        addLog(`沒有可立即指派到${getJobLabel(job)}的待命工人。`, "important");
        return false;
      }

      setWorkerJob(idleWorker.id, job, { silent: true });
      idleWorker.switchCooldown = WORKER_SWITCH_COOLDOWN;
      addLog(`已快速指派工人 #${idleWorker.id} 到${getJobLabel(job)}。`, "important");
      return true;
    }

    if (delta < 0) {
      const assignedWorker = [...state.workers]
        .reverse()
        .find((worker) => worker.job === job && Number(worker.switchCooldown || 0) <= 0);

      if (!assignedWorker) {
        addLog(`${getJobLabel(job)}沒有可立即撤回的工人。`, "important");
        return false;
      }

      setWorkerJob(assignedWorker.id, "idle", { silent: true });
      assignedWorker.switchCooldown = WORKER_SWITCH_COOLDOWN;
      addLog(`已將工人 #${assignedWorker.id} 從${getJobLabel(job)}調回待命。`, "important");
      return true;
    }

    return false;
  }

  function payDebt() {
    const debt = Math.max(0, toInt(state.salaryDebt || 0));
    if (debt <= 0) {
      addLog("目前沒有欠薪。", "important");
      return false;
    }

    if (Number(state.gold || 0) < debt) {
      addLog("金幣不足，無法支付欠薪。", "important");
      return false;
    }

    state.gold -= debt;
    state.salaryDebt = 0;
    addLog(`已支付欠薪 ${debt} 金。`, "important");
    return true;
  }

  function getAutoCookCraftId(worker = null) {
    const preferred = worker?.cookRecipe;
    if (preferred && preferred !== "auto" && crafts[preferred] && canAfford(crafts[preferred].costs || {})) {
      return preferred;
    }

    return COOK_RECIPE_ORDER.find((craftId) => {
      const def = crafts[craftId];
      return !!def && canAfford(def.costs || {});
    }) || "";
  }

  function getAutoCraftRecipe(worker = null) {
    const preferred = worker?.craftRecipe;
    if (
      preferred &&
      crafts[preferred] &&
      !crafts[preferred].hidden &&
      canAfford(crafts[preferred].costs || {})
    ) {
      return preferred;
    }

    return CRAFT_RECIPE_ORDER.find((craftId) => {
      const def = crafts[craftId];
      if (!def) return false;
      if (def.hidden) return false;
      if (def.unlock && !state.research?.[def.unlock]) return false;
      return canAfford(def.costs || {});
    }) || "";
  }

  function chooseWorkerFood(worker) {
    const preferred = worker?.foodPreference;
    if (
      preferred &&
      preferred !== "auto" &&
      typeof edibleValues[preferred] === "number" &&
      Number(state.resources?.[preferred] || 0) > 0
    ) {
      return preferred;
    }

    for (const foodId of foodOrder) {
      if (
        typeof edibleValues[foodId] === "number" &&
        edibleValues[foodId] > 0 &&
        Number(state.resources?.[foodId] || 0) > 0
      ) {
        return foodId;
      }
    }

    return "";
  }

  function workerEatIfNeeded(worker, needed) {
    const foodId = chooseWorkerFood(worker);
    if (!foodId) return false;

    const recover = Number(edibleValues[foodId] || 0);
    if (recover <= 0) return false;
    if (!spendResource(foodId, 1)) return false;

    const missing = Math.max(0, Number(needed || 0) - Number(worker.stamina || 0));
    const actual = Math.min(
      Math.max(0, worker.maxStamina - worker.stamina),
      recover,
      Math.max(recover, missing)
    );

    worker.stamina = Math.min(worker.maxStamina, worker.stamina + actual);

    addLog(
      `工人 #${worker.id} 吃了${getResourceLabel(foodId)}，恢復 ${actual.toFixed(1)} 體力。`,
      "worker"
    );
    return worker.stamina >= needed;
  }

  function applyWorkerWorkResult(worker, workId) {
    const result = getWorkSummaryLoot(workId, state);
    const scaledResources = {};

    Object.entries(result.resources || {}).forEach(([id, amount]) => {
      const out = Math.max(1, Math.floor(Number(amount || 0) * 0.8));
      scaledResources[id] = out;
      gainResource(id, out);
    });

    const goldGain = Math.max(0, Math.floor(Number(result.gold || 0) * 0.8));
    state.gold = Math.max(0, Number(state.gold || 0) + goldGain);

    const skillId = workDefs[workId]?.skill;
    if (skillId) addSkillExp(skillId, 0.05);
    addMainExp(0.1);

    const gainedText = Object.entries(scaledResources)
      .map(([id, amount]) => `${getResourceLabel(id)} +${amount}`)
      .join("、");

    const goldText = goldGain > 0 ? `、金幣 +${goldGain}` : "";
    addLog(
      `工人 #${worker.id} 完成${getJobLabel(workId)}${gainedText ? `：${gainedText}` : ""}${goldText}`,
      "worker"
    );
    return true;
  }

  function doWorkerCraft(worker, craftId, { workerType = "工匠" } = {}) {
    const def = crafts[craftId];
    if (!def) return false;
    if (def.hidden) return false;
    if (def.unlock && !state.research?.[def.unlock]) return false;
    if (!canAfford(def.costs || {})) return false;
    if (!spendCosts(def.costs || {})) return false;

    Object.entries(def.yields || {}).forEach(([id, amount]) => {
      gainResource(id, amount);
    });

    if (def.skill) addSkillExp(def.skill, 0.05);
    addMainExp(0.1);

    const yieldText = Object.entries(def.yields || {})
      .map(([id, amount]) => `${getResourceLabel(id)} +${amount}`)
      .join("、");

    addLog(`${workerType} #${worker.id} 完成：${yieldText}`, "worker");
    return true;
  }

  function processFarming(worker) {
    for (let i = 0; i < state.plots.length; i += 1) {
      const plot = state.plots[i];
      if (plot && Number(plot.remaining || 0) <= 0) {
        const ok = farmSystem.harvestPlot(i);
        if (ok) {
          addSkillExp("farming", 0.05);
          addMainExp(0.1);
          addLog(`工人 #${worker.id} 完成收成。`, "worker");
          return true;
        }
      }
    }

    for (const seedId of FARMER_SEED_ORDER) {
      if (Number(state.resources?.[seedId] || 0) > 0) {
        const ok = farmSystem.plantSeed(seedId);
        if (ok) {
          addSkillExp("farming", 0.05);
          addMainExp(0.1);
          addLog(`工人 #${worker.id} 種下了${getResourceLabel(seedId)}。`, "worker");
          return true;
        }
      }
    }

    for (let i = 0; i < state.plots.length; i += 1) {
      const plot = state.plots[i];
      if (!plot) continue;

      if (!plot.fertilized && Number(state.resources?.compost || 0) > 0) {
        const ok = farmSystem.applyFertilizer(i, "compost");
        if (ok) {
          addLog(`工人 #${worker.id} 為農田施肥。`, "worker");
          return true;
        }
      }

      if (!plot.fertilized && Number(state.resources?.boneMeal || 0) > 0) {
        const ok = farmSystem.applyFertilizer(i, "boneMeal");
        if (ok) {
          addLog(`工人 #${worker.id} 為農田施肥。`, "worker");
          return true;
        }
      }
    }

    return false;
  }

  function processRanch(worker) {
    const animalIds = Object.keys(state.ranchData || {});
    for (const animalId of animalIds) {
      const have = Number(state.resources?.[animalId] || 0);
      if (have <= 0) continue;

      const def = state.ranchData?.[animalId];
      if (def && def.enabled === false) continue;

      const ok = ranchSystem.feedAnimalMany(animalId, 1);
      if (ok) {
        addLog(`工人 #${worker.id} 餵養了${getResourceLabel(animalId)}。`, "worker");
        return true;
      }
    }

    return false;
  }

  function performWorkerJob(worker) {
    const staminaNeed = getWorkerStaminaCost(worker.job);

    if (Number(worker.stamina || 0) < staminaNeed) {
      workerEatIfNeeded(worker, staminaNeed);

      if (Number(worker.stamina || 0) < staminaNeed) {
        worker.stamina = Math.min(worker.maxStamina, Number(worker.stamina || 0) + 2);
        worker.remaining = 10;
        addLog(`工人 #${worker.id} 體力不足，正在休息恢復。`, "worker");
        return;
      }
    }

    let didWork = false;

    if (worker.job === "farming") {
      didWork = processFarming(worker);
    } else if (worker.job === "crafting") {
      const craftId = getAutoCraftRecipe(worker);
      if (craftId) {
        didWork = doWorkerCraft(worker, craftId, { workerType: "工匠" });
      } else {
        addLog(`工匠 #${worker.id} 目前沒有可製作的材料。`, "worker");
      }
    } else if (worker.job === "cook") {
      const craftId = getAutoCookCraftId(worker);
      if (craftId) {
        didWork = doWorkerCraft(worker, craftId, { workerType: "廚師" });
      } else {
        addLog(`廚師 #${worker.id} 目前沒有可烹飪的材料。`, "worker");
      }
    } else if (worker.job === "ranch") {
      didWork = processRanch(worker);
      if (!didWork) {
        addLog(`牧場工 #${worker.id} 目前沒有可處理的飼養工作。`, "worker");
      }
    } else if (workDefs[worker.job]) {
      didWork = applyWorkerWorkResult(worker, worker.job);
    }

    if (didWork) {
      worker.stamina = Math.max(0, Number(worker.stamina || 0) - staminaNeed);
    }

    worker.remaining = getWorkerCycleTime(worker.job);
  }

  function updateWorkerSalaries(deltaSeconds) {
    state.salaryTimer = Number(state.salaryTimer || WORKER_PAY_INTERVAL) - deltaSeconds;

    if (state.salaryTimer > 0) return;

    while (state.salaryTimer <= 0) {
      state.salaryTimer += WORKER_PAY_INTERVAL;

      const workerCount = getWorkerCount();
      if (workerCount <= 0) continue;

      const wagePerWorker = effectiveWorkerWage();
      const totalWage = wagePerWorker * workerCount;

      if (Number(state.gold || 0) >= totalWage) {
        state.gold -= totalWage;
        addLog(`已支付工人薪資 ${totalWage} 金。`, "worker");
      } else {
        state.salaryDebt = Math.max(0, Number(state.salaryDebt || 0) + totalWage);
        addLog(`金幣不足，累積欠薪 ${totalWage} 金，工人停止工作。`, "important");
      }
    }
  }

  function update(deltaSeconds) {
    const safeDelta = Math.max(0, Math.min(0.25, Number(deltaSeconds || 0)));

    farmSystem.updatePlots(safeDelta);
    ranchSystem.updateRanch(safeDelta);
    updateWorkerSalaries(safeDelta);

    state.workers.forEach((worker) => {
      if (!worker) return;

      if (!Number.isFinite(worker.maxStamina)) worker.maxStamina = WORKER_MAX_STAMINA;
      if (!Number.isFinite(worker.stamina)) worker.stamina = worker.maxStamina;
      if (!Number.isFinite(worker.remaining)) worker.remaining = 0;
      if (!Number.isFinite(worker.switchCooldown)) worker.switchCooldown = 0;

      worker.switchCooldown = Math.max(0, worker.switchCooldown - safeDelta);

      if (worker.job === "idle" || Number(state.salaryDebt || 0) > 0) {
        worker.stamina = Math.min(worker.maxStamina, worker.stamina + safeDelta * 1.5);
        worker.remaining = 0;
        return;
      }

      worker.remaining -= safeDelta;
      if (worker.remaining <= 0) {
        performWorkerJob(worker);
      }
    });
  }

  function getJobCounts() {
    const counts = {};
    workerJobs.forEach((job) => {
      counts[job] = 0;
    });

    state.workers.forEach((worker) => {
      counts[worker.job] = (counts[worker.job] || 0) + 1;
    });

    return counts;
  }

  return {
    state,
    farmSystem,
    ranchSystem,
    recruitWorker,
    payDebt,
    setWorkerJob,
    adjustWorkersForJob,
    update,
    getJobCounts,
    getWorkerCount,
    getHousingCapacity,
    getAvailableHousing,
    effectiveWorkerWage,
    getWorkerCycleTime,
    getWorkerStaminaCost,
    getJobLabel
  };
}
