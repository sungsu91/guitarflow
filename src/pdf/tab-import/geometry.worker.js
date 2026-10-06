import {analyseGeometry,binaryPage,recoverFaintRulePixels} from './geometry.js';
import {partialPhotoTrackRecovery} from './photoTrackRecovery.js';
import {photoPartLayout} from './photoParts.js';
import {cropNotationSystems} from '../../omr/staffSystems.js';
import {chordRegions} from './chordGeometry.js';
import {normalizePhotoPaper,photoStaffTracks,rectifyPhotoStaffs,straightScanTrack,rectifyStraightScan,faintStaffRulePixels,CAMERA_TAB_CONFIG} from './cameraPhotoGeometry.js';
self.onmessage=({data})=>{try{
  let rgba=new Uint8ClampedArray(data.rgba);const mode=data.sourceMode??'auto';
  const originalRgba=rgba;
  if(!['auto','staff','tab','grand'].includes(mode))throw Error('악보 변환 방식을 확인해 주세요.');
  const notationOnly=mode==='staff'||mode==='grand';
  let inspectedPhotoTracks=false;
  let result=notationOnly?{page:data.page,width:data.width,height:data.height,staffs:[]}:analyseGeometry({...data,rgba});
  // A PDF may itself contain a photographed or skewed scan. The file extension
  // must not disable image recovery. Preserve any already recognized page.
  const rasterSource=data.cameraPhoto||!(data.glyphs?.length);
  if(rasterSource&&!notationOnly&&(data.stringCount??6)===6&&!result.staffs.length){
    const rulePixels=recoverFaintRulePixels(binaryPage(rgba,data.width,data.height,CAMERA_TAB_CONFIG.lineThreshold),faintStaffRulePixels(rgba,data.width,data.height),data.width,data.height);
    if(rulePixels){
      const recovered=analyseGeometry({...data,rgba,rulePixels});
      if(recovered.staffs.length)result={...recovered,cameraCorrection:{method:'faint-internal-rule'}};
    }
  }
  if(rasterSource&&!notationOnly&&(!result.staffs.length||data.photoScan)){
    inspectedPhotoTracks=true;
    const normalized=normalizePhotoPaper(rgba,data.width,data.height),tracks=photoStaffTracks(normalized,data.width,data.height,data.stringCount??6);
    const straight=straightScanTrack(tracks,data.width,data.height);
    if(straight&&(!result.staffs.length||tracks.length>result.staffs.length)){
      const {rgba:rectified,angle}=rectifyStraightScan(rgba,data.width,data.height,straight);
      const recovered=analyseGeometry({...data,rgba:rectified,trimUnruledMargins:true});
      if(recovered.staffs.length>=tracks.length&&recovered.staffs.length>result.staffs.length){
        result={...recovered,cameraCorrection:{method:'straight-scan-deskew',angle}};rgba=rectified;
      }
    }
    if(tracks.length>result.staffs.length){
      const rectified=rectifyPhotoStaffs(normalized,data.width,data.height,tracks);
      const recovered=analyseGeometry({...data,rgba:rectified,config:CAMERA_TAB_CONFIG});
      const partial=partialPhotoTrackRecovery(result.staffs,recovered.staffs,tracks);
      if(recovered.staffs.length===tracks.length&&recovered.staffs.length>result.staffs.length&&tracks.every(t=>recovered.staffs.filter(s=>Math.abs(s.y+s.height/2-t.center)<t.spacing*.5).length===1)){
        result={...recovered,cameraCorrection:{method:'local-paper-and-staff-curves',tracks}};rgba=rectified;
      }else if(partial){
        result={...recovered,partialPhotoTracks:partial,cameraCorrection:{method:'local-paper-and-staff-curves',tracks}};rgba=rectified;
      }
      // Dense chord numerals widen the low-threshold row projection. Retry a
      // stronger projection only at independently measured six-rule curves.
      // Preserve the established rows, crops and original/scan selection score.
      if(!result.staffs.length||result.cameraCorrection?.method==='local-paper-and-staff-curves'){
        const baseline=result.partialPhotoTracks?{staffs:0,bars:0}:{staffs:result.staffs.length,bars:result.staffs.reduce((n,s)=>n+s.measures.length,0)};
        const numeralPixels=rectifyPhotoStaffs(normalizePhotoPaper(originalRgba,data.width,data.height,{gain:4}),data.width,data.height,tracks);
        const dense=analyseGeometry({...data,rgba:numeralPixels,structureRgba:rectified,rulePixels:binaryPage(rectified,data.width,data.height,CAMERA_TAB_CONFIG.lineThreshold),config:{...CAMERA_TAB_CONFIG,minStaffWidth:.55,densePhotoGlyphs:true}});
        const extras=dense.staffs.filter(s=>tracks.filter(t=>Math.abs(s.y+s.height/2-t.center)<t.spacing*.5).length===1&&!result.staffs.some(old=>Math.abs(old.y-s.y)<s.spacing));
        if(extras.length){
          const staffs=[...result.staffs,...extras].sort((a,b)=>a.y-b.y);
          // New IDs must not collide with IDs/candidate references already read.
          let id=Math.max(0,...result.staffs.map(s=>s.id));
          for(const s of extras){s.id=++id;for(const [i,c] of s.candidates.entries())c.id=`p${data.page}s${s.id}c${i}`;s.photoRecovery='dense-rule-projection';}
          result={...result,staffs,photoRecoveryBaseline:baseline,cameraCorrection:{method:'local-paper-and-staff-curves',tracks}};
          const missing=partialPhotoTrackRecovery([],staffs,tracks);
          if(missing)result.partialPhotoTracks=missing;else delete result.partialPhotoTracks;
          rgba=rectified;
        }
      }
    }
    if((data.stringCount??6)===6&&tracks.length>1){
      const layout=photoPartLayout(binaryPage(rectifyPhotoStaffs(normalized,data.width,data.height,tracks),data.width,data.height),data.width,data.height,tracks,result.staffs);
      if(layout)result.partLayout=layout;
    }
  }
  // Even an otherwise readable camera page may contain simultaneous guitars.
  // This inspection annotates the existing result; it cannot replace its rows.
  if(data.cameraPhoto&&!notationOnly&&!inspectedPhotoTracks&&(data.stringCount??6)===6){
    const normalized=normalizePhotoPaper(originalRgba,data.width,data.height),tracks=photoStaffTracks(normalized,data.width,data.height);
    if(tracks.length>1){
      const layout=photoPartLayout(binaryPage(rectifyPhotoStaffs(normalized,data.width,data.height,tracks),data.width,data.height),data.width,data.height,tracks,result.staffs);
      if(layout)result.partLayout=layout;
    }
  }
  if(mode!=='tab'&&!result.staffs.length||data.verifyNotation&&result.staffs.length)result.notationSystems=cropNotationSystems(rgba,data.width,data.height,{piano:mode==='grand'});
  // Chord names are additional evidence. A failed crop must not discard the
  // notation/TAB geometry already obtained from this page.
  try{result.chordRegions=chordRegions(rgba,data.width,data.height,result.staffs.length?result.staffs:(result.notationSystems??[]).map(s=>s.staff));}
  catch{result.chordRegions=[];result.chordWarning='코드명을 읽지 못했습니다. 원본 코드명을 확인해 주세요.';}
  self.postMessage({result},[...(result.notationSystems??[]).flatMap(system=>[system.rgba,system.extension,...(system.pianoTop?[system.pianoTop]:[])]),...result.chordRegions.map(r=>r.rgba)]);
}catch(error){self.postMessage({error:error.message});}};
