import {
  animalFeedDefs,
  animalRarity,
  ranchRarityCaps,
  createInitialRanchData
} from "../data/animals.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roll(chance) {
  return Math.random() < chance;
}

export function createRanchSystem({
  state,
  addLog,
  gainResource,
  spendResource
}) {
  if (!state.ranchData || typeof state.ranchData !== "object") {
    state.ranchData = createInitialRanchData();
  }

  function getRanchTotalCapacity() {
    return 50 + (Number(state.buildings?.ranch || 0) * 150);
  }

  function getAnimalCap(animalId) {
    const rarity = animalRarity[animalId] || "common";
    const ratio = ranchRarityCaps[rarity] || 0.1;
    return Math.max(1, Math.floor(getRanchTotalCapacity() * ratio));
  }

  function getRanchUsedCapacity() {
    return Object.keys(animalRarity).reduce((sum, id) => {
      return sum + Math.floor(Number(state.resources?.[id] || 0));
    }, 0);
  }

  function isAnimalBreedingEnabled(animalId) {
    return state.ranchData?.[animalId]?.enabled !== false;
  }

  function toggleAnimalBreeding(animalId) {
    if (!state.ranchData[animalId]) {
      state.ranchData[animalId] = { fed: 0, timer: 0, enabled: true };
    }

    state.ranchData[animalId].enabled = !isAnimalBreedingEnabled(animalId);

    if (!state.ranchData[animalId].enabled) {
      state.ranchData[animalId].timer = 0;
    }

    addLog(
      `${animalId} 繁殖已${state.ranchData[animalId].enabled ? "開啟" : "關閉"}`,
      "important"
    );
    return state.ranchData[animalId].enabled;
  }

  function getAnimalBreedSeconds(animalId) {
    const def = animalFeedDefs[animalId];
    if (!def) return 240;

    const ranchLevel = Number(state.buildings?.ranch || 0);
    const speedBonus = 1 + ranchLevel * 0.2;

    return Math.max(60, Math.round(def.breedSeconds / speedBonus));
  }

  function getAnimalProgressPercent(animalId) {
    const ranchState = state.ranchData?.[animalId] || { fed: 0, timer: 0, enabled: true };

    if (!isAnimalBreedingEnabled(animalId) || ranchState.fed <= 0) return 0;

    const need = getAnimalBreedSeconds(animalId);
    if (need <= 0) return 0;

    return clamp((ranchState.timer / need) * 100, 0, 100);
  }

  function feedAnimalMany(animalId, qty = 1) {
    const def = animalFeedDefs[animalId];
    if (!def) return false;

    const haveFood = Math.floor(Number(state.resources?.[def.food] || 0));
    const maxFeed = Math.floor(haveFood / Math.max(1, def.amount));
    const times = Math.max(1, Math.min(Math.floor(Number(qty) || 1), maxFeed));

    if (times <= 0) {
      addLog(`${animalId} 需要 ${def.food} × ${def.amount} 才能餵養`, "important");
      return false;
    }

    if (!state.ranchData[animalId]) {
      state.ranchData[animalId] = { fed: 0, timer: 0, enabled: true };
    }

    spendResource(def.food, def.amount * times);
    state.ranchData[animalId].fed += times;

    addLog(`已餵養 ${animalId} ${times} 次`, "important");
    return true;
  }

  function feedAnimal(animalId) {
    return feedAnimalMany(animalId, 1);
  }

  function getAutoCullLootForAnimal(animalId, count) {
    const drops = {};
    const add = (id, amount) => {
      if (amount > 0) drops[id] = (drops[id] || 0) + amount;
    };

    for (let i = 0; i < count; i++) {
      if (animalId === "chicken") {
        add("rawChicken", randInt(1, 2));
        add("feather", randInt(1, 3));
        add("bone", 1);
      } else if (animalId === "rabbit") {
        add("rawMeat", randInt(1, 3));
        add("hide", 1);
        add("bone", randInt(1, 2));
      } else if (animalId === "dairyCow") {
        add("rawMeat", randInt(4, 8));
        add("hide", randInt(1, 2));
        add("milk", randInt(2, 4));
      } else if (animalId === "bull") {
        add("rawMeat", randInt(4, 8));
        add("hide", randInt(1, 2));
        add("cowHorn", randInt(1, 2));
      } else if (animalId === "boar") {
        add("rawMeat", randInt(4, 8));
        add("offal", randInt(1, 4));
        add("hide", randInt(1, 3));
        add("bone", randInt(1, 3));
        if (roll(0.25)) add("boarTusk", randInt(1, 2));
      } else if (animalId === "deer") {
        add("rawMeat", randInt(3, 7));
        add("offal", randInt(1, 3));
        add("hide", randInt(1, 2));
        add("bone", randInt(1, 3));
        if (roll(0.5)) add("deerAntler", randInt(1, 2));
      } else if (animalId === "wolf") {
        add("rawMeat", randInt(2, 5));
        add("offal", randInt(1, 2));
        add("hide", randInt(1, 2));
        add("bone", randInt(1, 3));
      } else if (animalId === "brownBear") {
        add("rawMeat", randInt(6, 12));
        add("offal", randInt(2, 6));
        add("hide", randInt(2, 5));
        add("bone", randInt(2, 5));
        if (roll(0.35)) add("bearPaw", randInt(1, 2));
        if (roll(0.2)) add("bearFang", randInt(1, 2));
      } else if (animalId === "blackBear") {
        add("rawMeat", randInt(8, 15));
        add("offal", randInt(3, 8));
        add("hide", randInt(3, 6));
        add("bone", randInt(3, 6));
        if (roll(0.5)) add("bearPaw", randInt(1, 2));
        if (roll(0.35)) add("bearFang", randInt(1, 3));
      }
    }

    return drops;
  }

  function autoCullExcessAnimals(logIt = false) {
    Object.keys(animalRarity).forEach((animalId) => {
      const have = Math.floor(Number(state.resources?.[animalId] || 0));
      const cap = getAnimalCap(animalId);

      if (have <= cap) return;

      const extra = have - cap;
      state.resources[animalId] = cap;

      const loot = getAutoCullLootForAnimal(animalId, extra);
      Object.entries(loot).forEach(([id, amount]) => gainResource(id, amount));

      if (logIt) {
        const text = Object.entries(loot)
          .map(([id, amount]) => `${id} ${amount}`)
          .join("、");

        addLog(`因牧場容量調整，自動處理 ${animalId} ${extra} 隻，獲得：${text}`, "important");
      }
    });
  }

  function updateRanch(deltaSeconds) {
    Object.keys(animalFeedDefs).forEach((animalId) => {
      const def = animalFeedDefs[animalId];
      const ranchState = state.ranchData?.[animalId];
      if (!def || !ranchState) return;
      if (!isAnimalBreedingEnabled(animalId)) return;
      if (ranchState.fed <= 0) return;

      const needSeconds = getAnimalBreedSeconds(animalId);

      const haveCount = Math.floor(Number(state.resources?.[animalId] || 0));
      const canBreedSingle =
        ["chicken", "rabbit", "boar", "deer", "wolf", "brownBear", "blackBear"].includes(animalId) &&
        haveCount >= 2;

      const canBreedCowPair =
        animalId === "dairyCow" &&
        (state.resources?.dairyCow || 0) >= 1 &&
        (state.resources?.bull || 0) >= 1;

      if (!canBreedSingle && !canBreedCowPair) return;

      ranchState.timer += deltaSeconds;

      while (ranchState.timer >= needSeconds && ranchState.fed > 0) {
        ranchState.timer -= needSeconds;
        ranchState.fed -= 1;

        if (animalId === "chicken") {
          gainResource("egg", 1);
          if (roll(def.hatchChance || 1)) gainResource("chicken", 1);
        } else if (canBreedCowPair) {
          if (roll(def.hatchChance || 1)) gainResource("dairyCow", 1);
        } else {
          if (roll(def.hatchChance || 1)) gainResource(animalId, 1);
        }
      }
    });

    autoCullExcessAnimals(false);
  }

  return {
    getRanchTotalCapacity,
    getAnimalCap,
    getRanchUsedCapacity,
    isAnimalBreedingEnabled,
    toggleAnimalBreeding,
    getAnimalBreedSeconds,
    getAnimalProgressPercent,
    feedAnimal,
    feedAnimalMany,
    autoCullExcessAnimals,
    updateRanch
  };
}
