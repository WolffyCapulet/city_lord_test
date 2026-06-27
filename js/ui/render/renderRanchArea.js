import { animalFeedDefs, animalRarity } from "../../data/dataAnimals.js";

function fmt(n) { return Math.floor(Number(n || 0)); }

const RARITY_LABEL = { common:"普通", uncommon:"常見", rare:"稀有", epic:"珍稀" };

export function renderRanchArea({
  state,
  ranchSystem,
  getResourceLabel,
  onFeedAnimal,
  onToggleBreeding
}) {
  const root = document.getElementById("pastureArea");
  if (!root || !ranchSystem) return;

  const ranchLv      = Number(state.buildings?.ranch || 0);
  const ranchWorkers = Array.isArray(state.workers)
    ? state.workers.filter(w => w.job === "ranch").length : 0;
  const totalCap = ranchSystem.getRanchTotalCapacity();
  const usedCap  = ranchSystem.getRanchUsedCapacity();

  // Update pill displays
  const lvEl = document.getElementById("ranchLevel");
  if (lvEl) lvEl.textContent = ranchLv;
  const wEl  = document.getElementById("ranchWorkers");
  if (wEl)  wEl.textContent  = ranchWorkers;

  const animals = Object.keys(animalFeedDefs);

  const statusLine = ranchLv > 0
    ? `牧場容量 ${usedCap} / ${totalCap}｜繁殖速度加成 ${ranchLv * 20}%｜牧場工人 ${ranchWorkers} 人`
    : "尚未建造牧場。可在建築區升級牧場，再指派工人到牧場工作。";

  const cards = animals.map(id => {
    const have    = fmt(state.resources?.[id] || 0);
    const cap     = ranchSystem.getAnimalCap(id);
    const rarity  = RARITY_LABEL[animalRarity[id]] || "普通";
    const feed    = animalFeedDefs[id];
    const rs      = state.ranchData?.[id] || { fed: 0, timer: 0, enabled: true };
    const enabled = ranchSystem.isAnimalBreedingEnabled(id);
    const needSec = ranchSystem.getAnimalBreedSeconds(id);
    const pct     = ranchSystem.getAnimalProgressPercent(id);
    const feedQty = fmt(state.resources?.[feed.food] || 0);

    const pairHint = id === "dairyCow" ? "｜需至少 1 公牛" : id === "bull" ? "｜需至少 1 乳牛" : "";
    const statusText = !enabled
      ? "繁殖已關閉"
      : rs.fed <= 0
        ? "尚未餵養"
        : `進度 ${Math.floor(rs.timer)} / ${needSec} 秒`;

    return `
      <div class="mini" title="${rarity}｜上限 ${cap} 隻">
        <strong>${getResourceLabel(id)}</strong>
        <div class="small muted">現有 ${have} / 上限 ${cap}｜${rarity}</div>
        <div class="small muted">餵 ${getResourceLabel(feed.food)} × ${feed.amount}（現有 ${feedQty}）${pairHint}</div>
        <div class="small muted">已餵 ${rs.fed} 次｜${statusText}</div>
        <div class="bar" style="margin-top:4px;">
          <div class="fill action" style="width:${pct.toFixed(1)}%;transition:none;"></div>
        </div>
        <div class="row" style="margin-top:6px;gap:6px;">
          <button class="tiny-btn" data-feed-animal="${id}" type="button"
            ${feedQty < feed.amount ? "disabled" : ""}>餵養</button>
          <button class="tiny-btn ${enabled ? "active" : ""}"
            data-toggle-breed="${id}" type="button">繁殖：${enabled ? "開" : "關"}</button>
        </div>
      </div>`;
  }).join("");

  root.innerHTML = `
    <div class="small muted">${statusLine}</div>
    <div class="small muted" style="margin-top:4px;">
      牧場工人會自動餵養並推進繁殖；乳牛與公牛需成對才可繁殖；超出上限自動屠宰。
    </div>
    <div class="info-grid" style="margin-top:8px;">${cards}</div>`;

  root.querySelectorAll("[data-feed-animal]").forEach(btn =>
    btn.addEventListener("click", () => onFeedAnimal?.(btn.dataset.feedAnimal)));

  root.querySelectorAll("[data-toggle-breed]").forEach(btn =>
    btn.addEventListener("click", () => onToggleBreeding?.(btn.dataset.toggleBreed)));
}
