import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument} from '../src/etudes/scoreModel.js';
import {measureChordName,refreshAutomaticChordNames} from '../src/etudes/automaticChordNames.js';
const grip=frets=>frets.flatMap((fret,i)=>fret===null?[]:[{string:6-i,fret}]);
function fixture(){const d=createBlankDocument();d.measures[0].events[0]={...d.measures[0].events[0],blank:false,rest:false,notes:grip([null,0,2,2,1,0])};d.measures[0].chordNameMode='auto';return d;}
test('automatic chord names follow entered frets and tuning without inferred open strings',()=>{
 const d=fixture();assert.equal(measureChordName(d,d.measures[0]),'Am');
 d.measures[0].events[0].notes=grip([null,3,2,0,1,0]);assert.equal(measureChordName(d,d.measures[0]),'C');
 d.capo=2;assert.equal(measureChordName(d,d.measures[0]),'D');
 d.measures[0].events[0].notes=[{string:1,fret:0}];assert.equal(measureChordName(d,d.measures[0]),null);
});
test('arpeggios combine a measure grip and manual names survive later edits',()=>{
 const d=fixture(),notes=d.measures[0].events[0].notes;
 d.measures[0].events=notes.map((n,i)=>({rest:false,notes:[n],onset:i*240}));
 const automatic=refreshAutomaticChordNames(d);assert.equal(automatic.measures[0].harmony,'Am');
 automatic.measures[0].chordNameMode='manual';automatic.measures[0].harmony='Am(add9)';automatic.measures[0].events=[];
 assert.equal(refreshAutomaticChordNames(automatic).measures[0].harmony,'Am(add9)');
 automatic.measures[0].chordNameMode='auto';assert.equal(refreshAutomaticChordNames(automatic).measures[0].harmony,null);
});
