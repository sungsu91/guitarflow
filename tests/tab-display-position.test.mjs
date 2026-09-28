import test from 'node:test';
import assert from 'node:assert/strict';
import {drawTabRhythm} from '../src/etudes/tabRhythm.js';
import {createBlankDocument,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {enterFretWithDuration} from '../src/etudes/editorCommands.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';

test('TAB beams mirror around the staff and retain the existing below default',()=>{
 const original=globalThis.document;
 const node=()=>({dataset:{},attributes:{},children:[],setAttribute(k,v){this.attributes[k]=v;},append(child){this.children.push(child);}});
 globalThis.document={createElementNS:node};
 try{
  for(const strings of [4,6]){
   const tab={getYForLine:i=>100+i*13,getNumLines:()=>strings};
   const events=[{duration:'8',string:strings,tones:[{string:1},{string:strings}]}];
   const render=(position,options)=>{const svg=node();drawTabRhythm(svg,events,[{getStemX:()=>50}],tab,[],position,options);return svg.children[0];};
   const below=render(),above=render('above'),detached=render('detached'),shortAbove=render('above',{shortStems:true});
   assert.equal(below.dataset.beamY,100+(strings-1)*13+36);
   assert.equal(above.dataset.beamY,64);
   const part=(group,kind)=>group.children.find(n=>n.attributes.class===kind).attributes;
   assert.equal(part(below,'tabRhythmStem').y1,100+(strings-1)*13+9);
   assert.equal(part(above,'tabRhythmStem').y1,91);
   assert.equal(part(above,'tabRhythmFlag').y2,67);
   assert.equal(part(shortAbove,'tabRhythmStem').y1,92);
   assert.equal(part(shortAbove,'tabRhythmStem').y2,72);
   assert.equal(part(detached,'tabRhythmStem').y1,Number(detached.dataset.beamY)-20);
   assert.ok(part(detached,'tabRhythmStem').y1>tab.getYForLine(strings-1));
   for(const group of [below,above,detached]){
    assert.equal(group.children.some(n=>n.attributes.class==='tabRhythmChordStem'),false);
    assert.ok(part(group,'tabRhythmStem'));
    assert.ok(part(group,'tabRhythmFlag'));
   }
  }
 }finally{globalThis.document=original;}
});

test('saved TAB presentation settings preserve note data and playback',()=>{
 const source=enterFretWithDuration(createBlankDocument(),{bar:0,event:0,string:6},2,'8');
 const timeline=scoreTimeline(compileDocumentV2(source).score);
 for(const tabRhythm of [true,false])for(const tabBeamPosition of ['above','detached']){
  const settings={tabRhythm,tabBeamPosition,tabPickingPosition:'above'};
  const loaded=JSON.parse(JSON.stringify({...source,viewSettings:settings}));
  const {score}=compileDocumentV2(loaded);
  assert.deepEqual(score.document.viewSettings,settings);
  assert.deepEqual(loaded.measures,source.measures);
  assert.deepEqual(scoreTimeline(score),timeline);
 }
 assert.deepEqual(createBlankDocument().viewSettings,{tabRhythm:true,notationView:'tab'});
});

test('TAB distinguishes half notes with short stems and whole notes without floating heads',()=>{
 const original=globalThis.document;
 const node=tag=>({tag,dataset:{},attributes:{},children:[],setAttribute(k,v){this.attributes[k]=v;},append(child){this.children.push(child);}});
 globalThis.document={createElementNS:(_ns,tag)=>node(tag)};
 try{
  const tab={getYForLine:i=>100+i*16,getNumLines:()=>6};
  for(const position of ['above','below','detached'])for(const shortStems of [false,true]){
   const events=['4','2','1'].map(duration=>({duration,string:position==='above'?1:6}));
   const before=structuredClone(events),svg=node('svg');
   drawTabRhythm(svg,events,events.map((_,i)=>({getStemX:()=>50+i*60})),tab,[],position,{shortStems});
   const marks=svg.children[0].children,stems=marks.filter(n=>n.attributes.class==='tabRhythmStem');
   assert.equal(stems.length,2,'whole notes have no stem');
   assert.equal(marks.some(n=>n.tag==='ellipse'),false,'fret digits already provide the notehead');
   const length=n=>Math.abs(n.attributes.y2-n.attributes.y1);
   assert(length(stems[1])<length(stems[0])*.65,'half-note stems are visibly shorter than quarter-note stems');
   assert.deepEqual(events,before,'engraving cannot alter timing or playback data');
  }
 }finally{globalThis.document=original;}
});
