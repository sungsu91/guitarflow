import { setLanguage, t } from './core.js';
import { useLanguage } from './react.jsx';

export default function LanguageSettings({ desktop = false }) {
  const language = useLanguage();
  if (desktop) {
    return (
      <label className="desktopSidebarSoundRow desktopSidebarLanguage">
        <span><strong>{t('settings.language')}</strong></span>
        <select aria-label={t('settings.language')} value={language} onChange={event => setLanguage(event.target.value)}>
          <option value="ko">한국어</option>
          <option value="en">English</option>
        </select>
      </label>
    );
  }
  return (
    <section className="utilityThemePanel" aria-label={t('settings.language')}>
      <div className="utilityThemeHeader"><div><strong>{t('settings.language')}</strong></div></div>
      <div className="utilityThemeOptions" role="radiogroup" aria-label={t('settings.language')}>
        {['ko', 'en'].map(value => (
          <button key={value} type="button" role="radio" aria-checked={language === value} className={language === value ? 'selected' : ''} onClick={() => setLanguage(value)}>
            <strong>{value === 'ko' ? '한국어' : 'English'}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
