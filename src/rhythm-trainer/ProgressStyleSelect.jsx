import React from 'react';
import {useLanguage} from '../i18n/react.jsx';
export default function ProgressStyleSelect({value,onChange}) {
 const language=useLanguage();const t=(ko,en)=>language==='ko'?ko:en;
 return <label>{t('진행 표시','Progress display')}<select aria-label={t('진행 표시 타입','Progress display style')} value={value} onChange={e=>onChange(Number(e.target.value))}>
 <option value={1}>{t('타입 1 · 진행선 + 음표','Style 1 · Cursor + notes')}</option><option value={2}>{t('타입 2 · 음표','Style 2 · Notes')}</option><option value={3}>{t('타입 3 · 음표 아래 점','Style 3 · Dots below notes')}</option><option value={4}>{t('타입 4 · 현재 박 영역','Style 4 · Current beat')}</option><option value={5}>{t('타입 5 · 세는 칸 영역','Style 5 · Counting cell')}</option>
 </select></label>;
}
