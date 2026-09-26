import {validateBeat,units,tuplet,tupletGroups} from './rhythmMath.js';
import {TIME_SIGNATURES,meterInfo,beatTicks} from './meter.js';
export const STORAGE_KEY = 'rifflab-rhythm-trainer-v1';
export const note = (ticks, rest = false) => ({ ticks, rest });
export const clone = value => JSON.parse(JSON.stringify(value));
const makeBeat = values => values.map(value => note(Math.abs(value), value < 0));
// Preserve the original seven entries and their indices for existing examples.
const definitions = [
  ['quarter','basic','4분음표','Quarter note',[12]],
  ['quarter-rest','basic','4분쉼표','Quarter rest',[-12]],
  ['eighths','basic','8분 + 8분','Two eighths',[6,6]],
  ['eighth-sixteenths','sixteenth','8분 + 16분 + 16분','Eighth + two sixteenths',[6,3,3]],
  ['sixteenths','sixteenth','16분 × 4','Four sixteenths',[3,3,3,3]],
  ['eighth-rest','rests','8분 + 8분쉼표','Eighth + eighth rest',[6,-6]],
  ['triplets','triplet','셋잇단음표 × 3','Three triplet eighths',[4,4,4]],
  ['sixteenth-eighth-sixteenth','sixteenth','16분 + 8분 + 16분','Sixteenth + eighth + sixteenth',[3,6,3]],
  ['sixteenths-eighth','sixteenth','16분 + 16분 + 8분','Two sixteenths + eighth',[3,3,6]],
  ['rest-eighth','rests','8분쉼표 + 8분','Eighth rest + eighth',[-6,6]],
  ['eighth-rest-sixteenth','rests','8분 + 16분쉼표 + 16분','Eighth + sixteenth rest + sixteenth',[6,-3,3]],
  ['rest-sixteenth-eighth','rests','16분쉼표 + 16분 + 8분','Sixteenth rest + sixteenth + eighth',[-3,3,6]],
  ['sixteenth-rest-eighth','rests','16분 + 16분쉼표 + 8분','Sixteenth + sixteenth rest + eighth',[3,-3,6]],
  ['eighth-sixteenth-rest','rests','8분 + 16분 + 16분쉼표','Eighth + sixteenth + sixteenth rest',[6,3,-3]],
  ['rest-two-sixteenths','rests','8분쉼표 + 16분 + 16분','Eighth rest + two sixteenths',[-6,3,3]],
  ['offbeat-sixteenths','rests','16분쉼표 + 16분 + 16분쉼표 + 16분','Alternating sixteenth rests and notes',[-3,3,-3,3]],
  ['two-sixteenths-rest','rests','16분 + 16분 + 8분쉼표','Two sixteenths + eighth rest',[3,3,-6]],
  ['dotted-eighth','dotted','점8분 + 16분','Dotted eighth + sixteenth',[9,3]],
  ['sixteenth-dotted','dotted','16분 + 점8분','Sixteenth + dotted eighth',[3,9]],
  ['dotted-rest','dotted','점8분쉼표 + 16분','Dotted eighth rest + sixteenth',[-9,3]],
  ['dotted-eighth-rest','dotted','점8분 + 16분쉼표','Dotted eighth + sixteenth rest',[9,-3]],
  ['triplet-rest-first','triplet','셋잇단 · 쉼 / 음 / 음','Triplet · rest / note / note',[-4,4,4]],
  ['triplet-rest-middle','triplet','셋잇단 · 음 / 쉼 / 음','Triplet · note / rest / note',[4,-4,4]],
  ['triplet-rest-last','triplet','셋잇단 · 음 / 음 / 쉼','Triplet · note / note / rest',[4,4,-4]],
  ['triplet-rest-two','triplet','셋잇단 · 쉼 / 쉼 / 음','Triplet · rest / rest / note',[-4,-4,4]],
  ['triplet-rest-edges','triplet','셋잇단 · 쉼 / 음 / 쉼','Triplet · rest / note / rest',[-4,4,-4]],
  ['triplet-note-first','triplet','셋잇단 · 음 / 쉼 / 쉼','Triplet · note / rest / rest',[4,-4,-4]],
];
export const BEAT_PRESETS = definitions.map(([id,group,ko,en,values])=>({id,group,ko,en,beat:makeBeat(values)}));
export const BEATS = BEAT_PRESETS.map(p=>p.beat);
export const PRESET_GROUPS = [['basic','기본','Basic'],['sixteenth','16분 조합','Sixteenths'],['rests','쉼표','Rests'],['dotted','점음표','Dotted'],['triplet','셋잇단음표','Triplets']];
export const emptyMeasure = meter => Array.from({length:meterInfo(meter).beats}, () => [note(beatTicks(meter),true)]);
export function createPattern(meter=4) { const info=meterInfo(meter);return {id:crypto.randomUUID(),title:'',meter:info.beats,meterDenominator:info.denominator,measures:Array.from({length:5},()=>emptyMeasure(meter)),bpm:80,tone:'wood',click:true,countIn:true,loop:true}; }
export function examplePattern() { const p=createPattern(); p.id='example'; p.measures=[[3,1,2,4],[2,3,0,1],[4,2,5,0],[3,2,4,1],[6,3,2,0]].map(row=>row.map(i=>clone(BEATS[i]))); return p; }
export const validBeat = beat => validateBeat(beat);
export function validPattern(p) {
  if(!p||!TIME_SIGNATURES.includes(meterInfo(p).signature))return false;
  const validCell=b=>validateBeat(b,beatTicks(p));
  if(p?.measureRepeats!==undefined&&(!Array.isArray(p.measureRepeats)||p.measureRepeats.length!==p.measures?.length||!p.measureRepeats.every(v=>typeof v==='boolean')))return false;
  if(!(typeof p.id==='string' && typeof p.title==='string' && [2,3,4].includes(p.meter) && Number.isFinite(p.bpm) && p.bpm>=30 && p.bpm<=240 && ['wood','rim','clap'].includes(p.tone) && ['click','countIn','loop'].every(k=>typeof p[k]==='boolean') && Array.isArray(p.measures) && p.measures.length>0 && p.measures.length<=128 && p.measures.every(m=>Array.isArray(m)&&m.length===p.meter&&m.every(validCell))))return false;
  if(p.core!==undefined&&(!Array.isArray(p.core)||![1,2,p.meter].includes(p.core.length)||!p.core.every(validCell)||!p.core.every((b,i)=>b.every((n,j)=>!n.tie||(!n.rest&&j===b.length-1&&p.core[i+1]&&!p.core[i+1][0].rest)))))return false;
  const beats=p.measures.flat();
  return beats.every((b,i)=>b.every((n,j)=>!n.tie||(!n.rest&&j===b.length-1&&beats[i+1]&&!beats[i+1][0].rest)));
}
// Editing either side of a tie must never leave a tie to a rest or outside the piece.
export function repairTies(pattern) {
  const p=clone(pattern);const beats=p.measures.flat();
  beats.forEach((b,i)=>b.forEach((n,j)=>{if(n.tie&&(n.rest||j!==b.length-1||!beats[i+1]||beats[i+1][0].rest))delete n.tie;}));return p;
}
export function replacePatternBeat(pattern,measure,beat,value) {
  const p=clone(pattern);p.measures[measure][beat]=clone(value);return repairTies(p);
}
// Meter edits affect the edit draft only. Preserve fitting notes, pad with rests,
// and never leave a partial tuplet at a shortened beat boundary.
export function changePatternMeter(pattern,signature) {
  if(!TIME_SIGNATURES.includes(signature))throw Error('Unsupported time signature');
  const info=meterInfo(signature);
  const fit=beat=>{
    if(!beat)return [note(info.beatTicks,true)];
    if(validateBeat(beat,info.beatTicks))return clone(beat);
    if(beat.every(n=>n.rest))return [note(info.beatTicks,true)];
    const source=clone(beat),result=[];let remaining=info.beatTicks*35;
    // Upgrade legacy triplets before adding another eighth to a compound beat.
    if(source.every(n=>n.ticks===4&&!n.tuplet))source.forEach(n=>{n.written=6;n.tuplet={count:3,normal:2,group:0};});
    const groups=tupletGroups(source);
    for(let i=0;i<source.length&&remaining>0;i++){
      const group=groups.find(g=>g.start===i);
      if(group){const notes=source.slice(group.start,group.end+1),length=notes.reduce((sum,n)=>sum+units(n),0);if(length>remaining)break;result.push(...notes);remaining-=length;i=group.end;continue;}
      const n=source[i],length=Math.min(units(n),remaining);
      if(![3,6,9,12,18].includes(length/35))break;
      result.push({...n,ticks:length/35});remaining-=length;
    }
    for(const duration of [18,12,9,6,3])while(remaining>=duration*35){result.push(note(duration,true));remaining-=duration*35;}
    return result;
  };
  const next={...clone(pattern),meter:info.beats,meterDenominator:info.denominator,measures:pattern.measures.map(row=>Array.from({length:info.beats},(_,i)=>fit(row[i])))};
  if(pattern.core){const length=pattern.core.length===pattern.meter?info.beats:Math.min(pattern.core.length,info.beats);const core=Array.from({length},(_,i)=>fit(pattern.core[i]));next.core=repairTies({measures:[core]}).measures[0];}
  return repairTies(next);
}

export function beatTuplet(count,meter=4,rests=[]) {
  if(!meterInfo(meter).compound)return tuplet(count,rests);
  if(count===3)return [...tuplet(3,rests),note(6)];
  return Array.from({length:count},(_,i)=>({ticks:18/count,written:6,rest:rests.includes(i),tuplet:{count,normal:3,group:0}}));
}
const compoundDefinitions=[
 ['compound-quarter','basic','점4분음표','Dotted quarter',[18]],
 ['compound-quarter-rest','basic','점4분쉼표','Dotted quarter rest',[-18]],
 ['compound-eighths','basic','8분 × 3','Three eighths',[6,6,6]],
 ['compound-long-short','basic','4분 + 8분','Quarter + eighth',[12,6]],
 ['compound-short-long','basic','8분 + 4분','Eighth + quarter',[6,12]],
 ['compound-six','sixteenth','16분 × 6','Six sixteenths',[3,3,3,3,3,3]],
 ['compound-mix','sixteenth','8분 + 16분 + 16분 + 8분','Eighth + two sixteenths + eighth',[6,3,3,6]],
 ['compound-sixteenth-first','sixteenth','16분 + 16분 + 8분 + 8분','Two sixteenths + two eighths',[3,3,6,6]],
 ['compound-sixteenth-last','sixteenth','8분 + 8분 + 16분 + 16분','Two eighths + two sixteenths',[6,6,3,3]],
 ['compound-rest','rests','쉼 + 8분 + 8분','Rest + two eighths',[-6,6,6]],
 ['compound-mid-rest','rests','8분 + 쉼 + 8분','Eighth + rest + eighth',[6,-6,6]],
 ['compound-end-rest','rests','8분 + 8분 + 쉼','Two eighths + rest',[6,6,-6]],
 ['compound-dotted','dotted','점8분 + 16분 + 8분','Dotted eighth + sixteenth + eighth',[9,3,6]],
 ['compound-dotted-last','dotted','8분 + 점8분 + 16분','Eighth + dotted eighth + sixteenth',[6,9,3]],
 ['compound-dotted-pair','dotted','점8분 × 2','Two dotted eighths',[9,9]],
];
export const COMPOUND_PRESETS=[...compoundDefinitions.map(([id,group,ko,en,values])=>({id,group,ko,en,beat:makeBeat(values)})),
  {id:'compound-triplet',group:'triplet',ko:'4분 안 셋잇단 + 8분',en:'Quarter-note triplet + eighth',beat:beatTuplet(3,'6/8')},
  {id:'compound-triplet-last',group:'triplet',ko:'8분 + 4분 안 셋잇단',en:'Eighth + quarter-note triplet',beat:[note(6),...tuplet(3)]}];
export function beatPresets(meter=4){return meterInfo(meter).compound?COMPOUND_PRESETS:BEAT_PRESETS;}
const pools={easy:[0,2,5,9],medium:[0,1,2,3,4,5,7,8,9,10,11,12,13,14,15,16,17,18,19,20],hard:BEATS.map((_,i)=>i)};
function pickIndex(length,random){return Math.max(0,Math.min(length-1,Math.floor(random()*length)));}
function shuffled(values,random){const result=[...values];for(let i=result.length-1;i>0;i--){const j=pickIndex(i+1,random);[result[i],result[j]]=[result[j],result[i]];}return result;}
export function generateMeasures(meter,difficulty,count,random=Math.random) {
  const compound=meterInfo(meter).compound,beats=meterInfo(meter).beats,bank=beatPresets(meter).map(p=>p.beat);
  const available=compound?{easy:[0,2,3,4],medium:[0,2,3,4,6,7,8,9,10,11],hard:bank.map((_,i)=>i)}:pools;
  const level=available[difficulty]?difficulty:'medium';let bag=[];let previous=-1;let previousMeasure='';
  const take=()=>{if(!bag.length)bag=shuffled(available[level],random);if(bag.at(-1)===previous&&bag.length>1)[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];previous=bag.pop();return previous;};
  return Array.from({length:count},(_,mi)=>{
    const measure=Array.from({length:beats},()=>clone(bank[take()]));
    if(level==='easy'&&JSON.stringify(measure)===previousMeasure)measure.push(measure.shift());
    previousMeasure=JSON.stringify(measure);
    if(level==='hard'){
      // An offbeat attack crosses the next beat; continuation does not retrigger.
      const boundary=mi%(beats-1);measure[boundary]=clone(compound?bank[mi%2?12:9]:BEATS[mi%2?18:9]);
      if(measure[boundary+1][0].rest)measure[boundary+1][0].rest=false;
      measure[boundary].at(-1).tie=true;
    }
    return measure;
  });
}
export function randomMeasure(meter,difficulty,random=Math.random){return generateMeasures(meter,difficulty,1,random)[0];}
export function randomizeRange(pattern,start,end,difficulty,random=Math.random){
  const p=clone(pattern);let generated=generateMeasures(p,difficulty,end-start+1,random);
  if(meterInfo(p).compound){
    if(JSON.stringify(generated)===JSON.stringify(p.measures.slice(start,end+1))){const options=COMPOUND_PRESETS.filter(x=>['basic',...(difficulty==='easy'?[]:['sixteenth','rests'])].includes(x.group)&&(difficulty!=='easy'||x.beat.every(n=>!n.rest)));generated[0][0]=clone(options.find(x=>JSON.stringify(x.beat)!==JSON.stringify(generated[0][0])).beat);}
    p.measures.splice(start,generated.length,...generated);return repairTies(p);
  }
  if(JSON.stringify(generated)===JSON.stringify(p.measures.slice(start,end+1))){
    generated=generated.map(m=>m.map(b=>{const i=pools[difficulty].findIndex(index=>JSON.stringify(BEATS[index])===JSON.stringify(b));return clone(BEATS[pools[difficulty][(i+1)%pools[difficulty].length]]);}));
    if(difficulty==='hard')generated.forEach(m=>{m[0]=clone(BEATS[9]);m[1][0].rest=false;m[0].at(-1).tie=true;});
  }
  // In a two-beat hard bar, forced syncopation can consume both changed cells.
  // Keep the tie but choose a different audible subdivision for its target.
  if(JSON.stringify(generated)===JSON.stringify(p.measures.slice(start,end+1))){
    generated[0][1]=clone(JSON.stringify(generated[0][1])===JSON.stringify(BEATS[2])?BEATS[6]:BEATS[2]);
  }
  p.measures.splice(start,generated.length,...generated);return repairTies(p);
}
export function practicePatterns(language='ko') {
  const en=language==='en';const examples=[
    ['easy-bar','초급 · 8분 반복','Easy · steady eighths','easy',[[2,2,2,2]]],
    ['easy-four','초급 · 네 마디 기본기','Easy · four steady bars','easy',[[0,0,0,0],[2,2,2,2],[5,5,5,5],[2,2,2,2]]],
    ['medium-bar','중급 · 한 마디 리듬 읽기','Medium · changing beats','medium',[[7,10,17,14]]],
    ['medium-five','중급 · 쉼표와 점음표','Medium · rests and dotted notes','medium',[[3,9,7,17],[11,18,4,5],[19,8,10,0],[15,2,20,16],[7,13,18,9]]],
    ['hard-bar','고급 · 엇박과 이음줄','Advanced · syncopation and ties','hard',[[9,2,18,0]]],
    ['hard-five','고급 · 이음줄과 셋잇단음표','Advanced · ties and triplets','hard',[[9,2,21,18],[7,22,9,0],[18,2,24,3],[11,17,23,2],[9,6,7,0]]],
  ];
  return examples.map(([id,ko,english,difficulty,rows])=>{const p=createPattern();p.id=`practice-${id}`;p.title=en?english:ko;p.difficulty=difficulty;p.measures=rows.map(row=>row.map(i=>clone(BEATS[i])));
    if(difficulty==='hard'){p.measures[0][0].at(-1).tie=true;p.measures[0][2].at(-1).tie=true;if(p.measures.length>1){p.measures[1][2].at(-1).tie=true;p.measures[3][3].at(-1).tie=true;p.measures[4][0][0].rest=false;}}
    return repairTies(p);
  });
}
export function measureOrder(p) {return p.measures.flatMap((_,measure)=>p.measureRepeats?.[measure]?[measure,measure]:[measure]);}
export function playbackTicks(p) {return measureOrder(p).length*p.meter*beatTicks(p);}
export function measureStartTick(p,measure) {return measureOrder(p).indexOf(measure)*p.meter*beatTicks(p);}
export function timeline(p) {
 const events=measureOrder(p).flatMap((mi,pass)=>p.measures[mi].flatMap((b,bi)=>{let at=(pass*p.meter+bi)*beatTicks(p)*35;return b.map((n,ni)=>{const e={...n,at:at/35,measure:mi,beat:bi,index:ni,pass};at+=units(n);return e;});}));
 events.forEach((e,i)=>{const prev=events[i-1];e.continuation=Boolean(prev?.tie&&!e.rest&&(e.pass===prev.pass||e.measure===prev.measure+1));});return events;
}
export function positionAt(p,tick) {
 const total=playbackTicks(p),local=tick>=0&&tick<total?tick:((tick%total)+total)%total,barTicks=p.meter*beatTicks(p),pass=Math.floor(local/barTicks),order=measureOrder(p),measure=order[pass];
 const shift=(pass-measure)*barTicks;
 const event=timeline(p).find(e=>local+1e-9>=e.at&&local<e.at+e.ticks-1e-9);
 return {tick:local-shift,event:event?{...event,at:event.at-shift}:undefined,measure,beat:local/beatTicks(p)%p.meter,repeatPass:p.measureRepeats?.[measure]?(order[pass-1]===measure?2:1):null};
}
export function readStore(storage) {try { const s=JSON.parse(storage.getItem(STORAGE_KEY)||'{}');return {patterns:Array.isArray(s.patterns)?s.patterns.filter(validPattern):[],draft:validPattern(s.draft)?s.draft:null}; } catch {return {patterns:[],draft:null};} }

// Basic subdivision shortcuts also remain available in their detailed categories.
export function editorPresets(group,meter=4) {
 return beatPresets(meter).filter(p=>p.group===group||(group==='basic'&&['sixteenths','triplets','compound-six'].includes(p.id)));
}
