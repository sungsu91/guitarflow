import test from 'node:test';
import assert from 'node:assert/strict';
import {createPattern,BEATS,clone,timeline,positionAt,measureOrder,measureStartTick,playbackTicks,validPattern,readStore,STORAGE_KEY} from '../src/rhythm-trainer/model.js';
import {RhythmTransport} from '../src/rhythm-trainer/transport.js';
import {scoreCursorX} from '../src/rhythm-trainer/notationLayout.js';
globalThis.cancelAnimationFrame=()=>{};
const pattern=()=>({...createPattern(2),measures:[[clone(BEATS[3]),clone(BEATS[0])],[clone(BEATS[2]),clone(BEATS[0])]],measureRepeats:[true,false],bpm:60,countIn:false,loop:false,click:false});
test('per-bar repeat persists and expands only the selected bar twice',()=>{
 const p=pattern();assert.ok(validPattern(p));assert.deepEqual(measureOrder(p),[0,0,1]);assert.equal(playbackTicks(p),72);assert.equal(measureStartTick(p,1),48);
 const restored=readStore({getItem:key=>key===STORAGE_KEY?JSON.stringify({patterns:[p],draft:p}):null});assert.deepEqual(restored.draft.measureRepeats,[true,false]);
 assert.equal(validPattern({...p,measureRepeats:[true]}),false);
});
test('second pass highlight and cursor return to the same written note',()=>{
 const p=pattern();for(const tick of [0,6,9,12,23.9]){const first=positionAt(p,tick),second=positionAt(p,tick+24);assert.equal(second.measure,0);assert.equal(second.repeatPass,2);assert.ok(Math.abs(first.tick-second.tick)<1e-8);assert.equal(first.event.index,second.event.index);assert.ok(Math.abs(scoreCursorX(p.measures[0],2,first)-scoreCursorX(p.measures[0],2,second))<1e-8);}
 assert.equal(positionAt(p,48).measure,1);assert.equal(positionAt(p,72).repeatPass,1);
});
test('audio repeats the selected bar exactly once before advancing without a new count-in',()=>{
 const p=pattern(),ctx={currentTime:0},engine=new RhythmTransport(ctx,{},()=>{}),sounds=[];
 engine.configure(p);engine.anchorTime=0;engine.anchorTick=0;engine.next=0;engine.sound=t=>sounds.push(t);
 for(let t=0;t<6.1;t+=.02){ctx.currentTime=t;engine.schedule();}
 assert.equal(engine.total,72);assert.deepEqual(sounds,[0,.5,.75,1,2,2.5,2.75,3,4,4.5,5]);
});
test('repeat jump attacks again; outgoing ties connect only when advancing to the following bar',()=>{
 const p=pattern();p.measures[0][1][0].tie=true;
 const events=timeline(p);assert.equal(events.find(e=>e.at===24).continuation,false);assert.equal(events.find(e=>e.at===48).continuation,true);
});
