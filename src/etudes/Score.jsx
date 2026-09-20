import {slidePairs} from './slidePairs.js';
import {tabPositions} from './tabPositions.js';
import {tuningCaption} from './scoreTuning.js';
import usePracticeFollow from './usePracticeFollow.js';
import {measureMeters,meterTicks} from './scoreMeters.js';
import usePlaybackFollow from './usePlaybackFollow.js';
import {drawPalmMute} from './drawPalmMute.js';
import {scoreInstrument,staffStepForPitch} from './scoreInstruments.js';
import {drawScoreNavigation,alignNavigationEndings} from './drawScoreNavigation.js';
import {NAV_COMMANDS} from './scoreNavigation.js';
import {repeatMarks} from './scoreRepeats.js';
import {playheadX} from './scorePlayhead.js';
import {overrideBeamGroups} from './beamOverrides.js';
import {measureLayout} from './measureLayout.js';
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {isBlankEvent,tupletGroups,ticksOf} from './scoreModel.js';
import {drawTabRhythm,drawTabRests,rhythmGroups} from './tabRhythm.js';
import { drawChordDiagram } from './chordStudy.js';
import { Clef, Dot, Stem, Renderer, Stave, TabStave, StaveNote, TabNote, GhostNote, Tuplet, Voice, Formatter, Beam, Accidental, StaveConnector, Barline, TimeSignature, TabTie, TabSlide, Curve, StaveLine, StaveTie } from 'vexflow';

// Leave a little breathing room between vertically stacked fret numbers.
const TAB_LINE_SPACING = 16;

function addInstrumentTabClef(tab){
 const count=tab.getNumLines(),clef=new Clef('tab',count===4?'small':'default');
 clef.clef={...clef.clef,line:(count-1)/2};
 tab.addModifier(clef);
}

// Four-string TAB needs a smaller numeric signature within its three spaces.
// Use the same modifier for spacing and engraving, including print/reader views.
function addTabTimeSignature(tab,spec){
 const signature=new TimeSignature(spec);
 if(tab.getNumLines()===4){signature.point*=.75;signature.topLine=.75;signature.bottomLine=2.25;signature.setTimeSig(spec);}
 tab.addModifier(signature);
}

// GhostNote preserves an unentered slot's ticks but has no stem. VexFlow 4
// treats it as a rest and asks for its stem when positioning a tuplet label.
// Keep all three members for timing/spacing, using only entered notes for height.
// VexFlow's TAB dot is placed at the stem base above TAB. Our rhythm is below
// TAB, so place one aligned duration dot beside each fret, as in printed TAB.
class TabFretDots extends Dot {
  draw() {
    const ctx=this.checkContext(),note=this.checkAttachedNote();this.setRendered();
    const start=note.getModifierStartXY(this.position,0);
    const group=ctx.openGroup('tab-duration-dots');
    group.setAttribute('data-dotted-event','true');
    for(const y of note.getYs()){
      ctx.beginPath();ctx.arc(start.x+this.width-this.radius,y,this.radius,0,Math.PI*2,false);ctx.fill();
    }
    ctx.closeGroup();
  }
}
// Fret glyphs and staff noteheads have different widths. Sharing a tick context
// aligns their left edges; compensate at drawing time to align their centers.
// TAB stems, ties, picking, hit targets and cursors all consume this same X.
class AlignedTabNote extends TabNote {
  constructor(options, staffNote) {super(options);this.staffNote=staffNote;}
  getAbsoluteX() {
    const x=super.getAbsoluteX();
    return this.staffNote?x+this.staffNote.getXShift()+(this.staffNote.getGlyphWidth()-this.getGlyphWidth())/2:x;
  }
}
class EditableTuplet extends Tuplet {
  getYPosition() {
    if (!this.getNotes().some(note => note instanceof GhostNote)) return super.getYPosition();
    let y = this.getNotes()[0].checkStave().getYForLine(0) - Tuplet.metrics.topModifierOffset;
    for (const note of this.getNotes()) {
      if (!note.hasStem()) continue;
      const extents = note.getStemExtents();
      y = Math.min(y, note.getStemDirection() === 1
        ? extents.topY - Tuplet.metrics.stemOffset
        : extents.baseY - Tuplet.metrics.noteHeadOffset);
    }
    return y;
  }
}


function prepareMeasure(measure, etude) {
    const notes = measure.map(n => isBlankEvent(n)?new GhostNote({duration:n.duration+(n.dotted?'d':'')}):new StaveNote({ clef:scoreInstrument(etude.instrument).clef, keys: n.rest ? [scoreInstrument(etude.instrument).clef==='bass'?'d/3':'b/4'] : (n.tones ?? [n]).map(t=>t.pitch.key+((t.dead??n.dead)?'/x':'')), duration: n.duration+(n.dotted?'d':'')+(n.rest?'r':''), auto_stem: true }));
    const tabs = measure.map((n,i) => {
      if(n.rest) return new GhostNote({duration:n.duration+(n.dotted?'d':'')});
      const note = new AlignedTabNote({ positions: tabPositions(n,scoreInstrument(etude.instrument).tuning.length), duration: n.duration+(n.dotted?'d':'') },notes[i]);
      note.render_options.font = '18px Arial';
      note.render_options.draw_dots = true;
      if(n.dotted&&etude.tabRhythmVisible!==false)note.addModifier(new TabFretDots(),0);
      return note;
    });
    measure.forEach((n,i)=>{if(n.dotted&&!isBlankEvent(n))Dot.buildAndAttach([notes[i]],{all:true});});
    const tuplets=tupletGroups(measure).map(group=>{
      new Tuplet(group.map(i=>tabs[i]),{num_notes:3,notes_occupied:2});
      const tuplet=new EditableTuplet(group.map(i=>notes[i]),{num_notes:3,notes_occupied:2,bracketed:true,ratioed:false});
      return {tuplet, visible:group.some(i=>!isBlankEvent(measure[i]))};
    });
    const voice = new Voice({ num_beats: (etude.meter??[4,4])[0], beat_value: (etude.meter??[4,4])[1] }).setMode(Voice.Mode.SOFT).addTickables(notes);
    const tabVoice = new Voice({ num_beats: (etude.meter??[4,4])[0], beat_value: (etude.meter??[4,4])[1] }).setMode(Voice.Mode.SOFT).addTickables(tabs);
    // Accidental state is reset every bar, including naturals after blue notes.
    Accidental.applyAccidentals([voice], etude.keySignature);
    let beams = Beam.generateBeams(notes,{groups:Beam.getDefaultBeamGroups((etude.meter??[4,4]).join('/'))});
    if(measure.some(n=>n.tuplet||n.beamBefore==='join'||n.beamBefore==='break')){
      const automatic=measure.some(n=>n.tuplet)?rhythmGroups(measure,etude.meter):beams.map(beam=>beam.getNotes().map(note=>notes.indexOf(note)));
      notes.forEach(note=>note.setBeam(undefined));
      beams=overrideBeamGroups(measure,automatic).filter(group=>group.length>1).map(group=>new Beam(group.map(i=>notes[i]),true));
    }
    return {notes,tabs,tuplets,voice,tabVoice,beams};
}

const spacingCache = new WeakMap();
function measureSpacing(measure, etude, view) {
  const key=`${etude.instrument}/${etude.keySignature}/${(etude.meter??[4,4]).join('/')}/${view}`;
  const cached=spacingCache.get(measure);
  if(cached?.key===key)return cached.value;
  const {notes,tabs,voice,tabVoice}=prepareMeasure(measure,etude);
  const voices=view==='tab'?[tabVoice]:view==='staff'?[voice]:[voice,tabVoice];
  const formatter=new Formatter();
  voices.forEach(v=>formatter.joinVoices([v]));formatter.format(voices,0);
  let elapsed=0;
  const value=(view==='tab'?tabs:notes).map((note,i)=>{
    const tick=measure[i].onset??elapsed;elapsed=tick+ticksOf(measure[i]);
    const metrics=note.getTickContext().getMetrics();
    const tabOverhang=view==='staff'||measure[i].rest?0:Math.max(0,(tabs[i].getGlyphWidth()-notes[i].getGlyphWidth())/2);
    return {tick,left:Math.max(metrics.totalLeftPx,tabOverhang),right:metrics.notePx+metrics.totalRightPx};
  });
  spacingCache.set(measure,{key,value});return value;
}

// Reserve system symbols separately from rhythmic space. Every bar in a row
// uses the same tick scale by default. Mobile editor rows instead allocate
// space to each bar's actual density, without resizing other rows. This is
// engraving geometry only: musical onset/duration and the audio clock stay intact.
export function scoreSpacing(etude, {placements,view='both',width=600,barOffset=0,independentRows=false}={}) {
  const meters=measureMeters(etude);
  const rows=[];
  placements.forEach((placement,i)=>{
    const meter=meters[i],capacity=meterTicks(meter),meterChanged=i>0&&meter.join()!==meters[i-1].join();
    const first=placement.column===1,stave=new Stave(0,0,1000),tab=new TabStave(0,0,1000,{num_lines:scoreInstrument(etude.instrument).tuning.length,spacing_between_lines_px:TAB_LINE_SPACING});
    if(first){stave.addClef(scoreInstrument(etude.instrument).clef,'default',scoreInstrument(etude.instrument).octaveShift?'8vb':undefined).addKeySignature(etude.keySignature);addInstrumentTabClef(tab);}
    if(i+barOffset===0||meterChanged){stave.addTimeSignature(meter.join('/'));if(view==='tab')addTabTimeSignature(tab,meter.join('/'));}
    if(!first){stave.setBegBarType(Barline.type.NONE);tab.setBegBarType(Barline.type.NONE);}
    if(repeatMarks(etude)[i]?.repeatStart){stave.setBegBarType(Barline.type.REPEAT_BEGIN);tab.setBegBarType(Barline.type.REPEAT_BEGIN);}
    const tail=repeatMarks(etude)[i]?.repeatEnd?36:20;
    const prefix=view==='tab'?tab.getNoteStartX():stave.getNoteStartX();
    const points=measureSpacing(etude.measures[i],{...etude,meter},view);
    // Note.getAbsoluteX adds the font's stave padding again after noteStartX.
    // Replace that default gap with a compact 10px clearance, keeping the full
    // measured accidental / displaced-note / TAB overhang before the first note.
    const notePadding=Stave.defaultPadding-Stave.rightPadding;
    const inset=(points[0]?.left??0)+10-notePadding;
    const command=NAV_COMMANDS.find(([kind])=>kind===repeatMarks(etude)[i]?.command)?.[1];
    const navigationWidth=command?command.length*8+16:0;
    (rows[placement.row-1]??=[]).push({index:i,prefix,points,inset,tail,navigationWidth,capacity});
  });
  // Reserve the same opening-symbol area across systems, including the
  // first time signature, so later systems do not shift their beat columns.
  const openingPrefix=Math.max(0,...rows.map(bars=>bars[0]?.prefix??0));
  rows.forEach(bars=>{if(bars[0])bars[0].inset+=openingPrefix-bars[0].prefix;});
  const specs=rows.map(bars=>{
    let scale=0;
    for(const bar of bars){
     bar.scale=Math.max(0,(bar.navigationWidth-bar.prefix-bar.inset-bar.tail)/bar.capacity);
     bar.intervals=[];
     for(let i=0;i<bar.points.length;i++){
      const point=bar.points[i],next=bar.points[i+1];
      const delta=(next?.tick??bar.capacity)-point.tick;
      if(delta>0)bar.scale=Math.max(bar.scale,(point.right+(next?.left??0)+8)/delta);
      // Rhythmic duration is not a demand for proportional blank paper.
      // A quarter after sixteenths needs more space, but not four times as
      // much. The final note needs only a small clearance before the barline.
      const weight=Math.min(next?Infinity:1.5,Math.sqrt(Math.max(1,delta)/120));
      bar.intervals.push({weight,width:Math.max(point.right+(next?.left??0)+8,14*weight)});
     }
     bar.naturalWidth=Math.max(bar.intervals.reduce((sum,gap)=>sum+gap.width,0),bar.navigationWidth-bar.prefix-bar.inset-bar.tail);
     scale=Math.max(scale,bar.scale);
    }
    const fixed=24+bars.reduce((sum,bar)=>sum+bar.prefix+bar.inset+bar.tail,0);
    return {bars,scale,fixed,minimum:fixed+bars.reduce((sum,bar)=>sum+(independentRows?bar.naturalWidth:bar.capacity*scale),0)};
  });
  const totalWidth=Math.max(width,...specs.map(row=>row.minimum));
  const measures=[];
  for(const {bars,scale,fixed,minimum} of specs){
    const rowWidth=independentRows?Math.max(width,minimum):totalWidth;
    const capacity=bars.reduce((sum,bar)=>sum+bar.capacity,0);
    const weight=bars.reduce((sum,bar)=>sum+bar.intervals.reduce((n,gap)=>n+gap.weight,0),0);
    const spareUnit=(rowWidth-minimum)/(weight||1);
    const sharedScale=Math.max(scale,(rowWidth-fixed)/capacity);
    let x=12;
    bars.forEach((bar,i)=>{
      const tickScale=sharedScale;
      let rhythmicWidth=0;
      const positions=independentRows?bar.intervals.map(gap=>{const position=rhythmicWidth;rhythmicWidth+=gap.width+gap.weight*spareUnit;return position;}):undefined;
      if(independentRows)rhythmicWidth+=bar.naturalWidth-bar.intervals.reduce((sum,gap)=>sum+gap.width,0);
      const barWidth=bar.prefix+bar.inset+bar.tail+(independentRows?rhythmicWidth:bar.capacity*tickScale);
      const leading=i===0?12:0,trailing=i===bars.length-1?12:0;
      measures[bar.index]={x,width:barWidth,cellX:x-leading,cellWidth:barWidth+leading+trailing,
        rowWidth,inset:bar.inset,tickScale,positions};
      x+=barWidth;
    });
  }
  return {width:totalWidth,measures};
}

export function drawScore(element, etude, { mobile = false, enlarged = false, landscape = false, bpm = etude.bpm, editor = false, barOffset = 0, tabRhythm = Boolean(etude.document) && etude.document.viewSettings?.tabRhythm !== false, tabBeamPosition=etude.document?.viewSettings?.tabBeamPosition??'below',tabPickingPosition=etude.document?.viewSettings?.tabPickingPosition??'below',editorWidth, engraving, responsive=false, measuresPerRow=0, systemStart=true, systemEnd=true, scoreEnd=true, systemHeadroom=0, systemFootroom=0, systemNavigation=false, view=etude.document?.viewSettings?.notationView??'both' } = {}) {
  const stringCount=scoreInstrument(etude.instrument).tuning.length;
  const numberOnly=etude.document?.viewSettings?.tabRhythm===false||(editor&&!tabRhythm);
  etude={...etude,tabRhythmVisible:!numberOnly};
  const upperSpace=view!=='staff'&&((tabRhythm&&tabBeamPosition==='above')||tabPickingPosition==='above')?78:0;
  element.replaceChildren();
  // Respect authored line breaks, then size vector engraving to its rhythmic
  // and symbol requirements. Unconfigured dense studies use one bar on mobile.
  const dense = etude.measures.some(measure => measure.length > 8);
  const perRow = editor ? 1 : measuresPerRow ? measuresPerRow : responsive ? Math.max(1,Math.min(6,Math.floor((editorWidth??980)/(dense?340:260)))) : etude.document?.viewSettings?.measuresPerRow ?? (mobile && !landscape && (enlarged || dense) ? 1 : 2);
  const placements=measureLayout(etude.document?.measures??etude.measures.map((_,i)=>({id:String(i)})),perRow,etude.document?.viewSettings?.systemBreaks??[]);
  const baseWidth=mobile&&landscape?(dense?1100:980):mobile?(enlarged?460:view==='both'?600:400):980;
  const spacing=engraving?null:scoreSpacing(etude,{placements,view,width:editorWidth??baseWidth,barOffset});
  const width=engraving?engraving.cellWidth:spacing.width;
  const chordHeight=etude.chordShapes?120:0;
  // User edits may add high notes. Reserve headroom for their ledger lines
  // instead of clipping the top of the SVG or colliding with a chord box.
  const highestLine=Math.max(7,...etude.measures.flat().filter(n=>!n.rest).flatMap(n=>n.tones??[n]).map(n=>(staffStepForPitch(n.pitch,etude.instrument)+2)/2));
  const lowestStep=Math.min(-7,...etude.measures.flat().filter(n=>!n.rest).flatMap(n=>n.tones??[n]).map(n=>staffStepForPitch(n.pitch,etude.instrument)));
  const footroom=view==='tab'?0:Math.max(systemFootroom,(-7-lowestStep)*5);
  const navigationHeight=systemNavigation||repeatMarks(etude).some(m=>m.ending||m.marker||m.command)?52:0;
  const headroom=navigationHeight+(view==='tab'?0:Math.max(systemHeadroom,Math.ceil(Math.max(0,highestLine-7)*10)));
  // Compact only the generated practice TAB reader; fret sizes and string spacing stay intact.
  const compactTab=responsive&&!editor&&view==='tab';
  const compactRhythm=compactTab&&mobile&&tabBeamPosition==='below';
  const extraTabRoom=compactTab&&etude.measures.some(bar=>bar.some(e=>e.tuplet||e.picking||e.palmMute))?22:0;
  const rowHeight = (view==='tab'?(compactTab?86:144):view==='staff'?140:(responsive&&!editor?210:228))+extraTabRoom+chordHeight+headroom+footroom+upperSpace+(tabRhythm&&view!=='staff'?(compactRhythm?45:55):0)+(view==='staff'?0:(stringCount-1)*(TAB_LINE_SPACING-13));
  const height = (placements.at(-1)?.row??1) * rowHeight + 50;
  const renderer = new Renderer(element, Renderer.Backends.SVG);
  renderer.resize(width, height);
  // Size the SVG before engraving, so even an interrupted draw cannot expose
  // its natural 600/980px width in a narrow mobile viewport.
  const initialSvg = element.querySelector('svg');
  initialSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  Object.assign(initialSvg.style, {width:'100%', height:'auto', aspectRatio:`${width} / ${height}`, display:'block'});
  const context = renderer.getContext();
  const noteElement=note=>element.querySelector(`[id="vf-${note.getAttribute('id')}"]`);
  const metrics = [];
  const drawn=[],navigation=[];
  const meters=measureMeters(etude);
  etude.measures.forEach((measure, index) => {
    const meter=meters[index],meterChanged=index>0&&meter.join()!==meters[index-1].join();
    const placement=placements[index],first=editor?systemStart:placement.column===1;
    const geometry=engraving??spacing.measures[index];
    const x = editor?(systemStart?12:0):geometry.x;
    const y = 18 + (placement.row-1) * rowHeight+chordHeight+headroom;
    if(etude.chordShapes?.[index]) drawChordDiagram(element.querySelector('svg'),etude.chordShapes[index],etude.harmony[index],x+12,y-chordHeight-headroom);
    const w = geometry.width;
    const stave = new Stave(x, y, w);
    const tab = new TabStave(x, y + (view==='tab'?0:84+footroom)+upperSpace, w,{num_lines:stringCount,spacing_between_lines_px:TAB_LINE_SPACING});
    if (first) {
      stave.addClef(scoreInstrument(etude.instrument).clef,'default',scoreInstrument(etude.instrument).octaveShift?'8vb':undefined).addKeySignature(etude.keySignature);
      addInstrumentTabClef(tab);
    }
    if (index + barOffset === 0||meterChanged) {stave.addTimeSignature(meter.join('/'));if(view==='tab')addTabTimeSignature(tab,meter.join('/'));}
    if(!first){stave.setBegBarType(Barline.type.NONE);tab.setBegBarType(Barline.type.NONE);}
    // Adjacent editor measures use separate SVGs. VexFlow draws a SINGLE
    // end bar to the right of x + width, where the SVG viewport clips it off.
    if(editor&&!systemEnd){stave.setEndBarType(Barline.type.NONE);tab.setEndBarType(Barline.type.NONE);}
    if (index === etude.measures.length - 1 && (!editor||scoreEnd)) {
      stave.setEndBarType(Barline.type.END);
      tab.setEndBarType(Barline.type.END);
    }
    const marks=repeatMarks(etude)[index]??{};
    if(marks.endBarline){const type={single:Barline.type.SINGLE,double:Barline.type.DOUBLE,final:Barline.type.END}[marks.endBarline];if(type!==undefined){stave.setEndBarType(type);tab.setEndBarType(type);}} 
    if(marks.repeatStart){stave.setBegBarType(Barline.type.REPEAT_BEGIN);tab.setBegBarType(Barline.type.REPEAT_BEGIN);}
    if(marks.repeatEnd){stave.setEndBarType(Barline.type.REPEAT_END);tab.setEndBarType(Barline.type.REPEAT_END);}
    stave.setContext(context);
    tab.setContext(context);
    const start = view==='tab'?tab.getNoteStartX():Math.max(stave.getNoteStartX(), tab.getNoteStartX());
    stave.setNoteStartX(start);
    tab.setNoteStartX(start);
    const staffGroup=context.openGroup('fretiva-staff-view');staffGroup.dataset.repeatStart=String(Boolean(marks.repeatStart));staffGroup.dataset.repeatEnd=String(Boolean(marks.repeatEnd));staffGroup.dataset.systemStart=String(first);staffGroup.dataset.timeSignature=String(index+barOffset===0);staffGroup.dataset.measure=String(index+barOffset);stave.draw(); context.closeGroup(); const tabGroup=context.openGroup('fretiva-tab-view');tabGroup.dataset.tabTimeSignature=String(view==='tab'&&index+barOffset===0);tab.draw(); context.closeGroup();
    if(editor&&!systemEnd&&!marks.repeatEnd){
      for(const [staff,group] of [[stave,staffGroup],[tab,tabGroup]]){
        const boundary=document.createElementNS('http://www.w3.org/2000/svg','line');
        Object.entries({x1:width-1.5,x2:width-1.5,y1:staff.getYForLine(0),y2:staff.getYForLine(staff===tab?stringCount-1:4),stroke:'#171717','stroke-width':1,'vector-effect':'non-scaling-stroke',class:'etudeMeasureBoundary','pointer-events':'none'}).forEach(([key,value])=>boundary.setAttribute(key,String(value)));
        group.append(boundary);
      }
    }
    if(etude.accompaniment && first) context.setFont('Arial',13,'italic').fillText('let ring',x+150,y-45);
    // Keep the first number of each system inside the clef/key-signature area.
    // Other measure numbers sit directly above the barline that starts them.
    const measureNumberX = first ? Math.max(start - 14, x + 50) : x + 4;
    const measureNumber = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    measureNumber.textContent = String(index + barOffset + 1);
    measureNumber.setAttribute('class', 'etudeMeasureNumber');
    measureNumber.setAttribute('x', String(measureNumberX));
    measureNumber.setAttribute('y', String((view==='tab'?tab:stave).getYForLine(0) - 13));
    measureNumber.setAttribute('text-anchor', 'middle');
    element.querySelector('svg').append(measureNumber);
    if(etude.harmony?.[index]&&!etude.chordShapes) context.setFont('Arial',14,'bold').fillText(etude.harmony[index],x+35,y+5);
    if (first) {context.openGroup('fretiva-both-view');new StaveConnector(stave, tab).setType(StaveConnector.type.BRACKET).setContext(context).draw();context.closeGroup();}
    const {notes,tabs,tuplets,voice,tabVoice,beams}=prepareMeasure(measure,{...etude,meter});
    navigation.push({mark:marks,previous:etude.navigationPrevious??repeatMarks(etude)[index-1],next:etude.navigationNext??repeatMarks(etude)[index+1],x,width:w,top:(view==='tab'?tab:stave).getYForLine(0),first,last:systemEnd,index:index+barOffset,row:placement.row,notes,tabs,tuplets,beams,measure,measureNumberX,start});
    new Formatter().joinVoices([voice]).joinVoices([tabVoice]).formatToStave([voice, tabVoice], stave);
    let elapsed=0;
    notes.forEach((note,i)=>{
      const tick=measure[i].onset??elapsed;elapsed=tick+ticksOf(measure[i]);
      note.getTickContext().setX(geometry.inset+(geometry.positions?.[i]??tick*geometry.tickScale));
    });
    context.openGroup('fretiva-staff-view');voice.draw(context, stave);context.closeGroup();context.openGroup('fretiva-tab-view');tabVoice.draw(context, tab);context.closeGroup();
    measure.forEach((event,i)=>drawn.push({event,note:notes[i],tab:tabs[i],row:placement.row}));
    // Rests belong inside TAB, independently of the optional lower rhythm stems.
    if(!numberOnly)drawTabRests(element.querySelector('svg'),measure,notes,tab.getYForLine((stringCount-1)/2)).dataset.scoreBar=index;
    const beamGeometry=beams.map(beam=>({indices:beam.getNotes().map(note=>notes.indexOf(note)),xs:beam.getNotes().map(note=>note.getStemX()-Stem.WIDTH/2),levels:['4','8'].map(duration=>beam.getBeamLines(duration))}));
    if(tabRhythm){drawTabRhythm(element.querySelector('svg'),measure,tabs,tab,beamGeometry,tabBeamPosition,{compact:compactRhythm});element.querySelectorAll('.etudeTabRhythm').item(index).dataset.scoreBar=index;}
    for(const list of [notes,tabs])list.forEach((note,i)=>{const node=noteElement(note);if(node){node.dataset.scoreBar=index;node.dataset.scoreEvent=i;}});
    measure.forEach((event,i)=>{
      const px=tabs[i].getAbsoluteX(),py=tabPickingPosition==='above'?tab.getYForLine(0)-(tabRhythm&&tabBeamPosition==='above'?((measure.some(e=>e.tuplet)?70:48)+2*(TAB_LINE_SPACING-13)):(measure.some(e=>e.palmMute)?36:14)):tab.getYForLine(stringCount-1)+(tabRhythm&&tabBeamPosition!=='above'?((measure.some(e=>e.tuplet)?72:56)+2*(TAB_LINE_SPACING-13)):25),svg=element.querySelector('svg'),ns='http://www.w3.org/2000/svg';
      const text=[event.pickStroke==='down'?'Π':event.pickStroke==='up'?'V':'',...(event.tones??[event]).map(n=>[n.finger?`L${n.finger}`:'',n.rightFinger??''].filter(Boolean).join('/'))].filter(Boolean).join(' ');
      if(text){const pickGroup=context.openGroup('fretiva-tab-view');pickGroup.setAttribute('data-picking-position',tabPickingPosition);context.setFont('Arial',14,'bold').fillText(text,px-4,py);context.closeGroup();}
      if(editor&&event.pickStroke){const hit=document.createElementNS(ns,'rect');Object.entries({x:px-10,y:py-17,width:24,height:26,class:'etudeEditorHit etudePickHit fretiva-tab-view','data-event':i,'data-string':(event.tones??[event])[0].string,'data-mode':'tab','data-cursor-x':px-12,'data-cursor-y':py-17,fill:'transparent'}).forEach(([k,v])=>hit.setAttribute(k,v));svg.append(hit);}
    });
    // Use a common SVG anchor for a pinch instead of separate glyph-width
    // offsets: mobile font measurement can otherwise shift one/two-digit frets.
    measure.forEach((event,i)=>{
      if(!event.tones)return;
      for(const digit of noteElement(tabs[i])?.querySelectorAll('text') ?? []) {
        digit.setAttribute('x',String(tabs[i].getStemX()));
        digit.setAttribute('text-anchor','middle');
        digit.style.font='18px Arial';
        digit.style.letterSpacing='0';
      }
    });
    measure.forEach((event,i)=>{
      if(event.rest)return;
      const svg=element.querySelector('svg'),ns='http://www.w3.org/2000/svg',x=tabs[i].getStemX(),ys=(event.tones??[event]).map(t=>tab.getYForLine(t.string-1)),top=Math.min(...ys),bottom=Math.max(...ys);
      const path=(d,kind)=>{const node=document.createElementNS(ns,'path');Object.entries({d,fill:'none',stroke:'#171717','stroke-width':1.6,class:`fretiva-tab-view ${kind}`,'pointer-events':'none'}).forEach(([k,v])=>node.setAttribute(k,v));svg.append(node);};
      if(event.vibrato){let d=`M ${x-7} ${top-(event.palmMute&&ys.includes(tab.getYForLine(0))?36:15)}`;for(let n=0;n<4;n++)d+=' q 3 -5 6 0 q 3 5 6 0';path(d,'tabVibrato');}
      if(event.arpeggio&&ys.length>1){const ax=x-19;let d=`M ${ax} ${top-5}`;for(let y=top-5;y<bottom+5;y+=8)d+=' q -4 2 0 4 q 4 2 0 4';path(d,'tabArpeggio');const ay=event.arpeggio==='up'?top-8:bottom+10,sign=event.arpeggio==='up'?1:-1;path(`M ${ax-4} ${ay+sign*5} L ${ax} ${ay} L ${ax+4} ${ay+sign*5}`,'tabArpeggioArrow');}
    });
    const palmMuteObstacles=drawPalmMute(element.querySelector('svg'),measure,view==='staff'?notes:tabs,view==='staff'?stave:tab,{staff:view==='staff',headroom,tabRhythm});
    navigation.at(-1).palmMuteObstacles=palmMuteObstacles;
    context.openGroup('fretiva-staff-view');beams.forEach(beam => {const group=context.openGroup('etude-beam');group.setAttribute('data-beam-events',beam.getNotes().map(note=>notes.indexOf(note)).join(','));beam.setContext(context).draw();context.closeGroup();});tuplets.forEach(({tuplet,visible})=>{if(visible)tuplet.setContext(context).draw();});context.closeGroup();
    measure.forEach((n, i) => {
      if (!n.technique || !tabs[i+1] || n.rest || measure[i+1].rest || (n.technique !== 'S' && (n.tones || measure[i+1].tones))) return;
      const tabPair = { first_note: tabs[i], last_note: tabs[i + 1], first_indices: [0], last_indices: [0] };
      context.openGroup('etude-technique');
      if (n.technique === 'S') {
        for (const pair of slidePairs(n, measure[i+1])) {
        const slidePair = {...tabPair, first_indices:[pair.first], last_indices:[pair.last]};
        const slide = new TabSlide(slidePair);
        slide.renderText = () => {}; // One shared, legible label renderer below.
        context.openGroup('fretiva-tab-view');slide.setContext(context).draw();context.closeGroup();
        context.openGroup('fretiva-staff-view');new StaveLine({ ...slidePair, first_note: notes[i], last_note: notes[i + 1] }).setContext(context).draw();context.closeGroup();
        }
      } else {
        context.openGroup('fretiva-tab-view');new TabTie(tabPair).setContext(context).draw();context.closeGroup();
        context.openGroup('fretiva-staff-view');new Curve(notes[i], notes[i + 1], { cps: [{x:0,y:8},{x:0,y:8}] }).setContext(context).draw();context.closeGroup();
      }
      // Center on the connected frets and lift dense pairs farther from string 1.
      // Recalculate after engraving so narrower bars and two-digit frets keep
      // the same clearance, including the P.M. and upper picking lanes.
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.textContent = n.technique === 'S' ? 'SL' : n.technique;
      label.setAttribute('class', 'etudeTechniqueLabel fretiva-tab-view');
      const firstX=tabs[i].getStemX(),lastX=tabs[i+1].getStemX();
      label.setAttribute('x', String((firstX+lastX)/2));
      let labelY=tab.getYForLine(0)-18-Math.max(0,36-Math.abs(lastX-firstX))*.35;
      label.setAttribute('y', String(labelY));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('style', 'font:700 18px Arial,sans-serif;fill:#111;stroke:white;stroke-width:3px;paint-order:stroke fill;stroke-linejoin:round');
      const svg=element.querySelector('svg');
      const obstacles=[...tabs.flatMap(note=>[...noteElement(note)?.querySelectorAll('text')??[]]),...svg.querySelectorAll('.scorePalmMute,[data-picking-position] text,.tabVibrato,.etudeTechniqueLabel,.tabRhythmBeam,.tabRhythmFlag,.tabRhythmLongNote,.tabRhythmTuplet,.tabTupletBracket')].map(node=>node.getBBox());
      svg.append(label);
      for(let pass=0;pass<=obstacles.length;pass++){
        const box=label.getBBox(),collision=obstacles.find(other=>box.x<other.x+other.width+4&&box.x+box.width>other.x-4&&box.y<other.y+other.height+4&&box.y+box.height>other.y-4);
        if(!collision)break;
        labelY-=box.y+box.height-collision.y+4;label.setAttribute('y',String(labelY));
      }
      context.closeGroup();
    });
    if(!editor){
      const geometry=document.createElementNS('http://www.w3.org/2000/svg','g');
      geometry.dataset.playbackBar=String(index);
      geometry.dataset.row=String(placement.row);
      const rowTop=chordHeight?(placement.row-1)*rowHeight:Math.max(0,(view==='tab'?tab:stave).getYForLine(0)-32-headroom);
      geometry.dataset.rowTop=String(rowTop);geometry.dataset.rowBottom=String(rowTop+rowHeight);
      geometry.dataset.top=String((view==='tab'?tab:stave).getYForLine(0)-12-headroom);
      geometry.dataset.bottom=String(view==='staff'?stave.getYForLine(4)+28:tab.getYForLine(stringCount-1)+(tabRhythm?60:14));
      let elapsed=0;const points=measure.map((event,i)=>{const tick=event.onset??elapsed;elapsed=tick+ticksOf(event);const note=view==='staff'?notes[i]:tabs[i];return {tick,x:event.rest||isBlankEvent(event)?note.getAbsoluteX():note.getStemX()};});
      points.push({tick:meterTicks(meter),x:x+w-2});
      geometry.dataset.points=JSON.stringify(points);element.querySelector('svg').append(geometry);
    }
    if(editor) {
      const svg=element.querySelector('svg'),ns='http://www.w3.org/2000/svg';
      svg.dataset.playbackTop=String((view==='tab'?tab:stave).getYForLine(0)-12-headroom);
      svg.dataset.playbackBottom=String(view==='staff'?stave.getYForLine(4)+28:tab.getYForLine(stringCount-1)+(tabRhythm?60:14));
      const centers=tabs.map((t,i)=>measure[i].rest?t.getAbsoluteX():t.getStemX());
      const spacing=tab.getYForLine(1)-tab.getYForLine(0);
      measure.forEach((event,i)=>{
        const px=centers[i],left=i?(centers[i-1]+px)/2:px-20,right=i+1<tabs.length?(px+centers[i+1])/2:x+w-5;
        for(let string=1;string<=stringCount;string++){
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
          const handle=document.createElementNS(ns,'rect'),cx=mode==='tab'?px:heads[j].getAbsoluteX()+heads[j].getWidth()/2,cy=mode==='tab'?tab.getYForLine((tone.string??1)-1):notes[i].getYs()[j],hitHeight=mode==='tab'?Math.min(14,spacing):10;
          Object.entries({x:cx-10,y:cy-hitHeight/2,width:20,height:hitHeight,'data-event':i,'data-string':tone.string,'data-drag-tone':tone.string,'data-tone-id':tone.id,'data-mode':mode,'data-staff-bottom':stave.getYForLine(4),'data-midi':tone.midi,'data-cursor-x':cx-12,'data-cursor-y':cy-7,class:'etudeEditorHit etudeNoteHandle',fill:'transparent'}).forEach(([k,v])=>handle.setAttribute(k,String(v)));svg.append(handle);
        }
      });
    }
    metrics.push(notes.map((n, i) => ({ noteX: n.getAbsoluteX(), tabX: tabs[i].getAbsoluteX(), end: x + w,
      noteCenterX:n.getCenterGlyphX(),tabCenterX:tabs[i].getCenterGlyphX(),
      rest:measure[i].rest, blank:isBlankEvent(measure[i]), line: n.getKeyProps?.()[0]?.line??3, expectedLine: measure[i].rest ? (n.getKeyProps?.()[0]?.line??3) : (staffStepForPitch(measure[i].pitch,etude.instrument)+2)/2,
      tones: measure[i].rest ? [] : (measure[i].tones ?? [measure[i]]).map((tone,j)=>({
        line:n.getKeyProps()[j].line, expectedLine:(staffStepForPitch(tone.pitch,etude.instrument)+2)/2,
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
  // Place navigation after stems and beams have their final geometry. A mark
  // starts next to the stave and moves only when its own horizontal span meets
  // visible notation; blank slots and the hidden staff do not reserve space.
  for(const item of navigation){
    const {notes,tabs,measure,beams,tuplets,top,x,first,start,measureNumberX}=item;
    const obstacles=[...(item.palmMuteObstacles??[]),{x:measureNumberX-8,y:top-24,width:16,height:14}];
    if(first)obstacles.push({x,y:top-(view==='tab'?0:22),width:start-x,height:65});
    measure.forEach((event,i)=>{
      if(isBlankEvent(event))return;
      if(view==='tab'){
        if(event.rest)return;
        const ys=tabs[i].getYs(),left=tabs[i].getAbsoluteX();
        obstacles.push({x:left,y:Math.min(...ys)-11,width:tabs[i].getGlyphWidth(),height:Math.max(...ys)-Math.min(...ys)+22});
        if(event.vibrato)obstacles.push({x:left-8,y:Math.min(...ys)-22,width:32,height:18});
        if(event.arpeggio)obstacles.push({x:left-24,y:Math.min(...ys)-14,width:12,height:Math.max(...ys)-Math.min(...ys)+28});
        if(event.technique&&tabs[i+1])obstacles.push({x:left,y:top-25,width:tabs[i+1].getAbsoluteX()-left+15,height:23});
      }else{
        const b=notes[i].getBoundingBox(),hasAccidental=notes[i].getModifiers().some(m=>m.getCategory()==='Accidental'),y=hasAccidental?Math.min(b.getY()-3,Math.min(...notes[i].getYs())-16):b.getY()-3;obstacles.push({x:b.getX(),y,width:b.getW(),height:b.getY()+b.getH()+3-y});
      }
    });
    if(view!=='tab'){
      for(const beam of beams){const ns=beam.getNotes(),xs=ns.map(n=>n.getStemX()),ys=ns.flatMap(n=>{const s=n.getStemExtents();return [s.topY,s.baseY];});obstacles.push({x:Math.min(...xs),y:Math.min(...ys)-5,width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)+10});}
      for(const {tuplet,visible} of tuplets)if(visible){const ns=tuplet.getNotes();obstacles.push({x:ns[0].getTieLeftX()-5,y:tuplet.getYPosition()-16,width:ns.at(-1).getTieRightX()-ns[0].getTieLeftX()+10,height:28});}
    }
    drawScoreNavigation(context,svg,{...item,obstacles});
  }
  alignNavigationEndings(navigation.map(item=>({index:item.index,row:item.row,number:item.mark.ending,node:svg.querySelector(`[data-ending-bar="${item.index}"]`)})));
  if(view==='tab')svg.querySelectorAll('.vf-fretiva-staff-view,.vf-fretiva-both-view,[data-mode="staff"]').forEach(node=>node.remove());
  if(view==='staff')svg.querySelectorAll('.vf-fretiva-tab-view,.fretiva-tab-view,.vf-fretiva-both-view,[data-mode="tab"]').forEach(node=>node.remove());
  svg.dataset.notationView=view;
  const ink=compactTab?svg.getBBox():null;
  const trimTop=compactTab?Math.max(0,ink.y-8):0;
  // The last stem can extend beyond the estimated row height. Reserve white
  // paper below actual ink, including tuplets and picking, even on dense rows.
  const paperBottom=compactTab?Math.max(height,ink.y+ink.height+24*Math.max(1,width/(editorWidth??width))):height;
  svg.setAttribute('viewBox', `0 ${trimTop} ${width} ${paperBottom-trimTop}`);
  svg.style.aspectRatio=`${width} / ${paperBottom-trimTop}`;
  if(compactTab)svg.setAttribute('height',String(paperBottom-trimTop));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${etude.title}, ${(etude.meter??[4,4]).join("/")}, BPM ${bpm}, ${view==='staff'?'오선보':view==='tab'?'TAB':'오선보와 TAB'}`);
  svg.style.width = '100%'; svg.style.height = 'auto'; svg.style.display = 'block';
  return metrics;
}

// Keep only a bounded set of detached vector trees. Navigating away still
// unmounts the studio and stops audio; returning doesn't engrave it again.
const scoreCache = new Map();
export function renderCachedScore(element, etude, options = {}) {
  const key = `${etude.id}:${Boolean(options.mobile)}:${Boolean(options.enlarged)}:${Boolean(options.landscape)}:${options.view??"both"}:${options.editorWidth??""}:${Boolean(options.responsive)}:${options.measuresPerRow??0}`;
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

function Score({ etude, mobile, bpm, enlarged = false, view, playPosition=null, followPlayback=false,followMode,responsive=false,measuresPerRow=0,zoom=1,focusLayout=false }) {
  const ref = useRef(null);
  const [availableWidth,setAvailableWidth]=useState(0);
  const [availableHeight,setAvailableHeight]=useState(0);
  useLayoutEffect(()=>{
    if(!responsive||!focusLayout||view!=='tab')return;
    const viewport=ref.current.closest('.etudeScoreViewport');
    if(!viewport)return;
    const measure=()=>{
      const sheetStyle=getComputedStyle(viewport.querySelector('.etudeSheet'));
      setAvailableHeight(Math.max(0,viewport.clientHeight-parseFloat(sheetStyle.paddingTop)-parseFloat(sheetStyle.paddingBottom)-12));
    };
    measure();const observer=new ResizeObserver(measure);observer.observe(viewport);
    return()=>observer.disconnect();
  },[responsive,focusLayout,view]);
  useLayoutEffect(()=>{if(!responsive)return;const measure=()=>setAvailableWidth(Math.round(ref.current.clientWidth));measure();const observer=new ResizeObserver(measure);observer.observe(ref.current);return()=>observer.disconnect();},[responsive]);
  const practiceFollow=usePracticeFollow(ref,followMode,Boolean(playPosition?.playing),[availableWidth,view,zoom,focusLayout,measuresPerRow].join(":"));
  const follow=usePlaybackFollow(ref,followPlayback&&Boolean(playPosition?.playing));
  const followRef=useRef(follow);followRef.current=(line,current)=>followMode?practiceFollow.follow(line,current):follow(line);
  const [error, setError] = useState('');
  const [landscape, setLandscape] = useState(() => window.matchMedia('(orientation: landscape)').matches);
  useLayoutEffect(() => {
    const query = window.matchMedia('(orientation: landscape)');
    const update = () => setLandscape(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    try {
      const renderZoom=focusLayout?1:zoom;
      renderCachedScore(ref.current, etude, { mobile, enlarged, landscape, view, responsive,measuresPerRow,editorWidth:responsive?Math.max(240,availableWidth/renderZoom):mobile&&!landscape&&!enlarged?600:undefined });
      if(responsive){
        const svg=ref.current.querySelector('svg');
        // Keep the complete engraved system inside the landscape viewport,
        // even when dense notation requires a wider internal coordinate space.
        svg.style.width=focusLayout?'100%':Math.max(availableWidth,Number(svg.getAttribute('width'))*zoom)+'px';
        svg.style.maxWidth=focusLayout?'100%':'none';
        // Fit two complete TAB systems in the short landscape reader, including
        // their stems/beams and a little space below. Preserve glyph proportions
        // and keep longer scores vertically scrollable instead of shrinking all rows.
        if(focusLayout&&view==='tab'&&availableHeight>0){
          const rows=[...svg.querySelectorAll('[data-playback-bar]')];
          const lastRow=Math.min(2,Math.max(1,...rows.map(row=>Number(row.dataset.row))));
          const bottom=Math.max(...rows.filter(row=>Number(row.dataset.row)===lastRow).map(row=>Number(row.dataset.rowBottom)));
          const box=svg.viewBox.baseVal;
          const fitWidth=availableHeight*box.width/(bottom-box.y+8);
          if(Number.isFinite(fitWidth))svg.style.width=Math.min(availableWidth,fitWidth)+'px';
          svg.style.marginInline='auto';
        }
      }
      setError('');
    }
    catch (e) { ref.current?.replaceChildren(); setError('악보를 표시하지 못했습니다. 다른 연습곡을 선택해 주세요.'); console.error(e); }
  }, [etude, mobile, enlarged, landscape, view, responsive, availableWidth,availableHeight, zoom, measuresPerRow,focusLayout]);
  useEffect(() => {
    ref.current?.querySelector('svg')?.setAttribute('aria-label', `${etude.title}, ${(etude.meter??[4,4]).join("/")}, BPM ${bpm}, ${view==='staff'?'오선보':view==='tab'?'TAB':'오선보와 TAB'}`);
  }, [etude, mobile, enlarged, landscape, bpm, view]);
  useEffect(()=>{
    const root=ref.current,svg=root?.querySelector('svg');if(!svg||!playPosition)return;
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    Object.entries({class:'savedScorePlayhead',stroke:'var(--riff-danger, #c85d54)','stroke-opacity':1,'stroke-width':2.5,'vector-effect':'non-scaling-stroke','pointer-events':'none','aria-hidden':'true'}).forEach(([key,value])=>line.setAttribute(key,value));
    const wash=line.cloneNode();wash.setAttribute('class','savedScorePlayheadWash');
    svg.append(wash,line);let frame,activeBar,points;
    const draw=()=>{
      const current=playPosition.getCurrentSlot?.()??playPosition;
      if(activeBar!==current.bar){const bar=svg.querySelector(`[data-playback-bar="${current.bar}"]`);if(!bar)return;activeBar=current.bar;points=JSON.parse(bar.dataset.points);line.setAttribute('y1',bar.dataset.top);line.setAttribute('y2',bar.dataset.bottom);}
      const tick=playPosition.getTimelineTick?playPosition.getTimelineTick()-current.barStart:playPosition.getBarTick?.()??points[current.event]?.tick??0;
      const x=playheadX(points,tick,followMode);line.setAttribute('x1',x);line.setAttribute('x2',x);line.dataset.tick=String(tick);line.dataset.bar=String(current.bar);line.dataset.visit=String(current.visit??0);for(const attr of ['x1','x2','y1','y2'])wash.setAttribute(attr,line.getAttribute(attr));followRef.current(line,current);
      if(playPosition.playing)frame=requestAnimationFrame(draw);
    };draw();
    return()=>{cancelAnimationFrame(frame);line.remove();wash.remove();};
  },[playPosition,etude,mobile,enlarged,landscape,view,availableWidth,availableHeight,zoom,measuresPerRow,focusLayout,followMode]);
  return <>{etude.document&&tuningCaption(etude.document)&&<p className="scoreTuningCaption">{tuningCaption(etude.document)}</p>}{playPosition&&practiceFollow.suspended&&<button className="etudeReturnPosition" type="button" onClick={practiceFollow.resume}>현재 위치로</button>}{error && <p role="alert">{error}</p>}<div className="etudeNotation" ref={ref} /></>;
}
export default memo(Score);
