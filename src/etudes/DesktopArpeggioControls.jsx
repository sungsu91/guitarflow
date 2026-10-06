import {t} from '../i18n/core.js';
import {useLanguage} from '../i18n/react.jsx';
import {ARPEGGIO_PATTERNS,arpeggioSequence} from './arpeggioPattern.js';
import './desktopArpeggioControls.css';

export default function DesktopArpeggioControls({controls:c}){
 useLanguage();
 return <div className="desktopArpeggioControls">
  <label className="arpeggioPatternChoice">{t('editor.arpPattern')}<select aria-label={t('editor.arpPattern')} value={c.pattern} onChange={e=>c.setPattern(e.target.value)}>{ARPEGGIO_PATTERNS.map(p=><option key={p.id} value={p.id} disabled={!c.compatiblePatterns.includes(p.id)}>{t(p.label)}</option>)}</select></label>
  <p>{t('editor.arpHelp')}</p>
  <p className="arpeggioRhythmSummary">{t('editor.arpFixedRhythm',{value1:c.patternSpec.duration})}</p>
  <div className="desktopArpeggioFields">

   <label>{t('etudes.applyTo')}<select aria-label={t('editor.arpRange')} value={c.scope} onChange={e=>c.setScope(e.target.value)}><option value="bar">{t('etudes.currentBarScoreEditor')}</option><option value="range">{t('etudes.currentBarThroughSpecifiedBar')}</option><option value="all">{t('etudes.entireScore')}</option></select></label>
   {c.scope==='range'&&<label>{t('app.endBar')}<select aria-label={t('editor.arpEndBar')} value={c.endBar} onChange={e=>c.setEndBar(Number(e.target.value))}>{c.measures.map((m,i)=>i>=c.currentBar&&<option key={m.id} value={i}>{i+1}{t('app.bar')}</option>)}</select></label>}
  </div>
  <p>{t('editor.arpFollowChords')}</p>
  {c.progressionLabel&&<output className="arpeggioProgression">{c.progressionLabel}</output>}
  <div className="desktopArpeggioChords" role="group" aria-label={t('editor.arpBarChords')}>
   <strong>{t('editor.arpBarChords')}</strong><p>{t('editor.arpBarChordsHint')}</p>
   <div className="arpeggioBarChords">{c.chordBars.map(b=><button key={b.id} type="button" aria-label={t('editor.arpEditBarChord',{value1:b.bar+1})} onClick={()=>c.onEditBarChord(b.bar)}><span>{b.bar+1}{t('app.bar')}</span><strong>{b.name||t('editor.arpEnterChord')}</strong><small>{t(b.inherited?'editor.arpInheritedChord':'editor.arpChangeChord')}</small></button>)}</div>
   {c.nextChordBar!==null&&<button type="button" className="arpeggioNextChord" onClick={()=>c.onEditBarChord(c.nextChordBar)}>{t('editor.arpNextChord',{value1:c.nextChordBar+1})} →</button>}
  </div>
  {c.needsChord&&<div className="arpeggioChordPrompt"><p role="status">{c.error}</p><button type="button" onClick={c.onEditChord}>{t('editor.arpEditChord')}</button></div>}
  {c.plans.length>0&&<output className="arpeggioPreview">{arpeggioSequence(c.plans[0])}<br/>{t('editor.arpRepeatCount',{value1:c.plans[0].repeats})}</output>}
  {c.pattern.includes('pinch')||c.pattern.includes('slap')?<p>{t('editor.arpPinchHint')}</p>:null}
  <p>{t('editor.arpReplaceHint')}</p>
  {c.error&&!c.needsChord&&<p role="status">{c.error}</p>}
  <button type="button" disabled={Boolean(c.error)} onClick={c.onApply}>{t('editor.arpApply')}</button>
 </div>;
}
