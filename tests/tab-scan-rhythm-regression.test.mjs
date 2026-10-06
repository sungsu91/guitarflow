import test from 'node:test';
import assert from 'node:assert/strict';
import {findImageTuplets,resolveImageTuplets} from '../src/pdf/tab-import/imageTuplets.js';
import {attachNativeTabSymbols} from '../src/pdf/tab-import/tabSymbols.js';
import {groupFretComponents} from '../src/pdf/tab-import/geometry.js';
import {textComponents} from '../src/pdf/tab-import/chordGeometry.js';
import {chordGlyphBounds} from '../src/pdf/tab-import/chordGlyphs.js';
import {combineMeasureChords} from '../src/pdf/tab-import/zoomConsensus.js';
import {parseChordSymbol} from '../src/chords/chordSymbols.js';
import {agreeReadings,corroborateMarginReadings} from '../src/pdf/tab-import/localOcr.js';
import {attachPageChords} from '../src/pdf/tab-import/chordRecognition.js';

test('failed margin retries preserve original evidence; only strong agreement recovers a weak crop',()=>{
 const weak=[{text:'0',confidence:.82},{text:'0',confidence:.8}];
 assert.deepEqual(corroborateMarginReadings(weak,[{text:'1',confidence:.8}]),agreeReadings(weak));
 const recovered=corroborateMarginReadings([{text:'X',confidence:0}],[{text:'9',confidence:.98},{text:'9',confidence:.96}]);
 assert.equal(recovered.text,'9');assert.equal(recovered.agrees,true);assert.equal(recovered.marginRecovered,true);
 const conflict=[{text:'0',confidence:.9}];
 assert.deepEqual(corroborateMarginReadings(conflict,[{text:'9',confidence:.98},{text:'9',confidence:.96}]),agreeReadings(conflict));
});

test('densely spaced frets with separate stems never merge into a double digit',()=>{
 const parts=[{x:80,y:30,width:11,height:18,cx:85,cy:39,string:1},{x:95,y:30,width:15,height:18,cx:102,cy:39,string:1}];
 const result=groupFretComponents(parts,{spacing:22},[{x:85},{x:102}]);
 assert.equal(result.length,2);assert(result.every(c=>c.parts===1));
});

test('scanned augmentation dots survive quantization; a connected flag still stays an eighth',()=>{
 const width=220,height=260,ink=new Uint8Array(width*height),g=22;
 const staff={nativeText:false,spacing:g,lines:[40,62,84,106,128,150],candidates:[],measures:[{x:20,width:180,rhythm:[{x:70,y:208,direction:1,duration:'8',beamCount:1,beamYs:[205]}]}]};
 for(let y=190;y<=198;y++)for(let x=79;x<=86;x++)ink[y*width+x]=1;
 attachNativeTabSymbols(ink,width,staff);assert.equal(staff.measures[0].rhythm[0].dotted,true);assert.equal(staff.measures[0].rhythm[0].duration,'8');
});

test('only bracketed, confidently read image triplets change the durations of three existing stems',()=>{
 const width=300,height=300,ink=new Uint8Array(width*height),rgba=new Uint8Array(width*height*4).fill(255),g=20;
 const paint=(x,y)=>{ink[y*width+x]=1;rgba.set([0,0,0,255],(y*width+x)*4);};
 const staff={id:1,spacing:g,measures:[{rhythm:[100,120,140].map(x=>({x,y:200,direction:1,duration:'16'}))}]};
 for(let y=210;y<=225;y++)for(let x=116;x<=125;x++)paint(x,y);
 for(const [x,sign] of [[100,1],[140,-1]]){for(let y=213;y<=219;y++)paint(x,y);for(let dx=0;dx<=5;dx++)paint(x+sign*dx,219);}
 staff.tupletCandidates=findImageTuplets(rgba,ink,width,height,staff);assert.equal(staff.tupletCandidates.length,1);
 for(const reading of [{text:'3',agrees:false,confidence:.99},{text:'3',agrees:true,confidence:.8},{text:'8',agrees:true,confidence:.99}]){staff.tupletCandidates[0].ocr=reading;resolveImageTuplets(staff);assert(staff.measures[0].rhythm.every(r=>!r.tuplet));}
 staff.tupletCandidates[0].ocr={text:'3',agrees:true,confidence:.98};resolveImageTuplets(staff);
 assert.equal(staff.measures[0].rhythm.length,3);assert(staff.measures[0].rhythm.every(r=>r.tuplet?.actualNotes===3));
 staff.measures[0].rhythm.forEach(r=>delete r.tuplet);for(let y=210;y<=230;y++)for(let x=137;x<=143;x++)ink[y*width+x]=0;
 assert.equal(findImageTuplets(rgba,ink,width,height,staff).length,0,'a stray 3 without its bracket cannot infer a tuplet');
});

test('diagram strokes between text in x order cannot split the chord suffix',()=>{
 const width=220,height=120,rgba=new Uint8Array(width*height*4).fill(255);
 const box=(x,y,w,h)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)rgba.set([0,0,0,255],(yy*width+xx)*4);};
 box(30,70,7,22);box(33,5,4,26);box(42,77,6,15);box(52,77,6,15);
 const parts=textComponents(rgba,width,height,20);assert(parts.some(p=>p.x===30&&p.width===28&&p.height===22));
});

test('separate narrow numeric glyphs remain separate despite a smaller font than the root',()=>{
 const width=70,height=35,data=new Uint8ClampedArray(width*height*4).fill(255);
 for(const [x,w,h] of [[2,12,30],[20,18,15],[44,5,23],[57,5,23]])for(let yy=30-h;yy<30;yy++)for(let xx=x;xx<x+w;xx++)data.set([0,0,0,255],(yy*width+xx)*4);
 assert.deepEqual(chordGlyphBounds({data,width,height}).map(g=>g.width),[12,18,5,5]);
});

test('zoom preserves complete chord readings independently of which rhythm bar is selected',()=>{
 const chord=(name,x,method='local-chord-ocr')=>({name,onset:0,source:{x,method},needsReview:false});
 const base={x:10,width:100,harmonyChanges:[chord('Cmaj7',20,'local-chord-glyph-consensus')]};
 const zoom={x:20,width:200,harmonyChanges:[chord('Cm7',40),{...chord('Em11',140,'local-chord-glyph-consensus'),onset:960}]};
 const target={x:10,width:100,rhythmValid:true,slots:[{x:20,duration:'2'},{x:70,duration:'2'}]};
 combineMeasureChords(base,zoom,target);
 assert.deepEqual(target.harmonyChanges.map(c=>[c.name,c.onset]),[['Cmaj7',0],['Em11',960]]);
 assert.equal(base.harmonyChanges.length,1);
});

test('printed parenthesized extensions retain all chord tones',()=>{
 assert.equal(parseChordSymbol('D6(9)').name,'D6/9');
 assert.equal(parseChordSymbol('CM7(6)').name,'Cmaj7(6)');
 assert.deepEqual(parseChordSymbol('CM7(6)').intervals,[0,4,7,9,11]);
 assert.equal(parseChordSymbol('Cm7').name,'Cm7','minor remains distinct from major');
});

test('mid-bar chord roots align to their note rather than the preceding sixteenth',()=>{
 const slots=Array.from({length:16},(_,i)=>({x:50+i*32,duration:'16'}));
 const measure={x:0,width:580,meter:[4,4],rhythmValid:true,slots};
 const page={page:1,staffs:[{id:1,measures:[measure]}]};
 const word={name:'G',x:286,y:10,width:40,height:40,confidence:.98,method:'local-chord-ocr'};
 attachPageChords(page,[{staff:1,spacing:20,words:[word]}]);
 assert.equal(measure.harmonyChanges[0].onset,960);
 const zoom={...measure,x:0,width:1160,harmonyChanges:measure.harmonyChanges.map(c=>({...c,source:{...c.source,x:572,width:80,height:80}}))};
 combineMeasureChords(measure,zoom,measure);
 assert.equal(measure.harmonyChanges[0].onset,960);
});
