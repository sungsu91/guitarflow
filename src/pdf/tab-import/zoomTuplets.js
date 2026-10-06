// Fret consensus and rhythm evidence are independent. A clearer tuplet label
// must not require replacing an entire bar (and losing its better fret crops).
export function corroborateZoomTuplets(target,source,tolerance){
 if(!target.boundariesKnown||!source.boundariesKnown||target.rhythm.length!==source.rhythm.length)return 0;
 const groups=new Map();
 for(const r of source.rhythm)if(r.tuplet)(groups.get(r.tuplet.groupId)??groups.set(r.tuplet.groupId,[]).get(r.tuplet.groupId)).push(r);
 let added=0;
 for(const rows of groups.values()){
  const tuple=rows[0].tuplet;
  if(![3,6].includes(tuple.actualNotes)||rows.length!==tuple.actualNotes||rows.some(r=>r.tupletEvidence?.confidence<.95||!r.tupletEvidence||r.confidence<.95))continue;
  const matches=rows.map(r=>target.rhythm.filter(q=>Math.abs((q.x-target.x)/target.width-(r.x-source.x)/source.width)<tolerance));
  if(matches.some(a=>a.length!==1)||new Set(matches.flat()).size!==rows.length)continue;
  const found=matches.flat();
  if(found.some((q,i)=>q.duration!==rows[i].duration||!!q.dotted!==!!rows[i].dotted||!!q.rest!==!!rows[i].rest||q.tuplet&&(q.tuplet.actualNotes!==tuple.actualNotes||q.tuplet.normalNotes!==tuple.normalNotes)))continue;
  if(found.some(q=>q.tuplet))continue;
  const groupId=`zoom-tuplet-${target.x}-${found[0].x}`;
  for(const q of found){q.tuplet={...tuple,groupId};q.tupletEvidence={...rows[0].tupletEvidence,method:'matched-zoom-tuplet'};added++;}
 }
 return added;
}
