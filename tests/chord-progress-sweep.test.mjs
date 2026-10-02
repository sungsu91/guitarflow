import test from 'node:test';
import assert from 'node:assert/strict';
import {chordSweepProgress} from '../src/rhythm/chordProgressSweep.js';
import {createRhythmChordBeatTimeline,groupRhythmChordProgressionMeasures} from '../src/rhythm/chordBeatTimeline.js';

test('one measure sweep covers short chords, barline continuations, automatic rests and loop boundaries',()=>{
  for(const beats of [3,4,6]){
    const chords=[{id:'C',beatLength:1},{id:'G',beatLength:2},{id:'Am',beatLength:4}];
    const timeline=createRhythmChordBeatTimeline(chords,beats);
    const measures=groupRhythmChordProgressionMeasures(chords,beats);
    for(let beat=0;beat<timeline.cycleBeats*2;beat+=.125){
      const active=measures.map(m=>chordSweepProgress(beat,timeline.cycleBeats,m.measureIndex*beats,m.beatLength)).filter(p=>p!==null);
      assert.equal(active.length,1,`${beats}/4 at ${beat}`);assert(active[0]>=0&&active[0]<1);
    }
    assert.equal(chordSweepProgress(timeline.cycleBeats,timeline.cycleBeats,0,1),0);
  }
});
test('two half-bar chords share one continuous sweep through their boundary',()=>{
  const chords=[{id:'G',beatLength:2},{id:'D',beatLength:2},{id:'Em',beatLength:2},{id:'C',beatLength:2}];
  const timeline=createRhythmChordBeatTimeline(chords,4);
  const measures=groupRhythmChordProgressionMeasures(chords,4);
  const progress=beat=>measures.map(m=>chordSweepProgress(beat,timeline.cycleBeats,m.measureIndex*4,m.beatLength));
  assert.deepEqual(progress(0),[0,null]);
  assert.deepEqual(progress(1),[.25,null]);
  assert.deepEqual(progress(2),[.5,null]);
  assert.deepEqual(progress(3),[.75,null]);
  assert.deepEqual(progress(4),[null,0]);
  assert.deepEqual(progress(8),[0,null]);
});
test('progress removes elapsed colour and does not invent progress during count-in',()=>{
  assert.equal(chordSweepProgress(null,8,0,4),null);
  assert.equal(chordSweepProgress(NaN,8,0,4),null);
  assert.equal(chordSweepProgress(0,0,0,4),null);
  assert.equal(chordSweepProgress(0,8,0,4),0);
  assert.equal(chordSweepProgress(2,8,0,4),.5);
  assert.equal(chordSweepProgress(4,8,0,4),null);
  assert.equal(chordSweepProgress(4,8,4,4),0);
});
