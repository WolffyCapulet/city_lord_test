function escapeHtml(v) {
  return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function fmt(n) { return Math.floor(Number(n || 0)); }
function fmtSec(s) { return `${Math.max(0, Number(s||0)).toFixed(1)} 秒`; }

const JOB_LABELS = {
  idle:"待命", labor:"打工", lumber:"伐木", mining:"挖礦",
  fishing:"釣魚", hunting:"狩獵", forest:"森林採集",
  shore:"海邊採集", digging:"挖掘",
  farming:"農夫", crafting:"工匠", cook:"廚師", ranch:"牧場工"
};
const ALL_JOBS = Object.keys(JOB_LABELS);

export function renderWorkersArea({
  state,
  workersRuntime,
  crafts,
  getResourceLabel,
  onRecruitWorker,
  onPayDebt,
  onSetWorkerJob,
  onAdjustWorkersForJob,
  onSetWorkerFood,
  onSetWorkerCraftRecipe,
  onSetWorkerCookRecipe
}) {
  const root = document.getElementById("workers");
  if (!root) return;

  const WORKER_PAY_INTERVAL = 300;
  const workers   = Array.isArray(state.workers) ? state.workers : [];
  const counts    = workersRuntime.getJobCounts();
  const housingCap = workersRuntime.getHousingCapacity();
  const avail     = workersRuntime.getAvailableHousing();
  const wage      = workersRuntime.effectiveWorkerWage();
  const debt      = fmt(state.salaryDebt || 0);
  const salaryTimer = Math.max(0, Number(state.salaryTimer || 300));
  const cycleTime  = workersRuntime.getWorkerCycleTime("labor");

  // ── Header ────────────────────────────────────────────────
  const headerHtml = `
    <div class="row" style="margin:8px 0;gap:8px;flex-wrap:wrap;align-items:center;">
      <span class="pill">工人：${workers.length} / ${housingCap}</span>
      <span class="pill">空位：${avail}</span>
      <span class="pill">薪資：${wage} 金 / 每 ${WORKER_PAY_INTERVAL} 秒</span>
      <span class="pill" id="salaryCountdown">下次結算：${fmtSec(salaryTimer)}</span>
      <span class="pill ${debt > 0 ? "bad" : ""}">欠薪：${debt}</span>
      <span class="pill">平均週期：${cycleTime.toFixed(2)} 秒</span>
      <button class="tiny-btn" id="_recruitBtn" type="button">招募工人（40金）</button>
      <button class="tiny-btn" id="_payDebtBtn" type="button" ${debt <= 0 ? "disabled":""}>支付欠薪</button>
    </div>
    <div class="small muted" style="margin-bottom:8px;">
      工人需要住房空位才能招募；工匠製作、廚師烹飪自動選擇材料；農夫自動種植收成；牧場工自動餵養。
    </div>`;

  // ── Quick assign grid ─────────────────────────────────────
  const jobKeys = ALL_JOBS.filter(j => j !== "idle");
  const quickGrid = `
    <div class="quick-assign-grid" style="margin-bottom:12px;">
      ${jobKeys.map(job => `
        <div class="qa-row">
          <div>
            <strong>${escapeHtml(JOB_LABELS[job])}</strong>
            <span class="small muted">（${counts[job] || 0} 人）</span>
          </div>
          <div class="qa-controls">
            <button class="tiny-btn" data-adjust="${escapeHtml(job)}" data-delta="-1"
              ${(counts[job] || 0) <= 0 ? "disabled" : ""}>−</button>
            <span class="job-count">${counts[job] || 0}</span>
            <button class="tiny-btn" data-adjust="${escapeHtml(job)}" data-delta="1"
              ${avail <= 0 && (counts.idle || 0) <= 0 ? "disabled" : ""}>+</button>
          </div>
        </div>`).join("")}
    </div>`;

  // ── Worker cards ──────────────────────────────────────────
  const foodIds = ["grilledMeat","grilledFish","bread","grilledSausage","clamSoup","applePie","bearStew","staminaPotion"];
  const craftIds = Object.entries(crafts||{})
    .filter(([id,def]) => !def.hidden && (!def.unlock || state.research?.[def.unlock]))
    .map(([id]) => id);
  const cookIds = Object.entries(crafts||{})
    .filter(([,def]) => def.skill === "cooking" && !def.hidden)
    .map(([id]) => id);

  const workerCards = workers.length === 0
    ? `<div class="small muted">還沒有工人。先蓋房子，再招募。</div>`
    : `<div class="workers-grid">${workers.map(w => {
        const job = w.job || "idle";
        const stamPct = Math.min(100, Math.max(0, (w.stamina||0) / (w.maxStamina||30) * 100));
        const remainSec = Math.max(0, Number(w.remaining||0));
        const cycleSec  = workersRuntime.getWorkerCycleTime(job) || 10;
        const progPct   = job === "idle" ? 0 : Math.min(100, Math.max(0, ((cycleSec - remainSec) / cycleSec) * 100));
        const cooldown  = Math.max(0, Number(w.switchCooldown||0));

        const jobOpts = ALL_JOBS.map(j =>
          `<option value="${escapeHtml(j)}" ${j===job?"selected":""}>${escapeHtml(JOB_LABELS[j])}</option>`
        ).join("");

        // Preference buttons for crafting/cook
        let prefExtra = "";
        if (job === "crafting") {
          const cur = w.craftRecipe || "plank";
          prefExtra = `<div class="row" style="margin-top:4px;gap:4px;">
            <span class="small muted">配方：</span>
            <select data-worker-craft="${w.id}" class="tiny-btn" style="font-size:11px;padding:3px 5px;">
              ${craftIds.map(id => `<option value="${id}" ${id===cur?"selected":""}>${escapeHtml(crafts[id]?.name||id)}</option>`).join("")}
            </select>
          </div>`;
        } else if (job === "cook") {
          const cur = w.cookRecipe || "auto";
          prefExtra = `<div class="row" style="margin-top:4px;gap:4px;">
            <span class="small muted">烹飪：</span>
            <select data-worker-cook="${w.id}" class="tiny-btn" style="font-size:11px;padding:3px 5px;">
              <option value="auto" ${cur==="auto"?"selected":""}>自動</option>
              ${cookIds.map(id => `<option value="${id}" ${id===cur?"selected":""}>${escapeHtml(crafts[id]?.name||id)}</option>`).join("")}
            </select>
          </div>`;
        }

        const foodCur = w.foodPreference || "auto";
        const foodPref = `<div class="row" style="margin-top:4px;gap:4px;">
          <span class="small muted">食物：</span>
          <select data-worker-food="${w.id}" class="tiny-btn" style="font-size:11px;padding:3px 5px;">
            <option value="auto" ${foodCur==="auto"?"selected":""}>自動</option>
            ${foodIds.map(id => {
              const qty = fmt(state.resources?.[id]||0);
              return `<option value="${id}" ${id===foodCur?"selected":""}>${escapeHtml(getResourceLabel(id))}（${qty}）</option>`;
            }).join("")}
          </select>
        </div>`;

        return `
          <div class="worker">
            <div class="worker-status">
              <span class="worker-label">工人 #${w.id}
                <span class="pill" style="font-size:10px;">${escapeHtml(JOB_LABELS[job]||job)}</span>
                ${cooldown > 0 ? `<span class="small muted">（換崗冷卻 ${fmtSec(cooldown)}）</span>` : ""}
              </span>
              <span class="small muted">${fmt(w.stamina||0)}/${w.maxStamina||30} 體</span>
            </div>
            <div class="bar"><div class="fill" style="width:${stamPct.toFixed(1)}%;background:linear-gradient(90deg,#34d399,#10b981);"></div></div>
            <div class="bar" style="margin-top:3px;"><div class="fill action" style="width:${progPct.toFixed(1)}%;"></div></div>
            <div class="small muted" style="margin-top:2px;">週期剩餘 ${fmtSec(remainSec)}</div>
            <div class="row" style="margin-top:6px;gap:6px;">
              <select data-worker-job-select="${w.id}" style="flex:1;min-width:0;">${jobOpts}</select>
              <button class="tiny-btn" data-worker-set-job="${w.id}"
                ${cooldown > 0 ? "disabled" : ""}>改派</button>
            </div>
            ${foodPref}
            ${prefExtra}
          </div>`;
      }).join("")}</div>`;

  root.innerHTML = headerHtml + quickGrid + workerCards;

  // ── Event listeners ───────────────────────────────────────
  root.querySelector("#_recruitBtn")?.addEventListener("click", () => onRecruitWorker?.());
  root.querySelector("#_payDebtBtn")?.addEventListener("click", () => onPayDebt?.());

  root.querySelectorAll("[data-adjust]").forEach(btn => {
    btn.addEventListener("click", () => {
      onAdjustWorkersForJob?.(btn.dataset.adjust, Number(btn.dataset.delta));
    });
  });

  root.querySelectorAll("[data-worker-set-job]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id  = btn.dataset.workerSetJob;
      const sel = root.querySelector(`[data-worker-job-select="${id}"]`);
      onSetWorkerJob?.(id, sel?.value || "idle");
    });
  });

  root.querySelectorAll("[data-worker-food]").forEach(sel => {
    sel.addEventListener("change", () => {
      onSetWorkerFood?.(sel.dataset.workerFood, sel.value);
    });
  });

  root.querySelectorAll("[data-worker-craft]").forEach(sel => {
    sel.addEventListener("change", () => {
      onSetWorkerCraftRecipe?.(sel.dataset.workerCraft, sel.value);
    });
  });

  root.querySelectorAll("[data-worker-cook]").forEach(sel => {
    sel.addEventListener("change", () => {
      onSetWorkerCookRecipe?.(sel.dataset.workerCook, sel.value);
    });
  });
}
