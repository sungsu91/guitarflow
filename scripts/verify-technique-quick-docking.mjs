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
assert.equal(await dialog.locator('.techniqueQuickDock').count(),0);
await note(0).click();await button('주법 도구 열기').click();
await button('퀵으로 보내기').click();await button('슬라이드').click();await button('해머온').click();
assert.equal(await button('퀵으로 보내기').getAttribute('aria-pressed'),'true');
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('fretiva.editor.quickTechniques')).length),2);
if(width===390){const sheet=await dialog.locator('.mobileScoreSmallSheet:has(.mobileTechniqueTools)').boundingBox();const score=await dialog.locator('.etudeEditorPreview').boundingBox();assert.ok(sheet.y>=score.y+score.height-2);}
await button('퀵창 열기').click();const quick=dialog.getByRole('complementary',{name:'주법 퀵창'});
assert.equal(await quick.getByRole('button',{name:'슬라이드',exact:true}).count(),1);
assert.equal(await quick.getByRole('button',{name:'퀵창 반대쪽에 부착'}).count(),0);
await quick.getByRole('button',{name:'주법 퀵창 접기'}).click();
for(const [x,y,edge] of [[2,400,'left'],[width/2,2,'top'],[width/2,998,'bottom'],[width-2,400,'right']]){const r=await quick.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(x,y,{steps:12});await page.mouse.up();assert.equal(await quick.evaluate((n,e)=>n.style[e],edge),'0px');}
await button('주법 퀵창 열기').click();
await page.screenshot({path:`artifacts/technique-quick/${width}-updated.png`});
assert.deepEqual(errors,[]);console.log(width,'bend amounts, compact palette, quick registration and repeated SL application, docking passed');await page.close();
}}finally{await browser.close();}
