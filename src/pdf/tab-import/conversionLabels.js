import {t} from '../../i18n/core.js';
export function conversionLabels(mode,target){
  if(target?.instrument==='bass'&&mode!=='tab')return {title:mode==='grand'?'피아노 양손 → 베이스 반주':'오선보 → 베이스 악보',description:'멜로디·코드는 선택한 튜닝의 저음 반주로, 베이스 오선보는 원본 파트로 변환합니다.'};
  if(mode==='grand')return {title:t('editor.grandImport'),description:t('editor.grandImportHint')};
  if(target?.instrument==='piano')return {title:t('editor.staffToPiano'),description:t('editor.pianoImportHint')};
  return {title:t(mode==='tab'?'editor.tabToTab':'editor.staffToTab'),description:t(mode==='tab'?'editor.tabConversionSummary':'editor.staffConversionSummary')};
}
