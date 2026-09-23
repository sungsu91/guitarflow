import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{for(const mobile of [true,false]){
const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/#etudes');await page.getByRole('tab',{name:'에튀드',exact:true}).click();await page.locator('.etudeNotation svg').waitFor();
await page.getByRole('button',{name:'즐겨찾기 추가',exact:true}).click();await page.reload();await page.getByRole('tab',{name:'에튀드',exact:true}).click();await page.locator('.etudeNotation svg').waitFor();await page.getByRole('button',{name:'즐겨찾기 해제',exact:true}).waitFor();
await page.getByRole('button',{name:'연습 유형',exact:true}).click();await page.locator('.etudePickerCategories').getByRole('button',{name:'아르페지오',exact:true}).click();assert.ok(await page.locator('.etudePickerCard').count()>0);
await page.screenshot({path:`artifacts/etude-picker-${mobile?'mobile':'desktop'}.png`});
await page.locator('.etudePickerCard').first().click();await page.getByRole('button',{name:'불러오기',exact:true}).click();assert.ok((await page.getByRole('button',{name:'연습 유형',exact:true}).textContent()).includes('아르페지오'));
await page.getByRole('button',{name:'내 저장 악보',exact:true}).click();await page.locator('.etudePickerTabs').getByRole('button',{name:'연습 유형',exact:true}).click();await page.locator('.etudePickerCategories').getByRole('button',{name:'즐겨찾기',exact:true}).click();assert.equal(await page.locator('.etudePickerCard').count(),1);await page.locator('.etudePickerCard').click();await page.getByRole('button',{name:'불러오기',exact:true}).click();await page.getByRole('button',{name:'즐겨찾기 해제',exact:true}).click();
await page.screenshot({path:`artifacts/etude-favorite-${mobile?'mobile':'desktop'}.png`});
await page.evaluate(async()=>{const {createBlankDocument}=await import('/src/etudes/scoreModel.js');const {saveLibraryDocument}=await import('/src/etudes/scoreLibrary.js');const doc=createBlankDocument();doc.id='picker-test-score';doc.title='저장 악보 확인';const result=saveLibraryDocument(localStorage,doc);if(!result.saved)throw Error(result.errors.join(' '));});
await page.reload();await page.getByRole('tab',{name:'에튀드',exact:true}).click();await page.getByRole('button',{name:'내 저장 악보',exact:true}).click();await page.getByRole('searchbox',{name:'악보 검색'}).fill('저장 악보 확인');await page.locator('.etudePickerCard').click();await page.getByRole('button',{name:'불러오기',exact:true}).click();await page.getByRole('button',{name:'즐겨찾기 추가',exact:true}).click();assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('fretiva.score.folders.v1')).favorites['score:picker-test-score']));
assert.deepEqual(errors,[]);console.log(mobile?'mobile passed':'desktop passed');await page.close();
}}finally{await browser.close();}

