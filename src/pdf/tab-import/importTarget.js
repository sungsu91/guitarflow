import {SCORE_INSTRUMENTS,isFretted,validScoreTuning,scoreInstrument} from '../../etudes/scoreInstruments.js';

// Capture only musical settings, never the editor's notes or UI state.
// Omitted options preserve the established six-string guitar import path.
export function resolveImportTarget(value){
  const instrument=value?.instrument??'guitar';
  if(instrument==='drums')throw Error('드럼 PDF 인식은 아직 지원하지 않습니다. 타악기 음표 머리와 악기별 위치를 검증할 수 없어 일반 음높이 또는 기타 TAB으로 변환하지 않습니다.');
  if(!Object.hasOwn(SCORE_INSTRUMENTS,instrument))throw Error('불러올 악기를 선택해 주세요.');
  const tuning=value?.tuning??scoreInstrument(instrument).tuning,capo=value?.capo??0;
  if(!validScoreTuning(instrument,tuning)||!Number.isInteger(capo)||capo<0||capo>12)throw Error('불러올 악기의 현 수·튜닝·카포 설정을 확인해 주세요.');
  if(!isFretted(instrument)&&capo)throw Error('피아노에는 카포를 적용할 수 없습니다.');
  const notationPitch=value?.notationPitch;
  if(notationPitch!==undefined&&!['concert','octave-down',...(instrument==='bass'?['auto']:[])].includes(notationPitch))throw Error('원본 오선보의 음높이 기준을 확인해 주세요.');
  return {instrument,tuning:[...tuning],capo,...(notationPitch?{notationPitch}:{})};
}

// Explicit source notation wins over the destination instrument. Old callers
// without a convention retain their established guitar/bass octave behavior.
// Automatic bass imports use the detected source clef, ignoring saved octave choices.
export const importOctaveShift=(target,clef)=>target.instrument==='bass'&&target.notationPitch==='auto'?(clef==='clef-F4'?-12:0):target.notationPitch==='concert'||!isFretted(target.instrument)?0:target.notationPitch==='octave-down'?-12:-12*scoreInstrument(target.instrument).octaveShift||0;

// Vocal and piano sources keep their sounding pitch when mapped to frets.
// A destination instrument never implies the source's notation convention.
export function withImportPitchDefault(value,notationPitchOverride=value?.notationPitch){
  const target=resolveImportTarget(value);
  const notationPitch=!isFretted(target.instrument)?'concert':notationPitchOverride??'concert';
  return resolveImportTarget({...target,notationPitch});
}

export function missingTabMessage(target){
  return `${target.tuning.length}현 TAB을 찾지 못했습니다. 원본 TAB의 줄 수와 제작실 악기·튜닝 설정을 맞춰 주세요. 음표 악보는 ‘오선보 → TAB’을 선택해 주세요.`;
}
