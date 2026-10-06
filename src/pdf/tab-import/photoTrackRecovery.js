// Partial recovery is allowed only when the normal reader found no TAB at all.
// Every recovered staff must match exactly one measured curve, and vice versa.
export function partialPhotoTrackRecovery(existing, recovered, tracks){
  if(existing.length||!recovered.length||recovered.length>=tracks.length)return null;
  const matched=new Set();
  for(const staff of recovered){
    const matches=tracks.flatMap((track,index)=>Math.abs(staff.y+staff.height/2-track.center)<track.spacing*.5?[index]:[]);
    if(matches.length!==1||matched.has(matches[0]))return null;
    matched.add(matches[0]);
  }
  return {detected:tracks.length,recovered:recovered.length,missing:tracks.flatMap((track,index)=>matched.has(index)?[]:[{track:index+1,center:track.center,spacing:track.spacing}])};
}
