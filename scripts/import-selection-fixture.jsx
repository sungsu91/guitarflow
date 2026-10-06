import React from 'react';
import {createRoot} from 'react-dom/client';
import PdfTabImport from '../src/pdf/tab-import/PdfTabImport.jsx';
const root=createRoot(document.getElementById('root'));let revision=0;
function Harness({target}){
 const [mobile,setMobile]=React.useState(innerWidth<600);
 React.useEffect(()=>{const resize=()=>setMobile(innerWidth<600);addEventListener('resize',resize);return()=>removeEventListener('resize',resize);},[]);
 return <PdfTabImport mobile={mobile} target={target} onClose={()=>root.render(null)} onOpen={doc=>{window.openedDocument=doc;}}/>;
}
window.mountImport=target=>root.render(<Harness key={++revision} target={target}/>);
window.mountImport();
