import useBassArrangement from './useBassArrangement.js';
import DesktopBassArrangement from './DesktopBassArrangement.jsx';
import MobileBassArrangement from './MobileBassArrangement.jsx';
export default function BassArrangementDialog({document,mobile,onApply,onClose,initialError,target,sourceCapo}){
 const controls=useBassArrangement(document,onApply,onClose,mobile,{initialError,target,sourceCapo});
 return mobile?<MobileBassArrangement controls={controls}/>:<DesktopBassArrangement controls={controls}/>;
}
