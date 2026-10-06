import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chooseInstrument } from './instrument-dropdown-helpers.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SHOOTER_TEST_URL || 'http://127.0.0.1:5173';
const dir = 'work/shooter-scenario-guidance';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome', args: [
  '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
] });
const profiles = [
  ['bass-4', 'E1'], ['guitar-6', 'E2'], ['guitar-7', 'B1'], ['bass-5', 'B0'],
  ['bass-6', 'B0'], ['ukulele-high-g', 'C4'], ['ukulele-low-g', 'G3'],
];
const reports = [];
try {
  for (const [name, width, height, userAgent] of [
    ['desktop', 1920, 1080, ''], ['phone', 390, 844, 'iPhone Mobile'],
    ['tablet', 1024, 1366, 'iPad Safari'], ['tablet-split', 507, 1180, 'iPad Safari'],
    ['tablet-landscape', 1280, 800, 'Android Tablet'], ['desktop-small', 1280, 800, ''],
  ].filter(device => !process.argv[2] || device[0] === process.argv[2])) {
    const page = await browser.newPage({ viewport: { width, height }, ...(userAgent ? { userAgent, isMobile: true, hasTouch: true } : {}) });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('fretiva-desktop-shooter-map-v1', 'silk-theatre'));
    let design;
    for (const [id, pitch] of profiles.filter(profile => !process.argv[3] || profile[0] === process.argv[3])) {
      try {
        await page.goto(`${base}/?guidance=${id}#shooter`);
        await page.locator('.launchSplash').waitFor({ state: 'hidden' });
        const trigger = page.locator(userAgent ? '.shooterInstrumentHud .instrumentDropdownTrigger' : '.dsSession .shooterInstrumentSelect .instrumentDropdownTrigger');
        await chooseInstrument(page, trigger, id);
        await page.locator(userAgent ? '.shooterStartPanelButton--primary' : '.dsStartGameButton').click();
        const guidance = page.locator('.shooterScenarioGuidance');
        await guidance.waitFor({ timeout: 20000 });
        assert.equal(await guidance.count(), 1, 'one announcement at a time');
        assert.equal(await page.locator('.mobileShooterTargetHud, .dsTarget:not(.dsTarget--preparing)').count(), 0, 'waiting HUD is not mounted over the announcement');
        const measured = await guidance.evaluate(el => {
          const rect = node => node.getBoundingClientRect().toJSON();
          const children = [...el.children];
          return {
            title: el.querySelector('h2').textContent,
            description: el.querySelector('p')?.textContent,
            count: el.querySelector('b').textContent,
            bounds: rect(el), children: children.map(rect),
            styles: children.map(node => {
              const css = getComputedStyle(node);
              return [css.color, css.fontSize, css.lineHeight, css.backgroundColor];
            }),
            obstructions: [...document.querySelectorAll('.dsHeader, .dsInput, .dsSession, .mobileShooterScoreHud, .shooterPitchMonitorMobile')]
              .filter(node => node.getClientRects().length && getComputedStyle(node).display !== 'none')
              .map(node => ({ name: node.className, bounds: rect(node) })),
          };
        });
        assert.ok(measured.title && measured.description);
        assert.notEqual(measured.title, measured.description, 'description should explain the exercise');
        assert.match(measured.count, /^[123]$/);
        assert.equal(measured.styles[2][0], 'rgb(255, 243, 215)', 'countdown stays readable in the light app theme');
        if (design) assert.deepEqual(measured.styles, design, 'instrument changes preserve typography and colors');
        else design = measured.styles;
        for (let i = 1; i < measured.children.length; i++) {
          assert.ok(measured.children[i].top >= measured.children[i - 1].bottom, 'announcement lines do not overlap');
        }
        assert.ok(measured.bounds.left >= 0 && measured.bounds.right <= width + 1, 'announcement fits the viewport');
        assert.ok(measured.bounds.top >= 0 && measured.bounds.bottom <= height + 1);
        for (const { name: obstacle, bounds } of measured.obstructions) {
          const a = measured.bounds;
          assert.ok(a.right <= bounds.left || a.left >= bounds.right || a.bottom <= bounds.top || a.top >= bounds.bottom,
            `announcement overlaps ${obstacle}`);
        }
        if (id === 'bass-4' || id === 'guitar-6') await page.screenshot({ path: `${dir}/${name}-${id}.png` });
        const target = page.locator('.shooterEnemy--currentTarget');
        await target.waitFor({ timeout: 20000 });
        assert.ok((await target.getAttribute('aria-label')).includes(pitch), `${id} retains its first target ${pitch}`);
        assert.equal(await guidance.count(), 0);
        await page.locator(userAgent ? '.mobileShooterTargetHud' : '.dsTarget:not(.dsTarget--preparing)').waitFor();
        assert.deepEqual(errors, []);
        const broken = await page.evaluate(() => [...document.images].filter(img => img.getClientRects().length && img.complete && !img.naturalWidth).map(img => img.src));
        assert.deepEqual(broken, []);
        reports.push({ name, id, pass: true, measured });
        console.log('PASS', name, id);
      } catch (error) {
        await page.screenshot({ path: `${dir}/${name}-${id}-failure.png` });
        reports.push({ name, id, pass: false, error: String(error), errors });
        console.log('FAIL', name, id, String(error));
      }
    }
    await page.close();
  }
} finally { await browser.close(); }
await writeFile(`${dir}/report-${process.argv.slice(2).join('-') || 'all'}.json`, JSON.stringify(reports, null, 2));
if (reports.some(report => !report.pass)) process.exitCode = 1;
