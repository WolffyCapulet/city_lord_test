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

function formatSeconds(seconds) {
  return `${Math.max(0, Math.ceil(Number(seconds || 0)))} 秒`;
}

function getTierMeta(merchantSystem, tier) {
  if (merchantSystem?.getOrderTierMeta) {
    return merchantSystem.getOrderTierMeta(tier);
  }

  return {
    id: tier || "common",
    label: tier || "common",
    multiplier: 1,
    bonusTrade: 0,
    rep: 0
  };
}

function buildOrderCard({
  order,
  state,
  getResourceLabel,
  merchantSystem
}) {
  const have = toInt(state.resources?.[order.resource] || 0);
  const need = toInt(order.qty || 0);
  const enough = have >= need;
  const tierMeta = getTierMeta(merchantSystem, order.tier || "common");
  const tierLabel = order.tierLabel || tierMeta.label || "普通";

  return `
    <div
      class="merchant-order-card"
      style="
        border:1px solid rgba(255,255,255,.12);
        border-radius:12px;
        padding:10px;
        background:rgba(255,255,255,.03);
        display:flex;
        flex-direction:column;
        gap:6px;
      "
    >
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
        <strong>${escapeHtml(order.from || "行腳商人")}</strong>
        <span class="pill">${escapeHtml(tierLabel)}</span>
      </div>

      <div>${escapeHtml(getResourceLabel(order.resource))}</div>

      <div class="small muted">
        需求：${need}｜持有：${have}
      </div>

      <div class="small muted">
        報酬：${toInt(order.rewardGold)} 金｜貿易 EXP ${toInt(order.rewardTrade)}｜聲望 ${Number(order.rewardRep || 0)}
      </div>

      <div class="row">
        <button
          type="button"
          class="tiny-btn"
          data-merchant-fulfill="${escapeHtml(order.id)}"
          ${enough ? "" : "disabled"}
          title="${enough ? "繳交這張訂單" : "物資不足，無法繳交"}"
        >
          繳交訂單
        </button>

        <button
          type="button"
          class="tiny-btn"
          data-merchant-cancel="${escapeHtml(order.id)}"
          title="取消這張訂單"
        >
          取消訂單
        </button>
      </div>
    </div>
  `;
}

export function renderMerchantArea({
  state,
  getResourceLabel,
  merchantSystem,
  onFulfillOrder = null,
  onCancelOrder = null,
  onRefreshMerchant = null
}) {
  const root = document.getElementById("merchantArea");
  if (!root) return;

  const merchant = state.merchant || {};
  const present = !!merchant.present;
  const presentSec = Math.max(0, Number(merchant.presentSec || 0));
  const cash = toInt(merchant.cash || 0);
  const maxCash = Math.max(cash, toInt(merchant.maxCash || cash));
  const orders = Array.isArray(merchant.orders) ? merchant.orders : [];

  const chancePct = merchantSystem?.merchantChancePerMinute
    ? Math.round(Number(merchantSystem.merchantChancePerMinute() || 0) * 1000) / 10
    : 0;

  const orderLimit = merchantSystem?.getMerchantOrderLimit
    ? toInt(merchantSystem.getMerchantOrderLimit())
    : orders.length;

  const rareCount = orders.filter((o) => (o.tier || "common") === "rare").length;
  const epicCount = orders.filter((o) => (o.tier || "common") === "epic").length;

  root.innerHTML = `
    <div class="row" style="margin-bottom:10px;align-items:center;gap:8px;flex-wrap:wrap;">
      <span class="pill">
        ${
          present
            ? `商人到訪中｜剩餘 ${escapeHtml(formatSeconds(presentSec))}`
            : `商人未到訪｜每分鐘約 ${chancePct}% 機率出現`
        }
      </span>

      <span class="pill">攜帶金額：${cash} / ${maxCash}</span>
      <span class="pill">訂單：${orders.length} / ${orderLimit}</span>
      <span class="pill">進階：${rareCount}</span>
      <span class="pill">高級：${epicCount}</span>

      <button
        id="merchantRefreshBtn"
        type="button"
        class="tiny-btn"
        title="手動召喚商人，方便測試"
      >
        手動召喚商人
      </button>
    </div>

    <div class="small muted" style="margin-bottom:10px;">
      這一版先接回商人來訪與布告欄訂單功能。商店直接買賣可下一步再補。
    </div>

    <div style="font-weight:700;margin:8px 0 6px;">布告欄訂單</div>

    ${
      orders.length === 0
        ? `
          <div
            style="
              border:1px dashed rgba(255,255,255,.14);
              border-radius:12px;
              padding:12px;
            "
            class="small muted"
          >
            目前沒有待完成的訂單。
          </div>
        `
        : `
          <div
            class="merchant-order-grid"
            style="
              display:grid;
              grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
              gap:10px;
            "
          >
            ${orders
              .map((order) =>
                buildOrderCard({
                  order,
                  state,
                  getResourceLabel,
                  merchantSystem
                })
              )
              .join("")}
          </div>
        `
    }
  `;

  root.querySelector("#merchantRefreshBtn")?.addEventListener("click", () => {
    onRefreshMerchant?.();
  });

  root.querySelectorAll("[data-merchant-fulfill]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onFulfillOrder?.(btn.dataset.merchantFulfill);
    });
  });

  root.querySelectorAll("[data-merchant-cancel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onCancelOrder?.(btn.dataset.merchantCancel);
    });
  });
}
