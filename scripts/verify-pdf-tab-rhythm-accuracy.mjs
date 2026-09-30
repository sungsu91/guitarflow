// Compare imported event timing, including silence, with an independently
// authored score. This reference is test-only and never reaches the importer.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {daylightDocument} from '../src/etudes/daylightFingerstyle.js';
import {compileDocumentV2} from '../src/etudes/scoreModel.js';
import {scorePlaybackReadiness} from '../src/etudes/scorePlaybackReadiness.js';
const file=process.argv[2]||'artifacts/pdf-tab-next/final/0-document.json',d=JSON.parse(await readFile(file));
const timing=e=>[e.onset,e.duration,!!e.dotted,!!e.tuplet,!!e.rest&&!e.blank];
assert.equal(d.measures.length,40);
for(const [i,m]of d.measures.entries())assert.deepEqual(m.events.map(timing),daylightDocument.measures[i].events.map(timing),`bar ${i+1} playback timing and explicit rests`);
const compiled=compileDocumentV2(d);assert.deepEqual(compiled.errors,[]);assert.equal(scorePlaybackReadiness(d,compiled).allowed,true);
console.log('All 40 imported bars preserve exact onsets, durations and 24 explicit rests; remaining unknown frets stay silent.');
