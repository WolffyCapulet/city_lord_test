import { renderResearchArea } from "./renderResearchArea.js";
import { renderActionLane } from "./renderActionLane.js";
import { renderCraftLane } from "./renderCraftLane.js";
import { renderResearchLane } from "./renderResearchLane.js";
import { renderLog } from "./renderLog.js";
import { renderTopStats } from "./renderTopStats.js";
import { renderResources } from "./renderResources.js";
import { renderSkillPills } from "./renderSkillPills.js";
import { renderWorkersArea } from "./renderWorkersArea.js";
import { renderMerchantArea } from "./renderMerchantArea.js";

export function createAppRenderer({
  state,
  workDefs,
  crafts,
  books,
  researchDefs,
  merchantRuntime = null,
  workersRuntime = null,

  getExpToNext,
  getMaxStamina,
  formatReadableDuration,
  formatSeconds,
  getResourceLabel,
  edibleValues,
  fuelDurations,
  getWorkCost,

  isResourceClickable,
  getResourceHint,
  onResourceClick,

  isCraftHidden,
  isCraftUnlocked,
  getCraftDuration,

  onWorkClick,
  onCraftClick,
  onStartResearch,
  onReadBook,

  onRemoveQueuedAction,
  onMoveQueuedAction,
  onRemoveQueuedCraft,
  onMoveQueuedCraft,

  getMissingRequirementText,
  isResearchCompleted,
  meetsResearchRequirements,

  onRecruitWorker = null,
  onPayDebt = null,
  onSetWorkerJob = null,
  onAdjustWorkersForJob = null,

  onFulfillOrder = null,
  onCancelOrder = null,
  onRefreshMerchant = null,

  buildSystem = null,
  onBuildHousing = null,
  onUpgradeBuilding = null
}) {
  const skillLabels = {
    labor: "打工", lumber: "伐木", mining: "挖礦", fishing: "釣魚",
    hunting: "狩獵", gathering: "採集", digging: "挖掘", farming: "耕種",
    woodworking: "木工", masonry: "石工", cooking: "烹飪", smelting: "冶煉",
    alchemy: "煉金", tanning: "裁縫"
  };

  function renderBuildingButtons() {
    const root = document.getElementById("buildingButtons");
    if (!root) return;

    if (!buildSystem) {
      root.innerHTML = '<span class="small muted">建築系統載入中...</span>';
      return;
    }

    const { buildingDefs, buildingOrder } = window.__cityLordBuildingDefs || {};
    if (!buildingDefs || !buildingOrder) {
      root.innerHTML = "";
      return;
    }

    root.innerHTML = buildingOrder.map((id) => {
      const def = buildingDefs[id];
      if (!def) return "";
      const level = buildSystem.getBuildingLevel(state, id);
      const maxed = level >= def.maxLevel;
      const unlocked = !def.unlockResearch || state.research?.[def.unlockResearch];
      if (!unlocked) return "";
      const fullCost = buildSystem.getUpgradeCost(id);
      const goldPart = fullCost.gold ? `${fullCost.gold} 金` : "";
      const resPart = Object.entries(fullCost.resources || {}).map(([r, a]) => `${getResourceLabel(r)}×${a}`).join(" ");
      const costText = [goldPart, resPart].filter(Boolean).join(" ");
      const tooltip = `${def.name} Lv.${level}/${def.maxLevel}\n${def.effectText}\n費用：${costText || "無"}`;
      return `<button type="button" data-upgrade-building="${id}" ${maxed ? "disabled" : ""} title="${tooltip}">${def.name} Lv.${level}</button>`;
    }).join("");

    root.querySelectorAll("[data-upgrade-building]").forEach((btn) => {
      btn.addEventListener("click", () => onUpgradeBuilding?.(btn.dataset.upgradeBuilding));
    });
  }

  function renderHeaderStats() {
    renderTopStats({
      state,
      getExpToNext,
      getMaxStamina,
      formatReadableDuration,
      getCycleTimeText: () => "",
      getCampfireBarPercent: (s) =>
        Math.min(100, Math.max(0, (Number(s.campfireSec || 0) / 180) * 100))
    });

    renderSkillPills({ state, skillLabels, expToNext: getExpToNext });
  }

  function renderMainPanels() {
    renderResources({
      state, getResourceLabel, edibleValues, fuelDurations,
      isResourceClickable, getResourceHint, onResourceClick
    });

    // Work and craft buttons are static HTML wired in wireProductionButtons()

    renderResearchArea({
      state, books, researchDefs, formatSeconds, getMissingRequirementText,
      isResearchCompleted, meetsResearchRequirements, onStartResearch, onReadBook
    });

    renderBuildingButtons();

    if (merchantRuntime) {
      renderMerchantArea({
        state,
        getResourceLabel,
        merchantSystem: merchantRuntime.merchantSystem,
        onFulfillOrder: (id) => { onFulfillOrder?.(id); renderAll(); },
        onCancelOrder: (id) => { onCancelOrder?.(id); renderAll(); },
        onRefreshMerchant: () => { onRefreshMerchant?.(); renderAll(); }
      });
    }

    if (workersRuntime) {
      renderWorkersArea({
        state, workersRuntime, onRecruitWorker, onPayDebt,
        onSetWorkerJob, onAdjustWorkersForJob
      });
    }
  }

  function renderLivePanels() {
    // Rebuild queue list HTML (called on user actions, not every tick)
    renderActionLane({
      state, workDefs, formatSeconds,
      onRemoveQueuedAction, onMoveQueuedAction
    });
    renderCraftLane({
      state, crafts, formatSeconds,
      onRemoveQueuedCraft, onMoveQueuedCraft
    });
    renderResearchLane({ state, formatSeconds });
  }

  function renderAll() {
    renderHeaderStats();
    renderMainPanels();
    renderLivePanels();
    renderLog({ state });
  }

  return {
    renderHeaderStats,
    renderMainPanels,
    renderLivePanels,
    renderAll
  };
}
