const GAME_VERSION = "v0.1.0.4";
const GAME_TITLE = "城主村莊測試版 " + GAME_VERSION;
const GAME_CHANGELOG = "穩定回復版：以可運行的 0.1.0.2 為基礎，保留舊存檔相容與既有數據。";

const STORAGE_KEY = "city_lord_test_shared";
const STORAGE_KEY_LEGACY = "city_lord_test_v4";
const SAVE_SCHEMA_VERSION = 16;
const LEGACY_STORAGE_KEYS = [
  "city_lord_test_v4",
  "city_lord_test_v3",
  "city_lord_test_v2",
  "city_lord_test"
];

const rarityMultipliers = {
  common: 1,
  rare: 1.2,
  epic: 1.5,
  legendary: 2.0
};

function syncGameVersionLabels() {
  document.title = GAME_TITLE;
  const titleEl = document.getElementById("gameTitle");
  if (titleEl) titleEl.textContent = GAME_TITLE;
  const noteEl = document.getElementById("gameVersionNote");
  if (noteEl) noteEl.textContent = `${GAME_VERSION}：${GAME_CHANGELOG}`;
}

syncGameVersionLabels();
