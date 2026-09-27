import {grayscaleCanvas} from './grayscale.js';

export async function exportPreviewPdf(root,{signal,onProgress=()=>{}}={}) {
 const check=()=>signal?.throwIfAborted();
 const yieldPage=()=>new Promise(resolve=>setTimeout(resolve,0));
 const [{jsPDF},{default:html2canvas}]=await Promise.all([import('jspdf'),import('html2canvas')]);
 check();await root.ownerDocument.fonts.ready;
 await Promise.all([...root.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));check();
 const pages=[...root.querySelectorAll('[data-print-page]')];
 if(!pages.length)throw Error('No preview pages');
 const pdf=new jsPDF({unit:'mm',format:'a4',compress:true});
 for(const [index,page] of pages.entries()){
  check();onProgress(index+1,pages.length);await yieldPage();check();
  const canvas=await html2canvas(page,{
   scale:2,backgroundColor:'#ffffff',windowWidth:1000,logging:false,useCORS:true,
   // Do not clone the running trainer or the editor behind the preview.
   ignoreElements:el=>el.parentElement===root.ownerDocument.body&&!el.contains(root),
   onclone:doc=>{
    doc.querySelectorAll('[data-print-page]').forEach(el=>{el.style.transform='none';el.style.boxShadow='none';});
    doc.querySelectorAll('[data-print-frame]').forEach(el=>{el.style.width='794px';el.style.height='1123px';});
    doc.querySelectorAll('.scoreSourceFrame').forEach(el=>{el.style.display='block';el.style.width='fit-content';el.style.marginLeft='auto';});
    doc.querySelectorAll('[data-selected]').forEach(el=>el.removeAttribute('data-selected'));
    doc.querySelectorAll('[contenteditable]').forEach(el=>el.removeAttribute('contenteditable'));
   }
  });
  try{check();grayscaleCanvas(canvas);if(index)pdf.addPage();pdf.addImage(canvas,'PNG',0,0,210,297,undefined,'FAST');}
  finally{canvas.width=canvas.height=0;}
 }
 await yieldPage();check();return pdf.output('blob');
}
