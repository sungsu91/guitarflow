import usePdfTabImport from './usePdfTabImport.js';
import MobilePdfTabImport from './MobilePdfTabImport.jsx';
import DesktopPdfTabImport from './DesktopPdfTabImport.jsx';

// Keep the job alive across layout changes; only presentation is replaced.
export default function PdfTabImport({mobile,...props}){
  const state=usePdfTabImport({...props,layout:mobile});
  const Layout=mobile?MobilePdfTabImport:DesktopPdfTabImport;
  return <Layout {...state}/>;
}
