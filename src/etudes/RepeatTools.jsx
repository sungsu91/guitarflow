import ko from "./../i18n/locales/ko.js";
import { localizeUi } from "./../i18n/core.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {useLayoutEffect,useRef,useState} from 'react';
import {Trash2} from 'lucide-react';
import EditorMusicIcon from './EditorMusicIcon.jsx';
import {NAV_MARKERS,NAV_COMMANDS,SECTION_LABELS} from './scoreNavigation.js';

function RepeatScroll({children,className=''}){
 const ref=useRef(null),[scroll,setScroll]=useState({top:0,height:100});
 const update=()=>{const el=ref.current;if(!el)return;const h=el.clientHeight,total=el.scrollHeight;setScroll({top:total?h===total?0:el.scrollTop/(total-h)*(100-Math.max(12,h/total*100)):0,height:total?Math.max(12,h/total*100):100});};
 useLayoutEffect(()=>{const el=ref.current,observer=new ResizeObserver(update);observer.observe(el);for(const child of el.children)observer.observe(child);update();return()=>observer.disconnect();},[]);
 return <div className="repeatScrollFrame"><div ref={ref} onScroll={update} className={'mobileRepeatPopoverBody '+className}>{children}</div><div className="repeatScrollTrack" aria-hidden="true"><div style={{top:scroll.top+'%',height:scroll.height+'%'}}/></div></div>;
}
export default function RepeatTools({bar,index,issue,onRepeat,onNavigation,compact=false}){
  useLanguage();
 const marked=bar.repeatStart||bar.repeatEnd||bar.ending||bar.marker||bar.command;
 const visualMarks=<fieldset className="repeatSection"><legend><Translation id="etudes.sectionLabelDoesNotAffectPlayback" /></legend><label><Translation id="etudes.barline" /><select aria-label={translateUi("etudes.barline")} value={bar.endBarline??''} onChange={e=>onNavigation('endBarline',e.target.value)}><option value=""><Translation id="etudes.auto" /></option><option value="single"><Translation id="etudes.singleBarline" /></option><option value="double"><Translation id="etudes.doubleBarline" /></option><option value="final"><Translation id="etudes.finalBarlineThinThick" /></option></select></label><div className="repeatEndingButtons sectionLabelButtons">{SECTION_LABELS.map(label=><button type="button" key={label} aria-label={label+translateUi("etudes.sectionLabel")} aria-pressed={bar.sectionLabel===label} onClick={()=>onNavigation('sectionLabel',label)}>{localizeUi(label)}</button>)}</div><p className="mobileTechniqueHint"><Translation id="etudes.intIntroOutOutroTapAgainToClearTheseLabelsAreSeparate" /></p></fieldset>;
 if(compact)return <RepeatScroll className="repeatCompact">
  <div className="repeatCompactSymbols" role="group" aria-label={translateUi("etudes.repeatAndNavigationSymbols")}>
   {[['start',ko["etudes.repeatStart"]],['end',ko["etudes.repeatEnd"]]].map(([kind,label])=><button type="button" key={kind} aria-label={localizeUi(label)} title={localizeUi(label)} aria-pressed={Boolean(bar[kind==='start'?'repeatStart':'repeatEnd'])} onClick={()=>onRepeat(kind)}><EditorMusicIcon kind={`repeat-${kind}`}/></button>)}
   {NAV_MARKERS.map(([kind,label])=><button type="button" key={kind} aria-label={localizeUi(label)} title={localizeUi(label)} aria-pressed={bar.marker===kind} onClick={()=>onNavigation('marker',kind)}>{kind==='toCoda'&&<span><Translation id="originalUi.to" /></span>}<EditorMusicIcon kind={kind}/></button>)}
  </div>
  <fieldset className="repeatCompactEndings"><legend><Translation id="etudes.numberedEndingsRepeatPasses" /></legend><div className="repeatEndingButtons">{[1,2,3,4,5].map(n=><button type="button" key={n} aria-label={translateUi("etudes.endingValue1", { value1: n })} aria-pressed={bar.ending===n} onClick={()=>onNavigation('ending',n)}><span className="endingBracket">{n}.</span></button>)}</div></fieldset>
  <div className="repeatCompactActions"><select aria-label={translateUi("etudes.repeatNavigation")} value={bar.command??''} onChange={e=>onNavigation('command',e.target.value)}><option value=""><Translation id="etudes.noJump" /></option>{NAV_COMMANDS.map(([kind,label])=><option key={kind} value={kind}>{localizeUi(label)}</option>)}</select><button type="button" className="is-delete" aria-label={translateUi("etudes.removeRepeatMarkingsFromSelectedBar")} title={translateUi("etudes.clearRepeatMarkings")} disabled={!marked} onClick={()=>onRepeat('clear')}><Trash2 size={18}/></button></div>
  {visualMarks}
  {issue&&<p className="mobileTechniqueHint" role="status">{localizeUi(issue)}</p>}
 </RepeatScroll>;
 return <RepeatScroll>
  <p className="repeatTarget"><Translation id="etudes.appliesTo" /><strong>{index+1}<Translation id="app.bar" /></strong></p>
  <div className="repeatMarkButtons">{[['start',ko["etudes.repeatStart"],ko["etudes.leftBoundary"]],['end',ko["etudes.repeatEnd"],ko["etudes.rightBoundary"]]].map(([kind,label,edge])=><button type="button" key={kind} aria-label={localizeUi(label)} aria-pressed={Boolean(bar[kind==='start'?'repeatStart':'repeatEnd'])} onClick={()=>onRepeat(kind)}><EditorMusicIcon kind={`repeat-${kind}`}/><span>{localizeUi(label)}<small>{localizeUi(edge)}</small></span></button>)}</div>
  <p className="mobileTechniqueHint"><Translation id="etudes.standardRepeatsPlayTwiceNumberedEndingsPlayOnTheMatchingPass" /></p>
  <fieldset className="repeatSection"><legend><Translation id="etudes.numberedEnding" /></legend><div className="repeatEndingButtons">{[1,2,3,4,5].map(n=><button type="button" key={n} aria-label={translateUi("etudes.endingValue1", { value1: n })} aria-pressed={bar.ending===n} onClick={()=>onNavigation('ending',n)}><span className="endingBracket">{n}.</span></button>)}</div><p className="mobileTechniqueHint"><Translation id="etudes.useTheSameNumberOnAdjacentBarsToExtendTheEndingAdd" /></p></fieldset>
  <fieldset className="repeatSection"><legend><Translation id="etudes.navigationMarkers" /></legend><div className="repeatNavigationButtons">{NAV_MARKERS.map(([kind,label,hint])=><button type="button" key={kind} aria-label={localizeUi(label)} aria-pressed={bar.marker===kind} onClick={()=>onNavigation('marker',kind)} title={localizeUi(hint)}><EditorMusicIcon kind={kind}/><span>{kind==='fine'?translateUi("etudes.fine"):localizeUi(label)}</span></button>)}</div><p className="mobileTechniqueHint">{localizeUi(NAV_MARKERS.find(([kind])=>bar.marker===kind)?.[2]??translateUi("etudes.segnoAndCodaApplyAtTheBarStartToCodaAndFine"))}</p></fieldset>
  <fieldset className="repeatSection"><legend><Translation id="etudes.jumpCommandBarEnd" /></legend><select aria-label={translateUi("etudes.repeatNavigation")} value={bar.command??''} onChange={e=>onNavigation('command',e.target.value)}><option value=""><Translation id="app.none" /></option>{NAV_COMMANDS.map(([kind,label])=><option key={kind} value={kind}>{localizeUi(label)}</option>)}</select><p className="mobileTechniqueHint">{localizeUi(NAV_COMMANDS.find(([kind])=>bar.command===kind)?.[2]??translateUi("etudes.dCReturnsToTheBeginningDSReturnsToTheSegno"))}<Translation id="etudes.afterTheJumpSkipRepeatsAndPlayTheLastNumberedEnding" /></p></fieldset>
  {visualMarks}
  {issue&&<p className="mobileTechniqueHint" role="status">{localizeUi(issue)}</p>}
  <button type="button" className="is-delete" disabled={!marked} onClick={()=>onRepeat('clear')}><Trash2 size={18}/><Translation id="etudes.removeRepeatMarkingsFromSelectedBar" /></button>
 </RepeatScroll>;
}
