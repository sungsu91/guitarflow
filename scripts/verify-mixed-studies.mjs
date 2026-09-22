import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
await mkdir('artifacts/mixed-studies',{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/#etudes');
 console.log(await page.locator('body').innerText()); await page.getByText('에튀드',{exact:true}).first().click();
 await page.getByLabel('연습 유형',{exact:true}).selectOption({label:'벤딩'});
 await page.waitForTimeout(200);assert.ok(await page.locator('.etudeNotation svg').count());
 await page.screenshot({path:`artifacts/mixed-studies/${width}-bending.png`});
 const count=await page.evaluate(async()=>{
 const {ETUDES}=await import('/src/etudes/catalog.js'),{mixedTechniqueStudies}=await import('/src/etudes/mixedTechniqueStudies.js'),{drawScore}=await import('/src/etudes/Score.jsx');
 let count=0;for(const t of mixedTechniqueStudies){const host=document.createElement('div');document.body.append(host);drawScore(host,ETUDES.find(e=>e.templateId===t.id),{view:'tab',mobile:true,responsive:true,editorWidth:390,measuresPerRow:1});if(!host.querySelector('svg'))throw Error(t.id);host.remove();count++;}return count;
 });assert.equal(count,8);assert.deepEqual(errors,[]);console.log(width,'bending selectable, eight new studies render');await page.close();
}}finally{await browser.close();}
