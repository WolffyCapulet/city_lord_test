function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (!el) return;
  el.classList.add("show");
  el.setAttribute("aria-hidden", "false");
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (!el) return;
  el.classList.remove("show");
  el.setAttribute("aria-hidden", "true");
}

function setCloser(modalId, onClose) {
  const el = document.getElementById(modalId);
  if (!el) return;
  el._onClose = onClose;
}

function enableModalDismissByBackdrop(modalId) {
  const el = document.getElementById(modalId);
  if (!el || el._backdropBound) return;
  el._backdropBound = true;
  el.addEventListener("click", (event) => {
    if (event.target === el) {
      el._onClose?.();
      closeModal(modalId);
    }
  });
}

let _escapeBound = false;
function enableModalDismissByEscape() {
  if (_escapeBound) return;
  _escapeBound = true;
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    document.querySelectorAll(".modal-backdrop.show").forEach((el) => {
      el._onClose?.();
      el.classList.remove("show");
      el.setAttribute("aria-hidden", "true");
    });
  });
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
  const titleEl    = document.getElementById("actionModalTitle");
  const descEl     = document.getElementById("actionModalDesc");
  const qtyInput   = document.getElementById("actionQtyInput");
  const qtyHint    = document.getElementById("actionQtyHint");
  const quickWrap  = document.getElementById("actionQuickBtns");
  const cancelBtn  = document.getElementById("actionCancelBtn");
  const queueBtn   = document.getElementById("actionQueueBtn");
  const startBtn   = document.getElementById("actionStartBtn");

  if (!titleEl || !descEl || !qtyInput || !qtyHint || !quickWrap) return;

  function readQty() {
    const raw = String(qtyInput.value || "").trim();
    const infinite =
      qtyInput.dataset.infinite === "1" ||
      raw === "∞" ||
      raw.toLowerCase() === "inf" ||
      Number(raw) < 0;
    if (infinite) return { qty: -1, isInfinite: true };
    return { qty: Math.max(1, Math.floor(Number(raw || 1))), isInfinite: false };
  }

  titleEl.textContent  = title;
  descEl.textContent   = description;
  qtyHint.textContent  = quantityHint;

  // Reset input cleanly (cloneNode to remove stale listeners)
  const newInput = qtyInput.cloneNode(true);
  newInput.value = String(quantity >= 0 ? quantity : 1);
  newInput.dataset.infinite = quantity < 0 ? "1" : "0";
  qtyInput.parentNode.replaceChild(newInput, qtyInput);
  const freshInput = document.getElementById("actionQtyInput");

  freshInput.addEventListener("input", () => {
    const raw = String(freshInput.value || "").trim();
    freshInput.dataset.infinite =
      raw === "∞" || raw.toLowerCase() === "inf" || Number(raw) < 0 ? "1" : "0";
  });

  // Quick-pick buttons
  quickWrap.innerHTML = "";
  quickButtons.forEach((value) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tiny-btn";
    btn.textContent = String(value);
    btn.addEventListener("click", () => {
      const fi = document.getElementById("actionQtyInput");
      if (String(value) === "∞") {
        fi.value = "∞";
        fi.dataset.infinite = "1";
      } else {
        fi.value = String(value);
        fi.dataset.infinite = "0";
      }
    });
    quickWrap.appendChild(btn);
  });

  // Wire action buttons with fresh onclick (replaces previous)
  if (cancelBtn) {
    cancelBtn.onclick = () => { onCancel?.(); closeModal("actionModal"); };
  }
  if (queueBtn) {
    queueBtn.style.display = allowQueue ? "" : "none";
    queueBtn.onclick = () => {
      const fi = document.getElementById("actionQtyInput");
      const raw = String(fi.value || "").trim();
      const isInfinite = fi.dataset.infinite === "1" || raw === "∞";
      const qty = isInfinite ? -1 : Math.max(1, Math.floor(Number(raw || 1)));
      onQueue?.(qty, isInfinite);
      closeModal("actionModal");
    };
  }
  if (startBtn) {
    startBtn.style.display = allowStart ? "" : "none";
    startBtn.onclick = () => {
      const fi = document.getElementById("actionQtyInput");
      const raw = String(fi.value || "").trim();
      const isInfinite = fi.dataset.infinite === "1" || raw === "∞";
      const qty = isInfinite ? -1 : Math.max(1, Math.floor(Number(raw || 1)));
      onStart?.(qty, isInfinite);
      closeModal("actionModal");
    };
  }

  setCloser("actionModal", onClose);
  enableModalDismissByBackdrop("actionModal");
  enableModalDismissByEscape();
  openModal("actionModal");
}
