import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
import {normalizeInstrumentDocument} from './scoreInstruments.js';
import {EDITS_STORAGE_KEY,toScoreDocument,compileScoreDocument} from './scoreDocument.js';
import {upgradeDocument,hasEditableShape} from './scoreModel.js';
export const LIBRARY_KEY='fretiva.etude.library.v2';
const validEnvelope=v=>v&&v.version===2&&v.records&&typeof v.records==='object'&&!Array.isArray(v.records);
export function loadLibrary(storage,bases=[]) {
 try{
  const raw=storage.getItem(LIBRARY_KEY);
  if(raw){const library=JSON.parse(raw);if(!validEnvelope(library))throw Error('invalid library');const records=Object.fromEntries(Object.entries(library.records).map(([key,r])=>[key,r?.status==='unreadable'?r:hasEditableShape(r?.document)?{...r,document:normalizeInstrumentDocument(r.document)}:{document:{id:key,title:typeof r?.document?.title==='string'?r.document.title:ko["etudes.unreadableScore"]},status:'unreadable',raw:r,updatedAt:r?.updatedAt??null}]));return {...library,records,errors:[]};}
  const previous=JSON.parse(storage.getItem(EDITS_STORAGE_KEY)||'{}'),records={};
  if(!previous||typeof previous!=='object'||Array.isArray(previous))throw Error('invalid old library');
  for(const [key,old] of Object.entries(previous)){const base=bases.find(b=>b.templateId===key);try{const legacy=old.version===1&&base?compileScoreDocument(old,base):null;const document=legacy?.score?toScoreDocument(legacy.score):old.version===2?normalizeInstrumentDocument(old):upgradeDocument(old);if(old.version===1)document.keySignature=base?.keySignature??'C';records[document.id]={document,status:'draft',updatedAt:null};}catch{records[`unreadable-${key}`]={document:{id:`unreadable-${key}`,title:formatMessage(ko["etudes.previousScoreValue"], { value1: key })},raw:old,status:'unreadable',updatedAt:null};}}
  const library={version:2,records};
  // Only mark migrated after the full write succeeds. The v1 key is never removed.
  if(Object.keys(records).length)storage.setItem(LIBRARY_KEY,JSON.stringify(library));
  return {...library,errors:[]};
 }catch{return {version:2,records:{},errors:[ko["etudes.couldNotReadOrMigrateTheScoreLibraryExistingSavedDataHas"]]};}
}
export function uniqueLibraryTitle(records,title,id){
 const base=String(title??'').trim().slice(0,200)||ko["etudes.newScore"];
 const titles=new Set(Object.entries(records).filter(([key])=>key!==id).map(([,r])=>String(r.document?.title??'').trim()));
 if(!titles.has(base))return base;
 const stem=base.replace(/ \(\d+\)$/,'');
 for(let i=1;;i++){const suffix=` (${i})`,candidate=stem.slice(0,200-suffix.length)+suffix;if(!titles.has(candidate))return candidate;}
}
export function saveLibraryDocument(storage,document,bases=[]) {
 document=normalizeInstrumentDocument(document);
 try{if(!document?.id||!hasEditableShape(document))throw Error(ko["etudes.checkTheScoreIdBarsAndNoteStructure"]);const library=loadLibrary(storage,bases);if(library.errors.length)throw Error(library.errors.join(' '));document={...document,title:uniqueLibraryTitle(library.records,document.title,document.id)};const checked=compileScoreDocument(document,bases.find(b=>b.templateId===document.templateId));const status=checked.score&&!checked.issues?.length?'saved':'draft';const record={...library.records[document.id],document:structuredClone(document),status,createdAt:library.records[document.id]?.createdAt??new Date().toISOString(),updatedAt:new Date().toISOString()};const next={version:2,records:{...library.records,[document.id]:record}};storage.setItem(LIBRARY_KEY,JSON.stringify(next));return {...checked,record,saved:true};}
 catch(error){return {saved:false,errors:[formatMessage(ko["etudes.couldNotSaveValueExportAFileToKeepACopy"], { value1: error.message })]};}
}
export function originalDocument(base){return toScoreDocument(base);}
function changeLibraryRecord(storage,id,change,bases=[]){
 try{const library=loadLibrary(storage,bases);if(library.errors.length)throw Error(library.errors.join(' '));
  const old=library.records[id];if(!old)throw Error(ko["etudes.savedScoreNotFound"]);
  const records={...library.records},next=change(old,library.records);if(next)records[id]=next;else delete records[id];
  storage.setItem(LIBRARY_KEY,JSON.stringify({version:2,records}));return {saved:true};
 }catch(error){return {saved:false,errors:[formatMessage(ko["etudes.couldNotUpdateTheLibraryValue"], { value1: error.message })]};}
}
export const renameLibraryDocument=(storage,id,title,bases=[])=>changeLibraryRecord(storage,id,(r,records)=>{
 const value=String(title).trim();if(!value)throw Error(ko["etudes.enterATitle"]);
 return {...r,document:{...r.document,title:uniqueLibraryTitle(records,value,id)},updatedAt:new Date().toISOString()};
},bases);
export const deleteLibraryDocument=(storage,id,bases=[])=>changeLibraryRecord(storage,id,()=>null,bases);
export const markLibraryPracticed=(storage,id,bases=[])=>changeLibraryRecord(storage,id,r=>({...r,lastPracticedAt:new Date().toISOString()}),bases);
