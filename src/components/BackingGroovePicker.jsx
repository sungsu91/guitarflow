import { useEffect, useState } from 'react';
import { Check, Pause, Play, Search } from 'lucide-react';
import { localizeUi, t as translateUi } from '../i18n/core.js';
import ko from '../i18n/locales/ko.js';
import { Translation, useLanguage } from '../i18n/react.jsx';
import { GROOVE_CATEGORIES } from '../metronome/recommendedGrooves.js';
import { useBackingGroovePreview } from '../backing-loop/useBackingGroovePreview.js';
import './backing-groove-browser.css';

export default function BackingGroovePicker({ controller }) {
  useLanguage();
  const [tab, setTab] = useState('recommended');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ko['app.all']);
  const [selectedId, setSelectedId] = useState('');
  const preview = useBackingGroovePreview(controller.backingVolume);
  const packs = controller.library.filter(item => item.sourceType === 'groove');
  const visible = packs.filter(pack => (
    (tab === 'recommended' ? pack.builtin : !pack.builtin)
    && (tab !== 'recommended' || category === ko['app.all'] || pack.category === category)
    && pack.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  ));
  const queued = new Set(controller.activePlaylist.itemIds);
  const selected = visible.find(pack => pack.id === selectedId);
  const busy = ['armed', 'recording', 'requesting', 'processing', 'trimming', 'applying', 'saving', 'loading'].includes(controller.phase);

  useEffect(() => {
    preview.stop();
    setSelectedId('');
  }, [tab, query, category]);
  useEffect(() => {
    if (preview.active && !packs.some(pack => pack.id === preview.active)) preview.stop();
  }, [controller.library, preview.active]);

  return (
    <section className="backingGrooveBrowser" aria-label={translateUi('components.chooseBackingGroovePack')}>
      <div className="backingGrooveBrowserTabs" role="group" aria-label={translateUi('components.packType')}>
        {[[ 'recommended', ko['components.recommended'] ], [ 'saved', ko['components.myPacks'] ]].map(([id, label]) => (
          <button key={id} type="button" aria-pressed={tab === id} onClick={() => {
            setTab(id);
            setQuery('');
            setCategory(ko['app.all']);
          }}>{localizeUi(label)}</button>
        ))}
      </div>
      <label className="backingGrooveBrowserSearch">
        <Search aria-hidden="true" size={14} />
        <input type="search" aria-label={translateUi('components.searchBackingPacks')} placeholder={translateUi('components.searchPacks')} value={query} onChange={event => setQuery(event.target.value)} />
      </label>
      {tab === 'recommended' && (
        <div className="backingGrooveBrowserCategories" aria-label={translateUi('components.packCategory')}>
          {GROOVE_CATEGORIES.map(item => (
            <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>
              {localizeUi(item === ko['components.popBallad'] ? ko['components.pop'] : item === ko['components.funkDisco'] ? ko['components.funk'] : item)}
            </button>
          ))}
        </div>
      )}
      <p className="backingGrooveBrowserHint"><Translation id="components.grooveDirectSelectionHint" /></p>
      <div className="backingGrooveBrowserTracks">
        {visible.map(pack => (
          <div className="backingGrooveBrowserTrack" key={pack.id}>
            <button className="backingGrooveBrowserSelect" type="button" disabled={busy} aria-pressed={selected?.id === pack.id} aria-label={translateUi('components.selectValue1', { value1: pack.title })} onClick={() => {
              if (preview.active && preview.active !== pack.id) preview.stop();
              setSelectedId(pack.id);
            }}>
              <span><strong>{pack.title}</strong><small>{pack.bpm} BPM{pack.category ? ` · ${localizeUi(pack.category)}` : ''}</small></span>
              {queued.has(pack.id) && <Check size={14} aria-label={translateUi('components.alreadyInList')} />}
            </button>
            <button className="backingGrooveBrowserPlay" type="button" disabled={busy} aria-pressed={preview.active === pack.id} aria-busy={preview.active === pack.id && preview.loading} aria-label={`${pack.title} ${translateUi(preview.active === pack.id ? 'components.stopPreview' : 'components.preview')}`} onClick={() => {
              setSelectedId(pack.id);
              preview.play(pack.id);
            }}>
              {preview.active === pack.id ? <Pause aria-hidden="true" size={15} /> : <Play aria-hidden="true" size={15} />}
            </button>
          </div>
        ))}
        {!visible.length && <p className="backingGrooveBrowserEmpty">{query ? translateUi('components.noResults') : tab === 'saved' ? translateUi('components.noSavedPacks') : translateUi('components.noMatchingPacks')}</p>}
      </div>
      {preview.error && <small role="alert">{localizeUi(preview.error)}</small>}
      <footer className="backingGrooveBrowserApply">
        <span>{selected ? `${selected.title} · ${selected.bpm} BPM` : translateUi('components.choosePack')}</span>
        <button type="button" disabled={!selected || busy} onClick={() => {
          preview.stop();
          controller.applyGroovePack(selected.id);
        }}><Check aria-hidden="true" size={14} /><Translation id="app.apply" /></button>
      </footer>
    </section>
  );
}
