export function renderResearchArea({
  state,
  books,
  researchDefs,
  formatSeconds,
  getMissingRequirementText,
  isResearchCompleted,
  meetsResearchRequirements,
  onStartResearch,
  onReadBook
}) {
  const root = document.getElementById("researchArea");
  if (!root) return;

  const categories = [...new Set(Object.values(researchDefs).map((def) => def.category || "other"))];

  const bookCards = Object.entries(books)
    .map(([id, book]) => {
      const own = Math.floor(state.resources?.[id] || 0);

      return `
        <div class="book-card">
          <strong>${book.name}</strong>
          <div class="small muted">持有：${own}</div>
          <div class="small muted">閱讀：${formatSeconds(book.duration)}</div>
          <button data-read-book="${id}" type="button" ${own > 0 ? "" : "disabled"}>閱讀</button>
        </div>
      `;
    })
    .join("");

  const blocks = categories
    .map((category) => {
      const cards = Object.entries(researchDefs)
        .filter(([, def]) => (def.category || "other") === category)
        .map(([id, def]) => {
          const done = isResearchCompleted(id);
          const available = meetsResearchRequirements(def);

          return `
            <div class="research-card">
              <div class="research-summary">
                <strong>${def.name}</strong>
                <div class="research-status ${done ? "done" : ""}">
                  ${done ? "已完成" : available ? "可研究" : getMissingRequirementText(def)}
                </div>
              </div>
              <button data-start-research="${id}" type="button" class="research-mini-btn" ${done ? "disabled" : ""}>
                ${done ? "完成" : "研究"}
              </button>
            </div>
          `;
        })
        .join("");

      return `
        <details open>
          <summary>${category}</summary>
          <div class="research-grid">${cards}</div>
        </details>
      `;
    })
    .join("");

  root.innerHTML = `
    <div class="section-title">
      <strong>書籍閱讀</strong>
    </div>
    <div class="book-grid">${bookCards}</div>
    <div style="margin-top:12px"></div>
    ${blocks}
  `;

  root.querySelectorAll("[data-start-research]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onStartResearch(btn.dataset.startResearch);
    });
  });

  root.querySelectorAll("[data-read-book]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onReadBook(btn.dataset.readBook);
    });
  });
}
