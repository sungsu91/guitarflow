import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
await mkdir('artifacts/etude-playhead',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];
try{
 for(const theme of ['light','brand']){
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(t=>localStorage.setItem('rifflabThemeMode',t),theme);await page.goto('http://127.0.0.1:5173/#etudes');await page.getByRole('tab',{name:'에튀드',exact:true}).click();
  assert.equal(await page.locator('.savedScorePlayhead').count(),0);
  await page.getByRole('button',{name:'▶ 메트로놈 시작',exact:true}).click();await page.waitForTimeout(200);assert.equal(await page.locator('.savedScorePlayhead').count(),0);await page.getByRole('button',{name:'■ 메트로놈 정지',exact:true}).click();
  await page.getByRole('button',{name:'악보 듣기',exact:true}).click();await page.locator('.savedScorePlayhead').waitFor({state:'attached'});await page.waitForTimeout(700);
  await page.getByRole('button',{name:'일시정지',exact:true}).click();let frozen=Number(await page.locator('.savedScorePlayhead').getAttribute('data-tick'));await page.waitForTimeout(300);assert.equal(Number(await page.locator('.savedScorePlayhead').getAttribute('data-tick')),frozen);
  for(const label of ['오선보만','TAB만','오선보+TAB']){await page.getByRole('button',{name:'악보 보기',exact:true}).click();await page.getByRole('button',{name:label,exact:true}).click();assert.equal(Number(await page.locator('.savedScorePlayhead').getAttribute('data-tick')),frozen);}
  await page.getByRole('button',{name:'이어서 재생',exact:true}).click();await page.waitForTimeout(250);assert.ok(Number(await page.locator('.savedScorePlayhead').getAttribute('data-tick'))>frozen);
  await page.getByRole('button',{name:'BPM 48 조절',exact:true}).click();await page.getByRole('spinbutton',{name:'연습 BPM',exact:true}).fill('96');await page.getByRole('spinbutton',{name:'연습 BPM',exact:true}).press('Enter');await page.waitForTimeout(180);assert.equal(await page.getByRole('button',{name:'악보 재생 정지',exact:true}).getAttribute('aria-pressed'),'true');assert.ok(Number(await page.locator('.savedScorePlayhead').getAttribute('data-tick'))>frozen);
  await page.getByRole('combobox',{name:'악보 재생 마디',exact:true}).selectOption('6');await page.waitForTimeout(200);assert.equal(await page.locator('.savedScorePlayhead').getAttribute('data-bar'),'6');
  await page.waitForTimeout(1100);const followed=await page.evaluate(()=>window.scrollY);assert.ok(followed>100);
  await page.mouse.wheel(0,-1000);await page.waitForTimeout(100);const manual=await page.evaluate(()=>window.scrollY);await page.waitForTimeout(900);assert.equal(await page.evaluate(()=>window.scrollY),manual);
  for(const size of [{width:844,height:390},{width:1440,height:960},{width:390,height:844}]){await page.setViewportSize(size);await page.waitForTimeout(150);assert.equal(await page.locator('.savedScorePlayhead').count(),1);assert.equal(await page.getByRole('button',{name:'악보 재생 정지',exact:true}).getAttribute('aria-pressed'),'true');}
  await page.getByRole('button',{name:'가로 전환',exact:true}).click();await page.locator('.etudeZoom .savedScorePlayhead').waitFor({state:'attached'});await page.getByRole('button',{name:'닫기 ✕',exact:true}).click();assert.equal(await page.locator('.savedScorePlayhead').count(),1);
  await page.screenshot({path:`artifacts/etude-playhead/${theme}.png`});await page.getByRole('button',{name:'악보 재생 정지',exact:true}).click();await page.locator('.savedScorePlayhead').waitFor({state:'detached'});assert.equal(await page.locator('.savedScorePlayhead').count(),0);assert.deepEqual(errors,[]);results.push({theme,pauseResume:true,viewSwitch:true,bpm:true,seek:true,followed,manualScrollRespected:true,resizeAndZoom:true,metronomeIndependent:true,errors});await page.close();
 }
}finally{await writeFile('artifacts/etude-playhead/browser-results.json',JSON.stringify(results,null,2));await browser.close();}
console.log(results);
