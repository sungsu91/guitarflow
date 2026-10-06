import {detectPaperQuad,warpPaperPixels,enhancePaperPixels} from './paperScanGeometry.js';
self.onmessage=({data:{action,data,width,height,scan}})=>{
 try{
  if(action==='detect'){
   const result=detectPaperQuad(data,width,height),levels=[];
   for(let y=Math.floor(height*.15);y<height*.85;y+=5)for(let x=Math.floor(width*.2);x<width*.8;x+=5){const i=(y*width+x)*4;levels.push(data[i]*.299+data[i+1]*.587+data[i+2]*.114);}
   levels.sort((a,b)=>a-b);
   const dark=(levels[Math.floor(levels.length*.85)]??255)<225;
   self.postMessage({...result,enabled:result.detected||dark,enhance:dark,version:1});
  }else{
   const result=warpPaperPixels(data,width,height,scan.quad);
   if(scan.enhance)result.data=enhancePaperPixels(result.data,result.width,result.height);
   self.postMessage(result,[result.data.buffer]);
  }
 }catch(e){self.postMessage({error:e.message});}
};
