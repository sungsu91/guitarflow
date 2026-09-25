import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {createBlankDocument} from '../src/etudes/scoreModel.js';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});await mkdir('artifacts/score-picker-active',{recursive:true});const results=[];
try{for(const [width,theme] of [[390,'light'],[440,'dark'],[1440,'light'],[1440,'dark']]){
 const p=await browser.newPage({viewport:{width,height:956},isMobile:width<600});const errors=[];p.on('pageerror',e=>errors.push(e.message));const d=createBlankDocument();d.title='내 하이햇 연습';
 await p.addInitScript(({d,theme})=>{localStorage.setItem('rifflabThemeMode',theme);localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[d.id]:{document:d,status:'saved'}}}));},{d,theme});
 await p.goto('http://127.0.0.1:5173/#etudes');const triggers=p.locator('.etudePickerTrigger'),active=p.locator('.etudePickerTrigger.is-current-score');await active.waitFor();
 assert.equal(await active.count(),1);assert.match(await active.innerText(),/Finger Pair Foundation/);assert.equal(await triggers.nth(0).getAttribute('aria-current'),'true');
 const colors=await triggers.evaluateAll(es=>es.map(e=>getComputedStyle(e).backgroundColor));assert.notEqual(colors[0],colors[1]);
 await p.locator('.launchSplash').waitFor({state:'hidden'});await p.screenshot({path:`artifacts/score-picker-active/${width}-${theme}-type.png`});
 await triggers.nth(1).click();assert.equal(await triggers.nth(0).getAttribute('aria-current'),'true');
 await p.locator('.etudePickerCard').filter({hasText:d.title}).click();await p.locator('.etudePickerDialog footer button').click();
 assert.equal(await triggers.nth(1).getAttribute('aria-current'),'true');assert.equal(await triggers.nth(0).getAttribute('aria-current'),null);assert.match(await active.innerText(),/내 하이햇 연습/);
 await p.screenshot({path:`artifacts/score-picker-active/${width}-${theme}-saved.png`});
 await triggers.nth(0).click();const selected=p.locator('.etudePickerCard').filter({hasText:'Finger Pair Foundation'});await selected.click();await p.locator('.etudePickerDialog footer button').click();assert.match(await active.innerText(),/Finger Pair Foundation/);
 await p.getByRole('button',{name:'다음 연습곡',exact:true}).click();assert.notEqual(await active.getAttribute('title'),'Finger Pair Foundation');
 const bounds=await triggers.evaluateAll(es=>es.map(e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,width:e.clientWidth,scroll:e.scrollWidth})));assert.ok(bounds.every(r=>r.left>=0&&r.right<=width&&r.scroll<=r.width+1));assert.deepEqual(errors,[]);results.push({width,theme,colors,bounds,errors});console.log('PASS',width,theme,'active source, title, load, navigation, bounds');await p.close();
}}finally{await writeFile('artifacts/score-picker-active/verification.json',JSON.stringify(results,null,2));await browser.close();}
