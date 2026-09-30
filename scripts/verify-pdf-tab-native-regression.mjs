// Compare every previously verified text-PDF bar, not just selected goldens.
// Equality to a baseline is a regression check, not independent ground truth.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const before=process.argv[2]||'artifacts/pdf-tab-100/final',after=process.argv[3]||'artifacts/pdf-tab-next/final';
const signature=a=>a.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures)).map(m=>({review:m.needsReview,slots:m.slots.map(s=>[s.duration,!!s.dotted,!!s.tuplet,!!s.rest,s.notes.filter(n=>n.status==='confirmed').map(n=>[n.string,n.fret])])}));
let bars=0;
for(const i of [4,5,6,8]){
 const old=signature(JSON.parse(await readFile(`${before}/${i}-analysis.json`))),current=signature(JSON.parse(await readFile(`${after}/${i}-analysis.json`)));
 assert.deepEqual(current,old,`all native TAB rhythm/fret/review data for PDF ${i}`);bars+=current.length;
}
console.log(`${bars} native TAB bars retain their previous complete rhythm, fret and review data.`);
