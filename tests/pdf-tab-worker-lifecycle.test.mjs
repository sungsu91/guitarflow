import test from 'node:test';
import assert from 'node:assert/strict';
import {createOcrWorker} from '../src/pdf/tab-import/ocrWorkerClient.js';
import {hasRotatedTabText} from '../src/pdf/tab-import/pdfText.js';
import {summarizeAnalysis} from '../src/pdf/tab-import/recognition.js';

async function withWorker(behavior,run){
 const oldWorker=globalThis.Worker,oldLocation=globalThis.location,workers=[];
 globalThis.location={href:'http://localhost/'};
 globalThis.Worker=class{
  constructor(){this.closed=false;workers.push(this);}
  terminate(){this.closed=true;}
  postMessage(message){queueMicrotask(()=>behavior(this,message));}
 };
 try{await run(workers);}finally{globalThis.Worker=oldWorker;globalThis.location=oldLocation;}
}
const resolve=(worker,message)=>worker.onmessage({data:{jobId:message.jobId,status:'resolve',data:{}}});
test('cancel while OCR assets are stalled terminates the worker immediately',()=>withWorker(()=>{},async workers=>{
 const controller=new AbortController(),ready=createOcrWorker(controller.signal);controller.abort();
 await assert.rejects(ready,{name:'AbortError'});assert.equal(workers[0].closed,true);
}));
test('initialization rejection and worker error each terminate their worker',async()=>{
 for(const fail of [(w,m)=>w.onmessage({data:{jobId:m.jobId,status:'reject',data:'missing asset'}}),w=>w.onerror({message:'worker crash'})])await withWorker(fail,async workers=>{
  await assert.rejects(createOcrWorker(),/TAB 인식 엔진/);assert.equal(workers[0].closed,true);
 });
});
test('a runtime crash rejects all waiting jobs rather than hanging after initialization',()=>withWorker((w,m)=>m.action==='setParameters'?w.onerror({message:'runtime failure'}):resolve(w,m),async workers=>{
 const worker=await createOcrWorker(),jobs=[worker.setParameters({}),worker.setParameters({})];
 for(const job of jobs)await assert.rejects(job,/runtime failure/);assert.equal(workers[0].closed,true);
}));
test('silent initialization and runtime jobs have bounded deadlines and release workers',async()=>{
 await withWorker(()=>{},async workers=>{await assert.rejects(createOcrWorker(undefined,{loadTimeout:10}),/시간 초과/);assert(workers[0].closed);});
 await withWorker((w,m)=>{if(m.action!=='setParameters')resolve(w,m);},async workers=>{
  const worker=await createOcrWorker(undefined,{jobTimeout:10});await assert.rejects(worker.setParameters({}),/시간 초과/);assert(workers[0].closed);
 });
});
test('an already aborted request never creates an OCR worker',()=>withWorker(resolve,async workers=>{
 const controller=new AbortController();controller.abort();await assert.rejects(createOcrWorker(controller.signal),{name:'AbortError'});assert.equal(workers.length,0);
}));
test('native TAB orientation rejects inverted/sideways numbers without rejecting sparse page labels',()=>{
 const content={items:Array.from({length:12},()=>({str:'12',transform:[10,0,0,10,20,30]}))};
 assert.equal(hasRotatedTabText(content,{transform:[1,0,0,-1,0,0]}),false);
 for(const transform of [[-1,0,0,1,0,0],[0,1,1,0,0,0],[0,-1,-1,0,0,0]])assert.equal(hasRotatedTabText(content,{transform}),true);
 assert.equal(hasRotatedTabText({items:content.items.slice(0,2)},{transform:[-1,0,0,1,0,0]}),false);
});
test('coverage summary explicitly lists pages with no imported measures',()=>{
 const summary=summarizeAnalysis([{page:1,staffs:[]},{page:2,staffs:[{measures:[]}]}]);
 assert.deepEqual(summary.pagesWithoutTab,[1,2]);assert.equal(summary.pages,2);
});
