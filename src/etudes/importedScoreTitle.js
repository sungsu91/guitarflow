// File/page labels describe the source, not the song printed above the score.
// Keep musical numbers and meaningful subtitles such as (Live) or (Acoustic).
export function importedScoreTitle(fileName){
  const stem=String(fileName??'').split(/[\\/]/).at(-1).replace(/\.(pdf|jpe?g|png)$/i,'');
  let title=stem.normalize('NFC').replace(/^TalkFile[_\s-]+/i,'').replace(/_+/g,' ').replace(/\s+/g,' ').trim();
  let previous;
  do{
    previous=title;
    title=title.replace(/\s+(?:[-–·]\s*)?(?:페이지|pages?|p)\s*[:_-]?\s*\d+(?:\s*(?:of|\/)\s*\d+)?\s*$/iu,'')
      .replace(/\s*[\[(]\s*(?:코드|타브|TAB|chords?)\s*[\])]\s*$/iu,'').trim();
  }while(title!==previous);
  return title.slice(0,200)||stem.trim().slice(0,200)||'불러온 악보';
}

// Only migrate the exact title the importer used to generate. A user-entered
// title, recognition review status, and all score content remain authoritative.
export function normalizeImportedScoreTitle(document){
  const fileName=document?.pdfTabImport?.fileName;
  if(typeof fileName!=='string'||typeof document.title!=='string')return document;
  const legacy=fileName.replace(/\.(pdf|jpe?g|png)$/i,'')+' · TAB 초안';
  if(!document.title.startsWith(legacy))return document;
  const suffix=document.title.slice(legacy.length);
  if(suffix&&!/^ \(\d+\)$/.test(suffix))return document;
  const title=importedScoreTitle(fileName)+suffix;
  return {...document,title,...(document.english===legacy||document.english===document.title?{english:title}:{})};
}
