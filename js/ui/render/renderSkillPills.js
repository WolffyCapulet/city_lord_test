function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function defaultFormat(value) {
  return Math.floor(Number(value || 0)).toString();
}

export function getSkillLevelEffectText({
  id,
  state,
  expToNext,
  format = defaultFormat
}) {
  const lv = state?.skills?.[id]?.level || 1;
  const exp = state?.skills?.[id]?.exp || 0;
  const buildings = state?.buildings || {};

  const common = `等級：Lv.${lv}\n經驗：${format(exp)} / ${expToNext(lv)}\n`;

  const map = {
    labor: `效果：村莊打工收入主要受主等級影響。`,
    lumber: `效果：伐木熟練度記錄。伐木廠額外讓技能經驗 +${(buildings.lumberMill || 0) * 10}%`,
    mining: `效果：Lv.10 解鎖銀礦 / 磁石 / 水晶，Lv.20 解鎖金礦 / 寶石。`,
    fishing: `效果：釣魚熟練度記錄。釣魚小屋額外讓技能經驗 +${(buildings.fishingShack || 0) * 10}%`,
    hunting: `效果：狩獵熟練度記錄。`,
    gathering: `效果：森林採集與海邊採集共用此技能。`,
    digging: `效果：挖掘熟練度記錄。挖掘場額外讓技能經驗 +${(buildings.quarry || 0) * 10}%`,
    farming: `效果：耕種熟練度記錄。`,
    woodworking: `效果：木工製作熟練度記錄。`,
    masonry: `效果：石工與燒製熟練度記錄。`,
    cooking: `效果：烹飪熟練度記錄。`,
    smelting: `效果：冶煉熟練度記錄。`,
    alchemy: `效果：煉金熟練度記錄。`,
    tanning: `效果：裁縫與皮料加工熟練度記錄。`
  };

  return common + (map[id] || "效果：記錄此技能熟練度。");
}

export function renderSkillPills({
  state,
  skillLabels,
  expToNext,
  format = defaultFormat
}) {
  const root = document.getElementById("skillPills");
  if (!root) return;

  root.innerHTML = "";

  Object.entries(skillLabels || {}).forEach(([id, label]) => {
    const skill = state?.skills?.[id] || { level: 1, exp: 0 };

    const div = document.createElement("div");
    div.className = "pill";
    div.textContent = `${label} Lv.${skill.level}`;
    div.title = `${label}\n${getSkillLevelEffectText({
      id,
      state,
      expToNext,
      format
    })}`;

    root.appendChild(div);
  });
}
