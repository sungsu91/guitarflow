import {FINGERSTYLE_TEMPLATES} from './templates.js';
import './mobileGuitarArrangement.css';
export default function MobileGuitarArrangement({controls:c}){
 const o=c.options,r=c.result?.report;
 return <dialog ref={c.dialog} className="mobileGuitarArrangement" aria-label="기타 편곡" onKeyDown={e=>e.stopPropagation()} onCancel={e=>{e.preventDefault();c.close();}}>
  <header><h2>기타 편곡</h2><button type="button" onClick={c.close} aria-label="편곡 닫기">×</button></header>
  <main><p>원본을 보존하고 새 편곡본을 만듭니다. 멜로디의 음높이·리듬을 우선합니다.</p>
   {c.restore&&<button type="button" onClick={c.restore}>편곡 전 원본으로 돌아가기</button>}
   <fieldset><legend>편곡 방식</legend><label><input type="radio" name="mobile-arrangement-mode" checked={o.mode==='voicing'} onChange={()=>c.change('mode','voicing')}/>원곡 화음 → 연주 가능한 운지</label><label><input type="radio" name="mobile-arrangement-mode" checked={o.mode==='fingerstyle'} onChange={()=>c.change('mode','fingerstyle')}/>멜로디 + 코드 → 핑거스타일</label></fieldset>
   <label>멜로디 선택<select aria-label="편곡 멜로디" value={o.melodyVoice} onChange={e=>c.change('melodyVoice',e.target.value)}><option value="auto">멜로디 / 오른손의 가장 높은 음</option>{c.voices.map(v=><option key={v} value={v}>{({right:'오른손',left:'왼손',melody:'멜로디',accompaniment:'반주'})[v]??v}의 가장 높은 음</option>)}</select></label>
   {o.mode==='fingerstyle'&&<><label>오른손 패턴<select aria-label="편곡 오른손 패턴" value={o.template} onChange={e=>c.change('template',e.target.value)}>{FINGERSTYLE_TEMPLATES.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label><p>(1+2)는 두 줄 동시 연주입니다. 멜로디가 겹치면 반주를 병합·생략하며, 멜로디의 지속음을 지킵니다.</p></>}
   <details><summary>손가락·프렛 범위</summary>{[['maxFret','최대 프렛',3,24],['maxSpan','손 벌림 (프렛 차이)',1,5],['maxFingers','왼손 손가락 수',1,4],['maxShift','포지션 이동 한도',0,24]].map(([key,label,min,max])=><label key={key}>{label}<input type="number" min={min} max={max} aria-label={label} value={o[key]} onChange={e=>c.change(key,Number(e.target.value))}/></label>)}<label className="mobileArrangementCheck"><input type="checkbox" checked={o.allowOctaves} onChange={e=>c.change('allowOctaves',e.target.checked)}/>베이스·내성 옥타브 이동 허용</label><p>멜로디는 옮기지 않습니다.</p></details>
   <p>반주 지속음은 짧아질 수 있습니다. 변경 내역을 확인해 주세요.</p>
   {c.error&&<p role="alert">{c.error}</p>}{c.busy&&<p role="status">멜로디와 운지 비교 중…</p>}
   {r&&<section aria-label="편곡 미리보기"><strong>멜로디 {r.melodyNotes}음 · 변경 {r.melodyChanged}</strong><p>생략/병합 {r.omitted} · 옥타브 이동 {r.octaveChanges} · 지속음 축소 {r.shortened}</p>{r.sourceReviewBars.length>0&&<p role="status">원본 OCR 미검토 {r.sourceReviewBars.length}마디 포함 · 원본 대조가 필요합니다.</p>}<ol>{c.changes.slice(0,30).map((s,i)=><li key={i}>{s}</li>)}</ol>{c.changes.length>30&&<p>전체 {c.changes.length}개 내역은 편곡본에 보존됩니다.</p>}</section>}
  </main><footer><button type="button" onClick={c.close}>취소</button><button type="button" disabled={c.busy} onClick={c.preview}>미리보기</button><button type="button" disabled={!r||c.busy} onClick={c.apply}>편곡본으로 열기</button></footer>
 </dialog>;
}
