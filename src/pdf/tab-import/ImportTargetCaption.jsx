import {scoreInstrument} from '../../etudes/scoreInstruments.js';
import {midiName} from '../../etudes/scoreTuning.js';
import {t} from '../../i18n/core.js';

export default function ImportTargetCaption({target,children}){
  if(!target&&!children)return null;
  return <div className="pdfImportTarget" aria-label={t('editor.importTarget')}>
    {children??<strong>{t('editor.importTarget')}: {scoreInstrument(target.instrument).label}{target.tuning.length?` · ${t('editor.importStringCount',{value1:target.tuning.length})}`:''}</strong>}
    {target?.tuning.length>0&&<span>{[...target.tuning].reverse().map(midiName).join(' · ')}{target.capo?` · ${t('editor.importCapo',{value1:target.capo})}`:''}</span>}
    {children&&<small>{t('editor.importTargetHint')}</small>}
    {target?.instrument==='bass'&&<small>선택한 베이스 설정으로 변환합니다. 멜로디·코드 악보는 저음 반주로, 베이스 TAB·낮은음자리표는 원본 파트로 가져옵니다.</small>}
  </div>;
}
