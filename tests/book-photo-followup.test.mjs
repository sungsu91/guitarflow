import test from 'node:test';
import assert from 'node:assert/strict';
import {photoPartLayout,analysisPartOptions,selectAnalysisPart} from '../src/pdf/tab-import/photoParts.js';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
import {assessBookPhoto} from '../scripts/assess-book-photo.mjs';
import {detectTabStaffs} from '../src/pdf/tab-import/geometry.js';
import {CAMERA_TAB_CONFIG} from '../src/pdf/tab-import/cameraPhotoGeometry.js';

function connectedRows(connect=true){
 const width=900,height=1000,g=12,ink=new Uint8Array(width*height),tops=[80,290,570,780];
 for(const y of tops)for(let s=0;s<6;s++)for(let x=80;x<820;x++)ink[(y+s*g)*width+x]=1;
 if(connect)for(const [top,bottom] of [[80,350],[570,840]])for(let y=top;y<=bottom;y++)ink[y*width+80]=1;
 return {width,height,ink,tracks:tops.map(top=>({center:top+30,spacing:g})),staffs:tops.map((top,i)=>({id:i+1,y:top,height:60}))};
}
test('simultaneous parts need a measured connector, not matching spacing or counts',()=>{
 for(const connect of [false,true]){
  const d=connectedRows(connect),before=d.ink.slice(),layout=photoPartLayout(d.ink,d.width,d.height,d.tracks,d.staffs);
  assert.deepEqual(d.ink,before);
  if(!connect)assert.equal(layout,null);else assert.deepEqual(layout.rows.map(r=>[r.system,r.part,r.staffId]),[[1,1,1],[1,2,2],[2,1,3],[2,2,4]]);
 }
 const d=connectedRows();for(let y=185;y<215;y++)d.ink.fill(0,y*d.width,y*d.width+d.width);
 const layout=photoPartLayout(d.ink,d.width,d.height,d.tracks,d.staffs);
 assert.equal(layout.connections.length,1,'a broken connector cannot join the first pair');
});

function analysisFixture(){
 const d=connectedRows(),partLayout=photoPartLayout(d.ink,d.width,d.height,d.tracks,d.staffs);
 const staffs=d.staffs.map((s,i)=>({...s,measures:[{x:80,y:s.y,width:740,height:60,meter:[4,4],source:{page:1,staff:s.id,pageWidth:900,pageHeight:1000},rhythmValid:true,needsReview:false,reasons:[],orphan:[],slots:[{x:200,duration:'1',confidence:.99,status:'confirmed',source:{page:1,staff:s.id},rejections:[],notes:[{string:1,fret:i+1,status:'confirmed',confidence:{fret:.99,string:.99},source:{}}]}]}]}));
 return {fileName:'fixture.jpg',sourceType:'image',pages:[{page:1,width:900,height:1000,staffs,partLayout}]};
}
test('adapter requires a part and never flattens simultaneous guitars into consecutive bars',()=>{
 const a=analysisFixture(),saved=structuredClone(a);assert.deepEqual(analysisPartOptions(a),[1,2]);
 assert.throws(()=>analysisToDocument(a),/파트/);assert.throws(()=>analysisToDocument(a,{part:3}),/파트/);
 for(const [part,frets] of [[1,[1,3]],[2,[2,4]]]){
  const doc=analysisToDocument(a,{part});
  assert.deepEqual(doc.measures.map(m=>m.events[0].notes[0].fret),frets);
  assert.equal(doc.pdfTabImport.partSelection.part,part);assert.equal(doc.pdfTabImport.sourceSystems.length,2);
  assert.equal(doc.pdfTabImport.summary.measures,2);
 }
 assert.deepEqual(a,saved);
});
test('missing upper TAB stays missing instead of relabeling the lower guitar as part one',()=>{
 const a=analysisFixture();a.pages[0].staffs.shift();a.pages[0].partLayout.rows[0].staffId=null;
 const selected=selectAnalysisPart(a,1);
 assert.deepEqual(selected.pages[0].staffs.map(s=>s.id),[3]);
 assert.deepEqual(selected.pages[0].missingPartRows,[{system:1,row:1}]);
 assert.equal(selected.summary.incompletePhotoPages[0].detected,2);
 assert.equal(selected.summary.incompletePhotoPages[0].recovered,1);
});
test('dense numeral bands cannot widen a strong six-rule projection into a different grid',()=>{
 const width=900,height=260,ink=new Uint8Array(width*height);
 for(let s=0;s<6;s++){
  for(let x=80;x<820;x++)ink[(60+s*24)*width+x]=1;
  for(let y=53+s*24;y<=67+s*24;y++)for(let x=180;x<720;x+=24)for(let dx=0;dx<10;dx++)ink[y*width+x+dx]=1;
 }
 const staves=detectTabStaffs(ink,width,height,{...CAMERA_TAB_CONFIG,minStaffWidth:.55});
 assert.equal(staves.length,1);assert.deepEqual(staves[0].lines,[60,84,108,132,156,180]);assert.equal(staves[0].thickness,1);
});
test('the accuracy audit rejects partial chords, extra columns, dots, tuplets and shifted boundaries',()=>{
 const a=analysisFixture();delete a.pages[0].partLayout;a.pages[0].staffs=a.pages[0].staffs.slice(0,1);
 const m=a.pages[0].staffs[0].measures[0],oracle={id:'independent',rowCenter:.11,part:1,bars:[{printed:1,left:80/900,right:820/900,events:[{duration:'1',notes:[[1,1],[2,3]]}]}]};
 m.slots[0].notes.push({...m.slots[0].notes[0],string:2,fret:3});
 assert.equal(assessBookPhoto(a,oracle).exactBars,1);
 for(const mutate of [m=>m.slots[0].notes.pop(),m=>m.slots[0].dotted=true,m=>m.slots[0].tuplet={normalNotes:2,actualNotes:3},m=>m.slots.unshift({...m.slots[0],duration:null,notes:[]}),m=>m.width=400]){
  const bad=structuredClone(a);mutate(bad.pages[0].staffs[0].measures[0]);assert.equal(assessBookPhoto(bad,oracle).exactBars,0);
 }
 assert.equal(assessBookPhoto(a,oracle).wholePageSuccess,false);
});
