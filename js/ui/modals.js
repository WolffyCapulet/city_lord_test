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

  function readQty() {
    const raw = String(qtyInput.value || "").trim();
    const infinite =
      qtyInput.dataset.infinite === "1" ||
      raw === "∞" ||
      raw.toLowerCase() === "inf" ||
      Number(raw) < 0;

    if (infinite) {
      return { qty: -1, isInfinite: true };
    }

    const qty = Math.max(1, Math.floor(Number(raw || 1)));
    return { qty, isInfinite: false };
  }

  titleEl.textContent = title;
  descEl.textContent = description;
  qtyInput.value = String(quantity);
  qtyInput.dataset.infinite = quantity < 0 ? "1" : "0";
  qtyHint.textContent = quantityHint;
  quickWrap.innerHTML = "";

  qtyInput.addEventListener("input", () => {
    const raw = String(qtyInput.value || "").trim();
    qtyInput.dataset.infinite =
      raw === "∞" || raw.toLowerCase() === "inf" || Number(raw) < 0 ? "1" : "0";
  });

  quickButtons.forEach((value) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tiny-btn";
    btn.textContent = String(value);
    btn.addEventListener("click", () => {
      if (String(value) === "∞") {
        qtyInput.value = "∞";
        qtyInput.dataset.infinite = "1";
      } else {
        qtyInput.value = String(value);
        qtyInput.dataset.infinite = "0";
      }
    });
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
      const { qty, isInfinite } = readQty();
      onQueue?.(qty, isInfinite);
      closeModal("actionModal");
    };
  }

  if (startBtn) {
    startBtn.style.display = allowStart ? "" : "none";
    startBtn.onclick = () => {
      const { qty, isInfinite } = readQty();
      onStart?.(qty, isInfinite);
      closeModal("actionModal");
    };
  }

  setCloser("actionModal", onClose);
  enableModalDismissByBackdrop("actionModal");
  enableModalDismissByEscape();
  openModal("actionModal");
}
