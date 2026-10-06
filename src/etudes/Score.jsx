import { formatMessage } from "../i18n/format.js";
import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {applyAnnotationOffsets} from './scoreAnnotations.js';
import {harmonyLabelLines} from './harmonyLabelLayout.js';
import {compactChordLabel} from '../chords/chordSymbols.js';
import {LocateFixed} from 'lucide-react';
import {slurSpans,slurCovers,drawSlurs} from './slurs.js';
import {rhythmTimeline,rhythmHighlighter} from './rhythmProgress.js';

import {ReadableTabTie,tabArcGeometry,drawReadableSlide} from './tabConnections.js';
import {drawKeyboardScore,keyboardSpacing} from './KeyboardScore.js';
import {isFretted} from './scoreInstruments.js';
import {slidePairs} from './slidePairs.js';
import {tabPositions} from './tabPositions.js';
import {tabRepeatMask,tabRepeatHead} from './tabRepeat.js';
import {tuningCaption} from './scoreTuning.js';
import usePracticeFollow from './usePracticeFollow.js';
import {measureMeters,meterTicks} from './scoreMeters.js';
import usePlaybackFollow from './usePlaybackFollow.js';
import {drawExtendedTechniques} from './drawExtendedTechniques.js';
import {drawPalmMute} from './drawPalmMute.js';
import {scoreInstrument,staffStepForPitch,scoreStringCount} from './scoreInstruments.js';
import {drawScoreNavigation,alignNavigationEndings,navigationBottom} from './drawScoreNavigation.js';
import {NAV_COMMANDS} from './scoreNavigation.js';
import {repeatMarks} from './scoreRepeats.js';


import {playheadX,rhythmAnchors} from './scorePlayhead.js';
import {createScorePlayheadLayer,highlightScoreBar} from './scorePlayheadLayer.js';
import {measureLayout,scoreLineSettings} from './measureLayout.js';
import {mobileScoreWidth} from './mobileScoreSizing.js';
import {createPortal} from 'react-dom';
import {createDesktopScorePages,createMobileScorePages,DESKTOP_SCORE_CONTENT_WIDTH,withIsolatedScore} from './desktopScorePages.js';
import MobileScorePageNav from './MobileScorePageNav.jsx';
import { memo, useMemo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {isBlankEvent,tupletGroups,ticksOf} from './scoreModel.js';
import {drawTabRhythm,drawTabRests,rhythmGroups} from './tabRhythm.js';
import { drawChordDiagram, chordDiagramVisibility } from './chordStudy.js';
import {displayMeasureChordCharts,chordChartLayout,drawMeasureChordCharts} from './measureChordCharts.js';
import { Clef, Dot, Stem, Renderer, Stave, TabStave, StaveNote, TabNote, GhostNote, Tuplet, Voice, Formatter, Beam, Accidental, StaveConnector, Barline, TimeSignature, Curve, StaveLine, StaveTie } from 'vexflow';

// Harmonic/parenthesized labels are wider than their numeric fret alone.
const tabArpeggioInset=event=>6+5*Math.max(...(event.tones??[event]).map(t=>String(t.fret??'x').length+(t.harmonic?2:0)+(t.parenthesized?2:0)));

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

// Legacy TAB without separate rhythm stems keeps its fret-level dots.
// When rhythm is shown, drawTabRhythm places one dot beside the rhythm stem.
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
  drawPositions() {
    if(this.tabRepeat){
      const ctx=this.checkContext(),{y,halfHeight:h,halfWidth:w}=tabRepeatHead(this.checkStave()),x=this.getStemX();
      const hollow=this.getDuration()==='1'||this.getDuration()==='2',thickness=hollow?2.8:1;
      const group=ctx.openGroup('tab-repeat-slash');group.setAttribute('data-tab-repeat','true');
      ctx.save();ctx.setLineWidth(1.3);
      ctx.beginPath();ctx.moveTo(x-w-thickness,y+h);ctx.lineTo(x+w-thickness,y-h);ctx.lineTo(x+w+thickness,y-h);ctx.lineTo(x-w+thickness,y+h);ctx.closePath();
      if(hollow){ctx.setFillStyle('white');ctx.fill();ctx.stroke();}else ctx.fill();
      ctx.restore();ctx.closeGroup();return;
    }
    // VexFlow clears a white rectangle behind each fret. Keep only the glyph.
    const ctx=this.checkContext(),clear=ctx.clearRect;
    ctx.clearRect=()=>ctx;
    try{return super.drawPositions();}finally{ctx.clearRect=clear;}
  }
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
    const repeatMask=etude.tabRhythmVisible===false?[]:tabRepeatMask(measure);
    const polyphonic=measure.some(n=>n.voice==='melody');
    const notes = measure.map(n => isBlankEvent(n)?new GhostNote({duration:n.duration+(n.dotted?'d':'')}):new StaveNote({ clef:scoreInstrument(etude.instrument).clef, keys: n.rest ? [scoreInstrument(etude.instrument).clef==='bass'?'d/3':polyphonic&&n.voice==='melody'?'d/5':'b/4'] : n.rhythmSlash?['b/4']:(n.tones ?? [n]).map(t=>t.pitch.key+((t.dead??n.dead)?'/x':'')), duration: n.duration+(n.dotted?'d':'')+(n.rest?'r':n.rhythmSlash?'s':''), auto_stem: !polyphonic,...(polyphonic?{stem_direction:n.voice==='melody'?1:-1}:{}) }));
    // Whole-note heads are wider than eighth-note heads. Independent voices
    // at one onset still need one TAB column, including mixed one/two-digit frets.
    const tabAnchors=new Map();
    if(polyphonic)measure.forEach((n,i)=>{if(!n.rest&&!tabAnchors.has(n.onset))tabAnchors.set(n.onset,notes[i]);});
    const tabs = measure.map((n,i) => {
      if(n.rest) return new GhostNote({duration:n.duration+(n.dotted?'d':'')});
      const note = new AlignedTabNote({ positions: tabPositions(n,scoreStringCount(etude)), duration: n.duration+(n.dotted?'d':'') },tabAnchors.get(n.onset)??notes[i]);
      note.render_options.font = '18px Arial';
      note.tabRepeat=Boolean(repeatMask[i]);
      note.render_options.draw_dots = true;
      if(n.dotted&&etude.tabRhythmVisible!==false&&!etude.tabRhythmDots)note.addModifier(new TabFretDots(),0);
      return note;
    });
    measure.forEach((n,i)=>{if(n.dotted&&!isBlankEvent(n))Dot.buildAndAttach([notes[i]],{all:true});});
    const tuplets=tupletGroups(measure).map(group=>{
      const ratio=measure[group[0]].tuplet;
      new Tuplet(group.map(i=>tabs[i]),{num_notes:ratio.actualNotes,notes_occupied:ratio.normalNotes});
      const tuplet=new EditableTuplet(group.map(i=>notes[i]),{num_notes:ratio.actualNotes,notes_occupied:ratio.normalNotes,bracketed:true,ratioed:false});
      return {tuplet, visible:group.some(i=>!isBlankEvent(measure[i]))};
    });
    const groups=[...new Set(measure.map(n=>n.voice))].map(name=>measure.flatMap((n,i)=>n.voice===name?[i]:[]));
    const makeVoices=list=>groups.map(indices=>new Voice({num_beats:(etude.meter??[4,4])[0],beat_value:(etude.meter??[4,4])[1]}).setMode(Voice.Mode.SOFT).addTickables(indices.map(i=>list[i])));
    const voices=makeVoices(notes),tabVoices=makeVoices(tabs);
    // Accidental state is reset every bar, including naturals after blue notes.
    Accidental.applyAccidentals(measure.some(n=>n.rhythmSlash)?makeVoices(notes.map((note,i)=>measure[i].rhythmSlash?new GhostNote({duration:measure[i].duration}):note)):voices, etude.keySignature);
    let beams = groups.flatMap(indices=>Beam.generateBeams(indices.map(i=>notes[i]),{groups:Beam.getDefaultBeamGroups((etude.meter??[4,4]).join('/')),...(polyphonic?{stem_direction:measure[indices[0]].voice==='melody'?1:-1}:{})}));
    if(measure.some(n=>n.tuplet)){
      const automatic=rhythmGroups(measure,etude.meter,{automatic:true});
      notes.forEach(note=>note.setBeam(undefined));
      beams=automatic.filter(group=>group.length>1).map(group=>new Beam(group.map(i=>notes[i]),true));
    }
    return {notes,tabs,tuplets,voices,tabVoices,beams};
}

const spacingCache = new WeakMap();
function measureSpacing(measure, etude, view) {
  const key=`${etude.instrument}/${etude.keySignature}/${(etude.meter??[4,4]).join('/')}/${view}`;
  const cached=spacingCache.get(measure);
  if(cached?.key===key)return cached.value;
  const {notes,tabs,voices:staffVoices,tabVoices}=prepareMeasure(measure,etude);
  const voices=view==='tab'?tabVoices:view==='staff'?staffVoices:[...staffVoices,...tabVoices];
  const formatter=new Formatter();
  voices.forEach(v=>formatter.joinVoices([v]));formatter.format(voices,0);
  let elapsed=0;
  const value=(view==='tab'?tabs:notes).map((note,i)=>{
    const tick=measure[i].onset??elapsed;elapsed=tick+ticksOf(measure[i]);
    const metrics=note.getTickContext().getMetrics();
    const tabOverhang=view==='staff'||measure[i].rest?0:Math.max(0,(tabs[i].getGlyphWidth()-notes[i].getGlyphWidth())/2);
    return {tick,left:Math.max(metrics.totalLeftPx,tabOverhang),right:metrics.notePx+metrics.totalRightPx+(measure[i].technique==='S'?8:measure[i].slideOut?16:(measure[i].tones??[measure[i]]).some(n=>n.bendEffect)?20:0)};
  });
  spacingCache.set(measure,{key,value});return value;
}

// Reserve system symbols separately from rhythmic space. Every bar in a row
// uses the same tick scale by default. Mobile editor rows instead allocate
// space to each bar's actual density, without resizing other rows. This is
// engraving geometry only: musical onset/duration and the audio clock stay intact.
export function scoreSpacing(etude, {placements,view='both',width=600,barOffset=0,independentRows=false,rhythmicSpacing=false,equalMeasures=false}={}) {
  if(!isFretted(etude.instrument))return keyboardSpacing(etude,{placements,width});
  const meters=measureMeters(etude);
  const charts=displayMeasureChordCharts(etude);
  const rows=[];
  placements.forEach((placement,i)=>{
    const meter=meters[i],capacity=meterTicks(meter),meterChanged=i>0&&meter.join()!==meters[i-1].join();
    const first=placement.column===1,stave=new Stave(0,0,1000),tab=new TabStave(0,0,1000,{num_lines:scoreStringCount(etude),spacing_between_lines_px:TAB_LINE_SPACING});
    if(first){stave.addClef(scoreInstrument(etude.instrument).clef,'default',scoreInstrument(etude.instrument).octaveShift?'8vb':undefined).addKeySignature(etude.keySignature);}
    if(i+barOffset===0)addInstrumentTabClef(tab);
    if(i+barOffset===0||meterChanged){stave.addTimeSignature(meter.join('/'));if(view==='tab')addTabTimeSignature(tab,meter.join('/'));}
    if(!first){stave.setBegBarType(Barline.type.NONE);tab.setBegBarType(Barline.type.NONE);}
    if(repeatMarks(etude)[i]?.repeatStart){stave.setBegBarType(Barline.type.REPEAT_BEGIN);tab.setBegBarType(Barline.type.REPEAT_BEGIN);}
    const tail=repeatMarks(etude)[i]?.repeatEnd?36:20;
    const prefix=view==='tab'?tab.getNoteStartX():stave.getNoteStartX();
    const eventPoints=measureSpacing(etude.measures[i],{...etude,meter},view),byTick=new Map();
    for(const point of eventPoints){const prior=byTick.get(point.tick);byTick.set(point.tick,{...point,left:Math.max(point.left,prior?.left??0),right:Math.max(point.right,prior?.right??0)});}
    const points=[...byTick.values()].sort((a,b)=>a.tick-b.tick),pointIndices=eventPoints.map(p=>points.findIndex(n=>n.tick===p.tick));
    // Note.getAbsoluteX adds the font's stave padding again after noteStartX.
    // Replace that default gap with a compact 10px clearance, keeping the full
    // measured accidental / displaced-note / TAB overhang before the first note.
    const notePadding=Stave.defaultPadding-Stave.rightPadding;
    const inset=(points[0]?.left??0)+10-notePadding;
    const command=NAV_COMMANDS.find(([kind])=>kind===repeatMarks(etude)[i]?.command)?.[1];
    const navigationWidth=command?command.length*8+16:0;
    (rows[placement.row-1]??=[]).push({index:i,prefix,points,pointIndices,inset,tail,navigationWidth,capacity});
  });
  // Staff systems keep aligned beat columns. TAB-only rows reserve space
  // only for symbols actually drawn in that row.
  const openingPrefix=Math.max(0,...rows.map(bars=>bars[0]?.prefix??0));
  if(view!=='tab')rows.forEach(bars=>{if(bars[0])bars[0].inset+=openingPrefix-bars[0].prefix;});
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
     // A sustained final chord can contain very little rhythmic ink. Its
     // diagram still needs a readable cell in multi-bar print/editor rows.
     const chartCount=charts[bar.index]?.length??0;
     const chartWidth=chartCount?20+108*chartCount:0;
     bar.scale=Math.max(bar.scale,(chartWidth-bar.prefix-bar.inset-bar.tail)/bar.capacity);
     bar.naturalWidth=Math.max(bar.intervals.reduce((sum,gap)=>sum+gap.width,0),Math.max(bar.navigationWidth,chartWidth)-bar.prefix-bar.inset-bar.tail);
     scale=Math.max(scale,bar.scale);
    }
    const fixed=24+bars.reduce((sum,bar)=>sum+bar.prefix+bar.inset+bar.tail,0);
    // Paper systems keep a full cell for sustained chords as well as busy bars.
    const minimum=equalMeasures?24+bars.length*Math.max(...bars.map(bar=>bar.prefix+bar.inset+bar.tail+bar.naturalWidth)):fixed+bars.reduce((sum,bar)=>sum+((independentRows||rhythmicSpacing)?bar.naturalWidth:bar.capacity*scale),0);
    return {bars,scale,fixed,minimum};
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
      const equalWidth=(rowWidth-24)/bars.length;
      const barSpare=equalMeasures?(equalWidth-bar.prefix-bar.inset-bar.tail-bar.naturalWidth)/(bar.intervals.reduce((sum,gap)=>sum+gap.weight,0)||1):spareUnit;
      let rhythmicWidth=0;
      const positions=(independentRows||rhythmicSpacing||equalMeasures)?bar.intervals.map(gap=>{const position=rhythmicWidth;rhythmicWidth+=gap.width+gap.weight*barSpare;return position;}):undefined;
      if(positions)rhythmicWidth+=bar.naturalWidth-bar.intervals.reduce((sum,gap)=>sum+gap.width,0);
      const barWidth=equalMeasures?equalWidth:bar.prefix+bar.inset+bar.tail+(positions?rhythmicWidth:bar.capacity*tickScale);
      const leading=i===0?12:0,trailing=i===bars.length-1?12:0;
      measures[bar.index]={x,width:barWidth,cellX:x-leading,cellWidth:barWidth+leading+trailing,
        rowWidth,inset:bar.inset,tickScale,positions:positions&&bar.pointIndices.map(i=>positions[i])};
      x+=barWidth;
    });
  }
  return {width:totalWidth,measures};
}

export function drawScore(element, etude, { mobile = false, enlarged = false, landscape = false, bpm = etude.bpm, editor = false, barOffset = 0, tabRhythm = Boolean(etude.document) && etude.document.viewSettings?.tabRhythm !== false, tabBeamPosition=etude.document?.viewSettings?.tabBeamPosition??'below',tabShortStems=Boolean(etude.document?.viewSettings?.tabShortStems),tabPickingPosition=etude.document?.viewSettings?.tabPickingPosition??'below',editorWidth, engraving, responsive=false, rhythmicSpacing=false, measuresPerRow=0, systemStart=true, systemEnd=true, scoreEnd=true, systemHeadroom=0, systemFootroom=0, systemNavigation=false, desktopPage=false, view=etude.document?.viewSettings?.notationView??'both' } = {}) {
  if(mobile&&responsive&&!editor&&!measuresPerRow&&!etude.document?.viewSettings?.measuresPerRow){
    const pairs=measureLayout(etude.document?.measures??etude.measures.map((_,i)=>({id:String(i)})),2,etude.document?.viewSettings?.systemBreaks??[]);
    const minimum=scoreSpacing(etude,{placements:pairs,view,width:0,barOffset,rhythmicSpacing}).width;
    // Fit the actual symbols at their normal size, with breathing room. Dense
    // scores stay at one bar instead of squeezing two bars or adding a scroll.
    measuresPerRow=minimum+12<=(editorWidth??0)?2:1;
  }
  if(!isFretted(etude.instrument))return drawKeyboardScore(element,etude,{mobile,editor,editorWidth,barOffset,systemStart,systemEnd,measuresPerRow});
  const stringCount=scoreStringCount(etude);
  const numberOnly=etude.document?.viewSettings?.tabRhythm===false||(editor&&!tabRhythm);
  etude={...etude,tabRhythmVisible:!numberOnly,tabRhythmDots:tabRhythm};
  const polyphonic=etude.measures.some(bar=>bar.some(n=>n.voice==='melody'));
  const tiedEventIds=new Set(etude.measures.flat().filter(e=>e.tieTo).map(e=>e.tieTo));
  if(etude.incomingTie&&etude.measures[0]?.[0])tiedEventIds.add(etude.measures[0][0].id);
  const compactTab=responsive&&!editor&&view==='tab';
  // Upper/lower voice TAB already reserves upperSpace; reclaim only its
  // redundant row padding so four systems fit without squeezing simpler TAB.
  const compactDesktopRows=desktopPage&&!mobile&&compactTab&&polyphonic;
  const upperSpace=view!=='staff'&&((tabRhythm&&(tabBeamPosition==='above'||polyphonic))||tabPickingPosition==='above')?(compactTab?(mobile?36:48):78):0;
  element.replaceChildren();
  // Respect authored line breaks, then size vector engraving to its rhythmic
  // and symbol requirements. Unconfigured dense studies use one bar on mobile.
  const dense = etude.measures.some(measure => measure.length > 8);
  const fallback=responsive?Math.max(1,Math.min(6,Math.floor((editorWidth??980)/(dense?340:260)))):(mobile&&!landscape&&(enlarged||dense)?1:2);
  const lines=scoreLineSettings(etude.document,measuresPerRow,fallback),perRow=editor?1:lines.perRow;
  const placements=measureLayout(etude.document?.measures??etude.measures.map((_,i)=>({id:String(i)})),perRow,lines.breaks);
  const baseWidth=mobile&&landscape?(dense?1100:980):mobile?(enlarged?460:view==='both'?600:400):980;
  const spacing=engraving?null:scoreSpacing(etude,{placements,view,width:editorWidth??baseWidth,barOffset,rhythmicSpacing,equalMeasures:desktopPage});
  const width=engraving?engraving.cellWidth:spacing.width;
  const labelContext=document.createElement('canvas').getContext('2d');
  labelContext.font='bold 14px Arial';
  const charts=displayMeasureChordCharts(etude);
  const harmonyLines=etude.measures.map((_,i)=>harmonyLabelLines(etude.chordShapes?.[i]||charts[i]?.length?'':etude.harmony?.[i]||'',Math.max(24,(engraving??spacing.measures[i]).width-43),text=>labelContext.measureText(text).width));
  const annotationRoom=Math.max(engraving?.annotationRoom??0,Math.max(0,...harmonyLines.map(lines=>(lines.length-1)*18))+(repeatMarks(etude).some(m=>m.sectionLabel)?32:0));
  const chartRows=[];
  placements.forEach((p,i)=>{chartRows[p.row-1]=Math.max(chartRows[p.row-1]??0,!charts[i]?.length&&etude.chordShapes?.[i]?120:chordChartLayout(charts[i]??[]).height,engraving?.chordChartHeight??0);});
  const visibleChords=etude.chordDiagramVisible??chordDiagramVisibility(etude.chordShapes,etude.harmony);
  const chordRowGap=!editor&&etude.harmony?.some(Boolean)?(compactTab?(mobile?16:compactDesktopRows?8:24):36):0;
  // User edits may add high notes. Reserve headroom for their ledger lines
  // instead of clipping the top of the SVG or colliding with a chord box.
  const highestLine=Math.max(7,...etude.measures.flat().filter(n=>!n.rest).flatMap(n=>n.tones??[n]).map(n=>(staffStepForPitch(n.pitch,etude.instrument)+2)/2));
  const lowestStep=Math.min(-7,...etude.measures.flat().filter(n=>!n.rest).flatMap(n=>n.tones??[n]).map(n=>staffStepForPitch(n.pitch,etude.instrument)));
  const footroom=view==='tab'?0:Math.max(systemFootroom,(-7-lowestStep)*5);
  const navigationHeight=systemNavigation||repeatMarks(etude).some(m=>m.ending||m.marker||m.command)?52:0;
  const bendRoom=Math.max(0,...etude.measures.flat().map(e=>(e.tones??[e]).filter(n=>n.bendEffect).length*28));
  const headroom=bendRoom+navigationHeight+(view==='tab'?0:Math.max(systemHeadroom,Math.ceil(Math.max(0,highestLine-7)*10)));
  // Compact only the generated practice TAB reader; fret sizes and string spacing stay intact.
  const compactRhythm=compactTab&&mobile&&tabBeamPosition==='below';
  const extraTabRoom=compactTab&&etude.measures.some(bar=>bar.some(e=>e.tuplet||e.picking||e.palmMute))?22:0;
  const dynamicRoom=etude.measures.some(bar=>bar.some(e=>e.dynamicText))?28:0;
  // Reader annotations are already attached to the actual notation above.
  // Avoid repeating the full section-label reserve as blank space on every row.
  // Keep editor/print spacing and the displayed fret/string sizes unchanged.
  const rowAnnotationRoom=compactTab?Math.max(0,annotationRoom-(mobile||compactDesktopRows?32:20)):annotationRoom;
  const baseRowHeight = (view==='tab'?(compactTab?86:144):view==='staff'?140:(responsive&&!editor?210:228))+rowAnnotationRoom+extraTabRoom+dynamicRoom+chordRowGap+headroom+footroom+upperSpace+(tabRhythm&&view!=='staff'?(compactRhythm?45:55):0)+(view==='staff'?0:(stringCount-1)*(TAB_LINE_SPACING-13));
  const rowTops=[];let height=0;
  chartRows.forEach((extra,i)=>{rowTops[i]=height;height+=baseRowHeight+extra;});height+=50;
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
  const spans=etude.slurSpans??slurSpans(etude.measures);
  const meters=measureMeters(etude);
  etude.measures.forEach((measure, index) => {
    // An introduction can have a single voice before the melody separates.
    const polyphonic=measure.some(n=>n.voice==='melody');
    const meter=meters[index],meterChanged=index>0&&meter.join()!==meters[index-1].join();
    const placement=placements[index],first=editor?systemStart:placement.column===1;
    const geometry=engraving??spacing.measures[index];
    const x = editor?(systemStart?12:0):geometry.x;
    const rowTop=rowTops[placement.row-1],rowHeight=baseRowHeight+chartRows[placement.row-1];
    const y = 18 + rowTop+chartRows[placement.row-1]+headroom+annotationRoom;
    const w = geometry.width;
    const stave = new Stave(x, y, w);
    const tab = new TabStave(x, y + (view==='tab'?0:84+footroom)+upperSpace, w,{num_lines:stringCount,spacing_between_lines_px:TAB_LINE_SPACING});
    if(charts[index]?.length){
      drawMeasureChordCharts(element.querySelector('svg'),charts[index],{x,width:w,bar:index+barOffset});
    }else if(visibleChords[index]) {
      const shape=etude.chordShapes[index],bottomOffset=32+(shape.frets.length-1)*12+20;
      const top=(view==='tab'?tab:stave).getYForLine(0);
      const diagram=drawChordDiagram(element.querySelector('svg'),shape,etude.harmony?.[index]??'',x+12,top-bottomOffset-14-headroom-upperSpace);
      const artwork=document.createElementNS('http://www.w3.org/2000/svg','g');artwork.append(...diagram.childNodes);diagram.append(artwork);
      diagram.dataset.scoreAnnotation='chord';diagram.dataset.annotationBar=String(index+barOffset);
    }
    if (first) {
      stave.addClef(scoreInstrument(etude.instrument).clef,'default',scoreInstrument(etude.instrument).octaveShift?'8vb':undefined).addKeySignature(etude.keySignature);
    }
    if(index+barOffset===0)addInstrumentTabClef(tab);
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
    const staffGroup=context.openGroup('fretiva-staff-view');staffGroup.dataset.repeatStart=String(Boolean(marks.repeatStart));staffGroup.dataset.repeatEnd=String(Boolean(marks.repeatEnd));staffGroup.dataset.systemStart=String(first);staffGroup.dataset.timeSignature=String(index+barOffset===0);staffGroup.dataset.measure=String(index+barOffset);stave.draw(); context.closeGroup(); const tabGroup=context.openGroup('fretiva-tab-view');tabGroup.dataset.tabTimeSignature=String(view==='tab'&&index+barOffset===0);tab.draw();
    // Center the actual digit bounds within the TAB strings, independent of
    // VexFlow's five-line staff defaults and the instrument's string count.
    for(const signature of tabGroup.querySelectorAll('.vf-timesignature')){
      const box=signature.getBBox(),center=tab.getYForLine((stringCount-1)/2);
      signature.setAttribute('transform',`translate(0 ${center-box.y-box.height/2})`);
    }
    context.closeGroup();
    if(editor&&!systemEnd&&!marks.repeatEnd){
      for(const [staff,group] of [[stave,staffGroup],[tab,tabGroup]]){
        const boundary=document.createElementNS('http://www.w3.org/2000/svg','line');
        Object.entries({x1:width-1.5,x2:width-1.5,y1:staff.getYForLine(0),y2:staff.getYForLine(staff===tab?stringCount-1:4),stroke:'#171717','stroke-width':1,'vector-effect':'non-scaling-stroke',class:'etudeMeasureBoundary','pointer-events':'none'}).forEach(([key,value])=>boundary.setAttribute(key,String(value)));
        group.append(boundary);
      }
    }
    if(etude.accompaniment && first&&!charts[index]?.length) context.setFont('Arial',13,'italic').fillText('let ring',x+150,(view==='tab'?tab:stave).getYForLine(0)-18-headroom);
    // Lift each system's first number only when the staff is visible.
    // TAB-only views have no staff clef/bracket to clear.
    // Other measure numbers sit directly above the barline that starts them.
    const measureNumberX = x;
    const measureNumber = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    measureNumber.textContent = String(index + barOffset + 1);
    measureNumber.setAttribute('class', 'etudeMeasureNumber');
    measureNumber.setAttribute('x', String(measureNumberX));
    measureNumber.setAttribute('y', String((view==='tab'?tab:stave).getYForLine(0) - (first&&view!=='tab'?24:4)));
    measureNumber.style.cssText='font:400 10px Arial,sans-serif;fill:#999;stroke:none';
    measureNumber.setAttribute('text-anchor', 'middle');
    element.querySelector('svg').style.overflow='visible';
    element.querySelector('svg').append(measureNumber);
    if((etude.harmony?.[index]||etude.harmonyChanges?.[index]?.length||(editor&&etude.chordNameModes?.[index]))&&!etude.chordShapes?.[index]&&!charts[index]?.length) {
      const changes=etude.harmonyChanges?.[index]?.length?etude.harmonyChanges[index]:[{onset:0,name:etude.harmony?.[index]||ko["etudes.chordNames"]}];
      for(const change of changes){
       const group=context.openGroup('etudeHarmonyLabel');
       group.dataset.scoreBar=String(index);group.dataset.scoreAnnotation='harmony';group.dataset.annotationBar=String(index+barOffset);group.dataset.harmonyOnset=String(change.onset);
       const top=(view==='tab'?tab:stave).getYForLine(0),label=compactChordLabel(change.name);
       const lines=changes.length===1?(etude.harmony?.[index]?harmonyLines[index]:[label]):[label];
       group.dataset.harmonyText=label;
       const text=document.createElementNS('http://www.w3.org/2000/svg','text');
       text.style.cssText='font:bold 14px Arial;fill:#111;stroke:none';
       const at=measure.findIndex(e=>e.onset===change.onset);
       const labelX=changes.length===1&&change.onset===0?x+35:start+geometry.inset+(geometry.positions?.[at]??change.onset*geometry.tickScale);
       lines.forEach((line,i)=>{const span=document.createElementNS(text.namespaceURI,'tspan');span.setAttribute('x',String(labelX));span.setAttribute('y',String(top-24-(view==='tab'?0:headroom+upperSpace)-(lines.length-1-i)*18));span.textContent=line+(i<lines.length-1?' ':'');text.append(span);});
       group.append(text);context.closeGroup();
      }
    }
    if (first) {context.openGroup('fretiva-both-view');new StaveConnector(stave, tab).setType(StaveConnector.type.BRACKET).setContext(context).draw();context.closeGroup();}
    const {notes,tabs,tuplets,voices,tabVoices,beams}=prepareMeasure(measure,{...etude,meter});
    navigation.push({mark:marks,previous:etude.navigationPrevious??repeatMarks(etude)[index-1],next:etude.navigationNext??repeatMarks(etude)[index+1],x,width:w,top:(view==='tab'?tab:stave).getYForLine(0),first,last:systemEnd,index:index+barOffset,row:placement.row,notes,tabs,tuplets,beams,measure,measureNumberX,start});
    const formatter=new Formatter();[...voices,...tabVoices].forEach(voice=>formatter.joinVoices([voice]));formatter.formatToStave([...voices,...tabVoices], stave);
    let elapsed=0;
    notes.forEach((note,i)=>{
      const tick=measure[i].onset??elapsed;elapsed=tick+ticksOf(measure[i]);
      note.getTickContext().setX(geometry.inset+(geometry.positions?.[i]??tick*geometry.tickScale));
    });
    context.openGroup('fretiva-staff-view');voices.forEach(voice=>voice.draw(context, stave));context.closeGroup();context.openGroup('fretiva-tab-view');tabVoices.forEach(voice=>voice.draw(context, tab));context.closeGroup();
    measure.forEach((event,i)=>{
      drawn.push({event,note:notes[i],tab:tabs[i],row:placement.row,key:index+':'+i});
      if(!event.rest&&tiedEventIds.has(event.id)){
        const node=noteElement(tabs[i]);
        if(node){node.dataset.tieContinuation='true';node.querySelectorAll('text').forEach(text=>text.setAttribute('visibility','hidden'));}
      }
    });
    // Rests belong inside TAB, independently of the optional lower rhythm stems.
    if(!numberOnly){
     for(const voice of polyphonic?['melody','accompaniment']:[null]){
      const events=voice?measure.map(e=>e.voice===voice?e:{...e,rest:false}):measure;
      drawTabRests(element.querySelector('svg'),events,notes,voice==='melody'?tab.getYForLine(0)-40:voice==='accompaniment'?tab.getYForLine(stringCount-1)+32:tab.getYForLine((stringCount-1)/2)).dataset.scoreBar=index;
     }
    }
    const beamGeometry=beams.map(beam=>({indices:beam.getNotes().map(note=>notes.indexOf(note)),xs:beam.getNotes().map(note=>note.getStemX()-Stem.WIDTH/2),levels:['4','8','16'].map(duration=>beam.getBeamLines(duration))}));
    if(tabRhythm){
     for(const voice of polyphonic?['melody','accompaniment']:[null]){
      const svg=element.querySelector('svg'),events=voice?measure.map(e=>e.voice===voice?e:{...e,rest:true,blank:true,notes:[]}):measure;
      drawTabRhythm(svg,events,tabs,tab,beamGeometry.filter(b=>!voice||measure[b.indices[0]].voice===voice),voice==='melody'?'above':polyphonic?'below':tabBeamPosition,{compact:compactRhythm,shortStems:tabShortStems,tiedEventIds});
      svg.lastElementChild.dataset.scoreBar=index;if(voice)svg.lastElementChild.dataset.voice=voice;
     }
    }
    element.querySelectorAll(`[data-score-bar="${index}"] [data-rhythm-event]`).forEach(node=>{
      node.dataset.rhythmEvents=index+':'+node.dataset.rhythmEvent;
      node.dataset.rhythmRole='note';
    });
    for(const list of [notes,tabs])list.forEach((note,i)=>{const node=noteElement(note);if(node){node.dataset.scoreBar=index;node.dataset.scoreEvent=i;node.dataset.rhythmEvents=index+':'+i;node.dataset.rhythmRole='note';if(list===notes&&measure[i].rhythmSlash)node.dataset.rhythmSlash='true';if(list===tabs&&!measure[i].rest)node.dataset.rhythmTouch='tab';}});
    measure.forEach((event,i)=>{
      const px=tabs[i].getAbsoluteX(),py=tabPickingPosition==='above'?tab.getYForLine(0)-(tabRhythm&&tabBeamPosition==='above'?((measure.some(e=>e.tuplet)?70:48)+2*(TAB_LINE_SPACING-13)):(measure.some(e=>e.palmMute)?36:14)):tab.getYForLine(stringCount-1)+(tabRhythm&&tabBeamPosition!=='above'?((measure.some(e=>e.tuplet)?72:56)+2*(TAB_LINE_SPACING-13)):25),svg=element.querySelector('svg'),ns='http://www.w3.org/2000/svg';
      const text=event.pickStroke==='down'?'Π':event.pickStroke==='up'?'V':'';
      if(text){const pickGroup=context.openGroup('fretiva-tab-view');pickGroup.setAttribute('data-picking-position',tabPickingPosition);const label=document.createElementNS(ns,'text');Object.entries({x:tabs[i].getStemX(),y:py+(tabPickingPosition==='below'&&measure.some(e=>e.technique==='H'||e.technique==='P')?12:0),'text-anchor':'middle',class:'tabPickingLabel'}).forEach(([k,v])=>label.setAttribute(k,String(v)));label.style.cssText='font:600 11px Arial,sans-serif;fill:#111;stroke:#111;stroke-width:.15;paint-order:stroke fill';label.textContent=text;label.dataset.rhythmEvents=index+':'+i;label.dataset.rhythmRole='picking';pickGroup.append(label);context.closeGroup();}
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
      const path=(d,kind)=>{const node=document.createElementNS(ns,'path');Object.entries({d,fill:'none',stroke:'#171717','stroke-width':1.2,'vector-effect':'non-scaling-stroke','stroke-linecap':'round',class:`fretiva-tab-view ${kind}`,'pointer-events':'none'}).forEach(([k,v])=>node.setAttribute(k,v));node.dataset.rhythmEvents=index+':'+i;svg.append(node);};
      if(event.vibrato){let d=`M ${x-7} ${top-(event.palmMute&&ys.includes(tab.getYForLine(0))?36:15)}`;for(let n=0;n<3;n++)d+=' q 1.5 -2 3 0 q 1.5 2 3 0';path(d,'tabVibrato');}
      if(event.arpeggio&&ys.length>1){const ax=x-tabArpeggioInset(event);let d=`M ${ax} ${top-5}`;for(let y=top-5;y<bottom+5;y+=8)d+=' q -4 2 0 4 q 4 2 0 4';path(d,'tabArpeggio');const ay=event.arpeggio==='up'?top-8:bottom+10,sign=event.arpeggio==='up'?1:-1;path(`M ${ax-4} ${ay+sign*5} L ${ax} ${ay} L ${ax+4} ${ay+sign*5}`,'tabArpeggioArrow');}
    });
    const palmMuteObstacles=drawPalmMute(element.querySelector('svg'),measure,view==='staff'?notes:tabs,view==='staff'?stave:tab,{staff:view==='staff',headroom,tabRhythm,bar:index});
    const expressionObstacles=[...drawExtendedTechniques(element.querySelector('svg'),measure,tabs,tab,{tab:true,bar:index,right:x+w}),...drawExtendedTechniques(element.querySelector('svg'),measure,notes,stave,{tab:false,bar:index,right:x+w})];
    navigation.at(-1).palmMuteObstacles=[...palmMuteObstacles,...expressionObstacles];
    context.openGroup('fretiva-staff-view');beams.forEach(beam => {const group=context.openGroup('etude-beam');group.setAttribute('data-beam-events',beam.getNotes().map(note=>notes.indexOf(note)).join(','));beam.setContext(context).draw();context.closeGroup();});tuplets.forEach(({tuplet,visible})=>{if(visible)tuplet.setContext(context).draw();});context.closeGroup();
    const legatoStarts=new Map(),legatoMembers=new Set();
    const isLegato=i=>['H','P'].includes(measure[i]?.technique)&&measure[i+1]&&!slurCovers(spans,measure[i].id,measure[i+1].id)&&!measure[i].rest&&!measure[i+1].rest&&!measure[i].tones&&!measure[i+1].tones&&measure[i].string===measure[i+1].string;
    for(let i=0;i<measure.length-1;i++){
      if(!isLegato(i)||legatoMembers.has(i))continue;
      let last=i;while(isLegato(last)){legatoMembers.add(last);last++;}
      legatoStarts.set(i,last);
    }
    measure.forEach((n, i) => {
      if (!n.technique || !tabs[i+1] || n.rest || measure[i+1].rest || (n.technique !== 'S' && (n.tones || measure[i+1].tones))) return;
      const tabPair = { first_note: tabs[i], last_note: tabs[i + 1], first_indices: [0], last_indices: [0] };
      const techniqueGroup=context.openGroup('etude-technique');techniqueGroup.dataset.rhythmEvents=index+':'+i;
      if (n.technique === 'S') {
        for (const pair of slidePairs(n, measure[i+1])) {
        const slidePair = {...tabPair, first_indices:[pair.first], last_indices:[pair.last]};
        for(const [mode,list] of [['tab',tabs],['staff',notes]]) {
          if(mode==='staff'&&(n.rhythmSlash||measure[i+1].rhythmSlash))continue;
          const group=context.openGroup(`fretiva-${mode}-view`);
          const first=list[i],last=list[i+1];
          group.dataset.slideFrom=index+':'+i;group.dataset.slideTo=index+':'+(i+1);
          if(mode==='tab')group.dataset.slideMotion=JSON.stringify(drawReadableSlide(context,first,last,pair));
          else {
            new StaveLine({...slidePair,first_note:first,last_note:last}).setContext(context).draw();
            const inset=Math.min(12,Math.max(0,(last.getStemX()-first.getStemX())/3));
            group.dataset.slideMotion=JSON.stringify({x1:first.getStemX()+inset,y1:first.getYs()[pair.first],x2:last.getStemX()-inset,y2:last.getYs()[pair.last]});
          }
          context.closeGroup();
        }
        }
      } else {
        const last=legatoStarts.get(i);
        if(last!==undefined&&!slurCovers(spans,n.id,measure[last].id)){
          const geometry=tabArcGeometry(tabs[i],tabs[last]);
          const arc=document.createElementNS('http://www.w3.org/2000/svg','path');
          Object.entries({d:geometry.d,class:'fretiva-tab-view tabLegatoArc',fill:'none',stroke:'#111','stroke-width':1.25,'vector-effect':'non-scaling-stroke','stroke-linecap':'round','data-legato-start':i,'data-legato-end':last,'data-score-bar':index}).forEach(([k,v])=>arc.setAttribute(k,String(v)));
          arc.dataset.rhythmEvents=Array.from({length:last-i},(_,j)=>index+':'+(i+j)).join(' ');element.querySelector('svg').append(arc);
          const curveGroup=context.openGroup('fretiva-staff-view');curveGroup.dataset.rhythmEvents=arc.dataset.rhythmEvents;new Curve(notes[i],notes[last],{cps:[{x:0,y:8},{x:0,y:8}]}).setContext(context).draw();context.closeGroup();
        }
      }
      // One compact label per connection, in a stable lane for this bar.
      // Never lift labels against objects from other measures or systems.
      const svg=element.querySelector('svg'),label=document.createElementNS('http://www.w3.org/2000/svg','text');
      const firstX=tabs[i].getStemX(),lastX=tabs[i+1].getStemX();
      // Labels belong to this TAB staff; only string 1 needs clearance for its arc.
      let labelY=tab.getYForLine(0)-(n.technique!=='S'&&n.string===1?17:5);
      for(const [start,end] of legatoStarts){
        if(i<start||i>=end||slurCovers(spans,measure[start].id,measure[end].id))continue;
        const arc=tabArcGeometry(tabs[start],tabs[end]);
        labelY=Math.min(labelY,Math.min(arc.y1,arc.y2)-arc.lift*.75-5);
      }
      Object.entries({x:(firstX+lastX)/2,y:labelY,class:'etudeTechniqueLabel fretiva-tab-view','text-anchor':'middle','data-technique':n.technique,'data-score-bar':index,'data-score-event':i}).forEach(([key,value])=>label.setAttribute(key,String(value)));
      label.dataset.rhythmEvents=index+':'+i;label.textContent=n.technique==='S'?'SL':n.technique;
      label.style.cssText='font:400 12px Arial,sans-serif;fill:#111;stroke:none';
      svg.append(label);
      context.closeGroup();
    });
    if(!editor){
      const geometry=document.createElementNS('http://www.w3.org/2000/svg','g');
      geometry.dataset.playbackBar=String(index);geometry.dataset.left=String(x);geometry.dataset.width=String(w);
      geometry.dataset.row=String(placement.row);
      if(lines.pageBreaks?.includes(etude.document?.measures[index]?.id))geometry.dataset.sourcePageBreak='true';
      // Follow the full engraved system, including chord names and upper annotations.
      geometry.dataset.rowTop=String(rowTop);geometry.dataset.rowBottom=String(rowTop+rowHeight);
      geometry.dataset.top=String((view==='tab'?tab:stave).getYForLine(0)-12-headroom);
      geometry.dataset.bottom=String(view==='staff'?stave.getYForLine(4)+28:tab.getYForLine(stringCount-1)+(tabRhythm?60:14));
      let elapsed=0;const points=measure.map((event,i)=>{const tick=event.onset??elapsed;elapsed=tick+ticksOf(event);const note=view==='staff'?notes[i]:tabs[i];return {tick,x:event.rest?notes[i].getAbsoluteX()+notes[i].getGlyphWidth()/2:isBlankEvent(event)?note.getAbsoluteX():note.getStemX()};});
      if(!points.length || points[0].tick>0)points.unshift({tick:0,x:stave.getNoteStartX()});
      points.push({tick:meterTicks(meter),x:x+w-2});
      geometry.dataset.points=JSON.stringify(points);element.querySelector('svg').append(geometry);
    }
    if(editor) {
      const svg=element.querySelector('svg'),ns='http://www.w3.org/2000/svg';
      svg.dataset.staveTop=String((view==='tab'?tab:stave).getYForLine(0));
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
        if(!event.rest&&!event.rhythmSlash)for(const [j,tone] of (event.tones??[event]).entries()){
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
          if(mode==='staff'&&event.rhythmSlash&&j>0)continue;
          const handle=document.createElementNS(ns,'rect'),cx=mode==='tab'?px:heads[j].getAbsoluteX()+heads[j].getWidth()/2,cy=mode==='tab'?tab.getYForLine((tone.string??1)-1):notes[i].getYs()[j],hitHeight=mode==='tab'?Math.min(14,spacing):10;
          Object.entries({x:cx-10,y:cy-hitHeight/2,width:20,height:hitHeight,'data-event':i,'data-string':tone.string,'data-drag-tone':tone.string,'data-tone-id':tone.id,'data-mode':mode,'data-staff-bottom':stave.getYForLine(4),'data-midi':tone.midi,'data-cursor-x':cx-12,'data-cursor-y':cy-7,class:'etudeEditorHit etudeNoteHandle',fill:'transparent'}).forEach(([k,v])=>handle.setAttribute(k,String(v)));svg.append(handle);
        }
      });
    }
    const dynamicText=measure.find(e=>e.dynamicText)?.dynamicText;
    if(dynamicText){
      const label=document.createElementNS('http://www.w3.org/2000/svg','text');
      label.textContent=dynamicText;label.dataset.scoreBar=String(index);label.dataset.scoreDynamic='true';
      label.setAttribute('x',String(x+12));
      label.setAttribute('y',String(view==='staff'?stave.getYForLine(4)+65+footroom:tab.getYForLine(stringCount-1)+(tabRhythm?88:34)));
      label.style.cssText='font:italic 600 14px Georgia,serif;fill:#111;stroke:none';
      element.querySelector('svg').append(label);
    }
    metrics.push(notes.map((n, i) => ({ noteX: n.getAbsoluteX(), tabX: tabs[i].getAbsoluteX(), end: x + w,
      noteCenterX:n.getCenterGlyphX(),tabCenterX:tabs[i].getCenterGlyphX(),
      rest:measure[i].rest, blank:isBlankEvent(measure[i]), line: n.getKeyProps?.()[0]?.line??3, expectedLine: measure[i].rest||measure[i].rhythmSlash ? (n.getKeyProps?.()[0]?.line??3) : (staffStepForPitch(measure[i].pitch,etude.instrument)+2)/2,
      tones: measure[i].rest ? [] : (measure[i].tones ?? [measure[i]]).map((tone,j)=>({
        line:n.getKeyProps()[measure[i].rhythmSlash?0:j].line, expectedLine:measure[i].rhythmSlash?n.getKeyProps()[0].line:(staffStepForPitch(tone.pitch,etude.instrument)+2)/2,
        tab:tabs[i].getPositions()[j], expectedTab:{str:tone.string,fret:tone.fret},
      })),
      accidentals: n.getModifiers().filter(m => m.getCategory() === 'Accidental').map(m => m.type) })));
  });
  if(etude.incomingTie&&drawn[0]&&!drawn[0].event.rest){
    const b=drawn[0],indices=(b.event.tones??[b.event]).map((_,j)=>j);
    context.openGroup('fretiva-staff-view');new StaveTie({last_note:b.note,first_indices:b.event.rhythmSlash?[0]:indices,last_indices:b.event.rhythmSlash?[0]:indices}).setContext(context).draw();context.closeGroup();
    context.openGroup('fretiva-tab-view');new ReadableTabTie({last_note:b.tab,first_indices:indices,last_indices:indices},'').setContext(context).draw();context.closeGroup();
  }
  for(let i=0;i<drawn.length;i++){
    const a=drawn[i];if(!a.event.tieTo||a.event.rest)continue;const b=drawn.find(n=>n.event.id===a.event.tieTo);
    const same=b?.event.id===a.event.tieTo&&!b.event.rest&&b.row===a.row;
    const indices=(a.event.tones??[a.event]).map((_,j)=>j);
    const staffIndices=a.event.rhythmSlash||b?.event.rhythmSlash?[0]:indices;
    const tieGroup=context.openGroup('scoreTieConnection');tieGroup.dataset.rhythmEvents=a.key;
    context.openGroup('fretiva-staff-view');new StaveTie({first_note:a.note,last_note:same?b.note:undefined,first_indices:staffIndices,last_indices:staffIndices}).setContext(context).draw();context.closeGroup();
    context.openGroup('fretiva-tab-view');new ReadableTabTie({first_note:a.tab,last_note:same?b.tab:undefined,first_indices:indices,last_indices:indices},'').setContext(context).draw();context.closeGroup();
    if(b?.event.id===a.event.tieTo&&!same){context.openGroup('fretiva-staff-view');new StaveTie({last_note:b.note,first_indices:staffIndices,last_indices:staffIndices}).setContext(context).draw();context.closeGroup();context.openGroup('fretiva-tab-view');new ReadableTabTie({last_note:b.tab,first_indices:indices,last_indices:indices},'').setContext(context).draw();context.closeGroup();}
    context.closeGroup();
  }
  const svg = element.querySelector('svg');
  svg.querySelectorAll('.vf-etude-technique .vf-fretiva-staff-view path,.vf-scoreTieConnection .vf-fretiva-staff-view path').forEach(path=>{path.setAttribute('stroke','#111');path.setAttribute('stroke-width','.65');path.setAttribute('vector-effect','non-scaling-stroke');});
  // Place navigation after stems and beams have their final geometry. A mark
  // starts next to the stave and moves only when its own horizontal span meets
  // visible notation; blank slots and the hidden staff do not reserve space.
  for(const item of navigation){
    const {notes,tabs,measure,beams,tuplets,top,x,first,start,measureNumberX}=item;
    const obstacles=[...(item.palmMuteObstacles??[]),{x:measureNumberX-8,y:top-(first&&view!=='tab'?36:24),width:16,height:14}];
    if(view==='tab')for(const node of svg.querySelectorAll(`.etudeTabRhythm[data-score-bar="${item.index-barOffset}"]>*,.tabRests[data-score-bar="${item.index-barOffset}"]>*,.tabPickingLabel[data-rhythm-events^="${item.index-barOffset}:"],.vf-scoreTieConnection[data-rhythm-events^="${item.index-barOffset}:"] .vf-fretiva-tab-view path`)){
      const b=node.getBBox(),matrix=svg.getScreenCTM().inverse().multiply(node.getScreenCTM());
      const a=new DOMPoint(b.x,b.y).matrixTransform(matrix),z=new DOMPoint(b.x+b.width,b.y+b.height).matrixTransform(matrix);
      obstacles.push({x:a.x-2,y:a.y-2,width:z.x-a.x+4,height:z.y-a.y+4});
    }
    if(first)obstacles.push({x,y:top-(view==='tab'?0:22),width:start-x,height:65});
    measure.forEach((event,i)=>{
      if(isBlankEvent(event))return;
      if(view==='tab'){
        if(event.rest)return;
        const ys=tabs[i].getYs(),left=tabs[i].getAbsoluteX();
        obstacles.push({x:left,y:Math.min(...ys)-11,width:tabs[i].getGlyphWidth(),height:Math.max(...ys)-Math.min(...ys)+22});
        if(event.vibrato)obstacles.push({x:left-8,y:Math.min(...ys)-22,width:32,height:18});
        if(event.arpeggio)obstacles.push({x:tabs[i].getStemX()-tabArpeggioInset(event)-4,y:Math.min(...ys)-14,width:8,height:Math.max(...ys)-Math.min(...ys)+28});
        if(event.technique&&tabs[i+1])obstacles.push({x:left,y:top-25,width:tabs[i+1].getAbsoluteX()-left+15,height:23});
      }else{
        const b=notes[i].getBoundingBox(),hasAccidental=notes[i].getModifiers().some(m=>m.getCategory()==='Accidental'),y=hasAccidental?Math.min(b.getY()-3,Math.min(...notes[i].getYs())-16):b.getY()-3;obstacles.push({x:b.getX(),y,width:b.getW(),height:b.getY()+b.getH()+3-y});
      }
    });
    if(view!=='tab'){
      for(const beam of beams){const ns=beam.getNotes(),xs=ns.map(n=>n.getStemX()),ys=ns.flatMap(n=>{const s=n.getStemExtents();return [s.topY,s.baseY];});obstacles.push({x:Math.min(...xs),y:Math.min(...ys)-5,width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)+10});}
      for(const {tuplet,visible} of tuplets)if(visible){const ns=tuplet.getNotes();obstacles.push({x:ns[0].getTieLeftX()-5,y:tuplet.getYPosition()-16,width:ns.at(-1).getTieRightX()-ns[0].getTieLeftX()+10,height:28});}
    }
    // Attach chord names to their own bar. Only actual ink in the label's
    // horizontal span lifts it; reserved upper-voice space is not a margin.
    for(const label of svg.querySelectorAll(`[data-annotation-bar="${item.index}"][data-score-annotation="harmony"],[data-annotation-bar="${item.index}"][data-score-annotation="chord"]`)){
      let b=label.getBBox();
      if(label.dataset.scoreAnnotation==='chord'){
        // TAB diagrams follow the ink directly beneath them. Staff views also
        // reserve the full bar's upper voices, ledger lines and curved ties.
        const bottom=desktopPage&&view==='tab'
          ? navigationBottom(b.x,b.x+b.width,top-2,b.height,obstacles)
          : desktopPage?navigationBottom(x,x+item.width,top-18,b.height,obstacles,{span:true})-10
          : navigationBottom(b.x,b.x+b.width,top-8,b.height,obstacles);
        const dy=bottom-b.y-b.height;
        label.firstElementChild.setAttribute('transform',`translate(0 ${dy})`);
        b=label.getBBox();
      }else if(label.dataset.scoreAnnotation==='harmony'){
        const bottom=navigationBottom(b.x,b.x+b.width,top-14,b.height,obstacles);
        const dy=bottom-b.y-b.height;
        for(const span of label.querySelectorAll('tspan'))span.setAttribute('y',String(Number(span.getAttribute('y'))+dy));
        b=label.getBBox();
      }
      obstacles.push({x:b.x,y:b.y,width:b.width,height:b.height});
    }
    drawScoreNavigation(context,svg,{...item,obstacles});
    const panel=svg.querySelector('[data-navigation-bar="'+item.index+'"] [data-score-annotation="section"]');if(panel)panel.dataset.annotationBar=String(item.index);
    applyAnnotationOffsets(svg,item.index,etude.document?.measures?.[item.index]?.annotationOffsets??etude.annotationOffsets?.[item.index-barOffset]);
  }
  alignNavigationEndings(navigation.map(item=>({index:item.index,row:item.row,number:item.mark.ending,node:svg.querySelector(`[data-ending-bar="${item.index}"]`)})));
  drawSlurs(svg,drawn,spans);
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
  svg.setAttribute('aria-label', localizeUi(`${etude.title}, ${(etude.meter??[4,4]).join("/")}, BPM ${bpm}, ${view==='staff'?ko["etudes.staff"]:view==='tab'?'TAB':ko["etudes.notationAndTab"]}`));
  svg.style.width = '100%'; svg.style.height = 'auto'; svg.style.display = 'block';
  return metrics;
}

// Keep only a bounded set of detached vector trees. Navigating away still
// unmounts the studio and stops audio; returning doesn't engrave it again.
const scoreCache = new Map();
function scoreCacheKey(etude,options) {
  return `${etude.id}:${Boolean(options.mobile)}:${Boolean(options.enlarged)}:${Boolean(options.landscape)}:${options.view??"both"}:${options.editorWidth??""}:${Boolean(options.responsive)}:${options.measuresPerRow??0}:${Boolean(options.rhythmicSpacing)}:${Boolean(options.desktopPage)}:${options.language??""}`;
}
export function renderCachedScore(element, etude, options = {}) {
  const key = scoreCacheKey(etude,options);
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

function Score({ practiceRange=null,onSelectBar,selectedBar=null,etude, mobile, bpm, enlarged = false, view, playPosition=null, followPlayback=false,followMode,rhythmProgress=true,responsive=false,measuresPerRow=0,zoom=1,focusLayout=false,paginatedDesktop=false,paginatedMobile=false,pageHeader,pageFooter }) {
  const language=useLanguage();
  const route=playPosition?.route;
  const rhythmStates=useMemo(()=>rhythmTimeline(practiceRange?{...etude,practiceRange}:etude,route),[etude,practiceRange,route]);
  const ref = useRef(null);
  const positionRef=useRef(playPosition);positionRef.current=playPosition;
  const drawPositionRef=useRef(null);
  const playheadLayerRef=useRef(null);
  const selectBarRef=useRef(onSelectBar);selectBarRef.current=onSelectBar;
  const hasPosition=Boolean(playPosition),isPlaying=Boolean(playPosition?.playing),canSelectBar=Boolean(onSelectBar);
  const [availableWidth,setAvailableWidth]=useState(paginatedDesktop?DESKTOP_SCORE_CONTENT_WIDTH:0);
  const [pageMounts,setPageMounts]=useState(null);
  useLayoutEffect(()=>{if(paginatedDesktop){setAvailableWidth(DESKTOP_SCORE_CONTENT_WIDTH);return;}if(!responsive)return;const viewport=ref.current.closest('.etudeScoreViewport');const target=mobile&&viewport?viewport:ref.current;const measure=()=>{const sheet=mobile&&viewport?getComputedStyle(viewport.querySelector('.etudeSheet')):null;const width=target.clientWidth-(sheet?(parseFloat(sheet.paddingLeft)||0)+(parseFloat(sheet.paddingRight)||0):0);setAvailableWidth(Math.max(0,Math.round(width)));};measure();const observer=new ResizeObserver(measure);observer.observe(target);return()=>observer.disconnect();},[responsive,mobile,paginatedDesktop]);
  const practiceFollow=usePracticeFollow(ref,followMode,Boolean(playPosition?.playing),[availableWidth,view,zoom,focusLayout,measuresPerRow].join(":"));
  const follow=usePlaybackFollow(ref,followPlayback&&Boolean(playPosition?.playing));
  const followRef=useRef(follow);followRef.current=(line,current)=>followMode?practiceFollow.follow(line,current):follow(line);
  const [error, setError] = useState('');
  const [rendering,setRendering]=useState(true);
  const [renderRevision,setRenderRevision]=useState(0);
  const rhythmicSpacing=followMode==='fingering';
  const [landscape, setLandscape] = useState(() => window.matchMedia('(orientation: landscape)').matches);
  useLayoutEffect(() => {
    const query = window.matchMedia('(orientation: landscape)');
    const update = () => setLandscape(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    let firstFrame,secondFrame,timer;
    const renderZoom=focusLayout?1:zoom;
    const options={ mobile, enlarged, landscape, view, responsive,desktopPage:paginatedDesktop,language,rhythmicSpacing,measuresPerRow,editorWidth:paginatedDesktop?DESKTOP_SCORE_CONTENT_WIDTH:responsive?Math.max(240,availableWidth/renderZoom):mobile&&!landscape&&!enlarged?600:undefined };
    const engravingOptions=paginatedMobile?{...options,editorWidth:Math.max(218,availableWidth-22)}:options;
    const render=()=>{
    try {
      if(paginatedDesktop){
        const pages=withIsolatedScore(DESKTOP_SCORE_CONTENT_WIDTH,host=>{
          renderCachedScore(host,etude,options);
          return createDesktopScorePages(host.querySelector('svg'));
        });
        ref.current.replaceChildren(pages);
        setPageMounts({header:ref.current.querySelector('.desktopScorePageHeader'),footer:ref.current.querySelector('.desktopScorePageExtra')});
      }else if(paginatedMobile){
        const pageWidth=Math.max(240,availableWidth)*zoom;
        const pages=withIsolatedScore(pageWidth,host=>{
          renderCachedScore(host,etude,engravingOptions);
          return createMobileScorePages(host.querySelector('svg'),pageWidth);
        });
        ref.current.replaceChildren(pages);
      }else renderCachedScore(ref.current,etude,options);
      if(responsive&&!paginatedDesktop&&!paginatedMobile){
        const svg=ref.current.querySelector('svg');
        // Keep the complete engraved system inside the landscape viewport,
        // even when dense notation requires a wider internal coordinate space.
        svg.style.width=(mobile?mobileScoreWidth(availableWidth,Number(svg.getAttribute('width')),zoom,focusLayout):focusLayout?availableWidth*zoom:Math.max(availableWidth,Number(svg.getAttribute('width'))*zoom))+'px';
        svg.style.maxWidth='none';
        // Fill the reader width consistently; tall systems scroll vertically
        // instead of shrinking chord charts and fret numbers to fit two rows.
      }
      setError('');
    }
    catch (e) { ref.current?.replaceChildren(); setError(ko["etudes.couldNotDisplayTheScoreChooseAnotherExercise"]); console.error(e); }
    finally {setRendering(false);setRenderRevision(v=>v+1);}
    };
    // Cached pages can appear immediately. A cold engraving lets feedback paint
    // once, then measures notation without recalculating the rest of the app.
    if(scoreCache.get(scoreCacheKey(etude,engravingOptions))?.etude===etude)render();
    else {
      setRendering(true);
      firstFrame=requestAnimationFrame(()=>{secondFrame=requestAnimationFrame(()=>{timer=setTimeout(render,0);});});
    }
    return()=>{cancelAnimationFrame(firstFrame);cancelAnimationFrame(secondFrame);clearTimeout(timer);};
  }, [etude, mobile, enlarged, landscape, view, responsive, availableWidth, zoom, measuresPerRow,focusLayout,rhythmicSpacing,language,paginatedDesktop,paginatedMobile]);
  useEffect(() => {
    ref.current?.querySelectorAll('svg[data-notation-view]').forEach(svg=>svg.setAttribute('aria-label', localizeUi(`${etude.title}, ${(etude.meter??[4,4]).join("/")}, BPM ${bpm}, ${view==='staff'?ko["etudes.staff"]:view==='tab'?'TAB':ko["etudes.notationAndTab"]}`)));
  }, [renderRevision,etude, mobile, enlarged, landscape, bpm, view,language]);
  useLayoutEffect(()=>{
    const layer=createScorePlayheadLayer(ref.current);playheadLayerRef.current=layer;
    return()=>{layer.destroy();playheadLayerRef.current=null;};
  },[renderRevision]);
  useEffect(()=>{
    const root=ref.current,svg=root?.querySelector('svg[data-notation-view]');if(!svg||!hasPosition)return;
    const progressEnabled=rhythmProgress&&followMode!=='off';
    const layer=playheadLayerRef.current;
    const highlight=rhythmHighlighter(root,rhythmStates);let frame,activeBar,points,line,wash;
    const draw=()=>{
      const position=positionRef.current;if(!position)return;
      const current=position.getCurrentSlot?.()??position;
      if(activeBar!==current.bar){const bar=root.querySelector(`[data-playback-bar="${current.bar}"]`);if(!bar)return;activeBar=current.bar;
        const pair=layer.activate(bar.ownerSVGElement,progressEnabled);if(!pair)return;({line,wash}=pair);
        highlightScoreBar(root,progressEnabled?current.bar:null);
        points=rhythmAnchors(JSON.parse(bar.dataset.points));line.setAttribute('y1',bar.dataset.top);line.setAttribute('y2',bar.dataset.bottom);}
      const tick=position.getTimelineTick?position.getTimelineTick()-current.barStart:position.getBarTick?.()??points[current.event]?.tick??0;
      highlight.update(current.barStart+tick,progressEnabled);



      line.dataset.progressMode=followMode??'fingering';
      const x=playheadX(points,tick);line.setAttribute('x1',x);line.setAttribute('x2',x);line.dataset.tick=String(tick);line.dataset.bar=String(current.bar);line.dataset.visit=String(current.visit??0);for(const attr of ['x1','x2','y1','y2'])wash.setAttribute(attr,line.getAttribute(attr));followRef.current(line,current);
      if(position.playing)frame=requestAnimationFrame(draw);
    };drawPositionRef.current=draw;draw();
    return()=>{drawPositionRef.current=null;cancelAnimationFrame(frame);layer.hide();highlight.clear();};
  },[renderRevision,hasPosition,isPlaying,etude,mobile,enlarged,landscape,view,availableWidth,zoom,measuresPerRow,focusLayout,followMode,rhythmProgress,rhythmStates]);
  useEffect(()=>{if(!isPlaying)drawPositionRef.current?.();},[playPosition,isPlaying]);
  useEffect(()=>{if(!hasPosition)highlightScoreBar(ref.current,selectedBar);},[renderRevision,hasPosition,selectedBar]);
  useEffect(()=>{
   const root=ref.current;if(!root?.querySelector('svg[data-notation-view]')||!canSelectBar)return;
   const position=positionRef.current,highlightedBar=position?(position.getCurrentSlot?.()??position).bar:selectedBar;
   const nodes=[];for(const bar of root.querySelectorAll('[data-playback-bar]')){const r=document.createElementNS('http://www.w3.org/2000/svg','rect'),index=Number(bar.dataset.playbackBar);for(const [k,v] of Object.entries({x:bar.dataset.left,y:bar.dataset.top,width:bar.dataset.width,height:Number(bar.dataset.bottom)-Number(bar.dataset.top),fill:index===highlightedBar?'rgba(190,155,98,.12)':'transparent',stroke:index===highlightedBar?'rgba(190,155,98,.3)':'none',rx:5,role:'button',tabindex:0,'aria-label':formatMessage(ko["etudes.startAtBarValue"], { value1: index+1 }),'data-start-bar':index}))r.setAttribute(k,v);r.style.cursor='pointer';r.onclick=()=>selectBarRef.current?.(index);r.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectBarRef.current?.(index);}};bar.ownerSVGElement.append(r);nodes.push(r);}return()=>nodes.forEach(n=>n.remove());
  },[renderRevision,etude,canSelectBar,selectedBar,mobile,enlarged,landscape,view,responsive,availableWidth,zoom,measuresPerRow,focusLayout,followMode]);
  return <>{paginatedMobile&&<MobileScorePageNav root={ref} revision={renderRevision} scoreId={etude.id} onNavigate={practiceFollow.suspend}/>} {!paginatedDesktop&&etude.document&&tuningCaption(etude.document)&&<p className="scoreTuningCaption">{tuningCaption(etude.document)}</p>}{paginatedDesktop&&pageMounts?.header&&createPortal(<>{pageHeader}{etude.document&&tuningCaption(etude.document)&&<p className="scoreTuningCaption">{tuningCaption(etude.document)}</p>}</>,pageMounts.header)}{paginatedDesktop&&pageMounts?.footer&&pageFooter&&createPortal(pageFooter,pageMounts.footer)}{followMode!=='off'&&playPosition&&practiceFollow.suspended&&<button className="etudeReturnPosition" type="button" onClick={practiceFollow.resume} title={translateUi("etudes.goToPlayheadAndResumeAutoScroll")}><LocateFixed size={14} aria-hidden="true"/><span><Translation id="etudes.goToPlayhead" /></span></button>}{error && <p role="alert">{localizeUi(error)}</p>}<div className="scoreRenderFeedback" role="status" aria-live="polite" hidden={!rendering}><span className="scoreRenderBadge"><span className="scoreRenderSpinner" aria-hidden="true"/><Translation id="etudes.preparingScore" /></span></div><div className={'etudeNotation'+(paginatedDesktop?' desktopScorePageGrid':paginatedMobile?' mobileScorePageStack':'')} ref={ref} aria-busy={rendering} style={rendering?{minHeight:160,pointerEvents:'none'}:undefined} /></>;
}
export default memo(Score);



