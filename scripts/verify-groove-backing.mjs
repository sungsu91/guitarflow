import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const baseUrl = process.env.BACKING_TEST_URL || 'http://127.0.0.1:5173';
const output = 'work/backing-groove-preview-apply';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('rifflabThemeMode', 'brand');
      window.__backingPreviewAudio = new Set();
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (...args) {
        window.__backingPreviewAudio.add(this);
        return play.apply(this, args);
      };
    });
    await page.goto(baseUrl + '/#etudes', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('button', { name: '백킹루프', exact: true }).waitFor({timeout:60000});
    await page.locator('.launchSplash').waitFor({state:'detached'});
    await page.evaluate(async () => {
      const { defaults, savePacks } = await import('/src/metronome/groovePackLibrary.js');
      savePacks([{ ...defaults[0], id: 'shared-test', builtin: false, title: '공유 테스트 팩', bpm: 120, createdAt: Date.now() }]);
      const { createDefaultBackingPlaylistState, saveBackingPlaylistState } = await import('/src/backing-loop/backingPlaylist.js');
      const state = createDefaultBackingPlaylistState();
      state.currentQueue.itemIds = ['groove:builtin:16beat'];
      state.savedPlaylists = [{ id: 'saved-test', title: '연습 세트', itemIds: ['groove:builtin:16beat'] }];
      saveBackingPlaylistState(state);
    });
    await page.getByRole('button', { name: '백킹루프', exact: true }).click();
    await page.getByRole('button', { name: 'Playlist 열기', exact: true }).click();
    const drawer = page.locator('.backingLoopPlaylistDialog');
    const grooveTab = drawer.getByRole('tab', { name: '그루브팩', exact: true });
    const queueTab = drawer.getByRole('tab', { name: '현재 재생목록', exact: true });
    const pauseAndReopen = async () => {
      await drawer.getByRole('button', { name: 'Playlist 닫기', exact: true }).click();
      await page.getByRole('button', { name: '백킹 일시정지', exact: true }).click();
      await page.getByRole('button', { name: 'Playlist 열기', exact: true }).click();
    };
    await grooveTab.click();
    assert.equal(await grooveTab.getAttribute('aria-selected'), 'true');
    assert.equal(await drawer.getByRole('button', { name: '목록에 연결', exact: true }).count(), 0);
    const apply = drawer.getByRole('button', { name: '적용', exact: true });
    assert.ok(await apply.isDisabled());
    assert.ok(await drawer.getByRole('button', { name: /미리 듣기/ }).count() > 0);
    await drawer.getByRole('button', { name: '재즈', exact: true }).click();
    assert.equal(await drawer.getByRole('button', { name: '8비트 선택', exact: true }).count(), 0);
    await drawer.getByRole('button', { name: '전체', exact: true }).click();
    await drawer.getByLabel('백킹 팩 검색').fill('8비트');
    assert.equal(await drawer.locator('.backingGrooveBrowserTrack').count(), 1);
    await drawer.getByLabel('백킹 팩 검색').fill('');
    await page.screenshot({ path: output + '/catalog-' + width + '.png' });
    const bounds = await drawer.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 901);
    const overflow = await drawer.evaluate(element => ({
      width: element.clientWidth, scrollWidth: element.scrollWidth,
      tracksHeight: element.querySelector('.backingGrooveBrowserTracks').clientHeight,
      tracksScrollHeight: element.querySelector('.backingGrooveBrowserTracks').scrollHeight,
    }));
    assert.ok(overflow.scrollWidth <= overflow.width + 1);
    assert.ok(overflow.tracksHeight > 80);
    assert.ok(overflow.tracksScrollHeight > overflow.tracksHeight);
    const stored = () => page.evaluate(async () => {
      const { loadBackingLoopLibrary } = await import('/src/backing-loop/backingLoopStorage.js');
      const { loadBackingPlaylistState } = await import('/src/backing-loop/backingPlaylist.js');
      const state = loadBackingPlaylistState();
      return { recordings: (await loadBackingLoopLibrary()).length, ids: state.currentQueue.itemIds, savedIds: state.savedPlaylists[0].itemIds };
    });

    // Selection and audition are drafts: the current track and queue stay unchanged.
    const initialState = await stored();
    const initialTitle = await page.locator('.backingLoopTrackText strong').innerText();
    await drawer.getByRole('button', { name: '내 저장 팩', exact: true }).click();
    await drawer.getByRole('button', { name: '공유 테스트 팩 선택', exact: true }).click();
    assert.equal(await grooveTab.getAttribute('aria-selected'), 'true');
    assert.equal(await drawer.getByRole('button', { name: '공유 테스트 팩 선택', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.deepEqual(await stored(), initialState);
    assert.equal(await page.locator('.backingLoopTrackText strong').innerText(), initialTitle);
    await drawer.getByRole('button', { name: '공유 테스트 팩 미리 듣기', exact: true }).click();
    await page.waitForFunction(() => [...window.__backingPreviewAudio].filter(audio => !audio.paused).length === 1);
    assert.equal(await grooveTab.getAttribute('aria-selected'), 'true');
    assert.deepEqual(await stored(), initialState);
    assert.equal(await page.locator('.backingLoopTrackText strong').innerText(), initialTitle);
    await page.screenshot({ path: output + '/preview-' + width + '.png' });
    await drawer.getByRole('button', { name: '공유 테스트 팩 미리 듣기 정지', exact: true }).click();
    await page.waitForFunction(() => [...window.__backingPreviewAudio].every(audio => audio.paused));
    await drawer.getByRole('button', { name: '공유 테스트 팩 미리 듣기', exact: true }).click();
    await page.waitForFunction(() => [...window.__backingPreviewAudio].some(audio => !audio.paused));

    // Apply stops the audition and prepares the selected track, without autoplay.
    await apply.click();
    await page.waitForFunction(() => {
      const button = document.querySelector('button[aria-label="백킹 재생"]');
      return button && !button.disabled && document.querySelector('.backingLoopTrackText strong')?.textContent.includes('공유 테스트 팩');
    });
    assert.equal(await queueTab.getAttribute('aria-selected'), 'true');
    assert.equal(await page.getByRole('button', { name: '백킹 일시정지', exact: true }).count(), 0);
    assert.ok(await page.evaluate(() => [...window.__backingPreviewAudio].every(audio => audio.paused)));
    assert.equal(await drawer.getByRole('checkbox', { name: '공유 테스트 팩 목록 선택', exact: true }).isChecked(), true);
    assert.deepEqual(await stored(), {
      recordings: 0, ids: ['groove:builtin:16beat', 'groove:saved:shared-test'], savedIds: ['groove:builtin:16beat'],
    });

    // Applying an already queued pack does not duplicate it. Playback stays explicit.
    await grooveTab.click();
    await drawer.getByRole('button', { name: '내 저장 팩', exact: true }).click();
    await drawer.getByRole('button', { name: '공유 테스트 팩 선택', exact: true }).click();
    await apply.click();
    await page.waitForFunction(() => document.querySelector('.backingLoopPanel')?.dataset.backingLoopPhase === 'idle');
    assert.equal((await stored()).ids.length, 2);
    await drawer.getByRole('button', { name: '공유 테스트 팩 바로 재생', exact: true }).click();
    await page.getByRole('button', { name: '백킹 일시정지', exact: true }).waitFor({timeout:15000});
    assert.equal(await queueTab.getAttribute('aria-selected'), 'true');
    assert.equal((await stored()).ids.length, 2);
    assert.ok(await drawer.getByRole('button', { name: '공유 테스트 팩 바로 재생', exact: true }).getAttribute('aria-current'));
    await page.screenshot({ path: output + '/playing-' + width + '.png' });
    await pauseAndReopen();

    // Changing filters and closing the catalog cancel auditions without applying them.
    await drawer.getByRole('tab', { name: /연습 세트/ }).click();
    await grooveTab.click();
    const beforePreview = await stored();
    await drawer.getByRole('button', { name: '8비트 미리 듣기', exact: true }).click();
    await drawer.getByLabel('백킹 팩 검색').fill('재즈');
    assert.ok(await apply.isDisabled());
    await page.waitForFunction(() => [...window.__backingPreviewAudio].every(audio => audio.paused));
    assert.deepEqual(await stored(), beforePreview);
    await drawer.getByLabel('백킹 팩 검색').fill('');
    await drawer.getByRole('button', { name: '8비트 미리 듣기', exact: true }).click();
    await page.waitForFunction(() => [...window.__backingPreviewAudio].some(audio => !audio.paused));
    await queueTab.click();
    await page.waitForFunction(() => [...window.__backingPreviewAudio].every(audio => audio.paused));
    assert.deepEqual(await stored(), beforePreview);
    await grooveTab.click();
    await drawer.getByRole('button', { name: '8비트 선택', exact: true }).click();
    await apply.click();
    await page.waitForFunction(() => document.querySelector('.backingLoopTrackText strong')?.textContent === '8비트');
    assert.deepEqual((await stored()).ids, ['groove:builtin:16beat', 'groove:saved:shared-test', 'groove:builtin:8beat']);
    assert.deepEqual((await stored()).savedIds, ['groove:builtin:16beat']);

    await page.reload({waitUntil:'domcontentloaded'});
    await page.getByRole('button', { name: '백킹루프', exact: true }).waitFor();
    assert.equal((await stored()).ids.length, 3);
    await page.evaluate(async () => {
      const { savePacks } = await import('/src/metronome/groovePackLibrary.js');
      savePacks([]);
    });
    await page.waitForFunction(() => !JSON.parse(localStorage.getItem('rifflab-backing-playlist-v3')).currentQueue.itemIds.includes('groove:saved:shared-test'));
    assert.equal((await stored()).recordings, 0);
    assert.deepEqual(errors, []);
    console.log(width, 'passed: selection and preview leave queue unchanged, preview stop/cancel, explicit apply without autoplay, playback, dedupe, saved-list isolation, persistence, viewport bounds');
    await page.close();
  }
} finally {
  await browser.close();
}
