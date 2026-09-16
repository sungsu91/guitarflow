// Session-only, bounded caches. IndexedDB remains the durable source of truth.
export function createPdfPageCache({load,maxDocuments=2,maxBytes=32*1024*1024,maxPages=8,idleMs=5*60*1000}) {
 const documents=new Map(),bitmaps=new Map();let bytes=0;
 const stats={documentsOpened:0,documentHits:0,bitmapHits:0,renders:0,prefetched:0};
 function dropBitmap(key){const item=bitmaps.get(key);if(item){bytes-=item.bytes;bitmaps.delete(key);}}
 function forgetPages(documentKey){for(const [key,item] of bitmaps)if(item.documentKey===documentKey)dropBitmap(key);}
 function dispose(key,entry){clearTimeout(entry.timer);documents.delete(key);forgetPages(key);void entry.promise.then(doc=>doc.destroy()).catch(()=>{});}
 function trim(){for(const [key,entry] of documents){if(documents.size<=maxDocuments)break;if(!entry.refs)dispose(key,entry);}}
 function acquire(key,blob){
  let entry=documents.get(key);
  if(entry){stats.documentHits++;clearTimeout(entry.timer);documents.delete(key);documents.set(key,entry);}
  else{stats.documentsOpened++;entry={refs:0,promise:Promise.resolve().then(()=>load(blob))};documents.set(key,entry);entry.promise.catch(()=>{if(documents.get(key)===entry){documents.delete(key);forgetPages(key);}});}
  entry.refs++;trim();let released=false;
  return {promise:entry.promise,release(){if(released)return;released=true;entry.refs--;if(!entry.refs){entry.timer=setTimeout(()=>{if(documents.get(key)===entry&&!entry.refs)dispose(key,entry);},idleMs);entry.timer.unref?.();trim();}}};
 }
 function get(key){const item=bitmaps.get(key);if(item){stats.bitmapHits++;bitmaps.delete(key);bitmaps.set(key,item);}return item;}
 function put(key,item){dropBitmap(key);const cost=item.canvas.width*item.canvas.height*4;if(cost>maxBytes)return;
  bitmaps.set(key,{...item,bytes:cost});bytes+=cost;
  while(bytes>maxBytes||bitmaps.size>maxPages)dropBitmap(bitmaps.keys().next().value);
 }
 function preview(documentKey,pageNumber,cropKey){return [...bitmaps.values()].reverse().find(item=>item.documentKey===documentKey&&item.pageNumber===pageNumber&&item.cropKey===cropKey);}
 function invalidate(documentKey,pageNumber){for(const [key,item] of bitmaps)if(item.documentKey===documentKey&&(pageNumber==null||item.pageNumber===pageNumber))dropBitmap(key);}
 function clear(){for(const [key,entry] of documents)if(!entry.refs)dispose(key,entry);for(const key of bitmaps.keys())dropBitmap(key);}
 return {acquire,get,put,preview,invalidate,clear,stats,inspect:()=>({documents:documents.size,pages:bitmaps.size,bytes,...stats})};
}

export function pdfRasterKey(documentKey,pageNumber,{width,height,zoom,mobile,crop,dpr=1}){
 return JSON.stringify([documentKey,pageNumber,Math.round(width),zoom==='page'?Math.round(height):0,zoom,mobile,crop.x,crop.y,crop.width,crop.height,dpr]);
}

export function idleWork(callback){
 if(typeof requestIdleCallback==='function'){const id=requestIdleCallback(callback,{timeout:1500});return()=>cancelIdleCallback(id);}
 const id=setTimeout(callback,300);return()=>clearTimeout(id);
}
