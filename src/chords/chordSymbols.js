import {CHORD_TONE_INTERVALS} from './chordTheory.js';

const natural={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const qualities=new Map(Object.entries(CHORD_TONE_INTERVALS).flatMap(([family,types])=>Object.entries(types).map(([type,intervals])=>[
 type==='none'?({major:'',minor:'m',dim:'dim',aug:'aug'}[family]):family==='minor'&&type==='add9'?'madd9':type,intervals,
])));
qualities.set('maj7add6',[0,4,7,9,11]);
// Display extensions compactly without changing their pitches or voicing.
// Also covers labels saved by older imports; unrelated add chords stay intact.
export function compactChordLabel(value){
 return String(value??'').replace(/\b([A-G][#b]?)(?:maj7|M7)add6(?=\/|\s|$)/g,'$1maj7(6)');
}
export function parseChordSymbol(value){
 if(typeof value!=='string'||value.length>40)return null;
 let name=value.trim().replaceAll('♯','#').replaceAll('♭','b').replaceAll('△','maj').replaceAll('Δ','maj').replaceAll('−','-').replace(/\s/g,'').replace(/6\(9\)/g,'6/9').replace(/(M7|maj7)\(6\)/g,'$1add6').replace(/[()]/g,'');
 if(/^N\.?C\.?$/i.test(name))return {name:'N.C.',silent:true};
 const match=name.match(/^([A-G])([#b]?)(.*?)(?:\/([A-G][#b]?))?$/);
 if(!match)return null;
 let suffix=match[3].replace(/^min/,'m').replace(/^M(?=\d)/,'maj').replace(/^-(?=\d|$)/,'m').replace(/^\+(?=$)/,'aug').replace(/^sus$/,'sus4').replace(/^ø7?$/,'m7b5').replace(/^°/,'dim');
 if(!qualities.has(suffix))return null;
 const pc=n=>(natural[n[0]]+(n[1]==='#'?1:n[1]==='b'?-1:0)+12)%12;
 const root=match[1]+match[2],bass=match[4]??root;
 name=compactChordLabel(root+suffix+(match[4]?'/'+bass:''));
 return {name,root,bass,pc:pc(root),bassPc:pc(bass),intervals:qualities.get(suffix),tones:[...new Set(qualities.get(suffix).map(n=>(pc(root)+n)%12))]};
}
