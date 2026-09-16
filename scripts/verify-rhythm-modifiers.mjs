import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const out='artifacts/rhythm-modifiers';await mkdir(out,{recursive:true});let page;const results=[];
try{for(const width of [360,375,390,393,430]){
 page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('rifflabThemeMode','light'));await page.goto('http://127.0.0.1:5173/#etudes');await page.getByRole('button',{name:/간단 악보 만들기/}).click();await page.locator('[data-draw-count]').first().waitFor();
 const d=page.getByRole('dialog',{name:'악보 편집',exact:true}),btn=name=>d.getByRole('button',{name,exact:true});
 const layout=await page.locator('.mobileDurationRow button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {name:e.getAttribute('aria-label'),x:r.x,y:r.y,width:r.width,height:r.height,right:r.right}}));
 assert.equal(layout.length,8);assert(Math.max(...layout.map(x=>x.y))-Math.min(...layout.map(x=>x.y))<2);assert(layout.every(x=>x.width>=41.9&&x.height>=44&&x.x>=0&&x.right<=width));
 await btn('8분음표').click();await btn('점음표').click();assert.equal(await btn('점음표').getAttribute('data-dotted-mode'),'one-shot');assert.equal(await page.locator('.rhythmInputStatus').textContent(),'점8분음표');await btn('프렛 9').click();assert.equal(await btn('점음표').getAttribute('data-dotted-mode'),'off');
 await btn('악보 저장').click();const saved=()=>page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records)[0].document);assert.equal((await saved()).measures[0].events[0].dotted,true);
 await btn('실행 취소').click();await btn('다시 실행').click();await btn('악보 저장').click();assert.equal((await saved()).measures[0].events[0].dotted,true);
 await btn('점음표').click();await btn('16분음표').click();assert.equal(await btn('점음표').getAttribute('data-dotted-mode'),'off');
 // Long press lock, consecutive notes, then release. Pointer cancellation never activates it.
 const dot=btn('점음표'),r=await dot.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.waitForTimeout(650);await page.mouse.up();assert.equal(await dot.getAttribute('data-dotted-mode'),'locked');assert.equal(await dot.locator('.dottedLock').count(),1);if(width===390){await page.waitForTimeout(250);await page.screenshot({path:`${out}/390-locked.png`});}
 await btn('다음 입력 위치').click();await btn('프렛 3').click();await btn('다음 입력 위치').click();await btn('프렛 4').click();assert.equal(await dot.getAttribute('data-dotted-mode'),'locked');await dot.click();assert.equal(await dot.getAttribute('data-dotted-mode'),'off');await btn('다음 입력 위치').click();await btn('프렛 5').click();
 await btn('악보 저장').click();const locked=await saved();assert.deepEqual(locked.measures[0].events.slice(0,4).map(e=>[e.duration,!!e.dotted]),[['8',true],['16',true],['16',true],['16',false]]);
 await dot.dispatchEvent('pointerdown',{button:0,clientX:20,clientY:20,pointerId:10});await dot.dispatchEvent('pointercancel',{pointerId:10});await page.waitForTimeout(600);assert.equal(await dot.getAttribute('data-dotted-mode'),'off');
 await page.screenshot({path:`${out}/${width}-dotted.png`});
 // New bar supplies clean space without changing other tools or importing state.
 await btn('마디 추가').click();await btn('8분음표').click();await btn('셋잇단음표').click();await btn('프렛 9').click();assert.equal(await page.locator('.rhythmInputStatus').textContent(),'셋잇단 1/3');await btn('위 기타 줄').click();await btn('프렛 7').click();assert.equal(await page.locator('.rhythmInputStatus').textContent(),'셋잇단 1/3');
 await btn('다음 입력 위치').click();await btn('프렛 7').click();assert.equal(await page.locator('.rhythmInputStatus').textContent(),'셋잇단 2/3');
 page.once('dialog',async dialog=>{assert.equal(dialog.message(),'셋잇단음표 입력이 완성되지 않았습니다. 취소하시겠습니까?');await dialog.dismiss();});await btn('16분음표').click();assert.equal(await btn('8분음표').getAttribute('aria-pressed'),'true');
 await btn('악보 저장').click();assert.equal(await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records)[0].status),'draft');
 await btn('다음 입력 위치').click();await btn('프렛 7').click();assert.equal(await btn('셋잇단음표').getAttribute('aria-pressed'),'false');assert.equal(await page.locator('.tabRhythmTuplet').count(),1);
 await page.waitForTimeout(250);await page.screenshot({path:`${out}/${width}-triplet.png`});
 await btn('마디 추가').click();await btn('16분음표').click();await btn('셋잇단음표').click();for(let i=0;i<3;i++){if(i)await btn('다음 입력 위치').click();await btn(`프렛 ${i+1}`).click();}assert.equal(await btn('셋잇단음표').getAttribute('aria-pressed'),'false');
 await btn('악보 저장').click();const trip=await saved();assert(trip.measures[2].events.slice(0,3).every(e=>e.duration==='16'&&e.tuplet.actualNotes===3));assert.deepEqual(trip.measures[2].events.slice(0,3).map(e=>e.onset),[0,80,160]);
 await btn('빔 도구 열기').click();assert.equal(await page.getByText('리듬 입력',{exact:true}).count(),0);assert.equal(await page.locator('.mobileTupletTool').count(),0);await page.screenshot({path:`${out}/${width}-beam.png`});
 assert.deepEqual(errors,[]);results.push({width,layout,errors,dottedAndTripletPassed:true});await page.close();
}console.log(JSON.stringify(results));}catch(e){await page?.screenshot({path:`${out}/failure.png`});throw e;}finally{await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));await browser.close();}
