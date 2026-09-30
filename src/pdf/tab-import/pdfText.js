// Digital PDFs already contain exact characters. Keep their real positions;
// never OCR a title/chord chart or infer a number from an entire page of text.
export function projectPdfText(content,viewport){
  const widths=new Map();
  for(const i of content.items)if(/^\d$/.test(i.str)&&i.height>0){const values=widths.get(i.fontName)??[];values.push(i.width/i.height);widths.set(i.fontName,values);}
  const ratios=new Map([...widths].map(([font,values])=>[font,values.sort((a,b)=>a-b)[Math.floor(values.length/2)]]));
  return content.items.flatMap(item=>{
    const text=item.str?.trim();
    if(!text||!/^[0-9 ]+$/.test(item.str)||!item.transform||Math.abs(item.transform[1])+Math.abs(item.transform[2])>.01)return [];
    const [x,baseline]=viewport.convertToViewportPoint(item.transform[4],item.transform[5]);
    const height=Math.abs(item.transform[3])*viewport.scale,width=item.width*viewport.scale;
    const make=(text,x,width)=>({text,x,y:baseline-height*.74,width,height:height*.74,cx:x+width/2,cy:baseline-height*.37,fontSize:height,font:item.fontName});
    if(item.str.includes(' ')){
      const ratio=ratios.get(item.fontName),digits=item.str.replaceAll(' ',''),spaces=item.str.length-digits.length;
      if(!ratio||!/^\d(?: +\d)*$/.test(text))return [];
      const digitWidth=height*ratio,gap=(width-digits.length*digitWidth)/spaces;
      if(gap<0||gap>height*.5)return [];
      let at=x;return [...item.str].flatMap(char=>{const pos=at;at+=char===' '?gap:digitWidth;return char===' '?[]:[make(char,pos,digitWidth)];});
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
    if(Number(glyph.text)>24||glyph.cx<staff.x+g||glyph.cx>staff.x+staff.width-g*.2||glyph.fontSize<g*.65||glyph.fontSize>g*1.45)return [];
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
    const slots=measure.rhythm;
    for(let i=0;i<slots.length-2;i++){
      const group=slots.slice(i,i+3),a=group[0],b=group[1],c=group[2],g=staff.spacing;
      if(!['8','16'].includes(a.duration)||group.some(s=>s.duration!==a.duration||s.tuplet)||Math.abs((b.x-a.x)-(c.x-b.x))>g*.3)continue;
      const label=glyphs.find(t=>t.text==='3'&&Math.abs(t.cx-(a.x+c.x)/2)<g*.65&&t.cy>Math.max(...group.map(s=>s.y))+g*.3&&t.cy<Math.max(...group.map(s=>s.y))+g*2);
      if(!label)continue;
      const tuplet={actualNotes:3,normalNotes:2,groupId:`pdf-${staff.id}-${measure.index}-${i}`};
      group.forEach(s=>{s.tuplet=tuplet;});i+=2;
    }
  }
}
