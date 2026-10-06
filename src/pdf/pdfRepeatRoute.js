// Compress only adjacent mapped measures. Repeat/jump destinations stay visible
// even when they occur beyond the old 48-visit preview cutoff.
export function pdfRepeatRoute(bars,order){
 const index=new Map(bars.map((bar,i)=>[bar.number,i])),segments=[];
 for(const bar of order){
  const last=segments.at(-1),at=index.get(bar.number);
  if(last&&at===last.lastIndex+1){last.end=bar.number;last.lastIndex=at;}
  else segments.push({start:bar.number,end:bar.number,lastIndex:at,from:last?.end??null,change:last?(at<=last.lastIndex?'return':'skip'):null});
 }
 return segments.map(({lastIndex,...segment})=>segment);
}
