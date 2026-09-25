import {BEAT_PRESETS,BEATS,clone,createPattern,repairTies,validPattern} from './model.js';
import {tuplet} from './rhythmMath.js';

export const PACK_FAMILIES=[['basic','기본 박·8분','Pulse & eighths'],['sixteenth','16분 조합','Sixteenths'],['rests','쉼표·엇박','Rests & offbeats'],['dotted','점음표','Dotted rhythms'],['ties','이음줄','Ties'],['triplet','3잇단','Triplets'],['quintuplet','5잇단','Quintuplets'],['sextuplet','6잇단','Sextuplets'],['septuplet','7잇단','Septuplets'],['mixed','혼합 리듬','Mixed rhythms']];
export const LEVELS=[['easy','초급','Beginner'],['medium','중급','Intermediate'],['hard','고급','Advanced']];
const cell = (...values)=>values.map(v=>({ticks:Math.abs(v),rest:v<0}));
const b = i=>clone(BEATS[i]);
const referenceIds={'eighth-sixteenths':'reference-eighth-sixteenths'};
const entries=BEAT_PRESETS.filter(p=>p.id!=='quarter-rest').map(p=>({
  id:p.id,ko:p.ko,en:p.en,family:p.group,core:[clone(p.beat)],
  level:p.group==='basic'||['eighth-rest','rest-eighth'].includes(p.id)?'easy':p.group==='triplet'?'hard':'medium',
  reference:referenceIds[p.id]
}));
function add(id,ko,en,family,core,level='hard',reference){entries.push({id,ko,en,family,core,level,reference});}
add('rest-three-sixteenths','16분쉼표 뒤 세 음','Three sixteenths after a rest','rests',[cell(-3,3,3,3)],'medium','reference-rest-three');
add('sixteenth-rest-center','네 칸 중 두 번째 쉼','Second sixteenth silent','rests',[cell(3,-3,3,3)],'medium');
add('sixteenth-rest-third','네 칸 중 세 번째 쉼','Third sixteenth silent','rests',[cell(3,3,-3,3)],'medium');
add('sixteenth-rest-end','네 칸 중 마지막 쉼','Last sixteenth silent','rests',[cell(3,3,3,-3)],'medium');
add('eighth-triplet-tail','8분 뒤 촘촘한 셋잇단','Eighth + triplet sixteenths','triplet',[[...cell(6),...tuplet(3,[],true)]],'hard','reference-triplet-tail');
add('triplet-eighth-tail','촘촘한 셋잇단 뒤 8분','Triplet sixteenths + eighth','triplet',[[...tuplet(3,[],true),...cell(6)]]);
add('paired-sixteenth-rest','8·16·16 → 쉼·16·8','Eighth pair → displaced rest','mixed',[b(3),b(11)],'medium','reference-paired');
for(const [count,family,name] of [[5,'quintuplet','5잇단'],[6,'sextuplet','6잇단'],[7,'septuplet','7잇단']]){
  add(`${count}-even`,`${name} · 균등 분할`,`${count}-tuplet · even subdivision`,family,[tuplet(count)],'hard',count===6?'reference-six':count===7?'reference-seven':undefined);
  for(const [position,index,english] of [['앞',0,'leading'],['중간',Math.floor(count/2),'middle'],['뒤',count-1,'trailing']])
    add(`${count}-rest-${index}`,`${name} · ${position} 쉼표`,`${count}-tuplet · ${english} rest`,family,[tuplet(count,[index])]);
  add(`${count}-alternating`,`${name} · 교대 쉼표`,`${count}-tuplet · alternating rests`,family,[tuplet(count,Array.from({length:count},(_,i)=>i).filter(i=>i%2===1))]);
  add(`${count}-contrast`,`${name}과 점8분 전환`,`${count}-tuplet / dotted eighth contrast`,'mixed',[tuplet(count),b(17)]);
}
const tiedCore=[b(9),b(2)];tiedCore[0].at(-1).tie=true;
add('offbeat-tie','엇박에서 다음 박까지','Offbeat across the beat','ties',tiedCore);
const dottedTie=[b(18),b(3)];dottedTie[0].at(-1).tie=true;
add('dotted-tie','짧은 시작·긴 이음줄','Short attack, long tie','ties',dottedTie);
add('mixed-bar','한 마디 · 음가 바꾸기','One-bar changing subdivisions','mixed',[b(3),b(10),b(17),b(6)]);
add('tuplet-ladder','한 마디 · 3·5·6·7 전환','One-bar 3 / 5 / 6 / 7','mixed',[tuplet(3),tuplet(5),tuplet(6),tuplet(7)]);

// Each score is a lesson: expose → repeat with space → displace → change context.
// The immutable core is quoted verbatim, instead of filling bars with random cells.
function lesson(core,level) {
  const context=level==='easy'?[b(0),b(2),b(1),b(5)]:[b(0),b(2),b(9),b(3),b(17),b(1),b(10),b(level==='hard'?6:8)];
  const rows=[];const stages=[];
  const append=(row,stage)=>{if(!rows.some(r=>JSON.stringify(r)===JSON.stringify(row))){rows.push(clone(row));stages.push(stage);}};
  if(core.length===4){
    append(core,'introduce');
    for(let i=1;i<=3;i++)append([...core.slice(i),...core.slice(0,i)],'position');
    for(let i=0;i<4;i++){const row=clone(core);row[i]=b(i%2?9:1);append(row,'rests');}
  }else{
    const place=(start,fill)=>{const row=clone(fill);row.splice(start,core.length,...clone(core));return row;};
    append(place(0,[b(0),b(0),b(0),b(0)]),'introduce');
    append(core.length===1?[core[0],b(1),core[0],b(0)]:[...core,...core],'repeat');
    for(let start=1;start<=4-core.length;start++)append(place(start,[b(0),b(1),b(2),b(0)]),'position');
    for(let i=0;i<4;i++)append(place(i%(5-core.length),Array.from({length:4},(_,j)=>context[(i+j+1)%context.length])),'context');
  }
  return {rows,stages};
}
export function builtinPacks(language='ko') {
  return entries.map(entry=>{
    const {rows,stages}=lesson(entry.core,entry.level);
    const p={...createPattern(),id:`pack-${entry.id}`,source:'builtin',title:language==='ko'?entry.ko:entry.en,
      family:entry.family,difficulty:entry.level,bpm:entry.level==='easy'?80:entry.level==='medium'?72:60,
      core:clone(entry.core),measures:rows,stages,reference:entry.reference};
    // The closing application carries the same offbeat across a barline as well.
    if(entry.family==='ties'){
      const last=p.measures.length-2;p.measures[last][3]=clone(entry.core[0]);
      p.measures[last][3].at(-1).tie=true;p.measures[last+1][0]=clone(entry.core[1]);
      p.stages[last]='cross-bar';p.stages[last+1]='cross-bar';
    }
    const result=repairTies(p);
    if(!validPattern(result))throw Error(`Invalid built-in pack: ${entry.id}`);
    return result;
  });
}
export function copyPack(pattern) {
  const copied={...clone(pattern),id:crypto.randomUUID(),source:'user',copiedFrom:pattern.id};
  delete copied.reference;return copied;
}
export function blankPack(meter=4) {
  return {...createPattern(meter),source:'user',core:[cell(-12)],difficulty:'medium',family:'mixed'};
}
export const STAGES={introduce:['패턴 익히기','Learn the core'],repeat:['간격을 두고 반복','Spaced repetition'],position:['위치 바꾸기','Move the pattern'],context:['주변 리듬 바꾸기','Change the context'],rests:['쉼표로 변형','Rest variation'],'cross-bar':['마디를 가로지르는 이음줄','Tie across the barline']};
