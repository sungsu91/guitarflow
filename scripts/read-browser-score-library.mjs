// Browser-test helper also works against the production bundle (no /src imports).
export const readBrowserScoreLibrary=page=>page.evaluate(()=>new Promise((resolve,reject)=>{
 const request=indexedDB.open('fretiva.score.library.v3',1);
 request.onerror=()=>reject(request.error);
 request.onsuccess=()=>{
  const db=request.result;if(!db.objectStoreNames.contains('library')){db.close();reject(Error('Score library not initialized'));return;}
  const tx=db.transaction('library','readonly');let result;
  tx.objectStore('library').get('fretiva.etude.library.v2').onsuccess=e=>{result=e.target.result;};
  tx.oncomplete=()=>{db.close();try{resolve(JSON.parse(result??'{"version":2,"records":{}}'));}catch(error){reject(error);}};
  tx.onabort=tx.onerror=()=>{db.close();reject(tx.error);};
 };
}));
