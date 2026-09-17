import {Trash2} from 'lucide-react';
import EditorMusicIcon from './EditorMusicIcon.jsx';
import {NAV_MARKERS,NAV_COMMANDS} from './scoreNavigation.js';

export default function RepeatTools({bar,index,issue,onRepeat,onNavigation,compact=false}){
 const marked=bar.repeatStart||bar.repeatEnd||bar.ending||bar.marker||bar.command;
 if(compact)return <div className="mobileRepeatPopoverBody repeatCompact">
  <div className="repeatCompactSymbols" role="group" aria-label="반복과 위치 기호">
   {[['start','반복 시작'],['end','반복 끝']].map(([kind,label])=><button type="button" key={kind} aria-label={label} title={label} aria-pressed={Boolean(bar[kind==='start'?'repeatStart':'repeatEnd'])} onClick={()=>onRepeat(kind)}><EditorMusicIcon kind={`repeat-${kind}`}/></button>)}
   {NAV_MARKERS.map(([kind,label])=><button type="button" key={kind} aria-label={label} title={label} aria-pressed={bar.marker===kind} onClick={()=>onNavigation('marker',kind)}>{kind==='toCoda'&&<span>To</span>}<EditorMusicIcon kind={kind}/></button>)}
  </div>
  <fieldset className="repeatCompactEndings"><legend>번호</legend><div className="repeatEndingButtons">{[1,2,3,4,5].map(n=><button type="button" key={n} aria-label={`${n}번 엔딩`} aria-pressed={bar.ending===n} onClick={()=>onNavigation('ending',n)}><span className="endingBracket">{n}.</span></button>)}</div></fieldset>
  <div className="repeatCompactActions"><select aria-label="반복 이동 명령" value={bar.command??''} onChange={e=>onNavigation('command',e.target.value)}><option value="">이동 없음</option>{NAV_COMMANDS.map(([kind,label])=><option key={kind} value={kind}>{label}</option>)}</select><button type="button" className="is-delete" aria-label="선택한 마디의 반복 표시 제거" title="반복 표시 지우기" disabled={!marked} onClick={()=>onRepeat('clear')}><Trash2 size={18}/></button></div>
  {issue&&<p className="mobileTechniqueHint" role="status">{issue}</p>}
 </div>;
 return <div className="mobileRepeatPopoverBody">
  <p className="repeatTarget">적용 대상 <strong>{index+1}마디</strong></p>
  <div className="repeatMarkButtons">{[['start','반복 시작','왼쪽 경계'],['end','반복 끝','오른쪽 경계']].map(([kind,label,edge])=><button type="button" key={kind} aria-label={label} aria-pressed={Boolean(bar[kind==='start'?'repeatStart':'repeatEnd'])} onClick={()=>onRepeat(kind)}><EditorMusicIcon kind={`repeat-${kind}`}/><span>{label}<small>{edge}</small></span></button>)}</div>
  <p className="mobileTechniqueHint">일반 반복은 총 2회 · 번호 엔딩은 해당 회차에 연주</p>
  <fieldset className="repeatSection"><legend>번호 엔딩</legend><div className="repeatEndingButtons">{[1,2,3,4,5].map(n=><button type="button" key={n} aria-label={`${n}번 엔딩`} aria-pressed={bar.ending===n} onClick={()=>onNavigation('ending',n)}><span className="endingBracket">{n}.</span></button>)}</div><p className="mobileTechniqueHint">같은 번호를 옆 마디에도 지정하면 구간이 이어집니다. 마지막 엔딩을 제외한 각 엔딩 끝에 반복 끝을 넣으세요. 다시 누르면 해제합니다.</p></fieldset>
  <fieldset className="repeatSection"><legend>위치 기호</legend><div className="repeatNavigationButtons">{NAV_MARKERS.map(([kind,label,hint])=><button type="button" key={kind} aria-label={label} aria-pressed={bar.marker===kind} onClick={()=>onNavigation('marker',kind)} title={hint}><EditorMusicIcon kind={kind}/><span>{kind==='fine'?'피네':label}</span></button>)}</div><p className="mobileTechniqueHint">{NAV_MARKERS.find(([kind])=>bar.marker===kind)?.[2]??'세뇨·코다는 마디 시작, To Coda·Fine은 마디 끝에 적용합니다.'}</p></fieldset>
  <fieldset className="repeatSection"><legend>이동 명령 · 마디 끝</legend><select aria-label="반복 이동 명령" value={bar.command??''} onChange={e=>onNavigation('command',e.target.value)}><option value="">없음</option>{NAV_COMMANDS.map(([kind,label])=><option key={kind} value={kind}>{label}</option>)}</select><p className="mobileTechniqueHint">{NAV_COMMANDS.find(([kind])=>bar.command===kind)?.[2]??'D.C.는 처음으로, D.S.는 세뇨로 돌아갑니다.'} · 돌아온 뒤 도돌이표는 다시 반복하지 않고 마지막 번호 엔딩을 연주합니다.</p></fieldset>
  {issue&&<p className="mobileTechniqueHint" role="status">{issue}</p>}
  <button type="button" className="is-delete" disabled={!marked} onClick={()=>onRepeat('clear')}><Trash2 size={18}/>선택한 마디의 반복 표시 제거</button>
 </div>;
}
