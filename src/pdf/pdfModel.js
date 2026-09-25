import {expandPdfBars} from './pdfBarRows.js';
export function normalizedRect(start,end) {
 const x=Math.max(0,Math.min(1,start.x,end.x)),y=Math.max(0,Math.min(1,start.y,end.y));
 return {x,y,width:Math.min(1-x,Math.abs(end.x-start.x)),height:Math.min(1-y,Math.abs(end.y-start.y))};
}
export function practiceOrder(record) {
 const bars=expandPdfBars(record.barMap??[]),byNumber=new Map(bars.map(b=>[b.number,b]));
 const order=(record.practiceOrder?.length?record.practiceOrder:bars.map(b=>b.number)).map(n=>byNumber.get(n)).filter(Boolean);
 const start=Math.max(0,Math.min(order.length-1,(record.loopStart??1)-1));
 const end=Math.max(start,Math.min(order.length-1,(record.loopEnd??order.length)-1));
 return record.loop?order.slice(start,end+1):order;
}
export function barAtTick(order,tick,loop=false) {
 const total=order.reduce((n,b)=>n+b.beats,0);if(!total||tick<0)return null;
 if(!loop&&tick>=total)return {ended:true,index:order.length-1,bar:order.at(-1)};
 let left=loop?tick%total:tick;
 for(let i=0;i<order.length;i++){if(left<order[i].beats)return {index:i,bar:order[i],beat:left};left-=order[i].beats;}return null;
}
export function canvasSize(width,height,dpr=1,maxPixels=6000000) {
 const ratio=Math.min(2,dpr,Math.sqrt(maxPixels/(width*height)),4096/width,4096/height);
 return {width:Math.max(1,Math.floor(width*ratio)),height:Math.max(1,Math.floor(height*ratio)),ratio};
}
// Align only a newly drawn region. Existing bar coordinates never move implicitly.
export function alignBarRow(rect,bars,enabled=true) {
 if(!enabled)return {...rect};
 const center=rect.y+rect.height/2;
 const candidates=bars.filter(b=>b.page===rect.page&&Math.abs(center-(b.y+b.height/2))<=Math.min(rect.height,b.height)*.35&&rect.height/b.height>=.5&&rect.height/b.height<=1.8);
 candidates.sort((a,b)=>Math.abs(center-(a.y+a.height/2))-Math.abs(center-(b.y+b.height/2))||a.number-b.number);
 const match=candidates[0];
 return match?{...rect,y:match.y,height:match.height}:{...rect};
}
export function splitBarRow(rect,count) {
 const n=Math.max(1,Math.min(64,Math.floor(Number(count)||1)));
 return Array.from({length:n},(_,i)=>({...rect,x:rect.x+rect.width*i/n,width:rect.width/n}));
}

// Editing resumes at the beginning of the current measure, never partway through beat 1.
export function pdfEditResumePosition(order,held,countTicks=0,loop=false){
 if(held<countTicks)return 0;
 const position=barAtTick(order,held-countTicks,loop);
 return !position||position.ended?0:countTicks+order.slice(0,position.index).reduce((sum,b)=>sum+b.beats,0);
}
