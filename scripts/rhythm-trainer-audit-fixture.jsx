// Local QA entry: uses the real trainer, storage, history, Activity and audio.
// It intentionally does not import unrelated application modes.
import React,{Activity,useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../src/style.css';
import '../src/polish.css';
import '../src/layouts/desktop-layout.css';
import '../src/layouts/desktop-parity.css';
import '../src/layouts/mobile-training-landscape.css';
import '../src/layouts/tablet-layout.css';
import '../src/layouts/tablet-dialogs.css';
import '../src/components/backing-loop.css';
import '../src/navigation/activity-visibility.css';
import '../src/components/practice-gold-theme.css';
import RhythmTrainer from '../src/rhythm-trainer/RhythmTrainer.jsx';
import TabletLayout from '../src/layouts/TabletLayout.jsx';

function Audit(){
 const [{width,height},setSize]=useState({width:innerWidth,height:innerHeight});
 const [route,setRoute]=useState(location.hash);
 useEffect(()=>{
  const resize=()=>setSize({width:innerWidth,height:innerHeight}),navigate=()=>setRoute(location.hash);
  addEventListener('resize',resize);addEventListener('hashchange',navigate);
  return()=>{removeEventListener('resize',resize);removeEventListener('hashchange',navigate);};
 },[]);
 const mobile=width<1024,tablet=width>=700&&width<1024&&height>600;
 document.documentElement.dataset.rifflabLayout=tablet?'tablet':mobile?'mobile':'desktop';
 const open=route==='#rhythm-trainer';
 return <TabletLayout active={tablet}><div className="appRuntime theme-white">
  <main className={`app theme-white ${open&&!mobile?'desktopRhythmWorkspace':''}`}>
   <Activity mode={open?'visible':'hidden'}>
    <RhythmTrainer mobile={mobile} onExit={()=>{location.hash='audit-other';}} onOpenMenu={()=>{location.hash='audit-other';}}/>
   </Activity>
   {!open&&<section><h1>다른 화면</h1><button onClick={()=>{location.hash='rhythm-trainer';}}>리듬트레이너로 돌아가기</button></section>}
  </main>
 </div></TabletLayout>;
}
createRoot(document.getElementById('root')).render(<Audit/>);
