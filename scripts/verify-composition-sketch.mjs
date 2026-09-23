import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/composition-sketch',{recursive:true});
const results=[];
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('fretiva.score.sound','true'));
  await page.goto('http://127.0.0.1:5173/#etudes');
  await page.getByRole('tab',{name:'에튀드',exact:true}).click();
  await page.getByRole('button',{name:'연습 유형',exact:true}).click();
  await page.getByRole('searchbox',{name:'악보 검색'}).fill('Still Walking Together');
  await page.locator('.etudePickerCard').click();
  await page.getByRole('button',{name:'불러오기',exact:true}).click();
  await page.locator('.etudeNotation svg').first().waitFor();
  await page.waitForTimeout(500);
  const layout=await page.evaluate(()=>({
   width:innerWidth,bodyWidth:document.documentElement.scrollWidth,
   measures:[...document.querySelectorAll('.etudeMeasureNumber')].map(e=>e.textContent),
   beams:document.querySelectorAll('.tabRhythmBeam').length,
   svg:[...document.querySelectorAll('.etudeNotation svg')].map(s=>({width:s.getBoundingClientRect().width,viewBox:s.getAttribute('viewBox')})),
  }));
  assert.ok(layout.bodyWidth<=width+1,JSON.stringify(layout));
  assert.ok(layout.measures.includes('49'));assert.ok(layout.beams>0);
  await page.screenshot({path:`artifacts/composition-sketch/${width}.png`});
  await page.getByRole('button',{name:'연습 시작',exact:true}).click();
  await page.locator('.savedScorePlayhead').waitFor({state:'attached'});
  await page.waitForTimeout(500);
  const tick=Number(await page.locator('.savedScorePlayhead').getAttribute('data-tick'));
  await page.waitForTimeout(500);assert.ok(Number(await page.locator('.savedScorePlayhead').getAttribute('data-tick'))>tick);
  await page.getByRole('button',{name:'악보 표시 방식 변경',exact:true}).click();
  await page.getByRole('combobox',{name:'악보 재생 마디',exact:true}).selectOption('48');
  await page.waitForTimeout(200);assert.equal(await page.locator('.savedScorePlayhead').getAttribute('data-bar'),'48');
  assert.deepEqual(errors,[]);results.push({width,layout,errors,playhead:true,seekLastBar:true});
  await page.close();
 }
 await writeFile('artifacts/composition-sketch/browser-verification.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify(results));
}finally{await browser.close();}



