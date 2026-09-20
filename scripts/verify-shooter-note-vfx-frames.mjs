import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{const page=await browser.newPage({viewport:{width:650,height:430}});await page.goto('http://127.0.0.1:5177/');
await page.waitForTimeout(2500);await page.evaluate(async()=>{
const {default:React}=await import('/node_modules/.vite/deps/react.js');const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');const {createRoot}=ReactDOM;const {NeonNote}=await import('/src/shooter/noteVfx/NeonNote.jsx');
const host=document.createElement('div');host.style='position:fixed;inset:0;background:#171420;z-index:99999;padding:24px;font:14px Arial;color:#bbb;display:grid;grid-template-columns:repeat(5,120px);grid-auto-rows:170px';document.body.append(host);
createRoot(host).render(React.createElement(React.Fragment,null,...['E2','E3','B3','D#2','A2'].map(pitch=>React.createElement('div',{key:pitch,style:{position:'relative',width:120,height:120}},React.createElement(NeonNote,{pitch}))),...[0,90,180,290,390].map((time,i)=>React.createElement('div',{key:time,style:{position:'relative',width:120,height:120},'data-frame':time},React.createElement(NeonNote,{pitch:'E2',breaking:true}),React.createElement('div',{style:{position:'absolute',top:130,left:20}},`${i+1} · ${time}ms`)))));
});await page.waitForTimeout(150);
await page.evaluate(()=>{document.querySelectorAll('[data-frame]').forEach(el=>el.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=Number(el.dataset.frame)}));});
assert.deepEqual(await page.locator('.noteVfxPitch').allTextContents(),['E2','E3','B3','D#2','A2','E2','E2','E2','E2','E2']);
const labels=await page.locator('.noteVfxPitch').evaluateAll(els=>els.slice(0,5).map(e=>{const b=e.getBBox();return {x:b.x,y:b.y,w:b.width,h:b.height};}));assert.ok(labels.every(b=>b.x>=22&&b.x+b.w<=78));
await page.screenshot({path:'artifacts/note-vfx/design-review-only.png'});console.log({labels,frames:5});
}finally{await browser.close();}


