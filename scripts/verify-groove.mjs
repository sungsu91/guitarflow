import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {
for (const width of [320,390,1440]) {
const page=await browser.newPage({viewport:{width,height:900},isMobile:width<700,hasTouch:width<700});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.audioHits=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(time,...args){window.audioHits.push(time);return start.call(this,time,...args)};});
await page.goto('http://127.0.0.1:5176/#metronome');
await page.getByRole('button',{name:'3 그루브',exact:true}).click();
const grid=page.locator('.grooveEditor .grooveGrid');
assert.equal(await grid.locator('.grooveBeat button').count(),48);
assert.equal(await grid.locator('.grooveBeat button[aria-pressed=true]').count(),12);
const rects=await grid.locator('.grooveBeat button').evaluateAll(els=>els.slice(0,16).map(el=>{let r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right}}));
assert.ok(rects.every(r=>r.x>=0&&r.right<=width));assert.ok(rects.every(r=>r.y===rects[0].y));
for(let i=1;i<16;i++) assert.ok(rects[i].x>=rects[i-1].right);
await grid.getByRole('button',{name:'1행 2칸',exact:true}).click();
await grid.getByLabel('1행 음색').selectOption('clap');
assert.equal(await grid.getByRole('button',{name:'1행 2칸',exact:true}).getAttribute('aria-pressed'),'true');
assert.equal(await grid.getByLabel('1행 음색').locator('option:not([value=remove])').count(),21);
await page.getByRole('button',{name:'+ 줄 추가',exact:true}).click();
assert.equal(await grid.locator('.grooveBeat button').count(),64);
assert.equal(await grid.getByRole('button',{name:'1행 2칸',exact:true}).getAttribute('aria-pressed'),'true');
await grid.getByLabel('4행 음색').selectOption('cowbell');
await grid.getByRole('button',{name:'4행 1칸',exact:true}).click();
await grid.getByLabel('4행 음색').selectOption('remove');
assert.equal(await grid.locator('.grooveBeat button').count(),48);
let before=(await grid.boundingBox()).y;
await page.getByRole('button',{name:'트래커 접기',exact:true}).click();
assert.equal(await page.locator('.metronomeAdvancedDock').count(),0);
assert.ok((await grid.boundingBox()).y<before);
await page.locator('.standaloneMetronomePanel .metronomeHeroPlayButton').click();
await page.waitForTimeout(900);
let position=await grid.locator('.groovePlayTrack > i').evaluate(el=>getComputedStyle(el).transform);
await page.waitForTimeout(350);
assert.notEqual(await grid.locator('.groovePlayTrack > i').evaluate(el=>getComputedStyle(el).transform),position);
let hits=await page.evaluate(()=>window.audioHits);assert.ok(hits.length>=2);assert.ok(hits.some((t,i)=>i&&t===hits[i-1]),'simultaneous rows');
await page.getByRole('button',{name:'+ 줄 추가',exact:true}).click();
await grid.getByLabel('4행 음색').selectOption('shaker');
await grid.getByRole('button',{name:'4행 1칸',exact:true}).click();
await page.waitForTimeout(250);
assert.ok(await page.locator('.metronomeHeroPlayButton').first().innerText().then(t=>t.includes('STOP')));
await page.screenshot({path:`output/groove-${width}.png`,fullPage:true});
await page.locator('.grooveModeSelector').getByRole('button',{name:'1',exact:true}).click();
assert.equal(await page.locator('.grooveEditor').count(),0);
assert.equal(await page.locator('.metronomeBeatMatrix--main').count(),1);
assert.deepEqual(errors,[]);
console.log(`PASS ${width}px: layout, edit, all tones, add/remove rows, collapse, playback, simultaneous audio, mode switch`);
await page.close();
}
} finally {await browser.close();}


