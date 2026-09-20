import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {for(const width of [360,390,430]) {
 const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5176/#metronome');await page.getByRole('button',{name:'3 그루브',exact:true}).click();
 const editor=page.locator('.grooveEditor');await editor.getByRole('button',{name:'+ 줄 추가',exact:true}).click();await editor.getByLabel('4행 음색').selectOption('cowbell');
 await editor.getByRole('button',{name:'저장',exact:true}).click();await page.getByLabel('팩 이름',{exact:true}).fill('연습용 저장 팩');await page.getByRole('button',{name:'팩 저장',exact:true}).click();
 // Existing-format fixtures verify migration-free reads and long-list layout.
 await page.evaluate(()=>{const key='rifflab.metronome.groove-packs.v1',packs=JSON.parse(localStorage.getItem(key));for(let i=0;i<14;i++)packs.push({...packs[0],id:`fixture-${i}`,title:i===13?'아주 긴 이름으로 저장한 그루브 연습 팩 제목이 잘리지 않는지 확인':`스크롤 확인 ${i+1}`});localStorage.setItem(key,JSON.stringify(packs));});
 await page.getByRole('button',{name:'그루브팩 ▾',exact:true}).click();const dialog=page.getByRole('dialog',{name:'그루브팩',exact:true});
 assert.equal(await dialog.locator('.groovePackPick').count(),14);assert.equal(await dialog.getByText('빈 패턴',{exact:true}).count(),0);
 await dialog.getByLabel('팩 이름 검색').fill('16');assert.equal(await dialog.locator('.groovePackPick').count(),1);await dialog.locator('.groovePackPick').click();assert.equal(await editor.locator('.grooveGrid select').count(),4);
 await dialog.getByRole('button',{name:'불러오기',exact:true}).click();assert.equal(await editor.locator('.grooveGrid select').count(),3);
 await page.getByRole('button',{name:'그루브팩 ▾',exact:true}).click();await dialog.getByRole('tab',{name:'내 저장 팩',exact:true}).click();
 assert.match(await dialog.locator('.groovePackPick').first().innerText(),/아주 긴/);
 const footer=dialog.locator('.groovePackLoad'),before=await footer.boundingBox();const results=dialog.locator('.groovePackResults');assert.ok(await results.evaluate(e=>e.scrollHeight>e.clientHeight));await results.evaluate(e=>{e.scrollTop=e.scrollHeight});assert.deepEqual(await footer.boundingBox(),before);
 const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<=844);assert.ok(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth));
 await dialog.getByLabel('팩 이름 검색').fill('연습용');await dialog.locator('.groovePackPick').click();await dialog.getByRole('button',{name:'연습용 저장 팩 관리',exact:true}).click();await dialog.getByRole('button',{name:'이름 변경',exact:true}).click();await dialog.getByLabel('새 팩 이름').fill('이름 변경 확인');await dialog.getByRole('button',{name:'변경',exact:true}).click();await dialog.getByLabel('팩 이름 검색').fill('이름 변경');assert.equal(await dialog.locator('.groovePackPick').count(),1);
 await dialog.getByRole('button',{name:'불러오기',exact:true}).click();assert.equal(await editor.getByLabel('4행 음색').inputValue(),'cowbell');
 await page.getByRole('button',{name:'그루브팩 ▾',exact:true}).click();await dialog.getByRole('tab',{name:'내 저장 팩',exact:true}).click();await dialog.getByLabel('팩 이름 검색').fill('이름 변경');await dialog.getByRole('button',{name:'이름 변경 확인 관리',exact:true}).click();await dialog.getByRole('button',{name:'삭제',exact:true}).click();assert.equal(await dialog.locator('.groovePackPick').count(),0);
 await dialog.getByLabel('팩 이름 검색').fill('');await results.evaluate(e=>{e.scrollTop=0});await dialog.locator('.groovePackPick').first().click();await page.screenshot({path:`output/groove-list-white-${width}.png`});
 await dialog.getByRole('tab',{name:'추천 팩',exact:true}).click();await dialog.locator('.groovePackPick').first().click();await page.screenshot({path:`output/groove-recommended-white-${width}.png`});
 assert.deepEqual(errors,[]);console.log(`PASS ${width}: tabs, search, explicit load, persistence, rename/delete, overflow, fixed footer`);await page.close();
}}finally{await browser.close();}
