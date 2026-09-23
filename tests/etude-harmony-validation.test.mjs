import test from 'node:test';
import assert from 'node:assert/strict';
import {parseChord,validateEtude,TUNING} from '../src/etudes/notationData.js';
import {compositionSketch} from '../src/etudes/compositionSketch.js';
import {daylightFingerstyle} from '../src/etudes/daylightFingerstyle.js';

test('extended and slash chords retain their actual harmonic identities',()=>{
 for(const [symbol,pc,intervals,bass] of [
 ['Am(add9)',9,[0,2,3,7]],['Amadd9',9,[0,2,3,7]],['B7',11,[0,4,7,10]],['E7',4,[0,4,7,10]],
 ['Fmaj7',5,[0,4,7,11]],['Cadd9',0,[0,2,4,7]],['G6',7,[0,4,7,9]],['Gsus4',7,[0,5,7]],
 ['Bm7b5',11,[0,3,6,10]],['Cmaj7/G',0,[0,4,7,11],7],['F/G',5,[0,4,7],7],['D♭m7/A♭',1,[0,3,7,10],8]]){
 const chord=parseChord(symbol);assert.equal(chord.pc,pc);assert.deepEqual(chord.intervals,intervals);assert.equal(chord.bassPc,bass);
 }
 for(const symbol of ['Am(bogus)','Cmaj8','C/Z','C → G'])assert.throws(()=>parseChord(symbol));
});

test('sketch validation checks real notes against the active voicing, including split bars',()=>{
 for(const original of [compositionSketch,daylightFingerstyle]){
 assert.deepEqual(validateEtude(original),[]);
 const score=structuredClone(original),bar=score.document.measures.findIndex(m=>m.sketchVoicings.length>1);
 const v=score.document.measures[bar].sketchVoicings[1];
 const event=score.measures[bar].find(e=>!e.rest&&e.onset>=v.startTick);
 const tone=event.tones?.[0]??event;tone.fret+=12;tone.midi=TUNING[tone.string-1]+tone.fret;tone.pitch={...tone.pitch,octave:tone.pitch.octave+1,key:tone.pitch.key.replace(/\d+$/,n=>Number(n)+1)};
 if(event.tones)Object.assign(event,{fret:tone.fret,midi:tone.midi,pitch:tone.pitch});
 assert.ok(validateEtude(score).some(e=>e.includes('보이싱과 TAB 불일치')));
 }
});
