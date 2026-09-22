const FOLLOW_PATTERNS = [
  ['line', '따라가기'],
  ['fingering', '운지 따라가기'],
  ['off', '끔'],
];

export default function FollowPatternControl({ value, onChange }) {
  return <div className="etudeFollowPattern">
    <span>리듬진행 방식</span>
    <div role="group" aria-label="리듬진행 방식">
      {FOLLOW_PATTERNS.map(([next, label]) => <button
        key={next}
        type="button"
        aria-pressed={(value === 'page' ? 'line' : value) === next}
        onClick={() => onChange(next)}
      >{label}</button>)}
    </div>
    {value === 'fingering' && <small>음표·쉼표 길이를 따라 진행하며 현재 음과 연결 주법을 표시합니다.</small>}
  </div>;
}
