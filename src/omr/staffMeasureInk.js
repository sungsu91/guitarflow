import {runs} from '../pdf/tab-import/geometry.js';

// Only geometric evidence: long stems and the tall diagonal head of rhythmic
// slash notation. A normal oval notehead is too short to pass this detector.
export function staffMeasureInk(ink,width,height,staff,box,{first=false}={}){
  const g=staff.spacing,top=Math.max(0,Math.floor(staff.y-g*3.5)),bottom=Math.min(height-1,Math.ceil(staff.y+staff.height+g*4));
  const left=Math.ceil(Math.max(box.x+g*.8,first?staff.x+g*4:0)),right=Math.floor(box.x+box.width-g*.8),columns=[];
  const at=(x,y)=>ink[Math.round(y)*width+Math.round(x)]??0;
  for(let x=left;x<=right;x++){
    let start=top,last=top,best=null;
    for(let y=top;y<=bottom+2;y++){
      if(y<=bottom&&at(x,y)){last=y;continue;}
      if(y-last<=1)continue;
      if(last-start>=g*2.1&&(!best||last-start>best.bottom-best.top))best={x,top:start,bottom:last};
      start=y+1;last=start;
    }
    if(best)columns.push(best);
  }
  const stems=runs(columns.map(c=>c.x),Math.ceil(g*.22)).map(xs=>columns.filter(c=>xs.includes(c.x)).sort((a,b)=>(b.bottom-b.top)-(a.bottom-a.top))[0]);
  const slashes=[];
  for(const stem of stems){
    if(stem.top>staff.y+g*1.2||Math.abs(stem.bottom-(staff.y+g*2))>g*.4)continue;
    let best=null;
    for(const slope of [.55,.65,.75])for(const shift of [-.28,-.16,-.04]){
      let center=0,leftInk=0,rightInk=0,samples=0;
      for(let y=Math.ceil(staff.y+g*2.18);y<staff.y+g*3.82;y++){
        if(staff.lines.some(line=>Math.abs(y-line)<=Math.ceil(staff.thickness/2)))continue;
        const x=stem.x-(y-(staff.y+g*2))*slope+g*shift;
        center+=at(x,y);leftInk+=at(x-g*.24,y);rightInk+=at(x+g*.24,y);samples++;
      }
      if(!samples)continue;
      const filled=center/samples>.9,hollow=center/samples<.35&&leftInk/samples>.75&&rightInk/samples>.75;
      const support=filled?center/samples:hollow?Math.min(leftInk,rightInk)/samples:0;
      if(support&&(!best||support>best.support))best={...stem,hollow, support};
    }
    if(!best)continue;
    let splitRows=0,headRows=0;
    for(let y=Math.ceil(staff.y+g*2.25);y<staff.y+g*3.75;y++){
      if(staff.lines.some(line=>Math.abs(y-line)<=staff.thickness+1))continue;
      const center=stem.x-(y-(staff.y+g*2))*.65,xs=[];
      for(let x=Math.round(center-g*.85);x<=center+g*.25;x++)if(at(x,y))xs.push(x);
      const parts=runs(xs).filter(r=>r.length>=g*.08);
      if(parts.length===2&&parts[1][0]-parts[0].at(-1)>g*.12)splitRows++;
      headRows++;
    }
    best.hollow=headRows>0&&splitRows/headRows>.5;
    // Read beams away from the stem itself; a quarter has no horizontal beam.
    let beams=0;
    for(const direction of [-1,1]){
      const rows=[];
      for(let y=Math.max(top,Math.floor(stem.top-g*.65));y<Math.min(staff.y+g*1.5,stem.top+g*1.9);y++){
        if(staff.lines.some(line=>Math.abs(y-line)<=staff.thickness+1))continue;
        let count=0,n=0;for(let dx=g*.45;dx<=g*.95;dx++){count+=at(stem.x+direction*dx,y);n++;}
        if(n&&count/n>.8)rows.push(y);
      }
      beams=Math.max(beams,runs(rows,staff.thickness+2).filter(run=>run.length>=Math.max(2,g*.1)).length);
    }
    slashes.push({...best,duration:best.hollow?'2':beams===0?'4':String(4*2**Math.min(3,beams))});
  }
  for(const stem of stems){
    const heads=[];
    for(let step=-8;step<=16;step++){
      const cy=staff.lines.at(-1)-step*staff.height/8;
      if(cy<stem.top-g*.65||cy>stem.bottom+g*.65)continue;
      let best=0;
      for(const side of [-1,1]){
        const cx=stem.x+side*g*.48;let dark=0,n=0;
        for(let dy=-Math.floor(g*.33);dy<=g*.33;dy++)for(let dx=-Math.floor(g*.43);dx<=g*.43;dx++){
          if((dx/(g*.43))**2+(dy/(g*.33))**2>1)continue;
          const y=Math.round(cy+dy);
          if(Math.abs((y-staff.y)/g-Math.round((y-staff.y)/g))*g<=staff.thickness/2+.5)continue;
          dark+=at(cx+dx,y);n++;
        }
        best=Math.max(best,n?dark/n:0);
      }
      if(best>.6)heads.push({step,support:best});
    }
    stem.heads=heads;
  }
  return {stems,slashes};
}
