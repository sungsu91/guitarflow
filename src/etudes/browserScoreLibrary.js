import ko from '../i18n/locales/ko.js';
import {LIBRARY_KEY,loadLibrary,saveLibraryDocument,renameLibraryDocument,deleteLibraryDocument} from './scoreLibrary.js';

export const SCORE_LIBRARY_DB='fretiva.score.library.v3';
const STORE='library';

// Reuse the same validation, title and migration rules as file/memory storage.
// The old localStorage values remain untouched as a recovery copy.
function snapshotStorage(raw,legacy){
 const values=new Map();
 if(raw!==undefined)values.set(LIBRARY_KEY,raw);
 return {getItem:key=>values.has(key)?values.get(key):legacy?.getItem(key)??null,setItem:(key,value)=>values.set(key,value)};
}
export function readLegacyScoreLibrary(bases=[],storage=globalThis.localStorage){
 return loadLibrary(snapshotStorage(undefined,storage),bases);
}
function openDatabase(factory){
 return new Promise((resolve,reject)=>{
  if(!factory){reject(Error(ko['etudes.thisBrowserCannotSaveLocallyExportAFileInstead']));return;}
  const request=factory.open(SCORE_LIBRARY_DB,1);let rejected=false;
  request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
  request.onerror=()=>reject(request.error);
  request.onblocked=()=>{rejected=true;reject(Error(ko['pdf.anotherWindowIsUsingTheScoreLibraryCloseItAndTryAgain']));};
  request.onsuccess=()=>{if(rejected){request.result.close();return;}resolve(request.result);};
 });
}
export function scoreStorageError(error){
 return error?.name==='QuotaExceededError'?ko['etudes.scoreStorageFull']:error?.message||ko['etudes.couldNotSaveTryAgain'];
}
// A storage refresh is not a score edit. Keep the document identity used by
// engraving/playback, while still accepting real changes from another tab.
export function reuseLibraryRecords(previous={},incoming={}){
 if(previous===incoming)return previous;
 const entries=Object.entries(incoming).map(([id,record])=>{
  const old=previous[id];
  if(!old||old===record)return [id,record];
  if(JSON.stringify(old)===JSON.stringify(record))return [id,old];
  if(old.document&&JSON.stringify(old.document)===JSON.stringify(record.document))return [id,{...record,document:old.document}];
  return [id,record];
 });
 return entries.length===Object.keys(previous).length&&entries.every(([id,record])=>previous[id]===record)?previous:Object.fromEntries(entries);
}
export function createBrowserScoreLibrary({indexedDB=globalThis.indexedDB,legacyStorage=()=>globalThis.localStorage,bases=[]}={}){
 let snapshot;
 const transact=async operation=>{
  const db=await openDatabase(indexedDB);
  return new Promise((resolve,reject)=>{
   let tx,result,failure,pendingSnapshot;
   try{tx=db.transaction(STORE,'readwrite');}catch(error){db.close();reject(error);return;}
   tx.oncomplete=()=>{if(pendingSnapshot)snapshot=pendingSnapshot;db.close();resolve(result);};
   tx.onabort=tx.onerror=()=>{db.close();reject(failure??tx.error??Error(ko['etudes.couldNotSaveTryAgain']));};
   const store=tx.objectStore(STORE);
   store.get(LIBRARY_KEY).onsuccess=e=>{
    try{
     const old=e.target.result;
     // Once migrated, never merge the stale backup again (including deleted scores).
     const storage=snapshotStorage(old,old===undefined?legacyStorage():null);
     const library=old!==undefined&&snapshot?.raw===old?snapshot.library:loadLibrary(storage,bases);
     if(library.errors.length)throw Error(library.errors.join(' '));
     result=operation?operation(storage):library;
     if(operation&&!result.saved)throw Error(result.errors?.join(' ')||ko['etudes.couldNotSaveTryAgain']);
     const next=storage.getItem(LIBRARY_KEY)??JSON.stringify({version:2,records:library.records});
     if(next!==old)store.put(next,LIBRARY_KEY);
     if(!operation){
      if(library!==snapshot?.library)result={...library,records:reuseLibraryRecords(snapshot?.library.records,library.records)};
      pendingSnapshot={raw:next,library:result};
     }
    }catch(error){failure=error;tx.abort();}
   };
  });
 };
 const mutate=async action=>{try{return await transact(action);}catch(error){return {saved:false,errors:[scoreStorageError(error)]};}};
 return {
  async load(){try{return await transact();}catch(error){return {version:2,records:{},errors:[scoreStorageError(error)]};}},
  save:document=>mutate(storage=>saveLibraryDocument(storage,document,bases)),
  rename:(id,title)=>mutate(storage=>renameLibraryDocument(storage,id,title,bases)),
  remove:id=>mutate(storage=>deleteLibraryDocument(storage,id,bases)),
 };
}
