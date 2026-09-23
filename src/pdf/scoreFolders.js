import ko from "../i18n/locales/ko.js";
export const SCORE_FOLDERS_KEY='fretiva.score.folders.v1';
export const scoreFileKey=item=>`${item.type}:${item.id}`;
const empty=()=>({version:1,folders:[],locations:{},favorites:{}});
export function loadScoreFolders(storage){
 const raw=storage.getItem(SCORE_FOLDERS_KEY);if(!raw)return empty();
 const data=JSON.parse(raw);
 if(data.version!==1||!Array.isArray(data.folders)||!data.locations||typeof data.locations!=='object'||Array.isArray(data.locations))throw Error(ko["pdf.couldnTReadFolderInformationExistingSavedDataIsKept"]);
 const ids=new Set();
 for(const f of data.folders){if(!f||typeof f.id!=='string'||!f.id||ids.has(f.id)||typeof f.name!=='string'||!f.name.trim())throw Error(ko["pdf.checkTheFolderInformationFormat"]);ids.add(f.id);}
 for(const [key,id] of Object.entries(data.locations))if(!/^(pdf|score):.+/.test(key)||typeof id!=='string'||!ids.has(id))throw Error(ko["pdf.checkScoreToFolderLinks"]);
 if(data.favorites!==undefined&&(!data.favorites||typeof data.favorites!=='object'||Array.isArray(data.favorites)||Object.entries(data.favorites).some(([key,value])=>!/^(pdf|score):.+/.test(key)||value!==true)))throw Error(ko["pdf.checkFavoritesInformation"]);
 return {...data,favorites:data.favorites??{}};
}
export function updateScoreFolders(storage,operation){
 // Re-read immediately before the synchronous write so another tab's folders survive.
 const next=structuredClone(loadScoreFolders(storage));
 const name=()=>{const value=String(operation.name??'').trim();if(!value||value.length>100)throw Error(ko["pdf.enterAFolderNameOf1100Characters"]);if(next.folders.some(f=>f.id!==operation.id&&f.name===value))throw Error(ko["pdf.aFolderWithThisNameAlreadyExists"]);return value;};
 if(operation.type==='create'){const value=name();if(next.folders.some(f=>f.id===operation.id))throw Error(ko["pdf.thisFolderAlreadyExists"]);next.folders.push({id:operation.id,name:value,createdAt:new Date().toISOString()});}
 else if(operation.type==='rename'){const folder=next.folders.find(f=>f.id===operation.id);if(!folder)throw Error(ko["pdf.folderNotFound"]);folder.name=name();}
 else if(operation.type==='remove'){next.folders=next.folders.filter(f=>f.id!==operation.id);for(const key of Object.keys(next.locations))if(next.locations[key]===operation.id)delete next.locations[key];}
 else if(operation.type==='move'){
  if(operation.folderId&&!next.folders.some(f=>f.id===operation.folderId))throw Error(ko["pdf.destinationFolderNotFound"]);
  for(const key of operation.keys){if(!/^(pdf|score):.+/.test(key))throw Error(ko["pdf.invalidScoreIdentifier"]);if(operation.folderId)next.locations[key]=operation.folderId;else delete next.locations[key];}
 }else if(operation.type==='favorite'){
  for(const key of operation.keys){if(!/^(pdf|score):.+/.test(key))throw Error(ko["pdf.invalidScoreIdentifier"]);if(operation.value)next.favorites[key]=true;else delete next.favorites[key];}
 }else throw Error(ko["pdf.unsupportedFolderOperation"]);
 storage.setItem(SCORE_FOLDERS_KEY,JSON.stringify(next));return next;
}
