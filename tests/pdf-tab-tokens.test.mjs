import test from 'node:test';
import assert from 'node:assert/strict';
import {agreeReadings} from '../src/pdf/tab-import/localOcr.js';
import {classifyFret,resolvePage,summarizeAnalysis} from '../src/pdf/tab-import/recognition.js';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
import {projectPdfText,textFretsForStaff} from '../src/pdf/tab-import/pdfText.js';
import {markNonFretSymbols} from '../src/pdf/tab-import/imageTabTokens.js';
import {attachNativeTabSymbols} from '../src/pdf/tab-import/tabSymbols.js';
import {tabRepeatMask} from '../src/etudes/tabRepeat.js';
import {compileDocumentV2} from '../src/etudes/scoreModel.js';
import {hasSevenCap} from '../src/pdf/tab-import/glyphValidation.js';
import {detectRhythm} from '../src/pdf/tab-import/geometry.js';

const c=(id,cx,string,text)=>({id,x:cx-5,y:50+(string-1)*20-6,width:10,height:13,cx,cy:50+(string-1)*20,string,stringDistance:0,parts:1,ocr:{text,agrees:true,confidence:.99,alternatives:[]}});
const fixture=()=>({page:1,width:600,height:300,staffs:[{id:1,x:20,y:50,width:560,height:100,spacing:20,thickness:1,lines:[50,70,90,110,130,150],bars:[20,580],candidates:[],measures:[{x:20,y:50,width:560,height:100,boundariesKnown:true,rhythm:[]}]}]});
const convert=p=>{const page=resolvePage(p);return analysisToDocument({fileName:'arbitrary-name.pdf',pages:[page],summary:summarizeAnalysis([page])});};

test('uppercase/lowercase mute readings agree, numeric conflicts still block and X is a per-string mute',()=>{
 const ocr=agreeReadings([{text:'x',confidence:.98},{text:'X',confidence:.99}]);assert.equal(ocr.text,'X');assert.equal(ocr.agrees,true);
 assert.equal(agreeReadings([{text:'X',confidence:.98},{text:'x',confidence:.99},{text:'7',confidence:.99}]).agrees,false);
 const note=classifyFret({...c('x',100,2,'X'),ocr},{x:100,confidence:.98},{spacing:20});assert.equal(note.status,'confirmed');assert.equal(note.dead,true);assert.equal(note.fret,0);
 const p=fixture();p.staffs[0].candidates=[c('a',100,1,'0'),c('b',100,2,'X')];p.staffs[0].measures[0].rhythm=[{x:100,duration:'1',confidence:.99}];
 const doc=convert(p);assert.deepEqual(doc.measures[0].events[0].notes.map(n=>[n.string,n.fret,!!n.dead]),[[1,0,false],[2,0,true]]);assert.deepEqual(compileDocumentV2(doc).errors,[]);assert.equal(doc.measures[0].events[0].tabRepeat,undefined);
});

test('native mute text is restricted to the six lines; chart X and word text stay out',()=>{
 const viewport={scale:1,convertToViewportPoint:(x,y)=>[x,y]},item=(str,x,y)=>({str,width:8,height:20,transform:[20,0,0,20,x,y],fontName:'tab'});
 const glyphs=projectPdfText({items:[item('X',100,77.4),item('x',130,77.4),item('X',100,10),item('Xylophone',100,77.4)]},viewport);
 const found=textFretsForStaff(glyphs,fixture().staffs[0]);assert.deepEqual(found.map(g=>g.ocr.text),['X','X']);assert.ok(found.every(g=>g.string===2));
});

test('two-beat chord changes preserve quarter/eighth/sixteenth/sixteenth rhythm and hide only repeated grips',()=>{
 const p=fixture(),s=p.staffs[0];s.measures[0].rhythm=[100,155,190,215,300,355,390,415].map((x,i)=>({x,duration:['4','8','16','16'][i%4],confidence:.99,repeatPrevious:i%4!==0}));
 s.candidates=[c('a',100,1,'0'),c('b',100,2,'2'),c('d',300,1,'2'),c('e',300,2,'3')];
 const doc=convert(p),events=doc.measures[0].events;assert.deepEqual(events.map(e=>e.duration),['4','8','16','16','4','8','16','16']);
 assert.deepEqual(events.map(e=>e.notes.map(n=>n.fret)),[[0,2],[0,2],[0,2],[0,2],[2,3],[2,3],[2,3],[2,3]]);
 assert.deepEqual(tabRepeatMask(events),[false,true,true,true,false,true,true,true]);assert.deepEqual(compileDocumentV2(doc).issues,[]);
 assert.deepEqual(tabRepeatMask(JSON.parse(JSON.stringify(doc)).measures[0].events),tabRepeatMask(events));
});

test('rests, X, partial chords and single notes cannot supply a following repeat slash',()=>{
 for(const mode of ['rest','mute','single','unknown']){
  const p=fixture(),s=p.staffs[0];s.candidates=[c('a',100,1,'0'),c('b',100,2,'2')];s.measures[0].rhythm=[100,200,300,400].map(x=>({x,duration:'4',confidence:.99}));
  if(mode==='rest')s.measures[0].rhythm[1].rest=true;
  else{s.candidates.push(c('d',200,1,mode==='mute'?'X':'3'));if(mode!=='single'){s.candidates.push(c('e',200,2,'2'));if(mode==='unknown')s.candidates.at(-1).ocr.confidence=.8;}}
  s.measures[0].rhythm[2].repeatPrevious=true;assert.deepEqual(resolvePage(p).staffs[0].measures[0].slots[2].notes,[],mode);
 }
});

test('raster slash pixels restore repeated-chord semantics without relying on PDF text',()=>{
 const p=fixture(),s=p.staffs[0],ink=new Uint8Array(p.width*p.height);s.nativeText=false;s.candidates=[c('a',100,1,'0'),c('b',100,2,'2')];s.measures[0].rhythm=[{x:100,direction:1,duration:'4'},{x:200,direction:1,duration:'8'},{x:300,direction:1,duration:'4'}];
 for(let y=90;y<=110;y++)for(let d=-1;d<=1;d++)ink[y*p.width+200+110-y+d]=1;
 attachNativeTabSymbols(ink,p.width,s);assert.equal(s.measures[0].rhythm[1].repeatPrevious,true);assert.equal(s.measures[0].rhythm[2].repeatPrevious,undefined);
});

test('connected arpeggio and barline pieces cannot become fret columns, isolated unknown digits remain candidates',()=>{
 const p=fixture(),s=p.staffs[0],ink=new Uint8Array(p.width*p.height);s.measures[0].rhythm=[{x:120,duration:'4'}];s.candidates=[c('bar',20,3,'1'),c('arp',100,3,'1'),c('real',120,3,'1'),c('orphan',250,3,'7')];
 for(let y=50;y<=150;y++)ink[y*p.width+100]=1;
 markNonFretSymbols(ink,p.width,s);assert.deepEqual(s.candidates.map(c=>!!c.nonFretSymbol),[true,true,false,false]);
 const result=resolvePage(p);assert.ok(result.staffs[0].measures[0].slots.every(slot=>slot.x!==100&&slot.x!==20));assert.ok(result.staffs[0].measures[0].slots.some(slot=>slot.x===250));
});

test('a stem beginning below a previous digit cannot become a one on the next string',()=>{
 const p=fixture(),s=p.staffs[0],ink=new Uint8Array(p.width*p.height);s.candidates=[{...c('stem',100,3,'1'),width:4,x:98,y:82,height:17}];s.measures[0].rhythm=[{x:100,duration:'8'}];
 for(let y=82;y<155;y++)for(let x=99;x<=100;x++)ink[y*p.width+x]=1;
 markNonFretSymbols(ink,p.width,s);assert.ok(s.candidates[0].nonFretSymbol);
});

test('several pale antialiasing rows above a flat seven cap are not a rounded rest bulb',()=>{
 const gray=new Uint8Array(14*20).fill(255);
 for(let y=3;y<6;y++)for(let x=3;x<11;x++)gray[y*14+x]=190;
 for(let y=6;y<8;y++)for(let x=0;x<14;x++)gray[y*14+x]=30;
 assert.equal(hasSevenCap(gray,14,20),true);
});

test('compact raster eighth hooks are not reclassified as dotted quarters by native-font rules',()=>{
 const width=350,height=320,ink=new Uint8Array(width*height),staff={nativeText:false,spacing:25,thickness:1,lines:[50,75,100,125,150,175],candidates:[],measures:[{x:30,width:290,rhythm:[]}]};
 for(let y=180;y<=235;y++)ink[y*width+100]=1;
 for(let x=101;x<=113;x++)for(let dy=0;dy<3;dy++)ink[(235-Math.floor((x-101)/6)-dy)*width+x]=1;
 staff.measures[0].rhythm=detectRhythm(ink,width,height,staff,staff.measures[0]);attachNativeTabSymbols(ink,width,staff);
 assert.equal(staff.measures[0].rhythm[0].duration,'8');assert.equal(staff.measures[0].rhythm[0].dotted,undefined);
});
