import {scoreCredit} from './scoreMetadata.js';
// Browser print-to-PDF retains SVG paths. It never changes the score document.
export function printEditorScore(container,title,view='both',metadata) {
 const pages=[...container.querySelectorAll('[data-draw-count]')].map(host=>({svg:host.shadowRoot?.querySelector('svg'),measure:host.closest('[data-layout-row]')})).filter(page=>page.svg);
 if(!pages.length)throw Error('먼저 표시 가능한 악보를 준비하세요.');
 const win=window.open('','_blank','width=1000,height=800');if(!win)throw Error('인쇄 창을 허용한 후 다시 시도하세요.');
 win.document.title=title;const style=win.document.createElement('style');
 style.textContent=`@page{size:A4;margin:12mm}body{margin:20px;color:#111;background:white;font-family:Arial}h1{font:22px Georgia;text-align:center}section{break-inside:avoid}svg{width:100%;height:auto}svg text{fill:#111}.etudeEditorHit,.etudeInputCursor{display:none}.etudeMeasureNumber{font:700 13px Arial}button{margin:10px;padding:10px}@media print{button{display:none}}${view==='staff'?'.vf-fretiva-tab-view,.fretiva-tab-view,.vf-fretiva-both-view{display:none}':view==='tab'?'.vf-fretiva-staff-view,.vf-fretiva-both-view{display:none}':''}`;
 win.document.head.append(style);const heading=win.document.createElement('h1');heading.textContent=title;win.document.body.append(heading);
 if(metadata){const credit=win.document.createElement('p');credit.textContent=scoreCredit(metadata);credit.style.cssText='text-align:center;font-size:13px;margin-bottom:24px';win.document.body.append(credit);}
 const print=win.document.createElement('button');print.textContent='인쇄 · PDF로 저장';print.onclick=()=>win.print();win.document.body.append(print);
 let row=null,section;
 for(const {svg,measure} of pages){
  const nextRow=measure?.dataset.layoutRow;
  if(!section||row!==nextRow){section=win.document.createElement('section');section.style.cssText='display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:0';win.document.body.append(section);row=nextRow;}
  const cell=win.document.createElement('div');cell.style.gridColumn=measure?.style.gridColumn??'1 / -1';cell.style.gridRow='1';cell.style.width=measure?.style.width??'';cell.style.marginLeft=measure?.style.marginLeft??'';
  const drawing=win.document.importNode(svg,true);drawing.style.display='block';drawing.querySelectorAll('.etudeEditorHit,.etudeInputCursor,.etudePlayingSlot').forEach(node=>node.remove());cell.append(drawing);section.append(cell);
 }
 win.focus();
}
