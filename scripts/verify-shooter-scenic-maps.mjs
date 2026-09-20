import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {SCENIC_MAP_SKINS} from '../src/shooter/maps/skins/scenicMaps.js';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {for(const width of [390,1366]) {for(const map of SCENIC_MAP_SKINS){
 const page=await browser.newPage({viewport:{width,height:width===390?844:768},isMobile:width===390,hasTouch:width===390});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(id=>{localStorage.setItem('rifflabShooterMapV2',id);},map.id);
 await page.goto('http://127.0.0.1:5177/?debugHitbox=1#shooter');
 await page.getByText('스킨변경',{exact:true}).first().click();
 await page.locator('.shooterSkinTabs').getByRole('button',{name:'맵',exact:true}).click();
 for(const m of SCENIC_MAP_SKINS) assert.ok(await page.getByText(m.label,{exact:true}).count()>0,m.label);
 await page.getByRole('button',{name:'스킨변경 창 닫기',exact:true}).click();
 await page.getByText('시작',{exact:true}).click();
 await page.waitForSelector('.shooterEnemy .noteVfxPitch');
 const bg=page.locator(`.shooterMapSkinBackground[src="${map.background.src}"]`);
 await bg.waitFor();assert.ok(await bg.evaluate(img=>img.complete&&img.naturalWidth===853));
 assert.equal(await page.locator('.shooterMapBackgroundTint').count(),map.id==='above-the-clouds'?1:0);
 if(map.id==='above-the-clouds')assert.equal(await page.locator('.shooterMapBackgroundTint').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(8, 20, 58, 0.12)');
 await page.waitForTimeout(1000);await page.screenshot({path:`artifacts/note-vfx/${map.id}-${width}.png`});assert.deepEqual(errors,[]);
 console.log(`${width}: ${map.label} OK`);await page.close();
}}}finally{await browser.close();}

