// Original exercises. Public syllabi inform the learning sequence, not the notes.
// -1 is a rest; rows are complete bars, never randomly selected fingering.
export function curriculumTemplates({major, connected, penta, blues, pentaIntervals, bluesIntervals}) {

  const lyrical = ['8','8','4','4','4'];
  const breath = ['8','8','8','8','4','4'];
  const space = ['4','4','2'];
  const eighth = Array(8).fill('8');
  const sixteenth = Array(16).fill('16');
  const burst = ['16','16','16','16','8','8','4','4'];
  const make = (id,level,name,english,type,style,bpm,shape,patterns,rhythm,purpose,goal,extra={}) => ({
    id, level, name, english, type, style, bpm, shape, patterns,
    family:'major', complete:true, rhythms:patterns.map((_,i)=>Array.isArray(rhythm[0])?rhythm[i]:rhythm),
    purpose, goal, difficultyReason:`${level} · ${goal}`, ...extra,
  });
  const minor = {family:'minor',intervals:pentaIntervals};
  const newBlues = {family:'minor',intervals:bluesIntervals};
  // Interleaved thirds keep the two melodic voices moving by step.
  const thirds = s => [s,s+2,s+1,s+3,s+2,s+4,s+3,s+5];
  const fourths = s => [s,s+3,s+1,s+4,s+2,s+5,s+3,s+6];
  const pivot = s => [s,s+1,s,s+2,s,s+3,s,s+4];
  const group4 = s => [s,s+1,s+2,s+3,s+1,s+2,s+3,s+4,s+2,s+3,s+4,s+5,s+3,s+4,s+5,s+6];
  const reverse = row => [...row].reverse();
  const twice = row => [...row,...row];
  return [
    make('two-note-answer','초급','두 음으로 질문과 대답','Two-note Call and Response','릭','팝',60,major,
      [[0,2,2],[2,0,0],[0,2,4],[2,0,0],[2,4,4],[4,2,2],[2,1,1],[1,0,0]],space,
      '긴 음을 유지한 뒤 다음 마디가 대답하도록 연주합니다. 음을 많이 치기보다 두 마디의 방향을 느껴 보세요.',
      '2분음표 유지와 두 마디 프레이즈. 한 번에 한 가지 리듬만 익힙니다.'),
    make('penta-hook','초급','펜타토닉 반복 훅','Pentatonic Hook','펜타토닉','락',68,penta,
      [[0,1,2,1,0,-1],[0,1,3,2,1,-1],[2,3,4,3,2,-1],[2,1,0,1,0,-1],[3,4,5,4,3,-1],[3,2,1,2,3,-1],[2,3,2,1,0,-1],[1,2,1,1,0,0]],breath,
      '같은 리듬을 반복해 기억에 남는 훅을 만듭니다. 쉼표에서는 줄을 뮤트하고 다음 첫 음을 기다리세요.',
      '좁은 펜타토닉 구간과 4분쉼표. 박자를 쉬는 동안에도 유지합니다.',minor),
    make('major-landing','초급','3도로 맺는 팝 프레이즈','Third-tone Pop Phrases','릭','팝',70,major,
      [[0,1,2,4,2],[2,3,4,2,0],[2,3,4,5,4],[4,3,2,1,0],[4,5,6,7,9],[9,8,7,6,4],[4,3,2,1,2],[2,1,0,0,0]],lyrical,
      '첫 문장은 3도에서 잠시 머물고, 응답은 으뜸음으로 마칩니다. 긴 음의 소리가 끊기지 않게 해 보세요.',
      '기본 스케일을 알고 긴 도착음을 유지하는 초급 후반 연습입니다.'),
    make('ballad-breath','초급','쉼이 있는 발라드 멜로디','Ballad Breathing Phrases','릭','발라드',60,major,
      [[0,2,4,2,0,-1],[2,4,5,4,2,-1],[4,5,7,6,4,-1],[4,3,2,1,0,-1],[7,8,9,8,7,-1],[7,6,5,4,2,-1],[4,3,2,1,2,-1],[2,1,0,1,0,0]],breath,
      '각 마디의 마지막 박을 쉬며 문장 사이에 여백을 만듭니다. 앞의 짧은 음과 뒤의 긴 음을 구별하세요.',
      '4분쉼표 뮤트와 8분음표 프레이징을 함께 익힙니다.'),
    make('beginner-finale','초급','반복·변형 미니 솔로','Motif Mini Solo','릭','블루스',72,blues,
      [[0,1,2,1,0,-1],[0,1,2,3,4,-1],[4,5,6,5,4,-1],[4,3,2,1,0,-1],[6,7,8,7,6,-1],[6,5,4,3,4,-1],[4,3,2,1,0,-1],[1,2,1,1,0,0]],breath,
      '같은 리듬의 질문을 조금 바꾸어 반복하고 마지막 두 마디에서 낮은 으뜸음으로 정리합니다. 스트레이트 리듬입니다.',
      '초급 마무리: 블루 노트를 짧게 통과하고 쉼표까지 포함해 8마디를 연결합니다.',newBlues),

    make('thirds-dialogue','중급','3도 교차 대화','Thirds Dialogue','스케일','기초',72,major,
      [thirds(0),thirds(2),thirds(4),thirds(6),reverse(thirds(6)),reverse(thirds(4)),reverse(thirds(2)),reverse(thirds(0))],eighth,
      '인접음 순서 대신 3도 간격을 교대로 연주합니다. 두 음을 한 묶음으로 듣고 방향이 바뀌어도 박을 유지하세요.',
      '3도 도약과 줄 이동을 연속 8분음표로 제어합니다.'),
    make('pivot-return','중급','기준음으로 돌아오는 피벗','Pivot Tone Return','스케일','락',76,major,
      [pivot(0),pivot(2),pivot(4),pivot(6),reverse(pivot(6)),reverse(pivot(4)),reverse(pivot(2)),reverse(pivot(0))],eighth,
      '매번 되돌아오는 기준음을 일정하게 유지하고 나머지 음의 높이만 변화시킵니다.',
      '같은 음으로 돌아오는 피킹과 넓어지는 음정 간격을 제어합니다.'),
    make('offbeat-hook','중급','엇박에 들어오는 펜타토닉','Offbeat Pentatonic Hook','펜타토닉','락',78,penta,
      [[0,1,2,3,2,1,0,-1],[-1,1,2,3,4,3,2,1],[-1,2,3,4,5,4,3,2],[-1,3,4,5,4,3,2,0],[-1,4,5,6,5,4,3,2],[-1,3,4,5,4,3,2,1],[-1,2,3,4,3,2,1,0],[1,2,3,2,1,0,0,0]],eighth,
      '첫 8분쉼표 뒤의 약박에서 시작합니다. 몸으로 1박을 느끼면서 피킹은 뒤에 들어가세요.',
      '8분쉼표 뒤 진입과 포지션 연결을 함께 수행합니다.',minor),
    make('fourth-crossing','중급','4도 줄 건너뛰기','Fourth Interval Crossing','스케일','기초',66,major,
      [fourths(0),fourths(2),fourths(4),fourths(6),reverse(fourths(6)),reverse(fourths(4)),reverse(fourths(2)),reverse(fourths(0))],eighth,
      '4도 도약마다 지나가는 줄을 울리지 않도록 뮤트합니다. 음정이 넓어져도 박자 간격은 같습니다.',
      '4도 간격의 줄 건너뛰기와 불필요한 줄 뮤트가 필요합니다.'),
    make('pop-chord-route','중급','코드톤 포지션 연결 릭','Chord-tone Position Lick','코드톤 런','팝',72,connected,
      [[0,1,2,4,7,6,4,2],[5,6,7,9,12,11,9,7],[3,4,5,7,10,9,7,5],[4,5,6,8,11,10,8,6],[7,8,9,11,14,13,11,9],[9,8,7,5,7,9,12,9],[7,6,5,3,5,7,10,7],[7,6,5,4,2,1,0,0]],burst,
      '각 마디의 첫 음을 코드톤으로 시작하고 16분음표 접근음에서 8분·4분음표의 도약으로 연결합니다. 긴 도착음에서도 박자를 유지하세요.',
      '코드톤 선택에 대각선 포지션 이동·도약·16분→8분→4분음표 전환을 결합합니다.',
      {harmony:[[0,''],[5,'m'],[3,''],[4,''],[0,''],[5,'m'],[3,''],[0,'']]}),
    make('speed-window','중급','짧게 달리고 길게 맺기','Short Burst Long Landing','릭','락',64,connected,
      [[0,1,2,3,4,3,2,0],[2,3,4,5,6,5,4,2],[4,5,6,7,8,7,6,4],[6,7,8,9,10,9,8,7],[8,9,10,11,12,11,10,9],[10,11,12,13,14,13,12,11],[8,7,6,5,4,3,2,1],[4,3,2,1,2,1,0,0]],burst,
      '첫 박만 네 음으로 달리고 뒤에서는 속도를 줄여 긴 음에 도착합니다. 16분음표가 끝난 뒤에도 템포는 바뀌지 않습니다.',
      '한 박짜리 16분음표와 8분·4분음표 사이의 밀도 전환을 익힙니다.'),
    make('intermediate-finale','중급','질문·엇박·응답 솔로','Question Offbeat Answer','릭','팝',80,connected,
      [[0,1,2,4,2,0,1,2],[-1,4,3,2,3,4,5,4],[4,5,6,7,6,5,4,2],[-1,6,7,8,7,6,5,4],[7,8,9,11,9,8,7,6],[-1,9,10,11,12,11,10,9],[7,6,5,4,5,4,3,2],[2,3,4,3,2,1,0,0]],eighth,
      '홀수 마디의 질문에 짝수 마디가 약박으로 응답합니다. 반복되는 리듬이 들리도록 음형과 악센트를 정리하세요.',
      '포지션 이동·엇박 진입·음형 재현을 8마디 문장 안에서 연결합니다.'),

    make('thirds-drive','고급','연속 3도 16분음표','Continuous Thirds Drive','스케일','기초',76,connected,
      [[...thirds(0),...thirds(1)],[...thirds(2),...thirds(3)],[...thirds(4),...thirds(5)],[...thirds(6),...thirds(7)],reverse([...thirds(6),...thirds(7)]),reverse([...thirds(4),...thirds(5)]),reverse([...thirds(2),...thirds(3)]),reverse([...thirds(0),...thirds(1)])],sixteenth,
      '3도 간격을 네 음씩 묶어 연주하되 줄이 바뀌는 지점에서 힘을 더 주지 않습니다.',
      '연속 16분음표·3도 도약·대각선 포지션 이동이 동시에 필요합니다.'),
    make('fourths-drive','고급','4도 크로스 16분음표','Fourth Crossing Drive','스케일','락',72,connected,
      [[...fourths(0),...fourths(1)],[...fourths(2),...fourths(3)],[...fourths(4),...fourths(5)],[...fourths(6),...fourths(7)],reverse([...fourths(6),...fourths(7)]),reverse([...fourths(4),...fourths(5)]),reverse([...fourths(2),...fourths(3)]),reverse([...fourths(0),...fourths(1)])],sixteenth,
      '4도 도약을 빠르게 이어가며 건너뛴 줄을 뮤트합니다. 줄 이동 직후에도 네 음의 길이를 균등하게 유지하세요.',
      '4도 도약의 줄 건너뛰기를 16분음표로 지속합니다.'),
    make('pivot-drive','고급','16분 피벗 음역 확장','Sixteenth Pivot Expansion','스케일','락',80,connected,
      [[...pivot(0),...pivot(1)],[...pivot(2),...pivot(3)],[...pivot(4),...pivot(5)],[...pivot(6),...pivot(7)],reverse([...pivot(6),...pivot(7)]),reverse([...pivot(4),...pivot(5)]),reverse([...pivot(2),...pivot(3)]),reverse([...pivot(0),...pivot(1)])],sixteenth,
      '되돌아오는 기준음과 움직이는 선율을 분리해 듣습니다. 넓은 도약에서도 피킹 폭을 작게 유지하세요.',
      '16분음표의 반복 기준음과 넓은 음정·포지션 이동을 결합합니다.'),
    make('penta-groups','고급','펜타토닉 네 음 시퀀스','Four-note Pentatonic Sequence','펜타토닉','락',84,penta,
      [group4(0),group4(1),group4(2),group4(3),reverse(group4(3)),reverse(group4(2)),reverse(group4(1)),reverse(group4(0))],sixteenth,
      '펜타토닉을 네 음씩 겹쳐 진행합니다. 마디의 첫 음만 강하게 하고 나머지 시퀀스를 균일하게 이어 보세요.',
      '연속 16분음표 시퀀스와 펜타토닉의 넓은 음정 간격을 유지합니다.',minor),
    make('triad-engine','고급','트라이어드 역방향 엔진','Triad Direction Engine','코드톤 런','락',76,connected,
      [twice([0,2,4,2,4,7,4,2]),twice([4,7,9,7,9,11,9,7]),twice([7,9,11,9,11,14,11,9]),twice([11,9,7,9,7,4,7,9]),twice([7,9,11,14,11,9,7,4]),twice([4,7,9,11,9,7,4,2]),twice([2,4,7,9,7,4,2,4]),[4,7,4,2,4,2,0,2,4,2,0,2,4,2,1,0]],sixteenth,
      '세 음 화음을 16분음표로 오르내립니다. 스윕을 강제하지 않으며 각 음이 분리되도록 피킹과 뮤트를 맞추세요.',
      '빠른 아르페지오 도약·방향 전환·줄 뮤트를 함께 제어합니다.'),
    make('seventh-weave','고급','메이저7 지그재그 연결','Major Seventh Weave','코드톤 런','재즈',76,connected,
      [twice([0,2,4,6,4,2,4,6]),twice([7,6,4,6,7,9,11,13]),twice([14,13,11,9,11,13,11,9]),twice([7,9,11,13,11,9,7,6]),twice([6,7,9,11,9,7,6,4]),twice([4,6,7,9,7,6,4,2]),twice([2,4,6,7,6,4,2,0]),[0,2,4,6,7,6,4,2,4,6,4,2,4,2,1,0]],sixteenth,
      '1·3·5·7음 사이를 지그재그로 연결합니다. 이 연습은 단일 메이저7 코드 위의 테크닉 연습입니다.',
      '메이저7 도약을 16분음표로 이어가며 두 옥타브의 포지션을 전환합니다.'),
    make('blues-burst','고급','블루 노트 급가속 응답','Blue-note Burst Response','릭','블루스',82,blues,
      [group4(0),group4(2),group4(4),group4(6),reverse(group4(6)),reverse(group4(4)),reverse(group4(2)),reverse(group4(0))],sixteenth,
      '블루 노트가 포함된 시퀀스를 짧은 경과음으로 처리합니다. 스윙이 아닌 균등한 16분음표입니다.',
      '반음 경과음과 넓은 블루스 음정의 교차를 16분음표로 유지합니다.',newBlues),
    make('density-switch','고급','8분·16분 밀도 전환','Rhythmic Density Switch','릭','락',92,connected,
      [group4(0),[6,7,8,7,6,5,4,2],group4(4),[10,11,12,11,10,9,8,7],reverse(group4(7)),[7,8,9,8,7,6,5,4],reverse(group4(3)),[4,3,2,3,2,1,0,0]],
      [sixteenth,eighth,sixteenth,eighth,sixteenth,eighth,sixteenth,eighth],
      '빠른 마디와 여유 있는 마디를 번갈아 연주합니다. 음 수가 줄어도 메트로놈의 박은 그대로 유지하세요.',
      '높은 템포에서 16분·8분음표 밀도와 포지션을 동시에 전환합니다.'),
    make('offbeat-drive','고급','엇박 16분 시퀀스','Offbeat Sixteenth Sequence','스케일','락',80,connected,
      [group4(0),[-1,...group4(2).slice(1)],group4(4),[-1,...group4(6).slice(1)],reverse(group4(7)),[-1,...reverse(group4(5)).slice(1)],reverse(group4(3)),reverse(group4(0))],sixteenth,
      '첫 16분쉼표가 있는 마디에서는 박보다 한 칸 늦게 들어갑니다. 쉼 뒤 첫 음을 앞당기지 마세요.',
      '16분쉼표 뒤 진입과 연속 시퀀스의 내부 박자 유지가 필요합니다.'),
    make('legato-drive','고급','세 기법 연속 레가토','Continuous Mixed Legato','레가토','락',76,connected,
      [twice([0,1,2,1,3,4,5,4]),twice([6,7,8,7,9,10,11,10]),twice([12,13,14,13,12,13,14,12]),twice([11,10,9,10,8,7,6,7]),twice([6,7,8,7,9,10,11,10]),twice([8,7,6,7,5,4,3,4]),twice([3,4,5,4,2,1,0,1]),[2,1,0,1,3,4,5,4,2,1,0,1,2,1,1,0]],sixteenth,
      '같은 줄의 연속 음을 H·P·SL로 연결합니다. 줄이 바뀌면 다시 피킹하고 각 음의 음량을 고르게 유지하세요.',
      '16분음표에서 기법 전환·줄 변경·포지션 이동을 지속합니다.',{autoTechnique:true}),
    make('advanced-finale','고급','시퀀스·도약 종합 솔로','Sequence and Leap Finale','릭','락',88,connected,
      [group4(0),[...thirds(2),...thirds(3)],group4(5),[...fourths(6),...reverse(fourths(6))],reverse(group4(7)),[...pivot(4),...reverse(pivot(4))],reverse(group4(3)),[4,3,2,1,2,3,4,3,2,1,0,1,2,1,0,0]],sixteenth,
      '순차 진행·3도·4도·피벗 음형을 하나의 문장으로 연결합니다. 각 음형이 바뀌는 첫 박을 듣고 마지막 으뜸음으로 정리하세요.',
      '고급 종합: 빠른 리듬을 유지하면서 서로 다른 도약 규칙을 마디마다 전환합니다.'),
  ];
}
