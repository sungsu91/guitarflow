import ShooterSettingsPopover from './ShooterSettingsPopover.jsx';
import { SHOOTER_PROGRESS_SPEEDS } from './progressionSettings.js';
import './progress-settings.css';

export default function ProgressSettings({ mobile, options, difficulty, speed, onDifficulty, onSpeed, onClose, anchor }) {
  const compactOptions = options.filter(option => !option.id.endsWith('-random')).flatMap(option => [option, options.find(candidate => candidate.id === `${option.id}-random`)].filter(Boolean));
  return <ShooterSettingsPopover anchor={anchor} mobile={mobile} label="난이도와 진행 속도" panelWidth={272} className="shooterProgressSettings" onClose={onClose}>
      <header><h2>난이도</h2><button type="button" onClick={onClose} aria-label="설정 닫기">×</button></header>

      <div className="shooterProgressLevels">{compactOptions.map(option=><button type="button" key={option.id} title={option.hint} aria-pressed={difficulty===option.id} onClick={()=>onDifficulty(option.id)}><span aria-hidden="true" className="shooterProgressCheck">{difficulty===option.id?"✓":""}</span><strong>{option.label}</strong></button>)}</div>
      <h3>하강 속도</h3>
      <div className="shooterProgressSpeeds">{SHOOTER_PROGRESS_SPEEDS.map(value=><button key={value} type="button" aria-pressed={speed===value} onClick={()=>onSpeed(value)}>{value}×</button>)}</div>


  </ShooterSettingsPopover>;
}
