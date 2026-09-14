import {EDITS_STORAGE_KEY,toScoreDocument,compileScoreDocument} from './scoreDocument.js';
import {upgradeDocument,hasEditableShape} from './scoreModel.js';
export const LIBRARY_KEY='fretiva.etude.library.v2';
const validEnvelope=v=>v&&v.version===2&&v.records&&typeof v.records==='object'&&!Array.isArray(v.records);
export function loadLibrary(storage,bases=[]) {
 try{
  const raw=storage.getItem(LIBRARY_KEY);
  if(raw){const library=JSON.parse(raw);if(!validEnvelope(library))throw Error('invalid library');const records=Object.fromEntries(Object.entries(library.records).map(([key,r])=>[key,r?.status==='unreadable'||hasEditableShape(r?.document)?r:{document:{id:key,title:typeof r?.document?.title==='string'?r.document.title:'읽을 수 없는 악보'},status:'unreadable',raw:r,updatedAt:r?.updatedAt??null}]));return {...library,records,errors:[]};}
  const previous=JSON.parse(storage.getItem(EDITS_STORAGE_KEY)||'{}'),records={};
  if(!previous||typeof previous!=='object'||Array.isArray(previous))throw Error('invalid old library');
  for(const [key,old] of Object.entries(previous)){const base=bases.find(b=>b.templateId===key);try{const legacy=old.version===1&&base?compileScoreDocument(old,base):null;const document=legacy?.score?toScoreDocument(legacy.score):old.version===2?old:upgradeDocument(old);if(old.version===1)document.keySignature=base?.keySignature??'C';records[document.id]={document,status:'draft',updatedAt:null};}catch{records[`unreadable-${key}`]={document:{id:`unreadable-${key}`,title:`이전 악보 ${key}`},raw:old,status:'unreadable',updatedAt:null};}}
  const library={version:2,records};
  // Only mark migrated after the full write succeeds. The v1 key is never removed.
  if(Object.keys(records).length)storage.setItem(LIBRARY_KEY,JSON.stringify(library));
  return {...library,errors:[]};
 }catch{return {version:2,records:{},errors:['악보 보관함을 읽거나 이관하지 못했습니다. 기존 저장 데이터는 삭제하지 않았습니다.']};}
}
export function saveLibraryDocument(storage,document,bases=[]) {
 try{if(!document?.id||!hasEditableShape(document))throw Error('악보의 ID·마디·음표 구조를 확인하세요');const library=loadLibrary(storage,bases);if(library.errors.length)throw Error(library.errors.join(' '));const checked=compileScoreDocument(document,bases.find(b=>b.templateId===document.templateId));const status=checked.score&&!checked.issues?.length?'saved':'draft';const record={document:structuredClone(document),status,updatedAt:new Date().toISOString()};const next={version:2,records:{...library.records,[document.id]:record}};storage.setItem(LIBRARY_KEY,JSON.stringify(next));return {...checked,record,saved:true};}
 catch(error){return {saved:false,errors:[`저장 실패: ${error.message}. 파일로 내보내 보관하세요.`]};}
}
export function originalDocument(base){return toScoreDocument(base);}
