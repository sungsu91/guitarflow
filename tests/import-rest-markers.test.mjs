import test from 'node:test';
import assert from 'node:assert/strict';
import {drawImportMarkers} from '../src/pdf/tab-import/drawImportMarkers.js';
import {pdfTabReview} from '../src/pdf/tab-import/pdfTabReview.js';

test('recognized rests do not get a missing-fret question mark, even while their bar awaits review',()=>{
 const original=globalThis.document,markers=[];
 globalThis.document={createElementNS:()=>({setAttribute(){},remove(){}})};
 const root={querySelector:()=>({dataset:{cursorX:0,cursorY:0},ownerSVGElement:{append:m=>markers.push(m)}})};
 const event={rest:true,blank:false,notes:[],pdfImport:{status:'unresolved',pendingStrings:[],recognizedDuration:'8',rhythmVerified:false}};
 const before=structuredClone(event);
 try{drawImportMarkers(root,[event]);assert.equal(markers.length,0);assert.deepEqual(event,before);}
 finally{globalThis.document=original;}
});

test('partial import metadata does not crash the review screen or page navigation',()=>{
 const selections=[],event={rest:true,blank:false,notes:[],pdfImport:{status:'unresolved'}},document={tuning:Array(6),measures:[{pdfImport:{needsReview:true},events:[event]},{pdfImport:{source:{page:2}},events:[event]}]};
 const review=pdfTabReview(document,{bar:0,event:0},cursor=>selections.push(cursor));
 assert.deepEqual(review.pages,[2]);assert.equal(review.source,undefined);review.movePage(2);assert.equal(selections[0].bar,1);assert.equal(review.positions.length,0,'blanket unresolved rest metadata is not a detected error');
});

test('genuine unread positions and partially read chords keep their question marks',()=>{
 const original=globalThis.document,markers=[];
 globalThis.document={createElementNS:()=>({setAttribute(){},remove(){}})};
 const root={querySelector:()=>({dataset:{cursorX:0,cursorY:0},ownerSVGElement:{append:m=>markers.push(m)}})};
 try{
  drawImportMarkers(root,[{rest:true,blank:true,notes:[],pdfImport:{status:'unresolved',pendingStrings:[]}},
   {rest:false,blank:false,notes:[{string:2,fret:1}],pdfImport:{status:'unresolved',pendingStrings:[1]}}]);
  assert.equal(markers.length,2);assert(markers.every(m=>m.textContent==='?'));
 }finally{globalThis.document=original;}
});
