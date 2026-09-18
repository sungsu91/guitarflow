// Page boundaries are engraved system boundaries, never a fixed bar count.
export function followPageStart(rows,index,height){
 let start=0;
 while(start<rows.length){let end=start+1;while(end<rows.length&&rows[end].bottom-rows[start].top<=height+1)end++;if(index<end)return start;start=end;}
 return Math.max(0,rows.length-1);
}
export function followScrollTarget(rows,index,height,mode,maxScroll){
 const start=mode==='page'?followPageStart(rows,index,height):index;
 return Math.max(0,Math.min(maxScroll,rows[start]?.top??0));
}
