/* CrispEmbed MIT runtime + TrOMR Apache-2.0 model; license copies ship alongside. */
const root='/staff-omr/';let model;
importScripts(root+'crispembed_ocr.js',root+'crispembed-ocr.js');
self.CRISPEMBED_MODULE_PROMISE=CrispEmbedOCR({locateFile:file=>root+file,print:()=>{},printErr:()=>{}});
self.onmessage=async({data})=>{
  try{
    model??=await CrispEmbedOCRWrapper.create({modelUrl:root+'tromr-q8_0.gguf',nThreads:1,maxTokens:512});
    if(data.action==='load'){postMessage({id:data.id,result:{ready:true}});return;}
    const result=await model.recognize(new ImageData(new Uint8ClampedArray(data.rgba),data.width,data.height));
    postMessage({id:data.id,result:{text:result.text}});
  }catch(error){postMessage({id:data.id,error:String(error)});}
};
