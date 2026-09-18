export const SCORE_INSTRUMENTS = Object.freeze({
  guitar: {label:'기타', tuning:[64,59,55,50,45,40], clef:'treble', octaveShift:1, staffBottom:30},
  bass: {label:'베이스', tuning:[43,38,33,28], clef:'bass', octaveShift:1, staffBottom:18},
  ukulele: {label:'우쿨렐레', tuning:[69,64,60,67], clef:'treble', octaveShift:0, staffBottom:30},
});
export const scoreInstrument = id => Object.hasOwn(SCORE_INSTRUMENTS,id)?SCORE_INSTRUMENTS[id]:SCORE_INSTRUMENTS.guitar;
export const staffStepForPitch = (pitch,id) => {
  const profile=scoreInstrument(id);
  return (pitch.octave+profile.octaveShift)*7+'CDEFGAB'.indexOf(pitch.letter)-profile.staffBottom;
};
