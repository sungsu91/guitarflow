import {runs} from './tab-import/geometry.js';
export function photoBars(ink,width,staff,boundedBars=[]){
 const g=staff.spacing,top=staff.lines[0],bottom=staff.lines.at(-1),height=bottom-top,candidates=[];
 const black=(x,y)=>ink[Math.round(y)*width+Math.round(x)]??0;
 const hit=(x,y)=>black(x,y)||black(x-1,y)||black(x+1,y);
 for(let mid=Math.ceil(staff.x);mid<=staff.x+staff.width;mid++){
  let best;
  for(let drift=-Math.ceil(g*1.4);drift<=g*1.4;drift+=2){
   const xAt=y=>mid+drift*((y-top)/height-.5);
   if(![.1,.3,.5,.7,.9].every(v=>hit(xAt(top+height*v),top+height*v)))continue;
   let support=0,total=0,side=0,sideN=0;const near=[],far=[],sides=[0,0];
   for(let y=top+2;y<bottom-1;y++){
    const d=Math.min(...staff.lines.map(l=>Math.abs(l-y)))/g;if(d<.14)continue;
    const x=xAt(y);support+=hit(x,y);total++;
    let amount=0;for(let dx=-Math.ceil(g*.45);dx<=g*.45;dx++)amount+=black(x+dx,y);
    (d<.32?near:far).push(amount);
    for(const sign of [-1,1])for(let dx=Math.ceil(g*.5);dx<=g*1.1;dx+=2){const n=black(x+sign*dx,y);side+=n;sides[sign===-1?0:1]+=n;sideN++;}
   }
   if(support/total<.96)continue;
   const parallel=[];for(let dx=-Math.ceil(g);dx<=g;dx++){let n=0;for(let y=top+2;y<bottom-1;y++)n+=black(xAt(y)+dx,y);if(n/(height-3)>.94)parallel.push(dx);}
   const bands=runs(parallel),repeat=bands.length>=2&&bands.at(-1)[0]-bands[0].at(-1)>g*.1;
   const crossing=Math.min(...sides)>sideN*.04&&Math.max(...sides)<Math.min(...sides)*2;
   if(!repeat&&!crossing&&side/sideN>.14)continue;
   const med=a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)];
   if(med(near)>med(far)+g*.1||!repeat&&med(near)>g*.4)continue;
   // A barline ends at the bottom rule; a rhythmic stem continues below it.
   let below=0;for(let y=bottom+Math.ceil(g*.15);y<=bottom+g*.7;y++)below+=hit(xAt(y),y)||hit(xAt(bottom)-1,y)||hit(xAt(bottom)+1,y);
   const ties=med(far)>med(near)*1.5&&side/sideN<.14;
   const bounded=boundedBars.some(x=>Math.abs(x-mid)<g*.5);
   // Stacked ties crossing a genuine bar are widest between staff rules. A
   // column of TAB digits is widest on the rules, so cannot use this exception.
   const curvedCrossing=crossing&&med(far)>med(near)*2;
   if(below>g*(bounded&&ties?.5:(bounded&&crossing)||curvedCrossing?.35:.15))continue;
   const score=support/total-side/sideN;
   if(!best||score>best.score)best={x:mid,drift,score};
  }
  if(best)candidates.push(best);
 }
 return runs(candidates.map(c=>c.x),Math.ceil(g*.45)).map(xs=>candidates.filter(c=>xs.includes(c.x)).sort((a,b)=>b.score-a.score)[0]);
}
