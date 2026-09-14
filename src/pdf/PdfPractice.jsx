import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import PdfPage from './PdfPage.jsx';
import useEtudeMetronome from '../etudes/useEtudeMetronome.js';
import {useMetronomeVolume,setMetronomeVolume} from '../audio/metronomeVolumeStore.js';
import {patchPdf,storageError,downloadBlob} from './pdfLibrary.js';
import {practiceOrder,barAtTick,alignBarRow,splitBarRow} from './pdfModel.js';
const emptyBars=[];
export default function PdfPractice({initial,blob,mobile,onClose}) {
 const [record,setRecord]=useState(initial),[saveState,setSaveState]=useState('저장됨'),[error,setError]=useState(''),[mapping,setMapping]=useState(false),[activeBar,setActiveBar]=useState(null),[selectedBar,setSelectedBar]=useState(null),[orderText,setOrderText]=useState((initial.practiceOrder??[]).join(', '));
 const [rowMode,setRowMode]=useState(false),[snapRows,setSnapRows]=useState(true),[rowCount,setRowCount]=useState(4),[draftRow,setDraftRow]=useState(null);
 const current=useRef(initial),queue=useRef(Promise.resolve()),revision=useRef(0),saved=useRef(0),shell=useRef(null),startIndex=useRef(0);
 const {volume}=useMetronomeVolume();
 const [compact,setCompact]=useState(mobile);
 useLayoutEffect(()=>{const observer=new ResizeObserver(([entry])=>setCompact(mobile||entry.contentRect.width<850));observer.observe(shell.current);return()=>observer.disconnect();},[mobile]);
 // Preserve each layout's explicit zoom; a desktop-sized document must not open cropped on a phone.
 const zoom=mobile?(record.mobileZoom??'fit'):record.zoom;
 const setZoom=value=>void update(mobile?{mobileZoom:value}:{zoom:value});

 const metro=useEtudeMetronome(record.bpm,{beatsPerBar:record.meter[0],beatUnit:record.meter[1],audible:record.audible!==false,downbeatAt:tick=>{const r=current.current;if(!r.highlight||!r.barMap?.length)return tick%r.meter[0]===0;const count=r.countIn?r.meter[0]:0;if(tick<count)return tick===0;const sequence=practiceOrder(r),offset=sequence.slice(0,startIndex.current).reduce((n,b)=>n+b.beats,0);return barAtTick(sequence,tick-count+offset,Boolean(r.loop))?.beat===0;}});
 const update=useCallback(patch=>{
  const next={...current.current,...patch};current.current=next;setRecord(next);setSaveState('저장 중…');const version=++revision.current;
  queue.current=queue.current.catch(()=>{}).then(()=>patchPdf(initial.id,next)).then(()=>{saved.current=version;if(version===revision.current){setSaveState('기기에 저장됨');setError('');}}).catch(e=>{setSaveState('저장 실패');setError(storageError(e));});return queue.current;
 },[initial.id]);
 useEffect(()=>{void update({lastPracticedAt:new Date().toISOString()});},[update]);
 useEffect(()=>{const warn=e=>{if(saved.current<revision.current){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
 const bars=record.barMap??emptyBars,order=useMemo(()=>practiceOrder(record),[bars,record.practiceOrder,record.loop,record.loopStart,record.loopEnd]);
 const countTicks=record.countIn?record.meter[0]:0;
 useEffect(()=>{
  if(!metro.playing||metro.tick<countTicks||!order.length||!record.highlight)return;
  const offset=order.slice(0,startIndex.current).reduce((sum,b)=>sum+b.beats,0),position=barAtTick(order,metro.tick-countTicks+offset,Boolean(record.loop));
  if(position?.ended){metro.stop();return;}if(position){setActiveBar(position.bar.number);if(current.current.lastPage!==position.bar.page)void update({lastPage:position.bar.page});}
 },[metro.tick,metro.playing,countTicks,order,record.highlight,record.loop,update,metro.stop]);
 const getBarPosition=useCallback(()=>{
  if(!record.highlight||!order.length)return null;
  const ticks=metro.getPosition()-countTicks;
  if(ticks<0)return null;
  const offset=order.slice(0,startIndex.current).reduce((n,b)=>n+b.beats,0);
  const position=barAtTick(order,ticks+offset,Boolean(record.loop));
  return position&&!position.ended?{number:position.bar.number,progress:position.beat/position.bar.beats}:null;
 },[record.highlight,record.loop,order,countTicks,metro.getPosition]);
 const removeBar=useCallback(number=>{
  metro.stop();const r=current.current;
  const nextOrder=(r.practiceOrder??[]).filter(n=>n!==number);
  void update({barMap:(r.barMap??[]).filter(b=>b.number!==number),practiceOrder:nextOrder});
  setOrderText(nextOrder.join(', '));setSelectedBar(null);setActiveBar(null);
 },[metro.stop,update]);
 const toggleMapping=()=>{metro.stop();setSelectedBar(null);setDraftRow(null);setMapping(v=>!v);};
 const page=record.lastPage;
 const goPage=useCallback(n=>{const next=Math.max(1,Math.min(current.current.pageCount,n));void update({lastPage:next});},[update]);
 const selectBar=useCallback(number=>{const bar=current.current.barMap.find(b=>b.number===number);if(bar){metro.stop();setActiveBar(number);setSelectedBar(number);goPage(bar.page);}},[metro.stop,goPage]);
 const appendBars=useCallback(rects=>{const r=current.current,number=Math.max(0,...(r.barMap??[]).map(b=>b.number))+1;
  void update({barMap:[...(r.barMap??[]),...rects.map((rect,i)=>({...rect,number:number+i,beats:r.meter[0]}))]});setSelectedBar(null);setActiveBar(number);
 },[update]);
 const addBar=useCallback(rect=>{const aligned=alignBarRow(rect,current.current.barMap??[],snapRows);if(rowMode)setDraftRow(aligned);else appendBars([aligned]);},[snapRows,rowMode,appendBars]);
 useEffect(()=>setDraftRow(null),[page,rowMode,mapping]);

 const toggle=()=>{if(metro.playing){metro.stop();return;}setMapping(false);setDraftRow(null);setSelectedBar(null);startIndex.current=Math.max(0,order.findIndex(b=>b.number===activeBar));void metro.start();};
 const stepBar=delta=>{const i=bars.findIndex(b=>b.number===activeBar),next=bars[Math.max(0,Math.min(bars.length-1,i+delta))];if(next)selectBar(next.number);};
 const close=async()=>{metro.stop();await queue.current;if(saved.current<revision.current){setError('저장되지 않은 설정이 있습니다. 다시 저장하거나 변경을 버리고 나가세요.');return;}onClose();};
 const settings=<>
  <h2>연습 설정</h2>
  <label>BPM · 4분음표 기준<input aria-label="PDF BPM" type="number" min="30" max="240" value={record.bpm} onChange={e=>{metro.stop();void update({bpm:Math.max(30,Math.min(240,Number(e.target.value)||30))});}}/></label>
  <label>박자<select aria-label="PDF 박자" value={record.meter.join('/')} onChange={e=>{metro.stop();void update({meter:e.target.value.split('/').map(Number)});}}>{['2/4','3/4','4/4','5/4','6/8','7/8','9/8','12/8'].map(v=><option key={v}>{v}</option>)}</select></label>
  <label className="pdfCheck"><input type="checkbox" checked={record.audible!==false} onChange={e=>void update({audible:e.target.checked})}/>메트로놈 소리</label>
  <label className="pdfCheck"><input type="checkbox" checked={Boolean(record.countIn)} onChange={e=>{metro.stop();void update({countIn:e.target.checked});}}/>카운트인 1마디</label>
  <label>메트로놈 공통 볼륨 · {Math.round(volume*100)}%<input aria-label="PDF 메트로놈 볼륨" type="range" min="0" max="1" step="0.01" value={volume} onChange={e=>setMetronomeVolume(e.target.value)}/></label>
  <details><summary>마디 위치 · 반복 연습</summary><p>인쇄된 마디를 자동 분석하지 않습니다. 영역을 지정한 순서로 연습합니다.</p>
   <label className="pdfCheck"><input type="checkbox" disabled={!bars.length} checked={Boolean(record.highlight)} onChange={e=>{metro.stop();void update({highlight:e.target.checked});}}/>지정한 마디 자동 강조</label>
   {bars.length>0&&<><label>선택 마디<select aria-label="PDF 선택 마디" value={activeBar??''} onChange={e=>selectBar(Number(e.target.value))}><option value="">선택</option>{bars.map(b=><option key={b.number} value={b.number}>{b.number}마디 · {b.page}페이지</option>)}</select></label>
    {activeBar&&<><label>이 마디의 박 수 · 박자표 분모 기준<input aria-label="마디 박 수" type="number" min="1" max="32" value={bars.find(b=>b.number===activeBar)?.beats??4} onChange={e=>{metro.stop();void update({barMap:bars.map(b=>b.number===activeBar?{...b,beats:Math.max(1,Math.min(32,Number(e.target.value)||1))}:b)});}}/></label><button type="button" onClick={()=>removeBar(activeBar)}>선택 마디 영역 삭제</button></>}
    <label>연습 순서 · 예: 1,2,1,2,3<input aria-label="PDF 연습 순서" value={orderText} onChange={e=>setOrderText(e.target.value)}/></label><button type="button" onClick={()=>{const values=orderText.trim()?orderText.split(/[,\s→]+/).map(Number):[];if(values.some(n=>!bars.some(b=>b.number===n))||values.length>1000){setError('지정한 마디 번호를 쉼표로 구분해서 입력하세요.');return;}metro.stop();void update({practiceOrder:values,loopStart:1,loopEnd:values.length||bars.length});}}>연습 순서 적용</button>
    <label className="pdfCheck"><input type="checkbox" checked={Boolean(record.loop)} onChange={e=>{metro.stop();void update({loop:e.target.checked});}}/>구간 반복</label>
    {record.loop&&<div className="pdfPair">{[['loopStart','시작 순번'],['loopEnd','끝 순번']].map(([key,title])=><label key={key}>{title}<input aria-label={title} type="number" min="1" max={record.practiceOrder?.length||bars.length} value={record[key]??(key==='loopStart'?1:record.practiceOrder?.length||bars.length)} onChange={e=>{metro.stop();void update({[key]:Math.max(1,Math.min(record.practiceOrder?.length||bars.length,Number(e.target.value)||1))});}}/></label>)}</div>}
   </>}
  </details>
  {record.memo&&<p className="pdfMemo">{record.memo}</p>}
  <button type="button" onClick={()=>downloadBlob(blob,`${record.title}.pdf`)}>원본 PDF 내보내기</button>
  <small>PDF는 고정 문서입니다. 오선보·TAB의 자동 분리나 음표 편집은 하지 않습니다.</small>
 </>;
 const controls=<div className="pdfTransport"><button type="button" aria-label="이전 PDF 페이지" disabled={page<=1} onClick={()=>goPage(page-1)}>‹ 이전</button><div className="pdfTransportCenter"><div className="pdfBeatDots" aria-label={metro.beat<0?'정지':`${metro.beat+1}박`}>{Array.from({length:record.meter[0]},(_,i)=><i key={i} className={metro.beat===i?'is-on':''}/>)}</div><button type="button" className="pdfPrimary" aria-label="PDF 연습 시작 정지" aria-pressed={metro.playing} onClick={toggle}>{metro.playing?'■ 정지':'▶ 연습 시작'}</button><span>{metro.playing&&metro.tick<countTicks?'카운트인':`${record.bpm} BPM`}</span></div><button type="button" aria-label="다음 PDF 페이지" disabled={page>=record.pageCount} onClick={()=>goPage(page+1)}>다음 ›</button></div>;
 return <section ref={shell} className={`pdfPractice ${mobile?'pdfPractice--mobile':'pdfPractice--desktop'} ${compact?'pdfPractice--compact':''}`}>
  <header className="pdfPracticeHeader"><button type="button" onClick={close}>‹ 내 악보 보관함</button><div><h1>{record.title}</h1><small>{record.artist} · PDF · <span role="status">{saveState}</span></small></div></header>
  {error&&<div role="alert">{error}<button type="button" onClick={()=>void update(current.current)}>다시 저장</button><button type="button" onClick={onClose}>저장 안 된 변경 버리고 나가기</button></div>}{metro.error&&<p role="alert">{metro.error}</p>}
  <div className="pdfPracticeBody"><main className="pdfDocument"><div className="pdfViewTools">
    <div className="pdfPageControls"><label>페이지<input aria-label="PDF 페이지" type="number" inputMode="numeric" min="1" max={record.pageCount} value={page} onChange={e=>goPage(Number(e.target.value)||1)}/></label><strong>/ {record.pageCount}</strong><button type="button" className="pdfFullscreen" onClick={async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(shell.current.requestFullscreen)await shell.current.requestFullscreen();else setError('이 브라우저는 전체화면을 지원하지 않습니다. 기기를 가로로 돌려주세요.');}catch{setError('전체화면을 열 수 없습니다. 기기의 가로 모드를 이용하세요.');}}}>전체화면</button></div>
    <div className="pdfZoomControls"><select aria-label="PDF 확대" value={zoom} onChange={e=>setZoom(e.target.value==='fit'?'fit':Number(e.target.value))}><option value="fit">너비 맞춤</option>{[...new Set([25,50,75,100,125,150,175,200,225,250,...(zoom==='fit'?[]:[zoom])])].sort((a,b)=>a-b).map(n=><option key={n} value={n}>{n}%</option>)}</select><button type="button" className="pdfMappingQuick" aria-label="마디 위치 설정" aria-pressed={mapping} onClick={toggleMapping}>{mapping?'✓ 설정 완료':'마디 설정'}</button></div>
   </div>
   {mapping&&<div className="pdfRowTools">
    <label>지정 방식<select aria-label="마디 지정 방식" value={rowMode?'row':'single'} onChange={e=>setRowMode(e.target.value==='row')}><option value="single">한 마디씩</option><option value="row">한 줄 나누기</option></select></label>
    <label className="pdfCheck"><input type="checkbox" checked={snapRows} onChange={e=>setSnapRows(e.target.checked)}/>같은 줄 높이 맞춤</label>
    <small className="pdfRowHint">{rowMode?'한 줄 전체를 끌어 선택한 뒤 마디 수를 정하세요.':'빈 곳에서 마디 영역을 끌어 지정하세요. 같은 줄은 윗선·높이를 맞춥니다.'}</small>
    {draftRow&&<div className="pdfRowConfirm"><label>선택한 줄<select aria-label="나눌 마디 수" value={rowCount} onChange={e=>setRowCount(Number(e.target.value))}>{Array.from({length:16},(_,i)=><option key={i+1} value={i+1}>{i+1}마디</option>)}</select></label><button type="button" onClick={()=>{appendBars(splitBarRow(draftRow,rowCount));setDraftRow(null);}}>나누어 저장</button><button type="button" onClick={()=>setDraftRow(null)}>취소</button><small>선택 영역을 같은 너비로 나눕니다. 인쇄된 마디 폭이 다르면 ‘한 마디씩’으로 지정하세요.</small></div>}
   </div>}
   {zoom!=='fit'&&<small className="pdfPanHint">확대한 악보는 좌우·위아래로 밀어 볼 수 있습니다.</small>}
   <PdfPage {...{blob,mapping,barMap:bars,activeBar,selectedBar,getBarPosition,snapRows,draftRow,rowCount}} playing={metro.playing&&Boolean(record.highlight)} pageNumber={page} zoom={zoom} onAdd={addBar} onSelect={selectBar} onRemove={removeBar} onDeselect={()=>setSelectedBar(null)}/>
   {bars.length>0&&<div className="pdfBarNav"><button type="button" onClick={()=>stepBar(-1)}>‹ 이전 마디</button><span>{activeBar?`${activeBar}마디`:'마디 선택'}</span><button type="button" onClick={()=>stepBar(1)}>다음 마디 ›</button></div>}
  </main>{compact?<details className="pdfMobileSettings"><summary>연습 설정 · {record.bpm} BPM · {record.meter.join('/')}</summary>{settings}</details>:<aside className="pdfSettings">{settings}</aside>}</div>{controls}
 </section>;
}
