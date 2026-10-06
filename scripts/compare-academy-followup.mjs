// Compare locations, not just totals: an added note cannot conceal a loss.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const root='artifacts/ocr-followup-20261005',before='artifacts/paper-scan-20261005/final',after=process.argv[2]??root+'/academy-verified';
const load=async path=>JSON.parse(await readFile(path));
const notes=a=>a.pages.flatMap((p,pi)=>p.staffs.flatMap((s,si)=>s.measures.flatMap(m=>m.slots.flatMap(slot=>slot.notes.filter(n=>n.status==='confirmed').map(n=>({page:pi,staff:si,string:n.string,fret:n.fret,dead:!!n.dead,x:(n.source.x+n.source.width/2)/(m.source?.pageWidth??p.width),tolerance:s.spacing/p.width*.4}))))));
const reports=[];
for(let i=1;i<=5;i++){
 const a=(await load(`${before}/academy-${i}.json`)).analysis,b=(await load(`${after}/academy-${i}.json`)).analysis,old=notes(a),next=notes(b),used=new Set(),lost=[];
 for(const n of old){const found=next.map((v,j)=>({v,j,d:Math.abs(v.x-n.x)})).filter(({v,j,d})=>!used.has(j)&&v.page===n.page&&v.staff===n.staff&&v.string===n.string&&v.fret===n.fret&&v.dead===n.dead&&d<=Math.min(v.tolerance,n.tolerance)).sort((a,b)=>a.d-b.d)[0];if(found)used.add(found.j);else lost.push(n);}
 const added=next.filter((_,j)=>!used.has(j)),expected=[24,28,28,32,16][i-1];
 // Independent visual audit: the lowest printed numeral in this chord is
 // an open-string 0. The blurred crop resembles 8 after paper correction.
 // Do not substitute a guessed 0: preserve the uncertain position for review.
 if(i===5){
  const page=b.pages[0],slots=page.staffs[0].measures.flatMap(m=>m.slots.map(s=>({s,x:s.x/(m.source?.pageWidth??page.width)})));
  const spot=slots.find(({x})=>Math.abs(x-.641897)<.003)?.s;
  assert(spot,'the visually audited uncertain position must remain present');
  assert(!spot.notes.some(n=>n.string===5&&n.status==='confirmed'&&n.fret!==0),'paper-boundary recovery must not promote the false 8');
  assert(spot.notes.some(n=>n.string===5&&n.status==='confirmed'&&n.fret===0)||spot.status==='unresolved','the unread numeral must remain reviewable');
 }
 reports.push({id:i,beforeRun:before,afterRun:after,barsBefore:a.summary?.measures??a.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures)).length,barsAfter:b.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures)).length,expectedBars:expected,confirmedBefore:old.length,confirmedAfter:next.length,lost,added});
}
await writeFile(root+'/photo-comparison.json',JSON.stringify(reports,null,2));
assert(reports.every(r=>r.barsAfter===r.expectedBars&&!r.lost.length),JSON.stringify(reports));
console.log(JSON.stringify(reports));
