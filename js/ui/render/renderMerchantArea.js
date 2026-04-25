function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderMerchantArea({
  state,
  getResourceLabel,
  merchantSystem,
  onFulfillOrder,
  onCancelOrder,
  onRefreshMerchant
}) {
  const root = document.getElementById("merchantArea");
  if (!root) return;

  const merchant = state.merchant || {};
  const orders = Array.isArray(merchant.orders) ? merchant.orders : [];
  const present = !!merchant.present;
  const presentSec = Math.max(0, Math.ceil(Number(merchant.presentSec || 0)));
  const cash = Math.floor(Number(merchant.cash || 0));
  const chancePct = Math.round(merchantSystem.merchantChancePerMinute() * 100);
  const limit = merchantSystem.getMerchantOrderLimit();
  const highCount = orders.filter((o) => (o.tier || "common") !== "common").length;

  root.innerHTML = `
    <div class="row" style="margin-bottom:8px;align-items:center;">
      <span class="pill">
        ${
          present
            ? `商人到訪中（${presentSec} 秒）`
            : `商人未到訪（每分鐘約 ${chancePct}% 機率）`
        }
      </span>
      <span class="pill">攜帶金額：${cash}</span>
      <span class="pill">訂單：${orders.length}/${limit}</span>
      <span class="pill">高階訂單：${highCount}</span>
      <button id="merchantRefreshBtn" class="tiny-btn" type="button">手動召喚商人</button>
    </div>

    <div class="small muted" style="margin-bottom:8px;">
      商人會依據貿易等級、城池等級與安全值提高到訪率與攜帶金額。這一版先接回布告欄訂單功能。
    </div>

    <div style="font-weight:700;margin:8px 0 6px;">布告欄</div>

    ${
      orders.length === 0
        ? `<div class="small muted">目前沒有待完成的商人訂單。</div>`
        : `
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px;">
            ${orders
              .map((order) => {
                const have = Math.floor(Number(state.resources?.[order.resource] || 0));
                const disabled = have < order.qty ? "disabled" : "";
                const tierLabel =
                  order.tierLabel ||
                  merchantSystem.getOrderTierMeta(order.tier || "common").label;

                return `
                  <div style="border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px;background:rgba(255,255,255,.03);display:flex;flex-direction:column;gap:6px;">
                    <strong>${escapeHtml(order.from || "行腳商人")}【${escapeHtml(tierLabel)}】</strong>
                    <div>${escapeHtml(getResourceLabel(order.resource))}</div>
                    <div class="small muted">需求：${order.qty}｜現有：${have}</div>
                    <div class="small muted">報酬：${order.rewardGold} 金｜貿易 EXP ${order.rewardTrade}｜聲望 ${order.rewardRep}</div>
                    <div class="row">
                      <button class="tiny-btn" data-fulfill-order="${escapeHtml(order.id)}" type="button" ${disabled}>繳交訂單</button>
                      <button class="tiny-btn" data-cancel-order="${escapeHtml(order.id)}" type="button">取消訂單</button>
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
        `
    }


  `;

  root.querySelector("#merchantRefreshBtn")?.addEventListener("click", () => {
    onRefreshMerchant?.();
  });

  root.querySelectorAll("[data-fulfill-order]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onFulfillOrder?.(btn.dataset.fulfillOrder);
    });
  });

  root.querySelectorAll("[data-cancel-order]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onCancelOrder?.(btn.dataset.cancelOrder);
    });
  });
}
