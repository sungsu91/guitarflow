import React from 'react';
import {createRoot} from 'react-dom/client';
import ScoreEditor from '../src/etudes/ScoreEditor.jsx';
import {createBlankDocument} from '../src/etudes/scoreModel.js';
import {convertScoreInstrument} from '../src/etudes/convertScoreInstrument.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';
let root;
export function mount(width,instrument,restore=false){
 root?.unmount();document.body.replaceChildren();
 const host=document.createElement('main');host.className='app';document.body.append(host);root=createRoot(host);
 const scoreDocument=restore?loadLibrary(localStorage).records[window.auditSaved.id].document:convertScoreInstrument(createBlankDocument(),instrument);
 scoreDocument.viewSettings={...scoreDocument.viewSettings,notationView:['bass','ukulele','guitar'].includes(instrument)?'both':'staff'};
 root.render(<ScoreEditor document={scoreDocument} mobile={width<600} onClose={()=>{}} onSave={d=>{window.auditSaved=structuredClone(d);return saveLibraryDocument(localStorage,d);}}/>);
}
