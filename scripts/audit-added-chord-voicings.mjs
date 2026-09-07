// Read-only production audit. Writes evidence only; never changes chord data.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadChordRuntime,snapshotChordRuntime} from '../tests/helpers/chord-runtime.mjs';
import {ADDITIONAL_CHORD_SHAPES} from '../src/chords/additionalChords.js';
import {CHORD_TONE_INTERVALS} from '../src/chords/chordTheory.js';
// Independent audit oracle, intentionally not derived from production formulas.
const formulas={major:{'5':[0,7],add2:[0,2,4,7],add11:[0,4,7,17],maj11:[0,4,7,11,14,17],maj13:[0,4,7,11,14,17,21],'11':[0,4,7,10,14,17],'13':[0,4,7,10,14,17,21],'7b5':[0,4,6,10],'7#5':[0,4,8,10],'7b9':[0,4,7,10,13],'7#9':[0,4,7,10,15],'6/9':[0,4,7,9,14],add9:[0,4,7,14]},minor:{m11:[0,3,7,10,14,17],m13:[0,3,7,10,14,17,21],m7b5:[0,3,6,10]}};
formulas.dim={dim7:[0,3,6,9]};
const degrees={5:[0,4],add2:[0,1,2,4],add11:[0,2,4,3],maj11:[0,2,4,6,1,3],maj13:[0,2,4,6,1,3,5],11:[0,2,4,6,1,3],13:[0,2,4,6,1,3,5],'7b5':[0,2,4,6],'7#5':[0,2,4,6],'7b9':[0,2,4,6,1],'7#9':[0,2,4,6,1],'6/9':[0,2,4,5,1],add9:[0,2,4,1],m11:[0,2,4,6,1,3],m13:[0,2,4,6,1,3,5],m7b5:[0,2,4,6],dim7:[0,2,4,6]};
const natural={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const pc=s=>((natural[s[0]]+[...s.slice(1)].reduce((a,c)=>a+(c==='#'?1:-1),0))%12+12)%12;
const tuning={6:40,5:45,4:50,3:55,2:59,1:64};
const spell=(root,interval,degree)=>{const letter='CDEFGAB'[('CDEFGAB'.indexOf(root[0])+degree)%7];const delta=((pc(root)+interval-natural[letter]+120+6)%12)-6;return letter+(delta<0?'b'.repeat(-delta):'#'.repeat(delta));};
const midi=p=>{const m=/^([A-G][#b]*)(-?\d+)$/.exec(p);return m?12*(Number(m[2])+1)+pc(m[1]):NaN;};
function inspect(root,quality,extension,chord,position,declared=[]) {
 const intervals=formulas[quality][extension],tonePcs=intervals.map(i=>(pc(root)+i)%12),errors=[];
 const strings=[6,5,4,3,2,1].map(string=>{const note=chord.notes.find(n=>Number(n.stringNumber)===string);const fret=note?Number(note.fretNumber??note.fret):null;return {string,fret,state:fret===null?'x':fret===0?'o':'fretted',midi:fret===null?null:tuning[string]+fret,label:note?.label??null,finger:note?.finger??null};});
 const played=strings.filter(s=>s.fret!==null),present=new Set(played.map(s=>s.midi%12));
 const omitted=intervals.filter(i=>!present.has((pc(root)+i)%12));
 const foreign=played.filter(s=>!tonePcs.includes(s.midi%12));
 if(foreign.length)errors.push('foreign-tone');
 if(JSON.stringify([...CHORD_TONE_INTERVALS[quality][extension]])!==JSON.stringify(intervals))errors.push('incorrect-theory-formula');
 if(omitted.some(i=>!declared.includes(i))||declared.some(i=>!omitted.includes(i)))errors.push('undeclared-or-inaccurate-omission');
 const thirteenth=['13','maj13','m13'].includes(extension);
 if(declared.some(i=>!thirteenth||![7,17].includes(i)))errors.push('forbidden-omission');
 for(const s of played){const n=chord.notes.find(n=>n.stringNumber===s.string);if(midi(n.pitch)!==s.midi)errors.push('pitch-fret-mismatch');if(s.fret<0||s.fret>24)errors.push('invalid-fret');if(s.label&&pc(s.label)!==s.midi%12)errors.push('label-pitch-mismatch');}
 if(new Set(played.map(s=>s.string)).size!==chord.notes.length)errors.push('duplicate-string');
 if(Math.min(...played.map(s=>s.midi))%12!==pc(root))errors.push('non-root-bass');
 if(position) for(const s of strings){const state=position.stringStates[s.string]??'fretted';if(state!==s.state)errors.push('xo-mismatch');const n=position.notes.find(n=>n.stringNumber===s.string);if(s.fret>0&&(!n||Number(n.fretNumber)!==s.fret))errors.push('position-fret-mismatch');}
 const mechanical=[];
 for(const finger of ['1','2','3','4']){const notes=played.filter(s=>s.fret>0&&s.finger===finger);if(new Set(notes.map(n=>n.fret)).size>1)mechanical.push('same-finger-multiple-frets');}
 for(const b of chord.barres??[])for(const s of played)if(s.string<=Math.max(b.fromString,b.toString)&&s.string>=Math.min(b.fromString,b.toString)&&s.fret<b.fret)mechanical.push('barre-blocks-lower-note');
 const frets=played.filter(s=>s.fret>0).map(s=>s.fret),span=Math.max(...frets)-Math.min(...frets),flags=[];
 if(span>=3&&Math.min(...frets)<=3)flags.push('low-position-span-at-least-three-review');
 if(played.some(s=>s.string===6&&s.fret===Math.max(...frets))&&played.some(s=>s.string===1&&s.fret===Math.max(...frets))&&span>=3)flags.push('outer-strings-high-fret-with-interior-low-grip-review');
 return {theory:intervals.map((i,j)=>spell(root,i,degrees[extension][j])),strings,omitted:omitted.map(i=>spell(root,i,degrees[extension][intervals.indexOf(i)])),foreign,errors:[...new Set(errors)],mechanicalErrors:[...new Set(mechanical)],ergonomicReviewFlags:flags,physicalPlayability:'NOT_CERTIFIED_BY_STATIC_CHECKS',representativeSuitability:'UNVERIFIED_NO_EXACT_VOICING_SOURCE_OR_REVIEW_RECORD'};
}
const runtime=await loadChordRuntime(),rows=[],representatives=[];
for(const displayRoot of [...names,'Db','Eb','Gb','Ab','Bb'])for(const [quality,extensions]of Object.entries(ADDITIONAL_CHORD_SHAPES))for(const extension of Object.keys(extensions)){
 const root=names[pc(displayRoot)],displayName=displayRoot+extension,args={root,quality,extension,displayName};
 const positions=runtime.buildChordReferencePositionMap(args);
 for(const candidate of runtime.getChordShapeTemplateCandidates(root,quality,extension)){
  const chord=runtime.buildGeneratedChordShapeOption({...args,candidate});const position=runtime.buildStoredChordReferencePosition(chord);
  const row={displayName,root,quality,extension,template:candidate.template.id,baseFret:candidate.baseFret,score:candidate.score,...inspect(displayRoot,quality,extension,chord,position,candidate.template.omittedIntervals??[])};
  const target=Object.values(positions).find(p=>p.id.includes(`-${candidate.template.id}-${candidate.baseFret}-position`));row.positionId=target?.id??null;row.firstPosition=target===positions.position1;
  // Verify spelling independently, not just the letter or pitch class.
  for(const s of row.strings.filter(s=>s.fret!==null)){const index=formulas[quality][extension].findIndex(i=>(pc(displayRoot)+i)%12===s.midi%12);if(s.label!==row.theory[index])row.errors.push('incorrect-diatonic-spelling');}
  const meta=runtime.getChordMetaFromLabel(displayName);if(meta.root!==root||meta.quality!==quality||meta.extension!==extension)row.errors.push('display-name-parser-mismatch');
  rows.push(row);if(row.firstPosition)representatives.push(row);
 }
}
const fArgs={root:'F',quality:'major',extension:'add9',displayName:'Fadd9'};
const fChord=runtime.buildGeneratedChordShapeOption(fArgs);const fActual=inspect('F','major','add9',fChord,runtime.buildChordReferencePositionMap(fArgs).position1);
const reported=structuredClone(fChord);const third=reported.notes.find(n=>n.stringNumber===3);third.fret=third.fretNumber=3;third.pitch='A#3';third.label='Bb';
const fReported=inspect('F','major','add9',reported,null);
assert.ok(fReported.errors.includes('foreign-tone'));assert.ok(fReported.errors.includes('undeclared-or-inaccurate-omission'));
// Detect a corrupt formula even when the voicing would match that corrupt definition.
assert.deepEqual(fActual.errors,[]);
const baseline=JSON.parse(await readFile(new URL('../tests/fixtures/chords-before-badd9.json',import.meta.url),'utf8'));const current=snapshotChordRuntime(runtime);const changed=[];
for(const [key,value]of Object.entries(baseline)){if(key.endsWith(':major:6/9')||key.endsWith(':minor:m7b5'))continue;try{assert.deepEqual(JSON.parse(JSON.stringify(current[key]).replaceAll('m(add9)','madd9')),value);}catch{changed.push(key);}}
const appSource=await readFile('src/App.jsx','utf8');
vm.runInContext(appSource.slice(appSource.indexOf('function getMiniChordLabelParts('),appSource.indexOf('function getMiniChordPickerChord(')),runtime);
const labelRoundTripFailures=[];
for(const root of [...names,'Db','Eb','Gb','Ab','Bb']) {
  const label=root+'m(add9)', result=runtime.getMiniChordLabelParts(label);
  if(result.extension!=='add9'||result.quality!=='minor')labelRoundTripFailures.push({label,result});
}
const sourceHashes={};for(const p of ['src/App.jsx','src/chords/additionalChords.js','src/chords/chordTheory.js','src/components/Fretboard.jsx'])sourceHashes[p]=createHash('sha256').update(await readFile(p)).digest('hex');
const summary={scope:'14 new types + 6/9 and m7b5 data repairs; 12 pitch-class roots + 5 flat spellings',sourceHashes,labelRoundTripFailures,candidates:rows.length,canonicalCandidates:rows.filter(r=>names.includes(r.displayName.slice(0,r.displayName.length-r.extension.length))).length,representatives:representatives.length,pitchOrMetadataFailures:rows.filter(r=>r.errors.length).length,mechanicalContradictions:rows.filter(r=>r.mechanicalErrors.length).length,ergonomicReviewCandidates:rows.filter(r=>r.ergonomicReviewFlags.length).length,unverifiedRepresentatives:representatives.length,legacyUnexpectedChanges:changed,Fadd9Current:fActual,Fadd9Reported:fReported};
const output='artifacts/chord-voicing-audit';await mkdir(output,{recursive:true});await writeFile(output+'/audit.json',JSON.stringify({summary,representatives,rows},null,2));await writeFile(output+'/summary.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify({...summary,Fadd9Current:{errors:fActual.errors,strings:fActual.strings},Fadd9Reported:{errors:fReported.errors,foreign:fReported.foreign,omitted:fReported.omitted}},null,2));
