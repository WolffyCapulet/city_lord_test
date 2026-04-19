export function renderCollapsibleGroups({
  root,
  groups,
  openMap,
  onToggle,
  renderItem,
  groupClass = "group"
}) {
  root.innerHTML = groups.map(({ key, title, items }) => {
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
          ${isOpen ? items.map(renderItem).join("") : ""}
        </div>
      </section>
    `;
  }).join("");

  root.querySelectorAll("[data-toggle-group]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onToggle(btn.dataset.toggleGroup);
    });
  });
}
