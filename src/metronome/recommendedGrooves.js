// Practice arrangements, not definitive genre patterns or transcriptions of songs.
const all16 = Array.from({length:16}, (_,i)=>i+1);
const shuffle = [1,3,4,6,7,9,10,12];
function row(tone, hits, levels = {}, volume = .75) {
  if(new Set(hits).size!==hits.length || hits.some(i=>!Number.isInteger(i)||i<1||i>16)) throw new Error('Invalid groove hit positions');
  const steps=Array(72).fill(false), velocities=Array(72).fill(70);
  for(const slot of hits) {steps[slot-1]=true;velocities[slot-1]=levels[slot] ?? 70;}
  return {tone,steps,velocities,volume,muted:false};
}
const levels=(slots,value)=>Object.fromEntries(slots.map(i=>[i,value]));
const shuffleLight=levels([3,6,9,12],45);
function pack(id,title,category,bpm,triplet,description,rows) {
  return {id:`recommended-${id}`,title,category,bpm,builtin:true,timeSignature:'4/4',subdivision:triplet?'eighth-triplet':'sixteenth',description,pattern:{name:`recommended-${id}`,rows}};
}
export const GROOVE_CATEGORIES=['전체','재즈','블루스','팝·발라드','펑크·디스코','라틴'];
export const RECOMMENDED_GROOVE_PACKS = [
  pack('01','재즈 라이드 스윙','재즈',110,true,'라이드 중심의 가벼운 스윙 연습.',[
    row('ride',[1,4,6,7,10,12],{4:100,10:100,6:45,12:45},.85),row('hihat',[4,10],levels([4,10],45),.65),row('kick',[1,4,7,10],levels([1,4,7,10],25),.7)]),
  pack('02','블루스 셔플','블루스',90,true,'셋잇단의 첫째·셋째 타격으로 만드는 기본 셔플.',[
    row('hihat',shuffle,shuffleLight,.75),row('snare',[4,10],levels([4,10],100),.75),row('kick',[1,7],{},.9)]),
  pack('03','블루스 드라이브','블루스',115,true,'킥이 앞으로 밀어주는 블루스록 연습.',[
    row('ride',shuffle,shuffleLight,.85),row('snare',[4,10],levels([4,10],100),.75),row('kick',[1,4,7,9,10],{9:45},.9)]),
  pack('04','하프타임 셔플','블루스',80,true,'3박의 큰 스네어와 작은 고스트 노트가 대비되는 셔플.',[
    row('hihat',shuffle,shuffleLight,.75),row('snare',[2,5,7,11],{2:25,5:25,7:100,11:25},.75),row('kick',[1,6,9],{},.9)]),
  pack('05','팝 백비트','팝·발라드',95,false,'코드 전환과 스트로크용 기본 팝 리듬.',[
    row('hihat',[1,3,5,7,9,11,13,15],levels([3,7,11,15],45),.75),row('snare',[5,13],levels([5,13],100),.75),row('kick',[1,7,9],{},.9)]),
  pack('06','펑크 싱코페이션','펑크·디스코',100,false,'엇박 킥과 고스트 노트를 활용한 커팅 연습.',[
    row('hihat',all16,levels([2,4,6,8,10,12,14,16],45),.68),row('snare',[4,5,8,12,13,16],{4:25,5:100,8:25,12:25,13:100,16:25},.75),row('kick',[1,7,10,15],{},.9)]),
  pack('07','디스코 오프비트','펑크·디스코',116,false,'매 박 킥과 엇박 하이햇이 대비되는 리듬.',[
    row('openHihat',[3,7,11,15],levels([3,7,11,15],45),.65),row('clap',[5,13],{},.7),row('kick',[1,5,9,13],levels([1,5,9,13],100),.85)]),
  pack('08','소프트 발라드','팝·발라드',72,false,'아르페지오를 위한 여백 있는 반주.',[
    row('shaker',[1,3,5,7,9,11,13,15],levels([1,3,5,7,9,11,13,15],45),.6),row('rim',[5,13],{},.4),row('kick',[1,9,15],{15:45},.75)]),
  pack('09','재즈 라운지 앙상블','재즈',104,true,'라이드가 앞에 있고 브러시·셰이커가 뒤를 채우는 라운지 편곡.',[
    row('ride',[1,4,6,7,10,12],{6:45,12:45},.85),row('hihat',[4,10],levels([4,10],45),.55),row('kick',[1,7],levels([1,7],25),.7),row('brushSnare',[3,8,12],levels([3,8,12],25),.55),row('shaker',shuffle,levels(shuffle,45),.4),row('rim',[10],{10:45},.35)]),
  pack('10','블루스 클럽 밴드','블루스',96,true,'백비트에 탬버린과 박수가 얇게 겹치는 클럽 블루스 편곡.',[
    row('hihat',shuffle,shuffleLight,.65),row('snare',[4,10],levels([4,10],100),.75),row('kick',[1,7,9],{9:45},.85),row('tambourine',[4,10],levels([4,10],45),.4),row('clap',[10],{10:25},.45),row('woodblock',[6,12],levels([6,12],45),.4)]),
  pack('11','라틴 팝 퍼커션','라틴',104,false,'여러 타악기가 빈 곳을 나눠 채우는 라틴풍 팝 편곡.',[
    row('kick',[1,7,9,15],{},.85),row('rim',[5,13],{},.45),row('shaker',all16,{...levels(all16,45),...levels([2,4,6,8,10,12,14,16],25)},.4),row('congaSlap',[4,7,12,15],{4:45,12:45},.6),row('cowbell',[1,7,11],levels([1,7,11],45),.42),row('cabasa',[3,7,11,15],levels([3,7,11,15],45),.55),row('agogo',[6,14],levels([6,14],45),.35),row('triangle',[1],{1:25},.3)]),
  pack('12','디스코 펑크 풀 퍼커션','펑크·디스코',112,false,'4분 킥 위에 하이햇·탬버린·카우벨이 교차하는 풍성한 편곡.',[
    row('kick',[1,5,9,13],levels([1,5,9,13],100),.85),row('snare',[5,13],levels([5,13],100),.7),row('hihat',[1,5,9,13],levels([1,5,9,13],45),.55),row('openHihat',[3,7,11,15],levels([3,7,11,15],45),.55),row('shaker',all16,{...levels(all16,45),...levels([2,4,6,8,10,12,14,16],25)},.35),row('tambourine',[3,7,11,15],levels([3,7,11,15],45),.38),row('clap',[13],{13:45},.4),row('cowbell',[4,10,16],levels([4,10,16],45),.38)]),
];
