import {useEffect,useRef} from 'react';
import {createMidiStepInput} from './midiStepInput.js';
import {midiInput} from '../input/midiInput.js';
import {useMidiConnection} from '../input/useInputSelection.js';

export default function useMidiKeyboard(onNotes,enabled,context){
 const latest=useRef({onNotes,enabled,context});latest.current={onNotes,enabled,context};
 const connection=useMidiConnection();
 useEffect(()=>{
  const engine=createMidiStepInput(notes=>latest.current.onNotes(notes),{enabled:()=>latest.current.enabled(),context:()=>latest.current.context?.()});
  const stop=midiInput.consume({active:()=>Boolean(document.querySelector('dialog[open] [data-score-input]')),message:event=>engine.message(event.data),reset:()=>engine.reset()});
  const focus=e=>{if(!e.target.closest?.('[data-score-input]'))engine.suspend();};
  document.addEventListener('focusin',focus);
  void midiInput.connect(false);
  return()=>{stop();document.removeEventListener('focusin',focus);};
 },[]);
 return connection;
}
