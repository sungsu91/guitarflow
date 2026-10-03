import {createLocalOcr,recognizeCandidates} from './localOcr.js';
import {resolvePage} from './recognition.js';
import {createStaffOmrClient} from '../../omr/staffOmrClient.js';
import {staffSystemToAnalysis} from '../../omr/staffTokens.js';
import {recognizeStaffSystem} from '../../omr/staffRecognition.js';
import {STAFF_GUITAR_OCTAVE_SHIFT} from '../../omr/staffPitch.js';
import {recognizePageChords,attachPageChords} from './chordRecognition.js';

function geometryInWorker(image,page,signal,glyphs,sourceMode){
  return new Promise((resolve,reject)=>{
    signal?.throwIfAborted();
    const worker=new Worker(new URL('./geometry.worker.js',import.meta.url),{type:'module'});
    let finished=false;
    const finish=(fn,value)=>{if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);worker.terminate();fn(value);};
    const timer=setTimeout(()=>finish(reject,Error('TAB 구조 분석 응답 시간이 초과되었습니다. 다시 시도해 주세요.')),30000);
    const abort=()=>finish(reject,new DOMException('분석 취소','AbortError'));
    signal?.addEventListener('abort',abort,{once:true});
    worker.onmessage=({data})=>data.error?finish(reject,Error(data.error)):finish(resolve,data.result);
    worker.onerror=e=>{e.preventDefault?.();finish(reject,Error(e.message||'TAB 분석 Worker 오류'));};
    worker.onmessageerror=()=>finish(reject,Error('TAB 구조 분석 응답을 읽지 못했습니다. 다시 시도해 주세요.'));
    try{worker.postMessage({rgba:image.data.buffer,width:image.width,height:image.height,page,glyphs,sourceMode},[image.data.buffer]);}catch(error){finish(reject,error);}
  });
}

// PDF rendering and camera images use exactly the same geometry/OCR decisions.
export function createTabPageAnalyzer(signal){
  let ocr,omr;
  let notationContext={meter:[4,4],key:'C'},previous=[];
  return {
    async analyze(image,{page=1,glyphs=[],chordText=[],meter=[4,4],meterEvidence=null,octaveShift=STAFF_GUITAR_OCTAVE_SHIFT,sourceMode='auto',onProgress=()=>{}}={}){
      const geometry=await geometryInWorker(image,page,signal,glyphs,sourceMode);
      const regions=geometry.chordRegions??[];delete geometry.chordRegions;
      let chords=[];
      try{chords=await recognizePageChords(regions,chordText,{signal});}
      catch(error){if(signal?.aborted||error.name==='AbortError')throw error;geometry.chordWarning='코드명을 읽지 못했습니다. 원본 코드명을 확인해 주세요.';}
      if(!geometry.staffs.length&&geometry.notationSystems?.length){
        onProgress(0);omr??=await createStaffOmrClient(signal);
        const systems=geometry.notationSystems;delete geometry.notationSystems;
        for(const [index,system] of systems.entries()){
          system.triplets=chords.find(region=>region.staff===system.id)?.triplets??[];
          if(omr.closed)omr=await createStaffOmrClient(signal);
          let parsed;
          try{parsed=await recognizeStaffSystem(omr,system,notationContext,{signal});}
          finally{delete system.rgba;delete system.extension;}
          notationContext={meter:parsed.meter,key:parsed.key};
          const converted=staffSystemToAnalysis(parsed,{system,page,width:geometry.width,height:geometry.height,octaveShift,previous});
          previous=converted.previous;geometry.staffs.push(converted.staff);onProgress((index+1)/systems.length);
        }
        return attachPageChords({...geometry,notation:true,octaveShift,endMeter:notationContext.meter,endMeterEvidence:{method:'staff-omr'}},chords);
      }
      delete geometry.notationSystems;
      geometry.meter=meter;geometry.meterEvidence=meterEvidence;
      if(!ocr&&geometry.staffs.some(s=>s.meterCandidate||s.candidates.some(c=>!c.ocr)))ocr=await createLocalOcr(signal);
      await recognizeCandidates(geometry,ocr,{signal,onProgress});
      return attachPageChords(resolvePage(geometry),chords);
    },
    async close(){await ocr?.close();omr?.close();},
  };
}
