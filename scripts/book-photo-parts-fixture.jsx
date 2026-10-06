import React from 'react';
import {createRoot} from 'react-dom/client';
import PdfTabImport from '../src/pdf/tab-import/PdfTabImport.jsx';
function Harness(){
 const [mobile,setMobile]=React.useState(innerWidth<600);
 React.useEffect(()=>{const resize=()=>setMobile(innerWidth<600);addEventListener('resize',resize);return()=>removeEventListener('resize',resize);},[]);
 return <PdfTabImport mobile={mobile} onClose={()=>{}} onOpen={doc=>{window.openedDocument=doc;}}/>;
}
createRoot(document.getElementById('root')).render(<Harness/>);
