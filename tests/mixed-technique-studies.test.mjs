import test from 'node:test';
import assert from 'node:assert/strict';
import {ETUDES} from '../src/etudes/catalog.js';
import {mixedTechniqueStudies} from '../src/etudes/mixedTechniqueStudies.js';
import {compileScoreDocument} from '../src/etudes/scoreDocument.js';
import {scoreTimeline,guitarVoiceTimeline} from '../src/etudes/scorePlayback.js';
import {slurSpans} from '../src/etudes/slurs.js';
for(const template of mixedTechniqueStudies)test(template.id+' compiles, fills eight bars, and preserves expression on reload',()=>{
 const score=ETUDES.find(e=>e.templateId===template.id);assert.ok(score);assert.equal(score.measures.length,8);
 for(const bar of score.measures){assert.equal(bar.reduce((n,e)=>n+1920/Number(e.duration),0),1920);assert.ok(new Set(bar.map(e=>e.duration)).size>=2);}
 const result=compileScoreDocument(JSON.parse(JSON.stringify(score.document)),score);assert.deepEqual(result.errors,[]);assert.deepEqual(result.issues,[]);
 assert.equal(scoreTimeline(result.score,60).duration,32);assert.ok(guitarVoiceTimeline(result.score,60).voices.length);
 if(template.type==='벤딩')assert.ok(result.score.measures.flat().some(e=>e.bendEffect||e.tones?.some(t=>t.bendEffect)));
 if(template.slurMap.some(s=>s.length))assert.ok(slurSpans(result.score.measures).length);
});
