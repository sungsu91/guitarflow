import {t} from '../../i18n/core.js';
export default function PhotoScanNotice({result}){
 const kept=result?.imageSources?.filter(s=>s.scan?.enabled&&s.scanChoice==='original').map(s=>s.page)??[];
 return kept.length?<p className="photoScanNotice">{t('editor.photoScanKept',{value1:kept.join(', ')})}</p>:null;
}
