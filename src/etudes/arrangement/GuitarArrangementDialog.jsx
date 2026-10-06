import useGuitarArrangement from './useGuitarArrangement.js';
import DesktopGuitarArrangement from './DesktopGuitarArrangement.jsx';
import MobileGuitarArrangement from './MobileGuitarArrangement.jsx';
export default function GuitarArrangementDialog({document,mobile,onApply,onClose}){
 const controls=useGuitarArrangement(document,onApply,onClose,mobile);
 return mobile?<MobileGuitarArrangement controls={controls}/>:<DesktopGuitarArrangement controls={controls}/>;
}
