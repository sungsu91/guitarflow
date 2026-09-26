// Run against a production build with isolated profiles. Timings are diagnostic;
// the assertions cover bounded rendering, scroll geometry and retained state.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine = process.env.FRETBOARD_BROWSER || 'chromium';
const base = process.env.FRETBOARD_TEST_URL || 'http://127.0.0.1:4193';
const out = process.env.FRETBOARD_OUTPUT || `artifacts/fretboard-tabs-20260927/${engine}`;
await mkdir(out, { recursive: true });
const browser = await (engine === 'webkit' ? webkit : chromium).launch({
  headless: true, ...(engine === 'chromium' ? { channel: 'msedge' } : {}),
});
const results = [];
let activePage;
const widths = (process.env.FRETBOARD_WIDTHS || '390,844,1440').split(',').map(Number);
try {
  for (const width of widths) {
    const mobile = width < 1024;
    const page = await browser.newPage({ viewport: { width, height: width === 844 ? 390 : 900 }, isMobile: mobile, hasTouch: mobile });
    activePage = page;
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${base}/#fretboard`);
    await page.locator('.viewerModeTabs').waitFor();
    await page.locator('.launchSplash').waitFor({ state: 'detached' });
    await page.locator('.chordMiniCard').first().waitFor({ state: 'attached' });
    await page.waitForTimeout(400);
    const cards = page.locator('.chordMiniCard');
    const totalCards = await cards.count();
    assert.equal(totalCards, 231);
    const initialDiagrams = await page.locator('.chordMiniCard .fretboardGrid').count();
    assert.ok(initialDiagrams < 50, `only nearby diagrams: ${initialDiagrams}`);
    // Scroll the row first: WebKit cannot locate a distant descendant while
    // that row's content-visibility subtree is still skipped.
    await page.locator('.chordCatalogRow').first().scrollIntoViewIfNeeded();
    await cards.first().locator('.fretboardGrid').waitFor({ state: 'attached' });
    const initialGeometry = await cards.first().evaluate((card) => ({ height: card.getBoundingClientRect().height, width: card.getBoundingClientRect().width }));
    const builder = page.locator('.chordBuilderPanel--composer');
    for (const name of ['D', 'Minor', '7']) await builder.getByRole('button', { name, exact: true }).click();
    assert.equal(await page.locator('.viewerChordIdentity strong').textContent(), 'Dm7');
    const selectedDiagram = await page.locator('.viewerSharedFretboard').innerText();
    const tabs = page.locator('.viewerModeTabs button');
    const timings = [];
    for (const index of [1, 2, 1, 2]) {
      await tabs.nth(index).click();
      assert.equal(await page.locator('.chordCatalogPanel').isVisible(), false);
      const elapsed = await page.evaluate(async () => {
        const start = performance.now();
        document.querySelector('.viewerModeTabs button').click();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return performance.now() - start;
      });
      timings.push(elapsed);
      assert.equal(await page.locator('.viewerChordIdentity strong').textContent(), 'Dm7');
      assert.equal(await page.locator('.viewerSharedFretboard').innerText(), selectedDiagram);
    }
    await tabs.nth(1).click();
    await page.locator('.viewerNoteButtons').getByRole('button', { name: 'D#', exact: true }).click();
    await page.locator('.viewerNoteAccidentalControls').click();
    await tabs.nth(0).click();
    await tabs.nth(1).click();
    assert.equal(await page.locator('.viewerNoteButtons button[aria-pressed="true"]').textContent(), 'Eb');
    await tabs.nth(0).click();

    // Far-away cards retain their button, size and keyboard access. Both axes
    // must activate the diagram, including rows inside the desktop scroller.
    const rows = page.locator('.chordCatalogRow');
    for (let index = 0; index < await rows.count(); index++) {
      const row = rows.nth(index), grid = row.locator('.chordMiniGrid');
      const last = row.locator('.chordMiniCard').last();
      const before = await grid.evaluate((el) => el.scrollWidth);
      await row.scrollIntoViewIfNeeded();
      await grid.evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: 'instant' }));
      await last.locator('.fretboardGrid').waitFor({ state: 'attached' });
      await page.waitForTimeout(100);
      assert.equal(await grid.evaluate((el) => el.scrollWidth), before, 'scroll width survives diagram mounting');
      const size = await last.evaluate((el) => ({ height: el.getBoundingClientRect().height, width: el.getBoundingClientRect().width }));
      assert.deepEqual(size, initialGeometry, 'offscreen cards keep their layout');
      assert.ok(await page.locator('.chordMiniCard .fretboardGrid').count() < 50, 'visiting rows does not accumulate all diagrams');
    }
    const focusCard = rows.first().locator('.chordMiniCard').nth(12);
    await focusCard.focus();
    await focusCard.locator('.fretboardGrid').waitFor({ state: 'attached' });
    const positions = await page.locator('.chordMiniGrid').evaluateAll((els) => els.map((el) => el.scrollLeft));
    await tabs.nth(2).click();
    await tabs.nth(0).click();
    const restoredPositions = await page.locator('.chordMiniGrid').evaluateAll((els) => els.map((el) => el.scrollLeft));
    // Confirmed on the pre-change deployment too: WebKit's Activity reveal can
    // clamp a row's far edge by 10px. It must never jump to a different card.
    restoredPositions.forEach((position, index) => {
      assert.ok(Math.abs(position - positions[index]) <= (engine === 'webkit' ? 10 : 0) + 1, 'catalog scroll window is retained');
    });
    await focusCard.click();
    const selectedName = await focusCard.locator(':scope > span').textContent();
    assert.equal(await page.locator('.viewerChordIdentity strong').textContent(), selectedName);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/${width}-chords.png` });
    assert.deepEqual(errors, []);
    const result = { width, totalCards, initialDiagrams, initialGeometry, returnToChordMs: timings, errors };
    results.push(result);
    console.log(JSON.stringify(result));
    await page.close();
  }
  // Graceful fallback for browsers without IntersectionObserver.
  if (!process.env.FRETBOARD_SKIP_FALLBACK) {
    const page = await browser.newPage();
    await page.addInitScript(() => { window.IntersectionObserver = undefined; });
    await page.goto(`${base}/#fretboard`);
    await page.locator('.chordMiniCard').first().waitFor();
    await page.waitForFunction(() => document.querySelectorAll('.chordMiniCard .fretboardGrid').length === 231);
    await page.close();
  }
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: `${out}/failure.png` });
    const rows = await activePage.locator('.chordMiniGrid').evaluateAll((els) => els.map((el) => ({
      scrollLeft: el.scrollLeft, scrollWidth: el.scrollWidth, bounds: el.getBoundingClientRect().toJSON(),
      lastCard: el.lastElementChild.getBoundingClientRect().toJSON(),
      diagrams: [...el.querySelectorAll('.chordMiniCard:has(.fretboardGrid)')].map((card) => card.dataset.chordId),
    })));
    await writeFile(`${out}/failure.json`, JSON.stringify(rows, null, 2));
  }
  throw error;
} finally {
  await writeFile(`${out}/verification.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
