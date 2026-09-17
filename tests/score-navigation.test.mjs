import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,blankMeasure,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {enterFret,deleteMeasure} from '../src/etudes/editorCommands.js';
import {repeatIssues,scoreBarOrder} from '../src/etudes/scoreRepeats.js';
import {setScoreNavigation} from '../src/etudes/scoreNavigation.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';
function fixture(count=6){let d=createBlankDocument();d.measures=Array.from({length:count},()=>blankMeasure());for(let bar=0;bar<count;bar++)for(let event=0;event<4;event++)d=enterFret(d,{bar,event,string:6},3);return d;}
function order(d){const r=compileDocumentV2(d);assert.deepEqual(r.errors,[]);assert.deepEqual(r.issues,[]);const sequence=scoreBarOrder(r.score),t=scoreTimeline(r.score,120);assert.equal(t.duration,sequence.length*2);assert.deepEqual(t.events.map(e=>e.start),Array.from({length:sequence.length*4},(_,i)=>i/2));return sequence;}
for(const [command,expected] of [['dc',[0,1,2,3,4,0,1,2,3,4,5]],['ds',[0,1,2,3,4,1,2,3,4,5]],['dcAlFine',[0,1,2,3,4,0,1,2]],['dsAlFine',[0,1,2,3,4,1,2]],['dcAlCoda',[0,1,2,3,4,0,1,2,5]],['dsAlCoda',[0,1,2,3,4,1,2,5]]])test(`${command}: symbol destinations determine playback visits without altering durations`,()=>{
 const d=fixture();d.measures[4].command=command;
 if(command.startsWith('ds'))d.measures[1].marker='segno';
 if(command.endsWith('Fine'))d.measures[2].marker='fine';
 if(command.endsWith('Coda')){d.measures[2].marker='toCoda';d.measures[5].marker='coda';}
 const before=structuredClone(d);assert.deepEqual(order(d),expected);assert.deepEqual(d,before);
});
test('voltas span adjacent bars; first/second endings select the right pass',()=>{
 const d=fixture(7);d.measures[0].repeatStart=true;d.measures[3].repeatEnd=true;
 for(const b of [2,3])d.measures[b].ending=1;for(const b of [4,5])d.measures[b].ending=2;
 assert.deepEqual(order(d),[0,1,2,3,0,1,4,5,6]);
});
test('five numbered endings and multiple independent repeat groups',()=>{
 const d=fixture(8);d.measures[0].repeatStart=true;
 for(let n=1;n<=5;n++){d.measures[n].ending=n;if(n<5)d.measures[n].repeatEnd=true;}
 d.measures[6].repeatStart=true;d.measures[6].repeatEnd=true;
 assert.deepEqual(order(d),[0,1,0,2,0,3,0,4,0,5,6,6,7]);
});
test('D.C. return does not repeat signs and takes final ending',()=>{
 const d=fixture(5);d.measures[0].repeatStart=true;Object.assign(d.measures[2],{repeatEnd:true,ending:1});d.measures[3].ending=2;d.measures[4].command='dc';
 assert.deepEqual(order(d),[0,1,2,0,1,3,4,0,1,3,4]);
});
test('dangling navigation, unreachable destinations and incomplete endings block playback',()=>{
 for(const setup of [d=>{d.measures[4].command='ds';},d=>{d.measures[2].marker='toCoda';},d=>{d.measures[0].marker='segno';d.measures[1].marker='segno';},d=>{d.measures[0].repeatStart=true;Object.assign(d.measures[2],{repeatEnd:true,ending:1});},d=>{d.measures[0].repeatStart=true;Object.assign(d.measures[2],{repeatEnd:true,ending:1,marker:'fine'});d.measures[3].ending=2;d.measures[4].command='dcAlFine';}]){
  const d=fixture();setup(d);const before=structuredClone(d),r=compileDocumentV2(d);assert(r.issues.length>0);assert.throws(()=>scoreBarOrder(r.score));assert.deepEqual(d,before);
 }
});
test('navigation toggles, save/reload and deletion preserve surviving bar identities and rhythm',()=>{
 let d=fixture();d=setScoreNavigation(d,1,'marker','segno');d=setScoreNavigation(d,4,'command','ds');
 const storage=new Map(),adapter={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
 assert(saveLibraryDocument(adapter,d).saved);assert.deepEqual(loadLibrary(adapter).records[d.id].document,d);
 const next=deleteMeasure(d,0);assert.deepEqual(next.measures,d.measures.slice(1));assert.deepEqual(order(next),[0,1,2,3,0,1,2,3,4]);
 const noSegno=deleteMeasure(next,0);assert(repeatIssues(noSegno.measures).some(x=>x.includes('Segno')));assert.equal(noSegno.measures[2].command,'ds');
 assert.equal(setScoreNavigation(d,1,'marker','segno').measures[1].marker,undefined);
 assert.throws(()=>deleteMeasure(fixture(1),0),/최소 한 마디/);
});
test('bar deletion clears only ties targeting removed events and stale line breaks',()=>{
 const d=fixture(3);d.measures[0].events[3].tieTo=d.measures[1].events[0].id;d.viewSettings.systemBreaks=[d.measures[1].id,d.measures[2].id];const before=structuredClone(d);
 const next=deleteMeasure(d,1);assert.equal(next.measures[0].events[3].tieTo,null);assert.deepEqual(next.viewSettings.systemBreaks,[d.measures[2].id]);assert.strictEqual(next.measures[1],d.measures[2]);assert.deepEqual(d,before);
});
test('malformed imported navigation is reported without discarding or crashing',()=>{
 const d=fixture();d.measures[0].marker='toCoda';d.measures[4].command={bad:true};const before=structuredClone(d);
 assert(compileDocumentV2(d).issues.some(s=>s.includes('지원하지 않는 이동 명령')));assert.deepEqual(d,before);
});
