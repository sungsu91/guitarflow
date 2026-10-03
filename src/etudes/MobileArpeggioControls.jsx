import {t} from '../i18n/core.js';
import {useLanguage} from '../i18n/react.jsx';
import {ARPEGGIO_PATTERNS,arpeggioSequence} from './arpeggioPattern.js';
import './mobileArpeggioControls.css';

export default function MobileArpeggioControls({controls:c}){
 useLanguage();
 return <div className="mobileArpeggioControls">
  <label className="arpeggioPatternChoice">{t('editor.arpPattern')}<select aria-label={t('editor.arpPattern')} value={c.pattern} onChange={e=>c.setPattern(e.target.value)}>{ARPEGGIO_PATTERNS.map(p=><option key={p.id} value={p.id} disabled={!c.compatiblePatterns.includes(p.id)}>{t(p.label)}</option>)}</select></label>
  <p className="arpeggioRhythmSummary">{t('editor.arpFixedRhythm',{value1:c.patternSpec.duration})}</p>
  <div className="mobileArpeggioFields">

   <label>{t('etudes.applyTo')}<select aria-label={t('editor.arpRange')} value={c.scope} onChange={e=>c.setScope(e.target.value)}><option value="bar">{t('etudes.currentBarScoreEditor')}</option><option value="range">{t('etudes.currentBarThroughSpecifiedBar')}</option><option value="all">{t('etudes.entireScore')}</option></select></label>
   {c.scope==='range'&&<label>{t('app.endBar')}<select aria-label={t('editor.arpEndBar')} value={c.endBar} onChange={e=>c.setEndBar(Number(e.target.value))}>{c.measures.map((m,i)=>i>=c.currentBar&&<option key={m.id} value={i}>{i+1}{t('app.bar')}</option>)}</select></label>}
  </div>
  <p>{t('editor.arpFollowChords')}</p>
  {c.progressionLabel&&<output className="arpeggioProgression">{c.progressionLabel}</output>}
  {c.needsChord&&<div className="arpeggioChordPrompt"><p role="status">{c.error}</p><button type="button" onClick={c.onEditChord}>{t('editor.arpEditChord')}</button></div>}
  {c.plans.length>0&&<output className="arpeggioPreview">{arpeggioSequence(c.plans[0])}<br/>{t('editor.arpRepeatCount',{value1:c.plans[0].repeats})}</output>}
  {c.pattern.includes('pinch')||c.pattern.includes('slap')?<p>{t('editor.arpPinchHint')}</p>:null}
  <p>{t('editor.arpReplaceHint')}</p>
  {c.error&&!c.needsChord&&<p role="status">{c.error}</p>}
  <button type="button" disabled={Boolean(c.error)} onClick={c.onApply}>{t('editor.arpApply')}</button>
 </div>;
}
