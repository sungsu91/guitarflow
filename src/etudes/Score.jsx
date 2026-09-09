import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { drawChordDiagram } from './chordStudy.js';
import { Renderer, Stave, TabStave, StaveNote, TabNote, GhostNote, Voice, Formatter, Beam, Accidental, StaveConnector, Barline, TabTie, TabSlide, Curve, StaveLine } from 'vexflow';

export function drawScore(element, etude, { mobile = false, enlarged = false, landscape = false, bpm = etude.bpm } = {}) {
  element.replaceChildren();
  // Two bars per system at a fixed vector width: layout stays legible and
  // does not rasterize when the page is zoomed. Dense sixteenths use one on mobile.
  const dense = etude.measures.some(measure => measure.length > 8);
  const perRow = mobile && !landscape && (enlarged || dense) ? 1 : 2;
  const width = mobile && landscape ? (dense ? 1100 : 980) : mobile ? (enlarged && !dense ? 460 : perRow === 1 ? 600 : 740) : 980;
  const chordHeight=etude.chordShapes?120:0;
  const rowHeight = 228+chordHeight;
  const height = Math.ceil(etude.measures.length / perRow) * rowHeight + 50;
  const renderer = new Renderer(element, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const context = renderer.getContext();
  const metrics = [];
  etude.measures.forEach((measure, index) => {
    const first = index % perRow === 0;
    const x = 12 + (index % perRow) * (width - 24) / perRow;
    const y = 18 + Math.floor(index / perRow) * rowHeight+chordHeight;
    if(etude.chordShapes) drawChordDiagram(element.querySelector('svg'),etude.chordShapes[index],etude.harmony[index],x+12,y-chordHeight);
    const w = (width - 24) / perRow;
    const stave = new Stave(x, y, w);
    const tab = new TabStave(x, y + 84, w);
    if (first) {
      stave.addClef('treble', 'default', '8vb').addKeySignature(etude.keySignature);
      tab.addClef('tab');
    }
    if (index === 0) stave.addTimeSignature('4/4');
    if (index === etude.measures.length - 1) {
      stave.setEndBarType(Barline.type.END);
      tab.setEndBarType(Barline.type.END);
    }
    stave.setContext(context);
    tab.setContext(context);
    const start = Math.max(stave.getNoteStartX(), tab.getNoteStartX());
    stave.setNoteStartX(start);
    tab.setNoteStartX(start);
    stave.draw(); tab.draw();
    const measureNumber = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    measureNumber.textContent = String(index + 1);
    measureNumber.setAttribute('class', 'etudeMeasureNumber');
    measureNumber.setAttribute('x', String(x + 7));
    measureNumber.setAttribute('y', String(stave.getYForLine(0) - 13));
    measureNumber.setAttribute('text-anchor', 'start');
    element.querySelector('svg').append(measureNumber);
    if(etude.harmony?.[index]&&!etude.chordShapes) context.setFont('Arial',14,'bold').fillText(etude.harmony[index],x+35,y+5);
    if (first) new StaveConnector(stave, tab).setType(StaveConnector.type.BRACKET).setContext(context).draw();
    const notes = measure.map(n => new StaveNote({ keys: [n.rest?'b/4':n.pitch.key], duration: n.duration+(n.rest?'r':''), auto_stem: true }));
    const tabs = measure.map(n => {
      if(n.rest) return new GhostNote({duration:n.duration});
      const note = new TabNote({ positions: [{ str: n.string, fret: n.fret }], duration: n.duration });
      note.render_options.font = '18px Arial';
      return note;
    });
    const voice = new Voice({ num_beats: 4, beat_value: 4 }).addTickables(notes);
    const tabVoice = new Voice({ num_beats: 4, beat_value: 4 }).addTickables(tabs);
    // Accidental state is reset every bar, including naturals after blue notes.
    Accidental.applyAccidentals([voice], etude.keySignature);
    const beams = Beam.generateBeams(notes);
    new Formatter().joinVoices([voice]).joinVoices([tabVoice]).formatToStave([voice, tabVoice], stave);
    voice.draw(context, stave); tabVoice.draw(context, tab);
    beams.forEach(beam => beam.setContext(context).draw());
    measure.forEach((n, i) => {
      if (!n.technique) return;
      const tabPair = { first_note: tabs[i], last_note: tabs[i + 1], first_indices: [0], last_indices: [0] };
      context.openGroup('etude-technique');
      if (n.technique === 'S') {
        const slide = new TabSlide(tabPair);
        slide.renderText = () => {}; // One shared, legible label renderer below.
        slide.setContext(context).draw();
        new StaveLine({ ...tabPair, first_note: notes[i], last_note: notes[i + 1] }).setContext(context).draw();
      } else {
        new TabTie(tabPair).setContext(context).draw();
        new Curve(notes[i], notes[i + 1], { cps: [{x:0,y:8},{x:0,y:8}] }).setContext(context).draw();
      }
      // Keep labels above all six TAB lines. Explicit SVG text avoids small
      // italic defaults and a white halo keeps curves from thinning the letters.
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.textContent = n.technique === 'S' ? 'SL' : n.technique;
      label.setAttribute('class', 'etudeTechniqueLabel');
      label.setAttribute('x', String((tabs[i].getAbsoluteX() + tabs[i + 1].getAbsoluteX()) / 2));
      label.setAttribute('y', String(tab.getYForLine(0) - 16));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('style', 'font:700 18px Arial,sans-serif;fill:#111;stroke:white;stroke-width:3px;paint-order:stroke fill;stroke-linejoin:round');
      element.querySelector('svg').append(label);
      context.closeGroup();
    });
    metrics.push(notes.map((n, i) => ({ noteX: n.getAbsoluteX(), tabX: tabs[i].getAbsoluteX(), end: x + w,
      rest:measure[i].rest, line: n.getKeyProps()[0].line, expectedLine: measure[i].rest ? n.getKeyProps()[0].line : ((measure[i].pitch.octave - 3) * 7 + 'CDEFGAB'.indexOf(measure[i].pitch.letter)) / 2,
      accidentals: n.getModifiers().filter(m => m.getCategory() === 'Accidental').map(m => m.type) })));
  });
  const svg = element.querySelector('svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${etude.title}, 4/4, BPM ${bpm}, 오선보와 TAB`);
  svg.style.width = '100%'; svg.style.height = 'auto'; svg.style.display = 'block';
  return metrics;
}

// Keep only a bounded set of detached vector trees. Navigating away still
// unmounts the studio and stops audio; returning doesn't engrave it again.
const scoreCache = new Map();
export function renderCachedScore(element, etude, options = {}) {
  const key = `${etude.id}:${Boolean(options.mobile)}:${Boolean(options.enlarged)}:${Boolean(options.landscape)}`;
  const cached = scoreCache.get(key);
  if (cached?.etude === etude) {
    scoreCache.delete(key); scoreCache.set(key, cached);
    element.replaceChildren(cached.svg.cloneNode(true));
    return 'cached';
  }
  drawScore(element, etude, options);
  scoreCache.set(key, { etude, svg: element.querySelector('svg').cloneNode(true) });
  if (scoreCache.size > 12) scoreCache.delete(scoreCache.keys().next().value);
  return 'engraved';
}

function Score({ etude, mobile, bpm, enlarged = false }) {
  const ref = useRef(null);
  const [error, setError] = useState('');
  const [landscape, setLandscape] = useState(() => window.matchMedia('(orientation: landscape)').matches);
  useLayoutEffect(() => {
    const query = window.matchMedia('(orientation: landscape)');
    const update = () => setLandscape(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    try { renderCachedScore(ref.current, etude, { mobile, enlarged, landscape }); setError(''); }
    catch (e) { ref.current?.replaceChildren(); setError('악보를 표시하지 못했습니다. 다른 연습곡을 선택해 주세요.'); console.error(e); }
  }, [etude, mobile, enlarged, landscape]);
  useEffect(() => {
    ref.current?.querySelector('svg')?.setAttribute('aria-label', `${etude.title}, 4/4, BPM ${bpm}, 오선보와 TAB`);
  }, [etude, mobile, enlarged, landscape, bpm]);
  return <>{error && <p role="alert">{error}</p>}<div className="etudeNotation" ref={ref} /></>;
}
export default memo(Score);
