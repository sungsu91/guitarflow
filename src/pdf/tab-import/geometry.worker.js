import {analyseGeometry} from './geometry.js';
self.onmessage=({data})=>{try{self.postMessage({result:analyseGeometry({...data,rgba:new Uint8ClampedArray(data.rgba)})});}catch(error){self.postMessage({error:error.message});}};
