// Performance offsets only: the written rhythm and the chord's end stay fixed.
export function rolledChordAttack(size,index,duration){
 const intervals=[1.08,1,.92,.86,.8],step=Math.min(.024,duration/(Math.max(1,size)*3));
 const delay=Array.from({length:index},(_,i)=>intervals[i]??.8).reduce((sum,value)=>sum+value,0)*step;
 return {size,delay,velocity:[.9,.84,.87,.82,.85,.8][index]??.84,attackSeconds:.009+index*.0004};
}

// A left-hand finger supplies fresh string energy at H/P. Split only at those
// attacks; ties, bends and slides keep their continuous source and expression.
export function guitarFingerParts(phrase){
 const segments=phrase.segments??[],starts=[0];
 for(let i=1;i<segments.length;i++)if(['H','P'].includes(segments[i].connection))starts.push(i);
 if(starts.length===1)return [phrase];
 return starts.map((from,index)=>{
  const first=segments[from],end=segments[starts[index+1]]?.start??phrase.start+phrase.duration;
  return {...phrase,...first,duration:end-first.start,segments:segments.slice(from,starts[index+1]).map((s,i)=>i?s:{...s,connection:null}),fingerAttack:index?first.connection:null};
 });
}
