import { chromium } from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
export { assert };
export const base = process.env.PARITY_URL || 'http://127.0.0.1:5186';
export const out = 'work/desktop-parity';
export const browser = await chromium.launch({headless:true,channel:'msedge',args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
export const results = [];
export async function makePage(mobile=false, width=mobile?390:1440, height=mobile?844:900) {
  const page=await browser.newPage({viewport:{width,height},isMobile:mobile,hasTouch:mobile});
  page.setDefaultTimeout(7000);
  page.errors=[];
  page.on('pageerror',error=>page.errors.push(error.message));
  page.on('console',msg=>{if(msg.type()==='error'&&/application chunk failed|Rendered (more|fewer) hooks/.test(msg.text()))page.errors.push(msg.text());});
  page.on('dialog',dialog=>dialog.type()==='beforeunload'?dialog.accept():dialog.dismiss());
  await page.addInitScript(()=>{
    window.parityAudioStarts=0;
    window.parityStreams=[];
    if(navigator.mediaDevices?.getUserMedia){const acquire=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async(...args)=>{const stream=await acquire(...args);window.parityStreams.push(stream);return stream;};}
    const original=AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start=function(...args){window.parityAudioStarts++;return original.apply(this,args);};
  });
  return page;
}
export async function goto(page,route) {
  await page.goto(`${base}/?qa=${Date.now()}#${route}`,{waitUntil:'domcontentloaded',timeout:30000});
  await ready(page);
}
export async function ready(page) {
  await page.waitForFunction(()=>document.querySelector('main.app')&&!document.documentElement.classList.contains('app-is-launching'),null,{timeout:30000});
  await page.waitForTimeout(300);
}
export async function route(page,name){await page.evaluate(name=>{location.hash='#'+name;},name);await page.waitForTimeout(400);}
export async function snap(page,name){await mkdir(`${out}/screenshots`,{recursive:true});await page.screenshot({path:`${out}/screenshots/${name}.png`,fullPage:false});}
export async function controls(page){return page.evaluate(()=>[...document.querySelectorAll('button,input,select,summary,[role=button]')].filter(el=>el.getClientRects().length&&!el.closest('.desktopSidebar')).map(el=>({tag:el.tagName,role:el.getAttribute('role'),name:(el.getAttribute('aria-label')||el.textContent||el.placeholder||'').trim().slice(0,100),value:el.value,class:typeof el.className==='string'?el.className:''})));}
export async function step(page,name,fn){
  try{await fn();results.push({name,status:'passed',errors:[...page.errors]});console.log('PASS '+name);}
  catch(error){results.push({name,status:'failed',error:error.message,controls:await controls(page),errors:[...page.errors]});await snap(page,`FAIL-${name.replace(/[^a-z0-9_-]/gi,'-')}`);console.log('FAIL '+name+': '+error.message.slice(0,200));}
}
export async function finish(name){await mkdir(out,{recursive:true});await writeFile(`${out}/${name}.json`,JSON.stringify(results,null,2));await browser.close();if(results.some(r=>r.status==='failed'||r.errors?.length))process.exitCode=1;}
export const button=(page,name)=>page.getByRole('button',{name,exact:true});
