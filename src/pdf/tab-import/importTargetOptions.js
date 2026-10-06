import {SCORE_INSTRUMENTS,isFretted} from '../../etudes/scoreInstruments.js';
import {tuningPresets} from '../../etudes/scoreTuning.js';
import {resolveImportTarget} from './importTarget.js';

const instruments=Object.entries(SCORE_INSTRUMENTS).filter(([id])=>isFretted(id)||id==='piano').flatMap(([instrument,p])=>(p.stringCounts??[p.tuning.length]).map(count=>({id:`${instrument}:${count}`,instrument,count,label:p.label})));
const instrumentId=target=>target?`${target.instrument}:${target.tuning.length}`:'';
const matches=(a,b)=>a.length===b.length&&a.every((n,i)=>n===b[i]);
const presets=target=>target?tuningPresets(target.instrument).filter(p=>p.tuning.length===target.tuning.length):[];

export function importTargetOptions(target){
  const tunings=presets(target),selected=tunings.find(p=>matches(p.tuning,target.tuning));
  return {instruments,instrumentValue:instrumentId(target),tunings,tuningValue:selected?.id??'current',customTuning:Boolean(target&&!selected)};
}

export function selectImportInstrument(current,id){
  const option=instruments.find(o=>o.id===id);
  if(!option)throw Error('불러올 악기를 선택해 주세요.');
  if(id===instrumentId(current))return resolveImportTarget(current);
  const preset=tuningPresets(option.instrument).find(p=>p.tuning.length===option.count);
  return resolveImportTarget({instrument:option.instrument,tuning:preset.tuning,capo:0,...(current?.notationPitch?{notationPitch:current.notationPitch}:{})});
}

export function selectImportTuning(current,id){
  const target=resolveImportTarget(current);
  if(id==='current')return target;
  const preset=presets(target).find(p=>p.id===id);
  if(!preset)throw Error('불러올 악기의 튜닝을 선택해 주세요.');
  return resolveImportTarget({...target,tuning:preset.tuning});
}
