function $(id) {
  return document.getElementById(id);
}

function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function showModal(id) {
  const el = $(id);
  if (!el) return;
  el.classList.add("show");
  el.setAttribute("aria-hidden", "false");
}

function hideModal(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove("show");
  el.setAttribute("aria-hidden", "true");
}

function setMainPage(page) {
  qsa("[data-main-nav]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mainNav === page);
  });

  qsa(".main-page-panel").forEach((panel) => {
    panel.classList.toggle("page-hidden", panel.dataset.mainPage !== page);
  });
}

export function bindEvents({
  onRest,
  onEatBest,
  onSave,
  onLoad,
  onResetConfirm,
  onCancelAction,
  onClearActionQueue,
  onSetLogFilter
}) {
  $("restBtn")?.addEventListener("click", () => {
    onRest?.();
  });

  $("eatBestBtn")?.addEventListener("click", () => {
    onEatBest?.();
  });

  $("saveBtn")?.addEventListener("click", () => {
    onSave?.();
  });

  $("loadBtn")?.addEventListener("click", () => {
    onLoad?.();
  });

  $("resetBtn")?.addEventListener("click", () => {
    showModal("resetModal");
  });

  $("cancelActionBtn")?.addEventListener("click", () => {
    onCancelAction?.();
  });

  $("clearActionQueueBtn")?.addEventListener("click", () => {
    onClearActionQueue?.();
  });

  $("logAllBtn")?.addEventListener("click", () => {
    onSetLogFilter?.("all");
  });

  $("logImportantBtn")?.addEventListener("click", () => {
    onSetLogFilter?.("important");
  });

  $("logLootBtn")?.addEventListener("click", () => {
    onSetLogFilter?.("loot");
  });

  $("logWorkerBtn")?.addEventListener("click", () => {
    onSetLogFilter?.("worker");
  });

  qsa("[data-main-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setMainPage(btn.dataset.mainNav);
    });
  });

  $("resetCancelBtn")?.addEventListener("click", () => {
    hideModal("resetModal");
  });

  $("resetAcknowledge")?.addEventListener("change", (e) => {
    const confirmBtn = $("resetConfirmBtn");
    if (confirmBtn) {
      confirmBtn.disabled = !e.target.checked;
    }
  });

  $("resetConfirmBtn")?.addEventListener("click", () => {
    hideModal("resetModal");
    onResetConfirm?.();

    const checkbox = $("resetAcknowledge");
    if (checkbox) checkbox.checked = false;

    const confirmBtn = $("resetConfirmBtn");
    if (confirmBtn) confirmBtn.disabled = true;
  });
}
