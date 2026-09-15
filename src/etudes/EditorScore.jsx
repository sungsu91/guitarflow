import useScorePinch from '../hooks/useScorePinch.js';
import MobileScoreZoom from '../components/MobileScoreZoom.jsx';
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
const Measure=memo(function Measure({notes,chord,harmony,index,keySignature,meter,mobile,incomingTie,selection,onSelect,view,tabRhythm,playPosition,allowDrag,placement,layoutEdit,breakBefore,onBreak}) {
 const editorWidth=Math.max(240,(mobile?600:980)*placement.span/12);
 const ref=useRef(null),[error,setError]=useState('');
 useLayoutEffect(()=>{const start=performance.now();try{
  const root=ref.current.shadowRoot??ref.current.attachShadow({mode:'open'});
  const content=document.createElement('div');root.replaceChildren(content);
  drawScore(content,{id:`editor-${index}`,title:'편집 마디',bpm:60,keySignature,meter,incomingTie,measures:[notes],chordShapes:chord?[chord]:undefined,harmony:[harmony]},{mobile,editor:true,barOffset:index,tabRhythm,editorWidth});const style=document.createElement('style');style.textContent=engravingStyle;root.append(style);setError('');
 }catch(e){setError(`이 마디를 표시하지 못했습니다: ${e.message}`);}
 const elapsed=performance.now()-start;editorRenderStats.bars++;editorRenderStats.totalMs+=elapsed;editorRenderStats.maxMs=Math.max(elapsed,editorRenderStats.maxMs);editorRenderStats.samples.push(elapsed);if(editorRenderStats.samples.length>256)editorRenderStats.samples.shift();ref.current.dataset.drawCount=String(Number(ref.current.dataset.drawCount??0)+1);ref.current.dataset.drawMs=String(elapsed);
 },[notes,chord,harmony,index,keySignature,meter,mobile,incomingTie,tabRhythm,editorWidth]);
 useLayoutEffect(()=>{
  const root=ref.current.shadowRoot;if(!root)return;root.querySelector('.etudeInputCursor')?.remove();if(!selection)return;
  const selector=`[data-event="${selection.event}"][data-mode="${selection.mode}"][data-string="${selection.string}"]`;
  const el=root.querySelector(`.etudeNoteHandle${selector}`)??root.querySelector(selection.mode==='tab'?selector:`[data-event="${selection.event}"][data-mode="staff"]`);if(!el)return;
  let y=Number(el.dataset.cursorY),height=14;
  if(selection.mode==='staff'){const p=pitchForMidi(selection.midi??60,keySignature),step=(p.octave-3)*7+'CDEFGAB'.indexOf(p.letter)-2;y=Number(el.dataset.staffBottom)-step*5-5;height=10;}
  const marker=document.createElementNS('http://www.w3.org/2000/svg','rect');Object.entries({class:'etudeInputCursor is-cursor',x:el.dataset.cursorX,y,width:24,height,fill:'#21765944',stroke:'#167254','vector-effect':'non-scaling-stroke','pointer-events':'none'}).forEach(([k,v])=>marker.setAttribute(k,String(v)));el.ownerSVGElement.append(marker);
 },[notes,selection,keySignature]);
 useLayoutEffect(()=>{ref.current.dataset.drag=String(allowDrag);},[allowDrag]);
 useLayoutEffect(()=>{ref.current.dataset.view=view;ref.current.shadowRoot?.querySelector('svg')?.setAttribute('aria-label',view==='tab'?'TAB 악보':view==='staff'?'오선보 악보':'오선보와 TAB 악보');},[view]);
 useLayoutEffect(()=>{const root=ref.current.shadowRoot;if(!root)return;root.querySelector('.etudePlayingSlot')?.remove();if(!playPosition)return;
 const hit=root.querySelector(`[data-event="${playPosition.event}"][data-mode="tab"]`);if(!hit)return;const marker=document.createElementNS('http://www.w3.org/2000/svg','rect');Object.entries({class:'etudePlayingSlot',x:hit.getAttribute('x'),y:35,width:hit.getAttribute('width'),height:tabRhythm?245:200,fill:'#b4812920',stroke:'#a76a1d','stroke-width':2,'pointer-events':'none'}).forEach(([k,v])=>marker.setAttribute(k,v));hit.ownerSVGElement.append(marker);
 },[playPosition,notes,tabRhythm]);
 const click=e=>{if(e.target.closest('.etudeMeasureGrip'))return;const hit=ref.current.shadowRoot?.elementFromPoint(e.clientX,e.clientY)?.closest?.('[data-event]')??e.nativeEvent.composedPath().find(node=>node.dataset?.event!==undefined);if(!hit){onSelect({bar:index,event:0,string:selection?.string??6,mode:'tab',target:'bar'});e.currentTarget.closest('[data-score-input]')?.focus({preventScroll:true});return;}const mode=hit.dataset.mode;let midi;
  if(mode==='staff'){const svg=hit.ownerSVGElement,p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const local=p.matrixTransform(svg.getScreenCTM().inverse());const step=Math.round((Number(hit.dataset.staffBottom)-local.y)/5);midi=midiAtStaffStep(step,keySignature);}
  onSelect({bar:index,event:Number(hit.dataset.event),string:hit.classList.contains('etudePickHit')?(selection?.string??6):Number(hit.dataset.string??1),mode,midi:hit.dataset.midi!==undefined?Number(hit.dataset.midi):midi});e.currentTarget.closest('[data-score-input]')?.focus({preventScroll:true});
 };
 const grip=useRef(null);
 const release=e=>{if(!grip.current)return;const dy=e.clientY-grip.current.y;grip.current=null;e.currentTarget.style.transform='';if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);if(Math.abs(dy)>22)onBreak(index,dy>0);};
 return <section data-pinch-anchor data-bar-index={index} data-layout-row={placement.row} className="etudeEditorMeasure" style={{gridRow:placement.row,gridColumn:`${placement.column} / span ${placement.span}`}} onClick={click}>
  {layoutEdit&&<div className="etudeMeasureGrip"><span>{index+1}마디</span><button type="button" aria-label={`${index+1}마디 ${breakBefore?'윗줄과 합치기':'새 줄로 나누기'}`} disabled={!index} onClick={()=>onBreak(index,!breakBefore)}>{breakBefore?'↑ 합치기':'↓ 새 줄'}</button><button type="button" aria-label={`${index+1}마디 줄 배치 끌기`} disabled={!index} onPointerDown={e=>{e.stopPropagation();e.preventDefault();grip.current={y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(grip.current)e.currentTarget.style.transform=`translateY(${Math.max(-35,Math.min(35,e.clientY-grip.current.y))}px)`;}} onPointerUp={release} onPointerCancel={e=>{grip.current=null;e.currentTarget.style.transform='';}}>⠿</button></div>}
  {error&&<p role="alert">{error}</p>}<div ref={ref}/></section>;
});
export default function EditorScore({score,mobile,cursor,onSelect,onKeyDown,onMove,onMessage,zoom=100,onZoomChange,zoomController,view='both',pageView=false,tabRhythm=false,playPosition=null,allowDrag=true}) {
 const ref=useRef(null),contentRef=useRef(null),boundsRef=useRef(null),[perRow,setPerRow]=useState(1),[breaks,setBreaks]=useState([]),[layoutEdit,setLayoutEdit]=useState(false);
 const placements=useMemo(()=>measureLayout(score.document.measures,perRow,breaks),[score.document.measures,perRow,breaks]);
 const onBreak=(index,enabled)=>{const id=score.document.measures[index]?.id;if(!index||!id)return;setBreaks(old=>enabled?[...new Set([...old,id])]:old.filter(x=>x!==id));};
 const pinch=useScorePinch({enabled:mobile,viewport:ref,content:contentRef,bounds:boundsRef,zoom,onZoom:onZoomChange,controller:zoomController});
 const dragHandlers=useScoreDrag({canvas:ref,score,onSelect,onMove,onMessage,enabled:allowDrag});
 useLayoutEffect(()=>{const canvas=ref.current;if(pinch.isBusy())return;const selected=[...canvas.querySelectorAll('[data-draw-count]')].map(host=>host.shadowRoot?.querySelector(playPosition?'.etudePlayingSlot':'.etudeStaffCursor,.is-cursor')).find(Boolean);if(!selected)return;const b=canvas.getBoundingClientRect(),measure=canvas.querySelector(`[data-bar-index="${playPosition?.bar??cursor.bar}"]`)?.getBoundingClientRect(),a=measure&&measure.height<=b.height-12?measure:selected.getBoundingClientRect();if(a.top<b.top+12)canvas.scrollTop+=a.top-b.top-12;else if(a.bottom>b.bottom-12)canvas.scrollTop+=a.bottom-b.bottom+12;if(a.left<b.left+12)canvas.scrollLeft+=a.left-b.left-12;else if(a.right>b.right-12)canvas.scrollLeft+=a.right-b.right+12;},[cursor,mobile?null:zoom,playPosition,perRow,breaks]);
 useLayoutEffect(()=>{const node=ref.current;if(!node.dataset.inputAt)return;const start=Number(node.dataset.inputAt);delete node.dataset.inputAt;requestAnimationFrame(()=>{node.inputMeasurements??=[];node.inputMeasurements.push(performance.now()-start);if(node.inputMeasurements.length>256)node.inputMeasurements.shift();});},[score,cursor]);
 return <>{mobile&&<MobileScoreZoom zoom={zoom} onFit={()=>pinch.zoomTo(100)} previewRoot={ref}/>}<div className="etudeMeasureLayoutBar" aria-label="마디 배치"><span>한 줄</span><div role="group" aria-label="한 줄 마디 수">{[1,2,3,4].map(n=><button type="button" key={n} aria-label={`한 줄 ${n}마디`} aria-pressed={perRow===n} onClick={()=>{setPerRow(n);setBreaks([]);if(n===1)setLayoutEdit(false);}}>{n}</button>)}</div><span>마디</span><button type="button" aria-pressed={layoutEdit} disabled={perRow===1} title="2마디 이상 배치에서 개별 줄을 나눕니다" onClick={()=>setLayoutEdit(v=>!v)}>줄 편집</button></div>
 {mobile&&perRow>2&&<small className="etudeLayoutHint">전체 배치 확인 · 세부 입력은 1마디 보기가 편합니다.</small>}
 <div ref={ref} className="etudeEditorCanvas" data-document-pinch={mobile} data-score-input tabIndex={0} role="group" aria-label="악보 키보드 입력" onKeyDown={onKeyDown} {...dragHandlers}>
  <div ref={boundsRef} className="etudeZoomBounds" style={{width:`${zoom}%`}}><div ref={contentRef} className="etudeMeasureGrid" style={{width:'100%'}} >
   {score.measures.map((notes,i)=>(!pageView||i===cursor.bar)&&<Measure key={score.document.measures[i].id} {...{notes,index:i,keySignature:score.keySignature,meter:score.meter,mobile,onSelect,view,tabRhythm,allowDrag}} placement={placements[i]} layoutEdit={layoutEdit} breakBefore={breaks.includes(score.document.measures[i].id)} onBreak={onBreak} playPosition={playPosition?.bar===i?playPosition:null} incomingTie={Boolean(i&&score.measures[i-1].at(-1)?.tieTo===notes[0]?.id)} chord={score.chordShapes?.[i]} harmony={score.harmony?.[i]} selection={cursor.bar===i?cursor:null}/>)}
  </div></div>
 </div></>;
}
