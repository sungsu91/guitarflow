import { useLanguage } from '../i18n/react.jsx';
import { t } from '../i18n/core.js';
import { VIEWER_INSTRUMENTS, getViewerProfile } from './instruments.js';
import InstrumentDropdown from '../components/InstrumentDropdown.jsx';
import './learning-instruments.css';

function InstrumentSelect({profile,onProfile,disabled}) {
  useLanguage();
  const options = Object.values(VIEWER_INSTRUMENTS).flat().map(id=>{
      const item=getViewerProfile(id);
      const name=t(item.instrument==='guitar'?'app.guitar':item.instrument==='bass'?'tuner.bass':'viewer.ukuleleShort');
      const variant=item.instrument==='ukulele'?(id.endsWith('high-g')?'Hi G':'Lo G'):t('viewer.strings',{count:item.stringCount});
      return { id, label: `${name} ${variant}` };
    });
  return <div className="learningInstrumentField"><span>{t('viewer.instrument')}</span>
    <InstrumentDropdown label={t('shooter.playingInstrument')} value={profile.id} onChange={onProfile} disabled={disabled} options={options} />
  </div>;
}
export function MobileLearningInstrumentControls(props) { return <div className="learningInstrumentControls learningInstrumentControls--mobile"><InstrumentSelect {...props}/></div>; }
export function TabletLearningInstrumentControls(props) { return <div className="learningInstrumentControls learningInstrumentControls--tablet"><InstrumentSelect {...props}/></div>; }
export function DesktopLearningInstrumentControls(props) { return <div className="learningInstrumentControls learningInstrumentControls--desktop"><InstrumentSelect {...props}/></div>; }
