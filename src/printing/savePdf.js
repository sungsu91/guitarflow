export function pdfFilename(title) {
 return (title.trim().replace(/\.pdf$/i,'').replace(/[\\/:*?"<>|]/g,'_')||'FRETIVA LAB')+'.pdf';
}

// Called by a fresh tap after generation, preserving iOS's share-sheet activation.
// A cancelled share leaves the prepared file available for another attempt.
export async function savePdf(blob,name,{mobile=false,target=window}={}) {
 const file=new target.File([blob],name,{type:'application/pdf'});
 if(mobile&&target.navigator.canShare?.({files:[file]})&&target.navigator.share){
  try{await target.navigator.share({files:[file]});return true;}
  catch(error){if(error.name==='AbortError')return false;throw error;}
 }
 const url=target.URL.createObjectURL(blob),link=target.document.createElement('a');
 link.href=url;link.download=name;target.document.body.append(link);link.click();link.remove();
 target.setTimeout(()=>target.URL.revokeObjectURL(url),60000);
 return true;
}
