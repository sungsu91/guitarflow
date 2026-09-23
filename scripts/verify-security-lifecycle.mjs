import assert from 'node:assert/strict';
import { createServer, preview } from 'vite';
import { createServer as createHttpServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const fixtureId = resolve('tmp/security-hook-fixture.js').replaceAll('\\', '/');
const fixture = `
import React, {Activity, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import useAudioStudio from '/src/audio-studio/useAudioStudio.js';
function Probe(){const controller=useAudioStudio();useEffect(()=>{window.controller=controller;});return null;}
function Root(){const [visible,setVisible]=useState(true);window.showStudio=setVisible;return React.createElement(Activity,{mode:visible?'visible':'hidden'},React.createElement(Probe));}
createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(Root)));
`;
let dev, production, parent, browser;
try {
  dev = await createServer({ server: { host: '127.0.0.1', port: 0, strictPort: false }, plugins: [{
    name: 'security-test-fixture',
    resolveId(id) { if (id === '/__security-hook.js') return fixtureId; },
    load(id) { if (id === fixtureId) return fixture; },
    configureServer(server) {
      server.middlewares.use('/__security-test', async (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.end(await server.transformIndexHtml('/__security-test', '<div id="root"></div><script type="module" src="/__security-hook.js"></script>'));
      });
    },
  }] });
  await dev.listen();
  const devOrigin = `http://127.0.0.1:${dev.httpServer.address().port}`;
  production = await preview({ preview: { host: '127.0.0.1', port: 0, strictPort: false } });
  const productionOrigin = `http://127.0.0.1:${production.httpServer.address().port}`;
  parent = createHttpServer((_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<iframe src="${productionOrigin}/"></iframe>`);
  });
  await new Promise(resolve => parent.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });

  const context = await browser.newContext({ permissions: ['microphone', 'camera'] });
  await context.addInitScript(() => {
    window.capturedTracks = [];
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      const stream = await original(constraints);
      window.capturedTracks.push(...stream.getTracks());
      if (window.holdPermission) await new Promise(resolve => { window.finishPermission = resolve; });
      return stream;
    };
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${devOrigin}/__security-test`);
  await page.waitForFunction(() => window.controller);
  await page.evaluate(() => window.controller.commitProject(p => ({ ...p, settings: { ...p.settings, countInBars: 0 } })));
  await page.waitForFunction(() => window.controller.project.settings.countInBars === 0);
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.controller.startRecording());
    await page.waitForFunction(() => window.controller.recordingState.phase === 'recording');
    await page.waitForTimeout(450);
    await page.evaluate(() => window.controller.stopRecording());
    await page.waitForFunction(() => window.capturedTracks.every(t => t.readyState === 'ended'));
    await page.waitForFunction(() => window.controller.recordingState.phase === 'idle', null, { timeout: 30_000 });
  }
  assert.equal(await page.evaluate(() => window.controller.project.audioSources.length), 3);
  console.log('PASS: real MediaRecorder, permission allowed, 3 recordings retained, every track ended');

  await page.evaluate(() => { window.holdPermission = true; void window.controller.startRecording(); });
  await page.waitForFunction(() => window.finishPermission);
  await page.evaluate(() => window.showStudio(false));
  await page.waitForTimeout(100);
  await page.evaluate(() => window.finishPermission());
  await page.waitForFunction(() => window.capturedTracks.every(t => t.readyState === 'ended'));
  await page.evaluate(() => { window.holdPermission = false; window.showStudio(true); });
  await page.waitForFunction(() => window.controller.recordingState.phase === 'idle');
  assert.equal(await page.evaluate(() => window.controller.project.audioSources.length), 3);
  console.log('PASS: late permission after Activity navigation releases tracks without recording');

  await page.evaluate(() => window.controller.startRecording());
  await page.waitForFunction(() => window.controller.recordingState.phase === 'recording');
  await page.waitForTimeout(450);
  await page.evaluate(() => window.showStudio(false));
  await page.waitForFunction(() => window.capturedTracks.every(t => t.readyState === 'ended'));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.showStudio(true));
  await page.waitForFunction(() => window.controller.project.audioSources.length === 4);
  assert.deepEqual(errors, []);
  console.log('PASS: leaving during recording releases every track and preserves the completed clip');

  const denied = await browser.newContext();
  const deniedPage = await denied.newPage();
  await deniedPage.goto(`${devOrigin}/__security-test`);
  const cdp = await denied.newCDPSession(deniedPage);
  await cdp.send('Browser.setPermission', { permission: { name: 'microphone' }, setting: 'denied', origin: devOrigin });
  await deniedPage.waitForFunction(() => window.controller);
  await deniedPage.evaluate(() => window.controller.startRecording());
  await deniedPage.waitForFunction(() => window.controller.recordingState.phase === 'idle' && window.controller.notice.includes('마이크 권한'));
  console.log('PASS: browser permission denied returns to idle');

  const prodPage = await context.newPage();
  const response = await prodPage.goto(productionOrigin);
  const headers = response.headers();
  const expected = JSON.parse(readFileSync('vercel.json', 'utf8')).headers.find(r => r.source === '/(.*)').headers;
  for (const { key, value } of expected) assert.equal(headers[key.toLowerCase()], value);
  assert.equal(headers['permissions-policy'], undefined);
  await prodPage.waitForSelector('main.app', { timeout: 30_000 });
  assert.equal(await prodPage.evaluate(() => document.permissionsPolicy?.allowsFeature('microphone') ?? document.featurePolicy.allowsFeature('microphone')), true);
  assert.equal(await prodPage.evaluate(() => document.permissionsPolicy?.allowsFeature('camera') ?? document.featurePolicy.allowsFeature('camera')), true);
  await prodPage.evaluate(async () => { const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true }); stream.getTracks().forEach(t => t.stop()); if (!stream.getTracks().every(t => t.readyState === 'ended')) throw Error('track leak'); });
  console.log('PASS: production headers, top-level app, camera and microphone capture remain allowed');

  const framePage = await context.newPage(), blocked = [];
  framePage.on('console', message => { if (/frame-ancestors|X-Frame-Options|Refused to frame/i.test(message.text())) blocked.push(message.text()); });
  await framePage.goto(`http://127.0.0.1:${parent.address().port}/`);
  await framePage.waitForTimeout(1200);
  assert.ok(blocked.length > 0, 'browser must report iframe rejection');
  for (const frame of framePage.frames().slice(1)) assert.equal(await frame.locator('#root').count(), 0);
  console.log('PASS: browser rejects production app inside a cross-origin iframe');
} finally {
  await browser?.close();
  await dev?.close();
  if (production) await new Promise(resolve => production.httpServer.close(resolve));
  if (parent) await new Promise(resolve => parent.close(resolve));
}
