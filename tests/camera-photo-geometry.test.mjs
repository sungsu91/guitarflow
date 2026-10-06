import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePhotoPaper,photoStaffTracks,rectifyPhotoStaffs,faintStaffRulePixels} from '../src/pdf/tab-import/cameraPhotoGeometry.js';
import {binaryPage,detectStaffs,detectRhythm,recoverFaintRulePixels} from '../src/pdf/tab-import/geometry.js';

// Generated ruled staves, independent of any user's score or file name.
function photographedStaff(count=6,{length=760,noise=false}={}){
  const width=900,height=440,rgba=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const paper=190+40*x/width,curve=.045*(x-width/2)+.00002*(x-width/2)**2;
    const line=!noise&&x>60&&x<60+length&&Array.from({length:count},(_,i)=>145+20*i+curve).some(s=>Math.abs(y-s)<1.5);
    const gray=noise?((x*749+y*127)%31+paper-15):line?paper-40:paper;
    rgba.set([gray,gray,gray,255],(y*width+x)*4);
  }
  return {rgba,width,height};
}

test('shadowed curved TAB grids are recovered without changing the input pixels',()=>{
  const {rgba,width,height}=photographedStaff(),before=rgba.slice();
  assert.equal(detectStaffs(binaryPage(rgba,width,height,230),width,height).length,0);
  const normalized=normalizePhotoPaper(rgba,width,height),tracks=photoStaffTracks(normalized,width,height);
  assert.equal(tracks.length,1);assert.deepEqual(rgba,before);
  const corrected=rectifyPhotoStaffs(normalized,width,height,tracks);
  assert.equal(corrected.length,rgba.length);
  assert.equal(detectStaffs(binaryPage(corrected,width,height,230),width,height).length,1);
});

test('camera recovery refuses five/seven-line staves, short chord grids and textured paper',()=>{
  for(const [count,options] of [[5,{}],[7,{}],[6,{length:130}],[6,{noise:true}]]){
    const {rgba,width,height}=photographedStaff(count,options);
    assert.equal(photoStaffTracks(normalizePhotoPaper(rgba,width,height),width,height).length,0);
  }
});

test('a faded internal sixth rule is recovered from pixels, without inventing a line or changing notes',()=>{
 const width=900,height=280;
 const make=(count,faintIndex,length=780)=>{
  const rgba=new Uint8ClampedArray(width*height*4).fill(255);
  for(let line=0;line<count;line++)for(let x=60;x<840;x++){
    if(line===faintIndex&&x>=60+length)continue;
    const p=((70+line*20)*width+x)*4;for(let ch=0;ch<3;ch++)rgba[p+ch]=line===faintIndex?252:160;
  }
  return rgba;
 };
 const rgba=make(6,2),before=rgba.slice(),strong=binaryPage(rgba,width,height,230),faint=faintStaffRulePixels(rgba,width,height);
 assert.equal(detectStaffs(strong,width,height).length,0);
 const recovered=recoverFaintRulePixels(strong,faint,width,height);assert(recovered);
 assert.equal(detectStaffs(recovered,width,height).length,1);assert.deepEqual(rgba,before);
 for(const [count,index,length] of [[5,-1,780],[7,2,780],[6,0,780],[6,5,780],[6,2,100],[6,2,0]]){
  const negative=make(count,index,length);assert.equal(recoverFaintRulePixels(binaryPage(negative,width,height,230),faintStaffRulePixels(negative,width,height),width,height),null,`${count} lines, faded ${index}, length ${length}`);
 }
});

test('detached photographed eighth/sixteenth beams require ink evidence and explicit opt-in',()=>{
  const width=500,height=280,ink=new Uint8Array(width*height),g=20;
  const staff={y:140,height:100,spacing:g,lines:[140,160,180,200,220,240]},measure={x:50,width:250};
  for(const x of [100,140,200,240])for(let y=86;y<=120;y++)for(let dx=0;dx<2;dx++)ink[y*width+x+dx]=1;
  for(const [left,right,count] of [[100,140,1],[200,240,2]])for(let beam=0;beam<count;beam++)for(let y=86+beam*8;y<89+beam*8;y++)for(let x=left;x<=right;x++)ink[y*width+x]=1;
  const anchors=[100,140,200,240].map(cx=>({cx}));
  assert.equal(detectRhythm(ink,width,height,staff,measure,anchors,ink).length,0);
  assert.deepEqual(detectRhythm(ink,width,height,staff,measure,anchors,ink,{detached:true}).map(r=>r.duration),['8','8','16','16']);
  const fused=ink.slice();for(let y=86;y<99;y++)for(let x=100;x<=140;x++)fused[y*width+x]=1;
  assert(detectRhythm(fused,width,height,staff,measure,anchors,fused,{detached:true}).slice(0,2).every(r=>r.duration===null),'an unreadable merged beam must not become a guessed quarter/eighth');
  assert.equal(detectRhythm(new Uint8Array(ink.length),width,height,staff,measure,anchors,ink,{detached:true}).length,0);
});
