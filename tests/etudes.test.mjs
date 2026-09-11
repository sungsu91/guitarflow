import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ETUDES, ROOTS, TUNING, validateEtude } from '../src/etudes/catalog.js';
import { filterEtudes, changeEtudeFilter, lessonCourse, canOpenLesson } from '../src/etudes/filters.js';
import { isMobileLandscapeAllowed, shouldGuardPortraitOrientation } from '../src/layouts/viewportProfile.js';

const etudeScoreSource = fs.readFileSync(new URL('../src/etudes/Score.jsx', import.meta.url), 'utf8');
const etudeCssSource = fs.readFileSync(new URL('../src/etudes/etudes.css', import.meta.url), 'utf8');
const etudeStudioSource = fs.readFileSync(new URL('../src/etudes/EtudeStudio.jsx', import.meta.url), 'utf8');

test('score measure numbers stay attached to the staff and Etude remains paper-light in every theme', () => {
  assert.match(etudeScoreSource, /class', 'etudeMeasureNumber'/);
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

test('259 complete studies: seven keys and thirty-seven ordered lessons', () => {
  assert.equal(ETUDES.length, 259);
  assert.equal(new Set(ETUDES.map(e => e.id)).size, 259);
  for (const root of ROOTS) assert.deepEqual(ETUDES.filter(e => e.root === root).map(e=>e.lesson), Array.from({length:37},(_,i)=>i+1));
  for (const e of ETUDES) {
    assert.equal(e.measures.length, 8, e.id);
    assert.notDeepEqual(e.measures.slice(0,4), e.measures.slice(4), 'development must not just repeat the opening');
    assert.deepEqual(validateEtude(e), [], e.id);
  }
});

test('every selectable facet produces matching studies from conflicting prior filters', () => {
  for (const e of ETUDES) for (const key of ['level','style','type']) {
    for (const value of new Set(ETUDES.map(study=>study[key]))) {
      const next=changeEtudeFilter({root:e.root,level:e.level,style:e.style,type:e.type},key,value);
      const result=filterEtudes(next);
      assert.ok(result.length, `${e.id}: ${key} ${value}`);
      assert.ok(result.every(study=>study[key]===value && study.root===e.root));
    }
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
  assert.equal(lessonCourse(selected,{...filters,type:'전체'}).length,13);
  assert.deepEqual(lessonCourse(selected,{...filters,level:'전체'}),course);
});

test('chord boxes and picked strings agree in all keys',()=>{
  const roots={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const degrees=[0,9,5,7,0,9,7,0];
  for(const e of ETUDES.filter(e=>e.accompaniment)){
    assert.equal(e.chordShapes.length,8);
    e.measures.forEach((bar,i)=>{
      const box=e.chordShapes[i];
      const chordTones=[0,i===1||i===5?3:4,7];
      for(const [j,fret] of box.frets.entries()) if(fret!==null){
        const interval=(TUNING[5-j]+fret-roots[e.root]-degrees[i]+120)%12;
        assert.ok(chordTones.includes(interval),`${e.id}: diagram contains a non-chord tone`);
      }
      for(const n of bar) assert.equal(box.frets[6-n.string],n.fret);
    });
    const broken=structuredClone(e);broken.chordShapes[0].frets[0]++;
    assert.ok(validateEtude(broken).some(error=>error.includes('코드표와 TAB')));
  }
});

test('37 distinct patterns include phrasing, rests, chord targets and advanced rhythm', () => {
  const course=ETUDES.filter(e=>e.root==='C');
  const fingerprints=course.map(e=>JSON.stringify(e.measures.map(m=>m.map(n=>[n.rest?'rest':n.midi,n.duration,n.technique]))));
  assert.equal(new Set(fingerprints).size,37,'keys or titles alone must not inflate the pattern count');
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

test('lesson navigation stays within the current difficulty, including All filter', () => {
  for(const selected of ETUDES) {
    const course=lessonCourse(selected);
    assert.ok(course.includes(selected));
    assert.ok(course.every(e=>e.level===selected.level && e.root===selected.root));
    for(const target of ETUDES) assert.equal(canOpenLesson(selected,target),target.root===selected.root && target.level===selected.level);
    assert.equal(canOpenLesson(selected,undefined),false);
    assert.ok(selected.difficultyReason.startsWith(selected.level));
  }
  assert.equal(ETUDES[0].templateId,'triad-start');
  assert.deepEqual(['초급','중급','고급'].map(level=>ETUDES.filter(e=>e.root==='C'&&e.level===level).length),[12,13,12]);
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

test('beginner lessons avoid unannounced vertical and skipped-string jumps', () => {
  for (const etude of ETUDES.filter(e=>e.level==='초급')) {
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
    assert.equal(notes[0].midi % 12, e.templateId==='triad-start' ? (sig[e.root]+11)%12 : sig[e.root]);
    assert.equal(notes.at(-1).midi % 12, sig[e.root]);
    for (const [i,n] of notes.entries()) {
      const [,letter,alter,oct] = n.pitch.key.match(/^([a-g])([#b]?)[/]([0-9])$/);
      const writtenMidi = (Number(oct)+1)*12 + pitch[letter] + (alter === '#' ? 1 : alter === 'b' ? -1 : 0);
      assert.equal(writtenMidi, TUNING[n.string-1] + n.fret + 12, `${e.id} ${i}: octave-transposing guitar notation`);
      if (i) {
        assert.ok(Math.abs(n.fret-notes[i-1].fret) <= 5, `${e.id}: unplanned large fret jump`);
        assert.ok(Math.abs(n.string-notes[i-1].string) <= (e.accompaniment ? 3 : 2), `${e.id}: unplanned string jump`);
      }
    }
    for (const m of e.measures) assert.equal(m.reduce((sum,n)=>sum+16/Number(n.duration),0),16);
  }
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
