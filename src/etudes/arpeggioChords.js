import {parseChordSymbol} from '../chords/chordSymbols.js';
import {OPEN_CHORD_SHAPES} from './openChordStudies.js';
import {effectiveTuning,maxFret} from './scoreTuning.js';

const opens={...OPEN_CHORD_SHAPES,...Object.fromEntries(Object.entries({
 E:[0,2,2,1,0,0],A:[null,0,2,2,2,0],A7:[null,0,2,0,2,0],C7:[null,3,2,3,1,0],B7:[null,2,1,2,0,2],G7:[3,2,0,0,0,1],
 Am7:[null,0,2,0,1,0],Em7:[0,2,0,0,0,0],Emaj7:[0,2,1,1,0,0],Dm7:[null,null,0,2,1,1],Cmaj7:[null,3,2,0,0,0],Amaj7:[null,0,2,1,2,0],Dmaj7:[null,null,0,2,2,2],Fmaj7:[null,null,3,2,1,0],
 Asus4:[null,0,2,2,3,0],Asus2:[null,0,2,2,0,0],Dsus4:[null,null,0,2,3,3],Dsus2:[null,null,0,2,3,0],Gsus4:[3,3,0,0,1,3],
 }).map(([name,frets])=>[name,{frets,fingers:Array(6).fill(null)}]))};
const cache=new Map();
// Prefer familiar open grips, then a compact low position. A slash bass is
// mandatory; we never silently substitute a different named chord.
export function shapeForChordName(document,name){
 const symbol=parseChordSymbol(name);if(!symbol)return null;
 if(symbol.silent)return {name:symbol.name,silent:true};
 const tuning=effectiveTuning(document),limit=maxFret(document)-(document.capo??0),key=JSON.stringify([name,tuning,limit]);
 if(cache.has(key))return cache.get(key);
 if(document.tuning.join(',')==='64,59,55,50,45,40'&&opens[symbol.name])return {...opens[symbol.name],name:symbol.name};
 // Chord symbols describe the grip relative to the capo, as in the score's
 // existing chord diagrams. Use the un-capoed tuning for fingering selection.
 const low=[...document.tuning].reverse(),tones=new Set(symbol.tones);
 let best=null,bestCost=Infinity;
 for(let position=0;position<=Math.min(9,limit);position++){
  const options=low.map(open=>Array.from({length:Math.min(limit,position+3)-position+1},(_,i)=>position+i).filter(f=>tones.has((open+f)%12)));
  for(const bassIndex of [0,1,2]){
   const bassOptions=Array.from({length:Math.min(limit,position+3)-position+1},(_,i)=>position+i).filter(f=>(low[bassIndex]+f)%12===symbol.bassPc);
   const visit=frets=>{
    const i=frets.length;
    if(i<6){for(const f of i===bassIndex?bassOptions:options[i])visit([...frets,f]);return;}
    const sounding=frets.flatMap((f,j)=>f===null?[]:[low[j]+f]);
    if(Math.min(...sounding)%12!==symbol.bassPc)return;
    const pcs=new Set(sounding.map(n=>n%12));
    // Extended grips may omit the perfect fifth, but keep defining tones.
    if(symbol.tones.some(pc=>!pcs.has(pc)&&!(symbol.tones.length>4&&pc===(symbol.pc+7)%12)))return;
    const pressed=frets.filter(f=>f>0),minimum=Math.min(...pressed),maximum=Math.max(0,...pressed);
    const fingers=pressed.filter(f=>f!==minimum).length+(pressed.length?1:0);
    if(fingers>4||pressed.length&&maximum-minimum>3)return;
    // An open string inside a barre means each lowest-fret stop needs a finger.
    const first=frets.indexOf(minimum),last=frets.lastIndexOf(minimum);
    if(frets.slice(first,last+1).includes(0)&&pressed.length>4)return;
    const cost=maximum*2+pressed.reduce((a,b)=>a+b,0)*.15+(6-sounding.length)*.4;
    if(cost<bestCost){bestCost=cost;best={name:symbol.name,frets,fingers:Array(6).fill(null)};}
   };
   visit(Array(bassIndex).fill(null));
  }
 }
 if(cache.size>256)cache.clear();cache.set(key,best);return best;
}

export function measureChordChanges(measure){
 if(measure.harmonyChanges?.length)return measure.harmonyChanges;
 const name=measure.chord?.name??measure.harmony;
 return name?[{onset:0,name,shape:measure.chord??undefined}]:[];
}
export function chordProgression(document){
 let previous=null;
 return document.measures.map(measure=>{
  if(measure.harmonyReview){previous=null;return [];}
  const changes=measureChordChanges(measure).map(c=>({...c,shape:c.shape??shapeForChordName(document,c.name)}));
  const result=changes[0]?.onset===0?changes:previous?[{...previous,onset:0,inherited:true},...changes]:changes;
  if(changes.length)previous=changes.at(-1);
  return result;
 });
}
