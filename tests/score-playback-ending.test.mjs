import test from 'node:test';import assert from 'node:assert/strict';
import {createBlankDocument,blankEvent,blankMeasure,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {enterFret,setRest} from '../src/etudes/editorCommands.js';
import {scoreTimeline,guitarVoiceTimeline} from '../src/etudes/scorePlayback.js';
import {playbackSlots,slotAtTick} from '../src/etudes/scorePlaybackPosition.js';
function fixture(){let d=createBlankDocument();d.measures[0].events=Array.from({length:16},(_,i)=>blankEvent(i*120,'16'));for(let i=0;i<8;i++)for(const [string,fret] of [[6,9],[5,7]])d=enterFret(d,{bar:0,event:i,string},fret);return d;}
const plan=(d,bpm=60)=>scoreTimeline(compileDocumentV2(d).score,bpm);
test('eight sixteenths end after two beats without playing the unentered tail',()=>{const d=fixture(),before=structuredClone(d);for(const bpm of [60,120,137]){const p=plan(d,bpm);assert.equal(p.events.length,16);assert(Math.abs(p.duration-120/bpm)<1e-12);assert.equal(guitarVoiceTimeline(compileDocumentV2(d).score,bpm).duration,p.duration);}assert.deepEqual(d,before);assert.equal(plan(JSON.parse(JSON.stringify(d))).duration,2);});
test('explicit trailing rests are retained, including legacy rests without blank',()=>{let d=fixture();d=setRest(d,{bar:0,event:8});assert.equal(plan(d).duration,2.25);d=structuredClone(d);d.measures[0].events[15].rest=true;delete d.measures[0].events[15].blank;assert.equal(plan(d).duration,4);});
test('intermediate empty beats and bars keep the next measure onset unchanged',()=>{let d=fixture();d.measures.push(blankMeasure(),blankMeasure());assert.equal(plan(d).duration,2);d=enterFret(d,{bar:2,event:0,string:6},5);const p=plan(d);assert.equal(p.events.at(-1).start,8);assert.equal(p.duration,9);});
test('empty scores have no playback duration; a complete bar still lasts four beats',()=>{assert.equal(plan(createBlankDocument()).duration,0);let d=fixture();for(let event=8;event<16;event++)d=enterFret(d,{bar:0,event,string:6},5);assert.equal(plan(d).duration,4);});

test('editor blank playback covers complete measures at the selected BPM without inventing notes',()=>{
 const d=createBlankDocument();d.measures.push(blankMeasure());const before=structuredClone(d),score=compileDocumentV2(d).score;
 for(const bpm of [60,120,240]){
  const timeline=scoreTimeline(score,bpm,true,{playEmptyScore:true});
  assert.equal(timeline.duration,8*60/bpm);assert.deepEqual(timeline.events,[]);
  const slots=playbackSlots(score,timeline.order);assert.equal(slotAtTick(slots,1920).bar,1);assert.equal(slotAtTick(slots,3360).event,3);
 }
 assert.deepEqual(d,before);assert.equal(scoreTimeline(score).duration,0);
});
test('editor blank playback respects meter and repeated measure visits',()=>{
 const d=createBlankDocument();d.meter=[3,4];d.measures=[blankMeasure(d.meter)];d.measures[0].repeatStart=true;d.measures[0].repeatEnd=true;
 const timeline=scoreTimeline(compileDocumentV2(d).score,120,false,{playEmptyScore:true});
 assert.deepEqual(timeline.order,[0,0]);assert.equal(timeline.duration,3);
});
test('editor empty-score option retains the written ending once music has been entered',()=>{
 const score=compileDocumentV2(fixture()).score;
 assert.equal(scoreTimeline(score,60,false,{playEmptyScore:true}).duration,2);
});
