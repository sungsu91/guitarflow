export function drawChordDiagram(svg, shape, name, x, y) {
  const ns='http://www.w3.org/2000/svg';
  const group=document.createElementNS(ns,'g');
  group.setAttribute('class','etudeChordDiagram');
  group.setAttribute('role','img');
  group.setAttribute('aria-label',`${name}, 6번줄부터 ${shape.frets.map(f=>f===null?'뮤트':f+'프렛').join(', ')}`);
  const add=(tag,attrs,text)=>{const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;group.append(node);return node;};
  const positive=shape.frets.filter(f=>f>0);
  const base=shape.frets.includes(0)?1:Math.max(1,Math.min(...positive));
  const gx=x+27, gy=y+34, gap=12, step=14;
  const text=(tx,ty,label,size=14)=>add('text',{x:tx,y:ty,'text-anchor':'middle',fill:'#111',style:`font:600 ${size}px Arial,sans-serif`},label);
  text(gx+30,y+12,name,17);
  for(let i=0;i<6;i++)add('line',{x1:gx+i*gap,x2:gx+i*gap,y1:gy,y2:gy+4*step,stroke:'#333','stroke-width':1});
  for(let i=0;i<=4;i++)add('line',{x1:gx,x2:gx+5*gap,y1:gy+i*step,y2:gy+i*step,stroke:'#333','stroke-width':i===0&&base===1?3:1});
  if(base>1)text(gx-15,gy+10,`${base}`,12);
  if(shape.barre) {
    const b=shape.barre;
    add('line',{x1:gx+(6-b.from)*gap,x2:gx+(6-b.to)*gap,y1:gy+(b.fret-base+.5)*step,y2:gy+(b.fret-base+.5)*step,stroke:'#111','stroke-width':7,'stroke-linecap':'round'});
  }
  shape.frets.forEach((f,i)=>{
    if(f===null||f===0){text(gx+i*gap,gy-6,f===null?'×':'○',12);return;}
    const cy=gy+(f-base+.5)*step;
    add('circle',{cx:gx+i*gap,cy,r:4.3,fill:'#111'});
    if(shape.fingers?.[i])text(gx+i*gap,gy+4*step+14,String(shape.fingers[i]),10);
  });
  svg.append(group);
}
