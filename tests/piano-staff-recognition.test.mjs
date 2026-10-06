import test from 'node:test';
import assert from 'node:assert/strict';
import {parseStaffTokens} from '../src/omr/staffTokens.js';
import {pianoMeasureConsensus,recognizePianoStaff,hasMixedPianoDurations} from '../src/omr/pianoStaffRecognition.js';
import {visiblePianoTie} from '../src/omr/pianoTieEvidence.js';
import {parsePianoTokens} from '../src/omr/pianoPolyphony.js';
const parse=body=>parseStaffTokens('clef-F4+keySignature-GM+timeSignature-4/4+'+body+'+barline');
test('piano crop consensus rejects wrong pitches, incomplete rhythm, false clefs and extra bars',()=>{
 const a=parse('note-C3_whole|note-E3_whole'),b=structuredClone(a);
 assert.equal(pianoMeasureConsensus([a,b],'clef-F4'),a);
 for(const other of [parse('note-C3_whole|note-F3_whole'),parse('note-C3_half|note-E3_half'),parse('note-C3_whole|note-E3_whole+barline+rest-whole'),{...b,clef:'clef-G2'}])assert.equal(pianoMeasureConsensus([a,other],'clef-F4'),null);
});
test('independent visible curved tie passes while a beam, a staff rule and blank pixels do not',()=>{
 const width=260,height=140,g=20,ink=new Uint8Array(width*height);
 const evidence={x1:50,x2:130,y:70,spacing:g,staffLines:[30,50,70,90,110]};
 for(const y of evidence.staffLines)for(let x=0;x<width;x++)ink[y*width+x]=1;
 assert.equal(visiblePianoTie(ink,width,height,evidence),false);
 for(let x=62;x<=118;x++){const u=(x-62)/56,y=Math.round(70-20*(.25+.55*4*u*(1-u)));for(let dy=-1;dy<=1;dy++)ink[(y+dy)*width+x]=1;}
 assert.equal(visiblePianoTie(ink,width,height,evidence),true);
 const beam=new Uint8Array(width*height);for(let x=62;x<=118;x++)for(let y=48;y<=53;y++)beam[y*width+x]=1;
 assert.equal(visiblePianoTie(beam,width,height,evidence),false);
});
test('piano disagreement is bounded to three reads and carries evidence, without returning a partial successful score',async()=>{
 const system={id:3,width:300,height:120,rect:{x:0,y:0},staff:{spacing:10},rgba:new Uint8ClampedArray(300*120*4).fill(255).buffer,measures:[{x:0,width:300}]};let calls=0;
 await assert.rejects(()=>recognizePianoStaff({recognize:async()=>({text:`clef-F4+note-${++calls%2?'C':'D'}3_half+barline`})},system,{meter:[4,4],key:'C'},'clef-F4'),e=>{assert.match(e.message,/부분 결과/);assert.equal(e.pianoReadings[0].raw.length,3);return true;});
 assert.equal(calls,3);
 const controller=new AbortController();controller.abort();
 await assert.rejects(()=>recognizePianoStaff({recognize:async()=>{throw Error('must not start');}},system,{},'clef-F4',{signal:controller.signal}),{name:'AbortError'});
});
test('mixed sustained voices retain explicit ties while generic staff parsing remains strict',()=>{
 const raw='clef-G2+keySignature-GM+timeSignature-4/4+note-D4_whole|note-E4_whole|note-G4_half+note-A4_half+barline';
 assert(hasMixedPianoDurations({raw}));assert(!hasMixedPianoDurations({raw:'note-C3_quarter|note-E3_quarter'}));
 assert(parseStaffTokens(raw).measures[0].events[0].unread);
 const parsed=parsePianoTokens(raw,{meter:[4,4],key:'G'});
 assert.deepEqual(parsed.measures[0].events.map(e=>[e.duration,e.notes.map(n=>n.midi),e.pianoTiePitchesFromPrevious]),[['2',[62,64,67],[]],['2',[62,64,69],[62,64]]]);
 assert(pianoMeasureConsensus([parsed,structuredClone(parsed)],'clef-G2'));
});
