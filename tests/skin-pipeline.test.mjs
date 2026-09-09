import test from 'node:test';
import assert from 'node:assert/strict';
import {createSkinPipeline} from '../src/shooter/recording/skinPipeline.js';

test('skin results stay paired with their own source frame; stale warm-up is discarded and resources stop', async () => {
  const previousWorker=globalThis.Worker,previousBitmap=globalThis.createImageBitmap;
  let worker,id=0;const closed=[],rendered=[];
  const video={readyState:2,videoWidth:666,currentTime:1};
  globalThis.createImageBitmap=async()=>{video.currentTime+=.033;const frame=++id;return{id:frame,close(){closed.push(frame);}};};
  globalThis.Worker=class {
    constructor(){worker=this;}
    postMessage(data){
      queueMicrotask(()=>{
        if(data.type==='init')this.onmessage({data:{type:'ready'}});
        else this.onmessage({data:{type:'result',bitmap:data.bitmap,mask:data.bitmap.id,timestamp:data.timestamp-(data.bitmap.id===1?500:0),elapsed:10}});
      });
    }
    terminate(){this.terminated=true;}
  };
  let pipeline;
  try{
    pipeline=createSkinPipeline(video,(bitmap,level,mask)=>{
      assert.equal(bitmap.id,mask);rendered.push(bitmap.id);return{id:bitmap.id,level};
    });
    assert.equal(pipeline.frame(2),null);
    await new Promise(resolve=>setTimeout(resolve,120));
    assert.ok(rendered.length>0);
    assert.ok(!rendered.includes(1),'Do not show the seconds-old first inference frame');
    assert.equal(pipeline.frame(2).level,2);
    pipeline.dispose();assert.equal(worker.terminated,true);
    assert.ok(closed.includes(1));
    const late={id:999,close(){closed.push(999);}};
    worker.onmessage({data:{type:'result',bitmap:late}});
    assert.ok(closed.includes(999));assert.ok(!rendered.includes(999));
  }finally{pipeline?.dispose();globalThis.Worker=previousWorker;globalThis.createImageBitmap=previousBitmap;}
});
