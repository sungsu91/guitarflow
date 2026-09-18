import test from 'node:test';import assert from 'node:assert/strict';
import {followPageStart,followScrollTarget} from '../src/etudes/practiceFollowGeometry.js';
const rows=Array.from({length:8},(_,i)=>({top:10+i*200,bottom:210+i*200}));
test('pages turn only when the next complete system begins',()=>{assert.equal(followPageStart(rows,0,400),0);assert.equal(followPageStart(rows,1,400),0);assert.equal(followPageStart(rows,2,400),2);assert.equal(followPageStart(rows,3,400),2);});
test('line mode places the current system on top and clamps the end',()=>{assert.equal(followScrollTarget(rows,1,400,'line',1210),210);assert.equal(followScrollTarget(rows,7,400,'line',1210),1210);});
test('one system, varied heights, and backwards repeats need no bar-count assumptions',()=>{assert.equal(followPageStart(rows,3,210),3);assert.equal(followPageStart(rows,3,50),3);const mixed=[{top:0,bottom:100},{top:100,bottom:330},{top:330,bottom:480}];assert.equal(followPageStart(mixed,1,300),1);assert.equal(followPageStart(mixed,2,300),2);assert.equal(followScrollTarget(mixed,0,300,'page',500),0);});
