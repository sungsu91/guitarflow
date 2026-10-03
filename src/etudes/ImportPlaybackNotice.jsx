import {t} from '../i18n/core.js';
import {useLanguage} from '../i18n/react.jsx';
import './importPlaybackNotice.css';

export default function ImportPlaybackNotice({playback,mobile}){
  useLanguage();
  if(!playback?.mutedMeasures?.length)return null;
  const bars=playback.mutedMeasures.map(bar=>bar+1),value1=bars.slice(0,8).join(' · ')+(bars.length>8?' …':'');
  const message=t(playback.allowed?'editor.importPreviewMuted':'editor.importPreviewBlocked',{value1});
  if(mobile)return <div className="mobileImportPlaybackNotice" role="status"><strong>{t('editor.importPreviewTitle')}</strong><span>{message}</span></div>;
  return <div className="desktopImportPlaybackNotice" role="status"><strong>{t('editor.importPreviewTitle')}</strong><span>{message}</span></div>;
}
