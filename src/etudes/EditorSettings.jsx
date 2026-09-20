import {useCallback,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {changeTuning,maxFret,midiName,tabCandidates,tuningName,tuningPresets} from './scoreTuning.js';
import './editorSettings.css';

// Portalled into the modal editor (not body) so it remains in the top layer
// and inherits the active white/dark theme without copying theme state.
function EditorPopover({anchor,onClose,children,label}){
 const ref=useRef(null),[position,setPosition]=useState({visibility:'hidden'});
 useLayoutEffect(()=>{
  const v=window.visualViewport,editor=anchor.closest('dialog');
  const place=()=>{const a=anchor.getBoundingClientRect(),node=ref.current;if(!node)return;
   const top=(v?.offsetTop??0)+12,left=(v?.offsetLeft??0)+12,right=left+(v?.width??innerWidth)-24,bottom=top+(v?.height??innerHeight)-24;
   if(a.bottom<top||a.top>bottom){onClose(false);return;}
   const width=Math.min(340,right-left),above=a.top-top-12,below=bottom-a.bottom-12,up=below<Math.min(node.scrollHeight,320)&&above>below;
   const height=Math.max(80,up?above:below),x=Math.max(left,Math.min(a.left,right-width));
   setPosition({position:'fixed',left:x,top:up?Math.max(top,a.top-12-Math.min(node.scrollHeight,height)):a.bottom+12,width,maxHeight:height,'--tail-x':`${Math.max(14,Math.min(width-14,a.left+a.width/2-x))}px`,'--tail-top':up?'100%':'-7px'});
  };place();const observer=new ResizeObserver(place);observer.observe(ref.current);
  const outside=e=>{if(!ref.current.contains(e.target)&&!anchor.contains(e.target))onClose(false);};
  const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose(true);}if(e.key==='Tab'){const list=[...ref.current.querySelectorAll('button:not(:disabled),input,select')];if(!list.length)return;const first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();anchor.focus({preventScroll:true});}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();onClose(true);}}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key,true);window.addEventListener('resize',place);v?.addEventListener('resize',place);editor.addEventListener('scroll',place,true);v?.addEventListener('scroll',place);
  ref.current.querySelector('button,input,select')?.focus({preventScroll:true});
  return()=>{observer.disconnect();document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key,true);window.removeEventListener('resize',place);v?.removeEventListener('resize',place);editor.removeEventListener('scroll',place,true);v?.removeEventListener('scroll',place);};
 },[anchor,onClose]);
 return createPortal(<section ref={ref} style={position} className="editorSettingsPopover" role="dialog" aria-label={label} onKeyDown={e=>e.stopPropagation()}><div className="editorSettingsBody">{children}</div></section>,anchor.closest('dialog'));
}

export default function useEditorSettings(draft,setDraft,midi){
 const [menu,setMenu]=useState(null),[pending,setPending]=useState(null),[mode,setMode]=useState('pitch'),[custom,setCustom]=useState(null),[error,setError]=useState('');
 const anchor=useRef(null),layout=useRef(null);
 const close=useCallback((focus=false)=>{setMenu(null);setPending(null);setCustom(null);setError('');if(focus)anchor.current?.focus({preventScroll:true});},[]);
 const open=(id,e)=>{if(menu===id){close();return;}anchor.current=e.currentTarget;setMenu(id);setPending(null);setCustom(null);setError('');};
 const request=settings=>{try{const hasNotes=draft.measures.some(m=>m.events.some(e=>e.notes.length));if(hasNotes){setPending(settings);setMode('pitch');}else{setDraft(changeTuning(draft,settings).document);close(true);}}catch(e){setError(e.message);}};
 let preview=null;try{if(pending)preview=changeTuning(draft,pending,mode,{reassignLocked:true});}catch(e){preview={error:e.message};}
 const issues=draft.measures.flatMap((m,b)=>m.events.flatMap((e,i)=>e.notes.filter(n=>n.unplaced||n.outsidePreferred).map(n=>({n,b,i}))));
 const tuning=<button type="button" className="editorTuningButton" aria-expanded={menu==='tuning'} aria-haspopup="dialog" onClick={e=>open('tuning',e)}>{tuningName(draft)} ▾</button>;
 const capo=<button type="button" aria-expanded={menu==='capo'} aria-haspopup="dialog" onClick={e=>open('capo',e)}>{draft.capo?`카포 ${draft.capo}`:'카포 없음'} ▾</button>;
 const edit=(active,onToggle,disabled)=>{layout.current={active,onToggle,disabled};return <button type="button" aria-expanded={menu==='edit'} aria-haspopup="dialog" onClick={e=>open('edit',e)}>편집 ▾</button>;};
 const popup=menu&&<EditorPopover anchor={anchor.current} onClose={close} label={menu==='tuning'?'튜닝 설정':menu==='capo'?'카포 설정':'편집 메뉴'}>
  <header><strong>{menu==='tuning'?'튜닝':menu==='capo'?'카포':'편집'}</strong><button type="button" aria-label="편집 설정 닫기" onClick={()=>close(true)}>×</button></header>
  {pending?<><fieldset><legend>기존 음표 변경 방식</legend>{[['pitch','음높이 유지'],['fingering','운지 유지']].map(([id,label])=><label key={id}><input type="radio" name="tuning-change-mode" checked={mode===id} onChange={()=>setMode(id)}/>{label}</label>)}</fieldset><p>{mode==='pitch'?'실제 음높이를 유지하고 새 카포·튜닝에 맞는 TAB 위치를 계산합니다. 아래 운지 변경을 확인한 뒤 적용하세요.':'현과 카포 기준 프렛을 유지하고 실제 음높이를 바꿉니다.'}</p>{preview?.conflicts?.length>0&&<p role="alert">직접 지정 운지 {preview.conflicts.length}개 재계산: {preview.conflicts.slice(0,4).join(', ')}. 적용하면 해당 현·프렛이 변경됩니다.</p>}{preview?.unplaced>0&&<p role="status">TAB 배치 불가 {preview.unplaced}음 · 원래 음높이 보존</p>}{preview?.error&&<p role="alert">{preview.error}</p>}<button type="button" disabled={!preview||Boolean(preview.error)} onClick={()=>{setDraft(preview.document);close(true);}}>{mode==='pitch'&&preview?.conflicts?.length?'운지 재계산 후 적용':'변경 적용'}</button><button type="button" onClick={()=>setPending(null)}>취소</button></>:
   menu==='tuning'?<>{tuningPresets(draft.instrument).map(p=><button type="button" key={p.id} aria-pressed={tuningName(draft)===p.label} onClick={()=>request({tuning:p.tuning})}>{p.label}</button>)}<button type="button" onClick={()=>setCustom([...draft.tuning])}>사용자 지정</button>{custom&&<><p>{custom.length}번 줄 → 1번 줄 · 실제 개방현 음높이</p>{[...custom].reverse().map((pitch,index)=>{const i=custom.length-1-index;return <label key={i}>{i+1}번 줄<select aria-label={`${i+1}번 줄 개방현`} value={pitch} onChange={e=>setCustom(t=>t.map((n,j)=>i===j?Number(e.target.value):n))}>{Array.from({length:65},(_,k)=>k+24).map(n=><option key={n} value={n}>{midiName(n)}</option>)}</select></label>;})}<button type="button" onClick={()=>request({tuning:custom})}>사용자 튜닝 적용</button></>}<small>{draft.tuning.length} → 1번 줄: {[...draft.tuning].reverse().map(midiName).join(' · ')}</small></>:
   menu==='capo'?<><div className="editorCapoGrid">{Array.from({length:Math.min(12,maxFret(draft))+1},(_,n)=><button type="button" key={n} aria-pressed={(draft.capo??0)===n} onClick={()=>request({capo:n})}>{n||'없음'}</button>)}</div><p>TAB 0 = 카포 개방현 · 실제 위치 최대 {maxFret(draft)}프렛</p></>:
   <><fieldset><legend>줄 편집</legend><button type="button" disabled={layout.current?.disabled} aria-pressed={layout.current?.active} onClick={()=>{layout.current?.onToggle();close(true);}}>기존 악보 줄 배치 편집</button>{layout.current?.disabled&&<small>한 줄 2마디 이상에서 줄을 나눌 수 있습니다.</small>}</fieldset>
    <fieldset><legend>자동 TAB</legend><label>포지션<select aria-label="자동 TAB 포지션" value={draft.autoTab?.mode??'auto'} onChange={e=>setDraft(d=>({...d,autoTab:{min:0,max:12,...d.autoTab,mode:e.target.value}}))}><option value="auto">자동</option><option value="range">선호 프렛 범위 설정</option></select></label>{draft.autoTab?.mode==='range'&&<div className="editorFretRange">{[['min','최소'],['max','최대']].map(([key,label])=><label key={key}>{label}<input aria-label={`선호 ${label} 프렛`} type="number" min="0" max={maxFret(draft)-(draft.capo??0)} value={draft.autoTab[key]} onChange={e=>{const value=Math.max(0,Math.min(maxFret(draft)-(draft.capo??0),Number(e.target.value)));setDraft(d=>({...d,autoTab:{...d.autoTab,[key]:value,[key==='min'?'max':'min']:key==='min'?Math.max(value,d.autoTab.max):Math.min(value,d.autoTab.min)}}));}}/></label>)}</div>}<small>카포 기준 상대 프렛 · 새 입력에 적용 · 직접 지정 운지는 보존</small></fieldset>
    <fieldset><legend>MIDI 건반</legend><button type="button" disabled={!midi.supported} onClick={midi.connect}>건반 연결</button><p role="status">{midi.status}</p>{midi.devices.length>0&&<label>입력 장치<select aria-label="MIDI 입력 장치" value={midi.selected} onChange={e=>midi.setSelected(e.target.value)}><option value="">장치 선택</option>{midi.devices.map(d=><option key={d.id} value={d.id}>{d.name??d.id}</option>)}</select></label>}<small>설정을 닫고 악보를 선택한 뒤 입력하세요. 70ms 이내 겹쳐 누른 음은 화음, 음을 떼면 묶음 종료. 선택 음길이로 한 번 이동합니다.</small></fieldset>
    {issues.length>0&&<fieldset><legend>TAB 배치 확인</legend>{issues.map(({n,b,i})=><div key={n.id}><p>{b+1}마디 {i+1}음 · {midiName(n.midi)} · {n.unplaced?(tabCandidates(draft,n.midi).length?'운지 확인 필요 (?)':'현재 설정에서 연주 불가 (?)'):'선호 범위 밖'}</p>{n.unplaced&&tabCandidates(draft,n.midi).filter(c=>!draft.measures[b].events[i].notes.some(other=>other!==n&&!other.unplaced&&other.string===c.string)).map(c=><button type="button" key={c.string} onClick={()=>setDraft(d=>({...d,measures:d.measures.map((m,bi)=>bi!==b?m:{...m,events:m.events.map((e,ei)=>ei!==i?e:{...e,notes:e.notes.map(t=>t.id===n.id?{...t,...c,harmonic:false,unplaced:false,locked:true,outsidePreferred:false}:t)})})}))}>{c.string}번줄 {c.fret}프렛 확정</button>)}</div>)}</fieldset>}
   </>}
  {error&&<p role="alert">{error}</p>}
 </EditorPopover>;
 return {tuning,capo,edit,popup,isOpen:Boolean(menu)};
}
