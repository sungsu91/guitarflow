const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const overlaps=(a,b)=>a.left<b.right&&a.right>b.left;

// Screen-space geometry, not page numbers: adjacent sheets share a vertical
// viewport. A panel over the right sheet must not scroll the left sheet.
export function desktopPlaybackTarget({viewport,row,page,cursor,blockers=[],scrollTop=0,scrollLeft=0,maxTop=0,maxLeft=0,padding=10}){
 const left=viewport.left+padding,right=viewport.right-padding;
 let dx=cursor.right>right?cursor.right-right:cursor.left<left?cursor.left-left:0;
 const nextLeft=clamp(scrollLeft+dx,0,maxLeft);dx=nextLeft-scrollLeft;
 const available=region=>{
  const visible={left:Math.max(left,region.left-dx),right:Math.min(right,region.right-dx)};
  let intervals=[{top:viewport.top+padding,bottom:viewport.bottom-padding}];
  for(const blocker of blockers){
   if(!overlaps(visible,blocker))continue;
   intervals=intervals.flatMap(interval=>{
    const top=blocker.top-padding,bottom=blocker.bottom+padding;
    if(top>=interval.bottom||bottom<=interval.top)return [interval];
    return [{top:interval.top,bottom:Math.min(top,interval.bottom)},{top:Math.max(bottom,interval.top),bottom:interval.bottom}].filter(i=>i.bottom>i.top);
   });
  }
  return intervals;
 };
 let region=row,intervals=available(row);
 // Reveal the whole fitted sheet on entry, then keep every following measure
 // on that sheet still. Enlarged pages and obstructing panels retain row follow.
 if(page){const fits=available(page).filter(i=>i.bottom-i.top>=page.bottom-page.top);if(fits.length){region=page;intervals=fits;}}
 // If panels fill the whole column, do not oscillate trying to reveal a row
 // that cannot fit. The viewport alone still supplies a useful fallback.
 if(!intervals.length)intervals=[{top:viewport.top+padding,bottom:viewport.bottom-padding}];
 const candidates=new Set([scrollTop]);
 for(const interval of intervals)for(const delta of [region.top-interval.top,region.bottom-interval.bottom])candidates.add(clamp(scrollTop+delta,0,maxTop));
 const visible=top=>Math.max(...intervals.map(i=>Math.max(0,Math.min(region.bottom-(top-scrollTop),i.bottom)-Math.max(region.top-(top-scrollTop),i.top))));
 let nextTop=scrollTop,best=visible(scrollTop);
 for(const top of candidates){const amount=visible(top);if(amount>best+.5||Math.abs(amount-best)<=.5&&Math.abs(top-scrollTop)<Math.abs(nextTop-scrollTop)){nextTop=top;best=amount;}}
 return {top:nextTop,left:nextLeft};
}

export function desktopPlaybackRow(svg,bar){
 const matrix=svg.getScreenCTM();if(!matrix)return null;
 const bars=[...svg.querySelectorAll(`[data-playback-bar][data-row="${bar.dataset.row}"]`)];
 const box=svg.getBoundingClientRect();
 return {
  left:Math.min(...bars.map(n=>Number(n.dataset.left)*matrix.a+matrix.e)),
  right:Math.max(...bars.map(n=>(Number(n.dataset.left)+Number(n.dataset.width))*matrix.a+matrix.e)),
  top:Math.max(box.top,Math.min(...bars.map(n=>Math.min(Number(n.dataset.rowTop),Number(n.dataset.top))*matrix.d+matrix.f))),
  bottom:Math.min(box.bottom,Math.max(...bars.map(n=>Math.max(Number(n.dataset.rowBottom),Number(n.dataset.bottom))*matrix.d+matrix.f))),
 };
}

export function desktopPlaybackBlockers(doc){
 return [...doc.querySelectorAll('.etudeSessionWidget,.etudeBackingDrawer,.backingDockPanel,.etudeRemotePopover')]
  .map(node=>node.getBoundingClientRect()).filter(rect=>rect.width>0&&rect.height>0);
}
