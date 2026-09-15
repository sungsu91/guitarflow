// Display placement only. Musical order, IDs, and timing are never changed.
export function measureLayout(measures, perRow = 1, breaks = []) {
 const count=Math.max(1,Math.min(4,Number(perRow)||1)), forced=new Set(breaks), rows=[];
 for(const measure of measures){
  if(!rows.length||rows.at(-1).length===count||forced.has(measure.id))rows.push([]);
  rows.at(-1).push(measure.id);
 }
 return rows.flatMap((row,index)=>row.map((id,column)=>({id,row:index+1,column:column*(12/row.length)+1,span:12/row.length})));
}
