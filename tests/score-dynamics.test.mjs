import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('score output applies authored dynamics without staggering simultaneous strings or changing legacy levels',()=>{
 const calls=[],audio={currentTime:1,createGain:()=>({gain:{value:0},connect(){},disconnect(){}})};
 const source=fs.readFileSync(new URL('../src/audio/scoreInstrument.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');
 const context={audio,Number,Math,Set,Map,WeakMap,getAudioBusInput:()=>({}),AUDIO_BUS_IDS:{INSTRUMENT:'instrument'},warmGuitarPhrase(){},createPalmMuteGate:()=>null,scheduleGuitarPhrase:(audio,phrase,at,destination,level)=>{calls.push({phrase,at,level});return {release(){},addEventListener(){}};}};
 vm.createContext(context);vm.runInContext(source+'\nglobalThis.output=createScoreVoiceOutput(audio);',context);
 const base={start:0,duration:1,midi:60};
 context.output.schedule([{...base,string:1,velocity:.5},{...base,string:2,velocity:.8}],3);
 assert.equal(calls[0].at,3);assert.equal(calls[1].at,3);
 assert.equal(calls[0].level,.46/Math.sqrt(2)*.5);assert.equal(calls[1].level,.46/Math.sqrt(2)*.8);
 for(const [velocity,expected] of [[undefined,1],[NaN,1],[2,1]]){
  context.output.schedule([{...base,string:3,velocity}],4);assert.equal(calls.at(-1).level,.46*expected);
 }
 const count=calls.length;
 for(const velocity of [0,-2])assert.equal(context.output.schedule([{...base,string:3,velocity}],4).length,0);
 assert.equal(calls.length,count,'silent dynamics must not feed zero into an exponential gain ramp');
 // A roll arrives as single-note batches; it must retain the parent chord's
 // normalization instead of becoming six solo attacks at full strength.
 context.output.schedule([{...base,string:6,velocity:.8,roll:{size:6,velocity:.9}}],5);
 const rolled=calls.at(-1);assert.equal(rolled.at,5);assert.equal(rolled.level,.46/Math.sqrt(6)*.9*.8);
});
