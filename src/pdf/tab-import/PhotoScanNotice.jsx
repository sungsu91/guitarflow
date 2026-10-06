import {t} from '../../i18n/core.js';
export default function PhotoScanNotice({result}){
 const kept=result?.imageSources?.filter(s=>s.scan?.enabled&&s.scanChoice==='original').map(s=>s.page)??[];
 const corrected=result?.imageSources?.filter(s=>s.scan?.enabled&&s.scanChoice!=='original').map(s=>s.page)??[];
 const plain=result?.imageSources?.filter(s=>s.scan?.enabled===false).map(s=>s.page)??[];
 return <>{[['editor.photoScanKept',kept],['editor.photoScanUsed',corrected],['editor.photoScanPlain',plain]].filter(([,pages])=>pages.length).map(([key,pages])=><p className="photoScanNotice" key={key}>{t(key,{value1:pages.join(', ')})}</p>)}</>;
}
