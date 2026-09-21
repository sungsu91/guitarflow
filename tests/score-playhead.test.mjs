import test from 'node:test';
import assert from 'node:assert/strict';
import {playheadX} from '../src/etudes/scorePlayhead.js';

// Sixteenth, dotted eighth, triplet eighths, then a sustained final event.
const points=[{tick:0,x:30},{tick:120,x:70},{tick:480,x:150},{tick:640,x:200},{tick:800,x:250},{tick:960,x:300},{tick:1920,x:500}];
test('legacy fingering value also moves continuously between written onsets',()=>{
 for(let i=0;i<points.length-1;i++){
  assert.equal(playheadX(points,points[i].tick,'fingering'),points[i].x);
  assert.equal(playheadX(points,(points[i].tick+points[i+1].tick)/2,'fingering'),(points[i].x+points[i+1].x)/2);
 }
 assert.equal(playheadX(points,1920,'fingering'),500);
 assert.equal(playheadX(points,0,'fingering'),30);
});
test('other follow modes retain continuous audio-clock movement',()=>{
 for(const mode of [undefined,'line','page','off'])assert.equal(playheadX(points,60,mode),50);
 assert.equal(playheadX([],60,'fingering'),0);
});
