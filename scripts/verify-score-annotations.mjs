import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/score-annotations',{recursive:true});
try{for(const width of [390,1440]){
 const p=await browser.newPage({viewport:{width,height:width===390?844:1000},isMobile:width===390,hasTouch:width===390});p.setDefaultTimeout(10000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5173/#etudes');await p.getByRole('button',{name:'악보 만들기',exact:true}).click();
 const fixture=await p.evaluate(async()=>{const m=await import('/src/etudes/scoreModel.js');const d=m.createBlankDocument();d.title='이동·코드명 확인';d.measures[0].sectionLabel='INT';d.measures[0].events[0]={...d.measures[0].events[0],blank:false,rest:false,notes:[0,1,2,2,0].map((fret,i)=>({id:'n'+i,string:i+1,fret,midi:d.tuning[i]+fret,locked:true}))};return d;});
 await p.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'annotations.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
 if(await p.locator('.mobileEditorNotice').count())await p.locator('.mobileEditorNotice').click();
 const section=p.locator('[data-score-annotation="section"]');await section.waitFor();
 const geometry=await section.evaluate(n=>{const r=n.querySelector('rect'),number=n.ownerSVGElement.querySelector('.etudeMeasureNumber');return {left:+r.getAttribute('x'),number:+number.getAttribute('x'),bottom:+r.getAttribute('y')+ +r.getAttribute('height'),numberY:+number.getAttribute('y'),width:r.getAttribute('width')};});assert.equal(geometry.left,geometry.number);assert.ok(geometry.bottom<geometry.numberY);
 const box=await section.boundingBox();if(width===390){const cdp=await p.context().newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width/2+7*i,y:box.y+box.height/2+2*i}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x+box.width/2+35,box.y+box.height/2+12,{steps:5});await p.mouse.up();}
 await p.waitForTimeout(150);assert.notEqual(await section.getAttribute('transform'),'translate(0 0)');
 await p.getByRole('button',{name:'코드표',exact:true}).click();await p.getByRole('menuitem',{name:'코드명',exact:true}).click();
 const harmony=p.locator('[data-score-annotation="harmony"]');await harmony.waitFor();assert.match(await harmony.textContent(),/Am/);
 await p.locator('[data-bar-index="0"] .etudeNoteHandle[data-event="0"][data-mode="tab"][data-string="2"]').click();await p.getByRole('button',{name:'프렛 3',exact:true}).click();await p.waitForTimeout(250);assert.match(await harmony.textContent(),width===390?/Asus4/:/Am7/);
 await harmony.click();const input=p.getByRole('textbox',{name:'코드명 직접 입력'});await input.fill('Am(add9)');await input.press('Enter');await p.waitForTimeout(200);assert.match(await harmony.textContent(),/Am\(add9\)/);
 await p.screenshot({path:`artifacts/score-annotations/name-${width}.png`});
 await p.getByRole('button',{name:'코드표',exact:true}).click();await p.getByRole('menuitem',{name:'코드표',exact:true}).click();await p.getByLabel('코드표 불러오기').selectOption({label:'C'});await p.getByRole('button',{name:'악보에 붙이기',exact:true}).click();
 const chord=p.locator('[data-score-annotation="chord"]');await chord.waitFor();const cb=await chord.boundingBox();await p.mouse.move(cb.x+cb.width/2,cb.y+cb.height/2);await p.mouse.down();await p.mouse.move(cb.x+cb.width/2+24,cb.y+cb.height/2+10,{steps:5});await p.mouse.up();await p.waitForTimeout(150);assert.notEqual(await chord.getAttribute('transform'),'translate(0 0)');
 await p.screenshot({path:`artifacts/score-annotations/diagram-${width}.png`});
 const transform=await chord.getAttribute('transform');
 const popupPromise=p.waitForEvent('popup');await p.getByRole('button',{name:'A4 인쇄 미리보기',exact:true}).first().click();const popup=await popupPromise;await popup.locator('.a4Sheet [data-score-annotation="chord"]').waitFor();assert.equal(await popup.locator('.a4Sheet [data-score-annotation="chord"]').first().getAttribute('transform'),transform);await popup.close();
 await p.getByRole('button',{name:width===390?'악보 저장':'이 브라우저에 저장',exact:true}).click();await p.getByRole('button',{name:'저장하기',exact:true}).click();await p.waitForTimeout(200);
 const saved=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records)[0].document);assert.ok(saved.measures[0].annotationOffsets.section.x>0);assert.ok(saved.measures[0].annotationOffsets.chord.x>0);
 await p.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'saved.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});await p.waitForTimeout(200);assert.equal(await p.locator('[data-score-annotation="chord"]').getAttribute('transform'),transform);
 assert.deepEqual(errors,[]);console.log('PASS',width,geometry);await p.close();
}}finally{await browser.close();}
