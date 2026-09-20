import {useEffect,useRef,useState} from 'react';
import {scoreMetadata} from './scoreMetadata.js';
import './scoreSave.css';

export default function ScoreSaveDialog({document,onSave,onClose,mode='save'}){
 const editing=mode==='edit';
 const [meter,setMeter]=useState(document.meter.join('/')),[keySignature,setKeySignature]=useState(document.keySignature),[view,setView]=useState(document.viewSettings?.notationView??'tab');
 const ref=useRef(null),[title,setTitle]=useState(document.title),[artist,setArtist]=useState(document.artist??''),[bpm,setBpm]=useState(document.bpm),[error,setError]=useState('');
 useEffect(()=>{const dialog=ref.current;dialog.showModal();return()=>dialog.close();},[]);
 const submit=e=>{e.preventDefault();try{onSave(scoreMetadata({...document,meter:meter.split('/').map(Number),keySignature,viewSettings:{...document.viewSettings,notationView:view}},{title,artist,bpm}));}catch(e){setError(e.message);}};
 return <dialog ref={ref} className="scoreSaveDialog" aria-label={editing?"악보 설정":"악보 저장 정보"} onKeyDown={e=>e.stopPropagation()} onCancel={e=>{e.preventDefault();e.stopPropagation();onClose();}}>
  <form onSubmit={submit}><h2>{editing?"악보 설정":"악보 저장"}</h2><p>{editing?"현재 작업에 적용합니다. 최종 저장은 상단 저장 버튼을 눌러주세요.":"제목과 곡 정보가 악보 첫 페이지 상단에 표시됩니다."}</p>
   <label>악보 제목<input autoFocus required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label>
   <label>작곡가 / 아티스트 <small>선택</small><input maxLength={200} value={artist} onChange={e=>setArtist(e.target.value)}/></label>
   <label>BPM<input required type="number" min={30} max={240} step={1} value={bpm} onChange={e=>setBpm(e.target.value)}/></label>
   <div className="scoreSettingsGrid"><label>박자표<select aria-label="박자표" value={meter} onChange={e=>setMeter(e.target.value)}>{[...new Set(['2/4','3/4','4/4','6/8',document.meter.join('/')])].map(v=><option key={v}>{v}</option>)}</select></label><label>조표<select aria-label="조표" value={keySignature} onChange={e=>setKeySignature(e.target.value)}>{[...new Set(['C','G','D','A','E','B','F','Bb','Eb','Am','Em','Dm','Gm',document.keySignature])].map(v=><option key={v}>{v}</option>)}</select></label></div>
   <label>보표 보기<select aria-label="보표 보기" value={view} onChange={e=>setView(e.target.value)}><option value="tab">TAB만</option><option value="both">오선보+TAB</option><option value="staff">오선보만</option></select></label>
   {error&&<p role="alert">{error}</p>}<footer><button type="button" onClick={onClose}>취소</button><button type="submit">{editing?"적용":"저장하기"}</button></footer>
  </form>
 </dialog>;
}
