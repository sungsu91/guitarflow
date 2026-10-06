import { chooseInstrument } from './instrument-dropdown-helpers.mjs';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5173/#stage3');await page.locator('.learningInstrumentControls').waitFor();await page.locator('.launchSplash').waitFor({state:'hidden'});
 const instrument=page.locator('.learningInstrumentControls .instrumentDropdownTrigger');await chooseInstrument(page, instrument, 'bass-5');
 await page.getByRole('button',{name:'LOAD',exact:true}).click();const dialog=page.locator('.stage3StorageDialog');await dialog.waitFor();
 assert.equal(await dialog.locator('.fretboardStringRow').count(),5);
 await dialog.locator('.fretboardEditCell[data-string-number="5"][data-fret-number="3"]').click();
 assert.equal(await dialog.locator('[data-note-pitch="D1"][data-string-number="5"]').count(),1);
 await dialog.getByRole('button',{name:'4박 추가',exact:true}).click();await dialog.getByRole('button',{name:'저장',exact:true}).click();
 const save=page.locator('.stage3StorageSaveTitleDialog');await save.locator('input').fill('Bass custom check');await save.getByRole('button',{name:'저장',exact:true}).click();await dialog.waitFor({state:'hidden'});
 const custom=page.locator('.stageChordSharedFretboard [data-note-pitch="D1"][data-string-number="5"]');await custom.waitFor();
 await chooseInstrument(page, instrument, 'ukulele-high-g');assert.equal(await page.locator('.stageChordSharedFretboard .fretboardStringRow').count(),4);
 await chooseInstrument(page, instrument, 'bass-5');await custom.waitFor();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('guitarTrainer.stage3QuickSlots.v1')));
 assert.equal(saved[0].chordIds[0].fretboard.instrumentProfileId,'bass-5');assert.ok(saved[0].chordIds[0].fretboard.notes.some(n=>n.pitch==='D1'));
 await page.reload();await instrument.waitFor();await page.locator('.launchSplash').waitFor({state:'hidden'});assert.equal(await instrument.getAttribute('data-value'),'bass-5');
 await page.getByRole('button',{name:'추천 진행 및 사용자 진행 선택',exact:true}).click();
 await page.locator('.metronomeSelectMenu:visible').getByText('사용자 진행',{exact:true}).click();
 await page.getByRole('option',{name:'Bass custom check',exact:true}).click();await custom.waitFor();
 assert.deepEqual(errors,[]);console.log('PASS custom bass fingering edit, save, instrument round-trip and reload');
 await writeFile('work/learning-instruments/editor-browser.json',JSON.stringify({pass:true,errors}));
} finally {await browser.close();}
