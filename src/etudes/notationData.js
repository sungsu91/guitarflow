export const TUNING = Object.freeze([64, 59, 55, 50, 45, 40]);
export const ROOTS = Object.freeze(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
export const NATURAL = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const MAJOR = [0, 2, 4, 5, 7, 9, 11];
export const MINOR = [0, 2, 3, 5, 7, 8, 10];
export const PENTA = [0, 3, 5, 7, 10];
export const BLUES = [0, 3, 5, 6, 7, 10];
export const TECHNIQUES = Object.freeze({ H: '해머온', P: '풀오프', S: '슬라이드' });

export function parseChord(symbol) {
  const match=symbol.match(/^([A-G])([#♯b♭]?)(maj7|m7|m|7|add9)?$/);
  if(!match)throw new Error('지원하지 않는 코드: '+symbol);
  const [,letter,acc,quality='']=match;
  const root=letter+(acc==='♯'?'#':acc==='♭'?'b':acc);
  const pc=(NATURAL[letter]+(acc==='#'||acc==='♯'?1:acc==='b'||acc==='♭'?-1:0)+12)%12;
  const intervals=quality==='maj7'?[0,4,7,11]:quality==='m7'?[0,3,7,10]:quality==='7'?[0,4,7,10]:quality==='add9'?[0,2,4,7]:quality==='m'?[0,3,7]:[0,4,7];
  return {root,pc,intervals,family:quality==='m'||quality==='m7'?'minor':'major'};
}

export function spellMidi(midi, root, family, blue = false) {
  const degrees = family === 'major' ? MAJOR : MINOR;
  const tonic=NATURAL[root[0]]+(root[1]==='#'?1:root[1]==='b'?-1:0);
  const interval = ((midi - tonic) % 12 + 12) % 12;
  const degree = blue && interval === 6 ? 4 : interval === 10 && family === 'major' ? 6 : degrees.indexOf(interval);
  if (degree < 0) throw new Error(`음계 밖의 음: ${root} ${midi}`);
  const letter = ROOTS[(ROOTS.indexOf(root[0]) + degree) % 7];
  let alter = ((midi % 12) - NATURAL[letter] + 18) % 12 - 6;
  const octave = (midi - NATURAL[letter] - alter) / 12 - 1;
  return { letter, alter, octave, key: `${letter.toLowerCase()}${alter === -1 ? 'b' : alter === 1 ? '#' : ''}/${octave + 1}` };
}

export function validateEtude(etude) {
  const errors = [];
  etude.measures.forEach((measure, bar) => {
    if (measure.reduce((sum, n) => sum + 4 / Number(n.duration), 0) !== 4) errors.push(`마디 ${bar + 1}: 박자 합계`);
    measure.forEach((n, i) => {
      const label = `${bar + 1}:${i + 1}`;
      const sounding = n.tones ?? [n];
      if(n.tones && (n.rest || n.tones.length<2 || n.technique || new Set(n.tones.map(t=>t.string)).size!==n.tones.length)) errors.push(`${label}: 동시음 구성`);
      if(n.tones && ['string','fret','midi'].some(key=>n[key]!==n.tones[0]?.[key])) errors.push(`${label}: 동시음 기준음`);
      for(const tone of sounding) {
        if(etude.chordShapes && !n.rest && etude.chordShapes[bar]?.frets[6-tone.string]!==tone.fret) errors.push(`${label}: 코드표와 TAB 불일치`);
        if (tone.string < 1 || tone.string > 6 || !Number.isInteger(tone.fret) || tone.fret < 0 || tone.fret > 24) errors.push(`${label}: 운지 범위`);
        if (TUNING[tone.string - 1] + tone.fret !== tone.midi) errors.push(`${label}: TAB 음높이`);
        if ((tone.pitch.octave + 1) * 12 + NATURAL[tone.pitch.letter] + tone.pitch.alter !== tone.midi) errors.push(`${label}: 기보 음높이`);
        const chord=etude.accompaniment ? parseChord(etude.harmony[bar]) : null;
        if (!n.rest && !(chord?.intervals??etude.intervals).includes((tone.midi - (chord?.pc??NATURAL[etude.root]) + 120) % 12)) errors.push(`${label}: 음계 또는 코드 구성음`);
      }
      if (n.technique) {
        const next = measure[i + 1];
        if (!TECHNIQUES[n.technique] || n.rest || !next || next.rest || next.string !== n.string || next.fret === n.fret) errors.push(`${label}: 기법 연결`);
        else if ((n.technique === 'H' && next.fret < n.fret) || (n.technique === 'P' && next.fret > n.fret)) errors.push(`${label}: 기법 방향`);
      }
    });
  });
  return errors;
}

