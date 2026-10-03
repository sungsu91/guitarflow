export function drawImportMarkers(root,notes){
  const markers=[];
  if(!root)return ()=>{};
  notes.forEach((e,event)=>{
    if(e.pdfImport?.status!=='unresolved')return;
    // A source-review flag is not a missing fret. Recognized rests have no
    // string to fill; their rhythm can still be reviewed at the bar level.
    if(e.rest&&!e.blank&&!e.pdfImport.pendingStrings?.length)return;
    if(e.notes?.length&&!e.pdfImport.pendingStrings?.length)return;
    const strings=e.pdfImport.pendingStrings?.length?e.pdfImport.pendingStrings:[1];
    for(const string of strings){
      const hit=root.querySelector(`.etudeEditorHit[data-event="${event}"][data-mode="tab"][data-string="${string}"]`);if(!hit)continue;
      const text=document.createElementNS('http://www.w3.org/2000/svg','text');
      const hasNote=e.notes?.some(n=>n.string===string);
      for(const [k,v] of Object.entries({class:'pdfTabUnresolvedMarker','data-mode':'tab',x:Number(hit.dataset.cursorX)+(hasNote?25:12),y:Number(hit.dataset.cursorY)+11,'text-anchor':'middle','font-size':11,'font-family':'Arial','font-weight':600,fill:'#97714f','pointer-events':'none','aria-label':`PDF 미확정 ${string}번 현`}))text.setAttribute(k,String(v));
      text.textContent='?';hit.ownerSVGElement.append(text);markers.push(text);
    }
  });
  return ()=>markers.forEach(m=>m.remove());
}
