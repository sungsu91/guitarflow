import assert from 'node:assert/strict';
import { chromium } from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const draftKey = 'guitarTrainer.miniChordMakerDraft.v1';
const savedKey = 'guitarTrainer.miniChordMaker.v1';
try {
 for (const viewport of [{width:1365,height:900},{width:390,height:844}]) {
  const page = await browser.newPage({viewport});
  const errors=[];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
   window.sampleStarts=[];
   const start=AudioBufferSourceNode.prototype.start;
   AudioBufferSourceNode.prototype.start=function(...args) {
    window.sampleStarts.push({rate:this.playbackRate.value,duration:this.buffer?.duration});
    return start.apply(this,args);
   };
  });
  await page.goto('http://127.0.0.1:5174/#mini-chord');
  const load = async name => {
   await page.locator('.miniChordLoadPicker button').first().click();
   await page.getByRole('option').filter({hasText:name}).click();
   await page.waitForFunction(([key,title]) => JSON.parse(localStorage.getItem(key))?.title === title,[draftKey,name]);
  };
  const draft = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)),draftKey);
  await load('첫 번째 드라이브');
  const original=await draft();
  assert.equal(original.pianoPerformance,'mini');
  assert.equal(await page.getByRole('button',{name:'1마디 1박 코드 설정',exact:true}).isEnabled(),true);
  assert.equal(await page.getByRole('button',{name:'마디 수 1 감소',exact:true}).isEnabled(),true);
  assert.equal(await page.locator('.sharedAccompanimentPanel--miniChord button:disabled').count(),0);
  await page.getByRole('button',{name:'마디 수 1 감소',exact:true}).click();
  const title=`사본 확인 ${viewport.width}`;
  await page.getByPlaceholder('제목 입력',{exact:true}).fill(title);
  await page.locator('.miniChordQuickBar').getByRole('button',{name:'저장',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'저장',exact:true}).click();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || '[]').length===1,savedKey);
  const saved=await page.evaluate(key => JSON.parse(localStorage.getItem(key))[0],savedKey);
  assert.equal(saved.builtIn,false);
  assert.equal(saved.libraryType,'user');
  assert.equal(saved.pianoPerformance,'mini');
  assert.equal(saved.barCount,original.barCount-1);
  assert.equal(saved.title,title);
  await load('첫 번째 드라이브');
  assert.equal((await draft()).barCount,original.barCount);
  assert.deepEqual((await draft()).slots,original.slots);
  await page.locator('.miniChordLoadPicker button').first().click();
  await page.getByRole('tab').filter({hasText:'저장된 코드'}).click();
  await page.getByRole('option').filter({hasText:title}).click();
  await page.waitForFunction(([key,title]) => JSON.parse(localStorage.getItem(key))?.title===title,[draftKey,title]);
  assert.equal((await draft()).pianoPerformance,'mini');
  assert.equal((await draft()).barCount,saved.barCount);
  await page.reload();
  await page.getByPlaceholder('제목 입력',{exact:true}).waitFor();
  assert.equal((await draft()).pianoPerformance,'mini');
  assert.equal(await page.getByPlaceholder('제목 입력',{exact:true}).inputValue(),title);
  await page.getByRole('button',{name:'반주 사운드 전체 끄기',exact:true}).waitFor();
  await page.getByRole('button',{name:'미니코드 반주 시작',exact:true}).click();
  await page.waitForFunction(() => window.sampleStarts.filter(s => s.duration>1).length>=4).catch(async error => {
   console.log(await page.evaluate(() => ({samples:window.sampleStarts,body:document.body.innerText.slice(-2500)})));
   throw error;
  });
  const firstCount=await page.evaluate(() => window.sampleStarts.length);
  await page.waitForFunction(count => window.sampleStarts.length>count+4,firstCount);
  await page.getByRole('button',{name:'미니코드 반주 정지',exact:true}).click();
  assert.deepEqual(errors,[]);
  console.log(`PASS ${viewport.width}: editable recommendation, new user copy, pristine original reload, saved reload, draft restore and continuing audio playback`);
  await page.close();
 }
} finally {await browser.close();}
