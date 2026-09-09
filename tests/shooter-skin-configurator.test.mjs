import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appStyleUrl = new URL("../src/style.css", import.meta.url);
const appSourceUrl = new URL("../src/App.jsx", import.meta.url);
const mobileConfiguratorStyleUrl = new URL("../src/shooter/mobile-skin-configurator.css", import.meta.url);

test("brand-dark mobile skin loadout uses the compact speech-bubble typography", async () => {
  const appCss = await readFile(appStyleUrl, "utf8");
  const themedLoadoutRules = [
    "shooterSkinArenaLoadoutSummary > small",
    "shooterSkinArenaLoadoutSummary strong",
    "shooterSkinArenaLoadoutSummary em",
    "shooterSkinArenaEquipmentRow small",
    "shooterSkinArenaEquipmentRow strong",
  ];

  for (const selector of themedLoadoutRules) {
    assert.match(
      appCss,
      new RegExp(`\\.app:is\\(\\.theme-brand, \\.theme-light, \\.theme-dark\\) \\.${selector.replaceAll(" ", "\\s+")}`),
      `${selector} must include the brand-dark theme`,
    );
  }
});

test("skin tabs include the pet catalog beside the effect catalog", async () => {
  const appSource = await readFile(appSourceUrl, "utf8");
  const tabBlock = appSource.match(/const SHOOTER_SKIN_TABS = \[([\s\S]*?)\n\];/)?.[1] ?? "";

  assert.deepEqual(
    [...tabBlock.matchAll(/\{ id: "([^"]+)", label: "([^"]+)" \}/g)]
      .map(([, id, label]) => [id, label]),
    [
      ["guitar", "기타"],
      ["effect", "이펙트"],
      ["pet", "펫"],
      ["map", "맵"],
      ["pick", "피크"],
      ["monster", "몹스킨"],
    ],
  );
});

test("physical mobile map catalog keeps a dedicated touch-scroll area", async () => {
  const [appSource, appCss, mobileConfiguratorCss] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(appStyleUrl, "utf8"),
    readFile(mobileConfiguratorStyleUrl, "utf8"),
  ]);

  assert.match(appSource, /shooterSkinPickerBodyFrame--\$\{shooterSkinTab\}/);
  assert.match(appCss, /shooterSkinPickerBodyFrame--map[\s\S]*?height: 100%;[\s\S]*?overflow: hidden;/);
  assert.match(appCss, /shooterSkinConfigurator--arenaPreview \.shooterSkinPickerBody[\s\S]*?overflow-y: auto !important;[\s\S]*?touch-action: pan-y !important;/);
  assert.match(appCss, /shooterSkinPickerBodyFrame--map > \.shooterSkinPickerBody[\s\S]*?position: absolute !important;[\s\S]*?inset: 0 !important;[\s\S]*?overflow-y: auto !important;/);
  const finalMobileMapRules = appCss.slice(
    appCss.lastIndexOf("/* Keep the physical mobile map catalog clipped to the picker and scroll it in place. */"),
  );
  assert.match(finalMobileMapRules, /shooterGuitarPickerModal[\s\S]*?overflow: hidden !important;/);
  assert.match(finalMobileMapRules, /shooterSkinPickerBodyFrame--map[\s\S]*?position: relative !important;[\s\S]*?flex: 1 1 auto !important;[\s\S]*?overflow: hidden !important;/);
  assert.match(finalMobileMapRules, /shooterGuitarPickerModal--map[\s\S]*?shooterMapPickerGrid[\s\S]*?height: auto !important;[\s\S]*?min-height: 0 !important;/);
  assert.match(mobileConfiguratorCss, /shooterGuitarPickerModal--map[\s\S]*?overflow: hidden !important;/);
  assert.match(mobileConfiguratorCss, /shooterSkinPickerBodyFrame--map[\s\S]*?overflow: hidden !important;/);
  assert.match(mobileConfiguratorCss, /shooterSkinPickerBodyFrame--map[\s\S]*?> \.shooterSkinPickerBody[\s\S]*?overflow-y: auto !important;[\s\S]*?scrollbar-width: thin;[\s\S]*?touch-action: pan-y !important;/);
  assert.match(mobileConfiguratorCss, /shooterSkinOptionStack[\s\S]*?height: auto !important;/);
  assert.match(mobileConfiguratorCss, /shooterMapPickerGrid[\s\S]*?height: auto !important;/);
});

test("the wide 3D lab map has its own landscape-only catalog section", async () => {
  const [appSource, threeDLabSource] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(new URL("../src/shooter/maps/skins/threeDLab.js", import.meta.url), "utf8"),
  ]);

  assert.match(threeDLabSource, /landscapeOnly: true/);
  assert.match(appSource, /const landscapeShooterMapOptions = SHOOTER_MAP_OPTIONS\.filter\(\(map\) => map\.landscapeOnly\)/);
  assert.match(appSource, /className="shooterMapLandscapeDivider"[\s\S]*?가로 전용[\s\S]*?휴대폰 가로 화면용 맵/);
  assert.match(appSource, /landscapeShooterMapOptions\.map[\s\S]*?shooterMapCard--landscape[\s\S]*?shooterMapLandscapeBadge/);
  assert.match(appSource, /map\.devOnly && !map\.landscapeOnly/);
});

test("guitar tab filters acoustic, electric and bass from a bottom category bar", async () => {
  const [appSource, appCss] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(appStyleUrl, "utf8"),
  ]);
  const categoryBlock = appSource.match(/const SHOOTER_GUITAR_CATEGORY_OPTIONS = \[([\s\S]*?)\n\];/)?.[1] ?? "";

  assert.deepEqual(
    [...categoryBlock.matchAll(/label: "([^"]+)"/g)].map(([, label]) => label),
    ["어쿠스틱", "일렉", "베이스"],
  );
  assert.match(
    appSource,
    /const \[shooterGuitarCategoryId, setShooterGuitarCategoryId\] = useState\(\s*SHOOTER_GUITAR_CATEGORIES\.ACOUSTIC,\s*\);/,
  );
  assert.doesNotMatch(appSource, /initialGuitarCategoryId/);
  assert.match(appSource, /section\.id === shooterGuitarCategoryId/);
  assert.match(appSource, /aria-label="기타 종류 선택"/);
  assert.match(appSource, /shooterGuitarCategoryTabs--mobile/);
  assert.match(appSource, /shooterGuitarCategoryTabs--desktop/);
  assert.match(appCss, /shooterSkinPickerBodyFrame--guitar[\s\S]*?grid-template-rows: minmax\(0, 1fr\) auto;/);
});

test("guitar browsing stays vertical on mobile and desktop", async () => {
  const appCss = await readFile(appStyleUrl, "utf8");

  assert.match(
    appCss,
    /shooterSkinConfigurator--arenaPreview[\s\S]*?shooterGuitarPickerList--filtered[\s\S]*?grid-auto-flow: row !important;[\s\S]*?touch-action: pan-y !important;/,
  );
  assert.match(
    appCss,
    /shooterSkinConfigurator--desktopWindow[\s\S]*?shooterGuitarPickerList--filtered[\s\S]*?grid-template-columns: repeat\(auto-fill, minmax\(140px, 1fr\)\) !important;[\s\S]*?grid-auto-flow: row !important;[\s\S]*?overflow: visible !important;[\s\S]*?touch-action: pan-y !important;/,
  );
});
