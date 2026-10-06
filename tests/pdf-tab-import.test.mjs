import test from 'node:test';
import assert from 'node:assert/strict';
import {detectStaffs,detectBarlines,detectRhythm,attachHalfNoteStubs} from '../src/pdf/tab-import/geometry.js';
import {projectPdfText,textFretsForStaff,attachPrintedTuplets} from '../src/pdf/tab-import/pdfText.js';
import {classifyFret,resolvePage,summarizeAnalysis} from '../src/pdf/tab-import/recognition.js';
import {analysisToDocument,reconcileImportedEdits,unresolvedPositions,confirmImportedMeasure} from '../src/pdf/tab-import/scoreAdapter.js';
import {compileDocumentV2,createBlankDocument} from '../src/etudes/scoreModel.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';
import {enterFret} from '../src/etudes/editorCommands.js';
import {TAB_IMPORT_CONFIG as C} from '../src/pdf/tab-import/config.js';
import {hasSevenCap} from '../src/pdf/tab-import/glyphValidation.js';
import {abortable} from '../src/pdf/tab-import/abortable.js';
import {copyScoreRange,pasteScoreRange} from '../src/etudes/scoreRangeClipboard.js';
import {attachNativeTabSymbols,hasWholeRest,isTabRepeatSlash,findEighthRests} from '../src/pdf/tab-import/tabSymbols.js';
import {scoreMeasureLimit} from '../src/etudes/scoreLimits.js';

const candidate=(overrides={})=>({id:crypto.randomUUID(),x:95,y:96,width:10,height:9,cx:100,cy:100,string:1,stringDistance:0,parts:1,ocr:{text:'3',confidence:.99,agrees:true,alternatives:[]},...overrides});
function pageFixture(){
 const staff={id:1,x:40,y:100,width:420,height:50,spacing:10,lines:[100,110,120,130,140,150],bars:[40,460],candidates:[],measures:[{x:40,y:100,width:420,height:50,boundariesKnown:true,rhythm:[100,200,300,400].map(x=>({x,y:180,duration:'4',confidence:.98,beamCount:0}))}]};
 staff.candidates=[100,200,300,400].map(cx=>candidate({x:cx-5,cx}));
 return {page:1,width:600,height:500,staffs:[staff]};
}
function analysis(page=pageFixture()){const pages=[resolvePage(page)];return {pages,fileName:'Test.pdf',summary:summarizeAnalysis(pages)};}

test('PDF and photo imports set a clean song title and preserve their source names',()=>{
 for(const fileName of ['Let_It_Be(코드)_페이지_1.pdf','Let_It_Be(코드)_페이지_1.jpg']){
  const d=analysisToDocument({...analysis(),fileName});
  assert.equal(d.title,'Let It Be');assert.equal(d.english,d.title);
  assert.equal(d.pdfTabImport.fileName,fileName);assert.equal(d.measures.length,1);
 }
});

test('staff detector excludes five-line notation, short chord grids, and seven-line graphics',()=>{
 for(const [count,length,expected] of [[6,450,1],[5,450,0],[6,70,0],[7,450,0]]){
  const w=600,h=240,p=new Uint8Array(w*h);for(let i=0;i<count;i++)for(let x=40;x<40+length;x++)p[(40+i*16)*w+x]=1;
  assert.equal(detectStaffs(p,w,h).length,expected);
 }
});
test('barlines preserve an empty bar and ignore stems extending below the staff',()=>{
 const w=600,h=240,p=new Uint8Array(w*h),staff={x:40,y:40,width:450,height:80,spacing:16,lines:[40,56,72,88,104,120]};
 for(const x of [40,265,490])for(let y=40;y<=120;y++)p[y*w+x]=1;
 for(let y=40;y<160;y++)p[y*w+130]=1;
 const found=detectBarlines(p,w,staff);assert.equal(found.measures.length,2);assert.ok(!found.bars.includes(130));
});
test('fret gates reject ambiguous strings, conflicting digits, slot mismatch and invalid range',()=>{
 const slot={x:100,confidence:.98},staff={spacing:10};
 assert.equal(classifyFret(candidate(),slot,staff).status,'confirmed');
 for(const c of [candidate({stringDistance:.5}),candidate({cx:120}),candidate({ocr:{text:'25',confidence:.99,agrees:true}}),candidate({ocr:{text:'3',confidence:.97,agrees:true,alternatives:[{text:'8',confidence:.94}]}}),candidate({ocr:{text:'3',confidence:.98,agrees:false}})])assert.notEqual(classifyFret(c,slot,staff).status,'confirmed');
 assert.equal(classifyFret(candidate({ocr:{text:'3',confidence:.8,agrees:true}}),slot,staff).status,'unresolved');
 assert.equal(classifyFret(candidate({ocr:{text:'3',confidence:.7,agrees:true}}),slot,staff).status,'rejected');
});
test('two-digit frets require two-character geometry and the same rhythmic slot',()=>{
 const c=candidate({width:12,parts:2,ocr:{text:'12',confidence:.99,agrees:true}}),staff={spacing:12},slot={x:100,confidence:.98};
 assert.equal(classifyFret(c,slot,staff).fret,12);
 assert.notEqual(classifyFret({...c,parts:1},slot,staff).status,'confirmed');
 assert.notEqual(classifyFret({...c,cx:116},slot,staff).status,'confirmed');
});
test('simultaneous strings become one chord with provenance and unique note IDs',()=>{
 const p=pageFixture();p.staffs[0].candidates.push(candidate({string:6,cy:150,y:146}));
 const result=analysis(p),d=analysisToDocument(result);assert.equal(d.measures[0].events.length,4);assert.equal(d.measures[0].events[0].notes.length,2);
 assert.deepEqual(d.measures[0].events[0].notes.map(n=>n.string),[1,6]);assert.equal(result.summary.confirmed,5);
 assert.equal(d.measures[0].events[0].pdfImport.source.page,1);assert.deepEqual(compileDocumentV2(d).errors,[]);assert.deepEqual(compileDocumentV2(d).issues,[]);
});
test('uncertain rhythm retains verified frets without inventing missing notes or rests',()=>{
 for(const kind of ['short','long','orphan']){
  const p=pageFixture(),m=p.staffs[0].measures[0];if(kind==='short')m.rhythm.pop();if(kind==='long')m.rhythm[0].duration='2';if(kind==='orphan')p.staffs[0].candidates.push(candidate({cx:150,x:145}));
  const a=analysis(p),d=analysisToDocument(a);assert.equal(a.summary.needsReview,1);assert.equal(a.summary.confirmed,kind==='orphan'?5:4);assert.equal(d.measures[0].events.flatMap(e=>e.notes).length,kind==='orphan'?5:4);assert.ok(d.measures[0].events.every(e=>!e.rest||e.blank));assert.ok(compileDocumentV2(d).issues.length);assert.deepEqual(compileDocumentV2(d).errors,[]);
 }
});
test('unreadable measures survive and partial chord entry resolves only the edited string',()=>{
 const p=pageFixture();p.staffs[0].candidates[0].ocr.confidence=.8;p.staffs[0].candidates.push(candidate({string:5,ocr:{text:'2',confidence:.8,agrees:true}}));
 const d=analysisToDocument(analysis(p)),one=reconcileImportedEdits(d,enterFret(d,{bar:0,event:0,string:1},3));
 assert.equal(one.measures[0].events[0].pdfImport.status,'unresolved');
 const two=reconcileImportedEdits(one,enterFret(one,{bar:0,event:0,string:5},2));assert.equal(two.measures[0].events[0].pdfImport.status,'confirmed');
 const empty=pageFixture();empty.staffs[0].candidates=[];empty.staffs[0].measures[0].rhythm=[];const blank=analysisToDocument(analysis(empty));assert.equal(blank.measures.length,1);assert.equal(unresolvedPositions(blank).length,1);assert.equal(blank.measures[0].events[0].notes.length,0);
});
test('library save/reopen preserves metadata and cannot overwrite another document',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},old=createBlankDocument();saveLibraryDocument(storage,old);
 const d=analysisToDocument(analysis()),saved=saveLibraryDocument(storage,d);assert.equal(saved.saved,true);const records=loadLibrary(storage).records;
 assert.deepEqual(records[old.id].document,old);assert.deepEqual(records[d.id].document,d);assert.notEqual(d.id,old.id);
});
test('manual review cannot confirm blank or incomplete rhythm',()=>{
 const d=analysisToDocument(analysis());d.measures[0].pdfImport.needsReview=true;
 assert.equal(confirmImportedMeasure(d,0).measures[0].pdfImport.needsReview,false);
 d.measures[0].events[0].blank=true;assert.throws(()=>confirmImportedMeasure(d,0));
});
test('configuration confidence thresholds have one source',()=>{assert.equal(C.confirmed,.95);assert.equal(C.rejected,.75);});
test('cancellation settles even when a terminated OCR worker never replies',async()=>{
 const controller=new AbortController(),pending=abortable(new Promise(()=>{}),controller.signal);controller.abort();await assert.rejects(pending,{name:'AbortError'});
});
test('barline crossing ties is retained, a shorter arpeggio spine is excluded',()=>{
 const w=600,h=240,p=new Uint8Array(w*h),staff={x:40,y:40,width:450,height:80,spacing:16,lines:[40,56,72,88,104,120]};
 for(const x of [40,265,490])for(let y=40;y<=120;y++)p[y*w+x]=1;
 for(let y=48;y<=120;y++)p[y*w+85]=1;
 for(const y of [47,66,83])for(let x=245;x<285;x++)p[y*w+x]=1;
 const r=detectBarlines(p,w,staff);assert.deepEqual(r.bars,[40,265,490]);assert.equal(r.measures.length,2);
});
test('an imported 16th slot keeps its duration and resolves after fret entry',()=>{
 const p=pageFixture(),staff=p.staffs[0];staff.measures[0].rhythm=Array.from({length:16},(_,i)=>({x:60+i*24,y:180,duration:'16',confidence:.98}));staff.candidates=staff.measures[0].rhythm.map(s=>candidate({x:s.x-5,cx:s.x}));staff.candidates[3].ocr.confidence=.8;
 const d=analysisToDocument(analysis(p)),after=reconcileImportedEdits(d,enterFret(d,{bar:0,event:3,string:1},7));assert.equal(after.measures[0].events[3].duration,'16');assert.equal(after.measures[0].events[3].onset,360);assert.equal(after.measures[0].events[3].pdfImport.status,'confirmed');
});

test('unresolved provenance remains editable after a user copies a slot to an ordinary document',()=>{
 const p=pageFixture();p.staffs[0].candidates[0].ocr.confidence=.8;
 const source=analysisToDocument(analysis(p)),clip=copyScoreRange(source,{start:{bar:0,event:0},end:{bar:0,event:0}});
 const pasted=pasteScoreRange(createBlankDocument(),{bar:0,event:0},clip);
 const resolved=reconcileImportedEdits(pasted,enterFret(pasted,{bar:0,event:0,string:1},3));
 assert.equal(resolved.measures[0].events[0].pdfImport.status,'confirmed');
 assert.deepEqual(resolved.measures[0].events[0].pdfImport.source,source.measures[0].events[0].pdfImport.source);
});

test('printed digits are restricted to actual TAB lines and exclude chart/title regions',()=>{
 const staff={x:20,width:400,spacing:20,lines:[100,120,140,160,180,200]},glyph=(text,x,cy)=>({text,x,width:10,height:14,fontSize:20,cx:x+5,cy});
 const values=textFretsForStaff([glyph('3',50,120),glyph('2',50,60),glyph('12',80,140),glyph('9',90,151),glyph('99',110,160)],staff);
 assert.deepEqual(values.map(n=>[n.string,n.ocr.text]),[[2,'3'],[3,'12']]);
});

test('PDF narrow spaced triplet digits remain separate; overprinted bold digits deduplicate',()=>{
 const item=(str,x,width)=>({str,width,height:10,transform:[10,0,0,10,x,100],fontName:'Arial'}),viewport={scale:1,convertToViewportPoint:(x,y)=>[x,200-y]};
 const text=projectPdfText({items:[item('2',40,6),item('0 1 0 ',60,24),item('12',120,12),item('1 2',150,50)]},viewport);
 assert.deepEqual(text.map(t=>[t.text,t.x]),[['2',40],['0',60],['1',68],['0',76],['12',120]]);
 const staff={x:0,width:220,spacing:10,lines:[96.3,106.3,116.3,126.3,136.3,146.3]};
 const duplicated=[text[0],{...text[0],cx:text[0].cx+.25},{...text[0],text:'3'}];
 assert.equal(textFretsForStaff(duplicated,staff).length,2);
});

test('detached chord-grid strokes never win over beams connected to the TAB',()=>{
 const width=400,height=240,ink=new Uint8Array(width*height),staff={spacing:16,lines:[40,56,72,88,104,120]};
 for(const x of [50,62,74,86,98,110,122,134,146])for(let y=2;y<32;y++)ink[y*width+x]=1;
 for(const y of [3,4,5,16,17,18])for(let x=50;x<=146;x++)ink[y*width+x]=1;
 for(const x of [100,200])for(let y=132;y<=160;y++)ink[y*width+x]=1;
 for(const y of [158,159,160])for(let x=100;x<=200;x++)ink[y*width+x]=1;
 const result=detectRhythm(ink,width,height,staff,{x:20,width:300},[{cx:100},{cx:200}]);
 assert.deepEqual(result.map(r=>[r.x,r.direction,r.duration]),[[100,1,'8'],[200,1,'8']]);
});

test('a visible short half-note stem is recognized without guessing from spacing',()=>{
 const width=400,height=240,ink=new Uint8Array(width*height),staff={spacing:20,lines:[20,40,60,80,100,120],measures:[{x:30,width:300,rhythm:[{x:60,y:168,direction:1,duration:'8'},{x:90,y:168,direction:1,duration:'8'}]}]};
 for(let y=149;y<=168;y++)ink[y*width+160]=1;
 attachHalfNoteStubs(ink,width,height,staff,[{cx:160,stringDistance:0},{cx:230,stringDistance:0}]);
 assert.deepEqual(staff.measures[0].rhythm.map(s=>[s.x,s.duration]),[[60,'8'],[90,'8'],[160,'2']]);
});

test('only an explicit nearby 3 label permits a three-note tuplet',()=>{
 const staff={id:1,spacing:20,measures:[{index:0,rhythm:[100,120,140].map(x=>({x,y:200,duration:'16'}))}]};
 attachPrintedTuplets(staff,[{text:'3',cx:120,cy:90}]);assert.ok(staff.measures[0].rhythm.every(s=>!s.tuplet));
 attachPrintedTuplets(staff,[{text:'3',cx:120,cy:220}]);assert.ok(staff.measures[0].rhythm.every(s=>s.tuplet.actualNotes===3&&s.tuplet.normalNotes===2));
});

test('all three PDF pages remain one editable saved score beyond 64 bars with distinct later frets',()=>{
 const a=analysis(),template=a.pages[0];
 a.pages=[24,24,22].map((count,p)=>{const page=structuredClone(template);page.page=p+1;
  page.staffs[0].measures=Array.from({length:count},(_,i)=>{const m=structuredClone(template.staffs[0].measures[0]);m.source.page=p+1;for(const s of m.slots){s.source.page=p+1;s.notes[0].fret=(p*7+i)%25;}return m;});return page;});
 a.summary=summarizeAnalysis(a.pages);
 const doc=analysisToDocument(a);assert.equal(doc.measures.length,70);
 assert.deepEqual(doc.pdfTabImport.importRange,{start:1,end:70,total:70});
 assert.deepEqual(doc.pdfTabImport.pages,[{page:1,start:0,end:24,count:24},{page:2,start:24,end:48,count:24},{page:3,start:48,end:70,count:22}]);
 assert.equal(doc.measures[64].pdfImport.source.measure,65);assert.equal(doc.measures[64].pdfImport.source.page,3);
 assert.equal(doc.measures.at(-1).events[0].notes[0].fret,10);assert.notEqual(doc.measures.at(-1).events[0].notes[0].fret,doc.measures[1].events[0].notes[0].fret);
 assert.equal(new Set(doc.measures.flatMap(m=>m.events.map(e=>e.id))).size,280);
 assert.deepEqual(compileDocumentV2(doc).errors,[]);
 const clip=copyScoreRange(doc,{start:{bar:69,event:0},end:{bar:69,event:0}}),edited=pasteScoreRange(doc,{bar:69,event:1},clip);
 assert.deepEqual(compileDocumentV2(edited).errors,[]);assert.equal(edited.measures[69].events[1].notes[0].fret,10);
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 assert.equal(saveLibraryDocument(storage,edited).saved,true);assert.deepEqual(loadLibrary(storage).records[edited.id].document.measures,edited.measures);
 assert.equal(scoreMeasureLimit(doc),512);assert.equal(scoreMeasureLimit(createBlankDocument()),64);
});

test('whole-file limit fails explicitly instead of silently truncating pages',()=>{
 const a=analysis(),m=a.pages[0].staffs[0].measures[0];a.pages[0].staffs[0].measures=Array.from({length:513},()=>m);
 assert.throws(()=>analysisToDocument(a),/전체 페이지/);
});

test('unanchored strum stems survive and a short secondary beam produces a sixteenth',()=>{
 const width=400,height=240,ink=new Uint8Array(width*height),staff={spacing:20,lines:[20,40,60,80,100,120]};
 for(const x of [100,200,300])for(let y=126;y<=180;y++)ink[y*width+x]=1;
 for(let y=178;y<=180;y++)for(let x=100;x<=300;x++)ink[y*width+x]=1;
 for(let y=167;y<=169;y++)for(let x=100;x<=112;x++)ink[y*width+x]=1;
 const found=detectRhythm(ink,width,height,staff,{x:40,width:320},[{cx:100}]);
 assert.deepEqual(found.map(r=>r.duration),['16','8','8']);
});

test('repeat slashes use the preceding confirmed TAB chord and never clone unknown or single-note slots',()=>{
 const p=pageFixture(),s=p.staffs[0];s.candidates=[candidate(),candidate({string:6}),candidate({cx:300,x:295,ocr:{text:'8',confidence:.99,agrees:true}})];
 s.measures[0].rhythm[1].repeatPrevious=true;s.measures[0].rhythm[3].repeatPrevious=true;
 const a=analysis(p),slots=a.pages[0].staffs[0].measures[0].slots;
 assert.deepEqual(slots.map(r=>r.notes.map(n=>n.fret)),[[3,3],[3,3],[8],[]]);
 assert.equal(a.summary.repeatedFrets,2);assert.equal(slots[1].notes[0].method,'tab-repeat-slash');
 assert.notEqual(slots[1].notes[0].candidateId,slots[0].notes[0].candidateId);
});

test('native TAB symbol recognition excludes long horizontal graphics and preserves genuine whole-bar rests',()=>{
 const width=400,height=240,ink=new Uint8Array(width*height),staff={nativeText:true,spacing:20,thickness:1,lines:[20,40,60,80,100,120],candidates:[],measures:[{x:30,width:300,rhythm:[]}]},m=staff.measures[0];
 for(let y=43;y<=48;y++)for(let x=168;x<=188;x++)ink[y*width+x]=1;
 assert.equal(hasWholeRest(ink,width,staff,m),true);attachNativeTabSymbols(ink,width,staff);
 assert.equal(m.rhythm[0].rest,true);assert.equal(m.rhythm[0].duration,'1');
 const p=pageFixture();p.staffs[0].candidates=[];p.staffs[0].measures[0].rhythm=m.rhythm;
 const doc=analysisToDocument(analysis(p));assert.equal(doc.measures[0].events[0].blank,false);assert.equal(doc.measures[0].events[0].rest,true);assert.deepEqual(compileDocumentV2(doc).issues,[]);
 for(let y=43;y<=48;y++)for(let x=30;x<=330;x++)ink[y*width+x]=1;
 assert.equal(hasWholeRest(ink,width,staff,m),false);
});

test('only explicit diagonal slash pixels repeat a chord; bare TAB digits do not imply whole notes',()=>{
 const width=400,ink=new Uint8Array(width*240),staff={nativeText:true,spacing:20,thickness:1,lines:[20,40,60,80,100,120],candidates:[{cx:100},{cx:100}],measures:[{x:30,width:300,rhythm:[]}]};
 assert.equal(isTabRepeatSlash(ink,width,staff,160),false);
 for(let y=62;y<79;y++)for(let dx=0;dx<3;dx++)ink[y*width+160+80-y+dx]=1;
 assert.equal(isTabRepeatSlash(ink,width,staff,160),true);
 attachNativeTabSymbols(ink,width,staff);assert.equal(staff.measures[0].rhythm.length,0);
});

test('eighth-rest geometry excludes native number glyphs and augmentation dots keep eighth beams',()=>{
 const width=400,ink=new Uint8Array(width*240),staff={nativeText:true,spacing:20,thickness:1,lines:[20,40,60,80,100,120],candidates:[],measures:[{x:30,width:300,rhythm:[]}]},m=staff.measures[0];
 for(let y=50;y<=56;y++)for(let x=100;x<=109;x++)ink[y*width+x]=1;
 for(let y=54;y<=70;y++)for(let x=108;x<=110;x++)ink[y*width+x]=1;
 assert.equal(findEighthRests(ink,width,staff,m,[]).length,1);assert.equal(findEighthRests(ink,width,staff,m,[{cx:105}]).length,0);
 ink.fill(0);staff.candidates=[{cx:150}];m.rhythm=[{x:150,y:180,direction:1,beamCount:1,beamYs:[180],duration:'8'}];
 for(let y=168;y<=172;y++)for(let x=158;x<=162;x++)ink[y*width+x]=1;
 attachNativeTabSymbols(ink,width,staff);assert.equal(m.rhythm[0].dotted,true);assert.equal(m.rhythm[0].duration,'8');
});

test('an eighth-rest crop cannot be entered as a fret seven despite OCR agreement',()=>{
 const digit=new Uint8Array(14*21).fill(255),rest=digit.slice();
 for(let y=0;y<3;y++)for(let x=0;x<13;x++)digit[y*14+x]=0;
 // The curved head grows gradually before the wide join with the stem.
 for(let y=0;y<4;y++)for(let x=0;x<(y<2?5:8);x++)rest[y*14+x]=0;
 for(let y=4;y<7;y++)for(let x=0;x<13;x++)rest[y*14+x]=0;
 for(let y=1;y<21;y++)for(let x=8;x<11;x++)rest[y*14+x]=0;
 assert.equal(hasSevenCap(digit,14,21),true);assert.equal(hasSevenCap(rest,14,21),false);
 const c=candidate({ocr:{text:'7',confidence:.99,agrees:true,shapeRejected:'rest-like-seven'}});
 assert.equal(classifyFret(c,{x:100,confidence:.98},{spacing:10}).status,'rejected');
 const p=pageFixture();p.staffs[0].candidates.push({...c,x:145,cx:150});
 const a=analysis(p);assert.equal(a.pages[0].staffs[0].measures[0].slots.length,4);
 assert.equal(analysisToDocument(a).measures[0].events.flatMap(e=>e.notes).length,4);
});

test('extra noisy columns do not erase verified frets from a dense review bar',()=>{
 const a=analysis(),m=a.pages[0].staffs[0].measures[0];
 m.slots=Array.from({length:19},(_,i)=>({...structuredClone(m.slots[0]),x:i*20,notes:i<4?[]:structuredClone(m.slots[0].notes)}));
 m.needsReview=true;m.rhythmValid=false;
 const d=analysisToDocument(a),bar=d.measures[0];
 assert.equal(bar.events.flatMap(e=>e.notes).length,15);assert.equal(bar.pdfImport.unmappedSlots.length,3);
 assert.ok(bar.events.every(e=>e.pdfImport.status==='unresolved'));assert.deepEqual(compileDocumentV2(d).errors,[]);
});
