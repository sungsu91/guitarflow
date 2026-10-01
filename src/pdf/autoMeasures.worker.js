import {detectPracticeMeasures} from './autoMeasures.js';
self.onmessage=({data})=>{try{self.postMessage({result:detectPracticeMeasures({...data,rgba:new Uint8ClampedArray(data.rgba)})});}catch(error){self.postMessage({error:error.message});}};
