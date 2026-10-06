import {TAB_IMPORT_CONFIG as C} from './config.js';
import {textFretsForStaff,attachPrintedTuplets} from './pdfText.js';
import {hasSevenCap,hasNarrowOneShape} from './glyphValidation.js';
import {attachNativeTabSymbols} from './tabSymbols.js';
import {attachImageRests} from './imageRests.js';
import {markNonFretSymbols} from './imageTabTokens.js';
import {findPrintedMeter} from './printedMeter.js';
import {findImageTuplets} from './imageTuplets.js';
import {markHarmonicParts,attachRasterArpeggios,attachOmittedFretTies} from './imageTabTechniques.js';
import {staffMeasureInk} from '../../omr/staffMeasureInk.js';
import {joinedFretSplit} from './joinedFretDigits.js';
import {cameraBarlineColumns} from './cameraBarlines.js';
import {attachPairedStaffRhythm} from './pairedStaffRhythm.js';

const median = values => [...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
export function runs(values, gap = 1) {
  const groups=[];
  for(const value of values){const last=groups.at(-1);if(last&&value-last.at(-1)<=gap)last.push(value);else groups.push([value]);}
  return groups;
}
export function binaryPage(rgba,width,height,threshold=C.inkThreshold){
  const pixels=new Uint8Array(width*height);
  for(let i=0;i<pixels.length;i++)pixels[i]=(rgba[i*4]*.299+rgba[i*4+1]*.587+rgba[i*4+2]*.114)<threshold?1:0;
  return pixels;
}

export function detectStaffs(pixels,width,height,config=C,lineCount=6,spanPixels=pixels){
  const ys=[];
  for(let y=0;y<height;y++){let count=0;for(let x=0;x<width;x++)count+=pixels[y*width+x];if(count>width*config.minStaffWidth)ys.push(y);}
  const lines=runs(ys).map(group=>({y:median(group),thickness:group.length})),staffs=[];
  for(let i=0;i<=lines.length-lineCount;i++){
    const six=lines.slice(i,i+lineCount),gaps=six.slice(1).map((line,j)=>line.y-six[j].y);
    let spacing=median(gaps);
    if(gaps.some(g=>Math.abs(g-spacing)>spacing*config.spacingTolerance)){
      // Low-resolution scan quantization can bias the median toward the shorter
      // gap (e.g. 30,30,34,30,33). Require BOTH uniform adjacent gaps and a
      // uniformly spaced complete six-line grid before accepting its mean.
      const mean=(six.at(-1).y-six[0].y)/(lineCount-1),tolerance=mean*config.spacingTolerance;
      if(gaps.some(g=>Math.abs(g-mean)>tolerance)||six.some((line,j)=>Math.abs(line.y-six[0].y-j*mean)>tolerance))continue;
      spacing=mean;
    }
    if(spacing<config.minSpacing||spacing>config.maxSpacing)continue;
    // Reject a larger grid instead of treating a subset as the selected TAB.
    const adjacent=[lines[i-1],lines[i+lineCount]].filter((line,index)=>line&&Math.abs(index===0?line.y-six[0].y+spacing:line.y-six.at(-1).y-spacing)<spacing*.15);
    if(!config.alignedStaffExtension&&adjacent.length)continue;
    const xs=[];
    for(let x=0;x<width;x++)if(six.reduce((n,line)=>n+spanPixels[line.y*width+x],0)>=4)xs.push(x);
    const spans=runs(xs,Math.ceil(spacing*2)).sort((a,b)=>b.length-a.length),span=spans[0];
    if(!span||span.at(-1)-span[0]<Math.max(width*config.minStaffWidth,spacing*(config.minStaffSpan??28)))continue;
    // A nearby chord-diagram edge is not an extra staff line. Practice mode
    // requires the apparent extension to span the same ruled staff horizontally.
    if(config.alignedStaffExtension&&adjacent.some(line=>{
      let support=0;for(let x=span[0];x<=span.at(-1);x++)support+=pixels[line.y*width+x];
      return support/(span.at(-1)-span[0]+1)>.8;
    }))continue;
    staffs.push({id:staffs.length+1,lines:six.map(l=>l.y),thickness:Math.max(...six.map(l=>l.thickness)),spacing,x:span[0],y:six[0].y,width:span.at(-1)-span[0],height:six.at(-1).y-six[0].y});i+=lineCount-1;
  }
  return staffs;
}

export function detectTabStaffs(pixels,width,height,config=C,lineCount=6){
  const primary=detectStaffs(pixels,width,height,config,lineCount);
  // Preserve established full-width grids. A separate pass can recover a short
  // last system or a staff beside a partial annotation, never replace a grid
  // with a shifted six-line window. Bar/glyph validation still follows below.
  const recovery=detectStaffs(pixels,width,height,{...config,minStaffWidth:Math.min(config.minStaffWidth,.22),minStaffSpan:22,alignedStaffExtension:true},lineCount);
  const extra=recovery.filter(s=>!primary.some(p=>s.y<=p.y+p.height+p.spacing&&s.y+s.height>=p.y-p.spacing));
  return [...primary,...extra].sort((a,b)=>a.y-b.y||a.x-b.x).map((s,i)=>({...s,id:i+1}));
}

// Five strong rules with exactly one double gap can locate a faint INTERNAL
// sixth rule. Copy only measured contrast pixels there, never draw a new line.
// Five-line notation, seven-line TAB and missing outer rules cannot satisfy it.
export function recoverFaintRulePixels(strong,faint,width,height,config=C){
  const ys=[];for(let y=0;y<height;y++){let n=0;for(let x=0;x<width;x++)n+=strong[y*width+x];if(n>width*config.minStaffWidth)ys.push(y);}
  const lines=runs(ys).map(group=>median(group));let recovered=null;
  for(let i=0;i<=lines.length-5;i++){
    const five=lines.slice(i,i+5),spacing=(five[4]-five[0])/5;
    if(spacing<config.minSpacing||spacing>config.maxSpacing)continue;
    const steps=five.slice(1).map((y,j)=>(y-five[j])/spacing);
    if(steps.filter(s=>Math.abs(s-2)<.12).length!==1||steps.filter(s=>Math.abs(s-1)<.12).length!==3)continue;
    if([lines[i-1],lines[i+5]].some((y,j)=>y!==undefined&&Math.abs(y-(j?five[4]+spacing:five[0]-spacing))<spacing*.15))continue;
    const gap=steps.findIndex(s=>s>1.5),expected=five[gap]+spacing,tolerance=Math.max(1,Math.floor(spacing*.12));
    let support=false;
    for(let y=Math.round(expected)-tolerance;y<=Math.round(expected)+tolerance;y++){
      let count=0;for(let x=0;x<width;x++)count+=faint[y*width+x];if(count>width*config.minStaffWidth)support=true;
    }
    if(!support)continue;
    recovered??=strong.slice();
    for(let y=Math.round(expected)-tolerance;y<=Math.round(expected)+tolerance;y++)for(let x=0;x<width;x++)recovered[y*width+x]|=faint[y*width+x];
  }
  return recovered;
}

export function detectBarlines(ink,width,staff,{minCoverage=.97,minMeasureSpacing=3,allowExtensions=false,camera=false,trimUnruledMargins=camera,ruleInk=ink,acceptBoundary}={}){
  const candidates=[],top=staff.lines[0],bottom=staff.lines.at(-1);
  for(let x=Math.ceil(staff.x);x<=staff.x+staff.width;x++){
    let count=0;for(let y=top;y<=bottom;y++)count+=ink[y*width+x]??0;
    let extension=0;for(const [edge,sign] of [[bottom,1],[top,-1]])for(let k=2;k<staff.spacing*.75;k++){if(!ink[(edge+k*sign)*width+x])break;extension++;}
    if(count/(bottom-top+1)>minCoverage&&(allowExtensions||extension<staff.spacing*.25))candidates.push(x);
  }
  // Double/repeat/final lines delimit one boundary, not a tiny extra bar.
  const fullColumns=new Set(candidates);
  const isolated=candidates.filter(x=>{
    let side=0,total=0;
    for(let y=top+2;y<bottom-2;y++){
      if(staff.lines.some(line=>Math.abs(line-y)<staff.spacing*.22))continue;
      for(let dx=Math.ceil(staff.spacing*.15);dx<staff.spacing*.43;dx++)for(const sign of [-1,1]){
        const other=x+dx*sign;if(fullColumns.has(other))continue;side+=ink[y*width+other]??0;total++;
      }
    }
    // Ties can cross a real barline. Full-height coverage and the extension
    // gate carry more weight than a few adjacent curved strokes.
    return total===0||side/total<.25;
  });
  const extra=camera?cameraBarlineColumns(ink,width,staff,isolated,ruleInk):[];
  // Record boundaries recovered only with the faint horizontal-rule mask.
  // Splitting that newly recovered span does not settle ambiguous fret OCR.
  const legacyExtra=extra.length&&ruleInk!==ink?cameraBarlineColumns(ink,width,staff,isolated):extra;
  const established=[...isolated,...legacyExtra];
  const bars=runs([...isolated,...extra].sort((a,b)=>a-b),Math.ceil(staff.spacing*.45)).map(xs=>median(xs)).filter(x=>!acceptBoundary||acceptBoundary(x));
  const recovered=bars.filter(x=>!established.some(b=>Math.abs(b-x)<staff.spacing*.6));
  const boundaries=[...bars];
  if(!boundaries.length||boundaries[0]-staff.x>staff.spacing){
    // A hand or a paper edge can extend the detected span before the first
    // actual rule. Do not invent a tiny leading measure there. A real pickup
    // or empty measure keeps its horizontal rules and is retained.
    const end=boundaries[0],gap=end-staff.x,half=Math.max(1,Math.ceil(staff.thickness/2));
    const supported=!trimUnruledMargins||!end||gap>staff.spacing*5||staff.lines.filter(line=>{
      let count=0;for(let x=staff.x;x<end-staff.spacing*.15;x++){
        let dark=0;for(let dy=-half;dy<=half;dy++)dark|=ruleInk[Math.round(line+dy)*width+x]??0;
        // A solid paper-edge shadow is dark at every y, not a ruled staff.
        const clearAbove=!ruleInk[Math.round(line-staff.spacing*.4)*width+x],clearBelow=!ruleInk[Math.round(line+staff.spacing*.4)*width+x];
        count+=dark&&(clearAbove||clearBelow)?1:0;
      }
      return count/Math.max(1,gap-staff.spacing*.15)>.5;
    }).length>=4;
    if(supported)boundaries.unshift(staff.x);
  }
  if(staff.x+staff.width-boundaries.at(-1)>staff.spacing)boundaries.push(staff.x+staff.width);
  return {bars,measures:boundaries.slice(0,-1).flatMap((x,i)=>boundaries[i+1]-x>staff.spacing*minMeasureSpacing?[{x,y:top,width:boundaries[i+1]-x,height:bottom-top,boundariesKnown:bars.some(b=>Math.abs(b-x)<2)&&bars.some(b=>Math.abs(b-boundaries[i+1])<2),...(recovered.some(b=>Math.abs(b-x)<2||Math.abs(b-boundaries[i+1])<2)?{boundaryEvidence:'faint-rules'}:{})}]:[])};
}

// Remove only long ruled strokes. Work on a copy so rhythm uses the original.
export function removeStaffRules(ink,width,height,staff){
  const clean=ink.slice(),g=staff.spacing;
  for(const line of staff.lines){
    const half=Math.ceil(staff.thickness/2)+1;
    const crossing=new Uint8Array(width);
    for(let x=staff.x;x<=staff.x+staff.width;x++){
      let above=false,below=false;
      for(let dx=-Math.ceil(g*.12);dx<=Math.ceil(g*.12);dx++)for(let dy=half+1;dy<=half+Math.ceil(g*.16);dy++){
        above||=Boolean(ink[(line-dy)*width+x+dx]);below||=Boolean(ink[(line+dy)*width+x+dx]);
      }
      crossing[x]=above&&below?1:0;
    }
    for(let y=Math.max(0,line-staff.thickness-1);y<=Math.min(height-1,line+staff.thickness+1);y++){
      let start=-1;
      for(let x=Math.max(0,staff.x-2);x<=Math.min(width-1,staff.x+staff.width+2);x++){
        if(ink[y*width+x]){if(start<0)start=x;}
        else if(start>=0){if(x-start>g*1.5)for(let at=start;at<x;at++)if(!crossing[at])clean[y*width+at]=0;start=-1;}
      }
    }
  }
  // Cut stems only BETWEEN strings. Erasing a full vertical run destroys a
  // digit where a stem touches its bottom (particularly 0/6/8/9).
  const cuts=[staff.y-g*.5,...staff.lines.slice(0,-1).map((y,i)=>(y+staff.lines[i+1])/2),staff.y+staff.height+g*.5];
  for(const cut of cuts)for(let y=Math.floor(cut)-1;y<=Math.floor(cut)+1;y++)if(y>=0&&y<height)clean.fill(0,y*width+staff.x,y*width+staff.x+staff.width+1);
  return clean;
}

export function fretComponents(clean,width,height,staff){
  const g=staff.spacing,visited=new Uint8Array(width*height),parts=[];
  const top=Math.max(0,Math.floor(staff.y-g*.55)),bottom=Math.min(height-1,Math.ceil(staff.y+staff.height+g*.55));
  for(let y=top;y<=bottom;y++)for(let x=staff.x;x<=staff.x+staff.width;x++){
    const start=y*width+x;if(!clean[start]||visited[start])continue;
    const stack=[start];visited[start]=1;let minX=x,maxX=x,minY=y,maxY=y,count=0;
    while(stack.length){const p=stack.pop(),px=p%width,py=Math.floor(p/width);count++;minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const nx=px+dx,ny=py+dy,n=ny*width+nx;if(nx<staff.x||nx>staff.x+staff.width||ny<top||ny>bottom||visited[n]||!clean[n])continue;visited[n]=1;stack.push(n);}
    }
    const w=maxX-minX+1,h=maxY-minY+1,cy=(minY+maxY)/2,string=staff.lines.reduce((best,line,i)=>Math.abs(cy-line)<Math.abs(cy-staff.lines[best])?i:best,0)+1;
    // Retain narrow serif digits until neighboring pieces have been grouped.
    // Rejecting a thin leading 1 here turns a printed 10 into a confident 0.
    // The later stroke-shape check still removes isolated stem fragments.
    if(count<4||w>g*1.9||h<g*.45||h>g*1.05||w<g*.13||h/w>6)continue;
    parts.push({x:minX,y:minY,width:w,height:h,cx:(minX+maxX)/2,cy,string,stringDistance:Math.abs(cy-staff.lines[string-1])/g});
  }
  return parts.sort((a,b)=>a.string-b.string||a.x-b.x);
}

export function hasThreeCurvedFlags(ink,width,height,x,end,g,direction=1){
  let support=0;
  // At the outer curl the three flags touch vertically. Near the stem each
  // curve crosses separately; require three regularly spaced bands on two
  // adjacent columns, not the total amount of dark ink.
  for(let dx=Math.ceil(g*.22);dx<=g*.4;dx++){
    const ys=[];
    for(let k=0;k<=g*2.5;k++){const y=Math.round(end-direction*k),px=Math.round(x+dx);if(y>=0&&y<height&&px>=0&&px<width&&ink[y*width+px])ys.push(k);}
    const bands=runs(ys).filter(b=>b.length>=Math.max(2,g*.08));
    const centers=bands.map(b=>median(b)),gaps=centers.slice(1).map((v,i)=>v-centers[i]);
    const valid=bands.length===3&&bands.every(b=>b.length<g*.5)&&gaps.every(v=>v>=g*.25&&v<=g*.8)&&Math.max(...gaps)-Math.min(...gaps)<=g*.2;
    support=valid?support+1:0;if(support>=2)return true;
  }
  return false;
}

export function detectRhythm(ink,width,height,staff,measure,anchors=[],beamInk=ink,{detached=false}={}){
  const g=staff.spacing,bottom=staff.lines.at(-1),top=staff.lines[0],stems=[];
  // Analyse both sides, then prefer the side with clear connected beams/stems.
  for(const direction of [1,-1]){
    const edge=direction===1?bottom:top,candidates=[];
    for(let x=Math.ceil(measure.x+g*.35);x<measure.x+measure.width-g*.35;x++){
      let longest=0,current=0,end=0,start=Infinity;
      for(let k=Math.ceil(g*.12);k<g*(detached&&direction===-1?4:3.1);k++){
        const y=Math.round(edge+direction*k),black=y>=0&&y<height&&ink[y*width+x];
        if(black){current++;if(current>longest){longest=current;end=y;start=k-current+1;}}else current=0;
      }
      // A real stem connects to the TAB edge. Detached chord-grid verticals
      // above the staff and lyric strokes below it are not rhythm evidence.
      if(longest>=g*(detached&&direction===-1?1.1:1.45)&&start<=g*(direction===1?.95:detached?1.6:.55))candidates.push({x,end,length:longest});
    }
    const groups=[];for(const c of candidates){const last=groups.at(-1);if(last&&c.x-last.at(-1).x<=2)last.push(c);else groups.push([c]);}
    for(const group of groups){
      if(group.length>g*.28)continue;
      const x=median(group.map(c=>c.x)),beamYs=[],shortBeamYs=[];
      let end=median(group.map(c=>c.end)),gap=0;const initialEnd=end;
      // A blurred/sloping beam can leave a one- or two-pixel break at the
      // stem. Follow only its narrow continuation; detached picking stays out.
      const junctionReach=Math.max(2,Math.min(4,Math.ceil(g*.08)));
      for(let k=1;k<=Math.ceil(g*.5);k++){
        const y=Math.round(initialEnd+direction*k);
        if(y<0||y>=height)break;
        let connected=false;for(let dx=-junctionReach;dx<=junctionReach;dx++)connected||=Boolean(ink[y*width+Math.round(x+dx)]);
        if(connected){end=y;gap=0;}
        else if(++gap>2)break;
      }
      // A faint but continuous beam can be absent from the dark mask. Use the
      // normal ink mask only when there is NO dark side-stroke evidence here;
      // otherwise keep the dark mask that separates blurred adjacent beams.
      let darkSide=0;
      for(let k=0;k<g*.9;k++)for(let dx=Math.ceil(g*.28);dx<g*1.1;dx++)for(const sign of [-1,1]){
        const y=Math.round(end-direction*k),px=Math.round(x+sign*dx);
        if(y>=0&&y<height&&px>=0&&px<width)darkSide+=beamInk[y*width+px];
      }
      const strokeInk=darkSide?beamInk:ink;
      const beamLength=(y,sign)=>{
        let length=0,bridged=false;
        for(let dx=1;dx<g*2.8;dx++){
          const px=Math.round(x+sign*dx),next=px+sign;
          if(px<0||px>=width)break;
          if(!strokeInk[y*width+px]){
            // At a rasterized beam's corner its lower rows can stop a few
            // pixels short of the stem center. The connected junction above
            // supplies the end; count its complete horizontal stroke band.
            if(length===0&&dx<junctionReach)continue;
            // One pale scan speck may interrupt otherwise dark horizontal ink.
            // Never bridge white space or the vertical gap between two beams.
            if(bridged||!ink[y*width+px]||next<0||next>=width||!strokeInk[y*width+next])break;
            bridged=true;
          }
          length++;
        }
        return length;
      };
      for(let y=Math.floor(Math.min(end,end-direction*g*1.65));y<=Math.ceil(Math.max(end,end-direction*g*1.65));y++){
        // Picking marks beyond the stem end are not a second beam.
        if(y<0||y>=height||direction*(y-end)>1||Math.abs(y-edge)<g*.5)continue;
        const left=beamLength(y,-1),right=beamLength(y,1);
        if(Math.max(left,right)>g*.85)beamYs.push(y);
        if(Math.max(left,right)>g*.4)shortBeamYs.push(y);
      }
      const shortBeams=runs(shortBeamYs).filter(rows=>rows.length>=Math.max(2,g*.07)&&rows.length<g*.45);
      // An isolated sixteenth can have two short, connected horizontal hooks.
      // Both strokes must be present; a single short stroke still uses the
      // existing flag checks and cannot gain an invented second beam.
      let beams=beamYs.length||shortBeams.length===2||shortBeams.length===3?shortBeams:[];
      // A third level needs three distinct stroke bands at regular spacing.
      // Never classify a fused dark block as a 32nd by its ink area.
      if(beams.length>=3){
        const ys=beams.map(rows=>median(rows)),gaps=ys.slice(1).map((y,i)=>y-ys[i]);
        if(beams.length!==3||Math.min(...gaps)<g*.25||Math.max(...gaps)>g*.85||Math.max(...gaps)-Math.min(...gaps)>g*.25)beams=[];
      }
      let count=beams.length;
      if(detached&&direction===-1){
        // A photographed detached beam may slope away from its stem. Require
        // a solid side stroke over a band, rather than guessing from spacing.
        const counts=[];
        for(const sign of [-1,1]){
          const rows=[];
          for(let y=Math.round(end-g*.25);y<=end+g*1.65;y++){
            if(y<1||y>=height-1)continue;
            let inkCount=0,total=0;
            for(let dx=Math.ceil(g*.35);dx<=g*1.25;dx++){
              const px=Math.round(x+sign*dx);if(px<0||px>=width)continue;total++;
              if(beamInk[y*width+px])inkCount++;
            }
            if(total&&inkCount/total>=.72)rows.push(y);
          }
          counts.push(runs(rows).filter(r=>r.length>=2&&r.length<g*.35).length);
        }
        const measured=Math.max(...counts);if(measured===1||measured===2||measured===3)count=measured;
      }
      // Inspect flags toward the staff, not detached picking marks beyond the
      // stem end. Spacing between note columns never supplies a duration.
      let sideInk=0;
      if(count===0)for(let y=Math.round(end-g*.6);y<end+g*.6;y++)for(let dx=Math.ceil(g*.2);dx<g*.7;dx++)if(y>=0&&y<height&&direction*(y-end)<=1)sideInk+=beamInk[y*width+Math.round(x+dx)]??0;
      const flagRows=[];
      if(count===0)for(let y=Math.round(Math.min(end,end-direction*g*1.8));y<=Math.max(end,end-direction*g*1.8);y++){
        // Detached pale flecks are not flags. The light-mask fallback above
        // requires a continuous beam from the stem, unlike these side samples.
        let inkCount=0;for(let dx=Math.ceil(g*.28);dx<=g*.7;dx++)if(y>=0&&y<height)inkCount+=beamInk[y*width+Math.round(x+dx)]??0;
        if(inkCount>=2)flagRows.push(y);
      }
      // Some TAB engravers use a compact upward hook at a down-stem end.
      // Its dark tip can be only 2–4 pixels tall after rasterization.
      const flagRuns=runs(flagRows),normalFlags=flagRuns.filter(rows=>rows.length>g*.2&&rows.length<g*1.6);
      const compactFlags=flagRuns.filter(rows=>rows.length>=Math.max(2,g*.08)&&rows.length<g*1.6);
      // A tiny disconnected edge beside a full flag is raster noise, not a
      // second flag. The compact fallback accepts exactly one small hook.
      const flags=count===0&&hasThreeCurvedFlags(beamInk,width,height,x,end,g,direction)?[[],[],[]]:normalFlags.length?normalFlags:compactFlags.length===1?compactFlags:[];
      // In the camera fallback a missing/fused detached beam is unknown,
      // not evidence for a quarter note or a flag. Keep it for manual review.
      const duration=detached&&direction===-1&&count===0?null:count===1?'8':count===2?'16':count===3?'32':count===0&&flags.length===3?'32':count===0&&flags.length===2?'16':count===0&&flags.length===1?'8':count===0&&sideInk<g*.15?'4':null;
      stems.push({x,y:end,direction,beamCount:count,flagCount:flags.length,duration,confidence:duration?.length? .97:0,beamYs:beams.map(ys=>median(ys))});
    }
  }
  const below=stems.filter(s=>s.direction===1),above=stems.filter(s=>s.direction===-1);
  const score=group=>{const matched=group.filter(s=>anchors.some(c=>Math.abs(c.cx-s.x)<g*.4)).length;return anchors.length?matched-(group.length-matched)*.5:group.length;};
  return (!above.length?below:!below.length?above:score(below)>=score(above)?below:above).sort((a,b)=>a.x-b.x);
}

export function discardSystemConnectorRhythm(ink,width,staff){
  const g=staff.spacing,top=staff.lines[0],bottom=staff.lines.at(-1);
  // Run after stem fragments have been excluded from fret candidates. A
  // bracket sliced by six rules otherwise supplies six false digit anchors.
  for(const measure of staff.measures){
    if(Math.abs(measure.x-staff.x)>1)continue;
    measure.rhythm=measure.rhythm.filter(r=>{
      if(r.rest||r.x-staff.x>=g*.9||staff.candidates.some(c=>!c.nonFretSymbol&&Math.abs(c.cx-r.x)<g*.6))return true;
      let connected=0,total=0;
      for(let y=Math.ceil(top+g*.2);y<=bottom-g*.2;y++){total++;connected+=ink[y*width+Math.round(r.x)]??0;}
      return !total||connected/total<=.96;
    });
  }
}

export function attachHalfNoteStubs(ink,width,height,staff,anchors){
  const ends=staff.measures.flatMap(m=>m.rhythm.filter(r=>r.direction===1&&r.duration).map(r=>r.y));
  if(ends.length<2)return;
  const baseline=median(ends),g=staff.spacing,edge=staff.lines.at(-1);
  for(const m of staff.measures)for(const c of anchors){
    if(c.cx<m.x+g*.3||c.cx>m.x+m.width-g*.3||c.stringDistance>.22||m.rhythm.some(r=>Math.abs(r.x-c.cx)<g*.4))continue;
    let matched=false;
    for(let dx=-2;dx<=2&&!matched;dx++){
      const x=Math.round(c.cx)+dx,ys=[];
      for(let y=Math.ceil(edge+g*.9);y<=Math.min(height-1,baseline+g*.25);y++)if(ink[y*width+x])ys.push(y);
      const stub=runs(ys).find(r=>r.length>=g*.7&&r.length<=g*1.15&&Math.abs(r.at(-1)-baseline)<g*.2&&r[0]>edge+g);
      if(!stub)continue;
      let side=0;for(const y of stub)for(const sign of [-1,1])side+=ink[y*width+x+sign*Math.ceil(g*.22)]??0;
      if(side>stub.length*.1)continue;
      m.rhythm.push({x:c.cx,y:stub.at(-1),duration:'2',confidence:.98,direction:1,beamCount:0,method:'short-half-note-stub'});matched=true;
    }
    m.rhythm.sort((a,b)=>a.x-b.x);
  }
}

export function groupFretComponents(parts,staff,rhythm=[]){
  const candidates=[],g=staff.spacing;
  for(const part of parts){
    const prior=candidates.at(-1),gap=prior?part.x-prior.x-prior.width:Infinity;
    const center=prior?(prior.x+part.x+part.width)/2:0;
    // Narrow digits have wider whitespace in proportional fonts. Accept this
    // extra gap only when both pieces surround ONE printed rhythm stem. Nearby
    // notes with separate stems must never be concatenated into a new fret.
    const nearby=rhythm.filter(r=>prior&&r.x>=prior.cx-g*.25&&r.x<=part.cx+g*.25);
    const separateStems=prior&&rhythm.some(r=>Math.abs(r.x-prior.cx)<g*.22)&&rhythm.some(r=>Math.abs(r.x-part.cx)<g*.22)&&Math.abs(prior.cx-part.cx)>g*.45;
    const sameStem=prior&&prior.width<g*.7&&part.width<g*.7&&part.x+part.width-prior.x<=g*1.35&&nearby.length===1&&Math.abs(nearby[0].x-center)<g*.22;
    if(prior&&!separateStems&&part.string===prior.string&&gap>=0&&(gap<g*.24||gap<g*.42&&sameStem)&&Math.abs(part.cy-prior.cy)<g*.18&&prior.parts===1){
      const bottom=Math.max(prior.y+prior.height,part.y+part.height);
      prior.width=part.x+part.width-prior.x;prior.y=Math.min(prior.y,part.y);prior.height=bottom-prior.y;prior.cx=prior.x+prior.width/2;prior.cy=prior.y+prior.height/2;prior.parts=2;
    }else candidates.push({...part,parts:1});
  }
  return candidates;
}

export function analyseGeometry({rgba,width,height,page,glyphs=[],config=C,rulePixels=null,structureRgba=null,stringCount=6,trimUnruledMargins=!!config.cleanPhotoGlyphs}){
  const ink=binaryPage(rgba,width,height),structureInk=structureRgba?binaryPage(structureRgba,width,height):ink,beamInk=binaryPage(structureRgba??rgba,width,height,config.beamThreshold??145),lines=rulePixels??binaryPage(rgba,width,height,config.lineThreshold),staffs=detectTabStaffs(lines,width,height,config,stringCount),output=[];
  for(const staff of staffs){
    const {bars,measures}=detectBarlines(structureInk,width,staff,{camera:!!config.cleanPhotoGlyphs,trimUnruledMargins,ruleInk:lines}),clean=removeStaffRules(ink,width,height,staff),parts=fretComponents(clean,width,height,staff);
    // At least two digit-sized objects on actual strings excludes empty graphics.
    if(parts.filter(p=>p.stringDistance<config.stringTolerance).length<2||!bars.length)continue;
    const textFrets=textFretsForStaff(glyphs,staff),rhythms=measures.map((m,i)=>({...m,index:i,rhythm:detectRhythm(structureInk,width,height,staff,m,textFrets.length?textFrets:parts.filter(p=>p.stringDistance<config.stringTolerance),beamInk,{detached:config.detachedRhythm})}));
    // Exclude barline fragments BEFORE grouping: otherwise a fragment and the
    // first fret can merge and the later barline rejection erases the fret too.
    // Remove continuous stems and balanced harmonic brackets before joining
    // digit parts. Otherwise a stem/chevron merges into a nearby real numeral.
    markNonFretSymbols(ink,width,{...staff,bars,measures:rhythms,candidates:parts});
    markHarmonicParts(clean,width,staff,parts);
    let candidates=groupFretComponents(parts.filter(p=>!p.nonFretSymbol),staff,rhythms.flatMap(m=>m.rhythm));
    const nativeText=textFrets.length>=4&&Math.max(...textFrets.map(c=>c.cx))-Math.min(...textFrets.map(c=>c.cx))>staff.width*.3;
    if(nativeText)candidates=textFrets;
    else candidates=candidates.filter(c=>{
      // Stem fragments crossing a string are not the digit 1. Inspect rows
      // away from the ruled line, where a real digit has its head/curve/serif.
      let widest=0;const rowWidths=[];
      for(let y=c.y;y<c.y+c.height;y++){
        if(Math.abs(y-staff.lines[c.string-1])<=Math.ceil(staff.thickness/2)+1)continue;
        const xs=[];for(let x=c.x;x<c.x+c.width;x++)if(ink[y*width+x])xs.push(x);
        if(xs.length){const span=xs.at(-1)-xs[0]+1;widest=Math.max(widest,span);rowWidths.push(span);}
      }
      if(widest>staff.spacing*.28)return true;
      // A small serif 1 is narrower than the usual digit gate. Admit only
      // its head/body/foot profile at a printed rhythm stem; OCR must still
      // independently agree on 1 (see classifyFret).
      if(c.parts===1&&c.width<staff.spacing*.4&&c.stringDistance<.18
        &&rhythms.some(m=>m.rhythm.some(r=>Math.abs(r.x-c.cx)<staff.spacing*.22))
        &&hasNarrowOneShape(rowWidths,staff.spacing,c.height)){c.narrowOneCandidate=true;return true;}
      return false;
    });
    candidates.forEach((c,i)=>{c.id=`p${page}s${staff.id}c${i}`;if(c.ocr)return;c.bitmap=new Uint8Array(c.width*c.height);c.grayscale=new Uint8Array(c.width*c.height);for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const p=(c.y+y)*width+c.x+x;c.bitmap[y*c.width+x]=clean[p];c.grayscale[y*c.width+x]=config.cleanPhotoGlyphs&&ink[p]&&!clean[p]?255:Math.round(rgba[p*4]*.299+rgba[p*4+1]*.587+rgba[p*4+2]*.114);}});
    for(const c of candidates)if(!c.ocr){
      const split=joinedFretSplit(c,staff);
      if(split){c.parts=2;c.joinedDigitEvidence=split;}
      if(config.densePhotoGlyphs){
        const anchors=rhythms.flatMap(m=>m.rhythm).filter(r=>r.duration&&!r.rest&&Math.abs(r.x-c.cx)<=staff.spacing*.6);
        if(anchors.length===1){c.slotX=anchors[0].x;c.anchorMethod='unique-printed-stem';}
      }
      // Keep antialiased edges for a fallback OCR crop. The thresholded ink
      // bounds can shave the top/bottom of a small 0/8/9 in an image PDF.
      const margin=Math.max(1,Math.ceil(staff.spacing*.13)),left=Math.max(0,c.x-margin),topPad=Math.max(0,c.y-margin),w=Math.min(width,c.x+c.width+margin)-left,hPad=Math.min(height,c.y+c.height+margin)-topPad;
      const gray=new Uint8Array(w*hPad);
      for(let y=0;y<hPad;y++)for(let x=0;x<w;x++){const p=((topPad+y)*width+left+x)*4;gray[y*w+x]=Math.round(rgba[p]*.299+rgba[p+1]*.587+rgba[p+2]*.114);}
      c.paddedGlyph={width:w,height:hPad,grayscale:gray};
      if(config.cleanPhotoGlyphs&&c.parts===1&&c.height>=staff.spacing*.75){
        const pad=Math.ceil(staff.spacing*.22),x0=Math.max(0,c.x-pad),y0=Math.max(0,c.y-pad),rw=Math.min(width,c.x+c.width+pad)-x0,rh=Math.min(height,c.y+c.height+pad)-y0;
        const retry=new Uint8Array(rw*rh);
        for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){const p=((y0+y)*width+x0+x)*4;retry[y*rw+x]=Math.round(rgba[p]*.299+rgba[p+1]*.587+rgba[p+2]*.114);}
        c.photoRetryGlyph={x:x0,y:y0,width:rw,height:rh,grayscale:retry};
      }
      const top=Math.max(0,c.y-Math.ceil(staff.spacing*.45)),h=c.y-top+Math.ceil(c.height*.25),cap=new Uint8Array(c.width*h);
      for(let y=0;y<h;y++)for(let x=0;x<c.width;x++){const p=((top+y)*width+c.x+x)*4;cap[y*c.width+x]=Math.round(rgba[p]*.299+rgba[p+1]*.587+rgba[p+2]*.114);}
      c.sevenCap=hasSevenCap(cap,c.width,h);
    }
    // Five-string TAB and staff notation share a line count. Oval heads on
    // long stems provide separate evidence; OCR must still check for frets.
    const notationHeads=stringCount===5&&!nativeText?measures.flatMap((m,i)=>staffMeasureInk(ink,width,height,staff,m,{first:i===0}).stems).filter(s=>s.heads?.length).length:0;
    const result={...staff,kind:notationHeads>=2?'notation-candidate':'tab',...(notationHeads?{notationHeads}:{}),bars,candidates,nativeText,measures:rhythms};
    result.meterCandidate=findPrintedMeter(ink,width,result);
    if(!nativeText)markNonFretSymbols(ink,width,result);
    discardSystemConnectorRhythm(ink,width,result);
    attachRasterArpeggios(ink,width,height,result,parts);
    attachHalfNoteStubs(ink,width,height,result,candidates.filter(c=>!c.nonFretSymbol));attachPrintedTuplets(result,glyphs);output.push(result);
    result.tupletCandidates=findImageTuplets(rgba,ink,width,height,result);
  }
  const rhythmicPage=output.some(s=>s.measures.some(m=>m.rhythm.some(r=>s.candidates.some(c=>Math.abs(c.cx-r.x)<s.spacing*.4))));
  for(const staff of output){
    // A native PDF can intentionally omit a tied numeral. Preserve its
    // geometrically supported column before removing unrelated empty stems.
    attachOmittedFretTies(ink,width,height,staff);
    attachNativeTabSymbols(ink,width,staff,{rhythmicPage});
    attachImageRests(ink,width,height,staff);
    attachOmittedFretTies(ink,width,height,staff);
  }
  attachPairedStaffRhythm(ink,lines,width,height,output);
  return {page,width,height,staffs:output};
}
