import {arrangeGuitar} from './arrangeGuitar.js';
self.onmessage=({data})=>{try{self.postMessage({result:arrangeGuitar(data.document,data.options)});}catch(error){self.postMessage({error:error.message});}};
