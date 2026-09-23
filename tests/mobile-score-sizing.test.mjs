import test from 'node:test';
import assert from 'node:assert/strict';
import {mobileScoreWidth,MOBILE_SCORE_MAX_WIDTH} from '../src/etudes/mobileScoreSizing.js';

test('mobile scores fit the viewport and retain ordinary engraving and zoom',()=>{
  assert.equal(mobileScoreWidth(358,240),358);
  assert.equal(mobileScoreWidth(358,1600,1.5),2400);
  assert.equal(mobileScoreWidth(800,1600,1,true),800);
});
test('dense scores and invalid sizing cannot create an unbounded scroll surface',()=>{
  assert.equal(MOBILE_SCORE_MAX_WIDTH,4096);
  assert.equal(mobileScoreWidth(358,1e9,1.5),4096);
  assert.equal(mobileScoreWidth(358,4096,100),4096);
  assert.equal(mobileScoreWidth(358,NaN,Infinity),358);
  assert.equal(mobileScoreWidth(1e9,1e9,1,true),4096);
});
