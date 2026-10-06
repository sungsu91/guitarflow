import test from 'node:test';
import assert from 'node:assert/strict';
import {detectPracticeMeasures,practiceMeasureMap,mergePracticeDetections} from '../src/pdf/autoMeasures.js';
import {practiceOrder,barAtTick} from '../src/pdf/pdfModel.js';
import {movePdfRow,removePdfRow} from '../src/pdf/pdfBarRows.js';
import {binaryPage,detectBarlines} from '../src/pdf/tab-import/geometry.js';
function raster(staves){const width=1000,height=800,rgba=new Uint8ClampedArray(width*height*4).fill(255);const ink=(x,y)=>{for(let c=0;c<3;c++)rgba[(y*width+x)*4+c]=0;};for(const {top,count,bars,right=900} of staves){for(let i=0;i<count;i++)for(let x=80;x<=right;x++)ink(x,top+i*12);for(const x of bars)for(let y=top;y<=top+(count-1)*12;y++)ink(x,y);for(let y=top+12;y<top+36;y++)ink(400,y);}return {rgba,width,height,page:1};}
for(const count of [4,5,6,7,8])test(`${count}-line staff: unequal measures, stems excluded, normalized coordinates`,()=>{const result=detectPracticeMeasures(raster([{top:100,count,bars:[80,250,570,900]}]));assert.equal(result.systems.length,1);assert.equal(result.measures.length,3);assert.deepEqual(result.measures.map(m=>m.x),[.08,.25,.57]);assert.ok(result.measures.every(m=>m.confidence===.98&&m.y>=0&&m.y+m.height<=1));});
function connect(image,x,top,bottom){for(let y=top;y<=bottom;y++)for(let c=0;c<3;c++)image.rgba[(y*image.width+x)*4+c]=0;}
test('connected notation and TAB are counted once, and both staves are highlighted',()=>{
 const image=raster([{top:100,count:5,bars:[80,250,570,900]},{top:200,count:6,bars:[80,250,570,900]},{top:450,count:6,bars:[80,400,900]}]);connect(image,80,100,260);
 const result=detectPracticeMeasures(image);assert.equal(result.systems.length,2);assert.equal(result.measures.length,5);assert.equal(result.systems[0].staffCount,2);assert.ok(result.measures[0].y<.125);assert.ok(result.measures[0].y+result.measures[0].height>.325);
});
test('unconnected adjacent rows remain sequential even when barlines align',()=>{
 const result=detectPracticeMeasures(raster([{top:100,count:6,bars:[80,250,570,900]},{top:200,count:6,bars:[80,250,570,900]}]));assert.equal(result.systems.length,2);assert.equal(result.measures.length,6);
});
test('existing playback, loops, edit and numbering work across pages',()=>{const pages=[1,2].map(page=>({...detectPracticeMeasures(raster([{top:100,count:6,bars:[80,250,570,900]}])),page,measures:detectPracticeMeasures(raster([{top:100,count:6,bars:[80,250,570,900]}])).measures.map(m=>({...m,page}))}));const barMap=practiceMeasureMap(pages,[3,4]),record={barMap};assert.deepEqual(barMap.map(b=>b.number),[1,2,3,4,5,6]);const order=practiceOrder(record);assert.equal(barAtTick(order,9).bar.page,2);assert.equal(barAtTick(order,8).bar.number,3);assert.equal(barAtTick(order,18).ended,true);assert.equal(barAtTick(practiceOrder({...record,loop:true,loopStart:3,loopEnd:4}),6,true).bar.number,3);const moved=movePdfRow(barMap,1,{x:.1,y:.2,width:.2,height:.1});assert.equal(moved[0].x,.1);assert.equal(moved[1].x,barMap[1].x);assert.equal(removePdfRow(barMap,2).barMap.length,5);});

test('dense short glyph strokes cannot hide a staff; raster line spacing may vary by two pixels',()=>{
 const width=1000,height=300,rgba=new Uint8ClampedArray(width*height*4).fill(255),paint=(x,y)=>{for(let c=0;c<3;c++)rgba[(y*width+x)*4+c]=0;};
 const ys=[100,113,124,137,148,161];for(const y of ys)for(let x=80;x<=900;x++)paint(x,y);
 for(const x of [80,250,570,900])for(let y=100;y<=161;y++)paint(x,y);
 // Repeated digits/strumming marks create a strong extra projection row,
 // but their individual short horizontal strokes are not staff rules.
 for(let x=90;x<890;x+=15)for(let dx=0;dx<9;dx++)paint(x+dx,106);
 const result=detectPracticeMeasures({rgba,width,height,page:1});
 assert.equal(result.systems.length,1);assert.equal(result.measures.length,3);assert.deepEqual(result.measures.map(m=>m.x),[.08,.25,.57]);
});

test('several chord grids cannot be bridged into a page-wide notation staff',()=>{
 const width=1000,height=300,rgba=new Uint8ClampedArray(width*height*4).fill(255),paint=(x,y)=>{for(let c=0;c<3;c++)rgba[(y*width+x)*4+c]=0;};
 for(const left of [100,220,340,460,580,700]){for(let line=0;line<5;line++)for(let x=left;x<=left+60;x++)paint(x,100+line*12);for(let x=left;x<=left+60;x+=12)for(let y=100;y<=148;y++)paint(x,y);}
 const result=detectPracticeMeasures({rgba,width,height,page:1});assert.equal(result.systems.length,0);assert.equal(result.measures.length,0);
});

test('a shorter horizontal diagram edge above TAB must not reject the entire six-line staff',()=>{
 const image=raster([{top:100,count:6,bars:[80,250,570,900]}]);
 // The extra line is spaced like a seventh rule but spans only part of the staff.
 for(let x=100;x<650;x++)for(let c=0;c<3;c++)image.rgba[(88*image.width+x)*4+c]=0;
 const result=detectPracticeMeasures(image);assert.equal(result.systems.length,1);assert.equal(result.measures.length,3);
});
test('alternate raster only restores missing rows and preserves primary boundaries',()=>{
 const make=(y,system,x=.1)=>({page:1,system,x,y,width:.8,height:.08,barlines:[.1,.5,.9]});
 const primary={page:1,systems:[make(.4,1)],measures:[{...make(.4,1),width:.35,confidence:.98}]};
 const secondary={page:1,systems:[make(.2,1),make(.401,2)],measures:[{...make(.2,1),width:.4,confidence:.98},{...make(.401,2),width:.4,confidence:.98}]};
 const result=mergePracticeDetections(primary,secondary);assert.equal(result.systems.length,2);assert.deepEqual(result.measures.map(m=>m.system),[1,2]);assert.equal(result.measures[1].width,.35);
});

test('an interleaved long glyph row must not hide the six real TAB rules',()=>{
 const image=raster([{top:100,count:6,bars:[80,250,570,900]}]);
 for(let x=100;x<650;x++)for(let c=0;c<3;c++)image.rgba[(118*image.width+x)*4+c]=0;
 const result=detectPracticeMeasures(image);assert.equal(result.systems.length,1);assert.equal(result.measures.length,3);assert.deepEqual(result.measures.map(m=>m.x),[.08,.25,.57]);
});


test('small gaps in TAB barlines do not discard boundaries',()=>{
 const image=raster([{top:100,count:6,bars:[80,250,570,900]}]);
 for(const x of [80,250,570,900])for(const y of [105,106,129,130])for(let c=0;c<3;c++)image.rgba[(y*image.width+x)*4+c]=255;
 const result=detectPracticeMeasures(image);
 assert.equal(result.systems.length,1);assert.equal(result.measures.length,3);
 assert.deepEqual(result.measures.map(m=>m.x),[.08,.25,.57]);
});

test('a TAB row without readable barlines remains visible for review',()=>{
 const result=detectPracticeMeasures(raster([{top:100,count:6,bars:[]},{top:300,count:6,bars:[80,250,570,900]}]));
 assert.equal(result.systems.length,2);assert.equal(result.measures.length,4);
 assert.equal(result.measures[0].confidence,.72);
 assert.equal(result.measures[0].width,.82);
});

test('track spacing is fitted across all strings, not extrapolated from a distorted first gap',()=>{
 const image=raster([{top:100,count:6,bars:[80,250,570,900]}]);
 // Shift one interior rule without shifting the rest of the staff.
 for(let x=80;x<=900;x++)for(let c=0;c<3;c++){image.rgba[(112*image.width+x)*4+c]=255;image.rgba[(114*image.width+x)*4+c]=0;}
 // A long nearby stroke defeats a contiguous six-row slice.
 for(let x=100;x<650;x++)for(let c=0;c<3;c++)image.rgba[(118*image.width+x)*4+c]=0;
 const result=detectPracticeMeasures(image);assert.equal(result.systems.length,1);assert.equal(result.measures.length,3);
});

test('faint TAB rules survive alongside dark chords and barlines',()=>{
 const image=raster([{top:100,count:6,bars:[80,250,570,900]}]);
 for(let y=100;y<=160;y+=12)for(let x=81;x<900;x++)if(x!==250&&x!==570)for(let c=0;c<3;c++)image.rgba[(y*image.width+x)*4+c]=235;
 const result=detectPracticeMeasures(image);assert.equal(result.systems.length,1);assert.equal(result.measures.length,3);
});

test('a notation ledger stroke cannot turn five lines into an extra TAB row',()=>{
 const image=raster([{top:100,count:5,bars:[80,250,570,900]},{top:220,count:6,bars:[80,250,570,900]}]);
 for(let x=80;x<490;x++)for(let c=0;c<3;c++)image.rgba[(160*image.width+x)*4+c]=0;
 const result=detectPracticeMeasures(image);assert.equal(result.systems.length,2);assert.deepEqual(result.systems.map(s=>s.lineCounts),[[5],[6]]);assert.equal(result.measures.length,6);
});

test('a narrow empty TAB header is part of the first measure, not an extra pickup',()=>{
 const result=detectPracticeMeasures(raster([{top:100,count:6,bars:[180,420,660,900]}]));
 assert.equal(result.measures.length,3);assert.equal(result.measures[0].x,.08);assert.equal(result.measures[0].confidence,.72);
});

test('a narrow pickup with a rhythm stem is retained when its outer boundary is faint',()=>{
 const image=raster([{top:100,count:6,bars:[180,420,660,900]}]);
 for(let y=160;y<=183;y++)for(let c=0;c<3;c++)image.rgba[(y*image.width+130)*4+c]=0;
 const result=detectPracticeMeasures(image);assert.equal(result.measures.length,4);
});

for(const counts of [[6,6],[4,5],[5,4],[4,4]])test(`connected ${counts.join('+')} lines are one set of measures`,()=>{
 const image=raster([{top:100,count:counts[0],bars:[80,250,570,900]},{top:210,count:counts[1],bars:[80,250,570,900]}]);connect(image,80,100,210+(counts[1]-1)*12);
 const result=detectPracticeMeasures(image);assert.equal(result.systems.length,1);assert.equal(result.measures.length,3);assert.equal(result.systems[0].staffCount,2);assert.ok(result.measures.every(m=>m.confidence===.98));
});
test('connected barlines through multiple staves still delimit each measure',()=>{
 const image=raster([{top:100,count:5,bars:[80,250,570,900]},{top:210,count:4,bars:[80,250,570,900]}]);for(const x of [80,250,570,900])connect(image,x,100,246);
 const result=detectPracticeMeasures(image);assert.equal(result.systems.length,1);assert.equal(result.measures.length,3);
});
test('a narrow final measure is retained; the final double bar is a single edge',()=>{
 const result=detectPracticeMeasures(raster([{top:100,count:4,bars:[80,400,875,897,900]}]));assert.equal(result.measures.length,3);assert.ok(result.measures.at(-1).width<.036);assert.ok(result.measures.at(-1).width>.018);
});
test('a shortened final staff keeps its own right edge',()=>{
 const result=detectPracticeMeasures(raster([{top:100,count:4,bars:[80,400,900]},{top:300,count:4,right:260,bars:[80,260]}]));assert.equal(result.systems.length,2);assert.equal(result.measures.length,3);assert.equal(result.measures.at(-1).width,.18);
});
test('four, five and six-line rows can coexist without hiding one another',()=>{
 const result=detectPracticeMeasures(raster([{top:100,count:4,bars:[80,400,900]},{top:300,count:5,bars:[80,400,900]},{top:500,count:6,bars:[80,400,900]}]));assert.equal(result.systems.length,3);assert.equal(result.measures.length,6);assert.deepEqual(result.systems.map(s=>s.lineCounts),[[4],[5],[6]]);
});
test('one-line percussion uses two-sided barlines and excludes one-sided stems',()=>{
 const image=raster([{top:100,count:1,bars:[]}]);for(const x of [80,250,570,900])connect(image,x,88,112);for(const x of [140,350,450,620,780])connect(image,x,75,100);
 const result=detectPracticeMeasures(image);assert.equal(result.systems.length,1);assert.equal(result.measures.length,3);assert.deepEqual(result.systems[0].lineCounts,[1]);
});

test('a connected clef header before a repeat-start double line is not a measure',()=>{
 const image=raster([{top:100,count:5,bars:[80,180,186,420,660,900]},{top:210,count:6,bars:[80,180,186,420,660,900]}]);connect(image,80,100,270);
 const result=detectPracticeMeasures(image);assert.equal(result.systems.length,1);assert.equal(result.measures.length,3);assert.ok(result.measures[0].x<.09);assert.ok(result.measures[0].width>.32);
});

test('a narrow rest measure with ordinary boundaries is retained',()=>{
 const result=detectPracticeMeasures(raster([{top:100,count:4,bars:[80,180,420,660,900]}]));assert.equal(result.measures.length,4);
});

test('repeat hooks aligned on both staves are not connecting barlines',()=>{
 const image=raster([{top:100,count:5,bars:[80,180,186,420,660,900]},{top:210,count:6,bars:[80,180,186,420,660,900]}]);connect(image,80,100,270);
 for(const x of [180,186]){connect(image,x,93,155);connect(image,x,203,277);}
 const result=detectPracticeMeasures(image);assert.equal(result.systems.length,1);assert.equal(result.measures.length,3);
});

test('an alternate render can recover a shared system without counting its parts twice',()=>{
 const row=(system,y,height,staffCount=1)=>({system,y,height,x:.08,width:.82,staffCount});
 const primary={page:1,systems:[row(1,.1,.06),row(2,.2,.06),row(3,.5,.06)],measures:[1,2,3].map(system=>({system,x:.08,width:.82,confidence:.98}))};
 const secondary={page:1,systems:[row(1,.1,.16,2)],measures:[{system:1,x:.08,y:.1,width:.82,height:.16,confidence:.98}]};
 const result=mergePracticeDetections(primary,secondary);assert.equal(result.systems.length,2);assert.equal(result.measures.length,2);assert.equal(result.systems[0].staffCount,2);assert.equal(result.measures[1].system,2);
});

function fill(image,left,top,right,bottom){for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)for(let c=0;c<3;c++)image.rgba[(y*image.width+x)*4+c]=0;}
function crossingNote(image,x,top,{down=false,head=true,beam=true}={}){
 const bottom=top+48;connect(image,x,top,bottom);
 const center=x+(down?6:-6),cy=down?top:bottom;
 if(head)for(let dy=-4;dy<=4;dy++)for(let dx=-7;dx<=7;dx++)if(dx*dx/49+dy*dy/16<=1)fill(image,center+dx,cy+dy,center+dx,cy+dy);
 if(beam)fill(image,down?x-35:x,down?bottom-4:top,down?x:x+35,down?bottom:top+4);
}
for(const down of [false,true])test(`a ${down?'downward':'upward'} beamed stem reaching both outer staff rules is not a barline`,()=>{
 const image=raster([{top:100,count:5,bars:[80,570,900]}]);crossingNote(image,320,100,{down});
 // The generic TAB detector stays unchanged; only practice layout applies
 // notehead/beam evidence to this otherwise plausible full-height column.
 const staff={x:80,y:100,width:820,height:48,spacing:12,thickness:1,lines:[100,112,124,136,148]};
 assert.ok(detectBarlines(binaryPage(image.rgba,1000,800),1000,staff).bars.includes(320));
 const result=detectPracticeMeasures(image);assert.equal(result.measures.length,2);assert.deepEqual(result.systems[0].barlines,[.08,.57,.9]);
});
for(const part of ['head','beam'])test(`a real boundary with only a nearby ${part} remains a boundary`,()=>{
 const image=raster([{top:100,count:5,bars:[80,320,570,900]}]);crossingNote(image,320,100,{head:part==='head',beam:part==='beam'});
 const result=detectPracticeMeasures(image);assert.equal(result.measures.length,3);assert.ok(result.systems[0].barlines.includes(.32));
});
test('a ruled open staff start and a visible right boundary establish its first measure',()=>{
 const result=detectPracticeMeasures(raster([{top:100,count:5,bars:[400,650,900]}]));
 assert.equal(result.measures.length,3);assert.equal(result.measures[0].x,.08);assert.equal(result.measures[0].confidence,.98);
});
test('a very short final open staff with only a final double bar is one last measure',()=>{
 const result=detectPracticeMeasures(raster([{top:100,count:5,bars:[400,650,900]},{top:300,count:5,right:190,bars:[187,190]}]));
 assert.equal(result.systems.length,2);assert.equal(result.measures.length,4);
 const last=result.measures.at(-1);assert.equal(last.x,.08);assert.equal(last.width,.11);assert.equal(last.confidence,.98);
 assert.deepEqual(practiceMeasureMap([result],[4,4]).map(m=>m.number),[1,2,3,4]);
});
test('a short ruled shape without a closing bar is not promoted to a final measure',()=>{
 const result=detectPracticeMeasures(raster([{top:100,count:5,bars:[400,650,900]},{top:300,count:5,right:190,bars:[]}]));
 assert.equal(result.systems.length,1);assert.equal(result.measures.length,3);
});

test('a brace extending the staff span leftwards does not hide the system spine',()=>{
 const image=raster([{top:100,count:5,bars:[80,250,570,900]},{top:210,count:5,bars:[80,250,570,900]},{top:320,count:5,bars:[80,250,570,900]}]);
 connect(image,80,100,368);
 for(const top of [210,320])for(let line=0;line<5;line++)fill(image,66,top+line*12,67,top+line*12);
 // Only the piano barlines cross the gap; the vocal part still shares them.
 for(const x of [250,570,900])connect(image,x,210,368);
 const r=detectPracticeMeasures(image);assert.equal(r.systems.length,1,JSON.stringify(r.systems));assert.equal(r.systems[0].staffCount,3);assert.equal(r.measures.length,3);
});

test('a curved brace without a straight spine groups two hands but keeps the next system separate',()=>{
 const image=raster([{top:100,count:5,bars:[250,570,900]},{top:210,count:5,bars:[250,570,900]},{top:450,count:5,bars:[250,570,900]}]);
 for(let y=100;y<=258;y++){const u=(y-100)/158,x=Math.round(76-15*Math.abs(Math.sin(u*Math.PI*2)));fill(image,x,y,x+1,y);}
 const r=detectPracticeMeasures(image);assert.equal(r.systems.length,2);assert.equal(r.systems[0].staffCount,2);assert.equal(r.measures.length,6);
});

test('a beam touching the top rule and dense ledger notes do not create stacked one-line staffs',()=>{
 const image=raster([{top:100,count:5,bars:[80,400,650,900]}]);
 // Dense ledger lines are bridged by the rule mask but are not full rules.
 for(let x=100;x<890;x+=30)for(const y of [160,172])fill(image,x,y,x+13,y+1);
 for(let x=100;x<860;x+=150)fill(image,x,97,x+110,103);
 const r=detectPracticeMeasures(image);assert.equal(r.systems.length,1);assert.deepEqual(r.systems[0].lineCounts,[5]);assert.equal(r.measures.length,3);
});

test('a one-hand full-height beamed stem cannot split a paired piano measure',()=>{
 const image=raster([{top:100,count:5,bars:[80,570,900]},{top:210,count:5,bars:[80,570,900]}]);connect(image,80,100,258);crossingNote(image,320,100);
 const r=detectPracticeMeasures(image);assert.equal(r.systems.length,1);assert.equal(r.measures.length,2);assert.equal(r.systems[0].staffCount,2);
});

test('a tied chord beside a real shared barline cannot erase that piano boundary',()=>{
 const image=raster([{top:100,count:5,bars:[80,320,570,900]},{top:210,count:5,bars:[80,320,570,900]},{top:320,count:5,bars:[80,320,570,900]}]);
 connect(image,80,100,368);for(const x of [320,570,900])connect(image,x,210,368);
 crossingNote(image,320,210);
 const r=detectPracticeMeasures(image);assert.equal(r.systems.length,1);assert.equal(r.systems[0].staffCount,3);assert.equal(r.measures.length,3);assert.ok(r.systems[0].barlines.includes(.32));
});

test('stacked hi-hat crosses, snare and kick with beams are one drum measure, not additive measures',()=>{
 const image=raster([{top:100,count:5,bars:[80,900]}]);
 for(let x=180;x<890;x+=90){
  for(let d=-5;d<=5;d++){fill(image,x+d,88+d,x+d+1,88+d);fill(image,x+d,88-d,x+d+1,88-d);}
  connect(image,x+5,79,148);fill(image,x+5,78,Math.min(x+85,895),81);
  for(const y of [124,148])for(let dy=-3;dy<=3;dy++)for(let dx=-5;dx<=5;dx++)if(dx*dx/25+dy*dy/9<=1)fill(image,x+dx,y+dy,x+dx,y+dy);
 }
 const r=detectPracticeMeasures(image);assert.equal(r.systems.length,1);assert.equal(r.measures.length,1);assert.deepEqual(r.systems[0].lineCounts,[5]);
 const bars=practiceMeasureMap([r],[4,4]);assert.equal(bars[0].beats,4);assert.equal(barAtTick(practiceOrder({barMap:bars}),4).ended,true);
});
