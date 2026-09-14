import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { drawChordDiagram } from './chordStudy.js';
import { Renderer, Stave, TabStave, StaveNote, TabNote, GhostNote, Voice, Formatter, Beam, Accidental, StaveConnector, Barline, TabTie, TabSlide, Curve, StaveLine, StaveTie } from 'vexflow';

export function drawScore(element, etude, { mobile = false, enlarged = false, landscape = false, bpm = etude.bpm, editor = false, barOffset = 0 } = {}) {
  element.replaceChildren();
  // Two bars per system at a fixed vector width: layout stays legible and
  // does not rasterize when the page is zoomed. Dense sixteenths use one on mobile.
  const dense = etude.measures.some(measure => measure.length > 8);
  const perRow = editor ? 1 : mobile && !landscape && (enlarged || dense) ? 1 : 2;
  const width = mobile && landscape ? (dense ? 1100 : 980) : mobile ? (enlarged && !dense ? 460 : perRow === 1 ? 600 : 740) : 980;
  const chordHeight=etude.chordShapes?120:0;
  // User edits may add high notes. Reserve headroom for their ledger lines
  // instead of clipping the top of the SVG or colliding with a chord box.
  const highestLine=Math.max(7,...etude.measures.flat().filter(n=>!n.rest).flatMap(n=>n.tones??[n]).map(n=>((n.pitch.octave-3)*7+'CDEFGAB'.indexOf(n.pitch.letter))/2));
  const headroom=Math.ceil(Math.max(0,highestLine-7)*10);
  const rowHeight = 228+chordHeight+headroom;
  const height = Math.ceil(etude.measures.length / perRow) * rowHeight + 50;
  const renderer = new Renderer(element, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const context = renderer.getContext();
  const metrics = [];
  const drawn=[];
  etude.measures.forEach((measure, index) => {
    const first = index % perRow === 0;
    const x = 12 + (index % perRow) * (width - 24) / perRow;
    const y = 18 + Math.floor(index / perRow) * rowHeight+chordHeight+headroom;
    if(etude.chordShapes?.[index]) drawChordDiagram(element.querySelector('svg'),etude.chordShapes[index],etude.harmony[index],x+12,y-chordHeight-headroom);
    const w = (width - 24) / perRow;
    const stave = new Stave(x, y, w);
    const tab = new TabStave(x, y + 84, w);
    if (first) {
      stave.addClef('treble', 'default', '8vb').addKeySignature(etude.keySignature);
      tab.addClef('tab');
    }
    if (index === 0) stave.addTimeSignature((etude.meter??[4,4]).join('/'));
    if (index === etude.measures.length - 1) {
      stave.setEndBarType(Barline.type.END);
      tab.setEndBarType(Barline.type.END);
    }
    stave.setContext(context);
    tab.setContext(context);
    const start = Math.max(stave.getNoteStartX(), tab.getNoteStartX());
    stave.setNoteStartX(start);
    tab.setNoteStartX(start);
    context.openGroup('fretiva-staff-view'); stave.draw(); context.closeGroup(); context.openGroup('fretiva-tab-view'); tab.draw(); context.closeGroup();
    if(etude.accompaniment && first) context.setFont('Arial',13,'italic').fillText('let ring',x+150,y-45);
    // Keep the first number of each system inside the clef/key-signature area.
    // Other measure numbers sit directly above the barline that starts them.
    const measureNumberX = first ? Math.max(start - 14, x + 50) : x + 4;
    const measureNumber = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    measureNumber.textContent = String(index + barOffset + 1);
    measureNumber.setAttribute('class', 'etudeMeasureNumber');
    measureNumber.setAttribute('x', String(measureNumberX));
    measureNumber.setAttribute('y', String(stave.getYForLine(0) - 13));
    measureNumber.setAttribute('text-anchor', 'middle');
    element.querySelector('svg').append(measureNumber);
    if(etude.harmony?.[index]&&!etude.chordShapes) context.setFont('Arial',14,'bold').fillText(etude.harmony[index],x+35,y+5);
    if (first) {context.openGroup('fretiva-both-view');new StaveConnector(stave, tab).setType(StaveConnector.type.BRACKET).setContext(context).draw();context.closeGroup();}
    const notes = measure.map(n => new StaveNote({ keys: n.rest ? ['b/4'] : (n.tones ?? [n]).map(t=>t.pitch.key), duration: n.duration+(n.rest?'r':''), auto_stem: true }));
    const tabs = measure.map(n => {
      if(n.rest) return new GhostNote({duration:n.duration});
      const note = new TabNote({ positions: (n.tones ?? [n]).map(t=>({ str: t.string, fret: t.fret })), duration: n.duration });
      note.render_options.font = '18px Arial';
      return note;
    });
    const voice = new Voice({ num_beats: (etude.meter??[4,4])[0], beat_value: (etude.meter??[4,4])[1] }).setMode(Voice.Mode.SOFT).addTickables(notes);
    const tabVoice = new Voice({ num_beats: (etude.meter??[4,4])[0], beat_value: (etude.meter??[4,4])[1] }).setMode(Voice.Mode.SOFT).addTickables(tabs);
    // Accidental state is reset every bar, including naturals after blue notes.
    Accidental.applyAccidentals([voice], etude.keySignature);
    const beams = Beam.generateBeams(notes);
    new Formatter().joinVoices([voice]).joinVoices([tabVoice]).formatToStave([voice, tabVoice], stave);
    context.openGroup('fretiva-staff-view');voice.draw(context, stave);context.closeGroup();context.openGroup('fretiva-tab-view');tabVoice.draw(context, tab);context.closeGroup();
    measure.forEach((event,i)=>drawn.push({event,note:notes[i],tab:tabs[i],row:Math.floor(index/perRow)}));
    measure.forEach((event,i)=>{
      const text=[event.pickStroke==='down'?'Π':event.pickStroke==='up'?'V':'',...(event.tones??[event]).map(n=>[n.finger?`L${n.finger}`:'',n.rightFinger??''].filter(Boolean).join('/'))].filter(Boolean).join(' ');
      if(text){context.openGroup('fretiva-tab-view');context.setFont('Arial',14,'bold').fillText(text,tabs[i].getAbsoluteX()-4,tab.getYForLine(5)+25);context.closeGroup();}
    });
    // Use a common SVG anchor for a pinch instead of separate glyph-width
    // offsets: mobile font measurement can otherwise shift one/two-digit frets.
    measure.forEach((event,i)=>{
      if(!event.tones)return;
      for(const digit of tabs[i].getSVGElement()?.querySelectorAll('text') ?? []) {
        digit.setAttribute('x',String(tabs[i].getStemX()));
        digit.setAttribute('text-anchor','middle');
        digit.style.font='18px Arial';
        digit.style.letterSpacing='0';
      }
    });
    context.openGroup('fretiva-staff-view');beams.forEach(beam => beam.setContext(context).draw());context.closeGroup();
    measure.forEach((n, i) => {
      if (!n.technique || !tabs[i+1] || n.rest || measure[i+1].rest || n.tones || measure[i+1].tones) return;
      const tabPair = { first_note: tabs[i], last_note: tabs[i + 1], first_indices: [0], last_indices: [0] };
      context.openGroup('etude-technique');
      if (n.technique === 'S') {
        const slide = new TabSlide(tabPair);
        slide.renderText = () => {}; // One shared, legible label renderer below.
        context.openGroup('fretiva-tab-view');slide.setContext(context).draw();context.closeGroup();
        context.openGroup('fretiva-staff-view');new StaveLine({ ...tabPair, first_note: notes[i], last_note: notes[i + 1] }).setContext(context).draw();context.closeGroup();
      } else {
        context.openGroup('fretiva-tab-view');new TabTie(tabPair).setContext(context).draw();context.closeGroup();
        context.openGroup('fretiva-staff-view');new Curve(notes[i], notes[i + 1], { cps: [{x:0,y:8},{x:0,y:8}] }).setContext(context).draw();context.closeGroup();
      }
      // Keep labels above all six TAB lines. Explicit SVG text avoids small
      // italic defaults and a white halo keeps curves from thinning the letters.
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.textContent = n.technique === 'S' ? 'SL' : n.technique;
      label.setAttribute('class', 'etudeTechniqueLabel fretiva-tab-view');
      label.setAttribute('x', String((tabs[i].getAbsoluteX() + tabs[i + 1].getAbsoluteX()) / 2));
      label.setAttribute('y', String(tab.getYForLine(0) - 16));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('style', 'font:700 18px Arial,sans-serif;fill:#111;stroke:white;stroke-width:3px;paint-order:stroke fill;stroke-linejoin:round');
      element.querySelector('svg').append(label);
      context.closeGroup();
    });
    if(editor) {
      const svg=element.querySelector('svg'),ns='http://www.w3.org/2000/svg';
      const centers=tabs.map((t,i)=>measure[i].rest?t.getAbsoluteX():t.getStemX());
      const spacing=tab.getYForLine(1)-tab.getYForLine(0);
      measure.forEach((event,i)=>{
        const px=centers[i],left=i?(centers[i-1]+px)/2:px-20,right=i+1<tabs.length?(px+centers[i+1])/2:x+w-5;
        for(let string=1;string<=6;string++){
          const hit=document.createElementNS(ns,'rect');
          Object.entries({x:left,y:tab.getYForLine(string-1)-spacing/2,width:Math.max(1,right-left),height:spacing,'data-cursor-x':px-12,'data-cursor-y':tab.getYForLine(string-1)-7,'data-event':i,'data-string':string,'data-mode':'tab',class:'etudeEditorHit',fill:'transparent'}).forEach(([k,v])=>hit.setAttribute(k,String(v)));svg.append(hit);
        }
        const hit=document.createElementNS(ns,'rect');
        Object.entries({x:left,y:stave.getYForLine(0)-25-headroom,width:Math.max(1,right-left),height:100+headroom,'data-cursor-x':px-12,'data-event':i,'data-mode':'staff','data-staff-bottom':stave.getYForLine(4),class:'etudeEditorHit',fill:'transparent'}).forEach(([k,v])=>hit.setAttribute(k,String(v)));svg.append(hit);
        // Ledger lines belong to sounding notes, not empty staff positions.
        // Follow VexFlow's note-head geometry, including displaced chord heads.
        // Paint the nearest owner last where a chord shares a ledger line;
        // note-head handles below retain priority over all ledger extensions.
        const heads=notes[i].noteHeads,ledgerHits=[];
        if(!event.rest)for(const [j,tone] of (event.tones??[event]).entries()){
          const head=heads[j],line=head.getLine(),direction=line>=6?1:-1;
          const cx=head.getAbsoluteX()+head.getWidth()/2,cy=head.getY();
          for(let ledger=direction===1?6:0;direction===1?ledger<=line:ledger>=line;ledger+=direction){
            const ly=stave.getYForNote(ledger),padding=notes[i].render_options.stroke_px;
            ledgerHits.push({distance:Math.abs(ly-cy),attributes:{
              x:head.getAbsoluteX()-padding-2,y:ly-3,
              width:head.getWidth()+padding*2+4,height:6,
              'data-event':i,'data-string':tone.string,'data-mode':'staff',
              'data-midi':tone.midi,'data-staff-bottom':stave.getYForLine(4),
              'data-cursor-x':cx-12,'data-cursor-y':cy-7,
              class:'etudeEditorHit etudeLedgerHit',fill:'transparent',
            }});
          }
        }
        for(const {attributes} of ledgerHits.sort((a,b)=>b.distance-a.distance)){
          const ledgerHit=document.createElementNS(ns,'rect');
          Object.entries(attributes).forEach(([k,v])=>ledgerHit.setAttribute(k,String(v)));svg.append(ledgerHit);
        }
        if(!event.rest)for(const [j,tone] of (event.tones??[event]).entries())for(const mode of ['tab','staff']){
          const handle=document.createElementNS(ns,'rect'),cx=mode==='tab'?px:heads[j].getAbsoluteX()+heads[j].getWidth()/2,cy=mode==='tab'?tab.getYForLine(tone.string-1):notes[i].getYs()[j],hitHeight=mode==='tab'?Math.min(14,spacing):10;
          Object.entries({x:cx-10,y:cy-hitHeight/2,width:20,height:hitHeight,'data-event':i,'data-string':tone.string,'data-drag-tone':tone.string,'data-mode':mode,'data-staff-bottom':stave.getYForLine(4),'data-midi':tone.midi,'data-cursor-x':cx-12,'data-cursor-y':cy-7,class:'etudeEditorHit etudeNoteHandle',fill:'transparent'}).forEach(([k,v])=>handle.setAttribute(k,String(v)));svg.append(handle);
        }
      });
    }
    metrics.push(notes.map((n, i) => ({ noteX: n.getAbsoluteX(), tabX: tabs[i].getAbsoluteX(), end: x + w,
      rest:measure[i].rest, line: n.getKeyProps()[0].line, expectedLine: measure[i].rest ? n.getKeyProps()[0].line : ((measure[i].pitch.octave - 3) * 7 + 'CDEFGAB'.indexOf(measure[i].pitch.letter)) / 2,
      tones: measure[i].rest ? [] : (measure[i].tones ?? [measure[i]]).map((tone,j)=>({
        line:n.getKeyProps()[j].line, expectedLine:((tone.pitch.octave-3)*7+'CDEFGAB'.indexOf(tone.pitch.letter))/2,
        tab:tabs[i].getPositions()[j], expectedTab:{str:tone.string,fret:tone.fret},
      })),
      accidentals: n.getModifiers().filter(m => m.getCategory() === 'Accidental').map(m => m.type) })));
  });
  if(etude.incomingTie&&drawn[0]&&!drawn[0].event.rest){
    const b=drawn[0],indices=(b.event.tones??[b.event]).map((_,j)=>j);
    context.openGroup('fretiva-staff-view');new StaveTie({last_note:b.note,first_indices:indices,last_indices:indices}).setContext(context).draw();context.closeGroup();
    context.openGroup('fretiva-tab-view');new TabTie({last_note:b.tab,first_indices:indices,last_indices:indices},'').setContext(context).draw();context.closeGroup();
  }
  for(let i=0;i<drawn.length;i++){
    const a=drawn[i],b=drawn[i+1];if(!a.event.tieTo||a.event.rest)continue;
    const same=b?.event.id===a.event.tieTo&&!b.event.rest&&b.row===a.row;
    const indices=(a.event.tones??[a.event]).map((_,j)=>j);
    context.openGroup('fretiva-staff-view');new StaveTie({first_note:a.note,last_note:same?b.note:undefined,first_indices:indices,last_indices:indices}).setContext(context).draw();context.closeGroup();
    context.openGroup('fretiva-tab-view');new TabTie({first_note:a.tab,last_note:same?b.tab:undefined,first_indices:indices,last_indices:indices},'').setContext(context).draw();context.closeGroup();
    if(b?.event.id===a.event.tieTo&&!same){context.openGroup('fretiva-staff-view');new StaveTie({last_note:b.note,first_indices:indices,last_indices:indices}).setContext(context).draw();context.closeGroup();context.openGroup('fretiva-tab-view');new TabTie({last_note:b.tab,first_indices:indices,last_indices:indices},'').setContext(context).draw();context.closeGroup();}
  }
  const svg = element.querySelector('svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${etude.title}, ${(etude.meter??[4,4]).join("/")}, BPM ${bpm}, 오선보와 TAB`);
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
    ref.current?.querySelector('svg')?.setAttribute('aria-label', `${etude.title}, ${(etude.meter??[4,4]).join("/")}, BPM ${bpm}, 오선보와 TAB`);
  }, [etude, mobile, enlarged, landscape, bpm]);
  return <>{error && <p role="alert">{error}</p>}<div className="etudeNotation" ref={ref} /></>;
}
export default memo(Score);
