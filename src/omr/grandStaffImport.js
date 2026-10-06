import {ticksOf} from '../etudes/scoreModel.js';
import {meterTicks} from '../etudes/scoreMeters.js';
import {parseStaffTokens} from './staffTokens.js';
import {cropStaffMeasure} from './staffMeasureRecognition.js';

const timed=events=>{let onset=0;return events.map(e=>{const at=onset;onset+=e.duration?ticksOf(e):0;return {...e,onset:at};});};
const fail=()=>{throw Error('피아노의 높은음·낮은음 오선과 마디 경계를 같은 쌍으로 확인하지 못했습니다. Grand Staff가 모두 보이는 원본을 사용해 주세요. 양손을 별도 마디로 합치지 않았습니다.');};

const readingShape=r=>JSON.stringify([r.clef,r.measures.map(b=>[b.key,b.meter,b.events.map(e=>[e.rest,!!e.rhythmSlash,e.duration,!!e.dotted,e.tuplet,e.notes.map(n=>n.midi)])])]);
export function selectGrandStaffReading(readings,clef,barCount){
  const candidates=readings.filter(r=>r.clef===clef&&r.measures.length===barCount&&r.measures.every(b=>b.events.length&&b.events.every(e=>e.duration&&!e.unread)&&b.events.reduce((sum,e)=>sum+ticksOf(e),0)===meterTicks(b.meter)));
  return candidates.find((r,i)=>candidates.slice(i+1).some(other=>readingShape(r)===readingShape(other)))??null;
}

// A tightly cropped bass staff can be read as treble or with a false key.
// Reuse the existing bounded crop operation, retaining every printed bar.
// Accept a replacement only when two different margins agree; never infer
// pitches from the other hand or force a key to make the pair fit.
export async function refineGrandStaffReading(omr,system,parsed,clef,{signal}={}){
  if(!system.measures?.length)return parsed;
  const first=system.measures[0],last=system.measures.at(-1);
  const whole={...system,measures:[{...first,width:last.x+last.width-first.x}]},readings=[];
  for(const padding of [.5,2]){
    signal?.throwIfAborted();
    const result=await omr.recognize(cropStaffMeasure(whole,0,padding));
    signal?.throwIfAborted();
    readings.push(parseStaffTokens(result.text,{meter:parsed.meter,key:parsed.key}));
  }
  const chosen=selectGrandStaffReading(readings,clef,system.measures.length);
  const retry={accepted:Boolean(chosen),raw:readings.map(r=>r.raw)};
  // Keep existing ink anchors, ties and rhythm refinements when the new
  // readings merely corroborate the current musical content.
  return {...(chosen&&readingShape(chosen)!==readingShape(parsed)?chosen:parsed),grandStaffRetry:retry};
}

// Pair only explicitly requested Grand Staff input. Both clefs, printed bar
// boundaries and parsed bar counts must agree; proximity alone is not enough.
export function groupGrandStaffReadings(readings,{instrument='piano'}={}){
  if(!readings.length||readings.length%2)fail();
  const rows=[];
  for(let i=0;i<readings.length;i+=2){
    const upper=readings[i],lower=readings[i+1],a=upper.system,b=lower.system;
    const g=Math.max(a.staff.spacing,b.staff.spacing),boxes=a.measures??[],other=b.measures??[];
    if(upper.parsed.clef!=='clef-G2'||lower.parsed.clef!=='clef-F4'||b.staff.y<=a.staff.y+a.staff.height||b.staff.y-a.staff.y-a.staff.height>g*24||
      !boxes.length||boxes.length!==other.length||boxes.length!==upper.parsed.measures.length||boxes.length!==lower.parsed.measures.length||
      boxes.some((box,j)=>Math.abs(box.x-other[j].x)>g*1.2||Math.abs(box.x+box.width-other[j].x-other[j].width)>g*1.2))fail();
    const measures=upper.parsed.measures.map((bar,j)=>{
      const left=lower.parsed.measures[j];
      if(bar.key!==left.key||bar.meter.join('/')!==left.meter.join('/'))fail();
      const rightEvents=timed(bar.events),leftEvents=timed(left.events);
      if(instrument!=='piano'){
        // A single TAB voice cannot represent independently sustained hands.
        // Refuse that conversion rather than shorten notes or lose a voice.
        if(rightEvents.length!==leftEvents.length||rightEvents.some((e,k)=>!e.duration||!leftEvents[k].duration||e.onset!==leftEvents[k].onset||ticksOf(e)!==ticksOf(leftEvents[k])))
          throw Error('양손의 리듬이 달라 현재 TAB으로 합칠 수 없습니다. 피아노 오선보로 불러온 뒤 재배치해 주세요.');
        return {...bar,events:rightEvents.map((e,k)=>{
          const notes=[...e.notes,...leftEvents[k].notes].filter((n,k,all)=>all.findIndex(p=>p.midi===n.midi)===k);
          return {...e,notes,rest:e.rest&&leftEvents[k].rest,unread:e.unread||leftEvents[k].unread};
        })};
      }
      return {...bar,positioned:Boolean(bar.positioned||left.positioned),events:[...rightEvents.map(e=>({...e,voice:'right',sourceStaff:a.id})),...leftEvents.map(e=>({...e,voice:'left',sourceStaff:b.id}))].sort((x,y)=>x.onset-y.onset||(x.voice==='right'?-1:1))};
    });
    rows.push({system:{...a,rect:{...a.rect,height:b.rect.y+b.rect.height-a.rect.y},measures:boxes.map((box,j)=>({...box,height:other[j].y+other[j].height-box.y}))},
      parsed:{...upper.parsed,clef:'grand-G2-F4',measures,warnings:[...upper.parsed.warnings,...lower.parsed.warnings],parts:[upper.parsed,lower.parsed]}});
  }
  return rows;
}
