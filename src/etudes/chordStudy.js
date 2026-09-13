export function drawChordDiagram(svg, shape, name, x, y) {
  const ns='http://www.w3.org/2000/svg';
  const group=document.createElementNS(ns,'g');
  group.setAttribute('class','etudeChordDiagram');
  group.setAttribute('role','img');
  group.setAttribute('aria-label',`${name}, 위에서 1번줄부터 ${[...shape.frets].reverse().map(f=>f===null?'뮤트':f+'프렛').join(', ')}`);
  const add=(tag,attrs,text)=>{const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;group.append(node);return node;};
  const positive=shape.frets.filter(f=>f>0);
  const base=shape.frets.includes(0)||!positive.length?1:Math.max(1,Math.min(...positive));
  const columns=Math.max(4,Math.max(0,...positive)-base+1);
  const gx=x+34, gy=y+32, gap=12, step=72/columns;
  const text=(tx,ty,label,size=12,fill='#111',attrs={})=>add('text',{x:tx,y:ty,'text-anchor':'middle',fill,style:`font:600 ${size}px Arial,sans-serif`,...attrs},label);
  text(gx+36,y+12,name,17);
  // Left-rotated chord box: high E (string 1) at the top; frets increase rightward.
  for(let row=0;row<6;row++) {
    const cy=gy+row*gap;
    add('line',{x1:gx,x2:gx+72,y1:cy,y2:cy,stroke:'#333','stroke-width':1,'data-string':row+1});
    text(gx-27,cy+4,String(row+1),11,'#444',{'class':'etudeChordStringLabel','data-string':row+1});
  }
  for(let i=0;i<=columns;i++)add('line',{x1:gx+i*step,x2:gx+i*step,y1:gy,y2:gy+5*gap,stroke:'#333','stroke-width':i===0&&base===1?3:1});
  text(gx+step/2,gy+5*gap+16,`${base}fr`,11);
  if(shape.barre) {
    const b=shape.barre, bx=gx+(b.fret-base+.5)*step;
    add('line',{x1:bx,x2:bx,y1:gy+(b.from-1)*gap,y2:gy+(b.to-1)*gap,stroke:'#111','stroke-width':7,'stroke-linecap':'round','class':'etudeChordBarre'});
  }
  shape.frets.forEach((f,i)=>{
    const string=6-i, cy=gy+(string-1)*gap;
    if(f===null||f===0){text(gx-12,cy+4,f===null?'×':'○',12);return;}
    const cx=gx+(f-base+.5)*step;
    add('circle',{cx,cy,r:5.4,fill:'#111','data-string':string,'data-fret':f});
    if(shape.fingers?.[i])text(cx,cy+3,String(shape.fingers[i]),8,'white');
  });
  svg.append(group);
}
