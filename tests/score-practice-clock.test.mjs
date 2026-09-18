import test from 'node:test';import assert from 'node:assert/strict';
import {measureMeters,performedMeasures,practiceClicks} from '../src/etudes/scoreMeters.js';
import {scoreTimeline,guitarVoiceTimeline} from '../src/etudes/scorePlayback.js';
import {playbackSlots,slotAtTick} from '../src/etudes/scorePlaybackPosition.js';
const note=(onset,duration,extra={})=>({onset,duration,midi:60,string:2,fret:1,...extra});
const score={bpm:120,meter:[4,4],measures:[[note(0,'1')],[note(0,'2',{dotted:true})],[note(0,'4',{dotted:true}),note(720,'4',{dotted:true,rest:true})]],document:{measures:[{repeatStart:true},{meter:[3,4]},{meter:[6,8],repeatEnd:true}]}};
test('written meters and repeated visits share cumulative quarter-note ticks',()=>{
 assert.deepEqual(measureMeters(score),[[4,4],[3,4],[6,8]]);
 const audio=scoreTimeline(score),measures=performedMeasures(score,audio.order);
 assert.deepEqual(measures.map(m=>m.barStart),[0,1920,3360,4800,6720,8160]);
 assert.equal(audio.duration,10);
 const slots=playbackSlots(score,audio.order);assert.equal(slotAtTick(slots,4800).bar,0);assert.deepEqual(slotAtTick(slots,3500).meter,[6,8]);
 assert.equal(guitarVoiceTimeline(score).voices.find(v=>v.visit===2).silenceAt,4.25);
});
test('click schedule changes denominator and resets accents at repeated bar boundaries',()=>{
 const clicks=practiceClicks(performedMeasures(score,scoreTimeline(score).order));
 assert.deepEqual(clicks.slice(0,14).map(c=>c.tick),[0,480,960,1440,1920,2400,2880,3360,3600,3840,4080,4320,4560,4800]);
 assert.deepEqual(clicks.slice(0,14).filter(c=>c.downbeat).map(c=>c.tick),[0,1920,3360,4800]);
 assert.deepEqual(clicks.slice(7,13).map(c=>c.beat),[0,1,2,3,4,5]);
});

test('silent transport keeps timing and repeat order without reading pitches',()=>{
 const expected=scoreTimeline(score);
 const silent={...score,measures:score.measures.map(bar=>bar.map(event=>({...event,get tones(){throw Error('silent transport must not build voices');}})))};
 const timeline=scoreTimeline(silent,score.bpm,false);
 assert.equal(timeline.duration,expected.duration);
 assert.deepEqual(timeline.order,expected.order);
 assert.deepEqual(timeline.events,[]);
});
