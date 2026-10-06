import { chromium } from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const out = 'work/sound-touch-verification';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const results = [];
async function openMobileSound(page) {
  await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
  await page.getByRole('button', { name: '설정', exact: true }).click();
  await page.locator('.utilitySoundDetails summary').click();
}
async function dragTouch(client, from, to) {
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...from, id: 1 }] });
  for (let i = 1; i <= 10; i++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
      x: from.x + (to.x - from.x) * i / 10, y: from.y + (to.y - from.y) * i / 10, id: 1,
    }] });
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
try {
  for (const width of [390, 360, 1024]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:5173/#metronome');
    await page.locator('.launchSplash').waitFor({ state: 'hidden', timeout: 60000 });
    await openMobileSound(page);
    const ranges = page.locator('.utilitySoundSliders input[type="range"]');
    assert.equal(await ranges.count(), 5);
    const client = await page.context().newCDPSession(page);
    const values = [];
    for (let index = 0; index < 5; index++) {
      const input = ranges.nth(index);
      await input.scrollIntoViewIfNeeded();
      assert.equal(await input.evaluate(el => getComputedStyle(el).touchAction), 'none');
      await input.evaluate(el => { window.dragValues = []; el.addEventListener('input', () => window.dragValues.push(Number(el.value))); });
      let box = await input.boundingBox();
      const initial = Number(await input.inputValue());
      const y = box.y + box.height / 2;
      const scroll = await page.locator('.utilitySettingsBody').evaluate(el => el.scrollTop);
      const pageY = await page.evaluate(() => window.scrollY);
      // Start on the thumb, then reverse from the track with slight vertical drift.
      await dragTouch(client, { x: box.x + 8 + (box.width - 16) * initial / 100, y }, { x: box.x + box.width - 12, y: y + 5 });
      assert.ok(Number(await input.inputValue()) >= 90);
      await dragTouch(client, { x: box.x + box.width * .72, y }, { x: box.x + 8 + (box.width - 16) * .23, y: y - 4 });
      const value = Number(await input.inputValue());
      assert.ok(value >= 20 && value <= 26, `range ${index}: ${value}`);
      assert.ok((await page.evaluate(() => window.dragValues)).length >= 6, 'must update continuously during the drag');
      assert.equal(await input.locator('..').locator('b').textContent(), String(value));
      assert.equal(await page.locator('.utilitySettingsBody').evaluate(el => el.scrollTop), scroll);
      assert.equal(await page.evaluate(() => window.scrollY), pageY);
      values.push(String(value));
    }
    await page.screenshot({ path: `${out}/mobile-${width}.png` });
    await page.getByRole('button', { name: '설정 닫기', exact: true }).click();
    await page.locator('#utility-menu-panel').getByRole('button', { name: '메뉴 닫기', exact: true }).click();
    await page.reload();
    await page.locator('.launchSplash').waitFor({ state: 'hidden', timeout: 60000 });
    await openMobileSound(page);
    assert.deepEqual(await ranges.evaluateAll(inputs => inputs.map(input => input.value)), values);
    assert.deepEqual(errors, []);
    results.push({ width, values, continuousTouchDrag: true, preservedAfterReload: true, backgroundStayedStill: true });
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173/#metronome');
  await page.locator('.launchSplash').waitFor({ state: 'hidden', timeout: 60000 });
  await page.locator('.desktopSoundSettingsTrigger').click();
  const ranges = page.locator('.desktopSoundSettingsPanel input[type="range"]');
  assert.equal(await ranges.count(), 5);
  for (const input of await ranges.all()) {
    const box = await input.boundingBox();
    const value = Number(await input.inputValue());
    await page.mouse.move(box.x + 8 + (box.width - 16) * value / 100, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 8 + (box.width - 16) * .35, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    assert.ok(Number(await input.inputValue()) >= 32 && Number(await input.inputValue()) <= 38);
    await input.focus();
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight');
    assert.equal(await input.inputValue(), '1');
  }
  await page.screenshot({ path: `${out}/desktop.png` });
  results.push({ desktopMouseAndKeyboard: true });
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
