import test from 'node:test';import assert from 'node:assert/strict';
import {splitChordGlyphSequence} from '../src/pdf/tab-import/chordGlyphs.js';
import {groupChordComponents} from '../src/pdf/tab-import/chordGeometry.js';
const glyphs=text=>[...text].map((_,i)=>({x:i*20,y:i===text.length-1?0:8,width:17,height:30}));
test('independently recognized neighboring G7 and raised C retain their own x anchors',()=>{
 const words=splitChordGlyphSequence([...'G7C'],glyphs('G7C'));
 assert.deepEqual(words.map(w=>[w.name,w.x,w.y,w.width]),[['G7',0,8,37],['C',40,0,17]]);
});
test('slash bass and extended chords never become multiple chord changes',()=>{
 for(const text of ['G/B','Cmaj7','F#7','Bb','Cadd9','NC','G7?','G7c'])assert.equal(splitChordGlyphSequence([...text],glyphs(text)),null,text);
});
test('raised root beside G7 stays separate while smaller superscript chord suffixes stay joined',()=>{
 const parts=[{x:0,y:19,width:29,height:32},{x:31,y:19,width:25,height:32},{x:69,y:0,width:29,height:32}];
 assert.deepEqual(groupChordComponents(parts,16),[{x:0,y:19,width:56,height:32},{x:69,y:0,width:29,height:32}]);
 assert.equal(groupChordComponents([{x:0,y:12,width:29,height:32},{x:33,y:0,width:15,height:21}],16).length,1);
});
