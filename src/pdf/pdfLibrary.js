export const PDF_DB = 'fretiva.pdf.library.v1';
export const PDF_MAX_BYTES = 100 * 1024 * 1024;
const stores = ['scores', 'files'];
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(Error('이 브라우저에서는 IndexedDB를 사용할 수 없습니다.'));
    const r = indexedDB.open(PDF_DB, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('scores', {keyPath:'id'}).createIndex('fingerprint', 'fingerprint', {unique:true});
      r.result.createObjectStore('files', {keyPath:'id'});
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(Error('다른 창에서 악보 보관함을 사용 중입니다. 창을 닫고 다시 시도하세요.'));
  });
}
async function transaction(mode, action) {
  const db = await openDatabase();
  return new Promise((resolve,reject) => {
    let tx;try{tx=db.transaction(stores,mode);}catch(error){db.close();reject(error);return;}
    let result;
    tx.oncomplete = () => {db.close();resolve(result);};
    tx.onabort = tx.onerror = () => {db.close();reject(tx.fretivaError ?? tx.error ?? Error('악보 저장 작업에 실패했습니다.'));};
    try { action(tx, value => {result=value;}); } catch(error) {tx.abort();db.close();reject(error);}
  });
}
export const listPdfs = () => transaction('readonly',(tx,done) => {tx.objectStore('scores').getAll().onsuccess=e=>done(e.target.result);});
export const getPdf = id => transaction('readonly',(tx,done) => {tx.objectStore('files').get(id).onsuccess=e=>done(e.target.result?.pdfBlob);});
export const deletePdf = id => transaction('readwrite',tx => {for(const name of stores)tx.objectStore(name).delete(id);});
export const findPdf = fingerprint => transaction('readonly',(tx,done) => {tx.objectStore('scores').index('fingerprint').get(fingerprint).onsuccess=e=>done(e.target.result);});
export function savePdf(record, pdfBlob) {
  return transaction('readwrite',tx => {tx.objectStore('scores').put(record);if(pdfBlob)tx.objectStore('files').put({id:record.id,pdfBlob});});
}
export function patchPdf(id, patch) {
  return transaction('readwrite',(tx,done) => {
    const store=tx.objectStore('scores');
    store.get(id).onsuccess=e=>{try{const old=e.target.result;if(!old)throw Error('삭제되었거나 없는 PDF입니다.');const next={...old,...patch,id:old.id,fingerprint:old.fingerprint,updatedAt:new Date().toISOString()};store.put(next);done(next);}catch(error){tx.fretivaError=error;tx.abort();}};
  });
}
export function storageError(error) {
  if(error?.name==='QuotaExceededError')return '저장 공간이 부족합니다. 원본을 내보낸 후 불필요한 악보를 삭제하고 다시 저장하세요.';
  if(error?.name==='ConstraintError')return '같은 PDF가 이미 보관함에 있습니다.';
  return `저장소 오류: ${error?.message??error}. 저장되지 않은 변경은 이 화면에 남아 있습니다.`;
}
export async function fingerprintPdf(blob) {
  if(!blob.size || blob.size>PDF_MAX_BYTES)throw Error('PDF는 100MB 이하 파일을 선택하세요.');
  const bytes=await blob.arrayBuffer();
  if(!new TextDecoder().decode(bytes.slice(0,1024)).includes('%PDF-'))throw Error('올바른 PDF 파일이 아닙니다.');
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function downloadBlob(blob,name) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name.replace(/[<>:"/\\|?*]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
// Binary backup: bounded JSON manifest followed by unmodified PDF bytes.
// Blobs are never base64-encoded or stored in localStorage.
export async function exportPdfLibrary() {
  const records=await listPdfs(),files=[];for(const r of records){const blob=await getPdf(r.id);if(!blob)throw Error('원본이 없는 악보가 있습니다.');files.push(blob);}
  const meta=new TextEncoder().encode(JSON.stringify({format:'fretiva-pdf-backup',version:1,records:records.map((r,i)=>({...r,byteLength:files[i].size}))}));
  const length=new ArrayBuffer(4);new DataView(length).setUint32(0,meta.length);
  return new Blob([length,meta,...files],{type:'application/octet-stream'});
}
export async function readBackup(blob) {
  const length=new DataView(await blob.slice(0,4).arrayBuffer()).getUint32(0);
  if(length>20*1024*1024||length<10||length+4>blob.size)throw Error('백업 파일 형식이 올바르지 않습니다.');
  const data=JSON.parse(await blob.slice(4,4+length).text());
  if(data.format!=='fretiva-pdf-backup'||data.version!==1||!Array.isArray(data.records)||data.records.length>1000)throw Error('지원하지 않는 백업입니다.');
  let offset=4+length;const result=[];
  for(const record of data.records){if(!Number.isInteger(record.byteLength)||record.byteLength<=0||record.byteLength>PDF_MAX_BYTES||offset+record.byteLength>blob.size)throw Error('백업의 원본 크기를 확인하세요.');const pdfBlob=blob.slice(offset,offset+record.byteLength,'application/pdf');offset+=record.byteLength;result.push({record,pdfBlob});}
  if(offset!==blob.size)throw Error('백업 파일 길이가 올바르지 않습니다.');return result;
}
