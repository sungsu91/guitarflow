import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {for(const width of [360,390,430]) {
 const p=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5176/#metronome');await p.getByRole('button',{name:'3 그루브',exact:true}).click();const editor=p.locator('.grooveEditor');
 const load=async(name,bpm=false)=>{await p.getByRole('button',{name:'그루브팩 ▾',exact:true}).click();const d=p.getByRole('dialog',{name:'그루브팩',exact:true});await d.getByLabel('팩 이름 검색').fill(name);await d.locator('.groovePackPick').click();if(bpm)await d.getByRole('checkbox').check();await d.getByRole('button',{name:'불러오기',exact:true}).click();};
 await load('재즈 라이드 스윙');assert.equal(await editor.locator('.grooveBeat button').count(),36);assert.equal(await p.locator('.metronomeHeroBpmValue strong').innerText(),'80');
 await load('라틴 팝 퍼커션',true);assert.equal(await editor.locator('.grooveBeat button').count(),128);assert.equal(await p.locator('.metronomeHeroBpmValue strong').innerText(),'104');assert.ok(await editor.getByRole('button',{name:'+ 줄 추가',exact:true}).isDisabled());
 const tracks=editor.locator('.grooveTrackList');assert.ok(await tracks.evaluate(e=>e.scrollHeight===e.clientHeight&&getComputedStyle(e).overflowY==='visible'));assert.equal(await editor.locator('input[type=range]').count(),0);assert.equal(await editor.getByRole('button',{name:/확대 편집/}).count(),0);
 const cells=await editor.locator('.grooveTrack').first().locator('.grooveBeat button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right};}));assert.ok(cells.every(c=>c.x>=0&&c.right<=width&&c.y===cells[0].y));
 const headerBox=await editor.locator('.grooveTrackHeader .grooveSteps').boundingBox(),rowBox=await editor.locator('.grooveTrack .grooveSteps').first().boundingBox();assert.ok(Math.abs(headerBox.x-rowBox.x)<1&&Math.abs(headerBox.width-rowBox.width)<1,'header aligned with tracks');
 await editor.getByLabel('표기 방식').selectOption('45');await editor.getByRole('button',{name:'1행 2칸',exact:true}).click();assert.match(await editor.getByRole('button',{name:'1행 2칸',exact:true}).getAttribute('title'),/45/);await editor.getByLabel('1행 음색').selectOption('mute');assert.ok(await editor.locator('.grooveTrack').first().evaluate(e=>e.classList.contains('is-muted')));
 await p.locator('.standaloneMetronomePanel .metronomeHeroPlayButton').click();await p.waitForTimeout(650);const old=await editor.locator('.groovePlayTrack > i').evaluate(e=>getComputedStyle(e).transform);
 await editor.getByLabel('표기 방식').selectOption('100');await editor.getByRole('button',{name:'1행 2칸',exact:true}).click();assert.match(await editor.getByRole('button',{name:'1행 2칸',exact:true}).getAttribute('title'),/100/);await p.waitForTimeout(200);assert.notEqual(await editor.locator('.groovePlayTrack > i').evaluate(e=>getComputedStyle(e).transform),old);

 await p.screenshot({path:`output/groove-expanded-tracks-${width}.png`});await p.locator('.standaloneMetronomePanel .metronomeHeroPlayButton').click();
 await editor.getByRole('button',{name:'저장',exact:true}).click();await p.getByLabel('팩 이름',{exact:true}).fill('확장 편집 확인');await p.getByRole('button',{name:'팩 저장',exact:true}).click();const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('rifflab.metronome.groove-packs.v1')));assert.equal(saved[0].pattern.rows.length,8);assert.equal(saved[0].pattern.rows[0].velocities[1],100);assert.ok(saved[0].pattern.rows[0].volume>0);assert.equal(saved[0].pattern.rows[0].muted,true);
 assert.deepEqual(errors,[]);console.log('PASS recommendations/grid/BPM/8 tracks/mute/velocity/full-page-flow/save',width);await p.close();
}}finally{await browser.close();}
