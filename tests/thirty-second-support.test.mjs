import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,compileDocumentV2,ticksOf,tupletGroups} from '../src/etudes/scoreModel.js';
import {inputRhythm} from '../src/etudes/rhythmInput.js';
import {splitEvent,setEventDuration,durationStep} from '../src/etudes/editorCommands.js';
import {ensureTriplet,removeTriplet} from '../src/etudes/tuplets.js';
import {setBeamRange} from '../src/etudes/beamOverrides.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
import {resolvePage,summarizeAnalysis} from '../src/pdf/tab-import/recognition.js';
import {detectRhythm} from '../src/pdf/tab-import/geometry.js';
import {projectPdfText} from '../src/pdf/tab-import/pdfText.js';
import {classifyHookedRest} from '../src/pdf/tab-import/imageRests.js';
import {joinedFretSplit} from '../src/pdf/tab-import/joinedFretDigits.js';
import {hasThreeCurvedFlags} from '../src/pdf/tab-import/geometry.js';
import {convertScoreInstrument} from '../src/etudes/convertScoreInstrument.js';
import {ensurePianoVoices,enterPiano,pianoCursor,movePianoHand} from '../src/etudes/pianoInput.js';
import {scorePlaybackReadiness} from '../src/etudes/scorePlaybackReadiness.js';
import {corroborateZoomTuplets} from '../src/pdf/tab-import/zoomTuplets.js';
import {parseTromr,convertTromr,recommendTromrPositions} from '../src/omr/tromrAdapter.js';
import {readFileSync} from 'node:fs';
const at=event=>({bar:0,event,string:1});
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)}};

test('32nd entry, rests, tie, serialization and playback preserve every onset',()=>{
 let d=createBlankDocument();
 for(let i=0;i<32;i++)d=inputRhythm(d,at(i),{selectedDuration:'32'},i===7?'rest':'note',i===2?1:i%25).document;
 d.measures[0].events[1].tieTo=d.measures[0].events[2].id;
 const compiled=compileDocumentV2(d);assert.deepEqual(compiled.errors,[]);assert.deepEqual(compiled.issues,[]);
 assert.equal(d.measures[0].events.length,32);assert.deepEqual(d.measures[0].events.map(e=>e.onset),Array.from({length:32},(_,i)=>i*60));
 const store=memory();assert.equal(saveLibraryDocument(store,d).saved,true);assert.deepEqual(loadLibrary(store).records[d.id].document,d);
 for(const bpm of [30,60,137,240]){const t=scoreTimeline(compiled.score,bpm);assert.equal(t.duration,240/bpm);assert.equal(t.events.length,30);assert(Math.abs(t.events.find(e=>e.id===d.measures[0].events[1].id).duration-15/bpm)<1e-9);}
 const beams=setBeamRange(d,{bar:0,start:8,end:15},'join');assert.deepEqual(scoreTimeline(compileDocumentV2(beams).score),scoreTimeline(compiled.score));
});
test('sixteenth splits into 32nds, keyboard duration stops at 32 and dotted32 keeps exact bar time',()=>{
 const d=setEventDuration(createBlankDocument(),at(0),'16'),s=splitEvent(d,at(0));assert.equal(s.measures[0].events[0].duration,'32');assert.equal(s.measures[0].events[1].onset,60);assert.throws(()=>splitEvent(s,at(0)));
 assert.equal(durationStep(s,at(0),1).measures[0].events[0].duration,'32');
 const dotted=inputRhythm(createBlankDocument(),at(0),{selectedDuration:'32',dottedMode:'one-shot'},'note',0).document;
 assert.equal(ticksOf(dotted.measures[0].events[0]),90);assert.deepEqual(compileDocumentV2(dotted).errors,[]);assert.equal(dotted.measures[0].events.reduce((n,e)=>n+ticksOf(e),0),1920);
});
for(const duration of ['4','8','16','32'])for(const count of [3,6])test(`${duration} tuplet ${count} has exact ticks and survives grouping/removal`,()=>{
 const d=ensureTriplet(createBlankDocument(),at(0),duration,count),group=d.measures[0].events.slice(0,count);
 assert.equal(group.length,count);assert(group.every(e=>e.tuplet.actualNotes===count));assert.deepEqual(tupletGroups(d.measures[0].events),[Array.from({length:count},(_,i)=>i)]);
 assert.deepEqual(compileDocumentV2(d).errors,[]);const cleared=removeTriplet(d,at(1),{clear:true});assert.equal(cleared.measures[0].events.reduce((n,e)=>n+ticksOf(e),0),1920);
});
test('six-note input completes at six, not three',()=>{
 let d=createBlankDocument(),mode={selectedDuration:'16',tupletMode:'active',tupletCount:6};
 for(let i=0;i<6;i++){const r=inputRhythm(d,at(i),mode,'note',i);d=r.document;mode={...mode,session:r.session,tupletMode:r.tupletMode};assert.equal(r.completed,i===5);}
 assert.deepEqual(compileDocumentV2(d).errors,[]);
});
test('import adapter retains 32/48 dense columns, including 32nd triplets',()=>{
 for(const count of [32,48]){
  const rhythm=Array.from({length:count},(_,i)=>({x:70+i*20,y:210,duration:'32',confidence:.98,...(count===48?{tuplet:{actualNotes:3,normalNotes:2,groupId:`g${Math.floor(i/3)}`}}:{})}));
  const page=resolvePage({page:1,width:1200,height:500,staffs:[{id:'s',x:40,y:100,width:1100,height:50,spacing:10,lines:[100,110,120,130,140,150],measures:[{x:40,y:100,width:1100,height:50,boundariesKnown:true,rhythm}],candidates:rhythm.map(r=>({cx:r.x,cy:100,x:r.x-3,y:95,width:6,height:10,parts:1,string:1,stringDistance:0,ocr:{text:'0',confidence:1,agrees:true}}))}]});
  const analysis={fileName:'new.pdf',pages:[page],summary:summarizeAnalysis([page])},d=analysisToDocument(analysis);
  assert.equal(d.measures[0].events.length,count);assert(d.measures[0].events.every(e=>e.notes.length===1&&e.duration==='32'));assert.deepEqual(compileDocumentV2(d).errors,[]);assert.equal(d.measures[0].pdfImport.rhythmVerified,true);
 }
});
test('beam geometry distinguishes one, two and three separate strokes, above and below',()=>{
 for(const direction of [1,-1])for(const count of [1,2,3]){
  const w=600,h=400,g=20,ink=new Uint8Array(w*h),staff={lines:[120,140,160,180,200,220],spacing:g};const edge=direction===1?220:120,end=edge+direction*50;
  for(const x of [110,180,250])for(let k=3;k<=50;k++)ink[(edge+direction*k)*w+x]=1;
  for(let b=0;b<count;b++)for(let y=end-direction*b*12-1;y<=end-direction*b*12+1;y++)for(let x=110;x<=250;x++)ink[y*w+x]=1;
  const found=detectRhythm(ink,w,h,staff,{x:60,width:240},[{cx:110},{cx:180},{cx:250}]);
  assert.equal(found.length,3);assert(found.every(e=>e.duration===String(4*2**count)),JSON.stringify(found));
 }
});

test('a six-beat bar retains all 72 thirty-second triplets through save/load',()=>{
 let d=createBlankDocument();d.meter=[6,4];d.measures[0].events=Array.from({length:6},(_,i)=>({...d.measures[0].events[0],id:`e${i}`,onset:i*480}));
 let mode={selectedDuration:'32',tupletMode:'active',tupletCount:3};
 for(let i=0;i<72;i++){const r=inputRhythm(d,at(i),mode,'note',i%25);d=r.document;mode={...mode,session:r.completed?null:r.session};}
 assert.equal(d.measures[0].events.length,72);assert.deepEqual(compileDocumentV2(d).errors,[]);
 const store=memory();assert.equal(saveLibraryDocument(store,d).saved,true);assert.deepEqual(loadLibrary(store).records[d.id].document,d);
 assert.equal(scoreTimeline(compileDocumentV2(d).score,120).duration,3);
});

test('internal fractional blank tails cannot become public 64th note input',()=>{
 const d=createBlankDocument();d.measures[0].events[0]={...d.measures[0].events[0],duration:'64',blank:false,rest:false,notes:[{id:'n',string:1,fret:0}]};
 assert(compileDocumentV2(d).errors.length>0);assert.throws(()=>setEventDuration(createBlankDocument(),at(0),'64'));
});

test('native PDF positioning whitespace is not part of a two-digit fret width',()=>{
 const item=(str,x,width)=>({str,width,height:10,fontName:'Times',transform:[10,0,0,10,x,100]});
 const content={items:[item('0',0,5),item('19 ',30,15.6),item(' 11',60,15.6),item('24 1 10',90,31)]};
 const viewport={scale:1,convertToViewportPoint:(x,y)=>[x,y]},result=projectPdfText(content,viewport);
 assert.deepEqual(result.map(t=>t.text),['0','19','11','24','1','10']);
 assert.equal(result[1].width,10);assert(Math.abs(result[2].x-65.6)<1e-9);
});

test('one, two and three rest hooks survive staff-line cuts and reject a lone slash',()=>{
 for(const filename of ['bravura-rests','ruled-hooked-rests','exported-rests'])for(const s of JSON.parse(readFileSync(new URL(`./fixtures/thirty-second/${filename}.json`,import.meta.url)))){
  const expected=s.duration??s.code.match(/\d+/)[0];assert.equal(classifyHookedRest(s.points,s.width,s.height,s.spacing,new Set(s.masked)),expected);
 }
 const points=Array.from({length:50},(_,y)=>({x:20-Math.floor(y*.2),y}));assert.equal(classifyHookedRest(points,21,50,20),null);
 const arrow=[];for(let y=0;y<80;y++){const right=14-Math.floor(y*.1);for(let x=right-(y<10?10:2);x<=right;x++)arrow.push({x,y});}
 assert.equal(classifyHookedRest(arrow,15,80,20),null,'a chord-spanning arrow is not an eighth rest');
});

test('joined fret count requires two tall glyphs, not a wide single numeral',()=>{
 const samples=JSON.parse(readFileSync(new URL('./fixtures/thirty-second/joined-digits.json',import.meta.url)));
 for(const [i,{candidate,staff}] of samples.entries())assert.equal(!!joinedFretSplit(candidate,staff),[0,2,4,5].includes(i));
 for(const {candidate,staff} of samples){const solid={...candidate,bitmap:Array(candidate.width*candidate.height).fill(1)};assert.equal(joinedFretSplit(solid,staff),null);}
});

test('three curved flag strokes stay separate from an eighth flag or solid beam',()=>{
 const rows=readFileSync(new URL('./fixtures/thirty-second/curved-flag.txt',import.meta.url),'utf8').trimEnd().split(/\r?\n/),w=30,h=rows.length,ink=Uint8Array.from(rows.flatMap(r=>Array.from({length:w},(_,i)=>r[i]==='#'?1:0)));
 assert(hasThreeCurvedFlags(ink,w,h,3,69,25));
 assert(!hasThreeCurvedFlags(new Uint8Array(w*h).fill(1),w,h,3,69,25));
 const single=ink.slice();for(let y=0;y<53;y++)single.fill(0,y*w+6,y*w+w);assert(!hasThreeCurvedFlags(single,w,h,3,69,25));
});

test('a tuplet cannot silently change from three to six inside an existing group',()=>{
 const d=ensureTriplet(createBlankDocument(),at(0),'32',3);
 assert.throws(()=>ensureTriplet(d,at(0),'32',6));
 assert.equal(d.measures[0].events[0].tuplet.actualNotes,3);
});

test('piano dotted 32nd hand transfer preserves the fractional silent tail',()=>{
 let d=ensurePianoVoices(convertScoreInstrument(createBlankDocument(),'piano'));
 d=enterPiano(d,pianoCursor(d),[60],{selectedDuration:'32',dottedMode:'one-shot'},{advance:false}).document;
 const i=d.measures[0].events.findIndex(e=>e.notes.length),note=d.measures[0].events[i].notes[0];
 d=movePianoHand(d,{bar:0,event:i,noteId:note.id,hand:'right'},'left').document;
 assert.deepEqual(compileDocumentV2(d).errors,[]);assert.equal(d.measures[0].events.find(e=>e.notes.length).voice,'left');
 for(const hand of ['left','right'])assert.equal(d.measures[0].events.filter(e=>e.voice===hand).reduce((n,e)=>n+ticksOf(e),0),1920);
});

test('an imported dotted-32nd-sized gap remains silent and does not block preview',()=>{
 const d=createBlankDocument();d.pdfTabImport={version:1};d.measures[0].events=d.measures[0].events.slice(0,1).map(e=>({...e,onset:90,blank:false,rest:false,notes:[{id:'tone',string:1,fret:0}]}));
 const compiled=compileDocumentV2(d);assert.deepEqual(compiled.errors,[]);assert(compiled.issues.length>0);
 assert.deepEqual(scorePlaybackReadiness(d,compiled),{allowed:true,preview:true});assert.equal(d.measures[0].events[0].onset,90);
});

test('zoomed tuplet labels preserve base fret evidence and reject ambiguous rhythmic matches',()=>{
 const rhythm=Array.from({length:6},(_,i)=>({x:20+i*20,duration:'16',confidence:.97}));
 const base={x:0,width:150,boundariesKnown:true,rhythm,slots:[{notes:[{fret:12}]}]},source={x:0,width:300,boundariesKnown:true,rhythm:rhythm.map(r=>({...r,x:r.x*2,tuplet:{groupId:'source',actualNotes:6,normalNotes:4},tupletEvidence:{confidence:.96,method:'bracketed-image-triplet'}}))};
 const wrong=structuredClone(base);wrong.rhythm[2].duration='32';assert.equal(corroborateZoomTuplets(wrong,source,.01),0);
 const uncertain=structuredClone(source);uncertain.rhythm[1].tupletEvidence.confidence=.8;assert.equal(corroborateZoomTuplets(base,uncertain,.01),0);
 assert.equal(corroborateZoomTuplets(base,source,.01),6);assert.deepEqual(base.slots,[{notes:[{fret:12}]}]);assert.equal(corroborateZoomTuplets(base,source,.01),0);
});

test('the legacy OMR adapter accepts printed 32nd note and rest tokens without rounding',()=>{
 const raw='clef-G2+keySignature-CM+timeSignature-4/4+'+Array.from({length:32},(_,i)=>i===7?'rest_thirty_second':'note-E4_thirty_second').join('+')+'+barline';
 const parsed=parseTromr(raw);assert.deepEqual(parsed.unsupported,[]);
 const {positions}=recommendTromrPositions(parsed,{octaveShift:0});
 const {document:d,issues}=convertTromr(parsed,{octaveShift:0,positions,bpm:120,title:'Original 32nd exercise'});
 assert.deepEqual(issues,[]);assert.equal(d.measures[0].events.length,32);assert.equal(d.measures[0].events[7].rest,true);
 assert(d.measures[0].events.every((e,i)=>e.duration==='32'&&e.onset===i*60));
 assert.equal(scoreTimeline(compileDocumentV2(d).score,120).duration,2);
});

test('32nd tuplets use the current measure meter when entering and ungrouping',()=>{
 for(const count of [3,6]){
  const d=createBlankDocument();d.measures[0].meter=[6,4];
  const e=d.measures[0].events[0];d.measures[0].events=Array.from({length:6},(_,i)=>({...e,id:`mixed-${i}`,onset:i*480}));
  const grouped=ensureTriplet(d,at(4),'32',count);assert.deepEqual(compileDocumentV2(grouped).errors,[]);
  const ungrouped=removeTriplet(grouped,at(4));assert.deepEqual(compileDocumentV2(ungrouped).errors,[]);
  assert.equal(ungrouped.measures[0].events.reduce((sum,e)=>sum+ticksOf(e),0),2880);
 }
});
