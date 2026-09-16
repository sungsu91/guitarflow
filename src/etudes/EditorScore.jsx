import {ArrowUp,ArrowDown} from 'lucide-react';
import useScorePinch from '../hooks/useScorePinch.js';
import {memo,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {drawScore} from './Score.jsx';
import {midiAtStaffStep,pitchForMidi} from './scoreModel.js';
import useScoreDrag from './useScoreDrag.js';
import {measureLayout} from './measureLayout.js';
export const editorRenderStats={bars:0,totalMs:0,maxMs:0,samples:[]};
// Profiling found global application selectors dominate style recalculation on
// every SVG edit. A scoped tree keeps the same renderer and musical data while
// preventing unrelated screen/theme rules from matching hundreds of glyphs.
const engravingStyle=`:host([data-view=staff]) :is(.vf-fretiva-tab-view,.fretiva-tab-view,[data-mode=tab]),:host([data-view=tab]) :is(.vf-fretiva-staff-view,[data-mode=staff]),:host([data-view=staff]) .vf-fretiva-both-view,:host([data-view=tab]) .vf-fretiva-both-view{display:none}:host{display:block}svg{color:#111;background:white}text{fill:#111}.etudeMeasureNumber{font:700 13px Arial;fill:#111}.etudeEditorHit{cursor:crosshair;pointer-events:all;fill:transparent;stroke:none}.etudeEditorHit:hover{fill:#58968018}.etudeNoteHandle{cursor:grab;touch-action:none}:host([data-drag=false]) .etudeNoteHandle{cursor:crosshair;touch-action:pan-x pan-y}.etudeEditorHit.is-cursor{fill:#2f89672a;stroke:#157251;stroke-width:2;vector-effect:non-scaling-stroke}`;
const Measure=memo(function Measure({notes,chord,harmony,index,keySignature,meter,mobile,incomingTie,selection,beamSelection,onSelect,view,tabRhythm,playPosition,playingRow,allowDrag,placement,layoutEdit,breakBefore,onBreak,systemStart,systemEnd,scoreEnd,systemHeadroom}) {
 // Single-staff mobile editing uses normal-sized engraving rather than the
 // compact two-staff overview. Re-engrave so hit targets follow the notes.
 const editorWidth=Math.max(240,(mobile?(view==='both'?600:400):980)*placement.span/12);
 const ref=useRef(null),[error,setError]=useState('');
 useLayoutEffect(()=>{const start=performance.now();try{
  const root=ref.current.shadowRoot??ref.current.attachShadow({mode:'open'});
  const content=document.createElement('div');root.replaceChildren(content);
  drawScore(content,{id:`editor-${index}`,title:'편집 마디',bpm:60,keySignature,meter,incomingTie,measures:[notes],chordShapes:chord?[chord]:undefined,harmony:[harmony]},{mobile,editor:true,barOffset:index,tabRhythm,view,editorWidth,systemStart,systemEnd,scoreEnd,systemHeadroom});const style=document.createElement('style');style.textContent=engravingStyle;root.append(style);setError('');
 }catch(e){setError(`이 마디를 표시하지 못했습니다: ${e.message}`);}
 const elapsed=performance.now()-start;editorRenderStats.bars++;editorRenderStats.totalMs+=elapsed;editorRenderStats.maxMs=Math.max(elapsed,editorRenderStats.maxMs);editorRenderStats.samples.push(elapsed);if(editorRenderStats.samples.length>256)editorRenderStats.samples.shift();ref.current.dataset.drawCount=String(Number(ref.current.dataset.drawCount??0)+1);ref.current.dataset.drawMs=String(elapsed);
 },[notes,chord,harmony,index,keySignature,meter,mobile,incomingTie,tabRhythm,view,editorWidth,systemStart,systemEnd,scoreEnd,systemHeadroom]);
 useLayoutEffect(()=>{
  const root=ref.current.shadowRoot;if(!root)return;root.querySelector('.etudeInputCursor')?.remove();if(!selection)return;
  const selector=`[data-event="${selection.event}"][data-mode="${selection.mode}"][data-string="${selection.string}"]`;
  const el=root.querySelector(`.etudeNoteHandle${selector}`)??root.querySelector(selection.mode==='tab'?selector:`[data-event="${selection.event}"][data-mode="staff"]`);if(!el)return;
  let y=Number(el.dataset.cursorY),height=14;
  if(selection.mode==='staff'){const p=pitchForMidi(selection.midi??60,keySignature),step=(p.octave-3)*7+'CDEFGAB'.indexOf(p.letter)-2;y=Number(el.dataset.staffBottom)-step*5-5;height=10;}
  // A light background behind the engraving keeps even two-digit frets readable.
  const marker=document.createElementNS('http://www.w3.org/2000/svg','rect');Object.entries({class:'etudeInputCursor is-cursor',x:Number(el.dataset.cursorX)-2,y,width:28,height,rx:3,fill:'#167254','fill-opacity':0.16,stroke:'none','aria-label':'현재 입력 위치','pointer-events':'none'}).forEach(([k,v])=>marker.setAttribute(k,String(v)));el.ownerSVGElement.prepend(marker);
 },[notes,selection,keySignature,view,editorWidth,systemStart,systemEnd,scoreEnd,systemHeadroom]);
 useLayoutEffect(()=>{
  const root=ref.current.shadowRoot;root?.querySelector('.etudeBeamRangeSelection')?.remove();if(!beamSelection)return;
  const first=Math.min(beamSelection.start,beamSelection.end),last=Math.max(beamSelection.start,beamSelection.end);
  const a=root.querySelector(`.etudeEditorHit[data-event="${first}"][data-mode="tab"]`),b=root.querySelector(`.etudeEditorHit[data-event="${last}"][data-mode="tab"]`);if(!a||!b)return;
  const svg=a.ownerSVGElement,rect=document.createElementNS('http://www.w3.org/2000/svg','rect');
  Object.entries({class:'etudeBeamRangeSelection',x:a.getAttribute('x'),y:18,width:Number(b.getAttribute('x'))+Number(b.getAttribute('width'))-Number(a.getAttribute('x')),height:svg.viewBox.baseVal.height-36,fill:'#795536', 'fill-opacity':0.12,stroke:'#795536','stroke-width':1,'pointer-events':'none','data-range-start':first,'data-range-end':last}).forEach(([k,v])=>rect.setAttribute(k,String(v)));svg.prepend(rect);
 },[beamSelection,notes,view,editorWidth,systemStart,systemEnd,scoreEnd,systemHeadroom]);
 useLayoutEffect(()=>{ref.current.dataset.drag=String(allowDrag);},[allowDrag]);
 useLayoutEffect(()=>{ref.current.dataset.view=view;ref.current.shadowRoot?.querySelector('svg')?.setAttribute('aria-label',view==='tab'?'TAB 악보':view==='staff'?'오선보 악보':'오선보와 TAB 악보');},[view,editorWidth,systemStart,systemEnd,scoreEnd,systemHeadroom]);
 // Keep the row wash behind the engraving and animate only one SVG line.
 // The audio clock drives its position; notation is not redrawn per frame.
 useLayoutEffect(()=>{
  const root=ref.current.shadowRoot,svg=root?.querySelector('svg');if(!svg||!playingRow)return;
  const band=document.createElementNS('http://www.w3.org/2000/svg','rect');
  const top=Number(svg.dataset.playbackTop),bottom=Number(svg.dataset.playbackBottom);
  Object.entries({class:'etudePlayingRow',x:0,y:top,width:svg.viewBox.baseVal.width,height:bottom-top,fill:'#795536','fill-opacity':.055,stroke:'none','pointer-events':'none'}).forEach(([k,v])=>band.setAttribute(k,String(v)));
  svg.prepend(band);return()=>band.remove();
 },[playingRow,notes,tabRhythm,view,editorWidth,systemStart,systemEnd,scoreEnd,systemHeadroom]);
 useLayoutEffect(()=>{
  const root=ref.current.shadowRoot,svg=root?.querySelector('svg');if(!svg||!playPosition)return;
  const centers=notes.map((note,event)=>{
   const hit=root.querySelector(`.etudeEditorHit[data-event="${event}"][data-mode="tab"][data-string="1"]`);
   return {tick:note.onset,x:hit?Number(hit.dataset.cursorX)+12:0};
  });
  centers.push({tick:meter[0]*1920/meter[1],x:svg.viewBox.baseVal.width-2});
  const marker=document.createElementNS('http://www.w3.org/2000/svg','line');
  Object.entries({class:'etudePlayingSlot',y1:svg.dataset.playbackTop,y2:svg.dataset.playbackBottom,stroke:'#795536','stroke-opacity':.8,'stroke-width':1.5,'vector-effect':'non-scaling-stroke','pointer-events':'none','aria-label':'리듬 재생 위치'}).forEach(([k,v])=>marker.setAttribute(k,String(v)));
  svg.append(marker);let frame;
  const paint=()=>{
   const tick=playPosition.getBarTick?.()??notes[playPosition.event]?.onset??0;
   const index=Math.max(0,Math.min(centers.length-2,centers.findLastIndex(p=>p.tick<=tick)));
   const from=centers[index],to=centers[index+1],fraction=Math.max(0,Math.min(1,(tick-from.tick)/(to.tick-from.tick||1)));
   const x=from.x+(to.x-from.x)*fraction;
   marker.setAttribute('x1',String(x));marker.setAttribute('x2',String(x));
   marker.dataset.tick=String(tick);frame=requestAnimationFrame(paint);
  };
  paint();return()=>{cancelAnimationFrame(frame);marker.remove();};
 },[playPosition,notes,meter,tabRhythm,view,editorWidth,systemStart,systemEnd,scoreEnd,systemHeadroom]);
 const click=e=>{if(e.target.closest('.etudeMeasureLayoutTools'))return;const hit=ref.current.shadowRoot?.elementFromPoint(e.clientX,e.clientY)?.closest?.('[data-event]')??e.nativeEvent.composedPath().find(node=>node.dataset?.event!==undefined);if(!hit){onSelect({bar:index,event:0,string:selection?.string??6,mode:'tab',target:'bar'});e.currentTarget.closest('[data-score-input]')?.focus({preventScroll:true});return;}const mode=hit.dataset.mode;let midi;
  if(mode==='staff'){const svg=hit.ownerSVGElement,p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const local=p.matrixTransform(svg.getScreenCTM().inverse());const step=Math.round((Number(hit.dataset.staffBottom)-local.y)/5);midi=midiAtStaffStep(step,keySignature);}
  onSelect({bar:index,event:Number(hit.dataset.event),string:hit.classList.contains('etudePickHit')?(selection?.string??6):Number(hit.dataset.string??1),mode,midi:hit.dataset.midi!==undefined?Number(hit.dataset.midi):midi});e.currentTarget.closest('[data-score-input]')?.focus({preventScroll:true});
 };
 return <section data-pinch-anchor data-bar-index={index} data-layout-row={placement.row} className="etudeEditorMeasure" style={{gridRow:placement.row,gridColumn:`${placement.column} / span ${placement.span}`,'--layout-tool-overlap':`${20*placement.span/12}px`}} onClick={click}>
  {layoutEdit&&<div className="etudeMeasureLayoutTools"><span>{index+1}</span><button type="button" aria-label={`${index+1}마디 ${breakBefore?'윗줄과 합치기':'새 줄로 나누기'}`} title={breakBefore?'윗줄과 합치기':'새 줄로 나누기'} disabled={!index} onClick={()=>onBreak(index,!breakBefore)}>{breakBefore?<ArrowUp size={20}/>:<ArrowDown size={20}/>}</button></div>}
  {error&&<p role="alert">{error}</p>}<div ref={ref}/></section>;
});
export default function EditorScore({score,mobile,cursor,beamSelection,beamRangeMode,onBeamRange,onSelect,onKeyDown,onMove,onMessage,zoom=100,onZoomChange,zoomController,view='both',pageView=false,onLayoutChange,tabRhythm=false,playPosition=null,allowDrag=true}) {
 const ref=useRef(null),contentRef=useRef(null),boundsRef=useRef(null),[layoutEdit,setLayoutEdit]=useState(false);
 const perRow=score.document.viewSettings?.measuresPerRow??1,breaks=score.document.viewSettings?.systemBreaks??[];
 const systemHeadroom=Math.ceil(Math.max(0,...score.measures.flat().filter(n=>!n.rest).flatMap(n=>n.tones??[n]).map(n=>((n.pitch.octave-3)*7+'CDEFGAB'.indexOf(n.pitch.letter))/2-7))*10);
 const placements=useMemo(()=>measureLayout(score.document.measures,perRow,breaks),[score.document.measures,perRow,breaks]);
 const onBreak=(index,enabled)=>{const id=score.document.measures[index]?.id;if(!index||!id)return;onLayoutChange({measuresPerRow:perRow,systemBreaks:enabled?[...new Set([...breaks,id])]:breaks.filter(x=>x!==id)});};
 const pinch=useScorePinch({enabled:mobile,viewport:ref,content:contentRef,bounds:boundsRef,zoom,onZoom:onZoomChange,controller:zoomController});
 const dragHandlers=useScoreDrag({canvas:ref,score,onSelect,onMove,onMessage,enabled:allowDrag});
 useLayoutEffect(()=>{const canvas=ref.current;if(pinch.isBusy())return;const selected=[...canvas.querySelectorAll('[data-draw-count]')].map(host=>host.shadowRoot?.querySelector(playPosition?'.etudePlayingSlot':'.etudeStaffCursor,.is-cursor')).find(Boolean);if(!selected)return;const b=canvas.getBoundingClientRect(),measure=canvas.querySelector(`[data-bar-index="${playPosition?.bar??cursor.bar}"]`)?.getBoundingClientRect(),a=measure&&measure.height<=b.height-12?measure:selected.getBoundingClientRect();if(a.top<b.top+12)canvas.scrollTop+=a.top-b.top-12;else if(a.bottom>b.bottom-12)canvas.scrollTop+=a.bottom-b.bottom+12;if(a.left<b.left+12)canvas.scrollLeft+=a.left-b.left-12;else if(a.right>b.right-12)canvas.scrollLeft+=a.right-b.right+12;},[cursor,mobile?null:zoom,playPosition,perRow,breaks]);
 useLayoutEffect(()=>{const node=ref.current;if(!node.dataset.inputAt)return;const start=Number(node.dataset.inputAt);delete node.dataset.inputAt;requestAnimationFrame(()=>{node.inputMeasurements??=[];node.inputMeasurements.push(performance.now()-start);if(node.inputMeasurements.length>256)node.inputMeasurements.shift();});},[score,cursor]);
 return <><div className="etudeMeasureLayoutBar" aria-label="마디 배치"><span>한 줄</span><div role="group" aria-label="한 줄 마디 수">{[1,2,3,4].map(n=><button type="button" key={n} aria-label={`한 줄 ${n}마디`} aria-pressed={perRow===n} onClick={()=>{onLayoutChange({measuresPerRow:n,systemBreaks:[]});if(n===1)setLayoutEdit(false);}}>{n}</button>)}</div><span>마디</span><button type="button" aria-pressed={layoutEdit} disabled={perRow===1} title="2마디 이상 배치에서 개별 줄을 나눕니다" onClick={()=>setLayoutEdit(v=>!v)}>줄 편집</button>{!mobile&&<button type="button" aria-label="빔 범위 선택" aria-pressed={beamRangeMode} onClick={onBeamRange}>빔</button>}</div>
 {mobile&&perRow>2&&<small className="etudeLayoutHint">전체 배치 확인 · 세부 입력은 1마디 보기가 편합니다.</small>}
 <div ref={ref} className="etudeEditorCanvas" data-document-pinch={mobile} data-score-input tabIndex={0} role="group" aria-label="악보 키보드 입력" onKeyDown={onKeyDown} {...dragHandlers}>
  <div ref={boundsRef} className="etudeZoomBounds" style={{width:`${zoom}%`}}><div ref={contentRef} className="etudeMeasureGrid" style={{width:'100%'}} >
   {score.measures.map((notes,i)=>(!pageView||i===cursor.bar)&&<Measure key={score.document.measures[i].id} {...{notes,index:i,keySignature:score.keySignature,meter:score.meter,mobile,onSelect,view,tabRhythm,allowDrag}} placement={placements[i]} systemStart={pageView||placements[i].column===1} systemEnd={pageView||!placements[i+1]||placements[i+1].row!==placements[i].row} scoreEnd={i===score.measures.length-1} systemHeadroom={systemHeadroom} layoutEdit={layoutEdit} breakBefore={breaks.includes(score.document.measures[i].id)} onBreak={onBreak} playingRow={Boolean(playPosition&&placements[playPosition.bar]?.row===placements[i].row)} playPosition={playPosition?.bar===i?playPosition:null} incomingTie={Boolean(i&&score.measures[i-1].at(-1)?.tieTo===notes[0]?.id)} chord={score.chordShapes?.[i]} harmony={score.harmony?.[i]} beamSelection={beamSelection?.bar===i?beamSelection:null} selection={!playPosition&&cursor.target!=='bar'&&cursor.bar===i?cursor:null}/>)}
  </div></div>
 </div></>;
}
