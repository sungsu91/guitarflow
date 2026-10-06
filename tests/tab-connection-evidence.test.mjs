import test from 'node:test';
import assert from 'node:assert/strict';
import {slideStroke,markSlideParts,tabArc,attachHarmonicTies,resolveTabConnections} from '../src/pdf/tab-import/imageTabConnections.js';
import {resolvePage} from '../src/pdf/tab-import/recognition.js';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
import {compileDocumentV2} from '../src/etudes/scoreModel.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {hasUppercasePShape,agreeConnectionLabel} from '../src/pdf/tab-import/tabLabelEvidence.js';

const width=600,height=280;
const staff=()=>({id:1,x:20,y:70,width:560,height:100,spacing:20,thickness:2,lines:[70,90,110,130,150,170],bars:[20,580],candidates:[],measures:[]});
const plot=(ink,x,y)=>{for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)ink[(Math.round(y)+dy)*width+Math.round(x)+dx]=1;};
const note=(string,fret)=>({string,fret,status:'confirmed',confidence:{fret:1,string:1},source:{},reasons:[]});
const slot=(x,string,fret)=>({x,duration:'4',confidence:1,notes:[note(string,fret)],rejections:[]});

test('one strong P reading needs an independent upper loop and stem, never a conflicting letter or an R leg',()=>{
 const rows=['#########','#########','##.....##','##.....##','##.....##','##.....##','#########','#########','##.......','##.......','##.......','##.......','##.......','####.....'];
 const glyph=rs=>({width:rs[0].length,height:rs.length,grayscale:Uint8Array.from(rs.join(''),c=>c==='#'?0:255)}),p=glyph(rows),reads=[{text:'P',confidence:.97},{text:'P',confidence:.91}];
 assert.equal(hasUppercasePShape(p),true);assert.equal(agreeConnectionLabel(reads,p).agrees,true);
 assert.equal(agreeConnectionLabel([{text:'P',confidence:.94},{text:'P',confidence:.91}],p).agrees,false);
 assert.equal(agreeConnectionLabel([...reads,{text:'R',confidence:.9}],p).agrees,false);
 for(const r of [rows.map((row,i)=>i>7&&i<12?'##....###':row),rows.map((row,i)=>i===2?'##.......':row)]){assert.equal(hasUppercasePShape(glyph(r)),false);assert.equal(agreeConnectionLabel(reads,glyph(r)).agrees,false);}
});

test('only a thin diagonal between two independent same-string anchors is removed from digit grouping',()=>{
 const s=staff(),ink=new Uint8Array(width*height),p={x:109,y:125,width:13,height:11,cx:115,cy:130,string:4,stringDistance:0};
 for(let y=125;y<=135;y++)for(let dx=0;dx<2;dx++)ink[y*width+109+(135-y)+dx]=1;
 const a={x:97,y:122,width:6,height:16,cx:100,string:4},b={x:127,y:122,width:6,height:16,cx:130,string:4};
 s.measures=[{x:20,width:560,rhythm:[{x:100},{x:130}]}];
 assert.equal(slideStroke(ink,width,s,p),'up');
 for(const parts of [[p,a],[p,{...a,string:3},b],[p,a,b]]){
  const copy=structuredClone(parts),st=structuredClone(s);markSlideParts(ink,width,st,copy);
  assert.equal(copy[0].nonFretSymbol,parts.length===3&&parts[1].string===4?'slide-connector':undefined);
 }
 const numeral=new Uint8Array(width*height);for(let y=125;y<=135;y++)for(let dx=0;dx<2;dx++)numeral[y*width+109+(135-y)+dx]=1;
 for(let x=109;x<122;x++)for(let y=125;y<128;y++)numeral[y*width+x]=1;
 assert.equal(slideStroke(numeral,width,s,p),null,'a 7 cap is not a slide');
});

test('a curved connection requires both ends and a smooth bow, never a flat line or random fragments',()=>{
 const s=staff(),ink=new Uint8Array(width*height);
 for(let x=100;x<=140;x++)plot(ink,x,48+9*((x-120)/20)**2);
 assert.equal(tabArc(ink,width,height,s,100,140,1)?.side,-1);
 for(const kind of ['flat','half']){
  const pixels=new Uint8Array(width*height);for(let x=100;x<=(kind==='half'?118:140);x++)plot(pixels,x,kind==='flat'?50:48+9*((x-120)/20)**2);
  assert.equal(tabArc(pixels,width,height,s,100,140,1),null);
 }
});

test('H-P-P uses label agreement, same string, and fret direction; a slur alone cannot invent a technique',()=>{
 const slots=[slot(60,1,0),slot(90,1,5),slot(120,1,3),slot(150,1,0)];
 for(let i=0;i<3;i++){slots[i].connectionArc={toX:slots[i+1].x};slots[i].connectionLabelReading={agrees:true,text:i?'P':'H'};}
 resolveTabConnections(slots,staff());assert.deepEqual(slots.map(s=>s.technique),['H','P','P',undefined]);
 for(const change of [a=>delete a[0].connectionLabelReading,a=>a[0].connectionLabelReading.text='P',a=>a[1].notes[0].string=2,a=>a[1].notes[0].dead=true,a=>a[1].notes[0].status='unresolved',a=>a[0].rejections.push({})]){
  const pair=structuredClone(slots.slice(0,2));delete pair[0].technique;change(pair);resolveTabConnections(pair,staff());assert.equal(pair[0].technique,undefined);
 }
});

test('slide direction and optional slur remain separate; inconsistent pitch evidence rejects the slide',()=>{
 const pair=[slot(100,3,2),slot(140,3,4)];pair[0].connections=[{kind:'slide',direction:'up',string:3,toX:140}];
 resolveTabConnections(pair,staff());assert.equal(pair[0].technique,'S');assert.equal(pair[0].slurToNext,undefined);
 pair[0].connectionArc={toX:140};resolveTabConnections(pair,staff());assert.equal(pair[0].slurToNext,true);
 pair[0].connections[0].direction='down';delete pair[0].technique;resolveTabConnections(pair,staff());assert.equal(pair[0].technique,undefined);
});

function harmonicAnalysis({missingArc=false,conflict=false}={}){
 const s=staff(),ink=new Uint8Array(width*height),rhythm=[{x:100,duration:'4',confidence:1},{x:220,duration:'4',confidence:1},{x:340,duration:'2',confidence:1,rest:true}];
 s.measures=[{x:20,y:70,width:560,height:100,boundariesKnown:true,rhythm}];
 s.candidates=[1,2,3].map(string=>({id:`n${string}`,x:95,y:s.lines[string-1]-8,width:10,height:16,cx:100,string,stringDistance:0,parts:1,harmonic:true,ocr:{text:'5',confidence:1,agrees:true}}));
 for(const string of missingArc?[1,2]:[1,2,3])for(let x=128;x<=194;x++)plot(ink,x,s.lines[string-1]-11+9*((x-161)/33)**2);
 attachHarmonicTies(ink,width,height,s);
 if(conflict)s.candidates.push({id:'conflict',x:215,y:62,width:10,height:16,cx:220,string:1,stringDistance:0,parts:1,ocr:{text:'?',confidence:0,agrees:false}});
 return {fileName:'independent-fixture.pdf',pages:[resolvePage({page:1,width,height,staffs:[s]})],summary:{}};
}

test('parallel harmonic ties require one visible curve per string and no conflicting destination digit; playback sustains',()=>{
 const a=harmonicAnalysis(),m=a.pages[0].staffs[0].measures[0];assert.equal(m.slots[1].tieFromPrevious,true);assert.equal(m.rhythmValid,true);
 const doc=analysisToDocument(a),compiled=compileDocumentV2(doc);assert.deepEqual(compiled.errors,[]);assert.equal(doc.measures[0].events[0].tieTo,doc.measures[0].events[1].id);
 const played=scoreTimeline(compiled.score).events.filter(e=>!e.rest);assert.equal(played.length,3);assert.deepEqual(played.map(e=>e.midi).sort((a,b)=>a-b),[79,83,88]);
 for(const options of [{missingArc:true},{conflict:true}])assert.equal(harmonicAnalysis(options).pages[0].staffs[0].measures[0].slots[1].tieFromPrevious,undefined);
});
