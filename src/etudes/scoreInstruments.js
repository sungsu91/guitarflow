import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
export const SCORE_INSTRUMENTS = Object.freeze({
  guitar: {label:'Guitar', tuning:[64,59,55,50,45,40], clef:'treble', octaveShift:1, staffBottom:30},
  bass: {label:ko["tuner.bass"], tuning:[43,38,33,28], clef:'bass', octaveShift:1, staffBottom:18},
  ukulele: {label:ko["tuner.ukulele"], tuning:[69,64,60,67], clef:'treble', octaveShift:0, staffBottom:30},
  piano: {label:ko["etudes.piano"], tuning:[], clef:'treble', octaveShift:0, staffBottom:30, kind:'keys', minMidi:0, maxMidi:127},
  drums: {label:ko["app.drums"], tuning:[], clef:'percussion', octaveShift:0, staffBottom:30, kind:'drums'},
});
export const isFretted = id => !scoreInstrument(id).kind;
// GM drum note numbers; staff positions are our documented drum-set legend.
export const DRUMS = Object.freeze([
 [35,ko["etudes.acousticKick"],'f/4','kick'],[36,ko["metronome.kick"],'f/4','kick'],[37,ko["etudes.sideStick"],'c/5/x','snare'],[38,ko["metronome.snare"],'c/5','snare'],[40,ko["metronome.electricSnare"],'c/5','snare'],
 [41,ko["etudes.lowFloorTom"],'a/4','tom'],[43,ko["etudes.floorTom"],'a/4','tom'],[45,ko["etudes.lowTom"],'d/5','tom'],[47,ko["etudes.midTom"],'d/5','tom'],[48,ko["etudes.highTom"],'e/5','tom'],[50,ko["metronome.highTom"],'f/5','tom'],
 [42,ko["etudes.closedHiHat"],'g/5/x','hat'],[44,ko["metronome.pedalHiHat"],'d/4/x','hat'],[46,ko["etudes.openHiHatScoreinstruments"],'g/5/x','open-hat'],[49,ko["metronome.crash"],'g/5/cx','cymbal'],[51,ko["metronome.ride"],'f/5/x','cymbal'],[53,ko["metronome.rideBell"],'f/5/x','cymbal'],[57,ko["etudes.crash2"],'g/5/cx','cymbal'],[59,ko["etudes.ride2"],'f/5/x','cymbal'],
].map(([midi,label,key,sound])=>({midi,label,key,sound})));
export const drumForMidi = midi => DRUMS.find(d=>d.midi===midi);
export function validateInstrumentMidi(id,midi){
 const p=scoreInstrument(id);
 if(!Number.isInteger(midi)||midi<0||midi>127)throw Error(ko["etudes.checkTheMidiPitch"]);
 if(p.kind==='drums'&&!drumForMidi(midi))throw Error(formatMessage(ko["etudes.drumMidiNoteValueIsNotSupportedChooseASoundFromThe"], { value1: midi }));
 if(p.kind==='keys'&&(midi<p.minMidi||midi>p.maxMidi))throw Error(formatMessage(ko["etudes.theRangeOfValueIsMidiValueValue"], { value1: p.label, value2: p.minMidi, value3: p.maxMidi }));
}
export const canonicalInstrument = id => id==='keyboard'?'piano':id;
// Compatibility changes only the instrument ID, preserving every saved field.
export const normalizeInstrumentDocument = d => d?.instrument==='keyboard'?{...d,instrument:'piano'}:d;
export const scoreInstrument = id => SCORE_INSTRUMENTS[canonicalInstrument(id)]??SCORE_INSTRUMENTS.guitar;
export const staffStepForPitch = (pitch,id) => {
  const profile=scoreInstrument(id);
  return (pitch.octave+profile.octaveShift)*7+'CDEFGAB'.indexOf(pitch.letter)-profile.staffBottom;
};

// Staff presentation is independent of hand assignment and sounding pitches.
export const PIANO_STAFF_LAYOUTS = Object.freeze([
 {value:'grand',label:ko["etudes.grandStaffTrebleBassClef"]},
 {value:'treble',label:ko["etudes.singleStaffTrebleClef"]},
 {value:'bass',label:ko["etudes.singleStaffBassClef"]},
]);
export const pianoStaffLayout = value => PIANO_STAFF_LAYOUTS.some(o=>o.value===value)?value:'grand';
