// Editing one printed symbol must preserve the other changes in the bar.
export function setMeasureHarmony(measure,name,onset=0,previousOnset=onset){
 const changes=(measure.harmonyChanges??(measure.harmony?[{onset:0,name:measure.harmony}]:[])).filter(c=>c.onset!==previousOnset&&c.onset!==onset);
 if(name)changes.push({name,onset});
 changes.sort((a,b)=>a.onset-b.onset);
 return {...measure,chord:null,chordNameMode:'manual',harmony:changes.find(c=>c.onset===0)?.name??null,harmonyChanges:changes.length?changes:undefined,harmonyReview:undefined};
}
