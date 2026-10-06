// Align insertions/deletions explicitly; a single extra OCR column must not
// shift all subsequent comparisons. Every unmatched event remains a failure.
export function assessExternalBars(actualBars,oracle){
 const checks=[];
 for(const bar of oracle?.bars??[]){
  const expected=bar.events,actual=actualBars[bar.number-1]?.slots.map(s=>({duration:s.duration,rest:!!s.rest,notes:s.notes.filter(n=>n.status==='confirmed').map(n=>[n.string,n.dead?'X':n.fret]).sort((a,b)=>a[0]-b[0])}))??[];
  const notes=(a,e)=>JSON.stringify(a.notes)===JSON.stringify(e.notes)&&a.rest===!!e.rest;
  const rhythm=(a,e)=>a.duration===e.duration&&a.rest===!!e.rest;
  const d=Array.from({length:expected.length+1},()=>Array(actual.length+1).fill(0));
  for(let i=0;i<=expected.length;i++)d[i][0]=i*4;
  for(let j=0;j<=actual.length;j++)d[0][j]=j*4;
  const cost=(a,e)=>(notes(a,e)?0:3)+(rhythm(a,e)?0:1);
  for(let i=1;i<=expected.length;i++)for(let j=1;j<=actual.length;j++)d[i][j]=Math.min(d[i-1][j-1]+cost(actual[j-1],expected[i-1]),d[i-1][j]+4,d[i][j-1]+4);
  let i=expected.length,j=actual.length;const rows=[];
  while(i||j){
   if(i&&j&&d[i][j]===d[i-1][j-1]+cost(actual[j-1],expected[i-1])){
    const a=actual[--j],e=expected[--i];rows.push({bar:bar.number,event:i+1,notes:notes(a,e),rhythm:rhythm(a,e),expected:e,actual:a});
   }else if(i&&d[i][j]===d[i-1][j]+4){--i;rows.push({bar:bar.number,event:i+1,notes:false,rhythm:false,expected:expected[i],actual:null});}
   else{--j;rows.push({bar:bar.number,extraEvent:j+1,notes:false,rhythm:false,expected:null,actual:actual[j]});}
  }
  checks.push(...rows.reverse());
 }
 return {oracleEvents:checks.filter(c=>c.expected).length,correctNoteEvents:checks.filter(c=>c.notes).length,correctRhythmEvents:checks.filter(c=>c.rhythm).length,extraEvents:checks.filter(c=>!c.expected).length,failures:checks.filter(c=>!c.notes||!c.rhythm)};
}
