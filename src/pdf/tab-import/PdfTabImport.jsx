import usePdfTabImport from './usePdfTabImport.js';
import MobilePdfTabImport from './MobilePdfTabImport.jsx';
import DesktopPdfTabImport from './DesktopPdfTabImport.jsx';
import {createPortal} from 'react-dom';
import GuitarArrangementDialog from '../../etudes/arrangement/GuitarArrangementDialog.jsx';

// Keep the job alive across layout changes; only presentation is replaced.
export default function PdfTabImport({mobile,...props}){
  const state=usePdfTabImport({...props,layout:mobile});
  const Layout=mobile?MobilePdfTabImport:DesktopPdfTabImport;
  // A nested editor's broad button/theme rules must not restyle this dialog.
  // The controller remains here, so changing layouts preserves the same job.
  return createPortal(<><Layout {...state}/>{state.arrangementDocument&&<GuitarArrangementDialog document={state.arrangementDocument} mobile={mobile} onClose={state.closeArrangement} onApply={state.applyArrangement}/>}</>,document.body);
}
