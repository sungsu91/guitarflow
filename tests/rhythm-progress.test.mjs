import test from 'node:test';
import assert from 'node:assert/strict';
import {rhythmTimeline,rhythmStateAt,rhythmHighlighter} from '../src/etudes/rhythmProgress.js';
import {playheadX,rhythmAnchors} from '../src/etudes/scorePlayhead.js';
import {playbackSlots,slotAtTick} from '../src/etudes/scorePlaybackPosition.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
const n=(onset,duration,extra={})=>({onset,duration,id:String(onset),midi:64,string:1,fret:0,...extra});
const score=measures=>({meter:[4,4],bpm:120,measures});
test('mixed beam durations, dots, tuplets and rests arrive exactly; tail consumes remaining time',()=>{
 const s=score([[n(0,'8',{beamBefore:'join'}),n(240,'16'),n(360,'8',{dotted:true}),...[720,880,1040].map(onset=>n(onset,'8',{tuplet:{actualNotes:3,normalNotes:2},rest:onset===880})),n(1200,'8',{dotted:true,rest:true}),n(1560,'8',{dotted:true})]]);
 const slots=playbackSlots(s,[0]);assert.deepEqual(slots.map(s=>s.tick),[0,240,360,720,880,1040,1200,1560]);
 const points=rhythmAnchors(slots.map((s,i)=>({tick:s.tick,x:[80,145,175,260,282,320,360,470][i]})).concat({tick:1920,x:530}));
 for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1];assert.equal(playheadX(points,a.tick),a.x);assert.equal(playheadX(points,(a.tick+b.tick)/2),(a.x+b.x)/2);}
 assert.equal(playheadX(points,1920),530);assert.equal(rhythmStateAt(rhythmTimeline(s),900).articulation,'rest');
 for(const bpm of [48,120,240])for(const e of scoreTimeline(s,bpm).events)assert.equal(playheadX(points,e.start*bpm*480/60),points.find(p=>Math.abs(p.tick-e.start*bpm*480/60)<1e-6).x);
});
test('chords and simultaneous independent voices share onsets, never sum voice lengths',()=>{
 const s=score([[n(0,'1',{id:'long',tones:[{string:1,midi:64},{string:2,midi:60}]}),n(480,'4',{id:'later'}),n(0,'4',{id:'other',string:3,midi:55}),n(960,'2')]]);
 const slots=playbackSlots(s,[0]);assert.deepEqual(slots.map(s=>s.tick),[0,0,480,960]);assert.equal(slotAtTick(slots,500).event,1);
 assert.equal(rhythmStateAt(rhythmTimeline(s),500).notes.length,2);
 assert.deepEqual(rhythmAnchors([{tick:0,x:80},{tick:0,x:80},{tick:480,x:100}]),[{tick:0,x:80},{tick:480,x:100}]);
});
test('cross-bar tied sustain is distinct from legato; repeat jumps clear incoming links',()=>{
 const s=score([[n(0,'1',{id:'a',tieTo:'b'})],[n(0,'1',{id:'b'})]]);s.repeatMarks=[{repeatStart:true},{repeatEnd:true}];
 const timeline=rhythmTimeline(s);assert.equal(rhythmStateAt(timeline,1920).articulation,'tie');assert.deepEqual(rhythmStateAt(timeline,1920).attacks,[]);assert(rhythmStateAt(timeline,2500).marks.includes('0:0'));
 assert.equal(rhythmStateAt(timeline,3840).articulation,'attack');assert.equal(rhythmStateAt(timeline,5760).articulation,'tie');
 const mismatch=structuredClone(s);mismatch.measures[1][0].midi=65;assert.equal(rhythmStateAt(rhythmTimeline(mismatch),1920).articulation,'attack');
});
test('H/P/slide connect at authored onset, ornament flags never insert notes or change duration',()=>{
 const s=score([[n(0,'8',{technique:'H'}),n(240,'8',{technique:'P',midi:66}),n(480,'8',{technique:'S'}),n(720,'8',{midi:69}),n(960,'2',{vibrato:true,palmMute:true,harmonic:true,arpeggio:'up',pickStroke:'down'})]]);
 const t=rhythmTimeline(s);for(const tick of [240,480,720]){const state=rhythmStateAt(t,tick);assert.equal(state.articulation,'connected');assert.deepEqual(state.attacks,[]);assert.equal(state.marks.length,2);}
 assert.deepEqual(rhythmStateAt(t,720).techniques,['S']);assert.equal(rhythmStateAt(t,960).articulation,'attack');
 assert.deepEqual(t.map(s=>s.tick),[0,240,480,720,960,1920]);
 const gap=structuredClone(s);gap.measures[0][1].onset=300;assert.equal(rhythmStateAt(rhythmTimeline(gap),300).articulation,'attack');
});

test('a chord can contain a connected slide and a newly picked string together',()=>{
 const s=score([[n(0,'4',{technique:'S',tones:[{string:1,midi:64},{string:2,midi:60}]}),n(480,'2',{tones:[{string:1,midi:66},{string:3,midi:55}]})]]);
 const state=rhythmStateAt(rhythmTimeline(s),480);assert.equal(state.articulation,'mixed');assert.deepEqual(state.attacks,['0:1']);assert(state.marks.includes('0:0'));
});

test('empty measures and leading silence retain bar timing and clear fingering',()=>{
 const s=score([[n(0,'4')],[],[n(480,'4')],[n(0,'1',{rest:true})]]);
 const slots=playbackSlots(s,[0,1,2,3]);
 assert.equal(slotAtTick(slots,2000).bar,1);
 assert.equal(slotAtTick(slots,4000).event,-1);
 assert.equal(slotAtTick(slots,4320).event,0);
 const states=rhythmTimeline(s);
 for(const tick of [480,2000,4000,5760])assert.equal(rhythmStateAt(states,tick).articulation,'rest');
 assert.equal(rhythmStateAt(states,4320).articulation,'attack');
});

test('fingering highlights only the current note glyph and clears in rests/off',()=>{
 const state=rhythmTimeline(score([[n(0,'8',{technique:'S'}),n(240,'8',{midi:69}),n(480,'2',{rest:true})]]));
 const make=(events,role)=>({dataset:{rhythmEvents:events,rhythmRole:role},active:false,classList:{toggle(name,on){this.owner.active=on;},remove(){this.owner.active=false;}}});
 const nodes=[make('0:0','note'),make('0:1','note'),make('0:0','technique'),make('0:2','note')];
 nodes.forEach((n,i)=>{n.classList.owner=n;n.querySelectorAll=()=>n.dataset.rhythmRole==='note'&&i!==3?[n]:[];});
 const highlight=rhythmHighlighter({querySelectorAll:()=>nodes,dataset:{}},state);
 highlight.update(300);assert.deepEqual(nodes.map(n=>n.active),[false,true,false,false]);
 highlight.update(600);assert.deepEqual(nodes.map(n=>n.active),[false,false,false,false]);
 highlight.update(600,false);assert.ok(nodes.every(n=>!n.active));
});
