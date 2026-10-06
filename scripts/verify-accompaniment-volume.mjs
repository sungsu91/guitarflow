import { chromium } from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const out = 'work/accompaniment-volume';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    if (!localStorage.getItem('fretiva-accompaniment-volume-v1')) {
      localStorage.setItem('fretiva-accompaniment-volume-v1', '1.65');
    }
    window.audioConnections = [];
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (destination, ...args) {
      window.audioConnections.push({ source: this, destination });
      return connect.call(this, destination, ...args);
    };
    window.accompanimentMaster = () => window.audioConnections.find(({ source, destination }) =>
      source instanceof GainNode && destination instanceof DynamicsCompressorNode && destination.threshold.value === -2.5,
    )?.source;
  });
  await page.goto('http://localhost:5173/#metronome');
  await page.locator('.launchSplash').waitFor({ state: 'hidden', timeout: 60000 });
  await page.locator('.desktopSoundSettingsTrigger').click();
  const panel = page.locator('.desktopSoundSettingsPanel');
  const master = panel.locator('[data-accompaniment-volume]');
  assert.equal(await master.inputValue(), '165');
  assert.equal(await master.evaluate(el => el.style.getPropertyValue('--sound-volume')), '82.5%');
  // A harmless key warms the real graph without changing the saved master setting.
  await master.focus();
  await page.keyboard.press('Shift');
  await page.waitForFunction(() => window.accompanimentMaster(), { timeout: 60000 });
  const initialGain = await page.evaluate(() => window.accompanimentMaster().gain.value);
  assert.ok(Math.abs(initialGain - 1.65) < .001, 'new graph must use the saved master gain');
  const otherGains = () => page.evaluate(() => window.audioConnections
    .filter(({ source }) => source instanceof GainNode && source !== window.accompanimentMaster())
    .map(({ source }) => source.gain.value));
  const unchangedGains = await otherGains();
  const partsBefore = await panel.locator('[data-backing-volume-part]').evaluateAll(inputs => inputs.map(el => el.value));
  for (const [key, value] of [['Home', 0], ['End', 200], ['ArrowLeft', 199]]) {
    await master.press(key);
    await page.waitForFunction(value => Math.abs(window.accompanimentMaster().gain.value - value / 100) < .002, value);
    assert.equal(await master.inputValue(), String(value));
    assert.equal(await master.getAttribute('aria-valuetext'), `${value}%`);
    assert.deepEqual(await otherGains(), unchangedGains, 'master must not change individual instruments or other buses');
  }
  assert.deepEqual(await panel.locator('[data-backing-volume-part]').evaluateAll(inputs => inputs.map(el => el.value)), partsBefore);
  const limiter = await page.evaluate(() => {
    const { destination } = window.audioConnections.find(({ source }) => source === window.accompanimentMaster());
    return { threshold: destination.threshold.value, ratio: destination.ratio.value,
      connected: window.audioConnections.some(({ source }) => source === destination) };
  });
  assert.deepEqual(limiter, { threshold: -2.5, ratio: 20, connected: true });
  await page.reload();
  await page.locator('.launchSplash').waitFor({ state: 'hidden', timeout: 60000 });
  await page.locator('.desktopSoundSettingsTrigger').click();
  assert.equal(await master.inputValue(), '199');
  await panel.getByRole('button', { name: '사운드 초기화', exact: true }).click();
  assert.equal(await master.inputValue(), '100');
  assert.deepEqual(await panel.locator('[data-backing-volume-part]').evaluateAll(inputs => inputs.map(el => el.value)), ['70', '55', '60']);
  await master.focus();
  await page.keyboard.press('Shift');
  await page.waitForFunction(() => window.accompanimentMaster() && Math.abs(window.accompanimentMaster().gain.value - 1) < .002);
  await page.screenshot({ path: `${out}/desktop.png` });
  assert.deepEqual(errors, []);
  const result = { savedGainAtCreation: initialGain, liveMuteAndBoost: true, individualMixPreserved: true,
    otherBusesPreserved: true, limiter, reloadAndReset: true, defaultGain: 1, previousDefaultGain: .78,
    nominalDefaultIncreaseDb: 20 * Math.log10(1 / .78) };
  await writeFile(`${out}/results.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
