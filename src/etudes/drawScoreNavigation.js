import {Glyph} from 'vexflow';
import {NAV_COMMANDS} from './scoreNavigation.js';

export function navigationBottom(left,right,top,height,obstacles,{span=false}={}){
 let bottom=top-6;
 for(let pass=0;pass<=obstacles.length;pass++){
  const before=bottom;
  for(const box of obstacles)if(right+3>box.x&&left-3<box.x+box.width){
   if(span||(bottom>box.y-6&&bottom-height<box.y+box.height+6))bottom=Math.min(bottom,box.y-6);
  }
  if(bottom===before)break;
 }
 return bottom;
}

// Editor bars use separate SVGs. Keep a continuous numbered ending level
// across adjacent bars, using the highest collision-free position in its span.
export function alignNavigationEndings(entries){
 let run=[];
 const flush=()=>{if(!run.length)return;const y=Math.min(...run.map(e=>Number(e.node.dataset.endingY)));for(const e of run)e.node.setAttribute('transform',`translate(0 ${y-Number(e.node.dataset.endingY)})`);run=[];};
 for(const entry of entries){if(!entry.node){flush();continue;}const prev=run.at(-1);if(prev&&(prev.row!==entry.row||prev.number!==entry.number||prev.index+1!==entry.index))flush();run.push(entry);}flush();
}

export function drawScoreNavigation(context,svg,{mark,previous,next,x,width,top,first,last,index,row=1,obstacles=[]}){
 if(!mark.ending&&!mark.marker&&!mark.command)return;
 const ns='http://www.w3.org/2000/svg',group=context.openGroup('score-navigation');group.dataset.navigationBar=String(index);group.dataset.staveTop=String(top);
 const append=(tag,attributes,text)=>{const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));if(text)node.textContent=text;group.append(node);return node;};
 const occupied=[...obstacles];
 const glyph=(kind,gx,size)=>{
  const box=new Glyph(kind,size).bbox;
  const bottom=navigationBottom(gx+box.getX(),gx+box.getX()+box.getW(),top,box.getH(),occupied),y=bottom-box.getY()-box.getH();
  Glyph.renderGlyph(context,gx,y,size,kind);occupied.push({x:gx+box.getX(),y:bottom-box.getH(),width:box.getW(),height:box.getH()});return y;
 };
 // Leave the small bar number its own slot so it does not lift an otherwise
 // empty measure's navigation sign away from the stave.
 if(mark.marker==='segno'||mark.marker==='coda')glyph(mark.marker,x+24,22);
 if(mark.marker==='toCoda'){
  const bottom=navigationBottom(x+width-48,x+width-3,top,24,occupied),y=bottom-5;
  append('text',{x:x+width-28,y,'text-anchor':'end','font-family':'Arial','font-size':13},'To');Glyph.renderGlyph(context,x+width-24,y,20,'coda');occupied.push({x:x+width-48,y:bottom-24,width:45,height:24});
 }
 const text=mark.marker==='fine'?'Fine':NAV_COMMANDS.find(([kind])=>kind===mark.command)?.[1];
 if(text){const right=x+width-6,left=right-text.length*8,bottom=navigationBottom(left,right,top,16,occupied);append('text',{x:right,y:bottom-3,'text-anchor':'end','font-family':'Arial','font-size':13,'font-weight':600},text);occupied.push({x:left,y:bottom-16,width:right-left,height:16});}
 if(mark.ending){
  const left=x+2,right=x+width-2,y=navigationBottom(left,right,top,18,occupied,{span:true})-18,start=previous?.ending!==mark.ending,end=next?.ending!==mark.ending;
  const ending=append('g',{'data-ending-y':y,'data-ending-number':mark.ending,'data-ending-row':row,'data-ending-bar':index});
  const path=append('path',{d:`M${left} ${y+((start||first)?12:0)}V${y}H${right}${end?'v12':''}`,fill:'none',stroke:'#242321','stroke-width':1.5,'data-ending':mark.ending});ending.append(path);
  if(start||first)ending.append(append('text',{x:left+5,y:y+16,'font-family':'Arial','font-size':14,'font-weight':700},`${mark.ending}.`));
 }
 context.closeGroup();
}
