import {t} from '../../i18n/core.js';
export function conversionLabels(mode,target){
  if(mode==='grand')return {title:t('editor.grandImport'),description:t('editor.grandImportHint')};
  if(target?.instrument==='piano')return {title:t('editor.staffToPiano'),description:t('editor.pianoImportHint')};
  return {title:t(mode==='tab'?'editor.tabToTab':'editor.staffToTab'),description:t(mode==='tab'?'editor.tabConversionSummary':'editor.staffConversionSummary')};
}
