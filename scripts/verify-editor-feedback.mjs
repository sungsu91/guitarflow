import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';
const {chromium}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});await mkdir('artifacts/editor-feedback',{recursive:true});
try{for(const [width,height] of [[360,800],[390,844],[444,849]]){
 const p=await b.newPage({viewport:{width,height},isMobile:true,hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>localStorage.setItem('rifflabThemeMode','light'));await p.goto('http://127.0.0.1:5173/#etudes');await p.getByRole('button',{name:/간단 악보 만들기/}).click();await p.locator('[data-draw-count]').first().waitFor();const d=p.getByRole('dialog',{name:'악보 편집',exact:true}),btn=name=>d.getByRole('button',{name,exact:true});
 const doc=await p.evaluate(async()=>{const m=await import('/src/etudes/scoreModel.js'),c=await import('/src/etudes/editorCommands.js');let doc=m.createBlankDocument();for(let i=0;i<4;i++)doc=c.enterFret(doc,{bar:0,event:i,string:5},i+3);doc.measures[0].events[0].duration='2';doc.measures[0].events[1].duration='2';return doc;});
 await p.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'overlap.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(doc))});
 const feedback=p.locator('.mobileEditorFeedback'),bounds=await feedback.boundingBox(),canvas=await p.locator('[data-score-input]').boundingBox();
 await btn('입력 문제 확인').click();assert.match(await feedback.innerText(),/앞 음과 겹침/);assert(!/event-[\da-f-]+/.test(await feedback.innerText()));assert.equal(await p.locator('.mobileEditorNotice').count(),0);
 const hitTests=await d.locator('button:visible').evaluateAll(buttons=>buttons.filter(button=>!button.disabled).map(button=>{const r=button.getBoundingClientRect(),at=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {label:button.getAttribute('aria-label')??button.textContent,hit:at===button||button.contains(at)};}));assert(hitTests.every(t=>t.hit),JSON.stringify(hitTests.filter(t=>!t.hit)));
 await btn('TAB만').click();assert.equal(await btn('TAB만').getAttribute('aria-pressed'),'true');await btn('오선보+TAB').click();
 // A notice must neither move the paper nor require dismissal to use tools.
 assert.deepEqual(await p.locator('[data-score-input]').boundingBox(),canvas);assert.deepEqual(await feedback.boundingBox(),bounds);
 if(width===390)await p.screenshot({path:'artifacts/editor-feedback/390-warning.png'});
 await p.waitForTimeout(3350);assert.equal(await p.locator('.mobileEditorFeedbackText').innerText(),'');assert.deepEqual(await p.locator('[data-score-input]').boundingBox(),canvas);assert.deepEqual(await feedback.boundingBox(),bounds);
 await btn('악보 저장').click();assert((await p.locator('.mobileEditorFeedbackText').innerText()).length>0);await btn('빔 범위 선택').click();assert.equal(await btn('빔 범위 선택').getAttribute('aria-pressed'),'true');assert.deepEqual(errors,[]);console.log({width,buttonsTouchable:true,noOverlay:true,noLayoutShift:true,autoDismiss:true,errors});await p.close();
}}finally{await b.close();}
