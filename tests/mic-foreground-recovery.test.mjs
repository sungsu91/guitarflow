import test from 'node:test';
import assert from 'node:assert/strict';
import { installMicForegroundRecovery } from '../src/audio/micForegroundRecovery.js';

test('foreground resumes interrupted mic and retries blocked resume from touch', async () => {
  const doc = new EventTarget(), win = new EventTarget();
  doc.visibilityState = 'visible';
  let resumes = 0, pauses = 0;
  const context = { state:'interrupted', async resume() { resumes++; if (resumes === 1) throw new Error('gesture required'); this.state='running'; } };
  const session = {audioContext:context,rawStream:{getAudioTracks:()=>[{readyState:'live'}]}};
  const dispose = installMicForegroundRecovery({doc,win,getSession:()=>session,restart:()=>assert.fail('keep live detector'),onHidden:()=>pauses++});
  doc.visibilityState='hidden'; doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(pauses,1); assert.equal(resumes,0);
  doc.visibilityState='visible'; doc.dispatchEvent(new Event('visibilitychange'));
  await new Promise(resolve=>setTimeout(resolve,0));
  doc.dispatchEvent(new Event('pointerdown'));
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(context.state,'running'); assert.equal(resumes,2);
  dispose(); context.state='interrupted'; win.dispatchEvent(new Event('focus'));
  assert.equal(resumes,2);
});

test('ended stream is reacquired once and disabled microphone remains off', async () => {
  const doc = new EventTarget(), win = new EventTarget(); doc.visibilityState='visible';
  let session = {audioContext:{state:'running'},rawStream:{getAudioTracks:()=>[{readyState:'ended'}]}};
  let requests=0, finish;
  const dispose = installMicForegroundRecovery({doc,win,getSession:()=>session,restart:()=>{requests++; return new Promise(resolve=>{finish=resolve;});}});
  win.dispatchEvent(new Event('pageshow')); win.dispatchEvent(new Event('focus')); doc.dispatchEvent(new Event('pointerdown'));
  assert.equal(requests,1);
  session=null; finish(); await new Promise(resolve=>setTimeout(resolve,0));
  doc.dispatchEvent(new Event('pointerdown')); assert.equal(requests,1);
  dispose();
});

test('a running context whose clock stayed frozen after backgrounding is rebuilt', async () => {
  const doc = new EventTarget(), win = new EventTarget(); doc.visibilityState='hidden';
  const session = {audioContext:{state:'running',currentTime:12},rawStream:{getAudioTracks:()=>[{readyState:'live'}]}};
  let requests=0;
  const dispose = installMicForegroundRecovery({doc,win,getSession:()=>session,restart:async()=>{requests++;}});
  doc.dispatchEvent(new Event('visibilitychange'));
  doc.visibilityState='visible'; doc.dispatchEvent(new Event('visibilitychange'));
  await new Promise(resolve=>setTimeout(resolve,450));
  assert.equal(requests,1);
  dispose();
});
