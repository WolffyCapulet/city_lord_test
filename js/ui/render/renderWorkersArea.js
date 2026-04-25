function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatSeconds(seconds) {
  return `${Math.max(0, Number(seconds || 0)).toFixed(1)} 秒`;
}

export function renderWorkersArea({
  state,
  workersRuntime,
  onRecruitWorker,
  onPayDebt,
  onSetWorkerJob,
  onAdjustWorkersForJob
}) {
  const root = document.getElementById("workers");
  if (!root) return;

  const workers = Array.isArray(state.workers) ? state.workers : [];
  const counts = workersRuntime.getJobCounts();
  const housingCap = workersRuntime.getHousingCapacity();
  const availableHousing = workersRuntime.getAvailableHousing();
  const wage = workersRuntime.effectiveWorkerWage();
  const salaryDebt = Math.max(0, Number(state.salaryDebt || 0));
  const cooldownCount = workers.filter((worker) => Number(worker.switchCooldown || 0) > 0).length;

  root.innerHTML = `
    <div class="row" style="margin:10px 0 8px;align-items:center;gap:8px;flex-wrap:wrap;">
      <span class="pill">工人總數：${workers.length}</span>
      <span class="pill">住房：${workers.length}/${housingCap}</span>
      <span class="pill">空位：${availableHousing}</span>
      <span class="pill">單人工資：${wage} / 300秒</span>
      <span class="pill">欠薪：${salaryDebt}</span>
      <button id="workersRecruitInlineBtn" class="tiny-btn" type="button">招募工人</button>
      <button id="workersPayDebtInlineBtn" class="tiny-btn" type="button">支付欠薪</button>
    </div>

    ${
      workers.length === 0
        ? `<div class="small muted" style="margin-top:8px;">還沒有工人。先蓋房，再招募。</div>`
        : `
          <div class="small muted" style="margin:8px 0 10px;">
            快速指派：按 + 從待命工人派往崗位，按 − 把該崗位工人調回待命。
            目前待命 ${counts.idle || 0} 人｜正在換崗 ${cooldownCount} 人
          </div>

          <div class="worker-quick-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin-bottom:12px;">
            ${[
              "labor",
              "lumber",
              "mining",
              "fishing",
              "hunting",
              "forest",
              "shore",
              "digging",
              "farming",
              "crafting",
              "cook",
              "ranch"
            ]
              .map((job) => {
                return `
                  <div style="border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:8px;background:rgba(255,255,255,.03);display:flex;justify-content:space-between;align-items:center;gap:8px;">
                    <div>
                      <strong>${escapeHtml(workersRuntime.getJobLabel(job))}</strong>
                      <div class="small muted">目前 ${counts[job] || 0} 人</div>
                    </div>
                    <div class="row" style="gap:6px;">
                      <button class="tiny-btn" type="button" data-worker-adjust-minus="${escapeHtml(job)}">−</button>
                      <span>${counts[job] || 0}</span>
                      <button class="tiny-btn" type="button" data-worker-adjust-plus="${escapeHtml(job)}">+</button>
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;">
            ${workers
              .map((worker) => {
                const job = worker.job || "idle";
                const options = [
                  "idle",
                  "labor",
                  "lumber",
                  "mining",
                  "fishing",
                  "hunting",
                  "forest",
                  "shore",
                  "digging",
                  "farming",
                  "crafting",
                  "cook",
                  "ranch"
                ]
                  .map((jobId) => {
                    const selected = jobId === job ? "selected" : "";
                    return `<option value="${escapeHtml(jobId)}" ${selected}>${escapeHtml(
                      workersRuntime.getJobLabel(jobId)
                    )}</option>`;
                  })
                  .join("");

                return `
                  <div style="border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px;background:rgba(255,255,255,.03);display:flex;flex-direction:column;gap:8px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                      <strong>工人 #${worker.id}</strong>
                      <span class="pill">${escapeHtml(workersRuntime.getJobLabel(job))}</span>
                    </div>

                    <div class="small muted">
                      體力：${Number(worker.stamina || 0).toFixed(1)} / ${Number(worker.maxStamina || 0).toFixed(1)}
                    </div>

                    <div class="small muted">
                      剩餘工作：${formatSeconds(worker.remaining || 0)}
                    </div>

                    <div class="small muted">
                      換崗冷卻：${formatSeconds(worker.switchCooldown || 0)}
                    </div>

                    <div class="row" style="gap:6px;align-items:center;">
                      <select data-worker-job-select="${worker.id}" style="flex:1;min-width:0;">
                        ${options}
                      </select>
                      <button class="tiny-btn" type="button" data-worker-set-job="${worker.id}">
                        改派
                      </button>
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
        `
    }
  `;

  root.querySelector("#workersRecruitInlineBtn")?.addEventListener("click", () => {
    onRecruitWorker?.();
  });

  root.querySelector("#workersPayDebtInlineBtn")?.addEventListener("click", () => {
    onPayDebt?.();
  });

  root.querySelectorAll("[data-worker-adjust-plus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onAdjustWorkersForJob?.(btn.dataset.workerAdjustPlus, 1);
    });
  });

  root.querySelectorAll("[data-worker-adjust-minus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onAdjustWorkersForJob?.(btn.dataset.workerAdjustMinus, -1);
    });
  });

  root.querySelectorAll("[data-worker-set-job]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const workerId = btn.dataset.workerSetJob;
      const select = root.querySelector(`[data-worker-job-select="${workerId}"]`);
      const nextJob = select?.value || "idle";
      onSetWorkerJob?.(workerId, nextJob);
    });
  });
}
