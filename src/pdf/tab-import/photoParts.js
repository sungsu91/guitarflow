import {summarizeAnalysis} from './recognition.js';

// A shared left system connector is evidence that two TAB rows sound together.
// Vertical proximity or equal bar counts alone never assign a guitar part.
export function photoPartLayout(ink,width,height,tracks,staffs){
 const rows=tracks.map((t,index)=>{
  const g=t.spacing,top=Math.round(t.center-g*2.5),bottom=top+g*5;
  const columns=[];
  for(let x=0;x<width;x++){
   let rules=0;for(let i=0;i<6;i++){let hit=0;for(let dy=-Math.ceil(g*.15);dy<=Math.ceil(g*.15);dy++)hit|=ink[(top+i*g+dy)*width+x]??0;rules+=hit;}
   if(rules>=4)columns.push(x);
  }
  const spans=[];for(const x of columns){const last=spans.at(-1);if(last&&x-last.at(-1)<=g*2)last.push(x);else spans.push([x]);}
  const span=spans.sort((a,b)=>b.length-a.length)[0];
  const matches=staffs.filter(s=>Math.abs(s.y+s.height/2-t.center)<g*.5);
  return {row:index+1,top,bottom,spacing:g,left:span?.[0],right:span?.at(-1),staffId:matches.length===1?matches[0].id:null};
 });
 let system=0,part=0;const connections=[];
 for(let i=0;i<rows.length;i++){
  const a=rows[i-1],b=rows[i];let evidence=null;
  if(a&&a.left!=null&&b.left!=null){
   const g=Math.max(a.spacing,b.spacing),aligned=Math.abs(a.left-b.left)<g*3,edge=aligned?Math.min(a.left,b.left):a.left;
   // A partially recovered lower rule can start halfway across the page.
   // The connector must still be measured at the upper system's left edge.
   const left=Math.max(0,Math.floor(edge-g)),right=Math.min(width-1,Math.ceil((aligned?Math.max(a.left,b.left):a.left)+g*.3));
   const from=Math.max(0,Math.round(a.bottom+g*.5)),to=Math.min(height-1,Math.round(b.top-g*.5));
   // A path must cross the actual whitespace between rows. Staff rules and
   // an isolated note stem cannot bridge that whole interval.
   if(to-from>g*3){
    let previous=new Float64Array(right-left+1);
    for(let y=from;y<=to;y++){
     const next=new Float64Array(previous.length);
     for(let x=left;x<=right;x++){
      const j=x-left,prior=Math.max(previous[j],previous[j-1]??0,previous[j+1]??0);
      next[j]=prior+(ink[y*width+x]?1:-3);
     }
     previous=next;
    }
    const coverage=Math.max(...previous)/(to-from+1);
    if(coverage>.94)evidence={method:'shared-left-system-connector',coverage,from,to,left,right};
   }
  }
  if(evidence){part++;connections.push({fromRow:a.row,toRow:b.row,...evidence});}else{system++;part=1;}
  Object.assign(b,{system,part});
 }
 if(!connections.length)return null;
 return {method:'shared-left-system-connector',requiresReview:true,partCount:Math.max(...rows.map(r=>r.part)),rows,connections};
}

export function analysisPartOptions(analysis){
 const count=Math.max(1,...(analysis?.pages??[]).map(p=>p.partLayout?.partCount??1));
 return count>1?Array.from({length:count},(_,i)=>i+1):[];
}

// Filtering creates a view; all original recognition data stays in analysis.
export function selectAnalysisPart(analysis,part){
 const choices=analysisPartOptions(analysis);
 if(!choices.length)return analysis;
 if(!choices.includes(part))throw Error('동시에 연주되는 TAB 파트가 있습니다. 원본의 위·아래 순서를 확인하고 가져올 파트를 선택해 주세요.');
 const pages=analysis.pages.map(page=>{
  if(!page.partLayout)return {...page,staffs:part===1?page.staffs:[]};
  const selected=page.partLayout.rows.filter(r=>r.part===part),ids=new Set(selected.map(r=>r.staffId).filter(id=>id!==null));
  return {...page,staffs:page.staffs.filter(s=>ids.has(s.id)),selectedPart:part,missingPartRows:selected.filter(r=>r.staffId===null).map(r=>({system:r.system,row:r.row}))};
 });
 if(!pages.some(p=>p.staffs.some(s=>s.measures.length)))throw Error(`선택한 ${part}번째 TAB 파트에서 읽힌 마디가 없습니다. 누락된 파트를 원본에서 확인해 주세요.`);
 return {...analysis,pages,summary:summarizeAnalysis(pages),partSelection:{part,requiresReview:true,method:'vertical-order-within-connected-systems',layouts:analysis.pages.filter(p=>p.partLayout).map(p=>({page:p.page,...p.partLayout}))}};
}
