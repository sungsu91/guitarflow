const FOLLOW_PATTERNS = [
  ['line', '줄'],
  ['page', '마디전환'],
  ['off', '끔'],
];

export default function FollowPatternControl({ value, onChange, rhythm = true, onRhythmChange }) {
  return <div className="etudeFollowPattern">
    <span>화면 따라가기</span>
    <div role="group" aria-label="화면 따라가기">
      {FOLLOW_PATTERNS.map(([next, label]) => <button
        key={next}
        type="button"
        aria-pressed={value === next}
        onClick={() => onChange(next)}
      >{label}</button>)}
    </div>
    {onRhythmChange&&<label className="etudeRhythmToggle"><input type="checkbox" checked={rhythm} onChange={e=>onRhythmChange(e.target.checked)}/>리듬 진행바</label>}
  </div>;
}
