import test from 'node:test';
import assert from 'node:assert/strict';
import {guitarFingerParts,rolledChordAttack} from '../src/audio/guitarArticulation.js';

test('finger attacks renew at the written boundary while slides/bends/ties remain continuous',()=>{
 const segments=[{start:0,duration:.5,midi:69,fret:5},{start:.5,duration:.25,midi:71,fret:7,connection:'H'},{start:.75,duration:.25,midi:69,fret:5,connection:'P'},{start:1,duration:.5,midi:69,fret:5,connection:'bend',expressions:[{start:1,duration:.5,bendEffect:{phase:'up',amount:1}}]}];
 const phrase={start:0,duration:1.5,midi:69,string:1,fret:5,segments},before=structuredClone(phrase),parts=guitarFingerParts(phrase);
 assert.deepEqual(parts.map(p=>[p.start,p.duration,p.midi,p.fingerAttack]),[[0,.5,69,null],[.5,.25,71,'H'],[.75,.75,69,'P']]);
 assert.equal(parts[2].segments[1].expressions[0].bendEffect.phase,'up');assert(parts.every(p=>p.string===1&&p.segments[0].connection===null));
 assert.deepEqual(phrase,before);
 for(const connection of [null,'S','bend']){const continuous={...phrase,segments:segments.slice(0,2).map(s=>({...s,connection}))};assert.equal(guitarFingerParts(continuous)[0],continuous);}
});

test('even a fast six-string roll leaves sounding time before the next written note',()=>{
 for(const duration of [.0625,.125,.5,2]){
  const tones=Array.from({length:6},(_,i)=>rolledChordAttack(6,i,duration));
  assert.equal(tones[0].delay,0);assert(tones.at(-1).delay<duration*.4);
  for(let i=1;i<tones.length;i++)assert(tones[i].delay>tones[i-1].delay);
  assert(tones.every(t=>t.size===6&&t.velocity>0&&t.velocity<=1));
 }
});
