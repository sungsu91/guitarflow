export default function PrintPageNavigation({mobile,page,count,busy,positioning,onPositioning,onPage,language,positioningHint}) {
  const t=(ko,en)=>language==='ko'?ko:en;
  return <div className="rt-print-navigation" data-html2canvas-ignore="true">
    <nav className="rt-print-page-controls" aria-label={t('미리보기 페이지 이동','Preview page navigation')}>
      <button type="button" disabled={busy||page===0} onClick={()=>onPage(page-1)} aria-label={t('이전 페이지','Previous page')}>‹ {t('이전','Previous')}</button>
      <label><span>{t('미리보기','Preview')}</span><select aria-label={t('미리보기 페이지','Preview page')} value={page} disabled={busy} onChange={e=>onPage(Number(e.target.value))}>
        {Array.from({length:count},(_,i)=><option key={i} value={i}>{i+1} / {count} {t('페이지','pages')}</option>)}
      </select></label>
      <button type="button" disabled={busy||page===count-1} onClick={()=>onPage(page+1)} aria-label={t('다음 페이지','Next page')}>{t('다음','Next')} ›</button>
    </nav>
    <div className="rt-print-preview-hint">
      <span role="status" aria-live="polite">{t(`총 ${count}페이지`,`${count} pages total`)}</span>
      {mobile&&<button type="button" className="rt-print-position-toggle" disabled={busy} aria-pressed={positioning} onClick={()=>onPositioning(!positioning)}>{positioning?t('위치 조절 완료','Finish positioning'):t('위치 조절','Adjust position')}</button>}
    </div>
    {mobile&&<p className="rt-print-gesture-hint">{positioning?(positioningHint||t('악보를 위아래로 끌어 위치를 바꾼 뒤 완료를 누르세요.','Drag the score to reposition it, then tap Finish.')):t('악보를 위아래로 밀거나 이전·다음 버튼으로 페이지를 확인하세요.','Swipe the score or use Previous and Next to view pages.')}</p>}
  </div>;
}
