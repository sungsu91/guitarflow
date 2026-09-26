import test from 'node:test';
import assert from 'node:assert/strict';
import { isTrustedLocalEditorRequest } from '../scripts/local-editor-request.mjs';

const request = (headers = {}, address = '127.0.0.1') => ({
  socket: { remoteAddress: address },
  headers: { host: 'localhost:5186', 'content-type': 'application/json', ...headers },
});
test('local source editors allow same-origin JSON and loopback CLI requests', () => {
  assert.equal(isTrustedLocalEditorRequest(request()), true);
  assert.equal(isTrustedLocalEditorRequest(request({ origin: 'http://localhost:5186', 'sec-fetch-site': 'same-origin' }, '::1')), true);
  assert.equal(isTrustedLocalEditorRequest(request({ host: '[::1]:5186', origin: 'http://[::1]:5186' }, '::1')), true);
});
test('local source editors reject cross-site, simple POST, and non-loopback requests', () => {
  for (const headers of [
    { origin: 'https://attacker.example' }, { origin: 'null' },
    { origin: 'http://localhost:5187' }, { 'sec-fetch-site': 'cross-site' },
    { 'sec-fetch-site': 'same-site' }, { 'content-type': 'text/plain' },
    { 'content-type': 'application/x-www-form-urlencoded' },
    { host: 'attacker.example' }, { host: 'localhost:5186@attacker.example' },
  ]) assert.equal(isTrustedLocalEditorRequest(request(headers)), false);
  assert.equal(isTrustedLocalEditorRequest(request({}, '192.168.1.3')), false);
});
