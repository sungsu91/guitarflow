import {BASS_PATTERNS} from './arrangeBass.js';
import './desktopBassArrangement.css';
export default function DesktopBassArrangement({controls:c}){
 const r=c.result?.report;
 return <dialog ref={c.dialog} className="desktopBassArrangement" aria-label="베이스 편곡" onKeyDown={e=>e.stopPropagation()} onCancel={e=>{e.preventDefault();c.close();}}>
  <header><div><small>합주 연습</small><h2>코드 진행 → 베이스 반주</h2></div><button type="button" onClick={c.close} aria-label="베이스 편곡 닫기">×</button></header>
  <main><p>코드가 바뀌는 박에 낮은 베이스음을 연주합니다. G/B는 B음으로 시작합니다. 원곡 베이스 녹음의 채보가 아닌 연습용 편곡이며, 원본은 보존됩니다.</p>
   <label className="desktopBassPattern">반주 패턴<select aria-label="베이스 반주 패턴" value={c.pattern} onChange={e=>c.setPattern(e.target.value)}>{BASS_PATTERNS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
   {c.capo>0&&<p>원본 카포 {c.capo}프렛을 반영해 실제 소리 나는 코드로 편곡합니다.</p>}
   {c.sourceReview&&<p role="status">사진·PDF에서 읽은 코드와 변경 박을 아래에서 원본과 대조해 주세요. 멜로디의 인식 오류를 베이스음으로 복사하지 않습니다.</p>}
   <details><summary>코드·변경 박 확인 ({c.rows.length}마디)</summary><p>이전 코드가 이어지는 마디는 비워 두고, 반주를 쉬는 구간은 N.C.를 입력하세요.</p>
    <div className="desktopBassChordRows">{c.rows.map((row,b)=><div className="desktopBassChordRow" key={b}><strong>{b+1}마디</strong><div>{row.changes.map((chord,i)=><div className="desktopBassChordFields" key={i}><label>박<input aria-label={`${b+1}마디 ${i+1}번째 코드 박`} type="number" min="1" step="0.125" value={chord.onset/(1920/row.meter[1])+1} onChange={e=>c.change(b,i,'onset',(Number(e.target.value)-1)*1920/row.meter[1])}/></label><label>코드<input aria-label={`${b+1}마디 ${i+1}번째 코드`} value={chord.name} onChange={e=>c.change(b,i,'name',e.target.value)}/></label><button type="button" aria-label={`${b+1}마디 ${i+1}번째 코드 삭제`} onClick={()=>c.remove(b,i)}>삭제</button></div>)}{!row.changes.length&&<small>이전 코드 유지</small>}{row.review&&<p role="status">읽지 못한 코드가 있습니다. 빠진 코드를 추가하거나 수정해 주세요.</p>}<button type="button" onClick={()=>c.add(b)} aria-label={`${b+1}마디 코드 추가`}>+ 코드</button></div></div>)}</div>
   </details>
   {c.error&&<p className="desktopBassError" role="alert">{c.error}</p>}
   {r&&<section aria-label="베이스 편곡 결과"><h3>{r.bars}마디 · {r.notes}음</h3><p>{c.range??'쉼표'} · 0~{r.maxFret}프렛 · 오선보 + TAB</p><p>시작 베이스음: {r.audit.filter(a=>a.midi!==null).slice(0,8).map(a=>`${a.chord} (${a.string}번 줄 ${a.fret}프렛)`).join(' → ')}</p></section>}
  </main><footer>{c.restore&&<button type="button" onClick={c.restore}>원본 복원</button>}<button type="button" onClick={c.close}>취소</button><button type="button" onClick={c.preview}>베이스 편곡 미리보기</button><button type="button" disabled={!r} onClick={c.apply}>베이스 악보로 열기</button></footer>
 </dialog>;
}
