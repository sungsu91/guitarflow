// Browser print-to-PDF retains SVG paths. It never changes the score document.
export function printEditorScore(container,title,view='both') {
 const pages=[...container.querySelectorAll('[data-draw-count]')].map(host=>host.shadowRoot?.querySelector('svg')).filter(Boolean);
 if(!pages.length)throw Error('먼저 표시 가능한 악보를 준비하세요.');
 const win=window.open('','_blank','width=1000,height=800');if(!win)throw Error('인쇄 창을 허용한 후 다시 시도하세요.');
 win.document.title=title;const style=win.document.createElement('style');
 style.textContent=`@page{size:A4;margin:12mm}body{margin:20px;color:#111;background:white;font-family:Arial}h1{font:22px Georgia;text-align:center}section{break-inside:avoid}svg{width:100%;height:auto}svg text{fill:#111}.etudeEditorHit,.etudeInputCursor{display:none}.etudeMeasureNumber{font:700 13px Arial}button{margin:10px;padding:10px}@media print{button{display:none}}${view==='staff'?'.vf-fretiva-tab-view,.fretiva-tab-view,.vf-fretiva-both-view{display:none}':view==='tab'?'.vf-fretiva-staff-view,.vf-fretiva-both-view{display:none}':''}`;
 win.document.head.append(style);const heading=win.document.createElement('h1');heading.textContent=title;win.document.body.append(heading);
 const print=win.document.createElement('button');print.textContent='인쇄 · PDF로 저장';print.onclick=()=>win.print();win.document.body.append(print);
 for(const svg of pages){const section=win.document.createElement('section');section.append(win.document.importNode(svg,true));win.document.body.append(section);}
 win.focus();
}
