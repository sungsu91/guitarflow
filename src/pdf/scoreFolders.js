export const SCORE_FOLDERS_KEY='fretiva.score.folders.v1';
export const scoreFileKey=item=>`${item.type}:${item.id}`;
const empty=()=>({version:1,folders:[],locations:{},favorites:{}});
export function loadScoreFolders(storage){
 const raw=storage.getItem(SCORE_FOLDERS_KEY);if(!raw)return empty();
 const data=JSON.parse(raw);
 if(data.version!==1||!Array.isArray(data.folders)||!data.locations||typeof data.locations!=='object'||Array.isArray(data.locations))throw Error('폴더 정보를 읽을 수 없습니다. 기존 저장 정보는 유지됩니다.');
 const ids=new Set();
 for(const f of data.folders){if(!f||typeof f.id!=='string'||!f.id||ids.has(f.id)||typeof f.name!=='string'||!f.name.trim())throw Error('폴더 정보 형식을 확인하세요.');ids.add(f.id);}
 for(const [key,id] of Object.entries(data.locations))if(!/^(pdf|score):.+/.test(key)||typeof id!=='string'||!ids.has(id))throw Error('악보의 폴더 연결 정보를 확인하세요.');
 if(data.favorites!==undefined&&(!data.favorites||typeof data.favorites!=='object'||Array.isArray(data.favorites)||Object.entries(data.favorites).some(([key,value])=>!/^(pdf|score):.+/.test(key)||value!==true)))throw Error('즐겨찾기 정보를 확인하세요.');
 return {...data,favorites:data.favorites??{}};
}
export function updateScoreFolders(storage,operation){
 // Re-read immediately before the synchronous write so another tab's folders survive.
 const next=structuredClone(loadScoreFolders(storage));
 const name=()=>{const value=String(operation.name??'').trim();if(!value||value.length>100)throw Error('폴더 이름은 1–100자로 입력하세요.');if(next.folders.some(f=>f.id!==operation.id&&f.name===value))throw Error('같은 이름의 폴더가 있습니다.');return value;};
 if(operation.type==='create'){const value=name();if(next.folders.some(f=>f.id===operation.id))throw Error('이미 존재하는 폴더입니다.');next.folders.push({id:operation.id,name:value,createdAt:new Date().toISOString()});}
 else if(operation.type==='rename'){const folder=next.folders.find(f=>f.id===operation.id);if(!folder)throw Error('폴더가 없습니다.');folder.name=name();}
 else if(operation.type==='remove'){next.folders=next.folders.filter(f=>f.id!==operation.id);for(const key of Object.keys(next.locations))if(next.locations[key]===operation.id)delete next.locations[key];}
 else if(operation.type==='move'){
  if(operation.folderId&&!next.folders.some(f=>f.id===operation.folderId))throw Error('이동할 폴더가 없습니다.');
  for(const key of operation.keys){if(!/^(pdf|score):.+/.test(key))throw Error('악보 식별자가 잘못되었습니다.');if(operation.folderId)next.locations[key]=operation.folderId;else delete next.locations[key];}
 }else if(operation.type==='favorite'){
  for(const key of operation.keys){if(!/^(pdf|score):.+/.test(key))throw Error('악보 식별자가 잘못되었습니다.');if(operation.value)next.favorites[key]=true;else delete next.favorites[key];}
 }else throw Error('지원하지 않는 폴더 작업입니다.');
 storage.setItem(SCORE_FOLDERS_KEY,JSON.stringify(next));return next;
}
