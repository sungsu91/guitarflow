import {useId} from 'react';
import {t} from '../../i18n/core.js';
import {useLanguage} from '../../i18n/react.jsx';
import {conversionLabels} from './conversionLabels.js';
export default function StaffImportOptions({sourceMode,changeSourceMode,opening,targetError,target,compact=false}){
  useLanguage();const id=useId();
  return <fieldset className="staffImportOptions" data-compact={compact} aria-label={t('editor.scoreConversionMode')} disabled={opening||!!targetError}>
    <legend className="pdfImportStep"><span aria-hidden="true">1</span>{t('editor.chooseConversionMode')}</legend>
    <div className="scoreConversionChoices">
      {['staff','tab','grand'].map(mode=><label key={mode} className="scoreConversionChoice" data-mode={mode} data-selected={sourceMode===mode}>
        <span className="scoreConversionChoiceHeading"><input type="radio" name={id} value={mode} checked={sourceMode===mode} onChange={()=>changeSourceMode(mode)} aria-label={conversionLabels(mode,mode==='tab'?null:target).title} aria-describedby={compact?undefined:`${id}-${mode}`}/><strong>{conversionLabels(mode,mode==='tab'?null:target).title}</strong></span>
        {!compact&&<span id={`${id}-${mode}`} className="scoreConversionChoiceDescription">{conversionLabels(mode,mode==='tab'?null:target).description}</span>}
      </label>)}
    </div>
    {!compact&&<p className="scoreConversionHelp">{t('editor.combinedScoreConversionHint')}</p>}
  </fieldset>;
}
