import {summarizeAnalysis} from './recognition.js';

export const IMPORT_PAGE_BATCH=2;
const fileIds=new WeakMap();let nextFileId=0;
// A newly selected File must never reuse a different file's cached readings,
// even if its name, byte length and modification date happen to match.
export function importFileKey(file){
  if(!fileIds.has(file))fileIds.set(file,++nextFileId);
  return fileIds.get(file);
}
export function photoImportKey(photo){return JSON.stringify([importFileKey(photo.file),photo.rotation,photo.scan??null]);}
export function retainImportPages(resume,count,totalPages=resume?.totalPages){
  if(!resume?.checkpoint)return null;
  const trimmed={...resume,checkpoint:{...resume.checkpoint,entries:resume.checkpoint.entries.slice(0,count)}};
  const keys=Array.from({length:totalPages},(_,i)=>resume.checkpoint.keys[i]??null);
  return createImportCheckpoint({base:resume,keys,settings:JSON.parse(resume.checkpoint.signature),resume:trimmed}).snapshot();
}
export function createImportCheckpoint({base,keys,settings,resume,onCheckpoint=()=>{}}){
  const signature=JSON.stringify(settings),prior=resume?.checkpoint;
  const entries=[];
  if(prior?.signature===signature){
    for(let i=0;i<Math.min(keys.length,prior.entries.length);i++){
      if(prior.keys[i]!==keys[i]||prior.entries[i].page.page!==i+1)break;
      entries.push(prior.entries[i]);
    }
  }
  const snapshot=()=>{
    const pages=entries.map(e=>e.page),totalPages=keys.length,complete=pages.length===totalPages;
    const coverage={complete,completed:pages.length,totalPages,nextPage:complete?null:pages.length+1};
    return {...base,...coverage,pages,summary:{...summarizeAnalysis(pages),pageCoverage:coverage},
      ...(base.sourceType==='image'?{imageSources:entries.map(e=>e.source)}:{}),
      checkpoint:{signature,keys:[...keys],entries:[...entries]}};
  };
  return {
    get count(){return entries.length;},
    get context(){return structuredClone(entries.at(-1)?.context??{});},
    snapshot,
    publish(){const value=snapshot();onCheckpoint(value);return value;},
    commit(page,context,source){
      if(page.page!==entries.length+1)throw Error('페이지 순서가 달라 이어서 분석할 수 없습니다.');
      entries.push({page,source,context:structuredClone(context)});
      return this.publish();
    },
  };
}
export function pageBatchEnd(completed,total,limit=Infinity){
  if(limit!==Infinity&&(!Number.isInteger(limit)||limit<1))throw Error('페이지 묶음 크기는 1 이상이어야 합니다.');
  return Math.min(total,completed+limit);
}
