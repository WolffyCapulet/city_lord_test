import { farmingDefs, farmPlotRules } from "../data/farming.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roll(chance) {
  return Math.random() < chance;
}

export function createFarmSystem({
  state,
  addLog,
  gainResource,
  spendResource,
  spendCosts,
  getManagementMaterialDiscount
}) {
  if (!Array.isArray(state.plots)) state.plots = [null, null, null];

  function countBuiltPlots() {
    return Array.isArray(state.plots) ? state.plots.length : 0;
  }

  function getFarmPlotCap() {
    const townCenterLevel = Number(state.buildings?.townCenter || 0);
    return farmPlotRules.basePlotCap + townCenterLevel * farmPlotRules.townCenterPlotBonusPerLevel;
  }

  function getFarmBuildCost() {
    const built = countBuiltPlots();

    return {
      gold: farmPlotRules.baseBuildCost.gold + built * farmPlotRules.goldCostPerBuiltPlot,
      resources: {
        planks:
          farmPlotRules.baseBuildCost.resources.planks +
          Math.floor(built / 3) * farmPlotRules.plankCostEveryThreePlots,
        dirt:
          farmPlotRules.baseBuildCost.resources.dirt +
          built * farmPlotRules.dirtCostPerBuiltPlot,
        stone:
          farmPlotRules.baseBuildCost.resources.stone +
          Math.floor(built / 2) * farmPlotRules.stoneCostEveryTwoPlots
      }
    };
  }

  function applyMaterialDiscount(costs) {
    const discount = Math.max(0, Number(getManagementMaterialDiscount?.() || 0));
    if (discount <= 0) return { ...costs };

    const out = {};
    Object.entries(costs).forEach(([id, amount]) => {
      out[id] = Math.max(1, Math.ceil(amount * (1 - discount)));
    });
    return out;
  }

  function buildFarmPlot() {
    if (countBuiltPlots() >= getFarmPlotCap()) {
      addLog("農田已達上限", "important");
      return false;
    }

    const rawCost = getFarmBuildCost();
    const finalCost = {
      gold: rawCost.gold,
      resources: applyMaterialDiscount(rawCost.resources)
    };

    if ((state.gold || 0) < finalCost.gold) {
      addLog(`金幣不足，建造農田需要 ${finalCost.gold} 金`, "important");
      return false;
    }

    if (!spendCosts(finalCost.resources)) {
      addLog("材料不足，建造農田失敗", "important");
      return false;
    }

    state.gold -= finalCost.gold;
    state.plots.push(null);

    addLog(`你建造了一塊農田，目前 ${countBuiltPlots()} / ${getFarmPlotCap()}`, "important");
    return true;
  }

  function getCropDuration(seedId) {
    const def = farmingDefs[seedId];
    if (!def) return 60;

    const waterLevel = Number(state.buildings?.waterChannel || 0);
    const bonus = waterLevel * 0.1;
    return def.duration / (1 + bonus);
  }

  function getCropYieldMultiplier(seedId) {
    const waterLevel = Number(state.buildings?.waterChannel || 0);
    const farmingLevel = Number(state.skills?.farming?.level || 1);

    const waterBonus = waterLevel * 0.12;
    const farmingBonus = Math.floor(Math.max(0, farmingLevel - 1) / 5) * 0.05;

    return 1 + waterBonus + farmingBonus;
  }

  function getSeedReturnChance(seedId) {
    const def = farmingDefs[seedId];
    if (!def || def.fixedSeedReturn) return 0;

    const farmingLevel = Number(state.skills?.farming?.level || 1);
    const windmillLevel = Number(state.buildings?.windmill || 0);

    const base = def.returnBase || 0;
    const bonus =
      Math.min(0.25, Math.max(0, farmingLevel - 1) * 0.01) +
      windmillLevel * 0.05;

    return clamp(base + bonus, 0, 0.95);
  }

  function getFixedSeedReturnRange(seedId) {
    const def = farmingDefs[seedId];
    if (!def?.fixedSeedReturn) return null;

    const farmingLevel = Number(state.skills?.farming?.level || 1);
    const windmillLevel = Number(state.buildings?.windmill || 0);

    const skillBonus = Math.floor(Math.max(0, farmingLevel - 1) / 10);
    const windBonus = Math.floor(windmillLevel / 2);

    return {
      min: Math.max(0, def.fixedSeedReturn[0] + skillBonus + windBonus),
      max: Math.max(0, def.fixedSeedReturn[1] + skillBonus + windBonus)
    };
  }

  function getSeedReturnCount(seedId) {
    const range = getFixedSeedReturnRange(seedId);
    if (!range) return 0;
    return randInt(range.min, Math.max(range.min, range.max));
  }

  function getSeedReturnDisplayText(seedId) {
    const range = getFixedSeedReturnRange(seedId);
    if (range) return `固定返還 ${range.min}~${range.max} 顆種子`;
    return `種子返還率 ${Math.round(getSeedReturnChance(seedId) * 100)}%`;
  }

  function getFirstEmptyPlotIndex() {
    return state.plots.findIndex((plot) => plot === null);
  }

  function plantSeed(seedId, plotIndex = -1) {
    const def = farmingDefs[seedId];
    if (!def) {
      addLog("找不到作物資料", "important");
      return false;
    }

    if ((state.resources?.[seedId] || 0) <= 0) {
      addLog(`沒有${def.name}種子`, "important");
      return false;
    }

    const index = plotIndex >= 0 ? plotIndex : getFirstEmptyPlotIndex();
    if (index < 0 || index >= state.plots.length) {
      addLog("沒有可用的農田", "important");
      return false;
    }

    if (state.plots[index] !== null) {
      addLog("這塊農田已經有作物了", "important");
      return false;
    }

    if (!spendResource(seedId, 1)) {
      addLog(`沒有${def.name}種子`, "important");
      return false;
    }

    const duration = getCropDuration(seedId);

    state.plots[index] = {
      seedId,
      name: def.name,
      remaining: duration,
      total: duration,
      fertilized: false,
      fertilizerType: ""
    };

    addLog(`你種下了${def.name}`, "important");
    return true;
  }

  function applyFertilizer(plotIndex, type) {
    const plot = state.plots[plotIndex];
    if (!plot) {
      addLog("這塊農田沒有作物", "important");
      return false;
    }

    if (plot.fertilized) {
      addLog("這塊農田已經施肥過了", "important");
      return false;
    }

    if ((state.resources?.[type] || 0) <= 0) {
      addLog(`沒有${type}`, "important");
      return false;
    }

    if (!spendResource(type, 1)) return false;

    const reduction = type === "boneMeal" ? 0.05 : 0.1;
    const reduceTime = plot.total * reduction;

    plot.remaining = Math.max(0, plot.remaining - reduceTime);
    plot.fertilized = true;
    plot.fertilizerType = type;

    addLog(`已對${plot.name}施肥`, "important");
    return true;
  }

  function harvestPlot(plotIndex) {
    const plot = state.plots[plotIndex];
    if (!plot) {
      addLog("這塊農田沒有作物", "important");
      return false;
    }

    if (plot.remaining > 0) {
      addLog(`${plot.name}尚未成熟`, "important");
      return false;
    }

    const def = farmingDefs[plot.seedId];
    if (!def) {
      state.plots[plotIndex] = null;
      return false;
    }

    const multiplier = getCropYieldMultiplier(plot.seedId);
    const gains = {};

    Object.entries(def.yields || {}).forEach(([id, range]) => {
      const base = randInt(range[0], range[1]);
      const finalAmount = Math.max(1, Math.floor(base * multiplier));
      gainResource(id, finalAmount);
      gains[id] = finalAmount;
    });

    if (def.fixedSeedReturn) {
      const seedBack = getSeedReturnCount(plot.seedId);
      if (seedBack > 0) {
        gainResource(plot.seedId, seedBack);
        gains[plot.seedId] = (gains[plot.seedId] || 0) + seedBack;
      }
    } else {
      if (roll(getSeedReturnChance(plot.seedId))) {
        gainResource(plot.seedId, 1);
        gains[plot.seedId] = (gains[plot.seedId] || 0) + 1;
      }
    }

    const gainText = Object.entries(gains)
      .map(([id, amount]) => `${id} +${amount}`)
      .join("、");

    state.plots[plotIndex] = null;
    addLog(`你收成了${def.name}：${gainText}`, "loot");
    return true;
  }

  function updatePlots(deltaSeconds) {
    state.plots = state.plots.map((plot) => {
      if (!plot) return null;

      return {
        ...plot,
        remaining: Math.max(0, plot.remaining - deltaSeconds)
      };
    });
  }

  return {
    countBuiltPlots,
    getFarmPlotCap,
    getFarmBuildCost,
    buildFarmPlot,
    getCropDuration,
    getCropYieldMultiplier,
    getSeedReturnChance,
    getFixedSeedReturnRange,
    getSeedReturnCount,
    getSeedReturnDisplayText,
    plantSeed,
    applyFertilizer,
    harvestPlot,
    updatePlots
  };
}
