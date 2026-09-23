import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});await mkdir('artifacts/groove-desktop',{recursive:true});
try{for(const width of [1920,1440,1024,390]){
 const p=await b.newPage({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5173/#metronome');await p.getByRole('button',{name:'3 그루브',exact:true}).click();
 if(width>=1024){for(let i=0;i<4;i++)await p.getByRole('button',{name:'줄 추가',exact:true}).click();const boxes=await p.locator('.grooveToneTrigger').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom}}));for(let i=1;i<boxes.length;i++)assert.ok(boxes[i].top-boxes[i-1].bottom>=5,'row buttons have a visible gap');}
 await p.getByRole('button',{name:'1행 음색',exact:true}).click();const popup=p.getByRole('dialog',{name:'1행 음색 선택'});await popup.waitFor();
 assert.equal(await popup.locator('.grooveToneChoice').count(),28);if(width>=1024)assert.deepEqual((await popup.locator('.grooveToneChoice>button:first-child').allTextContents()).slice(0,3),['하이햇','킥','스네어']);
 const geometry=await popup.evaluate(e=>({w:e.scrollWidth,cw:e.clientWidth,h:e.scrollHeight,ch:e.clientHeight,r:e.getBoundingClientRect().toJSON(),rows:new Set([...e.querySelectorAll('.grooveToneChoice')].map(n=>Math.round(n.getBoundingClientRect().top))).size}));
 if(width>=1024){assert.ok(geometry.h<=geometry.ch+1,JSON.stringify(geometry));assert.ok(geometry.w<=geometry.cw+1);if(width===1920)assert.equal(geometry.rows,4);}
 assert.ok(geometry.r.left>=0&&geometry.r.right<=width&&geometry.r.bottom<=900);
 await p.screenshot({path:`artifacts/groove-desktop/${width}.png`});await popup.getByRole('button',{name:'일렉트릭 스네어',exact:true}).click();assert.match(await p.getByRole('button',{name:'1행 음색',exact:true}).innerText(),/일렉트릭 스네어/);
 await p.getByRole('button',{name:'1행 음색',exact:true}).click();await p.keyboard.press('Escape');await popup.waitFor({state:'hidden'});assert.deepEqual(errors,[]);console.log('PASS',width,geometry.rows+' rows');await p.close();
}}finally{await b.close();}
