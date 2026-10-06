import test from 'node:test';
import assert from 'node:assert/strict';
import {projectChordText,chordWordsInRegion,attachPageChords} from '../src/pdf/tab-import/chordRecognition.js';
import {grandStaffChordRegions} from '../src/omr/grandStaffChords.js';
import {createBlankDocument} from '../src/etudes/scoreModel.js';
import {planArpeggio,applyArpeggio} from '../src/etudes/arpeggioPattern.js';
test('encoded PDF font fragments cannot manufacture a chord from a readable suffix',()=>{
 const item=(str,x,width)=>({str,width,transform:[12,0,0,12,x,100]});
 const words=projectChordText({items:[item('\ue00a\ue004',10,20),item('a',30,7),item('\ue017\ue00f',37,10),item('G',90,10)]},{scale:1,convertToViewportPoint:(x,y)=>[x,y]});
 assert.equal(words.length,2);assert.equal(words[0].text,'\ue00a\ue004a\ue017\ue00f');
 assert.deepEqual(chordWordsInRegion(words,{x:0,y:80,width:200,spacing:10,staffY:120}).map(w=>w.name),['G']);
});
test('piano shares the aligned system harmony without borrowing an unrelated part',()=>{
 const measures=[{x:0,width:300},{x:300,width:250}],staff={spacing:10};
 const systems=[{id:1,staff,measures},{id:2,staff,measures,connectedStaffIds:[3]},{id:3,staff,measures,connectedStaffIds:[2]}];
 const chord={name:'C',x:60,y:10,width:20,height:14};
 const regions=[{staff:1,words:[chord]},{staff:2,words:[],triplets:[{x:70}]},{staff:3,words:[{name:'F'}]}];
 const shared=grandStaffChordRegions(systems,systems.slice(1),regions);
 assert.equal(shared.length,1);assert.deepEqual(shared[0].words,[chord]);assert.equal(shared[0].sourceStaff,1);assert.equal(shared[0].sharedSystemHarmony,true);
 assert.deepEqual(shared[0].triplets,[{x:70}]);
 const different=structuredClone(systems);different[0].measures=structuredClone(different[0].measures);different[0].measures[1].width=300;
 assert.deepEqual(grandStaffChordRegions(different,different.slice(1),regions)[0].words,[]);
 const own=structuredClone(regions);own[1].words=[{name:'Am'}];assert.deepEqual(grandStaffChordRegions(systems,systems.slice(1),own)[0].words,[{name:'Am'}]);
});
test('mid-bar piano chords use explicit voice onsets, not the sum of both hands',()=>{
 const page={page:1,notation:true,staffs:[{id:2,measures:[{meter:[4,4],rhythmValid:true,positioned:true,slots:[
  {x:50,onset:0,duration:'2',voice:'right',positioned:true},
  {x:50,onset:0,duration:'4',voice:'left',positioned:true},
  {x:130,onset:480,duration:'4',voice:'left',positioned:true},
  {x:210,onset:960,duration:'2',voice:'right',positioned:true},
  {x:200,onset:960,duration:'2',voice:'left',positioned:true}
 ]}]}]};
 const words=[{name:'C',x:48,y:1,width:14,confidence:1},{name:'G',x:208,y:1,width:14,confidence:1}];
 const regions=[{staff:2,sourceStaff:1,sharedSystemHarmony:true,spacing:10,measures:[{x:0,width:400}],words}];
 attachPageChords(page,regions);const changes=page.staffs[0].measures[0].harmonyChanges;
 assert.deepEqual(changes.map(c=>[c.name,c.onset,c.needsReview]),[['C',0,false],['G',960,false]]);
 assert.equal(changes[1].source.staff,1);assert.equal(changes[1].source.sharedSystemHarmony,true);
});
test('split valid chord suffixes join, while spaced chord names remain distinct',()=>{
 const item=(str,x,width)=>({str,width,transform:[12,0,0,12,x,100]});
 const words=projectChordText({items:[item('C',10,9),item('maj7',19,22),item('G',70,9)]},{scale:1,convertToViewportPoint:(x,y)=>[x,y]});
 assert.deepEqual(words.map(w=>w.text),['Cmaj7','G']);
});
test('four-four two-beat patterns repeat twice under one chord and once under each half-bar chord',()=>{
 const d=createBlankDocument();d.measures[0].harmony='C';
 const options={pattern:'bass-3-pinch12-3'};
 const one=planArpeggio(d,options)[0];assert.equal(one.repeats,2);
 assert.deepEqual(one.cells.map(c=>c.strings),[[5],[3],[1,2],[3],[5],[3],[1,2],[3]]);
 d.measures[0].harmonyChanges=[{onset:0,name:'C'},{onset:960,name:'G'}];
 const two=planArpeggio(d,options)[0];assert.deepEqual(two.cells.map(c=>c.shape.name),['C','C','C','C','G','G','G','G']);
 assert.deepEqual(two.cells.map(c=>c.strings),[[5],[3],[1,2],[3],[6],[3],[1,2],[3]]);
 const original=JSON.stringify(d);const arranged=applyArpeggio(d,options);assert.equal(JSON.stringify(d),original);assert.equal(arranged.measures[0].events.length,8);
 d.measures[0].harmonyChanges[1].onset=1440;
 assert.deepEqual(planArpeggio(d,options)[0].cells.slice(6).map(c=>c.strings),[[6],[3]],'a later change restarts from its own bass');
});
