import test from 'node:test';
import assert from 'node:assert/strict';
import {minimumFrettingFingers} from '../src/etudes/frettingFeasibility.js';
import {assignTab} from '../src/etudes/scoreTuning.js';
import {applyArpeggio} from '../src/etudes/arpeggioPattern.js';
import {blankMeasure,createBlankDocument,ticksOf} from '../src/etudes/scoreModel.js';
import {compileScoreDocument} from '../src/etudes/scoreDocument.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';

const grip=frets=>frets.flatMap((fret,i)=>fret===null?[]:[{string:6-i,fret}]);
test('partial barres count as fingers only when they preserve every lower or open note',()=>{
 assert.equal(minimumFrettingFingers(grip([1,3,3,2,1,1])),3); // F, with a ring-finger mini-barre.
 assert.equal(minimumFrettingFingers(grip([0,2,0,2,0,2])),3);
 assert.equal(minimumFrettingFingers(grip([3,2,1,2,1,2])),5);
 assert.equal(minimumFrettingFingers(grip([null,0,2,2,2,0])),1);
 assert.equal(minimumFrettingFingers(grip([0,0,0,0,0,0])),0);
});

test('an impossible fifth finger stays unplaced without changing or removing pitches',()=>{
 const d=createBlankDocument(),notes=grip([3,2,1,2,1,2]).map(n=>({...n,midi:d.tuning[n.string-1]+n.fret,locked:n.string!==6}));
 const assigned=assignTab(d,notes);
 assert.equal(assigned.find(n=>n.string===6),undefined);
 assert.equal(assigned[0].unplaced,true);
 assert.deepEqual(assigned.map(n=>n.midi),notes.map(n=>n.midi));
 assert.equal(assigned.length,6);
});

test('B–3–12–3 follows a I–vi–ii–V progression with simultaneous 1+2 strings and exact eighth-note timing',()=>{
 const d={...createBlankDocument(),measures:['Cmaj7','Am7','Dm7','G7'].map(harmony=>({...blankMeasure(),harmony}))};
 const before=structuredClone(d),next=applyArpeggio(d,{end:3,pattern:'bass-3-pinch12-3'});
 assert.deepEqual(d,before);
 for(const [i,bass] of [5,5,4,6].entries()){
  const bar=next.measures[i];
  assert.deepEqual(bar.events.map(e=>e.notes.map(n=>n.string)),[[bass],[3],[1,2],[3],[bass],[3],[1,2],[3]]);
  assert.deepEqual(bar.events.map(e=>e.onset),[0,240,480,720,960,1200,1440,1680]);
  assert.equal(bar.events.reduce((n,e)=>n+ticksOf(e),0),1920);
  assert(bar.events.every(e=>e.notes.every(n=>n.midi===d.tuning[n.string-1]+n.fret)));
  assert.deepEqual(bar.events[2].notes.map(n=>n.rightFinger),['a','m']);
 }
 const compiled=compileScoreDocument(next);assert.deepEqual(compiled.errors,[]);
 const timeline=scoreTimeline(compiled.score);
 assert.equal(timeline.events.length,40);
});
