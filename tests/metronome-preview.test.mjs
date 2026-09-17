import test from 'node:test';
import assert from 'node:assert/strict';
import { previewMetronomeTone, stopMetronomePreview } from '../src/audio/metronomePreview.js';

 test('preview cancels older loads and replaces its only voice without touching playback state', async () => {
  const sources = [];
  let finishLoad;
  const param = {setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}};
  class AudioContext {
    currentTime = 0; destination = {};
    async resume() {}
    async decodeAudioData() { return {duration:.2}; }
    createGain() { return {gain:param,connect(){},disconnect(){}}; }
    createBufferSource() { return this.createOscillator(); }
    createOscillator() { const source={frequency:param,connect(){},disconnect(){},start(){source.started=true;},stop(at){if(at===undefined)source.cancelled=true;}};sources.push(source);return source; }
  }
  const oldWindow=globalThis.window, oldFetch=globalThis.fetch;
  globalThis.window={AudioContext};
  globalThis.fetch=()=>new Promise(resolve=>finishLoad=()=>resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}));
  try {
    const late=previewMetronomeTone({id:'sample',src:'/sample.wav'});
    await new Promise(resolve=>setImmediate(resolve));
    await previewMetronomeTone({id:'tick'},false);
    assert.equal(sources.length,1);
    finishLoad(); await late;
    assert.equal(sources.length,1,'stale sample must never start over the newer preview');
    await previewMetronomeTone({id:'tick'});
    assert.equal(sources[0].cancelled,true);
    assert.equal(sources.length,2);
    stopMetronomePreview();assert.equal(sources[1].cancelled,true);
  } finally {globalThis.window=oldWindow;globalThis.fetch=oldFetch;}
});
