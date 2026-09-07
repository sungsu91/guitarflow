import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {loadChordRuntime,snapshotChordRuntime} from './helpers/chord-runtime.mjs';
import {FIXED_ADD_VOICINGS} from '../src/chords/fixedAddVoicings.js';
const plain=x=>JSON.parse(JSON.stringify(x));
const before=JSON.parse(await readFile(new URL('./fixtures/before-add-family.json',import.meta.url)));
const runtime=await loadChordRuntime();
test('every out-of-scope voicing, fingering, window and position is unchanged, including Badd9',()=>{
 const after=snapshotChordRuntime(runtime);
 for(const [key,value]of Object.entries(before)){
  if(/:major:add[29]$/.test(key)&&key!=='B:major:add9')continue;
  assert.deepEqual(after[key],value,key);
 }
});
test('fixed add family validates all string pitches, complete theory, X/O, spelling and finger/barre structure',()=>{
 const naturals={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
 const pc=n=>(naturals[n[0]]+[...n.slice(1)].reduce((v,c)=>v+(c==='#'?1:-1),0)+24)%12;
 const aliases={C:'C','C#':'C#',Cb:'B',Db:'C#',D:'D','D#':'D#',Eb:'D#',E:'E','E#':'F',Fb:'E',F:'F','F#':'F#',Gb:'F#',G:'G','G#':'G#',Ab:'G#',A:'A','A#':'A#',Bb:'A#',B:'B','B#':'C'};
 for(const [label,root]of Object.entries(aliases))for(const extension of ['add2','add9']){
  if(label==='B'&&extension==='add9')continue; // Exact compatibility snapshot tested above.
  const args={root,quality:'major',extension,displayName:label+extension};
  const positions=runtime.buildChordReferencePositionMap(args);
  const chords=runtime.buildFixedAddReferenceChords(args);
  assert.equal(chords.length,Object.keys(positions).length);
  chords.forEach((chord,i)=>{
   const record=FIXED_ADD_VOICINGS[root][extension][i];
   const actual=chord.notes.map(n=>runtime.pitchToMidi(n.pitch));
   assert.deepEqual([...new Set(actual.map(m=>(m-pc(label)+120)%12))].sort((a,b)=>a-b),[0,2,4,7],label+extension);
   assert.equal(chord.voicing.positionOrder,i+1);
   assert.ok(record.sources.length);
   for(let j=0;j<6;j++){
    const n=chord.notes.find(n=>n.stringNumber===6-j),f=record.frets[j];
    assert.equal(n?.fretNumber??null,f);
    assert.equal(positions[`position${i+1}`].stringStates[6-j],f===null?'x':f===0?'o':undefined);
    if(n){assert.equal(pc(n.label),actual[chord.notes.indexOf(n)]%12);assert.ok(n.degree);}
   }
   for(const finger of ['1','2','3','4'])assert.ok(new Set(chord.notes.filter(n=>n.finger===finger&&n.fretNumber>0).map(n=>n.fretNumber)).size<=1);
   for(const b of chord.barres)for(const n of chord.notes)if(n.stringNumber<=b.fromString&&n.stringNumber>=b.toString)assert.ok(n.fretNumber>=b.fret);
  });
 }
});
test('position order does not depend on generators, scores or stored chord preference',async()=>{
 const r=await loadChordRuntime();
 const args={root:'C',quality:'major',extension:'add9',displayName:'Cadd9'};
 const before=plain(r.buildChordReferencePositionMap(args));
 vm.runInContext('getChordShapeTemplateCandidates = () => { throw new Error("must not generate"); }; buildGeneratedChordShapeOption = () => { throw new Error("must not generate"); };',r);
 assert.deepEqual(plain(r.buildChordReferencePositionMap({...args,storedChord:{id:'unexpected'}})),before);
 assert.equal(r.buildChordToneReferenceOption(args).voicing.templateId,'c-open-nine');
 assert.equal(r.buildChordToneReferenceOption({root:'B',quality:'major',extension:'add9',displayName:'Badd9'}).root,'B');
});
test('open Gadd2 is never transposed into Aadd2 and approved first positions are fixed',()=>{
 const expected={C:['x 3 2 0 3 3','x 3 2 0 3 0'],D:['x 5 4 x 5 5','x x 0 2 5 2'],E:['0 2 4 1 0 0','0 2 2 1 0 2'],F:['x x 3 2 1 3','x x 3 2 1 3'],G:['3 0 0 0 0 3','3 2 0 2 0 3'],A:['x 0 2 4 2 0','x 0 2 4 2 0']};
 for(const [root,pair]of Object.entries(expected))['add2','add9'].forEach((ext,i)=>assert.equal(FIXED_ADD_VOICINGS[root][ext][0].frets.map(f=>f??'x').join(' '),pair[i]));
 assert.ok(!FIXED_ADD_VOICINGS.A.add2.some(r=>r.frets.join('')==='522225'));
});
test('catalog cards and expanded positions use the same fixed add data',()=>{
 for(const root of ['C','D','E','F','G','A','B']){
  const catalog=runtime.mergeChordCatalogOptions(runtime.catalog.filter(c=>c.root===root),runtime.buildSelectableChordCatalogOptions(root));
  for(const extension of ['add2','add9']){
   const chord=catalog.find(c=>c.quality==='major'&&c.extension===extension);
   const expected=runtime.buildChordToneReferenceOption({root,quality:'major',extension,displayName:root+extension});
   assert.deepEqual(plain(chord.notes),plain(expected.notes));
  }
 }
});
