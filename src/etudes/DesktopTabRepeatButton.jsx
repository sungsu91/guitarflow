import {t} from '../i18n/core.js';
import {useLanguage} from '../i18n/react.jsx';

export default function DesktopTabRepeatButton({state,hasRange,onToggle}) {
 useLanguage();
 return <button type="button" className="desktopTabRepeat" aria-pressed={state.enabled} disabled={!state.available}
  title={t(hasRange?'editor.tabRepeatRangeHint':'editor.tabRepeatBarHint')} onClick={onToggle}>
  {t('editor.tabRepeat')}
 </button>;
}
