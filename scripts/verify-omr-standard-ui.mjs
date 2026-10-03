// Requires the optional local OMR runtime and existing clean four-note fixture.
// Runs real inference; no model output or ground truth is injected into Worker.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const origin=process.env.PDF_TAB_APP_ORIGIN||'http://127.0.0.1:5174';
try{
 const page=await browser.newPage({viewport:{width:1280,height:950}}),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.context().route('**/*',route=>{if(route.request().url().startsWith(origin+'/'))return route.continue();external.push(route.request().url());return route.abort();});
 await page.goto(origin+'/experiments/omr/');
 await page.getByLabel('시험 PDF').setInputFiles('artifacts/omr-prototype/clean-staff-one-page.pdf');
 await page.getByRole('checkbox').check();await page.getByRole('button',{name:'로컬 분석 / 다시 분석'}).click();
 await page.getByRole('heading',{name:'변환 전 확인'}).waitFor({timeout:90000});
 const raw=await page.locator('pre').textContent();
 assert.equal(raw,'clef-G2+keySignature-CM+timeSignature-4/4+note-C4_quarter+note-D4_quarter+note-E4_quarter+note-F4_quarter+barline');
 await page.getByLabel('원본 옥타브').selectOption('0');
 const read=()=>Promise.all([1,2,3,4].map(i=>page.getByLabel(`음 ${i} 운지`,{exact:true}).inputValue()));
 assert.deepEqual(await read(),['2:1','2:3','1:0','1:1']);
 await page.getByLabel('음 1 운지',{exact:true}).selectOption('3:5');assert.equal((await read())[0],'3:5');
 await page.getByLabel('원본 옥타브').selectOption('-12');assert.deepEqual(await read(),['5:3','4:0','4:2','4:3']);
 await page.getByLabel('원본 옥타브').selectOption('0');
 await page.screenshot({path:'artifacts/pdf-tab-corpus/omr-standard-review.png',fullPage:true});
 await page.getByRole('button',{name:'확인 후 기존 편집기 열기'}).click();await page.locator('.etudeEditor').waitFor();
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 const result={realInference:true,fixtureNotes:4,defaultPositions:['2:1','2:3','1:0','1:1'],manualOverride:true,octaveRecalculated:true,editorOpened:true,errors,external};
 await writeFile('artifacts/pdf-tab-corpus/omr-standard-ui.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
