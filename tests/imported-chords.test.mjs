import test from 'node:test';
import assert from 'node:assert/strict';
import {parseChordSymbol} from '../src/chords/chordSymbols.js';
import {shapeForChordName,chordProgression} from '../src/etudes/arpeggioChords.js';
import {createBlankDocument,blankMeasure} from '../src/etudes/scoreModel.js';
import {setMeasureHarmony} from '../src/etudes/scoreHarmony.js';
import {projectChordText,chordWordsInRegion,attachPageChords} from '../src/pdf/tab-import/chordRecognition.js';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
import {applyArpeggio} from '../src/etudes/arpeggioPattern.js';
import {attachChordDiagram} from '../src/etudes/scoreChordDiagram.js';
import {refreshAutomaticChordNames} from '../src/etudes/automaticChordNames.js';
import {OPEN_CHORD_SHAPES} from '../src/etudes/openChordStudies.js';

test('recognizes common printed chord spellings without accepting lyrics, tempo or isolated digits',()=>{
 for(const [input,name] of [['F♯m7','F#m7'],['B♭maj7','Bbmaj7'],['G/B','G/B'],['D/F#','D/F#'],['C6/9','C6/9'],['CΔ7','Cmaj7'],['Em(add9)','Emadd9'],['Bø7','Bm7b5'],['N.C.','N.C.']])assert.equal(parseChordSymbol(input)?.name,name);
 for(const value of ['Allegro','Fine','D.C.','BPM','Guitar','123','풀잎','9','Amor'])assert.equal(parseChordSymbol(value),null,value);
});

test('automatic grips have the named tones and slash bass, in a compact playable position',()=>{
 const d=createBlankDocument();
 for(const name of ['G','Am','D7','C','A','E','Bm','F#m','Bb','Eb','Cmaj7','G7','Dm7','Gsus4','D/F#','G/B','C/E','Am/G']){
  const symbol=parseChordSymbol(name),shape=shapeForChordName(d,name);assert(shape,name);
  const notes=shape.frets.flatMap((f,i)=>f===null?[]:[d.tuning[5-i]+f]);
  assert.equal(Math.min(...notes)%12,symbol.bassPc,name);
  assert(notes.every(n=>symbol.tones.includes(n%12)||n===Math.min(...notes)&&n%12===symbol.bassPc),name);
  assert(shape.frets.slice(3).every(Number.isInteger),name+' treble strings');
  const pressed=shape.frets.filter(f=>f>0);assert(Math.max(...pressed)-Math.min(...pressed)<=3,name);
  assert(Math.max(...pressed)<=7,name);
 }
});

test('native PDF text keeps accidental and slash symbols at their source coordinates; title/lyrics excluded spatially',()=>{
 const viewport={scale:2,convertToViewportPoint:(x,y)=>[x*2,600-y*2]};
 const item=(str,x,y)=>({str,width:str.length*8,transform:[12,0,0,12,x,y]});
 const words=projectChordText({items:[item('F#m7',70,220),item('D/F#',170,220),item('G',30,290),item('C',120,120),item('Allegro',50,220)]},viewport);
 const region={x:40,y:110,width:500,spacing:16,staffY:200};
 assert.deepEqual(chordWordsInRegion(words,region).map(w=>w.name),['F#m7','D/F#']);
 assert.equal(words[0].x,140);
});

const sourceMeasure=(x,width)=>({x,width,meter:[4,4],source:{page:1},reasons:[],orphan:[],rhythmValid:true,needsReview:false,slots:[0,480,960,1440].map((onset,i)=>({x:x+20+i*40,duration:'4',notes:[],rest:true,rejections:[],status:'confirmed',confidence:1,source:{page:1}}))});
test('TAB chord changes after a triplet use the same elapsed time as the imported notes',()=>{
 const measure=sourceMeasure(40,600),template=measure.slots[0];
 measure.slots=[70,170,270,370,450,550].map((x,i)=>({...template,x,duration:i<3?'8':'4',...(i<3?{tuplet:{actualNotes:3,normalNotes:2,groupId:'t1'}}:{})}));
 const page={page:1,staffs:[{id:1,measures:[measure]}]};
 attachPageChords(page,[{staff:1,spacing:10,words:[{name:'G',x:70,width:20},{name:'Am',x:370,width:20}]}]);
 assert.equal(measure.harmonyChanges[1].onset,480);
 const doc=analysisToDocument({fileName:'triplets.pdf',pages:[page],summary:{}});
 assert.equal(doc.measures[0].events[3].onset,measure.harmonyChanges[1].onset);
});

test('unrecognized rhythm cannot silently confirm the timing of a later chord change',()=>{
 const measure=sourceMeasure(40,600);measure.rhythmValid=false;measure.slots[1].duration=null;
 measure.slots.forEach((slot,i)=>{slot.x=70+i*160;});
 const page={page:1,staffs:[{id:1,measures:[measure]}]};
 attachPageChords(page,[{staff:1,spacing:10,words:[{name:'G',x:70,width:20},{name:'Am',x:550,width:20}]}]);
 assert.equal(measure.harmonyChanges[1].needsReview,true);
 const doc=analysisToDocument({fileName:'faint-rhythm.pdf',pages:[page],summary:{}});
 assert.throws(()=>applyArpeggio(doc),/코드/);
});

test('TAB import places multiple chord names on rhythm anchors, preserving them through document conversion',()=>{
 const page={page:1,staffs:[{id:1,measures:[sourceMeasure(40,200),sourceMeasure(240,200)]}]};
 const word=(name,x)=>({name,x,y:40,width:20,height:18,confidence:1,method:'pdf-chord-text'});
 attachPageChords(page,[{staff:1,spacing:10,words:[word('G',60),word('Am',140),word('D7',260)]}]);
 const d=analysisToDocument({fileName:'different.pdf',pages:[page],summary:{}});
 assert.deepEqual(d.measures.map(m=>m.harmonyChanges.map(({onset,name})=>({onset,name}))),[[{name:'G',onset:0},{name:'Am',onset:960}],[{name:'D7',onset:0}]]);
 const next=applyArpeggio(d,{end:1,chord:'Am'});
 assert.equal(next.measures[0].events[0].notes[0].string,6);
 assert.equal(next.measures[0].events[4].notes[0].string,5);
 assert.equal(next.measures[1].events[0].notes[0].string,4);
 assert(next.measures.every(m=>m.chord===null));
});

test('mismatched source bars cannot shift a progression or carry a stale chord through the uncertain system',()=>{
 const page={page:1,notation:true,staffs:[{id:1,measures:[sourceMeasure(40,400)]}]};
 attachPageChords(page,[{staff:1,spacing:10,measures:[{x:40,width:200},{x:240,width:200}],words:[{name:'Am',x:60,width:20}]}]);
 const doc=analysisToDocument({fileName:'uncertain.jpg',pages:[page],summary:{}});
 doc.measures.unshift({...blankMeasure(),harmony:'G'});
 assert.throws(()=>applyArpeggio(doc,{end:1}),/2마디/);
});

test('name correction affects one symbol only, clears its review flag and survives an empty following bar',()=>{
 const m={...blankMeasure(),harmony:'G',harmonyChanges:[{name:'G',onset:0},{name:'Am',onset:720,needsReview:true}]};
 const next=setMeasureHarmony(m,'D7',960,720);
 assert.deepEqual(next.harmonyChanges,[{name:'G',onset:0},{name:'D7',onset:960}]);
 const d={...createBlankDocument(),measures:[next,blankMeasure()]};
 assert.equal(chordProgression(d)[1][0].name,'D7');
 assert.deepEqual(setMeasureHarmony(next,null,960).harmonyChanges,[{name:'G',onset:0}]);
});

test('explicit diagram replacement and automatic-name mode cannot retain stale OCR chord changes',()=>{
 const d=createBlankDocument();d.measures[0].harmony='G';d.measures[0].harmonyChanges=[{onset:0,name:'G'}];
 const withDiagram=attachChordDiagram(d,0,{name:'Am',...OPEN_CHORD_SHAPES.Am});
 assert.equal(chordProgression(withDiagram)[0][0].name,'Am');assert.equal(withDiagram.measures[0].harmonyChanges,undefined);
 const next=applyArpeggio(withDiagram);next.measures[0].chordNameMode='auto';next.measures[0].harmonyChanges=[{onset:0,name:'G'}];
 const named=refreshAutomaticChordNames(next);
 assert.equal(named.measures[0].harmonyChanges,undefined);
 assert.notEqual(chordProgression(named)[0][0].name,'G');
});
