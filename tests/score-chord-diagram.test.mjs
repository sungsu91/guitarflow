import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {attachChordDiagram,chordNameCandidates,editableChordFrets} from '../src/etudes/scoreChordDiagram.js';
import {OPEN_CHORD_SHAPES} from '../src/etudes/openChordStudies.js';
import {enterFret} from '../src/etudes/editorCommands.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';
import {convertScoreInstrument} from '../src/etudes/convertScoreInstrument.js';

const shape=()=>({name:'C',...structuredClone(OPEN_CHORD_SHAPES.C),fretWindow:{start:1,end:5},range:{startTick:480,endTick:1440},blankStrings:[]});
test('attach, replace and remove a chart preserve the entered music and original document',()=>{
 const source=enterFret(createBlankDocument(),{bar:0,event:0,string:1,mode:'tab'},7),snapshot=structuredClone(source);
 const next=attachChordDiagram(source,0,shape());
 assert.deepEqual(source,snapshot);
 assert.equal(next.measures[0].events,source.measures[0].events);
 assert.deepEqual(compileDocumentV2(next).errors,[]);
 const removed=attachChordDiagram(next,0,null);
 assert.equal(removed.measures[0].chord,null);
 assert.deepEqual(removed.measures[0].events,source.measures[0].events);
});
test('chart positions and blank/open/mute distinctions survive library save and reload',()=>{
 const document=attachChordDiagram(createBlankDocument(),0,{...shape(),blankStrings:[6]});
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 assert.equal(saveLibraryDocument(storage,document).saved,true);
 const restored=loadLibrary(storage).records[document.id].document;
 assert.deepEqual(restored.measures[0].chord,document.measures[0].chord);
 assert.deepEqual(editableChordFrets(restored.measures[0].chord,6),[undefined,3,2,0,1,0]);
 assert.deepEqual(compileDocumentV2(restored).score.chordShapes[0],document.measures[0].chord);
});
test('candidate names respect tuning, capo and the actual lowest sounding pitch',()=>{
 const d=createBlankDocument();
 assert.equal(chordNameCandidates(d,OPEN_CHORD_SHAPES.C.frets)[0],'C');
 assert.equal(chordNameCandidates({...d,capo:2},OPEN_CHORD_SHAPES.C.frets)[0],'D');
 assert.equal(chordNameCandidates({...d,instrument:'ukulele',tuning:[69,64,60,67]},[0,0,0,3])[0],'C');
 assert.equal(chordNameCandidates(d,[null,null,2,0,1,0])[0],'C/E');
 assert.deepEqual(chordNameCandidates(d,Array(6).fill(undefined)),[]);
});
test('C root/third fingering is suggested without requiring an unselected open G string',()=>{
 const d=createBlankDocument();
 assert.equal(chordNameCandidates(d,[undefined,3,2,undefined,1,undefined])[0],'C');
 assert.equal(chordNameCandidates(d,[null,3,2,0,1,0])[0],'C');
 assert.ok(chordNameCandidates(d,[null,4,3,0,1,0]).length>0);
 assert.deepEqual(chordNameCandidates(d,[undefined,3,undefined,undefined,1,undefined]),[]);
});
test('automatic fingering is opt-in, covers only selected slots and preserves their rhythm',()=>{
 const d=enterFret(createBlankDocument(),{bar:0,event:0,string:1,mode:'tab'},7);
 const before=structuredClone(d),chart=shape(),plain=attachChordDiagram(d,0,chart);
 assert.deepEqual(plain.measures[0].events,d.measures[0].events);
 const next=attachChordDiagram(d,0,chart,{autoFill:true}),events=next.measures[0].events;
 assert.deepEqual(d,before);
 assert.equal(events[0],d.measures[0].events[0]);assert.equal(events[3],d.measures[0].events[3]);
 assert.deepEqual(events.map(e=>[e.id,e.onset,e.duration,e.dotted,e.tuplet]),d.measures[0].events.map(e=>[e.id,e.onset,e.duration,e.dotted,e.tuplet]));
 for(const e of events.slice(1,3)){
  assert.equal(e.rest,false);assert.equal(e.blank,false);
  assert.deepEqual(e.notes.map(n=>[n.string,n.fret]),[[5,3],[4,2],[3,0],[2,1],[1,0]]);
 }
 assert.equal(new Set(events.flatMap(e=>e.notes.map(n=>n.id))).size,11);
 assert.deepEqual(compileDocumentV2(next).errors,[]);
 assert.deepEqual(compileDocumentV2(next).issues,[]);
});
test('auto-fill rejects partial sustained notes, while chart-only attachment permits them',()=>{
 const d=createBlankDocument(),chart={...shape(),range:{startTick:240,endTick:960}};
 assert.throws(()=>attachChordDiagram(d,0,chart,{autoFill:true}),/음표 경계/);
 assert.doesNotThrow(()=>attachChordDiagram(d,0,chart));
});
test('invalid timing and cropped fret windows cannot be attached or compiled',()=>{
 const d=createBlankDocument();
 assert.throws(()=>attachChordDiagram(d,0,{...shape(),range:{startTick:1440,endTick:480}}),/시작·끝/);
 assert.throws(()=>attachChordDiagram(d,0,{...shape(),range:{startTick:0,endTick:2400}}),/시작·끝/);
 assert.throws(()=>attachChordDiagram(d,0,{...shape(),fretWindow:{start:2,end:5}}),/프렛/);
 const invalid={...d,measures:[{...d.measures[0],chord:{...shape(),blankStrings:[7]}}]};
 assert.match(compileDocumentV2(invalid).errors.join(' '),/빈 줄/);
});
test('instrument conversion clears stale display windows and preserves chart timing',()=>{
 const d=attachChordDiagram(createBlankDocument(),0,{...shape(),frets:[null,3,2,0,1,null],blankStrings:[1]});
 const next=convertScoreInstrument(d,'bass');
 assert.equal(next.measures[0].chord.fretWindow,undefined);
 assert.equal(next.measures[0].chord.blankStrings,undefined);
 assert.deepEqual(next.measures[0].chord.range,d.measures[0].chord.range);
 assert.deepEqual(compileDocumentV2(next).errors,[]);
});


 test('C changes to Cmaj7 when the blank B string supplies a possible open seventh',()=>{
 const d=createBlankDocument();
 assert.equal(chordNameCandidates(d,[undefined,3,2,undefined,1,undefined])[0],'C');
 assert.equal(chordNameCandidates(d,[undefined,3,2,undefined,undefined,undefined])[0],'Cmaj7');
 assert.equal(chordNameCandidates(d,[null,3,2,0,0,0])[0],'Cmaj7');
 assert.equal(chordNameCandidates(d,[null,3,2,null,null,null])[0],'C');
 });
 test('all shared chord types are recognized, with add2/add9 treated as pitch-class aliases',async()=>{
 const {CHORD_TONE_INTERVALS}=await import('../src/chords/chordTheory.js');
 for(const [family,types] of Object.entries(CHORD_TONE_INTERVALS))for(const [type,intervals] of Object.entries(types)){
 const suffix=type==='none'?{major:'',minor:'m',dim:'dim',aug:'aug'}[family]:family==='minor'&&type==='add9'?'madd9':type;
 const d={tuning:intervals.map(n=>48+n).reverse(),capo:0};
 const names=chordNameCandidates(d,intervals.map(()=>0));
 assert.ok(names.includes('C'+suffix)||(type==='add9'&&family==='major'&&names.includes('Cadd2')),`${family} ${type}: ${names}`);
 }
 });
 test('missing and incorrect notes still produce nearby suggestions without changing the grip',()=>{
 const d=createBlankDocument(),grip=[null,3,2,0,1,1],before=[...grip];
 assert.ok(chordNameCandidates(d,grip).includes('C'));
 assert.deepEqual(grip,before);
 assert.ok(chordNameCandidates(d,[null,3,2,null,0,null]).includes('Cmaj7'));
 });

test('nonadjacent checked beats survive saving and fill only their selected events',()=>{
 const d=createBlankDocument(),chart={...shape(),range:{startTick:0,endTick:1440},ranges:[{startTick:0,endTick:480},{startTick:960,endTick:1440}]};
 const next=attachChordDiagram(d,0,chart,{autoFill:true});
 assert.equal(next.measures[0].events[1],d.measures[0].events[1]);
 assert.equal(next.measures[0].events[3],d.measures[0].events[3]);
 assert.equal(next.measures[0].events[0].notes.length,5);
 assert.equal(next.measures[0].events[2].notes.length,5);
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 saveLibraryDocument(storage,next);
 assert.deepEqual(loadLibrary(storage).records[next.id].document.measures[0].chord.ranges,chart.ranges);
 assert.deepEqual(compileDocumentV2(next).errors,[]);
 assert.throws(()=>attachChordDiagram(d,0,{...chart,ranges:[]}),/적용 박/);
});

test('single-beat chord input preserves the remaining three beats',()=>{
 const d=createBlankDocument(),chart={...shape(),range:{startTick:0,endTick:480}};
 const next=attachChordDiagram(d,0,chart,{autoFill:true});
 assert.equal(next.measures[0].events[0].notes.length,5);
 for(let i=1;i<4;i++)assert.equal(next.measures[0].events[i],d.measures[0].events[i]);
});
