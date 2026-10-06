// Human-read evaluation only. The production importer never imports this file.
// Separated source regions cover mutes, single/double digits and dense rhythms.
const e=(duration,notes)=>({duration:String(duration),notes:notes.map(([string,fret])=>({string,fret}))});
const eighths=notes=>notes.map(n=>e(8,n));
const sixteenths=notes=>notes.map(n=>e(16,n));
const common=[[[3,2]],[[1,0]],[[3,2]],[[2,0]],[[3,2]],[[4,2]],[[3,2]]];
export const flowerAudit=new Map([
 [1,eighths([[[2,0],[3,2],[5,3]],...common])],
 [5,eighths([[[2,0],[3,2],[5,3]],...common])],
 [2,eighths([[[2,0],[3,2],[4,0]],...common])],
 [3,eighths([[[2,0],[3,0],[4,2]],...common])],
 [4,eighths([[[6,0]],[[4,2]],[[3,2]],[[2,0]],[[1,0]],[[2,0]],[[3,2]],[[4,2]]])],
 [9,[e(8,[[2,0],[3,0],[4,2],[5,3]]),e(8,[[5,3]]),...sixteenths([[[5,3]],[[4,2]],[[3,0]],[[2,0]]]),e(8,[[3,2],[5,2]]),e(8,[[4,0]]),e(4,[[2,3],[3,2]])]],
 [10,[{...e(8,[[3,2],[5,2]]),dotted:true},e(16,[[1,2]]),e(8,[[1,0]]),e(8,[[2,4]]),e(8,[[1,0],[6,0]]),e(8,[[3,0]]),e(4,[[1,7],[2,0]])]],
 [11,[e(8,[[1,0],[2,0],[6,8]]),e(8,[[3,0]]),e(4,[[1,7],[2,0]]),e(8,[[1,5],[2,7],[3,7],[4,0]]),...[5,7,5].map(f=>({...e(16,[[1,f]]),tuplet:true})),e(8,[[2,7]]),e(8,[[3,7]])]],
 [12,eighths([[[1,0],[6,0]],[[5,2]],[[4,2]],[[4,4]],[[3,0]],[[5,2]],[[4,2]],[[2,0]]])],
 [13,[e(8,[[2,0],[3,0],[5,3]]),e(8,[[4,2]]),e(16,[[2,'X'],[3,'X'],[4,'X'],[5,'X']]),e(16,[[4,2]]),e(16,[[3,0]]),e(16,[[2,0]]),e(8,[[3,2],[5,2]]),e(8,[[4,0]]),e(4,[[2,3],[3,2]])]],
 [15,sixteenths(Array.from({length:4},(_,i)=>[[[3,9],[i<2?6:4,i<2?8:0]],[[1,7]],[[2,10]],[[1,7]]]).flat())],
 [16,[...sixteenths([[[3,9],[6,0]],[[1,7]],[[2,9]],[[1,7]],[[3,9],[6,0]],[[1,7]],[[2,9]],[[1,7]]]),e(4,[[3,9],[6,0]]),e(8,[[1,'X'],[2,'X'],[3,'X'],[6,'X']]),e(8,[[2,0]])]],
 [44,[...sixteenths([[[1,0],[6,0]],[[3,0]],[[1,3],[2,0]],[[3,0]],[[1,5],[2,0]],[[3,0]],[[1,7],[2,0]],[[3,0]],[[1,5],[2,0]],[[3,0]]]),...eighths([[[1,3],[2,0]],[[3,0]],[[1,0],[2,0]]])]],
 [45,sixteenths([[[1,0],[5,3]],[[4,2]],[[3,0]],[[2,0]],[[1,0],[5,3]],[[4,2]],[[3,0]],[[2,0]],[[1,2],[4,0]],[[3,2]],[[2,0]],[[1,0]],[[1,2],[5,2]],[[2,0]],[[1,3]],[[1,2]]])],
 [46,sixteenths([[[1,0],[6,0]],[[3,0]],[[1,3]],[[3,0]],[[1,2],[5,2]],[[3,0]],[[2,3]],[[3,0]],[[1,0],[4,2]],[[3,0]],[[2,3]],[[3,0]],[[2,0],[5,2]],[[3,0]],[[2,3]],[[3,0]]])],
 [48,[...sixteenths([[[1,0],[6,0]],[[5,2]],[[4,2]],[[3,2]],[[2,0]],[[4,2]],[[3,2]],[[2,0]],[[1,0]],[[3,2]],[[2,0]],[[1,0]]]),e(4,[[1,5],[2,5],[3,5]])]],
 [54,[...sixteenths([[[3,0],[6,0]],[[5,2]],[[4,4]],[[5,2]],[[3,0]],[[5,2]],[[3,2]],[[5,2]],[[4,4]],[[5,2]],[[4,2]],[[5,2]]]),e(8,[[4,0]]),...sixteenths([[[5,2]],[[4,0]]])]],
 [55,[...sixteenths([[[4,2],[6,3]],[[5,3]],[[4,0]],[[5,3]],[[4,2]],[[4,4]]]),e(8,[[3,0]]),...sixteenths([[[4,0],[6,3]],[[6,3]],[[5,3]],[[6,3]]]),e(8,[[5,2]]),...sixteenths([[[5,2]],[[4,0]]])]],
 [56,[e(8,[[4,2],[5,3]]),...sixteenths([[[2,1]],[[2,0]],[[3,2]],[[3,0]]]),e(8,[[4,4]]),e(8,[[6,0]]),...sixteenths([[[2,0]],[[3,2]],[[3,0]],[[4,4]]]),e(8,[[4,2]])]],
 [27,[e(8,[[1,0],[2,0],[6,8]]),e(8,[[3,0]]),e(4,[[1,7],[2,0]]),e(8,[[1,5],[2,7],[3,7],[4,0]]),...[5,7,5].map(f=>({...e(16,[[1,f]]),tuplet:true})),e(8,[[2,7]]),e(8,[[3,7]])]],
 [28,sixteenths([[[1,0],[6,0]],[[5,2]],[[4,2]],[[4,4]],[[3,0]],[[2,0]],[[1,0]],[[1,2]],[[1,3]],[[1,2]],[[1,0]],[[2,0]],[[3,0]],[[4,4]],[[4,2]],[[3,0]]])],
 [49,[e(4,[[1,5],[2,5],[3,5]]),e(4,[[1,5],[2,5],[3,5]]),...sixteenths([[[1,'X'],[2,'X'],[3,'X'],[4,'X']],[[3,2]],[[3,4]],[[1,3]],[[1,2]],[[1,0]],[[1,2]],[[2,4]]])]],
]);

// The first page's printed chord names, including parenthesized extensions.
// Kept separate from notes so a rhythm improvement cannot hide lost harmony.
export const flowerChordAudit=new Map([
 [1,['Cmaj7(6)']],[2,['D6/9']],[3,['Em11']],[4,['Em11']],
 [5,['Cmaj7(6)']],[6,['D6/9']],[7,['Em11']],[8,['E']],
 [9,['Cmaj7','Bm7']],[10,['B7','Em']],[11,['Cmaj7','D']],[12,['Em']],
 [13,['Cmaj7','Bm7']],[14,['B7','Em']],[15,['Cmaj7(6)','D6/9']],[16,['E']],
 [17,['Em','Bm7']],[18,['Cadd2','G']],[19,['Am','Em']],[20,['F#m7b5','B7']],
]);

// The parenthesized continuation at 49 has no new arpeggio arrow.
export const flowerTechniqueAudit=[
 {bar:9,slot:2,tieFromPrevious:true},
 {bar:48,slot:12,arpeggio:'up',harmonicStrings:[1,2,3]},
 {bar:49,slot:0,arpeggio:null,harmonicStrings:[1,2,3]},
 {bar:49,slot:1,tieFromPrevious:true,harmonicStrings:[1,2,3]},
];

// Source H-P triplets, consecutive P-P, and both directions of sl. with arcs.
export const flowerConnectionAudit=[
 {bar:11,slot:4,technique:'H'},{bar:11,slot:5,technique:'P'},
 {bar:27,slot:4,technique:'H'},{bar:27,slot:5,technique:'P'},
 {bar:28,slot:2,technique:'S',slur:true},{bar:28,slot:6,technique:'H'},
 {bar:28,slot:8,technique:'P'},{bar:28,slot:9,technique:'P'},
 {bar:28,slot:13,technique:'S',slur:true},
 {bar:49,slot:3,technique:'S',slur:true},{bar:49,slot:5,technique:'S',slur:true},
];
