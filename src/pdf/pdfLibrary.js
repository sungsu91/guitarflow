import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
export const PDF_DB = 'fretiva.pdf.library.v1';
export const PDF_MAX_BYTES = 100 * 1024 * 1024;
const stores = ['scores', 'files'];
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(Error(ko["pdf.indexeddbIsUnavailableInThisBrowser"]));
    const r = indexedDB.open(PDF_DB, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('scores', {keyPath:'id'}).createIndex('fingerprint', 'fingerprint', {unique:true});
      r.result.createObjectStore('files', {keyPath:'id'});
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(Error(ko["pdf.anotherWindowIsUsingTheScoreLibraryCloseItAndTryAgain"]));
  });
}
async function transaction(mode, action) {
  const db = await openDatabase();
  return new Promise((resolve,reject) => {
    let tx;try{tx=db.transaction(stores,mode);}catch(error){db.close();reject(error);return;}
    let result;
    tx.oncomplete = () => {db.close();resolve(result);};
    tx.onabort = tx.onerror = () => {db.close();reject(tx.fretivaError ?? tx.error ?? Error(ko["pdf.couldnTSaveTheScore"]));};
    try { action(tx, value => {result=value;}); } catch(error) {tx.abort();db.close();reject(error);}
  });
}
export const listPdfs = () => transaction('readonly',(tx,done) => {tx.objectStore('scores').getAll().onsuccess=e=>done(e.target.result);});
export const getPdf = id => transaction('readonly',(tx,done) => {tx.objectStore('files').get(id).onsuccess=e=>done(e.target.result?.pdfBlob);});
export const deletePdf = id => transaction('readwrite',tx => {for(const name of stores)tx.objectStore(name).delete(id);});
export const findPdf = fingerprint => transaction('readonly',(tx,done) => {tx.objectStore('scores').index('fingerprint').get(fingerprint).onsuccess=e=>done(e.target.result);});
export function uniquePdfTitle(records,title,id){
 const base=String(title??'').trim()||'PDF',titles=new Set(records.filter(r=>r.id!==id).map(r=>r.title));
 if(!titles.has(base))return base;
 for(let i=1;;i++){const candidate=`${base} (${i})`;if(!titles.has(candidate))return candidate;}
}
export function savePdf(record, pdfBlob) {
 return transaction('readwrite',(tx,done)=>{const store=tx.objectStore('scores');store.getAll().onsuccess=e=>{const next={...record,title:uniquePdfTitle(e.target.result,record.title,record.id)};store.put(next);if(pdfBlob)tx.objectStore('files').put({id:next.id,pdfBlob});done(next);};});
}
export function patchPdf(id, patch) {
  return transaction('readwrite',(tx,done) => {
    const store=tx.objectStore('scores');
    store.get(id).onsuccess=e=>{try{const old=e.target.result;if(!old)throw Error(ko["pdf.thisPdfWasDeletedOrDoesNotExist"]);const next={...old,...patch,id:old.id,fingerprint:old.fingerprint,updatedAt:new Date().toISOString()};store.put(next);done(next);}catch(error){tx.fretivaError=error;tx.abort();}};
  });
}
export function storageError(error) {
  if(error?.name==='QuotaExceededError')return ko["pdf.storageIsFullExportOriginalsDeleteUnneededScoresAndSaveAgain"];
  if(error?.name==='ConstraintError')return ko["pdf.thisPdfIsAlreadyInTheLibrary"];
  return formatMessage(ko["pdf.storageErrorValue1UnsavedChangesRemainOnThisScreen"], { value1: error?.message??error });
}
export async function validatePdfFile(blob){
 if(!blob.size||blob.size>PDF_MAX_BYTES)throw Error(ko["pdf.chooseAPdfOf100MbOrLess"]);
 if(!new TextDecoder().decode(await blob.slice(0,1024).arrayBuffer()).includes('%PDF-'))throw Error(ko["pdf.thisIsNotAValidPdfFile"]);
}
export async function fingerprintPdf(blob) {
  if(!blob.size || blob.size>PDF_MAX_BYTES)throw Error(ko["pdf.chooseAPdfOf100MbOrLess"]);
  const bytes=await blob.arrayBuffer();
  if(!new TextDecoder().decode(bytes.slice(0,1024)).includes('%PDF-'))throw Error(ko["pdf.thisIsNotAValidPdfFile"]);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function downloadBlob(blob,name) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name.replace(/[<>:"/\\|?*]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
// Binary backup: bounded JSON manifest followed by unmodified PDF bytes.
// Blobs are never base64-encoded or stored in localStorage.
export async function exportPdfLibrary() {
  const records=await listPdfs(),files=[];for(const r of records){const blob=await getPdf(r.id);if(!blob)throw Error(ko["pdf.aScoreSOriginalFileIsMissing"]);files.push(blob);}
  return packPdfPractice(records,files);
}
export function exportPdfPractice(record,blob) {
  return packPdfPractice([record],[blob]);
}
function packPdfPractice(records,files) {
  const meta=new TextEncoder().encode(JSON.stringify({format:'fretiva-pdf-backup',version:1,records:records.map((r,i)=>({...r,byteLength:files[i].size}))}));
  if(meta.length>20*1024*1024)throw Error(ko["pdf.invalidBackupFormat"]);
  const length=new ArrayBuffer(4);new DataView(length).setUint32(0,meta.length);
  return new Blob([length,meta,...files],{type:'application/octet-stream'});
}
export async function readBackup(blob) {
  if(blob.size<4)throw Error(ko["pdf.invalidBackupFormat"]);
  const length=new DataView(await blob.slice(0,4).arrayBuffer()).getUint32(0);
  if(length>20*1024*1024||length<10||length+4>blob.size)throw Error(ko["pdf.invalidBackupFormat"]);
  let data;try{data=JSON.parse(await blob.slice(4,4+length).text());}catch{throw Error(ko["pdf.invalidBackupFormat"]);}
  if(!data||typeof data!=='object'||data.format!=='fretiva-pdf-backup'||data.version!==1||!Array.isArray(data.records)||data.records.length>1000)throw Error(ko["pdf.unsupportedBackup"]);
  let offset=4+length;const result=[];
  for(const record of data.records){if(!record||typeof record!=='object'||Array.isArray(record)||!Number.isInteger(record.byteLength)||record.byteLength<=0||record.byteLength>PDF_MAX_BYTES||offset+record.byteLength>blob.size)throw Error(ko["pdf.checkTheOriginalFileSizeInTheBackup"]);const pdfBlob=blob.slice(offset,offset+record.byteLength,'application/pdf');offset+=record.byteLength;result.push({record,pdfBlob});}
  if(offset!==blob.size)throw Error(ko["pdf.invalidBackupFileLength"]);return result;
}

export function pdfPracticeFilename(title,date=new Date()){
 const stamp=date.toISOString().replace(/[-:]/g,'').replace('T','-').replace('Z','');
 return `${String(title).replace(/\.pdf$/i,'')} (Practice ${stamp}).fretiva-pdf`;
}
