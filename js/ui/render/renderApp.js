import { renderResearchArea } from "./renderResearchArea.js";
import { renderActionLane } from "./renderActionLane.js";
import { renderCraftLane } from "./renderCraftLane.js";
import { renderResearchLane } from "./renderResearchLane.js";
import { renderLog } from "./renderLog.js";
import { renderTopStats } from "./renderTopStats.js";
import { renderResources } from "./renderResources.js";
import { renderWorkButtons } from "./renderWorkButtons.js";
import { renderCraftList } from "./renderCraftList.js";
import { renderSkillPills } from "./renderSkillPills.js";
import { renderWorkersArea } from "./renderWorkersArea.js";

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
  onAdjustWorkersForJob = null
}) {
  function renderPlaceholders() {
    const setPlaceholder = (id, text) => {
      const el = document.getElementById(id);
      if (el && !el.innerHTML.trim()) {
        el.innerHTML = `<div class="small muted">${text}</div>`;
      }
    };

    setPlaceholder("buildingButtons", "建築系統尚未接回 main.js");
    setPlaceholder("plots", "農田系統尚未接回 main.js");
    setPlaceholder("pastureArea", "牧場系統尚未接回 main.js");

    if (!workersRuntime) {
      setPlaceholder("workers", "工人系統尚未接回 main.js");
    }
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

    renderSkillPills({
      state,
      skillLabels: {
        labor: "打工",
        lumber: "伐木",
        mining: "挖礦",
        fishing: "釣魚",
        hunting: "狩獵",
        gathering: "採集",
        digging: "挖掘",
        farming: "耕種",
        woodworking: "木工",
        masonry: "石工",
        cooking: "烹飪",
        smelting: "冶煉",
        alchemy: "煉金",
        tanning: "裁縫"
      },
      expToNext: getExpToNext
    });
  }

  function renderMainPanels() {
    renderResources({
      state,
      getResourceLabel,
      edibleValues,
      fuelDurations,
      isResourceClickable,
      getResourceHint,
      onResourceClick
    });

    renderWorkButtons({
      workDefs,
      getWorkCost,
      getWorkDuration: (def) =>
        typeof def.duration === "number" ? def.duration : 1,
      formatSeconds,
      onWorkClick
    });

    renderCraftList({
      state,
      crafts,
      getResourceLabel,
      isCraftHidden,
      isCraftUnlocked,
      onCraftClick,
      getCraftDuration,
      formatSeconds
    });

    renderResearchArea({
      state,
      books,
      researchDefs,
      formatSeconds,
      getMissingRequirementText,
      isResearchCompleted,
      meetsResearchRequirements,
      onStartResearch,
      onReadBook
    });

    merchantRuntime?.render?.({
      onAfterChange: renderAll
    });

    if (workersRuntime) {
      renderWorkersArea({
        state,
        workersRuntime,
        onRecruitWorker,
        onPayDebt,
        onSetWorkerJob,
        onAdjustWorkersForJob
      });
    }
  }

  function renderLivePanels() {
    renderActionLane({
      state,
      workDefs,
      getWorkCost,
      formatSeconds,
      onRemoveQueuedAction,
      onMoveQueuedAction
    });

    renderCraftLane({
      state,
      crafts,
      formatSeconds,
      onRemoveQueuedCraft,
      onMoveQueuedCraft
    });

    renderResearchLane({
      state,
      formatSeconds
    });

    merchantRuntime?.render?.({
      onAfterChange: renderAll
    });

    if (workersRuntime) {
      renderWorkersArea({
        state,
        workersRuntime,
        onRecruitWorker,
        onPayDebt,
        onSetWorkerJob,
        onAdjustWorkersForJob
      });
    }
  }

  function renderAll() {
    renderHeaderStats();
    renderMainPanels();
    renderLivePanels();
    renderLog({ state });
    renderPlaceholders();
  }

  return {
    renderHeaderStats,
    renderMainPanels,
    renderLivePanels,
    renderPlaceholders,
    renderAll
  };
}
