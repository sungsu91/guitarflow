// Desktop selection lives inside each engraved SVG so it follows zoom and scroll.
// Use the input slots, not fret glyphs: empty beats are selectable too.
export function drawDesktopScoreRange(svg,events,view){
 if(!svg||!events?.length)return;
 const selected=new Set(events);
 const slots=[...svg.querySelectorAll('.etudeEditorHit[data-event]')].filter(hit=>
  selected.has(Number(hit.dataset.event))&&!hit.classList.contains('etudeNoteHandle')&&
  !hit.classList.contains('etudeLedgerHit')&&!hit.classList.contains('etudePickHit')&&
  (view==='both'||hit.dataset.mode===view));
 if(!slots.length)return;
 const boxes=slots.map(hit=>hit.getBBox()),bounds=svg.viewBox.baseVal;
 const left=Math.max(bounds.x+1,Math.min(...boxes.map(box=>box.x)));
 const right=Math.min(bounds.x+bounds.width-1,Math.max(...boxes.map(box=>box.x+box.width)));
 const top=Math.max(bounds.y+1,Number(svg.dataset.playbackTop));
 const bottom=Math.min(bounds.y+bounds.height-1,Number(svg.dataset.playbackBottom));
 if(!(right>left&&bottom>top))return;
 const marker=document.createElementNS('http://www.w3.org/2000/svg','rect');
 Object.entries({class:'etudeScoreRangeSelection',x:left,y:top,width:right-left,height:bottom-top,
  fill:'#167254','fill-opacity':.14,stroke:'#167254','stroke-width':1.5,
  'vector-effect':'non-scaling-stroke','pointer-events':'none','aria-hidden':'true',
  'data-selected-events':events.join(',')}).forEach(([key,value])=>marker.setAttribute(key,String(value)));
 svg.append(marker);
 return marker;
}
