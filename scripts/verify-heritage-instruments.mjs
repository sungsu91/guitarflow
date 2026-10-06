import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { HERITAGE_INSTRUMENT_PACK } from "../src/shooter/instruments/heritageInstrumentPack.js";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const base = process.env.SHOOTER_TEST_URL || "http://127.0.0.1:5173";
const production = process.argv.includes("--production");
const deletion = process.argv.includes("--delete") && !production;
const out = `work/fl-custom-heritage/${production ? "production" : "development"}`;
await mkdir(out, { recursive: true });
const deletedPath = new URL("../src/shooter/instruments/deletedGuitarSkins.json", import.meta.url);
const retired = JSON.parse(await readFile(deletedPath, "utf8"));
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const reports = [];
const profiles = [
  ["desktop", { width: 1440, height: 1000 }, {}],
  ["mobile", { width: 390, height: 844 }, { isMobile: true, hasTouch: true, userAgent: "iPhone Mobile" }],
  ["tablet", { width: 820, height: 1180 }, { isMobile: true, hasTouch: true, userAgent: "iPad Safari" }],
];
async function openPicker(page) {
  await page.locator('.shooterPanel').waitFor();
  await page.locator('.launchSplash').waitFor({ state: "hidden" });
  const mobileButton = page.locator('.shooterStartPanelButton--secondary');
  if (await mobileButton.isVisible()) await mobileButton.click();
  else await page.getByRole("button", { name: "스킨 변경", exact: true }).click();
  await page.locator('.shooterGuitarPickerModal').waitFor();
}
try {
  for (const [name, viewport, options] of profiles) {
    const page = await browser.newPage({ viewport, ...options });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/#shooter`);
    await openPicker(page);
    for (const [category, label] of [["acoustic", "어쿠스틱"], ["electric", "일렉"], ["bass", "베이스"]]) {
      await page.locator('.shooterGuitarCategoryTabs').getByRole("button", { name: label, exact: true }).click();
      const skins = HERITAGE_INSTRUMENT_PACK.filter((skin) => skin.category === category);
      const ids = await page.locator('.shooterGuitarPickerItem').evaluateAll((items) => items.map((item) => item.dataset.skinId));
      assert.deepEqual(ids.filter((id) => id.startsWith("heritage-")), skins.map((skin) => skin.id));
      assert.ok(retired.every((id) => !ids.includes(id)));
      if (category === "bass") assert.ok(ids.includes("bass_velvet_bloom_v1"));
      for (const skin of skins) {
        const card = page.locator(`[data-skin-id="${skin.id}"]`);
        await card.click();
        assert.equal(await card.getAttribute("aria-pressed"), "true");
        await page.waitForFunction((id) => {
          const img = document.querySelector(`[data-skin-id="${id}"] img`);
          return img?.complete && img.naturalWidth === 512;
        }, skin.id);
        const player = page.locator('.guitarPlayerAsset.guitarAssetImage').first();
        assert.ok((await player.getAttribute("src")).includes(skin.id));
      }
      await page.locator(`[data-skin-id="${skins[0].id}"]`).click();
      await page.screenshot({ path: `${out}/${name}-${category}.png` });
      const geometry = await page.locator('.shooterGuitarSkinCard').first().evaluate((el) => {
        const card = el.getBoundingClientRect(), img = el.querySelector("img").getBoundingClientRect();
        return { top: img.top - card.top, bottom: card.bottom - img.bottom, left: img.left - card.left, right: card.right - img.right };
      });
      assert.ok(Object.values(geometry).every((value) => value >= -1), `${name} ${category} image clipped: ${JSON.stringify(geometry)}`);
    }
    assert.equal(await page.locator('.shooterGuitarDelete').count() > 0, !production);
    if (!production) {
      const before = await page.evaluate(() => localStorage.getItem("rifflabSelectedGuitar"));
      page.once("dialog", async (dialog) => {
        assert.equal(dialog.type(), "confirm");
        assert.match(dialog.message(), /삭제할까요/);
        await dialog.dismiss();
      });
      await page.getByRole("button", { name: "FLAME ASH 스킨 삭제", exact: true }).click();
      assert.equal(await page.evaluate(() => localStorage.getItem("rifflabSelectedGuitar")), before);
      assert.equal(await page.locator('[data-skin-id="heritage-j-natural"]').count(), 1);
    }
    await page.reload();
    await page.locator('.guitarPlayerAsset.guitarAssetImage').first().waitFor();
    assert.ok((await page.locator('.guitarPlayerAsset.guitarAssetImage').first().getAttribute("src")).includes("heritage-p-vintage"));
    assert.deepEqual(errors, []);
    reports.push({ profile: name, production, testedSkins: 15, pass: true });
    console.log("PASS", name, production ? "production" : "development");
    await page.close();
  }
  if (deletion) {
    const id = "heritage-om-rosewood";
    assert.ok(!retired.includes(id), "Test instrument must be available before temporary deletion");
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    try {
      await page.goto(`${base}/#shooter`);
      await openPicker(page);
      await page.locator(`[data-skin-id="${id}"]`).click();
      await page.evaluate((id) => localStorage.setItem("shooterPlayerSlots", JSON.stringify({ slot1: id })), id);
      await page.reload();
      await openPicker(page);
      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: "PEARL OM 스킨 삭제", exact: true }).click();
      await page.locator(`[data-skin-id="${id}"]`).waitFor({ state: "detached" });
      assert.ok(JSON.parse(await readFile(deletedPath, "utf8")).includes(id));
      await page.reload();
      await openPicker(page);
      assert.equal(await page.locator(`[data-skin-id="${id}"]`).count(), 0);
      const stored = await page.evaluate(() => ({ selected: localStorage.getItem("rifflabSelectedGuitar"), slots: JSON.parse(localStorage.getItem("shooterPlayerSlots")) }));
      assert.notEqual(stored.selected, id);
      assert.ok(Object.values(stored.slots).every((slot) => slot !== id));
      reports.push({ deletion: "confirmed, persisted in source, reload, equipped fallback and saved slot migration", pass: true });
      console.log("PASS confirmed persistent deletion and fallback");
    } finally {
      // Restore only the instrument removed by this verification; retain all other changes.
      const current = JSON.parse(await readFile(deletedPath, "utf8"));
      await writeFile(deletedPath, `${JSON.stringify(current.filter((item) => item !== id), null, 2)}\n`);
      await page.close();
    }
  }
} finally {
  await browser.close();
  await writeFile(`${out}/report.json`, `${JSON.stringify(reports, null, 2)}\n`);
}
