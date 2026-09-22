import assert from 'node:assert/strict';
import {ETUDES} from '../src/etudes/catalog.js';
import {compileScoreDocument} from '../src/etudes/scoreDocument.js';
import {ticksOf} from '../src/etudes/scoreModel.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
const scores=ETUDES.filter(e=>e.type==='아르페지오');
assert.equal(scores.length,15);
assert.equal(new Set(scores.map(s=>s.templateId)).size,15);
const originalProgression=['Bmaj7','D#m','Emaj7','Em7','Bmaj7','D#m','Em7','Bmaj7'];
for(const id of ['chord-bass-answer','chord-sixteenths','chord-density','chord-melody-response'])assert.deepEqual(scores.find(s=>s.templateId===id).harmony,originalProgression);
for(const id of ['chord-g-alternating','chord-am-circle','chord-em-offbeat','chord-c-response'])assert.ok(scores.find(s=>s.templateId===id));
for(const score of scores){
 const result=compileScoreDocument(score.document,score);assert.deepEqual(result.errors,[]);assert.deepEqual(result.issues,[]);
 for(const bar of score.document.measures)assert.equal(bar.events.reduce((sum,e)=>sum+ticksOf(e),0),1920);
 assert.equal(scoreTimeline(score,60).duration,32);
 score.document.measures.forEach((bar,i)=>bar.events.forEach(e=>e.notes.forEach(n=>assert.equal(n.fret,score.chordShapes[i].frets[6-n.string]))));
 if(score.templateId.endsWith('triplet'))assert.equal(score.document.measures.flatMap(b=>b.events).filter(e=>e.tuplet).length,12);
}
console.log('15 arpeggio studies: original progressions restored, new IDs, chord grips, 4/4 timing, triplets and playback duration passed');
