import PhotoScanPreview from './PhotoScanPreview.jsx';
import {t} from '../../i18n/core.js';
import {useLanguage} from '../../i18n/react.jsx';
import './tabPhotoPreview.css';

export default function TabPhotoPreview({photos,photo,photoIndex,setPhotoIndex,rotation,rotatePhoto,movePhoto,removePhoto,updatePhotoScan,opening,mobile=false}){
  useLanguage();
  return <section className="tabPhotoPreview" aria-label={t('editor.photoPreview')}>
    <label>{t('editor.photoPages',{value1:photos.length})}<select aria-label={t('editor.photoPageOrder')} disabled={opening} value={photoIndex} onChange={e=>setPhotoIndex(Number(e.target.value))}>{photos.map((p,index)=><option key={p.id} value={index}>{index+1}. {p.fileName}</option>)}</select></label>
    <p>{photo.fileName}</p><PhotoScanPreview {...{photo,rotation,updatePhotoScan,opening,mobile}}/>
    <div className="tabPhotoPageActions"><button type="button" disabled={opening||photoIndex===0} onClick={()=>movePhoto(-1)}>{t('editor.photoMoveUp')}</button><button type="button" disabled={opening||photoIndex===photos.length-1} onClick={()=>movePhoto(1)}>{t('editor.photoMoveDown')}</button><button type="button" disabled={opening} onClick={rotatePhoto}>{t('editor.photoRotate')}</button><button type="button" disabled={opening} onClick={removePhoto}>{t('common.delete')}</button></div>
  </section>;
}
