import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { SCALE_OPTIONS } from '../src/fretboard/scaleCatalog.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--autoplay-policy=no-user-gesture-required'] });
const base = process.env.SCALE_TEST_URL || 'http://127.0.0.1:5183';
const out = 'work/scale-catalog-ui';
await mkdir(out, { recursive: true });
const results = [];
let activePage;
try {
  const surfaces = [[390, 844, true], [844, 390, true], [1024, 768, true], [1440, 960, false]];
  for (const [width, height, touch] of surfaces.filter(([width]) => !process.env.SCALE_TEST_WIDTHS || process.env.SCALE_TEST_WIDTHS.split(',').map(Number).includes(width))) {
    for (const route of ['stage2', 'fretboard']) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch });
      activePage = page;
      page.setDefaultTimeout(20000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}/#${route}`, { waitUntil: 'domcontentloaded' });
      await page.locator('.launchSplash').waitFor({ state: 'hidden' });
      if (route === 'fretboard') await page.locator('.viewerModeTabs button').last().click();
      const picker = page.locator(route === 'stage2' ? '.stage2HeaderScalePicker .referenceScalePicker:visible' : '.viewerScaleSelectGrid:visible');
      await picker.waitFor();
      const controls = picker.locator('.metronomeSelectControl');
      const menuOptions = page.locator('.metronomeSelectMenu:visible').getByRole('option');
      assert.equal(await controls.count(), 3, `${width} ${route}: exactly key / scale / position`);
      async function choose(index, label) {
        await controls.nth(index).locator('.metronomeSelectButton').click();
        await page.locator('.metronomeSelectMenu:visible').getByRole('option', { name: label, exact: true }).click();
      }
      await controls.nth(0).locator('button').click();
      const keys = await menuOptions.allTextContents();
      assert.equal(keys.length, 12);
      await menuOptions.first().click();
      await controls.nth(1).locator('button').click();
      assert.deepEqual(await menuOptions.allTextContents(), SCALE_OPTIONS.map(option => option.label));
      await menuOptions.first().click();
      const board = page.locator(route === 'stage2' ? '.trainingSharedFretboard:visible' : '.viewerSharedFretboard:visible').last();
      for (const [index, scale] of SCALE_OPTIONS.entries()) {
        await choose(1, scale.label);
        await choose(0, keys[index % 12]);
        assert.ok(await board.locator('.fretboardNoteChip').count() > 0, `${scale.id}: visible notes`);
        assert.match(await controls.nth(1).innerText(), new RegExp(scale.label));
      }
      const geometry = await controls.evaluateAll(elements => elements.map(element => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }));
      for (let i = 1; i < geometry.length; i += 1) {
        assert.ok(Math.abs(geometry[i].y - geometry[0].y) < 2, `${width}/${route}: single row ${JSON.stringify(geometry)}`);
        assert.ok(geometry[i].x >= geometry[i - 1].x + geometry[i - 1].width - 1, `${width}/${route}: ordered fields`);
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}/${route}: no page overflow`);
      if (route === 'stage2') {
        const nav = page.locator('.mobileScalePositionNavigation:visible, .desktopScalePositionNavigation:visible');
        await nav.waitFor();
        for (let box = 2; box <= 5; box += 1) {
          await nav.locator('button').last().click();
          assert.match(await nav.innerText(), new RegExp(`BOX\\s*${box}\\s*/\\s*5`));
        }
        assert.equal(await nav.locator('button').last().isDisabled(), true);
        await nav.locator('button').first().click();
        assert.match(await nav.innerText(), /BOX\s*4\s*\/\s*5/);
        await choose(1, 'Minor Blues');
        assert.match(await nav.innerText(), /BOX\s*4\s*\/\s*5/, 'scale change keeps box selection');
      }
      for (const octaves of [1, 2]) {
        await choose(2, `으뜸음 · ${octaves}옥타브`);
        for (const label of ['Minor Blues', 'Harmonic Minor', 'Melodic Minor']) await choose(1, label);
        assert.ok(await board.locator('.fretboardNoteChip').count() > 0);
      }
      await choose(2, route === 'stage2' ? 'BOX' : 'BOX1');
      await choose(1, 'Phrygian Dominant');
      if (route === 'stage2') {
        await page.locator('button:visible').filter({ hasText: /^PLAY$/ }).click();
        await page.waitForTimeout(1200);
        await page.locator('button:visible').filter({ hasText: /^STOP$/ }).click();
      }
      await page.screenshot({ path: `${out}/${width}-${route}.png` });
      assert.deepEqual(errors, [], `${width}/${route}: no runtime errors`);
      const result = { width, height, route, scaleCount: SCALE_OPTIONS.length, keyCount: keys.length, geometry, errors };
      results.push(result);
      console.log(JSON.stringify(result));
      await page.close();
    }
  }
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: `${out}/failure.png` });
    await writeFile(`${out}/failure.txt`, await activePage.locator('body').innerText());
  }
  throw error;
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
