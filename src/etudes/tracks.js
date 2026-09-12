// Course order is explicit: each technique has its own three-stage syllabus.
export const TRACKS = Object.freeze([
  { type: '스케일', summary: '손가락 간격부터 음계 연결과 포지션 이동까지', prerequisite: 'TAB의 줄·프렛 번호와 4분음표를 읽을 수 있으면 시작하세요.',
    stages: [
      ['한 줄 두 음 → 인접 줄 왕복', ['triad-start', 'first-path']],
      ['3도·피벗 → 4도 도약과 뮤트', ['thirds-dialogue', 'pivot-return', 'fourth-crossing']],
      ['연속 16분음표 → 도약·엇박·포지션 연결', ['diagonal-sequence', 'thirds-drive', 'fourths-drive', 'pivot-drive', 'offbeat-drive']],
    ] },
  { type: '펜타토닉', summary: '다섯 음으로 짧은 패턴과 연결 프레이즈 익히기', prerequisite: '한 줄에서 검지·약지·새끼손가락을 번갈아 짚는 연습부터 시작합니다.',
    stages: [
      ['두 음 간격 → 쉼이 있는 반복 훅', ['penta-pairs', 'penta-hook']],
      ['포지션 왕복 → 엇박 진입', ['rock-penta', 'offbeat-hook']],
      ['네 음 시퀀스 → 방향을 바꾸는 연속 패턴', ['penta-groups', 'penta-turns']],
    ] },
  { type: '릭', summary: '짧은 질문과 응답을 연주 문장으로 확장하기', prerequisite: '기본 스케일 운지를 익힌 뒤 시작하면 좋습니다.',
    stages: [
      ['두 음 응답 → 리듬·쉼·반복과 변형', ['two-note-answer', 'ballad-line', 'major-landing', 'pop-answer', 'ballad-breath', 'blue-turn', 'beginner-finale']],
      ['짧은 16분음표 → 포지션 이동과 엇박 응답', ['speed-window', 'intermediate-finale']],
      ['블루 노트 → 리듬 밀도 전환과 복합 시퀀스', ['blues-burst', 'density-switch', 'advanced-finale']],
    ] },
  { type: '코드톤 런', summary: '코드 구성음을 따라 이동하는 단음 리드 연습', prerequisite: '이 과정은 각 음을 분리하는 리드 연습입니다. 코드 모양을 유지하며 베이스와 높은 음을 함께 뜯는 반주는 아르페지오에서 배웁니다.',
    stages: [
      ['세 줄의 1·3·5음 → 느린 8분음표', ['triad-three-strings', 'triad-eighth-answer']],
      ['두 옥타브 → 코드톤 연결과 메이저7', ['triad-cross', 'pop-chord-route', 'jazz-seventh']],
      ['16분음표 트라이어드 → 메이저7 지그재그', ['triad-engine', 'seventh-weave']],
    ] },
  { type: '아르페지오', summary: '코드를 잡고 베이스·높은 음을 함께 뜯은 뒤 이어가는 분산 반주', prerequisite: '초급은 0–3프렛의 기본 오픈 코드부터 시작합니다. 0은 개방현입니다. 코드표를 미리 잡고, 세로로 겹친 TAB 숫자는 동시에 뜯으세요.',
    stages: [
      ['기본 오픈 코드 한 개 → 두 오픈 코드 반주', ['chord-three-strings', 'chord-two-grips']],
      ['C·Am·F·G → Bmaj7·D#m·Emaj7·Em7 코드 이동', ['chord-accompaniment', 'chord-bass-answer']],
      ['익힌 코드 이동 + 독립 베이스 → 동시 뜯기·엇박·리듬 변형', ['chord-sixteenths', 'chord-density']],
    ] },
  { type: '해머온', summary: '한 번 피킹한 뒤 높은 음을 왼손으로 내기', prerequisite: '낮은 음을 선명하게 짚고 높은 음을 누를 손가락을 준비하세요.',
    stages: [
      ['한 줄 두 음 → 여러 줄의 두 음 연결', ['hammer-single', 'hammer-start']],
      ['세 음 연속 해머온 → 줄 이동', ['hammer-three', 'hammer-crossing']],
      ['16분음표 연속 해머온 → 음형·포지션 변화', ['hammer-drive', 'hammer-sequence']],
    ] },
  { type: '풀오프', summary: '높은 음의 손가락을 떼어 낮은 음으로 연결하기', prerequisite: '도착할 낮은 음을 미리 누르세요. 높은 음만 떼고 낮은 손가락은 유지합니다.',
    stages: [
      ['한 줄 두 음 → 하행 프레이즈', ['pull-single', 'pull-return']],
      ['세 음 연속 풀오프 → 줄 이동', ['pull-three', 'pull-crossing']],
      ['16분음표 연속 풀오프 → 방향을 바꾸는 음형', ['pull-drive', 'pull-sequence']],
    ] },
  { type: '슬라이드', summary: '손가락을 줄에 댄 채 다음 프렛에 도착하기', prerequisite: '두 음을 같은 손가락으로 짚습니다. 도착 프렛과 도착 박자를 함께 확인하세요.',
    stages: [
      ['한 줄 두 프렛 이동 → 두 줄의 왕복', ['slide-single', 'slide-pairs']],
      ['여러 포지션 연결 → 8분음표 도착 제어', ['slide-path', 'slide-crossing']],
      ['16분음표 슬라이드 → 방향·포지션 전환', ['slide-drive', 'slide-sequence']],
    ] },
  { type: '레가토', summary: '해머온·풀오프를 연결해 적은 피킹으로 이어 연주하기', prerequisite: '해머온·풀오프 초급을 먼저 익히세요. 여기서의 초급은 레가토 입문 단계입니다.',
    stages: [
      ['한 줄 H·P 연결과 쉼 → 두 줄에 적용', ['legato-single', 'legato-pairs']],
      ['세 음 H·P 연결 → 슬라이드가 섞인 프레이즈', ['legato-three', 'legato-phrase']],
      ['16분음표 H·P → H·P·SL 복합 연결', ['legato-chain', 'legato-drive']],
    ] },
]);

export const TYPES = Object.freeze(TRACKS.map(track => track.type));
export const TRACK_ORDER = TRACKS.flatMap(track => track.stages.flatMap(([, ids]) => ids));
export const getTrack = type => TRACKS.find(track => track.type === type);
