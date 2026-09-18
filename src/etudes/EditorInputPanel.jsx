export function DurationIcon({value}) {
 const hollow=value==='1'||value==='2';
 return <svg viewBox="0 0 24 28" width="24" height="28" aria-hidden="true" focusable="false"><ellipse cx="9" cy="21" rx="4.5" ry="3" transform="rotate(-20 9 21)" fill={hollow?'none':'currentColor'} stroke="currentColor" strokeWidth="1.5"/>{value!=='1'&&<path d="M13 20V4" fill="none" stroke="currentColor" strokeWidth="1.8"/>}{Number(value)>=8&&<path d="M13 4c0 5 7 4 5 11" fill="none" stroke="currentColor" strokeWidth="1.8"/>}{value==='16'&&<path d="M13 9c0 5 6 4 5 10" fill="none" stroke="currentColor" strokeWidth="1.8"/>}</svg>;
}
export function DurationButtons({value,onChange,compact=false}) {
 return <div className={`etudeDurationButtons${compact?' is-compact':''}`} role="group" aria-label="음표 길이 바로 선택">{[['1','온음표'],['2','2분음표'],['4','4분음표'],['8','8분음표'],['16','16분음표']].map(([v,label])=><button type="button" key={v} aria-label={label} title={label} aria-pressed={value===v} onClick={()=>onChange(v)}><DurationIcon value={v}/>{!compact&&<span>{v==='1'?'온음표':`${v}분`}</span>}</button>)}</div>;
}
export default function EditorInputPanel({stringCount=6,cursor,event,onString,onFret,onDelete}) {
 const tone=event.notes.find(n=>n.string===cursor.string);
 return <aside className="etudeContextPanel" aria-label="빠른 입력 패널">

  <div className="etudeCurrentNote" aria-live="polite"><span className="etudePanelEyebrow">현재 선택</span><div><DurationIcon value={event.duration}/><p><strong>{event.rest?(event.blank?'빈 입력 위치':'쉼표'):tone?`${cursor.string}번줄 ${tone.fret}프렛`:'선택 줄은 비어 있음'}</strong><small>{cursor.bar+1}마디 · {event.onset/480+1}박 · {cursor.string}번줄 · {event.duration==='1'?'온음표':`${event.duration}분음표`}</small></p></div></div>
  <>
   <div className="etudeInputField"><span className="etudePanelEyebrow">줄 선택</span><div className="etudeStringButtons">{Array.from({length:stringCount},(_,i)=>i+1).map(string=><button type="button" key={string} aria-label={`입력 ${string}번줄`} aria-pressed={cursor.string===string} onClick={()=>onString(string)}>{string}</button>)}</div></div>
   <div className="etudeInputField"><label htmlFor="etude-quick-fret">프렛 번호</label><div className="etudeFretStepper"><button type="button" aria-label="프렛 낮추기" disabled={!tone||tone.fret===0} onClick={()=>onFret(tone.fret-1)}>−</button><input id="etude-quick-fret" aria-label="빠른 프렛 입력" type="number" min="0" max="24" value={tone?.fret??''} placeholder="—" onChange={e=>{if(e.target.value!==''&&e.target.validity.valid)onFret(Number(e.target.value));}}/><button type="button" aria-label="프렛 높이기" disabled={tone?.fret===24} onClick={()=>onFret((tone?.fret??-1)+1)}>+</button></div></div>
   <p className="etudePanelHint">악보를 클릭한 뒤 숫자를 입력하세요.<br/>↑↓ 줄 이동 · ←→ 박 이동</p>
   <button type="button" className="etudePanelDelete" onClick={onDelete} disabled={event.blank||(!event.rest&&!tone)}>선택 음·쉼표 삭제</button>
  </>
 </aside>;
}
