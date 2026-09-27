import {PRINT_WIDTH,PRINT_BOTTOM,PRINT_MARGIN,PRINT_CONTENT_WIDTH,PRINT_TOP,PRINT_SPAN,PRINT_PACK_GAP} from '../printing/printGeometry.js';
export {PRINT_WIDTH,PRINT_BOTTOM,PRINT_MARGIN,PRINT_CONTENT_WIDTH,PRINT_TOP,PRINT_SPAN,PRINT_PACK_GAP} from '../printing/printGeometry.js';
export const printHeaderHeight=pattern=>pattern.showMeta===false?36:64;
export const printColumns=pattern=>Math.max(1,Math.min(4,Math.round(pattern.printColumns||2)));
export const printRowHeight=pattern=>{const columns=printColumns(pattern);return PRINT_CONTENT_WIDTH/columns*78/(columns>1?328:360)+12;};
export const printCoordinate=(page,top)=>Math.max(0,page*PRINT_SPAN+Math.max(0,Math.min(PRINT_SPAN,top-PRINT_TOP)));

// Split only between complete notation rows. A pack's start can move while its
// measures flow across sheets; no SVG is cropped and no measure is duplicated.
export function layoutPrintPack(pattern,requestedStart=0){
 const columns=printColumns(pattern),rowHeight=printRowHeight(pattern),header=printHeaderHeight(pattern);
 let start=Math.max(0,Number.isFinite(requestedStart)?requestedStart:0),page=Math.floor(start/PRINT_SPAN),local=start%PRINT_SPAN,offset=0;
 const sections=[];
 while(offset<pattern.measures.length){
  let rows=Math.floor((PRINT_SPAN-local-header+12+.000001)/rowHeight);
  if(rows<1){page++;local=0;rows=Math.floor((PRINT_SPAN-header+12)/rowHeight);}
  const measures=pattern.measures.slice(offset,offset+rows*columns),height=header+Math.ceil(measures.length/columns)*rowHeight-12;
  sections.push({id:pattern.printKey+':'+offset,pattern,offset,measures,columns,height,top:PRINT_TOP+local,left:PRINT_MARGIN,page});
  offset+=measures.length;if(offset<pattern.measures.length){page++;local=0;}
 }
 const first=sections[0],last=sections.at(-1);
 return {key:pattern.printKey,pattern,sections,start:first?first.page*PRINT_SPAN+first.top-PRINT_TOP:start,end:last?last.page*PRINT_SPAN+last.top-PRINT_TOP+last.height:start};
}
export function layoutPrintPacks(patterns,positions={}){
 let cursor=0;const packs=[];
 for(const pattern of patterns){
  const preferred=positions[pattern.printKey];
  const pack=layoutPrintPack(pattern,Number.isFinite(preferred)&&preferred>=cursor-.0000001?preferred:cursor);
  packs.push(pack);cursor=pack.end+PRINT_PACK_GAP;
 }
 const sections=packs.flatMap(pack=>pack.sections);
 return {packs,sections,pageCount:Math.max(1,...sections.map(section=>section.page+1))};
}
export function printPackBounds(layout,key){
 const index=layout.packs.findIndex(pack=>pack.key===key),pack=layout.packs[index];
 const min=index?layout.packs[index-1].end+PRINT_PACK_GAP:0,next=layout.packs[index+1];
 if(!next)return {min,max:Infinity};
 const end=next.start-PRINT_PACK_GAP;
 // End positions are monotone, including the jumps when a row needs a new sheet.
 // Find the last legal start rather than letting one pack push another away.
 let low=min,high=end;
 for(let n=0;n<40;n++){const middle=(low+high)/2;if(layoutPrintPack(pack.pattern,middle).end<=end)low=middle;else high=middle;}
 return {min,max:low};
}
export function movePrintPack(layout,key,requestedStart){
 const current=layout.packs.find(pack=>pack.key===key),bounds=printPackBounds(layout,key);
 const request=Number.isFinite(requestedStart)?requestedStart:current.start;
 const start=Math.max(bounds.min,Math.min(bounds.max,request)),pack=layoutPrintPack(current.pattern,start);
 return {pack,positions:Object.fromEntries(layout.packs.map(item=>[item.key,item.key===key?pack.start:item.start])),blocked:request>bounds.max+.1?1:request<bounds.min-.1?-1:0};
}
