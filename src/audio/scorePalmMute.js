// Damping changes the audible tail, never the written duration or transport.
// A tied/legato voice can be damped later but cannot regain energy unpicked.
export function palmMuteOffset(phrase){
 const starts=[phrase,...phrase.segments??[]].flatMap(note=>note.palmMuteStart!=null?[note.palmMuteStart]:note.palmMute?[note.start]:[]);
 return starts.length?Math.max(0,Math.min(...starts)-phrase.start):null;
}
export function createPalmMuteGate(audio,phrase,when,output){
 const offset=palmMuteOffset(phrase);if(offset===null)return null;
 const gate=audio.createGain();gate.gain.setValueAtTime(1,when);
 gate.gain.setValueAtTime(1,when+offset+.008);
 gate.gain.exponentialRampToValueAtTime(.0001,when+offset+.18);
 gate.connect(output);return gate;
}
