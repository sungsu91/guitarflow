import {BASS_PATTERNS} from './arrangeBass.js';
import './mobileBassArrangement.css';
export default function MobileBassArrangement({controls:c}){
 const r=c.result?.report;
 return <dialog ref={c.dialog} className="mobileBassArrangement" aria-label="베이스 편곡" onKeyDown={e=>e.stopPropagation()} onCancel={e=>{e.preventDefault();c.close();}}>
  <header><h2>베이스 반주 만들기</h2><button type="button" onClick={c.close} aria-label="베이스 편곡 닫기">×</button></header>
  <main><p>코드에 맞춘 낮은 베이스 반주입니다. G/B는 B음으로 시작합니다. 원곡 녹음의 채보가 아닌 합주 연습용 편곡입니다.</p><label>반주 패턴<select aria-label="베이스 반주 패턴" value={c.pattern} onChange={e=>c.setPattern(e.target.value)}>{BASS_PATTERNS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
   {c.capo>0&&<p>원본 카포 {c.capo}프렛을 실제 음높이에 반영합니다.</p>}{c.sourceReview&&<p role="status">사진·PDF의 코드와 변경 박은 원본 대조가 필요합니다.</p>}
   <details><summary>코드·변경 박 ({c.rows.length}마디)</summary><p>빈 마디는 이전 코드 유지, N.C.는 쉼입니다.</p>{c.rows.map((row,b)=><section className="mobileBassChordRow" key={b}><strong>{b+1}마디</strong>{row.changes.map((chord,i)=><div className="mobileBassChordFields" key={i}><label>박<input aria-label={`${b+1}마디 ${i+1}번째 코드 박`} type="number" min="1" step="0.125" value={chord.onset/(1920/row.meter[1])+1} onChange={e=>c.change(b,i,'onset',(Number(e.target.value)-1)*1920/row.meter[1])}/></label><label>코드<input aria-label={`${b+1}마디 ${i+1}번째 코드`} value={chord.name} onChange={e=>c.change(b,i,'name',e.target.value)}/></label><button type="button" aria-label={`${b+1}마디 ${i+1}번째 코드 삭제`} onClick={()=>c.remove(b,i)}>×</button></div>)}{!row.changes.length&&<p>이전 코드 유지</p>}{row.review&&<p role="status">빠진 코드를 추가·수정해 주세요.</p>}<button type="button" aria-label={`${b+1}마디 코드 추가`} onClick={()=>c.add(b)}>+ 코드</button></section>)}</details>
   {c.error&&<p className="mobileBassError" role="alert">{c.error}</p>}{r&&<section aria-label="베이스 편곡 결과"><strong>{r.bars}마디 · {r.notes}음</strong><p>{c.range??'쉼표'} · 0~{r.maxFret}프렛</p><p>원본을 보존하고 오선보 + TAB으로 엽니다.</p></section>}{c.restore&&<button type="button" onClick={c.restore}>편곡 전 원본 복원</button>}
  </main><footer><button type="button" onClick={c.preview}>편곡 미리보기</button><button type="button" disabled={!r} onClick={c.apply}>베이스 악보로 열기</button></footer>
 </dialog>;
}
