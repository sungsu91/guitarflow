// Authored additions fill a specific transition, not transpositions of a course.
const q=['4','4','4','4'],e=Array(8).fill('8');
const make=(id,type,level,name,shape,patterns,rhythms,purpose,extra={})=>({id,type,level,name,english:name,fixedRoot:'C',family:'major',style:'기초',complete:true,bpm:level==='초급'?52:level==='중급'?64:72,shape,patterns,rhythms:patterns.map((_,i)=>Array.isArray(rhythms[0])?rhythms[i]:rhythms),purpose,difficultyReason:`${level} · ${purpose}`,...extra});
export function curriculumAdditions(){
 const out=[];
 const g=[[6,3],[6,5],[5,2],[5,3],[5,5],[4,2],[4,4],[4,5]];
 out.push(make('scale-rhythm-bridge','스케일','초급','한 박씩 나누는 줄 연결',g,[[0,1,2,1,0],[2,3,4,3,2],[4,5,6,5,4],[5,6,7,6,5],[7,6,5,6,7],[6,5,4,5,6],[4,3,2,3,2],[2,1,0,1,0]],['4','8','8','4','4'],'1–4마디는 한 박에만 8분음표를 넣고, 5–8마디에서 내려옵니다. 줄을 바꾼 뒤 긴 음에서 힘을 풉니다.',{fixedRoot:'G'}));
 const am=[[6,5],[6,8],[5,5],[5,7],[4,5],[4,7],[3,5],[3,7]];
 const minor={fixedRoot:'A',family:'minor',intervals:[0,3,5,7,10],style:'락'};
 out.push(make('penta-landing','펜타토닉','초급','두 줄 왕복과 루트 도착',am,[[0,1,2,1,0],[2,3,4,3,2],[4,5,6,5,4],[6,7,6,5,5],[4,5,4,3,2],[2,3,2,1,0],[0,1,2,1,0],[2,1,0,0,0]],['8','8','4','4','4'],'한 박의 두 음과 긴 도착음을 연결합니다. 1·6·7·8마디의 마지막 A를 확인하고 지나간 줄의 잔향을 끊으세요.',minor));
 out.push(make('penta-string-skip','펜타토닉','중급','펜타토닉 줄 건너 응답',am,[[0,1,4,5,4,1,0,-1],[2,3,6,7,6,3,2,-1],[4,5,0,1,0,5,4,-1],[6,7,2,3,2,7,6,-1],[0,4,1,5,1,4,0,-1],[2,6,3,7,3,6,2,-1],[4,2,5,3,2,1,0,-1],[2,1,0,1,2,1,0,0]],e,'1–4마디는 두 음을 묶어서 줄을 건너고 5–6마디는 한 음씩 교대합니다. 건너뛴 줄은 양손으로 뮤트합니다.',minor));
 out.push(make('penta-rhythm-application','펜타토닉','고급','엇박·줄 건너뛰기 결합',am,[[ -1,0,4,1,5,4,1,0],[ -1,2,6,3,7,6,3,2],[0,1,4,5,4,1,0,-1],[2,3,6,7,6,3,2,-1],[-1,0,4,1,5,1,4,0],[-1,2,6,3,7,3,6,2],[4,2,5,3,2,1,0,-1],[2,1,0,1,2,1,0,0]],['8','16','16','16','16','8','4','4'],'첫 박의 쉼과 16분 도약을 연결한 뒤 긴 음에 도착합니다. 1·2·5·6마디의 빈 첫 반박을 유지하고 줄 건너뛰기 직후 음량을 고르게 합니다.',minor));
 const triads=[[5,3],[4,2],[3,0],[5,0],[4,2],[3,2]];
 out.push(make('triad-major-minor','코드톤 런','초급','C·Am 구성음 구별',triads,[[0,1,2,-1],[3,4,5,-1],[0,2,1,-1],[3,5,4,-1],[2,1,0,-1],[5,4,3,-1],[0,1,2,1],[3,4,0,0]],q,'1·3·5·7마디 C–E–G와 2·4·6마디 A–C–E를 구별합니다. 8마디는 C로 돌아갑니다. 코드를 누른 채 울리는 반주가 아니라 한 음씩 분리합니다.',{chordNames:['C','Am','C','Am','C','Am','C','C']}));
 // Correct Am shape: A2, C3, E3. One neighbouring string per note.
 out[out.length-1].shape=[[5,3],[4,2],[3,0],[5,0],[5,3],[4,2]];
 out[out.length-1].patterns[7]=[0,1,2,0];
 const c=[[5,3],[5,5],[5,7],[4,3],[4,5],[4,7],[3,4],[3,5],[3,7],[2,5],[2,6],[2,8],[1,5],[1,7],[1,8]];
 out.push(make('codetone-guide-tones','코드톤 런','고급','7화음 3·7음 연결',c,[[3,5,7,9,10,9,7,5],[4,6,8,10,11,10,8,6],[2,4,6,7,9,7,6,4],[2,6,9,13,9,6,4,2],[5,7,9,10,9,7,5,3],[6,8,10,11,10,8,6,4],[6,7,9,11,9,7,6,2],[9,6,4,2,4,6,7,7]],e,'Dm7→G7→Cmaj7의 3·7음을 연결합니다. 1→2마디 F→B, 2→3마디 B→E 도착을 준비하고 5–8마디에서는 시작음을 바꾸어 같은 화성을 확인합니다. 7마디 끝 5번줄 7프렛 E에서 8마디 첫 2번줄 5프렛 E로 옥타브를 올릴 때 사이 줄을 뮤트합니다.',{style:'재즈',chordNames:['Dm7','G7','Cmaj7','Cmaj7','Dm7','G7','Cmaj7','Cmaj7']}));
 // Every pitch in the guide-tone run is a member of the named seventh chord.
 out[out.length-1].patterns=[[3,5,7,10,7,5,3,3],[6,8,10,11,10,8,6,6],[2,4,6,7,9,7,6,4],[2,6,9,13,9,6,4,2],[5,7,10,12,10,7,5,3],[6,8,10,11,10,8,6,4],[6,7,9,11,9,7,6,2],[9,6,4,2,4,6,7,7]];
 out.push(make('lick-legato-answer','릭','중급','해머·풀로 이어지는 응답',c,[[0,1,2,1,0,-1],[3,4,5,4,3,-1],[6,7,8,7,6,-1],[9,10,11,10,9,-1],[0,1,2,1,0,-1],[3,4,5,4,3,-1],[6,7,8,7,6,-1],[2,1,0,1,0,0]],['8','8','8','8','4','4'],'1–7마디 첫 네 음의 H–H–P를 앞서 배운 짧은 응답에 적용합니다. 첫 음만 피킹하고 마지막 박을 쉬어 응답의 끝을 들으세요.',{style:'팝',techniqueMap:Array.from({length:8},(_,i)=>i<7?{0:'H',1:'H',2:'P'}:{0:'P',1:'P'})}));
 for(const [prefix,type,kind] of [['hammer','해머온','H'],['pull','풀오프','P'],['slide','슬라이드','S'],['legato','레가토','HP']]){
  const shape=[[3,5],[3,7],[3,9],[2,5],[2,6],[2,8]];
  const cell=(base,reverse=false)=>kind==='P'?[base+2,base+1,base,base+1]:reverse?[base+1,base+2,base+1,base]:[base,base+1,base+2,base+1];
  const mark=(rows,onlyMiddle=false)=>rows.map(row=>{const marks={};for(let i=0;i<row.length-1;i++){const a=shape[row[i]],b=shape[row[i+1]];if(!a||!b||a[0]!==b[0]||a[1]===b[1]||i%4===3||(onlyMiddle&&i!==1))continue;const dir=b[1]>a[1]?'H':'P';if(kind==='HP'||kind==='S'||kind===dir)marks[i]=kind==='S'?'S':dir;}return marks;});
  const beginner=Array.from({length:8},(_,i)=>{const base=i===2||i===3||i===5?3:0;return kind==='P'?[base+1,base+1,base,base]:[base,base,base+1,base+1];});beginner[7]=kind==='P'?[1,1,0,0]:[0,0,1,0];
  if(kind==='HP')for(const i of [1,3,5]){const base=i===3||i===5?3:0;beginner[i]=[base+1,base+1,base,base];}
  const beginRhythm=['4','8','8','2'];
  out.push(make(`${prefix}-contrast`,type,'초급',`피킹음과 ${type} 음량 비교`,shape,beginner,beginRhythm,`1박은 피킹, 2박의 두 음은 ${type}으로 비교합니다. 3–4마디는 2번줄로 옮겨 같은 음량을 유지하고 마지막 2분음표를 끝까지 냅니다.`,{techniqueMap:mark(beginner,true)}));
  const middle=[0,0,3,3,0,3,0,0].map((b,i)=>[...cell(b),...cell(b===0?3:0,i%2===1)]);middle[7]=[2,1,0,1,3,4,3,0];
  out.push(make(`${prefix}-handoff`,type,'중급',`마디 안에서 줄 바꾸는 ${type}`,shape,middle,e,`한 마디의 3박에서 줄을 바꿉니다. 1–2마디에서 새 줄 첫 음을 다시 피킹하고 이전 줄을 뮤트하는 시점을 분리해 익히세요.`,{techniqueMap:mark(middle)}));
  const advanced=[0,3,0,3,3,0,3,0].map((b,i)=>[...cell(b,i%2===1),...cell(b===0?3:0,true)]);advanced[7]=[2,1,0,1,3,4,3,0];
  out.push(make(`${prefix}-phrasing`,type,'고급',`밀도와 도착음을 조절하는 ${type}`,shape,advanced,['16','16','16','16','8','8','4','4'],`첫 박의 네 음을 ${type}으로 이어 낸 뒤 2박에서 줄을 바꾸고 3·4박은 길게 맺습니다. 연속음의 속도와 별개로 도착음의 길이·음량을 제어합니다.`,{techniqueMap:mark(advanced)}));
 }
 return out;
}
export function reviseTemplate(t){
 if(t.id==='triad-engine'||t.id==='seventh-weave'){const patterns=t.patterns.map(row=>[...row]);patterns[7][14]=2;return {...t,patterns,revision:2};}
 const c=[[5,3],[5,5],[5,7],[4,3],[4,5],[4,7],[3,4],[3,5],[3,7],[2,5],[2,6],[2,8],[1,5],[1,7],[1,8]];
 if(['blues-burst','density-switch','advanced-finale'].includes(t.id)){
  const progression=['C','Am','F','G','C','Am','F','C'];
  const target=[[2,3,4,2,2,-1],[5,4,2,0,5,-1],[3,4,5,7,5,-1],[6,5,4,1,4,-1],[9,8,7,4,7,-1],[5,6,7,9,5,-1],[10,9,7,5,3,-1],[9,8,7,6,7,7]];
  const motif=[[0,1,2,4,2,-1],[0,2,1,4,5,-1],[3,4,5,7,5,-1],[4,6,5,8,6,-1],[7,8,9,11,9,-1],[5,7,6,9,7,-1],[3,5,4,7,5,-1],[4,2,0,2,0,0]];
  const solo=[[2,3,4,2,7,-1],[-1,5,7,9,7,5],[3,4,5,7,5,-1],[-1,6,8,11,10,6],[7,8,9,11,9,7,9,7],[5,6,7,9,7,5],[10,9,7,5,3,-1],[9,8,7,6,7,7]];
  const names={ 'blues-burst':'코드가 바뀔 때 목표음 도착','density-switch':'같은 동기를 화성에 맞춰 발전','advanced-finale':'목표음·쉼·레가토 미니 솔로'};
  const patterns=t.id==='blues-burst'?target:t.id==='density-switch'?motif:solo;
  const rhythms=patterns.map(row=>row.length===8?['16','16','16','16','8','8','4','4']:['8','8','8','8','4','4']);
  return {...t,name:names[t.id],english:names[t.id],shape:c,patterns,rhythms,fixedRoot:'C',family:'major',intervals:[0,2,4,5,7,9,11],style:'팝',chordNames:progression,bpm:72,revision:2,
   purpose:t.id==='blues-burst'?'각 마디 마지막 긴 음을 해당 코드의 구성음으로 맺습니다. 1–4마디 E/A/A/G 도착과 5–8마디 C/A/F/C 도착을 먼저 떼어 연습하세요.':t.id==='density-switch'?'1마디의 올라가는 동기를 2마디에서 음 순서를 바꾸고, 3–4마디는 화성에 맞춰 옮깁니다. 5–8마디는 음역을 바꾼 뒤 처음 동기로 돌아옵니다.':'중급의 엇박·H/P·두 포지션을 8마디 안에 합칩니다. 2·4마디는 쉼 뒤 응답하고 5마디의 짧은 16분음표 뒤 긴 음으로 돌아옵니다.',
   techniqueMap:t.id==='advanced-finale'?[{}, {},{0:'H',1:'H'}, {}, {}, {},{0:'P'}, {}]:undefined,
   difficultyReason:'고급 · 속도보다 화성별 도착음, 동기 유지, 리듬과 표현의 선택을 함께 제어합니다.'};
 }
 return t;
}
