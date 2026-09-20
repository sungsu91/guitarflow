import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto('http://127.0.0.1:5177/');await page.waitForTimeout(2000);
const result=await page.evaluate(async()=>{
const {default:React}=await import('/node_modules/.vite/deps/react.js');const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');const {NeonNoteBursts}=await import('/src/shooter/noteVfx/NeonNote.jsx');
const arena=document.createElement('div');arena.style='position:fixed;inset:0;width:390px;height:844px';document.body.append(arena);const host=document.createElement('div');arena.append(host);const root=ReactDOM.createRoot(host);const nodes=new Map();const targets=Array.from({length:8},(_,id)=>({id,note:['E2','D#2','B3','A2'][id%4],defeated:true,impactX:50,impactY:25}));
for(const t of targets){const node=document.createElement('div');node.style=`position:absolute;left:0;top:0;width:120px;height:120px;transform:translate(${t.id*20}px,200px)`;arena.append(node);nodes.set(t.id,node);}
const refs={nodes:{current:nodes},arena:{current:arena}};const original=JSON.stringify(targets);let times=[];let running=true;const sample=t=>{times.push(t);if(running)requestAnimationFrame(sample);};requestAnimationFrame(sample);
root.render(React.createElement(NeonNoteBursts,{targets,...refs}));await new Promise(r=>setTimeout(r,100));const overlap=host.querySelectorAll('.noteVfxBurst').length;
root.render(React.createElement(NeonNoteBursts,{targets:[],...refs}));await new Promise(r=>setTimeout(r,50));const retained=host.querySelectorAll('.noteVfxBurst').length;
await new Promise(r=>setTimeout(r,450));const cleaned=host.querySelectorAll('.noteVfxBurst').length;running=false;root.unmount();arena.remove();
return {overlap,retained,cleaned,unchanged:original===JSON.stringify(targets),rafFrames:times.length};
});assert.equal(result.overlap,8);assert.equal(result.retained,8);assert.equal(result.cleaned,0);assert.equal(result.unchanged,true);assert.ok(result.rafFrames>10);console.log(result);
await page.setViewportSize({width:1366,height:768});await page.goto('http://127.0.0.1:5177/?shooterNoteVfx=1#shooter');await page.waitForTimeout(2000);console.log('desktop',await page.locator('.shooterArena').getAttribute('data-shooter-renderer'));
}finally{await browser.close();}
