import test from 'node:test';
import assert from 'node:assert/strict';
import {projectPdfText,textFretsForStaff} from '../src/pdf/tab-import/pdfText.js';
import {classifyFret,resolvePage} from '../src/pdf/tab-import/recognition.js';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
import {compileDocumentV2} from '../src/etudes/scoreModel.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {angleDirection,attachOmittedFretTies,attachRasterArpeggios} from '../src/pdf/tab-import/imageTabTechniques.js';
import {attachNativeTabSymbols} from '../src/pdf/tab-import/tabSymbols.js';

test('native balanced harmonic notation preserves the numeric center; malformed brackets do not become frets',()=>{
 const view={scale:1,convertToViewportPoint:(x,y)=>[x,y]};
 for(const text of ['<5>','<12>','(<7>)']){
  const glyphs=projectPdfText({items:[{str:text,width:text.length*6,height:10,transform:[10,0,0,10,100,103.7],fontName:'f'}]},view);
  assert.equal(glyphs.length,1);assert.equal(glyphs[0].harmonic,true);assert.equal(glyphs[0].cx,100+text.length*3);
  const frets=textFretsForStaff(glyphs,{x:50,width:400,spacing:10,lines:[100,110,120,130,140,150]});
  assert.equal(frets.length,1);assert.equal(frets[0].harmonic,true);
 }
 for(const str of ['(<5>','<5>)','<abc>','<123>','<5','5>'])assert.equal(projectPdfText({items:[{str,width:30,transform:[10,0,0,10,100,103.7]}]},view).length,0);
});

test('unsupported harmonic positions remain unresolved instead of playing an ordinary fret',()=>{
 const c={id:'c',cx:80,x:74,y:90,width:12,height:18,string:1,stringDistance:0,parts:1,harmonic:true,ocr:{text:'6',agrees:true,confidence:.99,method:'pdf-text-on-tab-line'}};
 const rejected=classifyFret(c,{x:80,confidence:.99},{spacing:21});assert.equal(rejected.status,'rejected');assert(rejected.reasons.includes('unsupported-harmonic-position'));
 assert.equal(classifyFret({...c,ocr:{...c.ocr,text:'5'}},{x:80,confidence:.99},{spacing:21}).harmonic,true);
});

test('combined harmonic/fret PDF text uses measured same-font widths, never guessed token positions',()=>{
 const make=(str,width,x=100,fontName='mono')=>({str,width,height:10,transform:[10,0,0,10,x,103.7],fontName});
 const view={scale:1,convertToViewportPoint:(x,y)=>[x,y]},items=[make('(<12>)',36),make('2',6),make('(<12>) 2',46,200)];
 const glyphs=projectPdfText({items},view).slice(2);
 assert.deepEqual(glyphs.map(g=>[g.text,g.cx,!!g.harmonic]),[['12',218,true],['2',243,false]]);
 for(const mixed of [make('(<12>) 2',46,200,'other'),make('(<12>) 2',80,200),make('(<12>) 2',30,200),make('(<12>) unknown',46,200)])assert.equal(projectPdfText({items:[...items.slice(0,2),mixed]},view).length,2);
});

test('an angled bracket requires two matching diagonal arms; a straight stem or isolated slash is not enough',()=>{
 const width=80,g=20,part={x:20,y:20,width:12,height:11};
 for(const shape of ['left','right','stem','slash']){
  const ink=new Uint8Array(width*80);
  for(let y=0;y<11;y++){let x=shape==='left'?Math.abs(y-5)*2:shape==='right'?10-Math.abs(y-5)*2:shape==='stem'?5:y;for(let dx=0;dx<2;dx++)ink[(20+y)*width+20+x+dx]=1;}
  assert.equal(angleDirection(ink,width,part,g),['left','right'].includes(shape)?shape:null);
 }
});

function omittedTie({curve=true,targetDigit=false,nativeText=false}={}){
 const width=300,height=300,g=20,ink=new Uint8Array(width*height),staff={id:1,x:20,width:250,y:60,height:100,spacing:g,lines:[60,80,100,120,140,160],bars:[20,270],candidates:[{id:'n',x:84,y:132,width:12,height:17,cx:90,cy:140,string:5,stringDistance:0,parts:1,ocr:{text:'3',agrees:true,confidence:.99,method:'pdf-text-on-tab-line'}}],measures:[{x:20,y:60,width:250,height:100,boundariesKnown:true,rhythm:[90,140,190,240].map(x=>({x,duration:'4',confidence:.99}))}]};
 if(curve)for(let i=0;i<=18;i++){const x=102+i,y=145+Math.round(6*(1-((i-9)/9)**2));ink[y*width+x]=ink[(y+1)*width+x]=1;}
 if(targetDigit)staff.candidates.push({...staff.candidates[0],id:'next',x:134,cx:140,ocr:{text:'4',agrees:true,confidence:.99,method:'pdf-text-on-tab-line'}});
 attachOmittedFretTies(ink,width,height,staff);
 if(nativeText){staff.nativeText=true;attachNativeTabSymbols(ink,width,staff,{rhythmicPage:true});}
 return {version:1,fileName:'Independent.pdf',pages:[resolvePage({page:1,width,height,staffs:[staff]})],summary:{pages:1}};
}

test('visible short tie recovers only a confirmed single preceding note at an otherwise empty column',()=>{
 const a=omittedTie(),slots=a.pages[0].staffs[0].measures[0].slots;assert.equal(slots[1].tieFromPrevious,true);assert.equal(slots[1].notes[0].fret,3);
 const doc=analysisToDocument(a);assert.equal(doc.measures[0].events[0].tieTo,doc.measures[0].events[1].id);
 for(const options of [{curve:false},{targetDigit:true}])assert.equal(omittedTie(options).pages[0].staffs[0].measures[0].slots[1].tieFromPrevious,undefined);
});

test('native PDF filtering keeps an evidence-backed tied column but removes unsupported empty stems',()=>{
 const tied=omittedTie({nativeText:true}).pages[0].staffs[0].measures[0].slots;
 assert.equal(tied.length,2);assert.equal(tied[1].tieFromPrevious,true);
 assert.equal(omittedTie({nativeText:true,curve:false}).pages[0].staffs[0].measures[0].slots.length,1);
});

test('harmonics and both arpeggio directions survive conversion and determine actual playback pitch/order',()=>{
 const a=omittedTie({curve:false}),m=a.pages[0].staffs[0].measures[0];
 for(const [i,s] of m.slots.entries()){
  s.notes=[1,2,3].map(string=>({string,fret:5,harmonic:true,status:'confirmed',confidence:{fret:1,string:1},source:{}}));s.status='confirmed';s.arpeggio=i%2?'down':'up';s.rest=false;
 }m.rhythmValid=true;m.needsReview=false;
 const doc=JSON.parse(JSON.stringify(analysisToDocument(a))),compiled=compileDocumentV2(doc);assert.deepEqual(compiled.errors,[]);
 const events=scoreTimeline(compiled.score).events;
 assert.deepEqual(events.slice(0,3).map(n=>n.string),[3,2,1]);assert.deepEqual(events.slice(3,6).map(n=>n.string),[1,2,3]);
 assert.equal(events.find(n=>n.string===1).midi,88);assert(events.every(n=>n.harmonic));
});

test('ordinary straight stems next to a chord cannot acquire an arpeggio direction',()=>{
 const width=250,height=250,ink=new Uint8Array(width*height),staff={spacing:20,lines:[60,80,100,120,140,160],bars:[20,230],candidates:[1,2,3].map(string=>({cx:100,string})),measures:[{rhythm:[{x:100}]}]};
 for(let y=40;y<160;y++)for(let x=79;x<=81;x++)ink[y*width+x]=1;
 attachRasterArpeggios(ink,width,height,staff,[{cx:80,cy:80,nonFretSymbol:'stem-crossing'}]);assert.equal(staff.measures[0].rhythm[0].arpeggio,undefined);
});
