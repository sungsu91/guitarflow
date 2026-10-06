const ambiguous=()=>{throw Error('피아노 양손의 오선과 마디 경계를 확인하지 못했습니다. 원하는 피아노 양손 부분만 잘라 다시 선택해 주세요. 여러 파트를 연속된 마디로 합치지 않았습니다.');};

// Select the explicitly requested two-staff source before loading the model.
// The connector evidence is geometric; clefs and musical agreement are still
// validated by groupGrandStaffReadings after recognition.
export function planNotationSource(systems,sourceMode){
 const linked=systems.filter(s=>s.connectedStaffIds?.length);
 if(linked.length&&sourceMode!=='grand')throw Error('동시에 연주하는 여러 오선이 연결된 악보입니다. 피아노 양손은 ‘피아노 Grand Staff’를 선택해 주세요. 보컬 멜로디만 필요하면 보컬 오선 부분만 잘라 선택해 주세요.');
 if(sourceMode!=='grand')return {systems,excludedStaffIds:[]};
 let selected=systems;
 if(linked.length){
  if(linked.some(s=>s.connectedStaffIds.length!==1))ambiguous();
  selected=linked;
 }
 if(!selected.length||selected.length%2)ambiguous();
 for(let i=0;i<selected.length;i+=2){
  const a=selected[i],b=selected[i+1],g=Math.max(a.staff.spacing,b.staff.spacing);
  if(linked.length&&(!a.connectedStaffIds.includes(b.id)||!b.connectedStaffIds.includes(a.id)))ambiguous();
  if(!a.measures.length||a.measures.length!==b.measures.length||a.measures.some((box,j)=>Math.abs(box.x-b.measures[j].x)>g*1.2||Math.abs(box.x+box.width-b.measures[j].x-b.measures[j].width)>g*1.2))ambiguous();
 }
 return {systems:selected,excludedStaffIds:systems.filter(s=>!selected.includes(s)).map(s=>s.id)};
}
