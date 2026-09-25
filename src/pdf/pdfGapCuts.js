// Cuts stay in original PDF coordinates; the original bytes and annotation data remain intact.
export function normalizeGapCuts(value){
 const sorted=(Array.isArray(value)?value:[]).filter(c=>c&&Number.isFinite(c.start)&&Number.isFinite(c.end)&&c.start>=0&&c.end<=1&&c.end-c.start>=.001).slice(0,200).map(c=>({start:c.start,end:c.end})).sort((a,b)=>a.start-b.start);
 const merged=[];for(const cut of sorted){const last=merged.at(-1);if(last&&cut.start<=last.end)last.end=Math.max(last.end,cut.end);else merged.push({...cut});}
 return merged.reduce((n,c)=>n+c.end-c.start,0)>.95?[]:merged;
}
export function retainedBands(crop){
 let y=crop.y;const end=crop.y+crop.height,result=[];
 for(const cut of crop.cuts??[]){const start=Math.max(crop.y,cut.start),stop=Math.min(end,cut.end);if(stop<=start)continue;if(start>y)result.push({start:y,end:start});y=Math.max(y,stop);}
 if(y<end)result.push({start:y,end});return result;
}
export const pageVisibleHeight=crop=>retainedBands(crop).reduce((n,b)=>n+b.end-b.start,0);
export function compactY(y,crop){
 return y-crop.y-(crop.cuts??[]).reduce((n,c)=>n+Math.max(0,Math.min(y,c.end,crop.y+crop.height)-Math.max(crop.y,c.start)),0);
}
export function expandY(y,crop){
 if(y<0)return crop.y+y;
 for(const band of retainedBands(crop)){const length=band.end-band.start;if(y<length)return band.start+y;y-=length;}
 return crop.y+crop.height+y;
}
export const isCutPoint=(y,crop)=>(crop.cuts??[]).some(c=>y>=c.start&&y<c.end);
