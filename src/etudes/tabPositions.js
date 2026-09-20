// One unresolved marker per event avoids overlapping a chord's missing frets.
// This affects engraving only; every sounding pitch remains in the score data.
export function tabPositions(event,stringCount){
 const tones=event.tones??[event];
 const positions=tones.filter(t=>!t.unplaced).map(t=>({str:t.string,fret:(t.dead??event.dead)?'X':t.harmonic?`<${t.fret}>`:t.fret}));
 if(tones.some(t=>t.unplaced)){
  const free=Array.from({length:stringCount},(_,i)=>i+1).filter(str=>!positions.some(p=>p.str===str));
  const middle=(stringCount+1)/2;
  free.sort((a,b)=>Math.abs(a-middle)-Math.abs(b-middle));
  if(free.length)positions.push({str:free[0],fret:'?'});
  else positions[0]={...positions[0],fret:`${positions[0].fret}?`};
 }
 return positions;
}
