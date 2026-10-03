import {analyseGeometry} from './geometry.js';
import {cropNotationSystems} from '../../omr/staffSystems.js';
import {chordRegions} from './chordGeometry.js';
self.onmessage=({data})=>{try{
  const rgba=new Uint8ClampedArray(data.rgba),mode=data.sourceMode??'auto';
  if(!['auto','staff','tab'].includes(mode))throw Error('악보 변환 방식을 확인해 주세요.');
  const result=mode==='staff'?{page:data.page,width:data.width,height:data.height,staffs:[]}:analyseGeometry({...data,rgba});
  if(mode!=='tab'&&!result.staffs.length)result.notationSystems=cropNotationSystems(rgba,data.width,data.height);
  // Chord names are additional evidence. A failed crop must not discard the
  // notation/TAB geometry already obtained from this page.
  try{result.chordRegions=chordRegions(rgba,data.width,data.height,result.staffs.length?result.staffs:(result.notationSystems??[]).map(s=>s.staff));}
  catch{result.chordRegions=[];result.chordWarning='코드명을 읽지 못했습니다. 원본 코드명을 확인해 주세요.';}
  self.postMessage({result},[...(result.notationSystems??[]).flatMap(system=>[system.rgba,system.extension]),...result.chordRegions.map(r=>r.rgba)]);
}catch(error){self.postMessage({error:error.message});}};
