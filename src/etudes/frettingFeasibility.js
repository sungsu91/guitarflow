// Minimum fingers for a fixed grip, permitting partial barres. A sounding open
// or lower-fret note between two stops prevents one finger from bridging them.
// This is a necessary playability check, not a model of an individual hand.
export function minimumFrettingFingers(notes){
 const sounding=notes.filter(n=>!n.unplaced&&Number.isInteger(n.string)&&Number.isInteger(n.fret));
 let fingers=0;
 for(const fret of new Set(sounding.filter(n=>n.fret>0).map(n=>n.fret))){
  const stops=sounding.filter(n=>n.fret===fret).sort((a,b)=>a.string-b.string);
  fingers++;
  for(let i=1;i<stops.length;i++)if(sounding.some(n=>n.string>stops[i-1].string&&n.string<stops[i].string&&n.fret<fret))fingers++;
 }
 return fingers;
}
