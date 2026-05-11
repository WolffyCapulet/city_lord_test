import { sellPrices, shopPrices } from "../../data/dataTrade.js";
import { resourceLabels } from "../../data/dataResources.js";

function esc(v) {
  return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function toInt(v) { return Math.floor(Number(v || 0)); }

const shopCategories = {
  all:     { label:"全部",     desc:"目前所有物品都可以直接買賣。",
    items: Object.keys(resourceLabels) },
  general: { label:"基礎",     desc:"基礎採集物、燃料與常用素材。",
    items: ["wood","stone","dirt","sand","branch","leaf","firewood","coal","shell","coral","herb","rareHerb","mushroom","fiber","ginseng","apple","wheat","cotton","carrot"] },
  metal:   { label:"礦物/金屬", desc:"礦石、粉末、金屬錠與燒製素材。",
    items: ["copperOre","ironOre","silverOre","goldOre","magnetite","crystal","gem","coalPowder","copperPowder","ironPowder","silverPowder","goldPowder","magnetitePowder","crystalPowder","gemPowder","copperIngot","ironIngot","stoneBrick","brick","glass","glassBottle"] },
  farm:    { label:"農牧",     desc:"種子、動物、農牧副產品與牧場材料。",
    items: ["wheatSeed","mushroomSpore","appleSeed","cottonSeed","carrotSeed","chicken","rabbit","dairyCow","bull","boar","deer","wolf","brownBear","blackBear","egg","milk","hide","bone","feather","cowHorn","boarTusk","deerAntler","bearPaw","bearFang","boneMeal","compost"] },
  alchemy: { label:"煉金/文具", desc:"藥劑、紙筆與研究書籍。",
    items: ["herbTonic","staminaPotion","paper","ink","note","manual"] },
  cloth:   { label:"製革/裁縫", desc:"皮革、布料與衣物。",
    items: ["leather","softLeather","cottonThread","cottonCloth","grassThread","grassCloth","clothes"] },
  tools:   { label:"工具",     desc:"所有工具與武器。",
    items: ["woodAxeTool","woodPickTool","woodShovelTool","woodCarvingKnifeTool","woodHammerTool","woodPotTool","woodHoeTool","woodPitchforkTool","woodFishingRodTool","woodBowTool","stoneAxeTool","stonePickTool","shovelTool","stoneCarvingKnifeTool","stoneHammerTool","stonePotTool","stoneHoeTool","stonePitchforkTool","stoneBowTool","fishingRodTool","fishNetTool","copperAxeTool","copperShovelTool","copperPickTool","copperCarvingKnifeTool","copperHammerTool","copperPotTool","copperHoeTool","copperPitchforkTool","copperBowTool","copperFishingRodTool","ironAxeTool","ironShovelTool","ironPickTool","ironCarvingKnifeTool","ironHammerTool","ironPotTool","ironHoeTool","ironPitchforkTool","ironBowTool","ironFishingRodTool"] },
  food:    { label:"食品",     desc:"原料、熟食與海鮮。",
    items: ["fish","shrimp","crab","snail","shellfish","clamMeat","rawMeat","rawChicken","offal","sashimi","grilledMeat","grilledFish","bread","grilledSausage","bearStew","applePie","clamSoup"] }
};

function getShopTabItems(tab) {
  const cat = shopCategories[tab] || shopCategories.all;
  return cat.items.filter(id => shopPrices[id] != null || sellPrices[id] != null);
}

function getStoredQty(state, bucket, id, fallback = 1) {
  if (!state.ui[bucket] || typeof state.ui[bucket] !== "object") state.ui[bucket] = {};
  const v = state.ui[bucket][id];
  return Math.max(1, Math.floor(Number(v) || fallback));
}
function setStoredQty(state, bucket, id, value) {
  if (!state.ui[bucket] || typeof state.ui[bucket] !== "object") state.ui[bucket] = {};
  state.ui[bucket][id] = Math.max(1, Math.floor(Number(value) || 1));
}

export function renderMerchantArea({
  state, getResourceLabel, merchantSystem,
  onFulfillOrder, onCancelOrder, onRefreshMerchant
}) {
  const root = document.getElementById("merchantArea");
  if (!root) return;

  const merchant   = state.merchant || {};
  const orders     = Array.isArray(merchant.orders) ? merchant.orders : [];
  const storeFunds = toInt(merchant.storeFunds || 0);
  const present    = !!merchant.present;
  const presentSec = Math.max(0, Number(merchant.presentSec || 0));
  const orderLimit = merchantSystem?.getMerchantOrderLimit?.() || 3;
  const chancePct  = merchantSystem?.merchantChancePerMinute
    ? (Number(merchantSystem.merchantChancePerMinute()) * 100).toFixed(1) : "0";
  const highCount  = orders.filter(o => (o.tier || "common") !== "common").length;

  const activeTab = shopCategories[state.ui?.shopTab] ? state.ui.shopTab : "all";
  if (state.ui) state.ui.shopTab = activeTab;

  // ── Status bar ────────────────────────────────────────────
  const statusHtml = `
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:6px;">
      <span class="pill">
        ${present ? `商人到訪中（${Math.ceil(presentSec)} 秒）` : `每分鐘到訪率 ${chancePct}%`}
      </span>
      <span class="pill">布告欄：${orders.length}/${orderLimit}｜高階 ${highCount} 張</span>
      <span class="pill" title="商人來訪時把資金投入商店；玩家買入時金額流入商店；賣出時扣除商店資金。">商店資金：${storeFunds} 金</span>
      <button class="tiny-btn" id="_merchantCallBtn" type="button">手動召喚商人</button>
    </div>
    <div class="small muted" style="margin-bottom:8px;">
      商人到訪時在布告欄張貼訂單，並把金幣投入商店。玩家可直接向商店賣出資源；商店使用現有資金收購，購買消費也回流商店。布告欄上限 ${orderLimit} 張。
    </div>`;

  // ── Board (orders) ────────────────────────────────────────
  const boardCards = orders.length === 0
    ? `<div class="order-card"><div class="small muted">目前沒有待完成的商人訂單。上限 ${orderLimit} 張。</div></div>`
    : orders.map(order => {
        const have   = toInt(state.resources?.[order.resource] || 0);
        const label  = getResourceLabel(order.resource);
        const tier   = order.tierLabel || order.tier || "普通";
        return `
          <div class="order-card">
            <strong>${esc(order.from || "行腳商人")}【${esc(tier)}】收購 ${esc(label)}</strong>
            <div class="small muted">需求：${esc(label)} ${order.qty}｜現有 ${have}</div>
            <div class="small muted">報酬：${toInt(order.rewardGold)} 金、貿易 EXP ${toInt(order.rewardTrade)}、聲望 ${Number(order.rewardRep||0).toFixed(1)}</div>
            <div class="order-actions">
              <button class="tiny-btn" data-fulfill="${esc(order.id)}" ${have < order.qty ? "disabled" : ""}>繳交訂單</button>
              <button class="tiny-btn" data-cancel-order="${esc(order.id)}">取消訂單</button>
            </div>
          </div>`;
      }).join("");

  // ── Shop tab buttons ──────────────────────────────────────
  const tabBtns = Object.entries(shopCategories).map(([key, cfg]) =>
    `<button class="tab-btn${key === activeTab ? " active" : ""}" data-shop-tab="${esc(key)}" type="button">${esc(cfg.label)}</button>`
  ).join("");

  // ── Shop items grid ───────────────────────────────────────
  const ids = getShopTabItems(activeTab);
  const itemCards = ids.map(id => {
    const stock    = toInt(state.resources?.[id] || 0);
    const buyPrice = shopPrices[id];
    const sellPrice= sellPrices[id];
    const label    = getResourceLabel(id);
    const buyQty   = getStoredQty(state, "shopBuyQty",  id, 1);
    const sellQty  = getStoredQty(state, "shopSellQty", id, 1);

    const priceLine = [
      buyPrice  != null ? `買 ${buyPrice} 金`  : null,
      sellPrice != null ? `賣 ${sellPrice} 金` : null
    ].filter(Boolean).join("｜") || "不可買賣";

    const buyRow = buyPrice != null ? `
      <div class="row" style="gap:6px;align-items:center;">
        <span class="small muted">買</span>
        <input type="number" min="1" step="1" value="${buyQty}"
          data-buy-input="${esc(id)}"
          style="width:64px;background:#0f172a;color:var(--text);border:1px solid #475569;border-radius:8px;padding:4px 6px;"
          title="輸入想購買的數量。"/>
        <button class="tiny-btn" data-buy="${esc(id)}" type="button">購買</button>
      </div>` : `<div class="small muted">不可購買</div>`;

    const sellRow = sellPrice != null ? `
      <div class="row" style="gap:6px;align-items:center;">
        <span class="small muted">賣</span>
        <input type="number" min="1" step="1" value="${sellQty}"
          data-sell-input="${esc(id)}"
          style="width:64px;background:#0f172a;color:var(--text);border:1px solid #475569;border-radius:8px;padding:4px 6px;"
          title="輸入想賣給商店的數量。"/>
        <button class="tiny-btn" data-sell="${esc(id)}" type="button">賣出</button>
      </div>` : `<div class="small muted">不可賣出</div>`;

    return `
      <div class="merchant-item">
        <strong>${esc(label)}（現有 ${stock}）</strong>
        <div class="small muted">${priceLine}</div>
        ${buyRow}
        ${sellRow}
      </div>`;
  }).join("");

  // ── Assemble ──────────────────────────────────────────────
  root.innerHTML = `
    ${statusHtml}

    <div class="section-title" style="margin-top:8px;">
      <strong>布告欄</strong>
      <span class="small muted">目前 ${orders.length}/${orderLimit} 張</span>
    </div>
    <div class="merchant-board">${boardCards}</div>

    <div class="section-title" style="margin-top:10px;">
      <strong>商店與商人買賣</strong>
      <span class="small muted">直接輸入要買或賣的數量，避免誤觸大量交易</span>
    </div>
    <div class="tab-row">${tabBtns}</div>
    <div class="small muted" style="margin-top:6px;">${esc(shopCategories[activeTab]?.desc || "")}</div>
    <div class="merchant-grid">${itemCards}</div>
  `;

  // ── Event listeners ───────────────────────────────────────
  root.querySelector("#_merchantCallBtn")?.addEventListener("click", () => onRefreshMerchant?.());

  // Orders
  root.querySelectorAll("[data-fulfill]").forEach(btn =>
    btn.addEventListener("click", () => onFulfillOrder?.(btn.dataset.fulfill)));
  root.querySelectorAll("[data-cancel-order]").forEach(btn =>
    btn.addEventListener("click", () => onCancelOrder?.(btn.dataset.cancelOrder)));

  // Tab switching
  root.querySelectorAll("[data-shop-tab]").forEach(btn =>
    btn.addEventListener("click", () => {
      if (state.ui) state.ui.shopTab = btn.dataset.shopTab;
      renderMerchantArea({ state, getResourceLabel, merchantSystem, onFulfillOrder, onCancelOrder, onRefreshMerchant });
    }));

  // Buy inputs - save qty on change
  root.querySelectorAll("[data-buy-input]").forEach(input =>
    input.addEventListener("input", () =>
      setStoredQty(state, "shopBuyQty", input.dataset.buyInput, input.value)));

  // Sell inputs - save qty on change
  root.querySelectorAll("[data-sell-input]").forEach(input =>
    input.addEventListener("input", () =>
      setStoredQty(state, "shopSellQty", input.dataset.sellInput, input.value)));

  // Buy buttons
  root.querySelectorAll("[data-buy]").forEach(btn =>
    btn.addEventListener("click", () => {
      const id    = btn.dataset.buy;
      const input = root.querySelector(`[data-buy-input="${id}"]`);
      const qty   = Math.max(1, toInt(input?.value || 1));
      const unit  = shopPrices[id];
      if (!unit) return;
      const maxQty = Math.floor(Math.max(0, state.gold || 0) / unit);
      if (maxQty <= 0) { alert(`金幣不足，購買${getResourceLabel(id)}需要 ${unit} 金。`); return; }
      const actual = Math.min(qty, maxQty);
      const total  = unit * actual;
      state.gold = (state.gold || 0) - total;
      state.resources[id] = (state.resources[id] || 0) + actual;
      state.merchant.storeFunds = (state.merchant.storeFunds || 0) + total;
      renderMerchantArea({ state, getResourceLabel, merchantSystem, onFulfillOrder, onCancelOrder, onRefreshMerchant });
    }));

  // Sell buttons
  root.querySelectorAll("[data-sell]").forEach(btn =>
    btn.addEventListener("click", () => {
      const id    = btn.dataset.sell;
      const input = root.querySelector(`[data-sell-input="${id}"]`);
      const qty   = Math.max(1, toInt(input?.value || 1));
      const unit  = sellPrices[id];
      if (!unit) return;
      const stock  = toInt(state.resources?.[id] || 0);
      if (stock <= 0) { alert(`目前沒有可賣出的${getResourceLabel(id)}。`); return; }
      const funds  = toInt(state.merchant.storeFunds || 0);
      const maxQty = Math.min(stock, Math.floor(funds / unit));
      if (maxQty <= 0) { alert("商店資金不足，暫時無法收購。"); return; }
      const actual = Math.min(qty, maxQty);
      const earned = actual * unit;
      state.resources[id] = stock - actual;
      state.gold = (state.gold || 0) + earned;
      state.merchant.storeFunds = funds - earned;
      renderMerchantArea({ state, getResourceLabel, merchantSystem, onFulfillOrder, onCancelOrder, onRefreshMerchant });
    }));
}
