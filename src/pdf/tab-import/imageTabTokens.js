// Inspect source pixels before OCR. All distances are relative to the detected
// TAB spacing, so these checks work with a different font or render scale.
export function markNonFretSymbols(ink,width,staff){
  const g=staff.spacing,anchors=staff.measures.flatMap(m=>m.rhythm.filter(r=>!r.rest));
  for(const c of staff.candidates){
    if(staff.bars.some(x=>x>=c.x-g*.15&&x<=c.x+c.width+g*.15)){
      c.nonFretSymbol='barline';continue;
    }
    // A stem crosses a string continuously above AND below the cut glyph box.
    // A numeral (including a narrow 1) has headroom before its printed top.
    let through=0,total=0;
    for(let y=Math.floor(c.y-g*.16);y<=c.y+c.height+g*.16;y++){
      if(staff.lines.some(line=>Math.abs(y-line)<=staff.thickness+1))continue;
      total++;let hit=false;
      for(let x=Math.round(c.cx-g*.08);x<=c.cx+g*.08;x++)hit||=Boolean(ink[y*width+x]);
      if(hit)through++;
    }
    if(total&&through/total>.92){c.nonFretSymbol='stem-crossing';continue;}
    let widest=0;
    for(let y=c.y;y<c.y+c.height;y++){
      if(staff.lines.some(line=>Math.abs(y-line)<=staff.thickness+1))continue;
      let count=0;for(let x=c.x;x<c.x+c.width;x++)count+=ink[y*width+x]??0;
      widest=Math.max(widest,count);
    }
    if(widest<=g*.25){
      let continued=0,rows=0;
      const anchor=anchors.find(r=>Math.abs(r.x-c.cx)<=g*.4),x=anchor?.x??c.cx;
      for(let y=c.y+c.height;y<=c.y+c.height+g*.4;y++){
        rows++;let hit=false;for(let dx=-Math.ceil(g*.12);dx<=g*.12;dx++)hit||=Boolean(ink[Math.round(y)*width+Math.round(x+dx)]);
        if(hit)continued++;
      }
      if(continued/rows>.85){c.nonFretSymbol='stem-crossing';continue;}
      // Between notes of a chord, the short connecting stroke can have gaps
      // at both ends. A plain vertical segment has no numeral head or bowl.
      const neighbors=staff.candidates.filter(n=>n!==c&&Math.abs(n.cx-c.cx)<g*.25);
      if(neighbors.some(n=>n.string<c.string)&&neighbors.some(n=>n.string>c.string)){
        c.nonFretSymbol='chord-connector';continue;
      }
    }
    if(anchors.some(r=>Math.abs(r.x-c.cx)<=g*.4))continue;
    // The oversized TAB/time signature header precedes the first stem. It
    // is outside the note columns and uses larger letters or numerals.
    const first=anchors[0];
    if(c.width>g&&first&&c.cx<first.x-g*1.5&&c.cx<staff.x+g*4){c.nonFretSymbol='tab-header';continue;}
    // An arpeggio spine is connected through several string gaps, just left
    // of a real chord column. Separate stacked digits leave white gaps.
    const near=anchors.some(r=>r.x-c.cx>g*.4&&r.x-c.cx<g*1.6);
    if(!near)continue;
    let bridged=0;
    for(let i=0;i<5;i++){
      let rows=0,total=0;
      for(let y=Math.ceil(staff.lines[i]+g*.36);y<=staff.lines[i+1]-g*.36;y++){
        total++;let hit=false;
        for(let x=Math.round(c.cx-g*.22);x<=c.cx+g*.22;x++)hit||=Boolean(ink[y*width+x]);
        if(hit)rows++;
      }
      if(total&&rows/total>.8)bridged++;
    }
    if(bridged>=2)c.nonFretSymbol='arpeggio-spine';
  }
}
