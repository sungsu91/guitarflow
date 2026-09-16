import {MobilePdfHeader,MobilePdfTransport} from './MobilePdfChrome.jsx';
import PdfBarCount from './PdfBarCount.jsx';
import {cropMargins,pageCrop} from './pdfAnnotations.js';
import {PdfAnnotationToolbar} from './PdfAnnotationLayer.jsx';
import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import PdfPage from './PdfPage.jsx';
import PdfContinuous from './PdfContinuous.jsx';
import PdfViewToolbar from './PdfViewToolbar.jsx';
import usePdfFullscreen from './usePdfFullscreen.js';
import useEtudeMetronome from '../etudes/useEtudeMetronome.js';
import {useMetronomeVolume,setMetronomeVolume} from '../audio/metronomeVolumeStore.js';
import {patchPdf,storageError,downloadBlob} from './pdfLibrary.js';
import {expandPdfBars,removePdfRow,setPdfBarBeats,movePdfRow} from './pdfBarRows.js';
import {practiceOrder,barAtTick,alignBarRow} from './pdfModel.js';
const emptyBars=[];
export default function PdfPractice({initial,blob,mobile,onClose,onInfo,closeController,initialEditing=false}) {
 const fullscreen=usePdfFullscreen(),zoomController=useRef(null);
 const [mobileZoom,setMobileZoom]=useState(100);
 const [record,setRecord]=useState(initial),[saveState,setSaveState]=useState('저장됨'),[error,setError]=useState(''),[mapping,setMapping]=useState(false),[activeBar,setActiveBar]=useState(null),[selectedBar,setSelectedBar]=useState(null),[orderText,setOrderText]=useState((initial.practiceOrder??[]).join(', '));
 const snapRows=true;
 const [toast,setToast]=useState(null);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(null),2000);return()=>clearTimeout(timer);},[toast]);
 const [rowCount,setRowCount]=useState(4),[draftRow,setDraftRow]=useState(null);
 const [editing,setEditing]=useState(initialEditing),[editTool,setEditTool]=useState('select'),[noteDraft,setNoteDraft]=useState(null),[,setHistoryVersion]=useState(0),[notice,setNotice]=useState('');
 const [original,setOriginal]=useState(false);
 const [pen,setPen]=useState({color:'brown',width:.003,opacity:1});
 const undo=useRef([]),redo=useRef([]);
 const [cropDraft,setCropDraft]=useState(null);
 const current=useRef(initial),queue=useRef(Promise.resolve()),revision=useRef(0),saved=useRef(0),shell=useRef(null),modeScroll=useRef(null);
 useEffect(()=>{if(!mobile)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[mobile]);
 const {volume}=useMetronomeVolume();
 const [compact,setCompact]=useState(mobile);
 useLayoutEffect(()=>{const observer=new ResizeObserver(([entry])=>setCompact(mobile||entry.contentRect.width<850));observer.observe(shell.current);return()=>observer.disconnect();},[mobile]);
 // Desktop restores its saved scale; every mobile opening starts at fitted 100%.
 const zoom=mobile?mobileZoom:record.zoom;
 const setZoom=value=>mobile?zoomController.current?.zoomTo(100):void update({zoom:value,...(value==='page'?{viewMode:'single'}:{})});
 const continuous=record.viewMode==='continuous',PageView=continuous?PdfContinuous:PdfPage;

 const metro=useEtudeMetronome(record.bpm,{beatsPerBar:record.meter[0],beatUnit:record.meter[1],audible:record.audible!==false,liveTempo:true,downbeatAt:tick=>{const r=current.current;if(!r.barMap?.length)return tick%r.meter[0]===0;const count=r.countIn?r.meter[0]:0;if(tick<count)return tick===0;const sequence=practiceOrder(r);return barAtTick(sequence,tick-count,Boolean(r.loop))?.beat===0;}});
 const update=useCallback(patch=>{
  const next={...current.current,...patch};current.current=next;setRecord(next);setSaveState('저장 중…');const version=++revision.current;
  queue.current=queue.current.catch(()=>{}).then(()=>patchPdf(initial.id,next)).then(()=>{saved.current=version;if(version===revision.current){setSaveState('기기에 저장됨');setError('');}}).catch(e=>{setSaveState('저장 실패');setError(storageError(e));});return queue.current;
 },[initial.id]);
 // Edit history stores only annotation fields. Page, BPM and the original PDF are independent.
 const applyEdit=useCallback(patch=>{
  undo.current.push(Object.fromEntries(Object.keys(patch).map(key=>[key,current.current[key]])));
  if(undo.current.length>60)undo.current.shift();redo.current=[];setHistoryVersion(v=>v+1);void update(patch);
 },[update]);
 const travelHistory=direction=>{const from=direction==='undo'?undo:redo,to=direction==='undo'?redo:undo,patch=from.current.pop();if(!patch)return;
  to.current.push(Object.fromEntries(Object.keys(patch).map(key=>[key,current.current[key]])));void update(patch);setHistoryVersion(v=>v+1);
  if('practiceOrder' in patch)setOrderText((patch.practiceOrder??[]).join(', '));setSelectedBar(null);setDraftRow(null);setCropDraft(null);setNoteDraft(null);
 };
 const editPage=(patch,pageNumber=current.current.lastPage)=>{const edits=current.current.pageEdits??{};applyEdit({pageEdits:{...edits,[pageNumber]:{crop:null,notes:[],...edits[pageNumber],...patch}}});};
 const saveNote=()=>{if(!noteDraft?.text.trim())return;const {page:notePage,...note}=noteDraft,notes=current.current.pageEdits?.[notePage]?.notes??[];
  if(notes.length>=200&&!notes.some(n=>n.id===note.id)){setNotice('한 페이지에는 메모를 200개까지 저장할 수 있습니다.');return;}
  editPage({notes:[...notes.filter(n=>n.id!==note.id),{...note,text:note.text.trim()}]},notePage);setNoteDraft(null);
 };
 const chooseTool=tool=>{if(noteDraft&&tool!=='text'){setNotice('메모를 저장하거나 취소한 뒤 도구를 바꿔 주세요.');return;}metro.pause();setOriginal(false);setEditTool(tool);setMapping(tool==='bar');setDraftRow(null);setCropDraft(tool==='crop'?{page:current.current.lastPage,rect:pageCrop(current.current.pageEdits?.[current.current.lastPage])}:null);setSelectedBar(null);setNotice('');};
 const toggleEditing=()=>{if(noteDraft){setNotice('작성 중인 메모를 저장하거나 취소한 뒤 편집을 마쳐 주세요.');return;}const viewport=shell.current.querySelector('.pdfViewport');modeScroll.current={top:viewport?.scrollTop??0,left:viewport?.scrollLeft??0};metro.pause();setEditing(!editing);setMapping(!editing&&editTool==='bar');setDraftRow(null);setCropDraft(null);setSelectedBar(null);};
 useLayoutEffect(()=>{const snapshot=modeScroll.current,viewport=shell.current?.querySelector('.pdfViewport');if(snapshot&&viewport){viewport.scrollTop=snapshot.top;viewport.scrollLeft=snapshot.left;modeScroll.current=null;}},[editing]);
 useEffect(()=>{void update({lastPracticedAt:new Date().toISOString()});},[update]);
 useEffect(()=>{const warn=e=>{if(saved.current<revision.current||noteDraft){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[noteDraft]);
 const bars=useMemo(()=>expandPdfBars(record.barMap??emptyBars),[record.barMap]),order=useMemo(()=>practiceOrder(record),[bars,record.practiceOrder,record.loop,record.loopStart,record.loopEnd]);
 const countTicks=record.countIn?record.meter[0]:0;
 useEffect(()=>{
  if(!metro.playing||metro.tick<countTicks||!order.length)return;
  const position=barAtTick(order,metro.tick-countTicks,Boolean(record.loop));
  if(position?.ended){metro.pause();return;}if(position){setActiveBar(position.bar.number);if(current.current.lastPage!==position.bar.page)void update({lastPage:position.bar.page});}
 },[metro.tick,metro.playing,countTicks,order,record.highlight,record.loop,update,metro.pause]);
 const getBarPosition=useCallback(()=>{
  if(!order.length)return null;
  const ticks=metro.getPosition()-countTicks;
  if(ticks<0)return null;
  const position=barAtTick(order,ticks,Boolean(record.loop));
  return position?{number:position.bar.number,progress:position.ended?1:position.beat/position.bar.beats}:null;
 },[record.highlight,record.loop,order,countTicks,metro.getPosition]);
 const removeBar=useCallback(number=>{
  metro.stop();const r=current.current;
  const removed=removePdfRow(r.barMap??[],number),nextOrder=(r.practiceOrder??[]).filter(n=>!removed.removed.includes(n));
  applyEdit({barMap:removed.barMap,practiceOrder:nextOrder});
  setOrderText(nextOrder.join(', '));setSelectedBar(null);setActiveBar(null);
 },[metro.stop,applyEdit]);
 const page=record.lastPage;
 const goPage=useCallback(n=>{if(noteDraft){setNotice('메모를 저장하거나 취소한 뒤 페이지를 이동해 주세요.');return;}const next=Math.max(1,Math.min(current.current.pageCount,n));void update({lastPage:next});},[update,noteDraft]);
 const selectBar=useCallback((number,progress=0)=>{const bar=bars.find(b=>b.number===number);if(!bar)return;
  if(editing)metro.pause();const index=order.findIndex(b=>b.number===number);if(index>=0)metro.seek(countTicks+order.slice(0,index).reduce((n,b)=>n+b.beats,0)+bar.beats*progress);
  setActiveBar(number);setSelectedBar(editing?number:null);goPage(bar.page);
 },[bars,order,countTicks,editing,metro.pause,metro.seek,goPage]);
 const addBar=useCallback(rect=>{const aligned=alignBarRow(rect,current.current.barMap??[],snapRows);setDraftRow(aligned);},[snapRows]);
 useEffect(()=>{setDraftRow(null);setCropDraft(editTool==='crop'?{page,rect:pageCrop(current.current.pageEdits?.[page])}:null);},[page]);
 useEffect(()=>{setDraftRow(null);},[mapping]);
 const commitRow=count=>{if(!draftRow)return;const number=Math.max(0,...bars.map(b=>b.number))+1;
  applyEdit({barMap:[...(current.current.barMap??[]),{...draftRow,number,count:Math.max(1,Math.min(4,count)),beats:current.current.meter[0],meter:[...current.current.meter]}],highlight:true});setDraftRow(null);setSelectedBar(null);setToast({text:'마디 설정 완료'});
 };
 const fitCrop=()=>{if(mobile)setMobileZoom(100);else void update({zoom:'fit'});};
 const commitCrop=()=>{if(!cropDraft)return;editPage({crop:null,margins:cropMargins(cropDraft.rect)},cropDraft.page);fitCrop();chooseTool('select');};

 const changeBpm=value=>void update({bpm:Math.max(30,Math.min(240,Number(value)||30))});
 const toggle=()=>{if(metro.playing){metro.pause();return;}if(noteDraft){setNotice('메모를 저장하거나 취소한 뒤 연습을 시작해 주세요.');return;}setEditing(false);setMapping(false);setDraftRow(null);setSelectedBar(null);
  const held=metro.getPosition(),ended=barAtTick(order,held-countTicks,Boolean(record.loop))?.ended;void metro.start({beatOffset:ended?0:Math.max(0,held)});
 };
 const stepBar=delta=>{const i=bars.findIndex(b=>b.number===activeBar),next=bars[Math.max(0,Math.min(bars.length-1,i+delta))];if(next)selectBar(next.number);};
 const close=async(after)=>{metro.stop();if(noteDraft){setNotice('작성 중인 메모를 저장하거나 취소해 주세요.');return;}await queue.current;if(saved.current<revision.current){setError('저장되지 않은 설정이 있습니다. 다시 저장하거나 변경을 버리고 나가세요.');return;}onClose();if(typeof after==='function')after();};
 if(closeController)closeController.current=close;
 const settings=<>
  <h2>연습 설정</h2>
  {onInfo&&<button type="button" onClick={()=>{metro.stop();onInfo(current.current,update);}}>악보 정보 수정</button>}
  <label className="pdfCheck"><input type="checkbox" aria-label="PDF 연속 스크롤" checked={continuous} onChange={e=>void update({viewMode:e.target.checked?'continuous':'single',...(e.target.checked?(mobile?{mobileZoom:'fit'}:{zoom:'fit'}):{})})}/>모든 페이지 이어 보기</label>
  {!mobile&&<label>BPM · 4분음표 기준<input aria-label="PDF BPM" type="number" min="30" max="240" value={record.bpm} onChange={e=>changeBpm(e.target.value)}/></label>}
  <label>박자<select aria-label="PDF 박자" value={record.meter.join('/')} onChange={e=>{metro.stop();void update({meter:e.target.value.split('/').map(Number)});}}>{['2/4','3/4','4/4','5/4','6/8','7/8','9/8','12/8'].map(v=><option key={v}>{v}</option>)}</select></label>
  <label className="pdfCheck"><input type="checkbox" checked={record.audible!==false} onChange={e=>void update({audible:e.target.checked})}/>메트로놈 소리</label>
  <label className="pdfCheck"><input type="checkbox" checked={Boolean(record.countIn)} onChange={e=>{metro.stop();void update({countIn:e.target.checked});}}/>카운트인 1마디</label>
  <label>메트로놈 공통 볼륨 · {Math.round(volume*100)}%<input aria-label="PDF 메트로놈 볼륨" type="range" min="0" max="1" step="0.01" value={volume} onChange={e=>setMetronomeVolume(e.target.value)}/></label>
  <details><summary>마디 위치 · 반복 연습</summary><p>인쇄된 마디를 자동 분석하지 않습니다. 영역을 지정한 순서로 연습합니다.</p>
   <label className="pdfCheck"><input type="checkbox" disabled={!bars.length} checked={Boolean(record.highlight)} onChange={e=>void update({highlight:e.target.checked})}/>현재 연주 줄 배경 강조</label>
   {bars.length>0&&<><label>선택 마디<select aria-label="PDF 선택 마디" value={activeBar??''} onChange={e=>selectBar(Number(e.target.value))}><option value="">선택</option>{bars.map(b=><option key={b.number} value={b.number}>{b.number}마디 · {b.page}페이지</option>)}</select></label>
    {activeBar&&<><label>이 마디의 박 수 · 박자표 분모 기준<input aria-label="마디 박 수" type="number" min="1" max="32" value={bars.find(b=>b.number===activeBar)?.beats??4} onChange={e=>{metro.stop();void update({barMap:setPdfBarBeats(current.current.barMap,activeBar,Math.max(1,Math.min(32,Number(e.target.value)||1)))});}}/></label><button type="button" onClick={()=>removeBar(activeBar)}>선택 줄 영역 삭제</button></>}
    <label>연습 순서 · 예: 1,2,1,2,3<input aria-label="PDF 연습 순서" value={orderText} onChange={e=>setOrderText(e.target.value)}/></label><button type="button" onClick={()=>{const values=orderText.trim()?orderText.split(/[,\s→]+/).map(Number):[];if(values.some(n=>!bars.some(b=>b.number===n))||values.length>1000){setError('지정한 마디 번호를 쉼표로 구분해서 입력하세요.');return;}metro.stop();void update({practiceOrder:values,loopStart:1,loopEnd:values.length||bars.length});}}>연습 순서 적용</button>
    <label className="pdfCheck"><input type="checkbox" checked={Boolean(record.loop)} onChange={e=>{metro.stop();void update({loop:e.target.checked});}}/>구간 반복</label>
    {record.loop&&<div className="pdfPair">{[['loopStart','시작 순번'],['loopEnd','끝 순번']].map(([key,title])=><label key={key}>{title}<input aria-label={title} type="number" min="1" max={record.practiceOrder?.length||bars.length} value={record[key]??(key==='loopStart'?1:record.practiceOrder?.length||bars.length)} onChange={e=>{metro.stop();void update({[key]:Math.max(1,Math.min(record.practiceOrder?.length||bars.length,Number(e.target.value)||1))});}}/></label>)}</div>}
   </>}
  </details>
  {record.memo&&<p className="pdfMemo">{record.memo}</p>}
  <button type="button" onClick={()=>downloadBlob(blob,`${record.title}.pdf`)}>원본 PDF 내보내기</button>
  <small>PDF 위에 마디와 메모를 덧붙일 수 있습니다. 원본 PDF 내보내기에는 여백 자르기와 메모가 포함되지 않습니다.</small>
 </>;
 const onMobileAction=action=>{
  if(noteDraft){setNotice('메모를 저장하거나 취소한 뒤 메뉴를 이용해 주세요.');return;}
  if(action==='info'){metro.stop();onInfo?.(current.current,update);}
  if(action==='fit')zoomController.current?.zoomTo(100);
  if(action==='reset'){editPage({crop:null,margins:null});fitCrop();chooseTool('select');}
  if(action==='original'){metro.stop();setOriginal(v=>!v);setMapping(false);setCropDraft(null);setEditTool('select');}
  if(action==='fullscreen')void fullscreen.enter();
 };
 const controls=mobile?<MobilePdfTransport page={page} pageCount={record.pageCount} onPage={goPage} bpm={record.bpm} onBpm={changeBpm} settings={settings} paused={metro.paused} playing={metro.playing} onPlay={toggle} countIn={metro.playing&&metro.tick<countTicks}/>:<div className="pdfTransport"><button type="button" aria-label="이전 PDF 페이지" disabled={page<=1} onClick={()=>goPage(page-1)}>‹ 이전</button><div className="pdfTransportCenter"><div className="pdfBeatDots" aria-label={metro.beat<0?'정지':`${metro.beat+1}박`}>{Array.from({length:record.meter[0]},(_,i)=><i key={i} className={metro.beat===i?'is-on':''}/>)}</div><button type="button" className="pdfPrimary" aria-label="PDF 연습 시작 정지" aria-pressed={metro.playing} onClick={toggle}>{metro.playing?'Ⅱ 일시정지':metro.paused?'▶ 계속 연습':'▶ 연습 시작'}</button><span>{metro.playing&&metro.tick<countTicks?'카운트인':`${record.bpm} BPM`}</span></div><button type="button" aria-label="다음 PDF 페이지" disabled={page>=record.pageCount} onClick={()=>goPage(page+1)}>다음 ›</button></div>;
 const toolbar=editing&&!original&&<PdfAnnotationToolbar compact={mobile} tool={editTool} choose={chooseTool} {...{pen,setPen}} undo={()=>travelHistory('undo')} redo={()=>travelHistory('redo')} canUndo={Boolean(undo.current.length)&&!noteDraft} canRedo={Boolean(redo.current.length)&&!noteDraft}>
  {editTool==='crop'?<div className="pdfCropApply"><button type="button" aria-label="여백 초기화" onClick={()=>{editPage({crop:null,margins:null});fitCrop();chooseTool('select');}}>초기화</button><button type="button" aria-label="자르기 취소" onClick={()=>chooseTool('select')}>취소</button><button type="button" aria-label="여백 제거 적용" onClick={commitCrop}>적용</button></div>:mapping&&draftRow?<div className="pdfCompactBarTools"><PdfBarCount value={rowCount} onChange={setRowCount} onApply={commitRow} onCancel={()=>setDraftRow(null)}/></div>:null}
 </PdfAnnotationToolbar>;
 return <section ref={shell} className={`pdfPractice ${mobile?'pdfPractice--mobile':'pdfPractice--desktop'} ${compact?'pdfPractice--compact':''} ${editing?'pdfPractice--editing':''}`}>
  {mobile?<MobilePdfHeader title={record.title} editing={editing} onBack={close} onDone={()=>{setOriginal(false);toggleEditing();}} onAction={onMobileAction} saveState={saveState} page={page} pageCount={record.pageCount} original={original}/>:<header className="pdfPracticeHeader"><button type="button" onClick={close}>‹ 내 악보 보관함</button><div><h1>{record.title}</h1><small>{record.artist} · PDF · <span role="status">{saveState}</span></small></div></header>}
  {error&&<div role="alert">{error}<button type="button" onClick={()=>void update(current.current)}>다시 저장</button><button type="button" onClick={onClose}>저장 안 된 변경 버리고 나가기</button></div>}{metro.error&&<p role="alert">{metro.error}</p>}
  <div className="pdfPracticeBody"><main className="pdfDocument">{!mobile&&<PdfViewToolbar {...{zoom,setZoom,mobile}} previewRoot={shell}><button type="button" className="pdfMappingQuick" aria-label="PDF 간단 편집" aria-pressed={editing} onClick={toggleEditing}>{editing?'✓ 편집 완료':'간단 편집'}</button><button type="button" className="pdfFullscreen" aria-label="전체화면" title="전체화면" onClick={()=>void fullscreen.enter()}>⛶</button></PdfViewToolbar>}

   {toast&&<div className="pdfEditToast" role="status">{toast.text}</div>}
   {notice&&<p className="pdfEditNotice" role="alert">{notice}<button type="button" onClick={()=>setNotice('')}>닫기</button></p>}
   <div ref={fullscreen.ref} className={`pdfScoreStage ${fullscreen.active?'is-fullscreen':''}`} aria-label="PDF 악보 영역">
   {fullscreen.active&&<div className="pdfFullscreenControls" role="group" aria-label="전체화면 악보 조작"><button type="button" aria-label="전체화면 이전 페이지" disabled={page<=1} onClick={()=>goPage(page-1)}>‹</button><span>{page} / {record.pageCount}</span><button type="button" aria-label="전체화면 다음 페이지" disabled={page>=record.pageCount} onClick={()=>goPage(page+1)}>›</button><button type="button" aria-label="악보 전체화면 닫기" onClick={()=>void fullscreen.exit()}>닫기 ×</button></div>}
   <PageView emphasize={Boolean(record.highlight)} documentId={`${record.id}:${record.fingerprint}`} thumbnail={record.thumbnail} mobile={mobile} onZoomChange={setMobileZoom} zoomController={zoomController} pageCount={record.pageCount} pageEdits={original?{}:record.pageEdits} onPageSeen={n=>{if(current.current.lastPage!==n)void update({lastPage:n});}} pageEdit={original?undefined:record.pageEdits?.[page]} editing={editing&&!original} editTool={editing&&!original?editTool:null} cropDraft={cropDraft} annotation={{pen,noteDraft,onNoteDraft:setNoteDraft,onSaveNote:saveNote,onUpdateNote:(note,n)=>editPage({notes:(current.current.pageEdits?.[n]?.notes??[]).map(item=>item.id===note.id?note:item)},n),onCancelNote:()=>{setNoteDraft(null);setNotice('');},onDeleteNote:(id,n)=>{editPage({notes:(current.current.pageEdits?.[n]?.notes??[]).filter(note=>note.id!==id)},n);setNoteDraft(null);},onStroke:(stroke,n)=>{const strokes=current.current.pageEdits?.[n]?.strokes??[];if(strokes.length>=1000){setNotice('한 페이지의 필기는 1,000개까지 저장할 수 있습니다. 불필요한 필기를 지운 뒤 다시 써 주세요.');return;}editPage({strokes:[...strokes,stroke]},n);},onUpdateStroke:(stroke,n)=>editPage({strokes:(current.current.pageEdits?.[n]?.strokes??[]).map(s=>s.id===stroke.id?stroke:s)},n),onDeleteStroke:(id,n)=>editPage({strokes:(current.current.pageEdits?.[n]?.strokes??[]).filter(s=>s.id!==id)},n),onCropDraft:(rect,n)=>setCropDraft({rect,page:n})}} onTextPoint={(point,n=page)=>{if(noteDraft&&noteDraft.page!==n){setNotice('현재 메모를 저장하거나 취소한 뒤 다른 페이지에 입력해 주세요.');return;}setNoteDraft(d=>d??{id:crypto.randomUUID(),page:n,...point,text:'',size:.035,color:'brown'});}} onSelectNote={(note,n=page)=>{if(noteDraft&&noteDraft.id!==note.id){setNotice('작성 중인 메모를 저장하거나 취소해 주세요.');return;}metro.stop();setMapping(false);setEditTool('select');setNoteDraft({...note,page:n});}} onUpdateRow={(number,rect)=>applyEdit({barMap:movePdfRow(current.current.barMap,number,rect)})} rowMap={original?emptyBars:record.barMap??emptyBars} {...{blob,mapping,barMap:bars,activeBar,selectedBar,getBarPosition,snapRows,draftRow,rowCount}} onCountPreview={setRowCount} onCommitRow={commitRow} onCancelRow={()=>setDraftRow(null)} playing={metro.playing} pageNumber={page} zoom={zoom} barMap={original?emptyBars:bars} onAdd={addBar} onSelect={selectBar} onRemove={removeBar} onDeselect={()=>setSelectedBar(null)}/>
   {fullscreen.active&&toolbar}</div>
   {!mobile&&bars.length>0&&<div className="pdfBarNav"><button type="button" onClick={()=>stepBar(-1)}>‹ 이전 마디</button><span>{activeBar?`${activeBar}마디`:'마디 선택'}</span><button type="button" onClick={()=>stepBar(1)}>다음 마디 ›</button></div>}
  {!mobile&&!fullscreen.active&&toolbar}</main>{!mobile&&(compact?<details className="pdfMobileSettings"><summary>연습 설정 · {record.bpm} BPM · {record.meter.join('/')}</summary>{settings}</details>:<aside className="pdfSettings">{settings}</aside>)}</div>{mobile?<div className="pdfPracticeDock">{!fullscreen.active&&toolbar}{controls}</div>:controls}
 </section>;
}
