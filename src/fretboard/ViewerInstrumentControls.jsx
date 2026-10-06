import { t } from '../i18n/core.js';
import { useLanguage } from '../i18n/react.jsx';
import { VIEWER_INSTRUMENTS, getViewerProfile } from './instruments.js';
import InstrumentDropdown from '../components/InstrumentDropdown.jsx';
import './viewer-instruments.css';

function InstrumentFields({ profile, selectInstrument, selectProfile }) {
  useLanguage();
  return <>
    <InstrumentDropdown label={t('viewer.instrument')} value={profile.instrument} onChange={selectInstrument}
      title={profile.instrument === 'ukulele' ? t('tuner.ukulele') : undefined} menuMinWidth={128}
      options={[
        { id: 'guitar', label: t('app.guitar') },
        { id: 'bass', label: t('tuner.bass') },
        { id: 'ukulele', label: t('viewer.ukuleleShort'), ariaLabel: t('tuner.ukulele') },
      ]} />
    <InstrumentDropdown label={t(profile.instrument === 'ukulele' ? 'etudes.tuning' : 'viewer.stringCount')}
      value={profile.id} onChange={selectProfile} menuMinWidth={112}
      title={profile.instrument === 'ukulele' ? profile.id.endsWith('high-g') ? 'High G' : 'Low G' : undefined}
      options={VIEWER_INSTRUMENTS[profile.instrument].map(id => ({
        id,
        ariaLabel: profile.instrument === 'ukulele' ? id.endsWith('high-g') ? 'High G' : 'Low G' : undefined,
        label: profile.instrument === 'ukulele' ? id.endsWith('high-g') ? 'Hi G' : 'Lo G' : t('viewer.strings', { count: getViewerProfile(id).stringCount }),
      }))} />
  </>;
}

export function MobileInstrumentControls(props) {
  return <div className="viewerInstrumentControls viewerInstrumentControls--mobile"><InstrumentFields {...props} /></div>;
}
export function TabletInstrumentControls(props) {
  return <div className="viewerInstrumentControls viewerInstrumentControls--tablet"><InstrumentFields {...props} /></div>;
}
export function DesktopInstrumentControls(props) {
  return <div className="viewerInstrumentControls viewerInstrumentControls--desktop"><InstrumentFields {...props} /></div>;
}
