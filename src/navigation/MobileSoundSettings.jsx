import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Translation, useLanguage } from '../i18n/react.jsx';
import { t } from '../i18n/core.js';
import './sound-settings.css';
import './mobile-sound-settings.css';

// Touch surfaces keep their own accordion and spacing; App owns all audio state.
export default function MobileSoundSettings({ children }) {
  useLanguage();
  return (
    <section className="utilitySoundPanel mobileSoundSettings soundSettings" aria-label={t('app.soundRhythm')}>
      <details className="utilitySoundDetails">
        <summary className="mobileSoundSettingsHeader">
          <span className="soundSettingsMark" aria-hidden="true"><SlidersHorizontal size={19} /></span>
          <span className="soundSettingsHeading">
            <small className="soundSettingsBrand">FRETIVA LAB</small>
            <strong><Translation id="app.soundRhythm" /></strong>
          </span>
          <ChevronDown className="mobileSoundSettingsChevron" size={18} aria-hidden="true" />
        </summary>
        {children}
      </details>
    </section>
  );
}
