import {useEffect,useRef,useState} from 'react';
import {drawTabImage} from './imageTabSource.js';
import {t} from '../../i18n/core.js';
import {useLanguage} from '../../i18n/react.jsx';
import './tabPhotoPreview.css';

export default function TabPhotoPreview({photos,photo,photoIndex,setPhotoIndex,rotation,rotatePhoto,movePhoto,removePhoto,opening}){
  useLanguage();const preview=useRef(null),[failed,setFailed]=useState(false);
  useEffect(()=>{
    const image=new Image(),canvas=preview.current;setFailed(false);
    image.onload=()=>{let rendered;try{rendered=drawTabImage({image,width:image.naturalWidth,height:image.naturalHeight},rotation,560);canvas.width=rendered.width;canvas.height=rendered.height;canvas.getContext('2d').drawImage(rendered,0,0);}catch{setFailed(true);}finally{if(rendered)rendered.width=rendered.height=0;}};
    image.onerror=()=>setFailed(true);image.src=photo.preview;
    return()=>{image.onload=image.onerror=null;image.src='';canvas.width=canvas.height=0;};
  },[photo,rotation]);
  return <section className="tabPhotoPreview" aria-label={t('editor.photoPreview')}>
    <label>{t('editor.photoPages',{value1:photos.length})}<select aria-label={t('editor.photoPageOrder')} disabled={opening} value={photoIndex} onChange={e=>setPhotoIndex(Number(e.target.value))}>{photos.map((p,index)=><option key={p.id} value={index}>{index+1}. {p.fileName}</option>)}</select></label>
    <p>{photo.fileName}</p><canvas ref={preview} role="img" aria-label={t('editor.photoPreview')}/>
    {failed&&<p>{t('editor.photoPreviewFailed')}</p>}
    <div className="tabPhotoPageActions"><button type="button" disabled={opening||photoIndex===0} onClick={()=>movePhoto(-1)}>{t('editor.photoMoveUp')}</button><button type="button" disabled={opening||photoIndex===photos.length-1} onClick={()=>movePhoto(1)}>{t('editor.photoMoveDown')}</button><button type="button" disabled={opening} onClick={rotatePhoto}>{t('editor.photoRotate')}</button><button type="button" disabled={opening} onClick={removePhoto}>{t('common.delete')}</button></div>
    <p>{t('editor.photoHint')}</p>
  </section>;
}
