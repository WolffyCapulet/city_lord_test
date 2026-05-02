function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ensureCraftUiState(state) {
  if (!state.ui) state.ui = {};
  if (!state.ui.openSections) state.ui.openSections = {};
  if (!state.ui.openSections.crafts) {
    state.ui.openSections.crafts = {
      basic: true,
      cooking: false,
      grinding: false,
      smithy: false,
      alchemy: false,
      tailoring: false,
      processing: false,
      other: false
    };
  }

  if (typeof state.ui.openSections.crafts.processing !== "boolean") {
    state.ui.openSections.crafts.processing = false;
  }

  if (typeof state.ui.craftSmithyTab !== "string") {
    state.ui.craftSmithyTab = "ingot";
  }
}

const craftGroupDefs = [
  { key: "basic", title: "基礎加工" },
  { key: "cooking", title: "烹飪" },
  { key: "grinding", title: "研磨" },
  { key: "smithy", title: "冶煉與工具" },
  { key: "alchemy", title: "煉金與文具" },
  { key: "tailoring", title: "製革與裁縫" },
  { key: "processing", title: "獵物分解與開殼" },
  { key: "other", title: "其他" }
];

const craftGroupMap = {
  plank: "basic",
  stoneBrick: "basic",
  brickFirewood: "basic",
  brickCoal: "basic",
  glassFirewood: "basic",
  glassCoal: "basic",
  bottle: "basic",

  sashimi: "cooking",
  grilledMeat: "cooking",
  grilledFish: "cooking",
  bread: "cooking",
  grilledSausage: "cooking",
  bearStew: "cooking",
  applePie: "cooking",
  clamSoup: "cooking",

  flour: "grinding",
  boneMeal: "grinding",
  compost: "grinding",
  wheatSeedBundle: "grinding",
  coalPowder: "grinding",
  copperPowder: "grinding",
  ironPowder: "grinding",
  silverPowder: "grinding",
  goldPowder: "grinding",
  magnetitePowder: "grinding",
  crystalPowder: "grinding",
  gemPowder: "grinding",

  ironFirewood: "smithy",
  ironCoal: "smithy",
  copperFirewood: "smithy",
  copperCoal: "smithy",
  woodAxeTool: "smithy",
  woodPickTool: "smithy",
  woodShovelTool: "smithy",
  woodCarvingKnifeTool: "smithy",
  woodHammerTool: "smithy",
  woodPotTool: "smithy",
  woodHoeTool: "smithy",
  woodPitchforkTool: "smithy",
  woodFishingRodTool: "smithy",
  woodBowTool: "smithy",
  stoneAxeTool: "smithy",
  stonePickTool: "smithy",
  shovelTool: "smithy",
  stoneCarvingKnifeTool: "smithy",
  stoneHammerTool: "smithy",
  stonePotTool: "smithy",
  stoneHoeTool: "smithy",
  stonePitchforkTool: "smithy",
  fishingRodTool: "smithy",
  stoneBowTool: "smithy",
  copperAxeTool: "smithy",
  copperPickTool: "smithy",
  copperShovelTool: "smithy",
  copperCarvingKnifeTool: "smithy",
  copperHammerTool: "smithy",
  copperPotTool: "smithy",
  copperHoeTool: "smithy",
  copperPitchforkTool: "smithy",
  copperFishingRodTool: "smithy",
  copperBowTool: "smithy",
  ironAxeTool: "smithy",
  ironPickTool: "smithy",
  ironShovelTool: "smithy",
  ironCarvingKnifeTool: "smithy",
  ironHammerTool: "smithy",
  ironPotTool: "smithy",
  ironHoeTool: "smithy",
  ironPitchforkTool: "smithy",
  ironFishingRodTool: "smithy",
  ironBowTool: "smithy",
  fishNetTool: "smithy",

  herbTonic: "alchemy",
  staminaPotion: "alchemy",
  paper: "alchemy",
  ink: "alchemy",
  note: "alchemy",
  manual: "alchemy",

  leather: "tailoring",
  softLeather: "tailoring",
  cottonThread: "tailoring",
  cottonCloth: "tailoring",
  grassThread: "tailoring",
  grassCloth: "tailoring",
  clothes: "tailoring",

  processRabbit: "processing",
  processChicken: "processing",
  processBoar: "processing",
  processDeer: "processing",
  processWolf: "processing",
  processBrownBear: "processing",
  processBlackBear: "processing",
  processDairyCow: "processing",
  processBull: "processing",
  processShellfish: "processing"
};

const smithyTabDefs = [
  { id: "ingot", label: "錠" },
  { id: "wood", label: "木製" },
  { id: "stone", label: "石製" },
  { id: "copper", label: "銅製" },
  { id: "iron", label: "鐵製" },
  { id: "other", label: "其他" }
];

const smithyCraftCategoryMap = {
  ironFirewood: "ingot",
  ironCoal: "ingot",
  copperFirewood: "ingot",
  copperCoal: "ingot",

  woodAxeTool: "wood",
  woodPickTool: "wood",
  woodShovelTool: "wood",
  woodCarvingKnifeTool: "wood",
  woodHammerTool: "wood",
  woodPotTool: "wood",
  woodHoeTool: "wood",
  woodPitchforkTool: "wood",
  woodFishingRodTool: "wood",
  woodBowTool: "wood",

  stoneAxeTool: "stone",
  stonePickTool: "stone",
  shovelTool: "stone",
  stoneCarvingKnifeTool: "stone",
  stoneHammerTool: "stone",
  stonePotTool: "stone",
  stoneHoeTool: "stone",
  stonePitchforkTool: "stone",
  fishingRodTool: "stone",
  stoneBowTool: "stone",

  copperAxeTool: "copper",
  copperPickTool: "copper",
  copperShovelTool: "copper",
  copperCarvingKnifeTool: "copper",
  copperHammerTool: "copper",
  copperPotTool: "copper",
  copperHoeTool: "copper",
  copperPitchforkTool: "copper",
  copperFishingRodTool: "copper",
  copperBowTool: "copper",

  ironAxeTool: "iron",
  ironPickTool: "iron",
  ironShovelTool: "iron",
  ironCarvingKnifeTool: "iron",
  ironHammerTool: "iron",
  ironPotTool: "iron",
  ironHoeTool: "iron",
  ironPitchforkTool: "iron",
  ironFishingRodTool: "iron",
  ironBowTool: "iron",

  fishNetTool: "other"
};

function getCraftGroupKey(id) {
  return craftGroupMap[id] || "other";
}

function buildGroups(crafts, isCraftHidden) {
  const groups = craftGroupDefs.map((def) => ({ ...def, items: [] }));

  Object.entries(crafts || {})
    .filter(([, def]) => !isCraftHidden(def))
    .forEach(([id, def]) => {
      const key = getCraftGroupKey(id);
      const group = groups.find((g) => g.key === key);
      if (group) {
        group.items.push({ id, def });
      }
    });

  return groups.filter((group) => group.items.length > 0);
}

function buildCraftTitle({
  id,
  def,
  getResourceLabel,
  isUnlocked,
  getCraftDuration,
  formatSeconds
}) {
  const costText = Object.entries(def.costs || {})
    .map(([resId, amount]) => `${getResourceLabel(resId)} ${amount}`)
    .join("、");

  const yieldText = Object.entries(def.yields || {})
    .map(([resId, amount]) => `${getResourceLabel(resId)} ${amount}`)
    .join("、");

  const lines = [
    def.name,
    `體力：${def.stamina ?? 1}`,
    `材料：${costText || "無"}`,
    `產出：${yieldText || "無"}`
  ];

  if (typeof getCraftDuration === "function" && typeof formatSeconds === "function") {
    lines.push(`製作節奏：${formatSeconds(getCraftDuration(def, id))}`);
  }

  if (def.unlock) {
    lines.push(isUnlocked ? "已解鎖" : `需研究：${def.unlock}`);
  }

  return lines.join("\n");
}

export function renderCraftList({
  state,
  crafts,
  getResourceLabel,
  isCraftHidden,
  isCraftUnlocked,
  onCraftClick,
  getCraftDuration = null,
  formatSeconds = null
}) {
  const root = document.getElementById("craftList");
  if (!root) return;

  ensureCraftUiState(state);

  const groups = buildGroups(crafts, isCraftHidden);

  root.innerHTML = groups
    .map((group) => {
      const isOpen = !!state.ui.openSections.crafts[group.key];

      let items = group.items;

      if (group.key === "smithy") {
        const activeTab = state.ui.craftSmithyTab || "ingot";
        items = items.filter(({ id }) => {
          const category = smithyCraftCategoryMap[id] || "other";
          return category === activeTab;
        });
      }

      return `
        <details data-craft-group="${escapeHtml(group.key)}" ${isOpen ? "open" : ""}>
          <summary>${escapeHtml(group.title)}</summary>

          ${
            group.key === "smithy"
              ? `
                <div class="tab-row smithy-tab-row" style="margin-top:8px;">
                  ${smithyTabDefs
                    .map(
                      (tab) => `
                        <button
                          type="button"
                          class="tiny-btn tab-btn ${state.ui.craftSmithyTab === tab.id ? "active" : ""}"
                          data-smithy-tab="${escapeHtml(tab.id)}"
                        >
                          ${escapeHtml(tab.label)}
                        </button>
                      `
                    )
                    .join("")}
                </div>
              `
              : ""
          }

          <div class="row" style="margin-top:8px;">
            ${
              items.length > 0
                ? items
                    .map(({ id, def }) => {
                      const unlocked = isCraftUnlocked(def);
                      const title = buildCraftTitle({
                        id,
                        def,
                        getResourceLabel,
                        isUnlocked: unlocked,
                        getCraftDuration,
                        formatSeconds
                      });

                      return `
                        <button
                          type="button"
                          data-craft="${escapeHtml(id)}"
                          title="${escapeHtml(title)}"
                          ${unlocked ? "" : "disabled"}
                        >
                          ${escapeHtml(def.name)}
                        </button>
                      `;
                    })
                    .join("")
                : `<span class="small muted">此分類目前沒有可顯示的配方</span>`
            }
          </div>
        </details>
      `;
    })
    .join("");

  root.querySelectorAll("[data-craft]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onCraftClick(btn.dataset.craft);
    });
  });

  root.querySelectorAll("[data-craft-group]").forEach((detail) => {
    detail.addEventListener("toggle", () => {
      state.ui.openSections.crafts[detail.dataset.craftGroup] = detail.open;
    });
  });

  root.querySelectorAll("[data-smithy-tab]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      state.ui.craftSmithyTab = btn.dataset.smithyTab;

      renderCraftList({
        state,
        crafts,
        getResourceLabel,
        isCraftHidden,
        isCraftUnlocked,
        onCraftClick,
        getCraftDuration,
        formatSeconds
      });
    });
  });
}
