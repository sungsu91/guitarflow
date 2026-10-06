import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {staffSystemToAnalysis} from '../src/omr/staffTokens.js';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
import {compileDocumentV2} from '../src/etudes/scoreModel.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
const root='artifacts/piano-completion-20261006';
function audio(parsed,system,voice){
 const other=voice==='right'?'left':'right',p={...parsed,measures:parsed.measures.map(b=>({...b,events:[...b.events.map(e=>({...e,voice})),{index:-1,raw:'rest-whole',duration:'1',rest:true,notes:[],voice:other}]}))};
 const target={instrument:'piano',notationPitch:'concert'},staff=staffSystemToAnalysis(p,{system,page:1,width:2084,height:2947,target,octaveShift:0}).staff;
 const doc=analysisToDocument({fileName:'source-evidence',target,pages:[{page:1,notation:true,staffs:[staff]}],summary:{}}),compiled=compileDocumentV2(doc);assert.deepEqual(compiled.errors,[]);
 return scoreTimeline(compiled.score,60).events.filter(n=>n.voice===voice).map(n=>[n.midi,n.start,n.duration]);
}
const p3=JSON.parse(await readFile(`${root}/p3-poly-long/now-p3-upper-last.json`));
const right=audio(p3.results[0].parsed,p3.systems.find(s=>s.id===8),'right');
// Original NOW page 3, last piano right-hand row: a G4 eighth is tied
// over the barline into a whole G4; E4 separately holds for 2.5 beats.
const expectedRight=[[74,0,4],[79,0,4],[69,4,.5],[67,4.5,.5],[62,5,.5],[69,5.5,1],[62,6.5,.5],[66,7,.5],[67,7.5,4.5],[64,8,2.5],[62,10.5,.5],[66,10.5,.5],[60,11,.5],[64,11,.5],[59,11.5,.5],[62,11.5,.5],[69,12,.5],[67,12.5,.5],[62,13,.5],[69,13.5,1],[62,14.5,.5],[66,15,1]];
assert.deepEqual(right,expectedRight,'all four right-hand bars, including independently sustained pitches');
const p5=JSON.parse(await readFile(`${root}/p5-fixed/now-p5-piano-staff.json`));assert(!p5.error,p5.error);
const system=JSON.parse(await readFile(`${root}/source/now-p5.json`)).systems.find(s=>s.id===3),left=audio(p5.parsed,system,'left'),expectedLeft=[];
const add=(ps,t,d)=>ps.forEach(p=>expectedLeft.push([p,t,d]));
for(const t of [0,.5,1,1.5])add([36,48],t,.5);add([38,50],2,.5);
for(const [base,low,first,high,middle] of [[4,[38,50],[43,55],[55,59,62],[54,57,62]],[8,[36,48],[36,48],[52,55,60],[52,55,60]]]){
 add(first,base,1);add(high,base+1,.75);add(low,base+1.75,.5);add(middle,base+2.25,.25);add([low[1]],base+2.5,.5);add(middle,base+3,1);
}
assert.deepEqual(left,expectedLeft,'original page 5 first bass row, including both short beams');
const bassResult=JSON.parse(await readFile(`${root}/p3-bass-fixed/now-p3-piano-staff.json`));assert(!bassResult.error,bassResult.error);
const bassSystem=JSON.parse(await readFile(`${root}/p3-bass-header/now-p3-bass-last.json`)).systems.find(s=>s.id===9),bass=audio(bassResult.parsed,bassSystem,'left'),expectedBass=[];
const addBass=(ps,t,d)=>ps.forEach(p=>expectedBass.push([p,t,d]));
addBass([48,55,60],0,3);addBass([55,60,62],3,.75);addBass([55,60,62],3.75,.25);
const timing=[[0,1],[1,.75],[1.75,.5],[2.25,.25],[2.5,.5],[3,.5],[3.5,.25],[3.75,.25]];
for(const [base,first,second,remaining] of [[4,[55,59,62],[43,47,50,55],[50,54,57]],[8,[48,52,55,59],[48,52,55],[48,52,55]],[12,[52,55,59],[52,55,59],[50,54,57]]])for(const [i,[t,d]] of timing.entries())addBass(i===0?first:i===1?second:remaining,base+t,d);
assert.deepEqual(bass,expectedBass,'original page 3 last bass row, including high ledger chord and all tied chords');
await writeFile(`${root}/polyphonic-source-verification.json`,JSON.stringify({right:{page:3,staff:8,bars:4,mode:'saved model tokens with fresh source pixels',actual:right,expected:expectedRight},left:{page:5,staff:3,bars:3,mode:'fresh model run',actual:left,expected:expectedLeft},bass:{page:3,staff:9,bars:4,mode:'fresh model run',actual:bass,expected:expectedBass},fullSongCertified:false},null,2));
console.log(`PASS: ${right.length} right-hand and ${left.length+bass.length} left-hand attacks, exact pitch/onset/release.`);
