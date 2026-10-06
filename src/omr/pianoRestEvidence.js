import {binaryPage,runs} from '../pdf/tab-import/geometry.js';

// A whole rest hangs below the second staff rule; a half rest sits above a
// rule. Require its solid block and surrounding empty ink, never bar arithmetic.
export function wholePianoRestEvidence(system,index){
 const g=system.staff.spacing,lines=system.staff.lines?.map(y=>y-system.rect.y);if(!lines)return null;
 const box=system.measures[index],w=system.width,h=system.height+(system.extensionHeight??0),rgba=new Uint8ClampedArray(w*h*4);
 rgba.set(new Uint8ClampedArray(system.rgba));if(system.extension)rgba.set(new Uint8ClampedArray(system.extension),system.width*system.height*4);
 const ink=binaryPage(rgba,w,h,180),line=lines[1],left=Math.max(0,Math.ceil(box.x-system.rect.x+g*(index?1:10))),right=Math.min(w-1,Math.floor(box.x+box.width-system.rect.x-g)),xs=[];
 const dark=(x,y)=>Boolean(ink[Math.round(y)*w+Math.round(x)]);
 for(let x=left;x<=right;x++)if([.18,.25,.32].every(dy=>dark(x,line+g*dy)))xs.push(x);
 const blocks=runs(xs).filter(xs=>xs.length>=g*.6&&xs.length<=g*1.6);
 if(blocks.length!==1)return null;
 const block=blocks[0],x0=block[0],x1=block.at(-1);let clear=0,total=0;
 for(let x=x0;x<=x1;x++)for(const dy of [-.35,-.2,.65,.8]){total++;clear+=!dark(x,line+g*dy);}
 if(clear/total<.9)return null;
 // No notehead, stem, rest, or accidental elsewhere in the musical body.
 // Ignore the header and staff/bar rules; the model must also read rests only.
 const top=Math.max(0,Math.ceil(lines[0]-g*2)),bottom=Math.min(h-1,Math.floor(lines.at(-1)+g*2));
 let extra=0;
 for(let y=top;y<=bottom;y++){
  if(lines.some(v=>Math.abs(y-v)<=Math.ceil((system.staff.thickness??1)/2)+1))continue;
  for(let x=left;x<=right;x++)if(!(x>=x0-g*.2&&x<=x1+g*.2&&y>=line-g*.1&&y<=line+g*.55)&&dark(x,y))extra++;
 }
 if(extra>g*g*.35)return null;
 return {duration:'1',x:(x0+x1)/2,width:x1-x0+1,line,method:'isolated-hanging-rest-block'};
}
