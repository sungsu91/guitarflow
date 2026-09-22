import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{for(const viewport of [{width:844,height:390},{width:390,height:844}]){
const page=await browser.newPage({viewport,isMobile:true,hasTouch:true});await page.goto('http://127.0.0.1:5173/#etudes');await page.getByRole('tab',{name:'에튀드',exact:true}).click();
await page.waitForTimeout(1500);let beat=page.getByRole('button',{name:'1박 강박',exact:true});
if(!await beat.count())await page.getByRole('button',{name:'메트로놈',exact:true}).click();
await beat.click();await page.getByRole('button',{name:'1박 약박',exact:true}).click();
const muted=page.getByRole('button',{name:'1박 무음',exact:true});await muted.waitFor();assert.equal(await muted.locator('svg').count(),1);
await page.screenshot({path:`output/muted-beat-${viewport.width}.png`});await muted.click();await page.getByRole('button',{name:'1박 강박',exact:true}).waitFor();console.log(viewport.width,'strong → weak → mute → strong OK');await page.close();
}}finally{await browser.close();}

