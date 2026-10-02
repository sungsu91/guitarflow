import {useEffect, useState} from 'react';
import {t} from '../i18n/core.js';
import {GROOVE_BAR_STEPS, MAX_GROOVE_BARS} from './groove.js';
import './grooveMeasures.css';

export function useGroovePlayingBar(clock, playing, beats, divisions, barCount) {
  const [bar,setBar]=useState(-1);
  useEffect(()=>{
    let frame,last=-1;
    setBar(-1);
    if(!playing)return;
    const update=()=>{
      const {audio,origin,stepSeconds,running,seek}=clock();
      const elapsed=audio?audio.currentTime-origin:-1;
      const next=running && audio?.state==='running' && stepSeconds>0
        ?seek && audio.currentTime<seek.startAt?Math.min(seek.bar,barCount-1)
          :elapsed>=0?Math.floor(elapsed/(stepSeconds*beats*divisions))%barCount:-1
        :-1;
      if(next!==last){last=next;setBar(next);}
      frame=requestAnimationFrame(update);
    };
    update();
    return()=>cancelAnimationFrame(frame);
  },[clock,playing,beats,divisions,barCount]);
  return playing?bar:-1;
}

const barLabel=bar=>t('metronome.grooveBarNumber',{value1:bar+1});
const lengthLabel=count=>t('metronome.grooveBarLength',{value1:count});

function CopyPrevious({selected,onCopy}) {
  return <button type="button" className="grooveCopyBar" disabled={selected===0} onClick={onCopy}>
    <span aria-hidden="true">▣</span> {t('metronome.copyPreviousBar')}
  </button>;
}

function BarActions({count,selected,onLength,onCopy}) {
  return <div className="grooveBarActions">
    {count>1 && <CopyPrevious selected={selected} onCopy={onCopy}/>}
    <button type="button" className="grooveReduceBar" disabled={count<=1} aria-label={t('metronome.reduceGrooveBars')} title={t('metronome.reduceGrooveBars')} onClick={()=>onLength(count-1)}>−</button>
    <button type="button" className="grooveAddBar" disabled={count>=MAX_GROOVE_BARS} aria-label={t('metronome.addGrooveBar')} title={t('metronome.addGrooveBar')} onClick={()=>onLength(count+1,true)}>＋</button>
  </div>;
}

export function DesktopGrooveBarControls(props) {
  return <div className="grooveBarControls grooveBarControls--desktop">
    <span className="grooveBarSummary">{props.count>1?t('metronome.grooveOverview',{value1:props.count}):lengthLabel(props.count)}</span>
    <BarActions {...props}/>
  </div>;
}

export function MobileGrooveBarControls(props) {
  return <div className="grooveBarControls grooveBarControls--mobile">
    <span className="grooveBarSummary">{lengthLabel(props.count)}</span>
    <BarActions {...props}/>
  </div>;
}

function BarCard({pattern,bar,selected,playingBar,stepsPerBar,onSelect}) {
  return <button type="button" className={`grooveBarCard ${playingBar===bar?'is-playing':''}`} aria-label={barLabel(bar)} aria-pressed={selected===bar} aria-current={playingBar===bar?'step':undefined} onClick={()=>onSelect(bar)}>
    <span className="grooveBarCardTitle"><b>{bar+1}</b><strong>{barLabel(bar)}</strong>{playingBar===bar && <em>{t('metronome.grooveBarPlaying')}</em>}</span>
    <span className="grooveBarMiniature" aria-hidden="true" style={{'--groove-preview-steps':stepsPerBar}}>
      {pattern.rows.map((row,r)=><span className={`grooveMiniRow ${row.muted?'is-muted':''}`} key={r}>
        {Array.from({length:stepsPerBar},(_,i)=>{
          const index=bar*GROOVE_BAR_STEPS+i;
          return <i key={i} className={row.steps[index]?'is-on':''}/>;
        })}
      </span>)}
    </span>
  </button>;
}

function Overview({count,selected,playingBar,reserveSpace=false,...props}) {
  return <div className="grooveBarCards" role="group" aria-label={t('metronome.selectGrooveBar')}>
      {Array.from({length:reserveSpace?MAX_GROOVE_BARS:count},(_,bar)=>bar<count
        ?<BarCard {...props} key={bar} bar={bar} selected={selected} playingBar={playingBar}/>
        :<span key={bar} className="grooveBarPlaceholder" aria-hidden="true"/>)}
    </div>;
}

export function DesktopGrooveOverview(props) {
  return <div className="grooveOverview grooveOverview--desktop"><Overview {...props} reserveSpace/></div>;
}
export function MobileGrooveOverview(props) {
  return <div className="grooveOverview grooveOverview--mobile"><Overview {...props}/></div>;
}
