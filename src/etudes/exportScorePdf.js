import ko from "../i18n/locales/ko.js";
// Capture the same paginated A4 sheets used by print preview at 2x resolution.
export async function exportScorePdf(sheets,title){
 const [{default:html2canvas},{jsPDF}]=await Promise.all([import('html2canvas'),import('jspdf')]);
 const doc=sheets[0].ownerDocument;
 await doc.fonts.ready;
 await Promise.all([...doc.images].map(img=>img.decode?.().catch(()=>{})));
 const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
 for(let i=0;i<sheets.length;i++){
  const canvas=await html2canvas(sheets[i],{scale:2,backgroundColor:'#ffffff',logging:false,useCORS:true,
   onclone:cloned=>{cloned.querySelectorAll('.a4Sheet').forEach(p=>{p.style.transform='none';p.style.boxShadow='none';});cloned.querySelectorAll('.scoreSourceFrame').forEach(p=>{p.style.display='block';p.style.width='fit-content';p.style.marginLeft='auto';});cloned.querySelector('.previewToolbar')?.remove();}
  });
  if(i)pdf.addPage();pdf.addImage(canvas,'PNG',0,0,210,297,undefined,'FAST');canvas.width=canvas.height=0;
 }
 const blob=pdf.output('blob'),name=(title||ko["components.scores"]).replace(/[\\/:*?"<>|]/g,'_')+'.pdf';
 return {blob,name};
}
