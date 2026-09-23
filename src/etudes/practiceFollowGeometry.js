// Page boundaries are engraved system boundaries, never a fixed bar count.
export function followPageStart(rows,index,height){
 let start=0;
 while(start<rows.length){let end=start+1;while(end<rows.length&&rows[end].bottom-rows[start].top<=height+1)end++;if(index<end)return start;start=end;}
 return Math.max(0,rows.length-1);
}
export function followScrollTarget(rows,index,height,mode,maxScroll){
 const start=mode==='page'?followPageStart(rows,index,height):index;
 // Keep the title and the first system's annotations visible at the beginning.
 if(start===0)return 0;
 return Math.max(0,Math.min(maxScroll,rows[start]?.top??0));
}

// Leave room ahead of the moving beat while keeping manual horizontal browsing
// untouched whenever following is suspended or disabled by the caller.
export function followHorizontalTarget(cursor,width,left,maxScroll,reset=false,lookAhead=false){
 const start=width*.2,end=width*(lookAhead ? .35 : .75);
 const visible=cursor-left;
 const target=reset?cursor-start:visible>end?cursor-end:visible<start?cursor-start:left;
 return Math.max(0,Math.min(maxScroll,target));
}

// Fingering mode changes only when the written rhythm advances to another
// event. Keep that event at a stable reading point instead of chasing the
// continuously moving playhead.
export function followFingeringTarget(cursor,width,maxScroll){
 return Math.max(0,Math.min(maxScroll,cursor-width*.42));
}

