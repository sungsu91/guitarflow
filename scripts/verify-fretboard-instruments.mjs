import { chooseInstrument } from './instrument-dropdown-helpers.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { VIEWER_PROFILES } from '../src/fretboard/instruments.js';
const dir = 'work/fretboard-instruments';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const reports = [];
const base = process.env.FRETBOARD_TEST_URL || 'http://127.0.0.1:5194';
try {
  for (const [name, width, height, userAgent, theme] of [
    ['phone',390,844,'iPhone Mobile','light'], ['tablet',768,1024,'iPad Safari','light'],
    ['tablet-pro',1032,1376,'iPad Safari','light'],
    ['tablet-landscape',1280,800,'Android Tablet','brand'], ['tablet-split',507,1180,'iPad Safari','light'],
    ['desktop',1440,1000,'','brand'],
  ].filter(profile => !process.argv[2] || profile[0] === process.argv[2])) {
    const page = await browser.newPage({ viewport: {width,height}, ...(userAgent ? {userAgent,isMobile:true,hasTouch:true} : {}) });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(20000);
    await page.addInitScript(theme => localStorage.setItem('rifflabThemeMode',theme), theme);
    const checks = [];
    try {
      await page.goto(`${base}/#fretboard`);
      await page.locator('.launchSplash').waitFor({state:'hidden'});
      const controls = page.locator('.viewerInstrumentControls:visible');
      await controls.waitFor();
      const tabs = page.locator('.viewerModeTabs:visible > button');
      for (const profile of Object.values(VIEWER_PROFILES)) {
        await chooseInstrument(page, controls.locator('.instrumentDropdownTrigger').first(), profile.instrument);
        await chooseInstrument(page, controls.locator('.instrumentDropdownTrigger').nth(1), profile.id);
        await tabs.nth(0).click();
        const board = page.locator('.viewerSharedFretboard:visible').first();
        await page.waitForFunction(count => document.querySelector('.viewerSharedFretboard .fretboardStrings')?.children.length === count, profile.stringCount);
        assert.equal(await board.locator('.fretboardStringRow').count(),profile.stringCount);
        assert.ok(await board.locator('[data-note-pitch]').count()>0);
        const wrong = await board.locator('[data-note-pitch]').evaluateAll((nodes,tuning)=>nodes.filter(node=>{
          const midi=tuning[Number(node.dataset.stringNumber)-1].midi+Number(node.dataset.fretNumber);
          const pitch=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][midi%12]+(Math.floor(midi/12)-1);
          return node.dataset.notePitch!==pitch;
        }).map(node=>node.dataset.notePitch),profile.tuning);
        assert.deepEqual(wrong,[]);
        await page.locator('.viewerChordSoundButton:visible').click();
        if (profile.id === 'guitar-7' || profile.id === 'bass-6') await page.screenshot({path:`${dir}/${name}-${profile.id}-chords.png`,fullPage:false});
        await tabs.nth(1).click();
        const noteBoard = page.locator('.viewerSharedFretboard.allNotes:visible');
        assert.equal(await noteBoard.locator('.fretboardStringRow').count(),profile.stringCount);
        assert.equal(await noteBoard.locator('[data-note-pitch]').count(),profile.stringCount*16);
        assert.deepEqual(await noteBoard.locator('[data-fret-number="0"]').evaluateAll(nodes=>nodes.map(node=>node.dataset.notePitch)),profile.tuning.map(string=>string.pitch));
        await noteBoard.locator('[data-note-pitch]').first().click();
        // The note chips must still align with the matching string after changing count.
        const misaligned = await noteBoard.evaluate(board => [...board.querySelectorAll('.fretboardNoteChip')].filter(note=>{
          const row=board.querySelectorAll('.fretboardStringRow')[Number(note.dataset.stringNumber)-1];
          const r=row.getBoundingClientRect(),n=note.getBoundingClientRect();
          return Math.abs(r.y+r.height/2-n.y-n.height/2)>1;
        }).length);
        assert.equal(misaligned,0);
        if (name === 'phone') await tabs.nth(2).click();
        const scaleBoard = page.locator('.viewerSharedFretboard:visible').last();
        assert.equal(await scaleBoard.locator('.fretboardStringRow').count(),profile.stringCount);
        assert.ok(await scaleBoard.locator('[data-note-pitch]').count()>0);
        if (profile.id === 'bass-6' || profile.id === 'ukulele-high-g') await page.screenshot({path:`${dir}/${name}-${profile.id}-notes-scale.png`,fullPage:false});
        const controlBounds=await controls.boundingBox();
        assert.ok(controlBounds.x>=-1&&controlBounds.x+controlBounds.width<=width+1,`${name} control overflow`);
        const tabBounds=await tabs.nth(0).boundingBox();
        assert.ok(Math.abs(controlBounds.y+controlBounds.height/2-tabBounds.y-tabBounds.height/2)<3,`${name} selectors and tabs must share one row`);
        assert.ok(controlBounds.x+controlBounds.width<=tabBounds.x+1,`${name} selectors precede code tab`);
        const lastTab=await tabs.last().boundingBox();
        assert.ok(Math.abs(lastTab.y+lastTab.height/2-tabBounds.y-tabBounds.height/2)<3,`${name} last tab must not wrap`);
        assert.ok(lastTab.x+lastTab.width<=width+1,`${name} tabs overflow`);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name} page overflow`);
        checks.push(profile.id);
      }
      await page.reload();
      await page.locator('.launchSplash').waitFor({state:'hidden'});
      assert.equal(await page.locator('.viewerInstrumentControls:visible .instrumentDropdownTrigger').nth(1).getAttribute('data-value'),'ukulele-low-g');
      assert.deepEqual(errors,[]);
      reports.push({name,checks,pass:true,errors});
      console.log('PASS',name,checks.length,'profiles');
    } catch (error) {
      await page.screenshot({path:`${dir}/${name}-failure.png`});
      reports.push({name,checks,pass:false,error:String(error),errors});
      console.log('FAIL',name,String(error),errors);
    }
    await page.close();
    await writeFile(`${dir}/browser-report${process.argv[2]?`-${process.argv[2]}`:''}.json`,JSON.stringify(reports,null,2));
  }
} finally { await browser.close(); }
if(reports.some(report=>!report.pass))process.exitCode=1;
