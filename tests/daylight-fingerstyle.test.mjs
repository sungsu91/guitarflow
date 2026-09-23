import test from 'node:test';
import assert from 'node:assert/strict';
import {daylightFingerstyle as score,DAYLIGHT_SECTIONS as sections,DAYLIGHT_VOICINGS as voicings} from '../src/etudes/daylightFingerstyle.js';
import {CHORD_TONE_INTERVALS as theory} from '../src/chords/chordTheory.js';
import {ticksOf} from '../src/etudes/scoreModel.js';
import {compileScoreDocument,toScoreDocument} from '../src/etudes/scoreDocument.js';
import {scoreBarOrder,repeatIssues} from '../src/etudes/scoreRepeats.js';
import {scoreTimeline,guitarVoiceTimeline} from '../src/etudes/scorePlayback.js';
import {playbackSlots,slotAtTick} from '../src/etudes/scorePlaybackPosition.js';
import {rhythmGroups} from '../src/etudes/tabRhythm.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';
const document=score.document;
const pc=n=>((n%12)+12)%12;
const pitches=notes=>notes.map(n=>score.tuning[n.string-1]+n.fret);
const spanEvents=(m,v)=>m.events.filter(e=>!e.rest&&e.onset>=v.startTick&&e.onset<v.endTick);
test('all authored grips and sounding spans contain exact major/minor extensions and slash basses',()=>{
 for(const v of Object.values(voicings)){
  const expected=new Set(theory[v.family][v.quality].map(n=>pc(n+v.root)));
  const actual=v.frets.flatMap((f,i)=>f===null?[]:[score.tuning[5-i]+f]);
  assert.deepEqual(new Set(actual.map(pc)),expected,v.name);
  assert.equal(pc(Math.min(...actual)),v.bass??v.root,v.name);
  const pressed=v.frets.filter(f=>f>0);assert.ok(Math.max(...pressed)-Math.min(...pressed)<=3,v.name);
 }
 for(const [b,m] of document.measures.entries())for(const v of m.sketchVoicings){
  const actual=spanEvents(m,v).flatMap(e=>e.notes);
  for(const n of actual){assert.equal(n.fret,v.frets[6-n.string]);assert.ok(Number.isInteger(n.fret)&&n.fret>=0&&n.fret<=10);}
  assert.deepEqual(new Set(pitches(actual).map(pc)),new Set(theory[v.family][v.quality].map(n=>pc(n+v.root))),`bar ${b+1} ${v.name}`);
  assert.equal(pc(Math.min(...pitches(actual))),v.bass??v.root,`sounding bass ${b+1} ${v.name}`);
 }
});
test('four beats, explicit rests, mixed subdivisions and beat-aligned beams throughout',()=>{
 for(const m of document.measures){
  let tick=0;for(const e of m.events){assert.equal(e.onset,tick);tick+=ticksOf(e);assert.equal(e.rest,e.notes.length===0);}assert.equal(tick,1920);
  assert.equal(m.sketchVoicings.at(-1).endTick,1920);
  for(const e of m.events){const v=m.sketchVoicings.find(v=>e.onset>=v.startTick&&e.onset<v.endTick);assert.ok(e.onset+ticksOf(e)<=v.endTick);}
  for(const group of rhythmGroups(m.events))assert.equal(new Set(group.map(i=>Math.floor(m.events[i].onset/480))).size,1);
 }
 const durations=new Set(document.measures.flatMap(m=>m.events.map(e=>e.duration)));assert.deepEqual(durations,new Set(['8','16','4']));
 assert.ok(document.measures.some(m=>rhythmGroups(m.events).some(g=>g.map(i=>m.events[i].duration).join(',')==='16,8,16')));
 assert.ok(document.measures.some(m=>m.events.some(e=>e.rest&&e.duration==='16')));
});
test('40 written bars expand to exactly 56 visits; both eight-bar repeats exit correctly',()=>{
 assert.equal(score.measures.length,40);assert.deepEqual(repeatIssues(document.measures),[]);
 const range=(s,n)=>Array.from({length:n},(_,i)=>s+i);
 const expected=[...range(0,2),...range(2,8),...range(2,8),...range(10,2),...range(12,8),...range(12,8),...range(20,20)];
 const order=scoreBarOrder(score);assert.deepEqual(order,expected);assert.equal(order.length,56);
 const timeline=scoreTimeline(score),slots=playbackSlots(score,timeline.order);
 assert.ok(Math.abs(timeline.duration-56*4*60/92)<1e-8);
 expected.forEach((bar,visit)=>{assert.equal(slotAtTick(slots,visit*1920).bar,bar);assert.equal(slotAtTick(slots,visit*1920).visit,visit);});
 const expectedCount=order.reduce((sum,bar)=>sum+document.measures[bar].events.reduce((sum,e)=>sum+e.notes.length,0),0);
 assert.equal(timeline.events.length,expectedCount);
 for(const visit of range(0,56))assert.ok(timeline.events.some(e=>e.visit===visit));
 for(const note of timeline.events){assert.ok(Number.isFinite(note.midi)&&note.duration>0);assert.equal(note.duration,Number(document.measures[note.bar].events.find(e=>e.id===note.id).duration)===4?60/92:4/Number(document.measures[note.bar].events.find(e=>e.id===note.id).duration)*60/92);}
});
test('bass melody, suspended resolution and Final register follow the composition',()=>{
 const bass=document.measures.slice(22,24).flatMap(m=>m.sketchVoicings.map(v=>Math.min(...pitches(spanEvents(m,v).flatMap(e=>e.notes)))));
 assert.deepEqual(bass,[45,43,41,40]);
 for(const [bar,string] of [[1,3],[11,2],[27,2],[38,2]]){
  const m=document.measures[bar],from=m.sketchVoicings.at(-2),to=m.sketchVoicings.at(-1);
  const a=spanEvents(m,from).flatMap(e=>e.notes).find(n=>n.string===string),b=spanEvents(m,to).flatMap(e=>e.notes).find(n=>n.string===string);
  assert.equal(a.fret-b.fret,1);
 }
 const top=b=>Math.max(...pitches(document.measures[b].events.flatMap(e=>e.notes)));
 for(let i=0;i<8;i++)assert.ok(top(28+i)>top(12+i),`Final bar ${i+1} has a higher top note`);
 const density=s=>document.measures.slice(s.start,s.start+s.count).reduce((n,m)=>n+m.events.filter(e=>!e.rest).length,0)/s.count;
 assert.ok(density(sections[3])>density(sections[1]));assert.ok(density(sections[2])>density(sections[1]));
 assert.notDeepEqual(document.measures.slice(10,12).map(m=>m.events.map(e=>e.duration)),document.measures.slice(26,28).map(m=>m.events.map(e=>e.duration)));
 const starts=new Set(document.measures.map(m=>m.events[0].notes.length));assert.ok(starts.has(1)&&starts.has(2)&&starts.has(3));
 assert.ok(document.measures.slice(12,20).every(m=>m.events.some(e=>e.onset>0&&e.notes.length>=2)),'inner harmony, not just a first-beat pinch');
});
test('let ring overlaps inner accompaniment, ends on the same-string attack, and preserves the Outro tail',()=>{
 const timeline=guitarVoiceTimeline(score);
 for(const v of timeline.voices.filter(v=>v.letRing)){
  const next=timeline.voices.find(n=>n.string===v.string&&n.start>v.start);
  assert.ok(Math.abs(v.start+v.duration-(next?.start??timeline.duration))<1e-8);
 }
 const bass=timeline.voices.find(v=>v.bar===12&&v.string===5&&v.letRing);
 assert.ok(bass.duration>2*60/92);
 assert.ok(timeline.voices.some(v=>v.bar===12&&v.start>bass.start&&v.start<bass.start+bass.duration&&v.string!==5));
 for(const v of timeline.voices.filter(v=>v.bar===39))assert.ok(Math.abs(v.start+v.duration-timeline.duration)<1e-8);
});
test('editing and library save/load preserve the compact repeat route and simultaneous harmony',()=>{
 const d=JSON.parse(JSON.stringify(toScoreDocument(score))),result=compileScoreDocument(d,score);
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.issues,[]);
 const entries=new Map(),storage={getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v)};
 assert.equal(saveLibraryDocument(storage,d,[score]).saved,true);
 const restored=loadLibrary(storage,[score]).records[d.id].document;
 assert.deepEqual(restored.measures,d.measures);
 assert.deepEqual(scoreBarOrder(compileScoreDocument(restored,score).score),scoreBarOrder(score));
});
