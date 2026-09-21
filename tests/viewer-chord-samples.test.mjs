import test from 'node:test';
import assert from 'node:assert/strict';
import { getViewerChordSample, loadViewerChordSample } from '../src/audio/viewerChordSamples.js';

test('recordings apply only to the supplied natural major triads', () => {
 for(const root of ['C','D','E','F','G','A','B']) assert.ok(getViewerChordSample(root,'major','none'));
 for(const [root,quality,extension] of [['C','minor','none'],['C','major','7'],['C#','major','none'],['C','dim','none']]) {
  assert.equal(getViewerChordSample(root,quality,extension),null);
 }
});

test('concurrent loads share decoding, failed requests can retry', async () => {
 const originalFetch=globalThis.fetch;
 let calls=0, decodes=0, fail=true;
 globalThis.fetch=async()=>{calls++;return {ok:!fail,status:503,arrayBuffer:async()=>new ArrayBuffer(4)}};
 const audio={decodeAudioData:async()=>{decodes++;return {duration:7}}};
 const sample=getViewerChordSample('C','major','none');
 try {
  await assert.rejects(loadViewerChordSample(audio,sample),/503/);
  fail=false;
  const a=loadViewerChordSample(audio,sample),b=loadViewerChordSample(audio,sample);
  assert.equal(a,b);
  assert.deepEqual(await a,{duration:7});
  await loadViewerChordSample(audio,sample);
  assert.equal(calls,2);assert.equal(decodes,1);
 } finally {globalThis.fetch=originalFetch;}
});
