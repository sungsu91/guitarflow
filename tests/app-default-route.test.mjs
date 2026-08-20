import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSourceUrl = new URL("../src/App.jsx", import.meta.url);
const appStyleUrl = new URL("../src/style.css", import.meta.url);

test("app launch and shooter use the requested operational defaults", async () => {
  const appSource = await readFile(appSourceUrl, "utf8");

  assert.match(appSource, /const APP_DEFAULT_ROUTE = APP_ROUTES\.FRETBOARD_VIEWER;/);
  assert.match(appSource, /const normalizedHash = hash \|\| APP_DEFAULT_ROUTE;/);
  assert.match(appSource, /\{ appRoute: APP_DEFAULT_ROUTE \}/);
  assert.match(
    appSource,
    /`\$\{window\.location\.pathname\}\$\{window\.location\.search\}\$\{APP_DEFAULT_ROUTE\}`/,
  );
  assert.match(appSource, /const DEFAULT_SHOOTER_MAP_ID = "river-garden";/);
  assert.match(appSource, /const SHOOTER_MAP_STORAGE_KEY = "rifflabShooterMapV2";/);
  assert.match(appSource, /localStorage\.setItem\(SHOOTER_MAP_STORAGE_KEY, nextMap\.id\)/);
});

test("shooter exposes only the current layered maps and no emblem catalog", async () => {
  const [appSource, appStyle] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(appStyleUrl, "utf8"),
  ]);

  assert.doesNotMatch(appSource, /JUST PLAY 연습실|오션 리조트|오비탈 갤럭시/);
  assert.doesNotMatch(appSource, /rifflab-practice-studio-clean\.png|ocean-resort\.png|orbital-galaxy\.png/);
  assert.doesNotMatch(appStyle, /rifflab-practice-studio-clean\.png|ocean-resort\.png|orbital-galaxy\.png/);
  assert.match(appSource, /"rifflab-studio": "river-garden"/);
  assert.match(appSource, /"ocean-resort": "river-garden"/);
  assert.match(appSource, /"orbital-galaxy": "river-garden"/);
  assert.match(
    appSource,
    /const SHOOTER_SKIN_TABS = \[\s*\{ id: "guitar", label: "기타" \},\s*\{ id: "monster", label: "몹 스킨" \},\s*\{ id: "map", label: "맵" \},\s*\{ id: "effect", label: "이펙트" \},\s*\{ id: "pick", label: "피크" \},\s*\];/,
  );
  assert.match(appSource, /const SHOOTER_MONSTER_SKIN_STORAGE_KEY = "rifflabShooterMonsterSkin";/);
  assert.match(appSource, /localStorage\.setItem\(SHOOTER_MONSTER_SKIN_STORAGE_KEY, nextSkin\.id\)/);
  assert.doesNotMatch(appSource, /SHOOTER_EMBLEM_OPTIONS|ShooterEmblemArtwork|selectedShooterEmblem|applyShooterEmblem/);
  assert.doesNotMatch(appSource, /\{ id: "emblem", label: "엠블럼" \}/);
});
