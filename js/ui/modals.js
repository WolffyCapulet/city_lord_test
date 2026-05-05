let _escBound = false;

function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add("show"); el.setAttribute("aria-hidden","false"); }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove("show"); el.setAttribute("aria-hidden","true"); }
}

function bindBackdrop(id) {
  const el = document.getElementById(id);
  if (!el || el._bd) return;
  el._bd = true;
  el.addEventListener("click", e => { if (e.target === el) closeModal(id); });
}

function bindEscape() {
  if (_escBound) return;
  _escBound = true;
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    document.querySelectorAll(".modal-backdrop.show")
      .forEach(el => closeModal(el.id));
  });
}

export function showActionModal({
  title = "操作",
  description = "",
  quantity = 1,
  quantityHint = "",
  quickButtons = [1, 10, 50, 100, "∞"],
  allowQueue = true,
  allowStart = true,
  onQueue,
  onStart,
  onCancel
} = {}) {
  // Get elements
  const modal     = document.getElementById("actionModal");
  const titleEl   = document.getElementById("actionModalTitle");
  const descEl    = document.getElementById("actionModalDesc");
  const qtyInput  = document.getElementById("actionQtyInput");
  const qtyHint   = document.getElementById("actionQtyHint");
  const quickWrap = document.getElementById("actionQuickBtns");
  const cancelBtn = document.getElementById("actionCancelBtn");
  const queueBtn  = document.getElementById("actionQueueBtn");
  const startBtn  = document.getElementById("actionStartBtn");

  if (!modal || !titleEl || !qtyInput) return;

  // Set content
  titleEl.textContent  = title;
  if (descEl)  descEl.textContent  = description;
  if (qtyHint) qtyHint.textContent = quantityHint;

  // Reset qty input
  qtyInput.value = quantity < 0 ? "∞" : String(quantity);
  qtyInput.dataset.inf = quantity < 0 ? "1" : "0";

  // Quick buttons
  if (quickWrap) {
    quickWrap.innerHTML = "";
    quickButtons.forEach(v => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "tiny-btn"; b.textContent = String(v);
      b.onclick = () => {
        qtyInput.value = String(v);
        qtyInput.dataset.inf = (String(v) === "∞") ? "1" : "0";
      };
      quickWrap.appendChild(b);
    });
  }

  // Helper: read current qty from input
  function readQty() {
    const raw = String(qtyInput.value).trim();
    if (raw === "∞" || qtyInput.dataset.inf === "1") return { qty: -1, inf: true };
    const n = Math.floor(Number(raw));
    return { qty: Math.max(1, isNaN(n) ? 1 : n), inf: false };
  }

  // Wire buttons (direct assignment = no stacking)
  if (cancelBtn) {
    cancelBtn.onclick = () => { onCancel?.(); closeModal("actionModal"); };
  }

  if (queueBtn) {
    queueBtn.style.display = allowQueue ? "" : "none";
    queueBtn.onclick = () => {
      const { qty, inf } = readQty();
      closeModal("actionModal");
      onQueue?.(qty, inf);
    };
  }

  if (startBtn) {
    startBtn.style.display = allowStart ? "" : "none";
    startBtn.onclick = () => {
      const { qty, inf } = readQty();
      closeModal("actionModal");
      onStart?.(qty, inf);
    };
  }

  bindBackdrop("actionModal");
  bindEscape();
  openModal("actionModal");
}
