import test from 'node:test';
import assert from 'node:assert/strict';
import {findImageTuplets} from '../src/pdf/tab-import/imageTuplets.js';

for(const count of [3,6])for(const direction of [-1,1])test(`printed ${count} bracket outside ${direction>0?'down':'up'} stems retains its actual group`,()=>{
 const width=420,height=320,g=20,ink=new Uint8Array(width*height),rgba=new Uint8Array(width*height*4).fill(255);
 const paint=(x,y)=>{ink[y*width+x]=1;rgba.set([0,0,0,255],(y*width+x)*4);};
 const xs=Array.from({length:count},(_,i)=>80+i*40),center=(xs[0]+xs.at(-1))/2;
 const staff={id:1,spacing:g,measures:[{rhythm:xs.map(x=>({x,y:160,direction,duration:'4',beamCount:0}))}]};
 for(let y=170;y<=185;y++)for(let x=center-4;x<=center+5;x++)paint(x,160+direction*(y-160));
 for(const [x,sign] of [[xs[0]-10,1],[xs.at(-1)+10,-1]]){
  for(let y=173;y<=179;y++)paint(x,160+direction*(y-160));
  for(let dx=0;dx<=15;dx++)paint(x+sign*dx,160+direction*19);
 }
 const found=findImageTuplets(rgba,ink,width,height,staff);
 assert.equal(found.length,1);assert.equal(found[0].count,count);assert.deepEqual(found[0].stems,xs);
 for(let y=0;y<height;y++)for(let x=xs.at(-1)+7;x<=xs.at(-1)+13;x++)ink[y*width+x]=0;
 assert.equal(findImageTuplets(rgba,ink,width,height,staff).length,0,'a label with only one bracket end cannot invent a tuplet');
});
