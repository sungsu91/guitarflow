import { localizeUi } from "../i18n/core.js";
import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
// Compare the complete fingering: a different voicing of the same chord must
// still be shown. An empty measure breaks the run of repeated diagrams.
export function chordDiagramVisibility(shapes=[],names=[]) {
  return shapes.map((shape,i)=>Boolean(shape)&&(i===0||!shapes[i-1]||names[i]!==names[i-1]||JSON.stringify(shape)!==JSON.stringify(shapes[i-1])));
}

export function drawChordDiagram(svg, shape, name, x, y, options={}) {
  const ns='http://www.w3.org/2000/svg';
  const group=document.createElementNS(ns,'g');
  group.setAttribute('class','etudeChordDiagram');
  group.setAttribute('role','img');
  group.setAttribute('aria-label',localizeUi(formatMessage(ko["etudes.valueFromString1AtTheTopValue"], { value1: name, value2: [...shape.frets].reverse().map(f=>f===null?ko["etudes.muted"]:f+ko["app.fret"]).join(', ') })));
  const add=(tag,attrs,text)=>{const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;group.append(node);return node;};
  const positive=shape.frets.filter(f=>f>0);
  const base=shape.fretWindow?.start??(shape.frets.includes(0)||!positive.length?1:Math.max(1,Math.min(...positive)));
  const columns=shape.fretWindow?shape.fretWindow.end-base+1:Math.max(4,Math.max(0,...positive)-base+1);
  const gridWidth=options.width??72,large=Boolean(options.large),ink=large?'#70513b':'#111';
  const gx=x+34, gy=y+(large?40:10), gap=large?18:12, step=gridWidth/columns;
  const text=(tx,ty,label,size=12,fill='#111',attrs={})=>add('text',{x:tx,y:ty,'text-anchor':'middle',fill,style:`font:600 ${size}px Arial,sans-serif;fill:${fill}`,...attrs},label);
  text(gx+gridWidth/2,large?y+17:gy+(shape.frets.length-1)*gap+34,name,large?24:17,ink);
  // Left-rotated chord box: high E (string 1) at the top; frets increase rightward.
  for(let row=0;row<shape.frets.length;row++) {
    const cy=gy+row*gap;
    add('line',{x1:gx,x2:gx+gridWidth,y1:cy,y2:cy,stroke:'#333','stroke-width':1,'data-string':row+1});
    text(gx-27,cy+4,String(row+1),11,'#444',{'class':'etudeChordStringLabel','data-string':row+1});
  }
  for(let i=0;i<=columns;i++)add('line',{x1:gx+i*step,x2:gx+i*step,y1:gy,y2:gy+(shape.frets.length-1)*gap,stroke:'#333','stroke-width':i===0&&base===1?3:1});
  if(shape.fretWindow)for(let i=0;i<columns;i++)text(gx+(i+.5)*step,gy+(shape.frets.length-1)*gap+16,String(base+i),Math.min(10,step*.8));
  else text(gx+step/2,gy+(shape.frets.length-1)*gap+16,`${base}fr`,11);
  if(shape.barre) {
    const b=shape.barre, bx=gx+(b.fret-base+.5)*step;
    add('line',{x1:bx,x2:bx,y1:gy+(b.from-1)*gap,y2:gy+(b.to-1)*gap,stroke:'#59d8b9','stroke-opacity':.45,'stroke-width':large?14:10,'stroke-linecap':'round','class':'etudeChordBarre'});
  }
  shape.frets.forEach((f,i)=>{
    const string=shape.frets.length-i, cy=gy+(string-1)*gap;
    if(shape.blankStrings?.includes(string))return;
    if(f===null||f===0){text(gx-12,cy+4,f===null?'×':'○',12);return;}
    const cx=gx+(f-base+.5)*step;
    add('circle',{cx,cy,r:large?7:5.4,fill:ink,'data-string':string,'data-fret':f});
    if(shape.fingers?.[i])text(cx,cy+3,String(shape.fingers[i]),8,'white');
  });
  svg.append(group);
  return group;
}

// Put the glow behind notation, so it never intercepts note input or obscures ink.
export function drawChordRange(svg,{range,points,top,bottom,id}){
 if(!range||points.length<2)return;
 const ns='http://www.w3.org/2000/svg';
 const make=(tag,attrs)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
 const xAt=tick=>{const i=Math.max(0,Math.min(points.length-2,points.findLastIndex(p=>p.tick<=tick))),a=points[i],b=points[i+1];return a.x+(b.x-a.x)*Math.max(0,Math.min(1,(tick-a.tick)/(b.tick-a.tick||1)));};
 const left=xAt(range.startTick),right=xAt(range.endTick);
 const group=make('g',{class:'etudeChordRange','pointer-events':'none','aria-label':ko["etudes.chordDiagramStartAndEnd"],'data-start-tick':range.startTick,'data-end-tick':range.endTick});
 const defs=make('defs',{}),gradient=make('linearGradient',{id,x1:'0%',x2:'100%',y1:'0%',y2:'0%'});
 for(const [offset,opacity] of [['0%',.55],['10%',.16],['50%',.08],['90%',.16],['100%',.55]])gradient.append(make('stop',{offset,'stop-color':'#ff345a','stop-opacity':opacity}));
 defs.append(gradient);group.append(defs,make('rect',{x:left,y:top-10,width:Math.max(1,right-left),height:bottom-top+20,rx:4,fill:`url(#${id})`}));
 for(const x of [left,right])group.append(make('rect',{x:x-2,y:top-10,width:4,height:bottom-top+20,rx:2,fill:'#ff345a','fill-opacity':.4}));
 svg.prepend(group);
}
