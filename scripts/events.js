function initializeEvents() {
  document.querySelectorAll("[data-process]").forEach((btn) =>
    btn.addEventListener("click", () => openProcessModal(btn.dataset.process))
  );

  document.getElementById("restBtn").addEventListener("click", () => {
    if (!state.isResting) {
      const resumeWork = state.autoWork || (state.productionAction && state.productionAction.type === "work" ? state.productionAction.id : null);
      state.isResting = true;
      state.autoResting = false;
      state.autoRestResume = resumeWork;
      state.productionAction = null;
      state.autoWork = null;
      addLog("開始休息。");
    } else {
      state.isResting = false;
      const resumeWork = state.autoRestResume;
      state.autoResting = false;
      state.autoRestResume = null;
      addLog("停止休息。");
      if (resumeWork) {
        state.autoWork = resumeWork;
        beginWorkCycle(resumeWork, { silent: true });
        addLog(`恢復${workDefs[resumeWork].name}。`);
      }
    }
    render();
  });

  document.getElementById("recruitBtn").addEventListener("click", recruitWorker);
  document.getElementById("payDebtBtn").addEventListener("click", () => payDebt());
  document.getElementById("claimTaxBtn").addEventListener("click", () => claimTax());
  document.getElementById("logImportantBtn")?.addEventListener("click", () => {
    state.ui.logTab = "important";
    renderLog();
  });
  document.getElementById("logWorkerBtn")?.addEventListener("click", () => {
    state.ui.logTab = "worker";
    renderLog();
  });
  document.getElementById("logLootBtn")?.addEventListener("click", () => {
    state.ui.logTab = "loot";
    renderLog();
  });
  document.getElementById("logAllBtn")?.addEventListener("click", () => {
    state.ui.logTab = "all";
    renderLog();
  });

  bindHouseButtons();
  document.getElementById("saveBtn").addEventListener("click", saveGame);
  document.getElementById("toggleResourcesBtn").addEventListener("click", () => {
    allResourcesOpen = !allResourcesOpen;
    document.getElementById("toggleResourcesBtn").textContent = allResourcesOpen ? "收合全部" : "展開全部";
    Object.keys(resourceOpenState).forEach((key) => {
      resourceOpenState[key] = allResourcesOpen;
    });
    renderResources();
  });
  document.querySelectorAll("[data-main-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setMainPage(btn.dataset.mainNav);
    });
  });

  const actionModal = document.getElementById("actionModal");
  document.getElementById("actionCancelBtn").addEventListener("click", closeActionModal);
  actionModal.addEventListener("click", (e) => {
    if (e.target === actionModal) closeActionModal();
  });
  document.getElementById("actionQtyInput").addEventListener("input", () => {
    actionModalInfinite = false;
    renderActionQuickStates();
  });
  document.getElementById("actionStartBtn").addEventListener("click", () => applyActionModal("start"));
  document.getElementById("actionQueueBtn").addEventListener("click", () => applyActionModal("queue"));

  const queueModal = document.getElementById("queueModal");
  if (queueModal) {
    const closeBtn = document.getElementById("queueModalCloseBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeQueueModal);
    }
    queueModal.addEventListener("click", (e) => {
      // Modal background click closes only if clicking backdrop, not inner modal
      if (e.target === queueModal) closeQueueModal();
    });
  } else {
    console.warn("queueModal element not found in the DOM.");
  }

  const resetModal = document.getElementById("resetModal");
  const resetAck = document.getElementById("resetAcknowledge");
  const resetConfirmBtn = document.getElementById("resetConfirmBtn");
  const resetCancelBtn = document.getElementById("resetCancelBtn");
  const openResetModal = () => {
    resetModal.classList.add("show");
    resetModal.setAttribute("aria-hidden", "false");
  };
  const closeResetModal = () => {
    resetModal.classList.remove("show");
    resetModal.setAttribute("aria-hidden", "true");
    resetAck.checked = false;
    resetConfirmBtn.disabled = true;
  };

  document.getElementById("resetBtn").addEventListener("click", openResetModal);
  resetCancelBtn.addEventListener("click", closeResetModal);
  resetModal.addEventListener("click", (e) => {
    if (e.target === resetModal) closeResetModal();
  });
  document.getElementById("choiceModalCloseBtn")?.addEventListener("click", closeChoiceModal);
  document.getElementById("choiceModal")?.addEventListener("click", (e) => {
    if (e.target === document.getElementById("choiceModal")) closeChoiceModal();
  });
  resetAck.addEventListener("change", () => {
    resetConfirmBtn.disabled = !resetAck.checked;
  });
  resetConfirmBtn.addEventListener("click", () => {
    if (!resetAck.checked) return;
    getLoadCandidates().forEach((key) => localStorage.removeItem(key));
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, createInitialState());
    normalizeState(state);
    closeResetModal();
    addLog("已重置遊戲。");
    render();
  });
}
