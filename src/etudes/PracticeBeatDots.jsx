export default function PracticeBeatDots({meter=[4,4],beat=-1,showMeter=true,beatAccents={},onToggleAccent}){
 return <div className="etudeBeatRow" aria-label={meter.join('/')+' · '+(beat<0?'정지':(beat+1)+'박')} data-meter={meter.join('/')} data-beat={beat}>{Array.from({length:meter[0]},(_,i)=>{
 const strong=beatAccents[i]??(i===0),className='etudeBeat '+(beat===i?'is-on ':'')+(strong?'is-downbeat':'');
 return onToggleAccent?<button type="button" key={i} className={className} aria-label={(i+1)+'박 '+(strong?'강박':'기본박')} aria-pressed={strong} title={(strong?'기본박':'강박')+'으로 변경'} onClick={()=>onToggleAccent(i)}><i aria-hidden="true"/>{i+1}</button>:<span key={i} className={className}><i/>{i+1}</span>;
 })}{showMeter&&<small>{meter.join('/')}</small>}</div>;
}
