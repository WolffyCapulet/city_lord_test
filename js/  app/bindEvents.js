export function bindEvents({
  onRest,
  onEatBest,
  onSave,
  onLoad,
  onResetConfirm,
  onCancelAction,
  onClearActionQueue,
  onSetLogFilter,
  onSetMainPage
}) {
  document.getElementById("restBtn")?.addEventListener("click", () => onRest?.());
  document.getElementById("eatBestBtn")?.addEventListener("click", () => onEatBest?.());
  document.getElementById("saveBtn")?.addEventListener("click", () => onSave?.());
  document.getElementById("loadBtn")?.addEventListener("click", () => onLoad?.());

  document.getElementById("cancelActionBtn")?.addEventListener("click", () => onCancelAction?.());
  document.getElementById("clearActionQueueBtn")?.addEventListener("click", () => onClearActionQueue?.());

  document.getElementById("logAllBtn")?.addEventListener("click", () => onSetLogFilter?.("all"));
  document.getElementById("logImportantBtn")?.addEventListener("click", () => onSetLogFilter?.("important"));
  document.getElementById("logLootBtn")?.addEventListener("click", () => onSetLogFilter?.("loot"));
  document.getElementById("logWorkerBtn")?.addEventListener("click", () => onSetLogFilter?.("worker"));

  document.querySelectorAll("[data-main-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onSetMainPage?.(btn.dataset.mainNav);
    });
  });

  const resetModal = document.getElementById("resetModal");
  const resetBtn = document.getElementById("resetBtn");
  const resetCancelBtn = document.getElementById("resetCancelBtn");
  const resetConfirmBtn = document.getElementById("resetConfirmBtn");
  const resetAcknowledge = document.getElementById("resetAcknowledge");

  resetBtn?.addEventListener("click", () => {
    resetModal?.classList.add("show");
    resetModal?.setAttribute("aria-hidden", "false");
    if (resetAcknowledge) resetAcknowledge.checked = false;
    if (resetConfirmBtn) resetConfirmBtn.disabled = true;
  });

  resetCancelBtn?.addEventListener("click", () => {
    resetModal?.classList.remove("show");
    resetModal?.setAttribute("aria-hidden", "true");
  });

  resetAcknowledge?.addEventListener("change", () => {
    if (resetConfirmBtn) resetConfirmBtn.disabled = !resetAcknowledge.checked;
  });

  resetConfirmBtn?.addEventListener("click", () => {
    resetModal?.classList.remove("show");
    resetModal?.setAttribute("aria-hidden", "true");
    onResetConfirm?.();
  });
}
