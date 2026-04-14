# City Lord Test

單頁遊戲原型，核心目標是維持可玩性的同時，逐步把大型單檔邏輯拆成可維護模組。

## 目前結構

- `index.html`：UI 標記與目前主遊戲流程（仍有大量既有邏輯）
- `styles/main.css`：全站樣式
- `scripts/constants.js`：版本資訊、儲存鍵、全域常數
- `scripts/utils.js`：共用小工具函式（數值、時間、隨機）

## 維護原則

- 新增邏輯時，優先放在 `scripts/` 下，不再把新函式塞回 `index.html` 內嵌腳本
- 共用工具請放在 `scripts/utils.js`，避免在不同區塊重複實作
- 所有 UI 文案與版本資訊集中在 `scripts/constants.js`
- 每次改動以「小步重構」為原則：先抽一組功能，再驗證一次可玩性

## 建議下一步拆分

1. 抽出狀態與存檔（`scripts/state.js`）
2. 抽出畫面渲染（`scripts/render.js`）
3. 抽出事件綁定（`scripts/events.js`）
4. 最後留下 `scripts/main.js` 作為啟動入口
