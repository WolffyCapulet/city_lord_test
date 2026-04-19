function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toInt(value) {
  return Math.floor(Number(value || 0));
}

function ensureResourceOpenState(state, groups) {
  if (!state.ui) state.ui = {};
  if (!state.ui.openSections) state.ui.openSections = {};
  if (!state.ui.openSections.resources) state.ui.openSections.resources = {};

  groups.forEach((group) => {
    if (typeof state.ui.openSections.resources[group.key] !== "boolean") {
      state.ui.openSections.resources[group.key] = true;
    }
  });
}

function getResourceGroupKey(id) {
  const foodIds = new Set([
    "rawMeat",
    "rawChicken",
    "fish",
    "shrimp",
    "crab",
    "snail",
    "shellfish",
    "clamMeat",
    "egg",
    "milk",
    "apple",
    "wheat",
    "carrot",
    "mushroom",
    "grilledMeat",
    "grilledFish",
    "bread",
    "grilledSausage",
    "bearStew",
    "applePie",
    "clamSoup",
    "sashimi",
    "staminaPotion"
  ]);

  const herbBookIds = new Set([
    "herb",
    "rareHerb",
    "ginseng",
    "paper",
    "ink",
    "note",
    "manual",
    "herbTonic"
  ]);

  const cropSeedIds = new Set([
    "wheatSeed",
    "mushroomSpore",
    "appleSeed",
    "cottonSeed",
    "carrotSeed",
    "wheatSeedBundle",
    "cotton",
    "fiber"
  ]);

  const basicMaterialIds = new Set([
    "wood",
    "stone",
    "dirt",
    "sand",
    "branch",
    "leaf",
    "coal",
    "copperOre",
    "ironOre",
    "silverOre",
    "goldOre",
    "magnetite",
    "crystal",
    "gem",
    "coalPowder",
    "copperPowder",
    "ironPowder",
    "silverPowder",
    "goldPowder",
    "magnetitePowder",
    "crystalPowder",
    "gemPowder"
  ]);

  const animalIds = new Set([
    "chicken",
    "rabbit",
    "boar",
    "deer",
    "wolf",
    "brownBear",
    "blackBear",
    "dairyCow",
    "bull"
  ]);

  const huntDropIds = new Set([
    "offal",
    "hide",
    "bone",
    "boarTusk",
    "deerAntler",
    "bearPaw",
    "bearFang",
    "feather",
    "shell",
    "pearl",
    "coral",
    "cowHorn"
  ]);

  const processedIds = new Set([
    "planks",
    "firewood",
    "stoneBrick",
    "brick",
    "glass",
    "glassBottle",
    "wheatFlour",
    "boneMeal",
    "compost",
    "ironIngot",
    "copperIngot",
    "leather",
    "softLeather",
    "cottonThread",
    "cottonCloth",
    "grassThread",
    "grassCloth",
    "clothes"
  ]);

  if (foodIds.has(id)) return "food";
  if (cropSeedIds.has(id)) return "crops";
  if (herbBookIds.has(id)) return "herbsBooks";
  if (animalIds.has(id)) return "animals";
  if (huntDropIds.has(id)) return "animalDrops";
  if (processedIds.has(id)) return "processed";
  if (basicMaterialIds.has(id)) return "materials";

  if (id.endsWith("Tool")) return "tools";
  if (id.endsWith("Ore")) return "materials";
  if (id.endsWith("Powder")) return "materials";
  if (id.endsWith("Seed")) return "crops";
  if (id.endsWith("Ingot")) return "processed";

  return "other";
}

function buildGroups(resources, getResourceLabel) {
  const defs = [
    { key: "food", title: "食物與飲品" },
    { key: "crops", title: "作物與種子" },
    { key: "herbsBooks", title: "草藥與文具" },
    { key: "materials", title: "基礎材料與礦物" },
    { key: "processed", title: "加工材料" },
    { key: "tools", title: "工具" },
    { key: "animals", title: "活體動物" },
    { key: "animalDrops", title: "獵物素材" },
    { key: "other", title: "其他" }
  ];

  const groups = defs.map((def) => ({ ...def, items: [] }));

  Object.entries(resources || {})
    .filter(([, value]) => Number(value || 0) > 0)
    .sort((a, b) => getResourceLabel(a[0]).localeCompare(getResourceLabel(b[0]), "zh-Hant"))
    .forEach(([id, value]) => {
      const key = getResourceGroupKey(id);
      const group = groups.find((g) => g.key === key);
      if (group) {
        group.items.push({ id, value: toInt(value) });
      }
    });

  return groups.filter((group) => group.items.length > 0);
}

export function renderResources({
  state,
  getResourceLabel,
  edibleValues = {},
  onResourceClick = null
}) {
  const root = document.getElementById("resources");
  if (!root) return;

  const resources = state.resources || {};
  const totalKinds = Object.keys(resources).filter((key) => Number(resources[key] || 0) > 0).length;
  const totalAmount = Object.values(resources).reduce((sum, n) => sum + Number(n || 0), 0);

  const groups = buildGroups(resources, getResourceLabel);
  ensureResourceOpenState(state, groups);

  const allOpen =
    groups.length > 0 &&
    groups.every((group) => state.ui?.openSections?.resources?.[group.key]);

  root.innerHTML = `
    <div class="small muted" style="margin-bottom:8px;">
      物資種類：${totalKinds}｜總數量：${Math.floor(totalAmount)}
    </div>

    ${groups
      .map((group) => {
        const isOpen = !!state.ui.openSections.resources[group.key];

        return `
          <section class="resource-group">
            <button
              type="button"
              class="resource-summary"
              data-toggle-resource-group="${escapeHtml(group.key)}"
              aria-expanded="${isOpen ? "true" : "false"}"
            >
              <span>${escapeHtml(group.title)}（${group.items.length}）</span>
              <span class="resource-arrow">${isOpen ? "▼" : "▶"}</span>
            </button>

            <div class="resource-body ${isOpen ? "" : "closed"}">
              ${
                isOpen
                  ? `
                    <div class="resource-list">
                      ${group.items
                        .map(({ id, value }) => {
                          const label = getResourceLabel(id);
                          const edibleValue = edibleValues[id];
                          const meta = [];

                          meta.push(`${label}：${value}`);

                          if (typeof edibleValue === "number") {
                            meta.push(
                              `可食用：${edibleValue >= 0 ? "+" : ""}${edibleValue} 體力`
                            );
                          }

                          const clickable = typeof onResourceClick === "function";

                          return `
                            <div
                              class="resource-item ${clickable ? "clickable" : ""}"
                              data-resource-id="${escapeHtml(id)}"
                              title="${escapeHtml(meta.join("\n"))}"
                            >
                              <div class="resource-name">${escapeHtml(label)}</div>
                              <div class="resource-value"><strong>${value}</strong></div>
                              ${
                                typeof edibleValue === "number"
                                  ? `<div class="meta">可食用</div>`
                                  : `<div class="meta">　</div>`
                              }
                            </div>
                          `;
                        })
                        .join("")}
                    </div>
                  `
                  : ""
              }
            </div>
          </section>
        `;
      })
      .join("")}
  `;

  root.querySelectorAll("[data-toggle-resource-group]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.toggleResourceGroup;
      state.ui.openSections.resources[key] = !state.ui.openSections.resources[key];
      renderResources({
        state,
        getResourceLabel,
        edibleValues,
        onResourceClick
      });
    });
  });

  if (typeof onResourceClick === "function") {
    root.querySelectorAll("[data-resource-id]").forEach((item) => {
      item.addEventListener("click", () => {
        onResourceClick(item.dataset.resourceId);
      });
    });
  }

  const toggleBtn = document.getElementById("toggleResourcesBtn");
  if (toggleBtn) {
    toggleBtn.textContent = allOpen ? "收合全部" : "展開全部";
    toggleBtn.onclick = () => {
      const nextOpen = !allOpen;
      groups.forEach((group) => {
        state.ui.openSections.resources[group.key] = nextOpen;
      });

      renderResources({
        state,
        getResourceLabel,
        edibleValues,
        onResourceClick
      });
    };
  }
}
