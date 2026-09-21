export const SCORE_INSTRUMENTS = Object.freeze({
  guitar: {label:'기타', tuning:[64,59,55,50,45,40], clef:'treble', octaveShift:1, staffBottom:30},
  bass: {label:'베이스', tuning:[43,38,33,28], clef:'bass', octaveShift:1, staffBottom:18},
  ukulele: {label:'우쿨렐레', tuning:[69,64,60,67], clef:'treble', octaveShift:0, staffBottom:30},
  piano: {label:'피아노', tuning:[], clef:'treble', octaveShift:0, staffBottom:30, kind:'keys', minMidi:0, maxMidi:127},
  drums: {label:'드럼', tuning:[], clef:'percussion', octaveShift:0, staffBottom:30, kind:'drums'},
});
export const isFretted = id => !scoreInstrument(id).kind;
// GM drum note numbers; staff positions are our documented drum-set legend.
export const DRUMS = Object.freeze([
 [35,'어쿠스틱 킥','f/4','kick'],[36,'킥','f/4','kick'],[37,'사이드 스틱','c/5/x','snare'],[38,'스네어','c/5','snare'],[40,'일렉트릭 스네어','c/5','snare'],
 [41,'낮은 플로어 탐','a/4','tom'],[43,'플로어 탐','a/4','tom'],[45,'낮은 탐','d/5','tom'],[47,'중간 탐','d/5','tom'],[48,'높은 탐','e/5','tom'],[50,'하이 탐','f/5','tom'],
 [42,'닫힌 하이햇','g/5/x','hat'],[44,'페달 하이햇','d/4/x','hat'],[46,'열린 하이햇','g/5/x','open-hat'],[49,'크래시','g/5/cx','cymbal'],[51,'라이드','f/5/x','cymbal'],[53,'라이드 벨','f/5/x','cymbal'],[57,'크래시 2','g/5/cx','cymbal'],[59,'라이드 2','f/5/x','cymbal'],
].map(([midi,label,key,sound])=>({midi,label,key,sound})));
export const drumForMidi = midi => DRUMS.find(d=>d.midi===midi);
export function validateInstrumentMidi(id,midi){
 const p=scoreInstrument(id);
 if(!Number.isInteger(midi)||midi<0||midi>127)throw Error('MIDI 음높이를 확인하세요.');
 if(p.kind==='drums'&&!drumForMidi(midi))throw Error(`지원하지 않는 드럼 MIDI ${midi}입니다. 드럼 패드의 음을 선택하세요.`);
 if(p.kind==='keys'&&(midi<p.minMidi||midi>p.maxMidi))throw Error(`${p.label} 음역은 MIDI ${p.minMidi}–${p.maxMidi}입니다.`);
}
export const canonicalInstrument = id => id==='keyboard'?'piano':id;
// Compatibility changes only the instrument ID, preserving every saved field.
export const normalizeInstrumentDocument = d => d?.instrument==='keyboard'?{...d,instrument:'piano'}:d;
export const scoreInstrument = id => SCORE_INSTRUMENTS[canonicalInstrument(id)]??SCORE_INSTRUMENTS.guitar;
export const staffStepForPitch = (pitch,id) => {
  const profile=scoreInstrument(id);
  return (pitch.octave+profile.octaveShift)*7+'CDEFGAB'.indexOf(pitch.letter)-profile.staffBottom;
};
