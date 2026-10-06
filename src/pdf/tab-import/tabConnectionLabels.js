import {PSM} from 'tesseract.js';
import {abortable} from './abortable.js';
import {agreeConnectionLabel} from './tabLabelEvidence.js';

export async function recognizeConnectionLabels(geometry,ocr,{signal}={}){
 const slots=geometry.staffs.flatMap(s=>s.measures.flatMap(m=>m.rhythm.filter(r=>r.connectionLabel)));
 if(!slots.length)return;
 const small=document.createElement('canvas'),crop=document.createElement('canvas');
 try{
  await abortable(ocr.worker.setParameters({tessedit_char_whitelist:'HPhpsSlL.',classify_enable_learning:'0'}),signal);
  for(const slot of slots){
   signal?.throwIfAborted();const label=slot.connectionLabel;small.width=label.width;small.height=label.height;const ctx=small.getContext('2d'),data=ctx.createImageData(small.width,small.height);
   for(let i=0;i<label.grayscale.length;i++){const v=label.grayscale[i];data.data.set([v,v,v,255],i*4);}ctx.putImageData(data,0,0);
   const reads=[];
   for(const [mode,size] of [[PSM.SINGLE_CHAR,44],[PSM.SINGLE_LINE,52],[PSM.RAW_LINE,64],[PSM.SINGLE_CHAR,32],[PSM.SINGLE_WORD,44],[PSM.SINGLE_LINE,24],[PSM.SINGLE_CHAR,72],[PSM.RAW_LINE,32],...[28,32,36,40].map(size=>[PSM.SINGLE_LINE,size])]){
    const strong=reads.filter(r=>r.confidence>=.95);if(strong.length>=2&&['H','P'].includes(strong[0].text)&&strong.every(r=>r.text===strong[0].text))break;
    crop.width=160;crop.height=128;const out=crop.getContext('2d');out.fillStyle='white';out.fillRect(0,0,160,128);const scale=Math.min(size/small.height,130/small.width);out.drawImage(small,(160-small.width*scale)/2,(128-small.height*scale)/2,small.width*scale,small.height*scale);
    await abortable(ocr.worker.setParameters({tessedit_pageseg_mode:mode}),signal);
    const {data}=await abortable(ocr.worker.recognize(crop,{}, {blocks:true,text:true}),signal),words=(data.blocks??[]).flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.words))),symbols=words.flatMap(w=>w.symbols);
    reads.push({text:words.map(w=>w.text).join('').trim().toUpperCase(),confidence:symbols.length?Math.min(...symbols.map(s=>s.confidence))/100:0});
   }
   slot.connectionLabelReading=agreeConnectionLabel(reads,label);delete slot.connectionLabel;
  }
 }finally{small.width=small.height=crop.width=crop.height=0;await abortable(ocr.worker.setParameters({tessedit_char_whitelist:'0123456789Xx'}),signal);}
}
