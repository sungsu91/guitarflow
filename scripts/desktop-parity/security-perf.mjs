import {assert,makePage,goto,route,browser,out} from './helpers.mjs';
import {writeFile} from 'node:fs/promises';
const result={requests:[],loads:[]};
for(const path of ['/__rifflab/map-editor/layout','/__rifflab/shooter-editor/note-monster-tuning','/__rifflab/shooter-editor/effect-tuning']){
 for(const [kind,headers,expected]of [
  ['foreign-origin',{'Content-Type':'application/json',Origin:'https://example.invalid','Sec-Fetch-Site':'cross-site'},403],
  ['simple-form',{'Content-Type':'text/plain'},403],
  ['same-origin-invalid-json',{'Content-Type':'application/json',Origin:'http://127.0.0.1:5186','Sec-Fetch-Site':'same-origin'},400],
 ]){const response=await fetch('http://127.0.0.1:5186'+path,{method:'POST',headers,body:'{invalid'});assert.equal(response.status,expected);result.requests.push({path,kind,status:response.status});}
}
for(const [variant,port]of [['eager',5189],['lazy',5190]])for(let sample=0;sample<3;sample++){
 const p=await makePage(false);const started=Date.now();await p.goto(`http://127.0.0.1:${port}/#fretboard`);await p.waitForFunction(()=>document.querySelector('main.app')&&!document.documentElement.classList.contains('app-is-launching'));await p.waitForTimeout(500);
 const data=await p.evaluate(()=>{const r=performance.getEntriesByType('resource').filter(r=>/\.(js|css)(?:\?|$)/.test(r.name));return{bytes:r.reduce((s,r)=>s+r.decodedBodySize,0),count:r.length,audioResources:r.filter(r=>/AudioStudio/.test(r.name)).map(r=>r.name.split('/').at(-1)),heap:performance.memory?.usedJSHeapSize};});
 result.loads.push({variant,sample,readyMs:Date.now()-started,...data});assert.equal(data.audioResources.length,0);
 if(variant==='lazy'&&sample===0){await route(p,'audio-studio');await p.waitForSelector('.audioStudio');result.lazyAudioLoads=await p.evaluate(()=>performance.getEntriesByType('resource').filter(r=>/AudioStudio/.test(r.name)).map(r=>({name:r.name.split('/').at(-1),bytes:r.decodedBodySize})));assert.ok(result.lazyAudioLoads.length>=2);}
 await p.close();
}
const p=await makePage(true);await p.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Test denial','NotAllowedError');};});await goto(p,'tuner');await p.waitForTimeout(700);const body=await p.locator('body').innerText();assert.match(body,/권한|허용/);assert.deepEqual(p.errors,[]);result.deniedMicrophone={explained:true,errors:p.errors};await p.close();
await writeFile(`${out}/security-perf.json`,JSON.stringify(result,null,2));await browser.close();console.log(JSON.stringify(result,null,2));
