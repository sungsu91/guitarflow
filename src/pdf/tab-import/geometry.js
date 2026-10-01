import {TAB_IMPORT_CONFIG as C} from './config.js';
import {textFretsForStaff,attachPrintedTuplets} from './pdfText.js';
import {hasSevenCap} from './glyphValidation.js';
import {attachNativeTabSymbols} from './tabSymbols.js';
import {attachImageRests} from './imageRests.js';
import {markNonFretSymbols} from './imageTabTokens.js';
import {findPrintedMeter} from './printedMeter.js';

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
    const six=lines.slice(i,i+lineCount),gaps=six.slice(1).map((line,j)=>line.y-six[j].y),spacing=median(gaps);
    if(spacing<config.minSpacing||spacing>config.maxSpacing||gaps.some(g=>Math.abs(g-spacing)>spacing*config.spacingTolerance))continue;
    // A grid containing seven or more equally spaced lines is not a six-string TAB.
    const adjacent=[lines[i-1],lines[i+lineCount]].filter((line,index)=>line&&Math.abs(index===0?line.y-six[0].y+spacing:line.y-six.at(-1).y-spacing)<spacing*.15);
    if(!config.alignedStaffExtension&&adjacent.length)continue;
    const xs=[];
    for(let x=0;x<width;x++)if(six.reduce((n,line)=>n+spanPixels[line.y*width+x],0)>=4)xs.push(x);
    const spans=runs(xs,Math.ceil(spacing*2)).sort((a,b)=>b.length-a.length),span=spans[0];
    if(!span||span.at(-1)-span[0]<Math.max(width*config.minStaffWidth,spacing*28))continue;
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

export function detectBarlines(ink,width,staff,{minCoverage=.97,minMeasureSpacing=3,allowExtensions=false}={}){
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
  const bars=runs(isolated,Math.ceil(staff.spacing*.45)).map(xs=>median(xs));
  const boundaries=[...bars];
  if(!boundaries.length||boundaries[0]-staff.x>staff.spacing)boundaries.unshift(staff.x);
  if(staff.x+staff.width-boundaries.at(-1)>staff.spacing)boundaries.push(staff.x+staff.width);
  return {bars,measures:boundaries.slice(0,-1).flatMap((x,i)=>boundaries[i+1]-x>staff.spacing*minMeasureSpacing?[{x,y:top,width:boundaries[i+1]-x,height:bottom-top,boundariesKnown:bars.some(b=>Math.abs(b-x)<2)&&bars.some(b=>Math.abs(b-boundaries[i+1])<2)}]:[])};
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
    if(count<4||w>g*1.9||h<g*.45||h>g*1.05||w<g*.20||h/w>4)continue;
    parts.push({x:minX,y:minY,width:w,height:h,cx:(minX+maxX)/2,cy,string,stringDistance:Math.abs(cy-staff.lines[string-1])/g});
  }
  return parts.sort((a,b)=>a.string-b.string||a.x-b.x);
}

export function detectRhythm(ink,width,height,staff,measure,anchors=[],beamInk=ink){
  const g=staff.spacing,bottom=staff.lines[5],top=staff.lines[0],stems=[];
  // Analyse both sides, then prefer the side with clear connected beams/stems.
  for(const direction of [1,-1]){
    const edge=direction===1?bottom:top,candidates=[];
    for(let x=Math.ceil(measure.x+g*.35);x<measure.x+measure.width-g*.35;x++){
      let longest=0,current=0,end=0,start=Infinity;
      for(let k=Math.ceil(g*.12);k<g*3.1;k++){
        const y=Math.round(edge+direction*k),black=y>=0&&y<height&&ink[y*width+x];
        if(black){current++;if(current>longest){longest=current;end=y;start=k-current+1;}}else current=0;
      }
      // A real stem connects to the TAB edge. Detached chord-grid verticals
      // above the staff and lyric strokes below it are not rhythm evidence.
      if(longest>=g*1.45&&start<=g*(direction===1?.95:.55))candidates.push({x,end,length:longest});
    }
    const groups=[];for(const c of candidates){const last=groups.at(-1);if(last&&c.x-last.at(-1).x<=2)last.push(c);else groups.push([c]);}
    for(const group of groups){
      if(group.length>g*.28)continue;
      const x=median(group.map(c=>c.x)),beamYs=[],shortBeamYs=[];
      let end=median(group.map(c=>c.end)),gap=0;const initialEnd=end;
      // A blurred/sloping beam can leave a one- or two-pixel break at the
      // stem. Follow only its narrow continuation; detached picking stays out.
      for(let k=1;k<=Math.ceil(g*.5);k++){
        const y=Math.round(initialEnd+direction*k);
        if(y<0||y>=height)break;
        if([-1,0,1].some(dx=>ink[y*width+Math.round(x+dx)])){end=y;gap=0;}
        else if(++gap>2)break;
      }
      for(let y=Math.floor(end-g*.9);y<=Math.ceil(end+g*.9);y++){
        // Picking marks beyond the stem end are not a second beam.
        if(y<0||y>=height||direction*(y-end)>1||Math.abs(y-edge)<g*.5)continue;
        let left=0,right=0;
        for(let dx=1;dx<g*2.8;dx++){if(!beamInk[y*width+Math.round(x-dx)])break;left++;}
        for(let dx=1;dx<g*2.8;dx++){if(!beamInk[y*width+Math.round(x+dx)])break;right++;}
        if(Math.max(left,right)>g*.85)beamYs.push(y);
        if(Math.max(left,right)>g*.4)shortBeamYs.push(y);
      }
      const beams=runs(beamYs.length?shortBeamYs:beamYs).filter(rows=>rows.length>=Math.max(2,g*.07)&&rows.length<g*.45);
      const count=beams.length;
      // Inspect flags toward the staff, not detached picking marks beyond the
      // stem end. Spacing between note columns never supplies a duration.
      let sideInk=0;
      if(count===0)for(let y=Math.round(end-g*.6);y<end+g*.6;y++)for(let dx=Math.ceil(g*.2);dx<g*.7;dx++)if(y>=0&&y<height&&direction*(y-end)<=1)sideInk+=beamInk[y*width+Math.round(x+dx)]??0;
      const flagRows=[];
      if(count===0)for(let y=Math.round(Math.min(end,end-direction*g*1.8));y<=Math.max(end,end-direction*g*1.8);y++){
        let inkCount=0;for(let dx=Math.ceil(g*.28);dx<=g*.7;dx++)if(y>=0&&y<height)inkCount+=beamInk[y*width+Math.round(x+dx)]??0;
        if(inkCount>=2)flagRows.push(y);
      }
      // Some TAB engravers use a compact upward hook at a down-stem end.
      // Its dark tip can be only 2–4 pixels tall after rasterization.
      const flagRuns=runs(flagRows),normalFlags=flagRuns.filter(rows=>rows.length>g*.2&&rows.length<g*1.6);
      const compactFlags=flagRuns.filter(rows=>rows.length>=Math.max(2,g*.08)&&rows.length<g*1.6);
      // A tiny disconnected edge beside a full flag is raster noise, not a
      // second flag. The compact fallback accepts exactly one small hook.
      const flags=normalFlags.length?normalFlags:compactFlags.length===1?compactFlags:[];
      const duration=count===1?'8':count===2?'16':count===0&&flags.length===2?'16':count===0&&flags.length===1?'8':count===0&&sideInk<g*.15?'4':null;
      stems.push({x,y:end,direction,beamCount:count,flagCount:flags.length,duration,confidence:duration?.length? .97:0,beamYs:beams.map(ys=>median(ys))});
    }
  }
  const below=stems.filter(s=>s.direction===1),above=stems.filter(s=>s.direction===-1);
  const score=group=>{const matched=group.filter(s=>anchors.some(c=>Math.abs(c.cx-s.x)<g*.4)).length;return anchors.length?matched-(group.length-matched)*.5:group.length;};
  return (!above.length?below:!below.length?above:score(below)>=score(above)?below:above).sort((a,b)=>a.x-b.x);
}

export function attachHalfNoteStubs(ink,width,height,staff,anchors){
  const ends=staff.measures.flatMap(m=>m.rhythm.filter(r=>r.direction===1&&r.duration).map(r=>r.y));
  if(ends.length<2)return;
  const baseline=median(ends),g=staff.spacing,edge=staff.lines[5];
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

export function analyseGeometry({rgba,width,height,page,glyphs=[],config=C}){
  const ink=binaryPage(rgba,width,height),beamInk=binaryPage(rgba,width,height,config.beamThreshold??145),lines=binaryPage(rgba,width,height,config.lineThreshold),staffs=detectStaffs(lines,width,height,config),output=[];
  for(const staff of staffs){
    const {bars,measures}=detectBarlines(ink,width,staff),clean=removeStaffRules(ink,width,height,staff),parts=fretComponents(clean,width,height,staff);
    // At least two digit-sized objects on actual strings excludes empty graphics.
    if(parts.filter(p=>p.stringDistance<config.stringTolerance).length<2||!bars.length)continue;
    let candidates=[];
    for(const part of parts){
      const prior=candidates.at(-1),gap=prior?part.x-prior.x-prior.width:Infinity;
      if(prior&&part.string===prior.string&&gap>=0&&gap<staff.spacing*.24&&Math.abs(part.cy-prior.cy)<staff.spacing*.18&&prior.parts===1){
        prior.width=part.x+part.width-prior.x;prior.y=Math.min(prior.y,part.y);prior.height=Math.max(prior.y+prior.height,part.y+part.height)-prior.y;prior.cx=prior.x+prior.width/2;prior.parts=2;
      }else candidates.push({...part,parts:1});
    }
    const textFrets=textFretsForStaff(glyphs,staff),rhythms=measures.map((m,i)=>({...m,index:i,rhythm:detectRhythm(ink,width,height,staff,m,textFrets.length?textFrets:parts.filter(p=>p.stringDistance<config.stringTolerance),beamInk)}));
    const nativeText=textFrets.length>=4&&Math.max(...textFrets.map(c=>c.cx))-Math.min(...textFrets.map(c=>c.cx))>staff.width*.3;
    if(nativeText)candidates=textFrets;
    else candidates=candidates.filter(c=>{
      // Stem fragments crossing a string are not the digit 1. Inspect rows
      // away from the ruled line, where a real digit has its head/curve/serif.
      let widest=0;
      for(let y=c.y;y<c.y+c.height;y++){
        if(Math.abs(y-staff.lines[c.string-1])<=Math.ceil(staff.thickness/2)+1)continue;
        const xs=[];for(let x=c.x;x<c.x+c.width;x++)if(ink[y*width+x])xs.push(x);
        if(xs.length)widest=Math.max(widest,xs.at(-1)-xs[0]+1);
      }
      return widest>staff.spacing*.28;
    });
    candidates.forEach((c,i)=>{c.id=`p${page}s${staff.id}c${i}`;if(c.ocr)return;c.bitmap=new Uint8Array(c.width*c.height);c.grayscale=new Uint8Array(c.width*c.height);for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const p=(c.y+y)*width+c.x+x;c.bitmap[y*c.width+x]=clean[p];c.grayscale[y*c.width+x]=Math.round(rgba[p*4]*.299+rgba[p*4+1]*.587+rgba[p*4+2]*.114);}});
    for(const c of candidates)if(!c.ocr){
      const top=Math.max(0,c.y-Math.ceil(staff.spacing*.45)),h=c.y-top+Math.ceil(c.height*.25),cap=new Uint8Array(c.width*h);
      for(let y=0;y<h;y++)for(let x=0;x<c.width;x++){const p=((top+y)*width+c.x+x)*4;cap[y*c.width+x]=Math.round(rgba[p]*.299+rgba[p+1]*.587+rgba[p+2]*.114);}
      c.sevenCap=hasSevenCap(cap,c.width,h);
    }
    const result={...staff,bars,candidates,nativeText,measures:rhythms};
    result.meterCandidate=findPrintedMeter(ink,width,result);
    if(!nativeText)markNonFretSymbols(ink,width,result);
    attachHalfNoteStubs(ink,width,height,result,candidates.filter(c=>!c.nonFretSymbol));attachPrintedTuplets(result,glyphs);output.push(result);
  }
  const rhythmicPage=output.some(s=>s.measures.some(m=>m.rhythm.some(r=>s.candidates.some(c=>Math.abs(c.cx-r.x)<s.spacing*.4))));
  for(const staff of output){attachNativeTabSymbols(ink,width,staff,{rhythmicPage});attachImageRests(ink,width,height,staff);}
  return {page,width,height,staffs:output};
}
