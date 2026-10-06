import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// PLAYWRIGHT_MODULE may point to the workspace's bundled Playwright runtime.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
const base = process.env.APP_URL || 'http://127.0.0.1:5173/';
const out = process.env.CHECK_OUTPUT || 'work/mobile-training-clearance';
await mkdir(out, { recursive: true });
const report = [];
const errors = [];
const panels = {
  stage1: '.firstPositionTrainingPanel',
  stage2: '.scaleBlockTrainingPanel',
  metronome: 'main.metronomeMode > .standaloneMetronomePanel',
};

async function route(page, mode) {
  await page.evaluate(mode => { location.hash = mode; }, mode);
  await page.locator(`${panels[mode] || '.pdfStudio'}:visible`).waitFor();
  // Includes the prepared, hidden score reader that triggered the regression.
  await page.locator('.pdfStudio').waitFor({ state: 'attached' });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function checkActions(page, mode, name) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(120);
  const actions = page.locator(`${panels[mode]}:visible ${mode === 'stage1' ? '.rhythmSettings' : '.backingLoopMainControls'}:visible`);
  await actions.waitFor();
  if (page.viewportSize().width > page.viewportSize().height) await actions.scrollIntoViewIfNeeded();
  const bounds = await actions.evaluate(e => {
    const nav = document.querySelector('.integratedBottomNav');
    return {
      actions: e.getBoundingClientRect().toJSON(),
      nav: nav?.getBoundingClientRect().toJSON(),
      width: innerWidth, height: innerHeight, scrollY,
      buttons: [...e.querySelectorAll('button')].map(b => {
        const r = b.getBoundingClientRect();
        return { label: b.textContent, rect: r.toJSON(), hit: b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) };
      }),
    };
  });
  assert(bounds.actions.top >= 0, `${name}/${mode}: action row above viewport`);
  assert(bounds.actions.bottom <= bounds.height, `${name}/${mode}: action row below viewport`);
  if (bounds.width < bounds.height) {
    assert(bounds.actions.bottom <= bounds.nav.top - 5, `${name}/${mode}: buttons covered by navigation`);
  }
  assert.equal(bounds.buttons.length, 4, `${name}/${mode}: complete backing action row`);
  assert(bounds.buttons.every(b => b.hit), `${name}/${mode}: action hit targets unobstructed`);
  assert(bounds.buttons.every(b => b.rect.left >= 0 && b.rect.right <= bounds.width), `${name}/${mode}: buttons fit width`);
  await actions.locator('button').first().click({ trial: true });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}/${mode}: horizontal overflow`);
  report.push({ name, mode, ...bounds });
}

try {
  for (const theme of ['light', 'brand']) {
    const page = await browser.newPage({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(theme => {
      localStorage.setItem('rifflabThemeMode', theme);
      localStorage.setItem('language', 'ko');
    }, theme);
    await page.goto(`${base}#stage2`);
    await page.locator('.launchSplash').waitFor({ state: 'detached' });
    for (const [width, height] of [[320,568],[360,640],[360,800],[375,667],[393,852],[412,915],[430,932]]) {
      await page.setViewportSize({ width, height });
      for (const mode of Object.keys(panels)) {
        await route(page, mode);
        await checkActions(page, mode, `${theme}-${width}x${height}`);
        if (width === 360 && height === 800 && mode === 'stage2') {
          await page.screenshot({ path: `${out}/${theme}-a55-bottom.png` });
        }
      }
    }
    // A visible score reader retains its layout; leaving it restores nav clearance.
    await page.setViewportSize({ width: 360, height: 800 });
    await route(page, 'etudes');
    assert.equal(await page.locator('.mobileLayoutShell main.app').evaluate(e => getComputedStyle(e).paddingBottom), '12px');
    await route(page, 'stage2');
    await checkActions(page, 'stage2', `${theme}-return-from-score`);

    // Real touch input, not just programmatic scrolling, must reach the last row.
    await page.evaluate(() => scrollTo(0, 0));
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 345, y: 650 }] });
    for (let y = 630; y >= 330; y -= 30) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 345, y }] });
      await page.waitForTimeout(20);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(250);
    assert(await page.evaluate(() => scrollY > 50), 'touch swipe scrolls the page');

    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 59, bottom: 34 } });
    for (const height of [640,800,700,800]) {
      await page.setViewportSize({ width: 360, height });
      await checkActions(page, 'stage2', `${theme}-safe-area-${height}`);
    }
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, bottom: 0 } });
    for (const [width,height] of [[568,320],[667,375],[800,360],[844,390]]) {
      await page.setViewportSize({ width, height });
      for (const mode of Object.keys(panels)) {
        await route(page, mode);
        await checkActions(page, mode, `${theme}-landscape-${width}`);
        if (mode === 'stage2' && height === 320) {
          const deck = page.locator('.scaleBlockTrainingPanel:visible .referenceStandaloneMetronomeDeck');
          await deck.evaluate(e => { e.scrollTop = 0; });
          const r = await deck.boundingBox();
          const x = r.x + r.width - 3;
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: r.y + r.height - 20 }] });
          for (let delta = 30; delta <= 180; delta += 30) {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: r.y + r.height - 20 - delta }] });
            await page.waitForTimeout(20);
          }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await page.waitForTimeout(250);
          assert(await deck.evaluate(e => e.scrollTop > 0), 'short landscape control column accepts touch scrolling');
          await page.screenshot({ path: `${out}/${theme}-short-landscape.png` });
        }
      }
    }
    await page.setViewportSize({ width: 360, height: 800 });
    await route(page, 'stage2');
    await checkActions(page, 'stage2', `${theme}-rotated-back`);
    await page.close();
    console.log(`PASS ${theme}: portrait sizes, score navigation, touch scrolling, safe areas and rotation`);
  }
  // The phone-only rule must leave tablet/desktop compositions unchanged.
  for (const [width,height,mobile] of [[820,1180,true],[1440,900,false]]) {
    const page = await browser.newPage({ viewport: { width,height }, isMobile: mobile, hasTouch: mobile });
    await page.goto(`${base}#stage2`);
    await page.locator('.launchSplash').waitFor({ state: 'detached' });
    await route(page, 'stage2');
    const geometry = () => page.locator('main.practiceMode').evaluate(e => [e,...e.querySelectorAll('.referenceTrainingPanel,.referenceTrainingBoard,.referenceTrainingToolbar,.backingLoopMainControls')].map(n => n.getBoundingClientRect().toJSON()));
    const fixed = await geometry();
    const legacy = await page.addStyleTag({ content: '@layer tablet-layout { html[data-rifflab-device="mobile"] main.app:has(> .pdfStudio--mobile) { padding-bottom:max(12px,env(safe-area-inset-bottom,0px))!important;row-gap:0!important; } }' });
    assert.deepEqual(await geometry(), fixed, `${width}: unchanged tablet/desktop geometry`);
    await legacy.evaluate(e => e.remove());
    await page.screenshot({ path: `${out}/regression-${width}.png` });
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(`PASS ${report.length} action visibility checks; desktop/tablet regression checks`);
} finally {
  await browser.close();
}
