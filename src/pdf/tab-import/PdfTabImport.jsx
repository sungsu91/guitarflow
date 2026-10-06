import usePdfTabImport from './usePdfTabImport.js';
import MobilePdfTabImport from './MobilePdfTabImport.jsx';
import DesktopPdfTabImport from './DesktopPdfTabImport.jsx';
import {createPortal} from 'react-dom';
import GuitarArrangementDialog from '../../etudes/arrangement/GuitarArrangementDialog.jsx';
import BassArrangementDialog from '../../etudes/arrangement/BassArrangementDialog.jsx';

// Keep the job alive across layout changes; only presentation is replaced.
export default function PdfTabImport({mobile,...props}){
  const state=usePdfTabImport({...props,layout:mobile});
  const Layout=mobile?MobilePdfTabImport:DesktopPdfTabImport;
  const Arrangement=state.arrangementReview?.reviewInstrument==='bass'?BassArrangementDialog:GuitarArrangementDialog;
  // A nested editor's broad button/theme rules must not restyle this dialog.
  // The controller remains here, so changing layouts preserves the same job.
  return createPortal(<><Layout {...state}/>{state.arrangementDocument&&<Arrangement initialError={state.arrangementReview?.reviewMessage} target={state.arrangementReview?.target} sourceCapo={state.arrangementReview?0:undefined} document={state.arrangementDocument} mobile={mobile} onClose={state.closeArrangement} onApply={state.applyArrangement}/>}</>,document.body);
}
