const FOLLOW_PATTERNS = [
  ['line', '줄'],
  ['page', '마디전환'],
  ['fingering', '운지'],
  ['off', '끔'],
];

export default function FollowPatternControl({ value, onChange }) {
  return <div className="etudeFollowPattern">
    <span>진행 따라가기 패턴</span>
    <div role="group" aria-label="진행 따라가기 패턴">
      {FOLLOW_PATTERNS.map(([next, label]) => <button
        key={next}
        type="button"
        aria-pressed={value === next}
        onClick={() => onChange(next)}
      >{label}</button>)}
    </div>
  </div>;
}
