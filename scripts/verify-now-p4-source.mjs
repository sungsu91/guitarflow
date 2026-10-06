import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {staffSystemToAnalysis} from '../src/omr/staffTokens.js';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
import {summarizeAnalysis} from '../src/pdf/tab-import/recognition.js';
import {compileDocumentV2} from '../src/etudes/scoreModel.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
const root='artifacts/piano-completion-20261006';
const result=JSON.parse(await readFile(`${root}/live/now-p4-piano-staff.json`));assert(!result.error,result.error);
const system=JSON.parse(await readFile('artifacts/grand-color-20261006/p4-crop/now-p4-bass.json')).systems.find(s=>s.id===6);
// Silence in the untested hand makes a valid two-voice playback harness. This
// fixture neither reads nor certifies the right hand of the source page.
const parsed={...result.parsed,measures:result.parsed.measures.map(b=>({...b,events:[{index:-1,raw:'rest-whole',duration:'1',rest:true,notes:[],voice:'right'},...b.events.map(e=>({...e,voice:'left'}))]}))};
const target={instrument:'piano',notationPitch:'concert'},staff=staffSystemToAnalysis(parsed,{system,page:4,width:2084,height:2947,target,octaveShift:0}).staff;
const pages=[{page:4,width:2084,height:2947,notation:true,staffs:[staff]}];
const document=analysisToDocument({fileName:'NOW-p4-left-row2',target,pages,summary:summarizeAnalysis(pages)}),compiled=compileDocumentV2(document);assert.deepEqual(compiled.errors,[]);
const actual=scoreTimeline(compiled.score,60).events.filter(n=>n.voice==='left').map(({midi,start,duration})=>({midi,start,duration}));
// Independent transcription of the ORIGINAL PDF, page 4, second piano bass
// system (physical staff 6), all three bars. The tied sixteenth pair is one
// sounding eighth; every other printed attack remains separate.
const rhythm=[[0,1],[1,.75],[1.75,.5],[2.25,.25],[2.5,.5],[3,.5],[3.5,.25],[3.75,.25]];
const chords=[[[40,47],[38,45]],[[48,55],[48,55]],[[43,50],[38,45]]];
const expected=chords.flatMap(([opening,following],b)=>rhythm.flatMap(([t,duration],i)=>(i<2?opening:following).map(midi=>({midi,start:b*4+t,duration}))));
assert.deepEqual(actual,expected,'pitch, onset and release including ties must match source, not just total beats');
await writeFile(`${root}/p4-source-verification.json`,JSON.stringify({scope:'NOW page 4 physical bass staff 6 only',freshModelMs:result.ms,bars:3,pitchedAttacks:actual.length,actual,expected},null,2));
console.log(`PASS: ${actual.length} pitched attacks/releases in three source-transcribed bass bars.`);
