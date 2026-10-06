import { chromium } from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const out = 'work/sound-opening';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const results = [];

async function watchOpening(page, selector, open) {
  await page.evaluate(selector => {
    const panel = document.querySelector(selector);
    window.soundOpeningFrames = [];
    window.stopSoundOpeningFrames = false;
    const sample = () => {
      if (panel.matches(':popover-open') || panel.hasAttribute('open')) {
        const rect = panel.getBoundingClientRect();
        window.soundOpeningFrames.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height,
          controls: [...panel.querySelectorAll('input[type=range], .soundSettingsFooter')].map(el => {
            const r = el.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          }),
        });
      }
      if (!window.stopSoundOpeningFrames) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, selector);
  await open();
  await page.waitForTimeout(350);
  const frames = await page.evaluate(() => { window.stopSoundOpeningFrames = true; return window.soundOpeningFrames; });
  assert.ok(frames.length > 1, 'capture the first visible frame and subsequent frames');
  for (const frame of frames) {
    assert.deepEqual(frame, frames[0], 'panel and controls must be at their final geometry on the first visible frame');
  }
  return { frames: frames.length, first: frames[0] };
}

try {
  for (const [name, width, height, mobile] of [
    ['desktop', 1440, 900, false], ['short-desktop', 1024, 600, false],
    ['phone', 390, 844, true], ['tablet', 1024, 1366, true],
  ]) {
    for (const theme of ['light', 'brand']) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile,
        ...(name === 'tablet' ? { userAgent: 'iPad Safari' } : {}),
      });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(theme => localStorage.setItem('rifflabThemeMode', theme), theme);
      await page.goto('http://localhost:5173/#metronome');
      await page.locator('.launchSplash').waitFor({ state: 'hidden', timeout: 60000 });
      if (mobile) {
        await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
        await page.getByRole('button', { name: '설정', exact: true }).click();
      }
      const selector = mobile ? '.utilitySoundDetails' : '.desktopSoundSettingsPanel';
      const panel = page.locator(selector);
      const trigger = page.locator(mobile ? '.utilitySoundDetails summary' : '.desktopSoundSettingsTrigger');
      await trigger.scrollIntoViewIfNeeded();
      const firstOpen = await watchOpening(page, selector, () => trigger.click());
      if (!mobile) {
        const rail = await page.locator('.desktopSidebar').boundingBox();
        assert.ok(firstOpen.first.x >= rail.x + rail.width + 9);
        assert.ok(firstOpen.first.y >= 11);
        assert.ok(firstOpen.first.y + firstOpen.first.height <= height - 11);
        await panel.locator('input[type=range]').first().focus();
        await page.keyboard.press('Escape');
        await panel.waitFor({ state: 'hidden' });
        assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
        await watchOpening(page, selector, () => page.keyboard.press('Enter'));
        await trigger.click();
        await panel.waitFor({ state: 'hidden' });
        await watchOpening(page, selector, () => trigger.click());
        await page.mouse.click(width - 8, 8);
        await panel.waitFor({ state: 'hidden' });
        await trigger.click();
        await panel.getByRole('button', { name: '닫기', exact: true }).click();
        await panel.waitFor({ state: 'hidden' });
      } else {
        await trigger.click();
        assert.equal(await panel.getAttribute('open'), null);
        await watchOpening(page, selector, () => trigger.click());
      }
      assert.deepEqual(errors, []);
      results.push({ name, theme, ...firstOpen });
      console.log(`${name} ${theme}: first frame stable; close/reopen passed`);
      await page.close();
    }
  }
  await writeFile(`${out}/after.json`, JSON.stringify(results, null, 2));
} finally { await browser.close(); }
