import {useState} from 'react';
import {summarizeAnalysis} from './recognition.js';
export default function PdfTabDebugOverlay({analysis}){
  const [index,setIndex]=useState(0),page=analysis.pages[index];
  return <div className="pdfTabDebug"><label>페이지 <select value={index} onChange={e=>setIndex(Number(e.target.value))}>{analysis.pages.map((p,i)=><option key={i} value={i}>{p.page}</option>)}</select></label><p>초록: confirmed · 갈색: unresolved · 회색: rejected · 파랑: 리듬 위치</p>
    <svg viewBox={`0 0 ${page.width} ${page.height}`} aria-label="TAB 검출 디버그 오버레이"><image href={analysis.previews[index]} width={page.width} height={page.height}/>
      {page.staffs.map(staff=><g key={staff.id}><rect x={staff.x} y={staff.y-staff.spacing} width={staff.width} height={staff.height+2*staff.spacing} fill="none" stroke="#7b4fd0" strokeWidth="3"/>{staff.lines.map(y=><line key={y} x1={staff.x} x2={staff.x+staff.width} y1={y} y2={y} stroke="#209563" opacity=".65" strokeWidth="2"/>)}{staff.bars.map(x=><line key={x} x1={x} x2={x} y1={staff.y} y2={staff.y+staff.height} stroke="#d27525" strokeWidth="4"/>)}
      {staff.measures.flatMap(m=>m.slots).map((s,i)=><g key={i}><line x1={s.x} x2={s.x} y1={staff.y} y2={s.y} stroke="#3175c1" strokeWidth="2"/><text x={s.x} y={staff.y+staff.height+staff.spacing*3.5} fontSize="16" fill="#225a91">{s.duration??'?'}{s.status==='unresolved'?'?':''}</text></g>)}
      {staff.candidates.map(c=><g key={c.id} stroke={c.status==='confirmed'?'#168251':c.status==='unresolved'?'#ae731e':'#777'}><rect x={c.x-2} y={c.y-2} width={c.width+4} height={c.height+4} fill="none" strokeWidth="2"/><title>{`${c.ocr?.text||'?'} · confidence ${c.ocr?.confidence?.toFixed(3)} · 현 ${c.string} · ${c.status} · ${c.reasons?.join(', ')}`}</title><text x={c.x} y={c.y-5} stroke="none" fill="#333" fontSize="12">{c.ocr?.text||'?'} / {c.ocr?.confidence?.toFixed(2)} / s{c.string}</text></g>)}</g>)}
    </svg><pre>{JSON.stringify({page:page.page,...summarizeAnalysis([page]),final:analysis.summary},null,2)}</pre>
  </div>;
}
