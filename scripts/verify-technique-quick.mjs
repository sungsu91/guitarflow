import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {createBlankDocument} from '../src/etudes/scoreModel.js';
import {enterFretWithDuration} from '../src/etudes/editorCommands.js';
let fixture=createBlankDocument();for(let i=0;i<3;i++)fixture=enterFretWithDuration(fixture,{bar:0,event:i,string:3},5+i*2,'4');
await mkdir('artifacts/technique-quick',{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{for(const width of [390,1440]){
const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/#etudes');await page.getByRole('button',{name:'악보 만들기',exact:true}).click();
await page.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'quick.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
const dialog=page.getByRole('dialog',{name:'악보 편집',exact:true}),button=name=>dialog.getByRole('button',{name,exact:true});
const note=i=>dialog.locator(`[data-bar-index="0"] .etudeNoteHandle[data-event="${i}"][data-mode="tab"][data-string="3"]`);
await note(0).click();await button('주법 도구 열기').click();
await button('¼').click();await button('벤드 올림').click();assert.equal(await dialog.locator('.scoreBendAmount').textContent(),'¼');
await button('½').click();await button('벤드 올렸다 내림').click();assert.equal(await dialog.locator('.scoreBendAmount').textContent(),'½');
await page.screenshot({path:`artifacts/technique-quick/${width}-palette.png`});
await button('퀵으로 보내기').click();await button('슬라이드').click();
const quick=dialog.getByRole('complementary',{name:'주법 퀵창'});await quick.getByRole('button',{name:'슬라이드',exact:true}).click();assert.equal(await dialog.locator('[data-slide-from]').count(),1);
await note(1).click();await quick.getByRole('button',{name:'슬라이드',exact:true}).click();assert.equal(await dialog.locator('[data-slide-from]').count(),2);
await quick.getByRole('button',{name:'주법 퀵창 접기'}).click();await button('주법 퀵창 열기').click();assert.equal(await quick.getByRole('button',{name:'슬라이드',exact:true}).count(),1);
await quick.getByRole('button',{name:'퀵창 반대쪽에 부착'}).click();assert.equal(await quick.evaluate(n=>n.style.left),'0px');
await page.screenshot({path:`artifacts/technique-quick/${width}-quick.png`});
assert.deepEqual(errors,[]);console.log(width,'bend amounts, compact palette, quick registration and repeated SL application, docking passed');await page.close();
}}finally{await browser.close();}
