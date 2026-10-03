import {t} from '../../i18n/core.js';
import {useLanguage} from '../../i18n/react.jsx';
export default function StaffImportOptions({sourceMode,changeSourceMode,opening}){
  useLanguage();return <div className="staffImportOptions">
    <label>{t('editor.scoreConversionMode')}<select aria-label={t('editor.scoreConversionMode')} disabled={opening} value={sourceMode} onChange={e=>changeSourceMode(e.target.value)}><option value="staff">{t('editor.staffToTab')}</option><option value="tab">{t('editor.tabToTab')}</option></select></label>
    <p className="scoreConversionHelp">{t(sourceMode==='tab'?'editor.tabToTabHelp':'editor.staffToTabHelp')}</p>
  </div>;
}
