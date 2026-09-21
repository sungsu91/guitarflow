import {useEffect, useMemo, useRef, useState} from 'react';
import {Share2, ChevronRight} from 'lucide-react';
import {createShooterResultPng, shooterShareResult, shareShooterResult} from './shareResult.js';
import './shooter-results.css';

export default function ShooterShareButton({score=0,bestScore=0,menu=false}){
  const result=useMemo(()=>shooterShareResult(score,bestScore),[score,bestScore]);
  const [prepared,setPrepared]=useState(null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  const sharing=useRef(false);
  useEffect(()=>{let active=true;setStatus('');Promise.resolve().then(()=>createShooterResultPng(result)).then(file=>{if(active)setPrepared({result,file});}).catch(()=>{if(active)setPrepared({result,file:null});});return()=>{active=false;};},[result]);
  const ready=prepared?.result===result;
  const share=async event=>{
    event.stopPropagation();if(!ready||sharing.current)return;
    sharing.current=true;setBusy(true);setStatus('');
    try{setStatus(await shareShooterResult(result,prepared.file));}finally{sharing.current=false;setBusy(false);}
  };
  return <>
    <button type="button" className={menu?'utilityMenuItem utilityMenuItemSecondary utilityMenuItemActive shooterShareMenuButton':'shooterResultButton'} onClick={share} disabled={!ready||busy} aria-label="공유하기">
      {menu?<><span className="utilityMenuIcon" aria-hidden="true"><Share2 size={19}/></span><div className="utilityMenuText"><strong className="utilityMenuTitle">공유하기</strong><small>{ready?'슈팅게임 점수 · 접속 링크':'결과 이미지 준비 중'}</small></div><span className="utilityMenuChevron" aria-hidden="true"><ChevronRight size={20}/></span></>:<><Share2 size={17} aria-hidden="true"/>{!ready?'이미지 준비 중':busy?'공유 중…':'공유하기'}</>}
    </button>
    {status==='copied'&&<p className="shooterShareFeedback" role="status">게임 링크를 복사했어요.</p>}
    {status==='manual'&&<div className="shooterShareFeedback" role="status"><p>공유창과 자동 복사를 사용할 수 없어요. 아래 링크를 길게 눌러 복사해주세요.</p><input aria-label="공유할 게임 링크" readOnly value={result.url} onFocus={event=>event.target.select()}/></div>}
  </>;
}
