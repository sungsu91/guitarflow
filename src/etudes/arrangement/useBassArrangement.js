import {useEffect,useRef,useState} from 'react';
import {arrangeBass,bassChordRows} from './arrangeBass.js';
import {midiName} from '../scoreTuning.js';
export default function useBassArrangement(document,onApply,onClose,mobile,{initialError='',target,sourceCapo}={}){
 const source=document.bassArrangement?.sourceDocument??document;
 const [rows,setRows]=useState(()=>structuredClone(document.bassArrangement?.chordRows??bassChordRows(source))),[pattern,setPattern]=useState(document.bassArrangement?.pattern??'quarters'),[result,setResult]=useState(null),[error,setError]=useState(initialError);
 const dialog=useRef(null);
 useEffect(()=>{const node=dialog.current;node?.showModal();return()=>node?.close();},[mobile]);
 useEffect(()=>{if(error)dialog.current?.querySelector('details')?.setAttribute('open','');},[error]);
 const invalidate=()=>{setResult(null);setError('');};
 const change=(bar,index,field,value)=>{invalidate();setRows(all=>all.map((r,i)=>i!==bar?r:{...r,review:false,changes:r.changes.map((c,j)=>j!==index?c:{...c,[field]:value,needsReview:false})}));};
 const remove=(bar,index)=>{invalidate();setRows(all=>all.map((r,i)=>i!==bar?r:{...r,review:false,changes:r.changes.filter((_,j)=>j!==index)}));};
 const add=bar=>{invalidate();setRows(all=>all.map((r,i)=>i!==bar?r:{...r,changes:[...r.changes,{name:'',onset:Math.min((r.changes.at(-1)?.onset??-480)+480,r.meter[0]*1920/r.meter[1]-240),needsReview:false}]}));};
 const preview=()=>{try{setResult(arrangeBass(source,{pattern,rows,target:target??document.bassArrangement?.target,sourceCapo:sourceCapo??document.bassArrangement?.sourceCapo}));setError('');}catch(e){setResult(null);setError(e.message);}};
 return {dialog,rows,pattern,setPattern:value=>{invalidate();setPattern(value);},change,remove,add,preview,result,error,close:onClose,apply:()=>{if(result)onApply(result.document);},restore:document.bassArrangement?()=>onApply(structuredClone(source)):null,range:result?.report.range?.map(midiName).join(' ~ '),sourceReview:Boolean(source.pdfTabImport||source.measures.some(m=>m.pdfImport)),capo:sourceCapo??document.bassArrangement?.sourceCapo??source.capo??0};
}
