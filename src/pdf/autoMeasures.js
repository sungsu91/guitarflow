import {binaryPage,detectStaffs,detectBarlines,runs} from './tab-import/geometry.js';
export const PRACTICE_DETECTION_VERSION='layout-10';
import {TAB_IMPORT_CONFIG} from './tab-import/config.js';
import {detectPracticeBarlines,hasRuledStaffStart} from './practiceBarlines.js';

// Dense repeated TAB digits/strumming marks can exceed the row projection
// threshold too. Only sustained horizontal strokes contribute to staff rows;
// short glyph strokes must not move a staff line's center or invent extra rules.
export function practiceStaffRules(pixels,width,height){
 const rules=new Uint8Array(pixels.length),minimum=Math.max(8,Math.ceil(width*.012));
 for(let y=0;y<height;y++){
  let start=-1,end=-1;
  for(let x=0;x<=width;x++){
   if(x<width&&pixels[y*width+x]){if(start<0)start=x;}
   else if(start>=0){if(x-start>=minimum){rules.fill(1,y*width+(end>=0&&start-end<=minimum*6?end:start),y*width+x);end=x;}start=-1;}
  }
 }
 return rules;
}

// Match equally spaced rule tracks even when a glyph adds a projection row
// between strings. The TAB importer keeps its stricter contiguous-row matcher.
export function detectPracticeStaffTracks(rules,raw,width,height,count,config){
 const ys=[],projection=new Uint32Array(height);
 for(let y=0;y<height;y++){
  let n=0;for(let x=0;x<width;x++)n+=rules[y*width+x];
  if(n>width*config.minStaffWidth){ys.push(y);for(let x=0;x<width;x++)projection[y]+=raw[y*width+x];}
 }
 const lines=runs(ys).map(group=>{
  const peak=Math.max(...group.map(y=>projection[y])),core=group.filter(y=>projection[y]>=peak*.9);
  return {y:core[Math.floor(core.length/2)],thickness:core.length};
 }),found=[];
 for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){
  // Fit the full staff height; an aliased first gap must not accumulate
  // an error across the remaining strings.
  const spacing=(lines[j].y-lines[i].y)/(count-1);if(spacing>config.maxSpacing)break;if(spacing<config.minSpacing)continue;
  const track=[lines[i]];let index=i;
  for(let k=1;k<count;k++){
   const expected=lines[i].y+k*spacing,tolerance=Math.max(2,spacing*config.spacingTolerance);
   let best=-1,distance=Infinity;
   for(let n=index+1;n<lines.length&&lines[n].y<=expected+tolerance;n++)if(Math.abs(lines[n].y-expected)<distance){best=n;distance=Math.abs(lines[n].y-expected);}
   if(best<0||distance>tolerance)break;track.push(lines[best]);index=best;
  }
  if(track.length!==count)continue;
  const xs=[];for(let x=0;x<width;x++)if(track.reduce((n,line)=>n+raw[line.y*width+x],0)>=count-1)xs.push(x);
  const span=runs(xs,Math.ceil(spacing*2)).sort((a,b)=>b.length-a.length)[0];
  if(!span)continue;
  const spanWidth=span.at(-1)-span[0];
  if(spanWidth<Math.max(width*config.minStaffWidth,spacing*(spanWidth>=width*.4?28:config.minStaffSpan??28)))continue;
  // Gap-filled rules locate tracks, but repeated ledger lines and beams are
  // not additional staff rules. Check the original ink for that decision.
  // TAB digits deliberately erase short pieces of its rules at the left edge.
  // Only notation braces need this leading-island correction.
  const leading=count===5?runs(span,2).find(run=>run.length>=spacing*2):null;
  const x=leading&&leading[0]-span[0]<spacing*3?leading[0]:span[0],right=span.at(-1),supported=line=>{let n=0;for(let col=x;col<=right;col++)n+=raw[line.y*width+col];return n/(right-x+1);};
  if(track.some(line=>supported(line)<.65))continue;
  if(lines.some(line=>!track.includes(line)&&line.y>track[0].y&&line.y<track.at(-1).y&&supported(line)>.8))continue;
  if(lines.some(line=>!track.includes(line)&&Math.min(Math.abs(line.y-track[0].y+spacing),Math.abs(line.y-track.at(-1).y-spacing))<spacing*.15&&supported(line)>.8))continue;
  found.push({lines:track.map(l=>l.y),thickness:Math.max(...track.map(l=>l.thickness)),spacing,x,y:track[0].y,width:right-x,height:track.at(-1).y-track[0].y});
 }
 return found;
}

// A shared left spine/bracket or a barline crossing the gap means these
// staves describe simultaneous parts. Equal bar widths or proximity alone
// do not: consecutive four-bar rows often have exactly the same layout.
function verticalBridge(ink,width,top,bottom,x,g){
 let covered=0,longestGap=0,gap=0;
 for(let y=Math.round(top);y<=Math.round(bottom);y++){
  const black=[-1,0,1].some(dx=>x+dx>=0&&x+dx<width&&ink[y*width+x+dx]);
  if(black){covered++;gap=0;}else longestGap=Math.max(longestGap,++gap);
 }
 return covered/(Math.round(bottom)-Math.round(top)+1)>.88&&longestGap<Math.max(3,g*.5);
}
// Follow an actual brace contour, not just aligned barlines or small spacing.
// One missing raster row is allowed; the path must span both complete staves.
function curvedStaffConnector(ink,width,a,b,g){
 const edge=Math.max(a.x,b.x),left=Math.max(0,Math.floor(edge-g*3)),right=Math.min(width-1,Math.ceil(edge)-1);
 const top=Math.round(a.y),bottom=Math.round(b.y+b.height),tolerance=Math.max(1,Math.floor(g*.2)),size=right-left+1;
 let prior=new Uint8Array(size),before=new Uint8Array(size);
 for(let y=top;y<=bottom;y++){
  const row=new Uint8Array(size);
  for(let x=left;x<=right;x++)if(ink[y*width+x]){
   const i=x-left;
   if(y<=top+tolerance)row[i]=1;
   else for(let dx=-2;dx<=2;dx++)if(prior[i+dx]||before[i+dx]){row[i]=1;break;}
   if(row[i]&&y>=bottom-tolerance)return true;
  }
  before=prior;prior=row;
 }
 return false;
}
export function connectedPracticeStaffs(ink,width,a,b){
 const g=Math.max(a.spacing,b.spacing),top=Math.round(a.y+a.height),bottom=Math.round(b.y);
 if(bottom<=top||Math.abs(a.x-b.x)>g*2||Math.abs(a.x+a.width-b.x-b.width)>g*3)return false;
 // A brace can extend the detected horizontal span to the left of the real
 // system spine. Search both staff starts, including the area between them.
 for(let x=Math.max(0,Math.floor(Math.min(a.x,b.x)-g*1.5));x<=Math.min(width-1,Math.max(a.x,b.x)+g*2);x++)if(verticalBridge(ink,width,top,bottom,x,g))return true;
 const positions=a.bars.filter(x=>b.bars.some(other=>Math.abs(x-other)<g*.35));
 for(const position of positions){
  const margin=2;
  for(let x=Math.max(0,Math.round(position)-margin);x<=Math.min(width-1,position+2);x++){
   if(verticalBridge(ink,width,top,bottom,x,g))return true;
  }
 }
 return curvedStaffConnector(ink,width,a,b,g);
}

function systemMeasures(staffs,ink,width){
 const first=staffs[0];if(staffs.length===1)return {boxes:first.measures,bars:first.bars};
 // Connected barlines extend past a single staff. Reconsider them only within
 // an established system, retaining notehead/beam rejection on each part.
 const candidates=staffs.map(s=>detectPracticeBarlines(ink,width,s,{allowExtensions:true,minMeasureSpacing:.7}).bars);
 const connectedCandidates=staffs.map(s=>detectBarlines(ink,width,s,{allowExtensions:true,minMeasureSpacing:.7}).bars);
 const g=Math.max(...staffs.map(s=>s.spacing));
 const shared=candidates.flat().filter(x=>{
  const support=candidates.map(list=>list.some(other=>Math.abs(x-other)<g*.45));
  // A tied chord can resemble a head and beam beside a real boundary on one
  // hand. Another part must endorse it, and the column must cross both staves
  // and their gap before that local note-shape rejection can be overridden.
  const connected=connectedCandidates.map(list=>list.some(other=>Math.abs(x-other)<g*.45));
  // Aligned quarter-note chords in both hands can pass the relaxed height
  // test. At least one part must also pass the normal stem-extension gate,
  // unless an actual continuous barline connects the staves through the gap.
  const bounded=staffs.some(s=>s.bars.some(other=>Math.abs(x-other)<g*.45));
  return (!staffs.some(s=>s.lines.length!==staffs[0].lines.length)&&support.every(Boolean)&&bounded)||staffs.some((s,i)=>i&&connected[i]&&connected[i-1]&&verticalBridge(ink,width,staffs[i-1].y+staffs[i-1].height,s.y,Math.round(x),g));
 });
 // Taller staves provide a stronger boundary test: a note stem that crosses
 // a small notation staff will usually not cross the accompanying TAB.
 const reference=[...staffs].sort((a,b)=>b.height-a.height)[0];
 const inHeader=x=>reference.headerEnd!=null&&x>reference.x+g&&x<=reference.headerEnd+g*.7;
 const mixed=staffs.some(s=>s.lines.length!==reference.lines.length);
 const bars=mixed?[...reference.bars.filter(x=>!inHeader(x))]:[];
 for(const x of shared)if(!inHeader(x)&&!bars.some(other=>Math.abs(x-other)<g*.7))bars.push(x);
 bars.sort((a,b)=>a-b);
 const edges=[...bars],left=Math.max(...staffs.map(s=>s.x)),right=Math.max(...staffs.map(s=>s.x+s.width));
 if(!edges.length||edges[0]-left>g)edges.unshift(left);
 if(!edges.length||right-edges.at(-1)>g)edges.push(right);
 return {bars,boxes:edges.slice(0,-1).flatMap((x,i)=>edges[i+1]-x>g*.7?[{x,width:edges[i+1]-x,boundariesKnown:bars.some(b=>Math.abs(b-x)<2)&&bars.some(b=>Math.abs(b-edges[i+1])<2)}]:[])};
}

// Single-line percussion has no string spacing. Its barlines extend on both
// sides of the rule; one-sided note stems are not measure boundaries.
function singleLineStaffs(raw,rules,ink,width,height,existing){
 const ys=[];
 for(let y=0;y<height;y++){let n=0;for(let x=0;x<width;x++)n+=rules[y*width+x];if(n>width*.4)ys.push(y);}
 const found=[];
 for(const row of runs(ys)){
  const y=row[Math.floor(row.length/2)];
  if(existing.some(s=>y>s.y-s.spacing*3&&y<s.y+s.height+s.spacing*3))continue;
  const xs=[];for(let x=0;x<width;x++)if(raw[y*width+x])xs.push(x);
  const span=runs(xs,3).sort((a,b)=>b.length-a.length)[0];if(!span||span.length<width*.4)continue;
  const left=span[0],right=span.at(-1),columns=[];
  for(let x=left;x<=right;x++){
   const lengths=[-1,1].map(sign=>{let length=0,gap=0;for(let k=1;k<width*.035;k++){const at=y+sign*k;if(at<0||at>=height)break;if(ink[at*width+x]){length=k;gap=0;}else if(++gap>1)break;}return length;});
   if(Math.min(...lengths)>Math.max(3,width*.004)&&Math.max(...lengths)<Math.min(...lengths)*1.8)columns.push({x,reach:Math.min(...lengths)});
  }
  const groups=runs(columns.map(c=>c.x),Math.max(2,Math.round(width*.006))),bars=groups.map(xs=>xs[Math.floor(xs.length/2)]);
  if(bars.length<2||bars.at(-1)-bars[0]<width*.35)continue;
  const spacing=columns.map(c=>c.reach).sort((a,b)=>a-b)[Math.floor(columns.length/2)];
  found.push({lines:[y],x:left,y:y-spacing,height:spacing*2,width:right-left,spacing,bars,measures:bars.slice(0,-1).map((x,i)=>({x,width:bars[i+1]-x,boundariesKnown:true}))});
 }
 return found;
}

// Layout only: no text, frets, rhythm, or printed repeat interpretation.
export function detectPracticeMeasures({rgba,width,height,page}) {
 const config={...TAB_IMPORT_CONFIG,minSpacing:5,maxSpacing:65,spacingTolerance:.22,alignedStaffExtension:true};
 const shortConfig={...config,minStaffWidth:.06,minStaffSpan:8};
 const ink=binaryPage(rgba,width,height),ruleVariants=[230,240].map(threshold=>{const raw=binaryPage(rgba,width,height,threshold);return {raw,rules:practiceStaffRules(raw,width,height)};});
 // Keep solid boundaries first: a shorter arpeggio spine can resemble a
 // broken barline. Relax coverage only when a whole row lacks boundaries.
 const accept=staff=>{
  let detected=detectPracticeBarlines(ink,width,staff,{minMeasureSpacing:.7});
  if(detected.bars.length<2)detected=detectPracticeBarlines(ink,width,staff,{minCoverage:.88,minMeasureSpacing:.7});
  const first=detected.measures[0];
  const ruledStart=first&&Math.abs(first.x-staff.x)<2&&detected.bars.some(x=>Math.abs(x-first.x-first.width)<2)&&hasRuledStaffStart(ruleVariants[0].raw,width,staff);
  // A TAB/time-signature header can end at the first full-height barline.
  // Do not count an inferred, narrow, rhythm-free prefix as a pickup measure.
  const [prefix,next]=detected.measures;
  // A repeat-start double line after the clef can also have a visible left
  // system spine. That spine must not turn the header into an empty measure.
  const doubleStart=()=>{
   const columns=[],top=staff.lines[0],bottom=staff.lines.at(-1),g=staff.spacing;
   for(let x=Math.max(0,Math.floor(next.x-g));x<=Math.min(width-1,next.x+g);x++){
    let n=0;for(let y=top;y<=bottom;y++)n+=ink[y*width+x]??0;
    if(n/(bottom-top+1)>.9)columns.push(x);
   }
   const groups=runs(columns);return groups.length>=2&&groups.at(-1)[0]-groups[0].at(-1)<g;
  };
  if(prefix&&next&&prefix.width<staff.width*.15&&next.width>prefix.width*2&&(!prefix.boundariesKnown||doubleStart())){
   const bottom=staff.lines.at(-1);let hasStem=false;
   for(let x=Math.ceil(prefix.x+staff.spacing);x<prefix.x+prefix.width-staff.spacing&&!hasStem;x++){
    let n=0;for(let y=bottom+2;y<=bottom+staff.spacing*1.5;y++)n+=ink[y*width+x]??0;
    hasStem=n>staff.spacing;
   }
   if(!hasStem){detected.headerEnd=next.x;detected.measures.shift();detected.measures[0]={...next,x:prefix.x,width:next.x+next.width-prefix.x,boundariesKnown:false};}
  }
  if(ruledStart&&!detected.headerEnd)detected.measures[0]={...first,boundariesKnown:true,boundaryEvidence:'staff-start'};
  if(!detected.measures.length)detected.measures=[{x:staff.x,width:staff.width,boundariesKnown:false}];
  return {...staff,...detected};
 };
 const staffs=[];
 for(const count of [6,5,4,7,8]){
  const candidates=ruleVariants.flatMap(({raw,rules})=>[...detectPracticeStaffTracks(rules,raw,width,height,count,config),...detectStaffs(rules,width,height,config,count,raw),...detectPracticeStaffTracks(rules,raw,width,height,count,shortConfig).filter(s=>s.width<width*.4)].filter(staff=>staff.lines.every(y=>{let n=0;for(let x=staff.x;x<=staff.x+staff.width;x++)n+=raw[y*width+x];return n/(staff.width+1)>.55;})));
  for(const candidate of candidates){
   if(staffs.some(s=>Math.min(s.y+s.height,candidate.y+candidate.height)>Math.max(s.y,candidate.y)))continue;
   staffs.push(accept(candidate));
  }
 }
 // A shortened final line can be much narrower than the page. Match its
 // left edge and rule spacing to full lines instead of extending it to them.
 const full=staffs.filter(s=>s.width>=width*.4);
 const selected=staffs.filter(s=>s.width>=width*.4||full.some(other=>other.lines.length===s.lines.length&&Math.abs(other.x-s.x)<Math.max(s.spacing,other.spacing)&&Math.abs(other.spacing-s.spacing)<other.spacing*.25)&&s.bars.some(x=>Math.abs(x-s.x-s.width)<s.spacing));
 const {raw,rules}=ruleVariants[0];
 selected.push(...singleLineStaffs(raw,rules,ink,width,height,staffs));
 selected.sort((a,b)=>a.y-b.y);
 const systems=[];
 for(const staff of selected){
  const prior=systems.at(-1);
  if(prior&&connectedPracticeStaffs(ink,width,prior.staffs.at(-1),staff))prior.staffs.push(staff);
  else systems.push({staffs:[staff]});
 }
 const measures=[],debug=[];
 for(const [index,system] of systems.entries()){
  const first=system.staffs[0],last=system.staffs.at(-1),top=Math.max(0,first.y-first.spacing*.75),bottom=Math.min(height,last.y+last.height+last.spacing*.75);
  const {boxes,bars}=systemMeasures(system.staffs,ink,width);
  debug.push({system:index+1,x:first.x/width,y:top/height,width:first.width/width,height:(bottom-top)/height,barlines:bars.map(x=>x/width),staffCount:system.staffs.length,lineCounts:system.staffs.map(s=>s.lines.length)});
  const staves=system.staffs.map(s=>({top:(s.y-top)/(bottom-top),height:s.height/(bottom-top),lines:s.lines.length}));
  for(const box of boxes)measures.push({page,system:index+1,x:box.x/width,y:top/height,width:box.width/width,height:(bottom-top)/height,staves,confidence:box.boundariesKnown ? .98 : .72});
 }
 return {page,systems:debug,measures,engineVersion:PRACTICE_DETECTION_VERSION};
}

// Single-measure entries are an existing supported barMap format. This also
// avoids assuming a system has at most four measures or equal-width measures.
export function practiceMeasureMap(pages,meter){
 return pages.flatMap(p=>p.measures).map((box,index)=>({...box,number:index+1,autoGenerated:true,count:1,beats:meter[0],meter:[...meter]}));
}



// Thin rules and nearby diagrams can merge differently at different raster scales.
// Keep primary boundaries unless the alternate render proves that split rows
// belong to one connected system. Never infer an equal four-bar layout.
export function mergePracticeDetections(primary,secondary){
 const rows=primary.systems.map(system=>({system,measures:primary.measures.filter(m=>m.system===system.system)}));
 for(const system of secondary.systems){
  const overlaps=rows.filter(row=>Math.min(row.system.y+row.system.height,system.y+system.height)>Math.max(row.system.y,system.y));
  if(overlaps.length){
   const joined=(system.staffCount??1)>Math.max(...overlaps.map(row=>row.system.staffCount??1))&&overlaps.every(row=>row.system.y>=system.y-.005&&row.system.y+row.system.height<=system.y+system.height+.005);
   if(!joined)continue;
   for(const row of overlaps)rows.splice(rows.indexOf(row),1);
  }
  rows.push({system,measures:secondary.measures.filter(m=>m.system===system.system)});
 }
 rows.sort((a,b)=>a.system.y-b.system.y);
 return {page:primary.page,systems:rows.map((row,i)=>({...row.system,system:i+1})),measures:rows.flatMap((row,i)=>row.measures.map(m=>({...m,system:i+1})))};
}
