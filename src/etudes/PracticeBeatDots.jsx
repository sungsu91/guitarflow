export default function PracticeBeatDots({meter=[4,4],beat=-1,showMeter=true,beatAccents={},onToggleAccent}){
 return <div className="etudeBeatRow" aria-label={meter.join('/')+' · '+(beat<0?'정지':(beat+1)+'박')} data-meter={meter.join('/')} data-beat={beat}>{Array.from({length:meter[0]},(_,i)=>{
 const state=beatAccents[i]??(i===0),strong=state===true,muted=state==='mute',label=muted?'무음':strong?'강박':'약박';
 const className='etudeBeat '+(beat===i?'is-on ':'')+(strong?'is-downbeat ':'')+(muted?'is-muted':'');
 const dot=<i aria-hidden="true">{muted&&<svg className="etudeBeatMuteCheck" viewBox="0 0 16 16"><path d="m4 8 3 3 5-6"/></svg>}</i>;
 return onToggleAccent?<button type="button" key={i} className={className} aria-label={(i+1)+'박 '+label} title={(strong?'약박':muted?'강박':'무음')+'으로 변경'} onClick={()=>onToggleAccent(i)}>{dot}{i+1}</button>:<span key={i} className={className} aria-label={(i+1)+'박 '+label}>{dot}{i+1}</span>;
 })}{showMeter&&<small>{meter.join('/')}</small>}</div>;
}
