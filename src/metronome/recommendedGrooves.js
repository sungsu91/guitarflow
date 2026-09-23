import ko from "../i18n/locales/ko.js";
// Practice arrangements, not definitive genre patterns or transcriptions of songs.
const all16 = Array.from({length:16}, (_,i)=>i+1);
const shuffle = [1,3,4,6,7,9,10,12];
function row(tone, hits, levels = {}, volume = .75) {
  if(new Set(hits).size!==hits.length || hits.some(i=>!Number.isInteger(i)||i<1||i>16)) throw new Error('Invalid groove hit positions');
  const steps=Array(72).fill(false), velocities=Array(72).fill(70);
  for(const slot of hits) {steps[slot-1]=true;velocities[slot-1]=levels[slot] ?? 70;}
  return {tone,steps,velocities,volume,muted:false};
}
const levels=(slots,value)=>Object.fromEntries(slots.map(i=>[i,value]));
const shuffleLight=levels([3,6,9,12],45);
function pack(id,title,category,bpm,triplet,description,rows) {
  return {id:`recommended-${id}`,title,category,bpm,builtin:true,timeSignature:'4/4',subdivision:triplet?'eighth-triplet':'sixteenth',description,pattern:{name:`recommended-${id}`,rows}};
}
export const GROOVE_CATEGORIES=[ko["app.all"],ko["metronome.jazz"],ko["metronome.blues"],ko["components.popBallad"],ko["components.funkDisco"],ko["metronome.latin"]];
export const RECOMMENDED_GROOVE_PACKS = [
  pack('01',ko["metronome.jazzRideSwing"],ko["metronome.jazz"],110,true,ko["metronome.lightSwingPracticeLedByTheRideCymbal"],[
    row('ride',[1,4,6,7,10,12],{4:100,10:100,6:45,12:45},.85),row('hihat',[4,10],levels([4,10],45),.65),row('kick',[1,4,7,10],levels([1,4,7,10],25),.7)]),
  pack('02',ko["metronome.bluesShuffle"],ko["metronome.blues"],90,true,ko["metronome.aBasicShuffleUsingTheFirstAndThirdTripletNotes"],[
    row('hihat',shuffle,shuffleLight,.75),row('snare',[4,10],levels([4,10],100),.75),row('kick',[1,7],{},.9)]),
  pack('03',ko["metronome.bluesDrive"],ko["metronome.blues"],115,true,ko["metronome.bluesRockPracticeWithADrivingKick"],[
    row('ride',shuffle,shuffleLight,.85),row('snare',[4,10],levels([4,10],100),.75),row('kick',[1,4,7,9,10],{9:45},.9)]),
  pack('04',ko["metronome.halfTimeShuffle"],ko["metronome.blues"],80,true,ko["metronome.aStrongSnareOnBeat3ContrastsWithSubtleGhostNotes"],[
    row('hihat',shuffle,shuffleLight,.75),row('snare',[2,5,7,11],{2:25,5:25,7:100,11:25},.75),row('kick',[1,6,9],{},.9)]),
  pack('05',ko["metronome.popBackbeat"],ko["components.popBallad"],95,false,ko["metronome.aBasicPopRhythmForChordChangesAndStrumming"],[
    row('hihat',[1,3,5,7,9,11,13,15],levels([3,7,11,15],45),.75),row('snare',[5,13],levels([5,13],100),.75),row('kick',[1,7,9],{},.9)]),
  pack('06',ko["metronome.funkSyncopation"],ko["components.funkDisco"],100,false,ko["metronome.practiceTightRhythmPlayingWithOffbeatKicksAndGhostNotes"],[
    row('hihat',all16,levels([2,4,6,8,10,12,14,16],45),.68),row('snare',[4,5,8,12,13,16],{4:25,5:100,8:25,12:25,13:100,16:25},.75),row('kick',[1,7,10,15],{},.9)]),
  pack('07',ko["metronome.discoOffbeat"],ko["components.funkDisco"],116,false,ko["metronome.fourOnTheFloorKickWithOffbeatHiHats"],[
    row('openHihat',[3,7,11,15],levels([3,7,11,15],45),.65),row('clap',[5,13],{},.7),row('kick',[1,5,9,13],levels([1,5,9,13],100),.85)]),
  pack('08',ko["metronome.softBallad"],ko["components.popBallad"],72,false,ko["metronome.spaciousBackingForArpeggios"],[
    row('shaker',[1,3,5,7,9,11,13,15],levels([1,3,5,7,9,11,13,15],45),.6),row('rim',[5,13],{},.4),row('kick',[1,9,15],{15:45},.75)]),
  pack('09',ko["metronome.jazzLoungeEnsemble"],ko["metronome.jazz"],104,true,ko["metronome.rideLedLoungeArrangementWithBrushesAndShakerBehindIt"],[
    row('ride',[1,4,6,7,10,12],{6:45,12:45},.85),row('hihat',[4,10],levels([4,10],45),.55),row('kick',[1,7],levels([1,7],25),.7),row('brushSnare',[3,8,12],levels([3,8,12],25),.55),row('shaker',shuffle,levels(shuffle,45),.4),row('rim',[10],{10:45},.35)]),
  pack('10',ko["metronome.bluesClubBand"],ko["metronome.blues"],96,true,ko["metronome.clubBluesWithLightTambourineAndClapsOverTheBackbeat"],[
    row('hihat',shuffle,shuffleLight,.65),row('snare',[4,10],levels([4,10],100),.75),row('kick',[1,7,9],{9:45},.85),row('tambourine',[4,10],levels([4,10],45),.4),row('clap',[10],{10:25},.45),row('woodblock',[6,12],levels([6,12],45),.4)]),
  pack('11',ko["metronome.latinPopPercussion"],ko["metronome.latin"],104,false,ko["metronome.interlockingPercussionInALatinInspiredPopArrangement"],[
    row('kick',[1,7,9,15],{},.85),row('rim',[5,13],{},.45),row('shaker',all16,{...levels(all16,45),...levels([2,4,6,8,10,12,14,16],25)},.4),row('congaSlap',[4,7,12,15],{4:45,12:45},.6),row('cowbell',[1,7,11],levels([1,7,11],45),.42),row('cabasa',[3,7,11,15],levels([3,7,11,15],45),.55),row('agogo',[6,14],levels([6,14],45),.35),row('triangle',[1],{1:25},.3)]),
  pack('12',ko["metronome.discoFunkFullPercussion"],ko["components.funkDisco"],112,false,ko["metronome.richHiHatTambourineAndCowbellInterplayOverAQuarterNoteKick"],[
    row('kick',[1,5,9,13],levels([1,5,9,13],100),.85),row('snare',[5,13],levels([5,13],100),.7),row('hihat',[1,5,9,13],levels([1,5,9,13],45),.55),row('openHihat',[3,7,11,15],levels([3,7,11,15],45),.55),row('shaker',all16,{...levels(all16,45),...levels([2,4,6,8,10,12,14,16],25)},.35),row('tambourine',[3,7,11,15],levels([3,7,11,15],45),.38),row('clap',[13],{13:45},.4),row('cowbell',[4,10,16],levels([4,10,16],45),.38)]),
];
