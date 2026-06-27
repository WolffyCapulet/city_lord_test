import { farmingDefs } from "../../data/dataFarming.js";

function escapeHtml(v) {
  return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function fmt(n) { return Math.floor(Number(n || 0)); }

export function renderFarmArea({
  state,
  farmSystem,
  getResourceLabel,
  onBuildPlot,
  onSelectSeed,
  onPlantSeed,
  onHarvestPlot,
  onFertilize,
  onToggleFarmerAuto,
  onToggleAutoFertilize
}) {
  const root = document.getElementById("plots");
  if (!root || !farmSystem) return;

  // Ensure UI state
  if (!state.ui) state.ui = {};
  if (!state.ui.manualSeedSelection || !farmingDefs[state.ui.manualSeedSelection]) {
    state.ui.manualSeedSelection = "wheatSeed";
  }
  if (typeof state.ui.farmerAuto !== "boolean") state.ui.farmerAuto = false;
  if (typeof state.ui.farmerAutoFertilize !== "boolean") state.ui.farmerAutoFertilize = false;

  const selectedSeed = state.ui.manualSeedSelection;
  const plots  = Array.isArray(state.plots) ? state.plots : [];
  const builtCount = farmSystem.countBuiltPlots();
  const plotCap    = farmSystem.getFarmPlotCap();
  const buildCost  = farmSystem.getFarmBuildCost();
  const atCap      = builtCount >= plotCap;

  // Farming level + seed return rate
  const farmLv = state.skills?.farming?.level || 1;
  const retPct = Math.round((farmSystem.getSeedReturnChance?.(selectedSeed) || 0) * 100);
  const lvEl = document.getElementById("farmingLevel");
  if (lvEl) lvEl.textContent = farmLv;
  const retEl = document.getElementById("seedReturnRate");
  if (retEl) retEl.textContent = `${retPct}%`;

  // Farmer auto button labels
  const farmerSeedBtn = document.getElementById("farmerSeedBtn");
  if (farmerSeedBtn) {
    farmerSeedBtn.textContent = `農夫：${state.ui.farmerAuto ? "自動" : "手動"}`;
    farmerSeedBtn.classList.toggle("active", !!state.ui.farmerAuto);
  }
  const autoFertBtn = document.getElementById("farmerAutoFertilizeBtn");
  if (autoFertBtn) {
    autoFertBtn.textContent = `施肥：${state.ui.farmerAutoFertilize ? "開" : "關"}`;
    autoFertBtn.classList.toggle("active", !!state.ui.farmerAutoFertilize);
  }
  const seedSelectBtn = document.getElementById("seedSelectBtn");
  if (seedSelectBtn) {
    seedSelectBtn.textContent = `手動：${farmingDefs[selectedSeed]?.name || "未選擇"}`;
  }

  // Cost display for build button
  const costParts = [];
  if (buildCost.gold) costParts.push(`${buildCost.gold} 金`);
  Object.entries(buildCost.resources || {}).forEach(([id, amt]) => {
    costParts.push(`${getResourceLabel(id)}×${amt}`);
  });
  const costText = costParts.join("、");

  // Plots grid
  const plotCards = plots.map((plot, idx) => {
    if (!plot) {
      return `
        <div class="plot" data-plot-idx="${idx}">
          <div class="plot-header">
            <div class="plot-label">農地 ${idx + 1}</div>
            <div class="plot-note">空地</div>
          </div>
          <div class="plot-note">目前選擇：${escapeHtml(farmingDefs[selectedSeed]?.name || "未選擇")}</div>
          <div class="plot-actions">
            <button class="tiny-btn" data-plant="${idx}" type="button">種下</button>
            <button class="tiny-btn" data-choose-seed="${idx}" type="button">選作物</button>
          </div>
        </div>`;
    }

    const def      = farmingDefs[plot.seedId];
    const matured  = plot.remaining <= 0;
    const progress = Math.min(100, Math.max(0, ((plot.total - plot.remaining) / plot.total) * 100));
    const boneMeal = fmt(state.resources?.boneMeal || 0);
    const compost  = fmt(state.resources?.compost  || 0);

    return `
      <div class="plot" data-plot-idx="${idx}" style="${matured ? "cursor:pointer;" : ""}">
        <div class="plot-header">
          <div class="plot-label">農地 ${idx + 1}：${escapeHtml(def?.name || plot.seedId)}</div>
          <div class="plot-note ${matured ? "good" : ""}">${matured ? "可收成！" : `剩 ${Number(plot.remaining).toFixed(1)} 秒`}</div>
        </div>
        <div class="plot-note">${plot.fertilized ? `已施肥（${plot.fertilizerType || ""}）` : "未施肥"}</div>
        <div class="bar" style="margin-top:4px;">
          <div class="fill exp" style="width:${progress.toFixed(1)}%;transition:none;"></div>
        </div>
        ${matured
          ? `<div class="plot-actions"><button class="tiny-btn" data-harvest="${idx}" type="button">收成</button></div>`
          : `<div class="plot-actions">
               <button class="tiny-btn" data-fertilize="${idx}" data-ftype="boneMeal" type="button"
                 ${plot.fertilized || boneMeal <= 0 ? "disabled" : ""}>骨粉（${boneMeal}）</button>
               <button class="tiny-btn" data-fertilize="${idx}" data-ftype="compost" type="button"
                 ${plot.fertilized || compost <= 0 ? "disabled" : ""}>肥料（${compost}）</button>
             </div>`
        }
      </div>`;
  }).join("");

  root.innerHTML = `
    <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px;">
      <div class="small muted"
        title="建造下一塊農田費用：${escapeHtml(costText)}｜城鎮中心每級 +2 上限">
        已建農田：${builtCount} / ${plotCap}
      </div>
      <button class="tiny-btn" id="_buildPlotBtn" type="button"
        ${atCap ? "disabled" : ""}
        title="費用：${escapeHtml(costText)}">
        ${atCap ? "建造農田（已上限）" : "建造農田"}
      </button>
    </div>
    <div class="plot-grid">${plotCards}</div>`;

  // ── Event listeners ───────────────────────────────────────
  root.querySelector("#_buildPlotBtn")?.addEventListener("click", () => onBuildPlot?.());

  root.querySelectorAll("[data-plant]").forEach(btn =>
    btn.addEventListener("click", () => onPlantSeed?.(Number(btn.dataset.plant))));

  root.querySelectorAll("[data-choose-seed]").forEach(btn =>
    btn.addEventListener("click", () => onSelectSeed?.(Number(btn.dataset.chooseSeed))));

  root.querySelectorAll("[data-harvest]").forEach(btn =>
    btn.addEventListener("click", e => { e.stopPropagation(); onHarvestPlot?.(Number(btn.dataset.harvest)); }));

  // Clicking whole matured plot harvests
  root.querySelectorAll(".plot").forEach(div => {
    const idx = Number(div.dataset.plotIdx);
    const plot = plots[idx];
    if (plot && plot.remaining <= 0) {
      div.addEventListener("click", e => {
        if (!e.target.closest("button")) onHarvestPlot?.(idx);
      });
    }
  });

  root.querySelectorAll("[data-fertilize]").forEach(btn =>
    btn.addEventListener("click", () =>
      onFertilize?.(Number(btn.dataset.fertilize), btn.dataset.ftype)));
}
