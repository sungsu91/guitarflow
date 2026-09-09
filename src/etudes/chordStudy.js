// Frets are stored from string 6 to string 1, matching a chord-box diagram.
// Closed shapes allow the same exercise to transpose without a hidden capo.
const shapes = [
  {frets:[8,10,10,9,8,8], fingers:[1,3,4,2,1,1], barre:{fret:8,from:6,to:1}},
  {frets:[null,12,14,14,13,12], fingers:[null,1,3,4,2,1], barre:{fret:12,from:5,to:1}},
  {frets:[null,8,10,10,10,8], fingers:[null,1,3,3,3,1], barre:{fret:8,from:5,to:1}},
  {frets:[null,10,12,12,12,10], fingers:[null,1,3,3,3,1], barre:{fret:10,from:5,to:1}},
];
const progression=[0,1,2,3,0,1,3,0];
const positions=[];
const patterns=progression.map((chord,bar)=>{
  const grip=shapes[chord];
  const bass=grip.frets[0]===null?5:6;
  const strings=bar<4?[bass,4,3,2,1,2,3,bass]:[bass,3,2,1,2,3,4,bass];
  return strings.map(string=>{positions.push([string,grip.frets[6-string]]);return positions.length-1;});
});

export const CHORD_STUDY = {
  id:'chord-accompaniment',level:'중급',style:'발라드',type:'코드 아르페지오',
  name:'코드 잡고 줄 나누어 뜯기',english:'Chord Shape Fingerpicking',bpm:60,
  family:'major',shape:positions,patterns,complete:true,
  accompaniment:true,chordShapes:progression.map(i=>shapes[i]),
  harmony:[[0,''],[5,'m'],[3,''],[4,''],[0,''],[5,'m'],[4,''],[0,'']],
  difficultyReason:'중급 · 바레 코드 모양을 유지하며 베이스와 높은 줄을 분리하고 코드 전환을 연결합니다.',
  purpose:'코드표의 모양을 잡은 채 TAB 순서대로 줄을 뜯습니다. 먼저 뜯은 음은 다음 음과 자연스럽게 겹쳐 울리게 하세요.',
};

export function drawChordDiagram(svg, shape, name, x, y) {
  const ns='http://www.w3.org/2000/svg';
  const group=document.createElementNS(ns,'g');
  group.setAttribute('class','etudeChordDiagram');
  group.setAttribute('role','img');
  group.setAttribute('aria-label',`${name}, 6번줄부터 ${shape.frets.map(f=>f===null?'뮤트':f+'프렛').join(', ')}`);
  const add=(tag,attrs,text)=>{const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;group.append(node);return node;};
  const positive=shape.frets.filter(f=>f>0);
  const base=Math.max(1,Math.min(...positive));
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
