import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium,webkit}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
await mkdir('artifacts/saved-practice-ui',{recursive:true});
for(const [name,type,options] of [['chrome',chromium,{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}],['webkit',webkit,{}]]) {
 const browser=await type.launch({headless:true,...options});
 try {
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5177/#etudes');
 const fixture=await page.evaluate(async()=>{const m=await import('/src/etudes/scoreModel.js'),c=await import('/src/etudes/editorCommands.js'),l=await import('/src/etudes/scoreLibrary.js');let d=m.createBlankDocument();d.title='공통 연습 화면 검증';d.measures=Array.from({length:4},()=>m.blankMeasure());for(let bar=0;bar<4;bar++)for(let event=0;event<4;event++)d=c.enterFretWithDuration(d,{bar,event,string:1},3,'4');const r=l.saveLibraryDocument(localStorage,d);if(!r.saved)throw Error(r.errors);return d;});
 await page.reload();await page.getByRole('button',{name:fixture.title+' 열기',exact:true}).click();
 await page.locator('.scoreLibraryPractice .etudeNotation svg').waitFor();
 assert.equal(await page.locator('#scoreLibraryHome .libraryHeader').count(),1);assert.equal(await page.locator('.libraryTabs').count(),1);assert.equal(await page.locator('.etudeCompactTools').count(),1);
 await page.getByRole('button',{name:'악보 표시 방식 변경'}).click();assert.equal(await page.locator('.etudeViewOptions.is-mobile .etudeViewFields select').count(),4);await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.getByRole('button',{name:'메트로놈',exact:true}).click();await page.locator('.etudeRemote').waitFor();await page.getByRole('button',{name:'메트로놈 상세 설정'}).click();assert((await page.getByRole('button',{name:'반복',exact:true}).innerText()).includes('계속 반복'));await page.getByRole('button',{name:'반복',exact:true}).click();await page.getByRole('button',{name:'2회',exact:true}).click();await page.keyboard.press('Escape');
 await page.screenshot({path:`artifacts/saved-practice-ui/${name}-portrait.png`});
 await page.setViewportSize({width:844,height:390});await page.locator('.etudeNotationQuick').waitFor();await page.locator('.etudeHudRemote').waitFor();await page.getByRole('button',{name:'악보 보기 설정'}).click();await page.getByLabel('한 줄 마디 수',{exact:true}).selectOption('4');await page.getByRole('button',{name:'닫기',exact:true}).click();
 const overflow=await page.locator('.etudeScoreViewport').evaluate(el=>el.scrollWidth-el.clientWidth);assert(overflow<=1);await page.screenshot({path:`artifacts/saved-practice-ui/${name}-landscape.png`});
 const stored=await page.evaluate(async id=>{const l=await import('/src/etudes/scoreLibrary.js');return l.loadLibrary(localStorage).records[id].document;},fixture.id);assert.deepEqual(stored,fixture);assert.deepEqual(errors,[]);
 console.log(name,'saved score: shared header/tabs/tools, compact settings, repeat, landscape HUD and 4-bar fit PASS');
 const desktop=await browser.newPage({viewport:{width:1440,height:1000}});await desktop.goto('http://127.0.0.1:5177/#etudes');await desktop.evaluate(async d=>{const l=await import('/src/etudes/scoreLibrary.js');l.saveLibraryDocument(localStorage,d);},fixture);await desktop.reload();await desktop.getByRole('button',{name:fixture.title+' 열기',exact:true}).click();await desktop.locator('.etudeStudio--desktop .etudeNotation svg').waitFor();assert.equal(await desktop.locator('.libraryTabs').count(),1);await desktop.screenshot({path:`artifacts/saved-practice-ui/${name}-desktop.png`});console.log(name,'desktop saved score PASS');
 } finally {await browser.close();}
}
