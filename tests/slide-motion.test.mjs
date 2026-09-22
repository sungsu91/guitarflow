import test from 'node:test';
import assert from 'node:assert/strict';
import {slideMotionPosition} from '../src/etudes/slideMotion.js';
import {rhythmTimeline,rhythmStateAt} from '../src/etudes/rhythmProgress.js';

const n=(fret,onset,duration='8',extra={})=>({id:`${onset}`,fret,midi:64+fret,string:1,onset,duration,...extra});
test('slides move continuously between written onsets in either direction',()=>{
 const geometry={x1:100,x2:220,y1:50,y2:45},slide={start:480,end:720};
 assert.deepEqual(slideMotionPosition(slide,480,geometry),{x:100,y:50,progress:0});
 assert.deepEqual(slideMotionPosition(slide,600,geometry),{x:160,y:47.5,progress:.5});
 assert.deepEqual(slideMotionPosition(slide,720,geometry),{x:220,y:45,progress:1});
 assert.equal(slideMotionPosition(slide,600,{...geometry,y1:45,y2:50}).y,47.5);
 const slower={start:480,end:960};
 assert.equal(slideMotionPosition(slower,600,geometry).progress,.25);
});
test('rest, disconnected destination and repeat jumps never invent a slide',()=>{
 const score={meter:[4,4],measures:[[n(0,0,'8',{technique:'S'}),n(5,240),n(0,480,'2',{rest:true})]]};
 const states=rhythmTimeline(score);
 assert.deepEqual(rhythmStateAt(states,120).slides,[{from:'0:0',to:'0:1',start:0,end:240}]);
 assert.deepEqual(rhythmStateAt(states,240).slides,[]);
 assert.deepEqual(rhythmStateAt(states,600).slides,[]);
 const gap=structuredClone(score);gap.measures[0][1].onset=300;
 assert.deepEqual(rhythmStateAt(rhythmTimeline(gap),120).slides,[]);
 score.repeatMarks=[{repeatStart:true,repeatEnd:true}];
 assert.deepEqual(rhythmStateAt(rhythmTimeline(score),2040).slides,[{from:'0:0',to:'0:1',start:1920,end:2160}]);
});
