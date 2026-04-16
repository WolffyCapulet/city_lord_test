export function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

export function renderResetModal({ isChecked = false } = {}) {
  const checkbox = document.getElementById("resetAcknowledge");
  const confirmBtn = document.getElementById("resetConfirmBtn");

  if (checkbox) checkbox.checked = isChecked;
  if (confirmBtn) confirmBtn.disabled = !isChecked;
}
