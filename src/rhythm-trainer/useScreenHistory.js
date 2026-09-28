import {useCallback,useLayoutEffect,useRef,useState} from 'react';

const screens=new Set(['library','setup','play','edit']);
const onRoute=()=>window.location.hash==='#rhythm-trainer';
function currentEntry() {
 const entry=window.history.state?.rhythmTrainer;
 return entry&&typeof entry.id==='string'&&screens.has(entry.screen)&&Array.isArray(entry.trail)?entry:null;
}
function writeEntry(entry,replace=false) {
 window.history[replace?'replaceState':'pushState']({...window.history.state,rhythmTrainer:entry},'',window.location.href);
}

// Same-URL entries let native edge-swipe/browser Back traverse the trainer before
// changing the app route. The trail also keeps toolbar Back from adding entries.
export default function useScreenHistory(onRestore) {
 const [screen,setScreen]=useState(()=>onRoute()?currentEntry()?.screen||'library':'library');
 const entryRef=useRef(null),screenRef=useRef(screen),pending=useRef(false),restore=useRef(onRestore);
 restore.current=onRestore;
 useLayoutEffect(()=>{
  const sync=()=>{
   if(!onRoute())return;
   let entry=currentEntry();
   if(!entry){entry={id:crypto.randomUUID(),screen:'library',trail:[]};writeEntry(entry,true);}
   pending.current=false;
   // Print preview adds its own entry while retaining the underlying screen.
   if(entry.id===entryRef.current?.id)return;
   const previous=screenRef.current;
   entryRef.current=entry;screenRef.current=entry.screen;
   if(previous!==entry.screen)restore.current(entry.screen,previous);
   setScreen(entry.screen);
  };
  sync();
  window.addEventListener('popstate',sync);
  return()=>window.removeEventListener('popstate',sync);
 },[]);
 const navigate=useCallback(next=>{
  if(!screens.has(next)||next===screenRef.current||pending.current||!onRoute())return;
  const entry=currentEntry()||entryRef.current;
  if(!entry)return;
  const parent=entry.trail.findLastIndex(item=>item.screen===next);
  if(parent>=0){pending.current=true;window.history.go(parent-entry.trail.length);return;}
  // Saving a new pack replaces its editor with setup; Back still opens library.
  const replace=entry.screen==='edit'&&next==='setup';
  const trail=replace?entry.trail:[...entry.trail,{id:entry.id,screen:entry.screen}];
  const updated={id:crypto.randomUUID(),screen:next,trail};
  writeEntry(updated,replace);entryRef.current=updated;screenRef.current=next;setScreen(next);
 },[]);
 return [screen,navigate];
}
