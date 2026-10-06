import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { ART_MAP_CATALOG } from '../src/shooter/maps/artMapCatalog.js';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.ART_MAP_TEST_URL || 'http://127.0.0.1:5173';
const out = process.env.ART_MAP_TEST_OUTPUT || 'output/art-atlas-qa';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const report = [];
const profiles = [
  ['desktop', 1920, 1032, ''],
  ['mobile', 390, 844, 'iPhone Mobile'],
  ['tablet', 820, 1180, 'iPad Safari'],
  ['tablet-landscape', 1280, 800, 'Android Tablet'],
  ['mobile-small', 360, 780, 'iPhone Mobile'],
  ['tablet-split', 507, 1180, 'iPad Safari'],
];
async function openMaps(page, desktop) {
  if (desktop) await page.getByRole('button', { name: '스킨 변경', exact: true }).click();
  else await page.locator('.shooterStartPanelButton--secondary').click();
  await page.locator('.shooterSkinTabs').getByRole('button', { name: '맵', exact: true }).click();
}
try {
  for (const [name, width, height, userAgent] of profiles) {
    if (process.env.ART_MAP_PROFILES && !process.env.ART_MAP_PROFILES.split(',').includes(name)) continue;
    const desktop = name === 'desktop';
    const platform = name.startsWith('tablet') ? 'tablet' : desktop ? 'desktop' : 'mobile';
    const page = await browser.newPage({ viewport: { width, height }, ...(userAgent ? { userAgent, isMobile: true, hasTouch: true } : {}) });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.dismiss());
    page.setDefaultTimeout(30000);
    await page.goto(`${base}/#shooter`);
    await page.locator('.shooterArena').waitFor();
    await page.locator('.launchSplash').waitFor({ state: 'hidden', timeout: 45000 });
    await openMaps(page, desktop);
    const list = page.locator(desktop ? '.desktopMapGallery' : '.shooterMapPickerGrid');
    const cards = list.locator(desktop ? 'button' : '.shooterMapCard:not(.shooterMapCard--default):not(.shooterMapCard--dev):not(.shooterMapCard--landscape)');
    const labels = await cards.locator(desktop ? 'span' : 'strong').allTextContents();
    assert.deepEqual(labels.slice(-3).map(label => label.trim()), ART_MAP_CATALOG.map(map => map.nameKo));
    await page.screenshot({ path: `${out}/${name}-picker.png` });
    for (const scene of ART_MAP_CATALOG) {
      await cards.filter({ hasText: scene.nameKo }).click();
      const image = page.locator(`.${platform}ArtMap[data-art-map="${scene.id}"] > .artMapImage`);
      await image.waitFor();
      const measured = await image.evaluate(async el => {
        await el.decode();
        const rect = el.getBoundingClientRect();
        const scale = Math.max(rect.width / el.naturalWidth, rect.height / el.naturalHeight);
        const spark = el.parentElement.querySelector('.artMapAtmosphere i');
        return { src: el.getAttribute('src'), source: [el.naturalWidth, el.naturalHeight], viewport: [rect.width, rect.height], verticalCrop: el.naturalHeight - rect.height / scale, animation: getComputedStyle(spark).animationPlayState };
      });
      assert.equal(measured.src, scene.artwork[platform]);
      assert.ok(measured.viewport.every(n => n > 100));
      assert.ok(measured.verticalCrop < measured.source[1] * .13, `floor/landmarks cropped: ${JSON.stringify(measured)}`);
      if (desktop) assert.equal(measured.animation, 'paused');
      await page.locator('.shooterGuitarPickerHeader button').click();
      await page.screenshot({ path: `${out}/${name}-${scene.id}.png` });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert.equal(overflow, false, `${name}: horizontal overflow`);
      report.push({ profile: name, scene: scene.id, ...measured });
      await openMaps(page, desktop);
    }
    await page.reload();
    await page.locator(`.${platform}ArtMap[data-art-map="gilded-ink"] > .artMapImage`).waitFor();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator(`.${platform}ArtMap .artMapAtmosphere i`).first().evaluate(el => getComputedStyle(el).animationName), 'none');
    assert.deepEqual(errors, []);
    await page.close();
    console.log('PASS', name, 'selection, artwork, framing, reload, reduced motion');
  }
} finally {
  await browser.close();
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
}
