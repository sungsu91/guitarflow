// Optional research runtime, served locally after setup-omr-prototype.mjs.
// No external endpoints or PDF upload. Terminating the Worker cancels inference.
const root='/tmp/omr-research/';
importScripts(root+'crispembed_ocr.js',root+'crispembed-ocr.js');
const logs=[];
self.CRISPEMBED_MODULE_PROMISE=CrispEmbedOCR({locateFile:f=>root+f,print:s=>logs.push(s),printErr:s=>logs.push(s)});
self.onmessage=async({data:m})=>{
  let model;
  try {
    const start=performance.now();
    model=await CrispEmbedOCRWrapper.create({modelUrl:root+'tromr-q8_0.gguf',nThreads:1,maxTokens:256});
    postMessage({stage:'loaded'});
    const t=performance.now();
    const result=await model.recognize(new ImageData(new Uint8ClampedArray(m.data),m.width,m.height));
    const mod=await self.CRISPEMBED_MODULE_PROMISE;
    postMessage({stage:'result',...result,inferenceMs:performance.now()-t,loadMs:t-start,heapBytes:mod.HEAPU8.buffer.byteLength,logs});
  } catch(e) {postMessage({stage:'error',message:String(e)});}
  finally {model?.dispose();}
};
