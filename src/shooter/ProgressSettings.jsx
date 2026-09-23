import { localizeUi } from "./../i18n/core.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import ShooterSettingsPopover from './ShooterSettingsPopover.jsx';
import { SHOOTER_PROGRESS_SPEEDS } from './progressionSettings.js';
import './progress-settings.css';

export default function ProgressSettings({ mobile, options, difficulty, speed, onDifficulty, onSpeed, onClose, anchor }) {
  useLanguage();
  const compactOptions = options.filter(option => !option.id.endsWith('-random')).flatMap(option => [option, options.find(candidate => candidate.id === `${option.id}-random`)].filter(Boolean));
  return <ShooterSettingsPopover anchor={anchor} mobile={mobile} label={translateUi("shooter.difficultyAndSpeed")} panelWidth={272} className="shooterProgressSettings" onClose={onClose}>
      <header><h2><Translation id="app.difficulty" /></h2><button type="button" onClick={onClose} aria-label={translateUi("shooter.closeSettings")}>×</button></header>

      <div className="shooterProgressLevels">{compactOptions.map(option=><button type="button" key={option.id} title={localizeUi(option.hint)} aria-pressed={difficulty===option.id} onClick={()=>onDifficulty(option.id)}><span aria-hidden="true" className="shooterProgressCheck">{difficulty===option.id?"✓":""}</span><strong>{localizeUi(option.label)}</strong></button>)}</div>
      <h3><Translation id="app.fallSpeed" /></h3>
      <div className="shooterProgressSpeeds">{SHOOTER_PROGRESS_SPEEDS.map(value=><button key={value} type="button" aria-pressed={speed===value} onClick={()=>onSpeed(value)}>{value}×</button>)}</div>


  </ShooterSettingsPopover>;
}
