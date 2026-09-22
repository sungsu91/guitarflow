import ShooterSettingsPopover from './ShooterSettingsPopover.jsx';
import { SHOOTER_PROGRESS_SPEEDS } from './progressionSettings.js';
import './progress-settings.css';

export default function ProgressSettings({ mobile, options, difficulty, speed, onDifficulty, onSpeed, onClose, anchor }) {
  const compactOptions = [...options.filter(option => !option.id.endsWith('-random')), ...options.filter(option => option.id.endsWith('-random'))];
  return <ShooterSettingsPopover anchor={anchor} mobile={mobile} label="난이도와 진행 속도" className="shooterProgressSettings" onClose={onClose}>
      <header><h2>연습 설정</h2><button type="button" onClick={onClose} aria-label="설정 닫기">×</button></header>
      <h3>난이도</h3>
      <div className="shooterProgressLevels">{compactOptions.map(option=><button type="button" key={option.id} title={option.hint} aria-pressed={difficulty===option.id} onClick={()=>onDifficulty(option.id)}><strong>{option.label}</strong></button>)}</div>
      <h3>하강 속도</h3>
      <div className="shooterProgressSpeeds">{SHOOTER_PROGRESS_SPEEDS.map(value=><button key={value} type="button" aria-pressed={speed===value} onClick={()=>onSpeed(value)}>{value}×</button>)}</div>
      <p>등장 간격은 그대로, 내려오는 속도만 조절해요.</p>
      <button className="shooterProgressDone" type="button" onClick={onClose}>설정 완료</button>
  </ShooterSettingsPopover>;
}
