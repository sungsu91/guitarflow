import InstrumentDropdown from '../components/InstrumentDropdown.jsx';
import { t } from '../i18n/core.js';
import { useLanguage } from '../i18n/react.jsx';
import { VIEWER_INSTRUMENTS, getViewerProfile } from '../fretboard/instruments.js';
import './instrument-controls.css';

function profileLabel(profile) {
  const name = t(profile.instrument === 'guitar' ? 'app.guitar' : profile.instrument === 'bass' ? 'tuner.bass' : 'viewer.ukuleleShort');
  const variation = profile.instrument === 'ukulele' ? profile.id.endsWith('high-g') ? 'Hi G' : 'Lo G' : t('viewer.strings', { count: profile.stringCount });
  return `${name} ${variation}`;
}

function InstrumentSelect({ profile, onProfile, disabled, voiceMode, onVoice, compact = false }) {
  return <div className={`shooterInstrumentSelect${compact ? ' shooterInstrumentSelect--hud' : ''}`} title={disabled ? t('shooter.instrumentLocked') : undefined}>
    <span>{t(compact ? 'viewer.instrument' : 'shooter.playingInstrument')}</span>
    <InstrumentDropdown label={t('shooter.playingInstrument')} disabled={disabled} value={voiceMode ? 'voice' : profile.id}
      variant="shooter" onChange={id => id === 'voice' ? onVoice() : onProfile(id)}
      options={[{ id: 'voice', label: t('shooter.voice') }, ...Object.values(VIEWER_INSTRUMENTS).flat().map(id => ({ id, label: profileLabel(getViewerProfile(id)) }))]} />
  </div>;
}

export function DesktopShooterInstrumentControl(props) {
  useLanguage();
  return <InstrumentSelect {...props} />;
}

export function ShooterInstrumentHud({ profile, onProfile, disabled, hint, onHint, voiceMode, onVoice, tablet = false }) {
  useLanguage();
  return <div className={`shooterInstrumentHud shooterInstrumentHud--${tablet ? 'tablet' : 'mobile'}`}>
    <InstrumentSelect profile={profile} onProfile={onProfile} disabled={disabled} voiceMode={voiceMode} onVoice={onVoice} compact />
    {!voiceMode ? <label className="shooterHintCheckbox">
      <span>{t('app.hints')}</span>
      <input type="checkbox" checked={hint > 0} onChange={event => onHint(event.target.checked ? 2 : 0)} />
    </label> : null}
  </div>;
}
