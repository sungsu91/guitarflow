import test from 'node:test';
import assert from 'node:assert/strict';
import {createPdfPageCache,pdfRasterKey} from '../src/pdf/pdfPageCache.js';

const image=(documentKey,pageNumber,side=10)=>({documentKey,pageNumber,cropKey:'full',canvas:{width:side,height:side},size:{width:side,height:side}});
test('closing and reopening retains one document, even with a fresh IndexedDB Blob instance',async()=>{
 let loaded=0,destroyed=0;const cache=createPdfPageCache({load:async()=>{loaded++;return{destroy(){destroyed++;}};}});
 const first=cache.acquire('id:hash',new Blob(['a']));const doc=await first.promise;first.release();
 const second=cache.acquire('id:hash',new Blob(['a']));assert.equal(await second.promise,doc);assert.equal(loaded,1);assert.equal(destroyed,0);second.release();cache.clear();await Promise.resolve();assert.equal(destroyed,1);
});
test('active documents survive eviction and unused workers are bounded',async()=>{
 const cache=createPdfPageCache({maxDocuments:1,load:async()=>({destroy(){}})}),a=cache.acquire('a',new Blob()),b=cache.acquire('b',new Blob());await Promise.all([a.promise,b.promise]);assert.equal(cache.inspect().documents,2);a.release();assert.equal(cache.inspect().documents,1);b.release();cache.clear();
});
test('failed open retries and bitmap memory uses LRU instead of accumulating a whole PDF',async()=>{
 let tries=0;const cache=createPdfPageCache({maxBytes:800,load:async()=>{if(!tries++)throw Error('failed');return{destroy(){}};}});
 const first=cache.acquire('a',new Blob());await assert.rejects(first.promise);first.release();const next=cache.acquire('a',new Blob());await next.promise;
 cache.put('p1',image('a',1));cache.put('p2',image('a',2));cache.get('p1');cache.put('p3',image('a',3));assert.equal(cache.get('p2'),undefined);assert.equal(cache.inspect().bytes,800);cache.invalidate('a',1);assert.ok(cache.get('p3'));next.release();cache.clear();
});
test('page crop and zoom use distinct raster keys; overlay edits never invalidate other pages',()=>{
 const options={width:374,height:600,zoom:100,mobile:true,crop:{x:0,y:0,width:1,height:1},dpr:2};
 const key=pdfRasterKey('a',1,options);assert.notEqual(key,pdfRasterKey('a',1,{...options,zoom:150}));assert.notEqual(key,pdfRasterKey('a',1,{...options,crop:{...options.crop,y:.1,height:.9}}));assert.notEqual(key,pdfRasterKey('a',2,options));assert.equal(key,pdfRasterKey('a',1,{...options,notes:[{text:'memo'}]}));
});
