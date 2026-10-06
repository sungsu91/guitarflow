// Rhythm and right-hand actions only. Pitches come from the current harmony;
// the melody reservation is applied afterwards and always wins collisions.
export const FINGERSTYLE_TEMPLATES=[
 {id:'bass-3-12-3',label:'Bass–3–(1+2)–3',cycle:960,meters:['2/4','4/4'],steps:[{at:0,strings:['bass']},{at:240,strings:[3]},{at:480,strings:[1,2]},{at:720,strings:[3]}]},
 {id:'bossa-basic',label:'보사노바 기본 리듬',cycle:1920,meters:['4/4'],steps:[{at:0,strings:['bass'],accent:true},{at:240,strings:[1,2,3]},{at:720,strings:[1,2,3]},{at:960,strings:['bass'],accent:true},{at:1440,strings:[1,2,3]},{at:1680,strings:[1,2,3]}]},
 {id:'percussive-basic',label:'퍼커시브 기본 리듬',cycle:1920,meters:['4/4'],steps:[{at:0,strings:['bass']},{at:240,strings:[3]},{at:480,strings:[2,3],dead:true},{at:720,strings:[1,2]},{at:960,strings:['bass']},{at:1200,strings:[3]},{at:1440,strings:[2,3],dead:true},{at:1680,strings:[1,2]}]},
];
