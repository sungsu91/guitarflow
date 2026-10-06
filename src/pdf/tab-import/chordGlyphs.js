import {parseChordSymbol} from '../../chords/chordSymbols.js';
import {abortable} from './abortable.js';

export function chordGlyphBounds(image){
 const {data,width,height}=image,columns=[];
 for(let x=0;x<width;x++){
  const ys=[];for(let y=0;y<height;y++){const p=(y*width+x)*4;if(data[p]*.299+data[p+1]*.587+data[p+2]*.114<150)ys.push(y);}
  columns.push(ys);
 }
 const groups=[];
 for(let x=0;x<width;x++)if(columns[x].length){const last=groups.at(-1);if(last&&x===last.at(-1)+1)last.push(x);else groups.push([x]);}
 const box=xs=>{const ys=xs.flatMap(x=>columns[x]);return {x:xs[0],y:Math.min(...ys),width:xs.at(-1)-xs[0]+1,height:Math.max(...ys)-Math.min(...ys)+1};};
 return groups.flatMap(xs=>{
  const b=box(xs);
  // Light contact can join C/M or a/d. Split only at a narrow ink valley,
  // leaving wide single letters (including m) intact.
  if(b.width/b.height>1.65){
   const cuts=xs.filter(x=>x-b.x>b.height*.5&&b.x+b.width-x>b.height*.5&&columns[x].length<=b.height*.18);
   const cut=cuts.sort((a,c)=>columns[a].length-columns[c].length||Math.abs(a-b.x-b.width/2)-Math.abs(c-b.x-b.width/2))[0];
   if(cut!==undefined)return [box(xs.filter(x=>x<cut)),box(xs.filter(x=>x>cut))];
  }
  return [b];
 });
}

export function curvedParenthesis(image,g){
 if(g.width/g.height>.48)return null;
 const mean=(from,to)=>{const xs=[];for(let y=from;y<to;y++)for(let x=0;x<g.width;x++){const p=((g.y+y)*image.width+g.x+x)*4;if(image.data[p]<150)xs.push(x);}return xs.length?xs.reduce((n,x)=>n+x,0)/xs.length:null;};
 const top=mean(0,Math.ceil(g.height*.2)),mid=mean(Math.floor(g.height*.4),Math.ceil(g.height*.6)),bottom=mean(Math.floor(g.height*.8),g.height);
 if(top===null||mid===null||bottom===null)return null;
 // Subtract the end-to-end slant before measuring curvature (italic labels).
 const bow=(top+bottom)/2-mid;
 if(bow>g.width*.18)return '(';
 if(bow<-g.width*.18)return ')';
 return null;
}

// Closely spaced chord changes may form one connected text group (G7 C),
// including a raised last root. Split only independently recognized root
// glyphs, never the uppercase bass after a slash or a valid extended chord.
export function splitChordGlyphSequence(letters,glyphs){
 if(parseChordSymbol(letters.join('')))return null;
 const starts=[0,...letters.flatMap((letter,i)=>i>0&&/^[A-G]$/.test(letter)&&letters[i-1]!=='/'&&glyphs[i].height>=glyphs[0].height*.7?[i]:[])];
 if(starts.length<2||starts.length>4)return null;
 const words=starts.map((start,i)=>{
  const end=starts[i+1]??letters.length,text=letters.slice(start,end).join(''),parsed=parseChordSymbol(text),group=glyphs.slice(start,end);
  if(!parsed)return null;
  const x=Math.min(...group.map(g=>g.x)),y=Math.min(...group.map(g=>g.y));
  return {text,name:parsed.name,x,y,width:Math.max(...group.map(g=>g.x+g.width))-x,height:Math.max(...group.map(g=>g.y+g.height))-y,confidence:.9,method:'local-chord-glyph-sequence'};
 });
 return words.every(Boolean)?words:null;
}

// Retry isolated printed characters only after locating a complete chord text
// group. In particular, two printed 1s must not become a confidently guessed m.
export async function recognizeChordGlyphs(raw,part,worker,{signal}={}){
 const source=raw.getContext('2d').getImageData(part.x,part.y,part.width,part.height),glyphs=chordGlyphBounds(source);
 if(glyphs.length<2||glyphs.length>12)return null;
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),letters=[];
 const curves=glyphs.map(g=>curvedParenthesis(source,g));
 const open=curves.indexOf('('),close=curves.lastIndexOf(')');
 const paired=open>0&&close===glyphs.length-1&&close>open+1&&Math.abs(glyphs[open].y-glyphs[close].y)<part.height*.15;
 try{
  for(const [index,g] of glyphs.entries()){
   if(paired&&(index===open||index===close)){letters.push(curves[index]);continue;}
   const reads=[];
   const numeric=paired&&close-open===2&&index===open+1;
   await abortable(worker.setParameters({tessedit_char_whitelist:index===0?'ABCDEFG':numeric?'0123456789':'ABCDEFGMmmajinsudao#b0123456789/+().'}),signal);
   for(const [target,mode,margin,threshold] of [[48,'10',0],[72,'13',0],[96,'10',0],[72,'10',2],[72,'13',2],[72,'10',2,180],[72,'13',2,180]]){
    if(margin&&reads.some(r=>r.text.length===1&&r.confidence>=.9&&reads.filter(q=>q.text===r.text&&q.confidence>=.9).length>=2))break;
    const w=g.width*target/g.height;canvas.width=Math.ceil(w)+48;canvas.height=target+48;
    ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
    const scale=target/g.height;
    ctx.drawImage(raw,part.x+g.x-margin,part.y+g.y-margin,g.width+margin*2,g.height+margin*2,24-margin*scale,24-margin*scale,w+margin*2*scale,target+margin*2*scale);
    if(threshold){const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);for(let j=0;j<pixels.data.length;j+=4){const v=pixels.data[j]<threshold?0:255;pixels.data[j]=pixels.data[j+1]=pixels.data[j+2]=v;}ctx.putImageData(pixels,0,0);}
    await abortable(worker.setParameters({tessedit_pageseg_mode:mode}),signal);
    const {data}=await abortable(worker.recognize(canvas,{}, {blocks:true,text:true}),signal);
    const symbols=(data.blocks??[]).flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.words.flatMap(w=>w.symbols))));
    // A connected #m may be read as just m with high confidence. Require the
    // recognized ink to cover the whole component, including its accidental.
    const coverage=symbols.length?Math.min((Math.max(...symbols.map(s=>s.bbox.x1))-Math.min(...symbols.map(s=>s.bbox.x0)))/w,(Math.max(...symbols.map(s=>s.bbox.y1))-Math.min(...symbols.map(s=>s.bbox.y0)))/target):0;
    reads.push({text:data.text.trim(),confidence:coverage>=.8?Math.min(...symbols.map(s=>s.confidence))/100:0});
   }
   let ranked=reads.filter(r=>r.text.length===1&&r.confidence>=.9).sort((a,b)=>b.confidence-a.confidence);
   let match=ranked.find(r=>ranked.filter(q=>q.text===r.text).length>=2);
   // A numeric suggestion can be checked with a numeric-only pass. It must
   // already exist in the unrestricted reading; letters cannot be invented
   // from this retry and conflicting alphabetic evidence prevents it.
   const digit=ranked.find(r=>/^\d$/.test(r.text));
   if(!match&&digit&&!ranked.some(r=>/^[A-Za-z]$/.test(r.text))){
    await worker.setParameters({tessedit_char_whitelist:'0123456789',tessedit_pageseg_mode:'13'});
    const {data}=await abortable(worker.recognize(canvas,{}, {blocks:true,text:true}),signal);
    const symbols=(data.blocks??[]).flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.words.flatMap(w=>w.symbols))));
    if(data.text.trim()===digit.text&&symbols.length===1&&symbols[0].confidence>=90)match=digit;
   }
   if(!match)return null;
   letters.push(match.text);
  }
  const parsed=parseChordSymbol(letters.join(''));
  if(parsed)return {name:parsed.name,text:letters.join(''),confidence:.9,method:'local-chord-glyph-consensus'};
  const words=splitChordGlyphSequence(letters,glyphs);
  return words?{words}:null;
 }finally{
  canvas.width=canvas.height=0;
  if(!signal?.aborted)await worker.setParameters({tessedit_char_whitelist:'ABCDEFGNMabcdefgmjinsudao#b0123456789/+().'});
 }
}
