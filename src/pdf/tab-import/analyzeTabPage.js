import {createLocalOcr,recognizeCandidates} from './localOcr.js';
import {resolvePage} from './recognition.js';
import {createStaffOmrClient} from '../../omr/staffOmrClient.js';
import {staffSystemToAnalysis} from '../../omr/staffTokens.js';
import {recognizeStaffSystem} from '../../omr/staffRecognition.js';
import {resolveImportTarget,importOctaveShift} from './importTarget.js';
import {recognizePageChords,attachPageChords} from './chordRecognition.js';
import {isFretText} from './fretText.js';
import {groupGrandStaffReadings} from '../../omr/grandStaffImport.js';
import {pairedNotationSystems} from './pairedNotation.js';
import {planNotationSource} from '../../omr/notationSourcePlan.js';
import {recognizePianoStaff} from '../../omr/pianoStaffRecognition.js';
import {grandStaffChordRegions} from '../../omr/grandStaffChords.js';
import {importSourceRegion} from './importActivity.js';

export function geometryInWorker(image,page,signal,glyphs,sourceMode,cameraPhoto,stringCount,photoScan=false,verifyNotation=false){
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
    try{worker.postMessage({rgba:image.data.buffer,width:image.width,height:image.height,page,glyphs,sourceMode,cameraPhoto,stringCount,photoScan,verifyNotation},[image.data.buffer]);}catch(error){finish(reject,error);}
  });
}

// PDF rendering and camera images use exactly the same geometry/OCR decisions.
export function createTabPageAnalyzer(signal){
  let ocr,omr;
  let notationContext={meter:[4,4],key:'C'},previous=[];
  return {
    async analyze(image,{page=1,glyphs=[],chordText=[],meter=[4,4],meterEvidence=null,octaveShift,target:requestedTarget,sourceMode='auto',cameraPhoto=false,photoScan=false,verifyNotation=false,onProgress=()=>{}}={}){
      const target=resolveImportTarget(sourceMode==='grand'?{instrument:'piano',...requestedTarget,notationPitch:'concert'}:requestedTarget);octaveShift??=importOctaveShift(target);
      if(target.instrument==='piano'&&!['staff','grand'].includes(sourceMode))throw Error('피아노는 오선보 또는 Grand Staff 입력을 선택해 주세요. TAB은 원본 현악기 설정으로 불러온 뒤 피아노로 변환할 수 있습니다.');
      if(sourceMode==='grand')octaveShift=0;
      onProgress(0,{phase:'structure'});
      const geometry=await geometryInWorker(image,page,signal,glyphs,sourceMode,cameraPhoto,target.tuning.length,photoScan,verifyNotation);
      const sourcePlan=!geometry.staffs.length&&geometry.notationSystems?.length?planNotationSource(geometry.notationSystems,sourceMode):null;
      if(sourcePlan?.excludedStaffIds.length)geometry.excludedNotationStaffIds=sourcePlan.excludedStaffIds;
      const regions=(geometry.chordRegions??[]).filter(region=>sourceMode==='grand'||!sourcePlan?.excludedStaffIds.includes(region.staff));delete geometry.chordRegions;
      let chords=[];
      onProgress(0,{phase:'chords'});
      try{chords=await recognizePageChords(regions,chordText,{signal});}
      catch(error){if(signal?.aborted||error.name==='AbortError')throw error;geometry.chordWarning='코드명을 읽지 못했습니다. 원본 코드명을 확인해 주세요.';}
      if(sourceMode==='grand'&&sourcePlan)chords=grandStaffChordRegions(geometry.notationSystems,sourcePlan.systems,chords);
      if(!geometry.staffs.length&&geometry.notationSystems?.length){
        onProgress(0,{phase:'model'});omr??=await createStaffOmrClient(signal);
        const systems=sourcePlan.systems,readings=[];delete geometry.notationSystems;
        for(const [index,system] of systems.entries()){
          system.triplets=chords.find(region=>region.staff===system.id)?.triplets??[];
          if(omr.closed){onProgress(index/systems.length,{phase:'model'});omr=await createStaffOmrClient(signal);}
          let attempt=0;
          const reportingOmr={recognize:async(input,reading={operation:'system'})=>{
            const started=Date.now();attempt++;
            const box=reading.measure?system.measures[reading.measure-1]:null;
            const rect=box?{...system.rect,x:box.x,width:box.width}:system.rect;
            const region=importSourceRegion(rect,geometry.width,geometry.height);
            const report=()=>onProgress(index/systems.length,{...reading,phase:'symbols',staff:index+1,total:systems.length,staffId:system.id,region,attempt,seconds:Math.floor((Date.now()-started)/1000)});
            report();const timer=setInterval(report,5000);
            try{return await omr.recognize(input);}finally{clearInterval(timer);}
          }};
          let parsed;
          try{
            parsed=sourceMode==='grand'?await recognizePianoStaff(reportingOmr,system,notationContext,index%2?'clef-F4':'clef-G2',{signal}):await recognizeStaffSystem(reportingOmr,system,notationContext,{signal});
          }
          catch(error){
            if(sourceMode==='grand'&&error.pianoReadings){error.message=`${page}페이지 · ${error.message}`;error.sourceLocation={page,staff:system.id,measure:error.pianoReadings.at(-1)?.measure};}
            throw error;
          }
          finally{delete system.rgba;delete system.extension;delete system.pianoTop;}
          notationContext={meter:parsed.meter,key:parsed.key};
          readings.push({system,parsed});
          onProgress((index+1)/systems.length,{phase:'convert',staff:index+1,total:systems.length});
        }
        for(const {system,parsed} of sourceMode==='grand'?groupGrandStaffReadings(readings,target):readings){
          const converted=staffSystemToAnalysis(parsed,{system,page,width:geometry.width,height:geometry.height,octaveShift,target,previous});
          previous=converted.previous;geometry.staffs.push(converted.staff);
        }
        return attachPageChords({...geometry,notation:true,octaveShift,endMeter:notationContext.meter,endMeterEvidence:{method:'staff-omr'}},chords);
      }
      const notationSystems=geometry.notationSystems??[];delete geometry.notationSystems;
      geometry.meter=meter;geometry.meterEvidence=meterEvidence;
      if(!ocr&&geometry.staffs.some(s=>s.meterCandidate||s.tupletCandidates?.length||s.candidates.some(c=>!c.ocr)||s.measures.some(m=>m.rhythm.some(r=>r.connectionLabel))))ocr=await createLocalOcr(signal);
      await recognizeCandidates(geometry,ocr,{signal,onProgress});
      // Do not create an extra empty measure from the five-line notation
      // above a bass TAB. A readable fret always retains the possible TAB.
      if(target.tuning.length===5)geometry.staffs=geometry.staffs.filter(s=>s.kind!=='notation-candidate'||s.candidates.some(c=>!c.nonFretSymbol&&!c.ocr?.shapeRejected&&c.cx>s.x+s.spacing*4&&c.stringDistance<=.22&&isFretText(c.ocr?.text)&&c.ocr?.agrees&&c.ocr.confidence>=.95));
      if(verifyNotation){
        const pairs=pairedNotationSystems(notationSystems,geometry.staffs);
        if(!pairs.length)geometry.notationCheckWarning='같은 마디에 대응하는 오선보를 찾지 못해 음높이 대조를 생략했습니다. TAB 인식 결과는 유지합니다.';
        for(const {tab,system} of pairs)try{
          if(!omr||omr.closed)omr=await createStaffOmrClient(signal);
          const parsed=await recognizeStaffSystem(omr,system,{meter,key:'C'},{signal});
          (geometry.pairedNotation??=[]).push({tabY:tab.y/geometry.height,staff:system.id,parsed});
        }catch(error){if(signal?.aborted||error.name==='AbortError')throw error;geometry.notationCheckWarning='오선보와 TAB의 음높이 대조를 완료하지 못했습니다. TAB 인식 결과는 유지합니다.';}
        finally{delete system.rgba;delete system.extension;}
      }
      return attachPageChords(resolvePage(geometry),chords);
    },
    async close(){await ocr?.close();omr?.close();},
  };
}
