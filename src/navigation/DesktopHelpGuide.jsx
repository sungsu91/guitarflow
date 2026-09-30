import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, BookOpen, Search, Sparkles, X } from 'lucide-react';
import { localizeUi, t } from '../i18n/core.js';
import { useLanguage } from '../i18n/react.jsx';
import { HELP_GUIDE_UPDATES, HelpGuideFeatureNotes } from './HelpGuideFeatures.jsx';
import './desktop-help-guide.css';

export default function DesktopHelpGuide({ sections, groups, activeId, onSelect, onClose, credits, version }) {
  useLanguage();
  const [query, setQuery] = useState('');
  const reader = useRef(null);
  const selected = sections.find(section => section.id === activeId);
  const recent = !selected;
  const filtered = sections.filter(section => `${localizeUi(section.title)} ${localizeUi(section.summary)}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const grouped = useMemo(() => [...new Set(sections.map(section => section.group))], [sections]);
  useLayoutEffect(() => { if (reader.current) reader.current.scrollTop = 0; }, [activeId]);
  const select = id => { setQuery(''); onSelect(id); };

  return <section className="desktopHelpGuide" aria-label={t('app.userGuideHelp')}>
    <header className="desktopHelpHeader">
      <BookOpen size={28} aria-hidden="true" />
      <div><span>FRETIVA LAB GUIDE</span><h1>{t('app.guideHelp')}</h1></div>
      <button className="desktopHelpClose" type="button" aria-label={t('common.close')} onClick={onClose}><X size={22} aria-hidden="true" /></button>
    </header>
    <div className="desktopHelpBody">
      <aside className="desktopHelpContents">
        <label className="desktopHelpSearch"><Search size={17} aria-hidden="true" /><input type="search" aria-label={t('guide.search')} placeholder={t('guide.search')} value={query} onChange={event => setQuery(event.target.value)} /></label>
        <nav aria-label={t('guide.contents')}>
          <button className="desktopHelpRecent" type="button" aria-current={recent ? 'page' : undefined} onClick={() => select('recent-updates')}><Sparkles size={17} aria-hidden="true" />{t('guide.recent')}</button>
          {grouped.map(group => {
            const items = filtered.filter(section => section.group === group);
            return items.length ? <div className="desktopHelpNavGroup" key={group}>
              <h2>{localizeUi(groups[group])}</h2>
              {items.map(section => <button type="button" key={section.id} aria-current={activeId === section.id ? 'page' : undefined} onClick={() => select(section.id)}>{localizeUi(section.title)}</button>)}
            </div> : null;
          })}
          {!filtered.length && <p className="desktopHelpEmpty">{t('guide.noResults')}</p>}
        </nav>
        <small className="desktopHelpVersion">FRETIVA LAB · {version}</small>
      </aside>
      <div className="desktopHelpReader" ref={reader} tabIndex={0} role="region" aria-labelledby="desktop-guide-topic">
        <article className="desktopHelpArticle">
          <header className="desktopHelpTopic">
            <span>{recent ? t('guide.whatsNew') : localizeUi(groups[selected.group])}</span>
            <h2 id="desktop-guide-topic">{recent ? t('guide.recent') : localizeUi(selected.title)}</h2>
            <p>{recent ? t('guide.recentIntro') : localizeUi(selected.summary)}</p>
          </header>
          {recent ? <div className="desktopHelpUpdates">
            {HELP_GUIDE_UPDATES.map(update => <button key={update.id} type="button" onClick={() => select(update.section)}>
              <span className="desktopHelpUpdateCategory">{localizeUi(sections.find(section => section.id === update.section)?.title)}</span>
              <strong>{t(update.title)}</strong><p>{t(update.description)}</p>
              <span className="desktopHelpReadMore">{t('guide.readMore')}<ArrowUpRight size={16} aria-hidden="true" /></span>
            </button>)}
          </div> : <div className="desktopHelpContent">{selected.content}<HelpGuideFeatureNotes sectionId={selected.id} /></div>}
          <footer className="desktopHelpCredits">{credits}</footer>
        </article>
      </div>
    </div>
  </section>;
}
