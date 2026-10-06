import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePianoTokens} from '../src/omr/pianoPolyphony.js';
import {attachPianoTieEvidence} from '../src/omr/pianoTieEvidence.js';
import {staffSystemToAnalysis} from '../src/omr/staffTokens.js';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
import {compileDocumentV2} from '../src/etudes/scoreModel.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {arrangeGuitar} from '../src/etudes/arrangement/arrangeGuitar.js';
import {gripFeasible} from '../src/etudes/arrangement/voicing.js';

function fixture(arcs){
 const width=900,height=180,g=20,lines=[40,60,80,100,120],rgba=new Uint8ClampedArray(width*height*4).fill(255);
 const dot=(x,y)=>{if(x>=0&&x<width&&y>=0&&y<height)rgba.set([0,0,0,255],(y*width+x)*4);};
 lines.forEach(y=>{for(let x=0;x<width;x++)dot(x,y);});
 const head=(x,y,whole)=>{for(let dy=-14;dy<=14;dy++)for(let dx=-21;dx<=21;dx++){
  const d=(dx/(g*(whole?.7:.55)))**2+((dy+(whole?0:dx*.3))/(g*.35))**2;
  if(d>.6&&d<1.4)dot(x+dx,y+dy);
 }};
 head(340,100,true);head(500,100,true);head(500,120,false);head(720,120,false);
 const tie=(a,b,y,side)=>{for(let x=a+8;x<=b-8;x++){const u=(x-a-8)/(b-a-16),yy=Math.round(y+side*g*(.4+.7*4*u*(1-u)));for(let dy=-1;dy<=1;dy++)dot(x,yy+dy);}};
 if(arcs){tie(340,500,100,-1);tie(500,720,120,1);}
 const system={id:1,width,height,rgba:rgba.buffer,rect:{x:0,y:0,width,height},staff:{x:0,y:40,height:80,spacing:g,lines,thickness:1},measures:[{x:0,y:40,width:440,height:80},{x:440,y:40,width:460,height:80}]};
 const parsed=parsePianoTokens('clef-G2+note-G4_whole+barline+note-E4_half|note-G4_whole+note-E4_half+barline',{meter:[4,4],key:'C'});
 return {system,parsed};
}

test('only visible written-head arcs extend independent voices within and across bars',()=>{
 for(const arcs of [false,true]){
  const {system,parsed}=fixture(arcs),result=attachPianoTieEvidence(system,parsed);
  assert.deepEqual(result.measures[1].events[0].pianoTiePitchesFromPreviousBar,arcs?[67]:undefined);
  assert.deepEqual(result.measures[1].events[1].pianoTiePitchesFromPrevious,arcs?[67,64]:[67]);
  assert.equal(parsed.measures[1].events[0].pianoTiePitchesFromPreviousBar,undefined,'source reading stays unchanged');
  if(arcs){
   const without=attachPianoTieEvidence(fixture(false).system,result);
   assert.equal(without.measures[1].events[0].pianoTiePitchesFromPreviousBar,undefined);
   assert.deepEqual(without.measures[1].events[1].pianoTiePitchesFromPrevious,[67],'rechecking removes old image-only ties, retaining written durations');
  }
 }
});

test('partial chord ties survive score conversion and preserve exact sounding releases',()=>{
 const {system,parsed}=fixture(true),result=attachPianoTieEvidence(system,parsed);
 const withSilentLeft={...result,measures:result.measures.map(b=>({...b,events:[...b.events.map(e=>({...e,voice:'right'})),{index:-1,raw:'rest-whole',duration:'1',rest:true,notes:[],voice:'left'}]}))};
 const target={instrument:'piano',notationPitch:'concert'},staff=staffSystemToAnalysis(withSilentLeft,{system,page:1,width:900,height:180,target,octaveShift:0}).staff;
 const analysis={fileName:'polyphonic-ties',target,pages:[{page:1,notation:true,staffs:[staff]}],summary:{}};
 const doc=analysisToDocument(analysis),compiled=compileDocumentV2(doc);assert.deepEqual(compiled.errors,[]);
 assert.deepEqual(scoreTimeline(compiled.score,60).events.map(n=>[n.midi,n.start,n.duration]),[[67,0,8],[64,4,4]]);
 const arranged=arrangeGuitar(doc).document,guitar=compileDocumentV2(arranged);assert.deepEqual(guitar.errors,[]);assert.deepEqual(arranged.guitarArrangement.sourceDocument,doc);
 const played=scoreTimeline(guitar.score,60).events;
 assert.deepEqual(played.filter(n=>n.voice==='melody').map(n=>[n.midi,n.start,n.duration]),[[67,0,8]]);
 for(const t of [0,4])assert(gripFeasible(played.filter(n=>n.start<=t&&n.start+n.duration>t)));
 const broken=structuredClone(analysis);broken.pages[0].staffs[0].measures[1].slots[0].pianoTiePitchesFromPreviousBar=[66];
 assert.throws(()=>analysisToDocument(broken),/지속음 높이/);
});
