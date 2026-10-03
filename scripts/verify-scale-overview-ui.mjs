import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { SCALE_DEFINITIONS } from '../src/fretboard/scaleCatalog.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--autoplay-policy=no-user-gesture-required'] });
const out = 'work/scale-overview-ui';
await mkdir(out, { recursive: true });
const results = [];
let activePage;
try {
  for (const [width, height, touch] of [[390, 844, true], [844, 390, true], [1024, 768, true], [1440, 960, false]]) {
    if (process.env.SCALE_TEST_WIDTHS && !process.env.SCALE_TEST_WIDTHS.split(',').map(Number).includes(width)) continue;
    for (const route of ['stage2', 'fretboard']) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch });
      activePage = page;
      page.setDefaultTimeout(12000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${process.env.SCALE_TEST_URL || 'http://127.0.0.1:5184'}/#${route}`);
      await page.locator('.launchSplash').waitFor({ state: 'hidden' });
      if (route === 'fretboard') await page.locator('.viewerModeTabs button').last().click();
      const controls = page.locator(route === 'stage2' ? '.stage2HeaderScalePicker .referenceScalePicker:visible .metronomeSelectControl' : '.viewerScaleSelectGrid:visible .metronomeSelectControl');
      const board = page.locator(route === 'stage2' ? '.trainingSharedFretboard:visible' : '.viewerSharedFretboard:visible').last();
      const nav = page.locator('.mobileScalePositionNavigation:visible, .desktopScalePositionNavigation:visible');
      async function choose(index, name) {
        await controls.nth(index).locator('button').click();
        await page.locator('.metronomeSelectMenu:visible').getByRole('option', { name, exact: typeof name === 'string' }).click();
      }
      await choose(2, '전체');
      for (const scale of SCALE_DEFINITIONS) {
        await choose(1, scale.label);
        assert.match(await board.getAttribute('class'), /scaleAllPositionsFretboard/);
        assert.doesNotMatch(await board.getAttribute('class'), /fitRange/);
        assert.equal(await board.locator('.fretboardFretNumbers > span').last().textContent(), '24');
        const fretted = await board.locator('.fretboardNoteChip').evaluateAll(elements => elements.map(element => ({
          string: Number(element.dataset.stringNumber), fret: Number(element.dataset.fretNumber), pitch: element.dataset.notePitch,
        })));
        // At tonic C, two full chromatic octaves on each string have precisely
        // twice the scale's note count; open strings are displayed separately.
        assert.equal(fretted.length, 12 * scale.intervals.length, `${scale.id}: every fretted scale tone`);
        assert.ok(fretted.some(note => note.fret > 15));
      }
      await choose(0, /^F# \/ /);
      assert.match(await controls.nth(2).innerText(), /전체/);
      if (route === 'stage2') assert.equal(await nav.count(), 0, 'BOX navigation is not rendered in full view');
      const geometry = await board.evaluate(element => ({
        width: element.clientWidth, content: element.scrollWidth, overflow: getComputedStyle(element).overflowX,
        touch: getComputedStyle(element).touchAction,
        chipWidth: element.querySelector('.fretboardNoteChip').getBoundingClientRect().width,
      }));
      assert.ok(geometry.content > geometry.width + 200, `${width}/${route}: actual horizontal overflow ${JSON.stringify(geometry)}`);
      assert.equal(geometry.overflow, 'auto');
      assert.ok(geometry.chipWidth >= 18, 'readable notes');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no page overflow');
      await board.scrollIntoViewIfNeeded();
      const rect = await board.boundingBox();
      if (touch) {
        const cdp = await page.context().newCDPSession(page);
        const startX = Math.min(width - 20, rect.x + rect.width - 25);
        const endX = Math.max(rect.x + 25, startX - 180);
        const y = Math.min(height - 150, rect.y + Math.min(50, rect.height / 2));
        assert.ok(await board.evaluate((element, point) => element.contains(document.elementFromPoint(point.x, point.y)), { x: startX, y }), 'touch starts on the board, outside fixed navigation');
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y }] });
        for (let step = 1; step <= 10; step += 1) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: startX + (endX - startX) * step / 10, y }] });
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(1000);
        await cdp.detach();
      } else {
        await page.mouse.move(rect.x + rect.width - 35, rect.y + rect.height / 2);
        await page.mouse.down();
        await page.mouse.move(rect.x + rect.width - 215, rect.y + rect.height / 2, { steps: 10 });
        await page.mouse.up();
      }
      assert.ok(await board.evaluate(element => element.scrollLeft) > 60, `${width}/${route}: swipe pans the instrument`);
      assert.match(await controls.nth(2).innerText(), /전체/, 'swiping does not change the position');
      await board.focus();
      await page.keyboard.press('End');
      assert.ok(await board.evaluate(element => element.scrollLeft >= element.scrollWidth - element.clientWidth - 1), 'fret 24 can be reached');
      await page.screenshot({ path: `${out}/${width}-${route}-end.png` });
      await page.keyboard.press('Home');
      assert.equal(await board.evaluate(element => element.scrollLeft), 0);
      await page.screenshot({ path: `${out}/${width}-${route}.png` });
      await choose(1, 'Major Scale');
      if (route === 'stage2') {
        await page.locator('button:visible').filter({ hasText: /^PLAY$/ }).click();
        await page.waitForTimeout(700);
        await page.locator('button:visible').filter({ hasText: /^STOP$/ }).click();
      }
      await choose(2, route === 'stage2' ? 'BOX' : 'BOX1');
      assert.doesNotMatch(await board.getAttribute('class'), /scaleAllPositionsFretboard/);
      assert.match(await board.getAttribute('class'), /fitRange/);
      if (route === 'stage2') {
        await nav.locator('button').last().click();
        assert.match(await nav.innerText(), /BOX\s*2\s*\/\s*5/);
      }
      await choose(2, '으뜸음 · 1옥타브');
      assert.doesNotMatch(await board.getAttribute('class'), /scaleAllPositionsFretboard/);
      assert.deepEqual(errors, []);
      results.push({ width, route, geometry, errors });
      console.log(JSON.stringify(results.at(-1)));
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
