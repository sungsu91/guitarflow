import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizedRect,canvasSize,practiceOrder,barAtTick} from '../src/pdf/pdfModel.js';
import {readBackup,storageError,exportPdfPractice} from '../src/pdf/pdfLibrary.js';

test('malformed backup metadata produces a readable validation error before restoring', async () => {
 for(const data of [null, {format:'fretiva-pdf-backup',version:1,records:[null]}, {format:'fretiva-pdf-backup',version:1,records:[[]]}]) {
  const meta=new TextEncoder().encode(JSON.stringify(data).padEnd(10,' ')),length=new ArrayBuffer(4);new DataView(length).setUint32(0,meta.length);
  await assert.rejects(readBackup(new Blob([length,meta])), error=>error instanceof Error && !(error instanceof TypeError));
 }
});
import {pdfEditResumePosition} from '../src/pdf/pdfModel.js';
import {pdfPracticeFilename} from '../src/pdf/pdfLibrary.js';

test('after editing, playback starts on the current measure downbeat; repeats and count-in remain aligned',()=>{
 const order=[{number:1,beats:4},{number:2,beats:3},{number:1,beats:4}];
 assert.equal(pdfEditResumePosition(order,.2),0);
 assert.equal(pdfEditResumePosition(order,4.2),4);
 assert.equal(pdfEditResumePosition(order,8.7),7);
 assert.equal(pdfEditResumePosition(order,12.3,4),11);
 assert.equal(pdfEditResumePosition(order,2,4),0);
 assert.equal(pdfEditResumePosition(order,15),0);
 assert.equal(pdfEditResumePosition(order,15.2,0,true),4);
});
test('practice export filename keeps the source title and distinguishes successive edited copies',()=>{
 const first=pdfPracticeFilename('Flower Dance.pdf',new Date('2026-09-24T01:02:03.004Z'));
 assert.equal(first,'Flower Dance (Practice 20260924-010203.004).fretiva-pdf');
 assert.notEqual(first,pdfPracticeFilename('Flower Dance.pdf',new Date('2026-09-24T01:02:03.005Z')));
});

test('Single-score practice export preserves original PDF bytes and complete metadata',async()=>{
 const pdf=new Blob(['%PDF-1.7\n',new Uint8Array([0,255,13,10,128]),'%%EOF']);
 const record={id:'desktop',title:'Practice',bpm:123,meter:[6,8],barMap:[{number:1,page:1,x:.1,y:.2,width:.8,height:.1,count:4,beats:6}],practiceOrder:[1,2,1,3,4],loop:true,loopStart:2,loopEnd:4,pageEdits:{1:{notes:[{id:'note',text:'User note'}]}},countIn:true};
 const before=structuredClone(record),[{record:restored,pdfBlob}]=await readBackup(exportPdfPractice(record,pdf));
 const {byteLength,...metadata}=restored;
 assert.deepEqual(metadata,record);assert.deepEqual(record,before);assert.equal(byteLength,pdf.size);
 assert.deepEqual(new Uint8Array(await pdfBlob.arrayBuffer()),new Uint8Array(await pdf.arrayBuffer()));
 for(const bytes of [[],[0],[0,1,2]])await assert.rejects(readBackup(new Blob([new Uint8Array(bytes)])));
});
test('PDF rectangles preserve normalized coordinates in both drag directions',()=>{
 assert.deepEqual(normalizedRect({x:.5,y:.6},{x:.2,y:.3}),{x:.2,y:.3,width:.3,height:.3});
 const r=normalizedRect({x:-1,y:0},{x:2,y:1});assert.deepEqual(r,{x:0,y:0,width:1,height:1});
});
test('Retina and oversized pages never allocate more than six million pixels',()=>{
 for(const [w,h,dpr] of [[595,842,3],[5000,8000,3],[320,500,2],[100000,100000,1]]){const r=canvasSize(w,h,dpr);assert.ok(r.width*r.height<=6000000);assert.ok(r.width<=4096&&r.height<=4096);assert.ok(Math.abs(r.width/r.height-w/h)<.01);}
});
test('Explicit rehearsal order supports repeats, per-bar beats and loop range',()=>{
 const barMap=[{number:1,beats:4},{number:2,beats:3},{number:3,beats:4}],record={barMap,practiceOrder:[1,2,1,2,3],loop:false};
 const order=practiceOrder(record);assert.deepEqual(order.map(b=>b.number),[1,2,1,2,3]);assert.equal(barAtTick(order,7).bar.number,1);assert.equal(barAtTick(order,18).ended,true);assert.equal(barAtTick(order,18,true).bar.number,1);
 const loop=practiceOrder({...record,loop:true,loopStart:2,loopEnd:4});assert.deepEqual(loop.map(b=>b.number),[2,1,2]);assert.equal(barAtTick(loop,-1),null);assert.equal(barAtTick([],20),null);
});
test('Binary backup validates sizes and rejects truncated files without touching storage',async()=>{
 const meta=new TextEncoder().encode(JSON.stringify({format:'fretiva-pdf-backup',version:1,records:[{title:'Example',byteLength:9}]})),length=new ArrayBuffer(4);new DataView(length).setUint32(0,meta.length);
 const valid=new Blob([length,meta,'%PDF-test']);assert.equal((await readBackup(valid))[0].pdfBlob.size,9);await assert.rejects(readBackup(valid.slice(0,valid.size-1)));await assert.rejects(readBackup(new Blob([length,meta,'%PDF-testEXTRA'])));
});
test('Quota, duplicate and blocked storage errors remain distinguishable',()=>{
 assert.match(storageError({name:'QuotaExceededError'}),/공간이 부족/);assert.match(storageError({name:'ConstraintError'}),/같은 PDF/);assert.match(storageError(Error('blocked')),/blocked/);
});
import {alignBarRow,splitBarRow} from '../src/pdf/pdfModel.js';
test('New bars snap vertically to the same row without changing prior bars or horizontal bounds',()=>{
 const old=[{number:1,page:1,x:.1,y:.2,width:.18,height:.1},{number:2,page:1,x:.1,y:.5,width:.2,height:.1}],before=structuredClone(old);
 const r={page:1,x:.31,y:.208,width:.21,height:.095};
 assert.deepEqual(alignBarRow(r,old),{...r,y:.2,height:.1});assert.deepEqual(old,before);
 assert.deepEqual(alignBarRow(r,old,false),r);assert.deepEqual(alignBarRow({...r,page:2},old),{...r,page:2});
 assert.equal(alignBarRow({...r,y:.36},old).y,.36);
});
test('A whole row splits into independent equal rectangles within the original bounds',()=>{
 const r={page:3,x:.1,y:.4,width:.8,height:.12};const parts=splitBarRow(r,4);
 assert.equal(parts.length,4);parts.forEach((b,i)=>{assert.equal(b.width,.2);assert.equal(b.y,r.y);assert.equal(b.height,r.height);assert.ok(Math.abs(b.x-(.1+i*.2))<1e-10);});assert.ok(Math.abs(parts.at(-1).x+parts.at(-1).width-.9)<1e-10);assert.equal(splitBarRow(r,100).length,64);
});
