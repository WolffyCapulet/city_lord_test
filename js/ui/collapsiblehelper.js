export function renderCollapsibleGroups({
  root,
  groups = [],
  openMap = {},
  onToggle,
  renderItem,
  groupClass = "group"
}) {
  if (!root) return;

  root.innerHTML = groups
    .map(({ key, title, items = [] }) => {
      const isOpen = !!openMap[key];

      return `
        <section class="${groupClass}">
          <button
            type="button"
            class="${groupClass}-summary"
            data-toggle-group="${key}"
            aria-expanded="${isOpen ? "true" : "false"}"
          >
            <span>${title}</span>
            <span>${isOpen ? "▼" : "▶"}</span>
          </button>

          <div class="${groupClass}-body ${isOpen ? "" : "closed"}">
            ${isOpen ? items.map((item, index) => renderItem(item, key, index)).join("") : ""}
          </div>
        </section>
      `;
    })
    .join("");

  if (typeof onToggle === "function") {
    root.querySelectorAll("[data-toggle-group]").forEach((btn) => {
      btn.addEventListener("click", () => {
        onToggle(btn.dataset.toggleGroup);
      });
    });
  }
}
