import test from 'node:test';import assert from 'node:assert/strict';
import {expandPdfBars,pdfBarRows,removePdfRow,setPdfBarBeats,movePdfRow,normalizePdfBarEntry} from '../src/pdf/pdfBarRows.js';
import {practiceOrder,barAtTick} from '../src/pdf/pdfModel.js';
import {setPdfBarBoundary} from '../src/pdf/pdfBarRows.js';
const row={page:1,x:.1,y:.3,width:.8,height:.1,number:1,count:4,beats:4,meter:[4,4]};
test('unequal bar widths preserve beats and survive normalization, resize and export',async()=>{
 const changed=setPdfBarBoundary([row],1,1,.15),bars=expandPdfBars(changed);
 assert.equal(bars[0].width,.12);assert.equal(bars[1].x,.22);assert.deepEqual(bars.map(b=>b.beats),[4,4,4,4]);assert.equal(row.barEdges,undefined);
 const normalized=normalizePdfBarEntry(changed[0]);assert.deepEqual(normalized.barEdges,[0,.15,.5,.75,1]);
 const resized=movePdfRow(changed,1,{x:0,y:.2,width:1,height:.1});assert.equal(expandPdfBars(resized)[0].width,.15);
 const clamped=setPdfBarBoundary(changed,1,1,2);assert.equal(clamped[0].barEdges[1],.49);
 const {exportPdfPractice,readBackup}=await import('../src/pdf/pdfLibrary.js');const [{record}]=await readBackup(exportPdfPractice({barMap:changed},new Blob(['%PDF-test'])));assert.deepEqual(expandPdfBars(record.barMap),bars);
 assert.deepEqual(expandPdfBars([{...row,barEdges:[0,.7,.3,.8,1]}]).map(b=>[b.x,b.width]),expandPdfBars([row]).map(b=>[b.x,b.width]));
});
test('legacy individual rectangles resize adjacent bars without changing other measures',()=>{
 const legacy=expandPdfBars([row]).map(({count,rowStart,...b})=>b),next=setPdfBarBoundary(legacy,1,1,.15);
 assert.ok(Math.abs(next[0].width-.12)<1e-9);assert.ok(Math.abs(next[1].x-.22)<1e-9);assert.equal(next[2],legacy[2]);assert.equal(pdfBarRows(next).length,1);
});
test('one stored row provides four playback measures without duplicate persisted rectangles',()=>{
 const copy=structuredClone(row),bars=expandPdfBars([row]);assert.equal(bars.length,4);assert.deepEqual(bars.map(b=>b.number),[1,2,3,4]);assert.deepEqual(row,copy);assert.equal(bars[3].width,.2);
 const order=practiceOrder({barMap:[row],practiceOrder:[1,2,1,4]});assert.equal(barAtTick(order,9).bar.number,1);assert.equal(barAtTick(order,13).bar.number,4);
});
test('legacy contiguous rectangles share a row but gaps, pages and numbering do not merge',()=>{
 const legacy=expandPdfBars([row]).map(({count,meter,rowStart,...b})=>b),before=structuredClone(legacy);
 assert.equal(pdfBarRows(legacy).length,1);assert.equal(pdfBarRows(legacy)[0].count,4);assert.deepEqual(legacy,before);
 assert.equal(pdfBarRows([legacy[0],{...legacy[1],x:.6}]).length,2);
 assert.equal(pdfBarRows([legacy[0],{...legacy[1],page:2}]).length,2);
});
test('row move, beat change and delete preserve unrelated rows and original playback numbering',()=>{
 const next={...row,page:2,number:5};const changed=movePdfRow([row,next],2,{x:.05,y:.4,width:.9,height:.12});assert.equal(changed[1],next);assert.equal(changed[0].count,4);
 const beats=setPdfBarBeats([row,next],3,3);assert.deepEqual(expandPdfBars(beats).slice(0,4).map(b=>b.beats),[4,4,3,4]);assert.equal(beats[1],next);
 assert.deepEqual(removePdfRow([row,next],2),{barMap:[next],removed:[1,2,3,4]});assert.equal(normalizePdfBarEntry({...row,count:16}).count,4);
});
