import { sellPrices, shopPrices } from "../../data/dataTrade.js";

function escapeHtml(v) {
  return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function toInt(v) { return Math.floor(Number(v || 0)); }
function fmt(s) { return `${Math.max(0, Math.ceil(Number(s || 0)))} 秒`; }

export function renderMerchantArea({
  state,
  getResourceLabel,
  merchantSystem,
  onFulfillOrder = null,
  onCancelOrder  = null,
  onRefreshMerchant = null
}) {
  const root = document.getElementById("merchantArea");
  if (!root) return;

  const merchant   = state.merchant || {};
  const present    = !!merchant.present;
  const presentSec = Math.max(0, Number(merchant.presentSec || 0));
  const cash       = toInt(merchant.cash || 0);
  const maxCash    = Math.max(cash, toInt(merchant.maxCash || cash));
  const orders     = Array.isArray(merchant.orders) ? merchant.orders : [];

  const chancePct = merchantSystem?.merchantChancePerMinute
    ? (Number(merchantSystem.merchantChancePerMinute() || 0) * 100).toFixed(1)
    : "0";

  const orderLimit = merchantSystem?.getMerchantOrderLimit?.() || 3;

  // ── Sell section ─────────────────────────────────────────────
  const sellableItems = Object.entries(sellPrices)
    .map(([id, price]) => {
      const qty = toInt(state.resources?.[id] || 0);
      return { id, price, qty, label: getResourceLabel(id) };
    })
    .filter(item => item.price > 0)
    .sort((a, b) => a.label.localeCompare(b.label, "zh-Hant"));

  const sellRows = sellableItems.map(({ id, price, qty, label }) => `
    <div class="merchant-item">
      <div><strong>${escapeHtml(label)}</strong></div>
      <div class="small muted">持有：${qty}｜單價：${price} 金</div>
      <div class="row" style="gap:4px;margin-top:4px;flex-wrap:nowrap;">
        <input type="number" min="1" max="${qty}" value="1"
          id="sell-qty-${escapeHtml(id)}"
          style="width:60px;background:#0f172a;color:var(--text);border:1px solid #475569;border-radius:8px;padding:4px 6px;"
        />
        <button class="tiny-btn" data-sell="${escapeHtml(id)}"
          ${qty <= 0 ? "disabled" : ""}>賣出</button>
        <button class="tiny-btn" data-sell-all="${escapeHtml(id)}"
          ${qty <= 0 ? "disabled" : ""}>全賣</button>
      </div>
    </div>
  `).join("");

  // ── Order cards ───────────────────────────────────────────────
  const orderCards = orders.map(order => {
    const have   = toInt(state.resources?.[order.resource] || 0);
    const need   = toInt(order.qty || 0);
    const enough = have >= need;
    const tierLabel = order.tierLabel || order.tier || "普通";
    return `
      <div class="order-card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong>${escapeHtml(getResourceLabel(order.resource))}</strong>
          <span class="pill">${escapeHtml(tierLabel)}</span>
        </div>
        <div class="small muted">需求：${need}｜持有：${have}</div>
        <div class="small muted">報酬：${toInt(order.rewardGold)} 金｜
          貿易 EXP ${toInt(order.rewardTrade)}｜聲望 ${Number(order.rewardRep || 0).toFixed(1)}</div>
        <div class="row" style="margin-top:6px;gap:6px;">
          <button class="tiny-btn" data-fulfill="${escapeHtml(order.id)}"
            ${enough ? "" : "disabled"}>繳交</button>
          <button class="tiny-btn" data-cancel-order="${escapeHtml(order.id)}">取消</button>
        </div>
      </div>`;
  }).join("");

  root.innerHTML = `
    <!-- Merchant status -->
    <div class="row" style="flex-wrap:wrap;gap:8px;margin-bottom:12px;align-items:center;">
      <span class="pill">
        ${present
          ? `商人到訪中｜剩餘 ${fmt(presentSec)}`
          : `商人未到訪｜每分鐘 ${chancePct}% 機率`}
      </span>
      <span class="pill">攜帶金額：${cash} / ${maxCash}</span>
      <span class="pill">訂單：${orders.length} / ${orderLimit}</span>
      <button class="tiny-btn" id="merchantCallBtn" type="button">手動召喚商人</button>
    </div>

    <!-- Sell section -->
    <h3 style="margin:0 0 8px">賣出資源</h3>
    ${sellableItems.length === 0
      ? `<div class="small muted">目前沒有可賣出的資源。</div>`
      : `<div class="merchant-grid">${sellRows}</div>`}

    <!-- Orders -->
    <h3 style="margin:16px 0 8px">商人訂單（布告欄）</h3>
    ${orders.length === 0
      ? `<div class="small muted" style="border:1px dashed rgba(255,255,255,.14);border-radius:10px;padding:12px;">
          目前沒有待完成的訂單。
         </div>`
      : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;">
          ${orderCards}
         </div>`}
  `;

  // ── Event listeners ────────────────────────────────────────────
  root.getElementById = undefined; // safety

  root.querySelector("#merchantCallBtn")?.addEventListener("click", () => {
    onRefreshMerchant?.();
  });

  // Sell individual qty
  root.querySelectorAll("[data-sell]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id    = btn.dataset.sell;
      const input = root.querySelector(`#sell-qty-${id}`);
      const qty   = Math.max(1, toInt(input?.value || 1));
      const have  = toInt(state.resources?.[id] || 0);
      const actual = Math.min(qty, have);
      if (actual <= 0) return;
      const price = sellPrices[id] || 0;
      state.resources[id] = have - actual;
      state.gold = (state.gold || 0) + actual * price;
      // re-render
      renderMerchantArea({ state, getResourceLabel, merchantSystem, onFulfillOrder, onCancelOrder, onRefreshMerchant });
    });
  });

  // Sell all
  root.querySelectorAll("[data-sell-all]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id   = btn.dataset.sellAll;
      const have = toInt(state.resources?.[id] || 0);
      if (have <= 0) return;
      const price = sellPrices[id] || 0;
      state.resources[id] = 0;
      state.gold = (state.gold || 0) + have * price;
      renderMerchantArea({ state, getResourceLabel, merchantSystem, onFulfillOrder, onCancelOrder, onRefreshMerchant });
    });
  });

  // Fulfill order
  root.querySelectorAll("[data-fulfill]").forEach(btn => {
    btn.addEventListener("click", () => onFulfillOrder?.(btn.dataset.fulfill));
  });

  // Cancel order
  root.querySelectorAll("[data-cancel-order]").forEach(btn => {
    btn.addEventListener("click", () => onCancelOrder?.(btn.dataset.cancelOrder));
  });
}
