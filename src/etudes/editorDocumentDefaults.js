import {createBlankDocument,blankMeasure} from './scoreModel.js';

export function editorDocumentDefaults(document,mobile) {
 if(mobile||document.viewSettings?.measuresPerRow!=null)return document;
 return {...document,viewSettings:{...document.viewSettings,measuresPerRow:4}};
}

export function createEditorDocument(mobile) {
 const document=createBlankDocument();
 if(!mobile)document.measures=Array.from({length:4},()=>blankMeasure(document.meter));
 return editorDocumentDefaults(document,mobile);
}
