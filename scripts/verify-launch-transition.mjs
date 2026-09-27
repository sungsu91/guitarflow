// Run against npm run preview. Chromium emulates native safe-area env() values;
// desktop WebKit verifies the animation lifecycle, not an actual iOS home bar.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine = process.env.LAUNCH_BROWSER || 'chromium';
const base = process.env.LAUNCH_TEST_URL || 'http://127.0.0.1:4193';
const out = process.env.LAUNCH_OUTPUT || `artifacts/launch-bottom-20260927/${engine}`;
await mkdir(out, { recursive: true });
const browser = await (engine === 'webkit' ? webkit : chromium).launch({
  headless: true, ...(engine === 'chromium' ? { channel: 'msedge' } : {}),
});
const profiles = [
  { name: 'phone-light', width: 390, height: 844 },
  { name: 'phone-dark', width: 390, height: 844, theme: 'brand' },
  { name: 'slow-resize', width: 390, height: 844, delay: 2200, cpu: 4, resize: true },
  { name: 'landscape', width: 844, height: 390 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'reduced-motion', width: 390, height: 844, reduced: true },
  { name: 'animation-disabled', width: 390, height: 844, disabled: true },
];
const results = [];
let page;
try {
  for (const profile of profiles) {
    if (process.env.LAUNCH_PROFILES && !process.env.LAUNCH_PROFILES.split(',').includes(profile.name)) continue;
    const mobile = profile.width < 1024;
    page = await browser.newPage({
      viewport: { width: profile.width, height: profile.height },
      isMobile: mobile, hasTouch: mobile, reducedMotion: profile.reduced ? 'reduce' : 'no-preference',
    });
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (engine === 'chromium') {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: mobile
        ? { top: profile.height > profile.width ? 59 : 0, bottom: 34, left: 0, right: 0 }
        : { top: 0, bottom: 0, left: 0, right: 0 } });
      if (profile.cpu) await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
    }
    if (profile.delay) await page.route('**/AppRuntime-*.js', async route => {
      await new Promise(resolve => setTimeout(resolve, profile.delay));
      await route.continue();
    });
    await page.addInitScript(({ theme, disabled }) => {
      localStorage.setItem('rifflabThemeMode', theme || 'light');
      window.__launch = { samples: [], ends: [], stop: false };
      document.addEventListener('animationend', event => {
        if (event.animationName === 'launchBackdropOut') {
          window.__launch.ends.push({ t: performance.now(), opacity: getComputedStyle(event.target).opacity });
        }
      }, true);
      function sample(t) {
        const splash = document.querySelector('.launchSplash');
        if (disabled && splash) splash.style.setProperty('animation', 'none', 'important');
        const lock = document.documentElement.matches('.app-is-launching, .app-is-theme-loading');
        const runtime = document.querySelector('.appRuntime');
        if (splash) {
          const rect = splash.getBoundingClientRect();
          const bg = element => element && getComputedStyle(element).background;
          window.__launch.samples.push({
            t, phase: splash.className, rect: rect.toJSON(), width: innerWidth, height: innerHeight,
            lock, inert: runtime?.inert, opacity: getComputedStyle(splash).opacity,
            htmlBg: bg(document.documentElement), bodyBg: bg(document.body), rootBg: bg(document.getElementById('root')),
          });
        }
        if (!window.__launch.stop) requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
      window.__restartLaunchSamples = () => {
        window.__launch = { samples: [], ends: [], stop: false };
        requestAnimationFrame(sample);
      };
    }, profile);
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('.launchSplash').waitFor();
    if (profile.resize) {
      for (const height of [740, 844]) { await page.setViewportSize({ width: 390, height }); await page.waitForTimeout(100); }
    }
    await page.locator('main.app').first().waitFor({ state: 'attached' });
    if (await page.locator('.launchSplash').count()) await page.screenshot({ path: `${out}/${profile.name}-loading.png` });
    await page.locator('.launchSplash').waitFor({ state: 'detached' });
    const result = await page.evaluate(() => {
      window.__launch.stop = true;
      return {
        ...window.__launch,
        locked: document.documentElement.classList.contains('app-is-launching'),
        inert: document.querySelector('.appRuntime').inert,
        hidden: document.querySelector('.appRuntime').getAttribute('aria-hidden'),
        bodyBg: getComputedStyle(document.body).background,
      };
    });
    assert.ok(result.samples.length > 2, `${profile.name}: sampled loading frames`);
    for (const s of result.samples) {
      assert.ok(s.rect.top <= 1 && s.rect.bottom >= s.height - 1 && s.rect.width >= s.width - 1, `${profile.name}: complete viewport coverage`);
      assert.equal(s.lock, true);
      assert.equal(s.inert, true);
      for (const key of ['htmlBg', 'bodyBg', 'rootBg']) assert.ok(s[key].startsWith('rgb(2, 2, 2) none'), `${profile.name}: ${key} changed before handoff: ${s[key]}`);
    }
    assert.equal(result.locked, false);
    assert.equal(result.inert, false);
    assert.equal(result.hidden, null);
    assert.notEqual(result.bodyBg, result.samples.at(-1).bodyBg, `${profile.name}: app theme restored`);
    if (!profile.disabled) {
      assert.equal(result.ends.length, 1, `${profile.name}: exactly one completed exit animation`);
      assert.equal(Number(result.ends[0].opacity), 0, `${profile.name}: fully faded before unmount`);
      assert.ok(result.samples.some(s => Number(s.opacity) < 0.8), `${profile.name}: visible intermediate fade frames`);
    } else assert.equal(result.ends.length, 0, 'fallback releases a splash whose animation was disabled');
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `${out}/${profile.name}-loaded.png` });
    await writeFile(`${out}/${profile.name}.json`, JSON.stringify(result, null, 2));
    const summary = { profile: profile.name, nativeInsets: engine === 'chromium', samples: result.samples.length, completedAnimations: result.ends.length };
    if (profile.name === 'phone-light') {
      // Theme changes reuse SplashIntro, so verify both directions as well.
      await page.locator('button[aria-controls="utility-menu-panel"]:visible').click();
      await page.locator('.utilityMenuHeader').getByRole('button', { name: '설정', exact: true }).click();
      for (const theme of ['골드 다크', '화이트']) {
        await page.evaluate(() => window.__restartLaunchSamples());
        await page.getByRole('radio', { name: theme, exact: true }).click();
        await page.locator('.launchSplash--controlled').waitFor();
        await page.locator('.launchSplash').waitFor({ state: 'detached' });
        const transition = await page.evaluate(() => {
          window.__launch.stop = true;
          return { ...window.__launch, locked: document.documentElement.classList.contains('app-is-theme-loading') };
        });
        assert.ok(transition.samples.length > 1);
        assert.equal(transition.ends.length, 1, `${theme}: controlled animation completed`);
        assert.equal(Number(transition.ends[0].opacity), 0);
        assert.equal(transition.locked, false);
        for (const s of transition.samples) {
          for (const key of ['htmlBg', 'bodyBg', 'rootBg']) assert.ok(s[key].startsWith('rgb(2, 2, 2) none'), `${theme}: ${key} remains dark`);
        }
        assert.equal(await page.getByRole('radio', { name: theme, exact: true }).getAttribute('aria-checked'), 'true');
      }
      summary.themeTransitions = 2;
    }
    results.push(summary); console.log(JSON.stringify(summary));
    await page.close();
  }
  await writeFile(`${out}/verification.json`, JSON.stringify(results, null, 2));
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: `${out}/failure.png` });
  throw error;
} finally { await browser.close(); }
