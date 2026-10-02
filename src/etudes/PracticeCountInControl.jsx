import {Translation,useLanguage} from '../i18n/react.jsx';
import './practiceCountIn.css';

export default function PracticeCountInControl({checked,onChange}){
 useLanguage();
 return <label className="practiceCountInControl"><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><span><Translation id="pdf.countIn"/></span></label>;
}
