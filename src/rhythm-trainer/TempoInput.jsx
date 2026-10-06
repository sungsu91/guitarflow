import React,{useEffect,useState} from 'react';

// Keep partial keyboard input (for example the "9" in "96") separate from
// the valid tempo used by the audio clock. Clamp only when editing finishes.
export default function TempoInput({value,onChange,...props}) {
 const [text,setText]=useState(String(value));
 useEffect(()=>setText(String(value)),[value]);
 function commit(){
  const number=Number(text);
  const next=text.trim()&&Number.isFinite(number)?Math.max(30,Math.min(240,number)):value;
  setText(String(next));
  if(next!==value)onChange(next);
 }
 return <input {...props} type="number" min="30" max="240" value={text}
  onChange={event=>{
   const next=event.target.value;
   setText(next);
   const number=Number(next);
   if(next.trim()&&Number.isFinite(number)&&number>=30&&number<=240)onChange(number);
  }}
  onBlur={commit}
  onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();}}
 />;
}
