import test from 'node:test';import assert from 'node:assert/strict';
import {followPageStart,followScrollTarget} from '../src/etudes/practiceFollowGeometry.js';
const rows=Array.from({length:8},(_,i)=>({top:10+i*200,bottom:210+i*200}));
test('pages turn only when the next complete system begins',()=>{assert.equal(followPageStart(rows,0,400),0);assert.equal(followPageStart(rows,1,400),0);assert.equal(followPageStart(rows,2,400),2);assert.equal(followPageStart(rows,3,400),2);});
test('line mode places the current system on top and clamps the end',()=>{assert.equal(followScrollTarget(rows,1,400,'line',1210),210);assert.equal(followScrollTarget(rows,7,400,'line',1210),1210);});
test('one system, varied heights, and backwards repeats need no bar-count assumptions',()=>{assert.equal(followPageStart(rows,3,210),3);assert.equal(followPageStart(rows,3,50),3);const mixed=[{top:0,bottom:100},{top:100,bottom:330},{top:330,bottom:480}];assert.equal(followPageStart(mixed,1,300),1);assert.equal(followPageStart(mixed,2,300),2);assert.equal(followScrollTarget(mixed,0,300,'page',500),0);});
import {followHorizontalTarget,followFingeringTarget} from '../src/etudes/practiceFollowGeometry.js';
test('horizontal follow leaves lookahead and clamps both score edges',()=>{assert.equal(followHorizontalTarget(200,400,0,800),0);assert.equal(followHorizontalTarget(350,400,0,800),50);assert.equal(followHorizontalTarget(1150,400,700,800),800);assert.equal(followHorizontalTarget(25,400,800,800,true),0);});
test('row changes and backward seeks return the current beat to view',()=>{assert.equal(followHorizontalTarget(100,400,800,800,true),20);assert.equal(followHorizontalTarget(450,400,700,800),370);});
test('second-bar lookahead starts before the old right-edge trigger',()=>{assert.equal(followHorizontalTarget(220,400,0,500,false,true),80);assert.equal(followHorizontalTarget(220,400,0,500),0);assert.equal(followHorizontalTarget(650,400,300,500,false,true),500);});
test('fingering follow anchors each rhythmic event at one stable reading point',()=>{assert.equal(followFingeringTarget(100,400,800),0);assert.equal(followFingeringTarget(368,400,800),200);assert.equal(followFingeringTarget(1200,400,800),800);});

test('first system retains the title and mobile top inset on start and repeat',()=>{for(const top of [24,180]){const systems=[{top,bottom:top+180},{top:top+200,bottom:top+380}];for(const mode of ['line','page'])assert.equal(followScrollTarget(systems,0,400,mode,1000),0);assert.equal(followScrollTarget(systems,1,400,'line',1000),top+200);}});
