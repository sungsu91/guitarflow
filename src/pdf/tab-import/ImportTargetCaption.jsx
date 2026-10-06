import {scoreInstrument} from '../../etudes/scoreInstruments.js';
import {midiName} from '../../etudes/scoreTuning.js';
import {t} from '../../i18n/core.js';

export default function ImportTargetCaption({target,children}){
  if(!target&&!children)return null;
  return <div className="pdfImportTarget" aria-label={t('editor.importTarget')}>
    {children??<strong>{t('editor.importTarget')}: {scoreInstrument(target.instrument).label}{target.tuning.length?` · ${t('editor.importStringCount',{value1:target.tuning.length})}`:''}</strong>}
    {target?.tuning.length>0&&<span>{[...target.tuning].reverse().map(midiName).join(' · ')}{target.capo?` · ${t('editor.importCapo',{value1:target.capo})}`:''}</span>}
    {children&&<small>{t('editor.importTargetHint')}</small>}
  </div>;
}
