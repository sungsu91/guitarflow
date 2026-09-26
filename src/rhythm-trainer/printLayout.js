// A4 content area in CSS pixels; keep each title with at least one score row.
export function paginatePrintPacks(patterns,defaultColumns=2) {
 const pages=[[]];let used=0;
 for(const pattern of patterns){
  const columns=Math.max(1,Math.min(4,Math.round(pattern.printColumns||defaultColumns)));
  const rowHeight=704/columns*78/(columns>1?328:360)+12;
  let offset=0;
  while(offset<pattern.measures.length){
   const space=offset===0?Math.max(0,Math.min(240,pattern.printSpace||0)):0;
   if(1000-used<space+76+rowHeight){pages.push([]);used=0;}
   const rows=Math.max(1,Math.floor((1000-used-space-76)/rowHeight));
   const measures=pattern.measures.slice(offset,offset+rows*columns);
   pages.at(-1).push({pattern,offset,measures,space,columns});
   used+=space+76+Math.ceil(measures.length/columns)*rowHeight;
   offset+=measures.length;
  }
 }
 return pages.filter(page=>page.length);
}
