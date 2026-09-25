import {useEffect,useRef,useState} from 'react';
import {t} from '../i18n/core.js';
import {Translation,useLanguage} from '../i18n/react.jsx';

export default function PickerManageDialog({action,folders,onApply,onClose}){
 useLanguage();
 const ref=useRef(null),[value,setValue]=useState(action.name??''),[target,setTarget]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{ref.current.showModal();},[]);
 const deleting=action.type==='remove'||action.type==='delete-score',moving=action.type==='move';
 const title=moving?t('score.moveFolder'):action.type==='create'?t('pdf.newFolder'):action.type==='remove'?t('pdf.deleteFolder'):action.type==='delete-score'?t('pdf.deleteScore'):t('audioStudio.rename');
 const apply=async e=>{e.preventDefault();setBusy(true);setError('');try{await onApply({...action,name:value.trim(),folderId:target});onClose();}catch(e){setError(e.message);}finally{setBusy(false);}};
 return <dialog ref={ref} className="pdfDialog pickerManageDialog" aria-label={title} onCancel={e=>{e.preventDefault();if(!busy)onClose();}}><form onSubmit={apply}><h2>{title}</h2>
 {moving?<label><Translation id="pdf.destinationFolder"/><select value={target} onChange={e=>setTarget(e.target.value)}><option value=""><Translation id="pdf.myScoresDefaultLocation"/></option>{folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>:deleting?<p>{action.type==='remove'?`‘${action.name}${t('pdf.folderDeleteItItsScoresWillMoveToMyScoresAndWill')}`:t('pdf.deleteValue1Value2FromThisDevice',{value1:action.entry.title,value2:action.entry.pdf?t('pdf.originalPdfAndSettings'):t('pdf.editableScore')})}</p>:<label>{t(action.type==='create'||action.type==='rename'?'pdf.folderName':'app.title')}<input autoFocus required maxLength={action.type==='rename-score'?200:100} value={value} onChange={e=>setValue(e.target.value)}/></label>}
 {error&&<p role="alert">{error}</p>}<footer><button type="button" disabled={busy} onClick={onClose}><Translation id="common.cancel"/></button><button type="submit" disabled={busy||(!deleting&&!moving&&!value.trim())}>{t(deleting?'common.delete':moving?'pdf.move':'common.save')}</button></footer></form></dialog>;
}
