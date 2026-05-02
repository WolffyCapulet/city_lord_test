function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ensureResearchUiState(state) {
  if (!state.ui) state.ui = {};
  if (!state.ui.openSections) state.ui.openSections = {};
  if (!state.ui.openSections.research) {
    state.ui.openSections.research = {
      books: true
    };
  }
}

function getResearchSectionKey(category) {
  return `category:${category || "other"}`;
}

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

  ensureResearchUiState(state);

  const categories = [
    ...new Set(Object.values(researchDefs).map((def) => def.category || "other"))
  ];

  if (typeof state.ui.openSections.research.books !== "boolean") {
    state.ui.openSections.research.books = true;
  }

  categories.forEach((category) => {
    const key = getResearchSectionKey(category);
    if (typeof state.ui.openSections.research[key] !== "boolean") {
      state.ui.openSections.research[key] = true;
    }
  });

  const bookCards = Object.entries(books)
    .map(([id, book]) => {
      const own = Math.floor(state.resources?.[id] || 0);
      const title = [
        book.name,
        `持有：${own}`,
        `閱讀：${formatSeconds(book.duration)}`
      ].join("\n");

      return `
        <div class="book-card" title="${escapeHtml(title)}">
          <strong>${escapeHtml(book.name)}</strong>
          <div class="small muted">持有：${own}</div>
          <div class="small muted">閱讀：${escapeHtml(formatSeconds(book.duration))}</div>
          <button data-read-book="${escapeHtml(id)}" type="button" ${own > 0 ? "" : "disabled"}>閱讀</button>
        </div>
      `;
    })
    .join("");

  const blocks = categories
    .map((category) => {
      const key = getResearchSectionKey(category);
      const isOpen = !!state.ui.openSections.research[key];

      const cards = Object.entries(researchDefs)
        .filter(([, def]) => (def.category || "other") === category)
        .map(([id, def]) => {
          const done = isResearchCompleted(id);
          const available = meetsResearchRequirements(def);
          const statusText = done
            ? "已完成"
            : available
            ? "可研究"
            : getMissingRequirementText(def);

          const title = [def.name, statusText].join("\n");

          return `
            <div class="research-card" title="${escapeHtml(title)}">
              <div class="research-summary">
                <strong>${escapeHtml(def.name)}</strong>
                <div class="research-status ${done ? "done" : ""}">
                  ${escapeHtml(statusText)}
                </div>
              </div>
              <button
                data-start-research="${escapeHtml(id)}"
                type="button"
                class="research-mini-btn"
                ${done ? "disabled" : ""}
              >
                ${done ? "完成" : "研究"}
              </button>
            </div>
          `;
        })
        .join("");

      return `
        <details data-research-group="${escapeHtml(key)}" ${isOpen ? "open" : ""}>
          <summary>${escapeHtml(category)}</summary>
          <div class="research-grid">${cards}</div>
        </details>
      `;
    })
    .join("");

  root.innerHTML = `
    <details data-research-group="books" ${state.ui.openSections.research.books ? "open" : ""}>
      <summary>書籍閱讀</summary>
      <div class="book-grid" style="margin-top:8px;">${bookCards}</div>
    </details>

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

  root.querySelectorAll("[data-research-group]").forEach((detail) => {
    detail.addEventListener("toggle", () => {
      state.ui.openSections.research[detail.dataset.researchGroup] = detail.open;
    });
  });
}
