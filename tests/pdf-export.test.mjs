import test from 'node:test';
import assert from 'node:assert/strict';
import {exportEditedPdf,hasPdfPageEdits,pdfExportFilename,drawPdfAnnotations} from '../src/pdf/exportEditedPdf.js';
import {pageCrop} from '../src/pdf/pdfAnnotations.js';

test('practice-only changes preserve the PDF bytes without exporting rehearsal metadata',async()=>{
 const blob=new Blob(['%PDF-test'],{type:'application/pdf'});
 const record={title:'Example.pdf',bpm:120,barMap:[{number:1}],practiceOrder:[1,1],pageEdits:{1:{crop:null,notes:[],cuts:[],strokes:[]}}};
 assert.equal(await exportEditedPdf(record,blob),blob);
 assert.equal(pdfExportFilename(record.title),'Example.pdf');
 assert.equal(hasPdfPageEdits(null),false);
 assert.equal(hasPdfPageEdits({1:{margins:{top:0,right:0,bottom:0,left:0}}}),false);
 for(const edit of [{notes:[{text:'memo'}]},{strokes:[{points:[[.1,.1]]}]},{margins:{top:.1,right:0,bottom:0,left:0}},{cuts:[{start:.2,end:.3}]}])assert.equal(Boolean(hasPdfPageEdits({1:edit})),true);
});

test('saved notes and pen marks follow crop and cut coordinates; removed notes stay removed',()=>{
 const calls=[],context=new Proxy({measureText:text=>({width:text.length*10})},{get:(obj,key)=>key in obj?obj[key]:(...args)=>calls.push([key,...args]),set:(obj,key,value)=>{calls.push([key,value]);obj[key]=value;return true;}});
 const edit={margins:{top:.1,right:.1,bottom:.1,left:.1},cuts:[{start:.3,end:.4}],notes:[{x:.2,y:.5,text:'한글 메모',size:.03,color:'red',rotation:15},{x:.2,y:.35,text:'cut note',size:.03,color:'red'}],strokes:[{points:[[.2,.2],[.3,.35],[.4,.5]],width:.003,color:'blue',opacity:.5}]},before=structuredClone(edit);
 drawPdfAnnotations(context,edit,pageCrop(edit),800,700);
 const translate=calls.find(([name])=>name==='translate');
 assert.ok(Math.abs(translate[1]-100)<1e-9);assert.ok(Math.abs(translate[2]-300)<1e-9);
 assert.ok(calls.some(([name,value])=>name==='fillText'&&value==='한글 메모'));
 assert.ok(!calls.some(([name,value])=>name==='fillText'&&value==='cut note'));
 assert.equal(calls.filter(([name])=>name==='lineTo').length,1);
 assert.ok(calls.some(([name,value])=>name==='lineWidth'&&value===3));
 assert.ok(calls.some(([name,value])=>name==='globalAlpha'&&value===.5));
 assert.deepEqual(edit,before);
});
