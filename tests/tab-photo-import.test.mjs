import test from 'node:test';
import assert from 'node:assert/strict';
import {imageHeaderSize,tabSourceKind,loadTabImage} from '../src/pdf/tab-import/imageTabSource.js';

function png(width=600,height=400){
  const bytes=new Uint8Array(24);bytes.set([137,80,78,71,13,10,26,10]);const view=new DataView(bytes.buffer);
  view.setUint32(12,0x49484452);view.setUint32(16,width);view.setUint32(20,height);return bytes;
}
test('read dimensions from PNG and baseline/progressive JPEG before pixel decoding',()=>{
  assert.deepEqual(imageHeaderSize(png()),{width:600,height:400});
  for(const marker of [0xc0,0xc2]){
    const jpeg=Uint8Array.from([255,216,255,0xe1,0,4,0,0,255,marker,0,8,8,1,144,2,88,1]);
    assert.deepEqual(imageHeaderSize(jpeg),{width:600,height:400});
  }
  for(const bytes of [new Uint8Array(),Uint8Array.from([255,216,255,0xe1,0,0]),png().slice(0,12)])assert.throws(()=>imageHeaderSize(bytes),/사진 파일/);
});
test('source selection supports JPG/PNG and extensionless camera JPEG, rejects unsupported and oversized files',()=>{
  for(const name of ['photo.JPG','photo.JPEG','photo.png'])assert.equal(tabSourceKind({name,size:1}),'image');
  assert.equal(tabSourceKind({name:'camera',size:1,type:'image/jpeg'}),'image');
  assert.equal(tabSourceKind({name:'music.PDF',size:1}),'pdf');
  assert.throws(()=>tabSourceKind({name:'photo.HEIC',type:'image/heic',size:1}),/HEIC/);
  assert.throws(()=>tabSourceKind({name:'large.jpg',size:41*1024*1024}),/40MB/);
});
async function fakeDecoder(run){
  const oldImage=globalThis.Image,create=URL.createObjectURL,revoke=URL.revokeObjectURL,images=[],released=[];
  globalThis.Image=class{constructor(){images.push(this);}src='';naturalWidth=600;naturalHeight=400;};
  URL.createObjectURL=()=> 'blob:test';URL.revokeObjectURL=url=>released.push(url);
  try{await run(images,released);}finally{globalThis.Image=oldImage;URL.createObjectURL=create;URL.revokeObjectURL=revoke;}
}
const file=bytes=>new File([bytes],'test.png',{type:'image/png'});
test('oversized pixel headers are rejected without creating a decoder',()=>fakeDecoder(async images=>{
  await assert.rejects(loadTabImage(file(png(20000,20000))),/5천만/);assert.equal(images.length,0);
}));
test('cancelled photo decoding releases its URL and stops the image load',()=>fakeDecoder(async(images,released)=>{
  const controller=new AbortController(),pending=loadTabImage(file(png()),{signal:controller.signal});
  await new Promise(resolve=>setImmediate(resolve));controller.abort();
  await assert.rejects(pending,{name:'AbortError'});assert.equal(images[0].src,'');assert.deepEqual(released,['blob:test']);
}));
test('silent and broken photo decoders fail clearly and release their URLs',async()=>{
  await fakeDecoder(async(images,released)=>{await assert.rejects(loadTabImage(file(png()),{timeout:5}),/시간이 초과/);assert.equal(images[0].src,'');assert.deepEqual(released,['blob:test']);});
  await fakeDecoder(async(images,released)=>{const pending=loadTabImage(file(png()));await new Promise(resolve=>setImmediate(resolve));images[0].onerror();await assert.rejects(pending,/사진 파일/);assert.deepEqual(released,['blob:test']);});
});
test('completed previews retain their image until closed and cleanup is idempotent',()=>fakeDecoder(async(images,released)=>{
  const pending=loadTabImage(file(png()));await new Promise(resolve=>setImmediate(resolve));images[0].onload();
  const source=await pending;assert.equal(source.width,600);assert.equal(released.length,0);source.close();source.close();assert.deepEqual(released,['blob:test']);
}));
