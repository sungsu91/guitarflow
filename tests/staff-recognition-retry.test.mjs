import test from 'node:test';
import assert from 'node:assert/strict';
import {parseStaffTokens} from '../src/omr/staffTokens.js';
import {padStaffSystem,hasCompleteStaffRhythm,selectStaffRhythmRetry,recognizeStaffSystem} from '../src/omr/staffRecognition.js';

const raw=body=>'clef-G2+keySignature-CM+'+body+'+barline';
const parse=body=>parseStaffTokens(raw(body));
test('padding preserves every source pixel at its original scale',()=>{
 const input={width:2,height:1,staff:{spacing:1},rgba:new Uint8ClampedArray([0,1,2,255,3,4,5,255]).buffer},before=input.rgba.slice(0),p=padStaffSystem(input),data=new Uint8ClampedArray(p.rgba);
 assert.equal(p.width,6);assert.equal(p.height,5);assert.deepEqual(data.slice((2*6+2)*4,(2*6+4)*4),new Uint8ClampedArray(before));assert.deepEqual(input.rgba,before);assert.deepEqual(data.slice(0,4),new Uint8ClampedArray([255,255,255,255]));
});
test('a failed rhythm can be repaired only with matching pitches, rests, meter and bar count',()=>{
 const before=parse('rest-eighth+note-G4_eighth+note-C5_quarter'),after=parse('rest-quarter+note-G4_quarter+note-C5_half');
 const fixed=selectStaffRhythmRetry(before,after);
 assert.deepEqual(fixed.measures[0].events.map(e=>e.duration),['4','4','2']);assert(hasCompleteStaffRhythm(fixed.measures[0]));assert.deepEqual(fixed.retry.acceptedMeasures,[1]);assert.equal(fixed.retry.originalRaw,before.raw);
 assert.deepEqual(parseStaffTokens(fixed.raw).measures,fixed.measures);
 for(const wrong of [parse('rest-quarter+note-A4_quarter+note-C5_half'),parse('note-G4_quarter+note-G4_quarter+note-C5_half'),parse('rest-quarter+note-G4_half+note-C5_half'),parse('rest-quarter+note-G4_quarter+note-C5_half+barline+note-C5_whole'),parseStaffTokens(after.raw.replace('CM','GM')),parseStaffTokens(after.raw.replace('clef-G2','clef-F4'))])assert.equal(selectStaffRhythmRetry(before,wrong),before);
});
test('a successful bar and an unread token are never overwritten to fit the meter',()=>{
 const valid=parse('note-C5_whole');assert.equal(selectStaffRhythmRetry(valid,parse('note-C5_half')),valid);
 const unknown=parse('nonote_quarter+note-C5_quarter');assert.equal(selectStaffRhythmRetry(unknown,parse('note-D5_half+note-C5_half')),unknown);
 const mixed=parse('note-C5_whole+barline+note-D5_half'),candidate=parse('note-C5_half+barline+note-D5_whole'),fixed=selectStaffRhythmRetry(mixed,candidate);
 assert.deepEqual(fixed.measures[0],mixed.measures[0]);assert.deepEqual(fixed.retry.acceptedMeasures,[2]);
});
test('valid systems run once; failed systems run at most twice; cancellation prevents retry',async()=>{
 const system=()=>({width:2,height:1,staff:{spacing:1},rgba:new Uint8ClampedArray(8).fill(255).buffer});
 let calls=0;await recognizeStaffSystem({recognize:async()=>{calls++;return {text:raw('note-C5_whole')};}},system());assert.equal(calls,1);
 calls=0;const fixed=await recognizeStaffSystem({recognize:async()=>({text:raw(++calls===1?'note-C5_half':'note-C5_whole')})},system());assert.equal(calls,2);assert(hasCompleteStaffRhythm(fixed.measures[0]));
 const controller=new AbortController();calls=0;
 await assert.rejects(recognizeStaffSystem({recognize:async()=>{calls++;controller.abort();return {text:raw('note-C5_half')};}},system(),undefined,{signal:controller.signal}),{name:'AbortError'});assert.equal(calls,1);
});

test('an optional retry failure preserves the first reading and its review warning',async()=>{
 let calls=0;const text=raw('note-C5_half');
 const parsed=await recognizeStaffSystem({recognize:async()=>{if(calls++)throw Error('worker timeout');return {text};}},{width:1,height:1,staff:{spacing:1},rgba:new Uint8ClampedArray(4).buffer});
 assert.equal(parsed.raw,text);assert.deepEqual(parsed.measures,parseStaffTokens(text).measures);assert(parsed.warnings.includes('rhythm-retry-failed'));
});

test('a beamed 16th/dotted-8th phrase misread at double speed is restored from independent OCR evidence',()=>{
 const before=parse('note-D5_thirty_second+note-E5_sixteenth.+note-E5_sixteenth.+note-D5_thirty_second+note-D5_thirty_second+note-C5_thirty_second+note-C5_sixteenth+note-C5_eighth');
 const candidate=parse('note-D5_sixteenth+note-E5_eighth.+note-E5_eighth.+note-D5_sixteenth+note-D5_sixteenth+note-C5_sixteenth+note-C5_eighth+note-C5_quarter');
 const fixed=selectStaffRhythmRetry(before,candidate);
 assert.deepEqual(fixed.measures,candidate.measures);assert.equal(fixed.measures[0].events.filter(e=>e.unread).length,0);assert(hasCompleteStaffRhythm(fixed.measures[0]));
 // Genuine 32nds in a full bar must never be doubled just to prefer slow notes.
 const full=parse(Array(32).fill('note-C5_thirty_second').join('+'));
 const doubled=parse(Array(32).fill('note-C5_sixteenth').join('+'));
 assert.equal(selectStaffRhythmRetry(full,doubled),full);
});
