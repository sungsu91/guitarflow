import test from 'node:test';
import assert from 'node:assert/strict';
import {ETUDES,TUNING,validateEtude} from '../src/etudes/catalog.js';
import {toScoreDocument,compileScoreDocument,EDITS_STORAGE_KEY} from '../src/etudes/scoreDocument.js';
import {createBlankDocument,copyDocument,patchEvent,pitchCandidates,moveSamePitch,compileStats,blankMeasure,midiAtStaffStep} from '../src/etudes/scoreModel.js';
import {enterFret,enterFretWithDuration,setEventDuration,resolveFretInput,durationStep,setRest,inputDigits,copyBars,pasteBars,cursorStep} from '../src/etudes/editorCommands.js';
import {loadLibrary,saveLibraryDocument,LIBRARY_KEY} from '../src/etudes/scoreLibrary.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {educationIssues} from '../src/etudes/pedagogy.js';
const memory=()=>{const v=new Map();return {getItem:k=>v.get(k)??null,setItem:(k,x)=>v.set(k,x)};};
const cursor={bar:0,event:0,string:3};
test('free chromatic TAB, staff and playback derive from one source',()=>{
 const d=createBlankDocument(),changed=enterFret(d,cursor,6),r=compileScoreDocument(changed);
 assert.deepEqual(r.errors,[]);assert.deepEqual(r.issues,[]);assert.equal(r.score.measures[0][0].midi,61);assert.equal(r.score.measures[0][0].pitch.key,'c#/5');assert.equal(scoreTimeline(r.score).events[0].midi,61);assert.equal(d.measures[0].events[0].rest,true);
});
test('partial edit compiles one bar, keeps other IDs data references and manual choices',()=>{
 const d=toScoreDocument(ETUDES[0]);compileScoreDocument(d);const before=compileStats.bars,c={bar:2,event:0,string:4};const next=enterFret(d,c,9);compileScoreDocument(next);assert.equal(compileStats.bars-before,1);assert.strictEqual(next.measures[1],d.measures[1]);assert.strictEqual(next.measures[3],d.measures[3]);assert.equal(next.measures[2].events[0].id,d.measures[2].events[0].id);assert.equal(next.measures[2].events[0].notes.find(n=>n.string===4).locked,true);
});
test('duration change reports gaps without shifting later onsets, draft survives reload',()=>{
 const d=createBlankDocument(),next=durationStep(d,cursor,1),r=compileScoreDocument(next);assert.ok(r.issues.some(s=>s.includes('입력되지 않은 박')));assert.equal(next.measures[0].events[1].onset,480);const s=memory();assert.equal(saveLibraryDocument(s,next).record.status,'draft');assert.deepEqual(loadLibrary(s).records[next.id].document,next);assert.deepEqual(d.measures[0].events.map(e=>e.duration),['4','4','4','4']);
});
test('same pitch changes strings without changing staff or locked neighbours',()=>{
 const n={id:'n',string:2,fret:5,locked:true};const next=moveSamePitch(n,1);assert.deepEqual([next.string,next.fret],[3,9]);assert.equal(TUNING[next.string-1]+next.fret,64);assert.equal(pitchCandidates(n,64)[0].string,2);assert.equal(n.string,2);
});
test('two-digit numbers combine only at same cursor within the documented local threshold',()=>{
 const first=inputDigits(null,'1','a',0);assert.equal(inputDigits(first,'2','a',300).value,12);assert.equal(inputDigits(first,'2','b',300).value,2);assert.equal(inputDigits(first,'2','a',900).value,2);assert.equal(inputDigits(inputDigits(null,'5','a',0),'7','a',100).value,7);
});
test('keyboard entry duration splits an empty slot, keeps later events and advances to the new next slot',()=>{
 const d=createBlankDocument(),later=d.measures[0].events[1],next=enterFretWithDuration(d,cursor,5,'8');
 assert.deepEqual(next.measures[0].events.slice(0,3).map(e=>[e.onset,e.duration,e.rest]),[[0,'8',false],[240,'8',true],[480,'4',true]]);
 assert.strictEqual(next.measures[0].events[2],later);assert.deepEqual(cursorStep(next,cursor,1),{...cursor,event:1});
 assert.deepEqual(compileScoreDocument(next).issues,[]);
});
test('a longer entry duration consumes only contiguous following rests',()=>{
 let d=setEventDuration(createBlankDocument(),cursor,'8');d=enterFret(d,cursor,7);const untouched=d.measures[0].events[2];
 const next=setEventDuration(d,cursor,'4');assert.deepEqual(next.measures[0].events.slice(0,2).map(e=>[e.onset,e.duration]),[[0,'4'],[480,'4']]);
 assert.strictEqual(next.measures[0].events[1],untouched);assert.deepEqual(compileScoreDocument(next).issues,[]);
});
test('continuous digits never combine while explicit two-digit mode resolves 10 12 15 and 23',()=>{
 for(const digit of ['0','1','2','3','7','9']){const n=resolveFretInput(null,digit,'a',0);assert.equal(n.wait,false);assert.equal(n.value,Number(digit));}
 assert.equal(resolveFretInput({text:'2',time:0,location:'a'},'3','a',80,false).value,3);
 for(const value of ['10','12','15','23','24']){const first=resolveFretInput(null,value[0],'a',0,true),next=resolveFretInput(first,value[1],'a',80,true);assert.equal(next.value,Number(value));assert.equal(next.combined,true);assert.equal(next.wait,false);}
 const first=resolveFretInput(null,'2','a',0,true);
 assert.equal(resolveFretInput(first,'3','a',420,true).combined,false);
 assert.equal(resolveFretInput(first,'3','b',80,true).combined,false);
 const invalid=resolveFretInput(first,'7','a',80,true);assert.equal(invalid.value,7);assert.equal(invalid.advanceBefore,true);assert.equal(invalid.wait,false);
});
test('duration edits preserve occupied neighbours and annotated rests, reporting overlaps',()=>{
 let d=enterFret(createBlankDocument(),{...cursor,event:1},5);const occupied=d.measures[0].events[1];
 const next=setEventDuration(d,cursor,'2');assert.strictEqual(next.measures[0].events[1],occupied);assert.ok(compileScoreDocument(next).issues.length);
 d=patchEvent(createBlankDocument(),0,1,{pickStroke:'up'});const annotated=d.measures[0].events[1];
 assert.strictEqual(setEventDuration(d,cursor,'2').measures[0].events[1],annotated);
});
test('range copy paste assigns new IDs and preserves source bars, notes and rhythms',()=>{
 const d=toScoreDocument(ETUDES[0]),copy=copyBars(d,1,2),next=pasteBars(d,4,copy);assert.equal(next.measures.length,10);assert.strictEqual(next.measures[0],d.measures[0]);assert.notEqual(next.measures[5].id,d.measures[1].id);assert.deepEqual(next.measures[5].events.map(e=>e.onset),d.measures[1].events.map(e=>e.onset));assert.deepEqual(compileScoreDocument(next).errors,[]);
 const tied=structuredClone(d);tied.measures[0].events[0].tieTo=tied.measures[0].events[1].id;const pasted=pasteBars(tied,2,copyBars(tied,0,0));assert.equal(pasted.measures[3].events[0].tieTo,pasted.measures[3].events[1].id);assert.notEqual(pasted.measures[3].events[0].tieTo,tied.measures[0].events[1].id);
});
test('independent copies and builtin survive save, overwrite and source updates',()=>{
 const base=ETUDES[0],before=JSON.stringify(base),s=memory(),a=copyDocument(toScoreDocument(base)),b=copyDocument(a);saveLibraryDocument(s,a);saveLibraryDocument(s,b);saveLibraryDocument(s,enterFret(a,{bar:0,event:0,string:6},7));assert.deepEqual(loadLibrary(s).records[b.id].document,b);assert.equal(JSON.stringify(base),before);assert.equal(Object.keys(loadLibrary(s).records).length,2);
});
test('v1 migration retains original key and raw storage; quota failure does not erase old scores',()=>{
 const s=memory(),base=ETUDES[0],v1={...toScoreDocument(base),version:1};v1.bpm=83;v1.title='이전 저장 악보';v1.measures[0].events[0].notes[0].fret=3;s.setItem(EDITS_STORAGE_KEY,JSON.stringify({[base.templateId]:v1}));const old=s.getItem(EDITS_STORAGE_KEY);const library=loadLibrary(s,ETUDES);assert.equal(library.errors.length,0);const migrated=Object.values(library.records)[0].document;assert.equal(migrated.keySignature,base.keySignature);assert.equal(migrated.bpm,83);assert.equal(migrated.title,'이전 저장 악보');assert.equal(migrated.measures[0].events[0].notes[0].fret,3);assert.equal(s.getItem(EDITS_STORAGE_KEY),old);
 const failed=loadLibrary({getItem:k=>k===EDITS_STORAGE_KEY?old:null,setItem:()=>{throw Error('quota');}},ETUDES);assert.ok(failed.errors.length);assert.equal(saveLibraryDocument({getItem:()=>null,setItem:()=>{throw Error('quota');}},createBlankDocument()).saved,false);
 const bad={document:{id:'broken',measures:[null]},status:'draft'};s.setItem(LIBRARY_KEY,JSON.stringify({version:2,records:{broken:bad}}));const recovered=loadLibrary(s);assert.equal(recovered.records.broken.status,'unreadable');saveLibraryDocument(s,createBlankDocument());assert.deepEqual(loadLibrary(s).records.broken.raw,bad,'unreadable source survives saving another document');
});
test('score timeline handles simultaneous notes, rests, tuning and meter',()=>{
 let d=createBlankDocument();d=enterFret(d,cursor,5);d=enterFret(d,{...cursor,string:2},1);d={...d,tuning:[64,59,55,50,45,38]};const r=compileScoreDocument(d),timeline=scoreTimeline(r.score);assert.equal(timeline.events.length,2);assert.equal(timeline.events[0].start,timeline.events[1].start);assert.deepEqual(timeline.events.map(e=>e.midi),[60,60]);assert.equal(timeline.duration,4);
});
test('educational code-tone rules detect non-chord tones without blocking free score',()=>{
 const base=ETUDES.find(e=>e.templateId==='triad-engine'),d=toScoreDocument(base);const changed=patchEvent(d,7,14,e=>({...e,notes:[{...e.notes[0],string:5,fret:5}]})),r=compileScoreDocument(changed,base);assert.ok(r.score);assert.ok(educationIssues(r.score).length);assert.deepEqual(educationIssues(base),[]);
});
test('invalid imported shapes do not throw, linked elements are inspected across bars',()=>{
 const d=createBlankDocument();d.measures[0].events[0].notes=[null];assert.doesNotThrow(()=>compileScoreDocument(d));assert.equal(compileScoreDocument(d).score,null);
 const tied=enterFret(createBlankDocument(),cursor,5);tied.measures[0].events[0].tieTo='missing';assert.ok(compileScoreDocument(tied).issues.some(s=>s.includes('붙임줄')));
});
test('all builtins meet independent educational rules and have actual measure references',()=>{
 for(const e of ETUDES){assert.deepEqual(educationIssues(e),[],e.id);assert.deepEqual(validateEtude(e),[],e.id);for(const k of e.pedagogy.keyBars)assert.ok(e.measures[k.bar-1][k.event-1]);for(const p of e.pedagogy.prerequisites)assert.ok(ETUDES.some(s=>s.templateId===p),p);}
 const guide=ETUDES.find(e=>e.templateId==='codetone-guide-tones');assert.deepEqual([guide.measures[0].at(-1).midi%12,guide.measures[1][0].midi%12,guide.measures[1].at(-1).midi%12,guide.measures[2][0].midi%12],[5,11,11,4],'guide-tone lesson must actually connect F–B and B–E as explained');
});
test('staff positions honour key signature and guitar transposition',()=>{assert.equal(midiAtStaffStep(0,'C'),52);assert.equal(midiAtStaffStep(1,'G'),54);assert.equal(midiAtStaffStep(4,'F'),58);});
test('a valid tie sustains one sound while a changed destination reports the broken link',()=>{
 let d=createBlankDocument();d=enterFret(d,cursor,5);d=enterFret(d,{...cursor,event:1},5);d=patchEvent(d,0,0,{tieTo:d.measures[0].events[1].id});let r=compileScoreDocument(d);assert.deepEqual(r.issues,[]);assert.equal(scoreTimeline(r.score).events.length,1);assert.equal(scoreTimeline(r.score).events[0].duration,2);const bad=enterFret(d,{...cursor,event:1},6);assert.ok(compileScoreDocument(bad).issues.some(s=>s.includes('붙임줄')));assert.equal(d.measures[0].events[1].notes[0].fret,5);
});
