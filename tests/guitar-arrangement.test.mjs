import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,blankMeasure,newId,ticksOf,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {arrangeGuitar} from '../src/etudes/arrangement/arrangeGuitar.js';
import {gripFeasible} from '../src/etudes/arrangement/voicing.js';
import {FINGERSTYLE_TEMPLATES} from '../src/etudes/arrangement/templates.js';

const event=(onset,duration,pitches,extra={})=>({id:newId('event'),onset,duration,rest:!pitches.length,blank:false,technique:null,notes:pitches.map(midi=>({id:newId('tone'),midi})),...extra});
const piano=measures=>({...createBlankDocument(),instrument:'piano',tuning:[],title:'원본 피아노',measures:measures.map(m=>({id:newId('bar'),...m}))});
const performed=d=>scoreTimeline(compileDocumentV2(d).score,60).events;
const melodyAudio=d=>performed(d).filter(n=>n.voice==='melody').map(n=>[n.midi,n.start,n.duration]);
const checkSoundingGrips=d=>{
 const audio=performed(d),times=[...new Set(audio.flatMap(n=>[n.start,n.start+n.duration]))];
 for(const t of times){const active=audio.filter(n=>n.start<=t+1e-8&&n.start+n.duration>t+1e-8);assert(gripFeasible(active),`sounding grip at ${t}: ${JSON.stringify(active)}`);}
};

test('dense piano voicing keeps melody/bass class, defining 3rd/7th, reduces duplicates, and never edits the source',()=>{
 const d=piano([{harmony:'Cmaj7',events:[event(0,'1',[36,48,55,60,64,67,71,76])]}]),before=structuredClone(d);
 const {document:out,report}=arrangeGuitar(d);
 assert.deepEqual(d,before);assert.notEqual(out.id,d.id);assert.deepEqual(out.guitarArrangement.sourceDocument,d);
 assert.deepEqual(melodyAudio(out),[[76,0,4]]);
 const pitches=performed(out).map(n=>n.midi);assert(pitches.length<=6);assert.equal(Math.min(...pitches)%12,0);
 assert(pitches.some(n=>n%12===4));assert(pitches.some(n=>n%12===11));
 assert(report.omitted>0);assert(report.octaveChanges>0);assert(report.frames.every(f=>gripFeasible(f.grip)&&f.jump<=7));
 assert.deepEqual(compileDocumentV2(out).issues,[]);
});

test('pattern pinch merges/omits accompaniment without reattacking a held whole-note melody',()=>{
 const d=piano([{harmony:'Cmaj7',events:[event(0,'1',[64])]}]);
 const {document:out,report}=arrangeGuitar(d,{mode:'fingerstyle'});
 assert.deepEqual(melodyAudio(out),[[64,0,4]]);assert(report.omitted>0);
 const notes=performed(out),melody=notes.find(n=>n.voice==='melody');
 assert(notes.some(n=>n.voice==='accompaniment'&&n.start===0&&n.midi<64),'Bass+Melody pinch');
 assert(notes.filter(n=>n.voice==='accompaniment').every(n=>n.string!==melody.string));
 assert(!notes.some(n=>n.voice==='accompaniment'&&n.midi===64));
});

test('independent piano hands and off-grid melody remain distinct from template rhythm',()=>{
 const right=[event(0,'8',[67]),event(240,'16',[69]),event(360,'16',[71]),event(480,'2',[72]),event(1440,'4',[])].map(e=>({...e,voice:'right',notes:e.notes.map(n=>({...n,hand:'right'}))}));
 const left=[event(0,'2',[48,52,55]),event(960,'2',[43,50,55])].map(e=>({...e,voice:'left',notes:e.notes.map(n=>({...n,hand:'left'}))}));
 const d=piano([{harmony:'C',harmonyChanges:[{onset:0,name:'C'},{onset:960,name:'G'}],events:[...right,...left].sort((a,b)=>a.onset-b.onset)}]);
 const expected=[[67,0,.5],[69,.5,.25],[71,.75,.25],[72,1,2]];
 for(const mode of ['voicing','fingerstyle']){
  const {document:out,report}=arrangeGuitar(d,{mode});assert.deepEqual(melodyAudio(out),expected);
  checkSoundingGrips(out);
  assert(report.frames.every(f=>gripFeasible(f.grip)));assert.deepEqual(compileDocumentV2(out).errors,[]);
 }
});

test('cross-bar melody tie keeps its string, one attack, and full length through chord changes',()=>{
 const a=event(0,'1',[67]),b=event(0,'1',[67]);a.tieTo=b.id;
 const d=piano([{harmony:'C',events:[a]},{harmony:'G',events:[b]}]);
 const {document:out}=arrangeGuitar(d,{mode:'fingerstyle'});
 assert.deepEqual(melodyAudio(out),[[67,0,8]]);
 const first=out.measures[0].events.find(e=>e.voice==='melody'),next=out.measures[1].events.find(e=>e.voice==='melody');
 assert.equal(first.tieTo,next.id);assert.equal(first.notes[0].string,next.notes[0].string);
 assert.deepEqual(compileDocumentV2(JSON.parse(JSON.stringify(out))).issues,[]);
});

test('every rhythm template follows I–vi–ii–V and protects accented and syncopated melody',()=>{
 const d=piano(['Cmaj7','Am7','Dm7','G7'].map((harmony,i)=>({harmony,events:[event(0,'4',[67+i]),event(480,'8',[]),event(720,'8',[64+i]),event(960,'2',[67+i])]})));
 for(const template of FINGERSTYLE_TEMPLATES){
  const {document:out,report}=arrangeGuitar(d,{mode:'fingerstyle',template:template.id});
  assert.equal(report.melodyChanged,0);assert.equal(melodyAudio(out).length,12);
  assert(report.frames.every(f=>gripFeasible(f.grip)));assert.deepEqual(compileDocumentV2(out).issues,[]);
  checkSoundingGrips(out);
 }
});

test('Bass–3–(1+2)–3 rhythm continues across changing chords while melody owns string one',()=>{
 const d=piano(['C','G'].map(harmony=>({harmony,events:[event(0,'1',[64])]})));
 const {document:out}=arrangeGuitar(d,{mode:'fingerstyle'});
 const notes=performed(out).filter(n=>n.voice==='accompaniment');
 assert.deepEqual(notes.map(n=>[n.start,n.string]),[[0,5],[.5,3],[1,2],[1.5,3],[2,5],[2.5,3],[3,2],[3.5,3],[4,6],[4.5,3],[5,2],[5.5,3],[6,6],[6.5,3],[7,2],[7.5,3]]);
 assert.deepEqual(melodyAudio(out),[[64,0,4],[64,4,4]]);checkSoundingGrips(out);
});

test('custom tuning and capo preserve sounding melody; unrecognized bass rhythm is not hidden',()=>{
 const d={...createBlankDocument(),tuning:[62,57,53,48,43,38],capo:2,measures:[{...blankMeasure(),harmony:'C',events:[{...event(0,'1',[64]),notes:[{id:newId('tone'),string:1,fret:0,midi:64}]}]}]};
 for(const mode of ['voicing','fingerstyle']){const {document:out}=arrangeGuitar(d,{mode});assert.deepEqual(melodyAudio(out),[[64,0,4]]);assert.deepEqual(out.tuning,d.tuning);assert.equal(out.capo,2);checkSoundingGrips(out);}
 const invalid=piano([{events:[event(0,'1',[64],{voice:'right'}),event(0,'1',[48],{voice:'left',pdfImport:{recognizedDuration:null}})]}]);
 assert.throws(()=>arrangeGuitar(invalid),/미인식/);
});

test('unreachable melody, unresolved rhythm and unconfirmed chord changes fail without transposition or guessing',()=>{
 const d=piano([{harmony:'C',events:[event(0,'1',[110])]}]);
 assert.throws(()=>arrangeGuitar(d),/멜로디/);
 const unread=piano([{events:[event(0,'1',[64],{pdfImport:{recognizedDuration:null}})]}]);
 assert.throws(()=>arrangeGuitar(unread),/미인식/);
 const unknown=piano([{events:[event(0,'1',[64])]}]);assert.throws(()=>arrangeGuitar(unknown,{mode:'fingerstyle'}),/코드명/);
 const bad=piano([{harmonyChanges:[{onset:0,name:'C',needsReview:true}],events:[event(0,'1',[64])]}]);assert.throws(()=>arrangeGuitar(bad,{mode:'fingerstyle'}),/코드명/);
});
