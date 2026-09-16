// barMap remains the sole persisted mapping. New entries describe a row; old
// per-measure rectangles are expanded/grouped only for playback and display.
export function expandPdfBars(barMap=[]){
 return barMap.flatMap(row=>{
  const count=Math.max(1,Math.min(4,Math.floor(row.count||1)));
  return Array.from({length:count},(_,i)=>({...row,number:row.number+i,x:row.x+row.width*i/count,width:row.width/count,beats:row.beatCounts?.[i]??row.beats,rowStart:row.number}));
 });
}
export function pdfBarRows(barMap=[]){
 const rows=[];
 for(const entry of barMap){
  if(entry.count!=null){rows.push({...entry,count:Math.max(1,Math.min(4,entry.count)),bars:expandPdfBars([entry])});continue;}
  const prior=rows.at(-1),last=prior?.bars.at(-1);
  // Legacy grouping is conservative: consecutive, touching, equally high rectangles.
  if(prior?.legacy&&prior.bars.length<4&&last.page===entry.page&&last.number+1===entry.number&&Math.abs(last.y-entry.y)<.002&&Math.abs(last.height-entry.height)<.002&&Math.abs(last.x+last.width-entry.x)<.003){
   prior.bars.push({...entry,rowStart:prior.number});prior.count++;prior.width=entry.x+entry.width-prior.x;
  }else rows.push({...entry,count:1,legacy:true,bars:[{...entry,rowStart:entry.number}]});
 }
 return rows;
}
export function removePdfRow(barMap,number){
 const row=pdfBarRows(barMap).find(r=>r.bars.some(b=>b.number===number));if(!row)return {barMap,removed:[]};
 const removed=row.bars.map(b=>b.number);return {barMap:barMap.filter(b=>!removed.includes(b.number)),removed};
}
export function setPdfBarBeats(barMap,number,beats){
 return barMap.map(row=>{const count=Math.max(1,Math.min(4,row.count||1)),index=number-row.number;if(index<0||index>=count)return row;
  if(count===1)return {...row,beats};return {...row,beatCounts:Array.from({length:count},(_,i)=>i===index?beats:row.beatCounts?.[i]??row.beats)};
 });
}
export function normalizePdfBarEntry(row){
 if(row.count==null)return row;
 const count=Math.max(1,Math.min(4,Math.floor(Number(row.count)||1)));
 return {...row,count,...(row.beatCounts?{beatCounts:Array.from({length:count},(_,i)=>Math.max(1,Math.min(32,Number(row.beatCounts[i])||row.beats)))}:{})};
}
export function movePdfRow(barMap,number,rect){
 const row=pdfBarRows(barMap).find(r=>r.bars.some(b=>b.number===number));if(!row)return barMap;
 const numbers=new Set(row.bars.map(b=>b.number));
 return barMap.map(b=>numbers.has(b.number)?{...b,x:rect.x+(b.x-row.x)/row.width*rect.width,y:rect.y,width:b.width/row.width*rect.width,height:rect.height}:b);
}
