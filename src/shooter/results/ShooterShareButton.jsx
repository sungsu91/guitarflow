import { t as translateUi } from "./../../i18n/core.js";
import { Translation, useLanguage } from "./../../i18n/react.jsx";
import {useEffect, useMemo, useRef, useState} from 'react';
import {Share2, ChevronRight} from 'lucide-react';
import {createShooterResultPng, shooterShareResult, shareShooterResult, usesMobileImageSharing} from './shareResult.js';
import './shooter-results.css';

export default function ShooterShareButton({score=0,bestScore=0,menu=false,compact=false}){
  useLanguage();
  const result=useMemo(()=>shooterShareResult(score,bestScore),[score,bestScore]);
  const [prepared,setPrepared]=useState(null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  const sharing=useRef(false);
  const separateLink=usesMobileImageSharing();
  useEffect(()=>{let active=true;setStatus('');Promise.resolve().then(()=>createShooterResultPng(result)).then(file=>{if(active)setPrepared({result,file});}).catch(()=>{if(active)setPrepared({result,file:null});});return()=>{active=false;};},[result]);
  const ready=prepared?.result===result;
  const share=async (event,linkOnly=false)=>{
    event.stopPropagation();if((!linkOnly&&!ready)||sharing.current)return;
    sharing.current=true;setBusy(true);setStatus('');
    try{setStatus(await shareShooterResult(result,linkOnly?null:prepared.file));}finally{sharing.current=false;setBusy(false);}
  };
  const content = <>
    <button type="button" className={menu?'utilityMenuItem utilityMenuItemSecondary utilityMenuItemActive shooterShareMenuButton':'shooterResultButton'} onClick={share} disabled={!ready||busy} aria-label={translateUi("shooter.share")}>
      {menu?<><span className="utilityMenuIcon" aria-hidden="true"><Share2 size={19}/></span><div className="utilityMenuText"><strong className="utilityMenuTitle"><Translation id="shooter.share" /></strong><small>{ready?(separateLink?translateUi("shooter.noteShooterScoreImage"):translateUi("shooter.noteShooterScoreGameLink")):translateUi("shooter.preparingResultImage")}</small></div><span className="utilityMenuChevron" aria-hidden="true"><ChevronRight size={20}/></span></>:<><Share2 size={17} aria-hidden="true"/>{!ready?translateUi("shooter.preparingImage"):busy?translateUi("shooter.sharing"):translateUi("shooter.share")}</>}
    </button>
    {separateLink&&<button type="button" className={menu?'utilityMenuItem utilityMenuItemSecondary utilityMenuItemActive shooterShareMenuButton':'shooterResultButton'} onClick={event=>share(event,true)} disabled={busy}>
      {menu?<><span className="utilityMenuIcon" aria-hidden="true"><Share2 size={19}/></span><div className="utilityMenuText"><strong className="utilityMenuTitle"><Translation id="shooter.shareGameLink" /></strong><small><Translation id="shooter.challengeAFriend" /></small></div><span className="utilityMenuChevron" aria-hidden="true"><ChevronRight size={20}/></span></>: translateUi("shooter.shareGameLink")}
    </button>}
    {status==='copied'&&<p className="shooterShareFeedback" role="status"><Translation id="shooter.gameLinkCopied" /></p>}
    {status==='manual'&&<div className="shooterShareFeedback" role="status"><p><Translation id="shooter.sharingAndAutomaticCopyingAreUnavailablePressAndHoldTheLinkBelow" /></p><input aria-label={translateUi("shooter.gameLinkToShare")} readOnly value={result.url} onFocus={event=>event.target.select()}/></div>}
  </>;
  return menu && compact ? <details className="utilityShareMenu"><summary><Share2 size={20} aria-hidden="true"/><span>{translateUi('shooter.share')}</span></summary><div className="utilitySharePopover">{content}</div></details> : content;
}
