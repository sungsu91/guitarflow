// The visible selection follows the fret, independently of the larger click
// target. Keep its edges inside the halfway points to neighbouring onsets.
export function desktopTabCursorBounds(root,hit){
 const center=Number(hit.dataset.cursorX)+12,y=Number(hit.dataset.cursorY);
 const note=root.querySelector(`[data-score-event="${hit.dataset.event}"][data-rhythm-touch="tab"]`);
 const glyph=[...(note?.querySelectorAll('text')??[])].filter(text=>text.getAttribute('visibility')!=='hidden').map(text=>text.getBBox()).find(box=>Math.abs(box.y+box.height/2-(y+7))<8);
 const width=(glyph?.width??10)+2;
 const neighbours=[...root.querySelectorAll('[data-mode="tab"][data-cursor-x]:not(.etudePickHit)')].filter(n=>n.dataset.event!==hit.dataset.event).map(n=>Number(n.dataset.cursorX)+12);
 const left=Math.max(center-width/2,...neighbours.filter(x=>x<center-.01).map(x=>(x+center)/2+1));
 const right=Math.min(center+width/2,...neighbours.filter(x=>x>center+.01).map(x=>(x+center)/2-1));
 return {x:left,y,width:Math.max(2,right-left),height:14,rx:2};
}
