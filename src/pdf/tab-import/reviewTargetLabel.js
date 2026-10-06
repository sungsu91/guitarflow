import {t} from '../../i18n/core.js';

export function reviewTargetLabel(target){
  if(!target)return '';
  return t('editor.reviewMeasure',{value1:target.cursor.bar+1})+' · '+target.reasons.map(reason=>t(`editor.reviewReason.${reason}`)).join(' · ');
}
