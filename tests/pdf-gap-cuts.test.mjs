import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeGapCuts,retainedBands,pageVisibleHeight} from '../src/pdf/pdfGapCuts.js';
import {pageCrop,projectRect,originalPoint,normalizePageEdits} from '../src/pdf/pdfAnnotations.js';
import {pdfRasterKey} from '../src/pdf/pdfPageCache.js';
import {exportPdfPractice,readBackup} from '../src/pdf/pdfLibrary.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('multiple gaps merge, compact geometry and keep annotation original coordinates reversible',()=>{
 const cuts=normalizeGapCuts([{start:.4,end:.5},{start:.2,end:.3},{start:.25,end:.32}]);assert.deepEqual(cuts,[{start:.2,end:.32},{start:.4,end:.5}]);
 const crop=pageCrop({cuts}),rect={x:.1,y:.6,width:.8,height:.1},projected=projectRect(rect,crop);
 close(pageVisibleHeight(crop),.78);close(projected.y,.38/.78);close(projected.height,.1/.78);
 const original=originalPoint(projected,crop);close(original.y,rect.y);close(original.x,rect.x);assert.equal(rect.y,.6);
 assert.deepEqual(retainedBands(crop),[{start:0,end:.2},{start:.32,end:.4},{start:.5,end:1}]);
});
test('cuts compose with outside margins and invalidate only the corresponding raster cache key',()=>{
 const crop=pageCrop({margins:{top:.1,bottom:.1,left:.1,right:.1},cuts:[{start:.3,end:.4}]}),options={width:800,height:600,zoom:'fit',mobile:false,crop};
 close(pageVisibleHeight(crop),.7);close(originalPoint(projectRect({x:.2,y:.6,width:0,height:0},crop),crop).y,.6);
 assert.notEqual(pdfRasterKey('doc',1,options),pdfRasterKey('doc',1,{...options,crop:{...crop,cuts:[]}}));
 assert.deepEqual(normalizeGapCuts([{start:0,end:1}]),[]);assert.deepEqual(normalizeGapCuts([{start:NaN,end:.2}]),[]);
});
test('practice files retain cuts and untouched PDF bytes through metadata normalization',async()=>{
 const pageEdits={1:{cuts:[{start:.2,end:.3},{start:.6,end:.65}],notes:[{id:'n',x:.2,y:.7,text:'note',size:.03,color:'brown'}]}};
 const source=new Blob(['%PDF-test']);const [{record,pdfBlob}]=await readBackup(exportPdfPractice({pageEdits},source));
 assert.deepEqual(normalizePageEdits(record.pageEdits,1)[1].cuts,pageEdits[1].cuts);assert.equal(await pdfBlob.text(),await source.text());
});
