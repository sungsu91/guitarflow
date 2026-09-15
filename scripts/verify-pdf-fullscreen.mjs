import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/pdf-fullscreen',{recursive:true});
try{for(const mobile of [false,true]){
 const c=await b.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
 if(mobile)await c.addInitScript(()=>Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined,configurable:true}));
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5173/#etudes');await p.getByLabel('PDF 파일 선택',{exact:true}).setInputFiles('C:/Users/User/Desktop/sheet music/Flower Dance.pdf');
 const d=p.getByRole('dialog',{name:'PDF 악보 정보'});await d.getByRole('button',{name:'기기에 저장',exact:true}).click();await d.waitFor({state:'hidden'});
 await p.getByRole('button',{name:'Flower Dance 연습하기',exact:true}).click();await p.locator('.launchSplash').waitFor({state:'hidden'});
 const ready=()=>p.waitForFunction(()=>document.querySelector('.pdfScoreStage>.pdfViewport')?.getAttribute('aria-busy')==='false');await ready();
 await p.locator('.pdfScoreStage>.pdfViewport').evaluate(e=>e.dataset.identity='retained');
 await p.getByRole('button',{name:'전체화면',exact:true}).click();await p.locator('.pdfScoreStage.is-fullscreen').waitFor();await ready();
 const bounds=await p.locator('.pdfScoreStage').evaluate(e=>{const r=e.getBoundingClientRect(),v=e.querySelector('.pdfViewport');return {width:r.width,height:r.height,windowWidth:innerWidth,windowHeight:innerHeight,native:document.fullscreenElement===e,popover:e.matches(':popover-open'),onlyScore:!e.querySelector('.pdfSettings,.pdfTransport,.pdfViewTools'),retained:v.dataset.identity==='retained',scrolls:v.scrollHeight>v.clientHeight};});
 console.log(JSON.stringify(bounds));await p.screenshot({path:'artifacts/pdf-fullscreen/debug.png'});assert.equal(bounds.onlyScore,true);assert.ok(bounds.retained);assert.ok(Math.abs(bounds.width-bounds.windowWidth)<2);assert.ok(Math.abs(bounds.height-bounds.windowHeight)<2);assert.equal(mobile?bounds.popover:bounds.native,true);
 const viewport=p.locator('.pdfScoreStage>.pdfViewport');await viewport.evaluate(e=>e.scrollTop=100);if(bounds.scrolls)assert.ok(await viewport.evaluate(e=>e.scrollTop)>0);
 await p.getByRole('button',{name:'전체화면 다음 페이지',exact:true}).click();await p.waitForFunction(()=>document.querySelector('[data-page="2"]'));await ready();
 await p.screenshot({path:`artifacts/pdf-fullscreen/${mobile?'390-fallback':'1440-native'}.png`});
 await p.getByRole('button',{name:'악보 전체화면 닫기',exact:true}).click();await p.locator('.pdfScoreStage.is-fullscreen').waitFor({state:'hidden'});if(mobile)assert.equal(await p.getByLabel('PDF 현재 배율').textContent(),'100%');else assert.equal(await p.getByLabel('PDF 확대',{exact:true}).inputValue(),'fit');
 await p.getByRole('button',{name:'전체화면',exact:true}).click();await p.locator('.pdfScoreStage.is-fullscreen').waitFor();await p.keyboard.press('Escape');await p.locator('.pdfScoreStage.is-fullscreen').waitFor({state:'hidden'});
 assert.equal(await p.evaluate(()=>document.body.style.overflow),'');assert.deepEqual(errors,[]);console.log(mobile?'390 fallback':'1440 native',JSON.stringify(bounds),'page navigation, close, Escape passed');await c.close();
}}finally{await b.close();}

