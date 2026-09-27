export const PRINT_WIDTH=794,PRINT_BOTTOM=1050,PRINT_MARGIN=45,PRINT_CONTENT_WIDTH=704;
export const printHeaderHeight=pattern=>pattern.showMeta===false?64:94;

// Automatic layout supplies the initial positions only. Manual positions do not
// add padding to earlier packs or push neighboring packs around.
export function paginatePrintPacks(patterns,defaultColumns=2) {
 const pages=[[]];let used=0;
 for(const pattern of patterns){
  const columns=Math.max(1,Math.min(4,Math.round(pattern.printColumns||defaultColumns)));
  const rowHeight=PRINT_CONTENT_WIDTH/columns*78/(columns>1?328:360)+12;
  const header=printHeaderHeight(pattern);let offset=0;
  while(offset<pattern.measures.length){
   if(PRINT_BOTTOM-PRINT_MARGIN-used<header+rowHeight-12){pages.push([]);used=0;}
   const rows=Math.max(1,Math.floor((PRINT_BOTTOM-PRINT_MARGIN-used-header+12)/rowHeight));
   const measures=pattern.measures.slice(offset,offset+rows*columns),height=header+Math.ceil(measures.length/columns)*rowHeight-12;
   pages.at(-1).push({id:pattern.printKey+':'+offset,pattern,offset,measures,columns,height,top:PRINT_MARGIN+used,left:PRINT_MARGIN,page:pages.length-1});
   used+=height+20;offset+=measures.length;
  }
 }
 return pages.filter(page=>page.length);
}
export function printPositionBounds(section){return {minTop:10,maxTop:Math.max(10,PRINT_BOTTOM-section.height),minLeft:10,maxLeft:PRINT_WIDTH-PRINT_CONTENT_WIDTH-10};}
export function positionPrintSection(section,position={}) {
 const bounds=printPositionBounds(section),finite=(value,fallback)=>Number.isFinite(value)?value:fallback;
 return {...section,page:Math.max(0,Math.round(finite(position.page,section.page))),top:Math.max(bounds.minTop,Math.min(bounds.maxTop,finite(position.top,section.top))),left:Math.max(bounds.minLeft,Math.min(bounds.maxLeft,finite(position.left,section.left)))};
}
export function placePrintSections(pages,positions){return pages.flat().map(section=>positionPrintSection(section,positions[section.id]));}
