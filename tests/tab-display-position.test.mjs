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
   const render=position=>{const svg=node();drawTabRhythm(svg,events,[{getStemX:()=>50}],tab,[],position);return svg.children[0];};
   const below=render(),above=render('above');
   assert.equal(below.dataset.beamY,100+(strings-1)*13+36);
   assert.equal(above.dataset.beamY,64);
   assert.equal(below.children[0].attributes.y1,100+(strings-1)*13+9);
   assert.equal(above.children[0].attributes.y1,91);
   assert.equal(above.children[1].attributes.y2,67);
  }
 }finally{globalThis.document=original;}
});

test('saved TAB presentation settings preserve note data and playback',()=>{
 const source=enterFretWithDuration(createBlankDocument(),{bar:0,event:0,string:6},2,'8');
 const timeline=scoreTimeline(compileDocumentV2(source).score);
 for(const tabRhythm of [true,false]){
  const settings={tabRhythm,tabBeamPosition:'above',tabPickingPosition:'above'};
  const loaded=JSON.parse(JSON.stringify({...source,viewSettings:settings}));
  const {score}=compileDocumentV2(loaded);
  assert.deepEqual(score.document.viewSettings,settings);
  assert.deepEqual(loaded.measures,source.measures);
  assert.deepEqual(scoreTimeline(score),timeline);
 }
 assert.deepEqual(createBlankDocument().viewSettings,{tabRhythm:true,notationView:'tab'});
});
