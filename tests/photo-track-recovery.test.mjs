import test from 'node:test';
import assert from 'node:assert/strict';
import {partialPhotoTrackRecovery as recover} from '../src/pdf/tab-import/photoTrackRecovery.js';
import {summarizeAnalysis} from '../src/pdf/tab-import/recognition.js';
import {combineZoomReadings} from '../src/pdf/tab-import/zoomConsensus.js';
const tracks=[{center:100,spacing:10},{center:200,spacing:10}];
const staff={y:75,height:50,measures:[]};
test('partial photo recovery records missing curve without inventing measures',()=>{
 const result=recover([],[staff],tracks);
 assert.deepEqual(result,{detected:2,recovered:1,missing:[{track:2,center:200,spacing:10}]});
 const summary=summarizeAnalysis([{page:3,staffs:[staff],partialPhotoTracks:result}]);
 assert.equal(summary.incompletePhotoPages[0].page,3);
 assert.equal(summary.measures,0);
});
test('partial fallback never replaces already detected TAB',()=>assert.equal(recover([staff],[staff],tracks),null));
test('unmatched and duplicate recovered staffs are rejected',()=>{
 assert.equal(recover([],[{...staff,y:140}],tracks),null);
 assert.equal(recover([],[staff,staff],[...tracks,{center:300,spacing:10}]),null);
});
test('complete and empty results stay on existing paths',()=>{
 assert.equal(recover([],[],tracks),null);
 assert.equal(recover([],[staff,{...staff,y:175}],tracks),null);
});
test('partial first pass does not block the pre-existing complete zoom fallback',()=>{
 const original={staffs:[staff],partialPhotoTracks:recover([],[staff],tracks)};
 const enlarged={staffs:[staff,{...staff,y:175}]};
 const result=combineZoomReadings(original,enlarged);
 assert.equal(result.staffs.length,2);
 assert.equal(result.partialPhotoTracks,undefined);
});
