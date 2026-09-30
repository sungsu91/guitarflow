import {t} from '../i18n/core.js';
import {Translation,useLanguage} from '../i18n/react.jsx';
import './desktopEditorTools.css';

export default function DesktopPickingControls({scope,onScope,pattern,onPattern,skipLegato,onSkipLegato,measures,currentBar,endBar,onEndBar,onApply}){
 useLanguage();
 return <section className="desktopPickingBatch" aria-label={t('etudes.batchPicking')}>
  <strong><Translation id="editor.pickingBatchTitle" /></strong>
  <div className={`desktopPickingFields${scope==='range'?' has-range':''}`}>
   <label><Translation id="etudes.applyTo" /><select aria-label={t('etudes.pickingRange')} value={scope} onChange={e=>onScope(e.target.value)}>
    <option value="all"><Translation id="etudes.entireScore" /></option><option value="bar"><Translation id="etudes.currentBarScoreEditor" /></option><option value="range"><Translation id="etudes.currentBarThroughSpecifiedBar" /></option>
   </select></label>
   {scope==='range'&&<label><Translation id="app.endBar" /><select aria-label={t('etudes.pickingEndBar')} value={endBar} onChange={e=>onEndBar(Number(e.target.value))}>{measures.map((m,i)=>i>=currentBar&&<option key={m.id} value={i}>{i+1}<Translation id="app.bar" /></option>)}</select></label>}
   <label className="desktopPickingPattern"><Translation id="etudes.pickingPattern" /><select aria-label={t('etudes.batchPickingPattern')} value={pattern} onChange={e=>onPattern(e.target.value)}>
    <option value="alternate-down"><Translation id="etudes.alternateDownUpScoreEditor" /></option><option value="alternate-up"><Translation id="etudes.alternateUpDown" /></option><option value="down"><Translation id="etudes.allDown" /></option><option value="up"><Translation id="etudes.allUp" /></option><option value="clear"><Translation id="etudes.clearPickingMarks" /></option>
   </select></label>
  </div>
  <label className="etudeEditorCheck"><input type="checkbox" checked={skipLegato} onChange={e=>onSkipLegato(e.target.checked)}/><Translation id="etudes.skipPickingOnHPSlDestinationNotes" /></label>
  <p><Translation id="editor.pickingScopeHint" /></p>
  <button type="button" onClick={onApply}><Translation id="etudes.applyPickingPattern" /></button>
 </section>;
}
