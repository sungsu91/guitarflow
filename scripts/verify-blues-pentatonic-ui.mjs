import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const out = 'work/blues-pentatonic-ui';
await mkdir(out, { recursive: true });
const results = [];
const tuning = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };
try {
  for (const width of [390, 1440]) for (const route of ['stage2', 'fretboard']) {
    const page = await browser.newPage({ viewport: { width, height: 960 }, isMobile: width < 768, hasTouch: width < 768 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${process.env.SCALE_TEST_URL || 'http://127.0.0.1:5183'}/#${route}`);
    await page.locator('.launchSplash').waitFor({ state: 'hidden' });
    if (route === 'fretboard') await page.locator('.viewerModeTabs button').last().click();
    const controls = page.locator(route === 'stage2' ? '.stage2HeaderScalePicker .referenceScalePicker:visible .metronomeSelectControl' : '.viewerScaleSelectGrid:visible .metronomeSelectControl');
    const board = page.locator(route === 'stage2' ? '.trainingSharedFretboard:visible' : '.viewerSharedFretboard:visible').last();
    const nav = page.locator('.mobileScalePositionNavigation:visible, .desktopScalePositionNavigation:visible');
    async function choose(index, name) {
      await controls.nth(index).locator('button').click();
      await page.locator('.metronomeSelectMenu:visible').getByRole('option', { name, exact: typeof name === 'string' }).click();
    }
    async function notes() {
      return board.locator('.fretboardNoteChip').evaluateAll(elements => elements.map(element => ({
        string: Number(element.dataset.stringNumber), fret: Number(element.dataset.fretNumber), pitch: element.dataset.notePitch,
      })));
    }
    await choose(0, /^A \/ /);
    for (const type of ['Minor', 'Major']) {
      if (route === 'stage2') while (!(await nav.locator('button').first().isDisabled())) await nav.locator('button').first().click();
      for (let box = 1; box <= 5; box += 1) {
        if (route === 'fretboard') await choose(2, `BOX${box}`);
        else if (box > 1) await nav.locator('button').last().click();
        await choose(1, `${type} Pentatonic`);
        const pentatonic = await notes();
        if (type === 'Minor' && box === 2) await page.screenshot({ path: `${out}/${width}-${route}-pentatonic.png` });
        await choose(1, `${type} Blues`);
        const blues = await notes();
        const position = note => `${note.string}:${note.fret}`;
        const expected = new Set(pentatonic.map(position));
        const minFret = Math.min(...pentatonic.map(note => note.fret));
        const maxFret = Math.max(...pentatonic.map(note => note.fret));
        const blueClass = (9 + (type === 'Major' ? 3 : 6)) % 12;
        for (const [string, openMidi] of Object.entries(tuning)) for (let fret = minFret; fret <= maxFret; fret += 1) {
          if ((openMidi + fret) % 12 === blueClass) expected.add(`${string}:${fret}`);
        }
        assert.deepEqual(new Set(blues.map(position)), expected, `${width}/${route}/${type}/${box}: visible blue notes`);
        assert.ok(blues.length > pentatonic.length);
        if (type === 'Minor' && box === 2) {
          assert.ok(blues.some(note => note.string === 3 && note.fret === 8 && note.pitch === 'D#4'));
          await page.screenshot({ path: `${out}/${width}-${route}-blues.png` });
        }
        results.push({ width, route, type, box, pentatonic: pentatonic.length, blues: blues.length });
      }
    }
    assert.deepEqual(errors, []);
    console.log(`${width}/${route}: all five major/minor pairs show exactly the pentatonic notes plus all blue notes in the box.`);
    await page.close();
  }
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
