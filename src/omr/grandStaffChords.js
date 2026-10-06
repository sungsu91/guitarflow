// In a vocal + piano system the common chord row is often above the vocal.
// Require the same complete physical bar grid before sharing that row. Mere
// vertical proximity, or a different instrumental part, is insufficient.
export function grandStaffChordRegions(systems,selected,regions){
 return selected.filter((_,i)=>i%2===0).flatMap(upper=>{
  const own=regions.find(r=>r.staff===upper.id);if(!own)return [];
  const index=systems.findIndex(s=>s.id===upper.id),above=systems[index-1],g=upper.staff.spacing;
  const shared=above&&!above.connectedStaffIds?.length&&upper.connectedStaffIds?.length===1&&above.measures.length===upper.measures.length&&above.measures.every((m,i)=>Math.abs(m.x-upper.measures[i].x)<g*1.2&&Math.abs(m.x+m.width-upper.measures[i].x-upper.measures[i].width)<g*1.2);
  const row=shared?regions.find(r=>r.staff===above.id):null;
  if(own.words.length||!row?.words.length)return [own];
  return [{...row,staff:upper.id,sourceStaff:row.staff,triplets:own.triplets??[],measures:upper.measures,sharedSystemHarmony:true}];
 });
}
