import test from 'node:test';
import assert from 'node:assert/strict';
import {alignScorePianoAttack} from '../src/audio/scorePianoSample.js';
const audio={createBuffer(numberOfChannels,length,sampleRate){const channels=Array.from({length:numberOfChannels},()=>new Float32Array(length));return {numberOfChannels,length,sampleRate,getChannelData:i=>channels[i]};}};
test('remove only pre-attack recording noise, identically across stereo channels',()=>{
 const original=audio.createBuffer(2,48000,48000);original.getChannelData(0).fill(.0005,0,3360);original.getChannelData(0)[3360]=.5;original.getChannelData(1)[3360]=-.4;
 const aligned=alignScorePianoAttack(audio,original);assert.equal(aligned.length,48000-3312);assert.equal(aligned.getChannelData(0)[48],.5);assert.equal(aligned.getChannelData(1)[48],original.getChannelData(1)[3360]);assert.equal(original.length,48000);assert.equal(original.getChannelData(0)[3360],.5);
});
test('already aligned and silent samples do not get copied or lose the attack',()=>{
 const silent=audio.createBuffer(1,48000,48000);assert.equal(alignScorePianoAttack(audio,silent),silent);
 const immediate=audio.createBuffer(1,48000,48000);immediate.getChannelData(0)[0]=.5;assert.equal(alignScorePianoAttack(audio,immediate),immediate);
});
test('an unexpectedly late attack is left intact rather than cutting arbitrary audio',()=>{
 const late=audio.createBuffer(1,48000,48000);late.getChannelData(0)[24000]=.5;assert.equal(alignScorePianoAttack(audio,late),late);
});
