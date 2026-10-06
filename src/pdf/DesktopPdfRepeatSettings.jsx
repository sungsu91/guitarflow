import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,Check,ChevronLeft,ChevronRight,Music2,Repeat2,X} from 'lucide-react';
import {useLanguage} from '../i18n/react.jsx';
import {localizeUi} from '../i18n/core.js';
import {NAV_MARKERS,NAV_COMMANDS} from '../etudes/scoreNavigation.js';
import {normalizePdfRepeats,pdfRepeatPlan,setPdfRepeatMark,pdfRepeatMarkLabel} from './pdfRepeats.js';
import {previewPdfRepeatPreset} from './pdfRepeatPresets.js';
import DesktopPdfRepeatRoute from './DesktopPdfRepeatRoute.jsx';
import './desktopPdfRepeatSettings.css';

function MeasureNumber({label,value,bars,onChange,onFocus,active=false,t}){
 const index=bars.findIndex(b=>b.number===Number(value));
 return <div className={`desktopPdfRepeatNumber ${active?'is-target':''}`}>
  <span>{label}</span><div>
   <button type="button" aria-label={`${label} ${t('줄이기','decrease')}`} disabled={index<=0} onClick={()=>{onFocus?.();onChange(bars[index-1].number);}}><ChevronLeft size={17}/></button>
   <input type="number" inputMode="numeric" min={bars[0]?.number} max={bars.at(-1)?.number} aria-label={label} aria-invalid={index<0} value={value} onFocus={onFocus} onChange={e=>onChange(e.target.value===''?'':Number(e.target.value))}/>
   <span className="desktopPdfRepeatUnit">{t('마디','bar')}</span>
   <button type="button" aria-label={`${label} ${t('늘리기','increase')}`} disabled={index<0||index>=bars.length-1} onClick={()=>{onFocus?.();onChange(bars[index+1].number);}}><ChevronRight size={17}/></button>
  </div>
 </div>;
}

function MeasureGrid({bars,page,onPage,start,end,selected,single,onPick,marks,target,t}){
 const pages=[...new Set(bars.map(b=>b.page))],from=bars.findIndex(b=>b.number===Number(start)),to=bars.findIndex(b=>b.number===Number(end));
 return <section className="desktopPdfRepeatMap" aria-label={t('반복 마디 선택','Choose repeat measures')}>
  <div className="desktopPdfRepeatMapHead"><strong>{single?t('기호를 붙일 마디 선택','Choose a measure for symbols'):target==='start'?t('시작 마디를 눌러 주세요','Choose the start measure'):t('끝 마디를 눌러 주세요','Choose the end measure')}</strong><span>{single?t('번호를 눌러 이동','Click a number to edit'):t('두 번 클릭으로 구간 선택','Two clicks select a range')}</span></div>
  <div className="desktopPdfRepeatPages" role="group" aria-label={t('마디 선택 페이지','Measure picker pages')}>{pages.map(p=><button type="button" key={p} aria-pressed={page===p} onClick={()=>onPage(p)}>{p}{t('페이지',' page')}</button>)}</div>
  <div className="desktopPdfRepeatGrid">{bars.map((bar,index)=>{
   if(bar.page!==page)return null;
   const chosen=single?bar.number===selected:from>=0&&to>=from&&index>=from&&index<=to;
   const edge=!single&&(bar.number===Number(start)||bar.number===Number(end));
   return <button type="button" key={bar.number} data-repeat-measure={bar.number} data-edge={edge||undefined} aria-label={`${bar.number}${t('마디 선택',': select measure')}`} aria-pressed={chosen} onClick={()=>onPick(bar.number)}>{bar.number}{single&&marks[bar.number]&&<i aria-hidden="true"/>}</button>;
  })}</div>
 </section>;
}

// Desktop presentation only. Saved settings and performed order stay shared.
export default function DesktopPdfRepeatSettings({bars,record,activeBar,onApply,onClose,onAnalyse}){
 const language=useLanguage(),t=(ko,en)=>language==='ko'?ko:en,ref=useRef(null);
 const first=bars[0]?.number??1,last=bars.at(-1)?.number??first,current=bars.some(b=>b.number===activeBar)?activeBar:first;
 const [draft,setDraft]=useState(()=>normalizePdfRepeats(record.repeatSettings)??{mode:'range',start:record.loop?bars[(record.loopStart??1)-1]?.number??first:current,end:record.loop?bars[(record.loopEnd??bars.length)-1]?.number??last:bars[Math.min(bars.length-1,Math.max(0,bars.findIndex(b=>b.number===current))+7)]?.number??last,marks:{}});
 const [selected,setSelected]=useState(current),[target,setTarget]=useState('start'),[page,setPage]=useState(()=>bars.find(b=>b.number===Number(draft.start))?.page??bars[0]?.page??1);
 const [advanced,setAdvanced]=useState(false),[preset,setPreset]=useState(()=>record.repeatSettings?.marks?.[record.repeatSettings?.end]?.ending===1?'endings':'repeat');
 const [pending,setPending]=useState(false),[picking,setPicking]=useState(false);
 const presetAnchor=useRef({start:draft.start,end:draft.end});
 const [endingStart,setEndingStart]=useState(current),[endingEnd,setEndingEnd]=useState(current),[ending,setEnding]=useState(1);
 const preview=useMemo(()=>pending?previewPdfRepeatPreset(draft,bars,{start:draft.start,end:draft.end,kind:preset},presetAnchor.current):draft,[bars,draft,pending,preset]);
 const effective=preview??draft;
 const plan=useMemo(()=>pdfRepeatPlan(bars,effective),[bars,effective]);
 const from=bars.findIndex(b=>b.number===Number(draft.start)),to=bars.findIndex(b=>b.number===Number(draft.end)),validRange=from>=0&&to>=from;
 const mark=effective.marks[selected]??{},marks=Object.entries(effective.marks).sort(([a],[b])=>Number(a)-Number(b));
 const issues=(draft.mode==='range'||pending)&&!validRange?[t('시작·끝 마디를 확인해 주세요.','Check the start and end measures.')]:pending&&!preview?[t('반복 번호 2를 설정할 다음 마디가 필요합니다.','A following measure is needed for ending 2.')]:plan.issues;
 const endFrom=bars.findIndex(b=>b.number===endingStart),endTo=bars.findIndex(b=>b.number===endingEnd);
 const nextEnding=validRange?bars[to+1]?.number:null;
 useEffect(()=>{const dialog=ref.current;dialog.showModal();return()=>dialog.close();},[]);
 const field=(key,value)=>{setDraft(d=>({...d,[key]:value}));setPending(draft.mode==='score'&&!advanced);setPicking(false);};
 const commitPreview=()=>{setDraft(effective);presetAnchor.current={start:effective.start,end:effective.end};setPending(false);setPicking(false);};
 const setMode=mode=>{commitPreview();setDraft({...effective,mode});setAdvanced(false);setTarget('start');setPending(mode==='score'&&!Object.keys(effective.marks).length);focusBar(effective.start);};
 const setEditor=value=>{commitPreview();setAdvanced(value);setTarget('start');focusBar(value?selected:effective.start);};
 const focusBar=number=>{const bar=bars.find(b=>b.number===Number(number));if(bar)setPage(bar.page);};
 const editMark=number=>{commitPreview();setSelected(number);setAdvanced(true);focusBar(number);};
 const change=patch=>setDraft(d=>setPdfRepeatMark(d,selected,patch));
 const setRange=count=>{
  const index=count==='all'?0:Math.max(0,bars.findIndex(b=>b.number===current));
  const end=count==='all'?bars.length-1:Math.min(bars.length-1,index+count-1);
  setDraft(d=>({...d,start:bars[index].number,end:bars[end].number}));setTarget('start');focusBar(bars[index].number);setPending(draft.mode==='score');setPicking(false);
 };
 const pick=number=>{
  if(advanced){setSelected(number);return;}
  if(target==='start'){setDraft(d=>({...d,start:number,end:to<bars.findIndex(b=>b.number===number)?number:d.end}));setTarget('end');setPicking(true);}
  else{const index=bars.findIndex(b=>b.number===number);setDraft(d=>({...d,start:from<0||index<from?number:d.start,end:from>=0&&index<from?d.start:number}));setTarget('start');setPicking(false);setPending(draft.mode==='score');}
 };
 const choose=(label,value,onChange)=><label>{label}<select aria-label={label} value={value} onChange={e=>onChange(Number(e.target.value))}>{bars.map(b=><option key={b.number} value={b.number}>{b.number}{t('마디',' bar')}</option>)}</select></label>;
 const removeMarks=number=>{commitPreview();const marks={...effective.marks};if(number)delete marks[number];setDraft({...effective,marks:number?marks:{}});};
 const summary=picking?t('끝 마디를 선택해 주세요.','Choose the end measure.'):draft.mode==='range'&&validRange?`${draft.start}${Number(draft.start)===Number(draft.end)?'':`–${draft.end}`}${t('마디 반복',' loop')} · ${to-from+1}${t('마디',' measures')}`:draft.mode==='score'?t(`반복 포함 ${plan.order.length}마디 연주`,`${plan.order.length} measure visits including repeats`):t(`전체 ${bars.length}마디를 순서대로 연주`,`Play all ${bars.length} measures in order`);
 const rangeFields=<div className="desktopPdfRepeatRangeFields">
  <MeasureNumber label={t('반복 시작 마디','Loop start measure')} value={draft.start} bars={bars} active={target==='start'} onFocus={()=>setTarget('start')} onChange={v=>{field('start',v);focusBar(v);}} t={t}/>
  <ArrowRight className="desktopPdfRepeatRangeArrow" size={20} aria-hidden="true"/>
  <MeasureNumber label={t('반복 끝 마디','Loop end measure')} value={draft.end} bars={bars} active={target==='end'} onFocus={()=>setTarget('end')} onChange={v=>{field('end',v);focusBar(v);}} t={t}/>
 </div>;
 return <dialog ref={ref} className="pdfDialog desktopPdfRepeatSettings" aria-label={t('반복 설정','Repeat settings')} onCancel={e=>{e.preventDefault();onClose();}}>
  <header><div className="desktopPdfRepeatTitle"><span className="desktopPdfRepeatIcon"><Repeat2 size={23}/></span><div><h2>{t('반복 설정','Repeat settings')}</h2><p>{t('필요한 구간만, 원하는 순서로.','Practice the passage in the order you need.')}</p></div></div><button type="button" className="desktopPdfRepeatClose" aria-label={t('반복 설정 닫기','Close repeat settings')} onClick={onClose}><X size={20}/></button></header>
  <div className="desktopPdfRepeatBody">
   {!bars.length?<div className="desktopPdfRepeatEmpty"><Music2 size={32}/><h3>{t('먼저 마디를 찾아볼까요?','Find the measures first')}</h3><p>{t('마디를 인식하면 번호를 눌러 반복 구간을 고를 수 있어요.','Recognize measures to select a loop by number.')}</p><button type="button" className="pdfPrimary" onClick={onAnalyse}>{t('마디 자동 인식','Recognize measures')}</button></div>:<>
    <div className="desktopPdfRepeatModes" role="group" aria-label={t('반복 재생 방식','Repeat playback mode')}>{[['range',t('구간 반복','Practice loop'),Repeat2],['score',t('도돌이표 · 코다','Repeat signs · Coda'),Music2],['off',t('반복 끄기','Off'),null]].map(([value,label,Icon])=><button type="button" key={value} aria-pressed={draft.mode===value} onClick={()=>setMode(value)}>{Icon&&<Icon size={16} aria-hidden="true"/>}{label}</button>)}</div>
    {draft.mode==='off'?<div className="desktopPdfRepeatOff"><span><ArrowRight size={26}/></span><h3>{t('처음부터 끝까지, 순서대로','Play straight through')}</h3><p>{t('반복 재생을 끕니다. 악보에 붙인 기호는 그대로 보관합니다.','Turn off repeat playback. Keep the symbols already placed on the score.')}</p></div>:<>
     {draft.mode==='score'&&<div className="desktopPdfRepeatEditorHead"><div className="desktopPdfRepeatEditorTabs" role="group" aria-label={t('기호 설정 방식','Symbol editor')}>{[[false,t('간편 설정','Quick setup')],[true,t('개별 기호 편집','Individual symbols')]].map(([value,label])=><button type="button" key={label} aria-pressed={advanced===value} onClick={()=>setEditor(value)}>{advanced===value&&<Check size={15} aria-hidden="true"/>}{label}</button>)}</div><p>{advanced?t('마디를 고르고 도돌이표·번호·코다를 설정하세요.','Choose a measure to set repeat signs, endings or Coda.'):t('시작과 끝을 누르면 양쪽 기호가 함께 설정됩니다.','Choose the start and end to set both repeat signs together.')}</p></div>}
     {!advanced?<>
      {draft.mode==='score'&&<div className="desktopPdfRepeatPresets" role="group" aria-label={t('기호 자동 배치','Repeat presets')}>{[['repeat',t('𝄆 도돌이표 𝄇','𝄆 Repeat signs 𝄇')],['endings',t('도돌이표 + 반복 번호','Repeat signs + endings')]].map(([value,label])=><button type="button" key={value} aria-pressed={preset===value} onClick={()=>{setPreset(value);setPending(true);setPicking(false);}}>{label}</button>)}</div>}
      {rangeFields}
      {draft.mode==='range'?<div className="desktopPdfRepeatShortcuts"><span>{t('빠른 선택','Quick select')}</span>{[[1,t('현재 마디','Current bar')],[4,t('현재부터 4마디','4 from here')],[8,t('8마디','8 bars')],['all',t('곡 전체','Entire score')]].map(([count,label])=><button type="button" key={count} onClick={()=>setRange(count)}>{label}</button>)}</div>:<div className="desktopPdfRepeatPresetAction"><p>{preset==='endings'?(nextEnding?t(`첫 연주는 ${draft.end}마디(1번), 두 번째는 ${nextEnding}마디(2번)로 이어집니다.`,`First pass: measure ${draft.end} (1). Second pass: measure ${nextEnding} (2).`):t('반복 번호 2로 이어질 다음 마디가 필요합니다.','A following measure is needed for ending 2.')):t('선택한 구간을 두 번 연주한 뒤 다음 마디로 이어집니다.','Play this passage twice, then continue to the next measure.')}</p></div>}
     </>:choose(t('기호를 붙일 마디','Measure for symbols'),selected,v=>{setSelected(v);focusBar(v);})}
     <MeasureGrid bars={bars} page={page} marks={effective.marks} target={target} t={t} onPage={setPage} start={draft.start} end={draft.end} selected={selected} single={advanced} onPick={pick}/>
     {draft.mode==='score'&&advanced&&<section className="desktopPdfRepeatAdvanced">
      <div className="desktopPdfRepeatPair"><button type="button" aria-pressed={Boolean(mark.repeatStart)} onClick={()=>change({repeatStart:!mark.repeatStart})}>𝄆 {t('도돌이표 시작','Repeat start')}</button><button type="button" aria-pressed={Boolean(mark.repeatEnd)} onClick={()=>change({repeatEnd:!mark.repeatEnd})}>{t('도돌이표 끝','Repeat end')} 𝄇</button></div>
      <div className="desktopPdfRepeatPair"><label>{t('반복 번호','Numbered ending')}<select aria-label={t('반복 번호','Numbered ending')} value={mark.ending??0} onChange={e=>change({ending:Number(e.target.value)})}><option value={0}>{t('없음','None')}</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}{t('번',' ending')}</option>)}</select></label><label>{t('마디 끝선','End barline')}<select aria-label={t('마디 끝선','End barline')} value={mark.endBarline??''} onChange={e=>change({endBarline:e.target.value})}><option value="">{t('원본 유지','Original')}</option><option value="single">{t('세로줄','Single')}</option><option value="double">{t('겹세로줄','Double')}</option><option value="final">{t('끝세로줄','Final')}</option></select></label></div>
      <details className="desktopPdfRepeatDetails"><summary>{t('코다 · 세뇨 · D.C. · D.S.','Coda · Segno · D.C. · D.S.')}{(mark.marker||mark.command)&&<span>{pdfRepeatMarkLabel({marker:mark.marker,command:mark.command})}</span>}</summary><div className="desktopPdfRepeatPair"><label>{t('이동 위치 기호','Location symbol')}<select aria-label={t('이동 위치 기호','Location symbol')} value={mark.marker??''} onChange={e=>change({marker:e.target.value})}><option value="">{t('없음','None')}</option>{NAV_MARKERS.map(([value,label])=><option key={value} value={value}>{localizeUi(label)}</option>)}</select></label><label>{t('이동 명령','Jump command')}<select aria-label={t('이동 명령','Jump command')} value={mark.command??''} onChange={e=>change({command:e.target.value})}><option value="">{t('없음','None')}</option>{NAV_COMMANDS.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div><p>{t('세뇨·코다 이동 경로는 한 쌍을 설정할 수 있습니다.','One Segno/Coda route is supported.')}</p></details>
      <details className="desktopPdfRepeatDetails"><summary>{t('여러 마디에 같은 번호 붙이기','Apply an ending to several measures')}</summary><div className="desktopPdfRepeatPair">{choose(t('번호 시작 마디','Ending start measure'),endingStart,setEndingStart)}{choose(t('번호 끝 마디','Ending end measure'),endingEnd,setEndingEnd)}</div><div className="desktopPdfRepeatPair"><label>{t('붙일 번호','Ending number')}<select aria-label={t('붙일 번호','Ending number')} value={ending} onChange={e=>setEnding(Number(e.target.value))}>{[0,1,2,3,4,5].map(n=><option key={n} value={n}>{n?`${n}.`:t('번호 지우기','Clear ending')}</option>)}</select></label><button type="button" disabled={endFrom<0||endTo<endFrom} onClick={()=>setDraft(d=>bars.slice(endFrom,endTo+1).reduce((next,b)=>setPdfRepeatMark(next,b.number,{ending}),d))}>{t('번호 붙이기','Apply ending')}</button></div></details>
      {(mark.ending||mark.marker)&&<details className="desktopPdfRepeatDetails"><summary>{t('기호 높이 조절','Adjust symbol height')}</summary><label className="desktopPdfSymbolSpacing">{t('기호 위쪽 간격','Space above the measure')}<input type="number" aria-label={t('기호 위쪽 간격','Space above the measure')} min="0" max="100" step="2" value={mark.lift??14} onChange={e=>change({lift:Math.max(0,Math.min(100,Number(e.target.value)||0))})}/><small>{t('원본 글자와 겹치면 간격을 늘려 주세요.','Increase spacing if a symbol overlaps the original text.')}</small></label></details>}
     </section>}
     {draft.mode==='score'&&<>{marks.length>0&&<details className="desktopPdfRepeatDetails desktopPdfRepeatSaved"><summary>{t(`붙인 기호 · ${marks.length}개 마디`,`Symbols on ${marks.length} measures`)}</summary><ul className="desktopPdfRepeatList">{marks.map(([number,m])=><li key={number}><button type="button" aria-pressed={selected===Number(number)&&advanced} onClick={()=>editMark(Number(number))}>{number}{t('마디',' bar')}<span>{pdfRepeatMarkLabel(m)}</span></button><button type="button" aria-label={`${number}${t('마디 기호 삭제',' bar: remove symbols')}`} onClick={()=>removeMarks(number)}><X size={15}/></button></li>)}</ul><button type="button" className="desktopPdfRepeatTextButton" onClick={()=>removeMarks()}>{t('기호 모두 지우기','Clear all symbols')}</button></details>}</>}
    </>}
   </>}
  </div>
  <footer>
   {bars.length>0&&<div className="desktopPdfRepeatPreview">{issues.length?<div role="alert">{issues.map((issue,i)=><p key={i}>{localizeUi(issue)}</p>)}</div>:<><strong>{draft.mode==='range'&&<Repeat2 size={17}/>} {summary}</strong>{draft.mode==='score'&&marks.length>0&&!picking&&<DesktopPdfRepeatRoute bars={bars} order={plan.order} t={t}/>}</>}</div>}
   <div className="desktopPdfRepeatFooterActions"><span>{draft.mode==='range'?t('끝 마디의 마지막 박까지 반복합니다.','Includes the last beat of the end measure.'):t('적용 전까지 악보는 바뀌지 않습니다.','Changes are saved only when applied.')}</span><button type="button" onClick={onClose}>{t('취소','Cancel')}</button><button type="button" className="pdfPrimary" disabled={!bars.length||issues.length>0||picking} onClick={()=>onApply(normalizePdfRepeats(effective))}>{draft.mode==='off'?t('반복 끄기','Turn off repeats'):t('설정 적용','Apply settings')}</button></div>
  </footer>
 </dialog>;
}
