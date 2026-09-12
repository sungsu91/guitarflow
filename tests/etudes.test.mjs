import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ETUDES, ROOTS, LEVELS, TEMPLATES, TUNING, validateEtude } from '../src/etudes/catalog.js';
import { filterEtudes, changeEtudeFilter, lessonCourse, canOpenLesson, availableStyles, availableRoots } from '../src/etudes/filters.js';
import { OPEN_CHORD_ROOTS } from '../src/etudes/openChordStudies.js';
import { TRACKS, TRACK_ORDER, TYPES } from '../src/etudes/tracks.js';
import { isMobileLandscapeAllowed, shouldGuardPortraitOrientation } from '../src/layouts/viewportProfile.js';

const etudeScoreSource = fs.readFileSync(new URL('../src/etudes/Score.jsx', import.meta.url), 'utf8');
const etudeCssSource = fs.readFileSync(new URL('../src/etudes/etudes.css', import.meta.url), 'utf8');
const etudeStudioSource = fs.readFileSync(new URL('../src/etudes/EtudeStudio.jsx', import.meta.url), 'utf8');

test('score measure numbers stay attached to the staff and Etude remains paper-light in every theme', () => {
  assert.match(etudeScoreSource, /class', 'etudeMeasureNumber'/);
  assert.match(etudeScoreSource, /first \? Math\.max\(start - 14, x \+ 50\) : x \+ 4/);
  assert.match(etudeScoreSource, /measureNumber\.setAttribute\('text-anchor', 'middle'\)/);
  assert.match(etudeScoreSource, /stave\.getYForLine\(0\) - 13/);
  assert.doesNotMatch(etudeScoreSource, /fillText\(String\(index \+ 1\), x \+ 3, y \+ 5\)/);
  assert.match(etudeCssSource, /\.theme-dark \.etudeStudio[\s\S]*color-scheme: light/);
  assert.match(etudeCssSource, /\.etudeNotation svg \.etudeMeasureNumber[\s\S]*font: 800 12px Arial/);
  assert.match(etudeCssSource, /\.theme-dark \.etudeZoom[\s\S]*background: rgba\(245, 248, 245, 0\.985\) !important/);
});

test('etude rotation is allowed without changing portrait-only shooter policy', () => {
  const landscape = { isLandscape: true, isMobileSurface: true };
  assert.equal(isMobileLandscapeAllowed('etudes'), true);
  assert.equal(shouldGuardPortraitOrientation('etudes', landscape), false);
  assert.equal(shouldGuardPortraitOrientation('shooter', landscape), true);
});

test('nine courses cover three levels in their supported keys', () => {
  assert.equal(TRACKS.length,9);
  assert.equal(TEMPLATES.length,65);
  assert.equal(ETUDES.length,451);
  assert.equal(new Set(ETUDES.map(e => e.id)).size,ETUDES.length);
  assert.equal(new Set(TRACK_ORDER).size,TEMPLATES.length);
  assert.deepEqual(new Set(TRACK_ORDER),new Set(TEMPLATES.map(t=>t.id)));
  for (const root of ROOTS) {
    assert.deepEqual(ETUDES.filter(e => e.root === root).map(e=>e.lesson),TRACK_ORDER.flatMap((id,i)=>TEMPLATES.find(t=>t.id===id).roots?.includes(root)===false?[]:[i+1]));
    for(const track of TRACKS) for(const [index,level] of LEVELS.entries()) {
      const course=filterEtudes({root,type:track.type,level,style:'전체'});
      if(!availableRoots({type:track.type,level}).includes(root)) { assert.equal(course.length,0);continue; }
      assert.ok(course.length>=2,`${root} ${track.type} ${level}: incomplete course`);
      assert.deepEqual(course.map(e=>e.templateId),track.stages[index][1]);
      assert.deepEqual(course.map(e=>e.trackLesson),course.map((_,i)=>i+1));
    }
  }
  for (const e of ETUDES) {
    assert.equal(e.measures.length, 8, e.id);
    assert.notDeepEqual(e.measures.slice(0,4), e.measures.slice(4), 'development must not just repeat the opening');
    assert.deepEqual(validateEtude(e), [], e.id);
  }
});

test('changing a course or level never relaxes it to a different technique or level', () => {
  for (const e of ETUDES) for (const key of ['level','type']) {
    for (const value of new Set(ETUDES.map(study=>study[key]))) {
      const next=changeEtudeFilter({root:e.root,level:e.level,style:e.style,type:e.type},key,value);
      const result=filterEtudes(next);
      assert.ok(result.length, `${e.id}: ${key} ${value}`);
      const expectedRoot=availableRoots(next).includes(e.root)?e.root:availableRoots(next)[0];
      assert.ok(result.every(study=>study[key]===value && study.root===expectedRoot));
      assert.equal(next[key==='type'?'level':'type'],e[key==='type'?'level':'type']);
    }
  }
  for(const type of TYPES) for(const level of LEVELS) {
    const filters={type,level,root:'C',style:'전체'};
    for(const style of availableStyles(filters)) {
      const next=changeEtudeFilter(filters,'style',style);
      assert.equal(next.type,type); assert.equal(next.level,level);
      assert.ok(filterEtudes(next).length);
      assert.ok(filterEtudes(next).every(e=>style==='전체'||e.style===style));
    }
    const invalid=changeEtudeFilter(filters,'style','missing');
    assert.deepEqual(invalid,filters);
  }
});

test('lesson counter and navigation use the filtered type and style within a level',()=>{
  const selected=ETUDES.find(e=>e.id==='C-thirds-dialogue');
  const filters={root:'C',level:'중급',type:'스케일',style:'전체'};
  const course=lessonCourse(selected,filters);
  assert.deepEqual(course.map(e=>e.templateId),['thirds-dialogue','pivot-return','fourth-crossing']);
  assert.equal(course.indexOf(selected),0);
  assert.equal(canOpenLesson(selected,ETUDES.find(e=>e.id==='C-rock-penta'),filters),false);
  assert.equal(canOpenLesson(selected,course[1],filters),true);
  assert.equal(lessonCourse(selected,{...filters,style:'기초'}).length,2);
  assert.equal(lessonCourse(selected).length,3);
  assert.equal(canOpenLesson(selected,course[1],{...filters,type:'레가토'}),false);
  assert.equal(canOpenLesson(selected,course[1],{...filters,level:'초급'}),false);
});

test('chord boxes and picked strings agree in all keys',()=>{
  const roots={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  for(const e of ETUDES.filter(e=>e.accompaniment)){
    assert.equal(e.chordShapes.length,8);
    e.measures.forEach((bar,i)=>{
      const box=e.chordShapes[i];
      const [,letter,accidental,quality]=e.harmony[i].match(/^([A-G])([♯♭]?)(m?)$/);
      const tonic=roots[letter]+(accidental==='♯'?1:accidental==='♭'?-1:0);
      const chordTones=[0,quality==='m'?3:4,7];
      for(const [j,fret] of box.frets.entries()) if(fret!==null){
        const interval=(TUNING[5-j]+fret-tonic+120)%12;
        assert.ok(chordTones.includes(interval),`${e.id}: diagram contains a non-chord tone`);
      }
      for(const n of bar.filter(n=>!n.rest)) for(const tone of n.tones ?? [n]) {
        assert.equal(box.frets[6-tone.string],tone.fret);
        assert.ok(chordTones.includes((tone.midi-tonic+120)%12));
      }
    });
    const broken=structuredClone(e);broken.chordShapes[0].frets[6-e.measures[0][0].string]++;
    assert.ok(validateEtude(broken).some(error=>error.includes('코드표와 TAB')));
  }
});

test('65 distinct patterns include phrasing, rests, chord targets and advanced rhythm', () => {
  const course=ETUDES.filter(e=>e.root==='C');
  const fingerprints=course.map(e=>JSON.stringify(e.measures.map(m=>m.map(n=>[n.rest?'rest':(n.tones??[n]).map(t=>t.midi),n.duration,n.technique]))));
  assert.equal(new Set(fingerprints).size,course.length,'keys or titles alone must not inflate the pattern count');
  for(const id of ['penta-hook','ballad-breath','beginner-finale','offbeat-hook','offbeat-drive']) {
    const e=course.find(e=>e.templateId===id);
    assert.ok(e.measures.flat().some(n=>n.rest),id);
    assert.ok(e.measures.flat().filter(n=>n.rest).every(n=>!n.technique));
  }
  const pop=course.find(e=>e.templateId==='pop-chord-route');
  assert.deepEqual(pop.harmony,['C','Am','F','G','C','Am','F','C']);
  const tones={C:[0,4,7],Am:[9,0,4],F:[5,9,0],G:[7,11,2]};
  pop.measures.forEach((m,i)=>assert.ok(tones[pop.harmony[i]].includes(m[0].midi%12)));
  for(const e of course.filter(e=>e.level==='고급')) assert.ok(e.measures.flat().filter(n=>n.duration==='16').length>=64,e.id);
  const broken=structuredClone(course.find(e=>e.templateId==='hammer-start'));
  broken.measures[0][1].rest=true;
  assert.ok(validateEtude(broken).some(error=>error.includes('기법 연결')));
});

test('technique pairs stay on the same string with correct direction and tips', () => {
  for(const e of ETUDES) {
    assert.ok(e.tips.length>=4);
    for(const m of e.measures) for(const [i,n] of m.entries()) if(n.technique) {
      assert.equal(n.string,m[i+1].string);
      const delta=m[i+1].fret-n.fret;
      assert.ok(n.technique==='H'?delta>0:n.technique==='P'?delta<0:delta!==0);
      assert.ok(Math.abs(delta)<=4);
    }
  }
  const broken=structuredClone(ETUDES.find(e=>e.templateId==='hammer-start'));
  broken.measures[0][0].technique='P';
  assert.ok(validateEtude(broken).some(e=>e.includes('기법 방향')));
});

test('lesson navigation stays within the current type, difficulty and key', () => {
  for(const selected of ETUDES) {
    const course=lessonCourse(selected);
    assert.ok(course.includes(selected));
    assert.ok(course.every(e=>e.level===selected.level && e.root===selected.root && e.type===selected.type));
    for(const target of ETUDES) assert.equal(canOpenLesson(selected,target),target.root===selected.root && target.level===selected.level && target.type===selected.type);
    assert.equal(canOpenLesson(selected,undefined),false);
    assert.ok(selected.difficultyReason.startsWith(selected.level));
  }
  assert.equal(ETUDES[0].templateId,'triad-start');
  for(const level of LEVELS) assert.ok(ETUDES.filter(e=>e.root==='C'&&e.level===level).length>=18);
});

test('technique courses teach their named technique and introduce legato progressively', () => {
  const expected={'해머온':['H'],'풀오프':['P'],'슬라이드':['S'],'레가토':['H','P']};
  for(const e of ETUDES.filter(e=>expected[e.type])) {
    const actual=new Set(e.measures.flat().map(n=>n.technique).filter(Boolean));
    for(const mark of expected[e.type]) assert.ok(actual.has(mark),`${e.id}: missing ${mark}`);
    if(e.type!=='레가토') assert.deepEqual([...actual],expected[e.type],`${e.id}: mixed technique in an isolated course`);
  }
  const intro=ETUDES.find(e=>e.id==='C-legato-single');
  assert.equal(new Set(intro.measures.flat().filter(n=>!n.rest).map(n=>n.string)).size,1);
  assert.equal(new Set(intro.measures.flat().filter(n=>!n.rest).map(n=>n.fret)).size,2);
  assert.ok(intro.measures.slice(0,7).every(m=>m.at(-1).rest));
  assert.ok(intro.measures.flat().every(n=>n.duration==='4'));
  const middle=ETUDES.find(e=>e.id==='C-legato-three');
  assert.equal(new Set(middle.measures.flat().map(n=>n.fret)).size,3);
  assert.ok(middle.measures.flat().every(n=>n.duration==='8'));
  const advanced=ETUDES.find(e=>e.id==='C-legato-chain');
  assert.ok(advanced.measures.flat().every(n=>n.duration==='16'));
  assert.ok(new Set(advanced.measures.flat().map(n=>n.string)).size>=3);
  for(const e of ETUDES.filter(e=>e.type==='아르페지오'&&e.level==='초급')) {
    assert.ok(e.chordShapes.every(shape=>!shape.barre));
    assert.ok(e.chordShapes.every(shape=>shape.frets.includes(0)&&shape.frets.every(f=>f===null||(f>=0&&f<=3))));
  }
});

test('the first beginner lesson builds finger spacing one string at a time', () => {
  const first = ETUDES.find(e=>e.id==='C-triad-start');
  assert.equal(first.lesson,1);
  assert.equal(first.type,'스케일');
  assert.equal(first.style,'기초');
  assert.equal(first.bpm,48);
  assert.deepEqual(
    first.measures.slice(0,6).map(measure=>measure.map(note=>[note.string,note.fret])),
    [
      [[6,7],[6,8],[6,7],[6,8]],
      [[5,7],[5,8],[5,7],[5,8]],
      [[4,7],[4,9],[4,7],[4,9]],
      [[3,7],[3,10],[3,7],[3,10]],
      [[2,8],[2,10],[2,8],[2,10]],
      [[1,7],[1,8],[1,7],[1,8]],
    ],
  );
  assert.ok(first.measures.slice(0,6).every(measure=>new Set(measure.map(note=>note.string)).size===1));
  const notes = first.measures.flat();
  for (let index=1; index<notes.length; index++) {
    if (notes[index].string !== notes[index-1].string) {
      assert.equal(Math.abs(notes[index].string-notes[index-1].string),1,'intro string changes stay adjacent');
      assert.notEqual(notes[index].fret,notes[index-1].fret,'intro avoids same-fret vertical jumps');
    }
  }
  assert.equal(first.measures.at(-1).at(-1).midi % 12,0);
  assert.match(etudeStudioSource, /useState\(DEFAULT_ETUDE_BPM\)/);
  assert.match(etudeStudioSource, /updateBpm\(DEFAULT_ETUDE_BPM\)/);
});

test('the late-beginner blues lesson removes surprise vertical and skipped-string moves', () => {
  const blues = ETUDES.find(e=>e.id==='C-blue-turn');
  const notes = blues.measures.flat();
  assert.equal(blues.bpm,64);
  assert.ok(notes.every(note=>note.duration==='8'));
  for (let index=1; index<notes.length; index++) {
    if (notes[index].string !== notes[index-1].string) {
      assert.equal(Math.abs(notes[index].string-notes[index-1].string),1,'beginner blues changes only to an adjacent string');
      assert.notEqual(notes[index].fret,notes[index-1].fret,'beginner blues avoids same-fret vertical jumps');
    }
  }
});

test('beginner single-note lessons avoid unannounced vertical and skipped-string jumps', () => {
  for (const etude of ETUDES.filter(e=>e.level==='초급'&&!e.accompaniment)) {
    const notes = etude.measures.flat();
    for (let index=1; index<notes.length; index++) {
      const previous = notes[index-1];
      const current = notes[index];
      if (previous.rest || current.rest || previous.string===current.string) continue;
      assert.equal(Math.abs(current.string-previous.string),1,`${etude.id}: skipped string`);
      assert.notEqual(current.fret,previous.fret,`${etude.id}: same-fret vertical jump`);
    }
  }
});

test('independent pitch spelling, transposition, duration and movement checks', () => {
  const pitch = { c:0, d:2, e:4, f:5, g:7, a:9, b:11 };
  const sig = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  for (const e of ETUDES) {
    const notes = e.measures.flat().filter(n=>!n.rest);
    // Technical cells may begin on a chord third (e.g. a descending pull-off).
    // Their cadence is still the tonic; every written/sounding pitch is checked below.
    assert.equal(notes.at(-1).midi % 12, sig[e.root]);
    for (const [i,n] of notes.entries()) {
      for(const tone of n.tones ?? [n]) {
        const [,letter,alter,oct] = tone.pitch.key.match(/^([a-g])([#b]?)[/]([0-9])$/);
        const writtenMidi = (Number(oct)+1)*12 + pitch[letter] + (alter === '#' ? 1 : alter === 'b' ? -1 : 0);
        assert.equal(writtenMidi, TUNING[tone.string-1] + tone.fret + 12, `${e.id} ${i}: octave-transposing guitar notation`);
      }
      // A held chord assigns different right-hand fingers to separated strings;
      // scalar lead-note travel is not its left-hand difficulty measure.
      if (i && !e.accompaniment) {
        assert.ok(Math.abs(n.fret-notes[i-1].fret) <= 5, `${e.id}: unplanned large fret jump`);
        assert.ok(Math.abs(n.string-notes[i-1].string) <= (e.accompaniment ? 3 : 2), `${e.id}: unplanned string jump`);
      }
    }
    for (const m of e.measures) assert.equal(m.reduce((sum,n)=>sum+16/Number(n.duration),0),16);
  }
});

test('arpeggio accompaniment has root pinches, held feasible grips and graded bass patterns',()=>{
  const roots={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  for(const e of ETUDES.filter(e=>e.type==='아르페지오')) {
    assert.equal(e.accompaniment,true);
    assert.match(e.tips.join(' '),/동시에 뜯/);
    for(const [i,bar] of e.measures.entries()) {
      const [,letter,acc]=e.harmony[i].match(/^([A-G])([♯♭]?)/);
      const root=(roots[letter]+(acc==='♯'?1:acc==='♭'?-1:0)+12)%12;
      assert.ok(bar[0].tones?.length>=2,`${e.id} ${i}: missing root pinch`);
      assert.equal(Math.min(...bar[0].tones.map(t=>t.midi))%12,root);
      const grip=e.chordShapes[i];
      const frets=grip.frets.filter(f=>f!==null);
      assert.ok(Math.max(...frets)-Math.min(...frets)<=3,`${e.id}: overstretched chord`);
      assert.ok(new Set(grip.fingers.filter(Boolean)).size<=4);
      if(i) {
        const previous=e.chordShapes[i-1].frets.filter(f=>f!==null);
        assert.ok(Math.abs(Math.min(...frets)-Math.min(...previous))<=4);
      }
      if(e.level==='초급') {
        assert.ok(!grip.barre);
        assert.ok(frets.length>=4 && frets.length<=6);
        assert.ok(frets.includes(0));
        assert.ok(frets.every(f=>f>=0&&f<=3));
        assert.ok(bar.every(n=>n.duration==='4'));
        assert.ok(bar.every(n=>!n.tones||n.tones.length===2));
      }
      if(e.templateId==='chord-bass-answer') {
        assert.equal(bar[4].tones[0].midi%12,(root+7)%12,'beat 3 alternates to fifth');
      }
    }
  }
  assert.ok(ETUDES.filter(e=>e.type==='코드톤 런').every(e=>!e.accompaniment&&!e.measures.flat().some(n=>n.tones)));
  const advanced=ETUDES.find(e=>e.id==='C-chord-density');
  assert.ok(advanced.measures.every(m=>m[0].tones.length===3));
});

test('validator checks every simultaneous tone, duplicate strings and unchanged beat duration',()=>{
  const source=ETUDES.find(e=>e.id==='C-chord-three-strings');
  assert.deepEqual(source.measures[0][0].tones.map(t=>[t.string,t.fret,t.midi]),[[5,3,48],[2,1,60]]);
  for(const mutate of [n=>n.tones[1].fret++, n=>n.tones[1].pitch.octave++, n=>n.tones[1].string=n.tones[0].string, n=>n.tones=[]]) {
    const broken=structuredClone(source); mutate(broken.measures[0][0]);
    assert.ok(validateEtude(broken).length);
  }
  for(const m of source.measures) assert.equal(m.reduce((sum,n)=>sum+4/Number(n.duration),0),4);
});

test('beginner arpeggios use real low-position open grips with no movable-shape fallback',()=>{
  const expected={C:[null,3,2,0,1,0],D:[null,null,0,2,3,2],E:[0,2,2,1,0,0],G:[3,2,0,0,0,3],A:[null,0,2,2,2,0]};
  assert.deepEqual(availableRoots({type:'아르페지오',level:'초급'}),OPEN_CHORD_ROOTS);
  for(const root of OPEN_CHORD_ROOTS) {
    const first=ETUDES.find(e=>e.id===`${root}-chord-three-strings`);
    assert.deepEqual(first.chordShapes[0].frets,expected[root]);
    assert.ok(first.measures.flat().filter(n=>!n.rest).flatMap(n=>n.tones??[n]).some(n=>n.fret===0));
    for(const chord of first.chordShapes) assert.ok(!chord.barre);
  }
  const c=ETUDES.find(e=>e.id==='C-chord-two-grips');
  assert.deepEqual(c.chordShapes[2].frets,[null,0,2,2,1,0]);
  assert.deepEqual(c.harmony,['C','C','Am','Am','C','C','Am','C']);
  assert.ok(!ETUDES.some(e=>e.level==='초급'&&e.type==='아르페지오'&&['F','B'].includes(e.root)));
  for(const root of ROOTS)assert.ok(ETUDES.some(e=>e.root===root&&e.type==='아르페지오'&&e.level==='중급'));
  const intermediate=ETUDES.find(e=>e.id==='C-chord-accompaniment');
  assert.deepEqual(intermediate.chordShapes[0].frets,expected.C);
  assert.deepEqual(intermediate.chordShapes[2].frets,[null,null,3,2,1,1]);
});

test('F major uses Bb; B major A#; C blues Gb and natural G', () => {
  assert.ok(ETUDES.find(e=>e.id==='F-first-path').measures.flat().some(n=>n.pitch.letter==='B'&&n.pitch.alter===-1));
  assert.ok(ETUDES.find(e=>e.id==='B-first-path').measures.flat().some(n=>n.pitch.letter==='A'&&n.pitch.alter===1));
  const blue = ETUDES.find(e=>e.id==='C-blue-turn').measures.flat();
  assert.ok(blue.some(n=>n.pitch.letter==='G'&&n.pitch.alter===-1));
  assert.ok(blue.some(n=>n.pitch.letter==='G'&&n.pitch.alter===0));
});

test('validator catches corrupt TAB, spelling, meter and scale membership', () => {
  for (const mutate of [n=>n.fret++, n=>n.pitch.octave++, n=>n.duration=n.duration==='4'?'8':'4', n=>n.midi++]) {
    const broken = structuredClone(ETUDES[0]); mutate(broken.measures[0][0]);
    assert.ok(validateEtude(broken).length);
  }
});
