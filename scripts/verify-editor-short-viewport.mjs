import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/editor-short-viewport',{recursive:true});const results=[];
try{for(const [width,height] of [[375,667],[375,650],[375,568],[375,500],[360,800],[390,844],[430,932],[1440,1000]]){
 const mobile=width<500,p=await browser.newPage({viewport:{width,height},isMobile:mobile,hasTouch:mobile}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5173/#etudes');await p.getByRole('button',{name:/악보 만들기/}).click();await p.locator('[data-draw-count]').first().waitFor();
 const editor=p.getByRole('dialog',{name:'악보 편집',exact:true});
 await editor.getByRole('button',{name:'한 줄 4마디',exact:true}).click();
 const geometry=await p.locator('.etudeEditorCanvas').evaluate(el=>{const r=el.getBoundingClientRect(),d=el.closest('dialog');return {height:r.height,top:r.top,bottom:r.bottom,scrollHeight:d.scrollHeight,clientHeight:d.clientHeight};});
 results.push({width,viewportHeight:height,...geometry});
 if(!process.env.BASELINE){
  assert(geometry.height>=(height<550?45:height<750?110:199),JSON.stringify(results.at(-1)));assert(geometry.top<height-100);
  assert(geometry.scrollHeight<=geometry.clientHeight+1,'The workspace must not scroll');
  const controls=await editor.locator('.mobileInputExtras>button,.mobileCursorPad>button,.mobileFretPad>button,.editorTransport>button').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().width).map(n=>{const r=n.getBoundingClientRect();return {text:n.textContent,top:r.top,bottom:r.bottom};}));
  assert(controls.every(r=>r.top>=0&&r.bottom<=height),JSON.stringify(controls));
 }
 await p.screenshot({path:`artifacts/editor-short-viewport/${width}-${height}${process.env.BASELINE?'-before':''}.png`});
 if(!process.env.BASELINE){
  await editor.getByRole('button',{name:'TAB',exact:true}).click();await editor.getByRole('button',{name:'프렛 7',exact:true}).click();
  await p.locator('.etudeNoteHandle[data-event="0"][data-mode="tab"][data-string="6"]').first().waitFor();
  const tempo=editor.getByLabel('악보 재생 BPM',{exact:true});
  await tempo.fill('80');await editor.getByRole('button',{name:'BPM 확인',exact:true}).click();assert.equal(await tempo.inputValue(),'80');
  const tempoBox=await tempo.boundingBox();assert(tempoBox.y>=0&&tempoBox.y+tempoBox.height<=height);
  assert.deepEqual(errors,[]);
 }
 await p.close();
}}finally{await browser.close();await writeFile(`artifacts/editor-short-viewport/${process.env.BASELINE?'before':'results'}.json`,JSON.stringify(results,null,2));}
console.log(results);
