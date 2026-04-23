const modalClosers = new Map();

function getModal(id) {
  return document.getElementById(id);
}

function setCloser(id, closer) {
  if (typeof closer === "function") {
    modalClosers.set(id, closer);
  } else {
    modalClosers.delete(id);
  }
}

function runCloser(id) {
  const fn = modalClosers.get(id);
  if (typeof fn === "function") fn();
  modalClosers.delete(id);
}

export function openModal(id) {
  const modal = getModal(id);
  if (!modal) return;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

export function closeModal(id) {
  const modal = getModal(id);
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  runCloser(id);
}

export function closeAllModals() {
  document.querySelectorAll(".modal-backdrop.show").forEach((modal) => {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    if (modal.id) runCloser(modal.id);
  });
}

export function enableModalDismissByBackdrop(modalId) {
  const modal = getModal(modalId);
  if (!modal || modal.dataset.backdropBound === "1") return;

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal(modalId);
    }
  });

  modal.dataset.backdropBound = "1";
}

export function enableModalDismissByEscape() {
  if (document.body.dataset.modalEscapeBound === "1") return;

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllModals();
    }
  });

  document.body.dataset.modalEscapeBound = "1";
}

export function renderResetModal({ isChecked = false } = {}) {
  const checkbox = document.getElementById("resetAcknowledge");
  const confirmBtn = document.getElementById("resetConfirmBtn");
  if (checkbox) checkbox.checked = isChecked;
  if (confirmBtn) confirmBtn.disabled = !isChecked;
}

export function showChoiceModal({
  title = "選擇項目",
  description = "",
  options = [],
  onClose
} = {}) {
  const titleEl = document.getElementById("choiceModalTitle");
  const descEl = document.getElementById("choiceModalDesc");
  const optionsEl = document.getElementById("choiceModalOptions");
  const closeBtn = document.getElementById("choiceModalCloseBtn");

  if (!titleEl || !descEl || !optionsEl) return;

  titleEl.textContent = title;
  descEl.textContent = description;
  optionsEl.innerHTML = "";

  options.forEach((option) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tiny-btn";
    btn.textContent = option.label || "選項";
    btn.addEventListener("click", () => {
      option.onSelect?.(option.value);
      if (option.closeOnSelect !== false) closeModal("choiceModal");
    });
    optionsEl.appendChild(btn);
  });

  if (closeBtn) closeBtn.onclick = () => closeModal("choiceModal");

  setCloser("choiceModal", onClose);
  enableModalDismissByBackdrop("choiceModal");
  enableModalDismissByEscape();
  openModal("choiceModal");
}

export function showQueueModal({
  title = "列隊",
  description = "",
  items = [],
  onClear,
  onClose
} = {}) {
  const titleEl = document.getElementById("queueModalTitle");
  const descEl = document.getElementById("queueModalDesc");
  const bodyEl = document.getElementById("queueModalBody");
  const closeBtn = document.getElementById("queueModalCloseBtn");
  const clearBtn = document.getElementById("queueModalClearBtn");

  if (!titleEl || !descEl || !bodyEl) return;

  titleEl.textContent = title;
  descEl.textContent = description;
  bodyEl.innerHTML = "";

  if (!items.length) {
    bodyEl.innerHTML = `<div class="small muted">目前沒有項目</div>`;
  } else {
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "queue-row";

      const info = document.createElement("div");
      info.innerHTML = `<strong>${item.title || "項目"}</strong><div class="small muted">${item.meta || ""}</div>`;

      const ops = document.createElement("div");
      ops.className = "ops";

      (item.actions || []).forEach((action) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tiny-btn";
        btn.textContent = action.label || "操作";
        btn.addEventListener("click", () => action.onClick?.(item));
        ops.appendChild(btn);
      });

      row.appendChild(info);
      if (ops.childNodes.length) row.appendChild(ops);
      bodyEl.appendChild(row);
    });
  }

  if (closeBtn) closeBtn.onclick = () => closeModal("queueModal");
  if (clearBtn) {
    clearBtn.disabled = !items.length;
    clearBtn.onclick = () => onClear?.();
  }

  setCloser("queueModal", onClose);
  enableModalDismissByBackdrop("queueModal");
  enableModalDismissByEscape();
  openModal("queueModal");
}

export function showActionModal({
  title = "操作",
  description = "",
  quantity = 1,
  quantityHint = "",
  quickButtons = [1, 5, 10, 50],
  allowQueue = true,
  allowStart = true,
  onQueue,
  onStart,
  onCancel,
  onClose
} = {}) {
  const titleEl = document.getElementById("actionModalTitle");
  const descEl = document.getElementById("actionModalDesc");
  const qtyInput = document.getElementById("actionQtyInput");
  const qtyHint = document.getElementById("actionQtyHint");
  const quickWrap = document.getElementById("actionQuickBtns");
  const cancelBtn = document.getElementById("actionCancelBtn");
  const queueBtn = document.getElementById("actionQueueBtn");
  const startBtn = document.getElementById("actionStartBtn");

  if (!titleEl || !descEl || !qtyInput || !qtyHint || !quickWrap) return;

  const setQuickActive = (activeValue, infinite) => {
    quickWrap.querySelectorAll("button[data-quick-value]").forEach((btn) => {
      const isInfiniteBtn = btn.dataset.quickInfinite === "1";
      const active = infinite
        ? isInfiniteBtn
        : !isInfiniteBtn && btn.dataset.quickValue === String(activeValue);
      btn.classList.toggle("active", active);
    });
  };

  const setQty = (value, infinite = false) => {
    const safeValue = Math.max(1, Math.floor(Number(value || 1)));
    qtyInput.dataset.infinite = infinite ? "1" : "0";
    qtyInput.value = String(safeValue);
    setQuickActive(safeValue, infinite);
  };

  const getPayload = () => {
    const isInfinite = qtyInput.dataset.infinite === "1";
    if (isInfinite) return { qty: -1, isInfinite: true };
    return {
      qty: Math.max(1, Math.floor(Number(qtyInput.value || 1))),
      isInfinite: false
    };
  };

  titleEl.textContent = title;
  descEl.textContent = description;
  qtyHint.textContent = quantityHint;
  quickWrap.innerHTML = "";

  setQty(quantity, false);

  qtyInput.oninput = () => {
    qtyInput.dataset.infinite = "0";
    const current = Math.max(1, Math.floor(Number(qtyInput.value || 1)));
    qtyInput.value = String(current);
    setQuickActive(current, false);
  };

  quickButtons.forEach((value) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tiny-btn";

    if (value === "∞") {
      btn.textContent = "∞";
      btn.dataset.quickValue = "infinite";
      btn.dataset.quickInfinite = "1";
      btn.addEventListener("click", () => setQty(1, true));
    } else {
      const safeValue = Math.max(1, Math.floor(Number(value || 1)));
      btn.textContent = String(value);
      btn.dataset.quickValue = String(safeValue);
      btn.dataset.quickInfinite = "0";
      btn.addEventListener("click", () => setQty(safeValue, false));
    }

    quickWrap.appendChild(btn);
  });

  if (cancelBtn) {
    cancelBtn.onclick = () => {
      onCancel?.();
      closeModal("actionModal");
    };
  }

  if (queueBtn) {
    queueBtn.style.display = allowQueue ? "" : "none";
    queueBtn.onclick = () => {
      const { qty, isInfinite } = getPayload();
      onQueue?.(qty, isInfinite);
      closeModal("actionModal");
    };
  }

  if (startBtn) {
    startBtn.style.display = allowStart ? "" : "none";
    startBtn.onclick = () => {
      const { qty, isInfinite } = getPayload();
      onStart?.(qty, isInfinite);
      closeModal("actionModal");
    };
  }

  setCloser("actionModal", onClose);
  enableModalDismissByBackdrop("actionModal");
  enableModalDismissByEscape();
  openModal("actionModal");
}
