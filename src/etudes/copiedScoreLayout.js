// Source layout is evidence about display, never a reason to add/remove notes
// or measures. Only PDF copy imports opt in; ordinary editing stays authored.
export function copiedScoreLayout(document) {
 const imported=document?.pdfTabImport,view=document?.viewSettings??{};
 if(!imported||imported.sourceType==='image'||view.sourceLayout===false)return null;
 const systems=imported.sourceSystems;
 if(!Array.isArray(systems)||!systems.length)return null;
 const expectedBreaks=systems.slice(1).map(s=>s.measureIds?.[0]);
 // Legacy copies can reuse intact source rows; do not undo a manual reflow.
 if(view.sourceLayout!==true&&(view.measuresPerRow!==Math.max(...systems.map(s=>s.count))||JSON.stringify(view.systemBreaks)!==JSON.stringify(expectedBreaks)))return null;
 const ids=systems.flatMap(s=>s.measureIds??[]),measures=document.measures;
 const reliable=ids.length===measures.length&&new Set(ids).size===ids.length&&ids.every((id,i)=>id===measures[i].id)&&systems.every((s,i)=>
  Number.isInteger(s.page)&&s.page>0&&(!i||s.page>=systems[i-1].page)&&s.count===s.measureIds?.length&&s.count>=1&&s.count<=12
 )&&!measures.some(m=>m.pdfImport?.reasons?.includes('source-bar-count-mismatch'));
 if(!reliable)return {perRow:measures.some(m=>m.events.length>12)?2:4,breaks:[],pageBreaks:[],source:false};
 return {perRow:Math.max(...systems.map(s=>s.count)),breaks:expectedBreaks,
  pageBreaks:systems.filter((s,i)=>i&&s.page!==systems[i-1].page).map(s=>s.measureIds[0]),source:true};
}
