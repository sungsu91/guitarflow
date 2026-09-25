import { useRef, useState, useLayoutEffect } from 'react';
import { Settings, X, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../i18n/react.jsx';

// Only presentation state lives here; settings and navigation remain owned by App.
export default function MobileUtilityMenu({ onClose, settings, pro, basic, dev, footer }) {
  const language = useLanguage();
  const en = language === 'en';
  const [category, setCategory] = useState('all');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsButton = useRef(null);
  const sheet = useRef(null);
  const categories = [['all', en ? 'All' : '전체'], ['basic', en ? 'Basic' : '기본'], ['pro', 'PRO'], ['dev', 'DEV']];
  const closeSettings = () => { setSettingsOpen(false); settingsButton.current?.focus({ preventScroll: true }); };
  useLayoutEffect(() => {
    if (settingsOpen) sheet.current?.querySelector('button')?.focus({ preventScroll: true });
  }, [settingsOpen]);
  return <>
    <div className="utilityMenuMain" inert={settingsOpen ? true : undefined}>
      <header className="utilityMenuHeader">
        <strong>{en ? 'Menu' : '메뉴'}</strong>
        <div className="utilityMenuActions">
          <button ref={settingsButton} type="button" aria-label={en ? 'Settings' : '설정'} aria-expanded={settingsOpen} aria-controls="utility-settings" onClick={() => setSettingsOpen(true)}><Settings size={21} /></button>
          <button type="button" aria-label={en ? 'Close menu' : '메뉴 닫기'} onClick={onClose}><X size={22} /></button>
        </div>
      </header>
      <div className="utilityCategoryTabs" role="tablist" aria-label={en ? 'Feature categories' : '기능 카테고리'}>
        {categories.map(([id, label], index) => <button key={id} id={`menu-tab-${id}`} role="tab" type="button" aria-selected={category === id} aria-controls="utility-feature-list" tabIndex={category === id ? 0 : -1} onClick={() => setCategory(id)} onKeyDown={event => {
          const next = event.key === 'ArrowRight' ? (index + 1) % 4 : event.key === 'ArrowLeft' ? (index + 3) % 4 : event.key === 'Home' ? 0 : event.key === 'End' ? 3 : null;
          if (next === null) return;
          event.preventDefault(); setCategory(categories[next][0]); event.currentTarget.parentElement.children[next].focus();
        }}>{label}</button>)}
      </div>
      <div className="utilityMenuBody" id="utility-feature-list" role="tabpanel" aria-labelledby={`menu-tab-${category}`}>
        <nav className="utilityMenuList" aria-label={en ? 'Features' : '기능'}>
          {[[ 'pro', 'PRO', pro ], [ 'basic', en ? 'Basic learning' : '기본 학습', basic ], [ 'dev', en ? 'DEV · In development' : 'DEV · 개발 중', dev ]].map(([id, label, content]) => category === 'all' || category === id ? <section className="utilityFeatureGroup" key={id}><h3>{label}</h3>{content}</section> : null)}
        </nav>
      </div>
      <nav className="utilityMenuFooter" aria-label={en ? 'Help and contact' : '도움말 및 문의'}>{footer}</nav>
    </div>
    {settingsOpen && <section ref={sheet} id="utility-settings" className="utilitySettingsSheet" role="dialog" aria-modal="true" aria-label={en ? 'Settings' : '설정'} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeSettings(); }
    }}>
      <header className="utilityMenuHeader"><button type="button" aria-label={en ? 'Back to menu' : '메뉴로 돌아가기'} onClick={closeSettings}><ArrowLeft size={21} /></button><strong>{en ? 'Settings' : '설정'}</strong><button type="button" aria-label={en ? 'Close settings' : '설정 닫기'} onClick={closeSettings}><X size={22} /></button></header>
      <div className="utilitySettingsBody">{settings}</div>
    </section>}
  </>;
}
