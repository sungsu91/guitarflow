import test from 'node:test';
import assert from 'node:assert/strict';
import {geometryWorkerTask} from '../src/pdf/tab-import/geometryWorkerTask.js';
const baseUrl='https://example.test/',manifest={protocol:1,url:'/assets/geometry.worker-current.js'};
class WorkerDouble{
 constructor(){this.messages=[];this.stopped=false;}
 postMessage(data,transfer){this.messages.push(structuredClone(data,{transfer}));queueMicrotask(()=>this.onmessage({data:{result:{staffs:[1]}}}));}
 terminate(){this.stopped=true;}
 ready(){this.onmessage({data:{ready:1}});}
}
test('waits for readiness before transferring pixels and never requests an update on success',async()=>{
 const w=new WorkerDouble(),pixels=new ArrayBuffer(16);let fetched=0;
 const result=geometryWorkerTask(()=>w,{rgba:pixels},null,{baseUrl,fetcher:()=>{fetched++;}});
 assert.equal(pixels.byteLength,16);assert.equal(w.messages.length,0);w.ready();assert.equal(pixels.byteLength,0);
 assert.deepEqual(await result,{staffs:[1]});assert.equal(fetched,0);assert(w.stopped);
});
test('recovers an unavailable old worker exactly once without losing the original pixels',async()=>{
 const old=new WorkerDouble(),pixels=new Uint8Array([4,5,6]).buffer;let fetched=0,replacement;
 class Current extends WorkerDouble{constructor(url,opts){super();replacement=this;assert.equal(url.href,baseUrl.slice(0,-1)+manifest.url);assert.equal(opts.type,'module');queueMicrotask(()=>this.ready());}}
 const result=geometryWorkerTask(()=>old,{rgba:pixels},null,{baseUrl,WorkerClass:Current,fetcher:async(url,options)=>{fetched++;assert.equal(options.cache,'no-store');assert.equal(pixels.byteLength,3);assert(old.stopped);return {ok:true,json:async()=>manifest};}});
 old.onerror({preventDefault(){}});assert.deepEqual(await result,{staffs:[1]});assert.equal(fetched,1);assert.deepEqual([...new Uint8Array(replacement.messages[0].rgba)],[4,5,6]);assert(replacement.stopped);
});
test('rejects incompatible and cross-origin manifests while preserving untransferred pixels',async()=>{
 for(const m of [{...manifest,protocol:2},{...manifest,url:'https://untrusted.test/assets/geometry.worker-current.js'},{...manifest,url:'/index.html'}]){
  const w=new WorkerDouble(),pixels=new ArrayBuffer(8);const p=geometryWorkerTask(()=>w,{rgba:pixels},null,{baseUrl,fetcher:async()=>({ok:true,json:async()=>m})});w.onerror({});await assert.rejects(p,/선택한 파일은 유지/);assert.equal(pixels.byteLength,8);
 }
});
test('cancellation stops recovery and processing failures never resubmit detached pixels',async()=>{
 const abort=new AbortController(),w=new WorkerDouble();let signal;
 const p=geometryWorkerTask(()=>w,{rgba:new ArrayBuffer(4)},abort.signal,{baseUrl,fetcher:(_,options)=>{signal=options.signal;return new Promise(()=>{});}});w.onerror({});abort.abort();await assert.rejects(p,{name:'AbortError'});assert(signal.aborted);assert(w.stopped);
 const active=new WorkerDouble();active.postMessage=()=>{};let fetched=false;
 const failed=geometryWorkerTask(()=>active,{rgba:new ArrayBuffer(4)},null,{baseUrl,fetcher:()=>{fetched=true;}});active.ready();active.onerror({message:'calculation failed'});await assert.rejects(failed,/calculation failed/);assert(!fetched);
});
