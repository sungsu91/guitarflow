// Rest contours only: never infer duration from the remaining beats in a bar.
export function classifyQuarterRest(points,width,height,spacing){
 if(width<spacing*.35||width>spacing*1.1||height<spacing*1.5||height>spacing*3.4)return null;
 const rows=Array.from({length:height},()=>[]);
 for(const p of points)rows[p.y]?.push(p.x);
 const sections=Array.from({length:10},(_,i)=>{
  const part=rows.slice(Math.floor(height*i/10),Math.floor(height*(i+1)/10)).filter(r=>r.length);
  if(!part.length)return null;
  const mean=f=>part.reduce((s,r)=>s+f(r),0)/part.length;
  return {left:mean(r=>Math.min(...r)),right:mean(r=>Math.max(...r)),ink:mean(r=>r.length)};
 });
 const [head,,upper,,waist,,lower,hook,tail]=sections;
 if(!head||!upper||!waist||!lower||!hook||!tail)return null;
 // The lightning-shaped upper stroke expands right, returns left, then
 // expands into a lower curl. Hooked 8th/16th/32nd rests have a straight spine.
 if(upper.right-head.right<width*.24||upper.right-waist.right<width*.12||hook.right-waist.right<width*.12||hook.right-tail.right<width*.24)return null;
 if(head.ink>width*.4||upper.ink<width*.32||hook.ink<width*.4||tail.left>width*.28)return null;
 return '4';
}

export function classifyBlockRest(points,width,height,spacing,y,lines,thickness){
 if(width<spacing*.5||width>spacing*1.25||height<spacing*.15||height>spacing*.48||points.length/(width*height)<.88)return null;
 const near=Math.max(3,thickness+2);
 // Only a solid rectangle abutting an interior rule is a whole/half rest.
 for(const line of lines.slice(1,-1)){
  if(Math.abs(y+height-line)<=near)return '2';
  if(Math.abs(y-line)<=near)return '1';
 }
 return null;
}
