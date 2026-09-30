import {DESKTOP_SCORE_WIDTH,DESKTOP_SCORE_PAGE_HEIGHT} from './desktopScoreSizing.js';

export const DESKTOP_SCORE_PADDING = 20;
export const DESKTOP_SCORE_CONTENT_WIDTH = DESKTOP_SCORE_WIDTH - (DESKTOP_SCORE_PADDING + 1) * 2;
const HEADER_HEIGHT = 144;
const FOOTER_HEIGHT = 36;

// Whole systems belong to a page. An unusually tall system is scaled to fit
// on its own page, rather than cutting off notes at the paper edge.
export function paginateScoreRows(rows,{scale=1,height=DESKTOP_SCORE_PAGE_HEIGHT-DESKTOP_SCORE_PADDING*2-FOOTER_HEIGHT,heading=HEADER_HEIGHT}={}) {
  const pages=[];
  for(let first=0;first<rows.length;){
    const available=height-(pages.length?0:heading);
    let last=first;
    while(last+1<rows.length&&(rows[last+1].end-rows[first].start)*scale<=available)last++;
    const start=rows[first].start,end=rows[last].end;
    pages.push({start,end,first,last,scale:Math.min(scale,available/Math.max(1,end-start))});
    first=last+1;
  }
  return pages;
}

// Read geometry in the isolated engraving tree before changing any nodes.
// Page SVGs keep their original coordinates so playback and bar selection
// share the same model as the continuous mobile reader.
export function createDesktopScorePages(source) {
  const doc=source.ownerDocument,box=source.viewBox.baseVal;
  const width=box.width,bottom=box.y+box.height;
  const groups=new Map(),barRows=new Map();
  for(const bar of source.querySelectorAll('[data-playback-bar]')){
    const row=Number(bar.dataset.row);
    barRows.set(bar.dataset.playbackBar,row);
    if(!groups.has(row))groups.set(row,{row,top:Number(bar.dataset.rowTop)});
  }
  const systems=[...groups.values()].sort((a,b)=>a.top-b.top);
  const inverse=source.getScreenCTM().inverse();
  const entries=[...source.children].map(node=>{
    if(node.hasAttribute('data-playback-bar'))return {node,row:Number(node.dataset.row)};
    if(typeof node.getBBox!=='function')return {node};
    const b=node.getBBox(),matrix=inverse.multiply(node.getScreenCTM());
    const bar=node.dataset.annotationBar??node.dataset.navigationBar??node.dataset.scoreBar??node.dataset.measure;
    return {node,row:barRows.get(bar),top:b.y*matrix.d+matrix.f,bottom:(b.y+b.height)*matrix.d+matrix.f,ink:b.width>0||b.height>0};
  });
  // Find a clear gap close to each system boundary, including stems and
  // chord diagrams that extend beyond the renderer's nominal row height.
  const starts=systems.map((system,index)=>{
    if(!index)return box.y;
    // A section heading belongs to the following system. Do not choose the
    // small gap between that heading and its chord diagrams as a page break.
    const firstInk=Math.min(...entries.filter(e=>e.row===system.row&&e.ink).map(e=>e.top));
    const ideal=Math.min(system.top+box.y,firstInk-8),previous=systems[index-1].top;
    const radius=(system.top-previous)*.3;
    const intervals=entries.filter(e=>e.ink&&e.bottom-e.top<system.top-previous&&e.bottom>ideal-radius&&e.top<ideal+radius).sort((a,b)=>a.top-b.top);
    const gaps=[];let edge=ideal-radius;
    for(const entry of intervals){if(entry.top>edge+2)gaps.push([edge,entry.top]);edge=Math.max(edge,entry.bottom);}
    if(edge<ideal+radius)gaps.push([edge,ideal+radius]);
    if(!gaps.length)return ideal;
    return gaps.map(([a,b])=>Math.max(a+1,Math.min(b-1,ideal))).sort((a,b)=>Math.abs(a-ideal)-Math.abs(b-ideal))[0];
  });
  const rows=systems.map((system,i)=>({...system,start:starts[i],end:starts[i+1]??bottom}));
  if(!rows.length)rows.push({row:1,start:box.y,end:bottom});
  const pages=paginateScoreRows(rows,{scale:DESKTOP_SCORE_CONTENT_WIDTH/width});
  const fragment=doc.createDocumentFragment();
  for(const [index,page] of pages.entries()){
    const paper=doc.createElement('article');paper.className='etudeSheet desktopScorePage';paper.dataset.scorePage=String(index+1);
    paper.setAttribute('aria-label',`${index+1} / ${pages.length}`);
    if(index===0){const header=doc.createElement('div');header.className='desktopScorePageHeader';paper.append(header);}
    const svg=source.cloneNode(false);svg.dataset.scorePage=String(index+1);
    svg.setAttribute('viewBox',`0 ${page.start} ${width} ${page.end-page.start}`);
    svg.setAttribute('height',String(page.end-page.start));
    Object.assign(svg.style,{width:`${width*page.scale}px`,height:`${(page.end-page.start)*page.scale}px`,maxWidth:'none',aspectRatio:'auto',overflow:'hidden',margin:'0 auto'});
    const rowIds=new Set(rows.slice(page.first,page.last+1).map(r=>r.row));
    for(const entry of entries){
      if(entry.row!=null?!rowIds.has(entry.row):entry.ink&&(entry.bottom<=page.start||entry.top>=page.end))continue;
      svg.append(entry.node.cloneNode(true));
    }
    paper.append(svg);
    if(index===pages.length-1){const footer=doc.createElement('div');footer.className='desktopScorePageExtra';paper.append(footer);}
    const number=doc.createElement('footer');number.className='desktopScorePageNumber';number.textContent=`${index+1} / ${pages.length}`;paper.append(number);
    fragment.append(paper);
  }
  return fragment;
}

// Global :has() rules made each VexFlow getBBox() flush the entire app.
// A contained shadow tree limits those measurements to the engraving itself.
export function withIsolatedScore(width,render) {
  const host=document.createElement('div');
  host.style.cssText=`position:fixed;left:-100000px;top:0;width:${width}px;height:8000px;contain:strict;visibility:hidden;pointer-events:none`;
  document.body.append(host);
  const root=document.createElement('div');host.attachShadow({mode:'open'}).append(root);
  try{return render(root);}finally{host.remove();}
}
