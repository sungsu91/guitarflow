import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const base = process.env.BACKING_TEST_URL || 'http://127.0.0.1:5175';
const output = 'work/backing-fold-verification';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const results = [];
try {
  for (const width of (process.env.BACKING_TEST_WIDTHS || '412,1440').split(',').map(Number)) {
    const page = await browser.newPage({ viewport: { width, height: 968 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && /application chunk failed|Rendered more hooks|Rendered fewer hooks/.test(message.text())) errors.push(message.text());
    });
    await page.addInitScript(() => {
      window.backingTestSources = [];
      window.backingTestMedia = new Set();
      window.backingTestPeak = 0;
      window.measureBackingPeak = () => {
        const buffers = window.backingTestSources.filter(item => item.node.buffer?.duration > 6 && !item.stops).length;
        const media = [...window.backingTestMedia].filter(item => !item.paused).length;
        window.backingTestPeak = Math.max(window.backingTestPeak, buffers + media);
      };
      const mediaPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (...args) {
        window.backingTestMedia.add(this);
        return mediaPlay.apply(this, args).then(() => { window.measureBackingPeak(); });
      };
      const start = AudioBufferSourceNode.prototype.start;
      const stop = AudioBufferSourceNode.prototype.stop;
      AudioBufferSourceNode.prototype.start = function (...args) {
        if (this.context instanceof AudioContext) window.backingTestSources.push({ node: this, stops: 0 });
        window.measureBackingPeak();
        return start.apply(this, args);
      };
      AudioBufferSourceNode.prototype.stop = function (...args) {
        const entry = window.backingTestSources.find(item => item.node === this);
        if (entry) entry.stops++;
        return stop.apply(this, args);
      };
    });
    try {
      await page.goto(`${base}/#rhythm-trainer`);
      await page.waitForFunction(() => !document.documentElement.classList.contains('app-is-launching'));
      await page.locator('.rt-card').first().waitFor();
      const panel = page.locator('.backingDockPanel');
      const edge = page.locator('.backingDockEdge');
      const launcher = page.getByRole('button', {name:'백킹루프',exact:true});
      assert.equal(await panel.count(), 0);
      assert.equal(await edge.count(), 0);
      await launcher.click();
      await panel.waitFor();
      await page.waitForTimeout(180);
      assert.equal(await edge.count(), 0);
      const initialPanel = await panel.boundingBox();
      await page.screenshot({path:`${output}/library-open-${width}.png`});
      await page.getByRole('button', {name:'공통 백킹 패널 접기',exact:true}).click();
      await edge.waitFor();
      assert.equal(await panel.count(), 0);
      assert.equal((await edge.boundingBox()).y, initialPanel.y);
      // Drag the folded control; reopening must use exactly that position.
      const handle = await page.locator('.backingDockHandle').boundingBox();
      await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
      await page.mouse.down();
      await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2 - 90, {steps:6});
      await page.mouse.up();
      assert.equal(await panel.count(), 0);
      const draggedEdge = await edge.boundingBox();
      assert.ok(Math.abs(initialPanel.y - draggedEdge.y - 90) < 2);
      await page.locator('.backingDockHandle').click();
      await panel.waitFor();
      await page.waitForTimeout(180);
      assert.equal((await panel.boundingBox()).y, draggedEdge.y);
      assert.equal(await edge.count(), 0);
      await launcher.click();
      await edge.waitFor();
      await page.screenshot({path:`${output}/library-folded-${width}.png`});
      await page.getByRole('button', {name:'백킹 즉시 정지',exact:true}).click();
      await edge.waitFor({state:'detached'});
      await page.evaluate(() => { location.hash = '#metronome'; });
      await page.evaluate(async () => {
        const { defaults, savePacks } = await import('/src/metronome/groovePackLibrary.js');
        savePacks([{ ...defaults[0], id: 'gapless-test', builtin: false, title: '연속 재생 확인', bpm: 300, createdAt: Date.now() }]);
      });
      const metro = page.locator('.standaloneMetronomePanel');
      await metro.getByRole('button', { name: 'Playlist 열기', exact: true }).click();
      await page.getByRole('button', { name: '그루브팩', exact: true }).click();
      await page.getByRole('button', { name: '내 저장 팩', exact: true }).click();
      await page.getByRole('button', { name: '연속 재생 확인 선택', exact: true }).click();
      await page.getByRole('button', { name: '목록에 연결', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Playlist 닫기', exact: true }).click();
      await page.evaluate(async () => {
        const { loadBackingPlaylistState, saveBackingPlaylistState } = await import('/src/backing-loop/backingPlaylist.js');
        saveBackingPlaylistState({ ...loadBackingPlaylistState(), playbackMode: 'repeat-all' });
      });
      await metro.getByRole('button', { name: '백킹 재생', exact: true }).click();
      await metro.getByRole('button', { name: '백킹 일시정지', exact: true }).waitFor();
      await page.evaluate(() => {
        window.backingTestOriginal = window.backingTestSources.find(item => item.node.buffer?.duration > 6);
        if (!window.backingTestOriginal?.node.loop) throw Error('Groove is not using native buffer looping');
        window.backingTestStarted = window.backingTestOriginal.node.context.currentTime;
      });
      assert.equal(await page.locator('audio.backingLoopAudio').count(), 2);
      await page.evaluate(() => { location.hash = '#rhythm-trainer'; });
      await page.locator('.rt-card').first().click();
      await page.getByRole('button', { name: '백킹루프', exact: true }).click();
      await panel.getByRole('button', { name: '백킹 일시정지', exact: true }).waitFor();
      assert.equal(await edge.count(), 0);
      await page.waitForTimeout(300);
      const bounds = await panel.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, JSON.stringify(bounds));
      await page.screenshot({ path: `${output}/rhythm-${width}.png` });
      // Collapse and reopen from the toolbar must never reset or pause audio.
      await page.getByRole('button', { name: '백킹루프', exact: true }).click();
      await panel.waitFor({ state: 'detached' });
      await page.getByRole('button', { name: '백킹루프', exact: true }).click();
      await panel.getByRole('button', { name: '백킹 일시정지', exact: true }).waitFor();
      // Practice transport runs independently alongside the backing.
      await page.getByRole('button', { name: /BPM · 연습 시작/ }).click();
      await page.getByRole('button', { name: '일시정지', exact: true }).waitFor();
      await page.evaluate(() => { location.hash = '#etudes'; });
      await page.locator('.etudeStudio').waitFor();
      await page.getByRole('button', { name: '백킹루프', exact: true }).click();
      await panel.getByRole('button', { name: '백킹 일시정지', exact: true }).waitFor();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${output}/score-${width}.png` });
      await page.waitForFunction(() => {
        const original = window.backingTestOriginal;
        return original.node.context.currentTime - window.backingTestStarted > original.node.buffer.duration * 2 + .2;
      }, null, { timeout: 20000 });
      const continuity = await page.evaluate(() => ({
        stops: window.backingTestOriginal.stops,
        bufferSources: window.backingTestSources.filter(item => item.node.buffer?.duration > 6).length,
        duration: window.backingTestOriginal.node.buffer.duration,
        elapsed: window.backingTestOriginal.node.context.currentTime - window.backingTestStarted,
      }));
      assert.equal(continuity.stops, 0);
      assert.equal(continuity.bufferSources, 1);
      await panel.getByRole('button', { name: '백킹 일시정지', exact: true }).click();
      await page.waitForTimeout(80);
      assert.equal(await page.evaluate(() => window.backingTestOriginal.stops), 1);
      await panel.getByRole('button', { name: '백킹 재생', exact: true }).click();
      await panel.getByRole('button', { name: '백킹 일시정지', exact: true }).waitFor();
      assert.equal(await page.locator('audio.backingLoopAudio').count(), 2);
      const seam = await page.evaluate(async () => {
        const { createGrooveBufferPlayback } = await import('/src/backing-loop/grooveBufferPlayback.js');
        const frames = 4096, cycles = 4, rate = 44100;
        const context = new OfflineAudioContext(1, frames * cycles, rate);
        const buffer = context.createBuffer(1, frames, rate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < frames; i++) samples[i] = .4 * Math.sin(2 * Math.PI * i / 256);
        const player = createGrooveBufferPlayback({ context, buffer, output: context.destination });
        player.loop = true;
        await player.play();
        const actual = (await context.startRendering()).getChannelData(0);
        let maxError = 0;
        for (let i = 0; i < actual.length; i++) maxError = Math.max(maxError, Math.abs(actual[i] - samples[i % frames]));
        player.dispose();
        return { cycles, frames: actual.length, maxError };
      });
      assert.ok(seam.maxError < 1e-7);
      // One edge control remains available even on rooms without a backing UI.
      await page.evaluate(() => { location.hash = '#fretboard'; });
      await page.locator('.backingDockEdge.is-playing').waitFor();
      assert.equal(await page.locator('.backingDockEdge').count(), 1);
      const edgeBefore = await page.locator('.backingDockEdge').boundingBox();
      await page.locator('.backingDockHandle').focus();
      await page.keyboard.press('ArrowUp');
      const edgeAfter = await page.locator('.backingDockEdge').boundingBox();
      assert.equal(edgeBefore.y - edgeAfter.y, 24);
      await page.locator('.backingDockHandle').click();
      const dock = page.locator('.backingDockPanel');
      await dock.getByRole('button', {name:'백킹 일시정지',exact:true}).waitFor();
      await page.screenshot({path:`${output}/global-dock-${width}.png`});
      await dock.getByRole('button', {name:'백킹 일시정지',exact:true}).click();
      await dock.getByRole('button', {name:'백킹 재생',exact:true}).waitFor();
      assert.equal(await edge.count(), 0);
      await dock.getByRole('button', {name:'백킹 재생',exact:true}).click();
      await dock.getByRole('button', {name:'백킹 일시정지',exact:true}).waitFor();
      await page.getByRole('button', {name:'공통 백킹 패널 접기',exact:true}).click();
      await dock.waitFor({state:'detached'});
      await page.evaluate(() => { location.hash = '#rhythm-trainer'; });
      await page.locator('.rt-card').first().waitFor();
      assert.equal(await page.locator('.etudeBackingHandle').count(), 0);
      await page.locator('.rt-card').first().click();
      await page.screenshot({path:`${output}/rhythm-edge-${width}.png`});
      // Stress repeated clicks; there must never be two live buffer sources.
      await page.locator('.backingDockHandle').click();
      await dock.locator('.backingLoopPlayerPlayButton').evaluate(button => { for(let i=0;i<30;i++) button.click(); });
      await page.waitForTimeout(200);
      const liveCount = () => page.evaluate(() => window.backingTestSources.filter(item => item.node.buffer?.duration > 6 && !item.stops).length);
      assert.ok(await liveCount() <= 1);
      await dock.getByRole('button', {name:'백킹 정지',exact:true}).click();
      await page.getByRole('button', {name:'공통 백킹 패널 접기',exact:true}).click();
      await page.getByRole('button', {name:'백킹 즉시 정지',exact:true}).click();
      await edge.waitFor({state:'detached'});
      await page.waitForTimeout(100);
      assert.equal(await liveCount(), 0);
      assert.equal(await page.locator('audio.backingLoopAudio').count(), 2);
      await page.evaluate(() => { location.hash = '#metronome'; });
      await metro.getByRole('button', {name:'백킹 재생',exact:true}).click();
      await metro.getByRole('button', {name:'백킹 일시정지',exact:true}).waitFor();
      await metro.getByRole('button', {name:'Playlist 열기',exact:true}).click();
      await page.getByRole('button', {name:'그루브팩',exact:true}).click();
      await page.getByRole('button', {name:'내 저장 팩',exact:true}).click();
      await page.getByRole('button', {name:'연속 재생 확인 미리 듣기',exact:true}).click();
      await page.waitForFunction(() => [...window.backingTestMedia].some(audio => !audio.paused));
      assert.equal(await liveCount(), 0);
      await metro.getByRole('button', {name:'백킹 재생',exact:true}).click();
      await metro.getByRole('button', {name:'백킹 일시정지',exact:true}).waitFor();
      assert.equal(await page.evaluate(() => [...window.backingTestMedia].filter(audio => !audio.paused).length), 0);
      await page.evaluate(() => { location.hash = '#fretboard'; });
      await page.getByRole('button', {name:'백킹 즉시 정지',exact:true}).click();
      assert.equal(await liveCount(), 0);
      const peakSimultaneous = await page.evaluate(() => window.backingTestPeak);
      assert.equal(peakSimultaneous, 1);
      // Simulate a changed hook list in this browser only. This must remount
      // the audio session without a hook-count error or an orphaned source.
      if (width === 1440) {
        await page.evaluate(() => { location.hash = '#metronome'; });
        await metro.getByRole('button', {name:'백킹 재생',exact:true}).click();
        await metro.getByRole('button', {name:'백킹 일시정지',exact:true}).waitFor();
        const update = String(Date.now());
        await page.route(`**/src/backing-loop/useBackingLoop.js?t=${update}`, async route => {
          const response = await route.fetch();
          const body = (await response.text()).replace(/function useBackingLoop\([^)]*\)\s*\{/, '$&\n useRef(null); window.backingHookRevision = 1;');
          await route.fulfill({response, body});
        });
        await page.route(`**/src/components/BackingLoop.jsx?t=${update}`, async route => {
          const response = await route.fetch();
          const body = (await response.text()).replace(/from "\/src\/backing-loop\/useBackingLoop.js[^"\n]*"/, `from "/src/backing-loop/useBackingLoop.js?t=${update}"`);
          await route.fulfill({response, body});
        });
        await page.evaluate(async update => {
          const url = performance.getEntriesByType('resource').find(entry => entry.name.includes('/src/components/BackingLoop.jsx')).name;
          const previous = await import(url);
          const next = await import(`/src/components/BackingLoop.jsx?t=${update}`);
          const refresh = await import('/@react-refresh');
          refresh.validateRefreshBoundaryAndEnqueueUpdate('backing-refresh-test', previous, next);
        }, update);
        await page.waitForFunction(() => window.backingHookRevision === 1);
        await page.waitForTimeout(250);
        assert.equal(await liveCount(), 0);
        assert.equal(await page.locator('audio.backingLoopAudio').count(), 2);
        await page.locator('main.app').waitFor();
      }
      assert.deepEqual(errors, []);
      results.push({ width, continuity, seam, initialHidden: true, libraryButton: true, foldPosition: true, dragDistance:90, globalDock: true, rapidClicks: 30, previewHandoff: true, refreshHookChange: width === 1440, peakSimultaneous, stoppedSources: await liveCount(), errors });
      console.log(JSON.stringify(results.at(-1)));
    } catch (error) {
      await page.screenshot({ path: `${output}/failure-${width}.png` });
      console.error(errors);
      throw error;
    } finally {
      await page.close();
    }
  }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
