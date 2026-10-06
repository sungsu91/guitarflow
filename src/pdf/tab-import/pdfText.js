// Digital PDFs already contain exact characters. Keep their real positions;
// never OCR a title/chord chart or infer a number from an entire page of text.
import {isFretText,normalizeFretText} from './fretText.js';

// PDF.js may combine a harmonic and its neighboring fret into one text item.
// Split only a complete, space-separated token sequence whose glyph widths
// are available elsewhere in the same PDF font; never assume bracket widths.
function separateHarmonicText(items){
  const atom=/^(?:\(<\d{1,2}>\)|<\d{1,2}>|[0-9Xx]{1,2})$/;
  const widths=new Map();
  for(const item of items)if(atom.test(item.str)&&item.height>0){
    const key=item.fontName+'|'+item.str,values=widths.get(key)??[];
    values.push(item.width/item.height);widths.set(key,values);
  }
  const ratios=new Map([...widths].map(([key,values])=>[key,values.sort((a,b)=>a-b)[Math.floor(values.length/2)]]));
  return items.flatMap(item=>{
    if(!item.str?.includes('<')||!item.str.includes(' ')||!item.transform||Math.abs(item.transform[1])+Math.abs(item.transform[2])>.01)return [item];
    const tokens=item.str.split(/ +/),spaces=(item.str.match(/ /g)??[]).length;
    if(tokens.some(token=>!atom.test(token)))return [item];
    const sizes=tokens.map(token=>ratios.get(item.fontName+'|'+token)*item.height);
    if(sizes.some(size=>!Number.isFinite(size)||size<=0))return [item];
    const gap=(item.width-sizes.reduce((a,b)=>a+b,0))/spaces;
    if(gap<0||gap>item.height*.65)return [item];
    let offset=0,index=0;
    return item.str.match(/ +|[^ ]+/g).flatMap(token=>{
      if(token[0]===' '){offset+=token.length*gap;return [];}
      const transform=[...item.transform],width=sizes[index++];transform[4]+=offset;offset+=width;
      return [{...item,str:token,width,transform}];
    });
  });
}
export function hasRotatedTabText(content,viewport){
  const digits=content.items.filter(item=>/^[0-9Xx]{1,2}$/.test(item.str?.trim())&&item.transform);
  if(digits.length<8)return false;
  const [a,b,c,d]=viewport.transform;
  const rotated=digits.filter(item=>{
    const [x,y]=item.transform,dx=a*x+c*y,dy=b*x+d*y;
    return dx<=0||Math.abs(dy)>Math.abs(dx)*.15;
  });
  return rotated.length/digits.length>=.8;
}
export function projectPdfText(content,viewport){
  const widths=new Map();
  for(const i of content.items)if(/^\d$/.test(i.str)&&i.height>0){const values=widths.get(i.fontName)??[];values.push(i.width/i.height);widths.set(i.fontName,values);}
  const ratios=new Map([...widths].map(([font,values])=>[font,values.sort((a,b)=>a-b)[Math.floor(values.length/2)]]));
  return separateHarmonicText(content.items).flatMap(item=>{
    const text=item.str?.trim();
    const harmonicMatch=text?.match(/^(?:<(\d{1,2})>|\(<(\d{1,2})>\))$/),harmonic=harmonicMatch&&(harmonicMatch[1]??harmonicMatch[2]);
    if(!text||!harmonic&&!/^[0-9Xx ]+$/.test(item.str)||!item.transform||Math.abs(item.transform[1])+Math.abs(item.transform[2])>.01)return [];
    const [x,baseline]=viewport.convertToViewportPoint(item.transform[4],item.transform[5]);
    const height=Math.abs(item.transform[3])*viewport.scale,width=item.width*viewport.scale;
    const make=(text,x,width)=>({text:normalizeFretText(text),x,y:baseline-height*.74,width,height:height*.74,cx:x+width/2,cy:baseline-height*.37,fontSize:height,font:item.fontName});
    if(harmonic){
      const digitWidth=height*(ratios.get(item.fontName)??.56)*harmonic.length;
      if(width<digitWidth+height*.4||width>height*text.length)return [];
      return [{...make(harmonic,x+(width-digitWidth)/2,digitWidth),harmonic:true}];
    }
    if(item.str.includes(' ')){
      const ratio=ratios.get(item.fontName),digits=item.str.replaceAll(' ',''),spaces=item.str.length-digits.length;
      if(!ratio||!/^[0-9Xx]{1,2}(?: +[0-9Xx]{1,2})*$/.test(text))return [];
      const digitWidth=height*ratio,gap=(width-digits.length*digitWidth)/spaces;
      // PDF.js sometimes appends positioning whitespace to a single numeral.
      // Its width is not part of the fret (and may exceed a normal word space).
      if(/^[0-9Xx]{1,2}$/.test(text)&&gap>=0){
        const leading=item.str.length-item.str.trimStart().length;
        return [make(text,x+leading*gap,digitWidth*text.length)];
      }
      if(gap<0||gap>height*.5)return [];
      let at=x;return item.str.match(/ +|[0-9Xx]+/g).flatMap(token=>{const pos=at,isSpace=token[0]===' ',w=token.length*(isSpace?gap:digitWidth);at+=w;return isSpace?[]:[make(token,pos,w)];});
    }
    if(text.length>2)return [];
    // Widely separated adjacent notes must not become one two-digit fret.
    if(width>height*.78*text.length||width<height*.22*text.length)return [];
    return [make(text,x,width)];
  });
}

export function textFretsForStaff(glyphs,staff){
  const g=staff.spacing;
  const frets=glyphs.flatMap(glyph=>{
    if(!isFretText(glyph.text)||glyph.cx<staff.x+g||glyph.cx>staff.x+staff.width-g*.2||glyph.fontSize<g*.65||glyph.fontSize>g*1.45)return [];
    const string=staff.lines.reduce((best,y,i)=>Math.abs(glyph.cy-y)<Math.abs(glyph.cy-staff.lines[best])?i:best,0)+1;
    const stringDistance=Math.abs(glyph.cy-staff.lines[string-1])/g;
    if(stringDistance>.23)return [];
    return [{...glyph,string,stringDistance,parts:glyph.text.length,ocr:{text:glyph.text,confidence:1,agrees:true,alternatives:[],method:'pdf-text-on-tab-line'}}];
  });
  // Some print drivers draw the same text twice a fraction of a pixel apart
  // to simulate bold. Collapse identical overprints, never differing digits.
  return frets.filter((f,i)=>!frets.slice(0,i).some(p=>p.text===f.text&&p.string===f.string&&Math.abs(p.cx-f.cx)<g*.08&&Math.abs(p.cy-f.cy)<g*.08));
}

export function attachPrintedTuplets(staff,glyphs){
 for(const measure of staff.measures){
  const slots=measure.rhythm,g=staff.spacing;
  for(let i=0;i<slots.length-2;i++)for(const count of [3,6]){
   const group=slots.slice(i,i+count),a=group[0],last=group.at(-1),direction=a.direction??1;
   if(group.length!==count||!['4','8','16','32'].includes(a.duration)||group.some(s=>s.duration!==a.duration||s.tuplet||(s.direction??1)!==direction))continue;
   const gaps=group.slice(1).map((s,j)=>s.x-group[j].x);
   if(Math.max(...gaps)-Math.min(...gaps)>g*.6)continue;
   const edge=direction===1?Math.max(...group.map(s=>s.y)):Math.min(...group.map(s=>s.y));
   const label=glyphs.find(t=>t.text===String(count)&&Math.abs(t.cx-(a.x+last.x)/2)<g*.65&&direction*(t.cy-edge)>g*.3&&direction*(t.cy-edge)<g*2);
   if(!label)continue;
   const tuplet={actualNotes:count,normalNotes:count===6?4:2,groupId:`pdf-${staff.id}-${measure.index}-${i}`};
   group.forEach(s=>{s.tuplet=tuplet;});i+=count-1;break;
  }
 }
}
